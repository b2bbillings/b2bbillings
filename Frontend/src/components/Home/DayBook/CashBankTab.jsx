import React, {useState, useEffect} from "react";
import {Row, Col, Card, Button, Spinner, Alert} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faPlus,
  faWallet,
  faUniversity,
  faRefresh,
  faEye,
} from "@fortawesome/free-solid-svg-icons";
import bankAccountService from "../../../services/bankAccountService";

function CashBankTab({
  bankBalances = [],
  formatCurrency,
  onNavigate,
  companyId,
  date,
}) {
  const [localBankAccounts, setLocalBankAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ Load bank accounts if not provided via props
  useEffect(() => {
    if (!bankBalances || bankBalances.length === 0) {
      loadBankAccounts();
    } else {
      setLocalBankAccounts(bankBalances);
    }
  }, [bankBalances, companyId]);

  // ✅ Load bank accounts using the service
  const loadBankAccounts = async () => {
    if (!companyId) {
      console.warn("No company ID provided for bank accounts");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("🏦 Loading bank accounts for CashBankTab:", companyId);

      const response = await bankAccountService.getAllAccountsWithBalances(
        companyId
      );

      if (response.success) {
        const accounts = response.accounts || response.data?.accounts || [];
        setLocalBankAccounts(accounts);
        console.log("✅ Bank accounts loaded:", accounts.length);
      } else {
        throw new Error(response.message || "Failed to load bank accounts");
      }
    } catch (error) {
      console.error("❌ Error loading bank accounts:", error);
      setError(error.message || "Failed to load bank accounts");
      setLocalBankAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle refresh
  const handleRefresh = async () => {
    await loadBankAccounts();
  };

  // ✅ Get account icon based on type
  const getAccountIcon = (account) => {
    if (account.type === "cash" || account.isCash) {
      return <FontAwesomeIcon icon={faWallet} className="text-success me-2" />;
    }
    return <FontAwesomeIcon icon={faUniversity} className="text-info me-2" />;
  };

  // ✅ Get account type badge
  const getAccountTypeBadge = (account) => {
    if (account.type === "cash" || account.isCash) {
      return <span className="badge bg-success ms-2">Cash</span>;
    }
    return <span className="badge bg-info ms-2">Bank</span>;
  };

  // ✅ Format account number with masking
  const formatAccountNumber = (accountNumber) => {
    if (!accountNumber || accountNumber === "CASH" || accountNumber === "N/A") {
      return "CASH";
    }

    if (accountNumber.length > 4) {
      return "****" + accountNumber.slice(-4);
    }

    return accountNumber;
  };

  // ✅ Handle view account details
  const handleViewAccount = (account) => {
    onNavigate?.("bankAccountDetails", {accountId: account._id});
  };

  // ✅ Use local accounts or props
  const accountsToDisplay =
    localBankAccounts.length > 0 ? localBankAccounts : bankBalances;

  // ✅ Loading state
  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" size="lg" />
        <h5 className="mt-3">Loading Bank Accounts...</h5>
        <p className="text-muted">Fetching account balances...</p>
      </div>
    );
  }

  // ✅ Error state
  if (error) {
    return (
      <Alert variant="danger" className="mb-4">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <FontAwesomeIcon icon={faBuilding} className="me-2" />
            {error}
          </div>
          <Button variant="outline-danger" size="sm" onClick={handleRefresh}>
            <FontAwesomeIcon icon={faRefresh} className="me-1" />
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div>
      {/* ✅ Header with refresh button */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0">
          <FontAwesomeIcon icon={faBuilding} className="text-primary me-2" />
          Cash & Bank Accounts
        </h5>
        <div>
          <Button
            variant="outline-secondary"
            size="sm"
            className="me-2"
            onClick={handleRefresh}
            disabled={loading}
          >
            <FontAwesomeIcon icon={faRefresh} className="me-1" />
            Refresh
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

      {/* ✅ Account Cards */}
      <Row className="mb-4">
        {accountsToDisplay.map((account, index) => (
          <Col md={4} key={account._id || account.id || index} className="mb-3">
            <Card className="summary-card border-0 shadow-sm h-100">
              <Card.Body>
                {/* ✅ Account Header */}
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center">
                    {getAccountIcon(account)}
                    <h6 className="mb-0 fw-bold">
                      {account.bankName || account.name || "Unknown Bank"}
                    </h6>
                  </div>
                  {getAccountTypeBadge(account)}
                </div>

                {/* ✅ Balance Display */}
                <h4 className="mb-2 text-primary fw-bold">
                  {formatCurrency(
                    account.currentBalance || account.balance || 0
                  )}
                </h4>

                {/* ✅ Account Details */}
                <div className="mb-3">
                  <p className="text-muted mb-1 small">
                    <strong>Account:</strong> {account.accountName || "N/A"}
                  </p>
                  <p className="text-muted mb-1 small">
                    <strong>A/C No:</strong>{" "}
                    {formatAccountNumber(account.accountNumber)}
                  </p>
                  {account.branch && (
                    <p className="text-muted mb-1 small">
                      <strong>Branch:</strong> {account.branch}
                    </p>
                  )}
                  {account.balanceLastUpdated && (
                    <p className="text-muted mb-0 small">
                      <strong>Updated:</strong>{" "}
                      {new Date(account.balanceLastUpdated).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* ✅ Action Buttons */}
                <div className="d-flex gap-2">
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
                    variant="outline-secondary"
                    size="sm"
                    onClick={() =>
                      onNavigate?.("addTransaction", {
                        accountId: account._id,
                        accountType: account.type,
                      })
                    }
                  >
                    <FontAwesomeIcon icon={faPlus} />
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ✅ Empty State */}
      {accountsToDisplay.length === 0 && !loading && (
        <div className="text-center py-5">
          <FontAwesomeIcon
            icon={faBuilding}
            size="3x"
            className="text-muted mb-3"
          />
          <h5 className="text-muted">No bank accounts found</h5>
          <p className="text-muted mb-4">
            Add bank accounts to track your cash flow and manage payments
          </p>
          <Button
            variant="primary"
            onClick={() => onNavigate?.("bankAccounts")}
          >
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Add Your First Bank Account
          </Button>
        </div>
      )}

      {/* ✅ Summary Footer */}
      {accountsToDisplay.length > 0 && (
        <Card className="border-0 bg-light">
          <Card.Body className="py-3">
            <Row className="text-center">
              <Col md={3}>
                <h6 className="text-muted mb-1">Total Accounts</h6>
                <h5 className="mb-0">{accountsToDisplay.length}</h5>
              </Col>
              <Col md={3}>
                <h6 className="text-muted mb-1">Bank Accounts</h6>
                <h5 className="mb-0">
                  {
                    accountsToDisplay.filter(
                      (acc) => acc.type === "bank" || acc.isBank
                    ).length
                  }
                </h5>
              </Col>
              <Col md={3}>
                <h6 className="text-muted mb-1">Cash Accounts</h6>
                <h5 className="mb-0">
                  {
                    accountsToDisplay.filter(
                      (acc) => acc.type === "cash" || acc.isCash
                    ).length
                  }
                </h5>
              </Col>
              <Col md={3}>
                <h6 className="text-muted mb-1">Total Balance</h6>
                <h5 className="mb-0 text-primary">
                  {formatCurrency(
                    accountsToDisplay.reduce(
                      (sum, acc) =>
                        sum + (acc.currentBalance || acc.balance || 0),
                      0
                    )
                  )}
                </h5>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}

export default CashBankTab;
