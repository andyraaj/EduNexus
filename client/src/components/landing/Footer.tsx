import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
    return (
        <footer id="contact" className="lp-footer">
            <div className="lp-footer-inner">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <img src="/favicon.png?v=2" alt="EduNexus Logo" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                        <span className="lp-footer-brand" style={{ margin: 0 }}>EduNexus ERP</span>
                    </div>
                    <p className="lp-footer-tagline">
                        A modern, secure, and lightning-fast enterprise resource planning platform engineered specifically for scalable academic institutions.
                    </p>
                </div>
                <div className="lp-footer-col">
                    <h4>Platform</h4>
                    <ul>
                        <li><a href="#features">Features</a></li>
                        <li><a href="#roles">Portals</a></li>
                        <li><a href="#process">Workflow</a></li>
                        <li><Link to="/login">Sign In</Link></li>
                    </ul>
                </div>
                <div className="lp-footer-col">
                    <h4>Legal</h4>
                    <ul>
                        <li><a href="#">Privacy Policy</a></li>
                        <li><a href="#">Terms of Service</a></li>
                        <li><a href="#">Security</a></li>
                    </ul>
                </div>
            </div>
            <div className="lp-footer-bottom">
                <span>&copy; {new Date().getFullYear()} EduNexus Inc. All rights reserved.</span>
                <span className="lp-footer-bottom-badge">✦ Production Grade</span>
            </div>
        </footer>
    );
};

export default Footer;
