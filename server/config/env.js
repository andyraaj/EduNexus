/**
 * env.js
 * Validates required environment variables at startup.
 * Throws in production if critical vars are missing; warns in development.
 */

const REQUIRED_PRODUCTION = [
    'MONGO_URI',
    'JWT_SECRET',
    'CLIENT_ORIGIN',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
];

const validateEnv = () => {
    const missing = REQUIRED_PRODUCTION.filter((key) => !process.env[key]);

    if (process.env.NODE_ENV === 'production' && missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Warn in development for important vars
    if (missing.length > 0) {
        console.warn(`[CONFIG] Warning — missing env vars: ${missing.join(', ')}`);
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) {
        console.warn('[CONFIG] JWT_SECRET is missing or too short. Use a long random value before deployment.');
    }

    // Validate Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('[CONFIG] Cloudinary credentials are required in production.');
        }
        console.warn('[CONFIG] Cloudinary credentials missing — file uploads will fail.');
    }
};

const normalizeOrigin = (value) => {
    if (!value) return '';
    return String(value).trim().replace(/\/$/, '');
};

const parseOrigins = (...values) => {
    return values
        .flatMap((value) => String(value || '').split(','))
        .map((value) => normalizeOrigin(value))
        .filter(Boolean);
};

const getAllowedOrigins = () => {
    const origins = Array.from(new Set(parseOrigins(
        'http://localhost:5173',
        'http://localhost:5174',
        process.env.CLIENT_ORIGIN,
        process.env.RENDER_EXTERNAL_URL,
        process.env.VERCEL_FRONTEND_URL,
        'https://EduNexus-d6jk.onrender.com'
    )));

    return origins;
};

/**
 * Get Vercel project name for dynamic preview URL matching.
 * Extracts base name from URLs like "https://edu-nexus-client-abc123xyz-team.vercel.app"
 */
const getVercelProjectName = () => {
    const url = process.env.VERCEL_FRONTEND_URL || process.env.CLIENT_ORIGIN || '';
    const match = url.match(/https?:\/\/([^.]+)\.vercel\.app/);
    return match ? match[1].replace(/-[a-z0-9]{8,}$/, '') : null; // strip hash suffix if present
};

/**
 * Check if an origin should be allowed, including Vercel preview URLs.
 */
const isAllowedOrigin = (origin) => {
    const normalized = normalizeOrigin(origin);
    const allowedOrigins = getAllowedOrigins();

    // 1. Exact match
    if (allowedOrigins.includes(normalized)) return true;

    // 2. Allow any Vercel preview URL for this project
    // Vercel preview URLs look like: https://edu-nexus-client-abc123xyz-team.vercel.app
    if (normalized.endsWith('.vercel.app')) {
        const vercelProjectName = getVercelProjectName();
        if (vercelProjectName) {
            const hostname = normalized.replace(/^https?:\/\//, '');
            if (hostname.startsWith(vercelProjectName)) return true;
        }
    }

    return false;
};

module.exports = { validateEnv, getAllowedOrigins, isAllowedOrigin, getVercelProjectName };
