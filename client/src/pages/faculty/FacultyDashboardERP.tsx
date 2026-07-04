import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

const FacultyDashboardERP: React.FC = () => {
    const { user } = useAuth();

    const stats = [
        { label: '📚 Courses', value: '3' },
        { label: '👥 Total Students', value: '42' },
        { label: '📊 Class Avg', value: '82%' },
        { label: '📝 Quizzes', value: '8' },
    ];

    const coursesTaught = [
        { id: '1', code: 'CS601', title: 'Data Structures & Algorithms', students: 14 },
        { id: '2', code: 'CS602', title: 'Database Systems', students: 14 },
        { id: '3', code: 'PHYS601', title: 'Quantum Mechanics', students: 14 },
    ];

    const schedule = [
        { day: 'Monday', time: '09:00-10:30', course: 'Data Structures', room: 'Room 101' },
        { day: 'Tuesday', time: '11:00-12:30', course: 'Database Systems', room: 'Room 102' },
        { day: 'Wednesday', time: '14:00-15:30', course: 'Quantum Mechanics', room: 'Lab 1' },
        { day: 'Friday', time: '10:00-11:30', course: 'Data Structures', room: 'Room 101' },
    ];

    const studentGrades = [
        { course: 'Data Structures', average: '82%', highest: '95%', lowest: '68%' },
        { course: 'Database Systems', average: '85%', highest: '98%', lowest: '72%' },
        { course: 'Quantum Mechanics', average: '78%', highest: '92%', lowest: '65%' },
    ];

    const recentStudents = [
        { name: 'Student 1', email: 'student1@EduNexus.edu', status: 'enrolled' },
        { name: 'Student 2', email: 'student2@EduNexus.edu', status: 'enrolled' },
        { name: 'Student 3', email: 'student3@EduNexus.edu', status: 'enrolled' },
        { name: 'Student 4', email: 'student4@EduNexus.edu', status: 'enrolled' },
        { name: 'Student 5', email: 'student5@EduNexus.edu', status: 'enrolled' },
    ];

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Welcome, Prof. {user?.name}! 👨‍🏫</h1>
                    <p style={styles.subtitle}>Manage your courses and students</p>
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
                    {/* Courses Taught */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>📚 Courses You Teach</h2>
                        <div style={styles.coursesList}>
                            {coursesTaught.map(course => (
                                <div key={course.id} style={styles.courseCard}>
                                    <div>
                                        <h3 style={styles.courseName}>{course.title}</h3>
                                        <p style={styles.courseCode}>{course.code} • {course.students} students</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <button style={styles.actionButton}>Manage</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Weekly Schedule */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>⏰ This Week's Classes</h2>
                        <div style={styles.timetableList}>
                            {schedule.map((slot, idx) => (
                                <div key={idx} style={styles.timetableItem}>
                                    <div style={styles.dayBadge}>{slot.day.substring(0, 3)}</div>
                                    <div style={styles.slotInfo}>
                                        <strong>{slot.time}</strong>
                                        <p style={styles.slotCourse}>{slot.course}</p>
                                        <small style={styles.grey}>{slot.room}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div>
                    {/* Grade Distribution */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>📊 Student Grades by Course</h2>
                        <div style={styles.gradesList}>
                            {studentGrades.map((grade, idx) => (
                                <div key={idx} style={styles.gradeCard}>
                                    <h4 style={styles.courseNameSmall}>{grade.course}</h4>
                                    <div style={styles.gradeRow}>
                                        <span>Average:</span>
                                        <strong style={{ color: '#3b82f6' }}>{grade.average}</strong>
                                    </div>
                                    <div style={styles.gradeRow}>
                                        <span>Highest:</span>
                                        <strong style={{ color: '#10b981' }}>{grade.highest}</strong>
                                    </div>
                                    <div style={styles.gradeRow}>
                                        <span>Lowest:</span>
                                        <strong style={{ color: '#ef4444' }}>{grade.lowest}</strong>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Students */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>👥 Recent Students</h2>
                        <div style={styles.studentsList}>
                            {recentStudents.map((student, idx) => (
                                <div key={idx} style={styles.studentItem}>
                                    <div>
                                        <p style={styles.studentName}>{student.name}</p>
                                        <small style={styles.grey}>{student.email}</small>
                                    </div>
                                    <span style={styles.badge}>{student.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
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
    mainGrid: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' },
    section: { backgroundColor:'var(--card-bg)', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px' },
    sectionTitle: { margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' },
    coursesList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    courseCard: { padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'var(--page-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    courseName: { fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', margin: 0 },
    courseCode: { fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' },
    actionButton: { padding: '6px 12px', backgroundColor: '#3b82f6', color:'var(--card-bg)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 },
    timetableList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    timetableItem: { display: 'flex', gap: '12px', padding: '12px', backgroundColor: '#f0f9ff', border: '1px solid #dbeafe', borderRadius: '8px' },
    dayBadge: { backgroundColor: '#3b82f6', color:'var(--card-bg)', width: '50px', height: '50px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' },
    slotInfo: { flex: 1 },
    slotCourse: { fontSize: '13px', color: 'var(--text-main)', margin: '4px 0' },
    grey: { color: 'var(--text-muted)', fontSize: '11px' },
    gradesList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    gradeCard: { padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fafbfc' },
    courseNameSmall: { fontSize: '13px', fontWeight: 600, margin: '0 0 8px', color: 'var(--text-main)' },
    gradeRow: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' },
    studentsList: { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' },
    studentItem: { padding: '12px', border: '1px solid #e5e7eb', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    studentName: { fontSize: '13px', fontWeight: 600, margin: 0, color: 'var(--text-main)' },
    badge: { backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 },
};

export default FacultyDashboardERP;
