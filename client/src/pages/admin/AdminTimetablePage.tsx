import React, { useEffect, useState } from 'react';
import { CalendarClock, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCourses, type Course } from '@/services/courseService';
import api from '@/services/api';
import { timetableService, type TimetableEntry } from '@/services/timetableService';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const defaultForm = {
    course: '',
    faculty: '',
    dayOfWeek: 'Monday',
    startTime: '09:00',
    endTime: '10:00',
    classroom: '',
    semester: '1',
    academicYear: '2025-2026',
};

const AdminTimetablePage: React.FC = () => {
    const { accessToken } = useAuth();
    const [entries, setEntries] = useState<TimetableEntry[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [faculties, setFaculties] = useState<any[]>([]);
    const [form, setForm] = useState(defaultForm);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

    const load = async () => {
        if (!accessToken) return;
        try {
            const [tt, courseRes, facultyRes] = await Promise.all([
                timetableService.getAllTimetable(accessToken, { academicYear: form.academicYear }),
                fetchCourses(accessToken, { limit: 200, isActive: true }),
                api.get<any>('/faculty', accessToken),
            ]);
            setEntries(tt.timetable || []);
            setCourses(courseRes.courses || []);
            setFaculties(facultyRes.data?.faculties || facultyRes.faculties || facultyRes.data || []);
        } catch (err: any) {
            setError(err?.message || 'Unable to load timetable.');
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) return;
        setError('');
        setNotice('');
        try {
            await timetableService.createTimetable(accessToken, {
                ...form,
                semester: Number(form.semester),
            });
            setNotice('Timetable entry created.');
            setForm({ ...defaultForm, academicYear: form.academicYear });
            await load();
        } catch (err: any) {
            setError(err?.message || 'Unable to create timetable entry. Check faculty, classroom, or semester conflicts.');
        }
    };

    const deactivate = async (entry: TimetableEntry) => {
        if (!accessToken || !window.confirm('Deactivate this timetable entry?')) return;
        try {
            await timetableService.deleteTimetable(accessToken, entry._id);
            setNotice('Timetable entry deactivated.');
            await load();
        } catch (err: any) {
            setError(err?.message || 'Unable to deactivate entry.');
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Timetable Planner</h1>
                    <p style={styles.subtitle}>Create class schedules with faculty, classroom, and semester conflict detection.</p>
                </div>
                <div style={styles.badge}><CalendarClock size={18} /> {entries.length} active entries</div>
            </div>

            {notice && <div style={styles.notice}>{notice}</div>}
            {error && <div style={{ ...styles.notice, ...styles.error }}>{error}</div>}

            <div style={styles.split}>
                <form style={styles.panel} onSubmit={submit}>
                    <div style={styles.panelTitle}><Plus size={18} /> New Timetable Entry</div>
                    <Select label="Course" value={form.course} onChange={v => setForm({ ...form, course: v })} options={courses.map(c => ({ value: c._id, label: `${c.code} - ${c.title}` }))} />
                    <Select label="Faculty" value={form.faculty} onChange={v => setForm({ ...form, faculty: v })} options={faculties.map(f => ({ value: f._id, label: f.name || f.email || f.employeeId }))} />
                    <Select label="Day" value={form.dayOfWeek} onChange={v => setForm({ ...form, dayOfWeek: v })} options={days.map(d => ({ value: d, label: d }))} />
                    <div style={styles.row}>
                        <Field label="Start" type="time" value={form.startTime} onChange={v => setForm({ ...form, startTime: v })} />
                        <Field label="End" type="time" value={form.endTime} onChange={v => setForm({ ...form, endTime: v })} />
                    </div>
                    <div style={styles.row}>
                        <Field label="Classroom" value={form.classroom} onChange={v => setForm({ ...form, classroom: v })} />
                        <Field label="Semester" type="number" value={form.semester} onChange={v => setForm({ ...form, semester: v })} />
                    </div>
                    <Field label="Academic Year" value={form.academicYear} onChange={v => setForm({ ...form, academicYear: v })} />
                    <button style={styles.primary}>Create Entry</button>
                </form>

                <div style={styles.panel}>
                    <div style={styles.panelTitle}>Weekly Schedule</div>
                    {entries.length === 0 ? (
                        <div style={styles.empty}>No timetable entries yet.</div>
                    ) : (
                        <div style={styles.list}>
                            {entries.map(entry => (
                                <div key={entry._id} style={styles.item}>
                                    <div>
                                        <strong>{entry.dayOfWeek} · {entry.startTime}-{entry.endTime}</strong>
                                        <span>{entry.course?.code} - {entry.course?.title}</span>
                                        <small>{entry.faculty?.name || 'Faculty'} · {entry.classroom} · Semester {entry.semester}</small>
                                    </div>
                                    <button style={styles.deactivate} onClick={() => deactivate(entry)}>Deactivate</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Field = ({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) => (
    <label style={styles.field}><span style={styles.label}>{label}</span><input style={styles.input} required type={type} value={value} onChange={e => onChange(e.target.value)} /></label>
);

const Select = ({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) => (
    <label style={styles.field}>
        <span style={styles.label}>{label}</span>
        <select style={styles.input} required value={value} onChange={e => onChange(e.target.value)}>
            <option value="">Select</option>
            {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
    </label>
);

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1220, margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 },
    title: { margin: 0, fontSize: 28, fontWeight: 900, color: 'var(--text-main)' },
    subtitle: { margin: '6px 0 0', color: 'var(--text-muted)' },
    badge: { display: 'flex', gap: 8, alignItems: 'center', border: '1px solid #bfdbfe', background: '#dbeafe', color: '#1d4ed8', borderRadius: 8, padding: '9px 12px', fontWeight: 900 },
    split: { display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: 14 },
    panel: { display: 'grid', gap: 12, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 16 },
    panelTitle: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, color: 'var(--text-main)' },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
    field: { display: 'grid', gap: 6 },
    label: { color: 'var(--text-muted)', fontSize: 12, fontWeight: 900 },
    input: { border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px 12px', background: 'var(--card-bg)', color: 'var(--text-main)' },
    primary: { border: 'none', borderRadius: 8, padding: '10px 14px', background: 'var(--primary)', color: '#fff', fontWeight: 900, cursor: 'pointer' },
    notice: { marginBottom: 12, border: '1px solid #bbf7d0', background: '#dcfce7', color: '#166534', padding: 12, borderRadius: 8, fontWeight: 800 },
    error: { borderColor: '#fecaca', background: '#fee2e2', color: '#991b1b' },
    list: { display: 'grid', gap: 8 },
    item: { display: 'flex', justifyContent: 'space-between', gap: 12, border: '1px solid var(--border-color)', borderRadius: 8, padding: 12 },
    deactivate: { border: '1px solid #fecaca', color: '#991b1b', background: '#fee2e2', borderRadius: 8, padding: '7px 10px', fontWeight: 900, cursor: 'pointer', alignSelf: 'center' },
    empty: { padding: 32, textAlign: 'center', color: 'var(--text-muted)' },
};

export default AdminTimetablePage;
