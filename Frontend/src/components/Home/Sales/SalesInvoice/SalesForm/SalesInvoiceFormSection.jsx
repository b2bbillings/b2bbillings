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
  Container,
  Nav,
  Tab,
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
  faFileContract,
  faClipboardList,
} from "@fortawesome/free-solid-svg-icons";

import {
  useItemsManagement,
  useItemSearch,
  useRoundOff,
  useBankAccounts,
  usePaymentManagement,
  usePartySelection,
  useInvoiceSave,
} from "./itemsTableWithTotals/itemsTableHooks";
import itemsTableLogic from "./itemsTableWithTotals/itemsTableLogic";
import PaymentModal from "./itemsTableWithTotals/PaymentModal";
import itemService from "../../../../../services/itemService";
import salesService from "../../../../../services/salesService";

function SalesInvoiceFormSection({
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
  mode = "invoices",
  documentType = "invoice",
  isQuotationsMode = false,
  editMode = false,
  saving = false,
  labels = {},
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionRef = useRef(false);
  
  // Tab management state
  const [activeTab, setActiveTab] = useState('bill');
  
  // Non-bill form data state
  const [nonBillData, setNonBillData] = useState({
    itemDescription: '',
    purchaseDate: '',
    vendorName: '',
    amount: '',
    quantity: '',
    unitPrice: '',
    notes: '',
    category: ''
  });

  // Enhanced purple theme with modern styling
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
    shadow: "0 4px 20px rgba(99, 102, 241, 0.08)",
    shadowMd: "0 8px 30px rgba(99, 102, 241, 0.12)",
    shadowLg: "0 12px 40px rgba(99, 102, 241, 0.15)",
    gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    gradientLight: "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)"
  };

  // Enhanced input styles with modern design
  const getInputStyle = (fieldName) => ({
    borderColor: errors[fieldName] ? purpleTheme.error : purpleTheme.border,
    fontSize: "15px",
    padding: "14px 18px",
    height: "52px",
    borderWidth: "2px",
    borderRadius: "12px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    backgroundColor: purpleTheme.surface,
    color: purpleTheme.text,
    fontWeight: "500",
    boxShadow: errors[fieldName]
      ? `0 0 0 3px rgba(239, 68, 68, 0.1), ${purpleTheme.shadow}`
      : purpleTheme.shadow,
  });

  // Enhanced card styles
  const getCardStyle = () => ({
    borderRadius: "20px",
    border: `2px solid ${purpleTheme.border}`,
    backgroundColor: purpleTheme.surface,
    boxShadow: purpleTheme.shadowMd,
    overflow: "hidden",
    transition: "all 0.3s ease"
  });

  // Enhanced button styles
  const getButtonStyle = (variant = 'primary', size = 'normal') => {
    const baseStyle = {
      borderRadius: "12px",
      fontWeight: "600",
      fontSize: size === 'large' ? "16px" : "14px",
      padding: size === 'large' ? "14px 32px" : "12px 24px",
      border: "2px solid transparent",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      boxShadow: purpleTheme.shadow,
      textTransform: "none",
      letterSpacing: "0.025em"
    };

    const variants = {
      primary: {
        ...baseStyle,
        background: purpleTheme.gradient,
        color: "white",
        borderColor: purpleTheme.primary
      },
      success: {
        ...baseStyle,
        background: `linear-gradient(135deg, ${purpleTheme.success} 0%, #34d399 100%)`,
        color: "white",
        borderColor: purpleTheme.success
      },
      outline: {
        ...baseStyle,
        background: purpleTheme.surface,
        color: purpleTheme.primary,
        borderColor: purpleTheme.border
      }
    };

    return variants[variant] || variants.primary;
  };

  const inputStyle = getInputStyle();

  // Hooks initialization
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
  } = usePartySelection(
    formData.customer,
    formData.supplier,
    mode === "purchases" ? "purchase" : "sales",
    addToast
  );

  // Dynamic configuration based on mode
  const getDocumentConfig = () => {
    if (isQuotationsMode) {
      return {
        formIcon: faFileContract,
        title: "Quotation Builder",
        subtitle: "Create professional quotations",
        actionButtonColor: "info",
        paymentIcon: faClipboardList,
        paymentAction: "Set Terms",
        saveButtonVariant: "info",
        saveButtonText: "Save Quotation",
        totalLabel: "Quote Total",
        totalBorderColor: "border-info",
        totalTextColor: "text-info",
        cardBorderColor: purpleTheme.primary,
        primaryColor: "#0ea5e9",
        primaryRgb: "14, 165, 233",
      };
    } else {
      return {
        formIcon: faFileInvoice,
        title: "Invoice Builder",
        subtitle: "Create professional invoices",
        actionButtonColor: "primary",
        paymentIcon: faWallet,
        paymentAction: "Add Payment",
        saveButtonVariant: "success",
        saveButtonText: "Save Invoice",
        totalLabel: "Invoice Total",
        totalBorderColor: "border-primary",
        totalTextColor: "text-primary",
        cardBorderColor: purpleTheme.primary,
        primaryColor: purpleTheme.primary,
        primaryRgb: purpleTheme.primaryRgb,
      };
    }
  };

  const currentConfig = getDocumentConfig();

  // State variables
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

  // Calculate totals early in the component
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

  // Payment management hook (after displayTotal is calculated)
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
    mode === "purchases" ? "purchase" : "sales",
    companyId,
    displayTotal,
    formData.customer,
    formData.supplier,
    formData.invoiceNumber,
    currentUser?.id,
    currentConfig,
    bankAccounts
  );

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

  useEffect(() => {
    return () => {
      submissionRef.current = false;
      setIsSubmitting(false);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Product search functions
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
          product.salePrice ||
          product.sellingPrice ||
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

  // Calculate temp item total function
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

  // Handle temp form change function
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
          formType: mode === "purchases" ? "purchase" : "sales",
          createdAt: new Date().toISOString(),
        };

        // Enhanced bank account handling
        if (
          data.bankAccountId &&
          ["bank", "bank_transfer", "Bank Account"].includes(data.paymentMethod)
        ) {
          const selectedBankAccount = bankAccounts.find(
            (acc) =>
              acc._id === data.bankAccountId || acc.id === data.bankAccountId
          );

          if (selectedBankAccount) {
            formatted.bankAccountId = data.bankAccountId;
            formatted.bankAccountName =
              selectedBankAccount.accountName || selectedBankAccount.name;
            formatted.bankName = selectedBankAccount.bankName;
            formatted.accountNumber = selectedBankAccount.accountNumber;

            if (
              !formatted.notes ||
              !formatted.notes.includes(selectedBankAccount.bankName)
            ) {
              const bankInfo = `Bank: ${selectedBankAccount.bankName} | Account: ${selectedBankAccount.accountName} | A/C No: ${selectedBankAccount.accountNumber}`;
              formatted.notes = formatted.notes
                ? `${formatted.notes} | ${bankInfo}`
                : bankInfo;
            }
          }
        }

        // Handle due date properly
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
            "Payment details saved! Click 'Save Invoice' to complete.",
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
    mode,
    baseHandlePaymentSubmit,
    setShowPaymentModal,
  ]);

  // Enhanced save invoice with better payment method normalization
  const handleSaveInvoice = useCallback(async () => {
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

      if (!formData.customer && !isQuotationsMode) {
        addToast?.("Please select a customer", "warning");
        return;
      }

      if (displayTotal <= 0) {
        addToast?.("Invalid total amount. Please check your items.", "warning");
        return;
      }

      const mappedItems = validItemsForValidation.map((item, index) => {
        const itemTaxMode = item.taxMode || "without-tax";

        return {
          itemName: item.itemName,
          productName: item.itemName,
          name: item.itemName,
          quantity: parseFloat(item.quantity),
          pricePerUnit: parseFloat(item.pricePerUnit),
          rate: parseFloat(item.pricePerUnit),
          price: parseFloat(item.pricePerUnit),
          amount: parseFloat(item.amount || 0),
          totalAmount: parseFloat(item.amount || 0),
          itemAmount: parseFloat(item.amount || 0),
          finalAmount: parseFloat(item.amount || 0),
          taxMode: itemTaxMode,
          priceIncludesTax: itemTaxMode === "with-tax",
          gstMode: itemTaxMode === "with-tax" ? "include" : "exclude",
          taxRate: parseFloat(item.taxRate || 18),
          gstRate: parseFloat(item.taxRate || 18),
          taxableAmount: parseFloat(item.taxableAmount || 0),
          cgstAmount: parseFloat(item.cgstAmount || 0),
          sgstAmount: parseFloat(item.sgstAmount || 0),
          igstAmount: 0,
          hsnCode: item.hsnCode || item.hsnNumber || "",
          hsnNumber: item.hsnCode || item.hsnNumber || "",
          unit: item.unit || "PCS",
          discountPercent: parseFloat(item.discountPercent || 0),
          discountAmount: parseFloat(item.discountAmount || 0),
          lineNumber: index + 1,
          useExactAmounts: true,
          skipTaxRecalculation: true,
          skipBackendCalculation: true,
          uiCalculated: true,
          frontendCalculated: true,
          preserveAmounts: true,
          doNotRecalculate: true,
          BACKEND_SKIP_CALCULATION: true,
          FRONTEND_AMOUNTS_FINAL: true,
          originalCalculation: {
            taxMode: itemTaxMode,
            priceIncludesTax: itemTaxMode === "with-tax",
            calculatedAmount: parseFloat(item.amount || 0),
            calculatedTaxable: parseFloat(item.taxableAmount || 0),
            calculatedCGST: parseFloat(item.cgstAmount || 0),
            calculatedSGST: parseFloat(item.sgstAmount || 0),
            frontendTimestamp: Date.now(),
            preservationLevel: "maximum",
          },
        };
      });

      const exactTotalsFromUI = mappedItems.reduce(
        (acc, item) => {
          acc.subtotal += item.taxableAmount || 0;
          acc.totalCGST += item.cgstAmount || 0;
          acc.totalSGST += item.sgstAmount || 0;
          acc.totalTax += (item.cgstAmount || 0) + (item.sgstAmount || 0);
          acc.finalTotal += item.amount || 0;
          return acc;
        },
        {
          subtotal: 0,
          totalCGST: 0,
          totalSGST: 0,
          totalIGST: 0,
          totalTax: 0,
          finalTotal: 0,
        }
      );

      // Payment method normalization function
      const normalizePaymentMethod = (method) => {
        if (!method) return "cash";

        const methodStr = method.toString().toLowerCase();

        const methodMappings = {
          "bank account": "bank_transfer",
          bank_transfer: "bank_transfer",
          banktransfer: "bank_transfer",
          "bank transfer": "bank_transfer",
          bank: "bank_transfer",
          neft: "bank_transfer",
          rtgs: "bank_transfer",
          imps: "bank_transfer",
          card: "card",
          upi: "upi",
          cash: "cash",
          credit: "credit",
          partial: "partial",
        };

        return methodMappings[methodStr] || "cash";
      };

      // Payment data with proper normalization and bank account info
      const enhancedPaymentData =
        paymentData?.amount > 0
          ? (() => {
              const normalizedMethod = normalizePaymentMethod(
                paymentData.paymentMethod
              );

              const payment = {
                ...paymentData,
                amount: parseFloat(paymentData.amount || 0),
                paymentMethod: normalizedMethod,
                paymentType: paymentData.paymentType || "Cash",
                method: normalizedMethod,
                partyId: formData.customer?.id || formData.customer?._id,
                partyName:
                  formData.customer?.name || formData.customer?.businessName,
                partyType: "customer",
                invoiceNumber: formData.invoiceNumber,
                invoiceTotal: displayTotal,
                companyId: companyId,
                formType: isQuotationsMode ? "quotation" : "sales",
                transactionType: isQuotationsMode ? "quotation" : "sale",
                status: "completed",
                relatedInvoiceTotal: displayTotal,
              };

              // Enhanced bank account handling
              if (
                paymentData.bankAccountId &&
                ["bank_transfer"].includes(normalizedMethod)
              ) {
                const selectedBankAccount = bankAccounts.find(
                  (acc) =>
                    acc._id === paymentData.bankAccountId ||
                    acc.id === paymentData.bankAccountId
                );

                if (selectedBankAccount) {
                  payment.bankAccountId = paymentData.bankAccountId;
                  payment.bankAccountName =
                    selectedBankAccount.accountName || selectedBankAccount.name;
                  payment.bankName = selectedBankAccount.bankName;
                  payment.accountNumber = selectedBankAccount.accountNumber;
                  payment.ifscCode = selectedBankAccount.ifscCode;

                  payment.bankAccountDetails = {
                    id: selectedBankAccount._id || selectedBankAccount.id,
                    name:
                      selectedBankAccount.accountName ||
                      selectedBankAccount.name,
                    bankName: selectedBankAccount.bankName,
                    accountNumber: selectedBankAccount.accountNumber,
                    ifscCode: selectedBankAccount.ifscCode,
                    balance:
                      selectedBankAccount.currentBalance ||
                      selectedBankAccount.balance,
                  };
                }
              }

              // Proper due date handling
              if (paymentData.dueDate) {
                if (paymentData.dueDate instanceof Date) {
                  payment.dueDate = paymentData.dueDate.toISOString();
                } else if (typeof paymentData.dueDate === "string") {
                  payment.dueDate = new Date(paymentData.dueDate).toISOString();
                } else if (typeof paymentData.dueDate === "number") {
                  payment.dueDate = new Date(paymentData.dueDate).toISOString();
                }
              } else if (
                paymentData.creditDays &&
                parseInt(paymentData.creditDays) > 0
              ) {
                const today = new Date();
                const dueDate = new Date(today);
                dueDate.setDate(
                  today.getDate() + parseInt(paymentData.creditDays)
                );
                payment.dueDate = dueDate.toISOString();
              } else {
                payment.dueDate = null;
              }

              if (paymentData.creditDays) {
                payment.creditDays = parseInt(paymentData.creditDays) || 0;
              }

              if (paymentData.notes) {
                payment.notes = paymentData.notes.trim();
              }

              return payment;
            })()
          : null;

      // Transaction data with normalized payment method
      const transactionData = enhancedPaymentData
        ? {
            amount: enhancedPaymentData.amount,
            paymentMethod: enhancedPaymentData.paymentMethod,
            paymentType: enhancedPaymentData.paymentType,
            method: enhancedPaymentData.method,
            bankAccountId: enhancedPaymentData.bankAccountId,
            bankAccountDetails: enhancedPaymentData.bankAccountDetails,
            notes:
              enhancedPaymentData.notes ||
              `Payment for ${isQuotationsMode ? "quotation" : "invoice"} ${
                formData.invoiceNumber
              }`,
            dueDate: enhancedPaymentData.dueDate,
            creditDays: enhancedPaymentData.creditDays,
            transactionDate: new Date().toISOString(),
            reference: formData.invoiceNumber,
            status: "completed",
            relatedInvoiceTotal: displayTotal,
          }
        : null;

      // Include non-bill items in the save data
      const nonBillItems = formData.nonBillItems || [];
      
      const invoiceDataFromTable = {
        items: mappedItems,
        nonBillItems: nonBillItems, // Add non-bill items to save data
        totals: {
          finalTotal: displayTotal,
          grandTotal: displayTotal,
          total: displayTotal,
          amount: displayTotal,
          invoiceTotal: displayTotal,
          finalTotalWithRoundOff: displayTotal,
          subtotal: exactTotalsFromUI.subtotal,
          totalCGST: exactTotalsFromUI.totalCGST,
          totalSGST: exactTotalsFromUI.totalSGST,
          totalIGST: exactTotalsFromUI.totalIGST,
          totalTax: exactTotalsFromUI.totalTax,
          subtotalBeforeTax: exactTotalsFromUI.subtotal,
          taxableTotal: exactTotalsFromUI.subtotal,
          totalTaxAmount: exactTotalsFromUI.totalTax,
          useExactTotal: true,
          skipTotalRecalculation: true,
          skipBackendTotalCalculation: true,
          uiCalculatedTotal: displayTotal,
          authoritative: displayTotal,
          frontendCalculated: true,
          preserveExactTotal: true,
          doNotRecalculateTotal: true,
          BACKEND_DO_NOT_CALCULATE: true,
          FRONTEND_AMOUNTS_FINAL: true,
          BACKEND_SKIP_CALCULATION: true,
          calculationMetadata: {
            calculatedAt: new Date().toISOString(),
            calculationSource: "frontend_ui_final",
            preservationLevel: "maximum_strict",
            exactDisplayTotal: displayTotal,
            roundOffApplied: roundOffEnabled,
            roundOffValue: roundOffValue,
            itemsCount: mappedItems.length,
            totalVerification: exactTotalsFromUI,
          },
        },
        roundOffEnabled,
        roundOffValue,
        roundOffCalculation,
        paymentData: enhancedPaymentData,
        gstEnabled: formData.gstEnabled,
        invoiceType: formData.gstEnabled ? "gst" : "non-gst",
        invoiceNumber: formData.invoiceNumber,
        invoiceDate: formData.invoiceDate,
        customer: formData.customer,
        mobileNumber: formData.mobileNumber,
        documentMode: isQuotationsMode ? "quotation" : "invoice",
        formType: isQuotationsMode ? "quotation" : "sales",
        documentType: isQuotationsMode ? "quotation" : "invoice",
        submissionId: Date.now(),
        companyId: companyId,
        createdBy: currentUser?.id || currentUser?._id,
        createdByName: currentUser?.name,
        companyName: currentCompany?.name,
        shouldCreateTransaction: enhancedPaymentData?.amount > 0,
        transactionData: transactionData,
        preserveUICalculations: true,
        useExactAmounts: true,
        skipRecalculation: true,
        skipBackendCalculation: true,
        BACKEND_SKIP_CALCULATION: true,
        FRONTEND_AMOUNTS_FINAL: true,
        frontendCalculated: true,
        authoritative: displayTotal,
        preserveAmounts: true,
        doNotRecalculate: true,
        BACKEND_DO_NOT_CALCULATE: true,
        FRONTEND_CALCULATED: true,
        DO_NOT_RECALCULATE: true,
        PRESERVE_EXACT_AMOUNTS: true,
        SKIP_ALL_CALCULATIONS: true,
        USE_FRONTEND_VALUES_ONLY: true,
        calculationState: {
          source: "frontend_ui_final",
          timestamp: new Date().toISOString(),
          gstEnabled: formData.gstEnabled,
          totalItemsCalculated: mappedItems.length,
          finalCalculatedTotal: displayTotal,
          preservationLevel: "maximum_absolute",
        },
      };

      const criticalFlags = [
        "preserveUICalculations",
        "BACKEND_SKIP_CALCULATION",
        "FRONTEND_AMOUNTS_FINAL",
        "authoritative",
      ];
      const missingFlags = criticalFlags.filter(
        (flag) => !invoiceDataFromTable[flag]
      );

      if (missingFlags.length > 0) {
        addToast?.(
          `Error: Missing preservation flags: ${missingFlags.join(
            ", "
          )}. Please refresh and try again.`,
          "error"
        );
        return;
      }

      const result = await onSave(invoiceDataFromTable);

      if (result?.success) {
        const savedAmount =
          result.data?.total ||
          result.data?.amount ||
          result.data?.grandTotal ||
          displayTotal;

        const nonBillCount = nonBillItems.length;
        const nonBillTotal = nonBillItems.reduce((sum, item) => sum + item.amount, 0);
        
        let successMessage = `${isQuotationsMode ? "Quotation" : "Invoice"} saved successfully! Amount: ₹${savedAmount}`;
        
        if (nonBillCount > 0) {
          successMessage += ` | Non-bill items: ${nonBillCount} (₹${nonBillTotal.toFixed(2)})`;
        }
        
        addToast?.(successMessage, "success");

        if (Math.abs(savedAmount - displayTotal) >= 1) {
          addToast?.(
            `Warning: Total changed from ₹${displayTotal} to ₹${savedAmount}. Backend may have recalculated despite preservation flags.`,
            "warning"
          );
        }

        if (paymentData?.amount > 0 && createTransactionWithInvoice) {
          try {
            const transactionResult = await createTransactionWithInvoice(
              result.data || result
            );
            if (transactionResult?.success) {
              addToast?.(
                "Payment transaction created successfully!",
                "success"
              );
            } else {
              addToast?.(
                "Invoice saved but payment transaction failed. Please record payment manually.",
                "warning"
              );
            }
          } catch (transactionError) {
            addToast?.(
              "Invoice saved but payment recording failed: " +
                transactionError.message,
              "warning"
            );
          }
        }

        if (resetPaymentData) {
          resetPaymentData();
        }

        if (onCancel) {
          setTimeout(() => onCancel(), 1000);
        }
      } else {
        addToast?.(
          result?.message ||
            `Failed to save ${isQuotationsMode ? "quotation" : "invoice"}`,
          "error"
        );
      }
    } catch (error) {
      if (
        error.message === "Invoice creation already in progress" ||
        error.message === "Request already in progress" ||
        error.message === "Save in progress"
      ) {
        return;
      } else {
        addToast?.(
          error.message ||
            `Failed to save ${isQuotationsMode ? "quotation" : "invoice"}`,
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
    isQuotationsMode,
    onSave,
    addToast,
    resetPaymentData,
    onCancel,
    displayTotal,
    totals,
    roundOffEnabled,
    roundOffValue,
    roundOffCalculation,
    paymentData,
    hasValidItems,
    companyId,
    currentUser,
    currentCompany,
    createTransactionWithInvoice,
    bankAccounts,
  ]);

  // Item management functions
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

  // Payment functions
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

    if (!isQuotationsMode && !formData.customer) {
      addToast?.("Please select a customer before adding payment", "warning");
      return;
    }

    const totalAmount = displayTotal;

    if (totalAmount <= 0) {
      addToast?.("Invalid total amount", "warning");
      return;
    }

    setShowPaymentModal(true);
  };

  // Utility functions
  const resetProductSearchState = () => {
    setProducts([]);
    setProductSearchTerms("");
    setShowProductSuggestions(false);
    setProductSearchNotFound(false);
    setProductSearchLoading(false);
  };

  return (
    <Container fluid className="px-0">
      {/* Enhanced Header Section */}
      <Card
        className="mb-4"
        style={getCardStyle()}
      >
        {/* Enhanced Header */}
        <div
          style={{
            background: purpleTheme.gradient,
            color: "white",
            padding: "20px 16px"
          }}
          className="responsive-header"
        >
          <div className="d-flex align-items-center justify-content-between flex-wrap">
            <div className="d-flex align-items-center flex-grow-1 me-3">
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center me-3 header-icon"
                style={{
                  width: "48px",
                  height: "48px",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  backdropFilter: "blur(10px)",
                  flexShrink: 0
                }}
              >
                <FontAwesomeIcon
                  icon={currentConfig.formIcon}
                  size="lg"
                />
              </div>
              <div className="flex-grow-1 min-width-0">
                <h4 className="mb-1 fw-bold header-title" style={{ fontSize: "18px" }}>
                  {currentConfig.title}
                </h4>
                <div className="d-flex align-items-center flex-wrap">
                  <small 
                    className="opacity-90 me-2 header-subtitle" 
                    style={{ fontSize: "12px" }}
                  >
                    {currentConfig.subtitle}
                  </small>
                  <div 
                    className="px-2 py-1 rounded-pill header-badge"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      fontSize: "10px",
                      fontWeight: "600",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {localItems.length} Item{localItems.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Action Section */}
            <div className="d-flex align-items-center gap-2 header-actions">
              <div 
                className="text-end header-total"
                style={{ opacity: 0.9 }}
              >
                <div className="fw-bold" style={{ fontSize: "16px" }}>
                  ₹{(displayTotal || 0).toLocaleString()}
                </div>
                <small style={{ fontSize: "10px" }}>Total Amount</small>
              </div>
              <Button
                onClick={handleAddProductClick}
                disabled={disabled || isSubmitting || submissionRef.current}
                className="header-add-btn"
                style={{
                  ...getButtonStyle('outline'),
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(10px)",
                  color: purpleTheme.primary,
                  borderColor: "rgba(255, 255, 255, 0.3)",
                  padding: "10px 16px",
                  fontSize: "13px",
                  whiteSpace: "nowrap"
                }}
              >
                <FontAwesomeIcon icon={faPlus} className="me-1" />
                <span className="d-none d-sm-inline">Add New Item</span>
                <span className="d-sm-none">Add</span>
              </Button>
            </div>
          </div>
        </div>
          {/* </div>
        </div> */}

        {/* Stats Section */}
        <div
          className="px-4 py-3 border-bottom"
          style={{
            backgroundColor: purpleTheme.background,
          }}
        >
          <Row className="g-3">
            <Col md={6}>
              <div className="d-flex align-items-center">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center me-3"
                  style={{
                    width: "40px",
                    height: "40px",
                    backgroundColor: hasValidItems
                      ? purpleTheme.success
                      : purpleTheme.textMuted,
                    color: "white",
                  }}
                >
                  <FontAwesomeIcon icon={faBoxOpen} />
                </div>
                <div>
                  <div className="fw-bold text-dark">
                    {localItems.filter((item) => item.itemName).length}
                  </div>
                  <small className="text-muted">
                    {localItems.filter((item) => item.itemName).length === 1
                      ? "Item"
                      : "Items"}{" "}
                    Added
                  </small>
                </div>
              </div>
            </Col>
            <Col md={6}>
              <div className="d-flex align-items-center">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center me-3"
                  style={{
                    width: "40px",
                    height: "40px",
                    backgroundColor:
                      displayTotal > 0
                        ? currentConfig.primaryColor
                        : purpleTheme.textMuted,
                    color: "white",
                  }}
                >
                  <FontAwesomeIcon icon={faRupeeSign} />
                </div>
                <div>
                  <div className="fw-bold text-dark">
                    ₹{itemsTableLogic.formatCurrency(displayTotal)}
                  </div>
                  <small className="text-muted">
                    {currentConfig.totalLabel}
                  </small>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </Card>

      {/* Tab Navigation Section */}
      <Card className="mb-4" style={getCardStyle()}>
        <Card.Body className="p-0">
          <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
            <Nav variant="tabs" className="nav-fill responsive-tabs" style={{ borderBottom: 'none' }}>
              <Nav.Item>
                <Nav.Link 
                  eventKey="bill"
                  className="responsive-tab"
                  style={{
                    padding: '16px 20px',
                    fontWeight: '600',
                    fontSize: '15px',
                    color: activeTab === 'bill' ? 'white' : purpleTheme.text,
                    background: activeTab === 'bill' 
                      ? purpleTheme.gradient 
                      : 'transparent',
                    border: 'none',
                    borderRadius: activeTab === 'bill' ? '12px 12px 0 0' : '0',
                    transition: 'all 0.3s ease',
                    minHeight: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FontAwesomeIcon icon={faFileInvoice} className="me-2 tab-icon" />
                  <span className="tab-text">With Bill</span>
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link 
                  eventKey="non-bill"
                  className="responsive-tab"
                  style={{
                    padding: '16px 20px',
                    fontWeight: '600',
                    fontSize: '15px',
                    color: activeTab === 'non-bill' ? 'white' : purpleTheme.text,
                    background: activeTab === 'non-bill' 
                      ? purpleTheme.gradient 
                      : 'transparent',
                    border: 'none',
                    borderRadius: activeTab === 'non-bill' ? '12px 12px 0 0' : '0',
                    transition: 'all 0.3s ease',
                    minHeight: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FontAwesomeIcon icon={faReceipt} className="me-2 tab-icon" />
                  <span className="tab-text">Without Bill</span>
                </Nav.Link>
              </Nav.Item>
            </Nav>

            <Tab.Content style={{ minHeight: '400px' }}>
              <Tab.Pane eventKey="bill">
                {/* All existing bill functionality goes here */}

      {/* Items Table Section */}
      {hasValidItems && (
        <Card
          className="mb-4"
          style={{
            border: "none",
            borderRadius: "16px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            overflow: "hidden",
          }}
        >
          <Card.Header
            style={{
              backgroundColor: purpleTheme.background,
              borderBottom: `2px solid ${purpleTheme.border}`,
              padding: "16px 24px",
            }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold text-dark">
                <FontAwesomeIcon
                  icon={currentConfig.formIcon}
                  className="me-2"
                />
                Added Items ({localItems.filter((item) => item.itemName).length}
                )
              </h6>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <Table hover className="mb-0 responsive-items-table" style={{ minWidth: '800px' }}>
                <thead style={{backgroundColor: purpleTheme.background}}>
                  <tr>
                    <th
                      className="text-center"
                      style={{
                        fontSize: "12px",
                        padding: "10px 8px",
                        fontWeight: "600",
                        color: purpleTheme.text,
                        width: '40px',
                        minWidth: '40px'
                      }}
                    >
                      #
                    </th>
                    <th
                      style={{
                        fontSize: "12px",
                        padding: "10px 12px",
                        fontWeight: "600",
                        color: purpleTheme.text,
                        minWidth: '180px'
                      }}
                    >
                      ITEM
                    </th>
                    {formData.gstEnabled && (
                      <th
                        className="d-none d-md-table-cell"
                        style={{
                          fontSize: "12px",
                          padding: "10px 8px",
                          fontWeight: "600",
                          color: purpleTheme.text,
                          width: '80px'
                        }}
                      >
                        HSN
                      </th>
                    )}
                    <th
                      className="text-center"
                      style={{
                        fontSize: "12px",
                        padding: "10px 8px",
                        fontWeight: "600",
                        color: purpleTheme.text,
                        width: '60px'
                      }}
                    >
                      QTY
                    </th>
                    <th
                      className="d-none d-sm-table-cell text-center"
                      style={{
                        fontSize: "12px",
                        padding: "10px 8px",
                        fontWeight: "600",
                        color: purpleTheme.text,
                        width: '60px'
                      }}
                    >
                      UNIT
                    </th>
                    <th
                      className="text-end"
                      style={{
                        fontSize: "12px",
                        padding: "10px 12px",
                        fontWeight: "600",
                        color: purpleTheme.text,
                        width: '90px'
                      }}
                    >
                      PRICE
                    </th>
                    <th
                      className="d-none d-lg-table-cell text-center"
                      style={{
                        fontSize: "12px",
                        padding: "10px 8px",
                        fontWeight: "600",
                        color: purpleTheme.text,
                        width: '80px'
                      }}
                    >
                      DISC
                    </th>
                    {formData.gstEnabled && (
                      <th
                        className="d-none d-xl-table-cell text-center"
                        style={{
                          fontSize: "12px",
                          padding: "10px 8px",
                          fontWeight: "600",
                          color: purpleTheme.text,
                          width: '90px'
                        }}
                      >
                        TAX
                      </th>
                    )}
                    <th
                      className="text-end"
                      style={{
                        fontSize: "12px",
                        padding: "10px 12px",
                        fontWeight: "600",
                        color: purpleTheme.text,
                        width: '100px'
                      }}
                    >
                      AMOUNT
                    </th>
                    <th
                      className="text-center"
                      style={{
                        fontSize: "12px",
                        padding: "10px 8px",
                        fontWeight: "600",
                        color: purpleTheme.text,
                        width: '80px'
                      }}
                    >
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {localItems
                    .filter((item) => item.itemName)
                    .map((item, index) => (
                      <tr
                        key={item.id || index}
                        style={{
                          borderBottom: `1px solid ${purpleTheme.border}`,
                        }}
                      >
                        <td
                          className="text-center"
                          style={{
                            fontSize: "12px",
                            padding: "10px 8px",
                            color: purpleTheme.text,
                          }}
                        >
                          {index + 1}
                        </td>
                        <td style={{fontSize: "12px", padding: "10px 12px"}}>
                          <div>
                            <div className="fw-semibold text-dark" style={{ fontSize: "13px", lineHeight: "1.3" }}>
                              {item.itemName}
                            </div>
                            {item.itemCode && (
                              <Badge
                                style={{
                                  backgroundColor: `rgba(${currentConfig.primaryRgb}, 0.1)`,
                                  color: currentConfig.primaryColor,
                                  fontSize: "9px",
                                  fontWeight: "500",
                                }}
                                className="mt-1"
                              >
                                {item.itemCode}
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <small className="text-muted d-block mt-1" style={{ fontSize: "10px", lineHeight: "1.2" }}>
                              {item.description.length > 30
                                ? `${item.description.substring(0, 30)}...`
                                : item.description}
                            </small>
                          )}
                          {/* Mobile-only info */}
                          <div className="d-sm-none mt-1">
                            <small className="text-muted" style={{ fontSize: "10px" }}>
                              {item.unit} | ₹{parseFloat(item.pricePerUnit || 0).toFixed(2)}
                            </small>
                          </div>
                        </td>
                        {formData.gstEnabled && (
                          <td
                            className="d-none d-md-table-cell text-center"
                            style={{
                              fontSize: "11px",
                              padding: "10px 8px",
                              color: purpleTheme.textMuted,
                            }}
                          >
                            {item.hsnCode || "N/A"}
                          </td>
                        )}
                        <td
                          className="text-center"
                          style={{
                            fontSize: "12px",
                            padding: "10px 8px",
                            color: purpleTheme.text,
                          }}
                        >
                          <span className="fw-semibold">{item.quantity}</span>
                        </td>
                        <td
                          className="d-none d-sm-table-cell text-center"
                          style={{
                            fontSize: "11px",
                            padding: "10px 8px",
                            color: purpleTheme.textMuted,
                          }}
                        >
                          {item.unit}
                        </td>
                        <td className="text-end" style={{fontSize: "12px", padding: "10px 12px"}}>
                          <div className="fw-semibold text-dark">
                            ₹{parseFloat(item.pricePerUnit || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="d-none d-lg-table-cell text-center" style={{fontSize: "11px", padding: "10px 8px"}}>
                          {item.discountPercent > 0 && (
                            <span
                              className="fw-semibold"
                              style={{color: purpleTheme.warning, fontSize: "10px"}}
                            >
                              {item.discountPercent}%
                            </span>
                          )}
                          {item.discountAmount > 0 && (
                            <div
                              className="fw-semibold"
                              style={{color: purpleTheme.warning, fontSize: "10px"}}
                            >
                              ₹{item.discountAmount.toFixed(2)}
                            </div>
                          )}
                        </td>
                        {formData.gstEnabled && (
                          <td className="d-none d-xl-table-cell text-center" style={{fontSize: "10px", padding: "10px 8px"}}>
                            {item.cgstAmount + item.sgstAmount > 0 ? (
                              <div>
                                <small style={{color: purpleTheme.success, fontSize: "9px"}}>
                                  C: ₹{item.cgstAmount.toFixed(2)}
                                </small>
                                <br />
                                <small style={{color: purpleTheme.success, fontSize: "9px"}}>
                                  S: ₹{item.sgstAmount.toFixed(2)}
                                </small>
                              </div>
                            ) : (
                              <Badge
                                style={{
                                  backgroundColor: purpleTheme.textMuted,
                                  color: "white",
                                  fontSize: "8px",
                                }}
                              >
                                No Tax
                              </Badge>
                            )}
                          </td>
                        )}
                        <td className="text-end" style={{fontSize: "13px", padding: "10px 12px"}}>
                          <div
                            className="fw-bold"
                            style={{color: purpleTheme.success}}
                          >
                            ₹{(item.amount || 0).toFixed(2)}
                          </div>
                          {/* Mobile-only discount info */}
                          <div className="d-lg-none">
                            {(item.discountPercent > 0 || item.discountAmount > 0) && (
                              <small style={{color: purpleTheme.warning, fontSize: "9px"}}>
                                -{item.discountPercent > 0 ? `${item.discountPercent}%` : `₹${item.discountAmount.toFixed(2)}`}
                              </small>
                            )}
                          </div>
                        </td>
                        <td className="text-center" style={{fontSize: "12px", padding: "10px 8px"}}>
                          <div className="d-flex gap-1 justify-content-center">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleEditProduct(index)}
                              disabled={
                                disabled ||
                                isSubmitting ||
                                submissionRef.current
                              }
                              style={{
                                padding: "4px 6px",
                                borderRadius: "4px",
                                borderColor: currentConfig.primaryColor,
                                color: currentConfig.primaryColor,
                                fontSize: "10px",
                                transition: "all 0.2s ease",
                                minWidth: "28px",
                                height: "28px"
                              }}
                            >
                              <FontAwesomeIcon icon={faEdit} size="xs" />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleRemoveProduct(index)}
                              disabled={
                                disabled ||
                                localItems.length === 1 ||
                                isSubmitting ||
                                submissionRef.current
                              }
                              style={{
                                padding: "4px 6px",
                                borderRadius: "4px",
                                borderColor: purpleTheme.error,
                                color: purpleTheme.error,
                                fontSize: "10px",
                                transition: "all 0.2s ease",
                                minWidth: "28px",
                                height: "28px"
                              }}
                            >
                              <FontAwesomeIcon icon={faTrash} size="xs" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Action Buttons Section */}
      {hasValidItems && (
        <Card
          style={{
            border: "none",
            borderRadius: "16px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          }}
        >
          <Card.Body style={{padding: "24px"}}>
            <Row className="g-3 g-md-4">
              {/* Payment Button */}
              <Col xs={12} sm={6} lg={gridLayout.payment || 5}>
                <Button
                  variant={
                    paymentData.amount > 0
                      ? "success"
                      : currentConfig.actionButtonColor
                  }
                  className="w-100 d-flex align-items-center justify-content-center flex-column border-0 fw-semibold responsive-payment-btn"
                  style={{
                    minHeight: "100px",
                    borderRadius: "12px",
                    fontSize: "13px",
                    background:
                      paymentData.amount > 0
                        ? `linear-gradient(135deg, ${purpleTheme.success} 0%, #34d399 100%)`
                        : `linear-gradient(135deg, ${currentConfig.primaryColor} 0%, ${purpleTheme.primaryLight} 100%)`,
                    boxShadow: `0 4px 20px rgba(${currentConfig.primaryRgb}, 0.3)`,
                    transition: "all 0.2s ease",
                    opacity: isSubmitting || submissionRef.current ? 0.6 : 1,
                  }}
                  onClick={handlePaymentClick}
                  disabled={
                    !hasValidItems ||
                    (!isQuotationsMode && !formData.customer) ||
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
                    className="mb-2 payment-icon"
                    size="lg"
                  />
                  <span className="payment-text">
                    {paymentData.amount > 0
                      ? isQuotationsMode
                        ? "Update Terms"
                        : "Update Payment"
                      : currentConfig.paymentAction}
                  </span>

                  <small className="mt-1 payment-amount" style={{opacity: 0.8, fontSize: "11px"}}>
                    {paymentData.amount > 0
                      ? `₹${itemsTableLogic.formatCurrency(paymentData.amount)}`
                      : `₹${itemsTableLogic.formatCurrency(displayTotal)}`}
                  </small>
                </Button>
              </Col>

              {/* GST Breakdown Card */}
              {formData.gstEnabled && totals.totalTax > 0 && (
                <Col xs={12} sm={6} lg={gridLayout.tax || 3}>
                  <Card
                    className="h-100"
                    style={{
                      backgroundColor: purpleTheme.background,
                      border: `2px solid ${purpleTheme.border}`,
                      borderRadius: "12px",
                    }}
                  >
                    <Card.Body style={{padding: "16px"}}>
                      <div className="text-center mb-3">
                        <FontAwesomeIcon
                          icon={faPercent}
                          style={{color: purpleTheme.primary}}
                          className="me-2"
                        />
                        <span
                          className="fw-bold small"
                          style={{color: purpleTheme.text}}
                        >
                          GST Breakdown
                        </span>
                      </div>
                      <div className="small">
                        <div className="d-flex justify-content-between mb-2">
                          <span style={{color: purpleTheme.textMuted}}>
                            Subtotal:
                          </span>
                          <span
                            className="fw-semibold"
                            style={{color: purpleTheme.text}}
                          >
                            ₹{itemsTableLogic.formatCurrency(totals.subtotal)}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span style={{color: purpleTheme.textMuted}}>
                            CGST:
                          </span>
                          <span
                            className="fw-semibold"
                            style={{color: purpleTheme.primary}}
                          >
                            ₹{itemsTableLogic.formatCurrency(totals.totalCGST)}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span style={{color: purpleTheme.textMuted}}>
                            SGST:
                          </span>
                          <span
                            className="fw-semibold"
                            style={{color: purpleTheme.primary}}
                          >
                            ₹{itemsTableLogic.formatCurrency(totals.totalSGST)}
                          </span>
                        </div>
                        <hr
                          style={{
                            borderColor: purpleTheme.border,
                            margin: "8px 0",
                          }}
                        />
                        <div className="d-flex justify-content-between">
                          <span
                            className="fw-bold"
                            style={{color: purpleTheme.text}}
                          >
                            Total:
                          </span>
                          <span
                            className="fw-bold"
                            style={{color: currentConfig.primaryColor}}
                          >
                            ₹{itemsTableLogic.formatCurrency(totals.finalTotal)}
                          </span>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              )}

              {/* Total Card */}
              <Col xs={12} sm={6} lg={gridLayout.total || 2}>
                <Card
                  className="h-100"
                  style={{
                    border: `3px solid ${currentConfig.primaryColor}`,
                    borderRadius: "12px",
                  }}
                >
                  <Card.Body style={{padding: "16px"}}>
                    <div className="text-center mb-3">
                      <FontAwesomeIcon
                        icon={currentConfig.formIcon}
                        style={{color: purpleTheme.textMuted}}
                        className="me-2"
                      />
                      <span
                        className="fw-bold small"
                        style={{color: purpleTheme.textMuted}}
                      >
                        {currentConfig.totalLabel}
                      </span>
                    </div>

                    <div
                      className="fw-bold h5 mb-3 text-center"
                      style={{color: currentConfig.primaryColor}}
                    >
                      ₹{itemsTableLogic.formatCurrency(displayTotal)}
                    </div>

                    <div
                      className="border-top pt-2"
                      style={{borderColor: purpleTheme.border}}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span
                          className="fw-semibold small"
                          style={{color: purpleTheme.textMuted}}
                        >
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
                        <div
                          className="p-2 rounded"
                          style={{
                            backgroundColor: `rgba(${purpleTheme.primaryRgb}, 0.1)`,
                          }}
                        >
                          <div className="d-flex justify-content-between small">
                            <span style={{color: purpleTheme.textMuted}}>
                              {roundOffDisplayInfo.baseTotalLabel ||
                                "Base Total"}
                              :
                            </span>
                            <span style={{color: purpleTheme.text}}>
                              ₹
                              {itemsTableLogic.formatCurrency(
                                roundOffDisplayInfo.baseTotalAmount
                              )}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between small">
                            <span style={{color: purpleTheme.textMuted}}>
                              Round Off:
                            </span>
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

              {/* Action Buttons */}
              <Col xs={12} sm={6} lg={gridLayout.actions || 2}>
                <div className="d-grid gap-2 h-100">
                  <Button
                    variant="outline-info"
                    onClick={onShare}
                    disabled={
                      !hasValidItems || isSubmitting || submissionRef.current
                    }
                    style={{
                      padding: "10px 12px",
                      fontSize: "13px",
                      fontWeight: "600",
                      borderRadius: "8px",
                      borderWidth: "2px",
                      opacity: isSubmitting || submissionRef.current ? 0.6 : 1,
                      transition: "all 0.2s ease",
                    }}
                  >
                    <FontAwesomeIcon icon={faShare} className="me-2" />
                    Share
                  </Button>

                  <Button
                    onClick={handleSaveInvoice}
                    disabled={
                      !hasValidItems ||
                      saving ||
                      isSubmitting ||
                      submissionRef.current ||
                      (!isQuotationsMode && !formData.customer)
                    }
                    style={{
                      ...getButtonStyle('success', 'large'),
                      minWidth: "180px",
                      background: saving || isSubmitting
                        ? `linear-gradient(135deg, ${purpleTheme.textMuted} 0%, #9ca3af 100%)`
                        : currentConfig.saveButtonVariant === "success"
                          ? `linear-gradient(135deg, ${purpleTheme.success} 0%, #34d399 100%)`
                          : purpleTheme.gradient,
                      boxShadow: saving || isSubmitting 
                        ? "none" 
                        : purpleTheme.shadowMd,
                      transform: saving || isSubmitting ? "none" : "translateY(0)",
                      cursor: saving || isSubmitting ? "not-allowed" : "pointer"
                    }}
                    className="border-0"
                  >
                    {saving || isSubmitting ? (
                      <>
                        <FontAwesomeIcon
                          icon={faSpinner}
                          className="fa-spin me-2"
                        />
                        Processing...
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
                      padding: "10px 12px",
                      fontSize: "13px",
                      fontWeight: "600",
                      borderRadius: "8px",
                      borderWidth: "2px",
                      opacity: isSubmitting || submissionRef.current ? 0.6 : 1,
                      transition: "all 0.2s ease",
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

      {/* Empty State */}
      {!hasValidItems && (
        <Card
          style={{
            border: "none",
            borderRadius: "16px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          }}
        >
          <Card.Body className="text-center py-5">
            <FontAwesomeIcon
              icon={faBoxOpen}
              size="3x"
              className="mb-3"
              style={{color: purpleTheme.textMuted, opacity: 0.5}}
            />
            <h5 style={{color: purpleTheme.textMuted}}>No Items Added Yet</h5>
            <p style={{color: purpleTheme.textMuted}}>
              Click the "Add Item" button above to start adding items to your{" "}
              {isQuotationsMode ? "quotation" : "invoice"}.
            </p>
            <Button
              variant="primary"
              onClick={handleAddProductClick}
              disabled={disabled || isSubmitting || submissionRef.current}
              style={{
                background: `linear-gradient(135deg, ${currentConfig.primaryColor} 0%, ${purpleTheme.primaryLight} 100%)`,
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                fontWeight: "600",
                boxShadow: `0 4px 15px rgba(${currentConfig.primaryRgb}, 0.3)`,
                transition: "all 0.2s ease",
              }}
            >
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              Add Your First Item
            </Button>
          </Card.Body>
        </Card>
      )}

      {/* Product Form Modal */}
      <Modal
        show={showProductFormModal}
        onHide={() => {
          setShowProductFormModal(false);
          resetProductSearchState();
        }}
        size="xl"
        centered
        backdrop="static"
        style={{
          "--bs-modal-border-radius": "16px",
        }}
      >
        <Modal.Header
          closeButton
          style={{
            backgroundColor: purpleTheme.background,
            borderBottom: `2px solid ${purpleTheme.border}`,
            borderRadius: "16px 16px 0 0",
          }}
        >
          <Modal.Title style={{color: purpleTheme.text, fontWeight: "600"}}>
            <FontAwesomeIcon
              icon={currentEditingIndex !== null ? faEdit : faPlus}
              className="me-2"
              style={{color: currentConfig.primaryColor}}
            />
            {currentEditingIndex !== null ? "Edit Item" : "Add Item"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body
          className="responsive-modal-body"
          style={{padding: "16px 20px", backgroundColor: purpleTheme.surface}}
        >
          <Row className="g-3">
            <Col xs={12} md={6}>
              <Form.Group className="mb-3 position-relative">
                <Form.Label
                  className="fw-bold"
                  style={{color: purpleTheme.error}}
                >
                  Select Product *
                  {tempFormData.selectedProduct && (
                    <Badge
                      className="ms-2"
                      style={{
                        backgroundColor: purpleTheme.success,
                        color: "white",
                      }}
                    >
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
                    ...getInputStyle(),
                    backgroundColor: tempFormData.selectedProduct
                      ? `rgba(${purpleTheme.primaryRgb}, 0.05)`
                      : purpleTheme.surface,
                    borderColor: tempFormData.selectedProduct
                      ? purpleTheme.success
                      : purpleTheme.border,
                  }}
                  placeholder="Search or enter item name..."
                  autoComplete="off"
                  disabled={isSubmitting || submissionRef.current}
                />

                {productSearchLoading && (
                  <div className="position-absolute end-0 top-50 translate-middle-y me-3">
                    <div
                      className="spinner-border spinner-border-sm"
                      style={{color: currentConfig.primaryColor}}
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
                        borderColor: purpleTheme.border,
                        borderRadius: "8px",
                      }}
                    >
                      {productSearchLoading ? (
                        <div className="p-3 text-center">
                          <div
                            className="spinner-border spinner-border-sm me-2"
                            style={{color: currentConfig.primaryColor}}
                            role="status"
                          ></div>
                          <span style={{color: purpleTheme.textMuted}}>
                            Searching products...
                          </span>
                        </div>
                      ) : products.length > 0 ? (
                        <>
                          {products.slice(0, 8).map((product) => (
                            <div
                              key={product.id || product._id}
                              className="p-3 border-bottom"
                              style={{
                                cursor: "pointer",
                                transition: "background-color 0.2s",
                                borderColor: purpleTheme.border,
                              }}
                              onClick={() => handleProductSelect(product)}
                              onMouseEnter={(e) =>
                                (e.target.style.backgroundColor =
                                  purpleTheme.background)
                              }
                              onMouseLeave={(e) =>
                                (e.target.style.backgroundColor = "transparent")
                              }
                            >
                              <div
                                className="fw-bold"
                                style={{color: purpleTheme.text}}
                              >
                                {product.name}
                              </div>
                              <small style={{color: purpleTheme.textMuted}}>
                                Sale: ₹
                                {itemsTableLogic.formatCurrency(
                                  product.salePrice || 0
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
                              className="p-3 border-top"
                              style={{
                                cursor: "pointer",
                                transition: "background-color 0.2s",
                                backgroundColor: purpleTheme.background,
                                borderColor: purpleTheme.border,
                              }}
                              onClick={handleCreateNewItem}
                              onMouseEnter={(e) =>
                                (e.target.style.backgroundColor =
                                  purpleTheme.borderDark)
                              }
                              onMouseLeave={(e) =>
                                (e.target.style.backgroundColor =
                                  purpleTheme.background)
                              }
                            >
                              <div
                                className="fw-bold"
                                style={{color: currentConfig.primaryColor}}
                              >
                                <FontAwesomeIcon
                                  icon={faPlus}
                                  className="me-2"
                                />
                                Create "{productSearchTerms}"
                              </div>
                              <small style={{color: purpleTheme.textMuted}}>
                                Add this as a new item
                              </small>
                            </div>
                          )}
                        </>
                      ) : productSearchNotFound ? (
                        <div className="p-3">
                          <div
                            className="text-center mb-2"
                            style={{color: purpleTheme.textMuted}}
                          >
                            <FontAwesomeIcon
                              icon={faBoxOpen}
                              className="me-2"
                            />
                            No products found for "{productSearchTerms}"
                          </div>

                          {productSearchTerms.trim() && (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="w-100"
                              onClick={handleCreateNewItem}
                              style={{
                                borderColor: currentConfig.primaryColor,
                                color: currentConfig.primaryColor,
                                borderRadius: "8px",
                              }}
                            >
                              <FontAwesomeIcon icon={faPlus} className="me-2" />
                              Create "{productSearchTerms}" as new item
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
              </Form.Group>
            </Col>

            <Col xs={6} md={3}>
              <Form.Group className="mb-3">
                <Form.Label
                  className="fw-bold"
                  style={{color: purpleTheme.error, fontSize: "13px"}}
                >
                  Quantity *
                </Form.Label>
                <Form.Control
                  type="number"
                  value={tempFormData.quantity || ""}
                  onChange={(e) =>
                    handleTempFormChange("quantity", e.target.value)
                  }
                  style={{...getInputStyle(), height: "44px", fontSize: "14px"}}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  disabled={isSubmitting || submissionRef.current}
                />
              </Form.Group>
            </Col>

            <Col xs={6} md={3}>
              <Form.Group className="mb-3">
                <Form.Label
                  className="fw-bold"
                  style={{color: purpleTheme.error, fontSize: "13px"}}
                >
                  Price *
                </Form.Label>
                <InputGroup>
                  <InputGroup.Text style={{...getInputStyle(), height: "44px", fontSize: "14px"}}>₹</InputGroup.Text>
                  <Form.Control
                    type="number"
                    value={tempFormData.pricePerUnit || ""}
                    onChange={(e) =>
                      handleTempFormChange("pricePerUnit", e.target.value)
                    }
                    style={{...getInputStyle(), height: "44px", fontSize: "14px"}}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    disabled={isSubmitting || submissionRef.current}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-3">
            <Col xs={6} md={3}>
              <Form.Group className="mb-3">
                <Form.Label
                  className="fw-bold"
                  style={{color: purpleTheme.text, fontSize: "13px"}}
                >
                  Unit
                </Form.Label>
                <Form.Select
                  value={tempFormData.unit || "PCS"}
                  onChange={(e) => handleTempFormChange("unit", e.target.value)}
                  style={{...getInputStyle(), height: "44px", fontSize: "14px"}}
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
                <Col xs={12} sm={6} md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label
                      className="fw-bold"
                      style={{color: purpleTheme.text}}
                    >
                      Tax Mode
                      <Badge
                        className="ms-2"
                        style={{
                          backgroundColor:
                            tempFormData.taxMode === "with-tax"
                              ? purpleTheme.success
                              : currentConfig.primaryColor,
                          color: "white",
                          fontSize: "9px",
                        }}
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
                      style={getInputStyle()}
                      disabled={isSubmitting || submissionRef.current}
                    >
                      <option value="with-tax">Price Includes Tax</option>
                      <option value="without-tax">Price Excludes Tax</option>
                    </Form.Select>

                    {tempFormData.quantity > 0 &&
                      tempFormData.pricePerUnit > 0 &&
                      formData.gstEnabled && (
                        <div
                          className="mt-2 p-2 rounded"
                          style={{
                            backgroundColor: purpleTheme.background,
                            border: `1px solid ${purpleTheme.border}`,
                          }}
                        >
                          <small
                            className="d-block"
                            style={{color: purpleTheme.textMuted}}
                          >
                            {tempFormData.taxMode === "with-tax"
                              ? `₹${tempFormData.pricePerUnit} includes ${
                                  tempFormData.taxRate || 18
                                }% tax`
                              : `₹${tempFormData.pricePerUnit} + ${
                                  tempFormData.taxRate || 18
                                }% tax`}
                          </small>

                          {tempFormData.taxMode === "with-tax" ? (
                            <small
                              className="d-block"
                              style={{color: purpleTheme.primary}}
                            >
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
                            <small
                              className="d-block"
                              style={{color: purpleTheme.primary}}
                            >
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
                            <small
                              className="d-block"
                              style={{color: purpleTheme.success}}
                            >
                              CGST: ₹{tempFormData.cgstAmount.toFixed(2)}, SGST:
                              ₹{tempFormData.sgstAmount.toFixed(2)}
                            </small>
                          )}
                        </div>
                      )}
                  </Form.Group>
                </Col>
                <Col xs={6} sm={6} md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label
                      className="fw-bold"
                      style={{color: purpleTheme.text, fontSize: "13px"}}
                    >
                      Tax Rate (%)
                    </Form.Label>
                    <Form.Select
                      value={tempFormData.taxRate || 18}
                      onChange={(e) =>
                        handleTempFormChange("taxRate", e.target.value)
                      }
                      style={{...getInputStyle(), height: "44px", fontSize: "14px"}}
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
                <Col xs={12} sm={6} md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label
                      className="fw-bold"
                      style={{color: purpleTheme.text, fontSize: "13px"}}
                    >
                      HSN Code
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={tempFormData.hsnCode || ""}
                      onChange={(e) =>
                        handleTempFormChange("hsnCode", e.target.value)
                      }
                      style={{...getInputStyle(), height: "44px", fontSize: "14px"}}
                      placeholder="HSN Code"
                      disabled={isSubmitting || submissionRef.current}
                    />
                  </Form.Group>
                </Col>
              </>
            )}

            <Col xs={6} md={3}>
              <Form.Group className="mb-3">
                <Form.Label
                  className="fw-bold"
                  style={{color: purpleTheme.text, fontSize: "13px"}}
                >
                  Discount %
                </Form.Label>
                <Form.Control
                  type="number"
                  value={tempFormData.discountPercent || ""}
                  onChange={(e) =>
                    handleTempFormChange("discountPercent", e.target.value)
                  }
                  style={{...getInputStyle(), height: "44px", fontSize: "14px"}}
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
            <Form.Label className="fw-bold" style={{color: purpleTheme.text, fontSize: "13px"}}>
              Description
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={tempFormData.description || ""}
              onChange={(e) =>
                handleTempFormChange("description", e.target.value)
              }
              style={{...getInputStyle(), minHeight: "60px", fontSize: "14px"}}
              placeholder="Enter item description..."
              disabled={isSubmitting || submissionRef.current}
            />
          </Form.Group>

          <div
            className="text-center p-3 rounded"
            style={{
              backgroundColor: purpleTheme.background,
              border: `2px solid ${purpleTheme.success}`,
            }}
          >
            <h4 className="mb-2" style={{color: purpleTheme.success}}>
              Total: ₹{itemsTableLogic.formatCurrency(tempFormData.amount || 0)}
            </h4>

            {tempFormData.quantity > 0 && tempFormData.pricePerUnit > 0 && (
              <div className="small" style={{color: purpleTheme.textMuted}}>
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
                className="mt-2"
                style={{
                  backgroundColor:
                    tempFormData.taxMode === "with-tax"
                      ? purpleTheme.success
                      : currentConfig.primaryColor,
                  color: "white",
                }}
              >
                {tempFormData.taxMode === "with-tax"
                  ? "Price Includes Tax"
                  : "Price Excludes Tax"}
              </Badge>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer
          style={{
            backgroundColor: purpleTheme.background,
            borderTop: `2px solid ${purpleTheme.border}`,
            borderRadius: "0 0 16px 16px",
            padding: "16px 24px",
          }}
        >
          <Button
            variant="outline-secondary"
            onClick={() => {
              setShowProductFormModal(false);
              resetProductSearchState();
            }}
            disabled={isSubmitting || submissionRef.current}
            style={{
              borderColor: purpleTheme.textMuted,
              color: purpleTheme.textMuted,
              borderRadius: "8px",
              fontWeight: "600",
            }}
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
            style={{
              backgroundColor: purpleTheme.success,
              borderColor: purpleTheme.success,
              borderRadius: "8px",
              fontWeight: "600",
              boxShadow: `0 4px 15px rgba(16, 185, 129, 0.3)`,
            }}
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
            style={{
              background: `linear-gradient(135deg, ${currentConfig.primaryColor} 0%, ${purpleTheme.primaryLight} 100%)`,
              borderColor: currentConfig.primaryColor,
              borderRadius: "8px",
              fontWeight: "600",
              boxShadow: `0 4px 15px rgba(${currentConfig.primaryRgb}, 0.3)`,
            }}
          >
            <FontAwesomeIcon icon={faSave} className="me-2" />
            Save & Exit
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Payment Modal */}
      <PaymentModal
        show={showPaymentModal}
        onHide={() => setShowPaymentModal(false)}
        currentConfig={currentConfig}
        finalTotalWithRoundOff={displayTotal}
        paymentData={paymentData}
        setPaymentData={setPaymentData}
        handlePaymentAmountChange={handlePaymentAmountChange}
        handlePaymentTypeChange={handlePaymentTypeChange}
        handlePaymentSubmit={handlePaymentSubmit}
        submittingPayment={submittingPayment}
        bankAccounts={bankAccounts}
        loadingBankAccounts={loadingBankAccounts}
        retryLoadBankAccounts={retryLoadBankAccounts}
        paymentHistory={paymentHistory}
        totals={totals}
        gstEnabled={formData.gstEnabled}
        roundOffEnabled={roundOffEnabled}
        roundOffValue={roundOffValue}
        invoiceNumber={formData.invoiceNumber}
        invoiceDate={formData.invoiceDate}
        companyId={companyId}
        formType={mode === "purchases" ? "purchase" : "sales"}
        handleDueDateToggle={handleDueDateToggle}
        handleCreditDaysChange={handleCreditDaysChange}
        handleDueDateChange={handleDueDateChange}
        handleBankAccountChange={handleBankAccountChange}
      />

      {/* Custom Styles */}
      <style>{`
        /* Button hover effects */
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(${currentConfig.primaryRgb}, 0.4) !important;
        }

        .btn-success:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(16, 185, 129, 0.4) !important;
        }

        .btn-outline-info:hover {
          background-color: rgba(23, 162, 184, 0.1) !important;
          transform: translateY(-1px);
        }

        .btn-outline-secondary:hover {
          background-color: rgba(108, 117, 125, 0.1) !important;
          transform: translateY(-1px);
        }

        .btn-outline-primary:hover {
          background-color: rgba(${currentConfig.primaryRgb}, 0.1) !important;
          border-color: ${currentConfig.primaryColor} !important;
          color: ${currentConfig.primaryColor} !important;
        }

        .btn-outline-danger:hover {
          background-color: rgba(239, 68, 68, 0.1) !important;
          border-color: ${purpleTheme.error} !important;
          color: ${purpleTheme.error} !important;
        }

        /* Table hover effects */
        .table-hover tbody tr:hover {
          background-color: rgba(${currentConfig.primaryRgb}, 0.05) !important;
        }

        /* Card hover effects */
        .card {
          transition: all 0.2s ease;
        }

        .card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12) !important;
        }

        /* Loading states */
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .btn:disabled:hover {
          transform: none !important;
          box-shadow: none !important;
        }

        /* Focus states */
        .btn:focus {
          box-shadow: 0 0 0 0.2rem rgba(${currentConfig.primaryRgb}, 0.25) !important;
        }

        /* Switch styling */
        .form-check-input:checked {
          background-color: ${currentConfig.primaryColor} !important;
          border-color: ${currentConfig.primaryColor} !important;
        }

        .form-check-input:focus {
          border-color: ${currentConfig.primaryColor} !important;
          box-shadow: 0 0 0 0.25rem rgba(${currentConfig.primaryRgb}, 0.25) !important;
        }

        /* Modal styling */
        .modal-content {
          border-radius: 16px !important;
          border: none !important;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15) !important;
        }

        /* Form control focus */
        .form-control:focus,
        .form-select:focus {
          border-color: ${currentConfig.primaryColor} !important;
          box-shadow: 0 0 0 0.25rem rgba(${currentConfig.primaryRgb}, 0.25) !important;
        }

        /* Comprehensive Mobile-First Responsive Styles */
        
        /* Mobile Devices (up to 575px) */
        @media (max-width: 575.98px) {
          .responsive-header {
            padding: 16px 12px !important;
          }
          
          .header-icon {
            width: 40px !important;
            height: 40px !important;
          }
          
          .header-title {
            font-size: 16px !important;
          }
          
          .header-subtitle {
            font-size: 11px !important;
          }
          
          .header-badge {
            font-size: 9px !important;
            padding: 2px 6px !important;
          }
          
          .header-total {
            font-size: 13px !important;
          }
          
          .header-add-btn {
            padding: 8px 12px !important;
            font-size: 12px !important;
          }
          
          .responsive-tabs .responsive-tab {
            padding: 12px 16px !important;
            font-size: 13px !important;
            min-height: 50px !important;
          }
          
          .tab-icon {
            font-size: 12px !important;
          }
          
          .responsive-items-table {
            min-width: 600px !important;
            font-size: 11px !important;
          }
          
          .responsive-payment-btn {
            min-height: 80px !important;
            font-size: 12px !important;
          }
          
          .payment-icon {
            font-size: 16px !important;
          }
          
          .payment-text {
            font-size: 11px !important;
          }
          
          .payment-amount {
            font-size: 10px !important;
          }
          
          .responsive-modal-body {
            padding: 12px 16px !important;
          }
          
          .responsive-non-bill-form {
            padding: 16px !important;
          }
          
          .card-body {
            padding: 12px !important;
          }
          
          .d-grid.gap-2 {
            gap: 0.75rem !important;
          }
        }
        
        /* Small Tablets (576px to 767px) */
        @media (min-width: 576px) and (max-width: 767.98px) {
          .responsive-header {
            padding: 18px 16px !important;
          }
          
          .header-title {
            font-size: 17px !important;
          }
          
          .responsive-tabs .responsive-tab {
            padding: 14px 18px !important;
            font-size: 14px !important;
            min-height: 55px !important;
          }
          
          .responsive-items-table {
            min-width: 700px !important;
            font-size: 12px !important;
          }
          
          .responsive-payment-btn {
            min-height: 90px !important;
          }
          
          .responsive-modal-body {
            padding: 14px 18px !important;
          }
          
          .responsive-non-bill-form {
            padding: 18px !important;
          }
        }
        
        /* Large Tablets (768px to 991px) */
        @media (min-width: 768px) and (max-width: 991.98px) {
          .responsive-items-table {
            min-width: 750px !important;
          }
          
          .card-body {
            padding: 18px !important;
          }
        }
        
        /* General Mobile Optimizations */
        @media (max-width: 767.98px) {
          /* Touch-friendly buttons */
          .btn {
            min-height: 44px !important;
            padding: 10px 16px !important;
            font-size: 14px !important;
            border-radius: 8px !important;
          }
          
          .btn-sm {
            min-height: 36px !important;
            padding: 8px 12px !important;
            font-size: 12px !important;
          }
          
          /* Form controls */
          .form-control, .form-select {
            min-height: 44px !important;
            font-size: 14px !important;
            padding: 10px 14px !important;
          }
          
          .form-label {
            font-size: 13px !important;
            margin-bottom: 6px !important;
          }
          
          /* Cards */
          .card {
            border-radius: 12px !important;
          }
          
          .card-header {
            padding: 12px 16px !important;
          }
          
          /* Modals */
          .modal-dialog {
            margin: 0.5rem !important;
          }
          
          .modal-content {
            border-radius: 12px !important;
          }
          
          .modal-header {
            padding: 12px 16px !important;
          }
          
          .modal-title {
            font-size: 16px !important;
          }
          
          .modal-footer {
            padding: 12px 16px !important;
            gap: 8px !important;
          }
          
          /* Tables */
          .table-responsive {
            border-radius: 8px !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
          }
          
          .table th, .table td {
            padding: 8px 6px !important;
            font-size: 11px !important;
            line-height: 1.3 !important;
          }
          
          /* Badges */
          .badge {
            font-size: 9px !important;
            padding: 2px 6px !important;
          }
          
          /* Input groups */
          .input-group-text {
            min-height: 44px !important;
            font-size: 14px !important;
            padding: 10px 12px !important;
          }
        }
        
        /* Landscape phone adjustments */
        @media (max-width: 767.98px) and (orientation: landscape) {
          .responsive-header {
            padding: 12px 16px !important;
          }
          
          .responsive-tabs .responsive-tab {
            min-height: 45px !important;
            padding: 10px 16px !important;
          }
          
          .responsive-payment-btn {
            min-height: 70px !important;
          }
        }
        
        /* Extra optimizations for very small screens */
        @media (max-width: 320px) {
          .container-fluid {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }
          
          .responsive-header {
            padding: 12px 8px !important;
          }
          
          .header-title {
            font-size: 14px !important;
          }
          
          .responsive-tabs .responsive-tab {
            padding: 10px 12px !important;
            font-size: 12px !important;
          }
          
          .tab-text {
            display: none !important;
          }
          
          .responsive-items-table {
            min-width: 500px !important;
          }
        }

        /* Animation for cards - optimized for mobile */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .card {
          animation: fadeInUp 0.3s ease-out;
        }
        
        /* Mobile-specific utilities */
        @media (max-width: 767.98px) {
          .mobile-hide {
            display: none !important;
          }
          
          .mobile-stack {
            flex-direction: column !important;
          }
          
          .mobile-center {
            text-align: center !important;
          }
          
          .mobile-full-width {
            width: 100% !important;
          }
          
          /* Improved touch targets */
          .btn, .form-control, .form-select {
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }
          
          /* Prevent zoom on input focus */
          .form-control, .form-select {
            font-size: 16px !important;
          }
          
          /* Better scroll behavior */
          .table-responsive {
            -webkit-overflow-scrolling: touch;
          }
        }

        /* Spinner animation */
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .fa-spin {
          animation: spin 1s linear infinite;
        }

        /* Custom scrollbar for dropdown */
        .position-absolute::-webkit-scrollbar {
          width: 6px;
        }

        .position-absolute::-webkit-scrollbar-track {
          background: ${purpleTheme.background};
        }

        .position-absolute::-webkit-scrollbar-thumb {
          background: ${purpleTheme.border};
          border-radius: 3px;
        }

        .position-absolute::-webkit-scrollbar-thumb:hover {
          background: ${purpleTheme.borderDark};
        }
      `}</style>

              </Tab.Pane>
              
              <Tab.Pane eventKey="non-bill">
                <div style={{ padding: '24px' }}>
                  {/* Non-Bill Header */}
                  <div className="text-center mb-4">
                    <div className="d-inline-flex align-items-center justify-content-center mb-3"
                         style={{
                           width: '80px',
                           height: '80px',
                           background: purpleTheme.gradient,
                           borderRadius: '50%',
                           color: 'white'
                         }}>
                      <FontAwesomeIcon icon={faReceipt} size="2x" />
                    </div>
                    <h4 style={{ color: purpleTheme.text, fontWeight: '700' }}>Purchase Without Bill</h4>
                    <p style={{ color: purpleTheme.textMuted, maxWidth: '500px', margin: '0 auto' }}>
                      Record purchases made without formal bills or receipts (e.g., buying from individuals, small vendors, etc.)
                    </p>
                  </div>

                  {/* Non-Bill Form */}
                  <Card style={{ 
                    border: `2px solid ${purpleTheme.border}`,
                    borderRadius: '16px',
                    boxShadow: purpleTheme.shadow
                  }}>
                    <Card.Body className="responsive-non-bill-form" style={{ padding: '20px' }}>
                      <Row className="g-3">
                        {/* Item Description */}
                        <Col xs={12} md={6} className="mb-3">
                          <Form.Group>
                            <Form.Label className="fw-bold" style={{ color: purpleTheme.text }}>
                              <FontAwesomeIcon icon={faBox} className="me-2" style={{ color: purpleTheme.primary }} />
                              Item Description *
                            </Form.Label>
                            <Form.Control
                              type="text"
                              value={nonBillData.itemDescription}
                              onChange={(e) => setNonBillData(prev => ({ ...prev, itemDescription: e.target.value }))}
                              placeholder="Enter item description (e.g., Laptop, Mobile Phone, etc.)"
                              style={getInputStyle('itemDescription')}
                            />
                          </Form.Group>
                        </Col>

                        {/* Purchase Date */}
                        <Col xs={12} md={6} className="mb-3">
                          <Form.Group>
                            <Form.Label className="fw-bold" style={{ color: purpleTheme.text }}>
                              <FontAwesomeIcon icon={faCalendarAlt} className="me-2" style={{ color: purpleTheme.primary }} />
                              Purchase Date *
                            </Form.Label>
                            <Form.Control
                              type="date"
                              value={nonBillData.purchaseDate}
                              onChange={(e) => setNonBillData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                              style={getInputStyle('purchaseDate')}
                            />
                          </Form.Group>
                        </Col>

                        {/* Vendor/Seller Name */}
                        <Col xs={12} md={6} className="mb-3">
                          <Form.Group>
                            <Form.Label className="fw-bold" style={{ color: purpleTheme.text }}>
                              <FontAwesomeIcon icon={faUser} className="me-2" style={{ color: purpleTheme.primary }} />
                              Vendor/Seller Name *
                            </Form.Label>
                            <Form.Control
                              type="text"
                              value={nonBillData.vendorName}
                              onChange={(e) => setNonBillData(prev => ({ ...prev, vendorName: e.target.value }))}
                              placeholder="Enter vendor or seller name"
                              style={getInputStyle('vendorName')}
                            />
                          </Form.Group>
                        </Col>

                        {/* Category */}
                        <Col xs={12} md={6} className="mb-3">
                          <Form.Group>
                            <Form.Label className="fw-bold" style={{ color: purpleTheme.text }}>
                              <FontAwesomeIcon icon={faClipboardList} className="me-2" style={{ color: purpleTheme.primary }} />
                              Category
                            </Form.Label>
                            <Form.Select
                              value={nonBillData.category}
                              onChange={(e) => setNonBillData(prev => ({ ...prev, category: e.target.value }))}
                              style={getInputStyle('category')}
                            >
                              <option value="">Select category</option>
                              <option value="Electronics">Electronics</option>
                              <option value="Furniture">Furniture</option>
                              <option value="Stationery">Stationery</option>
                              <option value="Equipment">Equipment</option>
                              <option value="Supplies">Supplies</option>
                              <option value="Services">Services</option>
                              <option value="Other">Other</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>

                        {/* Quantity */}
                        <Col xs={6} sm={4} className="mb-3">
                          <Form.Group>
                            <Form.Label className="fw-bold" style={{ color: purpleTheme.text, fontSize: "13px" }}>
                              <FontAwesomeIcon icon={faBoxOpen} className="me-2" style={{ color: purpleTheme.primary }} />
                              Quantity *
                            </Form.Label>
                            <Form.Control
                              type="number"
                              min="1"
                              step="1"
                              value={nonBillData.quantity}
                              onChange={(e) => {
                                const qty = e.target.value;
                                const unitPrice = parseFloat(nonBillData.unitPrice) || 0;
                                setNonBillData(prev => ({ 
                                  ...prev, 
                                  quantity: qty,
                                  amount: qty && unitPrice ? (parseFloat(qty) * unitPrice).toFixed(2) : prev.amount
                                }));
                              }}
                              placeholder="1"
                              style={{...getInputStyle('quantity'), height: "44px", fontSize: "14px"}}
                            />
                          </Form.Group>
                        </Col>

                        {/* Unit Price */}
                        <Col xs={6} sm={4} className="mb-3">
                          <Form.Group>
                            <Form.Label className="fw-bold" style={{ color: purpleTheme.text, fontSize: "13px" }}>
                              <FontAwesomeIcon icon={faRupeeSign} className="me-2" style={{ color: purpleTheme.primary }} />
                              Unit Price *
                            </Form.Label>
                            <Form.Control
                              type="number"
                              min="0"
                              step="0.01"
                              value={nonBillData.unitPrice}
                              onChange={(e) => {
                                const price = e.target.value;
                                const qty = parseFloat(nonBillData.quantity) || 0;
                                setNonBillData(prev => ({ 
                                  ...prev, 
                                  unitPrice: price,
                                  amount: price && qty ? (parseFloat(price) * qty).toFixed(2) : prev.amount
                                }));
                              }}
                              placeholder="0.00"
                              style={{...getInputStyle('unitPrice'), height: "44px", fontSize: "14px"}}
                            />
                          </Form.Group>
                        </Col>

                        {/* Total Amount */}
                        <Col xs={12} sm={4} className="mb-3">
                          <Form.Group>
                            <Form.Label className="fw-bold" style={{ color: purpleTheme.text }}>
                              <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" style={{ color: purpleTheme.success }} />
                              Total Amount *
                            </Form.Label>
                            <Form.Control
                              type="number"
                              min="0"
                              step="0.01"
                              value={nonBillData.amount}
                              onChange={(e) => setNonBillData(prev => ({ ...prev, amount: e.target.value }))}
                              placeholder="0.00"
                              style={{
                                ...getInputStyle('amount'),
                                backgroundColor: `${purpleTheme.success}10`,
                                borderColor: purpleTheme.success,
                                fontWeight: '600'
                              }}
                            />
                          </Form.Group>
                        </Col>

                        {/* Notes */}
                        <Col xs={12} className="mb-3">
                          <Form.Group>
                            <Form.Label className="fw-bold" style={{ color: purpleTheme.text }}>
                              <FontAwesomeIcon icon={faEdit} className="me-2" style={{ color: purpleTheme.primary }} />
                              Additional Notes
                            </Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              value={nonBillData.notes}
                              onChange={(e) => setNonBillData(prev => ({ ...prev, notes: e.target.value }))}
                              placeholder="Any additional information about this purchase..."
                              style={{
                                ...getInputStyle('notes'),
                                minHeight: '80px',
                                resize: 'vertical'
                              }}
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      {/* Action Buttons */}
                      <div className="d-flex flex-column flex-sm-row justify-content-end gap-2 gap-sm-3 mt-4 pt-3"
                           style={{ borderTop: `2px solid ${purpleTheme.border}` }}>
                          <Button
                            variant="outline-info"
                            onClick={async () => {
                              try {
                                const result = await salesService.getNonBillSummary(companyId);
                                if (result.success) {
                                  addToast(`Total Non-bill Items: ${result.data.totalItems} | Total Value: ₹${result.data.totalAmount.toFixed(2)}`, 'info');
                                }
                              } catch (error) {
                                console.error('Error fetching non-bill summary:', error);
                              }
                            }}
                            style={{
                              ...getButtonStyle('outline'),
                              borderColor: purpleTheme.primary,
                              color: purpleTheme.primary
                            }}
                          >
                            <FontAwesomeIcon icon={faFileContract} className="me-2" />
                            View All Non-Bills
                          </Button>
                          
                          <Button
                            variant="outline-secondary"
                            onClick={() => {
                              setNonBillData({
                                itemDescription: '',
                                purchaseDate: '',
                                vendorName: '',
                                amount: '',
                                quantity: '',
                                unitPrice: '',
                                notes: '',
                                category: ''
                              });
                            }}
                            style={{
                              ...getButtonStyle('outline'),
                              borderColor: purpleTheme.textMuted,
                              color: purpleTheme.textMuted
                            }}
                          >
                            <FontAwesomeIcon icon={faTimes} className="me-2" />
                            Clear Form
                          </Button>                        <Button
                          onClick={() => {
                            // Handle non-bill form submission
                            if (nonBillData.itemDescription && nonBillData.vendorName && nonBillData.amount) {
                              // Create a structured non-bill entry similar to regular items
                              const nonBillEntry = {
                                id: Date.now(), // Simple ID generation
                                type: 'non-bill',
                                itemName: nonBillData.itemDescription,
                                vendorName: nonBillData.vendorName,
                                purchaseDate: nonBillData.purchaseDate,
                                category: nonBillData.category,
                                quantity: parseFloat(nonBillData.quantity) || 1,
                                pricePerUnit: parseFloat(nonBillData.unitPrice) || 0,
                                amount: parseFloat(nonBillData.amount) || 0,
                                notes: nonBillData.notes,
                                createdAt: new Date().toISOString()
                              };
                              
                              // Add to form data through parent component
                              const currentNonBillItems = formData.nonBillItems || [];
                              onFormDataChange('nonBillItems', [...currentNonBillItems, nonBillEntry]);
                              
                              // Clear form after successful save
                              setNonBillData({
                                itemDescription: '',
                                purchaseDate: '',
                                vendorName: '',
                                amount: '',
                                quantity: '',
                                unitPrice: '',
                                notes: '',
                                category: ''
                              });
                              
                              addToast(`Non-bill purchase "${nonBillData.itemDescription}" recorded successfully! ₹${nonBillData.amount}`, 'success');
                            } else {
                              addToast('Please fill in all required fields', 'error');
                            }
                          }}
                          disabled={
                            !nonBillData.itemDescription || 
                            !nonBillData.vendorName || 
                            !nonBillData.amount ||
                            !nonBillData.purchaseDate ||
                            !nonBillData.quantity ||
                            !nonBillData.unitPrice
                          }
                          style={getButtonStyle('success')}
                        >
                          <FontAwesomeIcon icon={faSave} className="me-2" />
                          Save Non-Bill Purchase
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>

                  {/* Display saved non-bill items */}
                  {formData.nonBillItems && formData.nonBillItems.length > 0 && (
                    <Card className="mt-4" style={{ 
                      border: `2px solid ${purpleTheme.success}`,
                      borderRadius: '16px',
                      boxShadow: purpleTheme.shadow
                    }}>
                      <Card.Header style={{
                        background: `linear-gradient(135deg, ${purpleTheme.success} 0%, #34d399 100%)`,
                        color: 'white',
                        padding: '20px 24px',
                        borderRadius: '14px 14px 0 0'
                      }}>
                        <h5 className="mb-0 fw-bold">
                          <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                          Saved Non-Bill Purchases ({formData.nonBillItems.length})
                        </h5>
                      </Card.Header>
                      <Card.Body className="p-0">
                        <div className="table-responsive">
                          <Table hover className="mb-0">
                            <thead style={{ backgroundColor: purpleTheme.background }}>
                              <tr>
                                <th style={{ padding: '16px', fontWeight: '600', color: purpleTheme.text, fontSize: '13px' }}>#</th>
                                <th style={{ padding: '16px', fontWeight: '600', color: purpleTheme.text, fontSize: '13px' }}>ITEM</th>
                                <th style={{ padding: '16px', fontWeight: '600', color: purpleTheme.text, fontSize: '13px' }}>VENDOR</th>
                                <th style={{ padding: '16px', fontWeight: '600', color: purpleTheme.text, fontSize: '13px' }}>DATE</th>
                                <th style={{ padding: '16px', fontWeight: '600', color: purpleTheme.text, fontSize: '13px' }}>QTY</th>
                                <th style={{ padding: '16px', fontWeight: '600', color: purpleTheme.text, fontSize: '13px' }}>RATE</th>
                                <th style={{ padding: '16px', fontWeight: '600', color: purpleTheme.text, fontSize: '13px' }}>AMOUNT</th>
                                <th style={{ padding: '16px', fontWeight: '600', color: purpleTheme.text, fontSize: '13px' }}>ACTIONS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {formData.nonBillItems.map((item, index) => (
                                <tr key={item.id}>
                                  <td style={{ padding: '16px', color: purpleTheme.textMuted, fontSize: '14px' }}>
                                    {index + 1}
                                  </td>
                                  <td style={{ padding: '16px' }}>
                                    <div>
                                      <div style={{ fontWeight: '600', color: purpleTheme.text, fontSize: '14px' }}>
                                        {item.itemName}
                                      </div>
                                      {item.category && (
                                        <Badge style={{ 
                                          backgroundColor: purpleTheme.primary, 
                                          fontSize: '10px',
                                          marginTop: '4px'
                                        }}>
                                          {item.category}
                                        </Badge>
                                      )}
                                    </div>
                                  </td>
                                  <td style={{ padding: '16px', color: purpleTheme.text, fontSize: '14px' }}>
                                    {item.vendorName}
                                  </td>
                                  <td style={{ padding: '16px', color: purpleTheme.textMuted, fontSize: '13px' }}>
                                    {new Date(item.purchaseDate).toLocaleDateString('en-IN')}
                                  </td>
                                  <td style={{ padding: '16px', color: purpleTheme.text, fontSize: '14px' }}>
                                    {item.quantity}
                                  </td>
                                  <td style={{ padding: '16px', color: purpleTheme.text, fontSize: '14px' }}>
                                    ₹{item.pricePerUnit.toFixed(2)}
                                  </td>
                                  <td style={{ padding: '16px' }}>
                                    <span style={{ 
                                      fontWeight: '700', 
                                      color: purpleTheme.success,
                                      fontSize: '14px'
                                    }}>
                                      ₹{item.amount.toFixed(2)}
                                    </span>
                                  </td>
                                  <td style={{ padding: '16px' }}>
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => {
                                        const updatedItems = formData.nonBillItems.filter(i => i.id !== item.id);
                                        onFormDataChange('nonBillItems', updatedItems);
                                        addToast('Non-bill item removed', 'success');
                                      }}
                                      style={{
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        padding: '6px 12px'
                                      }}
                                    >
                                      <FontAwesomeIcon icon={faTrash} />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                        
                        {/* Total Summary */}
                        <div style={{
                          padding: '20px 24px',
                          backgroundColor: purpleTheme.background,
                          borderTop: `2px solid ${purpleTheme.border}`
                        }}>
                          <div className="d-flex justify-content-between align-items-center">
                            <span style={{ fontWeight: '600', color: purpleTheme.text }}>
                              Total Non-Bill Purchases:
                            </span>
                            <span style={{ 
                              fontWeight: '700', 
                              color: purpleTheme.success,
                              fontSize: '18px'
                            }}>
                              ₹{formData.nonBillItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  )}
                </div>
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Card.Body>
      </Card>

    </Container>
  );
}

export default SalesInvoiceFormSection;
