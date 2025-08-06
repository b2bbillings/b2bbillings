import React, {useState, useEffect, useCallback} from "react";
import {Card} from "react-bootstrap";
import {useNavigate} from "react-router-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faExchangeAlt,
  faDownload,
  faUpload,
  faFileInvoiceDollar,
  faShoppingCart,
  faFileContract,
  faChartBar,
  faCalculator,
  faUsers,
  faBoxes,
  faCreditCard,
  faChartLine,
  faSpinner,
  faExclamationTriangle,
  faRefresh,
} from "@fortawesome/free-solid-svg-icons";

// Import services for real data fetching
import transactionService from "../../services/transactionService";
import salesService from "../../services/salesService";
import purchaseService from "../../services/purchaseService";
import paymentService from "../../services/paymentService";
import bankAccountService from "../../services/bankAccountService";
import partyService from "../../services/partyService";

// Embedded CSS styles
const styles = `
/* Daily Transactions Styles */
.daily-transactions {
  width: 100%;
  height: fit-content;
}

.daily-section {
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 1.5rem;
  height: fit-content;
  max-height: calc(100vh - 130px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-top: 1rem;
}

.dashboard-layout .daily-transactions .daily-section {
  margin-top: 0;
}

.single-view .daily-transactions .daily-section {
  margin-top: 1rem;
}

.section-header {
  margin-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.75rem;
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header-content h2 {
  color: #1e293b;
  font-size: 1.4rem;
  margin-bottom: 0.25rem;
  font-weight: 600;
}

.section-header-content p {
  color: #64748b;
  margin: 0;
  font-size: 0.9rem;
}

.refresh-button {
  background: none;
  border: none;
  color: #64748b;
  font-size: 1.1rem;
  padding: 0.5rem;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-button:hover {
  color: #2563eb;
  background-color: #f1f5f9;
}

.refresh-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quick-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: #f1f5f9;
  border-radius: 6px;
  flex-shrink: 0;
  position: relative;
}

.stats-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
  color: #64748b;
  font-size: 0.9rem;
  gap: 0.5rem;
  grid-column: 1 / -1;
}

.stats-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
  color: #dc2626;
  font-size: 0.9rem;
  gap: 0.5rem;
  grid-column: 1 / -1;
  cursor: pointer;
}

.stats-error:hover {
  color: #b91c1c;
}

.stat-item {
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0.25rem;
  border-radius: 4px;
}

.stat-item:hover {
  background-color: rgba(255, 255, 255, 0.7);
  transform: translateY(-1px);
}

.stat-item.loading {
  opacity: 0.6;
  pointer-events: none;
}

.stat-value {
  font-size: 1rem;
  font-weight: 700;
  color: #2563eb;
  margin-bottom: 0.1rem;
}

.stat-label {
  font-size: 0.7rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  padding-right: 0.5rem;
  align-content: start;
  overflow-y: auto;
  flex: 1;
}

.action-card {
  background-color: #f8fafc;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid #e2e8f0;
  position: relative;
  overflow: hidden;
  height: 120px;
}

.action-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  border-color: #2563eb;
  background-color: #ffffff;
}

.action-card:hover .action-icon {
  background-color: #2563eb;
  color: white;
  transform: scale(1.05);
}

.action-card:hover h3 {
  color: #2563eb;
}

.action-icon {
  width: 40px;
  height: 40px;
  background-color: #dbeafe;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  color: #2563eb;
  font-size: 1.1rem;
  transition: all 0.3s ease;
}

.action-card h3 {
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
  color: #1e293b;
  font-weight: 600;
  transition: color 0.3s ease;
  line-height: 1.2;
}

.action-card p {
  font-size: 0.75rem;
  color: #64748b;
  margin: 0;
  line-height: 1.3;
}

.action-card.primary {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  border-color: #2563eb;
}

.action-card.primary .action-icon {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.action-card.primary h3 {
  color: white;
}

.action-card.primary p {
  color: rgba(255, 255, 255, 0.9);
}

.action-card.primary:hover {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
  transform: translateY(-4px);
}

.action-card.success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-color: #10b981;
}

.action-card.success .action-icon {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.action-card.success h3 {
  color: white;
}

.action-card.success p {
  color: rgba(255, 255, 255, 0.9);
}

.action-card.success:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-4px);
}

.action-card.warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border-color: #f59e0b;
}

.action-card.warning .action-icon {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.action-card.warning h3 {
  color: white;
}

.action-card.warning p {
  color: rgba(255, 255, 255, 0.9);
}

.action-card.warning:hover {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  transform: translateY(-4px);
}

.action-card.coming-soon {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: #f1f5f9;
  border-color: #cbd5e1;
}

.action-card.coming-soon .action-icon {
  background-color: #e2e8f0;
  color: #64748b;
}

.action-card.coming-soon h3 {
  color: #64748b;
}

.action-card.coming-soon p {
  color: #94a3b8;
}

.action-card.coming-soon:hover {
  transform: none;
  box-shadow: none;
  border-color: #cbd5e1;
  background-color: #f1f5f9;
}

.action-card.coming-soon:hover .action-icon {
  background-color: #e2e8f0;
  color: #64748b;
  transform: none;
}

.action-card.coming-soon:hover h3 {
  color: #64748b;
}

.action-card.loading {
  pointer-events: none;
  opacity: 0.7;
}

.action-card.loading .action-icon {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.refresh-button.loading svg {
  animation: spin 1s linear infinite;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .actions-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 0.875rem;
  }
}

@media (max-width: 992px) {
  .daily-section {
    max-height: 600px;
    margin-top: 0.5rem;
  }
  
  .actions-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.75rem;
  }
  
  .action-card {
    padding: 0.875rem;
    height: 110px;
  }
  
  .action-icon {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }
}

@media (max-width: 768px) {
  .actions-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
  
  .section-header-content h2 {
    font-size: 1.2rem;
  }
  
  .quick-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .daily-section {
    margin-top: 0.25rem;
  }
  
  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
}

@media (max-width: 576px) {
  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
  
  .action-card {
    padding: 0.75rem 0.5rem;
    height: 95px;
  }
  
  .action-card h3 {
    font-size: 0.8rem;
  }
  
  .action-card p {
    font-size: 0.7rem;
  }
  
  .daily-section {
    padding: 1rem;
  }
}

.actions-grid::-webkit-scrollbar {
  width: 4px;
}

.actions-grid::-webkit-scrollbar-track {
  background-color: #f1f1f1;
  border-radius: 10px;
}

.actions-grid::-webkit-scrollbar-thumb {
  background-color: #c1c1c1;
  border-radius: 10px;
}

.actions-grid::-webkit-scrollbar-thumb:hover {
  background-color: #a8a8a8;
}
`;

function DailyTransaction({
  currentUser,
  currentCompany,
  onNavigate,
  addToast,
  isOnline = true,
}) {
  const navigate = useNavigate();
  const [loadingAction, setLoadingAction] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [refreshingStats, setRefreshingStats] = useState(false);

  // ✅ PRODUCTION: Real data state
  const [quickStats, setQuickStats] = useState([
    {
      label: "Today's Sales",
      value: "₹0",
      color: "#10b981",
      path: "/sales",
      loading: true,
    },
    {
      label: "Pending Due",
      value: "₹0",
      color: "#f59e0b",
      path: "/parties",
      loading: true,
    },
    {
      label: "Total Balance",
      value: "₹0",
      color: "#2563eb",
      path: "/bank-accounts",
      loading: true,
    },
    {
      label: "Today's Profit",
      value: "₹0",
      color: "#8b5cf6",
      path: "/transactions",
      loading: true,
    },
  ]);

  // Helper function to format currency
  const formatCurrency = useCallback((amount) => {
    const numAmount = parseFloat(amount) || 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  }, []);

  // Helper function to build company-based routes
  const buildRoute = useCallback(
    (path) => {
      if (!currentCompany?.id) {
        return path;
      }
      return `/companies/${currentCompany.id}${path}`;
    },
    [currentCompany?.id]
  );

  // Inject styles into the document
  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);

    return () => {
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  // ✅ PRODUCTION: Load real dashboard stats from services
  const loadDashboardStats = useCallback(
    async (isRefresh = false) => {
      if (!currentCompany?.id || !isOnline) {
        setLoadingStats(false);
        return;
      }

      if (isRefresh) {
        setRefreshingStats(true);
      } else {
        setLoadingStats(true);
      }
      setStatsError(null);

      try {
        const today = new Date().toISOString().split("T")[0];
        const companyId = currentCompany.id;

        // ✅ FIXED: Get today's sales
        const getSalesData = async () => {
          try {
            const salesResponse = await salesService.getSales(companyId, {
              dateFrom: today,
              dateTo: today,
              limit: 1000,
            });

            if (salesResponse.success && salesResponse.data?.sales) {
              const todaysSales = salesResponse.data.sales.reduce(
                (total, sale) => {
                  return (
                    total +
                    (parseFloat(sale.finalTotal) ||
                      parseFloat(sale.total) ||
                      parseFloat(sale.grandTotal) ||
                      0)
                  );
                },
                0
              );
              return todaysSales;
            }
            return 0;
          } catch (error) {
            return 0;
          }
        };

        // ✅ FIXED: Get pending dues from parties with corrected parameters
        const getPendingDues = async () => {
          try {
            // ✅ Use minimal, correct parameters
            const partiesResponse = await partyService.getParties(companyId, {
              page: 1,
              limit: 100, // Reduced limit for better performance
              sortBy: "name", // Simple, universally supported field
              sortOrder: "asc",
            });

            if (partiesResponse.success && partiesResponse.data?.parties) {
              const totalDues = partiesResponse.data.parties.reduce(
                (total, party) => {
                  // Try multiple balance field names
                  const balance =
                    parseFloat(party.currentBalance) ||
                    parseFloat(party.balance) ||
                    parseFloat(party.outstandingAmount) ||
                    parseFloat(party.totalBalance) ||
                    0;

                  // Only count positive balances as dues (money owed to you)
                  return total + Math.max(0, balance);
                },
                0
              );
              return totalDues;
            }
            return 0;
          } catch (error) {
            // ✅ Fallback: Try without company ID
            try {
              const fallbackResponse = await partyService.getParties({
                page: 1,
                limit: 100,
                sortBy: "name",
                sortOrder: "asc",
              });

              if (fallbackResponse.success && fallbackResponse.data?.parties) {
                const totalDues = fallbackResponse.data.parties.reduce(
                  (total, party) => {
                    const balance =
                      parseFloat(party.currentBalance) ||
                      parseFloat(party.balance) ||
                      parseFloat(party.outstandingAmount) ||
                      0;
                    return total + Math.max(0, balance);
                  },
                  0
                );
                return totalDues;
              }
            } catch (fallbackError) {
              // Ignore fallback error
            }
            return 0;
          }
        };

        // ✅ FIXED: Get total bank balances
        const getTotalBalance = async () => {
          try {
            const bankResponse =
              await bankAccountService.getAllAccountsWithBalances(companyId);

            if (bankResponse.success && bankResponse.accounts) {
              const totalBalance = bankResponse.accounts.reduce(
                (total, account) => {
                  return (
                    total +
                    (parseFloat(account.currentBalance) ||
                      parseFloat(account.balance) ||
                      parseFloat(account.availableBalance) ||
                      0)
                  );
                },
                0
              );
              return totalBalance;
            }
            return 0;
          } catch (error) {
            // ✅ Fallback: Try basic bank accounts endpoint
            try {
              const fallbackResponse = await bankAccountService.getBankAccounts(
                companyId
              );
              if (
                fallbackResponse.success &&
                fallbackResponse.data?.bankAccounts
              ) {
                const totalBalance = fallbackResponse.data.bankAccounts.reduce(
                  (total, account) => {
                    return total + (parseFloat(account.currentBalance) || 0);
                  },
                  0
                );
                return totalBalance;
              }
            } catch (fallbackError) {
              // Ignore fallback error
            }
            return 0;
          }
        };

        // ✅ FIXED: Get today's profit (simplified calculation)
        const getTodaysProfit = async () => {
          try {
            // Try to get today's transaction summary
            const transactionResponse =
              await transactionService.getTodaysTransactionSummary(companyId);

            if (transactionResponse.success && transactionResponse.data) {
              const netAmount =
                transactionResponse.data.netAmount ||
                transactionResponse.data.profit ||
                transactionResponse.data.totalIncome ||
                0;
              return Math.max(0, netAmount); // Show positive profit only
            }

            // ✅ Fallback: Calculate from today's transactions
            const transactionsResponse =
              await transactionService.getTransactions(companyId, {
                dateFrom: today,
                dateTo: today,
                limit: 1000,
              });

            if (
              transactionsResponse.success &&
              transactionsResponse.data?.transactions
            ) {
              const profit = transactionsResponse.data.transactions.reduce(
                (total, txn) => {
                  const amount = parseFloat(txn.amount) || 0;
                  // Credit transactions are income, debit are expenses
                  return txn.type === "credit"
                    ? total + amount
                    : total - amount;
                },
                0
              );
              return Math.max(0, profit);
            }

            return 0;
          } catch (error) {
            return 0;
          }
        };

        // ✅ Execute all data fetching in parallel with timeout
        const dataPromises = [
          getSalesData(),
          getPendingDues(),
          getTotalBalance(),
          getTodaysProfit(),
        ];

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 10000)
        );

        const results = await Promise.race([
          Promise.allSettled(dataPromises),
          timeoutPromise,
        ]);

        const [salesAmount, pendingDues, totalBalance, todaysProfit] = results;

        // ✅ Update stats with real data
        setQuickStats([
          {
            label: "Today's Sales",
            value: formatCurrency(
              salesAmount.status === "fulfilled" ? salesAmount.value : 0
            ),
            color: "#10b981",
            path: "/sales",
            loading: false,
          },
          {
            label: "Pending Due",
            value: formatCurrency(
              pendingDues.status === "fulfilled" ? pendingDues.value : 0
            ),
            color: "#f59e0b",
            path: "/parties",
            loading: false,
          },
          {
            label: "Total Balance",
            value: formatCurrency(
              totalBalance.status === "fulfilled" ? totalBalance.value : 0
            ),
            color: "#2563eb",
            path: "/bank-accounts",
            loading: false,
          },
          {
            label: "Today's Profit",
            value: formatCurrency(
              todaysProfit.status === "fulfilled" ? todaysProfit.value : 0
            ),
            color: "#8b5cf6",
            path: "/transactions",
            loading: false,
          },
        ]);

        setLoadingStats(false);
        setRefreshingStats(false);
      } catch (error) {
        const errorMessage =
          error.message === "Timeout"
            ? "Request timed out. Please try again."
            : "Failed to load dashboard data";

        setStatsError(errorMessage);
        setLoadingStats(false);
        setRefreshingStats(false);

        // Show fallback data
        setQuickStats((prev) =>
          prev.map((stat) => ({
            ...stat,
            loading: false,
            value: "₹0",
          }))
        );

        if (addToast && !isRefresh) {
          addToast("Failed to load dashboard statistics", "warning");
        }
      }
    },
    [currentCompany?.id, isOnline, formatCurrency, addToast]
  );

  // Load dashboard stats on component mount and company change
  useEffect(() => {
    loadDashboardStats();
  }, [loadDashboardStats]);

  // ✅ PRODUCTION: Action cards configuration with implemented features first
  const actionCards = [
    // IMPLEMENTED FEATURES (TOP PRIORITY)
    {
      id: "transactions",
      title: "Daily Transactions",
      description: "Record daily financial activities",
      icon: faExchangeAlt,
      variant: "primary",
      path: "/transactions",
      implemented: true,
    },
    {
      id: "payment-in",
      title: "Payment In",
      description: "Receive and record payments",
      icon: faDownload,
      variant: "success",
      path: "/parties",
      implemented: true,
    },
    {
      id: "payment-out",
      title: "Payment Out",
      description: "Make payments to vendors",
      icon: faUpload,
      variant: "warning",
      path: "/parties",
      implemented: true,
    },
    {
      id: "invoice",
      title: "Create Invoice",
      description: "Generate customer invoices",
      icon: faFileInvoiceDollar,
      variant: "default",
      path: "/sales/add",
      implemented: true,
    },
    {
      id: "purchase",
      title: "Create Purchase",
      description: "Record purchase orders",
      icon: faShoppingCart,
      variant: "default",
      path: "/purchases/add",
      implemented: true,
    },
    {
      id: "quotation",
      title: "Quotation",
      description: "Create price quotations",
      icon: faFileContract,
      variant: "default",
      path: "/sales-orders/add",
      implemented: true,
    },
    {
      id: "parties",
      title: "Parties",
      description: "Manage customers & vendors",
      icon: faUsers,
      variant: "default",
      path: "/parties",
      implemented: true,
    },
    {
      id: "products",
      title: "Products",
      description: "Manage product inventory",
      icon: faBoxes,
      variant: "default",
      path: "/items",
      implemented: true,
    },
    {
      id: "bank-accounts",
      title: "Bank Accounts",
      description: "Manage bank transactions",
      icon: faCreditCard,
      variant: "default",
      path: "/bank-accounts",
      implemented: true,
    },

    // NOT IMPLEMENTED YET (BOTTOM - COMING SOON)
    {
      id: "expenses",
      title: "Expenses",
      description: "Track business expenses (Coming Soon)",
      icon: faCalculator,
      variant: "coming-soon",
      path: "/expenses",
      implemented: false,
    },
    {
      id: "reports",
      title: "Reports",
      description: "Generate financial reports (Coming Soon)",
      icon: faChartBar,
      variant: "coming-soon",
      path: "/reports",
      implemented: false,
    },
    {
      id: "insights",
      title: "Business Insights",
      description: "View analytics & trends (Coming Soon)",
      icon: faChartLine,
      variant: "coming-soon",
      path: "/insights",
      implemented: false,
    },
  ];

  const handleActionClick = async (actionId, path, implemented) => {
    if (loadingAction || !isOnline) return;

    // If feature is not implemented, show coming soon message
    if (!implemented) {
      if (addToast) {
        addToast(
          `${
            actionCards.find((card) => card.id === actionId)?.title
          } feature is coming soon!`,
          "info"
        );
      }
      return;
    }

    setLoadingAction(actionId);

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const fullRoute = buildRoute(path);
      navigate(fullRoute);
    } catch (error) {
      if (addToast) {
        addToast("Navigation failed. Please try again.", "error");
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleStatClick = useCallback(
    (path) => {
      if (path && !loadingStats && !refreshingStats) {
        const fullRoute = buildRoute(path);
        navigate(fullRoute);
      }
    },
    [buildRoute, navigate, loadingStats, refreshingStats]
  );

  const handleRefreshStats = useCallback(() => {
    if (!refreshingStats && !loadingStats) {
      loadDashboardStats(true);
    }
  }, [loadDashboardStats, refreshingStats, loadingStats]);

  const handleStatsErrorClick = useCallback(() => {
    handleRefreshStats();
  }, [handleRefreshStats]);

  return (
    <div className="daily-transactions">
      <Card className="daily-section">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-header-content">
            <h2>Daily Transactions</h2>
            <p>Manage your financial operations efficiently</p>
          </div>
          <button
            className={`refresh-button ${refreshingStats ? "loading" : ""}`}
            onClick={handleRefreshStats}
            disabled={refreshingStats || loadingStats}
            title="Refresh dashboard data"
          >
            <FontAwesomeIcon icon={faRefresh} />
          </button>
        </div>

        {/* Quick Stats - Real Data */}
        <div className="quick-stats">
          {loadingStats ? (
            <div className="stats-loading">
              <FontAwesomeIcon icon={faSpinner} spin />
              Loading dashboard data...
            </div>
          ) : statsError ? (
            <div
              className="stats-error"
              onClick={handleStatsErrorClick}
              title="Click to retry"
            >
              <FontAwesomeIcon icon={faExclamationTriangle} />
              {statsError} (Click to retry)
            </div>
          ) : (
            quickStats.map((stat, index) => (
              <div
                key={index}
                className={`stat-item ${stat.loading ? "loading" : ""}`}
                onClick={() => !stat.loading && handleStatClick(stat.path)}
                title={
                  !stat.loading
                    ? `Click to view ${stat.label.toLowerCase()}`
                    : "Loading..."
                }
              >
                <div className="stat-value" style={{color: stat.color}}>
                  {stat.loading ? (
                    <FontAwesomeIcon icon={faSpinner} spin size="sm" />
                  ) : (
                    stat.value
                  )}
                </div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))
          )}
        </div>

        {/* Actions Grid - Reordered with implemented features first */}
        <div className="actions-grid">
          {actionCards.map((card) => (
            <div
              key={card.id}
              className={`action-card ${card.variant} ${
                loadingAction === card.id ? "loading" : ""
              }`}
              onClick={() =>
                handleActionClick(card.id, card.path, card.implemented)
              }
              title={
                card.implemented
                  ? `Navigate to ${card.title}`
                  : `${card.title} - Coming Soon`
              }
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleActionClick(card.id, card.path, card.implemented);
                }
              }}
            >
              <div className="action-icon">
                {loadingAction === card.id ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  <FontAwesomeIcon icon={card.icon} />
                )}
              </div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default DailyTransaction;
