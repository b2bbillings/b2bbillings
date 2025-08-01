const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // Basic notification info
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxLength: 1000,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "system", // System updates, maintenance
        "transaction", // Sales, purchases, payments
        "inventory", // Stock alerts, low inventory
        "task", // Task assignments, reminders
        "security", // Login attempts, security alerts
        "reminder", // Payment due, follow-ups
        "chat", // New messages, chat notifications
        "order", // Order status updates
        "report", // Report generation complete
        "backup", // Backup status
        "user", // User management notifications
        "company", // Company-related notifications
        "warning", // Important warnings
        "error", // Error notifications
        "success", // Success confirmations
        "info", // General information
      ],
      default: "info",
    },

    // Priority and urgency
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },

    // Recipients
    recipients: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        companyId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Company",
        },
        readAt: {
          type: Date,
          default: null,
        },
        readBy: {
          device: String,
          ipAddress: String,
          userAgent: String,
        },
        deliveredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Sender info
    sender: {
      type: {
        type: String,
        enum: ["system", "user", "automated"],
        default: "system",
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      systemModule: String, // e.g., 'inventory', 'sales', 'chat'
    },

    // Related data
    relatedTo: {
      entityType: {
        type: String,
        enum: [
          "sale",
          "purchase",
          "party",
          "product",
          "task",
          "user",
          "company",
          "order",
          "payment",
          "chat",
        ],
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      entityData: {
        type: mongoose.Schema.Types.Mixed, // Store relevant data
      },
    },

    // Action and navigation
    actionRequired: {
      type: Boolean,
      default: false,
    },
    actionUrl: String, // URL to navigate when clicked
    actionLabel: String, // e.g., "View Order", "Pay Now"

    // Delivery channels
    channels: {
      inApp: {
        type: Boolean,
        default: true,
      },
      email: {
        type: Boolean,
        default: false,
      },
      sms: {
        type: Boolean,
        default: false,
      },
      whatsapp: {
        type: Boolean,
        default: false,
      },
      push: {
        type: Boolean,
        default: false,
      },
    },

    // Delivery status
    deliveryStatus: {
      inApp: {
        status: {
          type: String,
          enum: ["pending", "delivered", "failed"],
          default: "pending",
        },
        deliveredAt: Date,
        error: String,
      },
      email: {
        status: {
          type: String,
          enum: ["pending", "sent", "delivered", "failed"],
          default: "pending",
        },
        sentAt: Date,
        deliveredAt: Date,
        error: String,
      },
      sms: {
        status: {
          type: String,
          enum: ["pending", "sent", "delivered", "failed"],
          default: "pending",
        },
        sentAt: Date,
        deliveredAt: Date,
        error: String,
      },
      whatsapp: {
        status: {
          type: String,
          enum: ["pending", "sent", "delivered", "failed"],
          default: "pending",
        },
        sentAt: Date,
        deliveredAt: Date,
        error: String,
      },
      push: {
        status: {
          type: String,
          enum: ["pending", "sent", "delivered", "failed"],
          default: "pending",
        },
        sentAt: Date,
        deliveredAt: Date,
        error: String,
      },
    },

    // Scheduling
    scheduledFor: {
      type: Date,
      default: null,
    },

    // Expiry and cleanup
    expiresAt: {
      type: Date,
      default: function () {
        // Default: expire after 30 days
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      },
    },

    // Metadata
    metadata: {
      source: String, // e.g., 'sales_module', 'inventory_check'
      version: String,
      tags: [String],
      customData: mongoose.Schema.Types.Mixed,
    },

    // Auto-delete for read notifications
    autoDeleteAfterRead: {
      type: Boolean,
      default: false,
    },
    deleteAfterDays: {
      type: Number,
      default: 30,
    },

    // Status tracking
    status: {
      type: String,
      enum: ["active", "archived", "deleted"],
      default: "active",
    },

    // Interaction tracking
    interactions: {
      views: {
        type: Number,
        default: 0,
      },
      clicks: {
        type: Number,
        default: 0,
      },
      lastInteraction: {
        type: Date,
      },
    },

    // Grouping for related notifications
    groupId: {
      type: String, // For grouping related notifications
    },

    // Template info for bulk notifications
    templateId: {
      type: String,
    },
    templateVariables: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: {virtuals: true},
    toObject: {virtuals: true},
  }
);

// ✅ Indexes for performance optimization
notificationSchema.index({"recipients.userId": 1, createdAt: -1});
notificationSchema.index({"recipients.companyId": 1, createdAt: -1});
notificationSchema.index({type: 1, priority: 1});
notificationSchema.index({expiresAt: 1}, {expireAfterSeconds: 0});
notificationSchema.index({"recipients.readAt": 1});
notificationSchema.index({scheduledFor: 1});
notificationSchema.index({status: 1, createdAt: -1});
notificationSchema.index({groupId: 1, createdAt: -1});
notificationSchema.index({"relatedTo.entityType": 1, "relatedTo.entityId": 1});

// ✅ Compound indexes for common queries
notificationSchema.index({
  "recipients.userId": 1,
  "recipients.readAt": 1,
  status: 1,
  createdAt: -1,
});

notificationSchema.index({
  "recipients.companyId": 1,
  type: 1,
  priority: 1,
  createdAt: -1,
});

// ✅ Virtual for unread status per user
notificationSchema.virtual("isUnread").get(function () {
  return this.recipients.some((recipient) => !recipient.readAt);
});

// ✅ Virtual for read count
notificationSchema.virtual("readCount").get(function () {
  return this.recipients.filter((recipient) => recipient.readAt).length;
});

// ✅ Virtual for total recipients
notificationSchema.virtual("totalRecipients").get(function () {
  return this.recipients.length;
});

// ✅ Virtual for delivery success rate
notificationSchema.virtual("deliverySuccessRate").get(function () {
  const totalChannels = Object.keys(this.channels).filter(
    (channel) => this.channels[channel]
  );
  const successfulDeliveries = totalChannels.filter(
    (channel) =>
      this.deliveryStatus[channel]?.status === "delivered" ||
      this.deliveryStatus[channel]?.status === "sent"
  ).length;

  return totalChannels.length > 0
    ? (successfulDeliveries / totalChannels) * 100
    : 0;
});

// ✅ Methods for notification management
notificationSchema.methods.markAsRead = function (userId, deviceInfo = {}) {
  const recipient = this.recipients.find(
    (r) => r.userId.toString() === userId.toString()
  );
  if (recipient && !recipient.readAt) {
    recipient.readAt = new Date();
    recipient.readBy = {
      device: deviceInfo.device || "unknown",
      ipAddress: deviceInfo.ipAddress || "unknown",
      userAgent: deviceInfo.userAgent || "unknown",
    };
    this.interactions.views += 1;
    this.interactions.lastInteraction = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

notificationSchema.methods.markAsClicked = function (userId) {
  const recipient = this.recipients.find(
    (r) => r.userId.toString() === userId.toString()
  );
  if (recipient) {
    this.interactions.clicks += 1;
    this.interactions.lastInteraction = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

notificationSchema.methods.isReadBy = function (userId) {
  const recipient = this.recipients.find(
    (r) => r.userId.toString() === userId.toString()
  );
  return recipient ? !!recipient.readAt : false;
};

notificationSchema.methods.addRecipient = function (userId, companyId = null) {
  const existingRecipient = this.recipients.find(
    (r) => r.userId.toString() === userId.toString()
  );
  if (!existingRecipient) {
    this.recipients.push({
      userId,
      companyId,
      deliveredAt: new Date(),
    });
    return this.save();
  }
  return Promise.resolve(this);
};

notificationSchema.methods.removeRecipient = function (userId) {
  this.recipients = this.recipients.filter(
    (r) => r.userId.toString() !== userId.toString()
  );
  return this.save();
};

// ✅ Static methods for bulk operations
notificationSchema.statics.findByUser = function (userId, options = {}) {
  const {
    companyId,
    type,
    priority,
    unreadOnly = false,
    limit = 20,
    skip = 0,
    sortBy = "createdAt",
    sortOrder = -1,
  } = options;

  const query = {
    "recipients.userId": userId,
    status: "active",
  };

  if (companyId) {
    query["recipients.companyId"] = companyId;
  }

  if (type) {
    query.type = type;
  }

  if (priority) {
    query.priority = priority;
  }

  if (unreadOnly) {
    query["recipients.readAt"] = null;
  }

  return this.find(query)
    .populate("sender.userId", "name email")
    .sort({[sortBy]: sortOrder})
    .limit(limit)
    .skip(skip)
    .lean();
};

notificationSchema.statics.getUnreadCount = function (
  userId,
  companyId = null
) {
  const query = {
    "recipients.userId": userId,
    "recipients.readAt": null,
    status: "active",
  };

  if (companyId) {
    query["recipients.companyId"] = companyId;
  }

  return this.countDocuments(query);
};

notificationSchema.statics.markAllAsReadForUser = function (
  userId,
  companyId = null,
  deviceInfo = {}
) {
  const query = {
    "recipients.userId": userId,
    "recipients.readAt": null,
    status: "active",
  };

  if (companyId) {
    query["recipients.companyId"] = companyId;
  }

  return this.updateMany(
    query,
    {
      $set: {
        "recipients.$[elem].readAt": new Date(),
        "recipients.$[elem].readBy": {
          device: deviceInfo.device || "unknown",
          ipAddress: deviceInfo.ipAddress || "unknown",
          userAgent: deviceInfo.userAgent || "unknown",
        },
        "interactions.lastInteraction": new Date(),
      },
      $inc: {
        "interactions.views": 1,
      },
    },
    {
      arrayFilters: [{"elem.userId": userId, "elem.readAt": null}],
    }
  );
};

notificationSchema.statics.cleanupExpiredNotifications = function () {
  return this.deleteMany({
    $or: [
      {expiresAt: {$lt: new Date()}},
      {
        status: "active",
        autoDeleteAfterRead: true,
        "recipients.readAt": {$ne: null},
        createdAt: {
          $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        },
      },
    ],
  });
};

notificationSchema.statics.getNotificationStats = function (
  companyId,
  startDate,
  endDate
) {
  const matchStage = {
    "recipients.companyId": mongoose.Types.ObjectId(companyId),
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };

  return this.aggregate([
    {$match: matchStage},
    {
      $group: {
        _id: {
          type: "$type",
          priority: "$priority",
        },
        total: {$sum: 1},
        read: {
          $sum: {
            $cond: [
              {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: "$recipients",
                        cond: {$ne: ["$$this.readAt", null]},
                      },
                    },
                  },
                  0,
                ],
              },
              1,
              0,
            ],
          },
        },
        avgDeliveryTime: {
          $avg: {
            $subtract: ["$deliveryStatus.inApp.deliveredAt", "$createdAt"],
          },
        },
      },
    },
    {
      $project: {
        type: "$_id.type",
        priority: "$_id.priority",
        total: 1,
        read: 1,
        unread: {$subtract: ["$total", "$read"]},
        readRate: {
          $cond: [
            {$eq: ["$total", 0]},
            0,
            {$multiply: [{$divide: ["$read", "$total"]}, 100]},
          ],
        },
        avgDeliveryTime: 1,
      },
    },
    {$sort: {total: -1}},
  ]);
};

// ✅ Pre-save middleware
notificationSchema.pre("save", function (next) {
  // Auto-set expiry if not provided
  if (!this.expiresAt) {
    this.expiresAt = new Date(
      Date.now() + this.deleteAfterDays * 24 * 60 * 60 * 1000
    );
  }

  // Set delivery status for enabled channels
  Object.keys(this.channels).forEach((channel) => {
    if (this.channels[channel] && !this.deliveryStatus[channel]) {
      this.deliveryStatus[channel] = {
        status: "pending",
      };
    }
  });

  next();
});

// ✅ Post-save middleware for logging
notificationSchema.post("save", function (doc) {
  console.log(`✅ Notification saved: ${doc.title} (ID: ${doc._id})`);
});

// ✅ Pre-remove middleware for cleanup
notificationSchema.pre("remove", function (next) {
  console.log(`🗑️ Removing notification: ${this.title} (ID: ${this._id})`);
  next();
});

module.exports = mongoose.model("Notification", notificationSchema);
