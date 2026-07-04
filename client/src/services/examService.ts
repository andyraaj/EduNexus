import api from './api';
import type { Course } from './courseService';

export type ExamEventType = 'internal' | 'midterm' | 'final' | 'practical' | 'viva' | 'assignment' | 'event';
export type ExamEventStatus = 'draft' | 'published' | 'cancelled';
export type ExamEventAudience = 'all' | 'student' | 'faculty';

export interface ExamEvent {
    _id: string;
    title: string;
    course: Course | null;
    type: ExamEventType;
    startsAt: string;
    endsAt: string;
    venue: string;
    instructions: string;
    targetAudience: ExamEventAudience;
    status: ExamEventStatus;
    createdBy?: { _id: string; name: string; role: string };
    createdAt: string;
}

export interface ExamEventPayload {
    title: string;
    course?: string;
    type: ExamEventType;
    startsAt: string;
    endsAt: string;
    venue?: string;
    instructions?: string;
    targetAudience: ExamEventAudience;
    status: ExamEventStatus;
}

export const fetchExamEvents = (
    token: string,
    params: { status?: string; from?: string; to?: string; courseId?: string } = {}
): Promise<{ events: ExamEvent[] }> => {
    const qs = new URLSearchParams(
        Object.entries(params)
            .filter(([, value]) => value !== undefined && value !== '')
            .map(([key, value]) => [key, String(value)])
    ).toString();

    return api.get(`/exams${qs ? '?' + qs : ''}`, token);
};

export const createExamEvent = (token: string, payload: ExamEventPayload): Promise<{ event: ExamEvent }> =>
    api.post('/exams', payload as unknown as Record<string, unknown>, token);

export const updateExamEvent = (
    token: string,
    id: string,
    payload: Partial<ExamEventPayload>
): Promise<{ event: ExamEvent }> =>
    api.put(`/exams/${id}`, payload as Record<string, unknown>, token);

export const deleteExamEvent = (token: string, id: string): Promise<{ id: string }> =>
    api.delete(`/exams/${id}`, token);
