import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Layers, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
    Batch,
    Department,
    InstitutionSettings,
    Program,
    Section,
    createBatch,
    createDepartment,
    createProgram,
    createSection,
    getInstitutionSettings,
    listBatches,
    listDepartments,
    listPrograms,
    listSections,
    updateBatch,
    updateDepartment,
    updateInstitutionSettings,
    updateProgram,
    updateSection,
} from '@/services/foundationService';

type Tab = 'settings' | 'departments' | 'programs' | 'batches' | 'sections';

const defaultSettings: InstitutionSettings = {
    name: 'EduNexus College',
    code: 'ACX',
    activeAcademicYear: '2025-2026',
    attendanceThreshold: 75,
    defaultCurrency: 'INR',
    gradingScheme: 'marks',
};

const AdminFoundationPage: React.FC = () => {
    const { accessToken } = useAuth();
    const [tab, setTab] = useState<Tab>('settings');
    const [settings, setSettings] = useState<InstitutionSettings>(defaultSettings);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [form, setForm] = useState<Record<string, string>>({});

    const load = async () => {
        if (!accessToken) return;
        try {
            const [settingsRes, deptRes, programRes, batchRes, sectionRes] = await Promise.all([
                getInstitutionSettings(accessToken),
                listDepartments(accessToken),
                listPrograms(accessToken),
                listBatches(accessToken),
                listSections(accessToken),
            ]);
            setSettings(settingsRes.settings);
            setDepartments(deptRes.departments || []);
            setPrograms(programRes.programs || []);
            setBatches(batchRes.batches || []);
            setSections(sectionRes.sections || []);
        } catch (err: any) {
            setError(err?.message || 'Unable to load foundation data.');
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken]);

    const activeCounts = useMemo(() => ({
        departments: departments.filter(x => x.isActive).length,
        programs: programs.filter(x => x.isActive).length,
        batches: batches.filter(x => x.isActive).length,
        sections: sections.filter(x => x.isActive).length,
    }), [departments, programs, batches, sections]);

    const flash = (message: string) => {
        setNotice(message);
        setError('');
        window.setTimeout(() => setNotice(''), 3000);
    };

    const submitSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) return;
        try {
            const res = await updateInstitutionSettings(accessToken, settings);
            setSettings(res.settings);
            flash('Institution settings saved.');
        } catch (err: any) {
            setError(err?.message || 'Unable to save settings.');
        }
    };

    const submitEntity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) return;
        try {
            if (tab === 'departments') {
                await createDepartment(accessToken, { code: form.code, name: form.name, description: form.description });
            } else if (tab === 'programs') {
                await createProgram(accessToken, {
                    code: form.code,
                    name: form.name,
                    department: form.department,
                    level: form.level || 'undergraduate',
                    durationSemesters: Number(form.durationSemesters || 8),
                });
            } else if (tab === 'batches') {
                await createBatch(accessToken, {
                    name: form.name,
                    program: form.program,
                    academicYear: form.academicYear || settings.activeAcademicYear,
                    startYear: Number(form.startYear),
                    endYear: Number(form.endYear),
                });
            } else if (tab === 'sections') {
                await createSection(accessToken, {
                    name: form.name,
                    batch: form.batch,
                    semester: Number(form.semester),
                    room: form.room,
                    capacity: Number(form.capacity || 60),
                });
            }
            setForm({});
            await load();
            flash('Record saved.');
        } catch (err: any) {
            setError(err?.message || 'Unable to save record.');
        }
    };

    const toggleActive = async (kind: Tab, id: string, isActive: boolean) => {
        if (!accessToken) return;
        const payload = { isActive: !isActive };
        try {
            if (kind === 'departments') await updateDepartment(accessToken, id, payload);
            if (kind === 'programs') await updateProgram(accessToken, id, payload);
            if (kind === 'batches') await updateBatch(accessToken, id, payload);
            if (kind === 'sections') await updateSection(accessToken, id, payload);
            await load();
            flash('Status updated.');
        } catch (err: any) {
            setError(err?.message || 'Unable to update status.');
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Academic Foundation</h1>
                    <p style={styles.subtitle}>Institution profile, departments, programs, batches, and sections.</p>
                </div>
                <div style={styles.kpis}>
                    <Kpi label="Departments" value={activeCounts.departments} />
                    <Kpi label="Programs" value={activeCounts.programs} />
                    <Kpi label="Sections" value={activeCounts.sections} />
                </div>
            </div>

            {notice && <div style={styles.notice}>{notice}</div>}
            {error && <div style={{ ...styles.notice, ...styles.error }}>{error}</div>}

            <div style={styles.tabs}>
                {(['settings', 'departments', 'programs', 'batches', 'sections'] as Tab[]).map(item => (
                    <button key={item} style={tab === item ? styles.activeTab : styles.tab} onClick={() => { setTab(item); setForm({}); }}>
                        {item.replace(/^\w/, c => c.toUpperCase())}
                    </button>
                ))}
            </div>

            {tab === 'settings' ? (
                <form style={styles.panel} onSubmit={submitSettings}>
                    <div style={styles.panelTitle}><Building2 size={18} /> Institution Settings</div>
                    <div style={styles.grid}>
                        <Field label="Institution Name" value={settings.name} onChange={value => setSettings({ ...settings, name: value })} />
                        <Field label="Code" value={settings.code} onChange={value => setSettings({ ...settings, code: value })} />
                        <Field label="Active Academic Year" value={settings.activeAcademicYear} onChange={value => setSettings({ ...settings, activeAcademicYear: value })} />
                        <Field label="Attendance Threshold" type="number" value={String(settings.attendanceThreshold)} onChange={value => setSettings({ ...settings, attendanceThreshold: Number(value) })} />
                        <Field label="Contact Email" value={settings.contactEmail || ''} onChange={value => setSettings({ ...settings, contactEmail: value })} />
                        <Field label="Contact Phone" value={settings.contactPhone || ''} onChange={value => setSettings({ ...settings, contactPhone: value })} />
                        <Field label="Website" value={settings.website || ''} onChange={value => setSettings({ ...settings, website: value })} />
                        <Field label="Currency" value={settings.defaultCurrency} onChange={value => setSettings({ ...settings, defaultCurrency: value })} />
                        <label style={styles.fieldWide}>
                            <span style={styles.label}>Address</span>
                            <textarea style={styles.input} value={settings.address || ''} onChange={e => setSettings({ ...settings, address: e.target.value })} />
                        </label>
                    </div>
                    <button style={styles.primary}><Save size={16} /> Save Settings</button>
                </form>
            ) : (
                <div style={styles.split}>
                    <form style={styles.panel} onSubmit={submitEntity}>
                        <div style={styles.panelTitle}><Layers size={18} /> Add {tab.slice(0, -1)}</div>
                        {renderEntityForm(tab, form, setForm, { departments, programs, batches, settings })}
                        <button style={styles.primary}>Save Record</button>
                    </form>
                    <div style={styles.panel}>
                        <div style={styles.panelTitle}>Existing {tab}</div>
                        {renderList(tab, { departments, programs, batches, sections }, toggleActive)}
                    </div>
                </div>
            )}
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

const renderEntityForm = (tab: Tab, form: Record<string, string>, setForm: (value: Record<string, string>) => void, data: any) => {
    const set = (key: string, value: string) => setForm({ ...form, [key]: value });
    if (tab === 'departments') {
        return <div style={styles.formStack}><Field label="Code" value={form.code || ''} onChange={v => set('code', v)} /><Field label="Name" value={form.name || ''} onChange={v => set('name', v)} /><Field label="Description" value={form.description || ''} onChange={v => set('description', v)} /></div>;
    }
    if (tab === 'programs') {
        return <div style={styles.formStack}><Field label="Code" value={form.code || ''} onChange={v => set('code', v)} /><Field label="Name" value={form.name || ''} onChange={v => set('name', v)} /><Select label="Department" value={form.department || ''} onChange={v => set('department', v)} options={data.departments.map((x: Department) => ({ value: x._id, label: `${x.code} - ${x.name}` }))} /><Field label="Duration Semesters" type="number" value={form.durationSemesters || '8'} onChange={v => set('durationSemesters', v)} /></div>;
    }
    if (tab === 'batches') {
        return <div style={styles.formStack}><Field label="Name" value={form.name || ''} onChange={v => set('name', v)} /><Select label="Program" value={form.program || ''} onChange={v => set('program', v)} options={data.programs.map((x: Program) => ({ value: x._id, label: `${x.code} - ${x.name}` }))} /><Field label="Academic Year" value={form.academicYear || data.settings.activeAcademicYear} onChange={v => set('academicYear', v)} /><Field label="Start Year" type="number" value={form.startYear || ''} onChange={v => set('startYear', v)} /><Field label="End Year" type="number" value={form.endYear || ''} onChange={v => set('endYear', v)} /></div>;
    }
    return <div style={styles.formStack}><Field label="Name" value={form.name || ''} onChange={v => set('name', v)} /><Select label="Batch" value={form.batch || ''} onChange={v => set('batch', v)} options={data.batches.map((x: Batch) => ({ value: x._id, label: `${x.name} (${x.academicYear})` }))} /><Field label="Semester" type="number" value={form.semester || ''} onChange={v => set('semester', v)} /><Field label="Room" value={form.room || ''} onChange={v => set('room', v)} /><Field label="Capacity" type="number" value={form.capacity || '60'} onChange={v => set('capacity', v)} /></div>;
};

const Select = ({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) => (
    <label style={styles.field}>
        <span style={styles.label}>{label}</span>
        <select style={styles.input} value={value} onChange={e => onChange(e.target.value)} required>
            <option value="">Select</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    </label>
);

const renderList = (tab: Tab, data: any, toggleActive: (kind: Tab, id: string, isActive: boolean) => void) => {
    const items = data[tab] || [];
    if (items.length === 0) return <div style={styles.empty}>No records yet.</div>;
    return <div style={styles.list}>{items.map((item: any) => <div key={item._id} style={styles.item}><div><strong>{item.code || item.name}</strong><span>{item.name !== (item.code || item.name) ? item.name : describeItem(tab, item)}</span></div><button style={item.isActive ? styles.activeBtn : styles.inactiveBtn} onClick={() => toggleActive(tab, item._id, item.isActive)}>{item.isActive ? 'Active' : 'Inactive'}</button></div>)}</div>;
};

const describeItem = (tab: Tab, item: any) => {
    if (tab === 'programs') return item.department?.name || 'No department';
    if (tab === 'batches') return item.program?.name || item.academicYear;
    if (tab === 'sections') return `${item.batch?.name || 'Batch'} - Semester ${item.semester}`;
    return item.description || 'Department';
};

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1220, margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 20 },
    title: { margin: 0, fontSize: 28, fontWeight: 900, color: 'var(--text-main)' },
    subtitle: { margin: '6px 0 0', color: 'var(--text-muted)' },
    kpis: { display: 'flex', gap: 10 },
    kpi: { minWidth: 100, border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--card-bg)', padding: 12 },
    tabs: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
    tab: { border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-muted)', borderRadius: 8, padding: '9px 12px', fontWeight: 800, cursor: 'pointer' },
    activeTab: { border: '1px solid #bfdbfe', background: '#dbeafe', color: '#1d4ed8', borderRadius: 8, padding: '9px 12px', fontWeight: 900, cursor: 'pointer' },
    panel: { background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 16 },
    panelTitle: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, color: 'var(--text-main)', marginBottom: 14 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 },
    split: { display: 'grid', gridTemplateColumns: 'minmax(300px, 420px) 1fr', gap: 14 },
    formStack: { display: 'grid', gap: 12 },
    field: { display: 'grid', gap: 6 },
    fieldWide: { display: 'grid', gap: 6, gridColumn: '1 / -1' },
    label: { color: 'var(--text-muted)', fontSize: 12, fontWeight: 900 },
    input: { border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px 12px', background: 'var(--card-bg)', color: 'var(--text-main)', fontFamily: 'inherit' },
    primary: { marginTop: 14, display: 'inline-flex', gap: 8, alignItems: 'center', border: 'none', borderRadius: 8, padding: '10px 14px', background: 'var(--primary)', color: '#fff', fontWeight: 900, cursor: 'pointer' },
    notice: { marginBottom: 12, border: '1px solid #bbf7d0', background: '#dcfce7', color: '#166534', padding: 12, borderRadius: 8, fontWeight: 800 },
    error: { borderColor: '#fecaca', background: '#fee2e2', color: '#991b1b' },
    list: { display: 'grid', gap: 8 },
    item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, border: '1px solid var(--border-color)', borderRadius: 8, padding: 12 },
    activeBtn: { border: '1px solid #bbf7d0', color: '#166534', background: '#dcfce7', borderRadius: 999, padding: '5px 10px', fontWeight: 900, cursor: 'pointer' },
    inactiveBtn: { border: '1px solid #fecaca', color: '#991b1b', background: '#fee2e2', borderRadius: 999, padding: '5px 10px', fontWeight: 900, cursor: 'pointer' },
    empty: { padding: 32, textAlign: 'center', color: 'var(--text-muted)' },
};

export default AdminFoundationPage;
