import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Search, ChevronDown, User, Settings, LogOut, Home, X, Menu } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';

/* ─────────────────────────────────────────────
   Mock Search Suggestions
───────────────────────────────────────────── */
interface SearchSuggestion {
    id: number;
    label: string;
    category: string;
    icon: string;
    path: string;
}
const ALL_SUGGESTIONS: SearchSuggestion[] = [
    { id: 1,  label: 'Dashboard',       category: 'Page',   icon: '🏠', path: 'dashboard' },
    { id: 2,  label: 'Courses',         category: 'Page',   icon: '📚', path: 'courses' },
    { id: 3,  label: 'Attendance',      category: 'Page',   icon: '📋', path: 'attendance' },
    { id: 4,  label: 'Assignments',     category: 'Page',   icon: '📝', path: 'assignments' },
    { id: 5,  label: 'Quizzes',         category: 'Page',   icon: '🧪', path: 'quizzes' },
    { id: 6,  label: 'Messages',        category: 'Page',   icon: '💬', path: 'messages' },
    { id: 7,  label: 'Profile',         category: 'Page',   icon: '👤', path: 'profile' },
    { id: 8,  label: 'CS101 – Intro to Computer Science', category: 'Course', icon: '💻', path: 'courses' },
    { id: 9,  label: 'MA201 – Calculus II',               category: 'Course', icon: '📐', path: 'courses' },
    { id: 10, label: 'PH101 – Physics Fundamentals',      category: 'Course', icon: '⚛️', path: 'courses' },
];

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const ROLE_LABELS: Record<string, string> = {
    student: 'Student',
    faculty: 'Faculty',
    admin: 'Administrator',
};

const getPageTitle = (pathname: string): string => {
    const segment = pathname.split('/').filter(Boolean).pop() || '';
    if (!segment) return 'Dashboard';
    return segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

function useHover(): [boolean, { onMouseEnter: () => void; onMouseLeave: () => void }] {
    const [hovered, setHovered] = useState(false);
    return [hovered, { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) }];
}

/* ─────────────────────────────────────────────
   TopBar Component
───────────────────────────────────────────── */
interface TopBarProps {
    pageTitle?: string;
    onMenuClick?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ pageTitle, onMenuClick }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [searchQuery, setSearchQuery]   = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [showProfile, setShowProfile]   = useState(false);

    const profileRef = useRef<HTMLDivElement>(null);
    const searchRef  = useRef<HTMLDivElement>(null);

    /* Close dropdowns on outside click */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setShowProfile(false);
            }
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleLogout = async () => {
        setShowProfile(false);
        await logout();
        navigate('/login');
    };

    const filteredSuggestions = useCallback(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return [];
        return ALL_SUGGESTIONS.filter(s =>
            s.label.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
        ).slice(0, 6);
    }, [searchQuery]);

    const handleSuggestionClick = (suggestion: SearchSuggestion) => {
        const role = user?.role || 'student';
        navigate(`/${role}/${suggestion.path}`);
        setSearchQuery('');
        setSearchFocused(false);
    };

    const title = pageTitle || getPageTitle(location.pathname);
    const showSearchResults = searchFocused && searchQuery.trim().length > 0;
    const results = filteredSuggestions();

    return (
        <header style={s.bar}>
            {/* ── Left: Hamburger (mobile) + Home icon + Page title ── */}
            <div style={s.left}>
                {/* Hamburger – only shown on mobile via CSS */}
                <button
                    className="hamburger-btn"
                    style={s.hamburger}
                    onClick={onMenuClick}
                    aria-label="Open navigation menu"
                    title="Open menu"
                >
                    <Menu size={20} />
                </button>

                <HomeBtn />
                <span className="topbar-page-title" style={s.pageTitle}>{title}</span>
            </div>

            {/* ── Center: Search bar ── */}
            <div
                ref={searchRef}
                className="topbar-search-wrap"
                style={{
                    ...s.searchWrap,
                    ...(searchFocused ? s.searchWrapFocused : {}),
                    position: 'relative',
                }}
            >
                <Search size={15} style={{ color: searchFocused ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0, transition: 'color 0.15s' }} />
                <input
                    id="topbar-search"
                    style={s.searchInput}
                    placeholder="Search pages, courses…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    autoComplete="off"
                    aria-label="Search"
                />
                {searchQuery && (
                    <button
                        style={s.clearBtn}
                        onClick={() => { setSearchQuery(''); setSearchFocused(true); }}
                        title="Clear search"
                        aria-label="Clear search"
                    >
                        <X size={14} />
                    </button>
                )}

                {/* Search Results Dropdown */}
                {showSearchResults && (
                    <div style={s.searchDropdown}>
                        {results.length === 0 ? (
                            <div style={s.searchNoResult}>
                                <span style={{ fontSize: 22 }}>🔍</span>
                                <span>No results for "<strong>{searchQuery}</strong>"</span>
                            </div>
                        ) : (
                            <>
                                <div style={s.searchDropdownHeader}>Quick Results</div>
                                {results.map(item => (
                                    <SearchResultItem
                                        key={item.id}
                                        item={item}
                                        onClick={() => handleSuggestionClick(item)}
                                    />
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ── Right: Theme + Notifications + Profile ── */}
            <div style={s.right}>
                <ThemeToggle />
                <NotificationBell />

                {/* Profile Dropdown */}
                <div ref={profileRef} style={{ position: 'relative' }}>
                    <button
                        id="topbar-profile"
                        style={s.profileBtn}
                        onClick={() => setShowProfile(v => !v)}
                        aria-label="User menu"
                    >
                        <div style={s.avatar}>
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div style={s.userInfo} className="topbar-user-info">
                            <span style={s.userName}>{user?.name?.split(' ')[0] || 'User'}</span>
                            <span style={s.userRole}>{ROLE_LABELS[user?.role || ''] || ''}</span>
                        </div>
                        <ChevronDown
                            size={13}
                            style={{
                                color: 'var(--text-muted)',
                                transform: showProfile ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.2s',
                            }}
                        />
                    </button>

                    {showProfile && (
                        <div style={s.profileDropdown}>
                            <div style={s.profileHeader}>
                                <div style={s.profileAvatarLg}>
                                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <p style={s.profileName}>{user?.name || 'User'}</p>
                                    <p style={s.profileEmail}>{user?.email || ''}</p>
                                    <span style={s.profileRoleBadge}>{ROLE_LABELS[user?.role || ''] || 'User'}</span>
                                </div>
                            </div>

                            <div style={s.menuDivider} />

                            <ProfileMenuItem
                                to={`/${user?.role}/profile`}
                                icon={<User size={15} />}
                                label="Profile"
                                onClick={() => setShowProfile(false)}
                            />
                            <ProfileMenuItem
                                to={`/${user?.role}/profile`}
                                icon={<Settings size={15} />}
                                label="Settings"
                                onClick={() => setShowProfile(false)}
                            />

                            <div style={s.menuDivider} />

                            <LogoutMenuItem onClick={handleLogout} />
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */
const HomeBtn: React.FC = () => {
    const [hovered, hoverProps] = useHover();
    return (
        <Link
            to="/"
            title="Back to Home"
            style={{ ...s.homeBtn, ...(hovered ? s.homeBtnHover : {}) }}
            {...hoverProps}
        >
            <Home size={17} />
        </Link>
    );
};

interface SearchResultItemProps { item: SearchSuggestion; onClick: () => void; }
const SearchResultItem: React.FC<SearchResultItemProps> = ({ item, onClick }) => {
    const [hovered, hoverProps] = useHover();
    return (
        <div
            style={{ ...s.searchResultItem, ...(hovered ? s.searchResultItemHover : {}) }}
            onClick={onClick}
            role="button"
            tabIndex={0}
            {...hoverProps}
        >
            <span style={s.searchResultIcon}>{item.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <span style={s.searchResultLabel}>{item.label}</span>
            </div>
            <span style={s.searchResultCategory}>{item.category}</span>
        </div>
    );
};

interface ProfileMenuItemProps { to: string; icon: React.ReactNode; label: string; onClick: () => void; }
const ProfileMenuItem: React.FC<ProfileMenuItemProps> = ({ to, icon, label, onClick }) => {
    const [hovered, hoverProps] = useHover();
    return (
        <Link
            to={to}
            style={{ ...s.menuItem, ...(hovered ? s.menuItemHover : {}) }}
            onClick={onClick}
            {...hoverProps}
        >
            <span style={{ color: hovered ? 'var(--primary)' : 'var(--text-muted)', transition: 'color 0.15s' }}>{icon}</span>
            {label}
        </Link>
    );
};

const LogoutMenuItem: React.FC<{ onClick: () => void }> = ({ onClick }) => {
    const [hovered, hoverProps] = useHover();
    return (
        <button
            id="topbar-logout"
            style={{ ...s.menuItemDanger, ...(hovered ? s.menuItemDangerHover : {}) }}
            onClick={onClick}
            {...hoverProps}
        >
            <LogOut size={15} />
            Sign out
        </button>
    );
};

/* ─────────────────────────────────────────────
   Styles
───────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
    bar: {
        height: 64,
        background: 'var(--card-bg)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 12,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        flexShrink: 0,
    },

    /* Hamburger */
    hamburger: {
        display: 'none', // shown via CSS .hamburger-btn on mobile
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--page-bg)',
        border: '1px solid var(--border-color)',
        cursor: 'pointer',
        color: 'var(--text-main)',
        flexShrink: 0,
        transition: 'all 0.15s',
    },

    /* Left */
    left: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flexShrink: 0 },
    homeBtn: {
        width: 34, height: 34, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', border: '1px solid var(--border-color)', background: 'var(--page-bg)',
        textDecoration: 'none', flexShrink: 0, transition: 'all 0.15s',
    },
    homeBtnHover: {
        background: 'var(--active-menu-bg)', borderColor: 'var(--primary-light)', color: 'var(--primary)',
    },
    pageTitle: {
        fontWeight: 700, fontSize: 15, color: 'var(--text-main)',
        letterSpacing: '-0.3px', whiteSpace: 'nowrap',
    },

    /* Search */
    searchWrap: {
        flex: 1,
        maxWidth: 480,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--page-bg)',
        borderRadius: 10,
        padding: '8px 14px',
        border: '1.5px solid var(--border-color)',
        transition: 'border-color 0.15s, background 0.15s',
    },
    searchWrapFocused: {
        background: 'var(--card-bg)',
        borderColor: 'var(--primary)',
        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.15)',
    },
    searchInput: {
        flex: 1, background: 'none', border: 'none', outline: 'none',
        fontSize: 13.5, fontWeight: 500, color: 'var(--text-main)',
        fontFamily: "'Inter', sans-serif", minWidth: 0,
    },
    clearBtn: {
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 2,
        borderRadius: 4, transition: 'color 0.1s', flexShrink: 0,
    },

    /* Search dropdown */
    searchDropdown: {
        position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
        background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-color)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.12)', zIndex: 300, overflow: 'hidden',
    },
    searchDropdownHeader: {
        padding: '10px 14px 6px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
        letterSpacing: '0.06em', textTransform: 'uppercase',
    },
    searchResultItem: {
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
        cursor: 'pointer', transition: 'background 0.12s',
    },
    searchResultItemHover: { background: 'var(--active-menu-bg)' },
    searchResultIcon: { fontSize: 18, flexShrink: 0, width: 28, textAlign: 'center' },
    searchResultLabel: { fontSize: 13.5, fontWeight: 500, color: 'var(--text-main)' },
    searchResultCategory: {
        fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
        background: 'var(--border-color)', borderRadius: 99, padding: '2px 8px', flexShrink: 0,
    },
    searchNoResult: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '24px 16px', color: 'var(--text-muted)', fontSize: 13.5, fontWeight: 500,
    },

    /* Right */
    right: { display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexShrink: 0 },

    /* Profile button */
    profileBtn: {
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--page-bg)', border: '1px solid var(--border-color)', borderRadius: 10,
        padding: '5px 10px 5px 5px', cursor: 'pointer', transition: 'all 0.15s',
    },
    avatar: {
        width: 30, height: 30, borderRadius: 8,
        background: 'linear-gradient(135deg, #3b82f6, var(--primary))', color: 'var(--card-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 13, flexShrink: 0,
    },
    userInfo: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 },
    userName: { fontWeight: 700, fontSize: 12.5, color: 'var(--text-main)' },
    userRole: { fontWeight: 500, fontSize: 11, color: 'var(--text-muted)' },

    /* Profile dropdown */
    profileDropdown: {
        position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 228,
        background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-color)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden',
    },
    profileHeader: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px 12px' },
    profileAvatarLg: {
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg, #3b82f6, var(--primary))', color: 'var(--card-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 17,
    },
    profileName: { margin: '0 0 1px', fontSize: 13, fontWeight: 700, color: 'var(--text-main)' },
    profileEmail: {
        margin: '0 0 5px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140,
    },
    profileRoleBadge: {
        background: 'var(--active-menu-bg)', color: 'var(--primary)', borderRadius: 99,
        padding: '1px 8px', fontSize: 10, fontWeight: 700,
    },
    menuDivider: { height: 1, background: 'var(--border-color)' },
    menuItem: {
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
        fontSize: 13, fontWeight: 600, color: 'var(--text-main)', textDecoration: 'none',
        transition: 'background 0.15s', cursor: 'pointer',
    },
    menuItemHover: { background: 'var(--active-menu-bg)', color: 'var(--primary)' },
    menuItemDanger: {
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', width: '100%',
        fontSize: 13, fontWeight: 600, color: '#ef4444', background: 'none', border: 'none',
        cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
    },
    menuItemDangerHover: { background: 'rgba(239, 68, 68, 0.12)' },
};

export default TopBar;
