import {
  Document, Page, View, Text, Image, StyleSheet, Font,
} from '@react-pdf/renderer'
import { LEAK_SOURCES } from './constants.js'

const MARGIN = 40
const PAGE_WIDTH = 612
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const MAX_IMG_HEIGHT = 200
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
    paddingBottom: MARGIN + 20,
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
    paddingBottom: 10,
    marginBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 52, height: 52, objectFit: 'contain' },
  headerTitle: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: NAVY },
  headerSub: { fontSize: 9, color: MUTED, marginTop: 2 },
  headerDate: { fontSize: 9, color: MUTED, textAlign: 'right' },
  headerDateVal: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY, textAlign: 'right', marginTop: 2 },
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
  // Photo grid
  photoRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  photoWrap: { flex: 1 },
  photoImg: { width: '100%', objectFit: 'contain', borderRadius: 4 },
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

function PhotoGrid({ photos }) {
  if (!photos.length) return null

  // Build rows: pairs of photos
  const rows = []
  for (let i = 0; i < photos.length; i += 2) {
    rows.push(photos.slice(i, i + 2))
  }

  // If single photo, show full width (no pair)
  return (
    <View>
      {photos.length === 1 ? (
        <View style={{ marginBottom: 8 }}>
          <Image
            style={[s.photoImg, { maxHeight: MAX_IMG_HEIGHT }]}
            src={photos[0].url}
          />
          {photos[0].caption ? (
            <Text style={s.photoCaption}>{photos[0].caption}</Text>
          ) : null}
        </View>
      ) : (
        rows.map((row, ri) => (
          <View key={ri} style={s.photoRow}>
            {row.map((p, pi) => (
              <View key={pi} style={s.photoWrap}>
                <Image
                  style={[s.photoImg, { height: MAX_IMG_HEIGHT }]}
                  src={p.url}
                />
                {p.caption ? <Text style={s.photoCaption}>{p.caption}</Text> : null}
              </View>
            ))}
            {/* Fill empty slot if odd number in last row */}
            {row.length === 1 && <View style={s.photoWrap} />}
          </View>
        ))
      )}
    </View>
  )
}

export function ReportDocument({ form, client }) {
  const { before = [], progress = [], after = [] } = form.photos ?? {}

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
        <Footer />

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

        {/* Photos */}
        {before.length > 0 && (
          <Section title="Before Photos">
            <PhotoGrid photos={before} />
          </Section>
        )}

        {progress.length > 0 && (
          <Section title="Progress Photos">
            <PhotoGrid photos={progress} />
          </Section>
        )}

        {after.length > 0 && (
          <Section title="After Photos">
            <PhotoGrid photos={after} />
          </Section>
        )}

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
