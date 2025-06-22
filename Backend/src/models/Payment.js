const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    // Payment identification
    paymentNumber: {
        type: String,
        required: true,
        unique: true
    },

    // Payment type
    type: {
        type: String,
        enum: ['payment_in', 'payment_out'],
        required: true
    },

    // Related party
    party: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Party',
        required: true
    },

    // ✅ ADD: Party details for easier access
    partyId: {
        type: String,
        required: true
    },

    partyName: {
        type: String,
        required: true
    },

    // Amount details
    amount: {
        type: Number,
        required: true,
        min: [0, 'Amount must be positive']
    },

    // Payment method
    paymentMethod: {
        type: String,
        enum: ['cash', 'bank_transfer', 'cheque', 'card', 'upi', 'other'],
        default: 'cash'
    },

    // Payment date
    paymentDate: {
        type: Date,
        required: true,
        default: Date.now
    },

    // ✅ ADD: Bank Account Information (CRITICAL FIX)
    bankAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankAccount',
        required: false // Only required for non-cash payments
    },

    // ✅ ADD: Bank details for reference (optional but helpful)
    bankName: {
        type: String,
        required: false
    },

    bankAccountName: {
        type: String,
        required: false
    },

    bankAccountNumber: {
        type: String,
        required: false
    },

    // ✅ ADD: Clearing date for cheques
    clearingDate: {
        type: Date,
        required: false
    },

    // Payment details (method-specific information)
    paymentDetails: {
        // For cheque
        chequeNumber: String,
        chequeDate: Date,
        bankName: String,

        // For bank transfer
        transactionId: String,

        // For UPI
        upiId: String,
        upiTransactionId: String,

        // For card
        cardType: String,
        cardLastFour: String,

        // Additional details
        additionalInfo: String
    },

    // Reference and notes
    reference: {
        type: String,
        trim: true,
        default: ''
    },

    notes: {
        type: String,
        trim: true,
        default: ''
    },

    // Party balance tracking
    partyBalanceBefore: {
        type: Number,
        default: 0
    },

    partyBalanceAfter: {
        type: Number,
        default: 0
    },

    // ✅ ADD: Company field with proper naming
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },

    // ✅ ADD: Payment type for compatibility
    paymentType: {
        type: String,
        enum: ['payment_in', 'payment_out'],
        required: true
    },

    // User tracking
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // ✅ ADD: Employee tracking
    employeeName: {
        type: String,
        default: ''
    },

    employeeId: {
        type: String,
        default: ''
    },

    // Status tracking
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled', 'failed'],
        default: 'completed'
    },

    // ✅ ADD: Enhanced cancellation details
    cancellationReason: String,
    cancelReason: String, // Alternative field name for compatibility
    cancelledAt: Date,
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // ✅ ADD: Invoice allocations
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sale',
        required: false
    },

    purchaseInvoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Purchase',
        required: false
    },

    invoiceAllocations: [{
        invoiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Sale'
        },
        invoiceNumber: String,
        allocatedAmount: Number,
        allocationDate: {
            type: Date,
            default: Date.now
        }
    }],

    purchaseInvoiceAllocations: [{
        purchaseInvoiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Purchase'
        },
        invoiceNumber: String,
        allocatedAmount: Number,
        allocationDate: {
            type: Date,
            default: Date.now
        }
    }],

    // ✅ ADD: Additional compatibility fields
    subType: String

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ✅ ENHANCED: Indexes for better performance including bank account
paymentSchema.index({ party: 1, paymentDate: -1 });
paymentSchema.index({ partyId: 1, paymentDate: -1 });
paymentSchema.index({ type: 1, paymentDate: -1 });
paymentSchema.index({ paymentNumber: 1 });
paymentSchema.index({ company: 1, paymentDate: -1 });
paymentSchema.index({ companyId: 1, paymentDate: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ bankAccountId: 1 }); // ✅ ADD: Bank account index
paymentSchema.index({ paymentMethod: 1 });

// Virtual for payment direction
paymentSchema.virtual('direction').get(function () {
    return this.type === 'payment_in' ? 'received' : 'paid';
});

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function () {
    return `₹${this.amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
});

// ✅ ADD: Virtual for display type
paymentSchema.virtual('displayType').get(function () {
    return this.type === 'payment_in' ? 'pay-in' : 'pay-out';
});

// ✅ ADD: Virtual for bank account info
paymentSchema.virtual('bankAccount', {
    ref: 'BankAccount',
    localField: 'bankAccountId',
    foreignField: '_id',
    justOne: true
});

// ✅ ADD: Pre-save middleware to sync fields
paymentSchema.pre('save', function (next) {
    // Sync company fields
    if (this.company && !this.companyId) {
        this.companyId = this.company;
    } else if (this.companyId && !this.company) {
        this.company = this.companyId;
    }

    // Sync payment type
    if (this.type && !this.paymentType) {
        this.paymentType = this.type;
    }

    next();
});

module.exports = mongoose.model('Payment', paymentSchema);