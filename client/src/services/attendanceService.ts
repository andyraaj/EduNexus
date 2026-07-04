import api from './api';
import type { Course } from './courseService';
import type { UserRecord } from './userService';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface MarkAttendanceRecord {
    studentId: string;
    status: AttendanceStatus;
    remarks?: string;
}

export interface AttendanceRecordResponse {
    _id: string;
    course: Course;
    faculty: UserRecord;
    date: string;
    records: {
        student: { _id: string; rollNumber: string; user: { name: string; email: string } };
        status: AttendanceStatus;
        remarks: string;
    }[];
}

export interface StudentAttendanceSummary {
    course: Course;
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
}

export interface StudentAttendanceHistory {
    date: string;
    course: Course;
    status: AttendanceStatus;
    remarks: string;
}

export interface StudentAttendanceData {
    summary: StudentAttendanceSummary[];
    history: StudentAttendanceHistory[];
}

export interface CourseStudentStat {
    student: { _id: string; rollNumber: string; user: { name: string; email: string } };
    totalClasses: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
}

export interface CourseAttendanceData {
    sessions: AttendanceRecordResponse[];
    aggregateRoster: CourseStudentStat[];
    totalClasses: number;
}

export const markAttendance = (
    token: string, payload: { courseId: string; date: string; records: MarkAttendanceRecord[] }
): Promise<{ attendance: AttendanceRecordResponse }> =>
    api.post('/attendance/mark', payload as unknown as Record<string, unknown>, token);

export const fetchMyAttendance = (token: string): Promise<StudentAttendanceData> =>
    api.get('/attendance/my-records', token);

export const fetchCourseAttendance = (token: string, courseId: string): Promise<CourseAttendanceData> =>
    api.get(`/attendance/course/${courseId}`, token);
