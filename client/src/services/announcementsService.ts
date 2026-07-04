import api from './api';

export type NoticeCategory = 'Urgent' | 'Academic' | 'Event' | 'General';
export type NoticeAudience = 'all' | 'student' | 'faculty' | string;

export interface Notice {
    _id: string;
    title: string;
    content: string;
    category: NoticeCategory;
    targetAudience: NoticeAudience;
    postedBy?: { _id: string; name: string; role: string } | string;
    createdAt: string;
}

export const fetchNotices = (
    token: string,
    params: { category?: string } = {}
): Promise<{ notices: Notice[] }> => {
    const qs = new URLSearchParams(
        Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)])
    ).toString();
    return api.get(`/announcements${qs ? '?' + qs : ''}`, token);
};

export const createNotice = (
    token: string,
    payload: Pick<Notice, 'title' | 'content' | 'category' | 'targetAudience'>
): Promise<{ notice: Notice }> => api.post('/announcements', payload as unknown as Record<string, unknown>, token);

export const updateNotice = (
    token: string,
    id: string,
    payload: Partial<Pick<Notice, 'title' | 'content' | 'category' | 'targetAudience'>>
): Promise<{ notice: Notice }> => api.put(`/announcements/${id}`, payload as unknown as Record<string, unknown>, token);

export const deleteNotice = (token: string, id: string): Promise<{ id: string }> =>
    api.delete(`/announcements/${id}`, token);

