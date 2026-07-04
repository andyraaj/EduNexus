import React from 'react';

interface FeatureCardProps {
    title: string;
    description: string;
    icon: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon }) => {
    return (
        <div className="lp-feature-card">
            <div className="lp-feature-icon">{icon}</div>
            <h3 className="lp-feature-title">{title}</h3>
            <p className="lp-feature-desc">{description}</p>
        </div>
    );
};

export default FeatureCard;
