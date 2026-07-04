import React, { useState } from 'react';
import type { UserRecord } from '@/services/userService';

interface UserTableProps {
    users: UserRecord[];
    isLoading: boolean;
    onEdit: (user: UserRecord) => void;
    onDeactivate: (user: UserRecord) => void;
    onDelete: (user: UserRecord) => void;
}

const ROLE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
    student: { bg: '#dbeafe', color: '#1d4ed8', label: 'Student' },
    faculty: { bg: '#d1fae5', color: '#065f46', label: 'Faculty' },
    admin:   { bg: '#fef3c7', color: '#92400e', label: 'Admin' },
};

const UserTable: React.FC<UserTableProps> = ({ users, isLoading, onEdit, onDeactivate, onDelete }) => {
    if (isLoading) {
        return (
            <div style={styles.loadingBox}>
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} style={styles.skeleton} />
                ))}
            </div>
        );
    }

    if (!users.length) {
        return <div style={styles.empty}>No users found matching your search.</div>;
    }

    return (
        <div style={styles.tableWrapper}>
            <table style={styles.table}>
                <thead>
                    <tr>
                        {['Name', 'Email', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                            <th key={h} style={styles.th}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => {
                        const badge = ROLE_BADGE[user.role] ?? ROLE_BADGE.student;
                        const lastLogin = user.lastLogin
                            ? new Date(user.lastLogin).toLocaleDateString()
                            : 'Never';
                        return (
                            <tr key={user._id} style={styles.tr}>
                                <td style={styles.td}>
                                    <div style={styles.nameCell}>
                                        <div style={styles.avatar}>
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span style={{ fontWeight: 500 }}>{user.name}</span>
                                    </div>
                                </td>
                                <td style={{ ...styles.td, color: 'var(--text-muted)' }}>{user.email}</td>
                                <td style={styles.td}>
                                    <span style={{ ...styles.badge, background: badge.bg, color: badge.color }}>
                                        {badge.label}
                                    </span>
                                </td>
                                <td style={styles.td}>
                                    <span style={{
                                        ...styles.badge,
                                        background: user.isActive ? '#d1fae5' : '#fee2e2',
                                        color: user.isActive ? '#065f46' : '#991b1b',
                                    }}>
                                        {user.isActive ? '● Active' : '● Inactive'}
                                    </span>
                                </td>
                                <td style={{ ...styles.td, color: 'var(--text-muted)', fontSize: 13 }}>{lastLogin}</td>
                                <td style={styles.td}>
                                    <div style={styles.actionGroup}>
                                        <button style={styles.btnEdit} onClick={() => onEdit(user)}>Edit</button>
                                        {user.isActive && (
                                            <button style={styles.btnDeactivate} onClick={() => onDeactivate(user)}>Deactivate</button>
                                        )}
                                        <button style={styles.btnDelete} onClick={() => onDelete(user)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    tableWrapper: { overflowX: 'auto', borderRadius: 12, border: '1px solid #e5e7eb' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
    th: { padding: '12px 16px', textAlign: 'left', background: 'var(--page-bg)', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' },
    tr: { borderBottom: '1px solid #f3f4f6', transition: 'background 0.15s' },
    td: { padding: '14px 16px', verticalAlign: 'middle' },
    nameCell: { display: 'flex', alignItems: 'center', gap: 10 },
    avatar: { width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-light), var(--primary))', color:'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 },
    badge: { padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 },
    actionGroup: { display: 'flex', gap: 6 },
    btnEdit: { padding: '5px 12px', borderRadius: 6, border: '1px solid #d1d5db', background:'var(--card-bg)', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'var(--text-main)' },
    btnDeactivate: { padding: '5px 12px', borderRadius: 6, border: '1px solid #fbbf24', background: '#fffbeb', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#92400e' },
    btnDelete: { padding: '5px 12px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff1f2', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#991b1b' },
    loadingBox: { display: 'flex', flexDirection: 'column', gap: 10, padding: 16 },
    skeleton: { height: 48, borderRadius: 8, background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.2s infinite' },
    empty: { padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 15 },
};

export default UserTable;
