import React, {useState, useEffect, useCallback, useRef} from "react";
import {createPortal} from "react-dom"; // ✅ NEW: Import createPortal
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Badge,
  Form,
  InputGroup,
  Modal,
  Spinner,
  Alert,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faFilter,
  faCheck,
  faTimes,
  faHistory,
  faBuilding,
  faUser,
  faCalendarAlt,
  faExclamationTriangle,
  faEye,
  faEdit,
  faSpinner,
  faCheckCircle,
  faTimesCircle,
  faClock,
  faRedo,
  faDownload,
  faSync,
  faEllipsisV,
  faCheckDouble,
  faExchangeAlt,
  faPaperPlane,
  faUndo,
} from "@fortawesome/free-solid-svg-icons";

import itemService from "../../services/itemService";

// ✅ NEW: Custom Portal Dropdown Component
const PortalDropdown = ({
  isOpen,
  onClose,
  triggerRef,
  children,
  className = "",
}) => {
  const [position, setPosition] = useState({top: 0, left: 0});
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft =
        window.pageXOffset || document.documentElement.scrollLeft;

      setPosition({
        top: rect.bottom + scrollTop + 5,
        left: rect.left + scrollLeft,
      });
    }
  }, [isOpen, triggerRef]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !triggerRef.current?.contains(event.target)
      ) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("scroll", onClose, true);
      window.addEventListener("resize", onClose);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      className={`portal-dropdown ${className}`}
      style={{
        position: "absolute",
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 9999,
        backgroundColor: "white",
        border: "1px solid #dee2e6",
        borderRadius: "0.375rem",
        boxShadow: "0 0.5rem 1rem rgba(0, 0, 0, 0.15)",
        minWidth: "160px",
        maxWidth: "300px",
        padding: "0.5rem 0",
        fontSize: "0.875rem",
        animation: "fadeInScale 0.15s ease-out",
      }}
    >
      {children}
    </div>,
    document.body
  );
};

// ✅ NEW: Dropdown Item Component
const DropdownItem = ({
  onClick,
  icon,
  iconColor,
  children,
  disabled = false,
  className = "",
}) => {
  return (
    <div
      className={`portal-dropdown-item ${className} ${
        disabled ? "disabled" : ""
      }`}
      onClick={disabled ? undefined : onClick}
      style={{
        padding: "0.5rem 1rem",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        color: disabled ? "#6c757d" : "#212529",
        backgroundColor: "transparent",
        transition: "background-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.target.style.backgroundColor = "#f8f9fa";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.target.style.backgroundColor = "transparent";
        }
      }}
    >
      {icon && (
        <FontAwesomeIcon
          icon={icon}
          className={iconColor || "text-muted"}
          style={{width: "14px"}}
        />
      )}
      {children}
    </div>
  );
};

// ✅ NEW: Dropdown Divider Component
const DropdownDivider = () => {
  return (
    <div
      style={{
        height: "1px",
        backgroundColor: "#dee2e6",
        margin: "0.5rem 0",
      }}
    />
  );
};

function ItemNameVerification({adminData, currentUser, addToast}) {
  // State management
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [sortBy, setSortBy] = useState("submissionDate");
  const [sortOrder, setSortOrder] = useState("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);

  // ✅ NEW: Dropdown states
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRefs = useRef({});

  // Form states
  const [correctedName, setCorrectedName] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [suggestedName, setSuggestedName] = useState("");
  const [verificationHistory, setVerificationHistory] = useState([]);

  // Resubmit form states
  const [newItemName, setNewItemName] = useState("");
  const [resubmissionReason, setResubmissionReason] = useState("");

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    averageVerificationDays: 0,
  });

  // ✅ NEW: Handle dropdown toggle
  const handleDropdownToggle = (itemId) => {
    setOpenDropdown(openDropdown === itemId ? null : itemId);
  };

  // ✅ NEW: Close dropdown
  const handleDropdownClose = () => {
    setOpenDropdown(null);
  };

  // Load pending verification items
  const loadVerificationItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const dummyCompanyId = "admin";
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        status: statusFilter,
        companyId: companyFilter !== "all" ? companyFilter : "",
        sortBy,
        sortOrder,
      };

      const response = await itemService.getPendingVerificationItems(
        dummyCompanyId,
        params
      );

      if (response.success) {
        const itemsData = response.data.items || [];
        const formattedItems = itemService.formatVerificationItems(itemsData);

        setItems(formattedItems);
        setFilteredItems(formattedItems);
        setTotalPages(
          Math.ceil((response.data.pagination?.total || 0) / itemsPerPage)
        );

        if (response.data.summary) {
          setStats(response.data.summary);
        }
      } else {
        throw new Error(
          response.message || "Failed to load verification items"
        );
      }
    } catch (error) {
      console.error("Error loading verification items:", error);
      setError(error.message);
      addToast?.(error.message || "Failed to load verification items", "error");
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    itemsPerPage,
    searchQuery,
    statusFilter,
    companyFilter,
    sortBy,
    sortOrder,
    addToast,
  ]);

  // Load verification statistics
  const loadStats = useCallback(async () => {
    try {
      const dummyCompanyId = "admin";
      const response = await itemService.getVerificationStats(dummyCompanyId);

      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Error loading verification stats:", error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadVerificationItems();
    loadStats();
  }, [loadVerificationItems, loadStats]);

  // Handle search with debounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setCurrentPage(1);
      loadVerificationItems();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Handle filter changes
  useEffect(() => {
    setCurrentPage(1);
    loadVerificationItems();
  }, [statusFilter, companyFilter, sortBy, sortOrder]);

  // Handle single item approval
  const handleApproveItem = async (item, correctedName = "", notes = "") => {
    try {
      setIsActionLoading(true);
      handleDropdownClose(); // ✅ NEW: Close dropdown

      const dummyCompanyId = "admin";
      const response = await itemService.approveItemName(
        dummyCompanyId,
        item.id,
        {
          correctedName: correctedName.trim(),
          adminId: currentUser?.id || "admin",
          adminNotes: notes.trim(),
        }
      );

      if (response.success) {
        addToast?.(
          `✅ "${item.originalName}" ${
            correctedName ? "corrected and " : ""
          }approved successfully!`,
          "success"
        );

        await loadVerificationItems();
        await loadStats();

        setShowApprovalModal(false);
        resetModalState();
      } else {
        throw new Error(response.message || "Failed to approve item");
      }
    } catch (error) {
      console.error("Error approving item:", error);
      addToast?.(error.message || "Failed to approve item", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle single item rejection
  const handleRejectItem = async (item, reason, suggested = "") => {
    try {
      setIsActionLoading(true);
      handleDropdownClose(); // ✅ NEW: Close dropdown

      const dummyCompanyId = "admin";
      const response = await itemService.rejectItemName(
        dummyCompanyId,
        item.id,
        {
          rejectionReason: reason.trim(),
          suggestedName: suggested.trim(),
          adminId: currentUser?.id || "admin",
        }
      );

      if (response.success) {
        addToast?.(
          `❌ "${item.originalName}" rejected successfully!`,
          "success"
        );

        await loadVerificationItems();
        await loadStats();

        setShowRejectionModal(false);
        resetModalState();
      } else {
        throw new Error(response.message || "Failed to reject item");
      }
    } catch (error) {
      console.error("Error rejecting item:", error);
      addToast?.(error.message || "Failed to reject item", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle item resubmission
  const handleResubmitItem = async (item, newName, reason) => {
    try {
      setIsActionLoading(true);
      handleDropdownClose(); // ✅ NEW: Close dropdown

      const dummyCompanyId = "admin";
      const response = await itemService.resubmitForVerification(
        dummyCompanyId,
        item.id,
        {
          newName: newName.trim(),
          resubmissionReason: reason.trim(),
        }
      );

      if (response.success) {
        addToast?.(
          `🔄 "${
            item.originalName
          }" resubmitted successfully!\n📝 New name: "${newName.trim()}"`,
          "success"
        );

        await loadVerificationItems();
        await loadStats();

        setShowResubmitModal(false);
        resetModalState();
      } else {
        throw new Error(response.message || "Failed to resubmit item");
      }
    } catch (error) {
      console.error("Error resubmitting item:", error);
      addToast?.(error.message || "Failed to resubmit item", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle quick approve multiple items
  const handleQuickApprove = async (itemIds) => {
    try {
      setIsActionLoading(true);

      const dummyCompanyId = "admin";
      const response = await itemService.quickApproveItems(
        dummyCompanyId,
        itemIds,
        currentUser?.id || "admin"
      );

      if (response.success) {
        addToast?.(
          `✅ ${response.data.approved.length} items approved successfully!`,
          "success"
        );

        await loadVerificationItems();
        await loadStats();

        setSelectedItems([]);
      } else {
        throw new Error(response.message || "Failed to approve items");
      }
    } catch (error) {
      console.error("Error in quick approve:", error);
      addToast?.(error.message || "Failed to approve items", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle verification history
  const handleViewHistory = async (item) => {
    try {
      setIsActionLoading(true);
      handleDropdownClose(); // ✅ NEW: Close dropdown

      const dummyCompanyId = "admin";
      const response = await itemService.getVerificationHistory(
        dummyCompanyId,
        item.id
      );

      if (response.success) {
        setVerificationHistory(response.data.verification.history || []);
        setSelectedItem(item);
        setShowHistoryModal(true);
      } else {
        throw new Error(response.message || "Failed to load history");
      }
    } catch (error) {
      console.error("Error loading history:", error);
      addToast?.(error.message || "Failed to load history", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Reset modal state
  const resetModalState = () => {
    setCorrectedName("");
    setAdminNotes("");
    setRejectionReason("");
    setSuggestedName("");
    setNewItemName("");
    setResubmissionReason("");
    setSelectedItem(null);
    setVerificationHistory([]);
  };

  // Handle checkbox selection
  const handleItemSelect = (itemId, isSelected) => {
    setSelectedItems((prev) =>
      isSelected ? [...prev, itemId] : prev.filter((id) => id !== itemId)
    );
  };

  // Handle select all
  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      const pendingItems = items.filter(
        (item) => item.verification?.status === "pending"
      );
      setSelectedItems(pendingItems.map((item) => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const config = itemService.getVerificationStatusBadge(status);
    return (
      <Badge bg={config.color} className="d-flex align-items-center gap-1">
        <FontAwesomeIcon icon={config.icon} size="sm" />
        {config.text}
      </Badge>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get urgency indicator
  const getUrgencyIndicator = (item) => {
    if (item.isUrgent) {
      return (
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip>Needs immediate attention</Tooltip>}
        >
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            className="text-warning ms-2"
          />
        </OverlayTrigger>
      );
    }
    return null;
  };

  // Get rejection reason display
  const getRejectionInfo = (item) => {
    if (
      item.verification?.status === "rejected" &&
      item.verification?.rejectionReason
    ) {
      return (
        <div className="mt-1">
          <small className="text-danger">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
            Rejected: {item.verification.rejectionReason}
          </small>
          {item.verification?.suggestedName && (
            <small className="text-muted d-block">
              Suggested: {item.verification.suggestedName}
            </small>
          )}
        </div>
      );
    }
    return null;
  };

  // Render loading state
  if (isLoading && items.length === 0) {
    return (
      <div className="item-verification">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" size="lg" />
          <h5 className="mt-3 text-muted">Loading verification items...</h5>
          <p className="text-muted">
            Getting items that need name verification...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="item-verification">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">
            <FontAwesomeIcon
              icon={faCheckCircle}
              className="me-2 text-primary"
            />
            Item Name Verification
          </h4>
          <p className="text-muted mb-0">
            Review and approve item names submitted by companies
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="outline-primary"
            onClick={() => loadVerificationItems()}
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faSync} className="me-2" />
            Refresh
          </Button>
          {selectedItems.length > 0 && (
            <Button
              variant="success"
              onClick={() => handleQuickApprove(selectedItems)}
              disabled={isActionLoading}
            >
              <FontAwesomeIcon icon={faCheckDouble} className="me-2" />
              Quick Approve ({selectedItems.length})
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center border-0 shadow-sm">
            <Card.Body>
              <div className="display-6 text-primary mb-2">{stats.total}</div>
              <div className="text-muted">Total Items</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0 shadow-sm">
            <Card.Body>
              <div className="display-6 text-warning mb-2">{stats.pending}</div>
              <div className="text-muted">Pending Review</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0 shadow-sm">
            <Card.Body>
              <div className="display-6 text-success mb-2">
                {stats.approved}
              </div>
              <div className="text-muted">Approved</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0 shadow-sm">
            <Card.Body>
              <div className="display-6 text-danger mb-2">{stats.rejected}</div>
              <div className="text-muted">Rejected</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <Row className="align-items-end">
            <Col md={4}>
              <Form.Label className="fw-semibold">Search Items</Form.Label>
              <InputGroup>
                <InputGroup.Text className="bg-light border-end-0">
                  <FontAwesomeIcon icon={faSearch} className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by name, company, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-start-0"
                />
              </InputGroup>
            </Col>
            <Col md={2}>
              <Form.Label className="fw-semibold">Status</Form.Label>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label className="fw-semibold">Company</Form.Label>
              <Form.Select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
              >
                <option value="all">All Companies</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label className="fw-semibold">Sort By</Form.Label>
              <Form.Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="submissionDate">Submission Date</option>
                <option value="name">Item Name</option>
                <option value="company">Company</option>
                <option value="urgency">Urgency</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label className="fw-semibold">Order</Form.Label>
              <Form.Select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Items Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table className="mb-0" hover>
              <thead className="bg-light">
                <tr>
                  <th className="border-0 ps-4">
                    <Form.Check
                      type="checkbox"
                      checked={
                        selectedItems.length ===
                        items.filter(
                          (item) => item.verification?.status === "pending"
                        ).length
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th className="border-0">Item Details</th>
                  <th className="border-0">Company</th>
                  <th className="border-0">Status</th>
                  <th className="border-0">Submission Date</th>
                  <th className="border-0">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="align-middle">
                    <td className="ps-4">
                      {item.verification?.status === "pending" && (
                        <Form.Check
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={(e) =>
                            handleItemSelect(item.id, e.target.checked)
                          }
                        />
                      )}
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <div>
                          <div className="fw-semibold text-primary">
                            {item.currentName}
                            {getUrgencyIndicator(item)}
                          </div>
                          {item.wasNameChanged && (
                            <small className="text-muted">
                              Original: {item.originalName}
                            </small>
                          )}
                          <div className="small text-muted">
                            {item.category} • {item.type}
                          </div>
                          {getRejectionInfo(item)}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <FontAwesomeIcon
                          icon={faBuilding}
                          className="text-muted me-2"
                        />
                        <div>
                          <div className="fw-semibold">
                            {item.companyDisplayName}
                          </div>
                          <small className="text-muted">
                            {item.companyInfo?.phone}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>{getStatusBadge(item.verification?.status)}</td>
                    <td>
                      <div className="d-flex align-items-center">
                        <FontAwesomeIcon
                          icon={faCalendarAlt}
                          className="text-muted me-2"
                        />
                        <div>
                          <div>{item.formattedSubmissionDate}</div>
                          <small className="text-muted">
                            {item.daysSinceSubmission} days ago
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {/* ✅ NEW: Custom Portal Dropdown */}
                      <div className="position-relative">
                        <Button
                          ref={(el) => (dropdownRefs.current[item.id] = el)}
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => handleDropdownToggle(item.id)}
                          className="dropdown-toggle-custom"
                        >
                          <FontAwesomeIcon icon={faEllipsisV} />
                        </Button>

                        <PortalDropdown
                          isOpen={openDropdown === item.id}
                          onClose={handleDropdownClose}
                          triggerRef={{current: dropdownRefs.current[item.id]}}
                        >
                          {item.verification?.status === "pending" && (
                            <>
                              <DropdownItem
                                icon={faCheck}
                                iconColor="text-success"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setCorrectedName(item.currentName);
                                  setShowApprovalModal(true);
                                  handleDropdownClose();
                                }}
                              >
                                Approve
                              </DropdownItem>
                              <DropdownItem
                                icon={faTimes}
                                iconColor="text-danger"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setSuggestedName(item.currentName);
                                  setShowRejectionModal(true);
                                  handleDropdownClose();
                                }}
                              >
                                Reject
                              </DropdownItem>
                              <DropdownDivider />
                            </>
                          )}
                          {item.verification?.status === "rejected" && (
                            <>
                              <DropdownItem
                                icon={faRedo}
                                iconColor="text-info"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setNewItemName(
                                    item.verification?.suggestedName ||
                                      item.currentName
                                  );
                                  setResubmissionReason(
                                    "Updated based on admin feedback"
                                  );
                                  setShowResubmitModal(true);
                                  handleDropdownClose();
                                }}
                              >
                                Edit & Resubmit
                              </DropdownItem>
                              <DropdownDivider />
                            </>
                          )}
                          <DropdownItem
                            icon={faHistory}
                            iconColor="text-info"
                            onClick={() => handleViewHistory(item)}
                          >
                            View History
                          </DropdownItem>
                        </PortalDropdown>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Empty State */}
      {items.length === 0 && !isLoading && (
        <div className="text-center py-5">
          <FontAwesomeIcon
            icon={faCheckCircle}
            size="3x"
            className="text-muted mb-3"
          />
          <h5 className="text-muted">No items found for verification</h5>
          <p className="text-muted">
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your search or filter criteria"
              : "All items have been verified or no items have been submitted yet"}
          </p>
        </div>
      )}

      {/* Approval Modal */}
      <Modal
        show={showApprovalModal}
        onHide={() => setShowApprovalModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon icon={faCheck} className="me-2 text-success" />
            Approve Item Name
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem && (
            <div>
              <div className="mb-3">
                <strong>Original Name:</strong> {selectedItem.originalName}
              </div>
              <div className="mb-3">
                <strong>Current Name:</strong> {selectedItem.currentName}
              </div>
              <div className="mb-3">
                <strong>Company:</strong> {selectedItem.companyDisplayName}
              </div>

              <Form.Group className="mb-3">
                <Form.Label>Corrected Name (optional)</Form.Label>
                <Form.Control
                  type="text"
                  value={correctedName}
                  onChange={(e) => setCorrectedName(e.target.value)}
                  placeholder="Leave blank to approve as-is"
                />
                <Form.Text className="text-muted">
                  Only enter a corrected name if the original needs modification
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Admin Notes (optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes about this approval..."
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowApprovalModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={() =>
              handleApproveItem(selectedItem, correctedName, adminNotes)
            }
            disabled={isActionLoading}
          >
            {isActionLoading ? (
              <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
            ) : (
              <FontAwesomeIcon icon={faCheck} className="me-2" />
            )}
            Approve Item
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Rejection Modal */}
      <Modal
        show={showRejectionModal}
        onHide={() => setShowRejectionModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon icon={faTimes} className="me-2 text-danger" />
            Reject Item Name
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem && (
            <div>
              <div className="mb-3">
                <strong>Original Name:</strong> {selectedItem.originalName}
              </div>
              <div className="mb-3">
                <strong>Current Name:</strong> {selectedItem.currentName}
              </div>
              <div className="mb-3">
                <strong>Company:</strong> {selectedItem.companyDisplayName}
              </div>

              <Form.Group className="mb-3">
                <Form.Label>
                  Rejection Reason <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a clear reason for rejection..."
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Suggested Name (optional)</Form.Label>
                <Form.Control
                  type="text"
                  value={suggestedName}
                  onChange={(e) => setSuggestedName(e.target.value)}
                  placeholder="Suggest a better name..."
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowRejectionModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() =>
              handleRejectItem(selectedItem, rejectionReason, suggestedName)
            }
            disabled={isActionLoading || !rejectionReason.trim()}
          >
            {isActionLoading ? (
              <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
            ) : (
              <FontAwesomeIcon icon={faTimes} className="me-2" />
            )}
            Reject Item
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Resubmit Modal */}
      <Modal
        show={showResubmitModal}
        onHide={() => setShowResubmitModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon icon={faRedo} className="me-2 text-info" />
            Edit & Resubmit Item Name
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem && (
            <div>
              <Alert variant="info" className="mb-3">
                <FontAwesomeIcon
                  icon={faExclamationTriangle}
                  className="me-2"
                />
                <strong>Rejection Reason:</strong>{" "}
                {selectedItem.verification?.rejectionReason}
                {selectedItem.verification?.suggestedName && (
                  <div className="mt-2">
                    <strong>Suggested Name:</strong>{" "}
                    {selectedItem.verification.suggestedName}
                  </div>
                )}
              </Alert>

              <div className="mb-3">
                <strong>Original Name:</strong> {selectedItem.originalName}
              </div>
              <div className="mb-3">
                <strong>Current Name:</strong> {selectedItem.currentName}
              </div>
              <div className="mb-3">
                <strong>Company:</strong> {selectedItem.companyDisplayName}
              </div>

              <Form.Group className="mb-3">
                <Form.Label>
                  New Corrected Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Enter the corrected item name..."
                  required
                />
                <Form.Text className="text-muted">
                  Please provide a corrected name that addresses the admin's
                  feedback
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Resubmission Reason</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={resubmissionReason}
                  onChange={(e) => setResubmissionReason(e.target.value)}
                  placeholder="Explain why you're resubmitting with this name..."
                />
                <Form.Text className="text-muted">
                  Optional: Explain the changes you made based on admin feedback
                </Form.Text>
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowResubmitModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="info"
            onClick={() =>
              handleResubmitItem(selectedItem, newItemName, resubmissionReason)
            }
            disabled={isActionLoading || !newItemName.trim()}
          >
            {isActionLoading ? (
              <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
            ) : (
              <FontAwesomeIcon icon={faPaperPlane} className="me-2" />
            )}
            Resubmit Item
          </Button>
        </Modal.Footer>
      </Modal>

      {/* History Modal */}
      <Modal
        show={showHistoryModal}
        onHide={() => setShowHistoryModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon icon={faHistory} className="me-2 text-info" />
            Verification History
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem && (
            <div>
              <div className="mb-4">
                <h6>Item: {selectedItem.currentName}</h6>
                <small className="text-muted">
                  Company: {selectedItem.companyDisplayName}
                </small>
              </div>

              <div className="timeline">
                {verificationHistory.map((entry, index) => (
                  <div key={index} className="timeline-item mb-3">
                    <div className="d-flex align-items-start">
                      <div className="timeline-icon me-3">
                        <FontAwesomeIcon
                          icon={
                            entry.action === "approved"
                              ? faCheckCircle
                              : entry.action === "rejected"
                              ? faTimesCircle
                              : entry.action === "submitted"
                              ? faClock
                              : entry.action === "resubmitted"
                              ? faRedo
                              : faExchangeAlt
                          }
                          className={`text-${
                            entry.action === "approved"
                              ? "success"
                              : entry.action === "rejected"
                              ? "danger"
                              : entry.action === "submitted"
                              ? "warning"
                              : entry.action === "resubmitted"
                              ? "info"
                              : "info"
                          }`}
                        />
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between">
                          <strong>
                            {entry.action.charAt(0).toUpperCase() +
                              entry.action.slice(1)}
                          </strong>
                          <small className="text-muted">
                            {formatDate(entry.date)}
                          </small>
                        </div>
                        {entry.oldName && entry.newName && (
                          <div className="small text-muted">
                            "{entry.oldName}" → "{entry.newName}"
                          </div>
                        )}
                        {entry.reason && (
                          <div className="small text-muted mt-1">
                            {entry.reason}
                          </div>
                        )}
                        {entry.adminId && (
                          <div className="small text-muted">
                            by {entry.adminId}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowHistoryModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ✅ NEW: Portal Dropdown Styles */}
      <style jsx>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .dropdown-toggle-custom {
          border: 1px solid #dee2e6;
          background: white;
          color: #6c757d;
          padding: 0.375rem 0.75rem;
          border-radius: 0.375rem;
          transition: all 0.15s ease-in-out;
        }

        .dropdown-toggle-custom:hover {
          background: #f8f9fa;
          border-color: #adb5bd;
          color: #495057;
        }

        .dropdown-toggle-custom:focus {
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
          border-color: #80bdff;
        }

        .portal-dropdown-item:first-child {
          border-top-left-radius: 0.375rem;
          border-top-right-radius: 0.375rem;
        }

        .portal-dropdown-item:last-child {
          border-bottom-left-radius: 0.375rem;
          border-bottom-right-radius: 0.375rem;
        }

        .portal-dropdown-item.disabled {
          opacity: 0.5;
          pointer-events: none;
        }

        .portal-dropdown-item:active {
          background-color: #e9ecef !important;
        }

        /* Ensure dropdown appears above other content */
        .portal-dropdown {
          z-index: 9999 !important;
        }

        /* Table responsiveness improvements */
        .table-responsive {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .table td {
          vertical-align: middle;
        }

        /* Improved mobile responsiveness */
        @media (max-width: 768px) {
          .portal-dropdown {
            left: 10px !important;
            right: 10px !important;
            width: auto !important;
            min-width: auto !important;
            max-width: calc(100vw - 20px) !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ItemNameVerification;
