// CR-006: modal focus management, Escape handling and ARIA attributes.
import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from './Modal.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

describe('Modal (CR-006)', () => {
  it('supports aria-describedby', () => {
    render(
      <Modal title="Info" onClose={() => {}} describedBy="desc">
        <p id="desc">Details here</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'Info' })).toHaveAccessibleDescription('Details here')
  })

  it('focuses the element marked data-autofocus before the first field', () => {
    render(
      <Modal title="Pick" onClose={() => {}}>
        <input aria-label="Field" />
        <button data-autofocus>Safe choice</button>
      </Modal>,
    )
    expect(screen.getByRole('button', { name: 'Safe choice' })).toHaveFocus()
  })

  it('falls back to the first focusable element when there is no form field', () => {
    render(
      <Modal title="Buttons only" onClose={() => {}}>
        <button>Alpha</button>
      </Modal>,
    )
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus()
  })

  it('ESC only closes the top-most dialog when dialogs are stacked', async () => {
    const onCloseOuter = vi.fn()
    const onCloseInner = vi.fn()
    render(
      <>
        <Modal title="Outer" onClose={onCloseOuter}><input aria-label="outer field" /></Modal>
        <Modal title="Inner" onClose={onCloseInner}><input aria-label="inner field" /></Modal>
      </>,
    )
    await userEvent.keyboard('{Escape}')
    expect(onCloseInner).toHaveBeenCalledTimes(1)
    expect(onCloseOuter).not.toHaveBeenCalled()
  })

  it('after the top dialog closes, ESC reaches the next one', async () => {
    function Stack() {
      const [inner, setInner] = useState(true)
      const [outer, setOuter] = useState(true)
      return (
        <>
          {outer && <Modal title="Outer" onClose={() => setOuter(false)}><input aria-label="outer field" /></Modal>}
          {inner && <Modal title="Inner" onClose={() => setInner(false)}><input aria-label="inner field" /></Modal>}
        </>
      )
    }
    render(<Stack />)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Inner' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Outer' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('stops reacting to ESC after it is unmounted (listener removed)', async () => {
    const onClose = vi.fn()
    const { unmount } = render(<Modal title="Once" onClose={onClose}><input aria-label="f" /></Modal>)
    unmount()
    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('pulls focus back into the dialog on Tab when focus has escaped to the page', () => {
    render(
      <>
        <button>Outside</button>
        <Modal title="Trap" onClose={() => {}}>
          <input aria-label="first" />
          <button>Last</button>
        </Modal>
      </>,
    )
    screen.getByRole('button', { name: 'Outside' }).focus()
    fireEvent.keyDown(document.activeElement, { key: 'Tab' })
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus()

    screen.getByRole('button', { name: 'Outside' }).focus()
    fireEvent.keyDown(document.activeElement, { key: 'Tab', shiftKey: true })
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus()
  })

  it('does not close on a backdrop click when closeOnBackdrop is false', () => {
    const onClose = vi.fn()
    const { container } = render(<Modal title="Sticky" onClose={onClose} closeOnBackdrop={false}><input aria-label="f" /></Modal>)
    fireEvent.mouseDown(container.querySelector('.popup-backdrop'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes on a backdrop click by default but not on clicks inside the dialog', () => {
    const onClose = vi.fn()
    const { container } = render(<Modal title="Default" onClose={onClose}><input aria-label="f" /></Modal>)
    fireEvent.mouseDown(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.mouseDown(container.querySelector('.popup-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('ConfirmDialog (CR-006)', () => {
  const renderConfirm = (props = {}) =>
    render(<ConfirmDialog title="Delete club" message="This cannot be undone." confirmLabel="Delete" onConfirm={() => {}} onCancel={() => {}} {...props} />)

  it('describes the dialog with its message and focuses the safe Cancel button first', () => {
    renderConfirm()
    expect(screen.getByRole('dialog', { name: 'Delete club' })).toHaveAccessibleDescription('This cannot be undone.')
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('does not confirm when ESC is pressed', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    renderConfirm({ onConfirm, onCancel })
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('Enter on the initially focused button cancels instead of deleting', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    renderConfirm({ onConfirm, onCancel })
    await userEvent.keyboard('{Enter}')
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
