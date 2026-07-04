import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
    AdmissionApplication,
    AdmissionPayload,
    AdmissionStatus,
    convertAdmissionToStudent,
    createAdmission,
    listAdmissions,
    updateAdmissionDocuments,
    updateAdmissionStatus,
} from '@/services/admissionService';
import { Program, listPrograms } from '@/services/foundationService';

const STATUSES: AdmissionStatus[] = ['inquiry', 'application', 'document_verification', 'offer', 'enrolled', 'rejected', 'withdrawn'];

const statusLabel = (status: string) => status.split('_').map(word => word.replace(/^\w/, c => c.toUpperCase())).join(' ');

const defaultForm: AdmissionPayload = {
    applicantName: '',
    email: '',
    phone: '',
    program: '',
    academicYear: '2025-2026',
    status: 'inquiry',
    source: 'direct',
    notes: '',
};

const AdminAdmissionsPage: React.FC = () => {
    const { accessToken } = useAuth();
    const [applications, setApplications] = useState<AdmissionApplication[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [status, setStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [form, setForm] = useState<AdmissionPayload>(defaultForm);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const load = async () => {
        if (!accessToken) return;
        setIsLoading(true);
        try {
            const [admissionRes, programRes] = await Promise.all([
                listAdmissions(accessToken, { status, search, limit: 100 }),
                listPrograms(accessToken),
            ]);
            setApplications(admissionRes.applications || []);
            setPrograms(programRes.programs.filter(p => p.isActive));
            setError('');
        } catch (err: any) {
            setError(err?.message || 'Unable to load admissions.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken, status]);

    const metrics = useMemo(() => ({
        total: applications.length,
        open: applications.filter(app => !['enrolled', 'rejected', 'withdrawn'].includes(app.status)).length,
        offers: applications.filter(app => app.status === 'offer').length,
        enrolled: applications.filter(app => app.status === 'enrolled').length,
    }), [applications]);

    const flash = (message: string) => {
        setNotice(message);
        setError('');
        window.setTimeout(() => setNotice(''), 3000);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) return;
        try {
            await createAdmission(accessToken, form);
            setForm(defaultForm);
            await load();
            flash('Admission application created.');
        } catch (err: any) {
            setError(err?.message || 'Unable to create application.');
        }
    };

    const changeStatus = async (application: AdmissionApplication, nextStatus: AdmissionStatus) => {
        if (!accessToken) return;
        try {
            await updateAdmissionStatus(accessToken, application._id, {
                status: nextStatus,
                notes: application.notes || '',
            });
            await load();
            flash('Admission status updated.');
        } catch (err: any) {
            setError(err?.message || 'Unable to update status.');
        }
    };

    const updateDocument = async (application: AdmissionApplication, index: number, key: 'status' | 'url' | 'remarks', value: string) => {
        if (!accessToken) return;
        const documents = application.documents.length
            ? [...application.documents]
            : [{ label: 'Identity proof', status: 'pending' }, { label: 'Previous academic records', status: 'pending' }];
        documents[index] = { ...documents[index], [key]: value };
        try {
            await updateAdmissionDocuments(accessToken, application._id, documents);
            await load();
            flash('Document checklist updated.');
        } catch (err: any) {
            setError(err?.message || 'Unable to update documents.');
        }
    };

    const convertToStudent = async (application: AdmissionApplication) => {
        if (!accessToken) return;
        try {
            const res = await convertAdmissionToStudent(accessToken, application._id);
            await load();
            flash(`Student created. Temporary password: ${res.user.temporaryPassword}`);
        } catch (err: any) {
            setError(err?.message || 'Unable to convert application.');
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Admissions</h1>
                    <p style={styles.subtitle}>Track inquiries, applications, verification, offers, and enrollments.</p>
                </div>
                <div style={styles.kpis}>
                    <Kpi label="Total" value={metrics.total} />
                    <Kpi label="Open" value={metrics.open} />
                    <Kpi label="Offers" value={metrics.offers} />
                    <Kpi label="Enrolled" value={metrics.enrolled} />
                </div>
            </div>

            {notice && <div style={styles.notice}>{notice}</div>}
            {error && <div style={{ ...styles.notice, ...styles.error }}>{error}</div>}

            <div style={styles.layout}>
                <form style={styles.panel} onSubmit={submit}>
                    <div style={styles.panelTitle}><Plus size={18} /> New Application</div>
                    <Field label="Applicant Name" value={form.applicantName} onChange={v => setForm({ ...form, applicantName: v })} />
                    <Field label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} />
                    <Field label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
                    <Select label="Program" value={form.program} onChange={v => setForm({ ...form, program: v })} options={programs.map(p => ({ value: p._id, label: `${p.code} - ${p.name}` }))} />
                    <Field label="Academic Year" value={form.academicYear} onChange={v => setForm({ ...form, academicYear: v })} />
                    <Select label="Stage" value={form.status || 'inquiry'} onChange={v => setForm({ ...form, status: v as AdmissionStatus })} options={STATUSES.map(s => ({ value: s, label: statusLabel(s) }))} />
                    <Field label="Source" value={form.source || ''} onChange={v => setForm({ ...form, source: v })} />
                    <label style={styles.field}>
                        <span style={styles.label}>Notes</span>
                        <textarea style={styles.input} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </label>
                    <button style={styles.primary}>Create Application</button>
                </form>

                <section style={styles.panel}>
                    <div style={styles.toolbar}>
                        <div style={styles.panelTitle}><ClipboardList size={18} /> Applications</div>
                        <form style={styles.search} onSubmit={(e) => { e.preventDefault(); load(); }}>
                            <Search size={16} />
                            <input style={styles.searchInput} placeholder="Search name, email, phone" value={search} onChange={e => setSearch(e.target.value)} />
                            <select style={styles.searchInput} value={status} onChange={e => setStatus(e.target.value)}>
                                <option value="all">All stages</option>
                                {STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                            </select>
                            <button style={styles.secondary}>Search</button>
                        </form>
                    </div>

                    {isLoading ? (
                        <div style={styles.empty}>Loading admissions...</div>
                    ) : applications.length === 0 ? (
                        <div style={styles.empty}>No applications found.</div>
                    ) : (
                        <div style={styles.tableWrap}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Applicant</th>
                                        <th style={styles.th}>Program</th>
                                        <th style={styles.th}>Stage</th>
                                        <th style={styles.th}>Updated</th>
                                        <th style={styles.th}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {applications.map(app => (
                                        <React.Fragment key={app._id}>
                                            <tr>
                                                <td style={styles.td}>
                                                    <strong>{app.applicantName}</strong>
                                                    <span style={styles.muted}>{app.email} | {app.phone}</span>
                                                </td>
                                                <td style={styles.td}>
                                                    <strong>{app.program?.code || 'Program'}</strong>
                                                    <span style={styles.muted}>{app.program?.name || app.academicYear}</span>
                                                </td>
                                                <td style={styles.td}><span style={{ ...styles.badge, ...badgeStyle(app.status) }}>{statusLabel(app.status)}</span></td>
                                                <td style={styles.td}>{new Date(app.updatedAt).toLocaleDateString()}</td>
                                                <td style={styles.td}>
                                                    <div style={styles.actionStack}>
                                                        <select style={styles.stageSelect} value={app.status} onChange={e => changeStatus(app, e.target.value as AdmissionStatus)}>
                                                            {STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                                                        </select>
                                                        <button type="button" style={styles.linkBtn} onClick={() => setExpandedId(expandedId === app._id ? null : app._id)}>
                                                            Documents
                                                        </button>
                                                        <button
                                                            type="button"
                                                            style={styles.convertBtn}
                                                            disabled={!!app.convertedUser || !['offer', 'enrolled'].includes(app.status)}
                                                            onClick={() => convertToStudent(app)}
                                                        >
                                                            {app.convertedUser ? 'Converted' : 'Convert'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedId === app._id && (
                                                <tr>
                                                    <td style={styles.docCell} colSpan={5}>
                                                        <div style={styles.docs}>
                                                            {(app.documents.length ? app.documents : [{ label: 'Identity proof', status: 'pending' }, { label: 'Previous academic records', status: 'pending' }]).map((doc, index) => (
                                                                <div key={`${doc.label}-${index}`} style={styles.docRow}>
                                                                    <strong>{doc.label}</strong>
                                                                    <select style={styles.stageSelect} value={doc.status} onChange={e => updateDocument(app, index, 'status', e.target.value)}>
                                                                        {['pending', 'received', 'verified', 'rejected'].map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                                                                    </select>
                                                                    <input style={styles.docInput} placeholder="Document URL" value={doc.url || ''} onChange={e => updateDocument(app, index, 'url', e.target.value)} />
                                                                    <input style={styles.docInput} placeholder="Remarks" value={doc.remarks || ''} onChange={e => updateDocument(app, index, 'remarks', e.target.value)} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

const Kpi = ({ label, value }: { label: string; value: number }) => (
    <div style={styles.kpi}><strong>{value}</strong><span>{label}</span></div>
);

const Field = ({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) => (
    <label style={styles.field}>
        <span style={styles.label}>{label}</span>
        <input style={styles.input} type={type} value={value} onChange={e => onChange(e.target.value)} required />
    </label>
);

const Select = ({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) => (
    <label style={styles.field}>
        <span style={styles.label}>{label}</span>
        <select style={styles.input} value={value} onChange={e => onChange(e.target.value)} required>
            <option value="">Select</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    </label>
);

const badgeStyle = (status: AdmissionStatus): React.CSSProperties => {
    if (status === 'enrolled') return { background: '#dcfce7', color: '#166534' };
    if (status === 'rejected' || status === 'withdrawn') return { background: '#fee2e2', color: '#991b1b' };
    if (status === 'offer') return { background: '#dbeafe', color: '#1d4ed8' };
    if (status === 'document_verification') return { background: '#fef3c7', color: '#92400e' };
    return { background: '#f1f5f9', color: '#475569' };
};

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1320, margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 18 },
    title: { margin: 0, fontSize: 28, fontWeight: 900, color: 'var(--text-main)' },
    subtitle: { margin: '6px 0 0', color: 'var(--text-muted)' },
    kpis: { display: 'flex', gap: 10, flexWrap: 'wrap' },
    kpi: { minWidth: 92, border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--card-bg)', padding: 12 },
    layout: { display: 'grid', gridTemplateColumns: '360px 1fr', gap: 14, alignItems: 'start' },
    panel: { background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 16 },
    panelTitle: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, color: 'var(--text-main)' },
    field: { display: 'grid', gap: 6, marginBottom: 10 },
    label: { color: 'var(--text-muted)', fontSize: 12, fontWeight: 900 },
    input: { width: '100%', boxSizing: 'border-box', border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px 12px', background: 'var(--card-bg)', color: 'var(--text-main)', fontFamily: 'inherit' },
    primary: { width: '100%', border: 'none', borderRadius: 8, padding: '10px 14px', background: 'var(--primary)', color: '#fff', fontWeight: 900, cursor: 'pointer' },
    secondary: { border: '1px solid #bfdbfe', borderRadius: 8, padding: '9px 12px', background: '#dbeafe', color: '#1d4ed8', fontWeight: 900, cursor: 'pointer' },
    toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 },
    search: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    searchInput: { border: '1px solid var(--border-color)', borderRadius: 8, padding: '9px 10px', background: 'var(--card-bg)', color: 'var(--text-main)' },
    tableWrap: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: 780 },
    th: { textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 900 },
    td: { padding: '10px 12px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: 13 },
    muted: { display: 'block', color: 'var(--text-muted)', fontSize: 12, marginTop: 3 },
    badge: { display: 'inline-flex', borderRadius: 999, padding: '4px 9px', fontSize: 12, fontWeight: 900 },
    stageSelect: { border: '1px solid var(--border-color)', borderRadius: 8, padding: '8px 9px', background: 'var(--card-bg)', color: 'var(--text-main)' },
    actionStack: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    linkBtn: { border: '1px solid var(--border-color)', borderRadius: 8, padding: '8px 9px', background: 'var(--card-bg)', color: 'var(--text-main)', fontWeight: 800, cursor: 'pointer' },
    convertBtn: { border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 9px', background: '#dcfce7', color: '#166534', fontWeight: 900, cursor: 'pointer' },
    docCell: { padding: 12, background: 'var(--page-bg)', borderBottom: '1px solid var(--border-color)' },
    docs: { display: 'grid', gap: 8 },
    docRow: { display: 'grid', gridTemplateColumns: '180px 140px 1fr 1fr', gap: 8, alignItems: 'center' },
    docInput: { border: '1px solid var(--border-color)', borderRadius: 8, padding: '8px 9px', background: 'var(--card-bg)', color: 'var(--text-main)' },
    notice: { marginBottom: 12, border: '1px solid #bbf7d0', background: '#dcfce7', color: '#166534', padding: 12, borderRadius: 8, fontWeight: 800 },
    error: { borderColor: '#fecaca', background: '#fee2e2', color: '#991b1b' },
    empty: { padding: 40, textAlign: 'center', color: 'var(--text-muted)' },
};

export default AdminAdmissionsPage;
