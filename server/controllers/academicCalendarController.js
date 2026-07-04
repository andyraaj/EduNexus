/**
 * academicCalendarController.js
 * Manages academic calendar PDFs stored on Cloudinary.
 * All file I/O is via Cloudinary — no local filesystem involvement.
 */
const AcademicCalendar = require('../models/AcademicCalendar');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const https = require('https');
const { uploadToCloudinary, deleteFromCloudinary, mimeToResourceType } = require('../utils/cloudinaryUpload');

/**
 * Fetches a Cloudinary URL server-side and pipes it to the Express response.
 * Avoids all browser CORS and cross-origin download-attribute restrictions.
 *
 * @param {string}  cloudinaryUrl     - The secure_url from Cloudinary
 * @param {string}  fileName          - Original filename for Content-Disposition
 * @param {'inline'|'attachment'} disposition - inline = preview, attachment = download
 * @param {object}  res               - Express response object
 */
const pipeCloudinaryFile = (cloudinaryUrl, fileName, disposition, res) => {
    return new Promise((resolve, reject) => {
        https.get(cloudinaryUrl, (cloudRes) => {
            if (cloudRes.statusCode !== 200) {
                reject(new Error(`Cloudinary returned HTTP ${cloudRes.statusCode}`));
                return;
            }

            let contentType = cloudRes.headers['content-type'] || 'application/octet-stream';
            if (fileName && fileName.toLowerCase().endsWith('.pdf')) {
                contentType = 'application/pdf';
            }
            const safeName = encodeURIComponent(fileName || 'calendar.pdf').replace(/'/g, "'");

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"`);
            res.setHeader('Cache-Control', 'no-store');

            if (cloudRes.headers['content-length']) {
                res.setHeader('Content-Length', cloudRes.headers['content-length']);
            }

            cloudRes.pipe(res);
            cloudRes.on('end', resolve);
            cloudRes.on('error', reject);
        }).on('error', reject);
    });
};


// @desc    Get all academic calendars
// @route   GET /api/v1/academic-calendars
const getCalendars = asyncHandler(async (req, res) => {
    const { academicYear, calendarType } = req.query;
    const filter = {};
    if (academicYear) filter.academicYear = academicYear;
    if (calendarType && calendarType !== 'all') filter.calendarType = calendarType;

    const calendars = await AcademicCalendar.find(filter)
        .populate('uploadedBy', 'name email role')
        .sort({ createdAt: -1 });

    return ApiResponse.success(res, 200, { calendars });
});

// @desc    Upload academic calendar PDF/image to Cloudinary
// @route   POST /api/v1/academic-calendars
const uploadCalendar = asyncHandler(async (req, res) => {
    const { title, academicYear, calendarType } = req.body;

    if (!title || !academicYear || !calendarType) {
        throw ApiError.badRequest('title, academicYear, and calendarType are required.');
    }

    if (!req.file) {
        throw ApiError.badRequest('A PDF or image file is required.');
    }

    // Validate MIME type (extra server-side guard beyond multer filter)
    const allowedMimes = new Set([
        'application/pdf',
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    ]);
    if (!allowedMimes.has(req.file.mimetype)) {
        throw ApiError.badRequest('Only PDF and image files are accepted for Academic Calendars.');
    }

    // Upload to Cloudinary
    const resourceType = mimeToResourceType(req.file.mimetype); // 'image' or 'raw'
    let cloudResult;
    try {
        cloudResult = await uploadToCloudinary(req.file.buffer, {
            folder: 'EduNexus/academic-calendars',
            resource_type: resourceType,
            use_filename: true,
            unique_filename: true,
        });
    } catch (uploadErr) {
        console.error('[ACADEMIC_CALENDAR] Cloudinary upload error:', uploadErr.message);
        throw ApiError.internal('File upload to cloud storage failed. Please try again.');
    }

    console.info('[ACADEMIC_CALENDAR] Upload succeeded', {
        requestId: req.requestId,
        userId: req.user?.id,
        title,
        academicYear,
        calendarType,
        secureUrl: cloudResult.secure_url,
        publicId: cloudResult.public_id,
        bytes: cloudResult.bytes,
    });

    const calendar = await AcademicCalendar.create({
        title,
        academicYear,
        calendarType,
        fileUrl: cloudResult.secure_url,       // permanent Cloudinary HTTPS URL
        cloudinaryPublicId: cloudResult.public_id,
        cloudinaryResourceType: cloudResult.resource_type,
        fileName: req.file.originalname,
        uploadedBy: req.user.id,
    });

    // Broadcast notification
    try {
        const notificationService = require('../services/notificationService');
        const typeLabel = calendarType === 'holiday' ? 'Holiday Schedule'
            : calendarType === 'exam' ? 'Exam Timetable'
            : 'Academic Calendar';
        await notificationService.broadcastAnnouncement(
            `📅 New ${typeLabel} Uploaded`,
            `"${title}" for ${academicYear} is now available in the Academic Calendar section.`,
            'all',
            'Admin'
        );
    } catch (notifErr) {
        console.error('[Calendar Notification] Failed:', notifErr.message);
    }

    return ApiResponse.success(res, 201, { calendar }, 'Calendar uploaded successfully.');
});

// @desc    Proxy-serve calendar file inline (for iframe / preview)
// @route   GET /api/v1/academic-calendars/:id/file
const proxyCalendarFile = asyncHandler(async (req, res) => {
    const calendar = await AcademicCalendar.findById(req.params.id)
        .select('title fileUrl fileName');

    if (!calendar || !calendar.fileUrl) {
        throw ApiError.notFound('Calendar file not found.');
    }

    try {
        await pipeCloudinaryFile(calendar.fileUrl, calendar.fileName, 'inline', res);
    } catch (err) {
        console.error('[CALENDAR] Proxy stream error:', err.message);
        if (!res.headersSent) {
            throw ApiError.internal('Could not retrieve file from cloud storage.');
        }
    }
});

// @desc    Force-download calendar file with correct filename
// @route   GET /api/v1/academic-calendars/:id/download
const downloadCalendarFile = asyncHandler(async (req, res) => {
    const calendar = await AcademicCalendar.findById(req.params.id)
        .select('title fileUrl fileName');

    if (!calendar || !calendar.fileUrl) {
        throw ApiError.notFound('Calendar file not found.');
    }

    try {
        await pipeCloudinaryFile(calendar.fileUrl, calendar.fileName, 'attachment', res);
    } catch (err) {
        console.error('[CALENDAR] Download stream error:', err.message);
        if (!res.headersSent) {
            throw ApiError.internal('Could not retrieve file from cloud storage.');
        }
    }
});

// @desc    Delete academic calendar (and its Cloudinary asset)
// @route   DELETE /api/v1/academic-calendars/:id
const deleteCalendar = asyncHandler(async (req, res) => {
    const calendar = await AcademicCalendar.findById(req.params.id);
    if (!calendar) throw ApiError.notFound('Calendar not found.');

    // Remove asset from Cloudinary if we have a public_id
    if (calendar.cloudinaryPublicId) {
        await deleteFromCloudinary(
            calendar.cloudinaryPublicId,
            calendar.cloudinaryResourceType || 'raw'
        );
    }

    await calendar.deleteOne();
    return ApiResponse.success(res, 200, null, 'Calendar deleted successfully.');
});

module.exports = {
    getCalendars,
    uploadCalendar,
    proxyCalendarFile,
    downloadCalendarFile,
    deleteCalendar,
};
