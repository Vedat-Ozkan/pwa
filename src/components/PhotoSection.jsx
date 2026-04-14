import { useState } from 'react'
import imageCompression from 'browser-image-compression'
import { supabase } from '../lib/supabase.js'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const COMPRESSION_OPTS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg',
}

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function SortablePhoto({ photo, index, onRemove, onCaption }) {
  const id = photo.path ?? String(index)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        border: '1px solid var(--line)',
        borderRadius: 10,
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      <div style={{ position: 'relative' }}>
          <img
            src={photo.url}
            alt={photo.caption || `Photo ${index + 1}`}
            style={{ width: '100%', height: 160, objectFit: 'contain', display: 'block', background: '#f1f3f7' }}
            draggable={false}
          />
          {/* Drag handle — small icon only, not the whole image */}
          <div
            {...attributes} {...listeners}
            style={{
              position: 'absolute', bottom: 5, left: 5,
              background: 'rgba(0,0,0,0.4)', color: '#fff',
              borderRadius: 4, padding: '3px 6px', fontSize: 14,
              lineHeight: 1.2, cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
            }}
          >
            ⠿
          </div>
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={() => onRemove(index)}
          style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(0,0,0,0.65)', color: '#fff',
            border: 'none', borderRadius: '50%',
            width: 32, height: 32, fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
          aria-label="Remove photo"
        >
          ×
        </button>
      </div>
      <div style={{ padding: '6px 8px' }}>
        <input
          value={photo.caption}
          onChange={e => onCaption(index, e.target.value)}
          placeholder="Add caption (optional)"
          style={{
            fontSize: 13, padding: '6px 8px',
            border: '1px solid var(--line)', borderRadius: 6,
            width: '100%', background: '#fafbfd',
          }}
        />
      </div>
    </div>
  )
}

export default function PhotoSection({ label, photos, onChange, clientId, reportId }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  const cameraId = `camera-${label}`
  const galleryId = `gallery-${label}`

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  async function handleFiles(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    e.target.value = ''
    setSheetOpen(false)
    setUploading(true)

    const added = []
    for (const file of files) {
      try {
        const compressed = await imageCompression(file, COMPRESSION_OPTS)
        const path = `${clientId}/${reportId}/${label}/${randomId()}.jpg`
        const { error } = await supabase.storage
          .from('report-photos')
          .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })
        if (error) { console.error(error); continue }
        const { data: { publicUrl } } = supabase.storage.from('report-photos').getPublicUrl(path)
        added.push({ url: publicUrl, caption: '', path })
      } catch (err) {
        console.error('Upload error:', err)
      }
    }
    if (added.length) onChange([...photos, ...added])
    setUploading(false)
  }

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = photos.map((p, i) => p.path ?? String(i))
    onChange(arrayMove(photos, ids.indexOf(active.id), ids.indexOf(over.id)))
  }

  function removePhoto(idx) {
    const p = photos[idx]
    if (p.path) supabase.storage.from('report-photos').remove([p.path])
    onChange(photos.filter((_, i) => i !== idx))
  }

  function updateCaption(idx, value) {
    onChange(photos.map((p, i) => i === idx ? { ...p, caption: value } : p))
  }

  const ids = photos.map((p, i) => p.path ?? String(i))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/*
        Hidden inputs stay in the main DOM (not inside the sheet) so they
        survive the sheet closing. Labels in the sheet reference them by id —
        Android treats label→input as a direct gesture and won't block it.
      */}
      <input
        id={cameraId}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFiles}
      />
      <input
        id={galleryId}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFiles}
      />

      {/* Trigger button */}
      <button
        type="button"
        className="btn-secondary"
        style={{ width: '100%' }}
        disabled={uploading}
        onClick={() => setSheetOpen(true)}
      >
        {uploading ? 'Uploading…' : `+ Add ${label} Photos`}
      </button>

      {/* Bottom sheet */}
      {sheetOpen && (
        <div
          onClick={() => setSheetOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              background: '#fff',
              borderRadius: '18px 18px 0 0',
              padding: '12px 16px',
              paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
            }}
          >
            {/* Drag handle pill */}
            <div style={{
              width: 36, height: 4, background: '#d9e0e7',
              borderRadius: 2, margin: '0 auto 20px',
            }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Camera — label directly tied to input, Android-safe */}
              <label
                htmlFor={cameraId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 12,
                  background: 'var(--soft)', cursor: 'pointer',
                  fontSize: 16, fontWeight: 600, color: 'var(--navy)',
                }}
              >
                <span style={{ fontSize: 24 }}>📷</span>
                Take Photo
              </label>

              {/* Gallery */}
              <label
                htmlFor={galleryId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 12,
                  background: 'var(--soft)', cursor: 'pointer',
                  fontSize: 16, fontWeight: 600, color: 'var(--navy)',
                }}
              >
                <span style={{ fontSize: 24 }}>🖼️</span>
                Choose from Gallery
              </label>

              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                style={{
                  padding: '14px', borderRadius: 12, border: 'none',
                  background: 'var(--bg)', color: 'var(--muted)',
                  fontSize: 16, fontWeight: 700, cursor: 'pointer',
                  marginTop: 4,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sortable photo grid */}
      {photos.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToWindowEdges]} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {photos.map((p, i) => (
                <SortablePhoto
                  key={ids[i]}
                  photo={p}
                  index={i}
                  onRemove={removePhoto}
                  onCaption={updateCaption}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
