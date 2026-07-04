import React, { useState } from 'react';
import type { Invoice } from '@/services/financeService';

interface PaymentFormProps {
    invoice: Invoice;
    onSubmit: (amount: number, method: string, txnId: string) => Promise<void>;
    onCancel: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ invoice, onSubmit, onCancel }) => {
    const remaining = invoice.amountDue - invoice.amountPaid;
    const [amount, setAmount] = useState<number | string>(remaining);
    const [method, setMethod] = useState('credit_card');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = Number(amount);
        if (numAmount <= 0 || numAmount > remaining) {
            alert('Invalid payment amount.');
            return;
        }

        setIsSubmitting(true);
        // Mocking a Stripe/Razorpay interaction by generating a random txn ID
        const fakeTxnId = `TXN_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        
        try {
            await onSubmit(numAmount, method, fakeTxnId);
        } catch (err: any) {
            alert(err.message || 'Payment failed.');
            setIsSubmitting(false);
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h3 style={styles.title}>Process Payment</h3>
                <p style={styles.subtitle}>Paying for: {invoice.type.toUpperCase()}</p>
                
                <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
                    <div style={styles.field}>
                        <label style={styles.label}>Amount to Pay ($)</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            max={remaining}
                            min="1"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            style={styles.input}
                            required
                        />
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>Max available: ${remaining.toFixed(2)}</p>
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>Payment Method</label>
                        <select 
                            value={method} 
                            onChange={(e) => setMethod(e.target.value)}
                            style={styles.input}
                        >
                            <option value="credit_card">Credit Card</option>
                            <option value="debit_card">Debit Card</option>
                            <option value="net_banking">Net Banking</option>
                            <option value="upi">UPI</option>
                        </select>
                    </div>

                    {/* Mock Card UI */}
                    <div style={styles.mockCard}>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Secure Payment Gateway</p>
                        <input type="text" placeholder="Card Number" style={{ ...styles.input, marginBottom: 8 }} required={method.includes('card')} disabled={method === 'upi' || method === 'net_banking'} />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input type="text" placeholder="MM/YY" style={styles.input} required={method.includes('card')} disabled={method === 'upi' || method === 'net_banking'} />
                            <input type="text" placeholder="CVC" style={styles.input} required={method.includes('card')} disabled={method === 'upi' || method === 'net_banking'} />
                        </div>
                    </div>

                    <div style={styles.actions}>
                        <button type="button" onClick={onCancel} style={styles.cancelBtn} disabled={isSubmitting}>Cancel</button>
                        <button type="submit" style={styles.submitBtn} disabled={isSubmitting}>
                            {isSubmitting ? 'Processing...' : `Pay $${Number(amount).toFixed(2)}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background:'var(--card-bg)', padding: 32, borderRadius: 16, width: 400, maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
    title: { margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-main)' },
    subtitle: { margin: '4px 0 0', fontSize: 14, color: 'var(--text-muted)' },
    field: { marginBottom: 16 },
    label: { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 },
    input: { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box', outline: 'none' },
    mockCard: { background: 'var(--page-bg)', border: '1px solid #e5e7eb', padding: 16, borderRadius: 8, marginBottom: 24 },
    actions: { display: 'flex', justifyContent: 'flex-end', gap: 12 },
    cancelBtn: { padding: '10px 16px', borderRadius: 8, border: '1px solid #d1d5db', background:'var(--card-bg)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' },
    submitBtn: { padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--primary)', color:'var(--card-bg)', fontWeight: 600, cursor: 'pointer' }
};

export default PaymentForm;
