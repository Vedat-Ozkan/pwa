import { createClient } from '@supabase/supabase-js'
import { deleteR2Pdf, headR2Pdf, isR2Configured, uploadR2Pdf } from './lib/r2.js'

const INACTIVE_DAYS = 6
const BATCH_SIZE = 10
const DAY_MS = 24 * 60 * 60 * 1000

function supabasePdfUrl(path) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  return `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/report-pdfs/${encodedPath}`
}

async function migrateReport(supabase, report) {
  let uploaded = false
  try {
    const response = await fetch(supabasePdfUrl(report.pdf_path))
    if (!response.ok) throw new Error(`Supabase download returned ${response.status}`)
    const pdf = Buffer.from(await response.arrayBuffer())

    await uploadR2Pdf(report.pdf_path, pdf)
    uploaded = true

    const stored = await headR2Pdf(report.pdf_path)
    if (stored.ContentLength !== pdf.length) {
      throw new Error(`R2 verification failed: expected ${pdf.length} bytes, got ${stored.ContentLength}`)
    }

    const migratedAt = new Date().toISOString()
    const { data: updated, error: updateError } = await supabase
      .from('reports')
      .update({ pdf_storage: 'r2', pdf_migrated_at: migratedAt })
      .eq('id', report.id)
      .eq('pdf_storage', 'supabase')
      .eq('updated_at', report.updated_at)
      .eq('pdf_generated_at', report.pdf_generated_at)
      .select('id')
      .maybeSingle()
    if (updateError || !updated) throw new Error(updateError?.message || 'Report changed during migration')

    const { error: removeError } = await supabase.storage.from('report-pdfs').remove([report.pdf_path])
    if (removeError) console.warn(`Migrated ${report.id}, but Supabase cleanup failed:`, removeError.message)

    return { id: report.id, status: 'migrated', bytes: pdf.length }
  } catch (error) {
    if (uploaded) {
      try { await deleteR2Pdf(report.pdf_path) } catch (cleanupError) {
        console.warn(`Failed to roll back R2 upload for ${report.id}:`, cleanupError.message)
      }
    }
    console.error(`PDF migration failed for ${report.id}:`, error.message)
    return { id: report.id, status: 'failed', error: error.message }
  }
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase configuration' })
  }
  if (!isR2Configured()) {
    return res.status(500).json({ error: 'Missing R2 configuration' })
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const cutoff = new Date(Date.now() - INACTIVE_DAYS * DAY_MS).toISOString()

  const { data, error } = await supabase
    .from('reports')
    .select('id, pdf_path, pdf_generated_at, updated_at, pdf_storage')
    .eq('pdf_storage', 'supabase')
    .not('pdf_path', 'is', null)
    .is('pdf_deleted_at', null)
    .lt('updated_at', cutoff)
    .order('updated_at', { ascending: true })
    .limit(100)

  if (error) return res.status(500).json({ error: 'Query failed', detail: error.message })

  const candidates = (data ?? [])
    .filter(report => report.pdf_generated_at && new Date(report.pdf_generated_at) >= new Date(report.updated_at))
    .slice(0, BATCH_SIZE)
  const outcomes = await Promise.all(candidates.map(report => migrateReport(supabase, report)))

  return res.status(200).json({
    checked: data?.length ?? 0,
    attempted: candidates.length,
    migrated: outcomes.filter(outcome => outcome.status === 'migrated').length,
    failed: outcomes.filter(outcome => outcome.status === 'failed').length,
    bytesMoved: outcomes.reduce((total, outcome) => total + (outcome.bytes ?? 0), 0),
    outcomes,
  })
}
