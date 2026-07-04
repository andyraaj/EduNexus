const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const logAuthError = (stage, err, meta = {}) => {
    const details = {
        stage,
        code: err?.code || err?.name || 'UNKNOWN',
        message: err?.message || String(err),
        ...meta,
    };
    console.error('[AUTH]', details);
};

// ── Token Generators ─────────────────────────────────────────────────────────

/**
 * Generates a short-lived JWT access token (15 minutes).
 * Payload contains user ID and role for fast RBAC middleware checks.
 */
const generateAccessToken = (userId, role) => {
    if (!process.env.JWT_SECRET) {
        const error = new Error('JWT secret is not configured.');
        error.code = 'JWT_SECRET_MISSING';
        logAuthError('generateAccessToken', error, { userId, role });
        throw error;
    }

    return jwt.sign(
        { id: userId, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
    );
};

/**
 * Generates a cryptographically random opaque refresh token (7 days).
 * The token itself is a random string; only its SHA-256 hash is stored in DB.
 */
const generateRefreshToken = () => {
    return crypto.randomBytes(40).toString('hex');
};

// ── Core Auth Service Functions ──────────────────────────────────────────────

/**
 * Verify user credentials by email + password + role.
 * Returns the full user object on success, null on failure.
 */
const verifyUserCredentials = async (email, password, role) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    try {
        // Explicitly select 'password' since it is select:false by default
        const user = await User.findOne({ email: normalizedEmail, isActive: true }).select('+password');

        if (!user) return null;

        // Validate role matches
        if (user.role !== role) return null;

        // Compare entered password against bcrypt hash
        const isMatch = await user.matchPassword(password);
        if (!isMatch) return null;

        return user;
    } catch (err) {
        logAuthError('verifyUserCredentials', err, { email: normalizedEmail, role });
        const error = new Error('Database query failed while verifying credentials.');
        error.code = 'AUTH_QUERY_FAILED';
        error.cause = err;
        throw error;
    }
};

/**
 * Stores a hashed version of the refresh token inside the User document.
 * Using a hash means a stolen DB dump cannot be used to forge sessions.
 */
const saveRefreshToken = async (userId, plainToken) => {
    try {
        const hash = await bcrypt.hash(plainToken, 8);
        await User.findByIdAndUpdate(userId, { refreshTokenHash: hash, lastLogin: new Date() });
    } catch (err) {
        logAuthError('saveRefreshToken', err, { userId });
        const error = new Error('Database update failed while saving refresh token.');
        error.code = 'AUTH_REFRESH_SAVE_FAILED';
        error.cause = err;
        throw error;
    }
};

/**
 * Validates an incoming plain refresh token against the stored hash.
 * Returns the user document if valid, null otherwise.
 */
const validateRefreshToken = async (userId, plainToken) => {
    try {
        const user = await User.findById(userId).select('+refreshTokenHash');
        if (!user || !user.refreshTokenHash) return null;

        const isValid = await bcrypt.compare(plainToken, user.refreshTokenHash);
        return isValid ? user : null;
    } catch (err) {
        logAuthError('validateRefreshToken', err, { userId });
        const error = new Error('Database query failed while validating refresh token.');
        error.code = 'AUTH_REFRESH_VALIDATE_FAILED';
        error.cause = err;
        throw error;
    }
};

/**
 * Clears the refresh token hash from the DB (logout / token rotation).
 */
const revokeRefreshToken = async (userId) => {
    try {
        await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
    } catch (err) {
        logAuthError('revokeRefreshToken', err, { userId });
        const error = new Error('Database update failed while revoking refresh token.');
        error.code = 'AUTH_REFRESH_REVOKE_FAILED';
        error.cause = err;
        throw error;
    }
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyUserCredentials,
    saveRefreshToken,
    validateRefreshToken,
    revokeRefreshToken,
};
