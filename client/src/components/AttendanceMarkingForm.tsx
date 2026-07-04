import React, { useState, useEffect } from 'react';
import type { AttendanceStatus, MarkAttendanceRecord } from '@/services/attendanceService';

interface RosterStudent {
    _id: string;
    name?: string;
    email?: string;
    rollNumber?: string;
    // Legacy nested shape (some API responses still have this)
    user?: { name?: string; email?: string };
}

interface AttendanceMarkingFormProps {
    courseId: string;
    date: string;
    roster: RosterStudent[];
    isSubmitting: boolean;
    initialStatuses?: Record<string, AttendanceStatus>;
    onSubmit: (records: MarkAttendanceRecord[]) => void;
    onCancel: () => void;
}

/** Safely extract display name regardless of data shape */
const getStudentName = (st: RosterStudent): string =>
    st?.user?.name || st?.name || st?.email || st?.user?.email || 'Unknown Student';

const getStudentRoll = (st: RosterStudent): string =>
    st?.rollNumber || st?._id?.slice(-6)?.toUpperCase() || '—';

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string; bg: string }[] = [
    { value: 'present', label: 'Present', color: '#10b981', bg: '#064e3b' },
    { value: 'late',    label: 'Late',    color: '#f59e0b', bg: '#78350f' },
    { value: 'excused', label: 'Excused', color: '#6366f1', bg: '#1e1b4b' },
    { value: 'absent',  label: 'Absent',  color: '#ef4444', bg: '#7f1d1d' },
];

const AttendanceMarkingForm: React.FC<AttendanceMarkingFormProps> = ({
    courseId, date, roster, isSubmitting, initialStatuses, onSubmit, onCancel
}) => {
    const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (initialStatuses && Object.keys(initialStatuses).length > 0) {
            setStatuses(initialStatuses);
        } else {
            const init: Record<string, AttendanceStatus> = {};
            roster.forEach(st => { if (st?._id) init[st._id] = 'present'; });
            setStatuses(init);
        }
    }, [roster, initialStatuses]);

    const handleSetAll = (status: AttendanceStatus) => {
        const updated: Record<string, AttendanceStatus> = {};
        roster.forEach(st => { if (st?._id) updated[st._id] = status; });
        setStatuses(updated);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const records: MarkAttendanceRecord[] = roster
            .filter(st => st?._id)
            .map(st => ({ studentId: st._id, status: statuses[st._id] || 'present', remarks: '' }));
        onSubmit(records);
    };

    const filtered = roster.filter(st => {
        if (!search) return true;
        const q = search.toLowerCase();
        return getStudentName(st).toLowerCase().includes(q) || getStudentRoll(st).toLowerCase().includes(q);
    });

    const counts = (Object.values(statuses) as AttendanceStatus[]).reduce(
        (acc, status) => {
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        },
        {} as Record<AttendanceStatus, number>
    );

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Stats bar */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {STATUS_OPTIONS.map(opt => (
                    <div key={opt.value} style={{ padding: '6px 14px', borderRadius: 20, background: opt.bg, border: `1px solid ${opt.color}33`, fontSize: 13, fontWeight: 700, color: opt.color }}>
                        {counts[opt.value] || 0} {opt.label}
                    </div>
                ))}
                <div style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>
                    {roster.length} Total
                </div>
            </div>

            {/* Controls row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {STATUS_OPTIONS.map(opt => (
                        <button key={opt.value} type="button"
                            onClick={() => handleSetAll(opt.value)}
                            style={{ padding: '6px 12px', border: `1px solid ${opt.color}55`, borderRadius: 8, background: opt.bg, color: opt.color, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            All {opt.label}
                        </button>
                    ))}
                </div>
                <input
                    placeholder="🔍 Search student..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', fontSize: 13, outline: 'none', width: 200 }}
                />
            </div>

            {/* Info row */}
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Date: <strong>{new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
            </div>

            {/* Roster */}
            <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', maxHeight: 460, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                        <tr>
                            <th style={th}>#</th>
                            <th style={th}>Roll No</th>
                            <th style={th}>Student Name</th>
                            {STATUS_OPTIONS.map(o => (
                                <th key={o.value} style={{ ...th, textAlign: 'center', color: o.color }}>{o.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No students found</td></tr>
                        )}
                        {filtered.map((st, idx) => {
                            const name = getStudentName(st);
                            const roll = getStudentRoll(st);
                            const cur = statuses[st._id];
                            const statusDef = STATUS_OPTIONS.find(o => o.value === cur);
                            return (
                                <tr key={st._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                                    <td style={td}>{idx + 1}</td>
                                    <td style={{ ...td, fontWeight: 700, color: '#818cf8', fontFamily: 'monospace' }}>{roll}</td>
                                    <td style={td}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${statusDef?.color || '#6366f1'}22`, border: `1px solid ${statusDef?.color || '#6366f1'}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: statusDef?.color || '#6366f1', flexShrink: 0 }}>
                                                {name.charAt(0).toUpperCase()}
                                            </div>
                                            <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{name}</span>
                                        </div>
                                    </td>
                                    {STATUS_OPTIONS.map(opt => (
                                        <td key={opt.value} style={{ ...td, textAlign: 'center' }}>
                                            <input
                                                type="radio"
                                                name={`status-${st._id}`}
                                                checked={cur === opt.value}
                                                onChange={() => setStatuses(p => ({ ...p, [st._id]: opt.value }))}
                                                style={{ accentColor: opt.color, transform: 'scale(1.4)', cursor: 'pointer' }}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={onCancel} disabled={isSubmitting}
                    style={{ padding: '10px 22px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                    Cancel
                </button>
                <button type="submit" disabled={isSubmitting}
                    style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14, opacity: isSubmitting ? 0.7 : 1 }}>
                    {isSubmitting ? '⌛ Saving...' : '✅ Save Attendance'}
                </button>
            </div>
        </form>
    );
};

const th: React.CSSProperties = {
    padding: '12px 14px', background: 'rgba(255,255,255,0.04)', color: '#94a3b8',
    fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)',
    position: 'sticky', top: 0, zIndex: 10, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em',
};
const td: React.CSSProperties = { padding: '10px 14px', color: 'var(--text-main)', verticalAlign: 'middle' };

export default AttendanceMarkingForm;
