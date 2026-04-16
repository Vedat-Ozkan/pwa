import chromium from '@sparticuz/chromium-min'
import puppeteer from 'puppeteer-core'
import { createClient } from '@supabase/supabase-js'
import { generateReportHTML } from './templates/report-template.js'

// Hosted Chromium binary — update version to match @sparticuz/chromium-min installed
const CHROMIUM_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v147.0.0/chromium-v147.0.0-pack.tar'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { reportId } = req.body ?? {}
  if (!reportId) return res.status(400).json({ error: 'reportId is required' })

  // Service role key bypasses RLS — never expose this to the frontend
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: report, error } = await supabase
    .from('reports')
    .select('*, clients(*)')
    .eq('id', reportId)
    .single()

  if (error || !report) {
    console.error('Supabase fetch error:', error)
    return res.status(404).json({ error: 'Report not found', detail: error?.message })
  }

  const html = generateReportHTML(report, report.clients)

  let browser
  try {
    if (process.env.VERCEL) {
      // Production: use serverless-optimised Chromium binary
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(CHROMIUM_URL),
        headless: chromium.headless,
      })
    } else {
      // Local dev: use full puppeteer with its bundled Chrome (npm install -D puppeteer)
      const { default: fullPuppeteer } = await import('puppeteer')
      browser = await fullPuppeteer.launch({ headless: true })
    }

    const page = await browser.newPage()

    // networkidle0 waits for all <img> tags (Supabase photo URLs) to finish loading
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 25000 })

    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    })

    const safeName = `HSX-${(report.job_name || 'Report').replace(/[^a-z0-9]/gi, '-')}-${report.report_date || 'draft'}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`)
    res.send(Buffer.from(pdf))
  } catch (err) {
    console.error('PDF generation failed:', err)
    return res.status(500).json({ error: 'PDF generation failed', detail: err?.message })
  } finally {
    await browser?.close()
  }
}
