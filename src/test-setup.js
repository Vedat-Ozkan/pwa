import '@testing-library/jest-dom'

// Silence React act() warnings in tests
globalThis.IS_REACT_ACT_ENVIRONMENT = true

// crypto.randomUUID polyfill for jsdom
if (!globalThis.crypto) {
  globalThis.crypto = {}
}
if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
  }
}

// URL.createObjectURL not available in jsdom
if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  globalThis.URL.revokeObjectURL = vi.fn()
}

// window.open not available in jsdom
globalThis.open = vi.fn()
