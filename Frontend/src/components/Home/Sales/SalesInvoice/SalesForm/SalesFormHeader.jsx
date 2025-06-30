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
  faArrowLeft,
  faCheckCircle,
  faEdit,
  faSave,
  faClipboard,
  faCheck,
  faReceipt,
  faFileContract,
  faEye,
  faCog,
} from "@fortawesome/free-solid-svg-icons";
import {useNavigate} from "react-router-dom";
import partyService from "../../../../../services/partyService";
import salesService from "../../../../../services/salesService";
import AddNewParty from "../../../Party/AddNewParty";

function SalesFormHeader({
  formData,
  onFormDataChange,
  companyId,
  currentUser,
  currentCompany,
  addToast,
  errors = {},
  disabled = false,
  mode = "invoices",
  documentType = "invoice",
  isQuotationsMode = false,
  labels = {},
  isPageMode = false,
  hasUnsavedChanges = false,
  editMode = false,
  onBack,
  showHeader = true,
  showBackButton = true,
  // ✅ NEW: Props for model-based invoice number helpers
  getInvoiceNumberPlaceholder,
  getInvoiceNumberDisplayInfo,
}) {
  const navigate = useNavigate();

  const entityType = "customer";
  const EntityTypeCapitalized = "Customer";
  const entityIcon = faUser;

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

  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [quickAddPartyData, setQuickAddPartyData] = useState(null);

  // ✅ NEW: Invoice number preview state
  const [invoiceNumberPreview, setInvoiceNumberPreview] = useState("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  const partyInputRef = useRef(null);
  const partyInputGroupRef = useRef(null);
  const isSelectingPartyRef = useRef(false);
  const searchTimeoutRef = useRef(null);
  const dateInputRef = useRef(null);

  const fieldRefs = useRef({
    gstType: null,
    partyName: null,
    invoiceNumber: null,
    invoiceDate: null,
  });

  const getTheme = () => {
    return isQuotationsMode
      ? {
          primary: "#0ea5e9",
          primaryLight: "#38bdf8",
          primaryDark: "#0284c7",
          primaryRgb: "14, 165, 233",
          secondary: "#38bdf8",
          accent: "#0ea5e9",
          background: "#f0f9ff",
          surface: "#ffffff",
          success: "#10b981",
          warning: "#f59e0b",
          error: "#ef4444",
          text: "#1e293b",
          textMuted: "#64748b",
          border: "#e2e8f0",
          borderDark: "#cbd5e1",
        }
      : {
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
  };

  const theme = getTheme();

  const getInputStyle = (fieldName) => ({
    borderColor: errors[fieldName] ? theme.error : theme.border,
    fontSize: "14px",
    padding: "10px 14px",
    height: "42px",
    borderWidth: "1px",
    borderRadius: "0",
    transition: "all 0.2s ease",
    backgroundColor: theme.surface,
    boxShadow: errors[fieldName]
      ? `0 0 0 2px rgba(239, 68, 68, 0.1)`
      : `0 0 0 0px rgba(${theme.primaryRgb}, 0.1)`,
  });

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

  const loadInvoiceNumberPreview = useCallback(
    async (gstEnabledOverride = null) => {
      if (editMode || !companyId) {
        return;
      }

      try {
        setIsLoadingPreview(true);
        setPreviewError(null);

        // ✅ Use override value if provided, otherwise use formData
        const gstEnabled =
          gstEnabledOverride !== null
            ? gstEnabledOverride
            : formData.gstEnabled;
        const invoiceType = gstEnabled ? "gst" : "non-gst";

        console.log("🔢 Loading invoice number preview:", {
          companyId,
          invoiceType,
          gstEnabled,
          gstEnabledOverride,
          editMode,
        });

        // ✅ TRY: API endpoint first (but expect it to fail for now)
        try {
          const response = await salesService.getNextInvoiceNumber({
            companyId,
            invoiceType,
          });

          if (response.success && response.data?.previewInvoiceNumber) {
            setInvoiceNumberPreview(response.data.previewInvoiceNumber);
            console.log(
              "✅ Preview loaded from API:",
              response.data.previewInvoiceNumber
            );
            return;
          }
        } catch (apiError) {
          console.log("⚠️ API endpoint not available, using pattern fallback");
        }

        // ✅ FALLBACK: Use pattern method (if available)
        try {
          if (salesService.getInvoiceNumberPatternInfo) {
            const patternInfo = salesService.getInvoiceNumberPatternInfo(
              companyId,
              invoiceType
            );
            if (patternInfo?.data?.example || patternInfo?.example) {
              const example = patternInfo.data?.example || patternInfo.example;
              setInvoiceNumberPreview(example);
              console.log("✅ Preview loaded from pattern:", example);
              setPreviewError("Using pattern preview");
              return;
            }
          }
        } catch (patternError) {
          console.log("⚠️ Pattern method failed, using manual fallback");
        }

        // ✅ LAST RESORT: Manual fallback pattern with correct GST setting
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        const gstPrefix = gstEnabled ? "GST-" : "";
        const fallbackPreview = `INV-${gstPrefix}${year}${month}${day}-XXXX`;

        setInvoiceNumberPreview(fallbackPreview);
        setPreviewError("Using fallback pattern");
        console.log("✅ Using manual fallback pattern:", fallbackPreview);
      } catch (error) {
        console.error("❌ Error loading invoice number preview:", error);
        setPreviewError(error.message || "Preview failed");

        // ✅ EMERGENCY FALLBACK: Simple pattern with correct GST setting
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        const gstEnabled =
          gstEnabledOverride !== null
            ? gstEnabledOverride
            : formData.gstEnabled;
        const gstPrefix = gstEnabled ? "GST-" : "";
        const emergencyPreview = `INV-${gstPrefix}${year}${month}${day}-XXXX`;
        setInvoiceNumberPreview(emergencyPreview);
      } finally {
        setIsLoadingPreview(false);
      }
    },
    [companyId, formData.gstEnabled, editMode]
  );

  // ✅ FIXED: Update handleInputChange to pass the new GST value immediately
  const handleInputChange = (field, value) => {
    // ✅ Handle GST change with immediate preview update
    if (field === "gstEnabled" && !editMode) {
      // Clear current preview
      setInvoiceNumberPreview("");
      setIsLoadingPreview(true);

      // Update form data first
      onFormDataChange(field, value);

      // Load preview with the new GST value immediately
      setTimeout(() => {
        loadInvoiceNumberPreview(value); // ✅ Pass the new gstEnabled value directly
      }, 50);

      return; // ✅ Return early to avoid calling onFormDataChange twice
    }

    onFormDataChange(field, value);
  };

  // ✅ Load preview when component mounts or GST setting changes
  useEffect(() => {
    if (!editMode && companyId) {
      loadInvoiceNumberPreview();
    }
  }, [loadInvoiceNumberPreview]);

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
        if (isQuotationsMode) {
          navigate(`/companies/${companyId}/quotations`);
        } else {
          navigate(`/companies/${companyId}/sales-invoices`);
        }
      } else {
        navigate(-1);
      }
    }
  };

  useEffect(() => {
    if (formData.customer) {
      setPartySearchTerm(formData.customer.name || "");
    } else if (formData.mobileNumber) {
      setPartySearchTerm(formData.mobileNumber);
    }
  }, [formData.customer, formData.mobileNumber]);

  // Close customer dropdown when payment modals or other overlays open
  useEffect(() => {
    const handleModalOpen = () => {
      setShowPartySuggestions(false);
      setSelectedPartySuggestionIndex(-1);
    };

    // Listen for common modal/overlay events
    window.addEventListener("payment-modal-open", handleModalOpen);
    window.addEventListener("modal-open", handleModalOpen);

    return () => {
      window.removeEventListener("payment-modal-open", handleModalOpen);
      window.removeEventListener("modal-open", handleModalOpen);
    };
  }, []);

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
        const customerList = response.data?.parties || response.data || [];
        const formattedParties = customerList.map((customer) => ({
          id: customer._id || customer.id,
          name: customer.name || customer.partyName || "Unknown Customer",
          phone:
            customer.phoneNumber ||
            customer.phone ||
            customer.mobile ||
            customer.contactNumber ||
            "",
          email: customer.email || "",
          address: customer.homeAddressLine || customer.address || "",
          gstNumber: customer.gstNumber || "",
          balance:
            customer.currentBalance ||
            customer.balance ||
            customer.openingBalance ||
            0,
          type: customer.partyType || entityType,
          companyName: customer.companyName || "",
          creditLimit: customer.creditLimit || 0,
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

  useEffect(() => {
    if (companyId) {
      loadParties();
    }
  }, [companyId]);

  useEffect(() => {
    const handlePositionUpdate = () => {
      if (showPartySuggestions) {
        updateDropdownPosition();
      }
    };

    // ✅ FIXED: Proper event target checking
    const handleScroll = (e) => {
      // ✅ Safe check for event target and closest method
      if (e && e.target && typeof e.target.closest === "function") {
        // Close dropdown on scroll unless it's the dropdown itself
        if (!e.target.closest('[data-dropdown="customer-suggestions"]')) {
          setShowPartySuggestions(false);
        }
      } else {
        // ✅ Fallback: Close dropdown on any scroll if we can't check target
        setShowPartySuggestions(false);
      }
      handlePositionUpdate();
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handlePositionUpdate);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handlePositionUpdate);
    };
  }, [showPartySuggestions, updateDropdownPosition]);

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

  const handlePartySelect = (party) => {
    isSelectingPartyRef.current = true;

    const customerData = {
      id: party.id,
      _id: party.id,
      name: party.name,
      mobile: party.phone,
      email: party.email,
      address: party.address,
      gstNumber: party.gstNumber,
      companyName: party.companyName,
    };

    onFormDataChange("customer", customerData);
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

  const handleAddNewParty = () => {
    isSelectingPartyRef.current = true;
    setQuickAddPartyData({
      name: partySearchTerm || "",
      type: entityType,
    });
    setShowAddPartyModal(true);
    setShowPartySuggestions(false);
  };

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

  const handleDateInputGroupClick = () => {
    if (dateInputRef.current) {
      dateInputRef.current.focus();
      dateInputRef.current.showPicker();
    }
  };

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

  const getDocumentLabels = () => {
    if (isQuotationsMode) {
      return {
        documentNumber: labels.documentNumber || "Quotation Number",
        documentDate: labels.documentDate || "Quote Date",
        documentIcon: faFileContract,
        documentType: "Quotation",
        formatPrefix: "QUO",
        headerTitle: editMode ? "Edit Quotation" : "Create Quotation",
        headerSubtitle: editMode
          ? `Updating quotation${
              formData.invoiceNumber ? ` ${formData.invoiceNumber}` : ""
            }`
          : "Create a new quotation for your customers",
      };
    } else {
      return {
        documentNumber: labels.documentNumber || "Sales Invoice Number",
        documentDate: labels.documentDate || "Invoice Date",
        documentIcon: faFileInvoice,
        documentType: "Sales Invoice",
        formatPrefix: "INV",
        headerTitle: editMode ? "Edit Sales Invoice" : "Create Sales Invoice",
        headerSubtitle: editMode
          ? `Updating sales invoice${
              formData.invoiceNumber ? ` ${formData.invoiceNumber}` : ""
            }`
          : "Create a new sales invoice for your customers",
      };
    }
  };

  const documentLabels = getDocumentLabels();

  if (!showHeader) {
    return null;
  }

  const CustomerDropdown = () => {
    if (!showPartySuggestions || formData.customer) return null;

    return createPortal(
      <div
        className="bg-white border shadow-lg"
        data-dropdown="customer-suggestions"
        style={{
          position: "absolute",
          zIndex: 1050, // Lower z-index to avoid blocking other modals
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
          maxHeight: "400px",
          overflowY: "auto",
          border: `1px solid ${theme.border}`,
          borderRadius: "0",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          backgroundColor: "white",
          minWidth: "320px",
        }}
        onMouseDown={(e) => {
          // Only prevent default for dropdown items, not all interactions
          if (e.target.closest("[data-party-item]")) {
            e.preventDefault();
          }
        }}
      >
        {isLoadingParties ? (
          <div className="p-3 text-center">
            <Spinner
              size="sm"
              className="me-2"
              style={{color: theme.primary}}
            />
            <span className="text-muted">Searching customers...</span>
          </div>
        ) : filteredParties.length > 0 ? (
          <>
            <div
              className="p-2 border-bottom fw-bold"
              style={{
                backgroundColor: theme.background,
                color: theme.text,
                borderBottom: `1px solid ${theme.border}`,
              }}
            >
              <FontAwesomeIcon icon={faUser} className="me-2" />
              Found {filteredParties.length} customer
              {filteredParties.length > 1 ? "s" : ""}
            </div>

            {filteredParties.slice(0, 8).map((party, index) => (
              <div
                key={party.id}
                data-party-item="true"
                className={`p-2 ${
                  index === selectedPartySuggestionIndex ? "text-white" : ""
                }`}
                style={{
                  cursor: "pointer",
                  borderBottom:
                    index === filteredParties.slice(0, 8).length - 1
                      ? "none"
                      : `1px solid ${theme.border}`,
                  transition: "all 0.2s ease",
                  backgroundColor:
                    index === selectedPartySuggestionIndex
                      ? theme.primary
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

            {partySearchTerm.trim() && (
              <div
                data-party-item="true"
                className={`p-2 border-top ${
                  selectedPartySuggestionIndex === filteredParties.length
                    ? "text-white"
                    : ""
                }`}
                style={{
                  cursor: "pointer",
                  borderTop: `1px solid ${theme.border}`,
                  transition: "all 0.2s ease",
                  backgroundColor:
                    selectedPartySuggestionIndex === filteredParties.length
                      ? theme.success
                      : theme.background,
                }}
                onClick={handleAddNewParty}
                onMouseEnter={() =>
                  setSelectedPartySuggestionIndex(filteredParties.length)
                }
              >
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon
                    icon={faUserPlus}
                    className={`me-2 ${
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
                      Add this as a new customer
                    </small>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-3">
            <div className="text-center text-muted mb-2">
              <FontAwesomeIcon
                icon={faUser}
                size="2x"
                className="mb-2 d-block"
              />
              <div className="fw-bold">No customers found</div>
              <small>for "{partySearchTerm}"</small>
            </div>

            {partySearchTerm.trim() && (
              <Button
                variant="outline-primary"
                size="sm"
                className="w-100"
                onClick={handleAddNewParty}
                style={{
                  borderColor: theme.primary,
                  color: theme.primary,
                  transition: "all 0.2s ease",
                  borderRadius: "0",
                }}
              >
                <FontAwesomeIcon icon={faUserPlus} className="me-2" />
                Create "{partySearchTerm}" as new customer
              </Button>
            )}
          </div>
        )}
      </div>,
      document.body
    );
  };

  return (
    <>
      <style>
        {`
          /* Remove border radius from all components */
          .card,
          .card *,
          .btn,
          .btn *,
          .form-control,
          .form-select,
          .input-group-text,
          .badge,
          .dropdown-menu,
          .modal-content,
          .modal-header,
          .modal-body,
          .modal-footer,
          .alert {
            border-radius: 0 !important;
            -webkit-border-radius: 0 !important;
            -moz-border-radius: 0 !important;
            -ms-border-radius: 0 !important;
          }
          
          /* Bootstrap CSS variable overrides */
          * {
            --bs-border-radius: 0 !important;
            --bs-border-radius-sm: 0 !important;
            --bs-border-radius-lg: 0 !important;
            --bs-border-radius-xl: 0 !important;
            --bs-border-radius-2xl: 0 !important;
            --bs-border-radius-pill: 0 !important;
          }

          /* ✅ NEW: Slightly larger font for form labels */
          .form-label {
            font-size: 15px !important;
            font-weight: 600 !important;
          }
        `}
      </style>

      <Container fluid className="px-0">
        {showBackButton && (
          <div
            className="d-flex align-items-center mb-2 p-3"
            style={{
              background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryLight} 100%)`,
              color: "white",
              boxShadow: `0 4px 20px rgba(${theme.primaryRgb}, 0.3)`,
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

        <Card
          className="mb-2"
          style={{
            border: "none",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryLight} 100%)`,
              color: "white",
              padding: "16px 20px",
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

          <Card.Body style={{padding: "16px"}}>
            <Row className="g-2">
              <Col lg={6} md={6}>
                <Form.Group>
                  <Form.Label className="d-flex align-items-center fw-bold text-primary mb-2">
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
                    <div className="mt-1">
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

              <Col lg={6} md={6}>
                <Form.Group>
                  <Form.Label className="d-flex align-items-center fw-bold text-danger mb-2">
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
                        backgroundColor: theme.surface,
                        borderColor: errors.invoiceDate
                          ? theme.error
                          : theme.border,
                        borderWidth: "1px",
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

              {/* ✅ MOVED: Employee to 3rd position (previously Select Customer position) */}
              <Col lg={6} md={6}>
                <Form.Group>
                  <Form.Label className="d-flex align-items-center fw-bold text-danger mb-2">
                    <FontAwesomeIcon icon={faUser} className="me-2" />
                    Employee *
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={
                      currentUser?.name ||
                      currentUser?.fullName ||
                      "Current User"
                    }
                    style={{
                      ...getInputStyle("employee"),
                      backgroundColor: "#e8f5e8",
                    }}
                    disabled
                  />
                  <div className="mt-1">
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

              {/* ✅ UPDATED: Invoice Number Field with Model-Based Preview */}
              <Col lg={6} md={6}>
                <Form.Group>
                  <Form.Label className="d-flex align-items-center fw-bold text-danger mb-2">
                    <FontAwesomeIcon icon={faReceipt} className="me-2" />
                    {documentLabels.documentNumber} *
                  </Form.Label>

                  {/* ✅ NEW INVOICE: Show preview from fallback patterns */}
                  {!editMode ? (
                    <div>
                      <InputGroup>
                        <Form.Control
                          type="text"
                          value={
                            isLoadingPreview
                              ? "Loading preview..."
                              : invoiceNumberPreview || "Loading..."
                          }
                          style={{
                            ...getInputStyle("invoiceNumber"),
                            backgroundColor: "#f8f9fa",
                            color: "#6c757d",
                            fontWeight: "500",
                          }}
                          disabled
                          placeholder="Invoice number will be generated when saved"
                          title="This is a preview. Actual number will be generated when you save."
                        />
                        <InputGroup.Text
                          style={{
                            backgroundColor: "#f8f9fa",
                            borderColor: theme.border,
                            borderWidth: "1px",
                          }}
                        >
                          {isLoadingPreview ? (
                            <FontAwesomeIcon
                              icon={faSpinner}
                              spin
                              className="text-primary"
                            />
                          ) : (
                            <FontAwesomeIcon
                              icon={faEye}
                              className="text-primary"
                            />
                          )}
                        </InputGroup.Text>
                      </InputGroup>

                      <div className="mt-1">
                        <Badge bg="secondary" className="me-2">
                          <FontAwesomeIcon icon={faEye} className="me-1" />
                          Preview Mode
                        </Badge>
                        <Badge bg="primary">
                          <FontAwesomeIcon
                            icon={faFileInvoice}
                            className="me-1"
                          />
                          Save to Generate
                        </Badge>
                        {previewError && (
                          <Badge bg="warning" className="ms-2">
                            <FontAwesomeIcon
                              icon={faExclamationTriangle}
                              className="me-1"
                            />
                            {previewError.includes("pattern")
                              ? "Pattern"
                              : "Fallback"}
                          </Badge>
                        )}
                      </div>

                      <small className="text-muted mt-1 d-block">
                        🔢 Preview:{" "}
                        {isLoadingPreview
                          ? "Loading..."
                          : invoiceNumberPreview || "Will be auto-generated"}
                        {previewError && ` (${previewError})`}
                      </small>
                    </div>
                  ) : (
                    // ✅ EDIT MODE: Show actual model-generated number (read-only to preserve)
                    <div>
                      <InputGroup>
                        <Form.Control
                          type="text"
                          value={formData.invoiceNumber || ""}
                          style={{
                            ...getInputStyle("invoiceNumber"),
                            backgroundColor: "#e8f5e8",
                            fontWeight: "600",
                            color: "#0f5132",
                          }}
                          disabled // ✅ Always disabled in edit mode to preserve model-generated number
                          placeholder={`Edit ${documentLabels.documentNumber}`}
                          ref={(el) => (fieldRefs.current.invoiceNumber = el)}
                          title="Model-generated invoice number (preserved during edits)"
                        />
                        <InputGroup.Text
                          style={{
                            backgroundColor: "#e8f5e8",
                            borderColor: theme.border,
                            borderWidth: "1px",
                          }}
                        >
                          <FontAwesomeIcon
                            icon={faCog}
                            className="text-success"
                          />
                        </InputGroup.Text>
                      </InputGroup>

                      <div className="mt-1">
                        <Badge bg="success">
                          <FontAwesomeIcon icon={faCheck} className="me-1" />
                          {documentLabels.formatPrefix}:{" "}
                          {formData.invoiceNumber}
                        </Badge>
                        <Badge bg="info" className="ms-2">
                          <FontAwesomeIcon
                            icon={faCheckCircle}
                            className="me-1"
                          />
                          Model Generated
                        </Badge>
                      </div>

                      <small className="text-success mt-1 d-block">
                        ✅ System-generated number (preserved during edits)
                      </small>
                    </div>
                  )}
                </Form.Group>
              </Col>

              {/* ✅ MOVED: Select Customer to 5th position (previously Employee position) */}
              <Col lg={6} md={6}>
                <Form.Group className="position-relative">
                  <Form.Label className="d-flex align-items-center fw-bold text-danger mb-2">
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
                        backgroundColor: theme.surface,
                        borderColor: errors.customer
                          ? theme.error
                          : theme.border,
                        borderWidth: "1px",
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
                        backgroundColor: formData.customer
                          ? "#e8f5e8"
                          : "white",
                      }}
                      placeholder="Search customer name, phone, or GST number..."
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
                          backgroundColor: theme.surface,
                          borderColor: errors.customer
                            ? theme.error
                            : theme.border,
                          borderWidth: "1px",
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
                            ? theme.error
                            : theme.border,
                          borderWidth: "1px",
                        }}
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </Button>
                    )}
                  </InputGroup>

                  {formData.customer && (
                    <div className="mt-1">
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

        <CustomerDropdown />

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
    </>
  );
}

export default SalesFormHeader;
