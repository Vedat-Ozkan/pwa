import { createClient } from '@supabase/supabase-js'

// One-off admin script (not on the cron schedule) — run manually once to pull
// forward the storage savings from the smaller logo (public/logo_hsx.png)
// and quality-60 re-encode (see api/generate-pdf.js) without waiting for
// each report to naturally get edited again.
//
// Only reports where photos_purged_at IS NULL are safe to touch: their
// source photos are still live in R2, so generate-pdf.js can
// re-inline them. Reports that already had photos purged must NOT be
// regenerated — inlinePhoto() skips any photo with no live URL, so a forced
// regen there would silently produce a PDF missing those photos, with no
// way to get them back.
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

  const { data: candidates, error } = await supabase
    .from('reports')
    .select('id')
    .is('photos_purged_at', null)
    .not('pdf_path', 'is', null)
    .is('pdf_deleted_at', null)

  if (error) {
    console.error('Regen query failed:', error)
    return res.status(500).json({ error: 'Query failed', detail: error.message })
  }

  const protocol = req.headers['x-forwarded-proto'] || 'https'
  const origin = `${protocol}://${req.headers.host}`

  const outcomes = await Promise.all((candidates ?? []).map(async ({ id }) => {
    try {
      const r = await fetch(`${origin}/api/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: id, force: true }),
      })
      if (!r.ok) {
        console.error(`Regen failed for ${id}: HTTP ${r.status}`)
        return false
      }
      return true
    } catch (err) {
      console.error(`Regen failed for ${id}:`, err.message)
      return false
    }
  }))

  return res.status(200).json({
    checked: candidates?.length ?? 0,
    regenerated: outcomes.filter(Boolean).length,
    failed: outcomes.filter(o => !o).length,
  })
}
