const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const authMiddleware = require('../middleware/authMiddleware');
const { body, param, query } = require('express-validator');
const validation = require('../middleware/validation');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Validation middleware
const createBillValidation = [
  body('invoiceType')
    .notEmpty()
    .withMessage('Invoice type is required')
    .isIn(['Tax Invoice', 'Proforma Invoice', 'Commercial Invoice', 'Debit Note', 'Credit Note', 'Estimate', 'Quotation'])
    .withMessage('Invalid invoice type'),
  
  body('invoiceDate')
    .notEmpty()
    .withMessage('Invoice date is required')
    .isISO8601()
    .withMessage('Invalid date format'),
  
  body('employeeName')
    .notEmpty()
    .withMessage('Employee name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Employee name must be between 2 and 100 characters'),
  
  body('customer')
    .notEmpty()
    .withMessage('Customer is required')
    .isMongoId()
    .withMessage('Invalid customer ID'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  
  body('items.*.product')
    .notEmpty()
    .withMessage('Product is required for each item')
    .isMongoId()
    .withMessage('Invalid product ID'),
  
  body('items.*.quantity')
    .isNumeric()
    .withMessage('Quantity must be a number')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be greater than 0'),
  
  body('items.*.unit')
    .notEmpty()
    .withMessage('Unit is required for each item')
    .isIn(['kg', 'g', 'ltr', 'ml', 'pcs', 'box', 'dozen', 'meter', 'cm', 'inch', 'ft', 'sqft', 'sqm', 'ton', 'quintal'])
    .withMessage('Invalid unit'),
  
  body('items.*.price')
    .isNumeric()
    .withMessage('Price must be a number')
    .isFloat({ min: 0 })
    .withMessage('Price must be greater than or equal to 0'),
  
  body('items.*.discount')
    .optional()
    .isNumeric()
    .withMessage('Discount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Discount must be greater than or equal to 0'),
  
  body('items.*.taxRate')
    .optional()
    .isNumeric()
    .withMessage('Tax rate must be a number')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate must be between 0 and 100'),
  
  body('taxMode')
    .optional()
    .isIn(['exclusive', 'inclusive'])
    .withMessage('Tax mode must be either exclusive or inclusive'),
  
  body('shippingCharges')
    .optional()
    .isNumeric()
    .withMessage('Shipping charges must be a number')
    .isFloat({ min: 0 })
    .withMessage('Shipping charges must be greater than or equal to 0'),
  
  body('packingCharges')
    .optional()
    .isNumeric()
    .withMessage('Packing charges must be a number')
    .isFloat({ min: 0 })
    .withMessage('Packing charges must be greater than or equal to 0'),
  
  body('otherCharges')
    .optional()
    .isNumeric()
    .withMessage('Other charges must be a number')
    .isFloat({ min: 0 })
    .withMessage('Other charges must be greater than or equal to 0'),
  
  validation.handleValidationErrors
];

const updateBillValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid bill ID'),
  
  body('invoiceType')
    .optional()
    .isIn(['Tax Invoice', 'Proforma Invoice', 'Commercial Invoice', 'Debit Note', 'Credit Note', 'Estimate', 'Quotation'])
    .withMessage('Invalid invoice type'),
  
  body('invoiceDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  
  body('employeeName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Employee name must be between 2 and 100 characters'),
  
  body('customer')
    .optional()
    .isMongoId()
    .withMessage('Invalid customer ID'),
  
  body('items')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one item is required if items are provided'),
  
  validation.handleValidationErrors
];

const billIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid bill ID'),
  validation.handleValidationErrors
];

const statusUpdateValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid bill ID'),
  
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'cancelled'])
    .withMessage('Invalid status'),
  
  validation.handleValidationErrors
];

const getBillsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('status')
    .optional()
    .isIn(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'cancelled'])
    .withMessage('Invalid status'),
  
  query('paymentStatus')
    .optional()
    .isIn(['pending', 'partial', 'paid', 'overdue', 'cancelled'])
    .withMessage('Invalid payment status'),
  
  query('customer')
    .optional()
    .isMongoId()
    .withMessage('Invalid customer ID'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  
  validation.handleValidationErrors
];

// Routes

// Create a new bill
router.post('/', createBillValidation, billController.createBill);

// Get all bills for the company
router.get('/', getBillsValidation, billController.getBills);

// Get bill statistics
router.get('/stats', billController.getBillStats);

// Search bills (this should be before /:id to avoid conflicts)
router.get('/search', getBillsValidation, billController.getBills);

// Get bill templates
router.get('/templates', (req, res) => {
  const templates = [
    {
      id: 'default',
      name: 'Default Template',
      description: 'Standard bill format with company details and items',
      preview: '/images/templates/default-preview.png'
    },
    {
      id: 'modern',
      name: 'Modern Template',
      description: 'Clean and modern bill design with enhanced typography',
      preview: '/images/templates/modern-preview.png'
    },
    {
      id: 'classic',
      name: 'Classic Template',
      description: 'Traditional business bill format',
      preview: '/images/templates/classic-preview.png'
    }
  ];
  
  res.json({
    success: true,
    data: templates
  });
});

// Get a single bill
router.get('/:id', billIdValidation, billController.getBill);

// Update a bill
router.put('/:id', updateBillValidation, billController.updateBill);

// Delete a bill (soft delete)
router.delete('/:id', billIdValidation, billController.deleteBill);

// Generate PDF for a bill
router.get('/:id/pdf', billIdValidation, billController.generateBillPDF);

// Update bill status
router.patch('/:id/status', statusUpdateValidation, billController.updateBillStatus);

// Duplicate a bill
router.post('/:id/duplicate', billIdValidation, billController.duplicateBill);

// Send bill via email (placeholder for future implementation)
router.post('/:id/email', billIdValidation, (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Email functionality not yet implemented'
  });
});

// Get overdue bills
router.get('/overdue/list', (req, res) => {
  // This will be implemented using the existing getBills with additional filters
  req.query.paymentStatus = 'overdue';
  billController.getBills(req, res);
});

// Mark bill as paid
router.patch('/:id/payment', [
  param('id').isMongoId().withMessage('Invalid bill ID'),
  body('paidAmount').isNumeric().withMessage('Paid amount must be a number'),
  body('paymentMethod').optional().isIn(['cash', 'card', 'bank_transfer', 'upi', 'cheque', 'credit']).withMessage('Invalid payment method'),
  validation.handleValidationErrors
], async (req, res) => {
  try {
    const { id } = req.params;
    const { paidAmount, paymentMethod } = req.body;
    const companyId = req.user.company;
    const userId = req.user.id;

    const Bill = require('../models/Bill');
    const bill = await Bill.findOne({ _id: id, company: companyId, isDeleted: false });
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    bill.paidAmount = parseFloat(paidAmount);
    if (paymentMethod) {
      bill.paymentMethod = paymentMethod;
    }
    bill.updatedBy = userId;
    
    await bill.save(); // This will trigger the pre-save middleware to update payment status

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: bill
    });

  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment',
      error: error.message
    });
  }
});

// Get bills by customer
router.get('/customer/:customerId', [
  param('customerId').isMongoId().withMessage('Invalid customer ID'),
  validation.handleValidationErrors
], (req, res) => {
  req.query.customer = req.params.customerId;
  billController.getBills(req, res);
});

// Bulk operations
router.post('/bulk/delete', [
  body('billIds').isArray({ min: 1 }).withMessage('Bill IDs array is required'),
  body('billIds.*').isMongoId().withMessage('Invalid bill ID'),
  validation.handleValidationErrors
], async (req, res) => {
  try {
    const { billIds } = req.body;
    const companyId = req.user.company;
    const userId = req.user.id;

    const Bill = require('../models/Bill');
    const result = await Bill.updateMany(
      { 
        _id: { $in: billIds }, 
        company: companyId, 
        isDeleted: false 
      },
      { 
        isDeleted: true, 
        deletedAt: new Date(), 
        deletedBy: userId 
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} bills deleted successfully`,
      data: { deletedCount: result.modifiedCount }
    });

  } catch (error) {
    console.error('Error bulk deleting bills:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bills',
      error: error.message
    });
  }
});

router.patch('/bulk/status', [
  body('billIds').isArray({ min: 1 }).withMessage('Bill IDs array is required'),
  body('billIds.*').isMongoId().withMessage('Invalid bill ID'),
  body('status').notEmpty().isIn(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'cancelled']).withMessage('Invalid status'),
  validation.handleValidationErrors
], async (req, res) => {
  try {
    const { billIds, status } = req.body;
    const companyId = req.user.company;
    const userId = req.user.id;

    const Bill = require('../models/Bill');
    const result = await Bill.updateMany(
      { 
        _id: { $in: billIds }, 
        company: companyId, 
        isDeleted: false 
      },
      { 
        status: status, 
        updatedBy: userId 
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} bills updated successfully`,
      data: { updatedCount: result.modifiedCount }
    });

  } catch (error) {
    console.error('Error bulk updating bill status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bill status',
      error: error.message
    });
  }
});

module.exports = router;