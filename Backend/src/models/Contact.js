const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  // Basic contact information
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumbers: [{
    number: {
      type: String,
      required: true,
      trim: true
    },
    label: {
      type: String,
      default: 'Primary',
      enum: ['Primary', 'Work', 'Home', 'Mobile', 'Other']
    }
  }],
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  address: {
    type: String,
    trim: true
  },
  
  // Business information
  company: {
    type: String,
    trim: true
  },
  shopName: {
    type: String,
    trim: true
  },
  shopOwner: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  
  // Contact type and classification
  partyType: {
    type: String,
    enum: ['customer', 'supplier', 'vendor', 'partner', 'other'],
    default: 'customer'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked', 'pending'],
    default: 'active'
  },
  
  // Additional information
  notes: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // Social media links
  socialMedia: {
    linkedin: {
      type: String,
      trim: true
    },
    twitter: {
      type: String,
      trim: true
    },
    instagram: {
      type: String,
      trim: true
    }
  },
  
  // User association - who added this contact
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  addedByName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Company association - which company this contact belongs to
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Contact interaction tracking
  lastContactedAt: {
    type: Date
  },
  contactFrequency: {
    type: Number,
    default: 0
  },
  totalMessages: {
    type: Number,
    default: 0
  },
  
  // Metadata
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

// Indexes for better query performance
contactSchema.index({ addedBy: 1, companyId: 1 });
contactSchema.index({ phone: 1, companyId: 1, isDeleted: 1 });
contactSchema.index({ email: 1, companyId: 1, isDeleted: 1 });
contactSchema.index({ name: 1, companyId: 1, isDeleted: 1 });
contactSchema.index({ partyType: 1, status: 1, isDeleted: 1 });
contactSchema.index({ createdAt: -1 });

// Virtual for full phone numbers array including primary phone
contactSchema.virtual('allPhoneNumbers').get(function() {
  const phones = this.phoneNumbers || [];
  if (this.phone && !phones.some(p => p.number === this.phone)) {
    return [{ number: this.phone, label: 'Primary' }, ...phones];
  }
  return phones;
});

// Pre-save middleware to ensure phone is in phoneNumbers array
contactSchema.pre('save', function(next) {
  if (this.phone) {
    // Ensure the main phone number is in the phoneNumbers array
    const phoneExists = this.phoneNumbers.some(p => p.number === this.phone);
    if (!phoneExists) {
      this.phoneNumbers.unshift({ number: this.phone, label: 'Primary' });
    }
  }
  next();
});

// Static methods
contactSchema.statics.findByUser = function(userId, companyId) {
  return this.find({ 
    addedBy: userId, 
    companyId: companyId,
    isDeleted: false 
  }).sort({ createdAt: -1 });
};

contactSchema.statics.findByCompany = function(companyId) {
  return this.find({ 
    companyId: companyId,
    isDeleted: false 
  }).populate('addedBy', 'username fullName email')
    .sort({ addedBy: 1, createdAt: -1 });
};

contactSchema.statics.searchContacts = function(companyId, searchQuery) {
  const regex = new RegExp(searchQuery, 'i');
  return this.find({
    companyId: companyId,
    isDeleted: false,
    $or: [
      { name: regex },
      { phone: regex },
      { email: regex },
      { company: regex },
      { shopName: regex },
      { shopOwner: regex }
    ]
  }).populate('addedBy', 'username fullName email')
    .sort({ createdAt: -1 });
};

// Instance methods
contactSchema.methods.incrementContactFrequency = function() {
  this.contactFrequency += 1;
  this.lastContactedAt = new Date();
  return this.save();
};

contactSchema.methods.softDelete = function(deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

contactSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  return this.save();
};

module.exports = mongoose.model('Contact', contactSchema);