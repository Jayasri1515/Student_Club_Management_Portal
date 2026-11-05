// CR-004: frontend validation for the "Create Activity" form.
// Limits mirror the backend: Activity.title / description are plain JPA String
// columns (VARCHAR(255) by default) and club.id is a Long.

export const ACTIVITY_TEXT_MAX = 255;

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
