import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditActivityModal from './EditActivityModal.jsx'

const activity = { id: 7, title: 'Opening Match', description: 'First game', date: '2026-03-01' }

describe('EditActivityModal (REQ-008)', () => {
  it('is an accessible dialog prefilled with the activity values; the date array form is accepted', () => {
    render(<EditActivityModal activity={{ ...activity, date: [2026, 3, 1] }} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('dialog', { name: 'Edit activity' })).toBeInTheDocument()
    expect(screen.getByLabelText('Activity title')).toHaveValue('Opening Match')
    expect(screen.getByLabelText('Description')).toHaveValue('First game')
    expect(screen.getByLabelText('Date (optional)')).toHaveValue('2026-03-01')
  })

  it('submits cleaned values', async () => {
    const onSubmit = vi.fn()
    render(<EditActivityModal activity={activity} onSubmit={onSubmit} onCancel={vi.fn()} />)
    const user = userEvent.setup()
    await user.clear(screen.getByLabelText('Date (optional)'))
    await user.type(screen.getByLabelText('Activity title'), ' v2 ')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Opening Match v2', description: 'First game', date: null })
  })

  it('does not submit invalid input and clears the error when the field is edited', async () => {
    const onSubmit = vi.fn()
    render(<EditActivityModal activity={activity} onSubmit={onSubmit} onCancel={vi.fn()} />)
    const user = userEvent.setup()
    await user.clear(screen.getByLabelText('Activity title'))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Activity title is required.')
    expect(screen.getByLabelText('Activity title')).toHaveAttribute('aria-invalid', 'true')
    expect(onSubmit).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText('Activity title'), 'x')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('Cancel and Escape call onCancel; Save is disabled while submitting', async () => {
    const onCancel = vi.fn()
    const { rerender } = render(<EditActivityModal activity={activity} onSubmit={vi.fn()} onCancel={onCancel} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(2)
    rerender(<EditActivityModal activity={activity} onSubmit={vi.fn()} onCancel={onCancel} submitting />)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })
})
