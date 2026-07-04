import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

const StudentDashboardSimplified: React.FC = () => {
    const { user } = useAuth();

    // Mock data for demonstration
    const stats = [
        { label: '📚 Courses', value: '6' },
        { label: '📅 Attendance', value: '88%' },
        { label: '📊 Avg Grade', value: '85%' },
        { label: '🎯 Quizzes', value: '12' },
    ];

    const courses = [
        { id: '1', code: 'CS601', title: 'Data Structures & Algorithms', credits: 4 },
        { id: '2', code: 'CS602', title: 'Database Systems', credits: 4 },
        { id: '3', code: 'MATH601', title: 'Advanced Calculus', credits: 3 },
        { id: '4', code: 'MATH602', title: 'Linear Algebra', credits: 3 },
    ];

    const timetable = [
        { day: 'Monday', time: '09:00-10:30', course: 'Data Structures', room: 'Room 101' },
        { day: 'Tuesday', time: '11:00-12:30', course: 'Database Systems', room: 'Room 102' },
        { day: 'Wednesday', time: '14:00-15:30', course: 'Advanced Calculus', room: 'Room 103' },
    ];

    const attendance = [
        { course: 'Data Structures', percentage: 85, attended: 17, total: 20 },
        { course: 'Database Systems', percentage: 92, attended: 18, total: 20 },
        { course: 'Advanced Calculus', percentage: 80, attended: 16, total: 20 },
        { course: 'Linear Algebra', percentage: 88, attended: 17, total: 20 },
    ];

    const announcements = [
        { title: 'Mid-Semester Exams', content: 'Mid-semester exams will start next week. Check your course portals for schedules.' },
        { title: 'Library Extended Hours', content: 'Library will remain open until 10 PM during exam season.' },
        { title: 'New Lab Equipment', content: 'New lab equipment has been installed in Labs 2 and 3.' },
    ];

    const grades = [
        { course: 'Data Structures', type: 'Midterm', score: '75/100', percentage: '75%' },
        { course: 'Database Systems', type: 'Quiz', score: '18/20', percentage: '90%' },
        { course: 'Advanced Calculus', type: 'Assignment', score: '35/40', percentage: '87.5%' },
        { course: 'Linear Algebra', type: 'Quiz', score: '19/20', percentage: '95%' },
    ];

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
                    <p style={styles.subtitle}>Here's your academic overview for this semester.</p>
                </div>
            </div>

            {/* Quick Stats */}
            <div style={styles.statsGrid}>
                {stats.map((stat, idx) => (
                    <div key={idx} style={styles.statCard}>
                        <div style={styles.statLabel}>{stat.label}</div>
                        <div style={styles.statValue}>{stat.value}</div>
                    </div>
                ))}
            </div>

            <div style={styles.mainGrid}>
                {/* Left Column */}
                <div>
                    {/* Enrolled Courses */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>📚 Your Courses</h2>
                        <div style={styles.coursesList}>
                            {courses.map(course => (
                                <div key={course.id} style={styles.courseCard}>
                                    <div>
                                        <h3 style={styles.courseName}>{course.title}</h3>
                                        <p style={styles.courseCode}>{course.code} • {course.credits} Credits</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Week Schedule */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>⏰ This Week's Schedule</h2>
                        <div style={styles.timetableList}>
                            {timetable.map((slot, idx) => (
                                <div key={idx} style={styles.timetableItem}>
                                    <div style={styles.dayBadge}>{slot.day.substring(0, 3)}</div>
                                    <div style={styles.slotInfo}>
                                        <strong>{slot.time}</strong>
                                        <p>{slot.course}</p>
                                        <small style={styles.grey}>{slot.room}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div>
                    {/* Announcements */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>📢 Latest Announcements</h2>
                        <div style={styles.announcementsList}>
                            {announcements.map((announcement, idx) => (
                                <div key={idx} style={styles.announcementItem}>
                                    <h4 style={styles.announcementTitle}>{announcement.title}</h4>
                                    <p style={styles.announcementContent}>{announcement.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Attendance */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>📋 Attendance Overview</h2>
                        <div style={styles.attendanceList}>
                            {attendance.map((att, idx) => (
                                <div key={idx} style={styles.attendanceItem}>
                                    <div style={styles.attendanceHeader}>
                                        <span>{att.course}</span>
                                        <span style={{
                                            backgroundColor: att.percentage >= 75 ? '#10b981' : '#f59e0b',
                                            color:'var(--card-bg)',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                        }}>
                                            {att.percentage}%
                                        </span>
                                    </div>
                                    <div style={styles.progressBar}>
                                        <div style={{
                                            width: `${att.percentage}%`,
                                            height: '100%',
                                            backgroundColor: att.percentage >= 75 ? '#10b981' : '#f59e0b',
                                            borderRadius: '4px',
                                        }} />
                                    </div>
                                    <small style={styles.grey}>{att.attended}/{att.total} classes</small>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Grades Table */}
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>📊 Recent Grades</h2>
                <div style={styles.table}>
                    <div style={styles.tableHeader}>
                        <div>Course</div>
                        <div>Type</div>
                        <div>Score</div>
                        <div>Percentage</div>
                    </div>
                    {grades.map((grade, idx) => (
                        <div key={idx} style={styles.tableRow}>
                            <div>{grade.course}</div>
                            <div>{grade.type}</div>
                            <div>{grade.score}</div>
                            <div style={{ fontWeight: 'bold' }}>{grade.percentage}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: { padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: "'Inter', sans-serif", backgroundColor: 'var(--page-bg)', minHeight: '100vh' },
    header: { marginBottom: '2rem' },
    title: { fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', margin: 0 },
    subtitle: { fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '2rem' },
    statCard: { backgroundColor:'var(--card-bg)', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    statLabel: { fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px' },
    statValue: { fontSize: '24px', fontWeight: 700, color: 'var(--text-main)' },
    mainGrid: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '2rem' },
    section: { backgroundColor:'var(--card-bg)', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px' },
    sectionTitle: { margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' },
    coursesList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    courseCard: { padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'var(--page-bg)' },
    courseName: { fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', margin: 0 },
    courseCode: { fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' },
    timetableList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    timetableItem: { display: 'flex', gap: '12px', padding: '12px', backgroundColor: '#f0f9ff', border: '1px solid #dbeafe', borderRadius: '8px' },
    dayBadge: { backgroundColor: '#3b82f6', color:'var(--card-bg)', width: '50px', height: '50px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' },
    slotInfo: { flex: 1 },
    grey: { color: 'var(--text-muted)', fontSize: '11px' },
    announcementsList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    announcementItem: { padding: '12px', border: '1px solid #fef3c7', borderRadius: '8px', backgroundColor: '#fef9f3' },
    announcementTitle: { fontSize: '13px', fontWeight: 600, color: '#92400e', margin: '0 0 4px' },
    announcementContent: { fontSize: '12px', color: '#78350f', margin: 0 },
    attendanceList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    attendanceItem: { padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' },
    attendanceHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' },
    progressBar: { width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden', marginBottom: '4px' },
    table: { border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' },
    tableHeader: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', backgroundColor: 'var(--border-color)', padding: '12px 16px', fontWeight: 700, fontSize: '12px', color: 'var(--text-main)', borderBottom: '1px solid #e5e7eb' },
    tableRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: '13px', color: 'var(--text-muted)' },
};

export default StudentDashboardSimplified;
