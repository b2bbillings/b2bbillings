const mongoose = require('mongoose');

const phoneNumberSchema = new mongoose.Schema({
    number: {
        type: String,
        required: true
    },
    label: {
        type: String,
        default: ''
    }
}, { _id: false });

const partySchema = new mongoose.Schema({
    partyType: {
        type: String,
        enum: ['customer', 'vendor', 'supplier', 'both'], // Added vendor and supplier
        required: true,
        default: 'customer'
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        sparse: true,
        validate: {
            validator: function(v) {
                return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
            },
            message: 'Please provide a valid email'
        }
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true
    },
    phoneNumbers: [phoneNumberSchema],
    companyName: {
        type: String,
        trim: true,
        maxlength: 100
    },
    gstNumber: {
        type: String,
        trim: true,
        uppercase: true,
        validate: {
            validator: function(v) {
                return !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
            },
            message: 'Please provide a valid GST number'
        }
    },
    country: {
        type: String,
        default: 'INDIA',
        uppercase: true
    },
    homeAddress: {
        addressLine: String,
        pincode: String,
        state: String,
        district: String,
        taluka: String
    },
    deliveryAddress: {
        addressLine: String,
        pincode: String,
        state: String,
        district: String,
        taluka: String
    },
    sameAsHomeAddress: {
        type: Boolean,
        default: false
    },
    openingBalance: {
        type: Number,
        default: 0
    },
    openingBalanceType: {
        type: String,
        enum: ['debit', 'credit'],
        default: 'debit'
    },
    currentBalance: {
        type: Number,
        default: 0
    },
    
    // Association Fields (NEW)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true
    },
    
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: [true, 'Company ID is required'],
        index: true
    },
    
    // Audit Fields (NEW)
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    deletedAt: {
        type: Date
    },
    
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ✅ IMPROVED: Better compound indexes for performance
partySchema.index({ name: 1 });
partySchema.index({ phoneNumber: 1 });
partySchema.index({ email: 1 });
partySchema.index({ partyType: 1 });
partySchema.index({ gstNumber: 1 });

// Company-scoped indexes for better performance
partySchema.index({ companyId: 1, phoneNumber: 1 }, { 
    unique: true, 
    partialFilterExpression: { isActive: true },
    name: 'unique_phone_per_company'
});
partySchema.index({ companyId: 1, name: 1 });
partySchema.index({ companyId: 1, partyType: 1 });
partySchema.index({ companyId: 1, isActive: 1, createdAt: -1 });
partySchema.index({ userId: 1, companyId: 1 });

// ✅ NEW: Additional performance indexes
partySchema.index({ companyId: 1, isActive: 1, partyType: 1 }); // For filtered queries
partySchema.index({ companyId: 1, currentBalance: 1 }); // For balance queries
partySchema.index({ createdBy: 1, companyId: 1 }); // For audit queries

// Text index for search functionality within company scope
partySchema.index({
    name: 'text',
    phoneNumber: 'text',
    email: 'text',
    companyName: 'text'
});

// Virtual for full address
partySchema.virtual('homeFullAddress').get(function() {
    if (!this.homeAddress || !this.homeAddress.addressLine) return '';
    return `${this.homeAddress.addressLine}, ${this.homeAddress.taluka}, ${this.homeAddress.district}, ${this.homeAddress.state} - ${this.homeAddress.pincode}`;
});

partySchema.virtual('deliveryFullAddress').get(function() {
    if (!this.deliveryAddress || !this.deliveryAddress.addressLine) return '';
    return `${this.deliveryAddress.addressLine}, ${this.deliveryAddress.taluka}, ${this.deliveryAddress.district}, ${this.deliveryAddress.state} - ${this.deliveryAddress.pincode}`;
});

// NEW: Virtual for formatted balance
partySchema.virtual('formattedBalance').get(function() {
    const balance = this.currentBalance || 0;
    const type = balance >= 0 ? 'To Receive' : 'To Pay';
    return {
        amount: Math.abs(balance),
        type: type,
        formatted: `₹${Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    };
});

// Middleware to handle same address logic
partySchema.pre('save', function(next) {
    if (this.sameAsHomeAddress) {
        this.deliveryAddress = { ...this.homeAddress };
    }
    
    // Set current balance from opening balance on creation
    if (this.isNew) {
        this.currentBalance = this.openingBalanceType === 'credit' 
            ? -this.openingBalance 
            : this.openingBalance;
    }
    
    next();
});

// NEW: Pre-save middleware for audit trail
partySchema.pre('save', function(next) {
    // Set createdBy if it's a new document and not already set
    if (this.isNew && !this.createdBy && this.userId) {
        this.createdBy = this.userId;
    }
    
    next();
});

// NEW: Static method to find parties by company
partySchema.statics.findByCompany = function(companyId, options = {}) {
    const query = { 
        companyId: companyId, 
        isActive: true,
        ...options.filter 
    };
    
    let mongoQuery = this.find(query);
    
    if (options.populate) {
        mongoQuery = mongoQuery.populate(options.populate);
    }
    
    if (options.sort) {
        mongoQuery = mongoQuery.sort(options.sort);
    }
    
    if (options.limit) {
        mongoQuery = mongoQuery.limit(options.limit);
    }
    
    if (options.skip) {
        mongoQuery = mongoQuery.skip(options.skip);
    }
    
    return mongoQuery;
};

// NEW: Static method to get party statistics for a company
partySchema.statics.getCompanyStats = function(companyId) {
    return this.aggregate([
        {
            $match: {
                companyId: new mongoose.Types.ObjectId(companyId),
                isActive: true
            }
        },
        {
            $group: {
                _id: '$partyType',
                count: { $sum: 1 },
                totalBalance: { $sum: '$currentBalance' },
                totalReceivable: {
                    $sum: {
                        $cond: [
                            { $gt: ['$currentBalance', 0] },
                            '$currentBalance',
                            0
                        ]
                    }
                },
                totalPayable: {
                    $sum: {
                        $cond: [
                            { $lt: ['$currentBalance', 0] },
                            { $abs: '$currentBalance' },
                            0
                        ]
                    }
                }
            }
        }
    ]);
};

// NEW: Instance method to check if user has access to this party
partySchema.methods.hasUserAccess = function(userId, companyId) {
    return this.companyId.toString() === companyId.toString() && 
           this.userId.toString() === userId.toString();
};

// NEW: Instance method to soft delete
partySchema.methods.softDelete = function(deletedBy) {
    this.isActive = false;
    this.deletedAt = new Date();
    this.deletedBy = deletedBy;
    return this.save();
};

module.exports = mongoose.model('Party', partySchema);