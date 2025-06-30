import React, {useState, useEffect} from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Nav,
  Tab,
  Alert,
  Spinner,
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
} from "@fortawesome/free-solid-svg-icons";
import AdminSidebar from "./AdminSidebar";
import AdminStats from "./AdminStats";
import CompanyManagement from "./CompanyManagement";
import UserManagement from "./UserManagement";
import SystemSettings from "./SystemSettings";
import SecurityManagement from "./SecurityManagement";
import DatabaseManagement from "./DatabaseManagement";
import ReportsAnalytics from "./ReportsAnalytics";

// ✅ UPDATED: Compact NotificationCenter component
const NotificationCenter = ({adminData, currentUser, addToast}) => {
  return (
    <div className="notification-center">
      <h4 className="mb-3">
        <FontAwesomeIcon icon={faBell} className="me-2" />
        Notification Center
      </h4>
      <Alert variant="info" className="mb-3">
        <h6 className="mb-2">System Notifications</h6>
        <p className="mb-2">
          You have {adminData?.notifications || 0} pending notifications.
        </p>
        <ul className="mb-0">
          <li>System backup completed successfully</li>
          <li>2 new user registrations pending approval</li>
          <li>Database optimization scheduled for tonight</li>
        </ul>
      </Alert>

      <Row>
        <Col md={6}>
          <Card className="mb-3">
            <Card.Header className="py-2">
              <h6 className="mb-0">Recent Alerts</h6>
            </Card.Header>
            <Card.Body className="py-2">
              <div className="notification-item">
                <div className="notification-icon bg-warning">
                  <FontAwesomeIcon icon={faBell} />
                </div>
                <div className="notification-content">
                  <strong>Low Storage Warning</strong>
                  <p className="small text-muted mb-0">Storage is 85% full</p>
                </div>
              </div>
              <div className="notification-item">
                <div className="notification-icon bg-success">
                  <FontAwesomeIcon icon={faShieldAlt} />
                </div>
                <div className="notification-content">
                  <strong>Security Scan Complete</strong>
                  <p className="small text-muted mb-0">No threats detected</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="mb-3">
            <Card.Header className="py-2">
              <h6 className="mb-0">System Status</h6>
            </Card.Header>
            <Card.Body className="py-2">
              <div className="status-item d-flex justify-content-between">
                <span>Database Status:</span>
                <span className="badge bg-success">Online</span>
              </div>
              <div className="status-item d-flex justify-content-between">
                <span>API Status:</span>
                <span className="badge bg-success">Operational</span>
              </div>
              <div className="status-item d-flex justify-content-between">
                <span>Backup Status:</span>
                <span className="badge bg-success">Scheduled</span>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// ✅ UPDATED: Compact components for missing sections
const Analytics = ({adminData, addToast}) => (
  <div>
    <h4 className="mb-3">
      <FontAwesomeIcon icon={faChartLine} className="me-2" />
      Advanced Analytics
    </h4>
    <Alert variant="info" className="mb-3">
      <h6 className="mb-2">Analytics Dashboard</h6>
      <p className="mb-2">
        Advanced analytics and insights will be available here.
      </p>
      <ul className="mb-0">
        <li>User behavior analysis</li>
        <li>Performance metrics</li>
        <li>Business intelligence reports</li>
        <li>Predictive analytics</li>
      </ul>
    </Alert>
  </div>
);

const StaffManagement = ({adminData, addToast}) => (
  <div>
    <h4 className="mb-3">
      <FontAwesomeIcon icon={faUsers} className="me-2" />
      Staff Management
    </h4>
    <Alert variant="info" className="mb-3">
      <h6 className="mb-2">Internal Staff Management</h6>
      <p className="mb-2">Manage internal staff and their roles.</p>
      <ul className="mb-0">
        <li>Staff member profiles</li>
        <li>Role assignments</li>
        <li>Performance tracking</li>
        <li>Access permissions</li>
      </ul>
    </Alert>
  </div>
);

const Permissions = ({adminData, addToast}) => (
  <div>
    <h4 className="mb-3">
      <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
      Permissions Management
    </h4>
    <Alert variant="warning" className="mb-3">
      <h6 className="mb-2">Role-Based Access Control</h6>
      <p className="mb-2">Configure user permissions and access levels.</p>
      <ul className="mb-0">
        <li>User roles and permissions</li>
        <li>Access control lists</li>
        <li>Feature-based permissions</li>
        <li>Resource access management</li>
      </ul>
    </Alert>
  </div>
);

function AdminDashboard({currentUser, isOnline, addToast, onLogout}) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [adminData, setAdminData] = useState(null);
  const [error, setError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

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
      };

      setAdminData(mockAdminData);
      addToast?.("Admin dashboard loaded successfully", "success");
    } catch (error) {
      console.error("Error loading admin data:", error);
      setError(error.message);
      addToast?.("Failed to load admin dashboard", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleExitAdmin = () => {
    if (onLogout) {
      onLogout();
    } else {
      // Fallback navigation
      window.location.href = "/";
    }
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
        <Container className="mt-4 text-center">
          <Spinner
            animation="border"
            variant="primary"
            size="lg"
            className="mb-3"
          />
          <h5 className="text-muted">Loading Admin Dashboard...</h5>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Admin Dashboard</Alert.Heading>
          <p>{error}</p>
        </Alert>
      </Container>
    );
  }

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <AdminStats
            adminData={adminData}
            onRefresh={loadAdminData}
            addToast={addToast}
          />
        );
      case "analytics":
        return <Analytics adminData={adminData} addToast={addToast} />;
      case "companies":
        return (
          <CompanyManagement
            adminData={adminData}
            currentUser={currentUser}
            addToast={addToast}
          />
        );
      case "users":
        return (
          <UserManagement
            adminData={adminData}
            currentUser={currentUser}
            addToast={addToast}
          />
        );
      case "staff":
        return <StaffManagement adminData={adminData} addToast={addToast} />;
      case "security":
        return (
          <SecurityManagement
            adminData={adminData}
            currentUser={currentUser}
            addToast={addToast}
          />
        );
      case "permissions":
        return <Permissions adminData={adminData} addToast={addToast} />;
      case "database":
        return (
          <DatabaseManagement
            adminData={adminData}
            currentUser={currentUser}
            addToast={addToast}
          />
        );
      case "reports":
        return (
          <ReportsAnalytics
            adminData={adminData}
            currentUser={currentUser}
            addToast={addToast}
          />
        );
      case "notifications":
        return (
          <NotificationCenter
            adminData={adminData}
            currentUser={currentUser}
            addToast={addToast}
          />
        );
      case "settings":
        return (
          <SystemSettings
            adminData={adminData}
            currentUser={currentUser}
            addToast={addToast}
            onSettingsUpdate={loadAdminData}
          />
        );
      default:
        return (
          <Alert variant="info" className="mb-3">
            <h6 className="mb-1">Coming Soon</h6>
            <p className="mb-0">This section is under development.</p>
          </Alert>
        );
    }
  };

  return (
    <div className="admin-dashboard-container">
      {/* ✅ Admin Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        currentUser={currentUser}
        onLogout={handleExitAdmin}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        adminData={adminData}
      />
      {/* ✅ Main Content Area */}
      <div
        className={`admin-main-content ${
          sidebarCollapsed ? "sidebar-collapsed" : ""
        }`}
      >
        {/* ✅ UPDATED: Compact Header */}
        <div className="admin-header">
          <Container fluid>
            <Row className="align-items-center">
              <Col>
                <h3 className="admin-title mb-1">
                  <FontAwesomeIcon
                    icon={faUserShield}
                    className="me-2 text-primary"
                  />
                  Admin Dashboard
                  <span className="badge bg-warning text-dark ms-2">
                    Development Mode
                  </span>
                </h3>
                <p className="text-muted mb-1 small">
                  System administration and management portal
                </p>
                <small className="text-muted">
                  Logged in as:{" "}
                  <strong>
                    {currentUser?.name || currentUser?.email || "User"}
                  </strong>
                </small>
              </Col>
              <Col xs="auto">
                <div className="d-flex align-items-center">
                  <span
                    className={`status-indicator ${
                      isOnline ? "online" : "offline"
                    }`}
                  >
                    {isOnline ? "System Online" : "System Offline"}
                  </span>
                </div>
              </Col>
            </Row>
          </Container>
        </div>

        {/* ✅ UPDATED: Compact Development Warning */}
        <Container fluid>
          <Alert variant="warning" className="mb-3 py-2">
            <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
            <strong>Development Mode:</strong> Admin restrictions are disabled.
            All users can access admin features for development purposes.
          </Alert>
        </Container>

        {/* ✅ UPDATED: Compact Tab Content */}
        <Container fluid className="admin-content">
          <div className="content-wrapper">{renderTabContent()}</div>
        </Container>
      </div>
      {/* ✅ UPDATED: Compact Custom Styles */}

      <style jsx>{`
        /* ✅ FIXED: Selective resets - NOT breaking everything */

        .admin-dashboard-container {
          display: flex;
          height: 100vh;
          width: 100vw;
          background: #f8f9fa;
          position: fixed;
          top: 0;
          left: 0;
          margin: 0;
          padding: 0;
          z-index: 1000;
        }

        .admin-main-content {
          flex: 1;
          margin-left: 280px;
          transition: margin-left 0.3s ease;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          height: 100vh;
        }

        .admin-main-content.sidebar-collapsed {
          margin-left: 70px;
        }

        .admin-header {
          background: white;
          border-bottom: 1px solid #e9ecef;
          padding: 1rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          flex-shrink: 0;
        }

        .admin-title {
          color: #495057;
          font-weight: 600;
          font-size: 1.5rem;
          margin-bottom: 0.25rem;
        }

        .status-indicator {
          padding: 4px 10px;
          border-radius: 16px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-indicator.online {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .status-indicator.offline {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .admin-content {
          flex: 1;
          padding: 1rem;
        }

        .content-wrapper {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 1px solid #e9ecef;
          min-height: calc(100vh - 180px);
        }

        /* ✅ Only target admin containers, not everything */
        .admin-dashboard-container .container-fluid {
          padding-left: 1rem;
          padding-right: 1rem;
        }

        .admin-dashboard-container .alert {
          margin-bottom: 1rem;
        }

        .admin-loading {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fa;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 1001;
        }

        .notification-item {
          display: flex;
          align-items: center;
          padding: 0.75rem;
          border-bottom: 1px solid #e9ecef;
        }

        .notification-item:last-child {
          border-bottom: none;
        }

        .notification-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin-right: 0.75rem;
          font-size: 0.9rem;
        }

        .notification-content {
          flex: 1;
        }

        .status-item {
          padding: 0.5rem 0;
          border-bottom: 1px solid #f8f9fa;
        }

        .status-item:last-child {
          border-bottom: none;
        }

        /* ✅ Preserve Bootstrap spacing for cards and content */
        .admin-dashboard-container .card {
          margin-bottom: 1rem;
        }

        .admin-dashboard-container .card-header {
          padding: 0.75rem 1rem;
        }

        .admin-dashboard-container .card-body {
          padding: 1rem;
        }

        /* ✅ Preserve normal Bootstrap row/col behavior inside admin */
        .admin-dashboard-container .row {
          margin-left: -0.75rem;
          margin-right: -0.75rem;
        }

        .admin-dashboard-container .col,
        .admin-dashboard-container [class*="col-"] {
          padding-left: 0.75rem;
          padding-right: 0.75rem;
        }

        /* ✅ Alert spacing */
        .admin-dashboard-container .alert h6 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .admin-dashboard-container .alert p {
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }

        .admin-dashboard-container .alert ul {
          font-size: 0.85rem;
          padding-left: 1.2rem;
          margin-bottom: 0;
        }

        .admin-dashboard-container .alert ul li {
          margin-bottom: 0.25rem;
        }

        /* ✅ Preserve normal spacing for titles and text */
        .admin-dashboard-container h1,
        .admin-dashboard-container h2,
        .admin-dashboard-container h3,
        .admin-dashboard-container h4,
        .admin-dashboard-container h5,
        .admin-dashboard-container h6 {
          margin-bottom: 0.5rem;
        }

        .admin-dashboard-container p {
          margin-bottom: 1rem;
        }

        .admin-dashboard-container .mb-0 {
          margin-bottom: 0 !important;
        }

        .admin-dashboard-container .mb-1 {
          margin-bottom: 0.25rem !important;
        }

        .admin-dashboard-container .mb-2 {
          margin-bottom: 0.5rem !important;
        }

        .admin-dashboard-container .mb-3 {
          margin-bottom: 1rem !important;
        }

        .admin-dashboard-container .mb-4 {
          margin-bottom: 1.5rem !important;
        }

        .admin-dashboard-container .me-2 {
          margin-right: 0.5rem !important;
        }

        .admin-dashboard-container .ms-2 {
          margin-left: 0.5rem !important;
        }

        /* ✅ Preserve Bootstrap button spacing */
        .admin-dashboard-container .btn {
          padding: 0.375rem 0.75rem;
          margin-bottom: 0;
          font-size: 1rem;
          line-height: 1.5;
          border-radius: 0.25rem;
        }

        .admin-dashboard-container .btn-sm {
          padding: 0.25rem 0.5rem;
          font-size: 0.875rem;
          line-height: 1.5;
          border-radius: 0.2rem;
        }

        /* ✅ Preserve badge spacing */
        .admin-dashboard-container .badge {
          padding: 0.25em 0.5em;
          font-size: 0.75em;
          font-weight: 700;
          line-height: 1;
          color: #fff;
          text-align: center;
          white-space: nowrap;
          vertical-align: baseline;
          border-radius: 0.25rem;
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
            padding: 0.75rem 1rem;
          }

          .admin-title {
            font-size: 1.25rem;
          }

          .content-wrapper {
            padding: 1rem;
          }

          .notification-icon {
            width: 28px;
            height: 28px;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}

export default AdminDashboard;
