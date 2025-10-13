const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  // Company reference
  companyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company', 
    required: true, 
    index: true 
  },
  
  // Invoice identification
  invoicePrefix: { 
    type: String, 
    default: 'INV',
    trim: true,
    uppercase: true
  },
  invoiceNumber: { 
    type: String, 
    required: true, 
    trim: true,
    index: true
  },
  fullInvoiceNumber: { // Combined: INV-0001
    type: String,
    required: true,
    index: true
  },
  invoiceSuffix: {
    type: String,
    trim: true
  },
  invoiceDate: { 
    type: Date, 
    required: true, 
    default: Date.now,
    index: true
  },
  dueDate: { 
    type: Date 
  },
  
  // Customer/Vendor Information (snapshot at time of invoice)
  party: {
    partyId: { 
      type: mongoose.Schema.Types.ObjectId, 
      refPath: 'party.partyType',
      required: true,
      index: true
    },
    partyType: {
      type: String,
      required: true,
      enum: ['Customer', 'Vendor']
    },
    name: { type: String, required: true },
    phone: String,
    email: String,
    company: String,
    gstType: {
      type: String,
      enum: ['unregistered', 'regular', 'composition']
    },
    gstin: String,
    billingAddress: {
      country: String,
      shopAddress: String,
      pincode: String,
      villageColony: String,
      tahsilTaluka: String,
      district: String,
      state: String
    },
    shippingAddress: {
      sameAsBilling: { type: Boolean, default: true },
      address: String,
      pincode: String,
      villageColony: String,
      tahsilTaluka: String,
      district: String,
      state: String
    }
  },
  
  // End Customer (optional)
  endCustomer: {
    endCustomerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'EndCustomer' 
    },
    customerName: String,
    phone: String,
    email: String,
    address: String
  },
  
  // Invoice Items
  items: [{
    itemId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Item'
    },
    goods: { 
      type: String, 
      required: true,
      trim: true
    },
    challanNo: String,
    description: String,
    batchNo: String,
    expiryDate: Date,
    mrp: { type: Number, min: 0 },
    
    // Quantities
    quantity: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    freeQuantity: { 
      type: Number, 
      default: 0,
      min: 0 
    },
    unit: {
      type: String,
      default: 'PCS'
    },
    
    // Pricing
    rate: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    
    // Discount
    discount: {
      type: { 
        type: String, 
        enum: ['percentage', 'fixed'],
        default: 'percentage'
      },
      value: { 
        type: Number, 
        default: 0,
        min: 0 
      },
      amount: { 
        type: Number, 
        default: 0 
      }
    },
    
    // Amounts before tax
    grossAmount: { // quantity × rate
      type: Number, 
      required: true 
    },
    taxableAmount: { // grossAmount - discount
      type: Number, 
      required: true 
    },
    
    // GST Details
    gstType: { 
      type: String, 
      enum: ['include', 'exclude'], 
      default: 'include' 
    },
    gstRate: { 
      type: Number, 
      required: true,
      min: 0,
      max: 100
    },
    cgst: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    
    // CESS
    cessRate: { 
      type: Number, 
      default: 0,
      min: 0 
    },
    cessAmount: { type: Number, default: 0 },
    
    // Final amount for this item
    amount: { 
      type: Number, 
      required: true 
    }
  }],
  
  // Invoice Totals
  totals: {
    // Before discount
    subtotal: { 
      type: Number, 
      required: true,
      default: 0
    },
    
    // Discount
    totalDiscount: { 
      type: Number, 
      default: 0 
    },
    
    // After discount
    totalTaxableAmount: { 
      type: Number, 
      required: true,
      default: 0
    },
    
    // GST breakup
    totalCGST: { type: Number, default: 0 },
    totalSGST: { type: Number, default: 0 },
    totalIGST: { type: Number, default: 0 },
    totalCESS: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    
    // Additional charges
    serviceCharge: { 
      type: Number, 
      default: 0 
    },
    serviceChargeTax: { 
      type: Number, 
      default: 0 
    },
    otherCharges: { 
      type: Number, 
      default: 0 
    },
    
    // Rounding
    roundOff: { 
      type: Number, 
      default: 0 
    },
    
    // Final amount
    grandTotal: { 
      type: Number, 
      required: true 
    }
  },
  
  // Payment Information
  payment: {
    isPaymentReceived: { 
      type: Boolean, 
      default: false 
    },
    mode: { 
      type: String, 
      enum: ['Cash', 'Bank', 'UPI', 'Cheque', 'Credit Card', 'Debit Card', 'NEFT', 'RTGS', 'Other'], 
      default: 'Cash' 
    },
    refNo: String,
    depositTo: String,
    amount: { 
      type: Number, 
      default: 0,
      min: 0
    },
    payFull: { 
      type: Boolean, 
      default: false 
    },
    paidDate: Date,
    pendingAmount: {
      type: Number,
      default: 0
    }
  },
  
  // Invoice Status
  status: {
    type: String,
    enum: ['draft', 'pending', 'paid', 'partially_paid', 'overdue', 'cancelled', 'void'],
    default: 'pending',
    index: true
  },
  
  // Additional Settings
  autoRoundOff: { 
    type: Boolean, 
    default: true 
  },
  
  // Notes and Terms
  notes: { 
    type: String,
    trim: true
  },
  termsAndConditions: { 
    type: String,
    trim: true
  },
  
  // Metadata
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for performance and uniqueness
invoiceSchema.index({ companyId: 1, fullInvoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ companyId: 1, invoiceDate: -1 });
invoiceSchema.index({ companyId: 1, 'party.partyId': 1, invoiceDate: -1 });
invoiceSchema.index({ companyId: 1, status: 1, invoiceDate: -1 });
invoiceSchema.index({ companyId: 1, isDeleted: 1, invoiceDate: -1 });

// Virtual for balance due
invoiceSchema.virtual('balanceDue').get(function() {
  return this.totals.grandTotal - (this.payment?.amount || 0);
});

// Pre-save middleware to set full invoice number
invoiceSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('invoicePrefix') || this.isModified('invoiceNumber')) {
    this.fullInvoiceNumber = `${this.invoicePrefix}-${this.invoiceNumber}`;
    if (this.invoiceSuffix) {
      this.fullInvoiceNumber += `-${this.invoiceSuffix}`;
    }
  }
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);

// ============================================
// routes/invoiceRoutes.js - COMPLETE ROUTES
// ============================================

const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate } = require('../middleware/auth');
const { validateInvoice, validateInvoiceUpdate } = require('../middleware/validators');

// All routes require authentication
router.use(authenticate);

// Create new invoice
router.post('/', validateInvoice, invoiceController.createInvoice);

// Get all invoices with filters
router.get('/', invoiceController.getAllInvoices);

// Get invoice statistics
router.get('/stats', invoiceController.getInvoiceStats);

// Get next invoice number
router.get('/next-number', invoiceController.getNextInvoiceNumber);

// Search invoices
router.get('/search', invoiceController.searchInvoices);

// Get single invoice by ID
router.get('/:id', invoiceController.getInvoiceById);

// Update invoice
router.put('/:id', validateInvoiceUpdate, invoiceController.updateInvoice);

// Update invoice status
router.patch('/:id/status', invoiceController.updateInvoiceStatus);

// Record payment
router.post('/:id/payment', invoiceController.recordPayment);

// Delete invoice (soft delete)
router.delete('/:id', invoiceController.deleteInvoice);

// Restore deleted invoice
router.patch('/:id/restore', invoiceController.restoreInvoice);

// Download invoice PDF
router.get('/:id/pdf', invoiceController.downloadInvoicePDF);

// Send invoice via email
router.post('/:id/email', invoiceController.emailInvoice);

// Duplicate invoice
router.post('/:id/duplicate', invoiceController.duplicateInvoice);

module.exports = router;