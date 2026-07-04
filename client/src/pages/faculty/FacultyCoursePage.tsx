import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { fetchTeachingCourses } from '@/services/courseService';
import {
    fetchMaterials, uploadMaterialFile, uploadMaterialLink, updateMaterial, deleteMaterial,
    fetchAssignments, createAssignment, deleteAssignment,
    fetchSubmissions, gradeSubmission,
    fetchCourseAnnouncements, postCourseAnnouncement, deleteCourseAnnouncement,
    formatFileSize, getFileIcon, getCategoryColor,
    type CourseMaterial, type Assignment, type Submission, type CourseAnnouncement
} from '@/services/lmsService';
import type { Course } from '@/services/courseService';
import { updateCourseSyllabus } from '@/services/facultyAddonsService';
import { 
    Upload, Plus, Trash2, Pin, Eye, EyeOff, Link as LinkIcon, FileText, CheckCircle, 
    Circle, Megaphone, Users, Award, ChevronRight, X, AlertCircle 
} from 'lucide-react';

type Tab = 'materials' | 'assignments' | 'grading' | 'announcements' | 'syllabus';

const FacultyCoursePage: React.FC = () => {
    const { accessToken } = useAuth();
    const { courseId } = useParams();
    const navigate = useNavigate();

    // Data State
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('materials');
    const [materials, setMaterials] = useState<CourseMaterial[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>([]);
    const [gradingAssignment, setGradingAssignment] = useState<Assignment | null>(null);
    
    // Syllabus progress states
    const [syllabusUnits, setSyllabusUnits] = useState<any[]>([]);
    const [syllabusProgress, setSyllabusProgress] = useState(0);

    // Form/Upload State
    const [showMaterialForm, setShowMaterialForm] = useState(false);
    const [mTitle, setMTitle] = useState('');
    const [mDesc, setMDesc] = useState('');
    const [mCategory, setMCategory] = useState<any>('notes');
    const [mModule, setMModule] = useState('General');
    const [mLinkUrl, setMLinkUrl] = useState('');
    const [mUploadType, setMUploadType] = useState<'file' | 'link'>('file');
    
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploadPercent, setUploadPercent] = useState<number | null>(null);

    // Assignment Form
    const [showAssignmentForm, setShowAssignmentForm] = useState(false);
    const [aTitle, setATitle] = useState('');
    const [aDesc, setADesc] = useState('');
    const [aDueDate, setADueDate] = useState('');
    const [aMaxMarks, setAMaxMarks] = useState('100');
    const [aUrl, setAUrl] = useState('');

    // Announcement Form
    const [showAnnForm, setShowAnnForm] = useState(false);
    const [annTitle, setAnnTitle] = useState('');
    const [annBody, setAnnBody] = useState('');
    const [annPriority, setAnnPriority] = useState<'normal' | 'important' | 'urgent'>('normal');

    // UI Loading & Toast
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3000);
    };

    // Load initial teaching courses
    useEffect(() => {
        if (!accessToken) return;
        fetchTeachingCourses(accessToken).then(res => {
            const fetched = res.courses || [];
            setCourses(fetched);
            if (courseId) {
                const preselected = fetched.find((c: any) => c._id === courseId);
                if (preselected) {
                    setSelectedCourse(preselected);
                    setSyllabusUnits((preselected as any).syllabusUnits || []);
                    setSyllabusProgress((preselected as any).syllabusProgress || 0);
                }
            }
        });
    }, [accessToken, courseId]);

    // Load tab data when course or active tab changes
    const loadTabData = async () => {
        if (!accessToken || !selectedCourse) return;
        setIsLoading(true);
        try {
            if (activeTab === 'materials') {
                const res = await fetchMaterials(accessToken, selectedCourse._id);
                setMaterials(res.materials || []);
            } else if (activeTab === 'assignments') {
                const res = await fetchAssignments(accessToken, selectedCourse._id);
                setAssignments(res.assignments || []);
            } else if (activeTab === 'announcements') {
                const res = await fetchCourseAnnouncements(accessToken, selectedCourse._id);
                setAnnouncements(res.announcements || []);
            } else if (activeTab === 'syllabus') {
                const res = await api.get(`/courses/${selectedCourse._id}`, accessToken);
                const freshCourse = res.data?.course || res.course;
                if (freshCourse) {
                    setSyllabusUnits(freshCourse.syllabusUnits || []);
                    setSyllabusProgress(freshCourse.syllabusProgress || 0);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTabData();
    }, [selectedCourse, activeTab]);

    // File Drag & Drop
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
            if (!mTitle) setMTitle(e.dataTransfer.files[0].name.split('.').slice(0, -1).join('.'));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            if (!mTitle) setMTitle(e.target.files[0].name.split('.').slice(0, -1).join('.'));
        }
    };

    // Material Upload handler
    const handleUploadMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken || !selectedCourse) return;
        setIsSaving(true);
        setUploadPercent(0);

        try {
            if (mUploadType === 'file') {
                if (!selectedFile) {
                    showToast('Please select or drag a file to upload.', false);
                    setIsSaving(false);
                    return;
                }
                await uploadMaterialFile(
                    accessToken,
                    selectedCourse._id,
                    selectedFile,
                    { title: mTitle, description: mDesc, category: mCategory, module: mModule },
                    (pct) => setUploadPercent(pct)
                );
                showToast('File uploaded successfully!');
            } else {
                if (!mLinkUrl) {
                    showToast('Please enter a valid link URL.', false);
                    setIsSaving(false);
                    return;
                }
                await uploadMaterialLink(accessToken, {
                    courseId: selectedCourse._id,
                    title: mTitle,
                    fileUrl: mLinkUrl,
                    description: mDesc,
                    category: mCategory,
                    module: mModule
                });
                showToast('External resource link added!');
            }

            // Reset Form states
            setShowMaterialForm(false);
            setMTitle(''); setMDesc(''); setMModule('General'); setMLinkUrl(''); setSelectedFile(null);
            setUploadPercent(null);
            loadTabData();
        } catch (e: any) {
            showToast(e.message || 'Upload failed', false);
        } finally {
            setIsSaving(false);
        }
    };

    // Assignment creation
    const handleCreateAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken || !selectedCourse) return;
        setIsSaving(true);
        try {
            await createAssignment(accessToken, {
                courseId: selectedCourse._id,
                title: aTitle,
                description: aDesc,
                dueDate: aDueDate,
                maxMarks: Number(aMaxMarks),
                attachmentUrl: aUrl
            });
            showToast('Assignment published successfully!');
            setShowAssignmentForm(false);
            setATitle(''); setADesc(''); setADueDate(''); setAUrl('');
            loadTabData();
        } catch (e: any) {
            showToast(e.message || 'Failed to create assignment', false);
        } finally {
            setIsSaving(false);
        }
    };

    // Announcement creation
    const handlePostAnn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken || !selectedCourse) return;
        setIsSaving(true);
        try {
            await postCourseAnnouncement(accessToken, {
                courseId: selectedCourse._id,
                title: annTitle,
                body: annBody,
                priority: annPriority
            });
            showToast('Announcement posted to student feeds!');
            setShowAnnForm(false);
            setAnnTitle(''); setAnnBody(''); setAnnPriority('normal');
            loadTabData();
        } catch (e: any) {
            showToast(e.message || 'Failed to post announcement', false);
        } finally {
            setIsSaving(false);
        }
    };

    // Roster / grading triggers
    const handleViewSubmissions = async (assignment: Assignment) => {
        if (!accessToken) return;
        setGradingAssignment(assignment);
        setActiveTab('grading');
        setIsLoading(true);
        try {
            const res = await fetchSubmissions(accessToken, assignment._id);
            setSubmissions(res.submissions || []);
        } catch (e) {
            showToast('Failed to load student submissions.', false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGrade = async (subId: string, marks: number, feedback: string) => {
        if (!accessToken) return;
        try {
            await gradeSubmission(accessToken, subId, marks, feedback);
            setSubmissions(prev => prev.map(s => s._id === subId ? { ...s, marksAwarded: marks, feedback } : s));
            showToast('Submission graded!');
        } catch (e) {
            showToast('Failed to save grade.', false);
        }
    };

    // Material visibility toggle & Pinning
    const handleToggleMaterialState = async (m: CourseMaterial, field: 'isPinned' | 'isVisible') => {
        if (!accessToken) return;
        try {
            const updated = await updateMaterial(accessToken, m._id, { [field]: !m[field] });
            setMaterials(prev => prev.map(item => item._id === m._id ? { ...item, ...updated.material } : item));
            showToast(`${field === 'isPinned' ? 'Pin state' : 'Visibility'} updated!`);
        } catch (e) {
            showToast('Failed to update resource options.', false);
        }
    };

    const getSecureUrl = (url: string) => {
        if (!url || !url.includes('/uploads/')) return url;
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}token=${accessToken}`;
    };


    // Syllabus Checklist
    const handleToggleSyllabusUnit = async (idx: number) => {
        if (!accessToken || !selectedCourse) return;
        const updatedUnits = syllabusUnits.map((unit, i) => {
            if (i === idx) return { ...unit, isCompleted: !unit.isCompleted };
            return unit;
        });

        const completedCount = updatedUnits.filter(u => u.isCompleted).length;
        const nextProgress = Math.round((completedCount / updatedUnits.length) * 100);

        setSyllabusUnits(updatedUnits);
        setSyllabusProgress(nextProgress);

        try {
            await updateCourseSyllabus(accessToken, selectedCourse._id, updatedUnits);
        } catch (e) {
            console.error('Failed to sync syllabus progress to DB:', e);
        }
    };

    return (
        <div style={styles.page}>
            {/* Toast feedback */}
            {toast && (
                <div style={{ ...styles.toast, background: toast.ok ? '#d1fae5' : '#fee2e2', color: toast.ok ? '#065f46' : '#991b1b', borderColor: toast.ok ? '#a7f3d0' : '#fca5a5' }}>
                    {toast.ok ? '✅' : '⚠️'} {toast.msg}
                </div>
            )}

            {/* Title banner */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>LMS Course Manager</h1>
                    <p style={styles.subtitle}>Upload resources, publish announcements, manage attendance and grade student submissions</p>
                </div>
                <div style={styles.selectorGroup}>
                    <select
                        style={styles.select}
                        value={selectedCourse?._id || ''}
                        onChange={e => {
                            const c = courses.find(x => x._id === e.target.value);
                            setSelectedCourse(c || null);
                            setActiveTab('materials');
                            setGradingAssignment(null);
                        }}
                    >
                        <option value="">-- Select Allocated Course --</option>
                        {courses.map(c => <option key={c._id} value={c._id}>{c.code} - {c.title}</option>)}
                    </select>
                </div>
            </div>

            {selectedCourse ? (
                <>
                    {/* Horizontal tab menus */}
                    <div style={styles.tabsMenu}>
                        {(['materials', 'assignments', 'grading', 'announcements', 'syllabus'] as any[]).map(tab => {
                            if (tab === 'grading' && !gradingAssignment) return null; // Only show grading if assignment selected
                            return (
                                <button
                                    key={tab}
                                    style={activeTab === tab ? styles.activeTab : styles.tab}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab === 'materials' && '📚 Resources'}
                                    {tab === 'assignments' && '📝 Assignments'}
                                    {tab === 'grading' && '🎓 Submissions'}
                                    {tab === 'announcements' && '📢 Announcements'}
                                    {tab === 'syllabus' && '📖 Syllabus'}
                                </button>
                            );
                        })}
                    </div>

                    <div style={styles.contentArea}>
                        {isLoading && <div style={styles.centerLoading}>Loading course workspace...</div>}

                        {/* ────────────────── RESOURCES TAB ────────────────── */}
                        {!isLoading && activeTab === 'materials' && (
                            <>
                                <div style={styles.actionsRow}>
                                    <h3 style={styles.sectionTitle}>Course Syllabus Resources</h3>
                                    <button style={styles.primaryBtn} onClick={() => setShowMaterialForm(!showMaterialForm)}>
                                        {showMaterialForm ? 'Cancel' : '+ Upload Resource'}
                                    </button>
                                </div>

                                {showMaterialForm && (
                                    <form style={styles.formBox} onSubmit={handleUploadMaterial}>
                                        <h4 style={{ margin: '0 0 16px', fontSize: 16, color: '#0f172a', fontWeight: 700 }}>Upload Course Resource</h4>
                                        
                                        <div style={styles.toggleRow}>
                                            <button type="button" style={mUploadType === 'file' ? styles.toggleBtnActive : styles.toggleBtn} onClick={() => setMUploadType('file')}>📁 Local File Upload</button>
                                            <button type="button" style={mUploadType === 'link' ? styles.toggleBtnActive : styles.toggleBtn} onClick={() => setMUploadType('link')}>🔗 Shared Drive Link</button>
                                        </div>

                                        <div style={styles.formGrid}>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label style={styles.formLabel}>Title / Label</label>
                                                <input required placeholder="e.g. Lab Manual 1 - Intro to Socket Programming" value={mTitle} onChange={e => setMTitle(e.target.value)} style={styles.input} />
                                            </div>

                                            <div>
                                                <label style={styles.formLabel}>Category</label>
                                                <select value={mCategory} onChange={e => setMCategory(e.target.value)} style={styles.input}>
                                                    <option value="notes">Lecture Notes</option>
                                                    <option value="slides">Presentation Slides</option>
                                                    <option value="video">Reference Videos</option>
                                                    <option value="lab_manual">Lab Manuals</option>
                                                    <option value="assignment_resource">Assignment Prompt Assets</option>
                                                    <option value="reference">Reference Readings</option>
                                                    <option value="recording">Session Recording</option>
                                                    <option value="other">Other Documents</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label style={styles.formLabel}>Syllabus Module / Unit</label>
                                                <input placeholder="e.g. Module 1: Basics" value={mModule} onChange={e => setMModule(e.target.value)} style={styles.input} />
                                            </div>

                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label style={styles.formLabel}>Short Description / Guidance</label>
                                                <input placeholder="Enter brief student guidance..." value={mDesc} onChange={e => setMDesc(e.target.value)} style={styles.input} />
                                            </div>

                                            {mUploadType === 'file' ? (
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <label style={styles.formLabel}>Upload File</label>
                                                    <div 
                                                        style={dragActive ? styles.dragActive : styles.dragZone}
                                                        onDragEnter={handleDrag}
                                                        onDragOver={handleDrag}
                                                        onDragLeave={handleDrag}
                                                        onDrop={handleDrop}
                                                        onClick={() => fileInputRef.current?.click()}
                                                    >
                                                        <Upload size={32} style={{ color: '#64748b', marginBottom: 8 }} />
                                                        <p style={{ margin: 0, fontSize: 13, color: '#334155', fontWeight: 600 }}>
                                                            {selectedFile ? `Selected: ${selectedFile.name}` : 'Drag & drop your syllabus resource file, or browse'}
                                                        </p>
                                                        <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>PDF, Word, Slides, Sheets, CSV, ZIP, Images, Videos up to 100MB</span>
                                                        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <label style={styles.formLabel}>External Drive / Resource URL</label>
                                                    <input required type="url" placeholder="https://drive.google.com/..." value={mLinkUrl} onChange={e => setMLinkUrl(e.target.value)} style={styles.input} />
                                                </div>
                                            )}
                                        </div>

                                        {uploadPercent !== null && (
                                            <div style={styles.progressWrap}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                                                    <span style={{ color: '#64748b', fontWeight: 500 }}>Uploading to course directory...</span>
                                                    <strong style={{ color: '#2563eb' }}>{uploadPercent}%</strong>
                                                </div>
                                                <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${uploadPercent}%`, background: '#2563eb', transition: 'width 0.1s linear' }} />
                                                </div>
                                            </div>
                                        )}

                                        <button type="submit" disabled={isSaving} style={{ ...styles.submitBtn, marginTop: 16 }}>
                                            {isSaving ? 'Uploading resource...' : '📁 Add Resource'}
                                        </button>
                                    </form>
                                )}

                                <div style={styles.materialsList}>
                                    {materials.length === 0 ? (
                                        <div style={styles.emptyCard}>No course materials uploaded for this class. Click upload to get started.</div>
                                    ) : (
                                        materials.map(m => {
                                            const colors = getCategoryColor(m.category);
                                            return (
                                                <div key={m._id} style={m.isPinned ? styles.materialRowPinned : styles.materialRow}>
                                                    <span style={{ fontSize: 24, marginRight: 4 }}>{getFileIcon(m.mimeType, m.isExternalLink)}</span>
                                                    <div style={styles.mDetails}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <strong style={styles.mTitle}>{m.title}</strong>
                                                            <span style={{ ...styles.mBadge, background: colors.bg, color: colors.text }}>{m.category}</span>
                                                            <span style={styles.mModBadge}>{m.module}</span>
                                                        </div>
                                                        <span style={styles.mSub}>{m.description || 'No description added'} · {formatFileSize(m.fileSize)} · {m.downloadCount || 0} downloads</span>
                                                    </div>
                                                    <div style={styles.mActions}>
                                                        <a 
                                                            href={getSecureUrl(m.fileUrl)} 
                                                            target="_blank" 
                                                            rel="noreferrer" 
                                                            style={styles.actionBtn} 
                                                            title="View Resource"
                                                            onClick={async () => {
                                                                if (!m.isExternalLink) {
                                                                    try { await api.post(`/materials/${m._id}/download`, {}, accessToken!); } catch {}
                                                                }
                                                            }}
                                                        >
                                                            <LinkIcon size={16} />
                                                        </a>
                                                        <button 
                                                            style={m.isPinned ? styles.actionBtnActive : styles.actionBtn} 
                                                            onClick={() => handleToggleMaterialState(m, 'isPinned')}
                                                            title={m.isPinned ? "Unpin Resource" : "Pin Resource"}
                                                        >
                                                            <Pin size={16} />
                                                        </button>
                                                        <button 
                                                            style={styles.actionBtn} 
                                                            onClick={() => handleToggleMaterialState(m, 'isVisible')}
                                                            title={m.isVisible ? "Hide from students" : "Show to students"}
                                                        >
                                                            {m.isVisible ? <Eye size={16} /> : <EyeOff size={16} style={{ color: '#ef4444' }} />}
                                                        </button>
                                                        <button 
                                                            style={styles.deleteBtn} 
                                                            onClick={async () => {
                                                                if (window.confirm('Delete this resource permanently?')) {
                                                                    await deleteMaterial(accessToken!, m._id);
                                                                    loadTabData();
                                                                }
                                                            }}
                                                            title="Delete Resource"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </>
                        )}

                        {/* ────────────────── ASSIGNMENTS TAB ────────────────── */}
                        {!isLoading && activeTab === 'assignments' && (
                            <>
                                <div style={styles.actionsRow}>
                                    <h3 style={styles.sectionTitle}>Course Assignments</h3>
                                    <button style={styles.primaryBtn} onClick={() => setShowAssignmentForm(!showAssignmentForm)}>
                                        {showAssignmentForm ? 'Cancel' : '+ Create Assignment'}
                                    </button>
                                </div>

                                {showAssignmentForm && (
                                    <form style={styles.formBox} onSubmit={handleCreateAssignment}>
                                        <h4 style={{ margin: '0 0 16px', fontSize: 16, color: '#0f172a', fontWeight: 700 }}>New Assignment Prompt</h4>
                                        <div style={styles.formGrid}>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label style={styles.formLabel}>Assignment Title</label>
                                                <input required placeholder="e.g. Coursework 1 - Binary Search Tree Analysis" value={aTitle} onChange={e => setATitle(e.target.value)} style={styles.input} />
                                            </div>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label style={styles.formLabel}>Detailed Brief & Instructions</label>
                                                <textarea required placeholder="Write guidelines, submission expectations..." value={aDesc} onChange={e => setADesc(e.target.value)} style={{ ...styles.input, minHeight: 100 }} />
                                            </div>
                                            <div>
                                                <label style={styles.formLabel}>Deadline Date & Time</label>
                                                <input required type="datetime-local" value={aDueDate} onChange={e => setADueDate(e.target.value)} style={styles.input} />
                                            </div>
                                            <div>
                                                <label style={styles.formLabel}>Maximum Score</label>
                                                <input required type="number" min={1} value={aMaxMarks} onChange={e => setAMaxMarks(e.target.value)} style={styles.input} />
                                            </div>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label style={styles.formLabel}>Syllabus Resource File URL (Optional)</label>
                                                <input placeholder="Add reference link or PDF prompt link..." value={aUrl} onChange={e => setAUrl(e.target.value)} style={styles.input} />
                                            </div>
                                        </div>
                                        <button type="submit" disabled={isSaving} style={{ ...styles.submitBtn, marginTop: 16 }}>
                                            {isSaving ? 'Publishing...' : '📝 Publish Assignment'}
                                        </button>
                                    </form>
                                )}

                                <div style={styles.assignmentsList}>
                                    {assignments.length === 0 ? (
                                        <div style={styles.emptyCard}>No assignments posted for this course.</div>
                                    ) : (
                                        assignments.map(a => (
                                            <div key={a._id} style={styles.assignCard}>
                                                <div style={styles.assignHeader}>
                                                    <div>
                                                        <h4 style={styles.assignTitle}>{a.title}</h4>
                                                        <p style={styles.assignSub}>Due: {new Date(a.dueDate).toLocaleString('en-IN')} · Score: {a.maxMarks} marks</p>
                                                    </div>
                                                    <div style={styles.assignActions}>
                                                        <button style={styles.primaryOutlineBtn} onClick={() => handleViewSubmissions(a)}>
                                                            🎓 Submissions
                                                        </button>
                                                        <button 
                                                            style={styles.deleteBtn}
                                                            onClick={async () => {
                                                                if (window.confirm('Delete assignment permanently?')) {
                                                                    await deleteAssignment(accessToken!, a._id);
                                                                    loadTabData();
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p style={styles.assignDesc}>{a.description}</p>
                                                {a.attachmentUrl && (
                                                    <a href={getSecureUrl(a.attachmentUrl)} target="_blank" rel="noreferrer" style={styles.attachLink}>
                                                        📎 View Assignment Resource
                                                    </a>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}

                        {/* ────────────────── GRADING SUBMISSIONS TAB ────────────────── */}
                        {!isLoading && activeTab === 'grading' && gradingAssignment && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                                    <button style={styles.backBtn} onClick={() => { setGradingAssignment(null); setActiveTab('assignments'); }}>
                                        ← Back to Assignments
                                    </button>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a', fontWeight: 800 }}>Submissions: {gradingAssignment.title}</h3>
                                        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Total allocated maximum marks: {gradingAssignment.maxMarks}</p>
                                    </div>
                                </div>

                                {submissions.length === 0 ? (
                                    <div style={styles.emptyCard}>No students have submitted this assignment yet.</div>
                                ) : (
                                    <div style={styles.submissionsGrid}>
                                        {submissions.map(sub => {
                                            const studentUser = typeof sub.student === 'object' ? sub.student?.user : null;
                                            const rollNum = typeof sub.student === 'object' ? sub.student?.rollNumber : '';
                                            return (
                                                <div key={sub._id} style={styles.subCard}>
                                                    <div style={styles.subCardHeader}>
                                                        <div>
                                                            <strong style={{ fontSize: 14, color: '#0f172a' }}>{studentUser?.name || 'Student'}</strong>
                                                            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Roll: {rollNum || 'N/A'}</p>
                                                        </div>
                                                        <a href={getSecureUrl(sub.fileUrl)} target="_blank" rel="noreferrer" style={styles.openSubBtn}>
                                                            📎 View Submission
                                                        </a>
                                                    </div>
                                                    
                                                    <div style={styles.gradeBox}>
                                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                                                            <span style={{ fontSize: 13, fontWeight: 700 }}>Score:</span>
                                                            <input 
                                                                type="number"
                                                                min={0}
                                                                max={gradingAssignment.maxMarks}
                                                                placeholder="Marks"
                                                                defaultValue={sub.marksAwarded != null ? sub.marksAwarded : ''}
                                                                style={styles.gradeInput}
                                                                id={`marks-${sub._id}`}
                                                            />
                                                            <span style={{ fontSize: 13, color: '#64748b' }}>/ {gradingAssignment.maxMarks}</span>
                                                        </div>
                                                        <div>
                                                            <span style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Feedback:</span>
                                                            <textarea 
                                                                placeholder="Excellent analysis, clean implementation..."
                                                                defaultValue={sub.feedback || ''}
                                                                style={styles.feedbackInput}
                                                                id={`feedback-${sub._id}`}
                                                            />
                                                        </div>
                                                        <button 
                                                            style={styles.saveGradeBtn}
                                                            onClick={() => {
                                                                const mVal = Number((document.getElementById(`marks-${sub._id}`) as HTMLInputElement)?.value || 0);
                                                                const fVal = (document.getElementById(`feedback-${sub._id}`) as HTMLTextAreaElement)?.value || '';
                                                                handleGrade(sub._id, mVal, fVal);
                                                            }}
                                                        >
                                                            🎓 Save Grade
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ────────────────── ANNOUNCEMENTS TAB ────────────────── */}
                        {!isLoading && activeTab === 'announcements' && (
                            <>
                                <div style={styles.actionsRow}>
                                    <h3 style={styles.sectionTitle}>Course Announcements Feed</h3>
                                    <button style={styles.primaryBtn} onClick={() => setShowAnnForm(!showAnnForm)}>
                                        {showAnnForm ? 'Cancel' : '+ Post Announcement'}
                                    </button>
                                </div>

                                {showAnnForm && (
                                    <form style={styles.formBox} onSubmit={handlePostAnn}>
                                        <h4 style={{ margin: '0 0 16px', fontSize: 16, color: '#0f172a', fontWeight: 700 }}>New Announcements Memo</h4>
                                        <div style={styles.formGrid}>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label style={styles.formLabel}>Subject Title</label>
                                                <input required placeholder="e.g. Schedule Change: Extra Lecture on Friday" value={annTitle} onChange={e => setAnnTitle(e.target.value)} style={styles.input} />
                                            </div>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label style={styles.formLabel}>Announcement Memo Body</label>
                                                <textarea required placeholder="Write announcement details here..." value={annBody} onChange={e => setAnnBody(e.target.value)} style={{ ...styles.input, minHeight: 100 }} />
                                            </div>
                                            <div>
                                                <label style={styles.formLabel}>Priority Tag</label>
                                                <select value={annPriority} onChange={e => setAnnPriority(e.target.value as any)} style={styles.input}>
                                                    <option value="normal">Normal Priority</option>
                                                    <option value="important">Important Notice</option>
                                                    <option value="urgent">Urgent / Time Sensitive</option>
                                                </select>
                                            </div>
                                        </div>
                                        <button type="submit" disabled={isSaving} style={{ ...styles.submitBtn, marginTop: 16 }}>
                                            {isSaving ? 'Posting...' : '📢 Publish Announcement'}
                                        </button>
                                    </form>
                                )}

                                <div style={styles.announcementsList}>
                                    {announcements.length === 0 ? (
                                        <div style={styles.emptyCard}>No announcements posted to this syllabus channel yet.</div>
                                    ) : (
                                        announcements.map(ann => {
                                            const priorityBg = ann.priority === 'urgent' ? '#fee2e2' : ann.priority === 'important' ? '#ffedd5' : '#f1f5f9';
                                            const priorityCol = ann.priority === 'urgent' ? '#b91c1c' : ann.priority === 'important' ? '#c2410c' : '#475569';
                                            return (
                                                <div key={ann._id} style={{ ...styles.annCard, borderLeft: `4px solid ${priorityCol}` }}>
                                                    <div style={styles.annHeader}>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <strong style={{ fontSize: 15, color: '#0f172a' }}>{ann.title}</strong>
                                                                <span style={{ ...styles.mBadge, background: priorityBg, color: priorityCol }}>{ann.priority}</span>
                                                            </div>
                                                            <span style={{ fontSize: 12, color: '#64748b' }}>Posted on {new Date(ann.createdAt).toLocaleDateString('en-IN')}</span>
                                                        </div>
                                                        <button 
                                                            style={styles.deleteBtn}
                                                            onClick={async () => {
                                                                if (window.confirm('Delete announcement permanently?')) {
                                                                    await deleteCourseAnnouncement(accessToken!, ann._id);
                                                                    loadTabData();
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                    <p style={{ margin: '12px 0 0', fontSize: 14, color: '#334155', lineHeight: 1.6 }}>{ann.body}</p>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </>
                        )}

                        {/* ────────────────── SYLLABUS CHECKLIST TAB ────────────────── */}
                        {!isLoading && activeTab === 'syllabus' && (
                            <div style={styles.syllabusContainer}>
                                <div style={styles.progressSection}>
                                    <div style={styles.progressLabels}>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Academic Syllabus Completion progress</span>
                                        <strong style={{ fontSize: 15, color: '#2563eb' }}>{syllabusProgress}% Completed</strong>
                                    </div>
                                    <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${syllabusProgress}%`, background: '#2563eb', transition: 'width 0.4s ease' }} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {syllabusUnits.map((unit, idx) => (
                                        <div 
                                            key={idx} 
                                            style={{
                                                ...styles.unitItem,
                                                borderColor: unit.isCompleted ? '#a7f3d0' : '#e2e8f0',
                                                background: unit.isCompleted ? '#f0fdf4' : '#fff'
                                            }}
                                            onClick={() => handleToggleSyllabusUnit(idx)}
                                        >
                                            {unit.isCompleted ? (
                                                <CheckCircle size={20} style={{ color: '#10b981', flexShrink: 0 }} />
                                            ) : (
                                                <Circle size={20} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                            )}
                                            <div style={{ flex: 1 }}>
                                                <span style={{
                                                    fontSize: 14,
                                                    fontWeight: 600,
                                                    color: unit.isCompleted ? '#047857' : '#1e293b',
                                                    textDecoration: unit.isCompleted ? 'line-through' : 'none'
                                                }}>
                                                    {unit.title}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div style={styles.emptyCard}>Select a course from the dropdown above to manage its classroom resources and assignments.</div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1200, margin: '0 auto', fontFamily: "'Inter', sans-serif" },
    toast: { position: 'fixed', top: 20, right: 20, padding: '12px 20px', borderRadius: 10, border: '1px solid', fontSize: 14, fontWeight: 700, zIndex: 9999, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
    
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: '2rem' },
    title: { fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' },
    subtitle: { fontSize: 14, color: '#64748b', margin: '4px 0 0' },
    selectorGroup: { minWidth: 260 },
    select: { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, background: '#fff', outline: 'none', color: '#1e293b', fontWeight: 600 },

    tabsMenu: { display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: '2rem' },
    tab: { background: 'none', border: 'none', padding: '10px 16px 14px', fontSize: 14, fontWeight: 600, color: '#64748b', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -2 },
    activeTab: { background: 'none', border: 'none', padding: '10px 16px 14px', fontSize: 14, fontWeight: 800, color: '#2563eb', cursor: 'pointer', borderBottom: '2px solid #2563eb', marginBottom: -2 },

    contentArea: { minHeight: 400 },
    centerLoading: { padding: '5rem 0', textAlign: 'center', color: '#64748b', fontSize: 15 },
    actionsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 },
    primaryBtn: { padding: '9px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
    primaryOutlineBtn: { padding: '8px 16px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
    backBtn: { padding: '8px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#1e293b', cursor: 'pointer' },

    formBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.5rem', marginBottom: '2rem' },
    toggleRow: { display: 'flex', gap: 10, marginBottom: 16 },
    toggleBtn: { padding: '8px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#475569' },
    toggleBtnActive: { padding: '8px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#2563eb' },
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
    formLabel: { display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 },
    input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' },
    
    dragZone: { border: '2px dashed #cbd5e1', borderRadius: 10, padding: 24, textAlign: 'center', background: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'border-color 0.2s' },
    dragActive: { border: '2px dashed #2563eb', borderRadius: 10, padding: 24, textAlign: 'center', background: '#eff6ff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' },
    progressWrap: { marginTop: 16 },
    submitBtn: { padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },

    materialsList: { display: 'flex', flexDirection: 'column', gap: 10 },
    materialRow: { display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px' },
    materialRowPinned: { display: 'flex', alignItems: 'center', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px' },
    mDetails: { flex: 1, minWidth: 0, paddingLeft: 12 },
    mTitle: { display: 'block', fontSize: 14, color: '#0f172a', fontWeight: 700 },
    mBadge: { fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' },
    mModBadge: { fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#f1f5f9', color: '#475569' },
    mSub: { fontSize: 12, color: '#64748b', marginTop: 3, display: 'block' },
    mActions: { display: 'flex', gap: 6 },
    actionBtn: { padding: 8, background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#475569' },
    actionBtnActive: { padding: 8, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, cursor: 'pointer', color: '#b45309' },
    deleteBtn: { padding: 8, background: '#fef2f2', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#ef4444' },

    assignmentsList: { display: 'flex', flexDirection: 'column', gap: 14 },
    assignCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 },
    assignHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    assignTitle: { fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 },
    assignSub: { fontSize: 12, color: '#64748b', margin: '4px 0 0' },
    assignActions: { display: 'flex', gap: 8 },
    assignDesc: { fontSize: 13, color: '#334155', lineHeight: 1.5, margin: '0 0 12px' },
    attachLink: { display: 'inline-block', fontSize: 12, color: '#2563eb', fontWeight: 600, textDecoration: 'none' },

    submissionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 },
    subCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 },
    subCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: 10, marginBottom: 12 },
    openSubBtn: { fontSize: 12, fontWeight: 700, color: '#2563eb', textDecoration: 'none' },
    gradeBox: { background: '#f8fafc', padding: 12, borderRadius: 8 },
    gradeInput: { width: 60, padding: 6, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, textAlign: 'center', outline: 'none' },
    feedbackInput: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, outline: 'none', minHeight: 60, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginTop: 4 },
    saveGradeBtn: { width: '100%', padding: '8px 0', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', marginTop: 10 },

    announcementsList: { display: 'flex', flexDirection: 'column', gap: 12 },
    annCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 },
    annHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },

    syllabusContainer: { padding: '1rem 0' },
    progressSection: { background: '#f8fafc', border: '1px solid #e2e8f0', padding: 20, borderRadius: 12, marginBottom: 20 },
    progressLabels: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 },
    unitItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, border: '1px solid', cursor: 'pointer', transition: 'all 0.15s' },
    emptyCard: { padding: '4rem 0', textAlign: 'center', background: '#f8fafc', border: '2px dashed #cbd5e1', color: '#64748b', borderRadius: 12, fontSize: 14 }
};

export default FacultyCoursePage;
