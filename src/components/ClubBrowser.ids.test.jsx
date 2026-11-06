// CR-001 regression tests: club IDs may be numbers (backend JSON) or strings.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClubBrowser from './ClubBrowser.jsx'

const numericClubs = [
  { id: 1, name: 'Chess Club' },
  { id: 2, name: 'Robotics' },
]
const stringClubs = [
  { id: '1', name: 'Chess Club' },
  { id: '2', name: 'Robotics' },
]

const setup = (props = {}) => {
  const onJoin = vi.fn()
  render(<ClubBrowser clubs={numericClubs} joinedClubIds={[]} canJoin onJoin={onJoin} {...props} />)
  return { onJoin }
}

describe('ClubBrowser ID normalization (CR-001)', () => {
  it.each([
    ['numeric club id, string joiningClubId', numericClubs, { joiningClubId: '2' }],
    ['string club id, numeric joiningClubId', stringClubs, { joiningClubId: 2 }],
    ['numeric club id, numeric joiningClubId', numericClubs, { joiningClubId: 2 }],
    ['string club id, string joiningClubId', stringClubs, { joiningClubId: '2' }],
    ['numeric club id, joiningClubIds list of strings', numericClubs, { joiningClubIds: ['2'] }],
    ['string club id, joiningClubIds list of numbers', stringClubs, { joiningClubIds: [2] }],
  ])('disables only the Join button being processed (%s)', (_label, clubs, props) => {
    setup({ clubs, ...props })
    expect(screen.getByRole('button', { name: 'Join Robotics' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Join Robotics' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Join Chess Club' })).toBeEnabled()
  })

  it('does not disable anything when no join is in progress', () => {
    setup({ joiningClubId: null })
    expect(screen.getByRole('button', { name: 'Join Chess Club' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Join Robotics' })).toBeEnabled()
  })

  it.each([
    ['numeric club ids, string membership ids', numericClubs, ['1']],
    ['string club ids, numeric membership ids', stringClubs, [1]],
    ['same types', numericClubs, [1]],
  ])('marks already joined clubs regardless of ID type (%s)', (_label, clubs, joinedClubIds) => {
    setup({ clubs, joinedClubIds })
    expect(screen.getByRole('button', { name: 'Already joined Chess Club' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Join Robotics' })).toBeEnabled()
  })

  it('ignores missing membership club ids (null / undefined) instead of matching them', () => {
    setup({ joinedClubIds: [null, undefined, ''] })
    expect(screen.getByRole('button', { name: 'Join Chess Club' })).toBeEnabled()
  })

  it('does not call onJoin for a disabled (in progress) button', async () => {
    const { onJoin } = setup({ joiningClubId: '1' })
    await userEvent.click(screen.getByRole('button', { name: 'Join Chess Club' }))
    expect(onJoin).not.toHaveBeenCalled()
  })

  it('disables Load more while a page is loading', () => {
    setup({ hasMore: true, loadingMore: true })
    expect(screen.getByRole('button', { name: /load more clubs/i })).toBeDisabled()
  })
})
