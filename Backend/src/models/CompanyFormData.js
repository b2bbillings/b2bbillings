const mongoose = require("mongoose");

// Custom Field Schema for flexible form fields
const customFieldSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Custom field title is required"],
      trim: true,
      maxlength: [100, "Custom field title cannot exceed 100 characters"],
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "Custom field value is required"],
    },
    type: {
      type: String,
      enum: ["text", "number", "date", "boolean", "select", "email", "phone", "url"],
      default: "text",
    },
    isRequired: {
      type: Boolean,
      default: false,
    },
    options: [String], // For select type fields
    validation: {
      pattern: String,
      message: String,
    },
  },
  { _id: false }
);

// Address Schema for structured address storage
const addressSchema = new mongoose.Schema(
  {
    addressLine1: {
      type: String,
      required: [true, "Address line 1 is required"],
      trim: true,
      maxlength: [200, "Address line 1 cannot exceed 200 characters"],
    },
    addressLine2: {
      type: String,
      trim: true,
      maxlength: [200, "Address line 2 cannot exceed 200 characters"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      maxlength: [50, "City name cannot exceed 50 characters"],
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
      maxlength: [50, "State name cannot exceed 50 characters"],
    },
    country: {
      type: String,
      trim: true,
      default: "India",
      maxlength: [50, "Country name cannot exceed 50 characters"],
    },
    pincode: {
      type: String,
      required: [true, "Pincode is required"],
      match: [/^[0-9]{6}$/, "Please enter a valid 6-digit pincode"],
    },
    district: {
      type: String,
      trim: true,
      maxlength: [50, "District name cannot exceed 50 characters"],
    },
    tehsil: {
      type: String,
      trim: true,
      maxlength: [50, "Tehsil name cannot exceed 50 characters"],
    },
  },
  { _id: false }
);

// Contact Information Schema
const contactInfoSchema = new mongoose.Schema(
  {
    primaryMobile: {
      type: String,
      required: [true, "Primary mobile number is required"],
      match: [/^[0-9]{10}$/, "Please enter a valid 10-digit mobile number"],
    },
    secondaryMobile: {
      type: String,
      match: [/^[0-9]{10}$/, "Please enter a valid 10-digit mobile number"],
    },
    landline: {
      type: String,
      trim: true,
      match: [/^[0-9+\-\s()]*$/, "Please enter a valid landline number"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },
    alternateEmail: {
      type: String,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },
    website: {
      type: String,
      trim: true,
      match: [
        /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
        "Please enter a valid website URL",
      ],
    },
    socialMedia: {
      linkedin: String,
      facebook: String,
      twitter: String,
      instagram: String,
    },
  },
  { _id: false }
);

// Legal Information Schema
const legalInfoSchema = new mongoose.Schema(
  {
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      match: [
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        "Please enter a valid GST number",
      ],
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      match: [
        /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
        "Please enter a valid PAN number",
      ],
    },
    tanNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    cinNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
      maxlength: [50, "Registration number cannot exceed 50 characters"],
    },
    udyogAadhar: {
      type: String,
      trim: true,
    },
    iecCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    fssaiLicense: {
      type: String,
      trim: true,
    },
    tradeLicense: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

// Financial Information Schema
const financialInfoSchema = new mongoose.Schema(
  {
    financialYearStart: {
      type: Date,
      required: [true, "Financial year start date is required"],
      validate: {
        validator: function(value) {
          return !value || value <= new Date();
        },
        message: "Financial year start date cannot be in the future",
      },
    },
    financialYearEnd: {
      type: Date,
      required: [true, "Financial year end date is required"],
      validate: {
        validator: function(value) {
          return !value || !this.financialYearStart || value > this.financialYearStart;
        },
        message: "Financial year end date must be after start date",
      },
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
      enum: ["INR", "USD", "EUR", "GBP", "AUD", "CAD", "SGD", "AED", "JPY", "CNY"],
    },
    baseCurrency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
    },
    authorizedCapital: {
      type: Number,
      min: [0, "Authorized capital cannot be negative"],
    },
    paidUpCapital: {
      type: Number,
      min: [0, "Paid up capital cannot be negative"],
    },
    annualTurnover: {
      type: Number,
      min: [0, "Annual turnover cannot be negative"],
    },
    taxRegime: {
      type: String,
      enum: ["Regular", "Composition", "Nil Rated", "Exempted"],
      default: "Regular",
    },
  },
  { _id: false }
);

// Business Information Schema
const businessInfoSchema = new mongoose.Schema(
  {
    companyType: {
      type: String,
      required: [true, "Company type is required"],
      enum: [
        "Private Limited",
        "Public Limited",
        "Partnership",
        "Sole Proprietorship",
        "LLP",
        "One Person Company",
        "Section 8 Company",
        "Producer Company",
        "Trust",
        "Society",
        "Other",
      ],
      default: "Private Limited",
    },
    businessType: {
      type: String,
      enum: [
        "Retail",
        "Wholesale",
        "Distributor",
        "Service",
        "Manufacturing",
        "Trading",
        "E-commerce",
        "Others",
      ],
      default: "Others",
    },
    industry: {
      type: String,
      enum: [
        "Accounting & CA",
        "Interior Designer",
        "Automobiles / Auto Parts",
        "Salon / Spa",
        "Liquor Store",
        "Book / Stationary Store",
        "Construction Materials & Equipment",
        "Repairing Plumbing & Electrician",
        "Chemical & Fertilizer",
        "Computer Equipment & Software",
        "Electrical & Electronics Equipment",
        "Fashion Accessory / Cosmetics",
        "Tailoring / Boutique",
        "Fruit and Vegetable",
        "Kirana / General Merchant",
        "FMCG Products",
        "Dairy Farm Products / Poultry",
        "Furniture",
        "Garment / Fashion & Hosiery",
        "Jewellery & Gems",
        "Pharmacy / Medical",
        "Hardware Store",
        "Mobile & Accessories",
        "Nursery / Plants",
        "Petroleum Bulk Stations & Terminals / Petrol",
        "Restaurant / Hotel",
        "Footwear",
        "Paper & Paper Products",
        "Sweet Shop / Bakery",
        "Gift & Toys",
        "Laundry / Washing / Dry Clean",
        "Coaching & Training",
        "Renting & Leasing",
        "Fitness Center",
        "Oil & Gas",
        "Real Estate",
        "NGO & Charitable Trust",
        "Tours & Travels",
        "Information Technology",
        "Healthcare",
        "Education",
        "Finance & Banking",
        "Agriculture",
        "Textile",
        "Other",
      ],
      default: "Other",
    },
    subIndustry: {
      type: String,
      trim: true,
    },
    businessDescription: {
      type: String,
      trim: true,
      maxlength: [1000, "Business description cannot exceed 1000 characters"],
    },
    incorporationDate: {
      type: Date,
      validate: {
        validator: function(value) {
          return !value || value <= new Date();
        },
        message: "Incorporation date cannot be in the future",
      },
    },
    establishedYear: {
      type: String,
      trim: true,
      match: [/^[0-9]{4}$/, "Please enter a valid 4-digit year"],
      validate: {
        validator: function(value) {
          if (!value) return true;
          const year = parseInt(value);
          const currentYear = new Date().getFullYear();
          return year >= 1800 && year <= currentYear;
        },
        message: "Established year must be between 1800 and current year",
      },
    },
    employeeCount: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"],
    },
    operatingHours: {
      type: String,
      trim: true,
    },
    servicesOffered: [String],
    productsManufactured: [String],
    targetMarket: [String],
  },
  { _id: false }
);

// Document Attachments Schema
const documentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "GST Certificate",
        "PAN Card",
        "Incorporation Certificate",
        "MOA",
        "AOA",
        "Bank Statement",
        "Address Proof",
        "Identity Proof",
        "License",
        "Other",
      ],
      required: true,
    },
    url: String,
    publicId: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// Main CompanyFormData Schema
const companyFormDataSchema = new mongoose.Schema(
  {
    // Reference to User who created this company
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user is required"],
      index: true,
    },

    // Reference to existing Company if linking is needed
    linkedCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },

    // Basic Company Information
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      maxlength: [200, "Company name cannot exceed 200 characters"],
      index: true,
    },

    displayName: {
      type: String,
      trim: true,
      maxlength: [100, "Display name cannot exceed 100 characters"],
    },

    legalName: {
      type: String,
      trim: true,
      maxlength: [200, "Legal name cannot exceed 200 characters"],
    },

    // Logo and Branding
    logo: {
      url: String,
      publicId: String,
      base64: String,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },

    brandColors: {
      primary: String,
      secondary: String,
      accent: String,
    },

    // Structured Schemas
    address: {
      type: addressSchema,
      required: [true, "Address information is required"],
    },

    contactInfo: {
      type: contactInfoSchema,
      required: [true, "Contact information is required"],
    },

    legalInfo: legalInfoSchema,

    financialInfo: {
      type: financialInfoSchema,
      required: [true, "Financial information is required"],
    },

    businessInfo: {
      type: businessInfoSchema,
      required: [true, "Business information is required"],
    },

    // Custom Fields for Additional Data
    customFields: [customFieldSchema],

    // Document Attachments
    documents: [documentSchema],

    // Owner/Key Personnel Information
    keyPersonnel: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        designation: {
          type: String,
          required: true,
          trim: true,
        },
        email: {
          type: String,
          lowercase: true,
          match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email"],
        },
        mobile: {
          type: String,
          match: [/^[0-9]{10}$/, "Please enter a valid 10-digit mobile number"],
        },
        responsibilities: [String],
        isAuthorizedSignatory: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Bank Details
    bankDetails: [
      {
        bankName: {
          type: String,
          required: true,
          trim: true,
        },
        accountNumber: {
          type: String,
          required: true,
          trim: true,
        },
        ifscCode: {
          type: String,
          required: true,
          trim: true,
          uppercase: true,
        },
        branchName: {
          type: String,
          trim: true,
        },
        accountType: {
          type: String,
          enum: ["Savings", "Current", "CC/OD", "Other"],
          default: "Current",
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Form Metadata
    formMetadata: {
      version: {
        type: String,
        default: "2.0",
      },
      submittedAt: {
        type: Date,
        default: Date.now,
        index: true,
      },
      completionPercentage: {
        type: Number,
        min: [0, "Completion percentage cannot be negative"],
        max: [100, "Completion percentage cannot exceed 100"],
        default: 0,
      },
      lastUpdatedStep: {
        type: String,
        enum: [
          "basic_info",
          "address",
          "contact",
          "legal",
          "financial",
          "business",
          "custom_fields",
          "documents",
          "personnel",
          "bank_details",
          "review",
        ],
      },
      dataSource: {
        type: String,
        enum: ["form", "api", "import", "manual", "migration"],
        default: "form",
      },
      ipAddress: String,
      userAgent: String,
      sessionId: String,
    },

    // Status and Workflow
    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "requires_correction",
        "archived",
      ],
      default: "draft",
      index: true,
    },

    submissionNotes: {
      type: String,
      trim: true,
      maxlength: [500, "Submission notes cannot exceed 500 characters"],
    },

    reviewNotes: {
      type: String,
      trim: true,
      maxlength: [1000, "Review notes cannot exceed 1000 characters"],
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedAt: Date,

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvedAt: Date,

    // Flags and Settings
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    isPublic: {
      type: Boolean,
      default: false,
    },

    allowEditing: {
      type: Boolean,
      default: true,
    },

    // Audit Trail
    auditLog: [
      {
        action: {
          type: String,
          required: true,
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        performedAt: {
          type: Date,
          default: Date.now,
        },
        changes: mongoose.Schema.Types.Mixed,
        ipAddress: String,
        notes: String,
      },
    ],

    // Integration Data
    integrations: {
      quickbooks: {
        customerId: String,
        syncStatus: String,
        lastSyncAt: Date,
      },
      tally: {
        ledgerId: String,
        syncStatus: String,
        lastSyncAt: Date,
      },
      gst: {
        verificationStatus: String,
        verifiedAt: Date,
        gstnData: mongoose.Schema.Types.Mixed,
      },
    },

    // Additional Notes and Comments
    internalNotes: {
      type: String,
      trim: true,
      maxlength: [2000, "Internal notes cannot exceed 2000 characters"],
    },

    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // Search and Indexing
    searchKeywords: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for Performance
companyFormDataSchema.index({ createdBy: 1 });
companyFormDataSchema.index({ companyName: 1 });
companyFormDataSchema.index({ "contactInfo.email": 1 });
companyFormDataSchema.index({ "contactInfo.primaryMobile": 1 });
companyFormDataSchema.index({ "legalInfo.gstNumber": 1 });
companyFormDataSchema.index({ "legalInfo.panNumber": 1 });
companyFormDataSchema.index({ "address.city": 1, "address.state": 1 });
companyFormDataSchema.index({ "businessInfo.industry": 1 });
companyFormDataSchema.index({ status: 1 });
companyFormDataSchema.index({ isActive: 1 });
companyFormDataSchema.index({ isVerified: 1 });
companyFormDataSchema.index({ "formMetadata.submittedAt": -1 });
companyFormDataSchema.index({ tags: 1 });
companyFormDataSchema.index({ searchKeywords: 1 });

// Virtuals
companyFormDataSchema.virtual("fullAddress").get(function () {
  if (!this.address) return "";
  const addr = this.address;
  return [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.country, addr.pincode]
    .filter(Boolean)
    .join(", ");
});

companyFormDataSchema.virtual("primaryContact").get(function () {
  if (!this.contactInfo) return "";
  return `${this.contactInfo.primaryMobile} | ${this.contactInfo.email}`;
});

// Pre-save middleware
companyFormDataSchema.pre("save", function (next) {
  try {
    // Generate search keywords
    const keywords = [];
    
    if (this.companyName) keywords.push(...this.companyName.toLowerCase().split(/\s+/));
    if (this.contactInfo?.email) keywords.push(this.contactInfo.email.toLowerCase());
    if (this.legalInfo?.gstNumber) keywords.push(this.legalInfo.gstNumber.toLowerCase());
    if (this.legalInfo?.panNumber) keywords.push(this.legalInfo.panNumber.toLowerCase());
    if (this.address?.city) keywords.push(this.address.city.toLowerCase());
    if (this.address?.state) keywords.push(this.address.state.toLowerCase());
    if (this.businessInfo?.industry) keywords.push(this.businessInfo.industry.toLowerCase());
    
    // Add custom field values to keywords
    if (this.customFields) {
      this.customFields.forEach(field => {
        if (field.value && typeof field.value === 'string') {
          keywords.push(field.value.toLowerCase());
        }
      });
    }
    
    this.searchKeywords = [...new Set(keywords)]; // Remove duplicates
    
    // Calculate completion percentage
    this.formMetadata.completionPercentage = this.calculateCompletionPercentage();
    
    next();
  } catch (error) {
    next(error);
  }
});

// Methods
companyFormDataSchema.methods.calculateCompletionPercentage = function () {
  let totalFields = 0;
  let filledFields = 0;
  
  // Basic info (weight: 20%)
  totalFields += 5;
  if (this.companyName) filledFields++;
  if (this.displayName) filledFields++;
  if (this.legalName) filledFields++;
  if (this.logo?.url || this.logo?.base64) filledFields++;
  if (this.businessInfo?.businessDescription) filledFields++;
  
  // Address (weight: 15%)
  totalFields += 6;
  if (this.address?.addressLine1) filledFields++;
  if (this.address?.city) filledFields++;
  if (this.address?.state) filledFields++;
  if (this.address?.country) filledFields++;
  if (this.address?.pincode) filledFields++;
  if (this.address?.district) filledFields++;
  
  // Contact (weight: 15%)
  totalFields += 4;
  if (this.contactInfo?.primaryMobile) filledFields++;
  if (this.contactInfo?.email) filledFields++;
  if (this.contactInfo?.website) filledFields++;
  if (this.contactInfo?.landline) filledFields++;
  
  // Legal (weight: 15%)
  totalFields += 3;
  if (this.legalInfo?.gstNumber) filledFields++;
  if (this.legalInfo?.panNumber) filledFields++;
  if (this.legalInfo?.registrationNumber) filledFields++;
  
  // Financial (weight: 15%)
  totalFields += 4;
  if (this.financialInfo?.financialYearStart) filledFields++;
  if (this.financialInfo?.financialYearEnd) filledFields++;
  if (this.financialInfo?.currency) filledFields++;
  if (this.financialInfo?.authorizedCapital) filledFields++;
  
  // Business (weight: 10%)
  totalFields += 3;
  if (this.businessInfo?.companyType) filledFields++;
  if (this.businessInfo?.businessType) filledFields++;
  if (this.businessInfo?.industry) filledFields++;
  
  // Additional (weight: 10%)
  totalFields += 3;
  if (this.customFields?.length > 0) filledFields++;
  if (this.keyPersonnel?.length > 0) filledFields++;
  if (this.bankDetails?.length > 0) filledFields++;
  
  return Math.round((filledFields / totalFields) * 100);
};

companyFormDataSchema.methods.addAuditEntry = function (action, performedBy, changes, ipAddress, notes) {
  this.auditLog.push({
    action,
    performedBy,
    changes,
    ipAddress,
    notes,
    performedAt: new Date(),
  });
};

// Static methods
companyFormDataSchema.statics.findByGST = function (gstNumber) {
  return this.findOne({ "legalInfo.gstNumber": gstNumber.toUpperCase() });
};

companyFormDataSchema.statics.findByPAN = function (panNumber) {
  return this.findOne({ "legalInfo.panNumber": panNumber.toUpperCase() });
};

companyFormDataSchema.statics.findByEmail = function (email) {
  return this.findOne({ "contactInfo.email": email.toLowerCase() });
};

companyFormDataSchema.statics.searchCompanies = function (query, options = {}) {
  const {
    limit = 10,
    skip = 0,
    status = null,
    industry = null,
    city = null,
    state = null,
  } = options;

  const searchQuery = {
    isActive: true,
  };

  if (query) {
    searchQuery.$or = [
      { companyName: { $regex: query, $options: "i" } },
      { searchKeywords: { $in: [query.toLowerCase()] } },
      { "contactInfo.email": { $regex: query, $options: "i" } },
    ];
  }

  if (status) searchQuery.status = status;
  if (industry) searchQuery["businessInfo.industry"] = industry;
  if (city) searchQuery["address.city"] = city;
  if (state) searchQuery["address.state"] = state;

  return this.find(searchQuery)
    .sort({ "formMetadata.submittedAt": -1 })
    .limit(limit)
    .skip(skip)
    .populate("createdBy", "username email fullName")
    .populate("reviewedBy", "username email fullName")
    .populate("approvedBy", "username email fullName");
};

module.exports = mongoose.model("CompanyFormData", companyFormDataSchema);