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
  faBuilding,
  faUsers,
  faChartBar,
  faBan,
  faCheck,
  faEllipsisV,
  faDownload,
  faUpload,
  faFilter,
  faSort,
} from "@fortawesome/free-solid-svg-icons";

function CompanyManagement({adminData, currentUser, addToast}) {
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [companiesPerPage] = useState(10);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [modalMode, setModalMode] = useState("view"); // 'view', 'edit', 'create'

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    filterAndSortCompanies();
  }, [companies, searchQuery, statusFilter, sortField, sortDirection]);

  const loadCompanies = async () => {
    try {
      setIsLoading(true);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockCompanies = [
        {
          id: "1",
          businessName: "Tech Solutions Ltd",
          email: "admin@techsolutions.com",
          phoneNumber: "9876543210",
          gstin: "29ABCDE1234F1Z5",
          city: "Mumbai",
          state: "Maharashtra",
          isActive: true,
          subscriptionStatus: "Premium",
          userCount: 15,
          createdAt: new Date("2024-01-15"),
          lastLogin: new Date("2024-06-29"),
          totalRevenue: 125000,
        },
        {
          id: "2",
          businessName: "Retail Hub Pvt Ltd",
          email: "contact@retailhub.com",
          phoneNumber: "8765432109",
          gstin: "27FGHIJ5678K1L2",
          city: "Delhi",
          state: "Delhi",
          isActive: true,
          subscriptionStatus: "Basic",
          userCount: 8,
          createdAt: new Date("2024-02-20"),
          lastLogin: new Date("2024-06-28"),
          totalRevenue: 87500,
        },
        {
          id: "3",
          businessName: "Manufacturing Co",
          email: "info@manufacturing.com",
          phoneNumber: "7654321098",
          gstin: "09MNOPQ9012R3S4",
          city: "Pune",
          state: "Maharashtra",
          isActive: false,
          subscriptionStatus: "Trial",
          userCount: 3,
          createdAt: new Date("2024-03-10"),
          lastLogin: new Date("2024-06-20"),
          totalRevenue: 45000,
        },
      ];

      setCompanies(mockCompanies);
      addToast?.("Companies loaded successfully", "success");
    } catch (error) {
      console.error("Error loading companies:", error);
      addToast?.("Failed to load companies", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortCompanies = () => {
    let filtered = [...companies];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (company) =>
          company.businessName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          company.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          company.phoneNumber.includes(searchQuery) ||
          company.gstin.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((company) => {
        if (statusFilter === "active") return company.isActive;
        if (statusFilter === "inactive") return !company.isActive;
        if (statusFilter === "premium")
          return company.subscriptionStatus === "Premium";
        if (statusFilter === "basic")
          return company.subscriptionStatus === "Basic";
        if (statusFilter === "trial")
          return company.subscriptionStatus === "Trial";
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

    setFilteredCompanies(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleCompanyAction = (action, company) => {
    setSelectedCompany(company);

    switch (action) {
      case "view":
        setModalMode("view");
        setShowCompanyModal(true);
        break;
      case "edit":
        setModalMode("edit");
        setShowCompanyModal(true);
        break;
      case "activate":
        handleToggleStatus(company, true);
        break;
      case "deactivate":
        handleToggleStatus(company, false);
        break;
      case "delete":
        handleDeleteCompany(company);
        break;
      default:
        break;
    }
  };

  const handleToggleStatus = async (company, isActive) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      setCompanies((prev) =>
        prev.map((c) => (c.id === company.id ? {...c, isActive} : c))
      );

      addToast?.(
        `Company ${isActive ? "activated" : "deactivated"} successfully`,
        "success"
      );
    } catch (error) {
      addToast?.("Failed to update company status", "error");
    }
  };

  const handleDeleteCompany = async (company) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${company.businessName}"?`
      )
    ) {
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        setCompanies((prev) => prev.filter((c) => c.id !== company.id));
        addToast?.("Company deleted successfully", "success");
      } catch (error) {
        addToast?.("Failed to delete company", "error");
      }
    }
  };

  const getStatusBadge = (company) => {
    if (!company.isActive) {
      return <Badge bg="danger">Inactive</Badge>;
    }

    switch (company.subscriptionStatus) {
      case "Premium":
        return <Badge bg="success">Premium</Badge>;
      case "Basic":
        return <Badge bg="primary">Basic</Badge>;
      case "Trial":
        return <Badge bg="warning">Trial</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  // Pagination
  const indexOfLastCompany = currentPage * companiesPerPage;
  const indexOfFirstCompany = indexOfLastCompany - companiesPerPage;
  const currentCompanies = filteredCompanies.slice(
    indexOfFirstCompany,
    indexOfLastCompany
  );
  const totalPages = Math.ceil(filteredCompanies.length / companiesPerPage);

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" size="lg" />
        <h5 className="mt-3 text-muted">Loading companies...</h5>
      </div>
    );
  }

  return (
    <div className="company-management">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">Company Management</h4>
          <p className="text-muted mb-0">Manage all companies in the system</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-primary">
            <FontAwesomeIcon icon={faDownload} className="me-2" />
            Export
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setSelectedCompany(null);
              setModalMode("create");
              setShowCompanyModal(true);
            }}
          >
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Add Company
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="align-items-end">
            <Col lg={4} md={6} className="mb-3">
              <Form.Label>Search Companies</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <FontAwesomeIcon icon={faSearch} />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by name, email, phone, or GSTIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col lg={3} md={6} className="mb-3">
              <Form.Label>Status Filter</Form.Label>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Companies</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
                <option value="premium">Premium</option>
                <option value="basic">Basic</option>
                <option value="trial">Trial</option>
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
                <option value="businessName-asc">Name A-Z</option>
                <option value="businessName-desc">Name Z-A</option>
                <option value="userCount-desc">Most Users</option>
                <option value="totalRevenue-desc">Highest Revenue</option>
              </Form.Select>
            </Col>
            <Col lg={2} md={6} className="mb-3">
              <div className="text-muted small">
                Showing {currentCompanies.length} of {filteredCompanies.length}{" "}
                companies
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Companies Table */}
      <Card>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th
                    className="sortable-header"
                    onClick={() => handleSort("businessName")}
                  >
                    Company
                    <FontAwesomeIcon
                      icon={faSort}
                      className="ms-1 opacity-50"
                    />
                  </th>
                  <th>Contact Info</th>
                  <th>Location</th>
                  <th
                    className="sortable-header"
                    onClick={() => handleSort("userCount")}
                  >
                    Users
                    <FontAwesomeIcon
                      icon={faSort}
                      className="ms-1 opacity-50"
                    />
                  </th>
                  <th>Status</th>
                  <th
                    className="sortable-header"
                    onClick={() => handleSort("lastLogin")}
                  >
                    Last Active
                    <FontAwesomeIcon
                      icon={faSort}
                      className="ms-1 opacity-50"
                    />
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentCompanies.map((company) => (
                  <tr key={company.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="company-avatar me-3">
                          <FontAwesomeIcon
                            icon={faBuilding}
                            size="lg"
                            className="text-primary"
                          />
                        </div>
                        <div>
                          <div className="fw-bold">{company.businessName}</div>
                          <small className="text-muted">ID: {company.id}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div>{company.email}</div>
                        <small className="text-muted">
                          {company.phoneNumber}
                        </small>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div>{company.city}</div>
                        <small className="text-muted">{company.state}</small>
                      </div>
                    </td>
                    <td>
                      <Badge bg="info">{company.userCount} users</Badge>
                    </td>
                    <td>{getStatusBadge(company)}</td>
                    <td>
                      <small className="text-muted">
                        {company.lastLogin.toLocaleDateString()}
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
                            onClick={() => handleCompanyAction("view", company)}
                          >
                            <FontAwesomeIcon icon={faEye} className="me-2" />
                            View Details
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => handleCompanyAction("edit", company)}
                          >
                            <FontAwesomeIcon icon={faEdit} className="me-2" />
                            Edit
                          </Dropdown.Item>
                          <Dropdown.Divider />
                          {company.isActive ? (
                            <Dropdown.Item
                              onClick={() =>
                                handleCompanyAction("deactivate", company)
                              }
                              className="text-warning"
                            >
                              <FontAwesomeIcon icon={faBan} className="me-2" />
                              Deactivate
                            </Dropdown.Item>
                          ) : (
                            <Dropdown.Item
                              onClick={() =>
                                handleCompanyAction("activate", company)
                              }
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
                            onClick={() =>
                              handleCompanyAction("delete", company)
                            }
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
                Showing {indexOfFirstCompany + 1} to{" "}
                {Math.min(indexOfLastCompany, filteredCompanies.length)} of{" "}
                {filteredCompanies.length} entries
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
      {filteredCompanies.length === 0 && !isLoading && (
        <div className="text-center py-5">
          <FontAwesomeIcon
            icon={faBuilding}
            size="3x"
            className="text-muted mb-3"
          />
          <h5 className="text-muted">No companies found</h5>
          <p className="text-muted">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}

      {/* Company Modal - We'll create this component next */}
      {/* <CompanyModal 
        show={showCompanyModal}
        onHide={() => setShowCompanyModal(false)}
        company={selectedCompany}
        mode={modalMode}
        onSave={handleCompanySave}
      /> */}
    </div>
  );
}

export default CompanyManagement;
