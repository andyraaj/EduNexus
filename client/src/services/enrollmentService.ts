import api from './api';

const getStudentEnrollments = async (studentId: string, academicYear?: string) => {
    const url = academicYear
        ? `/enrollments/student/${studentId}?academicYear=${academicYear}`
        : `/enrollments/student/${studentId}`;
    const { data } = await api.get(url);
    return data.data;
};

const getCourseEnrollments = async (courseId: string, academicYear?: string) => {
    const url = academicYear
        ? `/enrollments/course/${courseId}?academicYear=${academicYear}`
        : `/enrollments/course/${courseId}`;
    const { data } = await api.get(url);
    return data.data;
};

const getAllEnrollments = async (academicYear?: string) => {
    const url = academicYear ? `/enrollments?academicYear=${academicYear}` : '/enrollments';
    const { data } = await api.get(url);
    return data.data;
};

const createEnrollment = async (studentId: string, courseId: string, academicYear: string, semester: number) => {
    const { data } = await api.post(`/enrollments`, {
        student: studentId,
        course: courseId,
        academicYear,
        semester,
    });
    return data.data;
};

const updateEnrollment = async (id: string, status: 'enrolled' | 'dropped' | 'completed') => {
    const { data } = await api.put(`/enrollments/${id}`, { status });
    return data.data;
};

const deleteEnrollment = async (id: string) => {
    await api.delete(`/enrollments/${id}`);
};

export const enrollmentService = {
    getStudentEnrollments,
    getCourseEnrollments,
    getAllEnrollments,

    createEnrollment,
    updateEnrollment,
    deleteEnrollment,
};
