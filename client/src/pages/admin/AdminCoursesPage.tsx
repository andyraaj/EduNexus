import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { showErrorToast } from '@/utils/errorHandler';
import CourseCard from '@/components/CourseCard';
import CourseFormModal from '@/components/CourseFormModal';
import {
    fetchCourses, createCourse, updateCourse, deleteCourse,
} from '@/services/courseService';
import api from '@/services/api';
import type { Course, CreateCoursePayload, DepartmentInfo } from '@/services/courseService';

// ── In-app confirmation modal (replaces window.confirm) ──────────────────────
interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    confirmStyle?: 'danger' | 'success';
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen, title, message, confirmLabel, confirmStyle = 'danger',
    onConfirm, onCancel, isLoading,
}) => {
    if (!isOpen) return null;
    const confirmBg = confirmStyle === 'danger'
        ? 'linear-gradient(135deg,#ef4444,#dc2626)'
        : 'linear-gradient(135deg,#10b981,#059669)';
    return (
        <div style={cm.overlay} onClick={onCancel}>
            <div style={cm.modal} onClick={e => e.stopPropagation()}>
                <div style={cm.iconWrap}>
                    {confirmStyle === 'danger' ? '⚠️' : '✅'}
                </div>
                <h3 style={cm.title}>{title}</h3>
                <p style={cm.msg}>{message}</p>
                <div style={cm.actions}>
                    <button style={cm.cancel} onClick={onCancel} disabled={isLoading}>Cancel</button>
                    <button
                        style={{ ...cm.confirm, background: confirmBg, opacity: isLoading ? 0.7 : 1 }}
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Processing…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

const cm: Record<string, React.CSSProperties> = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20 },
    modal: { background: 'var(--card-bg)', borderRadius: 20, padding: '36px 32px', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 32px 80px rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' },
    iconWrap: { fontSize: 40, marginBottom: 12, lineHeight: 1 },
    title: { fontSize: 20, fontWeight: 800, color: 'var(--text-main)', margin: '0 0 10px' },
    msg: { fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 28px' },
    actions: { display: 'flex', gap: 12 },
    cancel: { flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid #e5e7eb', background: 'var(--page-bg)', color: 'var(--text-main)', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    confirm: { flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
};

// ── Main Page ─────────────────────────────────────────────────────────────────
type ConfirmAction = 'deactivate' | 'reactivate' | null;

const AdminCoursesPage: React.FC = () => {
    const { accessToken } = useAuth();
    const { socket } = useSocket();
    const [courses, setCourses] = useState<Course[]>([]);
    const [faculties, setFaculties] = useState<any[]>([]);
    const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
    const [meta, setMeta] = useState({ page: 1, totalPages: 1, totalRecords: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [page, setPage] = useState(1);

    const [modalOpen, setModalOpen] = useState(false);
    const [editCourse, setEditCourse] = useState<Course | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Confirm modal state
    const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
    const [confirmCourse, setConfirmCourse] = useState<Course | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);

    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);



    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const loadCourses = useCallback(async (p = page, s = search, d = deptFilter) => {
        if (!accessToken) return;
        setIsLoading(true);
        try {
            const res = await fetchCourses(accessToken, { search: s, department: d || undefined, page: p, limit: 12 });
            setCourses(res.courses);
            if (res.meta) setMeta(res.meta);
        } catch (e: any) {
            showToast(showErrorToast(e, 'Failed to load courses'), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [accessToken, page, search, deptFilter]);

    // Socket: re-fetch on any course change broadcast
    useEffect(() => {
        if (!socket) return;
        const handler = () => loadCourses();
        socket.on('courses_changed', handler);
        return () => { socket.off('courses_changed', handler); };
    }, [socket, loadCourses]);

    useEffect(() => {
        loadCourses();
        if (!accessToken) return;
        // Fetch faculty list
        api.get('/faculty', accessToken)
            .then((res: any) => setFaculties(res.data?.faculties || res.faculties || res.data || []))
            .catch(() =>
                api.get('/users?role=faculty&limit=100', accessToken)
                    .then((r2: any) => setFaculties(r2.data?.users || r2.users || r2.data || []))
                    .catch(console.error)
            );
        // Fetch departments
        api.get('/foundation/departments', accessToken)
            .then((res: any) => {
                const depts = res.data?.departments || res.departments || res.data || [];
                setDepartments(depts);
            })
            .catch(console.error);
    }, [accessToken]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        loadCourses(1, search, deptFilter);
    };

    const handleFormSubmit = async (data: CreateCoursePayload) => {
        if (!accessToken) return;
        setIsSubmitting(true);
        try {
            if (editCourse) {
                await updateCourse(accessToken, editCourse._id, data);
                showToast(`✅ "${data.title}" updated successfully.`);
            } else {
                await createCourse(accessToken, data);
                showToast(`✅ "${data.title}" created successfully.`);
            }
            setModalOpen(false);
            setEditCourse(null);
            loadCourses(1);
        } catch (e: any) {
            showToast(showErrorToast(e, 'Failed to save course'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Open the in-app confirm modal
    const askConfirm = (course: Course, action: ConfirmAction) => {
        setConfirmCourse(course);
        setConfirmAction(action);
    };

    // Execute after user confirms
    const handleConfirmed = async () => {
        if (!accessToken || !confirmCourse || !confirmAction) return;
        setIsConfirming(true);
        try {
            if (confirmAction === 'deactivate') {
                await deleteCourse(accessToken, confirmCourse._id);
                showToast(`🔒 "${confirmCourse.code}" deactivated. Enrolled students notified.`);
            } else {
                await api.patch(`/courses/${confirmCourse._id}/reactivate`, {}, accessToken);
                showToast(`✅ "${confirmCourse.code}" is now active.`);
            }
            setConfirmAction(null);
            setConfirmCourse(null);
            loadCourses();
        } catch (e: any) {
            showToast(showErrorToast(e, 'Operation failed'), 'error');
        } finally {
            setIsConfirming(false);
        }
    };

    const confirmTitle = confirmAction === 'deactivate'
        ? `Deactivate "${confirmCourse?.title}"?`
        : `Reactivate "${confirmCourse?.title}"?`;

    const confirmMsg = confirmAction === 'deactivate'
        ? `Course ${confirmCourse?.code} will be marked inactive. Students remain enrolled but won't see it in active courses. You can reactivate at any time.`
        : `Course ${confirmCourse?.code} will be restored and visible to all students and faculty again.`;

    return (
        <div style={styles.page}>
            {/* Toast */}
            {toast && (
                <div style={{
                    ...styles.toast,
                    background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
                    color: toast.type === 'error' ? '#991b1b' : '#065f46',
                    borderColor: toast.type === 'error' ? '#fca5a5' : '#86efac',
                }}>
                    {toast.msg}
                </div>
            )}

            {/* In-app confirm dialog */}
            <ConfirmModal
                isOpen={!!confirmAction}
                title={confirmTitle}
                message={confirmMsg}
                confirmLabel={confirmAction === 'deactivate' ? 'Yes, Deactivate' : 'Yes, Reactivate'}
                confirmStyle={confirmAction === 'deactivate' ? 'danger' : 'success'}
                onConfirm={handleConfirmed}
                onCancel={() => { setConfirmAction(null); setConfirmCourse(null); }}
                isLoading={isConfirming}
            />

            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Course Catalog</h1>
                    <p style={styles.subtitle}>{meta.totalRecords} course{meta.totalRecords !== 1 ? 's' : ''} total</p>
                </div>
                <button style={styles.createBtn} onClick={() => { setEditCourse(null); setModalOpen(true); }}>
                    + New Course
                </button>
            </div>

            {/* Filters */}
            <form style={styles.filterBar} onSubmit={handleSearch}>
                <input
                    style={styles.searchInput}
                    placeholder="Search by Code or Title…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <select style={styles.select} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
                <button type="submit" style={styles.searchBtn}>Filter</button>
                {(search || deptFilter) && (
                    <button type="button" style={styles.clearBtn} onClick={() => { setSearch(''); setDeptFilter(''); setPage(1); loadCourses(1, '', ''); }}>
                        Clear
                    </button>
                )}
            </form>

            {/* Course grid */}
            {isLoading ? (
                <div style={styles.loadingGrid}>
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} style={styles.skeleton} />)}
                </div>
            ) : courses.length === 0 ? (
                <div style={styles.empty}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
                    <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-main)' }}>No courses found</div>
                    <div style={{ fontSize: 13 }}>Try adjusting your search or create a new course.</div>
                </div>
            ) : (
                <div style={styles.grid}>
                    {courses.map(course => (
                        <CourseCard
                            key={course._id}
                            course={course}
                            actionSlot={
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        style={styles.btnEdit}
                                        onClick={() => { setEditCourse(course); setModalOpen(true); }}
                                    >
                                        ✏️ Edit
                                    </button>
                                    {course.isActive ? (
                                        <button
                                            style={styles.btnDelete}
                                            onClick={() => askConfirm(course, 'deactivate')}
                                        >
                                            🔒 Deactivate
                                        </button>
                                    ) : (
                                        <button
                                            style={styles.btnReactivate}
                                            onClick={() => askConfirm(course, 'reactivate')}
                                        >
                                            ✅ Reactivate
                                        </button>
                                    )}
                                </div>
                            }
                        />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {meta.totalPages > 1 && (
                <div style={styles.pagination}>
                    <button style={styles.pageBtn} disabled={page <= 1}
                        onClick={() => { const p = page - 1; setPage(p); loadCourses(p); }}>
                        ← Prev
                    </button>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Page {meta.page} of {meta.totalPages}
                    </span>
                    <button style={styles.pageBtn} disabled={page >= meta.totalPages}
                        onClick={() => { const p = page + 1; setPage(p); loadCourses(p); }}>
                        Next →
                    </button>
                </div>
            )}

            {/* Course Create/Edit Modal */}
            <CourseFormModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setEditCourse(null); }}
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
                editCourse={editCourse}
                faculties={faculties}
            />
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1200, margin: '0 auto', fontFamily: "'Inter', sans-serif" },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' },
    title: { fontSize: 26, fontWeight: 800, color: 'var(--text-main)', margin: 0 },
    subtitle: { fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' },
    createBtn: { padding: '11px 22px', background: 'linear-gradient(135deg, var(--primary-light), var(--primary))', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700, boxShadow: '0 4px 12px rgba(99,102,241,0.3)' },
    filterBar: { display: 'flex', gap: 10, marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' },
    searchInput: { flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', background: 'var(--card-bg)', color: 'var(--text-main)' },
    select: { padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, background: 'var(--card-bg)', color: 'var(--text-main)' },
    searchBtn: { padding: '10px 20px', borderRadius: 10, border: 'none', background: 'var(--text-main)', color: 'var(--card-bg)', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
    clearBtn: { padding: '10px 16px', borderRadius: 10, border: '1px solid #e5e7eb', background: 'var(--page-bg)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' },
    loadingGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' },
    skeleton: { height: 200, borderRadius: 12, background: 'linear-gradient(90deg, var(--page-bg) 25%, #e5e7eb 50%, var(--page-bg) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' },
    empty: { padding: '5rem 2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--page-bg)', borderRadius: 16, border: '1px dashed #d1d5db' },
    btnEdit: { flex: 1, padding: '8px 0', background: 'var(--page-bg)', color: 'var(--text-main)', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' },
    btnDelete: { flex: 1, padding: '8px 0', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    btnReactivate: { flex: 1, padding: '8px 0', background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: '2rem' },
    pageBtn: { padding: '8px 18px', borderRadius: 10, border: '1px solid #d1d5db', background: 'var(--card-bg)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-main)' },
    toast: { position: 'fixed', top: 24, right: 24, padding: '14px 22px', borderRadius: 12, border: '1px solid', fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxWidth: 380 },
};

export default AdminCoursesPage;
