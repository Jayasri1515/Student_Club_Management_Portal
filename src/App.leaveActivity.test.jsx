// REQ-006 (leave club) and REQ-008 (activity update / delete) against a mocked backend.
// The mocked routes match the contract implemented on the back_end PR (#6):
//   DELETE /memberships/user/{userId}/club/{clubId} -> 204 | 404 (text body)
//   PUT    /activities/{id}  { title, description, date } -> 200 | 400 | 404
//   DELETE /activities/{id}  -> 204 | 404

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { empty, installBackend, json, text } from './test/mockBackend.js'

const users = {
  Admin: { id: 1, username: 'alice', role: 'Admin' },
  Leader: { id: 2, username: 'larry', role: 'Leader' },
  Student: { id: 5, username: 'sam', role: 'Student' },
}
const chess = { id: 1, name: 'Chess Club', description: 'Board games' }
const robotics = { id: 2, name: 'Robotics', description: 'Build robots' }
const page = (content) => ({ content, last: true, number: 0, size: 100 })

async function loginAs(role, handlers = {}) {
  const backend = installBackend({
    'POST /auth/login': () => json(users[role]),
    'GET /clubs/getclubs?page=0': () => json(page([chess, robotics])),
    [`GET /memberships/user/${users[role].id}`]: () => json([]),
    'GET /activities/getactivities?page=0&size=100': () => json(page([])),
    ...handlers,
  })
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: /please log in/i }))
  await user.type(screen.getByPlaceholderText('Username'), users[role].username)
  await user.type(screen.getByPlaceholderText('Password'), 'secret')
  await user.click(screen.getByRole('button', { name: 'Login' }))
  await screen.findByText(/Login successful/)
  return { user, ...backend }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('REQ-006: leave club', () => {
  const memberships = () => [
    { id: 3, user: users.Student, club: chess },
    { id: 4, user: users.Student, club: robotics },
  ]

  it('asks for confirmation, sends DELETE /memberships/user/{userId}/club/{clubId}, then refreshes the list', async () => {
    let current = memberships()
    const { user, calls } = await loginAs('Student', {
      'GET /memberships/user/5': () => json(current),
      'DELETE /memberships/user/5/club/2': () => {
        current = current.filter((m) => m.club.id !== 2)
        return empty(204)
      },
    })
    await user.click(screen.getByRole('button', { name: 'View My Memberships' }))
    expect(await screen.findByText('Robotics')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Leave Robotics' }))
    const dialog = screen.getByRole('dialog', { name: 'Leave club' })
    expect(dialog).toHaveTextContent('Robotics')
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)

    await user.click(within(dialog).getByRole('button', { name: 'Leave' }))
    expect(await screen.findByText('You have left Robotics.')).toBeInTheDocument()
    const del = calls.filter((c) => c.method === 'DELETE')
    expect(del).toHaveLength(1)
    expect(del[0].path).toBe('/memberships/user/5/club/2')
    expect(del[0].body).toBeUndefined()
    expect(await screen.findByText('Chess Club')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Leave Robotics' })).not.toBeInTheDocument()
  })

  it('cancelling the confirmation sends nothing', async () => {
    const { user, calls } = await loginAs('Student', { 'GET /memberships/user/5': () => json(memberships()) })
    await user.click(screen.getByRole('button', { name: 'View My Memberships' }))
    await user.click(await screen.findByRole('button', { name: 'Leave Chess Club' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Leave club' })).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)
  })

  it('shows the backend message on 404 (not a member) and refreshes the list', async () => {
    const { user, calls } = await loginAs('Student', {
      'GET /memberships/user/5': () => json(memberships()),
      'DELETE /memberships/user/5/club/1': () => text('User is not a member of this club.', 404),
    })
    await user.click(screen.getByRole('button', { name: 'View My Memberships' }))
    await user.click(await screen.findByRole('button', { name: 'Leave Chess Club' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Leave' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not leave Chess Club: User is not a member of this club.')
    expect(calls.filter((c) => c.path === '/memberships/user/5').length).toBeGreaterThanOrEqual(2)
  })

  it('shows a generic failure for other errors and keeps the membership', async () => {
    const { user } = await loginAs('Student', {
      'GET /memberships/user/5': () => json(memberships()),
      'DELETE /memberships/user/5/club/1': () => text('Server exploded', 500),
    })
    await user.click(screen.getByRole('button', { name: 'View My Memberships' }))
    await user.click(await screen.findByRole('button', { name: 'Leave Chess Club' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Leave' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to leave club: Server exploded')
    expect(screen.getByRole('button', { name: 'Leave Chess Club' })).toBeEnabled()
  })

  it.each(['Admin', 'Leader'])('%s can leave their own membership too', async (role) => {
    const id = users[role].id
    const { user } = await loginAs(role, {
      [`GET /memberships/user/${id}`]: () => json([{ id: 9, user: users[role], club: chess }]),
    })
    await user.click(screen.getByRole('button', { name: 'View My Memberships' }))
    expect(await screen.findByRole('button', { name: 'Leave Chess Club' })).toBeEnabled()
  })

  it('disables Leave for a membership without a club id', async () => {
    const { user } = await loginAs('Student', {
      'GET /memberships/user/5': () => json([{ id: 4, user: users.Student, club: null }]),
    })
    await user.click(screen.getByRole('button', { name: 'View My Memberships' }))
    expect(await screen.findByText('Unknown club')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Leave club' })).toBeDisabled()
  })
})

describe('REQ-008: activity update / delete', () => {
  const activity = {
    id: 11,
    title: 'Opening Match',
    description: 'First game',
    date: '2026-03-01',
    club: { id: 42, name: 'Chess Club' },
  }
  const listRoute = (items) => ({ 'GET /activities/getactivities?page=0&size=100': () => json(page(items())) })

  const openActivities = async (user) => {
    await user.click(screen.getByRole('button', { name: 'Go to Activity Management' }))
    return (await screen.findByText('Opening Match')).closest('li')
  }

  it.each(['Student', 'Leader'])('%s sees Edit and Delete disabled and nothing is sent', async (role) => {
    const { user, calls } = await loginAs(role, listRoute(() => [activity]))
    await openActivities(user)
    expect(screen.getByRole('button', { name: 'Edit activity Opening Match' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete activity Opening Match' })).toBeDisabled()
    expect(calls.some((c) => c.method === 'PUT' || c.method === 'DELETE')).toBe(false)
  })

  it('Admin can edit: PUT /activities/{id} with title, description and date only; list is reloaded', async () => {
    let current = activity
    const { user, calls } = await loginAs('Admin', {
      ...listRoute(() => [current]),
      'PUT /activities/11': (body) => {
        current = { ...current, ...body }
        return json(current)
      },
    })
    await openActivities(user)
    await user.click(screen.getByRole('button', { name: 'Edit activity Opening Match' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit activity' })
    expect(within(dialog).getByLabelText('Activity title')).toHaveValue('Opening Match')
    expect(within(dialog).getByLabelText('Date (optional)')).toHaveValue('2026-03-01')

    const title = within(dialog).getByLabelText('Activity title')
    await user.clear(title)
    await user.type(title, 'Grand Final')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Activity updated: Grand Final')).toBeInTheDocument()
    const put = calls.find((c) => c.method === 'PUT')
    expect(put.path).toBe('/activities/11')
    expect(put.body).toEqual({ title: 'Grand Final', description: 'First game', date: '2026-03-01' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText('Grand Final')).toBeInTheDocument()
  })

  it('validates before sending: a blank title is rejected inline', async () => {
    const { user, calls } = await loginAs('Admin', listRoute(() => [activity]))
    await openActivities(user)
    await user.click(screen.getByRole('button', { name: 'Edit activity Opening Match' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit activity' })
    await user.clear(within(dialog).getByLabelText('Activity title'))
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Activity title is required.')
    expect(calls.some((c) => c.method === 'PUT')).toBe(false)
  })

  it('keeps the dialog open and shows the backend message on 400', async () => {
    const { user } = await loginAs('Admin', {
      ...listRoute(() => [activity]),
      'PUT /activities/11': () => text('Activity title is required.', 400),
    })
    await openActivities(user)
    await user.click(screen.getByRole('button', { name: 'Edit activity Opening Match' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Update Activity Error: Activity title is required.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Edit activity' })).toBeInTheDocument()
  })

  it('closes the dialog, reports and reloads on 404 (activity already deleted)', async () => {
    const { user, calls } = await loginAs('Admin', {
      ...listRoute(() => [activity]),
      'PUT /activities/11': () => text('Activity not found.', 404),
    })
    await openActivities(user)
    await user.click(screen.getByRole('button', { name: 'Edit activity Opening Match' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Update Activity Error: Activity not found.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(calls.filter((c) => c.path === '/activities/getactivities?page=0&size=100').length).toBeGreaterThanOrEqual(2)
  })

  it('Admin can delete after confirmation: DELETE /activities/{id} (204) and the list is reloaded', async () => {
    let items = [activity]
    const { user, calls } = await loginAs('Admin', {
      ...listRoute(() => items),
      'DELETE /activities/11': () => {
        items = []
        return empty(204)
      },
    })
    await openActivities(user)
    await user.click(screen.getByRole('button', { name: 'Delete activity Opening Match' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete activity' })
    expect(dialog).toHaveTextContent('Opening Match')
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(await screen.findByText('Activity deleted successfully.')).toBeInTheDocument()
    expect(calls.filter((c) => c.method === 'DELETE').map((c) => c.path)).toEqual(['/activities/11'])
    expect(await screen.findByText('No activities found.')).toBeInTheDocument()
  })

  it('cancelling the delete confirmation sends nothing', async () => {
    const { user, calls } = await loginAs('Admin', listRoute(() => [activity]))
    await openActivities(user)
    await user.click(screen.getByRole('button', { name: 'Delete activity Opening Match' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)
  })

  it('reports a failed delete and keeps the activity', async () => {
    const { user } = await loginAs('Admin', {
      ...listRoute(() => [activity]),
      'DELETE /activities/11': () => text('Server exploded', 500),
    })
    await openActivities(user)
    await user.click(screen.getByRole('button', { name: 'Delete activity Opening Match' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    expect(await screen.findByText('Delete Activity Error: Server exploded')).toBeInTheDocument()
    expect(screen.getByText('Opening Match')).toBeInTheDocument()
  })

  it('keeps the club filter when reloading after an edit', async () => {
    let current = activity
    const { user, calls } = await loginAs('Admin', {
      'GET /clubs/getclubs?page=0': () => json(page([{ id: 42, name: 'Chess Club' }])),
      'GET /activities/club/42?page=0&size=100': () => json(page([current])),
      'PUT /activities/11': (body) => {
        current = { ...current, ...body }
        return json(current)
      },
    })
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    await user.click(await screen.findByRole('button', { name: 'View Activities' }))
    await screen.findByText('Opening Match')
    await user.click(screen.getByRole('button', { name: 'Edit activity Opening Match' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }))
    await screen.findByText('Activity updated: Opening Match')
    expect(calls.some((c) => c.path === '/activities/getactivities?page=0&size=100')).toBe(false)
    expect(calls.filter((c) => c.path === '/activities/club/42?page=0&size=100').length).toBeGreaterThanOrEqual(2)
  })
})
