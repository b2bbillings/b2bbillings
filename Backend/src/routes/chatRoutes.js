const express = require("express");
const {body, query, validationResult} = require("express-validator");

// Import controllers
const chatController = require("../controllers/chatController");

// ✅ FIXED: Import authenticate from authMiddleware correctly
const {authenticate} = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ UPDATED: Message types for validation - Added "website"
const messageTypes = [
  "whatsapp",
  "sms",
  "email",
  "internal",
  "notification",
  "website",
];

// Template categories for validation
const templateCategories = [
  "business",
  "payment",
  "acknowledgment",
  "invoice",
  "statement",
  "meeting",
  "order",
  "reminder",
  "welcome",
  "follow_up",
  "other",
];

// ✅ NEW: Analytics periods for validation
const analyticsPeriods = ["1d", "7d", "30d", "90d"];

// =============================================================================
// VALIDATION ERROR HANDLER MIDDLEWARE
// =============================================================================

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("❌ Validation errors:", errors.array());
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// =============================================================================
// VALIDATION RULES
// =============================================================================

// ✅ UPDATED: Validation for sending messages - includes "website"
const sendMessageValidation = [
  body("content")
    .notEmpty()
    .withMessage("Message content is required")
    .isLength({min: 1, max: 5000})
    .withMessage("Message content must be between 1 and 5000 characters")
    .trim(),

  body("messageType")
    .optional()
    .isIn(messageTypes) // ✅ Now includes "website"
    .withMessage("Invalid message type"),

  body("templateId")
    .optional()
    .isString()
    .withMessage("Template ID must be a string"),

  body("attachments")
    .optional()
    .isArray()
    .withMessage("Attachments must be an array"),

  body("type").optional().isIn(["company"]).withMessage("Invalid chat type"),
];

// Validation for marking messages as read
const markReadValidation = [
  body("messageIds")
    .isArray({min: 1})
    .withMessage("Message IDs array is required and must not be empty"),

  body("messageIds.*")
    .isMongoId()
    .withMessage("Each message ID must be a valid MongoDB ObjectId"),
];

// Validation for deleting messages
const deleteMessagesValidation = [
  body("messageIds")
    .isArray({min: 1})
    .withMessage("Message IDs array is required and must not be empty"),

  body("messageIds.*")
    .isMongoId()
    .withMessage("Each message ID must be a valid MongoDB ObjectId"),
];

// ✅ UPDATED: Validation for search - includes "website"
const searchValidation = [
  query("query")
    .notEmpty()
    .withMessage("Search query is required")
    .isLength({min: 1, max: 200})
    .withMessage("Search query must be between 1 and 200 characters")
    .trim(),

  query("partyId")
    .optional()
    .isMongoId()
    .withMessage("Party ID must be a valid MongoDB ObjectId"),

  query("messageType")
    .optional()
    .isIn(messageTypes) // ✅ Now includes "website"
    .withMessage("Invalid message type"),

  query("page")
    .optional()
    .isInt({min: 1})
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({min: 1, max: 100})
    .withMessage("Limit must be between 1 and 100"),

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),

  query("type").optional().isIn(["company"]).withMessage("Invalid chat type"),
];

// ✅ UPDATED: Validation for chat history - includes "website"
const chatHistoryValidation = [
  query("page")
    .optional()
    .isInt({min: 1})
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({min: 1, max: 100})
    .withMessage("Limit must be between 1 and 100"),

  query("messageType")
    .optional()
    .isIn(messageTypes) // ✅ Now includes "website"
    .withMessage("Invalid message type"),

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),

  query("type").optional().isIn(["company"]).withMessage("Invalid chat type"),
];

// ✅ UPDATED: Validation for template message - includes "website"
const templateMessageValidation = [
  body("customContent")
    .optional()
    .isLength({min: 1, max: 5000})
    .withMessage("Custom content must be between 1 and 5000 characters")
    .trim(),

  body("messageType")
    .optional()
    .isIn(messageTypes) // ✅ Now includes "website"
    .withMessage("Invalid message type"),

  body("templateData")
    .optional()
    .isObject()
    .withMessage("Template data must be an object"),

  body("type").optional().isIn(["company"]).withMessage("Invalid chat type"),
];

// ✅ NEW: Validation for analytics
const analyticsValidation = [
  query("period")
    .optional()
    .isIn(analyticsPeriods)
    .withMessage("Invalid analytics period"),

  query("type").optional().isIn(["company"]).withMessage("Invalid chat type"),
];

// ✅ NEW: Validation for active chats
const activeChatsValidation = [
  query("page")
    .optional()
    .isInt({min: 1})
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({min: 1, max: 50})
    .withMessage("Limit must be between 1 and 50"),

  query("type").optional().isIn(["company"]).withMessage("Invalid chat type"),
];

// ✅ NEW: Validation for notification endpoints
const notificationValidation = [
  query("page")
    .optional()
    .isInt({min: 1})
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({min: 1, max: 100})
    .withMessage("Limit must be between 1 and 100"),

  query("unreadOnly")
    .optional()
    .isBoolean()
    .withMessage("unreadOnly must be a boolean"),
];

// ✅ NEW: Validation for bulk notification operations
const bulkNotificationValidation = [
  body("notificationIds")
    .optional()
    .isArray()
    .withMessage("Notification IDs must be an array"),

  body("notificationIds.*")
    .optional()
    .isMongoId()
    .withMessage("Each notification ID must be a valid MongoDB ObjectId"),

  body("markAll")
    .optional()
    .isBoolean()
    .withMessage("markAll must be a boolean"),
];

// ✅ FIXED: More robust MongoDB ObjectId validation
const validatePartyId = (req, res, next) => {
  const {partyId} = req.params;

  console.log("🔍 Validating partyId:", {
    partyId,
    type: typeof partyId,
    length: partyId?.length,
    isString: typeof partyId === "string",
    matches24Hex: partyId?.match(/^[0-9a-fA-F]{24}$/),
  });

  // Check if partyId exists
  if (!partyId) {
    console.error("❌ PartyId is missing");
    return res.status(400).json({
      success: false,
      message: "Party ID is required",
    });
  }

  // Check if it's a string
  if (typeof partyId !== "string") {
    console.error("❌ PartyId is not a string:", typeof partyId);
    return res.status(400).json({
      success: false,
      message: "Party ID must be a string",
    });
  }

  // Check length (MongoDB ObjectId is always 24 characters)
  if (partyId.length !== 24) {
    console.error("❌ PartyId wrong length:", partyId.length);
    return res.status(400).json({
      success: false,
      message: `Invalid party ID length: expected 24 characters, got ${partyId.length}`,
    });
  }

  // Check if it matches hexadecimal pattern
  if (!partyId.match(/^[0-9a-fA-F]{24}$/)) {
    console.error("❌ PartyId doesn't match hex pattern:", partyId);
    return res.status(400).json({
      success: false,
      message:
        "Invalid party ID format: must be 24 character hexadecimal string",
    });
  }

  // ✅ FIXED: Try to create ObjectId to validate it's actually valid
  try {
    const mongoose = require("mongoose");
    new mongoose.Types.ObjectId(partyId);
    console.log("✅ PartyId validation passed:", partyId);
    next();
  } catch (error) {
    console.error("❌ PartyId ObjectId creation failed:", error.message);
    return res.status(400).json({
      success: false,
      message: "Invalid party ID: not a valid MongoDB ObjectId",
      details: error.message,
    });
  }
};

// ✅ NEW: Validation for company ID in URL params
const validateCompanyId = (req, res, next) => {
  const {companyId} = req.params;
  if (!companyId || !companyId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      success: false,
      message: "Invalid company ID format",
    });
  }
  next();
};

// Validation for template ID
const validateTemplateId = (req, res, next) => {
  const {templateId} = req.params;
  if (!templateId || templateId.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "Template ID is required",
    });
  }
  next();
};

// ✅ ENHANCED: Enhanced middleware for chat-specific context
const addChatContext = (req, res, next) => {
  // Add company ID to user context if available
  if (req.user && req.headers["x-company-id"]) {
    req.user.companyId = req.headers["x-company-id"];
  }

  // Add request timestamp for debugging
  req.requestTimestamp = new Date().toISOString();

  // Add chat type context
  if (req.query.type || req.body.type) {
    req.chatType = req.query.type || req.body.type;
  }

  next();
};

// ✅ NEW: Middleware for company chat validation
const validateCompanyChat = (req, res, next) => {
  if (!req.user?.companyId) {
    return res.status(400).json({
      success: false,
      message: "Company context required for company chat",
    });
  }
  next();
};

// =============================================================================
// ROUTES CONFIGURATION
// =============================================================================

// ================================
// 🔧 UTILITY ROUTES (Public)
// ================================

// @route   GET /api/chat/health
// @desc    Health check for chat system
// @access  Public
router.get(
  "/health",
  (req, res, next) => {
    console.log("🔍 Health check requested at:", new Date().toISOString());
    next();
  },
  chatController.healthCheck
);

// ✅ FIXED: Apply authentication middleware properly
router.use((req, res, next) => {
  console.log(`🔐 Authenticating request: ${req.method} ${req.path}`);
  authenticate(req, res, next);
});

// ✅ UPDATED: Apply chat context middleware after authentication
router.use(addChatContext);

// ================================
// 📊 ANALYTICS & STATS ROUTES
// ================================

// @route   GET /api/chat/stats
// @desc    Get chat statistics for the current user/company
// @access  Private (requires authentication)
router.get(
  "/stats",
  analyticsValidation,
  handleValidationErrors,
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "📊 Getting chat stats for user:",
      req.user?.id,
      "company:",
      req.user?.companyId,
      "type:",
      req.query.type
    );
    next();
  },
  chatController.getChatStats
);

// ================================
// 💬 CHAT HISTORY & CONVERSATION ROUTES
// ================================

// @route   GET /api/chat/conversations
// @desc    Get list of all conversations with latest message
// @access  Private (requires authentication)
router.get(
  "/conversations",
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "💬 Getting conversations for user:",
      req.user?.id,
      "company:",
      req.user?.companyId,
      "type:",
      req.query.type
    );
    next();
  },
  chatController.getConversations
);

// @route   GET /api/chat/history/:partyId
// @desc    Get chat history for a specific party (company)
// @access  Private (requires authentication)
router.get(
  "/history/:partyId",
  validatePartyId,
  chatHistoryValidation,
  handleValidationErrors,
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "📚 Getting chat history for party:",
      req.params.partyId,
      "user:",
      req.user?.id,
      "company:",
      req.user?.companyId,
      "type:",
      req.query.type
    );
    next();
  },
  chatController.getChatHistory
);

// @route   GET /api/chat/summary/:partyId
// @desc    Get conversation summary for a specific party (company)
// @access  Private (requires authentication)
router.get(
  "/summary/:partyId",
  validatePartyId,
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "📋 Getting conversation summary for party:",
      req.params.partyId,
      "company:",
      req.user?.companyId,
      "type:",
      req.query.type
    );
    next();
  },
  chatController.getConversationSummary
);

// ================================
// 📤 MESSAGE SENDING ROUTES
// ================================

// @route   POST /api/chat/send/:partyId
// @desc    Send message to a specific party (company) via HTTP
// @access  Private (requires authentication)
router.post(
  "/send/:partyId",
  validatePartyId,
  sendMessageValidation,
  handleValidationErrors,
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "📤 Sending message to party:",
      req.params.partyId,
      "from user:",
      req.user?.id,
      "company:",
      req.user?.companyId,
      "type:",
      req.body.type
    );
    next();
  },
  chatController.sendMessage
);

// ================================
// 📖 MESSAGE STATUS ROUTES
// ================================

// @route   POST /api/chat/read
// @desc    Mark messages as read
// @access  Private (requires authentication)
router.post(
  "/read",
  markReadValidation,
  handleValidationErrors,
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "👁️ Marking messages as read:",
      req.body.messageIds?.length || 0,
      "messages for company:",
      req.user?.companyId
    );
    next();
  },
  chatController.markMessagesAsRead
);

// @route   DELETE /api/chat/messages
// @desc    Delete messages (soft delete)
// @access  Private (requires authentication)
router.delete(
  "/messages",
  deleteMessagesValidation,
  handleValidationErrors,
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "🗑️ Deleting messages:",
      req.body.messageIds?.length || 0,
      "messages for company:",
      req.user?.companyId
    );
    next();
  },
  chatController.deleteMessages
);

// ================================
// 🔍 SEARCH & UTILITY ROUTES
// ================================

// @route   GET /api/chat/search
// @desc    Search messages across conversations
// @access  Private (requires authentication)
router.get(
  "/search",
  searchValidation,
  handleValidationErrors,
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "🔍 Searching messages with query:",
      req.query.query,
      "for company:",
      req.user?.companyId,
      "type:",
      req.query.type
    );
    next();
  },
  chatController.searchMessages
);

// @route   GET /api/chat/unread-count
// @desc    Get unread message count
// @access  Private (requires authentication)
router.get(
  "/unread-count",
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "🔔 Getting unread count for user:",
      req.user?.id,
      "company:",
      req.user?.companyId,
      "type:",
      req.query.type
    );
    next();
  },
  chatController.getUnreadCount
);

// ================================
// 📋 TEMPLATE ROUTES
// ================================

// @route   GET /api/chat/templates/:partyId
// @desc    Get message templates for a specific party (company)
// @access  Private (requires authentication)
router.get(
  "/templates/:partyId",
  validatePartyId,
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "📋 Getting templates for party:",
      req.params.partyId,
      "company:",
      req.user?.companyId,
      "type:",
      req.query.type
    );
    next();
  },
  chatController.getMessageTemplates
);

// @route   POST /api/chat/templates/:partyId/:templateId
// @desc    Send message using a specific template
// @access  Private (requires authentication)
router.post(
  "/templates/:partyId/:templateId",
  validatePartyId,
  validateTemplateId,
  templateMessageValidation,
  handleValidationErrors,
  validateCompanyChat,
  (req, res, next) => {
    console.log("📋 Sending template message:", {
      partyId: req.params.partyId,
      templateId: req.params.templateId,
      userId: req.user?.id,
      companyId: req.user?.companyId,
      type: req.body.type,
    });
    next();
  },
  chatController.sendTemplateMessage
);

// =============================================================================
// 🔔 NOTIFICATION ROUTES - ✅ NEW: Chat notification management
// =============================================================================

// @route   GET /api/chat/notifications/summary
// @desc    Get chat notification summary (unread count, conversation summaries)
// @access  Private (requires authentication)
router.get(
  "/notifications/summary",
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "🔔 Getting chat notification summary for user:",
      req.user?.id,
      "company:",
      req.user?.companyId
    );
    next();
  },
  chatController.getChatNotificationSummary
);

// @route   GET /api/chat/notifications/details
// @desc    Get detailed list of chat notifications
// @access  Private (requires authentication)
router.get(
  "/notifications/details",
  notificationValidation,
  handleValidationErrors,
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "📋 Getting chat notification details for user:",
      req.user?.id,
      "company:",
      req.user?.companyId,
      "page:",
      req.query.page,
      "unreadOnly:",
      req.query.unreadOnly
    );
    next();
  },
  chatController.getChatNotificationDetails
);

// @route   PUT /api/chat/notifications/mark-read
// @desc    Bulk mark chat notifications as read
// @access  Private (requires authentication)
router.put(
  "/notifications/mark-read",
  bulkNotificationValidation,
  handleValidationErrors,
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "✅ Bulk marking chat notifications as read for user:",
      req.user?.id,
      "company:",
      req.user?.companyId,
      "markAll:",
      req.body.markAll,
      "notificationIds count:",
      req.body.notificationIds?.length || 0
    );
    next();
  },
  chatController.bulkMarkChatNotificationsAsRead
);

// @route   PUT /api/chat/conversations/:partyId/read
// @desc    Mark all notifications for a specific conversation as read
// @access  Private (requires authentication)
router.put(
  "/conversations/:partyId/read",
  validatePartyId,
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "✅ Marking conversation as read:",
      "partyId:",
      req.params.partyId,
      "user:",
      req.user?.id,
      "company:",
      req.user?.companyId
    );
    next();
  },
  chatController.markConversationAsRead
);

// =============================================================================
// 🏢 COMPANY-SPECIFIC ROUTES - ✅ NEW: Company interaction routes
// =============================================================================

// @route   GET /api/chat/participants/:partyId
// @desc    Get chat participants for company-to-company chat
// @access  Private (requires authentication)
router.get(
  "/participants/:partyId",
  validatePartyId,
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "👥 Getting chat participants for company:",
      req.params.partyId,
      "requesting company:",
      req.user?.companyId,
      "type:",
      req.query.type
    );
    next();
  },
  chatController.getCompanyChatParticipants
);

// @route   GET /api/chat/active-chats
// @desc    Get active company chats
// @access  Private (requires authentication)
router.get(
  "/active-chats",
  activeChatsValidation,
  handleValidationErrors,
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "💬 Getting active company chats for user:",
      req.user?.id,
      "company:",
      req.user?.companyId,
      "type:",
      req.query.type
    );
    next();
  },
  chatController.getActiveCompanyChats
);

// @route   GET /api/chat/analytics/:partyId
// @desc    Get chat analytics for company-to-company chat
// @access  Private (requires authentication)
router.get(
  "/analytics/:partyId",
  validatePartyId,
  analyticsValidation,
  handleValidationErrors,
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "📊 Getting chat analytics for company:",
      req.params.partyId,
      "requesting company:",
      req.user?.companyId,
      "period:",
      req.query.period,
      "type:",
      req.query.type
    );
    next();
  },
  chatController.getCompanyChatAnalytics
);

// @route   GET /api/chat/company-status/:companyId
// @desc    Check if company is online
// @access  Private (requires authentication)
router.get(
  "/company-status/:companyId",
  validateCompanyId,
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "🔍 Checking company status:",
      req.params.companyId,
      "requesting company:",
      req.user?.companyId
    );
    next();
  },
  chatController.getCompanyStatus
);

// ✅ NEW: Additional company-specific routes

// @route   GET /api/chat/company-conversations
// @desc    Get conversations with company details
// @access  Private (requires authentication)
router.get(
  "/company-conversations",
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "🏢 Getting company conversations for:",
      req.user?.companyId,
      "type:",
      req.query.type
    );
    next();
  },
  chatController.getConversations // Reuse existing controller
);

// @route   GET /api/chat/company-stats
// @desc    Get company-specific chat statistics
// @access  Private (requires authentication)
router.get(
  "/company-stats",
  analyticsValidation,
  handleValidationErrors,
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "📈 Getting company stats for:",
      req.user?.companyId,
      "period:",
      req.query.period
    );
    next();
  },
  chatController.getChatStats // Reuse existing controller
);

// @route   GET /api/chat/company-search
// @desc    Search messages within company context
// @access  Private (requires authentication)
router.get(
  "/company-search",
  searchValidation,
  handleValidationErrors,
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "🔎 Company search for:",
      req.user?.companyId,
      "query:",
      req.query.query
    );
    next();
  },
  chatController.searchMessages // Reuse existing controller
);

// @route   GET /api/chat/company-unread
// @desc    Get unread count for company
// @access  Private (requires authentication)
router.get(
  "/company-unread",
  validateCompanyChat,
  (req, res, next) => {
    console.log(
      "🔔 Getting company unread count for:",
      req.user?.companyId,
      "party:",
      req.query.partyId
    );
    next();
  },
  chatController.getUnreadCount // Reuse existing controller
);

// =============================================================================
// 🛠️ ADMIN & MANAGEMENT ROUTES - ✅ NEW: Admin-specific routes
// =============================================================================

// @route   GET /api/chat/admin/overview
// @desc    Get admin overview of all company chats
// @access  Private (requires admin authentication)
router.get(
  "/admin/overview",
  // Add admin validation middleware here if needed
  (req, res, next) => {
    console.log(
      "👨‍💼 Admin overview requested by:",
      req.user?.id,
      "company:",
      req.user?.companyId
    );
    next();
  },
  chatController.getChatStats // Reuse existing controller
);

// @route   GET /api/chat/admin/companies
// @desc    Get all companies with chat activity
// @access  Private (requires admin authentication)
router.get(
  "/admin/companies",
  activeChatsValidation,
  handleValidationErrors,
  // Add admin validation middleware here if needed
  (req, res, next) => {
    console.log("👨‍💼 Admin companies overview requested");
    next();
  },
  chatController.getActiveCompanyChats // Reuse existing controller
);

// =============================================================================
// 📡 WEBHOOK & INTEGRATION ROUTES - ✅ NEW: External integration routes
// =============================================================================

// @route   POST /api/chat/webhook/whatsapp
// @desc    WhatsApp webhook for incoming messages
// @access  Public (with webhook validation)
router.post(
  "/webhook/whatsapp",
  // Add webhook validation middleware here
  (req, res, next) => {
    console.log("📞 WhatsApp webhook received");
    next();
  },
  // Add webhook handler here
  (req, res) => {
    res.json({success: true, message: "WhatsApp webhook received"});
  }
);

// @route   POST /api/chat/webhook/sms
// @desc    SMS webhook for incoming messages
// @access  Public (with webhook validation)
router.post(
  "/webhook/sms",
  // Add webhook validation middleware here
  (req, res, next) => {
    console.log("📱 SMS webhook received");
    next();
  },
  // Add webhook handler here
  (req, res) => {
    res.json({success: true, message: "SMS webhook received"});
  }
);

// @route   POST /api/chat/webhook/email
// @desc    Email webhook for incoming messages
// @access  Public (with webhook validation)
router.post(
  "/webhook/email",
  // Add webhook validation middleware here
  (req, res, next) => {
    console.log("📧 Email webhook received");
    next();
  },
  // Add webhook handler here
  (req, res) => {
    res.json({success: true, message: "Email webhook received"});
  }
);

// =============================================================================
// 🔧 DEVELOPMENT & DEBUG ROUTES - ✅ NEW: Development utilities
// =============================================================================

// @route   GET /api/chat/debug/socket-status
// @desc    Get socket connection status (development only)
// @access  Private (requires authentication)
router.get(
  "/debug/socket-status",
  // Add development environment check here
  (req, res, next) => {
    console.log("🐛 Socket status debug requested");
    next();
  },
  (req, res) => {
    const socketManager = req.app.get("socketManager");
    const stats = socketManager ? socketManager.getStats() : null;

    res.json({
      success: true,
      data: {
        socketManager: !!socketManager,
        stats,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      },
    });
  }
);

// @route   GET /api/chat/debug/company-rooms
// @desc    Get active company rooms (development only)
// @access  Private (requires authentication)
router.get(
  "/debug/company-rooms",
  validateCompanyChat,
  (req, res, next) => {
    console.log("🐛 Company rooms debug requested");
    next();
  },
  (req, res) => {
    const socketManager = req.app.get("socketManager");
    let rooms = {};

    if (socketManager) {
      try {
        rooms = socketManager.getCompanyRooms();
      } catch (error) {
        console.warn("Failed to get company rooms:", error.message);
      }
    }

    res.json({
      success: true,
      data: {
        rooms,
        requestingCompany: req.user?.companyId,
        timestamp: new Date().toISOString(),
      },
    });
  }
);

// =============================================================================
// ❌ ERROR HANDLING FOR INVALID ROUTES - ✅ UPDATED: Complete route list
// =============================================================================

// Handle 404 for chat routes
router.use("*", (req, res) => {
  console.warn("❌ Route not found:", req.method, req.originalUrl);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      // Basic routes
      "GET /api/chat/health",
      "GET /api/chat/stats",

      // Conversation routes
      "GET /api/chat/conversations",
      "GET /api/chat/history/:partyId",
      "GET /api/chat/summary/:partyId",

      // Message routes
      "POST /api/chat/send/:partyId",
      "POST /api/chat/read",
      "DELETE /api/chat/messages",

      // Search & utility
      "GET /api/chat/search",
      "GET /api/chat/unread-count",

      // Templates
      "GET /api/chat/templates/:partyId",
      "POST /api/chat/templates/:partyId/:templateId",

      // ✅ NEW: Notification routes
      "GET /api/chat/notifications/summary",
      "GET /api/chat/notifications/details",
      "PUT /api/chat/notifications/mark-read",
      "PUT /api/chat/conversations/:partyId/read",

      // ✅ NEW: Company-specific routes
      "GET /api/chat/participants/:partyId",
      "GET /api/chat/active-chats",
      "GET /api/chat/analytics/:partyId",
      "GET /api/chat/company-status/:companyId",
      "GET /api/chat/company-conversations",
      "GET /api/chat/company-stats",
      "GET /api/chat/company-search",
      "GET /api/chat/company-unread",

      // ✅ NEW: Admin routes
      "GET /api/chat/admin/overview",
      "GET /api/chat/admin/companies",

      // ✅ NEW: Webhook routes
      "POST /api/chat/webhook/whatsapp",
      "POST /api/chat/webhook/sms",
      "POST /api/chat/webhook/email",

      // ✅ NEW: Debug routes
      "GET /api/chat/debug/socket-status",
      "GET /api/chat/debug/company-rooms",
    ],
    timestamp: new Date().toISOString(),
    userAuthenticated: !!req.user,
    companyContext: !!req.user?.companyId,
    chatType: req.chatType || "unknown",
    // ✅ UPDATED: Show supported message types including "website"
    supportedMessageTypes: messageTypes,
  });
});

// =============================================================================
// 📤 EXPORT ROUTER
// =============================================================================

module.exports = router;
