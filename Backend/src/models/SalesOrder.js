const mongoose = require('mongoose');

// Payment History Schema (shared with Sale model)
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

// Sales Order Schema
const salesOrderSchema = new mongoose.Schema({
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
        enum: ['quotation', 'sales_order', 'proforma_invoice'],
        default: 'quotation',
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

    // Customer Information
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Party',
        required: true,
        index: true
    },
    customerMobile: {
        type: String,
        trim: true
    },

    // ✅ UPDATED: GST and Tax Settings (aligned with Sale model)
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

    // ✅ UPDATED: Sales Items Array (aligned with frontend structure)
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

        // Item Details
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

        // Pricing Details
        pricePerUnit: {
            type: Number,
            required: true,
            min: 0
        },
        price: {
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

        // Stock Info
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

        // Calculated amounts
        subtotal: { type: Number, default: 0, min: 0 },
        taxableAmount: { type: Number, default: 0, min: 0 },
        totalTaxAmount: { type: Number, default: 0, min: 0 },
        gstAmount: { type: Number, default: 0, min: 0 },

        // Final amounts
        amount: { type: Number, default: 0, min: 0 },
        itemAmount: { type: Number, required: true, min: 0 },
        totalAmount: { type: Number, default: 0, min: 0 },

        // Line ordering
        lineNumber: { type: Number, required: true, min: 1 }
    }],

    // Totals Section (identical to Sale model)
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
        advanceAmount: { type: Number, default: 0, min: 0 }, // Initial payment
        paymentDate: { type: Date, default: Date.now },
        dueDate: { type: Date, default: null, index: true },
        creditDays: { type: Number, default: 0, min: 0 },
        reference: { type: String, trim: true, default: '' },
        notes: { type: String, trim: true, default: '' }
    },

    // Payment History
    paymentHistory: [paymentHistorySchema],

    // Order Status Management
    status: {
        type: String,
        enum: ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted', 'cancelled'],
        default: 'draft',
        index: true
    },

    // Conversion tracking
    convertedToInvoice: {
        type: Boolean,
        default: false,
        index: true
    },
    invoiceRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sale',
        default: null
    },
    invoiceNumber: {
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

    // Additional Information
    notes: { type: String, trim: true, default: '' },
    termsAndConditions: { type: String, trim: true, default: '' },
    customerNotes: { type: String, trim: true, default: '' },

    // Metadata
    createdBy: { type: String, default: 'system' },
    lastModifiedBy: { type: String, default: 'system' }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// INDEXES
salesOrderSchema.index({ companyId: 1, orderNumber: 1 }, { unique: true });
salesOrderSchema.index({ companyId: 1, customer: 1 });
salesOrderSchema.index({ companyId: 1, orderDate: 1 });
salesOrderSchema.index({ companyId: 1, status: 1 });
salesOrderSchema.index({ companyId: 1, validUntil: 1 });
salesOrderSchema.index({ 'payment.status': 1 });
salesOrderSchema.index({ 'payment.dueDate': 1 });

// VIRTUAL FIELDS
salesOrderSchema.virtual('balanceAmount').get(function () {
    const total = this.totals?.finalTotal || 0;
    const paid = this.payment?.paidAmount || 0;
    return Math.max(0, total - paid);
});

salesOrderSchema.virtual('isExpired').get(function () {
    if (!this.validUntil) return false;
    return new Date() > this.validUntil;
});

salesOrderSchema.virtual('isOverdue').get(function () {
    if (!this.payment?.dueDate || this.payment?.pendingAmount <= 0) return false;
    return new Date() > this.payment.dueDate;
});

// ✅ UPDATED: Pre-save middleware with better field mapping
salesOrderSchema.pre('save', function (next) {
    // Auto-generate order number if not provided
    if (this.isNew && !this.orderNumber) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const prefix = this.orderType === 'quotation' ? 'QUO' :
            this.orderType === 'sales_order' ? 'SO' : 'PI';

        this.orderNumber = `${prefix}-${year}${month}${day}-${Date.now().toString().slice(-4)}`;
    }

    // ✅ UPDATED: Sync GST type and tax mode fields
    if (this.gstType) {
        this.gstEnabled = this.gstType === 'gst';
    }

    if (this.taxMode) {
        this.priceIncludesTax = this.taxMode === 'with-tax';
    }

    // ✅ UPDATED: Process items with better field mapping
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
salesOrderSchema.methods.addPayment = function (amount, method = 'cash', reference = '', notes = '') {
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

// ✅ COMPLETELY REWRITTEN: convertToInvoice method with proper field mapping
salesOrderSchema.methods.convertToInvoice = async function () {
    if (this.convertedToInvoice) {
        throw new Error('Order already converted to invoice');
    }

    try {
        // Import Sale model dynamically to avoid circular dependency
        const Sale = mongoose.model('Sale');

        // ✅ IMPROVED: Generate invoice number with proper sequence
        const generateInvoiceNumber = async (companyId) => {
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');

            const dateStr = `${year}${month}${day}`;
            const prefix = `INV-${dateStr}-`;

            // Find the last invoice for today
            const lastInvoice = await Sale.findOne({
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

        const invoiceNumber = await generateInvoiceNumber(this.companyId);

        // ✅ IMPROVED: Map items with proper field conversion
        const convertedItems = this.items.map(item => {
            const itemObj = item.toObject ? item.toObject() : { ...item };

            // Remove the _id to create new item
            delete itemObj._id;

            // ✅ PROPER FIELD MAPPING: Map SalesOrder fields to Sale fields
            return {
                // Core item info
                itemRef: itemObj.itemRef,
                itemName: itemObj.itemName || itemObj.productName,
                itemCode: itemObj.itemCode || itemObj.productCode,
                hsnCode: itemObj.hsnCode || itemObj.hsnNumber || '0000',
                description: itemObj.description || '',
                category: itemObj.category || '',

                // Quantity and unit
                quantity: itemObj.quantity,
                unit: itemObj.unit === 'pcs' ? 'PCS' : itemObj.unit,

                // Pricing
                pricePerUnit: itemObj.pricePerUnit || itemObj.price,
                taxRate: itemObj.taxRate || itemObj.gstRate || 18,

                // Tax mode conversion
                taxMode: itemObj.gstMode === 'include' ? 'with-tax' : 'without-tax',
                priceIncludesTax: itemObj.gstMode === 'include',

                // Discount
                discountPercent: itemObj.discountPercent || 0,
                discountAmount: itemObj.discountAmount || 0,

                // Tax amounts
                cgst: itemObj.cgst || 0,
                sgst: itemObj.sgst || 0,
                igst: itemObj.igst || 0,
                cgstAmount: itemObj.cgstAmount || 0,
                sgstAmount: itemObj.sgstAmount || 0,
                igstAmount: itemObj.igstAmount || 0,

                // Calculated amounts
                taxableAmount: itemObj.taxableAmount || itemObj.subtotal || 0,
                totalTaxAmount: itemObj.totalTaxAmount || itemObj.gstAmount || 0,

                // Final amount
                amount: itemObj.amount || itemObj.totalAmount || itemObj.itemAmount,
                itemAmount: itemObj.itemAmount || itemObj.totalAmount || itemObj.amount,

                // Line number
                lineNumber: itemObj.lineNumber
            };
        });

        // ✅ IMPROVED: Create invoice data with proper field mapping
        const invoiceData = {
            // Basic invoice info
            invoiceNumber: invoiceNumber,
            invoiceDate: new Date(),
            invoiceType: this.gstEnabled ? 'gst' : 'non-gst',

            // Customer info
            customer: this.customer,
            customerMobile: this.customerMobile,

            // Tax settings
            gstEnabled: this.gstEnabled,
            taxMode: this.taxMode,
            priceIncludesTax: this.priceIncludesTax,
            companyId: this.companyId,

            // Items
            items: convertedItems,

            // Totals
            totals: {
                subtotal: this.totals?.subtotal || 0,
                totalQuantity: this.totals?.totalQuantity || 0,
                totalDiscount: this.totals?.totalDiscount || 0,
                totalDiscountAmount: this.totals?.totalDiscountAmount || 0,
                totalTax: this.totals?.totalTax || 0,
                totalCGST: this.totals?.totalCGST || 0,
                totalSGST: this.totals?.totalSGST || 0,
                totalIGST: this.totals?.totalIGST || 0,
                totalTaxableAmount: this.totals?.totalTaxableAmount || 0,
                finalTotal: this.totals?.finalTotal || 0,
                roundOff: this.totals?.roundOff || 0,
                withTaxTotal: this.totals?.withTaxTotal || 0,
                withoutTaxTotal: this.totals?.withoutTaxTotal || 0
            },

            // ✅ IMPROVED: Payment info with advance transfer
            payment: {
                method: this.payment?.method || 'credit',
                status: (this.payment?.advanceAmount || 0) >= (this.totals?.finalTotal || 0) ? 'paid' :
                    (this.payment?.advanceAmount || 0) > 0 ? 'partial' : 'pending',
                paidAmount: this.payment?.advanceAmount || 0,
                pendingAmount: Math.max(0, (this.totals?.finalTotal || 0) - (this.payment?.advanceAmount || 0)),
                paymentDate: this.payment?.paymentDate || new Date(),
                dueDate: this.payment?.dueDate,
                creditDays: this.payment?.creditDays || 0,
                reference: this.payment?.reference || `Converted from ${this.orderType} ${this.orderNumber}`,
                notes: this.payment?.notes || `Converted from ${this.orderType} ${this.orderNumber}`
            },

            // Additional fields
            notes: this.notes || `Converted from ${this.orderType} ${this.orderNumber}`,
            termsAndConditions: this.termsAndConditions || '',

            // Status
            status: 'active', // Use valid Sale model status

            // Metadata
            createdBy: this.convertedBy || 'system',
            lastModifiedBy: this.convertedBy || 'system'
        };

        console.log('🔄 Creating invoice from sales order:', {
            orderId: this._id,
            orderNumber: this.orderNumber,
            invoiceNumber: invoiceNumber,
            itemsCount: convertedItems.length,
            finalTotal: this.totals?.finalTotal
        });

        // Create the invoice
        const invoice = new Sale(invoiceData);
        await invoice.save();

        console.log('✅ Invoice created successfully:', {
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber
        });

        // Update this sales order
        this.convertedToInvoice = true;
        this.invoiceRef = invoice._id;
        this.invoiceNumber = invoice.invoiceNumber;
        this.convertedAt = new Date();
        this.status = 'converted';
        this.convertedBy = 'system';

        await this.save();

        console.log('✅ Sales order updated with conversion info');

        return invoice;

    } catch (error) {
        console.error('❌ Error converting sales order to invoice:', error);
        throw new Error(`Failed to convert order to invoice: ${error.message}`);
    }
};

salesOrderSchema.methods.markAsAccepted = function () {
    this.status = 'accepted';
    return this.save();
};

salesOrderSchema.methods.markAsRejected = function () {
    this.status = 'rejected';
    return this.save();
};

salesOrderSchema.methods.setDueDate = function (creditDays) {
    if (!creditDays || creditDays <= 0) return this;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parseInt(creditDays));

    this.payment.dueDate = dueDate;
    this.payment.creditDays = parseInt(creditDays);

    return this;
};

// STATIC METHODS
salesOrderSchema.statics.getPendingOrders = function (companyId) {
    return this.find({
        companyId,
        status: { $in: ['draft', 'sent', 'accepted'] },
        convertedToInvoice: false
    }).populate('customer', 'name mobile email');
};

salesOrderSchema.statics.getExpiredOrders = function (companyId) {
    return this.find({
        companyId,
        validUntil: { $lt: new Date() },
        status: { $nin: ['converted', 'cancelled', 'expired'] }
    }).populate('customer', 'name mobile email');
};

salesOrderSchema.statics.getOrdersByCustomer = function (customerId) {
    return this.find({
        customer: customerId,
        status: { $ne: 'cancelled' }
    }).sort({ orderDate: -1 });
};

module.exports = mongoose.model('SalesOrder', salesOrderSchema);