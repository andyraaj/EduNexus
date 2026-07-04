import api, { client } from './api';

export type AssessmentType = 'internal' | 'midterm' | 'final' | 'practical' | 'viva' | 'assignment' | 'quiz';

export interface ExamResult {
    _id: string;
    student: { _id: string; name: string; email: string };
    course: { _id: string; code: string; title: string; semester: number; department: string; credits?: number };
    academicYear: string;
    semester: number;
    assessmentType: AssessmentType;
    assessmentTitle: string;
    score: number;
    maxScore: number;
    grade: string;
    remarks: string;
    status: 'draft' | 'published';
    moderationStatus?: 'pending' | 'approved' | 'locked';
    publishedAt?: string | null;
}

export interface ResultPayload {
    studentId: string;
    courseId: string;
    academicYear: string;
    semester: number;
    assessmentType: AssessmentType;
    assessmentTitle: string;
    score: number;
    maxScore: number;
    grade?: string;
    remarks?: string;
    status?: 'draft' | 'published';
}

export const fetchCourseResults = (
    token: string,
    courseId: string,
    params: { academicYear?: string; semester?: number; assessmentType?: string; status?: string } = {}
): Promise<{ results: ExamResult[] }> => {
    const qs = new URLSearchParams(
        Object.entries(params)
            .filter(([, value]) => value !== undefined && value !== '')
            .map(([key, value]) => [key, String(value)])
    ).toString();
    return api.get(`/results/course/${courseId}${qs ? '?' + qs : ''}`, token);
};

export const saveResult = (token: string, payload: ResultPayload): Promise<{ result: ExamResult }> =>
    api.post('/results', payload as unknown as Record<string, unknown>, token);

export const publishCourseResults = (
    token: string,
    courseId: string,
    payload: { academicYear?: string; semester?: number; assessmentType?: string; assessmentTitle?: string }
): Promise<{ matched: number; modified: number }> =>
    api.patch(`/results/course/${courseId}/publish`, payload as Record<string, unknown>, token);

export const approveCourseResults = (
    token: string,
    courseId: string,
    payload: { academicYear?: string; semester?: number; assessmentType?: string; assessmentTitle?: string }
): Promise<{ matched: number; modified: number }> =>
    api.patch(`/results/course/${courseId}/approve`, payload as Record<string, unknown>, token);

export const fetchMyResults = (
    token: string,
    params: { academicYear?: string; semester?: number } = {}
): Promise<{ results: ExamResult[]; summary: { totalScore: number; totalMax: number; percentage: number; result: string }; academic?: { totalCredits: number; gpa: number } }> => {
    const qs = new URLSearchParams(
        Object.entries(params)
            .filter(([, value]) => value !== undefined && value !== '')
            .map(([key, value]) => [key, String(value)])
    ).toString();
    return api.get(`/results/my${qs ? '?' + qs : ''}`, token);
};

export const fetchMyHallTicket = (token: string): Promise<{ student: any; events: any[]; generatedAt: string }> =>
    api.get('/results/my/hall-ticket', token);

export const downloadMyMarksheet = async (token: string, semester: number, academicYear: string) => {
    const res = await client.get(`/results/my/marksheet/${semester}?academicYear=${encodeURIComponent(academicYear)}`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` },
    });
    const url = window.URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EduNexus-marksheet-sem${semester}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
};

export const downloadMyTranscript = async (token: string, academicYear: string) => {
    const res = await client.get(`/results/my/transcript?academicYear=${encodeURIComponent(academicYear)}`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` },
    });
    const url = window.URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EduNexus-transcript-${academicYear}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
};
