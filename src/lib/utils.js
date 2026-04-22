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

export function deleteWithUndo({ item, setItems, table, label, show }) {
  setItems(xs => xs.filter(x => x.id !== item.id))
  let undone = false
  show(label, {
    actionLabel: 'Undo',
    duration: 5000,
    onAction: () => { undone = true; setItems(xs => [item, ...xs]) },
    onTimeout: async () => { if (!undone) await supabase.from(table).delete().eq('id', item.id) },
  })
}
