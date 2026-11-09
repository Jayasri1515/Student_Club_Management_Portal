import { describe, it, expect } from 'vitest'
import { NOT_AVAILABLE, getActivityDisplay } from './activity.js'

describe('getActivityDisplay', () => {
  it('maps activity.id to the activity ID and activity.club.id to the club ID', () => {
    const result = getActivityDisplay({
      id: 7,
      title: 'Opening Match',
      description: 'First game',
      date: '2026-01-15',
      club: { id: 42, name: 'Chess Club' },
    })
    expect(result).toEqual({
      activityId: '7',
      clubId: '42',
      clubName: 'Chess Club',
      title: 'Opening Match',
      description: 'First game',
      date: '2026-01-15',
    })
  })

  it('does not confuse activity ID with club ID', () => {
    const result = getActivityDisplay({ id: 1, club: { id: 99 } })
    expect(result.activityId).toBe('1')
    expect(result.clubId).toBe('99')
  })

  it('is null-safe when the club is missing', () => {
    const result = getActivityDisplay({ id: 3, title: 'Orphan', club: null })
    expect(result.clubId).toBe(NOT_AVAILABLE)
    expect(result.clubName).toBe('Unknown club')
    expect(result.activityId).toBe('3')
  })

  it('is null-safe for a missing activity and missing fields', () => {
    expect(getActivityDisplay(null).activityId).toBe(NOT_AVAILABLE)
    expect(getActivityDisplay(undefined).title).toBe('Untitled activity')
    const result = getActivityDisplay({})
    expect(result).toMatchObject({ activityId: NOT_AVAILABLE, clubId: NOT_AVAILABLE, description: '', date: '' })
  })

  it('keeps a legitimate id of 0 and falls back to name when title is absent', () => {
    expect(getActivityDisplay({ id: 0, club: { id: 0 } })).toMatchObject({ activityId: '0', clubId: '0' })
    expect(getActivityDisplay({ name: 'Legacy name' }).title).toBe('Legacy name')
  })
})
