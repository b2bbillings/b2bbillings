const express = require("express");
const {body, param, query} = require("express-validator");
const {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  restoreStaff, // ✅ NEW: Import restore function
  getDeletedStaff, // ✅ NEW: Import get deleted function
  uploadDocuments,
  verifyDocument,
  setPassword,
  getStaffStatistics,
  searchStaff,
  getStaffByRole,
  updateStaffStatus,
  assignTask,
  validateCompanyAccess,
} = require("../controllers/staffController");

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

// Validation middleware for staff creation
const createStaffValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({min: 2, max: 100})
    .withMessage("Name must be between 2 and 100 characters"),

  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn([
      "admin",
      "manager",
      "supervisor",
      "cashier",
      "salesperson",
      "inventory",
      "accountant",
      "delivery",
      "security",
      "cleaner",
      "technician",
    ])
    .withMessage("Invalid role selected"),

  body("post")
    .optional()
    .isIn([
      "junior",
      "senior",
      "assistant",
      "executive",
      "officer",
      "head",
      "lead",
      "trainee",
    ])
    .withMessage("Invalid post selected"),

  body("mobileNumbers")
    .isArray({min: 1})
    .withMessage("At least one mobile number is required")
    .custom((mobileNumbers) => {
      if (!mobileNumbers.every((num) => /^\d{10}$/.test(num))) {
        throw new Error("All mobile numbers must be 10 digits");
      }
      return true;
    }),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("address.street").trim().notEmpty().withMessage("Address is required"),

  body("address.city").trim().notEmpty().withMessage("City is required"),

  body("address.state").trim().notEmpty().withMessage("State is required"),

  body("address.pincode")
    .optional()
    .matches(/^\d{6}$/)
    .withMessage("Pincode must be 6 digits"),

  body("employment.joinDate")
    .notEmpty()
    .withMessage("Join date is required")
    .isISO8601()
    .withMessage("Please provide a valid join date"),

  body("employment.salary")
    .optional()
    .isNumeric()
    .withMessage("Salary must be a number")
    .isFloat({min: 0})
    .withMessage("Salary cannot be negative"),

  body("employment.department")
    .optional()
    .isIn([
      "Sales",
      "Marketing",
      "Finance",
      "Operations",
      "Human Resources",
      "IT",
      "Customer Service",
      "Inventory",
      "Security",
      "Administration",
    ])
    .withMessage("Invalid department selected"),

  body("employment.employmentType")
    .optional()
    .isIn(["full-time", "part-time", "contract", "internship"])
    .withMessage("Invalid employment type"),

  body("permissions")
    .optional()
    .isArray()
    .withMessage("Permissions must be an array")
    .custom((permissions) => {
      const validPermissions = [
        "dashboard",
        "sales",
        "purchases",
        "inventory",
        "customers",
        "suppliers",
        "staff",
        "reports",
        "settings",
      ];
      if (!permissions.every((perm) => validPermissions.includes(perm))) {
        throw new Error("Invalid permission detected");
      }
      return true;
    }),

  body("emergencyContact.phone")
    .optional()
    .matches(/^\d{10}$/)
    .withMessage("Emergency contact number must be 10 digits"),
];

// Validation for staff update
const updateStaffValidation = [
  param("id").isMongoId().withMessage("Invalid staff ID"),

  body("name")
    .optional()
    .trim()
    .isLength({min: 2, max: 100})
    .withMessage("Name must be between 2 and 100 characters"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("mobileNumbers")
    .optional()
    .isArray({min: 1})
    .withMessage("At least one mobile number is required")
    .custom((mobileNumbers) => {
      if (!mobileNumbers.every((num) => /^\d{10}$/.test(num))) {
        throw new Error("All mobile numbers must be 10 digits");
      }
      return true;
    }),
];

// ✅ NEW: Validation for deletion reason
const deleteStaffValidation = [
  param("id").isMongoId().withMessage("Invalid staff ID"),
  query("permanent")
    .optional()
    .isBoolean()
    .withMessage("Permanent flag must be boolean"),
  body("reason")
    .optional()
    .trim()
    .isLength({max: 500})
    .withMessage("Deletion reason cannot exceed 500 characters"),
];

// Validation for password setting
const setPasswordValidation = [
  param("id").isMongoId().withMessage("Invalid staff ID"),

  body("password")
    .isLength({min: 6})
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),

  body("confirmPassword").custom((value, {req}) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match");
    }
    return true;
  }),
];

// Validation for search
const searchValidation = [
  query("q")
    .trim()
    .isLength({min: 2})
    .withMessage("Search term must be at least 2 characters"),

  query("limit")
    .optional()
    .isInt({min: 1, max: 100})
    .withMessage("Limit must be between 1 and 100"),
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
  param("id").isMongoId().withMessage("Invalid staff ID"),
];

// Validation for status update
const statusUpdateValidation = [
  param("id").isMongoId().withMessage("Invalid staff ID"),

  body("status")
    .isIn(["active", "inactive", "terminated", "on-leave", "suspended"])
    .withMessage("Invalid status value"),
];

// ================================
// 📊 STAFF STATISTICS (Keep at top - most specific)
// ================================

// @route   GET /api/staff/statistics
// @desc    Get staff statistics
// @access  Private (Any company user)
router.get("/statistics", getStaffStatistics);

// ================================
// ✅ NEW: DELETED STAFF MANAGEMENT (Specific routes before generic)
// ================================

// @route   GET /api/staff/deleted
// @desc    Get soft-deleted staff members
// @access  Private (Any company user)
router.get("/deleted", paginationValidation, getDeletedStaff);

// ================================
// 🔍 SEARCH & FILTER ROUTES (Specific routes before generic)
// ================================

// @route   GET /api/staff/search
// @desc    Search staff members
// @access  Private (Any company user)
router.get("/search", searchValidation, searchStaff);

// @route   GET /api/staff/by-role/:role
// @desc    Get staff by role
// @access  Private (Any company user)
router.get(
  "/by-role/:role",
  param("role")
    .isIn([
      "admin",
      "manager",
      "supervisor",
      "cashier",
      "salesperson",
      "inventory",
      "accountant",
      "delivery",
      "security",
      "cleaner",
      "technician",
    ])
    .withMessage("Invalid role"),
  getStaffByRole
);

// ================================
// 📋 MAIN CRUD ROUTES (Critical order: POST before GET /:id)
// ================================

// ✅ POST ROUTE MUST COME BEFORE /:id ROUTES
// @route   POST /api/staff
// @desc    Create new staff member
// @access  Private (Any company user)
router.post("/", createStaffValidation, createStaff);

// @route   GET /api/staff
// @desc    Get all staff members with pagination and filters
// @access  Private (Any company user)
router.get(
  "/",
  paginationValidation,
  query("role")
    .optional()
    .isIn([
      "all",
      "admin",
      "manager",
      "supervisor",
      "cashier",
      "salesperson",
      "inventory",
      "accountant",
      "delivery",
      "security",
      "cleaner",
      "technician",
    ])
    .withMessage("Invalid role filter"),
  query("status")
    .optional()
    .isIn(["all", "active", "inactive", "terminated", "on-leave", "suspended"])
    .withMessage("Invalid status filter"),
  query("department")
    .optional()
    .isIn([
      "all",
      "Sales",
      "Marketing",
      "Finance",
      "Operations",
      "Human Resources",
      "IT",
      "Customer Service",
      "Inventory",
      "Security",
      "Administration",
    ])
    .withMessage("Invalid department filter"),
  query("sortBy")
    .optional()
    .isIn([
      "name",
      "role",
      "employeeId",
      "status",
      "createdAt",
      "employment.joinDate",
      "deletedAt", // ✅ NEW: Allow sorting by deletion date
    ])
    .withMessage("Invalid sort field"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Invalid sort order"),
  getAllStaff
);

// ✅ GENERIC /:id ROUTES COME AFTER POST
// @route   GET /api/staff/:id
// @desc    Get single staff member by ID
// @access  Private (Any company user)
router.get("/:id", mongoIdValidation, getStaffById);

// @route   PUT /api/staff/:id
// @desc    Update staff member
// @access  Private (Any company user)
router.put("/:id", updateStaffValidation, updateStaff);

// ✅ ENHANCED: DELETE route with soft/hard delete support
// @route   DELETE /api/staff/:id?permanent=true
// @desc    Delete staff member (soft delete by default, hard delete with permanent=true)
// @access  Private (Any company user)
router.delete("/:id", deleteStaffValidation, deleteStaff);

// ✅ NEW: RESTORE route for soft-deleted staff
// @route   PUT /api/staff/:id/restore
// @desc    Restore soft-deleted staff member
// @access  Private (Any company user)
router.put("/:id/restore", mongoIdValidation, restoreStaff);

// ================================
// 🔧 STATUS & TASK MANAGEMENT
// ================================

// @route   PUT /api/staff/:id/status
// @desc    Update staff status
// @access  Private (Any company user)
router.put("/:id/status", statusUpdateValidation, updateStaffStatus);

// @route   POST /api/staff/:id/assign-task
// @desc    Assign task to staff member
// @access  Private (Any company user)
router.post(
  "/:id/assign-task",
  param("id").isMongoId().withMessage("Invalid staff ID"),
  body("taskId").isMongoId().withMessage("Invalid task ID"),
  assignTask
);

// ================================
// 📄 DOCUMENT MANAGEMENT
// ================================

// @route   POST /api/staff/:id/documents
// @desc    Upload documents for staff member
// @access  Private (Any company user)
router.post(
  "/:id/documents",
  mongoIdValidation,
  body("documentTypes")
    .optional()
    .isArray()
    .withMessage("Document types must be an array"),
  uploadDocuments
);

// @route   PUT /api/staff/:staffId/documents/:docId/verify
// @desc    Verify uploaded document
// @access  Private (Any company user)
router.put(
  "/:staffId/documents/:docId/verify",
  param("staffId").isMongoId().withMessage("Invalid staff ID"),
  param("docId").notEmpty().withMessage("Document ID is required"),
  verifyDocument
);

// ================================
// 🔐 PASSWORD & PROFILE MANAGEMENT
// ================================

// @route   PUT /api/staff/:id/password
// @desc    Set password for staff member
// @access  Private (Any company user)
router.put("/:id/password", setPasswordValidation, setPassword);

// @route   PUT /api/staff/:id/profile
// @desc    Update staff profile
// @access  Private (Any company user)
router.put(
  "/:id/profile",
  param("id").isMongoId().withMessage("Invalid staff ID"),
  body("name").optional().trim().isLength({min: 2, max: 100}),
  body("email").optional().isEmail().normalizeEmail(),
  body("address").optional().isObject(),
  body("emergencyContact").optional().isObject(),
  body("notifications").optional().isObject(),
  async (req, res, next) => {
    try {
      const currentUser = req.user;
      const requestedStaffId = req.params.id;

      const staff = await require("../models/Staff").findOne({
        _id: requestedStaffId,
        companyId: req.companyId,
        isActive: true,
      });

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff member not found",
        });
      }

      // Allow only certain fields to be updated
      const allowedFields = [
        "name",
        "email",
        "address",
        "emergencyContact",
        "notifications",
      ];
      const updateData = {};

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      Object.keys(updateData).forEach((key) => {
        if (typeof updateData[key] === "object" && updateData[key] !== null) {
          staff[key] = {...staff[key], ...updateData[key]};
        } else {
          staff[key] = updateData[key];
        }
      });

      staff.updatedBy = currentUser._id || currentUser.id;
      await staff.save();

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: {
          name: staff.name,
          email: staff.email,
          address: staff.address,
          emergencyContact: staff.emergencyContact,
          notifications: staff.notifications,
        },
      });
    } catch (error) {
      console.error("Update staff profile error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating profile",
        error: error.message,
      });
    }
  }
);

// ================================
// 📊 PERFORMANCE & TASK TRACKING
// ================================

// @route   GET /api/staff/:id/tasks
// @desc    Get assigned tasks for staff member
// @access  Private (Any company user)
router.get("/:id/tasks", mongoIdValidation, async (req, res, next) => {
  try {
    const requestedStaffId = req.params.id;

    const staff = await require("../models/Staff")
      .findOne({
        _id: requestedStaffId,
        companyId: req.companyId,
        isActive: true,
      })
      .populate(
        "assignedTasks.taskId",
        "title description dueDate priority status"
      );

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Tasks retrieved successfully",
      data: staff.assignedTasks || [],
    });
  } catch (error) {
    console.error("Get staff tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching staff tasks",
      error: error.message,
    });
  }
});

// @route   GET /api/staff/:id/performance
// @desc    Get performance metrics for staff member
// @access  Private (Any company user)
router.get("/:id/performance", mongoIdValidation, async (req, res, next) => {
  try {
    const requestedStaffId = req.params.id;

    const staff = await require("../models/Staff")
      .findOne({
        _id: requestedStaffId,
        companyId: req.companyId,
        isActive: true,
      })
      .select("performance attendance name employeeId");

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Performance data retrieved successfully",
      data: {
        name: staff.name,
        employeeId: staff.employeeId,
        performance: staff.performance || {},
        attendance: staff.attendance || {},
        performancePercentage: staff.performancePercentage || 0,
        attendancePercentage: staff.attendancePercentage || 0,
      },
    });
  } catch (error) {
    console.error("Get staff performance error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching staff performance",
      error: error.message,
    });
  }
});

// ================================
// 🚨 ERROR HANDLING MIDDLEWARE
// ================================

// Error handling middleware for this router
router.use((error, req, res, next) => {
  console.error("Staff routes error:", error);

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
