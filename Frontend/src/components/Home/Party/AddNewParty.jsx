import React, {useState, useEffect, useRef} from "react";
import {
  Modal,
  Button,
  Form,
  Row,
  Col,
  InputGroup,
  Nav,
  Tab,
  Alert,
  Spinner,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faPlus,
  faMinus,
  faEdit,
  faUser,
  faRocket,
  faKeyboard,
  faHome,
  faTruck,
  faCopy,
  faCreditCard,
  faFileInvoice,
  faDatabase,
} from "@fortawesome/free-solid-svg-icons";
import useKeyboardNavigation from "../../../hooks/useKeyboardNavigation";
import KeyboardShortcutsHelp from "../../../hooks/KeyboardShortcutsHelp";
import partyService from "../../../services/partyService";
import DatabaseSearch from "./DatabaseSearch";

function AddNewParty({
  show,
  onHide,
  editingParty,
  onSaveParty,
  isQuickAdd = false,
  quickAddType = "customer",
}) {
  const [showAdditionalPhones, setShowAdditionalPhones] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [activeAddressTab, setActiveAddressTab] = useState("home");
  const [showDatabaseSearch, setShowDatabaseSearch] = useState(false);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form refs for keyboard navigation
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const companyRef = useRef(null);
  const gstRef = useRef(null);
  const gstTypeRef = useRef(null);
  const creditLimitRef = useRef(null);

  // Home address refs
  const homeAddressRef = useRef(null);
  const homePincodeRef = useRef(null);
  const homeStateRef = useRef(null);
  const homeDistrictRef = useRef(null);
  const homeTalukaRef = useRef(null);

  // Delivery address refs
  const deliveryAddressRef = useRef(null);
  const deliveryPincodeRef = useRef(null);
  const deliveryStateRef = useRef(null);
  const deliveryDistrictRef = useRef(null);
  const deliveryTalukaRef = useRef(null);

  const balanceRef = useRef(null);
  const saveButtonRef = useRef(null);
  const cancelButtonRef = useRef(null);

  // Navigation refs array
  const navigationRefs = [
    nameRef,
    emailRef,
    phoneRef,
    companyRef,
    gstRef,
    gstTypeRef,
    creditLimitRef,
    homeAddressRef,
    homePincodeRef,
    homeStateRef,
    homeDistrictRef,
    homeTalukaRef,
    deliveryAddressRef,
    deliveryPincodeRef,
    deliveryStateRef,
    deliveryDistrictRef,
    deliveryTalukaRef,
    balanceRef,
    saveButtonRef,
    cancelButtonRef,
  ];

  // Quick add refs
  const quickNameRef = useRef(null);
  const quickPhoneRef = useRef(null);
  const quickSaveRef = useRef(null);
  const quickCancelRef = useRef(null);

  const quickNavigationRefs = [
    quickNameRef,
    quickPhoneRef,
    quickSaveRef,
    quickCancelRef,
  ];

  // GST Type options
  const gstTypes = [
    {value: "unregistered", label: "Unregistered"},
    {value: "regular", label: "Regular"},
    {value: "composition", label: "Composition"},
  ];

  // Form data for regular add/edit party
  const [formData, setFormData] = useState({
    partyType: "customer",
    name: "",
    email: "",
    phoneNumber: "",
    companyName: "",
    gstNumber: "",
    gstType: "unregistered",
    creditLimit: 0,
    country: "INDIA",

    // Home Address
    homeAddressLine: "",
    homePincode: "",
    homeState: "",
    homeDistrict: "",
    homeTaluka: "",

    // Delivery Address
    deliveryAddressLine: "",
    deliveryPincode: "",
    deliveryState: "",
    deliveryDistrict: "",
    deliveryTaluka: "",
    sameAsHomeAddress: false,

    openingBalance: 0,
    phoneNumbers: [{number: "", label: ""}],

    // ✅ ADDED: Linking fields for bidirectional order generation
    linkedCompanyId: null,
    isLinkedSupplier: false,
    enableBidirectionalOrders: false,
    autoLinkByGST: true,
    autoLinkByPhone: true,
    autoLinkByEmail: true,
    externalCompanyId: null,
    isExternalCompany: false,
    importedFrom: null,
    importedAt: null,
    source: null,
    isVerified: false,
    supplierCompanyData: null,
    website: "",
    businessType: "",
    businessCategory: "",
    companyType: "",
    incorporationDate: "",
    cinNumber: "",
    authorizedCapital: "",
    paidUpCapital: "",
    establishedYear: "",
    description: "",
    ownerInfo: null,
  });

  // Quick add form data
  const [quickFormData, setQuickFormData] = useState({
    name: "",
    phone: "",
  });

  const shortcuts = {
    "Ctrl+S": "Save party",
    "Ctrl+Q": isQuickAdd ? "Save quick customer" : "Toggle quick add mode",
    "Ctrl+P": "Add additional phone number",
    "Ctrl+D": "Copy home address to delivery address",
    "Ctrl+B": "Search company database",
    F1: "Show keyboard shortcuts",
  };

  // ✅ ENHANCED: handleDatabaseSearchSelect function with bidirectional linking
  const handleDatabaseSearchSelect = (companyData) => {
    console.log("🏢 Company selected from database:", companyData);

    try {
      // Convert company data to party form format with proper error handling
      const newFormData = {
        partyType: companyData.partyType || "supplier", // Default to supplier for companies
        name: companyData.name || "",
        email: companyData.email || "",
        phoneNumber: companyData.phoneNumber || companyData.phone || "",
        companyName: companyData.companyName || "",
        gstNumber: companyData.gstNumber || "",
        gstType:
          companyData.gstType ||
          (companyData.gstNumber ? "regular" : "unregistered"),
        creditLimit: companyData.creditLimit || 0,
        country: "INDIA",

        // Home Address - handle company address mapping
        homeAddressLine:
          companyData.homeAddressLine || companyData.address || "",
        homePincode: companyData.homePincode || companyData.pincode || "",
        homeState: companyData.homeState || companyData.state || "",
        homeDistrict: companyData.homeDistrict || companyData.city || "",
        homeTaluka: companyData.homeTaluka || "",

        // Delivery Address - initially same as home
        deliveryAddressLine:
          companyData.deliveryAddressLine || companyData.address || "",
        deliveryPincode:
          companyData.deliveryPincode || companyData.pincode || "",
        deliveryState: companyData.deliveryState || companyData.state || "",
        deliveryDistrict:
          companyData.deliveryDistrict || companyData.city || "",
        deliveryTaluka: companyData.deliveryTaluka || "",
        sameAsHomeAddress:
          companyData.sameAsHomeAddress !== undefined
            ? companyData.sameAsHomeAddress
            : true,

        openingBalance: companyData.openingBalance || 0,

        // Handle phone numbers properly
        phoneNumbers:
          Array.isArray(companyData.phoneNumbers) &&
          companyData.phoneNumbers.length > 0
            ? companyData.phoneNumbers
            : [
                {
                  number: companyData.phoneNumber || companyData.phone || "",
                  label: "Office",
                },
              ],

        // ✅ CRITICAL: Add supplier linking fields for bidirectional order generation
        linkedCompanyId:
          companyData.linkedCompanyId ||
          companyData.externalCompanyId ||
          companyData.id,
        isLinkedSupplier: true,
        enableBidirectionalOrders: true,

        // ✅ Auto-linking configuration
        autoLinkByGST:
          companyData.autoLinkByGST !== undefined
            ? companyData.autoLinkByGST
            : true,
        autoLinkByPhone:
          companyData.autoLinkByPhone !== undefined
            ? companyData.autoLinkByPhone
            : true,
        autoLinkByEmail:
          companyData.autoLinkByEmail !== undefined
            ? companyData.autoLinkByEmail
            : true,

        // ✅ External company metadata
        externalCompanyId: companyData.externalCompanyId || companyData.id,
        isExternalCompany: companyData.isExternalCompany || true,
        importedFrom: companyData.importedFrom || "external_company_db",
        importedAt: companyData.importedAt || new Date().toISOString(),
        source: companyData.source || "External Company Database",
        isVerified: companyData.isVerified || false,

        // ✅ Bidirectional tracking metadata
        supplierCompanyData: companyData.supplierCompanyData || {
          externalId: companyData.id || companyData.externalCompanyId,
          businessName: companyData.companyName || companyData.name,
          gstin: companyData.gstNumber,
          phoneNumber: companyData.phoneNumber || companyData.phone,
          email: companyData.email,
          address: companyData.address || companyData.homeAddressLine,
          city: companyData.city || companyData.homeDistrict,
          state: companyData.state || companyData.homeState,
          pincode: companyData.pincode || companyData.homePincode,
          businessType: companyData.businessType || companyData.companyType,
          isExternal: true,
          source: "external_database",
        },

        // ✅ Additional fields for enhanced tracking
        website: companyData.website || "",
        businessType:
          companyData.businessActivity || companyData.companyType || "",
        businessCategory: companyData.businessCategory || "",
        companyType: companyData.companyType || "",
        incorporationDate: companyData.incorporationDate || "",
        cinNumber: companyData.cin || "",
        authorizedCapital: companyData.authorizedCapital || "",
        paidUpCapital: companyData.paidUpCapital || "",
        establishedYear: companyData.establishedYear || "",
        description: companyData.description || "",
        ownerInfo: companyData.ownerInfo || null,
      };

      // Update form data
      setFormData(newFormData);

      // Show additional phones if multiple numbers
      if (
        Array.isArray(companyData.phoneNumbers) &&
        companyData.phoneNumbers.length > 1
      ) {
        setShowAdditionalPhones(true);
      }

      // Close database search and show enhanced success message
      setShowDatabaseSearch(false);

      // ✅ Enhanced success message indicating bidirectional readiness
      const successMessage =
        newFormData.linkedCompanyId && newFormData.partyType === "supplier"
          ? `✅ Company data loaded: ${
              companyData.name || companyData.companyName
            } - Ready for bidirectional order generation!`
          : `✅ Company data loaded: ${
              companyData.name || companyData.companyName
            }`;

      setSuccess(successMessage);

      // Focus on the name field after data is populated
      setTimeout(() => {
        nameRef.current?.focus();
      }, 100);

      // ✅ Enhanced logging for debugging bidirectional setup
      console.log("✅ Company data successfully populated with linking:", {
        formData: newFormData,
        linkingInfo: {
          hasLinkedCompanyId: !!newFormData.linkedCompanyId,
          linkedCompanyId: newFormData.linkedCompanyId,
          isLinkedSupplier: newFormData.isLinkedSupplier,
          enableBidirectionalOrders: newFormData.enableBidirectionalOrders,
          partyType: newFormData.partyType,
          readyForBidirectionalOrders:
            !!newFormData.linkedCompanyId &&
            newFormData.partyType === "supplier",
        },
        supplierCompanyData: newFormData.supplierCompanyData,
        autoLinkingConfig: {
          byGST: newFormData.autoLinkByGST,
          byPhone: newFormData.autoLinkByPhone,
          byEmail: newFormData.autoLinkByEmail,
        },
        expectedFlow:
          "When purchase orders are created with this supplier, sales orders will auto-generate in their linked company",
      });
    } catch (error) {
      console.error("❌ Error populating company data:", error);
      setError("Failed to load company data. Please try again.");
      setShowDatabaseSearch(false);
    }
  };

  // Copy home address to delivery address
  const copyHomeToDelivery = () => {
    setFormData((prev) => ({
      ...prev,
      deliveryAddressLine: prev.homeAddressLine,
      deliveryPincode: prev.homePincode,
      deliveryState: prev.homeState,
      deliveryDistrict: prev.homeDistrict,
      deliveryTaluka: prev.homeTaluka,
      sameAsHomeAddress: true,
    }));
  };

  // Clear alerts after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Update the keyboard navigation setup:
  const {focusFirst} = useKeyboardNavigation({
    enabled: show,
    refs: isQuickAdd ? quickNavigationRefs : navigationRefs,
    loop: true,
    shortcuts: {
      "ctrl+s": (e) => {
        e.preventDefault();
        handleSubmit(e);
      },
      "ctrl+p": () => {
        if (!isQuickAdd && !showAdditionalPhones) {
          setShowAdditionalPhones(true);
        }
      },
      "ctrl+d": () => {
        if (!isQuickAdd) {
          copyHomeToDelivery();
        }
      },
      "ctrl+b": () => {
        if (!isQuickAdd && !isLoading) {
          setShowDatabaseSearch(true);
        }
      },
      f1: () => setShowShortcuts(true),
    },
    onEscape: onHide,
    onEnter: (e) => {
      if (e.target === nameRef.current || e.target === quickNameRef.current) {
        e.preventDefault();
        if (isQuickAdd) {
          quickPhoneRef.current?.focus();
        } else {
          emailRef.current?.focus();
        }
      }
    },
  });

  // ✅ ENHANCED: Reset form when modal opens/closes with linking fields
  useEffect(() => {
    if (show) {
      setError("");
      setSuccess("");

      if (!editingParty) {
        if (isQuickAdd) {
          setQuickFormData({name: "", phone: ""});
        } else {
          setFormData({
            partyType: quickAddType || "customer",
            name: "",
            email: "",
            phoneNumber: "",
            companyName: "",
            gstNumber: "",
            gstType: "unregistered",
            creditLimit: 0,
            country: "INDIA",

            // Home Address
            homeAddressLine: "",
            homePincode: "",
            homeState: "",
            homeDistrict: "",
            homeTaluka: "",

            // Delivery Address
            deliveryAddressLine: "",
            deliveryPincode: "",
            deliveryState: "",
            deliveryDistrict: "",
            deliveryTaluka: "",
            sameAsHomeAddress: false,

            openingBalance: 0,
            phoneNumbers: [{number: "", label: ""}],

            // ✅ ADDED: Reset linking fields
            linkedCompanyId: null,
            isLinkedSupplier: false,
            enableBidirectionalOrders: false,
            autoLinkByGST: true,
            autoLinkByPhone: true,
            autoLinkByEmail: true,
            externalCompanyId: null,
            isExternalCompany: false,
            importedFrom: null,
            importedAt: null,
            source: null,
            isVerified: false,
            supplierCompanyData: null,
            website: "",
            businessType: "",
            businessCategory: "",
            companyType: "",
            incorporationDate: "",
            cinNumber: "",
            authorizedCapital: "",
            paidUpCapital: "",
            establishedYear: "",
            description: "",
            ownerInfo: null,
          });
          setShowAdditionalPhones(false);
          setActiveAddressTab("home");
        }
      } else {
        // ✅ ENHANCED: Populate form for editing with linking fields
        const party = editingParty;
        const editData = {
          partyType: party.partyType || "customer",
          name: party.name || "",
          email: party.email || "",
          phoneNumber: party.phoneNumber || party.phone || "",
          companyName: party.companyName || "",
          gstNumber: party.gstNumber || "",
          gstType: party.gstType || "unregistered",
          creditLimit: party.creditLimit || 0,
          country: party.country || "INDIA",

          // Home Address - handle both nested object and flat structure
          homeAddressLine:
            party.homeAddress?.addressLine ||
            party.homeAddressLine ||
            party.addressLine ||
            party.address ||
            "",
          homePincode:
            party.homeAddress?.pincode ||
            party.homePincode ||
            party.pincode ||
            "",
          homeState:
            party.homeAddress?.state || party.homeState || party.state || "",
          homeDistrict:
            party.homeAddress?.district ||
            party.homeDistrict ||
            party.district ||
            "",
          homeTaluka:
            party.homeAddress?.taluka || party.homeTaluka || party.taluka || "",

          // Delivery Address
          deliveryAddressLine:
            party.deliveryAddress?.addressLine ||
            party.deliveryAddressLine ||
            "",
          deliveryPincode:
            party.deliveryAddress?.pincode || party.deliveryPincode || "",
          deliveryState:
            party.deliveryAddress?.state || party.deliveryState || "",
          deliveryDistrict:
            party.deliveryAddress?.district || party.deliveryDistrict || "",
          deliveryTaluka:
            party.deliveryAddress?.taluka || party.deliveryTaluka || "",
          sameAsHomeAddress: party.sameAsHomeAddress || false,

          openingBalance: party.openingBalance || 0,
          phoneNumbers:
            party.phoneNumbers?.length > 0
              ? party.phoneNumbers
              : [
                  {
                    number: party.phoneNumber || party.phone || "",
                    label: "Primary",
                  },
                ],

          // ✅ ADDED: Include linking fields when editing
          linkedCompanyId: party.linkedCompanyId || null,
          isLinkedSupplier: party.isLinkedSupplier || false,
          enableBidirectionalOrders: party.enableBidirectionalOrders || false,
          autoLinkByGST:
            party.autoLinkByGST !== undefined ? party.autoLinkByGST : true,
          autoLinkByPhone:
            party.autoLinkByPhone !== undefined ? party.autoLinkByPhone : true,
          autoLinkByEmail:
            party.autoLinkByEmail !== undefined ? party.autoLinkByEmail : true,
          externalCompanyId: party.externalCompanyId || null,
          isExternalCompany: party.isExternalCompany || false,
          importedFrom: party.importedFrom || null,
          importedAt: party.importedAt || null,
          source: party.source || null,
          isVerified: party.isVerified || false,
          supplierCompanyData: party.supplierCompanyData || null,
          website: party.website || "",
          businessType: party.businessType || "",
          businessCategory: party.businessCategory || "",
          companyType: party.companyType || "",
          incorporationDate: party.incorporationDate || "",
          cinNumber: party.cinNumber || "",
          authorizedCapital: party.authorizedCapital || "",
          paidUpCapital: party.paidUpCapital || "",
          establishedYear: party.establishedYear || "",
          description: party.description || "",
          ownerInfo: party.ownerInfo || null,
        };
        setFormData(editData);
        setShowAdditionalPhones(editData.phoneNumbers?.length > 1);
      }

      // Focus first input after modal is fully open
      setTimeout(() => {
        if (isQuickAdd) {
          quickNameRef.current?.focus();
        } else {
          nameRef.current?.focus();
        }
      }, 100);
    }
  }, [show, editingParty, isQuickAdd, quickAddType]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const {name, value, type, checked} = e.target;
    const fieldValue = type === "checkbox" ? checked : value;

    setFormData((prev) => {
      const newData = {...prev, [name]: fieldValue};

      // If "Same as Home Address" is checked, copy home address to delivery
      if (name === "sameAsHomeAddress" && checked) {
        newData.deliveryAddressLine = prev.homeAddressLine;
        newData.deliveryPincode = prev.homePincode;
        newData.deliveryState = prev.homeState;
        newData.deliveryDistrict = prev.homeDistrict;
        newData.deliveryTaluka = prev.homeTaluka;
      }

      // If any delivery field is manually changed, uncheck "Same as Home Address"
      if (name.startsWith("delivery") && name !== "sameAsHomeAddress") {
        newData.sameAsHomeAddress = false;
      }

      // Auto-clear GST number if type is unregistered
      if (name === "gstType" && value === "unregistered") {
        newData.gstNumber = "";
      }

      return newData;
    });
  };

  // Handle quick form input changes
  const handleQuickInputChange = (e) => {
    const {name, value} = e.target;
    setQuickFormData((prev) => ({...prev, [name]: value}));
  };

  // Handle phone number changes
  const handlePhoneNumberChange = (index, field, value) => {
    const newPhoneNumbers = [...formData.phoneNumbers];
    newPhoneNumbers[index][field] = value;
    setFormData((prev) => ({...prev, phoneNumbers: newPhoneNumbers}));
  };

  // Add new phone number field
  const addPhoneNumber = () => {
    setFormData((prev) => ({
      ...prev,
      phoneNumbers: [...prev.phoneNumbers, {number: "", label: ""}],
    }));
  };

  // Remove phone number field
  const removePhoneNumber = (index) => {
    const newPhoneNumbers = formData.phoneNumbers.filter((_, i) => i !== index);
    if (newPhoneNumbers.length === 0) {
      setShowAdditionalPhones(false);
      setFormData((prev) => ({
        ...prev,
        phoneNumbers: [{number: "", label: ""}],
      }));
    } else {
      setFormData((prev) => ({...prev, phoneNumbers: newPhoneNumbers}));
    }
  };

  const checkDuplicatePhone = async (phoneNumber) => {
    try {
      // Call backend to check if phone number already exists
      const response = await partyService.checkPhoneExists(phoneNumber);
      return response.exists || false;
    } catch (error) {
      // If the service doesn't exist, we'll skip this check
      console.warn("Phone duplicate check service not available:", error);
      return false;
    }
  };

  // ✅ ENHANCED: handleSubmit with linking data processing
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (isQuickAdd) {
      // Quick add validation - existing code unchanged
      if (!quickFormData.name.trim() || !quickFormData.phone.trim()) {
        setError("Please enter both name and phone number");
        return;
      }

      // Validate phone number format
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(quickFormData.phone.trim())) {
        setError(
          "Please enter a valid 10-digit phone number starting with 6, 7, 8, or 9"
        );
        return;
      }

      try {
        setIsLoading(true);

        // Check for duplicate phone number
        const isDuplicate = await checkDuplicatePhone(
          quickFormData.phone.trim()
        );
        if (isDuplicate) {
          setError(
            `A customer with phone number ${quickFormData.phone.trim()} already exists. Please use a different phone number or edit the existing customer.`
          );
          setIsLoading(false);
          return;
        }

        const newRunningCustomer = {
          partyType: "customer",
          name: quickFormData.name.trim(),
          phoneNumber: quickFormData.phone.trim(),
          email: "",
          companyName: "",
          gstNumber: "",
          gstType: "unregistered",
          creditLimit: 0,
          country: "INDIA",
          homeAddressLine: "",
          homePincode: "",
          homeState: "",
          homeDistrict: "",
          homeTaluka: "",
          deliveryAddressLine: "",
          deliveryPincode: "",
          deliveryState: "",
          deliveryDistrict: "",
          deliveryTaluka: "",
          sameAsHomeAddress: false,
          openingBalance: 0,
          phoneNumbers: [
            {number: quickFormData.phone.trim(), label: "Primary"},
          ],
        };

        console.log("🚀 Creating quick customer:", newRunningCustomer);

        // Call backend API
        const response = await partyService.createParty(newRunningCustomer);
        console.log("📥 Quick customer response:", response);

        if (response.success) {
          setSuccess("Quick customer added successfully!");

          // Handle different response structures safely
          const backendParty =
            response.data?.party || response.party || response.data || {};
          const partyId =
            backendParty._id || backendParty.id || Date.now().toString();

          const savedParty = {
            ...newRunningCustomer,
            id: partyId,
            _id: partyId,
            isRunningCustomer: true,
            createdAt: backendParty.createdAt || new Date().toISOString(),
            updatedAt: backendParty.updatedAt || new Date().toISOString(),
          };

          console.log("✅ Quick customer saved:", savedParty);

          // Call parent callback
          onSaveParty(savedParty, true);

          // Close modal after short delay
          setTimeout(() => {
            onHide();
          }, 1000);
        } else {
          throw new Error(
            response.message || response.error || "Failed to create party"
          );
        }
      } catch (error) {
        console.error("❌ Error creating quick customer:", error);

        // Handle specific duplicate phone error from backend
        if (
          error.message?.toLowerCase().includes("phone") &&
          (error.message?.toLowerCase().includes("exists") ||
            error.message?.toLowerCase().includes("duplicate") ||
            error.message?.toLowerCase().includes("already"))
        ) {
          setError(
            `A customer with phone number ${quickFormData.phone.trim()} already exists. Please use a different phone number or edit the existing customer.`
          );
        } else {
          setError(
            error.message || "Failed to create customer. Please try again."
          );
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      // Regular party validation - existing validation code
      if (!formData.name.trim()) {
        setError("Please enter a name");
        return;
      }

      if (!formData.phoneNumber.trim()) {
        setError("Please enter a phone number");
        return;
      }

      // Validate phone number format
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(formData.phoneNumber.trim())) {
        setError(
          "Please enter a valid 10-digit phone number starting with 6, 7, 8, or 9"
        );
        return;
      }

      // Validate email format if provided
      if (formData.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
          setError("Please enter a valid email address");
          return;
        }
      }

      // Validate GST number format if provided and type is not unregistered
      if (formData.gstNumber.trim() && formData.gstType !== "unregistered") {
        const gstRegex =
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(formData.gstNumber.trim().toUpperCase())) {
          setError("Please enter a valid GST number (e.g., 22AAAAA0000A1Z5)");
          return;
        }
      }

      // Validate credit limit
      if (formData.creditLimit < 0) {
        setError("Credit limit cannot be negative");
        return;
      }

      // Validate opening balance
      if (formData.openingBalance < 0) {
        setError("Opening balance cannot be negative");
        return;
      }

      try {
        setIsLoading(true);

        // Check for duplicate phone number (only for new parties or if phone changed)
        if (
          !editingParty ||
          editingParty.phoneNumber !== formData.phoneNumber.trim()
        ) {
          const isDuplicate = await checkDuplicatePhone(
            formData.phoneNumber.trim()
          );
          if (isDuplicate) {
            setError(
              `A party with phone number ${formData.phoneNumber.trim()} already exists. Please use a different phone number or edit the existing party.`
            );
            setIsLoading(false);
            return;
          }
        }

        // ✅ ENHANCED: Party data preparation with all linking fields
        const partyData = {
          ...formData,
          // Ensure phone field is set for backward compatibility
          phone: formData.phoneNumber,
          // Keep backward compatibility fields
          address: formData.homeAddressLine,
          addressLine: formData.homeAddressLine,
          pincode: formData.homePincode,
          state: formData.homeState,
          district: formData.homeDistrict,
          taluka: formData.homeTaluka,
          // Normalize GST number to uppercase (only if not unregistered)
          gstNumber:
            formData.gstType !== "unregistered"
              ? formData.gstNumber.trim().toUpperCase()
              : "",

          // ✅ CRITICAL: Pass through all linking fields from company selection
          linkedCompanyId: formData.linkedCompanyId || null,
          isLinkedSupplier: formData.isLinkedSupplier || false,
          enableBidirectionalOrders:
            formData.enableBidirectionalOrders || false,
          autoLinkByGST:
            formData.autoLinkByGST !== undefined
              ? formData.autoLinkByGST
              : true,
          autoLinkByPhone:
            formData.autoLinkByPhone !== undefined
              ? formData.autoLinkByPhone
              : true,
          autoLinkByEmail:
            formData.autoLinkByEmail !== undefined
              ? formData.autoLinkByEmail
              : true,
          externalCompanyId: formData.externalCompanyId || null,
          isExternalCompany: formData.isExternalCompany || false,
          importedFrom: formData.importedFrom || null,
          importedAt: formData.importedAt || null,
          source: formData.source || null,
          isVerified: formData.isVerified || false,
          supplierCompanyData: formData.supplierCompanyData || null,
          website: formData.website || "",
          businessType: formData.businessType || "",
          businessCategory: formData.businessCategory || "",
          companyType: formData.companyType || "",
          incorporationDate: formData.incorporationDate || "",
          cinNumber: formData.cinNumber || "",
          authorizedCapital: formData.authorizedCapital || "",
          paidUpCapital: formData.paidUpCapital || "",
          establishedYear: formData.establishedYear || "",
          description: formData.description || "",
          ownerInfo: formData.ownerInfo || null,
        };

        console.log("💾 Saving party data with linking support:", {
          ...partyData,
          linkingStatus: {
            hasLinkedCompany: !!partyData.linkedCompanyId,
            linkedCompanyId: partyData.linkedCompanyId,
            supplierName: partyData.name,
            companyName: partyData.companyName,
            isLinkedSupplier: partyData.isLinkedSupplier,
            enableBidirectionalOrders: partyData.enableBidirectionalOrders,
            readyForBidirectionalOrders:
              !!partyData.linkedCompanyId && partyData.partyType === "supplier",
          },
        });

        let response;
        let savedParty;

        if (editingParty) {
          // Update existing party
          const partyId = editingParty._id || editingParty.id;
          console.log("✏️ Updating party with ID:", partyId);

          // ✅ Use enhanced update endpoint if available
          response = (await partyService.updatePartyWithLinking)
            ? await partyService.updatePartyWithLinking(partyId, partyData)
            : await partyService.updateParty(partyId, partyData);

          console.log("📥 Update response:", response);

          if (response.success || response.data) {
            // ✅ Enhanced success message based on linking status
            const isLinkedSupplier =
              partyData.linkedCompanyId && partyData.partyType === "supplier";
            const successMessage = isLinkedSupplier
              ? "✅ Supplier updated and linked! Ready for bidirectional order generation."
              : response.data?.linkingInfo?.bidirectionalOrdersReady
              ? "✅ Supplier updated and linked! Ready for bidirectional order generation."
              : "✅ Party updated successfully!";

            setSuccess(successMessage);

            // Handle different response structures safely
            const backendParty =
              response.data?.party || response.party || response.data || {};

            savedParty = {
              ...partyData,
              id: partyId,
              _id: partyId,
              createdAt:
                editingParty.createdAt ||
                backendParty.createdAt ||
                new Date().toISOString(),
              updatedAt: backendParty.updatedAt || new Date().toISOString(),
              isRunningCustomer: false,
              // ✅ PRESERVE LINKING INFO IN RESPONSE
              linkedCompany: response.data?.linkedCompany || null,
              linkingInfo: response.data?.linkingInfo || {
                hasLinkedCompany: !!partyData.linkedCompanyId,
                bidirectionalOrdersReady: isLinkedSupplier,
              },
            };

            console.log("✅ Party updated with linking:", savedParty);

            // Call parent callback
            onSaveParty(savedParty, false, true);
          } else {
            throw new Error(
              response.message || response.error || "Failed to update party"
            );
          }
        } else {
          // Create new party
          console.log("➕ Creating new party with linking");

          // ✅ Use enhanced creation endpoint if available
          response = (await partyService.createPartyWithLinking)
            ? await partyService.createPartyWithLinking(partyData)
            : await partyService.createParty(partyData);

          console.log("📥 Create response:", response);

          if (response.success || response.data) {
            // ✅ Enhanced success message based on linking status
            const isLinkedSupplier =
              partyData.linkedCompanyId && partyData.partyType === "supplier";
            const successMessage = isLinkedSupplier
              ? "✅ Supplier created and linked! Ready for bidirectional order generation."
              : response.data?.linkingInfo?.bidirectionalOrdersReady
              ? "✅ Supplier created and linked! Ready for bidirectional order generation."
              : "✅ Party created successfully!";

            setSuccess(successMessage);

            // Handle different response structures safely
            const backendParty =
              response.data?.party || response.party || response.data || {};
            const partyId =
              backendParty._id || backendParty.id || Date.now().toString();

            savedParty = {
              ...partyData,
              id: partyId,
              _id: partyId,
              createdAt: backendParty.createdAt || new Date().toISOString(),
              updatedAt: backendParty.updatedAt || new Date().toISOString(),
              isRunningCustomer: false,
              // ✅ PRESERVE LINKING INFO IN RESPONSE
              linkedCompany: response.data?.linkedCompany || null,
              linkingInfo: response.data?.linkingInfo || {
                hasLinkedCompany: !!partyData.linkedCompanyId,
                bidirectionalOrdersReady: isLinkedSupplier,
              },
            };

            console.log("✅ Party created with linking support:", {
              savedParty,
              linkingStatus: {
                hasLinkedCompany: !!savedParty.linkedCompanyId,
                bidirectionalOrdersReady:
                  savedParty.linkingInfo?.bidirectionalOrdersReady ||
                  isLinkedSupplier,
                supplierName: savedParty.name,
                linkedCompanyId: savedParty.linkedCompanyId,
              },
            });

            // Call parent callback
            onSaveParty(savedParty, false, false);
          } else {
            throw new Error(
              response.message || response.error || "Failed to create party"
            );
          }
        }

        // Close modal after short delay
        setTimeout(() => {
          onHide();
        }, 1000);
      } catch (error) {
        console.error("❌ Error saving party:", error);

        // Enhanced error handling with specific duplicate phone error
        let errorMessage = "Failed to save party. Please try again.";

        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }

        // Handle specific duplicate phone error
        if (
          errorMessage.toLowerCase().includes("phone") &&
          (errorMessage.toLowerCase().includes("exists") ||
            errorMessage.toLowerCase().includes("duplicate") ||
            errorMessage.toLowerCase().includes("already"))
        ) {
          setError(
            `A party with phone number ${formData.phoneNumber.trim()} already exists. Please use a different phone number or edit the existing party.`
          );
        } else if (
          errorMessage.toLowerCase().includes("email") &&
          errorMessage.toLowerCase().includes("exists")
        ) {
          setError(
            `A party with email ${formData.email.trim()} already exists. Please use a different email or edit the existing party.`
          );
        } else {
          setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (isQuickAdd) {
    return (
      <>
        <Modal show={show} onHide={onHide} centered>
          <Modal.Header className="d-flex justify-content-between align-items-center border-0 bg-light">
            <Modal.Title className="fw-bold text-dark mb-0">
              <FontAwesomeIcon icon={faRocket} className="me-2 text-warning" />
              Quick Add Customer
            </Modal.Title>
            <div className="d-flex align-items-center gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setShowShortcuts(true)}
                title="Keyboard Shortcuts (F1)"
                className="border-0"
              >
                <FontAwesomeIcon icon={faKeyboard} />
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={onHide}
                className="border-0 p-1"
                aria-label="Close"
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={faTimes} />
              </Button>
            </div>
          </Modal.Header>

          <Modal.Body className="p-4">
            {/* Error/Success Messages */}
            {error && (
              <Alert
                variant="danger"
                className="mb-3"
                dismissible
                onClose={() => setError("")}
              >
                {error}
              </Alert>
            )}
            {success && (
              <Alert
                variant="success"
                className="mb-3"
                dismissible
                onClose={() => setSuccess("")}
              >
                {success}
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-muted small">
                      Customer Name *
                    </Form.Label>
                    <Form.Control
                      ref={quickNameRef}
                      type="text"
                      name="name"
                      value={quickFormData.name}
                      onChange={handleQuickInputChange}
                      placeholder="Enter customer name"
                      required
                      disabled={isLoading}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-muted small">
                      Phone Number *
                    </Form.Label>
                    <Form.Control
                      ref={quickPhoneRef}
                      type="tel"
                      name="phone"
                      value={quickFormData.phone}
                      onChange={handleQuickInputChange}
                      placeholder="Enter phone number"
                      required
                      disabled={isLoading}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <div className="d-flex gap-2 justify-content-end mt-4">
                <Button
                  ref={quickCancelRef}
                  variant="outline-secondary"
                  onClick={onHide}
                  size="sm"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  ref={quickSaveRef}
                  variant="warning"
                  type="submit"
                  size="sm"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Spinner size="sm" className="me-1" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faRocket} className="me-1" />
                      Add Customer
                    </>
                  )}
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>

        <KeyboardShortcutsHelp
          show={showShortcuts}
          onHide={() => setShowShortcuts(false)}
          shortcuts={shortcuts}
        />
      </>
    );
  }

  return (
    <>
      <Modal
        show={show}
        onHide={onHide}
        centered
        size="xl"
        className="add-party-modal"
      >
        <Modal.Header className="d-flex justify-content-between align-items-center border-0 bg-light">
          <Modal.Title className="fw-bold text-dark mb-0">
            <FontAwesomeIcon
              icon={editingParty ? faEdit : faUser}
              className="me-2 text-primary"
            />
            {editingParty ? "Edit Party" : "Add New Party"}
          </Modal.Title>
          <div className="d-flex align-items-center gap-2">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => setShowShortcuts(true)}
              title="Keyboard Shortcuts (F1)"
              className="border-0"
            >
              <FontAwesomeIcon icon={faKeyboard} />
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={onHide}
              className="border-0 p-1"
              aria-label="Close"
              disabled={isLoading}
            >
              <FontAwesomeIcon icon={faTimes} />
            </Button>
          </div>
        </Modal.Header>

        <Modal.Body className="p-4">
          {/* Error/Success Messages */}
          {error && (
            <Alert
              variant="danger"
              className="mb-3"
              dismissible
              onClose={() => setError("")}
            >
              {error}
            </Alert>
          )}
          {success && (
            <Alert
              variant="success"
              className="mb-3"
              dismissible
              onClose={() => setSuccess("")}
            >
              {success}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            {/* Party Type */}
            <div className="mb-4">
              <Form.Label className="text-muted small mb-2">
                Party Type
              </Form.Label>
              <div className="d-flex gap-4">
                <Form.Check
                  type="radio"
                  name="partyType"
                  id="customer"
                  label="Customer"
                  value="customer"
                  checked={formData.partyType === "customer"}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                <Form.Check
                  type="radio"
                  name="partyType"
                  id="supplier"
                  label="Supplier"
                  value="supplier"
                  checked={formData.partyType === "supplier"}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Basic Information - UPDATED WITH DATABASE SEARCH BUTTON */}
            <div className="mb-4 p-3 bg-light rounded">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="text-muted mb-0 small">Basic Information</h6>
                <Button
                  variant="outline-info"
                  size="sm"
                  onClick={() => setShowDatabaseSearch(true)}
                  type="button"
                  title="Search company database for existing companies (Ctrl+B)"
                  disabled={isLoading}
                  className="d-flex align-items-center"
                >
                  <FontAwesomeIcon icon={faDatabase} className="me-1" />
                  Search Companies
                </Button>
              </div>

              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-muted small">
                      {formData.partyType === "customer"
                        ? "Customer Name"
                        : "Supplier Name"}{" "}
                      *
                    </Form.Label>
                    <Form.Control
                      ref={nameRef}
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder={`Enter ${formData.partyType} name`}
                      required
                      disabled={isLoading}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-muted small">
                      Email Address
                    </Form.Label>
                    <Form.Control
                      ref={emailRef}
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Email address"
                      disabled={isLoading}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-muted small">
                      Phone Number *
                    </Form.Label>
                    <InputGroup>
                      <InputGroup.Text className="small">+91</InputGroup.Text>
                      <Form.Control
                        ref={phoneRef}
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        placeholder="Phone number"
                        maxLength="10"
                        required
                        disabled={isLoading}
                      />
                    </InputGroup>

                    {/* Add Additional Phone Numbers Button */}
                    {!showAdditionalPhones && (
                      <div className="d-flex justify-content-end mt-2">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => setShowAdditionalPhones(true)}
                          type="button"
                          disabled={isLoading}
                          className="d-flex align-items-center"
                        >
                          <FontAwesomeIcon
                            icon={faPlus}
                            className="me-1"
                            size="xs"
                          />
                          <small>Add More Numbers</small>
                        </Button>
                      </div>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              {/* Additional Phone Numbers */}
              {showAdditionalPhones && (
                <div className="mt-3">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <small className="text-muted">
                      Additional Phone Numbers
                    </small>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={addPhoneNumber}
                      type="button"
                      disabled={isLoading}
                    >
                      <FontAwesomeIcon icon={faPlus} className="me-1" />
                      Add
                    </Button>
                  </div>
                  {formData.phoneNumbers.map((phone, index) => (
                    <Row key={index} className="mb-2 align-items-end">
                      <Col md={4}>
                        <Form.Control
                          type="text"
                          value={phone.label}
                          onChange={(e) =>
                            handlePhoneNumberChange(
                              index,
                              "label",
                              e.target.value
                            )
                          }
                          placeholder="Label (e.g., Office)"
                          size="sm"
                          disabled={isLoading}
                        />
                      </Col>
                      <Col md={6}>
                        <Form.Control
                          type="tel"
                          value={phone.number}
                          onChange={(e) =>
                            handlePhoneNumberChange(
                              index,
                              "number",
                              e.target.value
                            )
                          }
                          placeholder="Phone number"
                          size="sm"
                          disabled={isLoading}
                        />
                      </Col>
                      <Col md={2}>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => removePhoneNumber(index)}
                          className="w-100"
                          type="button"
                          disabled={isLoading}
                        >
                          <FontAwesomeIcon icon={faMinus} />
                        </Button>
                      </Col>
                    </Row>
                  ))}
                </div>
              )}
            </div>

            {/* Company Details */}
            <div className="mb-4 p-3 bg-light rounded">
              <h6 className="text-muted mb-3 small">Company Details</h6>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-muted small">
                      Company Name
                    </Form.Label>
                    <Form.Control
                      ref={companyRef}
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      placeholder="Company name"
                      disabled={isLoading}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-muted small">
                      GST Type
                    </Form.Label>
                    <Form.Select
                      ref={gstTypeRef}
                      name="gstType"
                      value={formData.gstType}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    >
                      {gstTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-muted small">
                      GST Number
                      {formData.gstType === "unregistered" && (
                        <small className="text-muted ms-1">
                          (Not Required)
                        </small>
                      )}
                    </Form.Label>
                    <Form.Control
                      ref={gstRef}
                      type="text"
                      name="gstNumber"
                      value={formData.gstNumber}
                      onChange={handleInputChange}
                      placeholder={
                        formData.gstType === "unregistered"
                          ? "Not applicable"
                          : "GST number"
                      }
                      style={{textTransform: "uppercase"}}
                      disabled={
                        isLoading || formData.gstType === "unregistered"
                      }
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Financial Information */}
            <div className="mb-4 p-3 bg-light rounded">
              <h6 className="text-muted mb-3 small">
                <FontAwesomeIcon icon={faCreditCard} className="me-2" />
                Financial Information
              </h6>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-muted small">
                      Credit Limit
                      <small className="text-muted ms-1">(₹0 = No Limit)</small>
                    </Form.Label>
                    <InputGroup>
                      <InputGroup.Text className="small">₹</InputGroup.Text>
                      <Form.Control
                        ref={creditLimitRef}
                        type="number"
                        name="creditLimit"
                        value={formData.creditLimit}
                        onChange={handleInputChange}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        disabled={isLoading}
                      />
                    </InputGroup>
                    <Form.Text className="text-muted">
                      Maximum credit amount allowed for this{" "}
                      {formData.partyType}
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-muted small">
                      Opening Balance
                    </Form.Label>
                    <InputGroup>
                      <InputGroup.Text className="small">₹</InputGroup.Text>
                      <Form.Control
                        ref={balanceRef}
                        type="number"
                        name="openingBalance"
                        value={formData.openingBalance}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        disabled={isLoading}
                      />
                    </InputGroup>
                    <Form.Text className="text-muted">
                      Initial balance amount
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Address Information - Enhanced with Tabs */}
            <div className="mb-4 p-3 bg-light rounded">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="text-muted mb-0 small">Address Information</h6>
                <Button
                  variant="outline-info"
                  size="sm"
                  onClick={copyHomeToDelivery}
                  type="button"
                  title="Copy home address to delivery address (Ctrl+D)"
                  disabled={isLoading}
                >
                  <FontAwesomeIcon icon={faCopy} className="me-1" />
                  Copy Home to Delivery
                </Button>
              </div>

              <Tab.Container
                activeKey={activeAddressTab}
                onSelect={setActiveAddressTab}
              >
                <Nav variant="tabs" className="mb-3">
                  <Nav.Item>
                    <Nav.Link eventKey="home" className="small">
                      <FontAwesomeIcon icon={faHome} className="me-1" />
                      Home Address
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="delivery" className="small">
                      <FontAwesomeIcon icon={faTruck} className="me-1" />
                      Delivery Address
                    </Nav.Link>
                  </Nav.Item>
                </Nav>

                <Tab.Content>
                  {/* Home Address Tab */}
                  <Tab.Pane eventKey="home">
                    <Row>
                      <Col md={12}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-muted small">
                            Home Address
                          </Form.Label>
                          <Form.Control
                            ref={homeAddressRef}
                            as="textarea"
                            rows={2}
                            name="homeAddressLine"
                            value={formData.homeAddressLine}
                            onChange={handleInputChange}
                            placeholder="Enter home address"
                            disabled={isLoading}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-muted small">
                            PIN Code
                          </Form.Label>
                          <Form.Control
                            ref={homePincodeRef}
                            type="text"
                            name="homePincode"
                            value={formData.homePincode}
                            onChange={handleInputChange}
                            placeholder="PIN Code"
                            maxLength="6"
                            disabled={isLoading}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-muted small">
                            State
                          </Form.Label>
                          <Form.Control
                            ref={homeStateRef}
                            type="text"
                            name="homeState"
                            value={formData.homeState}
                            onChange={handleInputChange}
                            placeholder="State"
                            disabled={isLoading}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-muted small">
                            District
                          </Form.Label>
                          <Form.Control
                            ref={homeDistrictRef}
                            type="text"
                            name="homeDistrict"
                            value={formData.homeDistrict}
                            onChange={handleInputChange}
                            placeholder="District"
                            disabled={isLoading}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-muted small">
                            Taluka
                          </Form.Label>
                          <Form.Control
                            ref={homeTalukaRef}
                            type="text"
                            name="homeTaluka"
                            value={formData.homeTaluka}
                            onChange={handleInputChange}
                            placeholder="Taluka"
                            disabled={isLoading}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Tab.Pane>

                  {/* Delivery Address Tab */}
                  <Tab.Pane eventKey="delivery">
                    <div className="mb-3">
                      <Form.Check
                        type="checkbox"
                        name="sameAsHomeAddress"
                        id="sameAsHomeAddress"
                        label="Same as home address"
                        checked={formData.sameAsHomeAddress}
                        onChange={handleInputChange}
                        className="mb-3"
                        disabled={isLoading}
                      />
                    </div>

                    <Row>
                      <Col md={12}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-muted small">
                            Delivery Address
                          </Form.Label>
                          <Form.Control
                            ref={deliveryAddressRef}
                            as="textarea"
                            rows={2}
                            name="deliveryAddressLine"
                            value={formData.deliveryAddressLine}
                            onChange={handleInputChange}
                            placeholder="Enter delivery address"
                            disabled={formData.sameAsHomeAddress || isLoading}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-muted small">
                            PIN Code
                          </Form.Label>
                          <Form.Control
                            ref={deliveryPincodeRef}
                            type="text"
                            name="deliveryPincode"
                            value={formData.deliveryPincode}
                            onChange={handleInputChange}
                            placeholder="PIN Code"
                            maxLength="6"
                            disabled={formData.sameAsHomeAddress || isLoading}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-muted small">
                            State
                          </Form.Label>
                          <Form.Control
                            ref={deliveryStateRef}
                            type="text"
                            name="deliveryState"
                            value={formData.deliveryState}
                            onChange={handleInputChange}
                            placeholder="State"
                            disabled={formData.sameAsHomeAddress || isLoading}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-muted small">
                            District
                          </Form.Label>
                          <Form.Control
                            ref={deliveryDistrictRef}
                            type="text"
                            name="deliveryDistrict"
                            value={formData.deliveryDistrict}
                            onChange={handleInputChange}
                            placeholder="District"
                            disabled={formData.sameAsHomeAddress || isLoading}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label className="text-muted small">
                            Taluka
                          </Form.Label>
                          <Form.Control
                            ref={deliveryTalukaRef}
                            type="text"
                            name="deliveryTaluka"
                            value={formData.deliveryTaluka}
                            onChange={handleInputChange}
                            placeholder="Taluka"
                            disabled={formData.sameAsHomeAddress || isLoading}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Tab.Pane>
                </Tab.Content>
              </Tab.Container>
            </div>

            {/* Action Buttons */}
            <div className="d-flex gap-2 justify-content-end">
              <Button
                ref={cancelButtonRef}
                variant="outline-secondary"
                onClick={onHide}
                size="sm"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                ref={saveButtonRef}
                variant="primary"
                type="submit"
                size="sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Spinner size="sm" className="me-1" />
                    {editingParty ? "Updating..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon
                      icon={editingParty ? faEdit : faPlus}
                      className="me-1"
                    />
                    {editingParty ? "Update" : "Save"} Party
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* DATABASE SEARCH COMPONENT */}
      <DatabaseSearch
        show={showDatabaseSearch}
        onHide={() => setShowDatabaseSearch(false)}
        onSelectParty={handleDatabaseSearchSelect}
        onClose={() => setShowDatabaseSearch(false)}
      />

      <KeyboardShortcutsHelp
        show={showShortcuts}
        onHide={() => setShowShortcuts(false)}
        shortcuts={shortcuts}
      />

      <style>
        {`
        .add-party-modal .modal-dialog {
          max-width: 1200px;
        }
        
        .add-party-modal .nav-tabs .nav-link {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
        }
        
        .add-party-modal .nav-tabs .nav-link.active {
          background-color: #f8f9fa;
          border-color: #dee2e6 #dee2e6 #f8f9fa;
        }
        
        .add-party-modal .tab-content {
          border: 1px solid #dee2e6;
          border-top: none;
          padding: 1rem;
          border-radius: 0 0 0.375rem 0.375rem;
          background-color: white;
        }
      `}
      </style>
    </>
  );
}

export default AddNewParty;
