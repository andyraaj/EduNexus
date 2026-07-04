import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTeachingCourses, Course } from '@/services/courseService';
import { fetchCourseDoubts, replyToDoubt, updateDoubtStatus, DoubtQuery } from '@/services/facultyAddonsService';
import { HelpCircle, CheckCircle, MessageSquare, Send, CornerDownRight, Clock, User, AlertCircle } from 'lucide-react';

const FacultyDoubtsPage: React.FC = () => {
    const { accessToken } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [doubts, setDoubts] = useState<DoubtQuery[]>([]);
    const [selectedDoubt, setSelectedDoubt] = useState<DoubtQuery | null>(null);

    const [isLoadingCourses, setIsLoadingCourses] = useState(true);
    const [isLoadingDoubts, setIsLoadingDoubts] = useState(false);
    
    // Reply form state
    const [replyMsg, setReplyMsg] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        if (!accessToken) return;
        fetchTeachingCourses(accessToken)
            .then(res => {
                setCourses(res.courses || []);
                if (res.courses?.length > 0) {
                    setSelectedCourse(res.courses[0]);
                }
                setIsLoadingCourses(false);
            })
            .catch(err => {
                console.error(err);
                setIsLoadingCourses(false);
            });
    }, [accessToken]);

    const loadDoubts = async (courseId: string) => {
        if (!accessToken) return;
        setIsLoadingDoubts(true);
        try {
            const res = await fetchCourseDoubts(accessToken, courseId);
            setDoubts(res.doubts || []);
            // Update active selected doubt if open
            if (selectedDoubt) {
                const refreshed = res.doubts.find(d => d._id === selectedDoubt._id);
                if (refreshed) setSelectedDoubt(refreshed);
            }
        } catch (e: any) {
            showToast('Failed to load doubt queries.', false);
        } finally {
            setIsLoadingDoubts(false);
        }
    };

    useEffect(() => {
        if (selectedCourse) {
            loadDoubts(selectedCourse._id);
        } else {
            setDoubts([]);
            setSelectedDoubt(null);
        }
    }, [selectedCourse?._id]);

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken || !selectedDoubt || !replyMsg.trim()) return;
        setIsReplying(true);
        try {
            const res = await replyToDoubt(accessToken, selectedDoubt._id, replyMsg);
            setSelectedDoubt(res.doubt);
            setReplyMsg('');
            showToast('✅ Reply sent!');
            if (selectedCourse) loadDoubts(selectedCourse._id);
        } catch (e: any) {
            showToast(e.message || 'Failed to submit reply.', false);
        } finally {
            setIsReplying(false);
        }
    };

    const handleToggleStatus = async (doubtId: string, currentStatus: 'open' | 'resolved') => {
        if (!accessToken || !selectedCourse) return;
        const newStatus = currentStatus === 'open' ? 'resolved' : 'open';
        try {
            await updateDoubtStatus(accessToken, doubtId, newStatus);
            showToast(newStatus === 'resolved' ? '✅ Query marked as Resolved!' : '🔄 Query re-opened.');
            loadDoubts(selectedCourse._id);
        } catch (e: any) {
            showToast('Failed to update status.', false);
        }
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
                    <h1 style={styles.title}>Doubt Clearing Hub</h1>
                    <p style={styles.subtitle}>Solve student doubts, reply in threads, and maintain academic clarity.</p>
                </div>
            </div>

            {/* Course Selector */}
            <div style={styles.row}>
                <div style={{ flex: 1, maxWidth: 380 }}>
                    <label style={styles.selectLabel}>Select Course</label>
                    <select
                        style={styles.select}
                        value={selectedCourse?._id || ''}
                        disabled={isLoadingCourses}
                        onChange={e => setSelectedCourse(courses.find(c => c._id === e.target.value) || null)}
                    >
                        <option value="">{isLoadingCourses ? 'Loading Courses…' : '— Choose a Course —'}</option>
                        {courses.map(c => <option key={c._id} value={c._id}>{c.code} — {c.title}</option>)}
                    </select>
                </div>
            </div>

            {!selectedCourse ? (
                <div style={styles.empty}>Please select an active course to view doubt tickets.</div>
            ) : (
                <div style={styles.grid}>
                    {/* LEFT PANEL: Doubts List */}
                    <div style={styles.listCard}>
                        <h3 style={styles.cardTitle}>
                            Doubt Tickets 
                            <span style={styles.pill}>{doubts.length}</span>
                        </h3>
                        {isLoadingDoubts ? (
                            <div style={styles.emptyState}>Fetching doubts list...</div>
                        ) : doubts.length === 0 ? (
                            <div style={styles.emptyState}>
                                <HelpCircle size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                                <p style={{ margin: 0 }}>No student doubts submitted for this course.</p>
                            </div>
                        ) : (
                            <div style={styles.listContainer}>
                                {doubts.map(d => {
                                    const isActive = selectedDoubt?._id === d._id;
                                    return (
                                        <div 
                                            key={d._id} 
                                            style={{
                                                ...styles.doubtItem,
                                                ...(isActive ? styles.activeDoubt : {})
                                            }}
                                            onClick={() => setSelectedDoubt(d)}
                                        >
                                            <div style={styles.doubtTop}>
                                                <h4 style={styles.doubtTitle}>{d.title}</h4>
                                                <span style={{
                                                    ...styles.statusTag,
                                                    background: d.status === 'resolved' ? '#d1fae5' : '#fee2e2',
                                                    color: d.status === 'resolved' ? '#065f46' : '#b91c1c',
                                                }}>
                                                    {d.status.toUpperCase()}
                                                </span>
                                            </div>
                                            <p style={styles.doubtDescExcerpt}>{d.description}</p>
                                            <div style={styles.doubtMeta}>
                                                <span>👤 {d.student?.name || 'Student'}</span>
                                                <span>💬 {d.replies.length} replies</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* RIGHT PANEL: Chat Thread */}
                    <div style={styles.threadCard}>
                        {!selectedDoubt ? (
                            <div style={styles.emptyState}>
                                <MessageSquare size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                                <h3>Select a Doubt Ticket</h3>
                                <p style={{ margin: 0, fontSize: 13 }}>Click on a query from the list to view the conversation and reply.</p>
                            </div>
                        ) : (
                            <div style={styles.threadContainer}>
                                <div style={styles.threadHeader}>
                                    <div>
                                        <h3 style={styles.threadMainTitle}>{selectedDoubt.title}</h3>
                                        <p style={styles.studentSub}>
                                            Asked by <strong>{selectedDoubt.student?.name}</strong> ({selectedDoubt.student?.email})
                                        </p>
                                    </div>
                                    <button 
                                        style={{
                                            ...styles.resolveBtn,
                                            background: selectedDoubt.status === 'resolved' ? '#f1f5f9' : '#10b981',
                                            color: selectedDoubt.status === 'resolved' ? '#475569' : '#fff'
                                        }}
                                        onClick={() => handleToggleStatus(selectedDoubt._id, selectedDoubt.status)}
                                    >
                                        <CheckCircle size={15} />
                                        <span>{selectedDoubt.status === 'resolved' ? 'Reopen Doubt' : 'Mark Resolved'}</span>
                                    </button>
                                </div>

                                <div style={styles.threadBody}>
                                    {/* Student Original Question */}
                                    <div style={styles.originalQuestionBox}>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                                            <User size={16} color="#6366f1" />
                                            <strong style={{ fontSize: 13, color: '#312e81' }}>{selectedDoubt.student?.name} (Student)</strong>
                                            <span style={styles.timeText}>📅 {new Date(selectedDoubt.createdAt).toLocaleString()}</span>
                                        </div>
                                        <p style={styles.originalDesc}>{selectedDoubt.description}</p>
                                    </div>

                                    {/* Thread Replies */}
                                    <div style={styles.repliesList}>
                                        {selectedDoubt.replies.length === 0 ? (
                                            <p style={styles.noRepliesText}>No replies posted yet. Be the first to answer!</p>
                                        ) : (
                                            selectedDoubt.replies.map(reply => {
                                                const isFacultyReply = reply.user?.role === 'faculty';
                                                return (
                                                    <div 
                                                        key={reply._id} 
                                                        style={{
                                                            ...styles.replyItem,
                                                            alignSelf: isFacultyReply ? 'flex-end' : 'flex-start',
                                                            background: isFacultyReply ? '#eff6ff' : '#f8fafc',
                                                            borderColor: isFacultyReply ? '#bfdbfe' : '#e2e8f0',
                                                        }}
                                                    >
                                                        <div style={styles.replyHeader}>
                                                            <strong style={{ fontSize: 12, color: isFacultyReply ? '#1e3a8a' : '#334155' }}>
                                                                {reply.user?.name} {isFacultyReply && '👨‍🏫'}
                                                            </strong>
                                                            <span style={styles.timeText}>{new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                        <p style={styles.replyMsg}>{reply.message}</p>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Send Input Form */}
                                <form onSubmit={handleSendReply} style={styles.inputArea}>
                                    <input 
                                        type="text" 
                                        style={styles.chatInput} 
                                        placeholder={selectedDoubt.status === 'resolved' ? "Query resolved. Re-open to reply..." : "Type your explanation here..."} 
                                        value={replyMsg}
                                        disabled={isReplying || selectedDoubt.status === 'resolved'}
                                        onChange={e => setReplyMsg(e.target.value)}
                                    />
                                    <button 
                                        type="submit" 
                                        style={styles.sendBtn}
                                        disabled={isReplying || !replyMsg.trim() || selectedDoubt.status === 'resolved'}
                                    >
                                        <Send size={15} />
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1300, margin: '0 auto', fontFamily: "'Inter', sans-serif" },
    header: { marginBottom: '1.5rem' },
    title: { fontSize: 26, fontWeight: 800, color: 'var(--text-main)', margin: 0 },
    subtitle: { fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' },
    
    row: { marginBottom: '1.5rem' },
    selectLabel: { display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 },
    select: { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db', background: 'var(--card-bg)', fontSize: 14 },
    empty: { padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--page-bg)', borderRadius: 12, border: '1px dashed #d1d5db' },
    
    grid: { display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24, height: '70vh', alignItems: 'stretch' },
    listCard: { background: 'var(--card-bg, #ffffff)', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px rgba(0,0,0,0.01)' },
    cardTitle: { margin: '0 0 14px', fontSize: 16, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 },
    pill: { fontSize: 11, fontWeight: 700, padding: '2px 8px', background: '#eff6ff', color: '#1e40af', borderRadius: 999 },
    
    listContainer: { display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1, paddingRight: 4 },
    doubtItem: { border: '1px solid #e5e7eb', padding: 14, borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', background: '#fcfcfd' },
    activeDoubt: { borderColor: '#6366f1', background: '#eef2ff' },
    doubtTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 },
    doubtTitle: { margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 },
    statusTag: { fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em' },
    doubtDescExcerpt: { margin: '0 0 8px', fontSize: 12, color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 },
    doubtMeta: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 },
    
    // Thread Panel
    threadCard: { background: 'var(--card-bg, #ffffff)', border: '1px solid #e5e7eb', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.01)' },
    threadContainer: { display: 'flex', flexDirection: 'column', height: '100%' },
    threadHeader: { padding: 18, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbfc' },
    threadMainTitle: { margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-main)' },
    studentSub: { margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' },
    resolveBtn: { display: 'flex', alignItems: 'center', gap: 6, border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s' },
    
    threadBody: { flex: 1, padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 },
    originalQuestionBox: { padding: 14, background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12 },
    originalDesc: { margin: 0, fontSize: 13, color: '#3730a3', lineHeight: 1.5, whiteSpace: 'pre-line' },
    timeText: { fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' },
    
    repliesList: { display: 'flex', flexDirection: 'column', gap: 10 },
    noRepliesText: { textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', margin: '20px 0' },
    replyItem: { maxWidth: '85%', padding: '10px 14px', borderRadius: 12, border: '1px solid', display: 'flex', flexDirection: 'column', gap: 4 },
    replyHeader: { display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' },
    replyMsg: { margin: 0, fontSize: 13, color: 'var(--text-main)', lineHeight: 1.4 },
    
    inputArea: { padding: 14, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, background: '#fafbfc' },
    chatInput: { flex: 1, padding: '12px 16px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', background: 'var(--card-bg)', color: 'var(--text-main)' },
    sendBtn: { width: 44, height: 44, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' },
    
    emptyState: { padding: '6rem 2rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 },
    toast: { position: 'fixed', top: 20, right: 20, padding: '12px 20px', borderRadius: 10, border: '1px solid', fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }
};

export default FacultyDoubtsPage;
