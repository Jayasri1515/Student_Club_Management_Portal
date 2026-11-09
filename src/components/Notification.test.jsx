import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NotificationContainer from './Notification.jsx'
import { useNotifications } from '../hooks/useNotifications.js'

describe('NotificationContainer', () => {
  it('renders errors as role=alert and success/info as role=status', () => {
    render(
      <NotificationContainer
        notifications={[
          { id: 1, type: 'error', message: 'Boom' },
          { id: 2, type: 'success', message: 'Saved' },
          { id: 3, type: 'info', message: 'FYI' },
        ]}
        onDismiss={() => {}}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Boom')
    const statuses = screen.getAllByRole('status')
    expect(statuses).toHaveLength(2)
    expect(statuses[0]).toHaveTextContent('Saved')
    expect(statuses[0]).toHaveClass('notification-success')
  })

  it('calls onDismiss with the notification id when the dismiss button is used', async () => {
    const onDismiss = vi.fn()
    render(<NotificationContainer notifications={[{ id: 9, type: 'info', message: 'Hello' }]} onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: /dismiss notification/i }))
    expect(onDismiss).toHaveBeenCalledWith(9)
  })
})

describe('useNotifications', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds notifications of each type and dismisses them manually', () => {
    const { result } = renderHook(() => useNotifications())
    act(() => {
      result.current.success('ok')
      result.current.error('bad')
      result.current.info('note')
    })
    expect(result.current.notifications.map((n) => n.type)).toEqual(['success', 'error', 'info'])
    act(() => result.current.dismiss(result.current.notifications[1].id))
    expect(result.current.notifications.map((n) => n.type)).toEqual(['success', 'info'])
  })

  it('auto-dismisses notifications after their duration', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useNotifications({ success: 1000, error: 3000, info: 1000 }))
    act(() => {
      result.current.success('quick')
      result.current.error('slow')
    })
    expect(result.current.notifications).toHaveLength(2)
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.notifications.map((n) => n.message)).toEqual(['slow'])
    act(() => vi.advanceTimersByTime(2000))
    expect(result.current.notifications).toHaveLength(0)
  })
})
