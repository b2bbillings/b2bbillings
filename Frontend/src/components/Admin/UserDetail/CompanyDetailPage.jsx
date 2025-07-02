import React, {useState, useEffect} from "react";
import {useParams, useLocation, useNavigate} from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Spinner,
  Alert,
  Tab,
  Nav,
  ProgressBar,
  Dropdown,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faArrowLeft,
  faUsers,
  faFileInvoice,
  faBoxes,
  faChartLine,
  faCog,
  faTachometerAlt,
  faHandshake,
  faExchangeAlt,
  faShoppingCart,
  faCalendarAlt,
  faPhone,
  faClipboardList,
  faExclamationTriangle,
  faRupeeSign,
  faArrowUp,
  faHistory,
  faCheckCircle,
  faExclamationCircle,
  faShieldAlt,
  faDownload,
  faSync,
  faBan,
  faFlag,
  faChartBar,
} from "@fortawesome/free-solid-svg-icons";

// Import tab components (excluding dashboard)
import CompanyInvoices from "../UserDetail/ComapnyTabs/CompanyInvoices";
import CompanyItems from "../UserDetail/ComapnyTabs/CompanyItems";
import CompanyOrders from "../UserDetail/ComapnyTabs/CompanyOrders";
import CompanyParties from "../UserDetail/ComapnyTabs/CompanyParties";
import CompanyTransactions from "../UserDetail/ComapnyTabs/CompanyTransactions";

// Import services for real data fetching
import companyService from "../../../services/companyService";
import salesService from "../../../services/salesService";
import purchaseService from "../../../services/purchaseService";
import partiesService from "../../../services/partyService";
import itemService from "../../../services/itemService";

function CompanyDetailPage({addToast}) {
  const {companyId} = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [companyData, setCompanyData] = useState(null);
  const [error, setError] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
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
    salesRevenue: 0,
    purchaseAmount: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);

  // Get data from navigation state or fetch fresh
  const stateData = location.state;
  const backTo = stateData?.backTo || "/admin/companies";
  const userRole = stateData?.userRole || "viewer";

  useEffect(() => {
    loadCompanyDetails();
  }, [companyId]);

  useEffect(() => {
    if (activeTab === "dashboard" && companyData) {
      loadDashboardData();
    }
  }, [activeTab, companyData]);

  const loadCompanyDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // If we have company data from state, use it initially
      if (stateData?.companyData) {
        setCompanyData(stateData.companyData);
        setIsLoading(false);
        return;
      }

      // Fetch company details from API
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await companyService.getCompanyById(companyId);

      if (response.success) {
        setCompanyData(response.data);
        addToast?.("Company details loaded successfully", "success");
      } else {
        throw new Error(response.message || "Failed to load company details");
      }
    } catch (error) {
      console.error("Error loading company details:", error);
      setError(error.message);
      addToast?.("Failed to load company details", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setDashboardLoading(true);

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

      // Calculate overdue invoices
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
        revenueGrowth: totalRevenue > 0 ? 8.5 : 0,
        lowStockItems,
        salesRevenue,
        purchaseAmount,
      };

      setDashboardStats(stats);

      // Generate recent activities
      const activities = [];

      // Add recent sales
      const recentSales = salesData
        .sort(
          (a, b) =>
            new Date(b.createdAt || b.invoiceDate) -
            new Date(a.createdAt || a.invoiceDate)
        )
        .slice(0, 3);

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

      // Add alerts
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

      setRecentActivities(activities.slice(0, 5));
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      addToast?.("Error loading dashboard data", "error");
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate(backTo);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
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

  const getRoleBadge = (role) => {
    const variants = {
      owner: "primary",
      member: "info",
      admin: "warning",
      viewer: "secondary",
    };
    return (
      <Badge bg={variants[role] || "secondary"} className="professional-badge">
        {role?.toUpperCase()}
      </Badge>
    );
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
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

  // Dashboard Content Component
  const DashboardContent = () => {
    if (dashboardLoading) {
      return (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <h5 className="mt-3 text-muted">Loading dashboard data...</h5>
        </div>
      );
    }

    return (
      <div className="dashboard-content">
        {/* Stats Cards */}
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
                  <FontAwesomeIcon
                    icon={faFileInvoice}
                    className="stats-icon"
                  />
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
                <small className="text-muted stats-label">
                  Business Parties
                </small>
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

        {/* Business Overview and Activities */}
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
      </div>
    );
  };

  if (isLoading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" size="lg" />
          <h5 className="mt-3 text-muted">Loading company details...</h5>
          <p className="text-muted">
            Please wait while we fetch the company information...
          </p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger" className="text-center professional-alert">
          <FontAwesomeIcon icon={faExclamationTriangle} className="fs-1 mb-3" />
          <Alert.Heading>Error Loading Company Details</Alert.Heading>
          <p className="mb-3">{error}</p>
          <div className="d-flex gap-2 justify-content-center">
            <Button
              variant="danger"
              onClick={loadCompanyDetails}
              className="professional-button"
            >
              Retry Loading
            </Button>
            <Button
              variant="secondary"
              onClick={handleGoBack}
              className="professional-button"
            >
              Go Back
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  if (!companyData) {
    return (
      <Container fluid className="py-4">
        <Alert variant="warning" className="text-center professional-alert">
          <FontAwesomeIcon icon={faBuilding} className="fs-1 mb-3" />
          <Alert.Heading>Company Not Found</Alert.Heading>
          <p className="mb-3">The requested company could not be found.</p>
          <Button
            variant="secondary"
            onClick={handleGoBack}
            className="professional-button"
          >
            Go Back
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4 company-detail-container">
      {/* Company Header with Admin Actions */}
      <Card className="border-0 shadow-sm mb-4 company-header-card">
        <Card.Header className="professional-header border-0">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <Button
                variant="outline-light"
                size="sm"
                onClick={handleGoBack}
                className="me-3 back-button"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
                Back
              </Button>
              <div className="company-icon-container me-3">
                <FontAwesomeIcon icon={faBuilding} className="company-icon" />
              </div>
              <div>
                <h4 className="mb-1 fw-bold company-name">
                  {companyData.businessName}
                </h4>
                <div className="d-flex align-items-center gap-3 mb-2">
                  <Badge bg="light" text="dark" className="professional-badge">
                    {companyData.businessType || "Business"}
                  </Badge>
                  {getStatusBadge(companyData.status)}
                  {getRoleBadge(userRole)}
                </div>
                <p className="mb-0 company-subtitle">
                  <FontAwesomeIcon icon={faBuilding} className="me-1" />
                  ID: {companyData.id || companyId} •
                  <FontAwesomeIcon icon={faCalendarAlt} className="ms-2 me-1" />
                  Since {formatDate(companyData.createdAt)}
                </p>
              </div>
            </div>
            <div className="d-flex gap-2 align-items-center">
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
                    <Dropdown.Item>
                      <FontAwesomeIcon icon={faChartBar} className="me-2" />
                      Generate Report
                    </Dropdown.Item>
                    <Dropdown.Item>
                      <FontAwesomeIcon icon={faFlag} className="me-2" />
                      Flag for Review
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    {companyData?.status === "active" ? (
                      <Dropdown.Item className="text-danger">
                        <FontAwesomeIcon icon={faBan} className="me-2" />
                        Suspend Company
                      </Dropdown.Item>
                    ) : (
                      <Dropdown.Item className="text-success">
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
                onClick={
                  activeTab === "dashboard"
                    ? loadDashboardData
                    : loadCompanyDetails
                }
                className="admin-button"
              >
                <FontAwesomeIcon icon={faSync} className="me-1" />
                Refresh
              </Button>
              <Badge bg="info" className="professional-badge plan-badge">
                {companyData.planType?.toUpperCase() || "FREE"}
              </Badge>
            </div>
          </div>
        </Card.Header>

        {/* Company Contact Information */}
        <Card.Body className="company-info-section">
          <Row>
            <Col md={4}>
              <div className="info-item">
                <FontAwesomeIcon
                  icon={faBuilding}
                  className="info-icon text-primary"
                />
                <div>
                  <small className="text-muted">Business Address</small>
                  <div className="fw-semibold">
                    {companyData.address || "No address provided"}
                  </div>
                  <small className="text-muted">
                    {companyData.city}, {companyData.state} -{" "}
                    {companyData.pincode}
                  </small>
                </div>
              </div>
            </Col>
            <Col md={4}>
              <div className="info-item">
                <FontAwesomeIcon
                  icon={faPhone}
                  className="info-icon text-success"
                />
                <div>
                  <small className="text-muted">Contact Information</small>
                  <div className="fw-semibold">
                    {companyData.phoneNumber || "No phone provided"}
                  </div>
                  <small className="text-muted">
                    {companyData.email || "No email provided"}
                  </small>
                </div>
              </div>
            </Col>
            <Col md={4}>
              <div className="info-item">
                <FontAwesomeIcon
                  icon={faFileInvoice}
                  className="info-icon text-warning"
                />
                <div>
                  <small className="text-muted">GST Information</small>
                  <div className="fw-semibold">
                    {companyData.gstNumber || "No GST number"}
                  </div>
                  <small className="text-muted">
                    Last activity: {formatDate(companyData.lastActivity)}
                  </small>
                </div>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Professional Tab Navigation */}
      <Tab.Container activeKey={activeTab} onSelect={handleTabChange}>
        <Card className="border-0 shadow-sm main-content-card">
          <Card.Header className="professional-tab-header border-0">
            <Nav variant="pills" className="professional-nav-pills">
              <Nav.Item>
                <Nav.Link
                  eventKey="dashboard"
                  className="professional-nav-link"
                >
                  <FontAwesomeIcon icon={faTachometerAlt} className="me-2" />
                  Dashboard
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="invoices" className="professional-nav-link">
                  <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                  Invoices
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="items" className="professional-nav-link">
                  <FontAwesomeIcon icon={faBoxes} className="me-2" />
                  Items
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="parties" className="professional-nav-link">
                  <FontAwesomeIcon icon={faHandshake} className="me-2" />
                  Parties
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="orders" className="professional-nav-link">
                  <FontAwesomeIcon icon={faShoppingCart} className="me-2" />
                  Orders
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  eventKey="transactions"
                  className="professional-nav-link"
                >
                  <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
                  Transactions
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Card.Header>

          <Card.Body className="p-0 tab-content-body">
            <Tab.Content>
              <Tab.Pane eventKey="dashboard">
                <div className="tab-pane-content">
                  <DashboardContent />
                </div>
              </Tab.Pane>
              <Tab.Pane eventKey="invoices">
                <CompanyInvoices
                  companyId={companyId}
                  companyData={companyData}
                  userRole={userRole}
                  addToast={addToast}
                />
              </Tab.Pane>
              <Tab.Pane eventKey="items">
                <CompanyItems
                  companyId={companyId}
                  companyData={companyData}
                  userRole={userRole}
                  addToast={addToast}
                />
              </Tab.Pane>
              <Tab.Pane eventKey="parties">
                <CompanyParties
                  companyId={companyId}
                  companyData={companyData}
                  userRole={userRole}
                  addToast={addToast}
                />
              </Tab.Pane>
              <Tab.Pane eventKey="orders">
                <CompanyOrders
                  companyId={companyId}
                  companyData={companyData}
                  userRole={userRole}
                  addToast={addToast}
                />
              </Tab.Pane>
              <Tab.Pane eventKey="transactions">
                <CompanyTransactions
                  companyId={companyId}
                  companyData={companyData}
                  userRole={userRole}
                  addToast={addToast}
                />
              </Tab.Pane>
            </Tab.Content>
          </Card.Body>
        </Card>
      </Tab.Container>

      {/* Professional Custom Styles */}
      <style>
        {`
          /* Main Container */
          .company-detail-container {
            background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
            min-height: 100vh;
          }

          /* Company Header Card */
          .company-header-card {
            overflow: hidden;
            transition: all 0.3s ease;
          }

          .professional-header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 1.5rem 2rem;
          }

          .back-button, .admin-button {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            transition: all 0.2s ease;
          }

          .back-button:hover, .admin-button:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.3);
            color: white;
          }

          .back-button:hover {
            transform: translateX(-2px);
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

          /* Company Info Section */
          .company-info-section {
            background: #f8f9fa;
            border-top: 1px solid rgba(0, 0, 0, 0.05);
            padding: 1.5rem 2rem;
          }

          .info-item {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            padding: 0.5rem 0;
          }

          .info-icon {
            width: 20px;
            flex-shrink: 0;
            margin-top: 0.25rem;
          }

          /* Professional Badges */
          .professional-badge {
            font-weight: 500;
            padding: 0.35em 0.65em;
            border-radius: 0.375rem;
            font-size: 0.75rem;
            letter-spacing: 0.25px;
          }

          .plan-badge {
            background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
          }

          /* Main Content Card */
          .main-content-card {
            border: 1px solid rgba(0, 0, 0, 0.05);
          }

          /* Professional Tab Header */
          .professional-tab-header {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-bottom: 2px solid #e9ecef;
            padding: 1.5rem 2rem 1rem 2rem;
          }

          /* Professional Nav Pills */
          .professional-nav-pills {
            border-bottom: none;
            gap: 0.5rem;
          }

          .professional-nav-pills .nav-item {
            flex: 1;
          }

          .professional-nav-link {
            background: transparent;
            border: 2px solid transparent;
            border-radius: 0.75rem;
            color: #6c757d;
            font-weight: 500;
            padding: 0.75rem 1rem;
            text-align: center;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
          }

          .professional-nav-link:hover {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-color: #dee2e6;
            color: #495057;
            transform: translateY(-1px);
          }

          .professional-nav-link.active {
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
            border-color: #007bff;
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
          }

          .professional-nav-link.active:hover {
            background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
            color: white;
          }

          /* Tab Content */
          .tab-content-body {
            background: white;
            min-height: 500px;
          }

          .tab-pane-content {
            padding: 2rem;
          }

          .tab-pane {
            animation: fadeInUp 0.4s ease-out;
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* Dashboard Specific Styles */
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

          /* Professional Alerts */
          .professional-alert {
            border: none;
            border-radius: 1rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }

          /* Professional Buttons */
          .professional-button {
            border-radius: 0.5rem;
            font-weight: 500;
            padding: 0.5rem 1.5rem;
            transition: all 0.2s ease;
          }

          .professional-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          /* Progress bars */
          .progress {
            background-color: rgba(0, 0, 0, 0.05);
            border-radius: 3px;
          }

          /* Mobile Responsiveness */
          @media (max-width: 768px) {
            .professional-header {
              padding: 1rem;
            }

            .company-info-section {
              padding: 1rem;
            }

            .professional-nav-pills {
              flex-direction: column;
              gap: 0.25rem;
            }

            .professional-nav-link {
              margin: 0;
              text-align: center;
              font-size: 0.9rem;
              padding: 0.6rem 0.8rem;
            }

            .company-name {
              font-size: 1.1rem;
            }

            .company-subtitle {
              font-size: 0.8rem;
            }

            .company-icon-container {
              width: 40px;
              height: 40px;
            }

            .company-icon {
              font-size: 1.2rem;
            }

            .tab-pane-content {
              padding: 1rem;
            }

            .info-item {
              flex-direction: column;
              gap: 0.5rem;
              margin-bottom: 1rem;
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
          }

          @media (max-width: 576px) {
            .professional-header {
              padding: 0.75rem;
            }

            .company-info-section {
              padding: 0.75rem;
            }

            .professional-nav-link {
              font-size: 0.8rem;
              padding: 0.5rem 0.6rem;
            }

            .tab-pane-content {
              padding: 0.75rem;
            }
          }

          /* Hover Effects */
          .stats-card:hover .stats-icon-container {
            transform: scale(1.1);
          }

          /* Smooth transitions for all interactive elements */
          * {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }

          /* Focus states for accessibility */
          .professional-nav-link:focus,
          .back-button:focus,
          .professional-button:focus,
          .admin-button:focus {
            outline: 2px solid #007bff;
            outline-offset: 2px;
          }
        `}
      </style>
    </Container>
  );
}

export default CompanyDetailPage;
