import { createClient } from '@supabase/supabase-js'

// Photos are safe to delete once report-pdfs already has a fresh PDF baked
// with them (see api/generate-pdf.js: PDFs inline photos as base64, so the
// source upload is no longer needed). Reports that never got a PDF still
// get purged eventually so abandoned drafts don't accumulate storage forever.
const RETENTION_DAYS = 21
const NO_PDF_RETENTION_DAYS = 60
const DAY_MS = 24 * 60 * 60 * 1000

function stripPurgedGroup(list, paths) {
  return (list ?? []).map(p => {
    if (!p.path) return p
    paths.push(p.path)
    return { caption: p.caption, purged: true }
  })
}

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var' })
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS).toISOString()

  const { data: candidates, error } = await supabase
    .from('reports')
    .select('id, data, updated_at, pdf_generated_at')
    .is('photos_purged_at', null)
    .lt('updated_at', cutoff)

  if (error) {
    console.error('Cleanup query failed:', error)
    return res.status(500).json({ error: 'Query failed', detail: error.message })
  }

  const now = Date.now()
  let purged = 0
  let skipped = 0

  for (const report of candidates ?? []) {
    const updatedAt = new Date(report.updated_at).getTime()
    const hasFreshPdf = report.pdf_generated_at && new Date(report.pdf_generated_at).getTime() >= updatedAt
    const noPdfGraceExpired = now - updatedAt >= NO_PDF_RETENTION_DAYS * DAY_MS

    if (!hasFreshPdf && !noPdfGraceExpired) {
      skipped++
      continue
    }

    const groups = report.data?.photos ?? {}
    const paths = []
    const newPhotos = {
      before: stripPurgedGroup(groups.before, paths),
      progress: stripPurgedGroup(groups.progress, paths),
      after: stripPurgedGroup(groups.after, paths),
    }

    if (paths.length) {
      const { error: rmErr } = await supabase.storage.from('report-photos').remove(paths)
      if (rmErr) {
        console.error(`Failed to remove photos for report ${report.id}:`, rmErr.message)
        continue
      }
    }

    const { error: updErr } = await supabase
      .from('reports')
      .update({ data: { ...report.data, photos: newPhotos }, photos_purged_at: new Date().toISOString() })
      .eq('id', report.id)
    if (updErr) {
      console.error(`Failed to mark report ${report.id} purged:`, updErr.message)
      continue
    }
    purged++
  }

  return res.status(200).json({ checked: candidates?.length ?? 0, purged, skipped })
}
