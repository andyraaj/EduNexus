import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMyEnrollments } from '@/services/courseService';
import type { Enrollment, Course } from '@/services/courseService';
import { BookOpen, Clock, Users, ChevronRight, GraduationCap, AlertCircle, RefreshCw } from 'lucide-react';

const DEPT_COLORS = [
    { bg: '#eff6ff', accent: '#2563eb', border: '#bfdbfe' },
    { bg: '#f0fdf4', accent: '#16a34a', border: '#bbf7d0' },
    { bg: '#fdf4ff', accent: '#7c3aed', border: '#e9d5ff' },
    { bg: '#fff7ed', accent: '#c2410c', border: '#fed7aa' },
    { bg: '#fef3c7', accent: '#b45309', border: '#fde68a' },
    { bg: '#fce7f3', accent: '#be185d', border: '#fbcfe8' },
];

const getDeptColor = (dept: string) => {
    const idx = dept?.charCodeAt(0) % DEPT_COLORS.length || 0;
    return DEPT_COLORS[idx];
};

const formatDept = (dept: any): string => {
    if (!dept) return 'General';
    if (typeof dept === 'object') return dept.name || dept.code || 'General';
    return String(dept);
};

const StudentCoursesPage: React.FC = () => {
    const { accessToken } = useAuth();
    const navigate = useNavigate();
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const load = async () => {
        if (!accessToken) return;
        setIsLoading(true);
        setError('');
        try {
            const res = await fetchMyEnrollments(accessToken);
            setEnrollments(res.enrollments || []);
        } catch (e: any) {
            setError(e.message || 'Failed to load your courses.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { load(); }, [accessToken]);

    // Auto-refresh when admin changes course allocations
    useEffect(() => {
        const handler = () => load();
        window.addEventListener('EduNexus:courses_changed', handler);
        return () => window.removeEventListener('EduNexus:courses_changed', handler);
    }, [accessToken]);

    const filteredEnrollments = enrollments.filter(enr => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const c = enr.course as Course;
        return c.title?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q);
    });

    // Group by semester
    const bySemester = filteredEnrollments.reduce<Record<number, Enrollment[]>>((acc, enr) => {
        const sem = enr.semester || (enr.course as Course).semester || 0;
        if (!acc[sem]) acc[sem] = [];
        acc[sem].push(enr);
        return acc;
    }, {});

    const semesters = Object.keys(bySemester).map(Number).sort((a, b) => a - b);

    return (
        <div style={s.page}>
            {/* Header */}
            <div style={s.header}>
                <div>
                    <h1 style={s.title}>My Courses</h1>
                    <p style={s.subtitle}>
                        Your enrolled courses are automatically assigned by the administration based on your semester and department.
                    </p>
                </div>
                <div style={s.headerRight}>
                    <span style={s.badge}>
                        <GraduationCap size={14} style={{ marginRight: 6 }} />
                        {enrollments.length} Course{enrollments.length !== 1 ? 's' : ''} Enrolled
                    </span>
                </div>
            </div>

            {/* Info Banner */}
            <div style={s.infoBanner}>
                <AlertCircle size={16} style={{ color: '#1d4ed8', flexShrink: 0, marginTop: 1 }} />
                <p style={s.infoText}>
                    <strong>University Policy:</strong> Course enrollment is managed centrally by the Academic Office.
                    Your subjects for the current semester are automatically allocated based on your program and batch.
                    Contact your department coordinator for any enrollment queries.
                </p>
            </div>

            {/* Search */}
            <div style={s.searchBar}>
                <input
                    style={s.searchInput}
                    placeholder="🔍  Search courses by name or code..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button style={s.clearBtn} onClick={() => setSearchQuery('')}>✕</button>
                )}
            </div>

            {/* Loading */}
            {isLoading && (
                <div style={s.centerState}>
                    <div style={s.spinner} />
                    <p style={s.stateText}>Loading your semester courses...</p>
                </div>
            )}

            {/* Error */}
            {!isLoading && error && (
                <div style={s.errorBox}>
                    <AlertCircle size={24} style={{ color: '#dc2626' }} />
                    <div>
                        <p style={s.errorTitle}>Could not load courses</p>
                        <p style={s.errorSub}>{error}</p>
                    </div>
                    <button style={s.retryBtn} onClick={load}>
                        <RefreshCw size={14} style={{ marginRight: 6 }} />
                        Retry
                    </button>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && enrollments.length === 0 && (
                <div style={s.emptyBox}>
                    <div style={s.emptyIcon}>📚</div>
                    <h3 style={s.emptyTitle}>No Courses Allocated Yet</h3>
                    <p style={s.emptySub}>
                        Your semester courses haven't been allocated yet. Please check back after the academic office
                        processes the semester allocation, or contact your department coordinator.
                    </p>
                </div>
            )}

            {/* Course Grid — grouped by semester */}
            {!isLoading && !error && semesters.map(sem => (
                <div key={sem} style={s.semesterGroup}>
                    <div style={s.semesterLabel}>
                        <span style={s.semesterBadge}>Semester {sem}</span>
                        <span style={s.semesterCount}>{bySemester[sem].length} subjects</span>
                    </div>

                    <div style={s.courseGrid}>
                        {bySemester[sem].map((enr) => {
                            const course = enr.course as Course;
                            const dept = formatDept((course as any).department);
                            const colors = getDeptColor(dept);
                            const faculty = (course as any).primaryFaculty;

                            return (
                                <div
                                    key={enr._id}
                                    style={{ ...s.courseCard, borderTop: `4px solid ${colors.accent}` }}
                                    onClick={() => navigate(`/student/courses/${course._id}`)}
                                >
                                    {/* Card Header */}
                                    <div style={{ ...s.cardBadgeRow, background: colors.bg }}>
                                        <span style={{ ...s.codeTag, background: colors.accent, color: '#fff' }}>
                                            {course.code}
                                        </span>
                                        <span style={{ ...s.deptTag, color: colors.accent, background: colors.bg, border: `1px solid ${colors.border}` }}>
                                            {dept}
                                        </span>
                                    </div>

                                    {/* Course Title */}
                                    <div style={s.cardBody}>
                                        <h3 style={s.courseTitle}>{course.title}</h3>
                                        {course.description && (
                                            <p style={s.courseDesc}>{course.description}</p>
                                        )}
                                    </div>

                                    {/* Meta */}
                                    <div style={s.cardMeta}>
                                        <div style={s.metaItem}>
                                            <Clock size={13} style={{ color: '#9ca3af' }} />
                                            <span>{course.credits || 4} Credits</span>
                                        </div>
                                        <div style={s.metaItem}>
                                            <Users size={13} style={{ color: '#9ca3af' }} />
                                            <span>{faculty?.name || 'TBA'}</span>
                                        </div>
                                    </div>

                                    {/* Syllabus Progress */}
                                    {(course as any).syllabusProgress !== undefined && (
                                        <div style={s.progressWrap}>
                                            <div style={s.progressLabels}>
                                                <span style={s.progressLbl}>Syllabus</span>
                                                <span style={{ ...s.progressPct, color: colors.accent }}>
                                                    {(course as any).syllabusProgress}%
                                                </span>
                                            </div>
                                            <div style={s.progressBg}>
                                                <div style={{ ...s.progressFill, width: `${(course as any).syllabusProgress}%`, background: colors.accent }} />
                                            </div>
                                        </div>
                                    )}

                                    {/* CTA */}
                                    <button
                                        style={{ ...s.openBtn, color: colors.accent, borderColor: colors.border, background: colors.bg }}
                                        onClick={(e) => { e.stopPropagation(); navigate(`/student/courses/${course._id}`); }}
                                    >
                                        <BookOpen size={14} />
                                        Open Course
                                        <ChevronRight size={14} style={{ marginLeft: 'auto' }} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

const s: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1200, margin: '0 auto', fontFamily: "'Inter', sans-serif" },

    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 16 },
    title: { fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' },
    subtitle: { fontSize: 14, color: '#64748b', margin: '6px 0 0', maxWidth: 600, lineHeight: 1.6 },
    headerRight: { display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 },
    badge: { display: 'flex', alignItems: 'center', padding: '8px 16px', background: '#eff6ff', color: '#1d4ed8', borderRadius: 99, fontSize: 13, fontWeight: 700, border: '1px solid #bfdbfe', whiteSpace: 'nowrap' },

    infoBanner: { display: 'flex', alignItems: 'flex-start', gap: 12, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 18px', marginBottom: '1.5rem' },
    infoText: { margin: 0, fontSize: 13, color: '#1e3a8a', lineHeight: 1.6 },

    searchBar: { position: 'relative', marginBottom: '2rem' },
    searchInput: { width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit', color: '#111827' },
    clearBtn: { position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#9ca3af' },

    centerState: { padding: '5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
    spinner: { width: 40, height: 40, border: '3px solid #e5e7eb', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
    stateText: { fontSize: 15, color: '#6b7280', margin: 0 },

    errorBox: { display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, marginBottom: '2rem' },
    errorTitle: { margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#111827' },
    errorSub: { margin: 0, fontSize: 13, color: '#6b7280' },
    retryBtn: { display: 'flex', alignItems: 'center', marginLeft: 'auto', padding: '8px 16px', background: '#fff', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#dc2626', whiteSpace: 'nowrap', flexShrink: 0 },

    emptyBox: { padding: '5rem 2rem', textAlign: 'center', background: '#f9fafb', borderRadius: 16, border: '2px dashed #e5e7eb' },
    emptyIcon: { fontSize: 64, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 10px' },
    emptySub: { fontSize: 14, color: '#6b7280', maxWidth: 500, margin: '0 auto', lineHeight: 1.7 },

    semesterGroup: { marginBottom: '2.5rem' },
    semesterLabel: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' },
    semesterBadge: { fontSize: 13, fontWeight: 800, color: '#374151', background: '#f3f4f6', padding: '5px 14px', borderRadius: 99, border: '1px solid #e5e7eb', letterSpacing: '0.02em' },
    semesterCount: { fontSize: 12, color: '#9ca3af', fontWeight: 500 },

    courseGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' },

    courseCard: {
        background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden',
        cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.15s',
        display: 'flex', flexDirection: 'column',
    },
    cardBadgeRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' },
    codeTag: { fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 6, letterSpacing: '0.05em' },
    deptTag: { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, letterSpacing: '0.02em' },
    cardBody: { padding: '0 16px 12px', flex: 1 },
    courseTitle: { margin: '0 0 6px', fontSize: 15, fontWeight: 800, color: '#0f172a', lineHeight: 1.3, letterSpacing: '-0.2px' },
    courseDesc: { margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
    cardMeta: { display: 'flex', gap: 16, padding: '0 16px 12px' },
    metaItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6b7280', fontWeight: 500 },
    progressWrap: { padding: '0 16px 12px' },
    progressLabels: { display: 'flex', justifyContent: 'space-between', marginBottom: 5 },
    progressLbl: { fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
    progressPct: { fontSize: 11, fontWeight: 800 },
    progressBg: { height: 5, background: '#f3f4f6', borderRadius: 999, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 999, transition: 'width 0.4s ease' },
    openBtn: {
        display: 'flex', alignItems: 'center', gap: 8, margin: '0 16px 16px',
        padding: '10px 14px', borderRadius: 10, border: '1.5px solid', fontWeight: 700,
        fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
    },
};

export default StudentCoursesPage;
