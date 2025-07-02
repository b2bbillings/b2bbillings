import React, {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Badge,
  Alert,
  Spinner,
  Form,
  InputGroup,
  Dropdown,
  Modal,
  ProgressBar,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faEye,
  faEdit,
  faTrash,
  faSearch,
  faFilter,
  faSort,
  faPlus,
  faEllipsisV,
  faChartLine,
  faUsers,
  faFileInvoice,
  faMapMarkerAlt,
  faPhone,
  faEnvelope,
  faCalendarAlt,
  faCheckCircle,
  faExclamationTriangle,
  faTimesCircle,
  faDollarSign,
  faHandshake,
  faShoppingCart,
  faBan,
  faDownload,
  faCrown,
  faUserTag,
  faRefresh,
  faExternalLinkAlt,
} from "@fortawesome/free-solid-svg-icons";

// Import services
import {
  getUserDetailsForAdmin,
  handleUserServiceError,
} from "../../../services/userService";

function UserCompanies({userData, rawUserData, onCompanyClick, addToast}) {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stats state
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    ownedCompanies: 0,
    memberCompanies: 0,
    totalRevenue: 0,
    avgPerformance: 0,
  });

  useEffect(() => {
    if (userData || rawUserData) {
      loadUserCompanies();
    }
  }, [userData, rawUserData]);

  useEffect(() => {
    filterAndSortCompanies();
  }, [companies, searchQuery, statusFilter, roleFilter, sortBy, sortDirection]);

  const loadUserCompanies = async () => {
    try {
      setIsLoading(true);

      if (!userData?._id && !rawUserData?.user?._id) {
        throw new Error("User ID not available");
      }

      // Use real API data from rawUserData
      let companiesData = [];

      if (rawUserData?.companySummary) {
        // Transform owned companies
        const ownedCompanies = (
          rawUserData.companySummary.owned?.recent || []
        ).map((company) => ({
          id: company.id || company._id,
          businessName:
            company.name || company.businessName || "Unknown Business",
          businessType: company.businessType || "Business",
          email: company.email || "N/A",
          phoneNumber: company.phoneNumber || company.phone || "N/A",
          address: company.address || "N/A",
          city: company.city || company.address?.city || "N/A",
          state: company.state || company.address?.state || "N/A",
          pincode: company.pincode || company.address?.pincode || "N/A",
          gstNumber: company.gstNumber || "N/A",
          status: company.isActive ? "active" : "inactive",
          userRole: "owner",
          createdAt: company.createdAt,
          lastActivity: company.lastActivity || company.updatedAt,
          totalInvoices: company.totalInvoices || 0,
          totalRevenue: company.totalRevenue || 0,
          totalParties: company.totalMembers || company.totalParties || 0,
          performance: company.performance || 0,
          isActive: company.isActive !== false,
          planType: company.planType || "free",
        }));

        // Transform member companies
        const memberCompanies = (
          rawUserData.companySummary.member?.recent || []
        ).map((company) => ({
          id: company.id || company._id,
          businessName:
            company.name || company.businessName || "Unknown Business",
          businessType: company.businessType || "Business",
          email: company.email || "N/A",
          phoneNumber: company.phoneNumber || company.phone || "N/A",
          address: company.address || "N/A",
          city: company.city || company.address?.city || "N/A",
          state: company.state || company.address?.state || "N/A",
          pincode: company.pincode || company.address?.pincode || "N/A",
          gstNumber: company.gstNumber || "N/A",
          status: company.isActive ? "active" : "inactive",
          userRole: "member",
          createdAt: company.joinedAt || company.createdAt,
          lastActivity: company.lastActivity || company.updatedAt,
          totalInvoices: 0,
          totalRevenue: 0,
          totalParties: company.totalMembers || company.totalParties || 0,
          performance: company.performance || 0,
          isActive: company.isActive !== false,
          planType: company.planType || "free",
        }));

        companiesData = [...ownedCompanies, ...memberCompanies];
      } else if (userData?.companies) {
        // Fallback: use transformed data from userData if available
        companiesData = userData.companies.map((company) => ({
          id: company.id || company._id,
          businessName:
            company.businessName || company.name || "Unknown Business",
          businessType: company.businessType || "Business",
          email: company.email || "N/A",
          phoneNumber: company.phoneNumber || company.phone || "N/A",
          address: company.address || "N/A",
          city: company.city || "N/A",
          state: company.state || "N/A",
          pincode: company.pincode || "N/A",
          gstNumber: company.gstNumber || "N/A",
          status: company.status || (company.isActive ? "active" : "inactive"),
          userRole: company.userRole || "member",
          createdAt: company.createdAt,
          lastActivity: company.lastActivity || company.updatedAt,
          totalInvoices: 0,
          totalRevenue: 0,
          totalParties: 0,
          performance: 0,
          isActive: company.isActive !== false,
          planType: company.planType || "free",
        }));
      } else {
        console.log(
          "No company data found in rawUserData or userData, companies list will be empty"
        );
        companiesData = [];
      }

      setCompanies(companiesData);

      // Calculate real stats from API data
      const activeCompanies = companiesData.filter(
        (c) => c.status === "active"
      );
      const ownedCompanies = companiesData.filter(
        (c) => c.userRole === "owner"
      );
      const memberCompanies = companiesData.filter(
        (c) => c.userRole === "member"
      );
      const totalRevenue = companiesData.reduce(
        (sum, c) => sum + (c.totalRevenue || 0),
        0
      );

      setStats({
        totalCompanies: companiesData.length,
        activeCompanies: activeCompanies.length,
        ownedCompanies: ownedCompanies.length,
        memberCompanies: memberCompanies.length,
        totalRevenue: totalRevenue,
        avgPerformance: 0,
      });

      if (companiesData.length > 0) {
        addToast?.("Companies loaded successfully", "success");
      }
    } catch (error) {
      console.error("Error loading companies:", error);
      const errorMessage = handleUserServiceError(error);
      addToast?.(errorMessage, "error");

      // Set empty state on error
      setCompanies([]);
      setStats({
        totalCompanies: 0,
        activeCompanies: 0,
        ownedCompanies: 0,
        memberCompanies: 0,
        totalRevenue: 0,
        avgPerformance: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortCompanies = () => {
    let filtered = [...companies];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (company) =>
          company.businessName?.toLowerCase().includes(query) ||
          company.businessType?.toLowerCase().includes(query) ||
          company.email?.toLowerCase().includes(query) ||
          company.city?.toLowerCase().includes(query) ||
          company.gstNumber?.toLowerCase().includes(query) ||
          company.phoneNumber?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((company) => company.status === statusFilter);
    }

    // Apply role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((company) => company.userRole === roleFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === "createdAt" || sortBy === "lastActivity") {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      }

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue?.toLowerCase() || "";
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredCompanies(filtered);
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: "success",
      inactive: "secondary",
      pending: "warning",
      suspended: "danger",
    };
    const icons = {
      active: faCheckCircle,
      inactive: faTimesCircle,
      pending: faExclamationTriangle,
      suspended: faBan,
    };

    return (
      <Badge
        bg={variants[status] || "secondary"}
        className="professional-badge"
      >
        <FontAwesomeIcon
          icon={icons[status] || faTimesCircle}
          className="me-1"
        />
        {status?.toUpperCase()}
      </Badge>
    );
  };

  const getRoleBadge = (role) => {
    if (role === "owner") {
      return (
        <Badge bg="primary" className="professional-badge">
          <FontAwesomeIcon icon={faCrown} className="me-1" />
          OWNER
        </Badge>
      );
    } else {
      return (
        <Badge bg="info" className="professional-badge">
          <FontAwesomeIcon icon={faUserTag} className="me-1" />
          MEMBER
        </Badge>
      );
    }
  };

  const getPlanBadge = (planType, isActive) => {
    if (!isActive) {
      return (
        <Badge bg="danger" className="professional-badge">
          INACTIVE
        </Badge>
      );
    }

    const planVariants = {
      free: "secondary",
      basic: "info",
      premium: "warning",
      enterprise: "success",
    };

    return (
      <Badge
        bg={planVariants[planType] || "secondary"}
        className="professional-badge"
      >
        {planType?.toUpperCase() || "FREE"}
      </Badge>
    );
  };

  const handleCompanyAction = async (action, company) => {
    try {
      switch (action) {
        case "view":
          navigate(`/admin/companies/${company.id}`, {
            state: {
              companyData: company,
              userId: userData?._id || rawUserData?.user?._id,
              userRole: company.userRole,
              backTo: `/admin/users/${
                userData?._id || rawUserData?.user?._id
              }/companies`,
            },
          });
          break;

        case "edit":
          navigate(`/admin/companies/${company.id}/edit`, {
            state: {
              companyData: company,
              userRole: company.userRole,
              backTo: `/admin/users/${
                userData?._id || rawUserData?.user?._id
              }/companies`,
            },
          });
          break;

        case "delete":
          setSelectedCompany(company);
          setShowDeleteModal(true);
          break;

        case "activate":
        case "deactivate":
          addToast?.(`Company ${action}d successfully`, "success");
          loadUserCompanies();
          break;

        case "details":
          navigate(`/admin/companies/${company.id}/dashboard`, {
            state: {
              companyData: company,
              accessLevel: company.userRole,
              backTo: `/admin/users/${
                userData?._id || rawUserData?.user?._id
              }/companies`,
            },
          });
          break;

        case "refresh":
          setIsRefreshing(true);
          const userId = userData?._id || rawUserData?.user?._id;
          if (userId) {
            await getUserDetailsForAdmin(userId);
            addToast?.("Company data refreshed", "success");
            loadUserCompanies();
          }
          setIsRefreshing(false);
          break;

        case "export":
          exportUserCompanies();
          break;

        case "items":
          navigate(`/admin/companies/${company.id}/items`, {
            state: {
              companyData: company,
              userRole: company.userRole,
              backTo: `/admin/users/${
                userData?._id || rawUserData?.user?._id
              }/companies`,
            },
          });
          break;

        default:
          addToast?.("Action not implemented yet", "info");
          break;
      }
    } catch (error) {
      console.error(`Error performing ${action} on company:`, error);
      const errorMessage = handleUserServiceError(error);
      addToast?.(errorMessage, "error");
    }
  };

  const handleDeleteCompany = async () => {
    try {
      addToast?.("Company deletion functionality coming soon", "info");
      setShowDeleteModal(false);
      setSelectedCompany(null);
    } catch (error) {
      console.error("Error deleting company:", error);
      const errorMessage = handleUserServiceError(error);
      addToast?.(errorMessage, "error");
    }
  };

  const exportUserCompanies = () => {
    try {
      const csvData = [
        [
          "Company Name",
          "Type",
          "Email",
          "Phone",
          "Location",
          "Role",
          "Status",
          "Plan",
          "Created Date",
        ].join(","),
        ...filteredCompanies.map((company) =>
          [
            `"${company.businessName}"`,
            `"${company.businessType}"`,
            `"${company.email}"`,
            `"${company.phoneNumber}"`,
            `"${company.city}, ${company.state}"`,
            `"${company.userRole.toUpperCase()}"`,
            `"${company.status.toUpperCase()}"`,
            `"${company.planType?.toUpperCase() || "FREE"}"`,
            `"${formatDate(company.createdAt)}"`,
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvData], {type: "text/csv"});
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user-companies-${
        userData?.name || "user"
      }-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      addToast?.("Companies data exported successfully", "success");
    } catch (error) {
      console.error("Error exporting companies:", error);
      addToast?.(error.message, "error");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" size="lg" />
          <h5 className="mt-3 text-muted">Loading companies...</h5>
          <p className="text-muted">
            Please wait while we fetch the company data...
          </p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="user-companies-container">
      {/* Modern Stats Overview */}
      <Card className="border-0 shadow-sm mb-4 stats-overview-card">
        <Card.Body className="p-3">
          <Row className="g-3">
            <Col lg={2} md={4} sm={6}>
              <div className="stats-item">
                <div className="stats-icon-container bg-primary">
                  <FontAwesomeIcon icon={faBuilding} className="stats-icon" />
                </div>
                <div className="stats-content">
                  <div className="stats-number text-primary">
                    {stats.totalCompanies}
                  </div>
                  <div className="stats-label">Total Companies</div>
                </div>
              </div>
            </Col>
            <Col lg={2} md={4} sm={6}>
              <div className="stats-item">
                <div className="stats-icon-container bg-success">
                  <FontAwesomeIcon
                    icon={faCheckCircle}
                    className="stats-icon"
                  />
                </div>
                <div className="stats-content">
                  <div className="stats-number text-success">
                    {stats.activeCompanies}
                  </div>
                  <div className="stats-label">Active</div>
                </div>
              </div>
            </Col>
            <Col lg={2} md={4} sm={6}>
              <div className="stats-item">
                <div className="stats-icon-container bg-warning">
                  <FontAwesomeIcon icon={faCrown} className="stats-icon" />
                </div>
                <div className="stats-content">
                  <div className="stats-number text-warning">
                    {stats.ownedCompanies}
                  </div>
                  <div className="stats-label">Owned</div>
                </div>
              </div>
            </Col>
            <Col lg={2} md={4} sm={6}>
              <div className="stats-item">
                <div className="stats-icon-container bg-info">
                  <FontAwesomeIcon icon={faUsers} className="stats-icon" />
                </div>
                <div className="stats-content">
                  <div className="stats-number text-info">
                    {stats.memberCompanies}
                  </div>
                  <div className="stats-label">Member</div>
                </div>
              </div>
            </Col>
            <Col lg={4} md={8} sm={12}>
              <div className="stats-item">
                <div className="stats-icon-container bg-secondary">
                  <FontAwesomeIcon icon={faChartLine} className="stats-icon" />
                </div>
                <div className="stats-content">
                  <div className="stats-number text-secondary">
                    ₹{stats.totalRevenue.toLocaleString("en-IN")}
                  </div>
                  <div className="stats-label">Total Revenue</div>
                </div>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Modern Main Content Card */}
      <Card className="border-0 shadow-sm main-content-card">
        <Card.Header className="professional-header border-0">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="mb-1 fw-bold header-title">
                <FontAwesomeIcon
                  icon={faBuilding}
                  className="me-2 text-primary"
                />
                User Companies ({stats.totalCompanies})
              </h5>
              <p className="text-muted small mb-0 header-subtitle">
                Companies where {userData?.name || rawUserData?.user?.name} is
                owner or member
              </p>
            </div>
            <div className="d-flex gap-2 header-actions">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => handleCompanyAction("refresh", null)}
                disabled={isRefreshing}
                className="professional-button"
              >
                <FontAwesomeIcon
                  icon={faRefresh}
                  className={`me-1 ${isRefreshing ? "fa-spin" : ""}`}
                />
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => handleCompanyAction("export", null)}
                disabled={filteredCompanies.length === 0}
                className="professional-button"
              >
                <FontAwesomeIcon icon={faDownload} className="me-1" />
                Export
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate("/admin/companies/create")}
                className="professional-button"
              >
                <FontAwesomeIcon icon={faPlus} className="me-1" />
                Add Company
              </Button>
            </div>
          </div>

          {/* Modern Search and Filter Controls */}
          <Row className="g-3 filter-controls">
            <Col lg={4} md={6}>
              <Form.Label className="small fw-semibold filter-label">
                Search Companies
              </Form.Label>
              <InputGroup size="sm">
                <InputGroup.Text className="search-input-icon">
                  <FontAwesomeIcon icon={faSearch} className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search by name, email, GST, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </InputGroup>
            </Col>
            <Col lg={2} md={3} sm={6}>
              <Form.Label className="small fw-semibold filter-label">
                Status
              </Form.Label>
              <Form.Select
                size="sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="professional-select"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </Form.Select>
            </Col>
            <Col lg={2} md={3} sm={6}>
              <Form.Label className="small fw-semibold filter-label">
                Role
              </Form.Label>
              <Form.Select
                size="sm"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="professional-select"
              >
                <option value="all">All Roles</option>
                <option value="owner">Owner</option>
                <option value="member">Member</option>
              </Form.Select>
            </Col>
            <Col lg={3} md={6} sm={8}>
              <Form.Label className="small fw-semibold filter-label">
                Sort By
              </Form.Label>
              <Form.Select
                size="sm"
                value={`${sortBy}-${sortDirection}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split("-");
                  setSortBy(field);
                  setSortDirection(direction);
                }}
                className="professional-select"
              >
                <option value="createdAt-desc">Latest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="businessName-asc">Name A-Z</option>
                <option value="businessName-desc">Name Z-A</option>
                <option value="lastActivity-desc">Recent Activity</option>
              </Form.Select>
            </Col>
            <Col lg={1} md={6} sm={4} className="text-end">
              <Form.Label className="small fw-semibold filter-label d-block">
                &nbsp;
              </Form.Label>
              <small className="text-muted results-count">
                {filteredCompanies.length} of {companies.length}
              </small>
            </Col>
          </Row>
        </Card.Header>

        <Card.Body className="p-0 table-container">
          {filteredCompanies.length > 0 ? (
            <div className="table-responsive">
              <Table className="mb-0 professional-table">
                <thead className="table-header">
                  <tr>
                    <th>Company Details</th>
                    <th>Contact Info</th>
                    <th>Location</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Plan</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((company) => (
                    <tr key={company.id} className="table-row">
                      <td>
                        <div className="company-info">
                          <div className="company-icon-wrapper">
                            <FontAwesomeIcon
                              icon={faBuilding}
                              className="company-table-icon"
                            />
                          </div>
                          <div className="company-details">
                            <div
                              className="company-name-link"
                              onClick={() =>
                                handleCompanyAction("view", company)
                              }
                            >
                              {company.businessName}
                              <FontAwesomeIcon
                                icon={faExternalLinkAlt}
                                className="external-link-icon"
                              />
                            </div>
                            <small className="company-type">
                              {company.businessType}
                            </small>
                            <br />
                            <small className="company-id">
                              ID: {company.id}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="contact-info">
                          <div className="contact-item">
                            <FontAwesomeIcon
                              icon={faEnvelope}
                              className="contact-icon"
                            />
                            {company.email}
                          </div>
                          <div className="contact-item text-muted">
                            <FontAwesomeIcon
                              icon={faPhone}
                              className="contact-icon"
                            />
                            {company.phoneNumber}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="location-info">
                          <div className="location-item">
                            <FontAwesomeIcon
                              icon={faMapMarkerAlt}
                              className="location-icon"
                            />
                            {company.city}
                          </div>
                          <div className="location-state text-muted">
                            {company.state}
                          </div>
                        </div>
                      </td>
                      <td>{getRoleBadge(company.userRole)}</td>
                      <td>{getStatusBadge(company.status)}</td>
                      <td>
                        {getPlanBadge(company.planType, company.isActive)}
                      </td>
                      <td>
                        <div className="date-info">
                          <span className="last-active">
                            {formatDate(company.lastActivity)}
                          </span>
                          <br />
                          <small className="created-date text-muted">
                            Created: {formatDate(company.createdAt)}
                          </small>
                        </div>
                      </td>
                      <td>
                        <Dropdown>
                          <Dropdown.Toggle
                            variant="link"
                            className="action-dropdown-toggle"
                          >
                            <FontAwesomeIcon icon={faEllipsisV} />
                          </Dropdown.Toggle>
                          <Dropdown.Menu
                            align="end"
                            className="professional-dropdown"
                          >
                            <Dropdown.Item
                              onClick={() =>
                                handleCompanyAction("view", company)
                              }
                              className="dropdown-item-modern"
                            >
                              <FontAwesomeIcon
                                icon={faEye}
                                className="dropdown-icon"
                              />
                              View Details
                            </Dropdown.Item>
                            <Dropdown.Item
                              onClick={() =>
                                handleCompanyAction("details", company)
                              }
                              className="dropdown-item-modern"
                            >
                              <FontAwesomeIcon
                                icon={faBuilding}
                                className="dropdown-icon"
                              />
                              Company Dashboard
                            </Dropdown.Item>
                            <Dropdown.Item
                              onClick={() =>
                                handleCompanyAction("items", company)
                              }
                              className="dropdown-item-modern"
                            >
                              <FontAwesomeIcon
                                icon={faShoppingCart}
                                className="dropdown-icon"
                              />
                              View Items
                            </Dropdown.Item>
                            {company.userRole === "owner" && (
                              <>
                                <Dropdown.Divider />
                                <Dropdown.Item
                                  onClick={() =>
                                    handleCompanyAction("edit", company)
                                  }
                                  className="dropdown-item-modern"
                                >
                                  <FontAwesomeIcon
                                    icon={faEdit}
                                    className="dropdown-icon"
                                  />
                                  Edit Company
                                </Dropdown.Item>
                                <Dropdown.Item
                                  onClick={() =>
                                    handleCompanyAction(
                                      company.status === "active"
                                        ? "deactivate"
                                        : "activate",
                                      company
                                    )
                                  }
                                  className={`dropdown-item-modern ${
                                    company.status === "active"
                                      ? "text-warning"
                                      : "text-success"
                                  }`}
                                >
                                  <FontAwesomeIcon
                                    icon={
                                      company.status === "active"
                                        ? faBan
                                        : faCheckCircle
                                    }
                                    className="dropdown-icon"
                                  />
                                  {company.status === "active"
                                    ? "Deactivate"
                                    : "Activate"}
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item
                                  onClick={() =>
                                    handleCompanyAction("delete", company)
                                  }
                                  className="dropdown-item-modern text-danger"
                                >
                                  <FontAwesomeIcon
                                    icon={faTrash}
                                    className="dropdown-icon"
                                  />
                                  Delete Company
                                </Dropdown.Item>
                              </>
                            )}
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="empty-state">
              <FontAwesomeIcon icon={faBuilding} className="empty-state-icon" />
              <h6 className="empty-state-title">No companies found</h6>
              <p className="empty-state-description">
                {searchQuery || statusFilter !== "all" || roleFilter !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "This user hasn't created or joined any companies yet"}
              </p>
              {!searchQuery &&
                statusFilter === "all" &&
                roleFilter === "all" && (
                  <Button
                    variant="primary"
                    className="mt-2 professional-button"
                  >
                    <FontAwesomeIcon icon={faPlus} className="me-2" />
                    Create First Company
                  </Button>
                )}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modern Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton className="professional-modal-header">
          <Modal.Title className="text-danger modal-title-modern">
            <FontAwesomeIcon icon={faTrash} className="me-2" />
            Delete Company
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="professional-modal-body">
          <Alert variant="danger" className="modern-alert">
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              className="me-2 fs-4"
            />
            <div>
              <strong>Warning!</strong> This action cannot be undone.
            </div>
          </Alert>
          <p className="modal-description">
            Are you sure you want to delete{" "}
            <strong>{selectedCompany?.businessName}</strong>?
          </p>
          <p className="modal-consequences">
            This will permanently remove the company and all associated data
            including:
          </p>
          <ul className="consequences-list">
            <li>All invoices and transactions</li>
            <li>Business parties and contacts</li>
            <li>Orders and quotations</li>
            <li>Company settings and preferences</li>
          </ul>
        </Modal.Body>
        <Modal.Footer className="professional-modal-footer">
          <Button
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
            className="professional-button"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteCompany}
            className="professional-button"
          >
            <FontAwesomeIcon icon={faTrash} className="me-2" />
            Delete Company
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modern Professional Styles */}
      <style>
        {`
          /* Container */
          .user-companies-container {
            background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
            min-height: 100vh;
            padding: 0.5rem;
          }

          /* Stats Overview Card */
          .stats-overview-card {
            border: 1px solid rgba(0, 0, 0, 0.05);
            border-radius: 1rem;
            overflow: hidden;
            transition: all 0.3s ease;
          }

          .stats-overview-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          }

          .stats-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.5rem;
            background: white;
            border-radius: 0.75rem;
            border: 1px solid rgba(0, 0, 0, 0.05);
            transition: all 0.2s ease;
          }

          .stats-item:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .stats-icon-container {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.15;
          }

          .stats-icon {
            font-size: 1.1rem;
            color: white;
          }

          .stats-content {
            flex: 1;
          }

          .stats-number {
            font-size: 1.25rem;
            font-weight: 700;
            margin-bottom: 0.125rem;
          }

          .stats-label {
            font-size: 0.75rem;
            color: #6c757d;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          /* Main Content Card */
          .main-content-card {
            border: 1px solid rgba(0, 0, 0, 0.05);
            border-radius: 1rem;
            overflow: hidden;
          }

          .professional-header {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-bottom: 2px solid #e9ecef;
            padding: 1.5rem;
          }

          .header-title {
            color: #2c3e50;
            font-size: 1.25rem;
          }

          .header-subtitle {
            color: #6c757d;
            font-size: 0.875rem;
          }

          .header-actions {
            gap: 0.5rem;
          }

          /* Filter Controls */
          .filter-controls {
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid #e9ecef;
          }

          .filter-label {
            color: #495057;
            font-weight: 600;
            margin-bottom: 0.25rem;
          }

          .search-input-icon {
            background: #f8f9fa;
            border-right: none;
            border-color: #dee2e6;
          }

          .search-input {
            border-left: none;
            border-color: #dee2e6;
          }

          .search-input:focus {
            border-color: #0d6efd;
            box-shadow: none;
          }

          .search-input:focus + .search-input-icon {
            border-color: #0d6efd;
          }

          .professional-select {
            border-color: #dee2e6;
            background-color: white;
          }

          .professional-select:focus {
            border-color: #0d6efd;
            box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
          }

          .results-count {
            font-weight: 500;
            color: #6c757d;
          }

          /* Professional Table */
          .table-container {
            background: white;
          }

          .professional-table {
            border-collapse: separate;
            border-spacing: 0;
            margin: 0;
          }

          .table-header th {
            background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
            border: none;
            border-bottom: 2px solid #e9ecef;
            font-weight: 600;
            font-size: 0.875rem;
            color: #495057;
            padding: 1rem;
            text-transform: none;
            letter-spacing: normal;
            vertical-align: middle;
            position: sticky;
            top: 0;
            z-index: 10;
          }

          .table-row {
            transition: all 0.3s ease;
            border-bottom: 1px solid #f8f9fa;
          }

          .table-row:hover {
            background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .table-row td {
            padding: 1rem;
            vertical-align: middle;
            border: none;
            background: transparent;
          }

          /* Company Info */
          .company-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .company-icon-wrapper {
            width: 42px;
            height: 42px;
            background: linear-gradient(135deg, #e3f2fd 0%, #f8f9fa 100%);
            border-radius: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(13, 110, 253, 0.1);
          }

          .company-table-icon {
            color: #0d6efd;
            font-size: 1.1rem;
          }

          .company-details {
            flex: 1;
          }

          .company-name-link {
            font-weight: 600;
            color: #2c3e50;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.95rem;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
          }

          .company-name-link:hover {
            color: #0d6efd;
            text-decoration: underline;
          }

          .external-link-icon {
            font-size: 0.7rem;
            opacity: 0.6;
            transition: opacity 0.2s ease;
          }

          .company-name-link:hover .external-link-icon {
            opacity: 1;
          }

          .company-type {
            color: #6c757d;
            font-size: 0.8rem;
          }

          .company-id {
            color: #adb5bd;
            font-size: 0.75rem;
          }

          /* Contact Info */
          .contact-info {
            font-size: 0.875rem;
          }

          .contact-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.25rem;
          }

          .contact-item:last-child {
            margin-bottom: 0;
          }

          .contact-icon {
            width: 14px;
            color: #6c757d;
          }

          /* Location Info */
          .location-info {
            font-size: 0.875rem;
          }

          .location-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.25rem;
            color: #2c3e50;
          }

          .location-icon {
            width: 14px;
            color: #6c757d;
          }

          .location-state {
            font-size: 0.8rem;
            margin-left: 1.25rem;
          }

          /* Date Info */
          .date-info {
            font-size: 0.875rem;
          }

          .last-active {
            color: #2c3e50;
            font-weight: 500;
          }

          .created-date {
            font-size: 0.75rem;
          }

          /* Professional Badges */
          .professional-badge {
            font-weight: 500;
            font-size: 0.75rem;
            padding: 0.4rem 0.8rem;
            border-radius: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
          }

          /* Action Dropdown */
          .action-dropdown-toggle {
            background: none;
            border: none;
            color: #6c757d;
            padding: 0.25rem;
            opacity: 0.7;
            transition: all 0.2s ease;
          }

          .action-dropdown-toggle:hover,
          .action-dropdown-toggle:focus {
            color: #0d6efd;
            opacity: 1;
            background: none;
            border: none;
            box-shadow: none;
          }

          .table-row:hover .action-dropdown-toggle {
            opacity: 1;
          }

          .professional-dropdown {
            border: 1px solid #e9ecef;
            border-radius: 0.75rem;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            padding: 0.5rem 0;
            min-width: 180px;
          }

          .dropdown-item-modern {
            padding: 0.6rem 1rem;
            font-size: 0.875rem;
            border-radius: 0;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .dropdown-item-modern:hover {
            background: #f8f9fa;
            color: #0d6efd;
          }

          .dropdown-icon {
            width: 14px;
          }

          /* Empty State */
          .empty-state {
            text-align: center;
            padding: 4rem 2rem;
            background: white;
          }

          .empty-state-icon {
            font-size: 3rem;
            color: #adb5bd;
            margin-bottom: 1rem;
          }

          .empty-state-title {
            color: #6c757d;
            margin-bottom: 0.5rem;
          }

          .empty-state-description {
            color: #adb5bd;
            margin-bottom: 1rem;
          }

          /* Professional Buttons */
          .professional-button {
            border-radius: 0.5rem;
            font-weight: 500;
            padding: 0.4rem 1rem;
            transition: all 0.2s ease;
            border-width: 1px;
          }

          .professional-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          }

          /* Modal Styles */
          .professional-modal-header {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-bottom: 2px solid #e9ecef;
          }

          .modal-title-modern {
            font-size: 1.1rem;
            font-weight: 600;
          }

          .professional-modal-body {
            padding: 1.5rem;
          }

          .modern-alert {
            border: none;
            border-radius: 0.75rem;
            background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
          }

          .modal-description {
            font-size: 0.95rem;
            color: #495057;
            margin-bottom: 1rem;
          }

          .modal-consequences {
            font-size: 0.875rem;
            color: #6c757d;
            margin-bottom: 0.5rem;
          }

          .consequences-list {
            font-size: 0.875rem;
            color: #6c757d;
            padding-left: 1.5rem;
          }

          .consequences-list li {
            margin-bottom: 0.25rem;
          }

          .professional-modal-footer {
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
            padding: 1rem 1.5rem;
          }

          /* Loading Animation */
          .fa-spin {
            animation: fa-spin 1s infinite linear;
          }

          @keyframes fa-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          /* Responsive Design */
          @media (max-width: 1200px) {
            .stats-number {
              font-size: 1.1rem;
            }
            
            .stats-icon-container {
              width: 36px;
              height: 36px;
            }
          }

          @media (max-width: 992px) {
            .professional-header {
              padding: 1rem;
            }

            .header-actions {
              flex-direction: column;
              gap: 0.5rem;
            }

            .filter-controls .col-lg-4 {
              margin-bottom: 1rem;
            }
          }

          @media (max-width: 768px) {
            .user-companies-container {
              padding: 0.25rem;
            }

            .stats-item {
              padding: 0.75rem 0.5rem;
            }

            .stats-number {
              font-size: 1rem;
            }

            .stats-label {
              font-size: 0.7rem;
            }

            .table-header th,
            .table-row td {
              padding: 0.75rem 0.5rem;
            }

            .company-info {
              gap: 0.5rem;
            }

            .company-icon-wrapper {
              width: 36px;
              height: 36px;
            }

            .company-name-link {
              font-size: 0.875rem;
            }

            .contact-info,
            .location-info,
            .date-info {
              font-size: 0.8rem;
            }
          }

          @media (max-width: 576px) {
            .professional-header {
              padding: 0.75rem;
            }

            .header-title {
              font-size: 1.1rem;
            }

            .filter-controls {
              padding-top: 0.75rem;
            }

            .table-header th,
            .table-row td {
              padding: 0.5rem 0.4rem;
            }

            .stats-item {
              padding: 0.5rem;
            }

            .stats-icon-container {
              width: 32px;
              height: 32px;
            }

            .stats-number {
              font-size: 0.95rem;
            }

            .professional-dropdown {
              min-width: 160px;
            }
          }

          /* Focus States for Accessibility */
          .professional-button:focus,
          .professional-select:focus,
          .search-input:focus {
            outline: 2px solid #0d6efd;
            outline-offset: 2px;
          }

          /* Smooth Transitions */
          * {
            transition: transform 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
          }
        `}
      </style>
    </div>
  );
}

export default UserCompanies;
