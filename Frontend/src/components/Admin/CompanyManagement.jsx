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
  faExclamationTriangle,
  faRefresh,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faCalendarAlt,
  faCog,
  faUserCog,
  faKey,
} from "@fortawesome/free-solid-svg-icons";

// Import the company service
import companyService from "../../services/companyService";

function CompanyManagement({adminData, currentUser, addToast}) {
  const navigate = useNavigate();

  // State management
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
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Dropdown state
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({x: 0, y: 0});
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadCompanies();
  }, [currentPage, sortField, sortDirection, statusFilter]);

  useEffect(() => {
    // Apply search filter
    filterCompanies();
  }, [companies, searchQuery]);

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

  const loadCompanies = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call the real API using companyService
      const response = await companyService.getAllCompaniesAdmin({
        page: currentPage,
        limit: companiesPerPage,
        search: searchQuery,
        isActive: statusFilter === "all" ? "" : statusFilter === "active",
        sortBy: sortField,
        sortOrder: sortDirection,
      });

      if (response.success) {
        const companiesData = response.data.companies || [];
        const formattedCompanies = companiesData.map((company) => ({
          id: company._id || company.id,
          businessName: company.businessName || "Unknown Company",
          email: company.email || "No email provided",
          phoneNumber: company.phoneNumber || "No phone provided",
          gstin: company.gstin || "Not provided",
          city: company.city || "Unknown",
          state: company.state || "Unknown",
          isActive: company.isActive !== false,
          subscriptionStatus: getSubscriptionStatus(company),
          userCount: company.totalActiveUsers || 0,
          createdAt: new Date(company.createdAt || Date.now()),
          lastLogin: company.lastActivity
            ? new Date(company.lastActivity)
            : new Date(),
          totalRevenue: company.stats?.totalRevenue || 0,
          ownerInfo: company.ownerInfo || null,
          businessType: company.businessType || "Not specified",
          businessCategory: company.businessCategory || "Not specified",
          address: company.address || "Not provided",
          pincode: company.pincode || "Not provided",
          tehsil: company.tehsil || "Not provided",
          website: company.website || "",
          description: company.description || "",
          establishedYear: company.establishedYear || null,
          logo: company.logo || "",
          signatureImage: company.signatureImage || "",
          // Add all original company data for passing to detail page
          originalData: company,
        }));

        setCompanies(formattedCompanies);
        setTotalCompanies(
          response.data.pagination?.totalItems || formattedCompanies.length
        );

        if (currentPage === 1 && !isRefreshing) {
          addToast?.("Companies loaded successfully", "success");
        }
      } else {
        throw new Error(response.message || "Failed to load companies");
      }
    } catch (error) {
      console.error("Error loading companies:", error);
      const errorMessage = error.message || "Failed to load companies";
      setError(errorMessage);
      addToast?.(errorMessage, "error");

      // Set empty array on error
      setCompanies([]);
      setTotalCompanies(0);
    } finally {
      setIsLoading(false);
    }
  };

  const getSubscriptionStatus = (company) => {
    if (company.subscription) {
      if (company.subscription.plan === "Premium") return "Premium";
      if (company.subscription.plan === "Basic") return "Basic";
      if (company.subscription.isActive) return company.subscription.plan;
    }

    // Fallback logic based on company data
    if (company.hasActiveSubscription) return "Premium";
    if (company.totalActiveUsers > 5) return "Basic";
    return "Trial";
  };

  const filterCompanies = () => {
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
          company.gstin.toLowerCase().includes(searchQuery.toLowerCase()) ||
          company.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          company.state.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCompanies(filtered);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadCompanies();
    setIsRefreshing(false);
  };

  // Navigate to company details page
  const handleViewCompanyDetails = (company, section = "overview") => {
    try {
      // Navigate to the company detail page with state
      navigate(`/admin/companies/${company.id}/${section}`, {
        state: {
          companyData: {
            id: company.id,
            businessName: company.businessName,
            email: company.email,
            phoneNumber: company.phoneNumber,
            gstin: company.gstin,
            city: company.city,
            state: company.state,
            address: company.address,
            pincode: company.pincode,
            isActive: company.isActive,
            businessType: company.businessType,
            businessCategory: company.businessCategory,
            createdAt: company.createdAt,
            lastActivity: company.lastLogin,
            userRole: "admin", // Admin viewing company
            status: company.isActive ? "active" : "inactive",
            planType: company.subscriptionStatus,
            gstNumber: company.gstin,
            website: company.website,
            description: company.description,
            logo: company.logo,
            stats: {
              totalUsers: company.userCount,
              totalRevenue: company.totalRevenue,
              activeSubscription: company.subscriptionStatus,
              lastActivity: company.lastLogin,
            },
            ...company.originalData, // Include all original data
          },
          backTo: "/admin/companies",
          userRole: "admin",
        },
      });

      addToast?.(`Opening ${section} for ${company.businessName}`, "info");
    } catch (error) {
      console.error("Error navigating to company details:", error);
      addToast?.("Failed to open company details", "error");
    }
  };

  // Handle company row click
  const handleCompanyRowClick = (company, event) => {
    // Prevent navigation if clicking on dropdown or action buttons
    if (
      event.target.closest(".dropdown-portal") ||
      event.target.closest(".dropdown-trigger") ||
      event.target.closest("button") ||
      event.target.closest(".btn")
    ) {
      return;
    }

    handleViewCompanyDetails(company, "overview");
  };

  // Handle dropdown toggle
  const handleDropdownToggle = useCallback(
    (companyId, event) => {
      event.stopPropagation();

      if (activeDropdown === companyId) {
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

      setActiveDropdown(companyId);
    },
    [activeDropdown]
  );

  const handleCompanyAction = async (action, company) => {
    setSelectedCompany(company);
    setActiveDropdown(null); // Close dropdown

    switch (action) {
      case "view":
      case "viewOverview":
        handleViewCompanyDetails(company, "overview");
        break;
      case "viewUsers":
        handleViewCompanyDetails(company, "users");
        break;
      case "viewFinance":
        handleViewCompanyDetails(company, "finance");
        break;
      case "viewSettings":
        handleViewCompanyDetails(company, "settings");
        break;
      case "edit":
        setModalMode("edit");
        setShowCompanyModal(true);
        break;
      case "activate":
        await handleToggleStatus(company, true);
        break;
      case "deactivate":
        await handleToggleStatus(company, false);
        break;
      case "resetAccess":
        await handleResetAccess(company);
        break;
      case "delete":
        await handleDeleteCompany(company);
        break;
      default:
        break;
    }
  };

  const handleToggleStatus = async (company, isActive) => {
    try {
      setIsActionLoading(true);
      // Call real API to update company status
      const response = await companyService.toggleCompanyStatus(
        company.id,
        isActive
      );

      if (response.success) {
        // Update local state
        setCompanies((prev) =>
          prev.map((c) => (c.id === company.id ? {...c, isActive} : c))
        );

        addToast?.(
          `Company ${isActive ? "activated" : "deactivated"} successfully`,
          "success"
        );
      } else {
        throw new Error(response.message || "Failed to update company status");
      }
    } catch (error) {
      console.error("Error updating company status:", error);
      addToast?.(error.message || "Failed to update company status", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResetAccess = async (company) => {
    if (
      !window.confirm(
        `Reset access credentials for "${company.businessName}"? This will generate new login details.`
      )
    ) {
      return;
    }

    try {
      setIsActionLoading(true);
      const response = await companyService.resetCompanyAccess(company.id);

      if (response.success) {
        addToast?.("Company access reset successfully", "success");
      } else {
        throw new Error(response.message || "Failed to reset company access");
      }
    } catch (error) {
      console.error("Error resetting company access:", error);
      addToast?.(error.message || "Failed to reset company access", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteCompany = async (company) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${company.businessName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setIsActionLoading(true);
      // Call real API to delete company
      const response = await companyService.deleteCompany(company.id);

      if (response.success) {
        // Remove from local state
        setCompanies((prev) => prev.filter((c) => c.id !== company.id));
        setTotalCompanies((prev) => prev - 1);
        addToast?.("Company deleted successfully", "success");
      } else {
        throw new Error(response.message || "Failed to delete company");
      }
    } catch (error) {
      console.error("Error deleting company:", error);
      addToast?.(error.message || "Failed to delete company", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsRefreshing(true);

      const blob = await companyService.exportAllCompaniesAdmin("csv", {
        isActive: statusFilter === "all" ? "" : statusFilter === "active",
        search: searchQuery,
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `companies_export_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      addToast?.("Companies exported successfully", "success");
    } catch (error) {
      console.error("Error exporting companies:", error);
      addToast?.(error.message || "Failed to export companies", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = (company) => {
    if (!company.isActive) {
      return (
        <Badge bg="danger" className="d-flex align-items-center gap-1">
          <FontAwesomeIcon icon={faBan} size="sm" />
          Inactive
        </Badge>
      );
    }

    switch (company.subscriptionStatus) {
      case "Premium":
        return (
          <Badge bg="success" className="d-flex align-items-center gap-1">
            <FontAwesomeIcon icon={faCheck} size="sm" />
            Premium
          </Badge>
        );
      case "Basic":
        return (
          <Badge bg="primary" className="d-flex align-items-center gap-1">
            <FontAwesomeIcon icon={faUsers} size="sm" />
            Basic
          </Badge>
        );
      case "Trial":
        return (
          <Badge bg="warning" className="d-flex align-items-center gap-1">
            <FontAwesomeIcon icon={faExclamationTriangle} size="sm" />
            Trial
          </Badge>
        );
      default:
        return (
          <Badge bg="secondary" className="d-flex align-items-center gap-1">
            <FontAwesomeIcon icon={faExclamationTriangle} size="sm" />
            Unknown
          </Badge>
        );
    }
  };

  const formatDate = (date) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Custom Portal Dropdown Component
  const PortalDropdown = ({company, isOpen, position}) => {
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
            <FontAwesomeIcon icon={faBuilding} className="me-2 text-primary" />
            Company Overview
          </>
        ),
      },
      {
        type: "item",
        action: "viewUsers",
        content: (
          <>
            <FontAwesomeIcon icon={faUsers} className="me-2 text-info" />
            Users ({company.userCount})
          </>
        ),
      },
      {
        type: "item",
        action: "viewFinance",
        content: (
          <>
            <FontAwesomeIcon icon={faChartBar} className="me-2 text-success" />
            Financial Data
          </>
        ),
      },
      {
        type: "item",
        action: "viewSettings",
        content: (
          <>
            <FontAwesomeIcon icon={faCog} className="me-2 text-secondary" />
            Settings & Config
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
            Edit Company
          </>
        ),
      },
      {
        type: "item",
        action: "resetAccess",
        content: (
          <>
            <FontAwesomeIcon icon={faKey} className="me-2 text-warning" />
            Reset Access
          </>
        ),
      },
      {type: "divider"},
      {
        type: "item",
        action: company.isActive ? "deactivate" : "activate",
        className: company.isActive ? "text-warning" : "text-success",
        content: (
          <>
            <FontAwesomeIcon
              icon={company.isActive ? faBan : faCheck}
              className="me-2"
            />
            {company.isActive ? "Deactivate Company" : "Activate Company"}
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
            Delete Company
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
          minWidth: "220px",
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
                    handleCompanyAction(item.action, company);
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
  const ThreeDotMenu = ({company}) => {
    const isDropdownOpen = activeDropdown === company.id;

    return (
      <div className="dropdown-container">
        <button
          className="dropdown-trigger three-dot-menu"
          onClick={(e) => handleDropdownToggle(company.id, e)}
          disabled={isActionLoading}
        >
          <FontAwesomeIcon icon={faEllipsisV} />
        </button>

        <PortalDropdown
          company={company}
          isOpen={isDropdownOpen}
          position={dropdownPosition}
        />
      </div>
    );
  };

  // Pagination calculations
  const totalPages = Math.ceil(totalCompanies / companiesPerPage);
  const displayedCompanies = searchQuery ? filteredCompanies : companies;

  if (isLoading && companies.length === 0) {
    return (
      <div className="company-management">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" size="lg" />
          <h5 className="mt-3 text-muted">Loading companies...</h5>
          <p className="text-muted">
            Please wait while we fetch company data...
          </p>
        </div>
      </div>
    );
  }

  if (error && companies.length === 0) {
    return (
      <div className="company-management">
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center py-5">
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              size="3x"
              className="text-danger mb-3"
            />
            <h4 className="text-danger">Error Loading Companies</h4>
            <p className="text-muted mb-4">{error}</p>
            <div className="d-flex gap-2 justify-content-center">
              <Button
                variant="primary"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="professional-button"
              >
                <FontAwesomeIcon
                  icon={faRefresh}
                  className={`me-2 ${isRefreshing ? "fa-spin" : ""}`}
                />
                {isRefreshing ? "Retrying..." : "Retry"}
              </Button>
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="company-management">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">
            <FontAwesomeIcon icon={faBuilding} className="me-2 text-primary" />
            Company Management
          </h4>
          <p className="text-muted mb-0">
            Manage all companies in the system ({totalCompanies} total)
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
            onClick={handleExport}
            disabled={isRefreshing}
            className="professional-button"
          >
            <FontAwesomeIcon icon={faDownload} className="me-2" />
            Export CSV
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setSelectedCompany(null);
              setModalMode("create");
              setShowCompanyModal(true);
            }}
            className="professional-button"
          >
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Add Company
          </Button>
        </div>
      </div>

      {/* Show error alert if there's an error but we have some data */}
      {error && companies.length > 0 && (
        <Alert variant="warning" className="mb-4">
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          <strong>Warning:</strong> {error}
        </Alert>
      )}

      {/* Filters and Search */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <Row className="align-items-end">
            <Col lg={4} md={6} className="mb-3">
              <Form.Label className="fw-semibold">Search Companies</Form.Label>
              <InputGroup>
                <InputGroup.Text className="bg-light border-end-0">
                  <FontAwesomeIcon icon={faSearch} className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by name, email, phone, GSTIN, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-start-0"
                />
              </InputGroup>
            </Col>
            <Col lg={3} md={6} className="mb-3">
              <Form.Label className="fw-semibold">Status Filter</Form.Label>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-select-custom"
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
              <Form.Label className="fw-semibold">Sort By</Form.Label>
              <Form.Select
                value={`${sortField}-${sortDirection}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split("-");
                  setSortField(field);
                  setSortDirection(direction);
                }}
                className="form-select-custom"
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
              <div className="text-muted small text-center">
                <div className="fw-bold">{totalCompanies}</div>
                <div>Total Companies</div>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Companies Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {isLoading && (
            <div className="text-center py-3 bg-light">
              <Spinner animation="border" size="sm" className="me-2" />
              <span className="text-muted">Loading companies...</span>
            </div>
          )}

          <div className="table-responsive">
            <Table hover className="mb-0 modern-table">
              <thead className="table-light">
                <tr>
                  <th
                    className="border-0 fw-semibold text-dark sortable-header"
                    onClick={() => handleSort("businessName")}
                    style={{cursor: "pointer"}}
                  >
                    Company
                    <FontAwesomeIcon
                      icon={faSort}
                      className="ms-1 opacity-50"
                    />
                  </th>
                  <th className="border-0 fw-semibold text-dark">
                    Contact Info
                  </th>
                  <th className="border-0 fw-semibold text-dark">Location</th>
                  <th
                    className="border-0 fw-semibold text-dark sortable-header"
                    onClick={() => handleSort("userCount")}
                    style={{cursor: "pointer"}}
                  >
                    Users
                    <FontAwesomeIcon
                      icon={faSort}
                      className="ms-1 opacity-50"
                    />
                  </th>
                  <th className="border-0 fw-semibold text-dark">Status</th>
                  <th
                    className="border-0 fw-semibold text-dark sortable-header"
                    onClick={() => handleSort("createdAt")}
                    style={{cursor: "pointer"}}
                  >
                    Created
                    <FontAwesomeIcon
                      icon={faSort}
                      className="ms-1 opacity-50"
                    />
                  </th>
                  <th className="border-0 fw-semibold text-dark text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedCompanies.map((company) => (
                  <tr
                    key={company.id}
                    onClick={(e) => handleCompanyRowClick(company, e)}
                    className="clickable-row"
                    style={{cursor: "pointer"}}
                  >
                    <td className="py-3">
                      <div className="d-flex align-items-center">
                        <div className="company-avatar me-3">
                          {company.logo ? (
                            <img
                              src={company.logo}
                              alt={company.businessName}
                              className="rounded"
                              style={{
                                width: "40px",
                                height: "40px",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <FontAwesomeIcon
                              icon={faBuilding}
                              size="lg"
                              className="text-primary"
                            />
                          )}
                        </div>
                        <div>
                          <div className="fw-bold company-name-clickable">
                            {company.businessName}
                          </div>
                          <small className="text-muted">
                            {company.businessType} • {company.businessCategory}
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
                            {company.email}
                          </span>
                        </div>
                        <div className="d-flex align-items-center">
                          <FontAwesomeIcon
                            icon={faPhone}
                            className="text-muted me-2"
                            size="sm"
                          />
                          <small className="text-muted">
                            {company.phoneNumber}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="d-flex align-items-center">
                        <FontAwesomeIcon
                          icon={faMapMarkerAlt}
                          className="text-muted me-2"
                          size="sm"
                        />
                        <div>
                          <div>{company.city}</div>
                          <small className="text-muted">{company.state}</small>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge
                        bg="info"
                        className="d-flex align-items-center gap-1"
                      >
                        <FontAwesomeIcon icon={faUsers} size="sm" />
                        {company.userCount} users
                      </Badge>
                    </td>
                    <td className="py-3">{getStatusBadge(company)}</td>
                    <td className="py-3">
                      <div className="d-flex align-items-center">
                        <FontAwesomeIcon
                          icon={faCalendarAlt}
                          className="text-muted me-2"
                          size="sm"
                        />
                        <small className="text-muted">
                          {formatDate(company.createdAt)}
                        </small>
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <ThreeDotMenu company={company} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>

        {/* Pagination */}
        {totalPages > 1 && !searchQuery && (
          <Card.Footer className="bg-light border-0">
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-muted small">
                Page {currentPage} of {totalPages} • Showing {companies.length}{" "}
                of {totalCompanies} companies
              </div>
              <Pagination className="mb-0">
                <Pagination.Prev
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                />
                {[...Array(Math.min(5, totalPages))].map((_, index) => {
                  const pageNum = Math.max(1, currentPage - 2) + index;
                  if (pageNum <= totalPages) {
                    return (
                      <Pagination.Item
                        key={pageNum}
                        active={pageNum === currentPage}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Pagination.Item>
                    );
                  }
                  return null;
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
      {displayedCompanies.length === 0 && !isLoading && (
        <div className="text-center py-5">
          <FontAwesomeIcon
            icon={faBuilding}
            size="3x"
            className="text-muted mb-3"
          />
          <h5 className="text-muted">No companies found</h5>
          <p className="text-muted">
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your search or filter criteria"
              : "No companies have been registered yet"}
          </p>
          {!searchQuery && statusFilter === "all" && (
            <Button
              variant="primary"
              onClick={() => {
                setSelectedCompany(null);
                setModalMode("create");
                setShowCompanyModal(true);
              }}
              className="professional-button"
            >
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              Add First Company
            </Button>
          )}
        </div>
      )}

      <style>{`
        /* Modern Professional Styles */
        .company-management {
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

        .company-name-clickable {
          color: #0d6efd;
          transition: color 0.2s ease;
        }

        .clickable-row:hover .company-name-clickable {
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

        /* Company Avatar */
        .company-avatar {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: linear-gradient(135deg, #e3f2fd 0%, #f8f9fa 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(13, 110, 253, 0.1);
        }

        /* Sortable Headers */
        .sortable-header:hover {
          background: linear-gradient(135deg, #f1f3f4 0%, #e9ecef 100%);
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
          min-width: 220px;
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

          .company-avatar {
            width: 32px;
            height: 32px;
          }

          .professional-button {
            padding: 0.375rem 0.75rem;
            font-size: 0.875rem;
          }

          .dropdown-menu {
            min-width: 200px;
          }

          .d-flex.gap-2 {
            flex-direction: column;
            gap: 0.5rem !important;
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

        /* Prevent text selection on clickable rows */
        .clickable-row {
          user-select: none;
        }
      `}</style>
    </div>
  );
}

export default CompanyManagement;
