const invoiceService = require('../services/invoiceService');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

const createInvoice = asyncHandler(async (req, res) => {
    const invoice = await invoiceService.createInvoice(req.body);
    return ApiResponse.success(res, 201, { invoice }, 'Invoice generated.');
});

const getAllInvoices = asyncHandler(async (req, res) => {
    const invoices = await invoiceService.getAllInvoices();
    return ApiResponse.success(res, 200, { invoices });
});

const getInvoiceById = asyncHandler(async (req, res) => {
    const invoice = await invoiceService.getInvoiceById(req.params.id);
    return ApiResponse.success(res, 200, { invoice });
});

const updateInvoice = asyncHandler(async (req, res) => {
    const invoice = await invoiceService.updateInvoice(req.params.id, req.body);
    return ApiResponse.success(res, 200, { invoice }, 'Invoice updated.');
});

const getMyInvoices = asyncHandler(async (req, res) => {
    const invoices = await invoiceService.getMyInvoices(req.user.id);
    return ApiResponse.success(res, 200, { invoices });
});

module.exports = { createInvoice, getAllInvoices, getInvoiceById, updateInvoice, getMyInvoices };
