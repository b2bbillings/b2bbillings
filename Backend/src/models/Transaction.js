const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    // Basic Transaction Details
    transactionId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    transactionDate: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },
    transactionType: {
        type: String,
        enum: ['purchase', 'sale', 'payment_in', 'payment_out', 'expense', 'income', 'transfer', 'adjustment'],
        required: true,
        index: true
    },

    // Company Reference
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },

    // ✅ FIXED: Bank Account Reference - Optional for cash transactions
    bankAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankAccount',
        required: function () {
            // Only require bank account if this is not a cash transaction
            return this.paymentMethod !== 'cash' && !this.isCashTransaction;
        },
        index: true
    },

    // Amount Details
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    direction: {
        type: String,
        enum: ['in', 'out'],
        required: true,
        index: true
    },

    // Party Information (Customer/Supplier)
    partyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Party',
        sparse: true,
        index: true
    },
    partyName: {
        type: String,
        trim: true
    },
    partyType: {
        type: String,
        enum: ['customer', 'supplier', 'other'],
        sparse: true
    },

    // Payment Method Details
    paymentMethod: {
        type: String,
        enum: ['cash', 'upi', 'bank_transfer', 'cheque', 'card', 'online', 'neft', 'rtgs'],
        required: true,
        default: 'cash'
    },

    // Reference Information
    referenceType: {
        type: String,
        enum: ['purchase', 'sale', 'payment', 'expense', 'income', 'adjustment', 'transfer'],
        required: true,
        default: 'payment'
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        sparse: true,
        index: true
    },
    referenceNumber: {
        type: String,
        trim: true,
        index: true
    },

    // Transaction Details
    description: {
        type: String,
        required: true,
        trim: true
    },
    notes: {
        type: String,
        trim: true
    },

    // Payment Specific Details
    chequeNumber: {
        type: String,
        trim: true,
        sparse: true
    },
    chequeDate: {
        type: Date,
        sparse: true
    },
    upiTransactionId: {
        type: String,
        trim: true,
        sparse: true
    },
    bankTransactionId: {
        type: String,
        trim: true,
        sparse: true
    },
    transactionReference: {
        type: String,
        trim: true,
        sparse: true
    },

    // ✅ FIXED: Balance Information - Optional for cash transactions
    balanceBefore: {
        type: Number,
        required: function () {
            // Only require balance tracking for non-cash transactions
            return this.paymentMethod !== 'cash' && !this.isCashTransaction;
        },
        default: function () {
            // Default to 0 for cash transactions
            return this.paymentMethod === 'cash' || this.isCashTransaction ? 0 : undefined;
        }
    },
    balanceAfter: {
        type: Number,
        required: function () {
            // Only require balance tracking for non-cash transactions
            return this.paymentMethod !== 'cash' && !this.isCashTransaction;
        },
        default: function () {
            // Default to 0 for cash transactions
            return this.paymentMethod === 'cash' || this.isCashTransaction ? 0 : undefined;
        }
    },

    // ✅ NEW: Cash Transaction Specific Fields
    isCashTransaction: {
        type: Boolean,
        default: function () {
            return this.paymentMethod === 'cash';
        },
        index: true
    },
    cashAmount: {
        type: Number,
        required: function () {
            return this.isCashTransaction === true || this.paymentMethod === 'cash';
        },
        default: function () {
            return this.isCashTransaction || this.paymentMethod === 'cash' ? this.amount : undefined;
        }
    },
    cashTransactionType: {
        type: String,
        enum: ['cash_in', 'cash_out'],
        required: function () {
            return this.isCashTransaction === true || this.paymentMethod === 'cash';
        },
        default: function () {
            if (this.isCashTransaction || this.paymentMethod === 'cash') {
                return this.direction === 'in' ? 'cash_in' : 'cash_out';
            }
            return undefined;
        }
    },

    // Status and Metadata
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        default: 'completed',
        index: true
    },
    reconciled: {
        type: Boolean,
        default: false,
        index: true
    },
    reconciledDate: {
        type: Date,
        sparse: true
    },

    // Audit Trail
    createdBy: {
        type: String,
        default: 'system'
    },
    lastModifiedBy: {
        type: String,
        default: 'system'
    },
    createdFrom: {
        type: String,
        default: 'manual',
        enum: ['purchase_system', 'sales_system', 'payment_system', 'manual', 'import', 'api']
    },

    // ✅ NEW: Metadata for additional information
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ✅ ENHANCED: Indexes for better performance including cash transactions
transactionSchema.index({ companyId: 1, transactionDate: -1 });
transactionSchema.index({ companyId: 1, bankAccountId: 1, transactionDate: -1 });
transactionSchema.index({ companyId: 1, transactionType: 1, transactionDate: -1 });
transactionSchema.index({ companyId: 1, partyId: 1, transactionDate: -1 });
transactionSchema.index({ companyId: 1, referenceType: 1, referenceId: 1 });
transactionSchema.index({ companyId: 1, isCashTransaction: 1, transactionDate: -1 });
transactionSchema.index({ companyId: 1, paymentMethod: 1, transactionDate: -1 });
transactionSchema.index({ transactionId: 1 }, { unique: true });

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function () {
    return this.direction === 'out' ? `-₹${this.amount.toFixed(2)}` : `+₹${this.amount.toFixed(2)}`;
});

// Virtual for transaction impact
transactionSchema.virtual('impactDescription').get(function () {
    const actionMap = {
        'purchase': 'Purchase Payment',
        'sale': 'Sales Receipt',
        'payment_in': 'Payment Received',
        'payment_out': 'Payment Made',
        'expense': 'Expense',
        'income': 'Income',
        'transfer': 'Transfer',
        'adjustment': 'Adjustment'
    };
    return actionMap[this.transactionType] || 'Transaction';
});

// ✅ ENHANCED: Pre-save middleware to handle cash transactions
transactionSchema.pre('save', async function (next) {
    try {
        // ✅ Auto-detect and setup cash transactions
        if (this.paymentMethod === 'cash') {
            this.isCashTransaction = true;
            this.cashAmount = this.amount;
            this.cashTransactionType = this.direction === 'in' ? 'cash_in' : 'cash_out';

            // ✅ Clear bank account fields for cash transactions
            this.bankAccountId = undefined;
            this.balanceBefore = 0;
            this.balanceAfter = 0;
        }

        // ✅ Generate transaction ID if not present
        if (this.isNew && !this.transactionId) {
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            // Find the last transaction for today
            const todayStart = new Date(year, date.getMonth(), date.getDate());
            const todayEnd = new Date(year, date.getMonth(), date.getDate() + 1);

            const lastTransaction = await this.constructor.findOne({
                companyId: this.companyId,
                createdAt: { $gte: todayStart, $lt: todayEnd },
                transactionId: new RegExp(`^TXN-${year}${month}${day}`)
            }).sort({ transactionId: -1 });

            let sequence = 1;
            if (lastTransaction) {
                const lastSequence = parseInt(lastTransaction.transactionId.split('-')[2]);
                sequence = lastSequence + 1;
            }

            this.transactionId = `TXN-${year}${month}${day}-${String(sequence).padStart(6, '0')}`;
        }

        next();
    } catch (error) {
        next(error);
    }
});

// ✅ ENHANCED: Static methods for transaction creation

// Static method for creating purchase transactions (supports both cash and bank)
transactionSchema.statics.createPurchaseTransaction = async function (purchaseData, bankAccountId = null) {
    const {
        purchase,
        supplier,
        paymentMethod = 'cash',
        amount,
        notes = '',
        chequeNumber = '',
        chequeDate = null,
        upiTransactionId = '',
        bankTransactionId = ''
    } = purchaseData;

    console.log('🏦 Creating purchase transaction:', {
        purchaseId: purchase._id,
        supplierName: supplier?.name,
        amount,
        paymentMethod,
        bankAccountId
    });

    const transactionData = {
        companyId: purchase.companyId,
        amount,
        direction: 'out', // Money going out for purchase
        transactionType: 'purchase',
        referenceType: 'purchase',
        referenceId: purchase._id,
        referenceNumber: purchase.purchaseNumber,
        paymentMethod,
        partyId: supplier?._id || null,
        partyName: supplier?.name || 'Unknown Supplier',
        partyType: 'supplier',
        description: `Purchase payment for ${purchase.purchaseNumber}${supplier?.name ? ` to ${supplier.name}` : ''}`,
        notes,
        status: 'completed',
        createdFrom: 'purchase_system'
    };

    // ✅ Handle bank vs cash transactions
    if (paymentMethod === 'cash') {
        // Cash transaction - no bank account needed
        transactionData.isCashTransaction = true;
        transactionData.cashAmount = amount;
        transactionData.cashTransactionType = 'cash_out';
        transactionData.balanceBefore = 0;
        transactionData.balanceAfter = 0;
    } else {
        // Bank transaction - require bank account
        if (!bankAccountId) {
            throw new Error('Bank account ID is required for non-cash payments');
        }

        const BankAccount = mongoose.model('BankAccount');
        const bankAccount = await BankAccount.findById(bankAccountId);

        if (!bankAccount) {
            throw new Error('Bank account not found');
        }

        const balanceBefore = bankAccount.balance || 0;
        const balanceAfter = balanceBefore - amount;

        transactionData.bankAccountId = bankAccountId;
        transactionData.balanceBefore = balanceBefore;
        transactionData.balanceAfter = balanceAfter;

        // Update bank account balance
        await BankAccount.findByIdAndUpdate(bankAccountId, {
            balance: balanceAfter,
            lastTransactionDate: new Date(),
            $inc: { totalDebits: amount, transactionCount: 1 }
        });
    }

    // Add payment-specific details
    if (chequeNumber) transactionData.chequeNumber = chequeNumber;
    if (chequeDate) transactionData.chequeDate = chequeDate;
    if (upiTransactionId) transactionData.upiTransactionId = upiTransactionId;
    if (bankTransactionId) transactionData.bankTransactionId = bankTransactionId;

    const transaction = new this(transactionData);
    await transaction.save();

    console.log(`✅ ${paymentMethod === 'cash' ? 'Cash' : 'Bank'} purchase transaction created:`, transaction.transactionId);
    return transaction;
};

// Static method for creating sales transactions (supports both cash and bank)
transactionSchema.statics.createSalesTransaction = async function (salesData, bankAccountId = null) {
    const {
        sale,
        customer,
        paymentMethod = 'cash',
        amount,
        notes = '',
        chequeNumber = '',
        chequeDate = null,
        upiTransactionId = '',
        bankTransactionId = ''
    } = salesData;

    console.log('🏦 Creating sales transaction:', {
        saleId: sale._id,
        customerName: customer?.name,
        amount,
        paymentMethod,
        bankAccountId
    });

    const transactionData = {
        companyId: sale.companyId,
        amount,
        direction: 'in', // Money coming in from sales
        transactionType: 'sale',
        referenceType: 'sale',
        referenceId: sale._id,
        referenceNumber: sale.invoiceNumber,
        paymentMethod,
        partyId: customer?._id || null,
        partyName: customer?.name || 'Walk-in Customer',
        partyType: 'customer',
        description: `Sales receipt for ${sale.invoiceNumber}${customer?.name ? ` from ${customer.name}` : ''}`,
        notes,
        status: 'completed',
        createdFrom: 'sales_system'
    };

    // ✅ Handle bank vs cash transactions
    if (paymentMethod === 'cash') {
        // Cash transaction - no bank account needed
        transactionData.isCashTransaction = true;
        transactionData.cashAmount = amount;
        transactionData.cashTransactionType = 'cash_in';
        transactionData.balanceBefore = 0;
        transactionData.balanceAfter = 0;
    } else {
        // Bank transaction - require bank account
        if (!bankAccountId) {
            throw new Error('Bank account ID is required for non-cash payments');
        }

        const BankAccount = mongoose.model('BankAccount');
        const bankAccount = await BankAccount.findById(bankAccountId);

        if (!bankAccount) {
            throw new Error('Bank account not found');
        }

        const balanceBefore = bankAccount.balance || 0;
        const balanceAfter = balanceBefore + amount;

        transactionData.bankAccountId = bankAccountId;
        transactionData.balanceBefore = balanceBefore;
        transactionData.balanceAfter = balanceAfter;

        // Update bank account balance
        await BankAccount.findByIdAndUpdate(bankAccountId, {
            balance: balanceAfter,
            lastTransactionDate: new Date(),
            $inc: { totalCredits: amount, transactionCount: 1 }
        });
    }

    // Add payment-specific details
    if (chequeNumber) transactionData.chequeNumber = chequeNumber;
    if (chequeDate) transactionData.chequeDate = chequeDate;
    if (upiTransactionId) transactionData.upiTransactionId = upiTransactionId;
    if (bankTransactionId) transactionData.bankTransactionId = bankTransactionId;

    const transaction = new this(transactionData);
    await transaction.save();

    console.log(`✅ ${paymentMethod === 'cash' ? 'Cash' : 'Bank'} sales transaction created:`, transaction.transactionId);
    return transaction;
};

// ✅ NEW: Static methods for cash and bank transaction queries
transactionSchema.statics.getCashTransactions = function (companyId, options = {}) {
    const query = {
        companyId: mongoose.Types.ObjectId(companyId),
        $or: [
            { isCashTransaction: true },
            { paymentMethod: 'cash' }
        ]
    };

    if (options.direction) query.direction = options.direction;
    if (options.transactionType) query.transactionType = options.transactionType;

    if (options.dateFrom || options.dateTo) {
        query.transactionDate = {};
        if (options.dateFrom) query.transactionDate.$gte = new Date(options.dateFrom);
        if (options.dateTo) query.transactionDate.$lte = new Date(options.dateTo);
    }

    return this.find(query).sort({ transactionDate: -1, createdAt: -1 });
};

transactionSchema.statics.getBankTransactions = function (companyId, bankAccountId = null, options = {}) {
    const query = {
        companyId: mongoose.Types.ObjectId(companyId),
        isCashTransaction: { $ne: true },
        paymentMethod: { $ne: 'cash' }
    };

    if (bankAccountId) {
        query.bankAccountId = mongoose.Types.ObjectId(bankAccountId);
    }

    if (options.direction) query.direction = options.direction;
    if (options.transactionType) query.transactionType = options.transactionType;

    if (options.dateFrom || options.dateTo) {
        query.transactionDate = {};
        if (options.dateFrom) query.transactionDate.$gte = new Date(options.dateFrom);
        if (options.dateTo) query.transactionDate.$lte = new Date(options.dateTo);
    }

    return this.find(query).sort({ transactionDate: -1, createdAt: -1 });
};

// ✅ ENHANCED: Static method to get transaction summary (including cash)
transactionSchema.statics.getTransactionSummary = function (companyId, filters = {}) {
    const matchConditions = { companyId: mongoose.Types.ObjectId(companyId) };

    if (filters.bankAccountId) {
        matchConditions.bankAccountId = mongoose.Types.ObjectId(filters.bankAccountId);
    }

    if (filters.isCashTransaction !== undefined) {
        matchConditions.isCashTransaction = filters.isCashTransaction;
    }

    if (filters.startDate || filters.endDate) {
        matchConditions.transactionDate = {};
        if (filters.startDate) matchConditions.transactionDate.$gte = new Date(filters.startDate);
        if (filters.endDate) matchConditions.transactionDate.$lte = new Date(filters.endDate);
    }

    if (filters.transactionType) {
        matchConditions.transactionType = filters.transactionType;
    }

    return this.aggregate([
        { $match: matchConditions },
        {
            $group: {
                _id: null,
                totalTransactions: { $sum: 1 },
                totalIn: {
                    $sum: {
                        $cond: [{ $eq: ['$direction', 'in'] }, '$amount', 0]
                    }
                },
                totalOut: {
                    $sum: {
                        $cond: [{ $eq: ['$direction', 'out'] }, '$amount', 0]
                    }
                },
                totalCash: {
                    $sum: {
                        $cond: [
                            { $or: [{ $eq: ['$isCashTransaction', true] }, { $eq: ['$paymentMethod', 'cash'] }] },
                            '$amount',
                            0
                        ]
                    }
                },
                totalBank: {
                    $sum: {
                        $cond: [
                            { $and: [{ $ne: ['$isCashTransaction', true] }, { $ne: ['$paymentMethod', 'cash'] }] },
                            '$amount',
                            0
                        ]
                    }
                },
                netAmount: {
                    $sum: {
                        $cond: [
                            { $eq: ['$direction', 'in'] },
                            '$amount',
                            { $multiply: ['$amount', -1] }
                        ]
                    }
                }
            }
        }
    ]);
};

module.exports = mongoose.model('Transaction', transactionSchema);