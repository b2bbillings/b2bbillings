const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  changeUserPassword,
  resetLoginAttempts,
  getUserStats,
  exportUsers,
  searchUsers,
  getUserDetailsForAdmin,
} = require("../controllers/userController");

// ============================================================================
// PUBLIC ROUTES (No authentication required for now)
// ============================================================================

// GET /api/users/search - Advanced search with filters
router.get("/search", searchUsers);

// GET /api/users/export - Export users data
router.get("/export", exportUsers);

// GET /api/users/stats - Get user statistics
router.get("/stats", getUserStats);

// ============================================================================
// CRUD ROUTES (No protection for now)
// ============================================================================

// GET /api/users - Get all users with pagination and filtering
router.get("/", getAllUsers);

// POST /api/users - Create new user
router.post("/", createUser);

// GET /api/users/:id - Get single user by ID
router.get("/:id", getUserById);

// PUT /api/users/:id - Update user
router.put("/:id", updateUser);

// DELETE /api/users/:id - Delete user (soft delete by default, permanent with query param)
router.delete("/:id", deleteUser);

// ============================================================================
// BULK OPERATIONS (No protection for now)
// ============================================================================

// ============================================================================
// USER MANAGEMENT ACTIONS (No protection for now)
// ============================================================================

// PATCH /api/users/:id/toggle-status - Activate/Deactivate user
router.patch("/:id/toggle-status", toggleUserStatus);

// PATCH /api/users/:id/change-password - Change user password
router.patch("/:id/change-password", changeUserPassword);

// PATCH /api/users/:id/reset-login-attempts - Reset user login attempts
router.patch("/:id/reset-login-attempts", resetLoginAttempts);

// GET /api/users/:id/details - Get detailed user info for admin
router.get("/:id/details", getUserDetailsForAdmin);

module.exports = router;
