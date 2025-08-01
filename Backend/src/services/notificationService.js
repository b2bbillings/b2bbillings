const Notification = require("../models/notification");
const User = require("../models/User");
const Company = require("../models/Company");
const mongoose = require("mongoose");

class NotificationService {
  // ===============================
  // 🏗️ CORE NOTIFICATION CREATION
  // ===============================

  // ✅ Create system notification
  async createSystemNotification(data) {
    try {
      const {
        title,
        message,
        type = "system",
        priority = "medium",
        recipients,
        relatedTo,
        actionUrl,
        actionLabel,
        channels = {inApp: true},
        scheduledFor,
        metadata,
        groupId,
        autoDeleteAfterRead = false,
        deleteAfterDays = 30,
      } = data;

      // Validate recipients
      if (!recipients || recipients.length === 0) {
        throw new Error("At least one recipient is required");
      }

      // Ensure recipients are in correct format
      const formattedRecipients = Array.isArray(recipients)
        ? recipients
        : [recipients];

      const notification = new Notification({
        title,
        message,
        type,
        priority,
        recipients: formattedRecipients.map((recipient) => ({
          userId: recipient.userId || recipient,
          companyId: recipient.companyId || null,
        })),
        sender: {
          type: "system",
          systemModule: metadata?.source || "system",
        },
        relatedTo,
        actionRequired: !!actionUrl,
        actionUrl,
        actionLabel,
        channels: {
          inApp: true,
          email: false,
          sms: false,
          whatsapp: false,
          push: false,
          ...channels,
        },
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        metadata: {
          source: metadata?.source || "system",
          version: metadata?.version || "1.0",
          tags: metadata?.tags || [],
          customData: metadata?.customData || {},
          ...metadata,
        },
        groupId,
        autoDeleteAfterRead,
        deleteAfterDays,
      });

      await notification.save();

      // Send immediate notifications if not scheduled
      if (!scheduledFor || new Date(scheduledFor) <= new Date()) {
        await this.deliverNotification(notification);
      }

      return {
        success: true,
        notification: {
          id: notification._id,
          title: notification.title,
          type: notification.type,
          priority: notification.priority,
          recipients: notification.recipients.length,
          createdAt: notification.createdAt,
        },
      };
    } catch (error) {
      console.error("❌ Create system notification error:", error);
      return {success: false, error: error.message};
    }
  }

  // ✅ Create user notification
  async createUserNotification(data, senderId) {
    try {
      const {
        title,
        message,
        type = "info",
        priority = "medium",
        recipients,
        relatedTo,
        actionUrl,
        actionLabel,
        channels = {inApp: true},
        metadata,
      } = data;

      const notification = new Notification({
        title,
        message,
        type,
        priority,
        recipients: Array.isArray(recipients) ? recipients : [recipients],
        sender: {
          type: "user",
          userId: senderId,
        },
        relatedTo,
        actionRequired: !!actionUrl,
        actionUrl,
        actionLabel,
        channels,
        metadata: {
          source: "user_created",
          ...metadata,
        },
      });

      await notification.save();
      await this.deliverNotification(notification);

      return {
        success: true,
        notification: {
          id: notification._id,
          title: notification.title,
          type: notification.type,
          recipients: notification.recipients.length,
        },
      };
    } catch (error) {
      console.error("❌ Create user notification error:", error);
      return {success: false, error: error.message};
    }
  }

  // ===============================
  // 📋 NOTIFICATION RETRIEVAL
  // ===============================

  // ✅ Get user notifications with filters
  async getUserNotifications(filters) {
    try {
      const {
        userId,
        companyId,
        page = 1,
        limit = 20,
        type,
        priority,
        unreadOnly = false,
        startDate,
        endDate,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = filters;

      // Build query
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

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      // Calculate pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Execute query with pagination
      const notifications = await Notification.find(query)
        .populate("sender.userId", "name email")
        .sort({[sortBy]: sortOrder === "desc" ? -1 : 1})
        .limit(limitNum)
        .skip(skip)
        .lean();

      // Get total count
      const total = await Notification.countDocuments(query);

      // Format notifications for user
      const formattedNotifications = notifications.map((notification) => {
        const userRecipient = notification.recipients.find(
          (r) => r.userId.toString() === userId
        );

        return {
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          isRead: !!userRecipient?.readAt,
          readAt: userRecipient?.readAt,
          actionUrl: notification.actionUrl,
          actionLabel: notification.actionLabel,
          actionRequired: notification.actionRequired,
          relatedTo: notification.relatedTo,
          createdAt: notification.createdAt,
          updatedAt: notification.updatedAt,
          sender: notification.sender,
          metadata: notification.metadata,
          groupId: notification.groupId,
          interactions: notification.interactions,
        };
      });

      return {
        success: true,
        data: {
          notifications: formattedNotifications,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum),
            totalItems: total,
            itemsPerPage: limitNum,
            hasNext: pageNum * limitNum < total,
            hasPrev: pageNum > 1,
          },
        },
      };
    } catch (error) {
      console.error("❌ Get user notifications error:", error);
      return {success: false, error: error.message};
    }
  }

  // ✅ Get single notification by ID
  async getNotificationById(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        "recipients.userId": userId,
        status: "active",
      }).populate("sender.userId", "name email");

      if (!notification) {
        return {success: false, error: "Notification not found"};
      }

      const userRecipient = notification.recipients.find(
        (r) => r.userId.toString() === userId
      );

      const formattedNotification = {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        isRead: !!userRecipient?.readAt,
        readAt: userRecipient?.readAt,
        actionUrl: notification.actionUrl,
        actionLabel: notification.actionLabel,
        actionRequired: notification.actionRequired,
        relatedTo: notification.relatedTo,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
        sender: notification.sender,
        metadata: notification.metadata,
        groupId: notification.groupId,
        interactions: notification.interactions,
      };

      return {
        success: true,
        data: {notification: formattedNotification},
      };
    } catch (error) {
      console.error("❌ Get notification by ID error:", error);
      return {success: false, error: error.message};
    }
  }

  // ✅ Get notifications by group
  async getNotificationsByGroup(filters) {
    try {
      const {groupId, userId, page = 1, limit = 20} = filters;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const notifications = await Notification.find({
        groupId,
        "recipients.userId": userId,
        status: "active",
      })
        .populate("sender.userId", "name email")
        .sort({createdAt: -1})
        .limit(limitNum)
        .skip(skip)
        .lean();

      const total = await Notification.countDocuments({
        groupId,
        "recipients.userId": userId,
        status: "active",
      });

      return {
        success: true,
        data: {
          notifications,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum),
            totalItems: total,
            hasNext: pageNum * limitNum < total,
            hasPrev: pageNum > 1,
          },
          groupId,
        },
      };
    } catch (error) {
      console.error("❌ Get notifications by group error:", error);
      return {success: false, error: error.message};
    }
  }

  // ===============================
  // 💬 CHAT NOTIFICATION METHODS
  // ===============================

  // ✅ Notify about new company-to-company chat message
  async notifyNewCompanyChatMessage(
    messageData,
    senderCompany,
    receiverCompany,
    originalPartyInfo = null
  ) {
    try {
      console.log("💬 Creating notification for new company chat message:", {
        messageId: messageData._id,
        fromCompany: senderCompany.businessName,
        toCompany: receiverCompany.businessName,
        messageType: messageData.messageType,
        hasPartyContext: !!originalPartyInfo,
      });

      // Get recipient company users who should receive chat notifications
      const recipientUsers = await User.find({
        companyId: receiverCompany._id,
        isActive: true,
        // Only notify users with chat permissions or management roles
        $or: [
          {
            role: {
              $in: [
                "admin",
                "manager",
                "sales_manager",
                "communication_manager",
              ],
            },
          },
          {permissions: {$in: ["chat", "communication", "all"]}},
          {"notificationPreferences.chat.enabled": {$ne: false}},
        ],
      }).select("_id name email notificationPreferences role");

      if (recipientUsers.length === 0) {
        console.log("⚠️ No users found to notify for chat message");
        return {success: true, notified: 0, reason: "No eligible recipients"};
      }

      // Determine notification priority based on message content and context
      const priority = this.determineChatMessagePriority(
        messageData.content,
        messageData.messageType,
        originalPartyInfo
      );

      // Format message preview (truncate long messages)
      const messagePreview = this.formatChatMessagePreview(messageData.content);

      // Create action URL for the chat
      const actionUrl = this.generateChatActionUrl(
        receiverCompany._id,
        senderCompany._id,
        originalPartyInfo
      );

      // Determine which channels to use for notification
      const channels = this.determineChatNotificationChannels(
        messageData,
        priority,
        recipientUsers
      );

      // Create notification title with context
      const title = this.generateChatNotificationTitle(
        senderCompany,
        originalPartyInfo
      );

      // Create notification message with proper formatting
      const notificationMessage = this.generateChatNotificationMessage(
        senderCompany,
        messagePreview,
        messageData.messageType,
        originalPartyInfo
      );

      // Create notification
      const result = await this.createSystemNotification({
        title,
        message: notificationMessage,
        type: "chat",
        priority,
        recipients: recipientUsers.map((user) => ({
          userId: user._id,
          companyId: receiverCompany._id,
        })),
        relatedTo: {
          entityType: "chat_message",
          entityId: messageData._id,
          entityData: {
            senderCompanyId: senderCompany._id,
            senderCompanyName: senderCompany.businessName,
            receiverCompanyId: receiverCompany._id,
            receiverCompanyName: receiverCompany.businessName,
            messageType: messageData.messageType,
            messageContent: messagePreview,
            originalPartyId: originalPartyInfo?.partyId || null,
            originalPartyName: originalPartyInfo?.partyName || null,
            chatType: "company-to-company",
            senderId: messageData.senderId,
            senderName: messageData.senderName || "Unknown User",
          },
        },
        actionUrl,
        actionLabel: "Reply",
        channels,
        metadata: {
          source: "chat_system",
          tags: ["new_message", "company_chat", messageData.messageType],
          chatType: "company-to-company",
          messageId: messageData._id,
          senderCompanyId: senderCompany._id,
          receiverCompanyId: receiverCompany._id,
          hasPartyContext: !!originalPartyInfo,
          originalPartyId: originalPartyInfo?.partyId || null,
          urgencyLevel: priority,
          deliveryTimestamp: new Date().toISOString(),
        },
        groupId: `company_chat_${Math.min(
          senderCompany._id,
          receiverCompany._id
        )}_${Math.max(senderCompany._id, receiverCompany._id)}`,
        autoDeleteAfterRead: true, // Chat notifications can be auto-deleted once read
        deleteAfterDays: 7, // Clean up after 7 days
      });

      if (result.success) {
        console.log(
          `✅ Chat notification sent to ${recipientUsers.length} users`
        );

        // Track notification metrics
        await this.trackChatNotificationMetrics(
          senderCompany._id,
          receiverCompany._id,
          messageData.messageType,
          recipientUsers.length,
          priority
        );

        return {
          success: true,
          notified: recipientUsers.length,
          notificationId: result.notification.id,
          priority,
          channels: Object.keys(channels).filter((key) => channels[key]),
        };
      } else {
        console.error("❌ Failed to create chat notification:", result.error);
        return {success: false, error: result.error};
      }
    } catch (error) {
      console.error("❌ Error sending chat notification:", error);
      return {success: false, error: error.message};
    }
  }

  // ✅ Notify about new business conversation started
  async notifyNewBusinessConversation(
    senderCompany,
    receiverCompany,
    initialMessage,
    originalPartyInfo = null
  ) {
    try {
      console.log("🆕 Creating notification for new business conversation:", {
        fromCompany: senderCompany.businessName,
        toCompany: receiverCompany.businessName,
        hasPartyContext: !!originalPartyInfo,
      });

      // Get decision makers and communication managers
      const recipientUsers = await User.find({
        companyId: receiverCompany._id,
        isActive: true,
        role: {
          $in: ["admin", "manager", "sales_manager", "business_development"],
        },
      }).select("_id name email role");

      if (recipientUsers.length === 0) {
        return {success: true, notified: 0, reason: "No decision makers found"};
      }

      const actionUrl = this.generateChatActionUrl(
        receiverCompany._id,
        senderCompany._id,
        originalPartyInfo
      );

      const result = await this.createSystemNotification({
        title: "🆕 New Business Conversation",
        message: `${
          senderCompany.businessName
        } has started a new business conversation with your company${
          originalPartyInfo ? ` via ${originalPartyInfo.partyName}` : ""
        }. Initial message: "${this.formatChatMessagePreview(
          initialMessage.content
        )}"`,
        type: "business_communication",
        priority: "medium", // New conversations are important but not urgent
        recipients: recipientUsers.map((user) => ({
          userId: user._id,
          companyId: receiverCompany._id,
        })),
        relatedTo: {
          entityType: "new_conversation",
          entityId: initialMessage._id,
          entityData: {
            senderCompanyId: senderCompany._id,
            senderCompanyName: senderCompany.businessName,
            receiverCompanyId: receiverCompany._id,
            receiverCompanyName: receiverCompany.businessName,
            conversationType: "company-to-company",
            isNewConversation: true,
            originalPartyId: originalPartyInfo?.partyId || null,
            originalPartyName: originalPartyInfo?.partyName || null,
            initialMessageType: initialMessage.messageType,
          },
        },
        actionUrl,
        actionLabel: "View Conversation",
        channels: {
          inApp: true,
          email: true, // New business conversations should trigger email
          sms: false,
          whatsapp: false,
          push: true,
        },
        metadata: {
          source: "chat_system",
          tags: ["new_conversation", "business_communication", "company_chat"],
          chatType: "new_business_conversation",
          conversationInitiator: senderCompany._id,
          hasPartyContext: !!originalPartyInfo,
        },
        groupId: `new_conversation_${senderCompany._id}_${receiverCompany._id}`,
        autoDeleteAfterRead: false, // Keep new conversation notifications
        deleteAfterDays: 30,
      });

      if (result.success) {
        console.log(
          `✅ New conversation notification sent to ${recipientUsers.length} users`
        );
        return {
          success: true,
          notified: recipientUsers.length,
          notificationId: result.notification.id,
        };
      } else {
        return {success: false, error: result.error};
      }
    } catch (error) {
      console.error("❌ Error sending new conversation notification:", error);
      return {success: false, error: error.message};
    }
  }

  // ✅ Notify about urgent/important chat messages
  async notifyUrgentChatMessage(
    messageData,
    senderCompany,
    receiverCompany,
    urgencyReason = "urgent_keywords"
  ) {
    try {
      console.log("🚨 Creating urgent chat notification:", {
        messageId: messageData._id,
        urgencyReason,
        fromCompany: senderCompany.businessName,
      });

      // Get all active users for urgent messages
      const recipientUsers = await User.find({
        companyId: receiverCompany._id,
        isActive: true,
        $or: [
          {role: {$in: ["admin", "manager"]}},
          {"notificationPreferences.urgentMessages.enabled": true},
        ],
      }).select("_id name email phoneNumber role");

      if (recipientUsers.length === 0) {
        return {
          success: true,
          notified: 0,
          reason: "No users for urgent notifications",
        };
      }

      const messagePreview = this.formatChatMessagePreview(messageData.content);
      const actionUrl = this.generateChatActionUrl(
        receiverCompany._id,
        senderCompany._id
      );

      const result = await this.createSystemNotification({
        title: "🚨 Urgent Message",
        message: `URGENT: ${senderCompany.businessName} sent an urgent message: "${messagePreview}". Please respond immediately.`,
        type: "urgent_communication",
        priority: "critical",
        recipients: recipientUsers.map((user) => ({
          userId: user._id,
          companyId: receiverCompany._id,
        })),
        relatedTo: {
          entityType: "urgent_message",
          entityId: messageData._id,
          entityData: {
            senderCompanyId: senderCompany._id,
            senderCompanyName: senderCompany.businessName,
            messageContent: messagePreview,
            urgencyReason,
            messageType: messageData.messageType,
          },
        },
        actionUrl,
        actionLabel: "Respond Now",
        channels: {
          inApp: true,
          email: true,
          sms: true, // Send SMS for urgent messages
          whatsapp: true,
          push: true,
        },
        metadata: {
          source: "chat_system",
          tags: ["urgent", "chat", "immediate_attention", urgencyReason],
          urgencyLevel: "critical",
          requiresImmediateResponse: true,
        },
        autoDeleteAfterRead: false, // Don't auto-delete urgent messages
        deleteAfterDays: 30,
      });

      return result.success
        ? {
            success: true,
            notified: recipientUsers.length,
            notificationId: result.notification.id,
          }
        : {success: false, error: result.error};
    } catch (error) {
      console.error("❌ Error sending urgent chat notification:", error);
      return {success: false, error: error.message};
    }
  }

  // ===============================
  // 🔧 CHAT NOTIFICATION HELPER METHODS
  // ===============================

  // ✅ Determine chat message priority
  determineChatMessagePriority(content, messageType, originalPartyInfo = null) {
    const urgentKeywords = [
      "urgent",
      "asap",
      "emergency",
      "critical",
      "immediate",
      "priority",
      "help",
      "problem",
      "issue",
      "error",
      "failure",
      "down",
      "broken",
      "payment",
      "invoice",
      "overdue",
      "deadline",
      "expire",
      "cancel",
    ];

    const importantKeywords = [
      "meeting",
      "proposal",
      "contract",
      "agreement",
      "deal",
      "order",
      "delivery",
      "shipment",
      "schedule",
      "appointment",
      "confirm",
      "approve",
    ];

    const contentLower = content.toLowerCase();

    // Check for urgent keywords
    if (urgentKeywords.some((keyword) => contentLower.includes(keyword))) {
      return "critical";
    }

    // Check for important keywords
    if (importantKeywords.some((keyword) => contentLower.includes(keyword))) {
      return "high";
    }

    // Email messages are typically more formal/important
    if (messageType === "email") {
      return "medium";
    }

    // Messages with party context might be more important
    if (originalPartyInfo) {
      return "medium";
    }

    // Default priority for regular chat messages
    return "low";
  }

  // ✅ Format chat message preview
  formatChatMessagePreview(content, maxLength = 100) {
    if (!content) return "No content";

    // Remove excessive whitespace
    const cleanContent = content.trim().replace(/\s+/g, " ");

    if (cleanContent.length <= maxLength) {
      return cleanContent;
    }

    // Truncate at word boundary
    const truncated = cleanContent.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");

    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + "...";
    }

    return truncated + "...";
  }

  // ✅ Generate chat action URL
  generateChatActionUrl(
    receiverCompanyId,
    senderCompanyId,
    originalPartyInfo = null
  ) {
    const baseUrl = `/companies/${receiverCompanyId}/chats`;

    if (originalPartyInfo?.partyId) {
      return `${baseUrl}?party=${
        originalPartyInfo.partyId
      }&from=${senderCompanyId}&partyName=${encodeURIComponent(
        originalPartyInfo.partyName || ""
      )}`;
    }

    return `${baseUrl}?from=${senderCompanyId}`;
  }

  // ✅ Determine notification channels
  determineChatNotificationChannels(messageData, priority, recipientUsers) {
    const channels = {
      inApp: true, // Always show in-app
      email: false,
      sms: false,
      whatsapp: false,
      push: true, // Always send push notifications for real-time updates
    };

    // Email for important messages or business communications
    if (
      ["critical", "high"].includes(priority) ||
      messageData.messageType === "email"
    ) {
      channels.email = true;
    }

    // SMS only for critical messages
    if (priority === "critical") {
      channels.sms = true;
    }

    // WhatsApp for high priority messages if users have opted in
    if (["critical", "high"].includes(priority)) {
      const hasWhatsAppUsers = recipientUsers.some(
        (user) => user.notificationPreferences?.whatsapp?.enabled !== false
      );
      channels.whatsapp = hasWhatsAppUsers;
    }

    return channels;
  }

  // ✅ Generate notification title
  generateChatNotificationTitle(senderCompany, originalPartyInfo = null) {
    if (originalPartyInfo?.partyName) {
      return `💬 New Message via ${originalPartyInfo.partyName}`;
    }

    return `💬 New Message from ${senderCompany.businessName}`;
  }

  // ✅ Generate notification message
  generateChatNotificationMessage(
    senderCompany,
    messagePreview,
    messageType,
    originalPartyInfo = null
  ) {
    const senderName = senderCompany.businessName || "Unknown Company";

    let message = `${senderName}`;

    if (originalPartyInfo?.partyName) {
      message += ` (via ${originalPartyInfo.partyName})`;
    }

    message += `: ${messagePreview}`;

    // Add message type indicator for non-standard types
    if (messageType && messageType !== "internal") {
      message += ` [${messageType.toUpperCase()}]`;
    }

    return message;
  }

  // ✅ Track chat notification metrics
  async trackChatNotificationMetrics(
    senderCompanyId,
    receiverCompanyId,
    messageType,
    recipientCount,
    priority
  ) {
    try {
      // This could be enhanced to store metrics in a separate collection
      console.log("📊 Chat notification metrics:", {
        senderCompanyId,
        receiverCompanyId,
        messageType,
        recipientCount,
        priority,
        timestamp: new Date().toISOString(),
      });

      // TODO: Implement actual metrics storage if needed
      // const metrics = new ChatNotificationMetrics({
      //   senderCompanyId,
      //   receiverCompanyId,
      //   messageType,
      //   recipientCount,
      //   priority,
      //   notificationDate: new Date()
      // });
      // await metrics.save();
    } catch (error) {
      console.warn(
        "⚠️ Failed to track chat notification metrics:",
        error.message
      );
    }
  }

  // ✅ Batch notify multiple companies about group messages
  async notifyGroupChatMessage(
    messageData,
    senderCompany,
    recipientCompanies = [],
    groupInfo = {}
  ) {
    try {
      console.log("👥 Creating group chat notifications:", {
        messageId: messageData._id,
        senderCompany: senderCompany.businessName,
        recipientCompanies: recipientCompanies.length,
        groupName: groupInfo.name,
      });

      const results = [];

      for (const recipientCompany of recipientCompanies) {
        const result = await this.notifyNewCompanyChatMessage(
          messageData,
          senderCompany,
          recipientCompany,
          {
            partyId: groupInfo.id,
            partyName: groupInfo.name,
            isGroup: true,
          }
        );

        results.push({
          companyId: recipientCompany._id,
          companyName: recipientCompany.businessName,
          result,
        });
      }

      const successCount = results.filter((r) => r.result.success).length;
      const totalNotified = results.reduce(
        (sum, r) => sum + (r.result.notified || 0),
        0
      );

      return {
        success: true,
        companiesNotified: successCount,
        totalUsersNotified: totalNotified,
        results,
      };
    } catch (error) {
      console.error("❌ Error sending group chat notifications:", error);
      return {success: false, error: error.message};
    }
  }

  // ✅ Check if message contains urgent keywords
  isUrgentMessage(content) {
    const urgentKeywords = [
      "urgent",
      "asap",
      "emergency",
      "critical",
      "immediate",
      "priority",
      "help",
      "problem",
      "issue",
      "error",
      "failure",
      "down",
      "broken",
    ];

    const contentLower = content.toLowerCase();
    return urgentKeywords.some((keyword) => contentLower.includes(keyword));
  }

  // ✅ Clean up old chat notifications
  async cleanupOldChatNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const result = await Notification.updateMany(
        {
          type: {
            $in: ["chat", "business_communication", "urgent_communication"],
          },
          createdAt: {$lt: cutoffDate},
          "metadata.source": "chat_system",
          status: "active",
        },
        {
          status: "deleted",
          deletedAt: new Date(),
        }
      );

      console.log(
        `🧹 Cleaned up ${result.modifiedCount} old chat notifications`
      );

      return {
        success: true,
        deletedCount: result.modifiedCount,
      };
    } catch (error) {
      console.error("❌ Error cleaning up chat notifications:", error);
      return {success: false, error: error.message};
    }
  }
  // ===============================
  // ✏️ NOTIFICATION UPDATES
  // ===============================

  // ✅ Mark notification as read
  async markNotificationAsRead(notificationId, userId, deviceInfo = {}) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        "recipients.userId": userId,
        status: "active",
      });

      if (!notification) {
        return {success: false, error: "Notification not found"};
      }

      // Find user's recipient record
      const recipientIndex = notification.recipients.findIndex(
        (r) => r.userId.toString() === userId
      );

      if (recipientIndex === -1) {
        return {success: false, error: "Not authorized"};
      }

      // Check if already read
      if (notification.recipients[recipientIndex].readAt) {
        return {
          success: true,
          message: "Notification already marked as read",
          data: {
            readAt: notification.recipients[recipientIndex].readAt,
          },
        };
      }

      // Mark as read
      notification.recipients[recipientIndex].readAt = new Date();
      notification.recipients[recipientIndex].readBy = deviceInfo;
      await notification.save();

      // Emit real-time update if socket manager exists
      try {
        const {socketManager} = require("../socket/SocketManager");
        if (socketManager) {
          socketManager.sendToUser(userId, "notification_read", {
            notificationId: notification._id,
            readAt: notification.recipients[recipientIndex].readAt,
          });
        }
      } catch (socketError) {
        console.warn("⚠️ Socket notification failed:", socketError.message);
      }

      return {
        success: true,
        message: "Notification marked as read",
        data: {
          readAt: notification.recipients[recipientIndex].readAt,
        },
      };
    } catch (error) {
      console.error("❌ Mark notification as read error:", error);
      return {success: false, error: error.message};
    }
  }

  // ✅ Mark all notifications as read
  async markAllNotificationsAsRead(userId, companyId = null, deviceInfo = {}) {
    try {
      const query = {
        "recipients.userId": userId,
        "recipients.readAt": null,
        status: "active",
      };

      if (companyId) {
        query["recipients.companyId"] = companyId;
      }

      const notifications = await Notification.find(query);

      let markedCount = 0;
      for (const notification of notifications) {
        const recipientIndex = notification.recipients.findIndex(
          (r) => r.userId.toString() === userId && !r.readAt
        );

        if (recipientIndex !== -1) {
          notification.recipients[recipientIndex].readAt = new Date();
          notification.recipients[recipientIndex].readBy = deviceInfo;
          await notification.save();
          markedCount++;
        }
      }

      // Emit real-time update if socket manager exists
      try {
        const {socketManager} = require("../socket/SocketManager");
        if (socketManager) {
          socketManager.sendToUser(userId, "all_notifications_read", {
            count: markedCount,
            companyId,
          });
        }
      } catch (socketError) {
        console.warn("⚠️ Socket notification failed:", socketError.message);
      }

      return {
        success: true,
        data: {
          markedCount,
          companyId,
        },
      };
    } catch (error) {
      console.error("❌ Mark all notifications as read error:", error);
      return {success: false, error: error.message};
    }
  }

  // ✅ Mark notification as clicked
  async markNotificationAsClicked(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        "recipients.userId": userId,
      });

      if (!notification) {
        return {success: false, error: "Notification not found"};
      }

      // Update click count
      if (!notification.interactions) {
        notification.interactions = {views: 0, clicks: 0};
      }
      notification.interactions.clicks =
        (notification.interactions.clicks || 0) + 1;
      notification.interactions.lastInteraction = new Date();
      await notification.save();

      return {
        success: true,
        data: {
          clicks: notification.interactions.clicks,
        },
      };
    } catch (error) {
      console.error("❌ Mark notification as clicked error:", error);
      return {success: false, error: error.message};
    }
  }

  // ===============================
  // 📊 NOTIFICATION ANALYTICS
  // ===============================

  // ✅ Get unread count
  async getUnreadCount(userId, companyId = null) {
    try {
      const query = {
        "recipients.userId": userId,
        "recipients.readAt": null,
        status: "active",
      };

      if (companyId) {
        query["recipients.companyId"] = companyId;
      }

      const count = await Notification.countDocuments(query);

      return {
        success: true,
        data: {
          unreadCount: count,
          userId,
          companyId: companyId || null,
        },
      };
    } catch (error) {
      console.error("❌ Get unread count error:", error);
      return {success: false, error: error.message};
    }
  }

  // ✅ Get notification statistics
  async getNotificationStatistics(filters) {
    try {
      const {
        companyId,
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate = new Date(),
      } = filters;

      // Get overall stats
      const totalNotifications = await Notification.countDocuments({
        "recipients.companyId": companyId,
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      });

      const totalRead = await Notification.countDocuments({
        "recipients.companyId": companyId,
        "recipients.readAt": {$ne: null},
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      });

      // Get breakdown by type
      const typeBreakdown = await Notification.aggregate([
        {
          $match: {
            "recipients.companyId": new mongoose.Types.ObjectId(companyId),
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          },
        },
        {
          $group: {
            _id: "$type",
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
          },
        },
        {
          $project: {
            type: "$_id",
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
          },
        },
        {$sort: {total: -1}},
      ]);

      return {
        success: true,
        data: {
          overview: {
            totalNotifications,
            totalRead,
            totalUnread: totalNotifications - totalRead,
            readRate:
              totalNotifications > 0
                ? (totalRead / totalNotifications) * 100
                : 0,
          },
          breakdown: typeBreakdown,
          period: {
            startDate,
            endDate,
          },
        },
      };
    } catch (error) {
      console.error("❌ Get notification statistics error:", error);
      return {success: false, error: error.message};
    }
  }

  // ===============================
  // 🗑️ NOTIFICATION MANAGEMENT
  // ===============================

  // ✅ Delete notification
  async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        "recipients.userId": userId,
        status: "active",
      });

      if (!notification) {
        return {success: false, error: "Notification not found"};
      }

      // Check if user is recipient
      const isRecipient = notification.recipients.some(
        (r) => r.userId.toString() === userId
      );

      if (!isRecipient) {
        return {success: false, error: "Not authorized"};
      }

      // Remove user from recipients
      notification.recipients = notification.recipients.filter(
        (r) => r.userId.toString() !== userId
      );

      // If no recipients left, mark as deleted
      if (notification.recipients.length === 0) {
        notification.status = "deleted";
      }

      await notification.save();

      return {success: true};
    } catch (error) {
      console.error("❌ Delete notification error:", error);
      return {success: false, error: error.message};
    }
  }

  // ✅ Archive notification
  async archiveNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        "recipients.userId": userId,
        status: "active",
      });

      if (!notification) {
        return {success: false, error: "Notification not found"};
      }

      notification.status = "archived";
      await notification.save();

      return {success: true};
    } catch (error) {
      console.error("❌ Archive notification error:", error);
      return {success: false, error: error.message};
    }
  }

  // ✅ Cleanup expired notifications
  async cleanupExpiredNotifications() {
    try {
      const expiredNotifications = await Notification.find({
        expiresAt: {$lt: new Date()},
        status: {$ne: "deleted"},
      });

      for (const notification of expiredNotifications) {
        notification.status = "deleted";
        await notification.save();
      }

      return {
        success: true,
        data: {
          deletedCount: expiredNotifications.length,
        },
      };
    } catch (error) {
      console.error("❌ Cleanup expired notifications error:", error);
      return {success: false, error: error.message};
    }
  }

  // ===============================
  // 🎯 SPECIALIZED NOTIFICATIONS
  // ===============================

  // ✅ Notify about low inventory
  async notifyLowInventory(product, currentStock, threshold, companyId) {
    try {
      const users = await User.find({
        companyId,
        role: {$in: ["admin", "manager", "inventory_manager"]},
        isActive: true,
      }).select("_id name email");

      if (users.length === 0) {
        console.log("⚠️ No users found for inventory notification");
        return {success: false, error: "No users to notify"};
      }

      const recipients = users.map((user) => ({
        userId: user._id,
        companyId,
      }));

      const urgencyLevel =
        currentStock <= threshold * 0.3
          ? "critical"
          : currentStock <= threshold * 0.5
          ? "high"
          : "medium";

      return await this.createSystemNotification({
        title: "⚠️ Low Inventory Alert",
        message: `${product.name} is running low! Current stock: ${currentStock} units (threshold: ${threshold} units). Please reorder soon.`,
        type: "inventory",
        priority: urgencyLevel,
        recipients,
        relatedTo: {
          entityType: "product",
          entityId: product._id,
          entityData: {
            productName: product.name,
            currentStock,
            threshold,
            sku: product.sku || product.code,
            category: product.category,
            unit: product.unit,
          },
        },
        actionUrl: `/companies/${companyId}/products/${product._id}`,
        actionLabel: "View Product",
        channels: {
          inApp: true,
          email: urgencyLevel === "critical",
          sms: urgencyLevel === "critical" && currentStock === 0,
        },
        metadata: {
          source: "inventory_management",
          tags: ["low_stock", urgencyLevel, "automated"],
          customData: {
            stockPercentage: (currentStock / threshold) * 100,
            isOutOfStock: currentStock === 0,
          },
        },
        groupId: `inventory_alerts_${companyId}`,
        autoDeleteAfterRead: false,
      });
    } catch (error) {
      console.error("❌ Low inventory notification error:", error);
      return {success: false, error: error.message};
    }
  }

  // ✅ Notify about new orders
  async notifyNewOrder(order, companyId) {
    try {
      const users = await User.find({
        companyId,
        role: {$in: ["admin", "manager", "sales_manager"]},
        isActive: true,
      }).select("_id name email");

      if (users.length === 0) {
        return {success: false, error: "No users to notify"};
      }

      const recipients = users.map((user) => ({
        userId: user._id,
        companyId,
      }));

      const isHighValue = order.totalAmount > 25000;
      const priority = isHighValue ? "high" : "medium";

      return await this.createSystemNotification({
        title: "🛒 New Order Received",
        message: `New order #${
          order.orderNumber
        } received for ₹${order.totalAmount.toLocaleString()} from ${
          order.customerName
        }${isHighValue ? " (High Value Order)" : ""}`,
        type: "order",
        priority,
        recipients,
        relatedTo: {
          entityType: "order",
          entityId: order._id,
          entityData: {
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            totalAmount: order.totalAmount,
            itemCount: order.items?.length || 0,
            orderDate: order.orderDate,
          },
        },
        actionUrl: `/companies/${companyId}/orders/${order._id}`,
        actionLabel: "View Order",
        channels: {
          inApp: true,
          email: isHighValue,
          sms: order.totalAmount > 50000,
        },
        metadata: {
          source: "order_management",
          tags: ["new_order", "sales", isHighValue ? "high_value" : "standard"],
          customData: {
            isHighValue,
            orderValue: order.totalAmount,
          },
        },
        groupId: `orders_${companyId}`,
      });
    } catch (error) {
      console.error("❌ New order notification error:", error);
      return {success: false, error: error.message};
    }
  }

  // ✅ Notify about payment reminders
  async notifyPaymentDue(invoice, companyId) {
    try {
      const users = await User.find({
        companyId,
        role: {$in: ["admin", "manager", "accounts_manager"]},
        isActive: true,
      }).select("_id name email");

      if (users.length === 0) {
        return {success: false, error: "No users to notify"};
      }

      const recipients = users.map((user) => ({
        userId: user._id,
        companyId,
      }));

      const daysOverdue = Math.ceil(
        (new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24)
      );

      const priority =
        daysOverdue > 30
          ? "critical"
          : daysOverdue > 15
          ? "high"
          : daysOverdue > 7
          ? "medium"
          : "low";

      const urgencyText =
        daysOverdue > 30 ? "URGENT: " : daysOverdue > 15 ? "Important: " : "";

      return await this.createSystemNotification({
        title: "💰 Payment Reminder",
        message: `${urgencyText}Payment overdue by ${daysOverdue} days for invoice #${
          invoice.invoiceNumber
        }. Amount: ₹${invoice.pendingAmount.toLocaleString()} from ${
          invoice.customerName
        }`,
        type: "reminder",
        priority,
        recipients,
        relatedTo: {
          entityType: "sale",
          entityId: invoice._id,
          entityData: {
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.customerName,
            pendingAmount: invoice.pendingAmount,
            totalAmount: invoice.totalAmount,
            daysOverdue,
            dueDate: invoice.dueDate,
          },
        },
        actionUrl: `/companies/${companyId}/sales/${invoice._id}`,
        actionLabel: "View Invoice",
        channels: {
          inApp: true,
          email: daysOverdue > 7,
          sms: daysOverdue > 30,
          whatsapp: daysOverdue > 15,
        },
        metadata: {
          source: "payment_management",
          tags: ["payment_due", "urgent", "finance"],
          customData: {
            daysOverdue,
            overdueAmount: invoice.pendingAmount,
            riskLevel: priority,
          },
        },
        groupId: `payments_${companyId}`,
      });
    } catch (error) {
      console.error("❌ Payment reminder notification error:", error);
      return {success: false, error: error.message};
    }
  }

  // ✅ Notify about task assignments
  async notifyTaskAssignment(task, assignedUser, assignedBy, companyId) {
    try {
      const recipients = [
        {
          userId: assignedUser._id,
          companyId,
        },
      ];

      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      const isUrgent = dueDate && dueDate - new Date() < 24 * 60 * 60 * 1000;

      return await this.createSystemNotification({
        title: "📋 New Task Assigned",
        message: `You have been assigned a new task: "${task.title}" by ${
          assignedBy.name
        }${dueDate ? `. Due: ${dueDate.toLocaleDateString()}` : ""}${
          isUrgent ? " (URGENT)" : ""
        }`,
        type: "task",
        priority: isUrgent ? "high" : task.priority || "medium",
        recipients,
        relatedTo: {
          entityType: "task",
          entityId: task._id,
          entityData: {
            taskTitle: task.title,
            description: task.description,
            assignedBy: assignedBy.name,
            dueDate: task.dueDate,
            priority: task.priority,
            category: task.category,
          },
        },
        actionUrl: `/companies/${companyId}/tasks/${task._id}`,
        actionLabel: "View Task",
        channels: {
          inApp: true,
          email:
            task.priority === "high" ||
            task.priority === "critical" ||
            isUrgent,
          sms: task.priority === "critical",
        },
        metadata: {
          source: "task_management",
          tags: ["task_assignment", task.priority || "medium"],
          customData: {
            assignedById: assignedBy._id,
            isUrgent,
            taskCategory: task.category,
          },
        },
        groupId: `tasks_${assignedUser._id}`,
      });
    } catch (error) {
      console.error("❌ Task assignment notification error:", error);
      return {success: false, error: error.message};
    }
  }

  // ✅ Notify about new chat messages
  async notifyNewChatMessage(
    message,
    sender,
    recipients,
    companyId,
    chatInfo = {}
  ) {
    try {
      const notificationRecipients = recipients.map((userId) => ({
        userId,
        companyId,
      }));

      const messagePreview =
        message.content.length > 100
          ? message.content.substring(0, 100) + "..."
          : message.content;

      return await this.createSystemNotification({
        title: `💬 New Message${
          chatInfo.groupName ? ` in ${chatInfo.groupName}` : ""
        }`,
        message: `${sender.name}: ${messagePreview}`,
        type: "chat",
        priority: "low",
        recipients: notificationRecipients,
        relatedTo: {
          entityType: "chat",
          entityId: message._id,
          entityData: {
            senderName: sender.name,
            senderId: sender._id,
            messageType: message.messageType || "text",
            content: messagePreview,
            chatType: chatInfo.type || "direct",
            groupName: chatInfo.groupName,
          },
        },
        actionUrl: `/companies/${companyId}/chat${
          chatInfo.chatId ? `/${chatInfo.chatId}` : ""
        }`,
        actionLabel: "View Chat",
        channels: {
          inApp: true,
          email: false,
          push: true,
        },
        metadata: {
          source: "chat_system",
          tags: ["new_message", "chat"],
          customData: {
            chatId: chatInfo.chatId,
            messageId: message._id,
          },
        },
        groupId: `chat_${chatInfo.chatId || "direct"}`,
        autoDeleteAfterRead: true,
        deleteAfterDays: 7,
      });
    } catch (error) {
      console.error("❌ Chat message notification error:", error);
      return {success: false, error: error.message};
    }
  }

  // ✅ Notify about user login/security events
  async notifySecurityEvent(
    eventType,
    user,
    deviceInfo = {},
    companyId = null
  ) {
    try {
      const recipients = [
        {
          userId: user._id,
          companyId,
        },
      ];

      // Add company admins for suspicious activities
      if (
        ["failed_login_attempts", "new_device_login"].includes(eventType) &&
        companyId
      ) {
        const admins = await User.find({
          companyId,
          role: "admin",
          isActive: true,
          _id: {$ne: user._id},
        }).select("_id");

        recipients.push(
          ...admins.map((admin) => ({
            userId: admin._id,
            companyId,
          }))
        );
      }

      const eventMessages = {
        successful_login: `Welcome back! You've successfully logged in from ${
          deviceInfo.location || "unknown location"
        }`,
        failed_login_attempts: `⚠️ Multiple failed login attempts detected on your account from ${
          deviceInfo.ipAddress || "unknown IP"
        }`,
        new_device_login: `🔐 New device login detected: ${
          deviceInfo.device || "Unknown device"
        } from ${deviceInfo.location || "unknown location"}`,
        password_changed: "✅ Your password has been successfully changed",
        profile_updated: "ℹ️ Your profile information has been updated",
        suspicious_activity:
          "🚨 Suspicious activity detected on your account. Please review your recent activity.",
      };

      const priority = [
        "failed_login_attempts",
        "suspicious_activity",
      ].includes(eventType)
        ? "high"
        : "low";

      return await this.createSystemNotification({
        title: "🔒 Security Notification",
        message: eventMessages[eventType] || "Security event notification",
        type: "security",
        priority,
        recipients,
        relatedTo: {
          entityType: "user",
          entityId: user._id,
          entityData: {
            userName: user.name,
            email: user.email,
            eventType,
            deviceInfo,
          },
        },
        actionUrl: companyId
          ? `/companies/${companyId}/profile/security`
          : "/profile/security",
        actionLabel: "Review Security",
        channels: {
          inApp: true,
          email: [
            "failed_login_attempts",
            "suspicious_activity",
            "password_changed",
          ].includes(eventType),
          sms: eventType === "suspicious_activity",
        },
        metadata: {
          source: "security_system",
          tags: ["security", eventType],
          customData: {
            eventType,
            deviceInfo,
            timestamp: new Date(),
          },
        },
        autoDeleteAfterRead: eventType === "successful_login",
      });
    } catch (error) {
      console.error("❌ Security event notification error:", error);
      return {success: false, error: error.message};
    }
  }

  // ✅ Notify about system maintenance
  async notifySystemMaintenance(maintenanceInfo, companyId = null) {
    try {
      let recipients = [];

      if (companyId) {
        const users = await User.find({
          companyId,
          isActive: true,
        }).select("_id");
        recipients = users.map((user) => ({userId: user._id, companyId}));
      } else {
        const users = await User.find({isActive: true}).select("_id");
        recipients = users.map((user) => ({userId: user._id}));
      }

      const {
        title = "System Maintenance Scheduled",
        message,
        startTime,
        endTime,
        affectedServices = [],
        maintenanceType = "scheduled",
      } = maintenanceInfo;

      const priority = maintenanceType === "emergency" ? "critical" : "medium";

      return await this.createSystemNotification({
        title: `🔧 ${title}`,
        message:
          message ||
          `System maintenance is scheduled from ${new Date(
            startTime
          ).toLocaleString()} to ${new Date(
            endTime
          ).toLocaleString()}. Some services may be temporarily unavailable.`,
        type: "system",
        priority,
        recipients,
        relatedTo: {
          entityType: "system",
          entityData: {
            maintenanceType,
            startTime,
            endTime,
            affectedServices,
            duration: new Date(endTime) - new Date(startTime),
          },
        },
        actionUrl: "/system/status",
        actionLabel: "View Status",
        channels: {
          inApp: true,
          email: priority === "critical",
          push: true,
        },
        scheduledFor:
          maintenanceType === "scheduled"
            ? new Date(Date.now() + 60 * 60 * 1000)
            : null,
        metadata: {
          source: "system_administration",
          tags: ["maintenance", maintenanceType],
          customData: {
            affectedServices,
            estimatedDuration: new Date(endTime) - new Date(startTime),
          },
        },
        autoDeleteAfterRead: false,
      });
    } catch (error) {
      console.error("❌ System maintenance notification error:", error);
      return {success: false, error: error.message};
    }
  }

  // ✅ Notify about reports completion
  async notifyReportGenerated(report, user, companyId) {
    try {
      const recipients = [
        {
          userId: user._id,
          companyId,
        },
      ];

      return await this.createSystemNotification({
        title: "📊 Report Generated",
        message: `Your ${report.type} report "${report.name}" has been generated successfully and is ready for download.`,
        type: "report",
        priority: "low",
        recipients,
        relatedTo: {
          entityType: "report",
          entityId: report._id,
          entityData: {
            reportName: report.name,
            reportType: report.type,
            dateRange: report.dateRange,
            fileSize: report.fileSize,
            format: report.format,
          },
        },
        actionUrl: `/companies/${companyId}/reports/${report._id}`,
        actionLabel: "Download Report",
        channels: {
          inApp: true,
          email: report.format === "pdf" || report.size > 1000000,
        },
        metadata: {
          source: "report_system",
          tags: ["report_ready", report.type],
          customData: {
            reportId: report._id,
            generatedAt: new Date(),
          },
        },
        autoDeleteAfterRead: true,
        deleteAfterDays: 15,
      });
    } catch (error) {
      console.error("❌ Report notification error:", error);
      return {success: false, error: error.message};
    }
  }

  // ===============================
  // 🔧 UTILITY METHODS
  // ===============================

  // ✅ Bulk create notifications
  async createBulkNotifications(notificationsData) {
    try {
      const results = [];

      for (const notificationData of notificationsData) {
        const result = await this.createSystemNotification(notificationData);
        results.push(result);
      }

      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      return {
        success: true,
        summary: {
          total: results.length,
          successful,
          failed,
        },
        results,
      };
    } catch (error) {
      console.error("❌ Bulk notifications error:", error);
      return {success: false, error: error.message};
    }
  }

  // ✅ Schedule recurring notifications
  async scheduleRecurringNotification(notificationData, schedule) {
    try {
      const {
        frequency, // 'daily', 'weekly', 'monthly'
        time = "09:00",
        daysOfWeek = [1, 2, 3, 4, 5], // Monday to Friday
        dayOfMonth = 1,
        endDate,
      } = schedule;

      console.log(
        `📅 Scheduling recurring notification: ${notificationData.title}`
      );
      console.log(`Frequency: ${frequency}, Time: ${time}`);

      // TODO: Implement actual scheduling logic here
      // This would create scheduled jobs that create notifications at specified intervals

      return {
        success: true,
        scheduleId: `recurring_${Date.now()}`,
        message: "Recurring notification scheduled successfully",
      };
    } catch (error) {
      console.error("❌ Schedule recurring notification error:", error);
      return {success: false, error: error.message};
    }
  }

  // ✅ Deliver notification (internal method)
  async deliverNotification(notification) {
    try {
      console.log(`📢 Delivering notification: ${notification.title}`);

      // Initialize delivery status if not exists
      if (!notification.deliveryStatus) {
        notification.deliveryStatus = {
          inApp: {status: "pending"},
          email: {status: "pending"},
          sms: {status: "pending"},
          whatsapp: {status: "pending"},
          push: {status: "pending"},
        };
      }

      // Update delivery status to delivered for in-app
      notification.deliveryStatus.inApp.status = "delivered";
      notification.deliveryStatus.inApp.deliveredAt = new Date();

      await notification.save();

      // Send real-time notifications via socket
      for (const recipient of notification.recipients) {
        try {
          const {socketManager} = require("../socket/SocketManager");
          if (socketManager && socketManager.sendToUser) {
            socketManager.sendToUser(
              recipient.userId.toString(),
              "new_notification",
              {
                id: notification._id,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                priority: notification.priority,
                actionUrl: notification.actionUrl,
                actionLabel: notification.actionLabel,
                actionRequired: notification.actionRequired,
                createdAt: notification.createdAt,
                relatedTo: notification.relatedTo,
                metadata: notification.metadata,
              }
            );
          }
        } catch (socketError) {
          console.warn(
            "⚠️ Socket delivery failed for user:",
            recipient.userId,
            socketError.message
          );
        }
      }

      // Send email notifications if enabled
      if (notification.channels?.email) {
        try {
          await this.sendEmailNotifications(notification);
        } catch (emailError) {
          console.warn("⚠️ Email delivery failed:", emailError.message);
        }
      }

      // Send SMS notifications if enabled
      if (notification.channels?.sms) {
        try {
          await this.sendSMSNotifications(notification);
        } catch (smsError) {
          console.warn("⚠️ SMS delivery failed:", smsError.message);
        }
      }

      // Send WhatsApp notifications if enabled
      if (notification.channels?.whatsapp) {
        try {
          await this.sendWhatsAppNotifications(notification);
        } catch (whatsappError) {
          console.warn("⚠️ WhatsApp delivery failed:", whatsappError.message);
        }
      }

      // Send push notifications if enabled
      if (notification.channels?.push) {
        try {
          await this.sendPushNotifications(notification);
        } catch (pushError) {
          console.warn("⚠️ Push delivery failed:", pushError.message);
        }
      }

      console.log(
        `✅ Notification delivered successfully: ${notification.title}`
      );

      return {success: true};
    } catch (error) {
      console.error("❌ Deliver notification error:", error);

      // Update delivery status to failed
      if (notification.deliveryStatus?.inApp) {
        notification.deliveryStatus.inApp.status = "failed";
        notification.deliveryStatus.inApp.error = error.message;
        try {
          await notification.save();
        } catch (saveError) {
          console.error("❌ Failed to save delivery error:", saveError);
        }
      }

      return {success: false, error: error.message};
    }
  }

  // ✅ Send email notifications
  async sendEmailNotifications(notification) {
    try {
      console.log(`📧 Sending email notification: ${notification.title}`);

      // TODO: Implement email sending logic here
      // This would integrate with your email service (SendGrid, AWS SES, etc.)

      // Update delivery status
      if (notification.deliveryStatus?.email) {
        notification.deliveryStatus.email.status = "sent";
        notification.deliveryStatus.email.sentAt = new Date();
        await notification.save();
      }

      console.log(`✅ Email notification sent: ${notification.title}`);
    } catch (error) {
      console.error("❌ Email notification error:", error);
      if (notification.deliveryStatus?.email) {
        notification.deliveryStatus.email.status = "failed";
        notification.deliveryStatus.email.error = error.message;
        await notification.save();
      }
      throw error;
    }
  }

  // ✅ Send SMS notifications
  async sendSMSNotifications(notification) {
    try {
      console.log(`📱 Sending SMS notification: ${notification.title}`);

      // TODO: Implement SMS sending logic here
      // This would integrate with your SMS service (Twilio, AWS SNS, etc.)

      // Update delivery status
      if (notification.deliveryStatus?.sms) {
        notification.deliveryStatus.sms.status = "sent";
        notification.deliveryStatus.sms.sentAt = new Date();
        await notification.save();
      }

      console.log(`✅ SMS notification sent: ${notification.title}`);
    } catch (error) {
      console.error("❌ SMS notification error:", error);
      if (notification.deliveryStatus?.sms) {
        notification.deliveryStatus.sms.status = "failed";
        notification.deliveryStatus.sms.error = error.message;
        await notification.save();
      }
      throw error;
    }
  }

  // ✅ Send WhatsApp notifications
  async sendWhatsAppNotifications(notification) {
    try {
      console.log(`💬 Sending WhatsApp notification: ${notification.title}`);

      // TODO: Implement WhatsApp sending logic here
      // This would integrate with WhatsApp Business API

      // Update delivery status
      if (notification.deliveryStatus?.whatsapp) {
        notification.deliveryStatus.whatsapp.status = "sent";
        notification.deliveryStatus.whatsapp.sentAt = new Date();
        await notification.save();
      }

      console.log(`✅ WhatsApp notification sent: ${notification.title}`);
    } catch (error) {
      console.error("❌ WhatsApp notification error:", error);
      if (notification.deliveryStatus?.whatsapp) {
        notification.deliveryStatus.whatsapp.status = "failed";
        notification.deliveryStatus.whatsapp.error = error.message;
        await notification.save();
      }
      throw error;
    }
  }

  // ✅ Send push notifications
  async sendPushNotifications(notification) {
    try {
      console.log(`🔔 Sending push notification: ${notification.title}`);

      // TODO: Implement push notification logic here
      // This would integrate with Firebase Cloud Messaging (FCM) or similar

      // Update delivery status
      if (notification.deliveryStatus?.push) {
        notification.deliveryStatus.push.status = "sent";
        notification.deliveryStatus.push.sentAt = new Date();
        await notification.save();
      }

      console.log(`✅ Push notification sent: ${notification.title}`);
    } catch (error) {
      console.error("❌ Push notification error:", error);
      if (notification.deliveryStatus?.push) {
        notification.deliveryStatus.push.status = "failed";
        notification.deliveryStatus.push.error = error.message;
        await notification.save();
      }
      throw error;
    }
  }

  // ✅ Get notification templates
  getNotificationTemplates() {
    return {
      lowInventory: {
        title: "⚠️ Low Inventory Alert",
        type: "inventory",
        priority: "medium",
      },
      newOrder: {
        title: "🛒 New Order Received",
        type: "order",
        priority: "medium",
      },
      paymentReminder: {
        title: "💰 Payment Reminder",
        type: "reminder",
        priority: "high",
      },
      taskAssignment: {
        title: "📋 New Task Assigned",
        type: "task",
        priority: "medium",
      },
      securityAlert: {
        title: "🔒 Security Alert",
        type: "security",
        priority: "high",
      },
      systemMaintenance: {
        title: "🔧 System Maintenance",
        type: "system",
        priority: "medium",
      },
    };
  }

  // ✅ Validate notification data
  validateNotificationData(data) {
    const errors = [];

    if (!data.title || data.title.trim().length === 0) {
      errors.push("Title is required");
    }

    if (!data.message || data.message.trim().length === 0) {
      errors.push("Message is required");
    }

    if (!data.recipients || data.recipients.length === 0) {
      errors.push("At least one recipient is required");
    }

    if (data.title && data.title.length > 200) {
      errors.push("Title cannot exceed 200 characters");
    }

    if (data.message && data.message.length > 1000) {
      errors.push("Message cannot exceed 1000 characters");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

module.exports = new NotificationService();
