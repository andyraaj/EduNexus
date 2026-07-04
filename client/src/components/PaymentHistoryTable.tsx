import React from 'react';
import type { Payment } from '@/services/financeService';
import { generateReceiptPDF } from '@/utils/receiptPdf';
import { Download } from 'lucide-react';

interface PaymentHistoryTableProps {
    payments: Payment[];
    isAdminView?: boolean;
}

const PaymentHistoryTable: React.FC<PaymentHistoryTableProps> = ({ payments, isAdminView }) => {
    if (!payments || payments.length === 0) {
        return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No payments found.</div>;
    }

    const handleDownload = (p: Payment) => {
        generateReceiptPDF({
            transactionId: p.transactionId,
            amount: p.amount,
            paymentDate: p.paymentDate,
            method: p.method,
            studentName: typeof p.student === 'object' ? (p.student?.name || p.student?.user?.name) : undefined,
            invoiceType: typeof p.invoice === 'object' ? p.invoice?.type : undefined,
            invoiceDescription: typeof p.invoice === 'object' ? p.invoice?.description : undefined,
        });
    };

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Date</th>
                        {isAdminView && <th style={styles.th}>Student</th>}
                        <th style={styles.th}>Transaction ID</th>
                        <th style={styles.th}>Method</th>
                        <th style={styles.th}>Amount</th>
                        <th style={styles.th}>Receipt</th>
                    </tr>
                </thead>
                <tbody>
                    {payments.map(p => (
                        <tr key={p._id} style={styles.tr}>
                            <td style={styles.td}>{new Date(p.paymentDate).toLocaleDateString()}</td>
                            {isAdminView && (
                                <td style={styles.td}>{p.student?.name || 'N/A'}</td>
                            )}
                            <td style={styles.td}><span style={styles.txnId}>{p.transactionId}</span></td>
                            <td style={styles.td}>{p.method.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</td>
                            <td style={{ ...styles.td, fontWeight: 600, color: '#16a34a' }}>₹{p.amount.toFixed(2)}</td>
                            <td style={styles.td}>
                                <button
                                    style={styles.downloadBtn}
                                    onClick={() => handleDownload(p)}
                                    title="Download Payment Receipt PDF"
                                >
                                    <Download size={13} style={{ marginRight: 4 }} />
                                    Receipt
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 14, textAlign: 'left' },
    th: { backgroundColor: 'var(--page-bg)', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: 12 },
    tr: { borderBottom: '1px solid #e5e7eb', transition: 'background 0.2s' },
    td: { padding: '16px', color: 'var(--text-main)', verticalAlign: 'middle' },
    txnId: { background: 'var(--border-color)', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' },
    downloadBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        background: 'var(--primary)',
        border: 'none',
        color: '#fff',
        fontWeight: 700,
        cursor: 'pointer',
        fontSize: 12,
        padding: '6px 12px',
        borderRadius: 6,
        transition: 'opacity 0.15s',
    }
};

export default PaymentHistoryTable;
