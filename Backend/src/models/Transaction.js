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

    // Bank Account Reference
    bankAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankAccount',
        required: true,
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
        required: true
    },

    // Reference Information
    referenceType: {
        type: String,
        enum: ['purchase', 'sale', 'payment', 'expense', 'income', 'adjustment', 'transfer'],
        required: true
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

    // Balance Information
    balanceBefore: {
        type: Number,
        required: true,
        default: 0
    },
    balanceAfter: {
        type: Number,
        required: true,
        default: 0
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
        default: 'purchase_system',
        enum: ['purchase_system', 'sales_system', 'payment_system', 'manual', 'import', 'api']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
transactionSchema.index({ companyId: 1, transactionDate: -1 });
transactionSchema.index({ companyId: 1, bankAccountId: 1, transactionDate: -1 });
transactionSchema.index({ companyId: 1, transactionType: 1, transactionDate: -1 });
transactionSchema.index({ companyId: 1, partyId: 1, transactionDate: -1 });
transactionSchema.index({ companyId: 1, referenceType: 1, referenceId: 1 });
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

// Pre-save middleware to generate transaction ID
transactionSchema.pre('save', async function (next) {
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
});

// Static methods for transaction creation
transactionSchema.statics.createPurchaseTransaction = async function (purchaseData, bankAccountId) {
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
        bankAccountId
    });

    // Get current bank account balance
    const BankAccount = mongoose.model('BankAccount');
    const bankAccount = await BankAccount.findById(bankAccountId);

    if (!bankAccount) {
        throw new Error('Bank account not found');
    }

    const balanceBefore = bankAccount.balance || 0;
    const balanceAfter = balanceBefore - amount; // Purchase reduces bank balance

    const transactionData = {
        companyId: purchase.companyId,
        bankAccountId,
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
        balanceBefore,
        balanceAfter,
        status: 'completed',
        createdFrom: 'purchase_system'
    };

    // Add payment-specific details
    if (chequeNumber) transactionData.chequeNumber = chequeNumber;
    if (chequeDate) transactionData.chequeDate = chequeDate;
    if (upiTransactionId) transactionData.upiTransactionId = upiTransactionId;
    if (bankTransactionId) transactionData.bankTransactionId = bankTransactionId;

    const transaction = new this(transactionData);
    await transaction.save();

    // Update bank account balance
    await BankAccount.findByIdAndUpdate(bankAccountId, {
        balance: balanceAfter,
        lastTransactionDate: new Date(),
        $inc: { totalDebits: amount, transactionCount: 1 }
    });

    console.log('✅ Purchase transaction created:', transaction.transactionId);
    return transaction;
};

transactionSchema.statics.createSalesTransaction = async function (salesData, bankAccountId) {
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
        bankAccountId
    });

    // Get current bank account balance
    const BankAccount = mongoose.model('BankAccount');
    const bankAccount = await BankAccount.findById(bankAccountId);

    if (!bankAccount) {
        throw new Error('Bank account not found');
    }

    const balanceBefore = bankAccount.balance || 0;
    const balanceAfter = balanceBefore + amount; // Sales increases bank balance

    const transactionData = {
        companyId: sale.companyId,
        bankAccountId,
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
        balanceBefore,
        balanceAfter,
        status: 'completed',
        createdFrom: 'sales_system'
    };

    // Add payment-specific details
    if (chequeNumber) transactionData.chequeNumber = chequeNumber;
    if (chequeDate) transactionData.chequeDate = chequeDate;
    if (upiTransactionId) transactionData.upiTransactionId = upiTransactionId;
    if (bankTransactionId) transactionData.bankTransactionId = bankTransactionId;

    const transaction = new this(transactionData);
    await transaction.save();

    // Update bank account balance
    await BankAccount.findByIdAndUpdate(bankAccountId, {
        balance: balanceAfter,
        lastTransactionDate: new Date(),
        $inc: { totalCredits: amount, transactionCount: 1 }
    });

    console.log('✅ Sales transaction created:', transaction.transactionId);
    return transaction;
};

// Static method to get transaction summary
transactionSchema.statics.getTransactionSummary = function (companyId, filters = {}) {
    const matchConditions = { companyId: mongoose.Types.ObjectId(companyId) };

    if (filters.bankAccountId) {
        matchConditions.bankAccountId = mongoose.Types.ObjectId(filters.bankAccountId);
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