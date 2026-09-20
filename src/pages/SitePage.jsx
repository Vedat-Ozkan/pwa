import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { Toast, useToast } from '../components/Toast.jsx'
import { deleteWithUndo, deleteReportFiles, fmtDate } from '../lib/utils.js'

function fmtDateTime(iso) {
  const d = new Date(iso)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const year = d.getFullYear()
  let hours = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${month}-${day}-${year} ${hours}:${minutes} ${ampm}`
}

export default function SitePage() {
  const { clientId, siteId } = useParams()
  const navigate = useNavigate()
  const [site, setSite] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const { toast, show } = useToast()
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => { fetchAll() }, [siteId])

  async function fetchAll() {
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from('job_sites').select('*').eq('id', siteId).single(),
      supabase.from('reports')
        .select('id, report_date, updated_at, report_name:data->>name')
        .eq('job_site_id', siteId)
        .order('report_date', { ascending: true }),
    ])
    if (s) setSite(s)
    if (r) setReports(r)
    setLoading(false)
  }

  function deleteReport(reportId) {
    const report = reports.find(r => r.id === reportId)
    setConfirmDeleteId(null)
    deleteWithUndo({
      item: report, setItems: setReports, table: 'reports', label: 'Report deleted', show,
      cleanupFiles: async () => {
        const { data } = await supabase.from('reports').select('data, pdf_path, pdf_storage').eq('id', reportId).single()
        if (data) await deleteReportFiles(data)
      },
    })
  }

  if (loading) {
    return (
      <>
        <div className="topbar">
          <button className="btn-back" onClick={() => navigate(`/clients/${clientId}`)}>&#8249;</button>
        </div>
        <p style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading...</p>
      </>
    )
  }

  if (!site) {
    return (
      <>
        <div className="topbar">
          <button className="btn-back" onClick={() => navigate(`/clients/${clientId}`)}>&#8249;</button>
        </div>
        <p style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Property not found.</p>
      </>
    )
  }

  return (
    <>
      <Toast toast={toast} />

      <header className="topbar">
        <button className="btn-back" onClick={() => navigate(`/clients/${clientId}`)}>&#8249;</button>
        <span className="topbar-title">
          {site.corporation_name ? `${site.corporation_name} — ` : ''}{site.job_address || '(no address)'}
        </span>
      </header>

      <main className="page" style={{ paddingTop: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy)' }}>Reports</h2>
        </div>

        {reports.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: 40 }}>&#128203;</div>
            <p>No reports yet. Tap <strong>+ New Report</strong> to create one.</p>
          </div>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          {reports.map(r => (
            <div key={r.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>
                  {r.report_name || r.data?.name || fmtDate(r.report_date) || 'No date'}
                </div>
                {r.updated_at && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    Modified {fmtDateTime(r.updated_at)}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn-danger btn-sm" onClick={() => setConfirmDeleteId(r)}>Delete</button>
                <button className="btn-navy btn-sm"
                  onClick={() => navigate(`/clients/${clientId}/sites/${siteId}/reports/${r.id}`)}>
                  Open &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <button
        className="btn-primary"
        onClick={() => navigate(`/clients/${clientId}/sites/${siteId}/reports/new`)}
        style={{
          position: 'fixed',
          bottom: 'calc(24px + env(safe-area-inset-bottom))',
          right: 24, zIndex: 40, borderRadius: 28,
          padding: '14px 22px', fontSize: 16, fontWeight: 800,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        }}
      >
        + New Report
      </button>

      {confirmDeleteId && (
        <div className="overlay" style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 300, textAlign: 'center', borderRadius: 'var(--radius)', padding: '24px' }}>
            <h2 className="modal-title">Delete this report?</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 6px' }}>
              {confirmDeleteId.data?.name || fmtDate(confirmDeleteId.report_date)}
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => deleteReport(confirmDeleteId.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
