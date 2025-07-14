const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    itemCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    hsnNumber: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["product", "service"],
      default: "product",
      required: true,
    },

    // Category and Classification
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    unit: {
      type: String,
      required: true,
      enum: [
        "BAG",
        "BTL",
        "BOX",
        "BUN",
        "CAN",
        "CTN",
        "DOZ",
        "DRM",
        "FEW",
        "GMS",
        "GRS",
        "KGS",
        "KME",
        "LTR",
        "MLS",
        "MTR",
        "NOS",
        "PAC",
        "PCS",
        "QTL",
        "ROL",
        "SET",
        "SQF",
        "SQM",
        "TBS",
        "TGM",
        "THD",
        "TON",
        "TUB",
        "UGS",
        "UNT",
        "YDS",
        "OTH",
      ],
    },
    description: {
      type: String,
      trim: true,
    },

    // ✅ NEW: Name Verification System
    nameVerification: {
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
        index: true,
      },
      originalName: {
        type: String,
        required: true,
        trim: true,
      },
      verifiedName: {
        type: String,
        default: null,
        trim: true,
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        default: null,
      },
      verificationDate: {
        type: Date,
        default: null,
      },
      rejectionReason: {
        type: String,
        default: null,
        trim: true,
      },
      verificationHistory: [
        {
          action: {
            type: String,
            enum: ["submitted", "approved", "rejected", "resubmitted"],
            required: true,
          },
          oldName: {
            type: String,
            trim: true,
          },
          newName: {
            type: String,
            trim: true,
          },
          adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
          },
          date: {
            type: Date,
            default: Date.now,
          },
          reason: {
            type: String,
            trim: true,
          },
        },
      ],
    },

    // Pricing with Tax Options
    buyPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    buyPriceWithTax: {
      type: Number,
      min: 0,
      default: 0,
    },
    buyPriceWithoutTax: {
      type: Number,
      min: 0,
      default: 0,
    },
    isBuyPriceTaxInclusive: {
      type: Boolean,
      default: false,
    },

    salePrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    salePriceWithTax: {
      type: Number,
      min: 0,
      default: 0,
    },
    salePriceWithoutTax: {
      type: Number,
      min: 0,
      default: 0,
    },
    isSalePriceTaxInclusive: {
      type: Boolean,
      default: false,
    },

    // Special pricing field for "At Price" functionality
    atPrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    gstRate: {
      type: Number,
      enum: [0, 0.25, 3, 5, 12, 18, 28],
      default: 0,
    },

    // Stock Information (only for products)
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    openingStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    openingQuantity: {
      // Alternative name for opening stock
      type: Number,
      default: 0,
      min: 0,
    },
    minStockLevel: {
      type: Number,
      default: 0,
      min: 0,
    },
    minStockToMaintain: {
      // Alternative name for minimum stock
      type: Number,
      default: 0,
      min: 0,
    },
    asOfDate: {
      type: Date,
      default: Date.now,
    },

    // Stock History for tracking all stock changes
    stockHistory: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        previousStock: {
          type: Number,
          default: 0,
        },
        newStock: {
          type: Number,
          default: 0,
        },
        quantity: {
          type: Number,
          required: true,
        },
        adjustmentType: {
          type: String,
          enum: ["add", "subtract", "set"],
          required: true,
        },
        reason: {
          type: String,
          trim: true,
        },
        adjustedBy: {
          type: String,
          default: "system",
        },
        adjustedAt: {
          type: Date,
          default: Date.now,
        },
        referenceId: {
          type: mongoose.Schema.Types.ObjectId,
          // Reference to Sale, Purchase, or other transaction
        },
        referenceType: {
          type: String,
          enum: [
            "sale",
            "purchase",
            "adjustment",
            "opening",
            "return",
            "manual_adjustment",
          ],
        },
      },
    ],

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Company reference
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // Metadata
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: String,
      default: "system",
    },
    lastModifiedBy: {
      type: String,
      default: "system",
    },
  },
  {
    timestamps: true,
    toJSON: {virtuals: true},
    toObject: {virtuals: true},
  }
);

// Indexes for better performance
itemSchema.index({companyId: 1, name: 1});
itemSchema.index({companyId: 1, itemCode: 1});
itemSchema.index({companyId: 1, category: 1});
itemSchema.index({companyId: 1, type: 1});
itemSchema.index({companyId: 1, isActive: 1});
itemSchema.index({"stockHistory.date": -1}); // Index for stock history queries

// ✅ NEW: Indexes for name verification
itemSchema.index({"nameVerification.status": 1});
itemSchema.index({"nameVerification.verificationDate": -1});
itemSchema.index({companyId: 1, "nameVerification.status": 1});

// Compound unique index to prevent duplicate item codes within a company
itemSchema.index({companyId: 1, itemCode: 1}, {unique: true, sparse: true});

// ✅ NEW: Virtual for display name (shows verified name if approved, otherwise original)
itemSchema.virtual("displayName").get(function () {
  if (this.nameVerification) {
    switch (this.nameVerification.status) {
      case "approved":
        return (
          this.nameVerification.verifiedName ||
          this.nameVerification.originalName
        );
      case "pending":
      case "rejected":
        return this.nameVerification.originalName;
      default:
        return this.name;
    }
  }
  return this.name;
});

// ✅ NEW: Virtual for verification status badge
itemSchema.virtual("verificationStatusBadge").get(function () {
  if (!this.nameVerification) return null;

  switch (this.nameVerification.status) {
    case "pending":
      return {
        text: "PENDING VERIFICATION",
        color: "warning",
        variant: "warning",
      };
    case "approved":
      return {
        text: "VERIFIED",
        color: "success",
        variant: "success",
      };
    case "rejected":
      return {
        text: "REJECTED",
        color: "danger",
        variant: "danger",
      };
    default:
      return null;
  }
});

// Virtual for stock status
itemSchema.virtual("stockStatus").get(function () {
  if (this.type === "service") return "N/A";
  if (this.currentStock === 0) return "Out of Stock";
  if (this.currentStock <= (this.minStockLevel || this.minStockToMaintain || 0))
    return "Low Stock";
  return "In Stock";
});

// Virtual for stock health
itemSchema.virtual("stockHealth").get(function () {
  if (this.type === "service") return "good";
  if (this.currentStock === 0) return "critical";
  if (this.currentStock <= (this.minStockLevel || this.minStockToMaintain || 0))
    return "warning";
  return "good";
});

// Virtual for profit margin
itemSchema.virtual("profitMargin").get(function () {
  const buy = this.buyPriceWithoutTax || this.buyPrice || 0;
  const sale = this.salePriceWithoutTax || this.salePrice || 0;

  if (buy <= 0 || sale <= 0) return 0;
  return (((sale - buy) / buy) * 100).toFixed(2);
});

// Virtual for latest stock movement
itemSchema.virtual("latestStockMovement").get(function () {
  if (!this.stockHistory || this.stockHistory.length === 0) return null;

  return this.stockHistory.sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  )[0];
});

// Virtual for total stock movements
itemSchema.virtual("totalStockMovements").get(function () {
  return this.stockHistory ? this.stockHistory.length : 0;
});

// ✅ NEW: Virtual for days since submission
itemSchema.virtual("daysSinceSubmission").get(function () {
  if (!this.nameVerification || !this.createdAt) return 0;

  const now = new Date();
  const created = new Date(this.createdAt);
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
});

// Pre-save middleware to calculate tax-inclusive/exclusive prices
itemSchema.pre("save", function (next) {
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
itemSchema.pre("save", function (next) {
  if (!this.itemCode && this.name && this.category) {
    const namePrefix = this.name.substring(0, 3).toUpperCase();
    const categoryPrefix = this.category.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    this.itemCode = `${namePrefix}-${categoryPrefix}-${randomNum}`;
  }
  next();
});

// ✅ NEW: Pre-save middleware to set up name verification for new items
itemSchema.pre("save", function (next) {
  if (this.isNew) {
    // Initialize name verification for new items
    if (!this.nameVerification) {
      this.nameVerification = {
        status: "pending",
        originalName: this.name,
        verifiedName: null,
        verificationHistory: [
          {
            action: "submitted",
            oldName: null,
            newName: this.name,
            date: new Date(),
            reason: "Initial submission",
          },
        ],
      };
    }

    // Initialize stock history for new items with opening stock
    if (this.openingStock > 0) {
      this.stockHistory = [
        {
          date: this.asOfDate || new Date(),
          previousStock: 0,
          newStock: this.openingStock,
          quantity: this.openingStock,
          adjustmentType: "set",
          reason: "Opening stock",
          adjustedBy: this.createdBy || "system",
          referenceType: "opening",
        },
      ];
    }
  }
  next();
});

// ✅ NEW: Instance method to approve name verification
itemSchema.methods.approveName = function (verifiedName, adminId) {
  this.name = verifiedName || this.nameVerification.originalName;
  this.nameVerification.status = "approved";
  this.nameVerification.verifiedName =
    verifiedName || this.nameVerification.originalName;
  this.nameVerification.verifiedBy = adminId;
  this.nameVerification.verificationDate = new Date();

  this.nameVerification.verificationHistory.push({
    action: "approved",
    oldName: this.nameVerification.originalName,
    newName: verifiedName || this.nameVerification.originalName,
    adminId: adminId,
    date: new Date(),
    reason: "Name approved by admin",
  });

  return this;
};

// ✅ NEW: Instance method to reject name verification
itemSchema.methods.rejectName = function (rejectionReason, adminId) {
  this.nameVerification.status = "rejected";
  this.nameVerification.rejectionReason = rejectionReason;
  this.nameVerification.verifiedBy = adminId;
  this.nameVerification.verificationDate = new Date();

  this.nameVerification.verificationHistory.push({
    action: "rejected",
    oldName: this.nameVerification.originalName,
    newName: null,
    adminId: adminId,
    date: new Date(),
    reason: rejectionReason,
  });

  return this;
};

// Instance method to add stock history entry
itemSchema.methods.addStockHistory = function (stockData) {
  if (!this.stockHistory) {
    this.stockHistory = [];
  }

  this.stockHistory.push({
    date: stockData.date || new Date(),
    previousStock: stockData.previousStock || this.currentStock,
    newStock: stockData.newStock,
    quantity: stockData.quantity,
    adjustmentType: stockData.adjustmentType,
    reason: stockData.reason,
    adjustedBy: stockData.adjustedBy || "system",
    referenceId: stockData.referenceId,
    referenceType: stockData.referenceType,
  });

  return this;
};

// Instance method to get stock history by date range
itemSchema.methods.getStockHistoryByDateRange = function (startDate, endDate) {
  if (!this.stockHistory) return [];

  return this.stockHistory
    .filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate >= startDate && entryDate <= endDate;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

// ✅ NEW: Instance method to get pending items for verification
itemSchema.statics.getPendingVerificationItems = function (companyId = null) {
  const filter = {"nameVerification.status": "pending"};

  if (companyId) {
    filter.companyId = companyId;
  }

  return this.find(filter)
    .populate("companyId", "businessName phoneNumber email")
    .sort({createdAt: -1});
};

// ✅ NEW: Instance method to get verification statistics
itemSchema.statics.getVerificationStats = function (companyId = null) {
  const match = companyId
    ? {companyId: new mongoose.Types.ObjectId(companyId)}
    : {};

  return this.aggregate([
    {$match: match},
    {
      $group: {
        _id: "$nameVerification.status",
        count: {$sum: 1},
        items: {$push: "$name"},
      },
    },
    {
      $group: {
        _id: null,
        total: {$sum: "$count"},
        statusCounts: {
          $push: {
            status: "$_id",
            count: "$count",
          },
        },
      },
    },
  ]);
};

module.exports = mongoose.model("Item", itemSchema);
