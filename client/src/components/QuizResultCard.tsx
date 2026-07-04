import React from 'react';
import type { QuizAttempt, Quiz } from '@/services/quizService';

interface QuizResultCardProps {
    attempt: QuizAttempt;
}

const QuizResultCard: React.FC<QuizResultCardProps> = ({ attempt }) => {
    const quiz = attempt.quiz as Quiz;
    const totalQ = quiz.questions?.length || 0;
    const score = attempt.score || 0;
    const percentage = totalQ > 0 ? Math.round((score / totalQ) * 100) : 0;

    let gradeColor = '#047857'; // green
    if (percentage < 40) gradeColor = '#dc2626'; // red
    else if (percentage < 70) gradeColor = '#d97706'; // orange

    const timeTakenStr = attempt.endTime 
        ? `${Math.round((new Date(attempt.endTime).getTime() - new Date(attempt.startTime).getTime()) / 60000)} mins`
        : 'In Progress';

    return (
        <div style={styles.card}>
            <div style={styles.header}>
                <div>
                    <h3 style={styles.title}>{quiz.title}</h3>
                    <p style={styles.date}>Attempted on {new Date(attempt.startTime).toLocaleString()}</p>
                </div>
                <div style={styles.scoreCircle}>
                    <svg viewBox="0 0 36 36" style={styles.circularChart}>
                        <path strokeDasharray={`${percentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style={{ stroke: gradeColor, fill: 'none', strokeWidth: 3, strokeLinecap: 'round' }} />
                        <text x="18" y="22" style={styles.percentageText}>{percentage}%</text>
                    </svg>
                </div>
            </div>

            <div style={styles.detailsRow}>
                <div style={styles.statBox}>
                    <span style={styles.statLabel}>Score</span>
                    <span style={styles.statValue}>{score} / {totalQ}</span>
                </div>
                <div style={styles.statBox}>
                    <span style={styles.statLabel}>Time Taken</span>
                    <span style={styles.statValue}>{timeTakenStr}</span>
                </div>
                <div style={styles.statBox}>
                    <span style={styles.statLabel}>Status</span>
                    <span style={{ ...styles.statValue, color: attempt.endTime ? '#047857' : '#d97706' }}>
                        {attempt.endTime ? 'Completed' : 'Running'}
                    </span>
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    card: { background:'var(--card-bg)', borderRadius: 12, border: '1px solid #e5e7eb', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-main)' },
    date: { margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' },
    scoreCircle: { width: 64, height: 64 },
    circularChart: { display: 'block', margin: '0 auto', maxWidth: '100%', maxHeight: 250 },
    percentageText: { fill: 'var(--text-main)', fontSize: 10, fontFamily: 'sans-serif', fontWeight: 700, textAnchor: 'middle' },
    
    detailsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, borderTop: '1px solid #f3f4f6', paddingTop: 16 },
    statBox: { display: 'flex', flexDirection: 'column', gap: 4 },
    statLabel: { fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
    statValue: { fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }
};

export default QuizResultCard;
