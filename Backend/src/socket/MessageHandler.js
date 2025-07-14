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
  constructor() {
    // Remove socketHandler dependency to avoid circular dependencies
    // socketHandler will be passed when needed
  }

  // Process different message types
  async processMessage(messageData) {
    const {messageType, content, partyId, companyId} = messageData;

    try {
      switch (messageType) {
        case "whatsapp":
          return await this.processWhatsAppMessage(messageData);
        case "sms":
          return await this.processSMSMessage(messageData);
        case "email":
          return await this.processEmailMessage(messageData);
        default:
          return await this.processDefaultMessage(messageData);
      }
    } catch (error) {
      console.error("Process message error:", error);
      throw error;
    }
  }

  async processWhatsAppMessage(messageData) {
    try {
      // Save message to database
      const message = await Message.create({
        ...messageData,
        platform: "whatsapp",
        status: "sent",
      });

      // TODO: Integrate with WhatsApp Business API
      // Example integration:
      // const whatsappResponse = await this.sendWhatsAppMessage(messageData);

      console.log(`WhatsApp message sent to party ${messageData.partyId}`);

      return {
        success: true,
        message,
        externalId: `wa_${Date.now()}`, // Simulated WhatsApp message ID
        platform: "whatsapp",
      };
    } catch (error) {
      console.error("WhatsApp message processing error:", error);

      // Try to update message status to failed
      try {
        await Message.findByIdAndUpdate(messageData._id, {
          status: "failed",
          failedAt: new Date(),
          externalError: error.message,
        });
      } catch (updateError) {
        console.error("Failed to update message status:", updateError);
      }

      throw error;
    }
  }

  async processSMSMessage(messageData) {
    try {
      // Save message to database
      const message = await Message.create({
        ...messageData,
        platform: "sms",
        status: "sent",
      });

      // TODO: Integrate with SMS gateway (Twilio, AWS SNS, etc.)
      // Example integration:
      // const smsResponse = await this.sendSMS(messageData);

      console.log(`SMS sent to party ${messageData.partyId}`);

      return {
        success: true,
        message,
        externalId: `sms_${Date.now()}`, // Simulated SMS ID
        platform: "sms",
      };
    } catch (error) {
      console.error("SMS processing error:", error);

      // Try to update message status to failed
      try {
        await Message.findByIdAndUpdate(messageData._id, {
          status: "failed",
          failedAt: new Date(),
          externalError: error.message,
        });
      } catch (updateError) {
        console.error("Failed to update message status:", updateError);
      }

      throw error;
    }
  }

  async processEmailMessage(messageData) {
    try {
      // Save message to database
      const message = await Message.create({
        ...messageData,
        platform: "email",
        status: "sent",
      });

      // TODO: Integrate with Email service (SendGrid, AWS SES, etc.)
      // Example integration:
      // const emailResponse = await this.sendEmail(messageData);

      console.log(`Email sent to party ${messageData.partyId}`);

      return {
        success: true,
        message,
        externalId: `email_${Date.now()}`, // Simulated Email ID
        platform: "email",
      };
    } catch (error) {
      console.error("Email processing error:", error);

      // Try to update message status to failed
      try {
        await Message.findByIdAndUpdate(messageData._id, {
          status: "failed",
          failedAt: new Date(),
          externalError: error.message,
        });
      } catch (updateError) {
        console.error("Failed to update message status:", updateError);
      }

      throw error;
    }
  }

  async processDefaultMessage(messageData) {
    try {
      // Save as internal message
      const message = await Message.create({
        ...messageData,
        platform: "internal",
        status: "sent",
      });

      return {
        success: true,
        message,
        platform: "internal",
      };
    } catch (error) {
      console.error("Default message processing error:", error);
      throw error;
    }
  }

  // Get chat history between user and party
  async getChatHistory(companyId, partyId, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = "createdAt", // Changed from "timestamp" to match Message model
        sortOrder = "desc",
        messageType = null,
        startDate = null,
        endDate = null,
      } = options;

      const skip = (page - 1) * limit;
      const sort = {[sortBy]: sortOrder === "desc" ? -1 : 1};

      // Build query
      const query = {
        companyId,
        partyId,
        isDeleted: false, // Only get non-deleted messages
      };

      if (messageType) {
        query.messageType = messageType;
      }

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const messages = await Message.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("senderId", "name email") // Populate sender info
        .lean();

      const totalMessages = await Message.countDocuments(query);

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
      console.error("Get chat history error:", error);
      return {
        success: false,
        message: "Failed to retrieve chat history",
        error: error.message,
      };
    }
  }

  // Get message templates with party data
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
    };

    return templates;
  }

  // Mark messages as read
  async markMessagesAsRead(messageIds, userId) {
    try {
      if (!Array.isArray(messageIds)) {
        messageIds = [messageIds];
      }

      const result = await Message.updateMany(
        {
          _id: {$in: messageIds},
          "readBy.userId": {$ne: userId}, // Only update if user hasn't read it yet
        },
        {
          $addToSet: {readBy: {userId, readAt: new Date()}},
          status: "read",
          readAt: new Date(),
        }
      );

      return {
        success: true,
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      console.error("Mark messages as read error:", error);
      return {
        success: false,
        message: "Failed to mark messages as read",
        error: error.message,
      };
    }
  }

  // Get unread message count
  async getUnreadMessageCount(companyId, userId = null) {
    try {
      const query = {
        companyId,
        isDeleted: false,
        direction: "inbound", // Only count incoming messages
      };

      if (userId) {
        query["readBy.userId"] = {$ne: userId};
      } else {
        query.status = {$ne: "read"};
      }

      const count = await Message.countDocuments(query);

      return {success: true, count};
    } catch (error) {
      console.error("Get unread count error:", error);
      return {success: false, count: 0, error: error.message};
    }
  }

  // Get conversation summary
  async getConversationSummary(companyId, partyId) {
    try {
      const summary = await Message.getConversationSummary(companyId, partyId);

      return {
        success: true,
        data: summary[0] || {
          totalMessages: 0,
          unreadCount: 0,
          lastMessage: null,
          messageTypes: [],
        },
      };
    } catch (error) {
      console.error("Get conversation summary error:", error);
      return {
        success: false,
        message: "Failed to get conversation summary",
        error: error.message,
      };
    }
  }

  // Search messages
  async searchMessages(companyId, searchQuery, options = {}) {
    try {
      const {
        partyId = null,
        messageType = null,
        page = 1,
        limit = 20,
      } = options;

      const query = {
        companyId,
        isDeleted: false,
        $text: {$search: searchQuery},
      };

      if (partyId) query.partyId = partyId;
      if (messageType) query.messageType = messageType;

      const skip = (page - 1) * limit;

      const messages = await Message.find(query)
        .sort({score: {$meta: "textScore"}})
        .skip(skip)
        .limit(limit)
        .populate("senderId", "name email")
        .populate("partyId", "name phoneNumber")
        .lean();

      const totalMessages = await Message.countDocuments(query);

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
      console.error("Search messages error:", error);
      return {
        success: false,
        message: "Failed to search messages",
        error: error.message,
      };
    }
  }

  // Bulk operations
  async bulkDeleteMessages(messageIds, userId) {
    try {
      const result = await Message.updateMany(
        {_id: {$in: messageIds}},
        {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId,
        }
      );

      return {
        success: true,
        deletedCount: result.modifiedCount,
      };
    } catch (error) {
      console.error("Bulk delete messages error:", error);
      return {
        success: false,
        message: "Failed to delete messages",
        error: error.message,
      };
    }
  }
}

module.exports = MessageHandler;
