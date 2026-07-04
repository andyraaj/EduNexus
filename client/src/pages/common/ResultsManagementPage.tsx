import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileCheck2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCourseRoster, fetchCourses, fetchMyCoursesFaculty, type Course } from '@/services/courseService';
import {
    AssessmentType,
    ExamResult,
    approveCourseResults,
    fetchCourseResults,
    publishCourseResults,
    saveResult,
} from '@/services/resultService';

const assessmentTypes: AssessmentType[] = ['internal', 'midterm', 'final', 'practical', 'viva', 'assignment', 'quiz'];

const ResultsManagementPage: React.FC = () => {
    const { accessToken, user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [roster, setRoster] = useState<any[]>([]);
    const [results, setResults] = useState<ExamResult[]>([]);
    const [academicYear, setAcademicYear] = useState('2025-2026');
    const [semester, setSemester] = useState(1);
    const [assessmentType, setAssessmentType] = useState<AssessmentType>('internal');
    const [assessmentTitle, setAssessmentTitle] = useState('Internal Assessment 1');
    const [maxScore, setMaxScore] = useState(100);
    const [scores, setScores] = useState<Record<string, { score: string; grade: string; remarks: string }>>({});
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

    const selectedCourse = courses.find(course => course._id === selectedCourseId);

    const loadCourses = async () => {
        if (!accessToken || !user) return;
        const res = user.role === 'admin'
            ? await fetchCourses(accessToken, { limit: 200, isActive: true })
            : await fetchMyCoursesFaculty(accessToken);
        setCourses(res.courses || []);
        if (!selectedCourseId && res.courses?.[0]) {
            setSelectedCourseId(res.courses[0]._id);
            setSemester(res.courses[0].semester || 1);
        }
    };

    const loadRosterAndResults = async () => {
        if (!accessToken || !selectedCourseId) return;
        try {
            const [rosterRes, resultRes] = await Promise.all([
                fetchCourseRoster(accessToken, selectedCourseId),
                fetchCourseResults(accessToken, selectedCourseId, { academicYear, semester, assessmentType, status: 'all' }),
            ]);
            const rosterRows = (rosterRes as any).roster || [];
            setRoster(rosterRows);
            setResults(resultRes.results || []);
        } catch (err: any) {
            setError(err?.message || 'Unable to load roster/results.');
        }
    };

    useEffect(() => {
        loadCourses().catch((err) => setError(err?.message || 'Unable to load courses.'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken, user?.role]);

    useEffect(() => {
        if (selectedCourse) setSemester(selectedCourse.semester || 1);
    }, [selectedCourseId]);

    useEffect(() => {
        loadRosterAndResults();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken, selectedCourseId, academicYear, semester, assessmentType]);

    const resultByStudent = useMemo(() => {
        const map: Record<string, ExamResult> = {};
        results.forEach(result => {
            if (result.assessmentTitle === assessmentTitle) map[result.student._id] = result;
        });
        return map;
    }, [results, assessmentTitle]);

    const setStudentScore = (studentId: string, key: 'score' | 'grade' | 'remarks', value: string) => {
        setScores(prev => ({
            ...prev,
            [studentId]: {
                score: prev[studentId]?.score || '',
                grade: prev[studentId]?.grade || '',
                remarks: prev[studentId]?.remarks || '',
                [key]: value,
            },
        }));
    };

    const saveStudent = async (studentId: string) => {
        if (!accessToken || !selectedCourseId) return;
        const existing = resultByStudent[studentId];
        const draft = scores[studentId];
        const score = Number(draft?.score ?? existing?.score ?? 0);
        try {
            await saveResult(accessToken, {
                studentId,
                courseId: selectedCourseId,
                academicYear,
                semester,
                assessmentType,
                assessmentTitle,
                score,
                maxScore,
                grade: draft?.grade ?? existing?.grade ?? '',
                remarks: draft?.remarks ?? existing?.remarks ?? '',
                status: existing?.status || 'draft',
            });
            setNotice('Result saved.');
            await loadRosterAndResults();
        } catch (err: any) {
            setError(err?.message || 'Unable to save result.');
        }
    };

    const publish = async () => {
        if (!accessToken || !selectedCourseId) return;
        try {
            await publishCourseResults(accessToken, selectedCourseId, { academicYear, semester, assessmentType, assessmentTitle });
            setNotice('Results published.');
            await loadRosterAndResults();
        } catch (err: any) {
            setError(err?.message || 'Unable to publish results.');
        }
    };

    const approve = async () => {
        if (!accessToken || !selectedCourseId) return;
        try {
            await approveCourseResults(accessToken, selectedCourseId, { academicYear, semester, assessmentType, assessmentTitle });
            setNotice('Results approved for publishing.');
            await loadRosterAndResults();
        } catch (err: any) {
            setError(err?.message || 'Unable to approve results.');
        }
    };

    return (
        <div className="responsive-page responsive-results-page" style={styles.page}>
            <div className="responsive-header" style={styles.header}>
                <div>
                    <h1 style={styles.title}>Results Management</h1>
                    <p style={styles.subtitle}>Enter, review, and publish course-wise student results.</p>
                </div>
                <div className="responsive-action-row responsive-header-actions" style={styles.headerActions}>
                    <button style={styles.approveBtn} onClick={approve}><CheckCircle2 size={17} /> Approve Set</button>
                    <button style={styles.publishBtn} onClick={publish}><CheckCircle2 size={17} /> Publish Set</button>
                </div>
            </div>

            {notice && <div style={styles.notice}>{notice}</div>}
            {error && <div style={{ ...styles.notice, ...styles.error }}>{error}</div>}

            <div className="responsive-filters responsive-results-filters" style={styles.filters}>
                <Select label="Course" value={selectedCourseId} onChange={setSelectedCourseId} options={courses.map(course => ({ value: course._id, label: `${course.code} - ${course.title}` }))} />
                <Field label="Academic Year" value={academicYear} onChange={setAcademicYear} />
                <Field label="Semester" type="number" value={String(semester)} onChange={value => setSemester(Number(value))} />
                <Select label="Assessment" value={assessmentType} onChange={value => setAssessmentType(value as AssessmentType)} options={assessmentTypes.map(type => ({ value: type, label: label(type) }))} />
                <Field label="Title" value={assessmentTitle} onChange={setAssessmentTitle} />
                <Field label="Max Score" type="number" value={String(maxScore)} onChange={value => setMaxScore(Number(value))} />
            </div>

            <div className="responsive-panel responsive-results-panel" style={styles.panel}>
                <div style={styles.panelTitle}><FileCheck2 size={18} /> Roster Results</div>
                {roster.length === 0 ? (
                    <div style={styles.empty}>No enrolled students found for this course.</div>
                ) : (
                    <div className="responsive-table-wrap" style={styles.tableWrap}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Student</th>
                                    <th style={styles.th}>Score</th>
                                    <th style={styles.th}>Grade</th>
                                    <th style={styles.th}>Remarks</th>
                                    <th style={styles.th}>Status</th>
                                    <th style={styles.th}>Moderation</th>
                                    <th style={styles.th}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {roster.map((enrollment: any) => {
                                    const student = enrollment.student;
                                    const existing = resultByStudent[student?._id];
                                    const draft: { score?: string; grade?: string; remarks?: string } = scores[student?._id] || {};
                                    return (
                                        <tr key={enrollment._id}>
                                            <td style={styles.td}>
                                                <strong>{student?.name || 'Student'}</strong>
                                                <span style={styles.muted}>{student?.email || enrollment.academicYear}</span>
                                            </td>
                                            <td style={styles.td}><input style={styles.input} type="number" value={draft.score ?? existing?.score ?? ''} onChange={e => setStudentScore(student._id, 'score', e.target.value)} /></td>
                                            <td style={styles.td}><input style={styles.input} value={draft.grade ?? existing?.grade ?? ''} onChange={e => setStudentScore(student._id, 'grade', e.target.value)} /></td>
                                            <td style={styles.td}><input style={styles.input} value={draft.remarks ?? existing?.remarks ?? ''} onChange={e => setStudentScore(student._id, 'remarks', e.target.value)} /></td>
                                            <td style={styles.td}><span style={existing?.status === 'published' ? styles.published : styles.draft}>{existing?.status || 'draft'}</span></td>
                                            <td style={styles.td}><span style={existing?.moderationStatus === 'approved' ? styles.published : styles.draft}>{existing?.moderationStatus || 'pending'}</span></td>
                                            <td style={styles.td}><button style={styles.saveBtn} onClick={() => saveStudent(student._id)}>Save</button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

const label = (value: string) => value.replace(/^\w/, c => c.toUpperCase());

const Field = ({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) => (
    <label style={styles.field}><span style={styles.label}>{label}</span><input style={styles.input} type={type} value={value} onChange={e => onChange(e.target.value)} /></label>
);

const Select = ({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) => (
    <label style={styles.field}><span style={styles.label}>{label}</span><select style={styles.input} value={value} onChange={e => onChange(e.target.value)}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
);

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1240, margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 18 },
    title: { margin: 0, fontSize: 28, fontWeight: 900, color: 'var(--text-main)' },
    subtitle: { margin: '6px 0 0', color: 'var(--text-muted)' },
    publishBtn: { display: 'flex', alignItems: 'center', gap: 8, border: 'none', borderRadius: 8, padding: '10px 14px', background: '#16a34a', color: '#fff', fontWeight: 900, cursor: 'pointer' },
    approveBtn: { display: 'flex', alignItems: 'center', gap: 8, border: 'none', borderRadius: 8, padding: '10px 14px', background: '#2563eb', color: '#fff', fontWeight: 900, cursor: 'pointer' },
    headerActions: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    filters: { display: 'grid', gridTemplateColumns: '2fr repeat(5, minmax(120px, 1fr))', gap: 10, marginBottom: 14 },
    field: { display: 'grid', gap: 6 },
    label: { color: 'var(--text-muted)', fontSize: 12, fontWeight: 900 },
    input: { width: '100%', boxSizing: 'border-box', border: '1px solid var(--border-color)', borderRadius: 8, padding: '9px 10px', background: 'var(--card-bg)', color: 'var(--text-main)' },
    panel: { background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 16 },
    panelTitle: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, color: 'var(--text-main)', marginBottom: 12 },
    tableWrap: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: 920 },
    th: { textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 900 },
    td: { padding: '10px 12px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: 13 },
    muted: { display: 'block', color: 'var(--text-muted)', fontSize: 12, marginTop: 3 },
    published: { borderRadius: 999, background: '#dcfce7', color: '#166534', padding: '4px 8px', fontWeight: 900 },
    draft: { borderRadius: 999, background: '#fef3c7', color: '#92400e', padding: '4px 8px', fontWeight: 900 },
    saveBtn: { border: '1px solid #bfdbfe', background: '#dbeafe', color: '#1d4ed8', borderRadius: 8, padding: '7px 10px', fontWeight: 900, cursor: 'pointer' },
    notice: { marginBottom: 12, border: '1px solid #bbf7d0', background: '#dcfce7', color: '#166534', padding: 12, borderRadius: 8, fontWeight: 800 },
    error: { borderColor: '#fecaca', background: '#fee2e2', color: '#991b1b' },
    empty: { padding: 32, textAlign: 'center', color: 'var(--text-muted)' },
};

export default ResultsManagementPage;
