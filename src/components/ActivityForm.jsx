// CR-004: "Create Activity" form with frontend validation.
// Validates before anything is sent; the parent only receives clean values
// ({ clubId: number, title, description }) and resolves true when the activity
// was created (the form then resets) or false when it failed (input is kept).

import { useId, useRef, useState } from 'react';
import { validateActivity } from '../utils/validation.js';

const EMPTY = { clubId: '', title: '', description: '' };
const FIELD_ORDER = ['clubId', 'title', 'description'];

export default function ActivityForm({ canCreate, onCreate }) {
    const [values, setValues] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const submittingRef = useRef(false);
    const formRef = useRef(null);
    const idPrefix = useId();

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

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!canCreate || submittingRef.current) return;

        const result = validateActivity(values);
        if (!result.valid) {
            setErrors(result.errors);
            const firstInvalid = FIELD_ORDER.find((name) => result.errors[name]);
            formRef.current?.querySelector(`[data-field="${firstInvalid}"]`)?.focus();
            return;
        }

        submittingRef.current = true;
        setSubmitting(true);
        try {
            const created = await onCreate(result.values);
            if (created) {
                setValues(EMPTY);
                setErrors({});
            }
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    const fieldProps = (name, label) => ({
        id: fieldId(name),
        'data-field': name,
        'aria-label': label,
        'aria-required': name !== 'description' ? 'true' : undefined,
        'aria-invalid': errors[name] ? 'true' : 'false',
        'aria-describedby': errors[name] ? errorId(name) : undefined,
        value: values[name],
        onChange: update(name),
        className: 'form-input',
    });

    const renderError = (name) =>
        errors[name] && (
            <p id={errorId(name)} role="alert" className="field-error">{errors[name]}</p>
        );

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="form-container" noValidate>
            <input type="text" inputMode="numeric" placeholder="Club ID" {...fieldProps('clubId', 'Club ID')} />
            {renderError('clubId')}
            <input type="text" placeholder="Activity Title" {...fieldProps('title', 'Activity title')} />
            {renderError('title')}
            <input type="text" placeholder="Description" {...fieldProps('description', 'Activity description')} />
            {renderError('description')}
            <button
                type="submit"
                className="button primary"
                disabled={!canCreate || submitting}
                title={canCreate ? undefined : 'Students cannot create activities'}
            >
                Create Activity
            </button>
        </form>
    );
}
