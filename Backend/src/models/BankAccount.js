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

    // Account Type - Updated to match frontend
    type: {
        type: String,
        enum: ['bank', 'upi'],
        default: 'bank',
        required: true
    },

    // Bank Information (Required for both bank and UPI accounts)
    bankName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    accountNumber: {
        type: String,
        required: true,
        trim: true,
        maxlength: 20
    },
    ifscCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Please enter a valid IFSC code']
    },
    branchName: {
        type: String,
        trim: true,
        maxlength: 100
    },

    // UPI Information (Required only for UPI accounts)
    upiId: {
        type: String,
        trim: true,
        lowercase: true,
        required: function () {
            return this.type === 'upi';
        },
        validate: {
            validator: function (v) {
                if (this.type !== 'upi') return true; // Skip validation if not UPI account
                if (!v) return false; // Required for UPI accounts
                return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(v);
            },
            message: 'Please enter a valid UPI ID (e.g., user@paytm)'
        }
    },
    mobileNumber: {
        type: String,
        trim: true,
        required: function () {
            return this.type === 'upi';
        },
        validate: {
            validator: function (v) {
                if (this.type !== 'upi') return true; // Skip validation if not UPI account
                if (!v) return false; // Required for UPI accounts
                return /^[6-9]\d{9}$/.test(v);
            },
            message: 'Please enter a valid mobile number (10 digits starting with 6-9)'
        }
    },

    // Legacy fields - kept for backward compatibility but not used in new system
    accountType: {
        type: String,
        enum: ['savings', 'current', 'cash', 'fd', 'rd', 'loan', 'cc'],
        default: 'savings'
    },
    accountHolderName: {
        type: String,
        trim: true,
        maxlength: 100
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

    // Print Settings - kept for backward compatibility
    printUpiQrCodes: {
        type: Boolean,
        default: false
    },
    printBankDetails: {
        type: Boolean,
        default: false
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
bankAccountSchema.index({ companyId: 1, accountName: 1 }, { unique: true });
bankAccountSchema.index({ companyId: 1, isActive: 1 });
bankAccountSchema.index({ companyId: 1, type: 1 });
bankAccountSchema.index({ companyId: 1, accountNumber: 1 });
bankAccountSchema.index({ companyId: 1, upiId: 1 }, { sparse: true });

// Virtual for formatted balance
bankAccountSchema.virtual('formattedBalance').get(function () {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(this.currentBalance);
});

// Virtual for account display
bankAccountSchema.virtual('accountDisplay').get(function () {
    if (this.type === 'upi') {
        return `${this.accountName} (UPI: ${this.upiId})`;
    }
    return `${this.accountName} - ${this.accountNumber}`;
});

// Virtual for account type display
bankAccountSchema.virtual('typeDisplay').get(function () {
    const typeMap = {
        'bank': 'Bank Account',
        'upi': 'UPI Account'
    };
    return typeMap[this.type] || this.type;
});

// Pre-save middleware
bankAccountSchema.pre('save', function (next) {
    // Set current balance to opening balance if it's a new document
    if (this.isNew && this.currentBalance === 0) {
        this.currentBalance = this.openingBalance;
    }

    // Validate UPI specific fields
    if (this.type === 'upi') {
        if (!this.upiId) {
            return next(new Error('UPI ID is required for UPI accounts'));
        }
        if (!this.mobileNumber) {
            return next(new Error('Mobile number is required for UPI accounts'));
        }
    }

    // Ensure IFSC code is uppercase
    if (this.ifscCode) {
        this.ifscCode = this.ifscCode.toUpperCase();
    }

    // Ensure UPI ID is lowercase
    if (this.upiId) {
        this.upiId = this.upiId.toLowerCase();
    }

    next();
});

// Pre-validate middleware for better error handling
bankAccountSchema.pre('validate', function (next) {
    // Type-specific validation
    if (this.type === 'upi') {
        // UPI accounts must have bank details + UPI details
        if (!this.bankName) {
            this.invalidate('bankName', 'Bank name is required for UPI accounts');
        }
        if (!this.accountNumber) {
            this.invalidate('accountNumber', 'Account number is required for UPI accounts');
        }
        if (!this.ifscCode) {
            this.invalidate('ifscCode', 'IFSC code is required for UPI accounts');
        }
        if (!this.upiId) {
            this.invalidate('upiId', 'UPI ID is required for UPI accounts');
        }
        if (!this.mobileNumber) {
            this.invalidate('mobileNumber', 'Mobile number is required for UPI accounts');
        }
    } else if (this.type === 'bank') {
        // Bank accounts must have bank details
        if (!this.bankName) {
            this.invalidate('bankName', 'Bank name is required for bank accounts');
        }
        if (!this.accountNumber) {
            this.invalidate('accountNumber', 'Account number is required for bank accounts');
        }
        if (!this.ifscCode) {
            this.invalidate('ifscCode', 'IFSC code is required for bank accounts');
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

// Method to check if account can receive UPI payments
bankAccountSchema.methods.canReceiveUPI = function () {
    return this.type === 'upi' && this.upiId && this.mobileNumber && this.isActive;
};

// Method to get account summary
bankAccountSchema.methods.getSummary = function () {
    return {
        id: this._id,
        accountName: this.accountName,
        type: this.type,
        typeDisplay: this.typeDisplay,
        bankName: this.bankName,
        accountNumber: this.accountNumber,
        ifscCode: this.ifscCode,
        branchName: this.branchName,
        upiId: this.upiId,
        mobileNumber: this.mobileNumber,
        currentBalance: this.currentBalance,
        formattedBalance: this.formattedBalance,
        isActive: this.isActive,
        canReceiveUPI: this.canReceiveUPI()
    };
};

// Static methods
bankAccountSchema.statics.findByCompany = function (companyId, options = {}) {
    const query = { companyId, isActive: true };

    if (options.type) {
        query.type = options.type;
    }

    return this.find(query)
        .sort({ type: 1, accountName: 1 }) // Sort by type first, then by name
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');
};

// Get accounts by type
bankAccountSchema.statics.findBankAccounts = function (companyId) {
    return this.findByCompany(companyId, { type: 'bank' });
};

bankAccountSchema.statics.findUPIAccounts = function (companyId) {
    return this.findByCompany(companyId, { type: 'upi' });
};

// Get total balance by type
bankAccountSchema.statics.getTotalBalance = function (companyId, type = null) {
    const query = { companyId, isActive: true };
    if (type) query.type = type;

    return this.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$type',
                totalBalance: { $sum: '$currentBalance' },
                count: { $sum: 1 }
            }
        }
    ]);
};

// Get account statistics
bankAccountSchema.statics.getAccountStats = function (companyId) {
    return this.aggregate([
        { $match: { companyId, isActive: true } },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                totalBalance: { $sum: '$currentBalance' },
                avgBalance: { $avg: '$currentBalance' }
            }
        },
        {
            $project: {
                type: '$_id',
                count: 1,
                totalBalance: 1,
                avgBalance: { $round: ['$avgBalance', 2] },
                _id: 0
            }
        }
    ]);
};

// Validate account uniqueness
// Replace the validateUniqueness method with this fixed version:

// ✅ FIXED: Enhanced validation method with proper undefined handling
bankAccountSchema.statics.validateUniqueness = async function (companyId, fields, excludeId = null) {
    console.log('🔍 Validating uniqueness for company:', companyId);
    console.log('📝 Fields to validate:', fields);
    console.log('🚫 Excluding account ID:', excludeId);

    const errors = [];

    try {
        // ✅ FIXED: Handle undefined values properly
        const validationPromises = [];

        // Check account name uniqueness
        if (fields.accountName !== undefined && fields.accountName !== null) {
            const accountNameToCheck = typeof fields.accountName === 'string' ? fields.accountName.trim() : String(fields.accountName).trim();

            if (accountNameToCheck) {
                const query = {
                    companyId: new mongoose.Types.ObjectId(companyId),
                    accountName: { $regex: new RegExp(`^${accountNameToCheck.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
                    isActive: true
                };

                if (excludeId) {
                    query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
                }

                console.log('🔍 Checking account name uniqueness:', accountNameToCheck);
                validationPromises.push(
                    this.findOne(query).then(existing => {
                        if (existing) {
                            console.log('❌ Account name already exists:', accountNameToCheck);
                            errors.push(`Account name "${accountNameToCheck}" already exists`);
                        }
                    })
                );
            }
        }

        // Check account number uniqueness
        if (fields.accountNumber !== undefined && fields.accountNumber !== null) {
            const accountNumberToCheck = typeof fields.accountNumber === 'string' ? fields.accountNumber.trim() : String(fields.accountNumber).trim();

            if (accountNumberToCheck) {
                const query = {
                    companyId: new mongoose.Types.ObjectId(companyId),
                    accountNumber: accountNumberToCheck,
                    isActive: true
                };

                if (excludeId) {
                    query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
                }

                console.log('🔍 Checking account number uniqueness:', accountNumberToCheck);
                validationPromises.push(
                    this.findOne(query).then(existing => {
                        if (existing) {
                            console.log('❌ Account number already exists:', accountNumberToCheck);
                            errors.push(`Account number "${accountNumberToCheck}" already exists`);
                        }
                    })
                );
            }
        }

        // ✅ FIXED: Check UPI ID uniqueness with proper undefined handling
        if (fields.upiId !== undefined && fields.upiId !== null) {
            const upiIdToCheck = typeof fields.upiId === 'string' ? fields.upiId.toLowerCase().trim() : String(fields.upiId).toLowerCase().trim();

            if (upiIdToCheck) {
                const query = {
                    companyId: new mongoose.Types.ObjectId(companyId),
                    upiId: upiIdToCheck,
                    isActive: true
                };

                if (excludeId) {
                    query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
                }

                console.log('🔍 Checking UPI ID uniqueness:', upiIdToCheck);
                validationPromises.push(
                    this.findOne(query).then(existing => {
                        if (existing) {
                            console.log('❌ UPI ID already exists:', upiIdToCheck);
                            errors.push(`UPI ID "${upiIdToCheck}" already exists`);
                        }
                    })
                );
            }
        }

        // Wait for all validation checks to complete
        await Promise.all(validationPromises);

        const result = {
            isValid: errors.length === 0,
            errors: errors
        };

        console.log('✅ Validation result:', result);
        return result;

    } catch (error) {
        console.error('❌ Error during uniqueness validation:', error);
        return {
            isValid: false,
            errors: ['Validation check failed: ' + error.message]
        };
    }
};


module.exports = mongoose.model('BankAccount', bankAccountSchema);