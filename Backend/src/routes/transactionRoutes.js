const express = require("express");
const {body, param, query, validationResult} = require("express-validator");
const router = express.Router({mergeParams: true});
const transactionController = require("../controllers/transactionController");

// ✅ FIXED: Import ALL required middleware (was missing requireCompanyAccess)
const {
  authenticate,
  requireCompanyAccess, // ✅ ADD: This was missing and causing issues!
  requireBankAccess,
} = require("../middleware/authMiddleware");

// ================================
// 🔧 PRODUCTION-READY MIDDLEWARE
// ================================

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// Company ID resolver middleware (production version)
const resolveCompanyId = (req, res, next) => {
  const companyId =
    req.params.companyId ||
    req.headers["x-company-id"] ||
    req.query.companyId ||
    req.body.companyId;

  if (!companyId) {
    return res.status(400).json({
      success: false,
      message: "Company ID is required",
      code: "COMPANY_REQUIRED",
    });
  }

  // Ensure company ID is available everywhere
  req.companyId = companyId;
  if (!req.query.companyId) req.query.companyId = companyId;
  if (!req.body.companyId) req.body.companyId = companyId;

  next();
};

// ================================
// 🔧 VALIDATION SCHEMAS
// ================================

// Valid enums (matching your controller)
const VALID_PAYMENT_METHODS = [
  "cash",
  "card",
  "upi",
  "bank_transfer",
  "cheque",
  "credit",
  "online",
  "neft",
  "rtgs",
  "bank",
];

const VALID_TRANSACTION_TYPES = [
  "purchase",
  "sale",
  "payment_in",
  "payment_out",
  "expense",
  "income",
  "transfer",
  "adjustment",
];

const VALID_DIRECTIONS = ["in", "out"];
const VALID_STATUSES = ["pending", "completed", "failed", "cancelled"];

// MongoDB ID validation
const mongoIdValidation = [
  param("id").optional().isMongoId().withMessage("Invalid ID format"),
  param("companyId")
    .optional()
    .isMongoId()
    .withMessage("Invalid Company ID format"),
  param("bankAccountId")
    .optional()
    .isMongoId()
    .withMessage("Invalid Bank Account ID format"),
  handleValidationErrors,
];

// Create transaction validation
const createTransactionValidation = [
  body("amount")
    .isFloat({min: 0.01})
    .withMessage("Amount must be a positive number"),

  body("direction")
    .optional()
    .isIn(VALID_DIRECTIONS)
    .withMessage("Direction must be 'in' or 'out'"),

  body("transactionType")
    .optional()
    .isIn(VALID_TRANSACTION_TYPES)
    .withMessage("Invalid transaction type"),

  body("paymentMethod")
    .optional()
    .isIn(VALID_PAYMENT_METHODS)
    .withMessage("Invalid payment method"),

  body("description")
    .trim()
    .isLength({min: 1, max: 500})
    .withMessage("Description is required (max 500 characters)"),

  body("notes")
    .optional()
    .trim()
    .isLength({max: 1000})
    .withMessage("Notes cannot exceed 1000 characters"),

  body("bankAccountId")
    .optional()
    .isMongoId()
    .withMessage("Invalid bank account ID"),

  body("partyId").optional().isMongoId().withMessage("Invalid party ID"),

  body("partyName")
    .optional()
    .trim()
    .isLength({max: 200})
    .withMessage("Party name cannot exceed 200 characters"),

  body("transactionDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid transaction date format"),

  body("chequeNumber")
    .optional()
    .trim()
    .isLength({max: 50})
    .withMessage("Cheque number cannot exceed 50 characters"),

  body("chequeDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid cheque date format"),

  body("upiTransactionId")
    .optional()
    .trim()
    .isLength({max: 100})
    .withMessage("UPI transaction ID cannot exceed 100 characters"),

  body("referenceNumber")
    .optional()
    .trim()
    .isLength({max: 100})
    .withMessage("Reference number cannot exceed 100 characters"),

  handleValidationErrors,
];

// Update transaction validation
const updateTransactionValidation = [
  body("amount")
    .optional()
    .isFloat({min: 0.01})
    .withMessage("Amount must be a positive number"),

  body("direction")
    .optional()
    .isIn(VALID_DIRECTIONS)
    .withMessage("Direction must be 'in' or 'out'"),

  body("transactionType")
    .optional()
    .isIn(VALID_TRANSACTION_TYPES)
    .withMessage("Invalid transaction type"),

  body("paymentMethod")
    .optional()
    .isIn(VALID_PAYMENT_METHODS)
    .withMessage("Invalid payment method"),

  body("description")
    .optional()
    .trim()
    .isLength({min: 1, max: 500})
    .withMessage("Description must be 1-500 characters"),

  handleValidationErrors,
];

// ✅ FIXED: Updated query validation to support higher limits for exports
const queryFiltersValidation = [
  query("page")
    .optional()
    .isInt({min: 1})
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({min: 1, max: 10000}) // ✅ INCREASED: Allow up to 10000 for exports
    .withMessage("Limit must be between 1 and 10000"),

  query("bankAccountId")
    .optional()
    .isMongoId()
    .withMessage("Invalid bank account ID"),

  query("partyId").optional().isMongoId().withMessage("Invalid party ID"),

  query("direction")
    .optional()
    .isIn(VALID_DIRECTIONS)
    .withMessage("Direction must be 'in' or 'out'"),

  query("status").optional().isIn(VALID_STATUSES).withMessage("Invalid status"),

  query("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("Invalid dateFrom format"),

  query("dateTo").optional().isISO8601().withMessage("Invalid dateTo format"),

  query("sortBy")
    .optional()
    .isIn(["transactionDate", "amount", "createdAt"])
    .withMessage("Invalid sortBy field"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be 'asc' or 'desc'"),

  handleValidationErrors,
];

// Bulk reconcile validation
const bulkReconcileValidation = [
  body("transactionIds")
    .isArray({min: 1, max: 100})
    .withMessage("Transaction IDs must be an array (1-100 items)"),

  body("transactionIds.*")
    .isMongoId()
    .withMessage("All transaction IDs must be valid MongoDB IDs"),

  body("reconciled").isBoolean().withMessage("Reconciled must be a boolean"),

  body("notes")
    .optional()
    .trim()
    .isLength({max: 1000})
    .withMessage("Notes cannot exceed 1000 characters"),

  handleValidationErrors,
];

// ================================
// 🔧 UTILITY ROUTES (NO AUTH REQUIRED)
// ================================

// Health check route (no auth required)
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Transaction routes are healthy! 🏦",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    companyId: req.params.companyId || "Not provided",
    routes: {
      total: 16,
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
        "GET /bank/:bankAccountId",
        "GET /bank/:bankAccountId/verify-balance",
        "GET /health",
      ],
    },
    validation: {
      paymentMethods: VALID_PAYMENT_METHODS,
      transactionTypes: VALID_TRANSACTION_TYPES,
      directions: VALID_DIRECTIONS,
      statuses: VALID_STATUSES,
    },
  });
});

// ================================
// 📊 SPECIFIC ROUTES (MUST COME BEFORE /:id)
// ================================

// ✅ FIXED: Get transaction summary (CRITICAL - this was causing 404s!)
router.get(
  "/summary",
  authenticate,
  requireCompanyAccess, // ✅ ADD: Required for company access!
  requireBankAccess("read"),
  resolveCompanyId,
  queryFiltersValidation,
  transactionController.getTransactionSummary
);

// ✅ FIXED: Get recent transactions
router.get(
  "/recent",
  authenticate,
  requireCompanyAccess, // ✅ ADD: Required for company access!
  requireBankAccess("read"),
  resolveCompanyId,
  queryFiltersValidation,
  transactionController.getRecentTransactions
);

// ✅ FIXED: Get transaction analytics
router.get(
  "/analytics",
  authenticate,
  requireCompanyAccess, // ✅ ADD: Required for company access!
  requireBankAccess("read"),
  resolveCompanyId,
  queryFiltersValidation,
  transactionController.getTransactionAnalytics
);

// ✅ FIXED: Get cash flow summary
router.get(
  "/cash-flow",
  authenticate,
  requireCompanyAccess, // ✅ ADD: Required for company access!
  requireBankAccess("read"),
  resolveCompanyId,
  queryFiltersValidation,
  transactionController.getCashFlowSummary
);

// ✅ FIXED: Get daily cash flow
router.get(
  "/daily-cash-flow",
  authenticate,
  requireCompanyAccess, // ✅ ADD: Required for company access!
  requireBankAccess("read"),
  resolveCompanyId,
  queryFiltersValidation,
  transactionController.getDailyCashFlow
);

// ✅ FIXED: Export transactions to CSV
router.get(
  "/export",
  authenticate,
  requireCompanyAccess, // ✅ ADD: Required for company access!
  requireBankAccess("read"),
  resolveCompanyId,
  queryFiltersValidation,
  transactionController.exportTransactionsCSV
);

// ================================
// 🏦 BANK ACCOUNT SPECIFIC ROUTES (BEFORE /:id)
// ================================

// ✅ FIXED: Get bank account transactions
router.get(
  "/bank/:bankAccountId",
  authenticate,
  requireCompanyAccess, // ✅ ADD: Required for company access!
  requireBankAccess("read"),
  resolveCompanyId,
  [
    param("bankAccountId").isMongoId().withMessage("Invalid bank account ID"),
    ...queryFiltersValidation,
  ],
  transactionController.getBankAccountTransactions
);

// ✅ FIXED: Verify bank account balance
router.get(
  "/bank/:bankAccountId/verify-balance",
  authenticate,
  requireCompanyAccess, // ✅ ADD: Required for company access!
  requireBankAccess("read"),
  resolveCompanyId,
  [
    param("bankAccountId").isMongoId().withMessage("Invalid bank account ID"),
    handleValidationErrors,
  ],
  transactionController.verifyBankAccountBalance
);

// ================================
// 📊 MAIN TRANSACTION ROUTES
// ================================

// ✅ FIXED: Get all transactions with filters
router.get(
  "/",
  authenticate,
  requireCompanyAccess, // ✅ ADD: Required for company access!
  requireBankAccess("read"),
  resolveCompanyId,
  queryFiltersValidation,
  transactionController.getAllTransactions
);

// ✅ FIXED: Create new transaction
router.post(
  "/",
  authenticate,
  requireCompanyAccess, // ✅ ADD: Required for company access!
  requireBankAccess("create"),
  resolveCompanyId,
  createTransactionValidation,
  transactionController.createTransaction
);

// ================================
// 🔧 BULK OPERATIONS (BEFORE /:id)
// ================================

// ✅ FIXED: Bulk reconcile transactions
router.patch(
  "/bulk-reconcile",
  authenticate,
  requireCompanyAccess, // ✅ ADD: Required for company access!
  requireBankAccess("update"),
  resolveCompanyId,
  bulkReconcileValidation,
  transactionController.bulkReconcileTransactions
);

// ================================
// 🎯 PARAMETERIZED ROUTES (MUST COME LAST)
// ================================

// ✅ FIXED: Get transaction by ID
router.get(
  "/:id",
  authenticate,
  requireCompanyAccess, // ✅ ADD: Required for company access!
  requireBankAccess("read"),
  resolveCompanyId,
  mongoIdValidation,
  transactionController.getTransactionById
);

// ✅ FIXED: Update transaction
router.put(
  "/:id",
  authenticate,
  requireCompanyAccess, // ✅ ADD: Required for company access!
  requireBankAccess("update"),
  resolveCompanyId,
  mongoIdValidation,
  updateTransactionValidation,
  transactionController.updateTransaction
);

// ✅ FIXED: Delete transaction
router.delete(
  "/:id",
  authenticate,
  requireCompanyAccess, // ✅ ADD: Required for company access!
  requireBankAccess("delete"),
  resolveCompanyId,
  mongoIdValidation,
  transactionController.deleteTransaction
);

// ✅ FIXED: Reconcile transaction
router.patch(
  "/:id/reconcile",
  authenticate,
  requireCompanyAccess, // ✅ ADD: Required for company access!
  requireBankAccess("update"),
  resolveCompanyId,
  mongoIdValidation,
  [
    body("reconciled").isBoolean().withMessage("Reconciled must be a boolean"),
    body("notes")
      .optional()
      .trim()
      .isLength({max: 1000})
      .withMessage("Notes cannot exceed 1000 characters"),
    handleValidationErrors,
  ],
  transactionController.reconcileTransaction
);

// ================================
// 🚨 ERROR HANDLING
// ================================

// Global error handler
router.use((error, req, res, next) => {
  console.error("❌ Transaction Route Error:", {
    error: error.message,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    companyId: req.params.companyId,
    userId: req.user?.id,
  });

  let statusCode = 500;
  let message = "Transaction route error";

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
  }

  if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
  }

  if (error.code === 11000) {
    statusCode = 409;
    message = "Duplicate transaction data";
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
    code: error.code || "TRANSACTION_ERROR",
  });
});

// 404 handler
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Transaction route not found: ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      "GET /api/companies/:companyId/transactions",
      "POST /api/companies/:companyId/transactions",
      "GET /api/companies/:companyId/transactions/summary",
      "GET /api/companies/:companyId/transactions/recent",
      "GET /api/companies/:companyId/transactions/analytics",
      "GET /api/companies/:companyId/transactions/cash-flow",
      "GET /api/companies/:companyId/transactions/daily-cash-flow",
      "GET /api/companies/:companyId/transactions/export",
      "GET /api/companies/:companyId/transactions/:id",
      "PUT /api/companies/:companyId/transactions/:id",
      "DELETE /api/companies/:companyId/transactions/:id",
      "PATCH /api/companies/:companyId/transactions/:id/reconcile",
      "PATCH /api/companies/:companyId/transactions/bulk-reconcile",
      "GET /api/companies/:companyId/transactions/bank/:bankAccountId",
      "GET /api/companies/:companyId/transactions/bank/:bankAccountId/verify-balance",
      "GET /api/companies/:companyId/transactions/health",
    ],
    requestInfo: {
      method: req.method,
      url: req.originalUrl,
      companyId: req.params.companyId || "Not provided",
      authenticated: !!req.user,
      userRole: req.user?.role || "Not authenticated",
      timestamp: new Date().toISOString(),
    },
    authenticationRequired: true,
    hint: "All routes except /health require authentication with Bearer token and company access",
  });
});

module.exports = router;
