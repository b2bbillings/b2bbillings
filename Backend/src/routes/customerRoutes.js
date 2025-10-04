const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { customerValidation, commonValidation } = require('../middleware/customerVendorValidation');
const { authenticate } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// Customer CRUD routes
router.post('/', 
  customerValidation.create, 
  customerController.createCustomer
);

router.get('/', 
  commonValidation.pagination, 
  customerController.getCustomers
);

router.get('/search', 
  customerValidation.search, 
  customerController.searchCustomers
);

router.get('/stats', 
  customerController.getCustomerStats
);

router.get('/outstanding', 
  customerController.getOutstandingCustomers
);

router.get('/:id', 
  commonValidation.mongoId, 
  customerController.getCustomer
);

router.put('/:id', 
  commonValidation.mongoId, 
  customerValidation.update, 
  customerController.updateCustomer
);

router.delete('/:id', 
  commonValidation.mongoId, 
  customerController.deleteCustomer
);

router.put('/:id/balance', 
  commonValidation.mongoId, 
  customerValidation.updateBalance, 
  customerController.updateBalance
);

// Duplicate checking routes
router.get('/check-phone', 
  customerController.checkPhoneExists
);

router.get('/check-email', 
  customerController.checkEmailExists
);

module.exports = router;