import { useState, useEffect, useRef } from 'react';
import './App.css';
import { apiClient, isAbortError } from './services/apiClient.js';
import {
    canCreateClub,
    canUpdateClub,
    canDeleteClub,
    canCreateActivity,
    canJoinClub,
    canLeaveClub,
    canUpdateActivity,
    canDeleteActivity,
} from './utils/permissions.js';
import { useNotifications } from './hooks/useNotifications.js';
import { useInFlightSet } from './hooks/useInFlightSet.js';
import NotificationContainer from './components/Notification.jsx';
import RenameClubModal from './components/RenameClubModal.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import ActivityItem from './components/ActivityItem.jsx';
import ClubBrowser from './components/ClubBrowser.jsx';
import ActivityForm from './components/ActivityForm.jsx';
import EditActivityModal from './components/EditActivityModal.jsx';
import Modal from './components/Modal.jsx';
import DevAuthNotice from './components/DevAuthNotice.jsx';
import { normalizeId, sameId } from './utils/ids.js';
import { validateClub } from './utils/validation.js';
import { normalizePage, mergeById, fetchAllPages } from './utils/pagination.js';

// The backend base URL now lives in src/config/apiConfig.js (VITE_API_BASE_URL, REQ-001)
// and all HTTP calls go through src/services/apiClient.js (REQ-004).

// --- Login Pop-up Component (Moved outside of App) ---
// CR-006: rendered through the shared accessible Modal (role=dialog, focus
// management, Escape, labelled title). A backdrop click does not close it, so
// typed credentials are not lost accidentally (same as before).
const LoginPopup = ({ setShowLoginPopup, handleLogin, loginDetails, setLoginDetails, setShowRegisterPopup }) => (
    <Modal title={<>Login &#128274;</>} onClose={() => setShowLoginPopup(false)} closeOnBackdrop={false}>
        <DevAuthNotice variant="inline" />
        <form onSubmit={handleLogin} className="form-container">
            <input
                type="text"
                placeholder="Username"
                aria-label="Username"
                value={loginDetails.username}
                onChange={e => setLoginDetails({ ...loginDetails, username: e.target.value })}
                className="form-input"
            />
            <input
                type="password"
                placeholder="Password"
                aria-label="Password"
                value={loginDetails.password}
                onChange={e => setLoginDetails({ ...loginDetails, password: e.target.value })}
                className="form-input"
            />
            <div className="button-group">
                <button
                    type="submit"
                    className="button primary"
                >
                    Login
                </button>
                <button
                    type="button"
                    onClick={() => { setShowLoginPopup(false); setShowRegisterPopup(true); }}
                    className="button secondary"
                >
                    Go to Register
                </button>
            </div>
        </form>
    </Modal>
);

// --- Register Pop-up Component (Moved outside of App) ---
const RegisterPopup = ({ setShowRegisterPopup, handleRegister, registerDetails, setRegisterDetails, setShowLoginPopup, humanVerification, setHumanVerification }) => (
    <Modal title={<>Register &#128527;</>} onClose={() => setShowRegisterPopup(false)} closeOnBackdrop={false}>
        <DevAuthNotice variant="inline" />
        <form onSubmit={handleRegister} className="form-container">
            <input
                type="text"
                placeholder="Username"
                aria-label="Username"
                value={registerDetails.username}
                onChange={e => setRegisterDetails({ ...registerDetails, username: e.target.value })}
                className="form-input"
            />
            <input
                type="password"
                placeholder="Password"
                aria-label="Password"
                value={registerDetails.password}
                onChange={e => setRegisterDetails({ ...registerDetails, password: e.target.value })}
                className="form-input"
            />
            <input
                type="email"
                placeholder="Email"
                aria-label="Email"
                value={registerDetails.email}
                onChange={e => setRegisterDetails({ ...registerDetails, email: e.target.value })}
                className="form-input"
            />
            <select
                aria-label="Role"
                value={registerDetails.role}
                onChange={e => setRegisterDetails({ ...registerDetails, role: e.target.value })}
                className="form-input"
            >
                <option value="Student">Student</option>
                <option value="Leader">Leader</option>
            </select>

            {/* Fun Human Verification Field */}
            <div className="human-verification-container">
                <h4>Verify you are human  &#128520;</h4>
                <label htmlFor="register-human-verification" className="verification-label">I have an eye but cannot see. What am I?</label>
                <input
                    id="register-human-verification"
                    type="text"
                    placeholder="Your Answer"
                    value={humanVerification}
                    onChange={e => setHumanVerification(e.target.value)}
                    className="form-input"
                />
            </div>
            {/* End of Fun Human Verification Field */}

            <div className="button-group">
                <button
                    type="submit"
                    className="button green"
                >
                    Register
                </button>
                <button
                    type="button"
                    onClick={() => { setShowRegisterPopup(false); setShowLoginPopup(true); }}
                    className="button secondary"
                >
                    Back to Login
                </button>
            </div>
        </form>
    </Modal>
);

// Activities are loaded completely (all pages). A larger page size keeps the number of
// requests low; the backend accepts `size` on both activity list endpoints.
const ACTIVITY_PAGE_SIZE = 100;

// --- Main App Component ---
function App() {
    // State to manage the current page/view.
    const [currentPage, setCurrentPage] = useState('dashboard');
    
    // State for login/registration and user data
    const [loginDetails, setLoginDetails] = useState({ username: '', password: '' });
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [registerDetails, setRegisterDetails] = useState({ username: '', password: '', email: '', role: 'Student' });
    
    // New state for the human verification check
    const [humanVerification, setHumanVerification] = useState('');

    // State: Control the visibility of the popups
    const [showLoginPopup, setShowLoginPopup] = useState(false);
    const [showRegisterPopup, setShowRegisterPopup] = useState(false);

    // State to manage data from the backend
    const [clubs, setClubs] = useState([]);
    const [clubsPaging, setClubsPaging] = useState({ nextPage: 1, hasMore: false });
    const [clubSearchActive, setClubSearchActive] = useState(false);
    const [activities, setActivities] = useState([]);
    const [memberships, setMemberships] = useState([]);

    // State for forms
    const [newClub, setNewClub] = useState({ name: '', description: '' });

    // State for in-app dialogs / feedback (REQ-002, REQ-005)
    const { notifications, dismiss, success, error: notifyError, info } = useNotifications();
    const [renameTarget, setRenameTarget] = useState(null);
    const [renaming, setRenaming] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [loadingMoreClubs, setLoadingMoreClubs] = useState(false);
    // REQ-006: leave club (confirmation target)
    const [leaveTarget, setLeaveTarget] = useState(null);
    // REQ-008: activity edit / delete (dialog targets + save/delete in flight)
    const [editActivityTarget, setEditActivityTarget] = useState(null);
    const [savingActivity, setSavingActivity] = useState(false);
    const [deleteActivityTarget, setDeleteActivityTarget] = useState(null);
    // Operations in flight, keyed by club / activity id (double-click guards).
    const joining = useInFlightSet();
    const leaving = useInFlightSet();
    const activityBusy = useInFlightSet();
    const loadingMoreClubsRef = useRef(false);
    const clubsRequestRef = useRef(0);
    const activitiesRequestRef = useRef(0);
    const membershipsRequestRef = useRef(0);
    // Abort scopes. `lifetimeRef` is aborted when App unmounts (cancels in-flight writes);
    // `pageScopeRef` is aborted whenever the page, user or activity filter changes (cancels
    // in-flight list loads). Both are re-created, so React StrictMode remounting works.
    const lifetimeRef = useRef(new AbortController());
    const pageScopeRef = useRef(new AbortController());
    const lifeOptions = () => ({ signal: lifetimeRef.current.signal });
    // null = all activities, otherwise only this club's activities ("View Activities").
    const [activityClubId, setActivityClubId] = useState(null);
    const [clubErrors, setClubErrors] = useState({});
    const [creatingClub, setCreatingClub] = useState(false);
    const creatingClubRef = useRef(false);

    /**
     * This useEffect hook is the central point for fetching data.
     * It runs whenever `currentPage` or `loggedInUser` changes.
     */
    useEffect(() => {
        if (lifetimeRef.current.signal.aborted) lifetimeRef.current = new AbortController();
        return () => lifetimeRef.current.abort();
    }, []);

    useEffect(() => {
        // A new scope per page/user/filter; leaving the page aborts its in-flight list loads.
        const scope = new AbortController();
        pageScopeRef.current = scope;
        if (loggedInUser) {
            if (currentPage === 'clubs') {
                fetchClubs();
            } else if (currentPage === 'activities') {
                showActivities();
            } else if (currentPage === 'memberships') {
                fetchMemberships(loggedInUser.id);
            } else if (currentPage === 'join') {
                fetchClubs();
                fetchMemberships(loggedInUser.id);
            }
        }
        return () => scope.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on page/user/filter only
    }, [currentPage, loggedInUser, activityClubId]);

    // While a club search is active, keep loading the next page until every club has been
    // fetched, so a match on a later page is found. Each success replaces `clubsPaging`, which
    // re-runs this; a failed page leaves it unchanged, so there is no retry loop (the manual
    // "Load more clubs" button remains).
    useEffect(() => {
        if (loggedInUser && currentPage === 'join' && clubSearchActive && clubsPaging.hasMore && !loadingMoreClubsRef.current) {
            fetchClubs(clubsPaging.nextPage);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on search state and paging only
    }, [clubSearchActive, clubsPaging, currentPage, loggedInUser]);

    // --- API Call functions ---
    // CR-003: GET /clubs/getclubs returns a Spring Page (default size 10). The response
    // is validated, appended pages are de-duplicated, and a newer request wins over a
    // stale one.
    const fetchClubs = async (page = 0) => {
        if (page > 0) {
            if (loadingMoreClubsRef.current) return;
            loadingMoreClubsRef.current = true;
            setLoadingMoreClubs(true);
        }
        const requestId = ++clubsRequestRef.current;
        try {
            const data = await apiClient.get(`/clubs/getclubs?page=${page}`, { signal: pageScopeRef.current.signal });
            if (requestId !== clubsRequestRef.current) return;
            const result = normalizePage(data);
            if (!result.valid) {
                notifyError('Error fetching clubs: unexpected response from the server.');
                return;
            }
            setClubs((previous) => (page === 0 ? result.content : mergeById(previous, result.content)));
            setClubsPaging({ nextPage: page + 1, hasMore: result.hasMore === true });
        } catch (error) {
            if (isAbortError(error)) return;
            if (requestId === clubsRequestRef.current) notifyError(`Error fetching clubs: ${error.message}`);
        } finally {
            if (page > 0) {
                loadingMoreClubsRef.current = false;
                setLoadingMoreClubs(false);
            }
        }
    };

    // CR-002: both activity endpoints are paged (GET ...?page=&size=). Fetch every page so
    // the list never silently omits records; tell the user if the safety limit is hit.
    // Returns the activities, or null if the request failed, was cancelled or was superseded.
    const loadAllActivities = async (basePath, failureLabel) => {
        const requestId = ++activitiesRequestRef.current;
        const signal = pageScopeRef.current.signal;
        try {
            const { items, truncated } = await fetchAllPages(
                (page) => apiClient.get(`${basePath}?page=${page}&size=${ACTIVITY_PAGE_SIZE}`, { signal }),
                { size: ACTIVITY_PAGE_SIZE },
            );
            if (requestId !== activitiesRequestRef.current) return null;
            setActivities(items);
            if (truncated) {
                notifyError(`Only the first ${items.length} activities are shown; there are more than can be loaded at once.`);
            }
            return items;
        } catch (error) {
            if (isAbortError(error)) return null;
            if (requestId === activitiesRequestRef.current) notifyError(`${failureLabel}: ${error.message}`);
            return null;
        }
    };

    // The activities list is either every activity or a single club (activityClubId, set by
    // "View Activities"). The page effect and every refresh go through here, so the club
    // filter is never overwritten by an unfiltered reload.
    const loadActivities = () => {
        if (normalizeId(activityClubId) === null) {
            return loadAllActivities('/activities/getactivities', 'Error fetching all activities');
        }
        return loadAllActivities(`/activities/club/${activityClubId}`, 'Error fetching activities');
    };

    const showActivities = async () => {
        const items = await loadActivities();
        if (items !== null && normalizeId(activityClubId) !== null) info(`Showing activities for club ${activityClubId}.`);
    };

    const viewClubActivities = (clubId) => {
        setActivityClubId(clubId);
        setCurrentPage('activities');
    };

    const viewAllActivities = () => {
        setActivityClubId(null);
        setCurrentPage('activities');
    };

    const logout = (message = 'Logged out.') => {
        setLoggedInUser(null);
        setLoginDetails({ username: '', password: '' });
        setCurrentPage('dashboard');
        setActivityClubId(null);
        setClubs([]);
        setActivities([]);
        setMemberships([]);
        info(message);
    };

    // Any failure clears the list so a stale one (for example from before an error) is never
    // shown as current. 401 ends the session; the latest request wins.
    const fetchMemberships = async (userId) => {
        const requestId = ++membershipsRequestRef.current;
        try {
            const data = await apiClient.get(`/memberships/user/${userId}`, { signal: pageScopeRef.current.signal });
            if (requestId !== membershipsRequestRef.current) return;
            if (!Array.isArray(data)) {
                setMemberships([]);
                notifyError('Error fetching memberships: unexpected response from the server.');
                return;
            }
            setMemberships(data);
        } catch (error) {
            if (isAbortError(error) || requestId !== membershipsRequestRef.current) return;
            setMemberships([]);
            if (error.status === 401) {
                logout('Your session is no longer valid. Please log in again.');
            } else if (error.status === 403) {
                notifyError('Error fetching memberships: you are not allowed to view this list.');
            } else if (error.status === 404) {
                notifyError('Error fetching memberships: your account was not found. Please log in again.');
            } else {
                notifyError(`Error fetching memberships: ${error.message}`);
            }
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // The backend returns the User entity (no token) - see apiClient.js.
            const user = await apiClient.post('/auth/login', loginDetails, lifeOptions());
            setLoggedInUser(user);
            setLoginDetails({ username: '', password: '' });
            success(`Login successful! Welcome, ${user.username}.`);
            setShowLoginPopup(false);
            setCurrentPage('dashboard');
        } catch (error) {
            if (isAbortError(error)) return;
            notifyError(`Login failed: ${error.message}`);
            setLoggedInUser(null);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        
        // Fun human verification check
        if (humanVerification.toLowerCase().trim() !== 'a needle') {
            notifyError("That's not the answer! I think you are not a human, Try again.");
            return; 
        }

        try {
            const result = await apiClient.post('/auth/register', registerDetails, lifeOptions());
            // The backend answers HTTP 200 with a plain-text message (instead of a user)
            // when the username is already taken.
            if (typeof result === 'string') {
                notifyError(`Registration failed: ${result}`);
                return;
            }
            success('Registration successful! You can now log in.');
            setRegisterDetails({ username: '', password: '', email: '', role: 'Student' });
            setShowRegisterPopup(false);
            setShowLoginPopup(true);
        } catch (error) {
            if (isAbortError(error)) return;
            notifyError(`Registration failed: ${error.message}`);
        }
    };

    const updateNewClub = (field) => (e) => {
        const { value } = e.target;
        setNewClub((previous) => ({ ...previous, [field]: value }));
        setClubErrors((previous) => {
            if (!previous[field]) return previous;
            const next = { ...previous };
            delete next[field];
            return next;
        });
    };

    // Validates before anything is sent (name required, 255 character limits) and ignores
    // repeated submits while a request is pending.
    const handleCreateClub = async (e) => {
        e.preventDefault();
        if (!canCreateClub(loggedInUser) || creatingClubRef.current) return;
        const result = validateClub(newClub);
        if (!result.valid) {
            setClubErrors(result.errors);
            document.getElementById(result.errors.name ? 'create-club-name' : 'create-club-description')?.focus();
            return;
        }
        setClubErrors({});
        creatingClubRef.current = true;
        setCreatingClub(true);
        try {
            const clubData = { ...result.values, leaderId: loggedInUser.id };
            const data = await apiClient.post('/clubs', clubData, lifeOptions());
            success(`Club created: ${data.name} (ID: ${data.id})`);
            setNewClub({ name: '', description: '' });
            fetchClubs();
        } catch (error) {
            if (isAbortError(error)) return;
            notifyError(`Create Club Error: ${error.message}`);
        } finally {
            creatingClubRef.current = false;
            setCreatingClub(false);
        }
    };

    const handleUpdateClub = async (club, newName) => {
        if (!canUpdateClub(loggedInUser, club)) return;
        setRenaming(true);
        try {
            // PUT /clubs/{id} overwrites name, description AND leader with the request
            // body, so send the existing description/leader back to avoid wiping them.
            const data = await apiClient.put(`/clubs/${club.id}`, {
                name: newName,
                description: club.description ?? null,
                leader: club.leader ?? null,
            }, lifeOptions());
            success(`Club updated to: ${data.name}`);
            setRenameTarget(null);
            fetchClubs();
        } catch (error) {
            if (isAbortError(error)) return;
            notifyError(`Update Club Error: ${error.message}`);
        } finally {
            setRenaming(false);
        }
    };

    const handleDeleteClub = async (club) => {
        setDeleteTarget(null);
        if (!canDeleteClub(loggedInUser, club)) return;
        try {
            await apiClient.delete(`/clubs/${club.id}`, lifeOptions());
            success('Club deleted successfully.');
            fetchClubs();
        } catch (error) {
            if (isAbortError(error)) return;
            notifyError(`Delete Club Error: ${error.message}`);
        }
    };

    // CR-004: ActivityForm validates the input; this receives clean values and resolves
    // true on success (so the form can reset) or false on failure (input is kept).
    const handleCreateActivity = async (values) => {
        if (!canCreateActivity(loggedInUser)) return false;
        try {
            // Backend Activity fields are { title, description, date, club }.
            const activityData = {
                title: values.title,
                description: values.description,
                club: { id: values.clubId }
            };
            const data = await apiClient.post('/activities', activityData, lifeOptions());
            success(`Activity created: ${data?.title ?? values.title} (Club ID: ${data?.club?.id ?? values.clubId})`);
            loadActivities();
            return true;
        } catch (error) {
            if (isAbortError(error)) return false;
            notifyError(`Create Activity Error: ${error.message}`);
            return false;
        }
    };

    // CR-001: club IDs are compared in normalized form (number vs string), and a ref guards
    // against duplicate requests for the same club (double click / Enter key repeat).
    const handleJoinClub = async (club) => {
        if (!canJoinClub(loggedInUser)) {
            notifyError('Please log in first to join a club.');
            return;
        }
        const clubKey = normalizeId(club?.id);
        if (clubKey === null) {
            notifyError('This club cannot be joined because it has no ID.');
            return;
        }
        if (joining.has(clubKey)) return;
        if (memberships.some((membership) => sameId(membership?.club?.id, clubKey))) {
            info(`You have already joined ${club.name}.`);
            return;
        }
        joining.add(clubKey);
        try {
            // Existing join endpoint and payload shape.
            const membershipData = {
                user: { id: loggedInUser.id },
                club: { id: club.id }
            };
            const data = await apiClient.post('/memberships/join', membershipData, lifeOptions());
            success(`Successfully joined ${data?.club?.name ?? club.name}.`);
            fetchMemberships(loggedInUser.id);
        } catch (error) {
            if (isAbortError(error)) return;
            notifyError(`Failed to join club: ${error.message}`);
        } finally {
            joining.remove(clubKey);
        }
    };

    // REQ-006: DELETE /memberships/user/{userId}/club/{clubId} -> 204 on success.
    // 404 means the membership no longer exists (or user/club not found): the list is refreshed
    // either way. The user can only leave through their own membership (canLeaveClub).
    const handleLeaveClub = async (membership) => {
        setLeaveTarget(null);
        if (!canLeaveClub(loggedInUser, membership)) return;
        const clubKey = normalizeId(membership?.club?.id);
        if (clubKey === null) {
            notifyError('This membership cannot be removed because the club has no ID.');
            return;
        }
        if (leaving.has(clubKey)) return;
        leaving.add(clubKey);
        const clubName = membership.club?.name ?? `club ${clubKey}`;
        try {
            await apiClient.delete(`/memberships/user/${loggedInUser.id}/club/${clubKey}`, lifeOptions());
            success(`You have left ${clubName}.`);
            fetchMemberships(loggedInUser.id);
        } catch (error) {
            if (isAbortError(error)) return;
            if (error.status === 404) {
                notifyError(`Could not leave ${clubName}: ${error.message}`);
                fetchMemberships(loggedInUser.id);
            } else {
                notifyError(`Failed to leave club: ${error.message}`);
            }
        } finally {
            leaving.remove(clubKey);
        }
    };

    // REQ-008: PUT /activities/{id} with { title, description, date } -> 200 with the activity.
    // The backend ignores the club (an activity cannot be moved). 400 = invalid title,
    // 404 = the activity no longer exists (the list is refreshed and the dialog closed).
    const handleUpdateActivity = async (activity, values) => {
        if (!canUpdateActivity(loggedInUser, activity)) return;
        const activityKey = normalizeId(activity?.id);
        if (activityKey === null || activityBusy.has(activityKey)) return;
        activityBusy.add(activityKey);
        setSavingActivity(true);
        try {
            const data = await apiClient.put(`/activities/${activityKey}`, values, lifeOptions());
            success(`Activity updated: ${data?.title ?? values.title}`);
            setEditActivityTarget(null);
            loadActivities();
        } catch (error) {
            if (isAbortError(error)) return;
            notifyError(`Update Activity Error: ${error.message}`);
            if (error.status === 404) {
                setEditActivityTarget(null);
                loadActivities();
            }
            // 400 and other errors: the dialog stays open so the input is not lost.
        } finally {
            activityBusy.remove(activityKey);
            setSavingActivity(false);
        }
    };

    // REQ-008: DELETE /activities/{id} -> 204. 404 = already gone, the list is refreshed.
    const handleDeleteActivity = async (activity) => {
        setDeleteActivityTarget(null);
        if (!canDeleteActivity(loggedInUser, activity)) return;
        const activityKey = normalizeId(activity?.id);
        if (activityKey === null || activityBusy.has(activityKey)) return;
        activityBusy.add(activityKey);
        try {
            await apiClient.delete(`/activities/${activityKey}`, lifeOptions());
            success('Activity deleted successfully.');
            loadActivities();
        } catch (error) {
            if (isAbortError(error)) return;
            notifyError(`Delete Activity Error: ${error.message}`);
            if (error.status === 404) loadActivities();
        } finally {
            activityBusy.remove(activityKey);
        }
    };

    // Component Rendering based on currentPage state
    const renderPage = () => {
        // Only render the landing page if the user is not logged in AND no pop-up is active
        if (!loggedInUser && !showLoginPopup && !showRegisterPopup) {
            return (
                <div className="card card-lg flex-center-col">
                    <h2 className="dashboard-card-title">Welcome to the Club Management System</h2>
                    <h1>&#128512;</h1>
                    <button 
                        onClick={() => setShowLoginPopup(true)}
                        className="intro-text-button"
                    >
                        Please log in to continue.
                    </button>
                </div>
            );
        }

        switch (currentPage) {
            case 'dashboard':
                if (loggedInUser) {
                    return (
                        <div className="card card-2xl">
                            <h2 className="dashboard-card-title">Welcome, {loggedInUser.username} &#128521; !</h2>
                            <p className="user-id-text">Your User ID: <span className="user-id-mono">{loggedInUser.id}</span></p>
                            <div className="dashboard-grid">
                                <button onClick={() => setCurrentPage('clubs')} className="button-large">
                                    Go to Club Management
                                </button>
                                <button onClick={viewAllActivities} className="button-large">
                                    Go to Activity Management
                                </button>
                                <button onClick={() => setCurrentPage('join')} className="button-large">
                                    Go to Join a Club
                                </button>
                                <button onClick={() => setCurrentPage('memberships')} className="button-large">
                                    View My Memberships
                                </button>
                            </div>
                            <button onClick={() => logout()} className="button-large logout-button">
                                Logout
                            </button>
                        </div>
                    );
                }
                break;
            case 'clubs':
                return (
                    <div className="card card-2xl">
                        <div className="header-with-button">
                            <h2 className="dashboard-card-title">Club Management &#127914;</h2>
                            <button onClick={() => setCurrentPage('dashboard')} className="button secondary">
                                Back to Dashboard
                            </button>
                        </div>

                        <div className="section-container">
                            <h3 className="section-title">Create a Club</h3>
                            <form onSubmit={handleCreateClub} className="form-container" noValidate>
                                <input
                                    id="create-club-name"
                                    type="text"
                                    placeholder="Club Name"
                                    aria-label="Club name"
                                    aria-required="true"
                                    aria-invalid={clubErrors.name ? 'true' : 'false'}
                                    aria-describedby={clubErrors.name ? 'create-club-name-error' : undefined}
                                    value={newClub.name}
                                    onChange={updateNewClub('name')}
                                    className="form-input"
                                />
                                {clubErrors.name && <p id="create-club-name-error" role="alert" className="field-error">{clubErrors.name}</p>}
                                <input
                                    id="create-club-description"
                                    type="text"
                                    placeholder="Description"
                                    aria-label="Club description"
                                    aria-invalid={clubErrors.description ? 'true' : 'false'}
                                    aria-describedby={clubErrors.description ? 'create-club-description-error' : undefined}
                                    value={newClub.description}
                                    onChange={updateNewClub('description')}
                                    className="form-input"
                                />
                                {clubErrors.description && <p id="create-club-description-error" role="alert" className="field-error">{clubErrors.description}</p>}
                                <button
                                    type="submit"
                                    className="button primary"
                                    disabled={!canCreateClub(loggedInUser) || creatingClub}
                                    title={canCreateClub(loggedInUser) ? undefined : 'Only Admins can create clubs'}
                                >
                                    Create Club
                                </button>
                            </form>
                        </div>

                        <div className="section-container">
                            <h3 className="section-title">Clubs List</h3>
                            <ul className="list-group">
                                {clubs.length > 0 ? (
                                    clubs.map(club => (
                                        <li key={club.id} className="list-item">
                                            <span className="list-item-text">
                                                <strong>{club.name}</strong> (ID: {club.id})
                                                {club.description && <span className="description-text"> - {club.description}</span>}
                                            </span>
                                            <div className="list-item-buttons">
                                                <button onClick={() => viewClubActivities(club.id)} className="button list-update">View Activities</button>
                                                <button
                                                    onClick={() => setRenameTarget(club)}
                                                    className="button list-update"
                                                    disabled={!canUpdateClub(loggedInUser, club)}
                                                    title={canUpdateClub(loggedInUser, club) ? undefined : 'Only Admins can update clubs'}
                                                >
                                                    Update
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(club)}
                                                    className="button list-delete"
                                                    disabled={!canDeleteClub(loggedInUser, club)}
                                                    title={canDeleteClub(loggedInUser, club) ? undefined : 'Only Admins can delete clubs'}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </li>
                                    ))
                                ) : (
                                    <li className="no-data-text">No clubs found.</li>
                                )}
                            </ul>
                            {clubsPaging.hasMore && (
                                <button className="button secondary" disabled={loadingMoreClubs} onClick={() => fetchClubs(clubsPaging.nextPage)}>
                                    Load more clubs
                                </button>
                            )}
                        </div>
                    </div>
                );
            case 'activities':
                return (
                    <div className="card card-2xl">
                        <div className="header-with-button">
                            <h2 className="dashboard-card-title">Activity Management &#127904;</h2>
                            <button onClick={() => setCurrentPage('dashboard')} className="button secondary">
                                Back to Dashboard
                            </button>
                        </div>

                        <div className="section-container">
                            <h3 className="section-title">Create an Activity</h3>
                            <ActivityForm canCreate={canCreateActivity(loggedInUser)} onCreate={handleCreateActivity} />
                        </div>

                        <div className="section-container">
                            <h3 className="section-title">Activities List</h3>
                            {normalizeId(activityClubId) !== null && (
                                <p className="filter-note">
                                    <span>Filtered to club ID {activityClubId}.</span>
                                    <button type="button" className="button secondary" onClick={viewAllActivities}>
                                        Show all activities
                                    </button>
                                </p>
                            )}
                            <ul className="list-group">
                                {activities.length > 0 ? (
                                    activities.map((activity, index) => (
                                        <ActivityItem
                                            key={activity?.id ?? `activity-${index}`}
                                            activity={activity}
                                            canEdit={canUpdateActivity(loggedInUser, activity)}
                                            canDelete={canDeleteActivity(loggedInUser, activity)}
                                            busy={activityBusy.ids.some((id) => sameId(id, activity?.id))}
                                            onEdit={setEditActivityTarget}
                                            onDelete={setDeleteActivityTarget}
                                        />
                                    ))
                                ) : (
                                    <li className="no-data-text">No activities found.</li>
                                )}
                            </ul>
                        </div>
                    </div>
                );
            case 'join':
                return (
                    <div className="card card-2xl">
                        <div className="header-with-button">
                            <h2 className="dashboard-card-title">Join a Club &#127882;</h2>
                            <button onClick={() => setCurrentPage('dashboard')} className="button secondary">
                                Back
                            </button>
                        </div>
                        <ClubBrowser
                            clubs={clubs}
                            joinedClubIds={memberships.map(membership => membership?.club?.id)}
                            canJoin={canJoinClub(loggedInUser)}
                            joiningClubIds={joining.ids}
                            hasMore={clubsPaging.hasMore}
                            loadingMore={loadingMoreClubs}
                            onJoin={handleJoinClub}
                            onLoadMore={() => fetchClubs(clubsPaging.nextPage)}
                            onSearchActiveChange={setClubSearchActive}
                        />
                    </div>
                );
            case 'memberships':
                return (
                    <div className="card card-2xl">
                        <div className="header-with-button">
                            <h2 className="dashboard-card-title">My Memberships &#128125;</h2>
                            <button onClick={() => setCurrentPage('dashboard')} className="button secondary">
                                Back to Dashboard
                            </button>
                        </div>
                        <div className="section-container">
                            <h3 className="section-title">Clubs I Have Joined</h3>
                            <ul className="list-group">
                                {memberships.length > 0 ? (
                                    memberships.map(membership => (
                                        <li key={membership.id} className="list-item">
                                            <span className="list-item-text">
                                                <strong>{membership.club?.name ?? 'Unknown club'}</strong> (ID: {membership.club?.id ?? 'N/A'})
                                                {membership.club?.description && <span className="description-text"> - {membership.club.description}</span>}
                                            </span>
                                            <div className="list-item-buttons">
                                                <button
                                                    type="button"
                                                    className="button list-delete"
                                                    aria-label={`Leave ${membership.club?.name ?? 'club'}`}
                                                    disabled={
                                                        !canLeaveClub(loggedInUser, membership) ||
                                                        normalizeId(membership.club?.id) === null ||
                                                        leaving.ids.some((id) => sameId(id, membership.club?.id))
                                                    }
                                                    onClick={() => setLeaveTarget(membership)}
                                                >
                                                    Leave
                                                </button>
                                            </div>
                                        </li>
                                    ))
                                ) : (
                                    <li className="no-data-text">You have not joined any clubs yet.</li>
                                )}
                            </ul>
                        </div>
                    </div>
                );
            default:
                return null;
        }
        return null;
    };

    return (
        <div className="min-h-screen container-wrapper">
            <h1 className="main-title">Club Management System</h1>
            {loggedInUser && <DevAuthNotice />}
            <div className="card-container">
                {renderPage()}
            </div>
            {/* The popup components are now called here */}
            {showLoginPopup && (
                <LoginPopup 
                    setShowLoginPopup={setShowLoginPopup}
                    handleLogin={handleLogin}
                    loginDetails={loginDetails}
                    setLoginDetails={setLoginDetails}
                    setShowRegisterPopup={setShowRegisterPopup}
                />
            )}
            {showRegisterPopup && (
                <RegisterPopup 
                    setShowRegisterPopup={setShowRegisterPopup}
                    handleRegister={handleRegister}
                    registerDetails={registerDetails}
                    setRegisterDetails={setRegisterDetails}
                    setShowLoginPopup={setShowLoginPopup}
                    humanVerification={humanVerification}
                    setHumanVerification={setHumanVerification}
                />
            )}
            {renameTarget && (
                <RenameClubModal
                    club={renameTarget}
                    submitting={renaming}
                    onSubmit={(newName) => handleUpdateClub(renameTarget, newName)}
                    onCancel={() => setRenameTarget(null)}
                />
            )}
            {deleteTarget && (
                <ConfirmDialog
                    title="Delete club"
                    message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
                    confirmLabel="Delete"
                    onConfirm={() => handleDeleteClub(deleteTarget)}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
            {leaveTarget && (
                <ConfirmDialog
                    title="Leave club"
                    message={`Are you sure you want to leave "${leaveTarget.club?.name ?? 'this club'}"? You can join again later.`}
                    confirmLabel="Leave"
                    onConfirm={() => handleLeaveClub(leaveTarget)}
                    onCancel={() => setLeaveTarget(null)}
                />
            )}
            {editActivityTarget && (
                <EditActivityModal
                    activity={editActivityTarget}
                    submitting={savingActivity}
                    onSubmit={(values) => handleUpdateActivity(editActivityTarget, values)}
                    onCancel={() => setEditActivityTarget(null)}
                />
            )}
            {deleteActivityTarget && (
                <ConfirmDialog
                    title="Delete activity"
                    message={`Are you sure you want to delete "${deleteActivityTarget.title ?? 'this activity'}"? This action cannot be undone.`}
                    confirmLabel="Delete"
                    onConfirm={() => handleDeleteActivity(deleteActivityTarget)}
                    onCancel={() => setDeleteActivityTarget(null)}
                />
            )}
            <NotificationContainer notifications={notifications} onDismiss={dismiss} />
        </div>
    );
}

export default App;
