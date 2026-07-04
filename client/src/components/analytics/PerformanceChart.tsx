import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PerformanceData {
    [key: string]: string | number;
}

interface PerformanceChartProps {
    data: PerformanceData[];
    dataKey: string;
    nameKey: string;
    fillColor?: string;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, dataKey, nameKey, fillColor = '#10b981' }) => {
    if (!data || data.length === 0) {
        return <div style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No performance data available.</div>;
    }

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey={nameKey} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} domain={[0, 100]} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                        formatter={(value: number) => [`${Math.round(value)}%`, 'Rate']}
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    />
                    <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => {
                            const value = typeof entry[dataKey] === 'number' ? entry[dataKey] : Number(entry[dataKey]);
                            return <Cell key={`cell-${index}`} fill={value < 50 ? '#ef4444' : fillColor} />;
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PerformanceChart;
