import React, {useState, useEffect, useCallback, useMemo} from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Badge,
  Alert,
  Spinner,
  Toast,
  ToastContainer,
  Dropdown,
  ProgressBar,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faTasks,
  faCalendarDay,
  faClock,
  faUser,
  faEdit,
  faTrash,
  faEye,
  faPlus,
  faFilter,
  faSort,
  faCheckDouble,
  faPlay,
  faPause,
  faStop,
  faExclamationTriangle,
  faListCheck,
  faSearch,
  faRefresh,
  faStickyNote,
  faChartLine,
  faDownload,
  faFileAlt,
  faBell,
} from "@fortawesome/free-solid-svg-icons";

// Import components and services
import TaskAssignment from "./TaskAssignment";
import taskService from "../../../services/taskService";
import staffService from "../../../services/staffService";

function DailyTaskAssignment({companyData, userData, addToast}) {
  // State management
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editTask, setEditTask] = useState(null);

  // Filter states with stable references
  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    assignedTo: "all",
    taskType: "all",
    search: "",
    dateRange: "today",
  });

  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
  });

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("success");

  // Error state
  const [error, setError] = useState(null);

  // ✅ Memoize company and user IDs to prevent unnecessary re-renders
  const companyId = useMemo(
    () => companyData?.id || companyData?._id,
    [companyData]
  );
  const userId = useMemo(() => userData?.id || userData?._id, [userData]);

  // ✅ Load initial data only once when component mounts
  useEffect(() => {
    let isMounted = true;
    let hasLoaded = false; // Add this flag to prevent multiple loads

    const loadData = async () => {
      if (isMounted && companyId && userId && !hasLoaded) {
        hasLoaded = true; // Set flag immediately
        try {
          setIsLoading(true);
          setError(null);
          console.log("🚀 Loading initial data...");
          await Promise.all([loadStaffMembers(), loadTasks()]);
          console.log("✅ Initial data loaded successfully");
        } catch (error) {
          hasLoaded = false; // Reset flag on error
          if (isMounted) {
            console.error("❌ Failed to load initial data:", error);
            setError("Failed to load initial data. Please try again.");
            showToastMessage("Error loading data", "error");
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [companyId, userId]); // Only depend on stable IDs

  // ✅ Load tasks when specific filter values change (with debounce) - FIXED
  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    const debouncedLoadTasks = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (isMounted && companyId && userId && !isLoading) {
          console.log("📋 Loading tasks due to filter change...");
          await loadTasks();
        }
      }, 300); // 300ms debounce
    };

    // Only load if we have initial data and filters have actually changed
    if (companyId && userId) {
      debouncedLoadTasks();
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [
    filters.status,
    filters.priority,
    filters.assignedTo,
    filters.taskType,
    filters.dateRange,
    pagination.currentPage,
    // ❌ REMOVED: companyId, userId - these cause the infinite loop
  ]);

  // ✅ Apply filters when tasks change (but not when filters change) - FIXED
  useEffect(() => {
    console.log("🔄 Applying filters to", tasks.length, "tasks");
    applyFilters();
  }, [tasks, filters.search]); // Only depend on tasks and search

  // ✅ Load staff members with proper error handling
  const loadStaffMembers = useCallback(async () => {
    try {
      console.log("👥 Loading staff members...");
      const response = await staffService.getAllStaff({
        page: 1,
        limit: 100,
        status: "active",
      });

      if (response && response.success) {
        // ✅ Fix: Access the nested data array properly
        const staffData = Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
          ? response.data
          : [];

        console.log("✅ Staff members loaded:", staffData.length);
        setStaffMembers(staffData);
      } else {
        setStaffMembers([]);
        showToastMessage("Could not load staff members", "warning");
      }
    } catch (error) {
      console.error("❌ Error loading staff members:", error);
      setStaffMembers([]);
      showToastMessage("Error loading staff members", "error");
    }
  }, []); // No dependencies - this function is stable

  // ✅ Load tasks with enhanced error handling and loading prevention
  const loadTasks = useCallback(async () => {
    // ✅ Prevent multiple simultaneous calls
    if (isLoading) {
      console.log("⏸️ Task loading already in progress, skipping...");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const params = {
        page: pagination.currentPage,
        limit: pagination.limit,
      };

      // Only add non-default filter values
      if (filters.status !== "all") params.status = filters.status;
      if (filters.priority !== "all") params.priority = filters.priority;
      if (filters.taskType !== "all") params.taskType = filters.taskType;
      // Don't include search in API params - handle client-side

      console.log("📋 Loading tasks with params:", params);

      let response;
      if (filters.dateRange === "today") {
        response = await taskService.getTodaysTasks(
          filters.assignedTo !== "all" ? filters.assignedTo : null
        );
      } else if (filters.dateRange === "overdue") {
        response = await taskService.getOverdueTasks(
          filters.assignedTo !== "all" ? filters.assignedTo : null
        );
      } else {
        response = await taskService.getAllTasks(params);
      }

      if (response && response.success) {
        const tasksData = Array.isArray(response.data) ? response.data : [];
        console.log("✅ Tasks loaded:", tasksData.length);
        setTasks(tasksData);

        if (response.pagination) {
          setPagination((prev) => ({
            ...prev,
            totalPages: response.pagination.totalPages || 1,
            totalCount: response.pagination.totalCount || tasksData.length,
          }));
        }
      } else {
        setTasks([]);
        if (response?.error) {
          showToastMessage(response.error, "warning");
        } else {
          showToastMessage("Could not load tasks", "warning");
        }
      }
    } catch (error) {
      console.error("❌ Error loading tasks:", error);
      setTasks([]);
      setError(
        "Failed to load tasks. Please check your connection and try again."
      );
      showToastMessage("Error loading tasks", "error");
    } finally {
      setIsLoading(false);
    }
  }, [
    pagination.currentPage,
    pagination.limit,
    filters.status,
    filters.priority,
    filters.assignedTo,
    filters.taskType,
    filters.dateRange,
  ]);

  // ✅ Apply client-side filters (memoized to prevent unnecessary recalculations)
  const applyFilters = useCallback(() => {
    if (!Array.isArray(tasks)) {
      setFilteredTasks([]);
      return;
    }

    let filtered = [...tasks];

    // Filter by status
    if (filters.status !== "all") {
      filtered = filtered.filter((task) => task.status === filters.status);
    }

    // Filter by priority
    if (filters.priority !== "all") {
      filtered = filtered.filter((task) => task.priority === filters.priority);
    }

    // Filter by assigned staff
    if (filters.assignedTo !== "all") {
      filtered = filtered.filter((task) => {
        const assignedId = task.assignedTo?._id || task.assignedTo;
        return assignedId === filters.assignedTo;
      });
    }

    // Filter by task type
    if (filters.taskType !== "all") {
      filtered = filtered.filter((task) => task.taskType === filters.taskType);
    }

    // Search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter((task) => {
        const customer =
          typeof task.customer === "string"
            ? task.customer
            : task.customer?.name || "";
        return (
          task.title?.toLowerCase().includes(searchTerm) ||
          customer.toLowerCase().includes(searchTerm) ||
          task.description?.toLowerCase().includes(searchTerm) ||
          task.taskType?.toLowerCase().includes(searchTerm) ||
          task.assignedTo?.name?.toLowerCase().includes(searchTerm)
        );
      });
    }

    console.log("🔄 Filtered tasks:", filtered.length, "from", tasks.length);
    setFilteredTasks(filtered);
  }, [tasks, filters]);

  // ✅ Show toast message (memoized)
  const showToastMessage = useCallback(
    (message, variant = "success") => {
      setToastMessage(message);
      setToastVariant(variant);
      setShowToast(true);

      // Also use the addToast prop if available
      if (addToast) {
        addToast(message, variant);
      }
    },
    [addToast]
  );

  // ✅ Handle filter changes (optimized to prevent unnecessary re-renders)
  const handleFilterChange = useCallback((filterName, value) => {
    console.log(`🔧 Filter changed: ${filterName} = ${value}`);

    setFilters((prev) => {
      // Only update if value actually changed
      if (prev[filterName] === value) {
        return prev;
      }

      return {...prev, [filterName]: value};
    });

    // Reset pagination when filters change (except for search)
    if (filterName !== "search") {
      setPagination((prev) => ({...prev, currentPage: 1}));
    }
  }, []);

  // ✅ Handle task actions (memoized)
  const handleTaskAction = useCallback(
    async (action, task) => {
      try {
        console.log(`🔧 Task action: ${action} for task:`, task._id);

        switch (action) {
          case "view":
            setSelectedTask(task);
            break;

          case "edit":
            setEditTask(task);
            setShowAssignModal(true);
            break;

          case "start":
            await taskService.startTask(task._id);
            showToastMessage("Task started successfully!");
            loadTasks();
            break;

          case "complete":
            await taskService.completeTask(task._id, {
              outcome: "successful",
              resultNotes: "Task completed successfully",
            });
            showToastMessage("Task completed successfully!");
            loadTasks();
            break;

          case "delete":
            if (window.confirm("Are you sure you want to delete this task?")) {
              await taskService.deleteTask(task._id, false, "Deleted by user");
              showToastMessage("Task deleted successfully!");
              loadTasks();
            }
            break;

          default:
            break;
        }
      } catch (error) {
        console.error(`❌ Error ${action} task:`, error);
        showToastMessage(`Error ${action} task`, "error");
      }
    },
    [showToastMessage, loadTasks]
  );

  // ✅ Handle task creation/update (memoized)
  const handleTaskCreated = useCallback(
    (task) => {
      if (editTask) {
        showToastMessage("Task updated successfully!");
        setEditTask(null);
      } else {
        showToastMessage("Task assigned successfully!");
      }
      loadTasks();
    },
    [editTask, showToastMessage, loadTasks]
  );

  // ✅ Handle modal close (memoized)
  const handleModalClose = useCallback(() => {
    setShowAssignModal(false);
    setEditTask(null);
  }, []);

  // ✅ Load initial data function (memoized)
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("🔄 Reloading initial data...");
      await Promise.all([loadStaffMembers(), loadTasks()]);
      console.log("✅ Initial data reloaded successfully");
    } catch (error) {
      console.error("❌ Failed to reload initial data:", error);
      setError("Failed to load initial data. Please try again.");
      showToastMessage("Error loading data", "error");
    } finally {
      setIsLoading(false);
    }
  }, [loadStaffMembers, loadTasks, showToastMessage]);

  // ✅ Utility functions (memoized)
  const getPriorityBadge = useCallback((priority) => {
    const colors = {
      low: "success",
      medium: "primary",
      high: "warning",
      urgent: "danger",
    };
    return (
      <Badge bg={colors[priority] || "secondary"} className="text-capitalize">
        {priority}
      </Badge>
    );
  }, []);

  const getStatusBadge = useCallback((status) => {
    const colors = {
      pending: "warning",
      "in-progress": "info",
      completed: "success",
      delayed: "danger",
      cancelled: "secondary",
    };
    return (
      <Badge bg={colors[status] || "secondary"} className="text-capitalize">
        {status?.replace("-", " ") || "Unknown"}
      </Badge>
    );
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "No date";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const isOverdue = useCallback((task) => {
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < new Date() && task.status !== "completed";
  }, []);

  const getCustomerName = useCallback((customer) => {
    if (typeof customer === "string") return customer;
    return customer?.name || "Unknown Customer";
  }, []);

  return (
    <div className="daily-task-assignment">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon">
            <FontAwesomeIcon icon={faTasks} />
          </div>
          <div className="header-text">
            <h2 className="page-title">Daily Task Assignment</h2>
            <p className="page-subtitle">
              Assign and manage daily tasks for your staff with automated
              reminders
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="content-container">
        {/* Error Alert */}
        {error && (
          <Alert
            variant="danger"
            className="error-alert"
            dismissible
            onClose={() => setError(null)}
          >
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            {error}
            <div className="mt-2">
              <Button
                variant="outline-danger"
                size="sm"
                onClick={loadInitialData}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={faRefresh} className="me-1" />
                Retry
              </Button>
            </div>
          </Alert>
        )}

        {/* Filters and Actions - UPDATED RESPONSIVE LAYOUT */}
        <div className="filters-section">
          <div className="filters-container">
            {/* Top Row - Status and Priority Filters */}
            <div className="filters-row filters-row-1">
              <div className="filter-group">
                <Form.Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="filter-select"
                  disabled={isLoading}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="delayed">Delayed</option>
                  <option value="cancelled">Cancelled</option>
                </Form.Select>
              </div>

              <div className="filter-group">
                <Form.Select
                  value={filters.priority}
                  onChange={(e) =>
                    handleFilterChange("priority", e.target.value)
                  }
                  className="filter-select"
                  disabled={isLoading}
                >
                  <option value="all">All Priority</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Form.Select>
              </div>

              <div className="filter-group">
                <Form.Select
                  value={filters.assignedTo}
                  onChange={(e) =>
                    handleFilterChange("assignedTo", e.target.value)
                  }
                  className="filter-select"
                  disabled={isLoading}
                >
                  <option value="all">All Staff</option>
                  {Array.isArray(staffMembers) && staffMembers.length > 0 ? (
                    staffMembers.map((member) => (
                      <option
                        key={member._id || member.id}
                        value={member._id || member.id}
                      >
                        {member.name || "Unknown"}
                      </option>
                    ))
                  ) : (
                    <option disabled>No staff available</option>
                  )}
                </Form.Select>
              </div>

              <div className="filter-group">
                <Form.Select
                  value={filters.dateRange}
                  onChange={(e) =>
                    handleFilterChange("dateRange", e.target.value)
                  }
                  className="filter-select"
                  disabled={isLoading}
                >
                  <option value="today">Today's Tasks</option>
                  <option value="overdue">Overdue Tasks</option>
                  <option value="all">All Tasks</option>
                </Form.Select>
              </div>
            </div>

            {/* Bottom Row - Search and Actions */}
            <div className="filters-row filters-row-2">
              <div className="search-group">
                <Form.Control
                  type="text"
                  placeholder="Search tasks..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="search-input"
                  disabled={isLoading}
                />
              </div>

              <div className="actions-group">
                <Button
                  variant="outline-primary"
                  onClick={loadTasks}
                  disabled={isLoading}
                  className="refresh-button"
                  title="Refresh tasks"
                >
                  <FontAwesomeIcon icon={faRefresh} />
                </Button>

                <Button
                  variant="primary"
                  onClick={() => {
                    setEditTask(null);
                    setShowAssignModal(true);
                  }}
                  className="assign-button"
                  disabled={isLoading}
                >
                  <FontAwesomeIcon icon={faPlus} className="me-2" />
                  Assign New Task
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <Card className="tasks-card">
          <Card.Header className="tasks-header">
            <div className="header-row">
              <div className="header-left">
                <FontAwesomeIcon icon={faListCheck} className="me-2" />
                <h5 className="header-title">
                  Task Assignments (
                  {Array.isArray(filteredTasks) ? filteredTasks.length : 0})
                </h5>
              </div>
              <div className="header-right">
                {isLoading && <Spinner size="sm" animation="border" />}
              </div>
            </div>
          </Card.Header>

          <Card.Body className="tasks-body">
            {isLoading ? (
              <div className="loading-state">
                <Spinner animation="border" variant="primary" />
                <p className="loading-text">Loading tasks...</p>
              </div>
            ) : Array.isArray(filteredTasks) && filteredTasks.length > 0 ? (
              <div className="tasks-list">
                {filteredTasks.map((task) => (
                  <div
                    key={task._id}
                    className={`task-item ${
                      isOverdue(task) ? "task-overdue" : ""
                    }`}
                  >
                    <div className="task-icon">
                      <FontAwesomeIcon icon={faTasks} />
                    </div>

                    <div className="task-content">
                      <div className="task-header">
                        <h6 className="task-title">
                          {task.title ||
                            `${task.taskType}: ${getCustomerName(
                              task.customer
                            )}`}
                        </h6>
                        <div className="task-badges">
                          {getPriorityBadge(task.priority)}
                          {getStatusBadge(task.status)}
                          {isOverdue(task) && (
                            <Badge bg="danger" className="overdue-badge">
                              <FontAwesomeIcon
                                icon={faExclamationTriangle}
                                className="me-1"
                              />
                              Overdue
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="task-description">{task.description}</p>

                      {/* Progress Bar */}
                      {task.progress?.percentage > 0 && (
                        <div className="task-progress">
                          <div className="progress-header">
                            <small className="progress-label">Progress</small>
                            <small className="progress-value">
                              {task.progress.percentage}%
                            </small>
                          </div>
                          <ProgressBar
                            now={task.progress.percentage}
                            size="sm"
                            variant={
                              task.progress.percentage === 100
                                ? "success"
                                : "info"
                            }
                          />
                        </div>
                      )}

                      <div className="task-meta">
                        <span className="meta-item">
                          <FontAwesomeIcon icon={faUser} />
                          {task.assignedTo?.name || "Unknown"}
                        </span>
                        <span className="meta-separator">•</span>
                        <span className="meta-item">
                          <FontAwesomeIcon icon={faCalendarDay} />
                          Due: {formatDate(task.dueDate)}
                        </span>
                        <span className="meta-separator">•</span>
                        <span className="meta-item">
                          <FontAwesomeIcon icon={faClock} />
                          {task.reminder?.reminderTime || "No reminder"}
                        </span>
                      </div>
                    </div>

                    <div className="task-actions">
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-primary" size="sm">
                          Actions
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item
                            onClick={() => handleTaskAction("view", task)}
                          >
                            <FontAwesomeIcon icon={faEye} className="me-2" />
                            View Details
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => handleTaskAction("edit", task)}
                          >
                            <FontAwesomeIcon icon={faEdit} className="me-2" />
                            Edit Task
                          </Dropdown.Item>
                          <Dropdown.Divider />
                          {task.status === "pending" && (
                            <Dropdown.Item
                              onClick={() => handleTaskAction("start", task)}
                            >
                              <FontAwesomeIcon icon={faPlay} className="me-2" />
                              Start Task
                            </Dropdown.Item>
                          )}
                          {task.status !== "completed" && (
                            <Dropdown.Item
                              onClick={() => handleTaskAction("complete", task)}
                            >
                              <FontAwesomeIcon
                                icon={faCheckDouble}
                                className="me-2"
                              />
                              Mark Complete
                            </Dropdown.Item>
                          )}
                          <Dropdown.Divider />
                          <Dropdown.Item
                            onClick={() => handleTaskAction("delete", task)}
                            className="text-danger"
                          >
                            <FontAwesomeIcon icon={faTrash} className="me-2" />
                            Delete Task
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <FontAwesomeIcon icon={faTasks} className="empty-icon" />
                <h6 className="empty-title">No tasks found</h6>
                <p className="empty-subtitle">
                  {Object.values(filters).some((f) => f !== "all" && f !== "")
                    ? "Try adjusting your filters"
                    : "Start by assigning your first task"}
                </p>
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditTask(null);
                    setShowAssignModal(true);
                  }}
                  className="assign-button"
                >
                  <FontAwesomeIcon icon={faPlus} className="me-2" />
                  Assign First Task
                </Button>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pagination-section">
            <Button
              variant="outline-primary"
              size="sm"
              disabled={pagination.currentPage === 1 || isLoading}
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  currentPage: prev.currentPage - 1,
                }))
              }
            >
              Previous
            </Button>
            <span className="pagination-info">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <Button
              variant="outline-primary"
              size="sm"
              disabled={
                pagination.currentPage === pagination.totalPages || isLoading
              }
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  currentPage: prev.currentPage + 1,
                }))
              }
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Task Assignment Modal */}
      <TaskAssignment
        show={showAssignModal}
        onHide={handleModalClose}
        onTaskCreated={handleTaskCreated}
        editTask={editTask}
        companyData={companyData}
        userData={userData}
      />

      {/* Toast Notifications */}
      <ToastContainer position="bottom-end" className="p-3">
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={3000}
          autohide
          bg={toastVariant}
        >
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>

      <style jsx>{`
        .daily-task-assignment {
          background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
          min-height: 100vh;
          width: 100%;
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI",
            sans-serif;
        }

        /* ✅ FIX: Modal z-index issues with filters */
        .modal {
          z-index: 1055 !important;
        }

        .modal-backdrop {
          z-index: 1050 !important;
        }

        /* ✅ FIX: Ensure filter dropdowns stay behind modals */
        .filters-section .dropdown-menu,
        .filters-section .form-select,
        .task-actions .dropdown-menu {
          z-index: 1040 !important;
        }

        /* ✅ FIX: When modal is open, hide filter dropdowns */
        body.modal-open .filters-section .dropdown-menu {
          display: none !important;
        }

        /* ✅ FIX: Ensure task action dropdowns also stay behind modal */
        .task-actions .dropdown-menu {
          z-index: 1040 !important;
        }

        /* ✅ FIX: Bootstrap select dropdown z-index */
        .form-select:focus {
          z-index: 1040 !important;
        }

        /* ✅ FIX: Additional Bootstrap dropdown overrides */
        .dropdown-menu {
          z-index: 1035 !important;
        }

        .dropdown-toggle:focus,
        .dropdown-toggle:active {
          z-index: 1035 !important;
        }

        /* ✅ FIX: Select element specific fixes */
        select.form-select {
          z-index: 1030 !important;
        }

        select.form-select:focus {
          z-index: 1030 !important;
        }

        /* Header Section */
        .page-header {
          background: linear-gradient(135deg, #6f42c1 0%, #8e44ad 100%);
          padding: 1.5rem 2rem;
          color: white;
          box-shadow: 0 2px 10px rgba(111, 66, 193, 0.15);
        }

        .header-content {
          display: flex;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
        }

        .header-icon {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 1rem;
          font-size: 1.2rem;
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .page-subtitle {
          font-size: 0.95rem;
          opacity: 0.9;
          margin-bottom: 0;
        }

        /* Content Container */
        .content-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1.5rem 2rem;
        }

        /* Error Alert */
        .error-alert {
          margin-bottom: 1.5rem;
        }

        /* Filters Section - Enhanced Responsive Layout */
        .filters-section {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          position: relative;
          z-index: 1030; /* ✅ Lower than modal */
        }

        .filters-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .filters-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .filters-row-1 {
          justify-content: flex-start;
        }

        .filters-row-2 {
          justify-content: space-between;
        }

        .filter-group {
          flex: 1;
          min-width: 140px;
          max-width: 180px;
          position: relative;
          z-index: 1031; /* ✅ Slightly higher than section but lower than modal */
        }

        .search-group {
          flex: 1;
          max-width: 300px;
          position: relative;
          z-index: 1031; /* ✅ Slightly higher than section but lower than modal */
        }

        .actions-group {
          display: flex;
          gap: 0.75rem;
          flex-shrink: 0;
          position: relative;
          z-index: 1031; /* ✅ Slightly higher than section but lower than modal */
        }

        .filter-select {
          width: 100%;
          font-size: 0.9rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          transition: all 0.2s ease;
          background: white;
          position: relative;
          z-index: 1032; /* ✅ Lower than modal but higher than group */
        }

        .filter-select:focus {
          border-color: #6f42c1;
          box-shadow: 0 0 0 2px rgba(111, 66, 193, 0.1);
          z-index: 1032 !important; /* ✅ Stay below modal */
        }

        .filter-select:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #f8f9fa;
        }

        .search-input {
          width: 100%;
          font-size: 0.9rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          transition: all 0.2s ease;
          position: relative;
          z-index: 1032; /* ✅ Lower than modal but higher than group */
        }

        .search-input:focus {
          border-color: #6f42c1;
          box-shadow: 0 0 0 2px rgba(111, 66, 193, 0.1);
          z-index: 1032 !important; /* ✅ Stay below modal */
        }

        .search-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #f8f9fa;
        }

        .refresh-button {
          min-width: 44px;
          height: 38px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1032; /* ✅ Lower than modal but higher than group */
        }

        .refresh-button:hover:not(:disabled) {
          background: #f8f9fa;
          border-color: #6f42c1;
          color: #6f42c1;
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .assign-button {
          background: linear-gradient(135deg, #6f42c1 0%, #8e44ad 100%);
          border: none;
          border-radius: 8px;
          font-weight: 600;
          padding: 0.5rem 1rem;
          transition: all 0.3s ease;
          white-space: nowrap;
          position: relative;
          z-index: 1032; /* ✅ Lower than modal but higher than group */
        }

        .assign-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #5a359a 0%, #7d3c98 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(111, 66, 193, 0.3);
        }

        .assign-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* Tasks Card */
        .tasks-card {
          border: none;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          overflow: hidden;
          position: relative;
          z-index: 1020; /* ✅ Lower than filters */
        }

        .tasks-header {
          background: linear-gradient(135deg, #6f42c1 0%, #8e44ad 100%);
          color: white;
          border: none;
          padding: 1.25rem 1.5rem;
        }

        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-left {
          display: flex;
          align-items: center;
        }

        .header-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0;
        }

        .tasks-body {
          padding: 0;
          background: white;
        }

        /* Loading State */
        .loading-state {
          text-align: center;
          padding: 3rem 1.5rem;
        }

        .loading-text {
          margin-top: 1rem;
          color: #6c757d;
          font-size: 0.95rem;
        }

        /* Tasks List */
        .tasks-list {
          display: flex;
          flex-direction: column;
        }

        .task-item {
          display: flex;
          align-items: flex-start;
          padding: 1.5rem;
          border-bottom: 1px solid #f1f5f9;
          transition: all 0.2s ease;
          background: white;
          position: relative;
          z-index: 1021; /* ✅ Lower than filters */
        }

        .task-item:last-child {
          border-bottom: none;
        }

        .task-item:hover {
          background: #f8fafc;
        }

        .task-item.task-overdue {
          background: #fef2f2;
          border-left: 4px solid #ef4444;
        }

        .task-icon {
          width: 44px;
          height: 44px;
          background: linear-gradient(
            135deg,
            rgba(111, 66, 193, 0.1) 0%,
            rgba(142, 68, 173, 0.1) 100%
          );
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 1rem;
          font-size: 1.1rem;
          color: #6f42c1;
          flex-shrink: 0;
        }

        .task-content {
          flex: 1;
          margin-right: 1rem;
          min-width: 0;
        }

        .task-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.75rem;
        }

        .task-title {
          color: #1e293b;
          font-weight: 600;
          font-size: 1rem;
          margin: 0;
          line-height: 1.4;
        }

        .task-badges {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          flex-shrink: 0;
        }

        .overdue-badge {
          font-size: 0.75rem;
        }

        .task-description {
          color: #64748b;
          font-size: 0.9rem;
          line-height: 1.5;
          margin-bottom: 0.75rem;
        }

        .task-progress {
          margin-bottom: 0.75rem;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.25rem;
        }

        .progress-label,
        .progress-value {
          font-size: 0.8rem;
          color: #64748b;
        }

        .task-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          padding-top: 0.75rem;
          border-top: 1px solid #f1f5f9;
          font-size: 0.85rem;
          color: #64748b;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .meta-separator {
          color: #cbd5e1;
        }

        .task-actions {
          flex-shrink: 0;
          position: relative;
          z-index: 1022; /* ✅ Higher than task item but lower than filters */
        }

        /* ✅ FIX: Task actions dropdown specific z-index */
        .task-actions .dropdown {
          position: relative;
          z-index: 1022;
        }

        .task-actions .dropdown-menu {
          z-index: 1023 !important;
        }

        .task-actions .dropdown-toggle {
          z-index: 1022 !important;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 3rem 1.5rem;
        }

        .empty-icon {
          font-size: 3rem;
          color: #cbd5e1;
          margin-bottom: 1rem;
        }

        .empty-title {
          color: #475569;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .empty-subtitle {
          color: #64748b;
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
        }

        /* Pagination */
        .pagination-section {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 1.5rem;
          position: relative;
          z-index: 1020; /* ✅ Lower than filters */
        }

        .pagination-info {
          font-size: 0.9rem;
          color: #64748b;
        }

        /* ✅ FIX: Additional global z-index overrides for modal safety */
        body.modal-open .filter-select,
        body.modal-open .search-input,
        body.modal-open .dropdown-toggle {
          z-index: 1040 !important;
        }

        body.modal-open .dropdown-menu {
          display: none !important;
        }

        /* ✅ FIX: Ensure Toast notifications are above everything */
        .toast-container {
          z-index: 1060 !important;
        }

        /* Responsive Design for Filters */
        @media (max-width: 992px) {
          .filters-row-1 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
          }

          .filter-group {
            max-width: none;
          }
        }

        @media (max-width: 768px) {
          .page-header {
            padding: 1rem;
          }

          .content-container {
            padding: 1rem;
          }

          .filters-container {
            gap: 1.25rem;
          }

          .filters-row-1 {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .filters-row-2 {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }

          .filter-group,
          .search-group {
            max-width: none;
            flex: none;
          }

          .actions-group {
            justify-content: center;
          }

          .task-item {
            flex-direction: column;
            align-items: stretch;
          }

          .task-icon {
            align-self: flex-start;
            margin-bottom: 1rem;
            margin-right: 0;
          }

          .task-content {
            margin-right: 0;
            margin-bottom: 1rem;
          }

          .task-header {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }

          .task-badges {
            justify-content: flex-start;
          }

          .task-meta {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }

          .meta-separator {
            display: none;
          }
        }

        @media (max-width: 576px) {
          .page-header {
            padding: 0.75rem;
          }

          .header-content {
            flex-direction: column;
            text-align: center;
          }

          .header-icon {
            margin-right: 0;
            margin-bottom: 0.75rem;
          }

          .page-title {
            font-size: 1.25rem;
          }

          .page-subtitle {
            font-size: 0.85rem;
          }

          .filters-section {
            padding: 1rem;
          }

          .actions-group {
            flex-direction: column;
            gap: 0.75rem;
          }

          .assign-button {
            width: 100%;
            justify-content: center;
          }

          .task-item {
            padding: 1rem;
          }

          .tasks-header {
            padding: 1rem;
          }
        }

        /* ✅ FIX: Additional safety overrides for any missed elements */
        .daily-task-assignment * {
          position: relative;
        }

        .daily-task-assignment .modal,
        .daily-task-assignment .modal-backdrop {
          position: fixed !important;
        }

        /* ✅ FIX: Specific Bootstrap form control overrides */
        .form-control:focus,
        .form-select:focus {
          z-index: 1040 !important;
        }

        /* ✅ FIX: Dropdown menu animation override to prevent z-index issues */
        .dropdown-menu.show {
          z-index: 1035 !important;
        }

        .dropdown-menu.show.modal-open {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

export default DailyTaskAssignment;
