import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Incorrect email or password.')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100svh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'var(--navy)',
    }}>
      <div style={{ maxWidth: 360, width: '100%' }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img
            src="/logo_hsx.png"
            alt="HSX Roofing"
            style={{ height: 72, borderRadius: 14, padding: 8, background: 'rgba(255,255,255,0.08)', marginBottom: 18 }}
          />
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
            HSX Field Reports
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 5 }}>
            Sign in to continue
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label style={{ color: 'rgba(255,255,255,0.7)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="team@hsxroofing.com"
              autoComplete="email"
              autoCapitalize="none"
              required
              style={{ background: 'rgba(255,255,255,0.07)', color: '#fff', borderColor: 'rgba(255,255,255,0.15)' }}
            />
          </div>
          <div className="field">
            <label style={{ color: 'rgba(255,255,255,0.7)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              style={{ background: 'rgba(255,255,255,0.07)', color: '#fff', borderColor: 'rgba(255,255,255,0.15)' }}
            />
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: '#f87171', textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: 4, width: '100%' }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

      </div>
    </div>
  )
}
