const express = require("express");
const router = express.Router({mergeParams: true});
const bankAccountController = require("../controllers/bankAccountController");

// ✅ ENHANCED: Mock auth middleware with better company ID handling
const mockAuth = (req, res, next) => {
  const companyId =
    req.params.companyId ||
    req.query.companyId ||
    req.headers["x-company-id"] ||
    req.headers["companyId"];

  // Enhanced user mock
  req.user = {
    id: "507f1f77bcf86cd799439011",
    email: "test@example.com",
    name: "Test User",
    role: "admin",
  };

  req.companyId = companyId;

  // ✅ ADDED: Log for debugging
  console.log("🔐 Mock Auth - Company ID:", companyId);

  if (!companyId) {
    console.warn("⚠️ No company ID found in request");
  }

  next();
};

// ✅ ENHANCED: Validation middleware for bank accounts
const validateBankAccount = (req, res, next) => {
  const {accountName, bankName, accountNumber, accountType = "bank"} = req.body;
  const errors = [];

  if (!accountName?.trim()) {
    errors.push("Account name is required");
  }

  // ✅ FIXED: Make bankName optional for cash accounts
  if (accountType !== "cash" && !bankName?.trim()) {
    errors.push("Bank name is required for non-cash accounts");
  }

  // ✅ FIXED: Make accountNumber optional for cash accounts
  if (accountType !== "cash" && !accountNumber?.trim()) {
    errors.push("Account number is required for non-cash accounts");
  }

  // ✅ ENHANCED: Updated valid types to match service expectations
  const validTypes = ["bank", "savings", "current", "cash", "upi", "other"];
  if (!validTypes.includes(accountType)) {
    errors.push(`Account type must be one of: ${validTypes.join(", ")}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

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

// ✅ NEW: Validation for account ID parameters
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

// ✅ ROUTES: Organized by functionality

// Health check route
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Bank Account routes are working!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    companyId: req.companyId || "Not provided",
  });
});

// ✅ PRIMARY ROUTES: Main bank account operations
router.get("/", mockAuth, bankAccountController.getBankAccounts);
router.post(
  "/",
  mockAuth,
  validateBankAccount,
  bankAccountController.createBankAccount
);

// ✅ SUMMARY AND VALIDATION ROUTES
router.get("/summary", mockAuth, bankAccountController.getAccountSummary);
router.get("/validate", mockAuth, bankAccountController.validateAccountDetails);

// ✅ TRANSFER OPERATIONS
router.post(
  "/transfer",
  mockAuth,
  validateTransfer,
  bankAccountController.processTransfer
);

// ✅ SPECIFIC ACCOUNT TYPE ROUTES
router.get("/types/cash", mockAuth, bankAccountController.getCashAccounts);
router.get("/types/upi", mockAuth, bankAccountController.getUPIAccounts);

// ✅ INDIVIDUAL ACCOUNT ROUTES (with account ID validation)
router.get(
  "/:accountId",
  mockAuth,
  validateAccountId,
  bankAccountController.getBankAccount
);
router.put(
  "/:accountId",
  mockAuth,
  validateAccountId,
  validateBankAccount,
  bankAccountController.updateBankAccount
);
router.delete(
  "/:accountId",
  mockAuth,
  validateAccountId,
  bankAccountController.deleteBankAccount
);

// ✅ ACCOUNT BALANCE OPERATIONS
router.get(
  "/:accountId/balance",
  mockAuth,
  validateAccountId,
  bankAccountController.getBankAccountBalance
);
router.patch(
  "/:accountId/balance",
  mockAuth,
  validateAccountId,
  validateTransaction,
  bankAccountController.updateAccountBalance
);
router.patch(
  "/:accountId/adjust",
  mockAuth,
  validateAccountId,
  bankAccountController.adjustBalance
);

// ✅ NEW: ACCOUNT TRANSACTIONS (Required by service)
router.get(
  "/:accountId/transactions",
  mockAuth,
  validateAccountId,
  bankAccountController.getBankAccountTransactions
);

// ✅ NEW: PAYMENT-SPECIFIC ROUTES
router.get(
  "/payment/active",
  mockAuth,
  bankAccountController.getActiveAccountsForPayment
);

// ✅ ENHANCED: Error handling middleware with better error classification
router.use((error, req, res, next) => {
  console.error("❌ Bank Account Route Error:", {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    companyId: req.companyId,
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
    });
  }

  // Duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate ${field} - this value already exists`,
      code: "DUPLICATE_ERROR",
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
      companyId: req.companyId || "Not provided",
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = router;
