const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
      enum: ["image", "document", "video", "audio", "other"],
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {_id: false}
);

const messageReadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  {_id: false}
);

const messageSchema = new mongoose.Schema(
  {
    // ✅ UPDATED: Company-to-Company Chat Fields
    senderCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Sender company ID is required"],
      index: true,
    },
    receiverCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Receiver company ID is required"],
      index: true,
    },

    // ✅ NEW: Party Context Fields for Company-to-Company Chat
    originalPartyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      index: true,
      // This stores the party that initiated the company-to-company chat
    },
    originalPartyName: {
      type: String,
      trim: true,
      maxlength: [100, "Party name cannot exceed 100 characters"],
      // Store party name for quick reference
    },

    // ✅ NEW: Chat Type to distinguish different conversation types
    chatType: {
      type: String,
      enum: ["party-to-company", "company-to-company", "internal", "external"],
      default: "company-to-company",
      index: true,
    },

    // ✅ BACKWARD COMPATIBILITY: Keep old fields for existing data
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },
    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      index: true,
    },

    // Sender Information
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Sender ID is required"],
      index: true,
    },
    senderType: {
      type: String,
      enum: ["user", "party", "system", "company"],
      required: true,
      default: "company", // ✅ UPDATED: Default to "company" for company chat
    },
    senderName: {
      type: String,
      trim: true,
      maxlength: [100, "Sender name cannot exceed 100 characters"],
    },

    // Message Content
    content: {
      type: String,
      required: [true, "Message content is required"],
      maxlength: [5000, "Message content cannot exceed 5000 characters"],
      trim: true,
    },
    messageType: {
      type: String,
      enum: ["whatsapp", "sms", "email", "internal", "notification"],
      required: true,
      default: "internal",
    },
    platform: {
      type: String,
      enum: ["whatsapp", "sms", "email", "internal"],
      required: true,
      default: "internal",
    },

    // Message Status
    status: {
      type: String,
      enum: ["sending", "sent", "delivered", "read", "failed"],
      default: "sending",
      index: true,
    },

    // Template Information
    templateId: {
      type: String,
      trim: true,
      index: true,
    },
    templateName: {
      type: String,
      trim: true,
    },
    templateData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    isTemplate: {
      type: Boolean,
      default: false,
    },

    // External Platform Integration
    externalMessageId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    externalStatus: {
      type: String,
      trim: true,
    },
    externalError: {
      type: String,
      trim: true,
    },

    // Attachments
    attachments: [attachmentSchema],
    hasAttachments: {
      type: Boolean,
      default: false,
    },

    // Threading and Replies
    replyToMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
      index: true,
    },
    isReply: {
      type: Boolean,
      default: false,
    },
    threadId: {
      type: String,
      trim: true,
      index: true,
    },

    // Read Receipts
    readBy: [messageReadSchema],
    readCount: {
      type: Number,
      default: 0,
    },
    isRead: {
      type: Boolean,
      default: false,
    },

    // ✅ UPDATED: Single read fields for company chat
    readAt: {
      type: Date,
    },
    readByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Delivery Information
    deliveredAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },

    // Message Context
    context: {
      invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Sale",
      },
      paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
      },
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      contextType: {
        type: String,
        enum: ["invoice", "payment", "order", "reminder", "general"],
        default: "general",
      },
    },

    // Scheduling
    scheduledAt: {
      type: Date,
    },
    isScheduled: {
      type: Boolean,
      default: false,
    },
    sentAt: {
      type: Date,
    },

    // Message Priority
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    isImportant: {
      type: Boolean,
      default: false,
    },

    // Automation
    isAutomated: {
      type: Boolean,
      default: false,
    },
    automationRuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AutomationRule",
    },

    // Message Direction
    direction: {
      type: String,
      enum: ["inbound", "outbound"],
      required: true,
      default: "outbound",
    },

    // Soft Delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Audit Fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Additional Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {virtuals: true},
    toObject: {virtuals: true},
  }
);

// ✅ UPDATED: Enhanced indexes for company-to-company chat performance
messageSchema.index({senderCompanyId: 1, receiverCompanyId: 1, createdAt: -1});
messageSchema.index({senderCompanyId: 1, createdAt: -1});
messageSchema.index({receiverCompanyId: 1, createdAt: -1});
messageSchema.index({receiverCompanyId: 1, status: 1});
messageSchema.index({senderId: 1, createdAt: -1});
messageSchema.index({status: 1, createdAt: -1});
messageSchema.index({messageType: 1, createdAt: -1});
messageSchema.index({templateId: 1});
messageSchema.index({externalMessageId: 1});
messageSchema.index({threadId: 1, createdAt: 1});
messageSchema.index({isScheduled: 1, scheduledAt: 1});
messageSchema.index({isDeleted: 1, createdAt: -1});

// ✅ NEW: Indexes for party context and chat type
messageSchema.index({originalPartyId: 1, createdAt: -1});
messageSchema.index({chatType: 1, createdAt: -1});
messageSchema.index({
  senderCompanyId: 1,
  receiverCompanyId: 1,
  chatType: 1,
  createdAt: -1,
});
messageSchema.index({
  originalPartyId: 1,
  senderCompanyId: 1,
  receiverCompanyId: 1,
});

// ✅ BACKWARD COMPATIBILITY: Keep old indexes
messageSchema.index({companyId: 1, partyId: 1, createdAt: -1});
messageSchema.index({companyId: 1, createdAt: -1});
messageSchema.index({partyId: 1, createdAt: -1});

// ✅ UPDATED: Compound indexes for company chat queries
messageSchema.index({
  senderCompanyId: 1,
  receiverCompanyId: 1,
  isDeleted: 1,
  createdAt: -1,
});

messageSchema.index({
  receiverCompanyId: 1,
  status: 1,
  messageType: 1,
  createdAt: -1,
});

messageSchema.index({
  senderCompanyId: 1,
  senderType: 1,
  isDeleted: 1,
  createdAt: -1,
});

// Text search index
messageSchema.index({
  content: "text",
  senderName: "text",
});

// ✅ UPDATED: Virtual for other company ID in company-to-company chat
messageSchema.virtual("otherCompanyId").get(function () {
  return this._otherCompanyId;
});

// Virtual for message age
messageSchema.virtual("messageAge").get(function () {
  const now = new Date();
  const created = this.createdAt;
  const diffMs = now - created;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
});

// Virtual for formatted timestamp
messageSchema.virtual("formattedTime").get(function () {
  return this.createdAt.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
});

// Virtual for formatted date
messageSchema.virtual("formattedDate").get(function () {
  return this.createdAt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
});

// Virtual for checking if message is recent
messageSchema.virtual("isRecent").get(function () {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.createdAt > fiveMinutesAgo;
});

// ✅ UPDATED: Enhanced pre-save middleware for company chat
messageSchema.pre("save", function (next) {
  // Set hasAttachments flag
  this.hasAttachments = this.attachments && this.attachments.length > 0;

  // Set readCount
  this.readCount = this.readBy ? this.readBy.length : 0;

  // Set isRead flag
  this.isRead = this.readCount > 0 || this.status === "read";

  // Set sentAt if status is sent and not already set
  if (this.status === "sent" && !this.sentAt) {
    this.sentAt = new Date();
  }

  // Set deliveredAt if status is delivered and not already set
  if (this.status === "delivered" && !this.deliveredAt) {
    this.deliveredAt = new Date();
  }

  // Set readAt if status is read and not already set
  if (this.status === "read" && !this.readAt) {
    this.readAt = new Date();
  }

  // Set failedAt if status is failed and not already set
  if (this.status === "failed" && !this.failedAt) {
    this.failedAt = new Date();
  }

  // ✅ UPDATED: Enhanced createdBy logic for company chat
  if (this.isNew && !this.createdBy) {
    if (
      this.senderId &&
      (this.senderType === "user" || this.senderType === "company")
    ) {
      this.createdBy = this.senderId;
    }
  }

  // ✅ NEW: Auto-set chat type based on field presence
  if (this.isNew && !this.chatType) {
    if (
      this.originalPartyId &&
      this.senderCompanyId &&
      this.receiverCompanyId
    ) {
      this.chatType = "company-to-company";
    } else if (this.companyId && this.partyId) {
      this.chatType = "party-to-company";
    } else {
      this.chatType = "internal";
    }
  }

  // Generate threadId if it's a reply and doesn't have one
  if (this.isReply && this.replyToMessageId && !this.threadId) {
    this.threadId = this.replyToMessageId.toString();
  }

  // ✅ BACKWARD COMPATIBILITY: Auto-populate old fields from new fields
  if (this.senderCompanyId && !this.companyId) {
    this.companyId = this.senderCompanyId;
  }

  // ✅ FIXED: Don't auto-populate partyId with receiverCompanyId for company chat
  // Only populate for backward compatibility with actual party conversations
  if (
    this.chatType === "party-to-company" &&
    this.receiverCompanyId &&
    !this.partyId
  ) {
    this.partyId = this.receiverCompanyId;
  }

  next();
});

// ✅ NEW: Instance method to get the other company in the conversation
messageSchema.methods.getOtherCompanyId = function (myCompanyId) {
  const myCompanyIdStr = myCompanyId.toString();
  const senderIdStr = this.senderCompanyId?.toString();
  const receiverIdStr = this.receiverCompanyId?.toString();

  if (senderIdStr === myCompanyIdStr) {
    return this.receiverCompanyId;
  } else if (receiverIdStr === myCompanyIdStr) {
    return this.senderCompanyId;
  }

  return null;
};

// ✅ NEW: Instance method to check if message is from specific company
messageSchema.methods.isFromCompany = function (companyId) {
  return this.senderCompanyId?.toString() === companyId.toString();
};

// ✅ NEW: Instance method to check if message is to specific company
messageSchema.methods.isToCompany = function (companyId) {
  return this.receiverCompanyId?.toString() === companyId.toString();
};

// Instance method to mark as read by user
messageSchema.methods.markAsReadBy = function (userId) {
  if (
    !this.readBy.some((read) => read.userId.toString() === userId.toString())
  ) {
    this.readBy.push({
      userId: userId,
      readAt: new Date(),
    });
    this.readCount = this.readBy.length;
    this.isRead = true;
    this.status = "read";
    this.readAt = new Date();
    this.readByUserId = userId;
  }
  return this.save();
};

// Instance method to update status
messageSchema.methods.updateStatus = function (
  newStatus,
  externalId = null,
  error = null
) {
  this.status = newStatus;

  if (externalId) {
    this.externalMessageId = externalId;
  }

  if (error) {
    this.externalError = error;
  }

  // Set appropriate timestamp
  const now = new Date();
  switch (newStatus) {
    case "sent":
      this.sentAt = now;
      break;
    case "delivered":
      this.deliveredAt = now;
      break;
    case "read":
      this.readAt = now;
      this.isRead = true;
      break;
    case "failed":
      this.failedAt = now;
      break;
  }

  return this.save();
};

// ✅ UPDATED: Enhanced getChatHistory for company-to-company chat
messageSchema.statics.getChatHistory = function (
  companyId,
  targetCompanyId, // This is now the other company ID, not party ID
  options = {}
) {
  const {
    page = 1,
    limit = 50,
    sortBy = "createdAt",
    sortOrder = "desc",
    messageType = null,
    status = null,
    chatType = null,
  } = options;

  // ✅ UPDATED: Enhanced query for company-to-company chat
  const query = {
    $or: [
      // Primary: company-to-company chat
      {
        senderCompanyId: new mongoose.Types.ObjectId(companyId),
        receiverCompanyId: new mongoose.Types.ObjectId(targetCompanyId),
      },
      {
        senderCompanyId: new mongoose.Types.ObjectId(targetCompanyId),
        receiverCompanyId: new mongoose.Types.ObjectId(companyId),
      },
      // Fallback: old format for backward compatibility
      {
        companyId: new mongoose.Types.ObjectId(companyId),
        partyId: new mongoose.Types.ObjectId(targetCompanyId),
      },
    ],
    isDeleted: false,
  };

  if (messageType) {
    query.messageType = messageType;
  }

  if (status) {
    query.status = status;
  }

  if (chatType) {
    query.chatType = chatType;
  }

  const skip = (page - 1) * limit;
  const sort = {[sortBy]: sortOrder === "desc" ? -1 : 1};

  return this.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate("senderId", "name email username fullName")
    .populate("senderCompanyId", "businessName email phoneNumber")
    .populate("receiverCompanyId", "businessName email phoneNumber")
    .populate("originalPartyId", "name phoneNumber email") // ✅ NEW: Populate original party
    .populate("partyId", "name phoneNumber") // Backward compatibility
    .lean();
};

// ✅ NEW: Specific method for company-to-company chat history
messageSchema.statics.getCompanyToCompanyChatHistory = function (
  fromCompanyId,
  toCompanyId,
  options = {}
) {
  const {
    page = 1,
    limit = 50,
    messageType = null,
    includePartyContext = true,
  } = options;

  const query = {
    $or: [
      {
        senderCompanyId: new mongoose.Types.ObjectId(fromCompanyId),
        receiverCompanyId: new mongoose.Types.ObjectId(toCompanyId),
      },
      {
        senderCompanyId: new mongoose.Types.ObjectId(toCompanyId),
        receiverCompanyId: new mongoose.Types.ObjectId(fromCompanyId),
      },
    ],
    chatType: "company-to-company",
    isDeleted: false,
  };

  if (messageType) {
    query.messageType = messageType;
  }

  const skip = (page - 1) * limit;

  let populateFields = [
    {path: "senderId", select: "name email username fullName"},
    {path: "senderCompanyId", select: "businessName email phoneNumber"},
    {path: "receiverCompanyId", select: "businessName email phoneNumber"},
  ];

  if (includePartyContext) {
    populateFields.push({
      path: "originalPartyId",
      select: "name phoneNumber email linkedCompanyId",
    });
  }

  return this.find(query)
    .sort({createdAt: -1})
    .skip(skip)
    .limit(limit)
    .populate(populateFields)
    .lean();
};

// ✅ NEW: Static method to create company-to-company message
messageSchema.statics.createCompanyMessage = function (messageData) {
  const {
    fromCompanyId,
    toCompanyId,
    senderId,
    content,
    messageType = "internal",
    originalPartyId = null,
    originalPartyName = null,
    attachments = [],
    metadata = {},
  } = messageData;

  return this.create({
    senderCompanyId: fromCompanyId,
    receiverCompanyId: toCompanyId,
    senderId,
    senderType: "company",
    content,
    messageType,
    chatType: "company-to-company",
    originalPartyId,
    originalPartyName,
    attachments,
    direction: "outbound",
    status: "sent",
    metadata: {
      ...metadata,
      chatInitiatedVia: originalPartyId ? "party" : "direct",
    },
  });
};

// ✅ UPDATED: Static method for company unread count
messageSchema.statics.getUnreadCount = function (companyId, userId = null) {
  const query = {
    $or: [
      // New format: company-to-company
      {
        receiverCompanyId: companyId,
        isDeleted: false,
        status: {$ne: "read"},
      },
      // Old format: company-to-party (backward compatibility)
      {
        companyId: companyId,
        isDeleted: false,
        direction: "inbound",
        status: {$ne: "read"},
      },
    ],
  };

  if (userId) {
    query.$and = [{$or: query.$or}, {"readBy.userId": {$ne: userId}}];
    delete query.$or;
  }

  return this.countDocuments(query);
};

// Static method to get messages by template
messageSchema.statics.getMessagesByTemplate = function (companyId, templateId) {
  return this.find({
    $or: [
      {senderCompanyId: companyId}, // New format
      {companyId: companyId}, // Old format
    ],
    templateId: templateId,
    isDeleted: false,
  })
    .sort({createdAt: -1})
    .populate("senderCompanyId", "businessName email phoneNumber")
    .populate("receiverCompanyId", "businessName email phoneNumber")
    .populate("originalPartyId", "name phoneNumber email") // ✅ NEW: Populate original party
    .populate("partyId", "name phoneNumber") // Backward compatibility
    .lean();
};

// ✅ UPDATED: Static method for company conversation summary
messageSchema.statics.getConversationSummary = function (
  companyId,
  otherCompanyId
) {
  return this.aggregate([
    {
      $match: {
        $or: [
          // New format: company-to-company
          {
            $or: [
              {
                senderCompanyId: new mongoose.Types.ObjectId(companyId),
                receiverCompanyId: new mongoose.Types.ObjectId(otherCompanyId),
              },
              {
                senderCompanyId: new mongoose.Types.ObjectId(otherCompanyId),
                receiverCompanyId: new mongoose.Types.ObjectId(companyId),
              },
            ],
          },
          // Old format: company-to-party (backward compatibility)
          {
            companyId: new mongoose.Types.ObjectId(companyId),
            partyId: new mongoose.Types.ObjectId(otherCompanyId),
          },
        ],
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        totalMessages: {$sum: 1},
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  {
                    $eq: [
                      "$receiverCompanyId",
                      new mongoose.Types.ObjectId(companyId),
                    ],
                  },
                  {$ne: ["$status", "read"]},
                ],
              },
              1,
              0,
            ],
          },
        },
        sentByMe: {
          $sum: {
            $cond: [
              {
                $eq: [
                  "$senderCompanyId",
                  new mongoose.Types.ObjectId(companyId),
                ],
              },
              1,
              0,
            ],
          },
        },
        receivedByMe: {
          $sum: {
            $cond: [
              {
                $eq: [
                  "$receiverCompanyId",
                  new mongoose.Types.ObjectId(companyId),
                ],
              },
              1,
              0,
            ],
          },
        },
        firstMessage: {$min: "$createdAt"},
        lastMessage: {$max: "$createdAt"},
        messageTypes: {$addToSet: "$messageType"},
      },
    },
  ]);
};

// ✅ NEW: Static method for company conversations list
messageSchema.statics.findCompanyConversations = function (
  companyId,
  options = {}
) {
  const {page = 1, limit = 20, search = ""} = options;
  const skip = (page - 1) * limit;

  return this.aggregate([
    {
      $match: {
        $or: [
          {senderCompanyId: new mongoose.Types.ObjectId(companyId)},
          {receiverCompanyId: new mongoose.Types.ObjectId(companyId)},
        ],
        isDeleted: false,
      },
    },
    {
      $addFields: {
        otherCompanyId: {
          $cond: {
            if: {
              $eq: ["$senderCompanyId", new mongoose.Types.ObjectId(companyId)],
            },
            then: "$receiverCompanyId",
            else: "$senderCompanyId",
          },
        },
      },
    },
    {
      $sort: {createdAt: -1},
    },
    {
      $group: {
        _id: "$otherCompanyId",
        lastMessage: {$first: "$$ROOT"},
        totalMessages: {$sum: 1},
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  {
                    $eq: [
                      "$receiverCompanyId",
                      new mongoose.Types.ObjectId(companyId),
                    ],
                  },
                  {$ne: ["$status", "read"]},
                ],
              },
              1,
              0,
            ],
          },
        },
        lastMessageAt: {$first: "$createdAt"},
      },
    },
    {
      $lookup: {
        from: "companies",
        localField: "_id",
        foreignField: "_id",
        as: "company",
      },
    },
    {
      $unwind: {
        path: "$company",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: search
        ? {
            $or: [
              {"company.businessName": {$regex: search, $options: "i"}},
              {"company.email": {$regex: search, $options: "i"}},
              {"company.phoneNumber": {$regex: search, $options: "i"}},
            ],
          }
        : {},
    },
    {
      $project: {
        companyId: "$_id",
        company: 1,
        lastMessage: 1,
        totalMessages: 1,
        unreadCount: 1,
        lastMessageAt: 1,
      },
    },
    {
      $sort: {lastMessageAt: -1},
    },
    {$skip: skip},
    {$limit: limit},
  ]);
};

// ✅ NEW: Static method for company chat history
messageSchema.statics.findCompanyChatHistory = function (
  companyId1,
  companyId2,
  options = {}
) {
  const {page = 1, limit = 50, messageType = ""} = options;
  const skip = (page - 1) * limit;

  const query = {
    $or: [
      {
        senderCompanyId: new mongoose.Types.ObjectId(companyId1),
        receiverCompanyId: new mongoose.Types.ObjectId(companyId2),
      },
      {
        senderCompanyId: new mongoose.Types.ObjectId(companyId2),
        receiverCompanyId: new mongoose.Types.ObjectId(companyId1),
      },
    ],
    isDeleted: false,
  };

  if (messageType) {
    query.messageType = messageType;
  }

  return this.find(query)
    .sort({createdAt: -1})
    .skip(skip)
    .limit(limit)
    .populate("senderId", "username fullName email")
    .populate("senderCompanyId", "businessName email phoneNumber")
    .populate("receiverCompanyId", "businessName email phoneNumber")
    .populate("originalPartyId", "name phoneNumber email linkedCompanyId") // ✅ NEW: Populate original party
    .lean();
};

module.exports = mongoose.model("Message", messageSchema);
