/**
 * cloudinaryUpload.js
 * Reusable Cloudinary upload utility.
 *
 * Wraps cloudinary.uploader.upload_stream so it works with multer's
 * in-memory buffer (memoryStorage).
 *
 * Usage:
 *   const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUpload');
 *
 *   // Upload
 *   const result = await uploadToCloudinary(req.file.buffer, {
 *       folder: 'EduNexus/materials',
 *       resource_type: 'auto',       // 'image' | 'raw' | 'video' | 'auto'
 *       public_id: 'optional-custom-id',
 *   });
 *   // result.secure_url  → the permanent Cloudinary HTTPS URL to store in MongoDB
 *   // result.public_id   → the Cloudinary public_id needed to delete later
 *
 *   // Delete
 *   await deleteFromCloudinary(publicId, 'raw'); // 'image' | 'raw' | 'video'
 */

const { getCloudinary } = require('../config/cloudinary');

// ── Upload ───────────────────────────────────────────────────────────────────

/**
 * Uploads a Buffer to Cloudinary.
 *
 * @param {Buffer} buffer      - File buffer from multer memoryStorage
 * @param {object} options     - Cloudinary upload options
 * @param {string} options.folder          - Target folder on Cloudinary
 * @param {string} [options.resource_type] - 'auto' (default) | 'image' | 'raw' | 'video'
 * @param {string} [options.public_id]     - Optional custom ID (without extension)
 * @param {string} [options.filename_override] - Original filename for display
 * @returns {Promise<{secure_url: string, public_id: string, resource_type: string, bytes: number, format: string}>}
 */
const uploadToCloudinary = (buffer, options = {}) => {
    return new Promise((resolve, reject) => {
        const cld = getCloudinary();

        const uploadOptions = {
            resource_type: 'auto',
            use_filename: true,
            unique_filename: true,
            overwrite: false,
            ...options,
        };

        const stream = cld.uploader.upload_stream(uploadOptions, (error, result) => {
            if (error) {
                console.error('[Cloudinary] Upload failed:', error);
                return reject(new Error(`Cloudinary upload failed: ${error.message}`));
            }
            resolve({
                secure_url:    result.secure_url,
                public_id:     result.public_id,
                resource_type: result.resource_type,
                bytes:         result.bytes,
                format:        result.format,
            });
        });

        stream.end(buffer);
    });
};

// ── Delete ───────────────────────────────────────────────────────────────────

/**
 * Deletes an asset from Cloudinary by its public_id.
 * Safe to call even if the asset does not exist (non-throwing).
 *
 * @param {string} publicId       - The Cloudinary public_id of the asset
 * @param {string} [resourceType] - 'image' | 'raw' | 'video' (default: 'raw')
 * @returns {Promise<void>}
 */
const deleteFromCloudinary = async (publicId, resourceType = 'raw') => {
    if (!publicId) return;
    try {
        const cld = getCloudinary();
        const result = await cld.uploader.destroy(publicId, { resource_type: resourceType });
        if (result.result !== 'ok' && result.result !== 'not found') {
            console.warn(`[Cloudinary] Delete returned unexpected result for ${publicId}:`, result);
        }
    } catch (err) {
        // Log but do not rethrow — a failed delete should not break the caller
        console.error(`[Cloudinary] Delete failed for ${publicId}:`, err.message);
    }
};

// ── Resource Type Helper ─────────────────────────────────────────────────────

/**
 * Maps a MIME type to the correct Cloudinary resource_type.
 *
 * @param {string} mimeType
 * @returns {'image' | 'video' | 'raw'}
 */
const mimeToResourceType = (mimeType = '') => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'raw'; // PDFs, Word docs, ZIP, CSV, etc.
};

module.exports = { uploadToCloudinary, deleteFromCloudinary, mimeToResourceType };
