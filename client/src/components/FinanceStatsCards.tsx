import React from 'react';

interface FinanceStatsCardsProps {
    stats: {
        label: string;
        value: string | number;
        color: string;
        icon: string;
    }[];
}

const FinanceStatsCards: React.FC<FinanceStatsCardsProps> = ({ stats }) => {
    return (
        <div style={styles.grid}>
            {stats.map((stat, idx) => (
                <div key={idx} style={styles.card}>
                    <div style={{ ...styles.iconBox, background: `${stat.color}15`, color: stat.color }}>
                        {stat.icon}
                    </div>
                    <div>
                        <p style={styles.label}>{stat.label}</p>
                        <h3 style={styles.value}>{stat.value}</h3>
                    </div>
                </div>
            ))}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 32 },
    card: { background:'var(--card-bg)', padding: '24px', borderRadius: 12, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    iconBox: { width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 },
    label: { margin: '0 0 4px', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' },
    value: { margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-main)' }
};

export default FinanceStatsCards;
