const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const {
    createPaymentIn,
    createPaymentOut,
    getPayments,
    getPaymentById,
    getPartyPaymentSummary,
    cancelPayment,
    getPendingInvoicesForPayment,
    getPendingPurchaseInvoicesForPayment,
    getPaymentAllocations,
    updateTransaction,
    deleteTransaction
} = require('../controllers/paymentController');

// Authentication middleware
const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. No token provided.'
        });
    }

    try {
        req.user = {
            id: '507f1f77bcf86cd799439011',
            email: 'user@example.com',
            name: 'User',
            companyId: '507f1f77bcf86cd799439012'
        };
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

// Payment validation
const validatePayment = [
    body('partyId').isMongoId().withMessage('Invalid party ID'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('paymentMethod').isIn(['cash', 'bank_transfer', 'cheque', 'card', 'upi']).withMessage('Invalid payment method'),
    body('paymentDate').optional().isISO8601().withMessage('Invalid payment date'),
    body('bankAccountId').optional().isMongoId().withMessage('Invalid bank account ID'),
    body('reference').optional().isLength({ max: 100 }).withMessage('Reference too long'),
    body('notes').optional().isLength({ max: 500 }).withMessage('Notes too long'),
    body('companyId').optional().isMongoId().withMessage('Invalid company ID')
];

// Transaction update validation
const validateTransactionUpdate = [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('paymentMethod').isIn(['cash', 'bank_transfer', 'cheque', 'card', 'upi']).withMessage('Invalid payment method'),
    body('paymentDate').isISO8601().withMessage('Payment date is required'),
    body('status').optional().isIn(['completed', 'pending', 'failed', 'cancelled']).withMessage('Invalid status'),
    body('bankAccountId').optional().isMongoId().withMessage('Invalid bank account ID'),
    body('reference').optional().isLength({ max: 100 }).withMessage('Reference too long'),
    body('notes').optional().isLength({ max: 500 }).withMessage('Notes too long')
];

const validateCancelPayment = [
    body('reason').optional().isLength({ max: 500 }).withMessage('Reason too long')
];

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(error => ({
                field: error.param,
                message: error.msg,
                value: error.value
            }))
        });
    }
    next();
};

// Pending invoices routes
router.get('/pending-invoices/:partyId', auth, asyncHandler(getPendingInvoicesForPayment));
router.get('/pending-purchase-invoices/:partyId', auth, asyncHandler(getPendingPurchaseInvoicesForPayment));

// Payment creation routes
router.post('/pay-in', auth, validatePayment, handleValidationErrors, asyncHandler(createPaymentIn));
router.post('/pay-out', auth, validatePayment, handleValidationErrors, asyncHandler(createPaymentOut));

// Payment retrieval routes
router.get('/', auth, asyncHandler(getPayments));
router.get('/:paymentId', auth, asyncHandler(getPaymentById));

// Party summary route
router.get('/party/:partyId/summary', auth, asyncHandler(getPartyPaymentSummary));

// Payment allocation routes
router.get('/:paymentId/allocations', auth, asyncHandler(getPaymentAllocations));

// Transaction management routes
router.put('/transactions/:transactionId', auth, validateTransactionUpdate, handleValidationErrors, asyncHandler(updateTransaction));
router.delete('/transactions/:transactionId', auth, asyncHandler(deleteTransaction));

// Payment cancellation route
router.patch('/:paymentId/cancel', auth, validateCancelPayment, handleValidationErrors, asyncHandler(cancelPayment));

// Error handling middleware
router.use((error, req, res, next) => {
    // Validation errors
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message
            }))
        });
    }

    // Invalid ObjectId
    if (error.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format',
            field: error.path
        });
    }

    // Duplicate key
    if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return res.status(409).json({
            success: false,
            message: 'Duplicate entry',
            field: field
        });
    }

    // Auth errors
    if (error.name === 'UnauthorizedError' || error.status === 401) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    // Not found
    if (error.status === 404) {
        return res.status(404).json({
            success: false,
            message: 'Resource not found'
        });
    }

    // Default error
    res.status(error.status || 500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
});

// Route not found handler
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Payment route not found',
        requestedUrl: req.originalUrl,
        method: req.method
    });
});

module.exports = router;