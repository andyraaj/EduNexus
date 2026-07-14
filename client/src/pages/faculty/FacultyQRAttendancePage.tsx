import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { fetchTeachingCourses } from '@/services/courseService';
import {
    createQRSession, getQRSession, updateSessionStatus,
    regenerateQR, manualOverride, removeScan,
} from '@/services/qrAttendanceService';
import type { QRSession } from '@/services/qrAttendanceService';
import type { Course } from '@/services/courseService';

/* ─── tiny QR renderer using server-generated data URL ─────────────────────── */
const QRDisplay: React.FC<{ token: string; qrCodeDataURL?: string | null; size?: number }> = ({ token, qrCodeDataURL, size = 240 }) => {
    // Use server-generated QR code if available, fallback to external API as backup
    const qrUrl = qrCodeDataURL || `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(token)}&format=svg&ecc=M`;
    return (
        <img src={qrUrl} width={size} height={size} alt="QR Code"
            style={{ borderRadius: 12, display: 'block' }} />
    );
};

/* ─── countdown helper ───────────────────────────────────────────────────────── */
const useCountdown = (expiresAt: string | null) => {
    const [remaining, setRemaining] = useState(0);
    useEffect(() => {
        if (!expiresAt) return;
        const tick = () => setRemaining(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [expiresAt]);
    const m = Math.floor(remaining / 60).toString().padStart(2, '0');
    const s = (remaining % 60).toString().padStart(2, '0');
    return { remaining, label: `${m}:${s}` };
};

const FacultyQRAttendancePage: React.FC = () => {
    const { accessToken, user } = useAuth();
    const { socket } = useSocket();

    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [sessionLabel, setSessionLabel] = useState('Lecture');
    const [topic, setTopic] = useState('');
    const [room, setRoom] = useState('');
    const [duration, setDuration] = useState(15);
    const [lateAfter, setLateAfter] = useState(10);

    const [session, setSession] = useState<QRSession | null>(null);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const { remaining, label: countdown } = useCountdown(session?.expiresAt || null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    /* load courses */
    useEffect(() => {
        if (!accessToken) return;
        fetchTeachingCourses(accessToken).then(r => setCourses(r.courses)).catch(() => {});
    }, [accessToken]);

    /* poll live session every 8 s */
    useEffect(() => {
        if (!session || session.status === 'ended') return;
        const id = setInterval(async () => {
            try {
                const r = await getQRSession(accessToken!, session._id);
                setSession(r.session);
            } catch {}
        }, 8000);
        return () => clearInterval(id);
    }, [session, accessToken]);

    /* socket: real-time scan events */
    useEffect(() => {
        if (!socket || !session) return;
        socket.emit('joinQRSession', session._id);
        const handler = () => {
            getQRSession(accessToken!, session._id).then(r => setSession(r.session)).catch(() => {});
        };
        socket.on('qr_new_scan', handler);
        return () => {
            socket.emit('leaveQRSession', session._id);
            socket.off('qr_new_scan', handler);
        };
    }, [socket, session?._id]);

    /* auto-expire UI */
    useEffect(() => {
        if (session && session.status === 'active' && remaining === 0) {
            setSession(prev => prev ? { ...prev, status: 'ended' } : null);
        }
    }, [remaining]);

    const handleGenerate = async () => {
        if (!selectedCourse) return showToast('Please select a course.', 'error');
        setLoading(true);
        try {
            const r = await createQRSession(accessToken!, {
                courseId: selectedCourse,
                durationMinutes: duration,
                sessionLabel,
                topic,
                room,
                lateAfterMinutes: lateAfter,
            });
            setSession(r.session);
            showToast('QR Attendance session started!');
        } catch (e: any) {
            showToast(e.message || 'Failed to create session.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleStatus = async (status: 'active' | 'paused' | 'ended') => {
        if (!session) return;
        try {
            await updateSessionStatus(accessToken!, session._id, status);
            setSession(prev => prev ? { ...prev, status } : null);
            if (status === 'ended') showToast('Session ended. Attendance saved.');
        } catch (e: any) {
            showToast(e.message || 'Failed.', 'error');
        }
    };

    const handleRegenerate = async () => {
        if (!session) return;
        try {
            const r = await regenerateQR(accessToken!, session._id, duration);
            setSession(r.session);
            showToast('QR regenerated.');
        } catch (e: any) {
            showToast(e.message || 'Failed.', 'error');
        }
    };

    const handleRemoveScan = async (studentId: string) => {
        if (!session) return;
        try {
            const r = await removeScan(accessToken!, session._id, studentId);
            setSession(r.session as any);
        } catch (e: any) {
            showToast(e.message || 'Failed.', 'error');
        }
    };

    const scannedCount = session?.scans.length || 0;
    const timerPercent = session
        ? Math.max(0, Math.min(100, (remaining / (duration * 60)) * 100))
        : 0;

    const statusColor = session?.status === 'active' ? '#10b981' : session?.status === 'paused' ? '#f59e0b' : '#6b7280';

    return (
        <div style={s.page}>
            {/* Toast */}
            {toast && (
                <div style={{ ...s.toast, background: toast.type === 'error' ? '#7f1d1d' : '#064e3b', borderColor: toast.type === 'error' ? '#ef4444' : '#10b981' }}>
                    {toast.type === 'error' ? '⚠️' : '✅'} {toast.msg}
                </div>
            )}

            {/* Header */}
            <div style={s.header}>
                <div>
                    <h1 style={s.title}>🎯 QR Attendance</h1>
                    <p style={s.subtitle}>Generate secure QR codes for real-time student attendance</p>
                </div>
                {session && (
                    <div style={{ ...s.statusBadge, background: statusColor + '22', border: `1px solid ${statusColor}`, color: statusColor }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block', marginRight: 6, animation: session.status === 'active' ? 'pulse 1.5s infinite' : 'none' }} />
                        {session.status.toUpperCase()}
                    </div>
                )}
            </div>

            <div style={s.grid}>
                {/* LEFT: Setup / QR */}
                <div style={s.leftCol}>
                    {!session || session.status === 'ended' ? (
                        /* Setup Form */
                        <div style={s.card}>
                            <h2 style={s.cardTitle}>📋 Session Setup</h2>
                            <div style={s.field}>
                                <label style={s.label}>Course *</label>
                                <select style={s.select} value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
                                    <option value="">— Select Course —</option>
                                    {courses.map(c => <option key={c._id} value={c._id}>{c.code} — {c.title}</option>)}
                                </select>
                            </div>
                            <div style={s.row2}>
                                <div style={s.field}>
                                    <label style={s.label}>Session Label</label>
                                    <input style={s.input} value={sessionLabel} onChange={e => setSessionLabel(e.target.value)} placeholder="Lecture / Lab / Tutorial" />
                                </div>
                                <div style={s.field}>
                                    <label style={s.label}>Room / Hall</label>
                                    <input style={s.input} value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g. Room 301" />
                                </div>
                            </div>
                            <div style={s.field}>
                                <label style={s.label}>Topic (optional)</label>
                                <input style={s.input} value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Chapter 4: Arrays" />
                            </div>
                            <div style={s.row2}>
                                <div style={s.field}>
                                    <label style={s.label}>⏱ Duration (min)</label>
                                    <select style={s.select} value={duration} onChange={e => setDuration(Number(e.target.value))}>
                                        {[5, 10, 15, 20, 30, 45, 60].map(v => <option key={v} value={v}>{v} min</option>)}
                                    </select>
                                </div>
                                <div style={s.field}>
                                    <label style={s.label}>⚡ Late After (min)</label>
                                    <select style={s.select} value={lateAfter} onChange={e => setLateAfter(Number(e.target.value))}>
                                        {[5, 10, 15, 20].map(v => <option key={v} value={v}>{v} min</option>)}
                                    </select>
                                </div>
                            </div>
                            <button style={{ ...s.btn, ...s.btnPrimary, opacity: loading ? 0.7 : 1 }} onClick={handleGenerate} disabled={loading}>
                                {loading ? '⌛ Generating...' : '🚀 Generate QR Attendance'}
                            </button>
                        </div>
                    ) : (
                        /* Active QR Display */
                        <div style={s.card}>
                            <div style={s.qrHeader}>
                                <div>
                                    <div style={s.courseTag}>{session.course.code}</div>
                                    <div style={s.sessionName}>{session.sessionLabel} {session.topic ? `— ${session.topic}` : ''}</div>
                                    {session.room && <div style={s.roomTag}>📍 {session.room}</div>}
                                </div>
                                <div style={s.countdownBox}>
                                    <div style={{ ...s.countdown, color: remaining < 60 ? '#ef4444' : '#10b981' }}>{countdown}</div>
                                    <div style={s.countdownLabel}>remaining</div>
                                </div>
                            </div>

                            {/* Timer bar */}
                            <div style={s.timerTrack}>
                                <div style={{ ...s.timerFill, width: `${timerPercent}%`, background: remaining < 60 ? '#ef4444' : '#10b981' }} />
                            </div>

                            {/* QR Code */}
                            <div style={s.qrWrap}>
                                {session.status === 'paused' && (
                                    <div style={s.qrOverlay}>
                                        <div style={{ fontSize: 48 }}>⏸</div>
                                        <div style={{ color: '#f59e0b', fontWeight: 700, marginTop: 8 }}>PAUSED</div>
                                    </div>
                                )}
                                <QRDisplay token={session.token} qrCodeDataURL={(session as any).qrCodeDataURL} size={220} />
                            </div>
                            <p style={s.qrHint}>Students scan this QR with their EduNexus portal</p>

                            {/* Controls */}
                            <div style={s.controls}>
                                {session.status === 'active' && (
                                    <button style={{ ...s.btn, ...s.btnWarning }} onClick={() => handleStatus('paused')}>⏸ Pause</button>
                                )}
                                {session.status === 'paused' && (
                                    <button style={{ ...s.btn, ...s.btnSuccess }} onClick={() => handleStatus('active')}>▶ Resume</button>
                                )}
                                <button style={{ ...s.btn, background: '#1e293b', color: '#94a3b8', border: '1px solid #334155' }} onClick={handleRegenerate}>🔄 Regenerate QR</button>
                                <button style={{ ...s.btn, ...s.btnDanger }} onClick={() => handleStatus('ended')}>⏹ End Session</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: Live Feed */}
                <div style={s.rightCol}>
                    {session && (
                        <>
                            {/* Stats row */}
                            <div style={s.statsRow}>
                                <div style={s.statCard}>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>{scannedCount}</div>
                                    <div style={s.statLabel}>Scanned</div>
                                </div>
                                <div style={s.statCard}>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>
                                        {session.scans.filter(s => s.attendanceStatus === 'late').length}
                                    </div>
                                    <div style={s.statLabel}>Late</div>
                                </div>
                                <div style={s.statCard}>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: '#6366f1' }}>
                                        {session.scans.filter(s => s.attendanceStatus === 'present').length}
                                    </div>
                                    <div style={s.statLabel}>On-Time</div>
                                </div>
                            </div>

                            {/* Live Feed */}
                            <div style={s.card}>
                                <h3 style={s.cardTitle}>📡 Live Attendance Feed</h3>
                                {session.scans.length === 0 ? (
                                    <div style={s.emptyFeed}>
                                        <div style={{ fontSize: 40 }}>👀</div>
                                        <p>Waiting for students to scan...</p>
                                    </div>
                                ) : (
                                    <div style={s.feedList}>
                                        {[...session.scans].reverse().map((scan, idx) => {
                                            const name = (scan.student as any)?.name || 'Student';
                                            const email = (scan.student as any)?.email || '';
                                            const sid = (scan.student as any)?._id || '';
                                            return (
                                                <div key={idx} style={s.feedItem}>
                                                    <div style={s.feedAvatar}>{name.charAt(0).toUpperCase()}</div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={s.feedName}>{name}</div>
                                                        <div style={s.feedTime}>{new Date(scan.scannedAt).toLocaleTimeString()}</div>
                                                    </div>
                                                    <span style={{
                                                        ...s.badge,
                                                        background: scan.attendanceStatus === 'present' ? '#064e3b' : '#78350f',
                                                        color: scan.attendanceStatus === 'present' ? '#6ee7b7' : '#fcd34d',
                                                    }}>
                                                        {scan.attendanceStatus === 'present' ? '✓ On Time' : '⏰ Late'}
                                                    </span>
                                                    <button style={s.removeBtn} title="Remove scan" onClick={() => handleRemoveScan(sid)}>✕</button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {!session && (
                        <div style={s.card}>
                            <div style={s.emptyFeed}>
                                <div style={{ fontSize: 56 }}>📲</div>
                                <h3 style={{ color: '#94a3b8', margin: '12px 0 4px' }}>No Active Session</h3>
                                <p style={{ color: '#475569', fontSize: 13 }}>Generate a QR session to start taking attendance</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
                @keyframes slideIn { from{transform:translateY(8px);opacity:0} to{transform:none;opacity:1} }
            `}</style>
        </div>
    );
};

/* ─── styles ─────────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1300, margin: '0 auto', fontFamily: "'Inter',sans-serif", minHeight: '100vh', background: 'var(--page-bg)' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
    title: { fontSize: 28, fontWeight: 800, color: 'var(--text-main)', margin: 0 },
    subtitle: { fontSize: 14, color: 'var(--text-muted)', marginTop: 4 },
    statusBadge: { display: 'flex', alignItems: 'center', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: 1 },
    toast: { position: 'fixed', top: 20, right: 20, padding: '12px 20px', borderRadius: 10, border: '1px solid', color: '#fff', fontSize: 14, fontWeight: 500, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' },
    grid: { display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' },
    leftCol: { flex: '1 1 420px' },
    rightCol: { flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '1rem' },
    card: { background: 'var(--card-bg)', borderRadius: 16, padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' },
    cardTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text-main)', margin: '0 0 1.25rem' },
    field: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1rem' },
    label: { fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' },
    input: { padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-main)', fontSize: 14, outline: 'none' },
    select: { padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-main)', fontSize: 14, outline: 'none' },
    row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
    btn: { padding: '10px 18px', borderRadius: 9, fontWeight: 600, fontSize: 14, cursor: 'pointer', border: 'none', transition: 'opacity .15s' },
    btnPrimary: { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', width: '100%', padding: '14px', fontSize: 15, marginTop: 8 },
    btnSuccess: { background: '#065f46', color: '#6ee7b7', border: '1px solid #10b981' },
    btnWarning: { background: '#78350f', color: '#fcd34d', border: '1px solid #f59e0b' },
    btnDanger: { background: '#7f1d1d', color: '#fca5a5', border: '1px solid #ef4444' },
    qrHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' },
    courseTag: { fontSize: 11, fontWeight: 700, color: '#818cf8', background: '#1e1b4b', padding: '3px 10px', borderRadius: 20, display: 'inline-block', marginBottom: 4 },
    sessionName: { fontSize: 17, fontWeight: 700, color: 'var(--text-main)' },
    roomTag: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
    countdownBox: { textAlign: 'center' },
    countdown: { fontSize: 30, fontWeight: 800, fontVariantNumeric: 'tabular-nums' },
    countdownLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase' },
    timerTrack: { height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, marginBottom: '1.5rem', overflow: 'hidden' },
    timerFill: { height: '100%', borderRadius: 3, transition: 'width 1s linear, background .5s' },
    qrWrap: { display: 'flex', justifyContent: 'center', background: '#fff', borderRadius: 16, padding: '20px', marginBottom: '1rem', position: 'relative' },
    qrOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
    qrHint: { textAlign: 'center', fontSize: 12, color: '#64748b', margin: '0 0 1.2rem' },
    controls: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' },
    statCard: { background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1rem', textAlign: 'center' },
    statLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginTop: 4 },
    emptyFeed: { textAlign: 'center', padding: '2.5rem 1rem', color: '#475569' },
    feedList: { display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 420, overflowY: 'auto' },
    feedItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, animation: 'slideIn .25s ease' },
    feedAvatar: { width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14, flexShrink: 0 },
    feedName: { fontSize: 14, fontWeight: 600, color: 'var(--text-main)' },
    feedTime: { fontSize: 11, color: '#64748b', marginTop: 2 },
    badge: { fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 12, whiteSpace: 'nowrap' },
    removeBtn: { background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, padding: '4px', borderRadius: 6, opacity: 0.6 },
};

export default FacultyQRAttendancePage;
