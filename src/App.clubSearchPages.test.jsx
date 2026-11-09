// REQ-005: searching on the Join page loads the remaining club pages, so a club that is not
// on the first page can still be found.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { installBackend, json, text } from './test/mockBackend.js'

const student = { id: 5, username: 'sam', role: 'Student', email: 's@x.com' }
const club = (id, name) => ({ id, name, description: `${name} description` })
const pageOf = (content, number, totalPages) => ({ content, number, size: 2, totalPages, last: number + 1 >= totalPages })

async function openJoinPage(handlers) {
  const backend = installBackend({
    'POST /auth/login': () => json(student),
    'GET /memberships/user/5': () => json([]),
    ...handlers,
  })
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: /please log in/i }))
  await user.type(screen.getByPlaceholderText('Username'), 'sam')
  await user.type(screen.getByPlaceholderText('Password'), 'secret')
  await user.click(screen.getByRole('button', { name: 'Login' }))
  await screen.findByText(/Login successful/)
  await user.click(screen.getByRole('button', { name: 'Go to Join a Club' }))
  return { user, ...backend }
}

const threePages = {
  'GET /clubs/getclubs?page=0': () => json(pageOf([club(1, 'Chess'), club(2, 'Robotics')], 0, 3)),
  'GET /clubs/getclubs?page=1': () => json(pageOf([club(3, 'Drama'), club(4, 'Debate')], 1, 3)),
  'GET /clubs/getclubs?page=2': () => json(pageOf([club(5, 'Origami')], 2, 3)),
}
const clubPages = (calls) => calls.filter((c) => c.path.startsWith('/clubs/getclubs')).map((c) => c.path.split('=')[1])

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Join page search across pages', () => {
  it('finds a club that is only on the last page and loads each page once', async () => {
    const { user, calls } = await openJoinPage(threePages)
    await screen.findByRole('button', { name: 'Join Chess' })
    expect(clubPages(calls)).toEqual(['0'])

    await user.type(screen.getByRole('searchbox', { name: /search clubs/i }), 'origami')

    expect(await screen.findByRole('button', { name: 'Join Origami' })).toBeInTheDocument()
    expect(clubPages(calls)).toEqual(['0', '1', '2'])
    expect(screen.queryByRole('button', { name: 'Join Chess' })).not.toBeInTheDocument()
  })

  it('does not load more pages when the search box is empty', async () => {
    const { calls } = await openJoinPage(threePages)
    await screen.findByRole('button', { name: 'Join Chess' })
    expect(clubPages(calls)).toEqual(['0'])
  })

  it('stops after a failed page instead of retrying in a loop, and keeps what it has', async () => {
    let failures = 0
    const { user, calls } = await openJoinPage({
      ...threePages,
      'GET /clubs/getclubs?page=1': () => {
        failures += 1
        return text('Server exploded', 500)
      },
    })
    await screen.findByRole('button', { name: 'Join Chess' })
    await user.type(screen.getByRole('searchbox', { name: /search clubs/i }), 'origami')

    await screen.findByText(/Error fetching clubs/)
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(failures).toBe(1)
    expect(clubPages(calls)).toEqual(['0', '1'])
    expect(screen.getByRole('button', { name: 'Load more clubs' })).toBeEnabled()
  })
})
