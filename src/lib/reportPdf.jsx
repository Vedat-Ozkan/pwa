import {
  Document, Page, View, Text, Image, StyleSheet, Font,
} from '@react-pdf/renderer'
import { LEAK_SOURCES } from './constants.js'

const MARGIN = 40
const PAGE_WIDTH = 612
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const NAVY = '#10243e'
const GOLD = '#c8a85d'
const MUTED = '#667487'
const LINE = '#d9e0e7'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1d2733',
    paddingTop: MARGIN,
    paddingBottom: MARGIN,
    paddingLeft: MARGIN,
    paddingRight: MARGIN,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: LINE,
    paddingBottom: 6,
    marginBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 36, height: 36, objectFit: 'contain' },
  headerTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: NAVY },
  headerSub: { fontSize: 8, color: MUTED, marginTop: 2 },
  headerDate: { fontSize: 8, color: MUTED, textAlign: 'right' },
  headerDateVal: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: NAVY, textAlign: 'right', marginTop: 2 },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: MARGIN,
    right: MARGIN,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 6,
  },
  footerText: { fontSize: 8, color: MUTED },
  // Section
  sectionWrap: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingBottom: 4,
    marginBottom: 8,
  },
  // Two-col field grid
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fieldBox: { width: '48%', marginBottom: 6 },
  fieldLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', marginBottom: 2 },
  fieldValue: { fontSize: 10 },
  // Long text
  bodyText: { fontSize: 10, lineHeight: 1.5 },
  // Leak source grid
  leakGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  leakItem: {
    width: '33.33%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
    paddingRight: 6,
  },
  leakBox: {
    width: 10, height: 10,
    borderRadius: 2,
    borderWidth: 1,
  },
  leakBoxChecked: { backgroundColor: NAVY, borderColor: NAVY },
  leakBoxUnchecked: { backgroundColor: '#fff', borderColor: '#b0bec5' },
  leakText: { fontSize: 9, flex: 1 },
  leakTextChecked: { fontFamily: 'Helvetica-Bold', color: NAVY },
  leakTextUnchecked: { color: '#9eaab6' },
  // Signature
  sigName: { fontSize: 18, fontFamily: 'Helvetica-Oblique', color: NAVY, marginTop: 4 },
  sigLine: { borderBottomWidth: 1, borderBottomColor: NAVY, marginTop: 2, marginBottom: 4 },
  // Photo grid — explicit widths, gap as marginRight (gap unreliable in react-pdf)
  photoCaption: { fontSize: 8, color: MUTED, marginTop: 3, textAlign: 'center' },
})

function Header({ client, reportDate }) {
  return (
    <View style={s.header} fixed>
      <View style={s.headerLeft}>
        <Image style={s.logo} src="https://hsxroofing.com/wp-content/uploads/2025/03/logo_hsx.png" />
        <View>
          <Text style={s.headerTitle}>HSX Roofing Field Report</Text>
          <Text style={s.headerSub}>Prepared by HSX Roofing Inc.</Text>
        </View>
      </View>
      <View>
        <Text style={s.headerDate}>Report Date</Text>
        <Text style={s.headerDateVal}>{reportDate || '—'}</Text>
      </View>
    </View>
  )
}

function Footer() {
  return (
    <View style={s.footer} fixed render={({ pageNumber, totalPages }) => (
      <>
        <Text style={s.footerText}>HSX Roofing Inc. — Confidential</Text>
        <Text style={s.footerText}>Page {pageNumber} of {totalPages}</Text>
      </>
    )} />
  )
}

function Section({ title, children }) {
  return (
    <View style={s.sectionWrap}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function FieldGrid({ fields }) {
  return (
    <View style={s.fieldGrid}>
      {fields.filter(f => f.value).map(({ label, value }) => (
        <View key={label} style={s.fieldBox}>
          <Text style={s.fieldLabel}>{label}</Text>
          <Text style={s.fieldValue}>{value}</Text>
        </View>
      ))}
    </View>
  )
}

const PHOTO_GAP = 8
const PHOTO_W = (CONTENT_WIDTH - PHOTO_GAP) / 2   // 262pt
const IMAGE_H = 185                                 // 3 rows fit per page with natural flow (no forced breaks)
const CAPTION_H = 28                                // always-reserved caption space (2 lines @ 8pt)

// Build rows per-section so photos from different sections never share a row
function buildPhotoRows(before, progress, after) {
  const sections = [
    { name: 'Before Photos', photos: before },
    { name: 'Progress Photos', photos: progress },
    { name: 'After Photos', photos: after },
  ]
  const rows = []
  for (const { name, photos } of sections) {
    for (let i = 0; i < photos.length; i += 2) {
      rows.push({ photos: photos.slice(i, i + 2), sectionTitle: i === 0 ? name : null })
    }
  }
  return rows
}

export function ReportDocument({ form, client }) {
  const { before = [], progress = [], after = [] } = form.photos ?? {}
  const photoRows = buildPhotoRows(before, progress, after)

  const projectFields = [
    { label: 'Job Name', value: form.job_name },
    { label: 'Report Date', value: form.report_date },
    { label: 'Customer / Property Manager', value: client?.name },
    { label: 'Building Name', value: client?.building },
    { label: 'Job Address', value: client?.address },
    { label: 'Billing Address', value: client?.billing },
    { label: 'Contact Person', value: client?.contact },
    { label: 'Phone', value: client?.phone },
    { label: 'Email', value: client?.email },
    { label: 'Supervisor', value: form.supervisor },
    { label: 'PO Number', value: form.po_number },
    { label: 'WO Number', value: form.wo_number },
  ]

  return (
    <Document title={`HSX Report — ${form.job_name || 'Untitled'}`} author="HSX Roofing Inc.">
      <Page size="LETTER" style={s.page}>
        <Header client={client} reportDate={form.report_date} />

        {/* Project Information */}
        <Section title="Project Information">
          <FieldGrid fields={projectFields} />
        </Section>

        {/* Leak Source — all options, checked/unchecked */}
        <Section title="Leak Source">
          <View style={s.leakGrid}>
            {LEAK_SOURCES.map(l => {
              const checked = (form.leakSources ?? []).includes(l)
              return (
                <View key={l} style={s.leakItem}>
                  <View style={[s.leakBox, checked ? s.leakBoxChecked : s.leakBoxUnchecked]} />
                  <Text style={[s.leakText, checked ? s.leakTextChecked : s.leakTextUnchecked]}>
                    {l}
                  </Text>
                </View>
              )
            })}
          </View>
        </Section>

        {/* Work Description */}
        {form.findings ? (
          <Section title="Site Conditions / Findings">
            <Text style={s.bodyText}>{form.findings}</Text>
          </Section>
        ) : null}

        {form.workPerformed ? (
          <Section title="Work Performed">
            <Text style={s.bodyText}>{form.workPerformed}</Text>
          </Section>
        ) : null}

        {form.materials ? (
          <Section title="Materials Used">
            <Text style={s.bodyText}>{form.materials}</Text>
          </Section>
        ) : null}

        {form.notes ? (
          <Section title="Notes / Recommendations">
            <Text style={s.bodyText}>{form.notes}</Text>
          </Section>
        ) : null}

        {/* Photos — 2 per row, no forced breaks.
            IMAGE_H=185 means 3 rows fit per page naturally (701pt / 712pt usable).
            wrap={false} keeps each row atomic; react-pdf handles overflow. */}
        {photoRows.map((row, ri) => {
          return (
            <View key={ri} wrap={false}>
              {row.sectionTitle && (
                <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 5, marginTop: ri === 0 ? 0 : 4 }}>
                  {row.sectionTitle}
                </Text>
              )}
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                {row.photos.map((p, pi) => (
                  <View key={pi} style={{ width: PHOTO_W, marginRight: pi === 0 ? PHOTO_GAP : 0 }}>
                    <View style={{ width: PHOTO_W, height: IMAGE_H, backgroundColor: '#f4f6f8' }}>
                      <Image style={{ width: PHOTO_W, height: IMAGE_H, objectFit: 'contain' }} src={p.url} />
                    </View>
                    <View style={{ height: CAPTION_H, paddingHorizontal: 2, paddingTop: 3 }}>
                      {p.caption ? <Text style={s.photoCaption}>{p.caption}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )
        })}

        {/* Signature */}
        {form.signedBy && (
          <Section title="Signature">
            <Text style={s.sigName}>{form.signedBy}</Text>
            <View style={s.sigLine} />
            <Text style={{ fontSize: 8, color: MUTED }}>Authorized Signature</Text>
          </Section>
        )}
      </Page>
    </Document>
  )
}
