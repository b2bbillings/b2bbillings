const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    itemCode: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        index: true
    },
    hsnNumber: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['product', 'service'],
        default: 'product',
        required: true
    },

    // Category and Classification
    category: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    unit: {
        type: String,
        required: true,
        enum: ['BAG', 'BTL', 'BOX', 'BUN', 'CAN', 'CTN', 'DOZ', 'DRM', 'FEW', 'GMS', 'GRS', 'KGS', 'KME', 'LTR', 'MLS', 'MTR', 'NOS', 'PAC', 'PCS', 'QTL', 'ROL', 'SET', 'SQF', 'SQM', 'TBS', 'TGM', 'THD', 'TON', 'TUB', 'UGS', 'UNT', 'YDS', 'OTH']
    },
    description: {
        type: String,
        trim: true
    },

    // Pricing with Tax Options
    buyPrice: {
        type: Number,
        min: 0,
        default: 0
    },
    buyPriceWithTax: {
        type: Number,
        min: 0,
        default: 0
    },
    buyPriceWithoutTax: {
        type: Number,
        min: 0,
        default: 0
    },
    isBuyPriceTaxInclusive: {
        type: Boolean,
        default: false
    },
    
    salePrice: {
        type: Number,
        min: 0,
        default: 0
    },
    salePriceWithTax: {
        type: Number,
        min: 0,
        default: 0
    },
    salePriceWithoutTax: {
        type: Number,
        min: 0,
        default: 0
    },
    isSalePriceTaxInclusive: {
        type: Boolean,
        default: false
    },
    
    // Special pricing field for "At Price" functionality
    atPrice: {
        type: Number,
        min: 0,
        default: 0
    },
    
    gstRate: {
        type: Number,
        enum: [0, 0.25, 3, 5, 12, 18, 28],
        default: 0
    },

    // Stock Information (only for products)
    currentStock: {
        type: Number,
        default: 0,
        min: 0
    },
    openingStock: {
        type: Number,
        default: 0,
        min: 0
    },
    openingQuantity: { // Alternative name for opening stock
        type: Number,
        default: 0,
        min: 0
    },
    minStockLevel: {
        type: Number,
        default: 0,
        min: 0
    },
    minStockToMaintain: { // Alternative name for minimum stock
        type: Number,
        default: 0,
        min: 0
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

    // Company reference
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },

    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
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
itemSchema.index({ companyId: 1, name: 1 });
itemSchema.index({ companyId: 1, itemCode: 1 });
itemSchema.index({ companyId: 1, category: 1 });
itemSchema.index({ companyId: 1, type: 1 });
itemSchema.index({ companyId: 1, isActive: 1 });

// Compound unique index to prevent duplicate item codes within a company
itemSchema.index({ companyId: 1, itemCode: 1 }, { unique: true, sparse: true });

// Virtual for stock status
itemSchema.virtual('stockStatus').get(function () {
    if (this.type === 'service') return 'N/A';
    if (this.currentStock === 0) return 'Out of Stock';
    if (this.currentStock <= (this.minStockLevel || this.minStockToMaintain || 0)) return 'Low Stock';
    return 'In Stock';
});

// Virtual for stock health
itemSchema.virtual('stockHealth').get(function () {
    if (this.type === 'service') return 'good';
    if (this.currentStock === 0) return 'critical';
    if (this.currentStock <= (this.minStockLevel || this.minStockToMaintain || 0)) return 'warning';
    return 'good';
});

// Virtual for profit margin
itemSchema.virtual('profitMargin').get(function() {
    const buy = this.buyPriceWithoutTax || this.buyPrice || 0;
    const sale = this.salePriceWithoutTax || this.salePrice || 0;
    
    if (buy <= 0 || sale <= 0) return 0;
    return ((sale - buy) / buy * 100).toFixed(2);
});

// Pre-save middleware to calculate tax-inclusive/exclusive prices
itemSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    
    // Calculate buy prices with/without tax
    if (this.buyPrice && this.gstRate) {
        if (this.isBuyPriceTaxInclusive) {
            this.buyPriceWithTax = this.buyPrice;
            this.buyPriceWithoutTax = this.buyPrice / (1 + this.gstRate / 100);
        } else {
            this.buyPriceWithoutTax = this.buyPrice;
            this.buyPriceWithTax = this.buyPrice * (1 + this.gstRate / 100);
        }
    }
    
    // Calculate sale prices with/without tax
    if (this.salePrice && this.gstRate) {
        if (this.isSalePriceTaxInclusive) {
            this.salePriceWithTax = this.salePrice;
            this.salePriceWithoutTax = this.salePrice / (1 + this.gstRate / 100);
        } else {
            this.salePriceWithoutTax = this.salePrice;
            this.salePriceWithTax = this.salePrice * (1 + this.gstRate / 100);
        }
    }
    
    // Sync alternative field names
    if (this.openingStock !== undefined) {
        this.openingQuantity = this.openingStock;
    }
    if (this.minStockLevel !== undefined) {
        this.minStockToMaintain = this.minStockLevel;
    }
    
    next();
});

// Pre-save middleware to generate item code if not provided
itemSchema.pre('save', function (next) {
    if (!this.itemCode && this.name && this.category) {
        const namePrefix = this.name.substring(0, 3).toUpperCase();
        const categoryPrefix = this.category.substring(0, 3).toUpperCase();
        const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.itemCode = `${namePrefix}-${categoryPrefix}-${randomNum}`;
    }
    next();
});

module.exports = mongoose.model('Item', itemSchema);