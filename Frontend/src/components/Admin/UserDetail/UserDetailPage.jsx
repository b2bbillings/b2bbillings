import React, {useState, useEffect} from "react";
import {useParams, useNavigate, useLocation} from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Nav,
  Tab,
  Button,
  Badge,
  Alert,
  Spinner,
  Form,
  InputGroup,
  Dropdown,
  ProgressBar,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faUser,
  faBuilding,
  faChartLine,
  faHistory,
  faUserShield,
  faEye,
  faUsers,
  faExclamationTriangle,
  faTachometerAlt,
  faDownload,
  faPlus,
  faSearch,
  faFilter,
  faSort,
  faEllipsisV,
  faEdit,
  faTrash,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faCalendarAlt,
  faCheckCircle,
  faTimesCircle,
  faDollarSign,
  faFileInvoice,
  faShieldAlt,
  faKey,
  faLock,
  faUnlock,
  faCrown,
  faUserTag,
  faShare,
  faRefresh,
  faCog,
  faArchive,
} from "@fortawesome/free-solid-svg-icons";

import UserOverview from "./UserOverview";
import UserCompanies from "./UserCompanies";
import CompanyDetail from "./CompanyDetail";
import {
  getUserDetailsForAdmin,
  handleUserServiceError,
} from "../../../services/userService";

function UserDetailPage({addToast}) {
  const {userId, companyId, section = "overview"} = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState(null);
  const [rawUserData, setRawUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(section);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadUserData();
  }, [userId]);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/companies")) {
      setActiveTab("companies");
    } else if (path.includes("/activity")) {
      setActiveTab("activity");
    } else {
      setActiveTab("overview");
    }
  }, [location.pathname]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await getUserDetailsForAdmin(userId);

      if (response.success) {
        const apiData = response.data;
        setRawUserData(apiData);

        const transformedData = {
          _id: apiData.user._id,
          name: apiData.user.name,
          email: apiData.user.email,
          phone: apiData.user.phone,
          role: apiData.user.role,
          isActive: apiData.user.isActive,
          emailVerified: apiData.user.emailVerified,
          createdAt: apiData.user.createdAt,
          lastLogin: apiData.user.lastLogin,
          updatedAt: apiData.user.updatedAt,
          avatar: apiData.user.avatar,

          address: {
            street: apiData.user.address || "",
            city: apiData.user.city || "",
            state: apiData.user.state || "",
            pincode: apiData.user.pincode || "",
            country: "India",
          },

          companies: [
            ...apiData.companySummary.owned.recent.map((company) => ({
              id: company.id,
              businessName: company.name,
              businessType: "Business",
              status: company.isActive ? "active" : "inactive",
              createdAt: company.createdAt,
              userRole: "owner",
              isActive: company.isActive,
            })),
            ...apiData.companySummary.member.recent.map((company) => ({
              id: company.id,
              businessName: company.name,
              businessType: "Business",
              status: company.isActive ? "active" : "inactive",
              createdAt: company.createdAt,
              userRole: "member",
              isActive: company.isActive,
            })),
          ],

          stats: {
            totalCompanies: apiData.summary.totalCompanies,
            activeCompanies: apiData.summary.activeCompanies,
            ownedCompanies: apiData.companySummary.owned.count,
            memberCompanies: apiData.companySummary.member.count,
            accountAge: apiData.user.stats.accountAge,
            totalRevenue: 0,
            lastActivity: apiData.summary.lastActivity,
            profileCompleteness: apiData.summary.profileCompleteness,
          },

          preferences: {
            notifications:
              apiData.user.preferences?.notifications?.push ?? true,
            emailUpdates:
              apiData.user.preferences?.notifications?.email ?? true,
            smsUpdates: false,
            theme: apiData.user.preferences?.theme || "light",
            language: apiData.user.preferences?.language || "en",
          },

          security: {
            emailVerified: apiData.user.securityInfo.emailVerified,
            phoneVerified: apiData.user.securityInfo.phoneVerified,
            twoFactorEnabled: apiData.user.securityInfo.twoFactorEnabled,
            loginAttempts: apiData.user.securityInfo.loginAttempts,
            isLocked: apiData.user.securityInfo.isLocked,
            lockUntil: apiData.user.securityInfo.lockUntil,
            lastPasswordChange: apiData.user.securityInfo.lastPasswordChange,
          },

          recentActivity: {
            totalLogins: apiData.user.recentActivity.totalLogins,
            lastLoginIP: apiData.user.recentActivity.lastLoginIP,
            lastLoginDevice: apiData.user.recentActivity.lastLoginDevice,
            recentCompanies: apiData.user.recentActivity.recentCompanies,
          },
        };

        setUserData(transformedData);
        addToast?.("User details loaded successfully", "success");
      } else {
        throw new Error(response.message || "Failed to load user data");
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      const errorMessage = handleUserServiceError(error);
      setError(errorMessage);
      addToast?.(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadUserData();
    setIsRefreshing(false);
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === "companies") {
      navigate(`/admin/users/${userId}/companies`);
    } else {
      navigate(`/admin/users/${userId}/${key}`);
    }
  };

  const handleCompanyClick = (companyId) => {
    navigate(`/admin/users/${userId}/companies/${companyId}/dashboard`);
  };

  const getRoleBadge = (role) => {
    const variants = {
      user: "primary",
      manager: "info",
      admin: "warning",
      superadmin: "danger",
    };
    const icons = {
      user: faUser,
      manager: faUserTag,
      admin: faCrown,
      superadmin: faShieldAlt,
    };

    return (
      <Badge bg={variants[role] || "secondary"} className="professional-badge">
        <FontAwesomeIcon icon={icons[role] || faUser} className="me-1" />
        {role?.toUpperCase()}
      </Badge>
    );
  };

  const getStatusBadge = (user) => {
    if (!user?.isActive) {
      return (
        <Badge bg="danger" className="professional-badge">
          <FontAwesomeIcon icon={faTimesCircle} className="me-1" />
          INACTIVE
        </Badge>
      );
    }
    return (
      <Badge bg="success" className="professional-badge">
        <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
        ACTIVE
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="modern-page-container">
        <Container fluid className="px-4">
          <div className="loading-state">
            <div className="loading-content">
              <Spinner
                animation="border"
                variant="primary"
                size="lg"
                className="mb-3"
              />
              <h5 className="loading-title">Loading user details...</h5>
              <p className="loading-description">
                Please wait while we fetch the user information...
              </p>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modern-page-container">
        <Container fluid className="px-4">
          <div className="error-state">
            <Card className="border-0 shadow-sm error-card">
              <Card.Body className="text-center py-5">
                <FontAwesomeIcon
                  icon={faExclamationTriangle}
                  className="error-icon"
                />
                <h4 className="error-title">Error Loading User Data</h4>
                <p className="error-description">{error}</p>
                <div className="error-actions">
                  <Button
                    variant="primary"
                    onClick={loadUserData}
                    className="professional-button me-2"
                  >
                    <FontAwesomeIcon icon={faRefresh} className="me-2" />
                    Retry Loading
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={() => navigate("/admin/users")}
                    className="professional-button"
                  >
                    <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                    Back to Users
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </div>
        </Container>
      </div>
    );
  }

  if (companyId) {
    return (
      <CompanyDetail
        userId={userId}
        companyId={companyId}
        section={section}
        userData={userData}
        rawUserData={rawUserData}
        addToast={addToast}
      />
    );
  }

  return (
    <div className="modern-page-container">
      <Container fluid className="px-4">
        {/* Modern User Profile Card */}
        <Card className="border-0 shadow-sm user-profile-card mb-4">
          <Card.Body className="p-4">
            <Row className="align-items-center">
              <Col lg={8}>
                <div className="user-profile-info">
                  <div className="user-avatar-section">
                    <div className="user-avatar">
                      <FontAwesomeIcon icon={faUser} className="avatar-icon" />
                    </div>
                    <div className="user-details">
                      <h3 className="user-name">{userData?.name}</h3>
                      <div className="user-badges">
                        {getRoleBadge(userData?.role)}
                        {getStatusBadge(userData)}
                        <Badge
                          bg="light"
                          text="dark"
                          className="professional-badge"
                        >
                          <FontAwesomeIcon icon={faBuilding} className="me-1" />
                          {userData?.stats?.totalCompanies || 0} Companies
                        </Badge>
                        <Badge
                          bg={
                            userData?.security?.emailVerified
                              ? "success"
                              : "warning"
                          }
                          className="professional-badge"
                        >
                          <FontAwesomeIcon
                            icon={faShieldAlt}
                            className="me-1"
                          />
                          {userData?.security?.emailVerified
                            ? "Verified"
                            : "Unverified"}
                        </Badge>
                      </div>
                      <div className="user-contact-info">
                        <div className="contact-item">
                          <FontAwesomeIcon
                            icon={faEnvelope}
                            className="contact-icon"
                          />
                          {userData?.email}
                        </div>
                        <div className="contact-item">
                          <FontAwesomeIcon
                            icon={faPhone}
                            className="contact-icon"
                          />
                          {userData?.phone || "Not provided"}
                        </div>
                        <div className="contact-item">
                          <FontAwesomeIcon
                            icon={faCalendarAlt}
                            className="contact-icon"
                          />
                          Last login: {formatDate(userData?.lastLogin)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
              <Col lg={4}>
                <div className="user-quick-stats">
                  <Row className="g-3">
                    <Col sm={6}>
                      <div className="quick-stat-item">
                        <div className="stat-number text-primary">
                          {userData?.stats?.totalCompanies || 0}
                        </div>
                        <div className="stat-label">Total Companies</div>
                      </div>
                    </Col>
                    <Col sm={6}>
                      <div className="quick-stat-item">
                        <div className="stat-number text-info">
                          {userData?.stats?.accountAge || 0}
                        </div>
                        <div className="stat-label">Days Old</div>
                      </div>
                    </Col>
                    <Col sm={6}>
                      <div className="quick-stat-item">
                        <div className="stat-number text-success">
                          {userData?.stats?.activeCompanies || 0}
                        </div>
                        <div className="stat-label">Active Companies</div>
                      </div>
                    </Col>
                    <Col sm={6}>
                      <div className="quick-stat-item">
                        <div className="stat-number text-warning">
                          {userData?.stats?.profileCompleteness || 0}%
                        </div>
                        <div className="stat-label">Profile Complete</div>
                      </div>
                    </Col>
                  </Row>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Modern Stats Cards */}
        <Row className="g-3 mb-4">
          <Col lg={3} md={6}>
            <Card className="border-0 shadow-sm stats-card h-100">
              <Card.Body className="text-center stats-card-body">
                <div className="stats-icon-container bg-primary">
                  <FontAwesomeIcon icon={faBuilding} className="stats-icon" />
                </div>
                <h6 className="stats-title">Owned Companies</h6>
                <h4 className="stats-value text-primary">
                  {userData?.stats?.ownedCompanies || 0}
                </h4>
                <small className="stats-description">
                  Companies owned by user
                </small>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={3} md={6}>
            <Card className="border-0 shadow-sm stats-card h-100">
              <Card.Body className="text-center stats-card-body">
                <div className="stats-icon-container bg-info">
                  <FontAwesomeIcon icon={faUsers} className="stats-icon" />
                </div>
                <h6 className="stats-title">Member Companies</h6>
                <h4 className="stats-value text-info">
                  {userData?.stats?.memberCompanies || 0}
                </h4>
                <small className="stats-description">Companies as member</small>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={3} md={6}>
            <Card className="border-0 shadow-sm stats-card h-100">
              <Card.Body className="text-center stats-card-body">
                <div className="stats-icon-container bg-success">
                  <FontAwesomeIcon
                    icon={userData?.security?.isLocked ? faLock : faUnlock}
                    className="stats-icon"
                  />
                </div>
                <h6 className="stats-title">Account Status</h6>
                <h6
                  className={`stats-value ${
                    userData?.security?.isLocked
                      ? "text-danger"
                      : "text-success"
                  }`}
                >
                  {userData?.security?.isLocked ? "Locked" : "Unlocked"}
                </h6>
                <small className="stats-description">Security status</small>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={3} md={6}>
            <Card className="border-0 shadow-sm stats-card h-100">
              <Card.Body className="text-center stats-card-body">
                <div className="stats-icon-container bg-warning">
                  <FontAwesomeIcon icon={faKey} className="stats-icon" />
                </div>
                <h6 className="stats-title">Login Attempts</h6>
                <h4 className="stats-value text-warning">
                  {userData?.security?.loginAttempts || 0}
                </h4>
                <small className="stats-description">
                  Failed login attempts
                </small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Modern Tab Navigation */}
        <Tab.Container activeKey={activeTab} onSelect={handleTabChange}>
          <div className="modern-tabs-container">
            <Nav variant="pills" className="modern-nav-pills">
              <Nav.Item>
                <Nav.Link eventKey="overview" className="nav-tab-link">
                  <FontAwesomeIcon icon={faEye} className="me-2" />
                  Overview
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="companies" className="nav-tab-link">
                  <FontAwesomeIcon icon={faBuilding} className="me-2" />
                  Companies
                  <Badge bg="secondary" className="ms-2 tab-counter">
                    {userData?.stats?.totalCompanies || 0}
                  </Badge>
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="activity" className="nav-tab-link">
                  <FontAwesomeIcon icon={faHistory} className="me-2" />
                  Activity Log
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </div>

          {/* Tab Content with Modern Wrapper */}
          <div className="tab-content-wrapper">
            <Tab.Content>
              <Tab.Pane eventKey="overview" className="tab-pane-modern">
                <UserOverview
                  userData={userData}
                  rawUserData={rawUserData}
                  addToast={addToast}
                  onRefresh={loadUserData}
                />
              </Tab.Pane>
              <Tab.Pane eventKey="companies" className="tab-pane-modern">
                <UserCompanies
                  userData={userData}
                  rawUserData={rawUserData}
                  onCompanyClick={handleCompanyClick}
                  addToast={addToast}
                />
              </Tab.Pane>
              <Tab.Pane eventKey="activity" className="tab-pane-modern">
                <ActivityLog
                  userData={userData}
                  rawUserData={rawUserData}
                  addToast={addToast}
                />
              </Tab.Pane>
            </Tab.Content>
          </div>
        </Tab.Container>
      </Container>

      {/* Modern Professional Styles */}
      <style>
        {`
          /* Modern Page Container */
          .modern-page-container {
            background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
            min-height: 100vh;
            padding: 1rem 0;
          }

          /* Loading State */
          .loading-state {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 60vh;
          }

          .loading-content {
            text-align: center;
            background: white;
            padding: 3rem;
            border-radius: 1rem;
            border: 1px solid rgba(0, 0, 0, 0.05);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .loading-title {
            color: #2c3e50;
            margin-bottom: 0.5rem;
            font-weight: 600;
          }

          .loading-description {
            color: #6c757d;
            margin-bottom: 0;
          }

          /* Error State */
          .error-state {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 60vh;
          }

          .error-card {
            max-width: 500px;
            border-radius: 1rem;
          }

          .error-icon {
            font-size: 4rem;
            color: #dc3545;
            margin-bottom: 1rem;
          }

          .error-title {
            color: #2c3e50;
            margin-bottom: 1rem;
            font-weight: 600;
          }

          .error-description {
            color: #6c757d;
            margin-bottom: 2rem;
          }

          .error-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
          }

          /* Page Header */
          .page-header {
            margin-bottom: 2rem;
          }

          .header-top {
            display: flex;
            justify-content: between;
            align-items: flex-start;
            gap: 2rem;
          }

          .header-left {
            flex: 1;
          }

          .back-button {
            color: #6c757d;
            text-decoration: none;
            font-weight: 500;
            padding: 0;
            border: none;
            background: none;
            margin-bottom: 1rem;
            transition: color 0.2s ease;
          }

          .back-button:hover {
            color: #0d6efd;
          }

          .header-content {
            margin-left: 0;
          }

          .page-title {
            font-size: 2.5rem;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 0.5rem;
            line-height: 1.2;
          }

          .page-subtitle {
            font-size: 1rem;
            color: #6c757d;
            margin-bottom: 0;
          }

          .header-actions {
            display: flex;
            gap: 0.75rem;
            align-items: center;
          }

          /* User Profile Card */
          .user-profile-card {
            border: 1px solid rgba(0, 0, 0, 0.05);
            border-radius: 1rem;
            overflow: hidden;
            transition: all 0.3s ease;
          }

          .user-profile-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          }

          .user-profile-info {
            width: 100%;
          }

          .user-avatar-section {
            display: flex;
            align-items: flex-start;
            gap: 1.5rem;
          }

          .user-avatar {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #e3f2fd 0%, #f8f9fa 100%);
            border-radius: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid rgba(13, 110, 253, 0.1);
            flex-shrink: 0;
          }

          .avatar-icon {
            font-size: 2rem;
            color: #0d6efd;
          }

          .user-details {
            flex: 1;
          }

          .user-name {
            font-size: 1.75rem;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 1rem;
          }

          .user-badges {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1rem;
            flex-wrap: wrap;
          }

          .user-contact-info {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .contact-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: #6c757d;
            font-size: 0.9rem;
          }

          .contact-icon {
            width: 16px;
            color: #adb5bd;
          }

          /* Quick Stats */
          .user-quick-stats {
            background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
            border-radius: 0.75rem;
            padding: 1.5rem;
            border: 1px solid rgba(0, 0, 0, 0.05);
          }

          .quick-stat-item {
            text-align: center;
            padding: 0.5rem;
          }

          .stat-number {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.25rem;
          }

          .stat-label {
            font-size: 0.8rem;
            color: #6c757d;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          /* Stats Cards */
          .stats-card {
            border: 1px solid rgba(0, 0, 0, 0.05);
            border-radius: 1rem;
            overflow: hidden;
            transition: all 0.3s ease;
          }

          .stats-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          }

          .stats-card-body {
            padding: 1.5rem;
          }

          .stats-icon-container {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1rem;
            opacity: 0.15;
          }

          .stats-icon {
            font-size: 1.5rem;
            color: white;
          }

          .stats-title {
            font-size: 0.9rem;
            font-weight: 600;
            color: #6c757d;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .stats-value {
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
          }

          .stats-description {
            color: #adb5bd;
            font-size: 0.8rem;
          }

          /* Modern Tabs */
          .modern-tabs-container {
            background: white;
            border-radius: 1rem;
            padding: 0.5rem;
            border: 1px solid rgba(0, 0, 0, 0.05);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            margin-bottom: 1.5rem;
          }

          .modern-nav-pills {
            border: none;
            gap: 0.25rem;
          }

          .nav-tab-link {
            background: transparent;
            border: none;
            color: #6c757d;
            font-weight: 500;
            padding: 0.75rem 1.5rem;
            border-radius: 0.75rem;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
          }

          .nav-tab-link:hover {
            background: #f8f9fa;
            color: #495057;
            transform: translateY(-1px);
          }

          .nav-tab-link.active {
            background: linear-gradient(135deg, #0d6efd 0%, #0056b3 100%);
            color: white;
            box-shadow: 0 4px 12px rgba(13, 110, 253, 0.3);
          }

          .tab-counter {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            font-size: 0.7rem;
            padding: 0.25rem 0.5rem;
            border-radius: 0.5rem;
          }

          .nav-tab-link.active .tab-counter {
            background: rgba(255, 255, 255, 0.2);
            color: white;
          }

          /* Tab Content */
          .tab-content-wrapper {
            background: transparent;
          }

          .tab-pane-modern {
            background: transparent;
          }

          /* Professional Badges */
          .professional-badge {
            font-weight: 500;
            font-size: 0.75rem;
            padding: 0.4rem 0.8rem;
            border-radius: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
          }

          /* Professional Buttons */
          .professional-button {
            border-radius: 0.5rem;
            font-weight: 500;
            padding: 0.4rem 1rem;
            transition: all 0.2s ease;
            border-width: 1px;
          }

          .professional-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          }

          /* Responsive Design */
          @media (max-width: 1200px) {
            .page-title {
              font-size: 2rem;
            }
            
            .user-name {
              font-size: 1.5rem;
            }
          }

          @media (max-width: 992px) {
            .header-top {
              flex-direction: column;
              gap: 1rem;
            }

            .header-actions {
              align-self: flex-start;
            }

            .user-avatar-section {
              flex-direction: column;
              align-items: center;
              text-align: center;
              gap: 1rem;
            }

            .user-badges {
              justify-content: center;
            }

            .contact-item {
              justify-content: center;
            }
          }

          @media (max-width: 768px) {
            .modern-page-container {
              padding: 0.5rem 0;
            }

            .page-title {
              font-size: 1.75rem;
            }

            .user-name {
              font-size: 1.25rem;
            }

            .user-avatar {
              width: 60px;
              height: 60px;
            }

            .avatar-icon {
              font-size: 1.5rem;
            }

            .stats-icon-container {
              width: 50px;
              height: 50px;
            }

            .stats-icon {
              font-size: 1.25rem;
            }

            .nav-tab-link {
              padding: 0.5rem 1rem;
              font-size: 0.875rem;
            }
          }

          @media (max-width: 576px) {
            .user-badges {
              gap: 0.5rem;
            }

            .professional-badge {
              font-size: 0.7rem;
              padding: 0.3rem 0.6rem;
            }

            .stats-value {
              font-size: 1.5rem;
            }

            .quick-stat-item {
              padding: 0.25rem;
            }

            .stat-number {
              font-size: 1.25rem;
            }
          }

          /* Focus States for Accessibility */
          .professional-button:focus,
          .nav-tab-link:focus,
          .back-button:focus {
            outline: 2px solid #0d6efd;
            outline-offset: 2px;
          }

          /* Smooth Transitions */
          * {
            transition: transform 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
          }

          /* Loading Animation */
          .fa-spin {
            animation: fa-spin 1s infinite linear;
          }

          @keyframes fa-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

// Enhanced Activity Log Component with Real Data
const ActivityLog = ({userData, rawUserData, addToast}) => {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize with empty strings to avoid controlled/uncontrolled issues
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Activities");
  const [sortBy, setSortBy] = useState("Latest First");

  useEffect(() => {
    loadActivityLog();
  }, [userData, rawUserData]);

  const loadActivityLog = async () => {
    try {
      setIsLoading(true);

      const generatedActivities = [];
      let activityId = 1;

      if (userData?.lastLogin) {
        generatedActivities.push({
          id: activityId++,
          type: "login",
          description: "User logged in successfully",
          timestamp: userData.lastLogin,
          ip: userData?.recentActivity?.lastLoginIP || "Unknown",
          device: userData?.recentActivity?.lastLoginDevice || "Unknown Device",
          status: "success",
        });
      }

      if (userData?.createdAt) {
        generatedActivities.push({
          id: activityId++,
          type: "account_created",
          description: "User account created",
          timestamp: userData.createdAt,
          ip: "System",
          device: "System",
          status: "success",
        });
      }

      if (userData?.companies?.length > 0) {
        userData.companies.forEach((company) => {
          generatedActivities.push({
            id: activityId++,
            type:
              company.userRole === "owner"
                ? "company_created"
                : "company_joined",
            description:
              company.userRole === "owner"
                ? `Created company '${company.businessName}'`
                : `Joined company '${company.businessName}' as member`,
            timestamp: company.createdAt,
            ip: "Unknown",
            device: "Unknown Device",
            status: "success",
          });
        });
      }

      if (userData?.security?.emailVerified) {
        generatedActivities.push({
          id: activityId++,
          type: "email_verified",
          description: "Email address verified successfully",
          timestamp: userData.createdAt,
          ip: "Unknown",
          device: "Unknown Device",
          status: "success",
        });
      }

      if (userData?.updatedAt && userData?.updatedAt !== userData?.createdAt) {
        generatedActivities.push({
          id: activityId++,
          type: "profile_updated",
          description: "Profile information updated",
          timestamp: userData.updatedAt,
          ip: "Unknown",
          device: "Unknown Device",
          status: "success",
        });
      }

      generatedActivities.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      setActivities(generatedActivities);
    } catch (error) {
      console.error("Error generating activity log:", error);
      addToast?.("Error loading activity log", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    const icons = {
      login: {icon: faUser, color: "success"},
      logout: {icon: faUser, color: "secondary"},
      account_created: {icon: faUserShield, color: "primary"},
      company_created: {icon: faBuilding, color: "primary"},
      company_joined: {icon: faUsers, color: "info"},
      invoice_created: {icon: faFileInvoice, color: "info"},
      profile_updated: {icon: faEdit, color: "warning"},
      email_verified: {icon: faCheckCircle, color: "success"},
    };
    return icons[type] || {icon: faUser, color: "secondary"};
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch = activity.description
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter =
      statusFilter === "All Activities" ||
      (statusFilter === "Login Events" && activity.type.includes("login")) ||
      (statusFilter === "Company Actions" &&
        activity.type.includes("company")) ||
      (statusFilter === "Profile Changes" &&
        (activity.type.includes("profile") || activity.type.includes("email")));

    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm modern-activity-card">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading activity log...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm modern-activity-card">
      <Card.Header className="professional-header border-0">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="mb-1 fw-bold header-title">
              <FontAwesomeIcon icon={faHistory} className="me-2 text-info" />
              Activity Log
            </h5>
            <p className="text-muted small mb-0 header-subtitle">
              Track all user activities and system interactions (
              {activities.length} total activities)
            </p>
          </div>
          <div className="d-flex gap-2">
            <Button
              variant="outline-primary"
              size="sm"
              className="professional-button"
            >
              <FontAwesomeIcon icon={faDownload} className="me-1" />
              Export
            </Button>
          </div>
        </div>

        <Row className="g-3 filter-controls">
          <Col md={4}>
            <Form.Label className="small fw-semibold filter-label">
              Search Activities
            </Form.Label>
            <InputGroup size="sm">
              <InputGroup.Text className="search-input-icon">
                <FontAwesomeIcon icon={faSearch} className="text-muted" />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </InputGroup>
          </Col>
          <Col md={3}>
            <Form.Label className="small fw-semibold filter-label">
              Filter
            </Form.Label>
            <Form.Select
              size="sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="professional-select"
            >
              <option>All Activities</option>
              <option>Login Events</option>
              <option>Company Actions</option>
              <option>Profile Changes</option>
            </Form.Select>
          </Col>
          <Col md={3}>
            <Form.Label className="small fw-semibold filter-label">
              Sort
            </Form.Label>
            <Form.Select
              size="sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="professional-select"
            >
              <option>Latest First</option>
              <option>Oldest First</option>
              <option>Activity Type</option>
            </Form.Select>
          </Col>
          <Col md={2} className="text-end">
            <Form.Label className="small fw-semibold filter-label d-block">
              &nbsp;
            </Form.Label>
            <small className="text-muted results-count">
              {filteredActivities.length} of {activities.length}
            </small>
          </Col>
        </Row>
      </Card.Header>

      <Card.Body className="p-0 activity-body">
        {filteredActivities.length > 0 ? (
          <div className="activity-list">
            {filteredActivities.map((activity) => {
              const iconInfo = getActivityIcon(activity.type);
              return (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon-wrapper">
                    <div className={`activity-icon bg-${iconInfo.color}`}>
                      <FontAwesomeIcon icon={iconInfo.icon} />
                    </div>
                  </div>
                  <div className="activity-content">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="activity-details">
                        <h6 className="activity-description">
                          {activity.description}
                        </h6>
                        <div className="activity-meta">
                          <div className="meta-item">
                            <FontAwesomeIcon
                              icon={faCalendarAlt}
                              className="meta-icon"
                            />
                            {formatDate(activity.timestamp)}
                          </div>
                          <div className="meta-item">
                            <FontAwesomeIcon
                              icon={faMapMarkerAlt}
                              className="meta-icon"
                            />
                            IP: {activity.ip} • {activity.device}
                          </div>
                        </div>
                      </div>
                      <Dropdown>
                        <Dropdown.Toggle
                          variant="link"
                          size="sm"
                          className="activity-dropdown-toggle"
                        >
                          <FontAwesomeIcon icon={faEllipsisV} />
                        </Dropdown.Toggle>
                        <Dropdown.Menu
                          align="end"
                          className="professional-dropdown"
                        >
                          <Dropdown.Item className="dropdown-item-modern">
                            <FontAwesomeIcon
                              icon={faEye}
                              className="dropdown-icon"
                            />
                            View Details
                          </Dropdown.Item>
                          <Dropdown.Item className="dropdown-item-modern">
                            <FontAwesomeIcon
                              icon={faDownload}
                              className="dropdown-icon"
                            />
                            Export
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-activity-state">
            <FontAwesomeIcon icon={faHistory} className="empty-state-icon" />
            <h6 className="empty-state-title">No activity found</h6>
            <p className="empty-state-description">
              {searchTerm || statusFilter !== "All Activities"
                ? "No activities match your search criteria."
                : "User activity will appear here once they start using the system."}
            </p>
          </div>
        )}
      </Card.Body>

      <style>
        {`
          /* Activity Card */
          .modern-activity-card {
            border: 1px solid rgba(0, 0, 0, 0.05);
            border-radius: 1rem;
            overflow: hidden;
          }

          .professional-header {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-bottom: 2px solid #e9ecef;
            padding: 1.5rem;
          }

          .header-title {
            color: #2c3e50;
            font-size: 1rem;
            font-weight: 600;
          }

          .header-subtitle {
            color: #6c757d;
            font-size: 0.875rem;
          }

          /* Filter Controls */
          .filter-controls {
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid #e9ecef;
          }

          .filter-label {
            color: #495057;
            font-weight: 600;
            margin-bottom: 0.25rem;
          }

          .search-input-icon {
            background: #f8f9fa;
            border-right: none;
            border-color: #dee2e6;
          }

          .search-input {
            border-left: none;
            border-color: #dee2e6;
          }

          .search-input:focus {
            border-color: #0d6efd;
            box-shadow: none;
          }

          .professional-select {
            border-color: #dee2e6;
            background-color: white;
          }

          .professional-select:focus {
            border-color: #0d6efd;
            box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
          }

          .results-count {
            font-weight: 500;
            color: #6c757d;
          }

          /* Activity Body */
          .activity-body {
            background: white;
          }

          .activity-list {
            display: flex;
            flex-direction: column;
          }

          .activity-item {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            padding: 1.5rem;
            border-bottom: 1px solid #f8f9fa;
            transition: all 0.2s ease;
          }

          .activity-item:hover {
            background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
          }

          .activity-item:last-child {
            border-bottom: none;
          }

          .activity-icon-wrapper {
            flex-shrink: 0;
          }

          .activity-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.9rem;
          }

          .activity-icon.bg-primary { background: #0d6efd; }
          .activity-icon.bg-success { background: #198754; }
          .activity-icon.bg-info { background: #0dcaf0; }
          .activity-icon.bg-warning { background: #ffc107; }
          .activity-icon.bg-danger { background: #dc3545; }
          .activity-icon.bg-secondary { background: #6c757d; }

          .activity-content {
            flex: 1;
          }

          .activity-details {
            flex: 1;
          }

          .activity-description {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 0.5rem;
            font-size: 0.95rem;
          }

          .activity-meta {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          .meta-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: #6c757d;
            font-size: 0.85rem;
          }

          .meta-icon {
            width: 14px;
          }

          .activity-dropdown-toggle {
            background: none;
            border: none;
            color: #6c757d;
            padding: 0.25rem;
            opacity: 0.7;
            transition: all 0.2s ease;
          }

          .activity-dropdown-toggle:hover,
          .activity-dropdown-toggle:focus {
            color: #0d6efd;
            opacity: 1;
            background: none;
            border: none;
            box-shadow: none;
          }

          .activity-item:hover .activity-dropdown-toggle {
            opacity: 1;
          }

          .professional-dropdown {
            border: 1px solid #e9ecef;
            border-radius: 0.75rem;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            padding: 0.5rem 0;
            min-width: 180px;
          }

          .dropdown-item-modern {
            padding: 0.6rem 1rem;
            font-size: 0.875rem;
            border-radius: 0;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .dropdown-item-modern:hover {
            background: #f8f9fa;
            color: #0d6efd;
          }

          .dropdown-icon {
            width: 14px;
          }

          /* Empty State */
          .empty-activity-state {
            text-align: center;
            padding: 4rem 2rem;
            background: white;
          }

          .empty-state-icon {
            font-size: 3rem;
            color: #adb5bd;
            margin-bottom: 1rem;
          }

          .empty-state-title {
            color: #6c757d;
            margin-bottom: 0.5rem;
            font-weight: 600;
          }

          .empty-state-description {
            color: #adb5bd;
            font-size: 0.9rem;
          }

          /* Professional Buttons */
          .professional-button {
            border-radius: 0.5rem;
            font-weight: 500;
            padding: 0.4rem 1rem;
            transition: all 0.2s ease;
            border-width: 1px;
          }

          .professional-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          }

          /* Responsive Design */
          @media (max-width: 768px) {
            .activity-item {
              padding: 1rem;
              gap: 0.75rem;
            }

            .activity-icon {
              width: 36px;
              height: 36px;
              font-size: 0.8rem;
            }

            .activity-description {
              font-size: 0.9rem;
            }

            .meta-item {
              font-size: 0.8rem;
            }

            .filter-controls .col-md-4 {
              margin-bottom: 1rem;
            }
          }

          @media (max-width: 576px) {
            .professional-header {
              padding: 1rem;
            }

            .activity-item {
              padding: 0.75rem;
            }

            .empty-activity-state {
              padding: 3rem 1rem;
            }

            .empty-state-icon {
              font-size: 2.5rem;
            }
          }
        `}
      </style>
    </Card>
  );
};

export default UserDetailPage;
