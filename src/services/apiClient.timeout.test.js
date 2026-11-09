// CR-005: request timeout and cancellation.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient, ApiError, request, DEFAULT_TIMEOUT_MS } from './apiClient.js'

// A fetch that never answers on its own but honours AbortSignal, like the real one.
function hangingFetch() {
  return vi.fn((_url, init) =>
    new Promise((_resolve, reject) => {
      const fail = () => reject(new DOMException('The operation was aborted.', 'AbortError'))
      if (init.signal.aborted) fail()
      else init.signal.addEventListener('abort', fail)
    }),
  )
}

const jsonHeaders = { 'Content-Type': 'application/json' }

describe('apiClient timeout / cancellation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('passes an AbortSignal to fetch and keeps method/body behaviour unchanged', async () => {
    const fetchMock = vi.fn(async () => new Response('{"id":1}', { headers: jsonHeaders }))
    vi.stubGlobal('fetch', fetchMock)
    const data = await apiClient.post('/clubs', { name: 'Chess' })
    expect(data).toEqual({ id: 1 })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"name":"Chess"}')
  })

  it('times out a hung GET with a retry message and code "timeout"', async () => {
    vi.stubGlobal('fetch', hangingFetch())
    const promise = apiClient.get('/clubs/getclubs?page=0', { timeoutMs: 1000 })
    const assertion = expect(promise).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      code: 'timeout',
      message: 'The server took too long to respond. Please try again.',
    })
    await vi.advanceTimersByTimeAsync(1000)
    await assertion
  })

  it('warns that a timed-out write may still have completed', async () => {
    vi.stubGlobal('fetch', hangingFetch())
    const promise = apiClient.post('/memberships/join', { club: { id: 1 } }, { timeoutMs: 500 })
    const assertion = expect(promise).rejects.toMatchObject({ code: 'timeout', message: expect.stringContaining('may not have completed') })
    await vi.advanceTimersByTimeAsync(500)
    await assertion
  })

  it('does not time out before the limit', async () => {
    let resolveFetch
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => { resolveFetch = resolve })))
    const promise = apiClient.get('/slow', { timeoutMs: 1000 })
    await vi.advanceTimersByTimeAsync(999)
    resolveFetch(new Response('{"ok":true}', { headers: jsonHeaders }))
    await expect(promise).resolves.toEqual({ ok: true })
  })

  it('applies a default timeout', async () => {
    vi.stubGlobal('fetch', hangingFetch())
    const promise = apiClient.get('/clubs')
    const assertion = expect(promise).rejects.toMatchObject({ code: 'timeout' })
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS)
    await assertion
  })

  it.each([0, null, Infinity])('disables the timeout when timeoutMs is %s', async (timeoutMs) => {
    let resolveFetch
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => { resolveFetch = resolve })))
    const promise = apiClient.get('/slow', { timeoutMs })
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS * 10)
    resolveFetch(new Response('"done"', { headers: jsonHeaders }))
    await expect(promise).resolves.toBe('done')
  })

  it('cancels when the caller aborts, with code "aborted" (not a timeout or network error)', async () => {
    vi.stubGlobal('fetch', hangingFetch())
    const controller = new AbortController()
    const promise = apiClient.get('/clubs', { signal: controller.signal })
    const assertion = expect(promise).rejects.toMatchObject({ code: 'aborted', message: 'The request was cancelled.' })
    controller.abort()
    await assertion
  })

  it('rejects immediately if the caller signal is already aborted', async () => {
    vi.stubGlobal('fetch', hangingFetch())
    const controller = new AbortController()
    controller.abort()
    await expect(request('/clubs', { signal: controller.signal })).rejects.toMatchObject({ code: 'aborted' })
  })

  it('still reports plain network failures as before (status 0, no code)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const error = await apiClient.get('/clubs').catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 0, code: null, message: 'Unable to reach the server. Please check your connection and try again.' })
  })

  it('keeps HTTP error handling unchanged and clears its timer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Nope', { status: 400, headers: { 'Content-Type': 'text/plain' } })))
    await expect(apiClient.get('/clubs')).rejects.toMatchObject({ status: 400, message: 'Nope', code: null })
    expect(vi.getTimerCount()).toBe(0)
  })
})
