import { useState, useCallback, useRef } from 'react'

let _show = null

export function useToast() {
  const [msg, setMsg] = useState(null)
  const timer = useRef(null)

  const show = useCallback((message) => {
    setMsg(message)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(null), 2500)
  }, [])

  return { msg, show }
}

export function Toast({ msg }) {
  if (!msg) return null
  return <div className="toast">{msg}</div>
}
