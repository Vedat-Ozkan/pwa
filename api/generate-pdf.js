import puppeteer from 'puppeteer-core'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'
import { generateReportHTML } from './templates/report-template.js'
import { COMPANY_ID } from '../src/lib/constants.js'

// Hosted Chromium binary — match @sparticuz/chromium-min installed version
const CHROMIUM_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'

// Photos render at ~380px tall in the PDF; 800px wide stays crisp when
// inspectors zoom in to check leak/damage detail, while cutting file size
// several× vs. the 1920px originals. Resizing happens server-side with sharp
// since Supabase image transforms are Pro-plan only.
const PHOTO_WIDTH = 800
const PHOTO_QUALITY = 70

async function inlinePhoto(photo) {
  if (!photo?.url) return photo
  try {
    const res = await fetch(photo.url)
    if (!res.ok) throw new Error(`Photo fetch ${res.status}: ${photo.url}`)
    const input = Buffer.from(await res.arrayBuffer())
    const output = await sharp(input)
      .rotate() // honour EXIF orientation
      .resize({ width: PHOTO_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: PHOTO_QUALITY, mozjpeg: true })
      .toBuffer()
    return { ...photo, url: `data:image/jpeg;base64,${output.toString('base64')}` }
  } catch (err) {
    console.warn('Photo inline failed, keeping remote URL:', err?.message)
    return photo
  }
}

async function inlineAllPhotos(data) {
  const groups = data?.photos ?? {}
  const [before, progress, after] = await Promise.all([
    Promise.all((groups.before   ?? []).map(inlinePhoto)),
    Promise.all((groups.progress ?? []).map(inlinePhoto)),
    Promise.all((groups.after    ?? []).map(inlinePhoto)),
  ])
  return { ...data, photos: { before, progress, after } }
}

async function launchBrowser(chromium) {
  if (process.env.VERCEL) {
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(CHROMIUM_URL),
      headless: chromium.headless,
    })
  }
  const { default: fullPuppeteer } = await import('puppeteer')
  return fullPuppeteer.launch({ headless: 'new' })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // @sparticuz/chromium-min only extracts system libs (libnss3.so etc.) when
  // it detects AWS Lambda via AWS_EXECUTION_ENV. Vercel reserves AWS_* env
  // vars in dashboard, so set in code then dynamic-import so the module's
  // init-time detection sees it.
  if (!process.env.AWS_EXECUTION_ENV) {
    const nodeMajor = parseInt(process.versions.node.split('.')[0], 10)
    process.env.AWS_EXECUTION_ENV = nodeMajor >= 20
      ? 'AWS_Lambda_nodejs20.x'
      : 'AWS_Lambda_nodejs18.x'
  }
  const { default: chromium } = await import('@sparticuz/chromium-min')

  const { reportId, force } = req.body ?? {}
  if (!reportId) return res.status(400).json({ error: 'reportId is required' })

  if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var' })
  }

  // Service role key bypasses RLS — never expose this to the frontend
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: report, error } = await supabase
    .from('reports')
    .select('*, job_sites(*, clients(*))')
    .eq('id', reportId)
    .single()

  if (error || !report) {
    console.error('Supabase fetch error:', error)
    return res.status(404).json({ error: 'Report not found', detail: error?.message })
  }

  const filename = `HSX-Report-${report.report_date || 'draft'}.pdf`
  const storagePath = `${reportId}.pdf`
  const publicUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/report-pdfs/${storagePath}`

  // Cache hit — PDF was generated after the last edit, just return its URL.
  const cachedFresh =
    !force &&
    report.pdf_path &&
    report.pdf_generated_at &&
    new Date(report.pdf_generated_at) >= new Date(report.updated_at)

  if (cachedFresh) {
    return res.status(200).json({
      url: `${publicUrl}?v=${new Date(report.pdf_generated_at).getTime()}`,
      filename,
      cached: true,
    })
  }

  const site = report.job_sites
  const client = site?.clients
  const protocol = req.headers['x-forwarded-proto'] || 'https'
  const logoSrc = `${protocol}://${req.headers.host}/logo_hsx.png`

  const { data: company } = await supabase
    .from('company_settings').select('*').eq('id', COMPANY_ID).single()

  // Inline all photos as base64 before handing HTML to Puppeteer — avoids
  // sequential network fetches inside the headless browser.
  const dataWithInlinedPhotos = await inlineAllPhotos(report.data)
  const reportForHtml = { ...report, data: dataWithInlinedPhotos }
  const html = generateReportHTML(reportForHtml, client, site, logoSrc, company)

  let browser
  try {
    browser = await launchBrowser(chromium)
    const page = await browser.newPage()

    // All images are inlined, so `load` is sufficient — no need to wait for
    // networkidle0, which was the main source of latency before.
    await page.setContent(html, { waitUntil: 'load', timeout: 25000 })

    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    })

    const pdfBuffer = Buffer.from(pdf)

    const { error: upErr } = await supabase.storage
      .from('report-pdfs')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
        cacheControl: '3600',
      })
    if (upErr) throw new Error(`PDF upload failed: ${upErr.message}`)

    const generatedAt = new Date().toISOString()
    const { error: updErr } = await supabase
      .from('reports')
      .update({ pdf_path: storagePath, pdf_generated_at: generatedAt })
      .eq('id', reportId)
    if (updErr) console.warn('Failed to record pdf_generated_at:', updErr.message)

    return res.status(200).json({
      url: `${publicUrl}?v=${new Date(generatedAt).getTime()}`,
      filename,
      cached: false,
    })
  } catch (err) {
    console.error('PDF generation failed:', err)
    return res.status(500).json({ error: 'PDF generation failed', detail: err?.message })
  } finally {
    await browser?.close()
  }
}
