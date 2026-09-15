import { useState, useRef } from 'react'
import imageCompression from 'browser-image-compression'
import { supabase } from '../lib/supabase.js'
import { useLockBodyScroll } from '../lib/useLockBodyScroll.js'
import { randomId } from '../lib/utils.js'
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

// 800px matches the width generate-pdf.js renders photos at (PHOTO_WIDTH) —
// uploading any larger just means every PDF regen and editor thumbnail
// re-fetches bytes that get thrown away at render time.
const COMPRESSION_OPTS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 800,
  useWebWorker: true,
  fileType: 'image/jpeg',
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
          {photo.purged ? (
            <div style={{
              width: '100%', height: 160, display: 'flex', alignItems: 'center',
              justifyContent: 'center', textAlign: 'center', padding: 12,
              fontSize: 12, color: '#94a3b8', background: '#f1f3f7',
            }}>
              Image removed after 3 weeks — still in the PDF
            </div>
          ) : (
            <img
              src={photo.url}
              alt={photo.caption || `Photo ${index + 1}`}
              style={{ width: '100%', height: 160, objectFit: 'contain', display: 'block', background: '#f1f3f7' }}
              draggable={false}
            />
          )}
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

export default function PhotoSection({ label, displayLabel, photos, onChange, clientId, reportId, onError }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  useLockBodyScroll(sheetOpen)
  const sheetRef = useRef(null)
  const touchStartY = useRef(0)
  const currentDragY = useRef(0)

  function onSwipeStart(e) {
    touchStartY.current = e.touches[0].clientY
    currentDragY.current = 0
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
  }
  function onSwipeMove(e) {
    const dy = Math.max(0, e.touches[0].clientY - touchStartY.current)
    currentDragY.current = dy
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${dy}px)`
  }
  function onSwipeEnd() {
    if (currentDragY.current > 80) {
      setSheetOpen(false)
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.25s ease'
        sheetRef.current.style.transform = 'translateY(0)'
      }
    }
    currentDragY.current = 0
  }

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

    const results = await Promise.allSettled(files.map(async (file) => {
      const compressed = await imageCompression(file, COMPRESSION_OPTS)
      const path = `${clientId}/${reportId}/${label}/${randomId()}.jpg`
      const { error } = await supabase.storage
        .from('report-photos')
        .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('report-photos').getPublicUrl(path)
      return { url: publicUrl, caption: '', path }
    }))

    const added = results.filter(r => r.status === 'fulfilled').map(r => r.value)
    const failed = results.filter(r => r.status === 'rejected')
    if (failed.length) failed.forEach(r => console.error('Upload error:', r.reason))
    if (added.length) onChange([...photos, ...added])
    if (failed.length) onError?.(`${failed.length} photo${failed.length > 1 ? 's' : ''} failed to upload — check your connection.`)
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
        {uploading ? 'Uploading…' : `+ Add ${displayLabel ?? label} Photos`}
      </button>

      {/* Bottom sheet */}
      {sheetOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div
            ref={sheetRef}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              background: '#fff',
              borderRadius: '20px 20px 0 0',
              paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
            }}
          >
            {/* Header: X left, drag pill centre — touch area for swipe-to-close */}
            <div
              onTouchStart={onSwipeStart}
              onTouchMove={onSwipeMove}
              onTouchEnd={onSwipeEnd}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '14px 16px 16px',
                touchAction: 'none',
              }}
            >
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                style={{
                  position: 'absolute', left: 16,
                  background: 'none', border: 'none',
                  padding: 4, cursor: 'pointer',
                  color: '#94a3b8', display: 'flex',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              <div style={{ width: 36, height: 4, background: '#d9e0e7', borderRadius: 2 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px' }}>
              {/* Camera */}
              <label
                htmlFor={cameraId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '15px 16px', borderRadius: 14,
                  background: 'var(--soft)', cursor: 'pointer',
                  fontSize: 16, fontWeight: 600, color: 'var(--navy)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                Take Photo
              </label>

              {/* Gallery */}
              <label
                htmlFor={galleryId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '15px 16px', borderRadius: 14,
                  background: 'var(--soft)', cursor: 'pointer',
                  fontSize: 16, fontWeight: 600, color: 'var(--navy)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                Choose from Gallery
              </label>
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
