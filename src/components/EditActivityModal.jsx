// REQ-008: modal form for updating an activity (title, description, date).
// The owning club is shown but cannot be changed (the backend ignores it).
// Validation happens here; the parent only receives clean values and is responsible for
// the PUT /activities/{id} request. Errors from the backend are shown by the parent.

import { useId, useState } from 'react';
import Modal from './Modal.jsx';
import { toIsoDate, validateActivityEdit } from '../utils/validation.js';

export default function EditActivityModal({ activity, onSubmit, onCancel, submitting = false }) {
    const idPrefix = useId();
    const [values, setValues] = useState({
        title: activity?.title ?? '',
        description: activity?.description ?? '',
        date: toIsoDate(activity?.date),
    });
    const [errors, setErrors] = useState({});

    const fieldId = (name) => `${idPrefix}-${name}`;
    const errorId = (name) => `${idPrefix}-${name}-error`;

    const update = (name) => (event) => {
        const { value } = event.target;
        setValues((previous) => ({ ...previous, [name]: value }));
        setErrors((previous) => {
            if (!previous[name]) return previous;
            const next = { ...previous };
            delete next[name];
            return next;
        });
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (submitting) return;
        const result = validateActivityEdit(values);
        if (!result.valid) {
            setErrors(result.errors);
            return;
        }
        onSubmit(result.values);
    };

    const field = (name, label, type = 'text') => (
        <>
            <label htmlFor={fieldId(name)} className="verification-label">{label}</label>
            <input
                id={fieldId(name)}
                type={type}
                value={values[name]}
                onChange={update(name)}
                className="form-input"
                aria-required={name === 'title' ? 'true' : undefined}
                aria-invalid={errors[name] ? 'true' : 'false'}
                aria-describedby={errors[name] ? errorId(name) : undefined}
            />
            {errors[name] && <p id={errorId(name)} role="alert" className="field-error">{errors[name]}</p>}
        </>
    );

    return (
        <Modal title="Edit activity" onClose={onCancel}>
            <form onSubmit={handleSubmit} className="form-container" noValidate>
                {field('title', 'Activity title')}
                {field('description', 'Description')}
                {field('date', 'Date (optional)', 'date')}
                <div className="button-group">
                    <button type="submit" className="button primary" disabled={submitting}>Save</button>
                    <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
                </div>
            </form>
        </Modal>
    );
}
