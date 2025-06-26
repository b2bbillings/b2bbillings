import React, {useState, useEffect, useRef} from "react";
import {Row, Col, Form, Spinner, Button} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faUserPlus,
  faUser,
  faSpinner,
  faRefresh,
} from "@fortawesome/free-solid-svg-icons";
import partyService from "../../../../../services/partyService";
import saleOrderService from "../../../../../services/saleOrderService";
import authService from "../../../../../services/authService";
import AddNewParty from "../../../Party/AddNewParty";

function OrderFormHeader({
  formData,
  onFormDataChange,
  companyId,
  currentUser: propCurrentUser,
  currentCompany,
  addToast,
  errors = {},
  disabled = false,
}) {
  const [currentUser, setCurrentUser] = useState(propCurrentUser || null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [userError, setUserError] = useState(null);

  const [parties, setParties] = useState([]);
  const [isLoadingParties, setIsLoadingParties] = useState(false);
  const [partySearchTerm, setPartySearchTerm] = useState("");
  const [showPartySuggestions, setShowPartySuggestions] = useState(false);
  const [isGeneratingOrderNumber, setIsGeneratingOrderNumber] = useState(false);
  const [selectedPartySuggestionIndex, setSelectedPartySuggestionIndex] =
    useState(-1);

  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [quickAddPartyData, setQuickAddPartyData] = useState(null);

  const partyInputRef = useRef(null);
  const isSelectingPartyRef = useRef(false);
  const searchTimeoutRef = useRef(null);
  const shouldMaintainFocusRef = useRef(false);
  const cursorPositionRef = useRef(0); // ✅ NEW: Track cursor position

  const fieldRefs = useRef({
    gstType: null,
    deliveryDate: null,
    partyName: null,
    quotationDate: null,
  });

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

  const getUserDisplayInfo = () => {
    const user = currentUser || propCurrentUser;

    if (isLoadingUser) {
      return {
        displayText: "Loading user...",
        isLoading: true,
        hasUser: false,
      };
    }

    if (userError) {
      return {
        displayText: "User unavailable",
        isLoading: false,
        hasUser: false,
        error: userError,
      };
    }

    if (formData.employeeName) {
      return {
        displayText: formData.employeeName,
        isLoading: false,
        hasUser: true,
        user: user,
      };
    }

    if (user?.name) {
      return {
        displayText: user.name,
        isLoading: false,
        hasUser: true,
        user: user,
      };
    }

    return {
      displayText: "User information unavailable",
      isLoading: false,
      hasUser: false,
    };
  };

  const retryUserFetch = async () => {
    const user = await fetchCurrentUser();
    if (user) {
      autoFillUserData(user);
    }
  };

  // ✅ FIXED: Maintain focus and cursor position
  const maintainFocus = () => {
    if (partyInputRef.current && shouldMaintainFocusRef.current) {
      const currentPosition = cursorPositionRef.current;
      partyInputRef.current.focus();
      partyInputRef.current.setSelectionRange(currentPosition, currentPosition);
      shouldMaintainFocusRef.current = false;
    }
  };

  const loadParties = async (searchTerm = "") => {
    if (!companyId) return;

    try {
      setIsLoadingParties(true);

      const searchParams = {
        search: searchTerm.trim(),
        limit: searchTerm ? 50 : 20,
        type: "customer",
        page: 1,
        sortBy: "name",
        sortOrder: "asc",
        includeInactive: true,
      };

      const response = await partyService.getParties(companyId, searchParams);

      if (response.success) {
        const customerList = response.data?.parties || response.data || [];

        const formattedParties = customerList
          .filter(
            (customer) => customer && (customer.name || customer.partyName)
          )
          .map((customer) => ({
            id: customer._id || customer.id,
            name: customer.name || customer.partyName || "Unknown Customer",
            phone:
              customer.phoneNumber ||
              customer.phone ||
              customer.mobile ||
              customer.contactNumber ||
              "",
            email: customer.email || "",
            address:
              customer.homeAddressLine ||
              customer.address ||
              customer.billingAddress ||
              "",
            gstNumber: customer.gstNumber || "",
            balance:
              customer.currentBalance ||
              customer.balance ||
              customer.openingBalance ||
              0,
            type: customer.partyType || "customer",
            companyName: customer.companyName || "",
            creditLimit: customer.creditLimit || 0,
          }));

        setParties(formattedParties);

        if (
          searchTerm &&
          searchTerm.length >= 2 &&
          !isSelectingPartyRef.current
        ) {
          setShowPartySuggestions(true);
        }

        // ✅ FIXED: Maintain focus after loading parties
        setTimeout(maintainFocus, 10);
      } else {
        setParties([]);
      }
    } catch (error) {
      setParties([]);
    } finally {
      setIsLoadingParties(false);
    }
  };

  const generateOrderNumber = async () => {
    if (!companyId) return;

    try {
      setIsGeneratingOrderNumber(true);

      const response = await saleOrderService.generateOrderNumber(
        companyId,
        "quotation"
      );

      if (response.success && response.data?.nextOrderNumber) {
        onFormDataChange("quotationNumber", response.data.nextOrderNumber);
      } else {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const day = now.getDate().toString().padStart(2, "0");
        const hours = now.getHours().toString().padStart(2, "0");
        const minutes = now.getMinutes().toString().padStart(2, "0");
        const seconds = now.getSeconds().toString().padStart(2, "0");

        const fallbackNumber = `QUO-${year}${month}${day}-${hours}${minutes}${seconds}`;
        onFormDataChange("quotationNumber", fallbackNumber);
      }
    } catch (error) {
      const timestamp = Date.now().toString();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const emergencyNumber = `QUO-${timestamp.slice(-8)}-${randomNum}`;

      onFormDataChange("quotationNumber", emergencyNumber);
    } finally {
      setIsGeneratingOrderNumber(false);
    }
  };

  const focusNextField = (currentField) => {
    const fieldOrder = [
      "gstType",
      "deliveryDate",
      "partyName",
      "quotationDate",
    ];
    const currentIndex = fieldOrder.indexOf(currentField);

    if (currentIndex < fieldOrder.length - 1) {
      const nextField = fieldOrder[currentIndex + 1];
      const nextFieldRef = fieldRefs.current[nextField];
      if (nextFieldRef) {
        nextFieldRef.focus();
        if (nextFieldRef.select) nextFieldRef.select();
      }
    } else {
      const firstProductInput = document.querySelector(
        '[data-product-input="0"]'
      );
      if (firstProductInput) {
        firstProductInput.focus();
      }
    }
  };

  const handleFieldKeyDown = (e, fieldName) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (fieldName === "partyName") {
        if (showPartySuggestions && selectedPartySuggestionIndex >= 0) {
          const filteredParties = getFilteredParties();

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

  const handlePartySearchKeyDown = (e) => {
    if (!showPartySuggestions) {
      handleFieldKeyDown(e, "partyName");
      return;
    }

    const filteredParties = getFilteredParties();
    const totalOptions = filteredParties.length + 1;

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
        } else if (selectedPartySuggestionIndex === filteredParties.length) {
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

  const handleAddNewParty = () => {
    isSelectingPartyRef.current = true;
    setQuickAddPartyData({
      name: partySearchTerm || "",
      type: "customer",
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
      type: newParty.partyType || "customer",
      companyName: newParty.companyName || "",
      creditLimit: newParty.creditLimit || 0,
    };

    handlePartySelect(formattedParty);
    setParties((prev) => [formattedParty, ...prev]);
    setShowAddPartyModal(false);
    setShowPartySuggestions(false);

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

  // ✅ FIXED: Party search change handler with proper focus management
  const handlePartySearchChange = (value) => {
    if (isSelectingPartyRef.current) {
      return;
    }

    // ✅ Store cursor position before any state changes
    if (partyInputRef.current) {
      cursorPositionRef.current =
        partyInputRef.current.selectionStart || value.length;
    }

    const shouldShowSuggestions = value.length >= 2;

    setPartySearchTerm(value);
    onFormDataChange("partyName", value);

    // Clear selected party if search term changes
    if (formData.selectedParty && value !== formData.partyName) {
      onFormDataChange("selectedParty", "");
      onFormDataChange("partyPhone", "");
      onFormDataChange("partyEmail", "");
      onFormDataChange("partyAddress", "");
      onFormDataChange("partyGstNumber", "");
    }

    if (shouldShowSuggestions) {
      setShowPartySuggestions(true);
      shouldMaintainFocusRef.current = true; // ✅ Mark to maintain focus
    } else {
      setShowPartySuggestions(false);
      setSelectedPartySuggestionIndex(-1);
    }

    // ✅ Use setTimeout to maintain focus after React updates
    setTimeout(() => {
      if (
        partyInputRef.current &&
        document.activeElement !== partyInputRef.current
      ) {
        partyInputRef.current.focus();
        partyInputRef.current.setSelectionRange(
          cursorPositionRef.current,
          cursorPositionRef.current
        );
      }
    }, 0);
  };

  const handlePartySelect = (party) => {
    isSelectingPartyRef.current = true;

    onFormDataChange("selectedParty", party.id);
    onFormDataChange("partyName", party.name);
    onFormDataChange("partyPhone", party.phone);
    onFormDataChange("partyEmail", party.email);
    onFormDataChange("partyAddress", party.address);
    onFormDataChange("partyGstNumber", party.gstNumber);

    setPartySearchTerm(party.name);
    setShowPartySuggestions(false);
    setSelectedPartySuggestionIndex(-1);

    setTimeout(() => {
      isSelectingPartyRef.current = false;
      const quotationDateRef = fieldRefs.current.quotationDate;
      if (quotationDateRef) {
        quotationDateRef.focus();
      }
    }, 200);
  };

  const clearPartySelection = () => {
    isSelectingPartyRef.current = true;

    onFormDataChange("selectedParty", "");
    onFormDataChange("partyName", "");
    onFormDataChange("partyPhone", "");
    onFormDataChange("partyEmail", "");
    onFormDataChange("partyAddress", "");
    onFormDataChange("partyGstNumber", "");
    setPartySearchTerm("");
    setShowPartySuggestions(false);

    setTimeout(() => {
      isSelectingPartyRef.current = false;
      if (partyInputRef.current) {
        partyInputRef.current.focus();
      }
    }, 100);
  };

  const handlePartyInputFocus = () => {
    if (
      partySearchTerm.length >= 2 &&
      !isSelectingPartyRef.current &&
      !formData.selectedParty
    ) {
      setShowPartySuggestions(true);
    }
  };

  // ✅ FIXED: Better blur handling
  const handlePartyInputBlur = (e) => {
    // Don't blur if clicking on suggestions
    const relatedTarget = e.relatedTarget;
    const suggestionsContainer = document.querySelector(
      ".party-suggestions-container"
    );

    if (
      relatedTarget &&
      suggestionsContainer &&
      suggestionsContainer.contains(relatedTarget)
    ) {
      e.preventDefault();
      // ✅ Immediately refocus the input
      setTimeout(() => {
        if (partyInputRef.current) {
          partyInputRef.current.focus();
        }
      }, 0);
      return;
    }

    if (!isSelectingPartyRef.current) {
      setTimeout(() => {
        if (!isSelectingPartyRef.current && !shouldMaintainFocusRef.current) {
          setShowPartySuggestions(false);
          setSelectedPartySuggestionIndex(-1);
        }
      }, 200);
    }
  };

  const getFilteredParties = () => {
    if (!partySearchTerm || partySearchTerm.length < 2) {
      return [];
    }

    const searchLower = partySearchTerm.toLowerCase().trim();

    return parties
      .filter((party) => {
        const nameMatch = party.name.toLowerCase().includes(searchLower);
        const phoneMatch = party.phone.includes(partySearchTerm);
        const emailMatch = party.email.toLowerCase().includes(searchLower);
        const companyMatch = party.companyName
          .toLowerCase()
          .includes(searchLower);

        return nameMatch || phoneMatch || emailMatch || companyMatch;
      })
      .slice(0, 8);
  };

  const handleInputChange = (field, value) => {
    onFormDataChange(field, value);

    if (field === "gstType") {
      onFormDataChange("_gstTypeChanged", Date.now());
    }
  };

  // ✅ EFFECTS
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

      if (!formData.quotationNumber || formData.quotationNumber.trim() === "") {
        setTimeout(() => {
          generateOrderNumber();
        }, 500);
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

  // ✅ FIXED: Search timeout with better focus management
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (partySearchTerm.length >= 2 && !isSelectingPartyRef.current) {
      shouldMaintainFocusRef.current = true; // ✅ Mark to maintain focus
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          await loadParties(partySearchTerm);
        } catch (error) {
          console.error("Search failed:", error);
        }
      }, 300);
    } else if (partySearchTerm.length === 0) {
      setShowPartySuggestions(false);
      setSelectedPartySuggestionIndex(-1);
      loadParties();
    } else if (partySearchTerm.length === 1) {
      setShowPartySuggestions(false);
      setSelectedPartySuggestionIndex(-1);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [partySearchTerm, companyId]);

  const filteredParties = getFilteredParties();
  const userDisplayInfo = getUserDisplayInfo();

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

  return (
    <div className="order-form-header">
      <Row className="mb-3">
        {/* Left Column */}
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label
              className="fw-bold text-danger"
              style={{fontSize: "14px"}}
            >
              GST / Non GST *
            </Form.Label>
            <Form.Select
              ref={(el) => (fieldRefs.current.gstType = el)}
              value={formData.gstType || "gst"}
              onChange={(e) => handleInputChange("gstType", e.target.value)}
              onKeyDown={(e) => handleFieldKeyDown(e, "gstType")}
              className="border-2"
              style={{
                ...getInputStyleWithError("gstType"),
                backgroundColor:
                  formData.gstType === "gst" ? "#e8f5e8" : "#fff3e0",
              }}
              disabled={disabled}
              isInvalid={!!errors.gstType}
            >
              <option value="gst">GST</option>
              <option value="non-gst">Non GST</option>
            </Form.Select>
            {errors.gstType && (
              <Form.Control.Feedback type="invalid" style={{fontSize: "12px"}}>
                {errors.gstType}
              </Form.Control.Feedback>
            )}
            <Form.Text className="text-info" style={{fontSize: "12px"}}>
              {formData.gstType === "gst"
                ? "✅ GST will be calculated"
                : "⚠️ GST will not be applied"}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label
              className="fw-bold text-danger"
              style={{fontSize: "14px"}}
            >
              Delivery Date
            </Form.Label>
            <Form.Control
              ref={(el) => (fieldRefs.current.deliveryDate = el)}
              type="date"
              value={formData.deliveryDate || ""}
              onChange={(e) =>
                handleInputChange("deliveryDate", e.target.value)
              }
              onKeyDown={(e) => handleFieldKeyDown(e, "deliveryDate")}
              className="border-2"
              style={{
                ...getInputStyleWithError("deliveryDate"),
                cursor: "pointer",
              }}
              disabled={disabled}
              isInvalid={!!errors.deliveryDate}
              min={new Date().toISOString().split("T")[0]}
            />
            {errors.deliveryDate && (
              <Form.Control.Feedback type="invalid" style={{fontSize: "12px"}}>
                {errors.deliveryDate}
              </Form.Control.Feedback>
            )}
          </Form.Group>

          <Form.Group className="position-relative">
            <Form.Label
              className="fw-bold text-danger"
              style={{fontSize: "14px"}}
            >
              Select Party *
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
                style={getInputStyleWithError("partyName")}
                placeholder="Type at least 2 characters to search customers..."
                disabled={disabled || isLoadingParties}
                isInvalid={!!errors.partyName}
                autoComplete="off"
              />

              {isLoadingParties && (
                <div className="position-absolute top-50 end-0 translate-middle-y me-2">
                  <Spinner size="sm" />
                </div>
              )}
            </div>

            {/* ✅ FIXED: Suggestions dropdown with better event handling */}
            {showPartySuggestions &&
              !formData.selectedParty &&
              partySearchTerm.length >= 2 && (
                <div
                  className="party-suggestions-container position-absolute w-100 bg-white border border-2 rounded mt-1 shadow-lg"
                  style={{
                    zIndex: 1000,
                    maxHeight: "200px",
                    overflowY: "auto",
                    borderColor: "#000",
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault(); // ✅ Prevent blur when clicking in suggestions area
                  }}
                >
                  {filteredParties.length > 0 ? (
                    <>
                      {filteredParties.map((party, index) => (
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
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePartySelect(party);
                          }}
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
                            {party.email && (
                              <span className="ms-2">✉️ {party.email}</span>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Add New Customer Option */}
                      <div
                        className={`p-2 cursor-pointer bg-light border-top ${
                          selectedPartySuggestionIndex ===
                          filteredParties.length
                            ? "bg-primary text-white"
                            : ""
                        }`}
                        style={{
                          fontSize: "12px",
                          cursor: "pointer",
                          transition: "background-color 0.2s",
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddNewParty();
                        }}
                        onMouseEnter={() =>
                          setSelectedPartySuggestionIndex(
                            filteredParties.length
                          )
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
                            Add New Customer "{partySearchTerm}"
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div
                      className="p-3 text-center text-muted"
                      style={{fontSize: "12px"}}
                    >
                      No customers found for "{partySearchTerm}"
                      <div className="mt-2">
                        <button
                          className="btn btn-sm btn-outline-success"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAddNewParty();
                          }}
                        >
                          <FontAwesomeIcon icon={faUserPlus} className="me-1" />
                          Add "{partySearchTerm}" as new customer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            {/* Selected party display */}
            {formData.selectedParty && formData.partyName && (
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
                      ✅ {formData.partyName}
                    </div>
                    {formData.partyPhone && (
                      <div className="text-muted" style={{fontSize: "11px"}}>
                        📞 {formData.partyPhone}
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

            {errors.partyName && (
              <div
                className="invalid-feedback d-block"
                style={{fontSize: "12px"}}
              >
                {errors.partyName}
              </div>
            )}
          </Form.Group>
        </Col>

        {/* Right Column */}
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label
              className="fw-bold text-danger"
              style={{fontSize: "14px"}}
            >
              Date *
            </Form.Label>
            <Form.Control
              ref={(el) => (fieldRefs.current.quotationDate = el)}
              type="date"
              value={
                formData.quotationDate || new Date().toISOString().split("T")[0]
              }
              onChange={(e) =>
                handleInputChange("quotationDate", e.target.value)
              }
              onKeyDown={(e) => handleFieldKeyDown(e, "quotationDate")}
              className="border-2"
              style={getInputStyleWithError("quotationDate")}
              disabled={disabled}
              isInvalid={!!errors.quotationDate}
            />
            {errors.quotationDate && (
              <Form.Control.Feedback type="invalid" style={{fontSize: "12px"}}>
                {errors.quotationDate}
              </Form.Control.Feedback>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label
              className="fw-bold text-danger"
              style={{fontSize: "14px"}}
            >
              Quotation No. *
              {!formData.quotationNumber && (
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 ms-2 text-decoration-none"
                  style={{fontSize: "12px"}}
                  onClick={generateOrderNumber}
                  disabled={isGeneratingOrderNumber}
                >
                  Generate Now
                </Button>
              )}
            </Form.Label>
            <div className="position-relative">
              <Form.Control
                type="text"
                value={formData.quotationNumber || ""}
                className="border-2"
                style={{
                  ...getInputStyleWithError("quotationNumber"),
                  backgroundColor: isGeneratingOrderNumber
                    ? "#f8f9fa"
                    : "#e9ecef",
                }}
                disabled
                readOnly
                isInvalid={!!errors.quotationNumber}
                placeholder={
                  isGeneratingOrderNumber
                    ? "Auto-generating..."
                    : "Will be generated automatically"
                }
              />
              {isGeneratingOrderNumber && (
                <div className="position-absolute top-50 end-0 translate-middle-y me-2">
                  <Spinner size="sm" />
                </div>
              )}
            </div>
            {formData.quotationNumber && (
              <Form.Text className="text-success" style={{fontSize: "12px"}}>
                ✅ Order number generated successfully
              </Form.Text>
            )}
            {errors.quotationNumber && (
              <Form.Control.Feedback type="invalid" style={{fontSize: "12px"}}>
                {errors.quotationNumber}
              </Form.Control.Feedback>
            )}
          </Form.Group>

          <Form.Group>
            <Form.Label
              className="fw-bold text-danger d-flex align-items-center"
              style={{fontSize: "14px"}}
            >
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

            <div className="position-relative">
              <Form.Control
                type="text"
                value={userDisplayInfo.displayText}
                className={`border-2 ${
                  userDisplayInfo.hasUser
                    ? "bg-light"
                    : "bg-warning bg-opacity-25"
                }`}
                style={{
                  ...inputStyle,
                  borderColor: errors.employeeName
                    ? "#dc3545"
                    : userDisplayInfo.hasUser
                    ? "#28a745"
                    : "#ffc107",
                }}
                readOnly
                disabled={disabled}
                isInvalid={!!errors.employeeName}
                placeholder={
                  isLoadingUser
                    ? "Loading user..."
                    : "User information will appear here"
                }
              />

              {isLoadingUser && (
                <div className="position-absolute top-50 end-0 translate-middle-y me-2">
                  <Spinner size="sm" />
                </div>
              )}
            </div>

            {userDisplayInfo.hasUser && !isLoadingUser && (
              <Form.Text
                className="text-success d-block"
                style={{fontSize: "12px"}}
              >
                ✅ Employee: {userDisplayInfo.displayText}
                {userDisplayInfo.user?.role && (
                  <span className="ms-2 badge bg-success bg-opacity-25 text-success">
                    {userDisplayInfo.user.role}
                  </span>
                )}
              </Form.Text>
            )}

            {isLoadingUser && (
              <Form.Text
                className="text-info d-block"
                style={{fontSize: "12px"}}
              >
                <FontAwesomeIcon icon={faSpinner} className="me-1" spin />
                Loading user information...
              </Form.Text>
            )}

            {userError && !isLoadingUser && (
              <Form.Text
                className="text-warning d-block"
                style={{fontSize: "12px"}}
              >
                ⚠️ {userError}. Click "Retry" to fetch again.
              </Form.Text>
            )}

            {!userDisplayInfo.hasUser && !isLoadingUser && !userError && (
              <Form.Text
                className="text-muted d-block"
                style={{fontSize: "12px"}}
              >
                ℹ️ User information will be auto-filled when available
              </Form.Text>
            )}

            {errors.employeeName && (
              <Form.Control.Feedback type="invalid" style={{fontSize: "12px"}}>
                {errors.employeeName}
              </Form.Control.Feedback>
            )}
          </Form.Group>
        </Col>
      </Row>

      {showAddPartyModal && (
        <AddNewParty
          show={showAddPartyModal}
          onHide={() => setShowAddPartyModal(false)}
          companyId={companyId}
          currentUser={currentUser || propCurrentUser}
          onPartyCreated={handlePartyCreated}
          quickAddData={quickAddPartyData}
          addToast={addToast}
        />
      )}
    </div>
  );
}

export default OrderFormHeader;
