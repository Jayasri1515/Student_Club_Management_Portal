// REQ-004: reusable API client.
//
// Responsibilities: base URL + path joining, JSON headers/serialization,
// response parsing (JSON / text / empty body) and error normalization.
//
// Authentication note: the backend's POST /api/auth/login currently returns the
// plain User entity (id, username, email, role, ...) and NO token, and the
// backend has no Spring Security / JWT. Therefore this client intentionally
// never sends an Authorization header. If the backend later returns a token,
// its field name and header format must be confirmed first and a token option
// added here.

import { API_BASE_URL } from '../config/apiConfig.js';

/** Error thrown for every failed request, with a user-presentable message. */
export class ApiError extends Error {
    constructor(message, { status = 0, data = null, cause } = {}) {
        super(message, cause ? { cause } : undefined);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

export function buildUrl(baseUrl, path) {
    const base = String(baseUrl ?? '').replace(/\/+$/, '');
    const suffix = String(path ?? '').replace(/^\/+/, '');
    return suffix ? `${base}/${suffix}` : base;
}

async function parseBody(response) {
    const text = await response.text();
    if (!text) return null;
    const contentType = response.headers?.get?.('content-type') ?? '';
    if (contentType.includes('json')) {
        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }
    return text;
}

/** Derive a readable message from an error response body / status. */
export function extractErrorMessage(data, response) {
    if (typeof data === 'string' && data.trim()) return data.trim();
    if (data && typeof data === 'object') {
        if (typeof data.message === 'string' && data.message.trim()) return data.message.trim();
        if (typeof data.error === 'string' && data.error.trim()) return data.error.trim();
    }
    const statusText = response.statusText?.trim();
    if (statusText) return statusText;
    return `Request failed with status ${response.status}`;
}

/**
 * Perform a request against the backend.
 * Resolves with the parsed body (object/array, string, or null for empty body).
 * Rejects with ApiError (status 0 for network failures).
 */
export async function request(path, { method = 'GET', body, headers, baseUrl = API_BASE_URL } = {}) {
    const init = { method, headers: { Accept: 'application/json', ...headers } };
    if (body !== undefined) {
        init.headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(body);
    }

    let response;
    try {
        response = await fetch(buildUrl(baseUrl, path), init);
    } catch (error) {
        throw new ApiError('Unable to reach the server. Please check your connection and try again.', {
            status: 0,
            cause: error,
        });
    }

    const data = await parseBody(response);
    if (!response.ok) {
        throw new ApiError(extractErrorMessage(data, response), { status: response.status, data });
    }
    return data;
}

export const apiClient = {
    get: (path, options) => request(path, { ...options, method: 'GET' }),
    post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
    put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
    delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};
