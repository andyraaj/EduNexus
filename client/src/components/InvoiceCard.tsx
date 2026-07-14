import React from 'react';
import type { Invoice } from '@/services/financeService';

interface InvoiceCardProps {
    invoice: Invoice;
    onPay?: (invoice: Invoice) => void;
    isAdminView?: boolean;
}

const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoice, onPay, isAdminView }) => {
    const isPaid = invoice.status === 'paid_full';
    const amountRemaining = invoice.amountDue - invoice.amountPaid;

    const renderStatusBadge = () => {
        switch (invoice.status) {
            case 'paid_full': return <span style={{ ...styles.badge, ...styles.badgeSuccess }}>Paid</span>;
            case 'paid_partial': return <span style={{ ...styles.badge, ...styles.badgeWarning }}>Partial</span>;
            default: return <span style={{ ...styles.badge, ...styles.badgeDanger }}>Pending</span>;
        }
    };

    return (
        <div style={styles.card}>
            <div style={styles.header}>
                <div>
                    <h4 style={styles.title}>{invoice.type.replace('_', ' ').toUpperCase()}</h4>
                    <p style={styles.subtitle}>{new Date(invoice.dueDate).toLocaleDateString()}</p>
                </div>
                {renderStatusBadge()}
            </div>
            
            <div style={styles.body}>
                {isAdminView && invoice.student && (
                    <p style={styles.studentInfo}>
                        <strong>Student:</strong> {invoice.student.name || 'Unknown'} ({invoice.student.email || ''})
                    </p>
                )}
                {invoice.description && <p style={styles.desc}>{invoice.description}</p>}
                
                <div style={styles.amountRow}>
                    <span style={styles.label}>Total:</span>
                    <span style={styles.value}>₹{invoice.amountDue.toFixed(2)}</span>
                </div>
                {invoice.amountPaid > 0 && (
                    <div style={styles.amountRow}>
                        <span style={styles.label}>Paid:</span>
                        <span style={styles.valueSuccess}>₹{invoice.amountPaid.toFixed(2)}</span>
                    </div>
                )}
                <div style={{ ...styles.amountRow, borderTop: '1px solid #e5e7eb', paddingTop: 8, marginTop: 8 }}>
                    <span style={styles.labelDark}>Remaining:</span>
                    <span style={styles.valueDanger}>₹{amountRemaining.toFixed(2)}</span>
                </div>
            </div>

            {onPay && !isPaid && (
                <div style={styles.footer}>
                    <button style={styles.payBtn} onClick={() => onPay(invoice)}>
                        Pay Now
                    </button>
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    card: { background:'var(--card-bg)', borderRadius: 12, border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    header: { padding: '16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--page-bg)' },
    title: { margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-main)' },
    subtitle: { margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' },
    badge: { padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' },
    badgeSuccess: { background: '#dcfce7', color: '#166534' },
    badgeWarning: { background: '#fef08a', color: '#854d0e' },
    badgeDanger: { background: '#fee2e2', color: '#991b1b' },
    body: { padding: '16px', flex: 1 },
    studentInfo: { margin: '0 0 12px', fontSize: 13, color: 'var(--text-main)' },
    desc: { margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' },
    amountRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 },
    label: { fontSize: 14, color: 'var(--text-muted)' },
    labelDark: { fontSize: 14, color: 'var(--text-main)', fontWeight: 600 },
    value: { fontSize: 14, color: 'var(--text-main)', fontWeight: 600 },
    valueSuccess: { fontSize: 14, color: '#16a34a', fontWeight: 600 },
    valueDanger: { fontSize: 14, color: '#dc2626', fontWeight: 700 },
    footer: { padding: '16px', background: 'var(--page-bg)', borderTop: '1px solid #f3f4f6' },
    payBtn: { width: '100%', padding: '10px', background: 'var(--primary)', color:'var(--card-bg)', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }
};

export default InvoiceCard;
