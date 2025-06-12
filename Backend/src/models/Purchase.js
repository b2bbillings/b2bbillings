const mongoose = require('mongoose');

// Payment History Schema
const paymentHistorySchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    method: {
        type: String,
        enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'credit', 'online', 'bank'],
        default: 'cash'
    },
    reference: {
        type: String,
        trim: true,
        default: ''
    },
    paymentDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    dueDate: {
        type: Date,
        default: null
    },
    notes: {
        type: String,
        trim: true,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: String,
        default: 'system'
    }
});

// Main Purchase Schema - UPDATED TO MATCH SALE MODEL
const purchaseSchema = new mongoose.Schema({
    // Purchase Details
    purchaseNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    purchaseDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    purchaseType: {
        type: String,
        enum: ['gst', 'non-gst'],
        default: 'gst',
        required: true
    },

    // Supplier Information
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Party',
        required: true,
        index: true
    },
    supplierMobile: {
        type: String,
        trim: true
    },

    // GST and Tax Settings - FIXED WITH BOTH FIELDS (MATCHING SALE MODEL)
    gstEnabled: {
        type: Boolean,
        required: true,
        default: true
    },
    taxMode: {
        type: String,
        enum: ['with-tax', 'without-tax'],
        default: 'without-tax'
    },
    priceIncludesTax: {
        type: Boolean,
        default: false
    },

    // Company reference
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },

    // Purchase Items Array - COMPLETE WITH ALL FIELDS (MATCHING SALE MODEL)
    items: [{
        // Item Reference (optional - for inventory items)
        itemRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item',
            sparse: true
        },

        // Item Details
        itemName: {
            type: String,
            required: true,
            trim: true
        },
        itemCode: {
            type: String,
            trim: true,
            default: ''
        },
        hsnCode: {
            type: String,
            trim: true,
            default: '0000'
        },
        category: {
            type: String,
            trim: true,
            default: ''
        },

        // Quantity and Unit
        quantity: {
            type: Number,
            required: true,
            min: 0.01
        },
        unit: {
            type: String,
            enum: ['NONE', 'KG', 'GM', 'LTR', 'ML', 'PCS', 'BOX', 'M', 'CM', 'BAG', 'BTL', 'BUN', 'CAN', 'CTN', 'DOZ', 'DRM', 'FEW', 'GMS', 'GRS', 'KGS', 'KME', 'MLS', 'MTR', 'NOS', 'PAC', 'QTL', 'ROL', 'SET', 'SQF', 'SQM', 'TBS', 'TGM', 'THD', 'TON', 'TUB', 'UGS', 'UNT', 'YDS', 'OTH'],
            default: 'PCS'
        },

        // Pricing Details - COMPLETE WITH TAX MODE FIELDS (MATCHING SALE MODEL)
        pricePerUnit: {
            type: Number,
            required: true,
            min: 0
        },
        taxRate: {
            type: Number,
            default: 18,
            min: 0,
            max: 100
        },
        // FIXED: Item-level tax mode compatibility
        taxMode: {
            type: String,
            enum: ['with-tax', 'without-tax'],
            default: 'without-tax'
        },
        priceIncludesTax: {
            type: Boolean,
            default: false
        },

        // Discount Fields
        discountPercent: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        discountAmount: {
            type: Number,
            default: 0,
            min: 0
        },

        // Tax Amounts - COMPLETE WITH ALL VARIANTS (MATCHING SALE MODEL)
        // Backend fields (original)
        cgst: {
            type: Number,
            default: 0,
            min: 0
        },
        sgst: {
            type: Number,
            default: 0,
            min: 0
        },
        igst: {
            type: Number,
            default: 0,
            min: 0
        },

        // Frontend compatibility fields
        cgstAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        sgstAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        igstAmount: {
            type: Number,
            default: 0,
            min: 0
        },

        // Calculated amounts
        taxableAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        totalTaxAmount: {
            type: Number,
            default: 0,
            min: 0
        },

        // Final amounts - BOTH FIELDS FOR COMPATIBILITY (MATCHING SALE MODEL)
        amount: {
            type: Number,
            default: 0,
            min: 0
        },
        itemAmount: {
            type: Number,
            required: true,
            min: 0
        },

        // Receiving tracking (specific to purchases)
        receivedQuantity: {
            type: Number,
            default: 0,
            min: 0
        },
        pendingQuantity: {
            type: Number,
            default: 0,
            min: 0
        },

        // Line ordering
        lineNumber: {
            type: Number,
            required: true,
            min: 1
        }
    }],

    // Totals Section - COMPLETE (MATCHING SALE MODEL)
    totals: {
        subtotal: {
            type: Number,
            required: true,
            default: 0
        },
        totalQuantity: {
            type: Number,
            default: 0
        },
        totalDiscount: {
            type: Number,
            default: 0
        },
        totalDiscountAmount: {
            type: Number,
            default: 0
        },
        totalTax: {
            type: Number,
            default: 0
        },
        totalCGST: {
            type: Number,
            default: 0
        },
        totalSGST: {
            type: Number,
            default: 0
        },
        totalIGST: {
            type: Number,
            default: 0
        },
        totalTaxableAmount: {
            type: Number,
            default: 0
        },
        finalTotal: {
            type: Number,
            required: true,
            min: 0
        },
        roundOff: {
            type: Number,
            default: 0
        },
        // Additional total fields for compatibility
        withTaxTotal: {
            type: Number,
            default: 0
        },
        withoutTaxTotal: {
            type: Number,
            default: 0
        }
    },

    // Payment Information - COMPLETE WITH DUE DATE SUPPORT (MATCHING SALE MODEL)
    payment: {
        method: {
            type: String,
            enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'credit', 'online', 'bank'],
            default: 'credit' // Default to credit for purchases
        },
        status: {
            type: String,
            enum: ['paid', 'pending', 'partial', 'cancelled', 'overdue'],
            default: 'pending'
        },
        paidAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        pendingAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        paymentDate: {
            type: Date,
            default: Date.now
        },
        dueDate: {
            type: Date,
            default: null,
            index: true
        },
        creditDays: {
            type: Number,
            default: 0,
            min: 0
        },
        reference: {
            type: String,
            trim: true,
            default: ''
        },
        notes: {
            type: String,
            trim: true,
            default: ''
        }
    },

    // Payment History (MATCHING SALE MODEL)
    paymentHistory: [paymentHistorySchema],

    // Purchase Order Information (specific to purchases)
    purchaseOrderNumber: {
        type: String,
        trim: true
    },
    deliveryDate: {
        type: Date
    },
    receivedDate: {
        type: Date
    },

    // Additional Information
    notes: {
        type: String,
        trim: true,
        default: ''
    },
    termsAndConditions: {
        type: String,
        trim: true,
        default: ''
    },

    // Status Management
    status: {
        type: String,
        enum: ['draft', 'ordered', 'received', 'completed', 'cancelled'],
        default: 'draft'
    },

    // Receiving Status (for inventory management)
    receivingStatus: {
        type: String,
        enum: ['pending', 'partial', 'complete'],
        default: 'pending'
    },

    // Metadata
    createdBy: {
        type: String,
        default: 'system'
    },
    lastModifiedBy: {
        type: String,
        default: 'system'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// INDEXES FOR PERFORMANCE (MATCHING SALE MODEL)
purchaseSchema.index({ companyId: 1, purchaseNumber: 1 }, { unique: true });
purchaseSchema.index({ companyId: 1, supplier: 1 });
purchaseSchema.index({ companyId: 1, purchaseDate: 1 });
purchaseSchema.index({ companyId: 1, status: 1 });
purchaseSchema.index({ companyId: 1, receivingStatus: 1 });
purchaseSchema.index({ 'payment.status': 1 });
purchaseSchema.index({ 'payment.dueDate': 1 });
purchaseSchema.index({ companyId: 1, 'payment.dueDate': 1 });

// VIRTUAL FIELDS (MATCHING SALE MODEL)
purchaseSchema.virtual('balanceAmount').get(function () {
    const total = this.totals?.finalTotal || 0;
    const paid = this.payment?.paidAmount || 0;
    return Math.max(0, total - paid);
});

purchaseSchema.virtual('isOverdue').get(function () {
    if (!this.payment?.dueDate || this.payment?.pendingAmount <= 0) {
        return false;
    }
    return new Date() > this.payment.dueDate;
});

purchaseSchema.virtual('daysOverdue').get(function () {
    if (!this.isOverdue) {
        return 0;
    }
    const today = new Date();
    const dueDate = this.payment.dueDate;
    const timeDiff = today.getTime() - dueDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
});

// Virtual for total received quantity
purchaseSchema.virtual('totalReceivedQuantity').get(function () {
    return this.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);
});

// Virtual for total pending quantity
purchaseSchema.virtual('totalPendingQuantity').get(function () {
    return this.items.reduce((sum, item) => sum + Math.max(0, item.quantity - (item.receivedQuantity || 0)), 0);
});

// PRE-SAVE MIDDLEWARE - COMPLETE WITH TAX MODE SYNC (MATCHING SALE MODEL)
purchaseSchema.pre('save', function (next) {
    // 1. SYNC GLOBAL TAX MODE FIELDS
    if (this.taxMode) {
        this.priceIncludesTax = this.taxMode === 'with-tax';
    } else if (this.priceIncludesTax !== undefined) {
        this.taxMode = this.priceIncludesTax ? 'with-tax' : 'without-tax';
    }

    // 2. PROCESS ITEMS
    this.items.forEach((item, index) => {
        // Set line numbers
        if (!item.lineNumber) {
            item.lineNumber = index + 1;
        }

        // Sync item-level tax mode fields
        if (item.taxMode) {
            item.priceIncludesTax = item.taxMode === 'with-tax';
        } else if (item.priceIncludesTax !== undefined) {
            item.taxMode = item.priceIncludesTax ? 'with-tax' : 'without-tax';
        } else {
            // Use global tax mode if item doesn't have its own
            item.taxMode = this.taxMode || 'without-tax';
            item.priceIncludesTax = item.taxMode === 'with-tax';
        }

        // Sync calculated amounts for compatibility
        if (item.itemAmount && !item.amount) {
            item.amount = item.itemAmount;
        } else if (item.amount && !item.itemAmount) {
            item.itemAmount = item.amount;
        }

        // Sync tax amounts
        if (item.cgst !== undefined && item.cgstAmount === undefined) {
            item.cgstAmount = item.cgst;
        } else if (item.cgstAmount !== undefined && item.cgst === undefined) {
            item.cgst = item.cgstAmount;
        }

        if (item.sgst !== undefined && item.sgstAmount === undefined) {
            item.sgstAmount = item.sgst;
        } else if (item.sgstAmount !== undefined && item.sgst === undefined) {
            item.sgst = item.sgstAmount;
        }

        if (item.igst !== undefined && item.igstAmount === undefined) {
            item.igstAmount = item.igst;
        } else if (item.igstAmount !== undefined && item.igst === undefined) {
            item.igst = item.igstAmount;
        }

        // Calculate total tax amount
        item.totalTaxAmount = (item.cgstAmount || item.cgst || 0) +
            (item.sgstAmount || item.sgst || 0) +
            (item.igstAmount || item.igst || 0);

        // Update pending quantity
        item.pendingQuantity = Math.max(0, item.quantity - (item.receivedQuantity || 0));
    });

    // 3. UPDATE PAYMENT STATUS
    if (this.payment && this.totals) {
        const paidAmount = this.payment.paidAmount || 0;
        const finalTotal = this.totals.finalTotal || 0;

        this.payment.pendingAmount = Math.max(0, finalTotal - paidAmount);

        if (paidAmount >= finalTotal && finalTotal > 0) {
            this.payment.status = 'paid';
            this.payment.pendingAmount = 0;
            this.payment.dueDate = null;
        } else if (paidAmount > 0) {
            if (this.payment.dueDate && new Date() > this.payment.dueDate) {
                this.payment.status = 'overdue';
            } else {
                this.payment.status = 'partial';
            }
        } else {
            if (this.payment.dueDate && new Date() > this.payment.dueDate) {
                this.payment.status = 'overdue';
            } else {
                this.payment.status = 'pending';
            }
        }
    }

    next();
});

// PRE-SAVE MIDDLEWARE FOR PURCHASE NUMBER GENERATION
purchaseSchema.pre('save', async function (next) {
    if (this.isNew && !this.purchaseNumber) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        // Find the last purchase for today
        const todayStart = new Date(year, date.getMonth(), date.getDate());
        const todayEnd = new Date(year, date.getMonth(), date.getDate() + 1);

        try {
            const lastPurchase = await this.constructor.findOne({
                companyId: this.companyId,
                purchaseDate: { $gte: todayStart, $lt: todayEnd },
                purchaseNumber: new RegExp(`^${this.purchaseType.toUpperCase()}-${year}${month}${day}`)
            }).sort({ purchaseNumber: -1 });

            let sequence = 1;
            if (lastPurchase) {
                const lastSequence = parseInt(lastPurchase.purchaseNumber.split('-')[2]);
                sequence = lastSequence + 1;
            }

            const prefix = this.purchaseType === 'gst' ? 'PO-GST' : 'PO';
            this.purchaseNumber = `${prefix}-${year}${month}${day}-${String(sequence).padStart(4, '0')}`;
        } catch (error) {
            console.error('Error generating purchase number:', error);
            // Fallback to timestamp-based number
            this.purchaseNumber = `${this.purchaseType.toUpperCase()}-${Date.now()}`;
        }
    }
    next();
});

// INSTANCE METHODS (MATCHING SALE MODEL + PURCHASE-SPECIFIC)
purchaseSchema.methods.addPayment = function (amount, method = 'cash', reference = '', paymentDate = null, dueDate = null, notes = '') {
    const currentPaid = this.payment?.paidAmount || 0;
    const newPaidAmount = currentPaid + parseFloat(amount);

    // Update main payment record
    this.payment = {
        ...this.payment,
        paidAmount: newPaidAmount,
        method,
        reference,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : this.payment.dueDate,
        notes
    };

    // Add to payment history
    if (!this.paymentHistory) {
        this.paymentHistory = [];
    }

    this.paymentHistory.push({
        amount: parseFloat(amount),
        method,
        reference,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        notes,
        createdAt: new Date(),
        createdBy: 'system'
    });

    return this.save();
};

purchaseSchema.methods.setDueDate = function (creditDays) {
    if (!creditDays || creditDays <= 0) return this;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parseInt(creditDays));

    this.payment.dueDate = dueDate;
    this.payment.creditDays = parseInt(creditDays);

    return this;
};

purchaseSchema.methods.markAsOrdered = function () {
    this.status = 'ordered';
    return this.save();
};

purchaseSchema.methods.markAsReceived = function () {
    this.status = 'received';
    this.receivedDate = new Date();
    this.receivingStatus = 'complete';

    // Mark all items as fully received
    this.items.forEach(item => {
        item.receivedQuantity = item.quantity;
        item.pendingQuantity = 0;
    });

    return this.save();
};

purchaseSchema.methods.markAsCompleted = function () {
    this.status = 'completed';
    return this.save();
};

purchaseSchema.methods.markAsCancelled = function () {
    this.status = 'cancelled';
    return this.save();
};

purchaseSchema.methods.partialReceive = function (receivedItems) {
    this.receivingStatus = 'partial';
    this.status = 'received';

    // Update received quantities in items array
    receivedItems.forEach(receivedItem => {
        const item = this.items.id(receivedItem.itemId);
        if (item) {
            item.receivedQuantity = Math.min(receivedItem.quantity, item.quantity);
            item.pendingQuantity = Math.max(0, item.quantity - item.receivedQuantity);
        }
    });

    // Check if all items are fully received
    const allReceived = this.items.every(item => item.receivedQuantity >= item.quantity);
    if (allReceived) {
        this.receivingStatus = 'complete';
    }

    return this.save();
};

// STATIC METHODS (MATCHING SALE MODEL + PURCHASE-SPECIFIC)
purchaseSchema.statics.getTodaysPurchases = function (companyId) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    return this.find({
        companyId,
        purchaseDate: { $gte: startOfDay, $lt: endOfDay },
        status: { $ne: 'cancelled' }
    });
};

purchaseSchema.statics.getOverduePurchases = function (companyId) {
    const today = new Date();
    return this.find({
        companyId,
        'payment.status': { $in: ['pending', 'partial', 'overdue'] },
        'payment.dueDate': { $lt: today },
        'payment.pendingAmount': { $gt: 0 },
        status: { $ne: 'cancelled' }
    }).populate('supplier', 'name mobile email');
};

purchaseSchema.statics.getPurchasesDueToday = function (companyId) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    return this.find({
        companyId,
        'payment.status': { $in: ['pending', 'partial'] },
        'payment.dueDate': { $gte: startOfDay, $lt: endOfDay },
        'payment.pendingAmount': { $gt: 0 },
        status: { $ne: 'cancelled' }
    }).populate('supplier', 'name mobile email');
};

purchaseSchema.statics.getPendingPurchases = function (companyId) {
    return this.find({
        companyId,
        'payment.status': { $in: ['pending', 'partial'] },
        status: { $ne: 'cancelled' }
    });
};

purchaseSchema.statics.getPurchasesBySupplier = function (companyId, supplierId) {
    return this.find({
        companyId,
        supplier: supplierId,
        status: { $ne: 'cancelled' }
    }).sort({ purchaseDate: -1 });
};

purchaseSchema.statics.getPurchasesByDateRange = function (companyId, startDate, endDate) {
    return this.find({
        companyId,
        purchaseDate: { $gte: startDate, $lte: endDate },
        status: { $ne: 'cancelled' }
    }).sort({ purchaseDate: -1 });
};

purchaseSchema.statics.getPaymentSummaryWithOverdue = function (companyId, dateFrom, dateTo) {
    const matchFilter = { companyId, status: { $ne: 'cancelled' } };

    if (dateFrom || dateTo) {
        matchFilter.purchaseDate = {};
        if (dateFrom) matchFilter.purchaseDate.$gte = new Date(dateFrom);
        if (dateTo) matchFilter.purchaseDate.$lte = new Date(dateTo);
    }

    return this.aggregate([
        { $match: matchFilter },
        {
            $addFields: {
                isOverdue: {
                    $and: [
                        { $gt: ['$payment.pendingAmount', 0] },
                        { $ne: ['$payment.dueDate', null] },
                        { $lt: ['$payment.dueDate', new Date()] }
                    ]
                }
            }
        },
        {
            $group: {
                _id: null,
                totalPurchases: { $sum: '$totals.finalTotal' },
                totalPaid: { $sum: '$payment.paidAmount' },
                totalPending: { $sum: '$payment.pendingAmount' },
                totalOverdue: {
                    $sum: {
                        $cond: ['$isOverdue', '$payment.pendingAmount', 0]
                    }
                },
                overdueCount: {
                    $sum: {
                        $cond: ['$isOverdue', 1, 0]
                    }
                },
                paymentBreakdown: {
                    $push: {
                        status: '$payment.status',
                        amount: '$payment.pendingAmount',
                        isOverdue: '$isOverdue'
                    }
                }
            }
        }
    ]);
};

// Aggregation methods
purchaseSchema.statics.getPurchaseSummary = function (companyId, startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                companyId: mongoose.Types.ObjectId(companyId),
                purchaseDate: { $gte: startDate, $lte: endDate },
                status: { $ne: 'cancelled' }
            }
        },
        {
            $group: {
                _id: null,
                totalPurchases: { $sum: 1 },
                totalAmount: { $sum: '$totals.finalTotal' },
                totalPaid: { $sum: '$payment.paidAmount' },
                totalPending: { $sum: '$payment.pendingAmount' },
                avgPurchaseValue: { $avg: '$totals.finalTotal' },
                totalTax: { $sum: '$totals.totalTax' },
                totalDiscount: { $sum: '$totals.totalDiscount' }
            }
        }
    ]);
};

module.exports = mongoose.model('Purchase', purchaseSchema);