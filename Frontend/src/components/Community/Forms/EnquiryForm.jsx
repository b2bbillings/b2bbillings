import React, {useState, useRef} from "react";
import {
  Modal,
  Form,
  Button,
  Row,
  Col,
  Card,
  Badge,
  Alert,
  InputGroup,
  Spinner,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faQuestionCircle,
  faSearch,
  faPlus,
  faTimes,
  faUpload,
  faCalendarAlt,
  faDollarSign,
  faBoxes,
  faUsers,
  faPaperPlane,
  faFileAlt,
  faCheck,
  faIndustry,
} from "@fortawesome/free-solid-svg-icons";

function EnquiryForm({
  show,
  onHide,
  mySuppliers = [],
  onSubmit,
  loading = false,
  currentUser,
  addToast,
}) {
  // Form state
  const [formData, setFormData] = useState({
    productName: "",
    description: "",
    quantity: "",
    unit: "pieces",
    budgetPerUnit: "",
    deliveryDate: "",
    paymentCondition: "",
    additionalNotes: "",
  });

  // Other state
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [sendToNewSuppliers, setSendToNewSuppliers] = useState(true);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1); // Now only 2 steps
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  // Sample product suggestions
  const sampleProducts = [
    "Rice - Basmati Premium",
    "Wheat Flour - Whole Grain",
    "Sugar - White Refined",
    "Cooking Oil - Sunflower",
    "Tea Leaves - Assam",
    "Coffee Beans - Arabica",
    "Spices - Turmeric Powder",
    "Pulses - Moong Dal",
    "Biscuits - Glucose Marie",
    "Milk Powder - Full Cream",
    "Salt - Iodized",
    "Masala - Garam Masala",
    "Ghee - Pure Cow",
    "Honey - Natural",
    "Dry Fruits - Almonds",
  ];

  // Units options
  const units = [
    "pieces",
    "kg",
    "grams",
    "tons",
    "quintal",
    "liters",
    "ml",
    "dozens",
    "boxes",
    "cartons",
    "bags",
    "packets",
    "bottles",
    "cans",
    "jars",
  ];

  // Payment condition options
  const paymentConditions = [
    "Cash on Delivery",
    "15 Days Credit",
    "30 Days Credit",
    "45 Days Credit",
    "60 Days Credit",
    "90 Days Credit",
    "Advance Payment",
    "50% Advance + 50% on Delivery",
    "25% Advance + 75% on Delivery",
    "Custom Terms",
  ];

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({...prev, [field]: value}));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({...prev, [field]: ""}));
    }

    // Show product suggestions
    if (field === "productName" && value.length > 1) {
      const filtered = sampleProducts.filter((product) =>
        product.toLowerCase().includes(value.toLowerCase())
      );
      setProductSuggestions(filtered);
      setShowSuggestions(true);
    } else if (field === "productName") {
      setShowSuggestions(false);
    }
  };

  // Handle product selection from suggestions
  const handleProductSelect = (product) => {
    setFormData((prev) => ({...prev, productName: product}));
    setShowSuggestions(false);
  };

  // Handle supplier selection
  const handleSupplierToggle = (supplierId) => {
    setSelectedSuppliers((prev) => {
      if (prev.includes(supplierId)) {
        return prev.filter((id) => id !== supplierId);
      } else {
        return [...prev, supplierId];
      }
    });
  };

  // Handle file attachment
  const handleFileAttach = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter((file) => {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        addToast?.(`File ${file.name} is too large. Max size is 5MB.`, "error");
        return false;
      }
      // Check file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedTypes.includes(file.type)) {
        addToast?.(`File ${file.name} has unsupported format.`, "error");
        return false;
      }
      return true;
    });

    setAttachedFiles((prev) => [...prev, ...validFiles]);
  };

  // Remove attached file
  const removeFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.productName.trim()) {
      newErrors.productName = "Product name is required";
    }

    if (!formData.quantity.trim()) {
      newErrors.quantity = "Quantity is required";
    } else if (isNaN(formData.quantity) || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = "Please enter a valid quantity";
    }

    if (
      formData.budgetPerUnit &&
      (isNaN(formData.budgetPerUnit) || parseFloat(formData.budgetPerUnit) < 0)
    ) {
      newErrors.budgetPerUnit = "Please enter a valid budget";
    }

    if (formData.deliveryDate) {
      const selectedDate = new Date(formData.deliveryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        newErrors.deliveryDate = "Delivery date cannot be in the past";
      }
    }

    // Check if at least one destination is selected
    if (!sendToNewSuppliers && selectedSuppliers.length === 0) {
      newErrors.destination =
        "Please select at least one supplier or enable sending to new suppliers";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    const enquiryData = {
      ...formData,
      selectedSuppliers,
      sendToNewSuppliers,
      attachedFiles,
      shopkeeper: currentUser?.id,
      timestamp: new Date().toISOString(),
    };

    try {
      await onSubmit(enquiryData);
      handleReset();
      onHide();
    } catch (error) {
      addToast?.("Failed to send enquiry. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setFormData({
      productName: "",
      description: "",
      quantity: "",
      unit: "pieces",
      budgetPerUnit: "",
      deliveryDate: "",
      paymentCondition: "",
      additionalNotes: "",
    });
    setSelectedSuppliers([]);
    setSendToNewSuppliers(true);
    setAttachedFiles([]);
    setErrors({});
    setStep(1);
    setSubmitting(false);
  };

  // Get tomorrow's date for min date
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  // Handle modal close
  const handleClose = () => {
    if (!submitting) {
      handleReset();
      onHide();
    }
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="lg"
      centered
      backdrop={submitting ? "static" : true}
      keyboard={!submitting}
      className="enquiry-form-modal"
    >
      <Modal.Header closeButton={!submitting} className="bg-warning text-dark">
        <Modal.Title className="d-flex align-items-center">
          <FontAwesomeIcon icon={faQuestionCircle} className="me-2" />
          Create Product Enquiry
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-0">
        {/* Progress Indicator - Now only 2 steps */}
        <div className="px-3 py-2 bg-light border-bottom">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">Step {step} of 2</small>
            <div className="d-flex gap-1">
              {[1, 2].map((stepNum) => (
                <div
                  key={stepNum}
                  className={`rounded-circle ${
                    stepNum <= step ? "bg-warning" : "bg-secondary"
                  }`}
                  style={{width: "10px", height: "10px"}}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-4">
          {step === 1 && (
            <div>
              <h6 className="mb-4 d-flex align-items-center">
                <FontAwesomeIcon icon={faBoxes} className="me-2 text-primary" />
                Product Information & Requirements
              </h6>

              {/* Product Name with Suggestions */}
              <Row className="mb-3">
                <Col>
                  <Form.Label className="fw-bold">
                    Product Name <span className="text-danger">*</span>
                  </Form.Label>
                  <div className="position-relative">
                    <InputGroup>
                      <Form.Control
                        type="text"
                        placeholder="Type product name (e.g., Rice - Basmati Premium)"
                        value={formData.productName}
                        onChange={(e) =>
                          handleInputChange("productName", e.target.value)
                        }
                        isInvalid={!!errors.productName}
                        onFocus={() =>
                          formData.productName.length > 1 &&
                          setShowSuggestions(true)
                        }
                        onBlur={() =>
                          setTimeout(() => setShowSuggestions(false), 200)
                        }
                        style={{
                          "::placeholder": {
                            color: "#6c757d",
                            opacity: 0.7,
                          },
                        }}
                      />
                      <InputGroup.Text>
                        <FontAwesomeIcon icon={faSearch} size="sm" />
                      </InputGroup.Text>
                    </InputGroup>
                    <Form.Control.Feedback type="invalid">
                      {errors.productName}
                    </Form.Control.Feedback>

                    {/* Product Suggestions Dropdown */}
                    {showSuggestions && productSuggestions.length > 0 && (
                      <div
                        className="position-absolute w-100 bg-white border rounded shadow-sm mt-1"
                        style={{
                          zIndex: 1000,
                          maxHeight: "200px",
                          overflowY: "auto",
                        }}
                      >
                        {productSuggestions.map((product, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 border-bottom"
                            onClick={() => handleProductSelect(product)}
                            style={{cursor: "pointer"}}
                            onMouseEnter={(e) =>
                              e.target.classList.add("bg-light")
                            }
                            onMouseLeave={(e) =>
                              e.target.classList.remove("bg-light")
                            }
                          >
                            <small>
                              <FontAwesomeIcon
                                icon={faBoxes}
                                className="me-2 text-muted"
                                size="xs"
                              />
                              {product}
                            </small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Col>
              </Row>

              {/* Description */}
              <Row className="mb-3">
                <Col>
                  <Form.Label className="fw-bold">Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Describe product specifications, quality requirements, brand preferences, packaging details..."
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    style={{
                      "::placeholder": {
                        color: "#6c757d",
                        opacity: 0.7,
                      },
                    }}
                  />
                  <Form.Text className="text-muted">
                    Include brand preferences, quality specifications, packaging
                    requirements
                  </Form.Text>
                </Col>
              </Row>

              {/* Quantity and Unit */}
              <Row className="mb-3">
                <Col md={8}>
                  <Form.Label className="fw-bold">
                    Quantity <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Enter required quantity"
                    value={formData.quantity}
                    onChange={(e) =>
                      handleInputChange("quantity", e.target.value)
                    }
                    isInvalid={!!errors.quantity}
                    min="0"
                    step="0.01"
                    style={{
                      "::placeholder": {
                        color: "#6c757d",
                        opacity: 0.7,
                      },
                    }}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.quantity}
                  </Form.Control.Feedback>
                </Col>
                <Col md={4}>
                  <Form.Label className="fw-bold">Unit</Form.Label>
                  <Form.Select
                    value={formData.unit}
                    onChange={(e) => handleInputChange("unit", e.target.value)}
                  >
                    {units.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit.charAt(0).toUpperCase() + unit.slice(1)}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              </Row>

              {/* Budget and Delivery Date */}
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Label className="fw-bold">
                    Budget Per Unit (₹)
                  </Form.Label>
                  <InputGroup>
                    <InputGroup.Text>₹</InputGroup.Text>
                    <Form.Control
                      type="number"
                      placeholder="Expected price per unit"
                      value={formData.budgetPerUnit}
                      onChange={(e) =>
                        handleInputChange("budgetPerUnit", e.target.value)
                      }
                      isInvalid={!!errors.budgetPerUnit}
                      min="0"
                      step="0.01"
                      style={{
                        "::placeholder": {
                          color: "#6c757d",
                          opacity: 0.7,
                        },
                      }}
                    />
                  </InputGroup>
                  <Form.Control.Feedback type="invalid">
                    {errors.budgetPerUnit}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Optional - helps suppliers provide better quotes
                  </Form.Text>
                </Col>
                <Col md={6}>
                  <Form.Label className="fw-bold">
                    Required Delivery Date
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) =>
                      handleInputChange("deliveryDate", e.target.value)
                    }
                    isInvalid={!!errors.deliveryDate}
                    min={getTomorrowDate()}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.deliveryDate}
                  </Form.Control.Feedback>
                </Col>
              </Row>

              {/* Payment Condition */}
              <Row className="mb-3">
                <Col>
                  <Form.Label className="fw-bold">Payment Condition</Form.Label>
                  <Form.Select
                    value={formData.paymentCondition}
                    onChange={(e) =>
                      handleInputChange("paymentCondition", e.target.value)
                    }
                  >
                    <option value="" style={{color: "#6c757d"}}>
                      Select payment terms...
                    </option>
                    {paymentConditions.map((condition) => (
                      <option key={condition} value={condition}>
                        {condition}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              </Row>

              {/* Additional Notes */}
              <Row className="mb-3">
                <Col>
                  <Form.Label className="fw-bold">Additional Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Any additional requirements, special instructions, or notes for suppliers..."
                    value={formData.additionalNotes}
                    onChange={(e) =>
                      handleInputChange("additionalNotes", e.target.value)
                    }
                    style={{
                      "::placeholder": {
                        color: "#6c757d",
                        opacity: 0.7,
                      },
                    }}
                  />
                </Col>
              </Row>

              {/* File Attachments */}
              <Row className="mb-3">
                <Col>
                  <Form.Label className="fw-bold">Attach Files</Form.Label>
                  <div className="border rounded p-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileAttach}
                      multiple
                      accept=".jpg,.jpeg,.png,.gif,.pdf,.txt,.doc,.docx"
                      style={{display: "none"}}
                    />

                    <Button
                      variant="outline-secondary"
                      onClick={() => fileInputRef.current?.click()}
                      className="mb-2"
                    >
                      <FontAwesomeIcon icon={faUpload} className="me-2" />
                      Choose Files
                    </Button>

                    <div className="text-muted mb-2">
                      <small>
                        Supported: Images, PDF, Word documents (Max 5MB each)
                      </small>
                    </div>

                    {/* Attached Files */}
                    {attachedFiles.length > 0 && (
                      <div>
                        <small className="fw-bold text-muted">
                          Attached Files:
                        </small>
                        {attachedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="d-flex align-items-center justify-content-between bg-light rounded p-2 mt-1"
                          >
                            <div className="d-flex align-items-center">
                              <FontAwesomeIcon
                                icon={faFileAlt}
                                className="me-2 text-primary"
                              />
                              <small>{file.name}</small>
                              <Badge bg="secondary" className="ms-2">
                                {(file.size / 1024).toFixed(1)} KB
                              </Badge>
                            </div>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => removeFile(index)}
                              style={{padding: "0.1rem 0.3rem"}}
                            >
                              <FontAwesomeIcon icon={faTimes} size="xs" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Col>
              </Row>
            </div>
          )}

          {step === 2 && (
            <div>
              <h6 className="mb-4 d-flex align-items-center">
                <FontAwesomeIcon icon={faUsers} className="me-2 text-info" />
                Send To Suppliers
              </h6>

              {/* Send to New Suppliers Option */}
              <Card className="mb-3">
                <Card.Body className="p-3">
                  <Form.Check
                    type="checkbox"
                    id="sendToNewSuppliers"
                    checked={sendToNewSuppliers}
                    onChange={(e) => setSendToNewSuppliers(e.target.checked)}
                    label={
                      <div>
                        <strong className="d-flex align-items-center">
                          <FontAwesomeIcon
                            icon={faIndustry}
                            className="me-2 text-primary"
                          />
                          Send to New Suppliers Across India
                        </strong>
                        <div className="text-muted mt-1">
                          <small>
                            Send this enquiry to wholesalers across India who
                            sell this product
                          </small>
                        </div>
                      </div>
                    }
                  />
                </Card.Body>
              </Card>

              {/* My Suppliers List */}
              <Card>
                <Card.Header className="bg-light py-2">
                  <div className="d-flex align-items-center justify-content-between">
                    <strong className="d-flex align-items-center">
                      <FontAwesomeIcon
                        icon={faUsers}
                        className="me-2 text-success"
                      />
                      My Suppliers
                    </strong>
                    <Badge bg="info">{mySuppliers.length}</Badge>
                  </div>
                </Card.Header>
                <Card.Body
                  className="p-0"
                  style={{maxHeight: "350px", overflowY: "auto"}}
                >
                  {mySuppliers.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <FontAwesomeIcon
                        icon={faUsers}
                        size="2x"
                        className="mb-2"
                      />
                      <div>No suppliers in your list yet</div>
                      <small>Add suppliers to send them direct enquiries</small>
                    </div>
                  ) : (
                    <div className="p-2">
                      {mySuppliers.map((supplier) => (
                        <div
                          key={supplier.id}
                          className="border rounded p-3 mb-2"
                        >
                          <Form.Check
                            type="checkbox"
                            id={`supplier-${supplier.id}`}
                            checked={selectedSuppliers.includes(supplier.id)}
                            onChange={() => handleSupplierToggle(supplier.id)}
                            label={
                              <div className="d-flex align-items-center justify-content-between w-100">
                                <div>
                                  <strong>{supplier.name}</strong>
                                  <div className="text-muted">
                                    <small>{supplier.location}</small>
                                  </div>
                                  {supplier.company && (
                                    <div className="text-muted">
                                      <small>{supplier.company}</small>
                                    </div>
                                  )}
                                </div>
                                <div className="text-end">
                                  {supplier.rating && (
                                    <div>
                                      <small className="text-warning">
                                        {supplier.rating}★
                                      </small>
                                    </div>
                                  )}
                                  {supplier.verified && (
                                    <Badge bg="success" className="mt-1">
                                      <FontAwesomeIcon
                                        icon={faCheck}
                                        size="xs"
                                        className="me-1"
                                      />
                                      Verified
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>

              {/* Error for destination */}
              {errors.destination && (
                <Alert variant="danger" className="mt-2">
                  {errors.destination}
                </Alert>
              )}

              {/* Summary */}
              <Alert variant="info" className="mt-3">
                <strong>📋 Summary:</strong>
                <ul className="mb-0 mt-2">
                  <li>
                    <strong>Product:</strong>{" "}
                    {formData.productName || "Not specified"}
                  </li>
                  <li>
                    <strong>Quantity:</strong> {formData.quantity}{" "}
                    {formData.unit}
                  </li>
                  {formData.budgetPerUnit && (
                    <li>
                      <strong>Budget:</strong> ₹{formData.budgetPerUnit} per{" "}
                      {formData.unit}
                    </li>
                  )}
                  {formData.deliveryDate && (
                    <li>
                      <strong>Delivery Date:</strong>{" "}
                      {new Date(formData.deliveryDate).toLocaleDateString()}
                    </li>
                  )}
                  {sendToNewSuppliers && (
                    <li>✅ Will be sent to new suppliers across India</li>
                  )}
                  <li>
                    ✅ Will be sent to{" "}
                    <strong>{selectedSuppliers.length}</strong> of your
                    suppliers
                  </li>
                  {attachedFiles.length > 0 && (
                    <li>📎 {attachedFiles.length} file(s) attached</li>
                  )}
                </ul>
              </Alert>
            </div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        <div>
          {step > 1 && (
            <Button
              variant="outline-secondary"
              onClick={() => setStep(step - 1)}
              disabled={submitting}
            >
              Previous
            </Button>
          )}
        </div>

        <div className="d-flex gap-2">
          <Button
            variant="outline-secondary"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>

          {step < 2 ? (
            <Button
              variant="warning"
              onClick={() => setStep(step + 1)}
              disabled={
                step === 1 && (!formData.productName || !formData.quantity)
              }
            >
              Next
            </Button>
          ) : (
            <Button
              variant="success"
              onClick={handleSubmit}
              disabled={
                submitting ||
                (!sendToNewSuppliers && selectedSuppliers.length === 0)
              }
            >
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Sending...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faPaperPlane} className="me-2" />
                  Send Enquiry
                </>
              )}
            </Button>
          )}
        </div>
      </Modal.Footer>

      {/* Add custom CSS for placeholder styling */}
      <style jsx>{`
        .form-control::placeholder,
        .form-control::-webkit-input-placeholder,
        .form-control::-moz-placeholder,
        .form-control:-ms-input-placeholder {
          color: #6c757d !important;
          opacity: 0.7 !important;
        }

        textarea.form-control::placeholder,
        textarea.form-control::-webkit-input-placeholder,
        textarea.form-control::-moz-placeholder,
        textarea.form-control:-ms-input-placeholder {
          color: #6c757d !important;
          opacity: 0.7 !important;
        }

        select.form-select option:first-child {
          color: #6c757d;
        }
      `}</style>
    </Modal>
  );
}

export default EnquiryForm;
