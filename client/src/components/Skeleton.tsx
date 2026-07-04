import React from 'react';

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    borderRadius?: string | number;
    className?: string;
    style?: React.CSSProperties;
    animated?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = '20px',
    borderRadius = '4px',
    className = '',
    style = {},
    animated = true,
}) => {
    return (
        <div
            className={`skeleton ${animated ? 'skeleton-animated' : ''} ${className}`}
            style={{
                width,
                height,
                borderRadius,
                background: 'var(--border-color)', // Fallback, animated will use gradient
                ...style,
            }}
        />
    );
};

// Add styles globally if they don't exist
if (typeof document !== 'undefined' && !document.getElementById('skeleton-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'skeleton-styles';
    styleEl.innerHTML = `
        @keyframes shimmer {
            0% {
                background-position: -1000px 0;
            }
            100% {
                background-position: 1000px 0;
            }
        }
        .skeleton-animated {
            animation: shimmer 2s infinite linear;
            background: linear-gradient(to right, var(--border-color) 4%, var(--page-bg) 25%, var(--border-color) 36%);
            background-size: 1000px 100%;
        }
        html.dark .skeleton-animated {
            background: linear-gradient(to right, #374151 4%, #4b5563 25%, #374151 36%);
            background-size: 1000px 100%;
        }
    `;
    document.head.appendChild(styleEl);
}

export default Skeleton;
