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

  const currentConfig =
    itemsTableLogic.getFormConfig()[
      isQuotationsMode
        ? "quotation"
        : mode === "purchases"
        ? "purchase"
        : "sales"
    ];

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

  // Constants
  const inputStyle = {
    borderColor: "#000",
    fontSize: "13px",
    padding: "10px 14px",
    height: "42px",
    borderWidth: "2px",
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

  // Calculate temp item total function - Clean, no logs
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

  // Handle temp form change function - Clean, no logs
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

        // ✅ Enhanced bank account handling
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

            // ✅ Add bank info to notes if not already present
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
    bankAccounts, // ✅ Added bankAccounts dependency
    formData.invoiceNumber,
    companyId,
    mode,
    baseHandlePaymentSubmit,
    setShowPaymentModal,
  ]);

  // ✅ UPDATED: Enhanced save invoice with better payment method normalization
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

      // ✅ ENHANCED: Payment method normalization function
      const normalizePaymentMethod = (method) => {
        if (!method) return "cash";

        const methodStr = method.toString().toLowerCase();

        const methodMappings = {
          // Bank transfer variations - ✅ All map to "bank_transfer" for backend
          "bank account": "bank_transfer",
          bank_transfer: "bank_transfer",
          banktransfer: "bank_transfer",
          "bank transfer": "bank_transfer",
          bank: "bank_transfer",
          neft: "bank_transfer",
          rtgs: "bank_transfer",
          imps: "bank_transfer",

          // Other payment methods
          card: "card",
          upi: "upi",
          cash: "cash",
          credit: "credit",
          partial: "partial",
        };

        return methodMappings[methodStr] || "cash";
      };

      // ✅ ENHANCED: Payment data with proper normalization and bank account info
      const enhancedPaymentData =
        paymentData?.amount > 0
          ? (() => {
              const normalizedMethod = normalizePaymentMethod(
                paymentData.paymentMethod
              );

              const payment = {
                ...paymentData,
                amount: parseFloat(paymentData.amount || 0),
                paymentMethod: normalizedMethod, // ✅ Use normalized method
                paymentType: paymentData.paymentType || "Cash", // Keep original display type
                method: normalizedMethod, // ✅ Backend compatibility
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

              // ✅ Enhanced bank account handling
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

                  // ✅ Enhanced bank account metadata
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

      // ✅ ENHANCED: Transaction data with normalized payment method
      const transactionData = enhancedPaymentData
        ? {
            amount: enhancedPaymentData.amount,
            paymentMethod: enhancedPaymentData.paymentMethod, // ✅ Normalized method
            paymentType: enhancedPaymentData.paymentType, // ✅ Display type
            method: enhancedPaymentData.method, // ✅ Backend compatibility
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

      const invoiceDataFromTable = {
        items: mappedItems,
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

      console.log("💾 Saving invoice with normalized payment method:", {
        originalPaymentMethod: paymentData?.paymentMethod,
        normalizedPaymentMethod: enhancedPaymentData?.paymentMethod,
        paymentType: enhancedPaymentData?.paymentType,
        bankAccountId: enhancedPaymentData?.bankAccountId,
        bankAccountDetails: enhancedPaymentData?.bankAccountDetails,
      });

      const result = await onSave(invoiceDataFromTable);

      if (result?.success) {
        const savedAmount =
          result.data?.total ||
          result.data?.amount ||
          result.data?.grandTotal ||
          displayTotal;

        addToast?.(
          `${
            isQuotationsMode ? "Quotation" : "Invoice"
          } saved successfully! Amount: ₹${savedAmount}`,
          "success"
        );

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
    bankAccounts, // ✅ Added bankAccounts dependency
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
    <div
      className="sales-invoice-form-section"
      style={{maxWidth: "1400px", margin: "0 auto"}}
    >
      <div className="mb-4">
        <Row className="align-items-center">
          <Col md={8}>
            {hasValidItems ? (
              <div className="d-flex align-items-center">
                <FontAwesomeIcon
                  icon={currentConfig.formIcon}
                  className="me-2 text-primary"
                  size="lg"
                />
                <div>
                  <h5 className="mb-0 text-dark">
                    <strong>
                      {localItems.filter((item) => item.itemName).length}
                    </strong>{" "}
                    {localItems.filter((item) => item.itemName).length === 1
                      ? "Item"
                      : "Items"}{" "}
                    Added
                  </h5>
                  <small className="text-muted">
                    Ready to{" "}
                    {isQuotationsMode ? "create quotation" : "save invoice"}
                  </small>
                </div>
              </div>
            ) : (
              <div className="d-flex align-items-center text-muted">
                <FontAwesomeIcon icon={faBoxOpen} className="me-2" size="lg" />
                <div>
                  <h5 className="mb-0 text-muted">No Items Added</h5>
                  <small className="text-muted">
                    Click "Add Item" to start building your{" "}
                    {isQuotationsMode ? "quotation" : "invoice"}
                  </small>
                </div>
              </div>
            )}
          </Col>
          <Col md={4} className="text-end">
            <Button
              variant="primary"
              onClick={handleAddProductClick}
              disabled={disabled || isSubmitting || submissionRef.current}
              style={{
                backgroundColor: "#007bff",
                borderColor: "#000",
                fontSize: "14px",
                fontWeight: "bold",
                padding: "8px 16px",
                borderWidth: "2px",
                opacity:
                  disabled || isSubmitting || submissionRef.current ? 0.6 : 1,
              }}
            >
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              Add Item
            </Button>
          </Col>
        </Row>
      </div>

      {hasValidItems && (
        <Card className="mb-4 border-2" style={{borderColor: "#000"}}>
          <Card.Header
            className="bg-light border-bottom-2 d-flex justify-content-between align-items-center"
            style={{borderBottomColor: "#000"}}
          >
            <h5 className="mb-0">
              <FontAwesomeIcon icon={currentConfig.formIcon} className="me-2" />
              Added Items ({localItems.filter((item) => item.itemName).length})
            </h5>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th style={{fontSize: "12px", padding: "10px"}}>#</th>
                    <th style={{fontSize: "12px", padding: "10px"}}>ITEM</th>
                    {formData.gstEnabled && (
                      <th style={{fontSize: "12px", padding: "10px"}}>HSN</th>
                    )}
                    <th style={{fontSize: "12px", padding: "10px"}}>QTY</th>
                    <th style={{fontSize: "12px", padding: "10px"}}>UNIT</th>
                    <th style={{fontSize: "12px", padding: "10px"}}>PRICE</th>
                    <th style={{fontSize: "12px", padding: "10px"}}>
                      DISCOUNT
                    </th>
                    {formData.gstEnabled && (
                      <th style={{fontSize: "12px", padding: "10px"}}>TAX</th>
                    )}
                    <th style={{fontSize: "12px", padding: "10px"}}>AMOUNT</th>
                    <th style={{fontSize: "12px", padding: "10px"}}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {localItems
                    .filter((item) => item.itemName)
                    .map((item, index) => (
                      <tr key={item.id || index}>
                        <td style={{fontSize: "12px", padding: "8px"}}>
                          {index + 1}
                        </td>
                        <td style={{fontSize: "12px", padding: "8px"}}>
                          <div>
                            <strong>{item.itemName}</strong>
                            {item.itemCode && (
                              <Badge
                                bg="secondary"
                                className="ms-1"
                                style={{fontSize: "9px"}}
                              >
                                {item.itemCode}
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <small className="text-muted d-block">
                              {item.description.length > 40
                                ? `${item.description.substring(0, 40)}...`
                                : item.description}
                            </small>
                          )}
                        </td>
                        {formData.gstEnabled && (
                          <td style={{fontSize: "11px", padding: "8px"}}>
                            {item.hsnCode || "N/A"}
                          </td>
                        )}
                        <td style={{fontSize: "12px", padding: "8px"}}>
                          {item.quantity}
                        </td>
                        <td style={{fontSize: "12px", padding: "8px"}}>
                          {item.unit}
                        </td>
                        <td style={{fontSize: "12px", padding: "8px"}}>
                          <div>
                            ₹{parseFloat(item.pricePerUnit || 0).toFixed(2)}
                          </div>
                        </td>
                        <td style={{fontSize: "12px", padding: "8px"}}>
                          {item.discountPercent > 0 && (
                            <span className="text-warning">
                              {item.discountPercent}%
                            </span>
                          )}
                          {item.discountAmount > 0 && (
                            <div className="text-warning">
                              ₹{item.discountAmount.toFixed(2)}
                            </div>
                          )}
                        </td>
                        {formData.gstEnabled && (
                          <td style={{fontSize: "12px", padding: "8px"}}>
                            {item.cgstAmount + item.sgstAmount > 0 ? (
                              <div>
                                <small>C: ₹{item.cgstAmount.toFixed(2)}</small>
                                <br />
                                <small>S: ₹{item.sgstAmount.toFixed(2)}</small>
                              </div>
                            ) : (
                              <Badge bg="secondary" style={{fontSize: "9px"}}>
                                No Tax
                              </Badge>
                            )}
                          </td>
                        )}
                        <td style={{fontSize: "12px", padding: "8px"}}>
                          <strong className="text-success">
                            ₹{(item.amount || 0).toFixed(2)}
                          </strong>
                        </td>
                        <td style={{fontSize: "12px", padding: "8px"}}>
                          <div className="d-flex gap-1">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleEditProduct(index)}
                              disabled={
                                disabled ||
                                isSubmitting ||
                                submissionRef.current
                              }
                              style={{padding: "2px 6px"}}
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
                              style={{padding: "2px 6px"}}
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
                    className="mb-2"
                    size="lg"
                  />
                  <span>
                    {paymentData.amount > 0
                      ? isQuotationsMode
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
                    onClick={handleSaveInvoice}
                    disabled={
                      !hasValidItems ||
                      saving ||
                      isSubmitting ||
                      submissionRef.current ||
                      (!isQuotationsMode && !formData.customer)
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

      {!hasValidItems && (
        <div className="text-center text-muted py-5">
          <FontAwesomeIcon
            icon={faBoxOpen}
            size="3x"
            className="mb-3 opacity-50"
          />
          <h5 className="text-muted">No Items Added Yet</h5>
          <p className="text-muted">
            Click the "Add Item" button above to start adding items to your{" "}
            {isQuotationsMode ? "quotation" : "invoice"}.
          </p>
        </div>
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
                <Form.Label className="fw-bold text-danger">Price *</Form.Label>
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
        companyId={companyId} // ✅ Added companyId prop
        formType={mode === "purchases" ? "purchase" : "sales"}
        handleDueDateToggle={handleDueDateToggle}
        handleCreditDaysChange={handleCreditDaysChange}
        handleDueDateChange={handleDueDateChange}
        handleBankAccountChange={handleBankAccountChange}
      />
    </div>
  );
}

export default SalesInvoiceFormSection;
