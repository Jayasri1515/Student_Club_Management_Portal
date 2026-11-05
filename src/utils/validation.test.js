import { describe, it, expect } from 'vitest'
import { validateActivity, ACTIVITY_TEXT_MAX } from './validation.js'

const valid = { clubId: '3', title: 'Tournament', description: 'Finals' }

describe('validateActivity', () => {
  it('accepts valid input and returns cleaned values with a numeric club ID', () => {
    const result = validateActivity({ clubId: ' 3 ', title: '  Tournament ', description: ' Finals ' })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual({})
    expect(result.values).toEqual({ clubId: 3, title: 'Tournament', description: 'Finals' })
  })

  it('allows an empty description (optional on the backend)', () => {
    const result = validateActivity({ ...valid, description: '' })
    expect(result.valid).toBe(true)
    expect(result.values.description).toBe('')
  })

  it('requires club ID and title, and treats whitespace as empty', () => {
    const result = validateActivity({ clubId: '   ', title: '   ', description: '' })
    expect(result.valid).toBe(false)
    expect(result.errors.clubId).toBe('Club ID is required.')
    expect(result.errors.title).toBe('Activity title is required.')
  })

  it.each(['abc', '0', '-4', '1.5', '1e3', '12abc', '99999999999999999999'])('rejects invalid club ID %s', (clubId) => {
    const result = validateActivity({ ...valid, clubId })
    expect(result.valid).toBe(false)
    expect(result.errors.clubId).toBe('Club ID must be a positive whole number.')
  })

  it('accepts a numeric club ID value', () => {
    expect(validateActivity({ ...valid, clubId: 7 }).values.clubId).toBe(7)
  })

  it('enforces the 255 character limit (boundary: 255 ok, 256 rejected)', () => {
    expect(validateActivity({ ...valid, title: 'a'.repeat(ACTIVITY_TEXT_MAX) }).valid).toBe(true)
    expect(validateActivity({ ...valid, title: 'a'.repeat(ACTIVITY_TEXT_MAX + 1) }).errors.title).toMatch(/255/)
    expect(validateActivity({ ...valid, description: 'b'.repeat(ACTIVITY_TEXT_MAX + 1) }).errors.description).toMatch(/255/)
  })

  it('handles missing input without throwing', () => {
    expect(validateActivity().valid).toBe(false)
  })
})
