const { body, query, param } = require('express-validator');

// Customer validation rules
const customerValidation = {
  // Create customer validation
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    
    body('phone')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required')
      .matches(/^\d{10}$/)
      .withMessage('Please enter a valid 10-digit mobile number'),
    
    body('alternatePhone')
      .optional()
      .trim()
      .matches(/^\d{10}$/)
      .withMessage('Please enter a valid 10-digit mobile number'),
    
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Please enter a valid email address')
      .normalizeEmail(),
    
    body('webLink')
      .optional()
      .trim()
      .isURL()
      .withMessage('Please enter a valid website URL'),
    
    body('company')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Company name cannot exceed 200 characters'),
    
    // Billing address validation
    body('billingAddress.shopAddress')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Shop address cannot exceed 500 characters'),
    
    body('billingAddress.pincode')
      .optional()
      .trim()
      .matches(/^[1-9][0-9]{5}$/)
      .withMessage('Please enter a valid 6-digit pincode'),
    
    body('billingAddress.villageColony')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Village/Colony cannot exceed 100 characters'),
    
    body('billingAddress.tahsilTaluka')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Tahsil/Taluka cannot exceed 100 characters'),
    
    body('billingAddress.district')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('District cannot exceed 100 characters'),
    
    body('billingAddress.state')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('State cannot exceed 100 characters'),
    
    // Opening balance validation
    body('openingBalance.type')
      .optional()
      .isIn(['credit', 'debit'])
      .withMessage('Balance type must be either credit or debit'),
    
    body('openingBalance.amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Opening balance amount must be a positive number'),
    
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes cannot exceed 1000 characters')
  ],

  // Update customer validation (same as create but less strict)
  update: [
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Name cannot be empty')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    
    body('phone')
      .optional()
      .trim()
      .matches(/^\d{10}$/)
      .withMessage('Please enter a valid 10-digit mobile number'),
    
    body('alternatePhone')
      .optional()
      .trim()
      .matches(/^\d{10}$/)
      .withMessage('Please enter a valid 10-digit mobile number'),
    
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Please enter a valid email address')
      .normalizeEmail(),
    
    body('webLink')
      .optional()
      .trim()
      .isURL()
      .withMessage('Please enter a valid website URL'),
    
    body('company')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Company name cannot exceed 200 characters'),
    
    body('openingBalance.type')
      .optional()
      .isIn(['credit', 'debit'])
      .withMessage('Balance type must be either credit or debit'),
    
    body('openingBalance.amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Opening balance amount must be a positive number')
  ],

  // Search validation
  search: [
    query('query')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Search query must be between 2 and 100 characters')
  ],

  // Balance update validation
  updateBalance: [
    body('amount')
      .notEmpty()
      .withMessage('Amount is required')
      .isFloat({ gt: 0 })
      .withMessage('Amount must be a positive number'),
    
    body('type')
      .notEmpty()
      .withMessage('Type is required')
      .isIn(['credit', 'debit'])
      .withMessage('Type must be either credit or debit'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters')
  ]
};

// Vendor validation rules
const vendorValidation = {
  // Create vendor validation
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    
    body('phone')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required')
      .matches(/^\d{10}$/)
      .withMessage('Please enter a valid 10-digit mobile number'),
    
    body('alternatePhone')
      .optional()
      .trim()
      .matches(/^\d{10}$/)
      .withMessage('Please enter a valid 10-digit mobile number'),
    
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Please enter a valid email address')
      .normalizeEmail(),
    
    body('webLink')
      .optional()
      .trim()
      .isURL()
      .withMessage('Please enter a valid website URL'),
    
    body('company')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Company name cannot exceed 200 characters'),
    
    body('gstType')
      .optional()
      .isIn(['unregistered', 'regular', 'composition'])
      .withMessage('GST type must be unregistered, regular, or composition'),
    
    body('gstin')
      .optional()
      .trim()
      .custom((value, { req }) => {
        if (req.body.gstType && req.body.gstType !== 'unregistered') {
          if (!value) {
            throw new Error('GSTIN is required for registered GST types');
          }
          if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value)) {
            throw new Error('Invalid GSTIN format');
          }
        }
        return true;
      }),
    
    body('vendorType')
      .optional()
      .isIn(['supplier', 'service_provider', 'contractor', 'consultant'])
      .withMessage('Vendor type must be supplier, service_provider, contractor, or consultant'),
    
    body('paymentTerms')
      .optional()
      .isIn(['immediate', '15_days', '30_days', '45_days', '60_days', '90_days'])
      .withMessage('Invalid payment terms'),
    
    // Billing address validation
    body('billingAddress.shopAddress')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Shop address cannot exceed 500 characters'),
    
    body('billingAddress.pincode')
      .optional()
      .trim()
      .matches(/^[1-9][0-9]{5}$/)
      .withMessage('Please enter a valid 6-digit pincode'),
    
    // Opening balance validation
    body('openingBalance.type')
      .optional()
      .isIn(['credit', 'debit'])
      .withMessage('Balance type must be either credit or debit'),
    
    body('openingBalance.amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Opening balance amount must be a positive number'),
    
    body('minBalance')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum balance must be a positive number'),
    
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes cannot exceed 1000 characters')
  ],

  // Update vendor validation
  update: [
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Name cannot be empty')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    
    body('phone')
      .optional()
      .trim()
      .matches(/^\d{10}$/)
      .withMessage('Please enter a valid 10-digit mobile number'),
    
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Please enter a valid email address')
      .normalizeEmail(),
    
    body('gstType')
      .optional()
      .isIn(['unregistered', 'regular', 'composition'])
      .withMessage('GST type must be unregistered, regular, or composition'),
    
    body('gstin')
      .optional()
      .trim()
      .custom((value, { req }) => {
        if (req.body.gstType && req.body.gstType !== 'unregistered') {
          if (!value) {
            throw new Error('GSTIN is required for registered GST types');
          }
          if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value)) {
            throw new Error('Invalid GSTIN format');
          }
        }
        return true;
      }),
    
    body('vendorType')
      .optional()
      .isIn(['supplier', 'service_provider', 'contractor', 'consultant'])
      .withMessage('Vendor type must be supplier, service_provider, contractor, or consultant'),
    
    body('paymentTerms')
      .optional()
      .isIn(['immediate', '15_days', '30_days', '45_days', '60_days', '90_days'])
      .withMessage('Invalid payment terms')
  ],

  // Search validation
  search: [
    query('query')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Search query must be between 2 and 100 characters')
  ],

  // Balance update validation
  updateBalance: [
    body('amount')
      .notEmpty()
      .withMessage('Amount is required')
      .isFloat({ gt: 0 })
      .withMessage('Amount must be a positive number'),
    
    body('type')
      .notEmpty()
      .withMessage('Type is required')
      .isIn(['credit', 'debit'])
      .withMessage('Type must be either credit or debit'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters')
  ],

  // Validate GSTIN
  validateGstin: [
    body('gstin')
      .trim()
      .notEmpty()
      .withMessage('GSTIN is required')
      .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
      .withMessage('Invalid GSTIN format')
  ]
};

// Common validation rules
const commonValidation = {
  // MongoDB ObjectId validation
  mongoId: [
    param('id')
      .isMongoId()
      .withMessage('Invalid ID format')
  ],

  // Pagination validation
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('sortBy')
      .optional()
      .isIn(['name', 'phone', 'email', 'company', 'createdAt', 'updatedAt', 'currentBalance'])
      .withMessage('Invalid sort field'),
    
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ]
};

module.exports = {
  customerValidation,
  vendorValidation,
  commonValidation
};