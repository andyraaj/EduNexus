import React, { useState } from 'react';
import type { Quiz, Question } from '@/services/quizService';
import QuizQuestionEditor from './QuizQuestionEditor';

interface QuizBuilderProps {
    courseId: string;
    onSave: (quizData: Partial<Quiz>) => Promise<void>;
    onCancel: () => void;
    initialData?: Quiz;
}

const QuizBuilder: React.FC<QuizBuilderProps> = ({ courseId, onSave, onCancel, initialData }) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [timeLimitMinutes, setTimeLimitMinutes] = useState(initialData ? String(initialData.timeLimitMinutes) : '30');
    const [isActive, setIsActive] = useState(initialData?.isActive || false);
    
    const [questions, setQuestions] = useState<Question[]>(initialData?.questions || []);
    const [isSaving, setIsSaving] = useState(false);

    const handleAddQuestion = () => {
        setQuestions([...questions, { text: '', options: ['', '', '', ''], correctOptionIndex: 0 }]);
    };

    const handleUpdateQuestion = (index: number, updated: Question) => {
        const newQ = [...questions];
        newQ[index] = updated;
        setQuestions(newQ);
    };

    const handleRemoveQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (questions.length === 0) {
            alert('Please add at least one question to the quiz.');
            return;
        }

        // Validate questions
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.text.trim()) return alert(`Question ${i + 1} is missing text.`);
            if (q.options.some(opt => !opt.trim())) return alert(`Question ${i + 1} has empty options.`);
        }

        setIsSaving(true);
        try {
            await onSave({
                courseId,
                title,
                description,
                timeLimitMinutes: Number(timeLimitMinutes),
                isActive,
                questions
            } as any);
        } catch (err: any) {
            alert(err.message || 'Failed to save quiz');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form style={styles.container} onSubmit={handleSubmit}>
            <div style={styles.header}>
                <h2 style={styles.title}>{initialData ? 'Edit Quiz' : 'Create New Quiz'}</h2>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button type="button" onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
                    <button type="submit" disabled={isSaving} style={styles.saveBtn}>
                        {isSaving ? 'Saving...' : 'Save Quiz'}
                    </button>
                </div>
            </div>

            <div style={styles.metaSection}>
                <div style={styles.gridRow}>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Quiz Title *</label>
                        <input required placeholder="Midterm Exam" value={title} onChange={e => setTitle(e.target.value)} style={styles.input} />
                    </div>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Time Limit (Minutes) *</label>
                        <input required type="number" min="1" value={timeLimitMinutes} onChange={e => setTimeLimitMinutes(e.target.value)} style={styles.input} />
                    </div>
                </div>
                <div style={styles.fieldGroup}>
                    <label style={styles.label}>Description / Instructions</label>
                    <textarea placeholder="Answer all questions carefully..." value={description} onChange={e => setDescription(e.target.value)} style={{ ...styles.input, minHeight: 60 }} />
                </div>
                <label style={styles.checkboxLabel}>
                    <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={styles.checkbox} />
                    Make this quiz instantly active/visible to students?
                </label>
            </div>

            <div style={styles.questionsSection}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-main)' }}>Questions ({questions.length})</h3>
                    <button type="button" onClick={handleAddQuestion} style={styles.addBtn}>+ Add Question</button>
                </div>

                {questions.length === 0 ? (
                    <div style={styles.empty}>No questions added yet. Click "+ Add Question" to begin.</div>
                ) : (
                    questions.map((q, idx) => (
                        <QuizQuestionEditor
                            key={idx}
                            index={idx}
                            question={q}
                            onChange={(updated) => handleUpdateQuestion(idx, updated)}
                            onRemove={() => handleRemoveQuestion(idx)}
                        />
                    ))
                )}
            </div>
        </form>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: { background:'var(--card-bg)', borderRadius: 12, border: '1px solid #e5e7eb', padding: '24px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #f3f4f6' },
    title: { margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-main)' },
    cancelBtn: { padding: '8px 16px', background: 'var(--border-color)', color: 'var(--text-muted)', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    saveBtn: { padding: '8px 16px', background: 'var(--primary)', color:'var(--card-bg)', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    
    metaSection: { background: 'var(--page-bg)', padding: '16px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 24 },
    gridRow: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 },
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 },
    label: { fontSize: 13, fontWeight: 600, color: 'var(--text-main)' },
    input: { padding: '10px 14px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', fontFamily: 'inherit' },
    checkboxLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: 'var(--text-main)', cursor: 'pointer' },
    checkbox: { transform: 'scale(1.2)', accentColor: 'var(--primary)' },
    
    questionsSection: { marginTop: '1rem' },
    addBtn: { padding: '8px 16px', background: '#e0e7ff', color: 'var(--primary-dark)', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    empty: { padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--page-bg)', borderRadius: 8, border: '1px dashed #d1d5db' },
};

export default QuizBuilder;
