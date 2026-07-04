import React from 'react';
import type { Course } from '@/services/courseService';
import { getFacultyDisplayName, getDepartmentDisplayName } from '@/services/courseService';

interface CourseCardProps {
    course: Course;
    /** For students: enrollment button */
    actionSlot?: React.ReactNode;
    /** Show enrolled count badge if provided (faculty/admin) */
    showRosterCount?: boolean;
}

const DEPT_COLORS: Record<string, string> = {
    'Computer Science': 'var(--primary-light)',
    'Mathematics': '#0ea5e9',
    'Physics': '#f59e0b',
    'Chemistry': '#10b981',
    'Electronics': '#ef4444',
    'Mechanical': '#8b5cf6',
};

const deptColor = (dept: string) => DEPT_COLORS[dept] ?? 'var(--primary-light)';

const CourseCard: React.FC<CourseCardProps> = ({ course, actionSlot, showRosterCount }) => {
    const deptName = getDepartmentDisplayName(course);
    const color = deptColor(deptName);
    const facultyName = getFacultyDisplayName(course);

    return (
        <div style={{ ...styles.card, borderTop: `4px solid ${color}` }}>
            {/* Header */}
            <div style={styles.cardHeader}>
                <span style={{ ...styles.codeChip, background: color + '18', color }}>{course.code}</span>
                <span style={{ ...styles.semBadge }}>Sem {course.semester}</span>
            </div>

            {/* Title */}
            <h3 style={styles.title}>{course.title}</h3>
            <p style={styles.dept}>{deptName}</p>

            {/* Description */}
            {course.description && (
                <p style={styles.desc}>{course.description.slice(0, 90)}{course.description.length > 90 ? '...' : ''}</p>
            )}

            {/* Stats row */}
            <div style={styles.statsRow}>
                <StatChip icon="📚" value={`${course.credits} credits`} />
                <StatChip icon="👨‍🏫" value={facultyName} />
                {showRosterCount && course.enrolledCount !== undefined && (
                    <StatChip icon="👥" value={`${course.enrolledCount} enrolled`} />
                )}
            </div>

            {/* Bottom action */}
            {actionSlot && <div style={styles.actionSlot}>{actionSlot}</div>}

            {/* Inactive overlay */}
            {!course.isActive && (
                <div style={styles.inactiveOverlay}>Inactive</div>
            )}
        </div>
    );
};

const StatChip: React.FC<{ icon: string; value: string }> = ({ icon, value }) => (
    <span style={styles.chip}>{icon} {value}</span>
);

const styles: Record<string, React.CSSProperties> = {
    card: { background:'var(--card-bg)', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', overflow: 'hidden', transition: 'box-shadow 0.2s, transform 0.15s' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    codeChip: { padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' },
    semBadge: { fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 },
    title: { fontSize: 16, fontWeight: 700, color: 'var(--text-main)', margin: 0, lineHeight: 1.4 },
    dept: { fontSize: 12, color: 'var(--text-muted)', margin: 0 },
    desc: { fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 },
    statsRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    chip: { fontSize: 12, color: 'var(--text-main)', background: 'var(--page-bg)', border: '1px solid #e5e7eb', borderRadius: 6, padding: '3px 8px' },
    actionSlot: { marginTop: 8 },
    inactiveOverlay: { position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#ef4444', backdropFilter: 'blur(2px)', borderRadius: 12 },
};

export default CourseCard;
