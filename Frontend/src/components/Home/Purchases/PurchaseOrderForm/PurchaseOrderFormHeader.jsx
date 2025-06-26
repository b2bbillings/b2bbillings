import React, {useState, useEffect, useRef} from "react";
import {Row, Col, Form, Spinner, Button, Card} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faUserPlus,
  faUser,
  faSpinner,
  faRefresh,
  faCalendarAlt,
  faFileInvoice,
  faTruck,
  faTag,
} from "@fortawesome/free-solid-svg-icons";
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
}) {
  const [currentUser, setCurrentUser] = useState(propCurrentUser || null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [userError, setUserError] = useState(null);

  // States for data loading
  const [parties, setParties] = useState([]);
  const [isLoadingParties, setIsLoadingParties] = useState(false);
  const [partySearchTerm, setPartySearchTerm] = useState("");
  const [showPartySuggestions, setShowPartySuggestions] = useState(false);
  const [isGeneratingOrderNumber, setIsGeneratingOrderNumber] = useState(false);
  const [selectedPartySuggestionIndex, setSelectedPartySuggestionIndex] =
    useState(-1);
  const [partyLoadError, setPartyLoadError] = useState(null);

  // Modal states for adding new party
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [quickAddPartyData, setQuickAddPartyData] = useState(null);

  // Refs for keyboard navigation
  const partyInputRef = useRef(null);
  const isSelectingPartyRef = useRef(false);
  const searchTimeoutRef = useRef(null);
  const shouldMaintainFocusRef = useRef(false);
  const cursorPositionRef = useRef(0);

  const fieldRefs = useRef({
    gstType: null,
    deliveryDate: null,
    partyName: null,
    purchaseDate: null,
  });

  // Initialize search term when formData.partyName changes
  useEffect(() => {
    if (formData.partyName && formData.partyName !== partySearchTerm) {
      setPartySearchTerm(formData.partyName);
    }
  }, [formData.partyName]);

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

  const maintainFocus = () => {
    if (partyInputRef.current && shouldMaintainFocusRef.current) {
      const currentPosition = cursorPositionRef.current;
      partyInputRef.current.focus();
      partyInputRef.current.setSelectionRange(currentPosition, currentPosition);
      shouldMaintainFocusRef.current = false;
    }
  };

  const loadParties = async (searchTerm = "") => {
    if (!companyId) {
      console.warn("🚫 No companyId provided for party loading");
      setPartyLoadError("Company ID is required");
      return;
    }

    if (isLoadingParties) {
      console.log("⏳ Already loading parties, skipping duplicate request");
      return;
    }

    try {
      setIsLoadingParties(true);
      setPartyLoadError(null);

      console.log("🔍 Loading parties:", {
        companyId,
        searchTerm: searchTerm.trim(),
        searchLength: searchTerm.length,
        hasSearchTerm: Boolean(searchTerm && searchTerm.trim()),
      });

      const searchParams = {
        search: searchTerm.trim(),
        limit: searchTerm && searchTerm.trim() ? 50 : 20,
        page: 1,
        sortBy: "name",
        sortOrder: "asc",
        includeInactive: false,
      };

      let response;
      let supplierList = [];

      try {
        response = await partyService.getParties(companyId, {
          ...searchParams,
          type: "supplier",
        });
        console.log("📦 Supplier response:", response);
      } catch (error) {
        console.warn("⚠️ Supplier fetch failed, trying all parties:", error);
      }

      if (
        !response?.success ||
        !response?.data ||
        (Array.isArray(response.data) && response.data.length === 0) ||
        (response.data.parties && response.data.parties.length === 0)
      ) {
        console.log("🔄 Trying to fetch all parties without type filter");
        try {
          response = await partyService.getParties(companyId, searchParams);
          console.log("📦 All parties response:", response);
        } catch (error) {
          console.error("❌ All parties fetch failed:", error);
          throw error;
        }
      }

      if (response?.success) {
        supplierList =
          response.data?.parties ||
          response.data?.data?.parties ||
          response.data ||
          response.parties ||
          [];

        console.log("📋 Raw party data:", supplierList);

        if (!Array.isArray(supplierList)) {
          console.warn("⚠️ Party data is not an array:", typeof supplierList);
          supplierList = [];
        }

        const formattedParties = supplierList
          .filter((party) => {
            const hasName =
              party &&
              (party.name ||
                party.partyName ||
                party.supplierName ||
                party.customerName ||
                party.displayName ||
                party.businessName);
            console.log("🔍 Filtering party:", {party, hasName});
            return hasName;
          })
          .map((party, index) => {
            const formattedParty = {
              id: party._id || party.id || `temp_${index}`,
              name:
                party.name ||
                party.partyName ||
                party.supplierName ||
                party.customerName ||
                party.displayName ||
                party.businessName ||
                "Unknown Supplier",
              phone:
                party.phoneNumber ||
                party.phone ||
                party.mobile ||
                party.contactNumber ||
                party.mobileNumber ||
                "",
              email: party.email || party.emailAddress || "",
              address:
                party.homeAddressLine ||
                party.address ||
                party.billingAddress ||
                party.fullAddress ||
                "",
              gstNumber:
                party.gstNumber || party.gstNo || party.taxNumber || "",
              balance:
                party.currentBalance ||
                party.balance ||
                party.openingBalance ||
                0,
              type:
                party.partyType ||
                party.type ||
                party.supplierType ||
                "supplier",
              companyName: party.companyName || party.businessName || "",
              creditLimit: party.creditLimit || 0,
            };
            console.log("✅ Formatted party:", formattedParty);
            return formattedParty;
          });

        let finalParties = formattedParties;
        if (searchTerm && searchTerm.trim().length >= 2) {
          const searchLower = searchTerm.trim().toLowerCase();
          finalParties = formattedParties.filter(
            (party) =>
              party.name.toLowerCase().includes(searchLower) ||
              party.phone.includes(searchTerm.trim()) ||
              (party.gstNumber &&
                party.gstNumber.toLowerCase().includes(searchLower)) ||
              (party.email && party.email.toLowerCase().includes(searchLower))
          );
          console.log(
            `🔍 Filtered ${formattedParties.length} parties to ${finalParties.length} based on search: "${searchTerm}"`
          );
        }

        console.log("📊 Final formatted parties:", finalParties);
        setParties(finalParties);

        if (
          searchTerm &&
          searchTerm.trim().length >= 2 &&
          !isSelectingPartyRef.current
        ) {
          setShowPartySuggestions(true);
        } else {
          setShowPartySuggestions(false);
        }

        if (finalParties.length > 0) {
          console.log(`✅ Successfully loaded ${finalParties.length} parties`);
          if (searchTerm && searchTerm.trim()) {
            console.log(
              `🔍 Search results for "${searchTerm}":`,
              finalParties.map((p) => p.name)
            );
          }
        } else {
          console.log("📭 No parties found");
          if (searchTerm && searchTerm.trim().length >= 2) {
            setPartyLoadError(`No suppliers found matching "${searchTerm}"`);
          } else if (!searchTerm || searchTerm.trim().length === 0) {
            setPartyLoadError(
              "No suppliers found. Click 'Add New Supplier' to create one."
            );
          }
        }

        setTimeout(maintainFocus, 10);
      } else {
        console.error("❌ Party service response not successful:", response);
        setParties([]);
        setPartyLoadError(response?.message || "Failed to load suppliers");
      }
    } catch (error) {
      console.error("❌ Error loading parties:", error);
      setParties([]);
      setPartyLoadError(error.message || "Failed to load suppliers");

      if (addToast) {
        addToast(`Error loading suppliers: ${error.message}`, "error");
      }
    } finally {
      setIsLoadingParties(false);
    }
  };

  const retryPartyLoad = () => {
    console.log("🔄 Retrying party load");
    setPartyLoadError(null);
    loadParties(partySearchTerm);
  };

  const searchPartiesAlternative = async (searchTerm) => {
    if (!companyId || !searchTerm || searchTerm.trim().length < 2) {
      console.log("🚫 Skipping alternative search - insufficient criteria");
      return;
    }

    if (isLoadingParties) {
      console.log("⏳ Already loading, skipping alternative search");
      return;
    }

    try {
      console.log("🔍 Alternative search for:", searchTerm);

      let response;

      try {
        response = await partyService.searchParties({
          query: searchTerm,
          partyType: "supplier",
          limit: 20,
        });
        console.log("📦 Search parties response:", response);
      } catch (error) {
        console.warn("⚠️ Search parties failed:", error);
      }

      if (!response?.success || !response?.data || response.data.length === 0) {
        try {
          response = await partyService.getParties(companyId, {
            search: searchTerm,
            type: "supplier",
            limit: 20,
          });
          console.log("📦 Get parties with search response:", response);
        } catch (error) {
          console.warn("⚠️ Get parties with search failed:", error);
        }
      }

      if (
        !response?.success ||
        !response?.data ||
        (Array.isArray(response.data) && response.data.length === 0)
      ) {
        console.log("🔄 Fallback to load all and filter locally");
        await loadParties(searchTerm);
        return;
      }

      if (response?.success && response.data) {
        const supplierList = response.data?.parties || response.data || [];

        if (Array.isArray(supplierList) && supplierList.length > 0) {
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
            type: supplier.partyType || "supplier",
            companyName: supplier.companyName || "",
            creditLimit: supplier.creditLimit || 0,
          }));

          setParties(formattedParties);

          if (!isSelectingPartyRef.current) {
            setShowPartySuggestions(true);
          }

          console.log(
            `✅ Alternative search found ${formattedParties.length} suppliers`
          );
        } else {
          console.log("📭 Alternative search returned no results");
          setPartyLoadError(`No suppliers found matching "${searchTerm}"`);
        }
      }
    } catch (error) {
      console.error("❌ Alternative search failed:", error);
      await loadParties(searchTerm);
    }
  };

  // ✅ FIXED: Enhanced order number generation with proper error handling
  const generateOrderNumber = async () => {
    if (!companyId) {
      console.warn("🚫 Cannot generate order number: Company ID is required");
      addToast?.("Company ID is required for order number generation", "error");
      return;
    }

    try {
      setIsGeneratingOrderNumber(true);
      console.log("🔢 Generating order number for company:", companyId);

      // ✅ Use the purchaseOrderService method that calls the backend endpoint
      const response = await purchaseOrderService.generateOrderNumber(
        companyId,
        formData.orderType || "purchase_order",
        currentUser?.id || propCurrentUser?.id
      );

      console.log("📦 Order number generation response:", response);

      if (response.success && response.data?.nextOrderNumber) {
        const generatedNumber = response.data.nextOrderNumber;
        console.log("✅ Successfully generated order number:", generatedNumber);

        // ✅ FIXED: Update both field names for full compatibility
        onFormDataChange("purchaseOrderNumber", generatedNumber);
        onFormDataChange("orderNumber", generatedNumber);

        // Show success message
        if (addToast) {
          addToast(`Order number generated: ${generatedNumber}`, "success");
        }

        return generatedNumber;
      } else {
        // Handle API failure
        console.warn("⚠️ Backend generation failed, using fallback");

        // Generate fallback number
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const day = now.getDate().toString().padStart(2, "0");
        const hours = now.getHours().toString().padStart(2, "0");
        const minutes = now.getMinutes().toString().padStart(2, "0");
        const seconds = now.getSeconds().toString().padStart(2, "0");

        const fallbackNumber = `PO-${year}${month}${day}-${hours}${minutes}${seconds}`;

        console.log("🚨 Using fallback order number:", fallbackNumber);

        onFormDataChange("purchaseOrderNumber", fallbackNumber);
        onFormDataChange("orderNumber", fallbackNumber);

        if (addToast) {
          addToast(
            `Order number generated (fallback): ${fallbackNumber}`,
            "warning"
          );
        }

        return fallbackNumber;
      }
    } catch (error) {
      console.error("❌ Error generating order number:", error);

      // Emergency fallback with more unique number
      const timestamp = Date.now().toString();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const emergencyNumber = `PO-EMRG-${timestamp.slice(-8)}-${randomNum}`;

      console.log("🚨 Using emergency order number:", emergencyNumber);

      onFormDataChange("purchaseOrderNumber", emergencyNumber);
      onFormDataChange("orderNumber", emergencyNumber);

      if (addToast) {
        addToast(
          `Order generation failed. Using emergency number: ${emergencyNumber}`,
          "error"
        );
      }

      return emergencyNumber;
    } finally {
      setIsGeneratingOrderNumber(false);
    }
  };

  const focusNextField = (currentField) => {
    const fieldOrder = ["gstType", "deliveryDate", "partyName", "purchaseDate"];
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

  const handleAddNewParty = () => {
    isSelectingPartyRef.current = true;
    setQuickAddPartyData({
      name: partySearchTerm || "",
      type: "supplier",
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
      type: newParty.partyType || "supplier",
      companyName: newParty.companyName || "",
      creditLimit: newParty.creditLimit || 0,
    };

    handlePartySelect(formattedParty);
    setParties((prev) => [formattedParty, ...prev]);
    setShowAddPartyModal(false);
    setShowPartySuggestions(false);

    setTimeout(() => {
      isSelectingPartyRef.current = false;
      const purchaseDateRef = fieldRefs.current.purchaseDate;
      if (purchaseDateRef) {
        purchaseDateRef.focus();
      }
    }, 100);
  };

  useEffect(() => {
    if (companyId) {
      console.log("🏢 Component mounted with companyId:", companyId);
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

      // ✅ FIXED: Only auto-generate if no order number exists and not editing
      if (
        (!formData.purchaseOrderNumber ||
          formData.purchaseOrderNumber.trim() === "") &&
        !formData.isEditing
      ) {
        console.log(
          "📝 No order number found, generating after component mount"
        );
        // Use a small delay to ensure component is fully mounted
        const timer = setTimeout(() => {
          generateOrderNumber();
        }, 500);

        return () => clearTimeout(timer);
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
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (partySearchTerm.length >= 2 && !isSelectingPartyRef.current) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          console.log("🔍 Debounced search triggered for:", partySearchTerm);
          await searchPartiesAlternative(partySearchTerm);
        } catch (error) {
          console.error("❌ Search failed, falling back to load all:", error);
          await loadParties(partySearchTerm);
        }
      }, 300);
    } else if (partySearchTerm.length === 0 && !isSelectingPartyRef.current) {
      console.log("🧹 Input cleared, loading all parties once");
      setShowPartySuggestions(false);
      setPartyLoadError(null);

      if (parties.length === 0 || partySearchTerm !== "") {
        loadParties();
      }
    } else if (partySearchTerm.length === 1) {
      console.log("📝 Single character entered, waiting for more input");
      setPartyLoadError(null);
      setShowPartySuggestions(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [partySearchTerm, companyId]);

  const handleInputChange = (field, value) => {
    onFormDataChange(field, value);

    if (field === "gstType") {
      onFormDataChange("_gstTypeChanged", Date.now());
    }
  };

  const handlePartySearchChange = (value) => {
    if (isSelectingPartyRef.current) {
      return;
    }

    console.log("🔍 Party search changed:", value);
    shouldMaintainFocusRef.current = true;
    cursorPositionRef.current = partyInputRef.current?.selectionStart || 0;

    setPartySearchTerm(value);
    onFormDataChange("partyName", value);

    // ✅ ADDED: Sync backend field names when party name changes
    onFormDataChange("supplierName", value); // Backend expects this field

    // Clear selected party if user is typing different text
    if (formData.selectedParty && value !== formData.partyName) {
      onFormDataChange("selectedParty", "");
      onFormDataChange("supplier", ""); // Backend field
      onFormDataChange("partyPhone", "");
      onFormDataChange("supplierMobile", ""); // Backend field
      onFormDataChange("partyEmail", "");
      onFormDataChange("supplierEmail", ""); // Backend field
      onFormDataChange("partyAddress", "");
      onFormDataChange("partyGstNumber", "");
    }

    if (value.length === 0) {
      setShowPartySuggestions(false);
      setSelectedPartySuggestionIndex(-1);
    }
  };

  const handlePartySelect = (party) => {
    isSelectingPartyRef.current = true;

    // ✅ FIXED: Update both frontend and backend field names
    onFormDataChange("selectedParty", party.id);
    onFormDataChange("supplier", party.id); // Backend field
    onFormDataChange("partyName", party.name);
    onFormDataChange("supplierName", party.name); // Backend field
    onFormDataChange("partyPhone", party.phone);
    onFormDataChange("supplierMobile", party.phone); // Backend field
    onFormDataChange("partyEmail", party.email);
    onFormDataChange("supplierEmail", party.email); // Backend field
    onFormDataChange("partyAddress", party.address);
    onFormDataChange("partyGstNumber", party.gstNumber);

    setPartySearchTerm(party.name);
    setShowPartySuggestions(false);
    setSelectedPartySuggestionIndex(-1);

    setTimeout(() => {
      isSelectingPartyRef.current = false;
      const purchaseDateRef = fieldRefs.current.purchaseDate;
      if (purchaseDateRef) {
        purchaseDateRef.focus();
      }
    }, 200);
  };

  const clearPartySelection = () => {
    isSelectingPartyRef.current = true;

    // ✅ FIXED: Clear both frontend and backend field names
    onFormDataChange("selectedParty", "");
    onFormDataChange("supplier", ""); // Backend field
    onFormDataChange("partyName", "");
    onFormDataChange("supplierName", ""); // Backend field
    onFormDataChange("partyPhone", "");
    onFormDataChange("supplierMobile", ""); // Backend field
    onFormDataChange("partyEmail", "");
    onFormDataChange("supplierEmail", ""); // Backend field
    onFormDataChange("partyAddress", "");
    onFormDataChange("partyGstNumber", "");
    setPartySearchTerm("");
    setShowPartySuggestions(false);
    setPartyLoadError(null);

    setTimeout(() => {
      isSelectingPartyRef.current = false;
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

  const filteredParties = parties.filter(
    (party) =>
      party.name.toLowerCase().includes(partySearchTerm.toLowerCase()) ||
      party.phone.includes(partySearchTerm) ||
      (party.gstNumber &&
        party.gstNumber.toLowerCase().includes(partySearchTerm.toLowerCase()))
  );

  const userDisplayInfo = getUserDisplayInfo();

  // Theme-consistent styling
  const inputStyle = {
    borderColor: "#000",
    fontSize: "13px",
    padding: "10px 14px",
    height: "42px",
    borderWidth: "2px",
    borderRadius: "8px",
    fontWeight: "500",
  };

  const getInputStyleWithError = (fieldName) => ({
    ...inputStyle,
    borderColor: errors[fieldName] ? "#dc3545" : "#000",
    backgroundColor: errors[fieldName] ? "#fff5f5" : "white",
  });

  const labelStyle = {
    fontSize: "14px",
    fontWeight: "bold",
    marginBottom: "8px",
    color: "#2c3e50",
  };

  const cardStyle = {
    border: "3px solid #000",
    borderRadius: "12px",
    backgroundColor: "white",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  };

  return (
    <div className="purchase-order-form-header mb-4">
      {/* Header Section */}
      <Card className="mb-4" style={cardStyle}>
        <Card.Header
          className="bg-light border-bottom-3"
          style={{borderBottomColor: "#000", padding: "15px 20px"}}
        >
          <div className="d-flex align-items-center">
            <FontAwesomeIcon
              icon={faFileInvoice}
              className="me-3 text-primary"
              size="lg"
            />
            <h5 className="mb-0 fw-bold text-dark">Purchase Order Details</h5>
          </div>
        </Card.Header>
        <Card.Body className="p-4">
          <Row className="g-4">
            {/* Left Column */}
            <Col md={6}>
              <Form.Group className="mb-4">
                <Form.Label
                  className="d-flex align-items-center"
                  style={labelStyle}
                >
                  <FontAwesomeIcon icon={faTag} className="me-2 text-primary" />
                  GST / Non GST *
                </Form.Label>
                <Form.Select
                  ref={(el) => (fieldRefs.current.gstType = el)}
                  value={formData.gstType || "gst"}
                  onChange={(e) => handleInputChange("gstType", e.target.value)}
                  onKeyDown={(e) => handleFieldKeyDown(e, "gstType")}
                  style={{
                    ...getInputStyleWithError("gstType"),
                    backgroundColor:
                      formData.gstType === "gst" ? "#e8f5e8" : "#fff3e0",
                    cursor: "pointer",
                  }}
                  disabled={disabled}
                  isInvalid={!!errors.gstType}
                >
                  <option value="gst">✅ GST Applicable</option>
                  <option value="non-gst">❌ Non-GST</option>
                </Form.Select>
                {errors.gstType && (
                  <Form.Control.Feedback
                    type="invalid"
                    style={{fontSize: "12px", fontWeight: "bold"}}
                  >
                    {errors.gstType}
                  </Form.Control.Feedback>
                )}
                <Form.Text
                  className="text-info fw-bold"
                  style={{fontSize: "12px"}}
                >
                  {formData.gstType === "gst"
                    ? "✅ GST will be calculated on items"
                    : "⚠️ No GST will be applied"}
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label
                  className="d-flex align-items-center"
                  style={labelStyle}
                >
                  <FontAwesomeIcon
                    icon={faTruck}
                    className="me-2 text-warning"
                  />
                  Expected Delivery Date
                </Form.Label>
                <Form.Control
                  ref={(el) => (fieldRefs.current.deliveryDate = el)}
                  type="date"
                  value={formData.deliveryDate || ""}
                  onChange={(e) =>
                    handleInputChange("deliveryDate", e.target.value)
                  }
                  onKeyDown={(e) => handleFieldKeyDown(e, "deliveryDate")}
                  style={{
                    ...getInputStyleWithError("deliveryDate"),
                    cursor: "pointer",
                  }}
                  disabled={disabled}
                  isInvalid={!!errors.deliveryDate}
                  min={new Date().toISOString().split("T")[0]}
                />
                {errors.deliveryDate && (
                  <Form.Control.Feedback
                    type="invalid"
                    style={{fontSize: "12px", fontWeight: "bold"}}
                  >
                    {errors.deliveryDate}
                  </Form.Control.Feedback>
                )}
                <Form.Text
                  className="text-muted fw-bold"
                  style={{fontSize: "12px"}}
                >
                  📅 When do you expect delivery from supplier?
                </Form.Text>
              </Form.Group>

              <Form.Group className="position-relative">
                <Form.Label
                  className="d-flex align-items-center justify-content-between"
                  style={{...labelStyle, color: "#dc3545"}}
                >
                  <span>
                    <FontAwesomeIcon
                      icon={faUserPlus}
                      className="me-2 text-danger"
                    />
                    Select Supplier *
                  </span>
                  {partyLoadError && (
                    <Button
                      variant="outline-warning"
                      size="sm"
                      onClick={retryPartyLoad}
                      disabled={isLoadingParties}
                      title="Retry loading suppliers"
                      style={{
                        fontSize: "11px",
                        padding: "4px 8px",
                        borderWidth: "2px",
                        fontWeight: "bold",
                      }}
                    >
                      <FontAwesomeIcon icon={faRefresh} className="me-1" />
                      🔄 Retry
                    </Button>
                  )}
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
                    style={getInputStyleWithError("partyName")}
                    placeholder="🔍 Search supplier name, phone, or GST..."
                    disabled={disabled || isLoadingParties}
                    isInvalid={!!errors.partyName}
                  />

                  {isLoadingParties && (
                    <div className="position-absolute top-50 end-0 translate-middle-y me-3">
                      <Spinner size="sm" className="text-primary" />
                    </div>
                  )}
                </div>

                {partyLoadError && !isLoadingParties && (
                  <div className="mt-2 p-2 bg-warning bg-opacity-10 border border-warning rounded">
                    <div
                      className="text-warning fw-bold"
                      style={{fontSize: "12px"}}
                    >
                      ⚠️ {partyLoadError}
                    </div>
                    <div className="mt-1">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={handleAddNewParty}
                        style={{
                          fontSize: "11px",
                          padding: "4px 8px",
                          marginRight: "8px",
                        }}
                      >
                        ➕ Add New Supplier
                      </Button>
                      <Button
                        variant="outline-warning"
                        size="sm"
                        onClick={retryPartyLoad}
                        disabled={isLoadingParties}
                        style={{
                          fontSize: "11px",
                          padding: "4px 8px",
                        }}
                      >
                        🔄 Retry Load
                      </Button>
                    </div>
                  </div>
                )}

                {showPartySuggestions &&
                  partySearchTerm.length >= 2 &&
                  !formData.selectedParty && (
                    <div
                      className="position-absolute w-100 bg-white border-3 rounded-3 mt-2 shadow-lg"
                      style={{
                        zIndex: 1000,
                        maxHeight: "250px",
                        overflowY: "auto",
                        borderColor: "#000 !important",
                      }}
                    >
                      {filteredParties.length > 0 &&
                        filteredParties.slice(0, 5).map((party, index) => (
                          <div
                            key={party.id}
                            className={`p-3 border-bottom cursor-pointer ${
                              selectedPartySuggestionIndex === index
                                ? "bg-primary text-white"
                                : "hover-bg-light"
                            }`}
                            style={{
                              fontSize: "13px",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              borderRadius:
                                selectedPartySuggestionIndex === index
                                  ? "8px"
                                  : "0",
                            }}
                            onClick={() => handlePartySelect(party)}
                            onMouseEnter={() =>
                              setSelectedPartySuggestionIndex(index)
                            }
                          >
                            <div
                              className={`fw-bold mb-1 ${
                                selectedPartySuggestionIndex === index
                                  ? "text-white"
                                  : "text-primary"
                              }`}
                              style={{fontSize: "14px"}}
                            >
                              🏢 {party.name}
                            </div>
                            {party.phone && (
                              <div
                                className={`${
                                  selectedPartySuggestionIndex === index
                                    ? "text-light"
                                    : "text-muted"
                                }`}
                                style={{fontSize: "12px"}}
                              >
                                📞 {party.phone}
                              </div>
                            )}
                            {party.gstNumber && (
                              <div
                                className={`${
                                  selectedPartySuggestionIndex === index
                                    ? "text-light"
                                    : "text-info"
                                }`}
                                style={{fontSize: "11px"}}
                              >
                                🏷️ GST: {party.gstNumber}
                              </div>
                            )}
                          </div>
                        ))}

                      <div
                        className={`p-3 cursor-pointer border-top-3 ${
                          selectedPartySuggestionIndex ===
                          filteredParties.length
                            ? "bg-success text-white"
                            : "bg-light"
                        }`}
                        style={{
                          fontSize: "13px",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          borderTopColor: "#000 !important",
                        }}
                        onClick={handleAddNewParty}
                        onMouseEnter={() =>
                          setSelectedPartySuggestionIndex(
                            filteredParties.length
                          )
                        }
                      >
                        <div className="text-center">
                          <FontAwesomeIcon
                            icon={faUserPlus}
                            className={`me-2 ${
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
                            style={{fontSize: "13px"}}
                          >
                            ➕ Add New Supplier
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                {formData.selectedParty && formData.partyName && (
                  <div
                    className="mt-3 p-3 bg-success bg-opacity-10 border-3 rounded-3"
                    style={{borderColor: "#28a745"}}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div
                          className="fw-bold text-success mb-1"
                          style={{fontSize: "14px"}}
                        >
                          ✅ {formData.partyName}
                        </div>
                        {formData.partyPhone && (
                          <div
                            className="text-muted"
                            style={{fontSize: "12px"}}
                          >
                            📞 {formData.partyPhone}
                          </div>
                        )}
                        {formData.partyGstNumber && (
                          <div className="text-info" style={{fontSize: "11px"}}>
                            🏷️ GST: {formData.partyGstNumber}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={clearPartySelection}
                        disabled={disabled}
                        title="Clear selection"
                        style={{
                          fontSize: "12px",
                          padding: "6px 12px",
                          borderWidth: "2px",
                          fontWeight: "bold",
                        }}
                      >
                        ✕ Clear
                      </Button>
                    </div>
                  </div>
                )}

                {errors.partyName && (
                  <div
                    className="invalid-feedback d-block fw-bold"
                    style={{fontSize: "12px"}}
                  >
                    ⚠️ {errors.partyName}
                  </div>
                )}
              </Form.Group>
            </Col>

            {/* Right Column */}
            <Col md={6}>
              <Form.Group className="mb-4">
                <Form.Label
                  className="d-flex align-items-center"
                  style={{...labelStyle, color: "#dc3545"}}
                >
                  <FontAwesomeIcon
                    icon={faCalendarAlt}
                    className="me-2 text-danger"
                  />
                  Purchase Date *
                </Form.Label>
                <Form.Control
                  ref={(el) => (fieldRefs.current.purchaseDate = el)}
                  type="date"
                  value={
                    formData.purchaseDate ||
                    new Date().toISOString().split("T")[0]
                  }
                  onChange={(e) =>
                    handleInputChange("purchaseDate", e.target.value)
                  }
                  onKeyDown={(e) => handleFieldKeyDown(e, "purchaseDate")}
                  style={{
                    ...getInputStyleWithError("purchaseDate"),
                    cursor: "pointer",
                  }}
                  disabled={disabled}
                  isInvalid={!!errors.purchaseDate}
                />
                {errors.purchaseDate && (
                  <Form.Control.Feedback
                    type="invalid"
                    style={{fontSize: "12px", fontWeight: "bold"}}
                  >
                    {errors.purchaseDate}
                  </Form.Control.Feedback>
                )}
                <Form.Text
                  className="text-muted fw-bold"
                  style={{fontSize: "12px"}}
                >
                  📅 Date of purchase order creation
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label
                  className="d-flex align-items-center justify-content-between"
                  style={{...labelStyle, color: "#dc3545"}}
                >
                  <span>
                    <FontAwesomeIcon
                      icon={faFileInvoice}
                      className="me-2 text-danger"
                    />
                    Purchase Order No. *
                  </span>
                  {/* ✅ ENHANCED: Better generation button logic */}
                  {(!formData.purchaseOrderNumber ||
                    formData.purchaseOrderNumber.trim() === "") &&
                    !formData.isEditing && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={generateOrderNumber}
                        disabled={isGeneratingOrderNumber || !companyId}
                        style={{
                          fontSize: "11px",
                          padding: "4px 8px",
                          borderWidth: "2px",
                          fontWeight: "bold",
                        }}
                        title={
                          !companyId
                            ? "Company ID required for order number generation"
                            : "Generate order number"
                        }
                      >
                        {isGeneratingOrderNumber ? (
                          <>
                            <Spinner size="sm" className="me-1" />
                            Generating...
                          </>
                        ) : (
                          "🔄 Generate Now"
                        )}
                      </Button>
                    )}
                </Form.Label>
                <div className="position-relative">
                  <Form.Control
                    type="text"
                    value={formData.purchaseOrderNumber || ""}
                    style={{
                      ...getInputStyleWithError("purchaseOrderNumber"),
                      backgroundColor: isGeneratingOrderNumber
                        ? "#f8f9fa"
                        : formData.purchaseOrderNumber
                        ? "#e8f5e8"
                        : "#e9ecef",
                      fontWeight: "bold",
                      color: formData.purchaseOrderNumber
                        ? "#28a745"
                        : "#6c757d",
                    }}
                    disabled
                    readOnly
                    isInvalid={!!errors.purchaseOrderNumber}
                    placeholder={
                      isGeneratingOrderNumber
                        ? "🔄 Auto-generating order number..."
                        : !companyId
                        ? "📋 Company ID required for order number generation"
                        : formData.isEditing
                        ? "📋 Order number (editing mode)"
                        : "📋 Order number will be generated automatically"
                    }
                  />
                  {isGeneratingOrderNumber && (
                    <div className="position-absolute top-50 end-0 translate-middle-y me-3">
                      <Spinner size="sm" className="text-primary" />
                    </div>
                  )}
                </div>
                {formData.purchaseOrderNumber && (
                  <Form.Text
                    className="text-success fw-bold"
                    style={{fontSize: "12px"}}
                  >
                    ✅ Order number:{" "}
                    <strong>{formData.purchaseOrderNumber}</strong>
                  </Form.Text>
                )}
                {errors.purchaseOrderNumber && (
                  <Form.Control.Feedback
                    type="invalid"
                    style={{fontSize: "12px", fontWeight: "bold"}}
                  >
                    {errors.purchaseOrderNumber}
                  </Form.Control.Feedback>
                )}
                {/* ✅ NEW: Helpful hint */}
                {!formData.purchaseOrderNumber &&
                  !isGeneratingOrderNumber &&
                  !formData.isEditing && (
                    <Form.Text
                      className="text-info fw-bold"
                      style={{fontSize: "12px"}}
                    >
                      💡 Order number will be auto-generated in format:
                      PO-YYYYMMDD-NNNN
                    </Form.Text>
                  )}
              </Form.Group>

              <Form.Group>
                <Form.Label
                  className="d-flex align-items-center justify-content-between"
                  style={{...labelStyle, color: "#dc3545"}}
                >
                  <span>
                    <FontAwesomeIcon
                      icon={faUser}
                      className="me-2 text-danger"
                    />
                    Employee *
                  </span>
                  {userError && (
                    <Button
                      variant="outline-warning"
                      size="sm"
                      onClick={retryUserFetch}
                      disabled={isLoadingUser}
                      title="Retry fetching user information"
                      style={{
                        fontSize: "11px",
                        padding: "4px 8px",
                        borderWidth: "2px",
                        fontWeight: "bold",
                      }}
                    >
                      <FontAwesomeIcon icon={faRefresh} className="me-1" />
                      🔄 Retry
                    </Button>
                  )}
                </Form.Label>

                <div className="position-relative">
                  <Form.Control
                    type="text"
                    value={userDisplayInfo.displayText}
                    style={{
                      ...getInputStyleWithError("employeeName"),
                      backgroundColor: userDisplayInfo.hasUser
                        ? "#e8f5e8"
                        : userDisplayInfo.error
                        ? "#fff5f5"
                        : "#f8f9fa",
                      fontWeight: "bold",
                      color: userDisplayInfo.hasUser
                        ? "#28a745"
                        : userDisplayInfo.error
                        ? "#dc3545"
                        : "#6c757d",
                    }}
                    disabled
                    readOnly
                    isInvalid={!!errors.employeeName || !!userError}
                    placeholder={
                      userDisplayInfo.isLoading
                        ? "Loading employee information..."
                        : "Employee information will be auto-filled"
                    }
                  />

                  {userDisplayInfo.isLoading && (
                    <div className="position-absolute top-50 end-0 translate-middle-y me-3">
                      <Spinner size="sm" className="text-primary" />
                    </div>
                  )}
                </div>

                {userDisplayInfo.hasUser && formData.employeeName && (
                  <Form.Text
                    className="text-success fw-bold"
                    style={{fontSize: "12px"}}
                  >
                    ✅ Employee: <strong>{formData.employeeName}</strong>
                  </Form.Text>
                )}

                {userError && (
                  <div
                    className="invalid-feedback d-block fw-bold"
                    style={{fontSize: "12px"}}
                  >
                    ⚠️ {userError}
                  </div>
                )}

                {errors.employeeName && (
                  <div
                    className="invalid-feedback d-block fw-bold"
                    style={{fontSize: "12px"}}
                  >
                    ⚠️ {errors.employeeName}
                  </div>
                )}

                <Form.Text
                  className="text-muted fw-bold"
                  style={{fontSize: "12px"}}
                >
                  👤 Employee creating this purchase order
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Add Party Modal */}
      {showAddPartyModal && (
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
          initialData={quickAddPartyData}
          addToast={addToast}
        />
      )}
    </div>
  );
}

export default PurchaseOrderFormHeader;
