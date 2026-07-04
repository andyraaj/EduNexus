import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAdminAnalytics, AdminAnalytics } from '@/services/analyticsService';
import { showErrorToast } from '@/utils/errorHandler';
import FinanceStatsCards from '@/components/FinanceStatsCards';
import RevenueChart from '@/components/analytics/RevenueChart';
import DepartmentComparisonChart from '@/components/analytics/DepartmentComparisonChart';

/* ── Mock fallback so charts never render empty on a fresh install ── */
const MOCK_REVENUE: { label: string; revenue: number }[] = [
    { label: 'Jan', revenue: 42000 }, { label: 'Feb', revenue: 58000 },
    { label: 'Mar', revenue: 51000 }, { label: 'Apr', revenue: 67000 },
    { label: 'May', revenue: 73000 }, { label: 'Jun', revenue: 89000 },
];
const MOCK_DEPT: { department: string; enrollments: number }[] = [
    { department: 'CS', enrollments: 312 }, { department: 'Math', enrollments: 198 },
    { department: 'Physics', enrollments: 143 }, { department: 'Bio', enrollments: 221 },
];

const AdminDashboard: React.FC = () => {
    const { accessToken } = useAuth();
    const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (!accessToken) return;
        setIsLoading(true);
        setErrorMsg('');
        fetchAdminAnalytics(accessToken)
            .then(setAnalytics)
            .catch(err => {
                const message = showErrorToast(err, 'Failed to load administrative telemetry');
                setErrorMsg(message);
                console.error('[AdminDashboard] Analytics fetch error:', err);
            })
            .finally(() => setIsLoading(false));
    }, [accessToken]);

    if (isLoading) return <div style={styles.loader}>Compiling Organization Telemetry...</div>;

    if (errorMsg) return (
        <div style={styles.errorContainer}>
            <div style={styles.errorIcon}>⚠️</div>
            <h3 style={styles.errorTitle}>Something went wrong</h3>
            <p style={styles.errorText}>Unable to load dashboard data. Please try again later.</p>
            <button style={styles.retryBtn} onClick={() => window.location.reload()}>Retry</button>
        </div>
    );

    if (!analytics) return null;

    const topLevelStats = [
        { label: 'Active Students', value: analytics.totalStudents, color: 'var(--primary)', icon: '👨‍🎓' },
        { label: 'Total Faculty', value: analytics.totalFaculty, color: '#10b981', icon: '👨‍🏫' },
        { label: 'Active Courses', value: analytics.totalCourses, color: '#f59e0b', icon: '📚' },
        { label: 'Pending Dues ($)', value: `$${analytics.pendingDues.toLocaleString()}`, color: '#ef4444', icon: '⏳' },
    ];

    const revenueData = (analytics.revenueTrend && analytics.revenueTrend.length > 0)
        ? analytics.revenueTrend : MOCK_REVENUE;
    const deptData = (analytics.deptPerformance && analytics.deptPerformance.length > 0)
        ? analytics.deptPerformance : MOCK_DEPT;

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h1 style={styles.title}>System Control Center</h1>
                <p style={styles.subtitle}>Elevated privileges: monitoring campus vitals and cashflow trajectories.</p>
            </div>

            <FinanceStatsCards stats={topLevelStats} />

            <div className="chart-grid">
                <div className="erp-card" style={{ padding: 24 }}>
                    <div style={styles.cardHeader}>
                        <h3 style={styles.cardTitle}>Revenue Collection Trajectory</h3>
                        <span style={styles.badgeSuccess}>Total: ${analytics.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="chart-container"><RevenueChart data={revenueData} /></div>
                </div>

                <div className="erp-card" style={{ padding: 24 }}>
                    <div style={styles.cardHeader}>
                        <h3 style={styles.cardTitle}>Department Scale</h3>
                    </div>
                    <div className="chart-container"><DepartmentComparisonChart data={deptData} /></div>
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: { maxWidth: 1400, margin: '0 auto', fontFamily: "'Inter', sans-serif" },
    header: { marginBottom: 32 },
    title: { fontSize: 26, fontWeight: 700, color: 'var(--text-main)', margin: 0 },
    subtitle: { fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' },
    loader: { padding: '4rem', textAlign: 'center', fontSize: 15, color: 'var(--text-muted)' },
    errorContainer: { padding: '5rem 2rem', textAlign: 'center', maxWidth: 400, margin: '0 auto' },
    errorIcon: { fontSize: 48, marginBottom: 16 },
    errorTitle: { fontSize: 20, fontWeight: 700, color: 'var(--text-main)', margin: '0 0 8px' },
    errorText: { fontSize: 14, color: 'var(--text-muted)', margin: '0 0 24px', lineHeight: 1.6 },
    retryBtn: { padding: '10px 24px', background: '#2563eb', color:'var(--card-bg)', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 8 },
    cardTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' },
    badgeSuccess: { background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: 99, fontSize: 13, fontWeight: 700 },
};

export default AdminDashboard;
