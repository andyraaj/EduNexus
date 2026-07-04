import api from './api';

export interface CourseMaterial {
    _id: string;
    course: string;
    faculty: {
        _id: string;
        name: string;
        email: string;
    };
    title: string;
    description: string;
    fileUrl: string;
    type: 'notes' | 'ppt' | 'video' | 'other';
    uploadedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface UploadMaterialPayload {
    courseId: string;
    title: string;
    description?: string;
    fileUrl: string;
    type?: 'notes' | 'ppt' | 'video' | 'other';
}

export const fetchMaterialsByCourse = (token: string, courseId: string): Promise<{ materials: CourseMaterial[] }> =>
    api.get(`/materials/course/${courseId}`, token);

export const uploadMaterial = (token: string, payload: UploadMaterialPayload): Promise<{ material: CourseMaterial }> =>
    api.post('/materials', payload as unknown as Record<string, unknown>, token);

export const deleteMaterial = (token: string, id: string): Promise<{ success: boolean }> =>
    api.delete(`/materials/${id}`, token);
