import api from './api';

export interface Invoice {
    _id: string;
    student: any;
    amountDue: number;
    amountPaid: number;
    dueDate: string;
    status: 'pending' | 'paid_partial' | 'paid_full';
    type: string;
    description?: string;
    createdAt: string;
}

export interface Payment {
    _id: string;
    invoice: any;
    student: any;
    amount: number;
    paymentDate: string;
    transactionId: string;
    method: string;
}

// ── Admin Endpoints ────────────────────────────────────────────────────────
export const createInvoice = (token: string, data: Partial<Invoice>): Promise<{ invoice: Invoice }> =>
    api.post('/invoices', data as Record<string, unknown>, token);

export const fetchAllInvoices = (token: string): Promise<{ invoices: Invoice[] }> =>
    api.get('/invoices', token);

export const updateInvoice = (token: string, id: string, data: Partial<Invoice>): Promise<{ invoice: Invoice }> =>
    api.put(`/invoices/${id}`, data as Record<string, unknown>, token);

export const fetchAllPayments = (token: string): Promise<{ payments: Payment[] }> =>
    api.get('/payments/history', token);

// ── Student Endpoints ──────────────────────────────────────────────────────
export const fetchMyDues = (token: string): Promise<{ invoices: Invoice[] }> =>
    api.get('/invoices/my-dues', token);

export const fetchMyPaymentHistory = (token: string): Promise<{ payments: Payment[] }> =>
    api.get('/payments/history', token);

export const processPayment = (token: string, invoiceId: string, amount: number, method: string, transactionId: string): Promise<{ payment: Payment }> =>
    api.post('/payments', { invoiceId, amount, method, transactionId }, token);
