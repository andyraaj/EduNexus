import React, { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';

type RoleOption = { value: UserRole; label: string; emoji: string; description: string };

const ROLES: RoleOption[] = [
    { value: 'student', label: 'Student', emoji: '🎓', description: 'Access your courses, grades & attendance' },
    { value: 'faculty', label: 'Faculty', emoji: '🏫', description: 'Manage classes, quizzes & assignments' },
    { value: 'admin', label: 'Admin', emoji: '⚙️', description: 'Oversee the entire institution' },
];

const DEMO_CREDS: Record<UserRole, { email: string; password: string }> = {
    student: { email: 'student1@EduNexus.edu', password: 'password123' },
    faculty: { email: 'john.smith@EduNexus.edu', password: 'password123' },
    admin: { email: 'admin@EduNexus.edu', password: 'password123' },
};

const ROLE_DASHBOARD: Record<UserRole, string> = {
    student: '/student/dashboard',
    faculty: '/faculty/dashboard',
    admin: '/admin/dashboard',
};

const LoginPage: React.FC = () => {
    const { login, isLoading, isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || null;

    useEffect(() => {
        if (isAuthenticated && user) {
            navigate(ROLE_DASHBOARD[user.role], { replace: true });
        }
    }, [isAuthenticated, user, navigate]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedRole) {
            setErrorMessage('Please select a role before continuing.');
            return;
        }
        setErrorMessage('');
        try {
            await login(email, password, selectedRole);
            navigate(from ?? ROLE_DASHBOARD[selectedRole], { replace: true });
        } catch (err: any) {
            setErrorMessage(err.message || 'Something went wrong. Please try again.');
        }
    };

    const fillDemo = (role: UserRole) => {
        setSelectedRole(role);
        setEmail(DEMO_CREDS[role].email);
        setPassword(DEMO_CREDS[role].password);
        setErrorMessage('');
    };

    return (
        <div style={styles.page}>
            {/* Subtle background elements */}
            <div style={styles.bgCircle1} />
            <div style={styles.bgCircle2} />

            {/* Back to Home */}
            <Link to="/" style={styles.backBtn}>← Back to Home</Link>

            <div style={styles.card}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.logo}>
                        <img src="/favicon.png?v=2" alt="EduNexus Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                        <span style={styles.logoText}>EduNexus</span>
                    </div>
                    <h1 style={styles.title}>Welcome back</h1>
                    <p style={styles.subtitle}>Sign in to your Smart Campus portal</p>
                </div>

                {/* Role Selection */}
                {!selectedRole && (
                    <div>
                        <p style={styles.roleLabel}>Choose your role to continue</p>
                        <div style={styles.roleGrid}>
                            {ROLES.map((r) => (
                                <button
                                    key={r.value}
                                    style={styles.roleCard}
                                    onClick={() => setSelectedRole(r.value)}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#2563eb';
                                        (e.currentTarget as HTMLButtonElement).style.background = '#f0f7ff';
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-color)';
                                        (e.currentTarget as HTMLButtonElement).style.background ='var(--card-bg)';
                                    }}
                                >
                                    <span style={styles.roleEmoji}>{r.emoji}</span>
                                    <div>
                                        <span style={styles.roleCardLabel}>{r.label}</span>
                                        <span style={styles.roleCardDesc}>{r.description}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Login Form */}
                {selectedRole && (
                    <form onSubmit={handleSubmit} style={styles.form} noValidate>
                        <div style={styles.roleBadge}>
                            <span>{ROLES.find(r => r.value === selectedRole)?.emoji} {ROLES.find(r => r.value === selectedRole)?.label}</span>
                            <button
                                type="button" style={styles.changeRole}
                                onClick={() => { setSelectedRole(null); setErrorMessage(''); setEmail(''); setPassword(''); }}
                            >Change</button>
                        </div>

                        {errorMessage && (
                            <div style={styles.errorBox} role="alert">⚠️ {errorMessage}</div>
                        )}

                        <div style={styles.fieldWrapper}>
                            <label htmlFor="email" style={styles.label}>Email address</label>
                            <input
                                id="email" type="email" autoComplete="email" required
                                style={styles.input} placeholder="you@EduNexus.edu"
                                value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading}
                            />
                        </div>

                        <div style={styles.fieldWrapper}>
                            <label htmlFor="password" style={styles.label}>Password</label>
                            <div style={styles.inputWrapper}>
                                <input
                                    id="password" type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password" required
                                    style={{ ...styles.input, paddingRight: '3rem' }} placeholder="••••••••"
                                    value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading}
                                />
                                <button
                                    type="button" style={styles.eyeBtn}
                                    onClick={() => setShowPassword(v => !v)}
                                >{showPassword ? '🙈' : '👁️'}</button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            style={{ ...styles.submitBtn, opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                            disabled={isLoading}
                        >
                            {isLoading ? '⏳ Signing in...' : 'Sign in →'}
                        </button>
                    </form>
                )}

                {/* Demo Credentials Section */}
                <div style={styles.demoSection}>
                    <p style={styles.demoTitle}>Quick Demo Login</p>
                    <div style={styles.demoBtnRow}>
                        {ROLES.map(r => (
                            <button key={r.value} style={styles.demoBtn} onClick={() => fillDemo(r.value)}>
                                {r.emoji} {r.label}
                            </button>
                        ))}
                    </div>
                    <p style={styles.demoHint}>Click a role above to auto-fill demo credentials</p>
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--page-bg)', fontFamily: "'Inter', 'Segoe UI', sans-serif",
        position: 'relative', overflow: 'hidden', padding: '1rem',
    },
    bgCircle1: {
        position: 'absolute', top: '-20%', right: '-10%', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)', pointerEvents: 'none',
    },
    bgCircle2: {
        position: 'absolute', bottom: '-15%', left: '-10%', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(var(--primary-rgb),0.06) 0%, transparent 70%)', pointerEvents: 'none',
    },
    backBtn: {
        position: 'absolute', top: 24, left: 24, fontSize: 13, fontWeight: 600,
        color: 'var(--text-muted)', textDecoration: 'none', zIndex: 20,
        padding: '8px 16px', borderRadius: 10, background:'var(--card-bg)', border: '1px solid var(--border-color)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'all 0.15s',
    },
    card: {
        background:'var(--card-bg)', borderRadius: 20, padding: '2.5rem', width: '100%', maxWidth: 440,
        boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px var(--border-color)',
        position: 'relative', zIndex: 10,
    },
    header: { textAlign: 'center', marginBottom: '2rem' },
    logo: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: '1.25rem' },
    logoText: { fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text-main)' },
    title: { fontSize: 24, fontWeight: 800, margin: '0 0 0.4rem', color: 'var(--text-main)', letterSpacing: '-0.5px' },
    subtitle: { color: 'var(--text-muted)', fontSize: 14, margin: 0, fontWeight: 500 },
    roleLabel: { textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginBottom: '1rem', fontWeight: 600 },
    roleGrid: { display: 'flex', flexDirection: 'column', gap: 10 },
    roleCard: {
        background:'var(--card-bg)', border: '1.5px solid var(--border-color)', borderRadius: 14, padding: '14px 16px',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
        textAlign: 'left', transition: 'all 0.15s', width: '100%',
    },
    roleEmoji: { fontSize: 28, minWidth: 40, textAlign: 'center' },
    roleCardLabel: { fontWeight: 700, fontSize: 15, display: 'block', color: 'var(--text-main)' },
    roleCardDesc: { fontSize: 12, color: 'var(--text-muted)', display: 'block', marginTop: 2, fontWeight: 500 },
    roleBadge: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--active-menu-bg)', border: '1px solid var(--border-color)', borderRadius: 10,
        padding: '10px 14px', fontSize: 14, fontWeight: 600, marginBottom: '1.25rem', color: 'var(--primary)',
    },
    changeRole: {
        background: 'none', border: 'none', color: 'var(--primary)',
        cursor: 'pointer', fontSize: 13, fontWeight: 600,
    },
    form: { display: 'flex', flexDirection: 'column', gap: 16 },
    errorBox: {
        background: 'rgba(239, 68, 68, 0.12)', border: '1px solid var(--border-color)', borderRadius: 10,
        padding: '10px 14px', fontSize: 13, color: '#ef4444', fontWeight: 500,
    },
    fieldWrapper: { display: 'flex', flexDirection: 'column', gap: 6 },
    label: { fontSize: 13, fontWeight: 600, color: 'var(--text-main)' },
    input: {
        background: 'var(--page-bg)', border: '1.5px solid var(--border-color)', borderRadius: 10,
        padding: '11px 14px', fontSize: 14, color: 'var(--text-main)', outline: 'none',
        width: '100%', boxSizing: 'border-box', transition: 'border-color 0.15s',
        fontFamily: "'Inter', sans-serif", fontWeight: 500,
    },
    inputWrapper: { position: 'relative' },
    eyeBtn: {
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1,
    },
    submitBtn: {
        background: 'var(--primary)', border: 'none', borderRadius: 12, padding: '12px',
        fontSize: 15, fontWeight: 700, color:'var(--card-bg)',
        cursor: 'pointer', transition: 'all 0.15s', marginTop: 4,
        boxShadow: '0 2px 8px rgba(var(--primary-rgb),0.3)',
    },
    demoSection: {
        marginTop: '1.5rem', textAlign: 'center', padding: '16px',
        background: 'var(--page-bg)', borderRadius: 14, border: '1px solid var(--border-color)',
    },
    demoTitle: { margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' },
    demoBtnRow: { display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 8 },
    demoBtn: {
        padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background:'var(--card-bg)',
        fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--text-main)', transition: 'all 0.15s',
    },
    demoHint: { margin: 0, fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 },
};

export default LoginPage;
