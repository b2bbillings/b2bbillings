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
  ProgressBar,
  Tabs,
  Tab,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faShoppingCart,
  faSearch,
  faDownload,
  faPlus,
  faEdit,
  faTrash,
  faEye,
  faFilter,
  faSort,
  faEllipsisV,
  faCalendarAlt,
  faUser,
  faBoxes,
  faDollarSign,
  faCheckCircle,
  faExclamationTriangle,
  faTimesCircle,
  faClock,
  faTruck,
  faClipboardCheck,
  faFileInvoice,
  faPhone,
  faEnvelope,
  faMapMarkerAlt,
  faPrint,
  faShare,
  faArrowUp,
  faArrowDown,
  faReceipt,
  faHandHoldingUsd,
} from "@fortawesome/free-solid-svg-icons";

// ✅ Import your existing services
import saleOrderService from "../../../../services/saleOrderService";
import purchaseOrderService from "../../../../services/purchaseOrderService";

function CompanyOrders({companyId, companyData, userRole, addToast}) {
  // ✅ State for combined orders data
  const [allOrders, setAllOrders] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);

  // ✅ Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  // ✅ Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("orderDate");
  const [sortDirection, setSortDirection] = useState("desc");

  // ✅ Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  // ✅ Stats state
  const [stats, setStats] = useState({
    totalOrders: 0,
    salesOrders: 0,
    purchaseOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalSalesValue: 0,
    totalPurchaseValue: 0,
    avgOrderValue: 0,
  });

  // ✅ Load data on component mount
  useEffect(() => {
    if (companyId) {
      loadCompanyOrders();
    }
  }, [companyId]);

  // ✅ Apply filters when data or filters change
  useEffect(() => {
    filterAndSortOrders();
  }, [
    allOrders,
    salesOrders,
    purchaseOrders,
    searchQuery,
    statusFilter,
    typeFilter,
    dateFilter,
    sortBy,
    sortDirection,
    activeTab,
  ]);

  // ✅ Load real data from database
  const loadCompanyOrders = async () => {
    try {
      setIsLoading(true);
      setSalesLoading(true);
      setPurchaseLoading(true);

      console.log("🔄 Loading company orders for:", companyId);

      // ✅ Fetch sales orders and purchase orders in parallel
      const [salesResponse, purchaseResponse] = await Promise.allSettled([
        saleOrderService.getSalesOrders(companyId, {
          includeCustomer: true,
          includeItems: true,
          limit: 1000,
          sortBy: "orderDate",
          sortOrder: "desc",
        }),
        purchaseOrderService.getPurchaseOrders(companyId, {
          includeSupplier: true,
          includeItems: true,
          limit: 1000,
          sortBy: "orderDate",
          sortOrder: "desc",
        }),
      ]);

      // ✅ Process sales orders
      let processedSalesOrders = [];
      if (salesResponse.status === "fulfilled" && salesResponse.value.success) {
        const salesData = salesResponse.value.data;
        processedSalesOrders = (
          salesData.salesOrders ||
          salesData.orders ||
          salesData.data ||
          []
        ).map((order) => ({
          ...order,
          orderType: "sales",
          displayType: "Sales Order",
          icon: faArrowUp,
          colorClass: "success",
          customerName:
            order.customerName || order.customer?.name || "Unknown Customer",
          customerMobile: order.customerMobile || order.customer?.mobile || "",
          customerEmail: order.customerEmail || order.customer?.email || "",
          orderNumber:
            order.orderNumber ||
            order.quotationNumber ||
            `SO-${order._id?.slice(-6)}`,
          amount: order.amount || order.total || order.totals?.finalTotal || 0,
          items: order.items || [],
          orderDate: order.orderDate || order.quotationDate || order.createdAt,
          expectedDelivery: order.expectedDeliveryDate || order.deliveryDate,
          paymentStatus: order.payment?.status || "pending",
          paymentMethod: order.payment?.method || "not_specified",
          notes: order.notes || order.termsAndConditions || "",
          createdBy: order.createdBy || order.employeeName || "System",
          priority: order.priority || "medium",
        }));
        setSalesOrders(processedSalesOrders);
        setSalesLoading(false);
      } else {
        console.error("❌ Sales orders fetch failed:", salesResponse.reason);
        setSalesOrders([]);
        setSalesLoading(false);
      }

      // ✅ Process purchase orders
      let processedPurchaseOrders = [];
      if (
        purchaseResponse.status === "fulfilled" &&
        purchaseResponse.value.success
      ) {
        const purchaseData = purchaseResponse.value.data;
        processedPurchaseOrders = (
          purchaseData.purchaseOrders ||
          purchaseData.orders ||
          purchaseData.data ||
          []
        ).map((order) => ({
          ...order,
          orderType: "purchase",
          displayType: "Purchase Order",
          icon: faArrowDown,
          colorClass: "primary",
          customerName:
            order.supplierName || order.supplier?.name || "Unknown Supplier",
          customerMobile: order.supplierMobile || order.supplier?.mobile || "",
          customerEmail: order.supplierEmail || order.supplier?.email || "",
          orderNumber: order.orderNumber || `PO-${order._id?.slice(-6)}`,
          amount: order.amount || order.total || order.totals?.finalTotal || 0,
          items: order.items || [],
          orderDate: order.orderDate || order.purchaseDate || order.createdAt,
          expectedDelivery: order.expectedDeliveryDate || order.deliveryDate,
          paymentStatus: order.payment?.status || "pending",
          paymentMethod: order.payment?.method || "not_specified",
          notes: order.notes || order.termsAndConditions || "",
          createdBy: order.createdBy || order.employeeName || "System",
          priority: order.priority || "medium",
        }));
        setPurchaseOrders(processedPurchaseOrders);
        setPurchaseLoading(false);
      } else {
        console.error(
          "❌ Purchase orders fetch failed:",
          purchaseResponse.reason
        );
        setPurchaseOrders([]);
        setPurchaseLoading(false);
      }

      // ✅ Combine all orders
      const combinedOrders = [
        ...processedSalesOrders,
        ...processedPurchaseOrders,
      ];
      setAllOrders(combinedOrders);

      // ✅ Calculate statistics
      calculateStats(processedSalesOrders, processedPurchaseOrders);

      addToast?.("Company orders loaded successfully", "success");
    } catch (error) {
      console.error("❌ Error loading company orders:", error);
      addToast?.("Failed to load company orders", "error");
    } finally {
      setIsLoading(false);
      setSalesLoading(false);
      setPurchaseLoading(false);
    }
  };

  const calculateStats = (salesData, purchaseData) => {
    const allOrdersData = [...salesData, ...purchaseData];

    const totalOrders = allOrdersData.length;
    const salesOrdersCount = salesData.length;
    const purchaseOrdersCount = purchaseData.length;

    // ✅ More flexible status matching
    const pendingOrders = allOrdersData.filter((order) => {
      const status = order.status?.toLowerCase() || "";
      return ["draft", "pending", "sent", "created", "new"].includes(status);
    }).length;

    const confirmedOrders = allOrdersData.filter((order) => {
      const status = order.status?.toLowerCase() || "";
      return ["confirmed", "approved", "accepted", "processing"].includes(
        status
      );
    }).length;

    const completedOrders = allOrdersData.filter((order) => {
      const status = order.status?.toLowerCase() || "";
      return [
        "completed",
        "delivered",
        "received",
        "finished",
        "closed",
      ].includes(status);
    }).length;

    const cancelledOrders = allOrdersData.filter((order) => {
      const status = order.status?.toLowerCase() || "";
      return ["cancelled", "canceled", "rejected"].includes(status);
    }).length;

    const totalSalesValue = salesData.reduce(
      (sum, order) => sum + (order.amount || 0),
      0
    );
    const totalPurchaseValue = purchaseData.reduce(
      (sum, order) => sum + (order.amount || 0),
      0
    );
    const totalValue = totalSalesValue + totalPurchaseValue;
    const avgOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;

    setStats({
      totalOrders,
      salesOrders: salesOrdersCount,
      purchaseOrders: purchaseOrdersCount,
      pendingOrders,
      confirmedOrders,
      completedOrders,
      cancelledOrders,
      totalSalesValue,
      totalPurchaseValue,
      totalValue,
      avgOrderValue,
    });
  };

  // ✅ Update the filterAndSortOrders function with better filtering logic
  const filterAndSortOrders = () => {
    let filtered = [];

    // ✅ Select data based on active tab
    switch (activeTab) {
      case "sales":
        filtered = [...salesOrders];
        break;
      case "purchase":
        filtered = [...purchaseOrders];
        break;
      case "all":
      default:
        filtered = [...allOrders];
        break;
    }

    console.log(
      `📊 Starting with ${filtered.length} orders for tab: ${activeTab}`
    );

    // ✅ Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const beforeSearch = filtered.length;
      filtered = filtered.filter(
        (order) =>
          order.orderNumber?.toLowerCase().includes(query) ||
          order.customerName?.toLowerCase().includes(query) ||
          order.customerEmail?.toLowerCase().includes(query) ||
          order.customerMobile?.includes(query) ||
          order._id?.toLowerCase().includes(query) ||
          order.items?.some(
            (item) =>
              item.name?.toLowerCase().includes(query) ||
              item.itemName?.toLowerCase().includes(query) ||
              item.productName?.toLowerCase().includes(query)
          )
      );
      console.log(
        `🔍 After search filter: ${beforeSearch} → ${filtered.length}`
      );
    }

    // ✅ Apply status filter with flexible matching
    if (statusFilter !== "all") {
      const beforeStatus = filtered.length;
      filtered = filtered.filter((order) => {
        const orderStatus = order.status?.toLowerCase() || "";
        const filterStatus = statusFilter.toLowerCase();

        // Direct match first
        if (orderStatus === filterStatus) return true;

        // Flexible matching for common variations
        switch (filterStatus) {
          case "pending":
            return ["draft", "pending", "sent", "created", "new"].includes(
              orderStatus
            );
          case "confirmed":
            return ["confirmed", "approved", "accepted", "processing"].includes(
              orderStatus
            );
          case "completed":
            return [
              "completed",
              "delivered",
              "received",
              "finished",
              "closed",
            ].includes(orderStatus);
          case "cancelled":
            return ["cancelled", "canceled", "rejected"].includes(orderStatus);
          case "shipped":
            return ["shipped", "dispatched", "in_transit"].includes(
              orderStatus
            );
          case "delivered":
            return ["delivered", "completed", "received"].includes(orderStatus);
          default:
            return orderStatus === filterStatus;
        }
      });
      console.log(
        `📋 After status filter (${statusFilter}): ${beforeStatus} → ${filtered.length}`
      );
    }

    // ✅ Apply type filter
    if (typeFilter !== "all") {
      const beforeType = filtered.length;
      filtered = filtered.filter((order) => order.orderType === typeFilter);
      console.log(
        `🏷️ After type filter (${typeFilter}): ${beforeType} → ${filtered.length}`
      );
    }

    // ✅ Apply date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const beforeDate = filtered.length;

      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.orderDate);
        if (isNaN(orderDate.getTime())) return false; // Invalid date

        switch (dateFilter) {
          case "today":
            return orderDate >= startOfToday;
          case "week":
            const weekAgo = new Date(
              startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000
            );
            return orderDate >= weekAgo;
          case "month":
            const monthAgo = new Date(
              startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000
            );
            return orderDate >= monthAgo;
          case "quarter":
            const quarterAgo = new Date(
              startOfToday.getTime() - 90 * 24 * 60 * 60 * 1000
            );
            return orderDate >= quarterAgo;
          case "year":
            const yearAgo = new Date(
              startOfToday.getTime() - 365 * 24 * 60 * 60 * 1000
            );
            return orderDate >= yearAgo;
          default:
            return true;
        }
      });
      console.log(
        `📅 After date filter (${dateFilter}): ${beforeDate} → ${filtered.length}`
      );
    }

    // ✅ Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === "orderDate" || sortBy === "expectedDelivery") {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      } else if (sortBy === "amount") {
        aValue = parseFloat(aValue || 0);
        bValue = parseFloat(bValue || 0);
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue?.toLowerCase() || "";
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    console.log(`✅ Final filtered orders: ${filtered.length}`);
    setFilteredOrders(filtered);
  };

  // ✅ Get status badge with proper styling
  const getStatusBadge = (status) => {
    const variants = {
      draft: {bg: "secondary", icon: faClock, text: "Draft"},
      pending: {bg: "warning", icon: faClock, text: "Pending"},
      sent: {bg: "info", icon: faShare, text: "Sent"},
      confirmed: {bg: "primary", icon: faCheckCircle, text: "Confirmed"},
      approved: {bg: "info", icon: faCheckCircle, text: "Approved"},
      shipped: {bg: "primary", icon: faTruck, text: "Shipped"},
      delivered: {bg: "success", icon: faCheckCircle, text: "Delivered"},
      received: {bg: "success", icon: faBoxes, text: "Received"},
      completed: {bg: "success", icon: faCheckCircle, text: "Completed"},
      cancelled: {bg: "danger", icon: faTimesCircle, text: "Cancelled"},
      expired: {bg: "dark", icon: faExclamationTriangle, text: "Expired"},
    };

    const config = variants[status] || {
      bg: "secondary",
      icon: faExclamationTriangle,
      text: status?.toUpperCase() || "UNKNOWN",
    };

    return (
      <Badge bg={config.bg} className="d-flex align-items-center gap-1">
        <FontAwesomeIcon icon={config.icon} size="xs" />
        {config.text}
      </Badge>
    );
  };

  // ✅ Get order type badge
  const getTypeBadge = (orderType, displayType, icon, colorClass) => {
    return (
      <Badge bg={colorClass} className="d-flex align-items-center gap-1">
        <FontAwesomeIcon icon={icon} size="xs" />
        {displayType}
      </Badge>
    );
  };

  // ✅ Get priority badge
  const getPriorityBadge = (priority) => {
    const variants = {
      high: "danger",
      urgent: "danger",
      medium: "warning",
      normal: "info",
      low: "secondary",
    };
    return (
      <Badge bg={variants[priority] || "secondary"} className="rounded-pill">
        {priority?.toUpperCase() || "NORMAL"}
      </Badge>
    );
  };

  // ✅ Get payment status badge
  const getPaymentStatusBadge = (status) => {
    const variants = {
      paid: "success",
      partial: "warning",
      pending: "warning",
      overdue: "danger",
      refunded: "info",
      not_specified: "secondary",
    };
    return (
      <Badge bg={variants[status] || "secondary"}>
        {status?.replace("_", " ").toUpperCase() || "PENDING"}
      </Badge>
    );
  };

  // ✅ Handle order actions
  const handleOrderAction = (action, order) => {
    switch (action) {
      case "view":
        setSelectedOrder(order);
        setShowOrderModal(true);
        break;
      case "edit":
        addToast?.(
          `Edit functionality for ${order.displayType} ${order.orderNumber} coming soon`,
          "info"
        );
        break;
      case "delete":
        addToast?.(`Delete functionality coming soon`, "info");
        break;
      case "invoice":
        addToast?.(`Generate invoice for ${order.orderNumber}`, "info");
        break;
      case "print":
        addToast?.(`Print ${order.displayType} ${order.orderNumber}`, "info");
        break;
      case "duplicate":
        addToast?.(
          `Duplicate ${order.displayType} ${order.orderNumber}`,
          "info"
        );
        break;
      default:
        addToast?.("Action not implemented", "info");
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
        hour: "2-digit",
        minute: "2-digit",
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

  // ✅ Loading state
  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <h5 className="mt-3 text-muted">Loading company orders...</h5>
          <div className="mt-3">
            <div className="d-flex justify-content-center gap-4">
              <div className="d-flex align-items-center">
                <Spinner
                  animation="grow"
                  size="sm"
                  variant="success"
                  className="me-2"
                />
                <small
                  className={salesLoading ? "text-warning" : "text-success"}
                >
                  Sales Orders {!salesLoading && "✓"}
                </small>
              </div>
              <div className="d-flex align-items-center">
                <Spinner
                  animation="grow"
                  size="sm"
                  variant="primary"
                  className="me-2"
                />
                <small
                  className={purchaseLoading ? "text-warning" : "text-success"}
                >
                  Purchase Orders {!purchaseLoading && "✓"}
                </small>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div>
      {/* Stats Cards - Clickable with Icons */}
      <Row className="g-3 mb-4">
        <Col md={2}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              activeTab === "all" && statusFilter === "all" ? "active-card" : ""
            }`}
            onClick={() => {
              setActiveTab("all");
              setStatusFilter("all"); // Reset status filter
            }}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faShoppingCart}
                className="stat-icon text-primary mb-2"
              />
              <h4 className="text-dark mb-1">{stats.totalOrders}</h4>
              <small className="text-muted">Total Orders</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              activeTab === "sales" && statusFilter === "all"
                ? "active-card"
                : ""
            }`}
            onClick={() => {
              setActiveTab("sales");
              setStatusFilter("all"); // Reset status filter
            }}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faArrowUp}
                className="stat-icon text-success mb-2"
              />
              <h4 className="text-dark mb-1">{stats.salesOrders}</h4>
              <small className="text-muted">Sales Orders</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              activeTab === "purchase" && statusFilter === "all"
                ? "active-card"
                : ""
            }`}
            onClick={() => {
              setActiveTab("purchase");
              setStatusFilter("all"); // Reset status filter
            }}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faArrowDown}
                className="stat-icon text-primary mb-2"
              />
              <h4 className="text-dark mb-1">{stats.purchaseOrders}</h4>
              <small className="text-muted">Purchase Orders</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              statusFilter === "pending" ? "active-card" : ""
            }`}
            onClick={() => {
              setStatusFilter("pending");
              setActiveTab("all");
            }}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faClock}
                className="stat-icon text-warning mb-2"
              />
              <h4 className="text-dark mb-1">{stats.pendingOrders}</h4>
              <small className="text-muted">Pending</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              statusFilter === "confirmed" ? "active-card" : ""
            }`}
            onClick={() => {
              setStatusFilter("confirmed");
              setActiveTab("all");
            }}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faCheckCircle}
                className="stat-icon text-info mb-2"
              />
              <h4 className="text-dark mb-1">{stats.confirmedOrders}</h4>
              <small className="text-muted">Confirmed</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              statusFilter === "completed" ? "active-card" : ""
            }`}
            onClick={() => {
              setStatusFilter("completed");
              setActiveTab("all");
            }}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faCheckCircle}
                className="stat-icon text-success mb-2"
              />
              <h4 className="text-dark mb-1">{stats.completedOrders}</h4>
              <small className="text-muted">Completed</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Revenue Stats - Clickable */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              activeTab === "sales" && statusFilter === "all"
                ? "active-card"
                : ""
            }`}
            onClick={() => {
              setActiveTab("sales");
              setStatusFilter("all"); // Reset status filter
            }}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faDollarSign}
                className="stat-icon text-success mb-2"
              />
              <h4 className="text-dark mb-1">
                {formatCurrency(stats.totalSalesValue)}
              </h4>
              <small className="text-muted">Total Sales Value</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              activeTab === "purchase" && statusFilter === "all"
                ? "active-card"
                : ""
            }`}
            onClick={() => {
              setActiveTab("purchase");
              setStatusFilter("all"); // Reset status filter
            }}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faHandHoldingUsd}
                className="stat-icon text-primary mb-2"
              />
              <h4 className="text-dark mb-1">
                {formatCurrency(stats.totalPurchaseValue)}
              </h4>
              <small className="text-muted">Total Purchase Value</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              activeTab === "all" && statusFilter === "all" ? "active-card" : ""
            }`}
            onClick={() => {
              setActiveTab("all");
              setStatusFilter("all"); // Reset status filter
            }}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faReceipt}
                className="stat-icon text-info mb-2"
              />
              <h4 className="text-dark mb-1">
                {formatCurrency(stats.totalValue)}
              </h4>
              <small className="text-muted">Total Order Value</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      {/* Main Orders Card */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="neutral-header">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0 fw-semibold neutral-text">
              <FontAwesomeIcon
                icon={faShoppingCart}
                className="me-2 neutral-muted"
              />
              Company Orders ({filteredOrders.length})
            </h5>
            <div className="d-flex gap-2">
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
            onSelect={setActiveTab}
            className="mb-3 neutral-tabs"
          >
            <Tab
              eventKey="all"
              title={
                <span>
                  <FontAwesomeIcon icon={faShoppingCart} className="me-1" />
                  All ({stats.totalOrders})
                </span>
              }
            />
            <Tab
              eventKey="sales"
              title={
                <span>
                  <FontAwesomeIcon icon={faArrowUp} className="me-1" />
                  Sales ({stats.salesOrders})
                </span>
              }
            />
            <Tab
              eventKey="purchase"
              title={
                <span>
                  <FontAwesomeIcon icon={faArrowDown} className="me-1" />
                  Purchase ({stats.purchaseOrders})
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
                  placeholder="Search orders..."
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
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                size="sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="neutral-input"
              >
                <option value="all">All Types</option>
                <option value="sales">Sales Orders</option>
                <option value="purchase">Purchase Orders</option>
              </Form.Select>
            </Col>
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
                <option value="orderDate-desc">Latest First</option>
                <option value="orderDate-asc">Oldest First</option>
                <option value="amount-desc">Highest Value</option>
                <option value="amount-asc">Lowest Value</option>
                <option value="customerName-asc">Customer A-Z</option>
                <option value="customerName-desc">Customer Z-A</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <small className="neutral-muted d-block mt-2">
                {filteredOrders.length} of{" "}
                {activeTab === "all"
                  ? stats.totalOrders
                  : activeTab === "sales"
                  ? stats.salesOrders
                  : stats.purchaseOrders}{" "}
                orders
              </small>
            </Col>
          </Row>
        </Card.Header>

        <Card.Body className="p-0">
          {filteredOrders.length > 0 ? (
            <div
              className="table-responsive"
              style={{maxHeight: "600px", overflowY: "auto"}}
            >
              <Table className="mb-0 clean-table">
                <thead className="sticky-top">
                  <tr>
                    <th>
                      Order Details
                      <FontAwesomeIcon
                        icon={faSort}
                        className="ms-2 text-muted"
                      />
                    </th>
                    <th>Customer/Supplier</th>
                    <th>Type & Status</th>
                    <th>
                      Amount
                      <FontAwesomeIcon
                        icon={faSort}
                        className="ms-2 text-muted"
                      />
                    </th>
                    <th>Items</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr
                      key={`${order.orderType}-${order._id || order.id}`}
                      className="item-row"
                    >
                      <td>
                        <div>
                          <div className="fw-semibold text-dark mb-1">
                            <FontAwesomeIcon
                              icon={order.icon}
                              className={`me-2 text-${order.colorClass}`}
                            />
                            {order.orderNumber}
                          </div>
                          <small className="text-muted">
                            ID: {order._id?.slice(-8) || "N/A"}
                          </small>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="fw-semibold text-dark mb-1">
                            {order.customerName}
                          </div>
                          {order.customerEmail && (
                            <small className="text-muted d-block">
                              <FontAwesomeIcon
                                icon={faEnvelope}
                                className="me-1"
                              />
                              {order.customerEmail}
                            </small>
                          )}
                          {order.customerMobile && (
                            <small className="text-muted d-block">
                              <FontAwesomeIcon
                                icon={faPhone}
                                className="me-1"
                              />
                              {order.customerMobile}
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-column gap-1">
                          {getTypeBadge(
                            order.orderType,
                            order.displayType,
                            order.icon,
                            order.colorClass
                          )}
                          {getStatusBadge(order.status)}
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="fw-bold text-dark">
                            {formatCurrency(order.amount)}
                          </div>
                          <small className="text-muted">
                            {order.orderType === "sales" ? "Sales" : "Purchase"}{" "}
                            Value
                          </small>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="fw-semibold text-dark">
                            {order.items?.length || 0} item
                            {(order.items?.length || 0) !== 1 ? "s" : ""}
                          </div>
                          {order.items?.length > 0 && (
                            <small className="text-muted">
                              {order.items
                                .slice(0, 2)
                                .map(
                                  (item) =>
                                    item.name ||
                                    item.itemName ||
                                    item.productName
                                )
                                .filter(Boolean)
                                .join(", ")}
                              {order.items.length > 2 &&
                                ` +${order.items.length - 2} more`}
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <small className="text-muted d-block">
                            <strong>Ordered:</strong>
                            <br />
                            {formatDate(order.orderDate)}
                          </small>
                          {order.expectedDelivery && (
                            <small className="text-muted d-block mt-1">
                              <strong>Expected:</strong>
                              <br />
                              {formatDate(order.expectedDelivery)}
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        <Dropdown>
                          <Dropdown.Toggle
                            variant="link"
                            className="text-muted p-0 border-0 shadow-none"
                          >
                            <FontAwesomeIcon icon={faEllipsisV} />
                          </Dropdown.Toggle>
                          <Dropdown.Menu align="end">
                            <Dropdown.Item
                              onClick={() => handleOrderAction("view", order)}
                            >
                              <FontAwesomeIcon icon={faEye} className="me-2" />
                              View Details
                            </Dropdown.Item>
                            <Dropdown.Item
                              onClick={() => handleOrderAction("print", order)}
                            >
                              <FontAwesomeIcon
                                icon={faPrint}
                                className="me-2"
                              />
                              Print Order
                            </Dropdown.Item>
                            <Dropdown.Item
                              onClick={() =>
                                handleOrderAction("invoice", order)
                              }
                            >
                              <FontAwesomeIcon
                                icon={faFileInvoice}
                                className="me-2"
                              />
                              Generate Invoice
                            </Dropdown.Item>
                            {(userRole === "owner" || userRole === "admin") && (
                              <>
                                <Dropdown.Divider />
                                <Dropdown.Item
                                  onClick={() =>
                                    handleOrderAction("edit", order)
                                  }
                                >
                                  <FontAwesomeIcon
                                    icon={faEdit}
                                    className="me-2"
                                  />
                                  Edit Order
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item
                                  onClick={() =>
                                    handleOrderAction("delete", order)
                                  }
                                  className="text-danger"
                                >
                                  <FontAwesomeIcon
                                    icon={faTrash}
                                    className="me-2"
                                  />
                                  Delete Order
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
                icon={
                  activeTab === "sales"
                    ? faArrowUp
                    : activeTab === "purchase"
                    ? faArrowDown
                    : faShoppingCart
                }
                className="fs-1 text-muted mb-3"
              />
              <h6 className="text-muted">
                No{" "}
                {activeTab === "sales"
                  ? "sales orders"
                  : activeTab === "purchase"
                  ? "purchase orders"
                  : "orders"}{" "}
                found
              </h6>
              <p className="text-muted">
                {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : `This company hasn't ${
                      activeTab === "sales"
                        ? "created any sales orders"
                        : activeTab === "purchase"
                        ? "created any purchase orders"
                        : "received any orders"
                    } yet`}
              </p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Order Details Modal */}
      <Modal
        show={showOrderModal}
        onHide={() => setShowOrderModal(false)}
        size="xl"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon
              icon={selectedOrder?.icon || faShoppingCart}
              className="me-2"
            />
            {selectedOrder?.displayType} Details - {selectedOrder?.orderNumber}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder && (
            <Row>
              <Col md={6}>
                <Card className="border-0 bg-light h-100">
                  <Card.Header
                    className={`bg-${selectedOrder.colorClass} text-white`}
                  >
                    <h6 className="mb-0">
                      <FontAwesomeIcon icon={faUser} className="me-2" />
                      {selectedOrder.orderType === "sales"
                        ? "Customer"
                        : "Supplier"}{" "}
                      Information
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <p>
                      <strong>Name:</strong> {selectedOrder.customerName}
                    </p>
                    {selectedOrder.customerEmail && (
                      <p>
                        <strong>Email:</strong> {selectedOrder.customerEmail}
                      </p>
                    )}
                    {selectedOrder.customerMobile && (
                      <p>
                        <strong>Phone:</strong> {selectedOrder.customerMobile}
                      </p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="border-0 bg-light h-100">
                  <Card.Header className="bg-info text-white">
                    <h6 className="mb-0">
                      <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                      Order Information
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <p>
                      <strong>Order Number:</strong> {selectedOrder.orderNumber}
                    </p>
                    <p>
                      <strong>Type:</strong>{" "}
                      {getTypeBadge(
                        selectedOrder.orderType,
                        selectedOrder.displayType,
                        selectedOrder.icon,
                        selectedOrder.colorClass
                      )}
                    </p>
                    <p>
                      <strong>Status:</strong>{" "}
                      {getStatusBadge(selectedOrder.status)}
                    </p>
                    <p>
                      <strong>Order Date:</strong>{" "}
                      {formatDate(selectedOrder.orderDate)}
                    </p>
                    {selectedOrder.expectedDelivery && (
                      <p>
                        <strong>Expected Delivery:</strong>{" "}
                        {formatDate(selectedOrder.expectedDelivery)}
                      </p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              <Col md={12} className="mt-3">
                <Card className="border-0 bg-light">
                  <Card.Header className="bg-success text-white">
                    <h6 className="mb-0">
                      <FontAwesomeIcon icon={faBoxes} className="me-2" />
                      Order Items ({selectedOrder.items?.length || 0})
                    </h6>
                  </Card.Header>
                  <Card.Body className="p-0">
                    {selectedOrder.items?.length > 0 ? (
                      <Table className="mb-0">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.items.map((item, index) => (
                            <tr key={index}>
                              <td>
                                {item.name ||
                                  item.itemName ||
                                  item.productName ||
                                  "Unnamed Item"}
                              </td>
                              <td>{item.quantity || 0}</td>
                              <td>
                                {formatCurrency(
                                  item.price || item.pricePerUnit || 0
                                )}
                              </td>
                              <td>
                                {formatCurrency(
                                  (item.quantity || 0) *
                                    (item.price || item.pricePerUnit || 0)
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="table-primary">
                            <td colSpan="3" className="text-end">
                              <strong>Total:</strong>
                            </td>
                            <td>
                              <strong>
                                {formatCurrency(selectedOrder.amount)}
                              </strong>
                            </td>
                          </tr>
                        </tfoot>
                      </Table>
                    ) : (
                      <div className="text-center py-3 text-muted">
                        No items found for this order
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              {selectedOrder.notes && (
                <Col md={12} className="mt-3">
                  <Card className="border-0 bg-light">
                    <Card.Header className="bg-warning text-dark">
                      <h6 className="mb-0">Notes</h6>
                    </Card.Header>
                    <Card.Body>
                      <p className="mb-0">{selectedOrder.notes}</p>
                    </Card.Body>
                  </Card>
                </Col>
              )}
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowOrderModal(false)}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => handleOrderAction("print", selectedOrder)}
          >
            <FontAwesomeIcon icon={faPrint} className="me-2" />
            Print Order
          </Button>
          <Button
            variant="success"
            onClick={() => handleOrderAction("invoice", selectedOrder)}
          >
            <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
            Generate Invoice
          </Button>
        </Modal.Footer>
      </Modal>

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

        /* Loading states */
        .clickable-card.loading {
          pointer-events: none;
          opacity: 0.7;
        }

        /* Focus states for accessibility */
        .clickable-card:focus {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

export default CompanyOrders;
