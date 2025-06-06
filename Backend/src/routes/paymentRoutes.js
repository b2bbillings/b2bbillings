const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

console.log('🔧 Payment Routes loading...');

// Import the controller functions directly
const {
    createPaymentIn,
    createPaymentOut,
    getPayments,
    getPaymentById,
    getPartyPaymentSummary,
    cancelPayment,
    testPayments
} = require('../controllers/paymentController');

// Mock authentication middleware for testing
const mockAuth = (req, res, next) => {
    req.user = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        name: 'Test User',
        companyId: '507f1f77bcf86cd799439012'
    };
    console.log('🔑 Mock auth applied for payment route');
    next();
};

// Validation middleware
const validatePayment = [
    body('partyId').isMongoId().withMessage('Invalid party ID'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('paymentMethod').isIn(['cash', 'bank_transfer', 'cheque', 'card', 'upi', 'other']).withMessage('Invalid payment method'),
    body('paymentDate').optional().isISO8601().withMessage('Invalid payment date'),
    body('reference').optional().isLength({ max: 100 }).withMessage('Reference too long'),
    body('notes').optional().isLength({ max: 500 }).withMessage('Notes too long')
];

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Test route
router.get('/test', asyncHandler(testPayments));

// Payment Creation Routes with validation
router.post('/pay-in', mockAuth, validatePayment, asyncHandler(createPaymentIn));
router.post('/pay-out', mockAuth, validatePayment, asyncHandler(createPaymentOut));

// Payment Retrieval Routes - MAIN ROUTE FOR TRANSACTION TABLE
router.get('/', mockAuth, asyncHandler(getPayments));
router.get('/:paymentId', mockAuth, asyncHandler(getPaymentById));

// Party Payment Summary
router.get('/party/:partyId/summary', mockAuth, asyncHandler(getPartyPaymentSummary));

// Payment Management
router.patch('/:paymentId/cancel', mockAuth, asyncHandler(cancelPayment));

// Global error handler for payment routes
router.use((error, req, res, next) => {
    console.error('❌ Payment Route Error:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
    });
    
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: Object.values(error.errors).map(err => err.message)
        });
    }
    
    if (error.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format',
            error: error.message
        });
    }
    
    res.status(500).json({
        success: false,
        message: 'Payment system error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
});

console.log('✅ Payment Routes loaded successfully');

module.exports = router;