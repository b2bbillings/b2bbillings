const mongoose = require("mongoose");

const phoneNumberSchema = new mongoose.Schema(
  {
    number: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      default: "Primary",
      trim: true,
    },
  },
  {_id: false}
);

const addressSchema = new mongoose.Schema(
  {
    addressLine: {
      type: String,
      trim: true,
      default: "",
    },
    pincode: {
      type: String,
      trim: true,
      default: "",
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    district: {
      type: String,
      trim: true,
      default: "",
    },
    taluka: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {_id: false}
);

// ✅ NEW: Schema for supplier company data
const supplierCompanyDataSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      trim: true,
    },
    businessName: {
      type: String,
      trim: true,
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
    },
    businessType: {
      type: String,
      trim: true,
    },
    isExternal: {
      type: Boolean,
      default: false,
    },
    source: {
      type: String,
      trim: true,
    },
  },
  {_id: false}
);

const partySchema = new mongoose.Schema(
  {
    partyType: {
      type: String,
      enum: ["customer", "vendor", "supplier", "both"],
      required: true,
      default: "customer",
    },
    name: {
      type: String,
      required: [true, "Party name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      validate: {
        validator: function (v) {
          return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Please provide a valid email address",
      },
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      validate: {
        validator: function (v) {
          return /^[6-9]\d{9}$/.test(v);
        },
        message:
          "Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9",
      },
    },
    phoneNumbers: [phoneNumberSchema],

    // Company Details
    companyName: {
      type: String,
      trim: true,
      maxlength: [100, "Company name cannot exceed 100 characters"],
      default: "",
    },

    // GST Information
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (v) {
          // Only validate if GST number is provided and GST type is not unregistered
          return (
            !v ||
            /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v)
          );
        },
        message: "Please provide a valid GST number format",
      },
    },
    gstType: {
      type: String,
      enum: ["unregistered", "regular", "composition"],
      default: "unregistered",
    },

    // Financial Information
    creditLimit: {
      type: Number,
      default: 0,
      min: [0, "Credit limit cannot be negative"],
    },
    openingBalance: {
      type: Number,
      default: 0,
      min: [0, "Opening balance cannot be negative"],
    },
    currentBalance: {
      type: Number,
      default: 0,
    },

    // Address Information
    homeAddress: addressSchema,
    deliveryAddress: addressSchema,
    sameAsHomeAddress: {
      type: Boolean,
      default: false,
    },

    // Country
    country: {
      type: String,
      default: "INDIA",
      uppercase: true,
    },

    // ✅ CRITICAL: Bidirectional Order Generation Fields
    linkedCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
      sparse: true,
    },
    isLinkedSupplier: {
      type: Boolean,
      default: false,
      index: true,
    },
    enableBidirectionalOrders: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ✅ Auto-linking Configuration
    autoLinkByGST: {
      type: Boolean,
      default: true,
    },
    autoLinkByPhone: {
      type: Boolean,
      default: true,
    },
    autoLinkByEmail: {
      type: Boolean,
      default: true,
    },

    // ✅ External Company Integration Fields
    externalCompanyId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    isExternalCompany: {
      type: Boolean,
      default: false,
    },
    importedFrom: {
      type: String,
      trim: true,
      enum: ["external_company_db", "manual", "api_import", null],
      default: null,
    },
    importedAt: {
      type: Date,
      default: null,
    },
    source: {
      type: String,
      trim: true,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    // ✅ Supplier Company Data for Bidirectional Orders
    supplierCompanyData: supplierCompanyDataSchema,

    // ✅ Additional Business Information
    website: {
      type: String,
      trim: true,
      default: "",
    },
    businessType: {
      type: String,
      trim: true,
      default: "",
    },
    businessCategory: {
      type: String,
      trim: true,
      default: "",
    },
    companyType: {
      type: String,
      trim: true,
      default: "",
    },
    incorporationDate: {
      type: Date,
      default: null,
    },
    cinNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    authorizedCapital: {
      type: String,
      trim: true,
      default: "",
    },
    paidUpCapital: {
      type: String,
      trim: true,
      default: "",
    },
    establishedYear: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    ownerInfo: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Association Fields
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company ID is required"],
      index: true,
    },

    // Audit Fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    deletedAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {virtuals: true},
    toObject: {virtuals: true},
  }
);

// ✅ Enhanced Indexes for better performance with linking
partySchema.index({name: 1});
partySchema.index({phoneNumber: 1});
partySchema.index({email: 1});
partySchema.index({partyType: 1});
partySchema.index({gstNumber: 1});

// ✅ NEW: Indexes for bidirectional order functionality
partySchema.index({linkedCompanyId: 1});
partySchema.index({linkedCompanyId: 1, partyType: 1});
partySchema.index({linkedCompanyId: 1, isLinkedSupplier: 1});
partySchema.index({linkedCompanyId: 1, enableBidirectionalOrders: 1});
partySchema.index({externalCompanyId: 1});
partySchema.index({isLinkedSupplier: 1, partyType: 1});
partySchema.index({enableBidirectionalOrders: 1, partyType: 1});

// Company-scoped unique index for phone numbers
partySchema.index(
  {
    companyId: 1,
    phoneNumber: 1,
  },
  {
    unique: true,
    partialFilterExpression: {isActive: true},
    name: "unique_phone_per_company",
  }
);

partySchema.index({companyId: 1, name: 1});
partySchema.index({companyId: 1, partyType: 1});
partySchema.index({companyId: 1, isActive: 1, createdAt: -1});

// ✅ Enhanced compound indexes for bidirectional queries
partySchema.index({
  companyId: 1,
  partyType: 1,
  isLinkedSupplier: 1,
  isActive: 1,
});

partySchema.index({
  linkedCompanyId: 1,
  enableBidirectionalOrders: 1,
  isActive: 1,
});

// Text index for search
partySchema.index({
  name: "text",
  phoneNumber: "text",
  email: "text",
  companyName: "text",
});

// ✅ NEW: Virtual for linked company information
partySchema.virtual("linkedCompany", {
  ref: "Company",
  localField: "linkedCompanyId",
  foreignField: "_id",
  justOne: true,
});

// ✅ NEW: Virtual for bidirectional order readiness
partySchema.virtual("bidirectionalOrderReady").get(function () {
  return !!(
    this.linkedCompanyId &&
    this.isLinkedSupplier &&
    this.enableBidirectionalOrders &&
    this.partyType === "supplier"
  );
});

// Virtual for formatted balance
partySchema.virtual("formattedBalance").get(function () {
  const balance = this.currentBalance || 0;
  const type = balance >= 0 ? "To Receive" : "To Pay";
  return {
    amount: Math.abs(balance),
    type: type,
    formatted: `₹${Math.abs(balance).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
    })}`,
  };
});

// ✅ Enhanced pre-save middleware with linking logic
partySchema.pre("save", function (next) {
  // Copy home address to delivery if sameAsHomeAddress is true
  if (this.sameAsHomeAddress && this.homeAddress) {
    this.deliveryAddress = {
      addressLine: this.homeAddress.addressLine,
      pincode: this.homeAddress.pincode,
      state: this.homeAddress.state,
      district: this.homeAddress.district,
      taluka: this.homeAddress.taluka,
    };
  }

  // Set current balance from opening balance on creation
  if (this.isNew) {
    this.currentBalance = this.openingBalance || 0;
  }

  // Set createdBy if it's a new document and not already set
  if (this.isNew && !this.createdBy && this.userId) {
    this.createdBy = this.userId;
  }

  // Ensure phoneNumbers array has at least the primary phone
  if (!this.phoneNumbers || this.phoneNumbers.length === 0) {
    this.phoneNumbers = [
      {
        number: this.phoneNumber,
        label: "Primary",
      },
    ];
  }

  // ✅ NEW: Auto-set linking flags based on data
  if (this.linkedCompanyId && this.partyType === "supplier") {
    this.isLinkedSupplier = true;
    if (this.enableBidirectionalOrders === undefined) {
      this.enableBidirectionalOrders = true;
    }
  }

  // ✅ NEW: Validate linked company is not the same as current company
  if (
    this.linkedCompanyId &&
    this.companyId &&
    this.linkedCompanyId.toString() === this.companyId.toString()
  ) {
    const error = new Error("Cannot link party to their own company");
    error.name = "ValidationError";
    return next(error);
  }

  next();
});

// ✅ NEW: Instance method to check if party is ready for bidirectional orders
partySchema.methods.isBidirectionalOrderReady = function () {
  return !!(
    this.linkedCompanyId &&
    this.isLinkedSupplier &&
    this.enableBidirectionalOrders &&
    this.partyType === "supplier" &&
    this.isActive
  );
};

// ✅ NEW: Instance method to get linked company details
partySchema.methods.getLinkedCompanyDetails = async function () {
  if (!this.linkedCompanyId) {
    return null;
  }

  const Company = mongoose.model("Company");
  return await Company.findById(this.linkedCompanyId).lean();
};

// ✅ NEW: Static method to find suppliers with linked companies
partySchema.statics.findSuppliersWithLinkedCompanies = function (
  companyId,
  filters = {}
) {
  return this.find({
    companyId: companyId,
    partyType: "supplier",
    isLinkedSupplier: true,
    linkedCompanyId: {$exists: true, $ne: null},
    isActive: true,
    ...filters,
  }).populate("linkedCompanyId", "businessName gstin phoneNumber email");
};

// ✅ NEW: Static method to check if company can be linked
partySchema.statics.canLinkToCompany = function (
  partyCompanyId,
  targetCompanyId
) {
  // Prevent linking to same company
  return partyCompanyId.toString() !== targetCompanyId.toString();
};

// Instance method to check phone exists in company
partySchema.methods.checkPhoneExistsInCompany = function (phoneNumber) {
  return this.constructor.findOne({
    phoneNumber: phoneNumber,
    companyId: this.companyId,
    _id: {$ne: this._id},
    isActive: true,
  });
};

module.exports = mongoose.model("Party", partySchema);
