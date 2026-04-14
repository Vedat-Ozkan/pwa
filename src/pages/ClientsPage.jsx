import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import ClientModal from '../components/ClientModal.jsx'
import { Toast, useToast } from '../components/Toast.jsx'

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'new' | { client object }
  const { msg, show } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setClients(data)
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

  async function handleDelete() {
    if (!window.confirm('Delete this client and all their reports?')) return
    const { error } = await supabase.from('clients').delete().eq('id', modal.id)
    if (!error) {
      show('Client deleted')
      setModal(null)
      fetchClients()
    }
  }

  return (
    <>
      <Toast msg={msg} />

      {/* Hero header */}
      <header className="hero">
        <div className="hero-inner">
          <div className="hero-brand">
            <img src="https://hsxroofing.com/wp-content/uploads/2025/03/logo_hsx.png"
              alt="HSX Roofing" className="hero-logo" />
            <div>
              <div className="hero-title">HSX Roofing</div>
              <div className="hero-sub">Field Reports</div>
            </div>
          </div>
          <button className="btn-primary" onClick={() => setModal('new')}>
            + New Client
          </button>
        </div>
      </header>

      <main className="page" style={{ paddingTop: 20 }}>
        {loading && <p style={{ color: 'var(--muted)', textAlign: 'center' }}>Loading…</p>}

        {!loading && clients.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: 40 }}>🏢</div>
            <p>No clients yet. Tap <strong>+ New Client</strong> to get started.</p>
          </div>
        )}

        <div style={{ display: 'grid', gap: 12 }}>
          {clients.map(c => (
            <div key={c.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--navy)' }}>{c.name}</div>
                {c.building && (
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{c.building}</div>
                )}
                {c.address && (
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{c.address}</div>
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

      {modal && (
        <ClientModal
          initial={modal === 'new' ? null : modal}
          onSave={handleSave}
          onDelete={modal !== 'new' ? handleDelete : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
