// CR-002 / CR-003: helpers for the backend's Spring Data `Page` responses.
//
// The backend (ClubController / ActivityController) returns `Page<T>`, which
// serializes as { content: [...], number, size, totalPages, totalElements,
// first, last, empty, ... } and accepts `page` (0-based) and `size` (default 10).
// Newer Spring Data versions can instead nest the metadata under `page`
// ({ content, page: { number, size, totalElements, totalPages } }); both shapes
// are understood. A bare array is treated as a single complete page.

/** Upper bound on requests made by fetchAllPages, so a bad response cannot loop forever. */
export const DEFAULT_MAX_PAGES = 50;

const toCount = (value) => (Number.isInteger(value) && value >= 0 ? value : null);

/**
 * Validate and normalize one page response.
 * `valid` is false when the payload is not a page/array (content is then []).
 * `hasMore` is true/false when the metadata says so, or null when it cannot be
 * determined. If the metadata sources disagree, "more pages" wins so that
 * records are never silently dropped.
 */
export function normalizePage(data) {
    if (Array.isArray(data)) {
        return { valid: true, content: data, number: 0, size: data.length, totalPages: 1, totalElements: data.length, hasMore: false };
    }
    if (!data || typeof data !== 'object' || !Array.isArray(data.content)) {
        return { valid: false, content: [], number: null, size: null, totalPages: null, totalElements: null, hasMore: false };
    }

    const meta = data.page && typeof data.page === 'object' ? data.page : data;
    const number = toCount(meta.number ?? data.number);
    const size = toCount(meta.size ?? data.size);
    const totalPages = toCount(meta.totalPages ?? data.totalPages);
    const totalElements = toCount(meta.totalElements ?? data.totalElements);
    const last = typeof data.last === 'boolean' ? data.last : null;

    const signals = [];
    if (last !== null) signals.push(!last);
    if (number !== null && totalPages !== null) signals.push(number + 1 < totalPages);

    let hasMore = signals.length > 0 ? signals.some(Boolean) : null;
    // An empty page can never lead to further records.
    if (hasMore && data.content.length === 0) hasMore = false;

    return { valid: true, content: data.content, number, size, totalPages, totalElements, hasMore };
}

/** Append `incoming` to `existing`, skipping items whose `id` is already present. */
export function mergeById(existing, incoming) {
    const seen = new Set(existing.map((item) => item?.id).filter((id) => id !== null && id !== undefined).map(String));
    const merged = [...existing];
    for (const item of incoming) {
        const id = item?.id;
        if (id === null || id === undefined) {
            merged.push(item);
        } else if (!seen.has(String(id))) {
            seen.add(String(id));
            merged.push(item);
        }
    }
    return merged;
}

/**
 * Retrieve every page. `fetchPage(pageIndex)` must resolve to the raw response.
 * Stops when the metadata says the last page was reached, when a page is empty,
 * or after `maxPages` (then `truncated` is true so the caller can tell the user).
 * When the metadata is missing, a page that is at least `size` long is assumed
 * to have a successor. Throws if a page response has an unexpected structure.
 */
export async function fetchAllPages(fetchPage, { size, maxPages = DEFAULT_MAX_PAGES } = {}) {
    let items = [];
    let pages = 0;
    for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
        const page = normalizePage(await fetchPage(pageIndex));
        if (!page.valid) {
            throw new Error('Unexpected response from the server (not a page of results).');
        }
        pages += 1;
        items = mergeById(items, page.content);
        const hasMore = page.hasMore ?? (size !== undefined && page.content.length >= size);
        if (!hasMore || page.content.length === 0) {
            return { items, pages, truncated: false };
        }
    }
    return { items, pages, truncated: true };
}
