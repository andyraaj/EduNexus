/**
 * cloudinary.js
 * Initializes and exports the Cloudinary v2 SDK instance.
 * Call getCloudinary() wherever you need to upload/delete assets.
 */
const cloudinary = require('cloudinary').v2;

let _initialized = false;

const initCloudinary = () => {
    if (_initialized) return cloudinary;

    const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
    const api_key    = process.env.CLOUDINARY_API_KEY;
    const api_secret = process.env.CLOUDINARY_API_SECRET;

    if (!cloud_name || !api_key || !api_secret) {
        throw new Error(
            '[Cloudinary] Missing required environment variables: ' +
            'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET'
        );
    }

    cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
    _initialized = true;
    console.log(`[Cloudinary] Initialized — cloud: ${cloud_name}`);
    return cloudinary;
};

const getCloudinary = () => {
    if (!_initialized) return initCloudinary();
    return cloudinary;
};

module.exports = { initCloudinary, getCloudinary };
