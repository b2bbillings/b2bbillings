const express = require('express');
const { body, param, query } = require('express-validator');
const partyController = require('../controllers/partyController');
const validation = require('../middleware/validation');
const { authenticate } = require('../middleware/authMiddleware'); // Import authentication middleware

const router = express.Router();

// Apply authentication to all party routes
router.use(authenticate);

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
        .isMobilePhone('any')
        .withMessage('Please provide a valid phone number')
        .isLength({ min: 10, max: 15 })
        .withMessage('Phone number must be between 10 and 15 digits'),
    
    body('partyType')
        .isIn(['customer', 'vendor', 'supplier', 'both'])
        .withMessage('Party type must be customer, vendor, supplier, or both'),
    
    body('companyName')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 100 })
        .withMessage('Company name cannot exceed 100 characters'),
    
    body('gstNumber')
        .optional({ nullable: true, checkFalsy: true })
        .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
        .withMessage('Please provide a valid GST number (15 characters: 2 digits + 5 letters + 4 digits + 1 letter + 1 alphanumeric + Z + 1 alphanumeric)'),
    
    body('openingBalance')
        .optional({ nullable: true })
        .isNumeric({ no_symbols: false })
        .withMessage('Opening balance must be a valid number'),
    
    body('openingBalanceType')
        .optional()
        .isIn(['debit', 'credit'])
        .withMessage('Opening balance type must be debit or credit'),
    
    // Address validation
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
        .isMobilePhone('any')
        .withMessage('Each phone number must be valid'),
    
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
        .isMobilePhone('any')
        .withMessage('Please provide a valid phone number')
        .isLength({ min: 10, max: 15 })
        .withMessage('Phone number must be between 10 and 15 digits'),
    
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
        .isMobilePhone('any')
        .withMessage('Please provide a valid phone number')
        .isLength({ min: 10, max: 15 })
        .withMessage('Phone number must be between 10 and 15 digits'),
    
    body('partyType')
        .optional()
        .isIn(['customer', 'vendor', 'supplier', 'both'])
        .withMessage('Party type must be customer, vendor, supplier, or both'),
    
    body('gstNumber')
        .optional({ nullable: true, checkFalsy: true })
        .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
        .withMessage('Please provide a valid GST number'),
    
    body('openingBalance')
        .optional({ nullable: true })
        .isNumeric({ no_symbols: false })
        .withMessage('Opening balance must be a valid number'),
    
    body('openingBalanceType')
        .optional()
        .isIn(['debit', 'credit'])
        .withMessage('Opening balance type must be debit or credit')
];

// Parameter validation for routes with ID
const idValidationRules = [
    param('id')
        .isMongoId()
        .withMessage('Invalid party ID format')
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
        .isIn(['name', 'createdAt', 'updatedAt', 'currentBalance', 'partyType'])
        .withMessage('Sort by must be name, createdAt, updatedAt, currentBalance, or partyType'),
    
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