import { vi } from 'vitest'

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

export const text = (body, status = 200) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/plain;charset=UTF-8' } })

export const empty = (status = 204) => new Response(null, { status })

/**
 * Install a fetch mock. `handlers` maps "METHOD /path?query" (path relative to
 * the API base URL) to a function (requestBody) => Response.
 * Unknown routes fail the test loudly with a 599 response.
 */
export function installBackend(handlers) {
  const calls = []
  const fetchMock = vi.fn(async (url, init = {}) => {
    const path = String(url).replace('http://localhost:8082/api', '')
    const method = init.method ?? 'GET'
    const body = init.body ? JSON.parse(init.body) : undefined
    calls.push({ url: String(url), method, path, body, headers: init.headers })
    const handler = handlers[`${method} ${path}`]
    if (!handler) return text(`No mock for ${method} ${path}`, 599)
    return handler(body)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, calls }
}
