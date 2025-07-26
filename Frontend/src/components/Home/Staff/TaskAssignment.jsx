import React, {useState, useEffect} from "react";
import {
  Modal,
  Form,
  Button,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Badge,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faEdit,
  faPaperPlane,
  faUserCheck,
  faBell,
  faCalendarDay,
  faClock,
  faUserTag,
  faUser,
  faTasks,
  faFileAlt,
  faEnvelope,
  faRedo,
  faFlag,
  faCheckCircle,
  faPhoneAlt,
  faBullhorn,
  faTools,
  faBriefcase,
  faMoneyCheckAlt,
  faStore,
  faTimes,
  faExclamationTriangle,
  faRefresh,
} from "@fortawesome/free-solid-svg-icons";
import taskService from "../../../services/taskService";
import staffService from "../../../services/staffService";

function TaskAssignment({
  show,
  onHide,
  onTaskCreated,
  editTask = null,
  companyData,
  userData,
}) {
  // State management
  const [formData, setFormData] = useState({
    assignedTo: "",
    taskType: "",
    customer: "",
    title: "",
    description: "",
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    priority: "medium",
    reminder: {
      enabled: true,
      reminderTime: "09:00",
      frequency: "once",
      notificationMethods: {
        email: true,
        sms: true,
        app: false,
        whatsapp: false,
      },
    },
    estimatedDuration: "",
    tags: [],
  });

  // ✅ Initialize as empty array to prevent map error
  const [staffMembers, setStaffMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentTag, setCurrentTag] = useState("");
  // ✅ Add staff loading error state
  const [staffError, setStaffError] = useState(null);

  // Modal mode
  const isEditMode = editTask !== null;

  // Load staff members on component mount
  useEffect(() => {
    if (show) {
      loadStaffMembers();
    }
  }, [show]);

  // Populate form when editing
  useEffect(() => {
    if (editTask) {
      populateEditForm(editTask);
    } else {
      resetForm();
    }
  }, [editTask]);

  // ✅ Enhanced load staff members with better error handling
  const loadStaffMembers = async () => {
    try {
      setIsLoading(true);
      setStaffError(null); // Clear previous errors

      const response = await staffService.getAllStaff({
        page: 1,
        limit: 100,
        status: "active",
      });

      if (response && response.success) {
        // ✅ Fix: Access the nested data array
        const staffData = Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
          ? response.data
          : [];

        setStaffMembers(staffData);
      } else {
        setStaffMembers([]);
        setStaffError("Could not load staff members. Please try again.");
      }
    } catch (error) {
      setStaffMembers([]);
      setStaffError(
        "Failed to load staff members. Please check your connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Populate form for editing
  const populateEditForm = (task) => {
    setFormData({
      assignedTo: task.assignedTo?._id || task.assignedTo || "",
      taskType: task.taskType || "",
      customer:
        typeof task.customer === "string"
          ? task.customer
          : task.customer?.name || "",
      title: task.title || "",
      description: task.description || "",
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : "",
      priority: task.priority || "medium",
      reminder: {
        enabled: task.reminder?.enabled !== false,
        reminderTime: task.reminder?.reminderTime || "09:00",
        frequency: task.reminder?.frequency || "once",
        notificationMethods: {
          email: task.reminder?.notificationMethods?.email !== false,
          sms: task.reminder?.notificationMethods?.sms !== false,
          app: task.reminder?.notificationMethods?.app || false,
          whatsapp: task.reminder?.notificationMethods?.whatsapp || false,
        },
      },
      estimatedDuration: task.metrics?.estimatedDuration || "",
      tags: task.tags || [],
    });
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      assignedTo: "",
      taskType: "",
      customer: "",
      title: "",
      description: "",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      priority: "medium",
      reminder: {
        enabled: true,
        reminderTime: "09:00",
        frequency: "once",
        notificationMethods: {
          email: true,
          sms: true,
          app: false,
          whatsapp: false,
        },
      },
      estimatedDuration: "",
      tags: [],
    });
    setErrors({});
    setCurrentTag("");
    setStaffError(null); // ✅ Clear staff errors on reset
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({...prev, [field]: value}));

    // Clear specific error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({...prev, [field]: ""}));
    }
  };

  // Handle nested input changes (for reminder object)
  const handleNestedChange = (parentField, childField, value) => {
    setFormData((prev) => ({
      ...prev,
      [parentField]: {
        ...prev[parentField],
        [childField]: value,
      },
    }));
  };

  // Handle notification method changes
  const handleNotificationChange = (method, checked) => {
    setFormData((prev) => ({
      ...prev,
      reminder: {
        ...prev.reminder,
        notificationMethods: {
          ...prev.reminder.notificationMethods,
          [method]: checked,
        },
      },
    }));
  };

  // Add tag
  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()],
      }));
      setCurrentTag("");
    }
  };

  // Remove tag
  const removeTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.assignedTo)
      newErrors.assignedTo = "Please select a staff member";
    if (!formData.taskType) newErrors.taskType = "Please select a task type";
    if (!formData.customer.trim())
      newErrors.customer = "Customer/Project name is required";
    if (!formData.description.trim())
      newErrors.description = "Task description is required";
    if (formData.description.length < 10)
      newErrors.description = "Description must be at least 10 characters";
    if (!formData.dueDate) newErrors.dueDate = "Due date is required";

    // Validate due date is not in the past
    const dueDate = new Date(formData.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate < today) {
      newErrors.dueDate = "Due date cannot be in the past";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare task data
      const taskData = {
        assignedTo: formData.assignedTo,
        taskType: formData.taskType,
        customer: formData.customer.trim(),
        title:
          formData.title?.trim() ||
          `${formData.taskType}: ${formData.customer.trim()}`,
        description: formData.description.trim(),
        dueDate: new Date(formData.dueDate).toISOString(),
        priority: formData.priority,
        reminder: formData.reminder,
        estimatedDuration: formData.estimatedDuration
          ? parseInt(formData.estimatedDuration)
          : null,
        tags: formData.tags,
      };

      let response;
      if (isEditMode) {
        response = await taskService.updateTask(editTask._id, taskData);
      } else {
        response = await taskService.createTask(taskData);
      }

      if (response.success) {
        onTaskCreated?.(response.data);
        onHide();
        resetForm();
      }
    } catch (error) {
      console.error("Error saving task:", error);
      // Handle specific validation errors from server
      if (error.response?.data?.errors) {
        const serverErrors = {};
        error.response.data.errors.forEach((err) => {
          serverErrors[err.field || "general"] = err.message;
        });
        setErrors(serverErrors);
      } else {
        setErrors({
          general:
            error.response?.data?.message ||
            "Failed to save task. Please try again.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!isSubmitting) {
      onHide();
      resetForm();
    }
  };

  // ✅ Get task types safely with fallback
  const getTaskTypes = () => {
    try {
      return taskService.getTaskTypes() || [];
    } catch (error) {
      console.warn("Could not load task types, using fallback:", error);
      return [
        "Customer Call",
        "Follow-up Call",
        "Customer Survey",
        "Schedule Appointment",
        "Service Appointment",
        "Payment Collection",
        "Marketing Campaign",
        "Store Management",
        "Administrative Task",
        "Lead Generation",
        "Product Demo",
        "Customer Support",
        "Data Entry",
        "Inventory Check",
        "Other",
      ];
    }
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="lg"
      centered
      backdrop="static"
    >
      <Modal.Header closeButton className="modal-header-purple">
        <Modal.Title className="d-flex align-items-center">
          <FontAwesomeIcon
            icon={isEditMode ? faEdit : faPlus}
            className="me-2"
          />
          {isEditMode ? "Edit Task" : "Assign New Task"}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body style={{maxHeight: "70vh", overflowY: "auto"}}>
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-3">
              <Spinner animation="border" variant="primary" size="sm" />
              <span className="ms-2">Loading staff members...</span>
            </div>
          )}

          {/* ✅ Staff Error Alert */}
          {staffError && (
            <Alert
              variant="warning"
              className="mb-3"
              dismissible
              onClose={() => setStaffError(null)}
            >
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              {staffError}
              <div className="mt-2">
                <Button
                  variant="outline-warning"
                  size="sm"
                  onClick={loadStaffMembers}
                >
                  <FontAwesomeIcon icon={faRefresh} className="me-1" />
                  Retry Loading Staff
                </Button>
              </div>
            </Alert>
          )}

          {/* Error Alert */}
          {errors.general && (
            <Alert variant="danger" className="mb-3">
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              {errors.general}
            </Alert>
          )}

          <Row>
            {/* Left Column - Staff & Task Information */}
            <Col lg={6}>
              <Card className="info-card mb-3">
                <Card.Header className="info-header">
                  <FontAwesomeIcon icon={faUserCheck} className="me-2" />
                  Staff & Task Information
                </Card.Header>
                <Card.Body>
                  {/* ✅ Enhanced Staff Member Selection with error handling */}
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label">
                      <FontAwesomeIcon icon={faUser} className="me-2" />
                      Staff Member *
                    </Form.Label>
                    <Form.Select
                      value={formData.assignedTo}
                      onChange={(e) =>
                        handleInputChange("assignedTo", e.target.value)
                      }
                      required
                      className={`form-input ${
                        errors.assignedTo ? "is-invalid" : ""
                      }`}
                      disabled={isLoading}
                    >
                      <option value="">
                        {isLoading
                          ? "Loading staff members..."
                          : staffError
                          ? "Error loading staff members"
                          : "Select staff member"}
                      </option>
                      {Array.isArray(staffMembers) &&
                      staffMembers.length > 0 ? (
                        staffMembers.map((member) => (
                          <option
                            key={member._id || member.id}
                            value={member._id || member.id}
                          >
                            {member.name ||
                              `${member.firstName || ""} ${
                                member.lastName || ""
                              }`.trim() ||
                              "Unknown"}
                            {member.role ? ` - ${member.role}` : ""}
                            {member.employeeId ? ` (${member.employeeId})` : ""}
                          </option>
                        ))
                      ) : !isLoading && !staffError ? (
                        <option disabled>No staff members available</option>
                      ) : null}
                    </Form.Select>
                    {errors.assignedTo && (
                      <div className="invalid-feedback d-block">
                        {errors.assignedTo}
                      </div>
                    )}
                    {/* ✅ Show staff count when loaded successfully */}
                    {Array.isArray(staffMembers) && staffMembers.length > 0 && (
                      <Form.Text className="text-muted">
                        {staffMembers.length} staff member
                        {staffMembers.length !== 1 ? "s" : ""} available
                      </Form.Text>
                    )}
                  </Form.Group>

                  {/* ✅ Enhanced Task Type Selection */}
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label">
                      <FontAwesomeIcon icon={faTasks} className="me-2" />
                      Task Type *
                    </Form.Label>
                    <Form.Select
                      value={formData.taskType}
                      onChange={(e) =>
                        handleInputChange("taskType", e.target.value)
                      }
                      required
                      className={`form-input ${
                        errors.taskType ? "is-invalid" : ""
                      }`}
                    >
                      <option value="">Select task type</option>
                      {getTaskTypes().map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </Form.Select>
                    {errors.taskType && (
                      <div className="invalid-feedback d-block">
                        {errors.taskType}
                      </div>
                    )}
                  </Form.Group>

                  {/* Customer/Project */}
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label">
                      <FontAwesomeIcon icon={faUser} className="me-2" />
                      Customer/Project *
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.customer}
                      onChange={(e) =>
                        handleInputChange("customer", e.target.value)
                      }
                      placeholder="Enter customer or project name"
                      required
                      className={`form-input ${
                        errors.customer ? "is-invalid" : ""
                      }`}
                    />
                    {errors.customer && (
                      <div className="invalid-feedback d-block">
                        {errors.customer}
                      </div>
                    )}
                  </Form.Group>

                  {/* Task Title (Optional) */}
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label">
                      <FontAwesomeIcon icon={faFileAlt} className="me-2" />
                      Task Title (Optional)
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        handleInputChange("title", e.target.value)
                      }
                      placeholder="Will auto-generate if empty"
                      className="form-input"
                    />
                    <Form.Text className="text-muted">
                      Leave empty to auto-generate: "{formData.taskType}:{" "}
                      {formData.customer}"
                    </Form.Text>
                  </Form.Group>

                  {/* Due Date */}
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label">
                      <FontAwesomeIcon icon={faCalendarDay} className="me-2" />
                      Due Date *
                    </Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) =>
                        handleInputChange("dueDate", e.target.value)
                      }
                      required
                      className={`form-input ${
                        errors.dueDate ? "is-invalid" : ""
                      }`}
                    />
                    {errors.dueDate && (
                      <div className="invalid-feedback d-block">
                        {errors.dueDate}
                      </div>
                    )}
                  </Form.Group>

                  {/* Task Description */}
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label">
                      <FontAwesomeIcon icon={faFileAlt} className="me-2" />
                      Task Description *
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={formData.description}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                      placeholder="Provide detailed task description (minimum 10 characters)..."
                      required
                      className={`form-input ${
                        errors.description ? "is-invalid" : ""
                      }`}
                    />
                    <div className="d-flex justify-content-between">
                      {errors.description && (
                        <div className="invalid-feedback d-block">
                          {errors.description}
                        </div>
                      )}
                      <small className="text-muted ms-auto">
                        {formData.description.length}/1000 characters
                      </small>
                    </div>
                  </Form.Group>
                </Card.Body>
              </Card>
            </Col>

            {/* Right Column - Priority & Reminder Settings */}
            <Col lg={6}>
              <Card className="info-card mb-3">
                <Card.Header className="reminder-header">
                  <FontAwesomeIcon icon={faBell} className="me-2" />
                  Priority & Reminder Settings
                </Card.Header>
                <Card.Body>
                  {/* Priority Level */}
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label">
                      <FontAwesomeIcon icon={faFlag} className="me-2" />
                      Priority Level
                    </Form.Label>
                    <Form.Select
                      value={formData.priority}
                      onChange={(e) =>
                        handleInputChange("priority", e.target.value)
                      }
                      className="form-input"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent</option>
                    </Form.Select>
                  </Form.Group>

                  {/* Estimated Duration */}
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label">
                      <FontAwesomeIcon icon={faClock} className="me-2" />
                      Estimated Duration (minutes)
                    </Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      max="1440"
                      value={formData.estimatedDuration}
                      onChange={(e) =>
                        handleInputChange("estimatedDuration", e.target.value)
                      }
                      placeholder="e.g., 30"
                      className="form-input"
                    />
                  </Form.Group>

                  {/* Reminder Settings */}
                  <div className="reminder-section p-3 mb-3">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <h6 className="section-title mb-0">
                        <FontAwesomeIcon icon={faBell} className="me-2" />
                        Reminder Settings
                      </h6>
                      <Form.Check
                        type="switch"
                        id="reminder-enabled"
                        label="Enable"
                        checked={formData.reminder.enabled}
                        onChange={(e) =>
                          handleNestedChange(
                            "reminder",
                            "enabled",
                            e.target.checked
                          )
                        }
                      />
                    </div>

                    {formData.reminder.enabled && (
                      <>
                        {/* Reminder Time */}
                        <Form.Group className="mb-3">
                          <Form.Label className="form-label">
                            <FontAwesomeIcon icon={faClock} className="me-2" />
                            Reminder Time
                          </Form.Label>
                          <Form.Control
                            type="time"
                            value={formData.reminder.reminderTime}
                            onChange={(e) =>
                              handleNestedChange(
                                "reminder",
                                "reminderTime",
                                e.target.value
                              )
                            }
                            className="form-input"
                          />
                        </Form.Group>

                        {/* Reminder Frequency */}
                        <Form.Group className="mb-3">
                          <Form.Label className="form-label">
                            <FontAwesomeIcon icon={faRedo} className="me-2" />
                            Reminder Frequency
                          </Form.Label>
                          <Form.Select
                            value={formData.reminder.frequency}
                            onChange={(e) =>
                              handleNestedChange(
                                "reminder",
                                "frequency",
                                e.target.value
                              )
                            }
                            className="form-input"
                          >
                            <option value="once">
                              Once (at selected time)
                            </option>
                            <option value="30min">30 minutes before</option>
                            <option value="1hour">1 hour before</option>
                            <option value="2hours">2 hours before</option>
                            <option value="daily">Daily</option>
                          </Form.Select>
                        </Form.Group>

                        {/* Notification Methods */}
                        <Form.Group className="mb-3">
                          <Form.Label className="form-label">
                            <FontAwesomeIcon
                              icon={faEnvelope}
                              className="me-2"
                            />
                            Notification Methods
                          </Form.Label>
                          <div className="d-flex flex-wrap gap-3">
                            <Form.Check
                              type="checkbox"
                              id="email-notification"
                              label="Email"
                              checked={
                                formData.reminder.notificationMethods.email
                              }
                              onChange={(e) =>
                                handleNotificationChange(
                                  "email",
                                  e.target.checked
                                )
                              }
                            />
                            <Form.Check
                              type="checkbox"
                              id="sms-notification"
                              label="SMS"
                              checked={
                                formData.reminder.notificationMethods.sms
                              }
                              onChange={(e) =>
                                handleNotificationChange(
                                  "sms",
                                  e.target.checked
                                )
                              }
                            />
                            <Form.Check
                              type="checkbox"
                              id="app-notification"
                              label="App"
                              checked={
                                formData.reminder.notificationMethods.app
                              }
                              onChange={(e) =>
                                handleNotificationChange(
                                  "app",
                                  e.target.checked
                                )
                              }
                            />
                            <Form.Check
                              type="checkbox"
                              id="whatsapp-notification"
                              label="WhatsApp"
                              checked={
                                formData.reminder.notificationMethods.whatsapp
                              }
                              onChange={(e) =>
                                handleNotificationChange(
                                  "whatsapp",
                                  e.target.checked
                                )
                              }
                            />
                          </div>
                        </Form.Group>
                      </>
                    )}
                  </div>

                  {/* Tags */}
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label">
                      <FontAwesomeIcon icon={faUserTag} className="me-2" />
                      Tags
                    </Form.Label>
                    <div className="d-flex gap-2 mb-2">
                      <Form.Control
                        type="text"
                        value={currentTag}
                        onChange={(e) => setCurrentTag(e.target.value)}
                        placeholder="Add a tag..."
                        className="form-input"
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                      />
                      <Button
                        variant="outline-primary"
                        onClick={addTag}
                        disabled={!currentTag.trim()}
                      >
                        Add
                      </Button>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="d-flex flex-wrap gap-1">
                        {formData.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            bg="secondary"
                            className="d-flex align-items-center gap-1"
                          >
                            {tag}
                            <FontAwesomeIcon
                              icon={faTimes}
                              className="tag-remove"
                              onClick={() => removeTag(tag)}
                              style={{cursor: "pointer", fontSize: "0.8em"}}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Form.Group>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer className="modal-footer-light">
          <Button
            variant="outline-secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={
              isSubmitting ||
              isLoading ||
              (Array.isArray(staffMembers) && staffMembers.length === 0)
            }
            className="purple-button"
          >
            {isSubmitting && <Spinner size="sm" className="me-2" />}
            <FontAwesomeIcon icon={faPaperPlane} className="me-2" />
            {isEditMode ? "Update Task" : "Assign Task"}
          </Button>
        </Modal.Footer>
      </Form>

      <style jsx>{`
        .modal-header-purple {
          background: linear-gradient(135deg, #6f42c1 0%, #8e44ad 100%);
          color: white;
          border: none;
        }

        .modal-header-purple .btn-close {
          filter: invert(1);
        }

        .modal-footer-light {
          background: #f8f9fa;
          border-top: 1px solid #e9ecef;
        }

        .purple-button {
          background: linear-gradient(135deg, #6f42c1 0%, #8e44ad 100%);
          border: none;
          font-weight: 600;
        }

        .purple-button:hover {
          background: linear-gradient(135deg, #5a359a 0%, #7d3c98 100%);
        }

        .purple-button:disabled {
          background: #6c757d;
          opacity: 0.6;
        }

        .info-card {
          border: 1px solid #e9ecef;
          box-shadow: none;
        }

        .info-header {
          background: linear-gradient(135deg, #6f42c1 0%, #8e44ad 100%);
          color: white;
          border: none;
          padding: 0.75rem 1rem;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .reminder-header {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          border: none;
          padding: 0.75rem 1rem;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .form-label {
          font-weight: 600;
          font-size: 0.875rem;
          color: #495057;
          margin-bottom: 0.5rem;
        }

        .form-input {
          font-size: 0.875rem;
          border: 1px solid #e0e6ed;
          padding: 0.5rem 0.75rem;
        }

        .form-input:focus {
          border-color: #6f42c1;
          box-shadow: 0 0 0 0.2rem rgba(111, 66, 193, 0.25);
        }

        .form-input.is-invalid {
          border-color: #dc3545;
        }

        .reminder-section {
          background: rgba(40, 167, 69, 0.1);
          border-left: 3px solid #28a745;
          border-radius: 0.375rem;
        }

        .section-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: #2c3e50;
        }

        .tag-remove:hover {
          color: #dc3545 !important;
        }

        .invalid-feedback {
          font-size: 0.8rem;
        }

        /* Alert styles */
        .alert {
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }

        .alert .btn {
          font-size: 0.8rem;
          padding: 0.25rem 0.5rem;
        }
      `}</style>
    </Modal>
  );
}

export default TaskAssignment;
