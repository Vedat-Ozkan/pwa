import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import ClientModal from '../components/ClientModal.jsx'
import SiteModal from '../components/SiteModal.jsx'
import { Toast, useToast } from '../components/Toast.jsx'
import { deleteWithUndo } from '../lib/utils.js'

export default function ClientPage() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState(false)
  const [siteModal, setSiteModal] = useState(null) // null | 'new' | site object
  const [search, setSearch] = useState('')
  const { toast, show } = useToast()

  useEffect(() => { fetchAll() }, [clientId])

  async function fetchAll() {
    const [{ data: c }, { data: s }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('job_sites').select('*').eq('client_id', clientId)
        .order('corporation_name', { ascending: true, nullsFirst: false })
        .order('job_address', { ascending: true }),
    ])
    if (c) setClient(c)
    if (s) setSites(s)
    setLoading(false)
  }

  async function handleClientSave(form) {
    const { error } = await supabase.from('clients').update(form).eq('id', clientId)
    if (!error) { show('Client updated'); setEditModal(false); fetchAll() }
  }

  async function handleClientDelete() {
    if (!window.confirm('Delete this client and all their properties/reports?')) return
    await supabase.from('clients').delete().eq('id', clientId)
    navigate('/')
  }

  async function handleSiteSave(form) {
    if (siteModal === 'new') {
      const { error } = await supabase.from('job_sites').insert({ client_id: clientId, ...form })
      if (!error) { show('Property created'); setSiteModal(null); fetchAll() }
    } else {
      const { error } = await supabase.from('job_sites').update(form).eq('id', siteModal.id)
      if (!error) { show('Property updated'); setSiteModal(null); fetchAll() }
    }
  }

  function deleteSite(siteId) {
    const site = sites.find(s => s.id === siteId)
    setSiteModal(null)
    deleteWithUndo({ item: site, setItems: setSites, table: 'job_sites', label: 'Property deleted', show })
  }

  if (loading) {
    return (
      <>
        <div className="topbar"><button className="btn-back" onClick={() => navigate('/')}>‹</button></div>
        <p style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading…</p>
      </>
    )
  }

  if (!client) {
    return (
      <>
        <div className="topbar"><button className="btn-back" onClick={() => navigate('/')}>‹</button></div>
        <p style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Client not found.</p>
      </>
    )
  }

  return (
    <>
      <Toast toast={toast} />

      <header className="topbar">
        <button className="btn-back" onClick={() => navigate('/')}>‹</button>
        <span className="topbar-title">{client.client_name}</span>
        <button onClick={() => setEditModal(true)}>Edit</button>
      </header>

      <main className="page" style={{ paddingTop: 20 }}>
        {/* Client info card */}
        <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
          <div style={{
            overflowX: 'auto', WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none', msOverflowStyle: 'none', padding: 16,
          }}>
            <div style={{ display: 'inline-grid', gap: 6 }}>
              {client.client_address && <Info label="Address" value={client.client_address} />}
              {client.billing_address && <Info label="Billing" value={client.billing_address} />}
              {client.contact_person && <Info label="Contact" value={client.contact_person} />}
              {client.phone && <Info label="Phone" value={client.phone} />}
              {client.email && <Info label="Email" value={client.email} />}
              <div style={{ width: 24 }} aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 14 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search properties…"
            style={{
              width: '100%', padding: '11px 14px', fontSize: 15,
              border: '1px solid var(--line)', borderRadius: 10, background: '#fff',
              color: '#374151',
            }}
          />
        </div>

        {/* Sites section */}
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy)' }}>Properties</h2>
        </div>

        {sites.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: 40 }}>📍</div>
            <p>No properties yet. Tap <strong>+ New Property</strong> to add one.</p>
          </div>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          {sites.filter(s => {
            const q = search.trim().toLowerCase()
            if (!q) return true
            return (s.job_address || '').toLowerCase().includes(q)
              || (s.corporation_name || '').toLowerCase().includes(q)
          }).map(s => (
            <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>
                  {s.job_address || '(no address)'}
                </div>
                {s.corporation_name && (
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{s.corporation_name}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn-ghost btn-sm" onClick={() => setSiteModal(s)}>Edit</button>
                <button className="btn-navy btn-sm"
                  onClick={() => navigate(`/clients/${clientId}/sites/${s.id}`)}>
                  Open →
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Floating new site button */}
      <button
        className="btn-primary"
        onClick={() => setSiteModal('new')}
        style={{
          position: 'fixed',
          bottom: 'calc(24px + env(safe-area-inset-bottom))',
          right: 24, zIndex: 40, borderRadius: 28,
          padding: '14px 22px', fontSize: 16, fontWeight: 800,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        }}
      >
        + New Property
      </button>

      {editModal && (
        <ClientModal
          initial={client}
          onSave={handleClientSave}
          onDelete={handleClientDelete}
          onClose={() => setEditModal(false)}
        />
      )}

      {siteModal && (
        <SiteModal
          initial={siteModal === 'new' ? null : siteModal}
          onSave={handleSiteSave}
          onDelete={siteModal !== 'new' ? () => deleteSite(siteModal.id) : undefined}
          onClose={() => setSiteModal(null)}
        />
      )}

    </>
  )
}

function Info({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 12, fontSize: 14, alignItems: 'baseline', whiteSpace: 'nowrap' }}>
      <span style={{ color: 'var(--muted)', minWidth: 64, flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  )
}
