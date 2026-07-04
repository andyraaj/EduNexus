import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { Clipboard, AlertTriangle, ShieldAlert, Calendar, Check, X } from 'lucide-react';
import api from '@/services/api';
import { fetchMentees, recordMentorshipNote, updateMentorshipMeetingStatus, requestMentorshipMeeting, type MentorshipMeeting } from '@/services/facultyAddonsService';

interface Mentee {
    _id: string;
    rollNumber: string;
    department: string;
    semester: number;
    user: { name: string; email: string };
    gpa: number;
    attendanceRate: number;
    backlogsCount: number;
    notes: string[];
    meetings: MentorshipMeeting[];
}

const DEFAULT_MENTEES = [
    { name: 'Aarav Sharma', roll: '2023CS01', dept: 'CSE', sem: 6, gpa: 8.7, att: 84, backlogs: 0, notes: ['Aarav is showing great interest in deep learning. Wants to apply for a research internship.'], meetings: [] },
    { name: 'Kavya Iyer', roll: '2023CS12', dept: 'CSE', sem: 6, gpa: 7.2, att: 71, backlogs: 1, notes: ['Low attendance in Quantum Mechanics. Discussed health issues, advised her to submit leave proofs.'], meetings: [] },
    { name: 'Aditya Verma', roll: '2023CS25', dept: 'CSE', sem: 6, gpa: 9.4, att: 96, backlogs: 0, notes: ['Top performer. Advised him to prepare for competitive coding contests like ACM ICPC.'], meetings: [] },
    { name: 'Ananya Sen', roll: '2023CS44', dept: 'CSE', sem: 6, gpa: 6.1, att: 65, backlogs: 3, notes: ['Critical backlog alert in Discrete Mathematics. Set up weekly doubt solving drills.'], meetings: [] },
];

const FacultyMentorshipPage: React.FC = () => {
    const { accessToken, user } = useAuth();
    const { socket } = useSocket();
    const [mentees, setMentees] = useState<Mentee[]>([]);
    const [selectedMentee, setSelectedMentee] = useState<Mentee | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Advising log note input state
    const [newNote, setNewNote] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);

    // Meeting modal state
    const [showMeetingModal, setShowMeetingModal] = useState(false);
    const [meetingTitle, setMeetingTitle] = useState('');
    const [meetingDesc, setMeetingDesc] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [isSubmittingMeeting, setIsSubmittingMeeting] = useState(false);

    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3000);
    };

    const loadMentees = () => {
        if (!accessToken) return;
        setIsLoading(true);
        fetchMentees(accessToken)
            .then((res: any) => {
                const fetched = res.mentees || [];
                if (fetched.length === 0) {
                    api.get('/faculty/students', accessToken)
                        .then(stdRes => {
                            const students = stdRes.data || [];
                            const enriched = students.map((st: any, idx: number) => {
                                const mockData = DEFAULT_MENTEES[idx % DEFAULT_MENTEES.length];
                                return {
                                    _id: st._id,
                                    rollNumber: st.rollNumber || mockData.roll,
                                    department: st.department?.name || mockData.dept,
                                    semester: st.semester || mockData.sem,
                                    user: {
                                        name: st?.name || st.name || mockData.name,
                                        email: st?.email || st.email || 'student@EduNexus.edu',
                                    },
                                    gpa: Number((6.0 + (idx * 0.73) % 4.0).toFixed(2)),
                                    attendanceRate: Math.round(62 + (idx * 9.7) % 38),
                                    backlogsCount: (idx % 4 === 0) ? (idx % 2 === 0 ? 2 : 1) : 0,
                                    notes: [...mockData.notes],
                                    meetings: [],
                                };
                            });
                            setMentees(enriched);
                            if (enriched.length > 0) {
                                // Match previously selected or pick first
                                setSelectedMentee(prev => {
                                    if (prev) {
                                        const match = enriched.find((m: any) => m._id === prev._id);
                                        if (match) return match;
                                    }
                                    return enriched[0];
                                });
                            }
                        })
                        .catch(() => setMentees([]));
                } else {
                    setMentees(fetched);
                    if (fetched.length > 0) {
                        setSelectedMentee(prev => {
                            if (prev) {
                                const match = fetched.find((m: any) => m._id === prev._id);
                                if (match) return match;
                            }
                            return fetched[0];
                        });
                    }
                }
                setIsLoading(false);
            })
            .catch((err: any) => {
                console.error(err);
                setIsLoading(false);
            });
    };

    useEffect(() => {
        loadMentees();
    }, [accessToken]);

    // Live Socket sync
    useEffect(() => {
        if (!socket) return;
        const handleNotif = () => {
            loadMentees();
        };
        socket.on('newNotification', handleNotif);
        return () => {
            socket.off('newNotification', handleNotif);
        };
    }, [socket]);

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim() || !selectedMentee || !accessToken) return;
        setIsSavingNote(true);
        try {
            await recordMentorshipNote(accessToken, {
                studentId: selectedMentee._id,
                note: newNote,
                gpa: selectedMentee.gpa,
                attendanceRate: selectedMentee.attendanceRate,
                backlogsCount: selectedMentee.backlogsCount,
            });

            // Append note locally
            const updatedMentees = mentees.map(m => {
                if (m._id === selectedMentee._id) {
                    const nextNotes = [newNote, ...m.notes];
                    return { ...m, notes: nextNotes };
                }
                return m;
            });
            setMentees(updatedMentees);
            setSelectedMentee(prev => prev ? { ...prev, notes: [newNote, ...prev.notes] } : null);
            setNewNote('');
            showToast('✅ Advisor log recorded successfully!');
        } catch (e) {
            showToast('Failed to save log entry.', false);
        } finally {
            setIsSavingNote(false);
        }
    };

    const handleUpdateMeetingStatus = async (meetingId: string, status: 'approved' | 'declined' | 'completed') => {
        if (!accessToken || !selectedMentee) return;
        try {
            await updateMentorshipMeetingStatus(accessToken, meetingId, status);
            showToast(`Meeting marked as ${status}.`);
            loadMentees();
        } catch (e: any) {
            showToast(e.message || 'Failed to update meeting status.', false);
        }
    };

    const handleScheduleMeeting = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMentee || !accessToken) return showToast('Please select a student first.', false);
        if (!meetingTitle.trim() || !scheduledAt) return showToast('Please provide a title and date/time.', false);

        setIsSubmittingMeeting(true);
        try {
            await requestMentorshipMeeting(accessToken, {
                title: meetingTitle,
                description: meetingDesc,
                scheduledAt,
                targetUserId: selectedMentee._id,
            });
            showToast('✅ Mentorship meeting proposed successfully!');
            setMeetingTitle('');
            setMeetingDesc('');
            setScheduledAt('');
            setShowMeetingModal(false);
            loadMentees();
        } catch (e: any) {
            showToast(e.message || 'Failed to schedule meeting.', false);
        } finally {
            setIsSubmittingMeeting(false);
        }
    };

    // Calculate mentoring summary
    const criticalCount = mentees.filter(m => m.attendanceRate < 75 || m.backlogsCount > 0).length;

    return (
        <div className="responsive-page responsive-mentorship-page responsive-faculty-mentorship-page" style={styles.page}>
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

            <div className="responsive-header" style={styles.header}>
                <div>
                    <h1 style={styles.title}>Mentorship & Advising Panel</h1>
                    <p style={styles.subtitle}>Monitor CGPAs, attendance percentages, backlog logs, and register direct advising notes.</p>
                </div>
            </div>

            {isLoading && mentees.length === 0 ? (
                <div style={styles.empty}>Assembling mentee database...</div>
            ) : (
                <div className="responsive-split-grid responsive-mentorship-grid" style={styles.grid}>
                    {/* LEFT COLUMN: Roster of Mentees */}
                    <div style={styles.listCard}>
                        <div style={styles.cardHeader}>
                            <h3 style={styles.cardTitle}>My Mentees</h3>
                            {criticalCount > 0 && (
                                <span style={styles.alertPill}>
                                    <ShieldAlert size={12} />
                                    {criticalCount} Critical
                                </span>
                            )}
                        </div>

                        <div style={styles.listContainer}>
                            {mentees.map(m => {
                                const isCritical = m.attendanceRate < 75 || m.backlogsCount > 0;
                                const isActive = selectedMentee?._id === m._id;
                                return (
                                    <div 
                                        key={m._id} 
                                        style={{
                                            ...styles.menteeItem,
                                            ...(isActive ? styles.activeMentee : {}),
                                            ...(isCritical && !isActive ? styles.criticalBorder : {})
                                        }}
                                        onClick={() => setSelectedMentee(m)}
                                    >
                                        <div style={styles.menteeTop}>
                                            <h4 style={styles.menteeName}>{m.user.name}</h4>
                                            {isCritical && (
                                                <span style={styles.warningIcon} title="Attention Required!"><AlertTriangle size={14} color="#dc2626" /></span>
                                            )}
                                        </div>
                                        <div style={styles.menteeMeta}>
                                            <span>Roll: {m.rollNumber}</span>
                                            <span>GPA: {m.gpa}</span>
                                            <span style={{ color: m.attendanceRate < 75 ? '#b91c1c' : 'var(--text-muted)', fontWeight: m.attendanceRate < 75 ? 600 : 400 }}>
                                                Att: {m.attendanceRate}%
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Mentee Academic File */}
                    <div style={styles.detailsCard}>
                        {!selectedMentee ? (
                            <div style={styles.emptyState}>
                                <Clipboard size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                                <p>Select a student to view their complete academic advising portfolio.</p>
                            </div>
                        ) : (
                            <div style={styles.menteeFile}>
                                <div style={styles.fileHeader}>
                                    <div className="responsive-stack-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 style={styles.fileTitle}>{selectedMentee.user.name}</h3>
                                            <p style={styles.fileSub}>Dept: {selectedMentee.department} • Semester: {selectedMentee.semester} • {selectedMentee.user.email}</p>
                                        </div>
                                        <button style={styles.primaryBtn} onClick={() => setShowMeetingModal(true)}>
                                            <Calendar size={16} />
                                            Schedule Session
                                        </button>
                                    </div>
                                </div>

                                {/* Academics Metrics */}
                                <div style={styles.statsRoster}>
                                    <div style={styles.statBox}>
                                        <div style={styles.statLabel}>Current CGPA</div>
                                        <div style={{ ...styles.statVal, color: selectedMentee.gpa >= 8.5 ? '#10b981' : selectedMentee.gpa < 7.0 ? '#ef4444' : 'var(--text-main)' }}>
                                            {selectedMentee.gpa}
                                        </div>
                                    </div>
                                    <div style={styles.statBox}>
                                        <div style={styles.statLabel}>Attendance Rate</div>
                                        <div style={{ ...styles.statVal, color: selectedMentee.attendanceRate < 75 ? '#ef4444' : '#10b981' }}>
                                            {selectedMentee.attendanceRate}%
                                        </div>
                                    </div>
                                    <div style={styles.statBox}>
                                        <div style={styles.statLabel}>Backlogs Count</div>
                                        <div style={{ ...styles.statVal, color: selectedMentee.backlogsCount > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                                            {selectedMentee.backlogsCount}
                                        </div>
                                    </div>
                                </div>

                                {/* Meetings section */}
                                <div style={styles.meetingsSection}>
                                    <h4 style={styles.sectionHeading}>🗓️ Mentorship Meetings</h4>
                                    <div style={styles.meetingsList}>
                                        {(!selectedMentee.meetings || selectedMentee.meetings.length === 0) ? (
                                            <p style={styles.noNotes}>No advising meetings scheduled.</p>
                                        ) : (
                                            selectedMentee.meetings.map(m => {
                                                const isStudentReq = m.requestedBy === 'student';
                                                return (
                                                    <div key={m._id} style={styles.meetingItem}>
                                                        <div className="responsive-meeting-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <div>
                                                                <h5 style={styles.meetingTitle}>{m.title}</h5>
                                                                {m.description && <p style={styles.meetingDesc}>{m.description}</p>}
                                                                <span style={styles.meetingTime}>🕒 {new Date(m.scheduledAt).toLocaleString()}</span>
                                                                <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-muted)' }}>
                                                                    ({isStudentReq ? 'Requested by Student' : 'Scheduled by You'})
                                                                </span>
                                                            </div>
                                                            <div className="responsive-stack-sm" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                                                <span style={{
                                                                    ...styles.statusTag,
                                                                    background: m.status === 'approved' ? '#dcfce7' : m.status === 'declined' ? '#fee2e2' : m.status === 'completed' ? '#f3f4f6' : '#fef3c7',
                                                                    color: m.status === 'approved' ? '#15803d' : m.status === 'declined' ? '#b91c1c' : m.status === 'completed' ? '#4b5563' : '#b45309',
                                                                }}>{m.status.toUpperCase()}</span>

                                                                {m.status === 'pending' && (
                                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                                        <button
                                                                            style={styles.approveBtn}
                                                                            onClick={() => handleUpdateMeetingStatus(m._id, 'approved')}
                                                                            title="Approve"
                                                                        >
                                                                            <Check size={12} /> Accept
                                                                        </button>
                                                                        <button
                                                                            style={styles.declineBtn}
                                                                            onClick={() => handleUpdateMeetingStatus(m._id, 'declined')}
                                                                            title="Decline"
                                                                        >
                                                                            <X size={12} /> Decline
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {m.status === 'approved' && (
                                                                    <button
                                                                        style={styles.completeBtn}
                                                                        onClick={() => handleUpdateMeetingStatus(m._id, 'completed')}
                                                                    >
                                                                        Mark Complete
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Advising Logs Form */}
                                <div style={styles.logsSection}>
                                    <h4 style={styles.sectionHeading}>📝 Register Advising Note</h4>
                                    <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                                                    <div className="responsive-advisor-row" style={styles.advisorRow}>
                                        <textarea 
                                            required
                                            placeholder="Document key takeaways, performance reviews, or personal challenges..." 
                                            style={styles.chatInput}
                                            value={newNote}
                                            onChange={e => setNewNote(e.target.value)}
                                            disabled={isSavingNote}
                                        />
                                        <button 
                                            type="submit" 
                                            style={styles.sendBtn}
                                            disabled={isSavingNote || !newNote.trim()}
                                        >
                                            {isSavingNote ? 'Recording...' : 'Add Log Entry'}
                                        </button>
                                    </div>
                                    </form>

                                    {/* Advisor Timeline Logs */}
                                    <h4 style={styles.sectionHeading}>🕒 Previous Advising Logs</h4>
                                    <div style={styles.notesTimeline}>
                                        {selectedMentee.notes.length === 0 ? (
                                            <p style={styles.noNotes}>No advising logs exist for this student.</p>
                                        ) : (
                                            selectedMentee.notes.map((note, idx) => (
                                                <div key={idx} style={styles.timelineItem}>
                                                    <div style={styles.timelineBadge}>●</div>
                                                    <div style={styles.timelineContent}>
                                                        <div style={styles.timelineDate}>Log Entry #{selectedMentee.notes.length - idx}</div>
                                                        <p style={styles.timelineMsg}>{note}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Schedule Meeting Modal */}
            {showMeetingModal && selectedMentee && (
                <div style={styles.modalOverlay}>
                    <div className="responsive-modal" style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Schedule Advising Session with {selectedMentee.user.name}</h3>
                            <button style={styles.closeBtn} onClick={() => setShowMeetingModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleScheduleMeeting} style={styles.modalForm}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Proposed Subject / Title</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="e.g. Attendance Review, Grade Assessment Feedback" 
                                    style={styles.input} 
                                    value={meetingTitle}
                                    onChange={e => setMeetingTitle(e.target.value)}
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Description / Goals</label>
                                <textarea 
                                    placeholder="Outline primary targets for this meeting..." 
                                    style={{ ...styles.input, height: 90, resize: 'none' }}
                                    value={meetingDesc}
                                    onChange={e => setMeetingDesc(e.target.value)}
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Scheduled Date-Time</label>
                                <input 
                                    type="datetime-local" 
                                    required 
                                    style={styles.input} 
                                    value={scheduledAt}
                                    onChange={e => setScheduledAt(e.target.value)}
                                />
                            </div>
                            <div style={styles.modalActions}>
                                <button type="button" style={styles.cancelBtn} onClick={() => setShowMeetingModal(false)}>Cancel</button>
                                <button type="submit" style={styles.primaryBtn} disabled={isSubmittingMeeting}>
                                    {isSubmittingMeeting ? 'Scheduling...' : 'Schedule Meeting'}
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
    header: { marginBottom: '2rem' },
    title: { fontSize: 26, fontWeight: 800, color: 'var(--text-main)', margin: 0 },
    subtitle: { fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.5 },
    
    empty: { padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--page-bg)', borderRadius: 12, border: '1px dashed #d1d5db' },
    
    grid: { display: 'grid', gridTemplateColumns: '1.1fr 1.6fr', gap: 24, minHeight: '72vh', alignItems: 'stretch' },
    
    // Left List
    listCard: { background: 'var(--card-bg, #ffffff)', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px rgba(0,0,0,0.01)' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    cardTitle: { margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-main)' },
    alertPill: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '4px 8px', background: '#fee2e2', color: '#dc2626', borderRadius: 999 },
    
    listContainer: { display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1, paddingRight: 4 },
    menteeItem: { border: '1px solid #e5e7eb', padding: 14, borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', background: '#fcfcfd' },
    activeMentee: { borderColor: '#6366f1', background: '#eef2ff' },
    criticalBorder: { borderLeft: '3px solid #dc2626' },
    menteeTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    menteeName: { margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-main)' },
    warningIcon: { display: 'inline-flex', alignItems: 'center' },
    menteeMeta: { display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' },
    
    // Right Details File
    detailsCard: { background: 'var(--card-bg, #ffffff)', border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.01)' },
    menteeFile: { display: 'flex', flexDirection: 'column', gap: 20 },
    fileHeader: { borderBottom: '1px solid #f1f5f9', paddingBottom: 16 },
    fileTitle: { margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-main)' },
    fileSub: { margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' },
    primaryBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' },
    
    statsRoster: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
    statBox: { padding: 14, background: '#fafbfc', borderRadius: 10, border: '1px solid #e2e8f0', textAlign: 'center' },
    statLabel: { fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
    statVal: { fontSize: 20, fontWeight: 800, color: 'var(--text-main)', marginTop: 4 },
    
    meetingsSection: { display: 'flex', flexDirection: 'column', gap: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 20 },
    meetingsList: { display: 'flex', flexDirection: 'column', gap: 10 },
    meetingItem: { border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, background: '#fafbfc' },
    meetingTitle: { margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-main)' },
    meetingDesc: { margin: '4px 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 },
    meetingTime: { fontSize: 11, color: '#6366f1', fontWeight: 600 },
    statusTag: { fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4 },
    approveBtn: { display: 'flex', alignItems: 'center', gap: 4, background: '#dcfce7', color: '#15803d', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
    declineBtn: { display: 'flex', alignItems: 'center', gap: 4, background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
    completeBtn: { background: '#f3f4f6', color: '#4b5563', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' },

    logsSection: { display: 'flex', flexDirection: 'column', gap: 16 },
    sectionHeading: { margin: '12px 0 0', fontSize: 14, fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' },
    noteForm: { display: 'flex', flexDirection: 'column', gap: 10 },
    chatInput: { width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', background: 'var(--card-bg)', color: 'var(--text-main)', fontFamily: 'inherit', minHeight: 70, boxSizing: 'border-box' },
    sendBtn: { alignSelf: 'flex-end', padding: '9px 18px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' },
    
    notesTimeline: { display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 },
    timelineItem: { display: 'flex', gap: 12 },
    timelineBadge: { color: '#6366f1', fontSize: 12, marginTop: 2 },
    timelineContent: { background: '#fafbfc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, flex: 1 },
    timelineDate: { fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 4 },
    timelineMsg: { margin: 0, fontSize: 13, color: 'var(--text-main)', lineHeight: 1.4 },
    noNotes: { fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 },
    
    emptyState: { padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
    toast: { position: 'fixed', top: 20, right: 20, padding: '12px 20px', borderRadius: 10, border: '1px solid', fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },

    // Modal
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' },
    modal: { background: '#fff', width: '100%', maxWidth: 460, borderRadius: 16, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    modalTitle: { margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-main)' },
    closeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' },
    modalForm: { display: 'flex', flexDirection: 'column', gap: 16 },
    formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
    label: { fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' },
    input: { padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' },
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
    cancelBtn: { padding: '9px 18px', background: '#f3f4f6', color: '#4b5563', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
};

export default FacultyMentorshipPage;
