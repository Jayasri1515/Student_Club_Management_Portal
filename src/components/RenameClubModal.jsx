// REQ-002: replaces window.prompt() for renaming a club.

import { useState } from 'react';
import Modal from './Modal.jsx';

export default function RenameClubModal({ club, onSubmit, onCancel, submitting = false }) {
    const [name, setName] = useState(club?.name ?? '');
    const [error, setError] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) {
            setError('Club name is required.');
            return;
        }
        setError('');
        onSubmit(trimmed);
    };

    return (
        <Modal title="Rename club" onClose={onCancel}>
            <form onSubmit={handleSubmit} className="form-container" noValidate>
                <label htmlFor="rename-club-name" className="verification-label">New club name</label>
                <input
                    id="rename-club-name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="form-input"
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? 'rename-club-error' : undefined}
                />
                {error && (
                    <p id="rename-club-error" role="alert" className="field-error">{error}</p>
                )}
                <div className="button-group">
                    <button type="submit" className="button primary" disabled={submitting}>Save</button>
                    <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
                </div>
            </form>
        </Modal>
    );
}
