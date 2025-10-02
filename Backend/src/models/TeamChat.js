const mongoose = require("mongoose");

const teamChatSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Chat name is required"],
      trim: true,
      maxlength: [100, "Chat name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    type: {
      type: String,
      enum: ["direct", "group", "company"],
      default: "direct",
      required: true,
    },
    participants: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      role: {
        type: String,
        enum: ["admin", "member", "viewer"],
        default: "member",
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
      lastSeen: {
        type: Date,
        default: Date.now,
      },
      isOnline: {
        type: Boolean,
        default: false,
      },
      isTyping: {
        type: Boolean,
        default: false,
      },
      notifications: {
        type: Boolean,
        default: true,
      },
      // ✅ NEW: User-specific chat visibility and deletion
      isHidden: {
        type: Boolean,
        default: false,
      },
      hiddenAt: {
        type: Date,
        default: null,
      },
      isChatDeleted: {
        type: Boolean,
        default: false,
      },
      chatDeletedAt: {
        type: Date,
        default: null,
      },
      // ✅ NEW: Last message read tracking
      lastMessageRead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatMessage",
        default: null,
      },
      lastReadAt: {
        type: Date,
        default: Date.now,
      },
    }],
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatMessage",
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    settings: {
      allowFileSharing: {
        type: Boolean,
        default: true,
      },
      allowWhatsAppIntegration: {
        type: Boolean,
        default: true,
      },
      messageRetention: {
        type: Number,
        default: 365, // days
      },
      maxParticipants: {
        type: Number,
        default: 100,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    metadata: {
      totalMessages: {
        type: Number,
        default: 0,
      },
      totalParticipants: {
        type: Number,
        default: 0,
      },
      lastActivity: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
teamChatSchema.index({ company: 1, isActive: 1 });
teamChatSchema.index({ "participants.user": 1 });
teamChatSchema.index({ lastMessageAt: -1 });
teamChatSchema.index({ type: 1, company: 1 });

// Virtual for unread message count (will be populated by frontend)
teamChatSchema.virtual("unreadCount").get(function() {
  return this._unreadCount || 0;
});

// Pre-save middleware to update metadata
teamChatSchema.pre("save", function(next) {
  if (this.isModified("participants")) {
    this.metadata.totalParticipants = this.participants.length;
  }
  this.metadata.lastActivity = new Date();
  next();
});

// Method to add participant
teamChatSchema.methods.addParticipant = function(userId, role = "member") {
  const existingParticipant = this.participants.find(p => p.user.toString() === userId.toString());
  if (!existingParticipant) {
    this.participants.push({
      user: userId,
      role: role,
      joinedAt: new Date(),
      lastSeen: new Date(),
      isOnline: false,
      isTyping: false,
      notifications: true,
    });
    this.metadata.totalParticipants = this.participants.length;
  }
  return this;
};

// Method to remove participant
teamChatSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(p => p.user.toString() !== userId.toString());
  this.metadata.totalParticipants = this.participants.length;
  return this;
};

// Method to update participant status
teamChatSchema.methods.updateParticipantStatus = function(userId, status) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    Object.assign(participant, status);
  }
  return this;
};

// ✅ NEW: Method to hide chat for specific user
teamChatSchema.methods.hideChatForUser = function(userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.isHidden = true;
    participant.hiddenAt = new Date();
  }
  return this;
};

// ✅ NEW: Method to show chat for specific user
teamChatSchema.methods.showChatForUser = function(userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.isHidden = false;
    participant.hiddenAt = null;
  }
  return this;
};

// ✅ NEW: Method to delete chat for specific user (user-specific deletion)
teamChatSchema.methods.deleteChatForUser = function(userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.isChatDeleted = true;
    participant.chatDeletedAt = new Date();
    participant.isHidden = true;
    participant.hiddenAt = new Date();
  }
  return this;
};

// ✅ NEW: Method to restore chat for specific user
teamChatSchema.methods.restoreChatForUser = function(userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.isChatDeleted = false;
    participant.chatDeletedAt = null;
    participant.isHidden = false;
    participant.hiddenAt = null;
  }
  return this;
};

// ✅ NEW: Method to update last read message for user
teamChatSchema.methods.updateLastReadMessage = function(userId, messageId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.lastMessageRead = messageId;
    participant.lastReadAt = new Date();
  }
  return this;
};

// ✅ NEW: Method to check if chat is visible for user
teamChatSchema.methods.isVisibleForUser = function(userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  return participant && !participant.isChatDeleted && !participant.isHidden;
};

// Static method to find user's chats
teamChatSchema.statics.findUserChats = function(userId, companyId) {
  return this.find({
    "participants.user": userId,
    company: companyId,
    isActive: true,
    $and: [
      {
        participants: {
          $elemMatch: {
            user: userId,
            isChatDeleted: { $ne: true },
            isHidden: { $ne: true }
          }
        }
      }
    ]
  })
  .populate("participants.user", "name email avatar isOnline lastSeen")
  .populate("lastMessage")
  .populate("createdBy", "name email")
  .sort({ lastMessageAt: -1 });
};

// ✅ NEW: Static method to find all user's chats including hidden ones
teamChatSchema.statics.findAllUserChats = function(userId, companyId, includeDeleted = false) {
  const matchConditions = {
    "participants.user": userId,
    company: companyId,
    isActive: true,
  };

  if (!includeDeleted) {
    matchConditions["participants.isChatDeleted"] = { $ne: true };
  }

  return this.find(matchConditions)
    .populate("participants.user", "name email avatar isOnline lastSeen")
    .populate("lastMessage")
    .populate("createdBy", "name email")
    .sort({ lastMessageAt: -1 });
};

// ✅ NEW: Static method to get chat with user-specific data
teamChatSchema.statics.findChatForUser = function(chatId, userId) {
  return this.findOne({
    _id: chatId,
    "participants.user": userId,
    isActive: true,
    participants: {
      $elemMatch: {
        user: userId,
        isChatDeleted: { $ne: true }
      }
    }
  })
  .populate("participants.user", "name email avatar isOnline lastSeen")
  .populate("lastMessage")
  .populate("createdBy", "name email");
};

// Static method to create direct chat between two users
teamChatSchema.statics.createDirectChat = function(user1Id, user2Id, companyId) {
  return this.create({
    name: "Direct Chat",
    type: "direct",
    participants: [
      { user: user1Id, role: "member" },
      { user: user2Id, role: "member" }
    ],
    company: companyId,
    createdBy: user1Id,
    metadata: {
      totalParticipants: 2,
    },
  });
};

const TeamChat = mongoose.model("TeamChat", teamChatSchema);

module.exports = TeamChat;