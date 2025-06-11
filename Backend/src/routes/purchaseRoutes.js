const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');

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

// ==================== BASIC CRUD ROUTES ====================

/**
 * @route   POST /api/purchases
 * @desc    Create a new purchase/bill
 * @access  Private
 */
router.post('/', authenticate, validateRequest, purchaseController.createPurchase);

/**
 * @route   GET /api/purchases
 * @desc    Get all purchases with pagination and filters
 * @access  Private
 */
router.get('/', authenticate, validateCompany, purchaseController.getAllPurchases);

/**
 * @route   GET /api/purchases/:id
 * @desc    Get purchase by ID with full details
 * @access  Private
 */
router.get('/:id', authenticate, validateRequest, purchaseController.getPurchaseById);

/**
 * @route   PUT /api/purchases/:id
 * @desc    Update purchase (only draft purchases can be updated)
 * @access  Private
 */
router.put('/:id', authenticate, validateRequest, purchaseController.updatePurchase);

/**
 * @route   DELETE /api/purchases/:id
 * @desc    Cancel purchase (soft delete)
 * @access  Private
 */
router.delete('/:id', authenticate, validateRequest, purchaseController.deletePurchase);

// ==================== STATUS MANAGEMENT ROUTES ====================

/**
 * @route   PATCH /api/purchases/:id/order
 * @desc    Mark purchase as ordered
 * @access  Private
 */
router.patch('/:id/order', authenticate, validateRequest, purchaseController.markAsOrdered);

/**
 * @route   PATCH /api/purchases/:id/receive
 * @desc    Mark purchase as received
 * @access  Private
 */
router.patch('/:id/receive', authenticate, validateRequest, purchaseController.markAsReceived);

/**
 * @route   PATCH /api/purchases/:id/complete
 * @desc    Mark purchase as completed
 * @access  Private
 */
router.patch('/:id/complete', authenticate, validateRequest, purchaseController.completePurchase);

/**
 * @route   PATCH /api/purchases/:id/cancel
 * @desc    Cancel a purchase
 * @access  Private
 */
router.patch('/:id/cancel', authenticate, validateRequest, purchaseController.deletePurchase);

// ==================== PAYMENT ROUTES ====================

/**
 * @route   POST /api/purchases/:id/payment
 * @desc    Add payment to a purchase
 * @access  Private
 */
router.post('/:id/payment', authenticate, validateRequest, purchaseController.addPayment);

/**
 * @route   GET /api/purchases/:id/payment-status
 * @desc    Get payment status of a purchase
 * @access  Private
 */
router.get('/:id/payment-status', authenticate, validateRequest, purchaseController.getPaymentStatus);

// ==================== REPORTING ROUTES ====================

/**
 * @route   GET /api/purchases/reports/today
 * @desc    Get today's purchases summary
 * @access  Private
 */
router.get('/reports/today', authenticate, validateCompany, purchaseController.getTodaysPurchases);

/**
 * @route   GET /api/purchases/reports/dashboard
 * @desc    Get purchases dashboard data (today, week, month metrics)
 * @access  Private
 */
router.get('/reports/dashboard', authenticate, validateCompany, purchaseController.getDashboardData);

/**
 * @route   GET /api/purchases/reports/summary
 * @desc    Get purchases report for date range
 * @access  Private
 */
router.get('/reports/summary', authenticate, validateCompany, purchaseController.getPurchasesReport);

/**
 * @route   GET /api/purchases/reports/monthly
 * @desc    Get monthly purchases breakdown
 * @access  Private
 */
router.get('/reports/monthly', authenticate, validateCompany, purchaseController.getMonthlyReport);

/**
 * @route   GET /api/purchases/reports/pending
 * @desc    Get pending purchases
 * @access  Private
 */
router.get('/reports/pending', authenticate, validateCompany, purchaseController.getPendingPurchases);

/**
 * @route   GET /api/purchases/reports/overdue
 * @desc    Get overdue purchases
 * @access  Private
 */
router.get('/reports/overdue', authenticate, validateCompany, purchaseController.getOverduePurchases);

// ==================== ANALYTICS ROUTES ====================

/**
 * @route   GET /api/purchases/analytics/top-items
 * @desc    Get top purchased items
 * @access  Private
 */
router.get('/analytics/top-items', authenticate, validateCompany, purchaseController.getTopItems);

/**
 * @route   GET /api/purchases/analytics/supplier-stats
 * @desc    Get supplier purchase statistics
 * @access  Private
 */
router.get('/analytics/supplier-stats', authenticate, validateCompany, purchaseController.getSupplierStats);

// ==================== UTILITY ROUTES ====================

/**
 * @route   GET /api/purchases/next-purchase-number
 * @desc    Get next available purchase number
 * @access  Private
 */
router.get('/next-purchase-number', authenticate, validateCompany, purchaseController.getNextPurchaseNumber);

/**
 * @route   POST /api/purchases/validate-stock
 * @desc    Validate item availability (not for stock checking in purchases)
 * @access  Private
 */
router.post('/validate-stock', authenticate, validateRequest, purchaseController.validateStock);

// ==================== EXPORT ROUTES ====================

/**
 * @route   GET /api/purchases/export/csv
 * @desc    Export purchases data as CSV
 * @access  Private
 */
router.get('/export/csv', authenticate, validateCompany, purchaseController.exportCSV);

module.exports = router;