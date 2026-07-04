import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAllInvoices, fetchAllPayments, createInvoice, Invoice, Payment } from '@/services/financeService';
import api from '@/services/api';
import FinanceStatsCards from '@/components/FinanceStatsCards';
import InvoiceCard from '@/components/InvoiceCard';
import PaymentHistoryTable from '@/components/PaymentHistoryTable';

const AdminFinancePage: React.FC = () => {
    const { accessToken } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [students, setStudents] = useState<any[]>([]); // For the invoice creation form
    const [isLoading, setIsLoading] = useState(true);

    // Form State
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({ studentId: '', amountDue: '', dueDate: '', type: 'tuition', description: '' });

    const loadData = async () => {
        if (!accessToken) return;
        setIsLoading(true);
        try {
            const [invRes, payRes, stuRes] = await Promise.all([
                fetchAllInvoices(accessToken),
                fetchAllPayments(accessToken),
                api.get('/users?role=student', accessToken) // Fetching logic to grab student profiles
            ]);
            setInvoices(invRes.invoices);
            setPayments(payRes.payments);
            setStudents(stuRes.data || stuRes.users || []); // Handle your specific API response wrap
        } catch (e) {
            console.error('Failed fetching finance data:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [accessToken]);

    const handleCreateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) return;
        try {
            await createInvoice(accessToken, {
                ...formData,
                amountDue: Number(formData.amountDue),
            });
            setIsCreating(false);
            setFormData({ studentId: '', amountDue: '', dueDate: '', type: 'tuition', description: '' });
            loadData(); // Refresh UI
        } catch (e: any) {
            alert(e.message || 'Error creating invoice');
        }
    };

    // Calculate aggregate stats
    const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);
    const pendingDues = invoices.filter(i => i.status !== 'paid_full').reduce((acc, i) => acc + (i.amountDue - i.amountPaid), 0);
    const totalInvoices = invoices.length;

    const stats = [
        { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, color: '#10b981', icon: '💰' },
        { label: 'Pending Dues', value: `$${pendingDues.toLocaleString()}`, color: '#ef4444', icon: '📉' },
        { label: 'Invoices Issued', value: totalInvoices, color: '#3b82f6', icon: '📄' },
    ];

    if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading Finance Hub...</div>;

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-main)' }}>Finance Hub</h1>
                <button style={styles.createBtn} onClick={() => setIsCreating(true)}>+ New Invoice</button>
            </div>

            <FinanceStatsCards stats={stats} />

            {/* Create Invoice Modal inline for brevity */}
            {isCreating && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalForm}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Create Student Invoice</h3>
                        <form onSubmit={handleCreateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <select 
                                required style={styles.input} 
                                value={formData.studentId} 
                                onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                            >
                                <option value="">Select Student...</option>
                                {students.map(s => (
                                    <option key={s._id} value={s._id}>{s.name} ({s.email})</option>
                                ))}
                            </select>
                            
                            <div style={{ display: 'flex', gap: 12 }}>
                                <input required type="number" min="1" step="0.01" placeholder="Amount Due ($)" style={styles.input} 
                                    value={formData.amountDue} onChange={e => setFormData({ ...formData, amountDue: e.target.value })} />
                                <input required type="date" style={styles.input} 
                                    value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
                            </div>

                            <select required style={styles.input} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                <option value="tuition">Tuition Fee</option>
                                <option value="library_fine">Library Fine</option>
                                <option value="hostel">Hostel Fee</option>
                                <option value="other">Other</option>
                            </select>

                            <textarea placeholder="Description (Optional)" rows={2} style={styles.input}
                                value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                                <button type="button" style={styles.cancelBtn} onClick={() => setIsCreating(false)}>Cancel</button>
                                <button type="submit" style={styles.submitBtn}>Generate Invoice</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div style={styles.splitLayout}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 18, margin: '0 0 16px' }}>Recent Invoices</h3>
                    <div style={{ display: 'grid', gap: 16 }}>
                        {invoices.slice(0, 10).map(inv => <InvoiceCard key={inv._id} invoice={inv} isAdminView />)}
                    </div>
                </div>
                <div style={{ flex: 2 }}>
                    <div style={styles.tableCard}>
                        <h3 style={{ fontSize: 18, margin: '0 0 16px' }}>Network Payment Audit</h3>
                        <PaymentHistoryTable payments={payments} isAdminView />
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1200, margin: '0 auto', fontFamily: "'Inter', sans-serif" },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    createBtn: { background: 'var(--text-main)', color:'var(--card-bg)', border: 'none', padding: '10px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
    splitLayout: { display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' },
    tableCard: { background:'var(--card-bg)', padding: 24, borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalForm: { background:'var(--card-bg)', padding: 32, borderRadius: 12, width: 500, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
    input: { flex: 1, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit' },
    cancelBtn: { padding: '8px 16px', background: 'var(--border-color)', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
    submitBtn: { padding: '8px 16px', background: 'var(--primary)', color:'var(--card-bg)', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }
};

export default AdminFinancePage;
