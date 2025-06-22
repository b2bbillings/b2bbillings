import React, {useState, useEffect, useRef, useCallback} from "react";
import {Row, Col, Form, Spinner, Button, Alert} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faUser,
  faUserPlus,
  faPhone,
  faSpinner,
  faRefresh,
  faFileInvoice,
  faCalendarAlt,
  faSearch,
  faTimes,
  faEnvelope,
  faBuilding,
  faIdCard,
  faExclamationTriangle,
  faTruck,
  faShoppingCart,
  faReceipt,
} from "@fortawesome/free-solid-svg-icons";
import partyService from "../../../../services/partyService";
import AddNewParty from "../../Party/AddNewParty";

function PurchaseInvoiceHeader({
  formData,
  onFormDataChange,
  companyId,
  currentUser,
  currentCompany,
  addToast,
  errors = {},
  disabled = false,
  mode = "purchases",
  documentType = "purchase",
  isPurchaseOrdersMode = false,
  labels = {},
}) {
  // Purchase-specific configuration
  const entityType = "supplier";
  const EntityTypeCapitalized = "Supplier";
  const entityIcon = faTruck;

  // States for supplier management
  const [parties, setParties] = useState([]);
  const [isLoadingParties, setIsLoadingParties] = useState(false);
  const [partySearchTerm, setPartySearchTerm] = useState("");
  const [showPartySuggestions, setShowPartySuggestions] = useState(false);
  const [selectedPartySuggestionIndex, setSelectedPartySuggestionIndex] =
    useState(-1);
  const [searchError, setSearchError] = useState(null);

  // Modal states
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [quickAddPartyData, setQuickAddPartyData] = useState(null);

  // Refs for keyboard navigation
  const partyInputRef = useRef(null);
  const isSelectingPartyRef = useRef(false);
  const searchTimeoutRef = useRef(null);
  const dateInputRef = useRef(null);

  // Field refs for keyboard navigation
  const fieldRefs = useRef({
    gstType: null,
    partyName: null, // Changed from supplierName to partyName to match SalesFormHeader
    invoiceNumber: null, // Changed from documentNumber to invoiceNumber to match SalesFormHeader
    invoiceDate: null, // Changed from documentDate to invoiceDate to match SalesFormHeader
  });

  // Initialize supplier search term
  useEffect(() => {
    if (formData.customer) {
      setPartySearchTerm(formData.customer.name || "");
    } else if (formData.mobileNumber) {
      setPartySearchTerm(formData.mobileNumber);
    }
  }, [formData.customer, formData.mobileNumber]);

  // Load suppliers function
  const loadParties = async (searchTerm = "") => {
    if (!companyId) return;

    try {
      setIsLoadingParties(true);
      setSearchError(null);

      const response = await partyService.getParties(companyId, {
        search: searchTerm,
        limit: searchTerm ? 20 : 100,
        type: entityType,
        page: 1,
        sortBy: "name",
        sortOrder: "asc",
      });

      if (response.success) {
        const supplierList = response.data?.parties || response.data || [];
        const formattedParties = supplierList.map((supplier) => ({
          id: supplier._id || supplier.id,
          name: supplier.name || supplier.partyName || "Unknown Supplier",
          phone:
            supplier.phoneNumber ||
            supplier.phone ||
            supplier.mobile ||
            supplier.contactNumber ||
            "",
          email: supplier.email || "",
          address: supplier.homeAddressLine || supplier.address || "",
          gstNumber: supplier.gstNumber || "",
          balance:
            supplier.currentBalance ||
            supplier.balance ||
            supplier.openingBalance ||
            0,
          type: supplier.partyType || entityType,
          companyName: supplier.companyName || "",
          creditLimit: supplier.creditLimit || 0,
        }));

        setParties(formattedParties);

        if (searchTerm && !isSelectingPartyRef.current) {
          setShowPartySuggestions(true);
        }
      } else {
        setParties([]);
        addToast?.(
          `Failed to load ${entityType}s: ` +
            (response.message || "Unknown error"),
          "error"
        );
      }
    } catch (error) {
      setParties([]);
      setSearchError(`Failed to load ${entityType}s: ${error.message}`);
      addToast?.(`Failed to load ${entityType}s: ${error.message}`, "error");
    } finally {
      setIsLoadingParties(false);
    }
  };

  // Search suppliers with debouncing - Fixed to match SalesFormHeader
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (
      partySearchTerm.length >= 2 &&
      !isSelectingPartyRef.current &&
      !formData.customer
    ) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          await loadParties(partySearchTerm);
        } catch (error) {
          console.error("Search error:", error);
        }
      }, 300);
    } else if (partySearchTerm.length === 0) {
      setShowPartySuggestions(false);
      loadParties();
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [partySearchTerm]);

  // Load initial data
  useEffect(() => {
    if (companyId) {
      loadParties();
    }
  }, [companyId]);

  // Generate document number - Purchase specific
  const generateDocumentNumber = (invoiceType = "non-gst") => {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);

    if (isPurchaseOrdersMode) {
      const companyPrefix = currentCompany?.code || "PO";
      if (invoiceType === "gst") {
        return `${companyPrefix}-GST-${year}${month}${day}-${random}`;
      } else {
        return `${companyPrefix}-${year}${month}${day}-${random}`;
      }
    } else {
      const companyPrefix = currentCompany?.code || "PB";
      if (invoiceType === "gst") {
        return `${companyPrefix}-GST-${year}${month}${day}-${random}`;
      } else {
        return `${companyPrefix}-${year}${month}${day}-${random}`;
      }
    }
  };

  // Keyboard navigation helper - Fixed to match SalesFormHeader
  const focusNextField = (currentField) => {
    const fieldOrder = ["gstType", "partyName", "invoiceNumber", "invoiceDate"];
    const currentIndex = fieldOrder.indexOf(currentField);

    if (currentIndex < fieldOrder.length - 1) {
      const nextField = fieldOrder[currentIndex + 1];
      const nextFieldRef = fieldRefs.current[nextField];
      if (nextFieldRef) {
        nextFieldRef.focus();
        if (nextFieldRef.select) nextFieldRef.select();
      }
    } else {
      // Move to first product input
      const firstProductInput = document.querySelector(
        '[data-product-input="0"]'
      );
      if (firstProductInput) {
        firstProductInput.focus();
      }
    }
  };

  // Enhanced keyboard handler - Fixed to match SalesFormHeader
  const handleFieldKeyDown = (e, fieldName) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (fieldName === "partyName") {
        if (showPartySuggestions && selectedPartySuggestionIndex >= 0) {
          const filteredParties = parties.filter(
            (party) =>
              party.name
                .toLowerCase()
                .includes(partySearchTerm.toLowerCase()) ||
              party.phone.includes(partySearchTerm)
          );

          if (selectedPartySuggestionIndex < filteredParties.length) {
            handlePartySelect(filteredParties[selectedPartySuggestionIndex]);
            return;
          } else if (selectedPartySuggestionIndex === filteredParties.length) {
            handleAddNewParty();
            return;
          }
        }
      }

      focusNextField(fieldName);
    }
  };

  // Party search keyboard handler - Fixed to match SalesFormHeader
  const handlePartySearchKeyDown = (e) => {
    if (!showPartySuggestions) {
      handleFieldKeyDown(e, "partyName");
      return;
    }

    const filteredParties = parties.filter(
      (party) =>
        party.name.toLowerCase().includes(partySearchTerm.toLowerCase()) ||
        party.phone.includes(partySearchTerm)
    );

    const hasAddNewOption =
      filteredParties.length === 0 || partySearchTerm.length >= 2;
    const totalOptions = filteredParties.length + (hasAddNewOption ? 1 : 0);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedPartySuggestionIndex((prev) =>
          Math.min(prev + 1, totalOptions - 1)
        );
        break;

      case "ArrowUp":
        e.preventDefault();
        setSelectedPartySuggestionIndex((prev) => Math.max(prev - 1, -1));
        break;

      case "Enter":
        e.preventDefault();
        if (selectedPartySuggestionIndex === -1) {
          focusNextField("partyName");
        } else if (selectedPartySuggestionIndex < filteredParties.length) {
          handlePartySelect(filteredParties[selectedPartySuggestionIndex]);
        } else if (
          hasAddNewOption &&
          selectedPartySuggestionIndex === filteredParties.length
        ) {
          handleAddNewParty();
        }
        break;

      case "Escape":
        e.preventDefault();
        setShowPartySuggestions(false);
        setSelectedPartySuggestionIndex(-1);
        break;

      case "Tab":
        setShowPartySuggestions(false);
        setSelectedPartySuggestionIndex(-1);
        break;

      default:
        setSelectedPartySuggestionIndex(-1);
        break;
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    onFormDataChange(field, value);

    if (field === "gstEnabled" || field === "invoiceType") {
      // Regenerate document number when GST type changes
      const newInvoiceType =
        field === "gstEnabled" ? (value ? "gst" : "non-gst") : value;
      const newDocumentNumber = generateDocumentNumber(newInvoiceType);
      onFormDataChange("invoiceNumber", newDocumentNumber);
    }
  };

  // Handle party search change - Fixed to exactly match SalesFormHeader
  const handlePartySearchChange = (value) => {
    if (isSelectingPartyRef.current) {
      return;
    }

    setPartySearchTerm(value);
    onFormDataChange("mobileNumber", value);

    if (formData.customer && value !== formData.customer.name) {
      onFormDataChange("customer", null);
    }
  };

  // Handle party selection - Fixed to match SalesFormHeader
  const handlePartySelect = (party) => {
    isSelectingPartyRef.current = true;

    const supplierData = {
      id: party.id,
      _id: party.id,
      name: party.name,
      mobile: party.phone,
      email: party.email,
      address: party.address,
      gstNumber: party.gstNumber,
      companyName: party.companyName,
    };

    onFormDataChange("customer", supplierData);
    onFormDataChange("mobileNumber", party.phone);

    setPartySearchTerm(party.name);
    setShowPartySuggestions(false);
    setSelectedPartySuggestionIndex(-1);

    setTimeout(() => {
      isSelectingPartyRef.current = false;
      const invoiceNumberRef = fieldRefs.current.invoiceNumber;
      if (invoiceNumberRef) {
        invoiceNumberRef.focus();
      }
    }, 200);
  };

  // Handle add new party
  const handleAddNewParty = () => {
    isSelectingPartyRef.current = true;
    setQuickAddPartyData({
      name: partySearchTerm || "",
      type: entityType,
    });
    setShowAddPartyModal(true);
    setShowPartySuggestions(false);
  };

  // Handle party created
  const handlePartyCreated = (newParty) => {
    const formattedParty = {
      id: newParty._id || newParty.id,
      name: newParty.name || newParty.partyName,
      phone: newParty.phoneNumber || newParty.phone || newParty.mobile || "",
      email: newParty.email || "",
      address: newParty.homeAddressLine || newParty.address || "",
      gstNumber: newParty.gstNumber || "",
      balance: newParty.currentBalance || newParty.balance || 0,
      type: newParty.partyType || entityType,
      companyName: newParty.companyName || "",
      creditLimit: newParty.creditLimit || 0,
    };

    handlePartySelect(formattedParty);
    setParties((prev) => [formattedParty, ...prev]);
    setShowAddPartyModal(false);
    setShowPartySuggestions(false);

    addToast?.(
      `${EntityTypeCapitalized} "${formattedParty.name}" created and selected successfully!`,
      "success"
    );

    setTimeout(() => {
      isSelectingPartyRef.current = false;
      const firstProductInput = document.querySelector(
        '[data-product-input="0"]'
      );
      if (firstProductInput) {
        firstProductInput.focus();
      }
    }, 100);
  };

  // Clear party selection
  const clearPartySelection = () => {
    isSelectingPartyRef.current = true;

    onFormDataChange("customer", null);
    onFormDataChange("mobileNumber", "");
    setPartySearchTerm("");
    setShowPartySuggestions(false);

    setTimeout(() => {
      isSelectingPartyRef.current = false;
    }, 100);
  };

  // Handle party input focus/blur - Fixed to match SalesFormHeader
  const handlePartyInputFocus = () => {
    if (
      partySearchTerm.length >= 2 &&
      !isSelectingPartyRef.current &&
      !formData.customer
    ) {
      setShowPartySuggestions(true);
    }
  };

  const handlePartyInputBlur = () => {
    if (!isSelectingPartyRef.current) {
      setTimeout(() => {
        if (!isSelectingPartyRef.current) {
          setShowPartySuggestions(false);
          setSelectedPartySuggestionIndex(-1);
        }
      }, 150);
    }
  };

  // Handle date input click
  const handleDateInputGroupClick = () => {
    if (dateInputRef.current) {
      dateInputRef.current.focus();
      dateInputRef.current.showPicker();
    }
  };

  const filteredParties = parties.filter(
    (party) =>
      party.name.toLowerCase().includes(partySearchTerm.toLowerCase()) ||
      party.phone.includes(partySearchTerm)
  );

  // Standardized input styles
  const inputStyle = {
    borderColor: "#000",
    fontSize: "13px",
    padding: "10px 14px",
    height: "42px",
  };

  const getInputStyleWithError = (fieldName) => ({
    ...inputStyle,
    borderColor: errors[fieldName] ? "#dc3545" : "#000",
  });

  // Purchase-specific labels
  const getDocumentLabels = () => {
    if (isPurchaseOrdersMode) {
      return {
        documentNumber: labels.documentNumber || "Purchase Order Number",
        documentDate: labels.documentDate || "Order Date",
        documentIcon: faShoppingCart,
        documentType: "Purchase Order",
        formatPrefix: "PO",
      };
    } else {
      return {
        documentNumber: labels.documentNumber || "Purchase Bill Number",
        documentDate: labels.documentDate || "Bill Date",
        documentIcon: faReceipt,
        documentType: "Purchase Bill",
        formatPrefix: "PB",
      };
    }
  };

  const documentLabels = getDocumentLabels();

  return (
    <div className="purchase-invoice-header">
      {/* Error Alert */}
      {searchError && (
        <Alert
          variant="warning"
          className="py-2 mb-3"
          dismissible
          onClose={() => setSearchError(null)}
        >
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          <small>{searchError}</small>
        </Alert>
      )}

      <Row className="mb-3">
        {/* Left Column */}
        <Col md={6}>
          {/* GST Toggle */}
          <Form.Group className="mb-3">
            <Form.Label
              className="fw-bold text-danger"
              style={{fontSize: "14px"}}
            >
              GST / Non GST *
            </Form.Label>
            <Form.Select
              ref={(el) => (fieldRefs.current.gstType = el)}
              value={formData.gstEnabled ? "gst" : "non-gst"}
              onChange={(e) => {
                const isGst = e.target.value === "gst";
                handleInputChange("gstEnabled", isGst);
                handleInputChange("invoiceType", e.target.value);
              }}
              onKeyDown={(e) => handleFieldKeyDown(e, "gstType")}
              className="border-2"
              style={{
                ...getInputStyleWithError("gstEnabled"),
                backgroundColor: formData.gstEnabled ? "#e8f5e8" : "#fff3e0",
              }}
              disabled={disabled}
              isInvalid={!!errors.gstEnabled}
            >
              <option value="gst">GST</option>
              <option value="non-gst">Non GST</option>
            </Form.Select>
            {errors.gstEnabled && (
              <Form.Control.Feedback type="invalid" style={{fontSize: "12px"}}>
                {errors.gstEnabled}
              </Form.Control.Feedback>
            )}
            <Form.Text className="text-info" style={{fontSize: "12px"}}>
              {formData.gstEnabled
                ? "✅ GST will be calculated"
                : "⚠️ GST will not be applied"}
            </Form.Text>
          </Form.Group>

          {/* Supplier Selection */}
          <Form.Group className="position-relative mb-3">
            <Form.Label
              className="fw-bold text-danger"
              style={{fontSize: "14px"}}
            >
              Select {EntityTypeCapitalized} *
            </Form.Label>

            <div className="position-relative">
              <Form.Control
                ref={(el) => {
                  partyInputRef.current = el;
                  fieldRefs.current.partyName = el;
                }}
                type="text"
                value={partySearchTerm}
                onChange={(e) => handlePartySearchChange(e.target.value)}
                onKeyDown={handlePartySearchKeyDown}
                onFocus={handlePartyInputFocus}
                onBlur={handlePartyInputBlur}
                className="border-2"
                style={getInputStyleWithError("customer")}
                placeholder={`Search ${entityType}...`}
                disabled={disabled || isLoadingParties}
                isInvalid={!!errors.customer}
              />

              {isLoadingParties && (
                <div className="position-absolute top-50 end-0 translate-middle-y me-2">
                  <Spinner size="sm" />
                </div>
              )}
            </div>

            {/* Supplier suggestions dropdown */}
            {showPartySuggestions &&
              partySearchTerm.length >= 2 &&
              !formData.customer && (
                <div
                  className="position-absolute w-100 bg-white border border-2 rounded mt-1 shadow-lg"
                  style={{
                    zIndex: 1000,
                    maxHeight: "200px",
                    overflowY: "auto",
                    borderColor: "#000",
                  }}
                >
                  {filteredParties.length > 0 &&
                    filteredParties.slice(0, 5).map((party, index) => (
                      <div
                        key={party.id}
                        className={`p-2 border-bottom cursor-pointer ${
                          selectedPartySuggestionIndex === index
                            ? "bg-primary text-white"
                            : ""
                        }`}
                        style={{
                          fontSize: "12px",
                          cursor: "pointer",
                          transition: "background-color 0.2s",
                        }}
                        onClick={() => handlePartySelect(party)}
                        onMouseEnter={() =>
                          setSelectedPartySuggestionIndex(index)
                        }
                      >
                        <div
                          className={`fw-bold ${
                            selectedPartySuggestionIndex === index
                              ? "text-white"
                              : "text-primary"
                          }`}
                          style={{fontSize: "13px"}}
                        >
                          <FontAwesomeIcon icon={faTruck} className="me-1" />
                          {party.name}
                        </div>
                        <div
                          className={
                            selectedPartySuggestionIndex === index
                              ? "text-light"
                              : "text-muted"
                          }
                          style={{fontSize: "11px"}}
                        >
                          {party.phone && <span>📞 {party.phone}</span>}
                          {party.companyName && (
                            <span className="ms-2">🏢 {party.companyName}</span>
                          )}
                        </div>
                      </div>
                    ))}

                  <div
                    className={`p-2 cursor-pointer bg-light border-top ${
                      selectedPartySuggestionIndex === filteredParties.length
                        ? "bg-primary text-white"
                        : ""
                    }`}
                    style={{
                      fontSize: "12px",
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                    }}
                    onClick={handleAddNewParty}
                    onMouseEnter={() =>
                      setSelectedPartySuggestionIndex(filteredParties.length)
                    }
                  >
                    <div className="text-center">
                      <FontAwesomeIcon
                        icon={faUserPlus}
                        className={`me-1 ${
                          selectedPartySuggestionIndex ===
                          filteredParties.length
                            ? "text-white"
                            : "text-success"
                        }`}
                      />
                      <span
                        className={`fw-bold ${
                          selectedPartySuggestionIndex ===
                          filteredParties.length
                            ? "text-white"
                            : "text-success"
                        }`}
                        style={{fontSize: "12px"}}
                      >
                        Add New {EntityTypeCapitalized}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            {/* Selected supplier display */}
            {formData.customer && (
              <div
                className="mt-2 p-2 bg-light border-2 rounded"
                style={{borderColor: "#28a745"}}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div
                      className="fw-bold text-success"
                      style={{fontSize: "13px"}}
                    >
                      <FontAwesomeIcon icon={faTruck} className="me-1" />✅{" "}
                      {formData.customer.name}
                    </div>
                    {formData.customer.mobile && (
                      <div className="text-muted" style={{fontSize: "11px"}}>
                        📞 {formData.customer.mobile}
                      </div>
                    )}
                    {formData.customer.companyName && (
                      <div className="text-muted" style={{fontSize: "11px"}}>
                        🏢 {formData.customer.companyName}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={clearPartySelection}
                    disabled={disabled}
                    title="Clear selection"
                    style={{fontSize: "11px", padding: "4px 8px"}}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {errors.customer && (
              <div
                className="invalid-feedback d-block"
                style={{fontSize: "12px"}}
              >
                {errors.customer}
              </div>
            )}
          </Form.Group>
        </Col>

        {/* Right Column */}
        <Col md={6}>
          {/* Document Number */}
          <Form.Group className="mb-3">
            <Form.Label
              className="fw-bold text-danger"
              style={{fontSize: "14px"}}
            >
              {documentLabels.documentNumber} *
            </Form.Label>
            <div className="input-group">
              <span className="input-group-text" style={{borderColor: "#000"}}>
                <FontAwesomeIcon icon={documentLabels.documentIcon} size="sm" />
              </span>
              <Form.Control
                ref={(el) => (fieldRefs.current.invoiceNumber = el)}
                type="text"
                value={formData.invoiceNumber || ""}
                onChange={(e) =>
                  handleInputChange("invoiceNumber", e.target.value)
                }
                onKeyDown={(e) => handleFieldKeyDown(e, "invoiceNumber")}
                className="border-2 fw-semibold"
                style={{
                  ...getInputStyleWithError("invoiceNumber"),
                  backgroundColor: formData.gstEnabled ? "#e8f5e8" : "#e8f2ff",
                  color: formData.gstEnabled ? "#155724" : "#004085",
                  borderLeft: "none",
                }}
                disabled={disabled}
                isInvalid={!!errors.invoiceNumber}
              />
            </div>
            <Form.Text className="text-muted" style={{fontSize: "12px"}}>
              Format:{" "}
              {formData.gstEnabled
                ? `${documentLabels.formatPrefix}-GST-YYYYMMDD-XXXX`
                : `${documentLabels.formatPrefix}-YYYYMMDD-XXXX`}
            </Form.Text>
            {errors.invoiceNumber && (
              <Form.Control.Feedback type="invalid" style={{fontSize: "12px"}}>
                {errors.invoiceNumber}
              </Form.Control.Feedback>
            )}
          </Form.Group>

          {/* Document Date */}
          <Form.Group className="mb-3">
            <Form.Label
              className="fw-bold text-danger"
              style={{fontSize: "14px"}}
            >
              {documentLabels.documentDate} *
            </Form.Label>
            <div
              className="input-group"
              style={{cursor: "pointer"}}
              onClick={handleDateInputGroupClick}
            >
              <span
                className="input-group-text"
                style={{cursor: "pointer", borderColor: "#000"}}
                onClick={handleDateInputGroupClick}
              >
                <FontAwesomeIcon icon={faCalendarAlt} size="sm" />
              </span>
              <Form.Control
                ref={(el) => {
                  dateInputRef.current = el;
                  fieldRefs.current.invoiceDate = el;
                }}
                type="date"
                value={formData.invoiceDate || ""}
                onChange={(e) =>
                  handleInputChange("invoiceDate", e.target.value)
                }
                onKeyDown={(e) => handleFieldKeyDown(e, "invoiceDate")}
                className="border-2"
                style={{
                  ...getInputStyleWithError("invoiceDate"),
                  cursor: "pointer",
                  borderLeft: "none",
                }}
                disabled={disabled}
                isInvalid={!!errors.invoiceDate}
                required
              />
            </div>
            {errors.invoiceDate && (
              <Form.Control.Feedback type="invalid" style={{fontSize: "12px"}}>
                {errors.invoiceDate}
              </Form.Control.Feedback>
            )}
          </Form.Group>

          {/* Document Info */}
          <div
            className="mt-3 p-2 rounded"
            style={{
              backgroundColor: formData.gstEnabled ? "#d4edda" : "#d1ecf1",
              fontSize: "11px",
            }}
          >
            <div className="fw-semibold mb-1">
              <FontAwesomeIcon
                icon={documentLabels.documentIcon}
                className="me-1"
              />
              {formData.gstEnabled
                ? `🏢 GST ${documentLabels.documentType}`
                : `📄 Regular ${documentLabels.documentType}`}
            </div>
            <div className="text-muted">
              {formData.gstEnabled
                ? "Tax calculations will include GST rates for purchases"
                : `Simple ${documentLabels.documentType.toLowerCase()} without GST calculations`}
            </div>
          </div>
        </Col>
      </Row>

      {/* Add New Supplier Modal */}
      {showAddPartyModal && (
        <AddNewParty
          show={showAddPartyModal}
          onHide={() => setShowAddPartyModal(false)}
          companyId={companyId}
          currentUser={currentUser}
          onPartyCreated={handlePartyCreated}
          quickAddData={quickAddPartyData}
          addToast={addToast}
        />
      )}
    </div>
  );
}

export default PurchaseInvoiceHeader;
