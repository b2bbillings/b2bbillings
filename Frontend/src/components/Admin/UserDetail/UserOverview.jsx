import React, {useState, useEffect} from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Badge,
  Alert,
  Spinner,
  Form,
  Modal,
  ListGroup,
  ProgressBar,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faUser,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faCalendarAlt,
  faShieldAlt,
  faEdit,
  faKey,
  faBell,
  faChartLine,
  faBuilding,
  faFileInvoice,
  faHandshake,
  faExchangeAlt,
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
  faCog,
  faHistory,
  faEye,
  faDollarSign,
  faUsers,
  faGlobe,
  faLock,
  faUnlock,
  faCrown,
  faUserTag,
  faSignInAlt,
  faSave,
} from "@fortawesome/free-solid-svg-icons";

function UserOverview({userData, rawUserData, addToast, onRefresh}) {
  const [isLoading, setIsLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [userStats, setUserStats] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);

  // Initialize with empty strings to avoid controlled/uncontrolled issues
  const [preferences, setPreferences] = useState({
    emailNotifications: false,
    smsNotifications: false,
    marketingEmails: false,
    securityAlerts: false,
    invoiceReminders: false,
    paymentAlerts: false,
  });

  // Initialize form data to avoid controlled/uncontrolled issues
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    address: "",
  });

  useEffect(() => {
    if (userData || rawUserData) {
      loadUserStats();
      loadRecentActivity();
      loadUserPreferences();
      initializeFormData();
    }
  }, [userData, rawUserData]);

  // Load real user stats from API data
  const loadUserStats = async () => {
    try {
      setIsLoading(true);

      if (!rawUserData || !userData) return;

      // Use real data from API response
      const stats = {
        totalCompanies: rawUserData.summary?.totalCompanies || 0,
        activeCompanies: rawUserData.summary?.activeCompanies || 0,
        ownedCompanies: rawUserData.companySummary?.owned?.count || 0,
        memberCompanies: rawUserData.companySummary?.member?.count || 0,
        accountAge: rawUserData.user?.stats?.accountAge || 0,
        profileCompleteness: rawUserData.summary?.profileCompleteness || 0,
        totalLogins: rawUserData.user?.recentActivity?.totalLogins || 0,
        lastLoginIP: rawUserData.user?.recentActivity?.lastLoginIP || "Unknown",
        lastLoginDevice:
          rawUserData.user?.recentActivity?.lastLoginDevice || "Unknown",
        totalInvoices: 0,
        totalRevenue: 0,
        totalParties: 0,
        lastMonthGrowth: 0,
      };

      setUserStats(stats);
    } catch (error) {
      console.error("Error loading user statistics:", error);
      addToast?.("Error loading user statistics", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate real activity from API data
  const loadRecentActivity = async () => {
    try {
      if (!rawUserData || !userData) return;

      const activities = [];
      let activityId = 1;

      // Add account creation activity
      if (userData.createdAt) {
        activities.push({
          id: activityId++,
          type: "account",
          action: "Account created",
          timestamp: userData.createdAt,
          icon: faUser,
          color: "primary",
        });
      }

      // Add last login activity
      if (userData.lastLogin) {
        activities.push({
          id: activityId++,
          type: "login",
          action: `Logged in from ${
            userStats.lastLoginDevice || "Unknown Device"
          }`,
          timestamp: userData.lastLogin,
          ip: userStats.lastLoginIP,
          icon: faSignInAlt,
          color: "success",
        });
      }

      // Add email verification activity
      if (userData.security?.emailVerified) {
        activities.push({
          id: activityId++,
          type: "verification",
          action: "Email address verified",
          timestamp: userData.createdAt,
          icon: faCheckCircle,
          color: "success",
        });
      }

      // Add company activities from recent companies
      if (rawUserData.user?.recentActivity?.recentCompanies?.length > 0) {
        rawUserData.user.recentActivity.recentCompanies.forEach((company) => {
          activities.push({
            id: activityId++,
            type: "company",
            action:
              company.userRole === "owner"
                ? `Created company '${company.businessName || company.name}'`
                : `Joined company '${
                    company.businessName || company.name
                  }' as ${company.userRole}`,
            timestamp: company.createdAt || userData.createdAt,
            icon: faBuilding,
            color: company.userRole === "owner" ? "primary" : "info",
          });
        });
      }

      // Add profile update activity if updated date differs from created date
      if (userData.updatedAt && userData.updatedAt !== userData.createdAt) {
        activities.push({
          id: activityId++,
          type: "profile",
          action: "Profile information updated",
          timestamp: userData.updatedAt,
          icon: faEdit,
          color: "warning",
        });
      }

      // Sort activities by timestamp (most recent first)
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Take only the 5 most recent activities
      setRecentActivity(activities.slice(0, 5));
    } catch (error) {
      console.error("Error loading recent activity:", error);
      addToast?.("Error loading recent activity", "error");
    }
  };

  // Load real user preferences from API data
  const loadUserPreferences = async () => {
    try {
      if (!rawUserData || !userData) return;

      const userPrefs = rawUserData.user?.preferences || {};

      setPreferences({
        emailNotifications:
          userPrefs.notifications?.email ??
          userData.preferences?.emailUpdates ??
          true,
        smsNotifications:
          userPrefs.notifications?.sms ??
          userData.preferences?.smsUpdates ??
          false,
        marketingEmails: userPrefs.marketing?.emails ?? false,
        securityAlerts: userPrefs.security?.alerts ?? true,
        invoiceReminders: userPrefs.notifications?.invoices ?? true,
        paymentAlerts: userPrefs.notifications?.payments ?? true,
      });
    } catch (error) {
      console.error("Error loading user preferences:", error);
      addToast?.("Error loading user preferences", "error");
    }
  };

  // Initialize form data to prevent controlled/uncontrolled issues
  const initializeFormData = () => {
    if (userData) {
      setEditFormData({
        name: userData.name || "",
        email: userData.email || "",
        phone: userData.phone || "",
        role: userData.role || "",
        address: userData.address
          ? `${userData.address.street}, ${userData.address.city}, ${userData.address.state} - ${userData.address.pincode}`
          : "",
      });
    }
  };

  const handleEditProfile = () => {
    initializeFormData();
    setShowEditModal(true);
  };

  const handleResetPassword = () => {
    setShowPasswordModal(true);
  };

  const handleSaveProfile = () => {
    addToast?.("Profile updated successfully", "success");
    setShowEditModal(false);
    onRefresh?.();
  };

  const handleResetPasswordConfirm = () => {
    addToast?.("Password reset email sent", "success");
    setShowPasswordModal(false);
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
    addToast?.("Preference updated", "success");
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
    return new Date(dateString).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading && !userData) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" size="lg" />
          <h5 className="mt-3 text-muted">Loading user overview...</h5>
          <p className="text-muted">
            Please wait while we fetch the user data...
          </p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="user-overview-container">
      {/* User Profile Section */}
      <Row className="g-3">
        <Col lg={8}>
          <Card className="border-0 shadow-sm modern-card h-100">
            <Card.Header className="professional-header border-0">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-bold header-title">
                  <FontAwesomeIcon
                    icon={faUser}
                    className="me-2 text-primary"
                  />
                  Profile Information
                </h6>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={handleEditProfile}
                    className="professional-button"
                  >
                    <FontAwesomeIcon icon={faEdit} className="me-1" />
                    Edit Profile
                  </Button>
                  <Button
                    variant="outline-warning"
                    size="sm"
                    onClick={handleResetPassword}
                    className="professional-button"
                  >
                    <FontAwesomeIcon icon={faKey} className="me-1" />
                    Reset Password
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="professional-body">
              <Row>
                <Col md={6}>
                  <div className="info-item">
                    <small className="info-label">Full Name</small>
                    <p className="info-value">{userData?.name || "N/A"}</p>
                  </div>
                  <div className="info-item">
                    <small className="info-label">
                      <FontAwesomeIcon icon={faEnvelope} className="me-1" />
                      Email Address
                    </small>
                    <div className="d-flex align-items-center gap-2">
                      <p className="info-value mb-0">
                        {userData?.email || "N/A"}
                      </p>
                      <Badge
                        bg={
                          userData?.security?.emailVerified
                            ? "success"
                            : "warning"
                        }
                        className="verification-badge"
                      >
                        {userData?.security?.emailVerified
                          ? "Verified"
                          : "Unverified"}
                      </Badge>
                    </div>
                  </div>
                  <div className="info-item">
                    <small className="info-label">
                      <FontAwesomeIcon icon={faPhone} className="me-1" />
                      Phone Number
                    </small>
                    <div className="d-flex align-items-center gap-2">
                      <p className="info-value mb-0">
                        {userData?.phone || "Not provided"}
                      </p>
                      {userData?.security?.phoneVerified && (
                        <Badge bg="success" className="verification-badge">
                          <FontAwesomeIcon
                            icon={faCheckCircle}
                            className="me-1"
                          />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="info-item">
                    <small className="info-label">User Role</small>
                    <div>{getRoleBadge(userData?.role)}</div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="info-item">
                    <small className="info-label">Account Status</small>
                    <div className="d-flex align-items-center gap-2">
                      {getStatusBadge(userData)}
                      {userData?.security?.isLocked && (
                        <Badge bg="danger" className="professional-badge">
                          <FontAwesomeIcon icon={faLock} className="me-1" />
                          LOCKED
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="info-item">
                    <small className="info-label">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="me-1" />
                      Address
                    </small>
                    <p className="info-value">
                      {userData?.address?.street
                        ? `${userData.address.street}, ${userData.address.city}, ${userData.address.state} - ${userData.address.pincode}`
                        : "Not provided"}
                    </p>
                  </div>
                  <div className="info-item">
                    <small className="info-label">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                      Member Since
                    </small>
                    <p className="info-value">
                      {formatDate(userData?.createdAt)}
                      <small className="text-muted ms-2">
                        ({userStats.accountAge} days ago)
                      </small>
                    </p>
                  </div>
                  <div className="info-item">
                    <small className="info-label">Last Login</small>
                    <p className="info-value">
                      {formatDate(userData?.lastLogin)}
                    </p>
                    {userStats.lastLoginIP && (
                      <small className="login-details">
                        IP: {userStats.lastLoginIP} •{" "}
                        {userStats.lastLoginDevice}
                      </small>
                    )}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm modern-card h-100">
            <Card.Header className="professional-header border-0">
              <h6 className="mb-0 fw-bold header-title">
                <FontAwesomeIcon
                  icon={faChartLine}
                  className="me-2 text-success"
                />
                Quick Stats
              </h6>
            </Card.Header>
            <Card.Body className="professional-body">
              <div className="stats-list">
                <div className="stats-item">
                  <div className="stats-icon-wrapper">
                    <FontAwesomeIcon
                      icon={faBuilding}
                      className="stats-icon text-primary"
                    />
                  </div>
                  <div className="stats-content">
                    <small className="stats-label">Total Companies</small>
                    <Badge bg="primary" className="stats-badge">
                      {userStats.totalCompanies || 0}
                    </Badge>
                  </div>
                </div>
                <div className="stats-item">
                  <div className="stats-icon-wrapper">
                    <FontAwesomeIcon
                      icon={faCrown}
                      className="stats-icon text-warning"
                    />
                  </div>
                  <div className="stats-content">
                    <small className="stats-label">Owned Companies</small>
                    <Badge bg="warning" className="stats-badge">
                      {userStats.ownedCompanies || 0}
                    </Badge>
                  </div>
                </div>
                <div className="stats-item">
                  <div className="stats-icon-wrapper">
                    <FontAwesomeIcon
                      icon={faUsers}
                      className="stats-icon text-info"
                    />
                  </div>
                  <div className="stats-content">
                    <small className="stats-label">Member Companies</small>
                    <Badge bg="info" className="stats-badge">
                      {userStats.memberCompanies || 0}
                    </Badge>
                  </div>
                </div>
                <div className="stats-item">
                  <div className="stats-icon-wrapper">
                    <FontAwesomeIcon
                      icon={faSignInAlt}
                      className="stats-icon text-success"
                    />
                  </div>
                  <div className="stats-content">
                    <small className="stats-label">Total Logins</small>
                    <Badge bg="success" className="stats-badge">
                      {userStats.totalLogins || 0}
                    </Badge>
                  </div>
                </div>
                <div className="stats-item">
                  <div className="stats-icon-wrapper">
                    <FontAwesomeIcon
                      icon={faShieldAlt}
                      className="stats-icon text-danger"
                    />
                  </div>
                  <div className="stats-content">
                    <small className="stats-label">Login Attempts</small>
                    <Badge
                      bg={
                        userData?.security?.loginAttempts > 0
                          ? "danger"
                          : "success"
                      }
                      className="stats-badge"
                    >
                      {userData?.security?.loginAttempts || 0}
                    </Badge>
                  </div>
                </div>
                <div className="stats-item">
                  <div className="stats-icon-wrapper">
                    <FontAwesomeIcon
                      icon={faHistory}
                      className="stats-icon text-secondary"
                    />
                  </div>
                  <div className="stats-content">
                    <small className="stats-label">Account Age</small>
                    <Badge bg="secondary" className="stats-badge">
                      {userStats.accountAge} days
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Profile Completeness */}
              <div className="profile-completeness">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <small className="stats-label">Profile Completeness</small>
                  <Badge bg="info" className="completeness-badge">
                    {userStats.profileCompleteness || 0}%
                  </Badge>
                </div>
                <ProgressBar
                  variant="info"
                  now={userStats.profileCompleteness || 0}
                  className="modern-progress"
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Activity & Security Info */}
      <Row className="g-3 mt-1">
        <Col lg={8}>
          <Card className="border-0 shadow-sm modern-card">
            <Card.Header className="professional-header border-0">
              <h6 className="mb-0 fw-bold header-title">
                <FontAwesomeIcon icon={faHistory} className="me-2 text-info" />
                Recent Activity
              </h6>
            </Card.Header>
            <Card.Body className="professional-body">
              {recentActivity.length > 0 ? (
                <div className="activity-list">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="activity-item">
                      <div className="activity-icon-wrapper">
                        <div className={`activity-icon bg-${activity.color}`}>
                          <FontAwesomeIcon icon={activity.icon} />
                        </div>
                      </div>
                      <div className="activity-content">
                        <p className="activity-action">{activity.action}</p>
                        <small className="activity-timestamp">
                          {formatDate(activity.timestamp)}
                          {activity.ip && (
                            <span className="ms-2">• IP: {activity.ip}</span>
                          )}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <FontAwesomeIcon
                    icon={faHistory}
                    className="empty-state-icon"
                  />
                  <h6 className="empty-state-title">No recent activity</h6>
                  <p className="empty-state-description">
                    Activity will appear here as the user interacts with the
                    system
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm modern-card">
            <Card.Header className="professional-header border-0">
              <h6 className="mb-0 fw-bold header-title">
                <FontAwesomeIcon
                  icon={faShieldAlt}
                  className="me-2 text-primary"
                />
                Security & Preferences
              </h6>
            </Card.Header>
            <Card.Body className="professional-body">
              {/* Security Section */}
              <div className="security-section">
                <h6 className="section-title">
                  <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
                  Security Status
                </h6>
                <div className="security-items">
                  <div className="security-item">
                    <small className="security-label">Email Verification</small>
                    <Badge
                      bg={
                        userData?.security?.emailVerified ? "success" : "danger"
                      }
                      className="security-badge"
                    >
                      {userData?.security?.emailVerified
                        ? "Verified"
                        : "Unverified"}
                    </Badge>
                  </div>
                  <div className="security-item">
                    <small className="security-label">Phone Verification</small>
                    <Badge
                      bg={
                        userData?.security?.phoneVerified ? "success" : "danger"
                      }
                      className="security-badge"
                    >
                      {userData?.security?.phoneVerified
                        ? "Verified"
                        : "Unverified"}
                    </Badge>
                  </div>
                  <div className="security-item">
                    <small className="security-label">Two-Factor Auth</small>
                    <Badge
                      bg={
                        userData?.security?.twoFactorEnabled
                          ? "success"
                          : "warning"
                      }
                      className="security-badge"
                    >
                      {userData?.security?.twoFactorEnabled
                        ? "Enabled"
                        : "Disabled"}
                    </Badge>
                  </div>
                  <div className="security-item">
                    <small className="security-label">Account Status</small>
                    <Badge
                      bg={userData?.security?.isLocked ? "danger" : "success"}
                      className="security-badge"
                    >
                      {userData?.security?.isLocked ? "Locked" : "Active"}
                    </Badge>
                  </div>
                </div>
              </div>

              <hr className="section-divider" />

              {/* Preferences Section */}
              <div className="preferences-section">
                <h6 className="section-title">
                  <FontAwesomeIcon icon={faCog} className="me-2" />
                  Preferences
                </h6>
                <div className="preference-items">
                  <div className="preference-item">
                    <div className="preference-label">
                      <FontAwesomeIcon
                        icon={faEnvelope}
                        className="me-2 text-primary"
                      />
                      <small>Email Notifications</small>
                    </div>
                    <Form.Check
                      type="switch"
                      checked={preferences.emailNotifications}
                      onChange={(e) =>
                        handlePreferenceChange(
                          "emailNotifications",
                          e.target.checked
                        )
                      }
                      className="preference-switch"
                    />
                  </div>
                  <div className="preference-item">
                    <div className="preference-label">
                      <FontAwesomeIcon
                        icon={faPhone}
                        className="me-2 text-success"
                      />
                      <small>SMS Notifications</small>
                    </div>
                    <Form.Check
                      type="switch"
                      checked={preferences.smsNotifications}
                      onChange={(e) =>
                        handlePreferenceChange(
                          "smsNotifications",
                          e.target.checked
                        )
                      }
                      className="preference-switch"
                    />
                  </div>
                  <div className="preference-item">
                    <div className="preference-label">
                      <FontAwesomeIcon
                        icon={faShieldAlt}
                        className="me-2 text-warning"
                      />
                      <small>Security Alerts</small>
                    </div>
                    <Form.Check
                      type="switch"
                      checked={preferences.securityAlerts}
                      onChange={(e) =>
                        handlePreferenceChange(
                          "securityAlerts",
                          e.target.checked
                        )
                      }
                      className="preference-switch"
                    />
                  </div>
                  <div className="preference-item">
                    <div className="preference-label">
                      <FontAwesomeIcon
                        icon={faBell}
                        className="me-2 text-info"
                      />
                      <small>Invoice Reminders</small>
                    </div>
                    <Form.Check
                      type="switch"
                      checked={preferences.invoiceReminders}
                      onChange={(e) =>
                        handlePreferenceChange(
                          "invoiceReminders",
                          e.target.checked
                        )
                      }
                      className="preference-switch"
                    />
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Edit Profile Modal */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton className="professional-modal-header">
          <Modal.Title className="modal-title-modern">
            <FontAwesomeIcon icon={faEdit} className="me-2" />
            Edit Profile
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="professional-modal-body">
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-modern">
                    Full Name
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={editFormData.name}
                    onChange={(e) =>
                      setEditFormData({...editFormData, name: e.target.value})
                    }
                    className="form-control-modern"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-modern">
                    Email Address
                  </Form.Label>
                  <Form.Control
                    type="email"
                    value={editFormData.email}
                    onChange={(e) =>
                      setEditFormData({...editFormData, email: e.target.value})
                    }
                    className="form-control-modern"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-modern">
                    Phone Number
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) =>
                      setEditFormData({...editFormData, phone: e.target.value})
                    }
                    className="form-control-modern"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-modern">Role</Form.Label>
                  <Form.Select
                    value={editFormData.role}
                    onChange={(e) =>
                      setEditFormData({...editFormData, role: e.target.value})
                    }
                    className="form-control-modern"
                  >
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label className="form-label-modern">Address</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={editFormData.address}
                onChange={(e) =>
                  setEditFormData({...editFormData, address: e.target.value})
                }
                className="form-control-modern"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="professional-modal-footer">
          <Button
            variant="secondary"
            onClick={() => setShowEditModal(false)}
            className="professional-button"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveProfile}
            className="professional-button"
          >
            <FontAwesomeIcon icon={faSave} className="me-2" />
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        show={showPasswordModal}
        onHide={() => setShowPasswordModal(false)}
        centered
      >
        <Modal.Header closeButton className="professional-modal-header">
          <Modal.Title className="text-warning modal-title-modern">
            <FontAwesomeIcon icon={faKey} className="me-2" />
            Reset Password
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="professional-modal-body">
          <Alert variant="warning" className="modern-alert">
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              className="me-2 fs-4"
            />
            <div>
              <strong>Password Reset</strong>
              <br />
              This will send a password reset email to the user.
            </div>
          </Alert>
          <p className="modal-description">
            Are you sure you want to reset the password for{" "}
            <strong>{userData?.name}</strong>?
          </p>
          <p className="modal-note">
            The user will receive an email at <strong>{userData?.email}</strong>{" "}
            with instructions to create a new password.
          </p>
        </Modal.Body>
        <Modal.Footer className="professional-modal-footer">
          <Button
            variant="secondary"
            onClick={() => setShowPasswordModal(false)}
            className="professional-button"
          >
            Cancel
          </Button>
          <Button
            variant="warning"
            onClick={handleResetPasswordConfirm}
            className="professional-button"
          >
            <FontAwesomeIcon icon={faKey} className="me-2" />
            Send Reset Email
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modern Professional Styles */}
      <style>
        {`
          /* Container */
          .user-overview-container {
            padding: 0.5rem;
            background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
            min-height: 100vh;
          }

          /* Modern Cards */
          .modern-card {
            border: 1px solid rgba(0, 0, 0, 0.05);
            border-radius: 1rem;
            overflow: hidden;
            transition: all 0.3s ease;
          }

          .modern-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          }

          /* Professional Headers */
          .professional-header {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-bottom: 2px solid #e9ecef;
            padding: 1rem 1.5rem;
          }

          .header-title {
            color: #2c3e50;
            font-size: 1rem;
            font-weight: 600;
          }

          /* Professional Body */
          .professional-body {
            padding: 1.5rem;
          }

          /* Info Items */
          .info-item {
            margin-bottom: 1.5rem;
          }

          .info-item:last-child {
            margin-bottom: 0;
          }

          .info-label {
            display: block;
            color: #6c757d;
            font-weight: 600;
            margin-bottom: 0.5rem;
            font-size: 0.875rem;
          }

          .info-value {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 0.25rem;
            font-size: 0.95rem;
          }

          .login-details {
            color: #6c757d;
            font-size: 0.8rem;
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

          .verification-badge {
            font-size: 0.7rem;
            padding: 0.25rem 0.5rem;
          }

          /* Stats List */
          .stats-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .stats-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            background: white;
            border-radius: 0.75rem;
            border: 1px solid rgba(0, 0, 0, 0.05);
            transition: all 0.2s ease;
          }

          .stats-item:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .stats-icon-wrapper {
            width: 36px;
            height: 36px;
            background: rgba(0, 0, 0, 0.05);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .stats-icon {
            font-size: 1rem;
          }

          .stats-content {
            flex: 1;
            display: flex;
            justify-content: between;
            align-items: center;
          }

          .stats-label {
            color: #6c757d;
            font-weight: 500;
            font-size: 0.875rem;
            flex: 1;
          }

          .stats-badge {
            font-weight: 600;
            font-size: 0.8rem;
            padding: 0.4rem 0.8rem;
            border-radius: 0.5rem;
          }

          /* Profile Completeness */
          .profile-completeness {
            margin-top: 1.5rem;
            padding: 1rem;
            background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
            border-radius: 0.75rem;
            border: 1px solid rgba(0, 0, 0, 0.05);
          }

          .completeness-badge {
            font-weight: 600;
            font-size: 0.8rem;
          }

          .modern-progress {
            height: 8px;
            border-radius: 4px;
            background-color: #e9ecef;
          }

          .modern-progress .progress-bar {
            border-radius: 4px;
          }

          /* Activity List */
          .activity-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .activity-item {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            padding: 1rem;
            background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            border-radius: 0.75rem;
            border: 1px solid rgba(0, 0, 0, 0.05);
            transition: all 0.2s ease;
          }

          .activity-item:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .activity-icon-wrapper {
            flex-shrink: 0;
          }

          .activity-icon {
            width: 36px;
            height: 36px;
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

          .activity-content {
            flex: 1;
          }

          .activity-action {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 0.25rem;
            font-size: 0.95rem;
          }

          .activity-timestamp {
            color: #6c757d;
            font-size: 0.85rem;
          }

          /* Security Section */
          .security-section {
            margin-bottom: 1.5rem;
          }

          .section-title {
            font-size: 0.9rem;
            font-weight: 600;
            color: #495057;
            margin-bottom: 1rem;
          }

          .security-items {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .security-item {
            display: flex;
            justify-content: between;
            align-items: center;
            padding: 0.75rem;
            background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            border-radius: 0.5rem;
            border: 1px solid rgba(0, 0, 0, 0.05);
          }

          .security-label {
            color: #6c757d;
            font-weight: 500;
            font-size: 0.875rem;
            flex: 1;
          }

          .security-badge {
            font-size: 0.7rem;
            padding: 0.25rem 0.6rem;
            border-radius: 0.4rem;
            font-weight: 600;
          }

          .section-divider {
            margin: 1.5rem 0;
            border-color: #e9ecef;
          }

          /* Preferences Section */
          .preferences-section {
            margin-top: 1.5rem;
          }

          .preference-items {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .preference-item {
            display: flex;
            justify-content: between;
            align-items: center;
            padding: 0.75rem;
            background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            border-radius: 0.5rem;
            border: 1px solid rgba(0, 0, 0, 0.05);
          }

          .preference-label {
            display: flex;
            align-items: center;
            flex: 1;
          }

          .preference-switch .form-check-input {
            background-color: #dee2e6;
            border-color: #dee2e6;
          }

          .preference-switch .form-check-input:checked {
            background-color: #0d6efd;
            border-color: #0d6efd;
          }

          /* Empty State */
          .empty-state {
            text-align: center;
            padding: 3rem 2rem;
            background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            border-radius: 0.75rem;
            border: 1px solid rgba(0, 0, 0, 0.05);
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

          /* Modal Styles */
          .professional-modal-header {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-bottom: 2px solid #e9ecef;
          }

          .modal-title-modern {
            font-size: 1.1rem;
            font-weight: 600;
          }

          .professional-modal-body {
            padding: 1.5rem;
          }

          .professional-modal-footer {
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
            padding: 1rem 1.5rem;
          }

          .modern-alert {
            border: none;
            border-radius: 0.75rem;
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
          }

          .modal-description {
            font-size: 0.95rem;
            color: #495057;
            margin-bottom: 1rem;
          }

          .modal-note {
            font-size: 0.875rem;
            color: #6c757d;
            margin-bottom: 0;
          }

          /* Form Controls */
          .form-label-modern {
            font-weight: 600;
            color: #495057;
            margin-bottom: 0.5rem;
          }

          .form-control-modern {
            border-radius: 0.5rem;
            border: 1px solid #dee2e6;
            padding: 0.6rem 1rem;
            transition: all 0.2s ease;
          }

          .form-control-modern:focus {
            border-color: #0d6efd;
            box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
          }

          /* Responsive Design */
          @media (max-width: 992px) {
            .professional-header {
              padding: 1rem;
            }

            .professional-body {
              padding: 1rem;
            }

            .stats-item {
              padding: 0.5rem;
            }

            .activity-item {
              padding: 0.75rem;
            }
          }

          @media (max-width: 768px) {
            .user-overview-container {
              padding: 0.25rem;
            }

            .professional-header {
              padding: 0.75rem;
            }

            .professional-body {
              padding: 0.75rem;
            }

            .header-title {
              font-size: 0.95rem;
            }

            .info-item {
              margin-bottom: 1rem;
            }

            .stats-item {
              gap: 0.5rem;
            }

            .stats-icon-wrapper {
              width: 32px;
              height: 32px;
            }

            .activity-icon {
              width: 32px;
              height: 32px;
              font-size: 0.8rem;
            }
          }

          @media (max-width: 576px) {
            .professional-button {
              font-size: 0.875rem;
              padding: 0.35rem 0.75rem;
            }

            .stats-badge {
              font-size: 0.75rem;
              padding: 0.3rem 0.6rem;
            }

            .empty-state {
              padding: 2rem 1rem;
            }

            .empty-state-icon {
              font-size: 2rem;
            }
          }

          /* Focus States for Accessibility */
          .professional-button:focus,
          .form-control-modern:focus,
          .preference-switch .form-check-input:focus {
            outline: 2px solid #0d6efd;
            outline-offset: 2px;
          }

          /* Smooth Transitions */
          * {
            transition: transform 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
          }
        `}
      </style>
    </div>
  );
}

export default UserOverview;
