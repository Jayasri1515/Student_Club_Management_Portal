import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { empty, installBackend, json, text } from './test/mockBackend.js'

const users = {
  Admin: { id: 1, username: 'alice', role: 'Admin', email: 'a@x.com' },
  Leader: { id: 2, username: 'larry', role: 'Leader', email: 'l@x.com' },
  Student: { id: 5, username: 'sam', role: 'Student', email: 's@x.com' },
}

const clubList = [
  { id: 1, name: 'Chess Club', description: 'Board games', leader: { id: 1, username: 'alice' } },
  { id: 2, name: 'Robotics', description: 'Build robots', leader: null },
]
const page = (content, last = true) => ({ content, last, number: 0, size: 10 })

async function loginAs(role, extraHandlers = {}) {
  const backend = installBackend({
    'POST /auth/login': () => json(users[role]),
    'GET /clubs/getclubs?page=0': () => json(page(clubList)),
    'GET /memberships/user/5': () => json([]),
    'GET /activities/getactivities': () => json(page([])),
    ...extraHandlers,
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

describe('App integration (mocked backend)', () => {
  let alertSpy, promptSpy, confirmSpy

  beforeEach(() => {
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    promptSpy = vi.spyOn(window, 'prompt').mockImplementation(() => null)
    confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('shows login feedback as an in-app notification, uses the API base URL, sends no Authorization header', async () => {
    const { calls } = await loginAs('Student')
    expect(screen.getByRole('status')).toHaveTextContent('Login successful! Welcome, sam.')
    expect(calls[0].url).toBe('http://localhost:8082/api/auth/login')
    expect(calls[0].body).toEqual({ username: 'sam', password: 'secret' })
    expect(JSON.stringify(calls[0].headers).toLowerCase()).not.toContain('authorization')
    expect(alertSpy).not.toHaveBeenCalled()
  })

  it('shows a failed login as an error notification', async () => {
    installBackend({ 'POST /auth/login': () => text('Invalid credentials.', 400) })
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /please log in/i }))
    await user.type(screen.getByPlaceholderText('Username'), 'nobody')
    await user.click(screen.getByRole('button', { name: 'Login' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Login failed: Invalid credentials.')
    expect(alertSpy).not.toHaveBeenCalled()
  })

  it('reports a duplicate username (HTTP 200 plain text from the backend) as a registration failure', async () => {
    installBackend({ 'POST /auth/register': () => text('Username is already taken.', 200) })
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /please log in/i }))
    await user.click(screen.getByRole('button', { name: 'Go to Register' }))
    await user.type(screen.getByPlaceholderText('Your Answer'), 'a needle')
    await user.click(screen.getByRole('button', { name: 'Register' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Registration failed: Username is already taken.')
  })

  it('REQ-005: browse clubs, search, and join with one click using the existing join payload', async () => {
    const { user, calls } = await loginAs('Student', {
      'POST /memberships/join': () => json({ id: 9, user: users.Student, club: clubList[1] }),
    })
    await user.click(screen.getByRole('button', { name: 'Go to Join a Club' }))
    expect(await screen.findByText('Chess Club')).toBeInTheDocument()
    expect(screen.getByText('Robotics')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Club ID to join')).not.toBeInTheDocument()

    await user.type(screen.getByRole('searchbox'), 'robot')
    expect(screen.queryByText('Chess Club')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Join Robotics' }))
    const join = calls.find((c) => c.path === '/memberships/join')
    expect(join.method).toBe('POST')
    expect(join.body).toEqual({ user: { id: 5 }, club: { id: 2 } })
    expect(await screen.findByText('Successfully joined Robotics.')).toBeInTheDocument()
    expect(alertSpy).not.toHaveBeenCalled()
  })

  it('REQ-005: shows the backend message when joining fails (already a member)', async () => {
    const { user } = await loginAs('Student', {
      'POST /memberships/join': () => text('User is already a member of this club.', 400),
    })
    await user.click(screen.getByRole('button', { name: 'Go to Join a Club' }))
    await user.click(await screen.findByRole('button', { name: 'Join Chess Club' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to join club: User is already a member of this club.')
  })

  it('REQ-005: marks clubs the user already joined', async () => {
    const { user } = await loginAs('Student', {
      'GET /memberships/user/5': () => json([{ id: 3, club: clubList[0] }]),
    })
    await user.click(screen.getByRole('button', { name: 'Go to Join a Club' }))
    expect(await screen.findByRole('button', { name: 'Already joined Chess Club' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Join Robotics' })).toBeEnabled()
  })

  it('REQ-006: My Memberships offers no leave action (backend has no endpoint)', async () => {
    const { user } = await loginAs('Student', {
      'GET /memberships/user/5': () => json([{ id: 3, club: clubList[0] }, { id: 4, club: null }]),
    })
    await user.click(screen.getByRole('button', { name: 'View My Memberships' }))
    expect(await screen.findByText('Chess Club')).toBeInTheDocument()
    expect(screen.getByText('Unknown club')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /leave/i })).not.toBeInTheDocument()
  })

  it('REQ-003: Student cannot create clubs or activities; Admin can create clubs', async () => {
    const student = await loginAs('Student')
    await student.user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    expect(await screen.findByRole('button', { name: 'Create Club' })).toBeDisabled()
    await student.user.click(screen.getByRole('button', { name: 'Back to Dashboard' }))
    await student.user.click(screen.getByRole('button', { name: 'Go to Activity Management' }))
    expect(await screen.findByRole('button', { name: 'Create Activity' })).toBeDisabled()
  })

  it('REQ-003: Leader can create activities but not clubs', async () => {
    const { user } = await loginAs('Leader', { 'GET /memberships/user/2': () => json([]) })
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    expect(await screen.findByRole('button', { name: 'Create Club' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Back to Dashboard' }))
    await user.click(screen.getByRole('button', { name: 'Go to Activity Management' }))
    expect(await screen.findByRole('button', { name: 'Create Activity' })).toBeEnabled()
  })

  it.each(['Leader', 'Student'])('REQ-003: %s cannot update or delete clubs (controls disabled, no requests sent)', async (role) => {
    const { user, calls } = await loginAs(role, { [`GET /memberships/user/${users[role].id}`]: () => json([]) })
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    // Led-by-self club is also locked for the Leader.
    for (const name of ['Chess Club', 'Robotics']) {
      const row = (await screen.findByText(name)).closest('li')
      const update = within(row).getByRole('button', { name: 'Update' })
      const del = within(row).getByRole('button', { name: 'Delete' })
      expect(update).toBeDisabled()
      expect(del).toBeDisabled()
      expect(update).toHaveAttribute('title', 'Only Admins can update clubs')
      expect(del).toHaveAttribute('title', 'Only Admins can delete clubs')
      await user.click(update)
      await user.click(del)
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(calls.some((c) => c.method === 'PUT' || c.method === 'DELETE')).toBe(false)
  })

  it('REQ-003: Admin has enabled Update and Delete controls on every club', async () => {
    const { user } = await loginAs('Admin')
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    for (const name of ['Chess Club', 'Robotics']) {
      const row = (await screen.findByText(name)).closest('li')
      expect(within(row).getByRole('button', { name: 'Update' })).toBeEnabled()
      expect(within(row).getByRole('button', { name: 'Delete' })).toBeEnabled()
    }
  })

  it('REQ-003: Admin can create a club (payload unchanged: name, description, leaderId)', async () => {
    const { user, calls } = await loginAs('Admin', {
      'POST /clubs': (body) => json({ id: 7, ...body }),
    })
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    const create = await screen.findByRole('button', { name: 'Create Club' })
    expect(create).toBeEnabled()
    await user.type(screen.getByPlaceholderText('Club Name'), 'Film')
    await user.type(screen.getByPlaceholderText('Description'), 'Movies')
    await user.click(create)
    expect(calls.find((c) => c.method === 'POST' && c.path === '/clubs').body).toEqual({
      name: 'Film',
      description: 'Movies',
      leaderId: 1,
    })
    expect(await screen.findByText('Club created: Film (ID: 7)')).toBeInTheDocument()
  })

  it('REQ-002: renaming a club uses an accessible modal (no prompt), keeps description/leader, returns focus', async () => {
    const { user, calls } = await loginAs('Admin', {
      'PUT /clubs/1': (body) => json({ id: 1, ...body }),
    })
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    const row = (await screen.findByText('Chess Club')).closest('li')
    const updateButton = within(row).getByRole('button', { name: 'Update' })
    await user.click(updateButton)

    const dialog = screen.getByRole('dialog', { name: 'Rename club' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(promptSpy).not.toHaveBeenCalled()

    const input = within(dialog).getByLabelText('New club name')
    await user.clear(input)
    await user.type(input, 'Grandmasters')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    const put = calls.find((c) => c.method === 'PUT')
    expect(put.path).toBe('/clubs/1')
    expect(put.body).toEqual({
      name: 'Grandmasters',
      description: 'Board games',
      leader: { id: 1, username: 'alice' },
    })
    expect(await screen.findByText('Club updated to: Grandmasters')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(updateButton).toHaveFocus()
  })

  it('REQ-002: cancelling the rename modal with ESC sends nothing and restores focus', async () => {
    const { user, calls } = await loginAs('Admin')
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    const row = (await screen.findByText('Chess Club')).closest('li')
    const updateButton = within(row).getByRole('button', { name: 'Update' })
    await user.click(updateButton)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(updateButton).toHaveFocus()
    expect(calls.some((c) => c.method === 'PUT')).toBe(false)
  })

  it('REQ-002: deleting a club asks for confirmation in a dialog (no window.confirm) and handles 204', async () => {
    const { user, calls } = await loginAs('Admin', { 'DELETE /clubs/2': () => empty(204) })
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    const row = (await screen.findByText('Robotics')).closest('li')
    await user.click(within(row).getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete club' })
    expect(dialog).toHaveTextContent('Robotics')
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(await screen.findByText('Club deleted successfully.')).toBeInTheDocument()
    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/clubs/2')).toBe(true)
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(alertSpy).not.toHaveBeenCalled()
  })

  it('REQ-007: activities list shows correct Activity ID / Club ID and survives a null club', async () => {
    const { user } = await loginAs('Leader', {
      'GET /memberships/user/2': () => json([]),
      'GET /activities/getactivities': () =>
        json(
          page([
            { id: 11, title: 'Opening Match', description: 'First game', club: { id: 42, name: 'Chess Club' } },
            { id: 12, title: 'Orphan', description: 'No club', club: null },
          ]),
        ),
    })
    await user.click(screen.getByRole('button', { name: 'Go to Activity Management' }))
    const first = (await screen.findByText('Opening Match')).closest('li')
    expect(first).toHaveTextContent('Activity ID: 11')
    expect(first).toHaveTextContent('Club ID: 42')
    const second = screen.getByText('Orphan').closest('li')
    expect(second).toHaveTextContent('Activity ID: 12')
    expect(second).toHaveTextContent('Club ID: N/A')
  })

  it('REQ-007: creating an activity sends the backend field names (title, club.id)', async () => {
    const { user, calls } = await loginAs('Leader', {
      'GET /memberships/user/2': () => json([]),
      'POST /activities': (body) => json({ id: 20, ...body, club: { id: 1, name: 'Chess Club' } }),
    })
    await user.click(screen.getByRole('button', { name: 'Go to Activity Management' }))
    await user.type(await screen.findByPlaceholderText('Club ID'), '1')
    await user.type(screen.getByPlaceholderText('Activity Title'), 'Tournament')
    await user.type(screen.getByPlaceholderText('Description'), 'Finals')
    await user.click(screen.getByRole('button', { name: 'Create Activity' }))
    const post = calls.find((c) => c.method === 'POST' && c.path === '/activities')
    expect(post.body).toEqual({ title: 'Tournament', description: 'Finals', club: { id: '1' } })
    expect(await screen.findByText('Activity created: Tournament (Club ID: 1)')).toBeInTheDocument()
  })

  it('shows a fetch error as an in-app alert instead of window.alert', async () => {
    const { user } = await loginAs('Admin', { 'GET /clubs/getclubs?page=0': () => text('Server exploded', 500) })
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    expect(await screen.findByText('Error fetching clubs: Server exploded')).toBeInTheDocument()
    expect(alertSpy).not.toHaveBeenCalled()
  })
})
