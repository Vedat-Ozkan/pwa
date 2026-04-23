import { useState, useRef, useEffect } from 'react'
import { LEAK_SOURCES, WORK_STATUSES } from '../lib/constants.js'
import { fmtDate } from '../lib/utils.js'

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

function runAction(action, { file, url, filename }) {
  if (action === 'share') {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: filename }).catch(err => {
        if (err?.name !== 'AbortError') console.error('Share failed:', err)
      })
    } else {
      window.open(url, '_blank')
    }
    return
  }
  // download
  if (isIOS()) {
    window.open(url, '_blank')
    return
  }
  const objUrl = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = objUrl
  a.download = filename
  a.click()
  URL.revokeObjectURL(objUrl)
}

export default function ReportPDFPreview({ form, client, site, company, reportId, isNew, savedVersion = 0, isDirty = false, onSave }) {
  // status: 'idle' | 'loading' | 'ready' | 'error'
  const [status, setStatus] = useState('idle')
  const [cached, setCached] = useState(null)   // { file, url, filename }
  const [pending, setPending] = useState(null) // 'share' | 'download' | null
  const [retryKey, setRetryKey] = useState(0)
  const pendingRef = useRef(null)

  // Prepare the PDF whenever the saved version changes (or on mount for an
  // existing report). Bytes are fetched into a File held in state so Share
  // can hand off instantly.
  useEffect(() => {
    if (isNew || !reportId) return
    let cancelled = false
    setStatus('loading')
    setCached(null)
    ;(async () => {
      try {
        const res = await fetch('/api/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId }),
        })
        if (!res.ok) throw new Error(`Server ${res.status}`)
        const { url, filename } = await res.json()
        if (cancelled) return
        const blobRes = await fetch(url)
        if (!blobRes.ok) throw new Error(`Blob ${blobRes.status}`)
        const blob = await blobRes.blob()
        if (cancelled) return
        const file = new File([blob], filename, { type: 'application/pdf' })
        const next = { file, url, filename }
        setCached(next)
        setStatus('ready')
        if (pendingRef.current) {
          const action = pendingRef.current
          pendingRef.current = null
          setPending(null)
          if (!isIOS()) runAction(action, next)
        }
      } catch (err) {
        if (cancelled) return
        console.error('PDF prepare error:', err)
        setStatus('error')
      }
    })()
    return () => { cancelled = true }
  }, [reportId, isNew, savedVersion, retryKey])

  async function onAction(action) {
    // Dirty form → save first. The save bumps savedVersion, which restarts
    // the prefetch effect; the queued action fires when the fresh PDF lands.
    if (isDirty && onSave) {
      pendingRef.current = action
      setPending(action)
      const ok = await onSave()
      if (!ok) {
        pendingRef.current = null
        setPending(null)
      }
      return
    }
    if (cached) { runAction(action, cached); return }
    pendingRef.current = action
    setPending(action)
    if (status === 'error') setRetryKey(k => k + 1)
  }

  return (
    <div>
      {/* HTML preview — live form state */}
      <div style={{
        border: '1px solid var(--line)', borderRadius: 12,
        background: '#fff', overflow: 'hidden', marginBottom: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}>
        <HTMLPreview form={form} client={client} site={site} company={company} />
      </div>

      {isNew ? (
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
          Save the report first to download or share the PDF.
        </p>
      ) : (
        <>
          <StatusPill status={isDirty ? 'dirty' : status} />
          {(() => {
            const busy = pending !== null || (status === 'loading' && !isDirty)
            const btnStyle = {
              flex: 1, color: '#fff', border: 'none', borderRadius: 12,
              padding: '13px 16px', fontSize: 15, fontWeight: 700,
              cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.55 : 1,
            }
            return (
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => onAction('download')} disabled={busy}
              style={{ ...btnStyle, background: '#2860b8' }}>
              {pending === 'download' ? 'Preparing…' : '↓ Download'}
            </button>
            <button type="button" onClick={() => onAction('share')} disabled={busy}
              style={{ ...btnStyle, background: '#1a7d35' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              {pending === 'share' ? 'Preparing…' : 'Share'}
            </button>
          </div>
            )
          })()}
          {status === 'error' && !pending && (
            <p style={{ fontSize: 12, color: '#f87171', textAlign: 'center', marginTop: 8 }}>
              Could not prepare PDF. Tap Download or Share to retry.
            </p>
          )}
        </>
      )}
    </div>
  )
}

function StatusPill({ status }) {
  const map = {
    loading: { text: 'Preparing PDF…', color: 'rgba(255,255,255,0.7)', dot: '#e0b84a' },
    ready:   { text: 'PDF ready',       color: 'rgba(255,255,255,0.85)', dot: '#4ade80' },
    error:   { text: 'Preparation failed', color: '#fca5a5', dot: '#f87171' },
    dirty:   { text: 'Unsaved changes — will save on Download/Share', color: 'rgba(255,255,255,0.7)', dot: '#e0b84a' },
  }
  const info = map[status]
  if (!info) return <div style={{ height: 22, marginBottom: 10 }} />
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      fontSize: 11, color: info.color, marginBottom: 10, height: 22,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: info.dot }} />
      {info.text}
    </div>
  )
}

/* ─── HTML Preview (live form state, mirrors PDF layout) ─── */
const PAGE_WIDTH = 720   // 7.5in × 96dpi

function HTMLPreview({ form, client, site, company }) {
  const companyName = company?.company_name || 'HSX INCORPORATED'
  const { before = [], progress = [], after = [] } = form.photos ?? {}
  const wrapperRef = useRef(null)
  const contentRef = useRef(null)
  const lastKey = useRef('')
  const [layout, setLayout] = useState({ scale: 1, height: 'auto' })

  useEffect(() => {
    function measure() {
      if (!contentRef.current || !wrapperRef.current) return
      const w = wrapperRef.current.clientWidth
      const s = w / PAGE_WIDTH
      const h = contentRef.current.scrollHeight
      const key = `${w}:${h}`
      if (key === lastKey.current) return
      lastKey.current = key
      setLayout({ scale: s, height: h * s })
    }
    measure()
    const imgs = contentRef.current?.querySelectorAll('img') ?? []
    imgs.forEach(img => img.addEventListener('load', measure))
    return () => imgs.forEach(img => img.removeEventListener('load', measure))
  })

  return (
    <div ref={wrapperRef} style={{ position: 'relative', overflow: 'hidden', height: layout.height }}>
      <div ref={contentRef} style={{
        width: PAGE_WIDTH,
        transformOrigin: 'top left',
        transform: `scale(${layout.scale})`,
        padding: '48px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '2px solid var(--line)', paddingBottom: 14, marginBottom: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo_hsx.png"
            alt="HSX" style={{ height: 46, background: '#fff', borderRadius: 6, padding: 3 }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>{companyName} Field Report</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Prepared by {companyName}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>Report Date</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{fmtDate(form.report_date) || '—'}</div>
        </div>
      </div>

      {company && (
        <PreviewSection title="Company Information">
          <TwoColGrid fields={[
            ['Company',          company.company_name],
            ['Primary Contact',  company.contact_name],
            ['Phone',            company.phone],
            ['Email',            company.email],
          ]} />
        </PreviewSection>
      )}

      <PreviewSection title="Client Information">
        <TwoColGrid fields={[
          ['Customer / Property Manager', client?.client_name],
          ['Client Address',              client?.client_address],
          ['Billing Address',             client?.billing_address],
          ['Contact Person',              client?.contact_person],
          ['Phone',                       client?.phone],
          ['Email',                       client?.email],
        ]} />
      </PreviewSection>

      <PreviewSection title="Property Information">
        <TwoColGrid fields={[
          ['Corporation Name',            site?.corporation_name],
          ['Property Address',            site?.job_address],
        ]} />
      </PreviewSection>

      <PreviewSection title="Work Report Information">
        <TwoColGrid fields={[
          ['Report Date',                 fmtDate(form.report_date)],
          ['PO Number',                   form.po_number],
          ['WO Number',                   form.wo_number],
          ['Roof System Type',            form.roofType === 'Other' ? (form.roofTypeOther || 'Other') : form.roofType],
          ['Service Type',                form.serviceType === 'Other' ? (form.serviceTypeOther || 'Other') : form.serviceType],
        ]} />
      </PreviewSection>

      <PreviewSection title="Leak Source">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px 8px' }}>
          {LEAK_SOURCES.map(l => {
            const checked = (form.leakSources ?? []).includes(l)
            return (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0' }}>
                <div style={{
                  width: 13, height: 13, borderRadius: 3, flexShrink: 0,
                  border: checked ? 'none' : '1.5px solid #b0bec5',
                  background: checked ? 'var(--navy)' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {checked && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1, fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: 12, color: checked ? 'var(--navy)' : '#9eaab6', fontWeight: checked ? 700 : 400 }}>{l}</span>
              </div>
            )
          })}
        </div>
      </PreviewSection>

      {form.findings     && <PreviewSection title="Site Conditions / Findings"><BodyText>{form.findings}</BodyText></PreviewSection>}
      {form.workPerformed && <PreviewSection title="Work Performed"><BodyText>{form.workPerformed}</BodyText></PreviewSection>}
      {Array.isArray(form.materials) && form.materials.length > 0 && (
        <PreviewSection title="Materials Used">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 16px' }}>
            {(() => {
              const colHead = { fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }
              const cell = { fontSize: 13, color: 'var(--text)', borderTop: '1px solid #eef1f4', paddingTop: 4 }
              return <>
                <div style={colHead}>Material</div>
                <div style={{ ...colHead, textAlign: 'right' }}>Cost</div>
                {form.materials.map((m, i) => (
                  <>
                    <div key={`n${i}`} style={cell}>{m.name}</div>
                    <div key={`c${i}`} style={{ ...cell, textAlign: 'right' }}>{m.cost ? `$${m.cost}` : '—'}</div>
                  </>
                ))}
              </>
            })()}
          </div>
        </PreviewSection>
      )}
      {form.notes        && <PreviewSection title="Notes / Recommendations"><BodyText>{form.notes}</BodyText></PreviewSection>}

      {(() => {
        const selected = WORK_STATUSES.find(w => w.key === form.workStatus)
        if (!selected) return null
        return (
          <PreviewSection title="Work">
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 3 }}>{selected.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{selected.description}</div>
          </PreviewSection>
        )
      })()}

      {form.total !== '' && Number.isFinite(parseFloat(form.total)) && (
        <PreviewSection title="Total">
          <div style={{ fontSize: 13 }}>
            <span style={{ fontWeight: 700, color: 'var(--navy)' }}>Total: </span>
            <strong>{parseFloat(form.total).toLocaleString('en-US', { style: 'currency', currency: 'CAD' })}</strong>
          </div>
        </PreviewSection>
      )}

      {form.signedBy && (
        <PreviewSection title="Signature" style={{ marginTop: 40 }}>
          <div style={{ fontStyle: 'italic', fontSize: 22, fontFamily: 'Georgia, serif', color: 'var(--navy)' }}>
            {form.signedBy}
          </div>
          <div style={{ borderTop: '1px solid var(--navy)', marginTop: 4, paddingTop: 4, fontSize: 11, color: 'var(--muted)' }}>
            Authorized Signature
          </div>
        </PreviewSection>
      )}

      {before.length > 0   && <PreviewSection title="Before"><PhotoPreviewGrid photos={before} /></PreviewSection>}
      {progress.length > 0 && <PreviewSection title="In Progress"><PhotoPreviewGrid photos={progress} /></PreviewSection>}
      {after.length > 0    && <PreviewSection title="After"><PhotoPreviewGrid photos={after} /></PreviewSection>}
      </div>
    </div>
  )
}

function PreviewSection({ title, children, style }) {
  return (
    <div style={{ marginBottom: 18, ...style }}>
      <div style={{
        fontSize: 11, fontWeight: 800, color: 'var(--navy)',
        borderBottom: '1px solid var(--line)', paddingBottom: 5, marginBottom: 10,
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>{title}</div>
      {children}
    </div>
  )
}

function TwoColGrid({ fields }) {
  const filled = fields.filter(([, v]) => v)
  if (!filled.length) return <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>No information entered.</p>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
      {filled.map(([label, value]) => (
        <div key={label}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>{value}</div>
        </div>
      ))}
    </div>
  )
}

function BodyText({ children }) {
  return <p style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{children}</p>
}

function PhotoPreviewGrid({ photos }) {
  const rows = []
  for (let i = 0; i < photos.length; i += 2) rows.push(photos.slice(i, i + 2))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {row.map((p, pi) => (
            <div key={pi}>
              <div style={{
                width: '100%', height: 380, background: 'var(--bg)',
                overflow: 'hidden', display: 'flex',
                alignItems: 'center', justifyContent: 'center', borderRadius: 3,
              }}>
                <img src={p.url} alt={p.caption || `Photo ${pi + 1}`}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 5, textAlign: 'center', lineHeight: 1.4, minHeight: 30 }}>
                {p.caption || ''}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
