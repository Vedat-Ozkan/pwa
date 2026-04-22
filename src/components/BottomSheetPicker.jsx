import { useRef, useState, useEffect } from 'react'
import { useLockBodyScroll } from '../lib/useLockBodyScroll.js'

export default function BottomSheetPicker({ options, value, onChange, placeholder = 'Select one' }) {
  const [open, setOpen] = useState(false)
  const sheetRef = useRef(null)
  const touchStartY = useRef(0)
  const dragY = useRef(0)
  useLockBodyScroll(open)

  useEffect(() => {
    if (open && sheetRef.current) {
      sheetRef.current.style.transform = ''
      sheetRef.current.style.transition = ''
    }
  }, [open])

  function onSwipeStart(e) {
    touchStartY.current = e.touches[0].clientY
    dragY.current = 0
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
  }
  function onSwipeMove(e) {
    const dy = Math.max(0, e.touches[0].clientY - touchStartY.current)
    dragY.current = dy
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${dy}px)`
  }
  function onSwipeEnd() {
    if (dragY.current > 80) {
      setOpen(false)
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.25s ease'
        sheetRef.current.style.transform = 'translateY(0)'
      }
    }
    dragY.current = 0
  }

  function select(opt) {
    onChange(opt)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: '100%', padding: '12px 14px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--line)',
          background: '#fff',
          color: value ? 'var(--text)' : '#adb5bd',
          fontSize: 16, fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', textAlign: 'left', minHeight: 48,
        }}
      >
        <span>{value || placeholder}</span>
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
          <path d="M1 1.5l5 5 5-5" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'flex-end',
          }}
          onClick={() => setOpen(false)}
        >
          <div
            ref={sheetRef}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', background: '#fff',
              borderRadius: '20px 20px 0 0',
              paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
              maxHeight: '70svh', display: 'flex', flexDirection: 'column',
            }}
          >
            <div
              onTouchStart={onSwipeStart}
              onTouchMove={onSwipeMove}
              onTouchEnd={onSwipeEnd}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '14px 16px 8px', flexShrink: 0, touchAction: 'none',
              }}
            >
              <div style={{ width: 36, height: 4, background: 'var(--line)', borderRadius: 2 }} />
            </div>

            <div style={{ overflowY: 'auto', padding: '0 8px' }}>
              {value && (
                <button
                  type="button"
                  onClick={() => select('')}
                  style={{
                    width: '100%', padding: '14px 12px',
                    background: 'transparent', border: 'none', borderRadius: 12,
                    fontSize: 15, fontFamily: 'inherit',
                    color: 'var(--muted)', cursor: 'pointer',
                    justifyContent: 'flex-start',
                  }}
                >
                  Clear selection
                </button>
              )}
              {options.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => select(opt)}
                  style={{
                    width: '100%', padding: '14px 12px',
                    background: opt === value ? 'var(--soft)' : 'transparent',
                    border: 'none', borderRadius: 12,
                    fontSize: 16, fontFamily: 'inherit',
                    color: opt === value ? 'var(--navy)' : 'var(--text)',
                    fontWeight: opt === value ? 700 : 400,
                    cursor: 'pointer', justifyContent: 'flex-start',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
