// Regression tests for the code review findings CR-001 .. CR-006, at application level.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { installBackend, json, text } from './test/mockBackend.js'

const users = {
  Admin: { id: 1, username: 'alice', role: 'Admin', email: 'a@x.com' },
  Leader: { id: 2, username: 'larry', role: 'Leader', email: 'l@x.com' },
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

async function loginAs(role, extraHandlers = {}) {
  const backend = installBackend({
    'POST /auth/login': () => json(users[role]),
    'GET /clubs/getclubs?page=0': () => json(springPage(clubList, 0, 1)),
    [`GET /memberships/user/${users[role].id}`]: () => json([]),
    [`GET ${ACTIVITIES}?page=0&size=100`]: () => json(springPage([], 0, 1, 100)),
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

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('CR-001 join button ID handling', () => {
  it('marks a club as joined when the membership club id is a string and the club id a number', async () => {
    const { user } = await loginAs('Student', {
      'GET /memberships/user/5': () => json([{ id: 3, club: { id: '2', name: 'Robotics' } }]),
    })
    await user.click(screen.getByRole('button', { name: 'Go to Join a Club' }))
    expect(await screen.findByRole('button', { name: 'Already joined Robotics' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Join Chess Club' })).toBeEnabled()
  })

  it('marks a club as joined when the club id is a string and the membership club id a number', async () => {
    const { user } = await loginAs('Student', {
      'GET /clubs/getclubs?page=0': () => json(springPage([{ id: '1', name: 'Chess Club' }, { id: '2', name: 'Robotics' }], 0, 1)),
      'GET /memberships/user/5': () => json([{ id: 3, club: { id: 1 } }]),
    })
    await user.click(screen.getByRole('button', { name: 'Go to Join a Club' }))
    expect(await screen.findByRole('button', { name: 'Already joined Chess Club' })).toBeDisabled()
  })

  it('disables the clicked Join button while its request is pending (numeric club id)', async () => {
    let release
    const { user } = await loginAs('Student', {
      'POST /memberships/join': () => new Promise((resolve) => { release = () => resolve(json({ id: 9, club: clubList[1] })) }),
    })
    await user.click(screen.getByRole('button', { name: 'Go to Join a Club' }))
    await user.click(await screen.findByRole('button', { name: 'Join Robotics' }))
    expect(screen.getByRole('button', { name: 'Join Robotics' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Join Chess Club' })).toBeEnabled()
    release()
    expect(await screen.findByText('Successfully joined Robotics.')).toBeInTheDocument()
  })

  it('sends only one join request for a rapid double click', async () => {
    let release
    const { user, calls } = await loginAs('Student', {
      'POST /memberships/join': () => new Promise((resolve) => { release = () => resolve(json({ id: 9, club: clubList[1] })) }),
    })
    await user.click(screen.getByRole('button', { name: 'Go to Join a Club' }))
    const button = await screen.findByRole('button', { name: 'Join Robotics' })
    // Two click events in the same tick, before React can re-render the disabled state.
    fireEvent.click(button)
    fireEvent.click(button)
    release()
    expect(await screen.findByText('Successfully joined Robotics.')).toBeInTheDocument()
    expect(calls.filter((c) => c.method === 'POST' && c.path === '/memberships/join')).toHaveLength(1)
  })

  it('allows joining again after a failed attempt', async () => {
    let attempts = 0
    const { user, calls } = await loginAs('Student', {
      'POST /memberships/join': () => {
        attempts += 1
        return attempts === 1 ? text('Server busy', 500) : json({ id: 9, club: clubList[0] })
      },
    })
    await user.click(screen.getByRole('button', { name: 'Go to Join a Club' }))
    await user.click(await screen.findByRole('button', { name: 'Join Chess Club' }))
    expect(await screen.findByText('Failed to join club: Server busy')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Join Chess Club' }))
    expect(await screen.findByText('Successfully joined Chess Club.')).toBeInTheDocument()
    expect(calls.filter((c) => c.path === '/memberships/join')).toHaveLength(2)
  })
})

describe('CR-002 activities pagination', () => {
  it('loads every page of activities so no records are omitted', async () => {
    const { user, calls } = await loginAs('Leader', {
      [`GET ${ACTIVITIES}?page=0&size=100`]: () =>
        json(springPage([{ id: 1, title: 'A1', club: { id: 1 } }, { id: 2, title: 'A2', club: { id: 1 } }], 0, 3, 100)),
      [`GET ${ACTIVITIES}?page=1&size=100`]: () => json(springPage([{ id: 3, title: 'A3', club: { id: 1 } }], 1, 3, 100)),
      [`GET ${ACTIVITIES}?page=2&size=100`]: () => json(springPage([{ id: 4, title: 'A4', club: { id: 2 } }], 2, 3, 100)),
    })
    await user.click(screen.getByRole('button', { name: 'Go to Activity Management' }))
    expect(await screen.findByText('A4')).toBeInTheDocument()
    for (const title of ['A1', 'A2', 'A3', 'A4']) expect(screen.getByText(title)).toBeInTheDocument()
    const pages = calls.filter((c) => c.path.startsWith(ACTIVITIES)).map((c) => c.path)
    expect(pages).toEqual([`${ACTIVITIES}?page=0&size=100`, `${ACTIVITIES}?page=1&size=100`, `${ACTIVITIES}?page=2&size=100`])
  })

  it('requests only one page when the first page is the last (boundary)', async () => {
    const { user, calls } = await loginAs('Leader', {
      [`GET ${ACTIVITIES}?page=0&size=100`]: () => json(springPage([{ id: 1, title: 'Only one', club: { id: 1 } }], 0, 1, 100)),
    })
    await user.click(screen.getByRole('button', { name: 'Go to Activity Management' }))
    expect(await screen.findByText('Only one')).toBeInTheDocument()
    expect(calls.filter((c) => c.path.startsWith(ACTIVITIES))).toHaveLength(1)
  })

  it('shows the empty state for an empty response', async () => {
    const { user } = await loginAs('Leader')
    await user.click(screen.getByRole('button', { name: 'Go to Activity Management' }))
    expect(await screen.findByText('No activities found.')).toBeInTheDocument()
  })

  it('reports an error instead of showing a partial list when a later page fails', async () => {
    const { user } = await loginAs('Leader', {
      [`GET ${ACTIVITIES}?page=0&size=100`]: () => json(springPage([{ id: 1, title: 'First page', club: { id: 1 } }], 0, 2, 100)),
      [`GET ${ACTIVITIES}?page=1&size=100`]: () => text('Database down', 500),
    })
    await user.click(screen.getByRole('button', { name: 'Go to Activity Management' }))
    expect(await screen.findByText('Error fetching all activities: Database down')).toBeInTheDocument()
    expect(screen.queryByText('First page')).not.toBeInTheDocument()
  })

  it('reports an unexpected response structure', async () => {
    const { user } = await loginAs('Leader', {
      [`GET ${ACTIVITIES}?page=0&size=100`]: () => json({ unexpected: true }),
    })
    await user.click(screen.getByRole('button', { name: 'Go to Activity Management' }))
    expect(await screen.findByText(/Error fetching all activities: Unexpected response/)).toBeInTheDocument()
  })

  it('loads every page of one club activity list', async () => {
    const { user, calls } = await loginAs('Admin', {
      'GET /activities/club/1?page=0&size=100': () => json(springPage([{ id: 7, title: 'Club1 A', club: { id: 1 } }], 0, 2, 100)),
      'GET /activities/club/1?page=1&size=100': () => json(springPage([{ id: 8, title: 'Club1 B', club: { id: 1 } }], 1, 2, 100)),
    })
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    const row = (await screen.findByText('Chess Club')).closest('li')
    await user.click(within(row).getByRole('button', { name: 'View Activities' }))
    await screen.findByText('Showing activities for club 1.')
    expect(calls.filter((c) => c.path.startsWith('/activities/club/1')).map((c) => c.path)).toEqual([
      '/activities/club/1?page=0&size=100',
      '/activities/club/1?page=1&size=100',
    ])
  })
})

describe('CR-003 clubs pagination', () => {
  const firstPage = () => json(springPage([{ id: 1, name: 'Chess Club' }, { id: 2, name: 'Robotics' }], 0, 2, 2))

  it('appends the next page, de-duplicates and hides Load more on the last page', async () => {
    const { user, calls } = await loginAs('Admin', {
      'GET /clubs/getclubs?page=0': firstPage,
      'GET /clubs/getclubs?page=1': () => json(springPage([{ id: 2, name: 'Robotics' }, { id: 3, name: 'Drama' }], 1, 2, 2)),
    })
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    await screen.findByText('Robotics')
    expect(screen.queryByText('Drama')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Load more clubs' }))
    expect(await screen.findByText('Drama')).toBeInTheDocument()
    expect(screen.getAllByText('Robotics')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Load more clubs' })).not.toBeInTheDocument()
    expect(calls.filter((c) => c.path.startsWith('/clubs/getclubs')).map((c) => c.path)).toEqual([
      '/clubs/getclubs?page=0',
      '/clubs/getclubs?page=1',
    ])
  })

  it('does not offer Load more when there is a single page', async () => {
    const { user } = await loginAs('Admin')
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    await screen.findByText('Chess Club')
    expect(screen.queryByRole('button', { name: 'Load more clubs' })).not.toBeInTheDocument()
  })

  it('requests the next page only once on a rapid double click', async () => {
    let release
    const { user, calls } = await loginAs('Admin', {
      'GET /clubs/getclubs?page=0': firstPage,
      'GET /clubs/getclubs?page=1': () => new Promise((resolve) => { release = () => resolve(json(springPage([{ id: 3, name: 'Drama' }], 1, 2, 2))) }),
    })
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    const more = await screen.findByRole('button', { name: 'Load more clubs' })
    fireEvent.click(more)
    fireEvent.click(more)
    release()
    expect(await screen.findByText('Drama')).toBeInTheDocument()
    expect(calls.filter((c) => c.path === '/clubs/getclubs?page=1')).toHaveLength(1)
  })

  it('keeps the loaded clubs and shows an error if loading more fails', async () => {
    const { user } = await loginAs('Admin', {
      'GET /clubs/getclubs?page=0': firstPage,
      'GET /clubs/getclubs?page=1': () => text('Timeout upstream', 504),
    })
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    await user.click(await screen.findByRole('button', { name: 'Load more clubs' }))
    expect(await screen.findByText('Error fetching clubs: Timeout upstream')).toBeInTheDocument()
    expect(screen.getByText('Robotics')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Load more clubs' })).toBeEnabled())
  })

  it('rejects a response that is not a page of clubs', async () => {
    const { user } = await loginAs('Admin', { 'GET /clubs/getclubs?page=0': () => json({ message: 'hello' }) })
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    expect(await screen.findByText('Error fetching clubs: unexpected response from the server.')).toBeInTheDocument()
    expect(screen.getByText('No clubs found.')).toBeInTheDocument()
  })

  it('supports page metadata nested under "page"', async () => {
    const { user } = await loginAs('Admin', {
      'GET /clubs/getclubs?page=0': () => json({ content: clubList, page: { number: 0, size: 2, totalElements: 3, totalPages: 2 } }),
    })
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    expect(await screen.findByRole('button', { name: 'Load more clubs' })).toBeInTheDocument()
  })
})

describe('CR-004 activity creation validation', () => {
  const openForm = async (extra = {}) => {
    const backend = await loginAs('Leader', extra)
    await backend.user.click(screen.getByRole('button', { name: 'Go to Activity Management' }))
    await screen.findByLabelText('Club ID')
    return backend
  }

  it('sends no request for an empty form and shows inline errors', async () => {
    const { user, calls } = await openForm()
    await user.click(screen.getByRole('button', { name: 'Create Activity' }))
    expect(screen.getByText('Club ID is required.')).toBeInTheDocument()
    expect(screen.getByText('Activity title is required.')).toBeInTheDocument()
    expect(calls.some((c) => c.method === 'POST' && c.path === '/activities')).toBe(false)
  })

  it('sends no request for a non-numeric club ID', async () => {
    const { user, calls } = await openForm()
    await user.type(screen.getByLabelText('Club ID'), 'abc')
    await user.type(screen.getByLabelText('Activity title'), 'Tournament')
    await user.click(screen.getByRole('button', { name: 'Create Activity' }))
    expect(screen.getByText('Club ID must be a positive whole number.')).toBeInTheDocument()
    expect(calls.some((c) => c.method === 'POST' && c.path === '/activities')).toBe(false)
  })

  it('keeps the input and shows the backend message when the club does not exist', async () => {
    const { user } = await openForm({ 'POST /activities': () => text('Invalid club ID.', 400) })
    await user.type(screen.getByLabelText('Club ID'), '999')
    await user.type(screen.getByLabelText('Activity title'), 'Ghost event')
    await user.click(screen.getByRole('button', { name: 'Create Activity' }))
    expect(await screen.findByText('Create Activity Error: Invalid club ID.')).toBeInTheDocument()
    expect(screen.getByLabelText('Activity title')).toHaveValue('Ghost event')
    expect(screen.getByLabelText('Club ID')).toHaveValue('999')
  })

  it('sends trimmed values with a numeric club id and refreshes the list', async () => {
    const { user, calls } = await openForm({ 'POST /activities': (body) => json({ id: 30, ...body, club: { id: 2 } }) })
    await user.type(screen.getByLabelText('Club ID'), ' 2 ')
    await user.type(screen.getByLabelText('Activity title'), '  Robot Day ')
    await user.click(screen.getByRole('button', { name: 'Create Activity' }))
    expect(await screen.findByText('Activity created: Robot Day (Club ID: 2)')).toBeInTheDocument()
    const post = calls.find((c) => c.method === 'POST' && c.path === '/activities')
    expect(post.body).toEqual({ title: 'Robot Day', description: '', club: { id: 2 } })
    expect(calls.filter((c) => c.path.startsWith(ACTIVITIES)).length).toBeGreaterThanOrEqual(2)
  })
})

describe('CR-006 accessibility of the login / register dialogs', () => {
  const openLogin = async () => {
    installBackend({})
    const user = userEvent.setup()
    const view = render(<App />)
    await user.click(screen.getByRole('button', { name: /please log in/i }))
    return { user, ...view }
  }

  it('opens the login popup as a labelled modal dialog with focus on the first field', async () => {
    await openLogin()
    const dialog = screen.getByRole('dialog', { name: /login/i })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByLabelText('Username')).toHaveFocus()
    expect(within(dialog).getByRole('button', { name: 'Close dialog' })).toBeInTheDocument()
  })

  it('closes the login popup with Escape', async () => {
    const { user } = await openLogin()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /please log in/i })).toBeInTheDocument()
  })

  it('does not close the login popup when the backdrop is clicked (typed input is kept)', async () => {
    const { user, container } = await openLogin()
    await user.type(screen.getByLabelText('Username'), 'sam')
    fireEvent.mouseDown(container.querySelector('.popup-backdrop'))
    expect(screen.getByRole('dialog', { name: /login/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toHaveValue('sam')
  })

  it('switches to a labelled register dialog and Escape closes it', async () => {
    const { user } = await openLogin()
    await user.click(screen.getByRole('button', { name: 'Go to Register' }))
    expect(screen.getByRole('dialog', { name: /register/i })).toHaveAttribute('aria-modal', 'true')
    expect(screen.queryByRole('dialog', { name: /login/i })).not.toBeInTheDocument()
    for (const label of ['Username', 'Password', 'Email', 'Role']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expect(screen.getByLabelText('I have an eye but cannot see. What am I?')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('the delete confirmation focuses Cancel, so Enter does not delete', async () => {
    const { user, calls } = await loginAs('Admin')
    await user.click(screen.getByRole('button', { name: 'Go to Club Management' }))
    const row = (await screen.findByText('Robotics')).closest('li')
    await user.click(within(row).getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete club' })
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    expect(dialog).toHaveAccessibleDescription(/Are you sure you want to delete "Robotics"/)
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)
  })
})
