const Expense = require('../models/Expense');
const ExpenseCategory = require('../models/ExpenseCategory');
const logger = require('../config/logger');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;

// Get all expenses with pagination and filtering
const getAllExpenses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category = '',
      paymentMethod = '',
      startDate = '',
      endDate = '',
      search = '',
      sortBy = 'expenseDate',
      sortOrder = 'desc'
    } = req.query;

    const userId = req.user.id;
    const companyId = req.user.companyId;

    // Build filter object
    const filter = {
      userId,
      companyId,
      status: 'active'
    };

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Payment method filter
    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    // Date range filter
    if (startDate && endDate) {
      filter.expenseDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Search filter
    if (search) {
      filter.$or = [
        { billName: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { paymentMethod: { $regex: search, $options: 'i' } },
        { customPaymentMethod: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'name email')
        .populate('companyId', 'name'),
      Expense.countDocuments(filter)
    ]);

    // Get summary statistics
    const summary = await Expense.getTotalByUser(userId, companyId);
    const totalAmount = summary.length > 0 ? summary[0].totalAmount : 0;
    const totalCount = summary.length > 0 ? summary[0].count : 0;

    res.status(200).json({
      success: true,
      data: {
        expenses,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        summary: {
          totalAmount,
          totalCount,
          averageAmount: totalCount > 0 ? totalAmount / totalCount : 0
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expenses',
      error: error.message
    });
  }
};

// Get single expense by ID
const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const companyId = req.user.companyId;

    const expense = await Expense.findOne({
      _id: id,
      userId,
      companyId,
      status: 'active'
    })
      .populate('userId', 'name email')
      .populate('companyId', 'name');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.status(200).json({
      success: true,
      data: expense
    });

  } catch (error) {
    logger.error('Error fetching expense:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expense',
      error: error.message
    });
  }
};

// Create new expense
const createExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;

    const expenseData = {
      ...req.body,
      userId,
      companyId
    };

    // Handle file upload if present
    const billFile = req.files && req.files.find(file => file.fieldname === 'billFile');
    if (billFile) {
      expenseData.billFile = {
        originalName: billFile.originalname,
        fileName: billFile.filename,
        filePath: billFile.path,
        fileSize: billFile.size,
        mimeType: billFile.mimetype
      };
    }

    // Create expense
    const expense = new Expense(expenseData);
    await expense.save();

    // Increment category usage count
    try {
      await ExpenseCategory.findOneAndUpdate(
        { name: expense.category, companyId },
        { $inc: { usageCount: 1 } }
      );
    } catch (categoryError) {
      logger.warn('Failed to update category usage count:', categoryError);
    }

    // Populate and return
    await expense.populate([
      { path: 'userId', select: 'name email' },
      { path: 'companyId', select: 'name' }
    ]);

    logger.info(`Expense created: ${expense._id} by user: ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: expense
    });

  } catch (error) {
    logger.error('Error creating expense:', error);
    
    // Delete uploaded file if there was an error
    const billFile = req.files && req.files.find(file => file.fieldname === 'billFile');
    if (billFile) {
      try {
        await fs.unlink(billFile.path);
      } catch (deleteError) {
        logger.error('Error deleting uploaded file:', deleteError);
      }
    }

    res.status(400).json({
      success: false,
      message: 'Error creating expense',
      error: error.message
    });
  }
};

// Update expense
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const companyId = req.user.companyId;

    const expense = await Expense.findOne({
      _id: id,
      userId,
      companyId,
      status: 'active'
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Store old category for usage count adjustment
    const oldCategory = expense.category;
    
    // Update expense data
    Object.assign(expense, req.body);

    // Handle new file upload
    const billFile = req.files && req.files.find(file => file.fieldname === 'billFile');
    if (billFile) {
      // Delete old file if exists
      if (expense.billFile && expense.billFile.filePath) {
        try {
          await fs.unlink(expense.billFile.filePath);
        } catch (deleteError) {
          logger.warn('Error deleting old file:', deleteError);
        }
      }

      // Set new file data
      expense.billFile = {
        originalName: billFile.originalname,
        fileName: billFile.filename,
        filePath: billFile.path,
        fileSize: billFile.size,
        mimeType: billFile.mimetype
      };
    }

    await expense.save();

    // Update category usage counts if category changed
    if (oldCategory !== expense.category) {
      try {
        // Decrement old category
        await ExpenseCategory.findOneAndUpdate(
          { name: oldCategory, companyId },
          { $inc: { usageCount: -1 } }
        );

        // Increment new category
        await ExpenseCategory.findOneAndUpdate(
          { name: expense.category, companyId },
          { $inc: { usageCount: 1 } }
        );
      } catch (categoryError) {
        logger.warn('Failed to update category usage counts:', categoryError);
      }
    }

    // Populate and return
    await expense.populate([
      { path: 'userId', select: 'name email' },
      { path: 'companyId', select: 'name' }
    ]);

    logger.info(`Expense updated: ${expense._id} by user: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: expense
    });

  } catch (error) {
    logger.error('Error updating expense:', error);
    
    // Delete uploaded file if there was an error
    const billFile = req.files && req.files.find(file => file.fieldname === 'billFile');
    if (billFile) {
      try {
        await fs.unlink(billFile.path);
      } catch (deleteError) {
        logger.error('Error deleting uploaded file:', deleteError);
      }
    }

    res.status(400).json({
      success: false,
      message: 'Error updating expense',
      error: error.message
    });
  }
};

// Delete expense (soft delete)
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const companyId = req.user.companyId;

    const expense = await Expense.findOne({
      _id: id,
      userId,
      companyId,
      status: 'active'
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Soft delete
    expense.status = 'deleted';
    await expense.save();

    // Decrement category usage count
    try {
      await ExpenseCategory.findOneAndUpdate(
        { name: expense.category, companyId },
        { $inc: { usageCount: -1 } }
      );
    } catch (categoryError) {
      logger.warn('Failed to update category usage count:', categoryError);
    }

    logger.info(`Expense deleted: ${expense._id} by user: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting expense:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting expense',
      error: error.message
    });
  }
};

// Get expense statistics
const getExpenseStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;
    const { period = 'month' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get statistics
    const [totalStats, periodStats, categoryStats, paymentMethodStats] = await Promise.all([
      // Total statistics
      Expense.getTotalByUser(userId, companyId),
      
      // Period statistics
      Expense.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            companyId: new mongoose.Types.ObjectId(companyId),
            status: 'active',
            expenseDate: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),

      // Category-wise statistics
      Expense.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            companyId: new mongoose.Types.ObjectId(companyId),
            status: 'active'
          }
        },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalAmount: -1 } },
        { $limit: 10 }
      ]),

      // Payment method statistics
      Expense.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            companyId: new mongoose.Types.ObjectId(companyId),
            status: 'active'
          }
        },
        {
          $group: {
            _id: '$paymentMethod',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalAmount: -1 } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalStats[0] || { totalAmount: 0, count: 0 },
        period: periodStats[0] || { totalAmount: 0, count: 0 },
        categories: categoryStats,
        paymentMethods: paymentMethodStats
      }
    });

  } catch (error) {
    logger.error('Error fetching expense statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expense statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseStats
};