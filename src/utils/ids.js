// CR-001: club / entity IDs arrive as numbers from the backend (Long) but as
// strings from form fields and URLs. Always compare them through these helpers.

/** Canonical string form of an ID, or null when it is missing/blank. */
export function normalizeId(id) {
    if (id === null || id === undefined) return null;
    const normalized = String(id).trim();
    return normalized === '' ? null : normalized;
}

/** True when both IDs are present and identical after normalization (1 === '1'). */
export function sameId(a, b) {
    const left = normalizeId(a);
    return left !== null && left === normalizeId(b);
}
