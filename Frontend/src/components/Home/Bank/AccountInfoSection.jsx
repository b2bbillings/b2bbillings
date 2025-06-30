import React, {useState, useRef, useEffect} from "react";
import {Card, Row, Col, Button} from "react-bootstrap";
import {createPortal} from "react-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faEdit, faChevronDown} from "@fortawesome/free-solid-svg-icons";
import bankAccountService from "../../../services/bankAccountService";

function AccountInfoSection({
  selectedAccount,
  onEditAccount,
  onAddTransaction,
  onAccountUpdated,
}) {
  const [showTransactionDropdown, setShowTransactionDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({top: 0, left: 0});
  const dropdownRef = useRef(null);
  const toggleButtonRef = useRef(null);

  // ✅ FIXED: Calculate dropdown position relative to button
  const calculateDropdownPosition = () => {
    if (toggleButtonRef.current) {
      const rect = toggleButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right - 250 + window.scrollX,
      });
    }
  };

  // ✅ FIXED: Handle dropdown toggle with position calculation
  const handleDropdownToggle = (isOpen) => {
    if (isOpen) {
      calculateDropdownPosition();
    }
    setShowTransactionDropdown(isOpen);
  };

  // ✅ FIXED: Update position on scroll/resize
  useEffect(() => {
    const updatePosition = () => {
      if (showTransactionDropdown) {
        calculateDropdownPosition();
      }
    };

    window.addEventListener("scroll", updatePosition);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [showTransactionDropdown]);

  // ✅ FIXED: Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(event.target)
      ) {
        setShowTransactionDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ✅ FIXED: Handle specific transaction types correctly
  const handleTransactionType = (transactionType, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!onAddTransaction) {
      console.error("❌ onAddTransaction prop is missing");
      return;
    }

    if (!selectedAccount) {
      console.error("❌ No account selected");
      return;
    }

    setShowTransactionDropdown(false);

    setTimeout(() => {
      try {
        onAddTransaction(selectedAccount, {
          type: transactionType,
          accountId: selectedAccount._id || selectedAccount.id,
          accountName: selectedAccount.accountName,
          accountType: selectedAccount.type,
        });
      } catch (error) {
        console.error("❌ Error calling onAddTransaction:", error);
      }
    }, 100);
  };

  // ✅ ENHANCED: Handle edit with proper data formatting
  const handleEditClick = () => {
    if (!onEditAccount) {
      console.error("❌ onEditAccount prop is missing");
      return;
    }

    const editData = {
      _id: selectedAccount._id || selectedAccount.id,
      accountName: selectedAccount.accountName || "",
      accountNumber: selectedAccount.accountNumber || "",
      bankName: selectedAccount.bankName || "",
      branchName: selectedAccount.branchName || "",
      ifscCode: selectedAccount.ifscCode || "",
      accountType: selectedAccount.accountType || "savings",
      accountHolderName: selectedAccount.accountHolderName || "",
      type: selectedAccount.type || "bank",
      openingBalance: selectedAccount.openingBalance || 0,
      asOfDate: selectedAccount.asOfDate
        ? new Date(selectedAccount.asOfDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      printUpiQrCodes: selectedAccount.printUpiQrCodes || false,
      printBankDetails: selectedAccount.printBankDetails || false,
      upiId: selectedAccount.upiId || "",
      isActive: selectedAccount.isActive !== false,
    };

    onEditAccount(editData);
  };

  // ✅ FIXED: Custom dropdown portal component
  const DropdownPortal = ({children, show, position}) => {
    if (!show) return null;

    return createPortal(
      <div
        ref={dropdownRef}
        className="position-fixed account-dropdown-portal"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          zIndex: 9999,
          minWidth: "250px",
        }}
      >
        <div
          className="dropdown-menu show border-0"
          style={{
            background: "#7c3aed",
            border: "none",
          }}
        >
          {children}
        </div>
      </div>,
      document.body
    );
  };

  // Early return AFTER all hooks have been called
  if (!selectedAccount) {
    return (
      <Card
        className="mb-3 border-0"
        style={{background: "#ffffff", borderRadius: "0"}}
      >
        <Card.Body className="text-center py-3">
          <div className="fw-bold text-muted" style={{fontSize: "14px"}}>
            Select an account to view details
          </div>
          <div className="text-muted mt-1" style={{fontSize: "12px"}}>
            Choose an account from the sidebar to see account information
          </div>
        </Card.Body>
      </Card>
    );
  }

  // ✅ Format currency properly
  const formatCurrency = (amount) => {
    return bankAccountService.formatCurrency(amount || 0);
  };

  // ✅ Get account type display
  const getAccountTypeDisplay = () => {
    const types = {
      savings: "Savings Account",
      current: "Current Account",
      cash: "Cash Account",
      fd: "Fixed Deposit",
      rd: "Recurring Deposit",
      loan: "Loan Account",
      cc: "Credit Card",
    };
    return (
      types[selectedAccount.accountType] ||
      selectedAccount.accountType ||
      "Unknown"
    );
  };

  return (
    <>
      <Card
        className="mb-3 border-0"
        style={{background: "#ffffff", borderRadius: "0"}}
      >
        <Card.Body className="p-3">
          <Row className="align-items-center">
            {/* Left Side - Account Details */}
            <Col md={8}>
              <div className="mb-2">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h5
                    className="fw-bold mb-0 text-dark"
                    style={{fontSize: "18px"}}
                  >
                    {selectedAccount.accountName}
                  </h5>
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className="badge px-2 py-1 fw-semibold text-white"
                      style={{
                        background:
                          selectedAccount.type === "cash"
                            ? "#f39c12"
                            : "#7c3aed",
                        fontSize: "11px",
                        borderRadius: "0",
                      }}
                    >
                      {selectedAccount.type?.toUpperCase() || "BANK"}
                    </span>
                    {!selectedAccount.isActive && (
                      <span
                        className="badge bg-secondary px-2 py-1 fw-semibold text-white"
                        style={{fontSize: "11px", borderRadius: "0"}}
                      >
                        INACTIVE
                      </span>
                    )}
                  </div>
                </div>

                <div className="account-details">
                  <Row className="g-2">
                    <Col sm={6}>
                      <div className="d-flex align-items-center mb-2">
                        <span
                          className="text-muted fw-semibold me-3"
                          style={{minWidth: "80px", fontSize: "12px"}}
                        >
                          Type:
                        </span>
                        <span
                          className="text-dark fw-medium"
                          style={{fontSize: "13px"}}
                        >
                          {getAccountTypeDisplay()}
                        </span>
                      </div>
                      {selectedAccount.bankName && (
                        <div className="d-flex align-items-center mb-2">
                          <span
                            className="text-muted fw-semibold me-3"
                            style={{minWidth: "80px", fontSize: "12px"}}
                          >
                            Bank Name:
                          </span>
                          <span
                            className="text-dark fw-medium"
                            style={{fontSize: "13px"}}
                          >
                            {selectedAccount.bankName}
                          </span>
                        </div>
                      )}
                      {selectedAccount.ifscCode && (
                        <div className="d-flex align-items-center mb-2">
                          <span
                            className="text-muted fw-semibold me-3"
                            style={{minWidth: "80px", fontSize: "12px"}}
                          >
                            IFSC Code:
                          </span>
                          <span
                            className="text-dark fw-medium"
                            style={{
                              fontSize: "13px",
                              fontFamily: "monospace",
                              background: "#f8f9fa",
                              padding: "1px 4px",
                              borderRadius: "0",
                            }}
                          >
                            {selectedAccount.ifscCode}
                          </span>
                        </div>
                      )}
                    </Col>
                    <Col sm={6}>
                      {selectedAccount.accountNumber && (
                        <div className="d-flex align-items-center mb-2">
                          <span
                            className="text-muted fw-semibold me-3"
                            style={{minWidth: "85px", fontSize: "12px"}}
                          >
                            Account No:
                          </span>
                          <span
                            className="text-dark fw-medium"
                            style={{
                              fontSize: "13px",
                              fontFamily: "monospace",
                              background: "#f8f9fa",
                              padding: "1px 4px",
                              borderRadius: "0",
                            }}
                          >
                            {selectedAccount.accountNumber}
                          </span>
                        </div>
                      )}
                      {selectedAccount.accountHolderName && (
                        <div className="d-flex align-items-center mb-2">
                          <span
                            className="text-muted fw-semibold me-3"
                            style={{minWidth: "85px", fontSize: "12px"}}
                          >
                            Holder:
                          </span>
                          <span
                            className="text-dark fw-medium"
                            style={{fontSize: "13px"}}
                          >
                            {selectedAccount.accountHolderName}
                          </span>
                        </div>
                      )}
                      {selectedAccount.upiId && (
                        <div className="d-flex align-items-center mb-2">
                          <span
                            className="text-muted fw-semibold me-3"
                            style={{minWidth: "85px", fontSize: "12px"}}
                          >
                            UPI ID:
                          </span>
                          <span
                            className="text-dark fw-medium"
                            style={{
                              fontSize: "13px",
                              fontFamily: "monospace",
                              background: "#f8f9fa",
                              padding: "1px 4px",
                              borderRadius: "0",
                            }}
                          >
                            {selectedAccount.upiId}
                          </span>
                        </div>
                      )}
                    </Col>
                  </Row>
                </div>
              </div>
            </Col>

            {/* Right Side - Balance and Actions */}
            <Col md={4} className="text-end">
              <div
                className={`fw-bold mb-1 ${
                  selectedAccount.currentBalance < 0
                    ? "text-danger"
                    : "text-success"
                }`}
                style={{fontSize: "1.8rem"}}
              >
                {formatCurrency(selectedAccount.currentBalance)}
              </div>
              <div
                className="fw-semibold text-muted mb-1"
                style={{fontSize: "12px"}}
              >
                Current Balance
              </div>

              {/* Opening Balance Info */}
              {selectedAccount.openingBalance !==
                selectedAccount.currentBalance && (
                <div
                  className="fw-medium text-muted mb-3"
                  style={{fontSize: "11px"}}
                >
                  Opening: {formatCurrency(selectedAccount.openingBalance)}
                </div>
              )}

              {/* Action Buttons */}
              <div className="d-flex gap-2 justify-content-end align-items-center flex-wrap account-actions">
                {/* Transaction dropdown button */}
                <div className="position-relative">
                  <Button
                    ref={toggleButtonRef}
                    variant="primary"
                    size="sm"
                    className="px-3 py-2 fw-bold border-0 d-flex align-items-center"
                    style={{
                      minWidth: "140px",
                      fontSize: "13px",
                      background: "#7c3aed",
                      borderColor: "#7c3aed",
                      borderRadius: "0",
                    }}
                    onClick={() =>
                      handleDropdownToggle(!showTransactionDropdown)
                    }
                  >
                    <span className="me-2">Add Transaction</span>
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className={showTransactionDropdown ? "rotate-180" : ""}
                      size="sm"
                    />
                  </Button>

                  {/* Portal-based dropdown */}
                  <DropdownPortal
                    show={showTransactionDropdown}
                    position={dropdownPosition}
                  >
                    <div
                      className="dropdown-header px-3 py-2 border-bottom"
                      style={{
                        background: "rgba(255, 255, 255, 0.1)",
                        borderColor: "rgba(255, 255, 255, 0.2)",
                      }}
                    >
                      <div
                        className="text-white fw-bold"
                        style={{fontSize: "13px"}}
                      >
                        Transaction Types
                      </div>
                    </div>

                    {/* Basic Transactions */}
                    <button
                      type="button"
                      onClick={(e) => handleTransactionType("deposit", e)}
                      className="dropdown-item border-0 d-flex align-items-center py-2 px-3 bg-transparent w-100 text-start"
                      style={{
                        fontSize: "13px",
                        color: "white",
                      }}
                    >
                      <span className="me-2" style={{fontSize: "16px"}}>
                        💰
                      </span>
                      <div className="flex-grow-1">
                        <div className="fw-semibold">Deposit Money</div>
                        <small
                          className="text-white-50"
                          style={{fontSize: "11px"}}
                        >
                          Add money to account
                        </small>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleTransactionType("withdraw", e)}
                      className="dropdown-item border-0 d-flex align-items-center py-2 px-3 bg-transparent w-100 text-start"
                      style={{
                        fontSize: "13px",
                        color: "white",
                      }}
                    >
                      <span className="me-2" style={{fontSize: "16px"}}>
                        💸
                      </span>
                      <div className="flex-grow-1">
                        <div className="fw-semibold">Withdraw Money</div>
                        <small
                          className="text-white-50"
                          style={{fontSize: "11px"}}
                        >
                          Remove money from account
                        </small>
                      </div>
                    </button>

                    <hr
                      className="dropdown-divider my-1"
                      style={{borderColor: "rgba(255, 255, 255, 0.2)"}}
                    />

                    {/* Transfer Types */}
                    {selectedAccount.type === "bank" && (
                      <>
                        <button
                          type="button"
                          onClick={(e) =>
                            handleTransactionType("transfer-bank-to-cash", e)
                          }
                          className="dropdown-item border-0 d-flex align-items-center py-2 px-3 bg-transparent w-100 text-start"
                          style={{
                            fontSize: "13px",
                            color: "white",
                          }}
                        >
                          <span className="me-2" style={{fontSize: "16px"}}>
                            🏦
                          </span>
                          <div className="flex-grow-1">
                            <div className="fw-semibold">
                              Bank to Cash Transfer
                            </div>
                            <small
                              className="text-white-50"
                              style={{fontSize: "11px"}}
                            >
                              Transfer to cash account
                            </small>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={(e) =>
                            handleTransactionType("transfer-bank-to-bank", e)
                          }
                          className="dropdown-item border-0 d-flex align-items-center py-2 px-3 bg-transparent w-100 text-start"
                          style={{
                            fontSize: "13px",
                            color: "white",
                          }}
                        >
                          <span className="me-2" style={{fontSize: "16px"}}>
                            🔄
                          </span>
                          <div className="flex-grow-1">
                            <div className="fw-semibold">
                              Bank to Bank Transfer
                            </div>
                            <small
                              className="text-white-50"
                              style={{fontSize: "11px"}}
                            >
                              Transfer between banks
                            </small>
                          </div>
                        </button>
                      </>
                    )}

                    {selectedAccount.type === "cash" && (
                      <button
                        type="button"
                        onClick={(e) =>
                          handleTransactionType("transfer-cash-to-bank", e)
                        }
                        className="dropdown-item border-0 d-flex align-items-center py-2 px-3 bg-transparent w-100 text-start"
                        style={{
                          fontSize: "13px",
                          color: "white",
                        }}
                      >
                        <span className="me-2" style={{fontSize: "16px"}}>
                          💵
                        </span>
                        <div className="flex-grow-1">
                          <div className="fw-semibold">
                            Cash to Bank Transfer
                          </div>
                          <small
                            className="text-white-50"
                            style={{fontSize: "11px"}}
                          >
                            Transfer to bank account
                          </small>
                        </div>
                      </button>
                    )}

                    <hr
                      className="dropdown-divider my-1"
                      style={{borderColor: "rgba(255, 255, 255, 0.2)"}}
                    />

                    {/* Balance Adjustment */}
                    <button
                      type="button"
                      onClick={(e) =>
                        handleTransactionType("adjust-balance", e)
                      }
                      className="dropdown-item border-0 d-flex align-items-center py-2 px-3 bg-transparent w-100 text-start"
                      style={{
                        fontSize: "13px",
                        color: "rgba(255, 255, 255, 0.8)",
                      }}
                    >
                      <span className="me-2" style={{fontSize: "16px"}}>
                        ⚖️
                      </span>
                      <div className="flex-grow-1">
                        <div className="fw-semibold">Adjust Balance</div>
                        <small
                          className="text-white-50"
                          style={{fontSize: "11px"}}
                        >
                          Correct account balance
                        </small>
                      </div>
                    </button>
                  </DropdownPortal>
                </div>

                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={handleEditClick}
                  className="px-3 py-2 border-2 fw-bold d-flex align-items-center"
                  style={{
                    fontSize: "13px",
                    borderColor: "#7c3aed",
                    color: "#7c3aed",
                    borderRadius: "0",
                  }}
                >
                  <FontAwesomeIcon icon={faEdit} className="me-1" size="sm" />
                  <span>Edit Account</span>
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Custom Styles */}
      <style>
        {`
          .rotate-180 {
            transform: rotate(180deg);
          }
        `}
      </style>
    </>
  );
}

export default AccountInfoSection;
