import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClubBrowser from './ClubBrowser.jsx'

const clubs = [
  { id: 1, name: 'Chess Club', description: 'Board games' },
  { id: 2, name: 'Robotics', description: 'Build robots' },
  { id: 3, name: 'Drama', description: 'Stage plays' },
]

const setup = (props = {}) => {
  const onJoin = vi.fn()
  const onLoadMore = vi.fn()
  render(<ClubBrowser clubs={clubs} joinedClubIds={[]} canJoin onJoin={onJoin} onLoadMore={onLoadMore} {...props} />)
  return { onJoin, onLoadMore }
}

describe('ClubBrowser', () => {
  it('lists every club with a Join button', () => {
    setup()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Join Chess Club' })).toBeInTheDocument()
  })

  it('filters by name and description as the user types', async () => {
    setup()
    const search = screen.getByRole('searchbox', { name: /search clubs/i })
    await userEvent.type(search, 'robot')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('Robotics')).toBeInTheDocument()
    await userEvent.clear(search)
    await userEvent.type(search, 'stage')
    expect(screen.getByText('Drama')).toBeInTheDocument()
    expect(screen.queryByText('Robotics')).not.toBeInTheDocument()
  })

  it('shows an empty-search message when nothing matches', async () => {
    setup()
    await userEvent.type(screen.getByRole('searchbox'), 'zzzz')
    expect(screen.getByText('No clubs match your search.')).toBeInTheDocument()
  })

  it('calls onJoin with the club when Join is clicked (no manual ID needed)', async () => {
    const { onJoin } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Join Robotics' }))
    expect(onJoin).toHaveBeenCalledWith(clubs[1])
  })

  it('disables Join for clubs already joined', () => {
    setup({ joinedClubIds: [1] })
    expect(screen.getByRole('button', { name: 'Already joined Chess Club' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Join Drama' })).toBeEnabled()
  })

  it('disables every Join button when canJoin is false', () => {
    setup({ canJoin: false })
    screen.getAllByRole('button').forEach((button) => expect(button).toBeDisabled())
  })

  it('offers Load more only when more pages exist', async () => {
    const { onLoadMore } = setup({ hasMore: true })
    await userEvent.click(screen.getByRole('button', { name: /load more clubs/i }))
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('hides Load more when there are no more pages', () => {
    setup({ hasMore: false })
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
  })

  it('shows an empty message when there are no clubs', () => {
    setup({ clubs: [] })
    expect(screen.getByText('No clubs available.')).toBeInTheDocument()
  })
})

describe('ClubBrowser search across pages', () => {
  it('reports the search as active while there is text and inactive when cleared or unmounted', async () => {
    const onSearchActiveChange = vi.fn()
    const { unmount } = render(
      <ClubBrowser clubs={clubs} joinedClubIds={[]} canJoin onJoin={vi.fn()} onSearchActiveChange={onSearchActiveChange} />,
    )
    expect(onSearchActiveChange).toHaveBeenLastCalledWith(false)
    const search = screen.getByRole('searchbox', { name: /search clubs/i })
    await userEvent.type(search, 'rob')
    expect(onSearchActiveChange).toHaveBeenLastCalledWith(true)
    await userEvent.clear(search)
    expect(onSearchActiveChange).toHaveBeenLastCalledWith(false)
    await userEvent.type(search, 'x')
    unmount()
    expect(onSearchActiveChange).toHaveBeenLastCalledWith(false)
  })

  it('says it is still searching, not "no match", while more pages remain', async () => {
    setup({ hasMore: true })
    await userEvent.type(screen.getByRole('searchbox', { name: /search clubs/i }), 'zzz')
    expect(screen.getByText('Searching more clubs...')).toBeInTheDocument()
    expect(screen.queryByText('No clubs match your search.')).not.toBeInTheDocument()
  })

  it('says no clubs match once every page is loaded', async () => {
    setup({ hasMore: false })
    await userEvent.type(screen.getByRole('searchbox', { name: /search clubs/i }), 'zzz')
    expect(screen.getByText('No clubs match your search.')).toBeInTheDocument()
  })
})
