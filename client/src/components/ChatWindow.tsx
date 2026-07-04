import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket, Message } from '@/contexts/SocketContext';
import { getConversation, sendMessage, markConversationRead } from '@/services/messageService';
import MessageBubble from './MessageBubble';

interface ChatWindowProps {
    recipientId: string;
    recipientName: string;
    onMessageSent?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ recipientId, recipientName, onMessageSent }) => {
    const { accessToken, user } = useAuth();
    const { socket, typingByUser, setUnreadMessagesByUser } = useSocket();

    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const typingTimer = useRef<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load conversation history
    useEffect(() => {
        if (!accessToken || !recipientId) return;
        setIsLoading(true);
        setMessages([]);
        getConversation(accessToken, recipientId)
            .then(res => setMessages(res.messages))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [accessToken, recipientId]);

    // Focus input when conversation opens
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, [recipientId]);

    // Mark conversation as read when opened
    useEffect(() => {
        if (!accessToken || !recipientId) return;
        markConversationRead(accessToken, recipientId)
            .then(() => {
                setUnreadMessagesByUser(prev => ({ ...prev, [recipientId]: 0 }));
            })
            .catch(() => {});
    }, [accessToken, recipientId, setUnreadMessagesByUser]);

    // Live socket listener for incoming messages
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (msg: Message) => {
            const rId = typeof msg.recipient === 'string' ? msg.recipient : msg.recipient._id;
            const sId = typeof msg.sender === 'string' ? msg.sender : msg.sender._id;
            if (
                (sId === recipientId && rId === user?.id) ||
                (sId === user?.id && rId === recipientId)
            ) {
                setMessages(prev => {
                    // Avoid duplicates (optimistic + server echo)
                    if (prev.some(m => m._id === msg._id)) return prev;
                    return [...prev, msg];
                });
            }
        };

        socket.on('receiveMessage', handleNewMessage);
        return () => { socket.off('receiveMessage', handleNewMessage); };
    }, [socket, recipientId, user]);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !accessToken || isSending) return;

        setIsSending(true);
        const content = newMessage.trim();
        setNewMessage('');
        socket?.emit('stopTyping', { toUserId: recipientId, fromUserId: user?.id });

        try {
            const res = await sendMessage(accessToken, recipientId, content);
            setMessages(prev => {
                if (prev.some(m => m._id === res.message._id)) return prev;
                return [...prev, res.message];
            });
            onMessageSent?.();
        } catch (err: any) {
            alert(err.message || 'Failed to send message.');
            setNewMessage(content); // restore on failure
        } finally {
            setIsSending(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(e as any);
        }
    };

    const handleTypingChange = (val: string) => {
        setNewMessage(val);
        if (!socket || !user?.id) return;
        socket.emit('typing', { toUserId: recipientId, fromUserId: user.id });
        if (typingTimer.current) window.clearTimeout(typingTimer.current);
        typingTimer.current = window.setTimeout(() => {
            socket.emit('stopTyping', { toUserId: recipientId, fromUserId: user.id });
        }, 700);
    };

    const isTyping = !!typingByUser?.[recipientId];

    // Group messages by date
    const groupedMessages: { dateLabel: string; msgs: Message[] }[] = [];
    let lastDate = '';
    messages.forEach(msg => {
        const d = new Date(msg.createdAt);
        const label = d.toDateString() === new Date().toDateString()
            ? 'Today'
            : d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
        if (label !== lastDate) {
            groupedMessages.push({ dateLabel: label, msgs: [msg] });
            lastDate = label;
        } else {
            groupedMessages[groupedMessages.length - 1].msgs.push(msg);
        }
    });

    return (
        <div className="responsive-chat-window" style={styles.container}>
            {/* Header */}
            <div className="responsive-chat-header" style={styles.header}>
                <div style={styles.avatar}>{recipientName.charAt(0).toUpperCase()}</div>
                <div>
                    <h3 style={styles.name}>{recipientName}</h3>
                    <p style={styles.status}>
                        {isTyping
                            ? <span style={{ color: '#6366f1' }}>typing<span style={{ animation: 'pulse 1s infinite' }}>...</span></span>
                            : <span style={{ color: '#22c55e' }}>● Online</span>
                        }
                    </p>
                </div>
                <div className="responsive-chat-meta" style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 13 }}>
                    {messages.length} message{messages.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Chat Area */}
            <div className="responsive-chat-area" style={styles.chatArea}>
                {isLoading ? (
                    <div style={styles.infoText}>Loading messages...</div>
                ) : messages.length === 0 ? (
                    <div style={styles.emptyChat}>
                        <div style={{ fontSize: 56, marginBottom: 12 }}>👋</div>
                        <p style={{ fontWeight: 600, color: 'var(--text-main)', margin: '0 0 6px' }}>
                            Say hello to {recipientName}!
                        </p>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                            This is the start of your conversation.
                        </p>
                    </div>
                ) : (
                    groupedMessages.map(group => (
                        <div key={group.dateLabel}>
                            <div style={styles.dateDivider}>
                                <span style={styles.dateDividerText}>{group.dateLabel}</span>
                            </div>
                            {group.msgs.map(msg => <MessageBubble key={msg._id} message={msg} />)}
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="responsive-chat-composer" style={styles.inputArea}>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={`Message ${recipientName}...`}
                    style={styles.input}
                    value={newMessage}
                    onChange={e => handleTypingChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSending}
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    style={{
                        ...styles.sendBtn,
                        opacity: !newMessage.trim() || isSending ? 0.5 : 1,
                        cursor: !newMessage.trim() || isSending ? 'not-allowed' : 'pointer',
                        transform: newMessage.trim() && !isSending ? 'scale(1)' : 'scale(0.95)',
                    }}
                >
                    {isSending ? '⏳' : '➤'}
                </button>
            </form>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex', flexDirection: 'column', height: '100%',
        background: 'var(--card-bg)', overflow: 'hidden',
    },
    header: {
        padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.07)',
        background: 'var(--card-bg)', display: 'flex', alignItems: 'center', gap: 14,
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    },
    avatar: {
        width: 44, height: 44, borderRadius: '50%',
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 700, flexShrink: 0,
        boxShadow: '0 2px 10px rgba(99,102,241,0.35)',
    },
    name: { margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' },
    status: { margin: 0, fontSize: 12, fontWeight: 600 },
    chatArea: {
        flex: 1, padding: '20px 20px 8px', overflowY: 'auto',
        background: 'var(--page-bg)',
        backgroundImage: 'radial-gradient(rgba(99,102,241,0.03) 1px,transparent 1px)',
        backgroundSize: '24px 24px',
    },
    infoText: {
        textAlign: 'center', color: 'var(--text-muted)', fontSize: 14,
        fontStyle: 'italic', marginTop: '3rem',
    },
    emptyChat: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', textAlign: 'center', paddingTop: '4rem',
    },
    dateDivider: {
        display: 'flex', alignItems: 'center', margin: '16px 0 12px',
        gap: 12,
    },
    dateDividerText: {
        margin: '0 auto', padding: '4px 14px',
        background: 'rgba(99,102,241,0.1)', borderRadius: 99,
        fontSize: 11, fontWeight: 700, color: '#6366f1',
        letterSpacing: '0.04em', whiteSpace: 'nowrap',
    },
    inputArea: {
        padding: '14px 16px', background: 'var(--card-bg)',
        borderTop: '1px solid rgba(0,0,0,0.07)',
        display: 'flex', gap: 10, alignItems: 'center',
    },
    input: {
        flex: 1, padding: '12px 18px', borderRadius: 24,
        border: '1.5px solid rgba(0,0,0,0.09)', fontSize: 15, outline: 'none',
        background: 'var(--page-bg)', color: 'var(--text-main)',
        fontFamily: "'Inter', sans-serif",
        transition: 'border-color 0.15s',
    },
    sendBtn: {
        width: 48, height: 48, borderRadius: '50%', border: 'none',
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
        fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s',
        boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
    },
};

export default ChatWindow;
