import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../ThemeToggle';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
    { label: 'Features', href: '#features' },
    { label: 'Solutions', href: '#roles' },
    { label: 'Pricing', to: '/pricing' },
    { label: 'About', href: '#process' },
    { label: 'Contact', href: '#contact' },
];

const Navbar: React.FC = () => {
    const [showSolutions, setShowSolutions] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    /* Shadow on scroll */
    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 12);
        window.addEventListener('scroll', handler, { passive: true });
        return () => window.removeEventListener('scroll', handler);
    }, []);

    /* Close mobile menu on outside click */
    useEffect(() => {
        if (!mobileOpen) return;
        const handler = (e: MouseEvent) => {
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
                setMobileOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [mobileOpen]);

    /* Lock scroll when mobile menu is open */
    useEffect(() => {
        document.body.style.overflow = mobileOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    const closeMobile = () => setMobileOpen(false);

    return (
        <nav className={`lp-nav${scrolled ? ' lp-nav-scrolled' : ''}`}>
            <div className="lp-nav-inner">
                {/* ── Logo ── */}
                <Link to="/" className="lp-logo" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <img src="/favicon.png?v=2" alt="EduNexus Logo" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                    <span>EduNexus</span>
                </Link>

                {/* ── Desktop nav links ── */}
                <ul className="lp-nav-links">
                    <li><a href="#features">Features</a></li>
                    <li
                        style={{ position: 'relative' }}
                        onMouseEnter={() => setShowSolutions(true)}
                        onMouseLeave={() => setShowSolutions(false)}
                    >
                        <a href="#roles" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            Solutions <span style={{ fontSize: 10 }}>▼</span>
                        </a>
                        {showSolutions && (
                            <div style={dropdownStyle}>
                                <a href="#roles" style={dropItemStyle}>🎓 Student Portal</a>
                                <a href="#roles" style={dropItemStyle}>🏫 Faculty Portal</a>
                                <a href="#roles" style={dropItemStyle}>⚙️ Admin Console</a>
                            </div>
                        )}
                    </li>
                    <li><Link to="/pricing" style={{ color: 'inherit', textDecoration: 'none', fontSize: 'inherit', fontWeight: 'inherit' }}>Pricing</Link></li>
                    <li><a href="#process">About</a></li>
                    <li><a href="#contact">Contact</a></li>
                </ul>

                {/* ── Desktop right actions ── */}
                <div className="lp-nav-right">
                    <ThemeToggle />
                    <Link to="/login" className="lp-btn-secondary lp-nav-login">Login</Link>
                    <Link to="/login" className="lp-btn-primary lp-nav-cta-btn">Get Started →</Link>
                </div>

                {/* ── Mobile: Theme + Hamburger ── */}
                <div className="lp-nav-mobile-actions">
                    <ThemeToggle />
                    <button
                        className="lp-hamburger"
                        onClick={() => setMobileOpen(v => !v)}
                        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={mobileOpen}
                    >
                        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {/* ── Mobile drawer ── */}
            {mobileOpen && (
                <>
                    {/* Backdrop */}
                    <div className="lp-mobile-backdrop" onClick={closeMobile} aria-hidden="true" />

                    {/* Menu panel */}
                    <div className="lp-mobile-menu" ref={mobileMenuRef}>
                        <ul className="lp-mobile-links">
                            {NAV_LINKS.map(link => (
                                <li key={link.label}>
                                    {link.to ? (
                                        <Link to={link.to} className="lp-mobile-link" onClick={closeMobile}>{link.label}</Link>
                                    ) : (
                                        <a href={link.href} className="lp-mobile-link" onClick={closeMobile}>{link.label}</a>
                                    )}
                                </li>
                            ))}
                        </ul>
                        <div className="lp-mobile-cta">
                            <Link to="/login" className="lp-btn-secondary" onClick={closeMobile} style={{ textAlign: 'center' }}>
                                Login
                            </Link>
                            <Link to="/login" className="lp-btn-primary" onClick={closeMobile} style={{ textAlign: 'center' }}>
                                Get Started →
                            </Link>
                        </div>
                    </div>
                </>
            )}
        </nav>
    );
};

const dropdownStyle: React.CSSProperties = {
    position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
    background: 'var(--card-bg)', borderRadius: 14, border: '1px solid #e5e7eb',
    boxShadow: '0 16px 40px rgba(0,0,0,0.1)', padding: 8, minWidth: 200, zIndex: 100,
    display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8,
};

const dropItemStyle: React.CSSProperties = {
    display: 'block', padding: '10px 14px', borderRadius: 8, fontSize: 13.5,
    fontWeight: 600, color: 'var(--text-main)', textDecoration: 'none', transition: 'background 0.15s',
};

export default Navbar;
