import React, {useState, useEffect, useCallback, useMemo, useRef} from "react";
import {Container, Row, Col, Alert, Button} from "react-bootstrap";
import {useParams, useLocation} from "react-router-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPlus, faRefresh} from "@fortawesome/free-solid-svg-icons";

// Import components
import PurchaseBillsHeader from "./PurchaseBill/PurchaseBillsHeader";
import PurchaseBillsFilter from "./PurchaseBill/PurchaseBillsFilter";
import PurchaseBillsSummary from "./PurchaseBill/PurchaseBillsSummary";
import PurchaseBillsTable from "./PurchaseBill/PurchaseBillsTable";

// Import services
import purchaseService from "../../../services/purchaseService";
import itemService from "../../../services/itemService";
import transactionService from "../../../services/transactionService";

// Import styles
import "./PurchaseBills.css";

// Debounce hook for optimizing search
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

function PurchaseBills({
  currentCompany,
  addToast,
  isOnline = true,
  companyId: propCompanyId,
}) {
  const {companyId: urlCompanyId} = useParams();
  const location = useLocation();

  // ✅ ADD REF TO PREVENT INFINITE LOOPS
  const loadedRef = useRef(false);
  const enhancementInProgress = useRef(false);

  // Resolve effective company ID from multiple sources
  const effectiveCompanyId = useMemo(() => {
    return (
      propCompanyId ||
      urlCompanyId ||
      currentCompany?.id ||
      currentCompany?._id ||
      localStorage.getItem("selectedCompanyId") ||
      sessionStorage.getItem("companyId") ||
      localStorage.getItem("companyId")
    );
  }, [propCompanyId, urlCompanyId, currentCompany]);

  // ✅ ENHANCED STATE - Include bank account data loading
  const [dateRange, setDateRange] = useState("This Month");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [endDate, setEndDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  );
  const [selectedFirm, setSelectedFirm] = useState("All Firms");
  const [topSearchTerm, setTopSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [enhancementStats, setEnhancementStats] = useState({
    enhanced: 0,
    total: 0,
    withBankData: 0,
  });

  // Debounced search term for better performance
  const debouncedSearchTerm = useDebounce(topSearchTerm, 300);

  // Data states
  const [purchases, setPurchases] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);

  // Categories for items
  const categories = useMemo(
    () => [
      {
        id: 1,
        name: "Electronics",
        description: "Electronic items and gadgets",
        isActive: true,
      },
      {
        id: 2,
        name: "Furniture",
        description: "Office and home furniture",
        isActive: true,
      },
      {
        id: 3,
        name: "Stationery",
        description: "Office supplies and stationery",
        isActive: true,
      },
      {
        id: 4,
        name: "Services",
        description: "Professional services",
        isActive: true,
      },
      {
        id: 5,
        name: "Hardware",
        description: "Computer hardware components",
        isActive: true,
      },
      {
        id: 6,
        name: "Software",
        description: "Software licenses and subscriptions",
        isActive: true,
      },
      {
        id: 7,
        name: "Accessories",
        description: "Various accessories",
        isActive: true,
      },
      {
        id: 8,
        name: "Tools",
        description: "Professional tools and equipment",
        isActive: true,
      },
    ],
    []
  );

  // Enhanced summary calculation
  const summary = useMemo(() => {
    const totalAmount = purchases.reduce(
      (sum, p) =>
        sum + (parseFloat(p.amount) || parseFloat(p.totalAmount) || 0),
      0
    );
    const totalBalance = purchases.reduce(
      (sum, p) =>
        sum + (parseFloat(p.balance) || parseFloat(p.remainingAmount) || 0),
      0
    );
    const paidAmount = totalAmount - totalBalance;

    // Calculate today's purchases
    const today = new Date().toDateString();
    const todaysPurchases = purchases
      .filter((p) => {
        try {
          const purchaseDate = new Date(
            p.date || p.purchaseDate || p.createdAt
          ).toDateString();
          return purchaseDate === today;
        } catch {
          return false;
        }
      })
      .reduce(
        (sum, p) =>
          sum + (parseFloat(p.amount) || parseFloat(p.totalAmount) || 0),
        0
      );

    const avgPurchaseValue =
      purchases.length > 0 ? totalAmount / purchases.length : 0;
    const growthPercentage = Math.random() * 20 - 10; // Mock growth percentage

    return {
      totalPurchaseAmount: totalAmount,
      paidAmount: paidAmount,
      payableAmount: totalBalance,
      todaysPurchases: todaysPurchases,
      totalBills: purchases.length,
      avgPurchaseValue: avgPurchaseValue,
      growthPercentage: growthPercentage,
      paidBills: purchases.filter((p) => (parseFloat(p.balance) || 0) === 0)
        .length,
      pendingBills: purchases.filter((p) => (parseFloat(p.balance) || 0) > 0)
        .length,
      totalSuppliers: new Set(
        purchases
          .map((p) => p.supplierName || p.supplier?.name || p.partyName)
          .filter((name) => name)
      ).size,
      enhancementStats: enhancementStats,
    };
  }, [purchases, enhancementStats]);

  // Options
  const dateRangeOptions = useMemo(
    () => [
      "Today",
      "Yesterday",
      "This Week",
      "This Month",
      "Last Month",
      "This Quarter",
      "This Year",
      "Custom Range",
    ],
    []
  );

  const firmOptions = useMemo(() => ["All Firms"], []);

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    if (!debouncedSearchTerm) return purchases;

    const searchLower = debouncedSearchTerm.toLowerCase();
    return purchases.filter(
      (purchase) =>
        (purchase.supplierName || purchase.partyName || "")
          .toLowerCase()
          .includes(searchLower) ||
        (purchase.purchaseNumber || purchase.billNo || "")
          .toLowerCase()
          .includes(searchLower) ||
        (purchase.supplierPhone || purchase.partyPhone || "").includes(
          searchLower
        )
    );
  }, [purchases, debouncedSearchTerm]);

  // ✅ FIXED: Load bank accounts - removed from dependencies
  const loadBankAccounts = useCallback(async () => {
    if (!effectiveCompanyId) {
      setBankAccounts([]);
      return;
    }

    try {
      console.log("🏦 Loading bank accounts for company:", effectiveCompanyId);

      const endpoints = [
        `/companies/${effectiveCompanyId}/bank-accounts`,
        `/companies/${effectiveCompanyId}/bank-accounts?active=true`,
        `/companies/${effectiveCompanyId}/accounts`,
        `/bank-accounts?companyId=${effectiveCompanyId}`,
      ];

      let bankAccountData = [];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(
            `${
              import.meta.env.VITE_API_URL || "http://localhost:5000/api"
            }${endpoint}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json",
                "x-company-id": effectiveCompanyId,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();

            if (data.success) {
              bankAccountData =
                data.data?.accounts ||
                data.data?.bankAccounts ||
                data.data ||
                data.accounts ||
                [];
            } else if (Array.isArray(data)) {
              bankAccountData = data;
            }

            if (bankAccountData.length > 0) {
              setBankAccounts(bankAccountData);
              console.log(
                `✅ Loaded ${bankAccountData.length} bank accounts from: ${endpoint}`
              );
              break;
            }
          }
        } catch (endpointError) {
          console.warn(
            `⚠️ Bank account endpoint ${endpoint} failed:`,
            endpointError.message
          );
          continue;
        }
      }

      if (bankAccountData.length === 0) {
        console.warn("⚠️ No bank accounts found from any endpoint");
        setBankAccounts([]);
      }
    } catch (error) {
      console.warn("⚠️ Failed to load bank accounts:", error);
      setBankAccounts([]);
    }
  }, [effectiveCompanyId]); // ✅ ONLY effectiveCompanyId in dependencies

  // ✅ FIXED: Transform purchase data - memoized to prevent recreation
  const enhancePurchaseData = useCallback(
    async (rawPurchases) => {
      if (!Array.isArray(rawPurchases) || rawPurchases.length === 0) {
        return rawPurchases;
      }

      // ✅ PREVENT MULTIPLE SIMULTANEOUS ENHANCEMENTS
      if (enhancementInProgress.current) {
        console.log("⚠️ Enhancement already in progress, skipping...");
        return rawPurchases;
      }

      enhancementInProgress.current = true;

      try {
        console.log(
          "🔄 Enhancing purchase data with bank account information..."
        );

        let enhancedCount = 0;
        let withBankDataCount = 0;

        const enhancedPurchases = await Promise.all(
          rawPurchases.map(async (purchase, index) => {
            try {
              console.log(
                `🔍 Processing purchase ${index + 1}/${rawPurchases.length}: ${
                  purchase.purchaseNumber || purchase._id
                }`
              );

              // ✅ Basic data transformation
              let enhancedPurchase = {
                ...purchase,
                id: purchase._id || purchase.id,
                amount:
                  purchase.amount ||
                  purchase.totalAmount ||
                  purchase.finalTotal ||
                  0,
                supplierName:
                  purchase.supplierName ||
                  purchase.supplier?.name ||
                  purchase.partyName,
                supplierId:
                  purchase.supplierId ||
                  purchase.supplier?._id ||
                  purchase.supplier?.id,
              };

              // ✅ Check if payment method indicates bank transaction
              const paymentMethod =
                transactionService.normalizePaymentMethodForFrontend(
                  purchase.paymentMethod || purchase.payment?.method || "cash"
                );

              console.log(
                `💳 Purchase ${purchase.purchaseNumber} payment method: ${paymentMethod}`
              );

              if (paymentMethod === "bank") {
                console.log(
                  "🔍 Bank payment detected, searching for transaction data..."
                );

                // ✅ Strategy 1: Try to get transaction data for bank account info
                try {
                  const transactionResponse =
                    await transactionService.getPurchaseTransactions(
                      effectiveCompanyId,
                      purchase
                    );

                  if (
                    transactionResponse.success &&
                    transactionResponse.data.transactions.length > 0
                  ) {
                    const transaction =
                      transactionResponse.data.transactions[0];

                    console.log(
                      `✅ Found transaction for purchase ${purchase.purchaseNumber}:`,
                      {
                        transactionId: transaction._id,
                        bankAccountId: transaction.bankAccountId,
                        bankAccountName: transaction.bankAccountName,
                        amount: transaction.amount,
                        strategy: transactionResponse.data.searchStrategy,
                      }
                    );

                    enhancedPurchase = {
                      ...enhancedPurchase,
                      bankAccountId: transaction.bankAccountId,
                      bankAccountName:
                        transaction.bankAccountName || transaction.accountName,
                      bankName: transaction.bankName,
                      accountNumber:
                        transaction.accountNumber || transaction.accountNo,
                      ifscCode: transaction.ifscCode,
                      branchName: transaction.branchName,
                      paymentTransactionId: transaction._id || transaction.id,
                      transactionDate:
                        transaction.transactionDate || transaction.createdAt,
                      transactionStatus: transaction.status,
                      hasTransactionData: true,
                      enhancementStrategy: "transaction-found",
                    };

                    withBankDataCount++;
                  } else {
                    console.log(
                      `⚠️ No transaction found for purchase ${purchase.purchaseNumber}`
                    );

                    // ✅ Strategy 2: Fallback to first available bank account
                    if (bankAccounts.length > 0) {
                      const defaultAccount =
                        bankAccounts.find(
                          (acc) =>
                            acc.isActive !== false &&
                            (acc.type === "bank" ||
                              !acc.type ||
                              acc.accountType === "bank")
                        ) || bankAccounts[0];

                      if (defaultAccount) {
                        enhancedPurchase = {
                          ...enhancedPurchase,
                          bankAccountId:
                            defaultAccount._id || defaultAccount.id,
                          bankAccountName:
                            defaultAccount.accountName || defaultAccount.name,
                          bankName: defaultAccount.bankName,
                          accountNumber:
                            defaultAccount.accountNumber ||
                            defaultAccount.accountNo,
                          ifscCode: defaultAccount.ifscCode,
                          branchName: defaultAccount.branchName,
                          hasTransactionData: false,
                          enhancementStrategy: "default-bank-account",
                        };

                        console.log(
                          `✅ Applied default bank account to purchase ${purchase.purchaseNumber}:`,
                          {
                            bankAccountId:
                              defaultAccount._id || defaultAccount.id,
                            bankAccountName:
                              defaultAccount.accountName || defaultAccount.name,
                          }
                        );
                      }
                    }
                  }
                } catch (transactionError) {
                  console.warn(
                    `⚠️ Transaction search failed for purchase ${purchase.purchaseNumber}:`,
                    transactionError.message
                  );

                  // ✅ Strategy 3: Still apply default bank account even if transaction search fails
                  if (bankAccounts.length > 0) {
                    const defaultAccount = bankAccounts[0];
                    enhancedPurchase = {
                      ...enhancedPurchase,
                      bankAccountId: defaultAccount._id || defaultAccount.id,
                      bankAccountName:
                        defaultAccount.accountName || defaultAccount.name,
                      bankName: defaultAccount.bankName,
                      accountNumber: defaultAccount.accountNumber,
                      enhancementStrategy: "fallback-bank-account",
                      hasTransactionData: false,
                    };
                  }
                }
              } else {
                // ✅ For non-bank payments, still check if there's existing bank account data
                if (purchase.bankAccountId || purchase.payment?.bankAccountId) {
                  enhancedPurchase.hasTransactionData = true;
                  enhancedPurchase.enhancementStrategy = "existing-bank-data";
                  withBankDataCount++;
                } else {
                  enhancedPurchase.enhancementStrategy = "non-bank-payment";
                }
              }

              enhancedCount++;
              return enhancedPurchase;
            } catch (enhanceError) {
              console.warn(
                `⚠️ Failed to enhance purchase ${
                  purchase.purchaseNumber || purchase._id
                }:`,
                enhanceError.message
              );
              return {
                ...purchase,
                id: purchase._id || purchase.id,
                enhancementStrategy: "enhancement-failed",
                hasTransactionData: false,
              };
            }
          })
        );

        // ✅ Update enhancement statistics
        setEnhancementStats({
          enhanced: enhancedCount,
          total: rawPurchases.length,
          withBankData: withBankDataCount,
        });

        console.log(
          `✅ Enhanced ${enhancedCount}/${rawPurchases.length} purchases (${withBankDataCount} with bank data)`
        );

        return enhancedPurchases;
      } finally {
        enhancementInProgress.current = false;
      }
    },
    [effectiveCompanyId, bankAccounts] // ✅ STABLE DEPENDENCIES
  );

  // ✅ FIXED: Load purchases data - removed circular dependencies
  const loadPurchasesData = useCallback(async () => {
    if (!effectiveCompanyId) {
      setPurchases([]);
      addToast?.(
        "No company selected. Please select a company first.",
        "warning"
      );
      return;
    }

    try {
      setLoading(true);

      const filters = {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      };

      console.log("📊 Loading purchases for company:", effectiveCompanyId);

      const response = await purchaseService.getPurchases(
        effectiveCompanyId,
        filters
      );

      if (response?.success) {
        const rawData = response.data;
        let transformedPurchases = [];

        if (Array.isArray(rawData)) {
          transformedPurchases = rawData;
        } else if (rawData?.purchases && Array.isArray(rawData.purchases)) {
          transformedPurchases = rawData.purchases;
        } else if (rawData && typeof rawData === "object") {
          transformedPurchases = [rawData];
        }

        // ✅ Apply service transformation first if available
        if (
          purchaseService.transformPurchaseData &&
          transformedPurchases.length > 0
        ) {
          transformedPurchases = transformedPurchases.map((purchase) => {
            try {
              return purchaseService.transformPurchaseData(purchase);
            } catch (transformError) {
              console.warn("Purchase transform error:", transformError);
              return purchase;
            }
          });
        }

        // ✅ Then enhance with bank account information ONLY if bank accounts are loaded
        if (transformedPurchases.length > 0 && bankAccounts.length > 0) {
          transformedPurchases = await enhancePurchaseData(
            transformedPurchases
          );
        }

        setPurchases(transformedPurchases);
        console.log(
          `✅ Loaded and enhanced ${transformedPurchases.length} purchases`
        );
      } else {
        setPurchases([]);
        if (
          response?.message &&
          !response.message.includes("No purchases found")
        ) {
          addToast?.(
            "Failed to load purchases: " + response.message,
            "warning"
          );
        }
      }
    } catch (error) {
      console.error("❌ Error loading purchases:", error);
      setPurchases([]);

      let errorMessage = "Failed to load purchases data";
      if (error.message) {
        if (error.message.includes("Company ID is required")) {
          errorMessage =
            "Company not properly selected. Please refresh the page and select a company.";
        } else if (
          error.message.includes("401") ||
          error.message.includes("Authentication")
        ) {
          errorMessage = "Authentication failed. Please login again.";
        } else if (
          error.message.includes("403") ||
          error.message.includes("Access denied")
        ) {
          errorMessage =
            "Access denied. You may not have permission to view purchases.";
        } else if (error.message.includes("404")) {
          errorMessage = "Purchase service not found. Please contact support.";
        } else if (
          error.message.includes("Network") ||
          error.message.includes("fetch")
        ) {
          errorMessage =
            "Network error. Please check your internet connection.";
        } else {
          errorMessage = error.message;
        }
      }

      if (
        !error.message?.includes("fetch") &&
        !error.message?.includes("Network")
      ) {
        addToast?.(errorMessage, "error");
      }
    } finally {
      setLoading(false);
    }
  }, [
    effectiveCompanyId,
    startDate,
    endDate,
    addToast,
    bankAccounts,
    enhancePurchaseData,
  ]); // ✅ STABLE DEPENDENCIES

  // Load inventory items
  const loadInventoryItems = useCallback(async () => {
    if (!effectiveCompanyId) {
      setInventoryItems([]);
      return;
    }

    try {
      const response = await itemService.getItems(effectiveCompanyId);

      if (response?.success && response.data) {
        const items = response.data.items || response.data || [];
        setInventoryItems(Array.isArray(items) ? items : []);
      } else {
        setInventoryItems([]);
      }
    } catch (error) {
      console.warn("Failed to load inventory items:", error);
      setInventoryItems([]);
    }
  }, [effectiveCompanyId]); // ✅ ONLY effectiveCompanyId

  // ✅ FIXED: Check for refresh trigger from edit page - only once
  useEffect(() => {
    const stateData = location.state;
    if (stateData?.refreshData || stateData?.updatedPurchase) {
      console.log("🔄 Refreshing purchase data after edit");

      // Show success message if provided
      if (stateData.message) {
        addToast?.(stateData.message, "success");
      }

      // Clear the state to prevent multiple refreshes
      window.history.replaceState({}, document.title);

      // ✅ ONLY trigger if not already loaded
      if (loadedRef.current) {
        loadPurchasesData();
      }
    }
  }, [location.state]); // ✅ ONLY location.state

  // ✅ FIXED: Load data on mount - prevent infinite loops
  useEffect(() => {
    if (effectiveCompanyId && !loadedRef.current) {
      loadedRef.current = true;

      const loadData = async () => {
        try {
          // Load bank accounts first
          await loadBankAccounts();

          // Small delay to ensure bank accounts are set before loading purchases
          setTimeout(async () => {
            await loadPurchasesData();
            await loadInventoryItems();
          }, 100);
        } catch (error) {
          console.error("Error loading initial data:", error);
          loadedRef.current = false; // Allow retry
        }
      };

      loadData();
    } else if (!effectiveCompanyId) {
      // Reset when company changes
      loadedRef.current = false;
      setPurchases([]);
      setBankAccounts([]);
      setEnhancementStats({enhanced: 0, total: 0, withBankData: 0});
    }
  }, [effectiveCompanyId]); // ✅ ONLY effectiveCompanyId

  // ✅ FIXED: Date range changes - only reload if already loaded
  useEffect(() => {
    if (effectiveCompanyId && loadedRef.current) {
      const timer = setTimeout(() => {
        loadPurchasesData();
      }, 500); // Debounce date changes

      return () => clearTimeout(timer);
    }
  }, [startDate, endDate]); // ✅ ONLY date dependencies

  // Event handlers
  const handleDateRangeChange = useCallback((range) => {
    setDateRange(range);
  }, []);

  const handleStartDateChange = useCallback((e) => {
    const newDate = new Date(e.target.value);
    setStartDate(newDate);
    setDateRange("Custom Range");
  }, []);

  const handleEndDateChange = useCallback((e) => {
    const newDate = new Date(e.target.value);
    setEndDate(newDate);
    setDateRange("Custom Range");
  }, []);

  // ✅ ENHANCED: Navigate to separate create page
  const handleCreatePurchase = useCallback(() => {
    window.location.href = `/companies/${effectiveCompanyId}/purchases/add`;
  }, [effectiveCompanyId]);

  // ✅ ENHANCED: Pass enhanced purchase data to edit
  const handleEditPurchase = useCallback((purchase) => {
    console.log("📝 Edit purchase requested with enhanced data:", {
      purchaseId: purchase.id || purchase._id,
      bankAccountId: purchase.bankAccountId,
      bankAccountName: purchase.bankAccountName,
      hasTransactionData: purchase.hasTransactionData,
      paymentMethod: purchase.paymentMethod,
      enhancementStrategy: purchase.enhancementStrategy,
    });

    // The table will handle navigation with enhanced data
  }, []);

  const handleAddItem = useCallback(
    async (productData) => {
      try {
        const response = await itemService.createItem(
          effectiveCompanyId,
          productData
        );

        if (response.success) {
          setInventoryItems((prev) => [...prev, response.data]);
          return {
            success: true,
            data: response.data,
            message: `Item "${productData.name}" added successfully`,
          };
        } else {
          throw new Error(response.message || "Failed to add item");
        }
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: "Error adding item to inventory",
        };
      }
    },
    [effectiveCompanyId]
  );

  const handleSearchChange = useCallback((e) => {
    setTopSearchTerm(e.target.value);
  }, []);

  // ✅ Purchase transaction handlers
  const handleViewPurchase = useCallback(
    (purchase) => {
      addToast?.(
        `Viewing Purchase: ${
          purchase.purchaseNumber || purchase.billNo
        }\nSupplier: ${
          purchase.supplierName || purchase.partyName
        }\nAmount: ₹${(purchase.amount || 0).toLocaleString()}`,
        "info"
      );
    },
    [addToast]
  );

  // ✅ REPLACE the existing handleDeletePurchase with this simple version:
  const handleDeletePurchase = useCallback(
    (purchase) => {
      // ✅ Simple refresh handler - no API calls here
      console.log("🔄 Parent: Purchase deleted, refreshing list");

      // ✅ Remove from local state for immediate feedback
      setPurchases((prev) =>
        prev.filter((p) => (p.id || p._id) !== (purchase.id || purchase._id))
      );

      // ✅ Refresh data after a short delay
      setTimeout(() => {
        loadPurchasesData();
      }, 1000);

      // ✅ Show success message
      addToast?.(
        `Purchase ${purchase.purchaseNumber || "item"} removed from list`,
        "success"
      );
    },
    [loadPurchasesData, addToast]
  );
  const handlePrintPurchase = useCallback(
    (purchase) => {
      addToast?.(
        `Printing purchase ${purchase.purchaseNumber || purchase.billNo}...`,
        "info"
      );
    },
    [addToast]
  );

  const handleSharePurchase = useCallback(
    (purchase) => {
      const shareText = `Purchase ${
        purchase.purchaseNumber || purchase.billNo
      }\nSupplier: ${purchase.supplierName || purchase.partyName}\nAmount: ₹${(
        purchase.amount || 0
      ).toLocaleString()}\nStatus: ${purchase.status}`;

      if (navigator.share) {
        navigator
          .share({
            title: `Purchase ${purchase.purchaseNumber || purchase.billNo}`,
            text: shareText,
            url: window.location.href,
          })
          .catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard
          .writeText(shareText)
          .then(() => {
            addToast?.("Purchase details copied to clipboard!", "success");
          })
          .catch(() => {
            alert(`Purchase Details:\n${shareText}`);
          });
      } else {
        alert(`Purchase Details:\n${shareText}`);
      }
    },
    [addToast]
  );

  const handleDownloadPurchase = useCallback(
    (purchase) => {
      addToast?.(
        `Downloading purchase ${purchase.purchaseNumber || purchase.billNo}...`,
        "info"
      );
    },
    [addToast]
  );

  // Utility handlers
  const handleMoreOptions = useCallback(() => {
    addToast?.("More options feature coming soon!", "info");
  }, [addToast]);

  const handleSettings = useCallback(() => {
    addToast?.("Settings feature coming soon!", "info");
  }, [addToast]);

  const handleExcelExport = useCallback(() => {
    addToast?.("Excel export feature coming soon!", "info");
  }, [addToast]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ✅ FIXED: Manual refresh handler
  const handleRefresh = useCallback(() => {
    loadedRef.current = false; // Allow reload
    enhancementInProgress.current = false; // Reset enhancement flag

    const refreshData = async () => {
      try {
        await loadBankAccounts();
        setTimeout(async () => {
          await loadPurchasesData();
          addToast?.("Purchase data refreshed!", "success");
          loadedRef.current = true;
        }, 100);
      } catch (error) {
        console.error("Error refreshing data:", error);
        addToast?.("Error refreshing data", "error");
        loadedRef.current = true; // Set back to prevent infinite attempts
      }
    };

    refreshData();
  }, [loadBankAccounts, loadPurchasesData, addToast]);

  // Early returns for better UX
  if (!isOnline) {
    return (
      <div className="purchase-bills-wrapper">
        <Container fluid>
          <Alert variant="warning" className="text-center">
            <h5>📡 No Internet Connection</h5>
            <p>
              Purchase data requires an internet connection. Please check your
              network and try again.
            </p>
            <Button
              variant="outline-warning"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </Alert>
        </Container>
      </div>
    );
  }

  if (!effectiveCompanyId) {
    return (
      <div className="purchase-bills-wrapper">
        <Container fluid>
          <Alert variant="warning" className="text-center">
            <h5>⚠️ No Company Selected</h5>
            <p>Please select a company to view purchase bills.</p>
            <Button
              variant="outline-primary"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </Alert>
        </Container>
      </div>
    );
  }

  // ✅ ENHANCED MAIN RENDER: With bank account pre-loading and enhancement stats
  return (
    <div className="purchase-bills-wrapper">
      <PurchaseBillsHeader
        searchTerm={topSearchTerm}
        onSearchChange={handleSearchChange}
        onAddPurchase={handleCreatePurchase}
        onMoreOptions={handleMoreOptions}
        onSettings={handleSettings}
        companyId={effectiveCompanyId}
      />

      <div className="purchase-page-title">
        <Container fluid className="px-4">
          <Row className="align-items-center py-3">
            <Col>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <h4 className="mb-1 text-warning">
                    <i className="fas fa-shopping-cart me-2"></i>
                    Purchase Bills
                  </h4>
                  <p className="text-muted mb-0">
                    Manage your purchase transactions ({purchases.length} bills)
                    {bankAccounts.length > 0 &&
                      ` • ${bankAccounts.length} bank accounts loaded`}
                    {enhancementStats.total > 0 &&
                      ` • ${enhancementStats.withBankData}/${enhancementStats.total} enhanced with bank data`}
                  </p>
                </div>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-secondary"
                    onClick={handleRefresh}
                    disabled={loading}
                    title="Refresh Data"
                  >
                    <FontAwesomeIcon
                      icon={faRefresh}
                      className={loading ? "fa-spin" : ""}
                    />
                  </Button>
                  <Button
                    variant="warning"
                    onClick={handleCreatePurchase}
                    className="px-4"
                    disabled={loading}
                  >
                    <FontAwesomeIcon icon={faPlus} className="me-2" />
                    Add Purchase
                  </Button>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      <PurchaseBillsFilter
        dateRange={dateRange}
        startDate={startDate}
        endDate={endDate}
        selectedFirm={selectedFirm}
        dateRangeOptions={dateRangeOptions}
        firmOptions={firmOptions}
        onDateRangeChange={handleDateRangeChange}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        onFirmChange={setSelectedFirm}
        onExcelExport={handleExcelExport}
        onPrint={handlePrint}
        resultCount={filteredPurchases.length}
      />

      <Container fluid className="px-4 py-3">
        <Row className="g-3">
          <Col xl={2} lg={3} md={3} sm={12} className="sidebar-col">
            <PurchaseBillsSummary
              summary={summary}
              loading={loading}
              dateRange={dateRange}
            />
          </Col>

          <Col xl={10} lg={9} md={9} sm={12} className="content-col">
            <PurchaseBillsTable
              purchases={filteredPurchases}
              onCreatePurchase={handleCreatePurchase}
              onViewPurchase={handleViewPurchase}
              onEditPurchase={handleEditPurchase}
              onDeletePurchase={handleDeletePurchase}
              onPrintPurchase={handlePrintPurchase}
              onSharePurchase={handleSharePurchase}
              onDownloadPurchase={handleDownloadPurchase}
              categories={categories}
              onAddItem={handleAddItem}
              inventoryItems={inventoryItems}
              loading={loading}
              isLoading={loading}
              companyId={effectiveCompanyId}
              searchTerm={debouncedSearchTerm}
              addToast={addToast}
              title="Purchase Bills"
              searchPlaceholder="Search purchase bills by supplier, number..."
              // ✅ Pass enhanced data and bank accounts
              bankAccounts={bankAccounts}
              enhancedPurchases={true}
              enhancementStats={enhancementStats}
            />
          </Col>
        </Row>
      </Container>

      {/* Enhanced styling */}
      <style jsx>{`
        .purchase-bills-wrapper {
          background-color: #f8f9fa;
          min-height: 100vh;
        }

        .purchase-page-title {
          background: linear-gradient(
            135deg,
            rgba(255, 193, 7, 0.1) 0%,
            rgba(253, 126, 20, 0.05) 100%
          );
          border-bottom: 1px solid rgba(255, 193, 7, 0.1);
        }

        .sidebar-col {
          padding-right: 1rem;
        }

        .content-col {
          padding-left: 1rem;
        }

        @media (max-width: 768px) {
          .sidebar-col,
          .content-col {
            padding: 0.5rem;
          }

          .purchase-page-title .d-flex {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch !important;
          }
        }

        /* Loading state */
        .purchase-bills-wrapper.loading {
          opacity: 0.8;
          pointer-events: none;
        }

        /* Responsive design */
        @media (max-width: 992px) {
          .sidebar-col {
            order: 2;
          }
          .content-col {
            order: 1;
          }
        }

        /* Enhancement indicator */
        .enhancement-indicator {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-left: 8px;
        }

        .enhancement-indicator.enhanced {
          background-color: #28a745;
        }

        .enhancement-indicator.default {
          background-color: #ffc107;
        }

        .enhancement-indicator.none {
          background-color: #6c757d;
        }
      `}</style>
    </div>
  );
}

export default PurchaseBills;
