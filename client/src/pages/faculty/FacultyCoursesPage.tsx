import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import CourseCard from '@/components/CourseCard';
import { fetchTeachingCourses, fetchCourseRoster } from '@/services/courseService';
import type { Course, Enrollment } from '@/services/courseService';

const FacultyCoursesPage: React.FC = () => {
    const { accessToken } = useAuth();
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [rosterData, setRosterData] = useState<Enrollment[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [isLoadingRoster, setIsLoadingRoster] = useState(false);

    useEffect(() => {
        if (!accessToken) return;
        const load = async () => {
            try {
                const res = await fetchTeachingCourses(accessToken);
                setCourses(res.courses);
            } catch (e: any) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [accessToken]);

    // Auto-refresh when admin changes course data (Socket.IO → custom browser event)
    useEffect(() => {
        if (!accessToken) return;
        const handler = async () => {
            try {
                const res = await fetchTeachingCourses(accessToken);
                setCourses(res.courses);
            } catch (_) {}
        };
        window.addEventListener('EduNexus:courses_changed', handler);
        return () => window.removeEventListener('EduNexus:courses_changed', handler);
    }, [accessToken]);

    const handleViewRoster = async (course: Course) => {
        if (!accessToken) return;
        setSelectedCourse(course);
        setIsLoadingRoster(true);
        try {
            const res = await fetchCourseRoster(accessToken, course._id);
            // API returns: { roster: Enrollment[] }
            setRosterData((res as any).roster || []);
        } catch (e: any) {
            console.error(e);
        } finally {
            setIsLoadingRoster(false);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h1 style={styles.title}>My Classes</h1>
                <p style={styles.subtitle}>Manage your assigned courses and student rosters</p>
            </div>

            {isLoading ? (
                <div style={styles.empty}>Loading your courses...</div>
            ) : courses.length === 0 ? (
                <div style={styles.empty}>You are not assigned to teach any active courses.</div>
            ) : (
                <div style={styles.grid}>
                    {courses.map(course => (
                        <CourseCard
                            key={course._id}
                            course={course}
                            showRosterCount
                            actionSlot={
                                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                    <button style={{ ...styles.btnRoster, flex: 1 }} onClick={() => handleViewRoster(course)}>
                                        Roster
                                    </button>
                                    <button style={styles.btnManage} onClick={() => navigate(`/faculty/courses/${course._id}`)}>
                                        Manage LMS & Syllabus →
                                    </button>
                                </div>
                            }
                        />
                    ))}
                </div>
            )}

            {/* Roster Modal */}
            {selectedCourse && (
                <div style={styles.overlay} onClick={() => setSelectedCourse(null)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>{selectedCourse.code} Roster</h2>
                            <button style={styles.closeBtn} onClick={() => setSelectedCourse(null)}>✕</button>
                        </div>
                        <div style={styles.rosterBody}>
                            {isLoadingRoster ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Loading students...</p>
                            ) : rosterData.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No students enrolled yet.</p>
                            ) : (
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>Roll Number</th>
                                            <th style={styles.th}>Name</th>
                                            <th style={styles.th}>Email</th>
                                            <th style={styles.th}>Dept</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rosterData.map(enr => {
                                            const st = (enr as any).student;
                                            const u = st.user;
                                            return (
                                                <tr key={enr._id} style={styles.tr}>
                                                    <td style={styles.td}><strong>{st.rollNumber}</strong></td>
                                                    <td style={styles.td}>{u.name}</td>
                                                    <td style={{ ...styles.td, color: 'var(--text-muted)' }}>{u.email}</td>
                                                    <td style={styles.td}>{st.department}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1200, margin: '0 auto', fontFamily: "'Inter', sans-serif" },
    header: { marginBottom: '2rem' },
    title: { fontSize: 26, fontWeight: 700, color: 'var(--text-main)', margin: 0 },
    subtitle: { fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' },
    empty: { padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--page-bg)', borderRadius: 12, border: '1px dashed #d1d5db' },
    btnRoster: { width: '100%', padding: '9px 0', background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' },
    btnManage: { flex: 1.5, padding: '9px 12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'center' },
    
    // Modal
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
    modal: { background:'var(--card-bg)', borderRadius: 16, width: '100%', maxWidth: 700, boxShadow: '0 25px 60px rgba(0,0,0,0.2)', overflow: 'hidden', maxHeight: '85vh', display: 'flex', flexDirection: 'column' },
    modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f3f4f6', background: 'var(--page-bg)' },
    modalTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-main)', margin: 0 },
    closeBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' },
    rosterBody: { padding: 0, overflowY: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' },
    th: { padding: '12px 24px', background:'var(--card-bg)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0 },
    tr: { borderBottom: '1px solid #f3f4f6' },
    td: { padding: '12px 24px' }
};

export default FacultyCoursesPage;
