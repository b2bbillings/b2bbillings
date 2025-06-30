import React, {useState, useEffect} from "react";
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
  Dropdown,
  Alert,
  Spinner,
  Pagination,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSearch,
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
} from "@fortawesome/free-solid-svg-icons";

function UserManagement({adminData, currentUser, addToast}) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalMode, setModalMode] = useState("view");

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchQuery, roleFilter, statusFilter, sortField, sortDirection]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockUsers = [
        {
          id: "1",
          name: "John Doe",
          email: "john.doe@techsolutions.com",
          phoneNumber: "9876543210",
          role: "admin",
          companyId: "1",
          companyName: "Tech Solutions Ltd",
          isActive: true,
          lastLogin: new Date("2024-06-29T10:30:00"),
          createdAt: new Date("2024-01-15"),
          loginCount: 245,
          permissions: ["all"],
        },
        {
          id: "2",
          name: "Jane Smith",
          email: "jane.smith@retailhub.com",
          phoneNumber: "8765432109",
          role: "manager",
          companyId: "2",
          companyName: "Retail Hub Pvt Ltd",
          isActive: true,
          lastLogin: new Date("2024-06-28T16:45:00"),
          createdAt: new Date("2024-02-01"),
          loginCount: 189,
          permissions: ["sales", "inventory", "reports"],
        },
        {
          id: "3",
          name: "Mike Johnson",
          email: "mike.johnson@manufacturing.com",
          phoneNumber: "7654321098",
          role: "user",
          companyId: "3",
          companyName: "Manufacturing Co",
          isActive: false,
          lastLogin: new Date("2024-06-20T09:15:00"),
          createdAt: new Date("2024-03-10"),
          loginCount: 67,
          permissions: ["sales"],
        },
      ];

      setUsers(mockUsers);
      addToast?.("Users loaded successfully", "success");
    } catch (error) {
      console.error("Error loading users:", error);
      addToast?.("Failed to load users", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortUsers = () => {
    let filtered = [...users];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.phoneNumber.includes(searchQuery) ||
          user.companyName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => {
        if (statusFilter === "active") return user.isActive;
        if (statusFilter === "inactive") return !user.isActive;
        return true;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "createdAt" || sortField === "lastLogin") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredUsers(filtered);
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleUserAction = (action, user) => {
    setSelectedUser(user);

    switch (action) {
      case "view":
        setModalMode("view");
        setShowUserModal(true);
        break;
      case "edit":
        setModalMode("edit");
        setShowUserModal(true);
        break;
      case "activate":
        handleToggleStatus(user, true);
        break;
      case "deactivate":
        handleToggleStatus(user, false);
        break;
      case "resetPassword":
        handleResetPassword(user);
        break;
      case "delete":
        handleDeleteUser(user);
        break;
      default:
        break;
    }
  };

  const handleToggleStatus = async (user, isActive) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? {...u, isActive} : u))
      );

      addToast?.(
        `User ${isActive ? "activated" : "deactivated"} successfully`,
        "success"
      );
    } catch (error) {
      addToast?.("Failed to update user status", "error");
    }
  };

  const handleResetPassword = async (user) => {
    if (window.confirm(`Reset password for ${user.name}?`)) {
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));
        addToast?.("Password reset email sent successfully", "success");
      } catch (error) {
        addToast?.("Failed to reset password", "error");
      }
    }
  };

  const handleDeleteUser = async (user) => {
    if (
      window.confirm(`Are you sure you want to delete user "${user.name}"?`)
    ) {
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        addToast?.("User deleted successfully", "success");
      } catch (error) {
        addToast?.("Failed to delete user", "error");
      }
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return <Badge bg="danger">Admin</Badge>;
      case "manager":
        return <Badge bg="primary">Manager</Badge>;
      case "user":
        return <Badge bg="success">User</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  const getStatusBadge = (user) => {
    return user.isActive ? (
      <Badge bg="success">Active</Badge>
    ) : (
      <Badge bg="danger">Inactive</Badge>
    );
  };

  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" size="lg" />
        <h5 className="mt-3 text-muted">Loading users...</h5>
      </div>
    );
  }

  return (
    <div className="user-management">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">User Management</h4>
          <p className="text-muted mb-0">Manage all users in the system</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-primary">
            <FontAwesomeIcon icon={faDownload} className="me-2" />
            Export
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setSelectedUser(null);
              setModalMode("create");
              setShowUserModal(true);
            }}
          >
            <FontAwesomeIcon icon={faUserPlus} className="me-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="align-items-end">
            <Col lg={4} md={6} className="mb-3">
              <Form.Label>Search Users</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <FontAwesomeIcon icon={faSearch} />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by name, email, phone, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col lg={2} md={6} className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="user">User</option>
              </Form.Select>
            </Col>
            <Col lg={2} md={6} className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Form.Select>
            </Col>
            <Col lg={3} md={6} className="mb-3">
              <Form.Label>Sort By</Form.Label>
              <Form.Select
                value={`${sortField}-${sortDirection}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split("-");
                  setSortField(field);
                  setSortDirection(direction);
                }}
              >
                <option value="createdAt-desc">Latest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="lastLogin-desc">Recent Login</option>
                <option value="loginCount-desc">Most Active</option>
              </Form.Select>
            </Col>
            <Col lg={1} md={6} className="mb-3">
              <div className="text-muted small">
                {currentUsers.length} of {filteredUsers.length}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Users Table */}
      <Card>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th
                    className="sortable-header"
                    onClick={() => handleSort("name")}
                  >
                    User
                    <FontAwesomeIcon
                      icon={faSort}
                      className="ms-1 opacity-50"
                    />
                  </th>
                  <th>Contact Info</th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th
                    className="sortable-header"
                    onClick={() => handleSort("lastLogin")}
                  >
                    Last Login
                    <FontAwesomeIcon
                      icon={faSort}
                      className="ms-1 opacity-50"
                    />
                  </th>
                  <th>Activity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="user-avatar me-3">
                          <FontAwesomeIcon
                            icon={faUser}
                            size="lg"
                            className="text-primary"
                          />
                        </div>
                        <div>
                          <div className="fw-bold">{user.name}</div>
                          <small className="text-muted">ID: {user.id}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div>{user.email}</div>
                        <small className="text-muted">{user.phoneNumber}</small>
                      </div>
                    </td>
                    <td>
                      <div className="fw-medium">{user.companyName}</div>
                    </td>
                    <td>{getRoleBadge(user.role)}</td>
                    <td>{getStatusBadge(user)}</td>
                    <td>
                      <small className="text-muted">
                        {user.lastLogin.toLocaleDateString()}
                        <br />
                        {user.lastLogin.toLocaleTimeString()}
                      </small>
                    </td>
                    <td>
                      <small className="text-muted">
                        {user.loginCount} logins
                      </small>
                    </td>
                    <td>
                      <Dropdown>
                        <Dropdown.Toggle
                          variant="outline-secondary"
                          size="sm"
                          className="no-caret"
                        >
                          <FontAwesomeIcon icon={faEllipsisV} />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item
                            onClick={() => handleUserAction("view", user)}
                          >
                            <FontAwesomeIcon icon={faEye} className="me-2" />
                            View Details
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => handleUserAction("edit", user)}
                          >
                            <FontAwesomeIcon icon={faEdit} className="me-2" />
                            Edit
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() =>
                              handleUserAction("resetPassword", user)
                            }
                          >
                            <FontAwesomeIcon icon={faKey} className="me-2" />
                            Reset Password
                          </Dropdown.Item>
                          <Dropdown.Divider />
                          {user.isActive ? (
                            <Dropdown.Item
                              onClick={() =>
                                handleUserAction("deactivate", user)
                              }
                              className="text-warning"
                            >
                              <FontAwesomeIcon icon={faBan} className="me-2" />
                              Deactivate
                            </Dropdown.Item>
                          ) : (
                            <Dropdown.Item
                              onClick={() => handleUserAction("activate", user)}
                              className="text-success"
                            >
                              <FontAwesomeIcon
                                icon={faCheck}
                                className="me-2"
                              />
                              Activate
                            </Dropdown.Item>
                          )}
                          <Dropdown.Divider />
                          <Dropdown.Item
                            onClick={() => handleUserAction("delete", user)}
                            className="text-danger"
                          >
                            <FontAwesomeIcon icon={faTrash} className="me-2" />
                            Delete
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card.Footer>
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-muted small">
                Showing {indexOfFirstUser + 1} to{" "}
                {Math.min(indexOfLastUser, filteredUsers.length)} of{" "}
                {filteredUsers.length} entries
              </div>
              <Pagination className="mb-0">
                <Pagination.Prev
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                />
                {[...Array(totalPages)].map((_, index) => (
                  <Pagination.Item
                    key={index + 1}
                    active={index + 1 === currentPage}
                    onClick={() => setCurrentPage(index + 1)}
                  >
                    {index + 1}
                  </Pagination.Item>
                ))}
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
      {filteredUsers.length === 0 && !isLoading && (
        <div className="text-center py-5">
          <FontAwesomeIcon
            icon={faUser}
            size="3x"
            className="text-muted mb-3"
          />
          <h5 className="text-muted">No users found</h5>
          <p className="text-muted">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
