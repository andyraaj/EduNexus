import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, MapPin, Plus, Trash2, FileText, Download, Eye, Maximize2, ZoomIn, ZoomOut, X, ExternalLink, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCourses, type Course } from '@/services/courseService';
import api, { client, API_BASE_URL } from '@/services/api';
import {
    createExamEvent,
    deleteExamEvent,
    fetchExamEvents,
    type ExamEvent,
    type ExamEventAudience,
    type ExamEventStatus,
    type ExamEventType,
} from '@/services/examService';

const eventTypes: ExamEventType[] = ['internal', 'midterm', 'final', 'practical', 'viva', 'assignment', 'event'];
const audiences: ExamEventAudience[] = ['all', 'student', 'faculty'];
const statuses: ExamEventStatus[] = ['published', 'draft', 'cancelled'];

const emptyForm = {
    title: '',
    course: '',
    type: 'internal' as ExamEventType,
    startsAt: '',
    endsAt: '',
    venue: '',
    instructions: '',
    targetAudience: 'all' as ExamEventAudience,
    status: 'published' as ExamEventStatus,
};

export interface InstitutionalCalendar {
    _id: string;
    title: string;
    academicYear: string;
    calendarType: 'academic' | 'holiday' | 'exam';
    fileUrl: string;
    fileName: string;
    uploadedBy: { name: string; email: string };
    createdAt: string;
}

// ── URL Utilities ─────────────────────────────────────────────────
// Preview and Download are handled securely via the server-side proxy endpoints
// which stream files directly from Cloudinary under the authorized session.


const AcademicCalendarPage: React.FC = () => {
    const { accessToken, user } = useAuth();
    const [activeTab, setActiveTab] = useState<'events' | 'pdfs'>('events');
    
    // Original Events State
    const [events, setEvents] = useState<ExamEvent[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState('all');
    const [form, setForm] = useState(emptyForm);
    const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Institutional PDFs State
    const [pdfCalendars, setPdfCalendars] = useState<InstitutionalCalendar[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadYear, setUploadYear] = useState('2025-2026');
    const [uploadType, setUploadType] = useState<'academic' | 'holiday' | 'exam'>('academic');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // PDF Preview Modal State
    const [previewCal, setPreviewCal] = useState<InstitutionalCalendar | null>(null);
    const [zoom, setZoom] = useState(100);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [iframeLoading, setIframeLoading] = useState(false);
    const [iframeKey, setIframeKey] = useState(0);

    const isAdmin = user?.role === 'admin';

    const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
        setNotice({ text, type });
        window.setTimeout(() => setNotice(null), 3000);
    };

    const loadEvents = async () => {
        if (!accessToken) return;
        setIsLoading(true);
        try {
            const res = await fetchExamEvents(accessToken, { status });
            setEvents(res.events || []);
        } catch (err: any) {
            showNotice(err?.message || 'Unable to load academic calendar.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const loadPdfCalendars = async () => {
        if (!accessToken) return;
        try {
            const res = await api.get('/academic-calendars', accessToken);
            setPdfCalendars(res.calendars || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadEvents();
        loadPdfCalendars();
    }, [accessToken, status]);

    useEffect(() => {
        if (!accessToken || !isAdmin) return;
        fetchCourses(accessToken, { limit: 200, isActive: true })
            .then((res) => setCourses(res.courses || []))
            .catch(() => setCourses([]));
    }, [accessToken, isAdmin]);

    const grouped = useMemo(() => {
        const today = new Date();
        const upcoming = events.filter((event) => new Date(event.endsAt) >= today);
        const past = events.filter((event) => new Date(event.endsAt) < today);
        return { upcoming, past };
    }, [events]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) return;

        setIsSubmitting(true);
        try {
            await createExamEvent(accessToken, {
                ...form,
                course: form.course || undefined,
            });
            setForm(emptyForm);
            showNotice('Academic event published.');
            await loadEvents();
        } catch (err: any) {
            showNotice(err?.message || 'Could not save event.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const remove = async (event: ExamEvent) => {
        if (!accessToken || !window.confirm(`Delete "${event.title}"?`)) return;
        try {
            await deleteExamEvent(accessToken, event._id);
            showNotice('Academic event deleted.');
            await loadEvents();
        } catch (err: any) {
            showNotice(err?.message || 'Could not delete event.', 'error');
        }
    };

    const handleUploadPDF = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadTitle.trim() || !selectedFile) {
            return showNotice('Title and PDF file are required.', 'error');
        }

        const formData = new FormData();
        formData.append('title', uploadTitle);
        formData.append('academicYear', uploadYear);
        formData.append('calendarType', uploadType);
        formData.append('file', selectedFile);

        setIsUploading(true);
        try {
            // Use the configured client so the CSRF + auth interceptors run
            // Note: client already has baseURL set to API_BASE_URL, so use relative path only
            await client.post('/academic-calendars', formData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    // Do NOT manually set Content-Type for FormData;
                    // axios sets it automatically with the correct boundary
                },
            });
            showNotice('Yearly institutional calendar uploaded successfully!');
            setUploadTitle('');
            setSelectedFile(null);
            await loadPdfCalendars();
        } catch (err: any) {
            showNotice(err?.response?.data?.error?.message || 'Failed to upload calendar PDF.', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeletePDF = async (id: string) => {
        if (!accessToken || !window.confirm('Are you sure you want to delete this yearly calendar schedule?')) return;
        try {
            await api.delete(`/academic-calendars/${id}`, accessToken);
            showNotice('Calendar schedule deleted.');
            await loadPdfCalendars();
        } catch (err) {
            showNotice('Failed to delete schedule.', 'error');
        }
    };

    const getPDFServerUrl = (calendarId: string) => {
        const token = encodeURIComponent(accessToken || '');
        const apiRoot = String(API_BASE_URL || '').replace(/\/$/, '');
        const route = `${apiRoot}/academic-calendars/${calendarId}/file`;
        const separator = route.includes('?') ? '&' : '?';
        return `${route}${separator}token=${token}`;
    };

    const getPDFDownloadUrl = (calendarId: string) => {
        const token = encodeURIComponent(accessToken || '');
        const apiRoot = String(API_BASE_URL || '').replace(/\/$/, '');
        const route = `${apiRoot}/academic-calendars/${calendarId}/download`;
        const separator = route.includes('?') ? '&' : '?';
        return `${route}${separator}token=${token}`;
    };

    return (
        <div className="responsive-page responsive-academic-calendar" style={styles.page}>
            {notice && (
                <div style={{ ...styles.notice, ...(notice.type === 'error' ? styles.noticeError : styles.noticeSuccess) }}>
                    {notice.text}
                </div>
            )}

            <div className="responsive-header" style={styles.header}>
                <div>
                    <h1 style={styles.title}>Academic Calendar Ecosystem</h1>
                    <p style={styles.subtitle}>Exam timetables, holiday schedules, and institution-wide year calendars in one unified place.</p>
                </div>
                <div className="responsive-tab-strip" style={styles.tabStrip}>
                    <button 
                        style={{ ...styles.tabBtn, ...(activeTab === 'events' ? styles.activeTab : {}) }}
                        onClick={() => setActiveTab('events')}
                    >
                        Events & Exams
                    </button>
                    <button 
                        style={{ ...styles.tabBtn, ...(activeTab === 'pdfs' ? styles.activeTab : {}) }}
                        onClick={() => setActiveTab('pdfs')}
                    >
                        Institutional Schedules (PDFs)
                    </button>
                </div>
            </div>

            {activeTab === 'events' ? (
                <div>
                    {isAdmin && (
                        <form style={styles.form} onSubmit={submit}>
                            <div style={styles.formHeader}>
                                <Plus size={18} />
                                <h2 style={styles.formTitle}>Publish Exam or Academic Event</h2>
                            </div>
                            <div style={styles.formGrid}>
                                <input style={styles.input} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                                <select style={styles.input} value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })}>
                                    <option value="">Institution wide</option>
                                    {courses.map((course) => (
                                        <option key={course._id} value={course._id}>{course.code} - {course.title}</option>
                                    ))}
                                </select>
                                <select style={styles.input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ExamEventType })}>
                                    {eventTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}
                                </select>
                                <select style={styles.input} value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value as ExamEventAudience })}>
                                    {audiences.map((audience) => <option key={audience} value={audience}>{label(audience)}</option>)}
                                </select>
                                <input style={styles.input} type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} required />
                                <input style={styles.input} type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} required />
                                <input style={styles.input} placeholder="Venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
                                <select style={styles.input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ExamEventStatus })}>
                                    {statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}
                                </select>
                                <textarea style={{ ...styles.input, ...styles.textarea }} placeholder="Instructions" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
                            </div>
                            <button style={styles.primaryBtn} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Publish Event'}</button>
                        </form>
                    )}

                    <div className="responsive-toolbar responsive-calendar-toolbar" style={styles.toolbar}>
                        <label style={styles.filterLabel}>Status</label>
                        <select style={styles.filter} value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="all">All</option>
                            {statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}
                        </select>
                    </div>

                    {isLoading ? (
                        <div style={styles.empty}>Loading calendar...</div>
                    ) : events.length === 0 ? (
                        <div style={styles.empty}>No academic events have been published yet.</div>
                    ) : (
                        <div className="responsive-calendar-list" style={styles.list}>
                            {[...grouped.upcoming, ...grouped.past].map((event) => (
                                <article key={event._id} className="responsive-calendar-event-card" style={{ ...styles.card, opacity: new Date(event.endsAt) < new Date() ? 0.72 : 1 }}>
                                    <div style={styles.dateBadge}>
                                        <span>{new Date(event.startsAt).toLocaleString(undefined, { month: 'short' })}</span>
                                        <strong>{new Date(event.startsAt).getDate()}</strong>
                                    </div>
                                    <div style={styles.cardBody}>
                                        <div className="responsive-card-top" style={styles.cardTop}>
                                            <span style={styles.typePill}>{label(event.type)}</span>
                                            <span style={{ ...styles.statusPill, ...statusStyle(event.status) }}>{label(event.status)}</span>
                                        </div>
                                        <h2 style={styles.eventTitle}>{event.title}</h2>
                                        <p style={styles.courseLine}>{event.course ? `${event.course.code} - ${event.course.title}` : 'Institution wide'}</p>
                                        <div className="responsive-meta-row" style={styles.meta}>
                                            <span><Clock size={15} /> {formatRange(event.startsAt, event.endsAt)}</span>
                                            <span><MapPin size={15} /> {event.venue || 'Venue pending'}</span>
                                        </div>
                                        {event.instructions && <p style={styles.instructions}>{event.instructions}</p>}
                                    </div>
                                    {isAdmin && (
                                        <button style={styles.iconBtn} onClick={() => remove(event)} aria-label="Delete event">
                                            <Trash2 size={17} />
                                        </button>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    {/* PDFs schedules Tab */}
                    {isAdmin && (
                        <form style={styles.form} onSubmit={handleUploadPDF}>
                            <div style={styles.formHeader}>
                                <FileText size={18} />
                                <h2 style={styles.formTitle}>Upload Institutional Calendar / Timetable PDF</h2>
                            </div>
                            <div style={styles.uploadGrid}>
                                <div style={styles.uploadInputGroup}>
                                    <label style={styles.uploadLabel}>Calendar Title</label>
                                    <input 
                                        style={styles.input} 
                                        placeholder="e.g. Autumn Semester Academic Calendar" 
                                        value={uploadTitle}
                                        onChange={(e) => setUploadTitle(e.target.value)}
                                        required 
                                    />
                                </div>
                                <div style={styles.uploadInputGroup}>
                                    <label style={styles.uploadLabel}>Academic Year</label>
                                    <select style={styles.input} value={uploadYear} onChange={e => setUploadYear(e.target.value)}>
                                        <option value="2025-2026">2025-2026</option>
                                        <option value="2026-2027">2026-2027</option>
                                    </select>
                                </div>
                                <div style={styles.uploadInputGroup}>
                                    <label style={styles.uploadLabel}>Schedule Type</label>
                                    <select style={styles.input} value={uploadType} onChange={e => setUploadType(e.target.value as any)}>
                                        <option value="academic">Academic Calendar</option>
                                        <option value="holiday">Holiday List</option>
                                        <option value="exam">Exam Timetable</option>
                                    </select>
                                </div>
                                <div style={styles.uploadInputGroup}>
                                    <label style={styles.uploadLabel}>Select PDF File</label>
                                    <input 
                                        type="file" 
                                        accept="application/pdf" 
                                        style={styles.fileInput} 
                                        onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                                        required
                                    />
                                </div>
                            </div>
                            <button style={styles.primaryBtn} disabled={isUploading}>
                                {isUploading ? 'Uploading file...' : 'Upload Schedule PDF'}
                            </button>
                        </form>
                    )}

                    {pdfCalendars.length === 0 ? (
                        <div style={styles.empty}>
                            <FileText size={48} style={{ color: '#9ca3af', marginBottom: 12 }} />
                            <h3>No Yearly PDFs Uploaded</h3>
                            <p>Once administrative year planners, holiday calendars, or timetable PDFs are uploaded, they will appear here.</p>
                        </div>
                    ) : (
                        <div style={styles.pdfList}>
                            {pdfCalendars.map(cal => (
                                <div key={cal._id} className="responsive-calendar-card" style={styles.pdfCard}>
                                    <div style={styles.pdfIconWrap}>
                                        <FileText size={26} color="#6366f1" />
                                    </div>
                                    <div style={styles.pdfDetails}>
                                        <div style={styles.pdfTopRow}>
                                            <span style={styles.pdfYearTag}>{cal.academicYear}</span>
                                            <span style={{
                                                ...styles.pdfTypeTag,
                                                background: cal.calendarType === 'holiday' ? '#fef3c7' : cal.calendarType === 'exam' ? '#fee2e2' : '#eff6ff',
                                                color: cal.calendarType === 'holiday' ? '#b45309' : cal.calendarType === 'exam' ? '#b91c1c' : '#1d4ed8'
                                            }}>{cal.calendarType.toUpperCase()} PLANNER</span>
                                        </div>
                                        <h3 style={styles.pdfTitle}>{cal.title}</h3>
                                        <p style={styles.pdfSubtext}>File: {cal.fileName} • Uploaded by Admin</p>
                                    </div>
                                    <div className="responsive-action-row responsive-calendar-actions" style={styles.pdfActions}>
                                        <button 
                                            style={styles.previewBtn} 
                                            onClick={() => {
                                                setPreviewCal(cal);
                                                setZoom(100);
                                                setIsFullscreen(false);
                                                setIframeLoading(true);
                                                setIframeKey(k => k + 1);
                                            }}
                                            title="Interactive Preview"
                                        >
                                            <Eye size={15} /> Preview
                                        </button>
                                        <a
                                            href={getPDFDownloadUrl(cal._id)}
                                            download={cal.fileName}
                                            style={styles.downloadLink}
                                            title="Direct Download"
                                        >
                                            <Download size={15} /> Download
                                        </a>
                                        {isAdmin && (
                                            <button 
                                                style={styles.pdfDeleteBtn} 
                                                onClick={() => handleDeletePDF(cal._id)}
                                                title="Delete Schedule"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Premium Glassmorphic PDF Preview Modal */}
            {previewCal && (
            <div style={{
                    ...styles.previewOverlay,
                    ...(isFullscreen ? styles.fullscreenOverlay : {})
                }}
                onClick={(e) => { if (e.target === e.currentTarget) setPreviewCal(null); }}
            >
                <div className="responsive-preview-modal-shell" style={{
                    ...styles.previewModal,
                    ...(isFullscreen ? styles.fullscreenModal : {})
                }}>
                    <div className="responsive-preview-header" style={styles.previewHeader}>
                        <div>
                            <h3 style={styles.previewTitle}>{previewCal.title}</h3>
                            <p style={styles.previewSub}>Year: {previewCal.academicYear} &bull; Scale: {zoom}%</p>
                        </div>
                        <div style={styles.previewControls}>
                            <button style={styles.controlBtn} onClick={() => setZoom(prev => Math.max(50, prev - 10))} title="Zoom Out"><ZoomOut size={16} /></button>
                            <button style={styles.controlBtn} onClick={() => setZoom(prev => Math.min(200, prev + 10))} title="Zoom In"><ZoomIn size={16} /></button>
                            <button style={styles.controlBtn} onClick={() => setIsFullscreen(prev => !prev)} title="Toggle Fullscreen"><Maximize2 size={16} /></button>
                            <a
                                href={getPDFDownloadUrl(previewCal._id)}
                                download={previewCal.fileName}
                                style={{ ...styles.controlBtn, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Download PDF"
                            >
                                <Download size={16} />
                            </a>
                            <a
                                href={previewCal.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ ...styles.controlBtn, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Open in new tab"
                            >
                                <ExternalLink size={16} />
                            </a>
                            <button style={styles.closeBtn} onClick={() => setPreviewCal(null)} title="Close Preview"><X size={20} /></button>
                        </div>
                    </div>
                    <div className="responsive-preview-frame" style={styles.iframeContainer}>
                        {iframeLoading && (
                            <div style={styles.iframeLoader}>
                                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
                                <p style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>Loading PDF preview…</p>
                            </div>
                        )}
                        <iframe 
                            key={iframeKey}
                            src={getPDFServerUrl(previewCal._id)}
                            style={{
                                ...styles.iframe,
                                transform: `scale(${zoom / 100})`,
                                transformOrigin: 'top center',
                                height: `${100 * (100 / zoom)}%`,
                                width: `${100 * (100 / zoom)}%`,
                                display: iframeLoading ? 'none' : 'block',
                            }}
                            title="Academic PDF Viewport"
                            onLoad={() => setIframeLoading(false)}
                            onError={() => setIframeLoading(false)}
                            allow="fullscreen"
                        />
                    </div>
                </div>
            </div>
            )}
        </div>
    );
};

const label = (value: string) => value.replace(/^\w/, (char) => char.toUpperCase());

const formatRange = (startsAt: string, endsAt: string) => {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    return `${start.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} - ${end.toLocaleTimeString([], { timeStyle: 'short' })}`;
};

const statusStyle = (status: ExamEventStatus): React.CSSProperties => {
    if (status === 'cancelled') return { background: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' };
    if (status === 'draft') return { background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' };
    return { background: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' };
};

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem', maxWidth: 1180, margin: '0 auto', position: 'relative', fontFamily: "'Inter', sans-serif" },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, marginBottom: 22, flexWrap: 'wrap' },
    title: { margin: 0, fontSize: 26, fontWeight: 900, color: 'var(--text-main)' },
    subtitle: { margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14 },
    
    tabStrip: { display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 8, gap: 4 },
    tabBtn: { border: 'none', background: 'none', padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', borderRadius: 6, transition: 'all 0.15s', color: 'var(--text-muted)' },
    activeTab: { background: '#fff', color: '#111827', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },

    form: { background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 12, padding: 18, marginBottom: 18 },
    formHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color: 'var(--text-main)' },
    formTitle: { margin: 0, fontSize: 15, fontWeight: 800 },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 },
    uploadGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 },
    uploadInputGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
    uploadLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' },

    input: { width: '100%', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 8, padding: '10px 12px', background: 'var(--card-bg, #fff)', color: 'var(--text-main)', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 13 },
    fileInput: { fontSize: 13, padding: '6px 0' },
    textarea: { gridColumn: '1 / -1', minHeight: 82, resize: 'vertical' },
    primaryBtn: { border: 'none', borderRadius: 8, padding: '10px 18px', background: 'var(--primary)', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: 13, transition: 'background 0.2s' },
    
    toolbar: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
    filterLabel: { fontSize: 13, color: 'var(--text-muted)', fontWeight: 800 },
    filter: { border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 8, padding: '9px 12px', background: 'var(--card-bg, #fff)', color: 'var(--text-main)' },
    
    list: { display: 'grid', gap: 12 },
    card: { display: 'grid', gridTemplateColumns: '76px 1fr auto', gap: 14, alignItems: 'start', background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 8, padding: 14 },
    dateBadge: { border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 8, minHeight: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--page-bg, #f8fafc)' },
    cardBody: { minWidth: 0 },
    cardTop: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
    typePill: { border: '1px solid #bfdbfe', background: '#dbeafe', color: '#1d4ed8', borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 900 },
    statusPill: { border: '1px solid', borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 900 },
    eventTitle: { margin: 0, color: 'var(--text-main)', fontSize: 17, fontWeight: 900 },
    courseLine: { margin: '5px 0 10px', color: 'var(--text-muted)', fontSize: 13, fontWeight: 700 },
    meta: { display: 'flex', flexWrap: 'wrap', gap: 14, color: 'var(--text-muted)', fontSize: 13 },
    instructions: { margin: '12px 0 0', color: 'var(--text-main)', lineHeight: 1.55, fontSize: 14 },
    iconBtn: { width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 8, border: '1px solid #fecaca', color: '#dc2626', background: 'var(--card-bg)', cursor: 'pointer' },
    
    // PDF planners list
    pdfList: { display: 'flex', flexDirection: 'column', gap: 14 },
    pdfCard: { display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, transition: 'transform 0.15s, box-shadow 0.15s' },
    pdfIconWrap: { width: 44, height: 44, borderRadius: 8, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    pdfDetails: { flex: 1 },
    pdfTopRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 },
    pdfYearTag: { fontSize: 10, fontWeight: 800, color: '#4b5563', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 },
    pdfTypeTag: { fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4 },
    pdfTitle: { margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-main)' },
    pdfSubtext: { margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' },
    
    pdfActions: { display: 'flex', gap: 8, alignItems: 'center' },
    previewBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
    downloadLink: { display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' },
    pdfDeleteBtn: { padding: 8, background: 'none', border: '1px solid #fee2e2', color: '#dc2626', borderRadius: 8, cursor: 'pointer' },

    // Interactive PDF Previewer modal
    previewOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease', padding: 20 },
    previewModal: { background: '#fff', width: '100%', maxWidth: 880, height: '80vh', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' },
    fullscreenOverlay: { padding: 0 },
    fullscreenModal: { maxWidth: '100vw', height: '100vh', borderRadius: 0 },
    previewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' },
    previewTitle: { margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' },
    previewSub: { margin: '2px 0 0', fontSize: 11, color: '#64748b' },
    previewControls: { display: 'flex', gap: 6, alignItems: 'center' },
    controlBtn: { width: 34, height: 34, borderRadius: 6, border: '1px solid #e2e8f0', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563' },
    closeBtn: { width: 34, height: 34, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' },
    iframeContainer: { flex: 1, background: '#f8fafc', overflow: 'auto', display: 'flex', justifyContent: 'center', position: 'relative' },
    iframeLoader: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', zIndex: 10 },
    iframe: { border: 'none', transition: 'transform 0.2s ease', width: '100%', height: '100%' },

    empty: { padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color, #e5e7eb)', borderRadius: 12, background: '#fafbfc' },
    notice: { position: 'fixed', top: 18, right: 18, zIndex: 999999, border: '1px solid', borderRadius: 8, padding: '12px 14px', fontWeight: 800, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
    noticeSuccess: { background: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' },
    noticeError: { background: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' },
};

export default AcademicCalendarPage;
