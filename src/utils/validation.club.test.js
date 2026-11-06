import { describe, it, expect } from 'vitest'
import { validateClub, ACTIVITY_TEXT_MAX } from './validation.js'
import { ApiError, isAbortError } from '../services/apiClient.js'

describe('validateClub', () => {
  it('requires a name', () => {
    for (const name of [undefined, null, '', '   ']) {
      const result = validateClub({ name, description: 'x' })
      expect(result.valid).toBe(false)
      expect(result.errors.name).toBe('Club name is required.')
    }
    expect(validateClub().valid).toBe(false)
  })

  it('trims values and treats the description as optional', () => {
    expect(validateClub({ name: '  Film  ', description: '  Movies ' })).toEqual({
      valid: true,
      errors: {},
      values: { name: 'Film', description: 'Movies' },
    })
    expect(validateClub({ name: 'Film' }).values.description).toBe('')
  })

  it('enforces the 255 character boundary for both fields', () => {
    const ok = 'a'.repeat(ACTIVITY_TEXT_MAX)
    expect(validateClub({ name: ok, description: ok }).valid).toBe(true)
    const result = validateClub({ name: ok + 'a', description: ok + 'a' })
    expect(result.errors.name).toMatch(/255/)
    expect(result.errors.description).toMatch(/255/)
  })
})

describe('isAbortError', () => {
  it('is true only for ApiError with code aborted', () => {
    expect(isAbortError(new ApiError('x', { code: 'aborted' }))).toBe(true)
    expect(isAbortError(new ApiError('x', { code: 'timeout' }))).toBe(false)
    expect(isAbortError(new ApiError('x', { status: 500 }))).toBe(false)
    expect(isAbortError(new Error('x'))).toBe(false)
    expect(isAbortError(null)).toBe(false)
  })
})
