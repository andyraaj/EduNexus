import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    AdmissionPayload,
    listPublicAdmissionPrograms,
    submitPublicAdmission,
} from '@/services/admissionService';
import type { Program } from '@/services/foundationService';

const defaultForm: AdmissionPayload = {
    applicantName: '',
    email: '',
    phone: '',
    program: '',
    academicYear: '2025-2026',
    source: 'public_form',
    notes: '',
};

const AdmissionsApplyPage: React.FC = () => {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [form, setForm] = useState<AdmissionPayload>(defaultForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        listPublicAdmissionPrograms()
            .then(res => {
                setPrograms(res.programs || []);
                if (res.programs?.[0]) setForm(current => ({ ...current, program: res.programs[0]._id }));
            })
            .catch((err: any) => setError(err?.message || 'Unable to load programs.'));
    }, []);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        setNotice('');
        try {
            const res = await submitPublicAdmission(form);
            setNotice(`Application submitted for ${res.application.program?.name || 'the selected program'}. Our admissions team will review it next.`);
            setForm({ ...defaultForm, program: programs[0]?._id || '' });
        } catch (err: any) {
            setError(err?.message || 'Unable to submit application.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={styles.page}>
            <header style={styles.header}>
                <Link to="/" style={{ ...styles.logo, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src="/favicon.png?v=2" alt="EduNexus Logo" style={{ width: 34, height: 34, objectFit: 'contain' }} />
                    <span>EduNexus</span>
                </Link>
                <Link to="/login" style={styles.login}>Portal Login</Link>
            </header>

            <main style={styles.main}>
                <section style={styles.intro}>
                    <span style={styles.kicker}>Admissions</span>
                    <h1 style={styles.title}>Apply to EduNexus programs</h1>
                    <p style={styles.copy}>
                        Start your application with basic contact and program details. The admissions desk will verify documents, issue offers, and track enrollment from the admin console.
                    </p>
                    <div style={styles.steps}>
                        <Step number="1" label="Submit application" />
                        <Step number="2" label="Verify documents" />
                        <Step number="3" label="Receive decision" />
                    </div>
                </section>

                <form style={styles.form} onSubmit={submit}>
                    <h2 style={styles.formTitle}>Application Details</h2>
                    {notice && <div style={styles.notice}>{notice}</div>}
                    {error && <div style={{ ...styles.notice, ...styles.error }}>{error}</div>}
                    <Field label="Full Name" value={form.applicantName} onChange={value => setForm({ ...form, applicantName: value })} />
                    <Field label="Email" type="email" value={form.email} onChange={value => setForm({ ...form, email: value })} />
                    <Field label="Phone" value={form.phone} onChange={value => setForm({ ...form, phone: value })} />
                    <label style={styles.field}>
                        <span style={styles.label}>Program</span>
                        <select style={styles.input} value={form.program} onChange={e => setForm({ ...form, program: e.target.value })} required>
                            <option value="">Select a program</option>
                            {programs.map(program => (
                                <option key={program._id} value={program._id}>
                                    {program.code} - {program.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <Field label="Academic Year" value={form.academicYear} onChange={value => setForm({ ...form, academicYear: value })} />
                    <label style={styles.field}>
                        <span style={styles.label}>Notes</span>
                        <textarea
                            style={styles.input}
                            value={form.notes || ''}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                            placeholder="Prior institution, preferred specialization, or anything the admissions desk should know."
                        />
                    </label>
                    <button style={styles.submit} disabled={isSubmitting || programs.length === 0}>
                        {isSubmitting ? 'Submitting...' : 'Submit Application'}
                    </button>
                </form>
            </main>
        </div>
    );
};

const Step = ({ number, label }: { number: string; label: string }) => (
    <div style={styles.step}>
        <strong>{number}</strong>
        <span>{label}</span>
    </div>
);

const Field = ({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) => (
    <label style={styles.field}>
        <span style={styles.label}>{label}</span>
        <input style={styles.input} type={type} value={value} onChange={e => onChange(e.target.value)} required />
    </label>
);

const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', background: '#f8fafc', color: '#111827', fontFamily: "'Inter', sans-serif" },
    header: { height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', borderBottom: '1px solid #e5e7eb', background: '#fff' },
    logo: { fontSize: 22, fontWeight: 900, color: 'var(--primary)', textDecoration: 'none' },
    login: { color: '#475569', fontWeight: 800, textDecoration: 'none', fontSize: 14 },
    main: { maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 440px', gap: 32, padding: '72px 1.5rem' },
    intro: { paddingTop: 36 },
    kicker: { color: 'var(--primary)', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em' },
    title: { margin: '14px 0 16px', fontSize: 48, lineHeight: 1.05, letterSpacing: 0, fontWeight: 900, color: '#0f172a' },
    copy: { maxWidth: 600, color: '#64748b', fontSize: 17, lineHeight: 1.7, margin: 0 },
    steps: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 32, maxWidth: 620 },
    step: { display: 'grid', gap: 8, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: 14 },
    form: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 22, boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' },
    formTitle: { margin: '0 0 16px', fontSize: 20, fontWeight: 900, color: '#0f172a' },
    field: { display: 'grid', gap: 6, marginBottom: 12 },
    label: { color: '#475569', fontSize: 12, fontWeight: 900 },
    input: { width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 8, padding: '11px 12px', fontFamily: 'inherit', fontSize: 14, color: '#0f172a', background: '#fff' },
    submit: { width: '100%', border: 'none', borderRadius: 8, padding: '12px 14px', background: 'var(--primary)', color: '#fff', fontWeight: 900, cursor: 'pointer' },
    notice: { marginBottom: 12, border: '1px solid #bbf7d0', background: '#dcfce7', color: '#166534', padding: 12, borderRadius: 8, fontWeight: 800, fontSize: 13 },
    error: { borderColor: '#fecaca', background: '#fee2e2', color: '#991b1b' },
};

export default AdmissionsApplyPage;
