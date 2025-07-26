import React, {useState, useEffect} from "react";
import {
  Modal,
  Button,
  Row,
  Col,
  Card,
  Badge,
  Nav,
  Alert,
  Spinner,
  Table,
  ProgressBar,
  ListGroup,
  Image,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faUserTie,
  faEdit,
  faTrash,
  faTimes,
  faPhone,
  faEnvelope,
  faMapMarkerAlt,
  faCalendarAlt,
  faIdCard,
  faBriefcase,
  faGraduationCap,
  faFileAlt,
  faCheckCircle,
  faTimesCircle,
  faClock,
  faChartLine,
  faUsers,
  faTasks,
  faAward,
  faExclamationTriangle,
  faInfoCircle,
  faHistory,
  faUndo,
  faMoneyBillWave,
  faBuilding,
  faUserCheck,
  faStar,
} from "@fortawesome/free-solid-svg-icons";

// ✅ Import Services
import staffService from "../../../services/staffService";

function StaffView({
  show = false,
  onHide,
  onEdit,
  onDelete,
  onRestore,
  staff = null,
  addToast,
  isDeletedView = false,
}) {
  // ✅ Local State
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [detailedStaff, setDetailedStaff] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [tasksData, setTasksData] = useState([]);
  const [documentsData, setDocumentsData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);

  // ✅ Fetch Detailed Staff Information
  useEffect(() => {
    if (show && staff && (staff.id || staff._id)) {
      fetchStaffDetails();
    }

    // Reset tab when modal opens
    if (show) {
      setActiveTab("overview");
    }
  }, [show, staff]);

  const fetchStaffDetails = async () => {
    try {
      setLoading(true);
      const staffId = staff.id || staff._id;

      // Fetch detailed staff info
      const response = await staffService.getStaffById(staffId);
      if (response && response.success) {
        setDetailedStaff(response.data);
      }

      // Fetch additional data if not deleted
      if (!isDeletedView) {
        try {
          // Fetch performance data
          const perfResponse = await staffService.getStaffPerformance?.(
            staffId
          );
          if (perfResponse && perfResponse.success) {
            setPerformanceData(perfResponse.data);
          }
        } catch (error) {
          console.log("Performance data not available:", error);
        }

        try {
          // Fetch tasks
          const tasksResponse = await staffService.getStaffTasks?.(staffId);
          if (tasksResponse && tasksResponse.success) {
            setTasksData(tasksResponse.data || []);
          }
        } catch (error) {
          console.log("Tasks data not available:", error);
        }

        try {
          // Fetch documents
          const docsResponse = await staffService.getStaffDocuments?.(staffId);
          if (docsResponse && docsResponse.success) {
            setDocumentsData(docsResponse.data || []);
          }
        } catch (error) {
          console.log("Documents data not available:", error);
        }

        try {
          // Fetch attendance
          const attendanceResponse = await staffService.getStaffAttendance?.(
            staffId
          );
          if (attendanceResponse && attendanceResponse.success) {
            setAttendanceData(attendanceResponse.data || []);
          }
        } catch (error) {
          console.log("Attendance data not available:", error);
        }
      }
    } catch (error) {
      console.error("Error fetching staff details:", error);
      addToast?.("Error loading staff details: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Modal Close
  const handleClose = () => {
    setActiveTab("overview");
    setDetailedStaff(null);
    setPerformanceData(null);
    setTasksData([]);
    setDocumentsData([]);
    setAttendanceData([]);
    onHide();
  };

  // ✅ Handle Actions
  const handleEdit = () => {
    if (onEdit && staff) {
      onEdit(staff);
      handleClose();
    }
  };

  const handleDelete = () => {
    if (onDelete && staff) {
      onDelete(staff);
      handleClose();
    }
  };

  const handleRestore = () => {
    if (onRestore && staff) {
      onRestore(staff);
      handleClose();
    }
  };

  // ✅ Utility Functions
  const getStatusBadge = (status) => {
    if (isDeletedView) {
      return (
        <Badge bg="danger" className="fs-6">
          Deleted
        </Badge>
      );
    }

    switch (status?.toLowerCase()) {
      case "active":
        return (
          <Badge bg="success" className="fs-6">
            Active
          </Badge>
        );
      case "inactive":
        return (
          <Badge bg="warning" className="fs-6">
            Inactive
          </Badge>
        );
      case "terminated":
        return (
          <Badge bg="danger" className="fs-6">
            Terminated
          </Badge>
        );
      case "on-leave":
        return (
          <Badge bg="info" className="fs-6">
            On Leave
          </Badge>
        );
      case "suspended":
        return (
          <Badge bg="secondary" className="fs-6">
            Suspended
          </Badge>
        );
      default:
        return (
          <Badge bg="secondary" className="fs-6">
            {status || "Unknown"}
          </Badge>
        );
    }
  };

  const getRoleBadge = (role) => {
    switch (role?.toLowerCase()) {
      case "manager":
        return (
          <Badge bg="primary" className="fs-6">
            Manager
          </Badge>
        );
      case "admin":
        return (
          <Badge bg="danger" className="fs-6">
            Admin
          </Badge>
        );
      case "cashier":
        return (
          <Badge bg="success" className="fs-6">
            Cashier
          </Badge>
        );
      case "salesperson":
      case "sales":
        return (
          <Badge bg="info" className="fs-6">
            Sales
          </Badge>
        );
      case "accountant":
        return (
          <Badge bg="warning" className="fs-6">
            Accountant
          </Badge>
        );
      case "supervisor":
        return (
          <Badge bg="dark" className="fs-6">
            Supervisor
          </Badge>
        );
      case "inventory":
        return (
          <Badge bg="secondary" className="fs-6">
            Inventory
          </Badge>
        );
      default:
        return (
          <Badge bg="secondary" className="fs-6">
            {role || "Staff"}
          </Badge>
        );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // ✅ Use staff data or detailed staff data
  const currentStaff = detailedStaff || staff;

  if (!currentStaff) {
    return null;
  }

  // ✅ Overview Tab Content
  const renderOverviewTab = () => (
    <Row className="g-4">
      {/* Personal Information */}
      <Col md={6}>
        <Card className="h-100" style={{borderRadius: "0"}}>
          <Card.Header className="bg-light">
            <h6 className="mb-0">
              <FontAwesomeIcon icon={faUserTie} className="me-2" />
              Personal Information
            </h6>
          </Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col xs={12}>
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon
                    icon={faIdCard}
                    className="text-muted me-2"
                  />
                  <div>
                    <small className="text-muted">Employee ID</small>
                    <div className="fw-medium">
                      {currentStaff.employeeId || "Not Assigned"}
                    </div>
                  </div>
                </div>
              </Col>
              <Col xs={12}>
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon icon={faPhone} className="text-muted me-2" />
                  <div>
                    <small className="text-muted">Phone</small>
                    <div className="fw-medium">
                      {currentStaff.phone ||
                        currentStaff.phoneNumber ||
                        currentStaff.mobileNumbers?.[0] ||
                        "Not Provided"}
                    </div>
                  </div>
                </div>
              </Col>
              <Col xs={12}>
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon
                    icon={faEnvelope}
                    className="text-muted me-2"
                  />
                  <div>
                    <small className="text-muted">Email</small>
                    <div className="fw-medium">
                      {currentStaff.email || "Not Provided"}
                    </div>
                  </div>
                </div>
              </Col>
              <Col xs={12}>
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon
                    icon={faMapMarkerAlt}
                    className="text-muted me-2"
                  />
                  <div>
                    <small className="text-muted">Address</small>
                    <div className="fw-medium">
                      {currentStaff.address?.street &&
                      currentStaff.address?.city
                        ? `${currentStaff.address.street}, ${currentStaff.address.city}`
                        : currentStaff.address || "Not Provided"}
                    </div>
                  </div>
                </div>
              </Col>
              <Col xs={12}>
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon
                    icon={faCalendarAlt}
                    className="text-muted me-2"
                  />
                  <div>
                    <small className="text-muted">Date of Birth</small>
                    <div className="fw-medium">
                      {formatDate(currentStaff.dateOfBirth)}
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Col>

      {/* Employment Information */}
      <Col md={6}>
        <Card className="h-100" style={{borderRadius: "0"}}>
          <Card.Header className="bg-light">
            <h6 className="mb-0">
              <FontAwesomeIcon icon={faBriefcase} className="me-2" />
              Employment Information
            </h6>
          </Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col xs={12}>
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon
                    icon={faUserCheck}
                    className="text-muted me-2"
                  />
                  <div>
                    <small className="text-muted">Role</small>
                    <div>{getRoleBadge(currentStaff.role)}</div>
                  </div>
                </div>
              </Col>
              <Col xs={12}>
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon
                    icon={faCalendarAlt}
                    className="text-muted me-2"
                  />
                  <div>
                    <small className="text-muted">Join Date</small>
                    <div className="fw-medium">
                      {formatDate(
                        currentStaff.joinDate ||
                          currentStaff.dateJoined ||
                          currentStaff.employment?.joinDate
                      )}
                    </div>
                  </div>
                </div>
              </Col>
              <Col xs={12}>
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon
                    icon={faMoneyBillWave}
                    className="text-muted me-2"
                  />
                  <div>
                    <small className="text-muted">Salary</small>
                    <div className="fw-medium">
                      {formatCurrency(
                        currentStaff.salary || currentStaff.employment?.salary
                      )}
                    </div>
                  </div>
                </div>
              </Col>
              <Col xs={12}>
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon
                    icon={faBuilding}
                    className="text-muted me-2"
                  />
                  <div>
                    <small className="text-muted">Department</small>
                    <div className="fw-medium">
                      {currentStaff.department ||
                        currentStaff.employment?.department ||
                        "Not Assigned"}
                    </div>
                  </div>
                </div>
              </Col>
              <Col xs={12}>
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon icon={faUsers} className="text-muted me-2" />
                  <div>
                    <small className="text-muted">Manager</small>
                    <div className="fw-medium">
                      {currentStaff.manager?.name ||
                        currentStaff.employment?.manager ||
                        "No Manager Assigned"}
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Col>

      {/* Additional Information */}
      {(currentStaff.education ||
        currentStaff.skills ||
        currentStaff.certifications) && (
        <Col xs={12}>
          <Card style={{borderRadius: "0"}}>
            <Card.Header className="bg-light">
              <h6 className="mb-0">
                <FontAwesomeIcon icon={faGraduationCap} className="me-2" />
                Additional Information
              </h6>
            </Card.Header>
            <Card.Body>
              <Row className="g-4">
                {currentStaff.education && (
                  <Col md={4}>
                    <h6 className="text-muted mb-2">Education</h6>
                    <div className="fw-medium">{currentStaff.education}</div>
                  </Col>
                )}
                {currentStaff.skills && (
                  <Col md={4}>
                    <h6 className="text-muted mb-2">Skills</h6>
                    <div>
                      {Array.isArray(currentStaff.skills) ? (
                        currentStaff.skills.map((skill, index) => (
                          <Badge
                            key={index}
                            bg="light"
                            text="dark"
                            className="me-1 mb-1"
                          >
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <div className="fw-medium">{currentStaff.skills}</div>
                      )}
                    </div>
                  </Col>
                )}
                {currentStaff.certifications && (
                  <Col md={4}>
                    <h6 className="text-muted mb-2">Certifications</h6>
                    <div>
                      {Array.isArray(currentStaff.certifications) ? (
                        currentStaff.certifications.map((cert, index) => (
                          <Badge key={index} bg="primary" className="me-1 mb-1">
                            {cert}
                          </Badge>
                        ))
                      ) : (
                        <div className="fw-medium">
                          {currentStaff.certifications}
                        </div>
                      )}
                    </div>
                  </Col>
                )}
              </Row>
            </Card.Body>
          </Card>
        </Col>
      )}

      {/* Deletion Information (for deleted staff) */}
      {isDeletedView && (
        <Col xs={12}>
          <Alert variant="danger" style={{borderRadius: "0"}}>
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            <strong>Staff Member Deleted</strong>
            <div className="mt-2">
              <Row>
                <Col md={6}>
                  <small className="text-muted">Deleted On:</small>
                  <div>{formatDate(currentStaff.deletedAt)}</div>
                </Col>
                {currentStaff.deletedBy && (
                  <Col md={6}>
                    <small className="text-muted">Deleted By:</small>
                    <div>
                      {currentStaff.deletedBy.name || currentStaff.deletedBy}
                    </div>
                  </Col>
                )}
                {currentStaff.deletionReason && (
                  <Col xs={12} className="mt-2">
                    <small className="text-muted">Reason:</small>
                    <div>{currentStaff.deletionReason}</div>
                  </Col>
                )}
              </Row>
            </div>
          </Alert>
        </Col>
      )}
    </Row>
  );

  // ✅ Performance Tab Content
  const renderPerformanceTab = () => (
    <Row className="g-4">
      {performanceData ? (
        <>
          <Col md={6}>
            <Card style={{borderRadius: "0"}}>
              <Card.Header className="bg-light">
                <h6 className="mb-0">
                  <FontAwesomeIcon icon={faChartLine} className="me-2" />
                  Performance Metrics
                </h6>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <small>Overall Rating</small>
                    <small>{performanceData.overallRating || 0}/5</small>
                  </div>
                  <ProgressBar
                    now={(performanceData.overallRating || 0) * 20}
                    variant="success"
                    style={{height: "8px"}}
                  />
                </div>
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <small>Task Completion</small>
                    <small>{performanceData.taskCompletion || 0}%</small>
                  </div>
                  <ProgressBar
                    now={performanceData.taskCompletion || 0}
                    variant="info"
                    style={{height: "8px"}}
                  />
                </div>
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <small>Attendance</small>
                    <small>{performanceData.attendance || 0}%</small>
                  </div>
                  <ProgressBar
                    now={performanceData.attendance || 0}
                    variant="warning"
                    style={{height: "8px"}}
                  />
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6}>
            <Card style={{borderRadius: "0"}}>
              <Card.Header className="bg-light">
                <h6 className="mb-0">
                  <FontAwesomeIcon icon={faAward} className="me-2" />
                  Achievements
                </h6>
              </Card.Header>
              <Card.Body>
                {performanceData.achievements &&
                performanceData.achievements.length > 0 ? (
                  <ListGroup variant="flush">
                    {performanceData.achievements.map((achievement, index) => (
                      <ListGroup.Item
                        key={index}
                        className="d-flex align-items-center px-0"
                      >
                        <FontAwesomeIcon
                          icon={faStar}
                          className="text-warning me-2"
                        />
                        <div>
                          <div className="fw-medium">{achievement.title}</div>
                          <small className="text-muted">
                            {formatDate(achievement.date)}
                          </small>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                ) : (
                  <div className="text-center text-muted py-3">
                    <FontAwesomeIcon icon={faInfoCircle} className="mb-2" />
                    <div>No achievements recorded</div>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </>
      ) : (
        <Col xs={12}>
          <div className="text-center text-muted py-5">
            <FontAwesomeIcon icon={faChartLine} size="3x" className="mb-3" />
            <h6>Performance Data Not Available</h6>
            <p>Performance tracking is not enabled for this staff member.</p>
          </div>
        </Col>
      )}
    </Row>
  );

  // ✅ Tasks Tab Content
  const renderTasksTab = () => (
    <Row>
      <Col xs={12}>
        {tasksData && tasksData.length > 0 ? (
          <Card style={{borderRadius: "0"}}>
            <Card.Header className="bg-light">
              <h6 className="mb-0">
                <FontAwesomeIcon icon={faTasks} className="me-2" />
                Recent Tasks
              </h6>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Due Date</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {tasksData.map((task, index) => (
                    <tr key={index}>
                      <td>
                        <div className="fw-medium">{task.title}</div>
                        <small className="text-muted">{task.description}</small>
                      </td>
                      <td>
                        <Badge
                          bg={
                            task.status === "completed"
                              ? "success"
                              : task.status === "in-progress"
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {task.status}
                        </Badge>
                      </td>
                      <td>
                        <Badge
                          bg={
                            task.priority === "high"
                              ? "danger"
                              : task.priority === "medium"
                              ? "warning"
                              : "info"
                          }
                        >
                          {task.priority}
                        </Badge>
                      </td>
                      <td>{formatDate(task.dueDate)}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <ProgressBar
                            now={task.progress || 0}
                            style={{width: "60px", height: "6px"}}
                            className="me-2"
                          />
                          <small>{task.progress || 0}%</small>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        ) : (
          <div className="text-center text-muted py-5">
            <FontAwesomeIcon icon={faTasks} size="3x" className="mb-3" />
            <h6>No Tasks Assigned</h6>
            <p>This staff member has no active tasks.</p>
          </div>
        )}
      </Col>
    </Row>
  );

  // ✅ Documents Tab Content
  const renderDocumentsTab = () => (
    <Row>
      <Col xs={12}>
        {documentsData && documentsData.length > 0 ? (
          <Card style={{borderRadius: "0"}}>
            <Card.Header className="bg-light">
              <h6 className="mb-0">
                <FontAwesomeIcon icon={faFileAlt} className="me-2" />
                Documents
              </h6>
            </Card.Header>
            <Card.Body className="p-0">
              <ListGroup variant="flush">
                {documentsData.map((doc, index) => (
                  <ListGroup.Item
                    key={index}
                    className="d-flex justify-content-between align-items-center"
                  >
                    <div className="d-flex align-items-center">
                      <FontAwesomeIcon
                        icon={faFileAlt}
                        className="text-muted me-3"
                      />
                      <div>
                        <div className="fw-medium">{doc.name}</div>
                        <small className="text-muted">
                          {doc.type} • {formatDate(doc.uploadDate)}
                        </small>
                      </div>
                    </div>
                    <Button variant="outline-primary" size="sm">
                      View
                    </Button>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>
        ) : (
          <div className="text-center text-muted py-5">
            <FontAwesomeIcon icon={faFileAlt} size="3x" className="mb-3" />
            <h6>No Documents</h6>
            <p>No documents have been uploaded for this staff member.</p>
          </div>
        )}
      </Col>
    </Row>
  );

  // ✅ FIXED: Render Tab Content Based on Active Tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return renderOverviewTab();
      case "performance":
        return renderPerformanceTab();
      case "tasks":
        return renderTasksTab();
      case "documents":
        return renderDocumentsTab();
      case "activity":
        return (
          <div className="text-center text-muted py-5">
            <FontAwesomeIcon icon={faHistory} size="3x" className="mb-3" />
            <h6>Activity Log</h6>
            <p>Activity tracking coming soon...</p>
          </div>
        );
      default:
        return renderOverviewTab();
    }
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="xl"
      centered
      backdrop="static"
    >
      <Modal.Header style={{borderRadius: "0"}}>
        <div className="d-flex align-items-center w-100">
          {/* Staff Avatar and Basic Info */}
          <div className="d-flex align-items-center flex-grow-1">
            <div className="me-3">
              {currentStaff.avatar || currentStaff.profilePicture ? (
                <Image
                  src={currentStaff.avatar || currentStaff.profilePicture}
                  alt={currentStaff.name}
                  width="60"
                  height="60"
                  className="rounded-circle"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              ) : (
                <div
                  className="bg-light text-primary d-flex align-items-center justify-content-center rounded-circle"
                  style={{width: "60px", height: "60px"}}
                >
                  <FontAwesomeIcon icon={faUserTie} size="lg" />
                </div>
              )}
            </div>
            <div>
              <h5 className="mb-1">{currentStaff.name}</h5>
              <div className="d-flex align-items-center gap-2">
                {getRoleBadge(currentStaff.role)}
                {getStatusBadge(currentStaff.status)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="d-flex gap-2 me-3">
            {isDeletedView ? (
              <Button
                variant="success"
                size="sm"
                onClick={handleRestore}
                title="Restore Staff"
                style={{borderRadius: "0"}}
              >
                <FontAwesomeIcon icon={faUndo} className="me-1" />
                Restore
              </Button>
            ) : (
              <>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={handleEdit}
                  title="Edit Staff"
                  style={{borderRadius: "0"}}
                >
                  <FontAwesomeIcon icon={faEdit} className="me-1" />
                  Edit
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={handleDelete}
                  title="Delete Staff"
                  style={{borderRadius: "0"}}
                >
                  <FontAwesomeIcon icon={faTrash} className="me-1" />
                  Delete
                </Button>
              </>
            )}
          </div>

          {/* Close Button */}
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={handleClose}
            title="Close"
            style={{borderRadius: "0"}}
          >
            <FontAwesomeIcon icon={faTimes} />
          </Button>
        </div>
      </Modal.Header>

      <Modal.Body
        style={{borderRadius: "0", maxHeight: "70vh", overflowY: "auto"}}
      >
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" className="mb-3" />
            <h6 className="text-muted">Loading staff details...</h6>
          </div>
        ) : (
          <>
            {/* ✅ FIXED: Use Nav.Tabs instead of Tabs component */}
            <Nav variant="tabs" className="mb-4">
              <Nav.Item>
                <Nav.Link
                  active={activeTab === "overview"}
                  onClick={() => setActiveTab("overview")}
                  style={{cursor: "pointer"}}
                >
                  <FontAwesomeIcon icon={faInfoCircle} className="me-1" />
                  Overview
                </Nav.Link>
              </Nav.Item>

              {!isDeletedView && (
                <>
                  <Nav.Item>
                    <Nav.Link
                      active={activeTab === "performance"}
                      onClick={() => setActiveTab("performance")}
                      style={{cursor: "pointer"}}
                    >
                      <FontAwesomeIcon icon={faChartLine} className="me-1" />
                      Performance
                    </Nav.Link>
                  </Nav.Item>

                  <Nav.Item>
                    <Nav.Link
                      active={activeTab === "tasks"}
                      onClick={() => setActiveTab("tasks")}
                      style={{cursor: "pointer"}}
                    >
                      <FontAwesomeIcon icon={faTasks} className="me-1" />
                      Tasks
                    </Nav.Link>
                  </Nav.Item>

                  <Nav.Item>
                    <Nav.Link
                      active={activeTab === "documents"}
                      onClick={() => setActiveTab("documents")}
                      style={{cursor: "pointer"}}
                    >
                      <FontAwesomeIcon icon={faFileAlt} className="me-1" />
                      Documents
                    </Nav.Link>
                  </Nav.Item>
                </>
              )}

              {currentStaff.activity && (
                <Nav.Item>
                  <Nav.Link
                    active={activeTab === "activity"}
                    onClick={() => setActiveTab("activity")}
                    style={{cursor: "pointer"}}
                  >
                    <FontAwesomeIcon icon={faHistory} className="me-1" />
                    Activity
                  </Nav.Link>
                </Nav.Item>
              )}
            </Nav>

            {/* ✅ FIXED: Render content based on active tab */}
            <div className="tab-content">{renderTabContent()}</div>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}

export default StaffView;
