import React, { useEffect, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Home, LogOut, X } from 'lucide-react';

export interface SidebarNavItem {
    icon: React.ElementType;
    label: string;
    path: string;
}

interface SidebarProps {
    navItems: SidebarNavItem[];
    roleTag: string;
    isOpen: boolean;
    onClose: () => void;
    onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ navItems, roleTag, isOpen, onClose, onLogout }) => {
    const location = useLocation();
    const sidebarRef = useRef<HTMLElement>(null);

    /* Close sidebar on route change (mobile) */
    useEffect(() => {
        onClose();
    }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

    /* Close on ESC key */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    /* Lock body scroll when mobile drawer is open */
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const sidebarContent = (
        <>
            {/* Brand */}
            <div style={s.brand}>
                <div style={s.brandTop}>
                    <Link to="/" style={s.logoLink} onClick={onClose}>
                        <img src="/favicon.png?v=2" alt="EduNexus Logo" style={s.logoIcon} />
                        <h2 style={s.logoText}>EduNexus</h2>
                    </Link>
                    {/* Close button – only visible on mobile */}
                    <button
                        className="sidebar-close-btn"
                        style={s.closeBtn}
                        onClick={onClose}
                        aria-label="Close navigation"
                    >
                        <X size={18} />
                    </button>
                </div>
                <span style={s.roleTag}>{roleTag}</span>
            </div>

            {/* Navigation */}
            <nav style={s.nav}>
                {navItems.map((item, idx) => (
                    <NavLink
                        key={idx}
                        to={item.path}
                        style={({ isActive }) => ({
                            ...s.navLink,
                            ...(isActive ? s.navLinkActive : {}),
                        })}
                    >
                        <item.icon size={17} style={{ flexShrink: 0 }} />
                        <span style={s.navLabel}>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div style={s.footer}>
                <Link to="/" style={s.footerLink} onClick={onClose}>
                    <Home size={15} style={{ flexShrink: 0 }} />
                    <span>Back to Home</span>
                </Link>
                <button onClick={onLogout} style={s.logoutBtn}>
                    <LogOut size={15} style={{ flexShrink: 0 }} />
                    <span>Logout</span>
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* ── Desktop sidebar (always visible on lg+) ─────────────────── */}
            <aside className="sidebar-desktop" style={s.desktopSidebar}>
                {sidebarContent}
            </aside>

            {/* ── Mobile: Backdrop + Drawer ──────────────────────────────── */}
            {/* Backdrop */}
            <div
                className="sidebar-backdrop"
                style={{
                    ...s.backdrop,
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? 'all' : 'none',
                }}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer */}
            <aside
                ref={sidebarRef}
                className="sidebar-mobile"
                style={{
                    ...s.mobileSidebar,
                    transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
                }}
                aria-label="Navigation drawer"
            >
                {sidebarContent}
            </aside>
        </>
    );
};

const s: Record<string, React.CSSProperties> = {
    /* ── Desktop sidebar ── */
    desktopSidebar: {
        width: 260,
        minWidth: 260,
        background: 'var(--card-bg)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
        flexShrink: 0,
    },

    /* ── Mobile backdrop ── */
    backdrop: {
        display: 'none', // overridden by CSS media query
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(2px)',
        zIndex: 998,
        transition: 'opacity 0.25s ease',
    },

    /* ── Mobile drawer ── */
    mobileSidebar: {
        display: 'none', // overridden by CSS media query
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: 280,
        maxWidth: '85vw',
        background: 'var(--card-bg)',
        borderRight: '1px solid var(--border-color)',
        flexDirection: 'column',
        zIndex: 999,
        overflowY: 'auto',
        boxShadow: '8px 0 32px rgba(0,0,0,0.15)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'transform',
    },

    /* ── Shared brand area ── */
    brand: {
        padding: '20px 16px 16px',
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
    },
    brandTop: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    logoLink: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        textDecoration: 'none',
        minWidth: 0,
    },
    logoIcon: { width: 30, height: 30, objectFit: 'contain', flexShrink: 0 },
    logoText: {
        margin: 0,
        fontSize: 19,
        fontWeight: 800,
        color: 'var(--text-main)',
        letterSpacing: '-0.5px',
        whiteSpace: 'nowrap',
    },
    closeBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        borderRadius: 8,
        border: '1px solid var(--border-color)',
        background: 'var(--page-bg)',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 0.15s',
    },
    roleTag: {
        display: 'inline-block',
        marginTop: 6,
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
    },

    /* ── Nav ── */
    nav: {
        flex: 1,
        padding: '12px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflowY: 'auto',
    },
    navLink: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 10,
        color: 'var(--text-muted)',
        textDecoration: 'none',
        fontWeight: 500,
        fontSize: 13.5,
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
        minWidth: 0,
    },
    navLinkActive: {
        background: 'var(--active-menu-bg)',
        color: 'var(--primary)',
        fontWeight: 600,
    },
    navLabel: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minWidth: 0,
        flex: 1,
    },

    /* ── Footer ── */
    footer: {
        padding: '12px 10px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        flexShrink: 0,
    },
    footerLink: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 10,
        color: 'var(--text-muted)',
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: 500,
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
    },
    logoutBtn: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 10,
        background: 'transparent',
        border: 'none',
        color: '#ef4444',
        fontWeight: 600,
        fontSize: 13,
        cursor: 'pointer',
        transition: 'background 0.15s',
        whiteSpace: 'nowrap',
        textAlign: 'left',
    },
};

export default Sidebar;
