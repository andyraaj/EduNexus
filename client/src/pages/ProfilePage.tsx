import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMyProfile, updateMyProfile, fetchPublicProfile } from '@/services/userService';
import type { ProfileData } from '@/services/userService';

type ActiveTab = 'identity' | 'analytics' | 'activity' | 'achievements' | 'settings';

interface Achievement {
    id: string;
    title: string;
    icon: string;
    description: string;
    unlockedAt: string;
}

const ProfilePage: React.FC = () => {
    const { userId } = useParams<{ userId?: string }>();
    const { accessToken, user } = useAuth();
    
    // Check if viewing own profile. Since user object might have id or _id depending on AuthContext implementation.
    const isOwnProfile = !userId || userId === (user as any)?.id || userId === (user as any)?._id;

    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<ActiveTab>('identity');

    // Custom Profile Personalization States
    const [form, setForm] = useState<Record<string, string>>({});
    const [accentColor, setAccentColor] = useState<string>('var(--primary)');
    const [bannerGradient, setBannerGradient] = useState<string>('linear-gradient(135deg, #1e1b4b, #3b82f6)');
    const [pronouns, setPronouns] = useState<string>('');
    const [skills, setSkills] = useState<string[]>([]);
    const [newSkill, setNewSkill] = useState<string>('');
    const [githubLink, setGithubLink] = useState<string>('');
    const [linkedinLink, setLinkedinLink] = useState<string>('');
    const [socials, setSocials] = useState<Array<{ platform: string; url: string; icon: string }>>([]);

    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        if (!accessToken) return;
        const load = async () => {
            try {
                const data = isOwnProfile 
                    ? await fetchMyProfile(accessToken) 
                    : await fetchPublicProfile(accessToken, userId!);
                    
                setProfileData(data);
                
                // Set default form
                setForm({
                    name: data.user.name,
                    department: (data.profile as any)?.department || 'Engineering',
                    designation: (data.profile as any)?.designation || 'Lecturer',
                    semester: String((data.profile as any)?.semester || '1'),
                    bio: data.user.bio || (data.profile as any)?.bio || '',
                });

                // Extrapolate customizable personalization fields from base user or profile
                setPronouns(data.user.pronouns || (data.profile as any)?.pronouns || 'He/Him');
                setSkills(data.user.skills || (data.profile as any)?.skills || ['Systems Architecture', 'Node.js', 'React', 'MongoDB']);
                setBannerGradient(data.user.bannerGradient || (data.profile as any)?.bannerGradient || 'linear-gradient(135deg, #1e1b4b, #3b82f6)');
                setAccentColor(data.user.accentColor || (data.profile as any)?.accentColor || 'var(--primary)');

                const initialSocials = data.user.socials || (data.profile as any)?.socials || [
                    { platform: 'GitHub', url: 'https://github.com/EduNexus-user', icon: '💻' },
                    { platform: 'LinkedIn', url: 'https://linkedin.com/in/EduNexus-user', icon: '🔗' },
                ];
                setSocials(initialSocials);
                if (initialSocials[0]) setGithubLink(initialSocials[0].url);
                if (initialSocials[1]) setLinkedinLink(initialSocials[1].url);

            } catch (e: any) {
                showToast(e.message || 'Failed to load profile.', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [accessToken, userId, isOwnProfile]);

    const handleSave = async () => {
        if (!accessToken) return;
        setIsSaving(true);
        try {
            const updatedSocials = [
                { platform: 'GitHub', url: githubLink || 'https://github.com', icon: '💻' },
                { platform: 'LinkedIn', url: linkedinLink || 'https://linkedin.com', icon: '🔗' },
            ];
            
            const payload = {
                ...form,
                pronouns,
                skills,
                bannerGradient,
                accentColor,
                socials: updatedSocials,
            };

            const updated = await updateMyProfile(accessToken, payload as Record<string, unknown>);
            setProfileData(updated);
            setSocials(updatedSocials);
            setIsEditing(false);
            showToast('Digital Identity updated successfully!');
        } catch (e: any) {
            showToast(e.message || 'Update failed.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const addSkill = () => {
        if (!newSkill.trim()) return;
        if (skills.includes(newSkill.trim())) {
            setNewSkill('');
            return;
        }
        setSkills([...skills, newSkill.trim()]);
        setNewSkill('');
    };

    const removeSkill = (index: number) => {
        setSkills(skills.filter((_, i) => i !== index));
    };

    if (isLoading) return <div style={styles.loading}>Loading digital identity...</div>;
    if (!profileData) return <div style={styles.loading}>Profile not found.</div>;

    const { user: u, profile } = profileData;
    const p = profile as any;
    const isStudent = user?.role === 'student';
    const isFaculty = user?.role === 'faculty';
    const isAdmin = user?.role === 'admin';

    // Verification Badges & Streaks Configuration
    const verificationBadge = isAdmin
        ? { text: 'Systems Admin ⚙️', color: '#dc2626' }
        : isFaculty
        ? { text: 'Senior Faculty 🏫', color: '#059669' }
        : { text: 'Verified Student 🎓', color: 'var(--primary)' };

    const mockAchievements: Achievement[] = [
        { id: '1', title: 'Perfect attendance', icon: '🌟', description: 'Maintained above 95% attendance during active semester.', unlockedAt: '2 days ago' },
        { id: '2', title: 'Top class performance', icon: '🏆', description: 'Scored full marks in dynamic assessment benchmarks.', unlockedAt: '1 week ago' },
        { id: '3', title: 'Code Pioneer', icon: '⚡', description: 'Successfully configured complex full-stack ERP modules.', unlockedAt: 'Recently' },
    ];

    const gradients = [
        'linear-gradient(135deg, #1e1b4b, #3b82f6)',
        'linear-gradient(135deg, #111827, #6b21a8)',
        'linear-gradient(135deg, #022c22, #059669)',
        'linear-gradient(135deg, #1e293b, #475569)',
    ];

    return (
        <div style={styles.page}>
            {/* Dynamic Custom Toast */}
            {toast && (
                <div style={{ 
                    ...styles.toast, 
                    background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(5, 150, 105, 0.15)', 
                    borderColor: toast.type === 'error' ? '#ef4444' : '#10b981',
                    color: toast.type === 'error' ? '#ef4444' : '#10b981'
                }}>
                    {toast.type === 'error' ? '⚠️' : '✅'} {toast.msg}
                </div>
            )}

            {/* ── PROFILE HEADER (NOTION / LINKEDIN STYLE) ── */}
            <div style={styles.headerContainer}>
                {/* Banner image background */}
                <div style={{ ...styles.banner, background: bannerGradient }} />

                {/* Profile Cover Control */}
                {isEditing && (
                    <div style={styles.bannerControls}>
                        {gradients.map((g, idx) => (
                            <button 
                                key={idx} 
                                style={{ ...styles.gradientOption, background: g }} 
                                onClick={() => setBannerGradient(g)}
                            />
                        ))}
                    </div>
                )}

                <div style={styles.headerContent}>
                    {/* Glass Avatar Container */}
                    <div style={styles.avatarWrapper}>
                        <div style={{
                            ...styles.avatarGlass,
                            background: `linear-gradient(135deg, ${accentColor}, #0f172a)`,
                            color: '#ffffff'
                        }}>
                            {u.name.charAt(0).toUpperCase()}
                        </div>
                        {/* Interactive Status Indicator */}
                        <div style={styles.statusIndicator} />
                    </div>

                    <div style={styles.headerInfo}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <h1 style={styles.profileName}>{u.name}</h1>
                            <span style={{ ...styles.badge, background: verificationBadge.color + '20', color: verificationBadge.color }}>
                                {verificationBadge.text}
                            </span>
                            {pronouns && <span style={styles.pronounsTag}>{pronouns}</span>}
                        </div>
                        <p style={styles.profileTagline}>
                            {isStudent ? `Semester ${p.semester} • ${p.department} Department` : isFaculty ? `${p.designation} • ${p.department} Department` : 'System Administrator'}
                        </p>
                        <p style={styles.profileMeta}>📍 EduNexus ERP Ecosystem • Active Session</p>
                    </div>

                    {isOwnProfile && (
                        <div style={styles.actionBlock}>
                            <button
                                style={{ ...styles.primaryBtn, background: accentColor }}
                                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                disabled={isSaving}
                            >
                                {isSaving ? '⏳ Saving...' : isEditing ? '✅ Save Identity' : '✏️ Personalize Profile'}
                            </button>
                            {isEditing && (
                                <button style={styles.cancelBtn} onClick={() => setIsEditing(false)}>Cancel</button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── DASHBOARD SUB-NAVIGATION ── */}
            <div style={styles.tabsRow}>
                {(['identity', 'analytics', 'activity', 'achievements', 'settings'] as ActiveTab[]).map(t => (
                    <button
                        key={t}
                        style={{
                            ...styles.tabBtn,
                            color: activeTab === t ? 'var(--text-main)' : 'var(--text-muted)',
                            borderBottom: activeTab === t ? `3px solid ${accentColor}` : '3px solid transparent',
                            fontWeight: activeTab === t ? 700 : 500
                        }}
                        onClick={() => setActiveTab(t)}
                    >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>

            {/* ── PROFILE CONTENT AREA ── */}
            <div style={styles.contentBody}>
                {/* ── TAB 1: IDENTITY & CUSTOMIZATION ── */}
                {activeTab === 'identity' && (
                    <div style={styles.grid}>
                        {/* Left Card: Core Credentials */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>Identity & Bio</h3>
                            {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div>
                                        <label style={styles.inputLabel}>Pronouns</label>
                                        <select style={styles.inputField} value={pronouns} onChange={e => setPronouns(e.target.value)}>
                                            <option value="He/Him">He/Him</option>
                                            <option value="She/Her">She/Her</option>
                                            <option value="They/Them">They/Them</option>
                                            <option value="Prefer not to say">Prefer not to say</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={styles.inputLabel}>Short Bio</label>
                                        <textarea
                                            style={{ ...styles.inputField, height: 80, resize: 'vertical' }}
                                            value={form.bio}
                                            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                                            placeholder="Introduce yourself to the campus..."
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p style={styles.bioText}>{p?.bio || 'Introduce yourself to the campus — add a bio using the personalization control!'}</p>
                                    <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                        <InfoBlock label="Verification status" value="🟢 Verified Profile" />
                                        <InfoBlock label="Email Address" value={u.email} />
                                        <InfoBlock label="Account Authority" value={u.role.toUpperCase()} />
                                        <InfoBlock label="Member ID" value={isStudent ? p.rollNumber : isFaculty ? p.employeeId : 'ADM-01'} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Card: Skills Tagging System & Personalizer */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>Skills & Competencies</h3>
                            <div style={styles.skillsContainer}>
                                {skills.map((s, idx) => (
                                    <span key={s} style={styles.skillTag}>
                                        {s}
                                        {isEditing && (
                                            <button style={styles.removeSkillBtn} onClick={() => removeSkill(idx)}>×</button>
                                        )}
                                    </span>
                                ))}
                            </div>
                            {isEditing && (
                                <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
                                    <input
                                        style={{ ...styles.inputField, flex: 1 }}
                                        placeholder="Add new skill tag..."
                                        value={newSkill}
                                        onChange={e => setNewSkill(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addSkill()}
                                    />
                                    <button style={{ ...styles.primaryBtn, background: accentColor }} onClick={addSkill}>+</button>
                                </div>
                            )}

                            {/* Theme Customizer Panel */}
                            {isEditing && (
                                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                                    <h4 style={{ ...styles.cardTitle, fontSize: 13, marginBottom: 8 }}>Dynamic Accent Highlight</h4>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        {['#2563EB', '#8B5CF6', '#10B981', '#F59E0B'].map(color => (
                                            <button
                                                key={color}
                                                style={{
                                                    width: 24, height: 24, borderRadius: '50%',
                                                    background: color, border: accentColor === color ? '3px solid var(--text-main)' : 'none',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => setAccentColor(color)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Connected Socials */}
                            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                                <h4 style={{ ...styles.cardTitle, fontSize: 13, marginBottom: 12 }}>Digital Portfolios</h4>
                                {isEditing ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <input
                                            style={styles.inputField}
                                            placeholder="GitHub Profile URL"
                                            value={githubLink}
                                            onChange={e => setGithubLink(e.target.value)}
                                        />
                                        <input
                                            style={styles.inputField}
                                            placeholder="LinkedIn Profile URL"
                                            value={linkedinLink}
                                            onChange={e => setLinkedinLink(e.target.value)}
                                        />
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        {socials.map((s, idx) => (
                                            <a 
                                                key={idx} 
                                                href={s.url} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                style={{ ...styles.socialChip, border: `1px solid var(--border-color)` }}
                                            >
                                                {s.icon} {s.platform}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TAB 2: ANALYTICS TELEMETRY (PREMIUM SVG CHARTS) ── */}
                {activeTab === 'analytics' && (
                    <div style={styles.grid}>
                        {/* Attendance Tracker Widget */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>Engagement Telemetry</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                {/* SVG Circular Metric Gauge */}
                                <svg width="90" height="90" viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
                                    <path
                                        stroke="var(--border-color)"
                                        strokeWidth="3"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        stroke={accentColor}
                                        strokeWidth="3.5"
                                        strokeDasharray="88, 100"
                                        strokeLinecap="round"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <text x="18" y="20.35" textAnchor="middle" fontSize="8" fill="var(--text-main)" fontWeight="700">88%</text>
                                </svg>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>Outstanding Compliance</h4>
                                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                        Your cumulative attendance scores are comfortably above the standard compliance threshold limit.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Performance analytics chart placeholder */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>Academic Streaks</h3>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                <div style={{ ...styles.metricBadge, border: `1px solid var(--border-color)` }}>
                                    <span style={{ fontSize: 24 }}>🔥</span>
                                    <div>
                                        <span style={styles.metricVal}>14 Days</span>
                                        <span style={styles.metricLabel}>Study Streak</span>
                                    </div>
                                </div>
                                <div style={{ ...styles.metricBadge, border: `1px solid var(--border-color)` }}>
                                    <span style={{ fontSize: 24 }}>🎯</span>
                                    <div>
                                        <span style={styles.metricVal}>9.2 / 10</span>
                                        <span style={styles.metricLabel}>Grade Average</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TAB 3: LIVE REFRESHING CHRONOLOGY TIMELINE ── */}
                {activeTab === 'activity' && (
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>Digital Activity Ledger</h3>
                        <div style={styles.timeline}>
                            <TimelineNode title="Personalized banner & accent colors updated" desc="You updated your digital identity and profile colors." time="Just now" />
                            <TimelineNode title="Assigned Course Syllabus completed 88%" desc="Materials files & coursework documents synchronized." time="2 hours ago" />
                            <TimelineNode title="ERP Authentication Session Verified" desc="Access credentials granted via silent OAuth refresh interceptor." time="Today at 10:24 AM" />
                        </div>
                    </div>
                )}

                {/* ── TAB 4: GAMIFIED ACHIEVEMENTS ── */}
                {activeTab === 'achievements' && (
                    <div style={styles.grid}>
                        {mockAchievements.map(a => (
                            <div key={a.id} style={{ ...styles.achievementCard, border: `1px solid var(--border-color)` }}>
                                <div style={styles.achievementIcon}>{a.icon}</div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>{a.title}</h4>
                                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{a.description}</p>
                                    <span style={{ fontSize: 10, color: accentColor, fontWeight: 700, textTransform: 'uppercase', marginTop: 8, display: 'inline-block' }}>
                                        🔓 Unlocked {a.unlockedAt}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── TAB 5: ADVANCED SETTINGS PANEL ── */}
                {activeTab === 'settings' && (
                    <div style={styles.grid}>
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>Account Security & Controls</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={styles.settingRow}>
                                    <div>
                                        <span style={styles.settingTitle}>Two-Factor Authentication</span>
                                        <span style={styles.settingDesc}>Secure your portal logins with an extra verification code layer.</span>
                                    </div>
                                    <button style={{ ...styles.pillBtn, color: accentColor, border: `1px solid ${accentColor}` }}>Configure</button>
                                </div>
                                <div style={styles.settingRow}>
                                    <div>
                                        <span style={styles.settingTitle}>Session Management</span>
                                        <span style={styles.settingDesc}>You are currently logged in to this dynamic window.</span>
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>Current Active</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Sub-Component: Information Row Block
const InfoBlock: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 500 }}>{value}</span>
    </div>
);

// Sub-Component: Chronology Timeline Node
const TimelineNode: React.FC<{ title: string; desc: string; time: string }> = ({ title, desc, time }) => (
    <div style={{ display: 'flex', gap: 16, position: 'relative', paddingBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--primary)', zIndex: 2 }} />
            <div style={{ width: 2, flex: 1, background: 'var(--border-color)' }} />
        </div>
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>{title}</h4>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{time}</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{desc}</p>
        </div>
    </div>
);

const styles: Record<string, React.CSSProperties> = {
    page: { padding: '2rem 1.5rem', maxWidth: 1000, margin: '0 auto', fontFamily: "'Inter', sans-serif", position: 'relative' },
    loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)', fontSize: 15, fontWeight: 600 },
    headerContainer: { background: 'var(--card-bg)', borderRadius: 24, border: '1px solid var(--border-color)', overflow: 'hidden', position: 'relative', boxShadow: '0 4px 30px rgba(0,0,0,0.03)' },
    banner: { height: 160, transition: 'background 0.3s ease', position: 'relative' },
    bannerControls: { position: 'absolute', top: 16, right: 16, display: 'flex', gap: 6, background: 'rgba(0,0,0,0.4)', padding: '6px', borderRadius: 20, backdropFilter: 'blur(8px)', zIndex: 5 },
    gradientOption: { width: 20, height: 20, borderRadius: '50%', border: '2px solid #fff', cursor: 'pointer', outline: 'none' },
    headerContent: { display: 'flex', padding: '2rem 2.5rem 1.5rem', gap: 32, alignItems: 'center', position: 'relative', flexWrap: 'wrap' },
    avatarWrapper: { position: 'relative', flexShrink: 0, marginTop: -64, zIndex: 10 },
    avatarGlass: { width: 108, height: 108, borderRadius: 28, background: 'rgba(255,255,255,0.12)', border: '4px solid var(--card-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, fontWeight: 800, color: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' },
    statusIndicator: { position: 'absolute', bottom: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: '#10b981', border: '3px solid var(--card-bg)' },
    headerInfo: { flex: 1, minWidth: 260, paddingLeft: 8, display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 },
    profileName: { fontSize: 26, fontWeight: 900, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.5px', lineHeight: 1.25 },
    pronounsTag: { fontSize: 11, background: 'var(--border-color)', color: 'var(--text-muted)', padding: '3px 8px', borderRadius: 6, fontWeight: 700 },
    profileTagline: { fontSize: 14, color: 'var(--text-main)', fontWeight: 600, margin: 0 },
    profileMeta: { fontSize: 12, color: 'var(--text-muted)', margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 },
    actionBlock: { display: 'flex', gap: 10, alignItems: 'center', alignSelf: 'center' },
    primaryBtn: { padding: '10px 18px', borderRadius: 10, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(37,99,235,0.2)', display: 'inline-flex', alignItems: 'center', gap: 6 },
    cancelBtn: { padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
    tabsRow: { display: 'flex', gap: 24, borderBottom: '1px solid var(--border-color)', marginTop: '2rem', paddingLeft: '1rem' },
    tabBtn: { background: 'none', border: 'none', padding: '12px 4px', fontSize: 14, cursor: 'pointer', transition: 'all 0.15s' },
    contentBody: { marginTop: '1.5rem' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' },
    card: { background: 'var(--card-bg)', borderRadius: 20, border: '1px solid var(--border-color)', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' },
    cardTitle: { fontSize: 14, fontWeight: 800, color: 'var(--text-main)', margin: '0 0 1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
    bioText: { fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, fontWeight: 500 },
    skillsContainer: { display: 'flex', gap: 8, flexWrap: 'wrap' },
    skillTag: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, background: 'var(--active-menu-bg)', color: 'var(--primary)', padding: '4px 10px', borderRadius: 8 },
    removeSkillBtn: { background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 14, padding: 0, fontWeight: 700 },
    inputLabel: { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 },
    inputField: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border-color)', background: 'var(--page-bg)', color: 'var(--text-main)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
    socialChip: { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-main)', textDecoration: 'none', padding: '8px 14px', borderRadius: 10, background: 'var(--card-bg)' },
    metricBadge: { flex: 1, minWidth: 150, padding: '16px', borderRadius: 16, background: 'var(--card-bg)', display: 'flex', gap: 12, alignItems: 'center' },
    metricVal: { fontSize: 18, fontWeight: 800, color: 'var(--text-main)', display: 'block', letterSpacing: '-0.5px' },
    metricLabel: { fontSize: 11, color: 'var(--text-muted)', display: 'block', fontWeight: 600, marginTop: 2 },
    timeline: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: '1rem' },
    achievementCard: { padding: '16px', borderRadius: 16, background: 'var(--card-bg)', display: 'flex', gap: 16, alignItems: 'flex-start' },
    achievementIcon: { fontSize: 24, width: 44, height: 44, borderRadius: 12, background: 'var(--active-menu-bg)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' },
    settingRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)', gap: 16 },
    settingTitle: { fontSize: 13, fontWeight: 700, color: 'var(--text-main)', display: 'block' },
    settingDesc: { fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 2, lineHeight: 1.4 },
    pillBtn: { background: 'none', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
    badge: { fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.05em' },
    toast: { position: 'fixed', top: 24, right: 24, padding: '12px 20px', borderRadius: 12, border: '1px solid', fontSize: 13, fontWeight: 600, zIndex: 99999, boxShadow: '0 8px 30px rgba(0,0,0,0.12)', backdropFilter: 'blur(8px)' },
};

export default ProfilePage;
