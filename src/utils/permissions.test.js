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

describe('permissions', () => {
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

  it('Update Club is Admin only (confirmed rule)', () => {
    expect(canUpdateClub(admin, club)).toBe(true)
    expect(canUpdateClub(leader, club)).toBe(false)
    expect(canUpdateClub(student, club)).toBe(false)
  })

  it('Delete Club is Admin only (confirmed rule)', () => {
    expect(canDeleteClub(admin, club)).toBe(true)
    expect(canDeleteClub(leader, club)).toBe(false)
    expect(canDeleteClub(student, club)).toBe(false)
  })

  it('a Leader cannot update or delete the club they lead', () => {
    const ownClub = { id: 10, name: 'Chess', leader: { id: leader.id } }
    expect(canUpdateClub(leader, ownClub)).toBe(false)
    expect(canDeleteClub(leader, ownClub)).toBe(false)
  })

  it('Admin may update/delete regardless of the club argument', () => {
    expect(canUpdateClub(admin)).toBe(true)
    expect(canDeleteClub(admin, null)).toBe(true)
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
