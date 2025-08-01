const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const {body, param, query} = require("express-validator");
const validation = require("../middleware/validation");
const {authenticate, optionalAuth} = require("../middleware/authMiddleware");

// ✅ Apply authentication to all notification routes
router.use(authenticate);

// ===============================
// 📊 VALIDATION RULES
// ===============================

// Notification creation validation rules
const createNotificationValidationRules = [
  body("title")
    .trim()
    .isLength({min: 1, max: 200})
    .withMessage("Title must be between 1 and 200 characters"),

  body("message")
    .trim()
    .isLength({min: 1, max: 1000})
    .withMessage("Message must be between 1 and 1000 characters"),

  body("type")
    .optional()
    .isIn([
      "system",
      "transaction",
      "inventory",
      "task",
      "security",
      "reminder",
      "chat",
      "order",
      "report",
      "backup",
      "user",
      "company",
      "warning",
      "error",
      "success",
      "info",
    ])
    .withMessage("Invalid notification type"),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "critical"])
    .withMessage("Priority must be low, medium, high, or critical"),

  body("recipients")
    .isArray({min: 1})
    .withMessage("At least one recipient is required"),

  body("recipients.*.userId")
    .isMongoId()
    .withMessage("Each recipient must have a valid user ID"),

  body("recipients.*.companyId")
    .optional()
    .isMongoId()
    .withMessage("Company ID must be a valid MongoDB ObjectId"),

  body("relatedTo.entityType")
    .optional()
    .isIn([
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
    ])
    .withMessage("Invalid entity type"),

  body("relatedTo.entityId")
    .optional()
    .isMongoId()
    .withMessage("Entity ID must be a valid MongoDB ObjectId"),

  body("actionUrl")
    .optional()
    .isURL()
    .withMessage("Action URL must be a valid URL"),

  body("actionLabel")
    .optional()
    .trim()
    .isLength({max: 50})
    .withMessage("Action label cannot exceed 50 characters"),

  body("channels.inApp")
    .optional()
    .isBoolean()
    .withMessage("In-app channel must be boolean"),

  body("channels.email")
    .optional()
    .isBoolean()
    .withMessage("Email channel must be boolean"),

  body("channels.sms")
    .optional()
    .isBoolean()
    .withMessage("SMS channel must be boolean"),

  body("channels.whatsapp")
    .optional()
    .isBoolean()
    .withMessage("WhatsApp channel must be boolean"),

  body("channels.push")
    .optional()
    .isBoolean()
    .withMessage("Push channel must be boolean"),

  body("scheduledFor")
    .optional()
    .isISO8601()
    .withMessage("Scheduled date must be a valid ISO 8601 date"),

  body("groupId")
    .optional()
    .trim()
    .isLength({max: 100})
    .withMessage("Group ID cannot exceed 100 characters"),

  body("templateId")
    .optional()
    .trim()
    .isLength({max: 100})
    .withMessage("Template ID cannot exceed 100 characters"),

  body("metadata.source")
    .optional()
    .trim()
    .isLength({max: 100})
    .withMessage("Metadata source cannot exceed 100 characters"),

  body("metadata.tags")
    .optional()
    .isArray()
    .withMessage("Metadata tags must be an array"),

  body("metadata.tags.*")
    .optional()
    .trim()
    .isLength({max: 50})
    .withMessage("Each tag cannot exceed 50 characters"),
];

// Parameter validation rules
const notificationIdValidationRules = [
  param("notificationId")
    .isMongoId()
    .withMessage("Notification ID must be a valid MongoDB ObjectId"),
];

const companyIdValidationRules = [
  param("companyId")
    .isMongoId()
    .withMessage("Company ID must be a valid MongoDB ObjectId"),
];

const groupIdValidationRules = [
  param("groupId")
    .trim()
    .isLength({min: 1, max: 100})
    .withMessage("Group ID must be between 1 and 100 characters"),
];

// Query parameter validation rules
const queryValidationRules = [
  query("page")
    .optional()
    .isInt({min: 1})
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({min: 1, max: 100})
    .withMessage("Limit must be between 1 and 100"),

  query("type")
    .optional()
    .isIn([
      "system",
      "transaction",
      "inventory",
      "task",
      "security",
      "reminder",
      "chat",
      "order",
      "report",
      "backup",
      "user",
      "company",
      "warning",
      "error",
      "success",
      "info",
    ])
    .withMessage("Invalid notification type filter"),

  query("priority")
    .optional()
    .isIn(["low", "medium", "high", "critical"])
    .withMessage("Priority filter must be low, medium, high, or critical"),

  query("unreadOnly")
    .optional()
    .isBoolean()
    .withMessage("Unread only filter must be boolean"),

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),

  query("sortBy")
    .optional()
    .isIn(["createdAt", "updatedAt", "priority", "type", "readAt"])
    .withMessage(
      "Sort by must be createdAt, updatedAt, priority, type, or readAt"
    ),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),

  query("companyId")
    .optional()
    .isMongoId()
    .withMessage("Company ID must be a valid MongoDB ObjectId"),
];

// ===============================
// 📥 GET NOTIFICATIONS
// ===============================

// Get user notifications with filtering and pagination
router.get(
  "/",
  queryValidationRules,
  validation.handleValidationErrors,
  notificationController.getUserNotifications
);

// Get unread count (put before parameterized routes)
router.get(
  "/unread-count",
  query("companyId")
    .optional()
    .isMongoId()
    .withMessage("Company ID must be a valid MongoDB ObjectId"),
  validation.handleValidationErrors,
  notificationController.getUnreadCount
);

// Get notification statistics for company
router.get(
  "/stats/:companyId",
  companyIdValidationRules.concat([
    query("startDate")
      .optional()
      .isISO8601()
      .withMessage("Start date must be a valid ISO 8601 date"),
    query("endDate")
      .optional()
      .isISO8601()
      .withMessage("End date must be a valid ISO 8601 date"),
  ]),
  validation.handleValidationErrors,
  notificationController.getNotificationStats
);

// Get notifications by group
router.get(
  "/group/:groupId",
  groupIdValidationRules.concat([
    query("page")
      .optional()
      .isInt({min: 1})
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({min: 1, max: 100})
      .withMessage("Limit must be between 1 and 100"),
  ]),
  validation.handleValidationErrors,
  notificationController.getNotificationsByGroup
);

// Get single notification by ID (must be after other specific routes)
router.get(
  "/:notificationId",
  notificationIdValidationRules,
  validation.handleValidationErrors,
  notificationController.getNotificationById
);

// ===============================
// 📤 CREATE NOTIFICATIONS
// ===============================

// Create new notification
router.post(
  "/",
  createNotificationValidationRules,
  validation.handleValidationErrors,
  notificationController.createNotification
);

// ===============================
// ✏️ UPDATE NOTIFICATIONS
// ===============================

// Mark all notifications as read (put before parameterized routes)
router.put(
  "/mark-all-read",
  query("companyId")
    .optional()
    .isMongoId()
    .withMessage("Company ID must be a valid MongoDB ObjectId"),
  validation.handleValidationErrors,
  notificationController.markAllAsRead
);

// Mark notification as read
router.put(
  "/:notificationId/read",
  notificationIdValidationRules,
  validation.handleValidationErrors,
  notificationController.markAsRead
);

// Mark notification as clicked (for analytics)
router.put(
  "/:notificationId/click",
  notificationIdValidationRules,
  validation.handleValidationErrors,
  notificationController.markAsClicked
);

// Archive notification
router.put(
  "/:notificationId/archive",
  notificationIdValidationRules,
  validation.handleValidationErrors,
  notificationController.archiveNotification
);

// ===============================
// 🗑️ DELETE NOTIFICATIONS
// ===============================

// Cleanup expired notifications (admin only) - put before parameterized routes
router.delete(
  "/cleanup/expired",
  notificationController.cleanupExpiredNotifications
);

// Delete notification
router.delete(
  "/:notificationId",
  notificationIdValidationRules,
  validation.handleValidationErrors,
  notificationController.deleteNotification
);

module.exports = router;
