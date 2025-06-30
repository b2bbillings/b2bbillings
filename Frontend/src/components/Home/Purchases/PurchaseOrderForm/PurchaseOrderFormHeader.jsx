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
  faTag,
  faShoppingCart,
} from "@fortawesome/free-solid-svg-icons";
import {useNavigate} from "react-router-dom";
import partyService from "../../../../services/partyService";
import purchaseOrderService from "../../../../services/purchaseOrderService";
import authService from "../../../../services/authService";
import AddNewParty from "../../Party/AddNewParty";

function PurchaseOrderFormHeader({
  formData,
  onFormDataChange,
  companyId,
  currentUser: propCurrentUser,
  currentCompany,
  addToast,
  errors = {},
  disabled = false,
  editMode = false,
  onBack,
  showHeader = true,
  showBackButton = true,
  hasUnsavedChanges = false,
}) {
  const navigate = useNavigate();

  const entityType = "supplier";
  const EntityTypeCapitalized = "Supplier";
  const entityIcon = faUserPlus;

  const [currentUser, setCurrentUser] = useState(propCurrentUser || null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [userError, setUserError] = useState(null);

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

  const [orderNumberPreview, setOrderNumberPreview] = useState("");
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
    purchaseOrderNumber: null,
    purchaseDate: null,
    deliveryDate: null,
  });

  const getTheme = () => {
    return {
      primary: "#6366f1",
      primaryLight: "#8b5cf6",
      primaryDark: "#4f46e5",
      primaryRgb: "99, 102, 241",
      secondary: "#6c757d",
      accent: "#8b5cf6",
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
    boxShadow: errors[fieldName] ? `0 0 0 2px rgba(239, 68, 68, 0.1)` : "none",
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

  const loadOrderNumberPreview = useCallback(
    async (gstTypeOverride = null) => {
      if (editMode || !companyId) {
        return;
      }

      try {
        setIsLoadingPreview(true);
        setPreviewError(null);

        const gstType =
          gstTypeOverride !== null ? gstTypeOverride : formData.gstType;

        try {
          const response = await purchaseOrderService.generateOrderNumber(
            companyId,
            formData.orderType || "purchase_order",
            currentUser?.id || propCurrentUser?.id,
            gstType
          );

          if (response.success && response.data?.nextOrderNumber) {
            const previewNumber = response.data.nextOrderNumber;
            setOrderNumberPreview(previewNumber);
            return;
          }
        } catch (apiError) {
          // Continue with fallback
        }

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        const dateStr = `${year}${month}${day}`;

        let companyPrefix = "PO";
        if (currentCompany) {
          if (currentCompany.code) {
            companyPrefix = currentCompany.code
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "")
              .substring(0, 6);
          } else if (currentCompany.businessName) {
            companyPrefix = currentCompany.businessName
              .replace(/[^A-Za-z]/g, "")
              .substring(0, 3)
              .toUpperCase();
          }
        }

        const gstPrefix = gstType === "gst" ? "GST-" : "NGST-";
        const localPreview = `${companyPrefix}-PO-${gstPrefix}${dateStr}-XXXX`;
        setOrderNumberPreview(localPreview);
        setPreviewError("Using pattern preview");
      } catch (error) {
        setPreviewError(error.message || "Preview failed");

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        const gstType =
          gstTypeOverride !== null ? gstTypeOverride : formData.gstType;
        const gstPrefix = gstType === "gst" ? "GST-" : "NGST-";
        const emergencyPreview = `PO-${gstPrefix}${year}${month}${day}-XXXX`;
        setOrderNumberPreview(emergencyPreview);
      } finally {
        setIsLoadingPreview(false);
      }
    },
    [
      companyId,
      formData.gstType,
      formData.orderType,
      editMode,
      currentCompany,
      currentUser,
      propCurrentUser,
    ]
  );

  const fetchCurrentUser = async () => {
    try {
      setIsLoadingUser(true);
      setUserError(null);

      const userResult = await authService.getCurrentUserSafe();
      if (userResult.success && userResult.user) {
        setCurrentUser(userResult.user);
        return userResult.user;
      }

      const storedUser = authService.getCurrentUser();
      if (storedUser) {
        setCurrentUser(storedUser);
        return storedUser;
      }

      const refreshResult = await authService.refreshCurrentUser();
      if (refreshResult.success && refreshResult.user) {
        setCurrentUser(refreshResult.user);
        return refreshResult.user;
      }

      setUserError("Unable to fetch user information");
      return null;
    } catch (error) {
      setUserError(error.message || "Failed to fetch user information");
      return null;
    } finally {
      setIsLoadingUser(false);
    }
  };

  const autoFillUserData = (user) => {
    if (user && !formData.employeeName) {
      const employeeInfo = authService.getUserEmployeeInfo();

      if (employeeInfo) {
        onFormDataChange("employeeName", employeeInfo.name);
        onFormDataChange("employeeId", employeeInfo.employeeId);
      } else {
        const employeeName =
          user.name || user.username || user.displayName || "";
        const employeeId = user.employeeId || user.id || user._id || "";

        if (employeeName) {
          onFormDataChange("employeeName", employeeName);
        }
        if (employeeId) {
          onFormDataChange("employeeId", employeeId);
        }
      }
    }
  };

  const retryUserFetch = async () => {
    const user = await fetchCurrentUser();
    if (user) {
      autoFillUserData(user);
    }
  };

  const handleInputChange = (field, value) => {
    if (field === "gstType" && !editMode) {
      setOrderNumberPreview("");
      setIsLoadingPreview(true);
      onFormDataChange(field, value);
      setTimeout(() => {
        loadOrderNumberPreview(value);
      }, 50);
      return;
    }

    onFormDataChange(field, value);
  };

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
        navigate(`/companies/${companyId}/purchase-orders`);
      } else {
        navigate(-1);
      }
    }
  };

  useEffect(() => {
    if (formData.partyName && formData.partyName !== partySearchTerm) {
      setPartySearchTerm(formData.partyName);
    }
  }, [formData.partyName]);

  useEffect(() => {
    if (!editMode && companyId) {
      loadOrderNumberPreview();
    }
  }, [loadOrderNumberPreview]);

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
            supplier.phoneNumber || supplier.phone || supplier.mobile || "",
          email: supplier.email || "",
          address: supplier.homeAddressLine || supplier.address || "",
          gstNumber: supplier.gstNumber || "",
          balance: supplier.currentBalance || supplier.balance || 0,
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

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (
      partySearchTerm.length >= 2 &&
      !isSelectingPartyRef.current &&
      !formData.selectedParty
    ) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          await loadParties(partySearchTerm);
        } catch (error) {
          // Handle error silently
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

      if (propCurrentUser) {
        setCurrentUser(propCurrentUser);
        autoFillUserData(propCurrentUser);
      } else if (!currentUser) {
        fetchCurrentUser().then((user) => {
          if (user) {
            autoFillUserData(user);
          }
        });
      } else {
        autoFillUserData(currentUser);
      }
    }
  }, [companyId, propCurrentUser]);

  useEffect(() => {
    if (propCurrentUser && propCurrentUser !== currentUser) {
      setCurrentUser(propCurrentUser);
      setUserError(null);
      autoFillUserData(propCurrentUser);
    }
  }, [propCurrentUser]);

  useEffect(() => {
    const handlePositionUpdate = () => {
      if (showPartySuggestions) {
        updateDropdownPosition();
      }
    };

    const handleScroll = (e) => {
      if (e && e.target && typeof e.target.closest === "function") {
        if (!e.target.closest('[data-dropdown="supplier-suggestions"]')) {
          setShowPartySuggestions(false);
        }
      } else {
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
    onFormDataChange("partyName", value);
    onFormDataChange("supplierName", value);

    if (formData.selectedParty && value !== formData.partyName) {
      onFormDataChange("selectedParty", "");
      onFormDataChange("supplier", "");
      onFormDataChange("partyPhone", "");
      onFormDataChange("supplierMobile", "");
      onFormDataChange("partyEmail", "");
      onFormDataChange("supplierEmail", "");
      onFormDataChange("partyAddress", "");
      onFormDataChange("partyGstNumber", "");
    }
  };

  const handlePartySelect = (party) => {
    isSelectingPartyRef.current = true;

    onFormDataChange("selectedParty", party.id);
    onFormDataChange("supplier", party.id);
    onFormDataChange("partyName", party.name);
    onFormDataChange("supplierName", party.name);
    onFormDataChange("partyPhone", party.phone);
    onFormDataChange("supplierMobile", party.phone);
    onFormDataChange("partyEmail", party.email);
    onFormDataChange("supplierEmail", party.email);
    onFormDataChange("partyAddress", party.address);
    onFormDataChange("partyGstNumber", party.gstNumber);

    setPartySearchTerm(party.name);
    setShowPartySuggestions(false);
    setSelectedPartySuggestionIndex(-1);

    setTimeout(() => {
      isSelectingPartyRef.current = false;
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
    onFormDataChange("selectedParty", "");
    onFormDataChange("supplier", "");
    onFormDataChange("partyName", "");
    onFormDataChange("supplierName", "");
    onFormDataChange("partyPhone", "");
    onFormDataChange("supplierMobile", "");
    onFormDataChange("partyEmail", "");
    onFormDataChange("supplierEmail", "");
    onFormDataChange("partyAddress", "");
    onFormDataChange("partyGstNumber", "");
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
        !formData.selectedParty
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
    return {
      documentNumber: "Purchase Order Number",
      documentDate: "Purchase Date",
      documentIcon: faShoppingCart,
      documentType: "Purchase Order",
      formatPrefix: "PO",
      headerTitle: editMode ? "Edit Purchase Order" : "Create Purchase Order",
      headerSubtitle: editMode
        ? `Updating purchase order${
            formData.purchaseOrderNumber
              ? ` ${formData.purchaseOrderNumber}`
              : ""
          }`
        : "Create a new purchase order for your suppliers",
    };
  };

  const documentLabels = getDocumentLabels();

  if (!showHeader) {
    return null;
  }

  const SupplierDropdown = () => {
    if (!showPartySuggestions || formData.selectedParty) return null;

    return createPortal(
      <div
        className="bg-white border shadow-lg"
        data-dropdown="supplier-suggestions"
        style={{
          position: "absolute",
          zIndex: 1050,
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
            <span className="text-muted">Searching suppliers...</span>
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
              <FontAwesomeIcon icon={faUserPlus} className="me-2" />
              Found {filteredParties.length} supplier
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
                      Add this as a new supplier
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
                icon={faUserPlus}
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
                  borderColor: theme.primary,
                  color: theme.primary,
                  transition: "all 0.2s ease",
                  borderRadius: "0",
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
    <>
      <style>
        {`
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
          
          * {
            --bs-border-radius: 0 !important;
            --bs-border-radius-sm: 0 !important;
            --bs-border-radius-lg: 0 !important;
            --bs-border-radius-xl: 0 !important;
            --bs-border-radius-2xl: 0 !important;
            --bs-border-radius-pill: 0 !important;
          }

          .form-label {
            font-size: 15px !important;
            font-weight: 600 !important;
          }
        `}
      </style>

      <Container
        fluid
        className="px-0"
        style={{maxWidth: "1200px", margin: "0 auto"}}
      >
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
                    <FontAwesomeIcon icon={faTag} className="me-2 text-info" />
                    GST / Non GST *
                  </Form.Label>
                  <Form.Select
                    value={formData.gstType || "gst"}
                    onChange={(e) =>
                      handleInputChange("gstType", e.target.value)
                    }
                    style={getInputStyle("gstType")}
                    disabled={disabled}
                    ref={(el) => (fieldRefs.current.gstType = el)}
                  >
                    <option value="gst">GST Applicable</option>
                    <option value="non-gst">Non-GST</option>
                  </Form.Select>
                  {formData.gstType === "gst" && (
                    <div className="mt-1">
                      <Badge bg="success" className="me-2">
                        <FontAwesomeIcon icon={faCheck} className="me-1" />
                        GST will be calculated on items
                      </Badge>
                    </div>
                  )}
                  <small className="text-muted mt-1 d-block">
                    Select GST type for this purchase order
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
                      value={
                        formData.purchaseDate ||
                        new Date().toISOString().split("T")[0]
                      }
                      onChange={(e) =>
                        handleInputChange("purchaseDate", e.target.value)
                      }
                      style={getInputStyle("purchaseDate")}
                      disabled={disabled}
                      ref={(el) => {
                        fieldRefs.current.purchaseDate = el;
                        dateInputRef.current = el;
                      }}
                    />
                    <InputGroup.Text
                      style={{
                        backgroundColor: theme.surface,
                        borderColor: errors.purchaseDate
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
                    📅 Date of purchase order creation
                  </small>
                </Form.Group>
              </Col>

              <Col lg={6} md={6}>
                <Form.Group>
                  <Form.Label className="d-flex align-items-center fw-bold text-danger mb-2">
                    <FontAwesomeIcon icon={faTruck} className="me-2" />
                    Expected Delivery Date
                  </Form.Label>
                  <InputGroup style={{cursor: "pointer"}}>
                    <Form.Control
                      type="date"
                      value={formData.deliveryDate || ""}
                      onChange={(e) =>
                        handleInputChange("deliveryDate", e.target.value)
                      }
                      style={getInputStyle("deliveryDate")}
                      disabled={disabled}
                      min={new Date().toISOString().split("T")[0]}
                      ref={(el) => (fieldRefs.current.deliveryDate = el)}
                    />
                    <InputGroup.Text
                      style={{
                        backgroundColor: theme.surface,
                        borderColor: errors.deliveryDate
                          ? theme.error
                          : theme.border,
                        borderWidth: "1px",
                        cursor: "pointer",
                      }}
                    >
                      <FontAwesomeIcon icon={faTruck} className="text-muted" />
                    </InputGroup.Text>
                  </InputGroup>
                  <small className="text-muted mt-1 d-block">
                    🚚 Expected delivery date for this order
                  </small>
                </Form.Group>
              </Col>

              <Col lg={6} md={6}>
                <Form.Group>
                  <Form.Label className="d-flex align-items-center fw-bold text-danger mb-2">
                    <FontAwesomeIcon icon={faReceipt} className="me-2" />
                    {documentLabels.documentNumber} *
                  </Form.Label>

                  {!editMode ? (
                    <div>
                      <InputGroup>
                        <Form.Control
                          type="text"
                          value={
                            isLoadingPreview
                              ? "Loading preview..."
                              : orderNumberPreview || "Loading..."
                          }
                          style={{
                            ...getInputStyle("purchaseOrderNumber"),
                            backgroundColor: "#f8f9fa",
                            color: "#6c757d",
                            fontWeight: "500",
                          }}
                          disabled
                          placeholder="Purchase order number will be generated when saved"
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

                      {/* ✅ REMOVED: Bottom text completely removed */}
                    </div>
                  ) : (
                    <div>
                      <InputGroup>
                        <Form.Control
                          type="text"
                          value={formData.purchaseOrderNumber || ""}
                          style={{
                            ...getInputStyle("purchaseOrderNumber"),
                            backgroundColor: "#e8f5e8",
                            fontWeight: "600",
                            color: "#0f5132",
                          }}
                          disabled
                          placeholder={`Edit ${documentLabels.documentNumber}`}
                          ref={(el) =>
                            (fieldRefs.current.purchaseOrderNumber = el)
                          }
                          title="Model-generated purchase order number (preserved during edits)"
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
                          {formData.purchaseOrderNumber}
                        </Badge>
                        <Badge bg="info" className="ms-2">
                          <FontAwesomeIcon
                            icon={faCheckCircle}
                            className="me-1"
                          />
                          Model Generated
                        </Badge>
                      </div>

                      {/* ✅ REMOVED: Bottom text completely removed */}
                    </div>
                  )}
                </Form.Group>
              </Col>

              {/* ✅ SWAPPED: Select Supplier moved to position 5 (before Employee) */}
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
                        borderColor: errors.partyName
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
                        ...getInputStyle("partyName"),
                        backgroundColor: formData.selectedParty
                          ? "#e8f5e8"
                          : "white",
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
                          backgroundColor: theme.surface,
                          borderColor: errors.partyName
                            ? theme.error
                            : theme.border,
                          borderWidth: "1px",
                        }}
                      >
                        <Spinner size="sm" />
                      </InputGroup.Text>
                    )}

                    {formData.selectedParty && (
                      <Button
                        variant="outline-danger"
                        onClick={clearPartySelection}
                        disabled={disabled}
                        style={{
                          borderColor: errors.partyName
                            ? theme.error
                            : theme.border,
                          borderWidth: "1px",
                        }}
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </Button>
                    )}
                  </InputGroup>

                  {formData.selectedParty && (
                    <div className="mt-1">
                      <Badge bg="success" className="me-2">
                        <FontAwesomeIcon icon={faCheck} className="me-1" />
                        Selected: {formData.partyName}
                      </Badge>
                      {formData.partyPhone && (
                        <Badge bg="info">
                          <FontAwesomeIcon icon={faPhone} className="me-1" />
                          {formData.partyPhone}
                        </Badge>
                      )}
                    </div>
                  )}

                  {errors.partyName && (
                    <div className="text-danger small mt-1">
                      <FontAwesomeIcon
                        icon={faExclamationTriangle}
                        className="me-1"
                      />
                      {errors.partyName}
                    </div>
                  )}
                </Form.Group>
              </Col>

              {/* ✅ SWAPPED: Employee moved to position 6 (after Select Supplier) */}
              <Col lg={6} md={6}>
                <Form.Group>
                  <Form.Label className="d-flex align-items-center fw-bold text-danger mb-2">
                    <FontAwesomeIcon icon={faUser} className="me-2" />
                    Employee *
                    {userError && (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 ms-2 text-decoration-none"
                        style={{fontSize: "12px"}}
                        onClick={retryUserFetch}
                        disabled={isLoadingUser}
                        title="Retry fetching user information"
                      >
                        <FontAwesomeIcon icon={faRefresh} className="me-1" />
                        Retry
                      </Button>
                    )}
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={
                      formData.employeeName ||
                      currentUser?.name ||
                      currentUser?.fullName ||
                      (isLoadingUser ? "Loading user..." : "Current User")
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
                      {formData.employeeName ||
                        currentUser?.name ||
                        currentUser?.fullName ||
                        "Current User"}{" "}
                      👤
                    </Badge>
                  </div>
                  <small className="text-muted mt-1 d-block">
                    Employee creating this purchase order
                  </small>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <SupplierDropdown />

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
          currentUser={currentUser || propCurrentUser}
          initialData={quickAddPartyData}
          partyType={entityType}
          entityIcon={entityIcon}
          EntityTypeCapitalized={EntityTypeCapitalized}
        />
      </Container>
    </>
  );
}

export default PurchaseOrderFormHeader;
