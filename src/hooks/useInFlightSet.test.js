import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useInFlightSet } from './useInFlightSet.js'

describe('useInFlightSet', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useInFlightSet())
    expect(result.current.ids).toEqual([])
    expect(result.current.has(1)).toBe(false)
  })

  it('has() is true immediately after add, before any re-render (double-click guard)', () => {
    const { result } = renderHook(() => useInFlightSet())
    act(() => {
      result.current.add(1)
      expect(result.current.has(1)).toBe(true)
    })
    expect(result.current.ids).toEqual([1])
  })

  it('tracks several keys independently and removes only the given one', () => {
    const { result } = renderHook(() => useInFlightSet())
    act(() => {
      result.current.add(1)
      result.current.add(2)
    })
    expect(result.current.ids).toEqual([1, 2])
    act(() => result.current.remove(1))
    expect(result.current.ids).toEqual([2])
    expect(result.current.has(1)).toBe(false)
    expect(result.current.has(2)).toBe(true)
  })

  it('does not report the same key twice', () => {
    const { result } = renderHook(() => useInFlightSet())
    act(() => {
      result.current.add(1)
      result.current.add(1)
    })
    expect(result.current.ids).toEqual([1])
  })

  it('removing an absent key is harmless', () => {
    const { result } = renderHook(() => useInFlightSet())
    act(() => result.current.remove(9))
    expect(result.current.ids).toEqual([])
  })
})
