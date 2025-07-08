import React, {useState, useEffect} from "react";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Badge,
  Form,
  InputGroup,
  Dropdown,
  Modal,
  Alert,
  Spinner,
  Tabs,
  Tab,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faFileInvoice,
  faDownload,
  faEye,
  faEdit,
  faTrash,
  faSearch,
  faSort,
  faPlus,
  faEllipsisV,
  faCalendarAlt,
  faCheckCircle,
  faExclamationTriangle,
  faTimesCircle,
  faClock,
  faRupeeSign,
  faShoppingCart,
  faReceipt,
  faSync,
} from "@fortawesome/free-solid-svg-icons";

import salesService from "../../../../services/salesService";
import purchaseService from "../../../../services/purchaseService";

function CompanyInvoices({companyId, companyData, userRole, addToast}) {
  // ✅ State management
  const [allInvoices, setAllInvoices] = useState([]);
  const [salesInvoices, setSalesInvoices] = useState([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  // ✅ Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [activeTab, setActiveTab] = useState("all");

  // ✅ Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // ✅ Stats state
  const [stats, setStats] = useState({
    totalInvoices: 0,
    salesInvoices: 0,
    purchaseInvoices: 0,
    totalAmount: 0,
    salesAmount: 0,
    purchaseAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
  });

  // ✅ Load data on component mount
  useEffect(() => {
    if (companyId) {
      loadInvoices();
    }
  }, [companyId]);

  // ✅ Apply filters when data or filters change
  useEffect(() => {
    filterAndSortInvoices();
  }, [
    allInvoices,
    salesInvoices,
    purchaseInvoices,
    searchQuery,
    statusFilter,
    typeFilter,
    sortBy,
    sortDirection,
    activeTab,
  ]);

  // ✅ Load invoices with enhanced stats calculation
  const loadInvoices = async () => {
    try {
      setIsLoading(true);

      const [salesResponse, purchaseResponse] = await Promise.all([
        salesService.getInvoices(companyId),
        purchaseService.getPurchases(companyId),
      ]);

      let salesData = [];
      if (salesResponse.success && salesResponse.data) {
        salesData = Array.isArray(salesResponse.data)
          ? salesResponse.data
          : salesResponse.data.sales || salesResponse.data.invoices || [];

        salesData = salesData.map((invoice) => ({
          ...invoice,
          invoiceType: "sales",
          invoiceNumber:
            invoice.invoiceNumber ||
            invoice.saleNumber ||
            `SALES-${invoice._id?.slice(-6)}`,
          customerName:
            invoice.customerName ||
            invoice.customer?.name ||
            "Unknown Customer",
          totalAmount:
            invoice.totals?.finalTotal || invoice.amount || invoice.total || 0,
          status: invoice.status || "pending",
          createdAt:
            invoice.createdAt ||
            invoice.invoiceDate ||
            new Date().toISOString(),
          dueDate: invoice.payment?.dueDate || null,
          paidAmount: invoice.payment?.paidAmount || 0,
          pendingAmount: invoice.payment?.pendingAmount || 0,
          paymentStatus: invoice.payment?.status || "pending",
        }));
      }

      let purchaseData = [];
      if (purchaseResponse.success && purchaseResponse.data) {
        const rawPurchases =
          purchaseResponse.data.purchases || purchaseResponse.data || [];
        purchaseData = Array.isArray(rawPurchases) ? rawPurchases : [];

        purchaseData = purchaseData.map((purchase) => ({
          ...purchase,
          invoiceType: "purchase",
          invoiceNumber:
            purchase.purchaseNumber ||
            purchase.billNumber ||
            `PURCHASE-${purchase._id?.slice(-6)}`,
          customerName:
            purchase.supplierName ||
            purchase.supplier?.name ||
            "Unknown Supplier",
          totalAmount:
            purchase.totals?.finalTotal ||
            purchase.amount ||
            purchase.total ||
            0,
          status: purchase.status || "pending",
          createdAt:
            purchase.createdAt ||
            purchase.purchaseDate ||
            new Date().toISOString(),
          dueDate: purchase.payment?.dueDate || purchase.dueDate || null,
          paidAmount:
            purchase.payment?.paidAmount || purchase.paymentReceived || 0,
          pendingAmount:
            purchase.payment?.pendingAmount ||
            (purchase.totals?.finalTotal || 0) -
              (purchase.payment?.paidAmount || purchase.paymentReceived || 0),
          paymentStatus:
            purchase.payment?.status ||
            (purchase.payment?.paidAmount >= purchase.totals?.finalTotal
              ? "paid"
              : "pending"),
        }));
      }

      setSalesInvoices(salesData);
      setPurchaseInvoices(purchaseData);

      const combinedInvoices = [...salesData, ...purchaseData];
      setAllInvoices(combinedInvoices);

      // ✅ Enhanced stats calculation
      const salesTotal = salesData.reduce(
        (sum, inv) => sum + (inv.totalAmount || 0),
        0
      );
      const purchaseTotal = purchaseData.reduce(
        (sum, inv) => sum + (inv.totalAmount || 0),
        0
      );
      const totalPaid = combinedInvoices.reduce(
        (sum, inv) => sum + (inv.paidAmount || 0),
        0
      );
      const totalPending = combinedInvoices.reduce(
        (sum, inv) => sum + (inv.pendingAmount || 0),
        0
      );

      const today = new Date();
      const overdueInvoices = combinedInvoices.filter(
        (inv) =>
          inv.dueDate && new Date(inv.dueDate) < today && inv.pendingAmount > 0
      );
      const overdueAmount = overdueInvoices.reduce(
        (sum, inv) => sum + inv.pendingAmount,
        0
      );

      const paidInvoices = combinedInvoices.filter(
        (inv) => inv.paymentStatus === "paid"
      ).length;
      const pendingInvoices = combinedInvoices.filter(
        (inv) =>
          inv.paymentStatus === "pending" || inv.paymentStatus === "partial"
      ).length;

      setStats({
        totalInvoices: combinedInvoices.length,
        salesInvoices: salesData.length,
        purchaseInvoices: purchaseData.length,
        totalAmount: salesTotal + purchaseTotal,
        salesAmount: salesTotal,
        purchaseAmount: purchaseTotal,
        paidAmount: totalPaid,
        pendingAmount: totalPending,
        overdueAmount: overdueAmount,
        paidInvoices,
        pendingInvoices,
        overdueInvoices: overdueInvoices.length,
      });

      addToast?.("Invoices loaded successfully", "success");
    } catch (error) {
      console.error("❌ Error loading invoices:", error);
      addToast?.("Error loading invoices", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Handle card click for filtering
  const handleCardClick = (filterType, filterValue) => {
    console.log("🔄 Card clicked:", filterType, filterValue);

    // Reset all filters first
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");

    // Apply the specific filter
    switch (filterType) {
      case "tab":
        setActiveTab(filterValue);
        break;
      case "status":
        setActiveTab("all");
        setStatusFilter(filterValue);
        break;
      case "type":
        setActiveTab("all");
        setTypeFilter(filterValue);
        break;
      default:
        setActiveTab(filterValue);
    }
  };

  // ✅ Enhanced filter and sort function
  const filterAndSortInvoices = () => {
    let filtered = [];

    console.log("🔍 Filtering invoices:", {
      totalInvoices: allInvoices.length,
      activeTab,
      statusFilter,
      typeFilter,
      searchQuery,
    });

    // ✅ Apply tab filter first
    switch (activeTab) {
      case "sales":
        filtered = [...salesInvoices];
        break;
      case "purchase":
        filtered = [...purchaseInvoices];
        break;
      default:
        filtered = [...allInvoices];
    }
    console.log(`📋 After tab filter (${activeTab}):`, filtered.length);

    // ✅ Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoiceNumber?.toLowerCase().includes(query) ||
          invoice.customerName?.toLowerCase().includes(query) ||
          invoice.supplierName?.toLowerCase().includes(query) ||
          invoice._id?.toLowerCase().includes(query)
      );
      console.log(`🔍 After search filter:`, filtered.length);
    }

    // ✅ Apply status filter
    if (statusFilter !== "all") {
      if (statusFilter === "overdue") {
        const today = new Date();
        filtered = filtered.filter(
          (invoice) =>
            invoice.dueDate &&
            new Date(invoice.dueDate) < today &&
            invoice.pendingAmount > 0
        );
      } else {
        filtered = filtered.filter(
          (invoice) => invoice.paymentStatus === statusFilter
        );
      }
      console.log(`💰 After status filter (${statusFilter}):`, filtered.length);
    }

    // ✅ Apply type filter (only when on "all" tab)
    if (activeTab === "all" && typeFilter !== "all") {
      filtered = filtered.filter(
        (invoice) => invoice.invoiceType === typeFilter
      );
      console.log(`🏷️ After type filter (${typeFilter}):`, filtered.length);
    }

    // ✅ Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === "createdAt" || sortBy === "dueDate") {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      } else if (sortBy === "totalAmount" || sortBy === "paidAmount") {
        aValue = Number(aValue || 0);
        bValue = Number(bValue || 0);
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

    console.log("✅ Final filtered invoices:", filtered.length);
    setFilteredInvoices(filtered);
  };

  // ✅ Clear all filters
  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setActiveTab("all");
    addToast?.("All filters cleared", "info");
  };

  // ✅ Enhanced badge functions
  const getStatusBadge = (
    paymentStatus,
    invoiceType,
    pendingAmount,
    dueDate
  ) => {
    const isOverdue =
      dueDate && new Date(dueDate) < new Date() && pendingAmount > 0;

    if (isOverdue) {
      return (
        <Badge bg="danger" className="fw-normal">
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
          OVERDUE
        </Badge>
      );
    }

    const variants = {
      paid: {color: "success", icon: faCheckCircle},
      pending: {color: "warning", icon: faClock},
      partial: {color: "info", icon: faExclamationTriangle},
      cancelled: {color: "secondary", icon: faTimesCircle},
      completed: {color: "success", icon: faCheckCircle},
    };

    const variant = variants[paymentStatus] || variants.pending;

    return (
      <Badge bg={variant.color} className="fw-normal">
        <FontAwesomeIcon icon={variant.icon} className="me-1" />
        {paymentStatus?.toUpperCase() || "PENDING"}
      </Badge>
    );
  };

  const getTypeBadge = (invoiceType) => {
    const variants = {
      sales: {color: "primary", icon: faReceipt, label: "SALES"},
      purchase: {color: "success", icon: faShoppingCart, label: "PURCHASE"},
    };

    const variant = variants[invoiceType] || {
      color: "secondary",
      icon: faFileInvoice,
      label: "INVOICE",
    };

    return (
      <Badge bg={variant.color} className="fw-normal">
        <FontAwesomeIcon icon={variant.icon} className="me-1" />
        {variant.label}
      </Badge>
    );
  };

  // ✅ Handle invoice actions
  const handleInvoiceAction = async (action, invoice) => {
    setIsLoadingAction(true);

    try {
      switch (action) {
        case "view":
          addToast?.(
            `View ${invoice.invoiceType} invoice functionality coming soon`,
            "info"
          );
          break;
        case "edit":
          addToast?.(
            `Edit ${invoice.invoiceType} invoice functionality coming soon`,
            "info"
          );
          break;
        case "download":
          addToast?.("Downloading invoice...", "success");
          break;
        case "delete":
          setSelectedInvoice(invoice);
          setShowDeleteModal(true);
          break;
        case "refresh":
          await loadInvoices();
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

  // ✅ Handle delete invoice
  const handleDeleteInvoice = async () => {
    try {
      if (!selectedInvoice) return;

      setIsLoadingAction(true);

      let response;
      if (selectedInvoice.invoiceType === "sales") {
        response = await salesService.deleteInvoice(selectedInvoice._id, {
          reason: "Admin deletion",
          force: false,
        });
      } else {
        response = await purchaseService.deletePurchase(selectedInvoice._id, {
          reason: "Admin deletion",
          force: false,
        });
      }

      if (response.success) {
        addToast?.("Invoice deleted successfully", "success");
        await loadInvoices();
      } else {
        addToast?.(response.message || "Error deleting invoice", "error");
      }
    } catch (error) {
      addToast?.("Error deleting invoice", "error");
    } finally {
      setShowDeleteModal(false);
      setSelectedInvoice(null);
      setIsLoadingAction(false);
    }
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

  const getOverdueDays = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  };

  // ✅ Loading state
  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <h5 className="mt-3 text-muted">Loading invoices...</h5>
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
              typeFilter === "all"
                ? "active-card"
                : ""
            }`}
            onClick={() => handleCardClick("tab", "all")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faFileInvoice}
                className="stat-icon text-primary mb-2"
              />
              <h4 className="text-dark mb-1">{stats.totalInvoices}</h4>
              <small className="text-muted">Total Invoices</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              activeTab === "sales" ? "active-card" : ""
            }`}
            onClick={() => handleCardClick("tab", "sales")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faReceipt}
                className="stat-icon text-primary mb-2"
              />
              <h4 className="text-dark mb-1">{stats.salesInvoices}</h4>
              <small className="text-muted">Sales Invoices</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              activeTab === "purchase" ? "active-card" : ""
            }`}
            onClick={() => handleCardClick("tab", "purchase")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faShoppingCart}
                className="stat-icon text-success mb-2"
              />
              <h4 className="text-dark mb-1">{stats.purchaseInvoices}</h4>
              <small className="text-muted">Purchase Bills</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center h-100">
            <Card.Body>
              <FontAwesomeIcon
                icon={faRupeeSign}
                className="stat-icon text-success mb-2"
              />
              <h4 className="text-dark mb-1">
                {formatCurrency(stats.totalAmount)}
              </h4>
              <small className="text-muted">Total Amount</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Payment Status Stats */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              statusFilter === "paid" ? "active-card" : ""
            }`}
            onClick={() => handleCardClick("status", "paid")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faCheckCircle}
                className="stat-icon text-success mb-2"
              />
              <h4 className="text-dark mb-1">{stats.paidInvoices}</h4>
              <small className="text-muted">Paid Invoices</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              statusFilter === "pending" ? "active-card" : ""
            }`}
            onClick={() => handleCardClick("status", "pending")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faClock}
                className="stat-icon text-warning mb-2"
              />
              <h4 className="text-dark mb-1">{stats.pendingInvoices}</h4>
              <small className="text-muted">Pending Invoices</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              statusFilter === "overdue" ? "active-card" : ""
            }`}
            onClick={() => handleCardClick("status", "overdue")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faExclamationTriangle}
                className="stat-icon text-danger mb-2"
              />
              <h4 className="text-dark mb-1">{stats.overdueInvoices}</h4>
              <small className="text-muted">Overdue Invoices</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center h-100">
            <Card.Body>
              <FontAwesomeIcon
                icon={faRupeeSign}
                className="stat-icon text-danger mb-2"
              />
              <h4 className="text-dark mb-1">
                {formatCurrency(stats.overdueAmount)}
              </h4>
              <small className="text-muted">Overdue Amount</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Invoices Card */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="neutral-header">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0 fw-semibold neutral-text">
              <FontAwesomeIcon
                icon={faFileInvoice}
                className="me-2 neutral-muted"
              />
              Invoices ({filteredInvoices.length})
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
                onClick={() => handleInvoiceAction("refresh")}
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
                  <FontAwesomeIcon icon={faFileInvoice} className="me-1" />
                  All ({stats.totalInvoices})
                </span>
              }
            />
            <Tab
              eventKey="sales"
              title={
                <span>
                  <FontAwesomeIcon icon={faReceipt} className="me-1" />
                  Sales ({stats.salesInvoices})
                </span>
              }
            />
            <Tab
              eventKey="purchase"
              title={
                <span>
                  <FontAwesomeIcon icon={faShoppingCart} className="me-1" />
                  Purchases ({stats.purchaseInvoices})
                </span>
              }
            />
          </Tabs>

          {/* Search and Filters */}
          <Row className="g-3">
            <Col md={3}>
              <InputGroup size="sm">
                <InputGroup.Text className="neutral-input-group-text border-end-0">
                  <FontAwesomeIcon icon={faSearch} />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search invoices..."
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
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </Form.Select>
            </Col>
            {activeTab === "all" && (
              <Col md={2}>
                <Form.Select
                  size="sm"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="neutral-input"
                >
                  <option value="all">All Types</option>
                  <option value="sales">Sales Only</option>
                  <option value="purchase">Purchase Only</option>
                </Form.Select>
              </Col>
            )}
            <Col md={3}>
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
                <option value="createdAt-desc">Latest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="dueDate-asc">Due Date</option>
                <option value="totalAmount-desc">Highest Amount</option>
                <option value="customerName-asc">Customer A-Z</option>
                <option value="invoiceNumber-asc">Invoice Number</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <small className="neutral-muted d-block mt-2">
                {filteredInvoices.length} of{" "}
                {activeTab === "all"
                  ? stats.totalInvoices
                  : activeTab === "sales"
                  ? stats.salesInvoices
                  : stats.purchaseInvoices}{" "}
                invoices
              </small>
            </Col>
          </Row>
        </Card.Header>

        <Card.Body className="p-0">
          {filteredInvoices.length > 0 ? (
            <div className="table-responsive">
              <Table className="mb-0 clean-table">
                <thead>
                  <tr>
                    <th>
                      Invoice Details
                      <FontAwesomeIcon
                        icon={faSort}
                        className="ms-2 text-muted"
                      />
                    </th>
                    <th>
                      Type
                      <FontAwesomeIcon
                        icon={faSort}
                        className="ms-2 text-muted"
                      />
                    </th>
                    <th>Customer/Supplier</th>
                    <th>
                      Amount
                      <FontAwesomeIcon
                        icon={faSort}
                        className="ms-2 text-muted"
                      />
                    </th>
                    <th>Payment Status</th>
                    <th>Due Date</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => {
                    const overdueDays = getOverdueDays(invoice.dueDate);
                    return (
                      <tr
                        key={`${invoice.invoiceType}-${invoice._id}`}
                        className="item-row"
                      >
                        <td>
                          <div>
                            <div className="fw-semibold text-dark mb-1">
                              {invoice.invoiceNumber}
                            </div>
                            <small className="text-muted">
                              ID: {invoice._id?.slice(-8) || "N/A"}
                            </small>
                          </div>
                        </td>
                        <td>{getTypeBadge(invoice.invoiceType)}</td>
                        <td>
                          <div className="text-dark fw-semibold">
                            {invoice.customerName}
                          </div>
                          {invoice.invoiceType === "sales" &&
                            invoice.customer?.mobile && (
                              <small className="text-muted">
                                {invoice.customer.mobile}
                              </small>
                            )}
                        </td>
                        <td>
                          <div>
                            <div className="fw-bold text-dark">
                              {formatCurrency(invoice.totalAmount)}
                            </div>
                            {invoice.paidAmount > 0 && (
                              <small className="text-success">
                                Paid: {formatCurrency(invoice.paidAmount)}
                              </small>
                            )}
                            {invoice.pendingAmount > 0 && (
                              <small className="text-warning d-block">
                                Pending: {formatCurrency(invoice.pendingAmount)}
                              </small>
                            )}
                          </div>
                        </td>
                        <td>
                          <div>
                            {getStatusBadge(
                              invoice.paymentStatus,
                              invoice.invoiceType,
                              invoice.pendingAmount,
                              invoice.dueDate
                            )}
                            {overdueDays && (
                              <small className="text-danger d-block mt-1">
                                {overdueDays} days overdue
                              </small>
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`${
                              overdueDays ? "text-danger fw-bold" : "text-dark"
                            }`}
                          >
                            {formatDate(invoice.dueDate)}
                          </span>
                        </td>
                        <td>
                          <span className="text-muted">
                            {formatDate(invoice.createdAt)}
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
                                onClick={() =>
                                  handleInvoiceAction("view", invoice)
                                }
                              >
                                <FontAwesomeIcon
                                  icon={faEye}
                                  className="me-2"
                                />
                                View Invoice
                              </Dropdown.Item>
                              <Dropdown.Item
                                onClick={() =>
                                  handleInvoiceAction("download", invoice)
                                }
                              >
                                <FontAwesomeIcon
                                  icon={faDownload}
                                  className="me-2"
                                />
                                Download PDF
                              </Dropdown.Item>
                              {(userRole === "owner" ||
                                userRole === "admin") && (
                                <>
                                  <Dropdown.Divider />
                                  <Dropdown.Item
                                    onClick={() =>
                                      handleInvoiceAction("edit", invoice)
                                    }
                                  >
                                    <FontAwesomeIcon
                                      icon={faEdit}
                                      className="me-2"
                                    />
                                    Edit Invoice
                                  </Dropdown.Item>
                                  <Dropdown.Divider />
                                  <Dropdown.Item
                                    onClick={() =>
                                      handleInvoiceAction("delete", invoice)
                                    }
                                    className="text-danger"
                                  >
                                    <FontAwesomeIcon
                                      icon={faTrash}
                                      className="me-2"
                                    />
                                    Delete
                                  </Dropdown.Item>
                                </>
                              )}
                            </Dropdown.Menu>
                          </Dropdown>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-5">
              <FontAwesomeIcon
                icon={faFileInvoice}
                className="fs-1 text-muted mb-3"
              />
              <h6 className="text-muted">No invoices found</h6>
              <p className="text-muted">
                {searchQuery ||
                statusFilter !== "all" ||
                typeFilter !== "all" ||
                activeTab !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : `No ${
                      activeTab === "all" ? "" : activeTab
                    } invoices have been created yet`}
              </p>
              {(searchQuery ||
                statusFilter !== "all" ||
                typeFilter !== "all" ||
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

      {/* Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">
            <FontAwesomeIcon icon={faTrash} className="me-2" />
            Delete Invoice
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            <strong>Warning!</strong> This action will delete the invoice.
          </Alert>
          <p>
            Are you sure you want to delete {selectedInvoice?.invoiceType}{" "}
            invoice <strong>{selectedInvoice?.invoiceNumber}</strong>?
          </p>
          <div className="bg-light p-3 rounded">
            <div>
              <strong>Customer/Supplier:</strong>{" "}
              {selectedInvoice?.customerName}
            </div>
            <div>
              <strong>Amount:</strong>{" "}
              {formatCurrency(selectedInvoice?.totalAmount || 0)}
            </div>
            <div>
              <strong>Status:</strong> {selectedInvoice?.paymentStatus}
            </div>
          </div>
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
            onClick={handleDeleteInvoice}
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
                Delete Invoice
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Styles - Same as CompanyParties */}
      <style>{`
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

export default CompanyInvoices;
