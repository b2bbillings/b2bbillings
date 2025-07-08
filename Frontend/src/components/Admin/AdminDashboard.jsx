import React, {useState, useEffect} from "react";
import {Routes, Route, useNavigate, useLocation} from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Nav,
  Tab,
  Alert,
  Spinner,
  Badge,
  Button,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faUsers,
  faChartLine,
  faCog,
  faShieldAlt,
  faDatabase,
  faFileAlt,
  faBell,
  faUserShield,
  faTachometerAlt,
  faArrowLeft,
  faBoxes,
  faShoppingCart,
  faClipboardList,
  faReceipt,
  faShoppingBag,
  faFileInvoice,
  faExchangeAlt,
  faChartBar,
  faWarehouse,
} from "@fortawesome/free-solid-svg-icons";

import AdminSidebar from "./AdminSidebar";
import AdminStats from "./AdminStats";
import AdminOverview from "./AdminOverview";
import CompanyManagement from "./CompanyManagement";
import UserManagement from "./UserManagement";
import ItemManagement from "./ItemManagement";
import SystemSettings from "./SystemSettings";
import SecurityManagement from "./SecurityManagement";
import DatabaseManagement from "./DatabaseManagement";
import ReportsAnalytics from "./ReportsAnalytics";
import UserDetailPage from "./UserDetail/UserDetailPage";
import CompanyDetailPage from "./UserDetail/CompanyDetailPage";

// Import the new management components
import SalesInvoiceManagement from "./SalesInvoiceManegment";
import SalesOrderManagement from "./SalesOrderManegment";
import PurchaseInvoiceManagement from "./PurchaseInvoiceManegment";
import PurchaseOrderManagement from "./PurchaseOrderManegment";

// NotificationCenter component
const NotificationCenter = ({adminData, currentUser, addToast}) => {
  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">
            <FontAwesomeIcon icon={faBell} className="me-2 text-primary" />
            Notification Center
          </h4>
          <p className="text-muted mb-0">System alerts and notifications</p>
        </div>
        <Badge bg="primary" className="fs-6">
          {adminData?.notifications || 0} New
        </Badge>
      </div>

      <Row className="g-4">
        <Col lg={6}>
          <Card className="h-100">
            <Card.Header className="bg-light">
              <h6 className="mb-0 fw-bold">Recent Alerts</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-flex align-items-start mb-3 pb-3 border-bottom">
                <div className="flex-shrink-0">
                  <div
                    className="rounded-circle bg-warning d-flex align-items-center justify-content-center"
                    style={{width: "40px", height: "40px"}}
                  >
                    <FontAwesomeIcon icon={faBell} className="text-white" />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h6 className="mb-1">Low Storage Warning</h6>
                  <p className="text-muted small mb-1">Storage is 85% full</p>
                  <small className="text-muted">2 hours ago</small>
                </div>
              </div>
              <div className="d-flex align-items-start">
                <div className="flex-shrink-0">
                  <div
                    className="rounded-circle bg-success d-flex align-items-center justify-content-center"
                    style={{width: "40px", height: "40px"}}
                  >
                    <FontAwesomeIcon
                      icon={faShieldAlt}
                      className="text-white"
                    />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h6 className="mb-1">Security Scan Complete</h6>
                  <p className="text-muted small mb-1">No threats detected</p>
                  <small className="text-muted">4 hours ago</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="h-100">
            <Card.Header className="bg-light">
              <h6 className="mb-0 fw-bold">System Status</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center py-2">
                <span className="fw-medium">Database Status:</span>
                <Badge bg="success">Online</Badge>
              </div>
              <hr className="my-2" />
              <div className="d-flex justify-content-between align-items-center py-2">
                <span className="fw-medium">API Status:</span>
                <Badge bg="success">Operational</Badge>
              </div>
              <hr className="my-2" />
              <div className="d-flex justify-content-between align-items-center py-2">
                <span className="fw-medium">Backup Status:</span>
                <Badge bg="info">Scheduled</Badge>
              </div>
              <hr className="my-2" />
              <div className="d-flex justify-content-between align-items-center py-2">
                <span className="fw-medium">Server Load:</span>
                <Badge bg="warning">Medium</Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mt-2">
        <Col lg={12}>
          <Card>
            <Card.Header className="bg-light">
              <h6 className="mb-0 fw-bold">Notification Settings</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <div className="form-check mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      defaultChecked
                    />
                    <label className="form-check-label">
                      Email notifications
                    </label>
                  </div>
                  <div className="form-check mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      defaultChecked
                    />
                    <label className="form-check-label">Security alerts</label>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="form-check mb-3">
                    <input className="form-check-input" type="checkbox" />
                    <label className="form-check-label">
                      SMS notifications
                    </label>
                  </div>
                  <div className="form-check mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      defaultChecked
                    />
                    <label className="form-check-label">
                      System maintenance alerts
                    </label>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

// Enhanced Analytics Component
const Analytics = ({adminData, addToast}) => (
  <Container fluid>
    <div className="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 className="mb-1">
          <FontAwesomeIcon icon={faChartLine} className="me-2 text-primary" />
          Advanced Analytics
        </h4>
        <p className="text-muted mb-0">
          Comprehensive business insights and metrics
        </p>
      </div>
      <div className="d-flex gap-2">
        <Button variant="outline-primary" size="sm">
          <FontAwesomeIcon icon={faFileAlt} className="me-1" />
          Export Report
        </Button>
        <Button variant="primary" size="sm">
          <FontAwesomeIcon icon={faChartLine} className="me-1" />
          Generate Insights
        </Button>
      </div>
    </div>

    <Row className="g-4 mb-4">
      <Col lg={3} md={6}>
        <Card className="text-center h-100 border-0 shadow-sm">
          <Card.Body>
            <div
              className="rounded-circle bg-primary bg-opacity-10 mx-auto mb-3 d-flex align-items-center justify-content-center"
              style={{width: "60px", height: "60px"}}
            >
              <FontAwesomeIcon icon={faUsers} className="fs-2 text-primary" />
            </div>
            <h5 className="fw-bold">User Analytics</h5>
            <p className="text-muted small">
              Track user engagement and behavior patterns
            </p>
            <Badge bg="primary" className="w-100">
              Coming Soon
            </Badge>
          </Card.Body>
        </Card>
      </Col>
      <Col lg={3} md={6}>
        <Card className="text-center h-100 border-0 shadow-sm">
          <Card.Body>
            <div
              className="rounded-circle bg-success bg-opacity-10 mx-auto mb-3 d-flex align-items-center justify-content-center"
              style={{width: "60px", height: "60px"}}
            >
              <FontAwesomeIcon
                icon={faBuilding}
                className="fs-2 text-success"
              />
            </div>
            <h5 className="fw-bold">Business Metrics</h5>
            <p className="text-muted small">
              Monitor key business performance indicators
            </p>
            <Badge bg="success" className="w-100">
              Available
            </Badge>
          </Card.Body>
        </Card>
      </Col>
      <Col lg={3} md={6}>
        <Card className="text-center h-100 border-0 shadow-sm">
          <Card.Body>
            <div
              className="rounded-circle bg-info bg-opacity-10 mx-auto mb-3 d-flex align-items-center justify-content-center"
              style={{width: "60px", height: "60px"}}
            >
              <FontAwesomeIcon icon={faChartLine} className="fs-2 text-info" />
            </div>
            <h5 className="fw-bold">Growth Analytics</h5>
            <p className="text-muted small">
              Analyze growth trends and forecasts
            </p>
            <Badge bg="info" className="w-100">
              In Development
            </Badge>
          </Card.Body>
        </Card>
      </Col>
      <Col lg={3} md={6}>
        <Card className="text-center h-100 border-0 shadow-sm">
          <Card.Body>
            <div
              className="rounded-circle bg-warning bg-opacity-10 mx-auto mb-3 d-flex align-items-center justify-content-center"
              style={{width: "60px", height: "60px"}}
            >
              <FontAwesomeIcon
                icon={faDatabase}
                className="fs-2 text-warning"
              />
            </div>
            <h5 className="fw-bold">Data Insights</h5>
            <p className="text-muted small">
              Deep dive into data patterns and insights
            </p>
            <Badge bg="warning" className="w-100">
              Beta
            </Badge>
          </Card.Body>
        </Card>
      </Col>
    </Row>

    <Row className="g-4">
      <Col lg={8}>
        <Card className="h-100 border-0 shadow-sm">
          <Card.Header className="bg-light border-0">
            <h6 className="mb-0 fw-bold">Analytics Dashboard Preview</h6>
          </Card.Header>
          <Card.Body className="text-center py-5">
            <FontAwesomeIcon
              icon={faChartLine}
              className="fs-1 text-muted mb-3"
            />
            <h5 className="text-muted">Interactive Analytics Dashboard</h5>
            <p className="text-muted mb-4">
              Advanced analytics and insights will be available here including
              real-time charts, performance metrics, and business intelligence
              reports.
            </p>
            <Button variant="primary">
              <FontAwesomeIcon icon={faChartLine} className="me-2" />
              View Analytics
            </Button>
          </Card.Body>
        </Card>
      </Col>
      <Col lg={4}>
        <Card className="h-100 border-0 shadow-sm">
          <Card.Header className="bg-light border-0">
            <h6 className="mb-0 fw-bold">Quick Stats</h6>
          </Card.Header>
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center py-3 border-bottom">
              <span className="text-muted">Total Revenue</span>
              <h6 className="mb-0 text-success">₹2,45,680</h6>
            </div>
            <div className="d-flex justify-content-between align-items-center py-3 border-bottom">
              <span className="text-muted">Active Companies</span>
              <h6 className="mb-0 text-primary">45</h6>
            </div>
            <div className="d-flex justify-content-between align-items-center py-3 border-bottom">
              <span className="text-muted">Total Users</span>
              <h6 className="mb-0 text-info">187</h6>
            </div>
            <div className="d-flex justify-content-between align-items-center py-3">
              <span className="text-muted">Growth Rate</span>
              <h6 className="mb-0 text-success">+23.5%</h6>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  </Container>
);

// Enhanced Staff Management Component
const StaffManagement = ({adminData, addToast}) => (
  <Container fluid>
    <div className="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 className="mb-1">
          <FontAwesomeIcon icon={faUsers} className="me-2 text-primary" />
          Staff Management
        </h4>
        <p className="text-muted mb-0">Manage internal staff and their roles</p>
      </div>
      <Button variant="primary">
        <FontAwesomeIcon icon={faUsers} className="me-2" />
        Add Staff Member
      </Button>
    </div>

    <Row className="g-4 mb-4">
      <Col lg={3} md={6}>
        <Card className="border-0 shadow-sm text-center">
          <Card.Body>
            <h3 className="text-primary mb-2">12</h3>
            <p className="text-muted mb-0">Total Staff</p>
          </Card.Body>
        </Card>
      </Col>
      <Col lg={3} md={6}>
        <Card className="border-0 shadow-sm text-center">
          <Card.Body>
            <h3 className="text-success mb-2">10</h3>
            <p className="text-muted mb-0">Active Staff</p>
          </Card.Body>
        </Card>
      </Col>
      <Col lg={3} md={6}>
        <Card className="border-0 shadow-sm text-center">
          <Card.Body>
            <h3 className="text-warning mb-2">5</h3>
            <p className="text-muted mb-0">Admins</p>
          </Card.Body>
        </Card>
      </Col>
      <Col lg={3} md={6}>
        <Card className="border-0 shadow-sm text-center">
          <Card.Body>
            <h3 className="text-info mb-2">7</h3>
            <p className="text-muted mb-0">Managers</p>
          </Card.Body>
        </Card>
      </Col>
    </Row>

    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-light border-0">
        <h6 className="mb-0 fw-bold">Staff Directory</h6>
      </Card.Header>
      <Card.Body className="text-center py-5">
        <FontAwesomeIcon icon={faUsers} className="fs-1 text-muted mb-3" />
        <h5 className="text-muted">Staff Management System</h5>
        <p className="text-muted mb-4">
          Comprehensive staff management including role assignments, performance
          tracking, and access permissions.
        </p>
        <Button variant="primary">
          <FontAwesomeIcon icon={faUsers} className="me-2" />
          Manage Staff
        </Button>
      </Card.Body>
    </Card>
  </Container>
);

// Enhanced Permissions Component
const Permissions = ({adminData, addToast}) => (
  <Container fluid>
    <div className="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 className="mb-1">
          <FontAwesomeIcon icon={faShieldAlt} className="me-2 text-primary" />
          Permissions Management
        </h4>
        <p className="text-muted mb-0">
          Configure user permissions and access levels
        </p>
      </div>
      <Button variant="primary">
        <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
        Create Role
      </Button>
    </div>

    <Row className="g-4 mb-4">
      <Col lg={4}>
        <Card className="border-0 shadow-sm h-100">
          <Card.Body className="text-center">
            <div
              className="rounded-circle bg-success bg-opacity-10 mx-auto mb-3 d-flex align-items-center justify-content-center"
              style={{width: "60px", height: "60px"}}
            >
              <FontAwesomeIcon
                icon={faUserShield}
                className="fs-2 text-success"
              />
            </div>
            <h5 className="fw-bold">Super Admin</h5>
            <p className="text-muted small">Full system access and control</p>
            <Badge bg="success">3 Users</Badge>
          </Card.Body>
        </Card>
      </Col>
      <Col lg={4}>
        <Card className="border-0 shadow-sm h-100">
          <Card.Body className="text-center">
            <div
              className="rounded-circle bg-primary bg-opacity-10 mx-auto mb-3 d-flex align-items-center justify-content-center"
              style={{width: "60px", height: "60px"}}
            >
              <FontAwesomeIcon icon={faUsers} className="fs-2 text-primary" />
            </div>
            <h5 className="fw-bold">Admin</h5>
            <p className="text-muted small">Administrative privileges</p>
            <Badge bg="primary">8 Users</Badge>
          </Card.Body>
        </Card>
      </Col>
      <Col lg={4}>
        <Card className="border-0 shadow-sm h-100">
          <Card.Body className="text-center">
            <div
              className="rounded-circle bg-info bg-opacity-10 mx-auto mb-3 d-flex align-items-center justify-content-center"
              style={{width: "60px", height: "60px"}}
            >
              <FontAwesomeIcon icon={faShieldAlt} className="fs-2 text-info" />
            </div>
            <h5 className="fw-bold">Manager</h5>
            <p className="text-muted small">Limited administrative access</p>
            <Badge bg="info">15 Users</Badge>
          </Card.Body>
        </Card>
      </Col>
    </Row>

    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-light border-0">
        <h6 className="mb-0 fw-bold">Role-Based Access Control</h6>
      </Card.Header>
      <Card.Body className="text-center py-5">
        <FontAwesomeIcon icon={faShieldAlt} className="fs-1 text-muted mb-3" />
        <h5 className="text-muted">Advanced Permission System</h5>
        <p className="text-muted mb-4">
          Configure user permissions, access control lists, feature-based
          permissions, and resource access management.
        </p>
        <Button variant="primary">
          <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
          Configure Permissions
        </Button>
      </Card.Body>
    </Card>
  </Container>
);

// Enhanced Inventory Management Component
const InventoryManagement = ({adminData, addToast}) => (
  <Container fluid>
    <div className="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 className="mb-1">
          <FontAwesomeIcon icon={faWarehouse} className="me-2 text-primary" />
          Inventory Management
        </h4>
        <p className="text-muted mb-0">
          Monitor and manage your inventory levels
        </p>
      </div>
      <div className="d-flex gap-2">
        <Button variant="outline-primary" size="sm">
          <FontAwesomeIcon icon={faFileAlt} className="me-1" />
          Export Inventory
        </Button>
        <Button variant="primary">
          <FontAwesomeIcon icon={faWarehouse} className="me-2" />
          Stock Adjustment
        </Button>
      </div>
    </div>

    <Row className="g-4 mb-4">
      <Col lg={3} md={6}>
        <Card className="border-0 shadow-sm text-center">
          <Card.Body>
            <h3 className="text-info mb-2">₹12.5L</h3>
            <p className="text-muted mb-0">Total Stock Value</p>
          </Card.Body>
        </Card>
      </Col>
      <Col lg={3} md={6}>
        <Card className="border-0 shadow-sm text-center">
          <Card.Body>
            <h3 className="text-success mb-2">8,520</h3>
            <p className="text-muted mb-0">Total Quantity</p>
          </Card.Body>
        </Card>
      </Col>
      <Col lg={3} md={6}>
        <Card className="border-0 shadow-sm text-center">
          <Card.Body>
            <h3 className="text-warning mb-2">125</h3>
            <p className="text-muted mb-0">Low Stock Items</p>
          </Card.Body>
        </Card>
      </Col>
      <Col lg={3} md={6}>
        <Card className="border-0 shadow-sm text-center">
          <Card.Body>
            <h3 className="text-danger mb-2">45</h3>
            <p className="text-muted mb-0">Critical Stock</p>
          </Card.Body>
        </Card>
      </Col>
    </Row>

    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-light border-0">
        <h6 className="mb-0 fw-bold">Inventory Control Center</h6>
      </Card.Header>
      <Card.Body className="text-center py-5">
        <FontAwesomeIcon icon={faWarehouse} className="fs-1 text-muted mb-3" />
        <h5 className="text-muted">Advanced Inventory Management</h5>
        <p className="text-muted mb-4">
          Stock level monitoring, low stock alerts, inventory tracking, and
          supplier management all in one place.
        </p>
        <Button variant="primary">
          <FontAwesomeIcon icon={faWarehouse} className="me-2" />
          Manage Inventory
        </Button>
      </Card.Body>
    </Card>
  </Container>
);

function AdminDashboard({currentUser, isOnline, addToast, onLogout}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [adminData, setAdminData] = useState(null);
  const [error, setError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  // Update active tab based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/users/")) {
      setActiveTab("users");
    } else if (path.includes("/companies")) {
      setActiveTab("companies");
    } else if (path.includes("/analytics")) {
      setActiveTab("analytics");
    } else if (path.includes("/products")) {
      setActiveTab("products");
    } else if (path.includes("/inventory")) {
      setActiveTab("inventory");
    } else if (path.includes("/sales-invoices")) {
      setActiveTab("sales-invoices");
    } else if (path.includes("/sales-orders")) {
      setActiveTab("sales-orders");
    } else if (path.includes("/purchase-invoices")) {
      setActiveTab("purchase-invoices");
    } else if (path.includes("/purchase-orders")) {
      setActiveTab("purchase-orders");
    } else if (path.includes("/staff")) {
      setActiveTab("staff");
    } else if (path.includes("/permissions")) {
      setActiveTab("permissions");
    } else if (path.includes("/security")) {
      setActiveTab("security");
    } else if (path.includes("/database")) {
      setActiveTab("database");
    } else if (path.includes("/reports")) {
      setActiveTab("reports");
    } else if (path.includes("/notifications")) {
      setActiveTab("notifications");
    } else if (path.includes("/settings")) {
      setActiveTab("settings");
    } else {
      setActiveTab("dashboard");
    }
  }, [location.pathname]);

  const loadAdminData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Simulate API call for admin data
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockAdminData = {
        totalCompanies: 45,
        totalUsers: 187,
        activeUsers: 142,
        systemHealth: "Good",
        lastBackup: new Date().toISOString(),
        notifications: 8,
        alerts: 2,
        totalProducts: 1245,
        totalSalesInvoices: 2840,
        totalSalesOrders: 1520,
        totalPurchaseInvoices: 1890,
        totalPurchaseOrders: 1420,
        totalRevenue: 245680,
        monthlyGrowth: 23.5,
      };

      setAdminData(mockAdminData);
      addToast?.("Admin dashboard loaded successfully", "success");
    } catch (error) {
      setError(error.message);
      addToast?.("Failed to load admin dashboard", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/admin/${tab}`);
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleExitAdmin = () => {
    if (onLogout) {
      onLogout();
    } else {
      window.location.href = "/";
    }
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="text-center">
          <Spinner
            animation="border"
            variant="primary"
            size="lg"
            className="mb-3"
          />
          <h5 className="text-muted">Loading Admin Dashboard...</h5>
          <p className="text-muted">
            Please wait while we prepare your admin interface...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger" className="text-center">
          <FontAwesomeIcon icon={faArrowLeft} className="fs-1 mb-3" />
          <Alert.Heading>Error Loading Admin Dashboard</Alert.Heading>
          <p className="mb-3">{error}</p>
          <Button variant="danger" onClick={() => window.location.reload()}>
            Retry Loading
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <div className="admin-dashboard-container">
        {/* Admin Sidebar */}
        <AdminSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          currentUser={currentUser}
          onLogout={handleExitAdmin}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          adminData={adminData}
        />

        {/* Main Content Area */}
        <div
          className={`admin-main-content ${
            sidebarCollapsed ? "sidebar-collapsed" : ""
          }`}
        >
          {/* Header */}
          <div className="admin-header bg-white border-bottom shadow-sm">
            <Container fluid>
              <Row className="align-items-center">
                <Col>
                  <div className="d-flex align-items-center">
                    <FontAwesomeIcon
                      icon={faUserShield}
                      className="text-primary me-2 fs-4"
                    />
                    <div>
                      <h4 className="mb-0 fw-bold text-dark">
                        Shop Management Admin
                      </h4>
                      <small className="text-muted">
                        Welcome back,{" "}
                        <strong>
                          {currentUser?.name || currentUser?.email || "Admin"}
                        </strong>
                      </small>
                    </div>
                  </div>
                </Col>
                <Col xs="auto">
                  <div className="d-flex align-items-center gap-3">
                    <Badge
                      bg={isOnline ? "success" : "danger"}
                      className="fs-6"
                    >
                      <FontAwesomeIcon
                        icon={faTachometerAlt}
                        className="me-1"
                      />
                      {isOnline ? "System Online" : "System Offline"}
                    </Badge>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={handleExitAdmin}
                    >
                      <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
                      Exit Admin
                    </Button>
                  </div>
                </Col>
              </Row>
            </Container>
          </div>

          {/* Routes Content */}
          <div className="admin-content">
            <Routes>
              <Route
                path="/"
                element={
                  <AdminOverview
                    adminData={adminData}
                    addToast={addToast}
                    onTabChange={handleTabChange}
                  />
                }
              />
              <Route
                path="/dashboard"
                element={
                  <AdminOverview
                    adminData={adminData}
                    addToast={addToast}
                    onTabChange={handleTabChange}
                  />
                }
              />
              <Route
                path="/analytics"
                element={
                  <Analytics adminData={adminData} addToast={addToast} />
                }
              />
              <Route
                path="/companies"
                element={
                  <CompanyManagement
                    adminData={adminData}
                    currentUser={currentUser}
                    addToast={addToast}
                  />
                }
              />
              <Route
                path="/users"
                element={
                  <UserManagement
                    adminData={adminData}
                    currentUser={currentUser}
                    addToast={addToast}
                  />
                }
              />
              <Route
                path="/users/:userId/*"
                element={<UserDetailPage addToast={addToast} />}
              />
              <Route
                path="/products"
                element={
                  <ItemManagement
                    adminData={adminData}
                    currentUser={currentUser}
                    addToast={addToast}
                  />
                }
              />
              <Route
                path="/inventory"
                element={
                  <InventoryManagement
                    adminData={adminData}
                    addToast={addToast}
                  />
                }
              />

              {/* ✅ NEW MANAGEMENT ROUTES */}
              <Route
                path="/sales-invoices"
                element={
                  <SalesInvoiceManagement
                    companyId={null}
                    userRole="admin"
                    isAdmin={true}
                  />
                }
              />
              <Route
                path="/sales-orders"
                element={
                  <SalesOrderManagement
                    companyId={null}
                    userRole="admin"
                    isAdmin={true}
                  />
                }
              />
              <Route
                path="/purchase-invoices"
                element={
                  <PurchaseInvoiceManagement
                    companyId={null}
                    userRole="admin"
                    isAdmin={true}
                  />
                }
              />
              <Route
                path="/purchase-orders"
                element={
                  <PurchaseOrderManagement
                    companyId={null}
                    userRole="admin"
                    isAdmin={true}
                  />
                }
              />

              <Route
                path="/staff"
                element={
                  <StaffManagement adminData={adminData} addToast={addToast} />
                }
              />
              <Route
                path="/security"
                element={
                  <SecurityManagement
                    adminData={adminData}
                    currentUser={currentUser}
                    addToast={addToast}
                  />
                }
              />
              <Route
                path="/permissions"
                element={
                  <Permissions adminData={adminData} addToast={addToast} />
                }
              />
              <Route
                path="/database"
                element={
                  <DatabaseManagement
                    adminData={adminData}
                    currentUser={currentUser}
                    addToast={addToast}
                  />
                }
              />
              <Route
                path="/reports"
                element={
                  <ReportsAnalytics
                    adminData={adminData}
                    currentUser={currentUser}
                    addToast={addToast}
                  />
                }
              />
              <Route
                path="/notifications"
                element={
                  <NotificationCenter
                    adminData={adminData}
                    currentUser={currentUser}
                    addToast={addToast}
                  />
                }
              />
              <Route
                path="/settings"
                element={
                  <SystemSettings
                    adminData={adminData}
                    currentUser={currentUser}
                    addToast={addToast}
                    onSettingsUpdate={loadAdminData}
                  />
                }
              />
              <Route
                path="/companies/:companyId/*"
                element={<CompanyDetailPage addToast={addToast} />}
              />
            </Routes>
          </div>
        </div>
      </div>

      <style>
        {`
    .admin-dashboard-container {
      display: flex;
      height: 100vh;
      width: 100vw;
      background: #f8f9fa;
      position: fixed;
      top: 0;
      left: 0;
      margin: 0;
      padding: 1rem;
      z-index: 1000;
      overflow: hidden;
    }

    .admin-main-content {
      flex: 1;
      margin-left: 280px;
      transition: margin-left 0.3s ease;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    .admin-main-content.sidebar-collapsed {
      margin-left: 70px;
    }

    .admin-header {
      padding: 1rem 0;
      flex-shrink: 0;
      min-height: 80px;
      border-bottom: 2px solid #e9ecef !important;
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
    }

    /* ✅ UPDATED: Reduced padding from 2rem to 0.5rem */
    .admin-content {
      flex: 1;
      padding: 0.5rem;
      background: #f8f9fa;
      overflow-y: auto;
    }

    /* Enhanced Bootstrap Cards */
    .admin-content .card {
      border: none;
      box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
      transition: all 0.15s ease-in-out;
      border-radius: 0.75rem;
    }

    .admin-content .card:hover {
      box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    .admin-content .card-header {
      background-color: #f8f9fa;
      border-bottom: 1px solid rgba(0, 0, 0, 0.125);
      font-weight: 600;
      border-radius: 0.75rem 0.75rem 0 0 !important;
    }

    /* Enhanced Alerts */
    .admin-content .alert {
      border: none;
      border-radius: 0.75rem;
      box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
    }

    /* Enhanced Badges */
    .admin-content .badge {
      font-weight: 500;
      padding: 0.375rem 0.75rem;
      border-radius: 0.5rem;
    }

    /* Enhanced Buttons */
    .admin-content .btn {
      border-radius: 0.5rem;
      font-weight: 500;
      transition: all 0.15s ease-in-out;
      box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
    }

    .admin-content .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.15);
    }

    /* Status indicators */
    .status-indicator {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 50px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Enhanced Statistics Cards */
    .admin-content .card h3 {
      font-weight: 700;
      font-size: 2rem;
    }

    /* Gradient backgrounds for feature cards */
    .admin-content .bg-primary.bg-opacity-10 {
      background: linear-gradient(135deg, rgba(13, 110, 253, 0.1) 0%, rgba(13, 110, 253, 0.05) 100%) !important;
    }

    .admin-content .bg-success.bg-opacity-10 {
      background: linear-gradient(135deg, rgba(25, 135, 84, 0.1) 0%, rgba(25, 135, 84, 0.05) 100%) !important;
    }

    .admin-content .bg-info.bg-opacity-10 {
      background: linear-gradient(135deg, rgba(13, 202, 240, 0.1) 0%, rgba(13, 202, 240, 0.05) 100%) !important;
    }

    .admin-content .bg-warning.bg-opacity-10 {
      background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%) !important;
    }

    /* Mobile Responsiveness */
    @media (max-width: 768px) {
      .admin-main-content {
        margin-left: 0;
      }

      .admin-main-content.sidebar-collapsed {
        margin-left: 0;
      }

      .admin-header {
        padding: 0.75rem 0;
        min-height: 70px;
      }

      /* ✅ UPDATED: Mobile padding also reduced to 0.5rem */
      .admin-content {
        padding: 0.5rem;
      }

      .admin-header h4 {
        font-size: 1.1rem;
      }

      .admin-content .card {
        border-radius: 0.5rem;
      }

      .admin-content h3 {
        font-size: 1.5rem !important;
      }
    }

    @media (max-width: 576px) {
      .admin-header {
        padding: 0.5rem 0;
        min-height: 60px;
      }

      /* ✅ UPDATED: Small mobile padding to 0.5rem */
      .admin-content {
        padding: 0.5rem;
      }

      .admin-header h4 {
        font-size: 1rem;
      }

      .admin-header .btn {
        padding: 0.25rem 0.5rem;
        font-size: 0.875rem;
      }

      .admin-content .card-body {
        padding: 1rem;
      }
    }

    /* Custom scrollbar for admin content */
    .admin-content::-webkit-scrollbar {
      width: 8px;
    }

    .admin-content::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }

    .admin-content::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;
    }

    .admin-content::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }

    /* Loading and transition animations */
    .admin-content > * {
      animation: fadeInUp 0.3s ease-out;
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

    /* Enhanced focus states for accessibility */
    .admin-content .btn:focus,
    .admin-content .card:focus-within {
      box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
      outline: none;
    }

    /* Enhanced border radius consistency */
    .admin-content .border-bottom {
      border-bottom: 1px solid rgba(0, 0, 0, 0.1) !important;
    }

    .admin-content .border-0 {
      border: none !important;
    }

    .admin-content .shadow-sm {
      box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075) !important;
    }

    /* ✅ ADDITIONAL: Tighter spacing for better content utilization */
    .admin-content .container-fluid {
      padding-left: 0.5rem;
      padding-right: 0.5rem;
    }

    .admin-content .row {
      margin-left: -0.25rem;
      margin-right: -0.25rem;
    }

    .admin-content .col,
    .admin-content [class*="col-"] {
      padding-left: 0.25rem;
      padding-right: 0.25rem;
    }

    /* ✅ ADDITIONAL: Compact spacing for cards and components */
    .admin-content .card-body {
      padding: 1rem;
    }

    .admin-content .card-header {
      padding: 0.75rem 1rem;
    }

    .admin-content .mb-4 {
      margin-bottom: 1rem !important;
    }

    .admin-content .mb-3 {
      margin-bottom: 0.75rem !important;
    }

    /* ✅ ADDITIONAL: Optimize vertical spacing */
    .admin-content .g-4 {
      --bs-gutter-x: 0.5rem;
      --bs-gutter-y: 0.5rem;
    }
  `}
      </style>
    </>
  );
}

export default AdminDashboard;
