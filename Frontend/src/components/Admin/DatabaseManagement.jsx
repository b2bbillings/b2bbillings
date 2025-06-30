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
  ProgressBar,
  Tab,
  Nav,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faDatabase,
  faDownload,
  faUpload,
  faTrash,
  faCog,
  faSync,
  faHdd,
  faChartPie,
  faServer,
  faHistory,
  faShieldAlt,
  faPlay,
  faStop,
  faPause,
  faCheck,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";

function DatabaseManagement({adminData, currentUser, addToast}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [dbStats, setDbStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backups, setBackups] = useState([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);

  useEffect(() => {
    loadDatabaseData();
  }, []);

  const loadDatabaseData = async () => {
    try {
      setIsLoading(true);

      // Simulate API calls
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockDbStats = {
        totalSize: "2.4 GB",
        tables: 45,
        records: 156789,
        lastBackup: new Date("2024-06-30T02:00:00"),
        diskUsage: 68,
        performance: "Good",
        connections: 12,
        maxConnections: 100,
        uptime: "15 days, 4 hours",
        version: "MongoDB 6.0.4",
      };

      const mockBackups = [
        {
          id: "1",
          filename: "backup_2024-06-30_02-00-00.db",
          size: "2.4 GB",
          type: "automatic",
          status: "completed",
          createdAt: new Date("2024-06-30T02:00:00"),
          duration: "4m 32s",
        },
        {
          id: "2",
          filename: "backup_2024-06-29_02-00-00.db",
          size: "2.3 GB",
          type: "automatic",
          status: "completed",
          createdAt: new Date("2024-06-29T02:00:00"),
          duration: "4m 28s",
        },
        {
          id: "3",
          filename: "manual_backup_2024-06-28_14-30-00.db",
          size: "2.2 GB",
          type: "manual",
          status: "completed",
          createdAt: new Date("2024-06-28T14:30:00"),
          duration: "3m 45s",
        },
      ];

      setDbStats(mockDbStats);
      setBackups(mockBackups);
    } catch (error) {
      console.error("Error loading database data:", error);
      addToast?.("Failed to load database data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupDatabase = async () => {
    try {
      setIsBackingUp(true);
      setBackupProgress(0);

      // Simulate backup progress
      const interval = setInterval(() => {
        setBackupProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 500);

      await new Promise((resolve) => setTimeout(resolve, 5000));

      const newBackup = {
        id: Date.now().toString(),
        filename: `manual_backup_${
          new Date().toISOString().replace(/:/g, "-").split(".")[0]
        }.db`,
        size: "2.4 GB",
        type: "manual",
        status: "completed",
        createdAt: new Date(),
        duration: "4m 52s",
      };

      setBackups((prev) => [newBackup, ...prev]);
      addToast?.("Database backup completed successfully", "success");
    } catch (error) {
      addToast?.("Failed to create backup", "error");
    } finally {
      setIsBackingUp(false);
      setBackupProgress(0);
    }
  };

  const handleRestoreBackup = async (backup) => {
    if (
      window.confirm(
        `Are you sure you want to restore from backup "${backup.filename}"? This action cannot be undone.`
      )
    ) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        addToast?.("Database restored successfully", "success");
        setShowRestoreModal(false);
        loadDatabaseData();
      } catch (error) {
        addToast?.("Failed to restore backup", "error");
      }
    }
  };

  const handleDeleteBackup = async (backupId) => {
    if (window.confirm("Are you sure you want to delete this backup?")) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setBackups((prev) => prev.filter((b) => b.id !== backupId));
        addToast?.("Backup deleted successfully", "success");
      } catch (error) {
        addToast?.("Failed to delete backup", "error");
      }
    }
  };

  const DatabaseOverview = () => (
    <Row>
      <Col lg={3} md={6} className="mb-4">
        <Card className="h-100 border-0 shadow-sm">
          <Card.Body className="text-center">
            <div className="mb-3">
              <FontAwesomeIcon
                icon={faDatabase}
                size="2x"
                className="text-primary"
              />
            </div>
            <h6 className="text-muted mb-2">Database Size</h6>
            <h4 className="text-primary">{dbStats?.totalSize}</h4>
          </Card.Body>
        </Card>
      </Col>

      <Col lg={3} md={6} className="mb-4">
        <Card className="h-100 border-0 shadow-sm">
          <Card.Body className="text-center">
            <div className="mb-3">
              <FontAwesomeIcon
                icon={faServer}
                size="2x"
                className="text-success"
              />
            </div>
            <h6 className="text-muted mb-2">Tables</h6>
            <h4 className="text-success">{dbStats?.tables}</h4>
          </Card.Body>
        </Card>
      </Col>

      <Col lg={3} md={6} className="mb-4">
        <Card className="h-100 border-0 shadow-sm">
          <Card.Body className="text-center">
            <div className="mb-3">
              <FontAwesomeIcon
                icon={faChartPie}
                size="2x"
                className="text-info"
              />
            </div>
            <h6 className="text-muted mb-2">Total Records</h6>
            <h4 className="text-info">{dbStats?.records?.toLocaleString()}</h4>
          </Card.Body>
        </Card>
      </Col>

      <Col lg={3} md={6} className="mb-4">
        <Card className="h-100 border-0 shadow-sm">
          <Card.Body className="text-center">
            <div className="mb-3">
              <FontAwesomeIcon
                icon={faHdd}
                size="2x"
                className="text-warning"
              />
            </div>
            <h6 className="text-muted mb-2">Disk Usage</h6>
            <h4 className="text-warning">{dbStats?.diskUsage}%</h4>
          </Card.Body>
        </Card>
      </Col>

      <Col lg={6} className="mb-4">
        <Card className="h-100 border-0 shadow-sm">
          <Card.Header className="bg-transparent">
            <h6 className="mb-0">
              <FontAwesomeIcon icon={faServer} className="me-2" />
              Database Performance
            </h6>
          </Card.Header>
          <Card.Body>
            <div className="mb-3">
              <div className="d-flex justify-content-between mb-2">
                <span>CPU Usage</span>
                <span>45%</span>
              </div>
              <ProgressBar variant="info" now={45} />
            </div>

            <div className="mb-3">
              <div className="d-flex justify-content-between mb-2">
                <span>Memory Usage</span>
                <span>67%</span>
              </div>
              <ProgressBar variant="warning" now={67} />
            </div>

            <div className="mb-3">
              <div className="d-flex justify-content-between mb-2">
                <span>Disk I/O</span>
                <span>23%</span>
              </div>
              <ProgressBar variant="success" now={23} />
            </div>

            <div className="row text-center mt-4">
              <div className="col-6">
                <div className="fw-bold text-primary">
                  {dbStats?.connections}
                </div>
                <small className="text-muted">Active Connections</small>
              </div>
              <div className="col-6">
                <div className="fw-bold text-success">{dbStats?.uptime}</div>
                <small className="text-muted">Uptime</small>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Col>

      <Col lg={6} className="mb-4">
        <Card className="h-100 border-0 shadow-sm">
          <Card.Header className="bg-transparent">
            <h6 className="mb-0">
              <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
              Database Information
            </h6>
          </Card.Header>
          <Card.Body>
            <div className="row">
              <div className="col-12 mb-3">
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Version:</span>
                  <span className="fw-bold">{dbStats?.version}</span>
                </div>
              </div>
              <div className="col-12 mb-3">
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Performance:</span>
                  <Badge bg="success">{dbStats?.performance}</Badge>
                </div>
              </div>
              <div className="col-12 mb-3">
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Last Backup:</span>
                  <span className="fw-bold">
                    {dbStats?.lastBackup?.toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="col-12 mb-3">
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Max Connections:</span>
                  <span className="fw-bold">{dbStats?.maxConnections}</span>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Button
                variant="outline-primary"
                className="w-100"
                onClick={() => setShowBackupModal(true)}
              >
                <FontAwesomeIcon icon={faPlay} className="me-2" />
                Create Manual Backup
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  const BackupsTab = () => (
    <Row>
      <Col lg={12}>
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-transparent">
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Database Backups</h6>
              <div className="d-flex gap-2">
                <Button
                  variant="success"
                  onClick={handleBackupDatabase}
                  disabled={isBackingUp}
                >
                  <FontAwesomeIcon
                    icon={isBackingUp ? faSync : faDownload}
                    className={`me-2 ${isBackingUp ? "fa-spin" : ""}`}
                  />
                  {isBackingUp ? "Creating Backup..." : "Create Backup"}
                </Button>
                <Button variant="outline-primary">
                  <FontAwesomeIcon icon={faUpload} className="me-2" />
                  Upload Backup
                </Button>
              </div>
            </div>

            {isBackingUp && (
              <div className="mt-3">
                <div className="d-flex justify-content-between mb-1">
                  <small>Creating backup...</small>
                  <small>{backupProgress}%</small>
                </div>
                <ProgressBar variant="success" now={backupProgress} />
              </div>
            )}
          </Card.Header>

          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Filename</th>
                    <th>Size</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Duration</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => (
                    <tr key={backup.id}>
                      <td className="fw-medium">{backup.filename}</td>
                      <td>{backup.size}</td>
                      <td>
                        <Badge
                          bg={
                            backup.type === "automatic" ? "primary" : "success"
                          }
                        >
                          {backup.type}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg="success">
                          <FontAwesomeIcon icon={faCheck} className="me-1" />
                          {backup.status}
                        </Badge>
                      </td>
                      <td>
                        <small>{backup.createdAt.toLocaleString()}</small>
                      </td>
                      <td>
                        <small className="text-muted">{backup.duration}</small>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => handleRestoreBackup(backup)}
                          >
                            <FontAwesomeIcon icon={faUpload} />
                          </Button>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            title="Download"
                          >
                            <FontAwesomeIcon icon={faDownload} />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteBackup(backup.id)}
                          >
                            <FontAwesomeIcon icon={faTrash} />
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
      </Col>
    </Row>
  );

  const MaintenanceTab = () => (
    <Row>
      <Col lg={12}>
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-transparent">
            <h6 className="mb-0">
              <FontAwesomeIcon icon={faCog} className="me-2" />
              Database Maintenance
            </h6>
          </Card.Header>
          <Card.Body>
            <Alert variant="warning">
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              <strong>Warning:</strong> Maintenance operations may temporarily
              affect system performance. It's recommended to perform these
              during low-traffic periods.
            </Alert>

            <Row>
              <Col md={6} className="mb-3">
                <Card className="h-100 border">
                  <Card.Body>
                    <h6 className="mb-3">Optimize Database</h6>
                    <p className="text-muted small">
                      Optimize database tables and indexes for better
                      performance.
                    </p>
                    <Button variant="outline-primary" className="w-100">
                      <FontAwesomeIcon icon={faPlay} className="me-2" />
                      Run Optimization
                    </Button>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6} className="mb-3">
                <Card className="h-100 border">
                  <Card.Body>
                    <h6 className="mb-3">Repair Database</h6>
                    <p className="text-muted small">
                      Check and repair database integrity issues.
                    </p>
                    <Button variant="outline-warning" className="w-100">
                      <FontAwesomeIcon icon={faPlay} className="me-2" />
                      Run Repair
                    </Button>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6} className="mb-3">
                <Card className="h-100 border">
                  <Card.Body>
                    <h6 className="mb-3">Clean Logs</h6>
                    <p className="text-muted small">
                      Remove old log files to free up disk space.
                    </p>
                    <Button variant="outline-info" className="w-100">
                      <FontAwesomeIcon icon={faPlay} className="me-2" />
                      Clean Logs
                    </Button>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6} className="mb-3">
                <Card className="h-100 border">
                  <Card.Body>
                    <h6 className="mb-3">Update Statistics</h6>
                    <p className="text-muted small">
                      Update database statistics for query optimization.
                    </p>
                    <Button variant="outline-success" className="w-100">
                      <FontAwesomeIcon icon={faPlay} className="me-2" />
                      Update Stats
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" size="lg" />
        <h5 className="mt-3 text-muted">Loading database information...</h5>
      </div>
    );
  }

  return (
    <div className="database-management">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">Database Management</h4>
          <p className="text-muted mb-0">
            Monitor and manage database operations
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-warning">
            <FontAwesomeIcon icon={faSync} className="me-2" />
            Refresh Stats
          </Button>
          <Button variant="outline-primary">
            <FontAwesomeIcon icon={faDownload} className="me-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
        <Nav variant="tabs" className="mb-4">
          <Nav.Item>
            <Nav.Link eventKey="overview">
              <FontAwesomeIcon icon={faDatabase} className="me-2" />
              Overview
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="backups">
              <FontAwesomeIcon icon={faDownload} className="me-2" />
              Backups
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="maintenance">
              <FontAwesomeIcon icon={faCog} className="me-2" />
              Maintenance
            </Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="overview">
            <DatabaseOverview />
          </Tab.Pane>
          <Tab.Pane eventKey="backups">
            <BackupsTab />
          </Tab.Pane>
          <Tab.Pane eventKey="maintenance">
            <MaintenanceTab />
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      {/* Backup Confirmation Modal */}
      <Modal
        show={showBackupModal}
        onHide={() => setShowBackupModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Create Database Backup</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to create a manual backup of the database?
          </p>
          <p className="text-muted small">
            This process may take several minutes depending on the database
            size.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBackupModal(false)}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={() => {
              setShowBackupModal(false);
              handleBackupDatabase();
            }}
          >
            Create Backup
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default DatabaseManagement;
