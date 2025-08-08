import React, {useState, useEffect, useRef, useCallback} from "react";
import {createPortal} from "react-dom";
import {
  Row,
  Col,
  Form,
  Spinner,
  Button,
  Alert,
  Container,
  Card,
  InputGroup,
  Badge,
} from "react-bootstrap";
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
  faArrowLeft,
  faCheckCircle,
  faEdit,
  faSave,
  faClipboard,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import {useNavigate} from "react-router-dom";
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
  isPageMode = false,
  hasUnsavedChanges = false,
  editMode = false,
  onBack,
  showHeader = true,
  showBackButton = true,
}) {
  const navigate = useNavigate();

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
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  // Modal states
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [quickAddPartyData, setQuickAddPartyData] = useState(null);

  // Refs for keyboard navigation and positioning
  const partyInputRef = useRef(null);
  const partyInputGroupRef = useRef(null);
  const isSelectingPartyRef = useRef(false);
  const searchTimeoutRef = useRef(null);
  const dateInputRef = useRef(null);

  // Field refs for keyboard navigation
  const fieldRefs = useRef({
    gstType: null,
    partyName: null,
    invoiceNumber: null,
    invoiceDate: null,
  });

  // Purple theme styles
  const purpleTheme = {
    primary: "#6366f1",
    primaryLight: "#8b5cf6",
    primaryDark: "#4f46e5",
    primaryRgb: "99, 102, 241",
    secondary: "#8b5cf6",
    accent: "#a855f7",
    background: "#f8fafc",
    surface: "#ffffff",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    text: "#1e293b",
    textMuted: "#64748b",
    border: "#e2e8f0",
    borderDark: "#cbd5e1",
  };

  // Enhanced input styles with purple theme
  const getInputStyle = (fieldName) => ({
    borderColor: errors[fieldName] ? purpleTheme.error : purpleTheme.border,
    fontSize: "14px",
    padding: "12px 16px",
    height: "48px",
    borderWidth: "2px",
    borderRadius: "8px",
    transition: "all 0.2s ease",
    backgroundColor: purpleTheme.surface,
    boxShadow: errors[fieldName]
      ? `0 0 0 3px rgba(239, 68, 68, 0.1)`
      : `0 0 0 0px rgba(${purpleTheme.primaryRgb}, 0.1)`,
  });

  // FIXED: Better dropdown position calculation
  const updateDropdownPosition = useCallback(() => {
    if (partyInputGroupRef.current) {
      const rect = partyInputGroupRef.current.getBoundingClientRect();
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;

      setDropdownPosition({
        top: rect.bottom + scrollY + 4,
        left: rect.left + scrollX,
        width: rect.width,
      });
    }
  }, []);

  // Handle back navigation
  const handleBack = () => {
    if (hasUnsavedChanges && !disabled) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to go back?"
      );
      if (!confirmed) {
        return;
      }
    }

    if (onBack && typeof onBack === "function") {
      onBack();
    } else {
      if (companyId) {
        if (isPurchaseOrdersMode) {
          navigate(`/companies/${companyId}/purchase-orders`);
        } else {
          navigate(`/companies/${companyId}/purchase-bills`);
        }
      } else {
        navigate(-1);
      }
    }
  };

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
          setTimeout(() => {
            updateDropdownPosition();
            setShowPartySuggestions(true);
          }, 100);
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

  // Search suppliers with debouncing
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

  // Update dropdown position on scroll/resize
  useEffect(() => {
    const handlePositionUpdate = () => {
      if (showPartySuggestions) {
        updateDropdownPosition();
      }
    };

    window.addEventListener("scroll", handlePositionUpdate, true);
    window.addEventListener("resize", handlePositionUpdate);

    return () => {
      window.removeEventListener("scroll", handlePositionUpdate, true);
      window.removeEventListener("resize", handlePositionUpdate);
    };
  }, [showPartySuggestions, updateDropdownPosition]);

  // Generate document number
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

  // Handle input changes
  const handleInputChange = (field, value) => {
    onFormDataChange(field, value);

    if (field === "gstEnabled" || field === "invoiceType") {
      const newInvoiceType =
        field === "gstEnabled" ? (value ? "gst" : "non-gst") : value;
      const newDocumentNumber = generateDocumentNumber(newInvoiceType);
      onFormDataChange("invoiceNumber", newDocumentNumber);
    }
  };

  // Handle party search change
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

  // Handle party selection
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

  // FIXED: Better focus handler
  const handlePartyInputFocus = () => {
    setTimeout(() => {
      updateDropdownPosition();
      if (
        partySearchTerm.length >= 2 &&
        !isSelectingPartyRef.current &&
        !formData.customer
      ) {
        setShowPartySuggestions(true);
      }
    }, 150);
  };

  const handlePartyInputBlur = () => {
    if (!isSelectingPartyRef.current) {
      setTimeout(() => {
        if (!isSelectingPartyRef.current) {
          setShowPartySuggestions(false);
          setSelectedPartySuggestionIndex(-1);
        }
      }, 200);
    }
  };

  // Handle date input click
  const handleDateInputGroupClick = () => {
    if (dateInputRef.current) {
      dateInputRef.current.focus();
      dateInputRef.current.showPicker();
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showPartySuggestions) return;

    const totalOptions =
      filteredParties.length + (partySearchTerm.trim() ? 1 : 0);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedPartySuggestionIndex((prev) =>
          prev < totalOptions - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedPartySuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : totalOptions - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedPartySuggestionIndex >= 0) {
          if (selectedPartySuggestionIndex < filteredParties.length) {
            handlePartySelect(filteredParties[selectedPartySuggestionIndex]);
          } else {
            handleAddNewParty();
          }
        }
        break;
      case "Escape":
        setShowPartySuggestions(false);
        setSelectedPartySuggestionIndex(-1);
        break;
    }
  };

  const filteredParties = parties.filter(
    (party) =>
      party.name.toLowerCase().includes(partySearchTerm.toLowerCase()) ||
      party.phone.includes(partySearchTerm)
  );

  // Purchase-specific labels
  const getDocumentLabels = () => {
    if (isPurchaseOrdersMode) {
      return {
        documentNumber: labels.documentNumber || "Purchase Order Number",
        documentDate: labels.documentDate || "Order Date",
        documentIcon: faShoppingCart,
        documentType: "Purchase Order",
        formatPrefix: "PO",
        headerTitle: editMode ? "Edit Purchase Order" : "Create Purchase Order",
        headerSubtitle: editMode
          ? `Updating purchase order${
              formData.invoiceNumber ? ` ${formData.invoiceNumber}` : ""
            }`
          : "Create a new purchase order for your suppliers",
      };
    } else {
      return {
        documentNumber: labels.documentNumber || "Purchase Bill Number",
        documentDate: labels.documentDate || "Bill Date",
        documentIcon: faFileInvoice,
        documentType: "Purchase Bill",
        formatPrefix: "PB",
        headerTitle: editMode ? "Edit Purchase Bill" : "Create Purchase Bill",
        headerSubtitle: editMode
          ? `Updating purchase bill${
              formData.invoiceNumber ? ` ${formData.invoiceNumber}` : ""
            }`
          : "Record a new purchase transaction from suppliers",
      };
    }
  };

  const documentLabels = getDocumentLabels();

  if (!showHeader) {
    return null;
  }

  // REDESIGNED: Supplier Dropdown with Fixed Positioning
  const SupplierDropdown = () => {
    if (!showPartySuggestions || formData.customer) return null;

    return createPortal(
      <div
        className="bg-white border rounded shadow-lg"
        style={{
          position: "absolute",
          zIndex: 99999,
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
          maxHeight: "400px",
          overflowY: "auto",
          border: `2px solid ${purpleTheme.border}`,
          borderRadius: "12px",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.15)",
          backgroundColor: "white",
          minWidth: "320px",
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        {isLoadingParties ? (
          <div className="p-4 text-center">
            <Spinner
              size="sm"
              className="me-2"
              style={{color: purpleTheme.primary}}
            />
            <span className="text-muted">Searching suppliers...</span>
          </div>
        ) : filteredParties.length > 0 ? (
          <>
            {/* Header */}
            <div
              className="p-3 border-bottom fw-bold"
              style={{
                backgroundColor: purpleTheme.background,
                color: purpleTheme.text,
                borderBottom: `1px solid ${purpleTheme.border}`,
              }}
            >
              <FontAwesomeIcon icon={faTruck} className="me-2" />
              Found {filteredParties.length} supplier
              {filteredParties.length > 1 ? "s" : ""}
            </div>

            {/* Supplier List */}
            {filteredParties.slice(0, 8).map((party, index) => (
              <div
                key={party.id}
                className={`p-3 ${
                  index === selectedPartySuggestionIndex ? "text-white" : ""
                }`}
                style={{
                  cursor: "pointer",
                  borderBottom:
                    index === filteredParties.slice(0, 8).length - 1
                      ? "none"
                      : `1px solid ${purpleTheme.border}`,
                  transition: "all 0.2s ease",
                  backgroundColor:
                    index === selectedPartySuggestionIndex
                      ? purpleTheme.primary
                      : "transparent",
                }}
                onClick={() => handlePartySelect(party)}
                onMouseEnter={() => setSelectedPartySuggestionIndex(index)}
              >
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <div className="fw-bold mb-1">{party.name}</div>
                    <small
                      className={
                        index === selectedPartySuggestionIndex
                          ? "text-white-50"
                          : "text-muted"
                      }
                    >
                      {party.phone && (
                        <>
                          <FontAwesomeIcon icon={faPhone} className="me-1" />
                          {party.phone}
                        </>
                      )}
                      {party.gstNumber && ` | GST: ${party.gstNumber}`}
                      {party.balance !== 0 && ` | ₹${party.balance}`}
                    </small>
                  </div>
                  <FontAwesomeIcon
                    icon={faCheck}
                    className={`ms-2 ${
                      index === selectedPartySuggestionIndex
                        ? "text-white"
                        : "text-success"
                    }`}
                  />
                </div>
              </div>
            ))}

            {/* Create New Option */}
            {partySearchTerm.trim() && (
              <div
                className={`p-3 border-top ${
                  selectedPartySuggestionIndex === filteredParties.length
                    ? "text-white"
                    : ""
                }`}
                style={{
                  cursor: "pointer",
                  borderTop: `2px solid ${purpleTheme.border}`,
                  transition: "all 0.2s ease",
                  backgroundColor:
                    selectedPartySuggestionIndex === filteredParties.length
                      ? purpleTheme.success
                      : purpleTheme.background,
                }}
                onClick={handleAddNewParty}
                onMouseEnter={() =>
                  setSelectedPartySuggestionIndex(filteredParties.length)
                }
              >
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon
                    icon={faUserPlus}
                    className={`me-3 ${
                      selectedPartySuggestionIndex === filteredParties.length
                        ? "text-white"
                        : "text-success"
                    }`}
                  />
                  <div>
                    <div
                      className={`fw-bold ${
                        selectedPartySuggestionIndex === filteredParties.length
                          ? "text-white"
                          : "text-success"
                      }`}
                    >
                      Create "{partySearchTerm}"
                    </div>
                    <small
                      className={
                        selectedPartySuggestionIndex === filteredParties.length
                          ? "text-white-50"
                          : "text-muted"
                      }
                    >
                      Add this as a new supplier
                    </small>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-4">
            <div className="text-center text-muted mb-3">
              <FontAwesomeIcon
                icon={faUser}
                size="2x"
                className="mb-2 d-block"
              />
              <div className="fw-bold">No suppliers found</div>
              <small>for "{partySearchTerm}"</small>
            </div>

            {partySearchTerm.trim() && (
              <Button
                variant="outline-primary"
                size="sm"
                className="w-100"
                onClick={handleAddNewParty}
                style={{
                  borderColor: purpleTheme.primary,
                  color: purpleTheme.primary,
                  transition: "all 0.2s ease",
                }}
              >
                <FontAwesomeIcon icon={faUserPlus} className="me-2" />
                Create "{partySearchTerm}" as new supplier
              </Button>
            )}
          </div>
        )}
      </div>,
      document.body
    );
  };

  return (
    <Container fluid className="px-0">
      {/* Header with Back Button */}
      {showBackButton && (
        <div
          className="d-flex align-items-center mb-4 p-3 rounded-3"
          style={{
            background: `linear-gradient(135deg, ${purpleTheme.primary} 0%, ${purpleTheme.primaryLight} 100%)`,
            color: "white",
            boxShadow: `0 4px 20px rgba(${purpleTheme.primaryRgb}, 0.3)`,
          }}
        >
          <Button
            variant="link"
            onClick={handleBack}
            className="text-white p-0 me-3"
            style={{
              fontSize: "18px",
              textDecoration: "none",
              border: "none",
              background: "none",
            }}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </Button>
          <div>
            <h4 className="mb-1 fw-bold">{documentLabels.headerTitle}</h4>
            <small className="opacity-90">
              {documentLabels.headerSubtitle}
            </small>
          </div>
        </div>
      )}

      {/* Purchase Details Card */}
      <Card
        className="mb-4"
        style={{
          border: "none",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          overflow: "hidden",
        }}
      >
        {/* Card Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${purpleTheme.primary} 0%, ${purpleTheme.primaryLight} 100%)`,
            color: "white",
            padding: "20px 24px",
          }}
        >
          <div className="d-flex align-items-center">
            <FontAwesomeIcon
              icon={documentLabels.documentIcon}
              size="lg"
              className="me-3"
            />
            <h5 className="mb-0 fw-bold">
              {documentLabels.documentType} Details
            </h5>
          </div>
        </div>

        {/* Card Body */}
        <Card.Body style={{padding: "24px"}}>
          <Row className="g-4">
            {/* GST / Non GST */}
            <Col lg={6} md={6}>
              <Form.Group>
                <Form.Label className="d-flex align-items-center fw-bold text-primary mb-3">
                  <FontAwesomeIcon
                    icon={faFileInvoice}
                    className="me-2 text-info"
                  />
                  GST / Non GST *
                </Form.Label>
                <Form.Select
                  value={formData.gstEnabled ? "gst" : "non-gst"}
                  onChange={(e) =>
                    handleInputChange("gstEnabled", e.target.value === "gst")
                  }
                  style={getInputStyle("gstEnabled")}
                  disabled={disabled}
                  ref={(el) => (fieldRefs.current.gstType = el)}
                >
                  <option value="gst">GST Applicable</option>
                  <option value="non-gst">Non-GST</option>
                </Form.Select>
                {formData.gstEnabled && (
                  <div className="mt-2">
                    <Badge bg="success" className="me-2">
                      <FontAwesomeIcon icon={faCheck} className="me-1" />
                      GST will be calculated on items
                    </Badge>
                  </div>
                )}
                <small className="text-muted mt-1 d-block">
                  Select GST type for this{" "}
                  {documentLabels.documentType.toLowerCase()}
                </small>
              </Form.Group>
            </Col>

            {/* Date */}
            <Col lg={6} md={6}>
              <Form.Group>
                <Form.Label className="d-flex align-items-center fw-bold text-danger mb-3">
                  <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                  {documentLabels.documentDate} *
                </Form.Label>
                <InputGroup
                  onClick={handleDateInputGroupClick}
                  style={{cursor: "pointer"}}
                >
                  <Form.Control
                    type="date"
                    value={formData.invoiceDate || ""}
                    onChange={(e) =>
                      handleInputChange("invoiceDate", e.target.value)
                    }
                    style={getInputStyle("invoiceDate")}
                    disabled={disabled}
                    ref={(el) => {
                      fieldRefs.current.invoiceDate = el;
                      dateInputRef.current = el;
                    }}
                  />
                  <InputGroup.Text
                    style={{
                      backgroundColor: purpleTheme.surface,
                      borderColor: errors.invoiceDate
                        ? purpleTheme.error
                        : purpleTheme.border,
                      borderWidth: "2px",
                      cursor: "pointer",
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faCalendarAlt}
                      className="text-muted"
                    />
                  </InputGroup.Text>
                </InputGroup>
                <small className="text-muted mt-1 d-block">
                  📅 Date of {documentLabels.documentType.toLowerCase()}{" "}
                  creation
                </small>
              </Form.Group>
            </Col>

            {/* Expected Delivery Date (for Purchase Orders) */}
            {isPurchaseOrdersMode && (
              <Col lg={6} md={6}>
                <Form.Group>
                  <Form.Label className="d-flex align-items-center fw-bold text-warning mb-3">
                    <FontAwesomeIcon icon={faTruck} className="me-2" />
                    Expected Delivery Date
                  </Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="date"
                      value={formData.expectedDeliveryDate || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "expectedDeliveryDate",
                          e.target.value
                        )
                      }
                      style={getInputStyle("expectedDeliveryDate")}
                      disabled={disabled}
                    />
                    <InputGroup.Text
                      style={{
                        backgroundColor: purpleTheme.surface,
                        borderColor: purpleTheme.border,
                        borderWidth: "2px",
                      }}
                    >
                      <FontAwesomeIcon icon={faTruck} className="text-muted" />
                    </InputGroup.Text>
                  </InputGroup>
                  <small className="text-muted mt-1 d-block">
                    📅 When do you expect delivery from supplier?
                  </small>
                </Form.Group>
              </Col>
            )}

            {/* Document Number */}
            <Col lg={6} md={6}>
              <Form.Group>
                <Form.Label className="d-flex align-items-center fw-bold text-danger mb-3">
                  <FontAwesomeIcon icon={faReceipt} className="me-2" />
                  {documentLabels.documentNumber} *
                </Form.Label>
                <Form.Control
                  type="text"
                  value={formData.invoiceNumber || ""}
                  onChange={(e) =>
                    handleInputChange("invoiceNumber", e.target.value)
                  }
                  style={getInputStyle("invoiceNumber")}
                  placeholder={`Enter ${documentLabels.documentNumber.toLowerCase()}`}
                  disabled={disabled}
                  ref={(el) => (fieldRefs.current.invoiceNumber = el)}
                />
                {formData.invoiceNumber && (
                  <div className="mt-2">
                    <Badge bg="success">
                      <FontAwesomeIcon icon={faCheck} className="me-1" />
                      {documentLabels.formatPrefix}: {formData.invoiceNumber}
                    </Badge>
                  </div>
                )}
              </Form.Group>
            </Col>

            {/* Employee */}
            <Col lg={6} md={6}>
              <Form.Group>
                <Form.Label className="d-flex align-items-center fw-bold text-danger mb-3">
                  <FontAwesomeIcon icon={faUser} className="me-2" />
                  Employee *
                </Form.Label>
                <Form.Control
                  type="text"
                  value={
                    currentUser?.name || currentUser?.fullName || "Current User"
                  }
                  style={{
                    ...getInputStyle("employee"),
                    backgroundColor: "#e8f5e8",
                  }}
                  disabled
                />
                <div className="mt-2">
                  <Badge bg="success">
                    <FontAwesomeIcon icon={faCheck} className="me-1" />
                    Employee:{" "}
                    {currentUser?.name ||
                      currentUser?.fullName ||
                      "Current User"}{" "}
                    👤
                  </Badge>
                </div>
                <small className="text-success mt-1 d-block">
                  Employee creating this{" "}
                  {documentLabels.documentType.toLowerCase()}
                </small>
              </Form.Group>
            </Col>

            {/* Select Supplier - REDESIGNED WITH FIXED POSITIONING */}
            <Col lg={6} md={6}>
              <Form.Group className="position-relative">
                <Form.Label className="d-flex align-items-center fw-bold text-danger mb-3">
                  <FontAwesomeIcon icon={entityIcon} className="me-2" />
                  Select {EntityTypeCapitalized} *
                </Form.Label>

                <InputGroup
                  ref={partyInputGroupRef}
                  style={{
                    position: "relative",
                  }}
                >
                  <InputGroup.Text
                    style={{
                      backgroundColor: purpleTheme.surface,
                      borderColor: errors.customer
                        ? purpleTheme.error
                        : purpleTheme.border,
                      borderWidth: "2px",
                    }}
                  >
                    <FontAwesomeIcon icon={faSearch} className="text-muted" />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    value={partySearchTerm}
                    onChange={(e) => handlePartySearchChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{
                      ...getInputStyle("customer"),
                      backgroundColor: formData.customer ? "#e8f5e8" : "white",
                    }}
                    placeholder="Search supplier name, phone, or GST number..."
                    disabled={disabled}
                    ref={(el) => {
                      fieldRefs.current.partyName = el;
                      partyInputRef.current = el;
                    }}
                    onFocus={handlePartyInputFocus}
                    onBlur={handlePartyInputBlur}
                    autoComplete="off"
                  />

                  {isLoadingParties && (
                    <InputGroup.Text
                      style={{
                        backgroundColor: purpleTheme.surface,
                        borderColor: errors.customer
                          ? purpleTheme.error
                          : purpleTheme.border,
                        borderWidth: "2px",
                      }}
                    >
                      <Spinner size="sm" />
                    </InputGroup.Text>
                  )}

                  {formData.customer && (
                    <Button
                      variant="outline-danger"
                      onClick={clearPartySelection}
                      disabled={disabled}
                      style={{
                        borderColor: errors.customer
                          ? purpleTheme.error
                          : purpleTheme.border,
                        borderWidth: "2px",
                      }}
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </Button>
                  )}
                </InputGroup>

                {/* Selected Supplier Display */}
                {formData.customer && (
                  <div className="mt-2">
                    <Badge bg="success" className="me-2">
                      <FontAwesomeIcon icon={faCheck} className="me-1" />
                      Selected: {formData.customer.name}
                    </Badge>
                    {formData.customer.mobile && (
                      <Badge bg="info">
                        <FontAwesomeIcon icon={faPhone} className="me-1" />
                        {formData.customer.mobile}
                      </Badge>
                    )}
                  </div>
                )}

                {errors.customer && (
                  <div className="text-danger small mt-1">
                    <FontAwesomeIcon
                      icon={faExclamationTriangle}
                      className="me-1"
                    />
                    {errors.customer}
                  </div>
                )}
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Supplier Suggestions Dropdown using Portal - REDESIGNED */}
      <SupplierDropdown />

      {/* Add New Party Modal */}
      <AddNewParty
        show={showAddPartyModal}
        onHide={() => {
          setShowAddPartyModal(false);
          setQuickAddPartyData(null);
          setTimeout(() => {
            isSelectingPartyRef.current = false;
          }, 100);
        }}
        onPartyCreated={handlePartyCreated}
        companyId={companyId}
        addToast={addToast}
        currentUser={currentUser}
        initialData={quickAddPartyData}
        partyType={entityType}
        entityIcon={entityIcon}
        EntityTypeCapitalized={EntityTypeCapitalized}
      />
    </Container>
  );
}

export default PurchaseInvoiceHeader;
