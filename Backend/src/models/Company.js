const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    // Basic Company Information (matching frontend fields)
    businessName: {
        type: String,
        required: [true, 'Business name is required'],
        trim: true,
        maxlength: [100, 'Business name cannot exceed 100 characters']
    },

    // Contact Information
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
    },

    additionalPhones: [{
        type: String,
        match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
    }],

    email: {
        type: String,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },

    // Business Details
    businessType: {
        type: String,
        enum: ['Retail', 'Wholesale', 'Distributor', 'Service', 'Manufacturing', 'Others'],
    },

    businessCategory: {
        type: String,
        enum: [
            'Accounting & CA', 'Interior Designer', 'Automobiles / Auto Parts', 'Salon / Spa',
            'Liquor Store', 'Book / Stationary Store', 'Construction Materials & Equipment',
            'Repairing Plumbing & Electrician', 'Chemical & Fertilizer', 'Computer Equipment & Software',
            'Electrical & Electronics Equipment', 'Fashion Accessory / Cosmetics', 'Tailoring / Boutique',
            'Fruit and Vegetable', 'Kirana / General Merchant', 'FMCG Products',
            'Dairy Farm Products / Poultry', 'Furniture', 'Garment / Fashion & Hosiery',
            'Jewellery & Gems', 'Pharmacy / Medical', 'Hardware Store', 'Mobile & Accessories',
            'Nursery / Plants', 'Petroleum Bulk Stations & Terminals / Petrol', 'Restaurant / Hotel',
            'Footwear', 'Paper & Paper Products', 'Sweet Shop / Bakery', 'Gift & Toys',
            'Laundry / Washing / Dry Clean', 'Coaching & Training', 'Renting & Leasing',
            'Fitness Center', 'Oil & Gas', 'Real Estate', 'NGO & Charitable Trust',
            'Tours & Travels', 'Other'
        ]
    },

    // Legal Information
    gstin: {
        type: String,
        sparse: true,
        match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Please enter a valid GSTIN']
    },

    // Address Information (matching frontend fields)
    state: {
        type: String,
        trim: true
    },

    pincode: {
        type: String,
        match: [/^[0-9]{6}$/, 'Please enter a valid 6-digit pincode']
    },

    city: {
        type: String,
        trim: true
    },

    tehsil: {
        type: String,
        trim: true
    },

    address: {
        type: String,
        trim: true
    },

    // Images
    logo: {
        url: String,
        publicId: String,
        base64: String  // For base64 images from frontend
    },

    signatureImage: {
        url: String,
        publicId: String,
        base64: String  // For base64 images from frontend
    },

    // Status
    isActive: {
        type: Boolean,
        default: true
    },

    // Settings (with defaults)
    settings: {
        invoicePrefix: {
            type: String,
            default: 'INV',
            maxlength: [5, 'Invoice prefix cannot exceed 5 characters']
        },
        purchasePrefix: {
            type: String,
            default: 'PUR',
            maxlength: [5, 'Purchase prefix cannot exceed 5 characters']
        },
        enableGST: {
            type: Boolean,
            default: true
        },
        autoGenerateInvoice: {
            type: Boolean,
            default: true
        }
    },

    // Subscription Details
    subscription: {
        plan: {
            type: String,
            enum: ['Free', 'Basic', 'Premium', 'Enterprise'],
            default: 'Free'
        },
        startDate: {
            type: Date,
            default: Date.now
        },
        endDate: {
            type: Date,
            default: () => {
                const now = new Date();
                return new Date(now.setDate(now.getDate() + 30)); // 30 days free trial
            }
        },
        maxUsers: {
            type: Number,
            default: 1
        },
        maxTransactions: {
            type: Number,
            default: 100
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for full address
companySchema.virtual('fullAddress').get(function () {
    const addressParts = [this.address, this.city, this.state, this.pincode].filter(Boolean);
    return addressParts.join(', ');
});

// Virtual for subscription status
companySchema.virtual('subscriptionStatus').get(function () {
    const now = new Date();
    return this.subscription.endDate > now ? 'Active' : 'Expired';
});

// Pre-save middleware
companySchema.pre('save', function (next) {
    // Convert business name to title case
    if (this.businessName) {
        this.businessName = this.businessName.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }

    // Convert GSTIN to uppercase
    if (this.gstin) {
        this.gstin = this.gstin.toUpperCase();
    }

    // Clean phone numbers
    if (this.phoneNumber) {
        this.phoneNumber = this.phoneNumber.replace(/\D/g, '');
    }

    if (this.additionalPhones) {
        this.additionalPhones = this.additionalPhones.map(phone => phone.replace(/\D/g, '')).filter(phone => phone.length === 10);
    }

    next();
});

// Create indexes for better performance
companySchema.index({ businessName: 1 });
companySchema.index({ phoneNumber: 1 });
companySchema.index({ email: 1 });
companySchema.index({ gstin: 1 });
companySchema.index({ state: 1, city: 1 });
companySchema.index({ isActive: 1 });

module.exports = mongoose.model('Company', companySchema);