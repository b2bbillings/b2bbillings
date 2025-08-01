const Message = require("../models/Message");

// Helper function to safely get models
const getModel = (modelName) => {
  try {
    return require(`../models/${modelName}`);
  } catch (error) {
    console.warn(`Model ${modelName} not found:`, error.message);
    return null;
  }
};

class MessageHandler {
  constructor(socketHandler = null) {
    // ✅ FIX: Accept socketHandler to emit real-time events
    this.socketHandler = socketHandler;
  }

  // ✅ CRITICAL FIX: Enhanced message processing with real-time emission
  async processMessage(messageData) {
    const {messageType, content, senderCompanyId, receiverCompanyId, tempId} =
      messageData;

    console.log("🔄 Processing message:", {
      messageType,
      senderCompanyId,
      receiverCompanyId,
      content: content?.substring(0, 50) + "...",
      tempId,
    });

    try {
      let result;
      switch (messageType) {
        case "whatsapp":
          result = await this.processWhatsAppMessage(messageData);
          break;
        case "sms":
          result = await this.processSMSMessage(messageData);
          break;
        case "email":
          result = await this.processEmailMessage(messageData);
          break;
        default:
          result = await this.processDefaultMessage(messageData);
      }

      // ✅ CRITICAL FIX: Emit real-time message to receiver
      if (result.success && this.socketHandler) {
        console.log("📡 Emitting real-time message:", {
          messageId: result.message._id,
          senderCompanyId,
          receiverCompanyId,
          tempId,
        });

        // Emit to receiver company
        this.socketHandler.emitToCompany(receiverCompanyId, "new_message", {
          ...result.message.toObject(),
          tempId: tempId,
        });

        // Emit confirmation to sender
        this.socketHandler.emitToCompany(senderCompanyId, "message_sent", {
          messageId: result.message._id,
          tempId: tempId,
          status: "sent",
        });

        console.log("✅ Real-time events emitted successfully");
      }

      return result;
    } catch (error) {
      console.error("❌ Process message error:", error);

      // ✅ FIX: Emit error to sender
      if (this.socketHandler && messageData.senderCompanyId) {
        this.socketHandler.emitToCompany(
          messageData.senderCompanyId,
          "message_failed",
          {
            tempId: messageData.tempId,
            error: error.message,
          }
        );
      }

      throw error;
    }
  }

  // ✅ CRITICAL FIX: Enhanced WhatsApp message processing
  async processWhatsAppMessage(messageData) {
    try {
      console.log("📱 Processing WhatsApp message for company chat:", {
        senderCompanyId: messageData.senderCompanyId,
        receiverCompanyId: messageData.receiverCompanyId,
        senderId: messageData.senderId,
        tempId: messageData.tempId,
      });

      // ✅ FIX: Create message with all required fields
      const messageToCreate = {
        content: messageData.content,
        senderCompanyId: messageData.senderCompanyId,
        receiverCompanyId: messageData.receiverCompanyId,
        senderId: messageData.senderId || null,
        senderName: messageData.senderName || "Unknown",
        messageType: "whatsapp",
        platform: "whatsapp",
        status: "sent",
        chatType: "company-to-company",
        direction: "outbound",
        createdAt: new Date(),
        isDeleted: false,
        // ✅ FIX: Add metadata for tracking
        metadata: {
          tempId: messageData.tempId,
          partyId: messageData.party?._id,
          partyName: messageData.party?.name,
        },
      };

      const message = await Message.create(messageToCreate);

      console.log("✅ WhatsApp message created successfully:", {
        messageId: message._id,
        senderCompanyId: message.senderCompanyId,
        receiverCompanyId: message.receiverCompanyId,
        tempId: messageData.tempId,
      });

      return {
        success: true,
        message,
        externalId: `wa_${Date.now()}`,
        platform: "whatsapp",
      };
    } catch (error) {
      console.error("❌ WhatsApp message processing error:", error);

      // ✅ FIX: Try to update message status to failed if it exists
      if (messageData._id) {
        try {
          await Message.findByIdAndUpdate(messageData._id, {
            status: "failed",
            failedAt: new Date(),
            externalError: error.message,
          });
        } catch (updateError) {
          console.error("❌ Failed to update message status:", updateError);
        }
      }

      throw error;
    }
  }

  // ✅ CRITICAL FIX: Enhanced SMS processing
  async processSMSMessage(messageData) {
    try {
      console.log("💬 Processing SMS message for company chat:", {
        senderCompanyId: messageData.senderCompanyId,
        receiverCompanyId: messageData.receiverCompanyId,
        tempId: messageData.tempId,
      });

      const messageToCreate = {
        content: messageData.content,
        senderCompanyId: messageData.senderCompanyId,
        receiverCompanyId: messageData.receiverCompanyId,
        senderId: messageData.senderId || null,
        senderName: messageData.senderName || "Unknown",
        messageType: "sms",
        platform: "sms",
        status: "sent",
        chatType: "company-to-company",
        direction: "outbound",
        createdAt: new Date(),
        isDeleted: false,
        metadata: {
          tempId: messageData.tempId,
          partyId: messageData.party?._id,
          partyName: messageData.party?.name,
        },
      };

      const message = await Message.create(messageToCreate);

      return {
        success: true,
        message,
        externalId: `sms_${Date.now()}`,
        platform: "sms",
      };
    } catch (error) {
      console.error("❌ SMS processing error:", error);
      throw error;
    }
  }

  // ✅ CRITICAL FIX: Enhanced email message processing
  async processEmailMessage(messageData) {
    try {
      console.log("📧 Processing email message for company chat:", {
        senderCompanyId: messageData.senderCompanyId,
        receiverCompanyId: messageData.receiverCompanyId,
        tempId: messageData.tempId,
      });

      const messageToCreate = {
        content: messageData.content,
        senderCompanyId: messageData.senderCompanyId,
        receiverCompanyId: messageData.receiverCompanyId,
        senderId: messageData.senderId || null,
        senderName: messageData.senderName || "Unknown",
        messageType: "email",
        platform: "email",
        status: "sent",
        chatType: "company-to-company",
        direction: "outbound",
        createdAt: new Date(),
        isDeleted: false,
        metadata: {
          tempId: messageData.tempId,
          partyId: messageData.party?._id,
          partyName: messageData.party?.name,
        },
      };

      const message = await Message.create(messageToCreate);

      return {
        success: true,
        message,
        externalId: `email_${Date.now()}`,
        platform: "email",
      };
    } catch (error) {
      console.error("❌ Email processing error:", error);
      throw error;
    }
  }

  // ✅ CRITICAL FIX: Enhanced default message processing
  async processDefaultMessage(messageData) {
    try {
      console.log("💼 Processing default message for company chat:", {
        senderCompanyId: messageData.senderCompanyId,
        receiverCompanyId: messageData.receiverCompanyId,
        tempId: messageData.tempId,
      });

      const messageToCreate = {
        content: messageData.content,
        senderCompanyId: messageData.senderCompanyId,
        receiverCompanyId: messageData.receiverCompanyId,
        senderId: messageData.senderId || null,
        senderName: messageData.senderName || "Unknown",
        messageType: messageData.messageType || "whatsapp",
        platform: "internal",
        status: "sent",
        chatType: "company-to-company",
        direction: "outbound",
        createdAt: new Date(),
        isDeleted: false,
        metadata: {
          tempId: messageData.tempId,
          partyId: messageData.party?._id,
          partyName: messageData.party?.name,
        },
      };

      const message = await Message.create(messageToCreate);

      return {
        success: true,
        message,
        platform: "internal",
      };
    } catch (error) {
      console.error("❌ Default message processing error:", error);
      throw error;
    }
  }

  // ✅ CRITICAL FIX: Enhanced handle message with socket emission
  async handleMessage(messageData) {
    try {
      console.log("🔄 Handling company message:", {
        senderCompanyId: messageData.senderCompanyId,
        receiverCompanyId: messageData.receiverCompanyId,
        messageType: messageData.messageType,
        content: messageData.content?.substring(0, 50) + "...",
        tempId: messageData.tempId,
      });

      // ✅ CRITICAL: Process the message
      const result = await this.processMessage(messageData);

      if (result.success) {
        console.log("✅ Message handled successfully:", {
          messageId: result.message._id,
          platform: result.platform,
          tempId: messageData.tempId,
        });

        // ✅ CRITICAL FIX: Update message delivery status
        await this.updateMessageStatus(result.message._id, "delivered");
      }

      return result;
    } catch (error) {
      console.error("❌ Handle message error:", error);
      return {
        success: false,
        error: error.message,
        tempId: messageData.tempId,
      };
    }
  }

  // ✅ NEW: Update message status
  async updateMessageStatus(messageId, status) {
    try {
      const updateData = {
        status,
        updatedAt: new Date(),
      };

      if (status === "delivered") {
        updateData.deliveredAt = new Date();
      } else if (status === "read") {
        updateData.readAt = new Date();
      } else if (status === "failed") {
        updateData.failedAt = new Date();
      }

      const message = await Message.findByIdAndUpdate(messageId, updateData, {
        new: true,
      });

      console.log("✅ Message status updated:", {
        messageId,
        status,
        updated: !!message,
      });

      // ✅ FIX: Emit status update to sender
      if (message && this.socketHandler) {
        this.socketHandler.emitToCompany(
          message.senderCompanyId,
          "message_status_updated",
          {
            messageId,
            status,
            timestamp: new Date(),
          }
        );
      }

      return {success: true, message};
    } catch (error) {
      console.error("❌ Update message status error:", error);
      return {success: false, error: error.message};
    }
  }

  // ✅ CRITICAL FIX: Set socket handler
  setSocketHandler(socketHandler) {
    this.socketHandler = socketHandler;
    console.log("✅ MessageHandler: Socket handler set");
  }

  // ✅ CRITICAL FIX: Updated chat history for company-to-company
  async getChatHistory(myCompanyId, targetCompanyId, options = {}) {
    try {
      console.log("📚 Getting company-to-company chat history:", {
        myCompanyId,
        targetCompanyId,
        options,
      });

      const {
        page = 1,
        limit = 50,
        sortBy = "createdAt",
        sortOrder = "desc",
        messageType = null,
        startDate = null,
        endDate = null,
      } = options;

      const skip = (page - 1) * limit;
      const sort = {[sortBy]: sortOrder === "desc" ? -1 : 1};

      // ✅ FIX: Build query for company-to-company messages
      const query = {
        $or: [
          {
            senderCompanyId: myCompanyId,
            receiverCompanyId: targetCompanyId,
          },
          {
            senderCompanyId: targetCompanyId,
            receiverCompanyId: myCompanyId,
          },
        ],
        isDeleted: false,
        chatType: "company-to-company",
      };

      if (messageType) {
        query.messageType = messageType;
      }

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      console.log("🔍 Chat history query:", JSON.stringify(query, null, 2));

      const messages = await Message.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("senderId", "name email username fullName")
        .populate("senderCompanyId", "businessName")
        .populate("receiverCompanyId", "businessName")
        .lean();

      const totalMessages = await Message.countDocuments(query);

      console.log("✅ Chat history retrieved:", {
        messagesCount: messages.length,
        totalMessages,
        myCompanyId,
        targetCompanyId,
      });

      return {
        success: true,
        data: {
          messages,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalMessages / limit),
            totalMessages,
            hasMore: skip + messages.length < totalMessages,
          },
        },
      };
    } catch (error) {
      console.error("❌ Get chat history error:", error);
      return {
        success: false,
        message: "Failed to retrieve chat history",
        error: error.message,
      };
    }
  }

  // ✅ ENHANCED: Get message templates with party data
  getMessageTemplates(partyData, paymentSummary = null) {
    if (!partyData) {
      return {};
    }

    const formatAmount = (amount) => {
      return Math.abs(amount || 0).toLocaleString("en-IN");
    };

    const templates = {
      payment_reminder: {
        title: "Payment Reminder",
        content: `Dear ${partyData.name},

This is a friendly reminder that you have an outstanding balance of ₹${formatAmount(
          partyData.currentBalance
        )} due for payment.

Please arrange for the settlement at your earliest convenience.

Regards,
${partyData.companyName || "Your Business Team"}`,
        category: "payment",
        messageType: "whatsapp",
      },
      thank_you: {
        title: "Thank You",
        content: `Dear ${partyData.name},

Thank you for your recent payment! We appreciate your business and prompt payment.

Current account status: ₹${formatAmount(partyData.currentBalance)} ${
          partyData.currentBalance >= 0 ? "(Credit)" : "(Outstanding)"
        }

Best regards,
${partyData.companyName || "Your Business Team"}`,
        category: "acknowledgment",
        messageType: "whatsapp",
      },
      invoice_notification: {
        title: "Invoice Ready",
        content: `Dear ${partyData.name},

Your invoice is ready and has been generated. Please find the details in your account.

Total Amount: ₹${formatAmount(partyData.currentBalance)}

Thank you for your business!

Regards,
${partyData.companyName || "Your Business Team"}`,
        category: "invoice",
        messageType: "email",
      },
      statement_request: {
        title: "Statement Request",
        content: `Dear ${partyData.name},

As requested, please find your account statement attached. 

Current Balance: ₹${formatAmount(partyData.currentBalance)} ${
          partyData.currentBalance >= 0 ? "(Credit)" : "(Outstanding)"
        }

For any queries, please contact us.

Best regards,
${partyData.companyName || "Your Business Team"}`,
        category: "statement",
        messageType: "email",
      },
      meeting_reminder: {
        title: "Meeting Reminder",
        content: `Dear ${partyData.name},

This is a reminder about our scheduled meeting.

Please confirm your availability.

Best regards,
${partyData.companyName || "Your Business Team"}`,
        category: "meeting",
        messageType: "sms",
      },
      order_confirmation: {
        title: "Order Confirmation",
        content: `Dear ${partyData.name},

Your order has been confirmed and is being processed.

We will notify you once it's ready for delivery.

Thank you for your business!

Regards,
${partyData.companyName || "Your Business Team"}`,
        category: "order",
        messageType: "whatsapp",
      },
      business_introduction: {
        title: "Business Introduction",
        content: `Dear ${partyData.name},

We are pleased to introduce our business and services to you.

We look forward to establishing a mutually beneficial business relationship.

Best regards,
${partyData.companyName || "Your Business Team"}`,
        category: "introduction",
        messageType: "whatsapp",
      },
      follow_up: {
        title: "Follow Up",
        content: `Dear ${partyData.name},

We wanted to follow up on our previous communication regarding your requirements.

Please let us know if you need any additional information.

Best regards,
${partyData.companyName || "Your Business Team"}`,
        category: "follow_up",
        messageType: "whatsapp",
      },
    };

    return templates;
  }

  // ✅ CRITICAL FIX: Mark messages as read for company chat
  async markMessagesAsRead(messageIds, userId) {
    try {
      if (!Array.isArray(messageIds)) {
        messageIds = [messageIds];
      }

      console.log("✅ Marking messages as read:", {
        messageIds,
        userId,
        count: messageIds.length,
      });

      const result = await Message.updateMany(
        {
          _id: {$in: messageIds},
          status: {$ne: "read"}, // Only update if not already read
        },
        {
          status: "read",
          readAt: new Date(),
          readBy: userId,
        }
      );

      console.log("✅ Messages marked as read:", {
        modifiedCount: result.modifiedCount,
        messageIds,
      });

      return {
        success: true,
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      console.error("❌ Mark messages as read error:", error);
      return {
        success: false,
        message: "Failed to mark messages as read",
        error: error.message,
      };
    }
  }

  // ✅ CRITICAL FIX: Get unread message count for company chat
  async getUnreadMessageCount(myCompanyId, targetCompanyId = null) {
    try {
      const query = {
        receiverCompanyId: myCompanyId,
        isDeleted: false,
        status: {$ne: "read"},
        chatType: "company-to-company",
      };

      if (targetCompanyId) {
        query.senderCompanyId = targetCompanyId;
      }

      const count = await Message.countDocuments(query);

      console.log("📊 Unread message count:", {
        myCompanyId,
        targetCompanyId,
        count,
      });

      return {success: true, count};
    } catch (error) {
      console.error("❌ Get unread count error:", error);
      return {success: false, count: 0, error: error.message};
    }
  }

  // ✅ CRITICAL FIX: Get conversation summary for company chat
  async getConversationSummary(myCompanyId, targetCompanyId) {
    try {
      console.log("📋 Getting conversation summary:", {
        myCompanyId,
        targetCompanyId,
      });

      const query = {
        $or: [
          {
            senderCompanyId: myCompanyId,
            receiverCompanyId: targetCompanyId,
          },
          {
            senderCompanyId: targetCompanyId,
            receiverCompanyId: myCompanyId,
          },
        ],
        isDeleted: false,
        chatType: "company-to-company",
      };

      const [totalMessages, unreadCount, lastMessage] = await Promise.all([
        Message.countDocuments(query),
        Message.countDocuments({
          ...query,
          receiverCompanyId: myCompanyId,
          status: {$ne: "read"},
        }),
        Message.findOne(query).sort({createdAt: -1}).lean(),
      ]);

      const summary = {
        totalMessages,
        unreadCount,
        lastMessage: lastMessage?.content || null,
        lastMessageAt: lastMessage?.createdAt || null,
        otherCompanyId: targetCompanyId,
      };

      console.log("✅ Conversation summary:", summary);

      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      console.error("❌ Get conversation summary error:", error);
      return {
        success: false,
        message: "Failed to get conversation summary",
        error: error.message,
      };
    }
  }

  // ✅ ENHANCED: Search messages for company chat
  async searchMessages(myCompanyId, searchQuery, options = {}) {
    try {
      const {
        targetCompanyId = null,
        messageType = null,
        page = 1,
        limit = 20,
      } = options;

      const query = {
        $or: [{senderCompanyId: myCompanyId}, {receiverCompanyId: myCompanyId}],
        isDeleted: false,
        chatType: "company-to-company",
        content: {$regex: searchQuery, $options: "i"}, // Case-insensitive search
      };

      if (targetCompanyId) {
        query.$or = [
          {
            senderCompanyId: myCompanyId,
            receiverCompanyId: targetCompanyId,
          },
          {
            senderCompanyId: targetCompanyId,
            receiverCompanyId: myCompanyId,
          },
        ];
      }

      if (messageType) query.messageType = messageType;

      const skip = (page - 1) * limit;

      const messages = await Message.find(query)
        .sort({createdAt: -1})
        .skip(skip)
        .limit(limit)
        .populate("senderId", "name email username fullName")
        .populate("senderCompanyId", "businessName")
        .populate("receiverCompanyId", "businessName")
        .lean();

      const totalMessages = await Message.countDocuments(query);

      console.log("🔍 Search results:", {
        searchQuery,
        myCompanyId,
        targetCompanyId,
        messagesFound: messages.length,
        totalMessages,
      });

      return {
        success: true,
        data: {
          messages,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalMessages / limit),
            totalMessages,
            hasMore: skip + messages.length < totalMessages,
          },
        },
      };
    } catch (error) {
      console.error("❌ Search messages error:", error);
      return {
        success: false,
        message: "Failed to search messages",
        error: error.message,
      };
    }
  }

  // ✅ ENHANCED: Bulk operations for company chat
  async bulkDeleteMessages(messageIds, userId) {
    try {
      console.log("🗑️ Bulk deleting messages:", {
        messageIds,
        userId,
        count: messageIds.length,
      });

      const result = await Message.updateMany(
        {_id: {$in: messageIds}},
        {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId,
        }
      );

      console.log("✅ Messages bulk deleted:", {
        deletedCount: result.modifiedCount,
      });

      return {
        success: true,
        deletedCount: result.modifiedCount,
      };
    } catch (error) {
      console.error("❌ Bulk delete messages error:", error);
      return {
        success: false,
        message: "Failed to delete messages",
        error: error.message,
      };
    }
  }

  // ✅ NEW: Get company chat list (conversations with other companies)
  async getCompanyChatList(myCompanyId, options = {}) {
    try {
      const {page = 1, limit = 20} = options;

      console.log("📋 Getting company chat list:", {
        myCompanyId,
        page,
        limit,
      });

      // Aggregate to get unique conversations with last message
      const conversations = await Message.aggregate([
        {
          $match: {
            $or: [
              {senderCompanyId: myCompanyId},
              {receiverCompanyId: myCompanyId},
            ],
            isDeleted: false,
            chatType: "company-to-company",
          },
        },
        {
          $addFields: {
            otherCompanyId: {
              $cond: {
                if: {$eq: ["$senderCompanyId", myCompanyId]},
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
                      {$eq: ["$receiverCompanyId", myCompanyId]},
                      {$ne: ["$status", "read"]},
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
          $sort: {"lastMessage.createdAt": -1},
        },
        {
          $skip: (page - 1) * limit,
        },
        {
          $limit: limit,
        },
      ]);

      console.log("✅ Company chat list retrieved:", {
        conversationsCount: conversations.length,
        myCompanyId,
      });

      return {
        success: true,
        data: {
          conversations,
          pagination: {
            currentPage: page,
            hasMore: conversations.length === limit,
          },
        },
      };
    } catch (error) {
      console.error("❌ Get company chat list error:", error);
      return {
        success: false,
        message: "Failed to get company chat list",
        error: error.message,
      };
    }
  }

  // ✅ NEW: Get message statistics for company
  async getMessageStatistics(myCompanyId, options = {}) {
    try {
      const {startDate, endDate, targetCompanyId} = options;

      const matchQuery = {
        $or: [{senderCompanyId: myCompanyId}, {receiverCompanyId: myCompanyId}],
        isDeleted: false,
        chatType: "company-to-company",
      };

      if (startDate || endDate) {
        matchQuery.createdAt = {};
        if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
        if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
      }

      if (targetCompanyId) {
        matchQuery.$or = [
          {
            senderCompanyId: myCompanyId,
            receiverCompanyId: targetCompanyId,
          },
          {
            senderCompanyId: targetCompanyId,
            receiverCompanyId: myCompanyId,
          },
        ];
      }

      const stats = await Message.aggregate([
        {$match: matchQuery},
        {
          $group: {
            _id: null,
            totalMessages: {$sum: 1},
            sentMessages: {
              $sum: {
                $cond: [{$eq: ["$senderCompanyId", myCompanyId]}, 1, 0],
              },
            },
            receivedMessages: {
              $sum: {
                $cond: [{$eq: ["$receiverCompanyId", myCompanyId]}, 1, 0],
              },
            },
            unreadMessages: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {$eq: ["$receiverCompanyId", myCompanyId]},
                      {$ne: ["$status", "read"]},
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            messageTypes: {
              $push: "$messageType",
            },
          },
        },
        {
          $addFields: {
            messageTypeStats: {
              $reduce: {
                input: "$messageTypes",
                initialValue: {},
                in: {
                  $mergeObjects: [
                    "$$value",
                    {
                      $arrayToObject: [
                        [
                          {
                            k: "$$this",
                            v: {
                              $add: [
                                {
                                  $ifNull: [
                                    {
                                      $getField: {
                                        field: "$$this",
                                        input: "$$value",
                                      },
                                    },
                                    0,
                                  ],
                                },
                                1,
                              ],
                            },
                          },
                        ],
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      ]);

      console.log("📊 Message statistics:", {
        myCompanyId,
        targetCompanyId,
        stats: stats[0] || {},
      });

      return {
        success: true,
        data: stats[0] || {
          totalMessages: 0,
          sentMessages: 0,
          receivedMessages: 0,
          unreadMessages: 0,
          messageTypeStats: {},
        },
      };
    } catch (error) {
      console.error("❌ Get message statistics error:", error);
      return {
        success: false,
        message: "Failed to get message statistics",
        error: error.message,
      };
    }
  }
}

module.exports = MessageHandler;
