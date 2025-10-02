const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'g', 'ltr', 'ml', 'pcs', 'box', 'dozen', 'meter', 'cm', 'inch', 'ft', 'sqft', 'sqm', 'ton', 'quintal']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountType: {
    type: String,
    enum: ['percentage', 'amount'],
    default: 'percentage'
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  hsnCode: {
    type: String,
    default: ''
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
});

const billSchema = new mongoose.Schema({
  // Bill identification
  billNumber: {
    type: String,
    required: true,
    unique: true
  },
  invoiceNumber: {
    type: String,
    required: true
  },
  
  // Bill type and dates
  invoiceType: {
    type: String,
    required: true,
    enum: ['Tax Invoice', 'Proforma Invoice', 'Commercial Invoice', 'Debit Note', 'Credit Note', 'Estimate', 'Quotation']
  },
  invoiceDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date
  },
  
  // Company and customer details
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Party',
    required: true
  },
  customerDetails: {
    name: String,
    email: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    gstin: String
  },
  
  // Employee details
  employeeName: {
    type: String,
    required: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Bill items
  items: [billItemSchema],
  
  // Tax configuration
  taxMode: {
    type: String,
    required: true,
    enum: ['exclusive', 'inclusive'],
    default: 'exclusive'
  },
  
  // Calculations
  subtotal: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  totalDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalTax: {
    type: Number,
    default: 0,
    min: 0
  },
  cgst: {
    type: Number,
    default: 0,
    min: 0
  },
  sgst: {
    type: Number,
    default: 0,
    min: 0
  },
  igst: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  
  // Additional charges
  shippingCharges: {
    type: Number,
    default: 0,
    min: 0
  },
  packingCharges: {
    type: Number,
    default: 0,
    min: 0
  },
  otherCharges: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Payment details
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer', 'upi', 'cheque', 'credit'],
    default: 'cash'
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  remainingAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Bill status
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'cancelled'],
    default: 'draft'
  },
  
  // Notes and terms
  notes: {
    type: String,
    default: ''
  },
  termsAndConditions: {
    type: String,
    default: ''
  },
  
  // File attachments
  attachments: [{
    fileName: String,
    filePath: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // PDF details
  pdfGenerated: {
    type: Boolean,
    default: false
  },
  pdfPath: {
    type: String
  },
  pdfGeneratedAt: {
    type: Date
  },
  
  // Template details
  template: {
    type: String,
    default: 'default'
  },
  templateSettings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Email tracking
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date
  },
  emailSentTo: [{
    email: String,
    sentAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Recurring bill details
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringDetails: {
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly']
    },
    nextDueDate: Date,
    endDate: Date,
    parentBillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill'
    }
  },
  
  // Currency
  currency: {
    type: String,
    default: 'INR'
  },
  exchangeRate: {
    type: Number,
    default: 1
  },
  
  // Business logic fields
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
billSchema.index({ company: 1, billNumber: 1 });
billSchema.index({ company: 1, invoiceDate: -1 });
billSchema.index({ company: 1, customer: 1 });
billSchema.index({ company: 1, status: 1 });
billSchema.index({ company: 1, paymentStatus: 1 });
billSchema.index({ billNumber: 1 });
billSchema.index({ invoiceNumber: 1 });
billSchema.index({ createdBy: 1 });
billSchema.index({ isDeleted: 1 });

// Virtual fields
billSchema.virtual('balanceAmount').get(function() {
  return this.totalAmount - this.paidAmount;
});

billSchema.virtual('isOverdue').get(function() {
  return this.dueDate && new Date() > this.dueDate && this.paymentStatus !== 'paid';
});

billSchema.virtual('daysOverdue').get(function() {
  if (!this.dueDate || this.paymentStatus === 'paid') return 0;
  const now = new Date();
  const diffTime = now - this.dueDate;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
});

// Pre-save middleware
billSchema.pre('save', async function(next) {
  try {
    // Generate bill number if not provided
    if (!this.billNumber) {
      const count = await this.constructor.countDocuments({ company: this.company });
      this.billNumber = `BILL-${String(count + 1).padStart(6, '0')}`;
    }
    
    // Calculate remaining amount
    this.remainingAmount = this.totalAmount - this.paidAmount;
    
    // Update payment status based on amounts
    if (this.paidAmount === 0) {
      this.paymentStatus = 'pending';
    } else if (this.paidAmount >= this.totalAmount) {
      this.paymentStatus = 'paid';
    } else {
      this.paymentStatus = 'partial';
    }
    
    // Check if overdue
    if (this.dueDate && new Date() > this.dueDate && this.paymentStatus !== 'paid') {
      this.paymentStatus = 'overdue';
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Instance methods
billSchema.methods.calculateTotals = function() {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  this.items.forEach(item => {
    const itemSubtotal = item.quantity * item.price;
    let itemDiscount = 0;
    
    if (item.discountType === 'percentage') {
      itemDiscount = (itemSubtotal * item.discount) / 100;
    } else {
      itemDiscount = item.discount;
    }
    
    const itemTaxableAmount = itemSubtotal - itemDiscount;
    const itemTax = (itemTaxableAmount * item.taxRate) / 100;
    
    item.subtotal = itemSubtotal;
    item.taxAmount = itemTax;
    item.total = itemTaxableAmount + itemTax;
    
    subtotal += itemSubtotal;
    totalDiscount += itemDiscount;
    totalTax += itemTax;
    
    // Calculate CGST, SGST, IGST (assuming equal distribution for CGST/SGST)
    cgst += itemTax / 2;
    sgst += itemTax / 2;
  });

  this.subtotal = subtotal;
  this.totalDiscount = totalDiscount;
  this.totalTax = totalTax;
  this.cgst = cgst;
  this.sgst = sgst;
  this.igst = igst;
  this.totalAmount = subtotal - totalDiscount + totalTax + this.shippingCharges + this.packingCharges + this.otherCharges;
  
  return this;
};

billSchema.methods.generatePDF = async function() {
  // This method will be implemented with PDF generation logic
  // For now, just mark as PDF generated
  this.pdfGenerated = true;
  this.pdfGeneratedAt = new Date();
  return await this.save();
};

billSchema.methods.sendEmail = async function(recipients, subject, message) {
  // This method will be implemented with email sending logic
  this.emailSent = true;
  this.emailSentAt = new Date();
  recipients.forEach(email => {
    this.emailSentTo.push({ email });
  });
  return await this.save();
};

// Static methods
billSchema.statics.findByCompany = function(companyId, options = {}) {
  const query = { company: companyId, isDeleted: false };
  return this.find(query, null, options)
    .populate('customer', 'name email phone')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
};

billSchema.statics.findOverdue = function(companyId) {
  const today = new Date();
  return this.find({
    company: companyId,
    dueDate: { $lt: today },
    paymentStatus: { $nin: ['paid', 'cancelled'] },
    isDeleted: false
  }).populate('customer', 'name email phone');
};

billSchema.statics.getStats = function(companyId, startDate, endDate) {
  const matchStage = {
    company: mongoose.Types.ObjectId(companyId),
    isDeleted: false
  };
  
  if (startDate && endDate) {
    matchStage.invoiceDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalBills: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        paidAmount: { $sum: '$paidAmount' },
        pendingAmount: { $sum: '$remainingAmount' },
        avgBillAmount: { $avg: '$totalAmount' }
      }
    }
  ]);
};

module.exports = mongoose.model('Bill', billSchema);