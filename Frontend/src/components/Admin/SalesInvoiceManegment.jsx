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
  Tooltip,
} from "react-bootstrap";
import {createPortal} from "react-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faPlus,
  faEdit,
  faTrash,
  faBuilding,
  faEye,
  faBoxes,
  faList,
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
  faTags,
  faBarcode,
  faDollarSign,
  faWarehouse,
  faInfoCircle,
  faCog,
  faAdjust,
  faHistory,
  faLayerGroup,
  faCalendarAlt,
  faChevronUp,
  faChevronDown,
  faExclamation,
  faCheckCircle,
  faTimesCircle,
  faArrowUp,
  faArrowDown,
  faExchangeAlt,
  faUsers,
  faShoppingCart,
  faChartLine,
  faGlobe,
  faFileInvoice,
  faClipboardList,
  faHandshake,
  faTruck,
  faSpinner,
  faReceipt,
  faClock,
  faMoneyBillWave,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";
import {format, parseISO, isValid} from "date-fns";
import salesService from "../../services/salesService";
import transactionService from "../../services/transactionService";
// import "./SalesInvoiceManagement.css";

function SalesInvoiceManagement({
  companyId,
  userRole = "admin",
  isAdmin = true,
  adminData,
  currentUser,
  addToast,
}) {
  const navigate = useNavigate();

  // State management
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [sortField, setSortField] = useState("invoiceDate");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [invoicesPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  // Dropdown state
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({x: 0, y: 0});
  const dropdownRef = useRef(null);

  // Statistics state
  const [dashboardStats, setDashboardStats] = useState({
    totalSales: 0,
    totalAmount: 0,
    activeCompanies: 0,
    thisMonthSales: 0,
    thisMonthAmount: 0,
    salesGrowth: 0,
    amountGrowth: 0,
  });

  const [paymentSummary, setPaymentSummary] = useState({
    totalSales: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    overdueCount: 0,
  });

  // Grouped data for different tabs
  const [groupedSales, setGroupedSales] = useState({
    all: [],
    paid: [],
    partial: [],
    pending: [],
    overdue: [],
    dueToday: [],
  });

  // Load data on component mount and when filters change
  useEffect(() => {
    loadData();
    loadStatistics();
  }, [
    currentPage,
    searchQuery,
    statusFilter,
    paymentStatusFilter,
    companyFilter,
    sortField,
    sortDirection,
    activeTab,
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

  // Load sales invoices data
  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await loadSalesInvoices();
    } catch (err) {
      setError(err.message || "Failed to load data");
      addToast?.(err.message || "Failed to load data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Load sales invoices for admin
  const loadSalesInvoices = async () => {
    try {
      const filterParams = {
        page: currentPage,
        limit: invoicesPerPage,
        search: searchQuery,
        status: statusFilter !== "all" ? statusFilter : "",
        paymentStatus: paymentStatusFilter !== "all" ? paymentStatusFilter : "",
        companyId: companyFilter !== "all" ? companyFilter : "",
        sortBy: sortField,
        sortOrder: sortDirection,
      };

      // Remove empty filters
      Object.keys(filterParams).forEach((key) => {
        if (
          filterParams[key] === "" ||
          filterParams[key] === null ||
          filterParams[key] === undefined
        ) {
          delete filterParams[key];
        }
      });

      const response = await salesService.getAllSalesInvoicesForAdmin(
        filterParams
      );

      if (response.success) {
        const invoices =
          response.data.salesInvoices ||
          response.data.sales ||
          response.data.invoices ||
          response.data.data ||
          [];

        const formattedInvoices = invoices.map((invoice) => ({
          id: invoice._id || invoice.id,
          invoiceNumber: invoice.invoiceNumber || invoice.saleNumber || "N/A",
          companyName:
            invoice.companyId?.businessName || invoice.companyId?.name || "N/A",
          customerName: invoice.customerName || invoice.customer?.name || "N/A",
          customerMobile:
            invoice.customerMobile || invoice.customer?.mobile || "N/A",
          customerEmail:
            invoice.customerEmail || invoice.customer?.email || "N/A",
          invoiceDate:
            invoice.invoiceDate || invoice.saleDate || invoice.createdAt,
          status: invoice.status || "completed",
          totalAmount: invoice.totals?.finalTotal || invoice.amount || 0,
          itemCount: invoice.items?.length || 0,
          paymentStatus: invoice.payment?.status || "pending",
          paidAmount: invoice.payment?.paidAmount || 0,
          pendingAmount: invoice.payment?.pendingAmount || 0,
          dueDate: invoice.payment?.dueDate || null,
          paymentMethod:
            invoice.payment?.method || invoice.paymentMethod || "N/A",
          notes: invoice.notes || "",
          originalData: invoice,
        }));

        setSales(formattedInvoices);
        setTotalInvoices(response.data.count || formattedInvoices.length);
        setTotalPages(
          Math.ceil(
            (response.data.count || formattedInvoices.length) / invoicesPerPage
          )
        );

        // Group sales by payment status
        groupSalesByStatus(formattedInvoices);
      } else {
        throw new Error(response.message || "Failed to load sales invoices");
      }
    } catch (error) {
      throw error;
    }
  };

  // Group sales by payment status
  const groupSalesByStatus = (salesData) => {
    const grouped = {
      all: salesData,
      paid: salesData.filter((s) => s.paymentStatus === "paid"),
      partial: salesData.filter((s) => s.paymentStatus === "partial"),
      pending: salesData.filter((s) => s.paymentStatus === "pending"),
      overdue: salesData.filter((s) => {
        if (s.dueDate && s.pendingAmount > 0) {
          return new Date(s.dueDate) < new Date();
        }
        return false;
      }),
      dueToday: salesData.filter((s) => {
        if (s.dueDate && s.pendingAmount > 0) {
          const today = new Date().toDateString();
          return new Date(s.dueDate).toDateString() === today;
        }
        return false;
      }),
    };

    setGroupedSales(grouped);
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      const [statsResponse, paymentResponse] = await Promise.all([
        salesService.getAdminSalesDashboardSummary(),
        salesService.getSalesStatsForAdmin(),
      ]);

      if (statsResponse.success) {
        setDashboardStats(statsResponse.data);
      }

      if (paymentResponse.success) {
        setPaymentSummary(paymentResponse.data);
      }
    } catch (error) {
      // Handle error silently
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadData(), loadStatistics()]);
    setIsRefreshing(false);
    addToast?.("Data refreshed successfully", "success");
  };

  // Handle dropdown toggle
  const handleDropdownToggle = useCallback(
    (invoiceId, event) => {
      event.stopPropagation();

      if (activeDropdown === invoiceId) {
        setActiveDropdown(null);
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft =
        window.pageXOffset || document.documentElement.scrollLeft;

      setDropdownPosition({
        x: rect.right - 220 + scrollLeft,
        y: rect.bottom + 5 + scrollTop,
      });

      setActiveDropdown(invoiceId);
    },
    [activeDropdown]
  );

  // Handle invoice actions
  const handleInvoiceAction = async (action, sale) => {
    setSelectedSale(sale);
    setActiveDropdown(null);

    switch (action) {
      case "view":
        setModalMode("view");
        setShowInvoiceModal(true);
        break;
      case "edit":
        setModalMode("edit");
        setShowInvoiceModal(true);
        break;
      case "delete":
        await handleDeleteInvoice(sale);
        break;
      case "payment":
        await handleAddPayment(sale);
        break;
      case "updateStatus":
        await handleStatusUpdate(sale);
        break;
      default:
        break;
    }
  };

  // Handle delete invoice
  const handleDeleteInvoice = async (sale) => {
    if (
      !window.confirm(
        `Are you sure you want to delete invoice "${sale.invoiceNumber}"?`
      )
    ) {
      return;
    }

    try {
      setIsActionLoading(true);
      const response = await salesService.deleteSale(sale.id);

      if (response.success) {
        addToast?.("Invoice deleted successfully", "success");
        await loadData();
      } else {
        throw new Error(response.message || "Failed to delete invoice");
      }
    } catch (error) {
      addToast?.(error.message || "Failed to delete invoice", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle add payment
  const handleAddPayment = async (sale) => {
    const paymentAmount = prompt(
      `Enter payment amount (Pending: ₹${sale.pendingAmount}):`
    );
    if (!paymentAmount || isNaN(paymentAmount)) return;

    try {
      setIsActionLoading(true);
      const response = await salesService.addPayment(sale.id, {
        amount: parseFloat(paymentAmount),
        method: "cash",
        date: new Date().toISOString(),
      });

      if (response.success) {
        addToast?.("Payment added successfully", "success");
        await loadData();
      } else {
        throw new Error(response.message || "Failed to add payment");
      }
    } catch (error) {
      addToast?.(error.message || "Failed to add payment", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle status update
  const handleStatusUpdate = async (sale) => {
    const newStatus = prompt(
      "Enter new status (completed, pending, cancelled):"
    );
    if (!newStatus) return;

    try {
      setIsActionLoading(true);
      const response = await salesService.updateSaleStatus(sale.id, newStatus);

      if (response.success) {
        addToast?.(`Invoice status updated to ${newStatus}`, "success");
        await loadData();
      } else {
        throw new Error(response.message || "Failed to update status");
      }
    } catch (error) {
      addToast?.(error.message || "Failed to update status", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      setIsRefreshing(true);
      const filterParams = {
        search: searchQuery,
        status: statusFilter !== "all" ? statusFilter : "",
        paymentStatus: paymentStatusFilter !== "all" ? paymentStatusFilter : "",
        companyId: companyFilter !== "all" ? companyFilter : "",
      };

      const response = await salesService.exportCSV("admin", filterParams);

      if (response.success) {
        addToast?.("Sales invoices exported successfully", "success");
      } else {
        throw new Error(response.message || "Failed to export data");
      }
    } catch (error) {
      addToast?.(error.message || "Failed to export data", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      const parsedDate = typeof date === "string" ? parseISO(date) : date;
      return isValid(parsedDate) ? format(parsedDate, "dd/MM/yyyy") : "N/A";
    } catch {
      return "N/A";
    }
  };

  // Get payment status badge
  const getPaymentStatusBadge = (sale) => {
    const status = sale.paymentStatus;
    const pendingAmount = sale.pendingAmount;
    const dueDate = sale.dueDate;

    let variant = "secondary";
    let icon = faClock;
    let text = "Pending";

    if (status === "paid") {
      variant = "success";
      icon = faCheckCircle;
      text = "Paid";
    } else if (status === "partial") {
      variant = "warning";
      icon = faExclamationCircle;
      text = "Partial";
    } else if (dueDate && pendingAmount > 0) {
      const due = new Date(dueDate);
      const today = new Date();

      if (due < today) {
        variant = "danger";
        icon = faExclamationTriangle;
        text = "Overdue";
      } else if (due.toDateString() === today.toDateString()) {
        variant = "warning";
        icon = faClock;
        text = "Due Today";
      }
    }

    return (
      <Badge bg={variant} className="d-flex align-items-center gap-1">
        <FontAwesomeIcon icon={icon} size="sm" />
        {text}
      </Badge>
    );
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: {variant: "success", icon: faCheckCircle},
      pending: {variant: "warning", icon: faSpinner},
      cancelled: {variant: "danger", icon: faTimesCircle},
      draft: {variant: "secondary", icon: faEdit},
    };

    const config = statusConfig[status?.toLowerCase()] || {
      variant: "secondary",
      icon: faExclamation,
    };

    return (
      <Badge bg={config.variant} className="d-flex align-items-center gap-1">
        <FontAwesomeIcon icon={config.icon} size="sm" />
        {status?.charAt(0).toUpperCase() + status?.slice(1) || "Unknown"}
      </Badge>
    );
  };

  // Custom Portal Dropdown Component
  const PortalDropdown = ({sale, isOpen, position}) => {
    if (!isOpen) return null;

    const dropdownItems = [
      {
        type: "header",
        content: (
          <div className="dropdown-header">
            <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
            Invoice Actions
          </div>
        ),
      },
      {
        type: "item",
        action: "view",
        content: (
          <>
            <FontAwesomeIcon
              icon={faInfoCircle}
              className="me-2 text-primary"
            />
            View Details
          </>
        ),
      },
      {
        type: "item",
        action: "edit",
        content: (
          <>
            <FontAwesomeIcon icon={faEdit} className="me-2 text-warning" />
            Edit Invoice
          </>
        ),
      },
      {
        type: "item",
        action: "payment",
        content: (
          <>
            <FontAwesomeIcon
              icon={faMoneyBillWave}
              className="me-2 text-success"
            />
            Add Payment
          </>
        ),
      },
      {
        type: "item",
        action: "updateStatus",
        content: (
          <>
            <FontAwesomeIcon icon={faAdjust} className="me-2 text-info" />
            Update Status
          </>
        ),
      },
      {
        type: "divider",
      },
      {
        type: "item",
        action: "delete",
        content: (
          <>
            <FontAwesomeIcon icon={faTrash} className="me-2 text-danger" />
            Delete Invoice
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
          {dropdownItems.map((dropItem, index) => {
            if (dropItem.type === "header") {
              return (
                <div key={index} className="dropdown-header-custom">
                  {dropItem.content}
                </div>
              );
            } else if (dropItem.type === "divider") {
              return <div key={index} className="dropdown-divider" />;
            } else if (dropItem.type === "item") {
              return (
                <button
                  key={index}
                  className="dropdown-item dropdown-item-custom"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInvoiceAction(dropItem.action, sale);
                  }}
                  disabled={isActionLoading}
                >
                  {dropItem.content}
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
  const ThreeDotMenu = ({sale}) => {
    const isDropdownOpen = activeDropdown === sale.id;

    return (
      <div className="dropdown-container">
        <button
          className="dropdown-trigger three-dot-menu"
          onClick={(e) => handleDropdownToggle(sale.id, e)}
          disabled={isActionLoading}
        >
          <FontAwesomeIcon icon={faEllipsisV} />
        </button>

        <PortalDropdown
          sale={sale}
          isOpen={isDropdownOpen}
          position={dropdownPosition}
        />
      </div>
    );
  };

  // Get current data based on active tab
  const getCurrentData = () => {
    return groupedSales[activeTab] || [];
  };

  // Loading state
  if (isLoading && sales.length === 0) {
    return (
      <div className="sales-invoice-management">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" size="lg" />
          <h5 className="mt-3 text-muted">Loading sales invoice data...</h5>
          <p className="text-muted">
            Analyzing invoices across all companies...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="sales-invoice-management">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">
            <FontAwesomeIcon
              icon={faFileInvoice}
              className="me-2 text-primary"
            />
            Sales Invoice Management
          </h4>
          <p className="text-muted mb-0">
            Manage sales invoices across all companies ({totalInvoices} total
            invoices)
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
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Row className="g-3 mb-4">
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm text-center h-100">
            <Card.Body>
              <div
                className="rounded-circle bg-primary bg-opacity-10 mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{width: "60px", height: "60px"}}
              >
                <FontAwesomeIcon
                  icon={faFileInvoice}
                  className="fs-2 text-primary"
                />
              </div>
              <h3 className="text-primary mb-2">
                {dashboardStats.totalSales || 0}
              </h3>
              <p className="text-muted mb-0">Total Invoices</p>
              <small className="text-muted">
                {groupedSales.pending?.length || 0} Pending •{" "}
                {groupedSales.paid?.length || 0} Paid
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm text-center h-100">
            <Card.Body>
              <div
                className="rounded-circle bg-success bg-opacity-10 mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{width: "60px", height: "60px"}}
              >
                <FontAwesomeIcon
                  icon={faDollarSign}
                  className="fs-2 text-success"
                />
              </div>
              <h3 className="text-success mb-2">
                {formatCurrency(dashboardStats.totalAmount || 0)}
              </h3>
              <p className="text-muted mb-0">Total Amount</p>
              <small className="text-muted">All sales invoices</small>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm text-center h-100">
            <Card.Body>
              <div
                className="rounded-circle bg-warning bg-opacity-10 mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{width: "60px", height: "60px"}}
              >
                <FontAwesomeIcon
                  icon={faExclamationTriangle}
                  className="fs-2 text-warning"
                />
              </div>
              <h3 className="text-warning mb-2">
                {formatCurrency(paymentSummary.totalOverdue || 0)}
              </h3>
              <p className="text-muted mb-0">Overdue Amount</p>
              <small className="text-muted">
                {paymentSummary.overdueCount || 0} invoices
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm text-center h-100">
            <Card.Body>
              <div
                className="rounded-circle bg-info bg-opacity-10 mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{width: "60px", height: "60px"}}
              >
                <FontAwesomeIcon icon={faBuilding} className="fs-2 text-info" />
              </div>
              <h3 className="text-info mb-2">
                {dashboardStats.activeCompanies || 0}
              </h3>
              <p className="text-muted mb-0">Active Companies</p>
              <small className="text-muted">Using sales invoices</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tab Navigation */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body className="p-3">
          <div className="d-flex gap-2 flex-wrap">
            <Button
              variant={activeTab === "all" ? "primary" : "outline-primary"}
              onClick={() => setActiveTab("all")}
              className="professional-button"
            >
              <FontAwesomeIcon icon={faList} className="me-2" />
              All ({groupedSales.all?.length || 0})
            </Button>
            <Button
              variant={activeTab === "paid" ? "success" : "outline-success"}
              onClick={() => setActiveTab("paid")}
              className="professional-button"
            >
              <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
              Paid ({groupedSales.paid?.length || 0})
            </Button>
            <Button
              variant={activeTab === "partial" ? "warning" : "outline-warning"}
              onClick={() => setActiveTab("partial")}
              className="professional-button"
            >
              <FontAwesomeIcon icon={faExclamationCircle} className="me-2" />
              Partial ({groupedSales.partial?.length || 0})
            </Button>
            <Button
              variant={
                activeTab === "pending" ? "secondary" : "outline-secondary"
              }
              onClick={() => setActiveTab("pending")}
              className="professional-button"
            >
              <FontAwesomeIcon icon={faClock} className="me-2" />
              Pending ({groupedSales.pending?.length || 0})
            </Button>
            <Button
              variant={activeTab === "overdue" ? "danger" : "outline-danger"}
              onClick={() => setActiveTab("overdue")}
              className="professional-button"
            >
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              Overdue ({groupedSales.overdue?.length || 0})
            </Button>
            <Button
              variant={activeTab === "dueToday" ? "info" : "outline-info"}
              onClick={() => setActiveTab("dueToday")}
              className="professional-button"
            >
              <FontAwesomeIcon icon={faClock} className="me-2" />
              Due Today ({groupedSales.dueToday?.length || 0})
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Filters and Search */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <Row className="align-items-end">
            <Col lg={3} md={6} className="mb-3">
              <Form.Label className="fw-semibold">Search Invoices</Form.Label>
              <InputGroup>
                <InputGroup.Text className="bg-light border-end-0">
                  <FontAwesomeIcon icon={faSearch} className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by invoice number, customer..."
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
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="draft">Draft</option>
              </Form.Select>
            </Col>
            <Col lg={2} md={6} className="mb-3">
              <Form.Label className="fw-semibold">Payment Status</Form.Label>
              <Form.Select
                value={paymentStatusFilter}
                onChange={(e) => {
                  setPaymentStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-select-custom"
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="pending">Pending</option>
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
                <option value="invoiceDate-desc">Latest First</option>
                <option value="invoiceDate-asc">Oldest First</option>
                <option value="totalAmount-desc">Highest Amount</option>
                <option value="totalAmount-asc">Lowest Amount</option>
                <option value="invoiceNumber-asc">Invoice Number A-Z</option>
                <option value="invoiceNumber-desc">Invoice Number Z-A</option>
                <option value="paymentStatus-asc">Payment Status A-Z</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Main Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {isLoading && (
            <div className="text-center py-3 bg-light">
              <Spinner animation="border" size="sm" className="me-2" />
              <span className="text-muted">Loading sales invoices...</span>
            </div>
          )}

          <div className="table-container">
            <div className="table-responsive table-scrollable">
              <Table hover className="mb-0 modern-table">
                <thead className="table-light sticky-header">
                  <tr>
                    <th className="border-0 fw-semibold text-dark">
                      Invoice Details
                    </th>
                    <th className="border-0 fw-semibold text-dark">Company</th>
                    <th className="border-0 fw-semibold text-dark">Customer</th>
                    <th className="border-0 fw-semibold text-dark">Date</th>
                    <th className="border-0 fw-semibold text-dark">Amount</th>
                    <th className="border-0 fw-semibold text-dark">
                      Payment Status
                    </th>
                    <th className="border-0 fw-semibold text-dark">Status</th>
                    <th className="border-0 fw-semibold text-dark text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {getCurrentData().map((sale) => (
                    <tr
                      key={sale.id}
                      className="clickable-row"
                      style={{cursor: "pointer"}}
                      onClick={() => handleInvoiceAction("view", sale)}
                    >
                      <td className="py-3">
                        <div className="d-flex align-items-center">
                          <div className="invoice-icon me-3">
                            <FontAwesomeIcon
                              icon={faFileInvoice}
                              className="text-primary"
                              size="lg"
                            />
                          </div>
                          <div>
                            <div className="fw-bold invoice-number-clickable">
                              {sale.invoiceNumber}
                            </div>
                            <small className="text-muted">
                              {sale.itemCount} items
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="fw-semibold">{sale.companyName}</div>
                      </td>
                      <td className="py-3">
                        <div>
                          <div className="fw-semibold">{sale.customerName}</div>
                          {sale.customerMobile &&
                            sale.customerMobile !== "N/A" && (
                              <small className="text-muted">
                                {sale.customerMobile}
                              </small>
                            )}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="d-flex align-items-center">
                          <FontAwesomeIcon
                            icon={faCalendarAlt}
                            className="text-muted me-2"
                            size="sm"
                          />
                          {formatDate(sale.invoiceDate)}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="fw-bold text-success">
                          {formatCurrency(sale.totalAmount)}
                        </div>
                        {sale.pendingAmount > 0 && (
                          <small className="text-muted d-block">
                            Pending: {formatCurrency(sale.pendingAmount)}
                          </small>
                        )}
                      </td>
                      <td className="py-3">
                        {getPaymentStatusBadge(sale)}
                        {sale.dueDate && (
                          <small className="text-muted d-block mt-1">
                            Due: {formatDate(sale.dueDate)}
                          </small>
                        )}
                      </td>
                      <td className="py-3">{getStatusBadge(sale.status)}</td>
                      <td
                        className="py-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ThreeDotMenu sale={sale} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* Table Info Bar */}
            <div className="table-info-bar bg-light border-top p-3">
              <div className="d-flex justify-content-between align-items-center text-muted small">
                <div>
                  Showing {(currentPage - 1) * invoicesPerPage + 1} to{" "}
                  {Math.min(currentPage * invoicesPerPage, totalInvoices)} of{" "}
                  {totalInvoices} invoices
                </div>
                <div className="d-flex align-items-center gap-3">
                  <span>
                    Total Value:{" "}
                    <strong className="text-success">
                      {formatCurrency(
                        getCurrentData().reduce(
                          (sum, sale) => sum + (sale.totalAmount || 0),
                          0
                        )
                      )}
                    </strong>
                  </span>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card.Body>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card.Footer className="bg-light border-0">
            <div className="d-flex justify-content-center">
              <Pagination className="mb-0">
                <Pagination.First
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                />
                <Pagination.Prev
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                />
                {[...Array(Math.min(totalPages, 7))].map((_, index) => {
                  const page =
                    currentPage <= 4 ? index + 1 : currentPage - 3 + index;
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
                <Pagination.Last
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                />
              </Pagination>
            </div>
          </Card.Footer>
        )}
      </Card>

      {/* Empty State */}
      {getCurrentData().length === 0 && !isLoading && (
        <div className="text-center py-5">
          <FontAwesomeIcon
            icon={faFileInvoice}
            size="3x"
            className="text-muted mb-3"
          />
          <h5 className="text-muted">No invoices found</h5>
          <p className="text-muted">
            {searchQuery ||
            statusFilter !== "all" ||
            paymentStatusFilter !== "all"
              ? "Try adjusting your search or filter criteria"
              : "No sales invoices have been created yet"}
          </p>
        </div>
      )}

      {/* Invoice Detail Modal */}
      <Modal
        show={showInvoiceModal}
        onHide={() => setShowInvoiceModal(false)}
        size="xl"
        centered
      >
        <Modal.Header closeButton className="bg-light border-0">
          <Modal.Title className="d-flex align-items-center">
            <FontAwesomeIcon
              icon={modalMode === "view" ? faEye : faEdit}
              className="me-2 text-primary"
            />
            {modalMode === "view" ? "Invoice Details" : "Edit Invoice"} -{" "}
            {selectedSale?.invoiceNumber}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSale && (
            <Row>
              <Col md={6}>
                <h6 className="text-primary mb-3">Invoice Information</h6>
                <p>
                  <strong>Invoice Number:</strong> {selectedSale.invoiceNumber}
                </p>
                <p>
                  <strong>Company:</strong> {selectedSale.companyName}
                </p>
                <p>
                  <strong>Status:</strong> {getStatusBadge(selectedSale.status)}
                </p>
                <p>
                  <strong>Date:</strong> {formatDate(selectedSale.invoiceDate)}
                </p>
                <p>
                  <strong>Items:</strong> {selectedSale.itemCount}
                </p>
              </Col>
              <Col md={6}>
                <h6 className="text-success mb-3">Customer & Payment</h6>
                <p>
                  <strong>Customer:</strong> {selectedSale.customerName}
                </p>
                {selectedSale.customerMobile &&
                  selectedSale.customerMobile !== "N/A" && (
                    <p>
                      <strong>Mobile:</strong> {selectedSale.customerMobile}
                    </p>
                  )}
                <p>
                  <strong>Total Amount:</strong>{" "}
                  <span className="text-success fw-bold">
                    {formatCurrency(selectedSale.totalAmount)}
                  </span>
                </p>
                <p>
                  <strong>Payment Status:</strong>{" "}
                  {getPaymentStatusBadge(selectedSale)}
                </p>
                <p>
                  <strong>Paid Amount:</strong>{" "}
                  {formatCurrency(selectedSale.paidAmount)}
                </p>
                {selectedSale.pendingAmount > 0 && (
                  <p>
                    <strong>Pending Amount:</strong>{" "}
                    <span className="text-warning">
                      {formatCurrency(selectedSale.pendingAmount)}
                    </span>
                  </p>
                )}
                {selectedSale.dueDate && (
                  <p>
                    <strong>Due Date:</strong>{" "}
                    {formatDate(selectedSale.dueDate)}
                  </p>
                )}
              </Col>
              {selectedSale.notes && (
                <Col md={12} className="mt-3">
                  <h6 className="text-info mb-3">Notes</h6>
                  <p className="text-muted">{selectedSale.notes}</p>
                </Col>
              )}
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light border-0">
          <Button
            variant="outline-secondary"
            onClick={() => setShowInvoiceModal(false)}
            className="professional-button"
          >
            Close
          </Button>
          {selectedSale && modalMode === "view" && (
            <>
              <Button
                variant="outline-warning"
                onClick={() => setModalMode("edit")}
                className="professional-button"
              >
                <FontAwesomeIcon icon={faEdit} className="me-2" />
                Edit Invoice
              </Button>
              {selectedSale.pendingAmount > 0 && (
                <Button
                  variant="success"
                  onClick={() => handleInvoiceAction("payment", selectedSale)}
                  className="professional-button"
                >
                  <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                  Add Payment
                </Button>
              )}
            </>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default SalesInvoiceManagement;
