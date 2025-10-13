const { body, validationResult } = require('express-validator');

// Validate invoice creation
exports.validateInvoice = [
  body('invoicePrefix')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Invoice prefix must be at most 10 characters'),
  
  body('invoiceNumber')
    .notEmpty()
    .withMessage('Invoice number is required')
    .trim(),
  
  body('invoiceDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid invoice date format'),
  
  body('party.partyId')
    .notEmpty()
    .withMessage('Party ID is required')
    .isMongoId()
    .withMessage('Invalid party ID'),
  
  body('party.partyType')
    .notEmpty()
    .withMessage('Party type is required')
    .isIn(['Customer', 'Vendor'])
    .withMessage('Party type must be either Customer or Vendor'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  
  body('items.*.goods')
    .notEmpty()
    .withMessage('Item name/goods is required')
    .trim(),
  
  body('items.*.quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a positive number'),
  
  body('items.*.rate')
    .notEmpty()
    .withMessage('Rate is required')
    .isFloat({ min: 0 })
    .withMessage('Rate must be a positive number'),
  
  body('items.*.gstRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('GST rate must be between 0 and 100'),
  
  body('items.*.gstType')
    .optional()
    .isIn(['include', 'exclude'])
    .withMessage('GST type must be either include or exclude'),
  
  body('items.*.discount.type')
    .optional()
    .isIn(['percentage', 'fixed'])
    .withMessage('Discount type must be either percentage or fixed'),
  
  body('items.*.discount.value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount value must be a positive number'),
  
  body('payment.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Payment amount must be a positive number'),
  
  body('payment.mode')
    .optional()
    .isIn(['Cash', 'Bank', 'UPI', 'Cheque', 'Credit Card', 'Debit Card', 'NEFT', 'RTGS', 'Other'])
    .withMessage('Invalid payment mode'),
  
  body('autoRoundOff')
    .optional()
    .isBoolean()
    .withMessage('autoRoundOff must be a boolean'),
  
  body('serviceCharge')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Service charge must be a positive number'),
  
  body('otherCharges')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Other charges must be a positive number'),
  
  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg,
          value: err.value
        }))
      });
    }
    next();
  }
];

// Validate invoice update
exports.validateInvoiceUpdate = [
  body('status')
    .optional()
    .isIn(['draft', 'pending', 'paid', 'partially_paid', 'overdue', 'cancelled', 'void'])
    .withMessage('Invalid invoice status'),
  
  body('payment.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Payment amount must be a positive number'),
  
  body('payment.mode')
    .optional()
    .isIn(['Cash', 'Bank', 'UPI', 'Cheque', 'Credit Card', 'Debit Card', 'NEFT', 'RTGS', 'Other'])
    .withMessage('Invalid payment mode'),
  
  body('items')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Items must be an array with at least one item'),
  
  body('items.*.goods')
    .optional()
    .notEmpty()
    .withMessage('Item name/goods cannot be empty')
    .trim(),
  
  body('items.*.quantity')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a positive number'),
  
  body('items.*.rate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Rate must be a positive number'),
  
  body('items.*.gstRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('GST rate must be between 0 and 100'),
  
  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg,
          value: err.value
        }))
      });
    }
    next();
  }
];

// Validate payment recording
exports.validatePayment = [
  body('amount')
    .notEmpty()
    .withMessage('Payment amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Payment amount must be greater than 0'),
  
  body('mode')
    .optional()
    .isIn(['Cash', 'Bank', 'UPI', 'Cheque', 'Credit Card', 'Debit Card', 'NEFT', 'RTGS', 'Other'])
    .withMessage('Invalid payment mode'),
  
  body('refNo')
    .optional()
    .trim(),
  
  body('depositTo')
    .optional()
    .trim(),
  
  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg,
          value: err.value
        }))
      });
    }
    next();
  }
];

module.exports = exports;