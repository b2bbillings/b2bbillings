const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
    // Company reference
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },

    // Basic Account Information
    accountName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    accountNumber: {
        type: String,
        required: function () {
            return this.printUpiQrCodes || this.printBankDetails;
        },
        trim: true,
        maxlength: 20
    },
    bankName: {
        type: String,
        trim: true,
        maxlength: 100
    },
    branchName: {
        type: String,
        trim: true,
        maxlength: 100
    },
    ifscCode: {
        type: String,
        trim: true,
        uppercase: true,
        match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Please enter a valid IFSC code']
    },
    accountType: {
        type: String,
        enum: ['savings', 'current', 'cash', 'fd', 'loan'],
        default: 'savings'
    },
    accountHolderName: {
        type: String,
        trim: true,
        maxlength: 100
    },

    // Account Type
    type: {
        type: String,
        enum: ['bank', 'cash'],
        default: 'bank',
        required: true
    },

    // Balance Information
    openingBalance: {
        type: Number,
        default: 0,
        min: 0
    },
    currentBalance: {
        type: Number,
        default: 0
    },
    asOfDate: {
        type: Date,
        default: Date.now
    },

    // Status
    isActive: {
        type: Boolean,
        default: true
    },

    // Print Settings
    printUpiQrCodes: {
        type: Boolean,
        default: false
    },
    printBankDetails: {
        type: Boolean,
        default: false
    },

    // UPI Information
    upiId: {
        type: String,
        trim: true,
        lowercase: true,
        validate: {
            validator: function (v) {
                if (!v) return true; // Allow empty
                return /^[\w.-]+@[\w.-]+$/.test(v);
            },
            message: 'Please enter a valid UPI ID'
        }
    },

    // Audit Fields
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Metadata
    lastTransactionDate: {
        type: Date
    },
    totalTransactions: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
bankAccountSchema.index({ companyId: 1, accountName: 1 });
bankAccountSchema.index({ companyId: 1, isActive: 1 });
bankAccountSchema.index({ companyId: 1, type: 1 });

// Virtual for formatted balance
bankAccountSchema.virtual('formattedBalance').get(function () {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(this.currentBalance);
});

// Virtual for account display
bankAccountSchema.virtual('accountDisplay').get(function () {
    if (this.type === 'cash') {
        return `${this.accountName} (Cash)`;
    }
    return `${this.accountName} - ${this.accountNumber || 'No Account Number'}`;
});

// Pre-save middleware
bankAccountSchema.pre('save', function (next) {
    // Set current balance to opening balance if it's a new document
    if (this.isNew && this.currentBalance === 0) {
        this.currentBalance = this.openingBalance;
    }

    // Validate required fields based on print settings
    if (this.printUpiQrCodes || this.printBankDetails) {
        if (!this.accountNumber) {
            return next(new Error('Account number is required when print settings are enabled'));
        }
    }

    next();
});

// Instance methods
bankAccountSchema.methods.updateBalance = function (amount, type = 'credit') {
    if (type === 'credit') {
        this.currentBalance += Math.abs(amount);
    } else if (type === 'debit') {
        this.currentBalance -= Math.abs(amount);
    }

    this.lastTransactionDate = new Date();
    this.totalTransactions += 1;

    return this.save();
};

bankAccountSchema.methods.canDebit = function (amount) {
    return this.currentBalance >= amount;
};

// Static methods
bankAccountSchema.statics.findByCompany = function (companyId, options = {}) {
    const query = { companyId, isActive: true };

    if (options.type) {
        query.type = options.type;
    }

    return this.find(query)
        .sort({ accountName: 1 })
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');
};

bankAccountSchema.statics.getTotalBalance = function (companyId, type = null) {
    const query = { companyId, isActive: true };
    if (type) query.type = type;

    return this.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalBalance: { $sum: '$currentBalance' },
                count: { $sum: 1 }
            }
        }
    ]);
};

module.exports = mongoose.model('BankAccount', bankAccountSchema);