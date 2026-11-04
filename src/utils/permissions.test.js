import { describe, it, expect } from 'vitest'
import {
  ROLES,
  canCreateActivity,
  canCreateClub,
  canDeleteClub,
  canJoinClub,
  canUpdateClub,
} from './permissions.js'

const admin = { id: 1, role: 'Admin' }
const leader = { id: 2, role: 'Leader' }
const student = { id: 3, role: 'Student' }
const club = { id: 10, name: 'Chess', leader: { id: 2 } }

describe('permissions (behavior preserved from the original UI)', () => {
  it('exposes the three roles used by registration', () => {
    expect(ROLES).toEqual({ ADMIN: 'Admin', LEADER: 'Leader', STUDENT: 'Student' })
  })

  it('Create Club is Admin only', () => {
    expect(canCreateClub(admin)).toBe(true)
    expect(canCreateClub(leader)).toBe(false)
    expect(canCreateClub(student)).toBe(false)
  })

  it('Create Activity is allowed for everyone except Student', () => {
    expect(canCreateActivity(admin)).toBe(true)
    expect(canCreateActivity(leader)).toBe(true)
    expect(canCreateActivity(student)).toBe(false)
  })

  it('Update/Delete Club are open to any logged-in user (unchanged; needs rule confirmation)', () => {
    for (const user of [admin, leader, student]) {
      expect(canUpdateClub(user, club)).toBe(true)
      expect(canDeleteClub(user, club)).toBe(true)
    }
  })

  it('Join Club is open to any logged-in user', () => {
    for (const user of [admin, leader, student]) {
      expect(canJoinClub(user)).toBe(true)
    }
  })

  it('denies everything when nobody is logged in', () => {
    for (const user of [null, undefined]) {
      expect(canCreateClub(user)).toBe(false)
      expect(canCreateActivity(user)).toBe(false)
      expect(canUpdateClub(user, club)).toBe(false)
      expect(canDeleteClub(user, club)).toBe(false)
      expect(canJoinClub(user)).toBe(false)
    }
  })
})
