import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import ClientModal from '../components/ClientModal.jsx'
import CompanyModal from '../components/CompanyModal.jsx'
import { Toast, useToast } from '../components/Toast.jsx'
import { COMPANY_ID } from '../lib/constants.js'
import { deleteWithUndo } from '../lib/utils.js'

async function signOut() {
  await supabase.auth.signOut()
}

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [modal, setModal] = useState(null) // null | 'new' | { client object }
  const [companyModal, setCompanyModal] = useState(false)
  const [company, setCompany] = useState(null)
  const [search, setSearch] = useState('')
  const { toast, show } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    fetchClients()
    fetchCompany()
  }, [])

  async function fetchCompany() {
    const { data } = await supabase.from('company_settings').select('*').eq('id', COMPANY_ID).single()
    if (data) setCompany(data)
  }

  async function handleCompanySave(form) {
    const { error } = await supabase.from('company_settings').update(form).eq('id', COMPANY_ID)
    if (!error) { show('Company updated'); setCompanyModal(false); fetchCompany() }
  }

  async function fetchClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('client_name', { ascending: true })
    if (error) setFetchError('Could not load clients — check your connection.')
    else setClients(data)
    setLoading(false)
  }

  async function handleSave(form) {
    if (modal === 'new') {
      const { error } = await supabase.from('clients').insert(form)
      if (!error) {
        show('Client created')
        setModal(null)
        fetchClients()
      }
    } else {
      const { error } = await supabase.from('clients').update(form).eq('id', modal.id)
      if (!error) {
        show('Client updated')
        setModal(null)
        fetchClients()
      }
    }
  }

  function handleDelete() {
    const client = modal
    setModal(null)
    deleteWithUndo({
      item: client,
      setItems: setClients,
      table: 'clients',
      label: `"${client.client_name}" deleted`,
      show,
    })
  }

  return (
    <>
      <Toast toast={toast} />

      {/* Hero header */}
      <header className="hero">
        <div className="hero-inner">
          <div className="hero-brand">
            <img src="/logo_hsx.png"
              alt="HSX Roofing" className="hero-logo" />
            <div>
              <div className="hero-title">HSX Roofing</div>
              <div className="hero-sub">Field Reports</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setCompanyModal(true)}
              title="Edit company info"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 10,
                color: 'rgba(255,255,255,0.85)',
                padding: '9px 13px',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Edit Company
            </button>
            <button
              onClick={signOut}
              title="Sign out"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 10,
                color: 'rgba(255,255,255,0.7)',
                padding: '9px 13px',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="page" style={{ paddingTop: 20 }}>
        {loading && <p style={{ color: 'var(--muted)', textAlign: 'center' }}>Loading…</p>}

        {!loading && fetchError && (
          <p style={{ color: 'var(--danger)', textAlign: 'center' }}>{fetchError}</p>
        )}

        {!loading && !fetchError && clients.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: 40 }}>🏢</div>
            <p>No clients yet. Tap <strong>+ New Client</strong> to get started.</p>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clients…"
            style={{
              width: '100%', padding: '11px 14px', fontSize: 15,
              border: '1px solid var(--line)', borderRadius: 10, background: '#fff',
              color: '#374151',
            }}
          />
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {clients.filter(c => {
            const q = search.trim().toLowerCase()
            if (!q) return true
            return (c.client_name || '').toLowerCase().includes(q)
              || (c.client_address || '').toLowerCase().includes(q)
          }).map(c => (
            <div key={c.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--navy)' }}>{c.client_name}</div>
                {c.client_address && (
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{c.client_address}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn-ghost btn-sm"
                  onClick={(e) => { e.stopPropagation(); setModal(c) }}>
                  Edit
                </button>
                <button className="btn-navy btn-sm"
                  onClick={() => navigate(`/clients/${c.id}`)}>
                  Open →
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Floating new client button */}
      <button
        className="btn-primary"
        onClick={() => setModal('new')}
        style={{
          position: 'fixed',
          bottom: 'calc(24px + env(safe-area-inset-bottom))',
          right: 24,
          zIndex: 40,
          borderRadius: 28,
          padding: '14px 22px',
          fontSize: 16,
          fontWeight: 800,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        }}
      >
        + New Client
      </button>

      {modal && (
        <ClientModal
          initial={modal === 'new' ? null : modal}
          onSave={handleSave}
          onDelete={modal !== 'new' ? handleDelete : undefined}
          onClose={() => setModal(null)}
        />
      )}

      {companyModal && (
        <CompanyModal
          initial={company}
          onSave={handleCompanySave}
          onClose={() => setCompanyModal(false)}
        />
      )}
    </>
  )
}
