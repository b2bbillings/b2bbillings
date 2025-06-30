import React, {useState, useEffect, useCallback, useMemo, useRef} from "react";
import {Container, Row, Col, Alert, Button} from "react-bootstrap";
import {useParams, useLocation} from "react-router-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPlus, faRefresh} from "@fortawesome/free-solid-svg-icons";

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
        `}
      </style>

      <PurchaseBillsHeader
        searchTerm={topSearchTerm}
        onSearchChange={handleSearchChange}
        onAddPurchase={handleCreatePurchase}
        onMoreOptions={handleMoreOptions}
        onSettings={handleSettings}
        companyId={effectiveCompanyId}
      />

      <PurchaseBillsPageTitle
        onAddPurchase={handleCreatePurchase}
        billCount={purchases.length}
        companyId={effectiveCompanyId}
        mode="bills"
        documentType="bill"
        title="Purchase Bills"
        subtitle={`Manage your purchase transactions and supplier bills${
          bankAccounts.length > 0
            ? ` • ${bankAccounts.length} bank accounts loaded`
            : ""
        }${
          enhancementStats.total > 0
            ? ` • ${enhancementStats.withBankData}/${enhancementStats.total} enhanced with bank data`
            : ""
        }`}
      />

      <div className="px-3">
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

      <div className="px-3 pb-3">
        <Row className="g-3">
          <Col xl={2} lg={3} md={3} sm={12}>
            <PurchaseBillsSummary
              summary={summary}
              loading={loading}
              dateRange={dateRange}
            />
          </Col>

          <Col xl={10} lg={9} md={9} sm={12}>
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
