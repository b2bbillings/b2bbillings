const express = require('express');
const router = express.Router({ mergeParams: true }); // ⭐ IMPORTANT: mergeParams must be true
const itemController = require('../controllers/itemController');


// Middleware to validate companyId parameter
router.use((req, res, next) => {
    const { companyId } = req.params;
    console.log('🔍 CompanyId validation:', companyId);
    
    if (!companyId) {
        return res.status(400).json({
            success: false,
            message: 'Company ID is required',
            debug: {
                params: req.params,
                url: req.url,
                originalUrl: req.originalUrl
            }
        });
    }
    next();
});

// Routes for items management
// Base route: /api/companies/:companyId/items

// POST /api/companies/:companyId/items - Create new item
router.post('/', itemController.createItem);

// GET /api/companies/:companyId/items - Get all items for a company
router.get('/', itemController.getItems);

// GET /api/companies/:companyId/items/search - Search items (must be before /:itemId)
router.get('/search', itemController.searchItems);

// GET /api/companies/:companyId/items/categories - Get categories
router.get('/categories', itemController.getCategories);

// GET /api/companies/:companyId/items/:itemId - Get single item
router.get('/:itemId', itemController.getItemById);

// PUT /api/companies/:companyId/items/:itemId - Update item
router.put('/:itemId', itemController.updateItem);

// DELETE /api/companies/:companyId/items/:itemId - Delete item
router.delete('/:itemId', itemController.deleteItem);

// PATCH /api/companies/:companyId/items/bulk/stock - Bulk update stock
router.patch('/bulk/stock', itemController.bulkUpdateStock);

module.exports = router;