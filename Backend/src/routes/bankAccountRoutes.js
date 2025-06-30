const express = require("express");
const router = express.Router({mergeParams: true});
const bankAccountController = require("../controllers/bankAccountController");

const mockAuth = (req, res, next) => {
  const companyId =
    req.query.companyId || req.params.companyId || req.headers["x-company-id"];

  req.user = {
    id: "507f1f77bcf86cd799439011",
    email: "test@example.com",
    name: "Test User",
  };

  req.companyId = companyId;
  next();
};

const validateBankAccount = (req, res, next) => {
  const {accountName, bankName, accountNumber, accountType = "bank"} = req.body;
  const errors = [];

  if (!accountName?.trim()) {
    errors.push("Account name is required");
  }

  if (!bankName?.trim()) {
    errors.push("Bank name is required");
  }

  if (!accountNumber?.trim()) {
    errors.push("Account number is required");
  }

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

const validateTransaction = (req, res, next) => {
  const {amount, type} = req.body;

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

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Bank Account routes are working!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

router.get("/", mockAuth, bankAccountController.getBankAccounts);
router.get("/summary", mockAuth, bankAccountController.getAccountSummary);
router.get("/validate", mockAuth, bankAccountController.validateAccountDetails);
router.get("/:accountId", mockAuth, bankAccountController.getBankAccount);
router.post(
  "/",
  mockAuth,
  validateBankAccount,
  bankAccountController.createBankAccount
);
router.put("/:accountId", mockAuth, bankAccountController.updateBankAccount);
router.delete("/:accountId", mockAuth, bankAccountController.deleteBankAccount);

router.patch(
  "/:accountId/balance",
  mockAuth,
  validateTransaction,
  bankAccountController.updateAccountBalance
);
router.post(
  "/transfer",
  mockAuth,
  validateTransfer,
  bankAccountController.processTransfer
);

router.get("/types/upi", mockAuth, bankAccountController.getUPIAccounts);
router.patch(
  "/:accountId/adjust",
  mockAuth,
  bankAccountController.adjustBalance
);

router.use((error, req, res, next) => {
  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: Object.values(error.errors).map((err) => err.message),
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate ${field} - this value already exists`,
    });
  }

  if (error.name === "MongooseError" || error.name === "MongoError") {
    return res.status(503).json({
      success: false,
      message: "Database temporarily unavailable",
    });
  }

  if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
    return res.status(408).json({
      success: false,
      message: "Request timeout",
    });
  }

  if (error.status === 404 || error.message.includes("not found")) {
    return res.status(404).json({
      success: false,
      message: "Resource not found",
    });
  }

  if (error.status === 401 || error.message.includes("unauthorized")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (error.status === 403 || error.message.includes("forbidden")) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

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

router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Bank account route not found: ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      "GET /",
      "GET /summary",
      "GET /validate",
      "GET /:accountId",
      "POST /",
      "PUT /:accountId",
      "DELETE /:accountId",
      "PATCH /:accountId/balance",
      "POST /transfer",
    ],
  });
});

module.exports = router;
