import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Notification } from '@/contexts/SocketContext';

interface NotificationListProps {
    notifications: Notification[];
    onMarkRead: (id: string) => void;
}

const NotificationList: React.FC<NotificationListProps> = ({ notifications, onMarkRead }) => {
    const { user } = useAuth();

    if (notifications.length === 0) {
        return <div style={styles.empty}>No notifications right now.</div>;
    }

    const formatTime = (iso: string) => {
        try {
            const date = new Date(iso);
            return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } catch { return iso; }
    };

    const getResolvedLink = (action: string) => {
        if (!action || !user) return '';
        if (action.startsWith('/student/') || action.startsWith('/faculty/') || action.startsWith('/admin/')) {
            return action;
        }
        return `/${user.role}${action}`;
    };

    return (
        <div style={styles.container}>
            {notifications.map(n => {
                const resolvedLink = getResolvedLink(n.linkAction);
                return (
                    <div key={n._id} style={n.isRead ? styles.itemRead : styles.itemUnread}>
                        <div style={styles.content}>
                            <div style={styles.header}>
                                <span style={styles.typeBadge(n.type)}>{n.type.replace('_', ' ')}</span>
                                <span style={styles.time}>{formatTime(n.createdAt)}</span>
                            </div>
                            <p style={styles.message}>{n.message}</p>
                            {resolvedLink && (
                                <Link to={resolvedLink} style={styles.link}>View Details</Link>
                            )}
                        </div>
                        {!n.isRead && (
                            <button onClick={() => onMarkRead(n._id)} style={styles.readBtn}>✓</button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const styles: Record<string, any> = {
    empty: { padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, fontStyle: 'italic' },
    container: { display: 'flex', flexDirection: 'column', maxHeight: 400, overflowY: 'auto' },
    itemUnread: { display: 'flex', alignItems: 'flex-start', padding: '16px', borderBottom: '1px solid var(--border-color)', background: 'var(--active-menu-bg)', transition: 'background 0.2s' },
    itemRead: { display: 'flex', alignItems: 'flex-start', padding: '16px', borderBottom: '1px solid var(--border-color)', background:'var(--card-bg)', opacity: 0.75 },
    content: { flex: 1 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    time: { fontSize: 11, color: 'var(--text-muted)' },
    message: { margin: 0, fontSize: 14, color: 'var(--text-main)', lineHeight: 1.4 },
    link: { display: 'inline-block', marginTop: 8, fontSize: 13, color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 },
    readBtn: { marginLeft: 12, background: 'none', border: '1px solid var(--border-color)', color: 'var(--primary)', width: 24, height: 24, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 },
    typeBadge: (type: string) => {
        let bg = 'rgba(99, 102, 241, 0.15)', col = '#6366f1';
        if (type.includes('quiz')) { bg = 'rgba(16, 185, 129, 0.15)'; col = '#10b981'; }
        if (type.includes('assignment')) { bg = 'rgba(239, 68, 68, 0.15)'; col = '#ef4444'; }
        return { padding: '2px 8px', borderRadius: 99, background: bg, color: col, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' };
    }
};

export default NotificationList;
