const materialService = require('../services/materialService');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// GET /api/v1/materials/course/:courseId
const getMaterialsByCourse = asyncHandler(async (req, res) => {
    const materials = await materialService.getMaterialsByCourse(
        req.user.id, req.user.role, req.params.courseId
    );
    return ApiResponse.success(res, 200, { materials });
});

// POST /api/v1/materials/upload — multipart/form-data with real file
const uploadMaterialFile = asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No file uploaded.');
    const { courseId, title, description, category, module: mod } = req.body;
    if (!courseId) throw ApiError.badRequest('courseId is required.');

    const material = await materialService.uploadMaterialFile(
        req.user.id,
        courseId,
        req.file,
        { title, description, category, module: mod }
    );
    return ApiResponse.success(res, 201, { material }, 'File uploaded successfully.');
});

// POST /api/v1/materials/link — external URL (JSON)
const uploadMaterialLink = asyncHandler(async (req, res) => {
    const { courseId, title, fileUrl, description, category, module: mod } = req.body;
    if (!courseId || !title || !fileUrl) {
        throw ApiError.badRequest('courseId, title, and fileUrl are required.');
    }
    const material = await materialService.uploadMaterialLink(
        req.user.id,
        courseId,
        { title, fileUrl, description, category, module: mod }
    );
    return ApiResponse.success(res, 201, { material }, 'Link added successfully.');
});

// PATCH /api/v1/materials/:id
const updateMaterial = asyncHandler(async (req, res) => {
    const material = await materialService.updateMaterial(req.user.id, req.params.id, req.body);
    return ApiResponse.success(res, 200, { material }, 'Material updated.');
});

// DELETE /api/v1/materials/:id
const deleteMaterial = asyncHandler(async (req, res) => {
    await materialService.deleteMaterial(req.user.id, req.user.role, req.params.id);
    return ApiResponse.success(res, 200, null, 'Material deleted.');
});

// POST /api/v1/materials/:id/download
const trackDownload = asyncHandler(async (req, res) => {
    await materialService.trackDownload(req.params.id);
    return ApiResponse.success(res, 200, null, 'Download tracked.');
});

module.exports = {
    getMaterialsByCourse,
    uploadMaterialFile,
    uploadMaterialLink,
    updateMaterial,
    deleteMaterial,
    trackDownload,
};
