import { createClient } from '@supabase/supabase-js'
import { deleteR2Photos, getR2PhotoUploadUrl, getR2PhotoUrl } from './lib/r2.js'

// Report photos live in private R2 storage.
//   GET  ?path=...                        → redirect to a short-lived signed URL.
//        Unauthenticated so <img src> works; paths are random UUIDs, the same
//        exposure the old public Supabase bucket had.
//   POST { action: 'upload', path }       → signed PUT URL for the browser.
//   POST { action: 'delete', paths }      → remove photos.
//        Both POST actions require the caller's Supabase session token.
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { path } = req.query
    if (typeof path !== 'string' || !path) return res.status(400).json({ error: 'path is required' })
    // Signed for an hour; the browser may reuse the redirect for 50 minutes.
    res.setHeader('Cache-Control', 'private, max-age=3000')
    return res.redirect(302, await getR2PhotoUrl(path))
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const token = req.headers.authorization?.replace(/^Bearer /, '')
  const { data: { user } = {} } = token ? await supabase.auth.getUser(token) : {}
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { action, path, paths } = req.body ?? {}
  if (action === 'upload' && typeof path === 'string' && path) {
    return res.status(200).json({ url: await getR2PhotoUploadUrl(path) })
  }
  if (action === 'delete' && Array.isArray(paths)) {
    if (paths.length) await deleteR2Photos(paths)
    return res.status(200).json({ deleted: paths.length })
  }
  return res.status(400).json({ error: 'Invalid request' })
}
