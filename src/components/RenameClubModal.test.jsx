import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RenameClubModal from './RenameClubModal.jsx'

const club = { id: 4, name: 'Chess Club', description: 'Board games' }

const setup = (props = {}) => {
  const onSubmit = vi.fn()
  const onCancel = vi.fn()
  render(<RenameClubModal club={club} onSubmit={onSubmit} onCancel={onCancel} {...props} />)
  return { onSubmit, onCancel }
}

describe('RenameClubModal', () => {
  it('is an accessible dialog prefilled with the current name and focused', () => {
    setup()
    expect(screen.getByRole('dialog', { name: 'Rename club' })).toHaveAttribute('aria-modal', 'true')
    const input = screen.getByLabelText('New club name')
    expect(input).toHaveValue('Chess Club')
    expect(input).toHaveFocus()
  })

  it('submits the trimmed new name', async () => {
    const { onSubmit } = setup()
    const input = screen.getByLabelText('New club name')
    await userEvent.clear(input)
    await userEvent.type(input, '  Grandmasters  ')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith('Grandmasters')
  })

  it('validates a blank name, shows an error and does not submit', async () => {
    const { onSubmit } = setup()
    await userEvent.clear(screen.getByLabelText('New club name'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Club name is required.')
    expect(screen.getByLabelText('New club name')).toHaveAttribute('aria-invalid', 'true')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('cancels via the Cancel button and via ESC', async () => {
    const { onCancel } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('disables Save while submitting', () => {
    setup({ submitting: true })
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })
})
