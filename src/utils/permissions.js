// REQ-003: centralized UI permission rules.
//
// These helpers PRESERVE the behavior that shipped before this module existed
// (no new policy has been invented). The backend (back_end branch) performs no
// role or ownership checks at all, so the UI is the only gate.
//
//   Create Club      : role === 'Admin' only
//   Create Activity  : any logged-in user whose role is not 'Student'
//   Update Club      : any logged-in user (unchanged)  -> NEEDS RULE CONFIRMATION
//   Delete Club      : any logged-in user (unchanged)  -> NEEDS RULE CONFIRMATION
//   Join Club        : any logged-in user (unchanged)
//
// Update/Delete Club are suspicious (a Student can currently rename/delete any
// club, and the backend does not stop them). They are kept as-is until the
// product owner confirms the rule (e.g. Admin-only, or Leader of that club only
// via `club.leader.id === user.id`). The `club` argument is accepted already so
// an ownership rule can be added here without touching call sites.
//
// Activity update/delete: the backend exposes no such endpoints (REQ-008), so
// there is intentionally no permission helper for them yet.

export const ROLES = Object.freeze({
    ADMIN: 'Admin',
    LEADER: 'Leader',
    STUDENT: 'Student',
});

const isLoggedIn = (user) => Boolean(user);

export function canCreateClub(user) {
    return isLoggedIn(user) && user.role === ROLES.ADMIN;
}

// eslint-disable-next-line no-unused-vars -- `club` reserved for ownership rules (needs rule confirmation)
export function canUpdateClub(user, club) {
    return isLoggedIn(user);
}

// eslint-disable-next-line no-unused-vars -- `club` reserved for ownership rules (needs rule confirmation)
export function canDeleteClub(user, club) {
    return isLoggedIn(user);
}

export function canCreateActivity(user) {
    return isLoggedIn(user) && user.role !== ROLES.STUDENT;
}

export function canJoinClub(user) {
    return isLoggedIn(user);
}
