const Advertisement = require('../models/Advertisement');
const User = require('../models/User');
const Company = require('../models/Company');
const logger = require('../config/logger');

// Get pending advertisements for admin review
const getPendingAdvertisements = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      section,
      mediaType,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {
      isApproved: false,
      isRejected: { $ne: true },
      isBlocked: false
    };

    if (section) query.section = section;
    if (mediaType) query.mediaType = mediaType;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [advertisements, total] = await Promise.all([
      Advertisement.find(query)
        .populate('userId', 'name email')
        .populate('companyId', 'name businessName')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Advertisement.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: advertisements,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching pending advertisements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending advertisements',
      error: error.message
    });
  }
};

// Get all advertisements with optional status filtering
const getAllAdvertisements = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      section,
      mediaType,
      status, // ✅ NEW: Status filter (pending, approved, rejected, all)
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = { isBlocked: false }; // Base query

    // Apply status filtering
    if (status === 'pending') {
      query.isApproved = false;
      query.isRejected = { $ne: true };
    } else if (status === 'approved') {
      query.isApproved = true;
    } else if (status === 'rejected') {
      query.isRejected = true;
    }
    // For status === 'all' or undefined, no additional status filters

    // Apply other filters
    if (section) query.section = section;
    if (mediaType) query.mediaType = mediaType;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [advertisements, total] = await Promise.all([
      Advertisement.find(query)
        .populate('userId', 'name email')
        .populate('companyId', 'name businessName')
        .populate('approvedBy', 'name email')
        .populate('rejectedBy', 'name email')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Advertisement.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: advertisements,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      filter: {
        status: status || 'all',
        section,
        mediaType
      }
    });
  } catch (error) {
    logger.error('Error fetching all advertisements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advertisements',
      error: error.message
    });
  }
};

// Get advertisement details for admin review
const getAdvertisementById = async (req, res) => {
  try {
    const { id } = req.params;

    const advertisement = await Advertisement.findById(id)
      .populate('userId', 'name email')
      .populate('companyId', 'name businessName')
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .populate('reviewHistory.reviewedBy', 'name email');

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    res.json({
      success: true,
      data: advertisement
    });
  } catch (error) {
    logger.error('Error fetching advertisement for review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advertisement',
      error: error.message
    });
  }
};

// Approve advertisement
const approveAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    const advertisement = await Advertisement.findById(id);

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    if (advertisement.isApproved) {
      return res.status(400).json({
        success: false,
        message: 'Advertisement is already approved'
      });
    }

    // Update advertisement status
    advertisement.isApproved = true;
    advertisement.isActive = true;
    advertisement.approvedBy = req.user._id;
    advertisement.approvedAt = new Date();
    advertisement.isRejected = false;
    advertisement.rejectedBy = null;
    advertisement.rejectedAt = null;
    advertisement.rejectionReason = null;

    // Add to review history
    advertisement.reviewHistory.push({
      action: 'approved',
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      comments: comments || 'Advertisement approved'
    });

    await advertisement.save();

    // Populate for response
    await advertisement.populate([
      { path: 'userId', select: 'name email' },
      { path: 'companyId', select: 'name businessName' },
      { path: 'approvedBy', select: 'name email' }
    ]);

    // TODO: Send notification to user about approval
    logger.info(`Advertisement ${id} approved by admin ${req.user._id}`);

    res.json({
      success: true,
      message: 'Advertisement approved successfully',
      data: advertisement
    });
  } catch (error) {
    logger.error('Error approving advertisement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve advertisement',
      error: error.message
    });
  }
};

// Reject advertisement
const rejectAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, comments } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const advertisement = await Advertisement.findById(id);

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    if (advertisement.isApproved) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject an approved advertisement'
      });
    }

    // Update advertisement status
    advertisement.isRejected = true;
    advertisement.isActive = false;
    advertisement.rejectedBy = req.user._id;
    advertisement.rejectedAt = new Date();
    advertisement.rejectionReason = reason;

    // Add to review history
    advertisement.reviewHistory.push({
      action: 'rejected',
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      comments: comments || reason,
      rejectionReason: reason
    });

    await advertisement.save();

    // Populate for response
    await advertisement.populate([
      { path: 'userId', select: 'name email' },
      { path: 'companyId', select: 'name businessName' },
      { path: 'rejectedBy', select: 'name email' }
    ]);

    // TODO: Send notification to user about rejection
    logger.info(`Advertisement ${id} rejected by admin ${req.user._id}: ${reason}`);

    res.json({
      success: true,
      message: 'Advertisement rejected successfully',
      data: advertisement
    });
  } catch (error) {
    logger.error('Error rejecting advertisement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject advertisement',
      error: error.message
    });
  }
};

// Request changes (send back to user with suggestions)
const requestChanges = async (req, res) => {
  try {
    const { id } = req.params;
    const { suggestions, comments } = req.body;

    if (!suggestions || suggestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one suggestion is required'
      });
    }

    const advertisement = await Advertisement.findById(id);

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    if (advertisement.isApproved) {
      return res.status(400).json({
        success: false,
        message: 'Cannot request changes for an approved advertisement'
      });
    }

    // Update advertisement with change requests
    advertisement.changeRequests = advertisement.changeRequests || [];
    advertisement.changeRequests.push({
      requestedBy: req.user._id,
      requestedAt: new Date(),
      suggestions: suggestions,
      comments: comments,
      status: 'pending'
    });

    advertisement.hasChangeRequests = true;
    advertisement.isActive = false;

    // Add to review history
    advertisement.reviewHistory.push({
      action: 'changes_requested',
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      comments: comments || 'Changes requested',
      suggestions: suggestions
    });

    await advertisement.save();

    // Populate for response
    await advertisement.populate([
      { path: 'userId', select: 'name email' },
      { path: 'companyId', select: 'name businessName' },
      { path: 'changeRequests.requestedBy', select: 'name email' }
    ]);

    // TODO: Send notification to user about change requests
    logger.info(`Changes requested for advertisement ${id} by admin ${req.user._id}`);

    res.json({
      success: true,
      message: 'Change requests sent successfully',
      data: advertisement
    });
  } catch (error) {
    logger.error('Error requesting changes for advertisement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request changes',
      error: error.message
    });
  }
};

// Get advertisement review history
const getAdvertisementHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const advertisement = await Advertisement.findById(id)
      .populate('reviewHistory.reviewedBy', 'name email')
      .populate('changeRequests.requestedBy', 'name email')
      .select('reviewHistory changeRequests title section mediaType createdAt');

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    res.json({
      success: true,
      data: {
        advertisement: {
          _id: advertisement._id,
          title: advertisement.title,
          section: advertisement.section,
          mediaType: advertisement.mediaType,
          createdAt: advertisement.createdAt
        },
        reviewHistory: advertisement.reviewHistory,
        changeRequests: advertisement.changeRequests
      }
    });
  } catch (error) {
    logger.error('Error fetching advertisement history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advertisement history',
      error: error.message
    });
  }
};

// Get advertisement statistics for admin dashboard
const getAdvertisementStats = async (req, res) => {
  try {
    const [
      totalAds,
      pendingAds,
      approvedAds,
      rejectedAds,
      activeAds,
      adsWithChangeRequests,
      sectionStats,
      mediaTypeStats
    ] = await Promise.all([
      Advertisement.countDocuments({}),
      Advertisement.countDocuments({ isApproved: false, isRejected: { $ne: true } }),
      Advertisement.countDocuments({ isApproved: true }),
      Advertisement.countDocuments({ isRejected: true }),
      Advertisement.countDocuments({ isActive: true, isApproved: true }),
      Advertisement.countDocuments({ hasChangeRequests: true }),
      Advertisement.aggregate([
        { $group: { _id: '$section', count: { $sum: 1 } } }
      ]),
      Advertisement.aggregate([
        { $group: { _id: '$mediaType', count: { $sum: 1 } } }
      ])
    ]);

    const stats = {
      overview: {
        total: totalAds,
        pending: pendingAds,
        approved: approvedAds,
        rejected: rejectedAds,
        active: activeAds,
        withChangeRequests: adsWithChangeRequests
      },
      bySection: sectionStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      byMediaType: mediaTypeStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching advertisement statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advertisement statistics',
      error: error.message
    });
  }
};

// Bulk approve advertisements
const bulkApproveAdvertisements = async (req, res) => {
  try {
    const { advertisementIds, comments } = req.body;

    if (!advertisementIds || advertisementIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Advertisement IDs are required'
      });
    }

    const updateData = {
      isApproved: true,
      isActive: true,
      approvedBy: req.user._id,
      approvedAt: new Date(),
      isRejected: false,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      $push: {
        reviewHistory: {
          action: 'bulk_approved',
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
          comments: comments || 'Bulk approved'
        }
      }
    };

    const result = await Advertisement.updateMany(
      {
        _id: { $in: advertisementIds },
        isApproved: false
      },
      updateData
    );

    logger.info(`Bulk approved ${result.modifiedCount} advertisements by admin ${req.user._id}`);

    res.json({
      success: true,
      message: `Successfully approved ${result.modifiedCount} advertisements`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    });
  } catch (error) {
    logger.error('Error bulk approving advertisements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk approve advertisements',
      error: error.message
    });
  }
};

// Bulk reject advertisements
const bulkRejectAdvertisements = async (req, res) => {
  try {
    const { advertisementIds, reason, comments } = req.body;

    if (!advertisementIds || advertisementIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Advertisement IDs are required'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const updateData = {
      isRejected: true,
      isActive: false,
      rejectedBy: req.user._id,
      rejectedAt: new Date(),
      rejectionReason: reason,
      $push: {
        reviewHistory: {
          action: 'bulk_rejected',
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
          comments: comments || reason,
          rejectionReason: reason
        }
      }
    };

    const result = await Advertisement.updateMany(
      {
        _id: { $in: advertisementIds },
        isApproved: false
      },
      updateData
    );

    logger.info(`Bulk rejected ${result.modifiedCount} advertisements by admin ${req.user._id}: ${reason}`);

    res.json({
      success: true,
      message: `Successfully rejected ${result.modifiedCount} advertisements`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    });
  } catch (error) {
    logger.error('Error bulk rejecting advertisements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk reject advertisements',
      error: error.message
    });
  }
};

// Delete advertisement (hard delete from database)
const deleteAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the advertisement first
    const advertisement = await Advertisement.findById(id);
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    // Log the deletion action
    logger.info(`Admin ${req.user.email} deleting advertisement ${id}`, {
      adminId: req.user._id,
      advertisementId: id,
      advertisementTitle: advertisement.title,
      userId: advertisement.userId
    });

    // Delete the advertisement from database
    await Advertisement.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Advertisement deleted successfully',
      deletedId: id
    });

  } catch (error) {
    logger.error('Error deleting advertisement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete advertisement',
      error: error.message
    });
  }
};

module.exports = {
  getPendingAdvertisements,
  getAllAdvertisements, // ✅ NEW: Get all advertisements with filtering
  getAdvertisementById,
  approveAdvertisement,
  rejectAdvertisement,
  requestChanges,
  getAdvertisementHistory,
  getAdvertisementStats,
  bulkApproveAdvertisements,
  bulkRejectAdvertisements,
  deleteAdvertisement // ✅ NEW: Delete function
};