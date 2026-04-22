import { useState, useEffect } from 'react'
import { useLockBodyScroll } from '../lib/useLockBodyScroll.js'

const EMPTY = {
  company_name: '',
  contact_name: '',
  phone: '',
  email: '',
}

export default function CompanyModal({ initial, onSave, onClose }) {
  useLockBodyScroll()
  const [form, setForm] = useState(initial ?? EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setForm(initial ?? EMPTY) }, [initial])

  const replacer = (_, v) => v === undefined ? null : v
  const isDirty = JSON.stringify(form, replacer) !== JSON.stringify(initial ?? EMPTY, replacer)

  function set(field) {
    return (e) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function handleClose() {
    if (!isDirty || window.confirm('You have unsaved changes. Discard?')) onClose()
  }

  async function handleSave() {
    if (!form.company_name.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="overlay">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Company Information</h2>
        <div className="form-grid" style={{ gap: 14 }}>
          <div className="field">
            <label>Company Name *</label>
            <input value={form.company_name} onChange={set('company_name')} />
          </div>
          <div className="field">
            <label>Primary Contact</label>
            <input value={form.contact_name} onChange={set('contact_name')} />
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={form.phone} onChange={set('phone')} type="tel" />
          </div>
          <div className="field">
            <label>Email</label>
            <input value={form.email} onChange={set('email')} type="email" />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={handleClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={!form.company_name.trim() || saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
