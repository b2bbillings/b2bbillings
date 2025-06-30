import React, {useState, useEffect} from "react";
import {
  ListGroup,
  Button,
  InputGroup,
  Form,
  Spinner,
  Alert,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faUniversity,
  faMobile,
  faPlus,
  faSearch,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import {useParams} from "react-router-dom";
import bankAccountService from "../../../services/bankAccountService";

function BankSidebar({
  accounts = [],
  selectedAccount,
  onAccountSelect,
  onAddAccount,
  searchQuery,
  onSearchChange,
  activeType,
  onTypeChange,
  loading = false,
}) {
  const {companyId} = useParams();

  const [sidebarAccounts, setSidebarAccounts] = useState([]);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [sidebarError, setSidebarError] = useState("");

  const getEffectiveCompanyId = () => {
    const sources = [
      companyId,
      localStorage.getItem("selectedCompanyId"),
      sessionStorage.getItem("companyId"),
    ];

    try {
      const currentCompanyStr = localStorage.getItem("currentCompany");
      if (currentCompanyStr) {
        const currentCompany = JSON.parse(currentCompanyStr);
        const companyIdFromStorage = currentCompany.id || currentCompany._id;
        if (companyIdFromStorage) {
          sources.unshift(companyIdFromStorage);
        }
      }
    } catch (error) {
      // Silent fallback
    }

    for (const source of sources) {
      if (source && source.trim() !== "") {
        return source;
      }
    }
    return null;
  };

  const loadSidebarAccounts = async () => {
    const effectiveCompanyId = getEffectiveCompanyId();

    if (!effectiveCompanyId) {
      setSidebarError("Company selection required");
      setSidebarLoading(false);
      return;
    }

    setSidebarLoading(true);
    setSidebarError("");

    try {
      const response = await bankAccountService.getBankAccounts(
        effectiveCompanyId,
        {
          type: activeType === "all" ? "all" : activeType,
          active: "true",
          page: 1,
          limit: 100,
          sortBy: "accountName",
          sortOrder: "asc",
        }
      );

      const fetchedAccounts = response.data?.accounts || [];
      setSidebarAccounts(fetchedAccounts);
    } catch (error) {
      setSidebarError(
        error.response?.data?.message || "Failed to load accounts"
      );
    } finally {
      setSidebarLoading(false);
    }
  };

  useEffect(() => {
    loadSidebarAccounts();
  }, [companyId, activeType]);

  const displayAccounts = accounts.length > 0 ? accounts : sidebarAccounts;

  const filteredAccounts = displayAccounts.filter((acc) => {
    const matchesType = activeType === "all" || acc.type === activeType;
    if (!matchesType) return false;

    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      acc.accountName?.toLowerCase().includes(query) ||
      acc.accountNumber?.toLowerCase().includes(query) ||
      acc.bankName?.toLowerCase().includes(query) ||
      acc.accountHolderName?.toLowerCase().includes(query) ||
      acc.ifscCode?.toLowerCase().includes(query) ||
      acc.upiId?.toLowerCase().includes(query) ||
      acc.mobileNumber?.toLowerCase().includes(query)
    );
  });

  const getAccountDisplayInfo = (account) => {
    return {
      id: account._id || account.id,
      name: account.accountName || "Unknown Account",
      number: account.accountNumber || "N/A",
      upiId: account.upiId || null,
      mobileNumber: account.mobileNumber || null,
      balance: account.currentBalance || 0,
      type: account.type || "bank",
      isActive: account.isActive !== false,
    };
  };

  const handleTypeChange = (newType) => {
    if (onTypeChange) {
      onTypeChange(newType);
    }
  };

  const getTypeTotals = () => {
    const bankAccounts = displayAccounts.filter((acc) => acc.type === "bank");
    const upiAccounts = displayAccounts.filter((acc) => acc.type === "upi");

    return {
      bank: {
        count: bankAccounts.length,
        total: bankAccounts.reduce(
          (sum, acc) => sum + (acc.currentBalance || 0),
          0
        ),
      },
      upi: {
        count: upiAccounts.length,
        total: upiAccounts.reduce(
          (sum, acc) => sum + (acc.currentBalance || 0),
          0
        ),
        enabledCount: upiAccounts.filter(
          (acc) => acc.upiId && acc.mobileNumber && acc.isActive
        ).length,
      },
    };
  };

  const typeTotals = getTypeTotals();

  const getAccountIcon = (account) => {
    if (account.type === "upi") return faMobile;
    return faUniversity;
  };

  const formatCurrency = (amount) => {
    return bankAccountService.formatCurrency(amount || 0);
  };

  const getAccountSubtitle = (account) => {
    const accountInfo = getAccountDisplayInfo(account);

    if (account.type === "upi") {
      return (
        accountInfo.upiId || accountInfo.mobileNumber || accountInfo.number
      );
    }
    return accountInfo.number !== "N/A" && accountInfo.number !== ""
      ? accountInfo.number
      : null;
  };

  const formatDisplayAmount = (amount) => {
    const num = parseFloat(amount) || 0;

    if (Math.abs(num) >= 10000000) {
      return `₹${(num / 10000000).toFixed(1)}Cr`;
    } else if (Math.abs(num) >= 100000) {
      return `₹${(num / 100000).toFixed(1)}L`;
    } else if (Math.abs(num) >= 1000) {
      return `₹${(num / 1000).toFixed(1)}K`;
    }
    return `₹${Math.round(num).toLocaleString("en-IN")}`;
  };

  return (
    <div
      className="h-100 border-end"
      style={{
        background: "#ffffff",
        margin: "0",
        padding: "0",
      }}
    >
      {/* Header Section */}
      <div
        className="p-3 border-bottom"
        style={{
          background: "#f8f9fa",
          borderColor: "#dee2e6",
        }}
      >
        {/* Type Selector */}
        <div className="mb-3">
          <div className="btn-group w-100" role="group">
            <input
              type="radio"
              className="btn-check"
              name="accountType"
              id="bankType"
              checked={activeType === "bank"}
              onChange={() => handleTypeChange("bank")}
            />
            <label
              className="btn btn-outline-primary btn-sm flex-fill"
              htmlFor="bankType"
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: activeType === "bank" ? "#ffffff" : "#6f42c1",
                backgroundColor:
                  activeType === "bank" ? "#6f42c1" : "transparent",
                borderColor: "#6f42c1",
              }}
            >
              <FontAwesomeIcon icon={faUniversity} className="me-1" size="xs" />
              Bank ({typeTotals.bank.count})
            </label>

            <input
              type="radio"
              className="btn-check"
              name="accountType"
              id="upiType"
              checked={activeType === "upi"}
              onChange={() => handleTypeChange("upi")}
            />
            <label
              className="btn btn-outline-primary btn-sm flex-fill"
              htmlFor="upiType"
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: activeType === "upi" ? "#ffffff" : "#6f42c1",
                backgroundColor:
                  activeType === "upi" ? "#6f42c1" : "transparent",
                borderColor: "#6f42c1",
              }}
            >
              <FontAwesomeIcon icon={faMobile} className="me-1" size="xs" />
              UPI ({typeTotals.upi.count})
              {typeTotals.upi.enabledCount > 0 && (
                <span
                  className="badge ms-1"
                  style={{
                    fontSize: "9px",
                    background: "#28a745",
                    color: "white",
                  }}
                >
                  {typeTotals.upi.enabledCount}
                </span>
              )}
            </label>
          </div>
        </div>

        {/* Title and Add Button */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="flex-grow-1 me-2">
            <h6 className="mb-0 fw-bold text-dark" style={{fontSize: "14px"}}>
              {activeType === "bank" ? "Bank Accounts" : "UPI Accounts"}
            </h6>
            <small className="text-muted">
              Total:{" "}
              {formatCurrency(
                activeType === "bank"
                  ? typeTotals.bank.total
                  : typeTotals.upi.total
              )}
              {activeType === "upi" && typeTotals.upi.enabledCount > 0 && (
                <span className="text-success ms-1">
                  • {typeTotals.upi.enabledCount} enabled
                </span>
              )}
            </small>
          </div>
          <Button
            variant="primary"
            size="sm"
            className="flex-shrink-0"
            onClick={() => onAddAccount(activeType)}
            disabled={sidebarLoading || !getEffectiveCompanyId()}
            style={{
              fontSize: "12px",
              fontWeight: "600",
              padding: "6px 12px",
              borderRadius: "6px",
              backgroundColor: "#6f42c1",
              borderColor: "#6f42c1",
            }}
          >
            <FontAwesomeIcon icon={faPlus} className="me-1" size="xs" />
            Add
          </Button>
        </div>

        {/* Search Input */}
        <InputGroup size="sm">
          <InputGroup.Text
            style={{
              background: "#e9ecef",
              borderColor: "#ced4da",
              color: "#6c757d",
            }}
          >
            <FontAwesomeIcon icon={faSearch} size="xs" />
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder={
              activeType === "upi"
                ? "Search by name, UPI ID..."
                : "Search accounts..."
            }
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              fontSize: "12px",
              borderColor: "#ced4da",
            }}
            disabled={sidebarLoading}
          />
        </InputGroup>
      </div>

      {/* Error Alert */}
      {sidebarError && (
        <Alert
          variant="danger"
          className="mx-2 mb-0 mt-2"
          style={{
            fontSize: "12px",
          }}
        >
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          {sidebarError}
        </Alert>
      )}

      {/* Accounts List */}
      <div
        className="p-2"
        style={{
          height: "calc(100vh - 250px)",
          overflowY: "auto",
        }}
      >
        {/* Loading State */}
        {(sidebarLoading || loading) && (
          <div className="text-center py-4">
            <Spinner
              animation="border"
              size="sm"
              className="text-primary mb-2"
            />
            <div className="text-muted" style={{fontSize: "12px"}}>
              Loading accounts...
            </div>
          </div>
        )}

        {/* Empty State */}
        {!sidebarLoading && !loading && filteredAccounts.length === 0 && (
          <div className="text-center py-4">
            <div className="mb-2" style={{fontSize: "2rem", color: "#dee2e6"}}>
              <FontAwesomeIcon
                icon={activeType === "bank" ? faUniversity : faMobile}
              />
            </div>
            <div
              className="text-dark"
              style={{fontSize: "13px", fontWeight: "500", marginBottom: "4px"}}
            >
              {searchQuery ? "No accounts found" : `No ${activeType} accounts`}
            </div>
            <small className="text-muted" style={{fontSize: "11px"}}>
              {searchQuery
                ? "Try different search terms"
                : `Click Add to create your first ${
                    activeType === "upi" ? "UPI" : "bank"
                  } account`}
            </small>
          </div>
        )}

        {/* Accounts List */}
        {!sidebarLoading && !loading && filteredAccounts.length > 0 && (
          <ListGroup variant="flush">
            {filteredAccounts.map((account) => {
              const accountInfo = getAccountDisplayInfo(account);
              const isSelected =
                selectedAccount?._id === accountInfo.id ||
                selectedAccount?.id === accountInfo.id;
              const subtitle = getAccountSubtitle(account);
              const isUpiEnabled =
                account.type === "upi" &&
                account.upiId &&
                account.mobileNumber &&
                account.isActive;

              return (
                <ListGroup.Item
                  key={accountInfo.id}
                  action
                  onClick={() => onAccountSelect(account)}
                  className="border mb-2 rounded-2"
                  style={{
                    background: isSelected ? "#f8f9fa" : "#ffffff",
                    padding: "12px",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                    position: "relative",
                    opacity: accountInfo.isActive ? 1 : 0.6,
                    borderColor: isSelected ? "#6f42c1" : "#dee2e6",
                    borderWidth: isSelected ? "2px" : "1px",
                  }}
                >
                  {/* Main row - Icon, Name and Amount */}
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <div
                      className="d-flex align-items-center flex-grow-1"
                      style={{minWidth: "0"}}
                    >
                      <FontAwesomeIcon
                        icon={getAccountIcon(account)}
                        className="me-2"
                        style={{
                          color: isSelected ? "#6f42c1" : "#6c757d",
                          fontSize: "14px",
                        }}
                      />
                      <span
                        style={{
                          color: isSelected ? "#495057" : "#212529",
                          fontSize: "13px",
                          fontWeight: "600",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={accountInfo.name}
                      >
                        {accountInfo.name}
                      </span>
                    </div>
                    <span
                      style={{
                        color: accountInfo.balance < 0 ? "#dc3545" : "#28a745",
                        fontSize: "12px",
                        fontWeight: "700",
                        marginLeft: "8px",
                      }}
                      title={formatCurrency(accountInfo.balance)}
                    >
                      {formatDisplayAmount(accountInfo.balance)}
                    </span>
                  </div>

                  {/* Badges row */}
                  <div className="d-flex gap-1 flex-wrap mb-1">
                    {!accountInfo.isActive && (
                      <span
                        className="badge bg-secondary"
                        style={{
                          fontSize: "9px",
                          padding: "2px 6px",
                        }}
                      >
                        Inactive
                      </span>
                    )}
                    {account.type === "upi" && isUpiEnabled && (
                      <span
                        className="badge bg-success"
                        style={{
                          fontSize: "9px",
                          padding: "2px 6px",
                        }}
                      >
                        UPI Ready
                      </span>
                    )}
                  </div>

                  {/* Subtitle row */}
                  {subtitle && (
                    <div style={{marginLeft: "22px"}}>
                      <span
                        style={{
                          color: "#6c757d",
                          fontSize: "11px",
                          fontFamily: "monospace",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "block",
                        }}
                        title={subtitle}
                      >
                        {subtitle}
                      </span>
                    </div>
                  )}

                  {/* Mobile number row (UPI only) */}
                  {account.type === "upi" &&
                    accountInfo.mobileNumber &&
                    subtitle !== accountInfo.mobileNumber && (
                      <div style={{marginLeft: "22px"}}>
                        <span
                          style={{
                            color: "#6c757d",
                            fontSize: "10px",
                            fontFamily: "monospace",
                            display: "block",
                          }}
                          title={accountInfo.mobileNumber}
                        >
                          {accountInfo.mobileNumber}
                        </span>
                      </div>
                    )}

                  {/* Selection Indicator */}
                  {isSelected && (
                    <div
                      style={{
                        position: "absolute",
                        left: "0",
                        top: "0",
                        bottom: "0",
                        width: "3px",
                        background: "#6f42c1",
                        borderRadius: "0 2px 2px 0",
                      }}
                    />
                  )}
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        )}
      </div>

      {/* Summary Footer */}
      {!sidebarLoading && !loading && displayAccounts.length > 0 && (
        <div
          className="border-top p-2"
          style={{
            background: "#f8f9fa",
            borderColor: "#dee2e6",
          }}
        >
          <div className="text-center">
            <small
              className="text-muted d-block mb-1"
              style={{fontSize: "11px"}}
            >
              {filteredAccounts.length} of {displayAccounts.length} accounts
              {activeType === "upi" && typeTotals.upi.enabledCount > 0 && (
                <span className="text-success ms-1">
                  • {typeTotals.upi.enabledCount} UPI enabled
                </span>
              )}
            </small>
            <small className="fw-bold text-dark" style={{fontSize: "12px"}}>
              Total:{" "}
              {formatCurrency(
                activeType === "bank"
                  ? typeTotals.bank.total
                  : typeTotals.upi.total
              )}
            </small>
          </div>
        </div>
      )}

      {/* Custom Scrollbar Styles */}
      <style>
        {`
                .bank-sidebar div::-webkit-scrollbar {
                    width: 6px;
                }

                .bank-sidebar div::-webkit-scrollbar-track {
                    background: #f8f9fa;
                    border-radius: 3px;
                }

                .bank-sidebar div::-webkit-scrollbar-thumb {
                    background: #dee2e6;
                    border-radius: 3px;
                }

                .bank-sidebar div::-webkit-scrollbar-thumb:hover {
                    background: #adb5bd;
                }

                .bank-sidebar .list-group-item:hover {
                    transform: translateX(2px);
                    box-shadow: 0 2px 8px rgba(111, 66, 193, 0.2) !important;
                    border-color: #6f42c1 !important;
                }

                .bank-sidebar .btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(111, 66, 193, 0.3);
                }

                @media (max-width: 768px) {
                    .bank-sidebar .p-3 {
                        padding: 0.75rem !important;
                    }

                    .bank-sidebar .p-2 {
                        padding: 0.5rem !important;
                    }

                    .bank-sidebar .list-group-item {
                        padding: 10px !important;
                        margin-bottom: 6px !important;
                    }
                }
                `}
      </style>
    </div>
  );
}

export default BankSidebar;
