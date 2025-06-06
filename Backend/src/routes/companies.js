const express = require('express');
const { body } = require('express-validator');
const {
    createCompany,
    getAllCompanies,
    getCompanyById,
    updateCompany,
    deleteCompany
} = require('../controllers/companyController');
const { authenticate } = require('../middleware/authMiddleware'); // Import authentication middleware

const router = express.Router();

// Business categories for validation
const businessCategories = [
    'Accounting & CA', 'Interior Designer', 'Automobiles / Auto Parts', 'Salon / Spa',
    'Liquor Store', 'Book / Stationary Store', 'Construction Materials & Equipment',
    'Repairing Plumbing & Electrician', 'Chemical & Fertilizer', 'Computer Equipment & Software',
    'Electrical & Electronics Equipment', 'Fashion Accessory / Cosmetics', 'Tailoring / Boutique',
    'Fruit and Vegetable', 'Kirana / General Merchant', 'FMCG Products',
    'Dairy Farm Products / Poultry', 'Furniture', 'Garment / Fashion & Hosiery',
    'Jewellery & Gems', 'Pharmacy / Medical', 'Hardware Store', 'Mobile & Accessories',
    'Nursery / Plants', 'Petroleum Bulk Stations & Terminals / Petrol', 'Restaurant / Hotel',
    'Footwear', 'Paper & Paper Products', 'Sweet Shop / Bakery', 'Gift & Toys',
    'Laundry / Washing / Dry Clean', 'Coaching & Training', 'Renting & Leasing',
    'Fitness Center', 'Oil & Gas', 'Real Estate', 'NGO & Charitable Trust',
    'Tours & Travels', 'Other'
];

const businessTypes = ['Retail', 'Wholesale', 'Distributor', 'Service', 'Manufacturing', 'Others'];

// Validation rules for creating company
const createCompanyValidation = [
    body('businessName')
        .notEmpty()
        .withMessage('Business name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Business name must be between 2 and 100 characters'),
    
    body('phoneNumber')
        .notEmpty()
        .withMessage('Phone number is required')
        .matches(/^[0-9]{10}$/)
        .withMessage('Please enter a valid 10-digit phone number'),
    
    body('additionalPhones')
        .optional()
        .isArray()
        .withMessage('Additional phones must be an array'),
    
    body('additionalPhones.*')
        .optional()
        .matches(/^[0-9]{10}$/)
        .withMessage('Please enter valid 10-digit phone numbers'),
    
    body('email')
        .optional()
        .isEmail()
        .withMessage('Please enter a valid email')
        .normalizeEmail(),
    
    body('businessType')
        .optional()
        .isIn(businessTypes)
        .withMessage('Invalid business type'),
    
    body('businessCategory')
        .optional()
        .isIn(businessCategories)
        .withMessage('Invalid business category'),
    
    body('gstin')
        .optional()
        .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
        .withMessage('Please enter a valid GSTIN'),
    
    body('pincode')
        .optional()
        .matches(/^[0-9]{6}$/)
        .withMessage('Please enter a valid 6-digit pincode'),
    
    body('state')
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage('State name must be between 2 and 50 characters'),
    
    body('city')
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage('City name must be between 2 and 50 characters'),
    
    body('tehsil')
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage('Tehsil name must be between 2 and 50 characters'),
    
    body('address')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Address cannot exceed 200 characters'),
    
    body('logo')
        .optional()
        .isString()
        .withMessage('Logo must be a valid base64 string'),
    
    body('signatureImage')
        .optional()
        .isString()
        .withMessage('Signature image must be a valid base64 string')
];

// @route   POST /api/companies
// @desc    Create a new company
// @access  Private (requires authentication)
router.post('/', authenticate, createCompanyValidation, createCompany);

// @route   GET /api/companies
// @desc    Get all companies with pagination and filters
// @access  Private (requires authentication)
router.get('/', authenticate, getAllCompanies);

// @route   GET /api/companies/:id
// @desc    Get company by ID
// @access  Private (requires authentication)
router.get('/:id', authenticate, getCompanyById);

// @route   PUT /api/companies/:id
// @desc    Update company
// @access  Private (requires authentication)
router.put('/:id', authenticate, createCompanyValidation, updateCompany);

// @route   DELETE /api/companies/:id
// @desc    Delete company
// @access  Private (requires authentication)
router.delete('/:id', authenticate, deleteCompany);

module.exports = router;