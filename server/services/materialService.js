/**
 * materialService.js
 * Business logic for course materials.
 * All file uploads go to Cloudinary; no local filesystem writes.
 */
const CourseMaterial = require('../models/CourseMaterial');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const ApiError = require('../utils/ApiError');
const { uploadToCloudinary, deleteFromCloudinary, mimeToResourceType } = require('../utils/cloudinaryUpload');

/**
 * Verify access to a course's materials.
 * Admin: always. Faculty: must be primaryFaculty. Student: must be enrolled.
 */
const checkCourseAccess = async (userId, userRole, courseId) => {
    if (userRole === 'admin') return true;
    if (userRole === 'faculty') {
        const course = await Course.findById(courseId);
        if (!course) throw ApiError.notFound('Course not found.');
        if (!course.primaryFaculty || course.primaryFaculty.toString() !== userId.toString()) {
            throw ApiError.forbidden('You are not assigned to this course.');
        }
        return true;
    }
    if (userRole === 'student') {
        const isEnrolled = await Enrollment.exists({ student: userId, course: courseId, status: 'enrolled' });
        if (!isEnrolled) throw ApiError.forbidden('You must be enrolled to access course materials.');
        return true;
    }
};

// GET /api/v1/materials/course/:courseId
const getMaterialsByCourse = async (userId, userRole, courseId) => {
    await checkCourseAccess(userId, userRole, courseId);

    const query = userRole === 'student'
        ? { course: courseId, isVisible: true }
        : { course: courseId };

    return CourseMaterial.find(query)
        .populate('faculty', 'name email')
        .sort({ isPinned: -1, uploadedAt: -1 });
};

// POST /api/v1/materials/upload — multipart/form-data (real file → Cloudinary)
const uploadMaterialFile = async (userId, courseId, fileInfo, metadata) => {
    const course = await Course.findById(courseId);
    if (!course) throw ApiError.notFound('Course not found.');
    if (!course.primaryFaculty || course.primaryFaculty.toString() !== userId.toString()) {
        throw ApiError.forbidden('You are not assigned to this course.');
    }

    // Upload buffer to Cloudinary
    const resourceType = mimeToResourceType(fileInfo.mimetype);
    let cloudResult;
    try {
        cloudResult = await uploadToCloudinary(fileInfo.buffer, {
            folder: 'EduNexus/materials',
            resource_type: resourceType,
            use_filename: true,
            unique_filename: true,
        });
    } catch (uploadErr) {
        console.error('[Material] Cloudinary upload error:', uploadErr.message);
        throw ApiError.internal('File upload to cloud storage failed. Please try again.');
    }

    const material = await CourseMaterial.create({
        course: courseId,
        faculty: userId,
        title: metadata.title || fileInfo.originalname,
        description: metadata.description || '',
        fileUrl: cloudResult.secure_url,              // Cloudinary HTTPS URL
        cloudinaryPublicId: cloudResult.public_id,
        cloudinaryResourceType: cloudResult.resource_type,
        fileName: fileInfo.originalname,
        fileSize: fileInfo.size,
        mimeType: fileInfo.mimetype,
        isExternalLink: false,
        category: metadata.category || 'notes',
        module: metadata.module || 'General',
        isPinned: false,
        isVisible: true,
    });

    try {
        const { notifyCourseStudents } = require('./notificationService');
        const courseCode = course.code || 'Course';
        notifyCourseStudents(
            courseId,
            'material_added',
            `📚 New Resource: "${material.title}" has been uploaded in ${courseCode}.`,
            `/student/courses/${courseId}`
        );
    } catch (err) {
        console.error('[Notification Error] Failed to send material notification:', err.message);
    }

    return material;
};

// POST /api/v1/materials/link — external URL (JSON body, no file upload)
const uploadMaterialLink = async (userId, courseId, data) => {
    const course = await Course.findById(courseId);
    if (!course) throw ApiError.notFound('Course not found.');
    if (!course.primaryFaculty || course.primaryFaculty.toString() !== userId.toString()) {
        throw ApiError.forbidden('You are not assigned to this course.');
    }

    const material = await CourseMaterial.create({
        course: courseId,
        faculty: userId,
        title: data.title,
        description: data.description || '',
        fileUrl: data.fileUrl,
        fileName: data.title,
        isExternalLink: true,
        category: data.category || 'other',
        module: data.module || 'General',
    });

    try {
        const { notifyCourseStudents } = require('./notificationService');
        const courseCode = course.code || 'Course';
        notifyCourseStudents(
            courseId,
            'material_added',
            `🔗 New Resource Link: "${material.title}" has been added in ${courseCode}.`,
            `/student/courses/${courseId}`
        );
    } catch (err) {
        console.error('[Notification Error] Failed to send material notification:', err.message);
    }

    return material;
};

// PATCH /api/v1/materials/:id — update metadata only
const updateMaterial = async (userId, materialId, updates) => {
    const material = await CourseMaterial.findById(materialId);
    if (!material) throw ApiError.notFound('Material not found.');
    if (material.faculty.toString() !== userId.toString()) {
        throw ApiError.forbidden('You can only edit your own materials.');
    }
    const allowed = ['title', 'description', 'category', 'module', 'isPinned', 'isVisible'];
    allowed.forEach(key => { if (updates[key] !== undefined) material[key] = updates[key]; });
    await material.save();
    return material;
};

// DELETE /api/v1/materials/:id
const deleteMaterial = async (userId, userRole, materialId) => {
    const material = await CourseMaterial.findById(materialId);
    if (!material) throw ApiError.notFound('Material not found.');
    if (userRole !== 'admin' && material.faculty.toString() !== userId.toString()) {
        throw ApiError.forbidden('You can only delete your own materials.');
    }

    // Delete from Cloudinary if this was an uploaded (not external) file
    if (!material.isExternalLink && material.cloudinaryPublicId) {
        await deleteFromCloudinary(
            material.cloudinaryPublicId,
            material.cloudinaryResourceType || 'raw'
        );
    }

    await CourseMaterial.findByIdAndDelete(materialId);
};

// POST /api/v1/materials/:id/track-download — increment download count
const trackDownload = async (materialId) => {
    await CourseMaterial.findByIdAndUpdate(materialId, { $inc: { downloadCount: 1 } });
};

module.exports = {
    getMaterialsByCourse,
    uploadMaterialFile,
    uploadMaterialLink,
    updateMaterial,
    deleteMaterial,
    trackDownload,
};
