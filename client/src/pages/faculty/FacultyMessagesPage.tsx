import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { fetchUsers } from '@/services/userService';
import type { UserRecord } from '@/services/userService';
import ChatWindow from '@/components/ChatWindow';

type ContactRole = 'student' | 'admin';

const FacultyMessagesPage: React.FC = () => {
    const { accessToken } = useAuth();
    const { socket } = useSocket();

    const [contacts, setContacts] = useState<UserRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeContact, setActiveContact] = useState<UserRecord | null>(null);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<ContactRole | 'all'>('all');

    useEffect(() => {
        if (!accessToken) return;

        const load = async () => {
            setIsLoading(true);
            setError('');
            try {
                const [studentRes, adminRes] = await Promise.all([
                    fetchUsers(accessToken, { role: 'student', limit: 500 }),
                    fetchUsers(accessToken, { role: 'admin', limit: 100 }),
                ]);
                setContacts([...studentRes.users, ...adminRes.users]);
            } catch (e: any) {
                setError(e.message || 'Failed to load contacts.');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [accessToken]);

    const isConnected = !!socket?.connected;

    const filteredContacts = contacts.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.email.toLowerCase().includes(search.toLowerCase());
        const matchesRole = roleFilter === 'all' || c.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const roleTag = (role: string) =>
        role === 'student' ? styles.tagStudent : styles.tagAdmin;

    return (
        <div style={styles.page}>
            <div style={styles.pageHeader}>
                <div>
                    <h1 style={styles.title}>Messages</h1>
                    <p style={styles.subtitle}>Chat with your students and admin staff</p>
                </div>
                <div style={styles.socketBadge}>
                    <span style={{ ...styles.dot, background: isConnected ? '#10b981' : '#f59e0b' }} />
                    {isConnected ? 'Live' : 'Connecting…'}
                </div>
            </div>

            <div style={styles.layout}>
                <aside style={styles.sidebar}>
                    <div style={styles.sidebarTop}>
                        <input
                            type="text"
                            placeholder="Search contacts…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={styles.searchInput}
                        />
                        <div style={styles.filterRow}>
                            {(['all', 'student', 'admin'] as const).map(r => (
                                <button
                                    key={r}
                                    onClick={() => setRoleFilter(r)}
                                    style={roleFilter === r ? styles.filterBtnActive : styles.filterBtn}
                                >
                                    {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={styles.contactList}>
                        {isLoading ? (
                            <div style={styles.stateMsg}>
                                <div style={styles.spinner} />
                                Loading contacts…
                            </div>
                        ) : error ? (
                            <div style={{ ...styles.stateMsg, color: '#b91c1c' }}>{error}</div>
                        ) : filteredContacts.length === 0 ? (
                            <div style={styles.stateMsg}>No contacts found.</div>
                        ) : (
                            filteredContacts.map(contact => (
                                <button
                                    key={contact._id}
                                    onClick={() => setActiveContact(contact)}
                                    style={{
                                        ...styles.contactItem,
                                        ...(activeContact?._id === contact._id ? styles.contactItemActive : {}),
                                    }}
                                >
                                    <div style={styles.contactAvatar}>
                                        {contact.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={styles.contactInfo}>
                                        <span style={styles.contactName}>{contact.name}</span>
                                        <span style={{ ...styles.roleTag, ...roleTag(contact.role) }}>
                                            {contact.role}
                                        </span>
                                        <span style={styles.contactEmail}>{contact.email}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </aside>

                <main style={styles.chatPanel}>
                    {activeContact ? (
                        <ChatWindow
                            recipientId={activeContact._id}
                            recipientName={activeContact.name}
                        />
                    ) : (
                        <div style={styles.noChatState}>
                            <div style={styles.noChatIcon}>💬</div>
                            <h3 style={styles.noChatTitle}>Select a contact to start chatting</h3>
                            <p style={styles.noChatSub}>
                                Choose a student or admin from the list to open a conversation.
                            </p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: {
        display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)',
        padding: '1.5rem', gap: '1rem', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
    },
    pageHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
    title: { fontSize: 24, fontWeight: 700, color: 'var(--text-main)', margin: 0 },
    subtitle: { fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' },

    socketBadge: {
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
        color: 'var(--text-main)', background: 'var(--border-color)', padding: '6px 14px',
        borderRadius: 20, border: '1px solid #e5e7eb',
    },
    dot: { width: 8, height: 8, borderRadius: '50%', display: 'inline-block', flexShrink: 0 },

    layout: { display: 'flex', flex: 1, gap: '1.25rem', minHeight: 0, overflow: 'hidden' },

    sidebar: {
        width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'var(--card-bg)', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden',
    },
    sidebarTop: { padding: '14px 14px 0', borderBottom: '1px solid #f3f4f6' },
    searchInput: {
        width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db',
        fontSize: 14, background: 'var(--page-bg)', outline: 'none', boxSizing: 'border-box', marginBottom: 10,
    },
    filterRow: { display: 'flex', gap: 6, paddingBottom: 12 },
    filterBtn: {
        padding: '4px 12px', borderRadius: 16, border: '1px solid #d1d5db', background: 'var(--card-bg)',
        fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', cursor: 'pointer',
    },
    filterBtnActive: {
        padding: '4px 12px', borderRadius: 16, border: '1px solid var(--primary)', background: '#eef2ff',
        fontSize: 12, fontWeight: 600, color: 'var(--primary)', cursor: 'pointer',
    },
    contactList: { flex: 1, overflowY: 'auto', padding: '8px 0' },

    contactItem: {
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 14px',
        background: 'none', border: 'none', borderRadius: 0, cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.15s',
    },
    contactItemActive: { background: '#eef2ff' },
    contactAvatar: {
        width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
        color: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 700, flexShrink: 0,
    },
    contactInfo: { display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden', minWidth: 0 },
    contactName: { fontSize: 14, fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    roleTag: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '1px 6px', borderRadius: 4, width: 'fit-content' },
    tagStudent: { background: '#dcfce7', color: '#166534' },
    tagAdmin: { background: '#fce7f3', color: '#9d174d' },
    contactEmail: { fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },

    stateMsg: { padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
    spinner: { width: 28, height: 28, border: '3px solid #e5e7eb', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },

    chatPanel: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
    noChatState: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--card-bg)', borderRadius: 12, border: '1px solid #e5e7eb', padding: '3rem', textAlign: 'center' },
    noChatIcon: { fontSize: 64, marginBottom: 16 },
    noChatTitle: { fontSize: 20, fontWeight: 700, color: 'var(--text-main)', margin: '0 0 8px' },
    noChatSub: { fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 320 },
};

export default FacultyMessagesPage;
