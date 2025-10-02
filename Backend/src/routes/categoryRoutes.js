const express = require('express');
const router = express.Router();
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllSubCategories,
  getSubCategoriesByParent,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory
} = require('../controllers/categoryController');

// Import authentication middleware
const { authenticate } = require('../middleware/authMiddleware');

// Category Routes
router.get('/categories', authenticate, getAllCategories);
router.get('/categories/:id', authenticate, getCategoryById);
router.post('/categories', authenticate, createCategory);
router.put('/categories/:id', authenticate, updateCategory);
router.delete('/categories/:id', authenticate, deleteCategory);

// SubCategory Routes
router.get('/subcategories', authenticate, getAllSubCategories);
router.get('/subcategories/parent/:parentId', authenticate, getSubCategoriesByParent);
router.post('/subcategories', authenticate, createSubCategory);
router.put('/subcategories/:id', authenticate, updateSubCategory);
router.delete('/subcategories/:id', authenticate, deleteSubCategory);

module.exports = router;