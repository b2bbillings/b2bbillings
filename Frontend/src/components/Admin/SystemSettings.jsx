import React, {useState, useEffect} from "react";
import {
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  Tab,
  Nav,
  Badge,
  InputGroup,
  Modal,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faCog,
  faSave,
  faUndo,
  faServer,
  faDatabase,
  faEnvelope,
  faShieldAlt,
  faCloud,
  faBell,
  faGlobe,
  faCode,
  faKey,
  faExclamationTriangle,
  faCheckCircle,
  faEye,
  faEyeSlash,
} from "@fortawesome/free-solid-svg-icons";

function SystemSettings({adminData, currentUser, addToast, onSettingsUpdate}) {
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [showPasswordFields, setShowPasswordFields] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockSettings = {
        general: {
          systemName: "Shop Management System",
          systemDescription: "Complete business management solution",
          maintenanceMode: false,
          registrationEnabled: true,
          defaultLanguage: "en",
          timezone: "Asia/Kolkata",
          dateFormat: "DD/MM/YYYY",
          currency: "INR",
          currencySymbol: "₹",
          maxCompanies: 100,
          maxUsersPerCompany: 50,
        },
        email: {
          smtpHost: "smtp.gmail.com",
          smtpPort: 587,
          smtpUsername: "system@shopmanagement.com",
          smtpPassword: "",
          smtpEncryption: "tls",
          fromEmail: "noreply@shopmanagement.com",
          fromName: "Shop Management System",
          testEmailEnabled: true,
        },
        security: {
          passwordMinLength: 8,
          passwordRequireSpecialChar: true,
          passwordRequireNumbers: true,
          passwordRequireUppercase: true,
          sessionTimeout: 60,
          maxLoginAttempts: 5,
          lockoutDuration: 30,
          twoFactorRequired: false,
          ipWhitelistEnabled: false,
          allowedIPs: ["127.0.0.1", "192.168.1.0/24"],
        },
        backup: {
          autoBackupEnabled: true,
          backupFrequency: "daily",
          backupTime: "02:00",
          retentionDays: 30,
          cloudBackupEnabled: false,
          cloudProvider: "aws",
          awsAccessKey: "",
          awsSecretKey: "",
          awsBucket: "shop-management-backups",
        },
        notifications: {
          emailNotifications: true,
          systemAlerts: true,
          userRegistration: true,
          dataBackup: true,
          systemErrors: true,
          securityAlerts: true,
          lowStorageAlert: true,
          maintenanceAlerts: true,
        },
        api: {
          rateLimit: 1000,
          rateLimitWindow: 60,
          corsEnabled: true,
          allowedOrigins: "http://localhost:5173,https://yourdomain.com",
          apiKeyRequired: false,
          webhooksEnabled: false,
          apiVersion: "v1",
          debugMode: false,
        },
      };

      setSettings(mockSettings);
    } catch (error) {
      console.error("Error loading settings:", error);
      addToast?.("Failed to load system settings", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (category, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);

      // Validate critical settings
      if (
        settings.general?.maintenanceMode &&
        !window.confirm(
          "Are you sure you want to enable maintenance mode? This will prevent users from accessing the system."
        )
      ) {
        return;
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setHasChanges(false);
      addToast?.("System settings saved successfully", "success");
      onSettingsUpdate?.();
    } catch (error) {
      console.error("Error saving settings:", error);
      addToast?.("Failed to save system settings", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSettings = () => {
    if (
      window.confirm(
        "Are you sure you want to reset all settings to default values?"
      )
    ) {
      loadSettings();
      setHasChanges(false);
      addToast?.("Settings reset to default values", "info");
    }
  };

  const testEmailConnection = async () => {
    try {
      addToast?.("Testing email connection...", "info");

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      addToast?.("Email connection test successful", "success");
    } catch (error) {
      addToast?.("Email connection test failed", "error");
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswordFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" size="lg" />
        <h5 className="mt-3 text-muted">Loading system settings...</h5>
      </div>
    );
  }

  return (
    <div className="system-settings">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">System Settings</h4>
          <p className="text-muted mb-0">
            Configure system-wide settings and preferences
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="outline-secondary"
            onClick={handleResetSettings}
            disabled={isSaving}
          >
            <FontAwesomeIcon icon={faUndo} className="me-2" />
            Reset to Default
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveSettings}
            disabled={!hasChanges || isSaving}
          >
            <FontAwesomeIcon
              icon={isSaving ? faServer : faSave}
              className={`me-2 ${isSaving ? "fa-spin" : ""}`}
            />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Changes Alert */}
      {hasChanges && (
        <Alert variant="warning" className="mb-4">
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          You have unsaved changes. Make sure to save your settings before
          leaving this page.
        </Alert>
      )}

      {/* Settings Tabs */}
      <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
        <Nav variant="pills" className="mb-4">
          <Nav.Item>
            <Nav.Link eventKey="general">
              <FontAwesomeIcon icon={faGlobe} className="me-2" />
              General
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="email">
              <FontAwesomeIcon icon={faEnvelope} className="me-2" />
              Email
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="security">
              <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
              Security
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="backup">
              <FontAwesomeIcon icon={faCloud} className="me-2" />
              Backup
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="notifications">
              <FontAwesomeIcon icon={faBell} className="me-2" />
              Notifications
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="api">
              <FontAwesomeIcon icon={faCode} className="me-2" />
              API
            </Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          {/* General Settings */}
          <Tab.Pane eventKey="general">
            <Card>
              <Card.Header>
                <h5 className="mb-0">
                  <FontAwesomeIcon icon={faGlobe} className="me-2" />
                  General Settings
                </h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>System Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={settings.general?.systemName || ""}
                        onChange={(e) =>
                          handleSettingChange(
                            "general",
                            "systemName",
                            e.target.value
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Default Language</Form.Label>
                      <Form.Select
                        value={settings.general?.defaultLanguage || "en"}
                        onChange={(e) =>
                          handleSettingChange(
                            "general",
                            "defaultLanguage",
                            e.target.value
                          )
                        }
                      >
                        <option value="en">English</option>
                        <option value="hi">हिंदी (Hindi)</option>
                        <option value="mr">मराठी (Marathi)</option>
                        <option value="gu">ગુજરાતી (Gujarati)</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>System Description</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={settings.general?.systemDescription || ""}
                        onChange={(e) =>
                          handleSettingChange(
                            "general",
                            "systemDescription",
                            e.target.value
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Timezone</Form.Label>
                      <Form.Select
                        value={settings.general?.timezone || "Asia/Kolkata"}
                        onChange={(e) =>
                          handleSettingChange(
                            "general",
                            "timezone",
                            e.target.value
                          )
                        }
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">
                          America/New_York (EST)
                        </option>
                        <option value="Europe/London">
                          Europe/London (GMT)
                        </option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date Format</Form.Label>
                      <Form.Select
                        value={settings.general?.dateFormat || "DD/MM/YYYY"}
                        onChange={(e) =>
                          handleSettingChange(
                            "general",
                            "dateFormat",
                            e.target.value
                          )
                        }
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Currency</Form.Label>
                      <Form.Select
                        value={settings.general?.currency || "INR"}
                        onChange={(e) =>
                          handleSettingChange(
                            "general",
                            "currency",
                            e.target.value
                          )
                        }
                      >
                        <option value="INR">Indian Rupee (INR)</option>
                        <option value="USD">US Dollar (USD)</option>
                        <option value="EUR">Euro (EUR)</option>
                        <option value="GBP">British Pound (GBP)</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Max Companies</Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        value={settings.general?.maxCompanies || 100}
                        onChange={(e) =>
                          handleSettingChange(
                            "general",
                            "maxCompanies",
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <hr />

                <Row>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      label="Maintenance Mode"
                      checked={settings.general?.maintenanceMode || false}
                      onChange={(e) =>
                        handleSettingChange(
                          "general",
                          "maintenanceMode",
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                    {settings.general?.maintenanceMode && (
                      <Alert variant="warning" className="mb-3">
                        <small>
                          <FontAwesomeIcon
                            icon={faExclamationTriangle}
                            className="me-1"
                          />
                          Maintenance mode is enabled. Users will not be able to
                          access the system.
                        </small>
                      </Alert>
                    )}
                  </Col>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      label="User Registration Enabled"
                      checked={settings.general?.registrationEnabled || false}
                      onChange={(e) =>
                        handleSettingChange(
                          "general",
                          "registrationEnabled",
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* Email Settings */}
          <Tab.Pane eventKey="email">
            <Card>
              <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                    Email Configuration
                  </h5>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={testEmailConnection}
                  >
                    Test Connection
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>SMTP Host</Form.Label>
                      <Form.Control
                        type="text"
                        value={settings.email?.smtpHost || ""}
                        onChange={(e) =>
                          handleSettingChange(
                            "email",
                            "smtpHost",
                            e.target.value
                          )
                        }
                        placeholder="smtp.gmail.com"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>SMTP Port</Form.Label>
                      <Form.Control
                        type="number"
                        value={settings.email?.smtpPort || 587}
                        onChange={(e) =>
                          handleSettingChange(
                            "email",
                            "smtpPort",
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>SMTP Username</Form.Label>
                      <Form.Control
                        type="email"
                        value={settings.email?.smtpUsername || ""}
                        onChange={(e) =>
                          handleSettingChange(
                            "email",
                            "smtpUsername",
                            e.target.value
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>SMTP Password</Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={
                            showPasswordFields.smtpPassword
                              ? "text"
                              : "password"
                          }
                          value={settings.email?.smtpPassword || ""}
                          onChange={(e) =>
                            handleSettingChange(
                              "email",
                              "smtpPassword",
                              e.target.value
                            )
                          }
                          placeholder="••••••••"
                        />
                        <Button
                          variant="outline-secondary"
                          onClick={() =>
                            togglePasswordVisibility("smtpPassword")
                          }
                        >
                          <FontAwesomeIcon
                            icon={
                              showPasswordFields.smtpPassword
                                ? faEyeSlash
                                : faEye
                            }
                          />
                        </Button>
                      </InputGroup>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Encryption</Form.Label>
                      <Form.Select
                        value={settings.email?.smtpEncryption || "tls"}
                        onChange={(e) =>
                          handleSettingChange(
                            "email",
                            "smtpEncryption",
                            e.target.value
                          )
                        }
                      >
                        <option value="tls">TLS</option>
                        <option value="ssl">SSL</option>
                        <option value="none">None</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>From Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={settings.email?.fromEmail || ""}
                        onChange={(e) =>
                          handleSettingChange(
                            "email",
                            "fromEmail",
                            e.target.value
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>From Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={settings.email?.fromName || ""}
                        onChange={(e) =>
                          handleSettingChange(
                            "email",
                            "fromName",
                            e.target.value
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* Security Settings */}
          <Tab.Pane eventKey="security">
            <Card>
              <Card.Header>
                <h5 className="mb-0">
                  <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
                  Security Settings
                </h5>
              </Card.Header>
              <Card.Body>
                <h6 className="mb-3">Password Policy</h6>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Minimum Password Length</Form.Label>
                      <Form.Control
                        type="number"
                        min="6"
                        max="32"
                        value={settings.security?.passwordMinLength || 8}
                        onChange={(e) =>
                          handleSettingChange(
                            "security",
                            "passwordMinLength",
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Session Timeout (minutes)</Form.Label>
                      <Form.Control
                        type="number"
                        min="15"
                        max="480"
                        value={settings.security?.sessionTimeout || 60}
                        onChange={(e) =>
                          handleSettingChange(
                            "security",
                            "sessionTimeout",
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      label="Require Special Characters"
                      checked={
                        settings.security?.passwordRequireSpecialChar || false
                      }
                      onChange={(e) =>
                        handleSettingChange(
                          "security",
                          "passwordRequireSpecialChar",
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      label="Require Numbers"
                      checked={
                        settings.security?.passwordRequireNumbers || false
                      }
                      onChange={(e) =>
                        handleSettingChange(
                          "security",
                          "passwordRequireNumbers",
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      label="Require Uppercase Letters"
                      checked={
                        settings.security?.passwordRequireUppercase || false
                      }
                      onChange={(e) =>
                        handleSettingChange(
                          "security",
                          "passwordRequireUppercase",
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      label="Require Two-Factor Authentication"
                      checked={settings.security?.twoFactorRequired || false}
                      onChange={(e) =>
                        handleSettingChange(
                          "security",
                          "twoFactorRequired",
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                  </Col>
                </Row>

                <hr />

                <h6 className="mb-3">Login Security</h6>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Max Login Attempts</Form.Label>
                      <Form.Control
                        type="number"
                        min="3"
                        max="10"
                        value={settings.security?.maxLoginAttempts || 5}
                        onChange={(e) =>
                          handleSettingChange(
                            "security",
                            "maxLoginAttempts",
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Lockout Duration (minutes)</Form.Label>
                      <Form.Control
                        type="number"
                        min="5"
                        max="1440"
                        value={settings.security?.lockoutDuration || 30}
                        onChange={(e) =>
                          handleSettingChange(
                            "security",
                            "lockoutDuration",
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Check
                  type="switch"
                  label="Enable IP Whitelist"
                  checked={settings.security?.ipWhitelistEnabled || false}
                  onChange={(e) =>
                    handleSettingChange(
                      "security",
                      "ipWhitelistEnabled",
                      e.target.checked
                    )
                  }
                  className="mb-3"
                />

                {settings.security?.ipWhitelistEnabled && (
                  <Form.Group className="mb-3">
                    <Form.Label>Allowed IP Addresses (one per line)</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={settings.security?.allowedIPs?.join("\n") || ""}
                      onChange={(e) =>
                        handleSettingChange(
                          "security",
                          "allowedIPs",
                          e.target.value.split("\n").filter((ip) => ip.trim())
                        )
                      }
                      placeholder="127.0.0.1&#10;192.168.1.0/24"
                    />
                  </Form.Group>
                )}
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* Backup Settings */}
          <Tab.Pane eventKey="backup">
            <Card>
              <Card.Header>
                <h5 className="mb-0">
                  <FontAwesomeIcon icon={faCloud} className="me-2" />
                  Backup Configuration
                </h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      label="Enable Automatic Backups"
                      checked={settings.backup?.autoBackupEnabled || false}
                      onChange={(e) =>
                        handleSettingChange(
                          "backup",
                          "autoBackupEnabled",
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      label="Enable Cloud Backup"
                      checked={settings.backup?.cloudBackupEnabled || false}
                      onChange={(e) =>
                        handleSettingChange(
                          "backup",
                          "cloudBackupEnabled",
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                  </Col>
                </Row>

                {settings.backup?.autoBackupEnabled && (
                  <>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Backup Frequency</Form.Label>
                          <Form.Select
                            value={settings.backup?.backupFrequency || "daily"}
                            onChange={(e) =>
                              handleSettingChange(
                                "backup",
                                "backupFrequency",
                                e.target.value
                              )
                            }
                          >
                            <option value="hourly">Hourly</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Backup Time</Form.Label>
                          <Form.Control
                            type="time"
                            value={settings.backup?.backupTime || "02:00"}
                            onChange={(e) =>
                              handleSettingChange(
                                "backup",
                                "backupTime",
                                e.target.value
                              )
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Retention Period (days)</Form.Label>
                          <Form.Control
                            type="number"
                            min="1"
                            max="365"
                            value={settings.backup?.retentionDays || 30}
                            onChange={(e) =>
                              handleSettingChange(
                                "backup",
                                "retentionDays",
                                parseInt(e.target.value)
                              )
                            }
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </>
                )}

                {settings.backup?.cloudBackupEnabled && (
                  <>
                    <hr />
                    <h6 className="mb-3">Cloud Storage Configuration</h6>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Cloud Provider</Form.Label>
                          <Form.Select
                            value={settings.backup?.cloudProvider || "aws"}
                            onChange={(e) =>
                              handleSettingChange(
                                "backup",
                                "cloudProvider",
                                e.target.value
                              )
                            }
                          >
                            <option value="aws">Amazon S3</option>
                            <option value="gcp">Google Cloud</option>
                            <option value="azure">Microsoft Azure</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Bucket Name</Form.Label>
                          <Form.Control
                            type="text"
                            value={settings.backup?.awsBucket || ""}
                            onChange={(e) =>
                              handleSettingChange(
                                "backup",
                                "awsBucket",
                                e.target.value
                              )
                            }
                            placeholder="your-backup-bucket"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Access Key</Form.Label>
                          <Form.Control
                            type="text"
                            value={settings.backup?.awsAccessKey || ""}
                            onChange={(e) =>
                              handleSettingChange(
                                "backup",
                                "awsAccessKey",
                                e.target.value
                              )
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Secret Key</Form.Label>
                          <InputGroup>
                            <Form.Control
                              type={
                                showPasswordFields.awsSecretKey
                                  ? "text"
                                  : "password"
                              }
                              value={settings.backup?.awsSecretKey || ""}
                              onChange={(e) =>
                                handleSettingChange(
                                  "backup",
                                  "awsSecretKey",
                                  e.target.value
                                )
                              }
                              placeholder="••••••••"
                            />
                            <Button
                              variant="outline-secondary"
                              onClick={() =>
                                togglePasswordVisibility("awsSecretKey")
                              }
                            >
                              <FontAwesomeIcon
                                icon={
                                  showPasswordFields.awsSecretKey
                                    ? faEyeSlash
                                    : faEye
                                }
                              />
                            </Button>
                          </InputGroup>
                        </Form.Group>
                      </Col>
                    </Row>
                  </>
                )}
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* Notification Settings */}
          <Tab.Pane eventKey="notifications">
            <Card>
              <Card.Header>
                <h5 className="mb-0">
                  <FontAwesomeIcon icon={faBell} className="me-2" />
                  Notification Settings
                </h5>
              </Card.Header>
              <Card.Body>
                <h6 className="mb-3">Email Notifications</h6>
                <Row>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      label="Enable Email Notifications"
                      checked={
                        settings.notifications?.emailNotifications || false
                      }
                      onChange={(e) =>
                        handleSettingChange(
                          "notifications",
                          "emailNotifications",
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      label="System Alerts"
                      checked={settings.notifications?.systemAlerts || false}
                      onChange={(e) =>
                        handleSettingChange(
                          "notifications",
                          "systemAlerts",
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      label="User Registration Notifications"
                      checked={
                        settings.notifications?.userRegistration || false
                      }
                      onChange={(e) =>
                        handleSettingChange(
                          "notifications",
                          "userRegistration",
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      label="Data Backup Notifications"
                      checked={settings.notifications?.dataBackup || false}
                      onChange={(e) =>
                        handleSettingChange(
                          "notifications",
                          "dataBackup",
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      label="System Error Alerts"
                      checked={settings.notifications?.systemErrors || false}
                      onChange={(e) =>
                        handleSettingChange(
                          "notifications",
                          "systemErrors",
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      label="Security Alerts"
                      checked={settings.notifications?.securityAlerts || false}
                      onChange={(e) =>
                        handleSettingChange(
                          "notifications",
                          "securityAlerts",
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      label="Low Storage Alerts"
                      checked={settings.notifications?.lowStorageAlert || false}
                      onChange={(e) =>
                        handleSettingChange(
                          "notifications",
                          "lowStorageAlert",
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      label="Maintenance Alerts"
                      checked={
                        settings.notifications?.maintenanceAlerts || false
                      }
                      onChange={(e) =>
                        handleSettingChange(
                          "notifications",
                          "maintenanceAlerts",
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* API Settings */}
          <Tab.Pane eventKey="api">
            <Card>
              <Card.Header>
                <h5 className="mb-0">
                  <FontAwesomeIcon icon={faCode} className="me-2" />
                  API Configuration
                </h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Rate Limit (requests per window)</Form.Label>
                      <Form.Control
                        type="number"
                        min="100"
                        max="10000"
                        value={settings.api?.rateLimit || 1000}
                        onChange={(e) =>
                          handleSettingChange(
                            "api",
                            "rateLimit",
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Rate Limit Window (minutes)</Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        max="1440"
                        value={settings.api?.rateLimitWindow || 60}
                        onChange={(e) =>
                          handleSettingChange(
                            "api",
                            "rateLimitWindow",
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>API Version</Form.Label>
                      <Form.Select
                        value={settings.api?.apiVersion || "v1"}
                        onChange={(e) =>
                          handleSettingChange(
                            "api",
                            "apiVersion",
                            e.target.value
                          )
                        }
                      >
                        <option value="v1">Version 1.0</option>
                        <option value="v2">Version 2.0 (Beta)</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Allowed Origins (CORS)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={settings.api?.allowedOrigins || ""}
                    onChange={(e) =>
                      handleSettingChange(
                        "api",
                        "allowedOrigins",
                        e.target.value
                      )
                    }
                    placeholder="http://localhost:5173&#10;https://yourdomain.com"
                  />
                  <Form.Text className="text-muted">
                    Enter one origin per line. Use * for all origins (not
                    recommended for production).
                  </Form.Text>
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      label="Enable CORS"
                      checked={settings.api?.corsEnabled || false}
                      onChange={(e) =>
                        handleSettingChange(
                          "api",
                          "corsEnabled",
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      label="Require API Key"
                      checked={settings.api?.apiKeyRequired || false}
                      onChange={(e) =>
                        handleSettingChange(
                          "api",
                          "apiKeyRequired",
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      label="Enable Webhooks"
                      checked={settings.api?.webhooksEnabled || false}
                      onChange={(e) =>
                        handleSettingChange(
                          "api",
                          "webhooksEnabled",
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      label="Debug Mode"
                      checked={settings.api?.debugMode || false}
                      onChange={(e) =>
                        handleSettingChange(
                          "api",
                          "debugMode",
                          e.target.checked
                        )
                      }
                      className="mb-3"
                    />
                  </Col>
                </Row>

                {settings.api?.debugMode && (
                  <Alert variant="warning">
                    <FontAwesomeIcon
                      icon={faExclamationTriangle}
                      className="me-2"
                    />
                    Debug mode is enabled. This will include additional
                    information in API responses. Make sure to disable this in
                    production.
                  </Alert>
                )}
              </Card.Body>
            </Card>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </div>
  );
}

export default SystemSettings;
