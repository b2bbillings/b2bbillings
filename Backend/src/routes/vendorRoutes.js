const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { vendorValidation, commonValidation } = require('../middleware/customerVendorValidation');
const { authenticate } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// Vendor CRUD routes
router.post('/', 
  vendorValidation.create, 
  vendorController.createVendor
);

router.get('/', 
  commonValidation.pagination, 
  vendorController.getVendors
);

router.get('/search', 
  vendorValidation.search, 
  vendorController.searchVendors
);

router.get('/stats', 
  vendorController.getVendorStats
);

router.get('/outstanding', 
  vendorController.getOutstandingVendors
);

router.get('/type/:type', 
  vendorController.getVendorsByType
);

router.post('/validate-gstin', 
  vendorValidation.validateGstin, 
  vendorController.validateGstin
);

router.get('/:id', 
  commonValidation.mongoId, 
  vendorController.getVendor
);

router.put('/:id', 
  commonValidation.mongoId, 
  vendorValidation.update, 
  vendorController.updateVendor
);

router.delete('/:id', 
  commonValidation.mongoId, 
  vendorController.deleteVendor
);

router.put('/:id/balance', 
  commonValidation.mongoId, 
  vendorValidation.updateBalance, 
  vendorController.updateBalance
);

// Duplicate checking routes
router.get('/check-phone', 
  vendorController.checkPhoneExists
);

router.get('/check-email', 
  vendorController.checkEmailExists
);

module.exports = router;