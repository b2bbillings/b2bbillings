const mongoose = require('mongoose');

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

    // GST Settings
    gstEnabled: {
        type: Boolean,
        required: true,
        default: true
    },

    // Company reference
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },

    // Purchase Items Array
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
        hsnCode: {
            type: String,
            trim: true,
            default: '0000'
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
            default: 'NONE'
        },

        // Pricing Details
        pricePerUnit: {
            type: Number,
            required: true,
            min: 0
        },
        taxRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },

        // Discount
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

        // Tax Breakdown (Item Level)
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

        // Final Item Amount
        itemAmount: {
            type: Number,
            required: true,
            min: 0
        },

        // Line Number for ordering
        lineNumber: {
            type: Number,
            required: true,
            min: 1
        }
    }],

    // Simplified Totals
    totals: {
        subtotal: {
            type: Number,
            required: true,
            default: 0
        },
        totalDiscount: {
            type: Number,
            default: 0
        },
        totalTax: {
            type: Number,
            default: 0
        },
        finalTotal: {
            type: Number,
            required: true,
            min: 0
        }
    },

    // Payment Information
    payment: {
        method: {
            type: String,
            enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'credit'],
            default: 'credit'
        },
        status: {
            type: String,
            enum: ['paid', 'pending', 'partial', 'cancelled'],
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
            type: Date
        },
        reference: {
            type: String,
            trim: true
        }
    },

    // Purchase Order Information (if applicable)
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

    // Additional Notes
    notes: {
        type: String,
        trim: true
    },
    termsAndConditions: {
        type: String,
        trim: true
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

// Indexes for better performance
purchaseSchema.index({ companyId: 1, purchaseNumber: 1 }, { unique: true });
purchaseSchema.index({ companyId: 1, supplier: 1 });
purchaseSchema.index({ companyId: 1, purchaseDate: 1 });
purchaseSchema.index({ companyId: 1, status: 1 });
purchaseSchema.index({ companyId: 1, receivingStatus: 1 });

// Virtual for balance amount
purchaseSchema.virtual('balanceAmount').get(function () {
    const total = this.totals?.finalTotal || 0;
    const paid = this.payment?.paidAmount || 0;
    return Math.max(0, total - paid);
});

// Virtual for due status
purchaseSchema.virtual('isDue').get(function () {
    if (!this.payment?.dueDate) return false;
    const today = new Date();
    const dueDate = new Date(this.payment.dueDate);
    return dueDate < today && this.payment.status !== 'paid';
});

// Pre-save middleware to generate purchase number if not provided
purchaseSchema.pre('save', async function (next) {
    if (this.isNew && !this.purchaseNumber) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        // Find the last purchase for today
        const todayStart = new Date(year, date.getMonth(), date.getDate());
        const todayEnd = new Date(year, date.getMonth(), date.getDate() + 1);

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
    }

    next();
});

// Pre-save middleware to calculate totals
purchaseSchema.pre('save', function (next) {
    // Set line numbers
    this.items.forEach((item, index) => {
        if (!item.lineNumber) {
            item.lineNumber = index + 1;
        }
    });

    // Calculate item-level totals
    this.items.forEach(item => {
        const baseAmount = (item.quantity || 0) * (item.pricePerUnit || 0);
        const discountAmount = item.discountAmount || ((baseAmount * (item.discountPercent || 0)) / 100);
        const amountAfterDiscount = baseAmount - discountAmount;

        // Calculate tax amounts if GST enabled
        if (this.gstEnabled && item.taxRate > 0) {
            const totalItemTax = item.cgst + item.sgst + item.igst;
            item.itemAmount = amountAfterDiscount + totalItemTax;
        } else {
            item.itemAmount = amountAfterDiscount;
        }

        // Update discount amount
        item.discountAmount = discountAmount;
    });

    // Calculate purchase totals
    const subtotal = this.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.pricePerUnit || 0)), 0);
    const totalDiscount = this.items.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
    const totalTax = this.items.reduce((sum, item) => sum + (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0), 0);
    const finalTotal = subtotal - totalDiscount + (this.gstEnabled ? totalTax : 0);

    // Update totals
    this.totals = {
        subtotal: parseFloat(subtotal.toFixed(2)),
        totalDiscount: parseFloat(totalDiscount.toFixed(2)),
        totalTax: parseFloat(totalTax.toFixed(2)),
        finalTotal: parseFloat(finalTotal.toFixed(2))
    };

    // Update payment status
    if (this.payment) {
        const paidAmount = this.payment.paidAmount || 0;
        this.payment.pendingAmount = Math.max(0, this.totals.finalTotal - paidAmount);

        if (paidAmount >= this.totals.finalTotal) {
            this.payment.status = 'paid';
        } else if (paidAmount > 0) {
            this.payment.status = 'partial';
        } else {
            this.payment.status = 'pending';
        }
    }

    next();
});

// Methods
purchaseSchema.methods.markAsOrdered = function () {
    this.status = 'ordered';
    return this.save();
};

purchaseSchema.methods.markAsReceived = function () {
    this.status = 'received';
    this.receivedDate = new Date();
    this.receivingStatus = 'complete';
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

purchaseSchema.methods.addPayment = function (amount, method = 'cash', reference = '') {
    const currentPaid = this.payment?.paidAmount || 0;
    const newPaidAmount = currentPaid + amount;

    this.payment = {
        ...this.payment,
        paidAmount: newPaidAmount,
        method,
        reference,
        paymentDate: new Date()
    };

    return this.save();
};

purchaseSchema.methods.partialReceive = function (receivedItems) {
    // Logic for partial receiving of items
    this.receivingStatus = 'partial';
    this.status = 'received';
    // Update received quantities in items array
    receivedItems.forEach(receivedItem => {
        const item = this.items.id(receivedItem.itemId);
        if (item) {
            item.receivedQuantity = receivedItem.quantity;
        }
    });
    return this.save();
};

// Static methods
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

purchaseSchema.statics.getPendingPurchases = function (companyId) {
    return this.find({
        companyId,
        'payment.status': { $in: ['pending', 'partial'] },
        status: { $ne: 'cancelled' }
    });
};

purchaseSchema.statics.getOverduePurchases = function (companyId) {
    const today = new Date();
    return this.find({
        companyId,
        'payment.dueDate': { $lt: today },
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
                avgPurchaseValue: { $avg: '$totals.finalTotal' }
            }
        }
    ]);
};

module.exports = mongoose.model('Purchase', purchaseSchema);