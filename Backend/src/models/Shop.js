const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  // Owner Information
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ownerName: {
    type: String,
    required: true,
    trim: true
  },
  ownerPhone: {
    type: String,
    required: true,
    trim: true
  },
  ownerEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  
  // Basic Shop Information
  shopName: {
    type: String,
    required: true,
    trim: true
  },
  shopPhone: {
    type: String,
    required: true,
    trim: true
  },
  alternatePhone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  
  // Business Details
  businessCategory: {
    type: String,
    required: true,
    enum: ['Computer and IT', 'Electronics', 'Electrical', 'Automobiles', 'Textiles', 'Food & Beverage', 'Healthcare', 'Real Estate', 'Other'],
    trim: true
  },
  businessType: {
    type: String,
    enum: ['retail', 'wholesale', 'manufacturing', 'service', 'distributor', 'other'],
    default: 'retail',
    trim: true
  },
  businessModel: {
    type: String,
    enum: ['b2b', 'b2c', 'both'],
    default: 'both',
    trim: true
  },
  establishedYear: {
    type: Number,
    min: 1900,
    max: new Date().getFullYear()
  },
  employeeCount: {
    type: Number,
    min: 0,
    default: 1
  },
  
  // Registration & Legal
  gstNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  panNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  licenseNumber: {
    type: String,
    trim: true
  },
  trademarkNumber: {
    type: String,
    trim: true
  },
  
  // Address Information
  address: {
    street: {
      type: String,
      required: true,
      trim: true
    },
    landmark: {
      type: String,
      trim: true
    },
    village: {
      type: String,
      trim: true
    },
    taluka: {
      type: String,
      trim: true
    },
    district: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      default: 'India',
      trim: true
    },
    pincode: {
      type: String,
      required: true,
      trim: true
    }
  },
  
  // Location Coordinates
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  
  // Shop Images and Media
  images: {
    shopFront: {
      type: String, // URL to shop front image
      default: null
    },
    interior: [{
      type: String // URLs to interior images
    }],
    logo: {
      type: String, // URL to shop logo
      default: null
    },
    products: [{
      type: String // URLs to product images
    }]
  },
  
  // Operating Information
  operatingHours: {
    monday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '18:00' }
    },
    tuesday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '18:00' }
    },
    wednesday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '18:00' }
    },
    thursday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '18:00' }
    },
    friday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '18:00' }
    },
    saturday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '18:00' }
    },
    sunday: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, default: '10:00' },
      closeTime: { type: String, default: '17:00' }
    }
  },
  
  // Services and Products
  services: [{
    name: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      min: 0
    }
  }],
  
  products: [{
    name: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      trim: true
    },
    brand: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      min: 0
    },
    inStock: {
      type: Boolean,
      default: true
    }
  }],
  
  // Payment Methods
  paymentMethods: {
    cash: {
      type: Boolean,
      default: true
    },
    card: {
      type: Boolean,
      default: false
    },
    upi: {
      type: Boolean,
      default: false
    },
    netBanking: {
      type: Boolean,
      default: false
    },
    creditFacility: {
      type: Boolean,
      default: false
    }
  },
  
  // Social Media and Online Presence
  socialMedia: {
    facebook: {
      type: String,
      trim: true
    },
    instagram: {
      type: String,
      trim: true
    },
    twitter: {
      type: String,
      trim: true
    },
    youtube: {
      type: String,
      trim: true
    },
    whatsapp: {
      type: String,
      trim: true
    },
    googleMaps: {
      type: String,
      trim: true
    }
  },
  
  // Ratings and Reviews
  rating: {
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    count: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  
  // Shop Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  
  // Delivery Information
  delivery: {
    homeDelivery: {
      type: Boolean,
      default: false
    },
    deliveryRadius: {
      type: Number, // in kilometers
      min: 0,
      default: 0
    },
    deliveryCharge: {
      type: Number,
      min: 0,
      default: 0
    },
    freeDeliveryAbove: {
      type: Number,
      min: 0
    }
  },
  
  // SEO and Marketing
  seo: {
    metaTitle: {
      type: String,
      trim: true
    },
    metaDescription: {
      type: String,
      trim: true
    },
    keywords: [{
      type: String,
      trim: true
    }]
  },
  
  // Additional Information
  description: {
    type: String,
    maxLength: 1000,
    trim: true
  },
  specialOffers: [{
    title: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    validUntil: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
shopSchema.index({ owner: 1 });
shopSchema.index({ businessCategory: 1 });
shopSchema.index({ 'address.state': 1 });
shopSchema.index({ 'address.district': 1 });
shopSchema.index({ 'address.taluka': 1 });
shopSchema.index({ 'address.village': 1 });
shopSchema.index({ 'address.pincode': 1 });
shopSchema.index({ shopName: 'text', description: 'text' });
shopSchema.index({ location: '2dsphere' });
shopSchema.index({ isActive: 1, isVerified: 1 });

// Pre-save middleware
shopSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for full address
shopSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  return [
    addr.street,
    addr.landmark,
    addr.village,
    addr.taluka,
    addr.district,
    addr.state,
    addr.pincode,
    addr.country
  ].filter(Boolean).join(', ');
});

module.exports = mongoose.model('Shop', shopSchema);