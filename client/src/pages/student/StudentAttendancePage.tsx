import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMyAttendance } from '@/services/attendanceService';
import type { StudentAttendanceData } from '@/services/attendanceService';
import AttendanceChart from '@/components/AttendanceChart';
import StudentAttendanceTable from '@/components/AttendanceTable';

const StudentAttendancePage: React.FC = () => {
    const { accessToken } = useAuth();
    const [data, setData] = useState<StudentAttendanceData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!accessToken) return;
        const load = async () => {
            try {
                const res = await fetchMyAttendance(accessToken);
                setData(res);
            } catch (e: any) {
                setError(e.message || 'Failed to load attendance');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [accessToken]);

    if (isLoading) return <div style={styles.loading}>Loading attendance records...</div>;
    if (error) return <div style={styles.error}>{error}</div>;
    if (!data) return null;

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h1 style={styles.title}>My Attendance</h1>
                <p style={styles.subtitle}>Track your class participation and attendance history</p>
            </div>

            <div style={styles.grid}>
                {/* Left Col: Chart & Stats */}
                <div style={styles.leftCol}>
                    <AttendanceChart summary={data.summary} />
                    
                    <div style={styles.infoCard}>
                        <h4 style={styles.infoTitle}>University Policy</h4>
                        <p style={styles.infoText}>
                            Students are required to maintain a minimum of <strong>75%</strong> attendance in each course to be eligible for end-semester examinations.
                        </p>
                    </div>
                </div>

                {/* Right Col: Tables (Summary & History) */}
                <div style={styles.rightCol}>
                    <StudentAttendanceTable summary={data.summary} history={data.history} />
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1200, margin: '0 auto', fontFamily: "'Inter', sans-serif" },
    header: { marginBottom: '2rem' },
    title: { fontSize: 26, fontWeight: 700, color: 'var(--text-main)', margin: 0 },
    subtitle: { fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' },
    grid: { display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' },
    leftCol: { flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '2rem' },
    rightCol: { flex: '2 1 600px', width: '100%' },
    loading: { padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' },
    error: { padding: '2rem', color: '#b91c1c', background: '#fee2e2', borderRadius: 8, margin: '2rem' },
    infoCard: { background: 'var(--page-bg)', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.5rem' },
    infoTitle: { margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' },
    infoText: { margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }
};

export default StudentAttendancePage;
