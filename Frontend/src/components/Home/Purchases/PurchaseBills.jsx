import React, {useState, useEffect, useCallback, useMemo, useRef} from "react";
import {Container, Row, Col, Alert, Button} from "react-bootstrap";
import {useParams, useLocation} from "react-router-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPlus, faRefresh, faFilter} from "@fortawesome/free-solid-svg-icons";

import PurchaseBillsHeader from "./PurchaseBill/PurchaseBillsHeader";
import PurchaseBillsPageTitle from "./PurchaseBill/PurchaseBillsPageTitle";
import PurchaseBillsFilter from "./PurchaseBill/PurchaseBillsFilter";
import PurchaseBillsSummary from "./PurchaseBill/PurchaseBillsSummary";
import PurchaseBillsTable from "./PurchaseBill/PurchaseBillsTable";

import purchaseService from "../../../services/purchaseService";
import itemService from "../../../services/itemService";
import transactionService from "../../../services/transactionService";

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

  const loadedRef = useRef(false);
  const enhancementInProgress = useRef(false);

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
  const [showFilters, setShowFilters] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [enhancementStats, setEnhancementStats] = useState({
    enhanced: 0,
    total: 0,
    withBankData: 0,
  });

  const debouncedSearchTerm = useDebounce(topSearchTerm, 300);

  const [purchases, setPurchases] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);

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
    const growthPercentage = Math.random() * 20 - 10;

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

  const loadBankAccounts = useCallback(async () => {
    if (!effectiveCompanyId) {
      setBankAccounts([]);
      return;
    }

    try {
      const endpoints = [
        `/companies/${effectiveCompanyId}/bank-accounts`,
        `/companies/${effectiveCompanyId}/bank-accounts?active=true`,
        `/bank-accounts?companyId=${effectiveCompanyId}`,
        `/companies/${effectiveCompanyId}/transactions/bank-accounts`,
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
                data.banks ||
                [];
            } else if (Array.isArray(data)) {
              bankAccountData = data;
            }

            if (bankAccountData.length > 0) {
              setBankAccounts(bankAccountData);
              break;
            }
          }
        } catch (endpointError) {
          continue;
        }
      }

      if (bankAccountData.length === 0) {
        setBankAccounts([]);
      }
    } catch (error) {
      setBankAccounts([]);
    }
  }, [effectiveCompanyId]);

  const enhancePurchaseData = useCallback(
    async (rawPurchases) => {
      if (!Array.isArray(rawPurchases) || rawPurchases.length === 0) {
        return rawPurchases;
      }

      if (enhancementInProgress.current) {
        return rawPurchases;
      }

      enhancementInProgress.current = true;

      try {
        let enhancedCount = 0;
        let withBankDataCount = 0;

        const enhancedPurchases = await Promise.all(
          rawPurchases.map(async (purchase, index) => {
            try {
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

              const paymentMethod =
                transactionService.normalizePaymentMethodForFrontend(
                  purchase.paymentMethod || purchase.payment?.method || "cash"
                );

              if (paymentMethod === "bank") {
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
                      }
                    }
                  }
                } catch (transactionError) {
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
              return {
                ...purchase,
                id: purchase._id || purchase.id,
                enhancementStrategy: "enhancement-failed",
                hasTransactionData: false,
              };
            }
          })
        );

        setEnhancementStats({
          enhanced: enhancedCount,
          total: rawPurchases.length,
          withBankData: withBankDataCount,
        });

        return enhancedPurchases;
      } finally {
        enhancementInProgress.current = false;
      }
    },
    [effectiveCompanyId, bankAccounts]
  );

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

        if (
          purchaseService.transformPurchaseData &&
          transformedPurchases.length > 0
        ) {
          transformedPurchases = transformedPurchases.map((purchase) => {
            try {
              return purchaseService.transformPurchaseData(purchase);
            } catch (transformError) {
              return purchase;
            }
          });
        }

        if (transformedPurchases.length > 0 && bankAccounts.length > 0) {
          transformedPurchases = await enhancePurchaseData(
            transformedPurchases
          );
        }

        setPurchases(transformedPurchases);
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
  ]);

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
      setInventoryItems([]);
    }
  }, [effectiveCompanyId]);

  useEffect(() => {
    const stateData = location.state;
    if (stateData?.refreshData || stateData?.updatedPurchase) {
      if (stateData.message) {
        addToast?.(stateData.message, "success");
      }

      window.history.replaceState({}, document.title);

      if (loadedRef.current) {
        loadPurchasesData();
      }
    }
  }, [location.state]);

  useEffect(() => {
    if (effectiveCompanyId && !loadedRef.current) {
      loadedRef.current = true;

      const loadData = async () => {
        try {
          await loadBankAccounts();

          setTimeout(async () => {
            await loadPurchasesData();
            await loadInventoryItems();
          }, 100);
        } catch (error) {
          loadedRef.current = false;
        }
      };

      loadData();
    } else if (!effectiveCompanyId) {
      loadedRef.current = false;
      setPurchases([]);
      setBankAccounts([]);
      setEnhancementStats({enhanced: 0, total: 0, withBankData: 0});
    }
  }, [effectiveCompanyId]);

  useEffect(() => {
    if (effectiveCompanyId && loadedRef.current) {
      const timer = setTimeout(() => {
        loadPurchasesData();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [startDate, endDate]);

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

  const handleCreatePurchase = useCallback(() => {
    window.location.href = `/companies/${effectiveCompanyId}/purchases/add`;
  }, [effectiveCompanyId]);

  const handleEditPurchase = useCallback((purchase) => {
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

  const handleDeletePurchase = useCallback(
    (purchase) => {
      setPurchases((prev) =>
        prev.filter((p) => (p.id || p._id) !== (purchase.id || purchase._id))
      );

      setTimeout(() => {
        loadPurchasesData();
      }, 1000);

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

  const handleRefresh = useCallback(() => {
    loadedRef.current = false;
    enhancementInProgress.current = false;

    const refreshData = async () => {
      try {
        await loadBankAccounts();
        setTimeout(async () => {
          await loadPurchasesData();
          addToast?.("Purchase data refreshed!", "success");
          loadedRef.current = true;
        }, 100);
      } catch (error) {
        addToast?.("Error refreshing data", "error");
        loadedRef.current = true;
      }
    };

    refreshData();
  }, [loadBankAccounts, loadPurchasesData, addToast]);

  if (!isOnline) {
    return (
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
    );
  }

  if (!effectiveCompanyId) {
    return (
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
    );
  }

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "#f8f9fa",
        margin: 0,
        padding: 0,
      }}
    >
      <style>
        {`
          .main-content {
            padding: 0 !important;
            margin: 0 !important;
            min-height: auto !important;
          }
          
          .table-responsive {
            overflow-x: auto;
            overflow-y: visible;
          }
          
          .card-body {
            overflow: visible !important;
          }
          
          .container-fluid,
          .row,
          .col {
            overflow: visible;
          }

          /* Modern Purchase Bills Overview Wrapper */
          .purchase-overview-wrapper {
            background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%) !important;
            border-radius: 20px !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            will-change: transform, box-shadow, border-color;
          }

          .purchase-overview-wrapper:hover {
            background: linear-gradient(135deg, #fefefe 0%, #f8fafc 100%) !important;
          }

          .purchase-overview-wrapper:hover::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.05) 0%, transparent 50%);
            pointer-events: none;
            z-index: 1;
          }

          /* Enhanced card hover effects inside wrapper */
          .purchase-overview-wrapper:hover .summary-card {
            transform: translateY(-2px) !important;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1) !important;
          }

          .purchase-overview-wrapper:hover [style*="flex: '1 1 calc(33.333% - 0.75rem')"] {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          }

          /* Smooth transitions for all elements */
          .purchase-overview-wrapper * {
            transition: all 0.2s ease-in-out;
          }

          /* Pulse animation on load */
          @keyframes pulseGlow {
            0% { box-shadow: 0 8px 30px rgba(99, 102, 241, 0.12); }
            50% { box-shadow: 0 10px 35px rgba(99, 102, 241, 0.16); }
            100% { box-shadow: 0 8px 30px rgba(99, 102, 241, 0.12); }
          }

          .purchase-overview-wrapper {
            animation: pulseGlow 3s ease-in-out infinite;
          }

          .purchase-overview-wrapper:hover {
            animation: none;
          }

          /* Ensure z-index for proper stacking */
          .purchase-overview-wrapper > div:first-child {
            position: relative;
            z-index: 2;
          }

          /* Enhanced Typography for Summary Cards */
          .purchase-overview-wrapper h5,
          .purchase-overview-wrapper h6 {
            font-weight: 700 !important;
            letter-spacing: 0.5px !important;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
          }

          .purchase-overview-wrapper h5 {
            font-size: 1.35rem !important;
            line-height: 1.3 !important;
          }

          .purchase-overview-wrapper h6 {
            font-size: 1.1rem !important;
            line-height: 1.4 !important;
          }

          .purchase-overview-wrapper p {
            font-size: 0.95rem !important;
            font-weight: 500 !important;
            letter-spacing: 0.3px !important;
            line-height: 1.5 !important;
          }

          .purchase-overview-wrapper small {
            font-size: 0.85rem !important;
            font-weight: 500 !important;
            letter-spacing: 0.2px !important;
            line-height: 1.4 !important;
          }

          /* Improved text contrast and readability */
          .purchase-overview-wrapper .text-muted {
            color: #64748b !important;
            font-weight: 500 !important;
          }

          .purchase-overview-wrapper .text-dark {
            color: #1e293b !important;
            font-weight: 700 !important;
          }

          .purchase-overview-wrapper .text-success {
            color: #059669 !important;
            font-weight: 700 !important;
          }

          .purchase-overview-wrapper .text-warning {
            color: #d97706 !important;
            font-weight: 700 !important;
          }

          .purchase-overview-wrapper .text-info {
            color: #0891b2 !important;
            font-weight: 700 !important;
          }

          /* Mobile responsiveness enhancements */
          @media (max-width: 768px) {
            .purchase-overview-wrapper {
              padding: 1.5rem !important;
            }

            .purchase-overview-wrapper h5 {
              font-size: 1.2rem !important;
            }

            .purchase-overview-wrapper h6 {
              font-size: 1rem !important;
            }

            .purchase-overview-wrapper p {
              font-size: 0.9rem !important;
            }

            .purchase-overview-wrapper small {
              font-size: 0.8rem !important;
            }
          }

          @media (max-width: 576px) {
            .purchase-overview-wrapper {
              padding: 1.25rem !important;
            }

            .purchase-overview-wrapper h5 {
              font-size: 1.1rem !important;
            }

            .purchase-overview-wrapper h6 {
              font-size: 0.95rem !important;
            }
          }
          
          /* Filter Animation */
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      <PurchaseBillsHeader
        searchTerm={topSearchTerm}
        onSearchChange={handleSearchChange}
        onAddPurchase={handleCreatePurchase}
        onMoreOptions={handleMoreOptions}
        onSettings={handleSettings}
        companyId={effectiveCompanyId}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      {/* Removed PurchaseBillsPageTitle with subtitle */}

      {/* Collapsible Filter Section */}
      {showFilters && (
        <div 
          className="px-3"
          style={{
            animation: 'slideDown 0.3s ease-out',
            background: '#f8fafc',
            borderRadius: '0.5rem',
            margin: '0 1rem 1rem',
            padding: '1rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}
        >
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
        </div>
      )}

      <div className="px-3 pb-3">
        {/* Purchase Bills Analysis Row */}
        {/* Purchase Bills Analysis Row */}
        <Row className="mb-4">
          <Col xs={12}>
            <div 
              className="purchase-overview-wrapper"
              style={{
                padding: '2rem',
                background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
                borderRadius: '20px',
                border: '2px solid #e2e8f0',
                boxShadow: '0 8px 30px rgba(99, 102, 241, 0.12)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'default',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = '0 15px 45px rgba(99, 102, 241, 0.20)';
                e.currentTarget.style.borderColor = '#6366f1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(99, 102, 241, 0.12)';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '5px',
                  background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 33%, #06b6d4 66%, #10b981 100%)',
                  borderRadius: '20px 20px 0 0'
                }}
              />
              <PurchaseBillsSummary
                summary={summary}
                loading={loading}
                dateRange={dateRange}
              />
            </div>
          </Col>
        </Row>

        {/* Purchase Bills Table Row */}
        <Row>
          <Col xs={12}>
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
              bankAccounts={bankAccounts}
              enhancedPurchases={true}
              enhancementStats={enhancementStats}
            />
          </Col>
        </Row>
      </div>
    </div>
  );
}

export default PurchaseBills;
