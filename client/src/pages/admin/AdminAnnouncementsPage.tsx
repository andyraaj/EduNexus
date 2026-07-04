import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import {
    createNotice,
    deleteNotice,
    fetchNotices,
    updateNotice,
    type Notice,
    type NoticeAudience,
    type NoticeCategory,
} from '@/services/announcementsService';

const CATEGORIES: NoticeCategory[] = ['Urgent', 'Academic', 'Event', 'General'];
const AUDIENCES: NoticeAudience[] = ['all', 'student', 'faculty'];

const AdminAnnouncementsPage: React.FC = () => {
    const { accessToken, user } = useAuth();
    const { socket } = useSocket();
    const [notices, setNotices] = useState<Notice[]>([]);
    const [category, setCategory] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Notice | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        title: '',
        content: '',
        category: 'General' as NoticeCategory,
        targetAudience: 'all' as NoticeAudience,
    });

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const load = async () => {
        if (!accessToken) return;
        setIsLoading(true);
        try {
            const res = await fetchNotices(accessToken, { category });
            setNotices(res.notices || []);
        } catch (e: any) {
            showToast(e?.message || 'Failed to load announcements.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken, category]);

    // Setup socket listener for real-time announcement additions/updates
    useEffect(() => {
        if (!socket) return;
        
        const handleNewAnnouncement = () => {
            load();
        };
        
        socket.on('new_announcement', handleNewAnnouncement);
        return () => {
            socket.off('new_announcement', handleNewAnnouncement);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket]);

    const openCreate = () => {
        setEditing(null);
        setForm({ title: '', content: '', category: 'General', targetAudience: 'all' });
        setModalOpen(true);
    };

    const openEdit = (n: Notice) => {
        setEditing(n);
        setForm({
            title: n.title,
            content: n.content,
            category: n.category,
            targetAudience: n.targetAudience,
        });
        setModalOpen(true);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) return;
        setIsSubmitting(true);
        try {
            if (editing) {
                await updateNotice(accessToken, editing._id, form);
                showToast('Announcement updated.');
            } else {
                await createNotice(accessToken, form);
                showToast('Announcement created.');
            }
            setModalOpen(false);
            await load();
        } catch (e: any) {
            showToast(e?.message || 'Operation failed.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (n: Notice) => {
        if (!accessToken) return;
        if (!window.confirm(`Delete "${n.title}"?`)) return;
        try {
            await deleteNotice(accessToken, n._id);
            showToast('Announcement deleted.');
            await load();
        } catch (e: any) {
            showToast(e?.message || 'Delete failed.', 'error');
        }
    };

    const stats = useMemo(() => {
        const urgent = notices.filter(n => n.category === 'Urgent').length;
        return { total: notices.length, urgent };
    }, [notices]);

    return (
        <div style={styles.page}>
            {toast && (
                <div
                    style={{
                        ...styles.toast,
                        background: toast.type === 'error' ? '#fee2e2' : '#d1fae5',
                        color: toast.type === 'error' ? '#991b1b' : '#065f46',
                        borderColor: toast.type === 'error' ? '#fca5a5' : '#6ee7b7',
                    }}
                >
                    {toast.msg}
                </div>
            )}

            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Announcements</h1>
                    <p style={styles.subtitle}>
                        {stats.total} posts • {stats.urgent} urgent
                    </p>
                </div>
                {(user?.role === 'admin' || user?.role === 'faculty') && (
                    <button style={styles.primaryBtn} onClick={openCreate}>
                        + New Announcement
                    </button>
                )}
            </div>

            <div style={styles.filters}>
                <label style={styles.label}>Category</label>
                <select style={styles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="all">All</option>
                    {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            {isLoading ? (
                <div style={styles.state}>Loading announcements…</div>
            ) : notices.length === 0 ? (
                <div style={styles.state}>No announcements found.</div>
            ) : (
                <div style={styles.grid}>
                    {notices.map(n => (
                        <div key={n._id} style={styles.card}>
                            <div style={styles.cardTop}>
                                <div style={styles.badges}>
                                    <span style={{ ...styles.badge, ...badgeByCategory(n.category) }}>{n.category}</span>
                                    <span style={{ ...styles.badge, ...styles.badgeAudience }}>{String(n.targetAudience)}</span>
                                </div>
                                <div style={styles.date}>{new Date(n.createdAt).toLocaleString()}</div>
                            </div>
                            <h3 style={styles.cardTitle}>{n.title}</h3>
                            <p style={styles.cardBody}>{n.content}</p>
                            <div style={styles.cardFooter}>
                                <div style={styles.poster}>
                                    Posted by: {(n.postedBy as any)?.name || '—'}
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {(user?.role === 'admin' || (user?.role === 'faculty' && (
                                        typeof n.postedBy === 'object' ? (n.postedBy as any)?._id === user?.id : n.postedBy === user?.id
                                    ))) && (
                                        <button style={styles.secondaryBtn} onClick={() => openEdit(n)}>Edit</button>
                                    )}
                                    {user?.role === 'admin' && (
                                        <button style={styles.dangerBtn} onClick={() => handleDelete(n)}>Delete</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modalOpen && (
                <div style={styles.overlay} onClick={() => setModalOpen(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>{editing ? 'Edit Announcement' : 'New Announcement'}</h3>
                        <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
                            <input
                                style={styles.input}
                                placeholder="Title"
                                value={form.title}
                                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                                required
                            />
                            <textarea
                                style={styles.input}
                                placeholder="Content"
                                rows={5}
                                value={form.content}
                                onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                                required
                            />
                            <div style={{ display: 'flex', gap: 10 }}>
                                <select
                                    style={styles.input}
                                    value={form.category}
                                    onChange={(e) => setForm(f => ({ ...f, category: e.target.value as NoticeCategory }))}
                                >
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select
                                    style={styles.input}
                                    value={form.targetAudience}
                                    onChange={(e) => setForm(f => ({ ...f, targetAudience: e.target.value as NoticeAudience }))}
                                >
                                    {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                                <button type="button" style={styles.cancelBtn} onClick={() => setModalOpen(false)}>Cancel</button>
                                <button type="submit" style={styles.primaryBtn} disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const badgeByCategory = (c: NoticeCategory): React.CSSProperties => {
    if (c === 'Urgent') return { background: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' };
    if (c === 'Academic') return { background: '#dbeafe', color: '#1d4ed8', borderColor: '#bfdbfe' };
    if (c === 'Event') return { background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' };
    return { background: 'var(--border-color)', color: 'var(--text-main)', borderColor: 'var(--border-color)' };
};

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1200, margin: '0 auto', fontFamily: "'Inter', sans-serif", position: 'relative' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
    title: { fontSize: 26, fontWeight: 900, color: '#0f172a', margin: 0 },
    subtitle: { fontSize: 14, color: '#64748b', margin: '6px 0 0' },
    filters: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 },
    label: { fontSize: 13, fontWeight: 800, color: 'var(--text-main)' },
    select: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db', background:'var(--card-bg)', fontSize: 14, color: 'var(--text-main)' },

    state: { padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--page-bg)', borderRadius: 12, border: '1px dashed #d1d5db' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 },
    card: { background:'var(--card-bg)', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' },
    cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 },
    badges: { display: 'flex', gap: 8, flexWrap: 'wrap' },
    badge: { padding: '3px 8px', borderRadius: 999, border: '1px solid', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' },
    badgeAudience: { background: '#eef2ff', color: '#3730a3', borderColor: '#c7d2fe' },
    date: { fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 },
    cardTitle: { margin: '6px 0 6px', fontSize: 16, fontWeight: 900, color: 'var(--text-main)' },
    cardBody: { margin: 0, fontSize: 13, color: 'var(--text-main)', lineHeight: 1.55, whiteSpace: 'pre-wrap', flex: 1 },
    cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingTop: 12, marginTop: 12, borderTop: '1px solid #f3f4f6' },
    poster: { fontSize: 12, color: '#64748b', fontWeight: 700 },

    primaryBtn: { padding: '10px 14px', borderRadius: 10, border: 'none', background: 'var(--primary)', color:'var(--card-bg)', fontWeight: 900, cursor: 'pointer' },
    secondaryBtn: { padding: '9px 12px', borderRadius: 10, border: '1px solid #d1d5db', background:'var(--card-bg)', color: 'var(--text-main)', fontWeight: 800, cursor: 'pointer' },
    dangerBtn: { padding: '9px 12px', borderRadius: 10, border: '1px solid #fecaca', background:'var(--card-bg)', color: '#ef4444', fontWeight: 900, cursor: 'pointer' },
    toast: { position: 'fixed', top: 20, right: 20, padding: '12px 18px', borderRadius: 10, border: '1px solid', fontSize: 14, fontWeight: 800, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },

    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
    modal: { width: '100%', maxWidth: 680, background:'var(--card-bg)', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', padding: 16 },
    modalTitle: { margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text-main)' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: 'var(--page-bg)', color: 'var(--text-main)' },
    cancelBtn: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db', background:'var(--card-bg)', color: 'var(--text-main)', fontWeight: 900, cursor: 'pointer' },
};

export default AdminAnnouncementsPage;
