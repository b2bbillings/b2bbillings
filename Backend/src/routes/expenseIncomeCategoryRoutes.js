const express = require('express');
const router = express.Router();

const {
  // Expense category controllers
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  initializeExpenseCategories,
  
  // Income category controllers
  getIncomeCategories,
  createIncomeCategory,
  updateIncomeCategory,
  deleteIncomeCategory,
  initializeIncomeCategories
} = require('../controllers/expenseIncomeCategoryController');

const { authenticate } = require('../middleware/authMiddleware');
const { validateCategory } = require('../middleware/validation');

// Apply auth middleware to all routes
router.use(authenticate);

// Expense category routes
router.get('/expenses', getExpenseCategories);
router.post('/expenses', validateCategory, createExpenseCategory);
router.post('/expenses/initialize', initializeExpenseCategories);
router.put('/expenses/:id', validateCategory, updateExpenseCategory);
router.delete('/expenses/:id', deleteExpenseCategory);

// Income category routes
router.get('/income', getIncomeCategories);
router.post('/income', validateCategory, createIncomeCategory);
router.post('/income/initialize', initializeIncomeCategories);
router.put('/income/:id', validateCategory, updateIncomeCategory);
router.delete('/income/:id', deleteIncomeCategory);

module.exports = router;