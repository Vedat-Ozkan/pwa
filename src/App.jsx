import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { isConfigured, supabase } from './lib/supabase.js'
import ClientsPage from './pages/ClientsPage.jsx'
import ClientPage from './pages/ClientPage.jsx'
import SitePage from './pages/SitePage.jsx'
import ReportPage from './pages/ReportPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import IOSInstallBanner from './components/IOSInstallBanner.jsx'
import UpdateBanner from './components/UpdateBanner.jsx'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = checking
  const [updateReady, setUpdateReady] = useState(false)

  // Installed PWAs (iOS especially) resume instead of relaunching, so check for
  // a new version on every return to the foreground and hourly. A new service
  // worker takes over at once (iOS never activates a waiting one), but an open
  // page keeps its old code until it reloads, so offer that reload.
  useEffect(() => {
    const sw = navigator.serviceWorker
    if (!sw) return
    const check = () => sw.getRegistration().then(r => r?.update()).catch(() => {})
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    const onControllerChange = () => setUpdateReady(true)
    // No controller means this page already loaded the newest version.
    if (sw.controller) sw.addEventListener('controllerchange', onControllerChange)
    document.addEventListener('visibilitychange', onVisible)
    const interval = setInterval(check, 60 * 60 * 1000)
    return () => {
      sw.removeEventListener('controllerchange', onControllerChange)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (!isConfigured) return
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  if (!isConfigured) return <SetupScreen />
  if (session === undefined) return <div style={{ minHeight: '100svh', background: 'var(--navy)' }} />
  if (!session) return <LoginPage />

  return (
    <>
      {updateReady && <UpdateBanner onUpdate={() => window.location.reload()} />}
      <IOSInstallBanner />
      <Routes>
        <Route path="/" element={<ClientsPage />} />
        <Route path="/clients/:clientId" element={<ClientPage />} />
        <Route path="/clients/:clientId/sites/:siteId" element={<SitePage />} />
        <Route path="/clients/:clientId/sites/:siteId/reports/new" element={<ReportPage />} />
        <Route path="/clients/:clientId/sites/:siteId/reports/:reportId" element={<ReportPage />} />
      </Routes>
    </>
  )
}

function SetupScreen() {
  return (
    <div style={{
      minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, background: 'var(--bg)',
    }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="/logo_hsx.png"
            alt="HSX Roofing"
            style={{ height: 64, borderRadius: 10, padding: 6, background: 'var(--navy)', marginBottom: 16 }}
          />
          <h1 style={{ color: 'var(--navy)', fontSize: 22, marginBottom: 8 }}>HSX Field Reports</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>Supabase not configured yet.</p>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 15, color: 'var(--navy)', marginBottom: 16 }}>Setup steps</h2>
          <ol style={{ margin: 0, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
            <li>
              Create a free project at{' '}
              <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ color: 'var(--navy)', fontWeight: 700 }}>
                supabase.com
              </a>
            </li>
            <li>
              Run <code style={{ background: 'var(--soft)', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>supabase/supabase-setup.sql</code>{' '}
              in the Supabase SQL editor
            </li>
            <li>
              Copy your <strong>Project URL</strong> and <strong>anon key</strong> from{' '}
              Project Settings → API
            </li>
            <li>
              Create a <code style={{ background: 'var(--soft)', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>.env</code>{' '}
              file in the project root:
              <pre style={{
                background: 'var(--soft)', padding: 12, borderRadius: 8,
                fontSize: 12, margin: '8px 0 0', overflowX: 'auto',
                fontFamily: 'monospace',
              }}>
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
              </pre>
            </li>
            <li>Restart the dev server: <code style={{ background: 'var(--soft)', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>npm run dev</code></li>
          </ol>
        </div>
      </div>
    </div>
  )
}
