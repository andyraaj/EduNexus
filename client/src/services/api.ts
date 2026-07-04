/**
 * Centralized API client for all EduNexus ERP requests.
 *
 * IMPORTANT: Uses axios + credentials to support cookie-based refresh flows,
 * while still allowing bearer access tokens from `AuthContext`.
 */

import axios, { AxiosInstance } from 'axios';
import { clearAccessToken, getAccessToken, setAccessToken } from './tokenStore';

const API_BASE_URL =
    (import.meta as any).env?.VITE_API_BASE_URL ||
    '/api/v1';

const ACCESS_TOKEN_KEY = 'EduNexus_access_token';

type ApiEnvelope<T> =
    | { success: true; data: T; meta?: Record<string, unknown>; message?: string }
    | { success: false; error?: { message?: string } };

const client: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    // NOTE: Do NOT set a default Content-Type here.
    // Axios automatically sets 'application/json' for JSON bodies.
    // Setting it as a default suppresses the 'multipart/form-data; boundary=...' header
    // that browsers inject for FormData, breaking multer file uploads on the server.
});

const readCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const prefix = `${name}=`;
    const item = document.cookie.split('; ').find(part => part.startsWith(prefix));
    return item ? decodeURIComponent(item.slice(prefix.length)) : null;
};

const unwrap = <T>(envelope: ApiEnvelope<T>): T => {
    if ((envelope as any)?.success) {
        const data = (envelope as any).data as T;
        // Merge meta into data when present (for paginated responses)
        const meta = (envelope as any).meta;
        if (meta && typeof data === 'object' && data !== null) {
            return { ...data, meta } as T;
        }
        return data;
    }
    const msg = (envelope as any)?.error?.message || (envelope as any)?.message || 'Request failed.';
    throw new Error(msg);
};

// ── Silent Refresh (401 TOKEN_EXPIRED) ──────────────────────────────────────
let isRefreshing = false;
let pending: Array<(token: string | null) => void> = [];

const resolvePending = (token: string | null) => {
    pending.forEach(fn => fn(token));
    pending = [];
};

client.interceptors.request.use((config) => {
    // If caller didn't supply Authorization, use the in-memory access token.
    const hasAuthHeader = !!(config.headers as any)?.Authorization;
    if (!hasAuthHeader) {
        const token = getAccessToken();
        if (token) {
            (config.headers as any) = { ...(config.headers as any), Authorization: `Bearer ${token}` };
        }
    }

    // For FormData bodies, delete Content-Type so the browser sets
    // 'multipart/form-data; boundary=...' automatically with the correct boundary.
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
        if ((config.headers as any)?.['Content-Type']) {
            delete (config.headers as any)['Content-Type'];
        }
    }

    const method = String(config.method || 'get').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const csrf = readCookie('EduNexus_csrf');
        if (csrf) {
            (config.headers as any) = { ...(config.headers as any), 'X-CSRF-Token': csrf };
        }
    }
    return config;
});

client.interceptors.response.use(
    (res) => res,
    async (error) => {
        const status = error?.response?.status;
        const code = error?.response?.data?.error?.code;
        const originalRequest = error?.config;

        const isAuthRefreshCall = typeof originalRequest?.url === 'string' && originalRequest.url.includes('/auth/refresh');
        const shouldAttemptRefresh =
            status === 401 &&
            (code === 'TOKEN_EXPIRED' || code === 'TOKEN_INVALID' || code === 'NO_TOKEN') &&
            !isAuthRefreshCall &&
            !originalRequest?._retry;

        if (!shouldAttemptRefresh) {
            if (status === 400) error.message = `Validation Error: ${error.response?.data?.message || error.response?.data?.error?.message || 'Bad Request'}`;
            else if (status === 404) error.message = `Not Found: ${error.response?.data?.message || error.response?.data?.error?.message || 'Not Found'}`;
            else if (status >= 500) error.message = `Server Error: ${error.response?.data?.message || error.response?.data?.error?.message || 'Server Error'}`;
            else if (error.response?.data?.message || error.response?.data?.error?.message) {
                error.message = error.response.data.message || error.response.data.error.message;
            }
            throw error;
        }

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                pending.push((newToken) => {
                    if (!newToken) return reject(error);
                    originalRequest._retry = true;
                    originalRequest.headers = { ...(originalRequest.headers || {}), Authorization: `Bearer ${newToken}` };
                    resolve(client(originalRequest));
                });
            });
        }

        isRefreshing = true;
        try {
            const refreshRes = await client.post<ApiEnvelope<{ accessToken: string }>>('/auth/refresh', {});
            const newToken = unwrap(refreshRes.data).accessToken;
            setAccessToken(newToken);
            resolvePending(newToken);

            originalRequest._retry = true;
            originalRequest.headers = { ...(originalRequest.headers || {}), Authorization: `Bearer ${newToken}` };
            return client(originalRequest);
        } catch (refreshErr) {
            clearAccessToken();
            resolvePending(null);
            throw refreshErr;
        } finally {
            isRefreshing = false;
        }
    }
);

const api = {
    get: async <T = any>(endpoint: string, token?: string | null): Promise<T> => {
        const res = await client.get<ApiEnvelope<T>>(endpoint, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        return unwrap(res.data);
    },

    post: async <T = any>(
        endpoint: string,
        body: Record<string, unknown> = {},
        token?: string | null
    ): Promise<T> => {
        const res = await client.post<ApiEnvelope<T>>(endpoint, body, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        return unwrap(res.data);
    },

    put: async <T = any>(
        endpoint: string,
        body: Record<string, unknown> = {},
        token?: string | null
    ): Promise<T> => {
        const res = await client.put<ApiEnvelope<T>>(endpoint, body, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        return unwrap(res.data);
    },

    delete: async <T = any>(endpoint: string, token?: string | null): Promise<T> => {
        const res = await client.delete<ApiEnvelope<T>>(endpoint, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        return unwrap(res.data);
    },

    patch: async <T = any>(
        endpoint: string,
        body: Record<string, unknown> = {},
        token?: string | null
    ): Promise<T> => {
        const res = await client.patch<ApiEnvelope<T>>(endpoint, body, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        return unwrap(res.data);
    },
};

export default api;
export { client, API_BASE_URL, ACCESS_TOKEN_KEY };
