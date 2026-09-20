import { supabase } from './supabase.js'

export function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${m}-${d}-${y}`
}

export function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  // Fallback for older Android WebViews that lack crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

export async function deleteReportFiles(report) {
  const groups = report.data?.photos ?? {}
  const photoPaths = [...(groups.before ?? []), ...(groups.progress ?? []), ...(groups.after ?? [])]
    .map(p => p.path)
    .filter(Boolean)
  if (photoPaths.length) {
    const { error } = await supabase.storage.from('report-photos').remove(photoPaths)
    if (error) console.error('Failed to remove report photos:', error.message)
  }
  if (report.pdf_path && report.pdf_storage !== 'r2') {
    const { error } = await supabase.storage.from('report-pdfs').remove([report.pdf_path])
    if (error) console.error('Failed to remove report pdf:', error.message)
  }
}

// Supabase files are removed before a cascading row delete. Private R2 PDFs
// are swept by the server cleanup job after their report row disappears.
export function deleteWithUndo({ item, setItems, table, label, show, cleanupFiles }) {
  setItems(xs => xs.filter(x => x.id !== item.id))
  let undone = false
  show(label, {
    actionLabel: 'Undo',
    duration: 5000,
    onAction: () => { undone = true; setItems(xs => [item, ...xs]) },
    onTimeout: async () => {
      if (undone) return
      await cleanupFiles?.()
      await supabase.from(table).delete().eq('id', item.id)
    },
  })
}
