import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { startQuiz, submitQuiz, Quiz, QuizAttempt } from '@/services/quizService';
import QuizRunner from '@/components/QuizRunner';

const QuizAttemptPage: React.FC = () => {
    const { id } = useParams<{ id: string }>(); // quizId
    const { state } = useLocation();
    const { accessToken } = useAuth();
    const navigate = useNavigate();

    const [quiz, setQuiz] = useState<Quiz | null>(state?.quiz || null);
    const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!accessToken || !id) return;
        
        const initAttempt = async () => {
            try {
                // startQuiz safely returns the active attempt if already started
                const res = await startQuiz(accessToken, id);
                setAttempt(res.attempt);
                
                // If quiz state wasn't passed via routing, we could fetch it here.
                // Assuming startQuiz response doesn't populate quiz fully right now, but
                // normally we'd fetch the quiz details if it's null.
                if (!quiz) {
                    // Quick fix: user must navigate from StudentQuizPage to ensure Quiz state is present.
                    // Otherwise we'd need a specific fetchQuiz endpoint.
                    setError('Invalid navigation state. Please start quiz from the dashboard.');
                }
            } catch (e: any) {
                setError(e.message || 'Failed to initialize quiz attempt.');
            } finally {
                setIsLoading(false);
            }
        };

        initAttempt();
    }, [accessToken, id]);

    const handleFinalSubmit = async (answers: Record<string, number>) => {
        if (!accessToken || !id) return;
        try {
            await submitQuiz(accessToken, id, answers);
            alert('Quiz submitted successfully!');
            navigate('/student/quizzes', { state: { tab: 'history' } });
        } catch (e: any) {
            alert(e.message || 'Error occurred while submitting.');
            navigate('/student/quizzes');
        }
    };

    if (isLoading) {
        return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 18 }}>Setting up your exam environment...</div>;
    }

    if (error || !quiz || !attempt) {
        return (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
                <h2 style={{ color: '#ef4444', marginBottom: 16 }}>Unable to load quiz</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{error}</p>
                <button 
                    onClick={() => navigate('/student/quizzes')}
                    style={{ padding: '10px 20px', background: 'var(--primary)', color:'var(--card-bg)', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    // Full screen takeover container
    return (
        <div style={{ position: 'fixed', inset: 0, background: '#f1f5f9', overflowY: 'auto', padding: '40px 16px', zIndex: 9999 }}>
            <div style={{ maxWidth: 800, margin: '0 auto', marginBottom: 20 }}>
                <button 
                    onClick={() => {
                        if (window.confirm('Leaving this page will NOT pause the timer. Are you sure?')) {
                            navigate('/student/quizzes');
                        }
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                    ← Exit to Dashboard
                </button>
            </div>
            
            <QuizRunner 
                quiz={quiz} 
                attempt={attempt} 
                onSubmit={handleFinalSubmit} 
            />
        </div>
    );
};

export default QuizAttemptPage;
