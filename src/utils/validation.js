// CR-004: frontend validation for the "Create Activity" form.
// Limits mirror the backend: Activity.title / description are plain JPA String
// columns (VARCHAR(255) by default) and club.id is a Long.

export const ACTIVITY_TEXT_MAX = 255;

/**
 * Validate the "Create Club" form. The name is required; the description is optional.
 * Same 255 character limit as activities (Club.name / description are plain String columns).
 * Returns { valid, errors, values } with trimmed values ({ name, description }).
 */
export function validateClub({ name, description } = {}) {
    const errors = {};
    const cleanName = String(name ?? '').trim();
    const cleanDescription = String(description ?? '').trim();

    if (!cleanName) {
        errors.name = 'Club name is required.';
    } else if (cleanName.length > ACTIVITY_TEXT_MAX) {
        errors.name = `Club name must be ${ACTIVITY_TEXT_MAX} characters or fewer.`;
    }

    if (cleanDescription.length > ACTIVITY_TEXT_MAX) {
        errors.description = `Description must be ${ACTIVITY_TEXT_MAX} characters or fewer.`;
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
        values: { name: cleanName, description: cleanDescription },
    };
}

/**
 * Validate raw form values.
 * Returns { valid, errors, values } where `values` holds the cleaned payload
 * ({ clubId: number, title, description }) and `errors` maps field -> message.
 */
export function validateActivity({ clubId, title, description } = {}) {
    const errors = {};
    const cleanClubId = String(clubId ?? '').trim();
    const cleanTitle = String(title ?? '').trim();
    const cleanDescription = String(description ?? '').trim();

    if (!cleanClubId) {
        errors.clubId = 'Club ID is required.';
    } else if (!/^\d+$/.test(cleanClubId) || !Number.isSafeInteger(Number(cleanClubId)) || Number(cleanClubId) < 1) {
        errors.clubId = 'Club ID must be a positive whole number.';
    }

    if (!cleanTitle) {
        errors.title = 'Activity title is required.';
    } else if (cleanTitle.length > ACTIVITY_TEXT_MAX) {
        errors.title = `Activity title must be ${ACTIVITY_TEXT_MAX} characters or fewer.`;
    }

    if (cleanDescription.length > ACTIVITY_TEXT_MAX) {
        errors.description = `Description must be ${ACTIVITY_TEXT_MAX} characters or fewer.`;
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
        values: { clubId: Number(cleanClubId), title: cleanTitle, description: cleanDescription },
    };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normalise an Activity.date as returned by the backend (a "YYYY-MM-DD" string; the
 * numeric [year, month, day] array form is also accepted) to "YYYY-MM-DD", or '' if absent
 * or not understood.
 */
export function toIsoDate(value) {
    if (Array.isArray(value) && value.length === 3 && value.every((part) => Number.isInteger(part))) {
        const [year, month, day] = value;
        return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    const text = String(value ?? '').trim();
    return ISO_DATE.test(text) ? text : '';
}

function isRealDate(isoText) {
    const [year, month, day] = isoText.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

/**
 * REQ-008: validate the "Edit activity" form. Title is required, title/description are limited
 * to 255 characters, the date is optional but must be a real YYYY-MM-DD date. The club cannot be
 * changed (the backend ignores it). Returns { valid, errors, values } with
 * values = { title, description, date } where an empty date is sent as null.
 */
export function validateActivityEdit({ title, description, date } = {}) {
    const errors = {};
    const cleanTitle = String(title ?? '').trim();
    const cleanDescription = String(description ?? '').trim();
    const cleanDate = String(date ?? '').trim();

    if (!cleanTitle) {
        errors.title = 'Activity title is required.';
    } else if (cleanTitle.length > ACTIVITY_TEXT_MAX) {
        errors.title = `Activity title must be ${ACTIVITY_TEXT_MAX} characters or fewer.`;
    }

    if (cleanDescription.length > ACTIVITY_TEXT_MAX) {
        errors.description = `Description must be ${ACTIVITY_TEXT_MAX} characters or fewer.`;
    }

    if (cleanDate && !(ISO_DATE.test(cleanDate) && isRealDate(cleanDate))) {
        errors.date = 'Date must be a valid date (YYYY-MM-DD).';
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
        values: { title: cleanTitle, description: cleanDescription, date: cleanDate || null },
    };
}
