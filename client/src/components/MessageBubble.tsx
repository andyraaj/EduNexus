import React from 'react';
import type { Message } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';

interface MessageBubbleProps {
    message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
    const { user } = useAuth();
    
    // Check if current logged-in user is the sender
    const isMe = user?.id === (typeof message.sender === 'string' ? message.sender : message.sender._id);

    const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="responsive-message-row" style={{ ...styles.container, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
            {!isMe && (
                <div style={styles.avatar}>
                    {message.sender.name?.charAt(0) || 'U'}
                </div>
            )}
            
            <div className="responsive-message-bubble" style={isMe ? styles.bubbleMe : styles.bubbleThem}>
                {!isMe && <div style={styles.senderName}>{message.sender.name}</div>}
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.content}</div>
                <div style={isMe ? styles.timeMe : styles.timeThem}>
                    {time} {isMe && (message.readAt ? '✓✓' : '✓')}
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: { display: 'flex', width: '100%', marginBottom: 16, alignItems: 'flex-end' },
    avatar: { width: 32, height: 32, borderRadius: '50%', background: '#e0e7ff', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, marginRight: 8, flexShrink: 0 },
    bubbleMe: { background: 'var(--primary)', color:'var(--card-bg)', padding: '10px 14px', borderRadius: '16px 16px 4px 16px', maxWidth: '70%', fontSize: 14, lineHeight: 1.4, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' },
    bubbleThem: { background:'var(--card-bg)', color: 'var(--text-main)', padding: '10px 14px', borderRadius: '16px 16px 16px 4px', maxWidth: '70%', fontSize: 14, lineHeight: 1.4, border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    senderName: { fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 },
    timeMe: { fontSize: 10, color: '#c7d2fe', textAlign: 'right', marginTop: 4, letterSpacing: '0.5px' },
    timeThem: { fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }
};

export default MessageBubble;
