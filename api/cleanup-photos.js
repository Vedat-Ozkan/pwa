import { createClient } from '@supabase/supabase-js'

// Photos are safe to delete once report-pdfs already has a fresh PDF baked
// with them (see api/generate-pdf.js: PDFs inline photos as base64, so the
// source upload is no longer needed). Reports that never got a PDF still
// get purged eventually so abandoned drafts don't accumulate storage forever.
const RETENTION_DAYS = 21
const NO_PDF_RETENTION_DAYS = 60
const DAY_MS = 24 * 60 * 60 * 1000

// PhotoSection.jsx uploads to report-photos under {clientId}/{reportId}/...
// the moment a photo is picked, before the report row exists (that's only
// inserted on Save). If the user backs out or the app closes first, those
// files never get a reports row and the purge logic above can never find
// them. Sweep the bucket directly for report-id folders with no matching
// row, and delete anything old enough that it's clearly not still mid-upload.
const ORPHAN_GRACE_HOURS = 48

function stripPurgedGroup(list, paths) {
  return (list ?? []).map(p => {
    if (!p.path) return p
    paths.push(p.path)
    return { caption: p.caption, purged: true }
  })
}

async function sweepOrphanedPhotos(supabase) {
  let checked = 0
  let removed = 0

  const { data: clientFolders, error } = await supabase.storage.from('report-photos').list('', { limit: 1000 })
  if (error) {
    console.error('Orphan sweep: failed to list report-photos:', error.message)
    return { checked, removed }
  }

  for (const clientFolder of clientFolders ?? []) {
    const clientId = clientFolder.name
    const { data: reportFolders } = await supabase.storage.from('report-photos').list(clientId, { limit: 1000 })

    for (const reportFolder of reportFolders ?? []) {
      const reportId = reportFolder.name
      checked++

      const { data: reportRow } = await supabase.from('reports').select('id').eq('id', reportId).maybeSingle()
      if (reportRow) continue

      const { data: labelFolders } = await supabase.storage.from('report-photos').list(`${clientId}/${reportId}`, { limit: 1000 })
      const filePaths = []
      let newestFile = 0
      for (const labelFolder of labelFolders ?? []) {
        const { data: files } = await supabase.storage.from('report-photos').list(`${clientId}/${reportId}/${labelFolder.name}`, { limit: 1000 })
        for (const f of files ?? []) {
          filePaths.push(`${clientId}/${reportId}/${labelFolder.name}/${f.name}`)
          const created = new Date(f.created_at ?? 0).getTime()
          if (created > newestFile) newestFile = created
        }
      }

      if (!filePaths.length) continue
      if (Date.now() - newestFile < ORPHAN_GRACE_HOURS * 60 * 60 * 1000) continue

      const { error: rmErr } = await supabase.storage.from('report-photos').remove(filePaths)
      if (rmErr) {
        console.error(`Orphan sweep: failed to remove ${clientId}/${reportId}:`, rmErr.message)
        continue
      }
      removed++
    }
  }

  return { checked, removed }
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

  // One-time backlogs (every pre-existing report crossing the threshold at
  // once) can be dozens of rows — processing them one at a time, each doing
  // a remove() then an update() round trip, serializes enough network calls
  // to blow past the function's time limit. Run candidates concurrently.
  const outcomes = await Promise.all((candidates ?? []).map(async (report) => {
    const updatedAt = new Date(report.updated_at).getTime()
    const hasFreshPdf = report.pdf_generated_at && new Date(report.pdf_generated_at).getTime() >= updatedAt
    const noPdfGraceExpired = now - updatedAt >= NO_PDF_RETENTION_DAYS * DAY_MS

    if (!hasFreshPdf && !noPdfGraceExpired) return 'skipped'

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
        return 'failed'
      }
    }

    const { error: updErr } = await supabase
      .from('reports')
      .update({ data: { ...report.data, photos: newPhotos }, photos_purged_at: new Date().toISOString() })
      .eq('id', report.id)
    if (updErr) {
      console.error(`Failed to mark report ${report.id} purged:`, updErr.message)
      return 'failed'
    }
    return 'purged'
  }))

  const purged = outcomes.filter(o => o === 'purged').length
  const skipped = outcomes.filter(o => o === 'skipped').length

  const orphans = await sweepOrphanedPhotos(supabase)

  return res.status(200).json({
    checked: candidates?.length ?? 0, purged, skipped,
    orphansChecked: orphans.checked, orphansRemoved: orphans.removed,
  })
}
