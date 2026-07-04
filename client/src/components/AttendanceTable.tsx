import React from 'react';
import type { StudentAttendanceSummary, StudentAttendanceHistory } from '@/services/attendanceService';

interface StudentAttendanceTableProps {
    summary: StudentAttendanceSummary[];
    history: StudentAttendanceHistory[];
}

export const StudentAttendanceTable: React.FC<StudentAttendanceTableProps> = ({ summary, history }) => {
    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h3 style={styles.title}>Summary by Course</h3>
                <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Course</th>
                                <th style={{ ...styles.th, textAlign: 'center' }}>Present</th>
                                <th style={{ ...styles.th, textAlign: 'center' }}>Absent</th>
                                <th style={{ ...styles.th, textAlign: 'center' }}>Late</th>
                                <th style={{ ...styles.th, textAlign: 'right' }}>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.length === 0 ? (
                                <tr><td colSpan={5} style={styles.empty}>No attendance records found.</td></tr>
                            ) : summary.map(s => (
                                <tr key={s.course._id} style={styles.tr}>
                                    <td style={styles.td}>
                                        <div style={{ fontWeight: 600 }}>{s.course.code}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.course.title}</div>
                                    </td>
                                    <td style={{ ...styles.td, textAlign: 'center', color: '#059669' }}>{s.present}</td>
                                    <td style={{ ...styles.td, textAlign: 'center', color: '#dc2626' }}>{s.absent}</td>
                                    <td style={{ ...styles.td, textAlign: 'center', color: '#d97706' }}>{s.late}</td>
                                    <td style={{ ...styles.td, textAlign: 'right' }}>
                                        <span style={{
                                            ...styles.badge,
                                            background: s.percentage >= 75 ? '#d1fae5' : s.percentage >= 60 ? '#fef3c7' : '#fee2e2',
                                            color: s.percentage >= 75 ? '#047857' : s.percentage >= 60 ? '#b45309' : '#b91c1c'
                                        }}>
                                            {s.percentage}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={styles.card}>
                <h3 style={styles.title}>Recent History</h3>
                <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Date</th>
                                <th style={styles.th}>Course</th>
                                <th style={styles.th}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length === 0 ? (
                                <tr><td colSpan={3} style={styles.empty}>No recent history.</td></tr>
                            ) : history.slice(0, 15).map((h, i) => (
                                <tr key={i} style={styles.tr}>
                                    <td style={styles.td}>{new Date(h.date).toLocaleDateString()}</td>
                                    <td style={styles.td}>{h.course.code}</td>
                                    <td style={styles.td}>
                                        <StatusBadge status={h.status} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    let bg = 'var(--border-color)', color = 'var(--text-main)';
    if (status === 'present') { bg = '#d1fae5'; color = '#047857'; }
    else if (status === 'absent') { bg = '#fee2e2'; color = '#b91c1c'; }
    else if (status === 'late') { bg = '#fef3c7'; color = '#b45309'; }
    else if (status === 'excused') { bg = '#e0e7ff'; color = 'var(--primary-dark)'; }

    return (
        <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, textTransform: 'capitalize', background: bg, color }}>
            {status}
        </span>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', gap: '2rem' },
    card: { background:'var(--card-bg)', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' },
    title: { fontSize: 16, fontWeight: 700, color: 'var(--text-main)', margin: '0 0 1rem' },
    tableWrapper: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 14, textAlign: 'left' },
    th: { padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '2px solid #e5e7eb' },
    tr: { borderBottom: '1px solid #f3f4f6' },
    td: { padding: '12px 16px', color: 'var(--text-main)', verticalAlign: 'middle' },
    empty: { padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' },
    badge: { padding: '4px 8px', borderRadius: 6, fontWeight: 700 }
};

export default StudentAttendanceTable;
