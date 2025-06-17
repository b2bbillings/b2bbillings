const mongoose = require('mongoose');

// Payment History Schema (shared with Purchase and Sale models)
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

// Purchase Order Schema
const purchaseOrderSchema = new mongoose.Schema({
    // Order Details
    orderNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    orderDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    orderType: {
        type: String,
        enum: ['purchase_order', 'purchase_quotation', 'proforma_purchase'],
        default: 'purchase_order',
        required: true
    },

    // Validity and Delivery
    validUntil: {
        type: Date,
        default: null
    },
    expectedDeliveryDate: {
        type: Date,
        default: null
    },
    deliveryDate: {
        type: Date,
        default: null
    },

    // Supplier Information (using Party model like customer)
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

    // ✅ ADDED: Complete GST and Tax Settings (aligned with SalesOrder model)
    gstEnabled: {
        type: Boolean,
        required: true,
        default: true
    },
    gstType: {
        type: String,
        enum: ['gst', 'non-gst'],
        default: 'gst'
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

    // ✅ ENHANCED: Purchase Items Array with all frontend-compatible fields
    items: [{
        // Item Reference
        itemRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item',
            sparse: true
        },
        selectedProduct: {
            type: String,
            default: ''
        },

        // ✅ ADDED: Item Details (both naming conventions for compatibility)
        itemName: {
            type: String,
            required: true,
            trim: true
        },
        productName: {
            type: String,
            trim: true
        },
        itemCode: {
            type: String,
            trim: true,
            default: ''
        },
        productCode: {
            type: String,
            trim: true,
            default: ''
        },
        description: {
            type: String,
            trim: true,
            default: ''
        },
        hsnCode: {
            type: String,
            trim: true,
            default: '0000'
        },
        hsnNumber: {
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
            enum: ['NONE', 'KG', 'GM', 'LTR', 'ML', 'PCS', 'BOX', 'M', 'CM', 'BAG', 'BTL', 'BUN', 'CAN', 'CTN', 'DOZ', 'DRM', 'FEW', 'GMS', 'GRS', 'KGS', 'KME', 'MLS', 'MTR', 'NOS', 'PAC', 'QTL', 'ROL', 'SET', 'SQF', 'SQM', 'TBS', 'TGM', 'THD', 'TON', 'TUB', 'UGS', 'UNT', 'YDS', 'OTH', 'pcs'],
            default: 'PCS'
        },

        // ✅ ADDED: Enhanced Pricing Details (multiple naming conventions)
        pricePerUnit: {
            type: Number,
            required: true,
            min: 0
        },
        price: {
            type: Number,
            min: 0
        },
        purchasePrice: {
            type: Number,
            min: 0
        },
        sellingPrice: {
            type: Number,
            min: 0
        },
        taxRate: {
            type: Number,
            default: 18,
            min: 0,
            max: 100
        },
        gstRate: {
            type: Number,
            default: 18,
            min: 0,
            max: 100
        },
        taxMode: {
            type: String,
            enum: ['with-tax', 'without-tax', 'include', 'exclude'],
            default: 'without-tax'
        },
        gstMode: {
            type: String,
            enum: ['include', 'exclude'],
            default: 'exclude'
        },
        priceIncludesTax: {
            type: Boolean,
            default: false
        },

        // ✅ ADDED: Stock Info
        availableStock: {
            type: Number,
            default: 0
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

        // Tax Amounts
        cgst: { type: Number, default: 0, min: 0 },
        sgst: { type: Number, default: 0, min: 0 },
        igst: { type: Number, default: 0, min: 0 },
        cgstAmount: { type: Number, default: 0, min: 0 },
        sgstAmount: { type: Number, default: 0, min: 0 },
        igstAmount: { type: Number, default: 0, min: 0 },

        // ✅ ADDED: Calculated amounts (multiple naming conventions)
        subtotal: { type: Number, default: 0, min: 0 },
        taxableAmount: { type: Number, default: 0, min: 0 },
        totalTaxAmount: { type: Number, default: 0, min: 0 },
        gstAmount: { type: Number, default: 0, min: 0 },

        // ✅ ADDED: Final amounts (multiple naming conventions)
        amount: { type: Number, default: 0, min: 0 },
        itemAmount: { type: Number, required: true, min: 0 },
        totalAmount: { type: Number, default: 0, min: 0 },

        // Line ordering
        lineNumber: { type: Number, required: true, min: 1 }
    }],

    // Totals Section (identical to Sale/SalesOrder model)
    totals: {
        subtotal: { type: Number, required: true, default: 0 },
        totalQuantity: { type: Number, default: 0 },
        totalDiscount: { type: Number, default: 0 },
        totalDiscountAmount: { type: Number, default: 0 },
        totalTax: { type: Number, default: 0 },
        totalCGST: { type: Number, default: 0 },
        totalSGST: { type: Number, default: 0 },
        totalIGST: { type: Number, default: 0 },
        totalTaxableAmount: { type: Number, default: 0 },
        finalTotal: { type: Number, required: true, min: 0 },
        roundOff: { type: Number, default: 0 },
        withTaxTotal: { type: Number, default: 0 },
        withoutTaxTotal: { type: Number, default: 0 }
    },

    // Payment Information (enhanced for partial payments)
    payment: {
        method: {
            type: String,
            enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'credit', 'online', 'bank'],
            default: 'cash'
        },
        status: {
            type: String,
            enum: ['pending', 'partial', 'paid', 'cancelled', 'overdue'],
            default: 'pending'
        },
        paidAmount: { type: Number, default: 0, min: 0 },
        pendingAmount: { type: Number, default: 0, min: 0 },
        advanceAmount: { type: Number, default: 0, min: 0 }, // Advance payment to supplier
        paymentDate: { type: Date, default: Date.now },
        dueDate: { type: Date, default: null, index: true },
        creditDays: { type: Number, default: 0, min: 0 },
        reference: { type: String, trim: true, default: '' },
        notes: { type: String, trim: true, default: '' }
    },

    // Payment History
    paymentHistory: [paymentHistorySchema],

    // Order Status Management (Purchase-specific statuses)
    status: {
        type: String,
        enum: ['draft', 'sent', 'confirmed', 'received', 'partially_received', 'cancelled', 'completed'],
        default: 'draft',
        index: true
    },

    // Conversion tracking (Purchase Order → Purchase Invoice)
    convertedToPurchaseInvoice: {
        type: Boolean,
        default: false,
        index: true
    },
    purchaseInvoiceRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Purchase', // Assuming you have a Purchase model
        default: null
    },
    purchaseInvoiceNumber: {
        type: String,
        default: null
    },
    convertedAt: {
        type: Date,
        default: null
    },
    convertedBy: {
        type: String,
        default: null
    },

    // Priority and urgency
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },

    // Purchase-specific fields
    requiredBy: {
        type: Date,
        default: null
    },
    departmentRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        default: null
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    approvedAt: {
        type: Date,
        default: null
    },

    // Additional Information
    notes: { type: String, trim: true, default: '' },
    termsAndConditions: { type: String, trim: true, default: '' },
    supplierNotes: { type: String, trim: true, default: '' },
    internalNotes: { type: String, trim: true, default: '' },

    // Shipping and Delivery
    shippingAddress: {
        street: { type: String, trim: true, default: '' },
        city: { type: String, trim: true, default: '' },
        state: { type: String, trim: true, default: '' },
        zipCode: { type: String, trim: true, default: '' },
        country: { type: String, trim: true, default: 'India' }
    },

    // Metadata
    createdBy: { type: String, default: 'system' },
    lastModifiedBy: { type: String, default: 'system' }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// INDEXES
purchaseOrderSchema.index({ companyId: 1, orderNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ companyId: 1, supplier: 1 });
purchaseOrderSchema.index({ companyId: 1, orderDate: 1 });
purchaseOrderSchema.index({ companyId: 1, status: 1 });
purchaseOrderSchema.index({ companyId: 1, validUntil: 1 });
purchaseOrderSchema.index({ 'payment.status': 1 });
purchaseOrderSchema.index({ 'payment.dueDate': 1 });
purchaseOrderSchema.index({ requiredBy: 1 });

// VIRTUAL FIELDS
purchaseOrderSchema.virtual('balanceAmount').get(function () {
    const total = this.totals?.finalTotal || 0;
    const paid = this.payment?.paidAmount || 0;
    return Math.max(0, total - paid);
});

purchaseOrderSchema.virtual('isExpired').get(function () {
    if (!this.validUntil) return false;
    return new Date() > this.validUntil;
});

purchaseOrderSchema.virtual('isOverdue').get(function () {
    if (!this.payment?.dueDate || this.payment?.pendingAmount <= 0) return false;
    return new Date() > this.payment.dueDate;
});

purchaseOrderSchema.virtual('isRequiredDatePassed').get(function () {
    if (!this.requiredBy) return false;
    return new Date() > this.requiredBy;
});

// ✅ ENHANCED: PRE-SAVE MIDDLEWARE with field synchronization
purchaseOrderSchema.pre('save', function (next) {
    // Auto-generate order number if not provided
    if (this.isNew && !this.orderNumber) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const prefix = this.orderType === 'purchase_quotation' ? 'PQU' :
            this.orderType === 'proforma_purchase' ? 'PPO' : 'PO';

        this.orderNumber = `${prefix}-${year}${month}${day}-${Date.now().toString().slice(-4)}`;
    }

    // ✅ ADDED: Sync GST type and tax mode fields
    if (this.gstType) {
        this.gstEnabled = this.gstType === 'gst';
    }

    if (this.taxMode) {
        this.priceIncludesTax = this.taxMode === 'with-tax';
    }

    // ✅ ENHANCED: Process items with field synchronization
    this.items.forEach((item, index) => {
        if (!item.lineNumber) item.lineNumber = index + 1;

        // Sync product/item names
        if (item.productName && !item.itemName) {
            item.itemName = item.productName;
        }
        if (item.itemName && !item.productName) {
            item.productName = item.itemName;
        }

        // Sync product/item codes
        if (item.productCode && !item.itemCode) {
            item.itemCode = item.productCode;
        }
        if (item.itemCode && !item.productCode) {
            item.productCode = item.itemCode;
        }

        // Sync HSN numbers
        if (item.hsnNumber && !item.hsnCode) {
            item.hsnCode = item.hsnNumber;
        }
        if (item.hsnCode && !item.hsnNumber) {
            item.hsnNumber = item.hsnCode;
        }

        // Sync prices
        if (item.price && !item.pricePerUnit) {
            item.pricePerUnit = item.price;
        }
        if (item.pricePerUnit && !item.price) {
            item.price = item.pricePerUnit;
        }

        // Sync GST rates
        if (item.gstRate && !item.taxRate) {
            item.taxRate = item.gstRate;
        }
        if (item.taxRate && !item.gstRate) {
            item.gstRate = item.taxRate;
        }

        // Sync GST modes
        if (item.gstMode) {
            item.taxMode = item.gstMode === 'include' ? 'with-tax' : 'without-tax';
            item.priceIncludesTax = item.gstMode === 'include';
        }
        if (item.taxMode && !item.gstMode) {
            item.gstMode = item.taxMode === 'with-tax' ? 'include' : 'exclude';
        }

        // Sync item tax mode with parent
        if (!item.taxMode) {
            item.taxMode = this.taxMode || 'without-tax';
            item.priceIncludesTax = item.taxMode === 'with-tax';
        }

        // Sync amounts
        if (item.totalAmount && !item.amount) item.amount = item.totalAmount;
        if (item.amount && !item.totalAmount) item.totalAmount = item.amount;
        if (item.itemAmount && !item.amount) item.amount = item.itemAmount;
        if (item.amount && !item.itemAmount) item.itemAmount = item.amount;

        // Sync tax amounts
        if (item.gstAmount && !item.totalTaxAmount) item.totalTaxAmount = item.gstAmount;
        if (item.totalTaxAmount && !item.gstAmount) item.gstAmount = item.totalTaxAmount;
    });

    // Update payment status
    if (this.payment && this.totals) {
        const paidAmount = this.payment.paidAmount || 0;
        const finalTotal = this.totals.finalTotal || 0;

        this.payment.pendingAmount = Math.max(0, finalTotal - paidAmount);

        if (paidAmount >= finalTotal && finalTotal > 0) {
            this.payment.status = 'paid';
        } else if (paidAmount > 0) {
            this.payment.status = 'partial';
        } else {
            this.payment.status = 'pending';
        }
    }

    next();
});

// INSTANCE METHODS
purchaseOrderSchema.methods.addPayment = function (amount, method = 'cash', reference = '', notes = '') {
    const currentPaid = this.payment?.paidAmount || 0;
    const newPaidAmount = currentPaid + parseFloat(amount);

    this.payment = {
        ...this.payment,
        paidAmount: newPaidAmount,
        method,
        reference,
        paymentDate: new Date(),
        notes
    };

    // Add to payment history
    if (!this.paymentHistory) this.paymentHistory = [];

    this.paymentHistory.push({
        amount: parseFloat(amount),
        method,
        reference,
        paymentDate: new Date(),
        notes,
        createdAt: new Date()
    });

    return this.save();
};

// Convert Purchase Order to Purchase Invoice
purchaseOrderSchema.methods.convertToPurchaseInvoice = async function () {
    if (this.convertedToPurchaseInvoice) {
        throw new Error('Purchase order already converted to invoice');
    }

    try {
        // Import Purchase model (assuming you have one)
        const Purchase = require('./Purchase');

        // Generate purchase invoice number
        const generatePurchaseInvoiceNumber = async (companyId) => {
            const currentYear = new Date().getFullYear();
            const prefix = `PINV-${currentYear}-`;

            const lastInvoice = await Purchase.findOne({
                companyId: companyId,
                invoiceNumber: { $regex: `^${prefix}` }
            }).sort({ invoiceNumber: -1 });

            let nextNumber = 1;
            if (lastInvoice && lastInvoice.invoiceNumber) {
                const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-').pop());
                if (!isNaN(lastNumber)) {
                    nextNumber = lastNumber + 1;
                }
            }

            return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
        };

        const invoiceNumber = await generatePurchaseInvoiceNumber(this.companyId);

        const purchaseInvoiceData = {
            // Basic invoice info
            invoiceNumber: invoiceNumber,
            invoiceDate: new Date(),
            invoiceType: this.gstEnabled ? 'gst' : 'non-gst',

            // Supplier info
            supplier: this.supplier,
            supplierMobile: this.supplierMobile,

            // Tax settings
            gstEnabled: this.gstEnabled,
            gstType: this.gstType,
            taxMode: this.taxMode,
            priceIncludesTax: this.priceIncludesTax,
            companyId: this.companyId,

            // Items - create new items without _id
            items: this.items.map(item => {
                const itemObj = item.toObject ? item.toObject() : { ...item };
                delete itemObj._id;
                return itemObj;
            }),

            // Totals
            totals: this.totals.toObject ? this.totals.toObject() : { ...this.totals },

            // Payment info - transfer advance payments
            payment: {
                method: this.payment?.method || 'Credit',
                status: 'pending',
                paidAmount: this.payment?.advanceAmount || 0,
                pendingAmount: (this.totals?.finalTotal || 0) - (this.payment?.advanceAmount || 0),
                paymentDate: this.payment?.paymentDate || new Date(),
                dueDate: this.payment?.dueDate,
                creditDays: this.payment?.creditDays || 0,
                reference: this.payment?.reference || '',
                notes: this.payment?.notes || ''
            },

            // Additional fields
            notes: this.notes,
            termsAndConditions: this.termsAndConditions,
            status: 'completed',

            // Metadata
            createdBy: 'system',
            lastModifiedBy: 'system'
        };

        // Create the purchase invoice
        const invoice = new Purchase(purchaseInvoiceData);
        await invoice.save();

        // Update this purchase order
        this.convertedToPurchaseInvoice = true;
        this.purchaseInvoiceRef = invoice._id;
        this.purchaseInvoiceNumber = invoice.invoiceNumber;
        this.convertedAt = new Date();
        this.status = 'completed';
        this.convertedBy = 'system';

        await this.save();

        return invoice;

    } catch (error) {
        throw new Error(`Failed to convert purchase order to invoice: ${error.message}`);
    }
};

purchaseOrderSchema.methods.markAsConfirmed = function () {
    this.status = 'confirmed';
    return this.save();
};

purchaseOrderSchema.methods.markAsReceived = function () {
    this.status = 'received';
    this.deliveryDate = new Date();
    return this.save();
};

purchaseOrderSchema.methods.markAsPartiallyReceived = function () {
    this.status = 'partially_received';
    return this.save();
};

purchaseOrderSchema.methods.approve = function (approvedBy) {
    this.approvedBy = approvedBy;
    this.approvedAt = new Date();
    this.status = 'confirmed';
    return this.save();
};

purchaseOrderSchema.methods.setDueDate = function (creditDays) {
    if (!creditDays || creditDays <= 0) return this;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parseInt(creditDays));

    this.payment.dueDate = dueDate;
    this.payment.creditDays = parseInt(creditDays);

    return this;
};

// STATIC METHODS
purchaseOrderSchema.statics.getPendingOrders = function (companyId) {
    return this.find({
        companyId,
        status: { $in: ['draft', 'sent', 'confirmed'] },
        convertedToPurchaseInvoice: false
    }).populate('supplier', 'name mobile email');
};

purchaseOrderSchema.statics.getExpiredOrders = function (companyId) {
    return this.find({
        companyId,
        validUntil: { $lt: new Date() },
        status: { $nin: ['completed', 'cancelled'] }
    }).populate('supplier', 'name mobile email');
};

purchaseOrderSchema.statics.getOrdersBySupplier = function (supplierId) {
    return this.find({
        supplier: supplierId,
        status: { $ne: 'cancelled' }
    }).sort({ orderDate: -1 });
};

purchaseOrderSchema.statics.getOrdersRequiredByDate = function (companyId, date) {
    return this.find({
        companyId,
        requiredBy: { $lte: date },
        status: { $nin: ['completed', 'cancelled', 'received'] }
    }).populate('supplier', 'name mobile email');
};

purchaseOrderSchema.statics.getOrdersAwaitingApproval = function (companyId) {
    return this.find({
        companyId,
        status: 'draft',
        approvedBy: null
    }).populate('supplier', 'name mobile email');
};

// Export the model
module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);