import React, {useState, useEffect} from "react";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Form,
  Alert,
  Badge,
  Modal,
  Spinner,
  InputGroup,
  Tab,
  Nav,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faShieldAlt,
  faLock,
  faKey,
  faUserShield,
  faExclamationTriangle,
  faEye,
  faBan,
  faCheck,
  faHistory,
  faSearch,
  faDownload,
  faServer,
  faGlobe,
  faDatabase,
  faCog,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";

function SecurityManagement({adminData, currentUser, addToast}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [securityData, setSecurityData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginAttempts, setLoginAttempts] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setIsLoading(true);

      // Simulate API calls
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockSecurityData = {
        threatLevel: "Low",
        activeThreats: 2,
        blockedIPs: 15,
        suspiciousActivities: 5,
        lastSecurityScan: new Date(),
        systemVulnerabilities: 0,
        securityScore: 92,
      };

      const mockLoginAttempts = [
        {
          id: "1",
          email: "john.doe@example.com",
          ip: "192.168.1.100",
          status: "success",
          timestamp: new Date("2024-06-30T10:30:00"),
          location: "Mumbai, India",
          userAgent: "Chrome 125.0.0.0",
        },
        {
          id: "2",
          email: "invalid@user.com",
          ip: "203.192.1.45",
          status: "failed",
          timestamp: new Date("2024-06-30T10:25:00"),
          location: "Unknown",
          userAgent: "Bot/1.0",
        },
        {
          id: "3",
          email: "jane.smith@company.com",
          ip: "192.168.1.105",
          status: "success",
          timestamp: new Date("2024-06-30T10:20:00"),
          location: "Delhi, India",
          userAgent: "Firefox 126.0",
        },
      ];

      const mockSecurityLogs = [
        {
          id: "1",
          type: "authentication",
          severity: "medium",
          message: "Multiple failed login attempts detected",
          ip: "203.192.1.45",
          timestamp: new Date("2024-06-30T10:25:00"),
          action: "IP temporarily blocked",
        },
        {
          id: "2",
          type: "system",
          severity: "low",
          message: "Security scan completed successfully",
          ip: "system",
          timestamp: new Date("2024-06-30T02:00:00"),
          action: "No threats found",
        },
        {
          id: "3",
          type: "data_access",
          severity: "high",
          message: "Unauthorized database access attempt",
          ip: "45.123.67.89",
          timestamp: new Date("2024-06-29T23:45:00"),
          action: "Access denied and logged",
        },
      ];

      const mockActiveUsers = [
        {
          id: "1",
          name: "John Doe",
          email: "john.doe@company.com",
          ip: "192.168.1.100",
          lastActivity: new Date(),
          sessionDuration: "2h 15m",
          location: "Mumbai, India",
        },
        {
          id: "2",
          name: "Jane Smith",
          email: "jane.smith@company.com",
          ip: "192.168.1.105",
          lastActivity: new Date(Date.now() - 300000),
          sessionDuration: "45m",
          location: "Delhi, India",
        },
      ];

      setSecurityData(mockSecurityData);
      setLoginAttempts(mockLoginAttempts);
      setSecurityLogs(mockSecurityLogs);
      setActiveUsers(mockActiveUsers);
    } catch (error) {
      console.error("Error loading security data:", error);
      addToast?.("Failed to load security data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlockIP = async (ip) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      addToast?.(`IP ${ip} has been blocked`, "success");
      loadSecurityData();
    } catch (error) {
      addToast?.("Failed to block IP", "error");
    }
  };

  const handleForceLogout = async (userId) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setActiveUsers((prev) => prev.filter((user) => user.id !== userId));
      addToast?.("User session terminated", "success");
    } catch (error) {
      addToast?.("Failed to terminate session", "error");
    }
  };

  const SecurityOverview = () => (
    <Row>
      <Col lg={3} md={6} className="mb-4">
        <Card className="h-100 border-0 shadow-sm">
          <Card.Body className="text-center">
            <div className="mb-3">
              <FontAwesomeIcon
                icon={faShieldAlt}
                size="2x"
                className={`text-${
                  securityData?.threatLevel === "Low" ? "success" : "danger"
                }`}
              />
            </div>
            <h6 className="text-muted mb-2">Threat Level</h6>
            <h4
              className={`text-${
                securityData?.threatLevel === "Low" ? "success" : "danger"
              }`}
            >
              {securityData?.threatLevel}
            </h4>
          </Card.Body>
        </Card>
      </Col>

      <Col lg={3} md={6} className="mb-4">
        <Card className="h-100 border-0 shadow-sm">
          <Card.Body className="text-center">
            <div className="mb-3">
              <FontAwesomeIcon
                icon={faExclamationTriangle}
                size="2x"
                className="text-warning"
              />
            </div>
            <h6 className="text-muted mb-2">Active Threats</h6>
            <h4 className="text-warning">{securityData?.activeThreats}</h4>
          </Card.Body>
        </Card>
      </Col>

      <Col lg={3} md={6} className="mb-4">
        <Card className="h-100 border-0 shadow-sm">
          <Card.Body className="text-center">
            <div className="mb-3">
              <FontAwesomeIcon icon={faBan} size="2x" className="text-danger" />
            </div>
            <h6 className="text-muted mb-2">Blocked IPs</h6>
            <h4 className="text-danger">{securityData?.blockedIPs}</h4>
          </Card.Body>
        </Card>
      </Col>

      <Col lg={3} md={6} className="mb-4">
        <Card className="h-100 border-0 shadow-sm">
          <Card.Body className="text-center">
            <div className="mb-3">
              <FontAwesomeIcon
                icon={faChartLine}
                size="2x"
                className="text-info"
              />
            </div>
            <h6 className="text-muted mb-2">Security Score</h6>
            <h4 className="text-info">{securityData?.securityScore}%</h4>
          </Card.Body>
        </Card>
      </Col>

      <Col lg={6} className="mb-4">
        <Card className="h-100 border-0 shadow-sm">
          <Card.Header className="bg-transparent">
            <h6 className="mb-0">
              <FontAwesomeIcon icon={faHistory} className="me-2" />
              Recent Security Events
            </h6>
          </Card.Header>
          <Card.Body>
            {securityLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="d-flex align-items-center mb-3">
                <div
                  className={`rounded-circle me-3 p-2 bg-${
                    log.severity === "high"
                      ? "danger"
                      : log.severity === "medium"
                      ? "warning"
                      : "success"
                  }`}
                  style={{width: "8px", height: "8px"}}
                ></div>
                <div className="flex-grow-1">
                  <div className="fw-medium small">{log.message}</div>
                  <small className="text-muted">
                    {log.timestamp.toLocaleString()} - {log.ip}
                  </small>
                </div>
              </div>
            ))}
          </Card.Body>
        </Card>
      </Col>

      <Col lg={6} className="mb-4">
        <Card className="h-100 border-0 shadow-sm">
          <Card.Header className="bg-transparent">
            <h6 className="mb-0">
              <FontAwesomeIcon icon={faUserShield} className="me-2" />
              Active User Sessions
            </h6>
          </Card.Header>
          <Card.Body>
            {activeUsers.map((user) => (
              <div
                key={user.id}
                className="d-flex align-items-center justify-content-between mb-3"
              >
                <div>
                  <div className="fw-medium">{user.name}</div>
                  <small className="text-muted">
                    {user.location} - {user.sessionDuration}
                  </small>
                </div>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleForceLogout(user.id)}
                >
                  Force Logout
                </Button>
              </div>
            ))}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  const LoginAttemptsTab = () => (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-transparent">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Login Attempts</h6>
          <div className="d-flex gap-2">
            <InputGroup style={{width: "300px"}}>
              <InputGroup.Text>
                <FontAwesomeIcon icon={faSearch} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search by email or IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
            <Button variant="outline-primary">
              <FontAwesomeIcon icon={faDownload} className="me-2" />
              Export
            </Button>
          </div>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        <div className="table-responsive">
          <Table hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Email</th>
                <th>IP Address</th>
                <th>Status</th>
                <th>Location</th>
                <th>Time</th>
                <th>User Agent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loginAttempts.map((attempt) => (
                <tr key={attempt.id}>
                  <td className="fw-medium">{attempt.email}</td>
                  <td>
                    <code>{attempt.ip}</code>
                  </td>
                  <td>
                    <Badge
                      bg={attempt.status === "success" ? "success" : "danger"}
                    >
                      {attempt.status}
                    </Badge>
                  </td>
                  <td>{attempt.location}</td>
                  <td>
                    <small>{attempt.timestamp.toLocaleString()}</small>
                  </td>
                  <td>
                    <small className="text-muted">{attempt.userAgent}</small>
                  </td>
                  <td>
                    {attempt.status === "failed" && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleBlockIP(attempt.ip)}
                      >
                        Block IP
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );

  const SecurityLogsTab = () => (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-transparent">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Security Logs</h6>
          <Button variant="outline-primary">
            <FontAwesomeIcon icon={faDownload} className="me-2" />
            Export Logs
          </Button>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        <div className="table-responsive">
          <Table hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Type</th>
                <th>Severity</th>
                <th>Message</th>
                <th>IP Address</th>
                <th>Time</th>
                <th>Action Taken</th>
              </tr>
            </thead>
            <tbody>
              {securityLogs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <Badge bg="info">{log.type.replace("_", " ")}</Badge>
                  </td>
                  <td>
                    <Badge
                      bg={
                        log.severity === "high"
                          ? "danger"
                          : log.severity === "medium"
                          ? "warning"
                          : "success"
                      }
                    >
                      {log.severity}
                    </Badge>
                  </td>
                  <td className="fw-medium">{log.message}</td>
                  <td>
                    <code>{log.ip}</code>
                  </td>
                  <td>
                    <small>{log.timestamp.toLocaleString()}</small>
                  </td>
                  <td>
                    <small className="text-muted">{log.action}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );

  const ActiveSessionsTab = () => (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-transparent">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Active User Sessions</h6>
          <Badge bg="success">{activeUsers.length} Active</Badge>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        <div className="table-responsive">
          <Table hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>User</th>
                <th>IP Address</th>
                <th>Location</th>
                <th>Session Duration</th>
                <th>Last Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div>
                      <div className="fw-medium">{user.name}</div>
                      <small className="text-muted">{user.email}</small>
                    </div>
                  </td>
                  <td>
                    <code>{user.ip}</code>
                  </td>
                  <td>{user.location}</td>
                  <td>
                    <Badge bg="info">{user.sessionDuration}</Badge>
                  </td>
                  <td>
                    <small>{user.lastActivity.toLocaleString()}</small>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button
                        variant="outline-warning"
                        size="sm"
                        title="View Details"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleForceLogout(user.id)}
                        title="Force Logout"
                      >
                        <FontAwesomeIcon icon={faBan} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" size="lg" />
        <h5 className="mt-3 text-muted">Loading security data...</h5>
      </div>
    );
  }

  return (
    <div className="security-management">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">Security Management</h4>
          <p className="text-muted mb-0">Monitor and manage system security</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-warning">
            <FontAwesomeIcon icon={faServer} className="me-2" />
            Run Security Scan
          </Button>
          <Button variant="outline-primary">
            <FontAwesomeIcon icon={faDownload} className="me-2" />
            Security Report
          </Button>
        </div>
      </div>

      {/* Security Alert */}
      {securityData?.activeThreats > 0 && (
        <Alert variant="warning" className="mb-4">
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          <strong>Security Alert:</strong> {securityData.activeThreats} active
          threats detected. Please review security logs for more details.
        </Alert>
      )}

      {/* Tabs */}
      <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
        <Nav variant="tabs" className="mb-4">
          <Nav.Item>
            <Nav.Link eventKey="overview">
              <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
              Overview
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="login-attempts">
              <FontAwesomeIcon icon={faKey} className="me-2" />
              Login Attempts
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="security-logs">
              <FontAwesomeIcon icon={faHistory} className="me-2" />
              Security Logs
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="active-sessions">
              <FontAwesomeIcon icon={faUserShield} className="me-2" />
              Active Sessions
            </Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="overview">
            <SecurityOverview />
          </Tab.Pane>
          <Tab.Pane eventKey="login-attempts">
            <LoginAttemptsTab />
          </Tab.Pane>
          <Tab.Pane eventKey="security-logs">
            <SecurityLogsTab />
          </Tab.Pane>
          <Tab.Pane eventKey="active-sessions">
            <ActiveSessionsTab />
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </div>
  );
}

export default SecurityManagement;
