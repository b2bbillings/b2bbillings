const express = require('express');
const router = express.Router();
const {
  getPendingAdvertisements,
  getAllAdvertisements, // ✅ NEW: Import getAllAdvertisements
  getAdvertisementById,
  approveAdvertisement,
  rejectAdvertisement,
  requestChanges,
  getAdvertisementHistory,
  getAdvertisementStats,
  bulkApproveAdvertisements,
  bulkRejectAdvertisements,
  deleteAdvertisement // ✅ NEW: Import delete function
} = require('../controllers/adminAdvertisementController');
const { authenticate } = require('../middleware/authMiddleware');

// Middleware to check admin access
const requireAdmin = (req, res, next) => {
  console.log('🔍 Checking admin access for user:', {
    id: req.user.id,
    role: req.user.role,
    isAdmin: req.user.isAdmin
  });
  
  // Check both role-based and isAdmin boolean approaches
  const hasAdminAccess = req.user.role === 'admin' || req.user.isAdmin === true;
  
  if (!hasAdminAccess) {
    console.log('❌ Admin access denied for user:', req.user.role);
    return res.status(403).json({
      success: false,
      message: 'Admin access required. Current role: ' + (req.user.role || 'none')
    });
  }
  
  console.log('✅ Admin access granted');
  next();
};

// All routes require authentication and admin access
router.use(authenticate);
router.use(requireAdmin);

// Get pending advertisements for review
router.get('/pending', getPendingAdvertisements);

// Get all advertisements with optional status filtering
router.get('/', getAllAdvertisements);

// Get advertisement details for review
router.get('/:id', getAdvertisementById);

// Approve advertisement
router.put('/:id/approve', approveAdvertisement);

// Reject advertisement
router.put('/:id/reject', rejectAdvertisement);

// Request changes (send back to user with suggestions)
router.put('/:id/request-changes', requestChanges);

// Delete advertisement (hard delete from database)
router.delete('/:id', deleteAdvertisement);

// Get advertisement review history
router.get('/:id/history', getAdvertisementHistory);

// Get advertisement statistics for admin dashboard
router.get('/stats/overview', getAdvertisementStats);

// Bulk operations
router.put('/bulk/approve', bulkApproveAdvertisements);
router.put('/bulk/reject', bulkRejectAdvertisements);

module.exports = router;