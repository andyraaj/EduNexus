import React, { useState, useEffect } from 'react';
import type { UserRecord, CreateUserPayload } from '@/services/userService';

interface UserFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateUserPayload | Partial<UserRecord>) => void;
    isSubmitting: boolean;
    /** If provided, the modal is in edit mode; otherwise in create mode. */
    editUser?: UserRecord | null;
}

const DEFAULT_FORM: CreateUserPayload = {
    name: '', email: '', password: '', role: 'student', department: '', designation: '', semester: 1,
};

const UserFormModal: React.FC<UserFormModalProps> = ({
    isOpen, onClose, onSubmit, isSubmitting, editUser,
}) => {
    const isEditMode = !!editUser;
    const [form, setForm] = useState<CreateUserPayload>(DEFAULT_FORM);

    useEffect(() => {
        if (editUser) {
            setForm({ name: editUser.name, email: editUser.email, password: '', role: editUser.role, department: '', designation: '', semester: 1 });
        } else {
            setForm(DEFAULT_FORM);
        }
    }, [editUser, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = isEditMode
            ? { name: form.name, role: form.role, isActive: true }
            : form;
        onSubmit(payload);
    };

    if (!isOpen) return null;

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>
                        {isEditMode ? `✏️ Edit User` : '➕ Create New User'}
                    </h2>
                    <button style={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
                </div>

                {isEditMode && (
                    <div style={styles.editBadge}>Editing: <strong>{editUser?.email}</strong></div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} style={styles.form}>
                    <Field label="Full Name" name="name" type="text" value={form.name} onChange={handleChange} required />

                    {!isEditMode && (
                        <Field label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} required />
                    )}

                    {!isEditMode && (
                        <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} required />
                    )}

                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Role</label>
                        <select name="role" style={styles.select} value={form.role} onChange={handleChange}>
                            <option value="student">Student</option>
                            <option value="faculty">Faculty</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    {!isEditMode && form.role !== 'admin' && (
                        <Field label="Department" name="department" type="text" value={form.department || ''} onChange={handleChange} placeholder="e.g., Computer Science" />
                    )}
                    {!isEditMode && form.role === 'faculty' && (
                        <Field label="Designation" name="designation" type="text" value={form.designation || ''} onChange={handleChange} placeholder="e.g., Associate Professor" />
                    )}
                    {!isEditMode && form.role === 'student' && (
                        <Field label="Semester" name="semester" type="number" value={String(form.semester || 1)} onChange={handleChange} />
                    )}

                    <div style={styles.actions}>
                        <button type="button" style={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>Cancel</button>
                        <button type="submit" style={{ ...styles.submitBtn, opacity: isSubmitting ? 0.7 : 1 }} disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Simple field sub-component
interface FieldProps { label: string; name: string; type: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; required?: boolean; placeholder?: string; }
const Field: React.FC<FieldProps> = ({ label, name, type, value, onChange, required, placeholder }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-main)' }}>{label}{required && ' *'}</label>
        <input name={name} type={type} value={value} onChange={onChange} required={required} placeholder={placeholder}
            style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', color: 'var(--text-main)' }} />
    </div>
);

const styles: Record<string, React.CSSProperties> = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
    modal: { background:'var(--card-bg)', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 25px 60px rgba(0,0,0,0.2)', overflow: 'hidden' },
    modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f3f4f6' },
    modalTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-main)', margin: 0 },
    closeBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)', width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    editBadge: { background: '#eff6ff', padding: '8px 24px', fontSize: 13, color: '#1d4ed8' },
    form: { padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 },
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: 5 },
    label: { fontSize: 13, fontWeight: 500, color: 'var(--text-main)' },
    select: { padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, color: 'var(--text-main)', background:'var(--card-bg)' },
    actions: { display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8 },
    cancelBtn: { padding: '9px 20px', borderRadius: 8, border: '1px solid #d1d5db', background:'var(--card-bg)', cursor: 'pointer', fontSize: 14, color: 'var(--text-main)' },
    submitBtn: { padding: '9px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, var(--primary-light), var(--primary))', color:'var(--card-bg)', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
};

export default UserFormModal;
