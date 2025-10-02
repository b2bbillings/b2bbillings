const Shop = require('../models/Shop');
const User = require('../models/User');
const logger = require('../config/logger');

// Create a new shop
const createShop = async (req, res) => {
  try {
    const {
      ownerName,
      ownerPhone,
      ownerEmail,
      shopName,
      shopPhone,
      alternatePhone,
      email,
      website,
      businessCategory,
      businessType,
      businessModel,
      establishedYear,
      employeeCount,
      gstNumber,
      panNumber,
      licenseNumber,
      trademarkNumber,
      address,
      location,
      images,
      operatingHours,
      services,
      products,
      paymentMethods,
      socialMedia,
      delivery,
      description,
      specialOffers
    } = req.body;

    // Validate required fields
    if (!ownerName || !ownerPhone || !ownerEmail || !shopName || !shopPhone || !businessCategory) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: ownerName, ownerPhone, ownerEmail, shopName, shopPhone, businessCategory'
      });
    }

    // Check if address is provided and has required fields
    if (!address || !address.street || !address.state || !address.pincode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide complete address with street, state, and pincode'
      });
    }

    // Find or create owner user
    let owner = await User.findOne({ email: ownerEmail });
    if (!owner) {
      // Create new user for the shop owner
      owner = new User({
        firstName: ownerName.split(' ')[0] || ownerName,
        lastName: ownerName.split(' ').slice(1).join(' ') || '',
        email: ownerEmail,
        phone: ownerPhone,
        role: 'shop_owner'
      });
      await owner.save();
    }

    // Check if shop with same name already exists for this owner
    const existingShop = await Shop.findOne({ owner: owner._id, shopName });
    if (existingShop) {
      return res.status(400).json({
        success: false,
        message: 'A shop with this name already exists for this owner'
      });
    }

    // Create new shop
    const shop = new Shop({
      owner: owner._id,
      ownerName,
      ownerPhone,
      ownerEmail,
      shopName,
      shopPhone,
      alternatePhone,
      email,
      website,
      businessCategory,
      businessType,
      businessModel,
      establishedYear,
      employeeCount,
      gstNumber,
      panNumber,
      licenseNumber,
      trademarkNumber,
      address,
      location,
      images,
      operatingHours,
      services,
      products,
      paymentMethods,
      socialMedia,
      delivery,
      description,
      specialOffers
    });

    await shop.save();

    logger.info(`New shop created: ${shopName} by ${ownerName}`);

    res.status(201).json({
      success: true,
      message: 'Shop created successfully',
      data: shop
    });

  } catch (error) {
    logger.error('Error creating shop:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create shop',
      error: error.message
    });
  }
};

// Get all shops with filters
const getShops = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      businessCategory,
      state,
      district,
      taluka,
      village,
      pincode,
      isActive = true,
      isVerified,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (businessCategory) filter.businessCategory = businessCategory;
    if (state) filter['address.state'] = new RegExp(state, 'i');
    if (district) filter['address.district'] = new RegExp(district, 'i');
    if (taluka) filter['address.taluka'] = new RegExp(taluka, 'i');
    if (village) filter['address.village'] = new RegExp(village, 'i');
    if (pincode) filter['address.pincode'] = pincode;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (isVerified !== undefined) filter.isVerified = isVerified === 'true';
    
    // Add text search
    if (search) {
      filter.$or = [
        { shopName: new RegExp(search, 'i') },
        { ownerName: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { 'address.street': new RegExp(search, 'i') }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get shops with pagination
    const shops = await Shop.find(filter)
      .populate('owner', 'firstName lastName email phone')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Shop.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: shops,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Error fetching shops:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shops',
      error: error.message
    });
  }
};

// Get shop by ID
const getShopById = async (req, res) => {
  try {
    const { id } = req.params;

    const shop = await Shop.findById(id).populate('owner', 'firstName lastName email phone avatar');

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }

    res.status(200).json({
      success: true,
      data: shop
    });

  } catch (error) {
    logger.error('Error fetching shop:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shop',
      error: error.message
    });
  }
};

// Update shop
const updateShop = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.owner;
    delete updateData._id;
    delete updateData.createdAt;

    const shop = await Shop.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('owner', 'firstName lastName email phone');

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }

    logger.info(`Shop updated: ${shop.shopName} (ID: ${id})`);

    res.status(200).json({
      success: true,
      message: 'Shop updated successfully',
      data: shop
    });

  } catch (error) {
    logger.error('Error updating shop:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update shop',
      error: error.message
    });
  }
};

// Delete shop
const deleteShop = async (req, res) => {
  try {
    const { id } = req.params;

    const shop = await Shop.findByIdAndDelete(id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }

    logger.info(`Shop deleted: ${shop.shopName} (ID: ${id})`);

    res.status(200).json({
      success: true,
      message: 'Shop deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting shop:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete shop',
      error: error.message
    });
  }
};

// Get shops by owner
const getShopsByOwner = async (req, res) => {
  try {
    const { ownerId } = req.params;

    const shops = await Shop.find({ owner: ownerId }).populate('owner', 'firstName lastName email phone');

    res.status(200).json({
      success: true,
      data: shops
    });

  } catch (error) {
    logger.error('Error fetching shops by owner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shops by owner',
      error: error.message
    });
  }
};

// Get shops by location (nearby shops)
const getNearbyShops = async (req, res) => {
  try {
    const { longitude, latitude, radius = 10 } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: 'Please provide longitude and latitude'
      });
    }

    const shops = await Shop.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseFloat(radius) * 1000 // Convert km to meters
        }
      },
      isActive: true
    }).populate('owner', 'firstName lastName email phone');

    res.status(200).json({
      success: true,
      data: shops
    });

  } catch (error) {
    logger.error('Error fetching nearby shops:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby shops',
      error: error.message
    });
  }
};

// Update shop verification status
const updateVerificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationStatus, isVerified } = req.body;

    if (!verificationStatus || !['pending', 'verified', 'rejected'].includes(verificationStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid verification status: pending, verified, or rejected'
      });
    }

    const shop = await Shop.findByIdAndUpdate(
      id,
      { 
        verificationStatus,
        isVerified: verificationStatus === 'verified',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }

    logger.info(`Shop verification status updated: ${shop.shopName} - ${verificationStatus}`);

    res.status(200).json({
      success: true,
      message: 'Verification status updated successfully',
      data: shop
    });

  } catch (error) {
    logger.error('Error updating verification status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update verification status',
      error: error.message
    });
  }
};

// Get shop statistics
const getShopStats = async (req, res) => {
  try {
    const totalShops = await Shop.countDocuments();
    const activeShops = await Shop.countDocuments({ isActive: true });
    const verifiedShops = await Shop.countDocuments({ isVerified: true });
    const pendingVerification = await Shop.countDocuments({ verificationStatus: 'pending' });

    // Get shops by category
    const shopsByCategory = await Shop.aggregate([
      { $group: { _id: '$businessCategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get shops by state
    const shopsByState = await Shop.aggregate([
      { $group: { _id: '$address.state', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalShops,
        activeShops,
        verifiedShops,
        pendingVerification,
        shopsByCategory,
        shopsByState
      }
    });

  } catch (error) {
    logger.error('Error fetching shop statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shop statistics',
      error: error.message
    });
  }
};

module.exports = {
  createShop,
  getShops,
  getShopById,
  updateShop,
  deleteShop,
  getShopsByOwner,
  getNearbyShops,
  updateVerificationStatus,
  getShopStats
};