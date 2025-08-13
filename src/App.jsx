import { useState, useEffect } from 'react';
import './App.css';

// The base URL for your Spring Boot backend
const API_BASE_URL = 'http://localhost:8082/api';

// --- Login Pop-up Component (Moved outside of App) ---
const LoginPopup = ({ showLoginPopup, setShowLoginPopup, handleLogin, loginDetails, setLoginDetails, setShowRegisterPopup }) => (
    <div className={`popup-backdrop ${showLoginPopup ? 'slide-in' : ''}`}>
        <div className="popup-content">
            <div className="card card-sm">
                <div className="header-with-button">
                    <h2 className="card-title">Login &#128274;</h2>
                    <button onClick={() => setShowLoginPopup(false)} className="modal-close-button">&times;</button>
                </div>
                <form onSubmit={handleLogin} className="form-container">
                    <input 
                        type="text" 
                        placeholder="Username" 
                        value={loginDetails.username} 
                        onChange={e => setLoginDetails({ ...loginDetails, username: e.target.value })} 
                        className="form-input"
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
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
            </div>
        </div>
    </div>
);

// --- Register Pop-up Component (Moved outside of App) ---
const RegisterPopup = ({ showRegisterPopup, setShowRegisterPopup, handleRegister, registerDetails, setRegisterDetails, setShowLoginPopup, humanVerification, setHumanVerification }) => (
    <div className={`popup-backdrop ${showRegisterPopup ? 'slide-in' : ''}`}>
        <div className="popup-content">
            <div className="card card-sm">
                <div className="header-with-button">
                    <h2 className="card-title">Register &#128527;</h2>
                    <button onClick={() => setShowRegisterPopup(false)} className="modal-close-button">&times;</button>
                </div>
                <form onSubmit={handleRegister} className="form-container">
                    <input 
                        type="text" 
                        placeholder="Username" 
                        value={registerDetails.username} 
                        onChange={e => setRegisterDetails({ ...registerDetails, username: e.target.value })} 
                        className="form-input"
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={registerDetails.password} 
                        onChange={e => setRegisterDetails({ ...registerDetails, password: e.target.value })} 
                        className="form-input"
                    />
                    <input 
                        type="email" 
                        placeholder="Email" 
                        value={registerDetails.email} 
                        onChange={e => setRegisterDetails({ ...registerDetails, email: e.target.value })} 
                        className="form-input"
                    />
                    <select
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
                        <label className="verification-label">I have an eye but cannot see. What am I?</label>
                        <input
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
            </div>
        </div>
    </div>
);

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
    const [activities, setActivities] = useState([]);
    const [memberships, setMemberships] = useState([]);

    // State for forms
    const [newClub, setNewClub] = useState({ name: '', description: '' });
    const [newActivity, setNewActivity] = useState({ clubId: '', name: '', description: '' });
    const [joinClubId, setJoinClubId] = useState('');

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
            }
        }
    }, [currentPage, loggedInUser]);

    // --- API Call functions ---
    const fetchClubs = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/clubs/getclubs`);
            if (!response.ok) throw new Error(`Failed to fetch clubs: ${response.statusText}`);
            const data = await response.json();
            setClubs(data.content);
        } catch (error) {
            alert(`Error fetching clubs: ${error.message}`);
        }
    };

    const fetchAllActivities = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/activities/getactivities`);
            if (!response.ok) throw new Error(`Failed to fetch activities: ${response.statusText}`);
            const data = await response.json();
            setActivities(data.content);
            if (data.content.length === 0) {
                alert('Successfully fetched, but no activities found.');
            }
        } catch (error) {
            alert(`Error fetching all activities: ${error.message}`);
        }
    };
    
    const fetchActivitiesForClub = async (clubId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/activities/club/${clubId}`);
            if (!response.ok) throw new Error(`Failed to fetch activities: ${response.statusText}`);
            const data = await response.json();
            setActivities(data.content);
            alert(`Activities for club ${clubId} fetched successfully.`);
            setCurrentPage('activities'); 
        } catch (error) {
            alert(`Error fetching activities: ${error.message}`);
        }
    };
    
    const fetchMemberships = async (userId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/memberships/user/${userId}`);
            if (!response.ok) throw new Error(`Failed to fetch memberships: ${response.statusText}`);
            const data = await response.json();
            setMemberships(data);
        } catch (error) {
            alert(`Error fetching memberships: ${error.message}`);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginDetails),
            });
            if (response.status === 200) {
                const user = await response.json();
                setLoggedInUser(user);
                alert(`Login successful! Welcome, ${user.username}.`);
                setShowLoginPopup(false);
                setCurrentPage('dashboard');
            } else {
                const errorMessage = await response.text();
                alert(`Login failed: ${errorMessage}`);
                setLoggedInUser(null);
            }
        } catch (error) {
            alert(`Login Error: ${error.message}`);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        
        // Fun human verification check
        if (humanVerification.toLowerCase().trim() !== 'a needle') {
            alert('That\'s not the answer! I think you are not a human, Try again.');
            return; 
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registerDetails),
            });
            if (response.status === 200) {
                const user = await response.json();
                alert(`Registration successful! You can now log in.`);
                setRegisterDetails({ username: '', password: '', email: '', role: 'Student' });
                setShowRegisterPopup(false);
                setShowLoginPopup(true);
            } else {
                const errorMessage = await response.text();
                alert(`Registration failed: ${errorMessage}`);
            }
        } catch (error) {
            alert(`Registration Error: ${error.message}`);
        }
    };

    const handleCreateClub = async (e) => {
        e.preventDefault();
        try {
            const clubData = { ...newClub, leaderId: loggedInUser.id };
            const response = await fetch(`${API_BASE_URL}/clubs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clubData),
            });
            if (!response.ok) throw new Error(`Failed to create club: ${response.statusText}`);
            const data = await response.json();
            alert(`Club created: ${data.name} (ID: ${data.id})`);
            setNewClub({ name: '', description: '' });
            fetchClubs();
        } catch (error) {
            alert(`Create Club Error: ${error.message}`);
        }
    };

    const handleUpdateClub = async (id) => {
        const newName = prompt('Enter new club name:');
        if (!newName) return;
        try {
            const response = await fetch(`${API_BASE_URL}/clubs/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName }),
            });
            if (!response.ok) throw new Error(`Failed to update club: ${response.statusText}`);
            const data = await response.json();
            alert(`Club updated to: ${data.name}`);
            fetchClubs();
        } catch (error) {
            alert(`Update Club Error: ${error.message}`);
        }
    };

    const handleDeleteClub = async (id) => {
        if (window.confirm('Are you sure you want to delete this club? This action cannot be undone.')) {
            try {
                const response = await fetch(`${API_BASE_URL}/clubs/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error(`Failed to delete club: ${response.statusText}`);
                alert('Club deleted successfully.');
                fetchClubs();
            } catch (error) {
                alert(`Delete Club Error: ${error.message}`);
            }
        }
    };

    const handleCreateActivity = async (e) => {
        e.preventDefault();
        try {
            const activityData = {
                ...newActivity,
                club: { id: newActivity.clubId }
            };
            const response = await fetch(`${API_BASE_URL}/activities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activityData),
            });
            if (!response.ok) throw new Error(`Failed to create activity: ${response.statusText}`);
            const data = await response.json();
            alert(`Activity created: ${data.name} (Club ID: ${data.club.id})`);
            setNewActivity({ clubId: '', name: '', description: '' });
            fetchAllActivities();
        } catch (error) {
            alert(`Create Activity Error: ${error.message}`);
        }
    };
    
    const handleJoinClub = async (e) => {
        e.preventDefault();
        try {
            if (!loggedInUser) {
                alert('Please log in first to join a club.');
                return;
            }
            
            const membershipData = {
                user: { id: loggedInUser.id },
                club: { id: joinClubId }
            };

            const response = await fetch(`${API_BASE_URL}/memberships/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(membershipData),
            });
            if (response.ok) {
                const data = await response.json();
                alert(`Successfully joined club ${data.club.id}.`);
                setJoinClubId('');
            } else {
                const errorMessage = await response.text();
                alert(`Failed to join club: ${errorMessage}`);
            }
        } catch (error) {
            alert(`Join Club Error: ${error.message}`);
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
                                alert('Logged out.');
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
                                    disabled={loggedInUser.role !== 'Admin'}
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
                                                <button onClick={() => handleUpdateClub(club.id)} className="button list-update">Update</button>
                                                <button onClick={() => handleDeleteClub(club.id)} className="button list-delete">Delete</button>
                                            </div>
                                        </li>
                                    ))
                                ) : (
                                    <li className="no-data-text">No clubs found.</li>
                                )}
                            </ul>
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
                            <form onSubmit={handleCreateActivity} className="form-container">
                                <input 
                                    type="text" 
                                    placeholder="Club ID" 
                                    value={newActivity.clubId} 
                                    onChange={e => setNewActivity({ ...newActivity, clubId: e.target.value })} 
                                    className="form-input"
                                />
                                <input 
                                    type="text" 
                                    placeholder="Activity Name" 
                                    value={newActivity.name} 
                                    onChange={e => setNewActivity({ ...newActivity, name: e.target.value })} 
                                    className="form-input"
                                />
                                <input 
                                    type="text" 
                                    placeholder="Description" 
                                    value={newActivity.description} 
                                    onChange={e => setNewActivity({ ...newActivity, description: e.target.value })} 
                                    className="form-input"
                                />
                                <button
                                    type="submit"
                                    className="button primary"
                                    disabled={loggedInUser.role === 'Student'}
                                >
                                    Create Activity
                                </button>
                            </form>
                        </div>

                        <div className="section-container">
                            <h3 className="section-title">Activities List</h3>
                            <ul className="list-group">
                                {activities.length > 0 ? (
                                    activities.map(activity => (
                                        <li key={activity.id} className="list-item">
                                            <span className="list-item-text">
                                                <strong>{activity.club.name}</strong> -{activity.description} (Club ID: {activity.id})
                                            </span>
                                        </li>
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
                    <div className="card card-sm">
                        <div className="header-with-button">
                            <h2 className="card-title">Join a Club &#127882;</h2>
                            <button onClick={() => setCurrentPage('dashboard')} className="button secondary">
                                Back
                            </button>
                        </div>
                        <form onSubmit={handleJoinClub} className="form-container">
                            <input 
                                type="text" 
                                placeholder="Club ID to join" 
                                value={joinClubId} 
                                onChange={e => setJoinClubId(e.target.value)} 
                                className="form-input"
                            />
                            <button 
                                type="submit" 
                                className="button primary"
                            >
                                Join Club
                            </button>
                        </form>
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
                                                <strong>{membership.club.name}</strong> (ID: {membership.club.id})
                                                {membership.club.description && <span className="description-text"> - {membership.club.description}</span>}
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
                    showLoginPopup={showLoginPopup} 
                    setShowLoginPopup={setShowLoginPopup}
                    handleLogin={handleLogin}
                    loginDetails={loginDetails}
                    setLoginDetails={setLoginDetails}
                    setShowRegisterPopup={setShowRegisterPopup}
                />
            )}
            {showRegisterPopup && (
                <RegisterPopup 
                    showRegisterPopup={showRegisterPopup} 
                    setShowRegisterPopup={setShowRegisterPopup}
                    handleRegister={handleRegister}
                    registerDetails={registerDetails}
                    setRegisterDetails={setRegisterDetails}
                    setShowLoginPopup={setShowLoginPopup}
                    humanVerification={humanVerification}
                    setHumanVerification={setHumanVerification}
                />
            )}
        </div>
    );
}

export default App;