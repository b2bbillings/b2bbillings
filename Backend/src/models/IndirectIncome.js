const mongoose = require('mongoose');

const indirectIncomeSchema = new mongoose.Schema({
  billName: {
    type: String,
    required: [true, 'Bill name is required'],
    trim: true,
    maxLength: [100, 'Bill name cannot exceed 100 characters'],
    minLength: [1, 'Bill name must be at least 1 character']
  },
  amount: {
    type: Number,
    required: [true, 'Income amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    trim: true
  },
  customPaymentMethod: {
    type: String,
    trim: true,
    default: null
  },
  incomeDate: {
    type: Date,
    required: [true, 'Income date is required'],
    default: Date.now
  },
  notes: {
    type: String,
    trim: true,
    maxLength: [500, 'Notes cannot exceed 500 characters']
  },
  billFile: {
    originalName: {
      type: String,
      default: null
    },
    fileName: {
      type: String,
      default: null
    },
    filePath: {
      type: String,
      default: null
    },
    fileSize: {
      type: Number,
      default: null
    },
    mimeType: {
      type: String,
      default: null
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company ID is required']
  },
  status: {
    type: String,
    enum: ['active', 'deleted'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Index for efficient queries
indirectIncomeSchema.index({ userId: 1, companyId: 1, incomeDate: -1 });
indirectIncomeSchema.index({ category: 1 });
indirectIncomeSchema.index({ status: 1 });
indirectIncomeSchema.index({ billName: 'text' });

// Virtual for formatted amount
indirectIncomeSchema.virtual('formattedAmount').get(function() {
  return `₹${this.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
});

// Method to get effective payment method
indirectIncomeSchema.methods.getEffectivePaymentMethod = function() {
  return this.paymentMethod === 'Other Payment Way' && this.customPaymentMethod 
    ? this.customPaymentMethod 
    : this.paymentMethod;
};

// Static method to get income by date range
indirectIncomeSchema.statics.getByDateRange = function(userId, companyId, startDate, endDate) {
  return this.find({
    userId,
    companyId,
    status: 'active',
    incomeDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  }).sort({ incomeDate: -1 });
};

// Static method to get total income
indirectIncomeSchema.statics.getTotalByUser = function(userId, companyId) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        companyId: new mongoose.Types.ObjectId(companyId),
        status: 'active'
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('IndirectIncome', indirectIncomeSchema);