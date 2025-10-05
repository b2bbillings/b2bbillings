const ExpenseCategory = require('../models/ExpenseCategory');
const IncomeCategory = require('../models/IncomeCategory');
const logger = require('../config/logger');

// EXPENSE CATEGORY CONTROLLERS

// Get all expense categories
const getExpenseCategories = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const categories = await ExpenseCategory.getActiveCategories(companyId);

    res.status(200).json({
      success: true,
      data: categories
    });

  } catch (error) {
    logger.error('Error fetching expense categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expense categories',
      error: error.message
    });
  }
};

// Create expense category
const createExpenseCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;

    const categoryData = {
      ...req.body,
      createdBy: userId,
      companyId
    };

    const category = new ExpenseCategory(categoryData);
    await category.save();

    logger.info(`Expense category created: ${category._id} by user: ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Expense category created successfully',
      data: category
    });

  } catch (error) {
    logger.error('Error creating expense category:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    }

    res.status(400).json({
      success: false,
      message: 'Error creating expense category',
      error: error.message
    });
  }
};

// Update expense category
const updateExpenseCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const userId = req.user.id;

    const category = await ExpenseCategory.findOne({
      _id: id,
      companyId,
      isActive: true
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Prevent updating default categories' core properties
    if (category.isDefault && (req.body.name || req.body.isDefault === false)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify name or default status of default categories'
      });
    }

    Object.assign(category, req.body);
    await category.save();

    logger.info(`Expense category updated: ${category._id} by user: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Expense category updated successfully',
      data: category
    });

  } catch (error) {
    logger.error('Error updating expense category:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    }

    res.status(400).json({
      success: false,
      message: 'Error updating expense category',
      error: error.message
    });
  }
};

// Delete expense category (soft delete)
const deleteExpenseCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const userId = req.user.id;

    const category = await ExpenseCategory.findOne({
      _id: id,
      companyId,
      isActive: true
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Prevent deleting default categories
    if (category.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete default categories'
      });
    }

    category.isActive = false;
    await category.save();

    logger.info(`Expense category deleted: ${category._id} by user: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Expense category deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting expense category:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting expense category',
      error: error.message
    });
  }
};

// Initialize default expense categories
const initializeExpenseCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;

    // Check if categories already exist
    const existingCategories = await ExpenseCategory.countDocuments({
      companyId,
      isDefault: true,
      isActive: true
    });

    if (existingCategories > 0) {
      return res.status(400).json({
        success: false,
        message: 'Default categories already exist'
      });
    }

    const categories = await ExpenseCategory.createDefaultCategories(companyId, userId);

    logger.info(`Default expense categories initialized for company: ${companyId}`);

    res.status(201).json({
      success: true,
      message: 'Default expense categories initialized successfully',
      data: categories
    });

  } catch (error) {
    logger.error('Error initializing expense categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing expense categories',
      error: error.message
    });
  }
};

// INCOME CATEGORY CONTROLLERS

// Get all income categories
const getIncomeCategories = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const categories = await IncomeCategory.getActiveCategories(companyId);

    res.status(200).json({
      success: true,
      data: categories
    });

  } catch (error) {
    logger.error('Error fetching income categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching income categories',
      error: error.message
    });
  }
};

// Create income category
const createIncomeCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;

    const categoryData = {
      ...req.body,
      createdBy: userId,
      companyId
    };

    const category = new IncomeCategory(categoryData);
    await category.save();

    logger.info(`Income category created: ${category._id} by user: ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Income category created successfully',
      data: category
    });

  } catch (error) {
    logger.error('Error creating income category:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    }

    res.status(400).json({
      success: false,
      message: 'Error creating income category',
      error: error.message
    });
  }
};

// Update income category
const updateIncomeCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const userId = req.user.id;

    const category = await IncomeCategory.findOne({
      _id: id,
      companyId,
      isActive: true
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Prevent updating default categories' core properties
    if (category.isDefault && (req.body.name || req.body.isDefault === false)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify name or default status of default categories'
      });
    }

    Object.assign(category, req.body);
    await category.save();

    logger.info(`Income category updated: ${category._id} by user: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Income category updated successfully',
      data: category
    });

  } catch (error) {
    logger.error('Error updating income category:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    }

    res.status(400).json({
      success: false,
      message: 'Error updating income category',
      error: error.message
    });
  }
};

// Delete income category (soft delete)
const deleteIncomeCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const userId = req.user.id;

    const category = await IncomeCategory.findOne({
      _id: id,
      companyId,
      isActive: true
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Prevent deleting default categories
    if (category.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete default categories'
      });
    }

    category.isActive = false;
    await category.save();

    logger.info(`Income category deleted: ${category._id} by user: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Income category deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting income category:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting income category',
      error: error.message
    });
  }
};

// Initialize default income categories
const initializeIncomeCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;

    // Check if categories already exist
    const existingCategories = await IncomeCategory.countDocuments({
      companyId,
      isDefault: true,
      isActive: true
    });

    if (existingCategories > 0) {
      return res.status(400).json({
        success: false,
        message: 'Default categories already exist'
      });
    }

    const categories = await IncomeCategory.createDefaultCategories(companyId, userId);

    logger.info(`Default income categories initialized for company: ${companyId}`);

    res.status(201).json({
      success: true,
      message: 'Default income categories initialized successfully',
      data: categories
    });

  } catch (error) {
    logger.error('Error initializing income categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing income categories',
      error: error.message
    });
  }
};

module.exports = {
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
};