import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTeachingCourses } from '@/services/courseService';
import type { Course } from '@/services/courseService';
import {
    createAssignment, updateAssignment, deleteAssignment,
    fetchAssignments, fetchSubmissions, gradeSubmission,
    type Assignment, type Submission,
} from '@/services/lmsService';

type ModalMode = 'create' | 'edit';

const emptyForm = { title: '', description: '', dueDate: '', maxMarks: 10, attachmentUrl: '' };

const FacultyAssignmentsPage: React.FC = () => {
    const { accessToken } = useAuth();

    const getSecureUrl = (url: string) => {
        if (!url || !url.includes('/uploads/')) return url;
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}token=${accessToken}`;
    };
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);

    const [isLoadingCourses, setIsLoadingCourses] = useState(true);
    const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
    const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);

    const [modal, setModal] = useState<{ open: boolean; mode: ModalMode; data: typeof emptyForm; editId?: string }>({
        open: false, mode: 'create', data: emptyForm,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [gradingId, setGradingId] = useState<string | null>(null);
    const [gradeForm, setGradeForm] = useState({ marks: '', feedback: '' });
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        if (!accessToken) return;
        fetchTeachingCourses(accessToken)
            .then(r => { setCourses(r.courses); setIsLoadingCourses(false); })
            .catch(() => setIsLoadingCourses(false));
    }, [accessToken]);

    const loadAssignments = async (courseId: string) => {
        if (!accessToken) return;
        setIsLoadingAssignments(true);
        setSelectedAssignment(null);
        setSubmissions([]);
        try {
            const r = await fetchAssignments(accessToken, courseId);
            setAssignments(r.assignments || []);
        } catch (e: any) { showToast(e?.message || 'Failed to load assignments.', false); }
        finally { setIsLoadingAssignments(false); }
    };

    useEffect(() => {
        if (!selectedCourse) { setAssignments([]); setSelectedAssignment(null); setSubmissions([]); return; }
        loadAssignments(selectedCourse._id);
    }, [selectedCourse?._id]);

    const loadSubmissions = async (a: Assignment) => {
        if (!accessToken) return;
        setSelectedAssignment(a);
        setIsLoadingSubmissions(true);
        try {
            const r = await fetchSubmissions(accessToken, a._id);
            setSubmissions(r.submissions || []);
        } catch (e: any) { showToast(e?.message || 'Failed to load submissions.', false); }
        finally { setIsLoadingSubmissions(false); }
    };

    const openCreate = () => setModal({ open: true, mode: 'create', data: emptyForm });
    const openEdit = (a: Assignment) => setModal({
        open: true, mode: 'edit', editId: a._id,
        data: {
            title: a.title, description: a.description || '',
            dueDate: a.dueDate?.slice(0, 10) || '',
            maxMarks: a.maxMarks, attachmentUrl: (a as any).attachmentUrl || '',
        },
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken || !selectedCourse) return;
        setIsSubmitting(true);
        try {
            if (modal.mode === 'create') {
                await createAssignment(accessToken, {
                    courseId: selectedCourse._id,
                    title: modal.data.title,
                    description: modal.data.description,
                    dueDate: modal.data.dueDate,
                    maxMarks: Number(modal.data.maxMarks),
                    attachmentUrl: modal.data.attachmentUrl || undefined,
                });
                showToast('✅ Assignment created! Students have been notified.');
            } else if (modal.editId) {
                await updateAssignment(accessToken, modal.editId, {
                    title: modal.data.title,
                    description: modal.data.description,
                    dueDate: modal.data.dueDate,
                    maxMarks: Number(modal.data.maxMarks),
                });
                showToast('✅ Assignment updated! Students have been notified.');
            }
            setModal({ open: false, mode: 'create', data: emptyForm });
            await loadAssignments(selectedCourse._id);
        } catch (e: any) { showToast(e?.message || 'Failed to save.', false); }
        finally { setIsSubmitting(false); }
    };

    const handleDelete = async (a: Assignment) => {
        if (!accessToken || !selectedCourse) return;
        if (!window.confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
        try {
            await deleteAssignment(accessToken, a._id);
            if (selectedAssignment?._id === a._id) { setSelectedAssignment(null); setSubmissions([]); }
            showToast('Assignment deleted.');
            await loadAssignments(selectedCourse._id);
        } catch (e: any) { showToast(e?.message || 'Delete failed.', false); }
    };

    const handleGrade = async (subId: string) => {
        if (!accessToken || !selectedAssignment) return;
        const marks = Number(gradeForm.marks);
        if (isNaN(marks) || marks < 0 || marks > selectedAssignment.maxMarks) {
            showToast(`Marks must be between 0 and ${selectedAssignment.maxMarks}.`, false);
            return;
        }
        try {
            await gradeSubmission(accessToken, subId, marks, gradeForm.feedback);
            showToast('✅ Graded! Student has been notified.');
            setGradingId(null);
            setGradeForm({ marks: '', feedback: '' });
            await loadSubmissions(selectedAssignment);
        } catch (e: any) { showToast(e?.message || 'Grading failed.', false); }
    };

    const isOverdue = (d: string) => new Date(d) < new Date();

    return (
        <div style={s.page}>
            {toast && <div style={{ ...s.toast, background: toast.ok ? '#d1fae5' : '#fee2e2', color: toast.ok ? '#065f46' : '#991b1b', borderColor: toast.ok ? '#6ee7b7' : '#fca5a5' }}>{toast.msg}</div>}

            <div style={s.header}>
                <div>
                    <h1 style={s.title}>Assignments</h1>
                    <p style={s.sub}>Create, edit and grade assignments. Students are notified instantly.</p>
                </div>
            </div>

            {/* Controls */}
            <div style={s.row}>
                <div style={{ flex: 1, maxWidth: 380 }}>
                    <label style={s.label}>Course</label>
                    <select style={s.select} value={selectedCourse?._id || ''} disabled={isLoadingCourses}
                        onChange={e => setSelectedCourse(courses.find(c => c._id === e.target.value) || null)}>
                        <option value="">{isLoadingCourses ? 'Loading…' : '— Select a Course —'}</option>
                        {courses.map(c => <option key={c._id} value={c._id}>{c.code} — {c.title}</option>)}
                    </select>
                </div>
                <button style={{ ...s.btnPrimary, alignSelf: 'flex-end', opacity: selectedCourse ? 1 : 0.4 }}
                    disabled={!selectedCourse} onClick={openCreate}>
                    + New Assignment
                </button>
            </div>

            {!selectedCourse ? (
                <div style={s.empty}>Select a course to manage its assignments.</div>
            ) : isLoadingAssignments ? (
                <div style={s.empty}>Loading assignments…</div>
            ) : (
                <div style={s.grid}>
                    {/* LEFT — Assignment list */}
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>Assignments <span style={s.pill}>{assignments.length}</span></h3>
                        {assignments.length === 0 ? (
                            <div style={s.stateSm}>No assignments yet. Click "+ New Assignment".</div>
                        ) : (
                            <div style={{ display: 'grid', gap: 10 }}>
                                {assignments.map(a => {
                                    const over = isOverdue(a.dueDate);
                                    const active = selectedAssignment?._id === a._id;
                                    return (
                                        <div key={a._id} style={{ ...s.aCard, ...(active ? s.aCardActive : {}), ...(over ? s.aCardOverdue : {}) }}
                                            onClick={() => loadSubmissions(a)}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={s.aTitle}>{a.title}</div>
                                                {a.description && <div style={s.aMeta}>{a.description}</div>}
                                                <div style={s.aMeta}>
                                                    <span style={{ color: over ? '#ef4444' : '#64748b' }}>
                                                        {over ? '⚠ Overdue' : '📅 Due'}: {new Date(a.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                    &nbsp;•&nbsp; Max: {a.maxMarks} marks
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                                <button style={s.btnEdit} onClick={e => { e.stopPropagation(); openEdit(a); }}>Edit</button>
                                                <button style={s.btnDel} onClick={e => { e.stopPropagation(); handleDelete(a); }}>Delete</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* RIGHT — Submissions */}
                    <div style={s.card}>
                        <h3 style={s.cardTitle}>
                            Submissions
                            {selectedAssignment && (
                                <span style={s.pill}>{submissions.filter(s => s.marksAwarded !== null).length}/{submissions.length} graded</span>
                            )}
                        </h3>

                        {!selectedAssignment ? (
                            <div style={s.stateSm}>👈 Click an assignment to see student submissions.</div>
                        ) : isLoadingSubmissions ? (
                            <div style={s.stateSm}>Loading submissions…</div>
                        ) : submissions.length === 0 ? (
                            <div style={s.stateSm}>No submissions yet for "{selectedAssignment.title}".</div>
                        ) : (
                            <div style={{ display: 'grid', gap: 12 }}>
                                {submissions.map(sub => {
                                    const st = typeof sub.student === 'string' ? null : sub.student as any;
                                    const isGrading = gradingId === sub._id;
                                    return (
                                        <div key={sub._id} style={s.subCard}>
                                            <div style={s.subTop}>
                                                <div>
                                                    <div style={s.aTitle}>{st?.name || 'Student'}</div>
                                                    <div style={s.aMeta}>{st?.rollNumber} • Submitted {new Date(sub.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                                                    {sub.fileUrl && (
                                                        <a href={getSecureUrl(sub.fileUrl)} target="_blank" rel="noreferrer" style={s.link}>📎 View Submission</a>
                                                    )}
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    {sub.marksAwarded !== null ? (
                                                        <span style={s.graded}>{sub.marksAwarded}/{selectedAssignment.maxMarks}</span>
                                                    ) : (
                                                        <span style={s.pending}>Pending</span>
                                                    )}
                                                </div>
                                            </div>

                                            {sub.feedback && !isGrading && (
                                                <div style={s.feedbackBox}>💬 {sub.feedback}</div>
                                            )}

                                            {isGrading ? (
                                                <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <input style={{ ...s.input, width: 80 }} type="number" min={0} max={selectedAssignment.maxMarks}
                                                            placeholder={`/ ${selectedAssignment.maxMarks}`}
                                                            value={gradeForm.marks} onChange={e => setGradeForm(f => ({ ...f, marks: e.target.value }))} />
                                                        <input style={{ ...s.input, flex: 1 }} placeholder="Feedback for student (optional)"
                                                            value={gradeForm.feedback} onChange={e => setGradeForm(f => ({ ...f, feedback: e.target.value }))} />
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button style={s.btnPrimary} onClick={() => handleGrade(sub._id)}>✓ Submit Grade</button>
                                                        <button style={s.btnCancel} onClick={() => { setGradingId(null); setGradeForm({ marks: '', feedback: '' }); }}>Cancel</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button style={{ ...s.btnEdit, marginTop: 8 }} onClick={() => {
                                                    setGradingId(sub._id);
                                                    setGradeForm({ marks: sub.marksAwarded?.toString() || '', feedback: (sub.feedback as any) || '' });
                                                }}>
                                                    {sub.marksAwarded !== null ? 'Re-grade' : 'Grade'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal */}
            {modal.open && (
                <div style={s.overlay} onClick={() => setModal(m => ({ ...m, open: false }))}>
                    <div style={s.modalBox} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 18px', fontSize: 18, fontWeight: 800 }}>
                            {modal.mode === 'create' ? '+ New Assignment' : '✏ Edit Assignment'}
                        </h3>
                        <form onSubmit={handleSave} style={{ display: 'grid', gap: 12 }}>
                            <input style={s.input} required placeholder="Title *" value={modal.data.title}
                                onChange={e => setModal(m => ({ ...m, data: { ...m.data, title: e.target.value } }))} />
                            <textarea style={{ ...s.input, minHeight: 80, resize: 'vertical' }} placeholder="Instructions / Description"
                                value={modal.data.description}
                                onChange={e => setModal(m => ({ ...m, data: { ...m.data, description: e.target.value } }))} />
                            <input style={s.input} placeholder="Attachment URL (optional)" value={modal.data.attachmentUrl}
                                onChange={e => setModal(m => ({ ...m, data: { ...m.data, attachmentUrl: e.target.value } }))} />
                            <div style={{ display: 'flex', gap: 10 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ ...s.label, marginBottom: 4, display: 'block' }}>Due Date *</label>
                                    <input style={s.input} required type="date" value={modal.data.dueDate}
                                        onChange={e => setModal(m => ({ ...m, data: { ...m.data, dueDate: e.target.value } }))} />
                                </div>
                                <div style={{ width: 120 }}>
                                    <label style={{ ...s.label, marginBottom: 4, display: 'block' }}>Max Marks *</label>
                                    <input style={s.input} required type="number" min={1} value={modal.data.maxMarks}
                                        onChange={e => setModal(m => ({ ...m, data: { ...m.data, maxMarks: Number(e.target.value) } }))} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                <button type="button" style={s.btnCancel} onClick={() => setModal(m => ({ ...m, open: false }))}>Cancel</button>
                                <button type="submit" style={s.btnPrimary} disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving…' : modal.mode === 'create' ? 'Create & Notify Students' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const s: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1200, margin: '0 auto', fontFamily: "'Inter', sans-serif" },
    header: { marginBottom: '1.25rem' },
    title: { fontSize: 26, fontWeight: 800, color: 'var(--text-main)', margin: 0 },
    sub: { fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' },
    row: { display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap' },
    label: { fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6, display: 'block' },
    select: { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db', background: 'var(--card-bg)', fontSize: 14 },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 16, alignItems: 'start' },
    card: { background: 'var(--card-bg)', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
    cardTitle: { margin: '0 0 14px', fontSize: 16, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 },
    pill: { fontSize: 12, fontWeight: 700, padding: '3px 10px', background: '#eef2ff', color: '#3730a3', borderRadius: 999, border: '1px solid #c7d2fe' },
    empty: { padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--page-bg)', borderRadius: 12, border: '1px dashed #d1d5db' },
    stateSm: { padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--page-bg)', borderRadius: 10, border: '1px dashed #d1d5db', fontSize: 14 },
    aCard: { display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, cursor: 'pointer', transition: 'all 0.15s', background: 'var(--card-bg)' },
    aCardActive: { borderColor: '#6366f1', background: '#eef2ff' },
    aCardOverdue: { borderColor: '#fecaca' },
    aTitle: { fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginBottom: 2 },
    aMeta: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },
    subCard: { border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, background: 'var(--page-bg)' },
    subTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
    graded: { fontWeight: 800, fontSize: 16, color: '#059669', background: '#d1fae5', padding: '4px 10px', borderRadius: 8 },
    pending: { fontWeight: 700, fontSize: 12, color: '#92400e', background: '#fef3c7', padding: '4px 10px', borderRadius: 8 },
    feedbackBox: { marginTop: 8, fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 10px', background: 'var(--card-bg)', borderRadius: 8, border: '1px solid #f3f4f6' },
    link: { fontSize: 12, color: '#2563eb', textDecoration: 'none', display: 'block', marginTop: 4 },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
    btnPrimary: { padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap' },
    btnEdit: { padding: '6px 12px', borderRadius: 8, border: '1px solid #c7d2fe', background: '#eef2ff', color: '#3730a3', fontWeight: 700, cursor: 'pointer', fontSize: 12 },
    btnDel: { padding: '6px 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: 12 },
    btnCancel: { padding: '10px 18px', borderRadius: 10, border: '1px solid #d1d5db', background: 'var(--card-bg)', color: 'var(--text-main)', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
    modalBox: { background: 'var(--card-bg)', borderRadius: 16, width: '100%', maxWidth: 560, padding: 24, boxShadow: '0 25px 60px rgba(0,0,0,0.25)' },
    toast: { position: 'fixed', top: 20, right: 20, padding: '12px 20px', borderRadius: 12, border: '1px solid', fontSize: 14, fontWeight: 700, zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxWidth: 360 },
};

export default FacultyAssignmentsPage;
