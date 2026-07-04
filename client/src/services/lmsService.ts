import api, { client, API_BASE_URL } from './api';
import type { Course } from './courseService';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CourseMaterial {
    _id: string;
    course: string | Course;
    faculty: { _id: string; name: string; email: string } | string;
    title: string;
    description: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    isExternalLink: boolean;
    category: 'notes' | 'slides' | 'video' | 'assignment_resource' | 'lab_manual' | 'reference' | 'recording' | 'other';
    module: string;
    isPinned: boolean;
    isVisible: boolean;
    downloadCount: number;
    uploadedAt: string;
    createdAt: string;
}

export interface Assignment {
    _id: string;
    course: string | Course;
    faculty: string;
    title: string;
    description: string;
    dueDate: string;
    maxMarks: number;
    attachmentUrl?: string;
    createdAt: string;
}

export interface Submission {
    _id: string;
    assignment: string | Assignment;
    student: { _id: string; rollNumber: string; user: { name: string; email: string } } | string;
    fileUrl: string;
    submittedAt: string;
    marksAwarded: number | null;
    feedback: string;
}

export interface CourseAnnouncement {
    _id: string;
    course: string;
    postedBy: { _id: string; name: string; email: string };
    title: string;
    body: string;
    priority: 'normal' | 'important' | 'urgent';
    isPinned: boolean;
    attachmentUrl?: string;
    createdAt: string;
}

// ── Upload Progress Callback ───────────────────────────────────────────────────
export type ProgressCallback = (percent: number) => void;

// ── Materials ──────────────────────────────────────────────────────────────────

export const fetchMaterials = (token: string, courseId: string): Promise<{ materials: CourseMaterial[] }> =>
    api.get(`/materials/course/${courseId}`, token);

/**
 * Upload a real file from the user's filesystem using multipart/form-data.
 * Supports progress tracking.
 */
export const uploadMaterialFile = (
    token: string,
    courseId: string,
    file: File,
    metadata: { title?: string; description?: string; category?: string; module?: string },
    onProgress?: ProgressCallback
): Promise<{ material: CourseMaterial }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', courseId);
    if (metadata.title) formData.append('title', metadata.title);
    if (metadata.description) formData.append('description', metadata.description);
    if (metadata.category) formData.append('category', metadata.category);
    if (metadata.module) formData.append('module', metadata.module);

    return client.post(`${API_BASE_URL}/materials/upload`, formData, {
        headers: {
            Authorization: `Bearer ${token}`,
            // Content-Type is intentionally omitted — the api.ts interceptor deletes
            // it for FormData so the browser sets 'multipart/form-data; boundary=...'
        },
        onUploadProgress: (evt) => {
            if (onProgress && evt.total) {
                onProgress(Math.round((evt.loaded / evt.total) * 100));
            }
        },
    }).then(res => {
        const data = res.data;
        if (data?.success) return data.data;
        throw new Error(data?.error?.message || 'Upload failed');
    });
};

/**
 * Add an external link (Google Drive, YouTube, etc.) as a material.
 */
export const uploadMaterialLink = (
    token: string,
    data: { courseId: string; title: string; fileUrl: string; description?: string; category?: string; module?: string }
): Promise<{ material: CourseMaterial }> =>
    api.post('/materials/link', data as Record<string, unknown>, token);

export const updateMaterial = (
    token: string,
    id: string,
    updates: Partial<Pick<CourseMaterial, 'title' | 'description' | 'category' | 'module' | 'isPinned' | 'isVisible'>>
): Promise<{ material: CourseMaterial }> =>
    api.patch(`/materials/${id}`, updates as Record<string, unknown>, token);

export const deleteMaterial = (token: string, id: string): Promise<void> =>
    api.delete(`/materials/${id}`, token);

export const trackMaterialDownload = (token: string, id: string): Promise<void> =>
    api.post(`/materials/${id}/download`, {}, token);

// ── Assignments ────────────────────────────────────────────────────────────────

export const fetchAssignments = (token: string, courseId: string): Promise<{ assignments: Assignment[] }> =>
    api.get(`/assignments/course/${courseId}`, token);

export const createAssignment = (token: string, data: Record<string, unknown>): Promise<{ assignment: Assignment }> =>
    api.post('/assignments', data, token);

export const updateAssignment = (token: string, id: string, data: Partial<Assignment>): Promise<{ assignment: Assignment }> =>
    api.put(`/assignments/${id}`, data as Record<string, unknown>, token);

export const deleteAssignment = (token: string, id: string): Promise<void> =>
    api.delete(`/assignments/${id}`, token);

// ── Submissions ────────────────────────────────────────────────────────────────

export const fetchSubmissions = (token: string, assignmentId: string): Promise<{ submissions: Submission[] }> =>
    api.get(`/submissions/assignment/${assignmentId}`, token);

export const fetchMySubmission = (token: string, assignmentId: string): Promise<{ submission: Submission | null }> =>
    api.get(`/submissions/my/${assignmentId}`, token);

export const fetchAllMySubmissions = (token: string): Promise<{ submissions: Submission[] }> =>
    api.get(`/submissions/my`, token);

export const submitAssignment = (token: string, assignmentId: string, fileUrl: string): Promise<{ submission: Submission }> =>
    api.post('/submissions', { assignmentId, fileUrl }, token);

export const gradeSubmission = (
    token: string,
    submissionId: string,
    marksAwarded: number,
    feedback: string
): Promise<{ submission: Submission }> =>
    api.put(`/submissions/${submissionId}/grade`, { marksAwarded, feedback }, token);

// ── Course Announcements ───────────────────────────────────────────────────────

export const fetchCourseAnnouncements = (
    token: string,
    courseId: string
): Promise<{ announcements: CourseAnnouncement[] }> =>
    api.get(`/course-announcements/course/${courseId}`, token);

export const postCourseAnnouncement = (
    token: string,
    data: { courseId: string; title: string; body: string; priority?: string; isPinned?: boolean }
): Promise<{ announcement: CourseAnnouncement }> =>
    api.post('/course-announcements', data as Record<string, unknown>, token);

export const deleteCourseAnnouncement = (token: string, id: string): Promise<void> =>
    api.delete(`/course-announcements/${id}`, token);

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns a human-readable file size string */
export const formatFileSize = (bytes: number): string => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Returns the appropriate icon emoji for a file type */
export const getFileIcon = (mimeType: string, isExternalLink: boolean): string => {
    if (isExternalLink) return '🔗';
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return '📊';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝';
    if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return '📈';
    if (mimeType?.includes('video')) return '🎬';
    if (mimeType?.includes('image')) return '🖼️';
    if (mimeType?.includes('zip')) return '🗜️';
    if (mimeType?.includes('text')) return '📃';
    return '📁';
};

/** Returns color for file category badge */
export const getCategoryColor = (category: string): { bg: string; text: string } => {
    const colors: Record<string, { bg: string; text: string }> = {
        notes: { bg: '#eff6ff', text: '#1d4ed8' },
        slides: { bg: '#fef3c7', text: '#92400e' },
        video: { bg: '#fce7f3', text: '#be185d' },
        lab_manual: { bg: '#f0fdf4', text: '#15803d' },
        assignment_resource: { bg: '#fff7ed', text: '#c2410c' },
        reference: { bg: '#f3f4f6', text: '#374151' },
        recording: { bg: '#fdf4ff', text: '#7e22ce' },
    };
    return colors[category] || { bg: '#f3f4f6', text: '#374151' };
};
