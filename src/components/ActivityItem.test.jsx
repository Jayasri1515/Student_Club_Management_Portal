import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ActivityItem from './ActivityItem.jsx'

const renderItem = (activity) => render(<ul><ActivityItem activity={activity} /></ul>)

describe('ActivityItem', () => {
  it('shows the activity ID and the club ID from the right fields', () => {
    renderItem({ id: 7, title: 'Opening Match', description: 'First game', club: { id: 42, name: 'Chess Club' } })
    const item = screen.getByRole('listitem')
    expect(item).toHaveTextContent('Opening Match')
    expect(item).toHaveTextContent('Chess Club')
    expect(item).toHaveTextContent('Activity ID: 7')
    expect(item).toHaveTextContent('Club ID: 42')
    expect(item).not.toHaveTextContent('Club ID: 7')
  })

  it('does not crash when the club is null and shows placeholders', () => {
    renderItem({ id: 3, title: 'Orphan activity', club: null })
    const item = screen.getByRole('listitem')
    expect(item).toHaveTextContent('Activity ID: 3')
    expect(item).toHaveTextContent('Club ID: N/A')
    expect(item).toHaveTextContent('Unknown club')
  })

  it('does not crash on a nearly empty activity', () => {
    renderItem({})
    expect(screen.getByRole('listitem')).toHaveTextContent('Untitled activity')
  })
})
