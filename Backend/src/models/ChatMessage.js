const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeamChat",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      text: {
        type: String,
        trim: true,
        maxlength: [5000, "Message cannot exceed 5000 characters"],
      },
      type: {
        type: String,
        enum: ["text", "image", "file", "voice", "video", "location", "contact", "whatsapp", "system"],
        default: "text",
        required: true,
      },
      attachments: [{
        name: String,
        url: String,
        size: Number,
        mimeType: String,
        thumbnail: String,
      }],
      metadata: {
        whatsappNumber: String, // For WhatsApp integration messages
        location: {
          latitude: Number,
          longitude: Number,
          address: String,
        },
        contact: {
          name: String,
          phone: String,
          email: String,
        },
        replyTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ChatMessage",
        },
        mentions: [{
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          name: String,
        }],
        systemMessage: {
          action: String, // 'user_joined', 'user_left', 'chat_created', 'settings_changed'
          details: mongoose.Schema.Types.Mixed,
        },
      },
    },
    status: {
      type: String,
      enum: ["sending", "sent", "delivered", "read", "failed"],
      default: "sending",
    },
    readBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    }],
    deliveredTo: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      deliveredAt: {
        type: Date,
        default: Date.now,
      },
    }],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editHistory: [{
      content: String,
      editedAt: {
        type: Date,
        default: Date.now,
      },
    }],
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
    // ✅ NEW: User-specific message deletion (for "delete for me" functionality)
    deletedForUsers: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      deletedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    // ✅ NEW: Message visibility tracking
    hiddenForUsers: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      hiddenAt: {
        type: Date,
        default: Date.now,
      },
    }],
    reactions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      emoji: {
        type: String,
        required: true,
      },
      addedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    scheduled: {
      sendAt: Date,
      isScheduled: {
        type: Boolean,
        default: false,
      },
    },
    tempId: {
      type: String, // For frontend optimistic updates
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
chatMessageSchema.index({ chat: 1, createdAt: -1 });
chatMessageSchema.index({ sender: 1, createdAt: -1 });
chatMessageSchema.index({ "content.type": 1 });
chatMessageSchema.index({ status: 1 });
chatMessageSchema.index({ isDeleted: 1, createdAt: -1 });
chatMessageSchema.index({ "scheduled.sendAt": 1, "scheduled.isScheduled": 1 });

// Virtual for formatted timestamp
chatMessageSchema.virtual("timeAgo").get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return this.createdAt.toLocaleDateString();
});

// Virtual for read status
chatMessageSchema.virtual("isRead").get(function() {
  return this.readBy && this.readBy.length > 0;
});

// Pre-save middleware
chatMessageSchema.pre("save", function(next) {
  // Auto-set status to sent if not specified
  if (this.isNew && this.status === "sending") {
    this.status = "sent";
  }
  
  // Update lastMessage in chat
  if (this.isNew && !this.isDeleted) {
    mongoose.model("TeamChat").findByIdAndUpdate(
      this.chat,
      { 
        lastMessage: this._id,
        lastMessageAt: this.createdAt || new Date(),
        $inc: { "metadata.totalMessages": 1 }
      }
    ).exec();
  }
  
  next();
});

// Method to mark as read by user
chatMessageSchema.methods.markAsRead = function(userId) {
  const existingRead = this.readBy.find(r => r.user.toString() === userId.toString());
  if (!existingRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date(),
    });
  }
  return this;
};

// Method to mark as delivered to user
chatMessageSchema.methods.markAsDelivered = function(userId) {
  const existingDelivered = this.deliveredTo.find(d => d.user.toString() === userId.toString());
  if (!existingDelivered) {
    this.deliveredTo.push({
      user: userId,
      deliveredAt: new Date(),
    });
  }
  return this;
};

// Method to add reaction
chatMessageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji: emoji,
    addedAt: new Date(),
  });
  return this;
};

// Method to remove reaction
chatMessageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  return this;
};

// ✅ NEW: Method to delete message for specific user
chatMessageSchema.methods.deleteForUser = function(userId) {
  const existingDeletion = this.deletedForUsers.find(d => d.user.toString() === userId.toString());
  if (!existingDeletion) {
    this.deletedForUsers.push({
      user: userId,
      deletedAt: new Date(),
    });
  }
  return this;
};

// ✅ NEW: Method to hide message for specific user
chatMessageSchema.methods.hideForUser = function(userId) {
  const existingHidden = this.hiddenForUsers.find(h => h.user.toString() === userId.toString());
  if (!existingHidden) {
    this.hiddenForUsers.push({
      user: userId,
      hiddenAt: new Date(),
    });
  }
  return this;
};

// ✅ NEW: Method to check if message is visible for user
chatMessageSchema.methods.isVisibleForUser = function(userId) {
  // Check if message is globally deleted
  if (this.isDeleted) return false;
  
  // Check if message is deleted for this specific user
  const deletedForUser = this.deletedForUsers.some(d => d.user.toString() === userId.toString());
  if (deletedForUser) return false;
  
  // Check if message is hidden for this specific user
  const hiddenForUser = this.hiddenForUsers.some(h => h.user.toString() === userId.toString());
  if (hiddenForUser) return false;
  
  return true;
};

// ✅ NEW: Method to restore message for specific user
chatMessageSchema.methods.restoreForUser = function(userId) {
  this.deletedForUsers = this.deletedForUsers.filter(d => d.user.toString() !== userId.toString());
  this.hiddenForUsers = this.hiddenForUsers.filter(h => h.user.toString() !== userId.toString());
  return this;
};

// Static method to get chat messages with pagination
chatMessageSchema.statics.getChatMessages = function(chatId, userId, page = 1, limit = 50) {
  return this.find({
    chat: chatId,
    $and: [
      { isDeleted: false },
      { deletedForUsers: { $not: { $elemMatch: { user: userId } } } },
      { hiddenForUsers: { $not: { $elemMatch: { user: userId } } } }
    ]
  })
  .populate("sender", "name email avatar")
  .populate("content.metadata.replyTo")
  .populate("readBy.user", "name")
  .populate("deliveredTo.user", "name")
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip((page - 1) * limit);
};

// ✅ NEW: Static method to get all chat messages including deleted ones for admin
chatMessageSchema.statics.getAllChatMessages = function(chatId, page = 1, limit = 50) {
  return this.find({
    chat: chatId,
    isDeleted: false,
  })
  .populate("sender", "name email avatar")
  .populate("content.metadata.replyTo")
  .populate("readBy.user", "name")
  .populate("deliveredTo.user", "name")
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip((page - 1) * limit);
};

// ✅ NEW: Static method to get unread count for user
chatMessageSchema.statics.getUnreadCountForUser = function(chatId, userId, lastReadMessageId = null) {
  const matchConditions = {
    chat: chatId,
    sender: { $ne: userId },
    isDeleted: false,
    deletedForUsers: { $not: { $elemMatch: { user: userId } } },
    hiddenForUsers: { $not: { $elemMatch: { user: userId } } },
    readBy: { $not: { $elemMatch: { user: userId } } },
  };

  if (lastReadMessageId) {
    matchConditions._id = { $gt: lastReadMessageId };
  }

  return this.countDocuments(matchConditions);
};

// Static method to create system message
chatMessageSchema.statics.createSystemMessage = function(chatId, senderId, action, details) {
  return this.create({
    chat: chatId,
    sender: senderId,
    content: {
      type: "system",
      metadata: {
        systemMessage: {
          action: action,
          details: details,
        },
      },
    },
    status: "sent",
  });
};

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

module.exports = ChatMessage;