const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    createInvoice,
    getAllInvoices,
    getInvoiceById,
    updateInvoice,
    getMyInvoices,
} = require('../controllers/invoiceController');

// Student endpoints
router.get('/my-dues', protect, authorize('student'), getMyInvoices);

// Admin endpoints
router.post('/', protect, authorize('admin'), createInvoice);
router.get('/', protect, authorize('admin'), getAllInvoices);
router.get('/:id', protect, authorize('admin'), getInvoiceById);
router.put('/:id', protect, authorize('admin'), updateInvoice);

module.exports = router;
