// REQ-003: centralized UI permission rules.
//
// The backend (back_end branch) performs no role or ownership checks at all, so
// the UI is the only gate. Rules (confirmed by the product owner):
//
//   Create Club      : role === 'Admin' only
//   Update Club      : role === 'Admin' only  (confirmed: "Admin only can update or delete clubs")
//   Delete Club      : role === 'Admin' only  (confirmed)
//   Create Activity  : any logged-in user whose role is not 'Student'
//   Join Club        : any logged-in user
//
// Leaders and Students may not update or delete clubs, including a club they lead.
// The `club` argument is accepted (and currently unused) so call sites need not
// change if an ownership rule is ever added.
//
// Activity update/delete: the backend exposes no such endpoints (REQ-008), so
// there is intentionally no permission helper for them yet.

export const ROLES = Object.freeze({
    ADMIN: 'Admin',
    LEADER: 'Leader',
    STUDENT: 'Student',
});

const isLoggedIn = (user) => Boolean(user);

const isAdmin = (user) => isLoggedIn(user) && user.role === ROLES.ADMIN;

export function canCreateClub(user) {
    return isAdmin(user);
}

// eslint-disable-next-line no-unused-vars -- `club` kept for call-site stability (rule is Admin only)
export function canUpdateClub(user, club) {
    return isAdmin(user);
}

// eslint-disable-next-line no-unused-vars -- `club` kept for call-site stability (rule is Admin only)
export function canDeleteClub(user, club) {
    return isAdmin(user);
}

export function canCreateActivity(user) {
    return isLoggedIn(user) && user.role !== ROLES.STUDENT;
}

export function canJoinClub(user) {
    return isLoggedIn(user);
}
