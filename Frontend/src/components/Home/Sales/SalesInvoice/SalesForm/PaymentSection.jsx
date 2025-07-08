import React, {useState, useEffect, useMemo} from "react";
import {
  Card,
  Form,
  Badge,
  Row,
  Col,
  Button,
  Alert,
  InputGroup,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faMoneyBillWave,
  faUniversity,
  faCreditCard,
  faMobile,
  faCoins,
  faCalendarAlt,
  faClock,
  faCalculator,
  faExclamationTriangle,
  faInfoCircle,
  faCheckCircle,
  faRefresh,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

import {useBankAccounts} from "./itemsTableWithTotals/itemsTableHooks";

function PaymentSection({
  paymentMethod,
  notes,
  onPaymentMethodChange,
  onNotesChange,
  totalAmount = 0,
  paidAmount = 0,
  onPaidAmountChange,
  paymentDate,
  onPaymentDateChange,
  creditDays = 0,
  onCreditDaysChange,
  dueDate,
  onDueDateChange,
  paymentStatus = "pending",
  editMode = false,
  existingPaymentData = null,
  formData = {},
  disabled = false,
  companyId,
  onPaymentDataChange,
}) {
  const [showCreditOptions, setShowCreditOptions] = useState(false);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [calculatedDueDate, setCalculatedDueDate] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [internalPaymentMethod, setInternalPaymentMethod] = useState("");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("");

  const {
    bankAccounts,
    loadingBankAccounts,
    retryLoadBankAccounts,
    getBankAccountById,
  } = useBankAccounts(companyId);

  const paymentOptions = [
    {
      value: "cash",
      label: "Cash Payment",
      icon: faCoins,
      color: "success",
      description: "Immediate cash payment",
    },
    {
      value: "card",
      label: "Card Payment",
      icon: faCreditCard,
      color: "primary",
      description: "Credit/Debit card payment",
    },
    {
      value: "upi",
      label: "UPI Payment",
      icon: faMobile,
      color: "warning",
      description: "Digital UPI payment",
    },
    {
      value: "bank",
      label: "Bank Transfer",
      icon: faUniversity,
      color: "info",
      description: "Direct bank transfer",
    },
    {
      value: "credit",
      label: "Credit Sale",
      icon: faMoneyBillWave,
      color: "secondary",
      description: "Pay later with credit terms",
    },
    {
      value: "partial",
      label: "Partial Payment",
      icon: faCalculator,
      color: "dark",
      description: "Partial payment with remaining credit",
    },
  ];

  // Payment method normalization
  const normalizePaymentMethod = (method) => {
    if (!method) return "cash";

    const methodStr = method.toString().toLowerCase();
    const methodMappings = {
      bank_transfer: "bank",
      banktransfer: "bank",
      "bank transfer": "bank",
      bank: "bank",
      neft: "bank",
      rtgs: "bank",
      imps: "bank",
      card: "card",
      credit_card: "card",
      debit_card: "card",
      creditcard: "card",
      debitcard: "card",
      upi: "upi",
      upi_payment: "upi",
      upipayment: "upi",
      paytm: "upi",
      gpay: "upi",
      phonepe: "upi",
      cash: "cash",
      cash_payment: "cash",
      cashpayment: "cash",
      credit: "credit",
      credit_sale: "credit",
      creditsale: "credit",
      partial: "partial",
      partial_payment: "partial",
      partialpayment: "partial",
    };

    const normalizedMethod = methodMappings[methodStr] || methodStr;
    const validMethod = paymentOptions.find(
      (option) => option.value === normalizedMethod
    );
    return validMethod ? normalizedMethod : "cash";
  };

  // Bank account selection handler
  const handleBankAccountChange = (accountId) => {
    setSelectedBankAccountId(accountId);

    if (accountId) {
      const account = getBankAccountById(accountId);
      if (account && onNotesChange) {
        const bankNote = `Bank: ${account.bankName} | Account: ${account.accountName} | A/C No: ${account.accountNumber}`;
        const existingNotes = notes || "";

        if (!existingNotes.includes(account.bankName)) {
          const updatedNotes = existingNotes
            ? `${existingNotes} | ${bankNote}`
            : bankNote;
          onNotesChange(updatedNotes);
        }
      }
    }
  };

  // Payment data calculation
  const paymentData = useMemo(() => {
    const effectivePaidAmount = parseFloat(paidAmount) || 0;
    const effectiveTotalAmount = parseFloat(totalAmount) || 0;
    const remainingAmount = effectiveTotalAmount - effectivePaidAmount;
    const isFullyPaid =
      effectivePaidAmount >= effectiveTotalAmount && effectiveTotalAmount > 0;
    const isOverpaid =
      effectivePaidAmount > effectiveTotalAmount && effectiveTotalAmount > 0;
    const isPartiallyPaid =
      effectivePaidAmount > 0 && effectivePaidAmount < effectiveTotalAmount;

    return {
      paidAmount: effectivePaidAmount,
      totalAmount: effectiveTotalAmount,
      remainingAmount,
      isFullyPaid,
      isOverpaid,
      isPartiallyPaid,
    };
  }, [paidAmount, totalAmount]);

  // Payment data for parent component
  const getPaymentDataForParent = () => {
    const paymentInfo = {
      method: effectivePaymentMethod,
      paymentType: effectivePaymentMethod,
      amount: paidAmount,
      paidAmount: paidAmount,
      pendingAmount: paymentData.remainingAmount,
      totalAmount: totalAmount,
      paymentDate: paymentDate,
      dueDate: dueDate || calculatedDueDate,
      creditDays: parseInt(creditDays) || 0,
      notes: notes,
      reference: notes,
      status: paymentData.isFullyPaid
        ? "paid"
        : paymentData.isPartiallyPaid
        ? "partial"
        : "pending",
      isPartialPayment: paymentData.isPartiallyPaid,
      isFullyPaid: paymentData.isFullyPaid,
      isOverpaid: paymentData.isOverpaid,
      sourceCompanyId: companyId,
      companyId: companyId,
    };

    // Bank account info for bank transfers
    if (effectivePaymentMethod === "bank" && selectedBankAccountId) {
      paymentInfo.bankAccountId = selectedBankAccountId;
      paymentInfo.bankAccountName = getBankAccountById(
        selectedBankAccountId
      )?.accountName;
    }

    // Payment method specific fields
    if (effectivePaymentMethod === "cheque") {
      paymentInfo.chequeNumber = notes.match(/Cheque.*?(\d+)/i)?.[1] || "";
      paymentInfo.chequeDate = paymentDate;
    }

    if (["upi", "online", "neft", "rtgs"].includes(effectivePaymentMethod)) {
      paymentInfo.transactionId =
        notes.match(/(?:Ref|Trans|ID).*?([A-Z0-9]+)/i)?.[1] || "";
    }

    return paymentInfo;
  };

  // Initialize internal payment method
  useEffect(() => {
    const normalized = normalizePaymentMethod(paymentMethod);
    if (normalized !== internalPaymentMethod) {
      setInternalPaymentMethod(normalized);
    }
  }, [paymentMethod, internalPaymentMethod]);

  const effectivePaymentMethod =
    internalPaymentMethod || normalizePaymentMethod(paymentMethod);

  const selectedPayment = paymentOptions.find(
    (option) => option.value === effectivePaymentMethod
  );

  // Initialize for edit mode
  useEffect(() => {
    if (
      editMode &&
      !initialized &&
      (existingPaymentData || formData || totalAmount > 0)
    ) {
      const paymentInfo =
        existingPaymentData || formData.paymentData || formData.payment || {};

      const rawPaymentMethod =
        paymentMethod ||
        paymentInfo.method ||
        paymentInfo.paymentType ||
        formData.paymentMethod ||
        formData.paymentType ||
        "cash";

      const initialPaymentMethod = normalizePaymentMethod(rawPaymentMethod);

      const calculatedPaidAmount = formData.totalAmount
        ? formData.totalAmount -
          (formData.balance || formData.pendingAmount || 0)
        : 0;

      const initialPaidAmount =
        paidAmount ||
        paymentInfo.paidAmount ||
        paymentInfo.amount ||
        formData.paymentReceived ||
        formData.paidAmount ||
        calculatedPaidAmount ||
        0;

      const initialPaymentDate =
        paymentDate ||
        paymentInfo.paymentDate ||
        formData.paymentDate ||
        formData.invoiceDate ||
        new Date().toISOString().split("T")[0];

      const initialDueDate = dueDate || paymentInfo.dueDate || formData.dueDate;
      const initialCreditDays =
        creditDays || paymentInfo.creditDays || formData.creditDays || 0;
      const initialNotes =
        notes ||
        paymentInfo.notes ||
        paymentInfo.reference ||
        formData.paymentNotes ||
        formData.paymentReference ||
        "";

      const initialBankAccountId =
        paymentInfo.bankAccountId ||
        formData.bankAccountId ||
        formData.paymentData?.bankAccountId ||
        "";

      setInternalPaymentMethod(initialPaymentMethod);

      if (initialBankAccountId && initialPaymentMethod === "bank") {
        setSelectedBankAccountId(initialBankAccountId);
      }

      if (initialPaymentMethod === "credit") {
        setShowCreditOptions(true);
        setIsPartialPayment(false);
      } else if (
        initialPaymentMethod === "partial" ||
        (initialPaidAmount > 0 && initialPaidAmount < totalAmount)
      ) {
        setShowCreditOptions(true);
        setIsPartialPayment(true);
      } else {
        setShowCreditOptions(false);
        setIsPartialPayment(false);
      }

      if (
        onPaymentMethodChange &&
        initialPaymentMethod !== effectivePaymentMethod
      ) {
        onPaymentMethodChange(initialPaymentMethod);
      }

      if (onPaidAmountChange && initialPaidAmount !== paidAmount) {
        onPaidAmountChange(initialPaidAmount);
      }

      if (onPaymentDateChange && initialPaymentDate !== paymentDate) {
        onPaymentDateChange(initialPaymentDate);
      }

      if (onDueDateChange && initialDueDate && initialDueDate !== dueDate) {
        onDueDateChange(initialDueDate);
      }

      if (onCreditDaysChange && initialCreditDays !== creditDays) {
        onCreditDaysChange(initialCreditDays);
      }

      if (onNotesChange && initialNotes !== notes) {
        onNotesChange(initialNotes);
      }

      setInitialized(true);
    }
  }, [
    editMode,
    existingPaymentData,
    formData,
    totalAmount,
    paidAmount,
    paymentMethod,
    effectivePaymentMethod,
    initialized,
  ]);

  // Calculate due date based on payment date and credit days
  useEffect(() => {
    if (paymentDate && creditDays > 0) {
      const paymentDateObj = new Date(paymentDate);
      const calculatedDate = new Date(paymentDateObj);
      calculatedDate.setDate(calculatedDate.getDate() + parseInt(creditDays));

      const formattedDate = calculatedDate.toISOString().split("T")[0];
      setCalculatedDueDate(formattedDate);

      if (onDueDateChange && !dueDate) {
        onDueDateChange(formattedDate);
      }
    }
  }, [paymentDate, creditDays, onDueDateChange, dueDate]);

  // Notify parent of payment data changes
  useEffect(() => {
    if (onPaymentDataChange && typeof onPaymentDataChange === "function") {
      const currentPaymentData = getPaymentDataForParent();
      onPaymentDataChange(currentPaymentData);
    }
  }, [
    effectivePaymentMethod,
    paidAmount,
    paymentDate,
    dueDate,
    creditDays,
    notes,
    selectedBankAccountId,
    companyId,
    totalAmount,
  ]);

  // Payment method change handler
  const handlePaymentMethodChange = (method) => {
    const normalizedMethod = normalizePaymentMethod(method);
    setInternalPaymentMethod(normalizedMethod);

    if (!["bank", "bank_transfer"].includes(normalizedMethod)) {
      setSelectedBankAccountId("");
    }

    onPaymentMethodChange(normalizedMethod);

    if (normalizedMethod === "credit") {
      setShowCreditOptions(true);
      setIsPartialPayment(false);
      if (onPaidAmountChange && !editMode) {
        onPaidAmountChange(0);
      }
    } else if (normalizedMethod === "partial") {
      setShowCreditOptions(true);
      setIsPartialPayment(true);
      if (onPaidAmountChange && (!paidAmount || paidAmount === 0)) {
        onPaidAmountChange(totalAmount * 0.5);
      }
    } else {
      setShowCreditOptions(false);
      setIsPartialPayment(false);
      if (onPaidAmountChange && !editMode) {
        onPaidAmountChange(totalAmount);
      }
    }
  };

  // Paid amount change handler
  const handlePaidAmountChange = (amount) => {
    const numericAmount = parseFloat(amount) || 0;

    if (onPaidAmountChange) {
      onPaidAmountChange(numericAmount);
    }

    if (
      numericAmount > 0 &&
      numericAmount < totalAmount &&
      effectivePaymentMethod !== "partial"
    ) {
      setIsPartialPayment(true);
      setShowCreditOptions(true);
    } else if (numericAmount >= totalAmount) {
      setIsPartialPayment(false);
      if (effectivePaymentMethod === "partial") {
        handlePaymentMethodChange("cash");
      }
    }
  };

  // Credit days change handler
  const handleCreditDaysChange = (days) => {
    const numericDays = parseInt(days) || 0;

    if (onCreditDaysChange) {
      onCreditDaysChange(numericDays);
    }
  };

  // Payment status badge
  const getPaymentStatusBadge = () => {
    if (paymentData.isOverpaid) {
      return (
        <Badge bg="warning" className="ms-2">
          Overpaid ₹
          {(paymentData.paidAmount - paymentData.totalAmount).toLocaleString(
            "en-IN"
          )}
        </Badge>
      );
    } else if (paymentData.isFullyPaid) {
      return (
        <Badge bg="success" className="ms-2">
          Fully Paid
        </Badge>
      );
    } else if (paymentData.isPartiallyPaid) {
      return (
        <Badge bg="info" className="ms-2">
          Partially Paid (
          {((paymentData.paidAmount / paymentData.totalAmount) * 100).toFixed(
            0
          )}
          %)
        </Badge>
      );
    } else {
      return (
        <Badge bg="secondary" className="ms-2">
          Unpaid
        </Badge>
      );
    }
  };

  // Due date status
  const getDueDateStatus = () => {
    const effectiveDueDate = dueDate || calculatedDueDate;
    if (!effectiveDueDate) return null;

    const today = new Date();
    const due = new Date(effectiveDueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <Badge bg="danger">Overdue by {Math.abs(diffDays)} days</Badge>;
    } else if (diffDays === 0) {
      return <Badge bg="warning">Due Today</Badge>;
    } else if (diffDays <= 3) {
      return <Badge bg="warning">Due in {diffDays} days</Badge>;
    } else {
      return <Badge bg="success">Due in {diffDays} days</Badge>;
    }
  };

  // Payment summary for edit mode
  const getPaymentSummary = () => {
    if (!editMode) return null;

    return (
      <Alert variant="info" className="mb-3">
        <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
        <strong>Current Payment Status:</strong>
        <br />• Payment Method:{" "}
        <strong>{selectedPayment?.label || "Not selected"}</strong>
        {selectedBankAccountId && effectivePaymentMethod === "bank" && (
          <>
            <br />• Bank Account:{" "}
            <strong>
              {getBankAccountById(selectedBankAccountId)?.shortDisplayName ||
                "Selected"}
            </strong>
          </>
        )}
        <br />• Total Amount:{" "}
        <strong>
          ₹
          {paymentData.totalAmount.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}
        </strong>
        <br />• Paid Amount:{" "}
        <strong
          className={
            paymentData.isPartiallyPaid
              ? "text-info"
              : paymentData.isFullyPaid
              ? "text-success"
              : "text-secondary"
          }
        >
          ₹
          {paymentData.paidAmount.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}
        </strong>
        <br />• Remaining:{" "}
        <strong
          className={
            paymentData.remainingAmount > 0 ? "text-danger" : "text-success"
          }
        >
          ₹
          {paymentData.remainingAmount.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}
        </strong>
        {creditDays > 0 && (
          <>
            <br />• Credit Period: <strong>{creditDays} days</strong>
            <br />• Due Date:{" "}
            <strong>
              {dueDate || calculatedDueDate
                ? new Date(dueDate || calculatedDueDate).toLocaleDateString(
                    "en-IN"
                  )
                : "Not set"}
            </strong>
          </>
        )}
      </Alert>
    );
  };

  // Edit mode warning
  const getEditModeIndicator = () => {
    if (!editMode || !paymentData.isPartiallyPaid) return null;

    return (
      <Alert variant="warning" className="mb-3">
        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
        <strong>Editing Partially Paid Invoice:</strong>
        <br />
        Changes to amounts may affect payment records. Please ensure payment
        adjustments are handled appropriately.
      </Alert>
    );
  };

  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Header className="bg-success text-white">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
            Payment Details
            {editMode && (
              <Badge bg="light" text="dark" className="ms-2">
                Edit Mode
              </Badge>
            )}
          </h6>
          {getPaymentStatusBadge()}
        </div>
      </Card.Header>
      <Card.Body>
        {getPaymentSummary()}
        {getEditModeIndicator()}

        {/* Payment Amount Summary */}
        <div className="mb-3 p-3 bg-light">
          <Row className="g-2">
            <Col xs={6}>
              <small className="text-muted d-block">Total Amount</small>
              <strong className="text-primary">
                ₹
                {paymentData.totalAmount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </strong>
            </Col>
            <Col xs={6}>
              <small className="text-muted d-block">Paid Amount</small>
              <strong
                className={`${
                  paymentData.isOverpaid
                    ? "text-warning"
                    : paymentData.isFullyPaid
                    ? "text-success"
                    : paymentData.isPartiallyPaid
                    ? "text-info"
                    : "text-secondary"
                }`}
              >
                ₹
                {paymentData.paidAmount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </strong>
            </Col>
            <Col xs={12}>
              <small className="text-muted d-block">Remaining Amount</small>
              <strong
                className={`${
                  paymentData.remainingAmount > 0
                    ? "text-danger"
                    : paymentData.remainingAmount === 0
                    ? "text-success"
                    : "text-warning"
                }`}
              >
                ₹
                {paymentData.remainingAmount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </strong>
              {paymentData.isPartiallyPaid && (
                <Badge bg="info" className="ms-2" size="sm">
                  {(
                    (paymentData.paidAmount / paymentData.totalAmount) *
                    100
                  ).toFixed(1)}
                  % Paid
                </Badge>
              )}
            </Col>
          </Row>
        </div>

        {/* Payment Method Selection */}
        <Form.Group className="mb-3">
          <Form.Label className="text-muted fw-bold">
            <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
            Payment Method
          </Form.Label>
          <div className="d-grid gap-2">
            {paymentOptions.map((option) => (
              <div key={option.value} className="border p-2">
                <Form.Check
                  type="radio"
                  id={`payment-${option.value}`}
                  name="paymentMethod"
                  value={option.value}
                  checked={effectivePaymentMethod === option.value}
                  onChange={(e) => handlePaymentMethodChange(e.target.value)}
                  disabled={disabled}
                  label={
                    <div className="d-flex align-items-center justify-content-between w-100">
                      <div className="d-flex align-items-center">
                        <FontAwesomeIcon
                          icon={option.icon}
                          className={`text-${option.color} me-2`}
                        />
                        <div>
                          <div className="fw-medium">{option.label}</div>
                          <small className="text-muted">
                            {option.description}
                          </small>
                        </div>
                      </div>
                    </div>
                  }
                  className="payment-option"
                />
              </div>
            ))}
          </div>
        </Form.Group>

        {/* Bank Account Selection */}
        {effectivePaymentMethod === "bank" && (
          <Form.Group className="mb-3">
            <Form.Label className="text-muted fw-bold">
              <FontAwesomeIcon icon={faUniversity} className="me-2" />
              Select Bank Account *
            </Form.Label>

            {loadingBankAccounts ? (
              <div className="text-center py-3 bg-light border">
                <FontAwesomeIcon
                  icon={faSpinner}
                  className="fa-spin me-2 text-primary"
                />
                <span className="text-muted">Loading bank accounts...</span>
              </div>
            ) : bankAccounts.length === 0 ? (
              <Alert variant="warning" className="mb-2">
                <FontAwesomeIcon icon={faUniversity} className="me-2" />
                <strong>No bank accounts found</strong>
                <p className="mb-2 mt-2">
                  Please add a bank account first to use bank transfer payments.
                </p>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={retryLoadBankAccounts}
                  >
                    <FontAwesomeIcon icon={faRefresh} className="me-1" />
                    Retry Loading
                  </Button>
                </div>
              </Alert>
            ) : (
              <>
                <Form.Select
                  value={selectedBankAccountId}
                  onChange={(e) => handleBankAccountChange(e.target.value)}
                  className={`border-2 ${
                    selectedBankAccountId ? "border-success" : "border-warning"
                  }`}
                  required
                  disabled={disabled}
                >
                  <option value="">Select Bank Account</option>
                  {bankAccounts.map((account) => (
                    <option
                      key={account._id || account.id}
                      value={account._id || account.id}
                    >
                      {account.displayName}
                    </option>
                  ))}
                </Form.Select>

                {selectedBankAccountId && (
                  <small className="text-success mt-1 d-block">
                    <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                    Bank account selected successfully
                  </small>
                )}

                {bankAccounts.length > 0 && (
                  <small className="text-muted mt-1 d-block">
                    {bankAccounts.length} bank account
                    {bankAccounts.length !== 1 ? "s" : ""} available
                  </small>
                )}
              </>
            )}
          </Form.Group>
        )}

        {/* Payment Date */}
        <Form.Group className="mb-3">
          <Form.Label className="text-muted fw-bold">
            <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
            Payment Date
          </Form.Label>
          <Form.Control
            type="date"
            value={paymentDate}
            onChange={(e) =>
              onPaymentDateChange && onPaymentDateChange(e.target.value)
            }
            max={new Date().toISOString().split("T")[0]}
            disabled={disabled}
          />
        </Form.Group>

        {/* Paid Amount Input */}
        {(effectivePaymentMethod === "partial" ||
          isPartialPayment ||
          editMode ||
          paymentData.isPartiallyPaid) && (
          <Form.Group className="mb-3">
            <Form.Label className="text-muted fw-bold">
              <FontAwesomeIcon icon={faCalculator} className="me-2" />
              Paid Amount
              {editMode && (
                <small className="text-muted ms-2">
                  (Current: ₹{paymentData.paidAmount.toLocaleString("en-IN")})
                </small>
              )}
            </Form.Label>
            <InputGroup>
              <InputGroup.Text>₹</InputGroup.Text>
              <Form.Control
                type="number"
                value={paidAmount}
                onChange={(e) => handlePaidAmountChange(e.target.value)}
                min="0"
                max={totalAmount * 1.1}
                step="0.01"
                placeholder="Enter paid amount"
                disabled={disabled}
              />
            </InputGroup>
            <div className="mt-2 d-flex gap-2 flex-wrap">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => handlePaidAmountChange(totalAmount * 0.25)}
                disabled={disabled}
              >
                25%
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => handlePaidAmountChange(totalAmount * 0.5)}
                disabled={disabled}
              >
                50%
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => handlePaidAmountChange(totalAmount * 0.75)}
                disabled={disabled}
              >
                75%
              </Button>
              <Button
                variant="outline-success"
                size="sm"
                onClick={() => handlePaidAmountChange(totalAmount)}
                disabled={disabled}
              >
                Full
              </Button>
              {editMode && paidAmount > 0 && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handlePaidAmountChange(0)}
                  disabled={disabled}
                >
                  Clear
                </Button>
              )}
            </div>
          </Form.Group>
        )}

        {/* Credit Terms Section */}
        {(showCreditOptions ||
          effectivePaymentMethod === "credit" ||
          effectivePaymentMethod === "partial" ||
          paymentData.remainingAmount > 0) && (
          <Card className="border border-warning bg-warning bg-opacity-10 mb-3">
            <Card.Header className="bg-warning bg-opacity-25 py-2">
              <h6 className="mb-0 text-warning-emphasis">
                <FontAwesomeIcon icon={faClock} className="me-2" />
                Credit Terms
              </h6>
            </Card.Header>
            <Card.Body className="py-2">
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="text-muted fw-bold">
                      <FontAwesomeIcon icon={faClock} className="me-2" />
                      Credit Days
                    </Form.Label>
                    <Form.Select
                      value={creditDays}
                      onChange={(e) => handleCreditDaysChange(e.target.value)}
                      disabled={disabled}
                    >
                      <option value="0">Immediate</option>
                      <option value="7">7 Days</option>
                      <option value="15">15 Days</option>
                      <option value="30">30 Days</option>
                      <option value="45">45 Days</option>
                      <option value="60">60 Days</option>
                      <option value="90">90 Days</option>
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Payment terms for remaining amount
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="text-muted fw-bold">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                      Due Date
                    </Form.Label>
                    <Form.Control
                      type="date"
                      value={dueDate || calculatedDueDate}
                      onChange={(e) =>
                        onDueDateChange && onDueDateChange(e.target.value)
                      }
                      min={new Date().toISOString().split("T")[0]}
                      disabled={disabled}
                    />
                    <div className="mt-1">{getDueDateStatus()}</div>
                  </Form.Group>
                </Col>
              </Row>

              {paymentData.remainingAmount > 0 && (
                <Alert variant="info" className="mt-3 mb-0">
                  <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                  <strong>Credit Summary:</strong>
                  <br />• Remaining Amount:{" "}
                  <strong>
                    ₹
                    {paymentData.remainingAmount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </strong>
                  <br />• Credit Period: <strong>{creditDays} days</strong>
                  <br />• Due Date:{" "}
                  <strong>
                    {dueDate || calculatedDueDate
                      ? new Date(
                          dueDate || calculatedDueDate
                        ).toLocaleDateString("en-IN")
                      : "Not set"}
                  </strong>
                </Alert>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Payment Method Summary */}
        {selectedPayment && (
          <div className="mb-3">
            <Badge bg={selectedPayment.color} className="p-2 w-100 text-center">
              <FontAwesomeIcon icon={selectedPayment.icon} className="me-2" />
              {selectedPayment.label}
              {selectedBankAccountId && effectivePaymentMethod === "bank" && (
                <span className="ms-2">
                  (
                  {getBankAccountById(selectedBankAccountId)?.accountName ||
                    "Selected Account"}
                  )
                </span>
              )}
              {paymentData.isPartiallyPaid &&
                ` (₹${paymentData.paidAmount.toLocaleString("en-IN")} paid)`}
            </Badge>
          </div>
        )}

        {/* Validation Warnings */}
        {paymentData.isOverpaid && (
          <Alert variant="warning" className="mb-3">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            <strong>Warning:</strong> Paid amount exceeds total amount by ₹
            {(paymentData.paidAmount - paymentData.totalAmount).toLocaleString(
              "en-IN",
              {minimumFractionDigits: 2}
            )}
          </Alert>
        )}

        {effectivePaymentMethod === "bank" && !selectedBankAccountId && (
          <Alert variant="danger" className="mb-3">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            <strong>Required:</strong> Please select a bank account for bank
            transfer payment.
          </Alert>
        )}

        {/* Payment Notes */}
        <Form.Group>
          <Form.Label className="text-muted fw-bold">
            Payment Notes (Optional)
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Add payment notes, reference numbers, or special instructions..."
            className="notes-textarea"
            disabled={disabled}
          />
          <Form.Text className="text-muted">
            Add reference numbers, cheque details, or special payment
            instructions
          </Form.Text>
        </Form.Group>
      </Card.Body>

      <style>{`
        .payment-option:checked + label {
          background-color: var(--bs-primary-bg-subtle);
          border-color: var(--bs-primary);
        }

        .notes-textarea:focus {
          border-color: #28a745;
          box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);
        }

        .bg-warning.bg-opacity-10 {
          background-color: rgba(255, 193, 7, 0.1) !important;
        }

        .bg-warning.bg-opacity-25 {
          background-color: rgba(255, 193, 7, 0.25) !important;
        }

        .border-2 {
          border-width: 2px !important;
        }
      `}</style>
    </Card>
  );
}

export default PaymentSection;
