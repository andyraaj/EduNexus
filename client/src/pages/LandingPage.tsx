import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import FeatureCard from '../components/landing/FeatureCard';
import Footer from '../components/landing/Footer';
import './landing.css';

const FEATURES = [
    { icon: '✅', title: 'Attendance Tracking', description: 'Take attendance instantly. Track absences, alert students, and manage institutional compliance automatically.' },
    { icon: '📚', title: 'Course Enrollment', description: 'Let students discover and enroll in courses seamlessly. Set enrollment caps, prerequisites, and automated waitlists.' },
    { icon: '📋', title: 'Assessments & Grades', description: 'Publish assignments, manage digital submissions, and evaluate performance efficiently on the cloud.' },
    { icon: '🧠', title: 'Quiz Engine', description: 'Conduct timed quizzes and exams with automatic grading. Monitor student attempts and identify performance trends.' },
    { icon: '💬', title: 'Real-time Messaging', description: 'Built-in, secure chat connecting students, professors, and administrative staff in real-time.' },
    { icon: '📊', title: 'Admin Analytics', description: 'Oversee your institution with comprehensive dashboards covering finance, enrollment, and global activity.' },
];

const STEPS = [
    { step: 1, title: 'Identity Verification', desc: 'Secure, token-based authentication precisely routes you to your tailored portal.' },
    { step: 2, title: 'Live Dashboard', desc: 'Get an immediate overview of your pending tasks, notifications, and academic agenda.' },
    { step: 3, title: 'Take Action', desc: 'Manage courses, submit work, grade assignments, or track attendance — instantly.' },
    { step: 4, title: 'Track Insights', desc: 'Monitor academic progress or institution health dynamically in real-time.' },
];

const LandingPage: React.FC = () => {
    useEffect(() => {
        document.documentElement.style.scrollBehavior = 'smooth';
        return () => { document.documentElement.style.scrollBehavior = ''; };
    }, []);

    return (
        <div className="lp-root">
            <Navbar />
            <Hero />

            {/* ── TRUST / STATS BAR ── */}
            <section className="lp-stats">
                <div className="lp-stats-inner">
                    <div className="lp-stat-item">
                        <span className="lp-stat-number">10,000+</span>
                        <span className="lp-stat-label-text">Students Managed</span>
                    </div>
                    <div className="lp-stat-divider"></div>
                    <div className="lp-stat-item">
                        <span className="lp-stat-number">50+</span>
                        <span className="lp-stat-label-text">Active Faculty</span>
                    </div>
                    <div className="lp-stat-divider"></div>
                    <div className="lp-stat-item">
                        <span className="lp-stat-number" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '1.75rem' }}>⚡</span> Real-time
                        </span>
                        <span className="lp-stat-label-text">Analytics & Data</span>
                    </div>
                </div>
            </section>

            {/* ── FEATURES ── */}
            <section id="features" className="lp-features">
                <div className="lp-section-inner">
                    <div className="lp-section-head">
                        <span className="lp-section-label">Platform Features</span>
                        <h2 className="lp-section-title">Everything you need to<br />run your campus</h2>
                        <p className="lp-section-sub">Powerful, tailored modules built specifically for higher education — designed to eliminate paperwork and streamline operations.</p>
                    </div>
                    <div className="lp-features-grid">
                        {FEATURES.map(f => (
                            <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.description} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="process" className="lp-process">
                <div className="lp-section-inner">
                    <div className="lp-section-head">
                        <span className="lp-section-label">Workflow</span>
                        <h2 className="lp-section-title">A radically simple workflow</h2>
                        <p className="lp-section-sub">Getting started is completely frictionless. Four steps to complete academic management.</p>
                    </div>
                    <div className="lp-process-steps">
                        {STEPS.map(s => (
                            <div key={s.step} className="lp-step">
                                <div className="lp-step-num">{s.step}</div>
                                <h4 className="lp-step-title">{s.title}</h4>
                                <p className="lp-step-desc">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── ROLE-BASED PORTALS ── */}
            <section id="roles" className="lp-roles">
                <div className="lp-section-inner">
                    <div className="lp-section-head">
                        <span className="lp-section-label" style={{ color: 'var(--primary-light)' }}>Role-Based Portals</span>
                        <h2 className="lp-section-title lp-roles-title">Tailored for every academic role</h2>
                        <p className="lp-section-sub lp-roles-sub">Different responsibilities demand different native workflows. We engineered EduNexus to deliver the ideal workspace for everyone.</p>
                    </div>
                    <div className="lp-roles-grid">
                        <div className="lp-role-card">
                            <div className="lp-role-icon">🎓</div>
                            <h3 className="lp-role-title">Student Portal</h3>
                            <p className="lp-role-desc">View academic standing, submit assignments, track daily attendance, and pay institutional fees — all from one unified interface.</p>
                            <Link to="/login" className="lp-role-link">Access Portal →</Link>
                        </div>
                        <div className="lp-role-card">
                            <div className="lp-role-icon">🏫</div>
                            <h3 className="lp-role-title">Faculty Workspace</h3>
                            <p className="lp-role-desc">Design course materials, log rapid attendance, grade quizzes digitally, and communicate directly with enrolled students.</p>
                            <Link to="/login" className="lp-role-link">Access Portal →</Link>
                        </div>
                        <div className="lp-role-card">
                            <div className="lp-role-icon">⚙️</div>
                            <h3 className="lp-role-title">Admin Console</h3>
                            <p className="lp-role-desc">Manage network users, provision courses, track financial billing statuses, and broadcast global campus announcements.</p>
                            <Link to="/login" className="lp-role-link">Access Console →</Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="lp-cta">
                <div className="lp-cta-inner">
                    <h2>Ready to transform your campus?</h2>
                    <p className="lp-cta-sub">Join forward-thinking universities running their administration effortlessly with EduNexus ERP.</p>
                    <div className="lp-cta-actions">
                        <Link to="/admissions/apply" className="lp-btn-light">Apply for Admission</Link>
                        <Link to="/login" className="lp-btn-ghost">Enter the Platform</Link>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default LandingPage;
