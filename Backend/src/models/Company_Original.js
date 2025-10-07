const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    // Owner/Creator Information
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Company owner is required"],
      index: true,
    },

    // Users associated with this company
    users: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["owner", "admin", "manager", "employee"],
          default: "employee",
        },
        permissions: [
          {
            type: String,
            enum: [
              "view_dashboard",
              "manage_parties",
              "create_invoices",
              "view_reports",
              "manage_inventory",
              "manage_users",
              "company_settings",
              "delete_records",
            ],
          },
        ],
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // Basic Company Information (matching frontend fields)
    businessName: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
      maxlength: [100, "Business name cannot exceed 100 characters"],
    },

    // Contact Information
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"],
    },

    additionalPhones: [
      {
        type: String,
        match: [/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"],
      },
    ],

    email: {
      type: String,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },

    // Business Details
    businessType: {
      type: String,
      enum: [
        "Retail",
        "Wholesale",
        "Distributor",
        "Service",
        "Manufacturing",
        "Others",
      ],
    },

    businessCategory: {
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
        "Other",
      ],
    },

    // Legal Information
    gstin: {
      type: String,
      sparse: true,
      match: [
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        "Please enter a valid GSTIN",
      ],
    },

    // Address Information (matching frontend fields)
    state: {
      type: String,
      trim: true,
    },

    pincode: {
      type: String,
      match: [/^[0-9]{6}$/, "Please enter a valid 6-digit pincode"],
    },

    city: {
      type: String,
      trim: true,
    },

    tehsil: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    // Images
    logo: {
      url: String,
      publicId: String,
      base64: String, // For base64 images from frontend
    },

    signatureImage: {
      url: String,
      publicId: String,
      base64: String, // For base64 images from frontend
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Settings (with defaults)
    settings: {
      invoicePrefix: {
        type: String,
        default: "INV",
        maxlength: [5, "Invoice prefix cannot exceed 5 characters"],
      },
      purchasePrefix: {
        type: String,
        default: "PUR",
        maxlength: [5, "Purchase prefix cannot exceed 5 characters"],
      },
      enableGST: {
        type: Boolean,
        default: true,
      },
      autoGenerateInvoice: {
        type: Boolean,
        default: true,
      },
      allowMultipleUsers: {
        type: Boolean,
        default: false,
      },
      requireApprovalForUsers: {
        type: Boolean,
        default: true,
      },
    },

    // Subscription Details
    subscription: {
      plan: {
        type: String,
        enum: ["Free", "Basic", "Premium", "Enterprise"],
        default: "Free",
      },
      startDate: {
        type: Date,
        default: Date.now,
      },
      endDate: {
        type: Date,
        default: () => {
          const now = new Date();
          return new Date(now.setDate(now.getDate() + 30)); // 30 days free trial
        },
      },
      maxUsers: {
        type: Number,
        default: 1,
      },
      maxTransactions: {
        type: Number,
        default: 100,
      },
      features: [
        {
          type: String,
          enum: [
            "basic_invoicing",
            "inventory_management",
            "reports",
            "multi_user",
            "advanced_reports",
            "api_access",
            "custom_branding",
            "priority_support",
          ],
        },
      ],
    },

    // Company Statistics (for analytics)
    stats: {
      totalUsers: {
        type: Number,
        default: 1,
      },
      totalParties: {
        type: Number,
        default: 0,
      },
      totalTransactions: {
        type: Number,
        default: 0,
      },
      totalRevenue: {
        type: Number,
        default: 0,
      },
      lastActivityAt: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {virtuals: true},
    toObject: {virtuals: true},
  }
);

// ✅ FIXED: Virtual for full address with null checks
companySchema.virtual("fullAddress").get(function () {
  if (!this.address && !this.city && !this.state && !this.pincode) {
    return "";
  }
  const addressParts = [
    this.address,
    this.city,
    this.state,
    this.pincode,
  ].filter(Boolean);
  return addressParts.join(", ");
});

// ✅ FIXED: Virtual for subscription status with null checks
companySchema.virtual("subscriptionStatus").get(function () {
  if (!this.subscription || !this.subscription.endDate) {
    return "Unknown";
  }
  const now = new Date();
  return this.subscription.endDate > now ? "Active" : "Expired";
});

// ✅ FIXED: Virtual for active users count with proper null checks
companySchema.virtual("activeUsersCount").get(function () {
  if (!this.users || !Array.isArray(this.users)) {
    return 0;
  }
  return this.users.filter((user) => user && user.isActive).length;
});

// ✅ FIXED: Virtual to check if user has access to company with proper checks
companySchema.virtual("hasUserAccess").get(function () {
  const self = this;
  return function (userId) {
    if (!userId) return false;

    // Check if user is owner
    if (self.owner && self.owner.toString() === userId.toString()) {
      return true;
    }

    // Check if user is in users array
    if (!self.users || !Array.isArray(self.users)) {
      return false;
    }

    return self.users.some(
      (user) =>
        user &&
        user.user &&
        user.user.toString() === userId.toString() &&
        user.isActive
    );
  };
});

// ✅ FIXED: Instance method to check if user is owner with null checks
companySchema.methods.isOwner = function (userId) {
  if (!userId || !this.owner) {
    return false;
  }
  return this.owner.toString() === userId.toString();
};

// ✅ FIXED: Instance method to get user role in company with null checks
companySchema.methods.getUserRole = function (userId) {
  if (!userId) {
    return null;
  }

  if (this.isOwner(userId)) {
    return "owner";
  }

  if (!this.users || !Array.isArray(this.users)) {
    return null;
  }

  const userEntry = this.users.find(
    (user) =>
      user &&
      user.user &&
      user.user.toString() === userId.toString() &&
      user.isActive
  );

  return userEntry ? userEntry.role : null;
};

// ✅ FIXED: Instance method to check user permissions with null checks
companySchema.methods.hasPermission = function (userId, permission) {
  if (!userId || !permission) {
    return false;
  }

  if (this.isOwner(userId)) {
    return true; // Owner has all permissions
  }

  if (!this.users || !Array.isArray(this.users)) {
    return false;
  }

  const userEntry = this.users.find(
    (user) =>
      user &&
      user.user &&
      user.user.toString() === userId.toString() &&
      user.isActive
  );

  return userEntry &&
    userEntry.permissions &&
    Array.isArray(userEntry.permissions)
    ? userEntry.permissions.includes(permission)
    : false;
};

// ✅ FIXED: Instance method to add user to company with null checks
companySchema.methods.addUser = function (
  userId,
  role = "employee",
  permissions = []
) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  // Initialize users array if it doesn't exist
  if (!this.users || !Array.isArray(this.users)) {
    this.users = [];
  }

  // Initialize stats if it doesn't exist
  if (!this.stats) {
    this.stats = {
      totalUsers: 1,
      totalParties: 0,
      totalTransactions: 0,
      totalRevenue: 0,
      lastActivityAt: new Date(),
    };
  }

  // Check if user already exists
  const existingUser = this.users.find(
    (user) => user && user.user && user.user.toString() === userId.toString()
  );

  if (existingUser) {
    // Update existing user
    existingUser.role = role;
    existingUser.permissions = Array.isArray(permissions) ? permissions : [];
    existingUser.isActive = true;
    existingUser.joinedAt = new Date();
  } else {
    // Add new user
    this.users.push({
      user: userId,
      role: role,
      permissions: Array.isArray(permissions) ? permissions : [],
      joinedAt: new Date(),
      isActive: true,
    });
  }

  // Update stats
  this.stats.totalUsers =
    this.users.filter((user) => user && user.isActive).length + 1; // +1 for owner
  this.stats.lastActivityAt = new Date();

  return this.save();
};

// ✅ FIXED: Instance method to remove user from company with null checks
companySchema.methods.removeUser = function (userId) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  if (!this.users || !Array.isArray(this.users)) {
    return this.save(); // Nothing to remove
  }

  // Initialize stats if it doesn't exist
  if (!this.stats) {
    this.stats = {
      totalUsers: 1,
      totalParties: 0,
      totalTransactions: 0,
      totalRevenue: 0,
      lastActivityAt: new Date(),
    };
  }

  this.users = this.users.filter(
    (user) => !user || !user.user || user.user.toString() !== userId.toString()
  );

  // Update stats
  this.stats.totalUsers =
    this.users.filter((user) => user && user.isActive).length + 1; // +1 for owner
  this.stats.lastActivityAt = new Date();

  return this.save();
};

// ✅ FIXED: Static method to find companies by user with null checks
companySchema.statics.findByUser = function (userId) {
  if (!userId) {
    return this.find({_id: null}); // Return empty result
  }

  return this.find({
    $or: [{owner: userId}, {"users.user": userId, "users.isActive": true}],
    isActive: true,
  })
    .populate("owner", "name email")
    .populate("users.user", "name email");
};

// ✅ FIXED: Static method to find companies owned by user with null checks
companySchema.statics.findByOwner = function (userId) {
  if (!userId) {
    return this.find({_id: null}); // Return empty result
  }

  return this.find({
    owner: userId,
    isActive: true,
  })
    .populate("owner", "name email")
    .populate("users.user", "name email");
};

// ✅ FIXED: Pre-save middleware with null checks
companySchema.pre("save", function (next) {
  try {
    // Convert business name to title case
    if (this.businessName && typeof this.businessName === "string") {
      this.businessName = this.businessName
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    // Convert GSTIN to uppercase
    if (this.gstin && typeof this.gstin === "string") {
      this.gstin = this.gstin.toUpperCase();
    }

    // Clean phone numbers
    if (this.phoneNumber && typeof this.phoneNumber === "string") {
      this.phoneNumber = this.phoneNumber.replace(/\D/g, "");
    }

    if (
      this.additionalPhones &&
      Array.isArray(this.additionalPhones) &&
      this.additionalPhones.length > 0
    ) {
      this.additionalPhones = this.additionalPhones
        .filter((phone) => phone && typeof phone === "string")
        .map((phone) => phone.replace(/\D/g, ""))
        .filter((phone) => phone.length === 10);
    }

    // Initialize or update stats
    if (!this.stats) {
      this.stats = {
        totalUsers: 1,
        totalParties: 0,
        totalTransactions: 0,
        totalRevenue: 0,
        lastActivityAt: new Date(),
      };
    } else {
      this.stats.lastActivityAt = new Date();
    }

    next();
  } catch (error) {
    console.error("Error in Company pre-save middleware:", error);
    next(error);
  }
});

// ✅ FIXED: Post-save middleware to update user stats with error handling
companySchema.post("save", async function (doc) {
  try {
    // Update total users count with null checks
    if (!doc.stats) {
      doc.stats = {
        totalUsers: 1,
        totalParties: 0,
        totalTransactions: 0,
        totalRevenue: 0,
        lastActivityAt: new Date(),
      };
    }

    const activeUsersCount =
      (doc.users && Array.isArray(doc.users)
        ? doc.users.filter((user) => user && user.isActive).length
        : 0) + 1; // +1 for owner

    if (doc.stats.totalUsers !== activeUsersCount) {
      doc.stats.totalUsers = activeUsersCount;
      // Use updateOne to avoid infinite loop
      await this.constructor.updateOne(
        {_id: doc._id},
        {$set: {"stats.totalUsers": activeUsersCount}}
      );
    }
  } catch (error) {
    console.error("Error updating company stats:", error);
    // Don't throw error to avoid breaking the save operation
  }
});

// Create indexes for better performance
companySchema.index({owner: 1});
companySchema.index({"users.user": 1});
companySchema.index({businessName: 1});
companySchema.index({phoneNumber: 1});
companySchema.index({email: 1});
companySchema.index({gstin: 1});
companySchema.index({state: 1, city: 1});
companySchema.index({isActive: 1});
companySchema.index({"subscription.plan": 1});
companySchema.index({"subscription.endDate": 1});
companySchema.index({createdAt: -1});

module.exports = mongoose.model("Company", companySchema);
