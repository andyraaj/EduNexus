import React from 'react';
import type { Question } from '@/services/quizService';

interface QuizQuestionEditorProps {
    question: Question;
    index: number;
    onChange: (updated: Question) => void;
    onRemove: () => void;
}

const QuizQuestionEditor: React.FC<QuizQuestionEditorProps> = ({ question, index, onChange, onRemove }) => {
    
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange({ ...question, text: e.target.value });
    };

    const handleOptionChange = (optIdx: number, val: string) => {
        const newOpts = [...question.options];
        newOpts[optIdx] = val;
        onChange({ ...question, options: newOpts });
    };

    const handleCorrectOptionChange = (optIdx: number) => {
        onChange({ ...question, correctOptionIndex: optIdx });
    };

    return (
        <div style={styles.card}>
            <div style={styles.header}>
                <h4 style={styles.title}>Question {index + 1}</h4>
                <button type="button" onClick={onRemove} style={styles.deleteBtn}>✕ Remove</button>
            </div>

            <textarea
                placeholder="Enter question text here..."
                value={question.text}
                onChange={handleTextChange}
                style={styles.textArea}
                required
            />

            <div style={styles.optionsList}>
                {question.options.map((opt, oIdx) => (
                    <div key={oIdx} style={styles.optionRow}>
                        <input
                            type="radio"
                            name={`correct-${index}`}
                            checked={question.correctOptionIndex === oIdx}
                            onChange={() => handleCorrectOptionChange(oIdx)}
                            style={styles.radio}
                        />
                        <input
                            type="text"
                            placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                            value={opt}
                            onChange={(e) => handleOptionChange(oIdx, e.target.value)}
                            style={{ ...styles.input, flex: 1, borderColor: question.correctOptionIndex === oIdx ? '#10b981' : 'var(--border-color)' }}
                            required
                        />
                    </div>
                ))}
            </div>
            <p style={styles.hint}>* Select the radio button to mark the correct answer.</p>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    card: { background: 'var(--page-bg)', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px', marginBottom: '16px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' },
    deleteBtn: { background: 'none', border: 'none', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    textArea: { width: '100%', minHeight: 60, padding: '10px 14px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'vertical', marginBottom: 16, boxSizing: 'border-box' },
    optionsList: { display: 'flex', flexDirection: 'column', gap: 10 },
    optionRow: { display: 'flex', alignItems: 'center', gap: 12 },
    radio: { transform: 'scale(1.2)', accentColor: '#10b981', cursor: 'pointer' },
    input: { padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' },
    hint: { margin: '12px 0 0', fontSize: 12, color: '#64748b', fontStyle: 'italic' }
};

export default QuizQuestionEditor;
