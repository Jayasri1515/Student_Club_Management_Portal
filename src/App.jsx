import { useState, useEffect, useRef } from 'react';
import './App.css';
import { apiClient } from './services/apiClient.js';
import {
    canCreateClub,
    canUpdateClub,
    canDeleteClub,
    canCreateActivity,
    canJoinClub,
} from './utils/permissions.js';
import { useNotifications } from './hooks/useNotifications.js';
import NotificationContainer from './components/Notification.jsx';
import RenameClubModal from './components/RenameClubModal.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import ActivityItem from './components/ActivityItem.jsx';
import ClubBrowser from './components/ClubBrowser.jsx';
import ActivityForm from './components/ActivityForm.jsx';
import Modal from './components/Modal.jsx';
import { normalizeId, sameId } from './utils/ids.js';
import { normalizePage, mergeById, fetchAllPages } from './utils/pagination.js';

// The backend base URL now lives in src/config/apiConfig.js (VITE_API_BASE_URL, REQ-001)
// and all HTTP calls go through src/services/apiClient.js (REQ-004).

// --- Login Pop-up Component (Moved outside of App) ---
// CR-006: rendered through the shared accessible Modal (role=dialog, focus
// management, Escape, labelled title). A backdrop click does not close it, so
// typed credentials are not lost accidentally (same as before).
const LoginPopup = ({ setShowLoginPopup, handleLogin, loginDetails, setLoginDetails, setShowRegisterPopup }) => (
    <Modal title={<>Login &#128274;</>} onClose={() => setShowLoginPopup(false)} closeOnBackdrop={false}>
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
                <option value="Admin">Admin</option>
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
    const [activities, setActivities] = useState([]);
    const [memberships, setMemberships] = useState([]);

    // State for forms
    const [newClub, setNewClub] = useState({ name: '', description: '' });

    // State for in-app dialogs / feedback (REQ-002, REQ-005)
    const { notifications, dismiss, success, error: notifyError, info } = useNotifications();
    const [renameTarget, setRenameTarget] = useState(null);
    const [renaming, setRenaming] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [joiningClubIds, setJoiningClubIds] = useState([]);
    const [loadingMoreClubs, setLoadingMoreClubs] = useState(false);
    // Synchronous guards (state updates are asynchronous, so a fast double click could
    // otherwise start two requests).
    const joiningRef = useRef(new Set());
    const loadingMoreClubsRef = useRef(false);
    const clubsRequestRef = useRef(0);
    const activitiesRequestRef = useRef(0);

    /**
     * This useEffect hook is the central point for fetching data.
     * It runs whenever `currentPage` or `loggedInUser` changes.
     */
    useEffect(() => {
        if (loggedInUser) {
            if (currentPage === 'clubs') {
                fetchClubs();
            } else if (currentPage === 'activities') {
                fetchAllActivities();
            } else if (currentPage === 'memberships') {
                fetchMemberships(loggedInUser.id);
            } else if (currentPage === 'join') {
                fetchClubs();
                fetchMemberships(loggedInUser.id);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on page/user only (as before)
    }, [currentPage, loggedInUser]);

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
            const data = await apiClient.get(`/clubs/getclubs?page=${page}`);
            if (requestId !== clubsRequestRef.current) return;
            const result = normalizePage(data);
            if (!result.valid) {
                notifyError('Error fetching clubs: unexpected response from the server.');
                return;
            }
            setClubs((previous) => (page === 0 ? result.content : mergeById(previous, result.content)));
            setClubsPaging({ nextPage: page + 1, hasMore: result.hasMore === true });
        } catch (error) {
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
    // Returns the activities, or null if the request failed or was superseded.
    const loadAllActivities = async (basePath, failureLabel) => {
        const requestId = ++activitiesRequestRef.current;
        try {
            const { items, truncated } = await fetchAllPages(
                (page) => apiClient.get(`${basePath}?page=${page}&size=${ACTIVITY_PAGE_SIZE}`),
                { size: ACTIVITY_PAGE_SIZE },
            );
            if (requestId !== activitiesRequestRef.current) return null;
            setActivities(items);
            if (truncated) {
                notifyError(`Only the first ${items.length} activities are shown; there are more than can be loaded at once.`);
            }
            return items;
        } catch (error) {
            if (requestId === activitiesRequestRef.current) notifyError(`${failureLabel}: ${error.message}`);
            return null;
        }
    };

    const fetchAllActivities = () => loadAllActivities('/activities/getactivities', 'Error fetching all activities');

    const fetchActivitiesForClub = async (clubId) => {
        const items = await loadAllActivities(`/activities/club/${clubId}`, 'Error fetching activities');
        if (items === null) return;
        info(`Showing activities for club ${clubId}.`);
        setCurrentPage('activities');
    };

    const fetchMemberships = async (userId) => {
        try {
            const data = await apiClient.get(`/memberships/user/${userId}`);
            setMemberships(Array.isArray(data) ? data : []);
        } catch (error) {
            notifyError(`Error fetching memberships: ${error.message}`);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // The backend returns the User entity (no token) - see apiClient.js.
            const user = await apiClient.post('/auth/login', loginDetails);
            setLoggedInUser(user);
            success(`Login successful! Welcome, ${user.username}.`);
            setShowLoginPopup(false);
            setCurrentPage('dashboard');
        } catch (error) {
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
            const result = await apiClient.post('/auth/register', registerDetails);
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
            notifyError(`Registration failed: ${error.message}`);
        }
    };

    const handleCreateClub = async (e) => {
        e.preventDefault();
        if (!canCreateClub(loggedInUser)) return;
        try {
            const clubData = { ...newClub, leaderId: loggedInUser.id };
            const data = await apiClient.post('/clubs', clubData);
            success(`Club created: ${data.name} (ID: ${data.id})`);
            setNewClub({ name: '', description: '' });
            fetchClubs();
        } catch (error) {
            notifyError(`Create Club Error: ${error.message}`);
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
            });
            success(`Club updated to: ${data.name}`);
            setRenameTarget(null);
            fetchClubs();
        } catch (error) {
            notifyError(`Update Club Error: ${error.message}`);
        } finally {
            setRenaming(false);
        }
    };

    const handleDeleteClub = async (club) => {
        setDeleteTarget(null);
        if (!canDeleteClub(loggedInUser, club)) return;
        try {
            await apiClient.delete(`/clubs/${club.id}`);
            success('Club deleted successfully.');
            fetchClubs();
        } catch (error) {
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
            const data = await apiClient.post('/activities', activityData);
            success(`Activity created: ${data?.title ?? values.title} (Club ID: ${data?.club?.id ?? values.clubId})`);
            fetchAllActivities();
            return true;
        } catch (error) {
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
        if (joiningRef.current.has(clubKey)) return;
        if (memberships.some((membership) => sameId(membership?.club?.id, clubKey))) {
            info(`You have already joined ${club.name}.`);
            return;
        }
        joiningRef.current.add(clubKey);
        setJoiningClubIds(Array.from(joiningRef.current));
        try {
            // Existing join endpoint and payload shape.
            const membershipData = {
                user: { id: loggedInUser.id },
                club: { id: club.id }
            };
            const data = await apiClient.post('/memberships/join', membershipData);
            success(`Successfully joined ${data?.club?.name ?? club.name}.`);
            fetchMemberships(loggedInUser.id);
        } catch (error) {
            notifyError(`Failed to join club: ${error.message}`);
        } finally {
            joiningRef.current.delete(clubKey);
            setJoiningClubIds(Array.from(joiningRef.current));
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
                                <button onClick={() => setCurrentPage('activities')} className="button-large">
                                    Go to Activity Management
                                </button>
                                <button onClick={() => setCurrentPage('join')} className="button-large">
                                    Go to Join a Club
                                </button>
                                <button onClick={() => setCurrentPage('memberships')} className="button-large">
                                    View My Memberships
                                </button>
                            </div>
                            <button onClick={() => {
                                setLoggedInUser(null);
                                setCurrentPage('dashboard');
                                setClubs([]);
                                setActivities([]);
                                setMemberships([]);
                                info('Logged out.');
                            }} className="button-large logout-button">
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
                            <form onSubmit={handleCreateClub} className="form-container">
                                <input 
                                    type="text" 
                                    placeholder="Club Name" 
                                    value={newClub.name} 
                                    onChange={e => setNewClub({ ...newClub, name: e.target.value })} 
                                    className="form-input"
                                />
                                <input 
                                    type="text" 
                                    placeholder="Description" 
                                    value={newClub.description} 
                                    onChange={e => setNewClub({ ...newClub, description: e.target.value })} 
                                    className="form-input"
                                />
                                <button
                                    type="submit"
                                    className="button primary"
                                    disabled={!canCreateClub(loggedInUser)}
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
                                                <button onClick={() => fetchActivitiesForClub(club.id)} className="button list-update">View Activities</button>
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
                            <ul className="list-group">
                                {activities.length > 0 ? (
                                    activities.map((activity, index) => (
                                        <ActivityItem key={activity?.id ?? `activity-${index}`} activity={activity} />
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
                            joiningClubIds={joiningClubIds}
                            hasMore={clubsPaging.hasMore}
                            loadingMore={loadingMoreClubs}
                            onJoin={handleJoinClub}
                            onLoadMore={() => fetchClubs(clubsPaging.nextPage)}
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
                            {/* REQ-006: leaving a club is not offered - the backend has no leave/delete-membership endpoint. */}
                            <ul className="list-group">
                                {memberships.length > 0 ? (
                                    memberships.map(membership => (
                                        <li key={membership.id} className="list-item">
                                            <span className="list-item-text">
                                                <strong>{membership.club?.name ?? 'Unknown club'}</strong> (ID: {membership.club?.id ?? 'N/A'})
                                                {membership.club?.description && <span className="description-text"> - {membership.club.description}</span>}
                                            </span>
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
            <NotificationContainer notifications={notifications} onDismiss={dismiss} />
        </div>
    );
}

export default App;
