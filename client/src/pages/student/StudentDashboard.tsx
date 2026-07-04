import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchStudentAnalytics, StudentAnalytics } from '@/services/analyticsService';
import Skeleton from '@/components/Skeleton';

/* ─────────────────────────────────────────────
   Fallback / dummy data used when API is empty
───────────────────────────────────────────── */
const FALLBACK_ANALYTICS: StudentAnalytics = {
    attendancePercentage: 82,
    assignmentAverage: 76,
    quizAverage: 71,
    overallScore: 77,
};

const WEEKLY_ACTIVITY = [
    { day: 'Mon', attendance: 90, assignments: 80, quizzes: 70 },
    { day: 'Tue', attendance: 85, assignments: 90, quizzes: 60 },
    { day: 'Wed', attendance: 95, assignments: 70, quizzes: 85 },
    { day: 'Thu', attendance: 75, assignments: 85, quizzes: 90 },
    { day: 'Fri', attendance: 88, assignments: 78, quizzes: 75 },
    { day: 'Sat', attendance: 60, assignments: 65, quizzes: 55 },
    { day: 'Sun', attendance: 45, assignments: 40, quizzes: 50 },
];

const UPCOMING_TASKS = [
    { id: 1, type: 'assignment', title: 'Data Structures Lab Report', course: 'CS201', due: 'Tomorrow', priority: 'high', icon: '📝' },
    { id: 2, type: 'quiz',       title: 'Calculus — Integration Quiz', course: 'MA201', due: 'In 2 days', priority: 'medium', icon: '🧪' },
    { id: 3, type: 'assignment', title: 'Physics Problem Set 4',       course: 'PH101', due: 'In 3 days', priority: 'medium', icon: '📝' },
    { id: 4, type: 'quiz',       title: 'English Comprehension Test',  course: 'EN101', due: 'In 5 days', priority: 'low',    icon: '🧪' },
];

const ENROLLED_COURSES = [
    { code: 'CS201', name: 'Data Structures', progress: 68, color: 'var(--primary)', icon: '💻' },
    { code: 'MA201', name: 'Calculus II',     progress: 55, color: '#0ea5e9', icon: '📐' },
    { code: 'PH101', name: 'Physics Fund.',   progress: 80, color: '#10b981', icon: '⚛️' },
    { code: 'EN101', name: 'English Comm.',   progress: 90, color: '#f59e0b', icon: '📚' },
];

/* ─────────────────────────────────────────────
   SVG Sparkline chart
───────────────────────────────────────────── */
interface SparklineProps {
    data: number[];
    color: string;
    width?: number;
    height?: number;
}
const Sparkline: React.FC<SparklineProps> = ({ data, color, width = 80, height = 32 }) => {
    if (!data.length) return null;
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const pad = 3;
    const w = width - pad * 2;
    const h = height - pad * 2;
    const pts = data.map((v, i) => {
        const x = pad + (i / (data.length - 1)) * w;
        const y = pad + h - ((v - min) / range) * h;
        return `${x},${y}`;
    });
    const fillPts = [`${pad},${pad + h}`, ...pts, `${pad + w},${pad + h}`].join(' ');
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <defs>
                <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon points={fillPts} fill={`url(#sg-${color.replace('#', '')})`} />
            <polyline
                points={pts.join(' ')}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

/* ─────────────────────────────────────────────
   Weekly activity bar chart (SVG)
───────────────────────────────────────────── */
interface WeeklyChartProps {
    data: typeof WEEKLY_ACTIVITY;
}
const WeeklyChart: React.FC<WeeklyChartProps> = ({ data }) => {
    const [hovered, setHovered] = useState<number | null>(null);
    const chartH = 160;
    const barW = 28;
    const gap = 18;
    const totalW = data.length * (barW + gap) - gap + 40;
    const max = 100;

    return (
        <svg
            width="100%"
            viewBox={`0 0 ${totalW} ${chartH + 32}`}
            style={{ overflow: 'visible' }}
        >
            {/* Y-axis guide lines */}
            {[0, 25, 50, 75, 100].map(tick => {
                const y = chartH - (tick / max) * chartH;
                return (
                    <g key={tick}>
                        <line x1={20} y1={y} x2={totalW} y2={y}
                            stroke="#f3f4f6" strokeWidth={1} />
                        <text x={16} y={y + 4} fill="#d1d5db" fontSize={8} textAnchor="end">{tick}</text>
                    </g>
                );
            })}

            {data.map((d, i) => {
                const x = 24 + i * (barW + gap);
                const isHov = hovered === i;
                const attH = (d.attendance / max) * chartH;
                const quizH = (d.quizzes / max) * chartH;
                const segW = barW / 3 - 1;

                return (
                    <g key={d.day}
                        onMouseEnter={() => setHovered(i)}
                        onMouseLeave={() => setHovered(null)}
                        style={{ cursor: 'pointer' }}
                    >
                        {/* Hover background */}
                        {isHov && (
                            <rect x={x - 4} y={0} width={barW + 8} height={chartH}
                                fill="#f5f3ff" rx={6} />
                        )}

                        {/* Attendance bar */}
                        <rect
                            x={x} y={chartH - attH} width={segW} height={attH}
                            fill={isHov ? 'var(--primary-dark)' : 'var(--primary)'} rx={3}
                            style={{ transition: 'fill 0.15s' }}
                        />
                        {/* Assignment bar */}
                        <rect
                            x={x + segW + 1} y={chartH - (d.assignments / max) * chartH}
                            width={segW} height={(d.assignments / max) * chartH}
                            fill={isHov ? '#0891b2' : '#0ea5e9'} rx={3}
                            style={{ transition: 'fill 0.15s' }}
                        />
                        {/* Quiz bar */}
                        <rect
                            x={x + (segW + 1) * 2} y={chartH - quizH} width={segW} height={quizH}
                            fill={isHov ? '#059669' : '#10b981'} rx={3}
                            style={{ transition: 'fill 0.15s' }}
                        />

                        {/* Day label */}
                        <text x={x + barW / 2} y={chartH + 16} fill={isHov ? 'var(--primary)' : 'var(--text-muted)'}
                            fontSize={10} textAnchor="middle" fontWeight={isHov ? 700 : 500}>
                            {d.day}
                        </text>

                        {/* Tooltip on hover */}
                        {isHov && (
                            <g>
                                <rect x={x - 8} y={-48} width={barW + 16} height={44}
                                    fill="#1e1b4b" rx={6} />
                                <text x={x + barW / 2} y={-34} fill="#a5b4fc" fontSize={8} textAnchor="middle">Att {d.attendance}%</text>
                                <text x={x + barW / 2} y={-22} fill="#7dd3fc" fontSize={8} textAnchor="middle">Asn {d.assignments}%</text>
                                <text x={x + barW / 2} y={-10} fill="#6ee7b7" fontSize={8} textAnchor="middle">Qiz {d.quizzes}%</text>
                            </g>
                        )}
                    </g>
                );
            })}
        </svg>
    );
};

/* ─────────────────────────────────────────────
   Animated progress bar
───────────────────────────────────────────── */
interface ProgressBarProps {
    label: string;
    value: number;
    color: string;
    icon: string;
}
const ProgressBar: React.FC<ProgressBarProps> = ({ label, value, color, icon }) => {
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const t = setTimeout(() => setWidth(value), 100);
        return () => clearTimeout(t);
    }, [value]);

    const clampedValue = Math.min(Math.max(value, 0), 100);

    return (
        <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{icon}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-main)' }}>{label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color }}>
                        {clampedValue.toFixed(0)}%
                    </span>
                    <Sparkline
                        data={WEEKLY_ACTIVITY.map(w =>
                            label.toLowerCase().includes('attend') ? w.attendance :
                            label.toLowerCase().includes('assign') ? w.assignments :
                            w.quizzes
                        )}
                        color={color}
                    />
                </div>
            </div>
            <div style={{ height: 10, background: 'var(--border-color)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                    height: '100%', borderRadius: 99,
                    width: `${width}%`,
                    background: `linear-gradient(90deg, ${color}99, ${color})`,
                    transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }} />
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Stat card
───────────────────────────────────────────── */
interface StatCardProps {
    label: string;
    value: string;
    color: string;
    icon: string;
    trend?: string;
    trendUp?: boolean;
}
const StatCard: React.FC<StatCardProps> = ({ label, value, color, icon, trend, trendUp }) => (
    <div style={{
        background:'var(--card-bg)', borderRadius: 16, border: '1px solid #e5e7eb',
        padding: '20px 24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
        display: 'flex', alignItems: 'center', gap: 16,
    }}>
        <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
        }}>
            {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 3px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
            </p>
            <h3 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                {value}
            </h3>
        </div>
        {trend && (
            <span style={{
                fontSize: 12, fontWeight: 700, flexShrink: 0,
                color: trendUp ? '#10b981' : '#ef4444',
                background: trendUp ? '#d1fae5' : '#fee2e2',
                borderRadius: 99, padding: '3px 10px',
            }}>
                {trendUp ? '▲' : '▼'} {trend}
            </span>
        )}
    </div>
);

/* ─────────────────────────────────────────────
   Task item
───────────────────────────────────────────── */
const PRIORITY_COLORS: Record<string, { bg: string; color: string }> = {
    high:   { bg: '#fee2e2', color: '#dc2626' },
    medium: { bg: '#fef3c7', color: '#d97706' },
    low:    { bg: '#d1fae5', color: '#059669' },
};

interface TaskItemProps {
    task: typeof UPCOMING_TASKS[number];
}
const TaskItem: React.FC<TaskItemProps> = ({ task }) => {
    const p = PRIORITY_COLORS[task.priority];
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
            borderBottom: '1px solid #f9fafb',
        }}>
            <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: task.type === 'quiz' ? '#eff6ff' : '#f5f3ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>
                {task.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 2px', fontSize: 13.5, fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {task.title}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                    {task.course}
                </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <span style={{ ...p, fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '2px 8px' }}>
                    {task.priority}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{task.due}</span>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Course progress card
───────────────────────────────────────────── */
interface CourseCardProps {
    course: typeof ENROLLED_COURSES[number];
}
const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
    const [w, setW] = useState(0);
    useEffect(() => {
        const t = setTimeout(() => setW(course.progress), 200);
        return () => clearTimeout(t);
    }, [course.progress]);

    return (
        <div style={{
            background:'var(--card-bg)', border: '1px solid #e5e7eb', borderRadius: 14,
            padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `${course.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>
                    {course.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)' }}>{course.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{course.code}</p>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 800, color: course.color }}>
                    {course.progress}%
                </span>
            </div>
            <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                    height: '100%', borderRadius: 99, width: `${w}%`,
                    background: `linear-gradient(90deg, ${course.color}88, ${course.color})`,
                    transition: 'width 1.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }} />
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Main Dashboard
───────────────────────────────────────────── */
const StudentDashboard: React.FC = () => {
    const { accessToken, user } = useAuth();
    const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [usingFallback, setUsingFallback] = useState(false);

    useEffect(() => {
        if (!accessToken) return;
        setIsLoading(true);
        fetchStudentAnalytics(accessToken)
            .then(res => {
                // If all zeros or trivially empty, use fallback
                const isEmpty =
                    !res ||
                    (res.overallScore === 0 &&
                        res.attendancePercentage === 0 &&
                        res.assignmentAverage === 0 &&
                        res.quizAverage === 0);
                if (isEmpty) {
                    setAnalytics(FALLBACK_ANALYTICS);
                    setUsingFallback(true);
                } else {
                    setAnalytics(res);
                    setUsingFallback(false);
                }
            })
            .catch(() => {
                setAnalytics(FALLBACK_ANALYTICS);
                setUsingFallback(true);
            })
            .finally(() => setIsLoading(false));
    }, [accessToken]);

    const greeting = (() => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    })();

    const firstName = user?.name?.split(' ')[0] || 'Student';

    if (isLoading) {
        return (
            <div style={s.page}>
                <div style={s.header}>
                    <div>
                        <Skeleton width={120} height={16} style={{ marginBottom: 4 }} />
                        <Skeleton width={200} height={32} style={{ marginBottom: 8 }} />
                        <Skeleton width={300} height={16} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <Skeleton width={100} height={18} />
                        <Skeleton width={140} height={14} />
                    </div>
                </div>

                <div style={s.statsGrid}>
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} height={100} borderRadius={16} />
                    ))}
                </div>

                <div style={s.row2}>
                    <Skeleton height={350} borderRadius={20} />
                    <Skeleton height={350} borderRadius={20} />
                </div>

                <div style={s.row3}>
                    <Skeleton height={300} borderRadius={20} />
                    <Skeleton height={300} borderRadius={20} />
                </div>
            </div>
        );
    }

    const data = analytics!;

    const stats: StatCardProps[] = [
        {
            label: 'Overall Score',
            value: `${data.overallScore.toFixed(0)}%`,
            color: 'var(--primary)',
            icon: '🏆',
            trend: '2.4%',
            trendUp: true,
        },
        {
            label: 'Attendance',
            value: `${data.attendancePercentage.toFixed(0)}%`,
            color: '#10b981',
            icon: '📅',
            trend: '1.2%',
            trendUp: data.attendancePercentage >= 75,
        },
        {
            label: 'Avg. Assignment',
            value: `${data.assignmentAverage.toFixed(0)}%`,
            color: '#f59e0b',
            icon: '✍️',
            trend: '3.1%',
            trendUp: true,
        },
        {
            label: 'Avg. Quiz Score',
            value: `${data.quizAverage.toFixed(0)}%`,
            color: '#9333ea',
            icon: '📝',
            trend: '0.8%',
            trendUp: false,
        },
    ];

    const perfStatus = data.overallScore >= 80
        ? { emoji: '🌟', msg: 'Excellent trajectory! You\'re in the top tier.', color: '#059669', bg: '#d1fae5', border: '#a7f3d0' }
        : data.overallScore >= 60
        ? { emoji: '📈', msg: 'Good progress. Focus on weak areas to push higher.', color: '#d97706', bg: '#fef3c7', border: '#fde68a' }
        : { emoji: '⚠️', msg: 'You\'re falling behind. Reach out to your faculty.', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' };

    return (
        <div style={s.page}>

            {/* ── Fallback notice ── */}
            {usingFallback && (
                <div style={s.fallbackBanner}>
                    📊 Showing sample data — live analytics will appear once your courses have activity.
                </div>
            )}

            {/* ── Greeting header ── */}
            <div style={s.header}>
                <div>
                    <p style={s.greeting}>{greeting},</p>
                    <h1 style={s.name}>{firstName} 👋</h1>
                    <p style={s.subtitle}>Here's a snapshot of your academic performance today.</p>
                </div>
                <div style={s.headerDate}>
                    <span style={s.dateDay}>{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</span>
                    <span style={s.dateFull}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
            </div>

            {/* ── Stat cards ── */}
            <div style={s.statsGrid}>
                {stats.map((st, i) => <StatCard key={i} {...st} />)}
            </div>

            {/* ── Row 2: Performance breakdown + Weekly chart ── */}
            <div style={s.row2}>

                {/* Performance breakdown */}
                <div style={s.card}>
                    <h2 style={s.cardTitle}>Performance Breakdown</h2>
                    <ProgressBar label="Attendance" value={data.attendancePercentage} color="#10b981" icon="📅" />
                    <ProgressBar label="Assignments" value={data.assignmentAverage}   color="#f59e0b" icon="✍️" />
                    <ProgressBar label="Quizzes"     value={data.quizAverage}         color="#9333ea" icon="📝" />
                    <ProgressBar label="Overall"     value={data.overallScore}        color="var(--primary)" icon="🏆" />

                    {/* Status banner */}
                    <div style={{ ...s.statusBanner, background: perfStatus.bg, border: `1px solid ${perfStatus.border}`, color: perfStatus.color }}>
                        <span style={{ fontSize: 18 }}>{perfStatus.emoji}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{perfStatus.msg}</span>
                    </div>
                </div>

                {/* Weekly activity chart */}
                <div style={s.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                        <h2 style={s.cardTitle}>Weekly Activity</h2>
                        <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                            {[
                                { label: 'Attend.', color: 'var(--primary)' },
                                { label: 'Assign.', color: '#0ea5e9' },
                                { label: 'Quiz',    color: '#10b981' },
                            ].map(l => (
                                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{l.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <WeeklyChart data={WEEKLY_ACTIVITY} />
                    <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                        * Sample weekly breakdown. Live data will reflect actual records.
                    </p>
                </div>
            </div>

            {/* ── Row 3: Course progress + Upcoming tasks ── */}
            <div style={s.row3}>

                {/* Course progress */}
                <div style={s.card}>
                    <h2 style={s.cardTitle}>Course Progress</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {(data.enrolledCourses || ENROLLED_COURSES).map(c => <CourseCard key={c.code} course={c} />)}
                    </div>
                </div>

                {/* Upcoming tasks */}
                <div style={s.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <h2 style={s.cardTitle}>Upcoming Tasks</h2>
                        <span style={{
                            background: '#ef444420', color: '#ef4444', borderRadius: 99,
                            padding: '2px 10px', fontSize: 11, fontWeight: 700,
                        }}>
                            {(data.upcomingTasks || UPCOMING_TASKS).length} pending
                        </span>
                    </div>
                    <div>
                        {(data.upcomingTasks || UPCOMING_TASKS).map(task => <TaskItem key={task.id} task={task as any} />)}
                    </div>
                    <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                        * Live tasks will appear as faculty posts assignments and quizzes.
                    </p>
                </div>
            </div>

        </div>
    );
};

/* ─────────────────────────────────────────────
   Styles
───────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
    page: {
        maxWidth: 1280,
        margin: '0 auto',
        fontFamily: "'Inter', sans-serif",
    },

    /* Loader */
    loaderWrap: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '60vh', gap: 16,
    },
    spinner: {
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid #e5e7eb', borderTop: '3px solid var(--primary)',
        animation: 'spin 0.8s linear infinite',
    },
    loaderText: { fontSize: 15, color: 'var(--text-muted)', fontWeight: 500, margin: 0 },

    /* Fallback banner */
    fallbackBanner: {
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
        padding: '10px 16px', marginBottom: 20,
        fontSize: 13, color: '#1d4ed8', fontWeight: 600,
    },

    /* Header */
    header: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        marginBottom: 28, flexWrap: 'wrap', gap: 12,
    },
    greeting: { margin: '0 0 2px', fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 },
    name: { margin: '0 0 4px', fontSize: 28, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' },
    subtitle: { margin: 0, fontSize: 14, color: 'var(--text-muted)' },
    headerDate: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
    dateDay: { fontSize: 14, fontWeight: 700, color: 'var(--primary)' },
    dateFull: { fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 },

    /* Stat cards grid */
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 24,
    },

    /* Card base */
    card: {
        background:'var(--card-bg)',
        borderRadius: 20,
        border: '1px solid #e5e7eb',
        padding: '24px 24px 20px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
    },
    cardTitle: {
        margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.3px',
    },

    /* Row layouts */
    row2: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))',
        gap: 20,
        marginBottom: 24,
    },
    row3: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))',
        gap: 20,
    },

    /* Status banner inside card */
    statusBanner: {
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px', borderRadius: 10, marginTop: 20,
    },
};

// Inject spinner keyframes once
if (typeof document !== 'undefined' && !document.getElementById('EduNexus-spin')) {
    const style = document.createElement('style');
    style.id = 'EduNexus-spin';
    style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
}

export default StudentDashboard;
