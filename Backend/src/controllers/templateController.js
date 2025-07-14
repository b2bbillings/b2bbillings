const mongoose = require("mongoose");

// Import models with error handling
const getModel = (modelName) => {
  try {
    return require(`../models/${modelName}`);
  } catch (error) {
    console.warn(`Model ${modelName} not found:`, error.message);
    return null;
  }
};

// Import MessageHandler with fallback
let MessageHandler = null;
try {
  MessageHandler = require("../socket/messageHandler");
} catch (error) {
  console.warn("MessageHandler not found, using fallback templates");
}

// Fallback templates if MessageHandler is not available
const fallbackTemplates = {
  payment: {
    payment_reminder: {
      id: "payment_reminder",
      title: "Payment Reminder",
      category: "payment",
      content:
        "Dear {customerName}, this is a friendly reminder about your pending payment of ₹{amount} for invoice #{invoiceNumber}. Please make the payment at your earliest convenience. Thank you!",
      messageType: "whatsapp",
      variables: ["customerName", "amount", "invoiceNumber"],
    },
    payment_received: {
      id: "payment_received",
      title: "Payment Received",
      category: "payment",
      content:
        "Thank you {customerName}! We have received your payment of ₹{amount} for invoice #{invoiceNumber}. Your account has been updated accordingly.",
      messageType: "whatsapp",
      variables: ["customerName", "amount", "invoiceNumber"],
    },
    payment_overdue: {
      id: "payment_overdue",
      title: "Payment Overdue",
      category: "payment",
      content:
        "Dear {customerName}, your payment of ₹{amount} for invoice #{invoiceNumber} is overdue by {overdueDays} days. Please make the payment immediately to avoid late fees.",
      messageType: "whatsapp",
      variables: ["customerName", "amount", "invoiceNumber", "overdueDays"],
    },
  },
  acknowledgment: {
    order_received: {
      id: "order_received",
      title: "Order Received",
      category: "acknowledgment",
      content:
        "Thank you {customerName}! We have received your order #{orderNumber} worth ₹{amount}. It is being processed and we will keep you updated on the progress.",
      messageType: "whatsapp",
      variables: ["customerName", "orderNumber", "amount"],
    },
    order_confirmed: {
      id: "order_confirmed",
      title: "Order Confirmed",
      category: "acknowledgment",
      content:
        "Dear {customerName}, your order #{orderNumber} has been confirmed and will be delivered by {deliveryDate}. Track your order with reference #{trackingNumber}.",
      messageType: "whatsapp",
      variables: [
        "customerName",
        "orderNumber",
        "deliveryDate",
        "trackingNumber",
      ],
    },
  },
  invoice: {
    invoice_sent: {
      id: "invoice_sent",
      title: "Invoice Generated",
      category: "invoice",
      content:
        "Dear {customerName}, your invoice #{invoiceNumber} for ₹{amount} has been generated. Due date: {dueDate}. Please review and make the payment on time.",
      messageType: "whatsapp",
      variables: ["customerName", "invoiceNumber", "amount", "dueDate"],
    },
    invoice_due_today: {
      id: "invoice_due_today",
      title: "Invoice Due Today",
      category: "invoice",
      content:
        "Dear {customerName}, your invoice #{invoiceNumber} for ₹{amount} is due today. Please make the payment to avoid any late charges.",
      messageType: "whatsapp",
      variables: ["customerName", "invoiceNumber", "amount"],
    },
  },
  statement: {
    monthly_statement: {
      id: "monthly_statement",
      title: "Monthly Statement",
      category: "statement",
      content:
        "Dear {customerName}, your monthly statement is ready. Outstanding balance: ₹{balance}. Please review your account and clear any pending payments.",
      messageType: "email",
      variables: ["customerName", "balance"],
    },
  },
  meeting: {
    meeting_request: {
      id: "meeting_request",
      title: "Meeting Request",
      category: "meeting",
      content:
        "Hello {customerName}, I would like to schedule a meeting to discuss {topic}. Are you available on {proposedDate} at {proposedTime}?",
      messageType: "whatsapp",
      variables: ["customerName", "topic", "proposedDate", "proposedTime"],
    },
    meeting_confirmation: {
      id: "meeting_confirmation",
      title: "Meeting Confirmation",
      category: "meeting",
      content:
        "Dear {customerName}, our meeting is confirmed for {meetingDate} at {meetingTime}. Location: {location}. Looking forward to meeting you!",
      messageType: "whatsapp",
      variables: ["customerName", "meetingDate", "meetingTime", "location"],
    },
  },
  order: {
    order_shipped: {
      id: "order_shipped",
      title: "Order Shipped",
      category: "order",
      content:
        "Great news {customerName}! Your order #{orderNumber} has been shipped and will reach you by {deliveryDate}. Tracking ID: {trackingNumber}",
      messageType: "whatsapp",
      variables: [
        "customerName",
        "orderNumber",
        "deliveryDate",
        "trackingNumber",
      ],
    },
    order_delivered: {
      id: "order_delivered",
      title: "Order Delivered",
      category: "order",
      content:
        "Hello {customerName}, your order #{orderNumber} has been delivered successfully. Thank you for your business! Please share your feedback.",
      messageType: "whatsapp",
      variables: ["customerName", "orderNumber"],
    },
  },
  reminder: {
    general_reminder: {
      id: "general_reminder",
      title: "General Reminder",
      category: "reminder",
      content:
        "Hello {customerName}, this is a reminder about {subject}. Please take the necessary action at your earliest convenience.",
      messageType: "whatsapp",
      variables: ["customerName", "subject"],
    },
    follow_up: {
      id: "follow_up",
      title: "Follow Up",
      category: "reminder",
      content:
        "Hi {customerName}, following up on our previous conversation about {topic}. Please let me know if you need any additional information.",
      messageType: "whatsapp",
      variables: ["customerName", "topic"],
    },
  },
  welcome: {
    new_customer: {
      id: "new_customer",
      title: "Welcome New Customer",
      category: "welcome",
      content:
        "Welcome to {companyName}, {customerName}! We are excited to work with you and look forward to a successful business partnership.",
      messageType: "whatsapp",
      variables: ["customerName", "companyName"],
    },
  },
  other: {
    custom_message: {
      id: "custom_message",
      title: "Custom Message",
      category: "other",
      content: "Hello {customerName}, {customMessage}",
      messageType: "internal",
      variables: ["customerName", "customMessage"],
    },
    thank_you: {
      id: "thank_you",
      title: "Thank You",
      category: "other",
      content:
        "Thank you {customerName} for choosing our services. We appreciate your business and look forward to serving you again!",
      messageType: "whatsapp",
      variables: ["customerName"],
    },
  },
};

// Initialize MessageHandler if available
let messageHandler = null;
if (MessageHandler) {
  try {
    messageHandler = new MessageHandler();
  } catch (error) {
    console.warn("Failed to initialize MessageHandler:", error.message);
  }
}

// Get message templates for a party
const getMessageTemplates = async (req, res) => {
  try {
    const {partyId} = req.params;
    const {companyId} = req.user;
    const {category, messageType} = req.query;

    // Validate partyId
    if (!mongoose.Types.ObjectId.isValid(partyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Party ID format",
      });
    }

    // Get Party model safely
    const Party = getModel("Party");
    let party = null;

    if (Party) {
      try {
        party = await Party.findOne({
          _id: partyId,
          companyId,
        }).lean();

        if (!party) {
          return res.status(404).json({
            success: false,
            message: "Party not found",
          });
        }
      } catch (error) {
        console.warn("Party lookup failed:", error.message);
      }
    }

    // Get templates from MessageHandler or use fallback
    let templates = {};

    if (messageHandler && party) {
      try {
        templates = messageHandler.getMessageTemplates(party);
      } catch (error) {
        console.warn("MessageHandler failed, using fallback:", error.message);
        templates = fallbackTemplates;
      }
    } else {
      templates = fallbackTemplates;
    }

    // Filter by category if specified
    if (category && templates[category]) {
      const filteredTemplates = {};
      filteredTemplates[category] = templates[category];
      templates = filteredTemplates;
    }

    // Filter by message type if specified
    if (messageType) {
      Object.keys(templates).forEach((cat) => {
        const filteredCategoryTemplates = {};
        Object.keys(templates[cat]).forEach((templateKey) => {
          const template = templates[cat][templateKey];
          if (
            template.messageType === messageType ||
            template.messageType === "internal"
          ) {
            filteredCategoryTemplates[templateKey] = template;
          }
        });
        if (Object.keys(filteredCategoryTemplates).length > 0) {
          templates[cat] = filteredCategoryTemplates;
        } else {
          delete templates[cat];
        }
      });
    }

    // Count total templates
    const totalTemplates = Object.values(templates).reduce(
      (sum, categoryTemplates) => {
        return sum + Object.keys(categoryTemplates).length;
      },
      0
    );

    res.json({
      success: true,
      data: {
        partyId,
        partyName: party?.name || "Unknown Party",
        templates,
        totalTemplates,
        categories: Object.keys(templates),
        availableMessageTypes: ["whatsapp", "sms", "email", "internal"],
      },
    });
  } catch (error) {
    console.error("Get message templates error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get message templates",
      error: error.message,
    });
  }
};

// Send message using template
const sendTemplateMessage = async (req, res) => {
  try {
    const {partyId, templateId} = req.params;
    const {companyId, userId} = req.user;
    const {
      customContent,
      messageType = "whatsapp",
      templateData = {},
    } = req.body;

    // Validate partyId
    if (!mongoose.Types.ObjectId.isValid(partyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Party ID format",
      });
    }

    // Get Party model safely
    const Party = getModel("Party");
    let party = null;

    if (Party) {
      try {
        party = await Party.findOne({
          _id: partyId,
          companyId,
        }).lean();

        if (!party) {
          return res.status(404).json({
            success: false,
            message: "Party not found",
          });
        }
      } catch (error) {
        console.warn("Party lookup failed:", error.message);
        // Continue with null party for fallback
      }
    }

    // Get templates from MessageHandler or use fallback
    let templates = {};

    if (messageHandler && party) {
      try {
        templates = messageHandler.getMessageTemplates(party);
      } catch (error) {
        console.warn("MessageHandler failed, using fallback:", error.message);
        templates = fallbackTemplates;
      }
    } else {
      templates = fallbackTemplates;
    }

    // Find the template
    let template = null;
    let templateCategory = null;

    for (const [category, categoryTemplates] of Object.entries(templates)) {
      if (categoryTemplates[templateId]) {
        template = categoryTemplates[templateId];
        templateCategory = category;
        break;
      }
    }

    if (!template) {
      return res.status(404).json({
        success: false,
        message: `Template '${templateId}' not found`,
        availableTemplates: Object.keys(templates).reduce((acc, cat) => {
          acc[cat] = Object.keys(templates[cat]);
          return acc;
        }, {}),
      });
    }

    // Process template content
    let content = customContent || template.content;
    const finalMessageType = messageType || template.messageType;

    // Replace template variables
    if (template.variables && templateData) {
      template.variables.forEach((variable) => {
        const regex = new RegExp(`{${variable}}`, "g");
        if (templateData[variable] !== undefined) {
          content = content.replace(regex, templateData[variable]);
        }
      });
    }

    // Add party-specific variables if party is available
    if (party) {
      content = content.replace(/{customerName}/g, party.name || "Customer");
      content = content.replace(/{phoneNumber}/g, party.phoneNumber || "");
      content = content.replace(/{email}/g, party.email || "");
    }

    // Create message
    const Message = getModel("Message");
    if (!Message) {
      return res.status(500).json({
        success: false,
        message: "Message model not available",
      });
    }

    const messageData = {
      companyId,
      partyId,
      senderId: userId,
      senderType: "user",
      content,
      messageType: finalMessageType,
      templateId,
      templateCategory,
      templateName: template.title,
      isTemplate: true,
      direction: "outbound",
      createdBy: userId,
      metadata: {
        templateUsed: true,
        originalTemplate: template.content,
        templateData: templateData,
        variablesReplaced: template.variables || [],
      },
    };

    const message = await Message.create(messageData);

    // Emit to socket if available
    const socketManager = req.app.get("socketManager");
    if (socketManager) {
      const chatRoomId = `party_${partyId}_${companyId}`;
      try {
        socketManager.sendToRoom(chatRoomId, "new_message", {
          ...message.toObject(),
          id: message._id,
        });
      } catch (socketError) {
        console.warn("Socket emission failed:", socketError.message);
        // Continue without socket - not critical
      }
    }

    res.status(201).json({
      success: true,
      data: {
        message,
        template: {
          id: template.id,
          title: template.title,
          category: templateCategory,
          originalContent: template.content,
          processedContent: content,
        },
        party: party
          ? {
              id: party._id,
              name: party.name,
              phoneNumber: party.phoneNumber,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Send template message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send template message",
      error: error.message,
    });
  }
};

// Get all template categories
const getTemplateCategories = async (req, res) => {
  try {
    const categories = Object.keys(fallbackTemplates).map((category) => ({
      id: category,
      name: category.charAt(0).toUpperCase() + category.slice(1),
      templateCount: Object.keys(fallbackTemplates[category]).length,
      templates: Object.keys(fallbackTemplates[category]),
    }));

    res.json({
      success: true,
      data: {
        categories,
        totalCategories: categories.length,
        totalTemplates: categories.reduce(
          (sum, cat) => sum + cat.templateCount,
          0
        ),
      },
    });
  } catch (error) {
    console.error("Get template categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get template categories",
      error: error.message,
    });
  }
};

// Get template by ID
const getTemplateById = async (req, res) => {
  try {
    const {templateId} = req.params;

    // Find the template in fallback templates
    let template = null;
    let templateCategory = null;

    for (const [category, categoryTemplates] of Object.entries(
      fallbackTemplates
    )) {
      if (categoryTemplates[templateId]) {
        template = categoryTemplates[templateId];
        templateCategory = category;
        break;
      }
    }

    if (!template) {
      return res.status(404).json({
        success: false,
        message: `Template '${templateId}' not found`,
        availableTemplates: Object.keys(fallbackTemplates).reduce(
          (acc, cat) => {
            acc[cat] = Object.keys(fallbackTemplates[cat]);
            return acc;
          },
          {}
        ),
      });
    }

    res.json({
      success: true,
      data: {
        ...template,
        category: templateCategory,
      },
    });
  } catch (error) {
    console.error("Get template by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get template",
      error: error.message,
    });
  }
};

module.exports = {
  getMessageTemplates,
  sendTemplateMessage,
  getTemplateCategories,
  getTemplateById,
};
