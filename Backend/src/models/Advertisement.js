const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  description: {
    type: String,
    trim: true,
    maxLength: 500
  },
  
  // Media Information
  mediaType: {
    type: String,
    required: true,
    enum: ['image', 'video', 'text'],
    index: true
  },
  mediaUrl: {
    type: String,
    required: function() {
      return this.mediaType !== 'text';
    }
  },
  mediaSize: {
    type: Number, // in bytes
    default: 0
  },
  mediaFormat: {
    type: String // e.g., 'jpeg', 'mp4', 'png'
  },
  
  // Placement Information
  section: {
    type: String,
    required: true,
    enum: ['banner', 'sidebar', 'whatsapp'],
    index: true
  },
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10,
    index: true
  },
  
  // Target Audience Category
  targetCategory: {
    type: String,
    required: true,
    enum: [
      'all_businesses', 
      'retailers', 
      'wholesalers', 
      'manufacturers', 
      'distributors', 
      'importers', 
      'exporters',
      'service_providers',
      'consultants',
      'freelancers',
      'startups',
      'established_companies',
      'specific_industry'
    ],
    default: 'all_businesses',
    index: true
  },
  
  // Specific Industry (when targetCategory is 'specific_industry')
  specificIndustry: {
    type: String,
    trim: true,
    maxLength: 100
  },
  
  // Call to Action
  ctaText: {
    type: String,
    trim: true,
    maxLength: 50
  },
  ctaUrl: {
    type: String,
    trim: true
  },
  
  // User and Company Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  },
  
  // Status and Timing
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Admin Review Fields
  isApproved: {
    type: Boolean,
    default: false,
    index: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  
  // Rejection Fields
  isRejected: {
    type: Boolean,
    default: false,
    index: true
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },

  // Change Requests
  hasChangeRequests: {
    type: Boolean,
    default: false,
    index: true
  },
  changeRequests: [{
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    suggestions: [{
      field: String, // e.g., 'title', 'description', 'mediaUrl'
      currentValue: String,
      suggestedValue: String,
      reason: String
    }],
    comments: String,
    status: {
      type: String,
      enum: ['pending', 'addressed', 'ignored'],
      default: 'pending'
    },
    addressedAt: Date
  }],

  // Review History
  reviewHistory: [{
    action: {
      type: String,
      enum: ['approved', 'rejected', 'changes_requested', 'resubmitted', 'bulk_approved', 'bulk_rejected'],
      required: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reviewedAt: {
      type: Date,
      default: Date.now
    },
    comments: String,
    rejectionReason: String,
    suggestions: [{
      field: String,
      currentValue: String,
      suggestedValue: String,
      reason: String
    }]
  }],

  // Scheduling
  startDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  endDate: {
    type: Date,
    index: true
  },
  
  // Analytics
  impressions: {
    type: Number,
    default: 0,
    index: true
  },
  clicks: {
    type: Number,
    default: 0,
    index: true
  },
  lastImpression: {
    type: Date
  },
  lastClick: {
    type: Date
  },
  
  // Budget and Billing
  budget: {
    type: Number,
    default: 0,
    min: 0
  },
  costPerImpression: {
    type: Number,
    default: 0,
    min: 0
  },
  costPerClick: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Targeting
  targetAudience: {
    type: {
      ageRange: {
        min: { type: Number, min: 18, max: 100 },
        max: { type: Number, min: 18, max: 100 }
      },
      industries: [String],
      companySize: {
        type: String,
        enum: ['small', 'medium', 'large', 'enterprise']
      },
      location: {
        countries: [String],
        states: [String],
        cities: [String]
      }
    }
  },
  
  // Additional Settings
  autoPlay: {
    type: Boolean,
    default: true
  },
  muted: {
    type: Boolean,
    default: true
  },
  showControls: {
    type: Boolean,
    default: true
  },
  
  // Moderation
  reportedCount: {
    type: Number,
    default: 0
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedReason: {
    type: String
  },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  blockedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
advertisementSchema.index({ section: 1, isActive: 1, isApproved: 1, priority: -1 });
advertisementSchema.index({ userId: 1, isActive: 1 });
advertisementSchema.index({ startDate: 1, endDate: 1 });
advertisementSchema.index({ impressions: -1 });
advertisementSchema.index({ clicks: -1 });
// Add indexes for admin queries
advertisementSchema.index({ isApproved: 1, isRejected: 1, createdAt: -1 });
advertisementSchema.index({ hasChangeRequests: 1, isApproved: 1 });

// Virtual for CTR (Click Through Rate)
advertisementSchema.virtual('ctr').get(function() {
  return this.impressions > 0 ? (this.clicks / this.impressions) * 100 : 0;
});

// Virtual for checking if ad is currently active
advertisementSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  const hasStarted = !this.startDate || this.startDate <= now;
  const hasNotEnded = !this.endDate || this.endDate >= now;
  return this.isActive && this.isApproved && hasStarted && hasNotEnded && !this.isBlocked;
});

// Virtual for remaining budget
advertisementSchema.virtual('remainingBudget').get(function() {
  return Math.max(0, this.budget - this.totalSpent);
});

// Virtual for current review status
advertisementSchema.virtual('reviewStatus').get(function() {
  if (this.isApproved) return 'approved';
  if (this.isRejected) return 'rejected';
  if (this.hasChangeRequests) return 'changes_requested';
  return 'pending';
});

// Methods
advertisementSchema.methods.incrementImpression = async function() {
  this.impressions += 1;
  this.lastImpression = new Date();
  
  // Calculate cost if CPI is set
  if (this.costPerImpression > 0) {
    this.totalSpent += this.costPerImpression;
  }
  
  return this.save();
};

advertisementSchema.methods.incrementClick = async function() {
  this.clicks += 1;
  this.lastClick = new Date();
  
  // Calculate cost if CPC is set
  if (this.costPerClick > 0) {
    this.totalSpent += this.costPerClick;
  }
  
  return this.save();
};

advertisementSchema.methods.approve = async function(approvedBy) {
  this.isApproved = true;
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  return this.save();
};

advertisementSchema.methods.block = async function(reason, blockedBy) {
  this.isBlocked = true;
  this.blockedReason = reason;
  this.blockedBy = blockedBy;
  this.blockedAt = new Date();
  return this.save();
};

advertisementSchema.methods.report = async function() {
  this.reportedCount += 1;
  
  // Auto-block if too many reports
  if (this.reportedCount >= 10) {
    this.isBlocked = true;
    this.blockedReason = 'Automatically blocked due to multiple reports';
    this.blockedAt = new Date();
  }
  
  return this.save();
};

// Method to resubmit after addressing change requests
advertisementSchema.methods.resubmitForReview = async function(userId, addressedChanges) {
  // Mark change requests as addressed
  this.changeRequests.forEach(request => {
    if (request.status === 'pending') {
      request.status = 'addressed';
      request.addressedAt = new Date();
    }
  });

  this.hasChangeRequests = false;
  this.isRejected = false;
  this.rejectedBy = null;
  this.rejectedAt = null;
  this.rejectionReason = null;

  // Add to review history
  this.reviewHistory.push({
    action: 'resubmitted',
    reviewedBy: userId,
    reviewedAt: new Date(),
    comments: 'Advertisement resubmitted after addressing change requests',
    suggestions: addressedChanges
  });

  return this.save();
};

// Static methods
advertisementSchema.statics.getActiveAdsBySection = function(section, limit = 10) {
  const now = new Date();
  return this.find({
    section,
    isActive: true,
    isApproved: true,
    isBlocked: false,
    $and: [
      {
        $or: [
          { startDate: { $lte: now } },
          { startDate: null }
        ]
      },
      {
        $or: [
          { endDate: { $gte: now } },
          { endDate: null }
        ]
      }
    ]
  })
  .sort({ priority: -1, createdAt: -1 })
  .limit(limit)
  .populate('userId', 'name email')
  .populate('companyId', 'name businessName');
};

advertisementSchema.statics.getUserAds = function(userId, options = {}) {
  const query = { userId };
  
  if (options.section) query.section = options.section;
  if (options.isActive !== undefined) query.isActive = options.isActive;
  if (options.isApproved !== undefined) query.isApproved = options.isApproved;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .populate('companyId', 'name businessName');
};

advertisementSchema.statics.getTopPerforming = function(section, limit = 5) {
  return this.find({
    section,
    isActive: true,
    isApproved: true,
    impressions: { $gte: 100 } // Minimum impressions for meaningful CTR
  })
  .sort({ 
    ctr: -1, // Sort by CTR first
    impressions: -1 // Then by impressions
  })
  .limit(limit);
};

// Static method to get advertisements for admin review
advertisementSchema.statics.getAdvertisementsForReview = function(filters = {}) {
  const query = {
    isApproved: false,
    isRejected: { $ne: true },
    isBlocked: false,
    ...filters
  };

  return this.find(query)
    .populate('userId', 'name email')
    .populate('companyId', 'name businessName')
    .sort({ createdAt: -1 });
};

// Pre-save middleware
advertisementSchema.pre('save', function(next) {
  // Ensure end date is after start date
  if (this.endDate && this.startDate && this.endDate <= this.startDate) {
    const error = new Error('End date must be after start date');
    return next(error);
  }
  
  // Auto-deactivate if budget exceeded
  if (this.budget > 0 && this.totalSpent >= this.budget) {
    this.isActive = false;
  }
  
  next();
});

// Post-save middleware for logging
advertisementSchema.post('save', function(doc, next) {
  // Log important changes
  if (this.isModified('isApproved') && this.isApproved) {
    console.log(`Advertisement ${this._id} has been approved`);
  }
  
  if (this.isModified('isBlocked') && this.isBlocked) {
    console.log(`Advertisement ${this._id} has been blocked: ${this.blockedReason}`);
  }
  
  next();
});

module.exports = mongoose.model('Advertisement', advertisementSchema);