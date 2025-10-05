const IndirectIncome = require('../models/IndirectIncome');
const IncomeCategory = require('../models/IncomeCategory');
const logger = require('../config/logger');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;

// Get all indirect income with pagination and filtering
const getAllIndirectIncome = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category = '',
      paymentMethod = '',
      startDate = '',
      endDate = '',
      search = '',
      sortBy = 'incomeDate',
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
      filter.incomeDate = {
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
    const [incomes, total] = await Promise.all([
      IndirectIncome.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'name email')
        .populate('companyId', 'name'),
      IndirectIncome.countDocuments(filter)
    ]);

    // Get summary statistics
    const summary = await IndirectIncome.getTotalByUser(userId, companyId);
    const totalAmount = summary.length > 0 ? summary[0].totalAmount : 0;
    const totalCount = summary.length > 0 ? summary[0].count : 0;

    res.status(200).json({
      success: true,
      data: {
        incomes,
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
    logger.error('Error fetching indirect income:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching indirect income',
      error: error.message
    });
  }
};

// Get single indirect income by ID
const getIndirectIncomeById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const companyId = req.user.companyId;

    const income = await IndirectIncome.findOne({
      _id: id,
      userId,
      companyId,
      status: 'active'
    })
      .populate('userId', 'name email')
      .populate('companyId', 'name');

    if (!income) {
      return res.status(404).json({
        success: false,
        message: 'Indirect income not found'
      });
    }

    res.status(200).json({
      success: true,
      data: income
    });

  } catch (error) {
    logger.error('Error fetching indirect income:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching indirect income',
      error: error.message
    });
  }
};

// Create new indirect income
const createIndirectIncome = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;

    const incomeData = {
      ...req.body,
      userId,
      companyId
    };

    // Handle file upload if present
    const billFile = req.files && req.files.find(file => file.fieldname === 'billFile');
    if (billFile) {
      incomeData.billFile = {
        originalName: billFile.originalname,
        fileName: billFile.filename,
        filePath: billFile.path,
        fileSize: billFile.size,
        mimeType: billFile.mimetype
      };
    }

    // Create income
    const income = new IndirectIncome(incomeData);
    await income.save();

    // Increment category usage count
    try {
      await IncomeCategory.findOneAndUpdate(
        { name: income.category, companyId },
        { $inc: { usageCount: 1 } }
      );
    } catch (categoryError) {
      logger.warn('Failed to update category usage count:', categoryError);
    }

    // Populate and return
    await income.populate([
      { path: 'userId', select: 'name email' },
      { path: 'companyId', select: 'name' }
    ]);

    logger.info(`Indirect income created: ${income._id} by user: ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Indirect income created successfully',
      data: income
    });

  } catch (error) {
    logger.error('Error creating indirect income:', error);
    
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
      message: 'Error creating indirect income',
      error: error.message
    });
  }
};

// Update indirect income
const updateIndirectIncome = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const companyId = req.user.companyId;

    const income = await IndirectIncome.findOne({
      _id: id,
      userId,
      companyId,
      status: 'active'
    });

    if (!income) {
      return res.status(404).json({
        success: false,
        message: 'Indirect income not found'
      });
    }

    // Store old category for usage count adjustment
    const oldCategory = income.category;
    
    // Update income data
    Object.assign(income, req.body);

    // Handle new file upload
    const billFile = req.files && req.files.find(file => file.fieldname === 'billFile');
    if (billFile) {
      // Delete old file if exists
      if (income.billFile && income.billFile.filePath) {
        try {
          await fs.unlink(income.billFile.filePath);
        } catch (deleteError) {
          logger.warn('Error deleting old file:', deleteError);
        }
      }

      // Set new file data
      income.billFile = {
        originalName: billFile.originalname,
        fileName: billFile.filename,
        filePath: billFile.path,
        fileSize: billFile.size,
        mimeType: billFile.mimetype
      };
    }

    await income.save();

    // Update category usage counts if category changed
    if (oldCategory !== income.category) {
      try {
        // Decrement old category
        await IncomeCategory.findOneAndUpdate(
          { name: oldCategory, companyId },
          { $inc: { usageCount: -1 } }
        );

        // Increment new category
        await IncomeCategory.findOneAndUpdate(
          { name: income.category, companyId },
          { $inc: { usageCount: 1 } }
        );
      } catch (categoryError) {
        logger.warn('Failed to update category usage counts:', categoryError);
      }
    }

    // Populate and return
    await income.populate([
      { path: 'userId', select: 'name email' },
      { path: 'companyId', select: 'name' }
    ]);

    logger.info(`Indirect income updated: ${income._id} by user: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Indirect income updated successfully',
      data: income
    });

  } catch (error) {
    logger.error('Error updating indirect income:', error);
    
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
      message: 'Error updating indirect income',
      error: error.message
    });
  }
};

// Delete indirect income (soft delete)
const deleteIndirectIncome = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const companyId = req.user.companyId;

    const income = await IndirectIncome.findOne({
      _id: id,
      userId,
      companyId,
      status: 'active'
    });

    if (!income) {
      return res.status(404).json({
        success: false,
        message: 'Indirect income not found'
      });
    }

    // Soft delete
    income.status = 'deleted';
    await income.save();

    // Decrement category usage count
    try {
      await IncomeCategory.findOneAndUpdate(
        { name: income.category, companyId },
        { $inc: { usageCount: -1 } }
      );
    } catch (categoryError) {
      logger.warn('Failed to update category usage count:', categoryError);
    }

    logger.info(`Indirect income deleted: ${income._id} by user: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Indirect income deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting indirect income:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting indirect income',
      error: error.message
    });
  }
};

// Get indirect income statistics
const getIndirectIncomeStats = async (req, res) => {
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
      IndirectIncome.getTotalByUser(userId, companyId),
      
      // Period statistics
      IndirectIncome.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            companyId: new mongoose.Types.ObjectId(companyId),
            status: 'active',
            incomeDate: { $gte: startDate }
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
      IndirectIncome.aggregate([
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
      IndirectIncome.aggregate([
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
    logger.error('Error fetching indirect income statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching indirect income statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllIndirectIncome,
  getIndirectIncomeById,
  createIndirectIncome,
  updateIndirectIncome,
  deleteIndirectIncome,
  getIndirectIncomeStats
};