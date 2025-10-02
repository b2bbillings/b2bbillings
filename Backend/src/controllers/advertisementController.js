const Advertisement = require('../models/Advertisement');
const User = require('../models/User');
const Company = require('../models/Company');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const logger = require('../config/logger');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/advertisements');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ad-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogg'
  };
  
  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  }
});

// Get all advertisements with filtering
const getAdvertisements = async (req, res) => {
  try {
    const {
      section,
      isActive,
      isApproved,
      mediaType,
      userId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (section) query.section = section;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isApproved !== undefined) query.isApproved = isApproved === 'true';
    if (mediaType) query.mediaType = mediaType;
    if (userId) query.userId = userId;

    // For non-admin users, only show approved and active ads
    if (!req.user.isAdmin) {
      query.isApproved = true;
      query.isActive = true;
      query.isBlocked = false;
    }

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
    logger.error('Error fetching advertisements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advertisements',
      error: error.message
    });
  }
};

// Get advertisements by section (optimized for display)
const getAdsBySection = async (req, res) => {
  try {
    const { section } = req.params;
    const { limit = 10 } = req.query;

    if (!['banner', 'sidebar', 'whatsapp'].includes(section)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section. Must be banner, sidebar, or whatsapp'
      });
    }

    const advertisements = await Advertisement.getActiveAdsBySection(section, parseInt(limit));

    res.json({
      success: true,
      data: advertisements,
      count: advertisements.length
    });
  } catch (error) {
    logger.error('Error fetching ads by section:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advertisements',
      error: error.message
    });
  }
};

// Get single advertisement
const getAdvertisementById = async (req, res) => {
  try {
    const { id } = req.params;

    const advertisement = await Advertisement.findById(id)
      .populate('userId', 'name email')
      .populate('companyId', 'name businessName')
      .populate('approvedBy', 'name email')
      .populate('blockedBy', 'name email');

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    // Check permissions
    if (!req.user.isAdmin && advertisement.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: advertisement
    });
  } catch (error) {
    logger.error('Error fetching advertisement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advertisement',
      error: error.message
    });
  }
};

// Create new advertisement
const createAdvertisement = async (req, res) => {
  try {
    console.log('📝 Creating advertisement - Request body:', req.body);
    console.log('👤 User details:', req.user);
    console.log('🔎 Request headers (partial):', {
      authorization: req.headers.authorization ? 'present' : 'missing',
      'x-auth-token': req.headers['x-auth-token'] ? 'present' : 'missing',
      'x-company-id': req.headers['x-company-id'] || null
    });

    // Get user ID and company ID from standardized req.user object
    const userId = req.user && (req.user.id || req.user._id);
    const companyId = req.user && (req.user.companyId || req.user.currentCompany);

    if (!userId) {
      // Log more context to help debug missing auth
      logger.error('createAdvertisement: Missing userId in req.user', {
        headers: {
          authorization: !!req.headers.authorization,
          'x-auth-token': !!req.headers['x-auth-token']
        },
        bodySample: {
          title: req.body.title,
          mediaType: req.body.mediaType
        }
      });

      return res.status(401).json({
        success: false,
        message: 'Authentication required. User ID not found.',
        code: 'MISSING_USER_ID'
      });
    }

    const {
      title,
      description,
      mediaType,
      section,
      priority,
      targetCategory,
      specificIndustry,
      ctaText,
      ctaUrl,
      startDate,
      endDate,
      budget,
      costPerImpression,
      costPerClick,
      targetAudience,
      autoPlay,
      muted,
      showControls,
      mediaUrl,
      mediaSize,
      mediaFormat
    } = req.body;

    // Validate required fields
    if (!title || !mediaType || !section) {
      return res.status(400).json({
        success: false,
        message: 'Title, media type, and section are required'
      });
    }

    // Validate targetCategory
    const validCategories = [
      'all_businesses', 'retailers', 'wholesalers', 'manufacturers', 
      'distributors', 'importers', 'exporters', 'service_providers',
      'consultants', 'freelancers', 'startups', 'established_companies', 
      'specific_industry'
    ];
    
    if (targetCategory && !validCategories.includes(targetCategory)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target category'
      });
    }

    // Validate specificIndustry when targetCategory is 'specific_industry'
    if (targetCategory === 'specific_industry' && !specificIndustry) {
      return res.status(400).json({
        success: false,
        message: 'Specific industry is required when target category is specific_industry'
      });
    }

    // Validate media URL for non-text ads
    if (mediaType !== 'text' && !mediaUrl) {
      logger.warn('createAdvertisement: Missing mediaUrl for non-text ad', {
        userId,
        mediaType,
        body: { title }
      });

      return res.status(400).json({
        success: false,
        message: 'Media URL is required for image and video advertisements',
        code: 'MISSING_MEDIA_URL'
      });
    }

    // Check section limits
    const sectionLimits = {
      banner: 10,
      sidebar: 5,
      whatsapp: 8
    };

    const userAdsInSection = await Advertisement.countDocuments({
      userId: userId,
      section,
      isActive: true
    });

    if (userAdsInSection >= sectionLimits[section]) {
      return res.status(400).json({
        success: false,
        message: `You can only have ${sectionLimits[section]} active ads in the ${section} section`
      });
    }

    const advertisementData = {
      title,
      description,
      mediaType,
      section,
      priority: priority || 5,
      targetCategory: targetCategory || 'all_businesses',
      specificIndustry: targetCategory === 'specific_industry' ? specificIndustry : undefined,
      ctaText,
      ctaUrl,
      userId: userId,
      companyId: companyId,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      budget: budget || 0,
      costPerImpression: costPerImpression || 0,
      costPerClick: costPerClick || 0,
      targetAudience: targetAudience && typeof targetAudience === 'string' ? JSON.parse(targetAudience) : targetAudience,
      autoPlay: autoPlay !== undefined ? autoPlay === 'true' : true,
      muted: muted !== undefined ? muted === 'true' : true,
      showControls: showControls !== undefined ? showControls === 'true' : true
    };

    // Add media fields for non-text ads
    if (mediaType !== 'text') {
      advertisementData.mediaUrl = mediaUrl;
      advertisementData.mediaSize = mediaSize || 0;
      advertisementData.mediaFormat = mediaFormat;
    }

    console.log('💾 Advertisement data to save:', advertisementData);

    const advertisement = new Advertisement(advertisementData);
    try {
      await advertisement.save();
    } catch (saveErr) {
      // If mongoose validation error, return 400 with details
      if (saveErr.name === 'ValidationError') {
        const validationErrors = Object.keys(saveErr.errors).map((k) => ({
          field: k,
          message: saveErr.errors[k].message
        }));

        logger.warn('Advertisement validation failed', { validationErrors, advertisementData });

        return res.status(400).json({
          success: false,
          message: 'Advertisement validation failed',
          code: 'VALIDATION_ERROR',
          errors: validationErrors
        });
      }

      // otherwise rethrow
      throw saveErr;
    }

    // Populate using a lean query to avoid executing document virtual getters
    // Some User/Company virtuals may access undefined fields and throw during toJSON
    let responseAd;
    try {
      const query = Advertisement.findById(advertisement._id).populate('userId', 'name email');
      if (advertisementData.companyId) {
        query.populate('companyId', 'name businessName');
      }
      responseAd = await query.lean().exec();
    } catch (popErr) {
      logger.error('Advertisement populate failed, returning raw document', popErr);
      try {
        responseAd = advertisement.toObject ? advertisement.toObject() : advertisement;
        // Remove nested populated objects that could cause serialization issues
        if (responseAd.userId && typeof responseAd.userId !== 'string') delete responseAd.userId;
        if (responseAd.companyId && typeof responseAd.companyId !== 'string') delete responseAd.companyId;
      } catch (convErr) {
        logger.error('Failed to convert advertisement to plain object', convErr);
        responseAd = { _id: advertisement._id };
      }
    }

    res.status(201).json({
      success: true,
      message: 'Advertisement created successfully',
      data: responseAd
    });
  } catch (error) {
    logger.error('Error creating advertisement:', error);
    console.error('❌ Advertisement creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create advertisement',
      error: error.message
    });
  }
};

// Upload advertisement media
const uploadMedia = async (req, res) => {
  upload.single('media')(req, res, async (err) => {
    if (err) {
      logger.error('File upload error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed'
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const { adId } = req.body;
      const mediaUrl = `/uploads/advertisements/${req.file.filename}`;
      const mediaFormat = path.extname(req.file.originalname).slice(1);

      // If adId is provided, update existing ad
      if (adId) {
        const advertisement = await Advertisement.findById(adId);
        
        if (!advertisement) {
          // Clean up uploaded file
          fs.unlinkSync(req.file.path);
          return res.status(404).json({
            success: false,
            message: 'Advertisement not found'
          });
        }

        // Check ownership
        if (advertisement.userId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
          // Clean up uploaded file
          fs.unlinkSync(req.file.path);
          return res.status(403).json({
            success: false,
            message: 'Access denied'
          });
        }

        // Delete old media file if exists
        if (advertisement.mediaUrl) {
          const oldFilePath = path.join(__dirname, '../../', advertisement.mediaUrl);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }

        advertisement.mediaUrl = mediaUrl;
        advertisement.mediaSize = req.file.size;
        advertisement.mediaFormat = mediaFormat;
        await advertisement.save();

        res.json({
          success: true,
          message: 'Media uploaded and updated successfully',
          data: {
            mediaUrl,
            mediaSize: req.file.size,
            mediaFormat
          }
        });
      } else {
        // Return media info for new ad creation
        res.json({
          success: true,
          message: 'Media uploaded successfully',
          data: {
            mediaUrl,
            mediaSize: req.file.size,
            mediaFormat,
            originalName: req.file.originalname
          }
        });
      }
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      logger.error('Error processing media upload:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process media upload',
        error: error.message
      });
    }
  });
};

// Update advertisement
const updateAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const advertisement = await Advertisement.findById(id);

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    // Check ownership
    if (advertisement.userId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Remove fields that shouldn't be updated by regular users
    if (!req.user.isAdmin) {
      delete updates.isApproved;
      delete updates.approvedBy;
      delete updates.approvedAt;
      delete updates.isBlocked;
      delete updates.blockedBy;
      delete updates.blockedAt;
      delete updates.blockedReason;
    }

    Object.assign(advertisement, updates);
    await advertisement.save();

    // Use lean populate to avoid running document virtuals which may throw
    let responseAd;
    try {
      const query = Advertisement.findById(advertisement._id).populate('userId', 'name email');
      query.populate('companyId', 'name businessName');
      responseAd = await query.lean().exec();
    } catch (popErr) {
      logger.error('Advertisement populate failed after update, returning raw document', popErr);
      try {
        responseAd = advertisement.toObject ? advertisement.toObject() : advertisement;
        if (responseAd.userId && typeof responseAd.userId !== 'string') delete responseAd.userId;
        if (responseAd.companyId && typeof responseAd.companyId !== 'string') delete responseAd.companyId;
      } catch (convErr) {
        logger.error('Failed to convert advertisement to plain object after update', convErr);
        responseAd = { _id: advertisement._id };
      }
    }

    res.json({
      success: true,
      message: 'Advertisement updated successfully',
      data: responseAd
    });
  } catch (error) {
    logger.error('Error updating advertisement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update advertisement',
      error: error.message
    });
  }
};

// Delete advertisement
const deleteAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;

    const advertisement = await Advertisement.findById(id);

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    // Check ownership
    if (advertisement.userId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Delete media file if exists
    if (advertisement.mediaUrl) {
      const filePath = path.join(__dirname, '../../', advertisement.mediaUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Advertisement.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Advertisement deleted successfully'
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

// Track impression
const trackImpression = async (req, res) => {
  try {
    const { id } = req.params;

    const advertisement = await Advertisement.findById(id);

    if (!advertisement || !advertisement.isCurrentlyActive) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found or not active'
      });
    }

    await advertisement.incrementImpression();

    res.json({
      success: true,
      message: 'Impression tracked successfully'
    });
  } catch (error) {
    logger.error('Error tracking impression:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track impression'
    });
  }
};

// Track click
const trackClick = async (req, res) => {
  try {
    const { id } = req.params;

    const advertisement = await Advertisement.findById(id);

    if (!advertisement || !advertisement.isCurrentlyActive) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found or not active'
      });
    }

    await advertisement.incrementClick();

    res.json({
      success: true,
      message: 'Click tracked successfully',
      redirectUrl: advertisement.ctaUrl
    });
  } catch (error) {
    logger.error('Error tracking click:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track click'
    });
  }
};

// Get user's advertisements
const getUserAdvertisements = async (req, res) => {
  try {
    const { section, isActive, page = 1, limit = 10 } = req.query;

    const options = { section, isActive };
    const skip = (page - 1) * limit;

    const [advertisements, total] = await Promise.all([
      Advertisement.getUserAds(req.user._id, options)
        .skip(skip)
        .limit(parseInt(limit)),
      Advertisement.countDocuments({
        userId: req.user._id,
        ...(section && { section }),
        ...(isActive !== undefined && { isActive: isActive === 'true' })
      })
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
    logger.error('Error fetching user advertisements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advertisements',
      error: error.message
    });
  }
};

// Get advertisement analytics
const getAdvertisementAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '7d' } = req.query;

    const advertisement = await Advertisement.findById(id);

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    // Check ownership
    if (advertisement.userId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Calculate analytics
    const analytics = {
      impressions: advertisement.impressions,
      clicks: advertisement.clicks,
      ctr: advertisement.ctr,
      totalSpent: advertisement.totalSpent,
      remainingBudget: advertisement.remainingBudget,
      isActive: advertisement.isCurrentlyActive,
      performanceScore: calculatePerformanceScore(advertisement)
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error fetching advertisement analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
};

// Helper function to calculate performance score
const calculatePerformanceScore = (ad) => {
  let score = 0;
  
  // CTR score (0-40 points)
  if (ad.impressions > 0) {
    const ctr = (ad.clicks / ad.impressions) * 100;
    score += Math.min(40, ctr * 10);
  }
  
  // Impression score (0-30 points)
  score += Math.min(30, ad.impressions / 100);
  
  // Engagement score (0-30 points)
  if (ad.clicks > 0) {
    score += Math.min(30, ad.clicks * 2);
  }
  
  return Math.round(score);
};

// Admin: Approve advertisement
const approveAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const advertisement = await Advertisement.findById(id);

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    await advertisement.approve(req.user._id);

    res.json({
      success: true,
      message: 'Advertisement approved successfully'
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

// Admin: Block advertisement
const blockAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const advertisement = await Advertisement.findById(id);

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    await advertisement.block(reason, req.user._id);

    res.json({
      success: true,
      message: 'Advertisement blocked successfully'
    });
  } catch (error) {
    logger.error('Error blocking advertisement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to block advertisement',
      error: error.message
    });
  }
};

module.exports = {
  getAdvertisements,
  getAdsBySection,
  getAdvertisementById,
  createAdvertisement,
  uploadMedia,
  updateAdvertisement,
  deleteAdvertisement,
  trackImpression,
  trackClick,
  getUserAdvertisements,
  getAdvertisementAnalytics,
  approveAdvertisement,
  blockAdvertisement
};