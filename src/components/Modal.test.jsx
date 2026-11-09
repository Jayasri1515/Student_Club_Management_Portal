import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from './Modal.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(true)}>Open dialog</button>
      {open && (
        <Modal title="Sample dialog" onClose={() => setOpen(false)}>
          <input aria-label="First field" />
          <button>Last action</button>
        </Modal>
      )}
    </div>
  )
}

describe('Modal accessibility', () => {
  it('exposes role=dialog, aria-modal and is labelled by its title', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Open dialog' }))
    const dialog = screen.getByRole('dialog', { name: 'Sample dialog' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('moves focus into the dialog when opened', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Open dialog' }))
    expect(screen.getByLabelText('First field')).toHaveFocus()
  })

  it('closes on ESC and returns focus to the trigger', async () => {
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Open dialog' })
    await userEvent.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes with the close button and returns focus to the trigger', async () => {
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Open dialog' })
    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('traps Tab and Shift+Tab inside the dialog', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Open dialog' }))
    const closeButton = screen.getByRole('button', { name: 'Close dialog' })
    const lastAction = screen.getByRole('button', { name: 'Last action' })
    lastAction.focus()
    await userEvent.tab()
    expect(closeButton).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(lastAction).toHaveFocus()
  })
})

describe('ConfirmDialog', () => {
  it('shows the message and fires confirm / cancel callbacks', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<ConfirmDialog title="Delete club" message="Really delete?" confirmLabel="Delete" onConfirm={onConfirm} onCancel={onCancel} />)
    expect(screen.getByRole('dialog', { name: 'Delete club' })).toHaveTextContent('Really delete?')
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
