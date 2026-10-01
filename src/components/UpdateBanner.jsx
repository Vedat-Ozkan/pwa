import { useEffect } from 'react'
import { readyToUpdate } from '../lib/updateGuard.js'

export default function UpdateBanner({ onUpdate }) {
  // Lets the sticky top bars and toast sit below the banner (index.css).
  useEffect(() => {
    document.documentElement.classList.add('update-ready')
    return () => document.documentElement.classList.remove('update-ready')
  }, [])

  async function update() {
    if (await readyToUpdate()) onUpdate()
  }

  return (
    <div className="update-banner">
      <button type="button" onClick={update}>
        Update available — tap to update
      </button>
    </div>
  )
}
