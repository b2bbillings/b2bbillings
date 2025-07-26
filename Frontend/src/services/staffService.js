import axios from "axios";

const API_BASE_URL = window.REACT_APP_API_URL || "http://localhost:5000";

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/staff`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor to add auth token and company ID
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Get company ID from multiple sources
    let companyId = config.params?.companyId;

    if (!companyId) {
      // Try to get from localStorage - parse JSON if it's the currentCompany object
      const currentCompanyStr = localStorage.getItem("currentCompany");
      if (currentCompanyStr) {
        try {
          const currentCompany = JSON.parse(currentCompanyStr);
          companyId = currentCompany.id || currentCompany._id;
        } catch (e) {
          // If not JSON, treat as direct ID
          companyId = currentCompanyStr;
        }
      }

      // Fallback to other sources
      if (!companyId) {
        companyId =
          localStorage.getItem("companyId") ||
          localStorage.getItem("selectedCompany");
      }
    }

    // Add company ID to headers (as expected by backend)
    if (companyId) {
      config.headers["x-company-id"] = companyId;

      // Remove companyId from query params to avoid conflicts
      if (config.params?.companyId) {
        const {companyId: _, ...restParams} = config.params;
        config.params = restParams;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with better error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ================================
// 🛠️ DATA CLEANING FUNCTIONS
// ================================

/**
 * Clean and validate staff data before sending to server
 * @param {Object} staffData - Raw staff data from form
 * @returns {Object} Cleaned staff data
 */
const cleanStaffData = (staffData) => {
  // Safety check - Don't process response data
  if (staffData.success !== undefined || staffData.data !== undefined) {
    throw new Error("Cannot clean response data - invalid input");
  }

  const cleaned = {...staffData};

  // Handle post field (OPTIONAL) - remove if empty
  if (!cleaned.post || cleaned.post === "") {
    delete cleaned.post;
  }

  // Handle employeeId (auto-generated) - remove if empty
  if (!cleaned.employeeId || cleaned.employeeId === "") {
    delete cleaned.employeeId;
  }

  // Handle password (optional) - remove if empty
  if (!cleaned.password || cleaned.password === "") {
    delete cleaned.password;
  }

  // Handle salary and joinDate structure - they might be at root level
  if (cleaned.salary !== undefined) {
    if (!cleaned.employment) cleaned.employment = {};

    if (cleaned.salary === "" || cleaned.salary === null) {
      // Don't set salary if empty
    } else {
      const salary = parseFloat(cleaned.salary);
      if (!isNaN(salary) && salary >= 0) {
        cleaned.employment.salary = salary;
      }
    }
    delete cleaned.salary; // Remove from root level
  }

  if (cleaned.joinDate) {
    if (!cleaned.employment) cleaned.employment = {};
    cleaned.employment.joinDate = cleaned.joinDate;
    delete cleaned.joinDate; // Remove from root level
  }

  // Clean employment data - keep required fields
  if (cleaned.employment) {
    // Clean optional employment fields only
    if (
      !cleaned.employment.reportingTo ||
      cleaned.employment.reportingTo === ""
    ) {
      delete cleaned.employment.reportingTo;
    }

    if (
      !cleaned.employment.department ||
      cleaned.employment.department === ""
    ) {
      delete cleaned.employment.department;
    }

    if (!cleaned.employment.type || cleaned.employment.type === "") {
      delete cleaned.employment.type;
    }

    if (
      !cleaned.employment.employmentType ||
      cleaned.employment.employmentType === ""
    ) {
      delete cleaned.employment.employmentType;
    }
  }

  // Clean emergency contact (OPTIONAL) - remove if all fields empty
  if (cleaned.emergencyContact) {
    const hasValidFields = Object.values(cleaned.emergencyContact).some(
      (value) => value && value.toString().trim() !== ""
    );

    if (!hasValidFields) {
      delete cleaned.emergencyContact;
    } else {
      // Clean individual empty fields
      Object.keys(cleaned.emergencyContact).forEach((key) => {
        if (
          !cleaned.emergencyContact[key] ||
          cleaned.emergencyContact[key] === ""
        ) {
          delete cleaned.emergencyContact[key];
        }
      });
    }
  }

  // Only filter mobileNumbers array but keep it
  if (cleaned.mobileNumbers && Array.isArray(cleaned.mobileNumbers)) {
    cleaned.mobileNumbers = cleaned.mobileNumbers.filter(
      (num) =>
        num &&
        num.toString().trim() !== "" &&
        /^\d{10}$/.test(num.toString().trim())
    );
  }

  // Clean email only if empty (OPTIONAL)
  if (cleaned.email === "" || cleaned.email === null) {
    delete cleaned.email;
  }

  // Clean optional address fields
  if (cleaned.address) {
    // Remove only optional address fields if empty
    if (cleaned.address.taluka === "" || cleaned.address.taluka === null) {
      delete cleaned.address.taluka;
    }
  }

  // Clean optional fields
  if (
    !cleaned.bankDetails ||
    (typeof cleaned.bankDetails === "object" &&
      Object.keys(cleaned.bankDetails).length === 0)
  ) {
    delete cleaned.bankDetails;
  }

  if (
    cleaned.permissions &&
    Array.isArray(cleaned.permissions) &&
    cleaned.permissions.length === 0
  ) {
    delete cleaned.permissions;
  }

  if (cleaned.documents && Array.isArray(cleaned.documents)) {
    // Process documents properly - remove base64 data for large files
    cleaned.documents = cleaned.documents
      .filter((doc) => doc && (doc.name || doc.type))
      .map((doc) => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        uploadDate: doc.uploadDate || new Date().toISOString(),
        // Don't send large base64 data - handle separately
        // filePath will be set by backend after file processing
      }));

    if (cleaned.documents.length === 0) {
      delete cleaned.documents;
    }
  }

  return cleaned;
};

// ================================
// 📊 STAFF STATISTICS
// ================================

/**
 * Get staff statistics
 * @returns {Promise} API response with statistics
 */
export const getStaffStatistics = async () => {
  try {
    const response = await api.get("/statistics");
    return {
      success: true,
      data: response.data,
      message: "Staff statistics fetched successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
      data: null,
    };
  }
};

// ================================
// 📋 CRUD OPERATIONS
// ================================

/**
 * Get all staff members with optional filters
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 10)
 * @param {string} params.role - Filter by role
 * @param {string} params.status - Filter by status
 * @param {string} params.department - Filter by department
 * @param {string} params.search - Search term
 * @param {string} params.sortBy - Sort field
 * @param {string} params.sortOrder - Sort order (asc/desc)
 * @returns {Promise} API response with staff list
 */
export const getAllStaff = async (params = {}) => {
  try {
    // Remove companyId from params if present - let interceptor handle it
    const {companyId, ...queryParams} = params;
    const response = await api.get("/", {params: queryParams});

    return {
      success: true,
      data: response.data,
      message: "Staff data fetched successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
      data: {
        staff: [],
        total: 0,
        totalPages: 1,
        currentPage: 1,
      },
    };
  }
};

/**
 * Get single staff member by ID
 * @param {string} staffId - Staff member ID
 * @returns {Promise} API response with staff data
 */
export const getStaffById = async (staffId) => {
  try {
    const response = await api.get(`/${staffId}`);
    return {
      success: true,
      data: response.data,
      message: "Staff member fetched successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
      data: null,
    };
  }
};

/**
 * Create new staff member
 * @param {Object} staffData - Staff member data
 * @returns {Promise} API response with created staff
 */
export const createStaff = async (staffData) => {
  try {
    // Validate input data
    if (!staffData || typeof staffData !== "object") {
      throw new Error("Invalid staff data provided");
    }

    // Check for response data being passed as input
    if (
      staffData.success !== undefined ||
      staffData.data !== undefined ||
      staffData.message !== undefined
    ) {
      throw new Error(
        "Invalid data format - response data cannot be used as input"
      );
    }

    // Clean and validate data before sending
    const cleanedData = cleanStaffData(staffData);

    // Validate cleaned data
    const validation = validateStaffData(cleanedData);
    if (!validation.isValid) {
      return {
        success: false,
        message: "Validation failed",
        errors: validation.errors,
        data: null,
      };
    }

    // Make API request
    const response = await api.post("/", cleanedData);

    return {
      success: true,
      data: response.data,
      message: response.data?.message || "Staff member created successfully",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        getErrorMessage(error),
      errors: error.response?.data?.errors || [],
      data: null,
    };
  }
};

/**
 * Update staff member
 * @param {string} staffId - Staff member ID
 * @param {Object} updateData - Data to update
 * @returns {Promise} API response with updated staff
 */
export const updateStaff = async (staffId, updateData) => {
  try {
    // Clean data before updating
    const cleanedData = cleanStaffData(updateData);

    const response = await api.put(`/${staffId}`, cleanedData);
    return {
      success: true,
      data: response.data,
      message: "Staff member updated successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || getErrorMessage(error),
      errors: error.response?.data?.errors || [],
      data: null,
    };
  }
};

/**
 * Delete staff member (soft delete by default, hard delete if specified)
 * @param {string} staffId - Staff member ID
 * @param {boolean} hardDelete - Whether to permanently delete (default: false)
 * @param {string} reason - Reason for deletion (optional)
 * @returns {Promise} API response
 */
export const deleteStaff = async (staffId, hardDelete = false, reason = "") => {
  try {
    // Validate staff ID
    if (!staffId || typeof staffId !== "string") {
      throw new Error("Valid staff ID is required");
    }

    // Prepare request data
    const requestData = {};
    if (reason && reason.trim()) {
      requestData.reason = reason.trim();
    }

    // Choose endpoint and method based on delete type
    let response;
    if (hardDelete) {
      // Hard delete - use query parameter
      response = await api.delete(`/${staffId}?permanent=true`, {
        data: requestData,
      });
    } else {
      // Soft delete - regular delete
      response = await api.delete(`/${staffId}`, {
        data: requestData,
      });
    }

    return {
      success: true,
      data: response.data,
      message: hardDelete
        ? "Staff member permanently deleted successfully"
        : "Staff member deleted successfully",
    };
  } catch (error) {
    // Enhanced error handling for delete operations
    let errorMessage = "Failed to delete staff member";

    if (error.response?.status === 404) {
      errorMessage = "Staff member not found or already deleted";
    } else if (error.response?.status === 403) {
      errorMessage = "You don't have permission to delete this staff member";
    } else if (error.response?.status === 409) {
      errorMessage =
        "Cannot delete staff member - they have active assignments";
    } else if (error.response?.status === 400) {
      errorMessage = error.response.data?.message || "Invalid delete request";
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }

    return {
      success: false,
      message: errorMessage,
      data: null,
    };
  }
};

/**
 * Restore deleted staff member (for soft-deleted staff)
 * @param {string} staffId - Staff member ID
 * @returns {Promise} API response
 */
export const restoreStaff = async (staffId) => {
  try {
    if (!staffId || typeof staffId !== "string") {
      throw new Error("Valid staff ID is required");
    }

    const response = await api.put(`/${staffId}/restore`);

    return {
      success: true,
      data: response.data,
      message: "Staff member restored successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
      data: null,
    };
  }
};

/**
 * Get deleted staff members (soft-deleted only)
 * @param {Object} params - Query parameters
 * @returns {Promise} API response with deleted staff
 */
export const getDeletedStaff = async (params = {}) => {
  try {
    const {companyId, ...queryParams} = params;
    const response = await api.get("/deleted", {params: queryParams});

    return {
      success: true,
      data: response.data,
      message: "Deleted staff members fetched successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
      data: {staff: [], total: 0, totalPages: 1, currentPage: 1},
    };
  }
};

// ================================
// 🔍 SEARCH & FILTER
// ================================

/**
 * Search staff members
 * @param {string} searchTerm - Search term
 * @param {Object} options - Search options
 * @param {string} options.role - Filter by role
 * @param {string} options.status - Filter by status
 * @param {number} options.limit - Limit results
 * @returns {Promise} API response with search results
 */
export const searchStaff = async (searchTerm, options = {}) => {
  try {
    const params = {
      q: searchTerm,
      ...options,
    };
    const response = await api.get("/search", {params});
    return {
      success: true,
      data: response.data,
      message: "Search completed successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
      data: {staff: [], total: 0},
    };
  }
};

/**
 * Get staff by role
 * @param {string} role - Staff role
 * @param {string} status - Status filter (optional)
 * @returns {Promise} API response with staff by role
 */
export const getStaffByRole = async (role, status = "active") => {
  try {
    const response = await api.get(`/by-role/${role}`, {
      params: {status},
    });
    return {
      success: true,
      data: response.data,
      message: "Staff by role fetched successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
      data: {staff: [], total: 0},
    };
  }
};

// ================================
// 🔧 STATUS & TASK MANAGEMENT
// ================================

/**
 * Update staff status
 * @param {string} staffId - Staff member ID
 * @param {string} status - New status
 * @returns {Promise} API response
 */
export const updateStaffStatus = async (staffId, status) => {
  try {
    const response = await api.put(`/${staffId}/status`, {status});
    return {
      success: true,
      data: response.data,
      message: "Staff status updated successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
      data: null,
    };
  }
};

/**
 * Assign task to staff member
 * @param {string} staffId - Staff member ID
 * @param {string} taskId - Task ID
 * @returns {Promise} API response
 */
export const assignTask = async (staffId, taskId) => {
  try {
    const response = await api.post(`/${staffId}/assign-task`, {taskId});
    return {
      success: true,
      data: response.data,
      message: "Task assigned successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
      data: null,
    };
  }
};

/**
 * Get staff tasks
 * @param {string} staffId - Staff member ID
 * @returns {Promise} API response with tasks
 */
export const getStaffTasks = async (staffId) => {
  try {
    const response = await api.get(`/${staffId}/tasks`);
    return {
      success: true,
      data: response.data,
      message: "Staff tasks fetched successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
      data: {tasks: []},
    };
  }
};

/**
 * Get staff performance metrics
 * @param {string} staffId - Staff member ID
 * @returns {Promise} API response with performance data
 */
export const getStaffPerformance = async (staffId) => {
  try {
    const response = await api.get(`/${staffId}/performance`);
    return {
      success: true,
      data: response.data,
      message: "Staff performance fetched successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
      data: null,
    };
  }
};

// ================================
// 📄 DOCUMENT MANAGEMENT
// ================================

/**
 * Upload documents for staff member
 * @param {string} staffId - Staff member ID
 * @param {FormData} formData - Form data with files
 * @returns {Promise} API response
 */
export const uploadDocuments = async (staffId, formData) => {
  try {
    const response = await api.post(`/${staffId}/documents`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return {
      success: true,
      data: response.data,
      message: "Documents uploaded successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
      data: null,
    };
  }
};

/**
 * Verify staff document
 * @param {string} staffId - Staff member ID
 * @param {string} docId - Document ID
 * @returns {Promise} API response
 */
export const verifyDocument = async (staffId, docId) => {
  try {
    const response = await api.put(`/${staffId}/documents/${docId}/verify`);
    return {
      success: true,
      data: response.data,
      message: "Document verified successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
      data: null,
    };
  }
};

// ================================
// 🔐 PASSWORD & PROFILE MANAGEMENT
// ================================

/**
 * Set password for staff member
 * @param {string} staffId - Staff member ID
 * @param {string} password - New password
 * @param {string} confirmPassword - Password confirmation
 * @returns {Promise} API response
 */
export const setStaffPassword = async (staffId, password, confirmPassword) => {
  try {
    const response = await api.put(`/${staffId}/password`, {
      password,
      confirmPassword,
    });
    return {
      success: true,
      data: response.data,
      message: "Password set successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
      data: null,
    };
  }
};

/**
 * Update staff profile (self-service)
 * @param {string} staffId - Staff member ID
 * @param {Object} profileData - Profile data to update
 * @returns {Promise} API response
 */
export const updateStaffProfile = async (staffId, profileData) => {
  try {
    const response = await api.put(`/${staffId}/profile`, profileData);
    return {
      success: true,
      data: response.data,
      message: "Profile updated successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
      data: null,
    };
  }
};

// ================================
// 🛠️ UTILITY FUNCTIONS
// ================================

/**
 * Get standardized error message from error object
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
const getErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.response?.status) {
    switch (error.response.status) {
      case 400:
        return "Invalid request. Please check your input.";
      case 401:
        return "Authentication required. Please login again.";
      case 403:
        return "This feature is not available in demo mode.";
      case 404:
        return "Staff service not found. Please contact support.";
      case 429:
        return "Too many requests. Please try again later.";
      case 500:
        return "Server error. Please try again later.";
      case 503:
        return "Service temporarily unavailable. Please try again later.";
      default:
        return `Server responded with error ${error.response.status}`;
    }
  }

  if (error.message?.includes("timeout")) {
    return "Request timed out. Please check your connection and try again.";
  }

  if (error.message?.includes("Network Error") || !navigator.onLine) {
    return "Network connection issue. Please check your internet connection.";
  }

  return error.message || "An unexpected error occurred. Please try again.";
};

/**
 * Get available roles for staff creation
 * @returns {Array} List of available roles
 */
export const getAvailableRoles = () => {
  return [
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
};

/**
 * Get available posts for staff
 * @returns {Array} List of available posts
 */
export const getAvailablePosts = () => {
  return [
    "junior",
    "senior",
    "assistant",
    "executive",
    "officer",
    "head",
    "lead",
    "trainee",
  ];
};

/**
 * Get available departments
 * @returns {Array} List of available departments
 */
export const getAvailableDepartments = () => {
  return [
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
};

/**
 * Get available employment types
 * @returns {Array} List of employment types
 */
export const getEmploymentTypes = () => {
  return ["full-time", "part-time", "contract", "internship"];
};

/**
 * Get available status options
 * @returns {Array} List of status options
 */
export const getStatusOptions = () => {
  return ["active", "inactive", "terminated", "on-leave", "suspended"];
};

/**
 * Get available permissions
 * @returns {Array} List of available permissions
 */
export const getAvailablePermissions = () => {
  return [
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
};

/**
 * Format staff data for display
 * @param {Object} staff - Staff object
 * @returns {Object} Formatted staff data
 */
export const formatStaffData = (staff) => {
  return {
    ...staff,
    fullName: staff.name,
    displayRole: staff.role?.charAt(0).toUpperCase() + staff.role?.slice(1),
    displayStatus:
      staff.status?.charAt(0).toUpperCase() + staff.status?.slice(1),
    joinDate: staff.employment?.joinDate
      ? new Date(staff.employment.joinDate).toLocaleDateString()
      : "N/A",
    formattedSalary: staff.employment?.salary
      ? `₹${staff.employment.salary.toLocaleString("en-IN")}`
      : "N/A",
    primaryPhone: staff.mobileNumbers?.[0] || "N/A",
    totalTasks: staff.assignedTasks?.length || 0,
    completedTasks: staff.performance?.totalTasksCompleted || 0,
    taskCompletionRate: staff.performance?.totalTasksAssigned
      ? (
          ((staff.performance.totalTasksCompleted || 0) /
            staff.performance.totalTasksAssigned) *
          100
        ).toFixed(1) + "%"
      : "0%",
  };
};

/**
 * Enhanced staff data validation with detailed error messages
 * @param {Object} staffData - Staff data to validate
 * @returns {Object} Validation result with errors array
 */
export const validateStaffData = (staffData) => {
  const errors = [];

  // Required fields validation
  if (!staffData.name?.trim()) {
    errors.push("Name is required");
  }

  if (!staffData.role) {
    errors.push("Role is required");
  }

  // Mobile number validation
  if (!staffData.mobileNumbers?.length) {
    errors.push("At least one mobile number is required");
  } else {
    const validMobileNumbers = staffData.mobileNumbers.filter(
      (num) => num && num.trim() !== "" && /^\d{10}$/.test(num.trim())
    );
    if (validMobileNumbers.length === 0) {
      errors.push("At least one valid 10-digit mobile number is required");
    }
  }

  // Address validation - only require if provided
  if (staffData.address) {
    if (staffData.address.street && !staffData.address.street.trim()) {
      errors.push("Street address cannot be empty if provided");
    }
    if (staffData.address.city && !staffData.address.city.trim()) {
      errors.push("City cannot be empty if provided");
    }
    if (staffData.address.state && !staffData.address.state.trim()) {
      errors.push("State cannot be empty if provided");
    }
    if (
      staffData.address.pincode &&
      !/^\d{6}$/.test(staffData.address.pincode)
    ) {
      errors.push("Pincode must be 6 digits if provided");
    }
  }

  // Employment validation
  if (staffData.employment) {
    if (!staffData.employment.joinDate) {
      errors.push("Join date is required");
    }

    // Salary validation - only if provided
    if (
      staffData.employment.salary !== undefined &&
      staffData.employment.salary !== ""
    ) {
      const salary = parseFloat(staffData.employment.salary);
      if (isNaN(salary)) {
        errors.push("Salary must be a valid number");
      } else if (salary < 0) {
        errors.push("Salary cannot be negative");
      }
    }
  } else {
    errors.push("Employment information is required");
  }

  // Email validation - only if provided
  if (
    staffData.email &&
    staffData.email.trim() !== "" &&
    !/\S+@\S+\.\S+/.test(staffData.email)
  ) {
    errors.push("Invalid email format");
  }

  // Emergency contact validation - only if provided
  if (staffData.emergencyContact) {
    if (
      staffData.emergencyContact.phone &&
      !/^\d{10}$/.test(staffData.emergencyContact.phone)
    ) {
      errors.push("Emergency contact number must be 10 digits if provided");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ================================
// 📊 BULK OPERATIONS
// ================================

/**
 * Bulk update staff status
 * @param {Array} staffIds - Array of staff IDs
 * @param {string} status - New status
 * @returns {Promise} Results of all update operations
 */
export const bulkUpdateStaffStatus = async (staffIds, status) => {
  try {
    const promises = staffIds.map((id) => updateStaffStatus(id, status));
    const results = await Promise.allSettled(promises);

    return {
      success: results.filter((r) => r.status === "fulfilled").length,
      failed: results.filter((r) => r.status === "rejected").length,
      total: staffIds.length,
      results,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Bulk delete staff members
 * @param {Array} staffIds - Array of staff IDs
 * @param {boolean} hardDelete - Whether to permanently delete (default: false)
 * @param {string} reason - Reason for deletion (optional)
 * @returns {Promise} Results of all delete operations
 */
export const bulkDeleteStaff = async (
  staffIds,
  hardDelete = false,
  reason = ""
) => {
  try {
    const promises = staffIds.map((id) => deleteStaff(id, hardDelete, reason));
    const results = await Promise.allSettled(promises);

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    );
    const failed = results.filter(
      (r) => r.status === "rejected" || !r.value.success
    );

    return {
      success: successful.length,
      failed: failed.length,
      total: staffIds.length,
      results,
      message: `${successful.length} staff members ${
        hardDelete ? "permanently " : ""
      }deleted successfully${
        failed.length > 0 ? `, ${failed.length} failed` : ""
      }`,
    };
  } catch (error) {
    throw error;
  }
};

// Export all functions as default
const staffService = {
  // Statistics
  getStaffStatistics,

  // CRUD operations
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,

  // Enhanced delete operations
  restoreStaff,
  getDeletedStaff,

  // Search & Filter
  searchStaff,
  getStaffByRole,

  // Status & Task Management
  updateStaffStatus,
  assignTask,
  getStaffTasks,
  getStaffPerformance,

  // Document Management
  uploadDocuments,
  verifyDocument,

  // Password & Profile
  setStaffPassword,
  updateStaffProfile,

  // Utility functions
  getAvailableRoles,
  getAvailablePosts,
  getAvailableDepartments,
  getEmploymentTypes,
  getStatusOptions,
  getAvailablePermissions,
  formatStaffData,
  validateStaffData,

  // Bulk operations
  bulkUpdateStaffStatus,
  bulkDeleteStaff,
};

export default staffService;
