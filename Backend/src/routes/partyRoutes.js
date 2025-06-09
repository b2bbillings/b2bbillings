const express = require('express');
const { body, param, query } = require('express-validator');
const partyController = require('../controllers/partyController');
const validation = require('../middleware/validation');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply optional authentication to all party routes (for testing)
router.use(optionalAuth);

// Validation rules for party creation/update
const partyValidationRules = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s\.\-']+$/)
        .withMessage('Name can only contain letters, spaces, dots, hyphens, and apostrophes'),

    body('email')
        .optional({ nullable: true, checkFalsy: true })
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),

    body('phoneNumber')
        .matches(/^[6-9]\d{9}$/)
        .withMessage('Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9'),

    body('partyType')
        .isIn(['customer', 'vendor', 'supplier', 'both'])
        .withMessage('Party type must be customer, vendor, supplier, or both'),

    body('companyName')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 100 })
        .withMessage('Company name cannot exceed 100 characters'),

    // GST validation with conditional logic
    body('gstType')
        .isIn(['unregistered', 'regular', 'composition'])
        .withMessage('GST type must be unregistered, regular, or composition'),

    body('gstNumber')
        .optional({ nullable: true, checkFalsy: true })
        .custom((value, { req }) => {
            // Only validate GST number if type is not unregistered and value is provided
            if (req.body.gstType !== 'unregistered' && value) {
                if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value.toUpperCase())) {
                    throw new Error('Please provide a valid GST number format (e.g., 22AAAAA0000A1Z5)');
                }
            }
            return true;
        }),

    // Financial fields
    body('creditLimit')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('Credit limit must be zero or positive'),

    body('openingBalance')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('Opening balance must be zero or positive'),

    // Removed openingBalanceType validation as it's no longer used

    body('country')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Country name cannot exceed 50 characters'),

    // Home Address validation
    body('homeAddressLine')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 200 })
        .withMessage('Home address line cannot exceed 200 characters'),

    body('homePincode')
        .optional({ nullable: true, checkFalsy: true })
        .matches(/^[0-9]{6}$/)
        .withMessage('Pincode must be exactly 6 digits'),

    body('homeState')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 50 })
        .withMessage('State name cannot exceed 50 characters'),

    body('homeDistrict')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 50 })
        .withMessage('District name cannot exceed 50 characters'),

    body('homeTaluka')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 50 })
        .withMessage('Taluka name cannot exceed 50 characters'),

    // Delivery Address validation
    body('deliveryAddressLine')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 200 })
        .withMessage('Delivery address line cannot exceed 200 characters'),

    body('deliveryPincode')
        .optional({ nullable: true, checkFalsy: true })
        .matches(/^[0-9]{6}$/)
        .withMessage('Delivery pincode must be exactly 6 digits'),

    body('deliveryState')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 50 })
        .withMessage('Delivery state name cannot exceed 50 characters'),

    body('deliveryDistrict')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 50 })
        .withMessage('Delivery district name cannot exceed 50 characters'),

    body('deliveryTaluka')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 50 })
        .withMessage('Delivery taluka name cannot exceed 50 characters'),

    body('sameAsHomeAddress')
        .optional()
        .isBoolean()
        .withMessage('Same as home address must be true or false'),

    // Phone numbers array validation
    body('phoneNumbers')
        .optional()
        .isArray()
        .withMessage('Phone numbers must be an array'),

    body('phoneNumbers.*.number')
        .optional()
        .matches(/^[6-9]\d{9}$/)
        .withMessage('Each phone number must be a valid 10-digit number starting with 6, 7, 8, or 9'),

    body('phoneNumbers.*.label')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 20 })
        .withMessage('Phone number label cannot exceed 20 characters')
];

// Quick add validation rules (minimal validation for quick entry)
const quickAddValidationRules = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s\.\-']+$/)
        .withMessage('Name can only contain letters, spaces, dots, hyphens, and apostrophes'),

    body('phone')
        .matches(/^[6-9]\d{9}$/)
        .withMessage('Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9'),

    body('type')
        .optional()
        .isIn(['customer', 'vendor', 'supplier', 'both'])
        .withMessage('Party type must be customer, vendor, supplier, or both')
];

// Update validation rules (similar to create but allows partial updates)
const updateValidationRules = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s\.\-']+$/)
        .withMessage('Name can only contain letters, spaces, dots, hyphens, and apostrophes'),

    body('email')
        .optional({ nullable: true, checkFalsy: true })
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),

    body('phoneNumber')
        .optional()
        .matches(/^[6-9]\d{9}$/)
        .withMessage('Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9'),

    body('partyType')
        .optional()
        .isIn(['customer', 'vendor', 'supplier', 'both'])
        .withMessage('Party type must be customer, vendor, supplier, or both'),

    body('companyName')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 100 })
        .withMessage('Company name cannot exceed 100 characters'),

    // GST validation for updates
    body('gstType')
        .optional()
        .isIn(['unregistered', 'regular', 'composition'])
        .withMessage('GST type must be unregistered, regular, or composition'),

    body('gstNumber')
        .optional({ nullable: true, checkFalsy: true })
        .custom((value, { req }) => {
            // Only validate GST number if type is not unregistered and value is provided
            if (req.body.gstType !== 'unregistered' && value) {
                if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value.toUpperCase())) {
                    throw new Error('Please provide a valid GST number format (e.g., 22AAAAA0000A1Z5)');
                }
            }
            return true;
        }),

    // Financial fields for updates
    body('creditLimit')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('Credit limit must be zero or positive'),

    body('openingBalance')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('Opening balance must be zero or positive'),

    // Address validation for updates
    body('homeAddressLine')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 200 })
        .withMessage('Home address line cannot exceed 200 characters'),

    body('homePincode')
        .optional({ nullable: true, checkFalsy: true })
        .matches(/^[0-9]{6}$/)
        .withMessage('Pincode must be exactly 6 digits'),

    body('deliveryAddressLine')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 200 })
        .withMessage('Delivery address line cannot exceed 200 characters'),

    body('deliveryPincode')
        .optional({ nullable: true, checkFalsy: true })
        .matches(/^[0-9]{6}$/)
        .withMessage('Delivery pincode must be exactly 6 digits'),

    body('sameAsHomeAddress')
        .optional()
        .isBoolean()
        .withMessage('Same as home address must be true or false'),

    // Phone numbers array validation for updates
    body('phoneNumbers')
        .optional()
        .isArray()
        .withMessage('Phone numbers must be an array'),

    body('phoneNumbers.*.number')
        .optional()
        .matches(/^[6-9]\d{9}$/)
        .withMessage('Each phone number must be a valid 10-digit number starting with 6, 7, 8, or 9'),

    body('phoneNumbers.*.label')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 20 })
        .withMessage('Phone number label cannot exceed 20 characters')
];

// Parameter validation for routes with ID
const idValidationRules = [
    param('id')
        .isMongoId()
        .withMessage('Invalid party ID format')
];

// Phone number parameter validation
const phoneValidationRules = [
    param('phoneNumber')
        .matches(/^[6-9]\d{9}$/)
        .withMessage('Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9')
];

// Query parameter validation for search and filtering
const queryValidationRules = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),

    query('search')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Search query cannot exceed 100 characters'),

    query('type')
        .optional()
        .isIn(['all', 'customer', 'vendor', 'supplier', 'both'])
        .withMessage('Type filter must be all, customer, vendor, supplier, or both'),

    query('sortBy')
        .optional()
        .isIn(['name', 'createdAt', 'updatedAt', 'currentBalance', 'partyType', 'creditLimit', 'gstType'])
        .withMessage('Sort by must be name, createdAt, updatedAt, currentBalance, partyType, creditLimit, or gstType'),

    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc')
];

// Search parameter validation
const searchValidationRules = [
    param('query')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Search query must be between 2 and 100 characters')
        .matches(/^[a-zA-Z0-9\s\.\-@]+$/)
        .withMessage('Search query contains invalid characters'),

    query('type')
        .optional()
        .isIn(['all', 'customer', 'vendor', 'supplier', 'both'])
        .withMessage('Type filter must be all, customer, vendor, supplier, or both'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50')
];

// Routes with validation and error handling

// Create new party
router.post('/',
    partyValidationRules,
    validation.handleValidationErrors,
    partyController.createParty
);

// Create quick party
router.post('/quick',
    quickAddValidationRules,
    validation.handleValidationErrors,
    partyController.createQuickParty
);

// Check if phone number exists (new route)
router.get('/check-phone/:phoneNumber',
    phoneValidationRules,
    validation.handleValidationErrors,
    partyController.checkPhoneExists
);

// Get party statistics (before other GET routes to avoid conflicts)
router.get('/stats',
    partyController.getPartyStats
);

// Search parties (before /:id route to avoid conflicts)
router.get('/search/:query',
    searchValidationRules,
    validation.handleValidationErrors,
    partyController.searchParties
);

// Get all parties with filtering and pagination
router.get('/',
    queryValidationRules,
    validation.handleValidationErrors,
    partyController.getAllParties
);

// Get party by ID
router.get('/:id',
    idValidationRules,
    validation.handleValidationErrors,
    partyController.getPartyById
);

// Update party
router.put('/:id',
    idValidationRules.concat(updateValidationRules),
    validation.handleValidationErrors,
    partyController.updateParty
);

// Delete party (soft delete)
router.delete('/:id',
    idValidationRules,
    validation.handleValidationErrors,
    partyController.deleteParty
);

module.exports = router;