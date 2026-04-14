import { useState, useEffect } from 'react'

const EMPTY = { name: '', building: '', address: '', billing: '', contact: '', phone: '', email: '' }

export default function ClientModal({ initial, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(initial ?? EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(initial ?? EMPTY)
  }, [initial])

  function set(field) {
    return (e) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  const isEdit = !!initial

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">{isEdit ? 'Edit Client' : 'New Client'}</h2>

        <div className="form-grid" style={{ gap: 14 }}>
          <div className="field">
            <label>Client / Property Manager Name *</label>
            <input value={form.name} onChange={set('name')} placeholder="e.g. Milestone Property Management" />
          </div>
          <div className="field">
            <label>Building Name</label>
            <input value={form.building} onChange={set('building')} placeholder="e.g. Markham Gate Investments" />
          </div>
          <div className="field">
            <label>Job Site Address</label>
            <input value={form.address} onChange={set('address')} placeholder="Street address" />
          </div>
          <div className="field">
            <label>Billing Address</label>
            <input value={form.billing} onChange={set('billing')} placeholder="Billing address" />
          </div>
          <div className="field">
            <label>Contact Person</label>
            <input value={form.contact} onChange={set('contact')} placeholder="Contact name" />
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={form.phone} onChange={set('phone')} type="tel" placeholder="Phone number" />
          </div>
          <div className="field">
            <label>Email</label>
            <input value={form.email} onChange={set('email')} type="email" placeholder="Email address" />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          {isEdit && onDelete && (
            <button className="btn-danger" onClick={onDelete}>Delete</button>
          )}
          <button className="btn-primary" onClick={handleSave} disabled={!form.name.trim() || saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
