import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchQuizAttemptsForFaculty, fetchQuizzes, QuizAttempt, Quiz } from '@/services/quizService';

const FacultyQuizAttemptsPage: React.FC = () => {
    const { quizId } = useParams<{ quizId: string }>();
    const { accessToken } = useAuth();
    const navigate = useNavigate();

    const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
    const [quizTitle, setQuizTitle] = useState('Loading...');
    const [maxMarks, setMaxMarks] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!accessToken || !quizId) return;

        const loadData = async () => {
            try {
                const res = await fetchQuizAttemptsForFaculty(accessToken, quizId);
                setAttempts(res.attempts);
                
                // For simplicity we extract total questions from the first attempt if available,
                // or we could normally fetch the quiz details. Since our quizService handles getQuizzesByCourse, we might need a specific getById.
                // Assuming students' score format covers max marks. Let's inspect the first attempt.
                if (res.attempts.length > 0 && res.attempts[0].quiz) {
                   const q = res.attempts[0].quiz as any;
                   setQuizTitle(q.title || `Quiz Results`);
                   setMaxMarks(q.questions?.length || 0); // Need exact schema mapping
                }
            } catch (e: any) {
                setError(e.message || 'Failed to fetch attempts.');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [accessToken, quizId]);

    const getGradeColor = (score: number) => {
        if (maxMarks === 0) return 'var(--text-main)';
        const p = (score / maxMarks) * 100;
        if (p < 40) return '#dc2626';
        if (p < 70) return '#d97706';
        return '#047857';
    };

    return (
        <div style={styles.page}>
            <div style={{ marginBottom: 24 }}>
                <button style={styles.backBtn} onClick={() => navigate('/faculty/quizzes')}>← Back to Quizzes</button>
            </div>

            <h1 style={styles.title}>Results: {quizTitle}</h1>
            <p style={styles.subtitle}>Review all student attempts and scores.</p>

            {isLoading ? (
                <div style={styles.empty}>Loading submissions...</div>
            ) : error ? (
                <div style={styles.emptyError}>{error}</div>
            ) : attempts.length === 0 ? (
                <div style={styles.empty}>No students have attempted this quiz yet.</div>
            ) : (
                <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Student Roll No</th>
                                <th style={styles.th}>Name</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.th}>Time Taken</th>
                                <th style={styles.th}>Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attempts.map(a => {
                                const st = a.student as any;
                                const isFinished = !!a.endTime;
                                const timeTaken = isFinished 
                                    ? `${Math.round((new Date(a.endTime!).getTime() - new Date(a.startTime).getTime()) / 60000)} mins`
                                    : 'In Progress';
                                
                                return (
                                    <tr key={a._id} style={styles.tr}>
                                        <td style={styles.td}>{st.rollNumber}</td>
                                        <td style={{ ...styles.td, color: 'var(--text-main)' }}>{st?.name || 'Student'}</td>
                                        <td style={styles.td}>
                                            <span style={isFinished ? styles.badgeDone : styles.badgeRunning}>
                                                {isFinished ? 'Completed' : 'Running'}
                                            </span>
                                        </td>
                                        <td style={styles.td}>{timeTaken}</td>
                                        <td style={{ ...styles.td, fontWeight: 700, color: getGradeColor(a.score) }}>
                                            {a.score} {maxMarks > 0 ? `/ ${maxMarks}` : ''}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1000, margin: '0 auto', fontFamily: "'Inter', sans-serif" },
    backBtn: { padding: '8px 16px', borderRadius: 8, background: 'var(--border-color)', color: 'var(--text-main)', fontWeight: 600, border: '1px solid #d1d5db', cursor: 'pointer' },
    title: { fontSize: 26, fontWeight: 700, color: 'var(--text-main)', margin: 0 },
    subtitle: { fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 24px' },
    
    empty: { padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--page-bg)', borderRadius: 12, border: '1px dashed #d1d5db' },
    emptyError: { padding: '4rem', textAlign: 'center', color: '#dc2626', background: '#fef2f2', borderRadius: 12, border: '1px dashed #fecaca' },
    
    tableWrapper: { overflowX: 'auto', background:'var(--card-bg)', borderRadius: 12, border: '1px solid #e5e7eb' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 14, textAlign: 'left' },
    th: { padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '2px solid #e5e7eb', background: 'var(--page-bg)' },
    tr: { borderBottom: '1px solid #f3f4f6' },
    td: { padding: '12px 16px', color: 'var(--text-main)', verticalAlign: 'middle' },
    
    badgeDone: { padding: '4px 8px', borderRadius: 6, fontWeight: 700, background: '#d1fae5', color: '#047857', fontSize: 12 },
    badgeRunning: { padding: '4px 8px', borderRadius: 6, fontWeight: 700, background: '#fef3c7', color: '#b45309', fontSize: 12 },
};

export default FacultyQuizAttemptsPage;
