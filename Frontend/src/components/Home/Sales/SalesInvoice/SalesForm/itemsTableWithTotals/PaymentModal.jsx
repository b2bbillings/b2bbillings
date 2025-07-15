import React, {useEffect, useCallback} from "react";
import {
  Modal,
  Row,
  Col,
  Form,
  InputGroup,
  Button,
  Card,
  Badge,
  Alert,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faUser,
  faCreditCard,
  faUniversity,
  faReceipt,
  faCalendarAlt,
  faMoneyBillWave,
  faWallet,
  faCheckCircle,
  faExclamationTriangle,
  faSpinner,
  faHistory,
  faInfoCircle,
  faRefresh,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import itemsTableLogic from "./itemsTableLogic";

const PaymentModal = ({
  show,
  onHide,
  currentConfig,
  finalTotalWithRoundOff,
  paymentData,
  setPaymentData,
  handlePaymentAmountChange,
  handlePaymentTypeChange,
  handlePaymentSubmit,
  submittingPayment,
  bankAccounts = [],
  loadingBankAccounts = false,
  retryLoadBankAccounts,
  paymentHistory = [],
  totals = {},
  gstEnabled = true,
  roundOffEnabled = false,
  roundOffValue = 0,
  invoiceNumber = "",
  invoiceDate = "",
  handleDueDateToggle,
  handleCreditDaysChange,
  handleDueDateChange,
  companyId,
  formType = "sales",
  isEditMode = false, // ✅ NEW: Add edit mode flag
}) => {
  // ✅ UPDATED: Auto-set payment amount only for new payments, not edits
  useEffect(() => {
    if (show && finalTotalWithRoundOff > 0 && !isEditMode) {
      if (!paymentData.amount || paymentData.amount === 0) {
        const roundedTotal = Math.round(finalTotalWithRoundOff * 100) / 100;
        handlePaymentAmountChange(roundedTotal);
      }
    }
  }, [
    show,
    finalTotalWithRoundOff,
    paymentData.amount,
    handlePaymentAmountChange,
    isEditMode,
  ]);

  // ✅ UPDATED: Auto-set due date only for new payments, preserve existing for edits
  useEffect(() => {
    if (show && !isEditMode) {
      const defaultDueDate =
        invoiceDate || new Date().toISOString().split("T")[0];

      if (!paymentData.dueDate) {
        setPaymentData((prev) => ({
          ...prev,
          dueDate: defaultDueDate,
        }));
      }
    }
  }, [show, invoiceDate, setPaymentData, paymentData.dueDate, isEditMode]);

  // ✅ NEW: Ensure bank account is properly selected when editing
  useEffect(() => {
    if (
      show &&
      isEditMode &&
      paymentData.bankAccountId &&
      bankAccounts.length > 0
    ) {
      // Find the bank account that matches the stored ID
      const existingAccount = bankAccounts.find(
        (acc) => (acc._id || acc.id) === paymentData.bankAccountId
      );

      if (existingAccount && !paymentData.bankAccountName) {
        // Update the payment data with complete bank account info
        setPaymentData((prev) => ({
          ...prev,
          bankAccountName:
            existingAccount.accountName || existingAccount.name || "",
          bankName: existingAccount.bankName || "",
          accountNumber: existingAccount.accountNumber || "",
        }));
      }
    }
  }, [
    show,
    isEditMode,
    paymentData.bankAccountId,
    bankAccounts,
    paymentData.bankAccountName,
    setPaymentData,
  ]);

  // ✅ UPDATED: Debounced payment amount change - don't auto-set dates for edits
  const debouncedPaymentAmountChange = useCallback(
    (value) => {
      const numericValue = parseFloat(value) || 0;
      handlePaymentAmountChange(numericValue);

      // ✅ Only auto-set next payment date for new payments, not edits
      if (!isEditMode) {
        const invoiceTotal = parseFloat(finalTotalWithRoundOff) || 0;

        if (numericValue > 0 && numericValue < invoiceTotal) {
          // Partial payment - set next payment date if not already set
          if (!paymentData.nextPaymentDate) {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            setPaymentData((prev) => ({
              ...prev,
              nextPaymentDate: nextWeek.toISOString().split("T")[0],
            }));
          }
        } else if (numericValue >= invoiceTotal) {
          // Full payment - clear next payment date
          setPaymentData((prev) => ({
            ...prev,
            nextPaymentDate: null,
          }));
        }
      }
    },
    [
      handlePaymentAmountChange,
      finalTotalWithRoundOff,
      setPaymentData,
      paymentData.nextPaymentDate,
      isEditMode,
    ]
  );

  // ✅ Calculate remaining amount
  const calculateRemainingAmount = () => {
    const invoiceTotal = parseFloat(finalTotalWithRoundOff) || 0;
    const paidAmount = parseFloat(paymentData.amount) || 0;

    if (paidAmount === 0) return invoiceTotal;
    if (paidAmount >= invoiceTotal) return 0;
    return Math.max(0, invoiceTotal - paidAmount);
  };

  const remainingAmount = calculateRemainingAmount();

  // ✅ Get payment status
  const getPaymentStatus = () => {
    const invoiceTotal = parseFloat(finalTotalWithRoundOff) || 0;
    const paidAmount = parseFloat(paymentData.amount) || 0;

    if (paidAmount === 0) return "no-payment";

    const threshold = 0.01;
    if (
      Math.abs(paidAmount - invoiceTotal) <= threshold ||
      paidAmount >= invoiceTotal
    ) {
      return "full-payment";
    }
    if (paidAmount > threshold && paidAmount < invoiceTotal) {
      return "partial-payment";
    }
    return "no-payment";
  };

  const paymentStatus = getPaymentStatus();
  const isPartialPayment = paymentStatus === "partial-payment";
  const isFullPayment = paymentStatus === "full-payment";
  const isNoPayment = paymentStatus === "no-payment";

  // ✅ Payment submission handler
  const handleCleanPaymentSubmit = useCallback(
    (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      let finalPaymentData = {...paymentData};

      // Ensure due date is set
      if (!finalPaymentData.dueDate) {
        finalPaymentData.dueDate =
          invoiceDate || new Date().toISOString().split("T")[0];
      }

      // For partial payments, ensure next payment date is set
      if (isPartialPayment && !finalPaymentData.nextPaymentDate) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        finalPaymentData.nextPaymentDate = nextWeek.toISOString().split("T")[0];
      }

      setPaymentData(finalPaymentData);

      if (handlePaymentSubmit && typeof handlePaymentSubmit === "function") {
        try {
          handlePaymentSubmit(
            invoiceDate,
            finalPaymentData.dueDate,
            finalPaymentData.nextPaymentDate
          );
        } catch (error) {
          console.error("❌ Error in payment submission:", error);
        }
      }
    },
    [
      paymentData,
      isPartialPayment,
      invoiceDate,
      setPaymentData,
      handlePaymentSubmit,
    ]
  );

  // ✅ Validation
  const getSubmitButtonState = () => {
    const validations = {
      hasParty: !!(paymentData.partyId && paymentData.partyName),
      hasAmount: !!(paymentData.amount && parseFloat(paymentData.amount) > 0),
      hasBankAccount:
        ["Cash", "UPI"].includes(paymentData.paymentType) ||
        !!(paymentData.bankAccountId && paymentData.bankAccountId !== ""),
      hasChequeDetails:
        paymentData.paymentType !== "Cheque" ||
        !!(paymentData.chequeNumber && paymentData.chequeDate),
      hasNextPaymentDate: !isPartialPayment || !!paymentData.nextPaymentDate,
    };

    const isValid = Object.values(validations).every(Boolean);
    return {isValid, validations, isDisabled: submittingPayment || !isValid};
  };

  const submitState = getSubmitButtonState();

  // ✅ Validation messages
  const getValidationMessage = () => {
    if (!submitState.validations.hasParty) {
      return "Party information is missing. Please select a customer/supplier in the main form.";
    }
    if (!submitState.validations.hasAmount) {
      return "Please enter a valid payment amount greater than 0";
    }
    if (!submitState.validations.hasBankAccount) {
      return `Please select a bank account for ${paymentData.paymentType} payment`;
    }
    if (!submitState.validations.hasChequeDetails) {
      return "Please provide both cheque number and cheque date";
    }
    if (!submitState.validations.hasNextPaymentDate) {
      return "Please set next payment date for partial payment";
    }
    return "";
  };

  // ✅ Helper functions
  const handleRetryBankAccounts = useCallback(() => {
    if (retryLoadBankAccounts && typeof retryLoadBankAccounts === "function") {
      retryLoadBankAccounts();
    }
  }, [retryLoadBankAccounts]);

  // ✅ UPDATED: Don't auto-set full amount when editing
  const handleFullAmountClick = useCallback(() => {
    const roundedTotal = Math.round(finalTotalWithRoundOff * 100) / 100;
    debouncedPaymentAmountChange(roundedTotal);
  }, [finalTotalWithRoundOff, debouncedPaymentAmountChange]);

  const handlePaymentTypeChangeOptimized = useCallback(
    (value) => {
      handlePaymentTypeChange(value);
    },
    [handlePaymentTypeChange]
  );

  // ✅ UPDATED: Enhanced bank account change handler
  const handleBankAccountChange = useCallback(
    (value) => {
      const selectedAccount = bankAccounts.find(
        (acc) => (acc._id || acc.id) === value
      );

      setPaymentData((prev) => ({
        ...prev,
        bankAccountId: value,
        bankAccountName:
          selectedAccount?.accountName || selectedAccount?.name || "",
        bankName: selectedAccount?.bankName || "",
        accountNumber: selectedAccount?.accountNumber || "",
      }));
    },
    [bankAccounts, setPaymentData]
  );

  return (
    <Modal show={show} onHide={onHide} centered size="xl">
      <Modal.Header
        closeButton
        className={`${currentConfig.modalHeader} text-white`}
      >
        <Modal.Title className="d-flex align-items-center gap-2">
          <FontAwesomeIcon icon={currentConfig.paymentIcon} />
          {/* ✅ UPDATED: Show edit mode in title */}
          {isEditMode ? "Edit Payment" : currentConfig.modalTitle} - ₹
          {itemsTableLogic.formatCurrency(finalTotalWithRoundOff)}
          {paymentData.partyName && (
            <Badge bg="light" text="dark" className="ms-2">
              {paymentData.partyName}
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        {/* ✅ UPDATED: Information banner for edit mode */}
        <Alert variant={isEditMode ? "warning" : "info"} className="mb-3">
          <FontAwesomeIcon
            icon={isEditMode ? faSpinner : faInfoCircle}
            className="me-2"
          />
          <strong>
            {isEditMode ? "Edit Payment:" : "New Invoice Payment:"}
          </strong>{" "}
          {isEditMode
            ? "Modify the existing payment details below."
            : "Enter payment details that will be saved with the invoice."}
          {isFullPayment && !isEditMode && (
            <div className="mt-1">
              <FontAwesomeIcon
                icon={faCheckCircle}
                className="me-1 text-success"
              />
              <small className="text-success">
                Payment amount auto-set to full invoice total
              </small>
            </div>
          )}
        </Alert>

        {/* Validation feedback */}
        {!submitState.isValid && (
          <Alert variant="warning" className="mb-3">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            <strong>Validation:</strong> {getValidationMessage()}
          </Alert>
        )}

        <Row>
          {/* Left Column - Payment Form */}
          <Col md={7}>
            <Form onSubmit={handleCleanPaymentSubmit}>
              {/* Party Information */}
              <div className="mb-4">
                <Form.Label className="fw-bold text-secondary mb-2">
                  <FontAwesomeIcon icon={faUser} className="me-2" />
                  {currentConfig.partyLabel}
                </Form.Label>
                <Form.Control
                  type="text"
                  value={paymentData.partyName || "No party selected"}
                  readOnly
                  className={`border-2 rounded-3 ${
                    paymentData.partyName
                      ? "bg-light"
                      : "bg-warning bg-opacity-25"
                  }`}
                  style={{padding: "12px 16px", fontSize: "16px"}}
                />
                <small
                  className={`${
                    paymentData.partyName ? "text-muted" : "text-warning"
                  }`}
                >
                  {paymentData.partyName
                    ? isEditMode
                      ? "Party from existing payment"
                      : "Auto-selected from form"
                    : "Please select a customer/supplier in the form above"}
                </small>
              </div>

              {/* Payment Type */}
              <div className="mb-4">
                <Form.Label className="fw-bold text-secondary mb-2">
                  <FontAwesomeIcon icon={faCreditCard} className="me-2" />
                  Payment Method
                </Form.Label>
                <Form.Select
                  value={paymentData.paymentType || "Cash"}
                  onChange={(e) =>
                    handlePaymentTypeChangeOptimized(e.target.value)
                  }
                  className="border-2 rounded-3"
                  style={{padding: "12px 16px", fontSize: "16px"}}
                >
                  <option value="Cash">💵 Cash Payment</option>
                  <option value="UPI">📱 UPI Transfer</option>
                  <option value="Bank Account">🏦 Bank Transfer</option>
                  <option value="Card">💳 Card Payment</option>
                  <option value="Cheque">📝 Cheque Payment</option>
                  <option value="Online">🌐 Online Payment</option>
                  <option value="NEFT">💸 NEFT Transfer</option>
                  <option value="RTGS">⚡ RTGS Transfer</option>
                </Form.Select>
              </div>

              {/* ✅ UPDATED: Bank Account Selection with improved edit mode support */}
              {!["Cash", "UPI"].includes(paymentData.paymentType) && (
                <div className="mb-4">
                  <Form.Label className="fw-bold text-secondary mb-2 d-flex justify-content-between align-items-center">
                    <span>
                      <FontAwesomeIcon icon={faUniversity} className="me-2" />
                      Select Bank Account *
                      {isEditMode && paymentData.bankAccountName && (
                        <Badge bg="info" className="ms-2 fw-normal">
                          Currently: {paymentData.bankAccountName}
                        </Badge>
                      )}
                    </span>
                    {!loadingBankAccounts && (
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={handleRetryBankAccounts}
                        className="d-flex align-items-center"
                      >
                        <FontAwesomeIcon icon={faRefresh} className="me-1" />
                        Refresh
                      </Button>
                    )}
                  </Form.Label>

                  {loadingBankAccounts ? (
                    <div className="text-center py-3 bg-light rounded-3 border-2">
                      <FontAwesomeIcon
                        icon={faSpinner}
                        className="fa-spin me-2 text-primary"
                      />
                      <span className="text-muted">
                        Loading bank accounts...
                      </span>
                    </div>
                  ) : bankAccounts.length === 0 ? (
                    <div className="border-2 rounded-3 p-3">
                      <Alert variant="warning" className="mb-2">
                        <FontAwesomeIcon icon={faUniversity} className="me-2" />
                        <strong>No bank accounts found</strong>
                        <p className="mb-2 mt-2">
                          Please add a bank account first to use this payment
                          method.
                        </p>
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={handleRetryBankAccounts}
                          >
                            <FontAwesomeIcon
                              icon={faRefresh}
                              className="me-1"
                            />
                            Try Again
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              window.open("/bank-accounts/add", "_blank")
                            }
                          >
                            <FontAwesomeIcon icon={faPlus} className="me-1" />
                            Add Bank Account
                          </Button>
                        </div>
                      </Alert>
                    </div>
                  ) : (
                    <>
                      <Form.Select
                        value={paymentData.bankAccountId || ""}
                        onChange={(e) =>
                          handleBankAccountChange(e.target.value)
                        }
                        className={`border-2 rounded-3 ${
                          !paymentData.bankAccountId
                            ? "border-warning"
                            : "border-success"
                        }`}
                        style={{padding: "12px 16px", fontSize: "16px"}}
                        required
                      >
                        <option value="">
                          {isEditMode
                            ? "Change Bank Account"
                            : "Select Bank Account"}
                        </option>
                        {bankAccounts.map((account) => {
                          const accountId = account._id || account.id;
                          const accountName =
                            account.accountName || account.name || "Unknown";
                          const bankName = account.bankName || "Unknown Bank";
                          const accountNumber = account.accountNumber || "N/A";
                          const balance =
                            account.currentBalance || account.balance || 0;

                          return (
                            <option key={accountId} value={accountId}>
                              {account.displayName ||
                                `${accountName} - ${bankName} (${accountNumber}) - ₹${itemsTableLogic.formatCurrency(
                                  balance
                                )}`}
                            </option>
                          );
                        })}
                      </Form.Select>
                      <small className="text-success">
                        <FontAwesomeIcon
                          icon={faCheckCircle}
                          className="me-1"
                        />
                        {bankAccounts.length} bank account
                        {bankAccounts.length !== 1 ? "s" : ""} available
                        {isEditMode && paymentData.bankAccountId && (
                          <span className="text-info ms-2">
                            • Currently selected:{" "}
                            {paymentData.bankAccountName || "Unknown"}
                          </span>
                        )}
                      </small>
                    </>
                  )}
                </div>
              )}

              {/* Cheque Details */}
              {paymentData.paymentType === "Cheque" && (
                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Label className="fw-bold text-secondary mb-2">
                      <FontAwesomeIcon icon={faReceipt} className="me-2" />
                      Cheque Number *
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={paymentData.chequeNumber || ""}
                      onChange={(e) => {
                        setPaymentData((prev) => ({
                          ...prev,
                          chequeNumber: e.target.value,
                        }));
                      }}
                      placeholder="Enter cheque number"
                      className={`border-2 rounded-3 ${
                        !paymentData.chequeNumber
                          ? "border-warning"
                          : "border-success"
                      }`}
                      style={{padding: "12px 16px"}}
                      required
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label className="fw-bold text-secondary mb-2">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                      Cheque Date *
                    </Form.Label>
                    <Form.Control
                      type="date"
                      value={paymentData.chequeDate || ""}
                      onChange={(e) => {
                        setPaymentData((prev) => ({
                          ...prev,
                          chequeDate: e.target.value,
                        }));
                      }}
                      className={`border-2 rounded-3 ${
                        !paymentData.chequeDate
                          ? "border-warning"
                          : "border-success"
                      }`}
                      style={{padding: "12px 16px"}}
                      max={new Date().toISOString().split("T")[0]}
                      required
                    />
                  </Col>
                </Row>
              )}

              {/* ✅ UPDATED: Payment Amount with edit mode considerations */}
              <div className="mb-4">
                <Form.Label className="fw-bold text-secondary mb-2">
                  <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                  Payment Amount *
                  {isFullPayment && (
                    <Badge bg="success" className="ms-2">
                      Full Payment
                    </Badge>
                  )}
                  {isEditMode && (
                    <Badge bg="warning" className="ms-2">
                      Editing
                    </Badge>
                  )}
                </Form.Label>
                <InputGroup size="lg">
                  <InputGroup.Text
                    className={`${currentConfig.totalBgColor} text-white fw-bold`}
                  >
                    ₹
                  </InputGroup.Text>
                  <Form.Control
                    type="number"
                    placeholder="Enter amount"
                    value={paymentData.amount || ""}
                    onChange={(e) =>
                      debouncedPaymentAmountChange(e.target.value)
                    }
                    max={finalTotalWithRoundOff}
                    min="0"
                    step="0.01"
                    className={`fw-bold border-2 ${
                      !paymentData.amount || paymentData.amount <= 0
                        ? "border-warning"
                        : isFullPayment
                        ? "border-success"
                        : "border-info"
                    }`}
                    style={{fontSize: "18px"}}
                    required
                  />
                  {/* ✅ UPDATED: Show full amount button for both new and edit modes */}
                  <Button
                    variant={
                      isFullPayment
                        ? "success"
                        : currentConfig.saveButtonVariant
                    }
                    onClick={handleFullAmountClick}
                    className="fw-bold"
                    type="button"
                    disabled={isFullPayment}
                  >
                    {isFullPayment ? "Full Amount Set" : "Set Full Amount"}
                  </Button>
                </InputGroup>

                {/* Amount validation feedback */}
                {!paymentData.amount || paymentData.amount <= 0 ? (
                  <small className="text-warning">
                    <FontAwesomeIcon
                      icon={faExclamationTriangle}
                      className="me-1"
                    />
                    Please enter a valid payment amount
                  </small>
                ) : parseFloat(paymentData.amount) > finalTotalWithRoundOff ? (
                  <small className="text-danger">
                    <FontAwesomeIcon
                      icon={faExclamationTriangle}
                      className="me-1"
                    />
                    Payment amount cannot exceed invoice total
                  </small>
                ) : isFullPayment ? (
                  <small className="text-success">
                    <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                    Full payment amount - No remaining balance
                  </small>
                ) : (
                  <small className="text-info">
                    <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                    Valid payment amount - Partial payment
                  </small>
                )}

                {isPartialPayment && (
                  <Alert variant="warning" className="mt-2 mb-0">
                    <FontAwesomeIcon
                      icon={faExclamationTriangle}
                      className="me-2"
                    />
                    <strong>Partial Payment:</strong> ₹
                    {itemsTableLogic.formatCurrency(remainingAmount)} will
                    remain pending
                  </Alert>
                )}
              </div>

              {/* ✅ SINGLE DATE FIELD: Next Payment Due Date (for partial payments only) */}
              {isPartialPayment && (
                <div className="mb-4">
                  <Form.Label className="fw-bold text-secondary mb-2">
                    <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                    Next Payment Due Date *
                    {isEditMode && paymentData.nextPaymentDate && (
                      <Badge bg="info" className="ms-2 fw-normal">
                        Current:{" "}
                        {new Date(
                          paymentData.nextPaymentDate
                        ).toLocaleDateString("en-IN")}
                      </Badge>
                    )}
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={paymentData.nextPaymentDate || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPaymentData((prev) => ({
                        ...prev,
                        nextPaymentDate: value,
                      }));
                      if (handleDueDateChange) {
                        handleDueDateChange(value);
                      }
                    }}
                    className={`border-2 rounded-3 ${
                      !paymentData.nextPaymentDate
                        ? "border-warning"
                        : "border-success"
                    }`}
                    style={{padding: "12px 16px"}}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                  <small className="text-muted">
                    Expected date for remaining payment of ₹
                    {itemsTableLogic.formatCurrency(remainingAmount)}
                  </small>
                  {!paymentData.nextPaymentDate && (
                    <div>
                      <small className="text-warning">
                        <FontAwesomeIcon
                          icon={faExclamationTriangle}
                          className="me-1"
                        />
                        Due date is required for remaining balance
                      </small>
                    </div>
                  )}
                </div>
              )}

              {/* Transaction ID for online payments */}
              {["UPI", "Online", "NEFT", "RTGS"].includes(
                paymentData.paymentType
              ) && (
                <div className="mb-4">
                  <Form.Label className="fw-bold text-secondary mb-2">
                    <FontAwesomeIcon icon={faReceipt} className="me-2" />
                    Transaction ID (Optional)
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={paymentData.transactionId || ""}
                    onChange={(e) => {
                      setPaymentData((prev) => ({
                        ...prev,
                        transactionId: e.target.value,
                      }));
                    }}
                    placeholder="Enter transaction ID or reference number"
                    className="border-2 rounded-3"
                    style={{padding: "12px 16px"}}
                  />
                </div>
              )}

              {/* Notes */}
              <div className="mb-4">
                <Form.Label className="fw-bold text-secondary mb-2">
                  Notes (Optional)
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={paymentData.notes || ""}
                  onChange={(e) => {
                    setPaymentData((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }));
                  }}
                  placeholder="Add any notes about this payment..."
                  className="border-2 rounded-3"
                />
              </div>
            </Form>
          </Col>

          {/* Right Column - Payment Summary */}
          <Col md={5}>
            <Card className="bg-light h-100">
              <Card.Header
                className={`${currentConfig.totalBgColor} text-white`}
              >
                <h6 className="mb-0">
                  <FontAwesomeIcon icon={faWallet} className="me-2" />
                  Payment Summary
                  {isEditMode && (
                    <Badge bg="warning" className="ms-2">
                      Editing
                    </Badge>
                  )}
                </h6>
              </Card.Header>
              <Card.Body>
                {/* Invoice Details */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Invoice Number:</span>
                    <span className="fw-bold">
                      {invoiceNumber || "New Invoice"}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Invoice Date:</span>
                    <span className="fw-bold">
                      {invoiceDate || new Date().toLocaleDateString()}
                    </span>
                  </div>
                  <hr />

                  {/* Amount Breakdown */}
                  {gstEnabled && totals.totalTax > 0 ? (
                    <>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Subtotal (Pre-Tax):</span>
                        <span className="fw-bold">
                          ₹
                          {itemsTableLogic.formatCurrency(totals.subtotal || 0)}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span>GST Amount:</span>
                        <span className="fw-bold text-info">
                          ₹
                          {itemsTableLogic.formatCurrency(totals.totalTax || 0)}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between mb-2 border-top pt-2">
                        <span>Total (Inc. GST):</span>
                        <span className="fw-bold">
                          ₹
                          {itemsTableLogic.formatCurrency(
                            totals.finalTotal || 0
                          )}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="d-flex justify-content-between mb-2">
                      <span>
                        {gstEnabled
                          ? "Total (Calculating GST...)"
                          : "Total Amount"}
                        :
                      </span>
                      <span className="fw-bold">
                        ₹
                        {itemsTableLogic.formatCurrency(totals.finalTotal || 0)}
                      </span>
                    </div>
                  )}

                  {roundOffEnabled && roundOffValue !== 0 && (
                    <div className="d-flex justify-content-between mb-2">
                      <span>Round Off:</span>
                      <span
                        className={`fw-bold ${
                          roundOffValue > 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        {roundOffValue > 0 ? "+" : ""}₹
                        {itemsTableLogic.formatCurrency(
                          Math.abs(roundOffValue)
                        )}
                      </span>
                    </div>
                  )}

                  <div className="d-flex justify-content-between mb-2 border-top pt-2">
                    <span className="fw-bold">Invoice Total:</span>
                    <span className="fw-bold text-primary">
                      ₹
                      {itemsTableLogic.formatCurrency(
                        finalTotalWithRoundOff || 0
                      )}
                    </span>
                  </div>

                  {/* Payment Details */}
                  {paymentData.amount && parseFloat(paymentData.amount) > 0 && (
                    <>
                      <hr />
                      <div className="d-flex justify-content-between mb-2">
                        <span className="fw-bold">Payment Amount:</span>
                        <span
                          className={`fw-bold ${
                            isFullPayment ? "text-success" : "text-info"
                          }`}
                        >
                          ₹
                          {itemsTableLogic.formatCurrency(
                            paymentData.amount || 0
                          )}
                        </span>
                      </div>

                      {remainingAmount > 0 && (
                        <div className="d-flex justify-content-between">
                          <span className="fw-bold">Remaining Balance:</span>
                          <span className="fw-bold text-warning">
                            ₹{itemsTableLogic.formatCurrency(remainingAmount)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Payment Status */}
                <div className="text-center mb-3">
                  {isNoPayment ? (
                    <span className="badge bg-secondary fs-6 px-3 py-2">
                      <FontAwesomeIcon
                        icon={faMoneyBillWave}
                        className="me-1"
                      />
                      Enter Payment Amount
                    </span>
                  ) : isFullPayment ? (
                    <span className="badge bg-success fs-6 px-3 py-2">
                      <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                      Full Payment Ready
                    </span>
                  ) : isPartialPayment ? (
                    <span className="badge bg-warning fs-6 px-3 py-2">
                      <FontAwesomeIcon
                        icon={faExclamationTriangle}
                        className="me-1"
                      />
                      Partial Payment
                    </span>
                  ) : (
                    <span className="badge bg-info fs-6 px-3 py-2">
                      <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                      Ready to Process
                    </span>
                  )}
                </div>

                {/* Payment Method Display */}
                {paymentData.paymentType && (
                  <div className="mb-3">
                    <hr />
                    <div className="text-center">
                      <Badge bg="info" className="fs-6 px-3 py-2">
                        <FontAwesomeIcon icon={faCreditCard} className="me-2" />
                        Payment Method: {paymentData.paymentType}
                      </Badge>
                    </div>

                    {paymentData.bankAccountName && (
                      <div className="mt-2 text-center">
                        <small className="text-muted">
                          Bank: {paymentData.bankAccountName}
                        </small>
                      </div>
                    )}

                    {paymentData.chequeNumber && (
                      <div className="mt-1 text-center">
                        <small className="text-muted">
                          Cheque #: {paymentData.chequeNumber}
                        </small>
                      </div>
                    )}

                    {paymentData.transactionId && (
                      <div className="mt-1 text-center">
                        <small className="text-muted">
                          Transaction ID: {paymentData.transactionId}
                        </small>
                      </div>
                    )}
                  </div>
                )}

                {/* ✅ Simple due date display for full payments */}
                {isFullPayment && (
                  <div className="mt-3">
                    <hr />
                    <div className="text-center">
                      <Badge bg="success" className="fs-6 px-3 py-2">
                        <FontAwesomeIcon
                          icon={faCalendarAlt}
                          className="me-2"
                        />
                        Payment Due:{" "}
                        {new Date(
                          paymentData.dueDate || invoiceDate || new Date()
                        ).toLocaleDateString("en-IN")}
                      </Badge>
                    </div>
                    <div className="mt-2 text-center">
                      <small className="text-muted">
                        {isEditMode
                          ? "Payment due date"
                          : "Full payment due on invoice date"}
                      </small>
                    </div>
                  </div>
                )}

                {/* Next Payment Date display only for partial payments */}
                {isPartialPayment && paymentData.nextPaymentDate && (
                  <div className="mt-3">
                    <hr />
                    <Alert variant="warning" className="mb-0">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                      <strong>Next Payment Due:</strong>
                      <br />
                      Date:{" "}
                      {new Date(paymentData.nextPaymentDate).toLocaleDateString(
                        "en-IN"
                      )}
                      <br />
                      Amount: ₹{itemsTableLogic.formatCurrency(remainingAmount)}
                    </Alert>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between bg-light">
        <Button
          variant="outline-secondary"
          size="lg"
          onClick={onHide}
          disabled={submittingPayment}
        >
          Cancel
        </Button>

        {/* ✅ UPDATED: Button text for edit mode */}
        <Button
          variant={
            submitState.isValid
              ? isFullPayment
                ? "success"
                : currentConfig.buttonVariant
              : "outline-secondary"
          }
          size="lg"
          onClick={handleCleanPaymentSubmit}
          disabled={submitState.isDisabled}
          className="fw-bold px-4"
          type="button"
        >
          {submittingPayment ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="fa-spin me-2" />
              {isEditMode ? "Updating Payment..." : "Saving Payment Details..."}
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
              {isEditMode
                ? `Update Payment`
                : isFullPayment
                ? "Save Full Payment"
                : "Save Payment Details"}
              {(paymentData.amount || 0) > 0 && (
                <span className="ms-2">
                  (₹{itemsTableLogic.formatCurrency(paymentData.amount || 0)})
                </span>
              )}
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PaymentModal;
