const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
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
  copyToCustomerName: {
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

  // Opening Balance
  openingBalance: {
    type: {
      type: String,
      enum: ['credit', 'debit'],
      default: 'credit'
    },
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    minBalance: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Current Balance (calculated field)
  currentBalance: {
    type: Number,
    default: 0
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
customerSchema.index({ phone: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ company: 1 });
customerSchema.index({ name: 1 });
customerSchema.index({ gstin: 1 });
customerSchema.index({ isActive: 1 });

// Virtual for display name
customerSchema.virtual('displayName').get(function() {
  return this.company && this.copyToCustomerName ? this.company : this.name;
});

// Virtual for calculated current balance
customerSchema.virtual('calculatedBalance').get(function() {
  const baseAmount = this.openingBalance.amount || 0;
  return this.openingBalance.type === 'credit' ? baseAmount : -baseAmount;
});

// Pre-save middleware
customerSchema.pre('save', function(next) {
  // Auto-copy company name to customer name if copyToCustomerName is true
  if (this.copyToCustomerName && this.company) {
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
customerSchema.statics.findByPhone = function(phone) {
  return this.findOne({ phone, isActive: true });
};

customerSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

customerSchema.statics.searchCustomers = function(query) {
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

// Instance methods
customerSchema.methods.updateBalance = function(amount, type = 'credit') {
  if (type === 'credit') {
    this.currentBalance += amount;
  } else {
    this.currentBalance -= amount;
  }
  return this.save();
};

customerSchema.methods.checkMinBalance = function() {
  return this.currentBalance <= this.openingBalance.minBalance;
};

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;