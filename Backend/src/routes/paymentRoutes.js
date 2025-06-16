const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Import controller functions
const {
    createPaymentIn,
    createPaymentOut,
    getPayments,
    getPaymentById,
    getPartyPaymentSummary,
    cancelPayment,
    getPendingInvoicesForPayment
} = require('../controllers/paymentController');

// Authentication middleware (replace with real auth)
const auth = (req, res, next) => {
    // TODO: Replace with actual JWT authentication
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. No token provided.'
        });
    }

    try {
        // TODO: Verify JWT token here
        // For now, using placeholder user data
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

// Validation middleware for payment creation
const validatePayment = [
    body('partyId')
        .isMongoId()
        .withMessage('Invalid party ID'),
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0'),
    body('paymentMethod')
        .isIn(['cash', 'bank_transfer', 'cheque', 'card', 'upi', 'other'])
        .withMessage('Invalid payment method'),
    body('paymentDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid payment date'),
    body('paymentType')
        .optional()
        .isIn(['advance', 'pending'])
        .withMessage('Invalid payment type'),
    body('saleOrderId')
        .optional()
        .isMongoId()
        .withMessage('Invalid sale order ID'),
    body('bankAccountId')
        .optional()
        .isMongoId()
        .withMessage('Invalid bank account ID'),
    body('reference')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Reference too long'),
    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Notes too long'),
    body('employeeName')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Employee name too long'),
    body('companyId')
        .optional()
        .isMongoId()
        .withMessage('Invalid company ID')
];

// Validation for payment cancellation
const validateCancelPayment = [
    body('reason')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Reason too long')
];

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation error handler middleware
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

// ================================
// 📋 PENDING INVOICES ROUTES
// ================================

// Get pending invoices for payment
router.get('/pending-invoices/:partyId',
    auth,
    asyncHandler(getPendingInvoicesForPayment)
);

// ================================
// 💰 PAYMENT CREATION ROUTES
// ================================

// Create Payment In (Customer pays us)
router.post('/pay-in',
    auth,
    validatePayment,
    handleValidationErrors,
    asyncHandler(createPaymentIn)
);

// Create Payment Out (We pay supplier)
router.post('/pay-out',
    auth,
    validatePayment,
    handleValidationErrors,
    asyncHandler(createPaymentOut)
);

// ================================
// 📊 PAYMENT RETRIEVAL ROUTES
// ================================

// Get all payments with filtering and pagination
router.get('/',
    auth,
    asyncHandler(getPayments)
);

// Get specific payment by ID
router.get('/:paymentId',
    auth,
    asyncHandler(getPaymentById)
);

// ================================
// 📈 PARTY SUMMARY ROUTES
// ================================

// Get party payment summary
router.get('/party/:partyId/summary',
    auth,
    asyncHandler(getPartyPaymentSummary)
);

// ================================
// 🔧 PAYMENT MANAGEMENT ROUTES
// ================================

// Cancel payment with reason
router.patch('/:paymentId/cancel',
    auth,
    validateCancelPayment,
    handleValidationErrors,
    asyncHandler(cancelPayment)
);

// ================================
// ❌ ERROR HANDLING MIDDLEWARE
// ================================

// Enhanced error handler for payment routes
router.use((error, req, res, next) => {
    console.error('❌ Payment Route Error:', {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Validation errors
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message,
                value: err.value
            }))
        });
    }

    // MongoDB Cast errors (invalid ObjectId)
    if (error.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format',
            error: `Invalid ${error.path}: ${error.value}`,
            field: error.path
        });
    }

    // MongoDB Duplicate key errors
    if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        const value = error.keyValue[field];
        return res.status(409).json({
            success: false,
            message: 'Duplicate entry',
            error: `${field} '${value}' already exists`,
            field: field,
            value: value
        });
    }

    // Authentication errors
    if (error.name === 'UnauthorizedError' || error.status === 401) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
            error: 'Please login to access this resource'
        });
    }

    // Authorization errors
    if (error.status === 403) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
            error: 'You do not have permission to perform this action'
        });
    }

    // Not found errors
    if (error.status === 404) {
        return res.status(404).json({
            success: false,
            message: 'Resource not found',
            error: error.message || 'The requested resource could not be found'
        });
    }

    // Rate limiting errors
    if (error.status === 429) {
        return res.status(429).json({
            success: false,
            message: 'Too many requests',
            error: 'Please try again later'
        });
    }

    // Default server error
    res.status(error.status || 500).json({
        success: false,
        message: 'Payment system error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        errorId: new Date().getTime(),
        ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack?.split('\n').slice(0, 10),
            route: req.route?.path,
            originalUrl: req.originalUrl
        })
    });
});

// ================================
// 📍 ROUTE NOT FOUND HANDLER
// ================================

// Handle unmatched payment routes
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Payment route not found',
        availableRoutes: [
            'GET /payments/pending-invoices/:partyId - Get pending invoices',
            'POST /payments/pay-in - Create payment in',
            'POST /payments/pay-out - Create payment out',
            'GET /payments - Get all payments',
            'GET /payments/:paymentId - Get payment by ID',
            'GET /payments/party/:partyId/summary - Get party payment summary',
            'PATCH /payments/:paymentId/cancel - Cancel payment'
        ],
        requestedUrl: req.originalUrl,
        method: req.method
    });
});

module.exports = router;