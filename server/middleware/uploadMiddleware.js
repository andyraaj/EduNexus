/**
 * uploadMiddleware.js
 * Multer configuration using in-memory storage.
 *
 * Files land in req.file.buffer / req.files[].buffer — they are then
 * streamed to Cloudinary by the controller/service layer.
 * Nothing is ever written to the local filesystem.
 *
 * Supported types:
 *   Documents : PDF, Word (doc/docx)
 *   Presentations: PPT, PPTX
 *   Spreadsheets : XLS, XLSX, CSV
 *   Text         : TXT
 *   Archives     : ZIP
 *   Images       : JPG, JPEG, PNG, GIF, WEBP
 *   Video        : MP4, WEBM, MOV
 */
const multer = require('multer');

// ── In-Memory Storage (no local disk writes) ──────────────────────────────────
const storage = multer.memoryStorage();

// ── File Type Whitelist ────────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Presentations
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Spreadsheets
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    // Text
    'text/plain',
    // Archives
    'application/zip',
    'application/x-zip-compressed',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // Videos
    'video/mp4',
    'video/webm',
    'video/quicktime',
]);

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                `File type not supported: ${file.mimetype}. ` +
                'Allowed: PDF, Word, PowerPoint, Excel, CSV, TXT, ZIP, Images, Videos.'
            ),
            false
        );
    }
};

// ── Multer Instances ───────────────────────────────────────────────────────────
const _uploadSingle = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100 MB
        files: 1,
    },
}).single('file');

const _uploadMultiple = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024,
        files: 10,
    },
}).array('files', 10);

// ── Wrapped Middleware (error-forwarding) ──────────────────────────────────────

/**
 * Accepts a single file under the field name "file".
 * The parsed file is available as req.file (with .buffer, .mimetype, .originalname, .size).
 */
const handleUploadSingle = (req, res, next) => {
    _uploadSingle(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds 100 MB limit.' },
                });
            }
            return res.status(400).json({
                success: false,
                error: { code: 'UPLOAD_ERROR', message: err.message },
            });
        }
        if (err) {
            return res.status(400).json({
                success: false,
                error: { code: 'FILE_TYPE_ERROR', message: err.message },
            });
        }
        next();
    });
};

/**
 * Accepts up to 10 files under the field name "files".
 * Parsed files are available as req.files[].
 */
const handleUploadMultiple = (req, res, next) => {
    _uploadMultiple(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                error: { code: 'UPLOAD_ERROR', message: err.message },
            });
        }
        if (err) {
            return res.status(400).json({
                success: false,
                error: { code: 'FILE_TYPE_ERROR', message: err.message },
            });
        }
        next();
    });
};

module.exports = { handleUploadSingle, handleUploadMultiple };
