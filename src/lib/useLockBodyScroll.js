import { useEffect } from 'react'

// Locks background scroll while a modal is open.
// Pass active=false (e.g. tied to a state variable) to only lock when needed.
// Saves and restores scroll position so the page doesn't jump on iOS.
export function useLockBodyScroll(active = true) {
  useEffect(() => {
    if (!active) return
    const y = window.scrollY
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${y}px`
    document.body.style.width = '100%'
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, y)
    }
  }, [active])
}
