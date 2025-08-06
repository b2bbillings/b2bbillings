const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [100, "Name cannot exceed 100 characters"],
      validate: {
        validator: function (value) {
          return /^[a-zA-Z\s]+$/.test(value);
        },
        message: "Name can only contain letters and spaces",
      },
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [254, "Email is too long"],
      validate: {
        validator: function (value) {
          return validator.isEmail(value);
        },
        message: "Please enter a valid email address",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      maxlength: [128, "Password cannot exceed 128 characters"],
      select: false,
      validate: {
        validator: function (value) {
          // Strong password: at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(
            value
          );
        },
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      },
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      validate: {
        validator: function (value) {
          // Indian mobile number validation: starts with 6,7,8,9 and 10 digits
          return /^[6-9]\d{9}$/.test(value);
        },
        message:
          "Phone number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9",
      },
    },
    companyName: {
      type: String,
      trim: true,
      maxlength: [100, "Company name cannot exceed 100 characters"],
      validate: {
        validator: function (value) {
          if (!value) return true; // Optional field
          return /^[a-zA-Z0-9\s\-\.\&]+$/.test(value);
        },
        message: "Company name contains invalid characters",
      },
    },
    companyAddress: {
      type: String,
      trim: true,
      maxlength: [500, "Company address cannot exceed 500 characters"],
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (value) {
          if (!value) return true; // Optional field
          // GST number format: 22AAAAA0000A1Z5
          return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
            value
          );
        },
        message: "Invalid GST number format (e.g., 22AAAAA0000A1Z5)",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: {
        values: ["admin", "user", "manager", "staff"],
        message: "Role must be one of: admin, user, manager, staff",
      },
      default: "user",
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    lastLogin: {
      type: Date,
    },
    loginAttempts: {
      type: Number,
      default: 0,
      min: [0, "Login attempts cannot be negative"],
      max: [10, "Login attempts exceeded maximum limit"],
    },
    lockUntil: {
      type: Date,
    },
    avatar: {
      type: String,
      default: null,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return validator.isURL(value) || /^\/uploads\//.test(value);
        },
        message: "Avatar must be a valid URL or file path",
      },
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },
    backupCodes: [
      {
        type: String,
        select: false,
      },
    ],
    loginHistory: [
      {
        loginTime: {
          type: Date,
          default: Date.now,
        },
        ipAddress: {
          type: String,
          validate: {
            validator: function (value) {
              return validator.isIP(value) || value === "unknown";
            },
            message: "Invalid IP address format",
          },
        },
        userAgent: String,
        success: {
          type: Boolean,
          default: true,
        },
      },
    ],
    preferences: {
      theme: {
        type: String,
        enum: {
          values: ["light", "dark", "auto"],
          message: "Theme must be one of: light, dark, auto",
        },
        default: "light",
      },
      language: {
        type: String,
        default: "en",
        validate: {
          validator: function (value) {
            // ISO 639-1 language codes
            return /^[a-z]{2}$/.test(value);
          },
          message: "Language must be a valid ISO 639-1 code (e.g., en, hi, fr)",
        },
      },
      timezone: {
        type: String,
        default: "Asia/Kolkata",
        validate: {
          validator: function (value) {
            try {
              Intl.DateTimeFormat(undefined, {timeZone: value});
              return true;
            } catch (ex) {
              return false;
            }
          },
          message: "Invalid timezone",
        },
      },
      currency: {
        type: String,
        default: "INR",
        validate: {
          validator: function (value) {
            // ISO 4217 currency codes
            return /^[A-Z]{3}$/.test(value);
          },
          message:
            "Currency must be a valid ISO 4217 code (e.g., INR, USD, EUR)",
        },
      },
      notifications: {
        email: {
          marketing: {
            type: Boolean,
            default: false,
          },
          security: {
            type: Boolean,
            default: true,
          },
          transactions: {
            type: Boolean,
            default: true,
          },
          reminders: {
            type: Boolean,
            default: true,
          },
        },
        push: {
          enabled: {
            type: Boolean,
            default: true,
          },
          sound: {
            type: Boolean,
            default: true,
          },
          vibration: {
            type: Boolean,
            default: true,
          },
        },
        sms: {
          enabled: {
            type: Boolean,
            default: false,
          },
          security: {
            type: Boolean,
            default: true,
          },
        },
      },
    },
    apiKeys: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
          maxlength: [50, "API key name cannot exceed 50 characters"],
        },
        key: {
          type: String,
          required: true,
          select: false,
        },
        permissions: [
          {
            type: String,
            enum: ["read", "write", "admin"],
          },
        ],
        lastUsed: Date,
        expiresAt: Date,
        isActive: {
          type: Boolean,
          default: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    privacySettings: {
      profileVisibility: {
        type: String,
        enum: {
          values: ["public", "private", "friends"],
          message:
            "Profile visibility must be one of: public, private, friends",
        },
        default: "private",
      },
      dataSharing: {
        analytics: {
          type: Boolean,
          default: false,
        },
        marketing: {
          type: Boolean,
          default: false,
        },
        thirdParty: {
          type: Boolean,
          default: false,
        },
      },
    },
    securitySettings: {
      sessionTimeout: {
        type: Number,
        default: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        min: [15 * 60 * 1000, "Session timeout cannot be less than 15 minutes"],
        max: [
          30 * 24 * 60 * 60 * 1000,
          "Session timeout cannot exceed 30 days",
        ],
      },
      allowMultipleSessions: {
        type: Boolean,
        default: true,
      },
      requirePasswordChange: {
        type: Boolean,
        default: false,
      },
      passwordChangeRequired: {
        type: Date,
      },
    },
    subscription: {
      plan: {
        type: String,
        enum: {
          values: ["free", "basic", "premium", "enterprise"],
          message:
            "Subscription plan must be one of: free, basic, premium, enterprise",
        },
        default: "free",
      },
      status: {
        type: String,
        enum: {
          values: ["active", "inactive", "suspended", "cancelled", "trial"],
          message:
            "Subscription status must be one of: active, inactive, suspended, cancelled, trial",
        },
        default: "trial",
      },
      startDate: {
        type: Date,
        default: Date.now,
      },
      endDate: Date,
      features: [
        {
          name: String,
          enabled: Boolean,
          limit: Number,
        },
      ],
    },
    gdprConsent: {
      marketing: {
        given: {
          type: Boolean,
          default: false,
        },
        timestamp: Date,
        ipAddress: String,
      },
      analytics: {
        given: {
          type: Boolean,
          default: false,
        },
        timestamp: Date,
        ipAddress: String,
      },
      dataProcessing: {
        given: {
          type: Boolean,
          required: true,
          default: false,
        },
        timestamp: {
          type: Date,
          required: true,
          default: Date.now,
        },
        ipAddress: String,
      },
    },
    metadata: {
      source: {
        type: String,
        enum: ["web", "mobile", "api", "admin"],
        default: "web",
      },
      referrer: String,
      utmSource: String,
      utmMedium: String,
      utmCampaign: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        // Remove sensitive fields from JSON output
        delete ret.password;
        delete ret.emailVerificationToken;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.loginAttempts;
        delete ret.lockUntil;
        delete ret.twoFactorSecret;
        delete ret.backupCodes;
        delete ret.apiKeys;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        // Remove sensitive fields from object output
        delete ret.password;
        delete ret.emailVerificationToken;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.twoFactorSecret;
        delete ret.backupCodes;
        return ret;
      },
    },
  }
);

// ================================
// 🔍 ENHANCED INDEXES
// ================================

// Core indexes
userSchema.index({email: 1}, {unique: true});
userSchema.index({phone: 1});
userSchema.index({isActive: 1});
userSchema.index({emailVerified: 1});
userSchema.index({role: 1});

// Security indexes
userSchema.index({lockUntil: 1});
userSchema.index({passwordResetToken: 1});
userSchema.index({emailVerificationToken: 1});

// Performance indexes
userSchema.index({createdAt: -1});
userSchema.index({lastLogin: -1});
userSchema.index({"subscription.plan": 1});
userSchema.index({"subscription.status": 1});

// Compound indexes
userSchema.index({email: 1, isActive: 1});
userSchema.index({role: 1, isActive: 1});

// ================================
// 🔧 VIRTUAL PROPERTIES
// ================================

// Virtual for account lock status
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for full name display
userSchema.virtual("displayName").get(function () {
  return this.name;
});

// Virtual for subscription status
userSchema.virtual("isSubscriptionActive").get(function () {
  return (
    this.subscription.status === "active" ||
    this.subscription.status === "trial"
  );
});

// Virtual for trial status
userSchema.virtual("isTrialActive").get(function () {
  return (
    this.subscription.status === "trial" &&
    this.subscription.endDate &&
    this.subscription.endDate > new Date()
  );
});

// Virtual for days since registration
userSchema.virtual("daysSinceRegistration").get(function () {
  return Math.floor(
    (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );
});

// ================================
// 🔒 PRE-SAVE MIDDLEWARE
// ================================

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  try {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified("password")) return next();

    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);

    // If this is a password change (not new user), update security settings
    if (!this.isNew) {
      this.securitySettings.requirePasswordChange = false;
      this.passwordResetToken = undefined;
      this.passwordResetExpires = undefined;
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware for email verification
userSchema.pre("save", function (next) {
  // If email is modified, reset email verification
  if (this.isModified("email") && !this.isNew) {
    this.emailVerified = false;
    this.emailVerificationToken = undefined;
    this.emailVerificationExpires = undefined;
  }
  next();
});

// ================================
// 📱 INSTANCE METHODS
// ================================

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    if (!this.password) {
      throw new Error("Password not available for comparison");
    }
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: {lockUntil: 1},
      $set: {loginAttempts: 1},
    });
  }

  const updates = {$inc: {loginAttempts: 1}};

  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = {lockUntil: Date.now() + 2 * 60 * 60 * 1000}; // 2 hours
  }

  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: {loginAttempts: 1, lockUntil: 1},
  });
};

// Instance method to add login history
userSchema.methods.addLoginHistory = function (
  ipAddress,
  userAgent,
  success = true
) {
  this.loginHistory.unshift({
    loginTime: new Date(),
    ipAddress: ipAddress || "unknown",
    userAgent: userAgent || "unknown",
    success,
  });

  // Keep only last 50 login attempts
  if (this.loginHistory.length > 50) {
    this.loginHistory = this.loginHistory.slice(0, 50);
  }

  this.lastLogin = new Date();
  return this.save();
};

// Instance method to update preferences
userSchema.methods.updatePreferences = function (newPreferences) {
  this.preferences = {...this.preferences.toObject(), ...newPreferences};
  return this.save();
};

// Instance method to check permissions
userSchema.methods.hasPermission = function (permission) {
  const rolePermissions = {
    admin: ["read", "write", "delete", "manage_users", "manage_system"],
    manager: ["read", "write", "delete", "manage_team"],
    staff: ["read", "write"],
    user: ["read"],
  };

  return rolePermissions[this.role]?.includes(permission) || false;
};

// Instance method to generate API key
userSchema.methods.generateApiKey = function (name, permissions = ["read"]) {
  const crypto = require("crypto");
  const apiKey = crypto.randomBytes(32).toString("hex");

  this.apiKeys.push({
    name,
    key: apiKey,
    permissions,
    createdAt: new Date(),
    isActive: true,
  });

  return this.save().then(() => apiKey);
};

// Instance method to validate subscription features
userSchema.methods.canUseFeature = function (featureName) {
  if (this.role === "admin") return true;

  const planFeatures = {
    free: ["basic_dashboard", "basic_reporting"],
    basic: ["basic_dashboard", "basic_reporting", "advanced_dashboard"],
    premium: [
      "basic_dashboard",
      "basic_reporting",
      "advanced_dashboard",
      "advanced_reporting",
      "api_access",
    ],
    enterprise: ["all"],
  };

  const allowedFeatures = planFeatures[this.subscription.plan] || [];
  return (
    allowedFeatures.includes("all") || allowedFeatures.includes(featureName)
  );
};

// ================================
// 📊 STATIC METHODS
// ================================

// Static method to find user by email with password
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({email: email.toLowerCase()}).select(
    "+password +loginAttempts +lockUntil +twoFactorSecret"
  );
};

// Static method to find active users
userSchema.statics.findActiveUsers = function (filters = {}) {
  return this.find({isActive: true, ...filters});
};

// Static method to get comprehensive user stats
userSchema.statics.getUserStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: {$sum: 1},
        activeUsers: {
          $sum: {$cond: [{$eq: ["$isActive", true]}, 1, 0]},
        },
        verifiedUsers: {
          $sum: {$cond: [{$eq: ["$emailVerified", true]}, 1, 0]},
        },
        adminUsers: {
          $sum: {$cond: [{$eq: ["$role", "admin"]}, 1, 0]},
        },
        managerUsers: {
          $sum: {$cond: [{$eq: ["$role", "manager"]}, 1, 0]},
        },
        staffUsers: {
          $sum: {$cond: [{$eq: ["$role", "staff"]}, 1, 0]},
        },
        lockedUsers: {
          $sum: {
            $cond: [
              {
                $and: [
                  {$ne: ["$lockUntil", null]},
                  {$gt: ["$lockUntil", new Date()]},
                ],
              },
              1,
              0,
            ],
          },
        },
        trialUsers: {
          $sum: {$cond: [{$eq: ["$subscription.status", "trial"]}, 1, 0]},
        },
        premiumUsers: {
          $sum: {$cond: [{$eq: ["$subscription.plan", "premium"]}, 1, 0]},
        },
      },
    },
  ]);

  return (
    stats[0] || {
      totalUsers: 0,
      activeUsers: 0,
      verifiedUsers: 0,
      adminUsers: 0,
      managerUsers: 0,
      staffUsers: 0,
      lockedUsers: 0,
      trialUsers: 0,
      premiumUsers: 0,
    }
  );
};

// Static method to cleanup expired tokens
userSchema.statics.cleanupExpiredTokens = async function () {
  const now = new Date();

  const result = await this.updateMany(
    {
      $or: [
        {passwordResetExpires: {$lt: now}},
        {emailVerificationExpires: {$lt: now}},
      ],
    },
    {
      $unset: {
        passwordResetToken: 1,
        passwordResetExpires: 1,
        emailVerificationToken: 1,
        emailVerificationExpires: 1,
      },
    }
  );

  return result;
};

// Static method to get users by subscription plan
userSchema.statics.getUsersByPlan = function (plan) {
  return this.find({
    "subscription.plan": plan,
    "subscription.status": {$in: ["active", "trial"]},
    isActive: true,
  });
};

// ================================
// 🧹 PRE-REMOVE MIDDLEWARE
// ================================

userSchema.pre(
  "deleteOne",
  {document: true, query: false},
  async function (next) {
    try {
      console.log(`Cleaning up data for user: ${this.email}`);

      // Here you can add cleanup logic
      // For example, remove user's companies, orders, etc.
      const Company = mongoose.model("Company");
      await Company.deleteMany({owner: this._id});

      next();
    } catch (error) {
      next(error);
    }
  }
);

// ================================
// 📋 EXPORT MODEL
// ================================

const User = mongoose.model("User", userSchema);

module.exports = User;
