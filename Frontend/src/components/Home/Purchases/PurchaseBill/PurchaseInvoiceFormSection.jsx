import React, {useState, useEffect, useRef, useCallback, useMemo} from "react";
import {
  Row,
  Col,
  Form,
  Button,
  Card,
  Table,
  Badge,
  Alert,
  Modal,
  InputGroup,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTrash,
  faEdit,
  faShoppingCart,
  faBoxOpen,
  faRupeeSign,
  faCalculator,
  faPercent,
  faCheck,
  faTimes,
  faSave,
  faBox,
  faReceipt,
  faFileInvoice,
  faMoneyBillWave,
  faWallet,
  faSpinner,
  faExclamationTriangle,
  faCheckCircle,
  faUser,
  faCreditCard,
  faUniversity,
  faCalendarAlt,
  faDownload,
  faShare,
  faTimes as faCancel,
  faTruck,
} from "@fortawesome/free-solid-svg-icons";

// Import purchase-specific hooks and logic
import {
  useItemsManagement,
  useItemSearch,
  useRoundOff,
  useBankAccounts,
  usePaymentManagement,
  usePartySelection,
  useInvoiceSave,
} from "../../Sales/SalesInvoice/SalesForm/itemsTableWithTotals/itemsTableHooks";
import itemsTableLogic from "../../Sales/SalesInvoice/SalesForm/itemsTableWithTotals/itemsTableLogic";
import PaymentModal from "../../Sales/SalesInvoice/SalesForm/itemsTableWithTotals/PaymentModal";
import itemService from "../../../../services/itemService";
import purchaseService from "../../../../services/purchaseService";

// ✅ PURPLE THEME CONSTANTS - Defined directly in the component
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
  gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
  shadowSm: "0 1px 3px rgba(99, 102, 241, 0.1)",
  shadowMd: "0 4px 12px rgba(99, 102, 241, 0.15)",
  shadowLg: "0 8px 25px rgba(99, 102, 241, 0.2)",
};

function PurchaseInvoiceFormSection({
  formData,
  onFormDataChange,
  companyId,
  currentUser,
  currentCompany,
  addToast,
  onSave,
  onCancel,
  onShare,
  errors = {},
  disabled = false,
  mode = "purchases",
  documentType = "purchase",
  isPurchaseOrdersMode = false,
  editMode = false,
  saving = false,
  labels = {},
}) {
  // ✅ ENHANCED STYLING FUNCTIONS WITH PURPLE THEME
  const getInputStyle = (hasError = false) => ({
    borderColor: hasError ? purpleTheme.error : purpleTheme.border,
    fontSize: "14px",
    padding: "12px 16px",
    height: "48px",
    borderWidth: "2px",
    borderRadius: "8px",
    transition: "all 0.3s ease",
    backgroundColor: purpleTheme.surface,
    boxShadow: hasError
      ? `0 0 0 3px rgba(239, 68, 68, 0.1)`
      : `0 1px 3px rgba(${purpleTheme.primaryRgb}, 0.1)`,
    fontWeight: "500",
  });

  const getCardStyle = () => ({
    borderRadius: "12px",
    border: `2px solid ${purpleTheme.border}`,
    boxShadow: purpleTheme.shadowMd,
    backgroundColor: purpleTheme.surface,
    overflow: "hidden",
  });

  const getButtonStyle = (variant = "primary", size = "md") => {
    const baseStyle = {
      borderRadius: "8px",
      fontWeight: "600",
      transition: "all 0.3s ease",
      border: "2px solid transparent",
      textTransform: "none",
      letterSpacing: "0.02em",
    };

    const sizeStyles = {
      sm: {padding: "6px 12px", fontSize: "13px"},
      md: {padding: "10px 20px", fontSize: "14px"},
      lg: {padding: "12px 24px", fontSize: "16px"},
    };

    const variantStyles = {
      primary: {
        backgroundColor: purpleTheme.primary,
        borderColor: purpleTheme.primary,
        color: "white",
        boxShadow: `0 2px 8px rgba(${purpleTheme.primaryRgb}, 0.3)`,
      },
      secondary: {
        backgroundColor: purpleTheme.secondary,
        borderColor: purpleTheme.secondary,
        color: "white",
        boxShadow: `0 2px 8px rgba(139, 92, 246, 0.3)`,
      },
      success: {
        backgroundColor: purpleTheme.success,
        borderColor: purpleTheme.success,
        color: "white",
        boxShadow: `0 2px 8px rgba(16, 185, 129, 0.3)`,
      },
      warning: {
        backgroundColor: purpleTheme.warning,
        borderColor: purpleTheme.warning,
        color: "white",
        boxShadow: `0 2px 8px rgba(245, 158, 11, 0.3)`,
      },
      outline: {
        backgroundColor: "transparent",
        borderColor: purpleTheme.border,
        color: purpleTheme.text,
        boxShadow: "none",
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  // ======================== STATE MANAGEMENT ========================
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionRef = useRef(false);

  // ======================== PURCHASE-SPECIFIC HOOKS ========================
  const {
    localItems,
    setLocalItems,
    totals,
    handleItemChange,
    addRow,
    deleteRow,
    updateTotals,
    calculateItemTotals,
  } = useItemsManagement(
    formData.items || [],
    (newItems) => onFormDataChange("items", newItems),
    formData.gstEnabled,
    "without-tax"
  );

  const {
    itemSearches,
    itemSuggestions,
    showItemSuggestions,
    searchNotFound,
    searchLoading,
    handleItemSearch,
    handleItemSuggestionSelect,
  } = useItemSearch(companyId);

  const {
    roundOffEnabled,
    setRoundOffEnabled,
    roundOffCalculation,
    roundOffDisplayInfo,
    finalTotalWithRoundOff,
    roundOffValue,
  } = useRoundOff(totals, formData.gstEnabled);

  const {
    bankAccounts,
    setBankAccounts,
    loadingBankAccounts,
    loadBankAccounts,
    retryLoadBankAccounts,
  } = useBankAccounts(companyId);

  const {
    getSelectedParty,
    getPartyType,
    getPartyName,
    getPartyId,
    getSecondaryParty,
    getSecondaryPartyName,
    getSecondaryPartyType,
    validatePaymentRequirements,
  } = usePartySelection(formData.customer, null, "purchase", addToast);

  // ======================== PURCHASE CONFIGURATION ========================
  const currentConfig = useMemo(() => {
    if (isPurchaseOrdersMode) {
      return {
        formIcon: faShoppingCart,
        actionButtonColor: "warning",
        paymentIcon: faShoppingCart,
        paymentAction: "Add Order Terms",
        totalLabel: "Order Total",
        totalTextColor: "text-warning",
        totalBorderColor: "border-warning",
        saveButtonVariant: "warning",
        saveButtonText: editMode ? "Update Order" : "Save Order",
        documentName: "Purchase Order",
        entityType: "supplier",
        entityLabel: "Supplier",
        formType: "purchase-order",
        transactionType: "purchase-order",
      };
    } else {
      return {
        formIcon: faFileInvoice,
        actionButtonColor: "primary",
        paymentIcon: faMoneyBillWave,
        paymentAction: "Add Payment",
        totalLabel: "Purchase Total",
        totalTextColor: "text-primary",
        totalBorderColor: "border-primary",
        saveButtonVariant: "primary",
        saveButtonText: editMode ? "Update Bill" : "Save Bill",
        documentName: "Purchase Bill",
        entityType: "supplier",
        entityLabel: "Supplier",
        formType: "purchase",
        transactionType: "purchase",
      };
    }
  }, [isPurchaseOrdersMode, editMode]);

  // ======================== MODAL AND FORM STATE ========================
  const [showProductFormModal, setShowProductFormModal] = useState(false);
  const [currentEditingIndex, setCurrentEditingIndex] = useState(null);
  const [products, setProducts] = useState([]);
  const [productSearchTerms, setProductSearchTerms] = useState("");
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [productSearchNotFound, setProductSearchNotFound] = useState(false);

  const [tempFormData, setTempFormData] = useState({
    selectedProduct: "",
    itemName: "",
    itemCode: "",
    description: "",
    quantity: "",
    pricePerUnit: "",
    unit: "PCS",
    taxMode: "without-tax",
    taxRate: 18,
    discountPercent: 0,
    discountAmount: 0,
    hsnCode: "",
    amount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    availableStock: 0,
  });

  const isSelectingProductRef = useRef(false);
  const searchTimeoutRef = useRef(null);

  // ======================== TOTAL CALCULATIONS ========================
  const calculateDirectTotal = useCallback(() => {
    if (!localItems || localItems.length === 0) return 0;

    const validItems = localItems.filter(
      (item) =>
        item.itemName &&
        parseFloat(item.quantity || 0) > 0 &&
        parseFloat(item.pricePerUnit || 0) > 0
    );

    return validItems.reduce(
      (total, item) => total + (parseFloat(item.amount) || 0),
      0
    );
  }, [localItems]);

  const directTotal = calculateDirectTotal();
  const displayTotal = useMemo(() => {
    return finalTotalWithRoundOff || totals.finalTotal || directTotal;
  }, [finalTotalWithRoundOff, totals.finalTotal, directTotal]);

  // ======================== PAYMENT MANAGEMENT ========================
  const {
    showPaymentModal,
    setShowPaymentModal,
    paymentData,
    setPaymentData,
    paymentHistory,
    loadingPaymentHistory,
    submittingPayment,
    handlePaymentAmountChange,
    handlePaymentTypeChange,
    handlePaymentSubmit: baseHandlePaymentSubmit,
    createTransactionWithInvoice,
    resetPaymentData,
    handleDueDateToggle,
    handleCreditDaysChange,
    handleDueDateChange,
    handleBankAccountChange,
  } = usePaymentManagement(
    "purchase",
    companyId,
    displayTotal,
    null,
    formData.customer,
    formData.invoiceNumber,
    currentUser?.id,
    currentConfig,
    bankAccounts
  );

  // ======================== CONSTANTS AND HELPERS ========================
  const inputStyle = {
    borderColor: purpleTheme.border,
    fontSize: "14px",
    padding: "12px 16px",
    height: "48px",
    borderWidth: "2px",
    borderRadius: "8px",
    transition: "all 0.3s ease",
    backgroundColor: purpleTheme.surface,
    boxShadow: `0 1px 3px rgba(${purpleTheme.primaryRgb}, 0.1)`,
  };

  const hasValidItems = useMemo(() => {
    return (
      localItems.length > 0 &&
      localItems.some(
        (item) => item.itemName && item.quantity > 0 && item.pricePerUnit > 0
      )
    );
  }, [localItems]);

  const gridLayout = itemsTableLogic.getGridLayout(
    hasValidItems,
    formData.gstEnabled,
    totals.totalTax
  );

  // ======================== LIFECYCLE EFFECTS ========================
  useEffect(() => {
    return () => {
      submissionRef.current = false;
      setIsSubmitting(false);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // ======================== PRODUCT SEARCH FUNCTIONS ========================
  const handleProductSearchChange = async (query) => {
    setProductSearchTerms(query);

    if (!query.trim() || query.length < 2) {
      setProducts([]);
      setShowProductSuggestions(false);
      setProductSearchNotFound(false);
      return;
    }

    try {
      setProductSearchLoading(true);
      setProductSearchNotFound(false);

      const response = await itemService.getItems(companyId, {
        search: query,
        limit: 20,
        isActive: true,
        type: "product",
      });

      let searchResults = [];

      if (response?.success && response.data) {
        if (response.data.items && Array.isArray(response.data.items)) {
          searchResults = response.data.items;
        } else if (Array.isArray(response.data)) {
          searchResults = response.data;
        }
      } else if (Array.isArray(response)) {
        searchResults = response;
      }

      const enhancedResults = searchResults.map((product) => ({
        ...product,
        stock:
          product.stock || product.currentStock || product.availableStock || 0,
        currentStock:
          product.currentStock || product.stock || product.availableStock || 0,
        availableStock:
          product.availableStock || product.stock || product.currentStock || 0,
        purchasePrice:
          product.purchasePrice || product.costPrice || product.buyPrice || 0,
        displayPrice:
          product.purchasePrice ||
          product.costPrice ||
          product.buyPrice ||
          product.salePrice ||
          0,
      }));

      if (enhancedResults.length > 0) {
        setProducts(enhancedResults);
        setShowProductSuggestions(true);
        setProductSearchNotFound(false);
      } else {
        setProducts([]);
        setShowProductSuggestions(false);
        setProductSearchNotFound(true);
      }
    } catch (error) {
      setProducts([]);
      setShowProductSuggestions(false);
      setProductSearchNotFound(true);
      addToast?.("Failed to search products: " + error.message, "error");
    } finally {
      setProductSearchLoading(false);
    }
  };

  const debouncedProductSearch = useCallback(
    (query) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        handleProductSearchChange(query);
      }, 300);
    },
    [companyId]
  );

  const handleCreateNewItem = () => {
    const newItemName = productSearchTerms.trim();

    if (!newItemName) {
      addToast?.("Please enter an item name", "warning");
      return;
    }

    setTempFormData((prev) => ({
      ...prev,
      itemName: newItemName,
      selectedProduct: null,
    }));

    setProducts([]);
    setShowProductSuggestions(false);
    setProductSearchNotFound(false);

    addToast?.(`Creating new item: "${newItemName}"`, "info");
  };

  const handleProductSelect = (product) => {
    isSelectingProductRef.current = true;

    setTempFormData((prev) => {
      const updated = {
        ...prev,
        selectedProduct: product.id || product._id,
        itemName: product.name,
        itemCode: product.code || product.itemCode || "",
        description: product.description || "",
        pricePerUnit: (
          product.purchasePrice ||
          product.costPrice ||
          product.buyPrice ||
          product.salePrice ||
          0
        ).toString(),
        taxRate: product.gstRate || product.taxRate || 18,
        unit: product.unit || "PCS",
        availableStock:
          product.availableStock || product.stock || product.currentStock || 0,
        currentStock:
          product.currentStock || product.stock || product.availableStock || 0,
        stock:
          product.stock || product.currentStock || product.availableStock || 0,
        hsnCode: product.hsnCode || product.hsnNumber || "",
      };
      return calculateTempItemTotal(updated);
    });

    setProductSearchTerms(product.name);
    setShowProductSuggestions(false);
    setProductSearchNotFound(false);

    setTimeout(() => {
      isSelectingProductRef.current = false;
    }, 300);
  };

  // ======================== FORM VALIDATION ========================
  const validateTempForm = () => {
    const validation = itemsTableLogic.validateItems(
      [tempFormData],
      formData.gstEnabled
    );

    if (!validation.isValid && validation.errors.length > 0) {
      addToast?.(validation.errors[0], "error");
      return false;
    }

    return true;
  };

  // ======================== ITEM CALCULATIONS ========================
  const calculateTempItemTotal = useCallback(
    (itemData) => {
      const quantity = parseFloat(itemData.quantity || 0);
      const pricePerUnit = parseFloat(itemData.pricePerUnit || 0);
      const discountPercent = parseFloat(itemData.discountPercent || 0);
      const taxRate = parseFloat(itemData.taxRate || 18);
      const taxMode = itemData.taxMode || "without-tax";

      if (quantity <= 0 || pricePerUnit <= 0) {
        return {
          ...itemData,
          amount: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          discountAmount: 0,
          taxableAmount: 0,
          taxMode: taxMode,
          priceIncludesTax: taxMode === "with-tax",
          gstMode: taxMode === "with-tax" ? "include" : "exclude",
        };
      }

      let baseAmount = quantity * pricePerUnit;
      let discountAmount = 0;
      if (discountPercent > 0) {
        discountAmount = (baseAmount * discountPercent) / 100;
        baseAmount = baseAmount - discountAmount;
      }

      let cgstAmount = 0;
      let sgstAmount = 0;
      let finalAmount = 0;
      let taxableAmount = 0;

      if (formData.gstEnabled && taxRate > 0) {
        if (taxMode === "with-tax") {
          const taxMultiplier = 1 + taxRate / 100;
          taxableAmount = baseAmount / taxMultiplier;
          const totalTaxAmount = baseAmount - taxableAmount;
          cgstAmount = totalTaxAmount / 2;
          sgstAmount = totalTaxAmount / 2;
          finalAmount = baseAmount;
        } else {
          taxableAmount = baseAmount;
          const totalTaxAmount = (taxableAmount * taxRate) / 100;
          cgstAmount = totalTaxAmount / 2;
          sgstAmount = totalTaxAmount / 2;
          finalAmount = taxableAmount + totalTaxAmount;
        }
      } else {
        taxableAmount = baseAmount;
        finalAmount = baseAmount;
        cgstAmount = 0;
        sgstAmount = 0;
      }

      return {
        ...itemData,
        quantity: quantity,
        pricePerUnit: pricePerUnit,
        discountPercent: discountPercent,
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        taxableAmount: parseFloat(taxableAmount.toFixed(2)),
        cgstAmount: parseFloat(cgstAmount.toFixed(2)),
        sgstAmount: parseFloat(sgstAmount.toFixed(2)),
        amount: parseFloat(finalAmount.toFixed(2)),
        taxMode: taxMode,
        priceIncludesTax: taxMode === "with-tax",
        gstMode: taxMode === "with-tax" ? "include" : "exclude",
      };
    },
    [formData.gstEnabled]
  );

  const handleTempFormChange = (field, value) => {
    setTempFormData((prev) => {
      let updated = {...prev};

      if (field === "taxMode") {
        updated.taxMode = value;
        updated = calculateTempItemTotal({
          ...updated,
          taxMode: value,
        });
      } else if (field === "taxRate") {
        updated[field] = parseFloat(value) || 0;
        updated = calculateTempItemTotal(updated);
      } else {
        updated[field] = value;
        updated = calculateTempItemTotal(updated);
      }

      return updated;
    });
  };

  // ======================== PAYMENT HANDLING ========================
  const handlePaymentSubmit = useCallback(async () => {
    try {
      const validation = itemsTableLogic.validatePaymentData(
        paymentData,
        displayTotal,
        bankAccounts
      );

      if (!validation.isValid) {
        addToast?.(validation.errors[0], "error");
        return;
      }

      const formatPaymentData = (data) => {
        const formatted = {
          ...data,
          amount: parseFloat(data.amount || 0),
          paymentMethod: data.paymentMethod || "cash",
          paymentType: data.paymentType || "Cash",
          invoiceNumber: formData.invoiceNumber,
          companyId: companyId,
          formType: "purchase",
          transactionType: isPurchaseOrdersMode ? "purchase-order" : "purchase",
          entityType: "supplier",
          createdAt: new Date().toISOString(),
        };

        if (data.dueDate) {
          if (data.dueDate instanceof Date) {
            formatted.dueDate = data.dueDate.toISOString();
          } else if (typeof data.dueDate === "string") {
            formatted.dueDate = new Date(data.dueDate).toISOString();
          } else if (typeof data.dueDate === "number") {
            formatted.dueDate = new Date(data.dueDate).toISOString();
          }
        } else if (data.creditDays && parseInt(data.creditDays) > 0) {
          const today = new Date();
          const dueDate = new Date(today);
          dueDate.setDate(today.getDate() + parseInt(data.creditDays));
          formatted.dueDate = dueDate.toISOString();
          formatted.creditDays = parseInt(data.creditDays);
        } else {
          formatted.dueDate = null;
          formatted.creditDays = 0;
        }

        if (data.bankAccountId) {
          formatted.bankAccountId = data.bankAccountId;
        }

        if (data.notes) {
          formatted.notes = data.notes.trim();
        }

        return formatted;
      };

      if (
        baseHandlePaymentSubmit &&
        typeof baseHandlePaymentSubmit === "function"
      ) {
        const result = await baseHandlePaymentSubmit(paymentData);

        if (result && result.success) {
          const formattedPaymentData = formatPaymentData(
            result.paymentData || paymentData
          );
          onFormDataChange("paymentData", formattedPaymentData);
          setShowPaymentModal(false);
          addToast?.(
            `Payment details saved! Click 'Save ${currentConfig.documentName}' to complete.`,
            "success"
          );
          return {...result, paymentData: formattedPaymentData};
        } else {
          throw new Error(result?.message || "Payment processing failed");
        }
      } else {
        const enhancedPaymentData = formatPaymentData(paymentData);
        onFormDataChange("paymentData", enhancedPaymentData);
        setShowPaymentModal(false);
        addToast?.("Payment details saved successfully!", "success");

        return {
          success: true,
          message: "Payment details saved successfully",
          paymentData: enhancedPaymentData,
        };
      }
    } catch (error) {
      addToast?.(`Payment processing error: ${error.message}`, "error");
      throw error;
    }
  }, [
    paymentData,
    displayTotal,
    addToast,
    onFormDataChange,
    bankAccounts,
    formData.invoiceNumber,
    companyId,
    isPurchaseOrdersMode,
    baseHandlePaymentSubmit,
    setShowPaymentModal,
    currentConfig.documentName,
  ]);

  // ======================== PURCHASE SAVE HANDLING ========================
  const handleSavePurchase = useCallback(async () => {
    if (saving || isSubmitting || submissionRef.current) {
      return;
    }

    try {
      setIsSubmitting(true);
      submissionRef.current = true;

      const validItemsForValidation = localItems.filter(
        (item) =>
          item.itemName &&
          item.itemName.trim() !== "" &&
          parseFloat(item.quantity || 0) > 0 &&
          parseFloat(item.pricePerUnit || 0) > 0
      );

      if (validItemsForValidation.length === 0) {
        addToast?.(
          "Please add at least one item with name, quantity, and price",
          "warning"
        );
        return;
      }

      if (!formData.customer && !isPurchaseOrdersMode) {
        addToast?.("Please select a supplier", "warning");
        return;
      }

      if (displayTotal <= 0) {
        addToast?.("Invalid total amount. Please check your items.", "warning");
        return;
      }

      const validCompanyId = companyId || formData.companyId;
      if (!validCompanyId) {
        addToast?.(
          "Company information is missing. Please refresh and try again.",
          "error"
        );
        return;
      }

      const supplierData = formData.customer
        ? {
            id: formData.customer.id || formData.customer._id,
            name:
              formData.customer.name || formData.customer.businessName || "",
            mobile: formData.customer.mobile || formData.customer.phone || "",
            email: formData.customer.email || "",
            address: formData.customer.address || "",
            gstNumber: formData.customer.gstNumber || "",
          }
        : null;

      const purchaseDataForService = {
        companyId: validCompanyId,
        customer: formData.customer,
        supplier: formData.customer
          ? {
              id: formData.customer.id || formData.customer._id,
              _id: formData.customer.id || formData.customer._id,
              name:
                formData.customer.name || formData.customer.businessName || "",
              mobile: formData.customer.mobile || formData.customer.phone || "",
              email: formData.customer.email || "",
              address: formData.customer.address || "",
              gstNumber: formData.customer.gstNumber || "",
            }
          : null,
        supplierName:
          formData.customer?.name || formData.customer?.businessName || "",
        supplierMobile:
          formData.customer?.mobile || formData.customer?.phone || "",
        supplierEmail: formData.customer?.email || "",
        supplierAddress: formData.customer?.address || "",
        supplierGstNumber: formData.customer?.gstNumber || "",
        supplierId: formData.customer?.id || formData.customer?._id || null,
        partyName:
          formData.customer?.name || formData.customer?.businessName || "",
        partyPhone: formData.customer?.mobile || formData.customer?.phone || "",
        partyEmail: formData.customer?.email || "",
        partyAddress: formData.customer?.address || "",
        mobileNumber:
          formData.customer?.mobile || formData.customer?.phone || "",
        items: validItemsForValidation.map((item, index) => ({
          itemRef: item.itemRef || item.selectedProduct || null,
          itemName: item.itemName?.trim() || "",
          itemCode: item.itemCode || "",
          description: item.description || "",
          quantity: parseFloat(item.quantity) || 0,
          unit: item.unit || "PCS",
          pricePerUnit: parseFloat(item.pricePerUnit) || 0,
          hsnCode: item.hsnCode || "0000",
          taxRate: parseFloat(item.taxRate || 18),
          taxMode: item.taxMode || "without-tax",
          priceIncludesTax: item.taxMode === "with-tax",
          discountPercent: parseFloat(item.discountPercent || 0),
          discountAmount: parseFloat(item.discountAmount || 0),
          cgstAmount: parseFloat(item.cgstAmount || 0),
          sgstAmount: parseFloat(item.sgstAmount || 0),
          amount: parseFloat(item.amount || 0),
          itemAmount: parseFloat(item.amount || 0),
          lineNumber: index + 1,
          category: item.category || "",
          currentStock: parseFloat(item.currentStock || 0),
        })),
        purchaseNumber: formData.invoiceNumber || `PB-${Date.now()}`,
        invoiceNumber: formData.invoiceNumber || `PB-${Date.now()}`,
        purchaseDate:
          formData.invoiceDate || new Date().toISOString().split("T")[0],
        invoiceDate:
          formData.invoiceDate || new Date().toISOString().split("T")[0],
        gstEnabled: Boolean(formData.gstEnabled),
        purchaseType: formData.gstEnabled ? "gst" : "non-gst",
        globalTaxMode: "without-tax",
        priceIncludesTax: false,
        totals: {
          subtotal: totals.subtotal || 0,
          totalDiscount: totals.totalDiscount || 0,
          totalTax: totals.totalTax || 0,
          totalCGST: totals.totalCGST || 0,
          totalSGST: totals.totalSGST || 0,
          totalIGST: 0,
          finalTotal: displayTotal,
          grandTotal: displayTotal,
          amount: displayTotal,
        },
        amount: displayTotal,
        total: displayTotal,
        finalTotal: displayTotal,
        grandTotal: displayTotal,
        subtotal: totals.subtotal || 0,
        totalTax: totals.totalTax || 0,
        totalDiscount: totals.totalDiscount || 0,
        paymentReceived: paymentData?.amount || 0,
        paymentAmount: paymentData?.amount || 0,
        paymentMethod: paymentData?.paymentMethod || "cash",
        paymentType: paymentData?.paymentMethod || "cash",
        bankAccountId: paymentData?.bankAccountId || null,
        dueDate: paymentData?.dueDate || null,
        creditDays: paymentData?.creditDays || 0,
        paymentData: paymentData || {},
        notes: formData.notes || "",
        termsAndConditions: formData.termsAndConditions || "",
        status: isPurchaseOrdersMode ? "draft" : "completed",
        roundOff: roundOffValue || 0,
        roundOffEnabled: roundOffEnabled || false,
        employeeName: currentUser?.name || "",
        employeeId: currentUser?.id || currentUser?._id || "",
        createdBy: currentUser?.id || currentUser?._id || "",
        formType: isPurchaseOrdersMode ? "purchase-order" : "purchase",
        documentType: isPurchaseOrdersMode ? "purchase-order" : "purchase",
        transactionType: isPurchaseOrdersMode ? "purchase-order" : "purchase",
      };

      if (!purchaseDataForService.companyId) {
        throw new Error("Company ID is missing");
      }

      if (
        !purchaseDataForService.supplier &&
        !purchaseDataForService.supplierName &&
        !isPurchaseOrdersMode
      ) {
        throw new Error("Supplier information is missing");
      }

      if (
        !purchaseDataForService.items ||
        purchaseDataForService.items.length === 0
      ) {
        throw new Error("No items provided");
      }

      let result;

      try {
        if (editMode && formData.id) {
          result = await purchaseService.updatePurchase(
            formData.id,
            purchaseDataForService,
            {
              name: currentUser?.name || "",
              id: currentUser?.id || currentUser?._id || "",
            }
          );

          if (
            result?.success &&
            paymentData?.amount > 0 &&
            paymentData.bankAccountId
          ) {
            try {
              const paymentResult =
                await purchaseService.addPaymentWithTransaction(
                  validCompanyId,
                  formData.id,
                  {
                    amount: paymentData.amount,
                    method: paymentData.paymentMethod || "cash",
                    bankAccountId: paymentData.bankAccountId,
                    notes: paymentData.notes || "",
                    dueDate: paymentData.dueDate,
                    creditDays: paymentData.creditDays || 0,
                    employeeName: currentUser?.name || "",
                    employeeId: currentUser?.id || currentUser?._id || "",
                  }
                );

              if (!paymentResult?.success) {
                addToast?.(
                  `Purchase updated successfully, but payment transaction failed: ${
                    paymentResult?.message || "Payment error"
                  }`,
                  "warning"
                );
              }
            } catch (paymentError) {
              console.warn("Payment transaction error:", paymentError);
              addToast?.(
                "Purchase updated successfully, but payment transaction could not be recorded. You can add payment manually later.",
                "warning"
              );
            }
          }
        } else {
          const hasPaymentWithBankAccount =
            paymentData?.amount > 0 &&
            paymentData.bankAccountId &&
            paymentData.paymentMethod !== "cash";

          if (hasPaymentWithBankAccount) {
            try {
              result = await purchaseService.createPurchaseWithTransaction(
                purchaseDataForService
              );
            } catch (combinedError) {
              console.warn(
                "Combined creation failed, trying separate approach:",
                combinedError
              );

              const purchaseDataWithoutPayment = {
                ...purchaseDataForService,
                paymentReceived: 0,
                paymentAmount: 0,
                bankAccountId: null,
              };
              result = await purchaseService.createPurchase(
                purchaseDataWithoutPayment
              );

              if (result?.success && paymentData.amount > 0) {
                try {
                  const purchaseId = result.data?._id || result.data?.id;
                  const paymentResult =
                    await purchaseService.addPaymentWithTransaction(
                      validCompanyId,
                      purchaseId,
                      {
                        amount: paymentData.amount,
                        method: paymentData.paymentMethod || "cash",
                        bankAccountId: paymentData.bankAccountId,
                        notes: paymentData.notes || "",
                        dueDate: paymentData.dueDate,
                        creditDays: paymentData.creditDays || 0,
                        employeeName: currentUser?.name || "",
                        employeeId: currentUser?.id || currentUser?._id || "",
                      }
                    );

                  if (paymentResult?.success) {
                    result.data.transaction = paymentResult.data.transaction;
                    result.data.transactionId =
                      paymentResult.data.transactionId;
                  } else {
                    addToast?.(
                      "Purchase created successfully, but payment transaction could not be recorded. You can add payment manually later.",
                      "warning"
                    );
                  }
                } catch (paymentError) {
                  console.warn(
                    "Separate payment creation failed:",
                    paymentError
                  );
                  addToast?.(
                    "Purchase created successfully, but payment transaction could not be recorded. You can add payment manually later.",
                    "warning"
                  );
                }
              }
            }
          } else {
            result = await purchaseService.createPurchase(
              purchaseDataForService
            );
          }
        }

        if (result?.success) {
          const savedAmount =
            result.data?.totals?.finalTotal ||
            result.data?.total ||
            result.data?.amount ||
            displayTotal;

          addToast?.(
            `${currentConfig.documentName} ${
              editMode ? "updated" : "created"
            } successfully! Amount: ₹${savedAmount.toFixed(2)}`,
            "success"
          );

          if (result.data?.transactionWarning) {
            addToast?.(result.data.transactionWarning, "warning");
          }

          if (resetPaymentData) {
            resetPaymentData();
          }

          if (onSave && typeof onSave === "function") {
            try {
              await onSave(result.data);
            } catch (saveError) {
              console.warn("Parent onSave error:", saveError);
            }
          }

          if (onCancel) {
            setTimeout(() => onCancel(), 1000);
          }

          return result;
        } else {
          throw new Error(
            result?.message ||
              `Failed to ${
                editMode ? "update" : "create"
              } ${currentConfig.documentName.toLowerCase()}`
          );
        }
      } catch (serviceError) {
        console.error("Purchase service error:", serviceError);

        if (serviceError.message?.includes("not a function")) {
          addToast?.(
            `Service method error: ${serviceError.message}. Please check the purchase service configuration.`,
            "error"
          );
        } else if (serviceError.message?.includes("Network")) {
          addToast?.(
            "Network error occurred. Please check your internet connection and try again.",
            "error"
          );
        } else if (serviceError.message?.includes("already in progress")) {
          return;
        } else {
          addToast?.(
            serviceError.message ||
              `Failed to ${
                editMode ? "update" : "save"
              } ${currentConfig.documentName.toLowerCase()}`,
            "error"
          );
        }

        throw serviceError;
      }
    } catch (error) {
      console.error("HandleSavePurchase error:", error);

      if (
        error.message === "Purchase creation already in progress" ||
        error.message === "Request already in progress" ||
        error.message === "Save in progress"
      ) {
        return;
      }

      if (
        !error.message?.includes("Service method error") &&
        !error.message?.includes("Network error")
      ) {
        addToast?.(
          error.message ||
            `Failed to ${
              editMode ? "update" : "save"
            } ${currentConfig.documentName.toLowerCase()}`,
          "error"
        );
      }
    } finally {
      setIsSubmitting(false);
      submissionRef.current = false;
    }
  }, [
    saving,
    isSubmitting,
    localItems,
    formData,
    isPurchaseOrdersMode,
    addToast,
    resetPaymentData,
    onCancel,
    onSave,
    displayTotal,
    totals,
    roundOffEnabled,
    roundOffValue,
    paymentData,
    hasValidItems,
    companyId,
    currentUser,
    editMode,
    currentConfig.documentName,
  ]);

  // ======================== ITEM MANAGEMENT FUNCTIONS ========================
  const handleAddProductClick = () => {
    setCurrentEditingIndex(null);
    const emptyItem = itemsTableLogic.createEmptyItem();
    setTempFormData({
      ...emptyItem,
      taxMode: "without-tax",
      availableStock: 0,
    });
    setProductSearchTerms("");
    setProducts([]);
    setShowProductSuggestions(false);
    setProductSearchNotFound(false);
    setShowProductFormModal(true);
  };

  const handleEditProduct = (index) => {
    const item = localItems[index];
    setCurrentEditingIndex(index);
    setTempFormData({
      ...item,
      selectedProduct: item.itemRef || "",
      taxMode: item.taxMode || "without-tax",
    });
    setProductSearchTerms(item.itemName || "");
    setProducts([]);
    setShowProductSuggestions(false);
    setShowProductFormModal(true);
  };

  const handleSaveAndAdd = () => {
    if (!validateTempForm()) return;

    const newItem = {
      ...tempFormData,
      id: currentEditingIndex !== null ? tempFormData.id : Date.now(),
      itemRef: tempFormData.selectedProduct || null,
    };

    if (currentEditingIndex !== null) {
      handleItemChange(currentEditingIndex, "replace", newItem);
    } else {
      const newItems = [...localItems, newItem];
      setLocalItems(newItems);
      onFormDataChange("items", newItems);
    }

    addToast?.("Product added successfully!", "success");

    const emptyItem = itemsTableLogic.createEmptyItem();
    setTempFormData({
      ...emptyItem,
      taxMode: "without-tax",
      availableStock: 0,
    });
    setProductSearchTerms("");
    setProducts([]);
    setShowProductSuggestions(false);
    setCurrentEditingIndex(null);
  };

  const handleSaveAndExit = () => {
    if (!validateTempForm()) return;

    const newItem = {
      ...tempFormData,
      id: currentEditingIndex !== null ? tempFormData.id : Date.now(),
      itemRef: tempFormData.selectedProduct || null,
    };

    if (currentEditingIndex !== null) {
      handleItemChange(currentEditingIndex, "replace", newItem);
      addToast?.("Product updated successfully!", "success");
    } else {
      const newItems = [...localItems, newItem];
      setLocalItems(newItems);
      onFormDataChange("items", newItems);
      addToast?.("Product added successfully!", "success");
    }

    setShowProductFormModal(false);
    setCurrentEditingIndex(null);
  };

  const handleRemoveProduct = (index) => {
    if (localItems.length > 1) {
      deleteRow(index);
      addToast?.("Product removed successfully!", "success");
    }
  };

  // ======================== PAYMENT FUNCTIONS ========================
  const handlePaymentClick = () => {
    const validItems = localItems.some(
      (item) => item.itemName && item.quantity > 0 && item.pricePerUnit > 0
    );

    if (!validItems) {
      addToast?.(
        "Please add at least one item with name, quantity, and price",
        "warning"
      );
      return;
    }

    if (!isPurchaseOrdersMode && !formData.customer) {
      addToast?.("Please select a supplier before adding payment", "warning");
      return;
    }

    const totalAmount = displayTotal;

    if (totalAmount <= 0) {
      addToast?.("Invalid total amount", "warning");
      return;
    }

    setShowPaymentModal(true);
  };

  // ======================== UTILITY FUNCTIONS ========================
  const resetProductSearchState = () => {
    setProducts([]);
    setProductSearchTerms("");
    setShowProductSuggestions(false);
    setProductSearchNotFound(false);
    setProductSearchLoading(false);
  };

  // ======================== RETURN STATEMENT ========================
  return (
    <div
      className="purchase-invoice-form-section"
      style={{
        maxWidth: "1400px",
        margin: "0 auto",
        backgroundColor: purpleTheme.background,
        minHeight: "100vh",
        padding: "1rem",
      }}
    >
      {/* ✅ ENHANCED HEADER SECTION */}
      <div className="mb-4">
        <Row className="align-items-center">
          <Col md={8}>
            {hasValidItems ? (
              <div
                className="d-flex align-items-center p-3 rounded-3"
                style={{
                  background: purpleTheme.gradient,
                  color: "white",
                  boxShadow: purpleTheme.shadowMd,
                }}
              >
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle me-3"
                  style={{
                    width: "56px",
                    height: "56px",
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    backdropFilter: "blur(10px)",
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                  }}
                >
                  <FontAwesomeIcon icon={currentConfig.formIcon} size="lg" />
                </div>
                <div>
                  <h5 className="mb-0 fw-bold">
                    <strong>
                      {localItems.filter((item) => item.itemName).length}
                    </strong>{" "}
                    {localItems.filter((item) => item.itemName).length === 1
                      ? "Item"
                      : "Items"}{" "}
                    Added
                  </h5>
                  <small className="opacity-90">
                    Ready to{" "}
                    {isPurchaseOrdersMode
                      ? "create purchase order"
                      : "save purchase bill"}
                  </small>
                </div>
              </div>
            ) : (
              <div
                className="d-flex align-items-center p-3 rounded-3"
                style={{
                  backgroundColor: `rgba(${purpleTheme.primaryRgb}, 0.05)`,
                  border: `2px dashed ${purpleTheme.border}`,
                  color: purpleTheme.textMuted,
                }}
              >
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle me-3"
                  style={{
                    width: "56px",
                    height: "56px",
                    backgroundColor: `rgba(${purpleTheme.primaryRgb}, 0.1)`,
                    color: purpleTheme.primary,
                  }}
                >
                  <FontAwesomeIcon icon={faBoxOpen} size="lg" />
                </div>
                <div>
                  <h5 className="mb-0" style={{color: purpleTheme.textMuted}}>
                    No Items Added
                  </h5>
                  <small style={{color: purpleTheme.textMuted}}>
                    Click "Add Item" to start building your{" "}
                    {isPurchaseOrdersMode ? "purchase order" : "purchase bill"}
                  </small>
                </div>
              </div>
            )}
          </Col>
          <Col md={4} className="text-end">
            <Button
              onClick={handleAddProductClick}
              disabled={disabled || isSubmitting || submissionRef.current}
              style={{
                ...getButtonStyle("primary", "lg"),
                minWidth: "140px",
              }}
              onMouseEnter={(e) => {
                if (!e.target.disabled) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = `0 4px 15px rgba(${purpleTheme.primaryRgb}, 0.4)`;
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = `0 2px 8px rgba(${purpleTheme.primaryRgb}, 0.3)`;
              }}
            >
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              Add Item
            </Button>
          </Col>
        </Row>
      </div>

      {/* ✅ FIXED: EMPTY STATE WITH PROPER SPACING */}
      {!hasValidItems && (
        <div
          className="text-center py-5 my-4"
          style={{
            backgroundColor: `rgba(${purpleTheme.primaryRgb}, 0.03)`,
            borderRadius: "16px",
            border: `2px dashed ${purpleTheme.border}`,
            minHeight: "300px", // ✅ FIXED: Controlled height instead of auto-expanding
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
            style={{
              width: "80px",
              height: "80px",
              backgroundColor: `rgba(${purpleTheme.primaryRgb}, 0.1)`,
              color: purpleTheme.primary,
            }}
          >
            <FontAwesomeIcon icon={faBoxOpen} size="2x" />
          </div>
          <h5
            style={{
              color: purpleTheme.text,
              marginBottom: "12px",
              fontWeight: "600",
            }}
          >
            No Items Added Yet
          </h5>
          <p
            style={{
              color: purpleTheme.textMuted,
              fontSize: "15px",
              maxWidth: "400px",
              margin: "0 auto 24px",
              lineHeight: "1.5",
            }}
          >
            Click the "Add Item" button above to start adding items to your{" "}
            {isPurchaseOrdersMode ? "purchase order" : "purchase bill"}.
          </p>
          <Button
            onClick={handleAddProductClick}
            disabled={disabled || isSubmitting || submissionRef.current}
            style={{
              ...getButtonStyle("primary", "lg"),
              minWidth: "180px",
              borderRadius: "25px",
            }}
            onMouseEnter={(e) => {
              if (!e.target.disabled) {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = `0 4px 15px rgba(${purpleTheme.primaryRgb}, 0.4)`;
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = `0 2px 8px rgba(${purpleTheme.primaryRgb}, 0.3)`;
            }}
          >
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Add Your First Item
          </Button>

          {/* ✅ Optional: Quick tips */}
          <div className="mt-4">
            <Row className="justify-content-center">
              <Col md={8}>
                <div className="d-flex justify-content-center gap-4 small text-muted">
                  <div className="text-center">
                    <FontAwesomeIcon
                      icon={faShoppingCart}
                      className="d-block mb-1"
                    />
                    <span>Add Products</span>
                  </div>
                  <div className="text-center">
                    <FontAwesomeIcon
                      icon={faCalculator}
                      className="d-block mb-1"
                    />
                    <span>Auto Calculate</span>
                  </div>
                  <div className="text-center">
                    <FontAwesomeIcon icon={faSave} className="d-block mb-1" />
                    <span>Save & Print</span>
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        </div>
      )}
      {hasValidItems && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <Row className="g-3">
              <Col lg={gridLayout.payment || 5} md={6}>
                <Button
                  variant={
                    paymentData.amount > 0
                      ? "success"
                      : currentConfig.actionButtonColor
                  }
                  className="w-100 d-flex align-items-center justify-content-center flex-column border-2 border-dashed fw-semibold"
                  style={{
                    minHeight: "100px",
                    borderRadius: "12px",
                    fontSize: "14px",
                    opacity: isSubmitting || submissionRef.current ? 0.6 : 1,
                  }}
                  onClick={handlePaymentClick}
                  disabled={
                    !hasValidItems ||
                    (!isPurchaseOrdersMode && !formData.customer) ||
                    isSubmitting ||
                    submissionRef.current
                  }
                >
                  <FontAwesomeIcon
                    icon={
                      paymentData.amount > 0
                        ? faCheckCircle
                        : currentConfig.paymentIcon
                    }
                    className="mb-2"
                    size="lg"
                  />
                  <span>
                    {paymentData.amount > 0
                      ? isPurchaseOrdersMode
                        ? "Update Terms"
                        : "Update Payment"
                      : currentConfig.paymentAction}
                  </span>

                  <small className="text-muted mt-1">
                    {paymentData.amount > 0
                      ? `₹${itemsTableLogic.formatCurrency(paymentData.amount)}`
                      : `₹${itemsTableLogic.formatCurrency(displayTotal)}`}
                  </small>
                </Button>
              </Col>

              {formData.gstEnabled && totals.totalTax > 0 && (
                <Col lg={gridLayout.tax || 3} md={6}>
                  <Card className="bg-light border-0 h-100">
                    <Card.Body className="p-3">
                      <div className="text-center mb-2">
                        <FontAwesomeIcon
                          icon={faPercent}
                          className="me-2 text-info"
                        />
                        <span className="fw-bold text-secondary small">
                          GST Breakdown
                        </span>
                      </div>
                      <div className="small">
                        <div className="d-flex justify-content-between mb-1">
                          <span>Subtotal:</span>
                          <span className="fw-semibold">
                            ₹{itemsTableLogic.formatCurrency(totals.subtotal)}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between mb-1">
                          <span>CGST:</span>
                          <span className="fw-semibold text-info">
                            ₹{itemsTableLogic.formatCurrency(totals.totalCGST)}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between mb-1">
                          <span>SGST:</span>
                          <span className="fw-semibold text-info">
                            ₹{itemsTableLogic.formatCurrency(totals.totalSGST)}
                          </span>
                        </div>
                        <hr className="my-2" />
                        <div className="d-flex justify-content-between">
                          <span className="fw-bold">Total:</span>
                          <span className="fw-bold text-primary">
                            ₹{itemsTableLogic.formatCurrency(totals.finalTotal)}
                          </span>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              )}

              <Col lg={gridLayout.total || 2} md={6}>
                <Card
                  className={`${currentConfig.totalBorderColor} border-3 h-100`}
                >
                  <Card.Body className="p-3">
                    <div className="text-center mb-3">
                      <FontAwesomeIcon
                        icon={currentConfig.formIcon}
                        className="me-2 text-muted"
                      />
                      <span className="fw-bold text-secondary small">
                        {currentConfig.totalLabel}
                      </span>
                    </div>

                    <div
                      className={`fw-bold ${currentConfig.totalTextColor} h5 mb-3 text-center`}
                    >
                      ₹{itemsTableLogic.formatCurrency(displayTotal)}
                    </div>
                    <div className="border-top pt-2">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="fw-semibold text-secondary small">
                          Round Off
                        </span>
                        <Form.Check
                          type="switch"
                          checked={roundOffEnabled}
                          onChange={(e) => setRoundOffEnabled(e.target.checked)}
                          disabled={isSubmitting || submissionRef.current}
                          className="form-check-sm"
                        />
                      </div>

                      {roundOffDisplayInfo?.showRoundOffBreakdown && (
                        <div className="p-2 bg-warning bg-opacity-10 rounded">
                          <div className="d-flex justify-content-between small">
                            <span>
                              {roundOffDisplayInfo.baseTotalLabel ||
                                "Base Total"}
                              :
                            </span>
                            <span>
                              ₹
                              {itemsTableLogic.formatCurrency(
                                roundOffDisplayInfo.baseTotalAmount
                              )}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between small">
                            <span>Round Off:</span>
                            <span
                              className={roundOffDisplayInfo.roundOffColorClass}
                            >
                              {roundOffDisplayInfo.roundOffLabel}₹
                              {itemsTableLogic.formatCurrency(
                                Math.abs(roundOffDisplayInfo.roundOffAmount)
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={gridLayout.actions || 2} md={6}>
                <div className="d-grid gap-2">
                  <Button
                    variant="outline-info"
                    onClick={onShare}
                    disabled={
                      !hasValidItems || isSubmitting || submissionRef.current
                    }
                    style={{
                      padding: "8px 12px",
                      fontSize: "13px",
                      opacity: isSubmitting || submissionRef.current ? 0.6 : 1,
                    }}
                  >
                    <FontAwesomeIcon icon={faShare} className="me-2" />
                    Share
                  </Button>

                  <Button
                    variant={currentConfig.saveButtonVariant}
                    onClick={handleSavePurchase}
                    disabled={
                      !hasValidItems ||
                      saving ||
                      isSubmitting ||
                      submissionRef.current ||
                      (!isPurchaseOrdersMode && !formData.customer)
                    }
                    style={{
                      padding: "10px 12px",
                      fontSize: "13px",
                      opacity:
                        saving || isSubmitting || submissionRef.current
                          ? 0.6
                          : 1,
                    }}
                  >
                    {saving || isSubmitting ? (
                      <>
                        <FontAwesomeIcon
                          icon={faSpinner}
                          className="fa-spin me-2"
                        />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faSave} className="me-2" />
                        {currentConfig.saveButtonText}
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline-secondary"
                    onClick={onCancel}
                    disabled={isSubmitting || submissionRef.current}
                    style={{
                      padding: "8px 12px",
                      fontSize: "13px",
                      opacity: isSubmitting || submissionRef.current ? 0.6 : 1,
                    }}
                  >
                    <FontAwesomeIcon icon={faCancel} className="me-2" />
                    Cancel
                  </Button>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      <Modal
        show={showProductFormModal}
        onHide={() => {
          setShowProductFormModal(false);
          resetProductSearchState();
        }}
        size="xl"
        centered
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {currentEditingIndex !== null ? "Edit Item" : "Add Item"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3 position-relative">
                <Form.Label className="fw-bold text-danger">
                  Select Product *
                  {tempFormData.selectedProduct && (
                    <Badge bg="success" className="ms-2">
                      <FontAwesomeIcon icon={faCheck} className="me-1" />
                      Selected
                    </Badge>
                  )}
                </Form.Label>
                <Form.Control
                  type="text"
                  value={productSearchTerms || ""}
                  onChange={(e) => {
                    const query = e.target.value;
                    setProductSearchTerms(query);
                    debouncedProductSearch(query);
                  }}
                  style={{
                    ...inputStyle,
                    backgroundColor: tempFormData.selectedProduct
                      ? "#e8f5e8"
                      : "white",
                  }}
                  placeholder="Search or enter item name..."
                  autoComplete="off"
                  disabled={isSubmitting || submissionRef.current}
                />

                {productSearchLoading && (
                  <div className="position-absolute end-0 top-50 translate-middle-y me-3">
                    <div
                      className="spinner-border spinner-border-sm text-primary"
                      role="status"
                    >
                      <span className="visually-hidden">Searching...</span>
                    </div>
                  </div>
                )}

                {(showProductSuggestions || productSearchNotFound) &&
                  !tempFormData.selectedProduct && (
                    <div
                      className="position-absolute w-100 bg-white border rounded shadow-lg"
                      style={{
                        zIndex: 9999,
                        top: "100%",
                        maxHeight: "300px",
                        overflowY: "auto",
                      }}
                    >
                      {productSearchLoading ? (
                        <div className="p-3 text-center">
                          <div
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                          ></div>
                          <span className="text-muted">
                            Searching products...
                          </span>
                        </div>
                      ) : products.length > 0 ? (
                        <>
                          {products.slice(0, 8).map((product) => (
                            <div
                              key={product.id || product._id}
                              className="p-2 border-bottom"
                              style={{
                                cursor: "pointer",
                                transition: "background-color 0.2s",
                              }}
                              onClick={() => handleProductSelect(product)}
                              onMouseEnter={(e) =>
                                (e.target.style.backgroundColor = "#f8f9fa")
                              }
                              onMouseLeave={(e) =>
                                (e.target.style.backgroundColor = "transparent")
                              }
                            >
                              <div className="fw-bold">{product.name}</div>
                              <small className="text-muted">
                                Purchase: ₹
                                {itemsTableLogic.formatCurrency(
                                  product.displayPrice ||
                                    product.purchasePrice ||
                                    product.costPrice ||
                                    0
                                )}{" "}
                                | Stock:{" "}
                                {product.stock || product.currentStock || 0}
                                {product.itemCode &&
                                  ` | Code: ${product.itemCode}`}
                              </small>
                            </div>
                          ))}

                          {productSearchTerms.trim() && (
                            <div
                              className="p-2 border-top bg-light"
                              style={{
                                cursor: "pointer",
                                transition: "background-color 0.2s",
                              }}
                              onClick={handleCreateNewItem}
                              onMouseEnter={(e) =>
                                (e.target.style.backgroundColor = "#e9ecef")
                              }
                              onMouseLeave={(e) =>
                                (e.target.style.backgroundColor = "#f8f9fa")
                              }
                            >
                              <div className="fw-bold text-primary">
                                <FontAwesomeIcon
                                  icon={faPlus}
                                  className="me-2"
                                />
                                Create "{productSearchTerms}"
                              </div>
                              <small className="text-muted">
                                Add this as a new item
                              </small>
                            </div>
                          )}
                        </>
                      ) : productSearchNotFound ? (
                        <div className="p-3">
                          <div className="text-center text-muted mb-2">
                            <FontAwesomeIcon
                              icon={faBoxOpen}
                              className="me-2"
                            />
                            No products found for "{productSearchTerms}"
                          </div>

                          {productSearchTerms.trim() && (
                            <div
                              className="btn btn-outline-primary btn-sm w-100"
                              onClick={handleCreateNewItem}
                              style={{cursor: "pointer"}}
                            >
                              <FontAwesomeIcon icon={faPlus} className="me-2" />
                              Create "{productSearchTerms}" as new item
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-danger">
                  Quantity *
                </Form.Label>
                <Form.Control
                  type="number"
                  value={tempFormData.quantity || ""}
                  onChange={(e) =>
                    handleTempFormChange("quantity", e.target.value)
                  }
                  style={inputStyle}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  disabled={isSubmitting || submissionRef.current}
                />
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-danger">
                  Purchase Price *
                </Form.Label>
                <InputGroup>
                  <InputGroup.Text style={inputStyle}>₹</InputGroup.Text>
                  <Form.Control
                    type="number"
                    value={tempFormData.pricePerUnit || ""}
                    onChange={(e) =>
                      handleTempFormChange("pricePerUnit", e.target.value)
                    }
                    style={inputStyle}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    disabled={isSubmitting || submissionRef.current}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Unit</Form.Label>
                <Form.Select
                  value={tempFormData.unit || "PCS"}
                  onChange={(e) => handleTempFormChange("unit", e.target.value)}
                  style={inputStyle}
                  disabled={isSubmitting || submissionRef.current}
                >
                  {itemsTableLogic.unitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {formData.gstEnabled && (
              <>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">
                      Tax Mode
                      <Badge
                        bg={
                          tempFormData.taxMode === "with-tax"
                            ? "success"
                            : "primary"
                        }
                        className="ms-2"
                        style={{fontSize: "9px"}}
                      >
                        {tempFormData.taxMode === "with-tax"
                          ? "Inc. Tax"
                          : "Exc. Tax"}
                      </Badge>
                    </Form.Label>
                    <Form.Select
                      value={tempFormData.taxMode || "without-tax"}
                      onChange={(e) => {
                        handleTempFormChange("taxMode", e.target.value);
                      }}
                      style={inputStyle}
                      disabled={isSubmitting || submissionRef.current}
                    >
                      <option value="with-tax">Price Includes Tax</option>
                      <option value="without-tax">Price Excludes Tax</option>
                    </Form.Select>

                    {tempFormData.quantity > 0 &&
                      tempFormData.pricePerUnit > 0 &&
                      formData.gstEnabled && (
                        <div className="mt-2 p-2 bg-light rounded">
                          <small className="text-muted d-block">
                            {tempFormData.taxMode === "with-tax"
                              ? `₹${tempFormData.pricePerUnit} includes ${
                                  tempFormData.taxRate || 18
                                }% tax`
                              : `₹${tempFormData.pricePerUnit} + ${
                                  tempFormData.taxRate || 18
                                }% tax`}
                          </small>

                          {tempFormData.taxMode === "with-tax" ? (
                            <small className="text-info d-block">
                              Taxable Amount: ₹
                              {tempFormData.taxableAmount?.toFixed(2) || "0.00"}
                              <br />
                              Tax Amount: ₹
                              {(
                                tempFormData.cgstAmount +
                                tempFormData.sgstAmount
                              ).toFixed(2)}{" "}
                              (included)
                            </small>
                          ) : (
                            <small className="text-info d-block">
                              Taxable Amount: ₹
                              {tempFormData.taxableAmount?.toFixed(2) || "0.00"}
                              <br />
                              Tax Amount: ₹
                              {(
                                tempFormData.cgstAmount +
                                tempFormData.sgstAmount
                              ).toFixed(2)}{" "}
                              (additional)
                              <br />
                              Total: ₹
                              {tempFormData.amount?.toFixed(2) || "0.00"}
                            </small>
                          )}

                          {tempFormData.cgstAmount + tempFormData.sgstAmount >
                            0 && (
                            <small className="text-success d-block">
                              CGST: ₹{tempFormData.cgstAmount.toFixed(2)}, SGST:
                              ₹{tempFormData.sgstAmount.toFixed(2)}
                            </small>
                          )}
                        </div>
                      )}
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Tax Rate (%)</Form.Label>
                    <Form.Select
                      value={tempFormData.taxRate || 18}
                      onChange={(e) =>
                        handleTempFormChange("taxRate", e.target.value)
                      }
                      style={inputStyle}
                      disabled={isSubmitting || submissionRef.current}
                    >
                      <option value={0}>0% (Exempt)</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">HSN Code</Form.Label>
                    <Form.Control
                      type="text"
                      value={tempFormData.hsnCode || ""}
                      onChange={(e) =>
                        handleTempFormChange("hsnCode", e.target.value)
                      }
                      style={inputStyle}
                      placeholder="HSN Code"
                      disabled={isSubmitting || submissionRef.current}
                    />
                  </Form.Group>
                </Col>
              </>
            )}

            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Discount %</Form.Label>
                <Form.Control
                  type="number"
                  value={tempFormData.discountPercent || ""}
                  onChange={(e) =>
                    handleTempFormChange("discountPercent", e.target.value)
                  }
                  style={inputStyle}
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.01"
                  disabled={isSubmitting || submissionRef.current}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={tempFormData.description || ""}
              onChange={(e) =>
                handleTempFormChange("description", e.target.value)
              }
              style={inputStyle}
              placeholder="Enter item description..."
              disabled={isSubmitting || submissionRef.current}
            />
          </Form.Group>

          <div className="text-center p-3 bg-light rounded">
            <h4 className="text-success mb-2">
              Total: ₹{itemsTableLogic.formatCurrency(tempFormData.amount || 0)}
            </h4>

            {tempFormData.quantity > 0 && tempFormData.pricePerUnit > 0 && (
              <div className="small text-muted">
                <div className="row">
                  <div className="col-6">
                    <div>Qty: {tempFormData.quantity}</div>
                    <div>Rate: ₹{tempFormData.pricePerUnit}</div>
                    {tempFormData.discountPercent > 0 && (
                      <div>Discount: {tempFormData.discountPercent}%</div>
                    )}
                  </div>
                  <div className="col-6">
                    <div>
                      Subtotal: ₹
                      {(
                        (tempFormData.quantity || 0) *
                        (tempFormData.pricePerUnit || 0)
                      ).toFixed(2)}
                    </div>
                    {formData.gstEnabled &&
                      tempFormData.cgstAmount + tempFormData.sgstAmount > 0 && (
                        <div>
                          Tax: ₹
                          {(
                            tempFormData.cgstAmount + tempFormData.sgstAmount
                          ).toFixed(2)}
                        </div>
                      )}
                    <div className="fw-bold">
                      Final: ₹{(tempFormData.amount || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formData.gstEnabled && tempFormData.taxMode && (
              <Badge
                bg={tempFormData.taxMode === "with-tax" ? "success" : "primary"}
                className="mt-2"
              >
                {tempFormData.taxMode === "with-tax"
                  ? "Price Includes Tax"
                  : "Price Excludes Tax"}
              </Badge>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setShowProductFormModal(false);
              resetProductSearchState();
            }}
            disabled={isSubmitting || submissionRef.current}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleSaveAndAdd}
            disabled={
              !tempFormData.itemName ||
              !tempFormData.quantity ||
              !tempFormData.pricePerUnit ||
              isSubmitting ||
              submissionRef.current
            }
          >
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Save & Add Another
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveAndExit}
            disabled={
              !tempFormData.itemName ||
              !tempFormData.quantity ||
              !tempFormData.pricePerUnit ||
              isSubmitting ||
              submissionRef.current
            }
          >
            <FontAwesomeIcon icon={faSave} className="me-2" />
            Save & Exit
          </Button>
        </Modal.Footer>
      </Modal>

      <PaymentModal
        show={showPaymentModal}
        onHide={() => setShowPaymentModal(false)}
        // ✅ CORRECTED: Use the expected prop names
        currentConfig={{
          modalHeader: "bg-primary", // Header background class
          modalTitle: isPurchaseOrdersMode
            ? "Purchase Order Terms"
            : "Purchase Payment",
          paymentIcon: isPurchaseOrdersMode ? faShoppingCart : faMoneyBillWave,
          partyLabel: "Supplier", // This should be "Supplier" for purchases
          totalBgColor: "bg-primary",
          saveButtonVariant: "primary",
          buttonVariant: "primary",
        }}
        // ✅ CORRECTED: Amount props
        finalTotalWithRoundOff={displayTotal}
        // ✅ CORRECTED: Payment data structure
        paymentData={{
          ...paymentData,
          // ✅ IMPORTANT: Map supplier data to expected fields
          partyId: formData.customer?.id || formData.customer?._id,
          partyName:
            formData.customer?.name || formData.customer?.businessName || "",
          partyType: "supplier",
          // Payment details
          amount: paymentData?.amount || 0,
          paymentType: paymentData?.paymentType || "Cash",
          paymentMethod: paymentData?.paymentMethod || "cash",
          bankAccountId: paymentData?.bankAccountId || "",
          bankAccountName: paymentData?.bankAccountName || "",
          dueDate: paymentData?.dueDate || "",
          nextPaymentDate: paymentData?.nextPaymentDate || "",
          creditDays: paymentData?.creditDays || 0,
          notes: paymentData?.notes || "",
          chequeNumber: paymentData?.chequeNumber || "",
          chequeDate: paymentData?.chequeDate || "",
          transactionId: paymentData?.transactionId || "",
        }}
        setPaymentData={setPaymentData}
        // ✅ CORRECTED: Handler functions
        handlePaymentAmountChange={(amount) => {
          setPaymentData((prev) => ({
            ...prev,
            amount: parseFloat(amount) || 0,
          }));
        }}
        handlePaymentTypeChange={(paymentType) => {
          setPaymentData((prev) => ({
            ...prev,
            paymentType: paymentType,
            paymentMethod: paymentType?.toLowerCase() || "cash",
            // Reset bank account if switching to cash/UPI
            bankAccountId: ["Cash", "UPI"].includes(paymentType)
              ? ""
              : prev.bankAccountId,
            bankAccountName: ["Cash", "UPI"].includes(paymentType)
              ? ""
              : prev.bankAccountName,
          }));
        }}
        handlePaymentSubmit={handlePaymentSubmit}
        submittingPayment={submittingPayment}
        // ✅ Bank accounts
        bankAccounts={bankAccounts}
        loadingBankAccounts={loadingBankAccounts}
        retryLoadBankAccounts={retryLoadBankAccounts}
        // ✅ Payment history
        paymentHistory={paymentHistory}
        // ✅ Totals and calculations
        totals={{
          subtotal: totals.subtotal || 0,
          totalTax: totals.totalTax || 0,
          totalDiscount: totals.totalDiscount || 0,
          finalTotal: displayTotal,
        }}
        gstEnabled={formData.gstEnabled}
        roundOffEnabled={roundOffEnabled}
        roundOffValue={roundOffValue}
        // ✅ Invoice details
        invoiceNumber={formData.invoiceNumber || `PB-${Date.now()}`}
        invoiceDate={
          formData.invoiceDate || new Date().toISOString().split("T")[0]
        }
        // ✅ Due date handlers
        handleDueDateToggle={(enabled) => {
          setPaymentData((prev) => ({
            ...prev,
            hasDueDate: enabled,
            dueDate: enabled ? prev.dueDate : "",
          }));
        }}
        handleCreditDaysChange={(days) => {
          const creditDays = parseInt(days) || 0;
          let dueDate = "";

          if (creditDays > 0) {
            const today = new Date();
            const dueDateCalc = new Date(today);
            dueDateCalc.setDate(today.getDate() + creditDays);
            dueDate = dueDateCalc.toISOString().split("T")[0];
          }

          setPaymentData((prev) => ({
            ...prev,
            creditDays: creditDays,
            dueDate: dueDate,
          }));
        }}
        handleDueDateChange={(date) => {
          setPaymentData((prev) => ({
            ...prev,
            dueDate: date,
            creditDays: 0, // Reset credit days when manual date is set
          }));
        }}
        // ✅ Company and form details
        companyId={companyId}
        formType="purchase"
        // ✅ OPTIONAL: Edit mode (if you support editing payments)
        isEditMode={false} // Set to true if editing existing payment
      />
    </div>
  );
}

export default PurchaseInvoiceFormSection;
