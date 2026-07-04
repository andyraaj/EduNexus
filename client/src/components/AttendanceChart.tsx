import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { StudentAttendanceSummary } from '@/services/attendanceService';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', 'var(--primary-light)'];

interface AttendanceChartProps {
    summary: StudentAttendanceSummary[];
}

const AttendanceChart: React.FC<AttendanceChartProps> = ({ summary }) => {
    // Aggregate all courses
    const aggregated = summary.reduce(
        (acc, curr) => {
            acc.present += curr.present;
            acc.absent += curr.absent;
            acc.late += curr.late;
            acc.excused += curr.excused;
            return acc;
        },
        { present: 0, absent: 0, late: 0, excused: 0 }
    );

    const data = [
        { name: 'Present', value: aggregated.present },
        { name: 'Absent', value: aggregated.absent },
        { name: 'Late', value: aggregated.late },
        { name: 'Excused', value: aggregated.excused },
    ].filter(d => d.value > 0);

    if (data.length === 0) {
        return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No attendance data available yet.</div>;
    }

    const total = data.reduce((sum, item) => sum + item.value, 0);
    const overallPct = Math.round((aggregated.present + aggregated.late) / total * 100);

    return (
        <div style={styles.card}>
            <div style={styles.header}>
                <h3 style={styles.title}>Overall Attendance</h3>
                <div style={{ ...styles.badge, background: overallPct >= 75 ? '#d1fae5' : '#fee2e2', color: overallPct >= 75 ? '#047857' : '#b91c1c' }}>
                    {overallPct}% Overall
                </div>
            </div>

            <div style={{ height: 260, width: '100%' }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    card: { background:'var(--card-bg)', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
    title: { fontSize: 16, fontWeight: 700, color: 'var(--text-main)', margin: 0 },
    badge: { padding: '4px 10px', borderRadius: 99, fontSize: 14, fontWeight: 700 }
};

export default AttendanceChart;
