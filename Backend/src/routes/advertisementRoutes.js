const express = require('express');
const router = express.Router();
const {
  getAdvertisements,
  getAdsBySection,
  getAdvertisementById,
  createAdvertisement,
  uploadMedia,
  updateAdvertisement,
  deleteAdvertisement,
  trackImpression,
  trackClick,
  getUserAdvertisements,
  getAdvertisementAnalytics,
  approveAdvertisement,
  blockAdvertisement
} = require('../controllers/advertisementController');
const { authenticate } = require('../middleware/authMiddleware');

// Test authentication endpoint
router.get('/test-auth', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication ...',
    user: req.user
  });
});

// Public routes (no authentication required)
router.get('/section/:section', getAdsBySection);

// Protected routes (authentication required)
router.get('/', authenticate, getAdvertisements);
router.get('/user', authenticate, getUserAdvertisements);
router.get('/:id', authenticate, getAdvertisementById);
router.post('/', authenticate, createAdvertisement);
router.post('/upload', authenticate, uploadMedia);
router.put('/:id', authenticate, updateAdvertisement);
router.delete('/:id', authenticate, deleteAdvertisement);

// Analytics routes
router.post('/:id/impression', trackImpression);
router.post('/:id/click', trackClick);
router.get('/:id/analytics', authenticate, getAdvertisementAnalytics);

// Admin routes
router.put('/:id/approve', authenticate, approveAdvertisement);
router.put('/:id/block', authenticate, blockAdvertisement);

module.exports = router;