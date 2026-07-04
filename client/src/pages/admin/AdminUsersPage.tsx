import React, { useState, useCallback } from 'react';
import UserTable from '@/components/UserTable';
import UserFormModal from '@/components/UserFormModal';
import { useAuth } from '@/contexts/AuthContext';
import {
    fetchUsers, createUser, updateUser, deleteUser, deactivateUser,
} from '@/services/userService';
import type { UserRecord, CreateUserPayload } from '@/services/userService';

type FilterRole = '' | 'student' | 'faculty' | 'admin';

const AdminUsersPage: React.FC = () => {
    const { accessToken } = useAuth();
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [meta, setMeta] = useState({ page: 1, totalPages: 1, totalRecords: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<FilterRole>('');
    const [page, setPage] = useState(1);

    const [modalOpen, setModalOpen] = useState(false);
    const [editUser, setEditUser] = useState<UserRecord | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const loadUsers = useCallback(async (p = page, s = search, r = roleFilter) => {
        if (!accessToken) return;
        setIsLoading(true);
        try {
            const result = await fetchUsers(accessToken, { search: s, role: r || undefined, page: p, limit: 15 });
            setUsers(result.users);
            setMeta(result.meta);
        } catch (e: any) {
            showToast(e.message || 'Failed to load users.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [accessToken, page, search, roleFilter]);

    // Initial load (in a real app, use useEffect or React Query)
    React.useEffect(() => { loadUsers(); }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        loadUsers(1, search, roleFilter);
    };

    const handleOpenCreate = () => { setEditUser(null); setModalOpen(true); };
    const handleOpenEdit = (user: UserRecord) => { setEditUser(user); setModalOpen(true); };

    const handleFormSubmit = async (data: CreateUserPayload | Partial<UserRecord>) => {
        if (!accessToken) return;
        setIsSubmitting(true);
        try {
            if (editUser) {
                await updateUser(accessToken, editUser._id, data as Partial<UserRecord>);
                showToast('User updated successfully.');
            } else {
                await createUser(accessToken, data as CreateUserPayload);
                showToast('User created successfully.');
            }
            setModalOpen(false);
            loadUsers(1);
        } catch (e: any) {
            showToast(e.message || 'Operation failed.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeactivate = async (user: UserRecord) => {
        if (!accessToken || !window.confirm(`Deactivate ${user.name}?`)) return;
        try {
            await deactivateUser(accessToken, user._id);
            showToast(`${user.name} deactivated.`);
            loadUsers();
        } catch (e: any) { showToast(e.message, 'error'); }
    };

    const handleDelete = async (user: UserRecord) => {
        if (!accessToken || !window.confirm(`Permanently delete ${user.name}? This cannot be undone.`)) return;
        try {
            await deleteUser(accessToken, user._id);
            showToast(`${user.name} deleted.`);
            loadUsers();
        } catch (e: any) { showToast(e.message, 'error'); }
    };

    return (
        <div style={styles.page}>
            {/* Toast */}
            {toast && (
                <div style={{ ...styles.toast, background: toast.type === 'error' ? '#fee2e2' : '#d1fae5', color: toast.type === 'error' ? '#991b1b' : '#065f46', borderColor: toast.type === 'error' ? '#fca5a5' : '#6ee7b7' }}>
                    {toast.type === 'error' ? '⚠️' : '✅'} {toast.msg}
                </div>
            )}

            {/* Page Header */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>User Management</h1>
                    <p style={styles.subtitle}>{meta.totalRecords} total users</p>
                </div>
                <button style={styles.createBtn} onClick={handleOpenCreate}>+ Add User</button>
            </div>

            {/* Filters */}
            <form style={styles.filterBar} onSubmit={handleSearch}>
                <input
                    style={styles.searchInput}
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <select style={styles.roleSelect} value={roleFilter} onChange={e => setRoleFilter(e.target.value as FilterRole)}>
                    <option value="">All Roles</option>
                    <option value="student">Students</option>
                    <option value="faculty">Faculty</option>
                    <option value="admin">Admins</option>
                </select>
                <button type="submit" style={styles.searchBtn}>Search</button>
            </form>

            {/* Table */}
            <div className="table-responsive">
                <UserTable
                    users={users}
                    isLoading={isLoading}
                    onEdit={handleOpenEdit}
                    onDeactivate={handleDeactivate}
                    onDelete={handleDelete}
                />
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
                <div style={styles.pagination}>
                    <button style={styles.pageBtn} disabled={page <= 1} onClick={() => { setPage(p => p - 1); loadUsers(page - 1); }}>← Prev</button>
                    <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Page {meta.page} of {meta.totalPages}</span>
                    <button style={styles.pageBtn} disabled={page >= meta.totalPages} onClick={() => { setPage(p => p + 1); loadUsers(page + 1); }}>Next →</button>
                </div>
            )}

            {/* Modal */}
            <UserFormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
                editUser={editUser}
            />
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: { maxWidth: 1200, margin: '0 auto', fontFamily: "'Inter', sans-serif", position: 'relative' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' },
    title: { fontSize: 26, fontWeight: 700, color: 'var(--text-main)', margin: 0 },
    subtitle: { fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' },
    createBtn: { padding: '10px 20px', background: 'linear-gradient(135deg, var(--primary-light), var(--primary))', color:'var(--card-bg)', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
    filterBar: { display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' },
    searchInput: { flex: 1, minWidth: 200, padding: '9px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none' },
    roleSelect: { padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, background:'var(--card-bg)', color: 'var(--text-main)' },
    searchBtn: { padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--text-main)', color:'var(--card-bg)', cursor: 'pointer', fontSize: 14, fontWeight: 500 },
    pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: '1.5rem' },
    pageBtn: { padding: '7px 16px', borderRadius: 8, border: '1px solid #d1d5db', background:'var(--card-bg)', cursor: 'pointer', fontSize: 13, fontWeight: 500 },
    toast: { position: 'fixed', top: 20, right: 20, padding: '12px 20px', borderRadius: 10, border: '1px solid', fontSize: 14, fontWeight: 500, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
};

export default AdminUsersPage;
