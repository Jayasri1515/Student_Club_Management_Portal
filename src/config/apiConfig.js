// REQ-001: single source of truth for the backend base URL.
//
// The value comes from the Vite env variable VITE_API_BASE_URL (set in `.env*`
// files or in the hosting provider's environment at build time). When it is
// missing or blank, the local development backend is used.

export const DEFAULT_API_BASE_URL = 'http://localhost:8082/api';

/**
 * Trim whitespace and remove trailing slashes so that paths can always be
 * appended as `${base}/${path}` without producing `//`.
 */
export function normalizeBaseUrl(url) {
    if (typeof url !== 'string') return '';
    return url.trim().replace(/\/+$/, '');
}

/**
 * Resolve the effective base URL from a raw (env) value.
 * Falls back to DEFAULT_API_BASE_URL when the value is empty/blank/not a string.
 */
export function resolveApiBaseUrl(rawValue) {
    const normalized = normalizeBaseUrl(rawValue);
    return normalized || DEFAULT_API_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env?.VITE_API_BASE_URL);
