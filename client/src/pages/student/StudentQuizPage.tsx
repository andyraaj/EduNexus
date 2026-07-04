import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMyEnrollments, Course } from '@/services/courseService';
import { fetchQuizzes, fetchMyAttempts, startQuiz, Quiz, QuizAttempt } from '@/services/quizService';
import { useNavigate, useLocation } from 'react-router-dom';
import QuizResultCard from '@/components/QuizResultCard';

const StudentQuizPage: React.FC = () => {
    const { accessToken } = useAuth();
    const navigate = useNavigate();
    
    // State
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [myAttempts, setMyAttempts] = useState<QuizAttempt[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const location = useLocation();
    
    // UI Tabs: 'available' vs 'history'
    const [tab, setTab] = useState<'available' | 'history'>(location.state?.tab || 'available');

    // Init
    useEffect(() => {
        if (!accessToken) return;
        fetchMyEnrollments(accessToken).then(res => setCourses(res.enrollments.map(e => e.course)));
        fetchMyAttempts(accessToken).then(res => setMyAttempts(res.attempts)).catch(console.error);
    }, [accessToken]);

    // Fetch active quizzes when course changes
    useEffect(() => {
        if (!accessToken || !selectedCourse) {
            setQuizzes([]);
            return;
        }
        setIsLoading(true);
        fetchQuizzes(accessToken, selectedCourse._id)
            .then(res => setQuizzes(res.quizzes))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [accessToken, selectedCourse]);

    const handleStartQuiz = async (quiz: Quiz) => {
        if (!accessToken) return;
        
        // Check if already attempted
        const pastAttempt = myAttempts.find(a => {
            const aQuiz = a.quiz as any;
            return aQuiz === quiz._id || aQuiz?._id === quiz._id;
        });

        if (pastAttempt && pastAttempt.endTime) {
            alert('You have already completed this quiz.');
            return;
        }

        if (window.confirm(`Start "${quiz.title}"? \nTime Limit: ${quiz.timeLimitMinutes} Mins.\nThe timer will begin immediately.`)) {
            try {
                const res = await startQuiz(accessToken, quiz._id);
                // Redirect to the dedicated attempt runner page
                navigate(`/student/quizzes/attempt/${quiz._id}`, { state: { attemptId: res.attempt._id, quiz } });
            } catch (e: any) {
                alert(e.message || 'Could not start quiz.');
            }
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.headerRow}>
                <div>
                    <h1 style={styles.title}>My Assessments</h1>
                    <p style={styles.subtitle}>Take active quizzes and review your past performance</p>
                </div>
            </div>

            <div style={styles.tabsMenu}>
                <button style={tab === 'available' ? styles.activeTab : styles.tab} onClick={() => setTab('available')}>Available Quizzes</button>
                <button style={tab === 'history' ? styles.activeTab : styles.tab} onClick={() => setTab('history')}>My History</button>
            </div>

            {tab === 'available' && (
                <div>
                    <div style={{ marginBottom: 32 }}>
                        <label style={styles.label}>Filter by Enrolled Course</label>
                        <select
                            style={styles.select}
                            value={selectedCourse?._id || ''}
                            onChange={e => {
                                const c = courses.find(x => x._id === e.target.value);
                                setSelectedCourse(c || null);
                            }}
                        >
                            <option value="">-- Choose a Course --</option>
                            {courses.map(c => <option key={c._id} value={c._id}>{c.code} - {c.title}</option>)}
                        </select>
                    </div>

                    {!selectedCourse ? (
                        <div style={styles.empty}>Select a course to see its active modules.</div>
                    ) : isLoading ? (
                        <div style={styles.empty}>Loading active modules...</div>
                    ) : quizzes.length === 0 ? (
                        <div style={styles.empty}>No active quizzes exist for this course.</div>
                    ) : (
                        <div style={styles.grid}>
                            {quizzes.map(q => {
                                const isAttempted = myAttempts.some(a => {
                                    const aq = a.quiz as any;
                                    return (aq === q._id || aq?._id === q._id) && a.endTime; // finished
                                });

                                return (
                                    <div key={q._id} style={styles.quizCard}>
                                        <h3 style={styles.qTitle}>{q.title}</h3>
                                        <p style={styles.qMeta}>
                                            ⏱️ {q.timeLimitMinutes} Mins &nbsp; • &nbsp; 📝 {q.questions?.length || 0} Questions
                                        </p>
                                        <p style={styles.qDesc}>{q.description || 'No instructions provided.'}</p>
                                        
                                        {isAttempted ? (
                                            <button style={styles.doneBtn} disabled>Completed ✅</button>
                                        ) : (
                                            <button style={styles.startBtn} onClick={() => handleStartQuiz(q)}>Start Quiz</button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {tab === 'history' && (
                <div style={styles.grid}>
                    {myAttempts.length === 0 ? (
                        <div style={{ ...styles.empty, gridColumn: '1 / -1' }}>You have not completed any quizzes yet.</div>
                    ) : myAttempts.map(attempt => (
                        <QuizResultCard key={attempt._id} attempt={attempt} />
                    ))}
                </div>
            )}
            
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1000, margin: '0 auto', fontFamily: "'Inter', sans-serif" },
    headerRow: { marginBottom: 32 },
    title: { fontSize: 26, fontWeight: 700, color: 'var(--text-main)', margin: 0 },
    subtitle: { fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' },
    
    tabsMenu: { display: 'flex', gap: 12, borderBottom: '2px solid #e5e7eb', marginBottom: '2rem' },
    tab: { background: 'none', border: 'none', padding: '0 16px 12px', fontSize: 15, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', marginBottom: -2 },
    activeTab: { background: 'none', border: 'none', padding: '0 16px 12px', fontSize: 15, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', borderBottom: '3px solid var(--primary)', marginBottom: -2 },
    
    label: { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', marginBottom: 8 },
    select: { padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 15, background:'var(--card-bg)', width: '100%', maxWidth: 400 },
    
    empty: { padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--page-bg)', borderRadius: 12, border: '1px dashed #d1d5db' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' },
    
    quizCard: { padding: '20px', background:'var(--card-bg)', borderRadius: 12, border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' },
    qTitle: { margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text-main)' },
    qMeta: { margin: '0 0 12px', fontSize: 13, color: 'var(--primary)', fontWeight: 600 },
    qDesc: { margin: '0 0 20px', fontSize: 14, color: 'var(--text-muted)', flex: 1 },
    startBtn: { padding: '10px', background: '#10b981', color:'var(--card-bg)', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'center', width: '100%' },
    doneBtn: { padding: '10px', background: 'var(--border-color)', color: 'var(--text-main)', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontWeight: 600, textAlign: 'center', width: '100%', cursor: 'not-allowed' },
};

export default StudentQuizPage;
