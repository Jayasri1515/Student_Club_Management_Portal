// Tests for the PR #5 follow-ups: dev-only auth notice, membership error handling,
// the View Activities club filter, Create Club validation and request cancellation.
import { StrictMode } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, within, fireEvent, act, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { installBackend, json, text } from './test/mockBackend.js'

const users = {
  Admin: { id: 1, username: 'alice', role: 'Admin', email: 'a@x.com' },
  Student: { id: 5, username: 'sam', role: 'Student', email: 's@x.com' },
}
const clubList = [
  { id: 1, name: 'Chess Club', description: 'Board games' },
  { id: 2, name: 'Robotics', description: 'Build robots' },
]
const springPage = (content, number, totalPages, size = 10) => ({
  content,
  number,
  size,
  totalPages,
  totalElements: content.length,
  first: number === 0,
  last: number >= totalPages - 1,
  empty: content.length === 0,
})
const ACTIVITIES = '/activities/getactivities'
const settle = (ms = 60) => act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)) })

async function loginAs(role, extraHandlers = {}, { strict = false } = {}) {
  const backend = installBackend({
    'POST /auth/login': () => json(users[role]),
    'GET /clubs/getclubs?page=0': () => json(springPage(clubList, 0, 1)),
    [`GET /memberships/user/${users[role].id}`]: () => json([]),
    [`GET ${ACTIVITIES}?page=0&size=100`]: () => json(springPage([], 0, 1, 100)),
    ...extraHandlers,
  })
  const user = userEvent.setup()
  render(strict ? <StrictMode><App /></StrictMode> : <App />)
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

describe('dev-only authentication notice (candidate CRIT-001 B / F-001)', () => {
  it('is shown inside the login and register dialogs', async () => {
    installBackend({})
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /please log in/i }))
    const login = screen.getByRole('dialog')
    expect(within(login).getByRole('note')).toHaveTextContent(/does not verify passwords/i)
    await user.click(within(login).getByRole('button', { name: 'Go to Register' }))
    expect(within(screen.getByRole('dialog')).getByRole('note')).toHaveTextContent(/do not use a real password/i)
  })

  it('is not shown on the landing page, and is shown on every page once logged in', async () => {
    installBackend({})
    render(<App />)
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    cleanup()

    const { user } = await loginAs('Student')
    expect(screen.getByRole('note')).toHaveTextContent(/Development-only authentication/)
    expect(screen.getByRole('note')).toHaveTextContent(/role is not verified/)
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    await screen.findByText('Chess Club')
    expect(screen.getByRole('note')).toBeInTheDocument()
  })

  it('disappears again after logout', async () => {
    const { user } = await loginAs('Admin')
    expect(screen.getByRole('note')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Logout' }))
    expect(await screen.findByText('Logged out.')).toBeInTheDocument()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('does not disable any Admin action (visible notice only)', async () => {
    const { user } = await loginAs('Admin')
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    expect(await screen.findByRole('button', { name: 'Create Club' })).toBeEnabled()
  })
})

describe('membership fetch error handling (candidate MED-002, unconfirmed)', () => {
  const membershipOf = (id, name) => ({ id: id * 10, club: { id, name } })
  const openMemberships = (user) => user.click(screen.getByRole('button', { name: 'View My Memberships' }))

  it('clears the list and explains a 404 (account not found)', async () => {
    const { user } = await loginAs('Admin', {
      'GET /memberships/user/1': () => text('User not found', 404),
    })
    await openMemberships(user)
    expect(await screen.findByText(/your account was not found/)).toBeInTheDocument()
    expect(screen.getByText('You have not joined any clubs yet.')).toBeInTheDocument()
  })

  it('does not keep a stale membership list when a later refresh fails', async () => {
    let calls = 0
    const { user } = await loginAs('Admin', {
      'GET /memberships/user/1': () => (++calls === 1 ? json([membershipOf(1, 'Chess Club')]) : text('gone', 404)),
      'POST /memberships/join': () => json({ id: 20, club: { id: 2, name: 'Robotics' } }),
    })
    await user.click(screen.getByRole('button', { name: 'Go to Join a Club' }))
    expect(await screen.findByRole('button', { name: 'Already joined Chess Club' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Join Robotics' }))
    expect(await screen.findByText(/your account was not found/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Already joined Chess Club' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Join Chess Club' })).toBeEnabled()
  })

  it('ends the session on 401', async () => {
    const { user } = await loginAs('Admin', {
      'GET /memberships/user/1': () => text('Unauthorized', 401),
    })
    await openMemberships(user)
    expect(await screen.findByText('Your session is no longer valid. Please log in again.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /please log in/i })).toBeInTheDocument()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('explains a 403', async () => {
    const { user } = await loginAs('Admin', {
      'GET /memberships/user/1': () => text('Forbidden', 403),
    })
    await openMemberships(user)
    expect(await screen.findByText(/you are not allowed to view this list/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /My Memberships/ })).toBeInTheDocument()
  })

  it('shows the server message for other failures', async () => {
    const { user } = await loginAs('Admin', {
      'GET /memberships/user/1': () => text('Database down', 500),
    })
    await openMemberships(user)
    expect(await screen.findByText('Error fetching memberships: Database down')).toBeInTheDocument()
  })

  it('reports an unexpected payload instead of silently showing an empty list', async () => {
    const { user } = await loginAs('Admin', {
      'GET /memberships/user/1': () => json({ not: 'a list' }),
    })
    await openMemberships(user)
    expect(await screen.findByText(/unexpected response from the server/)).toBeInTheDocument()
  })

  it('still lists memberships on success', async () => {
    const { user } = await loginAs('Admin', {
      'GET /memberships/user/1': () => json([membershipOf(1, 'Chess Club')]),
    })
    await openMemberships(user)
    expect(await screen.findByText('Chess Club')).toBeInTheDocument()
  })
})

describe('View Activities club filter is not overwritten', () => {
  const filterHandlers = {
    'GET /activities/club/1?page=0&size=100': () =>
      json(springPage([{ id: 7, title: 'Club1 only', club: { id: 1 } }], 0, 1, 100)),
    [`GET ${ACTIVITIES}?page=0&size=100`]: () =>
      json(springPage([{ id: 99, title: 'Unfiltered other', club: { id: 2 } }], 0, 1, 100)),
  }
  const viewChessActivities = async (user) => {
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    const row = (await screen.findByText('Chess Club')).closest('li')
    await user.click(within(row).getByRole('button', { name: 'View Activities' }))
    await screen.findByText('Showing activities for club 1.')
  }

  it('keeps only the selected club activities and never reloads the unfiltered list', async () => {
    const { user, calls } = await loginAs('Admin', filterHandlers)
    await viewChessActivities(user)
    expect(await screen.findByText('Club1 only')).toBeInTheDocument()
    // Give a (buggy) second, unfiltered load time to land and overwrite the list.
    await settle()
    expect(screen.getByText('Club1 only')).toBeInTheDocument()
    expect(screen.queryByText('Unfiltered other')).not.toBeInTheDocument()
    expect(calls.map((c) => c.path).filter((p) => p.startsWith('/activities/'))).toEqual([
      '/activities/club/1?page=0&size=100',
    ])
    expect(screen.getByText('Filtered to club ID 1.')).toBeInTheDocument()
  })

  it('Show all activities removes the filter and loads every activity', async () => {
    const { user } = await loginAs('Admin', filterHandlers)
    await viewChessActivities(user)
    await screen.findByText('Club1 only')
    await user.click(screen.getByRole('button', { name: 'Show all activities' }))
    expect(await screen.findByText('Unfiltered other')).toBeInTheDocument()
    expect(screen.queryByText('Club1 only')).not.toBeInTheDocument()
    expect(screen.queryByText(/Filtered to club ID/)).not.toBeInTheDocument()
  })

  it('Go to Activity Management always starts unfiltered', async () => {
    const { user } = await loginAs('Admin', filterHandlers)
    await viewChessActivities(user)
    await screen.findByText('Club1 only')
    await user.click(screen.getByRole('button', { name: 'Back to Dashboard' }))
    await user.click(screen.getByRole('button', { name: 'Go to Activity Management' }))
    expect(await screen.findByText('Unfiltered other')).toBeInTheDocument()
    expect(screen.queryByText('Club1 only')).not.toBeInTheDocument()
  })

  it('refreshes inside the filter after creating an activity', async () => {
    const { user, calls } = await loginAs('Admin', {
      ...filterHandlers,
      'POST /activities': () => json({ id: 8, title: 'New one', club: { id: 1 } }),
    })
    await viewChessActivities(user)
    await screen.findByText('Club1 only')
    await user.type(screen.getByLabelText('Club ID'), '1')
    await user.type(screen.getByLabelText('Activity title'), 'New one')
    await user.click(screen.getByRole('button', { name: 'Create Activity' }))
    await screen.findByText(/Activity created: New one/)
    await settle()
    const activityGets = calls.filter((c) => c.method === 'GET' && c.path.startsWith('/activities/')).map((c) => c.path)
    expect(activityGets).toEqual(Array(2).fill('/activities/club/1?page=0&size=100'))
    expect(screen.queryByText('Unfiltered other')).not.toBeInTheDocument()
  })
})

describe('Create Club validation', () => {
  const openClubs = async (user) => {
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    await screen.findByText('Chess Club')
  }
  const postCount = (calls) => calls.filter((c) => c.method === 'POST' && c.path === '/clubs').length

  it('sends nothing and shows an inline error for an empty or blank name', async () => {
    const { user, calls } = await loginAs('Admin')
    await openClubs(user)
    await user.click(screen.getByRole('button', { name: 'Create Club' }))
    expect(await screen.findByText('Club name is required.')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Club Name')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByPlaceholderText('Club Name')).toHaveFocus()
    await user.type(screen.getByPlaceholderText('Club Name'), '   ')
    await user.click(screen.getByRole('button', { name: 'Create Club' }))
    expect(screen.getByText('Club name is required.')).toBeInTheDocument()
    expect(postCount(calls)).toBe(0)
  })

  it('rejects names and descriptions longer than 255 characters', async () => {
    const { user, calls } = await loginAs('Admin')
    await openClubs(user)
    fireEvent.change(screen.getByPlaceholderText('Club Name'), { target: { value: 'x'.repeat(256) } })
    fireEvent.change(screen.getByPlaceholderText('Description'), { target: { value: 'y'.repeat(256) } })
    await user.click(screen.getByRole('button', { name: 'Create Club' }))
    expect(await screen.findByText('Club name must be 255 characters or fewer.')).toBeInTheDocument()
    expect(screen.getByText('Description must be 255 characters or fewer.')).toBeInTheDocument()
    expect(postCount(calls)).toBe(0)
  })

  it('clears an error as soon as the field is edited', async () => {
    const { user } = await loginAs('Admin')
    await openClubs(user)
    await user.click(screen.getByRole('button', { name: 'Create Club' }))
    await screen.findByText('Club name is required.')
    await user.type(screen.getByPlaceholderText('Club Name'), 'F')
    expect(screen.queryByText('Club name is required.')).not.toBeInTheDocument()
  })

  it('sends trimmed values with the leader id, resets the form and reloads the list', async () => {
    const { user, calls } = await loginAs('Admin', {
      'POST /clubs': () => json({ id: 3, name: 'Film', description: 'Movies' }),
    })
    await openClubs(user)
    await user.type(screen.getByPlaceholderText('Club Name'), '  Film  ')
    await user.type(screen.getByPlaceholderText('Description'), ' Movies ')
    await user.click(screen.getByRole('button', { name: 'Create Club' }))
    expect(await screen.findByText('Club created: Film (ID: 3)')).toBeInTheDocument()
    expect(calls.find((c) => c.method === 'POST' && c.path === '/clubs').body).toEqual({
      name: 'Film',
      description: 'Movies',
      leaderId: 1,
    })
    expect(screen.getByPlaceholderText('Club Name')).toHaveValue('')
  })

  it('allows an empty description', async () => {
    const { user, calls } = await loginAs('Admin', {
      'POST /clubs': () => json({ id: 4, name: 'Solo' }),
    })
    await openClubs(user)
    await user.type(screen.getByPlaceholderText('Club Name'), 'Solo')
    await user.click(screen.getByRole('button', { name: 'Create Club' }))
    await screen.findByText('Club created: Solo (ID: 4)')
    expect(calls.find((c) => c.method === 'POST' && c.path === '/clubs').body.description).toBe('')
  })

  it('sends one request for a rapid double submit', async () => {
    let release
    const pending = new Promise((resolve) => { release = () => resolve(json({ id: 5, name: 'Once' })) })
    const { user, calls } = await loginAs('Admin', { 'POST /clubs': () => pending })
    await openClubs(user)
    await user.type(screen.getByPlaceholderText('Club Name'), 'Once')
    const form = screen.getByPlaceholderText('Club Name').closest('form')
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(postCount(calls)).toBe(1)
    expect(screen.getByRole('button', { name: 'Create Club' })).toBeDisabled()
    release()
    await screen.findByText('Club created: Once (ID: 5)')
    expect(postCount(calls)).toBe(1)
  })

  it('keeps the input when the backend rejects the club', async () => {
    const { user } = await loginAs('Admin', { 'POST /clubs': () => text('Duplicate name', 400) })
    await openClubs(user)
    await user.type(screen.getByPlaceholderText('Club Name'), 'Dup')
    await user.click(screen.getByRole('button', { name: 'Create Club' }))
    expect(await screen.findByText('Create Club Error: Duplicate name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Club Name')).toHaveValue('Dup')
  })
})

describe('in-flight requests are cancelled', () => {
  // Wraps the installed fetch: matching requests never resolve; they reject when aborted.
  function hang(keys) {
    const inner = globalThis.fetch
    const signals = {}
    vi.stubGlobal('fetch', (url, init = {}) => {
      const path = String(url).replace('http://localhost:8082/api', '')
      const key = `${init.method ?? 'GET'} ${path}`
      if (!keys.includes(key)) return inner(url, init)
      signals[key] = init.signal
      return new Promise((_, reject) => {
        init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
      })
    })
    return signals
  }

  it('leaving the Clubs page aborts the clubs request and shows no error', async () => {
    const { user } = await loginAs('Admin')
    const signals = hang(['GET /clubs/getclubs?page=0'])
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    await screen.findByRole('button', { name: 'Back to Dashboard' })
    const signal = signals['GET /clubs/getclubs?page=0']
    expect(signal).toBeDefined()
    expect(signal.aborted).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Back to Dashboard' }))
    expect(signal.aborted).toBe(true)
    await settle()
    expect(screen.queryByText(/Error fetching clubs/)).not.toBeInTheDocument()
    expect(screen.queryByText(/cancelled/)).not.toBeInTheDocument()
  })

  it('leaving the Activities page aborts the activities load', async () => {
    const { user } = await loginAs('Admin')
    const signals = hang([`GET ${ACTIVITIES}?page=0&size=100`])
    await user.click(screen.getByRole('button', { name: 'Go to Activity Management' }))
    await screen.findByText('Activities List')
    const signal = signals[`GET ${ACTIVITIES}?page=0&size=100`]
    expect(signal.aborted).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Back to Dashboard' }))
    expect(signal.aborted).toBe(true)
    await settle()
    expect(screen.queryByText(/Error fetching/)).not.toBeInTheDocument()
  })

  it('leaving the Memberships page aborts the request without clearing or reporting', async () => {
    const { user } = await loginAs('Admin')
    const signals = hang(['GET /memberships/user/1'])
    await user.click(screen.getByRole('button', { name: 'View My Memberships' }))
    await screen.findByText('Clubs I Have Joined')
    const signal = signals['GET /memberships/user/1']
    await user.click(screen.getByRole('button', { name: 'Back to Dashboard' }))
    expect(signal.aborted).toBe(true)
    await settle()
    expect(screen.queryByText(/Error fetching memberships/)).not.toBeInTheDocument()
  })

  it('unmounting aborts an in-flight write and reports nothing', async () => {
    const { user } = await loginAs('Admin')
    const signals = hang(['POST /clubs'])
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    await screen.findByText('Chess Club')
    await user.type(screen.getByPlaceholderText('Club Name'), 'Late')
    await user.click(screen.getByRole('button', { name: 'Create Club' }))
    const signal = signals['POST /clubs']
    expect(signal.aborted).toBe(false)
    cleanup()
    expect(signal.aborted).toBe(true)
    await settle()
  })

  it('a write is NOT cancelled by changing page (only by unmount)', async () => {
    const { user } = await loginAs('Admin')
    const signals = hang(['POST /clubs'])
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    await screen.findByText('Chess Club')
    await user.type(screen.getByPlaceholderText('Club Name'), 'Keep')
    await user.click(screen.getByRole('button', { name: 'Create Club' }))
    await user.click(screen.getByRole('button', { name: 'Back to Dashboard' }))
    expect(signals['POST /clubs'].aborted).toBe(false)
  })

  it('works under React StrictMode (effects run twice) - lists still load', async () => {
    const { user } = await loginAs('Admin', {}, { strict: true })
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    expect(await screen.findByText('Chess Club')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to Dashboard' }))
    await user.click(screen.getByRole('button', { name: 'View My Memberships' }))
    expect(await screen.findByText('You have not joined any clubs yet.')).toBeInTheDocument()
  })
})
