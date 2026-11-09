// Login form state must not outlive the login: the password is not kept in React state
// after a successful login or logout, and the next login popup opens empty.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { installBackend, json } from './test/mockBackend.js'

const alice = { id: 1, username: 'alice', role: 'Admin' }
const page = (content) => ({ content, last: true, number: 0, size: 100 })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('login form reset', () => {
  it('opens empty after a successful login and logout', async () => {
    installBackend({
      'POST /auth/login': () => json(alice),
      'GET /clubs/getclubs?page=0': () => json(page([])),
      'GET /memberships/user/1': () => json([]),
      'GET /activities/getactivities?page=0&size=100': () => json(page([])),
    })
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /please log in/i }))
    await user.type(screen.getByPlaceholderText('Username'), 'alice')
    await user.type(screen.getByPlaceholderText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Login' }))
    await screen.findByText(/Login successful/)

    await user.click(screen.getByRole('button', { name: 'Logout' }))
    await user.click(screen.getByRole('button', { name: /please log in/i }))

    expect(screen.getByPlaceholderText('Username')).toHaveValue('')
    expect(screen.getByPlaceholderText('Password')).toHaveValue('')
  })
})
