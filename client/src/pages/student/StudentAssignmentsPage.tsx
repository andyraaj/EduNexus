import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { fetchMyEnrollments } from '@/services/courseService';
import type { Course } from '@/services/courseService';
import {
    fetchAssignments, fetchMySubmission, fetchAllMySubmissions,
    submitAssignment, type Assignment, type Submission,
} from '@/services/lmsService';

type StatusFilter = 'all' | 'pending' | 'submitted' | 'graded';

const StudentAssignmentsPage: React.FC = () => {
    const { accessToken } = useAuth();

    const getSecureUrl = (url: string) => {
        if (!url || !url.includes('/uploads/')) return url;
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}token=${accessToken}`;
    };
    const { notifications } = useSocket();

    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

    const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
    const [mySubmission, setMySubmission] = useState<Submission | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [fileUrl, setFileUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

    // Map of assignment._id -> my submission
    const submissionMap = Object.fromEntries(allSubmissions.map(s => [
        typeof s.assignment === 'string' ? s.assignment : (s.assignment as any)?._id,
        s
    ]));

    const loadAll = useCallback(async () => {
        if (!accessToken) return;
        setIsLoading(true);
        try {
            const [enrollRes, subRes] = await Promise.all([
                fetchMyEnrollments(accessToken),
                fetchAllMySubmissions(accessToken),
            ]);
            setCourses(enrollRes.enrollments.map(e => e.course));
            setAllSubmissions(subRes.submissions || []);
        } finally { setIsLoading(false); }
    }, [accessToken]);

    useEffect(() => { loadAll(); }, [loadAll]);

    // Re-fetch submissions when a new notification arrives (grading / new assignment)
    const lastNotifId = notifications[0]?._id;
    useEffect(() => {
        if (!lastNotifId || !accessToken) return;
        fetchAllMySubmissions(accessToken).then(r => setAllSubmissions(r.submissions || [])).catch(() => {});
        if (selectedCourse) {
            fetchAssignments(accessToken, selectedCourse._id).then(r => setAssignments(r.assignments || [])).catch(() => {});
        }
    }, [lastNotifId]);

    const loadAssignments = async (courseId: string) => {
        if (!accessToken) return;
        setIsLoadingAssignments(true);
        setActiveAssignment(null); setMySubmission(null); setAssignments([]);
        try {
            const r = await fetchAssignments(accessToken, courseId);
            setAssignments(r.assignments || []);
        } finally { setIsLoadingAssignments(false); }
    };

    useEffect(() => {
        if (!selectedCourse) { setAssignments([]); return; }
        loadAssignments(selectedCourse._id);
    }, [selectedCourse?._id]);

    const openAssignment = async (a: Assignment) => {
        if (!accessToken) return;
        setActiveAssignment(a); setFileUrl(''); setSubmitError('');
        setIsLoadingDetail(true);
        try {
            const r = await fetchMySubmission(accessToken, a._id);
            setMySubmission(r.submission);
        } catch { setMySubmission(null); }
        finally { setIsLoadingDetail(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken || !activeAssignment || !fileUrl.trim()) return;
        setIsSubmitting(true); setSubmitError('');
        try {
            await submitAssignment(accessToken, activeAssignment._id, fileUrl.trim());
            showToast('✅ Assignment submitted successfully!');
            setFileUrl('');
            const [r2, subs] = await Promise.all([
                fetchMySubmission(accessToken, activeAssignment._id),
                fetchAllMySubmissions(accessToken),
            ]);
            setMySubmission(r2.submission);
            setAllSubmissions(subs.submissions || []);
        } catch (e: any) { setSubmitError(e?.message || 'Submission failed.'); }
        finally { setIsSubmitting(false); }
    };

    const getStatus = (a: Assignment): 'pending' | 'submitted' | 'graded' | 'overdue' => {
        const sub = submissionMap[a._id];
        if (!sub) return new Date(a.dueDate) < new Date() ? 'overdue' : 'pending';
        if (sub.marksAwarded !== null) return 'graded';
        return 'submitted';
    };

    const filtered = assignments.filter(a => {
        if (statusFilter === 'all') return true;
        const st = getStatus(a);
        if (statusFilter === 'pending') return st === 'pending' || st === 'overdue';
        if (statusFilter === 'submitted') return st === 'submitted';
        if (statusFilter === 'graded') return st === 'graded';
        return true;
    });

    const statusBadge: Record<string, React.CSSProperties> = {
        pending: { background: '#fef3c7', color: '#92400e' },
        overdue: { background: '#fee2e2', color: '#991b1b' },
        submitted: { background: '#dbeafe', color: '#1e40af' },
        graded: { background: '#d1fae5', color: '#065f46' },
    };
    const statusLabel: Record<string, string> = {
        pending: 'Pending', overdue: '⚠ Overdue', submitted: 'Submitted', graded: '✓ Graded',
    };

    return (
        <div className="responsive-page responsive-assignments-page" style={s.page}>
            {toast && <div style={s.toast}>{toast}</div>}

            <div className="responsive-header" style={s.header}>
                <h1 style={s.title}>Assignments</h1>
                <p style={s.sub}>View course assignments, submit your work, and track grades.</p>
            </div>

            {/* Stats bar */}
            {allSubmissions.length > 0 && (
                <div className="responsive-stats-row" style={s.statsRow}>
                    {([
                        { label: 'Total', val: assignments.length, bg: '#f1f5f9' },
                        { label: 'Pending', val: assignments.filter(a => { const st = getStatus(a); return st === 'pending' || st === 'overdue'; }).length, bg: '#fef3c7' },
                        { label: 'Submitted', val: assignments.filter(a => getStatus(a) === 'submitted').length, bg: '#dbeafe' },
                        { label: 'Graded', val: assignments.filter(a => getStatus(a) === 'graded').length, bg: '#d1fae5' },
                    ]).map(({ label, val, bg }) => (
                        <div key={label} style={{ ...s.statCard, background: bg }}>
                            <div style={{ fontSize: 22, fontWeight: 800 }}>{val}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Course selector + filter */}
            <div className="responsive-toolbar responsive-assignments-toolbar" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                    <label style={s.label}>Course</label>
                    <select style={s.select} value={selectedCourse?._id || ''} disabled={isLoading}
                        onChange={e => setSelectedCourse(courses.find(c => c._id === e.target.value) || null)}>
                        <option value="">{isLoading ? 'Loading…' : '— Select a Course —'}</option>
                        {courses.map(c => <option key={c._id} value={c._id}>{c.code} — {c.title}</option>)}
                    </select>
                </div>
                {selectedCourse && (
                    <div className="responsive-filter-group" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {(['all', 'pending', 'submitted', 'graded'] as StatusFilter[]).map(f => (
                            <button key={f} style={{ ...s.filterBtn, ...(statusFilter === f ? s.filterBtnActive : {}) }}
                                onClick={() => setStatusFilter(f)}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {!selectedCourse ? (
                <div style={s.empty}>Select a course to see your assignments.</div>
            ) : isLoadingAssignments ? (
                <div style={s.empty}>Loading assignments…</div>
            ) : (
                <div className="responsive-split-grid responsive-assignments-grid" style={s.grid}>
                    {/* Assignment list */}
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Assignments <span style={s.pill}>{filtered.length}</span></h3>
                        {filtered.length === 0 ? (
                            <div style={s.stateSm}>No assignments in this category.</div>
                        ) : filtered.map(a => {
                            const status = getStatus(a);
                            const sub = submissionMap[a._id];
                            const active = activeAssignment?._id === a._id;
                            return (
                                <div key={a._id} className="responsive-assignment-card" style={{ ...s.aCard, ...(active ? s.aCardActive : {}) }} onClick={() => openAssignment(a)}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span style={{ ...s.badge, ...statusBadge[status] }}>{statusLabel[status]}</span>
                                        </div>
                                        <div style={s.aTitle}>{a.title}</div>
                                        {a.description && <div style={{ ...s.aMeta, marginTop: 2 }}>{a.description.slice(0, 80)}{a.description.length > 80 ? '…' : ''}</div>}
                                        <div className="responsive-meta-row" style={s.aMeta}>
                                            📅 Due: {new Date(a.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} &nbsp;•&nbsp; Max: {a.maxMarks} marks
                                        </div>
                                        {status === 'graded' && sub && (
                                            <div style={{ marginTop: 4, fontWeight: 700, color: '#059669', fontSize: 13 }}>
                                                🏆 Score: {sub.marksAwarded} / {a.maxMarks}
                                            </div>
                                        )}
                                    </div>
                                    <span style={{ color: 'var(--primary)', fontWeight: 900 }}>→</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Detail panel */}
                    <div style={s.card}>
                        {!activeAssignment ? (
                            <div style={s.stateSm}>👈 Select an assignment to view details and submit.</div>
                        ) : isLoadingDetail ? (
                            <div style={s.stateSm}>Loading…</div>
                        ) : (
                            <>
                                <div style={{ marginBottom: 16 }}>
                                    <h3 style={{ ...s.cardTitle, marginBottom: 4 }}>{activeAssignment.title}</h3>
                                    <div style={s.aMeta}>Max: {activeAssignment.maxMarks} marks &nbsp;•&nbsp; Due: {new Date(activeAssignment.dueDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                    {(activeAssignment as any).attachmentUrl && (
                                        <a href={getSecureUrl((activeAssignment as any).attachmentUrl)} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: 13, display: 'block', marginTop: 6 }}>
                                            📎 View Assignment File
                                        </a>
                                    )}
                                    {activeAssignment.description && (
                                        <div style={{ marginTop: 10, padding: 14, background: 'var(--page-bg)', borderRadius: 10, border: '1px solid #f3f4f6', fontSize: 14, lineHeight: 1.6, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                                            {activeAssignment.description}
                                        </div>
                                    )}
                                </div>

                                {/* Graded result */}
                                {mySubmission && mySubmission.marksAwarded !== null && (
                                    <div style={s.gradeResult}>
                                        <div style={{ fontSize: 28, fontWeight: 900, color: '#059669' }}>
                                            {mySubmission.marksAwarded} / {activeAssignment.maxMarks}
                                        </div>
                                        <div style={{ fontSize: 14, color: '#065f46', fontWeight: 600, marginTop: 2 }}>Your Grade</div>
                                        {mySubmission.feedback && (
                                            <div style={{ marginTop: 12, padding: '10px 14px', background: '#fff', borderRadius: 10, fontSize: 14, color: 'var(--text-main)', borderLeft: '3px solid #10b981' }}>
                                                <strong>Faculty Feedback:</strong> {mySubmission.feedback}
                                            </div>
                                        )}
                                        <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
                                            Submitted: {new Date(mySubmission.submittedAt).toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                )}

                                {/* Already submitted, awaiting grade */}
                                {mySubmission && mySubmission.marksAwarded === null && (
                                    <div style={s.submittedBox}>
                                        <div style={{ fontSize: 24 }}>📤</div>
                                        <div style={{ fontWeight: 700, fontSize: 15, marginTop: 6 }}>Submitted!</div>
                                        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Awaiting faculty review.</div>
                                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                                            {new Date(mySubmission.submittedAt).toLocaleString('en-IN')}
                                        </div>
                                        {mySubmission.fileUrl && (
                                            <a href={getSecureUrl(mySubmission.fileUrl)} target="_blank" rel="noreferrer"
                                                style={{ display: 'inline-block', marginTop: 10, fontSize: 13, color: '#2563eb' }}>
                                                📎 View your submission
                                            </a>
                                        )}
                                    </div>
                                )}

                                {/* Submit form */}
                                {!mySubmission && (
                                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
                                        <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                            Paste your submission link (Google Drive / GitHub / hosted file):
                                        </div>
                                        <input style={s.input} required placeholder="https://drive.google.com/…"
                                            value={fileUrl} onChange={e => setFileUrl(e.target.value)} />
                                        {submitError && <div style={{ color: '#ef4444', fontSize: 13 }}>{submitError}</div>}
                                        <button type="submit" disabled={isSubmitting} style={s.btnSubmit}>
                                            {isSubmitting ? 'Submitting…' : '📤 Submit Assignment'}
                                        </button>
                                    </form>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* All Graded Submissions */}
            {allSubmissions.filter(s => s.marksAwarded !== null).length > 0 && (
                <div style={{ marginTop: 40 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', margin: '0 0 14px' }}>📊 All Graded Results</h2>
                    <div style={{ display: 'grid', gap: 10 }}>
                        {allSubmissions.filter(s => s.marksAwarded !== null).map(s => {
                            const a = s.assignment as any;
                            return (
                                <div key={s._id} style={s2.gradedCard}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>{a?.title || 'Assignment'}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                            {a?.course?.code} • Submitted {new Date(s.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </div>
                                        {s.feedback && <div style={{ marginTop: 6, fontSize: 13, fontStyle: 'italic', color: 'var(--text-muted)' }}>"{s.feedback}"</div>}
                                    </div>
                                    <div className="responsive-stack-sm" style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontSize: 20, fontWeight: 900, color: '#059669' }}>{s.marksAwarded}</div>
                                        <div style={{ fontSize: 11, color: '#6b7280' }}>/ {a?.maxMarks} marks</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

const s: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1200, margin: '0 auto', fontFamily: "'Inter', sans-serif" },
    header: { marginBottom: '1rem' },
    title: { fontSize: 26, fontWeight: 800, color: 'var(--text-main)', margin: 0 },
    sub: { fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' },
    statsRow: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
    statCard: { flex: 1, minWidth: 80, padding: '12px 16px', borderRadius: 12, textAlign: 'center', border: '1px solid #e5e7eb' },
    label: { fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6, display: 'block' },
    select: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db', background: 'var(--card-bg)', fontSize: 14, minWidth: 280 },
    filterBtn: { padding: '7px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: 'var(--card-bg)', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: 13 },
    filterBtnActive: { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16, alignItems: 'start' },
    card: { background: 'var(--card-bg)', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
    cardTitle: { margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 },
    pill: { fontSize: 12, fontWeight: 700, padding: '3px 10px', background: '#eef2ff', color: '#3730a3', borderRadius: 999, border: '1px solid #c7d2fe' },
    empty: { padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--page-bg)', borderRadius: 12, border: '1px dashed #d1d5db' },
    stateSm: { padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--page-bg)', borderRadius: 10, border: '1px dashed #d1d5db', fontSize: 14 },
    badge: { fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
    aCard: { display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, cursor: 'pointer', marginBottom: 10, transition: 'all 0.15s', background: 'var(--card-bg)' },
    aCardActive: { borderColor: '#6366f1', background: '#eef2ff' },
    aTitle: { fontSize: 14, fontWeight: 700, color: 'var(--text-main)' },
    aMeta: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const },
    btnSubmit: { padding: '12px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 15 },
    gradeResult: { padding: 20, background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 14, textAlign: 'center', marginBottom: 16 },
    submittedBox: { padding: 20, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, textAlign: 'center', marginBottom: 16 },
    toast: { position: 'fixed', top: 20, right: 20, padding: '12px 20px', borderRadius: 12, background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7', fontSize: 14, fontWeight: 700, zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' },
};

const s2: Record<string, React.CSSProperties> = {
    gradedCard: { display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: 'var(--card-bg)', border: '1px solid #d1fae5', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
};

export default StudentAssignmentsPage;
