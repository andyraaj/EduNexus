import React from 'react';

interface EmptyStateProps {
    icon?: string;
    title?: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    icon = '📭',
    title = 'No data yet',
    message = 'There\'s nothing to display here at the moment.',
    actionLabel,
    onAction,
}) => {
    return (
        <div style={s.wrapper}>
            <div style={s.iconWrap}>{icon}</div>
            <h3 style={s.title}>{title}</h3>
            <p style={s.message}>{message}</p>
            {actionLabel && onAction && (
                <button style={s.btn} onClick={onAction}>{actionLabel}</button>
            )}
        </div>
    );
};

const s: Record<string, React.CSSProperties> = {
    wrapper: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '4rem 2rem', textAlign: 'center', background: 'var(--page-bg)',
        borderRadius: 16, border: '1.5px dashed #d1d5db',
    },
    iconWrap: { fontSize: 48, marginBottom: 16, lineHeight: 1 },
    title: { margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text-main)' },
    message: { margin: 0, fontSize: 14, color: 'var(--text-muted)', fontWeight: 500, maxWidth: 360, lineHeight: 1.6 },
    btn: {
        marginTop: 20, padding: '10px 24px', borderRadius: 10,
        background: '#2563eb', color:'var(--card-bg)', border: 'none',
        fontWeight: 700, fontSize: 13, cursor: 'pointer',
        transition: 'all 0.2s',
    },
};

export default EmptyState;
