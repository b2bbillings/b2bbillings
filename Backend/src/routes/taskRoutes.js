const express = require("express");
const {body, param, query, validationResult} = require("express-validator");
const {
  createTask,
  getAllTasks,
  getTodaysTasks,
  getOverdueTasks,
  getTaskById,
  updateTask,
  deleteTask,
  updateTaskStatus,
  updateTaskProgress,
  addTaskNote,
  getTaskStatistics,
  bulkAssignTasks,
  getTaskReminders,
} = require("../controllers/taskController");

// Import auth middleware
const {
  authenticate,
  requireCompanyAccess,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);
router.use(requireCompanyAccess);

// ================================
// 🔧 VALIDATION MIDDLEWARE
// ================================

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// Task types enum (updated to match your model)
const TASK_TYPES = [
  "Customer Call",
  "Follow-up Call",
  "Customer Survey",
  "Schedule Appointment",
  "Service Appointment",
  "Payment Collection",
  "Marketing Campaign",
  "Store Management",
  "Administrative Task",
  "Lead Generation",
  "Product Demo",
  "Customer Support",
  "Data Entry",
  "Inventory Check",
  "follow_up",
  "meeting",
  "call",
  "email",
  "visit",
  "delivery",
  "payment_reminder",
  "Other",
];

const STATUSES = [
  "pending",
  "in-progress",
  "completed",
  "delayed",
  "cancelled",
];
const PRIORITIES = ["low", "medium", "high", "urgent"];

// Create task validation
const createTaskValidation = [
  body("assignedTo")
    .notEmpty()
    .withMessage("Assigned staff member is required")
    .isMongoId()
    .withMessage("Invalid staff member ID"),

  body("taskType")
    .notEmpty()
    .withMessage("Task type is required")
    .isIn(TASK_TYPES)
    .withMessage("Invalid task type"),

  body("customer").notEmpty().withMessage("Customer information is required"),

  body("customer.name")
    .if(body("customer").isObject())
    .notEmpty()
    .withMessage("Customer name is required"),

  body("description")
    .notEmpty()
    .withMessage("Task description is required")
    .isLength({min: 10, max: 1000})
    .withMessage("Description must be between 10 and 1000 characters"),

  body("dueDate")
    .notEmpty()
    .withMessage("Due date is required")
    .isISO8601()
    .withMessage("Invalid due date format")
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error("Due date cannot be in the past");
      }
      return true;
    }),

  body("priority")
    .optional()
    .isIn(PRIORITIES)
    .withMessage("Invalid priority level"),

  body("reminder.reminderTime")
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Invalid reminder time format (use HH:MM)"),

  body("estimatedDuration")
    .optional()
    .isInt({min: 1, max: 1440})
    .withMessage("Estimated duration must be between 1 and 1440 minutes"),

  body("tags").optional().isArray().withMessage("Tags must be an array"),

  body("tags.*")
    .optional()
    .isLength({min: 1, max: 50})
    .withMessage("Each tag must be between 1 and 50 characters"),

  handleValidationErrors,
];

// Update task validation
const updateTaskValidation = [
  param("id").isMongoId().withMessage("Invalid task ID"),

  body("assignedTo")
    .optional()
    .isMongoId()
    .withMessage("Invalid staff member ID"),

  body("taskType").optional().isIn(TASK_TYPES).withMessage("Invalid task type"),

  body("description")
    .optional()
    .isLength({min: 10, max: 1000})
    .withMessage("Description must be between 10 and 1000 characters"),

  body("dueDate").optional().isISO8601().withMessage("Invalid due date format"),

  body("priority")
    .optional()
    .isIn(PRIORITIES)
    .withMessage("Invalid priority level"),

  body("status").optional().isIn(STATUSES).withMessage("Invalid status"),

  handleValidationErrors,
];

// Status update validation
const statusUpdateValidation = [
  param("id").isMongoId().withMessage("Invalid task ID"),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(STATUSES)
    .withMessage("Invalid status value"),

  body("resultData")
    .optional()
    .isObject()
    .withMessage("Result data must be an object"),

  handleValidationErrors,
];

// Progress update validation
const progressUpdateValidation = [
  param("id").isMongoId().withMessage("Invalid task ID"),

  body("percentage")
    .notEmpty()
    .withMessage("Progress percentage is required")
    .isInt({min: 0, max: 100})
    .withMessage("Progress percentage must be between 0 and 100"),

  handleValidationErrors,
];

// Add note validation
const addNoteValidation = [
  param("id").isMongoId().withMessage("Invalid task ID"),

  body("note")
    .notEmpty()
    .withMessage("Note content is required")
    .isLength({min: 1, max: 500})
    .withMessage("Note must be between 1 and 500 characters")
    .trim(),

  handleValidationErrors,
];

// Bulk assign validation
const bulkAssignValidation = [
  body("tasks")
    .notEmpty()
    .withMessage("Tasks array is required")
    .isArray({min: 1, max: 50})
    .withMessage("Tasks array must contain 1-50 tasks"),

  body("tasks.*.assignedTo")
    .notEmpty()
    .withMessage("Each task must have assignedTo")
    .isMongoId()
    .withMessage("Invalid staff member ID"),

  body("tasks.*.taskType")
    .notEmpty()
    .withMessage("Each task must have taskType")
    .isIn(TASK_TYPES)
    .withMessage("Invalid task type"),

  body("tasks.*.customer")
    .notEmpty()
    .withMessage("Each task must have customer information"),

  body("tasks.*.description")
    .notEmpty()
    .withMessage("Each task must have description")
    .isLength({min: 10, max: 1000})
    .withMessage("Description must be between 10 and 1000 characters"),

  body("tasks.*.dueDate")
    .notEmpty()
    .withMessage("Each task must have due date")
    .isISO8601()
    .withMessage("Invalid due date format"),

  handleValidationErrors,
];

// Query validation for GET routes
const queryValidation = [
  query("page")
    .optional()
    .isInt({min: 1})
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({min: 1, max: 100})
    .withMessage("Limit must be between 1 and 100"),

  query("status")
    .optional()
    .isIn(["all", ...STATUSES])
    .withMessage("Invalid status filter"),

  query("priority")
    .optional()
    .isIn(["all", ...PRIORITIES])
    .withMessage("Invalid priority filter"),

  query("taskType")
    .optional()
    .isIn(["all", ...TASK_TYPES])
    .withMessage("Invalid task type filter"),

  query("assignedTo")
    .optional()
    .custom((value) => {
      if (value !== "all" && !value.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error("Invalid assignedTo filter");
      }
      return true;
    }),

  query("sortBy")
    .optional()
    .isIn([
      "dueDate",
      "createdAt",
      "priority",
      "status",
      "taskType",
      "assignedTo",
      "customer",
    ])
    .withMessage("Invalid sort field"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Invalid sort order"),

  query("search")
    .optional()
    .isLength({min: 1, max: 100})
    .withMessage("Search term must be between 1 and 100 characters"),

  query("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("Invalid dateFrom format"),

  query("dateTo").optional().isISO8601().withMessage("Invalid dateTo format"),

  handleValidationErrors,
];

// MongoDB ID validation
const mongoIdValidation = [
  param("id").isMongoId().withMessage("Invalid task ID"),
  handleValidationErrors,
];

// ================================
// 📊 SPECIFIC ROUTES (Must come first)
// ================================

// Task statistics
router.get("/statistics", getTaskStatistics);

// Task reminders
router.get("/reminders", getTaskReminders);

// Date-based routes
router.get("/today", getTodaysTasks);
router.get("/overdue", getOverdueTasks);

// Bulk operations
router.post("/bulk-assign", bulkAssignValidation, bulkAssignTasks);

// ================================
// 📋 MAIN CRUD ROUTES
// ================================

// Create task (POST must come before /:id routes)
router.post("/", createTaskValidation, createTask);

// Get all tasks with filters
router.get("/", queryValidation, getAllTasks);

// Individual task operations
router.get("/:id", mongoIdValidation, getTaskById);
router.put("/:id", updateTaskValidation, updateTask);
router.delete(
  "/:id",
  mongoIdValidation,
  query("permanent")
    .optional()
    .isBoolean()
    .withMessage("Permanent flag must be boolean"),
  body("reason")
    .optional()
    .trim()
    .isLength({max: 500})
    .withMessage("Deletion reason cannot exceed 500 characters"),
  handleValidationErrors,
  deleteTask
);

// ================================
// 🔧 STATUS & PROGRESS MANAGEMENT
// ================================

// Update task status
router.put("/:id/status", statusUpdateValidation, updateTaskStatus);

// Update task progress
router.put("/:id/progress", progressUpdateValidation, updateTaskProgress);

// ================================
// 📝 NOTES MANAGEMENT
// ================================

// Add note to task
router.post("/:id/notes", addNoteValidation, addTaskNote);

// ================================
// 🚨 ERROR HANDLING
// ================================

router.use((error, req, res, next) => {
  let statusCode = 500;
  let message = "Internal server error";

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    return res.status(statusCode).json({
      success: false,
      message,
      errors: Object.values(error.errors).map((err) => err.message),
    });
  }

  if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
  }

  if (error.code === 11000) {
    statusCode = 409;
    message = "Duplicate field value";
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

module.exports = router;
