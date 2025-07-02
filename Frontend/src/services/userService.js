import axios from "axios";

// Base URL for API - Fixed for React environment
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000/api"
    : "http://localhost:5000/api"; // Change this to your production API URL

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_BASE_URL}/users`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include auth token (if needed later)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error);

    // Handle specific error cases
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("token");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// USER CRUD OPERATIONS
// ============================================================================

/**
 * Get all users with pagination and filtering
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 10)
 * @param {string} params.search - Search term
 * @param {string} params.role - Filter by role
 * @param {boolean} params.isActive - Filter by active status
 * @param {boolean} params.emailVerified - Filter by email verification
 * @param {string} params.sortBy - Sort field (default: 'createdAt')
 * @param {string} params.sortOrder - Sort order ('asc' or 'desc')
 */
const getAllUsers = async (params = {}) => {
  try {
    const response = await api.get("/", {params});
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Get single user by ID
 * @param {string} userId - User ID
 */
const getUserById = async (userId) => {
  try {
    const response = await api.get(`/${userId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Create new user
 * @param {Object} userData - User data
 * @param {string} userData.name - User name
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password
 * @param {string} userData.phone - User phone
 * @param {string} userData.role - User role (default: 'user')
 * @param {boolean} userData.isActive - Active status (default: true)
 * @param {boolean} userData.emailVerified - Email verification status
 */
const createUser = async (userData) => {
  try {
    const response = await api.post("/", userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Update user
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 */
const updateUser = async (userId, updateData) => {
  try {
    const response = await api.put(`/${userId}`, updateData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Delete user (soft delete by default)
 * @param {string} userId - User ID
 * @param {boolean} permanent - Whether to permanently delete (default: false)
 */
const deleteUser = async (userId, permanent = false) => {
  try {
    const response = await api.delete(`/${userId}`, {
      params: {permanent},
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk delete users
 * @param {string[]} userIds - Array of user IDs
 * @param {boolean} permanent - Whether to permanently delete (default: false)
 */
const bulkDeleteUsers = async (userIds, permanent = false) => {
  try {
    const response = await api.post("/bulk-delete", {
      userIds,
      permanent,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============================================================================
// USER MANAGEMENT ACTIONS
// ============================================================================

/**
 * Toggle user active status
 * @param {string} userId - User ID
 */
const toggleUserStatus = async (userId) => {
  try {
    const response = await api.patch(`/${userId}/toggle-status`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Change user password (Admin function)
 * @param {string} userId - User ID
 * @param {string} newPassword - New password
 */
const changeUserPassword = async (userId, newPassword) => {
  try {
    const response = await api.patch(`/${userId}/change-password`, {
      newPassword,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Reset user login attempts
 * @param {string} userId - User ID
 */
const resetLoginAttempts = async (userId) => {
  try {
    const response = await api.patch(`/${userId}/reset-login-attempts`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============================================================================
// STATISTICS AND ANALYTICS
// ============================================================================

/**
 * Get user statistics
 */
const getUserStats = async () => {
  try {
    const response = await api.get("/stats");
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============================================================================
// Admin
// ============================================================================

/**
 * Get detailed user information for admin dashboard
 * @param {string} userId - User ID
 */
const getUserDetailsForAdmin = async (userId) => {
  try {
    const response = await api.get(`/${userId}/details`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============================================================================
// STATISTICS AND ANALYTICS
// ============================================================================

// ============================================================================
// SEARCH AND EXPORT
// ============================================================================

/**
 * Advanced search users
 * @param {Object} searchParams - Search parameters
 * @param {string} searchParams.query - Search query
 * @param {string} searchParams.role - Filter by role
 * @param {boolean} searchParams.isActive - Filter by active status
 * @param {boolean} searchParams.emailVerified - Filter by email verification
 * @param {string} searchParams.dateFrom - Start date
 * @param {string} searchParams.dateTo - End date
 * @param {number} searchParams.limit - Limit results (default: 20)
 */
const searchUsers = async (searchParams = {}) => {
  try {
    const response = await api.get("/search", {params: searchParams});
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Export users data
 * @param {string} format - Export format ('json' or 'csv')
 */
const exportUsers = async (format = "json") => {
  try {
    const response = await api.get("/export", {
      params: {format},
      responseType: format === "csv" ? "blob" : "json",
    });

    if (format === "csv") {
      // Handle CSV download
      const blob = new Blob([response.data], {type: "text/csv"});
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "users-export.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return {success: true, message: "CSV file downloaded successfully"};
    }

    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate user data before sending to server
 * @param {Object} userData - User data to validate
 * @param {boolean} isCreate - Whether this is for creating a new user
 */
const validateUserData = (userData, isCreate = false) => {
  const errors = {};

  // Name validation
  if (!userData.name || userData.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters long";
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!userData.email || !emailRegex.test(userData.email)) {
    errors.email = "Please enter a valid email address";
  }

  // Phone validation (basic)
  if (userData.phone && userData.phone.length < 10) {
    errors.phone = "Phone number must be at least 10 digits";
  }

  // Password validation - required for create, optional for update
  if (isCreate && (!userData.password || userData.password.length < 6)) {
    errors.password = "Password must be at least 6 characters long";
  } else if (userData.password && userData.password.length < 6) {
    errors.password = "Password must be at least 6 characters long";
  }

  // Role validation
  const validRoles = ["user", "admin", "superadmin", "manager"];
  if (userData.role && !validRoles.includes(userData.role)) {
    errors.role = "Invalid role selected";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Format user data for display
 * @param {Object} user - User object
 */
const formatUserForDisplay = (user) => {
  return {
    ...user,
    formattedCreatedAt: new Date(user.createdAt).toLocaleDateString(),
    formattedLastLogin: user.lastLogin
      ? new Date(user.lastLogin).toLocaleDateString()
      : "Never",
    statusText: user.isActive ? "Active" : "Inactive",
    emailStatusText: user.emailVerified ? "Verified" : "Unverified",
    roleText: user.role.charAt(0).toUpperCase() + user.role.slice(1),
  };
};

/**
 * Build query parameters for user listing
 * @param {Object} filters - Filter object
 */
const buildUserQuery = (filters) => {
  const query = {};

  Object.keys(filters).forEach((key) => {
    if (
      filters[key] !== null &&
      filters[key] !== undefined &&
      filters[key] !== ""
    ) {
      query[key] = filters[key];
    }
  });

  return query;
};

/**
 * Handle API errors and return user-friendly messages
 * @param {Error} error - Error object
 */
const handleUserServiceError = (error) => {
  // Handle different error structures
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.message) {
    return error.message;
  }

  if (error.error) {
    return error.error;
  }

  // Default error messages based on status
  const status = error.response?.status || error.status;

  switch (status) {
    case 400:
      return "Invalid request. Please check your input.";
    case 401:
      return "You are not authorized to perform this action.";
    case 403:
      return "You do not have permission to access this resource.";
    case 404:
      return "User not found.";
    case 409:
      return "User with this email or phone already exists.";
    case 422:
      return "Validation failed. Please check your input.";
    case 500:
      return "Server error. Please try again later.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
};

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

const userService = {
  // CRUD Operations
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,

  // Bulk Operations
  bulkDeleteUsers,

  // User Management
  toggleUserStatus,
  changeUserPassword,
  resetLoginAttempts,

  // Statistics
  getUserStats,

  // Search & Export
  searchUsers,
  exportUsers,

  // Utilities
  validateUserData,
  formatUserForDisplay,
  buildUserQuery,
  handleUserServiceError,
};

export default userService;

// Named exports for individual functions
export {
  // CRUD
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,

  // Bulk Operations
  bulkDeleteUsers,

  // User Management
  toggleUserStatus,
  changeUserPassword,
  resetLoginAttempts,

  // Statistics
  getUserStats,

  // Search & Export
  searchUsers,
  exportUsers,

  // Admin
  getUserDetailsForAdmin,

  // Utilities
  validateUserData,
  formatUserForDisplay,
  buildUserQuery,
  handleUserServiceError,
};
