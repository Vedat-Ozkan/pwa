import { useEffect, useRef } from 'react'

// Anything that would lose work on a reload registers a guard. Each guard
// returns (or resolves to) true when it's safe to reload for an update.
const guards = new Set()

export function useUpdateGuard(guard) {
  const ref = useRef(guard)
  useEffect(() => { ref.current = guard })
  useEffect(() => {
    const check = () => ref.current()
    guards.add(check)
    return () => guards.delete(check)
  }, [])
}

export async function readyToUpdate() {
  for (const check of guards) {
    if (!(await check())) return false
  }
  return true
}
