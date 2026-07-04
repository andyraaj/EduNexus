import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchNotifications, markAsRead } from '@/services/notificationService';
import NotificationList from '@/components/NotificationList';

const NotificationsPanel: React.FC = () => {
    const { accessToken } = useAuth();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!accessToken) return;
        setIsLoading(true);
        fetchNotifications(accessToken)
            .then(res => setNotifications(res.notifications))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [accessToken]);

    const handleMarkRead = async (id: string) => {
        if (!accessToken) return;
        try {
            await markAsRead(accessToken, id);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (e) {
            console.error(e);
        }
    };

    const handleMarkAllRead = async () => {
        const unreads = notifications.filter(n => !n.isRead);
        for (const n of unreads) {
            await handleMarkRead(n._id);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.headerRow}>
                <div>
                    <h1 style={styles.title}>Your Notifications</h1>
                    <p style={styles.subtitle}>Stay updated on course activities, new assignments, and announcements.</p>
                </div>
                <button 
                    onClick={handleMarkAllRead} 
                    style={styles.markAllBtn}
                    disabled={notifications.filter(n => !n.isRead).length === 0}
                >
                    Mark all as read
                </button>
            </div>

            <div style={styles.card}>
                {isLoading ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading your alerts...</div>
                ) : (
                    <NotificationList 
                        notifications={notifications} 
                        onMarkRead={handleMarkRead} 
                    />
                )}
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 800, margin: '0 auto', fontFamily: "'Inter', sans-serif" },
    headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
    title: { fontSize: 26, fontWeight: 700, color: 'var(--text-main)', margin: 0 },
    subtitle: { fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' },
    markAllBtn: { padding: '8px 16px', background:'var(--card-bg)', border: '1px solid #d1d5db', color: 'var(--text-main)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    card: { background:'var(--card-bg)', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }
};

export default NotificationsPanel;
