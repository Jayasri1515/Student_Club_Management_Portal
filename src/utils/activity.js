// REQ-007: null-safe mapping of an Activity (as returned by the backend) to the
// values shown in the UI.
//
// Backend model (back_end: models/Activity.java):
//   { id, title, description, date, club: { id, name, description, leader } }
// Activity ID must come from `activity.id` and Club ID from `activity.club.id`.
// Previously the Club ID label was bound to `activity.id` and a null `club`
// crashed the whole page.

export const NOT_AVAILABLE = 'N/A';

const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== '';
const orNotAvailable = (value) => (hasValue(value) ? String(value) : NOT_AVAILABLE);

export function getActivityDisplay(activity) {
    const safe = activity ?? {};
    const club = safe.club ?? null;
    return {
        activityId: orNotAvailable(safe.id),
        clubId: orNotAvailable(club?.id),
        clubName: hasValue(club?.name) ? String(club.name) : 'Unknown club',
        title: hasValue(safe.title) ? String(safe.title) : hasValue(safe.name) ? String(safe.name) : 'Untitled activity',
        description: hasValue(safe.description) ? String(safe.description) : '',
        date: hasValue(safe.date) ? String(safe.date) : '',
    };
}
