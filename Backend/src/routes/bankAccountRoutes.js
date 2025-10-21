const express = require("express");
const router = express.Router({mergeParams: true});
const bankAccountController = require("../controllers/bankAccountController");

// ✅ FIXED: Import real authentication middleware
const {
  authenticate,
  requireCompanyAccess,
  requireBankAccess,
} = require("../middleware/authMiddleware");

// ✅ ALTERNATIVE: If auth.js file exists, use this instead
// const { authenticateToken } = require("../middleware/auth");
// const { companyAccess } = require("../middleware/companyAccess");

// ✅ ENHANCED: Validation middleware for bank accounts
const validateBankAccount = (req, res, next) => {
  console.log('🔍 VALIDATING BANK ACCOUNT');
  console.log('📋 Request Body:', JSON.stringify(req.body, null, 2));
  
  const {
    accountName,
    accountDisplayName,
    accountHolderName,
    bankName,
    accountNumber,
    ifscCode,
    accountType,
    type
  } = req.body;
  
  const errors = [];

  // ✅ FIXED: Accept either accountDisplayName or accountName
  const finalAccountName = accountDisplayName?.trim() || accountName?.trim();
  
  if (!finalAccountName) {
    errors.push("Account display name is required");
  }

  // ✅ FIXED: Determine account type from either 'type' or 'accountType' field
  // The frontend sends 'type: bank' and 'accountType: Savings'
  // We need to check the 'type' field for bank/cash/upi validation
  const actualType = type || "bank"; // Default to "bank" if not specified
  
  console.log('🔍 Account Type Check:');
  console.log('  - type field:', type);
  console.log('  - accountType field:', accountType);
  console.log('  - actualType (for validation):', actualType);

  // ✅ NEW: Validate account holder name for bank/upi accounts (not for cash)
  if (actualType !== "cash" && !accountHolderName?.trim()) {
    errors.push("Account holder name is required for bank accounts");
  }

  // ✅ FIXED: Make bankName required for bank/upi accounts (not for cash)
  if (actualType !== "cash" && !bankName?.trim()) {
    errors.push("Bank name is required for bank accounts");
  }

  // ✅ FIXED: Make accountNumber required for bank/upi accounts (not for cash)
  if (actualType !== "cash" && !accountNumber?.trim()) {
    errors.push("Account number is required for bank accounts");
  }

  // ✅ NEW: Validate IFSC code for bank/upi accounts (not for cash)
  if (actualType !== "cash" && !ifscCode?.trim()) {
    errors.push("IFSC code is required for bank accounts");
  } else if (actualType !== "cash" && ifscCode?.trim()) {
    // Validate IFSC format: 4 letters + 0 + 6 alphanumeric characters
    const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/i;
    if (!ifscPattern.test(ifscCode.trim())) {
      errors.push("Invalid IFSC code format (e.g., SBIN0001234)");
    }
  }

  // ✅ ENHANCED: Updated valid types to match service expectations
  // Only validate the 'type' field, not 'accountType' (which can be Savings, Current, etc.)
  const validTypes = ["bank", "cash", "upi"];
  if (type && !validTypes.includes(type)) {
    errors.push(`Type must be one of: ${validTypes.join(", ")}`);
  }

  if (errors.length > 0) {
    console.log('❌ VALIDATION FAILED:', errors);
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
      receivedData: {
        accountDisplayName: finalAccountName,
        accountHolderName,
        bankName,
        accountNumber,
        ifscCode,
        type: actualType,
        accountType
      }
    });
  }

  console.log('✅ VALIDATION PASSED');
  next();
};

// ✅ ENHANCED: Transaction validation
const validateTransaction = (req, res, next) => {
  const {amount, type, reason} = req.body;

  if (!amount || !type) {
    return res.status(400).json({
      success: false,
      message: "Amount and transaction type are required",
    });
  }

  const transactionAmount = parseFloat(amount);
  if (isNaN(transactionAmount) || transactionAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Amount must be a positive number",
    });
  }

  if (!["credit", "debit"].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Transaction type must be either "credit" or "debit"',
    });
  }

  next();
};

// ✅ ENHANCED: Transfer validation
const validateTransfer = (req, res, next) => {
  const {fromAccountId, toAccountId, amount} = req.body;

  if (!fromAccountId || !toAccountId || !amount) {
    return res.status(400).json({
      success: false,
      message: "From account, to account, and amount are required",
    });
  }

  if (fromAccountId === toAccountId) {
    return res.status(400).json({
      success: false,
      message: "Cannot transfer to the same account",
    });
  }

  const transferAmount = parseFloat(amount);
  if (isNaN(transferAmount) || transferAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Transfer amount must be a positive number",
    });
  }

  next();
};

// ✅ ENHANCED: Validation for account ID parameters
const validateAccountId = (req, res, next) => {
  const {accountId} = req.params;

  if (!accountId) {
    return res.status(400).json({
      success: false,
      message: "Account ID is required",
    });
  }

  // Basic MongoDB ObjectId validation (24 hex characters) or allow custom IDs
  if (
    accountId !== "cash_default" &&
    !/^[a-fA-F0-9]{24}$/.test(accountId) &&
    accountId.length < 3
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid account ID format",
    });
  }

  next();
};

// ✅ ROUTES: Organized by functionality with PROPER AUTHENTICATION

// Health check route (no auth required)
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Bank Account routes are working!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    companyId: req.params.companyId || "Not provided",
    authenticated: !!req.user,
    userRole: req.user?.role || "Not authenticated",
  });
});

// ✅ FIXED: PRIMARY ROUTES with proper authentication
router.get(
  "/",
  authenticate,
  requireCompanyAccess,
  requireBankAccess("read"),
  bankAccountController.getBankAccounts
);

router.post(
  "/",
  authenticate,
  requireCompanyAccess,
  requireBankAccess("create"),
  validateBankAccount,
  bankAccountController.createBankAccount
);

// ✅ FIXED: SUMMARY AND VALIDATION ROUTES
router.get(
  "/summary",
  authenticate,
  requireCompanyAccess,
  requireBankAccess("read"),
  bankAccountController.getAccountSummary
);

router.get(
  "/validate",
  authenticate,
  requireCompanyAccess,
  requireBankAccess("read"),
  bankAccountController.validateAccountDetails
);

// ✅ FIXED: TRANSFER OPERATIONS
router.post(
  "/transfer",
  authenticate,
  requireCompanyAccess,
  requireBankAccess("balance"),
  validateTransfer,
  bankAccountController.processTransfer
);

// ✅ FIXED: SPECIFIC ACCOUNT TYPE ROUTES
router.get(
  "/types/cash",
  authenticate,
  requireCompanyAccess,
  requireBankAccess("read"),
  bankAccountController.getCashAccounts
);

router.get(
  "/types/upi",
  authenticate,
  requireCompanyAccess,
  requireBankAccess("read"),
  bankAccountController.getUPIAccounts
);

// ✅ FIXED: PAYMENT-SPECIFIC ROUTES
router.get(
  "/payment/active",
  authenticate,
  requireCompanyAccess,
  requireBankAccess("read"),
  bankAccountController.getActiveAccountsForPayment
);

// ✅ FIXED: INDIVIDUAL ACCOUNT ROUTES (with account ID validation)
router.get(
  "/:accountId",
  authenticate,
  requireCompanyAccess,
  requireBankAccess("read"),
  validateAccountId,
  bankAccountController.getBankAccount
);

router.put(
  "/:accountId",
  authenticate,
  requireCompanyAccess,
  requireBankAccess("update"),
  validateAccountId,
  validateBankAccount,
  bankAccountController.updateBankAccount
);

router.delete(
  "/:accountId",
  authenticate,
  requireCompanyAccess,
  requireBankAccess("delete"),
  validateAccountId,
  bankAccountController.deleteBankAccount
);

// ✅ FIXED: ACCOUNT BALANCE OPERATIONS
router.get(
  "/:accountId/balance",
  authenticate,
  requireCompanyAccess,
  requireBankAccess("read"),
  validateAccountId,
  bankAccountController.getBankAccountBalance
);

router.patch(
  "/:accountId/balance",
  authenticate,
  requireCompanyAccess,
  requireBankAccess("balance"),
  validateAccountId,
  validateTransaction,
  bankAccountController.updateAccountBalance
);

router.patch(
  "/:accountId/adjust",
  authenticate,
  requireCompanyAccess,
  requireBankAccess("balance"),
  validateAccountId,
  bankAccountController.adjustBalance
);

// ✅ FIXED: ACCOUNT TRANSACTIONS (Required by service)
router.get(
  "/:accountId/transactions",
  authenticate,
  requireCompanyAccess,
  requireBankAccess("read"),
  validateAccountId,
  bankAccountController.getBankAccountTransactions
);

// ✅ ENHANCED: Error handling middleware with better error classification
router.use((error, req, res, next) => {
  console.error("❌ Bank Account Route Error:", {
    error: error.message,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    companyId: req.params.companyId,
    userId: req.user?.id,
    userRole: req.user?.role,
    timestamp: new Date().toISOString(),
  });

  // Validation errors
  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: Object.values(error.errors).map((err) => err.message),
      code: "VALIDATION_ERROR",
    });
  }

  // MongoDB cast errors (invalid ObjectId)
  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
      code: "INVALID_ID",
      field: error.path,
    });
  }

  // Duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate ${field} - this value already exists`,
      code: "DUPLICATE_ERROR",
      field,
    });
  }

  // Database connection errors
  if (error.name === "MongooseError" || error.name === "MongoError") {
    return res.status(503).json({
      success: false,
      message: "Database temporarily unavailable",
      code: "DATABASE_ERROR",
    });
  }

  // Timeout errors
  if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
    return res.status(408).json({
      success: false,
      message: "Request timeout",
      code: "TIMEOUT_ERROR",
    });
  }

  // Not found errors
  if (error.status === 404 || error.message.includes("not found")) {
    return res.status(404).json({
      success: false,
      message: "Resource not found",
      code: "NOT_FOUND",
    });
  }

  // Authentication errors
  if (error.status === 401 || error.message.includes("unauthorized")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
      code: "UNAUTHORIZED",
    });
  }

  // Authorization errors
  if (error.status === 403 || error.message.includes("forbidden")) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
      code: "FORBIDDEN",
    });
  }

  // Insufficient balance errors (specific to bank accounts)
  if (
    error.message.includes("insufficient") ||
    error.message.includes("balance")
  ) {
    return res.status(400).json({
      success: false,
      message: error.message || "Insufficient account balance",
      code: "INSUFFICIENT_BALANCE",
    });
  }

  // Generic server errors
  const status = error.status || error.statusCode || 500;
  res.status(status).json({
    success: false,
    message: error.message || "Internal server error",
    code: error.code || "INTERNAL_ERROR",
    ...(process.env.NODE_ENV === "development" && {
      stack: error.stack,
      details: error,
    }),
  });
});

// ✅ ENHANCED: 404 handler with comprehensive route listing
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Bank account route not found: ${req.method} ${req.originalUrl}`,
    availableRoutes: {
      "Account Management": [
        "GET / - Get all bank accounts",
        "POST / - Create new bank account",
        "GET /:accountId - Get specific bank account",
        "PUT /:accountId - Update bank account",
        "DELETE /:accountId - Delete bank account",
      ],
      "Balance Operations": [
        "GET /:accountId/balance - Get account balance",
        "PATCH /:accountId/balance - Update account balance",
        "PATCH /:accountId/adjust - Adjust account balance",
      ],
      Transactions: [
        "GET /:accountId/transactions - Get account transactions",
        "POST /transfer - Transfer between accounts",
      ],
      "Utility Routes": [
        "GET /summary - Get account summary",
        "GET /validate - Validate account details",
        "GET /types/cash - Get cash accounts",
        "GET /types/upi - Get UPI accounts",
        "GET /payment/active - Get active payment accounts",
      ],
      Testing: ["GET /test - Health check"],
    },
    requestInfo: {
      method: req.method,
      url: req.originalUrl,
      companyId: req.params.companyId || "Not provided",
      authenticated: !!req.user,
      userRole: req.user?.role || "Not authenticated",
      timestamp: new Date().toISOString(),
    },
    authenticationRequired: true,
    hint: "All routes except /test require authentication with Bearer token",
  });
});

module.exports = router;
