import React from 'react';
import type { Assignment, Submission } from '@/services/lmsService';

interface AssignmentCardProps {
    assignment: Assignment;
    mySubmission?: Submission | null; // Passed to students to show submission status
    isFaculty?: boolean;
    onDelete?: (id: string) => void;
    onViewSubmissions?: (assignment: Assignment) => void;
    onClickSubmit?: (assignment: Assignment) => void;
}

const AssignmentCard: React.FC<AssignmentCardProps> = ({
    assignment, mySubmission, isFaculty, onDelete, onViewSubmissions, onClickSubmit
}) => {
    
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();
    const isPastDue = now > dueDate;
    
    let statusBadge = null;
    if (!isFaculty) {
        if (mySubmission) {
            statusBadge = <span style={{ ...styles.badge, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>Submitted</span>;
        } else if (isPastDue) {
            statusBadge = <span style={{ ...styles.badge, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>Missing</span>;
        } else {
            statusBadge = <span style={{ ...styles.badge, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>Pending</span>;
        }
    }

    return (
        <div style={styles.card}>
            <div style={styles.header}>
                <div>
                    <h4 style={styles.title}>{assignment.title}</h4>
                    <p style={styles.meta}>Due: {dueDate.toLocaleString()}</p>
                </div>
                {statusBadge}
            </div>
            
            <p style={styles.desc}>{assignment.description}</p>
            
            <div style={styles.footer}>
                <div style={styles.stats}>
                    <span style={styles.marks}>Max Marks: {assignment.maxMarks}</span>
                    {assignment.attachmentUrl && (
                        <a href={assignment.attachmentUrl} target="_blank" rel="noreferrer" style={styles.link}>
                            View Attachment
                        </a>
                    )}
                </div>

                <div style={styles.actions}>
                    {isFaculty ? (
                        <>
                            {onViewSubmissions && (
                                <button style={styles.primaryBtn} onClick={() => onViewSubmissions(assignment)}>
                                    View Submissions
                                </button>
                            )}
                            {onDelete && (
                                <button style={styles.deleteBtn} onClick={() => onDelete(assignment._id)}>🗑️</button>
                            )}
                        </>
                    ) : (
                        onClickSubmit && (
                            <button 
                                style={{ ...styles.primaryBtn, background: mySubmission ? 'var(--border-color)' : 'var(--primary)', color: mySubmission ? 'var(--text-main)' :'var(--card-bg)' }} 
                                onClick={() => onClickSubmit(assignment)}
                            >
                                {mySubmission ? 'Update Submission' : 'Submit Assignment'}
                            </button>
                        )
                    )}
                </div>
            </div>
            
            {/* Student Feedback Display */}
            {!isFaculty && mySubmission && mySubmission.marksAwarded !== null && (
                <div style={styles.feedbackBox}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Graded: {mySubmission.marksAwarded} / {assignment.maxMarks}</div>
                    {mySubmission.feedback && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>"{mySubmission.feedback}"</div>}
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    card: { background:'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-color)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 12 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    title: { margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-main)' },
    meta: { margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 },
    badge: { padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 },
    desc: { margin: 0, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5, whiteSpace: 'pre-wrap' },
    footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border-color)' },
    stats: { display: 'flex', gap: 16, alignItems: 'center', fontSize: 13 },
    marks: { fontWeight: 600, color: 'var(--text-main)' },
    link: { color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 },
    actions: { display: 'flex', gap: 8 },
    primaryBtn: { padding: '8px 16px', background: 'var(--primary)', color:'var(--card-bg)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    deleteBtn: { padding: '8px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer' },
    feedbackBox: { marginTop: 12, padding: '12px', background: 'var(--page-bg)', borderRadius: 8, border: '1px dashed var(--border-color)' }
};

export default AssignmentCard;
