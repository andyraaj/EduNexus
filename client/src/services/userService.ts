import api from './api';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface UserRecord {
    _id: string;
    name: string;
    email: string;
    role: 'student' | 'faculty' | 'admin';
    isActive: boolean;
    lastLogin: string | null;
    createdAt: string;
    bio?: string;
    pronouns?: string;
    skills?: string[];
    bannerGradient?: string;
    accentColor?: string;
    socials?: Array<{ platform: string; url: string; icon: string }>;
}

export interface UserListResponse {
    users: UserRecord[];
    meta: { page: number; limit: number; totalRecords: number; totalPages: number };
}

export interface ProfileData {
    user: UserRecord;
    profile: Record<string, unknown> | null;
}

export interface CreateUserPayload {
    name: string;
    email: string;
    password: string;
    role: 'student' | 'faculty' | 'admin';
    department?: string;
    designation?: string;
    semester?: number;
}

export interface UpdateUserPayload {
    name?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
}

// ── User API calls ─────────────────────────────────────────────────────────────

export const fetchUsers = (
    token: string,
    params: { role?: string; search?: string; page?: number; limit?: number } = {}
): Promise<UserListResponse> => {
    const qs = new URLSearchParams(
        Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)])
    ).toString();
    return api.get(`/users${qs ? '?' + qs : ''}`, token);
};

export const fetchUserById = (token: string, id: string): Promise<ProfileData> =>
    api.get(`/users/${id}`, token);

export const createUser = (token: string, payload: CreateUserPayload): Promise<UserRecord> =>
    api.post('/users', payload as unknown as Record<string, unknown>, token);

export const updateUser = (
    token: string,
    id: string,
    payload: UpdateUserPayload
): Promise<UserRecord> => api.put(`/users/${id}`, payload as Record<string, unknown>, token);

export const deleteUser = (token: string, id: string): Promise<void> =>
    api.delete(`/users/${id}`, token);

export const deactivateUser = (token: string, id: string): Promise<UserRecord> =>
    api.put(`/users/${id}/deactivate`, {}, token);

// ── Profile API calls ──────────────────────────────────────────────────────────

export const fetchMyProfile = (token: string): Promise<ProfileData> =>
    api.get('/profile/me', token);

export const updateMyProfile = (
    token: string,
    payload: Record<string, unknown>
): Promise<ProfileData> => api.put('/profile/me', payload, token);

export const fetchPublicProfile = (token: string, userId: string): Promise<ProfileData> =>
    api.get(`/profile/${userId}`, token);
