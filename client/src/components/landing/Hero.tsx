import React from 'react';
import { Link } from 'react-router-dom';

const Hero: React.FC = () => {
    return (
        <section className="lp-hero">
            <div className="lp-hero-inner">
                {/* Left: Copy */}
                <div>
                    <div className="lp-hero-badge">
                        <span className="lp-hero-badge-dot"></span>
                        Now in Production
                    </div>
                    <h1>
                        Smart Campus ERP<br />
                        <span>for Modern Universities</span>
                    </h1>
                    <p className="lp-hero-sub">
                        Unify your entire educational ecosystem. From intelligent attendance tracking to real-time analytics, EduNexus empowers students, faculty, and administrators in one beautifully designed platform.
                    </p>
                    <div className="lp-hero-btns">
                        <Link to="/login" className="lp-btn-primary">Get Started →</Link>
                        <a href="#features" className="lp-btn-secondary">Explore Features ↓</a>
                    </div>
                </div>

                {/* Right: Dashboard Mockup */}
                <div className="lp-mockup">
                    <div className="lp-mockup-wrapper">
                        <div className="lp-mockup-chrome">
                            <div className="lp-dot lp-dot-r"></div>
                            <div className="lp-dot lp-dot-y"></div>
                            <div className="lp-dot lp-dot-g"></div>
                            <div className="lp-chrome-url">EduNexus-app.com/admin/dashboard</div>
                        </div>
                        <div className="lp-mockup-body">
                            <div className="lp-sidebar">
                                <div className="lp-sidebar-item" style={{ width: '80%' }}></div>
                                <div style={{ height: '1.5rem' }}></div>
                                <div className="lp-sidebar-item active"></div>
                                <div className="lp-sidebar-item" style={{ width: '90%' }}></div>
                                <div className="lp-sidebar-item" style={{ width: '75%' }}></div>
                                <div className="lp-sidebar-item" style={{ width: '85%' }}></div>
                                <div className="lp-sidebar-item" style={{ width: '70%' }}></div>
                            </div>
                            <div className="lp-content-area">
                                <div className="lp-content-header">
                                    <div className="lp-content-title"></div>
                                    <div className="lp-avatar"></div>
                                </div>
                                <div className="lp-cards-row">
                                    <div className="lp-stat-card">
                                        <div className="lp-stat-label"></div>
                                        <div className="lp-stat-value"></div>
                                    </div>
                                    <div className="lp-stat-card">
                                        <div className="lp-stat-label" style={{ width: '65px' }}></div>
                                        <div className="lp-stat-value" style={{ width: '55px' }}></div>
                                    </div>
                                </div>
                                <div className="lp-chart-area">
                                    <div className="lp-chart-header">
                                        <div className="lp-chart-title"></div>
                                        <div className="lp-chart-legend"></div>
                                    </div>
                                    <div className="lp-bars">
                                        <div className="lp-bar" style={{ height: '35%' }}></div>
                                        <div className="lp-bar" style={{ height: '55%' }}></div>
                                        <div className="lp-bar" style={{ height: '45%' }}></div>
                                        <div className="lp-bar" style={{ height: '80%' }}></div>
                                        <div className="lp-bar" style={{ height: '60%' }}></div>
                                        <div className="lp-bar" style={{ height: '95%' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
