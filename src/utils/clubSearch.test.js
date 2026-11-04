import { describe, it, expect } from 'vitest'
import { filterClubs } from './clubSearch.js'

const clubs = [
  { id: 1, name: 'Chess Club', description: 'Board games and strategy' },
  { id: 2, name: 'Robotics', description: 'Build robots' },
  { id: 3, name: 'Drama', description: null },
]

describe('filterClubs', () => {
  it('returns all clubs for an empty or blank query', () => {
    expect(filterClubs(clubs, '')).toEqual(clubs)
    expect(filterClubs(clubs, '   ')).toEqual(clubs)
    expect(filterClubs(clubs, undefined)).toEqual(clubs)
  })

  it('matches by name, case-insensitively', () => {
    expect(filterClubs(clubs, 'chess').map((c) => c.id)).toEqual([1])
  })

  it('matches by description', () => {
    expect(filterClubs(clubs, 'ROBOTS').map((c) => c.id)).toEqual([2])
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterClubs(clubs, 'zzz')).toEqual([])
  })

  it('tolerates null descriptions and non-array input', () => {
    expect(filterClubs(clubs, 'drama')).toHaveLength(1)
    expect(filterClubs(null, 'x')).toEqual([])
  })
})
