import React, {useState, useEffect} from "react";
import {
  Tab,
  Tabs,
  Card,
  Form,
  InputGroup,
  Button,
  Badge,
  Spinner,
  Alert,
  Row,
  Col,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faPlay,
  faCalendarAlt,
  faSearch,
  faPrint,
  faFileExport,
  faMoneyBillWave,
  faHandHoldingUsd,
  faFileInvoice,
  faBuilding,
  faRefresh,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";

// Import DayBook components
import DayBookSummary from "./DayBook/DayBookSummary";
import ReceivablesTab from "./DayBook/ReceivablesTab";
import PayablesTab from "./DayBook/PayablesTab";
import DailyTransactionsTab from "./DayBook/DailyTransactionsTab";
import CashBankTab from "./DayBook/CashBankTab";

// ✅ Import correct services including bankAccountService
import salesService from "../../services/salesService";
import purchaseService from "../../services/purchaseService";
import transactionService from "../../services/transactionService";
import bankAccountService from "../../services/bankAccountService";
import "./DayBook.css";

function DayBook({
  companyId,
  currentCompany,
  currentUser,
  addToast,
  onNavigate,
}) {
  // State management
  const [activeTab, setActiveTab] = useState("receivables");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Financial data states
  const [receivablesData, setReceivablesData] = useState([]);
  const [payablesData, setPayablesData] = useState([]);
  const [transactionsData, setTransactionsData] = useState([]);
  const [bankAccountsData, setBankAccountsData] = useState([]);

  // ✅ Enhanced summary data state
  const [summaryData, setSummaryData] = useState({
    totalReceivables: 0,
    totalPayables: 0,
    overdueReceivables: 0,
    overduePayables: 0,
    dueTodayReceivables: 0,
    dueTodayPayables: 0,
    netPosition: 0,
    totalCashIn: 0,
    totalCashOut: 0,
    netCashFlow: 0,
    totalTransactions: 0,
    lastUpdated: null,
  });

  // ✅ Data loading states for better UX
  const [loadingStates, setLoadingStates] = useState({
    receivables: false,
    payables: false,
    transactions: false,
    bankAccounts: false,
  });

  // ✅ Set up refresh function for tabs to use
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.refreshDayBookData = handleRefresh;
    }

    return () => {
      if (typeof window !== "undefined") {
        delete window.refreshDayBookData;
      }
    };
  }, []);

  // Load data on component mount and date change
  useEffect(() => {
    if (companyId) {
      loadDayBookData();
    }
  }, [companyId, date]);

  // ✅ Enhanced data loading with better error handling
  const loadDayBookData = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Load all data in parallel with individual error handling
      await Promise.all([
        loadReceivablesData(),
        loadPayablesData(),
        loadTransactionsData(),
        loadBankAccountsData(),
      ]);

      // ✅ Calculate final summary after all data is loaded
      calculateFinalSummary();
    } catch (error) {
      setError(error.message || "Failed to load day book data");
      addToast?.("Failed to load day book data", "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Load receivables data with enhanced error handling
  const loadReceivablesData = async () => {
    try {
      setLoadingStates((prev) => ({...prev, receivables: true}));
      let receivables = [];

      // Method 1: Try to get daybook summary
      if (salesService.getDaybookSummary) {
        try {
          const daybookResponse = await salesService.getDaybookSummary(
            companyId,
            date
          );
          if (daybookResponse?.success && daybookResponse.data) {
            receivables =
              daybookResponse.data.receivables ||
              daybookResponse.data.sales ||
              [];
          }
        } catch (error) {
          // Silent error handling
        }
      }

      // Method 2: Fallback to overdue sales
      if (receivables.length === 0 && salesService.getOverdueSales) {
        try {
          const overdueResponse = await salesService.getOverdueSales(companyId);
          if (overdueResponse?.success) {
            const overdueReceivables = (overdueResponse.data || []).map(
              (sale) => ({
                ...sale,
                type: "overdue",
                priority: "high",
              })
            );
            receivables = [...receivables, ...overdueReceivables];
          }
        } catch (error) {
          // Silent error handling
        }
      }

      // Method 3: Add due today sales
      if (salesService.getSalesDueToday) {
        try {
          const dueTodayResponse = await salesService.getSalesDueToday(
            companyId
          );
          if (dueTodayResponse?.success) {
            const dueTodayReceivables = (dueTodayResponse.data || []).map(
              (sale) => ({
                ...sale,
                type: "due_today",
                priority: "medium",
              })
            );
            // Avoid duplicates
            const existingIds = new Set(receivables.map((r) => r._id || r.id));
            const newDueToday = dueTodayReceivables.filter(
              (r) => !existingIds.has(r._id || r.id)
            );
            receivables = [...receivables, ...newDueToday];
          }
        } catch (error) {
          // Silent error handling
        }
      }

      // Method 4: Fallback to recent sales if still no data
      if (receivables.length === 0 && salesService.getSales) {
        try {
          const recentSalesResponse = await salesService.getSales(companyId, {
            limit: 50,
            sortBy: "saleDate",
            sortOrder: "desc",
            status: "pending,partial",
          });
          if (recentSalesResponse?.success) {
            receivables = (recentSalesResponse.data?.sales || []).map(
              (sale) => ({
                ...sale,
                type: "pending",
                priority: "low",
              })
            );
          }
        } catch (error) {
          // Silent error handling
        }
      }

      setReceivablesData(receivables);
      return receivables;
    } catch (error) {
      setReceivablesData([]);
      return [];
    } finally {
      setLoadingStates((prev) => ({...prev, receivables: false}));
    }
  };

  // ✅ Load payables data with enhanced error handling
  const loadPayablesData = async () => {
    try {
      setLoadingStates((prev) => ({...prev, payables: true}));
      let payables = [];

      // Method 1: Try to get daybook summary
      if (purchaseService.getDaybookSummary) {
        try {
          const daybookResponse = await purchaseService.getDaybookSummary(
            companyId,
            date
          );
          if (daybookResponse?.success && daybookResponse.data) {
            payables =
              daybookResponse.data.payables ||
              daybookResponse.data.purchases ||
              [];
          }
        } catch (error) {
          // Silent error handling
        }
      }

      // Method 2: Fallback to overdue purchases
      if (payables.length === 0) {
        try {
          const overdueResponse = await purchaseService.getOverduePurchases(
            companyId
          );
          if (overdueResponse?.success) {
            const overduePayables = (overdueResponse.data || []).map(
              (purchase) => ({
                ...purchase,
                type: "overdue",
                priority: "high",
              })
            );
            payables = [...payables, ...overduePayables];
          }
        } catch (error) {
          // Silent error handling
        }
      }

      // Method 3: Add due today purchases
      try {
        const dueTodayResponse = await purchaseService.getPurchasesDueToday(
          companyId
        );
        if (dueTodayResponse?.success) {
          const dueTodayPayables = (dueTodayResponse.data || []).map(
            (purchase) => ({
              ...purchase,
              type: "due_today",
              priority: "medium",
            })
          );
          // Avoid duplicates
          const existingIds = new Set(payables.map((p) => p._id || p.id));
          const newDueToday = dueTodayPayables.filter(
            (p) => !existingIds.has(p._id || p.id)
          );
          payables = [...payables, ...newDueToday];
        }
      } catch (error) {
        // Silent error handling
      }

      // Method 4: Fallback to recent purchases if still no data
      if (payables.length === 0 && purchaseService.getPurchases) {
        try {
          const recentPurchasesResponse = await purchaseService.getPurchases(
            companyId,
            {
              limit: 50,
              sortBy: "purchaseDate",
              sortOrder: "desc",
              status: "pending,partial",
            }
          );
          if (recentPurchasesResponse?.success) {
            payables = (recentPurchasesResponse.data?.purchases || []).map(
              (purchase) => ({
                ...purchase,
                type: "pending",
                priority: "low",
              })
            );
          }
        } catch (error) {
          // Silent error handling
        }
      }

      setPayablesData(payables);
      return payables;
    } catch (error) {
      setPayablesData([]);
      return [];
    } finally {
      setLoadingStates((prev) => ({...prev, payables: false}));
    }
  };

  // ✅ Load transactions data with comprehensive approach
  const loadTransactionsData = async () => {
    try {
      setLoadingStates((prev) => ({...prev, transactions: true}));
      let allTransactions = [];

      // Method 1: Use transaction service if available
      if (
        transactionService &&
        typeof transactionService.getTransactions === "function"
      ) {
        try {
          const transactionsResponse = await transactionService.getTransactions(
            companyId,
            {
              date: date,
              limit: 100,
              sortBy: "transactionDate",
              sortOrder: "desc",
            }
          );

          if (transactionsResponse?.success) {
            const transactions = transactionsResponse.data?.transactions || [];
            allTransactions = [...allTransactions, ...transactions];
          }
        } catch (error) {
          // Silent error handling
        }
      }

      // Method 2: Get daily cash flow from sales service
      if (salesService.getDailyCashFlow) {
        try {
          const cashInflowResponse = await salesService.getDailyCashFlow(
            companyId,
            date
          );
          if (cashInflowResponse?.success) {
            const inflowTransactions = (
              cashInflowResponse.data?.transactions || []
            ).map((t) => ({
              ...t,
              direction: "in",
              transactionType: "payment_in",
              source: "sales",
            }));

            // Avoid duplicates
            const existingIds = new Set(
              allTransactions.map((t) => t._id || t.id)
            );
            const newInflowTransactions = inflowTransactions.filter(
              (t) => !existingIds.has(t._id || t.id)
            );
            allTransactions = [...allTransactions, ...newInflowTransactions];
          }
        } catch (error) {
          // Silent error handling
        }
      }

      // Method 3: Get daily cash outflow from purchase service
      if (purchaseService.getDailyCashOutflow) {
        try {
          const cashOutflowResponse = await purchaseService.getDailyCashOutflow(
            companyId,
            date
          );
          if (cashOutflowResponse?.success) {
            const outflowTransactions = (
              cashOutflowResponse.data?.transactions || []
            ).map((t) => ({
              ...t,
              direction: "out",
              transactionType: "payment_out",
              source: "purchases",
            }));

            // Avoid duplicates
            const existingIds = new Set(
              allTransactions.map((t) => t._id || t.id)
            );
            const newOutflowTransactions = outflowTransactions.filter(
              (t) => !existingIds.has(t._id || t.id)
            );
            allTransactions = [...allTransactions, ...newOutflowTransactions];
          }
        } catch (error) {
          // Silent error handling
        }
      }

      // ✅ Process and normalize transaction data
      const processedTransactions = processTransactionData(allTransactions);

      // Sort by date and time (most recent first)
      processedTransactions.sort((a, b) => {
        const dateA = new Date(a.transactionDate || a.createdAt);
        const dateB = new Date(b.transactionDate || b.createdAt);
        return dateB - dateA;
      });

      setTransactionsData(processedTransactions);
      return processedTransactions;
    } catch (error) {
      setTransactionsData([]);
      return [];
    } finally {
      setLoadingStates((prev) => ({...prev, transactions: false}));
    }
  };

  // ✅ Load bank accounts data using bankAccountService
  const loadBankAccountsData = async () => {
    try {
      setLoadingStates((prev) => ({...prev, bankAccounts: true}));

      if (!companyId) {
        setBankAccountsData([]);
        return [];
      }

      // ✅ Use bankAccountService instead of transactionService
      const bankAccountsResponse =
        await bankAccountService.getAllAccountsWithBalances(companyId);

      if (bankAccountsResponse?.success) {
        const bankAccounts =
          bankAccountsResponse.accounts ||
          bankAccountsResponse.data?.accounts ||
          [];
        setBankAccountsData(bankAccounts);
        return bankAccounts;
      } else {
        setBankAccountsData([]);
        return [];
      }
    } catch (error) {
      setBankAccountsData([]);
      return [];
    } finally {
      setLoadingStates((prev) => ({...prev, bankAccounts: false}));
    }
  };

  // ✅ Enhanced transaction data processing
  const processTransactionData = (transactions) => {
    if (!Array.isArray(transactions)) return [];

    return transactions.map((transaction) => {
      // ✅ Normalize transaction data structure
      const processedTransaction = {
        // Core fields
        _id:
          transaction._id ||
          transaction.id ||
          `temp_${Date.now()}_${Math.random()}`,
        amount: parseFloat(transaction.amount) || 0,

        // Direction and type
        direction:
          transaction.direction ||
          (transaction.transactionType === "payment_in" ||
          transaction.type === "payment_in"
            ? "in"
            : "out"),

        transactionType:
          transaction.transactionType || transaction.type || "payment",
        type: transaction.type || transaction.transactionType || "payment",

        // Dates
        transactionDate:
          transaction.transactionDate ||
          transaction.paymentDate ||
          transaction.saleDate ||
          transaction.purchaseDate ||
          transaction.createdAt ||
          new Date().toISOString(),

        paymentDate:
          transaction.paymentDate ||
          transaction.transactionDate ||
          transaction.createdAt ||
          new Date().toISOString(),

        // Party information
        partyName:
          transaction.partyName ||
          transaction.partyId?.name ||
          transaction.customer?.name ||
          transaction.supplier?.name ||
          transaction.customerName ||
          transaction.supplierName ||
          "Unknown Party",

        partyId: transaction.partyId ||
          transaction.customer ||
          transaction.supplier || {name: transaction.partyName || "Unknown"},

        // Payment details
        paymentMethod: transaction.paymentMethod || "cash",

        // Reference information
        reference:
          transaction.reference ||
          transaction.referenceNumber ||
          transaction.invoiceNumber ||
          transaction.purchaseNumber ||
          transaction.billNumber ||
          transaction.description ||
          "",

        referenceNumber:
          transaction.referenceNumber ||
          transaction.reference ||
          transaction.invoiceNumber ||
          transaction.purchaseNumber ||
          "",

        // Additional fields
        description: transaction.description || "",
        status: transaction.status || "completed",
        transactionId:
          transaction.transactionId || transaction._id || transaction.id,

        // Bank account info
        bankAccountId: transaction.bankAccountId,

        // Source tracking
        source: transaction.source || "transaction_service",

        // Original data for debugging
        _original: transaction,
      };

      return processedTransaction;
    });
  };

  // ✅ Calculate final summary from all loaded data
  const calculateFinalSummary = () => {
    try {
      // Calculate receivables summary
      const totalReceivables = receivablesData.reduce((sum, r) => {
        const pending =
          r.payment?.pendingAmount || r.pendingAmount || r.balanceAmount || 0;
        return sum + parseFloat(pending);
      }, 0);

      const overdueReceivables = receivablesData
        .filter((r) => r.type === "overdue")
        .reduce((sum, r) => {
          const pending =
            r.payment?.pendingAmount || r.pendingAmount || r.balanceAmount || 0;
          return sum + parseFloat(pending);
        }, 0);

      const dueTodayReceivables = receivablesData
        .filter((r) => r.type === "due_today")
        .reduce((sum, r) => {
          const pending =
            r.payment?.pendingAmount || r.pendingAmount || r.balanceAmount || 0;
          return sum + parseFloat(pending);
        }, 0);

      // Calculate payables summary
      const totalPayables = payablesData.reduce((sum, p) => {
        const pending =
          p.payment?.pendingAmount || p.pendingAmount || p.balanceAmount || 0;
        return sum + parseFloat(pending);
      }, 0);

      const overduePayables = payablesData
        .filter((p) => p.type === "overdue")
        .reduce((sum, p) => {
          const pending =
            p.payment?.pendingAmount || p.pendingAmount || p.balanceAmount || 0;
          return sum + parseFloat(pending);
        }, 0);

      const dueTodayPayables = payablesData
        .filter((p) => p.type === "due_today")
        .reduce((sum, p) => {
          const pending =
            p.payment?.pendingAmount || p.pendingAmount || p.balanceAmount || 0;
          return sum + parseFloat(pending);
        }, 0);

      // Calculate transaction summary
      const totalCashIn = transactionsData
        .filter((t) => t.direction === "in")
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const totalCashOut = transactionsData
        .filter((t) => t.direction === "out")
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const netCashFlow = totalCashIn - totalCashOut;
      const netPosition = totalReceivables - totalPayables;

      const finalSummary = {
        totalReceivables,
        totalPayables,
        overdueReceivables,
        overduePayables,
        dueTodayReceivables,
        dueTodayPayables,
        netPosition,
        totalCashIn,
        totalCashOut,
        netCashFlow,
        totalTransactions: transactionsData.length,
        lastUpdated: new Date().toISOString(),
      };

      setSummaryData(finalSummary);
    } catch (error) {
      // Silent error handling
    }
  };

  // ✅ Refresh data using correct services
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDayBookData();
      addToast?.("Day book data refreshed successfully", "success");
    } catch (error) {
      addToast?.("Failed to refresh day book data", "error");
    } finally {
      setRefreshing(false);
    }
  };

  // ✅ Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // ✅ Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  };

  // ✅ Get priority badge
  const getPriorityBadge = (type) => {
    switch (type) {
      case "overdue":
        return (
          <Badge bg="danger" className="me-2">
            Overdue
          </Badge>
        );
      case "due_today":
        return (
          <Badge bg="warning" className="me-2">
            Due Today
          </Badge>
        );
      case "pending":
        return (
          <Badge bg="secondary" className="me-2">
            Pending
          </Badge>
        );
      default:
        return null;
    }
  };

  // ✅ Handle contact actions
  const handleContact = (party, method) => {
    if (method === "phone" && party.mobile) {
      window.open(`tel:${party.mobile}`);
    } else if (method === "email" && party.email) {
      window.open(`mailto:${party.email}`);
    } else if (method === "reminder") {
      // Handle payment reminder
      addToast?.(`Payment reminder sent to ${party.name}`, "info");
    }
  };

  // ✅ Handle payment actions with proper DayBook context
  const handleReceivePayment = (sale) => {
    onNavigate?.("paymentIn", {
      // ✅ Core navigation data
      invoiceId: sale._id || sale.id,
      saleId: sale._id || sale.id,
      customerId: sale.customer?._id || sale.customer?.id || sale.customerId,
      amount:
        sale.payment?.pendingAmount ||
        sale.pendingAmount ||
        sale.balanceAmount ||
        0,

      // ✅ DayBook context data
      initialSale: sale, // Pass the complete sale object
      source: "daybook", // Indicate this is from DayBook
      isDayBookContext: true, // Explicit flag

      // ✅ Additional context for better integration
      paymentType: "pending", // Force payment against invoice
      autoSelectInvoice: true, // Flag to auto-select

      // ✅ Party information for easier access
      party: sale.customer || {
        _id: sale.customerId,
        id: sale.customerId,
        name: sale.customerName || sale.customer?.name || "Unknown Customer",
      },
    });
  };

  const handleMakePayment = (purchase) => {
    onNavigate?.("paymentOut", {
      // ✅ Core navigation data
      invoiceId: purchase._id || purchase.id,
      purchaseId: purchase._id || purchase.id,
      supplierId:
        purchase.supplier?._id || purchase.supplier?.id || purchase.supplierId,
      amount:
        purchase.payment?.pendingAmount ||
        purchase.pendingAmount ||
        purchase.balanceAmount ||
        0,

      // ✅ DayBook context data
      initialPurchase: purchase, // Pass the complete purchase object
      source: "daybook", // Indicate this is from DayBook
      isDayBookContext: true, // Explicit flag

      // ✅ Additional context for better integration
      paymentType: "pending", // Force payment against invoice
      autoSelectInvoice: true, // Flag to auto-select

      // ✅ Party information for easier access
      party: purchase.supplier || {
        _id: purchase.supplierId,
        id: purchase.supplierId,
        name:
          purchase.supplierName ||
          purchase.supplier?.name ||
          "Unknown Supplier",
      },
    });
  };

  // ✅ Filter data based on search with better field matching
  const filterData = (data) => {
    if (!searchQuery || !data) return data;

    return data.filter((item) => {
      const searchLower = searchQuery.toLowerCase();

      // Search in customer/supplier name
      const partyName =
        item.customer?.name ||
        item.supplier?.name ||
        item.customerName ||
        item.supplierName ||
        item.partyName ||
        "";

      // Search in invoice/purchase numbers
      const invoiceNumber =
        item.invoiceNumber ||
        item.purchaseNumber ||
        item.billNumber ||
        item.number ||
        "";

      // Search in mobile numbers
      const mobile =
        item.customer?.mobile ||
        item.supplier?.mobile ||
        item.customerMobile ||
        item.supplierMobile ||
        item.partyPhone ||
        item.mobileNumber ||
        "";

      return (
        partyName.toLowerCase().includes(searchLower) ||
        invoiceNumber.toLowerCase().includes(searchLower) ||
        mobile.includes(searchQuery) ||
        (item.status && item.status.toLowerCase().includes(searchLower))
      );
    });
  };

  // ✅ Export functions using correct service methods
  const handleExportReceivables = async () => {
    try {
      if (salesService.exportCSV) {
        const blob = await salesService.exportCSV(companyId, {
          type: "receivables",
          date: date,
          format: "csv",
        });

        // Download the blob
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `receivables_${date}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        addToast?.("Receivables exported successfully", "success");
      } else {
        addToast?.("Export feature not available for receivables", "warning");
      }
    } catch (error) {
      addToast?.("Failed to export receivables", "error");
    }
  };

  const handleExportPayables = async () => {
    try {
      if (purchaseService.exportCSV) {
        const blob = await purchaseService.exportCSV(companyId, {
          type: "payables",
          date: date,
          format: "csv",
        });

        // Download the blob
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `payables_${date}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        addToast?.("Payables exported successfully", "success");
      } else {
        addToast?.("Export feature not available for payables", "warning");
      }
    } catch (error) {
      addToast?.("Failed to export payables", "error");
    }
  };

  // ✅ Handle new transaction navigation
  const handleNewTransaction = () => {
    onNavigate?.("saleInvoice");
  };

  // ✅ Loading screen
  if (loading) {
    return (
      <div className="container-fluid px-4">
        <div className="text-center py-5">
          <Spinner animation="border" size="lg" />
          <h5 className="mt-3">Loading DayBook...</h5>
          <p className="text-muted">
            Loading receivables, payables, and transactions...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid px-4">
      {/* Error Alert */}
      {error && (
        <Alert
          variant="danger"
          dismissible
          onClose={() => setError(null)}
          className="mb-4"
        >
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          {error}
        </Alert>
      )}
      {/* Page Banner */}
      <div className="page-banner mb-4">
        <div className="banner-content">
          <div className="banner-icon">💼</div>
          <h5>Track your daily receivables, payables, and cash flow</h5>
          <Button
            variant="light"
            size="sm"
            className="ms-3"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Spinner size="sm" className="me-1" />
            ) : (
              <FontAwesomeIcon icon={faRefresh} className="me-1" />
            )}
            Refresh
          </Button>
        </div>
      </div>
      {/* Page Header */}
      <div className="page-header d-flex align-items-center justify-content-between mb-4">
        <div className="d-flex align-items-center">
          <h1 className="h3 mb-0 text-gray-800 fw-bold">Day Book</h1>
          <span className="video-badge ms-2">
            <FontAwesomeIcon icon={faPlay} className="text-primary" />
          </span>
        </div>

        <div className="d-flex align-items-center">
          {/* Date Picker */}
          <Form.Group className="me-3">
            <InputGroup>
              <Form.Control
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-control-sm"
              />
              <InputGroup.Text>
                <FontAwesomeIcon icon={faCalendarAlt} />
              </InputGroup.Text>
            </InputGroup>
          </Form.Group>

          {/* Search */}
          <InputGroup className="search-bar me-3" style={{width: "250px"}}>
            <Form.Control
              type="text"
              placeholder="Search parties, invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="sm"
            />
            <InputGroup.Text>
              <FontAwesomeIcon icon={faSearch} />
            </InputGroup.Text>
          </InputGroup>

          {/* ✅ HIDDEN: Action Buttons - commented out for now */}
          {/* 
    <div className="d-flex">
      <Button variant="outline-secondary" size="sm" className="me-2">
        <FontAwesomeIcon icon={faPrint} className="me-2" />
        Print
      </Button>
      <Button
        variant="outline-secondary"
        size="sm"
        className="me-2"
        onClick={
          activeTab === "receivables"
            ? handleExportReceivables
            : activeTab === "payables"
            ? handleExportPayables
            : handleExportReceivables
        }
      >
        <FontAwesomeIcon icon={faFileExport} className="me-2" />
        Export
      </Button>
      <Button variant="primary" size="sm" onClick={handleNewTransaction}>
        <FontAwesomeIcon icon={faPlus} className="me-2" />
        New Transaction
      </Button>
    </div>
    */}
        </div>
      </div>

      {/* Summary Cards */}
      <DayBookSummary
        summaryData={summaryData}
        formatCurrency={formatCurrency}
        loading={loading || Object.values(loadingStates).some(Boolean)}
      />
      {/* Main Content */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-4 nav-tabs-custom"
          >
            <Tab
              eventKey="receivables"
              title={
                <span>
                  <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                  Receivables
                  {receivablesData.length > 0 && (
                    <Badge bg="success" className="ms-2">
                      {receivablesData.length}
                    </Badge>
                  )}
                  {loadingStates.receivables && (
                    <Spinner size="sm" className="ms-2" />
                  )}
                </span>
              }
            >
              <ReceivablesTab
                receivables={filterData(receivablesData)}
                loading={loadingStates.receivables}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                getPriorityBadge={getPriorityBadge}
                handleReceivePayment={handleReceivePayment}
                handleContact={handleContact}
                onNavigate={onNavigate}
                companyId={companyId}
                currentCompany={currentCompany}
                currentUser={currentUser}
                addToast={addToast}
                // ✅ Pass DayBook context flags
                isDayBookContext={true}
                source="daybook"
              />
            </Tab>

            <Tab
              eventKey="payables"
              title={
                <span>
                  <FontAwesomeIcon icon={faHandHoldingUsd} className="me-2" />
                  Payables
                  {payablesData.length > 0 && (
                    <Badge bg="primary" className="ms-2">
                      {payablesData.length}
                    </Badge>
                  )}
                  {loadingStates.payables && (
                    <Spinner size="sm" className="ms-2" />
                  )}
                </span>
              }
            >
              <PayablesTab
                payables={filterData(payablesData)}
                loading={loadingStates.payables}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                getPriorityBadge={getPriorityBadge}
                handleMakePayment={handleMakePayment}
                handleContact={handleContact}
                onNavigate={onNavigate}
                companyId={companyId}
                currentCompany={currentCompany}
                currentUser={currentUser}
                addToast={addToast}
                // ✅ Pass DayBook context flags
                isDayBookContext={true}
                source="daybook"
              />
            </Tab>

            <Tab
              eventKey="transactions"
              title={
                <span>
                  <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                  Daily Transactions
                  {transactionsData.length > 0 && (
                    <Badge bg="info" className="ms-2">
                      {transactionsData.length}
                    </Badge>
                  )}
                  {loadingStates.transactions && (
                    <Spinner size="sm" className="ms-2" />
                  )}
                </span>
              }
            >
              <DailyTransactionsTab
                transactions={transactionsData}
                loading={loadingStates.transactions}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                onNavigate={onNavigate}
                date={date}
                companyId={companyId}
                addToast={addToast}
              />
            </Tab>

            <Tab
              eventKey="cashbank"
              title={
                <span>
                  <FontAwesomeIcon icon={faBuilding} className="me-2" />
                  Cash & Bank
                  {bankAccountsData.length > 0 && (
                    <Badge bg="secondary" className="ms-2">
                      {bankAccountsData.length}
                    </Badge>
                  )}
                  {loadingStates.bankAccounts && (
                    <Spinner size="sm" className="ms-2" />
                  )}
                </span>
              }
            >
              <CashBankTab
                bankBalances={bankAccountsData}
                formatCurrency={formatCurrency}
                onNavigate={onNavigate}
                companyId={companyId}
                date={date}
                addToast={addToast}
              />
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
      {/* Footer Information */}
      {summaryData.lastUpdated && (
        <Row>
          <Col>
            <small className="text-muted">
              Last updated:{" "}
              {new Date(summaryData.lastUpdated).toLocaleString("en-IN")}
            </small>
          </Col>
        </Row>
      )}
    </div>
  );
}

export default DayBook;
