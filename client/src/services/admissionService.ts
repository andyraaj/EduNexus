import api from './api';
import type { Program } from './foundationService';

export type AdmissionStatus =
    | 'inquiry'
    | 'application'
    | 'document_verification'
    | 'offer'
    | 'enrolled'
    | 'rejected'
    | 'withdrawn';

export interface AdmissionApplication {
    _id: string;
    applicantName: string;
    email: string;
    phone: string;
    program: Program;
    academicYear: string;
    status: AdmissionStatus;
    source: string;
    notes?: string;
    documents: Array<{ label: string; url?: string; status: string; remarks?: string }>;
    reviewedBy?: { _id: string; name: string; email: string; role: string };
    convertedUser?: { _id: string; name: string; email: string; role: string } | string | null;
    convertedStudent?: { _id: string; rollNumber: string; department: string; semester: number; batchYear: number } | string | null;
    convertedAt?: string | null;
    decidedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AdmissionListResponse {
    applications: AdmissionApplication[];
}

export interface AdmissionPayload {
    applicantName: string;
    email: string;
    phone: string;
    program: string;
    academicYear: string;
    status?: AdmissionStatus;
    source?: string;
    notes?: string;
}

export const listAdmissions = (
    token: string,
    params: { status?: string; search?: string; academicYear?: string; program?: string; page?: number; limit?: number } = {}
): Promise<AdmissionListResponse> => {
    const qs = new URLSearchParams(
        Object.entries(params)
            .filter(([, value]) => value !== undefined && value !== '')
            .map(([key, value]) => [key, String(value)])
    ).toString();
    return api.get(`/admissions/applications${qs ? '?' + qs : ''}`, token);
};

export const createAdmission = (
    token: string,
    payload: AdmissionPayload
): Promise<{ application: AdmissionApplication }> =>
    api.post('/admissions/applications', payload as unknown as Record<string, unknown>, token);

export const listPublicAdmissionPrograms = (): Promise<{ programs: Program[] }> =>
    api.get('/admissions/public/programs');

export const submitPublicAdmission = (
    payload: AdmissionPayload
): Promise<{ application: AdmissionApplication }> =>
    api.post('/admissions/public/applications', payload as unknown as Record<string, unknown>);

export const updateAdmission = (
    token: string,
    id: string,
    payload: Partial<AdmissionPayload>
): Promise<{ application: AdmissionApplication }> =>
    api.put(`/admissions/applications/${id}`, payload as unknown as Record<string, unknown>, token);

export const updateAdmissionStatus = (
    token: string,
    id: string,
    payload: { status: AdmissionStatus; notes?: string }
): Promise<{ application: AdmissionApplication }> =>
    api.patch(`/admissions/applications/${id}/status`, payload as unknown as Record<string, unknown>, token);

export const updateAdmissionDocuments = (
    token: string,
    id: string,
    documents: AdmissionApplication['documents']
): Promise<{ application: AdmissionApplication }> =>
    api.patch(`/admissions/applications/${id}/documents`, { documents }, token);

export const convertAdmissionToStudent = (
    token: string,
    id: string
): Promise<{ application: AdmissionApplication; user: { id: string; email: string; temporaryPassword: string }; student: any }> =>
    api.post(`/admissions/applications/${id}/convert`, {}, token);
