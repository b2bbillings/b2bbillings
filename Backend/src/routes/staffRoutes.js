const express = require("express");
const {body, param, query, validationResult} = require("express-validator");
const {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  restoreStaff,
  getDeletedStaff,
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

// Valid role options (updated to match controller exactly)
const VALID_ROLES = [
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
];

const VALID_POSTS = [
  "junior",
  "senior",
  "assistant",
  "executive",
  "officer",
  "head",
  "lead",
  "trainee",
];

const VALID_DEPARTMENTS = [
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
];

const VALID_EMPLOYMENT_TYPES = [
  "full-time",
  "part-time",
  "contract",
  "internship",
];

const VALID_STATUSES = [
  "active",
  "inactive",
  "terminated",
  "on-leave",
  "suspended",
];

const VALID_PERMISSIONS = [
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

// Create staff validation
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
    .isIn(VALID_ROLES)
    .withMessage("Invalid role selected"),

  body("post")
    .optional()
    .isIn(VALID_POSTS)
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

  body("address.street")
    .trim()
    .notEmpty()
    .withMessage("Street address is required"),

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
    .isIn(VALID_DEPARTMENTS)
    .withMessage("Invalid department selected"),

  body("employment.employmentType")
    .optional()
    .isIn(VALID_EMPLOYMENT_TYPES)
    .withMessage("Invalid employment type"),

  body("permissions")
    .optional()
    .isArray()
    .withMessage("Permissions must be an array")
    .custom((permissions) => {
      if (!permissions.every((perm) => VALID_PERMISSIONS.includes(perm))) {
        throw new Error("Invalid permission detected");
      }
      return true;
    }),

  body("emergencyContact.phone")
    .optional()
    .matches(/^\d{10}$/)
    .withMessage("Emergency contact number must be 10 digits"),

  handleValidationErrors,
];

// Update staff validation
const updateStaffValidation = [
  param("id").isMongoId().withMessage("Invalid staff ID"),

  body("name")
    .optional()
    .trim()
    .isLength({min: 2, max: 100})
    .withMessage("Name must be between 2 and 100 characters"),

  body("role")
    .optional()
    .isIn(VALID_ROLES)
    .withMessage("Invalid role selected"),

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

  body("employment.department")
    .optional()
    .isIn(VALID_DEPARTMENTS)
    .withMessage("Invalid department selected"),

  body("employment.employmentType")
    .optional()
    .isIn(VALID_EMPLOYMENT_TYPES)
    .withMessage("Invalid employment type"),

  handleValidationErrors,
];

// Delete staff validation
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
  handleValidationErrors,
];

// Password validation
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

  handleValidationErrors,
];

// Search validation
const searchValidation = [
  query("q")
    .trim()
    .isLength({min: 2})
    .withMessage("Search term must be at least 2 characters"),

  query("limit")
    .optional()
    .isInt({min: 1, max: 100})
    .withMessage("Limit must be between 1 and 100"),

  handleValidationErrors,
];

// Pagination validation
const paginationValidation = [
  query("page")
    .optional()
    .isInt({min: 1})
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({min: 1, max: 100})
    .withMessage("Limit must be between 1 and 100"),

  handleValidationErrors,
];

// MongoDB ID validation
const mongoIdValidation = [
  param("id").isMongoId().withMessage("Invalid staff ID"),
  handleValidationErrors,
];

// Status update validation
const statusUpdateValidation = [
  param("id").isMongoId().withMessage("Invalid staff ID"),

  body("status").isIn(VALID_STATUSES).withMessage("Invalid status value"),

  handleValidationErrors,
];

// Task assignment validation
const assignTaskValidation = [
  param("id").isMongoId().withMessage("Invalid staff ID"),
  body("taskId").isMongoId().withMessage("Invalid task ID"),
  handleValidationErrors,
];

// ================================
// 📊 SPECIFIC ROUTES (Must come first)
// ================================

// Staff statistics
router.get("/statistics", getStaffStatistics);

// Deleted staff management
router.get("/deleted", paginationValidation, getDeletedStaff);

// Search functionality
router.get("/search", searchValidation, searchStaff);

// Get staff by role
router.get(
  "/by-role/:role",
  param("role").isIn(VALID_ROLES).withMessage("Invalid role"),
  handleValidationErrors,
  getStaffByRole
);

// ================================
// 📋 MAIN CRUD ROUTES
// ================================

// Create staff (POST must come before /:id routes)
router.post("/", createStaffValidation, createStaff);

// Get all staff with filters
router.get(
  "/",
  paginationValidation,
  query("role")
    .optional()
    .isIn(["all", ...VALID_ROLES])
    .withMessage("Invalid role filter"),
  query("status")
    .optional()
    .isIn(["all", ...VALID_STATUSES])
    .withMessage("Invalid status filter"),
  query("department")
    .optional()
    .isIn(["all", ...VALID_DEPARTMENTS])
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
      "deletedAt",
    ])
    .withMessage("Invalid sort field"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Invalid sort order"),
  getAllStaff
);

// Individual staff operations
router.get("/:id", mongoIdValidation, getStaffById);
router.put("/:id", updateStaffValidation, updateStaff);
router.delete("/:id", deleteStaffValidation, deleteStaff);

// Restore deleted staff
router.put("/:id/restore", mongoIdValidation, restoreStaff);

// ================================
// 🔧 STATUS & TASK MANAGEMENT
// ================================

// Update staff status
router.put("/:id/status", statusUpdateValidation, updateStaffStatus);

// Assign task to staff
router.post("/:id/assign-task", assignTaskValidation, assignTask);

// ================================
// 📄 DOCUMENT MANAGEMENT
// ================================

// Upload documents
router.post("/:id/documents", mongoIdValidation, uploadDocuments);

// Verify document
router.put(
  "/:staffId/documents/:docId/verify",
  param("staffId").isMongoId().withMessage("Invalid staff ID"),
  param("docId").notEmpty().withMessage("Document ID is required"),
  handleValidationErrors,
  verifyDocument
);

// ================================
// 🔐 PASSWORD & PROFILE MANAGEMENT
// ================================

// Set password
router.put("/:id/password", setPasswordValidation, setPassword);

// Update profile (cleaned up version)
router.put(
  "/:id/profile",
  param("id").isMongoId().withMessage("Invalid staff ID"),
  body("name")
    .optional()
    .trim()
    .isLength({min: 2, max: 100})
    .withMessage("Name must be between 2 and 100 characters"),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
  body("address")
    .optional()
    .isObject()
    .withMessage("Address must be an object"),
  body("emergencyContact")
    .optional()
    .isObject()
    .withMessage("Emergency contact must be an object"),
  body("notifications")
    .optional()
    .isObject()
    .withMessage("Notifications must be an object"),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const currentUser = req.user;
      const companyId = req.companyId;

      const staff = await require("../models/Staff").findOne({
        _id: req.params.id,
        companyId,
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
      res.status(500).json({
        success: false,
        message: "Error updating profile",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// ================================
// 📊 PERFORMANCE & TASK TRACKING
// ================================

// Get staff tasks
router.get("/:id/tasks", mongoIdValidation, async (req, res, next) => {
  try {
    const staff = await require("../models/Staff")
      .findOne({
        _id: req.params.id,
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
    res.status(500).json({
      success: false,
      message: "Error fetching staff tasks",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get staff performance
router.get("/:id/performance", mongoIdValidation, async (req, res, next) => {
  try {
    const staff = await require("../models/Staff")
      .findOne({
        _id: req.params.id,
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
    res.status(500).json({
      success: false,
      message: "Error fetching staff performance",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ================================
// 🚨 ERROR HANDLING MIDDLEWARE
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
