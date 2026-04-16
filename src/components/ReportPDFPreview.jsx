import { useState, useRef, useEffect } from 'react'
import { LEAK_SOURCES } from '../lib/constants.js'

export default function ReportPDFPreview({ form, client, site, reportId, isNew }) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  async function generate(action) {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      })

      if (!res.ok) throw new Error(`Server error ${res.status}`)

      const blob = await res.blob()
      const filename = `HSX-Report-${form.report_date || 'draft'}.pdf`

      if (action === 'share') {
        const file = new File([blob], filename, { type: 'application/pdf' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: filename })
        } else {
          window.open(URL.createObjectURL(blob), '_blank')
        }
      } else {
        const url = URL.createObjectURL(blob)
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
        if (isIOS) {
          window.open(url, '_blank')
        } else {
          const a = document.createElement('a')
          a.href = url
          a.download = filename
          a.click()
        }
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error('PDF error:', err)
        setError('Failed to generate PDF. Try again.')
      }
    }
    setGenerating(false)
  }

  return (
    <div>
      {/* HTML preview — live form state */}
      <div style={{
        border: '1px solid var(--line)', borderRadius: 12,
        background: '#fff', overflow: 'hidden', marginBottom: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}>
        <HTMLPreview form={form} client={client} site={site} />
      </div>

      {isNew ? (
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
          Save the report first to download or share the PDF.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 10 }}>
            PDF reflects the last saved version — save before generating to include latest changes.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => generate('download')}
              disabled={generating}
              style={{
                flex: 1, background: '#2860b8', color: '#fff', border: 'none',
                borderRadius: 12, padding: '13px 16px', fontSize: 15, fontWeight: 700,
                cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1,
              }}
            >
              {generating ? 'Generating…' : '↓ Download'}
            </button>
            <button
              type="button"
              onClick={() => generate('share')}
              disabled={generating}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                background: '#1a7d35', color: '#fff', border: 'none',
                borderRadius: 12, padding: '13px 16px', fontSize: 15, fontWeight: 700,
                cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1,
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              {generating ? 'Generating…' : 'Share'}
            </button>
          </div>
          {error && (
            <p style={{ fontSize: 12, color: '#f87171', textAlign: 'center', marginTop: 8 }}>{error}</p>
          )}
        </>
      )}
    </div>
  )
}

/* ─── HTML Preview (live form state, mirrors PDF layout) ─── */
const PAGE_WIDTH = 720   // 7.5in × 96dpi
const PAGE_HEIGHT = 960  // 10in × 96dpi

function HTMLPreview({ form, client, site }) {
  const { before = [], progress = [], after = [] } = form.photos ?? {}
  const wrapperRef = useRef(null)
  const contentRef = useRef(null)
  const lastKey = useRef('')
  const [layout, setLayout] = useState({ scale: 1, height: 'auto', breaks: [] })

  useEffect(() => {
    function measure() {
      if (!contentRef.current || !wrapperRef.current) return
      const w = wrapperRef.current.clientWidth
      const s = w / PAGE_WIDTH
      const h = contentRef.current.scrollHeight
      const key = `${w}:${h}`
      if (key === lastKey.current) return
      lastKey.current = key
      const breaks = []
      for (let y = PAGE_HEIGHT; y < h; y += PAGE_HEIGHT) breaks.push(y * s)
      setLayout({ scale: s, height: h * s, breaks })
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
        padding: '24px 28px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '2px solid #d9e0e7', paddingBottom: 14, marginBottom: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo_hsx.png"
            alt="HSX" style={{ height: 46, background: '#fff', borderRadius: 6, padding: 3 }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#10243e' }}>HSX Roofing Field Report</div>
            <div style={{ fontSize: 11, color: '#667487', marginTop: 2 }}>Prepared by HSX Roofing Inc.</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#667487' }}>Report Date</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#10243e' }}>{form.report_date || '—'}</div>
        </div>
      </div>

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

      <PreviewSection title="Project Information">
        <TwoColGrid fields={[
          ['Job Site Address',            site?.job_address],
          ['Supervisor',                  form.supervisor],
          ['PO Number',                   form.po_number],
          ['WO Number',                   form.wo_number],
          ['Roof System Type',            form.roofType],
          ['Service Type',                form.serviceType],
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
                  background: checked ? '#10243e' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {checked && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1, fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: 12, color: checked ? '#10243e' : '#9eaab6', fontWeight: checked ? 700 : 400 }}>{l}</span>
              </div>
            )
          })}
        </div>
      </PreviewSection>

      {form.findings     && <PreviewSection title="Site Conditions / Findings"><BodyText>{form.findings}</BodyText></PreviewSection>}
      {form.workPerformed && <PreviewSection title="Work Performed"><BodyText>{form.workPerformed}</BodyText></PreviewSection>}
      {form.materials    && <PreviewSection title="Materials Used"><BodyText>{form.materials}</BodyText></PreviewSection>}
      {form.notes        && <PreviewSection title="Notes / Recommendations"><BodyText>{form.notes}</BodyText></PreviewSection>}

      {before.length > 0   && <PreviewSection title="Before Photos"><PhotoPreviewGrid photos={before} /></PreviewSection>}
      {progress.length > 0 && <PreviewSection title="Progress Photos"><PhotoPreviewGrid photos={progress} /></PreviewSection>}
      {after.length > 0    && <PreviewSection title="After Photos"><PhotoPreviewGrid photos={after} /></PreviewSection>}

      {form.total !== '' && Number.isFinite(parseFloat(form.total)) && (
        <PreviewSection title="Total">
          <div style={{ fontSize: 13 }}>
            <span style={{ fontWeight: 700, color: '#10243e' }}>Total: </span>
            {parseFloat(form.total).toLocaleString('en-US', { style: 'currency', currency: 'CAD' })}
          </div>
        </PreviewSection>
      )}

      {form.signedBy && (
        <PreviewSection title="Signature">
          <div style={{ fontStyle: 'italic', fontSize: 22, fontFamily: 'Georgia, serif', color: '#10243e' }}>
            {form.signedBy}
          </div>
          <div style={{ borderTop: '1px solid #10243e', marginTop: 4, paddingTop: 4, fontSize: 11, color: '#667487' }}>
            Authorized Signature
          </div>
        </PreviewSection>
      )}
      </div>
      {layout.breaks.map((y, i) => (
        <div key={i} style={{
          position: 'absolute', left: 0, right: 0, top: y,
          borderTop: '2px solid #000',
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '2px 8px',
        }}>
          <span style={{ fontSize: 9, color: '#000', fontWeight: 700, opacity: 0.5 }}>
            Page {i + 2}
          </span>
        </div>
      ))}
    </div>
  )
}

function PreviewSection({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 11, fontWeight: 800, color: '#10243e',
        borderBottom: '1px solid #d9e0e7', paddingBottom: 5, marginBottom: 10,
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>{title}</div>
      {children}
    </div>
  )
}

function TwoColGrid({ fields }) {
  const filled = fields.filter(([, v]) => v)
  if (!filled.length) return <p style={{ margin: 0, fontSize: 13, color: '#667487' }}>No information entered.</p>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
      {filled.map(([label, value]) => (
        <div key={label}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#667487', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 13, color: '#1d2733' }}>{value}</div>
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
                width: '100%', height: 380, background: '#f4f6f8',
                overflow: 'hidden', display: 'flex',
                alignItems: 'center', justifyContent: 'center', borderRadius: 3,
              }}>
                <img src={p.url} alt={p.caption || `Photo ${pi + 1}`}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
              </div>
              <div style={{ fontSize: 10, color: '#667487', marginTop: 5, textAlign: 'center', lineHeight: 1.4, minHeight: 30 }}>
                {p.caption || ''}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
