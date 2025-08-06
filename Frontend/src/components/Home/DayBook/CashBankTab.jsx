import React, {useState, useEffect, useCallback} from "react";
import {Row, Col, Card, Button, Spinner, Alert, Badge} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faPlus,
  faWallet,
  faUniversity,
  faRefresh,
  faEye,
  faExclamationTriangle,
  faChartLine,
  faCreditCard,
  faHistory,
} from "@fortawesome/free-solid-svg-icons";
import PropTypes from "prop-types";

// ✅ FIXED: Use JavaScript default parameters instead of defaultProps
function CashBankTab({
  bankBalances = [],
  formatCurrency,
  onNavigate,
  companyId,
  date,
  className = "",
}) {
  // State management
  const [localBankAccounts, setLocalBankAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load bank accounts with proper error handling
  const loadBankAccounts = useCallback(
    async (isRefresh = false) => {
      if (!companyId) {
        setError("Company ID is required to load bank accounts");
        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        // Simulate API call - replace with actual bankAccountService call
        const mockAccounts = [
          {
            _id: "acc1",
            bankName: "SBI Main Branch",
            accountName: "Business Current Account",
            accountNumber: "123456789012",
            branch: "Main Branch",
            type: "bank",
            currentBalance: 50000,
            balanceLastUpdated: new Date().toISOString(),
          },
          {
            _id: "acc2",
            bankName: "Cash on Hand",
            accountName: "Office Cash",
            accountNumber: "CASH",
            type: "cash",
            isCash: true,
            currentBalance: 5000,
            balanceLastUpdated: new Date().toISOString(),
          },
        ];

        setLocalBankAccounts(mockAccounts);
      } catch (error) {
        console.error("Error loading bank accounts:", error);
        setError(error.message || "Failed to load bank accounts");
        setLocalBankAccounts([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId]
  );

  // Initialize data on mount or when dependencies change
  useEffect(() => {
    if (!bankBalances || bankBalances.length === 0) {
      loadBankAccounts();
    } else {
      setLocalBankAccounts(bankBalances);
    }
  }, [bankBalances, loadBankAccounts]);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    await loadBankAccounts(true);
  }, [loadBankAccounts]);

  // Get account icon based on type
  const getAccountIcon = useCallback((account) => {
    if (account.type === "cash" || account.isCash) {
      return <FontAwesomeIcon icon={faWallet} className="text-success me-2" />;
    }
    return (
      <FontAwesomeIcon icon={faUniversity} className="text-primary me-2" />
    );
  }, []);

  // Get account type badge
  const getAccountTypeBadge = useCallback((account) => {
    if (account.type === "cash" || account.isCash) {
      return <Badge bg="success">Cash</Badge>;
    }
    return <Badge bg="primary">Bank</Badge>;
  }, []);

  // Format account number with proper masking
  const formatAccountNumber = useCallback((accountNumber) => {
    if (!accountNumber || accountNumber === "CASH" || accountNumber === "N/A") {
      return "CASH";
    }

    if (accountNumber.length > 4) {
      return "••••" + accountNumber.slice(-4);
    }

    return accountNumber;
  }, []);

  // Handle view account details
  const handleViewAccount = useCallback(
    (account) => {
      if (onNavigate) {
        onNavigate("bankAccountDetails", {accountId: account._id});
      }
    },
    [onNavigate]
  );

  // Handle add transaction
  const handleAddTransaction = useCallback(
    (account) => {
      if (onNavigate) {
        onNavigate("addTransaction", {
          accountId: account._id,
          accountType: account.type,
          accountName: account.accountName || account.name,
        });
      }
    },
    [onNavigate]
  );

  // Determine which accounts to display
  const accountsToDisplay =
    localBankAccounts.length > 0 ? localBankAccounts : bankBalances;

  // Calculate summary statistics
  const stats = React.useMemo(() => {
    const accounts = accountsToDisplay;
    const bankAccounts = accounts.filter(
      (acc) => acc.type === "bank" || acc.isBank
    );
    const cashAccounts = accounts.filter(
      (acc) => acc.type === "cash" || acc.isCash
    );
    const totalBalance = accounts.reduce(
      (sum, acc) => sum + (acc.currentBalance || acc.balance || 0),
      0
    );

    return {
      total: accounts.length,
      bank: bankAccounts.length,
      cash: cashAccounts.length,
      totalBalance,
    };
  }, [accountsToDisplay]);

  // Loading state
  if (loading && !refreshing) {
    return (
      <div className={`cash-bank-tab ${className}`}>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <h5 className="mt-3 text-muted">Loading Bank Accounts...</h5>
          <p className="text-muted small">Fetching account balances...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && accountsToDisplay.length === 0) {
    return (
      <div className={`cash-bank-tab ${className}`}>
        <Alert variant="danger" className="mb-4">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              <strong>Error:</strong> {error}
            </div>
            <Button variant="outline-danger" size="sm" onClick={handleRefresh}>
              <FontAwesomeIcon icon={faRefresh} className="me-1" />
              Retry
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`cash-bank-tab ${className}`}>
      {/* Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <FontAwesomeIcon icon={faBuilding} className="text-primary me-2" />
          <h5 className="mb-0 fw-semibold">Cash & Bank Accounts</h5>
          {date && (
            <small className="text-muted ms-2">
              as of {new Date(date).toLocaleDateString()}
            </small>
          )}
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <FontAwesomeIcon
              icon={faRefresh}
              className={`me-1 ${refreshing ? "fa-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate?.("bankAccounts")}
          >
            <FontAwesomeIcon icon={faPlus} className="me-1" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Error Alert (if accounts exist but there's an error) */}
      {error && accountsToDisplay.length > 0 && (
        <Alert variant="warning" className="mb-3">
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          {error}
        </Alert>
      )}

      {/* Account Cards */}
      {accountsToDisplay.length > 0 && (
        <Row className="g-3 mb-4">
          {accountsToDisplay.map((account, index) => (
            <Col
              lg={4}
              md={6}
              key={account._id || account.id || `account-${index}`}
            >
              <Card className="h-100 border-0 shadow-sm account-card">
                <Card.Body className="d-flex flex-column">
                  {/* Account Header */}
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="d-flex align-items-center flex-grow-1 min-w-0">
                      {getAccountIcon(account)}
                      <h6 className="mb-0 fw-bold text-truncate">
                        {account.bankName || account.name || "Unknown Account"}
                      </h6>
                    </div>
                    {getAccountTypeBadge(account)}
                  </div>

                  {/* Balance Display */}
                  <div className="mb-3">
                    <h4 className="mb-1 text-primary fw-bold">
                      {formatCurrency
                        ? formatCurrency(
                            account.currentBalance || account.balance || 0
                          )
                        : `₹${(
                            account.currentBalance ||
                            account.balance ||
                            0
                          ).toLocaleString()}`}
                    </h4>
                    <small className="text-muted">Current Balance</small>
                  </div>

                  {/* Account Details */}
                  <div className="flex-grow-1 mb-3">
                    {account.accountName && (
                      <div className="mb-1">
                        <small className="text-muted d-block">
                          <strong>Account Name:</strong>
                        </small>
                        <small className="text-truncate d-block">
                          {account.accountName}
                        </small>
                      </div>
                    )}

                    <div className="mb-1">
                      <small className="text-muted d-block">
                        <strong>Account Number:</strong>
                      </small>
                      <small className="font-monospace">
                        {formatAccountNumber(account.accountNumber)}
                      </small>
                    </div>

                    {account.branch && (
                      <div className="mb-1">
                        <small className="text-muted d-block">
                          <strong>Branch:</strong>
                        </small>
                        <small className="text-truncate d-block">
                          {account.branch}
                        </small>
                      </div>
                    )}

                    {account.balanceLastUpdated && (
                      <div className="mb-1">
                        <small className="text-muted d-block">
                          <strong>Last Updated:</strong>
                        </small>
                        <small className="text-muted">
                          {new Date(account.balanceLastUpdated).toLocaleString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </small>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="d-flex gap-2 mt-auto">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="flex-fill"
                      onClick={() => handleViewAccount(account)}
                    >
                      <FontAwesomeIcon icon={faEye} className="me-1" />
                      View
                    </Button>
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => handleAddTransaction(account)}
                      title="Add Transaction"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() =>
                        onNavigate?.("accountHistory", {
                          accountId: account._id,
                        })
                      }
                      title="View History"
                    >
                      <FontAwesomeIcon icon={faHistory} />
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Empty State */}
      {accountsToDisplay.length === 0 && !loading && !error && (
        <div className="text-center py-5">
          <div className="mb-4">
            <FontAwesomeIcon
              icon={faBuilding}
              size="3x"
              className="text-muted mb-3"
            />
            <h5 className="text-muted mb-2">No Bank Accounts Found</h5>
            <p className="text-muted mb-0">
              Add bank accounts to track your cash flow and manage payments
              effectively.
            </p>
          </div>
          <div className="d-flex gap-2 justify-content-center flex-wrap">
            <Button
              variant="primary"
              onClick={() => onNavigate?.("bankAccounts")}
            >
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              Add Bank Account
            </Button>
            <Button
              variant="outline-primary"
              onClick={() => onNavigate?.("addTransaction", {type: "cash"})}
            >
              <FontAwesomeIcon icon={faWallet} className="me-2" />
              Add Cash Transaction
            </Button>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      {accountsToDisplay.length > 0 && (
        <Card className="border-0 bg-light summary-card">
          <Card.Body className="py-3">
            <Row className="text-center g-3">
              <Col xs={6} md={3}>
                <div className="d-flex flex-column">
                  <FontAwesomeIcon
                    icon={faChartLine}
                    className="text-primary mb-1"
                  />
                  <small className="text-muted mb-1">Total Accounts</small>
                  <h5 className="mb-0 fw-bold">{stats.total}</h5>
                </div>
              </Col>
              <Col xs={6} md={3}>
                <div className="d-flex flex-column">
                  <FontAwesomeIcon
                    icon={faUniversity}
                    className="text-primary mb-1"
                  />
                  <small className="text-muted mb-1">Bank Accounts</small>
                  <h5 className="mb-0 fw-bold">{stats.bank}</h5>
                </div>
              </Col>
              <Col xs={6} md={3}>
                <div className="d-flex flex-column">
                  <FontAwesomeIcon
                    icon={faWallet}
                    className="text-success mb-1"
                  />
                  <small className="text-muted mb-1">Cash Accounts</small>
                  <h5 className="mb-0 fw-bold">{stats.cash}</h5>
                </div>
              </Col>
              <Col xs={6} md={3}>
                <div className="d-flex flex-column">
                  <FontAwesomeIcon
                    icon={faCreditCard}
                    className="text-success mb-1"
                  />
                  <small className="text-muted mb-1">Total Balance</small>
                  <h5 className="mb-0 fw-bold text-primary">
                    {formatCurrency
                      ? formatCurrency(stats.totalBalance)
                      : `₹${stats.totalBalance.toLocaleString()}`}
                  </h5>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Component Styles */}
      <style>{`
        .cash-bank-tab {
          min-height: 200px;
        }

        .account-card {
          transition: all 0.2s ease;
          border-radius: 8px;
        }

        .account-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        }

        .summary-card {
          border-radius: 8px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }

        .min-w-0 {
          min-width: 0;
        }

        .text-truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .font-monospace {
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        }

        @media (max-width: 768px) {
          .account-card .btn {
            font-size: 0.75rem;
            padding: 0.25rem 0.5rem;
          }

          .account-card h6 {
            font-size: 0.9rem;
          }

          .account-card h4 {
            font-size: 1.1rem;
          }
        }
      `}</style>
    </div>
  );
}

// ✅ UPDATED: Keep PropTypes for development assistance
CashBankTab.propTypes = {
  bankBalances: PropTypes.array,
  formatCurrency: PropTypes.func,
  onNavigate: PropTypes.func,
  companyId: PropTypes.string,
  date: PropTypes.string,
  className: PropTypes.string,
};

// ✅ REMOVED: defaultProps (replaced with default parameters in function signature)
// CashBankTab.defaultProps = {
//   bankBalances: [],
//   className: "",
// };

export default CashBankTab;
