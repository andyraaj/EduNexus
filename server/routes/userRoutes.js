const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    deactivateUser,
} = require('../controllers/userController');

// @route  GET  /api/v1/users          → list all (admin + faculty + student can view)
// @route  POST /api/v1/users          → create new user (admin only)
router
    .route('/')
    .get(protect, authorize('admin', 'faculty', 'student'), getAllUsers)
    .post(protect, authorize('admin'), createUser);

// @route  GET    /api/v1/users/:id    → single user with profile (admin)
// @route  PUT    /api/v1/users/:id    → update user fields (admin)
// @route  DELETE /api/v1/users/:id    → hard delete user (admin)
router
    .route('/:id')
    .get(protect, authorize('admin'), getUserById)
    .put(protect, authorize('admin'), updateUser)
    .delete(protect, authorize('admin'), deleteUser);

// @route  PUT    /api/v1/users/:id/deactivate  → soft deactivate (admin)
router.put('/:id/deactivate', protect, authorize('admin'), deactivateUser);

module.exports = router;
