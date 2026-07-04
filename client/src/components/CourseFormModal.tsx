import React, { useState, useEffect } from 'react';
import type { Course, CreateCoursePayload, FacultyInfo } from '@/services/courseService';

interface CourseFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateCoursePayload) => void;
    isSubmitting: boolean;
    editCourse?: Course | null;
    faculties: FacultyInfo[];
}

const DEFAULT: CreateCoursePayload = {
    code: '', title: '', description: '', credits: 4,
    department: '', semester: 1, primaryFaculty: '', maxEnrollment: 60,
};

const CourseFormModal: React.FC<CourseFormModalProps> = ({ isOpen, onClose, onSubmit, isSubmitting, editCourse, faculties }) => {
    const isEdit = !!editCourse;
    const [form, setForm] = useState<CreateCoursePayload>(DEFAULT);

    useEffect(() => {
        if (editCourse) {
            setForm({
                code: editCourse.code, title: editCourse.title,
                credits: editCourse.credits,
                department: typeof editCourse.department === 'object' && editCourse.department ? editCourse.department._id : (editCourse.department as string ?? ''),
                semester: editCourse.semester,
                primaryFaculty: editCourse.primaryFaculty?._id ?? '',
                maxEnrollment: editCourse.maxEnrollment,
            });
        } else {
            setForm(DEFAULT);
        }
    }, [editCourse, isOpen]);

    const set = (k: keyof CreateCoursePayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }));

    if (!isOpen) return null;

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={styles.header}>
                    <h2 style={styles.title}>{isEdit ? '✏️ Edit Course' : '➕ New Course'}</h2>
                    <button style={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} style={styles.form}>
                    <div style={styles.row}>
                        <Field label="Course Code *" type="text" value={form.code} onChange={set('code')} placeholder="CS101" required disabled={isEdit} />
                        <Field label="Credits" type="number" value={String(form.credits)} onChange={set('credits')} placeholder="4" />
                    </div>

                    <Field label="Course Title *" type="text" value={form.title} onChange={set('title')} placeholder="Introduction to Programming" required />

                    <div style={styles.row}>
                        <Field label="Department *" type="text" value={form.department} onChange={set('department')} placeholder="Computer Science" required />
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Semester *</label>
                            <select style={styles.select} value={form.semester} onChange={set('semester')}>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={styles.row}>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Primary Faculty</label>
                            <select style={styles.select} value={form.primaryFaculty || ''} onChange={set('primaryFaculty')}>
                                <option value="">-- None --</option>
                                {faculties.map((f: any) => (
                                    <option key={f._id} value={f._id}>{f.name} ({f.email})</option>
                                ))}
                            </select>
                        </div>
                        <Field label="Max Enrollment" type="number" value={String(form.maxEnrollment)} onChange={set('maxEnrollment')} placeholder="60" />
                    </div>

                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>Description</label>
                        <textarea
                            style={styles.textarea}
                            value={form.description}
                            onChange={set('description')}
                            placeholder="Optional course description..."
                            rows={3}
                        />
                    </div>

                    <div style={styles.actions}>
                        <button type="button" style={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>Cancel</button>
                        <button type="submit" style={{ ...styles.submitBtn, opacity: isSubmitting ? 0.7 : 1 }} disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Course'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface FieldProps { label: string; type: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; required?: boolean; disabled?: boolean; }
const Field: React.FC<FieldProps> = ({ label, type, value, onChange, placeholder, required, disabled }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} disabled={disabled}
            style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', color: 'var(--text-main)', background: disabled ? 'var(--page-bg)' :'var(--card-bg)' }} />
    </div>
);

const styles: Record<string, React.CSSProperties> = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 },
    modal: { background:'var(--card-bg)', borderRadius: 16, width: '100%', maxWidth: 580, boxShadow: '0 25px 60px rgba(0,0,0,0.2)', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f3f4f6' },
    title: { fontSize: 18, fontWeight: 700, color: 'var(--text-main)', margin: 0 },
    closeBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' },
    form: { padding: 24, display: 'flex', flexDirection: 'column', gap: 16 },
    row: { display: 'flex', gap: 12 },
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: 5, flex: 1 },
    label: { fontSize: 12, fontWeight: 600, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' },
    select: { padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, color: 'var(--text-main)', background:'var(--card-bg)' },
    textarea: { padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, color: 'var(--text-main)', outline: 'none', resize: 'vertical' },
    actions: { display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 },
    cancelBtn: { padding: '9px 20px', borderRadius: 8, border: '1px solid #d1d5db', background:'var(--card-bg)', cursor: 'pointer', fontSize: 14, color: 'var(--text-main)' },
    submitBtn: { padding: '9px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, var(--primary-light), var(--primary))', color:'var(--card-bg)', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
};

export default CourseFormModal;
