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

// Bank Account Validation
const validateBankAccount = [
    body('accountName')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Account name is required and must be less than 100 characters'),

    body('accountNumber')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Account number must be less than 20 characters'),

    body('bankName')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Bank name must be less than 100 characters'),

    body('branchName')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Branch name must be less than 100 characters'),

    body('ifscCode')
        .optional()
        .trim()
        .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
        .withMessage('Invalid IFSC code format'),

    body('accountType')
        .optional()
        .isIn(['savings', 'current', 'cash', 'fd', 'loan'])
        .withMessage('Invalid account type'),

    body('type')
        .optional()
        .isIn(['bank', 'cash'])
        .withMessage('Invalid account type'),

    body('openingBalance')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Opening balance must be a positive number'),

    body('upiId')
        .optional()
        .trim()
        .matches(/^[\w.-]+@[\w.-]+$/)
        .withMessage('Invalid UPI ID format'),

    body('printUpiQrCodes')
        .optional()
        .isBoolean()
        .withMessage('Print UPI QR codes must be a boolean'),

    body('printBankDetails')
        .optional()
        .isBoolean()
        .withMessage('Print bank details must be a boolean'),

    // Custom validation for conditional required fields
    body().custom((value, { req }) => {
        if ((req.body.printUpiQrCodes || req.body.printBankDetails) && !req.body.accountNumber) {
            throw new Error('Account number is required when print settings are enabled');
        }
        return true;
    }),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: errors.array()
            });
        }
        next();
    }
];

const validateAccountUpdate = [
    body('accountName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Account name must be less than 100 characters'),

    body('accountNumber')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Account number must be less than 20 characters'),

    body('bankName')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Bank name must be less than 100 characters'),

    body('branchName')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Branch name must be less than 100 characters'),

    body('ifscCode')
        .optional()
        .trim()
        .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
        .withMessage('Invalid IFSC code format'),

    body('accountType')
        .optional()
        .isIn(['savings', 'current', 'cash', 'fd', 'loan'])
        .withMessage('Invalid account type'),

    body('type')
        .optional()
        .isIn(['bank', 'cash'])
        .withMessage('Invalid account type'),

    body('upiId')
        .optional()
        .trim()
        .matches(/^[\w.-]+@[\w.-]+$/)
        .withMessage('Invalid UPI ID format'),

    body('printUpiQrCodes')
        .optional()
        .isBoolean()
        .withMessage('Print UPI QR codes must be a boolean'),

    body('printBankDetails')
        .optional()
        .isBoolean()
        .withMessage('Print bank details must be a boolean'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: errors.array()
            });
        }
        next();
    }
];

module.exports = {
    validateBankAccount,
    validateAccountUpdate
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