const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  // Basic Details
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  alternatePhone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  webLink: {
    type: String,
    trim: true
  },

  // Company Details
  company: {
    type: String,
    trim: true
  },
  copyToVendorName: {
    type: Boolean,
    default: false
  },
  gstType: {
    type: String,
    enum: ['unregistered', 'regular', 'composition'],
    default: 'unregistered'
  },
  gstin: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (this.gstType === 'unregistered') return true;
        return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
      },
      message: 'Invalid GSTIN format'
    }
  },

  // Billing Address
  billingAddress: {
    country: {
      type: String,
      default: 'India'
    },
    shopAddress: {
      type: String,
      trim: true
    },
    pincode: {
      type: String,
      trim: true
    },
    villageColony: {
      type: String,
      trim: true
    },
    tahsilTaluka: {
      type: String,
      trim: true
    },
    district: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    }
  },

  // Shipping Address
  shippingAddress: {
    sameAsBilling: {
      type: Boolean,
      default: true
    },
    address: {
      type: String,
      trim: true
    },
    pincode: {
      type: String,
      trim: true
    },
    villageColony: {
      type: String,
      trim: true
    },
    tahsilTaluka: {
      type: String,
      trim: true
    },
    district: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    }
  },

  // Opening Balance (Vendors typically have debit balance - money we owe them)
  openingBalance: {
    type: {
      type: String,
      enum: ['credit', 'debit'],
      default: 'debit'
    },
    amount: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Minimum Balance Threshold
  minBalance: {
    type: Number,
    default: 0,
    min: 0
  },

  // Current Balance (calculated field)
  currentBalance: {
    type: Number,
    default: 0
  },

  // Vendor-specific fields
  paymentTerms: {
    type: String,
    enum: ['immediate', '15_days', '30_days', '45_days', '60_days', '90_days'],
    default: '30_days'
  },

  vendorType: {
    type: String,
    enum: ['supplier', 'service_provider', 'contractor', 'consultant'],
    default: 'supplier'
  },

  // Additional Info
  notes: {
    type: String,
    trim: true
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },

  // Audit Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
vendorSchema.index({ phone: 1 });
vendorSchema.index({ email: 1 });
vendorSchema.index({ company: 1 });
vendorSchema.index({ name: 1 });
vendorSchema.index({ gstin: 1 });
vendorSchema.index({ vendorType: 1 });
vendorSchema.index({ isActive: 1 });

// Virtual for display name
vendorSchema.virtual('displayName').get(function() {
  return this.company && this.copyToVendorName ? this.company : this.name;
});

// Virtual for calculated current balance
vendorSchema.virtual('calculatedBalance').get(function() {
  const baseAmount = this.openingBalance.amount || 0;
  return this.openingBalance.type === 'credit' ? baseAmount : -baseAmount;
});

// Pre-save middleware
vendorSchema.pre('save', function(next) {
  // Auto-copy company name to vendor name if copyToVendorName is true
  if (this.copyToVendorName && this.company) {
    this.name = this.company;
  }

  // Auto-copy billing to shipping if sameAsBilling is true
  if (this.shippingAddress.sameAsBilling) {
    this.shippingAddress.address = this.billingAddress.shopAddress;
    this.shippingAddress.pincode = this.billingAddress.pincode;
    this.shippingAddress.villageColony = this.billingAddress.villageColony;
    this.shippingAddress.tahsilTaluka = this.billingAddress.tahsilTaluka;
    this.shippingAddress.district = this.billingAddress.district;
    this.shippingAddress.state = this.billingAddress.state;
  }

  // Calculate current balance
  const baseAmount = this.openingBalance.amount || 0;
  this.currentBalance = this.openingBalance.type === 'credit' ? baseAmount : -baseAmount;

  next();
});

// Static methods
vendorSchema.statics.findByPhone = function(phone) {
  return this.findOne({ phone, isActive: true });
};

vendorSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

vendorSchema.statics.searchVendors = function(query) {
  const searchRegex = new RegExp(query, 'i');
  return this.find({
    isActive: true,
    $or: [
      { name: searchRegex },
      { phone: searchRegex },
      { email: searchRegex },
      { company: searchRegex }
    ]
  }).sort({ name: 1 }).limit(10);
};

vendorSchema.statics.findByType = function(vendorType) {
  return this.find({ vendorType, isActive: true }).sort({ name: 1 });
};

// Instance methods
vendorSchema.methods.updateBalance = function(amount, type = 'debit') {
  if (type === 'debit') {
    this.currentBalance += amount;
  } else {
    this.currentBalance -= amount;
  }
  return this.save();
};

vendorSchema.methods.getPaymentTermsDays = function() {
  const terms = {
    'immediate': 0,
    '15_days': 15,
    '30_days': 30,
    '45_days': 45,
    '60_days': 60,
    '90_days': 90
  };
  return terms[this.paymentTerms] || 30;
};

vendorSchema.methods.isBalanceBelowMinimum = function() {
  if (this.minBalance <= 0) return false;
  const currentBalance = Math.abs(this.currentBalance);
  return currentBalance <= this.minBalance;
};

vendorSchema.methods.getBalanceStatus = function() {
  const isBelow = this.isBalanceBelowMinimum();
  return {
    isBelow,
    currentBalance: this.currentBalance,
    minBalance: this.minBalance,
    warningMessage: isBelow ? `Balance (${this.currentBalance}) is at or below minimum threshold (${this.minBalance})` : null
  };
};

const Vendor = mongoose.model('Vendor', vendorSchema);

module.exports = Vendor;