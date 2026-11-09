import { describe, it, expect } from 'vitest'
import { toIsoDate, validateActivityEdit } from './validation.js'

describe('toIsoDate', () => {
  it('keeps a YYYY-MM-DD string', () => {
    expect(toIsoDate('2026-03-01')).toBe('2026-03-01')
  })
  it('converts the [year, month, day] array form', () => {
    expect(toIsoDate([2026, 3, 1])).toBe('2026-03-01')
  })
  it('returns empty for missing or unknown formats', () => {
    expect(toIsoDate(null)).toBe('')
    expect(toIsoDate(undefined)).toBe('')
    expect(toIsoDate('03/01/2026')).toBe('')
    expect(toIsoDate('2026-03-01T10:00:00')).toBe('')
  })
})

describe('validateActivityEdit', () => {
  it('accepts a valid edit and trims values', () => {
    const result = validateActivityEdit({ title: '  Final  ', description: ' Last game ', date: '2026-03-01' })
    expect(result).toEqual({
      valid: true,
      errors: {},
      values: { title: 'Final', description: 'Last game', date: '2026-03-01' },
    })
  })

  it('requires a title', () => {
    expect(validateActivityEdit({ title: '   ' }).errors.title).toBe('Activity title is required.')
    expect(validateActivityEdit({}).valid).toBe(false)
  })

  it('limits title and description to 255 characters', () => {
    expect(validateActivityEdit({ title: 'x'.repeat(256) }).errors.title).toMatch(/255/)
    expect(validateActivityEdit({ title: 'x'.repeat(255) }).valid).toBe(true)
    expect(validateActivityEdit({ title: 'a', description: 'y'.repeat(256) }).errors.description).toMatch(/255/)
  })

  it('date is optional (sent as null) but must be a real date when given', () => {
    expect(validateActivityEdit({ title: 'a', date: '' }).values.date).toBeNull()
    expect(validateActivityEdit({ title: 'a', date: '2026-02-30' }).errors.date).toMatch(/valid date/)
    expect(validateActivityEdit({ title: 'a', date: 'tomorrow' }).errors.date).toMatch(/valid date/)
    expect(validateActivityEdit({ title: 'a', date: '2024-02-29' }).valid).toBe(true)
  })
})
