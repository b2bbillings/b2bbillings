const { body, validationResult } = require('express-validator');

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg);
        return res.status(400).json({
            success: false,
            message: errorMessages[0], // Send first error message
            errors: errorMessages
        });
    }

    next();
};

// Validation rules for user signup
const validateSignup = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Name can only contain letters and spaces'),

    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/)
        .withMessage('Password must contain at least one letter and one number'),

    body('phone')
        .trim()
        .notEmpty()
        .withMessage('Phone number is required')
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),

    body('companyName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Company name must be between 2 and 100 characters'),

    body('companyAddress')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Company address cannot exceed 500 characters'),

    handleValidationErrors
];

// Validation rules for user login
const validateLogin = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),

    body('password')
        .notEmpty()
        .withMessage('Password is required'),

    handleValidationErrors
];

module.exports = {
    validateSignup,
    validateLogin,
    handleValidationErrors
};