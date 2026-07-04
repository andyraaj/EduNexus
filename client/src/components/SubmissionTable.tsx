import React, { useState } from 'react';
import type { Submission } from '@/services/lmsService';

interface SubmissionTableProps {
    submissions: Submission[];
    maxMarks: number;
    onGrade: (submissionId: string, marks: number, feedback: string) => Promise<void>;
}

const SubmissionTable: React.FC<SubmissionTableProps> = ({ submissions, maxMarks, onGrade }) => {
    const [gradingId, setGradingId] = useState<string | null>(null);
    const [marks, setMarks] = useState('');
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleOpenGrade = (sub: Submission) => {
        setGradingId(sub._id);
        setMarks(sub.marksAwarded !== null ? String(sub.marksAwarded) : '');
        setFeedback(sub.feedback || '');
    };

    const handleSubmitGrade = async (id: string) => {
        const parsedMarks = parseFloat(marks);
        if (isNaN(parsedMarks) || parsedMarks < 0 || parsedMarks > maxMarks) {
            alert(`Marks must be a number between 0 and ${maxMarks}`);
            return;
        }
        setIsSubmitting(true);
        try {
            await onGrade(id, parsedMarks, feedback);
            setGradingId(null);
        } catch (e: any) {
            alert(e.message || 'Error grading submission');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submissions.length === 0) {
        return <div style={styles.empty}>No submissions received yet.</div>;
    }

    return (
        <div style={styles.tableWrapper}>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Student</th>
                        <th style={styles.th}>Submitted On</th>
                        <th style={styles.th}>File</th>
                        <th style={styles.th}>Grade</th>
                        <th style={styles.th}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {submissions.map(sub => {
                        const isGrading = gradingId === sub._id;
                        const stUrl = sub.fileUrl;
                        const stDate = new Date(sub.submittedAt).toLocaleString();
                        const st = sub.student as any; // Cast for nested fields

                        return (
                            <React.Fragment key={sub._id}>
                                <tr style={styles.tr}>
                                    <td style={styles.td}>
                                        <div style={{ fontWeight: 600 }}>{st.rollNumber}</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{st.user.name}</div>
                                    </td>
                                    <td style={styles.td}>{stDate}</td>
                                    <td style={styles.td}>
                                        <a href={stUrl} target="_blank" rel="noreferrer" style={styles.link}>View File</a>
                                    </td>
                                    <td style={styles.td}>
                                        {sub.marksAwarded !== null ? (
                                            <span style={styles.badge}>{sub.marksAwarded} / {maxMarks}</span>
                                        ) : (
                                            <span style={{ ...styles.badge, background: '#fef3c7', color: '#b45309' }}>Ungraded</span>
                                        )}
                                    </td>
                                    <td style={styles.td}>
                                        <button 
                                            style={styles.gradeBtn} 
                                            onClick={() => isGrading ? setGradingId(null) : handleOpenGrade(sub)}
                                        >
                                            {isGrading ? 'Cancel' : sub.marksAwarded !== null ? 'Edit Grade' : 'Grade'}
                                        </button>
                                    </td>
                                </tr>
                                {isGrading && (
                                    <tr>
                                        <td colSpan={5} style={styles.gradeEditor}>
                                            <div style={styles.gradeForm}>
                                                <input 
                                                    type="number" 
                                                    placeholder={`Marks (Max: ${maxMarks})`} 
                                                    value={marks} 
                                                    onChange={e => setMarks(e.target.value)} 
                                                    style={styles.input}
                                                />
                                                <input 
                                                    type="text" 
                                                    placeholder="Feedback comments..." 
                                                    value={feedback} 
                                                    onChange={e => setFeedback(e.target.value)} 
                                                    style={{ ...styles.input, flex: 1 }}
                                                />
                                                <button 
                                                    style={styles.saveBtn} 
                                                    onClick={() => handleSubmitGrade(sub._id)}
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting ? 'Saving...' : 'Save'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    empty: { padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--page-bg)', borderRadius: 8, border: '1px dashed #d1d5db' },
    tableWrapper: { overflowX: 'auto', background:'var(--card-bg)', borderRadius: 12, border: '1px solid #e5e7eb' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 14, textAlign: 'left' },
    th: { padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '2px solid #e5e7eb', background: 'var(--page-bg)' },
    tr: { borderBottom: '1px solid #f3f4f6' },
    td: { padding: '12px 16px', color: 'var(--text-main)', verticalAlign: 'middle' },
    link: { color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 },
    badge: { padding: '4px 8px', borderRadius: 6, fontWeight: 700, background: '#d1fae5', color: '#047857', fontSize: 13 },
    gradeBtn: { padding: '6px 12px', background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    gradeEditor: { padding: '16px', background: 'var(--page-bg)', borderBottom: '1px solid #e2e8f0' },
    gradeForm: { display: 'flex', gap: 12, alignItems: 'center', maxWidth: 600 },
    input: { padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' },
    saveBtn: { padding: '8px 16px', background: 'var(--primary)', color:'var(--card-bg)', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
};

export default SubmissionTable;
