import { describe, it, expect, vi } from 'vitest'
import { normalizePage, mergeById, fetchAllPages, DEFAULT_MAX_PAGES } from './pagination.js'

const springPage = (content, number, totalPages, extra = {}) => ({
  content,
  number,
  size: 2,
  totalPages,
  totalElements: totalPages * 2,
  first: number === 0,
  last: number === totalPages - 1,
  empty: content.length === 0,
  ...extra,
})

describe('normalizePage', () => {
  it('reads a Spring Page (first page has more)', () => {
    const page = normalizePage(springPage([{ id: 1 }, { id: 2 }], 0, 3))
    expect(page).toMatchObject({ valid: true, number: 0, size: 2, totalPages: 3, hasMore: true })
    expect(page.content).toHaveLength(2)
  })

  it('reports no more pages on the last page (boundary)', () => {
    expect(normalizePage(springPage([{ id: 5 }], 2, 3)).hasMore).toBe(false)
  })

  it('handles an empty page (Page.empty() for an unknown club)', () => {
    const page = normalizePage({ content: [], number: 0, size: 10, totalPages: 0, totalElements: 0, last: true, empty: true })
    expect(page).toMatchObject({ valid: true, hasMore: false })
    expect(page.content).toEqual([])
  })

  it('never claims more pages after an empty page, even if metadata says so', () => {
    expect(normalizePage({ content: [], last: false }).hasMore).toBe(false)
  })

  it('derives hasMore from number/totalPages when "last" is absent', () => {
    expect(normalizePage({ content: [{ id: 1 }], number: 0, totalPages: 2 }).hasMore).toBe(true)
    expect(normalizePage({ content: [{ id: 1 }], number: 1, totalPages: 2 }).hasMore).toBe(false)
  })

  it('reads metadata nested under "page" (newer Spring Data serialization)', () => {
    const page = normalizePage({ content: [{ id: 1 }], page: { number: 0, size: 1, totalPages: 2, totalElements: 2 } })
    expect(page).toMatchObject({ valid: true, number: 0, totalPages: 2, totalElements: 2, hasMore: true })
  })

  it('prefers "more pages" when metadata is inconsistent, so records are not dropped', () => {
    expect(normalizePage({ content: [{ id: 1 }], number: 0, totalPages: 3, last: true }).hasMore).toBe(true)
  })

  it('reports unknown (null) when there is no usable metadata', () => {
    expect(normalizePage({ content: [{ id: 1 }] }).hasMore).toBeNull()
  })

  it('treats a bare array as one complete page', () => {
    expect(normalizePage([{ id: 1 }])).toMatchObject({ valid: true, hasMore: false, totalPages: 1 })
  })

  it.each([null, undefined, 'text', 42, {}, { content: 'nope' }])('marks %j as an invalid page', (payload) => {
    expect(normalizePage(payload)).toMatchObject({ valid: false, content: [], hasMore: false })
  })

  it('ignores nonsensical metadata values', () => {
    const page = normalizePage({ content: [{ id: 1 }], number: -1, totalPages: 'x', last: true })
    expect(page.number).toBeNull()
    expect(page.totalPages).toBeNull()
    expect(page.hasMore).toBe(false)
  })
})

describe('mergeById', () => {
  it('appends new items and skips ids already present (string vs number)', () => {
    const merged = mergeById([{ id: 1 }, { id: 2 }], [{ id: '2' }, { id: 3 }])
    expect(merged.map((item) => item.id)).toEqual([1, 2, 3])
  })

  it('keeps items without an id', () => {
    expect(mergeById([], [{ name: 'a' }, { name: 'b' }])).toHaveLength(2)
  })
})

describe('fetchAllPages', () => {
  it('collects every page in order', async () => {
    const pages = [
      springPage([{ id: 1 }, { id: 2 }], 0, 3),
      springPage([{ id: 3 }, { id: 4 }], 1, 3),
      springPage([{ id: 5 }], 2, 3),
    ]
    const fetchPage = vi.fn(async (index) => pages[index])
    const result = await fetchAllPages(fetchPage, { size: 2 })
    expect(result.items.map((item) => item.id)).toEqual([1, 2, 3, 4, 5])
    expect(result).toMatchObject({ pages: 3, truncated: false })
    expect(fetchPage.mock.calls.map(([index]) => index)).toEqual([0, 1, 2])
  })

  it('makes a single request for a single page (boundary: last === true on page 0)', async () => {
    const fetchPage = vi.fn(async () => springPage([{ id: 1 }], 0, 1))
    const result = await fetchAllPages(fetchPage, { size: 2 })
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(result.items).toHaveLength(1)
  })

  it('returns an empty list for an empty response', async () => {
    const result = await fetchAllPages(async () => ({ content: [], last: true, number: 0, totalPages: 0 }), { size: 2 })
    expect(result).toEqual({ items: [], pages: 1, truncated: false })
  })

  it('skips duplicates caused by records shifting between page requests', async () => {
    const pages = [springPage([{ id: 1 }, { id: 2 }], 0, 2), springPage([{ id: 2 }, { id: 3 }], 1, 2)]
    const result = await fetchAllPages(async (index) => pages[index], { size: 2 })
    expect(result.items.map((item) => item.id)).toEqual([1, 2, 3])
  })

  it('falls back to the page size when metadata is missing', async () => {
    const pages = [{ content: [{ id: 1 }, { id: 2 }] }, { content: [{ id: 3 }] }]
    const fetchPage = vi.fn(async (index) => pages[index])
    const result = await fetchAllPages(fetchPage, { size: 2 })
    expect(result.items).toHaveLength(3)
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('stops at the safety limit and reports truncation', async () => {
    let calls = 0
    const fetchPage = async (index) => {
      calls += 1
      return { content: [{ id: index }], last: false, number: index, totalPages: 1000 }
    }
    const result = await fetchAllPages(fetchPage, { size: 1, maxPages: 3 })
    expect(calls).toBe(3)
    expect(result).toMatchObject({ pages: 3, truncated: true })
    expect(result.items).toHaveLength(3)
    expect(DEFAULT_MAX_PAGES).toBeGreaterThan(3)
  })

  it('rejects when a page has an unexpected structure', async () => {
    await expect(fetchAllPages(async () => 'oops', { size: 2 })).rejects.toThrow(/unexpected response/i)
  })

  it('propagates request errors', async () => {
    await expect(fetchAllPages(async () => { throw new Error('boom') }, { size: 2 })).rejects.toThrow('boom')
  })
})
