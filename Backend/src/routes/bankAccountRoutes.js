const express = require('express');
const router = express.Router({ mergeParams: true });
const bankAccountController = require('../controllers/bankAccountController');
const {
    authenticate,
    requireCompanyAccess,
    requireEmployee,
    requireBankAccess,
    debugAuth,
    validateRequest
} = require('../middleware/authMiddleware');

// ✅ ENHANCED: Validation middleware for bank account creation/update
const validateBankAccount = (req, res, next) => {
    const { accountName, type, bankName, accountNumber, ifscCode, upiId, mobileNumber } = req.body;

    console.log('✅ Validating bank account data:', { accountName, type, bankName, accountNumber, ifscCode, upiId, mobileNumber });

    const errors = [];

    // Basic validation
    if (!accountName?.trim()) {
        errors.push('Account display name is required');
    }

    if (!type || !['bank', 'upi'].includes(type)) {
        errors.push('Account type must be either "bank" or "upi"');
    }

    // Bank fields validation (required for both bank and UPI accounts)
    if (!bankName?.trim()) {
        errors.push('Bank name is required');
    }

    if (!accountNumber?.trim()) {
        errors.push('Account number is required');
    }

    if (!ifscCode?.trim()) {
        errors.push('IFSC code is required');
    }

    // Validate IFSC format
    if (ifscCode) {
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(ifscCode.toUpperCase())) {
            errors.push('Invalid IFSC code format (e.g., SBIN0001234)');
        }
    }

    // UPI-specific validation
    if (type === 'upi') {
        if (!upiId?.trim()) {
            errors.push('UPI ID is required for UPI accounts');
        }

        if (!mobileNumber?.trim()) {
            errors.push('Mobile number is required for UPI accounts');
        }

        // Validate UPI ID format
        if (upiId) {
            const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
            if (!upiRegex.test(upiId)) {
                errors.push('Invalid UPI ID format (e.g., user@paytm)');
            }
        }

        // Validate mobile number format
        if (mobileNumber) {
            const mobileRegex = /^[6-9]\d{9}$/;
            if (!mobileRegex.test(mobileNumber)) {
                errors.push('Invalid mobile number (10 digits starting with 6-9)');
            }
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Bank account validation failed',
            code: 'VALIDATION_ERROR',
            errors
        });
    }

    console.log('✅ Bank account validation passed');
    next();
};

// ✅ ENHANCED: Account update validation middleware
const validateAccountUpdate = (req, res, next) => {
    const { type, ifscCode, upiId, mobileNumber } = req.body;

    console.log('✅ Validating account update data:', { type, ifscCode, upiId, mobileNumber });

    const errors = [];

    // Validate IFSC format if provided
    if (ifscCode) {
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(ifscCode.toUpperCase())) {
            errors.push('Invalid IFSC code format (e.g., SBIN0001234)');
        }
    }

    // Validate UPI ID format if provided
    if (upiId) {
        const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
        if (!upiRegex.test(upiId)) {
            errors.push('Invalid UPI ID format (e.g., user@paytm)');
        }
    }

    // Validate mobile number format if provided
    if (mobileNumber) {
        const mobileRegex = /^[6-9]\d{9}$/;
        if (!mobileRegex.test(mobileNumber)) {
            errors.push('Invalid mobile number (10 digits starting with 6-9)');
        }
    }

    // Type-specific validation for UPI accounts
    if (type === 'upi') {
        if (!upiId && !req.body.existingUpiId) {
            errors.push('UPI ID is required for UPI accounts');
        }
        if (!mobileNumber && !req.body.existingMobileNumber) {
            errors.push('Mobile number is required for UPI accounts');
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Account update validation failed',
            code: 'UPDATE_VALIDATION_ERROR',
            errors
        });
    }

    console.log('✅ Account update validation passed');
    next();
};

// ✅ ENHANCED: Transaction validation middleware
const validateTransaction = (req, res, next) => {
    const { amount, type, reason } = req.body;

    console.log('💰 Validating transaction:', { amount, type, reason });

    // Basic validation
    if (!amount || !type) {
        return res.status(400).json({
            success: false,
            message: 'Amount and transaction type are required',
            code: 'MISSING_TRANSACTION_DATA'
        });
    }

    const transactionAmount = parseFloat(amount);
    if (isNaN(transactionAmount) || transactionAmount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Amount must be a positive number',
            code: 'INVALID_AMOUNT'
        });
    }

    // Validate transaction type
    const validTypes = ['credit', 'debit'];
    if (!validTypes.includes(type)) {
        return res.status(400).json({
            success: false,
            message: `Transaction type must be one of: ${validTypes.join(', ')}`,
            code: 'INVALID_TRANSACTION_TYPE'
        });
    }

    console.log('✅ Transaction validation passed');
    next();
};

// ✅ UPDATED: Transfer validation middleware with new transfer types
const validateTransfer = (req, res, next) => {
    const { fromAccountId, toAccountId, amount, transferType, reason } = req.body;

    console.log('🔄 Validating transfer:', { fromAccountId, toAccountId, amount, transferType, reason });

    // Check required fields
    if (!fromAccountId || !toAccountId || !amount || !transferType) {
        return res.status(400).json({
            success: false,
            message: 'From account, to account, amount, and transfer type are required',
            code: 'MISSING_TRANSFER_DATA'
        });
    }

    // Check if accounts are different
    if (fromAccountId === toAccountId) {
        return res.status(400).json({
            success: false,
            message: 'Cannot transfer to the same account',
            code: 'INVALID_TRANSFER_ACCOUNTS'
        });
    }

    // Validate amount
    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Transfer amount must be a positive number',
            code: 'INVALID_TRANSFER_AMOUNT'
        });
    }

    // ✅ UPDATED: Validate transfer type with new UPI-aware types
    const validTransferTypes = [
        'bank-to-bank',
        'bank-to-upi',
        'upi-to-bank',
        'upi-to-upi',
        // Legacy types for backward compatibility
        'transfer-bank-to-cash',
        'transfer-cash-to-bank',
        'transfer-bank-to-bank'
    ];

    if (!validTransferTypes.includes(transferType)) {
        return res.status(400).json({
            success: false,
            message: `Transfer type must be one of: ${validTransferTypes.join(', ')}`,
            code: 'INVALID_TRANSFER_TYPE',
            validTypes: validTransferTypes
        });
    }

    console.log('✅ Transfer validation passed');
    next();
};

// ✅ ENHANCED: Balance adjustment validation middleware
const validateBalanceAdjustment = (req, res, next) => {
    const { adjustmentAmount, reason } = req.body;

    console.log('⚖️ Validating balance adjustment:', { adjustmentAmount, reason });

    // Check required fields
    if (adjustmentAmount === undefined || adjustmentAmount === null) {
        return res.status(400).json({
            success: false,
            message: 'Adjustment amount is required',
            code: 'MISSING_ADJUSTMENT_AMOUNT'
        });
    }

    // Validate amount (can be positive or negative)
    const adjustment = parseFloat(adjustmentAmount);
    if (isNaN(adjustment)) {
        return res.status(400).json({
            success: false,
            message: 'Adjustment amount must be a valid number',
            code: 'INVALID_ADJUSTMENT_AMOUNT'
        });
    }

    // Optional: Add limits for adjustments if needed
    const maxAdjustment = 1000000; // 10 lakh limit
    if (Math.abs(adjustment) > maxAdjustment) {
        return res.status(400).json({
            success: false,
            message: `Adjustment amount cannot exceed ₹${maxAdjustment.toLocaleString('en-IN')}`,
            code: 'ADJUSTMENT_AMOUNT_EXCEEDED'
        });
    }

    console.log('✅ Balance adjustment validation passed');
    next();
};

// ✅ NEW: Account type validation middleware
const validateAccountType = (req, res, next) => {
    const { type } = req.query;

    if (type && !['bank', 'upi', 'all'].includes(type)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid account type filter. Must be "bank", "upi", or "all"',
            code: 'INVALID_ACCOUNT_TYPE'
        });
    }

    next();
};

// Apply middleware stack
if (process.env.NODE_ENV === 'development') {
    router.use(debugAuth);
}

router.use(validateRequest);
router.use(authenticate);
router.use(requireCompanyAccess);

// ✅ ENHANCED: Routes with proper organization and validation

// ======================
// 📊 ACCOUNT MANAGEMENT ROUTES
// ======================

// Get all bank accounts (with type filtering)
router.get('/', validateAccountType, bankAccountController.getBankAccounts);

// Get account summary/statistics
router.get('/summary', bankAccountController.getAccountSummary);

// ✅ NEW: Get UPI-enabled accounts specifically
router.get('/upi-accounts', bankAccountController.getUPIAccounts);

// Validate account details (for form validation)
router.get('/validate', bankAccountController.validateAccountDetails);

// Get single bank account
router.get('/:accountId', bankAccountController.getBankAccount);

// Create new bank account (with enhanced validation)
router.post('/', validateBankAccount, bankAccountController.createBankAccount);

// Update bank account (with enhanced validation)
router.put('/:accountId', validateAccountUpdate, bankAccountController.updateBankAccount);

// Delete bank account (soft delete)
router.delete('/:accountId', bankAccountController.deleteBankAccount);

// ======================
// 💰 TRANSACTION ROUTES
// ======================

// Update account balance (credit/debit)
router.patch('/:accountId/balance', validateTransaction, bankAccountController.updateAccountBalance);

// ✅ UPDATED: Process transfer between accounts (with UPI support)
router.post('/transfer', validateTransfer, bankAccountController.processTransfer);

// ✅ UPDATED: Adjust account balance (positive or negative adjustment)
router.patch('/:accountId/adjust-balance', validateBalanceAdjustment, bankAccountController.adjustBalance);

// ======================
// 🔄 RECONCILIATION ROUTES (Future)
// ======================

// ✅ PLACEHOLDER: Bank reconciliation routes
// router.get('/:accountId/reconciliation', bankAccountController.getReconciliationData);
// router.post('/:accountId/reconciliation', bankAccountController.processReconciliation);

// ======================
// 📈 REPORTING ROUTES (Future)
// ======================

// ✅ PLACEHOLDER: Transaction history and reporting
// router.get('/:accountId/transactions', bankAccountController.getAccountTransactions);
// router.get('/:accountId/statements', bankAccountController.getAccountStatements);
// router.get('/reports/balance-sheet', bankAccountController.getBalanceSheetReport);
// router.get('/reports/cash-flow', bankAccountController.getCashFlowReport);

// ======================
// 🔧 UTILITY ROUTES (Future)
// ======================

// ✅ PLACEHOLDER: Bulk operations
// router.post('/bulk-update', validateBulkUpdate, bankAccountController.bulkUpdateAccounts);
// router.post('/bulk-transfer', validateBulkTransfer, bankAccountController.bulkTransfer);

// ✅ PLACEHOLDER: Import/Export
// router.post('/import', validateImport, bankAccountController.importAccounts);
// router.get('/export', bankAccountController.exportAccounts);

// ✅ PLACEHOLDER: QR Code generation for UPI accounts
// router.get('/:accountId/qr-code', bankAccountController.generateUPIQRCode);

// ======================
// 🛡️ ADMIN ROUTES (Future)
// ======================

// ✅ PLACEHOLDER: Admin operations
// router.get('/admin/audit-log', requireAdmin, bankAccountController.getAuditLog);
// router.post('/admin/force-balance-sync', requireAdmin, bankAccountController.forceBalan ceSync);

// ✅ ENHANCED: Error handling middleware for bank routes
router.use((error, req, res, next) => {
    console.error('❌ Bank Account Route Error:', {
        path: req.path,
        method: req.method,
        companyId: req.companyId,
        userId: req.user?.id,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    // Handle specific error types
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error in bank account operation',
            code: 'VALIDATION_ERROR',
            errors: Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message,
                value: err.value
            }))
        });
    }

    if (error.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format',
            code: 'INVALID_ID_FORMAT',
            field: error.path,
            value: error.value
        });
    }

    if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        const fieldMap = {
            'companyId_1_accountName_1': 'Account name',
            'companyId_1_accountNumber_1': 'Account number',
            'companyId_1_upiId_1': 'UPI ID'
        };

        const friendlyField = fieldMap[Object.keys(error.keyPattern).join('_')] || field;

        return res.status(400).json({
            success: false,
            message: `${friendlyField} already exists for this company`,
            code: 'DUPLICATE_FIELD',
            field: field,
            duplicateValue: error.keyValue[field]
        });
    }

    // Handle mongoose connection errors
    if (error.name === 'MongooseError' || error.name === 'MongoError') {
        console.error('❌ Database error in bank account routes:', error);
        return res.status(503).json({
            success: false,
            message: 'Database service temporarily unavailable',
            code: 'DATABASE_ERROR'
        });
    }

    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return res.status(408).json({
            success: false,
            message: 'Request timeout - operation took too long',
            code: 'REQUEST_TIMEOUT'
        });
    }

    // Generic server error
    res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal server error in bank account operation',
        code: error.code || 'INTERNAL_SERVER_ERROR',
        ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
            details: {
                name: error.name,
                originalError: error
            }
        })
    });
});

module.exports = router;