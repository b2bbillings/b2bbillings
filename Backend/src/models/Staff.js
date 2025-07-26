const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const staffSchema = new mongoose.Schema(
  {
    // Company reference
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // Employee Identification
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    // Basic Information (Step 1)
    name: {
      type: String,
      required: [true, "Employee name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    role: {
      type: String,
      required: true,
      enum: [
        "admin",
        "manager",
        "supervisor",
        "cashier",
        "salesperson",
        "inventory",
        "accountant",
        "delivery",
        "security",
        "cleaner",
        "technician",
      ],
      default: "salesperson",
    },

    post: {
      type: String,
      enum: [
        "junior",
        "senior",
        "assistant",
        "executive",
        "officer",
        "head",
        "lead",
        "trainee",
      ],
      default: "junior",
    },

    mobileNumbers: [
      {
        type: String,
        required: true,
        trim: true,
        validate: {
          validator: function (v) {
            return /^\d{10}$/.test(v);
          },
          message: "Mobile number must be 10 digits",
        },
      },
    ],

    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Please enter a valid email address",
      },
      sparse: true, // Allow multiple null values but unique non-null values
    },

    // Address Details (Step 2)
    address: {
      street: {
        type: String,
        required: [true, "Address is required"],
        trim: true,
      },
      city: {
        type: String,
        required: [true, "City is required"],
        trim: true,
      },
      state: {
        type: String,
        required: [true, "State is required"],
        trim: true,
      },
      taluka: {
        type: String,
        trim: true,
      },
      pincode: {
        type: String,
        trim: true,
        validate: {
          validator: function (v) {
            return !v || /^\d{6}$/.test(v);
          },
          message: "Pincode must be 6 digits",
        },
      },
    },

    // Employment Information (Step 3)
    employment: {
      joinDate: {
        type: Date,
        required: [true, "Joining date is required"],
        default: Date.now,
      },
      salary: {
        type: Number,
        min: [0, "Salary cannot be negative"],
      },
      department: {
        type: String,
        enum: [
          "Sales",
          "Marketing",
          "Finance",
          "Operations",
          "Human Resources",
          "IT",
          "Customer Service",
          "Inventory",
          "Security",
          "Administration",
        ],
      },
      reportingTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Staff",
      },
      employmentType: {
        type: String,
        enum: ["full-time", "part-time", "contract", "internship"],
        default: "full-time",
      },
      probationPeriod: {
        type: Number, // in months
        default: 3,
      },
      workingHours: {
        start: String, // e.g., "09:00"
        end: String, // e.g., "18:00"
        lunchBreak: {
          start: String,
          end: String,
        },
      },
    },

    // Documents (Step 4)
    documents: [
      {
        id: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          required: true,
          enum: [
            "Aadhar Card",
            "PAN Card",
            "Voter ID",
            "Driving License",
            "Passport",
            "Bank Passbook",
            "Educational Certificate",
            "Experience Letter",
            "Relieving Letter",
            "Medical Certificate",
            "Police Verification",
            "Character Certificate",
            "Other",
          ],
        },
        size: Number,
        uploadDate: {
          type: Date,
          default: Date.now,
        },
        // Store file path instead of base64 data for better performance
        filePath: String,
        isVerified: {
          type: Boolean,
          default: false,
        },
        verifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Staff",
        },
        verificationDate: Date,
      },
    ],

    // System Access (Step 5)
    permissions: [
      {
        type: String,
        enum: [
          "dashboard",
          "sales",
          "purchases",
          "inventory",
          "customers",
          "suppliers",
          "staff",
          "reports",
          "settings",
        ],
      },
    ],

    // Account Setup (Step 6)
    loginCredentials: {
      username: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true,
      },
      password: {
        type: String,
        select: false, // Don't include in queries by default
      },
      isPasswordSet: {
        type: Boolean,
        default: false,
      },
      lastLogin: Date,
      loginAttempts: {
        type: Number,
        default: 0,
      },
      lockUntil: Date,
    },

    // Profile Information
    avatar: {
      type: String, // File path or URL
      default: null,
    },

    // Status Management
    status: {
      type: String,
      enum: ["active", "inactive", "terminated", "on-leave", "suspended"],
      default: "active",
      index: true,
    },

    // Task Management Integration
    assignedTasks: [
      {
        taskId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Task",
        },
        assignedDate: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["pending", "in-progress", "completed", "delayed"],
          default: "pending",
        },
      },
    ],

    // Performance Tracking
    performance: {
      totalTasksAssigned: {
        type: Number,
        default: 0,
      },
      totalTasksCompleted: {
        type: Number,
        default: 0,
      },
      averageCompletionTime: Number, // in hours
      lastPerformanceReview: Date,
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
    },

    // Attendance Tracking
    attendance: {
      totalWorkingDays: {
        type: Number,
        default: 0,
      },
      totalPresent: {
        type: Number,
        default: 0,
      },
      totalAbsent: {
        type: Number,
        default: 0,
      },
      totalLateCheckins: {
        type: Number,
        default: 0,
      },
      lastCheckin: Date,
      lastCheckout: Date,
    },

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Emergency Contact
    emergencyContact: {
      name: String,
      relationship: String,
      phone: {
        type: String,
        validate: {
          validator: function (v) {
            return !v || /^\d{10}$/.test(v);
          },
          message: "Emergency contact number must be 10 digits",
        },
      },
    },

    // Bank Details for Salary
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      branchName: String,
      accountHolderName: String,
    },

    // Leave Management
    leaveBalance: {
      casual: {
        type: Number,
        default: 12,
      },
      sick: {
        type: Number,
        default: 6,
      },
      earned: {
        type: Number,
        default: 15,
      },
    },

    // Notification Preferences
    notifications: {
      email: {
        type: Boolean,
        default: true,
      },
      sms: {
        type: Boolean,
        default: true,
      },
      app: {
        type: Boolean,
        default: false,
      },
    },

    // ✅ NEW: Deletion Tracking Fields (Enhanced Delete Support)
    deletedAt: {
      type: Date,
      default: null,
      index: true, // For efficient queries on deleted staff
    },
    deletionReason: {
      type: String,
      maxlength: [500, "Deletion reason cannot exceed 500 characters"],
      trim: true,
    },
    restoredAt: {
      type: Date,
      default: null,
    },
    restoredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        // ✅ Enhanced safe transform function
        if (!ret || typeof ret !== "object") {
          return ret;
        }

        try {
          // Remove sensitive fields
          delete ret.__v;
          delete ret.deletedAt;
          delete ret.deletedBy;

          // ✅ Safe handling of loginCredentials
          if (
            ret.loginCredentials &&
            typeof ret.loginCredentials === "object"
          ) {
            // Remove sensitive auth fields
            delete ret.loginCredentials.password;
            delete ret.loginCredentials.resetToken;
            delete ret.loginCredentials.resetTokenExpiry;

            // Ensure safe properties
            ret.loginCredentials = {
              isPasswordSet: ret.loginCredentials.isPasswordSet || false,
              loginAttempts: ret.loginCredentials.loginAttempts || 0,
              username: ret.loginCredentials.username || null,
              lastLogin: ret.loginCredentials.lastLogin || null,
            };
          } else {
            ret.loginCredentials = {
              isPasswordSet: false,
              loginAttempts: 0,
              username: null,
              lastLogin: null,
            };
          }

          // ✅ Ensure arrays exist with safe defaults
          ret.mobileNumbers = Array.isArray(ret.mobileNumbers)
            ? ret.mobileNumbers
            : [];
          ret.permissions = Array.isArray(ret.permissions)
            ? ret.permissions
            : [];
          ret.assignedTasks = Array.isArray(ret.assignedTasks)
            ? ret.assignedTasks
            : [];
          ret.documents = Array.isArray(ret.documents) ? ret.documents : [];

          // ✅ Ensure objects exist with safe defaults
          ret.address =
            ret.address && typeof ret.address === "object" ? ret.address : {};

          ret.employment =
            ret.employment && typeof ret.employment === "object"
              ? {
                  joinDate: ret.employment.joinDate || null,
                  salary: ret.employment.salary || 0,
                  employmentType: ret.employment.employmentType || "full-time",
                  probationPeriod: ret.employment.probationPeriod || 0,
                  department: ret.employment.department || null,
                  reportingTo: ret.employment.reportingTo || null,
                  workingHours: ret.employment.workingHours || null,
                }
              : {
                  joinDate: null,
                  salary: 0,
                  employmentType: "full-time",
                  probationPeriod: 0,
                  department: null,
                  reportingTo: null,
                  workingHours: null,
                };

          ret.performance =
            ret.performance && typeof ret.performance === "object"
              ? {
                  totalTasksAssigned: ret.performance.totalTasksAssigned || 0,
                  totalTasksCompleted: ret.performance.totalTasksCompleted || 0,
                  averageCompletionTime:
                    ret.performance.averageCompletionTime || 0,
                  lastPerformanceReview:
                    ret.performance.lastPerformanceReview || null,
                  rating: ret.performance.rating || null,
                }
              : {
                  totalTasksAssigned: 0,
                  totalTasksCompleted: 0,
                  averageCompletionTime: 0,
                  lastPerformanceReview: null,
                  rating: null,
                };

          ret.attendance =
            ret.attendance && typeof ret.attendance === "object"
              ? {
                  totalWorkingDays: ret.attendance.totalWorkingDays || 0,
                  totalPresent: ret.attendance.totalPresent || 0,
                  totalAbsent: ret.attendance.totalAbsent || 0,
                  totalLateCheckins: ret.attendance.totalLateCheckins || 0,
                  lastCheckin: ret.attendance.lastCheckin || null,
                  lastCheckout: ret.attendance.lastCheckout || null,
                }
              : {
                  totalWorkingDays: 0,
                  totalPresent: 0,
                  totalAbsent: 0,
                  totalLateCheckins: 0,
                  lastCheckin: null,
                  lastCheckout: null,
                };

          ret.leaveBalance =
            ret.leaveBalance && typeof ret.leaveBalance === "object"
              ? {
                  casual: ret.leaveBalance.casual || 0,
                  sick: ret.leaveBalance.sick || 0,
                  earned: ret.leaveBalance.earned || 0,
                }
              : {
                  casual: 0,
                  sick: 0,
                  earned: 0,
                };

          ret.notifications =
            ret.notifications && typeof ret.notifications === "object"
              ? {
                  email: ret.notifications.email !== false,
                  sms: ret.notifications.sms !== false,
                  app: ret.notifications.app || false,
                }
              : {
                  email: true,
                  sms: true,
                  app: false,
                };

          ret.emergencyContact =
            ret.emergencyContact && typeof ret.emergencyContact === "object"
              ? {
                  name: ret.emergencyContact.name || null,
                  relationship: ret.emergencyContact.relationship || null,
                  phone: ret.emergencyContact.phone || null,
                }
              : {
                  name: null,
                  relationship: null,
                  phone: null,
                };

          ret.bankDetails =
            ret.bankDetails && typeof ret.bankDetails === "object"
              ? {
                  accountNumber: ret.bankDetails.accountNumber || null,
                  ifscCode: ret.bankDetails.ifscCode || null,
                  bankName: ret.bankDetails.bankName || null,
                  branchName: ret.bankDetails.branchName || null,
                  accountHolderName: ret.bankDetails.accountHolderName || null,
                }
              : {
                  accountNumber: null,
                  ifscCode: null,
                  bankName: null,
                  branchName: null,
                  accountHolderName: null,
                };

          // ✅ Ensure basic required fields exist
          ret.name = ret.name || "Unknown";
          ret.email = ret.email || null;
          ret.role = ret.role || "staff";
          ret.post = ret.post || "junior";
          ret.employeeId = ret.employeeId || null;
          ret.status = ret.status || "active";
          ret.isActive = ret.isActive !== false;
          ret.avatar = ret.avatar || null;

          return ret;
        } catch (error) {
          console.error("Error in Staff toJSON transform:", error);
          // ✅ Return minimal safe object if transform fails
          return {
            _id: ret._id,
            name: ret.name || "Unknown",
            email: ret.email || null,
            role: ret.role || "staff",
            employeeId: ret.employeeId || null,
            status: ret.status || "active",
            isActive: ret.isActive !== false,
            mobileNumbers: Array.isArray(ret.mobileNumbers)
              ? ret.mobileNumbers
              : [],
            performance: {
              totalTasksAssigned: 0,
              totalTasksCompleted: 0,
            },
            attendance: {
              totalWorkingDays: 0,
              totalPresent: 0,
              totalAbsent: 0,
              totalLateCheckins: 0,
            },
            loginCredentials: {
              isPasswordSet: false,
              loginAttempts: 0,
              username: null,
            },
          };
        }
      },
    },
    toObject: {virtuals: true},
  }
);

// Indexes for better performance
staffSchema.index({companyId: 1, employeeId: 1});
staffSchema.index({companyId: 1, email: 1});
staffSchema.index({companyId: 1, role: 1});
staffSchema.index({companyId: 1, status: 1});
staffSchema.index({companyId: 1, "employment.department": 1});
staffSchema.index({"loginCredentials.username": 1});
staffSchema.index({mobileNumbers: 1});
// ✅ NEW: Index for deleted staff queries
staffSchema.index({companyId: 1, isActive: 1, deletedAt: 1});

// Virtual for account lock status
staffSchema.virtual("isLocked").get(function () {
  return !!(
    this.loginCredentials.lockUntil &&
    this.loginCredentials.lockUntil > Date.now()
  );
});

// Virtual for full name with role
staffSchema.virtual("displayName").get(function () {
  return `${
    this.name
  } (${this.role.charAt(0).toUpperCase() + this.role.slice(1)})`;
});

// Virtual for performance percentage
staffSchema.virtual("performancePercentage").get(function () {
  if (this.performance.totalTasksAssigned === 0) return 0;
  return Math.round(
    (this.performance.totalTasksCompleted /
      this.performance.totalTasksAssigned) *
      100
  );
});

// Virtual for attendance percentage
staffSchema.virtual("attendancePercentage").get(function () {
  if (this.attendance.totalWorkingDays === 0) return 0;
  return Math.round(
    (this.attendance.totalPresent / this.attendance.totalWorkingDays) * 100
  );
});

// ✅ NEW: Virtual for deletion status
staffSchema.virtual("isDeletable").get(function () {
  // Add business logic to determine if staff can be deleted
  return this.status !== "active" || this.assignedTasks.length === 0;
});

// ✅ NEW: Virtual for deletion info
staffSchema.virtual("deletionInfo").get(function () {
  if (!this.deletedAt) return null;

  return {
    deletedAt: this.deletedAt,
    reason: this.deletionReason || "No reason provided",
    canRestore: this.isActive === false && this.status === "terminated",
  };
});

// Pre-save middleware
staffSchema.pre("save", async function (next) {
  try {
    // Generate employee ID if not provided
    if (this.isNew && !this.employeeId) {
      const prefix = "EMP";
      const year = new Date().getFullYear().toString().slice(-2);
      const count = await this.constructor.countDocuments({
        companyId: this.companyId,
      });
      const sequence = (count + 1).toString().padStart(4, "0");
      this.employeeId = `${prefix}${year}${sequence}`;
    }

    // Generate username if not provided
    if (this.isNew && !this.loginCredentials.username) {
      const baseUsername = this.name.toLowerCase().replace(/\s+/g, ".");
      let username = baseUsername;
      let counter = 1;

      while (
        await this.constructor.findOne({"loginCredentials.username": username})
      ) {
        username = `${baseUsername}${counter}`;
        counter++;
      }
      this.loginCredentials.username = username;
    }

    // Hash password if modified
    if (
      this.isModified("loginCredentials.password") &&
      this.loginCredentials.password
    ) {
      const salt = await bcrypt.genSalt(10);
      this.loginCredentials.password = await bcrypt.hash(
        this.loginCredentials.password,
        salt
      );
      this.loginCredentials.isPasswordSet = true;
    }

    // Ensure primary mobile number is first
    if (this.mobileNumbers && this.mobileNumbers.length > 0) {
      this.mobileNumbers = [
        ...new Set(this.mobileNumbers.filter((num) => num && num.trim())),
      ];
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to verify password
staffSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.loginCredentials.password) return false;
  return bcrypt.compare(candidatePassword, this.loginCredentials.password);
};

// Instance method to check if account is locked
staffSchema.methods.isAccountLocked = function () {
  return !!(
    this.loginCredentials.lockUntil &&
    this.loginCredentials.lockUntil > Date.now()
  );
};

// Instance method to increment login attempts
staffSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (
    this.loginCredentials.lockUntil &&
    this.loginCredentials.lockUntil < Date.now()
  ) {
    return this.updateOne({
      $unset: {"loginCredentials.lockUntil": 1},
      $set: {"loginCredentials.loginAttempts": 1},
    });
  }

  const updates = {$inc: {"loginCredentials.loginAttempts": 1}};

  // Lock account after 5 failed attempts for 2 hours
  if (this.loginCredentials.loginAttempts + 1 >= 5 && !this.isAccountLocked()) {
    updates.$set = {
      "loginCredentials.lockUntil": Date.now() + 2 * 60 * 60 * 1000,
    };
  }

  return this.updateOne(updates);
};

// Instance method to reset login attempts
staffSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: {"loginCredentials.lockUntil": 1},
    $set: {"loginCredentials.loginAttempts": 0},
  });
};

// Instance method to update last login
staffSchema.methods.updateLastLogin = function () {
  return this.updateOne({
    $set: {"loginCredentials.lastLogin": new Date()},
  });
};

// Instance method to assign task
staffSchema.methods.assignTask = function (taskId) {
  this.assignedTasks.push({
    taskId: taskId,
    assignedDate: new Date(),
    status: "pending",
  });
  this.performance.totalTasksAssigned += 1;
  return this.save();
};

// Instance method to complete task
staffSchema.methods.completeTask = function (taskId) {
  const task = this.assignedTasks.find(
    (t) => t.taskId.toString() === taskId.toString()
  );
  if (task) {
    task.status = "completed";
    this.performance.totalTasksCompleted += 1;
  }
  return this.save();
};

// ✅ NEW: Instance method to soft delete
staffSchema.methods.softDelete = function (reason, deletedBy) {
  this.isActive = false;
  this.status = "terminated";
  this.deletedAt = new Date();
  this.deletionReason = reason;
  this.updatedBy = deletedBy;
  return this.save();
};

// ✅ NEW: Instance method to restore
staffSchema.methods.restore = function (restoredBy) {
  this.isActive = true;
  this.status = "active";
  this.restoredAt = new Date();
  this.restoredBy = restoredBy;
  this.deletedAt = undefined;
  this.deletionReason = undefined;
  this.updatedBy = restoredBy;
  return this.save();
};

// Static method to find by company
staffSchema.statics.findByCompany = function (companyId, options = {}) {
  const query = {companyId, isActive: true};

  if (options.role) query.role = options.role;
  if (options.status) query.status = options.status;
  if (options.department) query["employment.department"] = options.department;

  return this.find(query)
    .populate("employment.reportingTo", "name role")
    .populate("createdBy", "name")
    .sort({name: 1});
};

// ✅ NEW: Static method to find deleted staff
staffSchema.statics.findDeletedByCompany = function (companyId, options = {}) {
  const query = {
    companyId,
    isActive: false,
    status: "terminated",
    deletedAt: {$ne: null},
  };

  if (options.search) {
    query.$or = [
      {name: {$regex: options.search, $options: "i"}},
      {employeeId: {$regex: options.search, $options: "i"}},
      {email: {$regex: options.search, $options: "i"}},
    ];
  }

  return this.find(query)
    .populate("employment.reportingTo", "name role employeeId")
    .populate("updatedBy", "name role")
    .populate("restoredBy", "name role")
    .sort({deletedAt: -1});
};

// Static method to get staff statistics
staffSchema.statics.getStaffStats = function (companyId) {
  return this.aggregate([
    {$match: {companyId: new mongoose.Types.ObjectId(companyId)}},
    {
      $group: {
        _id: null,
        totalStaff: {$sum: 1},
        activeStaff: {
          $sum: {$cond: [{$eq: ["$status", "active"]}, 1, 0]},
        },
        inactiveStaff: {
          $sum: {$cond: [{$ne: ["$status", "active"]}, 1, 0]},
        },
        deletedStaff: {
          $sum: {
            $cond: [
              {
                $and: [
                  {$eq: ["$isActive", false]},
                  {$ne: ["$deletedAt", null]},
                ],
              },
              1,
              0,
            ],
          },
        },
        totalTasks: {$sum: "$performance.totalTasksAssigned"},
        completedTasks: {$sum: "$performance.totalTasksCompleted"},
        averageAttendance: {
          $avg: {
            $cond: [
              {$gt: ["$attendance.totalWorkingDays", 0]},
              {
                $multiply: [
                  {
                    $divide: [
                      "$attendance.totalPresent",
                      "$attendance.totalWorkingDays",
                    ],
                  },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
    },
    {
      $addFields: {
        taskCompletionRate: {
          $cond: [
            {$gt: ["$totalTasks", 0]},
            {$multiply: [{$divide: ["$completedTasks", "$totalTasks"]}, 100]},
            0,
          ],
        },
      },
    },
  ]);
};

// Static method to search staff
staffSchema.statics.searchStaff = function (
  companyId,
  searchTerm,
  options = {}
) {
  const query = {
    companyId,
    isActive: true,
    $or: [
      {name: {$regex: searchTerm, $options: "i"}},
      {employeeId: {$regex: searchTerm, $options: "i"}},
      {email: {$regex: searchTerm, $options: "i"}},
      {mobileNumbers: {$regex: searchTerm, $options: "i"}},
    ],
  };

  if (options.role) query.role = options.role;
  if (options.status) query.status = options.status;

  return this.find(query)
    .populate("employment.reportingTo", "name role")
    .sort({name: 1})
    .limit(options.limit || 50);
};

module.exports = mongoose.model("Staff", staffSchema);
