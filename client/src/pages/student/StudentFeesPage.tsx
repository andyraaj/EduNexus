import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMyDues, fetchMyPaymentHistory, processPayment, Invoice, Payment } from '@/services/financeService';
import FinanceStatsCards from '@/components/FinanceStatsCards';
import InvoiceCard from '@/components/InvoiceCard';
import PaymentHistoryTable from '@/components/PaymentHistoryTable';
import PaymentForm from '@/components/PaymentForm';

const StudentFeesPage: React.FC = () => {
    const { accessToken } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);

    const loadData = async () => {
        if (!accessToken) return;
        setIsLoading(true);
        try {
            const [invRes, payRes] = await Promise.all([
                fetchMyDues(accessToken),
                fetchMyPaymentHistory(accessToken)
            ]);
            setInvoices(invRes.invoices);
            setPayments(payRes.payments);
        } catch (e) {
            console.error('Failed fetching dues data:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [accessToken]);

    const handleProcessPayment = async (amount: number, method: string, txnId: string) => {
        if (!accessToken || !activeInvoice) return;
        await processPayment(accessToken, activeInvoice._id, amount, method, txnId);
        setActiveInvoice(null);
        await loadData(); // refresh the view showing updated pending amounts & history lists
    };

    const pendingTotal = invoices.filter(i => i.status !== 'paid_full').reduce((sum, inv) => sum + (inv.amountDue - inv.amountPaid), 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    const stats = [
        { label: 'Total Pending Dues', value: `₹${pendingTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#ef4444', icon: '⚠' },
        { label: 'Total Paid', value: `₹${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#10b981', icon: '✓' },
    ];

    if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading Fees...</div>;

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-main)' }}>My Fees & Dues</h1>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>Manage your campus financial obligations and view receipts.</p>
            </div>

            <FinanceStatsCards stats={stats} />

            <div style={styles.splitLayout}>
                {/* Left side: Pending & Due Invoices */}
                <div style={{ flex: 1, minWidth: 320 }}>
                    <h3 style={styles.sectionTitle}>Active Invoices</h3>
                    {invoices.length === 0 ? (
                        <div style={styles.empty}>Zero dues pending! 🎉</div>
                    ) : (
                        <div style={{ display: 'grid', gap: 16 }}>
                            {invoices.map(inv => (
                                <InvoiceCard 
                                    key={inv._id} 
                                    invoice={inv} 
                                    onPay={setActiveInvoice} 
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Right side: Payment History Table */}
                <div style={{ flex: 2, minWidth: 500 }}>
                    <div style={styles.tableCard}>
                        <h3 style={styles.sectionTitle}>Payment History</h3>
                        <PaymentHistoryTable payments={payments} />
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {activeInvoice && (
                <PaymentForm 
                    invoice={activeInvoice} 
                    onSubmit={handleProcessPayment}
                    onCancel={() => setActiveInvoice(null)}
                />
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1200, margin: '0 auto', fontFamily: "'Inter', sans-serif" },
    header: { marginBottom: 32 },
    splitLayout: { display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' },
    sectionTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-main)', margin: '0 0 16px' },
    empty: { padding: '24px', background: 'var(--page-bg)', borderRadius: 8, border: '1px dashed #d1d5db', textAlign: 'center', color: 'var(--text-muted)' },
    tableCard: { background:'var(--card-bg)', padding: 24, borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
};

export default StudentFeesPage;
