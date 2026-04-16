const NAVY = '#10243e'
const GOLD = '#c8a85d'
const MUTED = '#667487'
const LINE = '#d9e0e7'
const SOFT = '#f4f6f8'

const LEAK_SOURCES = [
  'Drain', 'Vent Pipe', 'Tall Cone', 'Scupper', 'Pitch Pan', 'Field Membrane',
  'HVAC Unit', 'Duct Work', 'Rain Collar', 'Expansion Joint', 'Skylight',
  'Metal Flashing', 'Plumbing Vent', 'Curbs', 'Perimeter Flashing',
  'Window', 'Inside Corner', 'Outside Corner', 'Other',
]

function esc(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${m}/${day}/${y}`
}

// ── CSS ─────────────────────────────────────────────────────────────────────

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 10px;
    color: #1d2733;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Header ── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid ${LINE};
    padding-bottom: 10px;
    margin-bottom: 18px;
  }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .header-logo { height: 38px; object-fit: contain; }
  .header-title { font-size: 14px; font-weight: 800; color: ${NAVY}; }
  .header-sub { font-size: 8px; color: ${MUTED}; margin-top: 2px; }
  .header-right { text-align: right; }
  .header-date-label { font-size: 8px; color: ${MUTED}; }
  .header-date-val { font-size: 11px; font-weight: 700; color: ${NAVY}; margin-top: 2px; }

  /* ── Sections ── */
  .section { margin-bottom: 14px; }
  .section-title {
    font-size: 8.5px;
    font-weight: 800;
    color: ${NAVY};
    text-transform: uppercase;
    letter-spacing: 0.07em;
    border-bottom: 1px solid ${LINE};
    padding-bottom: 4px;
    margin-bottom: 9px;
    break-after: avoid;
  }

  /* ── Field grid ── */
  .field-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px 24px;
  }
  .field { break-inside: avoid; }
  .field-label {
    font-size: 7px;
    font-weight: 700;
    color: ${MUTED};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 1px;
  }
  .field-value { font-size: 10px; }

  /* ── Leak source ── */
  .leak-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 3px 0;
  }
  .leak-item {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 2px 4px 2px 0;
  }
  .leak-box {
    width: 9px;
    height: 9px;
    border-radius: 2px;
    flex-shrink: 0;
    border: 1px solid #b0bec5;
    background: #fff;
  }
  .leak-box.checked { background: ${NAVY}; border-color: ${NAVY}; }
  .leak-label { font-size: 8.5px; }
  .leak-label.checked { font-weight: 700; color: ${NAVY}; }
  .leak-label.unchecked { color: #9eaab6; }

  /* ── Body text ── */
  .body-text { font-size: 10px; line-height: 1.6; white-space: pre-wrap; }

  /* ── Photo sections — 2 columns × 2 rows per page ── */
  .photo-group { margin-bottom: 10px; }
  .photo-group-title {
    font-size: 10px;
    font-weight: 700;
    color: ${NAVY};
    margin-bottom: 8px;
    break-after: avoid;
  }
  .photo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .photo-cell { break-inside: avoid; }
  .photo-wrap {
    width: 100%;
    height: 380px;
    background: ${SOFT};
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
  }
  .photo-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
  }
  .photo-caption {
    font-size: 10px;
    color: ${MUTED};
    text-align: center;
    margin-top: 5px;
    line-height: 1.4;
    min-height: 30px;
  }

  /* ── Total ── */
  .total-section { break-inside: avoid; }
  .total-line { font-size: 10px; }
  .total-label { font-weight: 700; color: ${NAVY}; }

  /* ── Signature ── */
  .sig-section { break-inside: avoid; }
  .sig-name {
    font-size: 22px;
    font-style: italic;
    font-family: Georgia, 'Times New Roman', serif;
    color: ${NAVY};
    margin: 5px 0 3px;
  }
  .sig-line { border-bottom: 1px solid ${NAVY}; margin-bottom: 4px; }
  .sig-label { font-size: 7.5px; color: ${MUTED}; }
`

// ── Section builders ─────────────────────────────────────────────────────────

function header(report, client, logoSrc) {
  return `
    <div class="header">
      <div class="header-left">
        <img class="header-logo"
          src="${logoSrc}"
          alt="HSX Roofing" />
        <div>
          <div class="header-title">HSX Roofing Field Report</div>
          <div class="header-sub">Prepared by HSX Roofing Inc.</div>
        </div>
      </div>
      <div class="header-right">
        <div class="header-date-label">Report Date</div>
        <div class="header-date-val">${esc(formatDate(report.report_date))}</div>
      </div>
    </div>
  `
}

function fieldGrid(fields) {
  const filled = fields.filter(([, v]) => v)
  if (!filled.length) return `<p style="font-size:9px;color:${MUTED}">No information provided.</p>`
  return `<div class="field-grid">
    ${filled.map(([label, value]) => `
      <div class="field">
        <div class="field-label">${esc(label)}</div>
        <div class="field-value">${esc(value)}</div>
      </div>
    `).join('')}
  </div>`
}

function clientSection(client) {
  return `
    <div class="section">
      <div class="section-title">Client Information</div>
      ${fieldGrid([
        ['Customer / Property Manager', client?.client_name],
        ['Client Address',              client?.client_address],
        ['Billing Address',             client?.billing_address],
        ['Contact Person',              client?.contact_person],
        ['Phone',                       client?.phone],
        ['Email',                       client?.email],
      ])}
    </div>
  `
}

function projectSection(report, site) {
  return `
    <div class="section">
      <div class="section-title">Project Information</div>
      ${fieldGrid([
        ['Job Site Address',            site?.job_address],
        ['Report Date',                 formatDate(report.report_date)],
        ['Supervisor',                  report.supervisor],
        ['PO Number',                   report.po_number],
        ['WO Number',                   report.wo_number],
        ['Roof System Type',            report.data?.roofType],
        ['Service Type',                report.data?.serviceType],
      ])}
    </div>
  `
}

function leakSection(leakSources) {
  return `
    <div class="section">
      <div class="section-title">Leak Source</div>
      <div class="leak-grid">
        ${LEAK_SOURCES.map(l => {
          const checked = (leakSources ?? []).includes(l)
          return `<div class="leak-item">
            <div class="leak-box ${checked ? 'checked' : ''}"></div>
            <span class="leak-label ${checked ? 'checked' : 'unchecked'}">${esc(l)}</span>
          </div>`
        }).join('')}
      </div>
    </div>
  `
}

function textSection(title, content) {
  if (!content?.trim()) return ''
  return `
    <div class="section">
      <div class="section-title">${esc(title)}</div>
      <div class="body-text">${esc(content)}</div>
    </div>
  `
}

function photoGroup(title, photos) {
  if (!photos?.length) return ''
  return `
    <div class="photo-group">
      <div class="photo-group-title">${esc(title)}</div>
      <div class="photo-grid">
        ${photos.map(p => `
          <div class="photo-cell">
            <div class="photo-wrap">
              <img class="photo-img" src="${esc(p.url)}" alt="${esc(p.caption || '')}" />
            </div>
            <div class="photo-caption">${esc(p.caption || '')}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `
}

function photosSection(photos) {
  const { before = [], progress = [], after = [] } = photos ?? {}
  if (!before.length && !progress.length && !after.length) return ''
  return `
    <div class="section">
      <div class="section-title">Photo Documentation</div>
      ${photoGroup('Before Photos', before)}
      ${photoGroup('Progress Photos', progress)}
      ${photoGroup('After Photos', after)}
    </div>
  `
}

function totalSection(total) {
  const num = parseFloat(total)
  if (!Number.isFinite(num)) return ''
  const formatted = num.toLocaleString('en-US', { style: 'currency', currency: 'CAD' })
  return `
    <div class="section total-section">
      <div class="section-title">Total</div>
      <div class="total-line"><span class="total-label">Total:</span> ${esc(formatted)}</div>
    </div>
  `
}

function signatureSection(signedBy) {
  if (!signedBy?.trim()) return ''
  return `
    <div class="section sig-section">
      <div class="section-title">Signature</div>
      <div class="sig-name">${esc(signedBy)}</div>
      <div class="sig-line"></div>
      <div class="sig-label">Authorized Signature</div>
    </div>
  `
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generateReportHTML(report, client, site, logoSrc) {
  const d = report.data ?? {}

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap"
    rel="stylesheet"
  />
  <style>${CSS}</style>
</head>
<body>
  ${header(report, client, logoSrc)}
  ${clientSection(client)}
  ${projectSection(report, site)}
  ${leakSection(d.leakSources)}
  ${textSection('Site Conditions / Findings', d.findings)}
  ${textSection('Work Performed', d.workPerformed)}
  ${textSection('Materials Used', d.materials)}
  ${textSection('Notes / Recommendations', d.notes)}
  ${photosSection(d.photos)}
  ${totalSection(d.total)}
  ${signatureSection(d.signedBy)}
</body>
</html>`
}
