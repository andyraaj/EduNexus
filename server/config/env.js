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

const getAllowedOrigins = () => {
    const raw = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    const origins = raw.split(',').map((origin) => origin.trim()).filter(Boolean);
    if (process.env.NODE_ENV !== 'production') {
        // Add common dev variations
        if (origins.includes('http://localhost:5173') && !origins.includes('http://127.0.0.1:5173')) {
            origins.push('http://127.0.0.1:5173');
        }
        // Support both Vite dev ports (5173 and 5174)
        if (!origins.includes('http://localhost:5174')) {
            origins.push('http://localhost:5174');
        }
        if (!origins.includes('http://127.0.0.1:5174')) {
            origins.push('http://127.0.0.1:5174');
        }
    }
    return origins;
};

module.exports = { validateEnv, getAllowedOrigins };
