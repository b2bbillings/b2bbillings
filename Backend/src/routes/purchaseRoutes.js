const express = require("express");
const router = express.Router();
const purchaseController = require("../controllers/purchaseController");

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
      message: "Company ID is required",
    });
  }
  next();
};

// ==================== UTILITY ROUTES (MUST BE FIRST) ====================

/**
 * @route   GET /api/purchases/next-purchase-number
 * @desc    Get next available purchase number
 * @access  Private
 */
router.get(
  "/next-purchase-number",
  authenticate,
  validateCompany,
  purchaseController.getNextPurchaseNumber
);

/**
 * @route   GET /api/purchases/next-invoice-number
 * @desc    Get next available purchase invoice number (alias for purchase number)
 * @access  Private
 */
router.get(
  "/next-invoice-number",
  authenticate,
  validateCompany,
  purchaseController.getNextPurchaseNumber
);

/**
 * @route   GET /api/purchases/generate-invoice-number
 * @desc    Generate next purchase invoice number (alternative endpoint)
 * @access  Private
 */
router.get(
  "/generate-invoice-number",
  authenticate,
  validateCompany,
  purchaseController.getNextPurchaseNumber
);

/**
 * @route   GET /api/purchases/check/:id
 * @desc    Check if purchase exists (for deletion validation)
 * @access  Private
 */
router.get(
  "/check/:id",
  authenticate,
  validateRequest,
  purchaseController.checkPurchaseExists
);

// ==================== DAYBOOK ROUTES (PRIORITY - Before other routes) ====================

/**
 * @route   GET /api/purchases/daybook-summary
 * @desc    Get purchases summary for daybook
 * @access  Private
 */
router.get(
  "/daybook-summary",
  authenticate,
  validateCompany,
  purchaseController.getDaybookSummary
);

/**
 * @route   GET /api/purchases/payables-aging
 * @desc    Get payables aging analysis
 * @access  Private
 */
router.get(
  "/payables-aging",
  authenticate,
  validateCompany,
  purchaseController.getPayablesAging
);

/**
 * @route   GET /api/purchases/top-creditors
 * @desc    Get top creditors list
 * @access  Private
 */
router.get(
  "/top-creditors",
  authenticate,
  validateCompany,
  purchaseController.getTopCreditors
);

/**
 * @route   GET /api/purchases/trends
 * @desc    Get purchase trends for dashboard
 * @access  Private
 */
router.get(
  "/trends",
  authenticate,
  validateCompany,
  purchaseController.getPurchaseTrends
);

/**
 * @route   GET /api/purchases/payment-efficiency
 * @desc    Get payment efficiency metrics
 * @access  Private
 */
router.get(
  "/payment-efficiency",
  authenticate,
  validateCompany,
  purchaseController.getPaymentEfficiency
);

/**
 * @route   GET /api/purchases/daily-cash-outflow
 * @desc    Get daily cash outflow from purchases
 * @access  Private
 */
router.get(
  "/daily-cash-outflow",
  authenticate,
  validateCompany,
  purchaseController.getDailyCashOutflow
);

/**
 * @route   GET /api/purchases/payment-alerts
 * @desc    Get payment alerts
 * @access  Private
 */
router.get(
  "/payment-alerts",
  authenticate,
  validateCompany,
  purchaseController.getPaymentAlerts
);

// ==================== REPORTING ROUTES (SPECIFIC PATHS FIRST) ====================

/**
 * @route   GET /api/purchases/reports/today
 * @desc    Get today's purchases summary
 * @access  Private
 */
router.get(
  "/reports/today",
  authenticate,
  validateCompany,
  purchaseController.getTodaysPurchases
);

/**
 * @route   GET /api/purchases/reports/dashboard
 * @desc    Get purchases dashboard data (today, week, month metrics)
 * @access  Private
 */
router.get(
  "/reports/dashboard",
  authenticate,
  validateCompany,
  purchaseController.getDashboardData
);

/**
 * @route   GET /api/purchases/reports/summary
 * @desc    Get purchases report for date range
 * @access  Private
 */
router.get(
  "/reports/summary",
  authenticate,
  validateCompany,
  purchaseController.getPurchasesReport
);

/**
 * @route   GET /api/purchases/reports/monthly
 * @desc    Get monthly purchases breakdown
 * @access  Private
 */
router.get(
  "/reports/monthly",
  authenticate,
  validateCompany,
  purchaseController.getMonthlyReport
);

// ==================== ANALYTICS ROUTES ====================

/**
 * @route   GET /api/purchases/analytics/top-items
 * @desc    Get top purchased items
 * @access  Private
 */
router.get(
  "/analytics/top-items",
  authenticate,
  validateCompany,
  purchaseController.getTopItems
);

/**
 * @route   GET /api/purchases/analytics/supplier-stats
 * @desc    Get supplier purchase statistics
 * @access  Private
 */
router.get(
  "/analytics/supplier-stats",
  authenticate,
  validateCompany,
  purchaseController.getSupplierStats
);

// ==================== EXPORT ROUTES ====================

/**
 * @route   GET /api/purchases/export/csv
 * @desc    Export purchases data as CSV
 * @access  Private
 */
router.get(
  "/export/csv",
  authenticate,
  validateCompany,
  purchaseController.exportCSV
);

// ==================== DUE DATE MANAGEMENT ROUTES ====================

/**
 * @route   GET /api/purchases/overdue
 * @desc    Get overdue purchases
 * @access  Private
 */
router.get(
  "/overdue",
  authenticate,
  validateCompany,
  purchaseController.getOverduePurchases
);

/**
 * @route   GET /api/purchases/due-today
 * @desc    Get purchases due today
 * @access  Private
 */
router.get(
  "/due-today",
  authenticate,
  validateCompany,
  purchaseController.getPurchasesDueToday
);

/**
 * @route   GET /api/purchases/payment-summary-overdue
 * @desc    Get payment summary with overdue analysis
 * @access  Private
 */
router.get(
  "/payment-summary-overdue",
  authenticate,
  validateCompany,
  purchaseController.getPaymentSummaryWithOverdue
);

// ==================== VALIDATION ROUTES ====================

/**
 * @route   POST /api/purchases/validate-stock
 * @desc    Validate stock availability (not applicable for purchases - kept for consistency)
 * @access  Private
 */
router.post(
  "/validate-stock",
  authenticate,
  validateRequest,
  purchaseController.validateStock
);

/**
 * @route   POST /api/purchases/validate-items
 * @desc    Validate purchase items before submission
 * @access  Private
 */
router.post(
  "/validate-items",
  authenticate,
  validateRequest,
  purchaseController.validateItems
);

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /api/purchases/admin/all
 * @desc    Get all purchases for admin (across all companies)
 * @access  Admin
 */
router.get(
  "/admin/all",
  authenticate,
  purchaseController.getAllPurchasesForAdmin
);

/**
 * @route   GET /api/purchases/admin/stats
 * @desc    Get purchase statistics for admin dashboard
 * @access  Admin
 */
router.get(
  "/admin/stats",
  authenticate,
  purchaseController.getPurchaseStatsForAdmin
);

/**
 * @route   GET /api/purchases/admin/analytics
 * @desc    Get admin analytics for purchases
 * @access  Admin
 */
router.get(
  "/admin/analytics",
  authenticate,
  purchaseController.getAdminPurchaseAnalytics
);

/**
 * @route   GET /api/purchases/admin/dashboard
 * @desc    Get admin dashboard summary for purchases
 * @access  Admin
 */
router.get(
  "/admin/dashboard",
  authenticate,
  purchaseController.getAdminPurchaseDashboardSummary
);

/**
 * @route   GET /api/purchases/admin/overdue
 * @desc    Get overdue purchases for admin (across all companies)
 * @access  Admin
 */
router.get(
  "/admin/overdue",
  authenticate,
  purchaseController.getOverduePurchasesForAdmin
);

/**
 * @route   GET /api/purchases/admin/due-today
 * @desc    Get purchases due today for admin (across all companies)
 * @access  Admin
 */
router.get(
  "/admin/due-today",
  authenticate,
  purchaseController.getPurchasesDueTodayForAdmin
);

/**
 * @route   GET /api/purchases/admin/purchases/bidirectional-analytics
 * @desc    Get admin bidirectional purchase analytics
 * @access  Private (Admin only)
 */
router.get(
  "/admin/purchases/bidirectional-analytics",
  authenticate,
  purchaseController.getAdminBidirectionalPurchaseAnalytics
);

/**
 * @route   GET /api/purchases/admin/purchases/payment-analytics
 * @desc    Get admin payment analytics for purchases
 * @access  Private (Admin only)
 */
router.get(
  "/admin/purchases/payment-analytics",
  authenticate,
  purchaseController.getAdminPurchasePaymentAnalytics
);

/**
 * @route   GET /api/purchases/admin/purchases/supplier-analytics
 * @desc    Get admin supplier analytics
 * @access  Private (Admin only)
 */
router.get(
  "/admin/purchases/supplier-analytics",
  authenticate,
  purchaseController.getAdminSupplierAnalytics
);

// ==================== SEARCH ROUTES ====================

/**
 * @route   GET /api/purchases/search
 * @desc    Search purchases with advanced filters
 * @access  Private
 */
router.get(
  "/search",
  authenticate,
  validateCompany,
  purchaseController.searchPurchases
);

/**
 * @route   GET /api/purchases/by-supplier/:supplierId
 * @desc    Get purchases by supplier with enhanced data
 * @access  Private
 */
router.get(
  "/by-supplier/:supplierId",
  authenticate,
  validateCompany,
  purchaseController.getPurchasesBySupplier
);

/**
 * @route   GET /api/purchases/payment-summary/enhanced
 * @desc    Get enhanced payment summary with detailed breakdown
 * @access  Private
 */
router.get(
  "/payment-summary/enhanced",
  authenticate,
  validateCompany,
  purchaseController.getEnhancedPaymentSummary
);

/**
 * @route   GET /api/purchases/grouped-by-status
 * @desc    Get purchases grouped by status with enhanced data
 * @access  Private
 */
router.get(
  "/grouped-by-status",
  authenticate,
  validateCompany,
  purchaseController.getPurchasesGroupedByStatus
);

// ==================== BASIC CRUD ROUTES ====================

/**
 * @route   POST /api/purchases
 * @desc    Create a new purchase/bill
 * @access  Private
 */
router.post(
  "/",
  authenticate,
  validateRequest,
  purchaseController.createPurchase
);

/**
 * @route   GET /api/purchases
 * @desc    Get all purchases with pagination and filters
 * @access  Private
 */
router.get(
  "/",
  authenticate,
  validateCompany,
  purchaseController.getAllPurchases
);

// ==================== INDIVIDUAL PURCHASE ROUTES (MUST BE AFTER SPECIFIC ROUTES) ====================

/**
 * @route   GET /api/purchases/:id
 * @desc    Get purchase by ID with full details
 * @access  Private
 */
router.get(
  "/:id",
  authenticate,
  validateRequest,
  purchaseController.getPurchaseById
);

/**
 * @route   PUT /api/purchases/:id
 * @desc    Update purchase (only draft purchases can be updated)
 * @access  Private
 */
router.put(
  "/:id",
  authenticate,
  validateRequest,
  purchaseController.updatePurchase
);

/**
 * @route   DELETE /api/purchases/:id
 * @desc    Delete/Cancel purchase (soft delete by default, hard delete with ?hard=true)
 * @access  Private
 */
router.delete(
  "/:id",
  authenticate,
  validateRequest,
  purchaseController.deletePurchase
);

// ==================== STATUS MANAGEMENT ROUTES ====================

/**
 * @route   PUT /api/purchases/:id/due-date
 * @desc    Update payment due date
 * @access  Private
 */
router.put(
  "/:id/due-date",
  authenticate,
  validateRequest,
  purchaseController.updatePaymentDueDate
);

/**
 * @route   PATCH /api/purchases/:id/order
 * @desc    Mark purchase as ordered
 * @access  Private
 */
router.patch(
  "/:id/order",
  authenticate,
  validateRequest,
  purchaseController.markAsOrdered
);

/**
 * @route   PATCH /api/purchases/:id/receive
 * @desc    Mark purchase as received
 * @access  Private
 */
router.patch(
  "/:id/receive",
  authenticate,
  validateRequest,
  purchaseController.markAsReceived
);

/**
 * @route   PATCH /api/purchases/:id/complete
 * @desc    Mark purchase as completed
 * @access  Private
 */
router.patch(
  "/:id/complete",
  authenticate,
  validateRequest,
  purchaseController.completePurchase
);

/**
 * @route   PATCH /api/purchases/:id/cancel
 * @desc    Cancel a purchase (alternative to DELETE)
 * @access  Private
 */
router.patch(
  "/:id/cancel",
  authenticate,
  validateRequest,
  purchaseController.deletePurchase
);

// ==================== PAYMENT ROUTES ====================

/**
 * @route   POST /api/purchases/:id/payment
 * @desc    Add payment to a purchase
 * @access  Private
 */
router.post(
  "/:id/payment",
  authenticate,
  validateRequest,
  purchaseController.addPayment
);

/**
 * @route   POST /api/purchases/:id/payments
 * @desc    Add payment to a purchase (alternative endpoint)
 * @access  Private
 */
router.post(
  "/:id/payments",
  authenticate,
  validateRequest,
  purchaseController.addPayment
);

/**
 * @route   GET /api/purchases/:id/payment-status
 * @desc    Get payment status of a purchase
 * @access  Private
 */
router.get(
  "/:id/payment-status",
  authenticate,
  validateRequest,
  purchaseController.getPaymentStatus
);

// ==================== DAYBOOK ALERT ROUTES (Must be after ID routes) ====================

/**
 * @route   PUT /api/purchases/:purchaseId/alert-sent
 * @desc    Mark payment alert as sent
 * @access  Private
 */
router.put(
  "/:purchaseId/alert-sent",
  authenticate,
  validateCompany,
  purchaseController.markAlertSent
);

// ==================== PRINT ROUTES ====================

/**
 * @route   GET /api/purchases/:id/print
 * @desc    Get purchase bill for printing
 * @access  Private
 */
router.get(
  "/:id/print",
  authenticate,
  validateRequest,
  purchaseController.getPurchaseBillForPrint
);

module.exports = router;
