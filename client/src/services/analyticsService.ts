import api from './api';

export interface StudentAnalytics {
    attendancePercentage: number;
    assignmentAverage: number;
    quizAverage: number;
    overallScore: number;
    enrolledCourses?: { code: string; name: string; progress: number; color: string; icon: string }[];
    upcomingTasks?: { id: string | number; type: string; title: string; course: string; due: string; priority: string; icon: string }[];
}

export interface FacultyAnalytics {
    attendanceTrends: any[];
    assignmentStats: any[];
    quizDistributions: any[];
}

export interface AdminAnalytics {
    totalStudents: number;
    totalFaculty: number;
    totalCourses: number;
    totalRevenue: number;
    pendingDues: number;
    deptPerformance: { department: string; enrollments: number }[];
    revenueTrend: { label: string; revenue: number }[];
}

export const fetchStudentAnalytics = (token: string): Promise<StudentAnalytics> =>
    api.get('/analytics/student', token);

export const fetchFacultyAnalytics = (token: string, courseId: string): Promise<FacultyAnalytics> =>
    api.get(`/analytics/faculty/${courseId}`, token);

export const fetchAdminAnalytics = (token: string): Promise<AdminAnalytics> =>
    api.get('/analytics/admin', token);
