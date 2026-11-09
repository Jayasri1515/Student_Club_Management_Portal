import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ActivityItem from './ActivityItem.jsx'

const activity = { id: 7, title: 'Opening Match', club: { id: 42, name: 'Chess Club' } }
const renderItem = (props) => render(<ul><ActivityItem activity={activity} {...props} /></ul>)

describe('ActivityItem actions (REQ-008)', () => {
  it('shows no buttons when no handlers are supplied (read-only list)', () => {
    renderItem({})
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onEdit / onDelete with the activity when permitted', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    renderItem({ onEdit, onDelete, canEdit: true, canDelete: true })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit activity Opening Match' }))
    await user.click(screen.getByRole('button', { name: 'Delete activity Opening Match' }))
    expect(onEdit).toHaveBeenCalledWith(activity)
    expect(onDelete).toHaveBeenCalledWith(activity)
  })

  it('disables the buttons when not permitted', () => {
    renderItem({ onEdit: vi.fn(), onDelete: vi.fn(), canEdit: false, canDelete: false })
    expect(screen.getByRole('button', { name: 'Edit activity Opening Match' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete activity Opening Match' })).toBeDisabled()
  })

  it('explains that only Admins can edit or delete when the buttons are disabled', () => {
    renderItem({ onEdit: vi.fn(), onDelete: vi.fn(), canEdit: false, canDelete: false })
    expect(screen.getByRole('button', { name: 'Edit activity Opening Match' })).toHaveAttribute('title', 'Only Admins can edit activities')
    expect(screen.getByRole('button', { name: 'Delete activity Opening Match' })).toHaveAttribute('title', 'Only Admins can delete activities')
  })

  it('disables the buttons while busy and when the activity has no id', () => {
    const { unmount } = renderItem({ onEdit: vi.fn(), onDelete: vi.fn(), canEdit: true, canDelete: true, busy: true })
    expect(screen.getByRole('button', { name: 'Edit activity Opening Match' })).toBeDisabled()
    unmount()
    render(<ul><ActivityItem activity={{ title: 'No id' }} onEdit={vi.fn()} onDelete={vi.fn()} canEdit canDelete /></ul>)
    expect(screen.getByRole('button', { name: 'Edit activity No id' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete activity No id' })).toBeDisabled()
  })
})
