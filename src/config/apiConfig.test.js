import { describe, it, expect, vi, afterEach } from 'vitest'
import { DEFAULT_API_BASE_URL, normalizeBaseUrl, resolveApiBaseUrl } from './apiConfig.js'

describe('normalizeBaseUrl', () => {
  it('removes a single trailing slash', () => {
    expect(normalizeBaseUrl('https://api.example.com/api/')).toBe('https://api.example.com/api')
  })

  it('removes multiple trailing slashes and surrounding whitespace', () => {
    expect(normalizeBaseUrl('  https://api.example.com/api///  ')).toBe('https://api.example.com/api')
  })

  it('leaves a clean URL untouched', () => {
    expect(normalizeBaseUrl('http://localhost:8082/api')).toBe('http://localhost:8082/api')
  })

  it('returns an empty string for non-string input', () => {
    expect(normalizeBaseUrl(undefined)).toBe('')
    expect(normalizeBaseUrl(null)).toBe('')
    expect(normalizeBaseUrl(42)).toBe('')
  })
})

describe('resolveApiBaseUrl', () => {
  it('falls back to the local backend when unset, empty or blank', () => {
    expect(DEFAULT_API_BASE_URL).toBe('http://localhost:8082/api')
    expect(resolveApiBaseUrl(undefined)).toBe(DEFAULT_API_BASE_URL)
    expect(resolveApiBaseUrl('')).toBe(DEFAULT_API_BASE_URL)
    expect(resolveApiBaseUrl('   ')).toBe(DEFAULT_API_BASE_URL)
  })

  it('uses and normalizes the provided value', () => {
    expect(resolveApiBaseUrl('https://stage.example.com/api/')).toBe('https://stage.example.com/api')
  })
})

describe('API_BASE_URL (read from import.meta.env)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('defaults to http://localhost:8082/api when VITE_API_BASE_URL is not set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    vi.resetModules()
    const { API_BASE_URL } = await import('./apiConfig.js')
    expect(API_BASE_URL).toBe('http://localhost:8082/api')
  })

  it('uses VITE_API_BASE_URL (normalized) when set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://prod.example.com/api/')
    vi.resetModules()
    const { API_BASE_URL } = await import('./apiConfig.js')
    expect(API_BASE_URL).toBe('https://prod.example.com/api')
  })
})
