import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import {
    fetchMaterials, fetchAssignments, fetchMySubmission, submitAssignment,
    fetchCourseAnnouncements, trackMaterialDownload,
    getFileIcon, formatFileSize, getCategoryColor,
    type CourseMaterial, type Assignment, type Submission, type CourseAnnouncement,
} from '@/services/lmsService';

type Tab = 'overview' | 'materials' | 'assignments' | 'announcements';

const StudentCoursePage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const { accessToken } = useAuth();
    const navigate = useNavigate();

    const [course, setCourse] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [materials, setMaterials] = useState<CourseMaterial[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>([]);
    const [mySubmissions, setMySubmissions] = useState<Record<string, Submission>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [submitModal, setSubmitModal] = useState<Assignment | null>(null);
    const [submitUrl, setSubmitUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    };

    // Load course info
    useEffect(() => {
        if (!accessToken || !courseId) return;
        setIsLoading(true);
        api.get(`/courses/${courseId}`, accessToken)
            .then(res => setCourse(res.data?.course || res.course || res))
            .catch(() => navigate('/student/courses'))
            .finally(() => setIsLoading(false));
    }, [accessToken, courseId]);

    const loadTab = useCallback(async () => {
        if (!accessToken || !courseId) return;
        try {
            if (activeTab === 'materials') {
                const res = await fetchMaterials(accessToken, courseId);
                setMaterials(res.materials || []);
            } else if (activeTab === 'assignments') {
                const res = await fetchAssignments(accessToken, courseId);
                const list = res.assignments || [];
                setAssignments(list);
                const map: Record<string, Submission> = {};
                await Promise.all(list.map(async (a: Assignment) => {
                    try {
                        const s = await fetchMySubmission(accessToken, a._id);
                        if (s.submission) map[a._id] = s.submission;
                    } catch {}
                }));
                setMySubmissions(map);
            } else if (activeTab === 'announcements') {
                const res = await fetchCourseAnnouncements(accessToken, courseId);
                setAnnouncements(res.announcements || []);
            }
        } catch (e) { console.error(e); }
    }, [accessToken, courseId, activeTab]);

    useEffect(() => { loadTab(); }, [loadTab]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken || !submitModal) return;
        setIsSaving(true);
        try {
            const res = await submitAssignment(accessToken, submitModal._id, submitUrl);
            setMySubmissions(p => ({ ...p, [submitModal._id]: res.submission }));
            setSubmitModal(null);
            showToast('Assignment submitted successfully!');
        } catch (e: any) {
            showToast(e.message || 'Submission failed', false);
        } finally { setIsSaving(false); }
    };

    const getSecureUrl = (url: string) => {
        if (!url || !url.includes('/uploads/')) return url;
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}token=${accessToken}`;
    };

    const handleDownload = (mat: CourseMaterial) => {
        // Do not await the tracking call to prevent browser popup blockers from blocking window.open
        trackMaterialDownload(accessToken!, mat._id).catch(() => {});
        window.open(getSecureUrl(mat.fileUrl), '_blank');
    };

    const TABS: { id: Tab; label: string; icon: string }[] = [
        { id: 'overview', label: 'Overview', icon: '🏠' },
        { id: 'materials', label: 'Materials', icon: '📚' },
        { id: 'assignments', label: 'Assignments', icon: '📝' },
        { id: 'announcements', label: 'Announcements', icon: '📢' },
    ];

    const getDaysLeft = (due: string) => {
        const diff = new Date(due).getTime() - Date.now();
        const days = Math.ceil(diff / 86400000);
        if (days < 0) return { label: 'Past due', color: '#ef4444' };
        if (days === 0) return { label: 'Due today!', color: '#f59e0b' };
        if (days === 1) return { label: 'Due tomorrow', color: '#f59e0b' };
        return { label: `${days} days left`, color: '#10b981' };
    };

    if (isLoading) return (
        <div style={{ padding: '5rem', textAlign: 'center', color: '#6b7280', fontFamily: "'Inter',sans-serif" }}>
            Loading course...
        </div>
    );

    if (!course) return null;

    const faculty = course.primaryFaculty;
    const dept = typeof course.department === 'object' ? course.department?.name : course.department;

    // Group materials by module
    const byModule = materials.reduce<Record<string, CourseMaterial[]>>((acc, m) => {
        const mod = m.module || 'General';
        if (!acc[mod]) acc[mod] = [];
        acc[mod].push(m);
        return acc;
    }, {});
    // Pinned first
    (Object.values(byModule) as CourseMaterial[][]).forEach(arr => arr.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)));

    return (
        <div style={s.page}>
            {/* Toast */}
            {toast && (
                <div style={{ ...s.toast, background: toast.ok ? '#d1fae5' : '#fee2e2', color: toast.ok ? '#065f46' : '#991b1b' }}>
                    {toast.ok ? '✅' : '⚠️'} {toast.msg}
                </div>
            )}

            {/* Back + Course Banner */}
            <div style={s.banner}>
                <button style={s.backBtn} onClick={() => navigate('/student/courses')}>← My Courses</button>
                <div style={s.bannerContent}>
                    <span style={s.codeChip}>{course.code}</span>
                    <h1 style={s.bannerTitle}>{course.title}</h1>
                    <div style={s.bannerMeta}>
                        {dept && <span style={s.metaChip}>🏛 {dept}</span>}
                        <span style={s.metaChip}>📅 Semester {course.semester}</span>
                        <span style={s.metaChip}>⭐ {course.credits} Credits</span>
                        {faculty && <span style={s.metaChip}>👨‍🏫 {faculty.name}</span>}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={s.tabs}>
                {TABS.map(t => (
                    <button key={t.id} style={activeTab === t.id ? s.tabActive : s.tab} onClick={() => setActiveTab(t.id)}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            <div style={s.content}>

                {/* ── OVERVIEW ── */}
                {activeTab === 'overview' && (
                    <div style={s.overviewGrid}>
                        <div style={s.card}>
                            <h3 style={s.cardTitle}>📋 Course Description</h3>
                            <p style={{ margin: 0, color: '#374151', lineHeight: 1.7, fontSize: 14 }}>
                                {course.description || 'No description provided.'}
                            </p>
                        </div>
                        <div style={s.card}>
                            <h3 style={s.cardTitle}>📖 Syllabus Progress</h3>
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: 13, color: '#6b7280' }}>Coverage</span>
                                    <strong style={{ color: '#2563eb' }}>{course.syllabusProgress || 0}%</strong>
                                </div>
                                <div style={{ height: 8, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${course.syllabusProgress || 0}%`, background: '#2563eb', borderRadius: 99 }} />
                                </div>
                            </div>
                            {(course.syllabusUnits || []).map((u: any, i: number) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                    <span style={{ fontSize: 16 }}>{u.isCompleted ? '✅' : '⬜'}</span>
                                    <span style={{ fontSize: 13, color: u.isCompleted ? '#10b981' : '#374151', textDecoration: u.isCompleted ? 'line-through' : 'none' }}>{u.title}</span>
                                </div>
                            ))}
                        </div>
                        {faculty && (
                            <div style={s.card}>
                                <h3 style={s.cardTitle}>👨‍🏫 Instructor</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={s.facultyAvatar}>{faculty.name?.charAt(0)}</div>
                                    <div>
                                        <p style={{ margin: '0 0 3px', fontWeight: 700, color: '#111827', fontSize: 15 }}>{faculty.name}</p>
                                        <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>{faculty.email}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── MATERIALS ── */}
                {activeTab === 'materials' && (
                    <div>
                        {materials.length === 0 ? (
                            <div style={s.empty}>📁 No materials uploaded yet. Check back soon.</div>
                        ) : (Object.entries(byModule) as [string, CourseMaterial[]][]).map(([mod, items]) => (
                            <div key={mod} style={{ marginBottom: '2rem' }}>
                                <div style={s.moduleLabel}>📂 {mod}</div>
                                <div style={s.materialGrid}>
                                    {items.map(mat => {
                                        const colors = getCategoryColor(mat.category);
                                        return (
                                            <div key={mat._id} style={s.materialCard}>
                                                {mat.isPinned && <span style={s.pinBadge}>📌 Pinned</span>}
                                                <div style={s.materialIcon}>{getFileIcon(mat.mimeType, mat.isExternalLink)}</div>
                                                <div style={s.materialInfo}>
                                                    <p style={s.materialTitle}>{mat.title}</p>
                                                    <p style={s.materialMeta}>
                                                        {mat.description && <span>{mat.description} · </span>}
                                                        {formatFileSize(mat.fileSize)}
                                                        {mat.downloadCount > 0 && ` · ${mat.downloadCount} downloads`}
                                                    </p>
                                                    <span style={{ ...s.catBadge, background: colors.bg, color: colors.text }}>
                                                        {mat.category}
                                                    </span>
                                                </div>
                                                <button style={s.dlBtn} onClick={() => handleDownload(mat)}>
                                                    {mat.isExternalLink ? '🔗 Open' : '⬇ Download'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── ASSIGNMENTS ── */}
                {activeTab === 'assignments' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {assignments.length === 0 ? (
                            <div style={s.empty}>📝 No assignments posted yet.</div>
                        ) : assignments.map(a => {
                            const sub = mySubmissions[a._id];
                            const dl = getDaysLeft(a.dueDate);
                            const submitted = !!sub;
                            const graded = sub?.marksAwarded != null;
                            return (
                                <div key={a._id} style={{ ...s.assignCard, borderLeft: `4px solid ${submitted ? '#10b981' : '#f59e0b'}` }}>
                                    <div style={s.assignTop}>
                                        <div>
                                            <h3 style={s.assignTitle}>{a.title}</h3>
                                            <p style={s.assignDesc}>{a.description}</p>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ ...s.daysLabel, color: dl.color }}>{dl.label}</div>
                                            <div style={s.dueDate}>{new Date(a.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                            <div style={s.maxMarks}>Max: {a.maxMarks} marks</div>
                                        </div>
                                    </div>
                                    {graded && (
                                        <div style={s.gradedBox}>
                                            ✅ Graded: <strong>{sub.marksAwarded}/{a.maxMarks}</strong>
                                            {sub.feedback && <> · <em>{sub.feedback}</em></>}
                                        </div>
                                    )}
                                    {!graded && submitted && (
                                        <div style={s.submittedBox}>
                                            📤 Submitted — awaiting review
                                        </div>
                                    )}
                                    {a.attachmentUrl && (
                                        <a href={getSecureUrl(a.attachmentUrl)} target="_blank" rel="noreferrer" style={s.attachLink}>
                                            📎 View Assignment Brief
                                        </a>
                                    )}
                                    {!submitted && (
                                        <button style={s.submitBtn} onClick={() => { setSubmitModal(a); setSubmitUrl(''); }}>
                                            📤 Submit Assignment
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── ANNOUNCEMENTS ── */}
                {activeTab === 'announcements' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {announcements.length === 0 ? (
                            <div style={s.empty}>📢 No announcements yet.</div>
                        ) : announcements.map(ann => {
                            const pColors = ann.priority === 'urgent' ? { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' }
                                : ann.priority === 'important' ? { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c' }
                                : { bg: '#f9fafb', border: '#e5e7eb', text: '#374151' };
                            return (
                                <div key={ann._id} style={{ ...s.annCard, background: pColors.bg, borderColor: pColors.border }}>
                                    {ann.isPinned && <span style={s.pinBadge}>📌 Pinned</span>}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                        <h3 style={{ ...s.annTitle, color: pColors.text }}>{ann.title}</h3>
                                        {ann.priority !== 'normal' && (
                                            <span style={{ ...s.priorityBadge, background: pColors.border, color: pColors.text }}>
                                                {ann.priority.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <p style={s.annBody}>{ann.body}</p>
                                    <div style={s.annFoot}>
                                        <span>👨‍🏫 {ann.postedBy?.name}</span>
                                        <span>{new Date(ann.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Submit Modal */}
            {submitModal && (
                <div style={s.overlay} onClick={() => setSubmitModal(null)}>
                    <div style={s.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Submit Assignment</h2>
                        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#6b7280' }}>{submitModal.title}</p>
                        <form onSubmit={handleSubmit}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                                File URL or Shared Drive Link
                            </label>
                            <input
                                type="url" required
                                placeholder="https://drive.google.com/..."
                                value={submitUrl}
                                onChange={e => setSubmitUrl(e.target.value)}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                            />
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
                                <button type="button" onClick={() => setSubmitModal(null)} style={s.cancelBtn}>Cancel</button>
                                <button type="submit" disabled={isSaving} style={s.primaryBtn}>
                                    {isSaving ? 'Submitting...' : '📤 Confirm Submission'}
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
    page: { padding: '2rem', maxWidth: 1100, margin: '0 auto', fontFamily: "'Inter',sans-serif" },
    toast: { position: 'fixed', top: 20, right: 20, padding: '12px 20px', borderRadius: 10, border: '1px solid', fontSize: 14, fontWeight: 600, zIndex: 9999 },
    banner: { background: 'linear-gradient(135deg,#1e3a8a,#1d4ed8)', borderRadius: 16, padding: '28px 32px', marginBottom: '1.5rem', color: '#fff' },
    backBtn: { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', marginBottom: 16, fontWeight: 600 },
    bannerContent: {},
    codeChip: { background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 800, letterSpacing: '0.05em' },
    bannerTitle: { margin: '10px 0 12px', fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.2 },
    bannerMeta: { display: 'flex', flexWrap: 'wrap', gap: 10 },
    metaChip: { background: 'rgba(255,255,255,0.15)', padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
    tabs: { display: 'flex', gap: 4, borderBottom: '2px solid #e5e7eb', marginBottom: '2rem' },
    tab: { background: 'none', border: 'none', padding: '10px 18px', fontSize: 14, fontWeight: 600, color: '#6b7280', cursor: 'pointer', borderRadius: '8px 8px 0 0' },
    tabActive: { background: 'none', border: 'none', padding: '10px 18px', fontSize: 14, fontWeight: 800, color: '#2563eb', cursor: 'pointer', borderBottom: '3px solid #2563eb', marginBottom: -2 },
    content: { minHeight: 400 },
    overviewGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '1.25rem' },
    card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
    cardTitle: { margin: '0 0 16px', fontSize: 15, fontWeight: 800, color: '#0f172a' },
    facultyAvatar: { width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg,#2563eb,#4f46e5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 },
    empty: { padding: '4rem 2rem', textAlign: 'center', color: '#9ca3af', background: '#f9fafb', borderRadius: 14, border: '2px dashed #e5e7eb', fontSize: 15 },
    moduleLabel: { fontSize: 13, fontWeight: 800, color: '#374151', background: '#f3f4f6', padding: '6px 14px', borderRadius: 8, display: 'inline-block', marginBottom: 12 },
    materialGrid: { display: 'flex', flexDirection: 'column', gap: 10 },
    materialCard: { display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 18px', position: 'relative' },
    pinBadge: { position: 'absolute', top: 8, right: 12, fontSize: 11, fontWeight: 700, color: '#92400e' },
    materialIcon: { fontSize: 28, flexShrink: 0 },
    materialInfo: { flex: 1, minWidth: 0 },
    materialTitle: { margin: '0 0 3px', fontSize: 14, fontWeight: 700, color: '#111827' },
    materialMeta: { margin: '0 0 5px', fontSize: 12, color: '#9ca3af' },
    catBadge: { fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.06em' },
    dlBtn: { padding: '8px 16px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
    assignCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
    assignTop: { display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 12, flexWrap: 'wrap' },
    assignTitle: { margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#0f172a' },
    assignDesc: { margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.5 },
    daysLabel: { fontSize: 13, fontWeight: 800, marginBottom: 3 },
    dueDate: { fontSize: 13, color: '#374151', fontWeight: 600 },
    maxMarks: { fontSize: 12, color: '#9ca3af', marginTop: 3 },
    gradedBox: { background: '#d1fae5', color: '#065f46', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 10 },
    submittedBox: { background: '#fef3c7', color: '#92400e', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 10 },
    attachLink: { display: 'inline-block', fontSize: 13, color: '#2563eb', fontWeight: 600, marginBottom: 12, textDecoration: 'none' },
    submitBtn: { padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
    annCard: { border: '1px solid', borderRadius: 14, padding: '20px 24px', position: 'relative' },
    annTitle: { margin: '0 0 10px', fontSize: 16, fontWeight: 800 },
    annBody: { margin: '0 0 14px', fontSize: 14, color: '#374151', lineHeight: 1.7 },
    annFoot: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af', fontWeight: 600 },
    priorityBadge: { fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 4, letterSpacing: '0.06em', whiteSpace: 'nowrap' },
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
    modal: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, padding: 28, boxShadow: '0 25px 60px rgba(0,0,0,0.2)' },
    cancelBtn: { padding: '10px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#374151' },
    primaryBtn: { padding: '10px 22px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
};

export default StudentCoursePage;
