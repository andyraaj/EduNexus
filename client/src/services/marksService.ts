import api from './api';

export const marksService = {
    /**
     * Get marks for a student
     */
    getStudentMarks: async () => {
        const { data } = await api.get(`/marks/my`);
        return data.data;
    },

    /**
     * Get marks for a specific student (Admin/Faculty)
     */
    getStudentMarksById: async (studentId: string) => {
        const { data } = await api.get(`/marks/student/${studentId}`);
        return data.data;
    },

    /**
     * Get all marks for a course
     */
    getCourseMarks: async (courseId: string) => {
        const { data } = await api.get(`/marks/course/${courseId}`);
        return data.data;
    },

    /**
     * Create or update marks
     */
    setMarks: async (studentId: string, courseId: string, examType: string, score: number, maxScore: number) => {
        const { data } = await api.post(`/marks`, {
            studentId,
            courseId,
            examType,
            score,
            maxScore,
        });
        return data.data;
    },

    /**
     * Update marks
     */
    updateMarks: async (id: string, score: number, maxScore: number) => {
        const { data } = await api.put(`/marks/${id}`, { score, maxScore });
        return data.data;
    },

    /**
     * Delete marks entry
     */
    deleteMarks: async (id: string) => {
        await api.delete(`/marks/${id}`);
    },
};
