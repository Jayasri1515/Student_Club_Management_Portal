// REQ-005: browse / search clubs and join with one click (no manual club ID).
// Joining uses the existing POST /memberships/join endpoint (handled by the parent).

import { useState } from 'react';
import { filterClubs } from '../utils/clubSearch.js';
import { normalizeId, sameId } from '../utils/ids.js';

export default function ClubBrowser({
    clubs,
    joinedClubIds,
    canJoin,
    joiningClubId = null,
    joiningClubIds = [],
    hasMore = false,
    loadingMore = false,
    onJoin,
    onLoadMore,
}) {
    const [query, setQuery] = useState('');
    const visibleClubs = filterClubs(clubs, query);
    // CR-001: IDs may be numbers (backend) or strings; always compare normalized.
    const joined = new Set((joinedClubIds ?? []).map(normalizeId).filter((id) => id !== null));
    const joiningIds = [joiningClubId, ...(joiningClubIds ?? [])];

    return (
        <div className="section-container">
            <label htmlFor="club-search" className="verification-label">Search clubs by name or description</label>
            <input
                id="club-search"
                type="search"
                placeholder="Search clubs..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="form-input"
            />
            <ul className="list-group" aria-label="Available clubs">
                {visibleClubs.length > 0 ? (
                    visibleClubs.map((club) => {
                        const alreadyJoined = joined.has(normalizeId(club.id));
                        const joining = joiningIds.some((id) => sameId(id, club.id));
                        return (
                            <li key={club.id} className="list-item">
                                <span className="list-item-text">
                                    <strong>{club.name}</strong>
                                    {club.description && <span className="description-text"> - {club.description}</span>}
                                </span>
                                <div className="list-item-buttons">
                                    <button
                                        type="button"
                                        className="button primary"
                                        disabled={!canJoin || alreadyJoined || joining}
                                        aria-busy={joining || undefined}
                                        aria-label={`${alreadyJoined ? 'Already joined' : 'Join'} ${club.name}`}
                                        onClick={() => onJoin(club)}
                                    >
                                        {alreadyJoined ? 'Joined' : 'Join'}
                                    </button>
                                </div>
                            </li>
                        );
                    })
                ) : (
                    <li className="no-data-text">
                        {(clubs ?? []).length === 0 ? 'No clubs available.' : 'No clubs match your search.'}
                    </li>
                )}
            </ul>
            {hasMore && (
                <button type="button" className="button secondary" disabled={loadingMore} onClick={onLoadMore}>
                    Load more clubs
                </button>
            )}
        </div>
    );
}
