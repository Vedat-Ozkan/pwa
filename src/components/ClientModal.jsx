import { useState, useEffect } from 'react'
import { useLockBodyScroll } from '../lib/useLockBodyScroll.js'

const EMPTY = { name: '', building: '', address: '', billing: '', contact: '', phone: '', email: '' }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function formatPhone(raw) {
  const d = raw.replace(/\D/g, '').slice(0, 10)
  if (d.length === 0) return ''
  if (d.length <= 3) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

function validate(form) {
  const errors = {}
  const digits = form.phone.replace(/\D/g, '')
  if (digits.length > 0 && digits.length < 10)
    errors.phone = 'Invalid phone number'
  if (form.email && !EMAIL_RE.test(form.email.trim()))
    errors.email = 'Invalid email address'
  return errors
}

const errorStyle = { borderColor: 'var(--danger)' }
const errorMsg = { fontSize: 12, color: 'var(--danger)' }

export default function ClientModal({ initial, onSave, onDelete, onClose }) {
  useLockBodyScroll()
  const [form, setForm] = useState(initial ?? EMPTY)
  const [touched, setTouched] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(initial ?? EMPTY)
    setTouched({})
  }, [initial])

  function set(field) {
    return (e) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

const errors = validate(form)
  const hasErrors = Object.keys(errors).length > 0
  const isEdit = !!initial

  async function handleSave() {
    setTouched({ phone: true, email: true })
    if (!form.name.trim() || hasErrors) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="overlay">
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
            <input
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
              type="tel"
              placeholder="(416) 555-0000"
              style={touched.phone && errors.phone ? errorStyle : {}}
            />
            {touched.phone && errors.phone && (
              <span style={errorMsg}>{errors.phone}</span>
            )}
          </div>
          <div className="field">
            <label>Email</label>
            <input
              value={form.email}
              onChange={set('email')}
              type="email"
              placeholder="e.g. contact@company.com"
              style={touched.email && errors.email ? errorStyle : {}}
            />
            {touched.email && errors.email && (
              <span style={errorMsg}>{errors.email}</span>
            )}
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
