import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient, ApiError, buildUrl, request } from './apiClient.js'

const BASE = 'http://localhost:8082/api'

function mockResponse({ status = 200, statusText = '', body = '', contentType = 'application/json' } = {}) {
  return new Response(body, {
    status,
    statusText,
    headers: contentType ? { 'Content-Type': contentType } : {},
  })
}

describe('apiClient', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('buildUrl joins base and path with exactly one slash', () => {
    expect(buildUrl('http://x/api', '/clubs')).toBe('http://x/api/clubs')
    expect(buildUrl('http://x/api/', 'clubs')).toBe('http://x/api/clubs')
    expect(buildUrl('http://x/api', '')).toBe('http://x/api')
  })

  it('GET requests the configured base URL + path and parses JSON', async () => {
    fetchMock.mockResolvedValue(mockResponse({ body: JSON.stringify({ content: [{ id: 1 }] }) }))
    const data = await apiClient.get('/clubs/getclubs?page=0')
    expect(data).toEqual({ content: [{ id: 1 }] })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE}/clubs/getclubs?page=0`)
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
  })

  it('POST serializes the body as JSON with a JSON content type', async () => {
    fetchMock.mockResolvedValue(mockResponse({ body: JSON.stringify({ id: 5 }) }))
    await apiClient.post('/clubs', { name: 'Chess' })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"name":"Chess"}')
    expect(init.headers['Content-Type']).toBe('application/json')
  })

  it('PUT and DELETE use the right HTTP methods', async () => {
    fetchMock.mockImplementation(async () => mockResponse({ body: '{}' }))
    await apiClient.put('/clubs/1', { name: 'x' })
    await apiClient.delete('/clubs/1')
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT')
    expect(fetchMock.mock.calls[1][1].method).toBe('DELETE')
  })

  it('never sends an Authorization header (backend returns no token)', async () => {
    fetchMock.mockImplementation(async () => mockResponse({ body: '{}' }))
    await apiClient.get('/clubs/getclubs')
    await apiClient.post('/auth/login', { username: 'a', password: 'b' })
    for (const [, init] of fetchMock.mock.calls) {
      const headerNames = Object.keys(init.headers).map((h) => h.toLowerCase())
      expect(headerNames).not.toContain('authorization')
    }
  })

  it('returns null for an empty body (e.g. 204 No Content)', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await expect(apiClient.delete('/clubs/1')).resolves.toBeNull()
  })

  it('returns plain text for a text/plain success response', async () => {
    fetchMock.mockResolvedValue(mockResponse({ body: 'Username is already taken.', contentType: 'text/plain;charset=UTF-8' }))
    await expect(apiClient.post('/auth/register', {})).resolves.toBe('Username is already taken.')
  })

  it('normalizes a plain-text error body into ApiError.message', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ status: 400, statusText: 'Bad Request', body: 'User is already a member of this club.', contentType: 'text/plain' }),
    )
    const error = await apiClient.post('/memberships/join', {}).catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.message).toBe('User is already a member of this club.')
  })

  it('normalizes a JSON error body using message, then error', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ status: 500, body: JSON.stringify({ message: 'Boom' }) }))
    fetchMock.mockResolvedValueOnce(
      mockResponse({ status: 404, body: JSON.stringify({ status: 404, error: 'Not Found', path: '/api/x' }) }),
    )
    await expect(apiClient.get('/a')).rejects.toMatchObject({ status: 500, message: 'Boom' })
    await expect(apiClient.get('/b')).rejects.toMatchObject({ status: 404, message: 'Not Found' })
  })

  it('falls back to statusText, then to a generic message, for an empty error body', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ status: 404, statusText: 'Not Found', body: '' }))
    fetchMock.mockResolvedValueOnce(mockResponse({ status: 503, statusText: '', body: '' }))
    await expect(apiClient.get('/a')).rejects.toMatchObject({ message: 'Not Found' })
    await expect(apiClient.get('/b')).rejects.toMatchObject({ message: 'Request failed with status 503' })
  })

  it('wraps network failures in an ApiError with status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const error = await apiClient.get('/clubs/getclubs').catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(0)
    expect(error.message).toMatch(/unable to reach the server/i)
    expect(error.cause).toBeInstanceOf(TypeError)
  })

  it('treats malformed JSON in a JSON response as text instead of throwing', async () => {
    fetchMock.mockResolvedValue(mockResponse({ body: '{not json' }))
    await expect(apiClient.get('/x')).resolves.toBe('{not json')
  })

  it('supports a per-call base URL override', async () => {
    fetchMock.mockImplementation(async () => mockResponse({ body: '{}' }))
    await request('/ping', { baseUrl: 'https://stage.example.com/api/' })
    expect(fetchMock.mock.calls[0][0]).toBe('https://stage.example.com/api/ping')
  })
})
