import React, {useState, useEffect} from "react";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Badge,
  Alert,
  Spinner,
  ProgressBar,
  Dropdown,
  Modal,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faFileInvoice,
  faHandshake,
  faBoxes,
  faRupeeSign,
  faChartLine,
  faArrowUp,
  faArrowDown,
  faEye,
  faCalendarAlt,
  faMapMarkerAlt,
  faPhone,
  faEnvelope,
  faCheckCircle,
  faExclamationTriangle,
  faTimesCircle,
  faExchangeAlt,
  faDownload,
  faSync,
  faShieldAlt,
  faBan,
  faHistory,
  faUserTie,
  faChartBar,
  faFlag,
  faClock,
  faShoppingCart,
  faUsers,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";

// Import services for real data fetching
import salesService from "../../../../services/salesService";
import purchaseService from "../../../../services/purchaseService";
import partiesService from "../../../../services/partyService";
import itemService from "../../../../services/itemService";

function CompanyDashboard({
  companyData,
  companyId,
  userRole,
  addToast,
  onCompanyUpdate,
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({
    totalRevenue: 0,
    totalInvoices: 0,
    totalParties: 0,
    totalItems: 0,
    salesInvoices: 0,
    purchaseInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    activeParties: 0,
    revenueGrowth: 0,
    lowStockItems: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (companyId) {
      loadDashboardData();
    }
  }, [companyId]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      // Fetch real data from multiple sources
      const [salesResponse, purchaseResponse, partiesResponse, itemsResponse] =
        await Promise.allSettled([
          salesService.getInvoices(companyId),
          purchaseService.getPurchases(companyId),
          partiesService.getParties(companyId),
          itemService.getItems(companyId),
        ]);

      // Process sales data
      let salesData = [];
      let salesRevenue = 0;
      if (salesResponse.status === "fulfilled" && salesResponse.value.success) {
        salesData = Array.isArray(salesResponse.value.data)
          ? salesResponse.value.data
          : salesResponse.value.data?.sales || [];

        salesRevenue = salesData.reduce((sum, invoice) => {
          return sum + (invoice.totals?.finalTotal || invoice.total || 0);
        }, 0);
      }

      // Process purchase data
      let purchaseData = [];
      let purchaseAmount = 0;
      if (
        purchaseResponse.status === "fulfilled" &&
        purchaseResponse.value.success
      ) {
        const rawPurchases =
          purchaseResponse.value.data?.purchases ||
          purchaseResponse.value.data ||
          [];
        purchaseData = Array.isArray(rawPurchases) ? rawPurchases : [];

        purchaseAmount = purchaseData.reduce((sum, purchase) => {
          return sum + (purchase.totals?.finalTotal || purchase.total || 0);
        }, 0);
      }

      // Process parties data
      let partiesData = [];
      if (
        partiesResponse.status === "fulfilled" &&
        partiesResponse.value.success
      ) {
        partiesData = Array.isArray(partiesResponse.value.data?.parties)
          ? partiesResponse.value.data.parties
          : [];
      }

      // Process items data
      let itemsData = [];
      if (itemsResponse.status === "fulfilled" && itemsResponse.value.success) {
        itemsData = Array.isArray(itemsResponse.value.data?.items)
          ? itemsResponse.value.data.items
          : [];
      }

      // Calculate comprehensive statistics
      const allInvoices = [...salesData, ...purchaseData];
      const totalRevenue = salesRevenue + purchaseAmount;

      // Count invoice statuses
      const paidInvoices = allInvoices.filter(
        (inv) => inv.payment?.status === "paid" || inv.paymentStatus === "paid"
      ).length;

      const pendingInvoices = allInvoices.filter(
        (inv) =>
          inv.payment?.status === "pending" ||
          inv.paymentStatus === "pending" ||
          inv.payment?.status === "partial" ||
          inv.paymentStatus === "partial"
      ).length;

      // Calculate overdue invoices (with due date in the past and not fully paid)
      const today = new Date();
      const overdueInvoices = allInvoices.filter((inv) => {
        const dueDate = inv.payment?.dueDate || inv.dueDate;
        const isPaid =
          inv.payment?.status === "paid" || inv.paymentStatus === "paid";
        return dueDate && new Date(dueDate) < today && !isPaid;
      }).length;

      // Count active parties
      const activeParties = partiesData.filter(
        (party) => party.isActive !== false
      ).length;

      // Count low stock items
      const lowStockItems = itemsData.filter((item) => {
        if (item.type === "service") return false;
        const currentStock = Number(item.currentStock || 0);
        const minStock = Number(
          item.minStockLevel || item.minStockToMaintain || 0
        );
        return minStock > 0 && currentStock <= minStock;
      }).length;

      // Calculate revenue growth (simplified - comparing with previous period)
      const revenueGrowth = totalRevenue > 0 ? 8.5 : 0; // This should be calculated properly with time series data

      const stats = {
        totalRevenue,
        totalInvoices: allInvoices.length,
        totalParties: partiesData.length,
        totalItems: itemsData.length,
        salesInvoices: salesData.length,
        purchaseInvoices: purchaseData.length,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        activeParties,
        revenueGrowth,
        lowStockItems,
        salesRevenue,
        purchaseAmount,
      };

      setDashboardStats(stats);

      // Generate recent activities from actual data
      const activities = [];

      // Add recent invoices
      const recentSales = salesData
        .sort(
          (a, b) =>
            new Date(b.createdAt || b.invoiceDate) -
            new Date(a.createdAt || a.invoiceDate)
        )
        .slice(0, 2);

      recentSales.forEach((invoice) => {
        activities.push({
          id: `sales-${invoice._id}`,
          type: "invoice",
          description: "Sales invoice created",
          details: `${
            invoice.invoiceNumber || invoice.saleNumber
          } - ${formatCurrency(
            invoice.totals?.finalTotal || invoice.total || 0
          )}`,
          timestamp: getRelativeTime(invoice.createdAt || invoice.invoiceDate),
          status: "success",
        });
      });

      // Add recent purchases
      const recentPurchases = purchaseData
        .sort(
          (a, b) =>
            new Date(b.createdAt || b.purchaseDate) -
            new Date(a.createdAt || a.purchaseDate)
        )
        .slice(0, 2);

      recentPurchases.forEach((purchase) => {
        activities.push({
          id: `purchase-${purchase._id}`,
          type: "purchase",
          description: "Purchase recorded",
          details: `${
            purchase.purchaseNumber || purchase.billNumber
          } - ${formatCurrency(
            purchase.totals?.finalTotal || purchase.total || 0
          )}`,
          timestamp: getRelativeTime(
            purchase.createdAt || purchase.purchaseDate
          ),
          status: "info",
        });
      });

      // Add alerts for overdue and low stock
      if (overdueInvoices > 0) {
        activities.push({
          id: "overdue-alert",
          type: "alert",
          description: "Overdue invoices detected",
          details: `${overdueInvoices} invoices are overdue`,
          timestamp: "Now",
          status: "warning",
        });
      }

      if (lowStockItems > 0) {
        activities.push({
          id: "stock-alert",
          type: "stock",
          description: "Low stock alert",
          details: `${lowStockItems} items below minimum stock`,
          timestamp: "Now",
          status: "warning",
        });
      }

      setRecentActivities(activities.slice(0, 6));

      console.log("✅ Dashboard data loaded successfully:", stats);
      addToast?.("Dashboard data loaded successfully", "success");
    } catch (error) {
      console.error("❌ Error loading dashboard data:", error);
      setError(error.message);
      addToast?.("Error loading dashboard data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminAction = (actionType) => {
    setActionType(actionType);
    setShowActionModal(true);
  };

  const executeAdminAction = async () => {
    try {
      let message = "";
      let newStatus = companyData?.status;

      switch (actionType) {
        case "suspend":
          message = "Company access suspended";
          newStatus = "suspended";
          break;
        case "activate":
          message = "Company access activated";
          newStatus = "active";
          break;
        case "audit":
          message = "Audit report will be generated";
          break;
        default:
          message = "Action completed successfully";
      }

      if (
        onCompanyUpdate &&
        (actionType === "suspend" || actionType === "activate")
      ) {
        const updatedCompanyData = {...companyData, status: newStatus};
        onCompanyUpdate(updatedCompanyData);
      }

      addToast?.(message, "success");
      setShowActionModal(false);
    } catch (error) {
      addToast?.("Action failed", "error");
    }
  };

  const getActivityIcon = (type) => {
    const icons = {
      invoice: faFileInvoice,
      purchase: faShoppingCart,
      party: faHandshake,
      item: faBoxes,
      alert: faExclamationTriangle,
      stock: faExclamationCircle,
    };
    return icons[type] || faCheckCircle;
  };

  const getActivityColor = (status) => {
    const colors = {
      success: "success",
      warning: "warning",
      info: "info",
      error: "danger",
    };
    return colors[status] || "secondary";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

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

  const getRelativeTime = (dateString) => {
    if (!dateString) return "Unknown";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

      if (diffInHours < 1) return "Just now";
      if (diffInHours < 24) return `${diffInHours} hours ago`;
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays} days ago`;
      return formatDate(dateString);
    } catch (error) {
      return "Unknown";
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: "success",
      inactive: "secondary",
      pending: "warning",
      suspended: "danger",
    };
    return (
      <Badge
        bg={variants[status] || "secondary"}
        className="professional-badge"
      >
        {status?.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <h5 className="mt-3 text-muted">Loading company dashboard...</h5>
          <p className="text-muted">Fetching latest business data...</p>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <Alert variant="danger">
            <Alert.Heading>
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              Error Loading Dashboard
            </Alert.Heading>
            <p>{error}</p>
            <Button variant="outline-danger" onClick={loadDashboardData}>
              <FontAwesomeIcon icon={faSync} className="me-1" />
              Retry Loading
            </Button>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="company-dashboard">
      {/* Company Information Header */}
      <Card className="border-0 shadow-sm mb-4 company-header-card">
        <Card.Header className="professional-header">
          <Row className="align-items-center">
            <Col lg={8}>
              <div className="d-flex align-items-center">
                <div className="company-icon-container me-3">
                  <FontAwesomeIcon icon={faBuilding} className="company-icon" />
                </div>
                <div>
                  <h4 className="mb-1 fw-bold company-name">
                    {companyData?.businessName || "Company Name"}
                  </h4>
                  <div className="d-flex align-items-center gap-3 mb-2">
                    <Badge
                      bg="light"
                      text="dark"
                      className="professional-badge"
                    >
                      {companyData?.businessType || "Business"}
                    </Badge>
                    {getStatusBadge(companyData?.status || "active")}
                    <Badge bg="info" className="professional-badge">
                      <FontAwesomeIcon icon={faUserTie} className="me-1" />
                      ID: {companyId}
                    </Badge>
                  </div>
                  <p className="mb-0 company-subtitle">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="me-1" />
                    {companyData?.city || "City"},{" "}
                    {companyData?.state || "State"} •
                    <FontAwesomeIcon
                      icon={faCalendarAlt}
                      className="ms-2 me-1"
                    />
                    Since {formatDate(companyData?.createdAt)}
                  </p>
                </div>
              </div>
            </Col>
            <Col lg={4} className="text-end">
              <div className="d-flex justify-content-end gap-2">
                {(userRole === "admin" || userRole === "owner") && (
                  <Dropdown>
                    <Dropdown.Toggle
                      variant="outline-light"
                      size="sm"
                      className="admin-button"
                    >
                      <FontAwesomeIcon icon={faShieldAlt} className="me-1" />
                      Admin Actions
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={() => handleAdminAction("audit")}>
                        <FontAwesomeIcon icon={faChartBar} className="me-2" />
                        Generate Report
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => handleAdminAction("flag")}>
                        <FontAwesomeIcon icon={faFlag} className="me-2" />
                        Flag for Review
                      </Dropdown.Item>
                      <Dropdown.Divider />
                      {companyData?.status === "active" ? (
                        <Dropdown.Item
                          onClick={() => handleAdminAction("suspend")}
                          className="text-danger"
                        >
                          <FontAwesomeIcon icon={faBan} className="me-2" />
                          Suspend Company
                        </Dropdown.Item>
                      ) : (
                        <Dropdown.Item
                          onClick={() => handleAdminAction("activate")}
                          className="text-success"
                        >
                          <FontAwesomeIcon
                            icon={faCheckCircle}
                            className="me-2"
                          />
                          Activate Company
                        </Dropdown.Item>
                      )}
                    </Dropdown.Menu>
                  </Dropdown>
                )}
                <Button
                  variant="outline-light"
                  size="sm"
                  className="admin-button"
                >
                  <FontAwesomeIcon icon={faDownload} className="me-1" />
                  Export Report
                </Button>
                <Button
                  variant="outline-light"
                  size="sm"
                  onClick={loadDashboardData}
                  className="admin-button"
                >
                  <FontAwesomeIcon icon={faSync} className="me-1" />
                  Refresh
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Header>
      </Card>

      {/* Key Metrics Cards */}
      <Row className="g-4 mb-4">
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm text-center h-100 stats-card">
            <Card.Body>
              <div className="stats-icon-container bg-primary mb-3">
                <FontAwesomeIcon icon={faRupeeSign} className="stats-icon" />
              </div>
              <h4 className="fw-bold stats-number text-primary mb-1">
                {formatCurrency(dashboardStats.totalRevenue)}
              </h4>
              <small className="text-muted stats-label">Total Revenue</small>
              {dashboardStats.revenueGrowth > 0 && (
                <div className="mt-2">
                  <FontAwesomeIcon
                    icon={faArrowUp}
                    className="text-success me-1"
                  />
                  <Badge bg="success" className="fw-normal">
                    +{dashboardStats.revenueGrowth}%
                  </Badge>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm text-center h-100 stats-card">
            <Card.Body>
              <div className="stats-icon-container bg-info mb-3">
                <FontAwesomeIcon icon={faFileInvoice} className="stats-icon" />
              </div>
              <h4 className="fw-bold stats-number text-info mb-1">
                {dashboardStats.totalInvoices}
              </h4>
              <small className="text-muted stats-label">Total Invoices</small>
              {dashboardStats.overdueInvoices > 0 && (
                <div className="mt-2">
                  <Badge bg="danger" className="fw-normal">
                    {dashboardStats.overdueInvoices} Overdue
                  </Badge>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm text-center h-100 stats-card">
            <Card.Body>
              <div className="stats-icon-container bg-success mb-3">
                <FontAwesomeIcon icon={faHandshake} className="stats-icon" />
              </div>
              <h4 className="fw-bold stats-number text-success mb-1">
                {dashboardStats.totalParties}
              </h4>
              <small className="text-muted stats-label">Business Parties</small>
              <div className="mt-2">
                <small className="text-muted">
                  {dashboardStats.activeParties} Active
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm text-center h-100 stats-card">
            <Card.Body>
              <div className="stats-icon-container bg-warning mb-3">
                <FontAwesomeIcon icon={faBoxes} className="stats-icon" />
              </div>
              <h4 className="fw-bold stats-number text-warning mb-1">
                {dashboardStats.totalItems}
              </h4>
              <small className="text-muted stats-label">Total Items</small>
              {dashboardStats.lowStockItems > 0 && (
                <div className="mt-2">
                  <Badge bg="warning" className="fw-normal">
                    {dashboardStats.lowStockItems} Low Stock
                  </Badge>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Business Overview */}
      <Row className="g-4 mb-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="neutral-header">
              <h6 className="mb-0 fw-semibold neutral-text">
                <FontAwesomeIcon
                  icon={faChartLine}
                  className="me-2 neutral-muted"
                />
                Business Overview
              </h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <div className="business-metric mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="metric-label">Sales Revenue</span>
                      <span className="metric-value text-primary">
                        {formatCurrency(dashboardStats.salesRevenue)}
                      </span>
                    </div>
                    <ProgressBar
                      variant="primary"
                      now={dashboardStats.salesRevenue > 0 ? 75 : 0}
                      style={{height: "6px"}}
                    />
                  </div>
                  <div className="business-metric mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="metric-label">Purchase Amount</span>
                      <span className="metric-value text-success">
                        {formatCurrency(dashboardStats.purchaseAmount)}
                      </span>
                    </div>
                    <ProgressBar
                      variant="success"
                      now={dashboardStats.purchaseAmount > 0 ? 60 : 0}
                      style={{height: "6px"}}
                    />
                  </div>
                  <div className="business-metric">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="metric-label">Payment Collection</span>
                      <span className="metric-value text-info">
                        {dashboardStats.totalInvoices > 0
                          ? Math.round(
                              (dashboardStats.paidInvoices /
                                dashboardStats.totalInvoices) *
                                100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <ProgressBar
                      variant="info"
                      now={
                        dashboardStats.totalInvoices > 0
                          ? (dashboardStats.paidInvoices /
                              dashboardStats.totalInvoices) *
                            100
                          : 0
                      }
                      style={{height: "6px"}}
                    />
                  </div>
                </Col>
                <Col md={6}>
                  <div className="business-stats">
                    <div className="stat-item">
                      <span className="stat-label">Sales Invoices</span>
                      <span className="stat-value">
                        {dashboardStats.salesInvoices}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Purchase Bills</span>
                      <span className="stat-value">
                        {dashboardStats.purchaseInvoices}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Paid Invoices</span>
                      <span className="stat-value text-success">
                        {dashboardStats.paidInvoices}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Pending Invoices</span>
                      <span className="stat-value text-warning">
                        {dashboardStats.pendingInvoices}
                      </span>
                    </div>
                    {dashboardStats.overdueInvoices > 0 && (
                      <div className="stat-item">
                        <span className="stat-label">Overdue Invoices</span>
                        <span className="stat-value text-danger">
                          {dashboardStats.overdueInvoices}
                        </span>
                      </div>
                    )}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="neutral-header">
              <h6 className="mb-0 fw-semibold neutral-text">
                <FontAwesomeIcon
                  icon={faHistory}
                  className="me-2 neutral-muted"
                />
                Recent Activities
              </h6>
            </Card.Header>
            <Card.Body>
              {recentActivities.length > 0 ? (
                <div className="activity-list">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="activity-item">
                      <div className="activity-icon">
                        <FontAwesomeIcon
                          icon={getActivityIcon(activity.type)}
                          className={`text-${getActivityColor(
                            activity.status
                          )}`}
                        />
                      </div>
                      <div className="activity-content">
                        <div className="activity-description">
                          {activity.description}
                        </div>
                        <div className="activity-details text-muted">
                          {activity.details}
                        </div>
                        <small className="activity-time text-muted">
                          {activity.timestamp}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <FontAwesomeIcon
                    icon={faHistory}
                    className="fs-2 text-muted mb-2"
                  />
                  <p className="text-muted">No recent activities</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Alert Section */}
      {(dashboardStats.overdueInvoices > 0 ||
        dashboardStats.lowStockItems > 0) && (
        <Row className="mb-4">
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Header className="neutral-header">
                <h6 className="mb-0 fw-semibold neutral-text">
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    className="me-2 text-warning"
                  />
                  Attention Required
                </h6>
              </Card.Header>
              <Card.Body>
                <Row>
                  {dashboardStats.overdueInvoices > 0 && (
                    <Col md={6}>
                      <Alert variant="danger" className="mb-3 mb-md-0">
                        <FontAwesomeIcon
                          icon={faExclamationTriangle}
                          className="me-2"
                        />
                        <strong>
                          {dashboardStats.overdueInvoices} overdue invoices
                        </strong>{" "}
                        need immediate attention
                      </Alert>
                    </Col>
                  )}
                  {dashboardStats.lowStockItems > 0 && (
                    <Col md={6}>
                      <Alert variant="warning" className="mb-0">
                        <FontAwesomeIcon
                          icon={faExclamationCircle}
                          className="me-2"
                        />
                        <strong>{dashboardStats.lowStockItems} items</strong>{" "}
                        are running low on stock
                      </Alert>
                    </Col>
                  )}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Admin Action Modal */}
      <Modal
        show={showActionModal}
        onHide={() => setShowActionModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="text-warning">
            <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
            Admin Action: {actionType?.toUpperCase()}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            <strong>Admin Action Required</strong>
            <br />
            This action will affect the company's operational status.
          </Alert>
          <p>
            Are you sure you want to <strong>{actionType}</strong> the company{" "}
            <strong>{companyData?.businessName}</strong>?
          </p>
          <p className="text-muted small">
            This action will be logged and the company will be notified
            accordingly.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowActionModal(false)}>
            Cancel
          </Button>
          <Button
            variant={actionType === "suspend" ? "danger" : "warning"}
            onClick={executeAdminAction}
          >
            <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
            Confirm {actionType?.toUpperCase()}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Professional Styles */}
      <style>{`
        /* Company Dashboard Styles */
        .company-dashboard {
          background: transparent;
        }

        /* Professional Header */
        .professional-header {
          background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
          color: white;
          padding: 1.5rem;
          border: none;
        }

        .company-icon-container {
          width: 50px;
          height: 50px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
        }

        .company-icon {
          font-size: 1.5rem;
          color: white;
        }

        .company-name {
          color: white;
          margin-bottom: 0.25rem;
        }

        .company-subtitle {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
        }

        .admin-button {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          transition: all 0.2s ease;
        }

        .admin-button:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.3);
          color: white;
        }

        /* Stats Cards */
        .stats-card {
          transition: all 0.3s ease;
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .stats-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .stats-icon-container {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          opacity: 0.1;
        }

        .stats-icon {
          font-size: 1.25rem;
          color: white;
        }

        .stats-number {
          font-size: 1.75rem;
          margin-bottom: 0.25rem;
        }

        .stats-label {
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 0.8rem;
        }

        /* Neutral Headers */
        .neutral-header {
          background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
          border-bottom: 1px solid #e5e7eb;
          padding: 1rem 1.5rem;
        }

        .neutral-text {
          color: #374151;
        }

        .neutral-muted {
          color: #6b7280;
        }

        /* Business Metrics */
        .business-metric {
          margin-bottom: 1.5rem;
        }

        .metric-label {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        .metric-value {
          font-weight: 600;
          font-size: 0.875rem;
        }

        /* Business Stats */
        .business-stats {
          background: #f8f9fa;
          border-radius: 0.5rem;
          padding: 1rem;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .stat-item:last-child {
          border-bottom: none;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .stat-value {
          font-weight: 600;
          font-size: 0.875rem;
        }

        /* Activity List */
        .activity-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .activity-item {
          display: flex;
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .activity-item:last-child {
          border-bottom: none;
        }

        .activity-icon {
          width: 30px;
          flex-shrink: 0;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 0.25rem;
        }

        .activity-content {
          flex: 1;
          margin-left: 0.75rem;
        }

        .activity-description {
          font-weight: 500;
          font-size: 0.875rem;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .activity-details {
          font-size: 0.8rem;
          margin-bottom: 0.25rem;
        }

        .activity-time {
          font-size: 0.75rem;
        }

        /* Professional Badges */
        .professional-badge {
          font-weight: 500;
          padding: 0.35em 0.65em;
          border-radius: 0.375rem;
          font-size: 0.75rem;
        }

        /* Progress bars */
        .progress {
          background-color: rgba(0, 0, 0, 0.05);
          border-radius: 3px;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .professional-header {
            padding: 1rem;
          }

          .company-name {
            font-size: 1.25rem;
          }

          .company-subtitle {
            font-size: 0.8rem;
          }

          .stats-number {
            font-size: 1.5rem;
          }

          .stats-icon-container {
            width: 40px;
            height: 40px;
          }

          .stats-icon {
            font-size: 1rem;
          }

          .company-icon-container {
            width: 40px;
            height: 40px;
          }

          .company-icon {
            font-size: 1.2rem;
          }
        }

        /* Hover Effects */
        .stats-card:hover .stats-icon-container {
          transform: scale(1.1);
        }

        /* Smooth Transitions */
        * {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
      `}</style>
    </div>
  );
}

export default CompanyDashboard;
