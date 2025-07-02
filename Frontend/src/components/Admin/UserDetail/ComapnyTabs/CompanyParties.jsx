import React, {useState, useEffect} from "react";
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Badge,
  Form,
  InputGroup,
  Spinner,
  Alert,
  Modal,
  Dropdown,
  Tabs,
  Tab,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faHandshake,
  faSearch,
  faDownload,
  faEdit,
  faTrash,
  faEye,
  faSort,
  faEllipsisV,
  faUser,
  faBuilding,
  faCheckCircle,
  faExclamationTriangle,
  faTimesCircle,
  faClock,
  faPhone,
  faEnvelope,
  faMapMarkerAlt,
  faIndustry,
  faUserTie,
  faCreditCard,
  faChartLine,
  faHistory,
  faFileInvoice,
  faUserCheck,
  faUserTimes,
  faSync,
  faPlus,
  faRupeeSign,
} from "@fortawesome/free-solid-svg-icons";

import partyService from "../../../../services/partyService";

function CompanyParties({companyId, companyData, userRole, addToast}) {
  // ✅ State management
  const [parties, setParties] = useState([]);
  const [filteredParties, setFilteredParties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [balanceFilter, setBalanceFilter] = useState("all");
  const [gstFilter, setGstFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [activeTab, setActiveTab] = useState("all");

  // ✅ Modal states
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [selectedParty, setSelectedParty] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  // ✅ Stats state
  const [stats, setStats] = useState({
    totalParties: 0,
    customers: 0,
    suppliers: 0,
    vendors: 0,
    activeParties: 0,
    inactiveParties: 0,
    gstRegistered: 0,
    totalOutstanding: 0,
    positiveBalance: 0,
    negativeBalance: 0,
  });

  // ✅ Load data on component mount
  useEffect(() => {
    if (companyId) {
      loadCompanyParties();
    }
  }, [companyId]);

  // ✅ Apply filters when data or filters change
  useEffect(() => {
    filterAndSortParties();
  }, [
    parties,
    searchQuery,
    typeFilter,
    statusFilter,
    balanceFilter,
    gstFilter,
    sortBy,
    sortDirection,
    activeTab,
  ]);

  // ✅ Load real data from database
  const loadCompanyParties = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("🔄 Loading company parties for:", companyId);

      const response = await partyService.getParties(companyId, {
        page: 1,
        limit: 100,
        includeLinked: true,
        includeBalance: true,
      });

      if (response.success) {
        const partiesData = response.data.parties || response.data || [];
        console.log("📊 Loaded parties data:", partiesData);
        setParties(partiesData);
        calculateStats(partiesData);
        addToast?.("Company parties loaded successfully", "success");
      } else {
        setError(response.message || "Failed to load parties");
        addToast?.(response.message || "Failed to load parties", "error");
      }
    } catch (error) {
      console.error("❌ Error loading company parties:", error);
      setError(error.message || "Failed to load company parties");
      addToast?.("Error loading company parties", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Calculate statistics
  const calculateStats = (partiesData) => {
    const totalParties = partiesData.length;

    // ✅ FIXED: Check multiple possible field names for party type
    const customers = partiesData.filter(
      (party) => party.partyType === "customer" || party.type === "customer"
    ).length;

    const suppliers = partiesData.filter(
      (party) => party.partyType === "supplier" || party.type === "supplier"
    ).length;

    const vendors = partiesData.filter(
      (party) => party.partyType === "vendor" || party.type === "vendor"
    ).length;

    // ✅ FIXED: Check multiple possible field names for status
    const activeParties = partiesData.filter(
      (party) =>
        party.status === "active" ||
        party.isActive === true ||
        (!party.status && !party.hasOwnProperty("isActive")) // Default to active if no status field
    ).length;

    const inactiveParties = totalParties - activeParties;

    // ✅ FIXED: Check multiple possible field names for GST
    const gstRegistered = partiesData.filter(
      (party) =>
        (party.gstNumber && party.gstNumber.trim()) ||
        (party.gstNo && party.gstNo.trim()) ||
        (party.taxNumber && party.taxNumber.trim())
    ).length;

    // ✅ FIXED: Check multiple possible field names for balance
    const totalOutstanding = partiesData.reduce((sum, party) => {
      const balance =
        party.currentBalance || party.balance || party.outstandingAmount || 0;
      return sum + Math.abs(balance);
    }, 0);

    const positiveBalance = partiesData.filter((party) => {
      const balance =
        party.currentBalance || party.balance || party.outstandingAmount || 0;
      return balance > 0;
    }).length;

    const negativeBalance = partiesData.filter((party) => {
      const balance =
        party.currentBalance || party.balance || party.outstandingAmount || 0;
      return balance < 0;
    }).length;

    console.log("📊 Calculated stats:", {
      totalParties,
      customers,
      suppliers,
      vendors,
      activeParties,
      inactiveParties,
      gstRegistered,
      totalOutstanding,
      positiveBalance,
      negativeBalance,
    });

    setStats({
      totalParties,
      customers,
      suppliers,
      vendors,
      activeParties,
      inactiveParties,
      gstRegistered,
      totalOutstanding,
      positiveBalance,
      negativeBalance,
    });
  };

  // ✅ FIXED: Clear filters when clicking on cards
  const handleCardClick = (filterType, filterValue) => {
    console.log("🔄 Card clicked:", filterType, filterValue);

    // Reset all filters first
    setSearchQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
    setBalanceFilter("all");
    setGstFilter("all");

    // Apply the specific filter
    switch (filterType) {
      case "tab":
        setActiveTab(filterValue);
        break;
      case "status":
        setActiveTab("all");
        setStatusFilter(filterValue);
        break;
      case "balance":
        setActiveTab("all");
        setBalanceFilter(filterValue);
        break;
      case "gst":
        setActiveTab("all");
        setGstFilter(filterValue);
        break;
      default:
        setActiveTab(filterValue);
    }
  };

  // ✅ Filter and sort parties
  const filterAndSortParties = () => {
    let filtered = [...parties];

    console.log("🔍 Filtering parties:", {
      totalParties: parties.length,
      activeTab,
      typeFilter,
      statusFilter,
      balanceFilter,
      gstFilter,
      searchQuery,
    });

    // ✅ Apply tab filter first
    if (activeTab !== "all") {
      filtered = filtered.filter((party) => {
        const partyType = party.partyType || party.type;
        return partyType === activeTab;
      });
      console.log(`📋 After tab filter (${activeTab}):`, filtered.length);
    }

    // ✅ Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (party) =>
          party.name?.toLowerCase().includes(query) ||
          party.email?.toLowerCase().includes(query) ||
          party.phoneNumber?.includes(query) ||
          party.gstNumber?.toLowerCase().includes(query) ||
          party.gstNo?.toLowerCase().includes(query) ||
          party.companyName?.toLowerCase().includes(query)
      );
      console.log(`🔍 After search filter:`, filtered.length);
    }

    // ✅ Apply type filter (only if different from tab)
    if (typeFilter !== "all" && typeFilter !== activeTab) {
      filtered = filtered.filter((party) => {
        const partyType = party.partyType || party.type;
        return partyType === typeFilter;
      });
      console.log(`🏷️ After type filter (${typeFilter}):`, filtered.length);
    }

    // ✅ Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((party) => {
        const isActive =
          party.status === "active" ||
          party.isActive === true ||
          (!party.status && !party.hasOwnProperty("isActive"));
        return statusFilter === "active" ? isActive : !isActive;
      });
      console.log(`✅ After status filter (${statusFilter}):`, filtered.length);
    }

    // ✅ Apply balance filter
    if (balanceFilter !== "all") {
      filtered = filtered.filter((party) => {
        const balance =
          party.currentBalance || party.balance || party.outstandingAmount || 0;
        switch (balanceFilter) {
          case "positive":
            return balance > 0;
          case "negative":
            return balance < 0;
          case "zero":
            return balance === 0;
          default:
            return true;
        }
      });
      console.log(
        `💰 After balance filter (${balanceFilter}):`,
        filtered.length
      );
    }

    // ✅ Apply GST filter
    if (gstFilter !== "all") {
      filtered = filtered.filter((party) => {
        const hasGst =
          (party.gstNumber && party.gstNumber.trim()) ||
          (party.gstNo && party.gstNo.trim()) ||
          (party.taxNumber && party.taxNumber.trim());
        return gstFilter === "registered" ? hasGst : !hasGst;
      });
      console.log(`📄 After GST filter (${gstFilter}):`, filtered.length);
    }

    // ✅ Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === "createdAt" || sortBy === "updatedAt") {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      } else if (sortBy === "currentBalance") {
        aValue = parseFloat(
          a.currentBalance || a.balance || a.outstandingAmount || 0
        );
        bValue = parseFloat(
          b.currentBalance || b.balance || b.outstandingAmount || 0
        );
      } else if (typeof aValue === "string") {
        aValue = aValue?.toLowerCase() || "";
        bValue = bValue?.toLowerCase() || "";
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    console.log("✅ Final filtered parties:", filtered.length);
    setFilteredParties(filtered);
  };

  // ✅ Get status badge
  const getStatusBadge = (party) => {
    const isActive =
      party.status === "active" ||
      party.isActive === true ||
      (!party.status && !party.hasOwnProperty("isActive"));

    if (isActive) {
      return (
        <Badge bg="success" className="d-flex align-items-center gap-1">
          <FontAwesomeIcon icon={faCheckCircle} size="xs" />
          ACTIVE
        </Badge>
      );
    } else {
      return (
        <Badge bg="secondary" className="d-flex align-items-center gap-1">
          <FontAwesomeIcon icon={faTimesCircle} size="xs" />
          INACTIVE
        </Badge>
      );
    }
  };

  // ✅ Get type badge
  const getTypeBadge = (party) => {
    const type = party.partyType || party.type || "unknown";
    const variants = {
      customer: {bg: "primary", icon: faUser, label: "CUSTOMER"},
      supplier: {bg: "success", icon: faIndustry, label: "SUPPLIER"},
      vendor: {bg: "info", icon: faBuilding, label: "VENDOR"},
    };

    const config = variants[type] || {
      bg: "secondary",
      icon: faUser,
      label: "UNKNOWN",
    };

    return (
      <Badge bg={config.bg} className="d-flex align-items-center gap-1">
        <FontAwesomeIcon icon={config.icon} size="xs" />
        {config.label}
      </Badge>
    );
  };

  // ✅ Handle party actions
  const handlePartyAction = async (action, party) => {
    setIsLoadingAction(true);

    try {
      switch (action) {
        case "view":
          setSelectedParty(party);
          setShowPartyModal(true);
          break;
        case "edit":
          addToast?.(
            `Edit functionality for ${party.name} coming soon`,
            "info"
          );
          break;
        case "delete":
          setSelectedParty(party);
          setShowDeleteModal(true);
          break;
        case "ledger":
          addToast?.(`View ledger for ${party.name} coming soon`, "info");
          break;
        case "statement":
          addToast?.(
            `Generate statement for ${party.name} coming soon`,
            "info"
          );
          break;
        case "refresh":
          await loadCompanyParties();
          break;
        default:
          addToast?.("Action not implemented", "info");
      }
    } catch (error) {
      addToast?.(error.message || "Action failed", "error");
    } finally {
      setIsLoadingAction(false);
    }
  };

  // ✅ Handle delete party
  const handleDeleteParty = async () => {
    if (!selectedParty) return;

    try {
      setIsLoadingAction(true);

      const response = await partyService.deleteParty(
        companyId,
        selectedParty._id || selectedParty.id
      );

      if (response.success) {
        addToast?.(`${selectedParty.name} deleted successfully`, "success");
        setShowDeleteModal(false);
        setSelectedParty(null);
        await loadCompanyParties();
      } else {
        throw new Error(response.message || "Failed to delete party");
      }
    } catch (error) {
      addToast?.(error.message || "Failed to delete party", "error");
    } finally {
      setIsLoadingAction(false);
    }
  };

  // ✅ Clear all filters
  const clearAllFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
    setBalanceFilter("all");
    setGstFilter("all");
    setActiveTab("all");
    addToast?.("All filters cleared", "info");
  };

  // ✅ Utility functions
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // ✅ Get party balance with fallback
  const getPartyBalance = (party) => {
    return (
      party.currentBalance || party.balance || party.outstandingAmount || 0
    );
  };

  // ✅ Loading state
  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <h5 className="mt-3 text-muted">Loading company parties...</h5>
        </Card.Body>
      </Card>
    );
  }

  // ✅ Error state
  if (error) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <Alert variant="danger">
            <Alert.Heading>
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              Error Loading Parties
            </Alert.Heading>
            <p>{error}</p>
            <Button variant="outline-danger" onClick={loadCompanyParties}>
              Try Again
            </Button>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div>
      {/* Stats Cards - Clickable */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              activeTab === "all" &&
              statusFilter === "all" &&
              balanceFilter === "all" &&
              gstFilter === "all"
                ? "active-card"
                : ""
            }`}
            onClick={() => handleCardClick("tab", "all")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faHandshake}
                className="stat-icon text-primary mb-2"
              />
              <h4 className="text-dark mb-1">{stats.totalParties}</h4>
              <small className="text-muted">Total Parties</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              activeTab === "customer" ? "active-card" : ""
            }`}
            onClick={() => handleCardClick("tab", "customer")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faUser}
                className="stat-icon text-primary mb-2"
              />
              <h4 className="text-dark mb-1">{stats.customers}</h4>
              <small className="text-muted">Customers</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              activeTab === "supplier" ? "active-card" : ""
            }`}
            onClick={() => handleCardClick("tab", "supplier")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faIndustry}
                className="stat-icon text-success mb-2"
              />
              <h4 className="text-dark mb-1">{stats.suppliers}</h4>
              <small className="text-muted">Suppliers</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              activeTab === "vendor" ? "active-card" : ""
            }`}
            onClick={() => handleCardClick("tab", "vendor")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faBuilding}
                className="stat-icon text-info mb-2"
              />
              <h4 className="text-dark mb-1">{stats.vendors}</h4>
              <small className="text-muted">Vendors</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Status and Financial Stats */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              statusFilter === "active" ? "active-card" : ""
            }`}
            onClick={() => handleCardClick("status", "active")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faCheckCircle}
                className="stat-icon text-success mb-2"
              />
              <h4 className="text-dark mb-1">{stats.activeParties}</h4>
              <small className="text-muted">Active Parties</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              gstFilter === "registered" ? "active-card" : ""
            }`}
            onClick={() => handleCardClick("gst", "registered")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faFileInvoice}
                className="stat-icon text-warning mb-2"
              />
              <h4 className="text-dark mb-1">{stats.gstRegistered}</h4>
              <small className="text-muted">GST Registered</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              balanceFilter === "positive" ? "active-card" : ""
            }`}
            onClick={() => handleCardClick("balance", "positive")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faRupeeSign}
                className="stat-icon text-success mb-2"
              />
              <h4 className="text-dark mb-1">{stats.positiveBalance}</h4>
              <small className="text-muted">Credit Balance</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center h-100">
            <Card.Body>
              <FontAwesomeIcon
                icon={faChartLine}
                className="stat-icon text-info mb-2"
              />
              <h4 className="text-dark mb-1">
                {formatCurrency(stats.totalOutstanding)}
              </h4>
              <small className="text-muted">Total Outstanding</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Parties Card */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="neutral-header">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0 fw-semibold neutral-text">
              <FontAwesomeIcon
                icon={faHandshake}
                className="me-2 neutral-muted"
              />
              Business Parties ({filteredParties.length})
            </h5>
            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={clearAllFilters}
                className="neutral-button"
              >
                Clear Filters
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => handlePartyAction("refresh")}
                disabled={isLoadingAction}
                className="neutral-button"
              >
                <FontAwesomeIcon icon={faSync} className="me-1" />
                Refresh
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                className="neutral-button"
              >
                <FontAwesomeIcon icon={faDownload} className="me-1" />
                Export
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            activeKey={activeTab}
            onSelect={(key) => handleCardClick("tab", key)}
            className="mb-3 neutral-tabs"
          >
            <Tab
              eventKey="all"
              title={
                <span>
                  <FontAwesomeIcon icon={faHandshake} className="me-1" />
                  All ({stats.totalParties})
                </span>
              }
            />
            <Tab
              eventKey="customer"
              title={
                <span>
                  <FontAwesomeIcon icon={faUser} className="me-1" />
                  Customers ({stats.customers})
                </span>
              }
            />
            <Tab
              eventKey="supplier"
              title={
                <span>
                  <FontAwesomeIcon icon={faIndustry} className="me-1" />
                  Suppliers ({stats.suppliers})
                </span>
              }
            />
            <Tab
              eventKey="vendor"
              title={
                <span>
                  <FontAwesomeIcon icon={faBuilding} className="me-1" />
                  Vendors ({stats.vendors})
                </span>
              }
            />
          </Tabs>

          {/* Search and Filters */}
          <Row className="g-3">
            <Col md={2}>
              <InputGroup size="sm">
                <InputGroup.Text className="neutral-input-group-text border-end-0">
                  <FontAwesomeIcon icon={faSearch} />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search parties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="neutral-input border-start-0"
                />
              </InputGroup>
            </Col>
            <Col md={2}>
              <Form.Select
                size="sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="neutral-input"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                size="sm"
                value={balanceFilter}
                onChange={(e) => setBalanceFilter(e.target.value)}
                className="neutral-input"
              >
                <option value="all">All Balances</option>
                <option value="positive">Credit Balance</option>
                <option value="negative">Debit Balance</option>
                <option value="zero">Zero Balance</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                size="sm"
                value={gstFilter}
                onChange={(e) => setGstFilter(e.target.value)}
                className="neutral-input"
              >
                <option value="all">All GST</option>
                <option value="registered">GST Registered</option>
                <option value="unregistered">Unregistered</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                size="sm"
                value={`${sortBy}-${sortDirection}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split("-");
                  setSortBy(field);
                  setSortDirection(direction);
                }}
                className="neutral-input"
              >
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="currentBalance-desc">Highest Balance</option>
                <option value="currentBalance-asc">Lowest Balance</option>
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <small className="neutral-muted d-block mt-2">
                {filteredParties.length} of {stats.totalParties} parties
              </small>
            </Col>
          </Row>
        </Card.Header>

        <Card.Body className="p-0">
          {filteredParties.length > 0 ? (
            <div
              className="table-responsive"
              style={{maxHeight: "600px", overflowY: "auto"}}
            >
              <Table className="mb-0 clean-table">
                <thead className="sticky-top">
                  <tr>
                    <th>
                      Party Details
                      <FontAwesomeIcon
                        icon={faSort}
                        className="ms-2 text-muted"
                      />
                    </th>
                    <th>Type</th>
                    <th>Contact Info</th>
                    <th>GST Details</th>
                    <th>
                      Balance
                      <FontAwesomeIcon
                        icon={faSort}
                        className="ms-2 text-muted"
                      />
                    </th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParties.map((party) => (
                    <tr key={party._id || party.id} className="item-row">
                      <td>
                        <div>
                          <div className="fw-semibold text-dark mb-1">
                            {party.name}
                          </div>
                          <small className="text-muted">
                            ID: {party._id?.slice(-8) || "N/A"}
                          </small>
                          {party.companyName && (
                            <>
                              <br />
                              <small className="text-muted">
                                Company: {party.companyName}
                              </small>
                            </>
                          )}
                        </div>
                      </td>
                      <td>{getTypeBadge(party)}</td>
                      <td>
                        <div>
                          {party.phoneNumber && (
                            <div className="text-dark mb-1">
                              <FontAwesomeIcon
                                icon={faPhone}
                                className="me-1 text-muted"
                              />
                              {party.phoneNumber}
                            </div>
                          )}
                          {party.email && (
                            <div className="text-muted small">
                              <FontAwesomeIcon
                                icon={faEnvelope}
                                className="me-1"
                              />
                              {party.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          {party.gstNumber || party.gstNo || party.taxNumber ? (
                            <>
                              <div className="text-dark fw-semibold">
                                {party.gstNumber ||
                                  party.gstNo ||
                                  party.taxNumber}
                              </div>
                              <small className="text-muted">
                                {party.gstType || "Registered"}
                              </small>
                            </>
                          ) : (
                            <Badge bg="light" text="dark" className="fw-normal">
                              Unregistered
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <div
                            className={`fw-bold ${
                              getPartyBalance(party) >= 0
                                ? "text-success"
                                : "text-danger"
                            }`}
                          >
                            {formatCurrency(getPartyBalance(party))}
                          </div>
                          {party.creditLimit > 0 && (
                            <small className="text-muted">
                              Limit: {formatCurrency(party.creditLimit)}
                            </small>
                          )}
                        </div>
                      </td>
                      <td>{getStatusBadge(party)}</td>
                      <td>
                        <span className="text-muted small">
                          {formatDate(party.createdAt)}
                        </span>
                      </td>
                      <td>
                        <Dropdown>
                          <Dropdown.Toggle
                            variant="link"
                            className="text-muted p-0 border-0 shadow-none"
                            disabled={isLoadingAction}
                          >
                            <FontAwesomeIcon icon={faEllipsisV} />
                          </Dropdown.Toggle>
                          <Dropdown.Menu align="end">
                            <Dropdown.Item
                              onClick={() => handlePartyAction("view", party)}
                            >
                              <FontAwesomeIcon icon={faEye} className="me-2" />
                              View Details
                            </Dropdown.Item>
                            <Dropdown.Item
                              onClick={() => handlePartyAction("ledger", party)}
                            >
                              <FontAwesomeIcon
                                icon={faHistory}
                                className="me-2"
                              />
                              View Ledger
                            </Dropdown.Item>
                            <Dropdown.Item
                              onClick={() =>
                                handlePartyAction("statement", party)
                              }
                            >
                              <FontAwesomeIcon
                                icon={faFileInvoice}
                                className="me-2"
                              />
                              Generate Statement
                            </Dropdown.Item>
                            {(userRole === "owner" || userRole === "admin") && (
                              <>
                                <Dropdown.Divider />
                                <Dropdown.Item
                                  onClick={() =>
                                    handlePartyAction("edit", party)
                                  }
                                >
                                  <FontAwesomeIcon
                                    icon={faEdit}
                                    className="me-2"
                                  />
                                  Edit Party
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item
                                  onClick={() =>
                                    handlePartyAction("delete", party)
                                  }
                                  className="text-danger"
                                >
                                  <FontAwesomeIcon
                                    icon={faTrash}
                                    className="me-2"
                                  />
                                  Delete Party
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
            <div className="text-center py-5">
              <FontAwesomeIcon
                icon={faHandshake}
                className="fs-1 text-muted mb-3"
              />
              <h6 className="text-muted">No parties found</h6>
              <p className="text-muted">
                {searchQuery ||
                statusFilter !== "all" ||
                balanceFilter !== "all" ||
                gstFilter !== "all" ||
                activeTab !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "This company hasn't added any business parties yet"}
              </p>
              {(searchQuery ||
                statusFilter !== "all" ||
                balanceFilter !== "all" ||
                gstFilter !== "all" ||
                activeTab !== "all") && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={clearAllFilters}
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Party Details Modal */}
      <Modal
        show={showPartyModal}
        onHide={() => setShowPartyModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon icon={faHandshake} className="me-2" />
            Party Details - {selectedParty?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedParty && (
            <Row>
              <Col md={6}>
                <Card className="border-0 bg-light mb-3">
                  <Card.Header className="bg-primary text-white">
                    <h6 className="mb-0">
                      <FontAwesomeIcon icon={faBuilding} className="me-2" />
                      Basic Information
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <p>
                      <strong>Name:</strong> {selectedParty.name}
                    </p>
                    <p>
                      <strong>Type:</strong> {getTypeBadge(selectedParty)}
                    </p>
                    <p>
                      <strong>Status:</strong> {getStatusBadge(selectedParty)}
                    </p>
                    {selectedParty.companyName && (
                      <p>
                        <strong>Company:</strong> {selectedParty.companyName}
                      </p>
                    )}
                    {(selectedParty.gstNumber ||
                      selectedParty.gstNo ||
                      selectedParty.taxNumber) && (
                      <p>
                        <strong>GST Number:</strong>{" "}
                        {selectedParty.gstNumber ||
                          selectedParty.gstNo ||
                          selectedParty.taxNumber}
                      </p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="border-0 bg-light mb-3">
                  <Card.Header className="bg-info text-white">
                    <h6 className="mb-0">
                      <FontAwesomeIcon icon={faPhone} className="me-2" />
                      Contact Information
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    {selectedParty.phoneNumber && (
                      <p>
                        <strong>Phone:</strong> {selectedParty.phoneNumber}
                      </p>
                    )}
                    {selectedParty.email && (
                      <p>
                        <strong>Email:</strong> {selectedParty.email}
                      </p>
                    )}
                    {selectedParty.homeAddressLine && (
                      <div>
                        <strong>Address:</strong>
                        <address className="ms-3">
                          {selectedParty.homeAddressLine}
                          {selectedParty.homeCity && (
                            <>
                              <br />
                              {selectedParty.homeCity},{" "}
                              {selectedParty.homeState}
                            </>
                          )}
                          {selectedParty.homePincode && (
                            <>
                              <br />
                              {selectedParty.homePincode}
                            </>
                          )}
                        </address>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              <Col md={12}>
                <Card className="border-0 bg-light">
                  <Card.Header className="bg-success text-white">
                    <h6 className="mb-0">
                      <FontAwesomeIcon icon={faChartLine} className="me-2" />
                      Financial Summary
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={4}>
                        <div className="text-center">
                          <h5
                            className={
                              getPartyBalance(selectedParty) >= 0
                                ? "text-success"
                                : "text-danger"
                            }
                          >
                            {formatCurrency(getPartyBalance(selectedParty))}
                          </h5>
                          <small className="text-muted">Current Balance</small>
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="text-center">
                          <h5 className="text-info">
                            {formatCurrency(selectedParty.creditLimit || 0)}
                          </h5>
                          <small className="text-muted">Credit Limit</small>
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="text-center">
                          <h5 className="text-primary">
                            {formatDate(selectedParty.createdAt)}
                          </h5>
                          <small className="text-muted">Created On</small>
                        </div>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPartyModal(false)}>
            Close
          </Button>
          <Button
            variant="info"
            onClick={() => handlePartyAction("ledger", selectedParty)}
          >
            <FontAwesomeIcon icon={faHistory} className="me-2" />
            View Ledger
          </Button>
          <Button
            variant="primary"
            onClick={() => handlePartyAction("statement", selectedParty)}
          >
            <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
            Generate Statement
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">
            <FontAwesomeIcon icon={faTrash} className="me-2" />
            Delete Party
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedParty && (
            <div>
              <Alert variant="danger">
                <FontAwesomeIcon
                  icon={faExclamationTriangle}
                  className="me-2"
                />
                <strong>Warning:</strong> This action cannot be undone.
              </Alert>
              <p>
                Are you sure you want to delete{" "}
                <strong>{selectedParty.name}</strong>?
              </p>
              <div className="bg-light p-3 rounded">
                <div>
                  <strong>Type:</strong>{" "}
                  {selectedParty.partyType || selectedParty.type}
                </div>
                <div>
                  <strong>Balance:</strong>{" "}
                  {formatCurrency(getPartyBalance(selectedParty))}
                </div>
                {selectedParty.phoneNumber && (
                  <div>
                    <strong>Phone:</strong> {selectedParty.phoneNumber}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
            disabled={isLoadingAction}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteParty}
            disabled={isLoadingAction}
          >
            {isLoadingAction ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Deleting...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faTrash} className="me-2" />
                Delete Party
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Styles - Same as CompanyTransactions */}
      <style jsx>{`
        /* Neutral header styles */
        .neutral-header {
          background: linear-gradient(
            135deg,
            #f8f9fa 0%,
            #f1f3f4 100%
          ) !important;
          border-bottom: 1px solid #e5e7eb !important;
        }

        .neutral-text {
          color: #374151 !important;
        }

        .neutral-muted {
          color: #6b7280 !important;
        }

        .neutral-input {
          border-color: #d1d5db !important;
          color: #374151 !important;
          background-color: white !important;
        }

        .neutral-input:focus {
          border-color: #9ca3af !important;
          box-shadow: 0 0 0 0.2rem rgba(156, 163, 175, 0.25) !important;
        }

        .neutral-input-group-text {
          background-color: #f9fafb !important;
          border-color: #d1d5db !important;
          color: #6b7280 !important;
        }

        .neutral-button {
          border-color: #d1d5db !important;
          color: #6b7280 !important;
          background-color: white !important;
        }

        .neutral-button:hover {
          border-color: #9ca3af !important;
          color: #374151 !important;
          background-color: #f9fafb !important;
        }

        /* Clickable card styles */
        .clickable-card {
          transition: all 0.3s ease;
          border: 2px solid transparent !important;
          cursor: pointer;
        }

        .clickable-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          border-color: #007bff !important;
        }

        .active-card {
          border-color: #007bff !important;
          background: linear-gradient(
            135deg,
            #f8f9ff 0%,
            #e6f3ff 100%
          ) !important;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2) !important;
        }

        .stat-icon {
          font-size: 1.5rem;
          display: block;
          transition: transform 0.2s ease;
        }

        .clickable-card:hover .stat-icon {
          transform: scale(1.1);
        }

        /* Neutral tabs */
        .neutral-tabs .nav-link {
          color: #6b7280 !important;
          border: none !important;
          padding: 0.75rem 1rem !important;
          font-weight: 500 !important;
        }

        .neutral-tabs .nav-link.active {
          color: #374151 !important;
          background: none !important;
          border: none !important;
          border-bottom: 2px solid #374151 !important;
        }

        .neutral-tabs .nav-link:hover {
          color: #374151 !important;
          border-color: transparent !important;
        }

        /* Clean table styles */
        .clean-table {
          border-collapse: separate;
          border-spacing: 0;
        }

        .clean-table thead th {
          background: #f8f9fa;
          border: none;
          border-bottom: 2px solid #dee2e6;
          font-weight: 600;
          font-size: 0.875rem;
          color: #495057;
          padding: 1rem;
          vertical-align: middle;
          white-space: nowrap;
        }

        .clean-table tbody td {
          background: white;
          border: none;
          border-bottom: 1px solid #f1f3f4;
          padding: 1rem;
          vertical-align: middle;
          font-size: 0.875rem;
        }

        .item-row {
          transition: background-color 0.2s ease;
        }

        .item-row:hover {
          background-color: #f8f9fa !important;
        }

        .item-row:hover td {
          background: transparent;
        }

        .badge {
          font-weight: 500;
          font-size: 0.75rem;
          padding: 0.35em 0.65em;
        }

        /* Sticky table header for scrolling */
        .sticky-top {
          position: sticky;
          top: 0;
          z-index: 10;
        }

        /* Hover effects for better UX */
        .clickable-card .card-body {
          transition: all 0.2s ease;
        }

        .clickable-card:hover .card-body {
          color: #007bff !important;
        }

        .clickable-card:hover h4 {
          color: #007bff !important;
        }

        .active-card .card-body {
          color: #0056b3 !important;
        }

        .active-card h4 {
          color: #0056b3 !important;
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .clean-table thead th,
          .clean-table tbody td {
            padding: 0.75rem 0.5rem;
            font-size: 0.8rem;
          }

          .stat-icon {
            font-size: 1.2rem;
          }

          .clickable-card:hover {
            transform: translateY(-1px);
          }

          .active-card {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}

export default CompanyParties;
