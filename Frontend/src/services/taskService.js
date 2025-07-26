import axios from "axios";

// Use consistent API base URL pattern like other services
const API_BASE_URL = window.REACT_APP_API_URL || "http://localhost:5000";

// Create axios instance with default config (following staffService pattern)
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor to add auth token and company ID (like staffService)
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

      if (!companyId) {
        companyId =
          localStorage.getItem("companyId") ||
          localStorage.getItem("selectedCompany");
      }
    }

    // Add company ID to headers
    if (companyId) {
      config.headers["x-company-id"] = companyId;
      // Remove companyId from params to avoid duplication
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Enhanced error handling
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.warn("🔐 Unauthorized access - token may be expired");
      // You can add logout logic here if needed
    } else if (error.response?.status >= 500) {
      console.error("🚨 Server error:", error.response.status);
    }

    return Promise.reject(error);
  }
);

// Base URL for task endpoints
const TASK_BASE_URL = "/tasks";

/**
 * Task Service - Handles all task-related API calls
 */
class TaskService {
  // ========================================
  // TASK CRUD OPERATIONS
  // ========================================

  /**
   * Create a new task
   * @param {Object} taskData - Task creation data
   * @returns {Promise<Object>} Created task data
   */
  async createTask(taskData) {
    try {
      console.log("🚀 Creating new task:", taskData);

      const response = await api.post(TASK_BASE_URL, taskData);

      console.log("✅ Task created successfully:", response.data);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || "Task created successfully",
      };
    } catch (error) {
      console.error("❌ Error creating task:", error);
      this.handleError(error, "Failed to create task");
      throw error;
    }
  }

  /**
   * Get all tasks with filters and pagination
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Tasks list with pagination
   */
  async getAllTasks(params = {}) {
    try {
      console.log("📋 Fetching tasks with params:", params);

      const response = await api.get(TASK_BASE_URL, {params});

      console.log("✅ Tasks fetched successfully:", response.data.pagination);
      return {
        success: true,
        data: response.data.data || response.data.tasks || [],
        pagination: response.data.pagination || {},
        count: response.data.count || response.data.data?.length || 0,
        message: response.data.message || "Tasks fetched successfully",
      };
    } catch (error) {
      console.error("❌ Error fetching tasks:", error);
      this.handleError(error, "Failed to fetch tasks");
      throw error;
    }
  }

  /**
   * Get single task by ID
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Task data
   */
  async getTaskById(taskId) {
    try {
      console.log("🔍 Fetching task by ID:", taskId);

      const response = await api.get(`${TASK_BASE_URL}/${taskId}`);

      console.log(
        "✅ Task fetched successfully:",
        response.data.data?.taskId || taskId
      );
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || "Task fetched successfully",
      };
    } catch (error) {
      console.error("❌ Error fetching task:", error);
      this.handleError(error, "Failed to fetch task details");
      throw error;
    }
  }

  /**
   * Update task
   * @param {string} taskId - Task ID
   * @param {Object} updateData - Updated task data
   * @returns {Promise<Object>} Updated task data
   */
  async updateTask(taskId, updateData) {
    try {
      console.log("📝 Updating task:", taskId, updateData);

      const response = await api.put(`${TASK_BASE_URL}/${taskId}`, updateData);

      console.log("✅ Task updated successfully");
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || "Task updated successfully",
      };
    } catch (error) {
      console.error("❌ Error updating task:", error);
      this.handleError(error, "Failed to update task");
      throw error;
    }
  }

  /**
   * Delete task (soft delete by default)
   * @param {string} taskId - Task ID
   * @param {boolean} permanent - Whether to permanently delete
   * @param {string} reason - Deletion reason
   * @returns {Promise<Object>} Deletion result
   */
  async deleteTask(taskId, permanent = false, reason = "") {
    try {
      console.log("🗑️ Deleting task:", taskId, {permanent, reason});

      const params = permanent ? {permanent: "true"} : {};
      const body = reason ? {reason} : {};

      const response = await api.delete(`${TASK_BASE_URL}/${taskId}`, {
        params,
        data: body,
      });

      console.log("✅ Task deleted successfully");
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || "Task deleted successfully",
      };
    } catch (error) {
      console.error("❌ Error deleting task:", error);
      this.handleError(error, "Failed to delete task");
      throw error;
    }
  }

  // ========================================
  // TASK STATUS & PROGRESS
  // ========================================

  /**
   * Update task status
   * @param {string} taskId - Task ID
   * @param {string} status - New status
   * @param {Object} resultData - Result data for completed tasks
   * @returns {Promise<Object>} Status update result
   */
  async updateTaskStatus(taskId, status, resultData = null) {
    try {
      console.log("🔄 Updating task status:", taskId, status);

      const body = {status};
      if (resultData) {
        body.resultData = resultData;
      }

      const response = await api.put(`${TASK_BASE_URL}/${taskId}/status`, body);

      console.log("✅ Task status updated successfully");
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || "Task status updated successfully",
      };
    } catch (error) {
      console.error("❌ Error updating task status:", error);
      this.handleError(error, "Failed to update task status");
      throw error;
    }
  }

  /**
   * Update task progress
   * @param {string} taskId - Task ID
   * @param {number} percentage - Progress percentage (0-100)
   * @returns {Promise<Object>} Progress update result
   */
  async updateTaskProgress(taskId, percentage) {
    try {
      console.log("📈 Updating task progress:", taskId, `${percentage}%`);

      const response = await api.put(`${TASK_BASE_URL}/${taskId}/progress`, {
        percentage,
      });

      console.log("✅ Task progress updated successfully");
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || "Task progress updated successfully",
      };
    } catch (error) {
      console.error("❌ Error updating task progress:", error);
      this.handleError(error, "Failed to update task progress");
      throw error;
    }
  }

  /**
   * Add note to task
   * @param {string} taskId - Task ID
   * @param {string} note - Note content
   * @returns {Promise<Object>} Added note data
   */
  async addTaskNote(taskId, note) {
    try {
      console.log("📝 Adding note to task:", taskId);

      const response = await api.post(`${TASK_BASE_URL}/${taskId}/notes`, {
        note: note.trim(),
      });

      console.log("✅ Note added successfully");
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || "Note added successfully",
      };
    } catch (error) {
      console.error("❌ Error adding note:", error);
      this.handleError(error, "Failed to add note to task");
      throw error;
    }
  }

  // ========================================
  // SPECIALIZED TASK QUERIES
  // ========================================

  /**
   * Get today's tasks
   * @param {string} assignedTo - Optional staff ID filter
   * @returns {Promise<Object>} Today's tasks
   */
  async getTodaysTasks(assignedTo = null) {
    try {
      console.log("📅 Fetching today's tasks");

      const params = assignedTo ? {assignedTo} : {};
      const response = await api.get(`${TASK_BASE_URL}/today`, {params});

      console.log("✅ Today's tasks fetched:", response.data.count);
      return {
        success: true,
        data: response.data.data || response.data.tasks || [],
        count: response.data.count || response.data.data?.length || 0,
        message: response.data.message || "Today's tasks fetched successfully",
      };
    } catch (error) {
      console.error("❌ Error fetching today's tasks:", error);
      this.handleError(error, "Failed to fetch today's tasks");
      throw error;
    }
  }

  /**
   * Get overdue tasks
   * @param {string} assignedTo - Optional staff ID filter
   * @returns {Promise<Object>} Overdue tasks
   */
  async getOverdueTasks(assignedTo = null) {
    try {
      console.log("⏰ Fetching overdue tasks");

      const params = assignedTo ? {assignedTo} : {};
      const response = await api.get(`${TASK_BASE_URL}/overdue`, {params});

      console.log("✅ Overdue tasks fetched:", response.data.count);
      return {
        success: true,
        data: response.data.data || response.data.tasks || [],
        count: response.data.count || response.data.data?.length || 0,
        message: response.data.message || "Overdue tasks fetched successfully",
      };
    } catch (error) {
      console.error("❌ Error fetching overdue tasks:", error);
      this.handleError(error, "Failed to fetch overdue tasks");
      throw error;
    }
  }

  /**
   * Get task reminders for today
   * @param {string} assignedTo - Optional staff ID filter
   * @returns {Promise<Object>} Task reminders
   */
  async getTaskReminders(assignedTo = null) {
    try {
      console.log("🔔 Fetching task reminders");

      const params = assignedTo ? {assignedTo} : {};
      const response = await api.get(`${TASK_BASE_URL}/reminders`, {params});

      console.log("✅ Task reminders fetched:", response.data.count);
      return {
        success: true,
        data: response.data.data || response.data.reminders || [],
        count: response.data.count || response.data.data?.length || 0,
        message: response.data.message || "Task reminders fetched successfully",
      };
    } catch (error) {
      console.error("❌ Error fetching task reminders:", error);
      this.handleError(error, "Failed to fetch task reminders");
      throw error;
    }
  }

  /**
   * Get task statistics
   * @param {Object} filters - Statistics filters
   * @returns {Promise<Object>} Task statistics
   */
  async getTaskStatistics(filters = {}) {
    try {
      console.log("📊 Fetching task statistics");

      const response = await api.get(`${TASK_BASE_URL}/statistics`, {
        params: filters,
      });

      console.log("✅ Task statistics fetched successfully");
      return {
        success: true,
        data: response.data.data || response.data,
        message:
          response.data.message || "Task statistics fetched successfully",
      };
    } catch (error) {
      console.error("❌ Error fetching task statistics:", error);
      this.handleError(error, "Failed to fetch task statistics");
      throw error;
    }
  }

  // ========================================
  // BULK OPERATIONS
  // ========================================

  /**
   * Bulk assign tasks
   * @param {Array} tasks - Array of task data objects
   * @returns {Promise<Object>} Bulk assignment result
   */
  async bulkAssignTasks(tasks) {
    try {
      console.log("📦 Bulk assigning tasks:", tasks.length);

      const response = await api.post(`${TASK_BASE_URL}/bulk-assign`, {
        tasks,
      });

      console.log("✅ Bulk assignment completed:", response.data.data);
      return {
        success: true,
        data: response.data.data || response.data,
        message:
          response.data.message || "Bulk assignment completed successfully",
      };
    } catch (error) {
      console.error("❌ Error bulk assigning tasks:", error);
      this.handleError(error, "Failed to bulk assign tasks");
      throw error;
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Get tasks by staff member
   * @param {string} staffId - Staff member ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} Staff tasks
   */
  async getTasksByStaff(staffId, filters = {}) {
    try {
      const params = {
        assignedTo: staffId,
        ...filters,
      };

      return await this.getAllTasks(params);
    } catch (error) {
      console.error("❌ Error fetching staff tasks:", error);
      throw error;
    }
  }

  /**
   * Get tasks by status
   * @param {string} status - Task status
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} Tasks with specific status
   */
  async getTasksByStatus(status, filters = {}) {
    try {
      const params = {
        status,
        ...filters,
      };

      return await this.getAllTasks(params);
    } catch (error) {
      console.error("❌ Error fetching tasks by status:", error);
      throw error;
    }
  }

  /**
   * Get tasks by priority
   * @param {string} priority - Task priority
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} Tasks with specific priority
   */
  async getTasksByPriority(priority, filters = {}) {
    try {
      const params = {
        priority,
        ...filters,
      };

      return await this.getAllTasks(params);
    } catch (error) {
      console.error("❌ Error fetching tasks by priority:", error);
      throw error;
    }
  }

  /**
   * Get tasks by type
   * @param {string} taskType - Task type
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} Tasks with specific type
   */
  async getTasksByType(taskType, filters = {}) {
    try {
      const params = {
        taskType,
        ...filters,
      };

      return await this.getAllTasks(params);
    } catch (error) {
      console.error("❌ Error fetching tasks by type:", error);
      throw error;
    }
  }

  /**
   * Search tasks
   * @param {string} searchTerm - Search term
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} Search results
   */
  async searchTasks(searchTerm, filters = {}) {
    try {
      const params = {
        search: searchTerm,
        ...filters,
      };

      return await this.getAllTasks(params);
    } catch (error) {
      console.error("❌ Error searching tasks:", error);
      throw error;
    }
  }

  /**
   * Get tasks in date range
   * @param {string} dateFrom - Start date (ISO string)
   * @param {string} dateTo - End date (ISO string)
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} Tasks in date range
   */
  async getTasksInDateRange(dateFrom, dateTo, filters = {}) {
    try {
      const params = {
        dateFrom,
        dateTo,
        ...filters,
      };

      return await this.getAllTasks(params);
    } catch (error) {
      console.error("❌ Error fetching tasks in date range:", error);
      throw error;
    }
  }

  // ========================================
  // TASK STATUS HELPERS
  // ========================================

  /**
   * Mark task as started
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Status update result
   */
  async startTask(taskId) {
    try {
      return await this.updateTaskStatus(taskId, "in-progress");
    } catch (error) {
      console.error("❌ Error starting task:", error);
      throw error;
    }
  }

  /**
   * Mark task as completed
   * @param {string} taskId - Task ID
   * @param {Object} resultData - Completion result data
   * @returns {Promise<Object>} Status update result
   */
  async completeTask(taskId, resultData = {}) {
    try {
      return await this.updateTaskStatus(taskId, "completed", resultData);
    } catch (error) {
      console.error("❌ Error completing task:", error);
      throw error;
    }
  }

  /**
   * Mark task as delayed
   * @param {string} taskId - Task ID
   * @param {string} reason - Delay reason
   * @returns {Promise<Object>} Status update result
   */
  async delayTask(taskId, reason = "") {
    try {
      const resultData = reason ? {resultNotes: reason} : {};
      return await this.updateTaskStatus(taskId, "delayed", resultData);
    } catch (error) {
      console.error("❌ Error marking task as delayed:", error);
      throw error;
    }
  }

  /**
   * Cancel task
   * @param {string} taskId - Task ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Status update result
   */
  async cancelTask(taskId, reason = "") {
    try {
      const resultData = reason ? {resultNotes: reason} : {};
      return await this.updateTaskStatus(taskId, "cancelled", resultData);
    } catch (error) {
      console.error("❌ Error cancelling task:", error);
      throw error;
    }
  }

  // ========================================
  // DASHBOARD HELPERS
  // ========================================

  /**
   * Get dashboard data for tasks
   * @param {string} assignedTo - Optional staff ID filter
   * @returns {Promise<Object>} Dashboard data
   */
  async getDashboardData(assignedTo = null) {
    try {
      console.log("📊 Fetching task dashboard data");

      const [statistics, todaysTasks, overdueTasks, reminders] =
        await Promise.all([
          this.getTaskStatistics({assignedTo}),
          this.getTodaysTasks(assignedTo),
          this.getOverdueTasks(assignedTo),
          this.getTaskReminders(assignedTo),
        ]);

      const dashboardData = {
        statistics: statistics.data,
        todaysTasks: todaysTasks.data,
        overdueTasks: overdueTasks.data,
        reminders: reminders.data,
        summary: {
          todaysTasksCount: todaysTasks.count,
          overdueTasksCount: overdueTasks.count,
          remindersCount: reminders.count,
        },
      };

      console.log("✅ Dashboard data fetched successfully");
      return {success: true, data: dashboardData};
    } catch (error) {
      console.error("❌ Error fetching dashboard data:", error);
      this.handleError(error, "Failed to fetch dashboard data");
      throw error;
    }
  }

  /**
   * Get quick stats for display
   * @param {string} assignedTo - Optional staff ID filter
   * @returns {Promise<Object>} Quick statistics
   */
  async getQuickStats(assignedTo = null) {
    try {
      const statistics = await this.getTaskStatistics({assignedTo});

      const quickStats = {
        totalTasks: statistics.data.overall?.totalTasks || 0,
        completedTasks: statistics.data.overall?.completedTasks || 0,
        pendingTasks: statistics.data.overall?.pendingTasks || 0,
        overdueTasks: statistics.data.overdueCount || 0,
        todaysTasks: statistics.data.todaysTasksCount || 0,
        completionRate: statistics.data.overall?.completionRate || 0,
      };

      return {success: true, data: quickStats};
    } catch (error) {
      console.error("❌ Error fetching quick stats:", error);
      throw error;
    }
  }

  // ========================================
  // ERROR HANDLING
  // ========================================

  /**
   * Handle API errors
   * @param {Error} error - Error object
   * @param {string} defaultMessage - Default error message
   */
  handleError(error, defaultMessage) {
    if (error.response) {
      // Server responded with error status
      const {status, data} = error.response;
      console.error(`❌ API Error ${status}:`, data.message || defaultMessage);

      if (data.errors) {
        console.error("❌ Validation errors:", data.errors);
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error("❌ Network Error:", defaultMessage);
    } else {
      // Something else happened
      console.error("❌ Error:", error.message || defaultMessage);
    }
  }

  // ========================================
  // VALIDATION HELPERS
  // ========================================

  /**
   * Validate task data before creation/update
   * @param {Object} taskData - Task data to validate
   * @returns {Object} Validation result
   */
  validateTaskData(taskData) {
    const errors = [];
    const requiredFields = [
      "assignedTo",
      "taskType",
      "customer",
      "description",
      "dueDate",
    ];

    // Check required fields
    requiredFields.forEach((field) => {
      if (!taskData[field]) {
        errors.push(`${field} is required`);
      }
    });

    // Validate due date
    if (taskData.dueDate) {
      const dueDate = new Date(taskData.dueDate);
      const now = new Date();

      if (dueDate < now) {
        errors.push("Due date cannot be in the past");
      }
    }

    // Validate priority
    if (
      taskData.priority &&
      !["low", "medium", "high", "urgent"].includes(taskData.priority)
    ) {
      errors.push("Invalid priority level");
    }

    // Validate description length
    if (
      taskData.description &&
      (taskData.description.length < 10 || taskData.description.length > 1000)
    ) {
      errors.push("Description must be between 10 and 1000 characters");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get available task types
   * @returns {Array} Available task types
   */
  getTaskTypes() {
    return [
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
    ];
  }

  /**
   * Get available task statuses
   * @returns {Array} Available task statuses
   */
  getTaskStatuses() {
    return ["pending", "in-progress", "completed", "delayed", "cancelled"];
  }

  /**
   * Get available task priorities
   * @returns {Array} Available task priorities
   */
  getTaskPriorities() {
    return ["low", "medium", "high", "urgent"];
  }

  // ========================================
  // FORMATTING HELPERS
  // ========================================

  /**
   * Format task for display
   * @param {Object} task - Task object
   * @returns {Object} Formatted task
   */
  formatTaskForDisplay(task) {
    return {
      ...task,
      formattedDueDate: new Date(task.dueDate).toLocaleDateString(),
      formattedCreatedDate: new Date(task.createdAt).toLocaleDateString(),
      isOverdue:
        new Date(task.dueDate) < new Date() && task.status !== "completed",
      priorityColor: this.getPriorityColor(task.priority),
      statusColor: this.getStatusColor(task.status),
    };
  }

  /**
   * Get priority color
   * @param {string} priority - Task priority
   * @returns {string} Color code
   */
  getPriorityColor(priority) {
    const colors = {
      low: "#22c55e", // green
      medium: "#f59e0b", // amber
      high: "#ef4444", // red
      urgent: "#dc2626", // dark red
    };
    return colors[priority] || colors.medium;
  }

  /**
   * Get status color
   * @param {string} status - Task status
   * @returns {string} Color code
   */
  getStatusColor(status) {
    const colors = {
      pending: "#6b7280", // gray
      "in-progress": "#3b82f6", // blue
      completed: "#22c55e", // green
      delayed: "#f59e0b", // amber
      cancelled: "#ef4444", // red
    };
    return colors[status] || colors.pending;
  }
}

// Create and export service instance
const taskService = new TaskService();
export default taskService;

// Named exports for convenience
export const {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  updateTaskStatus,
  updateTaskProgress,
  addTaskNote,
  getTodaysTasks,
  getOverdueTasks,
  getTaskReminders,
  getTaskStatistics,
  bulkAssignTasks,
  getTasksByStaff,
  searchTasks,
  startTask,
  completeTask,
  delayTask,
  cancelTask,
  getDashboardData,
  getQuickStats,
  validateTaskData,
  getTaskTypes,
  getTaskStatuses,
  getTaskPriorities,
  formatTaskForDisplay,
} = taskService;
