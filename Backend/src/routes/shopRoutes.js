const express = require('express');
const router = express.Router();
const {
  createShop,
  getShops,
  getShopById,
  updateShop,
  deleteShop,
  getShopsByOwner,
  getNearbyShops,
  updateVerificationStatus,
  getShopStats
} = require('../controllers/shopController');

const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.get('/', getShops); // Get all shops with filters
router.get('/stats', getShopStats); // Get shop statistics
router.get('/nearby', getNearbyShops); // Get nearby shops
router.get('/:id', getShopById); // Get shop by ID

// Protected routes (require authentication)
router.post('/', authMiddleware, createShop); // Create new shop
router.put('/:id', authMiddleware, updateShop); // Update shop
router.delete('/:id', authMiddleware, deleteShop); // Delete shop
router.get('/owner/:ownerId', authMiddleware, getShopsByOwner); // Get shops by owner
router.patch('/:id/verification', authMiddleware, updateVerificationStatus); // Update verification status

module.exports = router;