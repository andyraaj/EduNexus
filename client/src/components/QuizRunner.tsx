import React, { useState, useEffect } from 'react';
import type { Quiz, QuizAttempt } from '@/services/quizService';

interface QuizRunnerProps {
    quiz: Quiz;
    attempt: QuizAttempt;
    onSubmit: (answers: Record<string, number>) => Promise<void>;
}

const QuizRunner: React.FC<QuizRunnerProps> = ({ quiz, attempt, onSubmit }) => {
    const [answers, setAnswers] = useState<Record<string, number>>(attempt.answers || {});
    const [currentIdx, setCurrentIdx] = useState(0);
    const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Calculate remaining time based on server startTime
        const startTime = new Date(attempt.startTime).getTime();
        const durationMs = quiz.timeLimitMinutes * 60 * 1000;
        const endTime = startTime + durationMs;
        
        const updateTimer = () => {
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
            setTimeLeftSeconds(remaining);
            
            if (remaining === 0) {
                // Time up -> auto submit
                clearInterval(interval);
                handleFinalSubmit(answers); // Uses current state snapshot in this closure
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attempt.startTime, quiz.timeLimitMinutes]);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleOptionSelect = (qId: string, optIdx: number) => {
        setAnswers(prev => ({ ...prev, [qId]: optIdx }));
    };

    const handleFinalSubmit = async (finalAnswers: Record<string, number> = answers) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onSubmit(finalAnswers);
        } catch (e: any) {
            alert(e.message || 'Auto-submit failed. Please try again or refresh.');
            setIsSubmitting(false); // only re-enable if it failed
        }
    };

    const currentQuestion = quiz.questions[currentIdx];
    const isLast = currentIdx === quiz.questions.length - 1;

    // Prevent rendering if time is 0 (auto-submit should trigger)
    if (timeLeftSeconds <= 0 && isSubmitting) {
        return <div style={styles.loader}>Submitting your exam...</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.topBar}>
                <h2 style={styles.title}>{quiz.title}</h2>
                <div style={timeLeftSeconds < 60 ? styles.timerWarning : styles.timer}>
                    ⏱️ Time Remaining: {formatTime(timeLeftSeconds)}
                </div>
            </div>

            <div style={styles.progressContainer}>
                <div style={styles.progressText}>Question {currentIdx + 1} of {quiz.questions.length}</div>
                <div style={styles.progressBarBg}>
                    <div style={{ ...styles.progressBarFill, width: `${((currentIdx + 1) / quiz.questions.length) * 100}%` }} />
                </div>
            </div>

            <div style={styles.questionCard}>
                <h3 style={styles.questionText}>{currentQuestion.text}</h3>
                
                <div style={styles.optionsGrid}>
                    {currentQuestion.options.map((opt, oIdx) => {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
                        const qId = currentQuestion._id || currentQuestion.questionId!;
                        const isSelected = answers[qId] === oIdx;
                        
                        return (
                            <div 
                                key={oIdx} 
                                style={isSelected ? styles.optionSelected : styles.optionBox}
                                onClick={() => handleOptionSelect(qId, oIdx)}
                            >
                                <div style={styles.optionRadio}>
                                    {isSelected && <div style={styles.optionRadioInner} />}
                                </div>
                                <span style={styles.optionText}>{opt}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div style={styles.footer}>
                <button 
                    disabled={currentIdx === 0} 
                    onClick={() => setCurrentIdx(prev => prev - 1)}
                    style={currentIdx === 0 ? styles.navBtnDisabled : styles.navBtn}
                >
                    ← Previous
                </button>
                
                {isLast ? (
                    <button 
                        onClick={() => {
                            if (window.confirm('Are you sure you want to finish and submit the quiz?')) {
                                handleFinalSubmit();
                            }
                        }}
                        style={styles.submitBtn}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Exam'}
                    </button>
                ) : (
                    <button 
                        onClick={() => setCurrentIdx(prev => prev + 1)}
                        style={styles.navBtnPrimary}
                    >
                        Next →
                    </button>
                )}
            </div>
            
            <div style={styles.mapGrid}>
                {quiz.questions.map((q, idx) => {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
                    const qId = q._id || q.questionId!;
                    const isAnswered = answers[qId] !== undefined;
                    return (
                        <button 
                            key={idx}
                            onClick={() => setCurrentIdx(idx)}
                            style={{
                                ...styles.mapBtn,
                                ...(isAnswered ? styles.mapBtnAnswered : {}),
                                ...(currentIdx === idx ? styles.mapBtnActive : {})
                            }}
                        >
                            {idx + 1}
                        </button>
                    )
                })}
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    loader: { padding: '4rem', textAlign: 'center', fontSize: 18, color: 'var(--primary)', fontWeight: 600 },
    container: { background:'var(--card-bg)', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', maxWidth: 800, margin: '0 auto', overflow: 'hidden' },
    topBar: { background: 'var(--page-bg)', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    title: { margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-main)' },
    timer: { fontSize: 16, fontWeight: 700, color: '#047857', background: '#d1fae5', padding: '6px 16px', borderRadius: 99 },
    timerWarning: { fontSize: 16, fontWeight: 700, color: '#b91c1c', background: '#fee2e2', padding: '6px 16px', borderRadius: 99, animation: 'pulse 1s infinite' },
    
    progressContainer: { padding: '16px 24px 0' },
    progressText: { fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 },
    progressBarBg: { height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' },
    
    questionCard: { padding: '32px 24px' },
    questionText: { margin: '0 0 24px', fontSize: 20, fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.5 },
    optionsGrid: { display: 'flex', flexDirection: 'column', gap: 12 },
    optionBox: { display: 'flex', alignItems: 'center', padding: '16px', border: '2px solid #e5e7eb', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s', background:'var(--card-bg)' },
    optionSelected: { display: 'flex', alignItems: 'center', padding: '16px', border: '2px solid var(--primary)', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s', background: '#eef2ff' },
    optionRadio: { width: 22, height: 22, borderRadius: '50%', border: '2px solid #9ca3af', marginRight: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    optionRadioInner: { width: 12, height: 12, borderRadius: '50%', background: 'var(--primary)' },
    optionText: { fontSize: 16, color: 'var(--text-main)', fontWeight: 500 },
    
    footer: { padding: '16px 24px', background: 'var(--page-bg)', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' },
    navBtn: { padding: '10px 24px', background:'var(--card-bg)', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15, fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' },
    navBtnDisabled: { padding: '10px 24px', background: 'var(--border-color)', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 15, fontWeight: 600, color: 'var(--text-muted)', cursor: 'not-allowed' },
    navBtnPrimary: { padding: '10px 24px', background: 'var(--primary)', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, color:'var(--card-bg)', cursor: 'pointer' },
    submitBtn: { padding: '10px 24px', background: '#059669', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, color:'var(--card-bg)', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16,185,129,0.3)' },
    
    mapGrid: { padding: '16px 24px', display: 'flex', flexWrap: 'wrap', gap: 8, borderTop: '1px dashed #e5e7eb', background:'var(--card-bg)' },
    mapBtn: { width: 36, height: 36, borderRadius: 8, background: 'var(--border-color)', border: '1px solid #e5e7eb', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' },
    mapBtnAnswered: { background: '#e0e7ff', color: 'var(--primary-dark)', borderColor: '#c7d2fe' },
    mapBtnActive: { outline: '2px solid var(--primary)', outlineOffset: 1, background: 'var(--primary)', color:'var(--card-bg)', borderColor: 'var(--primary)' }
};

export default QuizRunner;
