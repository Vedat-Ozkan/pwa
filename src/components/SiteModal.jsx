import { useState, useEffect } from 'react'
import { useLockBodyScroll } from '../lib/useLockBodyScroll.js'

export default function SiteModal({ initial, onSave, onDelete, onClose }) {
  useLockBodyScroll()
  const [address, setAddress] = useState(initial?.job_address ?? '')
  const [saving, setSaving] = useState(false)
  const isEdit = !!initial
  const isDirty = address !== (initial?.job_address ?? '')

  useEffect(() => { setAddress(initial?.job_address ?? '') }, [initial])

  function handleClose() {
    if (!isDirty || window.confirm('You have unsaved changes. Discard?')) onClose()
  }

  async function handleSave() {
    if (!address.trim()) return
    setSaving(true)
    await onSave({ job_address: address })
    setSaving(false)
  }

  return (
    <div className="overlay">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">{isEdit ? 'Edit Site' : 'New Job Site'}</h2>
        <div className="form-grid" style={{ gap: 14 }}>
          <div className="field">
            <label>Job Site Address *</label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Street address"
            />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={handleClose}>Cancel</button>
          {isEdit && onDelete && <button className="btn-danger" onClick={onDelete}>Delete</button>}
          <button className="btn-primary" onClick={handleSave} disabled={!address.trim() || saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
