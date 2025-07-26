const express = require("express");
const {body, param, query} = require("express-validator");
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

// Import auth middleware (matching staffRoutes pattern)
const {
  authenticate,
  requireCompanyAccess,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Apply authentication to all routes (matching staffRoutes pattern)
router.use(authenticate);
router.use(requireCompanyAccess);

// ================================
// 🔧 VALIDATION MIDDLEWARE
// ================================

// Validation rules for creating tasks
const createTaskValidation = [
  body("assignedTo")
    .notEmpty()
    .withMessage("Assigned staff member is required")
    .isMongoId()
    .withMessage("Invalid staff member ID"),

  body("taskType")
    .notEmpty()
    .withMessage("Task type is required")
    .isIn([
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
      "Other",
    ])
    .withMessage("Invalid task type"),

  body("customer").notEmpty().withMessage("Customer information is required"),

  body("description")
    .notEmpty()
    .withMessage("Task description is required")
    .isLength({min: 10, max: 1000})
    .withMessage("Description must be between 10 and 1000 characters"),

  body("dueDate")
    .notEmpty()
    .withMessage("Due date is required")
    .isISO8601()
    .withMessage("Invalid due date format (use ISO 8601)")
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error("Due date cannot be in the past");
      }
      return true;
    }),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
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
];

// Validation rules for updating tasks
const updateTaskValidation = [
  param("id").isMongoId().withMessage("Invalid task ID"),

  body("assignedTo")
    .optional()
    .isMongoId()
    .withMessage("Invalid staff member ID"),

  body("taskType")
    .optional()
    .isIn([
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
      "Other",
    ])
    .withMessage("Invalid task type"),

  body("description")
    .optional()
    .isLength({min: 10, max: 1000})
    .withMessage("Description must be between 10 and 1000 characters"),

  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid due date format (use ISO 8601)"),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Invalid priority level"),

  body("status")
    .optional()
    .isIn(["pending", "in-progress", "completed", "delayed", "cancelled"])
    .withMessage("Invalid status"),

  body("reminder.reminderTime")
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Invalid reminder time format (use HH:MM)"),
];

// Validation rules for status update
const statusUpdateValidation = [
  param("id").isMongoId().withMessage("Invalid task ID"),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["pending", "in-progress", "completed", "delayed", "cancelled"])
    .withMessage("Invalid status value"),

  body("resultData")
    .optional()
    .isObject()
    .withMessage("Result data must be an object"),

  body("resultData.outcome")
    .optional()
    .isIn(["successful", "unsuccessful", "rescheduled", "cancelled", "pending"])
    .withMessage("Invalid outcome value"),

  body("resultData.resultNotes")
    .optional()
    .isLength({max: 500})
    .withMessage("Result notes cannot exceed 500 characters"),

  body("resultData.followUpRequired")
    .optional()
    .isBoolean()
    .withMessage("Follow up required must be boolean"),

  body("resultData.followUpDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid follow up date format"),
];

// Validation rules for progress update
const progressUpdateValidation = [
  param("id").isMongoId().withMessage("Invalid task ID"),

  body("percentage")
    .notEmpty()
    .withMessage("Progress percentage is required")
    .isInt({min: 0, max: 100})
    .withMessage("Progress percentage must be between 0 and 100"),
];

// Validation rules for adding notes
const addNoteValidation = [
  param("id").isMongoId().withMessage("Invalid task ID"),

  body("note")
    .notEmpty()
    .withMessage("Note content is required")
    .isLength({min: 1, max: 500})
    .withMessage("Note must be between 1 and 500 characters")
    .trim(),
];

// Validation rules for bulk assign
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
    .isIn([
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
      "Other",
    ])
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
];

// Validation for pagination
const paginationValidation = [
  query("page")
    .optional()
    .isInt({min: 1})
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({min: 1, max: 100})
    .withMessage("Limit must be between 1 and 100"),
];

// Validation for MongoDB ID
const mongoIdValidation = [
  param("id").isMongoId().withMessage("Invalid task ID"),
];

// ================================
// 📊 TASK STATISTICS (Keep at top - most specific)
// ================================

// @route   GET /api/tasks/statistics
// @desc    Get task statistics and analytics
// @access  Private (Any company user)
router.get("/statistics", getTaskStatistics);

// ================================
// 🔔 TASK REMINDERS (Specific routes before generic)
// ================================

// @route   GET /api/tasks/reminders
// @desc    Get task reminders for today
// @access  Private (Any company user)
router.get("/reminders", getTaskReminders);

// ================================
// 📅 DATE-BASED TASK ROUTES (Specific routes before generic)
// ================================

// @route   GET /api/tasks/today
// @desc    Get today's tasks
// @access  Private (Any company user)
router.get("/today", getTodaysTasks);

// @route   GET /api/tasks/overdue
// @desc    Get overdue tasks
// @access  Private (Any company user)
router.get("/overdue", getOverdueTasks);

// ================================
// 📦 BULK OPERATIONS (Specific routes before generic)
// ================================

// @route   POST /api/tasks/bulk-assign
// @desc    Bulk assign multiple tasks
// @access  Private (Any company user)
router.post("/bulk-assign", bulkAssignValidation, bulkAssignTasks);

// ================================
// 📋 MAIN CRUD ROUTES (Critical order: POST before GET /:id)
// ================================

// ✅ POST ROUTE MUST COME BEFORE /:id ROUTES
// @route   POST /api/tasks
// @desc    Create new task assignment
// @access  Private (Any company user)
router.post("/", createTaskValidation, createTask);

// @route   GET /api/tasks
// @desc    Get all tasks with filters and pagination
// @access  Private (Any company user)
router.get(
  "/",
  paginationValidation,
  query("status")
    .optional()
    .isIn([
      "all",
      "pending",
      "in-progress",
      "completed",
      "delayed",
      "cancelled",
    ])
    .withMessage("Invalid status filter"),
  query("priority")
    .optional()
    .isIn(["all", "low", "medium", "high", "urgent"])
    .withMessage("Invalid priority filter"),
  query("assignedTo")
    .optional()
    .custom((value) => {
      if (value !== "all" && !value.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error(
          "Invalid assignedTo filter - must be 'all' or valid MongoDB ID"
        );
      }
      return true;
    }),
  query("taskType")
    .optional()
    .isIn([
      "all",
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
      "Other",
    ])
    .withMessage("Invalid task type filter"),
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
  getAllTasks
);

// ✅ GENERIC /:id ROUTES COME AFTER POST
// @route   GET /api/tasks/:id
// @desc    Get single task by ID
// @access  Private (Any company user)
router.get("/:id", mongoIdValidation, getTaskById);

// @route   PUT /api/tasks/:id
// @desc    Update task
// @access  Private (Any company user)
router.put("/:id", updateTaskValidation, updateTask);

// @route   DELETE /api/tasks/:id
// @desc    Delete task (soft delete by default, hard delete with ?permanent=true)
// @access  Private (Any company user)
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
  deleteTask
);

// ================================
// 🔧 STATUS & PROGRESS MANAGEMENT
// ================================

// @route   PUT /api/tasks/:id/status
// @desc    Update task status
// @access  Private (Any company user)
router.put("/:id/status", statusUpdateValidation, updateTaskStatus);

// @route   PUT /api/tasks/:id/progress
// @desc    Update task progress percentage
// @access  Private (Any company user)
router.put("/:id/progress", progressUpdateValidation, updateTaskProgress);

// ================================
// 📝 NOTES MANAGEMENT
// ================================

// @route   POST /api/tasks/:id/notes
// @desc    Add note to task
// @access  Private (Any company user)
router.post("/:id/notes", addNoteValidation, addTaskNote);

// ================================
// 🚨 ERROR HANDLING MIDDLEWARE
// ================================

// Error handling middleware for this router (matching staffRoutes pattern)
router.use((error, req, res, next) => {
  console.error("Task routes error:", error);

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: Object.values(error.errors).map((err) => err.message),
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
  }

  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "Duplicate field value entered",
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

module.exports = router;
