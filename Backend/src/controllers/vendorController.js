const Vendor = require('../models/Vendor');
const { validationResult } = require('express-validator');

class VendorController {
  // Create new vendor
  async createVendor(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      // Check if phone already exists
      const existingVendor = await Vendor.findByPhone(req.body.phone);
      if (existingVendor) {
        return res.status(400).json({
          success: false,
          message: 'Vendor with this phone number already exists'
        });
      }

      // Check if email already exists (if provided)
      if (req.body.email) {
        const existingEmail = await Vendor.findByEmail(req.body.email);
        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: 'Vendor with this email already exists'
          });
        }
      }

      // Check GSTIN uniqueness if provided
      if (req.body.gstin) {
        const existingGstin = await Vendor.findOne({ gstin: req.body.gstin, isActive: true });
        if (existingGstin) {
          return res.status(400).json({
            success: false,
            message: 'Vendor with this GSTIN already exists'
          });
        }
      }

      const vendorData = {
        ...req.body,
        createdBy: req.user.id,
        updatedBy: req.user.id
      };

      const vendor = new Vendor(vendorData);
      await vendor.save();

      res.status(201).json({
        success: true,
        message: 'Vendor created successfully',
        data: vendor
      });
    } catch (error) {
      console.error('Create vendor error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating vendor',
        error: error.message
      });
    }
  }

  // Get all vendors with pagination and search
  async getVendors(req, res) {
    try {
      const { page = 1, limit = 20, search, sortBy = 'name', sortOrder = 'asc', vendorType } = req.query;
      const skip = (page - 1) * limit;

      let query = { isActive: true };
      
      // Filter by vendor type
      if (vendorType) {
        query.vendorType = vendorType;
      }
      
      // Search functionality
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { name: searchRegex },
          { phone: searchRegex },
          { email: searchRegex },
          { company: searchRegex },
          { gstin: searchRegex }
        ];
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const vendors = await Vendor.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Vendor.countDocuments(query);

      res.json({
        success: true,
        data: vendors,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get vendors error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching vendors',
        error: error.message
      });
    }
  }

  // Search vendors for autocomplete
  async searchVendors(req, res) {
    try {
      const { query } = req.query;
      
      if (!query || query.length < 2) {
        return res.json({
          success: true,
          data: []
        });
      }

      const vendors = await Vendor.searchVendors(query);
      
      res.json({
        success: true,
        data: vendors.map(vendor => ({
          id: vendor._id,
          name: vendor.displayName,
          phone: vendor.phone,
          email: vendor.email,
          company: vendor.company,
          gstType: vendor.gstType,
          gstin: vendor.gstin,
          currentBalance: vendor.currentBalance,
          vendorType: vendor.vendorType
        }))
      });
    } catch (error) {
      console.error('Search vendors error:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching vendors',
        error: error.message
      });
    }
  }

  // Get vendor by ID
  async getVendor(req, res) {
    try {
      const vendor = await Vendor.findOne({ _id: req.params.id, isActive: true });
      
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      res.json({
        success: true,
        data: vendor
      });
    } catch (error) {
      console.error('Get vendor error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching vendor',
        error: error.message
      });
    }
  }

  // Update vendor
  async updateVendor(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const vendor = await Vendor.findOne({ _id: req.params.id, isActive: true });
      
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      // Check if phone is being changed and if new phone already exists
      if (req.body.phone && req.body.phone !== vendor.phone) {
        const existingVendor = await Vendor.findByPhone(req.body.phone);
        if (existingVendor) {
          return res.status(400).json({
            success: false,
            message: 'Another vendor with this phone number already exists'
          });
        }
      }

      // Check if email is being changed and if new email already exists
      if (req.body.email && req.body.email !== vendor.email) {
        const existingEmail = await Vendor.findByEmail(req.body.email);
        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: 'Another vendor with this email already exists'
          });
        }
      }

      // Check GSTIN uniqueness if being changed
      if (req.body.gstin && req.body.gstin !== vendor.gstin) {
        const existingGstin = await Vendor.findOne({ 
          gstin: req.body.gstin, 
          isActive: true,
          _id: { $ne: req.params.id }
        });
        if (existingGstin) {
          return res.status(400).json({
            success: false,
            message: 'Another vendor with this GSTIN already exists'
          });
        }
      }

      const updateData = {
        ...req.body,
        updatedBy: req.user.id
      };

      const updatedVendor = await Vendor.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: 'Vendor updated successfully',
        data: updatedVendor
      });
    } catch (error) {
      console.error('Update vendor error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating vendor',
        error: error.message
      });
    }
  }

  // Soft delete vendor
  async deleteVendor(req, res) {
    try {
      const vendor = await Vendor.findOne({ _id: req.params.id, isActive: true });
      
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      vendor.isActive = false;
      vendor.updatedBy = req.user.id;
      await vendor.save();

      res.json({
        success: true,
        message: 'Vendor deleted successfully'
      });
    } catch (error) {
      console.error('Delete vendor error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting vendor',
        error: error.message
      });
    }
  }

  // Update vendor balance
  async updateBalance(req, res) {
    try {
      const { amount, type, description } = req.body;
      
      if (!amount || !type) {
        return res.status(400).json({
          success: false,
          message: 'Amount and type are required'
        });
      }

      const vendor = await Vendor.findOne({ _id: req.params.id, isActive: true });
      
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      await vendor.updateBalance(amount, type);

      res.json({
        success: true,
        message: `Vendor balance updated successfully`,
        data: {
          id: vendor._id,
          name: vendor.displayName,
          currentBalance: vendor.currentBalance
        }
      });
    } catch (error) {
      console.error('Update balance error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating vendor balance',
        error: error.message
      });
    }
  }

  // Get vendors with outstanding balance (money we owe them)
  async getOutstandingVendors(req, res) {
    try {
      const { minAmount = 0 } = req.query;
      
      const vendors = await Vendor.find({
        isActive: true,
        currentBalance: { $lte: -minAmount } // Negative balance means we owe them
      }).sort({ currentBalance: 1 });

      res.json({
        success: true,
        data: vendors.map(vendor => ({
          id: vendor._id,
          name: vendor.displayName,
          phone: vendor.phone,
          company: vendor.company,
          vendorType: vendor.vendorType,
          currentBalance: vendor.currentBalance,
          paymentTerms: vendor.paymentTerms
        }))
      });
    } catch (error) {
      console.error('Get outstanding vendors error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching outstanding vendors',
        error: error.message
      });
    }
  }

  // Get vendors by type
  async getVendorsByType(req, res) {
    try {
      const { type } = req.params;
      
      const vendors = await Vendor.findByType(type);
      
      res.json({
        success: true,
        data: vendors
      });
    } catch (error) {
      console.error('Get vendors by type error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching vendors by type',
        error: error.message
      });
    }
  }

  // Get vendor statistics
  async getVendorStats(req, res) {
    try {
      const stats = await Vendor.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalVendors: { $sum: 1 },
            totalBalance: { $sum: '$currentBalance' },
            avgBalance: { $avg: '$currentBalance' },
            vendorsWithDebit: {
              $sum: { $cond: [{ $lt: ['$currentBalance', 0] }, 1, 0] }
            },
            vendorsWithCredit: {
              $sum: { $cond: [{ $gt: ['$currentBalance', 0] }, 1, 0] }
            }
          }
        }
      ]);

      // Get vendor type distribution
      const typeStats = await Vendor.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$vendorType',
            count: { $sum: 1 }
          }
        }
      ]);

      // Get GST type distribution
      const gstStats = await Vendor.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$gstType',
            count: { $sum: 1 }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          overview: stats[0] || {
            totalVendors: 0,
            totalBalance: 0,
            avgBalance: 0,
            vendorsWithDebit: 0,
            vendorsWithCredit: 0
          },
          typeDistribution: typeStats,
          gstDistribution: gstStats
        }
      });
    } catch (error) {
      console.error('Get vendor stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching vendor statistics',
        error: error.message
      });
    }
  }

  // Validate GSTIN
  async validateGstin(req, res) {
    try {
      const { gstin } = req.body;
      
      if (!gstin) {
        return res.status(400).json({
          success: false,
          message: 'GSTIN is required'
        });
      }

      // Check if GSTIN already exists
      const existingVendor = await Vendor.findOne({ gstin, isActive: true });
      
      if (existingVendor) {
        return res.status(400).json({
          success: false,
          message: 'GSTIN already exists',
          existingVendor: {
            id: existingVendor._id,
            name: existingVendor.displayName,
            phone: existingVendor.phone
          }
        });
      }

      // Validate GSTIN format
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      const isValid = gstinRegex.test(gstin);

      res.json({
        success: true,
        isValid,
        message: isValid ? 'GSTIN is valid' : 'Invalid GSTIN format'
      });
    } catch (error) {
      console.error('Validate GSTIN error:', error);
      res.status(500).json({
        success: false,
        message: 'Error validating GSTIN',
        error: error.message
      });
    }
  }

  // Check if phone number exists
  async checkPhoneExists(req, res) {
    try {
      const { phone } = req.query;
      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      const existingVendor = await Vendor.findByPhone(phone);
      
      res.json({
        success: true,
        exists: !!existingVendor,
        data: existingVendor ? { 
          id: existingVendor._id, 
          name: existingVendor.name 
        } : null
      });
    } catch (error) {
      console.error('Check phone exists error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking phone number',
        error: error.message
      });
    }
  }

  // Check if email exists
  async checkEmailExists(req, res) {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      const existingVendor = await Vendor.findByEmail(email);
      
      res.json({
        success: true,
        exists: !!existingVendor,
        data: existingVendor ? { 
          id: existingVendor._id, 
          name: existingVendor.name 
        } : null
      });
    } catch (error) {
      console.error('Check email exists error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking email',
        error: error.message
      });
    }
  }
}

module.exports = new VendorController();