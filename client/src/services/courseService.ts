import api from './api';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * primaryFaculty is now populated directly from User model (not Faculty→User).
 * department is now populated from Department model.
 */
export interface FacultyInfo {
    _id: string;
    name: string;
    email: string;
    role: string;
}

export interface DepartmentInfo {
    _id: string;
    name: string;
    code: string;
}

export interface Course {
    _id: string;
    code: string;
    title: string;
    description: string;
    credits: number;
    department: DepartmentInfo | string;
    semester: number;
    primaryFaculty: FacultyInfo | null;
    isActive: boolean;
    maxEnrollment: number;
    enrolledCount?: number;
    syllabusProgress?: number;
    syllabusUnits?: { title: string; isCompleted: boolean }[];
    createdAt: string;
}

export interface Enrollment {
    _id: string;
    course: Course;
    student?: FacultyInfo;
    academicYear: string;
    semester: number;
    status: 'enrolled' | 'dropped' | 'completed';
    enrolledAt: string;
}

export interface CourseListResponse {
    courses: Course[];
    meta?: { page: number; limit: number; totalRecords: number; totalPages: number };
}

export interface CreateCoursePayload {
    code: string;
    title: string;
    description?: string;
    credits?: number;
    department: string;
    semester: number;
    primaryFaculty?: string;
    maxEnrollment?: number;
}

// ── Course API ────────────────────────────────────────────────────────────────

export const fetchCourses = (
    token: string,
    params: { search?: string; department?: string; semester?: number; isActive?: boolean; page?: number; limit?: number } = {}
): Promise<CourseListResponse> => {
    const qs = new URLSearchParams(
        Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)])
    ).toString();
    return api.get(`/courses${qs ? '?' + qs : ''}`, token);
};

export const fetchCourseById = (token: string, id: string): Promise<{ course: Course }> =>
    api.get(`/courses/${id}`, token);

export const fetchMyCoursesFaculty = (token: string): Promise<{ courses: Course[] }> =>
    api.get('/courses/my-courses', token);

export const fetchCourseRoster = (token: string, courseId: string) =>
    api.get(`/courses/${courseId}/roster`, token);

export const createCourse = (token: string, payload: CreateCoursePayload): Promise<{ course: Course }> =>
    api.post('/courses', payload as unknown as Record<string, unknown>, token);

export const updateCourse = (
    token: string, id: string, payload: Partial<CreateCoursePayload>
): Promise<{ course: Course }> =>
    api.put(`/courses/${id}`, payload as Record<string, unknown>, token);

export const deleteCourse = (token: string, id: string): Promise<void> =>
    api.delete(`/courses/${id}`, token);

// ── Enrollment API ────────────────────────────────────────────────────────────

export const fetchMyEnrollments = (token: string): Promise<{ enrollments: Enrollment[]; count: number }> =>
    api.get('/enrollments/my-courses', token);

export const fetchTeachingCourses = (token: string): Promise<{ courses: Course[] }> =>
    api.get('/enrollments/teaching', token);

export const enrollInCourse = (token: string, courseId: string): Promise<{ enrollment: Enrollment }> =>
    api.post('/enrollments', { courseId }, token);

export const dropCourse = (token: string, enrollmentId: string): Promise<void> =>
    api.delete(`/enrollments/${enrollmentId}`, token);

// ── Helper to extract faculty display name ────────────────────────────────────

/**
 * Utility to get faculty display name from the new flat User populate.
 * Previously: course.primaryFaculty?.user?.name
 * Now:        course.primaryFaculty?.name
 */
export const getFacultyDisplayName = (course: Course): string => {
    if (!course.primaryFaculty) return 'Unassigned';
    return course.primaryFaculty.name || course.primaryFaculty.email || 'Unknown';
};

/**
 * Utility to get department display name from the new Department populate.
 * Previously: course.department (string)
 * Now:        course.department.name or course.department (string fallback)
 */
export const getDepartmentDisplayName = (course: Course): string => {
    if (typeof course.department === 'string') return course.department;
    return course.department?.name || 'Unknown';
};
