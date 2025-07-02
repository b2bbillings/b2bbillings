import React, {useState, useEffect, useCallback, useMemo, useRef} from "react";
import {useNavigate} from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Form,
  InputGroup,
  Modal,
  Badge,
  Alert,
  Spinner,
  Pagination,
  OverlayTrigger,
  Popover,
} from "react-bootstrap";
import {createPortal} from "react-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faBuilding,
  faPlus,
  faEdit,
  faTrash,
  faEye,
  faUser,
  faShieldAlt,
  faBan,
  faCheck,
  faEllipsisV,
  faUserPlus,
  faDownload,
  faUpload,
  faFilter,
  faSort,
  faKey,
  faUsers,
  faExclamationTriangle,
  faRefresh,
  faUserCog,
  faEnvelope,
  faPhone,
  faCalendarAlt,
} from "@fortawesome/free-solid-svg-icons";

// Import user service
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  changeUserPassword,
  resetLoginAttempts,
  exportUsers,
  searchUsers,
  validateUserData,
  handleUserServiceError,
} from "../../services/userService";

function UserManagement({adminData, currentUser, addToast}) {
  const navigate = useNavigate();

  // State management
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Dropdown state
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({x: 0, y: 0});
  const dropdownRef = useRef(null);

  // Form state for create/edit user
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "user",
    isActive: true,
    emailVerified: false,
  });
  const [formErrors, setFormErrors] = useState({});

  // Load users on component mount and when filters change
  useEffect(() => {
    loadUsers();
  }, [
    currentPage,
    searchQuery,
    roleFilter,
    statusFilter,
    sortField,
    sortDirection,
  ]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load users from backend
  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: usersPerPage,
        search: searchQuery,
        role: roleFilter !== "all" ? roleFilter : "",
        isActive: statusFilter !== "all" ? statusFilter === "active" : "",
        sortBy: sortField,
        sortOrder: sortDirection,
      };

      const response = await getAllUsers(params);

      if (response.success) {
        setUsers(response.data.users);
        setTotalPages(response.data.pagination.totalPages);
        setTotalUsers(response.data.pagination.totalUsers);

        if (currentPage === 1 && !isRefreshing) {
          addToast?.("Users loaded successfully", "success");
        }
      }
    } catch (error) {
      console.error("Error loading users:", error);
      const errorMessage = handleUserServiceError(error);
      setError(errorMessage);
      addToast?.(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadUsers();
    setIsRefreshing(false);
  };

  // Navigate to user details page
  const handleViewUserDetails = (user, section = "overview") => {
    try {
      // Navigate to the user detail page with proper route and state
      navigate(`/admin/users/${user._id}/${section}`, {
        state: {
          userData: {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isActive: user.isActive,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            updatedAt: user.updatedAt,
            avatar: user.avatar,
            // Add additional user data
            address: user.address || {},
            preferences: user.preferences || {},
            security: user.security || {},
            stats: {
              accountAge: user.stats?.accountAge || 0,
              totalCompanies: user.stats?.totalCompanies || 0,
              activeCompanies: user.stats?.activeCompanies || 0,
              lastActivity: user.lastLogin,
              profileCompleteness: user.stats?.profileCompleteness || 0,
            },
            companies: user.companies || [],
            recentActivity: user.recentActivity || {},
          },
          backTo: "/admin/users",
          userRole: "admin",
        },
      });

      addToast?.(`Opening ${section} for ${user.name}`, "info");
    } catch (error) {
      console.error("Error navigating to user details:", error);
      addToast?.("Failed to open user details", "error");
    }
  };

  // Handle user row click
  const handleUserRowClick = (user, event) => {
    // Prevent navigation if clicking on dropdown or action buttons
    if (
      event.target.closest(".dropdown-portal") ||
      event.target.closest(".dropdown-trigger") ||
      event.target.closest("button") ||
      event.target.closest(".btn")
    ) {
      return;
    }

    handleViewUserDetails(user, "overview");
  };

  // Handle dropdown toggle
  const handleDropdownToggle = useCallback(
    (userId, event) => {
      event.stopPropagation();

      if (activeDropdown === userId) {
        setActiveDropdown(null);
        return;
      }

      // Calculate dropdown position
      const rect = event.currentTarget.getBoundingClientRect();
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft =
        window.pageXOffset || document.documentElement.scrollLeft;

      setDropdownPosition({
        x: rect.right - 200 + scrollLeft, // Align right edge of dropdown with button
        y: rect.bottom + 5 + scrollTop, // Position below button with small gap
      });

      setActiveDropdown(userId);
    },
    [activeDropdown]
  );

  // Handle user actions
  const handleUserAction = async (action, user) => {
    setSelectedUser(user);
    setActiveDropdown(null); // Close dropdown

    switch (action) {
      case "view":
      case "viewOverview":
        handleViewUserDetails(user, "overview");
        break;
      case "viewCompanies":
        handleViewUserDetails(user, "companies");
        break;
      case "viewActivity":
        handleViewUserDetails(user, "activity");
        break;
      case "edit":
        setModalMode("edit");
        setUserForm({
          name: user.name,
          email: user.email,
          password: "",
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
        });
        setFormErrors({});
        setShowUserModal(true);
        break;
      case "activate":
      case "deactivate":
        await handleToggleStatus(user);
        break;
      case "resetPassword":
        await handleResetPassword(user);
        break;
      case "delete":
        await handleDeleteUser(user);
        break;
      default:
        break;
    }
  };

  // Toggle user status
  const handleToggleStatus = async (user) => {
    try {
      setIsActionLoading(true);
      const response = await toggleUserStatus(user._id);

      if (response.success) {
        // Update local state
        setUsers((prev) =>
          prev.map((u) =>
            u._id === user._id ? {...u, isActive: response.data.isActive} : u
          )
        );
        addToast?.(response.message, "success");
      }
    } catch (error) {
      const errorMessage = handleUserServiceError(error);
      addToast?.(errorMessage, "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Reset user password
  const handleResetPassword = async (user) => {
    const newPassword = prompt(`Enter new password for ${user.name}:`);
    if (!newPassword) return;

    if (newPassword.length < 6) {
      addToast?.("Password must be at least 6 characters long", "error");
      return;
    }

    try {
      setIsActionLoading(true);
      const response = await changeUserPassword(user._id, newPassword);

      if (response.success) {
        addToast?.(response.message, "success");
      }
    } catch (error) {
      const errorMessage = handleUserServiceError(error);
      addToast?.(errorMessage, "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (user) => {
    if (
      !window.confirm(`Are you sure you want to delete user "${user.name}"?`)
    ) {
      return;
    }

    try {
      setIsActionLoading(true);
      const response = await deleteUser(user._id, false); // Soft delete

      if (response.success) {
        // Remove from local state or reload
        await loadUsers();
        addToast?.(response.message, "success");
      }
    } catch (error) {
      const errorMessage = handleUserServiceError(error);
      addToast?.(errorMessage, "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle form submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Validate form data
    const validation = validateUserData(userForm);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    try {
      setIsActionLoading(true);
      let response;

      if (modalMode === "create") {
        response = await createUser(userForm);
      } else if (modalMode === "edit") {
        const updateData = {...userForm};
        delete updateData.password; // Don't update password in edit mode
        response = await updateUser(selectedUser._id, updateData);
      }

      if (response.success) {
        setShowUserModal(false);
        setUserForm({
          name: "",
          email: "",
          password: "",
          phone: "",
          role: "user",
          isActive: true,
          emailVerified: false,
        });
        setFormErrors({});
        await loadUsers();
        addToast?.(response.message, "success");
      }
    } catch (error) {
      const errorMessage = handleUserServiceError(error);
      addToast?.(errorMessage, "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle export
  const handleExport = async (format = "csv") => {
    try {
      setIsActionLoading(true);
      const response = await exportUsers(format);

      if (response.success) {
        addToast?.(response.message, "success");
      }
    } catch (error) {
      const errorMessage = handleUserServiceError(error);
      addToast?.(errorMessage, "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Utility functions
  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: {bg: "danger", icon: faShieldAlt, text: "Admin"},
      superadmin: {bg: "dark", icon: faShieldAlt, text: "Super Admin"},
      manager: {bg: "primary", icon: faUserCog, text: "Manager"},
      user: {bg: "success", icon: faUser, text: "User"},
    };

    const config = roleConfig[role] || {
      bg: "secondary",
      icon: faUser,
      text: "Unknown",
    };

    return (
      <Badge bg={config.bg} className="d-flex align-items-center gap-1">
        <FontAwesomeIcon icon={config.icon} size="sm" />
        {config.text}
      </Badge>
    );
  };

  const getStatusBadge = (user) => {
    return user.isActive ? (
      <Badge bg="success" className="d-flex align-items-center gap-1">
        <FontAwesomeIcon icon={faCheck} size="sm" />
        Active
      </Badge>
    ) : (
      <Badge bg="danger" className="d-flex align-items-center gap-1">
        <FontAwesomeIcon icon={faBan} size="sm" />
        Inactive
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Custom Portal Dropdown Component
  const PortalDropdown = ({user, isOpen, position}) => {
    if (!isOpen) return null;

    const dropdownItems = [
      {
        type: "header",
        content: (
          <div className="dropdown-header">
            <FontAwesomeIcon icon={faEye} className="me-2" />
            View Options
          </div>
        ),
      },
      {
        type: "item",
        action: "viewOverview",
        content: (
          <>
            <FontAwesomeIcon icon={faUser} className="me-2 text-primary" />
            Full Profile
          </>
        ),
      },
      {
        type: "item",
        action: "viewCompanies",
        content: (
          <>
            <FontAwesomeIcon icon={faBuilding} className="me-2 text-info" />
            Companies ({user.stats?.totalCompanies || 0})
          </>
        ),
      },
      {
        type: "item",
        action: "viewActivity",
        content: (
          <>
            <FontAwesomeIcon
              icon={faCalendarAlt}
              className="me-2 text-warning"
            />
            Activity Log
          </>
        ),
      },
      {type: "divider"},
      {
        type: "header",
        content: (
          <div className="dropdown-header">
            <FontAwesomeIcon icon={faUserCog} className="me-2" />
            Management
          </div>
        ),
      },
      {
        type: "item",
        action: "edit",
        content: (
          <>
            <FontAwesomeIcon icon={faEdit} className="me-2 text-primary" />
            Edit Profile
          </>
        ),
      },
      {
        type: "item",
        action: "resetPassword",
        content: (
          <>
            <FontAwesomeIcon icon={faKey} className="me-2 text-warning" />
            Reset Password
          </>
        ),
      },
      {type: "divider"},
      {
        type: "item",
        action: user.isActive ? "deactivate" : "activate",
        className: user.isActive ? "text-warning" : "text-success",
        content: (
          <>
            <FontAwesomeIcon
              icon={user.isActive ? faBan : faCheck}
              className="me-2"
            />
            {user.isActive ? "Deactivate User" : "Activate User"}
          </>
        ),
      },
      {type: "divider"},
      {
        type: "item",
        action: "delete",
        className: "text-danger",
        content: (
          <>
            <FontAwesomeIcon icon={faTrash} className="me-2" />
            Delete User
          </>
        ),
      },
    ];

    return createPortal(
      <div
        ref={dropdownRef}
        className="dropdown-portal"
        style={{
          position: "absolute",
          top: position.y,
          left: position.x,
          zIndex: 9999,
          minWidth: "200px",
        }}
      >
        <div className="dropdown-menu show shadow-lg border-0">
          {dropdownItems.map((item, index) => {
            if (item.type === "header") {
              return (
                <div key={index} className="dropdown-header-custom">
                  {item.content}
                </div>
              );
            } else if (item.type === "divider") {
              return <div key={index} className="dropdown-divider" />;
            } else if (item.type === "item") {
              return (
                <button
                  key={index}
                  className={`dropdown-item dropdown-item-custom ${
                    item.className || ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUserAction(item.action, user);
                  }}
                  disabled={isActionLoading}
                >
                  {item.content}
                </button>
              );
            }
            return null;
          })}
        </div>
      </div>,
      document.body
    );
  };

  // Custom Three Dot Menu Component
  const ThreeDotMenu = ({user}) => {
    const isDropdownOpen = activeDropdown === user._id;

    return (
      <div className="dropdown-container">
        <button
          className="dropdown-trigger three-dot-menu"
          onClick={(e) => handleDropdownToggle(user._id, e)}
          disabled={isActionLoading}
        >
          <FontAwesomeIcon icon={faEllipsisV} />
        </button>

        <PortalDropdown
          user={user}
          isOpen={isDropdownOpen}
          position={dropdownPosition}
        />
      </div>
    );
  };

  // Loading state
  if (isLoading && users.length === 0) {
    return (
      <div className="user-management">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" size="lg" />
          <h5 className="mt-3 text-muted">Loading users...</h5>
          <p className="text-muted">Please wait while we fetch user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">
            <FontAwesomeIcon icon={faUsers} className="me-2 text-primary" />
            User Management
          </h4>
          <p className="text-muted mb-0">
            Manage all users in the system ({totalUsers} total users)
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="outline-secondary"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="professional-button"
          >
            <FontAwesomeIcon
              icon={faRefresh}
              className={`me-2 ${isRefreshing ? "fa-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            variant="outline-primary"
            onClick={() => handleExport("csv")}
            disabled={isActionLoading}
            className="professional-button"
          >
            <FontAwesomeIcon icon={faDownload} className="me-2" />
            Export CSV
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setSelectedUser(null);
              setModalMode("create");
              setUserForm({
                name: "",
                email: "",
                password: "",
                phone: "",
                role: "user",
                isActive: true,
                emailVerified: false,
              });
              setFormErrors({});
              setShowUserModal(true);
            }}
            className="professional-button"
          >
            <FontAwesomeIcon icon={faUserPlus} className="me-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          {error}
        </Alert>
      )}

      {/* Filters and Search */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <Row className="align-items-end">
            <Col lg={4} md={6} className="mb-3">
              <Form.Label className="fw-semibold">Search Users</Form.Label>
              <InputGroup>
                <InputGroup.Text className="bg-light border-end-0">
                  <FontAwesomeIcon icon={faSearch} className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="border-start-0"
                />
              </InputGroup>
            </Col>
            <Col lg={2} md={6} className="mb-3">
              <Form.Label className="fw-semibold">Role</Form.Label>
              <Form.Select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-select-custom"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </Form.Select>
            </Col>
            <Col lg={2} md={6} className="mb-3">
              <Form.Label className="fw-semibold">Status</Form.Label>
              <Form.Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-select-custom"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Form.Select>
            </Col>
            <Col lg={3} md={6} className="mb-3">
              <Form.Label className="fw-semibold">Sort By</Form.Label>
              <Form.Select
                value={`${sortField}-${sortDirection}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split("-");
                  setSortField(field);
                  setSortDirection(direction);
                  setCurrentPage(1);
                }}
                className="form-select-custom"
              >
                <option value="createdAt-desc">Latest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="lastLogin-desc">Recent Login</option>
                <option value="email-asc">Email A-Z</option>
              </Form.Select>
            </Col>
            <Col lg={1} md={6} className="mb-3">
              <div className="text-muted small text-center">
                <div className="fw-bold">{totalUsers}</div>
                <div>Total Users</div>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Users Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {isLoading && (
            <div className="text-center py-3 bg-light">
              <Spinner animation="border" size="sm" className="me-2" />
              <span className="text-muted">Loading users...</span>
            </div>
          )}

          <div className="table-responsive">
            <Table hover className="mb-0 modern-table">
              <thead className="table-light">
                <tr>
                  <th className="border-0 fw-semibold text-dark">User</th>
                  <th className="border-0 fw-semibold text-dark">Contact</th>
                  <th className="border-0 fw-semibold text-dark">Role</th>
                  <th className="border-0 fw-semibold text-dark">Status</th>
                  <th className="border-0 fw-semibold text-dark">
                    Email Status
                  </th>
                  <th className="border-0 fw-semibold text-dark">Created</th>
                  <th className="border-0 fw-semibold text-dark">Last Login</th>
                  <th className="border-0 fw-semibold text-dark text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user._id}
                    className="clickable-row"
                    onClick={(e) => handleUserRowClick(user, e)}
                    style={{cursor: "pointer"}}
                  >
                    <td className="py-3">
                      <div className="d-flex align-items-center">
                        <div className="user-avatar me-3">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="rounded-circle"
                              style={{
                                width: "40px",
                                height: "40px",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <FontAwesomeIcon
                              icon={faUser}
                              className="text-primary"
                              size="lg"
                            />
                          )}
                        </div>
                        <div>
                          <div className="fw-bold user-name-clickable">
                            {user.name}
                          </div>
                          <small className="text-muted">
                            ID: {user._id.slice(-8)}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <div>
                        <div className="d-flex align-items-center mb-1">
                          <FontAwesomeIcon
                            icon={faEnvelope}
                            className="text-muted me-2"
                            size="sm"
                          />
                          <span
                            className="text-truncate"
                            style={{maxWidth: "180px"}}
                          >
                            {user.email}
                          </span>
                        </div>
                        {user.phone && (
                          <div className="d-flex align-items-center">
                            <FontAwesomeIcon
                              icon={faPhone}
                              className="text-muted me-2"
                              size="sm"
                            />
                            <small className="text-muted">{user.phone}</small>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3">{getRoleBadge(user.role)}</td>
                    <td className="py-3">{getStatusBadge(user)}</td>
                    <td className="py-3">
                      <Badge
                        bg={user.emailVerified ? "success" : "warning"}
                        className="d-flex align-items-center gap-1"
                        style={{width: "fit-content"}}
                      >
                        <FontAwesomeIcon
                          icon={
                            user.emailVerified ? faCheck : faExclamationTriangle
                          }
                          size="sm"
                        />
                        {user.emailVerified ? "Verified" : "Unverified"}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="d-flex align-items-center">
                        <FontAwesomeIcon
                          icon={faCalendarAlt}
                          className="text-muted me-2"
                          size="sm"
                        />
                        <small className="text-muted">
                          {formatDate(user.createdAt)}
                        </small>
                      </div>
                    </td>
                    <td className="py-3">
                      <small className="text-muted">
                        {formatDate(user.lastLogin)}
                      </small>
                    </td>
                    <td className="py-3 text-center">
                      <ThreeDotMenu user={user} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card.Footer className="bg-light border-0">
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-muted small">
                Showing {(currentPage - 1) * usersPerPage + 1} to{" "}
                {Math.min(currentPage * usersPerPage, totalUsers)} of{" "}
                {totalUsers} entries
              </div>
              <Pagination className="mb-0">
                <Pagination.Prev
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                />
                {[...Array(Math.min(totalPages, 5))].map((_, index) => {
                  const page =
                    currentPage <= 3 ? index + 1 : currentPage - 2 + index;
                  if (page > totalPages) return null;
                  return (
                    <Pagination.Item
                      key={page}
                      active={page === currentPage}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Pagination.Item>
                  );
                })}
                <Pagination.Next
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                />
              </Pagination>
            </div>
          </Card.Footer>
        )}
      </Card>

      {/* Empty State */}
      {users.length === 0 && !isLoading && (
        <div className="text-center py-5">
          <FontAwesomeIcon
            icon={faUser}
            size="3x"
            className="text-muted mb-3"
          />
          <h5 className="text-muted">No users found</h5>
          <p className="text-muted">
            {searchQuery || roleFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your search or filter criteria"
              : "Start by adding your first user"}
          </p>
          {!searchQuery && roleFilter === "all" && statusFilter === "all" && (
            <Button
              variant="primary"
              onClick={() => {
                setSelectedUser(null);
                setModalMode("create");
                setUserForm({
                  name: "",
                  email: "",
                  password: "",
                  phone: "",
                  role: "user",
                  isActive: true,
                  emailVerified: false,
                });
                setFormErrors({});
                setShowUserModal(true);
              }}
            >
              <FontAwesomeIcon icon={faUserPlus} className="me-2" />
              Add First User
            </Button>
          )}
        </div>
      )}

      {/* User Modal */}
      <Modal
        show={showUserModal}
        onHide={() => setShowUserModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton className="bg-light border-0">
          <Modal.Title className="d-flex align-items-center">
            <FontAwesomeIcon
              icon={modalMode === "create" ? faUserPlus : faEdit}
              className="me-2 text-primary"
            />
            {modalMode === "create" && "Add New User"}
            {modalMode === "edit" && "Edit User"}
            {modalMode === "view" && "User Details"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalMode === "view" && selectedUser && (
            <div>
              <Row>
                <Col md={6}>
                  <p>
                    <strong>Name:</strong> {selectedUser.name}
                  </p>
                  <p>
                    <strong>Email:</strong> {selectedUser.email}
                  </p>
                  <p>
                    <strong>Phone:</strong> {selectedUser.phone}
                  </p>
                  <p>
                    <strong>Role:</strong> {getRoleBadge(selectedUser.role)}
                  </p>
                </Col>
                <Col md={6}>
                  <p>
                    <strong>Status:</strong> {getStatusBadge(selectedUser)}
                  </p>
                  <p>
                    <strong>Email Verified:</strong>
                    <Badge
                      bg={selectedUser.emailVerified ? "success" : "warning"}
                      className="ms-2"
                    >
                      {selectedUser.emailVerified ? "Yes" : "No"}
                    </Badge>
                  </p>
                  <p>
                    <strong>Created:</strong>{" "}
                    {formatDate(selectedUser.createdAt)}
                  </p>
                  <p>
                    <strong>Last Login:</strong>{" "}
                    {formatDate(selectedUser.lastLogin)}
                  </p>
                </Col>
              </Row>
            </div>
          )}

          {(modalMode === "create" || modalMode === "edit") && (
            <Form onSubmit={handleFormSubmit}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Name *</Form.Label>
                    <Form.Control
                      type="text"
                      value={userForm.name}
                      onChange={(e) =>
                        setUserForm({...userForm, name: e.target.value})
                      }
                      isInvalid={!!formErrors.name}
                      required
                      className="form-control-custom"
                    />
                    <Form.Control.Feedback type="invalid">
                      {formErrors.name}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Email *</Form.Label>
                    <Form.Control
                      type="email"
                      value={userForm.email}
                      onChange={(e) =>
                        setUserForm({...userForm, email: e.target.value})
                      }
                      isInvalid={!!formErrors.email}
                      required
                      className="form-control-custom"
                    />
                    <Form.Control.Feedback type="invalid">
                      {formErrors.email}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Phone</Form.Label>
                    <Form.Control
                      type="text"
                      value={userForm.phone}
                      onChange={(e) =>
                        setUserForm({...userForm, phone: e.target.value})
                      }
                      isInvalid={!!formErrors.phone}
                      className="form-control-custom"
                    />
                    <Form.Control.Feedback type="invalid">
                      {formErrors.phone}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Role *</Form.Label>
                    <Form.Select
                      value={userForm.role}
                      onChange={(e) =>
                        setUserForm({...userForm, role: e.target.value})
                      }
                      required
                      className="form-select-custom"
                    >
                      <option value="user">User</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Super Admin</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              {modalMode === "create" && (
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">
                        Password *
                      </Form.Label>
                      <Form.Control
                        type="password"
                        value={userForm.password}
                        onChange={(e) =>
                          setUserForm({...userForm, password: e.target.value})
                        }
                        isInvalid={!!formErrors.password}
                        required={modalMode === "create"}
                        placeholder="Minimum 6 characters"
                        className="form-control-custom"
                      />
                      <Form.Control.Feedback type="invalid">
                        {formErrors.password}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
              )}

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Active User"
                      checked={userForm.isActive}
                      onChange={(e) =>
                        setUserForm({...userForm, isActive: e.target.checked})
                      }
                      className="form-check-custom"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Email Verified"
                      checked={userForm.emailVerified}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          emailVerified: e.target.checked,
                        })
                      }
                      className="form-check-custom"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light border-0">
          <Button
            variant="outline-secondary"
            onClick={() => setShowUserModal(false)}
            disabled={isActionLoading}
            className="professional-button"
          >
            Close
          </Button>
          {(modalMode === "create" || modalMode === "edit") && (
            <Button
              variant="primary"
              onClick={handleFormSubmit}
              disabled={isActionLoading}
              className="professional-button"
            >
              {isActionLoading && <Spinner size="sm" className="me-2" />}
              {modalMode === "create" ? "Create User" : "Update User"}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        /* Modern Professional Styles */
        .user-management {
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }

        /* Clickable Rows */
        .clickable-row {
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
        }

        .clickable-row:hover {
          background-color: #f8f9fa !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-left-color: #0d6efd;
        }

        .user-name-clickable {
          color: #0d6efd;
          transition: color 0.2s ease;
        }

        .clickable-row:hover .user-name-clickable {
          color: #0a58ca;
          text-decoration: underline;
        }

        /* Professional Buttons */
        .professional-button {
          border-radius: 0.5rem;
          font-weight: 500;
          padding: 0.5rem 1rem;
          transition: all 0.2s ease;
          border-width: 1px;
        }

        .professional-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        /* Modern Table */
        .modern-table {
          font-size: 0.95rem;
        }

        .modern-table thead th {
          background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
          padding: 1rem 0.75rem;
          font-weight: 600;
          color: #495057;
        }

        .modern-table tbody td {
          border-color: #f1f3f4;
          vertical-align: middle;
        }

        /* User Avatar */
        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e3f2fd 0%, #f8f9fa 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(13, 110, 253, 0.1);
        }

        /* Custom Dropdown Portal */
        .dropdown-portal {
          position: absolute;
          z-index: 9999;
        }

        .dropdown-menu {
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 0.5rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          padding: 0.5rem 0;
          min-width: 200px;
        }

        .dropdown-header-custom {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #495057;
          background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
          border-bottom: 1px solid #e9ecef;
          margin-bottom: 0.25rem;
        }

        .dropdown-item-custom {
          display: flex;
          align-items: center;
          padding: 0.5rem 1rem;
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          color: #495057;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }

        .dropdown-item-custom:hover {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          transform: translateX(2px);
        }

        .dropdown-item-custom:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .dropdown-divider {
          height: 0;
          margin: 0.25rem 0;
          overflow: hidden;
          border-top: 1px solid #e9ecef;
        }

        /* Three Dot Menu */
        .dropdown-trigger {
          background: transparent;
          border: none;
          color: #6c757d;
          padding: 0.25rem 0.5rem;
          border-radius: 0.5rem;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .dropdown-trigger:hover {
          background: #f8f9fa;
          color: #495057;
          transform: scale(1.1);
        }

        .dropdown-trigger:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.2);
        }

        /* Form Controls */
        .form-control-custom,
        .form-select-custom {
          border: 1px solid #dee2e6;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          transition: all 0.2s ease;
        }

        .form-control-custom:focus,
        .form-select-custom:focus {
          border-color: #0d6efd;
          box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.1);
        }

        .form-check-custom {
          margin-top: 0.5rem;
        }

        /* Badge Enhancements */
        .badge {
          font-weight: 500;
          padding: 0.4rem 0.6rem;
          border-radius: 0.5rem;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .clickable-row:hover {
            transform: none;
            box-shadow: none;
          }

          .modern-table {
            font-size: 0.875rem;
          }

          .user-avatar {
            width: 32px;
            height: 32px;
          }

          .professional-button {
            padding: 0.375rem 0.75rem;
            font-size: 0.875rem;
          }

          .dropdown-menu {
            min-width: 180px;
          }
        }

        /* Loading Animation */
        .fa-spin {
          animation: fa-spin 1s infinite linear;
        }

        @keyframes fa-spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

export default UserManagement;
