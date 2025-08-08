import {useState, useEffect, useRef, useCallback, useMemo} from "react";
import itemsTableLogic from "./itemsTableLogic";
import itemService from "../../../../../../services/itemService";
import bankAccountService from "../../../../../../services/bankAccountService";
import paymentService from "../../../../../../services/paymentService";
import transactionService from "../../../../../../services/transactionService";
import salesService from "../../../../../../services/salesService";
import purchaseService from "../../../../../../services/purchaseService";

// ===== CUSTOM HOOKS =====
// Items management hook with enhanced field compatibility
export const useItemsManagement = (
  items,
  onItemsChange,
  gstEnabled,
  globalTaxMode
) => {
  const [localItems, setLocalItems] = useState([]);
  const [totals, setTotals] = useState({});

  // Initialize items with proper tax mode and priceIncludesTax
  useEffect(() => {
    if (items.length === 0) {
      const emptyItem = itemsTableLogic.createEmptyItem();
      emptyItem.taxMode = globalTaxMode;
      emptyItem.priceIncludesTax = globalTaxMode === "with-tax";
      setLocalItems([emptyItem]);
    } else {
      const updatedItems = items.map((item, index) => {
        let itemTaxMode = item.taxMode || globalTaxMode;
        let itemPriceIncludesTax;

        if (item.priceIncludesTax !== undefined) {
          itemPriceIncludesTax = item.priceIncludesTax;
          itemTaxMode = item.priceIncludesTax ? "with-tax" : "without-tax";
        } else {
          itemPriceIncludesTax = itemTaxMode === "with-tax";
        }

        const updatedItem = {
          ...item,
          taxMode: itemTaxMode,
          priceIncludesTax: itemPriceIncludesTax,
        };

        return updatedItem;
      });
      setLocalItems(updatedItems);
    }
  }, [items, globalTaxMode]);

  const calculateItemTotals = useCallback(
    (item, index, allItems, changedField = null) => {
      return itemsTableLogic.calculateItemTotals(
        item,
        index,
        allItems,
        changedField,
        gstEnabled,
        globalTaxMode
      );
    },
    [gstEnabled, globalTaxMode]
  );

  const updateTotals = useCallback(
    (newItems) => {
      const calculated = itemsTableLogic.calculateTotals(newItems, gstEnabled);
      setTotals(calculated);
      return calculated;
    },
    [gstEnabled]
  );

  // Enhanced item change handler to sync both fields
  const handleItemChange = (index, field, value) => {
    const newItems = [...localItems];
    newItems[index] = {...newItems[index], [field]: value};

    if (field === "taxMode") {
      newItems[index].priceIncludesTax = value === "with-tax";
    } else if (field === "priceIncludesTax") {
      newItems[index].taxMode = value ? "with-tax" : "without-tax";
    }

    const updatedItem = calculateItemTotals(
      newItems[index],
      index,
      newItems,
      field
    );
    newItems[index] = updatedItem;

    setLocalItems(newItems);
    updateTotals(newItems);
    onItemsChange(newItems);
  };

  const addRow = () => {
    const newItem = itemsTableLogic.createEmptyItem();
    newItem.taxMode = globalTaxMode;
    newItem.priceIncludesTax = globalTaxMode === "with-tax";

    const newItems = [...localItems, newItem];
    setLocalItems(newItems);
    updateTotals(newItems);
    onItemsChange(newItems);
  };

  const deleteRow = (index) => {
    if (localItems.length <= 1) return;

    const newItems = localItems.filter((_, i) => i !== index);
    setLocalItems(newItems);
    updateTotals(newItems);
    onItemsChange(newItems);
  };

  return {
    localItems,
    setLocalItems,
    totals,
    handleItemChange,
    addRow,
    deleteRow,
    updateTotals,
    calculateItemTotals,
  };
};

// Hook for managing search functionality
export const useItemSearch = (companyId) => {
  const [itemSearches, setItemSearches] = useState({});
  const [itemSuggestions, setItemSuggestions] = useState({});
  const [showItemSuggestions, setShowItemSuggestions] = useState({});
  const [searchNotFound, setSearchNotFound] = useState({});
  const [searchLoading, setSearchLoading] = useState({});
  const searchTimeouts = useRef({});

  const handleItemSearch = async (rowIndex, query) => {
    setItemSearches((prev) => ({...prev, [rowIndex]: query}));

    if (searchTimeouts.current[rowIndex]) {
      clearTimeout(searchTimeouts.current[rowIndex]);
    }

    searchTimeouts.current[rowIndex] = setTimeout(() => {
      itemsTableLogic.searchItemsLogic(
        itemService,
        companyId,
        query,
        rowIndex,
        {
          setItemSuggestions,
          setShowItemSuggestions,
          setSearchNotFound,
          setSearchLoading,
        }
      );
    }, 300);
  };

  const handleItemSuggestionSelect = (
    rowIndex,
    item,
    localItems,
    calculateItemTotals,
    onItemsChange,
    setLocalItems,
    updateTotals
  ) => {
    itemsTableLogic.handleItemSuggestionSelection(
      rowIndex,
      item,
      localItems,
      calculateItemTotals,
      {
        onItemsChange: (newItems) => {
          setLocalItems(newItems);
          updateTotals(newItems);
          onItemsChange(newItems);
        },
        setItemSearches,
        setShowItemSuggestions,
        setSearchNotFound,
        setSearchLoading,
      }
    );
  };

  return {
    itemSearches,
    itemSuggestions,
    showItemSuggestions,
    searchNotFound,
    searchLoading,
    handleItemSearch,
    handleItemSuggestionSelect,
  };
};

// Hook for managing round-off calculations
export const useRoundOff = (totals, gstEnabled) => {
  const [roundOffEnabled, setRoundOffEnabled] = useState(false);

  const roundOffCalculation = useMemo(() => {
    return itemsTableLogic.calculateFinalTotalWithRoundOff(
      totals,
      gstEnabled,
      roundOffEnabled
    );
  }, [totals, gstEnabled, roundOffEnabled]);

  const roundOffDisplayInfo = useMemo(() => {
    return itemsTableLogic.getRoundOffDisplayInfo(
      roundOffCalculation,
      gstEnabled
    );
  }, [roundOffCalculation, gstEnabled]);

  const finalTotalWithRoundOff = roundOffCalculation.finalTotal;
  const roundOffValue = roundOffCalculation.roundOffValue;

  return {
    roundOffEnabled,
    setRoundOffEnabled,
    roundOffCalculation,
    roundOffDisplayInfo,
    finalTotalWithRoundOff,
    roundOffValue,
  };
};

// ENHANCED: Hook for managing bank accounts with improved loading and error handling
export const useBankAccounts = (companyId) => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loadingBankAccounts, setLoadingBankAccounts] = useState(false);

  const loadBankAccounts = async () => {
    if (!companyId) {
      setBankAccounts([]);
      return;
    }

    try {
      setLoadingBankAccounts(true);

      let response;
      let accounts = [];

      // Try multiple service methods with better error handling
      try {
        // Method 1: Try getBankAccountsByCompany (most common)
        response = await bankAccountService.getBankAccountsByCompany(companyId);

        if (response?.success && response.data) {
          accounts = response.data;
        } else if (response?.banks) {
          accounts = response.banks;
        } else {
          throw new Error("No data in response");
        }
      } catch (firstError) {
        try {
          // Method 2: Try getBankAccounts with parameters
          response = await bankAccountService.getBankAccounts(companyId, {
            active: true,
            limit: 100,
            sortBy: "accountName",
            sortOrder: "asc",
          });

          if (response?.success && response.data) {
            accounts =
              response.data.banks ||
              response.data.bankAccounts ||
              response.data ||
              [];
          } else if (response?.banks) {
            accounts = response.banks;
          } else {
            throw new Error("No data in response");
          }
        } catch (secondError) {
          try {
            // Method 3: Try getAllBankAccounts
            response = await bankAccountService.getAllBankAccounts(companyId);

            if (response?.success && response.data) {
              accounts =
                response.data.banks ||
                response.data.bankAccounts ||
                response.data ||
                [];
            } else if (response?.banks) {
              accounts = response.banks;
            } else {
              throw new Error("No data in response");
            }
          } catch (thirdError) {
            try {
              // Method 4: Try basic getBankAccounts
              response = await bankAccountService.getBankAccounts(companyId);

              if (response?.success && response.data) {
                accounts =
                  response.data.banks ||
                  response.data.bankAccounts ||
                  response.data ||
                  [];
              } else if (response?.banks) {
                accounts = response.banks;
              } else if (Array.isArray(response)) {
                accounts = response;
              } else {
                throw new Error("No data in response");
              }
            } catch (fourthError) {
              try {
                // Method 5: Direct API call as final fallback
                const apiUrl =
                  import.meta.env.VITE_API_URL || "http://localhost:5000/api";
                const token =
                  localStorage.getItem("token") ||
                  localStorage.getItem("authToken");

                if (!token) {
                  throw new Error("No authentication token found");
                }

                const directResponse = await fetch(
                  `${apiUrl}/companies/${companyId}/bank-accounts`,
                  {
                    method: "GET",
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                  }
                );

                if (!directResponse.ok) {
                  throw new Error(
                    `HTTP ${directResponse.status}: ${directResponse.statusText}`
                  );
                }

                const data = await directResponse.json();
                accounts = data.banks || data.data?.banks || data.data || [];
              } catch (fifthError) {
                console.error(
                  "All methods failed. Final error:",
                  fifthError.message
                );
                console.error("Error details:", {
                  companyId,
                  firstError: firstError.message,
                  secondError: secondError.message,
                  thirdError: thirdError.message,
                  fourthError: fourthError.message,
                  fifthError: fifthError.message,
                });
                accounts = [];
              }
            }
          }
        }
      }

      // Format and validate accounts
      if (Array.isArray(accounts) && accounts.length > 0) {
        const formattedAccounts = accounts
          .filter((account) => {
            // Filter out invalid or inactive accounts
            const isValidAccount =
              account &&
              (account._id || account.id) &&
              (account.accountName || account.name) &&
              account.isActive !== false &&
              account.status !== "inactive" &&
              account.status !== "deleted";

            return isValidAccount;
          })
          .map((account) => {
            // Comprehensive account formatting
            const formattedAccount = {
              _id: account._id || account.id,
              id: account._id || account.id,
              accountName:
                account.accountName ||
                account.name ||
                account.bankAccountName ||
                "Unknown Account",
              name:
                account.accountName ||
                account.name ||
                account.bankAccountName ||
                "Unknown Account",
              bankName: account.bankName || account.bank || "Unknown Bank",
              accountNumber:
                account.accountNumber ||
                account.accountNo ||
                account.number ||
                "N/A",
              ifscCode: account.ifscCode || account.ifsc || account.IFSC || "",
              branchName:
                account.branchName ||
                account.branch ||
                account.branchAddress ||
                "",
              type: account.type || account.accountType || "savings",
              currentBalance: parseFloat(
                account.currentBalance || account.balance || 0
              ),
              balance: parseFloat(
                account.currentBalance || account.balance || 0
              ),
              isActive:
                account.isActive !== false && account.status !== "inactive",
              status: account.status || "active",

              // Multiple display name formats for better compatibility
              displayName: `${
                account.accountName || account.name || "Unknown"
              } - ${account.bankName || account.bank || "Unknown Bank"} (${
                account.accountNumber || account.accountNo || "N/A"
              }) - ₹${(
                account.currentBalance ||
                account.balance ||
                0
              ).toLocaleString("en-IN")}`,

              shortDisplayName: `${
                account.accountName || account.name || "Unknown"
              } - ${account.bankName || account.bank || "Unknown Bank"}`,

              fullDisplayName: `${
                account.accountName || account.name || "Unknown"
              } - ${account.bankName || account.bank || "Unknown Bank"} (${
                account.accountNumber || account.accountNo || "N/A"
              }) - ${
                account.ifscCode || account.ifsc || "No IFSC"
              } - Balance: ₹${(
                account.currentBalance ||
                account.balance ||
                0
              ).toLocaleString("en-IN")}`,

              // Additional metadata for better handling
              createdAt: account.createdAt,
              updatedAt: account.updatedAt,
              companyId: account.companyId || companyId,

              // Payment method compatibility
              isDefaultAccount: account.isDefault || account.default || false,
              currency: account.currency || "INR",

              // Raw data for debugging
              originalData: account,
            };

            return formattedAccount;
          })
          .sort((a, b) => {
            // Sort by: Default first, then by account name
            if (a.isDefaultAccount && !b.isDefaultAccount) return -1;
            if (!a.isDefaultAccount && b.isDefaultAccount) return 1;
            return (a.accountName || a.name || "").localeCompare(
              b.accountName || b.name || ""
            );
          });

        setBankAccounts(formattedAccounts);
      } else {
        setBankAccounts([]);
      }
    } catch (error) {
      console.error("❌ Error loading bank accounts:", error);
      console.error("❌ Error details:", {
        message: error.message,
        status: error.status,
        response: error.response?.data,
        companyId: companyId,
        stack: error.stack,
      });

      setBankAccounts([]);

      // User-friendly error logging with suggestions
      if (
        error.message?.includes("401") ||
        error.message?.includes("Authentication")
      ) {
        // Authentication error - user may need to login again
      } else if (
        error.message?.includes("403") ||
        error.message?.includes("Access denied")
      ) {
        // Permission error - user may not have access to bank accounts
      } else if (error.message?.includes("404")) {
        // Bank accounts endpoint not found - may need to create bank accounts first
      } else if (
        error.message?.includes("Network") ||
        error.message?.includes("fetch")
      ) {
        // Network error - check internet connection
      } else if (error.message?.includes("timeout")) {
        // Request timeout - server may be slow
      } else {
        // Unknown error - may be a server issue
      }
    } finally {
      setLoadingBankAccounts(false);
    }
  };

  // Retry mechanism with exponential backoff
  const retryLoadBankAccounts = async (retryCount = 0) => {
    const maxRetries = 3;
    const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Max 5 second delay

    if (retryCount > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      await loadBankAccounts();

      if (bankAccounts.length === 0 && retryCount < maxRetries - 1) {
        return retryLoadBankAccounts(retryCount + 1);
      }
    } catch (error) {
      if (retryCount < maxRetries - 1) {
        return retryLoadBankAccounts(retryCount + 1);
      } else {
        console.error("All retry attempts failed");
        throw error;
      }
    }
  };

  // Get bank account by ID with validation
  const getBankAccountById = (accountId) => {
    if (!accountId) return null;

    const account = bankAccounts.find(
      (acc) => acc._id === accountId || acc.id === accountId
    );

    if (!account) {
      console.warn("Bank account not found:", accountId);
    }

    return account;
  };

  // Validate bank account selection
  const validateBankAccountSelection = (accountId, paymentType) => {
    if (["Cash", "UPI"].includes(paymentType)) {
      return {
        valid: true,
        message: "No bank account required for this payment type",
      };
    }

    if (!accountId) {
      return {
        valid: false,
        message: `Please select a bank account for ${paymentType} payment`,
      };
    }

    const account = getBankAccountById(accountId);
    if (!account) {
      return {
        valid: false,
        message:
          "Selected bank account not found. Please refresh and try again.",
      };
    }

    if (!account.isActive) {
      return {
        valid: false,
        message:
          "Selected bank account is inactive. Please choose another account.",
      };
    }

    return {
      valid: true,
      account: account,
      message: "Bank account validation successful",
    };
  };

  // Load bank accounts when companyId changes
  useEffect(() => {
    if (companyId) {
      loadBankAccounts();
    } else {
      setBankAccounts([]);
    }
  }, [companyId]);

  // Debug information with state tracking
  useEffect(() => {
    // This effect can be used for debugging if needed
  }, [bankAccounts, loadingBankAccounts, companyId]);

  return {
    bankAccounts,
    setBankAccounts,
    loadingBankAccounts,
    loadBankAccounts,
    retryLoadBankAccounts,
    getBankAccountById,
    validateBankAccountSelection,
  };
};

// Hook for managing party selection and validation
export const usePartySelection = (
  selectedCustomer,
  selectedSupplier,
  formType,
  addToast
) => {
  const getSelectedParty = useCallback(() => {
    const hasValidSupplier = !!(
      selectedSupplier &&
      selectedSupplier !== null &&
      selectedSupplier !== undefined &&
      typeof selectedSupplier === "object" &&
      Object.keys(selectedSupplier).length > 0 &&
      (selectedSupplier._id || selectedSupplier.id) &&
      (selectedSupplier.name ||
        selectedSupplier.businessName ||
        selectedSupplier.companyName ||
        selectedSupplier.supplierName)
    );

    const hasValidCustomer = !!(
      selectedCustomer &&
      selectedCustomer !== null &&
      selectedCustomer !== undefined &&
      typeof selectedCustomer === "object" &&
      Object.keys(selectedCustomer).length > 0 &&
      (selectedCustomer._id || selectedCustomer.id) &&
      (selectedCustomer.name ||
        selectedCustomer.businessName ||
        selectedCustomer.companyName ||
        selectedCustomer.customerName)
    );

    if (hasValidSupplier && hasValidCustomer) {
      return {
        type: "both",
        supplier: selectedSupplier,
        customer: selectedCustomer,
        primary: formType === "purchase" ? selectedSupplier : selectedCustomer,
        secondary:
          formType === "purchase" ? selectedCustomer : selectedSupplier,
      };
    }

    if (formType === "purchase") {
      if (hasValidSupplier) {
        return {type: "supplier", party: selectedSupplier};
      } else if (hasValidCustomer) {
        return {type: "customer", party: selectedCustomer};
      }
    } else {
      if (hasValidCustomer) {
        return {type: "customer", party: selectedCustomer};
      } else if (hasValidSupplier) {
        return {type: "supplier", party: selectedSupplier};
      }
    }
    return null;
  }, [selectedCustomer, selectedSupplier, formType]);

  const getPartyType = useCallback(() => {
    const result = getSelectedParty();
    if (!result) return null;

    if (result.type === "both") {
      return formType === "purchase" ? "supplier" : "customer";
    }

    return result.type;
  }, [getSelectedParty, formType]);

  const getPartyName = useCallback(() => {
    const result = getSelectedParty();

    if (!result) return null;

    let party;
    if (result.type === "both") {
      party = result.primary;
    } else {
      party = result.party;
    }

    const possibleNames = [
      party?.name,
      party?.businessName,
      party?.companyName,
      party?.customerName,
      party?.supplierName,
      party?.displayName,
      party?.fullName,
      party?.partyName,
    ];

    const foundName = possibleNames.find(
      (name) => name && typeof name === "string" && name.trim()
    );

    return foundName || null;
  }, [getSelectedParty]);

  const getPartyId = useCallback(() => {
    const result = getSelectedParty();

    if (!result) return null;

    let party;
    if (result.type === "both") {
      party = result.primary;
    } else {
      party = result.party;
    }

    const possibleIds = [
      party?._id,
      party?.id,
      party?.partyId,
      party?.supplierId,
      party?.customerId,
    ];

    const foundId = possibleIds.find(
      (id) => id && (typeof id === "string" || typeof id === "number")
    );

    return foundId || null;
  }, [getSelectedParty]);

  const getSecondaryParty = useCallback(() => {
    const result = getSelectedParty();

    if (!result || result.type !== "both") return null;

    return result.secondary;
  }, [getSelectedParty]);

  const getSecondaryPartyName = useCallback(() => {
    const secondary = getSecondaryParty();
    if (!secondary) return null;

    const possibleNames = [
      secondary?.name,
      secondary?.businessName,
      secondary?.companyName,
      secondary?.customerName,
      secondary?.supplierName,
      secondary?.displayName,
      secondary?.fullName,
      secondary?.partyName,
    ];

    return (
      possibleNames.find(
        (name) => name && typeof name === "string" && name.trim()
      ) || null
    );
  }, [getSecondaryParty]);

  const getSecondaryPartyType = useCallback(() => {
    const result = getSelectedParty();

    if (!result || result.type !== "both") return null;

    return formType === "purchase" ? "customer" : "supplier";
  }, [getSelectedParty, formType]);

  const validatePaymentRequirements = useCallback(
    (hasValidItems, finalTotalWithRoundOff) => {
      if (!hasValidItems || finalTotalWithRoundOff <= 0) {
        const message = `Please add items with valid costs to the ${formType} before processing payment.`;
        addToast?.(message, "warning");
        return {valid: false, message};
      }

      const result = getSelectedParty();
      const partyType = getPartyType();
      const partyName = getPartyName();
      const partyId = getPartyId();

      if (!result) {
        let message = `Please select a ${
          formType === "purchase"
            ? "supplier or customer"
            : "customer or supplier"
        } before processing payment.`;

        if (selectedSupplier === null && selectedCustomer === null) {
          message +=
            "\n\nTip: Use the party selection dropdown above to choose a party.";
        } else if (
          selectedSupplier &&
          typeof selectedSupplier === "object" &&
          Object.keys(selectedSupplier).length === 0
        ) {
          message +=
            "\n\nIssue: Selected supplier appears to be empty. Please reselect.";
        } else if (
          selectedCustomer &&
          typeof selectedCustomer === "object" &&
          Object.keys(selectedCustomer).length === 0
        ) {
          message +=
            "\n\nIssue: Selected customer appears to be empty. Please reselect.";
        }

        addToast?.(message, "warning");
        return {valid: false, message};
      }

      if (!partyId) {
        const message = `Selected ${partyType} is missing required ID. Please reselect the party.`;
        addToast?.(message, "error");
        return {valid: false, message};
      }

      if (!partyName) {
        const message = `Selected ${partyType} is missing name information. Please reselect the party.`;
        addToast?.(message, "error");
        return {valid: false, message};
      }

      return {
        valid: true,
        result: result,
        partyType,
        partyName,
        partyId,
        ...(result.type === "both" && {
          secondaryParty: getSecondaryParty(),
          secondaryPartyType: getSecondaryPartyType(),
          secondaryPartyName: getSecondaryPartyName(),
        }),
      };
    },
    [
      getSelectedParty,
      getPartyType,
      getPartyName,
      getPartyId,
      getSecondaryParty,
      getSecondaryPartyType,
      getSecondaryPartyName,
      formType,
      selectedCustomer,
      selectedSupplier,
      addToast,
    ]
  );

  return {
    getSelectedParty,
    getPartyType,
    getPartyName,
    getPartyId,
    getSecondaryParty,
    getSecondaryPartyName,
    getSecondaryPartyType,
    validatePaymentRequirements,
  };
};

// Hook for invoice save operations with tax mode support
export const useInvoiceSave = (
  localItems,
  totals,
  finalTotalWithRoundOff,
  roundOffEnabled,
  roundOffValue,
  roundOffCalculation,
  paymentData,
  gstEnabled,
  formType,
  companyId,
  invoiceNumber,
  invoiceDate,
  selectedCustomer,
  selectedSupplier,
  onSave,
  addToast,
  getSelectedParty,
  getPartyType,
  getPartyId,
  getPartyName,
  getSecondaryParty,
  getSecondaryPartyType,
  getSecondaryPartyName,
  createTransactionWithInvoice,
  resetPaymentData,
  globalTaxMode,
  bankAccounts
) => {
  const handleSaveWithTransaction = useCallback(async () => {
    try {
      if (!onSave || typeof onSave !== "function") {
        const message =
          "Save function is not available. Please refresh the page and try again.";
        addToast?.(message, "error");
        return {success: false, message};
      }

      const hasValidItems = totals.finalTotal > 0 || totals.subtotal > 0;

      if (!hasValidItems) {
        const message = "Please add items before saving the invoice.";
        addToast?.(message, "warning");
        return {success: false, message};
      }

      if (!totals || typeof totals !== "object") {
        const message =
          "Invoice totals calculation error. Please refresh and try again.";
        addToast?.(message, "error");
        return {success: false, message};
      }

      if (!finalTotalWithRoundOff || finalTotalWithRoundOff <= 0) {
        const message = "Invoice total is invalid. Please check item amounts.";
        addToast?.(message, "error");
        return {success: false, message};
      }

      const result = getSelectedParty();
      if (!result) {
        const message = `Please select a ${
          formType === "purchase"
            ? "supplier or customer"
            : "customer or supplier"
        } before saving the invoice.`;
        addToast?.(message, "warning");
        return {success: false, message};
      }

      const enhancedTotals = {
        ...totals,
        finalTotal: finalTotalWithRoundOff,
        roundOffValue: roundOffValue || 0,
        roundOffEnabled: roundOffEnabled,
      };

      const validItems = localItems
        .filter(
          (item) =>
            item.itemName &&
            (parseFloat(item.quantity) || 0) > 0 &&
            (parseFloat(item.pricePerUnit) || 0) > 0
        )
        .map((item) => ({
          ...item,
          taxMode: item.taxMode || globalTaxMode,
          priceIncludesTax:
            item.priceIncludesTax ?? globalTaxMode === "with-tax",
        }));

      if (validItems.length === 0) {
        const message = "No valid items found. Please check item details.";
        addToast?.(message, "warning");
        return {success: false, message};
      }

      // ENHANCED: Payment info processing with bank account details
      const paymentInfoForSave =
        paymentData.amount > 0
          ? {
              amount: paymentData.amount,
              paymentType: paymentData.paymentType,
              method: paymentData.paymentMethod || "cash",
              paymentMethod: paymentData.paymentMethod || "cash",

              // ADDED: Bank account information
              bankAccountId: paymentData.bankAccountId,
              bankAccount: paymentData.bankAccount,
              bankAccountName: paymentData.bankAccountName,
              bankName: paymentData.bankName,
              accountNumber: paymentData.accountNumber,

              // Party information
              partyName: getPartyName(),
              partyType: getPartyType(),
              partyId: getPartyId(),

              // Payment details
              notes: paymentData.notes || "",
              dueDate: paymentData.hasDueDate ? paymentData.dueDate : null,
              creditDays: paymentData.hasDueDate ? paymentData.creditDays : 0,
              paymentDate: new Date().toISOString(),

              // Transaction references
              reference:
                paymentData.transactionId || paymentData.chequeNumber || "",
              chequeNumber: paymentData.chequeNumber || "",
              chequeDate: paymentData.chequeDate || null,
              transactionId: paymentData.transactionId || "",
              upiTransactionId: paymentData.transactionId || "",
              bankTransactionId: paymentData.transactionId || "",

              // Status and metadata
              status: "pending",
              isPartialPayment: paymentData.isPartialPayment || false,
              remainingAmount: paymentData.remainingAmount || 0,
            }
          : null;

      const invoiceDataForSave = {
        companyId: companyId,
        items: validItems,
        totals: enhancedTotals,

        globalTaxMode: globalTaxMode,
        taxMode: globalTaxMode,
        gstEnabled: gstEnabled,
        priceIncludesTax: globalTaxMode === "with-tax",

        selectedSupplier:
          result.type === "supplier"
            ? result.party
            : result.type === "both"
            ? result.supplier
            : selectedSupplier,
        selectedCustomer:
          result.type === "customer"
            ? result.party
            : result.type === "both"
            ? result.customer
            : selectedCustomer,

        // UPDATED: Enhanced payment information
        paymentInfo: paymentInfoForSave,
        paymentReceived: paymentData.amount || 0,
        bankAccountId: paymentData.bankAccountId || null,
        paymentMethod: paymentData.paymentMethod || "cash",
        dueDate: paymentData.hasDueDate ? paymentData.dueDate : null,
        creditDays: paymentData.hasDueDate ? paymentData.creditDays : 0,

        ...(formType === "purchase"
          ? {
              purchaseNumber: invoiceNumber,
              purchaseDate: invoiceDate,
              purchaseType: gstEnabled ? "gst" : "non-gst",
              supplierName:
                result.type === "supplier"
                  ? getPartyName()
                  : result.type === "both" && result.supplier
                  ? result.supplier.name || result.supplier.businessName
                  : null,
              customerName:
                result.type === "customer"
                  ? getPartyName()
                  : result.type === "both" && result.customer
                  ? result.customer.name || result.customer.businessName
                  : null,
              status: "draft",
              receivingStatus: "pending",
              notes: paymentData.notes || "",
            }
          : {
              saleNumber: invoiceNumber,
              saleDate: invoiceDate,
              saleType: gstEnabled ? "gst" : "non-gst",
              customerName:
                result.type === "customer"
                  ? getPartyName()
                  : result.type === "both" && result.customer
                  ? result.customer.name || result.customer.businessName
                  : null,
              supplierName:
                result.type === "supplier"
                  ? getPartyName()
                  : result.type === "both" && result.supplier
                  ? result.supplier.name || result.supplier.businessName
                  : null,
            }),

        formType: formType,
        roundOffValue: roundOffValue || 0,
        roundOffEnabled: roundOffEnabled,
        roundOff: roundOffValue || 0,
      };

      let invoiceResult;
      try {
        invoiceResult = await onSave(invoiceDataForSave);
      } catch (onSaveError) {
        const errorMessage = `Save operation failed: ${
          onSaveError.message || "Unknown error"
        }`;
        addToast?.(errorMessage, "error");
        return {
          success: false,
          error: onSaveError.message || "Save function error",
          message: errorMessage,
        };
      }

      if (invoiceResult === undefined || invoiceResult === null) {
        const errorMessage = `${
          formType === "purchase" ? "Purchase" : "Sales"
        } save function returned no result. Please try again.`;
        addToast?.(errorMessage, "error");
        return {
          success: false,
          error: "No result from save function",
          message: errorMessage,
        };
      }

      const isSuccessfulResult =
        (invoiceResult && invoiceResult.success === true) ||
        (invoiceResult &&
          invoiceResult.data &&
          invoiceResult.success !== false) ||
        (invoiceResult &&
          typeof invoiceResult === "object" &&
          invoiceResult !== null &&
          Object.keys(invoiceResult).length > 0 &&
          !invoiceResult.error &&
          !invoiceResult.failed &&
          invoiceResult.success !== false) ||
        (invoiceResult &&
          (invoiceResult.purchase ||
            invoiceResult.sale ||
            invoiceResult.invoice ||
            invoiceResult._id ||
            invoiceResult.id));

      if (isSuccessfulResult) {
        const invoiceData = invoiceResult?.data ||
          invoiceResult?.purchase ||
          invoiceResult?.sale ||
          invoiceResult || {
            invoiceNumber: invoiceNumber,
            total: finalTotalWithRoundOff,
            items: validItems,
            createdAt: new Date().toISOString(),
          };

        if (paymentData.amount > 0) {
          if (
            createTransactionWithInvoice &&
            typeof createTransactionWithInvoice === "function"
          ) {
            try {
              const transactionResult = await createTransactionWithInvoice(
                invoiceData
              );

              if (transactionResult && transactionResult.success) {
                addToast?.(
                  `${
                    formType === "purchase" ? "Purchase" : "Sales"
                  } invoice and payment created successfully!`,
                  "success"
                );
                resetPaymentData();
                return {
                  success: true,
                  data: invoiceData,
                  totals: enhancedTotals,
                  paymentRecorded: true,
                  invoiceCreated: true,
                  transactionCreated: true,
                  message: `${
                    formType === "purchase" ? "Purchase" : "Sales"
                  } invoice and payment created successfully`,
                };
              } else {
                addToast?.(
                  `${
                    formType === "purchase" ? "Purchase" : "Sales"
                  } invoice created successfully. Payment may need verification.`,
                  "warning"
                );
                return {
                  success: true,
                  data: invoiceData,
                  totals: enhancedTotals,
                  paymentRecorded: false,
                  invoiceCreated: true,
                  transactionCreated: false,
                  message: `${
                    formType === "purchase" ? "Purchase" : "Sales"
                  } invoice created, payment needs verification`,
                };
              }
            } catch (transactionError) {
              addToast?.(
                `${
                  formType === "purchase" ? "Purchase" : "Sales"
                } invoice created successfully! Payment recording failed: ${
                  transactionError.message
                }`,
                "warning"
              );
              return {
                success: true,
                data: invoiceData,
                totals: enhancedTotals,
                paymentRecorded: false,
                invoiceCreated: true,
                transactionCreated: false,
                transactionError: transactionError.message,
                message: `${
                  formType === "purchase" ? "Purchase" : "Sales"
                } invoice created, payment recording failed`,
              };
            }
          } else {
            addToast?.(
              `${
                formType === "purchase" ? "Purchase" : "Sales"
              } invoice created successfully! Payment will need to be recorded separately.`,
              "info"
            );
            return {
              success: true,
              data: invoiceData,
              totals: enhancedTotals,
              paymentRecorded: false,
              invoiceCreated: true,
              transactionCreated: false,
              message: `${
                formType === "purchase" ? "Purchase" : "Sales"
              } invoice created, payment to be recorded separately`,
            };
          }
        } else {
          addToast?.(
            `${
              formType === "purchase" ? "Purchase" : "Sales"
            } invoice created successfully!`,
            "success"
          );
          return {
            success: true,
            data: invoiceData,
            totals: enhancedTotals,
            paymentRecorded: false,
            invoiceCreated: true,
            transactionCreated: false,
            message: `${
              formType === "purchase" ? "Purchase" : "Sales"
            } invoice created successfully`,
          };
        }
      } else {
        let errorMessage =
          invoiceResult?.message ||
          invoiceResult?.error ||
          `${
            formType === "purchase" ? "Purchase" : "Sales"
          } invoice creation failed`;

        if (invoiceResult?.validationErrors) {
          const validationMessages = invoiceResult.validationErrors
            .map((err) => err.message || err)
            .join(", ");
          errorMessage += ` - Validation errors: ${validationMessages}`;
        }

        addToast?.(errorMessage, "error");

        return {
          success: false,
          error: errorMessage,
          totals: totals,
          debugInfo: {
            receivedResult: invoiceResult,
            hasValidItems: hasValidItems,
            finalTotal: finalTotalWithRoundOff,
            itemCount: localItems.length,
            formType: formType,
          },
        };
      }
    } catch (error) {
      let errorMessage = `Failed to save ${
        formType === "purchase" ? "purchase" : "sales"
      } invoice`;

      if (error.message) {
        errorMessage += `: ${error.message}`;
      }

      addToast?.(errorMessage, "error");

      return {
        success: false,
        error: error.message || "Unknown error",
        totals: totals,
        debugInfo: {
          hasValidItems: totals.finalTotal > 0 || totals.subtotal > 0,
          finalTotal: finalTotalWithRoundOff,
          itemCount: localItems.length,
          formType: formType,
          errorType: error.constructor.name,
          stack: error.stack,
        },
      };
    }
  }, [
    localItems,
    totals,
    finalTotalWithRoundOff,
    roundOffEnabled,
    roundOffValue,
    roundOffCalculation,
    paymentData,
    gstEnabled,
    formType,
    companyId,
    invoiceNumber,
    invoiceDate,
    selectedCustomer,
    selectedSupplier,
    onSave,
    addToast,
    getSelectedParty,
    getPartyType,
    getPartyId,
    getPartyName,
    getSecondaryParty,
    getSecondaryPartyType,
    getSecondaryPartyName,
    createTransactionWithInvoice,
    resetPaymentData,
    globalTaxMode,
    bankAccounts,
  ]);

  return {
    handleSaveWithTransaction,
  };
};

// ENHANCED: Hook for managing payment with improved bank account handling
export const usePaymentManagement = (
  formType,
  companyId,
  finalTotalWithRoundOff,
  selectedCustomer,
  selectedSupplier,
  invoiceNumber,
  userId,
  currentConfig,
  bankAccounts
) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    partyId: "",
    partyName: "",
    partyType: formType === "sales" ? "customer" : "supplier",
    paymentType: "Cash",
    amount: 0,
    bankAccountId: "",
    paymentMethod: "cash",
    notes: "",
    isPartialPayment: false,
    nextPaymentDate: "",
    nextPaymentAmount: 0,
    transactionId: "",
    chequeNumber: "",
    chequeDate: "",
    bankName: "",
    previousPayments: [],
    totalPaid: 0,
    remainingAmount: 0,
    dueDate: "",
    creditDays: 0,
    hasDueDate: false,
    // NEW: Bank account details
    bankAccount: null,
    bankAccountName: "",
    accountNumber: "",
  });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Load payment history
  const loadPaymentHistory = async (partyId) => {
    if (!partyId) return;

    try {
      setLoadingPaymentHistory(true);

      const response = await paymentService.getPaymentHistory({
        companyId,
        partyId,
        invoiceNumber,
        formType,
      });

      if (response && response.success) {
        const history = response.data || [];
        setPaymentHistory(history);

        const totalPaid = history.reduce(
          (sum, payment) => sum + (payment.amount || 0),
          0
        );
        const remainingAmount = Math.max(0, finalTotalWithRoundOff - totalPaid);

        setPaymentData((prev) => ({
          ...prev,
          previousPayments: history,
          totalPaid,
          remainingAmount,
          isPartialPayment: remainingAmount > 0 && totalPaid > 0,
          amount:
            remainingAmount > 0 ? remainingAmount : finalTotalWithRoundOff,
        }));
      } else {
        setPaymentHistory([]);
      }
    } catch (error) {
      console.error("Error loading payment history:", error);
      setPaymentHistory([]);
    } finally {
      setLoadingPaymentHistory(false);
    }
  };

  // Auto-select customer/supplier when modal opens
  useEffect(() => {
    if (showPaymentModal) {
      const selectedParty =
        formType === "sales" ? selectedCustomer : selectedSupplier;

      if (selectedParty) {
        const partyId = selectedParty._id || selectedParty.id;
        const partyName =
          selectedParty.name ||
          selectedParty.businessName ||
          selectedParty.companyName ||
          "Unknown";

        setPaymentData((prev) => ({
          ...prev,
          partyId: partyId || "",
          partyName: partyName,
          partyType: formType === "sales" ? "customer" : "supplier",
          amount: Math.max(0, finalTotalWithRoundOff),
          remainingAmount: Math.max(0, finalTotalWithRoundOff),
          totalPaid: 0,
          isPartialPayment: false,
          dueDate: "",
          creditDays: 0,
          hasDueDate: false,
        }));

        if (partyId && loadPaymentHistory) {
          loadPaymentHistory(partyId);
        }
      }
    }
  }, [
    showPaymentModal,
    selectedCustomer,
    selectedSupplier,
    formType,
    finalTotalWithRoundOff,
  ]);

  const handlePaymentAmountChange = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    const remaining = Math.max(
      0,
      finalTotalWithRoundOff - numAmount - paymentData.totalPaid
    );
    const isPartial = numAmount > 0 && remaining > 0;

    setPaymentData((prev) => ({
      ...prev,
      amount: numAmount,
      remainingAmount: remaining,
      isPartialPayment: isPartial,
      nextPaymentAmount: isPartial ? remaining : 0,
    }));
  };

  const handlePaymentTypeChange = (type) => {
    const paymentMethodMap = {
      Cash: "cash",
      "Bank Account": "bank_transfer",
      UPI: "upi",
      Cheque: "cheque",
      Online: "online_transfer",
      NEFT: "neft",
      RTGS: "rtgs",
      Card: "card",
    };

    setPaymentData((prev) => ({
      ...prev,
      paymentType: type,
      paymentMethod: paymentMethodMap[type] || "cash",
      bankAccountId: ["Cash", "UPI"].includes(type) ? "" : prev.bankAccountId,
      chequeNumber: type === "Cheque" ? prev.chequeNumber : "",
      chequeDate: type === "Cheque" ? prev.chequeDate : "",
      bankName: type === "Cheque" ? prev.bankName : "",
      transactionId: ["UPI", "Online", "NEFT", "RTGS"].includes(type)
        ? prev.transactionId
        : "",
      // Clear bank account details if payment type doesn't require them
      bankAccount: ["Cash", "UPI"].includes(type) ? null : prev.bankAccount,
      bankAccountName: ["Cash", "UPI"].includes(type)
        ? ""
        : prev.bankAccountName,
      accountNumber: ["Cash", "UPI"].includes(type) ? "" : prev.accountNumber,
    }));
  };

  // Payment submission handler with proper bank account handling
  const handlePaymentSubmit = async (paymentSubmitData) => {
    try {
      setSubmittingPayment(true);

      // Validation
      if (!paymentData.amount || paymentData.amount <= 0) {
        throw new Error("Please enter a valid payment amount");
      }

      if (
        !["Cash", "UPI"].includes(paymentData.paymentType) &&
        !paymentData.bankAccountId
      ) {
        throw new Error("Please select a bank account for this payment method");
      }

      if (paymentData.amount > finalTotalWithRoundOff) {
        throw new Error("Payment amount cannot exceed invoice total");
      }

      if (!paymentData.partyId) {
        throw new Error("Please select a customer/supplier");
      }

      // Method-specific validation
      if (paymentData.paymentType === "Cheque") {
        if (!paymentData.chequeNumber?.trim()) {
          throw new Error("Please enter a valid cheque number");
        }
        if (!paymentData.chequeDate) {
          throw new Error("Please select the cheque date");
        }
      }

      if (paymentData.hasDueDate) {
        if (paymentData.creditDays > 0 && paymentData.dueDate) {
          throw new Error(
            "Please specify either credit days OR due date, not both"
          );
        }
        if (paymentData.creditDays <= 0 && !paymentData.dueDate) {
          throw new Error("Please specify either credit days or due date");
        }
      }

      // Bank account validation and details
      let selectedBankAccount = null;
      if (
        paymentData.bankAccountId &&
        bankAccounts &&
        bankAccounts.length > 0
      ) {
        selectedBankAccount = bankAccounts.find(
          (account) =>
            account._id === paymentData.bankAccountId ||
            account.id === paymentData.bankAccountId
        );

        if (!selectedBankAccount) {
          console.error(
            "Selected bank account not found:",
            paymentData.bankAccountId
          );
          throw new Error(
            "Selected bank account not found. Please refresh and try again."
          );
        }
      } else if (paymentData.bankAccountId) {
        console.warn("Bank account ID provided but no bank accounts available");
        throw new Error(
          "Bank accounts not loaded. Please refresh and try again."
        );
      }

      // Close modal first
      setShowPaymentModal(false);

      // Payment data with comprehensive bank account details
      const enhancedPaymentData = {
        ...paymentData,
        dueDate: paymentData.hasDueDate ? paymentData.dueDate : null,
        creditDays: paymentData.hasDueDate ? paymentData.creditDays : 0,

        // Complete bank account details
        bankAccount: selectedBankAccount,
        bankAccountId:
          selectedBankAccount?._id ||
          selectedBankAccount?.id ||
          paymentData.bankAccountId,
        bankAccountName:
          selectedBankAccount?.accountName ||
          selectedBankAccount?.name ||
          paymentData.bankAccountName,
        bankName: selectedBankAccount?.bankName || paymentData.bankName,
        accountNumber:
          selectedBankAccount?.accountNumber || paymentData.accountNumber,
        ifscCode: selectedBankAccount?.ifscCode,
        branchName:
          selectedBankAccount?.branchName || selectedBankAccount?.branch,
        accountType:
          selectedBankAccount?.type || selectedBankAccount?.accountType,
        currentBalance: selectedBankAccount?.currentBalance || 0,

        // Ensure payment method consistency
        paymentMethod: paymentData.paymentMethod || "cash",

        // Transaction metadata
        invoiceNumber: invoiceNumber,
        companyId: companyId,
        formType: formType,
        createdAt: new Date().toISOString(),

        // Enhanced transaction references
        transactionReference:
          paymentData.transactionId ||
          paymentData.chequeNumber ||
          `${formType}-${invoiceNumber}-${Date.now()}`,

        // Payment processing info
        processingStatus: "completed",
        verificationStatus:
          paymentData.paymentType === "Cheque" ? "pending" : "verified",
      };

      return {
        success: true,
        message: "Payment details saved successfully",
        paymentData: enhancedPaymentData,
      };
    } catch (error) {
      console.error("❌ Payment submission error:", error);
      throw error;
    } finally {
      setSubmittingPayment(false);
    }
  };

  const createTransactionWithInvoice = async (invoiceData) => {
    try {
      if (!paymentData.amount || paymentData.amount <= 0) {
        return {success: true, message: "No payment to process"};
      }

      // Handle cash payments properly
      const isCashPayment =
        paymentData.paymentType === "Cash" ||
        paymentData.paymentMethod === "cash";
      const requiresBankAccount =
        !["Cash", "UPI"].includes(paymentData.paymentType) &&
        !["cash", "upi"].includes(paymentData.paymentMethod);

      // Only require bank account for non-cash payments
      if (requiresBankAccount && !paymentData.bankAccountId) {
        throw new Error(
          `Please select a bank account for ${paymentData.paymentType} payments`
        );
      }

      const transactionPayload = {
        // Only include bank account ID for non-cash payments
        ...(requiresBankAccount &&
          paymentData.bankAccountId && {
            bankAccountId: paymentData.bankAccountId,
          }),

        // Core transaction data
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        paymentType: paymentData.paymentType,

        description: `${formType === "sales" ? "Payment from" : "Payment to"} ${
          paymentData.partyName
        } for ${formType === "purchase" ? "purchase" : "sales"} invoice ${
          invoiceData.invoiceNumber ||
          invoiceData.saleNumber ||
          invoiceData.purchaseNumber ||
          invoiceNumber
        }`,

        notes:
          paymentData.notes ||
          `Payment for ${formType} invoice ${
            invoiceData.invoiceNumber ||
            invoiceData.saleNumber ||
            invoiceData.purchaseNumber ||
            invoiceNumber
          }`,

        // Party information
        partyId: paymentData.partyId,
        partyName: paymentData.partyName,
        partyType: formType === "sales" ? "customer" : "supplier",

        // Reference information
        referenceId: invoiceData._id || invoiceData.id,
        referenceType: formType === "sales" ? "sale" : "purchase",
        referenceNumber:
          invoiceData.invoiceNumber ||
          invoiceData.saleNumber ||
          invoiceData.purchaseNumber ||
          invoiceNumber,

        // Payment method specific details
        ...(paymentData.chequeNumber && {
          chequeNumber: paymentData.chequeNumber,
          chequeDate: paymentData.chequeDate,
        }),

        ...(paymentData.transactionId && {
          upiTransactionId: paymentData.transactionId,
          bankTransactionId: paymentData.transactionId,
          transactionReference: paymentData.transactionId,
        }),

        // Use cheque number as reference if no transaction ID
        ...(!paymentData.transactionId &&
          paymentData.chequeNumber && {
            transactionReference: paymentData.chequeNumber,
          }),

        // Payment terms
        dueDate: paymentData.hasDueDate ? paymentData.dueDate : null,
        creditDays: paymentData.hasDueDate ? paymentData.creditDays : 0,

        // Bank account details (only for non-cash payments)
        ...(requiresBankAccount &&
          paymentData.bankAccountId && {
            bankAccountName: paymentData.bankAccountName,
            bankName: paymentData.bankName,
            accountNumber: paymentData.accountNumber,
            ifscCode: paymentData.ifscCode,
            branchName: paymentData.branchName,
          }),

        // Transaction metadata
        transactionDate: new Date().toISOString(),
        status: "completed",
        companyId: companyId,
        createdBy: userId || "system",
        invoiceNumber: invoiceNumber,
        formType: formType,

        // Cash payment specific fields
        ...(isCashPayment && {
          cashPayment: true,
          cashReceived: paymentData.amount,
          cashTransactionType: formType === "sales" ? "cash_in" : "cash_out",
        }),
      };

      let transactionResponse;

      try {
        if (formType === "sales") {
          transactionResponse =
            await transactionService.createPaymentInTransaction(
              companyId,
              transactionPayload
            );
        } else if (formType === "purchase") {
          transactionResponse =
            await transactionService.createPaymentOutTransaction(
              companyId,
              transactionPayload
            );
        } else {
          throw new Error(`Unknown form type: ${formType}`);
        }
      } catch (serviceError) {
        console.error("Transaction service error:", serviceError);

        // Better error handling for cash payments
        let errorMessage = serviceError.message || "Transaction service failed";

        if (
          errorMessage.includes("Bank account ID is required") &&
          isCashPayment
        ) {
          errorMessage =
            "Cash payment processing failed. This may be a system configuration issue.";
          console.error(
            "CASH PAYMENT ERROR: Backend is requiring bank account for cash payment"
          );
          console.error("Payment Data:", paymentData);
          console.error("Transaction Payload:", transactionPayload);
        }

        throw new Error(errorMessage);
      }

      if (transactionResponse && transactionResponse.success) {
        resetPaymentData();

        return {
          success: true,
          data: transactionResponse.data,
          message: "Transaction created successfully",
          transactionId:
            transactionResponse.data?._id ||
            transactionResponse.data?.transactionId,
          bankAccountUsed: requiresBankAccount
            ? paymentData.bankAccountName
            : "Cash",
          paymentMethod: paymentData.paymentMethod,
          isCashPayment: isCashPayment,
        };
      } else {
        console.error(
          "Transaction service returned failure:",
          transactionResponse
        );
        throw new Error(
          transactionResponse?.message || "Transaction service returned failure"
        );
      }
    } catch (error) {
      console.error("❌ Transaction creation error:", error);

      let errorMessage = `Failed to create ${formType} transaction`;

      // Specific error messages
      if (
        error.message?.includes("401") ||
        error.message?.includes("Authentication")
      ) {
        errorMessage = "Authentication failed. Please login again.";
      } else if (
        error.message?.includes("403") ||
        error.message?.includes("Access denied")
      ) {
        errorMessage = "Access denied. Please check your permissions.";
      } else if (
        error.message?.includes("400") ||
        error.message?.includes("validation")
      ) {
        errorMessage =
          "Invalid transaction data. Please check payment details.";
      } else if (error.message?.includes("404")) {
        errorMessage = "Transaction service not found. Please contact support.";
      } else if (
        error.message?.includes("Network") ||
        error.message?.includes("fetch")
      ) {
        errorMessage = "Network error. Please check your connection.";
      } else if (
        error.message?.includes("bank account") &&
        paymentData.paymentType !== "Cash"
      ) {
        errorMessage =
          "Bank account error. Please check selected bank account.";
      } else if (
        error.message?.includes("Bank account ID is required") &&
        paymentData.paymentType === "Cash"
      ) {
        // Special case: Cash payment but backend requires bank account
        errorMessage =
          "Cash payment processing is not properly configured. Please contact system administrator.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  };

  const resetPaymentData = () => {
    setPaymentData({
      partyId: "",
      partyName: "",
      partyType: formType === "sales" ? "customer" : "supplier",
      paymentType: "Cash",
      amount: 0,
      bankAccountId: "",
      paymentMethod: "cash",
      notes: "",
      isPartialPayment: false,
      nextPaymentDate: "",
      nextPaymentAmount: 0,
      transactionId: "",
      chequeNumber: "",
      chequeDate: "",
      bankName: "",
      previousPayments: [],
      totalPaid: 0,
      remainingAmount: 0,
      dueDate: "",
      creditDays: 0,
      hasDueDate: false,
      bankAccount: null,
      bankAccountName: "",
      accountNumber: "",
    });
    setPaymentHistory([]);
  };

  const handleDueDateToggle = (enabled) => {
    setPaymentData((prev) => ({
      ...prev,
      hasDueDate: enabled,
      dueDate: enabled ? prev.dueDate : "",
      creditDays: enabled ? prev.creditDays : 0,
    }));
  };

  const handleCreditDaysChange = (days) => {
    const numDays = parseInt(days) || 0;
    let calculatedDueDate = "";

    if (numDays > 0) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + numDays);
      calculatedDueDate = dueDate.toISOString().split("T")[0];
    }

    setPaymentData((prev) => ({
      ...prev,
      creditDays: numDays,
      dueDate: calculatedDueDate,
    }));
  };

  const handleDueDateChange = (date) => {
    let calculatedCreditDays = 0;

    if (date) {
      const today = new Date();
      const dueDate = new Date(date);
      const timeDiff = dueDate.getTime() - today.getTime();
      calculatedCreditDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    }

    setPaymentData((prev) => ({
      ...prev,
      dueDate: date,
      creditDays: Math.max(0, calculatedCreditDays),
    }));
  };

  // NEW: Handle bank account selection
  const handleBankAccountChange = (bankAccountId) => {
    if (!bankAccountId) {
      setPaymentData((prev) => ({
        ...prev,
        bankAccountId: "",
        bankAccount: null,
        bankAccountName: "",
        bankName: "",
        accountNumber: "",
        ifscCode: "",
        branchName: "",
      }));
      return;
    }

    const selectedAccount = bankAccounts?.find(
      (account) => account._id === bankAccountId || account.id === bankAccountId
    );

    if (selectedAccount) {
      setPaymentData((prev) => ({
        ...prev,
        bankAccountId: bankAccountId,
        bankAccount: selectedAccount,
        bankAccountName: selectedAccount.accountName || selectedAccount.name,
        bankName: selectedAccount.bankName,
        accountNumber: selectedAccount.accountNumber,
        ifscCode: selectedAccount.ifscCode,
        branchName: selectedAccount.branchName || selectedAccount.branch,
      }));
    } else {
      console.warn("⚠️ Selected bank account not found in available accounts");
    }
  };

  return {
    showPaymentModal,
    setShowPaymentModal,
    paymentData,
    setPaymentData,
    paymentHistory,
    loadingPaymentHistory,
    submittingPayment,
    handlePaymentAmountChange,
    handlePaymentTypeChange,
    handlePaymentSubmit,
    createTransactionWithInvoice,
    resetPaymentData,
    handleDueDateToggle,
    handleCreditDaysChange,
    handleDueDateChange,
    handleBankAccountChange,
  };
};

export const useTaxMode = (
  localItems,
  calculateItemTotals,
  onItemsChange,
  setLocalItems,
  updateTotals
) => {
  const [globalTaxMode, setGlobalTaxMode] = useState("without-tax");

  useEffect(() => {
    if (localItems && localItems.length > 0) {
      const hasInconsistentModes = localItems.some(
        (item) =>
          item.itemName && item.taxMode && item.taxMode !== globalTaxMode
      );

      if (hasInconsistentModes) {
        const updatedItems = localItems.map((item, index) => {
          if (item.itemName && item.taxMode !== globalTaxMode) {
            return {
              ...item,
              taxMode: globalTaxMode,
              priceIncludesTax: globalTaxMode === "with-tax",
            };
          }
          return item;
        });

        if (JSON.stringify(updatedItems) !== JSON.stringify(localItems)) {
          setLocalItems && setLocalItems(updatedItems);
          onItemsChange && onItemsChange(updatedItems);
        }
      }
    }
  }, [globalTaxMode, localItems, setLocalItems, onItemsChange]);

  const initializeItemTaxMode = useCallback(
    (item) => {
      return {
        ...item,
        taxMode: item.taxMode || globalTaxMode,
        priceIncludesTax: item.priceIncludesTax ?? globalTaxMode === "with-tax",
      };
    },
    [globalTaxMode]
  );

  const handleGlobalTaxModeChange = useCallback(
    (mode) => {
      setGlobalTaxMode(mode);

      if (!localItems || localItems.length === 0) {
        return mode;
      }

      const updatedItems = localItems.map((item, index) => {
        const updatedItem = {
          ...item,
          taxMode: mode,
          priceIncludesTax: mode === "with-tax",
        };

        if (
          calculateItemTotals &&
          updatedItem.itemName &&
          updatedItem.pricePerUnit > 0
        ) {
          const recalculatedItem = calculateItemTotals(
            updatedItem,
            index,
            localItems,
            "taxMode"
          );
          return recalculatedItem;
        }

        return updatedItem;
      });

      if (setLocalItems) setLocalItems(updatedItems);
      if (updateTotals) updateTotals(updatedItems);
      if (onItemsChange) onItemsChange(updatedItems);

      return mode;
    },
    [
      localItems,
      calculateItemTotals,
      setLocalItems,
      updateTotals,
      onItemsChange,
      globalTaxMode,
    ]
  );

  return {
    globalTaxMode,
    setGlobalTaxMode,
    handleGlobalTaxModeChange,
    initializeItemTaxMode,
  };
};

// Hook for managing overdue sales and due date tracking
export const useOverdueManagement = (companyId) => {
  const [overdueSales, setOverdueSales] = useState([]);
  const [salesDueToday, setSalesDueToday] = useState([]);
  const [overdueLoading, setOverdueLoading] = useState(false);
  const [dueTodayLoading, setDueTodayLoading] = useState(false);

  const loadOverdueSales = async () => {
    if (!companyId) return;

    try {
      setOverdueLoading(true);
      const response = await salesService.getOverdueSales(companyId);

      if (response && response.success) {
        setOverdueSales(response.data || []);
      } else {
        setOverdueSales([]);
      }
    } catch (error) {
      console.error("Error loading overdue sales:", error);
      setOverdueSales([]);
    } finally {
      setOverdueLoading(false);
    }
  };

  const loadSalesDueToday = async () => {
    if (!companyId) return;

    try {
      setDueTodayLoading(true);
      const response = await salesService.getSalesDueToday(companyId);

      if (response && response.success) {
        setSalesDueToday(response.data || []);
      } else {
        setSalesDueToday([]);
      }
    } catch (error) {
      console.error("Error loading sales due today:", error);
      setSalesDueToday([]);
    } finally {
      setDueTodayLoading(false);
    }
  };

  const updateSaleDueDate = async (saleId, dueDate, creditDays) => {
    try {
      const response = await salesService.updatePaymentDueDate(
        saleId,
        dueDate,
        creditDays
      );

      if (response && response.success) {
        await Promise.all([loadOverdueSales(), loadSalesDueToday()]);
        return {success: true, message: "Due date updated successfully"};
      } else {
        throw new Error(response?.message || "Failed to update due date");
      }
    } catch (error) {
      return {success: false, message: error.message};
    }
  };

  const getOverdueSummary = () => {
    const totalOverdue = overdueSales.reduce(
      (sum, sale) => sum + (sale.payment?.pendingAmount || 0),
      0
    );

    const totalDueToday = salesDueToday.reduce(
      (sum, sale) => sum + (sale.payment?.pendingAmount || 0),
      0
    );

    return {
      overdueCount: overdueSales.length,
      dueTodayCount: salesDueToday.length,
      totalOverdueAmount: totalOverdue,
      totalDueTodayAmount: totalDueToday,
      totalPendingAmount: totalOverdue + totalDueToday,
    };
  };

  useEffect(() => {
    if (companyId) {
      loadOverdueSales();
      loadSalesDueToday();
    }
  }, [companyId]);

  return {
    overdueSales,
    salesDueToday,
    overdueLoading,
    dueTodayLoading,
    loadOverdueSales,
    loadSalesDueToday,
    updateSaleDueDate,
    getOverdueSummary,
  };
};

// Hook for payment scheduling and reminders
export const usePaymentScheduling = (companyId) => {
  const [paymentSchedule, setPaymentSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const getPaymentSchedule = async (dateRange = 30) => {
    if (!companyId) return;

    try {
      setScheduleLoading(true);

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + dateRange);

      const response = await salesService.getPaymentSummaryWithOverdue(
        companyId,
        new Date().toISOString().split("T")[0],
        endDate.toISOString().split("T")[0]
      );

      if (response && response.success) {
        setPaymentSchedule(response.data || []);
      } else {
        setPaymentSchedule([]);
      }
    } catch (error) {
      setPaymentSchedule([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  const getUpcomingPayments = (days = 7) => {
    const today = new Date();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    return paymentSchedule.filter((sale) => {
      if (!sale.payment?.dueDate) return false;
      const dueDate = new Date(sale.payment.dueDate);
      return dueDate >= today && dueDate <= targetDate;
    });
  };

  const formatPaymentSchedule = () => {
    const grouped = paymentSchedule.reduce((acc, sale) => {
      const dueDate = sale.payment?.dueDate;
      if (!dueDate) return acc;

      const dateKey = new Date(dueDate).toISOString().split("T")[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(sale);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, sales]) => ({
        date,
        sales,
        totalAmount: sales.reduce(
          (sum, sale) => sum + (sale.payment?.pendingAmount || 0),
          0
        ),
        count: sales.length,
      }));
  };

  useEffect(() => {
    if (companyId) {
      getPaymentSchedule();
    }
  }, [companyId]);

  return {
    paymentSchedule,
    scheduleLoading,
    getPaymentSchedule,
    getUpcomingPayments,
    formatPaymentSchedule,
  };
};
