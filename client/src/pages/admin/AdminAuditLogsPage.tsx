import React, { useEffect, useState } from 'react';
import { Activity, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

interface AuditLog {
    _id: string;
    actor: { name?: string; email?: string; role?: string } | null;
    actorRole: string;
    action: string;
    category: string;
    method: string;
    path: string;
    statusCode: number;
    ip: string;
    requestId: string;
    requestSummary?: Record<string, unknown> | null;
    createdAt: string;
}

const AdminAuditLogsPage: React.FC = () => {
    const { accessToken } = useAuth();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!accessToken) return;
        setIsLoading(true);
        api.get<{ logs: AuditLog[] }>('/audit-logs?limit=150', accessToken)
            .then((res) => setLogs(res.logs || []))
            .catch((err) => setError(err?.message || 'Unable to load audit logs.'))
            .finally(() => setIsLoading(false));
    }, [accessToken]);

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Audit Logs</h1>
                    <p style={styles.subtitle}>Operational trail for sensitive changes across the platform.</p>
                </div>
                <div style={styles.badge}><ShieldCheck size={18} /> Admin only</div>
            </div>

            <div style={styles.panel}>
                {isLoading ? (
                    <div style={styles.state}>Loading audit trail...</div>
                ) : error ? (
                    <div style={styles.state}>{error}</div>
                ) : logs.length === 0 ? (
                    <div style={styles.state}>No audit entries recorded yet.</div>
                ) : (
                    <div style={styles.tableWrap}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Time</th>
                                    <th style={styles.th}>Actor</th>
                                    <th style={styles.th}>Action</th>
                                    <th style={styles.th}>Status</th>
                                    <th style={styles.th}>Request</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log._id}>
                                        <td style={styles.td}>{new Date(log.createdAt).toLocaleString()}</td>
                                        <td style={styles.td}>
                                            <strong>{log.actor?.name || log.actorRole}</strong>
                                            <span style={styles.muted}>{log.actor?.email || log.ip || 'system'}</span>
                                        </td>
                                        <td style={styles.td}>
                                            <span style={styles.method}>{log.method}</span>
                                            <span>{log.path}</span>
                                            <span style={styles.muted}>{log.category}</span>
                                            {log.requestSummary && <span style={styles.muted}>{Object.keys(log.requestSummary).join(', ')}</span>}
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{ ...styles.status, ...(log.statusCode >= 400 ? styles.statusBad : styles.statusOk) }}>
                                                {log.statusCode}
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            <span style={styles.requestId}><Activity size={13} /> {log.requestId || 'n/a'}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1180, margin: '0 auto' },
    header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 },
    title: { margin: 0, fontSize: 28, fontWeight: 900, color: 'var(--text-main)' },
    subtitle: { margin: '6px 0 0', fontSize: 14, color: 'var(--text-muted)' },
    badge: { display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #bfdbfe', color: '#1d4ed8', background: '#dbeafe', borderRadius: 8, padding: '9px 12px', fontWeight: 900, fontSize: 13 },
    panel: { background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' },
    tableWrap: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: 920 },
    th: { textAlign: 'left', padding: '12px 14px', background: 'var(--page-bg)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', fontWeight: 900 },
    td: { padding: '13px 14px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: 13, verticalAlign: 'top' },
    muted: { display: 'block', marginTop: 3, color: 'var(--text-muted)', fontSize: 12 },
    method: { display: 'inline-block', minWidth: 56, marginRight: 8, fontWeight: 900, color: '#1d4ed8' },
    status: { borderRadius: 999, padding: '3px 8px', fontWeight: 900, fontSize: 12 },
    statusOk: { color: '#166534', background: '#dcfce7' },
    statusBad: { color: '#991b1b', background: '#fee2e2' },
    requestId: { display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12 },
    state: { padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' },
};

export default AdminAuditLogsPage;
