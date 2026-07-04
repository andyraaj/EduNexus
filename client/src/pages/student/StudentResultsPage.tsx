import React, { useEffect, useState } from 'react';
import { Download, FileText, Ticket } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
    ExamResult,
    downloadMyMarksheet,
    downloadMyTranscript,
    fetchMyHallTicket,
    fetchMyResults,
} from '@/services/resultService';

const StudentResultsPage: React.FC = () => {
    const { accessToken } = useAuth();
    const [results, setResults] = useState<ExamResult[]>([]);
    const [summary, setSummary] = useState({ totalScore: 0, totalMax: 0, percentage: 0, result: '-' });
    const [academic, setAcademic] = useState({ totalCredits: 0, gpa: 0 });
    const [events, setEvents] = useState<any[]>([]);
    const [academicYear, setAcademicYear] = useState('2025-2026');
    const [semester, setSemester] = useState(1);
    const [error, setError] = useState('');

    const load = async () => {
        if (!accessToken) return;
        try {
            const [resultRes, hallTicketRes] = await Promise.all([
                fetchMyResults(accessToken, { academicYear, semester }),
                fetchMyHallTicket(accessToken),
            ]);
            setResults(resultRes.results || []);
            setSummary(resultRes.summary);
            setAcademic(resultRes.academic || { totalCredits: 0, gpa: 0 });
            setEvents(hallTicketRes.events || []);
        } catch (err: any) {
            setError(err?.message || 'Unable to load results.');
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken, academicYear, semester]);

    const download = async () => {
        if (!accessToken) return;
        await downloadMyMarksheet(accessToken, semester, academicYear);
    };

    const downloadTranscript = async () => {
        if (!accessToken) return;
        await downloadMyTranscript(accessToken, academicYear);
    };

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Results & Hall Ticket</h1>
                    <p style={styles.subtitle}>Published marks, academic standing, and upcoming exam schedule.</p>
                </div>
                <div style={styles.actions}>
                    <button style={styles.downloadBtn} onClick={download}><Download size={17} /> Marksheet PDF</button>
                    <button style={styles.secondaryBtn} onClick={downloadTranscript}><Download size={17} /> Transcript PDF</button>
                </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.filters}>
                <label style={styles.field}><span>Academic Year</span><input value={academicYear} onChange={e => setAcademicYear(e.target.value)} /></label>
                <label style={styles.field}><span>Semester</span><input type="number" value={semester} onChange={e => setSemester(Number(e.target.value))} /></label>
            </div>

            <div style={styles.kpis}>
                <Kpi label="Total" value={`${summary.totalScore}/${summary.totalMax}`} />
                <Kpi label="Percentage" value={`${summary.percentage}%`} />
                <Kpi label="Result" value={summary.result} />
                <Kpi label="GPA" value={String(academic.gpa)} />
                <Kpi label="Credits" value={String(academic.totalCredits)} />
            </div>

            <section style={styles.panel}>
                <div style={styles.panelTitle}><FileText size={18} /> Published Results</div>
                {results.length === 0 ? (
                    <div style={styles.empty}>No published results for this filter yet.</div>
                ) : (
                    <div style={styles.grid}>
                        {results.map(result => (
                            <article key={result._id} style={styles.card}>
                                <span style={styles.pill}>{result.assessmentType}</span>
                                <h3>{result.course.code} - {result.course.title}</h3>
                                <p>{result.assessmentTitle}</p>
                                <strong>{result.score}/{result.maxScore}</strong>
                                <small>Grade: {result.grade || '-'} · {result.remarks || 'No remarks'}</small>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section style={styles.panel}>
                <div style={styles.panelTitle}><Ticket size={18} /> Upcoming Exam Hall Ticket</div>
                {events.length === 0 ? (
                    <div style={styles.empty}>No upcoming published exam events.</div>
                ) : (
                    <div style={styles.list}>
                        {events.map(event => (
                            <div key={event._id} style={styles.event}>
                                <div>
                                    <strong>{event.title}</strong>
                                    <span>{event.course ? `${event.course.code} - ${event.course.title}` : 'Institution wide'}</span>
                                </div>
                                <div style={styles.eventMeta}>
                                    {new Date(event.startsAt).toLocaleString()} · {event.venue || 'Venue pending'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

const Kpi = ({ label, value }: { label: string; value: string }) => (
    <div style={styles.kpi}><span>{label}</span><strong>{value}</strong></div>
);

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1180, margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 18 },
    title: { margin: 0, fontSize: 28, fontWeight: 900, color: 'var(--text-main)' },
    subtitle: { margin: '6px 0 0', color: 'var(--text-muted)' },
    downloadBtn: { display: 'flex', alignItems: 'center', gap: 8, border: 'none', borderRadius: 8, padding: '10px 14px', background: 'var(--primary)', color: '#fff', fontWeight: 900, cursor: 'pointer' },
    secondaryBtn: { display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px 14px', background: 'var(--card-bg)', color: 'var(--text-main)', fontWeight: 900, cursor: 'pointer' },
    actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
    filters: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 },
    field: { display: 'grid', gap: 6, color: 'var(--text-muted)', fontSize: 12, fontWeight: 900 },
    kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 },
    kpi: { border: '1px solid var(--border-color)', background: 'var(--card-bg)', borderRadius: 8, padding: 16 },
    panel: { background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 16, marginBottom: 14 },
    panelTitle: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, color: 'var(--text-main)', marginBottom: 12 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 },
    card: { border: '1px solid var(--border-color)', borderRadius: 8, padding: 14 },
    pill: { display: 'inline-block', borderRadius: 999, padding: '4px 8px', background: '#dbeafe', color: '#1d4ed8', fontSize: 11, fontWeight: 900 },
    list: { display: 'grid', gap: 10 },
    event: { display: 'flex', justifyContent: 'space-between', gap: 12, border: '1px solid var(--border-color)', borderRadius: 8, padding: 12 },
    eventMeta: { color: 'var(--text-muted)', fontSize: 13 },
    empty: { padding: 32, textAlign: 'center', color: 'var(--text-muted)' },
    error: { marginBottom: 12, border: '1px solid #fecaca', background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, fontWeight: 800 },
};

export default StudentResultsPage;
