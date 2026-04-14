import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import ClientModal from '../components/ClientModal.jsx'
import { Toast, useToast } from '../components/Toast.jsx'

export default function ClientPage() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState(false)
  const { msg, show } = useToast()

  useEffect(() => {
    fetchAll()
  }, [clientId])

  async function fetchAll() {
    const [{ data: c }, { data: r }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('reports')
        .select('id, job_name, report_date, data')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
    ])
    if (c) setClient(c)
    if (r) setReports(r)
    setLoading(false)
  }

  async function handleClientSave(form) {
    const { error } = await supabase.from('clients').update(form).eq('id', clientId)
    if (!error) {
      show('Client updated')
      setEditModal(false)
      fetchAll()
    }
  }

  async function handleClientDelete() {
    if (!window.confirm('Delete this client and all their reports?')) return
    await supabase.from('clients').delete().eq('id', clientId)
    navigate('/')
  }

  async function deleteReport(reportId) {
    if (!window.confirm('Delete this report?')) return
    await supabase.from('reports').delete().eq('id', reportId)
    setReports(r => r.filter(x => x.id !== reportId))
    show('Report deleted')
  }

  function formatDate(d) {
    if (!d) return ''
    const [y, m, day] = d.split('-')
    return `${m}/${day}/${y}`
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
      <Toast msg={msg} />

      <header className="topbar">
        <button className="btn-back" onClick={() => navigate('/')}>‹</button>
        <span className="topbar-title">{client.name}</span>
        <button onClick={() => setEditModal(true)}>Edit</button>
      </header>

      <main className="page" style={{ paddingTop: 20 }}>
        {/* Client info card */}
        <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
          {/* Single horizontally-scrollable block — all rows scroll together */}
          <div style={{
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            padding: 16,
            paddingRight: 24,
          }}>
            <div style={{ display: 'grid', gap: 6 }}>
              {client.building && <Info label="Building" value={client.building} />}
              {client.address && <Info label="Address" value={client.address} />}
              {client.contact && <Info label="Contact" value={client.contact} />}
              {client.phone && <Info label="Phone" value={client.phone} />}
              {client.email && <Info label="Email" value={client.email} />}
            </div>
          </div>
        </div>

        {/* Reports section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>Reports</h2>
          <button className="btn-primary btn-sm"
            onClick={() => navigate(`/clients/${clientId}/reports/new`)}>
            + New Report
          </button>
        </div>

        {reports.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: 40 }}>📋</div>
            <p>No reports yet. Tap <strong>+ New Report</strong> to create one.</p>
          </div>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          {reports.map(r => (
            <div key={r.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>
                  {r.job_name || '(untitled)'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                  {[formatDate(r.report_date), r.data?.serviceType].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn-danger btn-sm" onClick={() => deleteReport(r.id)}>Delete</button>
                <button className="btn-navy btn-sm"
                  onClick={() => navigate(`/clients/${clientId}/reports/${r.id}`)}>
                  Open →
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {editModal && (
        <ClientModal
          initial={client}
          onSave={handleClientSave}
          onDelete={handleClientDelete}
          onClose={() => setEditModal(false)}
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
