const Customer = require('../models/Customer');
const { validationResult } = require('express-validator');

class CustomerController {
  // Create new customer
  async createCustomer(req, res) {
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
      const existingCustomer = await Customer.findByPhone(req.body.phone);
      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: 'Customer with this phone number already exists'
        });
      }

      // Check if email already exists (if provided)
      if (req.body.email) {
        const existingEmail = await Customer.findByEmail(req.body.email);
        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: 'Customer with this email already exists'
          });
        }
      }

      const customerData = {
        ...req.body,
        createdBy: req.user.id,
        updatedBy: req.user.id
      };

      const customer = new Customer(customerData);
      await customer.save();

      res.status(201).json({
        success: true,
        message: 'Customer created successfully',
        data: customer
      });
    } catch (error) {
      console.error('Create customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating customer',
        error: error.message
      });
    }
  }

  // Get all customers with pagination and search
  async getCustomers(req, res) {
    try {
      const { page = 1, limit = 20, search, sortBy = 'name', sortOrder = 'asc' } = req.query;
      const skip = (page - 1) * limit;

      let query = { isActive: true };
      
      // Search functionality
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { name: searchRegex },
          { phone: searchRegex },
          { email: searchRegex },
          { company: searchRegex }
        ];
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const customers = await Customer.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Customer.countDocuments(query);

      res.json({
        success: true,
        data: customers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get customers error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching customers',
        error: error.message
      });
    }
  }

  // Search customers for autocomplete
  async searchCustomers(req, res) {
    try {
      const { query } = req.query;
      
      if (!query || query.length < 2) {
        return res.json({
          success: true,
          data: []
        });
      }

      const customers = await Customer.searchCustomers(query);
      
      res.json({
        success: true,
        data: customers.map(customer => ({
          id: customer._id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          company: customer.company,
          currentBalance: customer.currentBalance
        }))
      });
    } catch (error) {
      console.error('Search customers error:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching customers',
        error: error.message
      });
    }
  }

  // Get customer by ID
  async getCustomer(req, res) {
    try {
      const customer = await Customer.findOne({ _id: req.params.id, isActive: true });
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      res.json({
        success: true,
        data: customer
      });
    } catch (error) {
      console.error('Get customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching customer',
        error: error.message
      });
    }
  }

  // Update customer
  async updateCustomer(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const customer = await Customer.findOne({ _id: req.params.id, isActive: true });
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      // Check if phone is being changed and if new phone already exists
      if (req.body.phone && req.body.phone !== customer.phone) {
        const existingCustomer = await Customer.findByPhone(req.body.phone);
        if (existingCustomer) {
          return res.status(400).json({
            success: false,
            message: 'Another customer with this phone number already exists'
          });
        }
      }

      // Check if email is being changed and if new email already exists
      if (req.body.email && req.body.email !== customer.email) {
        const existingEmail = await Customer.findByEmail(req.body.email);
        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: 'Another customer with this email already exists'
          });
        }
      }

      const updateData = {
        ...req.body,
        updatedBy: req.user.id
      };

      const updatedCustomer = await Customer.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: 'Customer updated successfully',
        data: updatedCustomer
      });
    } catch (error) {
      console.error('Update customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating customer',
        error: error.message
      });
    }
  }

  // Soft delete customer
  async deleteCustomer(req, res) {
    try {
      const customer = await Customer.findOne({ _id: req.params.id, isActive: true });
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      customer.isActive = false;
      customer.updatedBy = req.user.id;
      await customer.save();

      res.json({
        success: true,
        message: 'Customer deleted successfully'
      });
    } catch (error) {
      console.error('Delete customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting customer',
        error: error.message
      });
    }
  }

  // Update customer balance
  async updateBalance(req, res) {
    try {
      const { amount, type, description } = req.body;
      
      if (!amount || !type) {
        return res.status(400).json({
          success: false,
          message: 'Amount and type are required'
        });
      }

      const customer = await Customer.findOne({ _id: req.params.id, isActive: true });
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      await customer.updateBalance(amount, type);

      res.json({
        success: true,
        message: `Customer balance updated successfully`,
        data: {
          id: customer._id,
          name: customer.name,
          currentBalance: customer.currentBalance
        }
      });
    } catch (error) {
      console.error('Update balance error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating customer balance',
        error: error.message
      });
    }
  }

  // Get customers with outstanding balance
  async getOutstandingCustomers(req, res) {
    try {
      const { minAmount = 0 } = req.query;
      
      const customers = await Customer.find({
        isActive: true,
        currentBalance: { $gte: minAmount }
      }).sort({ currentBalance: -1 });

      res.json({
        success: true,
        data: customers.map(customer => ({
          id: customer._id,
          name: customer.name,
          phone: customer.phone,
          company: customer.company,
          currentBalance: customer.currentBalance
        }))
      });
    } catch (error) {
      console.error('Get outstanding customers error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching outstanding customers',
        error: error.message
      });
    }
  }

  // Get customer statistics
  async getCustomerStats(req, res) {
    try {
      const stats = await Customer.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalCustomers: { $sum: 1 },
            totalBalance: { $sum: '$currentBalance' },
            avgBalance: { $avg: '$currentBalance' },
            customersWithBalance: {
              $sum: { $cond: [{ $gt: ['$currentBalance', 0] }, 1, 0] }
            },
            customersWithCredit: {
              $sum: { $cond: [{ $lt: ['$currentBalance', 0] }, 1, 0] }
            }
          }
        }
      ]);

      res.json({
        success: true,
        data: stats[0] || {
          totalCustomers: 0,
          totalBalance: 0,
          avgBalance: 0,
          customersWithBalance: 0,
          customersWithCredit: 0
        }
      });
    } catch (error) {
      console.error('Get customer stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching customer statistics',
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

      const existingCustomer = await Customer.findByPhone(phone);
      
      res.json({
        success: true,
        exists: !!existingCustomer,
        data: existingCustomer ? { 
          id: existingCustomer._id, 
          name: existingCustomer.name 
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

      const existingCustomer = await Customer.findByEmail(email);
      
      res.json({
        success: true,
        exists: !!existingCustomer,
        data: existingCustomer ? { 
          id: existingCustomer._id, 
          name: existingCustomer.name 
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

module.exports = new CustomerController();