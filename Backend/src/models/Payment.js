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
    
    // Company and user tracking
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company'
    },
    
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Status tracking
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled', 'failed'],
        default: 'completed'
    },
    
    // Cancellation details
    cancellationReason: String,
    cancelledAt: Date,
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
paymentSchema.index({ party: 1, paymentDate: -1 });
paymentSchema.index({ type: 1, paymentDate: -1 });
paymentSchema.index({ paymentNumber: 1 });
paymentSchema.index({ company: 1, paymentDate: -1 });
paymentSchema.index({ status: 1 });

// Virtual for payment direction
paymentSchema.virtual('direction').get(function() {
    return this.type === 'payment_in' ? 'received' : 'paid';
});

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
    return `₹${this.amount.toLocaleString('en-IN', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2 
    })}`;
});

module.exports = mongoose.model('Payment', paymentSchema);