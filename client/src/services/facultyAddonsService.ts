import api from './api';

export interface LeaveRequest {
    _id: string;
    faculty: string;
    leaveType: 'casual' | 'sick' | 'earned' | 'maternity' | 'paternity';
    startDate: string;
    endDate: string;
    reason: string;
    alternativeClassArrangement?: string;
    status: 'pending' | 'approved' | 'rejected';
    comments?: string;
    createdAt: string;
}

export interface DoubtReply {
    _id: string;
    user: { _id: string; name: string; email: string; role: string };
    message: string;
    timestamp: string;
}

export interface DoubtQuery {
    _id: string;
    student: { _id: string; name: string; email: string };
    course: { _id: string; code: string; title: string };
    title: string;
    description: string;
    status: 'open' | 'resolved';
    replies: DoubtReply[];
    createdAt: string;
    updatedAt: string;
}

// ── Leave Requests ──
export const fetchMyLeaves = (token: string): Promise<{ leaves: LeaveRequest[] }> =>
    api.get('/faculty-addons/leaves', token);

export const applyForLeave = (
    token: string,
    data: { leaveType: string; startDate: string; endDate: string; reason: string; alternativeClassArrangement?: string }
): Promise<{ leave: LeaveRequest }> =>
    api.post('/faculty-addons/leaves', data, token);

export const fetchAdminLeaves = (token: string): Promise<{ leaves: LeaveRequest[] }> =>
    api.get('/faculty-addons/leaves/admin', token);

export const updateAdminLeave = (
    token: string,
    id: string,
    data: { status: 'approved' | 'rejected'; comments?: string }
): Promise<{ leave: LeaveRequest }> =>
    api.patch(`/faculty-addons/leaves/admin/${id}`, data, token);

// ── Doubt Solver ──
export const fetchCourseDoubts = (token: string, courseId: string): Promise<{ doubts: DoubtQuery[] }> =>
    api.get(`/faculty-addons/doubts/course/${courseId}`, token);

export const fetchStudentDoubts = (token: string): Promise<{ doubts: DoubtQuery[] }> =>
    api.get('/faculty-addons/doubts/student', token);

export const createDoubtQuery = (
    token: string,
    data: { courseId: string; title: string; description: string }
): Promise<{ doubt: DoubtQuery }> =>
    api.post('/faculty-addons/doubts', data, token);

export const replyToDoubt = (token: string, id: string, message: string): Promise<{ doubt: DoubtQuery }> =>
    api.post(`/faculty-addons/doubts/${id}/reply`, { message }, token);

export const updateDoubtStatus = (token: string, id: string, status: 'open' | 'resolved'): Promise<{ doubt: DoubtQuery }> =>
    api.patch(`/faculty-addons/doubts/${id}/status`, { status }, token);

// ── Syllabus Progress ──
export const updateCourseSyllabus = (
    token: string,
    courseId: string,
    syllabusUnits: Array<{ title: string; isCompleted: boolean }>
): Promise<{ course: any }> =>
    api.patch(`/faculty-addons/courses/${courseId}/syllabus`, { syllabusUnits }, token);

// ── Mentorship System ──
export interface MentorshipNote {
    _id: string;
    mentor: { _id: string; name: string; email: string };
    student: { _id: string; name: string; email: string };
    note: string;
    gpa: number;
    attendanceRate: number;
    backlogsCount: number;
    createdAt: string;
}

export interface MentorshipMeeting {
    _id: string;
    mentor: { _id: string; name: string; email: string };
    student: { _id: string; name: string; email: string };
    title: string;
    description?: string;
    scheduledAt: string;
    status: 'pending' | 'approved' | 'declined' | 'completed';
    requestedBy: 'student' | 'mentor';
    createdAt: string;
}

export interface MenteeInfo {
    _id: string;
    rollNumber: string;
    department: string;
    semester: number;
    user: { name: string; email: string };
    notes: string[];
    notesFull: MentorshipNote[];
    meetings: MentorshipMeeting[];
}

export const fetchMentees = (token: string): Promise<{ mentees: MenteeInfo[] }> =>
    api.get('/faculty-addons/mentorship/mentees', token);

export const recordMentorshipNote = (
    token: string,
    data: { studentId: string; note: string; gpa?: number; attendanceRate?: number; backlogsCount?: number }
): Promise<{ note: MentorshipNote }> =>
    api.post('/faculty-addons/mentorship/notes', data, token);

export const fetchStudentMentorship = (
    token: string
): Promise<{ mentor: { _id: string; name: string; email: string } | null; notes: MentorshipNote[]; meetings: MentorshipMeeting[] }> =>
    api.get('/faculty-addons/mentorship/student', token);

export const requestMentorshipMeeting = (
    token: string,
    data: { title: string; description?: string; scheduledAt: string; targetUserId: string }
): Promise<{ meeting: MentorshipMeeting }> =>
    api.post('/faculty-addons/mentorship/meetings', data, token);

export const updateMentorshipMeetingStatus = (
    token: string,
    id: string,
    status: 'approved' | 'declined' | 'completed'
): Promise<{ meeting: MentorshipMeeting }> =>
    api.patch(`/faculty-addons/mentorship/meetings/${id}`, { status }, token);
