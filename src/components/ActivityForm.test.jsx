// CR-004: Create Activity validation.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ActivityForm from './ActivityForm.jsx'

const setup = (props = {}) => {
  const onCreate = vi.fn().mockResolvedValue(true)
  render(<ActivityForm canCreate onCreate={onCreate} {...props} />)
  return { onCreate, user: userEvent.setup() }
}

const fill = async (user, { clubId, title, description }) => {
  if (clubId !== undefined) await user.type(screen.getByLabelText('Club ID'), clubId)
  if (title !== undefined) await user.type(screen.getByLabelText('Activity title'), title)
  if (description !== undefined) await user.type(screen.getByLabelText('Activity description'), description)
}

describe('ActivityForm', () => {
  it('blocks an empty submission, shows field errors and focuses the first invalid field', async () => {
    const { onCreate, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Create Activity' }))
    expect(onCreate).not.toHaveBeenCalled()
    expect(screen.getByText('Club ID is required.')).toBeInTheDocument()
    expect(screen.getByText('Activity title is required.')).toBeInTheDocument()
    const clubInput = screen.getByLabelText('Club ID')
    expect(clubInput).toHaveAttribute('aria-invalid', 'true')
    expect(clubInput).toHaveAccessibleDescription('Club ID is required.')
    expect(clubInput).toHaveFocus()
  })

  it('rejects a non-numeric club selection', async () => {
    const { onCreate, user } = setup()
    await fill(user, { clubId: 'chess', title: 'Tournament' })
    await user.click(screen.getByRole('button', { name: 'Create Activity' }))
    expect(onCreate).not.toHaveBeenCalled()
    expect(screen.getByText('Club ID must be a positive whole number.')).toBeInTheDocument()
    expect(screen.queryByText('Activity title is required.')).not.toBeInTheDocument()
  })

  it('rejects a whitespace-only title', async () => {
    const { onCreate, user } = setup()
    await fill(user, { clubId: '2', title: '   ' })
    await user.click(screen.getByRole('button', { name: 'Create Activity' }))
    expect(onCreate).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Activity title')).toHaveFocus()
  })

  it('clears a field error as soon as that field is edited', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Create Activity' }))
    await user.type(screen.getByLabelText('Club ID'), '1')
    expect(screen.queryByText('Club ID is required.')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Club ID')).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByText('Activity title is required.')).toBeInTheDocument()
  })

  it('submits cleaned values (numeric club ID, trimmed text) and resets on success', async () => {
    const { onCreate, user } = setup()
    await fill(user, { clubId: ' 12 ', title: ' Tournament ', description: ' Finals ' })
    await user.click(screen.getByRole('button', { name: 'Create Activity' }))
    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith({ clubId: 12, title: 'Tournament', description: 'Finals' })
    await waitFor(() => expect(screen.getByLabelText('Club ID')).toHaveValue(''))
    expect(screen.getByLabelText('Activity title')).toHaveValue('')
  })

  it('keeps the input when creation fails', async () => {
    const { user } = setup({ onCreate: vi.fn().mockResolvedValue(false) })
    await fill(user, { clubId: '3', title: 'Keep me' })
    await user.click(screen.getByRole('button', { name: 'Create Activity' }))
    expect(screen.getByLabelText('Activity title')).toHaveValue('Keep me')
  })

  it('allows an empty description', async () => {
    const { onCreate, user } = setup()
    await fill(user, { clubId: '3', title: 'No description' })
    await user.click(screen.getByRole('button', { name: 'Create Activity' }))
    expect(onCreate).toHaveBeenCalledWith({ clubId: 3, title: 'No description', description: '' })
  })

  it('prevents a duplicate submission while the first is still in flight', async () => {
    let finish
    const onCreate = vi.fn(() => new Promise((resolve) => { finish = resolve }))
    const user = userEvent.setup()
    render(<ActivityForm canCreate onCreate={onCreate} />)
    await fill(user, { clubId: '3', title: 'Once' })
    const form = screen.getByRole('button', { name: 'Create Activity' }).closest('form')
    form.requestSubmit()
    form.requestSubmit()
    expect(onCreate).toHaveBeenCalledTimes(1)
    finish(true)
    expect(await screen.findByDisplayValue('', { selector: '[data-field="clubId"]' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Activity' })).toBeEnabled()
  })

  it('does nothing when the user may not create activities', async () => {
    const { onCreate, user } = setup({ canCreate: false })
    const button = screen.getByRole('button', { name: 'Create Activity' })
    expect(button).toBeDisabled()
    await user.click(button)
    expect(onCreate).not.toHaveBeenCalled()
  })
})
