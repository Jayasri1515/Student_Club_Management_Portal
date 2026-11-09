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
//   Leave Club       : any logged-in user, for their OWN membership only (REQ-006)
//   Update Activity  : role === 'Admin' only (REQ-008)
//   Delete Activity  : role === 'Admin' only (REQ-008)
//
// The backend enforces none of these rules.
//
// Leaders and Students may not update or delete clubs, including a club they lead.
// The `club` argument is accepted (and currently unused) so call sites need not
// change if an ownership rule is ever added.
//
// Backend contract used by the corresponding UI actions:
//   Leave Club       : DELETE /memberships/user/{userId}/club/{clubId} -> 204 / 404
//   Update Activity  : PUT    /activities/{id}  { title, description, date } -> 200 / 400 / 404
//   Delete Activity  : DELETE /activities/{id}  -> 204 / 404

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

// REQ-006: a user may only leave a club through their own membership. The memberships list
// is fetched for the logged-in user; if a membership carries a user, it must be that user.
export function canLeaveClub(user, membership) {
    if (!isLoggedIn(user)) return false;
    const owner = membership?.user?.id;
    if (owner === undefined || owner === null) return true;
    return String(owner) === String(user.id);
}

// eslint-disable-next-line no-unused-vars -- `activity` kept for call-site stability (rule is Admin only)
export function canUpdateActivity(user, activity) {
    return isAdmin(user);
}

// eslint-disable-next-line no-unused-vars -- `activity` kept for call-site stability (rule is Admin only)
export function canDeleteActivity(user, activity) {
    return isAdmin(user);
}
