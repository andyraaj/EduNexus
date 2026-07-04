import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket, ConversationUpdate, MessageToast } from '@/contexts/SocketContext';
import { getConversationList, ConversationEntry } from '@/services/messageService';
import ChatWindow from '@/components/ChatWindow';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isThisWeek = (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isThisWeek) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

function roleColor(role: string): string {
    if (role === 'admin') return '#8b5cf6';
    if (role === 'faculty') return '#0ea5e9';
    return '#10b981';
}

function roleLabel(role: string): string {
    if (role === 'admin') return 'Admin';
    if (role === 'faculty') return 'Faculty';
    return 'Student';
}

function avatarBg(role: string): string {
    if (role === 'admin') return 'linear-gradient(135deg,#8b5cf6,#6d28d9)';
    if (role === 'faculty') return 'linear-gradient(135deg,#0ea5e9,#0284c7)';
    return 'linear-gradient(135deg,#10b981,#059669)';
}

// ─── Toast Notification Component ────────────────────────────────────────────

const MessageToastNotification: React.FC<{
    toast: MessageToast;
    onDismiss: (id: string) => void;
    onOpen: (userId: string) => void;
}> = ({ toast, onDismiss, onOpen }) => {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                background: '#1e293b',
                borderRadius: 16,
                padding: '14px 16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                cursor: 'pointer',
                minWidth: 300,
                maxWidth: 380,
                border: '1px solid rgba(255,255,255,0.08)',
                animation: 'slideInToast 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            }}
            onClick={() => { onOpen(toast.senderId); onDismiss(toast.id); }}
        >
            <div style={{
                width: 42, height: 42, borderRadius: '50%',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
                {toast.senderName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>{toast.senderName}</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{formatTime(toast.timestamp)}</span>
                </div>
                <p style={{
                    margin: 0, fontSize: 13, color: '#94a3b8',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                    {toast.content}
                </p>
            </div>
            <button
                onClick={e => { e.stopPropagation(); onDismiss(toast.id); }}
                style={{
                    background: 'none', border: 'none', color: '#475569',
                    cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2, flexShrink: 0,
                }}
            >✕</button>
        </div>
    );
};

// ─── Toast Container ─────────────────────────────────────────────────────────

const ToastContainer: React.FC<{
    toasts: MessageToast[];
    onDismiss: (id: string) => void;
    onOpen: (userId: string) => void;
}> = ({ toasts, onDismiss, onOpen }) => {
    if (toasts.length === 0) return null;
    return (
        <div style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            display: 'flex', flexDirection: 'column', gap: 10,
            pointerEvents: 'auto',
        }}>
            <style>{`
                @keyframes slideInToast {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
            {toasts.map(t => (
                <MessageToastNotification key={t.id} toast={t} onDismiss={onDismiss} onOpen={onOpen} />
            ))}
        </div>
    );
};

// ─── Contact Item ─────────────────────────────────────────────────────────────

const ContactItem: React.FC<{
    conv: ConversationEntry;
    isActive: boolean;
    onClick: () => void;
}> = ({ conv, isActive, onClick }) => {
    const unread = conv.unreadCount || 0;
    return (
        <div
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', padding: '14px 16px',
                cursor: 'pointer', gap: 12,
                background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                borderBottom: '1px solid rgba(0,0,0,0.04)',
                transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.03)';
            }}
            onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
            }}
        >
            {/* Avatar */}
            <div style={{
                width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                background: avatarBg(conv.role),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, color: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                position: 'relative',
            }}>
                {conv.name.charAt(0).toUpperCase()}
                {/* Online indicator */}
                <span style={{
                    position: 'absolute', bottom: 2, right: 2,
                    width: 11, height: 11, borderRadius: '50%',
                    background: '#22c55e', border: '2px solid #fff',
                }} />
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: unread > 0 ? 700 : 600, fontSize: 14, color: 'var(--text-main)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.name}
                    </span>
                    <span style={{ fontSize: 11, color: unread > 0 ? '#6366f1' : 'var(--text-muted)', fontWeight: unread > 0 ? 700 : 400, whiteSpace: 'nowrap', marginLeft: 8 }}>
                        {conv.lastMessageAt ? formatTime(conv.lastMessageAt) : ''}
                    </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{
                        margin: 0, fontSize: 13, flex: 1,
                        color: unread > 0 ? 'var(--text-main)' : 'var(--text-muted)',
                        fontWeight: unread > 0 ? 600 : 400,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {conv.lastMessageFromMe && <span style={{ color: '#6366f1' }}>You: </span>}
                        {conv.lastMessage || <em>Start a conversation</em>}
                    </p>
                    {unread > 0 && (
                        <span style={{
                            minWidth: 22, height: 22, padding: '0 6px', borderRadius: 99,
                            background: '#6366f1', color: '#fff', fontWeight: 800,
                            fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginLeft: 8, flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
                        }}>
                            {unread}
                        </span>
                    )}
                </div>
                <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    color: roleColor(conv.role), letterSpacing: '0.05em',
                }}>
                    {roleLabel(conv.role)}
                </span>
            </div>
        </div>
    );
};

// ─── New Chat User Item ───────────────────────────────────────────────────────

const UserSearchItem: React.FC<{
    user: any;
    onClick: () => void;
}> = ({ user, onClick }) => (
    <div
        onClick={onClick}
        style={{
            display: 'flex', alignItems: 'center', padding: '12px 16px',
            cursor: 'pointer', gap: 12, borderBottom: '1px solid rgba(0,0,0,0.04)',
            transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.03)'}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
    >
        <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: avatarBg(user.role),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: '#fff',
        }}>
            {user.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: roleColor(user.role), textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {roleLabel(user.role)}
            </div>
        </div>
    </div>
);

// ─── Main MessagesPage ────────────────────────────────────────────────────────

const MessagesPage: React.FC = () => {
    const { accessToken, user } = useAuth();
    const { conversationUpdates, messageToasts, dismissToast, unreadMessagesByUser } = useSocket();

    const [conversations, setConversations] = useState<ConversationEntry[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<ConversationEntry | null>(null);
    const [showNewChat, setShowNewChat] = useState(false);
    const [mobileView, setMobileView] = useState<'contacts' | 'chat'>('contacts');
    const [isLoading, setIsLoading] = useState(true);
    const openedUserRef = useRef<string | null>(null);

    // Load conversation list
    const loadConversations = useCallback(async () => {
        if (!accessToken) return;
        try {
            const res = await getConversationList(accessToken);
            setConversations(res.conversations || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [accessToken]);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    // Load all users for "New Chat"
    useEffect(() => {
        if (!accessToken) return;
        import('@/services/api').then(({ default: api }) => {
            api.get('/users?limit=100', accessToken)
                .then((res: any) => setAllUsers((res.data || res.users || []).filter((u: any) => u.isActive && u._id !== user?.id)))
                .catch(console.error);
        });
    }, [accessToken, user?.id]);

    // Handle real-time conversation updates (bubble-to-top like WhatsApp)
    useEffect(() => {
        if (conversationUpdates.length === 0) return;
        const latest = conversationUpdates[0];
        setConversations(prev => {
            const existing = prev.find(c => String(c.userId) === String(latest.userId));
            const updated: ConversationEntry = existing
                ? {
                    ...existing,
                    lastMessage: latest.lastMessage,
                    lastMessageAt: latest.lastMessageAt,
                    lastMessageFromMe: latest.lastMessageFromMe,
                    unreadCount: latest.lastMessageFromMe ? 0 : (existing.unreadCount || 0) + (latest.unreadDelta || 0),
                }
                : {
                    userId: String(latest.userId),
                    name: latest.name,
                    email: latest.email,
                    role: latest.role,
                    lastMessage: latest.lastMessage,
                    lastMessageAt: latest.lastMessageAt,
                    lastMessageFromMe: latest.lastMessageFromMe,
                    unreadCount: latest.lastMessageFromMe ? 0 : 1,
                };
            // Move to top
            return [updated, ...prev.filter(c => String(c.userId) !== String(latest.userId))];
        });
    }, [conversationUpdates]);

    // Handle toast "open" action
    const handleToastOpen = useCallback((userId: string) => {
        const conv = conversations.find(c => String(c.userId) === userId);
        if (conv) {
            setSelectedUser(conv);
            setShowNewChat(false);
            setMobileView('chat');
        }
    }, [conversations]);

    // Select a conversation
    const handleSelectConversation = (conv: ConversationEntry) => {
        setSelectedUser(conv);
        setShowNewChat(false);
        setMobileView('chat');
        openedUserRef.current = conv.userId;
        // Clear unread count locally immediately
        setConversations(prev =>
            prev.map(c => c.userId === conv.userId ? { ...c, unreadCount: 0 } : c)
        );
    };

    // Start a new chat from user directory
    const handleNewChat = (u: any) => {
        const existingConv = conversations.find(c => String(c.userId) === String(u._id));
        if (existingConv) {
            handleSelectConversation(existingConv);
        } else {
            const newEntry: ConversationEntry = {
                userId: u._id,
                name: u.name,
                email: u.email,
                role: u.role,
                lastMessage: '',
                lastMessageAt: '',
                lastMessageFromMe: false,
                unreadCount: 0,
            };
            setConversations(prev => [newEntry, ...prev]);
            setSelectedUser(newEntry);
        }
        setShowNewChat(false);
        setSearchQuery('');
        setMobileView('chat');
    };

    const filteredConversations = conversations.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredUsers = allUsers.filter(u =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

    return (
        <div className="responsive-page responsive-messages-page" style={s.page}>
            {/* Toast notifications */}
            <ToastContainer
                toasts={messageToasts}
                onDismiss={dismissToast}
                onOpen={handleToastOpen}
            />

            <div className="responsive-messages-layout" data-mobile-view={mobileView} style={s.layout}>
                <div className="responsive-messages-switcher" style={s.mobileSwitcher}>
                    <button
                        type="button"
                        className="responsive-messages-switcher-button"
                        style={{ ...s.mobileSwitcherButton, ...(mobileView === 'contacts' ? s.mobileSwitcherButtonActive : {}) }}
                        onClick={() => setMobileView('contacts')}
                    >
                        Contacts
                    </button>
                    <button
                        type="button"
                        className="responsive-messages-switcher-button"
                        style={{ ...s.mobileSwitcherButton, ...(mobileView === 'chat' ? s.mobileSwitcherButtonActive : {}) }}
                        onClick={() => setMobileView('chat')}
                        disabled={!selectedUser}
                    >
                        Chat
                    </button>
                </div>

                {/* ── Sidebar ── */}
                <div className="responsive-messages-sidebar" style={s.sidebar}>
                    {/* Header */}
                    <div style={s.sidebarHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>
                                    Messages
                                    {totalUnread > 0 && (
                                        <span style={{
                                            marginLeft: 10, fontSize: 13, fontWeight: 700,
                                            background: '#6366f1', color: '#fff',
                                            padding: '2px 9px', borderRadius: 99,
                                            boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
                                        }}>
                                            {totalUnread}
                                        </span>
                                    )}
                                </h2>
                                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                    {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <button
                                onClick={() => { setShowNewChat(v => !v); setSearchQuery(''); }}
                                title="New Message"
                                style={{
                                    width: 38, height: 38, borderRadius: 12, border: 'none',
                                    background: showNewChat ? '#6366f1' : 'rgba(99,102,241,0.1)',
                                    color: showNewChat ? '#fff' : '#6366f1',
                                    fontSize: 20, cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s', fontWeight: 700,
                                }}
                            >
                                {showNewChat ? '✕' : '✏️'}
                            </button>
                        </div>

                        <div style={s.searchWrap}>
                            <span style={s.searchIcon}>🔍</span>
                            <input
                                type="text"
                                placeholder={showNewChat ? 'Search people...' : 'Search messages...'}
                                style={s.searchInput}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Contact List */}
                    <div className="responsive-messages-list" style={s.contactsList}>
                        {showNewChat ? (
                            <>
                                <div style={s.sectionLabel}>Start New Conversation</div>
                                {filteredUsers.length === 0 ? (
                                    <div style={s.empty}>No users found.</div>
                                ) : (
                                    filteredUsers.map(u => (
                                        <UserSearchItem key={u._id} user={u} onClick={() => handleNewChat(u)} />
                                    ))
                                )}
                            </>
                        ) : (
                            <>
                                {isLoading ? (
                                    <div style={s.empty}>Loading conversations...</div>
                                ) : filteredConversations.length === 0 ? (
                                    <div style={s.emptyState}>
                                        <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
                                        <p style={{ fontWeight: 600, color: 'var(--text-main)', margin: '0 0 8px' }}>No messages yet</p>
                                        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                                            Click ✏️ to start a conversation
                                        </p>
                                    </div>
                                ) : (
                                    filteredConversations.map(conv => (
                                        <ContactItem
                                            key={conv.userId}
                                            conv={conv}
                                            isActive={selectedUser?.userId === conv.userId}
                                            onClick={() => handleSelectConversation(conv)}
                                        />
                                    ))
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* ── Main Chat Area ── */}
                <div className="responsive-messages-main" style={s.mainArea}>
                    {selectedUser && (
                        <div className="responsive-mobile-chat-header" style={s.mobileChatHeader}>
                            <button
                                type="button"
                                className="responsive-mobile-chat-back"
                                style={s.mobileChatBack}
                                onClick={() => setMobileView('contacts')}
                            >
                                ← Contacts
                            </button>
                            <div style={s.mobileChatInfo}>
                                <div style={s.mobileChatName}>{selectedUser.name}</div>
                                <div style={s.mobileChatMeta}>{selectedUser.role === 'faculty' ? 'Faculty' : selectedUser.role === 'admin' ? 'Admin' : 'Student'}</div>
                            </div>
                        </div>
                    )}

                    {selectedUser ? (
                        <ChatWindow
                            recipientId={selectedUser.userId}
                            recipientName={selectedUser.name}
                            onMessageSent={() => {
                                // Conversation will auto-update via socket
                            }}
                        />
                    ) : (
                        <div style={s.noSelection}>
                            <div style={{ fontSize: 72, marginBottom: 20, filter: 'drop-shadow(0 4px 16px rgba(99,102,241,0.3))' }}>💬</div>
                            <h3 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>
                                Your Messages
                            </h3>
                            <p style={{ color: 'var(--text-muted)', marginTop: 0, fontSize: 14, maxWidth: 280, textAlign: 'center', lineHeight: 1.6 }}>
                                Select a conversation or click ✏️ to start chatting securely with students, faculty, or admins.
                            </p>
                            <button
                                onClick={() => setShowNewChat(true)}
                                style={{
                                    marginTop: 20, padding: '12px 28px', borderRadius: 14, border: 'none',
                                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
                                    fontWeight: 700, fontSize: 15, cursor: 'pointer',
                                    boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                                    transition: 'all 0.2s',
                                }}
                            >
                                ✏️ New Message
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const s: Record<string, React.CSSProperties> = {
    page: {
        padding: '1.5rem', height: 'calc(100vh - 64px)', boxSizing: 'border-box',
        margin: '0 auto', maxWidth: 1400, fontFamily: "'Inter', sans-serif",
    },
    layout: {
        display: 'flex', height: '100%',
        background: 'var(--card-bg)', borderRadius: 20,
        border: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)', overflow: 'hidden',
    },
    mobileSwitcher: {
        display: 'none',
    },
    mobileSwitcherButton: {
        border: '1px solid var(--border-color)',
        background: 'var(--card-bg)',
        color: 'var(--text-muted)',
        borderRadius: 12,
        padding: '10px 14px',
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
    },
    mobileSwitcherButtonActive: {
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        color: '#fff',
        borderColor: 'transparent',
        boxShadow: '0 4px 14px rgba(99,102,241,0.25)',
    },
    mobileChatHeader: {
        display: 'none',
    },
    mobileChatBack: {
        border: '1px solid var(--border-color)',
        background: 'var(--card-bg)',
        color: 'var(--text-main)',
        borderRadius: 12,
        padding: '10px 12px',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        flexShrink: 0,
    },
    mobileChatInfo: {
        minWidth: 0,
        flex: 1,
    },
    mobileChatName: {
        fontSize: 16,
        fontWeight: 800,
        color: 'var(--text-main)',
        lineHeight: 1.2,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    mobileChatMeta: {
        marginTop: 3,
        fontSize: 12,
        color: 'var(--text-muted)',
    },
    sidebar: {
        width: 340, borderRight: '1px solid rgba(0,0,0,0.07)',
        display: 'flex', flexDirection: 'column', background: 'var(--card-bg)',
    },
    sidebarHeader: {
        padding: '20px 16px 14px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        background: 'var(--card-bg)',
    },
    searchWrap: {
        position: 'relative', display: 'flex', alignItems: 'center',
    },
    searchIcon: {
        position: 'absolute', left: 12, fontSize: 14, pointerEvents: 'none',
    },
    searchInput: {
        width: '100%', padding: '10px 14px 10px 36px', borderRadius: 12,
        border: '1.5px solid rgba(0,0,0,0.09)', fontSize: 14, outline: 'none',
        background: 'var(--page-bg)', color: 'var(--text-main)',
        transition: 'border-color 0.15s', boxSizing: 'border-box',
        fontFamily: "'Inter', sans-serif",
    },
    sectionLabel: {
        padding: '10px 16px 6px', fontSize: 11, fontWeight: 700,
        color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
    },
    contactsList: { flex: 1, overflowY: 'auto' },
    empty: { padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 },
    emptyState: {
        padding: 32, textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
    },
    mainArea: {
        flex: 1, display: 'flex', flexDirection: 'column',
        background: 'var(--page-bg)', overflow: 'hidden',
    },
    noSelection: {
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40,
        background: 'var(--page-bg)',
    },
};

export default MessagesPage;
