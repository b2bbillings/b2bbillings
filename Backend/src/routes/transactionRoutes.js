const express = require("express");
const router = express.Router({mergeParams: true}); // ✅ CRITICAL: This is missing in your current code!
const transactionController = require("../controllers/transactionController");
const {
  authenticate,
  requireBankAccess,
} = require("../middleware/authMiddleware");
// const { validateCompanyParam, validateTransactionData } = require('../middleware/validation');

// ✅ SIMPLIFIED: Debug middleware to verify params are passed correctly
router.use((req, res, next) => {
  console.log("🔍 Transaction Route Debug:", {
    method: req.method,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    params: req.params,
    companyId: req.params.companyId,
    hasCompanyId: !!req.params.companyId,
    headers: {
      "x-company-id": req.headers["x-company-id"],
    },
  });
  next();
});

// ✅ SIMPLIFIED: Company ID resolver middleware
const resolveCompanyId = (req, res, next) => {
  const companyId =
    req.params.companyId || // From URL params (primary)
    req.headers["x-company-id"] || // From header (backup)
    req.query.companyId || // From query (fallback)
    req.body.companyId; // From body (for POST requests)

  if (!companyId) {
    console.error("❌ Company ID not found in request");
    return res.status(400).json({
      success: false,
      message: "Company ID is required",
      debug: {
        params: req.params,
        headers: {"x-company-id": req.headers["x-company-id"]},
        query: req.query.companyId ? "Present" : "Missing",
        body: req.body.companyId ? "Present" : "Missing",
        route: req.originalUrl,
      },
    });
  }

  // Ensure company ID is available in all common places
  req.companyId = companyId;
  if (!req.query.companyId) req.query.companyId = companyId;
  if (!req.body.companyId) req.body.companyId = companyId;

  console.log("✅ Company ID resolved:", companyId);
  next();
};

// ==================== MAIN ROUTES ====================

/**
 * @route   GET /
 * @desc    Get all transactions for a company
 * @access  Private
 */
router.get(
  "/",
  authenticate,
  requireBankAccess("read"),
  resolveCompanyId,
  transactionController.getAllTransactions
);

/**
 * @route   POST /
 * @desc    Create a new transaction
 * @access  Private
 */
router.post(
  "/",
  authenticate,
  requireBankAccess("create"),
  resolveCompanyId,
  // validateTransactionData,
  transactionController.createTransaction
);

/**
 * @route   GET /summary
 * @desc    Get transaction summary for a company
 * @access  Private
 */
router.get(
  "/summary",
  authenticate,
  requireBankAccess("read"),
  resolveCompanyId,
  transactionController.getTransactionSummary
);

/**
 * @route   GET /recent
 * @desc    Get recent transactions for a company
 * @access  Private
 */
router.get(
  "/recent",
  authenticate,
  requireBankAccess("read"),
  resolveCompanyId,
  transactionController.getRecentTransactions
);

// ✅ NEW: Missing DayBook routes that transactionService expects

/**
 * @route   GET /analytics
 * @desc    Get transaction analytics for insights
 * @access  Private
 */
router.get(
  "/analytics",
  authenticate,
  requireBankAccess("read"),
  resolveCompanyId,
  transactionController.getTransactionAnalytics
);

/**
 * @route   GET /cash-flow
 * @desc    Get cash flow summary for DayBook
 * @access  Private
 */
router.get(
  "/cash-flow",
  authenticate,
  requireBankAccess("read"),
  resolveCompanyId,
  transactionController.getCashFlowSummary
);

/**
 * @route   GET /daily-cash-flow
 * @desc    Get daily cash flow (inflow/outflow) for DayBook
 * @access  Private
 */
router.get(
  "/daily-cash-flow",
  authenticate,
  requireBankAccess("read"),
  resolveCompanyId,
  transactionController.getDailyCashFlow
);

/**
 * @route   GET /export
 * @desc    Export transactions to CSV
 * @access  Private
 */
router.get(
  "/export",
  authenticate,
  requireBankAccess("read"),
  resolveCompanyId,
  transactionController.exportTransactionsCSV
);

/**
 * @route   GET /:id
 * @desc    Get transaction by ID
 * @access  Private
 */
router.get(
  "/:id",
  authenticate,
  requireBankAccess("read"),
  resolveCompanyId,
  transactionController.getTransactionById
);

/**
 * @route   PUT /:id
 * @desc    Update transaction by ID
 * @access  Private
 */
router.put(
  "/:id",
  authenticate,
  requireBankAccess("update"),
  resolveCompanyId,
  // validateTransactionData,
  transactionController.updateTransaction
);

/**
 * @route   DELETE /:id
 * @desc    Delete transaction by ID
 * @access  Private
 */
router.delete(
  "/:id",
  authenticate,
  requireBankAccess("delete"),
  resolveCompanyId,
  transactionController.deleteTransaction
);

/**
 * @route   PATCH /:id/reconcile
 * @desc    Reconcile transaction
 * @access  Private
 */
router.patch(
  "/:id/reconcile",
  authenticate,
  requireBankAccess("update"),
  resolveCompanyId,
  transactionController.reconcileTransaction
);

/**
 * @route   PATCH /bulk-reconcile
 * @desc    Bulk reconcile transactions
 * @access  Private
 */
router.patch(
  "/bulk-reconcile",
  authenticate,
  requireBankAccess("update"),
  resolveCompanyId,
  transactionController.bulkReconcileTransactions
);

// ==================== UTILITY ROUTES ====================

/**
 * @route   GET /health
 * @desc    Health check for transaction routes
 * @access  Public
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Transaction routes are healthy! 🏦",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    routes: {
      available: [
        "GET /",
        "POST /",
        "GET /summary",
        "GET /recent",
        "GET /analytics",
        "GET /cash-flow",
        "GET /daily-cash-flow",
        "GET /export",
        "GET /:id",
        "PUT /:id",
        "DELETE /:id",
        "PATCH /:id/reconcile",
        "PATCH /bulk-reconcile",
      ],
    },
  });
});

/**
 * @route   GET /debug
 * @desc    Debug route for development
 * @access  Development only
 */
router.get("/debug", (req, res) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).json({
      success: false,
      message: "Debug route only available in development",
    });
  }

  res.json({
    success: true,
    debug: {
      companyId: req.params.companyId,
      allParams: req.params,
      query: req.query,
      headers: {
        "x-company-id": req.headers["x-company-id"],
        authorization: req.headers.authorization ? "Present" : "Missing",
      },
      route: {
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl,
        method: req.method,
      },
      timestamp: new Date().toISOString(),
    },
  });
});

// ==================== ERROR HANDLING ====================

// Global error handler for this router
router.use((err, req, res, next) => {
  console.error("❌ Transaction route error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Transaction route error",
    error:
      process.env.NODE_ENV === "development"
        ? {
            stack: err.stack,
            details: err,
          }
        : undefined,
  });
});

// 404 handler for unmatched routes
router.use("*", (req, res) => {
  console.log("❌ Transaction route not found:", req.method, req.originalUrl);

  res.status(404).json({
    success: false,
    message: `Transaction route not found: ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      "GET /api/companies/:companyId/transactions",
      "POST /api/companies/:companyId/transactions",
      "GET /api/companies/:companyId/transactions/summary",
      "GET /api/companies/:companyId/transactions/analytics",
      "GET /api/companies/:companyId/transactions/cash-flow",
      "GET /api/companies/:companyId/transactions/daily-cash-flow",
      "GET /api/companies/:companyId/transactions/export",
      "GET /api/companies/:companyId/transactions/:id",
    ],
  });
});

module.exports = router;
