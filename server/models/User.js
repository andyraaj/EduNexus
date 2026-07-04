const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false, // SECURITY: never returned in queries by default
        },
        role: {
            type: String,
            enum: ['student', 'faculty', 'admin'],
            required: [true, 'Role is required'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastLogin: {
            type: Date,
            default: null,
        },
        // Profile Personalization Fields
        bio: { type: String, default: '' },
        pronouns: { type: String, default: 'He/Him' },
        skills: { type: [String], default: ['Systems Architecture', 'Node.js', 'React', 'MongoDB'] },
        bannerGradient: { type: String, default: 'linear-gradient(135deg, #1e1b4b, #3b82f6)' },
        accentColor: { type: String, default: '#2563EB' },
        socials: { 
            type: [{ platform: String, url: String, icon: String }],
            default: [
                { platform: 'GitHub', url: 'https://github.com', icon: '💻' },
                { platform: 'LinkedIn', url: 'https://linkedin.com', icon: '🔗' }
            ]
        },
        // Stores the hashed refresh token for server-side validation & blacklisting
        refreshTokenHash: {
            type: String,
            select: false,
        },
    },
    {
        timestamps: true, // adds createdAt and updatedAt
    }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// ── Pre-save Hook: Hash password ─────────────────────────────────────────────
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// ── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Compare a plain-text password against the stored hash.
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
