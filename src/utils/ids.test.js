import { describe, it, expect } from 'vitest'
import { normalizeId, sameId } from './ids.js'

describe('normalizeId', () => {
  it('returns the canonical string for numbers and strings', () => {
    expect(normalizeId(2)).toBe('2')
    expect(normalizeId('2')).toBe('2')
    expect(normalizeId(' 2 ')).toBe('2')
    expect(normalizeId(0)).toBe('0')
  })

  it('returns null for missing or blank values', () => {
    expect(normalizeId(null)).toBeNull()
    expect(normalizeId(undefined)).toBeNull()
    expect(normalizeId('')).toBeNull()
    expect(normalizeId('   ')).toBeNull()
  })
})

describe('sameId', () => {
  it('treats numeric and string IDs as equal', () => {
    expect(sameId(2, '2')).toBe(true)
    expect(sameId('2', 2)).toBe(true)
    expect(sameId(2, 2)).toBe(true)
    expect(sameId('2', '2')).toBe(true)
  })

  it('distinguishes different IDs', () => {
    expect(sameId(2, 3)).toBe(false)
    expect(sameId('2', '20')).toBe(false)
  })

  it('never matches when either side is missing', () => {
    expect(sameId(null, null)).toBe(false)
    expect(sameId(undefined, undefined)).toBe(false)
    expect(sameId(null, 1)).toBe(false)
    expect(sameId('', '')).toBe(false)
  })
})
