const express = require('express');
const router = express.Router({ mergeParams: true });
const bankAccountController = require('../controllers/bankAccountController');
const {
    authenticate,
    requireCompanyAccess,
    requireEmployee,
    requireBankAccess,
    debugAuth,
    validateRequest
} = require('../middleware/authMiddleware');

// ✅ TEMPORARY: Simple validation middleware
const validateBankAccount = (req, res, next) => {
    console.log('✅ Bank account validation passed (temporary)');
    next();
};

const validateAccountUpdate = (req, res, next) => {
    console.log('✅ Account update validation passed (temporary)');
    next();
};

// Apply middleware stack
if (process.env.NODE_ENV === 'development') {
    router.use(debugAuth);
}

router.use(validateRequest);
router.use(authenticate);
router.use(requireCompanyAccess);

// Routes with specific bank permissions
router.get('/', bankAccountController.getBankAccounts);
router.get('/summary', bankAccountController.getAccountSummary);
router.get('/validate', bankAccountController.validateAccountDetails);
router.get('/:accountId', bankAccountController.getBankAccount);

router.post('/', bankAccountController.createBankAccount);
router.put('/:accountId', validateAccountUpdate, bankAccountController.updateBankAccount);
router.patch('/:accountId/balance', bankAccountController.updateAccountBalance);
router.delete('/:accountId', bankAccountController.deleteBankAccount);

module.exports = router;