import { createClient } from '@supabase/supabase-js'

// Photos are safe to delete once report-pdfs already has a fresh PDF baked
// with them (see api/generate-pdf.js: PDFs inline photos as base64, so the
// source upload is no longer needed). Reports that never got a PDF still
// get purged eventually so abandoned drafts don't accumulate storage forever.
const RETENTION_DAYS = 21
const NO_PDF_RETENTION_DAYS = 60
const PDF_RETENTION_DAYS = 365
const DAY_MS = 24 * 60 * 60 * 1000

// PhotoSection.jsx uploads to report-photos under {clientId}/{reportId}/...
// the moment a photo is picked, before that path is ever saved into the
// report's data.photos JSON. If the user backs out, the app closes, or a
// later save overwrites the edit before it's recorded, the file sits in
// storage with nothing in the database ever pointing back to it — either
// because no report row exists at all, or because the row exists but never
// referenced that particular file. Sweep the bucket directly and delete
// anything old enough that it's clearly not still mid-upload.
const ORPHAN_GRACE_HOURS = 48

function stripPurgedGroup(list, paths) {
  return (list ?? []).map(p => {
    if (!p.path) return p
    paths.push(p.path)
    return { caption: p.caption, purged: true }
  })
}

// Checks every report-id folder, not just ones with no matching row (see
// comment above) — that's a lot more Storage/DB round trips than before.
// Run report folders concurrently so a bucket with a normal number of
// reports doesn't serialize enough network calls to blow the function's
// time limit (the same failure mode fixed for the main purge loop below).
async function sweepOrphanedPhotos(supabase) {
  const { data: clientFolders, error } = await supabase.storage.from('report-photos').list('', { limit: 1000 })
  if (error) {
    console.error('Orphan sweep: failed to list report-photos:', error.message)
    return { checked: 0, removed: 0 }
  }

  const perClient = await Promise.all((clientFolders ?? []).map(async (clientFolder) => {
    const clientId = clientFolder.name
    const { data: reportFolders } = await supabase.storage.from('report-photos').list(clientId, { limit: 1000 })

    const removedCounts = await Promise.all((reportFolders ?? []).map(async (reportFolder) => {
      const reportId = reportFolder.name

      const [{ data: reportRow }, { data: labelFolders }] = await Promise.all([
        supabase.from('reports').select('id, data').eq('id', reportId).maybeSingle(),
        supabase.storage.from('report-photos').list(`${clientId}/${reportId}`, { limit: 1000 }),
      ])

      const fileLists = await Promise.all((labelFolders ?? []).map(async (labelFolder) => {
        const { data: labelFiles } = await supabase.storage.from('report-photos').list(`${clientId}/${reportId}/${labelFolder.name}`, { limit: 1000 })
        return (labelFiles ?? []).map(f => ({
          path: `${clientId}/${reportId}/${labelFolder.name}/${f.name}`,
          createdAt: new Date(f.created_at ?? 0).getTime(),
        }))
      }))
      const files = fileLists.flat()
      if (!files.length) return 0

      // No report row at all — the whole folder is abandoned (see
      // ORPHAN_GRACE_HOURS comment above).
      if (!reportRow) {
        const newestFile = Math.max(...files.map(f => f.createdAt))
        if (Date.now() - newestFile < ORPHAN_GRACE_HOURS * 60 * 60 * 1000) return 0

        const { error: rmErr } = await supabase.storage.from('report-photos').remove(files.map(f => f.path))
        if (rmErr) {
          console.error(`Orphan sweep: failed to remove ${clientId}/${reportId}:`, rmErr.message)
          return 0
        }
        return files.length
      }

      // Report row exists, but individual files can still go stray: an
      // upload that never made it into a saved report.data.photos entry
      // (e.g. the edit that would've recorded it was abandoned or
      // overwritten), or a photo the retention purge above already stripped
      // from the JSON whose storage object didn't get deleted at the time.
      // Either way, if a file isn't referenced by the report's current
      // photo list, nothing else will ever clean it up.
      const groups = reportRow.data?.photos ?? {}
      const referenced = new Set(
        [...(groups.before ?? []), ...(groups.progress ?? []), ...(groups.after ?? [])]
          .map(p => p.path).filter(Boolean)
      )
      const stray = files.filter(f => !referenced.has(f.path) && Date.now() - f.createdAt >= ORPHAN_GRACE_HOURS * 60 * 60 * 1000)
      if (!stray.length) return 0

      const { error: rmErr } = await supabase.storage.from('report-photos').remove(stray.map(f => f.path))
      if (rmErr) {
        console.error(`Stray photo sweep: failed to remove files for ${clientId}/${reportId}:`, rmErr.message)
        return 0
      }
      return stray.length
    }))

    return { checked: reportFolders?.length ?? 0, removed: removedCounts.reduce((a, b) => a + b, 0) }
  }))

  return perClient.reduce(
    (acc, r) => ({ checked: acc.checked + r.checked, removed: acc.removed + r.removed }),
    { checked: 0, removed: 0 }
  )
}

// Deleting a client/site/report in the app removes its PDF too (see
// deleteReportFiles in src/lib/utils.js) — but that only covers rows that
// still exist. Anything deleted before that fix shipped, or any edge case
// that slips through, leaves an orphaned {reportId}.pdf with nothing left
// to ever clean it up. Sweep report-pdfs directly the same way as photos.
async function sweepOrphanedPdfs(supabase) {
  let checked = 0
  let removed = 0

  const { data: files, error } = await supabase.storage.from('report-pdfs').list('', { limit: 1000 })
  if (error) {
    console.error('Orphan PDF sweep: failed to list report-pdfs:', error.message)
    return { checked, removed }
  }

  for (const file of files ?? []) {
    if (!file.name.endsWith('.pdf')) continue
    const reportId = file.name.slice(0, -'.pdf'.length)
    checked++

    const { data: reportRow } = await supabase.from('reports').select('id').eq('id', reportId).maybeSingle()
    if (reportRow) continue

    const created = new Date(file.created_at ?? 0).getTime()
    if (Date.now() - created < ORPHAN_GRACE_HOURS * 60 * 60 * 1000) continue

    const { error: rmErr } = await supabase.storage.from('report-pdfs').remove([file.name])
    if (rmErr) {
      console.error(`Orphan PDF sweep: failed to remove ${file.name}:`, rmErr.message)
      continue
    }
    removed++
  }

  return { checked, removed }
}

// By a year old, the source photos are long gone (purged after 21-60 days),
// so a deleted PDF can never be regenerated. api/generate-pdf.js refuses to
// try once pdf_deleted_at is set, showing a message instead.
async function sweepOldPdfs(supabase) {
  const cutoff = new Date(Date.now() - PDF_RETENTION_DAYS * DAY_MS).toISOString()

  const { data: candidates, error } = await supabase
    .from('reports')
    .select('id, pdf_path')
    .not('pdf_path', 'is', null)
    .is('pdf_deleted_at', null)
    .lt('updated_at', cutoff)

  if (error) {
    console.error('PDF sweep query failed:', error)
    return { checked: 0, deleted: 0 }
  }

  const outcomes = await Promise.all((candidates ?? []).map(async (report) => {
    const { error: rmErr } = await supabase.storage.from('report-pdfs').remove([report.pdf_path])
    if (rmErr) {
      console.error(`Failed to remove pdf for report ${report.id}:`, rmErr.message)
      return false
    }
    const { error: updErr } = await supabase
      .from('reports')
      .update({ pdf_path: null, pdf_generated_at: null, pdf_deleted_at: new Date().toISOString() })
      .eq('id', report.id)
    if (updErr) {
      console.error(`Failed to mark report ${report.id} pdf-deleted:`, updErr.message)
      return false
    }
    return true
  }))

  return { checked: candidates?.length ?? 0, deleted: outcomes.filter(Boolean).length }
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
  const orphanPdfs = await sweepOrphanedPdfs(supabase)
  const pdfs = await sweepOldPdfs(supabase)

  return res.status(200).json({
    checked: candidates?.length ?? 0, purged, skipped,
    orphansChecked: orphans.checked, orphansRemoved: orphans.removed,
    orphanPdfsChecked: orphanPdfs.checked, orphanPdfsRemoved: orphanPdfs.removed,
    pdfsChecked: pdfs.checked, pdfsDeleted: pdfs.deleted,
  })
}
