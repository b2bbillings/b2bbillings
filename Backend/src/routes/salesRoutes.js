const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');

// Middleware for validation (you can add authentication middleware here)
const validateRequest = (req, res, next) => {
    // Add any common validation logic here
    next();
};

// Authentication middleware (add your auth logic)
const authenticate = (req, res, next) => {
    // Add your authentication logic here
    // For now, just passing through
    next();
};

// Company validation middleware
const validateCompany = (req, res, next) => {
    const companyId = req.query.companyId || req.body.companyId;
    if (!companyId) {
        return res.status(400).json({
            success: false,
            message: 'Company ID is required'
        });
    }
    next();
};

// ==================== UTILITY ROUTES (Must come FIRST) ====================

/**
 * @route   GET /api/sales/next-invoice-number
 * @desc    Get next available invoice number
 * @access  Private
 */
router.get('/next-invoice-number', authenticate, validateCompany, saleController.getNextInvoiceNumber);

/**
 * @route   POST /api/sales/validate-stock
 * @desc    Validate stock availability for items
 * @access  Private
 */
router.post('/validate-stock', authenticate, validateRequest, saleController.validateStock);

// ==================== REPORTING ROUTES (Must come BEFORE /:id routes) ====================

/**
 * @route   GET /api/sales/reports/today
 * @desc    Get today's sales summary
 * @access  Private
 */
router.get('/reports/today', authenticate, validateCompany, saleController.getTodaysSales);

/**
 * @route   GET /api/sales/reports/dashboard
 * @desc    Get sales dashboard data (today, week, month metrics)
 * @access  Private
 */
router.get('/reports/dashboard', authenticate, validateCompany, saleController.getDashboardData);

/**
 * @route   GET /api/sales/reports/summary
 * @desc    Get sales report for date range
 * @access  Private
 */
router.get('/reports/summary', authenticate, validateCompany, saleController.getSalesReport);

/**
 * @route   GET /api/sales/reports/monthly
 * @desc    Get monthly sales breakdown
 * @access  Private
 */
router.get('/reports/monthly', authenticate, validateCompany, saleController.getMonthlyReport);

// ==================== ANALYTICS ROUTES ====================

/**
 * @route   GET /api/sales/analytics/top-items
 * @desc    Get top selling items
 * @access  Private
 */
router.get('/analytics/top-items', authenticate, validateCompany, saleController.getTopItems);

/**
 * @route   GET /api/sales/analytics/customer-stats
 * @desc    Get customer purchase statistics
 * @access  Private
 */
router.get('/analytics/customer-stats', authenticate, validateCompany, saleController.getCustomerStats);

// ==================== DUE DATE MANAGEMENT ROUTES ====================

/**
 * @route   GET /api/sales/overdue
 * @desc    Get overdue sales
 * @access  Private
 */
router.get('/overdue', authenticate, validateCompany, saleController.getOverdueSales);

/**
 * @route   GET /api/sales/due-today
 * @desc    Get sales due today
 * @access  Private
 */
router.get('/due-today', authenticate, validateCompany, saleController.getSalesDueToday);

/**
 * @route   GET /api/sales/payment-summary-overdue
 * @desc    Get payment summary with overdue analysis
 * @access  Private
 */
router.get('/payment-summary-overdue', authenticate, validateCompany, saleController.getPaymentSummaryWithOverdue);

// ==================== EXPORT ROUTES ====================

/**
 * @route   GET /api/sales/export/csv
 * @desc    Export sales data as CSV
 * @access  Private
 */
router.get('/export/csv', authenticate, validateCompany, saleController.exportCSV);

// ==================== BASIC CRUD ROUTES ====================

/**
 * @route   POST /api/sales
 * @desc    Create a new sale/invoice
 * @access  Private
 */
router.post('/', authenticate, validateRequest, saleController.createSale);

/**
 * @route   GET /api/sales
 * @desc    Get all sales with pagination and filters
 * @access  Private
 */
router.get('/', authenticate, validateCompany, saleController.getAllSales);

// ==================== INDIVIDUAL SALE ROUTES (Must come AFTER specific routes) ====================

/**
 * @route   GET /api/sales/:id
 * @desc    Get sale by ID with full details
 * @access  Private
 */
router.get('/:id', authenticate, validateRequest, saleController.getSaleById);

/**
 * @route   PUT /api/sales/:id
 * @desc    Update sale (only draft sales can be updated)
 * @access  Private
 */
router.put('/:id', authenticate, validateRequest, saleController.updateSale);

/**
 * @route   DELETE /api/sales/:id
 * @desc    Cancel sale (soft delete)
 * @access  Private
 */
router.delete('/:id', authenticate, validateRequest, saleController.deleteSale);

// ==================== STATUS MANAGEMENT ROUTES ====================

/**
 * @route   PATCH /api/sales/:id/complete
 * @desc    Mark sale as completed
 * @access  Private
 */
router.patch('/:id/complete', authenticate, validateRequest, saleController.completeSale);

/**
 * @route   PATCH /api/sales/:id/cancel
 * @desc    Cancel a sale (alternative endpoint)
 * @access  Private
 */
router.patch('/:id/cancel', authenticate, validateRequest, saleController.deleteSale);

// ==================== DUE DATE UPDATE ROUTE ====================

/**
 * @route   PUT /api/sales/:id/due-date
 * @desc    Update payment due date
 * @access  Private
 */
router.put('/:id/due-date', authenticate, validateRequest, saleController.updatePaymentDueDate);

// ==================== PAYMENT ROUTES ====================

/**
 * @route   POST /api/sales/:id/payment
 * @desc    Add payment to a sale
 * @access  Private
 */
router.post('/:id/payment', authenticate, validateRequest, saleController.addPayment);

/**
 * @route   POST /api/sales/:id/payments
 * @desc    Add payment to a sale (alternative endpoint)
 * @access  Private
 */
router.post('/:id/payments', authenticate, validateRequest, saleController.addPayment);

/**
 * @route   GET /api/sales/:id/payment-status
 * @desc    Get payment status of a sale
 * @access  Private
 */
router.get('/:id/payment-status', authenticate, validateRequest, saleController.getPaymentStatus);

module.exports = router;