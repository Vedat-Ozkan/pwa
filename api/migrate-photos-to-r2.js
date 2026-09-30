import { createClient } from '@supabase/supabase-js'
import { isR2Configured, listR2Photos, uploadR2Photo } from './lib/r2.js'

// Temporary backfill, on the daily cron until old PWA clients stop uploading
// to Supabase: copies every photo still referenced by an unpurged report from
// the Supabase report-photos bucket to R2 under the same path, then removes
// the Supabase copy. Photos already in R2 are skipped. Each run copies in
// batches until its time budget is spent; trigger it from Vercel → Settings →
// Cron Jobs → Run until `remaining` returns 0.
const BATCH_SIZE = 25
const TIME_BUDGET_MS = 45 * 1000

function supabasePhotoUrl(path) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  return `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/report-photos/${encodedPath}`
}

async function migratePhoto(supabase, path) {
  try {
    const response = await fetch(supabasePhotoUrl(path))
    if (!response.ok) throw new Error(`Supabase download returned ${response.status}`)
    const body = Buffer.from(await response.arrayBuffer())

    await uploadR2Photo(path, body, response.headers.get('content-type') || 'image/jpeg')

    const { error: removeError } = await supabase.storage.from('report-photos').remove([path])
    if (removeError) console.warn(`Migrated ${path}, but Supabase cleanup failed:`, removeError.message)

    return { path, status: 'migrated', bytes: body.length }
  } catch (error) {
    console.error(`Photo migration failed for ${path}:`, error.message)
    return { path, status: 'failed', error: error.message }
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

  const { data: reports, error } = await supabase
    .from('reports')
    .select('data')
    .is('photos_purged_at', null)
  if (error) return res.status(500).json({ error: 'Query failed', detail: error.message })

  const inR2 = new Set((await listR2Photos()).map(object => object.Key.slice('photos/'.length)))
  const pending = (reports ?? [])
    .flatMap(report => {
      const groups = report.data?.photos ?? {}
      return [...(groups.before ?? []), ...(groups.progress ?? []), ...(groups.after ?? [])]
    })
    .map(photo => photo.path)
    .filter(path => path && !inR2.has(path))

  const startedAt = Date.now()
  const outcomes = []
  for (let i = 0; i < pending.length && Date.now() - startedAt < TIME_BUDGET_MS; i += BATCH_SIZE) {
    outcomes.push(...await Promise.all(pending.slice(i, i + BATCH_SIZE).map(path => migratePhoto(supabase, path))))
  }
  const migrated = outcomes.filter(outcome => outcome.status === 'migrated').length

  return res.status(200).json({
    attempted: outcomes.length,
    migrated,
    failed: outcomes.length - migrated,
    remaining: pending.length - migrated,
    bytesMoved: outcomes.reduce((total, outcome) => total + (outcome.bytes ?? 0), 0),
    outcomes,
  })
}
