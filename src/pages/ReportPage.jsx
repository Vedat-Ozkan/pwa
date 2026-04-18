import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import PhotoSection from '../components/PhotoSection.jsx'
import { Toast, useToast } from '../components/Toast.jsx'
import ReportPDFPreview from '../components/ReportPDFPreview.jsx'
import { ROOF_TYPES, SERVICE_TYPES, LEAK_SOURCES, WORK_STATUSES } from '../lib/constants.js'

function localToday() {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

const EMPTY_FORM = {
  report_date: localToday(),
  supervisor: '',
  po_number: '',
  wo_number: '',
  roofType: '',
  serviceType: '',
  leakSources: [],
  findings: '',
  workPerformed: '',
  materials: '',
  notes: '',
  workStatus: '',
  signedBy: '',
  total: '',
  photos: { before: [], progress: [], after: [] },
}

function formatMoney(val) {
  const num = parseFloat(val)
  if (!Number.isFinite(num)) return ''
  return num.toLocaleString('en-US', { style: 'currency', currency: 'CAD' })
}

export default function ReportPage() {
  const { clientId, siteId, reportId } = useParams()
  const isNew = reportId === undefined
  const navigate = useNavigate()
  const { toast, show } = useToast()

  const [client, setClient] = useState(null)
  const [site, setSite] = useState(null)
  const [company, setCompany] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const savedForm = useRef(EMPTY_FORM)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [savedVersion, setSavedVersion] = useState(0)
  const [reportDbId] = useState(() => {
    // crypto.randomUUID() may not exist on older Android WebViews
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
  })

  const effectiveReportId = isNew ? reportDbId : reportId

  useEffect(() => {
    supabase.from('clients').select('*').eq('id', clientId).single()
      .then(({ data }) => { if (data) setClient(data) })
    supabase.from('job_sites').select('*').eq('id', siteId).single()
      .then(({ data }) => { if (data) setSite(data) })
    supabase.from('company_settings').select('*').eq('id', 1).single()
      .then(({ data }) => { if (data) setCompany(data) })

    if (!isNew) {
      supabase.from('reports').select('*').eq('id', reportId).single()
        .then(({ data }) => {
          if (data) {
            const loaded = {
              report_date: data.report_date ?? '',
              supervisor: data.supervisor ?? '',
              po_number: data.po_number ?? '',
              wo_number: data.wo_number ?? '',
              roofType: data.data?.roofType ?? '',
              serviceType: data.data?.serviceType ?? '',
              leakSources: data.data?.leakSources ?? [],
              findings: data.data?.findings ?? '',
              workPerformed: data.data?.workPerformed ?? '',
              materials: data.data?.materials ?? '',
              notes: data.data?.notes ?? '',
              workStatus: data.data?.workStatus ?? '',
              signedBy: data.data?.signedBy ?? '',
              total: data.data?.total ?? '',
              photos: data.data?.photos ?? { before: [], progress: [], after: [] },
            }
            setForm(loaded)
            savedForm.current = loaded
          }
          setLoading(false)
        })
    }
  }, [clientId, siteId, reportId, isNew])

  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm.current)

  useEffect(() => {
    if (!isDirty) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const confirmLeave = useCallback(() => {
    if (!isDirty) return true
    return window.confirm('You have unsaved changes. Leave without saving?')
  }, [isDirty])

  function goBack() {
    if (confirmLeave()) navigate(`/clients/${clientId}/sites/${siteId}`)
  }

  function setField(field) {
    return (e) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function toggleLeak(source) {
    setForm(f => ({
      ...f,
      leakSources: f.leakSources.includes(source)
        ? f.leakSources.filter(s => s !== source)
        : [...f.leakSources, source],
    }))
  }

  function setPhotos(group) {
    return (photos) => setForm(f => ({ ...f, photos: { ...f.photos, [group]: photos } }))
  }

  async function save() {
    setSaving(true)
    const payload = {
      job_site_id: siteId,
      report_date: form.report_date || null,
      supervisor: form.supervisor,
      po_number: form.po_number,
      wo_number: form.wo_number,
      data: {
        roofType: form.roofType,
        serviceType: form.serviceType,
        leakSources: form.leakSources,
        findings: form.findings,
        workPerformed: form.workPerformed,
        materials: form.materials,
        notes: form.notes,
        workStatus: form.workStatus,
        signedBy: form.signedBy,
        total: form.total,
        photos: form.photos,
      },
    }

    let error
    if (isNew) {
      ;({ error } = await supabase.from('reports').insert({ id: effectiveReportId, ...payload }))
      if (!error) {
        savedForm.current = form
        setSavedVersion(v => v + 1)
        show('Report saved')
        navigate(`/clients/${clientId}/sites/${siteId}/reports/${effectiveReportId}`, { replace: true })
      }
    } else {
      ;({ error } = await supabase.from('reports').update(payload).eq('id', reportId))
      if (!error) { savedForm.current = form; setSavedVersion(v => v + 1); show('Saved') }
    }

    if (error) show('Error saving — check connection')
    setSaving(false)
    return !error
  }

  if (loading) {
    return (
      <>
        <div className="topbar">
          <button className="btn-back" onClick={goBack}>‹</button>
        </div>
        <p style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading…</p>
      </>
    )
  }

  return (
    <>
      <Toast toast={toast} />

      <header className="topbar">
        <button className="btn-back" onClick={goBack}>‹</button>
        <span className="topbar-title">
          {client?.client_name ?? ''}{site?.corporation_name ? ` — ${site.corporation_name}` : ''}{site?.job_address ? ` — ${site.job_address}` : ''}
        </span>
        <button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </header>

      <main className="page" style={{ paddingTop: 20, paddingBottom: 0 }}>

        {/* ── Project Information ── */}
        <Section title="Project Information">
          <div className="form-grid form-grid-2">
            <Field label="Report Date">
              <input type="date" value={form.report_date} onChange={setField('report_date')} />
            </Field>
            <Field label="Supervisor">
              <input value={form.supervisor} onChange={setField('supervisor')} placeholder="Supervisor name" />
            </Field>
            <Field label="PO Number">
              <input value={form.po_number} onChange={setField('po_number')} placeholder="PO #" />
            </Field>
            <Field label="WO Number">
              <input value={form.wo_number} onChange={setField('wo_number')} placeholder="WO #" />
            </Field>
          </div>
        </Section>

        <div className="divider" />

        {/* ── Roof System ── */}
        <Section title="Roof System">
          <div className="form-grid form-grid-2">
            <Field label="Roof System Type">
              <select value={form.roofType} onChange={setField('roofType')}>
                <option value="">Select one</option>
                {ROOF_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Service Type">
              <select value={form.serviceType} onChange={setField('serviceType')}>
                <option value="">Select one</option>
                {SERVICE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        <div className="divider" />

        {/* ── Leak Source ── */}
        <Section title="Leak Source">
          <div className="check-grid">
            {LEAK_SOURCES.map(s => (
              <label
                key={s}
                className={`check-item${form.leakSources.includes(s) ? ' checked' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={form.leakSources.includes(s)}
                  onChange={() => toggleLeak(s)}
                />
                {s}
              </label>
            ))}
          </div>
        </Section>

        <div className="divider" />

        {/* ── Work Description ── */}
        <Section title="Work Description">
          <div className="form-grid">
            <Field label="Site Conditions / Findings">
              <textarea value={form.findings} onChange={setField('findings')}
                placeholder="Describe site conditions, leak findings, damaged areas…" />
            </Field>
            <Field label="Work Performed">
              <textarea value={form.workPerformed} onChange={setField('workPerformed')}
                placeholder="Describe work performed in detail…" />
            </Field>
            <Field label="Materials Used">
              <textarea value={form.materials} onChange={setField('materials')}
                placeholder="List materials: membrane, primer, sealant, flashing…" />
            </Field>
            <Field label="Notes / Recommendations">
              <textarea value={form.notes} onChange={setField('notes')}
                placeholder="Additional observations or recommendations…" />
            </Field>
          </div>
        </Section>

        <div className="divider" />

        {/* ── Work Status ── */}
        <Section title="Work">
          <div className="check-grid" style={{ gridTemplateColumns: '1fr' }}>
            {WORK_STATUSES.map(w => (
              <label
                key={w.key}
                className={`check-item${form.workStatus === w.key ? ' checked' : ''}`}
                style={{ alignItems: 'flex-start' }}
              >
                <input
                  type="radio"
                  name="workStatus"
                  checked={form.workStatus === w.key}
                  onChange={() => setForm(f => ({ ...f, workStatus: w.key }))}
                />
                <span>
                  <div style={{ fontWeight: 600 }}>{w.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{w.description}</div>
                </span>
              </label>
            ))}
            {form.workStatus && (
              <button
                type="button"
                className="btn-ghost"
                style={{ alignSelf: 'flex-start', fontSize: 12 }}
                onClick={() => setForm(f => ({ ...f, workStatus: '' }))}
              >
                Clear selection
              </button>
            )}
          </div>
        </Section>

        <div className="divider" />

        {/* ── Total ── */}
        <Section title="Total">
          <Field label="Total Cost (CAD)">
            <input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={form.total}
              onChange={setField('total')}
              placeholder="0.00"
            />
          </Field>
          {form.total !== '' && Number.isFinite(parseFloat(form.total)) && (
            <div style={{
              marginTop: 12, padding: '14px 18px',
              border: '1px solid var(--line)', borderRadius: 10, background: '#fafbfd',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.04em' }}>TOTAL</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>
                {formatMoney(form.total)}
              </span>
            </div>
          )}
        </Section>

        <div className="divider" />

        {/* ── Signature ── */}
        <Section title="Signature">
          <Field label="Signed By">
            <input value={form.signedBy} onChange={setField('signedBy')}
              placeholder="Full name — will appear as signature" />
          </Field>
          {form.signedBy && (
            <div style={{
              marginTop: 12, padding: '12px 16px',
              border: '1px solid var(--line)', borderRadius: 10, background: '#fafbfd',
            }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>SIGNATURE PREVIEW</div>
              <div style={{ fontStyle: 'italic', fontSize: 22, color: 'var(--navy)', fontFamily: 'Georgia, serif' }}>
                {form.signedBy}
              </div>
            </div>
          )}
        </Section>

        <div className="divider" />

        {/* ── Photo Documentation ── */}
        <Section title="Photo Documentation">
          <div className="form-grid">
            <div>
              <h2 className="section-title">Before</h2>
              <PhotoSection
                label="before"
                photos={form.photos.before}
                onChange={setPhotos('before')}
                clientId={clientId}
                reportId={effectiveReportId}
              />
            </div>
            <div className="divider" style={{ margin: '4px 0' }} />
            <div>
              <h2 className="section-title">Progress</h2>
              <PhotoSection
                label="progress"
                photos={form.photos.progress}
                onChange={setPhotos('progress')}
                clientId={clientId}
                reportId={effectiveReportId}
              />
            </div>
            <div className="divider" style={{ margin: '4px 0' }} />
            <div>
              <h2 className="section-title">After</h2>
              <PhotoSection
                label="after"
                photos={form.photos.after}
                onChange={setPhotos('after')}
                clientId={clientId}
                reportId={effectiveReportId}
              />
            </div>
          </div>
        </Section>

        {/* ── PDF Preview ── */}
        <div style={{
          position: 'sticky',
          top: 'calc(56px + env(safe-area-inset-top))',
          zIndex: 40,
          margin: '28px -16px 0',
          background: 'var(--navy)',
          padding: '12px 16px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{
            background: 'var(--gold)', borderRadius: 6,
            padding: '4px 10px', fontSize: 11, fontWeight: 800,
            color: '#1e1a12', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Preview
          </div>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            PDF Report
          </span>
        </div>

        <div style={{ margin: '0 -16px', background: 'var(--navy)', padding: '0 16px 120px' }}>
          <ReportPDFPreview
            form={form}
            client={client}
            site={site}
            company={company}
            reportId={effectiveReportId}
            isNew={isNew}
            savedVersion={savedVersion}
            isDirty={isDirty}
            onSave={save}
          />
        </div>

      </main>

      {/* Floating bottom bar */}
      <div className="bottom-bar">
        <div className="bottom-bar-inner">
          <button
            className="btn-ghost"
            style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
            onClick={goBack}
          >
            Back
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </>
  )
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 4 }}>
      <h2 className="section-title">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  )
}
