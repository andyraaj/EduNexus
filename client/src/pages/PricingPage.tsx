import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import './landing.css';

const PLANS = [
    {
        name: 'Starter',
        price: 'Free',
        period: '',
        description: 'Perfect for small institutions just getting started.',
        color: 'var(--text-muted)',
        features: [
            'Up to 100 students',
            '5 faculty members',
            'Basic course management',
            'Attendance tracking',
            'Email support',
        ],
        cta: 'Get Started Free',
        ctaStyle: { background:'var(--card-bg)', color: 'var(--text-main)', border: '1.5px solid #e5e7eb' },
        highlight: false,
    },
    {
        name: 'Institution',
        price: '$299',
        period: '/ month',
        description: 'Built for mid-sized colleges that need the full ERP suite.',
        color: 'var(--primary)',
        features: [
            'Up to 2,000 students',
            'Unlimited faculty',
            'Full quiz & assignment engine',
            'Advanced analytics dashboard',
            'Real-time messaging',
            'Fee & finance management',
            'Priority support',
        ],
        cta: 'Start 14-Day Trial',
        ctaStyle: { background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color:'var(--card-bg)', border: 'none', boxShadow: '0 4px 20px rgba(var(--primary-rgb),0.4)' },
        highlight: true,
    },
    {
        name: 'Enterprise',
        price: 'Custom',
        period: '',
        description: 'For large universities requiring scale, compliance & SLA.',
        color: 'var(--text-main)',
        features: [
            'Unlimited students',
            'Unlimited faculty & admins',
            'Custom integrations & API',
            'SSO / Active Directory',
            'Dedicated SLA & uptime guarantee',
            'On-premise deployment option',
            '24/7 dedicated support',
        ],
        cta: 'Contact Sales',
        ctaStyle: { background: '#0f172a', color:'var(--card-bg)', border: 'none' },
        highlight: false,
    },
];

const FAQS = [
    { q: 'Is there a free trial?', a: 'Yes. The Institution plan includes a 14-day full-access trial with no credit card required.' },
    { q: 'Can I upgrade or downgrade?', a: 'Absolutely. You can change plans at any time and billing is prorated automatically.' },
    { q: 'What payment methods do you accept?', a: 'We accept all major credit cards, bank transfers, and institutional purchase orders.' },
    { q: 'Is student data secure?', a: 'All data is encrypted at rest and in transit. We are SOC 2 Type II compliant and FERPA-ready.' },
];

const PricingPage: React.FC = () => {
    return (
        <div className="lp-root">
            <Navbar />

            {/* Header */}
            <section style={{ background: 'linear-gradient(135deg, #f8faff 0%, #fff 50%, #f1f0ff 100%)', paddingTop: '11rem', paddingBottom: '5rem', paddingLeft: '1.5rem', paddingRight: '1.5rem', textAlign: 'center' }}>
                <div style={{ maxWidth: 640, margin: '0 auto' }}>
                    <span className="lp-section-label">Pricing</span>
                    <h1 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-2px', color: 'var(--text-main)', margin: '1rem 0 1.25rem', lineHeight: 1.1 }}>
                        Simple, transparent <br />
                        <span style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>pricing for every campus</span>
                    </h1>
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.7, margin: 0 }}>
                        No hidden fees. No per-seat surprises. Pick the plan that fits your institution and scale when you're ready.
                    </p>
                </div>
            </section>

            {/* Plans */}
            <section style={{ padding: '4rem 1.5rem 6rem', background: 'var(--page-bg)' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                    {PLANS.map(plan => (
                        <div
                            key={plan.name}
                            style={{
                                background:'var(--card-bg)',
                                borderRadius: 24,
                                border: plan.highlight ? `2px solid ${plan.color}` : '1px solid #f3f4f6',
                                padding: '2.5rem',
                                boxShadow: plan.highlight ? '0 20px 60px rgba(var(--primary-rgb),0.15)' : '0 4px 20px rgba(0,0,0,0.04)',
                                position: 'relative',
                            }}
                        >
                            {plan.highlight && (
                                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color:'var(--card-bg)', fontSize: 11, fontWeight: 800, padding: '4px 16px', borderRadius: 999, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                    Most Popular
                                </div>
                            )}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: plan.color, margin: '0 0 0.5rem', letterSpacing: '-0.3px' }}>{plan.name}</h2>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: '0.75rem' }}>
                                    <span style={{ fontSize: '2.75rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-1.5px' }}>{plan.price}</span>
                                    {plan.period && <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>{plan.period}</span>}
                                </div>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>{plan.description}</p>
                            </div>

                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {plan.features.map(f => (
                                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>
                                        <span style={{ color: plan.highlight ? plan.color : '#10b981', fontSize: 16, flexShrink: 0 }}>✓</span>
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            <Link
                                to="/login"
                                style={{
                                    display: 'block', textAlign: 'center', padding: '0.875rem', borderRadius: 12,
                                    fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none',
                                    transition: 'all 0.2s', ...plan.ctaStyle,
                                }}
                            >
                                {plan.cta} →
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            {/* FAQ */}
            <section style={{ padding: '5rem 1.5rem 7rem', background:'var(--card-bg)', borderTop: '1px solid #f3f4f6' }}>
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <span className="lp-section-label">FAQ</span>
                        <h2 style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-1.5px', color: 'var(--text-main)', margin: '1rem 0 0' }}>Frequently asked questions</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {FAQS.map(faq => (
                            <div key={faq.q} style={{ background: 'var(--page-bg)', border: '1px solid #f3f4f6', borderRadius: 16, padding: '1.5rem 2rem' }}>
                                <h4 style={{ margin: '0 0 0.6rem', fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>{faq.q}</h4>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.7, fontWeight: 500 }}>{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="lp-cta">
                <div className="lp-cta-inner">
                    <h2>Ready to get started?</h2>
                    <p className="lp-cta-sub">Join institutions that have modernized their campus with EduNexus ERP.</p>
                    <Link to="/login" className="lp-btn-light">Enter the Platform →</Link>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default PricingPage;
