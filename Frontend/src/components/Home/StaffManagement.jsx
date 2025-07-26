import React, {useState, useEffect} from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  InputGroup,
  Alert,
  Spinner,
  Badge,
  Tab,
  Tabs,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faSearch,
  faUserTie,
  faRefresh,
  faUsers,
  faExclamationTriangle,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import {useParams, useLocation, useNavigate} from "react-router-dom";

// ✅ Import Components
import AddStaffModal from "./Staff/AddStaffModal";
import StaffTable from "./Staff/StaffTable";

// ✅ Import Services
import staffService from "../../services/staffService";

// ✅ Import Styles
import "./StaffManagement.css";

function StaffManagement({
  companyData,
  userData,
  addToast,
  currentCompany,
  currentUser,
  companyId: propCompanyId,
  onNavigate,
  isOnline = true,
}) {
  // ✅ Router Hooks
  const {companyId: routeCompanyId} = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Company ID Resolution
  const effectiveCompanyId =
    routeCompanyId ||
    propCompanyId ||
    currentCompany?.id ||
    currentCompany?._id ||
    companyData?.id ||
    companyData?._id;

  // ✅ State Management
  const [staff, setStaff] = useState([]);
  const [deletedStaff, setDeletedStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [editMode, setEditMode] = useState(false);

  // ✅ Tab State for Active/Deleted Staff
  const [activeTab, setActiveTab] = useState("active");

  // ✅ Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");

  // ✅ Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStaff, setTotalStaff] = useState(0);
  const [itemsPerPage] = useState(10);

  // ✅ Deleted Staff Pagination
  const [deletedCurrentPage, setDeletedCurrentPage] = useState(1);
  const [deletedTotalPages, setDeletedTotalPages] = useState(1);
  const [deletedTotalStaff, setDeletedTotalStaff] = useState(0);

  // ✅ Fetch Active Staff Data
  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!effectiveCompanyId) {
        setError("No company selected. Please select a company to view staff.");
        setLoading(false);
        return;
      }

      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        role: filterRole !== "all" ? filterRole : undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
        sortBy: sortField,
        sortOrder: sortDirection,
        companyId: effectiveCompanyId,
      };

      // Remove undefined values
      Object.keys(params).forEach(
        (key) => params[key] === undefined && delete params[key]
      );

      const response = await staffService.getAllStaff(params);

      if (response && response.success) {
        const apiData = response.data;
        let staffArray = [];
        let totalCount = 0;
        let totalPages = 1;

        if (apiData) {
          if (apiData.data && Array.isArray(apiData.data)) {
            staffArray = apiData.data;
            totalCount = apiData.pagination?.totalCount || staffArray.length;
            totalPages = apiData.pagination?.totalPages || 1;
          } else if (apiData.staff && Array.isArray(apiData.staff)) {
            staffArray = apiData.staff;
            totalCount = apiData.total || staffArray.length;
            totalPages = apiData.totalPages || 1;
          } else if (Array.isArray(apiData)) {
            staffArray = apiData;
            totalCount = staffArray.length;
            totalPages = 1;
          }
        }

        setStaff(staffArray);
        setTotalPages(totalPages);
        setTotalStaff(totalCount);
      } else {
        setError(response?.message || "Failed to fetch staff data");
      }
    } catch (apiError) {
      if (
        apiError.response?.status === 403 ||
        apiError.response?.status === 401
      ) {
        setError(
          "Access denied. You don't have permission to view staff data."
        );
      } else if (apiError.response?.status === 404) {
        setError("Staff service not found. Please contact your administrator.");
      } else if (apiError.response?.status >= 500) {
        setError("Server error. Please try again later.");
      } else if (apiError.name === "NetworkError" || !navigator.onLine) {
        setError(
          "Network connection issue. Please check your internet connection."
        );
      } else {
        setError(apiError.message || "Failed to fetch staff data");
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch Deleted Staff Data
  const fetchDeletedStaff = async () => {
    try {
      setDeletedLoading(true);

      if (!effectiveCompanyId) {
        setDeletedLoading(false);
        return;
      }

      const params = {
        page: deletedCurrentPage,
        limit: itemsPerPage,
        search: searchQuery,
        sortBy: "deletedAt",
        sortOrder: "desc",
      };

      const response = await staffService.getDeletedStaff(params);

      if (response && response.success) {
        const apiData = response.data;
        let staffArray = [];
        let totalCount = 0;
        let totalPages = 1;

        if (apiData) {
          if (apiData.data && Array.isArray(apiData.data)) {
            staffArray = apiData.data;
            totalCount = apiData.pagination?.totalCount || staffArray.length;
            totalPages = apiData.pagination?.totalPages || 1;
          } else if (Array.isArray(apiData)) {
            staffArray = apiData;
            totalCount = staffArray.length;
            totalPages = 1;
          }
        }

        setDeletedStaff(staffArray);
        setDeletedTotalPages(totalPages);
        setDeletedTotalStaff(totalCount);
      }
    } catch (error) {
      console.error("Error fetching deleted staff:", error);
      addToast?.("Error fetching deleted staff: " + error.message, "error");
    } finally {
      setDeletedLoading(false);
    }
  };

  // ✅ Effects
  useEffect(() => {
    if (effectiveCompanyId) {
      if (activeTab === "active") {
        fetchStaff();
      } else if (activeTab === "deleted") {
        fetchDeletedStaff();
      }
    } else {
      setLoading(false);
      setError("Please select a company to view staff members.");
    }
  }, [
    effectiveCompanyId,
    activeTab,
    currentPage,
    deletedCurrentPage,
    searchQuery,
    filterRole,
    filterStatus,
    sortField,
    sortDirection,
  ]);

  // ✅ Modal Handlers
  const handleShowAddModal = () => {
    setSelectedStaff(null);
    setEditMode(false);
    setShowAddModal(true);
  };

  const handleEditStaff = (staffMember) => {
    setSelectedStaff(staffMember);
    setEditMode(true);
    setShowAddModal(true);
  };

  // ✅ ENHANCED: Delete Handler (for StaffTable use)
  const handleDeleteStaff = async (
    staffMember,
    deleteType = "soft",
    deleteReason = ""
  ) => {
    try {
      const response = await staffService.deleteStaff(
        staffMember._id || staffMember.id,
        {
          permanent: deleteType === "hard",
          reason: deleteReason.trim(),
        }
      );

      if (response && response.success) {
        if (deleteType === "hard") {
          addToast?.("Staff member permanently deleted!", "success");
        } else {
          addToast?.("Staff member deleted successfully!", "success");
        }

        // Remove from current list
        setStaff((prevStaff) =>
          prevStaff.filter(
            (s) => (s.id || s._id) !== (staffMember.id || staffMember._id)
          )
        );

        // Refresh data
        await fetchStaff();

        // If soft delete, refresh deleted staff too
        if (deleteType === "soft") {
          await fetchDeletedStaff();
        }
      } else {
        throw new Error(response?.message || "Failed to delete staff member");
      }
    } catch (error) {
      console.error("Delete staff error:", error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        addToast?.(
          "Access denied. You don't have permission to delete staff members.",
          "error"
        );
      } else if (error.response?.status === 404) {
        addToast?.("Staff member not found.", "error");
      } else {
        addToast?.("Error deleting staff member: " + error.message, "error");
      }
      throw error; // Re-throw to let StaffTable handle loading state
    }
  };

  // ✅ Restore Staff Handler
  const handleRestoreStaff = async (staffMember) => {
    try {
      const response = await staffService.restoreStaff(
        staffMember._id || staffMember.id
      );

      if (response && response.success) {
        addToast?.("Staff member restored successfully!", "success");

        // Remove from deleted list
        setDeletedStaff((prevStaff) =>
          prevStaff.filter(
            (s) => (s.id || s._id) !== (staffMember.id || staffMember._id)
          )
        );

        // Refresh both lists
        await fetchStaff();
        await fetchDeletedStaff();
      } else {
        throw new Error(response?.message || "Failed to restore staff member");
      }
    } catch (error) {
      console.error("Restore staff error:", error);
      addToast?.("Error restoring staff member: " + error.message, "error");
      throw error;
    }
  };

  // ✅ Save Staff Handler
  const handleSaveStaff = async (staffData) => {
    console.log(
      "🎯 StaffManagement.handleSaveStaff called - handling UI updates only"
    );

    try {
      addToast?.(
        `Staff member ${editMode ? "updated" : "created"} successfully!`,
        "success"
      );

      setShowAddModal(false);
      await fetchStaff();
    } catch (error) {
      console.error("❌ StaffManagement.handleSaveStaff error:", error);
      addToast?.(
        `Error ${editMode ? "updating" : "creating"} staff member: ` +
          error.message,
        "error"
      );
    }
  };

  // ✅ Filter & Sort Handlers
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
    setDeletedCurrentPage(1);
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
    setCurrentPage(1);
    setDeletedCurrentPage(1);
  };

  const handleFilterChange = (type, value) => {
    if (type === "role") {
      setFilterRole(value);
    } else if (type === "status") {
      setFilterStatus(value);
    }
    setCurrentPage(1);
    setDeletedCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (activeTab === "active") {
      setCurrentPage(page);
    } else {
      setDeletedCurrentPage(page);
    }
  };

  const handleRetry = () => {
    setError(null);
    if (activeTab === "active") {
      fetchStaff();
    } else {
      fetchDeletedStaff();
    }
  };

  // ✅ Tab Change Handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setDeletedCurrentPage(1);
  };

  // ✅ Error State
  if (error) {
    return (
      <Container fluid>
        <Card style={{borderRadius: "0"}}>
          <Card.Header
            className="bg-white d-flex justify-content-between align-items-center py-3"
            style={{borderRadius: "0"}}
          >
            <h5 className="mb-0">
              <FontAwesomeIcon icon={faUserTie} className="text-primary me-2" />
              Staff Management
            </h5>
          </Card.Header>
          <Card.Body style={{borderRadius: "0"}}>
            <Alert
              variant="warning"
              className="mb-3"
              style={{borderRadius: "0"}}
            >
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    className="me-2"
                  />
                  <strong>Unable to load staff data:</strong> {error}
                </div>
                <div>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={handleRetry}
                    className="me-2"
                    style={{borderRadius: "0"}}
                  >
                    <FontAwesomeIcon icon={faRefresh} className="me-1" />
                    Retry
                  </Button>
                  {error.includes("No company selected") && onNavigate && (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => onNavigate("dashboard")}
                      style={{borderRadius: "0"}}
                    >
                      Go to Dashboard
                    </Button>
                  )}
                </div>
              </div>
            </Alert>

            <div className="text-center py-4">
              <FontAwesomeIcon
                icon={faUsers}
                size="3x"
                className="text-muted mb-3"
              />
              <h6 className="text-muted mb-2">Staff Management Unavailable</h6>
              <p className="text-muted small mb-3">
                We're having trouble connecting to the staff service.
                {error.includes("Access denied") &&
                  " You may not have the required permissions."}
                {error.includes("Network") &&
                  " Please check your internet connection."}
              </p>
            </div>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  // ✅ Loading State
  if (loading && activeTab === "active") {
    return (
      <Container fluid>
        <Card style={{borderRadius: "0"}}>
          <Card.Header
            className="bg-white d-flex justify-content-between align-items-center py-3"
            style={{borderRadius: "0"}}
          >
            <h5 className="mb-0">
              <FontAwesomeIcon icon={faUserTie} className="text-primary me-2" />
              Staff Management
            </h5>
          </Card.Header>
          <Card.Body style={{borderRadius: "0"}}>
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" className="mb-3" />
              <h6 className="text-muted">Loading staff data...</h6>
              <p className="text-muted small">
                Please wait while we fetch the staff information.
              </p>
            </div>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  // ✅ Main Render
  return (
    <Container fluid>
      <Card style={{borderRadius: "0"}}>
        {/* ✅ Header */}
        <Card.Header
          className="bg-white d-flex justify-content-between align-items-center py-3"
          style={{borderRadius: "0"}}
        >
          <div>
            <h5 className="mb-0">
              <FontAwesomeIcon icon={faUserTie} className="text-primary me-2" />
              Staff Management
            </h5>
            {currentCompany && (
              <small className="text-muted">
                {currentCompany.businessName || currentCompany.name}
              </small>
            )}
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleShowAddModal}
            className="d-flex align-items-center"
            disabled={!effectiveCompanyId}
            style={{borderRadius: "0"}}
          >
            <FontAwesomeIcon icon={faPlus} className="me-1" />
            Add Staff
          </Button>
        </Card.Header>

        <Card.Body style={{borderRadius: "0"}}>
          {/* ✅ Tabs for Active/Deleted Staff */}
          <Tabs
            activeKey={activeTab}
            onSelect={handleTabChange}
            className="mb-3"
            style={{borderRadius: "0"}}
          >
            <Tab
              eventKey="active"
              title={
                <span>
                  <FontAwesomeIcon icon={faUsers} className="me-1" />
                  Active Staff
                  {totalStaff > 0 && (
                    <Badge bg="primary" className="ms-1">
                      {totalStaff}
                    </Badge>
                  )}
                </span>
              }
            >
              {/* ✅ Filters & Search */}
              <Row className="mb-3 g-3">
                <Col md={6} lg={4}>
                  <InputGroup>
                    <InputGroup.Text style={{borderRadius: "0"}}>
                      <FontAwesomeIcon icon={faSearch} />
                    </InputGroup.Text>
                    <Form.Control
                      placeholder="Search by name, email or phone..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      style={{borderRadius: "0"}}
                    />
                  </InputGroup>
                </Col>
                <Col md={3} lg={2}>
                  <Form.Select
                    value={filterRole}
                    onChange={(e) => handleFilterChange("role", e.target.value)}
                    className="h-100"
                    style={{borderRadius: "0"}}
                  >
                    <option value="all">All Roles</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="cashier">Cashier</option>
                    <option value="salesperson">Sales</option>
                    <option value="accountant">Accountant</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="inventory">Inventory</option>
                  </Form.Select>
                </Col>
                <Col md={3} lg={2}>
                  <Form.Select
                    value={filterStatus}
                    onChange={(e) =>
                      handleFilterChange("status", e.target.value)
                    }
                    className="h-100"
                    style={{borderRadius: "0"}}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Form.Select>
                </Col>
              </Row>

              {/* ✅ Active Staff Table */}
              <StaffTable
                staff={staff}
                loading={loading}
                totalStaff={totalStaff}
                currentPage={currentPage}
                totalPages={totalPages}
                sortField={sortField}
                sortDirection={sortDirection}
                effectiveCompanyId={effectiveCompanyId}
                onSort={handleSort}
                onPageChange={handlePageChange}
                onEditStaff={handleEditStaff}
                onDeleteStaff={handleDeleteStaff}
                onShowAddModal={handleShowAddModal}
                isDeletedView={false}
                addToast={addToast} // ✅ Pass addToast for StaffView
              />
            </Tab>

            <Tab
              eventKey="deleted"
              title={
                <span>
                  <FontAwesomeIcon icon={faTrash} className="me-1" />
                  Deleted Staff
                  {deletedTotalStaff > 0 && (
                    <Badge bg="secondary" className="ms-1">
                      {deletedTotalStaff}
                    </Badge>
                  )}
                </span>
              }
            >
              {/* ✅ Deleted Staff Search */}
              <Row className="mb-3 g-3">
                <Col md={6} lg={4}>
                  <InputGroup>
                    <InputGroup.Text style={{borderRadius: "0"}}>
                      <FontAwesomeIcon icon={faSearch} />
                    </InputGroup.Text>
                    <Form.Control
                      placeholder="Search deleted staff..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      style={{borderRadius: "0"}}
                    />
                  </InputGroup>
                </Col>
              </Row>

              {/* ✅ Deleted Staff Table */}
              <StaffTable
                staff={deletedStaff}
                loading={deletedLoading}
                totalStaff={deletedTotalStaff}
                currentPage={deletedCurrentPage}
                totalPages={deletedTotalPages}
                sortField="deletedAt"
                sortDirection="desc"
                effectiveCompanyId={effectiveCompanyId}
                onSort={handleSort}
                onPageChange={handlePageChange}
                onRestoreStaff={handleRestoreStaff}
                isDeletedView={true}
                addToast={addToast} // ✅ Pass addToast for StaffView
              />
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      {/* ✅ Add/Edit Staff Modal */}
      <AddStaffModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onSave={handleSaveStaff}
        editMode={editMode}
        staffData={selectedStaff}
        companyId={effectiveCompanyId}
        addToast={addToast}
      />
    </Container>
  );
}

export default StaffManagement;
