const express = require('express');
const { body } = require('express-validator');
const { 
    signup, 
    login, 
    logout, 
    verifyToken
    // refreshToken,
    // forgotPassword,
    // resetPassword,
    // changePassword,
    // getProfile,
    // updateProfile
} = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware'); // Use 'authenticate' to match your middleware

const router = express.Router();

// Validation rules for signup
const signupValidation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Name can only contain letters and spaces'),
    
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    
    body('phoneNumber')
        .matches(/^[0-9]{10}$/)
        .withMessage('Phone number must be exactly 10 digits')
];

// Validation rules for login
const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

// ==========================================
// PUBLIC ROUTES (No authentication required)
// ==========================================

// @desc    User signup/registration
// @route   POST /api/auth/signup
// @access  Public
router.post('/signup', signupValidation, signup);

// @desc    User login
// @route   POST /api/auth/login
// @access  Public
router.post('/login', loginValidation, login);

// ==========================================
// PROTECTED ROUTES (Authentication required)
// ==========================================

// @desc    Verify JWT token
// @route   GET /api/auth/verify
// @access  Private
router.get('/verify', authenticate, verifyToken);

// @desc    User logout
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', authenticate, logout);

// ==========================================
// UTILITY ROUTES
// ==========================================

// @desc    Check if email exists
// @route   GET /api/auth/check-email/:email
// @access  Public
router.get('/check-email/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const User = require('../models/User');
        
        const existingUser = await User.findOne({ 
            email: email.toLowerCase() 
        }).select('_id');
        
        res.status(200).json({
            success: true,
            status: 'success',
            data: {
                exists: !!existingUser,
                email: email.toLowerCase()
            }
        });
    } catch (error) {
        console.error('❌ Check Email Error:', error);
        res.status(500).json({
            success: false,
            status: 'error',
            message: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});

// @desc    Health check for auth service
// @route   GET /api/auth/health
// @access  Public
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'success',
        message: 'Auth service is running',
        timestamp: new Date().toISOString(),
        data: {
            service: 'Authentication',
            version: '1.0.0',
            uptime: process.uptime()
        }
    });
});

// ==========================================
// ERROR HANDLING MIDDLEWARE
// ==========================================

// Catch-all for invalid auth routes
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        status: 'error',
        message: `Authentication route ${req.originalUrl} not found`,
        code: 'ROUTE_NOT_FOUND'
    });
});

module.exports = router;