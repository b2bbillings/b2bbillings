const express = require("express");
const {body, param, query, validationResult} = require("express-validator");
const router = express.Router({mergeParams: true});
const transactionController = require("../controllers/transactionController");
const {
  authenticate,
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
    .isIn(VALID_DIRECTIONS)
    .withMessage("Direction must be 'in' or 'out'"),

  body("transactionType")
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

// Query filters validation
const queryFiltersValidation = [
  query("page")
    .optional()
    .isInt({min: 1})
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({min: 1, max: 100})
    .withMessage("Limit must be between 1 and 100"),

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
// 📊 MAIN TRANSACTION ROUTES
// ================================

// Get all transactions with filters
router.get(
  "/",
  authenticate,
  requireBankAccess("read"),
  resolveCompanyId,
  queryFiltersValidation,
  transactionController.getAllTransactions
);

// Create new transaction
router.post(
  "/",
  authenticate,
  requireBankAccess("create"),
  resolveCompanyId,
  createTransactionValidation,
  transactionController.createTransaction
);

// Get transaction summary
router.get(
  "/summary",
  authenticate,
  requireBankAccess("read"),
  resolveCompanyId,
  queryFiltersValidation,
  transactionController.getTransactionSummary
);

// Get recent transactions
router.get(
  "/recent",
  authenticate,
  requireBankAccess("read"),
  resolveCompanyId,
  queryFiltersValidation,
  transactionController.getRecentTransactions
);

// Get transaction analytics
router.get(
  "/analytics",
  authenticate,
  requireBankAccess("read"),
  resolveCompanyId,
  queryFiltersValidation,
  transactionController.getTransactionAnalytics
);

// Get cash flow summary
router.get(
  "/cash-flow",
  authenticate,
  requireBankAccess("read"),
  resolveCompanyId,
  queryFiltersValidation,
  transactionController.getCashFlowSummary
);

// Get daily cash flow
router.get(
  "/daily-cash-flow",
  authenticate,
  requireBankAccess("read"),
  resolveCompanyId,
  queryFiltersValidation,
  transactionController.getDailyCashFlow
);

// Export transactions to CSV
router.get(
  "/export",
  authenticate,
  requireBankAccess("read"),
  resolveCompanyId,
  queryFiltersValidation,
  transactionController.exportTransactionsCSV
);

// Get transaction by ID
router.get(
  "/:id",
  authenticate,
  requireBankAccess("read"),
  resolveCompanyId,
  mongoIdValidation,
  transactionController.getTransactionById
);

// Update transaction
router.put(
  "/:id",
  authenticate,
  requireBankAccess("update"),
  resolveCompanyId,
  mongoIdValidation,
  updateTransactionValidation,
  transactionController.updateTransaction
);

// Delete transaction
router.delete(
  "/:id",
  authenticate,
  requireBankAccess("delete"),
  resolveCompanyId,
  mongoIdValidation,
  transactionController.deleteTransaction
);

// Reconcile transaction
router.patch(
  "/:id/reconcile",
  authenticate,
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

// Bulk reconcile transactions
router.patch(
  "/bulk-reconcile",
  authenticate,
  requireBankAccess("update"),
  resolveCompanyId,
  bulkReconcileValidation,
  transactionController.bulkReconcileTransactions
);

// ================================
// 🏦 BANK ACCOUNT SPECIFIC ROUTES
// ================================

// Get bank account transactions
router.get(
  "/bank/:bankAccountId",
  authenticate,
  requireBankAccess("read"),
  resolveCompanyId,
  [
    param("bankAccountId").isMongoId().withMessage("Invalid bank account ID"),
    queryFiltersValidation,
  ],
  transactionController.getBankAccountTransactions
);

// Verify bank account balance
router.get(
  "/bank/:bankAccountId/verify-balance",
  authenticate,
  requireBankAccess("read"),
  resolveCompanyId,
  [
    param("bankAccountId").isMongoId().withMessage("Invalid bank account ID"),
    handleValidationErrors,
  ],
  transactionController.verifyBankAccountBalance
);

// ================================
// 🔧 UTILITY ROUTES
// ================================

// Health check
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Transaction routes are healthy! 🏦",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    routes: {
      total: 15,
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
// 🚨 ERROR HANDLING
// ================================

// Global error handler
router.use((error, req, res, next) => {
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
    ],
  });
});

module.exports = router;
