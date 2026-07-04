import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTeachingCourses, fetchCourseRoster } from '@/services/courseService';
import { fetchAssignments, fetchSubmissions, gradeSubmission } from '@/services/lmsService';
import { fetchQuizzes } from '@/services/quizService';
import { saveResult, fetchCourseResults } from '@/services/resultService';
import type { Course } from '@/services/courseService';
import { Download, Sliders, Edit2, Check, FileSpreadsheet, Percent, AlertCircle } from 'lucide-react';
import api from '@/services/api';

const FacultyGradebookPage: React.FC = () => {
    const { accessToken } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingData, setIsFetchingData] = useState(false);

    // Data lists
    const [students, setStudents] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [attendanceRates, setAttendanceRates] = useState<Record<string, number>>({});

    // Sliders Category weightages
    const [assignWeight, setAssignWeight] = useState(50);
    const [quizWeight, setQuizWeight] = useState(30);
    const [attendanceWeight, setAttendanceWeight] = useState(20);
    const [showSliders, setShowSliders] = useState(false);

    // Inline editor cell states
    // Format: "studentId-assessmentId"
    const [editingCell, setEditingCell] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [isSavingCell, setIsSavingCell] = useState(false);

    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3000);
    };

    // Load available teaching courses
    useEffect(() => {
        if (!accessToken) return;
        fetchTeachingCourses(accessToken)
            .then(res => {
                setCourses(res.courses || []);
                setIsLoading(false);
            })
            .catch(err => {
                console.error(err);
                setIsLoading(false);
            });
    }, [accessToken]);

    // Load gradebook items when course is selected
    const loadGradebook = async () => {
        if (!accessToken || !selectedCourse) return;
        setIsFetchingData(true);
        try {
            // 1. Fetch Students Roster
            const rosterRes = await fetchCourseRoster(accessToken, selectedCourse._id);
            const enrolled = (rosterRes as any).roster || [];
            const stList = enrolled.map((r: any) => r.student);
            setStudents(stList);

            // 2. Fetch Course Attendance to calculate dynamic attendance percentages
            try {
                const attRes = await api.get(`/attendance/course/${selectedCourse._id}`, accessToken);
                const aggregates = attRes.data?.aggregateRoster || attRes.aggregateRoster || [];
                const attMap: Record<string, number> = {};
                aggregates.forEach((item: any) => {
                    const stId = item.student?._id;
                    if (stId) attMap[stId] = item.percentage;
                });
                setAttendanceRates(attMap);
            } catch (_) {
                console.warn('Attendance aggregate lookup failed.');
            }

            // 3. Fetch Assignments
            const assignsRes = await fetchAssignments(accessToken, selectedCourse._id);
            setAssignments(assignsRes.assignments || []);

            // 4. Fetch Quizzes
            const quizzesRes = await fetchQuizzes(accessToken, selectedCourse._id);
            setQuizzes(quizzesRes.quizzes || []);

            // 5. Fetch ExamResults stored in MongoDB for this course
            const resultsRes = await fetchCourseResults(accessToken, selectedCourse._id, { status: 'all' });
            setResults(resultsRes.results || []);

        } catch (err: any) {
            showToast('Failed to compile gradebook datasets.', false);
        } finally {
            setIsFetchingData(false);
        }
    };

    useEffect(() => {
        loadGradebook();
    }, [accessToken, selectedCourse?._id]);

    // Map results by "studentId-assessmentId"
    const gradesMap = useMemo(() => {
        const map: Record<string, number> = {};
        results.forEach(res => {
            const studentId = res.student?._id || res.student;
            // Key can be mapping title or assessment id if we stored it in the results remarks/title
            const key = `${studentId}-${res.assessmentTitle}`;
            map[key] = res.score;
        });
        return map;
    }, [results]);

    // Cell Double click triggers editing
    const handleCellDoubleClick = (studentId: string, item: any, currentVal: number | null) => {
        setEditingCell(`${studentId}-${item.title}`);
        setEditValue(currentVal !== null ? String(currentVal) : '');
    };

    // Save cell grade back to database
    const handleSaveCell = async (studentId: string, item: any, type: 'assignment' | 'quiz') => {
        if (!accessToken || !selectedCourse) return;
        const scoreVal = Number(editValue);
        if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > item.maxMarks) {
            showToast(`Grade must be between 0 and ${item.maxMarks}.`, false);
            return;
        }

        setIsSavingCell(true);
        try {
            await saveResult(accessToken, {
                studentId,
                courseId: selectedCourse._id,
                academicYear: '2025-2026',
                semester: selectedCourse.semester || 1,
                assessmentType: type,
                assessmentTitle: item.title,
                score: scoreVal,
                maxScore: item.maxMarks || 100,
                status: 'published',
            });
            showToast('✅ Assessment score updated!');
            setEditingCell(null);
            
            // Reload results
            const resultsRes = await fetchCourseResults(accessToken, selectedCourse._id, { status: 'all' });
            setResults(resultsRes.results || []);
        } catch (e: any) {
            showToast(e.message || 'Failed to update score.', false);
        } finally {
            setIsSavingCell(false);
        }
    };

    // Recalculate dynamic weighted grade for a student
    const calculateWeightedGrade = (studentId: string) => {
        // Calculate Assignment score %
        let totalAssignScore = 0;
        let totalAssignMax = 0;
        assignments.forEach(a => {
            const score = gradesMap[`${studentId}-${a.title}`];
            if (score !== undefined) {
                totalAssignScore += score;
            }
            totalAssignMax += a.maxMarks || 100;
        });
        const assignPct = totalAssignMax > 0 ? (totalAssignScore / totalAssignMax) * 100 : 100;

        // Calculate Quiz score %
        let totalQuizScore = 0;
        let totalQuizMax = 0;
        quizzes.forEach(q => {
            // Quizzes usually have maxMarks equal to questions count or questions marks sum
            const max = q.questions?.length * 2 || 10;
            const score = gradesMap[`${studentId}-${q.title}`];
            if (score !== undefined) {
                totalQuizScore += score;
            }
            totalQuizMax += max;
        });
        const quizPct = totalQuizMax > 0 ? (totalQuizScore / totalQuizMax) * 100 : 100;

        // Fetch Attendance rate
        const attPct = attendanceRates[studentId] !== undefined ? attendanceRates[studentId] : 100;

        // Apply slider weights
        const finalPercentage = (
            (assignPct * (assignWeight / 100)) +
            (quizPct * (quizWeight / 100)) +
            (attPct * (attendanceWeight / 100))
        );

        return Number(finalPercentage.toFixed(1));
    };

    // Maps percentage to classic University Letter Grades
    const getLetterGrade = (pct: number) => {
        if (pct >= 90) return { label: 'S (Outstanding)', color: '#047857' };
        if (pct >= 80) return { label: 'A (Excellent)', color: '#10b981' };
        if (pct >= 70) return { label: 'B (Very Good)', color: '#2563eb' };
        if (pct >= 60) return { label: 'C (Good)', color: '#d97706' };
        if (pct >= 50) return { label: 'D (Pass)', color: '#6b7280' };
        return { label: 'F (Backlog/Fail)', color: '#dc2626' };
    };

    // Export CSV Utility
    const handleExportCSV = () => {
        if (!selectedCourse || students.length === 0) return;
        
        let csvContent = 'Roll Number,Name,';
        assignments.forEach(a => { csvContent += `Assignment: ${a.title} (Max ${a.maxMarks}),`; });
        quizzes.forEach(q => { csvContent += `Quiz: ${q.title},`; });
        csvContent += 'Attendance %,Weighted Percentage,Grade\r\n';

        students.forEach(st => {
            csvContent += `${st.rollNumber},${st?.name || 'Student'},`;
            assignments.forEach(a => {
                const mark = gradesMap[`${st._id}-${a.title}`];
                csvContent += `${mark !== undefined ? mark : '-'},`;
            });
            quizzes.forEach(q => {
                const mark = gradesMap[`${st._id}-${q.title}`];
                csvContent += `${mark !== undefined ? mark : '-'},`;
            });
            csvContent += `${attendanceRates[st._id] !== undefined ? attendanceRates[st._id] : 100}%,`;
            const weighted = calculateWeightedGrade(st._id);
            csvContent += `${weighted}%,${getLetterGrade(weighted).label}\r\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Gradebook-${selectedCourse.code}.csv`);
        link.click();
    };

    return (
        <div style={styles.page}>
            {toast && (
                <div style={{
                    ...styles.toast,
                    background: toast.ok ? '#d1fae5' : '#fee2e2',
                    color: toast.ok ? '#065f46' : '#991b1b',
                    borderColor: toast.ok ? '#6ee7b7' : '#fca5a5'
                }}>
                    {toast.msg}
                </div>
            )}

            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Unified Gradebook</h1>
                    <p style={styles.subtitle}>Inline AJAX scoring sheets, dynamic slider-based weightings, and CSV reporting.</p>
                </div>
                {selectedCourse && students.length > 0 && (
                    <div style={styles.actionsBar}>
                        <button style={styles.actionBtn} onClick={() => setShowSliders(!showSliders)}>
                            <Sliders size={15} />
                            <span>Weightings Config</span>
                        </button>
                        <button style={styles.exportBtn} onClick={handleExportCSV}>
                            <Download size={15} />
                            <span>Export CSV Sheet</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Course Dropdown */}
            <div style={{ marginBottom: 24 }}>
                <label style={styles.selectLabel}>Select Course</label>
                <select
                    style={styles.select}
                    value={selectedCourse?._id || ''}
                    disabled={isLoading}
                    onChange={e => setSelectedCourse(courses.find(c => c._id === e.target.value) || null)}
                >
                    <option value="">{isLoading ? 'Loading Courses…' : '— Choose a Course —'}</option>
                    {courses.map(c => <option key={c._id} value={c._id}>{c.code} - {c.title}</option>)}
                </select>
            </div>

            {/* Sliders Drawer Widget */}
            {showSliders && selectedCourse && (
                <div style={styles.slidersCard}>
                    <h4 style={styles.slidersTitle}>🎛️ Gradebook Category Weights (Total: {assignWeight + quizWeight + attendanceWeight}%)</h4>
                    <div style={styles.slidersGrid}>
                        <div style={styles.sliderGroup}>
                            <label style={styles.sliderLabel}>Assignments: {assignWeight}%</label>
                            <input 
                                type="range" min="0" max="100" style={styles.slider}
                                value={assignWeight} onChange={e => {
                                    const val = Number(e.target.value);
                                    setAssignWeight(val);
                                    setQuizWeight(Math.max(0, 100 - val - attendanceWeight));
                                }}
                            />
                        </div>
                        <div style={styles.sliderGroup}>
                            <label style={styles.sliderLabel}>Quizzes/Tests: {quizWeight}%</label>
                            <input 
                                type="range" min="0" max="100" style={styles.slider}
                                value={quizWeight} onChange={e => {
                                    const val = Number(e.target.value);
                                    setQuizWeight(val);
                                    setAssignWeight(Math.max(0, 100 - val - attendanceWeight));
                                }}
                            />
                        </div>
                        <div style={styles.sliderGroup}>
                            <label style={styles.sliderLabel}>Attendance: {attendanceWeight}%</label>
                            <input 
                                type="range" min="0" max="100" style={styles.slider}
                                value={attendanceWeight} onChange={e => {
                                    const val = Number(e.target.value);
                                    setAttendanceWeight(val);
                                    setAssignWeight(Math.max(0, 100 - val - quizWeight));
                                }}
                            />
                        </div>
                    </div>
                    {assignWeight + quizWeight + attendanceWeight !== 100 && (
                        <p style={styles.errorText}>⚠️ Category weights must sum to exactly 100% to calculate GPA.</p>
                    )}
                </div>
            )}

            {!selectedCourse ? (
                <div style={styles.empty}>Please select a course to load the gradebook.</div>
            ) : isFetchingData ? (
                <div style={styles.empty}>Compiling grades database...</div>
            ) : students.length === 0 ? (
                <div style={styles.empty}>No students enrolled in this course roster.</div>
            ) : (
                <div style={styles.gradebookBox}>
                    <div style={styles.tipBox}>
                        <AlertCircle size={15} />
                        <span>💡 Double-click any score cell to edit grades. Press Enter or click Check icon to save!</span>
                    </div>

                    <div style={styles.tableWrap}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ ...styles.th, position: 'sticky', left: 0, zIndex: 10 }}>Student Details</th>
                                    {assignments.map(a => (
                                        <th key={a._id} style={styles.th}>
                                            <div style={styles.thTitle}>{a.title}</div>
                                            <small style={styles.thMax}>Max: {a.maxMarks}M</small>
                                        </th>
                                    ))}
                                    {quizzes.map(q => (
                                        <th key={q._id} style={styles.th}>
                                            <div style={styles.thTitle}>{q.title}</div>
                                            <small style={styles.thMax}>Max: {q.questions?.length * 2 || 10}M</small>
                                        </th>
                                    ))}
                                    <th style={styles.th}>Attendance</th>
                                    <th style={styles.th}>Weighted Score</th>
                                    <th style={styles.th}>Letter Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(st => {
                                    const weightedPct = calculateWeightedGrade(st._id);
                                    const letterGrade = getLetterGrade(weightedPct);

                                    return (
                                        <tr key={st._id} style={styles.tr}>
                                            <td style={{ ...styles.td, position: 'sticky', left: 0, background: '#fff', zIndex: 5, borderRight: '1px solid #e5e7eb' }}>
                                                <div style={styles.stName}>{st?.name || 'Unknown'}</div>
                                                <small style={styles.stRoll}>{st.rollNumber}</small>
                                            </td>

                                            {/* Assignments Columns */}
                                            {assignments.map(a => {
                                                const key = `${st._id}-${a.title}`;
                                                const currentMark = gradesMap[key] !== undefined ? gradesMap[key] : null;
                                                const isEditing = editingCell === key;

                                                return (
                                                    <td 
                                                        key={a._id} 
                                                        style={styles.tdCenter}
                                                        onDoubleClick={() => !isEditing && handleCellDoubleClick(st._id, a, currentMark)}
                                                    >
                                                        {isEditing ? (
                                                            <div style={styles.editCellBox}>
                                                                <input 
                                                                    autoFocus
                                                                    type="number" 
                                                                    style={styles.inlineInput} 
                                                                    value={editValue} 
                                                                    onChange={e => setEditValue(e.target.value)}
                                                                    onKeyDown={e => e.key === 'Enter' && handleSaveCell(st._id, a, 'assignment')}
                                                                />
                                                                <button 
                                                                    style={styles.cellCheckBtn} 
                                                                    onClick={() => handleSaveCell(st._id, a, 'assignment')}
                                                                    disabled={isSavingCell}
                                                                >
                                                                    <Check size={12} />
                                                                </button>
                                                            </div>
                                                        ) : currentMark === null ? (
                                                            <span style={styles.emptyDash}>-</span>
                                                        ) : (
                                                            <span style={styles.markVal}>{currentMark}</span>
                                                        )}
                                                    </td>
                                                );
                                            })}

                                            {/* Quizzes Columns */}
                                            {quizzes.map(q => {
                                                const key = `${st._id}-${q.title}`;
                                                const currentMark = gradesMap[key] !== undefined ? gradesMap[key] : null;
                                                const isEditing = editingCell === key;
                                                const maxQuizScore = q.questions?.length * 2 || 10;
                                                const mockQuizItem = { title: q.title, maxMarks: maxQuizScore };

                                                return (
                                                    <td 
                                                        key={q._id} 
                                                        style={styles.tdCenter}
                                                        onDoubleClick={() => !isEditing && handleCellDoubleClick(st._id, mockQuizItem, currentMark)}
                                                    >
                                                        {isEditing ? (
                                                            <div style={styles.editCellBox}>
                                                                <input 
                                                                    autoFocus
                                                                    type="number" 
                                                                    style={styles.inlineInput} 
                                                                    value={editValue} 
                                                                    onChange={e => setEditValue(e.target.value)}
                                                                    onKeyDown={e => e.key === 'Enter' && handleSaveCell(st._id, mockQuizItem, 'quiz')}
                                                                />
                                                                <button 
                                                                    style={styles.cellCheckBtn} 
                                                                    onClick={() => handleSaveCell(st._id, mockQuizItem, 'quiz')}
                                                                    disabled={isSavingCell}
                                                                >
                                                                    <Check size={12} />
                                                                </button>
                                                            </div>
                                                        ) : currentMark === null ? (
                                                            <span style={styles.emptyDash}>-</span>
                                                        ) : (
                                                            <span style={styles.markVal}>{currentMark}</span>
                                                        )}
                                                    </td>
                                                );
                                            })}

                                            {/* Attendance Column */}
                                            <td style={styles.tdCenter}>
                                                <span style={{ 
                                                    fontWeight: 700, 
                                                    color: attendanceRates[st._id] < 75 ? '#dc2626' : '#047857' 
                                                }}>
                                                    {attendanceRates[st._id] !== undefined ? `${attendanceRates[st._id]}%` : '100%'}
                                                </span>
                                            </td>

                                            {/* Weighted Grade Column */}
                                            <td style={{ ...styles.tdCenter, background: '#fafbfc', fontWeight: 800 }}>
                                                {weightedPct}%
                                            </td>

                                            {/* Letter Grade Column */}
                                            <td style={{ ...styles.tdCenter, fontWeight: 700, color: letterGrade.color }}>
                                                {letterGrade.label}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1400, margin: '0 auto', fontFamily: "'Inter', sans-serif" },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: '1.5rem', flexWrap: 'wrap' },
    title: { fontSize: 26, fontWeight: 800, color: 'var(--text-main)', margin: 0 },
    subtitle: { fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' },
    actionsBar: { display: 'flex', gap: 10, flexWrap: 'wrap' },
    
    selectLabel: { display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 },
    select: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db', background: 'var(--card-bg)', fontSize: 14, minWidth: 260 },
    empty: { padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--page-bg)', borderRadius: 12, border: '1px dashed #d1d5db' },
    
    // Buttons
    actionBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' },
    exportBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' },
    
    // Sliders Panel
    slidersCard: { background: '#f8fafc', padding: 20, borderRadius: 14, border: '1px solid #cbd5e1', marginBottom: 24, boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
    slidersTitle: { margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text-main)' },
    slidersGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 },
    sliderGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
    sliderLabel: { fontSize: 13, fontWeight: 600, color: 'var(--text-main)' },
    slider: { cursor: 'pointer', accentColor: 'var(--primary)' },
    errorText: { margin: '12px 0 0', fontSize: 12, color: '#dc2626', fontWeight: 600 },
    
    tipBox: { display: 'flex', alignItems: 'center', gap: 8, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '10px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, marginBottom: 16 },

    gradebookBox: { background: 'var(--card-bg)', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' },
    tableWrap: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' },
    th: { padding: '14px 20px', background: '#fafbfc', borderBottom: '2px solid #e5e7eb', color: 'var(--text-main)', fontWeight: 700, verticalAlign: 'bottom' },
    thTitle: { fontSize: 13, whiteSpace: 'nowrap' },
    thMax: { fontSize: 10, color: 'var(--text-muted)', display: 'block', marginTop: 2 },
    tr: { borderBottom: '1px solid #f1f5f9' },
    td: { padding: '12px 20px', color: 'var(--text-main)', verticalAlign: 'middle' },
    tdCenter: { padding: '12px 20px', color: 'var(--text-main)', verticalAlign: 'middle', textAlign: 'center' },
    
    stName: { fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap' },
    stRoll: { fontSize: 11, color: 'var(--text-muted)' },
    emptyDash: { color: '#cbd5e1' },
    markVal: { fontWeight: 600, color: 'var(--primary)' },

    // Inline Editor
    editCellBox: { display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' },
    inlineInput: { width: 56, padding: '4px 6px', border: '1px solid var(--primary)', borderRadius: 4, textAlign: 'center', fontSize: 12, outline: 'none' },
    cellCheckBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, background: '#10b981', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
    
    toast: { position: 'fixed', top: 20, right: 20, padding: '12px 20px', borderRadius: 10, border: '1px solid', fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }
};

export default FacultyGradebookPage;
