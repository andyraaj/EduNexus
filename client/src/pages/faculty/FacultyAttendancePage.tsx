import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTeachingCourses, fetchCourseRoster } from '@/services/courseService';
import { markAttendance, fetchCourseAttendance } from '@/services/attendanceService';
import type { Course } from '@/services/courseService';
import type { MarkAttendanceRecord, CourseAttendanceData } from '@/services/attendanceService';
import AttendanceMarkingForm from '@/components/AttendanceMarkingForm';

/* ─── safe name helpers ──────────────────────────────────────────────────────── */
const getName = (st: any): string =>
    st?.user?.name || st?.name || st?.email || st?.user?.email || 'Student';
const getRoll = (st: any): string =>
    st?.rollNumber || st?._id?.slice(-6)?.toUpperCase() || '—';

const FacultyAttendancePage: React.FC = () => {
    const { accessToken } = useAuth();

    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [roster, setRoster] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<CourseAttendanceData | null>(null);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [activeTab, setActiveTab] = useState<'mark' | 'history' | 'analytics'>('mark');

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    /* load teaching courses */
    useEffect(() => {
        if (!accessToken) return;
        fetchTeachingCourses(accessToken)
            .then(r => setCourses(r.courses || []))
            .catch(() => showToast('Failed to load courses', 'error'));
    }, [accessToken]);

    /* load roster + analytics when course changes */
    useEffect(() => {
        if (!accessToken || !selectedCourse) { setRoster([]); setAnalytics(null); return; }
        setIsLoading(true);
        Promise.all([
            fetchCourseRoster(accessToken, selectedCourse._id),
            fetchCourseAttendance(accessToken, selectedCourse._id),
        ]).then(([rosterRes, analyticsRes]) => {
            // roster API may return { roster } or flat array — handle both
            const raw = (rosterRes as any)?.roster || rosterRes || [];
            // Each item may be an Enrollment {student: {...}} or a flat User
            const students = raw.map((item: any) => item?.student ?? item);
            setRoster(students.filter(Boolean));
            setAnalytics(analyticsRes);
        }).catch(e => {
            showToast(e?.message || 'Failed to load class data', 'error');
        }).finally(() => setIsLoading(false));
    }, [accessToken, selectedCourse]);

    /* pre-fill statuses if attendance already recorded for this date */
    const initialStatuses = useMemo(() => {
        if (!analytics?.sessions?.length || !date) return undefined;
        const session = analytics.sessions.find(s => s.date?.split('T')[0] === date);
        if (!session) return undefined;
        const map: Record<string, any> = {};
        session.records?.forEach(r => {
            const id = typeof r.student === 'string' ? r.student : r.student?._id;
            if (id) map[id] = r.status;
        });
        return Object.keys(map).length > 0 ? map : undefined;
    }, [analytics, date]);

    const handleSubmit = async (records: MarkAttendanceRecord[]) => {
        if (!accessToken || !selectedCourse) return;
        setIsSubmitting(true);
        try {
            await markAttendance(accessToken, { courseId: selectedCourse._id, date, records });
            showToast(`✅ Attendance saved for ${new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`);
            // Refresh analytics
            const a = await fetchCourseAttendance(accessToken, selectedCourse._id);
            setAnalytics(a);
        } catch (e: any) {
            showToast(e?.message || 'Failed to save attendance', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ─── analytics calculations ─────────────────────────────────────────────── */
    const totalClasses = analytics?.totalClasses || 0;
    const totalStudents = analytics?.aggregateRoster?.length || 0;
    const avgAttendance = analytics?.aggregateRoster?.length
        ? Math.round(analytics.aggregateRoster.reduce((s, r) => s + r.percentage, 0) / analytics.aggregateRoster.length)
        : 0;
    const atRiskStudents = analytics?.aggregateRoster?.filter(r => r.percentage < 75) || [];

    return (
        <div style={pg.page}>
            {/* Toast */}
            {toast && (
                <div style={{ ...pg.toast, background: toast.type === 'error' ? '#7f1d1d' : '#064e3b', borderColor: toast.type === 'error' ? '#ef4444' : '#10b981' }}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div style={pg.header}>
                <div>
                    <h1 style={pg.title}>📋 Attendance Management</h1>
                    <p style={pg.sub}>Record and monitor student attendance across your courses</p>
                </div>
            </div>

            {/* Course selector */}
            <div style={pg.courseBar}>
                <div style={pg.courseBarInner}>
                    <label style={pg.label}>Select Course</label>
                    <select style={pg.select} value={selectedCourse?._id || ''}
                        onChange={e => {
                            const c = courses.find(x => x._id === e.target.value) || null;
                            setSelectedCourse(c);
                            setActiveTab('mark');
                        }}>
                        <option value="">— Choose a course —</option>
                        {courses.map(c => (
                            <option key={c._id} value={c._id}>{c.code} — {c.title}</option>
                        ))}
                    </select>
                </div>
                {selectedCourse && (
                    <div style={pg.courseInfo}>
                        <span style={pg.courseCode}>{selectedCourse.code}</span>
                        <span style={pg.courseTitle}>{selectedCourse.title}</span>
                        {totalClasses > 0 && (
                            <span style={pg.sessionBadge}>{totalClasses} sessions held</span>
                        )}
                    </div>
                )}
            </div>

            {/* No course selected */}
            {!selectedCourse && (
                <div style={pg.emptyState}>
                    <div style={{ fontSize: 64 }}>📚</div>
                    <h3 style={{ color: '#94a3b8', margin: '16px 0 8px' }}>Select a Course to Begin</h3>
                    <p style={{ color: '#64748b', fontSize: 14 }}>Choose one of your courses above to mark or view attendance</p>
                    {courses.length === 0 && (
                        <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>
                            ⚠️ No courses assigned. Contact admin to assign courses to your account.
                        </p>
                    )}
                </div>
            )}

            {/* Loading */}
            {selectedCourse && isLoading && (
                <div style={pg.emptyState}>
                    <div style={{ fontSize: 40, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⌛</div>
                    <p style={{ color: '#94a3b8', marginTop: 12 }}>Loading class roster...</p>
                </div>
            )}

            {/* Main content */}
            {selectedCourse && !isLoading && (
                <>
                    {/* Stats cards */}
                    <div style={pg.statsGrid}>
                        <StatCard icon="👥" value={totalStudents} label="Enrolled Students" color="#6366f1" />
                        <StatCard icon="📅" value={totalClasses} label="Sessions Held" color="#10b981" />
                        <StatCard icon="📊" value={`${avgAttendance}%`} label="Avg Attendance" color={avgAttendance >= 75 ? '#10b981' : '#f59e0b'} />
                        <StatCard icon="⚠️" value={atRiskStudents.length} label="At-Risk Students" color={atRiskStudents.length > 0 ? '#ef4444' : '#10b981'} />
                    </div>

                    {/* Tabs */}
                    <div style={pg.tabs}>
                        <button style={{ ...pg.tab, ...(activeTab === 'mark' ? pg.tabOn : {}) }} onClick={() => setActiveTab('mark')}>
                            ✏️ Mark Attendance
                        </button>
                        <button style={{ ...pg.tab, ...(activeTab === 'history' ? pg.tabOn : {}) }} onClick={() => setActiveTab('history')}>
                            📋 Session History
                        </button>
                        <button style={{ ...pg.tab, ...(activeTab === 'analytics' ? pg.tabOn : {}) }} onClick={() => setActiveTab('analytics')}>
                            📊 Student Analytics
                        </button>
                    </div>

                    {/* ── MARK ATTENDANCE TAB ── */}
                    {activeTab === 'mark' && (
                        <div style={pg.card}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
                                <h2 style={pg.cardTitle}>Live Attendance Roster</h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <label style={pg.label}>Date</label>
                                    <input type="date" value={date} onChange={e => setDate(e.target.value)}
                                        style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', fontSize: 14, outline: 'none' }} />
                                </div>
                            </div>

                            {roster.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                    <div style={{ fontSize: 48 }}>👨‍🎓</div>
                                    <p style={{ marginTop: 12 }}>No students enrolled in this course yet.</p>
                                </div>
                            ) : (
                                <AttendanceMarkingForm
                                    courseId={selectedCourse._id}
                                    date={date}
                                    roster={roster}
                                    isSubmitting={isSubmitting}
                                    initialStatuses={initialStatuses}
                                    onSubmit={handleSubmit}
                                    onCancel={() => setDate(new Date().toISOString().split('T')[0])}
                                />
                            )}
                        </div>
                    )}

                    {/* ── SESSION HISTORY TAB ── */}
                    {activeTab === 'history' && (
                        <div style={pg.card}>
                            <h2 style={{ ...pg.cardTitle, marginBottom: '1.5rem' }}>📅 Session History</h2>
                            {!analytics?.sessions?.length ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                    <div style={{ fontSize: 48 }}>📭</div>
                                    <p style={{ marginTop: 12 }}>No attendance sessions recorded yet.</p>
                                    <p style={{ fontSize: 13, marginTop: 4 }}>Use the Mark Attendance tab to record your first session.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {analytics.sessions.map((session, i) => {
                                        const presentCount = session.records?.filter(r => r.status === 'present' || r.status === 'late').length || 0;
                                        const totalCount = session.records?.length || 0;
                                        const pct = totalCount ? Math.round((presentCount / totalCount) * 100) : 0;
                                        return (
                                            <div key={i} style={pg.sessionRow}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 15 }}>
                                                        {new Date(session.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                                                        {presentCount} present · {totalCount - presentCount} absent · {totalCount} total
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 100, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 75 ? '#10b981' : '#f59e0b', borderRadius: 3 }} />
                                                    </div>
                                                    <span style={{ fontWeight: 800, color: pct >= 75 ? '#6ee7b7' : '#fcd34d', fontSize: 14, minWidth: 40 }}>{pct}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── ANALYTICS TAB ── */}
                    {activeTab === 'analytics' && (
                        <div style={pg.card}>
                            <h2 style={{ ...pg.cardTitle, marginBottom: '1.5rem' }}>📊 Student Analytics</h2>

                            {/* At-risk alert */}
                            {atRiskStudents.length > 0 && (
                                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '1rem', marginBottom: '1.5rem' }}>
                                    <div style={{ fontWeight: 700, color: '#fca5a5', marginBottom: 8 }}>
                                        ⚠️ {atRiskStudents.length} student{atRiskStudents.length > 1 ? 's' : ''} below 75% — At Risk of Detainment
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {atRiskStudents.map(r => (
                                            <span key={(r.student as any)?._id || String(r.student)} style={{ padding: '4px 12px', background: '#7f1d1d', border: '1px solid #ef444455', borderRadius: 20, fontSize: 12, color: '#fca5a5', fontWeight: 600 }}>
                                                {getName(r.student)} — {r.percentage}%
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!analytics?.aggregateRoster?.length ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                    <div style={{ fontSize: 48 }}>📭</div>
                                    <p style={{ marginTop: 12 }}>No data yet. Mark attendance sessions first.</p>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                        <thead>
                                            <tr>
                                                {['#', 'Student', 'Present', 'Late', 'Absent', 'Excused', 'Total', 'Attendance'].map(h => (
                                                    <th key={h} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 12, textTransform: 'uppercase', textAlign: h === 'Attendance' ? 'center' : 'left' }}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analytics.aggregateRoster.map((r, i) => {
                                                const pct = r.percentage;
                                                const color = pct >= 75 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
                                                return (
                                                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                                                        <td style={pg.atd}>{i + 1}</td>
                                                        <td style={pg.atd}>
                                                            <div>
                                                                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{getName(r.student)}</div>
                                                                <div style={{ fontSize: 11, color: '#64748b' }}>{getRoll(r.student)}</div>
                                                            </div>
                                                        </td>
                                                        <td style={{ ...pg.atd, color: '#6ee7b7', fontWeight: 700 }}>{r.present}</td>
                                                        <td style={{ ...pg.atd, color: '#fcd34d', fontWeight: 700 }}>{r.late}</td>
                                                        <td style={{ ...pg.atd, color: '#fca5a5', fontWeight: 700 }}>{r.absent}</td>
                                                        <td style={{ ...pg.atd, color: '#a5b4fc', fontWeight: 700 }}>{r.excused}</td>
                                                        <td style={{ ...pg.atd, color: '#94a3b8' }}>{r.totalClasses}</td>
                                                        <td style={{ ...pg.atd, textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                                                                <div style={{ width: 60, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                                                                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
                                                                </div>
                                                                <span style={{ fontWeight: 800, color, fontSize: 13, minWidth: 36 }}>{pct}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
    );
};

/* ─── Stat Card component ────────────────────────────────────────────────────── */
const StatCard: React.FC<{ icon: string; value: string | number; label: string; color: string }> = ({ icon, value, label, color }) => (
    <div style={{ background: 'var(--card-bg)', borderRadius: 14, padding: '1.25rem', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}22`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            {icon}
        </div>
        <div>
            <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        </div>
    </div>
);

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const pg: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1200, margin: '0 auto', fontFamily: "'Inter',sans-serif" },
    header: { marginBottom: '1.5rem' },
    title: { fontSize: 26, fontWeight: 800, color: 'var(--text-main)', margin: 0 },
    sub: { fontSize: 14, color: 'var(--text-muted)', marginTop: 4 },
    toast: { position: 'fixed', top: 20, right: 20, padding: '12px 20px', borderRadius: 10, border: '1px solid', color: '#fff', fontSize: 14, fontWeight: 500, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' },
    courseBar: { background: 'var(--card-bg)', borderRadius: 14, padding: '1.25rem 1.5rem', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' },
    courseBarInner: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 260 },
    courseInfo: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    courseCode: { padding: '4px 12px', background: '#1e1b4b', border: '1px solid #6366f155', color: '#818cf8', borderRadius: 20, fontSize: 12, fontWeight: 700 },
    courseTitle: { color: 'var(--text-main)', fontWeight: 600, fontSize: 14 },
    sessionBadge: { padding: '4px 10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7', borderRadius: 20, fontSize: 12, fontWeight: 600 },
    label: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
    select: { padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-main)', fontSize: 14, outline: 'none', minWidth: 260 },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem', marginBottom: '1.5rem' },
    tabs: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.04)', padding: 4, borderRadius: 12, width: 'fit-content', flexWrap: 'wrap' },
    tab: { padding: '8px 18px', borderRadius: 9, border: 'none', background: 'transparent', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    tabOn: { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' },
    card: { background: 'var(--card-bg)', borderRadius: 16, padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' },
    cardTitle: { fontSize: 17, fontWeight: 700, color: 'var(--text-main)', margin: 0 },
    emptyState: { textAlign: 'center', padding: '5rem 2rem', background: 'var(--card-bg)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.08)' },
    sessionRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, gap: 12, flexWrap: 'wrap' },
    atd: { padding: '10px 14px', color: 'var(--text-main)', verticalAlign: 'middle' },
};

export default FacultyAttendancePage;
