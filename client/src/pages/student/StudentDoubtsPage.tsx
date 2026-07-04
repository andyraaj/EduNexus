import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { fetchStudentDoubts, createDoubtQuery, replyToDoubt, updateDoubtStatus, type DoubtQuery } from '@/services/facultyAddonsService';
import { fetchMyEnrollments } from '@/services/courseService';
import { HelpCircle, MessageSquare, Send, CheckCircle2, Lock, Plus, Search, Filter, AlertCircle, RefreshCw, X } from 'lucide-react';

const StudentDoubtsPage: React.FC = () => {
    const { accessToken, user } = useAuth();
    const { socket } = useSocket();
    
    const [doubts, setDoubts] = useState<DoubtQuery[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [selectedDoubt, setSelectedDoubt] = useState<DoubtQuery | null>(null);
    
    // Form state
    const [showNewModal, setShowNewModal] = useState(false);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    
    // UI state
    const [replyMsg, setReplyMsg] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isReplying, setIsReplying] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
    
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        window.setTimeout(() => setToast(null), 3000);
    };

    const loadData = async () => {
        if (!accessToken) return;
        setIsLoading(true);
        try {
            const [doubtRes, enrollRes] = await Promise.all([
                fetchStudentDoubts(accessToken),
                fetchMyEnrollments(accessToken)
            ]);
            setDoubts(doubtRes.doubts || []);
            setCourses(enrollRes.enrollments?.map((e: any) => e.course) || []);
            
            // Refresh selected doubt if active
            if (selectedDoubt) {
                const updated = doubtRes.doubts.find((d: DoubtQuery) => d._id === selectedDoubt._id);
                if (updated) setSelectedDoubt(updated);
            }
        } catch (e: any) {
            showToast(e.message || 'Failed to load doubt solver data.', false);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [accessToken]);

    // Socket real-time sync for replies
    useEffect(() => {
        if (!socket) return;
        
        const handleDoubtUpdate = () => {
            loadData();
        };

        socket.on('newNotification', handleDoubtUpdate);
        return () => {
            socket.off('newNotification', handleDoubtUpdate);
        };
    }, [socket, selectedDoubt]);

    const handleCreateDoubt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourseId || !title.trim() || !description.trim() || !accessToken) {
            return showToast('Please complete all form fields.', false);
        }
        
        setIsSubmitting(true);
        try {
            await createDoubtQuery(accessToken, {
                courseId: selectedCourseId,
                title,
                description
            });
            showToast('✅ Academic doubt posted successfully!');
            setTitle('');
            setDescription('');
            setSelectedCourseId('');
            setShowNewModal(false);
            await loadData();
        } catch (e: any) {
            showToast(e.message || 'Failed to post academic doubt.', false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyMsg.trim() || !selectedDoubt || !accessToken) return;
        
        setIsReplying(true);
        try {
            const res = await replyToDoubt(accessToken, selectedDoubt._id, replyMsg);
            setSelectedDoubt(res.doubt);
            setReplyMsg('');
            showToast('Reply submitted.');
            await loadData();
        } catch (e: any) {
            showToast(e.message || 'Failed to post reply.', false);
        } finally {
            setIsReplying(false);
        }
    };

    const handleToggleStatus = async (doubtId: string, currentStatus: 'open' | 'resolved') => {
        if (!accessToken) return;
        const nextStatus = currentStatus === 'open' ? 'resolved' : 'open';
        try {
            const res = await updateDoubtStatus(accessToken, doubtId, nextStatus);
            setSelectedDoubt(res.doubt);
            showToast(`Doubt marked as ${nextStatus}.`);
            await loadData();
        } catch (e: any) {
            showToast(e.message || 'Failed to update doubt status.', false);
        }
    };

    const filtered = doubts.filter(d => {
        const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              d.course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              d.course.code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' ? true : d.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="responsive-page responsive-doubts-page" style={styles.page}>
            {toast && (
                <div style={{
                    ...styles.toast,
                    background: toast.ok ? '#eff6ff' : '#fee2e2',
                    color: toast.ok ? '#1d4ed8' : '#991b1b',
                    borderColor: toast.ok ? '#bfdbfe' : '#fca5a5'
                }}>
                    {toast.msg}
                </div>
            )}

            <div className="responsive-header" style={styles.header}>
                <div>
                    <h1 style={styles.title}>Academic Doubt Solver</h1>
                    <p style={styles.subtitle}>Clarify concepts, communicate directly with course professors, and keep track of your doubt resolution timeline.</p>
                </div>
                <button style={styles.primaryBtn} onClick={() => setShowNewModal(true)}>
                    <Plus size={16} />
                    Raise New Doubt
                </button>
            </div>

            {/* Toolbar */}
            <div className="responsive-toolbar responsive-doubts-toolbar" style={styles.toolbar}>
                <div style={styles.searchBox}>
                    <Search size={16} style={{ color: 'var(--text-muted)' }} />
                    <input 
                        type="text" 
                        placeholder="Search doubts by keyword or course..." 
                        style={styles.searchInput}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div style={styles.filterGroup}>
                    <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                    <select 
                        style={styles.selectFilter}
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="open">Open doubts</option>
                        <option value="resolved">Resolved doubts</option>
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div style={styles.loadingBox}>
                    <div style={styles.spinner} />
                    <p>Loading doubt dashboard...</p>
                </div>
            ) : doubts.length === 0 ? (
                <div style={styles.emptyBox}>
                    <HelpCircle size={48} style={{ color: '#9ca3af', marginBottom: 12 }} />
                    <h3>No Doubts Raised Yet</h3>
                    <p>Got stuck on a topic or assignment? Raise a secure doubt ticket to discuss directly with your professor.</p>
                    <button style={{ ...styles.primaryBtn, marginTop: 12 }} onClick={() => setShowNewModal(true)}>Raise Your First Doubt</button>
                </div>
            ) : (
                <div className="responsive-split-grid responsive-doubts-grid" style={styles.grid}>
                    {/* Left List Pane */}
                    <div style={styles.listCard}>
                        <div style={styles.listHeader}>
                            <span>Tickets ({filtered.length})</span>
                        </div>
                        <div style={styles.listContainer}>
                            {filtered.length === 0 ? (
                                <p style={styles.emptyText}>No doubt tickets match your search parameters.</p>
                            ) : (
                                filtered.map(d => {
                                    const isActive = selectedDoubt?._id === d._id;
                                    return (
                                        <div 
                                            key={d._id} 
                                            style={{
                                                ...styles.ticketItem,
                                                borderColor: isActive ? '#6366f1' : '#e5e7eb',
                                                background: isActive ? '#f5f3ff' : '#ffffff'
                                            }}
                                            onClick={() => setSelectedDoubt(d)}
                                        >
                                            <div style={styles.ticketTop}>
                                                <span style={styles.courseTag}>{d.course.code}</span>
                                                <span style={{
                                                    ...styles.statusPill,
                                                    background: d.status === 'open' ? '#dcfce7' : '#f3f4f6',
                                                    color: d.status === 'open' ? '#15803d' : '#4b5563'
                                                }}>
                                                    {d.status.toUpperCase()}
                                                </span>
                                            </div>
                                            <h4 style={styles.ticketTitle}>{d.title}</h4>
                                            <p style={styles.ticketDesc}>{d.description}</p>
                                            <div style={styles.ticketMeta}>
                                                <span>Replies: {d.replies.length}</span>
                                                <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Thread View Pane */}
                    <div style={styles.threadCard}>
                        {!selectedDoubt ? (
                            <div style={styles.emptyState}>
                                <MessageSquare size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                                <p>Select an active academic doubt ticket from the left column to view the resolution thread.</p>
                            </div>
                        ) : (
                            <div className="responsive-thread-container" style={styles.threadContainer}>
                                <div className="responsive-thread-header" style={styles.threadHeader}>
                                    <div>
                                        <span style={styles.threadCourseCode}>{selectedDoubt.course.code} - {selectedDoubt.course.title}</span>
                                        <h3 style={styles.threadTitle}>{selectedDoubt.title}</h3>
                                    </div>
                                    <button 
                                        style={{
                                            ...styles.actionBtn,
                                            background: selectedDoubt.status === 'open' ? '#f3f4f6' : '#dcfce7',
                                            color: selectedDoubt.status === 'open' ? '#111827' : '#15803d',
                                        }}
                                        onClick={() => handleToggleStatus(selectedDoubt._id, selectedDoubt.status)}
                                    >
                                        <CheckCircle2 size={16} />
                                        {selectedDoubt.status === 'open' ? 'Mark Resolved' : 'Reopen Doubt'}
                                    </button>
                                </div>

                                {/* Original Doubt Post */}
                                <div className="responsive-original-post" style={styles.originalPost}>
                                    <div style={styles.userInitials}>
                                        {selectedDoubt.student?.name?.charAt(0) || 'S'}
                                    </div>
                                    <div style={styles.postBody}>
                                        <div style={styles.postMeta}>
                                            <strong>{selectedDoubt.student?.name}</strong>
                                            <span>{new Date(selectedDoubt.createdAt).toLocaleString()}</span>
                                        </div>
                                        <p style={styles.postText}>{selectedDoubt.description}</p>
                                    </div>
                                </div>

                                <div className="responsive-replies-heading" style={styles.repliesHeading}>
                                    <span>Discussion Thread ({selectedDoubt.replies.length})</span>
                                </div>

                                {/* Timeline Replies */}
                                <div className="responsive-replies-list" style={styles.repliesList}>
                                    {selectedDoubt.replies.length === 0 ? (
                                        <div style={styles.noRepliesBox}>
                                            <AlertCircle size={18} style={{ color: '#9ca3af' }} />
                                            <span>Professor hasn't replied yet. Replies will appear here in real-time.</span>
                                        </div>
                                    ) : (
                                        selectedDoubt.replies.map(r => {
                                            const isFaculty = r.user.role === 'faculty';
                                            return (
                                                <div key={r._id} style={{
                                                    ...styles.replyRow,
                                                    borderLeft: isFaculty ? '3px solid #6366f1' : 'none',
                                                    paddingLeft: isFaculty ? 12 : 0,
                                                }}>
                                                    <div style={{
                                                        ...styles.userInitials,
                                                        background: isFaculty ? '#e0e7ff' : '#f3f4f6',
                                                        color: isFaculty ? '#4338ca' : '#4b5563'
                                                    }}>
                                                        {r.user.name.charAt(0)}
                                                    </div>
                                                    <div style={styles.postBody}>
                                                        <div style={styles.postMeta}>
                                                            <strong>{r.user.name} </strong>
                                                            {isFaculty && <span style={styles.facultyBadge}>FACULTY</span>}
                                                            <span>{new Date(r.timestamp).toLocaleString()}</span>
                                                        </div>
                                                        <p style={styles.postText}>{r.message}</p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Send Input Form */}
                                {selectedDoubt.status === 'resolved' ? (
                                    <div style={styles.resolvedBanner}>
                                        <Lock size={14} />
                                        <span>This ticket is marked as resolved. Click "Reopen Doubt" above to post further queries.</span>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSendReply} className="responsive-reply-form" style={styles.replyForm}>
                                        <input 
                                            type="text" 
                                            placeholder="Write your academic clarification reply here..." 
                                            style={styles.replyInput}
                                            value={replyMsg}
                                            onChange={e => setReplyMsg(e.target.value)}
                                            disabled={isReplying}
                                        />
                                        <button 
                                            type="submit" 
                                            style={styles.sendBtn}
                                            disabled={isReplying || !replyMsg.trim()}
                                        >
                                            <Send size={15} />
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Raise New Doubt Modal */}
            {showNewModal && (
                <div style={styles.modalOverlay}>
                    <div className="responsive-modal" style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Raise New Academic Doubt</h3>
                            <button style={styles.closeBtn} onClick={() => setShowNewModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateDoubt} style={styles.modalForm}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Select Course / Subject</label>
                                <select 
                                    required 
                                    style={styles.input} 
                                    value={selectedCourseId}
                                    onChange={e => setSelectedCourseId(e.target.value)}
                                >
                                    <option value="">-- Select enrolled course --</option>
                                    {courses.map(c => (
                                        <option key={c._id} value={c._id}>{c.code} - {c.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Doubt Title</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="e.g. Doubts regarding Fourier Transform properties in Unit 3" 
                                    style={styles.input} 
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Detailed Description</label>
                                <textarea 
                                    required 
                                    placeholder="Explain your queries or concept blockers in detail. You can include problem equations or assignment questions." 
                                    style={{ ...styles.input, height: 110, resize: 'none' }}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>
                            <div style={styles.modalActions}>
                                <button type="button" style={styles.cancelBtn} onClick={() => setShowNewModal(false)}>Cancel</button>
                                <button type="submit" style={styles.primaryBtn} disabled={isSubmitting}>
                                    {isSubmitting ? 'Posting Doubt...' : 'Post Ticket'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1300, margin: '0 auto', fontFamily: "'Inter', sans-serif" },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
    title: { fontSize: 26, fontWeight: 800, color: 'var(--text-main)', margin: 0 },
    subtitle: { fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.5, maxWidth: 800 },
    primaryBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' },
    
    toolbar: { display: 'flex', gap: 16, marginBottom: '1.5rem', flexWrap: 'wrap' },
    searchBox: { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 12px', flex: 1, minWidth: 260 },
    searchInput: { border: 'none', outline: 'none', padding: '10px 0', fontSize: 13, width: '100%', color: 'var(--text-main)' },
    filterGroup: { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 12px' },
    selectFilter: { border: 'none', outline: 'none', background: 'none', fontSize: 13, color: 'var(--text-main)', padding: '10px 0', cursor: 'pointer' },
    
    grid: { display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 24, height: '70vh' },
    
    // Left Cards
    listCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column' },
    listHeader: { fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 },
    listContainer: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 },
    ticketItem: { padding: 14, borderRadius: 10, border: '1px solid', cursor: 'pointer', transition: 'all 0.15s' },
    ticketTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    courseTag: { fontSize: 10, fontWeight: 800, background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: 4 },
    statusPill: { fontSize: 9, fontWeight: 800, padding: '3px 6px', borderRadius: 4 },
    ticketTitle: { margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    ticketDesc: { margin: '0 0 8px', fontSize: 12, color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 },
    ticketMeta: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 },
    
    // Right threads
    threadCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' },
    threadContainer: { display: 'flex', flexDirection: 'column', height: '100%' },
    threadHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: 16, marginBottom: 16 },
    threadCourseCode: { fontSize: 11, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase' },
    threadTitle: { margin: '4px 0 0', fontSize: 17, fontWeight: 800, color: 'var(--text-main)' },
    actionBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' },
    
    originalPost: { display: 'flex', gap: 12, background: '#faf5ff', border: '1px dashed #e9d5ff', borderRadius: 10, padding: 14, marginBottom: 16 },
    userInitials: { width: 34, height: 34, borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 },
    postBody: { flex: 1 },
    postMeta: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 },
    postText: { margin: 0, fontSize: 13, color: 'var(--text-main)', lineHeight: 1.45 },
    
    repliesHeading: { fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 },
    repliesList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 4, marginBottom: 16 },
    replyRow: { display: 'flex', gap: 12, alignItems: 'flex-start' },
    facultyBadge: { fontSize: 9, fontWeight: 800, background: '#e0e7ff', color: '#4338ca', padding: '1px 6px', borderRadius: 4 },
    
    replyForm: { display: 'flex', gap: 10, borderTop: '1px solid #f1f5f9', paddingTop: 14 },
    replyInput: { flex: 1, padding: '11px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', background: '#fff', color: 'var(--text-main)' },
    sendBtn: { background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '0 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    resolvedBanner: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#f3f4f6', color: 'var(--text-muted)', borderRadius: 8, padding: 12, fontSize: 12, fontWeight: 600 },
    
    // Modal
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' },
    modal: { background: '#fff', width: '100%', maxWidth: 500, borderRadius: 16, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    modalTitle: { margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-main)' },
    closeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' },
    modalForm: { display: 'flex', flexDirection: 'column', gap: 16 },
    formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
    label: { fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' },
    input: { padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' },
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
    cancelBtn: { padding: '9px 18px', background: '#f3f4f6', color: '#4b5563', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
    
    emptyBox: { textAlign: 'center', padding: '5rem 2rem', background: '#fafbfc', border: '1px dashed #cbd5e1', borderRadius: 16 },
    emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center', padding: '0 2rem' },
    loadingBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 2rem', gap: 12 },
    spinner: { width: 30, height: 30, border: '3px solid #f3f4f6', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' },
    toast: { position: 'fixed', top: 20, right: 20, padding: '12px 20px', borderRadius: 10, border: '1px solid', fontSize: 14, fontWeight: 600, zIndex: 99999, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }
};

export default StudentDoubtsPage;
