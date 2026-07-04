import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTeachingCourses, Course } from '@/services/courseService';
import { fetchQuizzes, deleteQuiz, createQuiz, updateQuiz, Quiz } from '@/services/quizService';
import QuizBuilder from '@/components/QuizBuilder';
import { useNavigate } from 'react-router-dom';

const FacultyQuizPage: React.FC = () => {
    const { accessToken } = useAuth();
    const navigate = useNavigate();
    
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const [isBuilding, setIsBuilding] = useState(false);
    const [editingQuiz, setEditingQuiz] = useState<Quiz | undefined>(undefined);

    useEffect(() => {
        if (!accessToken) return;
        fetchTeachingCourses(accessToken).then(res => setCourses(res.courses));
    }, [accessToken]);

    useEffect(() => {
        if (!accessToken || !selectedCourse) return;
        loadQuizzes();
    }, [selectedCourse]);

    const loadQuizzes = async () => {
        if (!accessToken || !selectedCourse) return;
        setIsLoading(true);
        try {
            const res = await fetchQuizzes(accessToken, selectedCourse._id);
            setQuizzes(res.quizzes);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!accessToken || !window.confirm('Delete this quiz forever?')) return;
        try {
            await deleteQuiz(accessToken, id);
            loadQuizzes();
        } catch (e: any) { alert(e.message || 'Deletion failed'); }
    };

    const handleSaveQuiz = async (quizData: Partial<Quiz>) => {
        if (!accessToken) return;
        if (editingQuiz) {
            await updateQuiz(accessToken, editingQuiz._id, quizData);
        } else {
            await createQuiz(accessToken, quizData);
        }
        setIsBuilding(false);
        setEditingQuiz(undefined);
        loadQuizzes();
    };

    if (isBuilding && selectedCourse) {
        return (
            <div style={styles.page}>
                <QuizBuilder 
                    courseId={selectedCourse._id} 
                    initialData={editingQuiz} 
                    onSave={handleSaveQuiz} 
                    onCancel={() => { setIsBuilding(false); setEditingQuiz(undefined); }} 
                />
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <div style={styles.headerRow}>
                <div>
                    <h1 style={styles.title}>Quiz Management</h1>
                    <p style={styles.subtitle}>Create, edit, and evaluate course quizzes</p>
                </div>
            </div>
            
            <div style={{ marginBottom: 32 }}>
                <label style={styles.label}>Select Course</label>
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

            {selectedCourse && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-main)' }}>Quizzes Available</h2>
                        <button style={styles.createBtn} onClick={() => setIsBuilding(true)}>+ New Quiz</button>
                    </div>

                    {isLoading ? <div style={styles.empty}>Loading quizzes...</div> : (
                        <div style={styles.grid}>
                            {quizzes.length === 0 ? (
                                <div style={{ ...styles.empty, gridColumn: '1 / -1' }}>No quizzes created for this course.</div>
                            ) : quizzes.map(q => (
                                <div key={q._id} style={styles.quizCard}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <h3 style={styles.qTitle}>{q.title}</h3>
                                        <span style={q.isActive ? styles.badgeActive : styles.badgeDraft}>
                                            {q.isActive ? 'Active' : 'Draft'}
                                        </span>
                                    </div>
                                    <p style={styles.qMeta}>{q.questions?.length || 0} Questions • {q.timeLimitMinutes} Mins</p>
                                    
                                    <div style={styles.qActions}>
                                        <button 
                                            style={styles.actionBtn} 
                                            onClick={() => navigate(`/faculty/quizzes/${q._id}/attempts`)}
                                        >
                                            View Results
                                        </button>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button style={styles.editBtn} onClick={() => { setEditingQuiz(q); setIsBuilding(true); }}>Edit</button>
                                            <button style={styles.deleteBtn} onClick={() => handleDelete(q._id)}>Delete</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            {!selectedCourse && (
                <div style={styles.empty}>Please select a course to load quizzes.</div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1000, margin: '0 auto', fontFamily: "'Inter', sans-serif" },
    headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
    title: { fontSize: 26, fontWeight: 700, color: 'var(--text-main)', margin: 0 },
    subtitle: { fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' },
    label: { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', marginBottom: 8 },
    select: { padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 15, background:'var(--card-bg)', width: '100%', maxWidth: 400 },
    
    createBtn: { padding: '10px 16px', background: 'var(--primary)', color:'var(--card-bg)', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    
    empty: { padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--page-bg)', borderRadius: 12, border: '1px dashed #d1d5db' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' },
    
    quizCard: { padding: '20px', background:'var(--card-bg)', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    qTitle: { margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text-main)' },
    badgeActive: { padding: '4px 8px', background: '#d1fae5', color: '#047857', fontSize: 12, fontWeight: 700, borderRadius: 99, height: 'fit-content' },
    badgeDraft: { padding: '4px 8px', background: '#f1f5f9', color: '#475569', fontSize: 12, fontWeight: 700, borderRadius: 99, height: 'fit-content' },
    qMeta: { margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 },
    
    qActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid #f3f4f6' },
    actionBtn: { padding: '8px 12px', background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    editBtn: { padding: '8px 12px', background:'var(--card-bg)', color: 'var(--text-main)', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    deleteBtn: { padding: '8px 12px', background:'var(--card-bg)', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }
};

export default FacultyQuizPage;
