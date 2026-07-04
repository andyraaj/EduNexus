import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AttendanceData {
    date: string;
    presentCount: number;
    totalStudents: number;
    [key: string]: string | number;
}

interface AttendanceTrendChartProps {
    data: AttendanceData[];
}

const AttendanceTrendChart: React.FC<AttendanceTrendChartProps> = ({ data }) => {
    // Format the date for the XAxis
    const formattedData = data.map(d => ({
        ...d,
        displayDate: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }));

    if (!data || data.length === 0) {
        return <div style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No attendance data available.</div>;
    }

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <LineChart data={formattedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                        formatter={(value: number, name: string) => [value, name === 'presentCount' ? 'Students Present' : name]}
                        labelStyle={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}
                    />
                    <Line type="monotone" dataKey="presentCount" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 2, stroke:'var(--card-bg)' }} activeDot={{ r: 6 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default AttendanceTrendChart;
