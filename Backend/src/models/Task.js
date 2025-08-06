const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    // Company and Assignment Info
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // Task Identification
    taskId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    // Assignment Details
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    assignmentDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },

    // Task Information
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [200, "Task title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Task description is required"],
      trim: true,
      maxlength: [1000, "Task description cannot exceed 1000 characters"],
    },
    taskType: {
      type: String,
      required: true,
      enum: [
        "Customer Call",
        "Follow-up Call",
        "Customer Survey",
        "Schedule Appointment",
        "Service Appointment",
        "Payment Collection",
        "Marketing Campaign",
        "Store Management",
        "Administrative Task",
        "Lead Generation",
        "Product Demo",
        "Customer Support",
        "Data Entry",
        "Inventory Check",
        // Added for controller compatibility
        "follow_up",
        "meeting",
        "call",
        "email",
        "visit",
        "delivery",
        "payment_reminder",
        "Other",
      ],
      index: true,
    },

    // Customer/Project Info
    customer: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Party", // Changed from "Customer" to "Party" for controller compatibility
      },
      contactNumber: {
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
    },

    // Priority and Status
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "delayed", "cancelled"],
      default: "pending",
      index: true,
    },

    // Reminder Settings
    reminder: {
      enabled: {
        type: Boolean,
        default: true,
      },
      reminderTime: {
        type: String, // Format: "HH:MM"
        required: true,
      },
      reminderDateTime: {
        type: Date,
        index: true,
      },
      frequency: {
        type: String,
        enum: ["once", "30min", "1hour", "2hours", "daily", "weekly"], // Added weekly for controller compatibility
        default: "once",
      },
      notificationMethods: {
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
        whatsapp: {
          type: Boolean,
          default: false,
        },
      },
      lastReminderSent: {
        type: Date,
      },
      remindersSent: {
        type: Number,
        default: 0,
      },
    },

    // Progress Tracking
    progress: {
      percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      startedAt: {
        type: Date,
      },
      completedAt: {
        type: Date,
      },
      lastUpdated: {
        // Added for controller compatibility
        type: Date,
        default: Date.now,
      },
      timeSpent: {
        type: Number, // in minutes
        default: 0,
      },
      notes: [
        {
          note: {
            type: String,
            trim: true,
          },
          addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Staff",
          },
          addedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },

    // Results and Outcome
    result: {
      outcome: {
        type: String,
        enum: [
          "successful",
          "unsuccessful",
          "rescheduled",
          "cancelled",
          "pending",
        ],
        default: "pending",
      },
      resultNotes: {
        type: String,
        trim: true,
        maxlength: [500, "Result notes cannot exceed 500 characters"],
      },
      followUpRequired: {
        type: Boolean,
        default: false,
      },
      followUpDate: {
        type: Date,
      },
      customerFeedback: {
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        comments: {
          type: String,
          trim: true,
        },
      },
    },

    // Related Tasks
    parentTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
    subTasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],

    // Attachments
    attachments: [
      {
        name: {
          type: String,
          required: true,
        },
        filePath: {
          type: String,
          required: true,
        },
        fileType: {
          type: String,
          required: true,
        },
        fileSize: {
          type: Number,
          required: true,
        },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Staff",
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Performance Metrics
    metrics: {
      estimatedDuration: {
        type: Number, // in minutes
      },
      actualDuration: {
        type: Number, // in minutes
      },
      efficiency: {
        type: Number, // percentage
      },
      qualityScore: {
        type: Number,
        min: 1,
        max: 10,
      },
    },

    // Metadata
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringPattern: {
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly", "yearly"],
      },
      interval: {
        type: Number, // every X days/weeks/months
      },
      endDate: {
        type: Date,
      },
    },

    // System Fields
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
    deletionReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        // Clean transformation without logs
        if (ret) {
          delete ret.__v;

          // Ensure safe property access
          if (ret.customer && typeof ret.customer === "object") {
            ret.customer = {
              name: ret.customer.name || "Unknown",
              customerId: ret.customer.customerId || null,
              contactNumber: ret.customer.contactNumber || null,
              email: ret.customer.email || null,
              address: ret.customer.address || null,
            };
          }

          // Ensure progress object exists
          if (!ret.progress) {
            ret.progress = {
              percentage: 0,
              timeSpent: 0,
              notes: [],
              lastUpdated: new Date(),
            };
          }

          // Ensure reminder object exists
          if (!ret.reminder) {
            ret.reminder = {
              enabled: true,
              reminderTime: "09:00",
              frequency: "once",
              notificationMethods: {
                email: true,
                sms: true,
                app: false,
                whatsapp: false,
              },
            };
          }

          // Ensure metrics object exists
          if (!ret.metrics) {
            ret.metrics = {};
          }

          // Ensure result object exists
          if (!ret.result) {
            ret.result = {
              outcome: "pending",
              followUpRequired: false,
            };
          }

          // Ensure arrays exist
          ret.tags = ret.tags || [];
          ret.attachments = ret.attachments || [];
          ret.subTasks = ret.subTasks || [];
        }

        return ret;
      },
    },
    toObject: {virtuals: true},
  }
);

// Indexes for better performance
taskSchema.index({companyId: 1, assignedTo: 1, status: 1});
taskSchema.index({companyId: 1, dueDate: 1, priority: 1});
taskSchema.index({companyId: 1, taskType: 1, assignmentDate: -1});
taskSchema.index({companyId: 1, status: 1, dueDate: 1});
taskSchema.index({"reminder.reminderDateTime": 1, "reminder.enabled": 1});
taskSchema.index({companyId: 1, isActive: 1, assignmentDate: -1});

// Virtual for overdue status
taskSchema.virtual("isOverdue").get(function () {
  return this.dueDate < new Date() && this.status !== "completed";
});

// Virtual for days remaining
taskSchema.virtual("daysRemaining").get(function () {
  const today = new Date();
  const diffTime = this.dueDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for task duration
taskSchema.virtual("taskDuration").get(function () {
  if (this.progress.startedAt && this.progress.completedAt) {
    return Math.round(
      (this.progress.completedAt - this.progress.startedAt) / (1000 * 60)
    ); // in minutes
  }
  return 0;
});

// Virtual for priority weight (for sorting)
taskSchema.virtual("priorityWeight").get(function () {
  const weights = {low: 1, medium: 2, high: 3, urgent: 4};
  return weights[this.priority] || 2;
});

// Pre-save middleware
taskSchema.pre("save", async function (next) {
  try {
    // Generate task ID if not provided
    if (this.isNew && !this.taskId) {
      const year = new Date().getFullYear().toString().slice(-2);
      const month = String(new Date().getMonth() + 1).padStart(2, "0");
      const count = await this.constructor.countDocuments({
        companyId: this.companyId,
      });
      const sequence = (count + 1).toString().padStart(4, "0");
      this.taskId = `TSK${year}${month}${sequence}`;
    }

    // Set reminder date time
    if (this.reminder.enabled && this.reminder.reminderTime) {
      try {
        const [hours, minutes] = this.reminder.reminderTime.split(":");
        const reminderDate = new Date(this.dueDate);
        reminderDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        this.reminder.reminderDateTime = reminderDate;
      } catch (timeError) {
        // Fallback to default time if parsing fails
        const reminderDate = new Date(this.dueDate);
        reminderDate.setHours(9, 0, 0, 0);
        this.reminder.reminderDateTime = reminderDate;
      }
    }

    // Update progress.lastUpdated when percentage changes
    if (this.isModified("progress.percentage")) {
      this.progress.lastUpdated = new Date();
    }

    // Update progress based on status
    if (this.isModified("status")) {
      if (this.status === "in-progress" && !this.progress.startedAt) {
        this.progress.startedAt = new Date();
        this.progress.percentage = Math.max(this.progress.percentage, 10);
      } else if (this.status === "completed") {
        this.progress.completedAt = new Date();
        this.progress.percentage = 100;

        // Calculate actual duration
        if (this.progress.startedAt) {
          this.metrics.actualDuration = Math.round(
            (this.progress.completedAt - this.progress.startedAt) / (1000 * 60)
          );

          // Calculate efficiency if estimated duration exists
          if (this.metrics.estimatedDuration) {
            this.metrics.efficiency = Math.round(
              (this.metrics.estimatedDuration / this.metrics.actualDuration) *
                100
            );
          }
        }
      }
    }

    // Generate title if not provided
    if (!this.title && this.taskType && this.customer && this.customer.name) {
      this.title = `${this.taskType}: ${this.customer.name}`;
    }

    // Ensure required fields have defaults
    if (!this.reminder) {
      this.reminder = {
        enabled: true,
        reminderTime: "09:00",
        frequency: "once",
        notificationMethods: {
          email: true,
          sms: true,
          app: false,
          whatsapp: false,
        },
      };
    }

    if (!this.progress) {
      this.progress = {
        percentage: 0,
        timeSpent: 0,
        notes: [],
        lastUpdated: new Date(),
      };
    }

    if (!this.metrics) {
      this.metrics = {};
    }

    if (!this.result) {
      this.result = {
        outcome: "pending",
        followUpRequired: false,
      };
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Instance methods
taskSchema.methods.markAsStarted = function () {
  this.status = "in-progress";
  this.progress.startedAt = new Date();
  this.progress.lastUpdated = new Date();
  this.progress.percentage = Math.max(this.progress.percentage, 10);
  return this.save();
};

taskSchema.methods.markAsCompleted = function (resultData = {}) {
  this.status = "completed";
  this.progress.completedAt = new Date();
  this.progress.lastUpdated = new Date();
  this.progress.percentage = 100;

  if (resultData.outcome) this.result.outcome = resultData.outcome;
  if (resultData.resultNotes) this.result.resultNotes = resultData.resultNotes;
  if (resultData.followUpRequired)
    this.result.followUpRequired = resultData.followUpRequired;
  if (resultData.followUpDate)
    this.result.followUpDate = resultData.followUpDate;

  return this.save();
};

taskSchema.methods.addNote = function (note, addedBy) {
  if (!this.progress.notes) {
    this.progress.notes = [];
  }

  this.progress.notes.push({
    note: note,
    addedBy: addedBy,
    addedAt: new Date(),
  });
  return this.save();
};

taskSchema.methods.updateProgress = function (percentage) {
  this.progress.percentage = Math.max(0, Math.min(100, percentage));
  this.progress.lastUpdated = new Date();

  // Auto-update status based on progress
  if (percentage === 0) {
    this.status = "pending";
  } else if (percentage > 0 && percentage < 100) {
    this.status = "in-progress";
    if (!this.progress.startedAt) {
      this.progress.startedAt = new Date();
    }
  } else if (percentage === 100) {
    this.status = "completed";
    if (!this.progress.completedAt) {
      this.progress.completedAt = new Date();
    }
  }

  return this.save();
};

// Static methods
taskSchema.statics.findByCompany = function (companyId, options = {}) {
  const query = {companyId, isActive: true};

  if (options.assignedTo) query.assignedTo = options.assignedTo;
  if (options.status) query.status = options.status;
  if (options.priority) query.priority = options.priority;
  if (options.taskType) query.taskType = options.taskType;

  return this.find(query)
    .populate("assignedTo", "name employeeId role email")
    .populate("assignedBy", "name employeeId role")
    .populate("customer.customerId", "name email phone")
    .sort({dueDate: 1, priority: -1});
};

taskSchema.statics.getTodaysTasks = function (companyId, assignedTo = null) {
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59
  );

  const query = {
    companyId,
    isActive: true,
    dueDate: {$gte: startOfDay, $lte: endOfDay},
  };

  if (assignedTo) query.assignedTo = assignedTo;

  return this.find(query)
    .populate("assignedTo", "name employeeId role")
    .populate("assignedBy", "name employeeId role")
    .sort({priority: -1, "reminder.reminderTime": 1});
};

taskSchema.statics.getOverdueTasks = function (companyId, assignedTo = null) {
  const today = new Date();
  const query = {
    companyId,
    isActive: true,
    dueDate: {$lt: today},
    status: {$nin: ["completed", "cancelled"]},
  };

  if (assignedTo) query.assignedTo = assignedTo;

  return this.find(query)
    .populate("assignedTo", "name employeeId role")
    .populate("assignedBy", "name employeeId role")
    .sort({dueDate: 1, priority: -1});
};

taskSchema.statics.getTaskStats = function (companyId, assignedTo = null) {
  const matchQuery = {companyId, isActive: true};
  if (assignedTo)
    matchQuery.assignedTo = new mongoose.Types.ObjectId(assignedTo);

  return this.aggregate([
    {$match: matchQuery},
    {
      $group: {
        _id: null,
        totalTasks: {$sum: 1},
        completedTasks: {
          $sum: {$cond: [{$eq: ["$status", "completed"]}, 1, 0]},
        },
        pendingTasks: {
          $sum: {$cond: [{$eq: ["$status", "pending"]}, 1, 0]},
        },
        inProgressTasks: {
          $sum: {$cond: [{$eq: ["$status", "in-progress"]}, 1, 0]},
        },
        overdueTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  {$lt: ["$dueDate", new Date()]},
                  {$nin: ["$status", ["completed", "cancelled"]]},
                ],
              },
              1,
              0,
            ],
          },
        },
        averageProgress: {$avg: "$progress.percentage"},
        totalTimeSpent: {$sum: "$progress.timeSpent"},
      },
    },
    {
      $addFields: {
        completionRate: {
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

taskSchema.statics.getTaskReminders = function (
  companyId,
  dateRange = "today"
) {
  const now = new Date();
  let query = {
    companyId,
    isActive: true,
    "reminder.enabled": true,
    status: {$nin: ["completed", "cancelled"]},
  };

  if (dateRange === "today") {
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59
    );
    query["reminder.reminderDateTime"] = {
      $gte: now,
      $lte: endOfDay,
    };
  }

  return this.find(query)
    .populate("assignedTo", "name email mobileNumbers")
    .populate("assignedBy", "name")
    .sort({"reminder.reminderDateTime": 1});
};

module.exports = mongoose.model("Task", taskSchema);
