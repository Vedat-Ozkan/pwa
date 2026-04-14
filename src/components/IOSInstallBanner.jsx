import { useState, useEffect } from 'react'

export default function IOSInstallBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isStandalone = window.navigator.standalone === true
    const dismissed = localStorage.getItem('ios-banner-dismissed')
    setShow(isIOS && !isStandalone && !dismissed)
  }, [])

  function dismiss() {
    localStorage.setItem('ios-banner-dismissed', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#10243e',
      color: '#fff', zIndex: 300,
      padding: '14px 16px',
      paddingBottom: 'calc(14px + env(safe-area-inset-bottom))',
      display: 'flex', alignItems: 'center', gap: 12,
      fontSize: 14,
    }}>
      <span style={{ flex: 1 }}>
        Install HSX Reports: tap <strong>Share</strong> then <strong>Add to Home Screen</strong>
      </span>
      <button onClick={dismiss} style={{
        background: 'rgba(255,255,255,0.15)', color: '#fff',
        border: 'none', borderRadius: 8, padding: '8px 12px',
        fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 36,
      }}>
        Dismiss
      </button>
    </div>
  )
}
