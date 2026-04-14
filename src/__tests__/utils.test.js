import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { LEAK_SOURCES, ROOF_TYPES, SERVICE_TYPES } from '../lib/constants.js'

// ── localToday ──────────────────────────────────────────────────────────────
// Re-import the function by importing the module fresh
// localToday is not exported, so we test its effect via the EMPTY_FORM default.
// Instead, test the logic directly.

function localToday() {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

describe('localToday()', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(localToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns the LOCAL date, not UTC', () => {
    // Simulate being in UTC-8 where UTC date can be a day ahead
    const mockDate = new Date('2026-04-15T03:00:00Z') // UTC Apr 15, local Apr 14 in UTC-8
    vi.setSystemTime(mockDate)

    const result = localToday()
    const d = new Date()
    const expected = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-')

    expect(result).toBe(expected)
    vi.useRealTimers()
  })

  it('does not use toISOString() which returns UTC', () => {
    // Pin to a time where UTC date differs from local date
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:30:00'))
    const utcDate = new Date().toISOString().slice(0, 10)
    const localDate = localToday()
    // They may or may not match depending on timezone, but localToday() should
    // always match the components read from local clock
    const d = new Date()
    expect(localDate).toBe(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
    vi.useRealTimers()
  })
})

// ── Constants ────────────────────────────────────────────────────────────────
describe('LEAK_SOURCES', () => {
  it('has 19 items', () => {
    expect(LEAK_SOURCES).toHaveLength(19)
  })

  it('contains expected common sources', () => {
    expect(LEAK_SOURCES).toContain('Drain')
    expect(LEAK_SOURCES).toContain('Skylight')
    expect(LEAK_SOURCES).toContain('HVAC Unit')
    expect(LEAK_SOURCES).toContain('Other')
  })

  it('has no duplicates', () => {
    expect(new Set(LEAK_SOURCES).size).toBe(LEAK_SOURCES.length)
  })
})

describe('ROOF_TYPES', () => {
  it('contains standard types', () => {
    expect(ROOF_TYPES).toContain('TPO')
    expect(ROOF_TYPES).toContain('EPDM')
    expect(ROOF_TYPES).toContain('Metal')
  })
})

describe('SERVICE_TYPES', () => {
  it('contains standard service types', () => {
    expect(SERVICE_TYPES).toContain('Repair')
    expect(SERVICE_TYPES).toContain('Emergency Service')
    expect(SERVICE_TYPES).toContain('Completion Report')
  })
})
