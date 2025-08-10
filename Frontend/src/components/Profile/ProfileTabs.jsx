import React, {useState, useEffect} from "react";
import {Container, Row, Col, Nav, Tab, Card, Alert} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faUser,
  faBuilding,
  faShield,
  faBell,
  faEye,
  faCog,
  faHistory,
  faChartLine,
  faKey,
  faUserEdit,
} from "@fortawesome/free-solid-svg-icons";

// Import profile components
import ProfileOverview from "./ProfileOverview";
import PersonalInfo from "./PersonalInfo";
import BusinessInfo from "./BusinessInfo";
import SecuritySettings from "./SecuritySettings";
import NotificationSettings from "./NotificationSettings";
import PrivacySettings from "./PrivacySettings";
import AccountSettings from "./AccountSettings";
import ActivityLog from "./ActivityLog";
import ProfileStats from "./ProfileStats";
import TwoFactorAuth from "./TwoFactorAuth";

// Import CSS
import "./Profile.css";

function ProfileTabs({
  userId,
  currentUser,
  currentCompany,
  addToast,
  onProfileUpdate,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profileData, setProfileData] = useState(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Load profile data
  useEffect(() => {
    loadProfileData();
  }, [userId]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      setError("");

      // Load user profile data
      const response = await fetch(`/api/users/${userId}/profile`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
      } else {
        throw new Error("Failed to load profile data");
      }
    } catch (error) {
      setError(error.message);
      addToast("Error loading profile data", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle profile updates
  const handleProfileUpdate = (updatedData) => {
    setProfileData((prev) => ({...prev, ...updatedData}));
    setUnsavedChanges(false);

    if (onProfileUpdate) {
      onProfileUpdate(updatedData);
    }

    addToast("Profile updated successfully", "success");
  };

  // Handle unsaved changes warning
  const handleTabChange = (tab) => {
    if (unsavedChanges) {
      const confirmLeave = window.confirm(
        "You have unsaved changes. Are you sure you want to leave this section?"
      );
      if (!confirmLeave) return;
    }

    setActiveTab(tab);
    setUnsavedChanges(false);
  };

  // Tab configuration
  const tabs = [
    {
      key: "overview",
      title: "Overview",
      icon: faUser,
      component: ProfileOverview,
      description: "Profile summary and quick stats",
    },
    {
      key: "personal",
      title: "Personal Info",
      icon: faUserEdit,
      component: PersonalInfo,
      description: "Personal details and contact information",
    },
    {
      key: "business",
      title: "Business Info",
      icon: faBuilding,
      component: BusinessInfo,
      description: "Company and business details",
    },
    {
      key: "security",
      title: "Security",
      icon: faShield,
      component: SecuritySettings,
      description: "Password and security settings",
    },
    {
      key: "twofactor",
      title: "2FA",
      icon: faKey,
      component: TwoFactorAuth,
      description: "Two-factor authentication setup",
    },
    {
      key: "notifications",
      title: "Notifications",
      icon: faBell,
      component: NotificationSettings,
      description: "Notification preferences",
    },
    {
      key: "privacy",
      title: "Privacy",
      icon: faEye,
      component: PrivacySettings,
      description: "Privacy and data settings",
    },
    {
      key: "account",
      title: "Account",
      icon: faCog,
      component: AccountSettings,
      description: "Account preferences and settings",
    },
    {
      key: "activity",
      title: "Activity",
      icon: faHistory,
      component: ActivityLog,
      description: "Login history and activity log",
    },
    {
      key: "stats",
      title: "Statistics",
      icon: faChartLine,
      component: ProfileStats,
      description: "Profile and usage statistics",
    },
  ];

  // Get active tab component
  const ActiveComponent = tabs.find((tab) => tab.key === activeTab)?.component;

  return (
    <div className="profile-tabs-container">
      <Container fluid>
        {/* Error Alert */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError("")}>
            <FontAwesomeIcon icon={faShield} className="me-2" />
            {error}
          </Alert>
        )}

        {/* Unsaved Changes Warning */}
        {unsavedChanges && (
          <Alert variant="warning" className="mb-3">
            <FontAwesomeIcon icon={faUserEdit} className="me-2" />
            You have unsaved changes. Please save your changes before switching
            tabs.
          </Alert>
        )}

        <Row>
          {/* Sidebar Navigation */}
          <Col lg={3} md={4} className="profile-sidebar">
            <Card className="profile-nav-card">
              <Card.Header className="profile-nav-header">
                <h5 className="mb-0">
                  <FontAwesomeIcon icon={faUser} className="me-2" />
                  Profile Settings
                </h5>
              </Card.Header>
              <Card.Body className="p-0">
                <Nav variant="pills" className="flex-column profile-nav">
                  {tabs.map((tab) => (
                    <Nav.Item key={tab.key}>
                      <Nav.Link
                        active={activeTab === tab.key}
                        onClick={() => handleTabChange(tab.key)}
                        className="profile-nav-link"
                      >
                        <div className="d-flex align-items-center">
                          <FontAwesomeIcon
                            icon={tab.icon}
                            className="profile-nav-icon me-3"
                          />
                          <div className="profile-nav-content">
                            <div className="profile-nav-title">{tab.title}</div>
                            <small className="profile-nav-desc text-muted">
                              {tab.description}
                            </small>
                          </div>
                        </div>
                      </Nav.Link>
                    </Nav.Item>
                  ))}
                </Nav>
              </Card.Body>
            </Card>
          </Col>

          {/* Main Content Area */}
          <Col lg={9} md={8}>
            <div className="profile-content">
              {loading ? (
                <Card>
                  <Card.Body className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3 text-muted">Loading profile data...</p>
                  </Card.Body>
                </Card>
              ) : ActiveComponent ? (
                <ActiveComponent
                  userId={userId}
                  currentUser={currentUser}
                  currentCompany={currentCompany}
                  profileData={profileData}
                  onUpdate={handleProfileUpdate}
                  onUnsavedChanges={setUnsavedChanges}
                  addToast={addToast}
                />
              ) : (
                <Card>
                  <Card.Body className="text-center py-5">
                    <FontAwesomeIcon
                      icon={faUser}
                      size="3x"
                      className="text-muted mb-3"
                    />
                    <h5>Component Not Found</h5>
                    <p className="text-muted">
                      The requested profile section is not available.
                    </p>
                  </Card.Body>
                </Card>
              )}
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default ProfileTabs;
