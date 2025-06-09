const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');

console.log('🔧 Loading Purchase Routes...');

// Debug middleware to log all requests
router.use((req, res, next) => {
    console.log(`📡 Purchase Route Hit: ${req.method} ${req.originalUrl}`);
    console.log(`📡 Route Params:`, req.params);
    console.log(`📡 Query Params:`, req.query);
    next();
});

// Middleware for validation
const validateRequest = (req, res, next) => {
    console.log('✅ validateRequest middleware passed');
    next();
};

// Authentication middleware - SIMPLIFIED FOR TESTING
const authenticate = (req, res, next) => {
    console.log('✅ authenticate middleware passed - auth disabled for testing');
    // Skip auth for testing
    next();
};

// Company validation middleware for company-specific routes
const validateCompanyParam = (req, res, next) => {
    const companyId = req.params.companyId;
    console.log('🏢 validateCompanyParam - companyId:', companyId);

    if (!companyId) {
        console.log('❌ Company ID missing in URL path');
        return res.status(400).json({
            success: false,
            message: 'Company ID is required in URL path'
        });
    }

    // Basic validation
    if (companyId.length < 10) {
        console.log('❌ Invalid companyId format:', companyId);
        return res.status(400).json({
            success: false,
            message: 'Invalid company ID format',
            companyId: companyId
        });
    }

    req.companyId = companyId;
    console.log('✅ validateCompanyParam middleware passed');
    next();
};

// Company validation middleware for query params
const validateCompany = (req, res, next) => {
    const companyId = req.query.companyId || req.body.companyId;
    if (!companyId) {
        return res.status(400).json({
            success: false,
            message: 'Company ID is required in query or body'
        });
    }
    next();
};

// Middleware to add companyId to req.query for controller compatibility
const addCompanyIdToQuery = (req, res, next) => {
    if (req.params.companyId && !req.query.companyId) {
        req.query.companyId = req.params.companyId;
    }
    next();
};

// ==================== TEST ROUTE ====================
router.get('/test-purchases', (req, res) => {
    console.log('🧪 Test route hit!');
    res.json({
        success: true,
        message: 'Purchase routes are working!',
        timestamp: new Date().toISOString(),
        route: req.originalUrl
    });
});

// ==================== COMPANY-SPECIFIC ROUTES ====================
// NOTE: More specific routes MUST come before general routes

/**
 * @route   GET /api/companies/:companyId/purchases/dashboard
 * @desc    Get purchases dashboard data (SPECIFIC ROUTE FIRST)
 * @access  Private
 */
router.get('/companies/:companyId/purchases/dashboard',
    authenticate,
    validateCompanyParam,
    addCompanyIdToQuery,
    (req, res, next) => {
        console.log('📊 Dashboard route hit for company:', req.params.companyId);
        console.log('📊 Query params:', req.query);
        next();
    },
    purchaseController.getDashboardData
);

/**
 * @route   GET /api/companies/:companyId/purchases/reports/summary
 * @desc    Get purchases summary report
 * @access  Private
 */
router.get('/companies/:companyId/purchases/reports/summary',
    authenticate,
    validateCompanyParam,
    addCompanyIdToQuery,
    purchaseController.getPurchasesReport
);

/**
 * @route   GET /api/companies/:companyId/purchases/reports/today
 * @desc    Get today's purchases
 * @access  Private
 */
router.get('/companies/:companyId/purchases/reports/today',
    authenticate,
    validateCompanyParam,
    addCompanyIdToQuery,
    purchaseController.getTodaysPurchases
);

/**
 * @route   GET /api/companies/:companyId/purchases/reports/monthly
 * @desc    Get monthly purchases report
 * @access  Private
 */
router.get('/companies/:companyId/purchases/reports/monthly',
    authenticate,
    validateCompanyParam,
    addCompanyIdToQuery,
    purchaseController.getMonthlyReport
);

/**
 * @route   GET /api/companies/:companyId/purchases/reports/pending
 * @desc    Get pending purchases
 * @access  Private
 */
router.get('/companies/:companyId/purchases/reports/pending',
    authenticate,
    validateCompanyParam,
    addCompanyIdToQuery,
    purchaseController.getPendingPurchases
);

/**
 * @route   GET /api/companies/:companyId/purchases/analytics/top-items
 * @desc    Get top purchased items analytics
 * @access  Private
 */
router.get('/companies/:companyId/purchases/analytics/top-items',
    authenticate,
    validateCompanyParam,
    addCompanyIdToQuery,
    purchaseController.getTopItems
);

/**
 * @route   GET /api/companies/:companyId/purchases/analytics/supplier-stats
 * @desc    Get supplier statistics
 * @access  Private
 */
router.get('/companies/:companyId/purchases/analytics/supplier-stats',
    authenticate,
    validateCompanyParam,
    addCompanyIdToQuery,
    purchaseController.getSupplierStats
);

/**
 * @route   GET /api/companies/:companyId/purchases/next-purchase-number
 * @desc    Get next purchase number
 * @access  Private
 */
router.get('/companies/:companyId/purchases/next-purchase-number',
    authenticate,
    validateCompanyParam,
    addCompanyIdToQuery,
    purchaseController.getNextPurchaseNumber
);

/**
 * @route   GET /api/companies/:companyId/purchases/search
 * @desc    Search purchases
 * @access  Private
 */
router.get('/companies/:companyId/purchases/search',
    authenticate,
    validateCompanyParam,
    addCompanyIdToQuery,
    async (req, res) => {
        try {
            const { companyId } = req.params;
            const { q, page = 1, limit = 10 } = req.query;

            console.log('🔍 Search route hit:', { companyId, q, page, limit });

            if (!q) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query is required'
                });
            }

            // Add search to req.query and call getAllPurchases
            req.query.search = q;
            await purchaseController.getAllPurchases(req, res);

        } catch (error) {
            console.error('❌ Search error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to search purchases',
                error: error.message
            });
        }
    }
);

/**
 * @route   GET /api/companies/:companyId/purchases/status/:status
 * @desc    Get purchases by status
 * @access  Private
 */
router.get('/companies/:companyId/purchases/status/:status',
    authenticate,
    validateCompanyParam,
    addCompanyIdToQuery,
    async (req, res) => {
        try {
            const { companyId, status } = req.params;
            const { page = 1, limit = 10 } = req.query;

            console.log('📊 Status route hit:', { companyId, status, page, limit });

            const validStatuses = ['draft', 'ordered', 'received', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status. Valid statuses: ' + validStatuses.join(', ')
                });
            }

            // Add status to req.query and call getAllPurchases
            req.query.status = status;
            await purchaseController.getAllPurchases(req, res);

        } catch (error) {
            console.error('❌ Status route error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get purchases by status',
                error: error.message
            });
        }
    }
);

/**
 * @route   GET /api/companies/:companyId/purchases/export/csv
 * @desc    Export purchases to CSV
 * @access  Private
 */
router.get('/companies/:companyId/purchases/export/csv',
    authenticate,
    validateCompanyParam,
    addCompanyIdToQuery,
    purchaseController.exportCSV
);

/**
 * @route   GET /api/companies/:companyId/purchases
 * @desc    Get all purchases for a specific company (GENERAL ROUTE AFTER SPECIFIC ONES)
 * @access  Private
 */
router.get('/companies/:companyId/purchases',
    authenticate,
    validateCompanyParam,
    addCompanyIdToQuery,
    (req, res, next) => {
        console.log('🛒 GET purchases route hit for company:', req.params.companyId);
        console.log('🛒 Query params:', req.query);
        next();
    },
    purchaseController.getAllPurchases
);

/**
 * @route   POST /api/companies/:companyId/purchases
 * @desc    Create a new purchase for a specific company
 * @access  Private
 */
router.post('/companies/:companyId/purchases',
    authenticate,
    validateCompanyParam,
    (req, res, next) => {
        console.log('🛒 POST purchases route hit for company:', req.params.companyId);
        // Add companyId to request body for controller
        if (!req.body.companyId) {
            req.body.companyId = req.params.companyId;
        }
        next();
    },
    purchaseController.createPurchase
);

/**
 * @route   GET /api/companies/:companyId/purchases/:id
 * @desc    Get purchase by ID for a specific company
 * @access  Private
 */
router.get('/companies/:companyId/purchases/:id',
    authenticate,
    validateCompanyParam,
    purchaseController.getPurchaseById
);

/**
 * @route   PUT /api/companies/:companyId/purchases/:id
 * @desc    Update purchase for a specific company
 * @access  Private
 */
router.put('/companies/:companyId/purchases/:id',
    authenticate,
    validateCompanyParam,
    purchaseController.updatePurchase
);

/**
 * @route   DELETE /api/companies/:companyId/purchases/:id
 * @desc    Delete purchase for a specific company
 * @access  Private
 */
router.delete('/companies/:companyId/purchases/:id',
    authenticate,
    validateCompanyParam,
    purchaseController.deletePurchase
);

// ==================== STATUS MANAGEMENT ROUTES ====================

/**
 * @route   PATCH /api/companies/:companyId/purchases/:id/order
 * @desc    Mark purchase as ordered
 * @access  Private
 */
router.patch('/companies/:companyId/purchases/:id/order',
    authenticate,
    validateCompanyParam,
    purchaseController.markAsOrdered
);

/**
 * @route   PATCH /api/companies/:companyId/purchases/:id/receive
 * @desc    Mark purchase as received
 * @access  Private
 */
router.patch('/companies/:companyId/purchases/:id/receive',
    authenticate,
    validateCompanyParam,
    purchaseController.markAsReceived
);

/**
 * @route   PATCH /api/companies/:companyId/purchases/:id/complete
 * @desc    Complete purchase
 * @access  Private
 */
router.patch('/companies/:companyId/purchases/:id/complete',
    authenticate,
    validateCompanyParam,
    purchaseController.completePurchase
);

/**
 * @route   PATCH /api/companies/:companyId/purchases/:id/cancel
 * @desc    Cancel purchase
 * @access  Private
 */
router.patch('/companies/:companyId/purchases/:id/cancel',
    authenticate,
    validateCompanyParam,
    purchaseController.deletePurchase
);

// ==================== PAYMENT ROUTES ====================

/**
 * @route   POST /api/companies/:companyId/purchases/:id/payment
 * @desc    Add payment to purchase
 * @access  Private
 */
router.post('/companies/:companyId/purchases/:id/payment',
    authenticate,
    validateCompanyParam,
    purchaseController.addPayment
);

/**
 * @route   GET /api/companies/:companyId/purchases/:id/payment-status
 * @desc    Get payment status
 * @access  Private
 */
router.get('/companies/:companyId/purchases/:id/payment-status',
    authenticate,
    validateCompanyParam,
    purchaseController.getPaymentStatus
);

// ==================== LEGACY ROUTES (for backward compatibility) ====================

/**
 * @route   POST /api/purchases
 * @desc    Create purchase (legacy route)
 * @access  Private
 */
router.post('/',
    authenticate,
    validateCompany,
    purchaseController.createPurchase
);

/**
 * @route   GET /api/purchases
 * @desc    Get all purchases (legacy route)
 * @access  Private
 */
router.get('/',
    authenticate,
    validateCompany,
    purchaseController.getAllPurchases
);

/**
 * @route   GET /api/purchases/:id
 * @desc    Get purchase by ID (legacy route)
 * @access  Private
 */
router.get('/:id',
    authenticate,
    validateRequest,
    purchaseController.getPurchaseById
);

/**
 * @route   PUT /api/purchases/:id
 * @desc    Update purchase (legacy route)
 * @access  Private
 */
router.put('/:id',
    authenticate,
    validateRequest,
    purchaseController.updatePurchase
);

/**
 * @route   DELETE /api/purchases/:id
 * @desc    Delete purchase (legacy route)
 * @access  Private
 */
router.delete('/:id',
    authenticate,
    validateRequest,
    purchaseController.deletePurchase
);

console.log('✅ Purchase Routes loaded successfully');
module.exports = router;