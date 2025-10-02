const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const authMiddleware = require("../middleware/authMiddleware");
const chatController = require("../controllers/chatController");

// ================================
// 🔐 MIDDLEWARE
// ================================
// Apply authentication to all routes
router.use(authMiddleware);

// ================================
// 📋 VALIDATION RULES
// ================================

// Team Chat Creation Validation
const createTeamChatValidation = [
  body("name")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Chat name must be between 1 and 100 characters"),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),
  body("type")
    .isIn(["direct", "group", "company"])
    .withMessage("Type must be direct, group, or company"),
  body("participants")
    .isArray({ min: 1 })
    .withMessage("At least one participant is required"),
  body("participants.*")
    .isMongoId()
    .withMessage("Each participant must be a valid user ID"),
  body("avatar")
    .optional()
    .isURL()
    .withMessage("Avatar must be a valid URL"),
];

// Send Message Validation
const sendMessageValidation = [
  param("chatId")
    .isMongoId()
    .withMessage("Chat ID must be a valid MongoDB ObjectId"),
  body("content")
    .isLength({ min: 1, max: 5000 })
    .withMessage("Message content must be between 1 and 5000 characters"),
  body("type")
    .optional()
    .isIn(["text", "image", "file", "voice", "video", "location", "contact"])
    .withMessage("Invalid message type"),
  body("attachments")
    .optional()
    .isArray()
    .withMessage("Attachments must be an array"),
  body("replyTo")
    .optional()
    .isMongoId()
    .withMessage("Reply to must be a valid message ID"),
  body("mentions")
    .optional()
    .isArray()
    .withMessage("Mentions must be an array"),
  body("mentions.*")
    .optional()
    .isMongoId()
    .withMessage("Each mention must be a valid user ID"),
];

// Add Participants Validation
const addParticipantsValidation = [
  param("chatId")
    .isMongoId()
    .withMessage("Chat ID must be a valid MongoDB ObjectId"),
  body("participants")
    .isArray({ min: 1 })
    .withMessage("At least one participant is required"),
  body("participants.*")
    .isMongoId()
    .withMessage("Each participant must be a valid user ID"),
];

// Chat Status Update Validation
const updateStatusValidation = [
  param("chatId")
    .optional()
    .isMongoId()
    .withMessage("Chat ID must be a valid MongoDB ObjectId"),
  body("isOnline")
    .optional()
    .isBoolean()
    .withMessage("isOnline must be a boolean"),
  body("isTyping")
    .optional()
    .isBoolean()
    .withMessage("isTyping must be a boolean"),
  body("status")
    .optional()
    .isIn(["available", "busy", "away", "invisible"])
    .withMessage("Status must be available, busy, away, or invisible"),
];

// Profile Update Validation
const updateProfileValidation = [
  body("avatar")
    .optional()
    .isURL()
    .withMessage("Avatar must be a valid URL"),
  body("statusMessage")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Status message cannot exceed 100 characters"),
  body("settings")
    .optional()
    .isObject()
    .withMessage("Settings must be an object"),
];

// ================================
// 🏠 TEAM CHAT ROUTES
// ================================

/**
 * @route   GET /api/team-chats
 * @desc    Get all team chats for the authenticated user
 * @access  Private
 */
router.get("/", chatController.getUserTeamChats);

/**
 * @route   POST /api/team-chats
 * @desc    Create a new team chat
 * @access  Private
 */
router.post("/", createTeamChatValidation, chatController.createTeamChat);

/**
 * @route   GET /api/team-chats/:chatId
 * @desc    Get team chat details
 * @access  Private
 */
router.get(
  "/:chatId",
  param("chatId").isMongoId().withMessage("Chat ID must be a valid MongoDB ObjectId"),
  chatController.getTeamChatDetails
);

/**
 * @route   POST /api/team-chats/:chatId/messages
 * @desc    Send a message to team chat
 * @access  Private
 */
router.post(
  "/:chatId/messages",
  sendMessageValidation,
  chatController.sendTeamChatMessage
);

/**
 * @route   GET /api/team-chats/:chatId/messages
 * @desc    Get team chat messages with pagination
 * @access  Private
 */
router.get(
  "/:chatId/messages",
  [
    param("chatId").isMongoId().withMessage("Chat ID must be a valid MongoDB ObjectId"),
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  ],
  chatController.getTeamChatMessages
);

/**
 * @route   POST /api/team-chats/:chatId/participants
 * @desc    Add participants to team chat
 * @access  Private
 */
router.post(
  "/:chatId/participants",
  addParticipantsValidation,
  chatController.addTeamChatParticipants
);

/**
 * @route   PUT /api/team-chats/:chatId/status
 * @desc    Update user's status in chat (typing, online status)
 * @access  Private
 */
router.put(
  "/:chatId/status",
  updateStatusValidation,
  chatController.updateUserChatStatus
);

/**
 * @route   PUT /api/team-chats/profile
 * @desc    Update user's chat profile
 * @access  Private
 */
router.put(
  "/profile",
  updateProfileValidation,
  chatController.updateChatProfile
);

/**
 * @route   GET /api/team-chats/users/search
 * @desc    Search users for team chat creation
 * @access  Private
 */
router.get(
  "/users/search",
  [
    query("query")
      .isLength({ min: 2 })
      .withMessage("Search query must be at least 2 characters"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
  ],
  chatController.searchUsersForChat
);

// ================================
// 🔄 REAL-TIME STATUS ROUTES
// ================================

/**
 * @route   PUT /api/team-chats/status/global
 * @desc    Update user's global online status
 * @access  Private
 */
router.put(
  "/status/global",
  [
    body("isOnline")
      .optional()
      .isBoolean()
      .withMessage("isOnline must be a boolean"),
    body("status")
      .optional()
      .isIn(["available", "busy", "away", "invisible"])
      .withMessage("Status must be available, busy, away, or invisible"),
  ],
  chatController.updateUserChatStatus
);

// ================================
// �️ CHAT MANAGEMENT ROUTES
// ================================

/**
 * @route   DELETE /api/team-chats/:chatId/delete-for-me
 * @desc    Delete chat for current user only
 * @access  Private
 */
router.delete(
  "/:chatId/delete-for-me",
  param("chatId").isMongoId().withMessage("Chat ID must be a valid MongoDB ObjectId"),
  chatController.deleteChatForUser
);

/**
 * @route   PUT /api/team-chats/:chatId/hide
 * @desc    Hide chat for current user
 * @access  Private
 */
router.put(
  "/:chatId/hide",
  param("chatId").isMongoId().withMessage("Chat ID must be a valid MongoDB ObjectId"),
  chatController.hideChatForUser
);

/**
 * @route   PUT /api/team-chats/:chatId/restore
 * @desc    Restore hidden/deleted chat for current user
 * @access  Private
 */
router.put(
  "/:chatId/restore",
  param("chatId").isMongoId().withMessage("Chat ID must be a valid MongoDB ObjectId"),
  chatController.restoreChatForUser
);

/**
 * @route   POST /api/team-chats/:chatId/leave
 * @desc    Leave chat (remove from participants)
 * @access  Private
 */
router.post(
  "/:chatId/leave",
  param("chatId").isMongoId().withMessage("Chat ID must be a valid MongoDB ObjectId"),
  chatController.leaveChatAsUser
);

/**
 * @route   DELETE /api/team-chats/messages/:messageId/delete-for-me
 * @desc    Delete message for current user only
 * @access  Private
 */
router.delete(
  "/messages/:messageId/delete-for-me",
  param("messageId").isMongoId().withMessage("Message ID must be a valid MongoDB ObjectId"),
  chatController.deleteMessageForUser
);

/**
 * @route   DELETE /api/team-chats/messages/:messageId/delete-for-everyone
 * @desc    Delete message for everyone (sender or admin only)
 * @access  Private
 */
router.delete(
  "/messages/:messageId/delete-for-everyone",
  param("messageId").isMongoId().withMessage("Message ID must be a valid MongoDB ObjectId"),
  chatController.deleteMessageForEveryone
);

/**
 * @route   POST /api/team-chats/:chatId/read
 * @desc    Mark messages as read in chat
 * @access  Private
 */
router.post(
  "/:chatId/read",
  [
    param("chatId").isMongoId().withMessage("Chat ID must be a valid MongoDB ObjectId"),
    body("messageIds")
      .optional()
      .isArray()
      .withMessage("Message IDs must be an array"),
    body("messageIds.*")
      .optional()
      .isMongoId()
      .withMessage("Each message ID must be a valid MongoDB ObjectId"),
  ],
  chatController.markChatMessagesAsRead
);

/**
 * @route   GET /api/team-chats/:chatId/stats
 * @desc    Get chat statistics for user
 * @access  Private
 */
router.get(
  "/:chatId/stats",
  param("chatId").isMongoId().withMessage("Chat ID must be a valid MongoDB ObjectId"),
  chatController.getChatStatsForUser
);

// ================================
// �📊 CHAT ANALYTICS ROUTES (Optional)
// ================================

/**
 * @route   GET /api/team-chats/:chatId/analytics
 * @desc    Get team chat analytics
 * @access  Private (Admin only)
 */
router.get(
  "/:chatId/analytics",
  [
    param("chatId").isMongoId().withMessage("Chat ID must be a valid MongoDB ObjectId"),
    query("period")
      .optional()
      .isIn(["1d", "7d", "30d", "90d"])
      .withMessage("Period must be 1d, 7d, 30d, or 90d"),
  ],
  // Add admin check middleware here if needed
  // adminMiddleware,
  async (req, res) => {
    try {
      const { chatId } = req.params;
      const { period = "7d" } = req.query;
      
      // Basic analytics implementation
      const TeamChat = require("../models/TeamChat");
      const ChatMessage = require("../models/ChatMessage");
      
      const chat = await TeamChat.findById(chatId);
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found",
        });
      }
      
      const now = new Date();
      const startDate = new Date();
      
      switch (period) {
        case "1d":
          startDate.setDate(now.getDate() - 1);
          break;
        case "7d":
          startDate.setDate(now.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(now.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }
      
      const messageCount = await ChatMessage.countDocuments({
        chat: chatId,
        createdAt: { $gte: startDate },
        isDeleted: false,
      });
      
      const participantCount = chat.participants.length;
      
      res.json({
        success: true,
        data: {
          period,
          startDate,
          endDate: now,
          messageCount,
          participantCount,
          chatName: chat.name,
          chatType: chat.type,
        },
      });
    } catch (error) {
      console.error("Team chat analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get analytics",
        error: error.message,
      });
    }
  }
);

module.exports = router;