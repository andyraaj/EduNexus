import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DepartmentComparisonChartProps {
    data: { department: string; enrollments: number }[];
}

const COLORS = ['var(--primary)', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

const DepartmentComparisonChart: React.FC<DepartmentComparisonChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No enrollment data found.</div>;
    }

    return (
        <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="45%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="enrollments"
                        nameKey="department"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                        formatter={(value: number) => [`${value} Students`, 'Total Enrolled']}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default DepartmentComparisonChart;
