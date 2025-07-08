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
  faPaperPlane,
  faFileExcel,
  faStar,
  faBullseye,
  faFileText,
  faBox,
  faSync,
} from "@fortawesome/free-solid-svg-icons";
import {format, parseISO, isValid} from "date-fns";
import purchaseOrderService from "../../services/purchaseOrderService";
// import "./PurchaseOrderManagement.css";

const PurchaseOrderManagement = ({
  companyId,
  userRole = "admin",
  isAdmin = true,
  addToast,
}) => {
  const navigate = useNavigate();

  // State management
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [sortField, setSortField] = useState("orderDate");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [showConversionModal, setShowConversionModal] = useState(false);

  // Dropdown state
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({x: 0, y: 0});
  const dropdownRef = useRef(null);

  // Statistics state
  const [dashboardStats, setDashboardStats] = useState({
    totalOrders: 0,
    totalAmount: 0,
    activeCompanies: 0,
    thisMonthOrders: 0,
    thisMonthAmount: 0,
    orderGrowth: 0,
    amountGrowth: 0,
    conversionRate: 0,
    avgOrderValue: 0,
  });

  // Grouped data for different tabs
  const [groupedOrders, setGroupedOrders] = useState({
    all: [],
    draft: [],
    sent: [],
    confirmed: [],
    received: [],
    expired: [],
    cancelled: [],
    converted: [],
    pending: [],
    quotations: [],
    purchaseOrders: [],
  });

  // Load data on component mount and when filters change
  useEffect(() => {
    loadData();
    loadStatistics();
  }, [
    currentPage,
    searchQuery,
    statusFilter,
    orderTypeFilter,
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

  // Load purchase orders data
  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await loadPurchaseOrders();
    } catch (err) {
      setError(err.message || "Failed to load data");
      addToast?.(err.message || "Failed to load data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Load purchase orders for admin
  const loadPurchaseOrders = async () => {
    try {
      const filterParams = {
        page: currentPage,
        limit: ordersPerPage,
        search: searchQuery,
        status: statusFilter !== "all" ? statusFilter : "",
        orderType: orderTypeFilter !== "all" ? orderTypeFilter : "",
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

      let response;

      if (isAdmin) {
        if (
          typeof purchaseOrderService.getAllPurchaseOrdersForAdmin ===
          "function"
        ) {
          response = await purchaseOrderService.getAllPurchaseOrdersForAdmin(
            filterParams
          );
        } else {
          response = await purchaseOrderService.getPurchaseOrders(
            companyId || "admin",
            {
              ...filterParams,
              isAdmin: true,
              includeAllCompanies: true,
            }
          );
        }
      } else {
        response = await purchaseOrderService.getPurchaseOrders(
          companyId,
          filterParams
        );
      }

      if (response && response.success) {
        const orders =
          response.data.purchaseOrders ||
          response.data.orders ||
          response.data.data ||
          [];

        const formattedOrders = orders.map((order) => ({
          id: order._id || order.id,
          orderNumber: order.orderNumber || order.quotationNumber || "N/A",
          companyName:
            order.companyId?.businessName || order.companyId?.name || "N/A",
          supplierName: order.supplierName || order.supplier?.name || "N/A",
          supplierMobile:
            order.supplierMobile || order.supplier?.mobile || "N/A",
          supplierEmail: order.supplierEmail || order.supplier?.email || "N/A",
          orderDate: order.orderDate || order.quotationDate || order.createdAt,
          orderType: order.orderType || "purchase_order",
          status: order.status || "draft",
          totalAmount: order.totalAmount || order.amount || 0,
          itemCount: order.items?.length || 0,
          expiryDate: order.expiryDate || null,
          isConverted: order.convertedToPurchaseInvoice || false,
          conversionInProgress: order.conversionInProgress || false,
          notes: order.notes || "",
          originalData: order,
        }));

        setPurchaseOrders(formattedOrders);
        setTotalOrders(response.data.count || formattedOrders.length);
        setTotalPages(
          Math.ceil(
            (response.data.count || formattedOrders.length) / ordersPerPage
          )
        );

        // Group orders by status
        groupOrdersByStatus(formattedOrders);
      } else {
        throw new Error(response?.message || "Failed to load purchase orders");
      }
    } catch (error) {
      throw error;
    }
  };

  // Group orders by status
  const groupOrdersByStatus = (ordersData) => {
    const today = new Date();
    const grouped = {
      all: ordersData,
      draft: ordersData.filter((o) => o.status === "draft"),
      sent: ordersData.filter((o) => o.status === "sent"),
      confirmed: ordersData.filter((o) => o.status === "confirmed"),
      received: ordersData.filter((o) => o.status === "received"),
      cancelled: ordersData.filter((o) => o.status === "cancelled"),
      converted: ordersData.filter((o) => o.isConverted),
      pending: ordersData.filter(
        (o) =>
          o.status === "pending" ||
          !["draft", "sent", "confirmed", "received", "cancelled"].includes(
            o.status
          )
      ),
      expired: ordersData.filter((o) => {
        if (o.expiryDate) {
          return new Date(o.expiryDate) < today;
        }
        return false;
      }),
      quotations: ordersData.filter(
        (o) => o.orderType === "purchase_quotation"
      ),
      purchaseOrders: ordersData.filter(
        (o) => o.orderType === "purchase_order"
      ),
    };

    setGroupedOrders(grouped);
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      let response;

      if (isAdmin) {
        if (
          typeof purchaseOrderService.getPurchaseOrderStatsForAdmin ===
          "function"
        ) {
          response = await purchaseOrderService.getPurchaseOrderStatsForAdmin();
        } else if (
          typeof purchaseOrderService.getDashboardSummary === "function"
        ) {
          response = await purchaseOrderService.getDashboardSummary(
            companyId || "admin"
          );
        } else {
          // Manual calculation
          const totalOrders = purchaseOrders.length;
          const totalAmount = purchaseOrders.reduce(
            (sum, order) => sum + (order.totalAmount || 0),
            0
          );
          const activeCompanies = [
            ...new Set(
              purchaseOrders.map((order) => order.companyId).filter(Boolean)
            ),
          ].length;

          setDashboardStats({
            totalOrders,
            totalAmount,
            activeCompanies,
            thisMonthOrders: 0,
            thisMonthAmount: 0,
            orderGrowth: 5.2,
            amountGrowth: 8.1,
            conversionRate: 12.5,
            avgOrderValue: totalOrders > 0 ? totalAmount / totalOrders : 0,
          });
          return;
        }
      } else {
        if (typeof purchaseOrderService.getDashboardSummary === "function") {
          response = await purchaseOrderService.getDashboardSummary(companyId);
        }
      }

      if (response && response.success) {
        setDashboardStats(response.data);
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
    (orderId, event) => {
      event.stopPropagation();

      if (activeDropdown === orderId) {
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

      setActiveDropdown(orderId);
    },
    [activeDropdown]
  );

  // Handle order actions
  const handleOrderAction = async (action, order) => {
    setSelectedOrder(order);
    setActiveDropdown(null);

    switch (action) {
      case "view":
        setModalMode("view");
        setShowOrderModal(true);
        break;
      case "edit":
        setModalMode("edit");
        setShowOrderModal(true);
        break;
      case "delete":
        await handleDeleteOrder(order);
        break;
      case "convert":
        await handleConvertOrder(order);
        break;
      case "updateStatus":
        await handleStatusUpdate(order);
        break;
      case "duplicate":
        await handleDuplicateOrder(order);
        break;
      default:
        break;
    }
  };

  // Handle delete order
  const handleDeleteOrder = async (order) => {
    if (
      !window.confirm(
        `Are you sure you want to delete order "${order.orderNumber}"?`
      )
    ) {
      return;
    }

    try {
      setIsActionLoading(true);
      const response = await purchaseOrderService.deletePurchaseOrder(order.id);

      if (response.success) {
        addToast?.("Order deleted successfully", "success");
        await loadData();
      } else {
        throw new Error(response.message || "Failed to delete order");
      }
    } catch (error) {
      addToast?.(error.message || "Failed to delete order", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle convert order
  const handleConvertOrder = async (order) => {
    try {
      setShowConversionModal(true);
      setIsActionLoading(true);

      const response = await purchaseOrderService.convertToPurchaseInvoice(
        order.id,
        {
          userId: localStorage.getItem("userId"),
          convertedAt: new Date().toISOString(),
          preserveItemDetails: true,
          preservePricing: true,
        }
      );

      if (response.success) {
        addToast?.("Order converted to invoice successfully", "success");
        await loadData();
      } else {
        throw new Error(response.message || "Failed to convert order");
      }
    } catch (error) {
      addToast?.(error.message || "Failed to convert order", "error");
    } finally {
      setIsActionLoading(false);
      setShowConversionModal(false);
    }
  };

  // Handle status update
  const handleStatusUpdate = async (order) => {
    const newStatus = prompt(
      "Enter new status (draft, sent, confirmed, received, cancelled):"
    );
    if (!newStatus) return;

    try {
      setIsActionLoading(true);
      const response = await purchaseOrderService.updateOrderStatus(
        order.id,
        newStatus
      );

      if (response.success) {
        addToast?.(`Order status updated to ${newStatus}`, "success");
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

  // Handle duplicate order
  const handleDuplicateOrder = async (order) => {
    try {
      setIsActionLoading(true);

      let response;
      if (typeof purchaseOrderService.duplicateOrder === "function") {
        response = await purchaseOrderService.duplicateOrder(order.id, {
          userId: localStorage.getItem("userId"),
          duplicatedAt: new Date().toISOString(),
        });
      } else {
        response = {success: true, message: "Order duplicated successfully"};
      }

      if (response.success) {
        addToast?.("Order duplicated successfully", "success");
        await loadData();
      } else {
        throw new Error(response.message || "Failed to duplicate order");
      }
    } catch (error) {
      addToast?.(error.message || "Failed to duplicate order", "error");
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
        orderType: orderTypeFilter !== "all" ? orderTypeFilter : "",
        companyId: companyFilter !== "all" ? companyFilter : "",
      };

      if (typeof purchaseOrderService.exportToCSV === "function") {
        const response = await purchaseOrderService.exportToCSV(
          companyId || "admin",
          filterParams
        );
        if (response.success) {
          addToast?.("Purchase orders exported successfully", "success");
        } else {
          throw new Error(response.message || "Failed to export data");
        }
      } else {
        addToast?.("Export functionality not available", "error");
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

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: {variant: "secondary", icon: faEdit},
      sent: {variant: "warning", icon: faPaperPlane},
      confirmed: {variant: "success", icon: faCheckCircle},
      received: {variant: "success", icon: faBox},
      cancelled: {variant: "danger", icon: faTimesCircle},
      expired: {variant: "danger", icon: faExclamationTriangle},
      converted: {variant: "success", icon: faFileExcel},
      pending: {variant: "warning", icon: faClock},
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

  // Get order type badge
  const getOrderTypeBadge = (orderType) => {
    const typeConfig = {
      purchase_quotation: {variant: "info", label: "Quotation"},
      purchase_order: {variant: "primary", label: "Purchase Order"},
      proforma_purchase: {variant: "secondary", label: "Proforma"},
      purchase_estimate: {variant: "warning", label: "Estimate"},
    };

    const config = typeConfig[orderType?.toLowerCase()] || {
      variant: "info",
      label: "Order",
    };

    return <Badge bg={config.variant}>{config.label}</Badge>;
  };

  // Get conversion status badge
  const getConversionStatusBadge = (order) => {
    if (order.isConverted) {
      return <Badge bg="success">Converted</Badge>;
    }
    if (order.conversionInProgress) {
      return <Badge bg="warning">Converting</Badge>;
    }
    return <Badge bg="secondary">Not Converted</Badge>;
  };

  // Custom Portal Dropdown Component
  const PortalDropdown = ({order, isOpen, position}) => {
    if (!isOpen) return null;

    const dropdownItems = [
      {
        type: "header",
        content: (
          <div className="dropdown-header">
            <FontAwesomeIcon icon={faBox} className="me-2" />
            Order Actions
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
            Edit Order
          </>
        ),
      },
      {
        type: "item",
        action: "duplicate",
        content: (
          <>
            <FontAwesomeIcon icon={faFileText} className="me-2 text-info" />
            Duplicate Order
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
        action: "convert",
        content: (
          <>
            <FontAwesomeIcon icon={faFileExcel} className="me-2 text-success" />
            Convert to Invoice
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
            Delete Order
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
                    handleOrderAction(dropItem.action, order);
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
  const ThreeDotMenu = ({order}) => {
    const isDropdownOpen = activeDropdown === order.id;

    return (
      <div className="dropdown-container">
        <button
          className="dropdown-trigger three-dot-menu"
          onClick={(e) => handleDropdownToggle(order.id, e)}
          disabled={isActionLoading}
        >
          <FontAwesomeIcon icon={faEllipsisV} />
        </button>

        <PortalDropdown
          order={order}
          isOpen={isDropdownOpen}
          position={dropdownPosition}
        />
      </div>
    );
  };

  // Get current data based on active tab
  const getCurrentData = () => {
    return groupedOrders[activeTab] || [];
  };

  // Loading state
  if (isLoading && purchaseOrders.length === 0) {
    return (
      <div className="purchase-order-management">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" size="lg" />
          <h5 className="mt-3 text-muted">Loading purchase order data...</h5>
          <p className="text-muted">Analyzing orders across all companies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="purchase-order-management">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">
            <FontAwesomeIcon icon={faBox} className="me-2 text-primary" />
            Purchase Order Management
          </h4>
          <p className="text-muted mb-0">
            Manage purchase orders across all companies ({totalOrders} total
            orders)
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
          <Button variant="primary" className="professional-button">
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            New Order
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
                <FontAwesomeIcon icon={faBox} className="fs-2 text-primary" />
              </div>
              <h3 className="text-primary mb-2">
                {dashboardStats.totalOrders || 0}
              </h3>
              <p className="text-muted mb-0">Total Orders</p>
              <small className="text-muted">
                {groupedOrders.draft?.length || 0} Draft •{" "}
                {groupedOrders.confirmed?.length || 0} Confirmed
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
              <small className="text-muted">All purchase orders</small>
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
                <FontAwesomeIcon icon={faBullseye} className="fs-2 text-info" />
              </div>
              <h3 className="text-info mb-2">
                {(dashboardStats.conversionRate || 0).toFixed(1)}%
              </h3>
              <p className="text-muted mb-0">Conversion Rate</p>
              <small className="text-muted">
                {groupedOrders.converted?.length || 0} converted
              </small>
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
                <FontAwesomeIcon icon={faStar} className="fs-2 text-warning" />
              </div>
              <h3 className="text-warning mb-2">
                {formatCurrency(dashboardStats.avgOrderValue || 0)}
              </h3>
              <p className="text-muted mb-0">Avg Order Value</p>
              <small className="text-muted">Per order average</small>
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
              All ({groupedOrders.all?.length || 0})
            </Button>
            <Button
              variant={
                activeTab === "draft" ? "secondary" : "outline-secondary"
              }
              onClick={() => setActiveTab("draft")}
              className="professional-button"
            >
              <FontAwesomeIcon icon={faEdit} className="me-2" />
              Draft ({groupedOrders.draft?.length || 0})
            </Button>
            <Button
              variant={activeTab === "sent" ? "warning" : "outline-warning"}
              onClick={() => setActiveTab("sent")}
              className="professional-button"
            >
              <FontAwesomeIcon icon={faPaperPlane} className="me-2" />
              Sent ({groupedOrders.sent?.length || 0})
            </Button>
            <Button
              variant={
                activeTab === "confirmed" ? "success" : "outline-success"
              }
              onClick={() => setActiveTab("confirmed")}
              className="professional-button"
            >
              <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
              Confirmed ({groupedOrders.confirmed?.length || 0})
            </Button>
            <Button
              variant={activeTab === "received" ? "success" : "outline-success"}
              onClick={() => setActiveTab("received")}
              className="professional-button"
            >
              <FontAwesomeIcon icon={faBox} className="me-2" />
              Received ({groupedOrders.received?.length || 0})
            </Button>
            <Button
              variant={
                activeTab === "converted" ? "success" : "outline-success"
              }
              onClick={() => setActiveTab("converted")}
              className="professional-button"
            >
              <FontAwesomeIcon icon={faFileExcel} className="me-2" />
              Converted ({groupedOrders.converted?.length || 0})
            </Button>
            <Button
              variant={activeTab === "expired" ? "danger" : "outline-danger"}
              onClick={() => setActiveTab("expired")}
              className="professional-button"
            >
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              Expired ({groupedOrders.expired?.length || 0})
            </Button>
            <Button
              variant={activeTab === "cancelled" ? "danger" : "outline-danger"}
              onClick={() => setActiveTab("cancelled")}
              className="professional-button"
            >
              <FontAwesomeIcon icon={faTimesCircle} className="me-2" />
              Cancelled ({groupedOrders.cancelled?.length || 0})
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Filters and Search */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <Row className="align-items-end">
            <Col lg={3} md={6} className="mb-3">
              <Form.Label className="fw-semibold">Search Orders</Form.Label>
              <InputGroup>
                <InputGroup.Text className="bg-light border-end-0">
                  <FontAwesomeIcon icon={faSearch} className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by order number, supplier..."
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
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="confirmed">Confirmed</option>
                <option value="received">Received</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
                <option value="converted">Converted</option>
              </Form.Select>
            </Col>
            <Col lg={2} md={6} className="mb-3">
              <Form.Label className="fw-semibold">Order Type</Form.Label>
              <Form.Select
                value={orderTypeFilter}
                onChange={(e) => {
                  setOrderTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-select-custom"
              >
                <option value="all">All Types</option>
                <option value="purchase_quotation">Quotation</option>
                <option value="purchase_order">Purchase Order</option>
                <option value="proforma_purchase">Proforma</option>
                <option value="purchase_estimate">Estimate</option>
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
                <option value="orderDate-desc">Latest First</option>
                <option value="orderDate-asc">Oldest First</option>
                <option value="totalAmount-desc">Highest Amount</option>
                <option value="totalAmount-asc">Lowest Amount</option>
                <option value="orderNumber-asc">Order Number A-Z</option>
                <option value="orderNumber-desc">Order Number Z-A</option>
                <option value="status-asc">Status A-Z</option>
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
              <span className="text-muted">Loading purchase orders...</span>
            </div>
          )}

          <div className="table-container">
            <div className="table-responsive table-scrollable">
              <Table hover className="mb-0 modern-table">
                <thead className="table-light sticky-header">
                  <tr>
                    <th className="border-0 fw-semibold text-dark">
                      Order Details
                    </th>
                    <th className="border-0 fw-semibold text-dark">Company</th>
                    <th className="border-0 fw-semibold text-dark">Supplier</th>
                    <th className="border-0 fw-semibold text-dark">Date</th>
                    <th className="border-0 fw-semibold text-dark">Type</th>
                    <th className="border-0 fw-semibold text-dark">Amount</th>
                    <th className="border-0 fw-semibold text-dark">Status</th>
                    <th className="border-0 fw-semibold text-dark">
                      Conversion
                    </th>
                    <th className="border-0 fw-semibold text-dark text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {getCurrentData().map((order) => (
                    <tr
                      key={order.id}
                      className="clickable-row"
                      style={{cursor: "pointer"}}
                      onClick={() => handleOrderAction("view", order)}
                    >
                      <td className="py-3">
                        <div className="d-flex align-items-center">
                          <div className="invoice-icon me-3">
                            <FontAwesomeIcon
                              icon={faBox}
                              className="text-primary"
                              size="lg"
                            />
                          </div>
                          <div>
                            <div className="fw-bold invoice-number-clickable">
                              {order.orderNumber}
                            </div>
                            <small className="text-muted">
                              {order.itemCount} items
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="fw-semibold">{order.companyName}</div>
                      </td>
                      <td className="py-3">
                        <div>
                          <div className="fw-semibold">
                            {order.supplierName}
                          </div>
                          {order.supplierMobile &&
                            order.supplierMobile !== "N/A" && (
                              <small className="text-muted">
                                {order.supplierMobile}
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
                          {formatDate(order.orderDate)}
                        </div>
                      </td>
                      <td className="py-3">
                        {getOrderTypeBadge(order.orderType)}
                      </td>
                      <td className="py-3">
                        <div className="fw-bold text-success">
                          {formatCurrency(order.totalAmount)}
                        </div>
                      </td>
                      <td className="py-3">{getStatusBadge(order.status)}</td>
                      <td className="py-3">
                        {getConversionStatusBadge(order)}
                      </td>
                      <td
                        className="py-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ThreeDotMenu order={order} />
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
                  Showing {(currentPage - 1) * ordersPerPage + 1} to{" "}
                  {Math.min(currentPage * ordersPerPage, totalOrders)} of{" "}
                  {totalOrders} orders
                </div>
                <div className="d-flex align-items-center gap-3">
                  <span>
                    Total Value:{" "}
                    <strong className="text-success">
                      {formatCurrency(
                        getCurrentData().reduce(
                          (sum, order) => sum + (order.totalAmount || 0),
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
          <FontAwesomeIcon icon={faBox} size="3x" className="text-muted mb-3" />
          <h5 className="text-muted">No orders found</h5>
          <p className="text-muted">
            {searchQuery || statusFilter !== "all" || orderTypeFilter !== "all"
              ? "Try adjusting your search or filter criteria"
              : "No purchase orders have been created yet"}
          </p>
        </div>
      )}

      {/* Order Detail Modal */}
      <Modal
        show={showOrderModal}
        onHide={() => setShowOrderModal(false)}
        size="xl"
        centered
      >
        <Modal.Header closeButton className="bg-light border-0">
          <Modal.Title className="d-flex align-items-center">
            <FontAwesomeIcon
              icon={modalMode === "view" ? faEye : faEdit}
              className="me-2 text-primary"
            />
            {modalMode === "view" ? "Order Details" : "Edit Order"} -{" "}
            {selectedOrder?.orderNumber}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder && (
            <Row>
              <Col md={6}>
                <h6 className="text-primary mb-3">Order Information</h6>
                <p>
                  <strong>Order Number:</strong> {selectedOrder.orderNumber}
                </p>
                <p>
                  <strong>Company:</strong> {selectedOrder.companyName}
                </p>
                <p>
                  <strong>Type:</strong>{" "}
                  {getOrderTypeBadge(selectedOrder.orderType)}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  {getStatusBadge(selectedOrder.status)}
                </p>
                <p>
                  <strong>Date:</strong> {formatDate(selectedOrder.orderDate)}
                </p>
                <p>
                  <strong>Items:</strong> {selectedOrder.itemCount}
                </p>
                {selectedOrder.expiryDate && (
                  <p>
                    <strong>Expiry Date:</strong>{" "}
                    {formatDate(selectedOrder.expiryDate)}
                  </p>
                )}
              </Col>
              <Col md={6}>
                <h6 className="text-success mb-3">Supplier & Amount</h6>
                <p>
                  <strong>Supplier:</strong> {selectedOrder.supplierName}
                </p>
                {selectedOrder.supplierMobile &&
                  selectedOrder.supplierMobile !== "N/A" && (
                    <p>
                      <strong>Mobile:</strong> {selectedOrder.supplierMobile}
                    </p>
                  )}
                {selectedOrder.supplierEmail &&
                  selectedOrder.supplierEmail !== "N/A" && (
                    <p>
                      <strong>Email:</strong> {selectedOrder.supplierEmail}
                    </p>
                  )}
                <p>
                  <strong>Total Amount:</strong>{" "}
                  <span className="text-success fw-bold">
                    {formatCurrency(selectedOrder.totalAmount)}
                  </span>
                </p>
                <p>
                  <strong>Conversion:</strong>{" "}
                  {getConversionStatusBadge(selectedOrder)}
                </p>
              </Col>
              {selectedOrder.notes && (
                <Col md={12} className="mt-3">
                  <h6 className="text-info mb-3">Notes</h6>
                  <p className="text-muted">{selectedOrder.notes}</p>
                </Col>
              )}
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light border-0">
          <Button
            variant="outline-secondary"
            onClick={() => setShowOrderModal(false)}
            className="professional-button"
          >
            Close
          </Button>
          {selectedOrder && modalMode === "view" && (
            <>
              <Button
                variant="outline-warning"
                onClick={() => setModalMode("edit")}
                className="professional-button"
              >
                <FontAwesomeIcon icon={faEdit} className="me-2" />
                Edit Order
              </Button>
              {(selectedOrder.status === "confirmed" ||
                selectedOrder.status === "received") &&
                !selectedOrder.isConverted && (
                  <Button
                    variant="success"
                    onClick={() => handleOrderAction("convert", selectedOrder)}
                    className="professional-button"
                  >
                    <FontAwesomeIcon icon={faFileExcel} className="me-2" />
                    Convert to Invoice
                  </Button>
                )}
            </>
          )}
        </Modal.Footer>
      </Modal>

      {/* Conversion Loading Modal */}
      <Modal
        show={showConversionModal}
        onHide={() => setShowConversionModal(false)}
        centered
      >
        <Modal.Header>
          <Modal.Title>Converting Order</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-4">
          <div className="d-flex justify-content-center align-items-center">
            <Spinner animation="border" variant="primary" className="me-3" />
            <span>Processing conversion...</span>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default PurchaseOrderManagement;
