import api from './api';

export interface TimetableEntry {
    _id: string;
    course: any;
    faculty: any;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    classroom: string;
    semester: number;
    academicYear: string;
    isActive: boolean;
}

export interface TimetablePayload {
    course: string;
    faculty: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    classroom: string;
    semester: number;
    academicYear: string;
}

const getStudentTimetable = async (token: string, studentId: string, academicYear?: string): Promise<{ timetable: TimetableEntry[] }> => {
    const url = academicYear
        ? `/timetable/student/${studentId}?academicYear=${academicYear}`
        : `/timetable/student/${studentId}`;
    return api.get(url, token);
};

const getFacultyTimetable = async (token: string, facultyId: string, academicYear?: string): Promise<{ timetable: TimetableEntry[] }> => {
    const url = academicYear
        ? `/timetable/faculty/${facultyId}?academicYear=${academicYear}`
        : `/timetable/faculty/${facultyId}`;
    return api.get(url, token);
};

const getAllTimetable = async (token: string, params: { academicYear?: string; semester?: number; faculty?: string } = {}): Promise<{ timetable: TimetableEntry[] }> => {
    const qs = new URLSearchParams(
        Object.entries(params)
            .filter(([, value]) => value !== undefined && value !== '')
            .map(([key, value]) => [key, String(value)])
    ).toString();
    return api.get(`/timetable${qs ? '?' + qs : ''}`, token);
};

const createTimetable = async (token: string, timetableData: TimetablePayload): Promise<{ timetable: TimetableEntry }> =>
    api.post('/timetable', timetableData as unknown as Record<string, unknown>, token);

const updateTimetable = async (token: string, id: string, updates: Partial<TimetablePayload>): Promise<{ timetable: TimetableEntry }> =>
    api.put(`/timetable/${id}`, updates as Record<string, unknown>, token);

const deleteTimetable = async (token: string, id: string): Promise<{ id: string }> =>
    api.delete(`/timetable/${id}`, token);

export const timetableService = {
    getStudentTimetable,
    getFacultyTimetable,
    getAllTimetable,
    createTimetable,
    updateTimetable,
    deleteTimetable,
};
