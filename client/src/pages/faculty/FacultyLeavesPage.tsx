import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMyLeaves, applyForLeave, LeaveRequest } from '@/services/facultyAddonsService';
import { Calendar, FileText, Send, UserCheck, AlertCircle, Clock } from 'lucide-react';

const FacultyLeavesPage: React.FC = () => {
    const { accessToken } = useAuth();
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [leaveType, setLeaveType] = useState<string>('casual');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [arrangement, setArrangement] = useState('');

    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3000);
    };

    const loadLeaves = async () => {
        if (!accessToken) return;
        setIsLoading(true);
        try {
            const res = await fetchMyLeaves(accessToken);
            setLeaves(res.leaves || []);
        } catch (e: any) {
            showToast(e.message || 'Failed to fetch leave history.', false);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadLeaves();
    }, [accessToken]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) return;
        if (new Date(startDate) > new Date(endDate)) {
            showToast('Start date cannot be after end date.', false);
            return;
        }
        setIsSubmitting(true);
        try {
            await applyForLeave(accessToken, {
                leaveType,
                startDate,
                endDate,
                reason,
                alternativeClassArrangement: arrangement,
            });
            showToast('✅ Leave request submitted successfully.');
            setStartDate('');
            setEndDate('');
            setReason('');
            setArrangement('');
            loadLeaves();
        } catch (e: any) {
            showToast(e.message || 'Failed to submit leave request.', false);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate dynamic leave stats for premium widgets
    const pendingCount = leaves.filter(l => l.status === 'pending').length;
    const approvedCount = leaves.filter(l => l.status === 'approved').length;
    const casualCount = leaves.filter(l => l.leaveType === 'casual' && l.status === 'approved').length;

    return (
        <div style={styles.page}>
            {toast && (
                <div style={{
                    ...styles.toast,
                    background: toast.ok ? 'var(--toast-success-bg, #d1fae5)' : 'var(--toast-error-bg, #fee2e2)',
                    color: toast.ok ? '#065f46' : '#991b1b',
                    borderColor: toast.ok ? '#6ee7b7' : '#fca5a5'
                }}>
                    {toast.msg}
                </div>
            )}

            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Faculty Leave Management</h1>
                    <p style={styles.subtitle}>Apply for dynamic leaves and coordinate class re-arrangements seamlessly.</p>
                </div>
            </div>

            {/* Premium Leaves Metric Cards */}
            <div style={styles.metricsGrid}>
                <div style={{ ...styles.metricCard, borderLeft: '4px solid #f59e0b' }}>
                    <div style={styles.metricIconWrap}><Clock size={20} color="#f59e0b" /></div>
                    <div>
                        <div style={styles.metricLabel}>Pending Requests</div>
                        <div style={styles.metricVal}>{pendingCount}</div>
                    </div>
                </div>
                <div style={{ ...styles.metricCard, borderLeft: '4px solid #10b981' }}>
                    <div style={styles.metricIconWrap}><UserCheck size={20} color="#10b981" /></div>
                    <div>
                        <div style={styles.metricLabel}>Approved Leaves</div>
                        <div style={styles.metricVal}>{approvedCount}</div>
                    </div>
                </div>
                <div style={{ ...styles.metricCard, borderLeft: '4px solid #3b82f6' }}>
                    <div style={styles.metricIconWrap}><Calendar size={20} color="#3b82f6" /></div>
                    <div>
                        <div style={styles.metricLabel}>Total Approved Casual Days</div>
                        <div style={styles.metricVal}>{casualCount}</div>
                    </div>
                </div>
            </div>

            <div style={styles.mainGrid}>
                {/* Apply Form */}
                <div style={styles.formCard}>
                    <h2 style={styles.cardTitle}>📜 New Leave Application</h2>
                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Leave Type *</label>
                                <select style={styles.select} value={leaveType} onChange={e => setLeaveType(e.target.value)}>
                                    <option value="casual">Casual Leave (CL)</option>
                                    <option value="sick">Sick Leave (SL)</option>
                                    <option value="earned">Earned Leave (EL)</option>
                                    <option value="maternity">Maternity Leave</option>
                                    <option value="paternity">Paternity Leave</option>
                                </select>
                            </div>
                        </div>

                        <div style={styles.formRow}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Start Date *</label>
                                <input required type="date" style={styles.input} value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>End Date *</label>
                                <input required type="date" style={styles.input} value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Reason for Leave *</label>
                            <textarea required placeholder="Specify details..." style={styles.textarea} value={reason} onChange={e => setReason(e.target.value)} />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Alternative Class Arrangement (Batch, Time, Faculty Name)</label>
                            <input placeholder="e.g. CS601 shifted to Tue 2PM with Prof. Sarah" style={styles.input} value={arrangement} onChange={e => setArrangement(e.target.value)} />
                        </div>

                        <button type="submit" disabled={isSubmitting} style={styles.submitBtn}>
                            <Send size={15} />
                            <span>{isSubmitting ? 'Submitting Application...' : 'Submit Application'}</span>
                        </button>
                    </form>
                </div>

                {/* History List */}
                <div style={styles.historyCard}>
                    <h2 style={styles.cardTitle}>📊 Leave History & Status</h2>
                    {isLoading ? (
                        <div style={styles.emptyState}>Compiling leave history...</div>
                    ) : leaves.length === 0 ? (
                        <div style={styles.emptyState}>
                            <AlertCircle size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                            <p style={{ margin: 0 }}>No leave applications registered yet.</p>
                        </div>
                    ) : (
                        <div style={styles.leavesList}>
                            {leaves.map(leave => (
                                <div key={leave._id} style={styles.leaveItem}>
                                    <div style={styles.leaveHeader}>
                                        <span style={styles.leaveTypeBadge}>
                                            {leave.leaveType.toUpperCase()}
                                        </span>
                                        <span style={{
                                            ...styles.statusBadge,
                                            background: leave.status === 'approved' ? '#d1fae5' : leave.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                                            color: leave.status === 'approved' ? '#065f46' : leave.status === 'rejected' ? '#991b1b' : '#92400e',
                                        }}>
                                            {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                                        </span>
                                    </div>
                                    <div style={styles.leaveDates}>
                                        📅 {new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}
                                    </div>
                                    <p style={styles.leaveReason}>
                                        <strong>Reason:</strong> {leave.reason}
                                    </p>
                                    {leave.alternativeClassArrangement && (
                                        <p style={styles.leaveArrange}>
                                            <strong>Arrangement:</strong> {leave.alternativeClassArrangement}
                                        </p>
                                    )}
                                    {leave.comments && (
                                        <div style={styles.leaveComments}>
                                            💬 <strong>Feedback:</strong> {leave.comments}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1300, margin: '0 auto', fontFamily: "'Inter', sans-serif" },
    header: { marginBottom: '2rem' },
    title: { fontSize: 26, fontWeight: 800, color: 'var(--text-main)', margin: 0 },
    subtitle: { fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.5 },
    
    // Metrics
    metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: '2rem' },
    metricCard: { display: 'flex', alignItems: 'center', gap: 16, background: 'var(--card-bg, #ffffff)', padding: 20, borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
    metricIconWrap: { width: 42, height: 42, borderRadius: 8, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    metricLabel: { fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
    metricVal: { fontSize: 22, fontWeight: 800, color: 'var(--text-main)', marginTop: 4 },

    mainGrid: { display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 24, alignItems: 'start' },
    formCard: { background: 'var(--card-bg, #ffffff)', border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, boxShadow: '0 4px 10px rgba(0,0,0,0.03)' },
    historyCard: { background: 'var(--card-bg, #ffffff)', border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, boxShadow: '0 4px 10px rgba(0,0,0,0.03)', maxHeight: '70vh', display: 'flex', flexDirection: 'column' },
    cardTitle: { margin: '0 0 20px', fontSize: 17, fontWeight: 700, color: 'var(--text-main)', borderBottom: '1px solid #f1f5f9', paddingBottom: 12 },
    
    form: { display: 'flex', flexDirection: 'column', gap: 16 },
    formRow: { display: 'flex', gap: 16 },
    formGroup: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
    label: { fontSize: 13, fontWeight: 600, color: 'var(--text-main)' },
    input: { padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, background: 'var(--card-bg)', outline: 'none', color: 'var(--text-main)' },
    select: { padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, background: 'var(--card-bg)', outline: 'none', color: 'var(--text-main)' },
    textarea: { padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, background: 'var(--card-bg)', outline: 'none', minHeight: 90, fontFamily: 'inherit', color: 'var(--text-main)' },
    
    submitBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', background: 'var(--primary, #2563eb)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background 0.2s' },
    
    emptyState: { padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 },
    leavesList: { display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1, paddingRight: 4 },
    leaveItem: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#fafbfc', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 6 },
    leaveHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    leaveTypeBadge: { fontSize: 11, fontWeight: 800, padding: '2px 8px', background: '#eff6ff', color: '#1e40af', borderRadius: 4, letterSpacing: '0.05em' },
    statusBadge: { fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6 },
    leaveDates: { fontSize: 13, fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 4 },
    leaveReason: { fontSize: 13, color: 'var(--text-muted)', margin: 0 },
    leaveArrange: { fontSize: 13, color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' },
    leaveComments: { fontSize: 12, color: '#0f172a', background: '#f8fafc', padding: 10, borderRadius: 8, borderLeft: '3px solid #64748b', marginTop: 4 },
    
    toast: { position: 'fixed', top: 20, right: 20, padding: '12px 20px', borderRadius: 10, border: '1px solid', fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }
};

export default FacultyLeavesPage;
