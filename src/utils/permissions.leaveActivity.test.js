import { describe, it, expect } from 'vitest'
import { canDeleteActivity, canLeaveClub, canUpdateActivity } from './permissions.js'

const admin = { id: 1, role: 'Admin' }
const leader = { id: 2, role: 'Leader' }
const student = { id: 3, role: 'Student' }

describe('REQ-006 canLeaveClub', () => {
  it('any logged-in user can leave their own membership', () => {
    for (const user of [admin, leader, student]) {
      expect(canLeaveClub(user, { id: 1, user, club: { id: 9 } })).toBe(true)
    }
  })

  it('a membership list entry without a user is treated as the logged-in user own', () => {
    expect(canLeaveClub(student, { id: 1, club: { id: 9 } })).toBe(true)
  })

  it('compares ids across number/string', () => {
    expect(canLeaveClub(student, { user: { id: '3' } })).toBe(true)
  })

  it('cannot leave through the membership of another user', () => {
    expect(canLeaveClub(student, { user: { id: 99 }, club: { id: 9 } })).toBe(false)
  })

  it('nobody logged in cannot leave', () => {
    expect(canLeaveClub(null, { club: { id: 9 } })).toBe(false)
    expect(canLeaveClub(undefined, null)).toBe(false)
  })
})

describe('REQ-008 activity update / delete (default rule: same as Create Activity, needs product owner confirmation)', () => {
  const activity = { id: 5, club: { id: 1 } }

  it('Admin and Leader may update and delete; Student may not', () => {
    expect(canUpdateActivity(admin, activity)).toBe(true)
    expect(canUpdateActivity(leader, activity)).toBe(true)
    expect(canUpdateActivity(student, activity)).toBe(false)
    expect(canDeleteActivity(admin, activity)).toBe(true)
    expect(canDeleteActivity(leader, activity)).toBe(true)
    expect(canDeleteActivity(student, activity)).toBe(false)
  })

  it('nobody logged in may not', () => {
    expect(canUpdateActivity(null, activity)).toBe(false)
    expect(canDeleteActivity(null, activity)).toBe(false)
  })
})
