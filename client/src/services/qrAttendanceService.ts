import api from './api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SessionStatus = 'active' | 'paused' | 'ended';
export type AttendanceStatus = 'present' | 'late' | 'absent';

export interface QRScan {
    student: {
        _id: string;
        name: string;
        email: string;
    };
    scannedAt: string;
    attendanceStatus: 'present' | 'late';
    deviceInfo?: string;
}

export interface QRSession {
    _id: string;
    course: { _id: string; code: string; title: string };
    faculty: { _id: string; name: string; email: string };
    sessionLabel: string;
    topic: string;
    room: string;
    token: string;
    startedAt: string;
    expiresAt: string;
    lateAfterMs: number;
    status: SessionStatus;
    scans: QRScan[];
    createdAt: string;
}

export interface CreateSessionPayload {
    courseId: string;
    durationMinutes?: number;
    sessionLabel?: string;
    topic?: string;
    room?: string;
    lateAfterMinutes?: number;
}

export interface ScanResult {
    session: {
        _id: string;
        course: { _id: string; code: string; title: string };
        faculty: { _id: string; name: string; email: string };
        sessionLabel: string;
        topic: string;
        room: string;
        expiresAt: string;
    };
    attendanceStatus: 'present' | 'late';
    scannedAt: string;
}

// ── Faculty API ───────────────────────────────────────────────────────────────

export const createQRSession = (
    token: string,
    payload: CreateSessionPayload
): Promise<{ session: QRSession }> =>
    api.post('/qr-attendance/sessions', payload as unknown as Record<string, unknown>, token);

export const getQRSession = (token: string, sessionId: string): Promise<{ session: QRSession }> =>
    api.get(`/qr-attendance/sessions/${sessionId}`, token);

export const getMySessions = (token: string): Promise<{ sessions: QRSession[] }> =>
    api.get('/qr-attendance/sessions/my', token);

export const updateSessionStatus = (
    token: string,
    sessionId: string,
    status: SessionStatus
): Promise<{ session: QRSession }> =>
    api.patch(`/qr-attendance/sessions/${sessionId}/status`, { status }, token);

export const regenerateQR = (
    token: string,
    sessionId: string,
    durationMinutes = 15
): Promise<{ session: QRSession }> =>
    api.post(`/qr-attendance/sessions/${sessionId}/regenerate`, { durationMinutes }, token);

export const manualOverride = (
    token: string,
    sessionId: string,
    studentId: string,
    attendanceStatus: AttendanceStatus
): Promise<{ session: QRSession }> =>
    api.patch(`/qr-attendance/sessions/${sessionId}/override`, { studentId, attendanceStatus }, token);

export const removeScan = (
    token: string,
    sessionId: string,
    studentId: string
): Promise<{ session: QRSession }> =>
    api.delete(`/qr-attendance/sessions/${sessionId}/scans/${studentId}`, token);

// ── Student API ───────────────────────────────────────────────────────────────

export const submitQRScan = (
    token: string,
    qrToken: string
): Promise<{ result: ScanResult }> =>
    api.post('/qr-attendance/scan', { token: qrToken }, token);

export const getActiveSessions = (token: string): Promise<{ sessions: QRSession[] }> =>
    api.get('/qr-attendance/active', token);
