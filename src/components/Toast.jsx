import { useState, useCallback, useRef } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const show = useCallback((msg, opts = {}) => {
    const duration = opts.duration ?? 2500
    clearTimeout(timer.current)

    // Wrap onAction so tapping Undo also dismisses the toast immediately
    const onAction = opts.onAction ? () => {
      clearTimeout(timer.current)
      setToast(null)
      opts.onAction()
    } : undefined

    setToast({ msg, actionLabel: opts.actionLabel, onAction, duration })
    timer.current = setTimeout(() => {
      opts.onTimeout?.()
      setToast(null)
    }, duration)
  }, [])

  const dismiss = useCallback(() => {
    clearTimeout(timer.current)
    setToast(null)
  }, [])

  return { toast, show, dismiss }
}

export function Toast({ toast }) {
  if (!toast) return null

  // Undo toasts (with action) span full width; simple toasts stay as a centred pill
  if (toast.actionLabel) {
    return (
      <div className="toast toast-wide">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ flex: 1 }}>{toast.msg}</span>
          <button
            onClick={toast.onAction}
            style={{
              background: 'var(--gold)',
              color: '#1e1a12',
              border: 'none',
              borderRadius: 6,
              padding: '5px 11px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {toast.actionLabel}
          </button>
        </div>
        <div className="toast-bar" style={{ animationDuration: `${toast.duration}ms` }} />
      </div>
    )
  }

  return <div className="toast">{toast.msg}</div>
}
