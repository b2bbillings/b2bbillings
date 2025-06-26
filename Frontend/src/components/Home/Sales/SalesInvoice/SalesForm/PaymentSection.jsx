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

// ✅ ADD: Import the bank accounts hook
import {useBankAccounts} from "./itemsTableWithTotals/itemsTableHooks";

// ✅ UPDATE: Add companyId prop to function signature
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
  companyId, // ✅ ADD: Company ID prop
}) {
  const [showCreditOptions, setShowCreditOptions] = useState(false);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [calculatedDueDate, setCalculatedDueDate] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [internalPaymentMethod, setInternalPaymentMethod] = useState("");

  // ✅ ADD: Bank accounts integration
  const {
    bankAccounts,
    loadingBankAccounts,
    retryLoadBankAccounts,
    getBankAccountById,
    validateBankAccountSelection,
  } = useBankAccounts(companyId);

  // ✅ ADD: Bank account selection state
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("");

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

  // ✅ Enhanced payment method normalization function
  const normalizePaymentMethod = (method) => {
    if (!method) return "cash";

    const methodStr = method.toString().toLowerCase();

    // ✅ Handle various payment method formats - CONSISTENT WITH BACKEND
    const methodMappings = {
      // Bank transfer variations - ✅ All map to "bank" for frontend consistency
      bank_transfer: "bank",
      banktransfer: "bank",
      "bank transfer": "bank",
      bank: "bank",
      neft: "bank",
      rtgs: "bank",
      imps: "bank",

      // Card variations
      card: "card",
      credit_card: "card",
      debit_card: "card",
      creditcard: "card",
      debitcard: "card",

      // UPI variations
      upi: "upi",
      upi_payment: "upi",
      upipayment: "upi",
      paytm: "upi",
      gpay: "upi",
      phonepe: "upi",

      // Cash variations
      cash: "cash",
      cash_payment: "cash",
      cashpayment: "cash",

      // Credit variations
      credit: "credit",
      credit_sale: "credit",
      creditsale: "credit",

      // Partial variations
      partial: "partial",
      partial_payment: "partial",
      partialpayment: "partial",
    };

    const normalizedMethod = methodMappings[methodStr] || methodStr;

    console.log(
      `💳 PaymentSection normalization: "${method}" -> "${normalizedMethod}"`
    );

    // Validate against available options
    const validMethod = paymentOptions.find(
      (option) => option.value === normalizedMethod
    );
    return validMethod ? normalizedMethod : "cash";
  };

  // ✅ ADD: Bank account change handler
  const handleBankAccountChange = (accountId) => {
    setSelectedBankAccountId(accountId);

    if (accountId) {
      const account = getBankAccountById(accountId);
      if (account) {
        console.log("🏦 Bank account selected:", account.displayName);

        // Notify parent component about bank account selection
        if (onNotesChange) {
          const bankNote = `Bank: ${account.bankName} | Account: ${account.accountName} | A/C No: ${account.accountNumber}`;
          const existingNotes = notes || "";

          // Only add bank info if not already present
          if (!existingNotes.includes(account.bankName)) {
            const updatedNotes = existingNotes
              ? `${existingNotes} | ${bankNote}`
              : bankNote;
            onNotesChange(updatedNotes);
          }
        }
      }
    }
  };

  // ✅ Enhanced payment data calculation
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

  // ✅ Initialize internal payment method from props
  useEffect(() => {
    const normalized = normalizePaymentMethod(paymentMethod);
    if (normalized !== internalPaymentMethod) {
      console.log("🔄 Setting internal payment method:", {
        original: paymentMethod,
        normalized,
        current: internalPaymentMethod,
      });
      setInternalPaymentMethod(normalized);
    }
  }, [paymentMethod, internalPaymentMethod]);

  // ✅ Use internal payment method for selection
  const effectivePaymentMethod =
    internalPaymentMethod || normalizePaymentMethod(paymentMethod);

  const selectedPayment = paymentOptions.find(
    (option) => option.value === effectivePaymentMethod
  );

  console.log("🔍 PaymentSection method matching:", {
    originalMethod: paymentMethod,
    normalizedMethod: effectivePaymentMethod,
    internalMethod: internalPaymentMethod,
    selectedPayment: selectedPayment?.label,
    availableOptions: paymentOptions.map((o) => o.value),
    bankAccountSelected: selectedBankAccountId,
    bankAccountsLoaded: bankAccounts.length,
  });

  // ✅ Enhanced initialization for edit mode with better data detection
  useEffect(() => {
    if (
      editMode &&
      !initialized &&
      (existingPaymentData || formData || totalAmount > 0)
    ) {
      console.log("🔄 PaymentSection initializing for edit mode:", {
        existingPaymentData,
        formData,
        totalAmount,
        paidAmount,
        paymentMethod,
        effectivePaymentMethod,
      });

      // Get payment data from multiple sources with priority
      const paymentInfo =
        existingPaymentData || formData.paymentData || formData.payment || {};

      // ✅ Enhanced payment method detection with normalization
      const rawPaymentMethod =
        paymentMethod ||
        paymentInfo.method ||
        paymentInfo.paymentType ||
        formData.paymentMethod ||
        formData.paymentType ||
        "cash";

      const initialPaymentMethod = normalizePaymentMethod(rawPaymentMethod);

      // ✅ Enhanced paid amount calculation with multiple fallbacks
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

      // ✅ Enhanced date initialization
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

      // ✅ Initialize bank account selection for bank transfers
      const initialBankAccountId =
        paymentInfo.bankAccountId ||
        formData.bankAccountId ||
        formData.paymentData?.bankAccountId ||
        "";

      console.log("💰 Payment initialization values:", {
        rawMethod: rawPaymentMethod,
        normalizedMethod: initialPaymentMethod,
        paidAmount: initialPaidAmount,
        totalAmount: totalAmount,
        calculatedPaidAmount,
        paymentDate: initialPaymentDate,
        dueDate: initialDueDate,
        creditDays: initialCreditDays,
        notes: initialNotes,
        bankAccountId: initialBankAccountId,
      });

      // ✅ Set internal payment method first
      setInternalPaymentMethod(initialPaymentMethod);

      // ✅ Set bank account if it's a bank transfer
      if (initialBankAccountId && initialPaymentMethod === "bank") {
        setSelectedBankAccountId(initialBankAccountId);
      }

      // ✅ Set initial states based on payment method and amounts
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

      // ✅ Update parent components with initialized values - use normalized method
      if (
        onPaymentMethodChange &&
        initialPaymentMethod !== effectivePaymentMethod
      ) {
        console.log("🔄 Updating payment method:", initialPaymentMethod);
        onPaymentMethodChange(initialPaymentMethod);
      }

      if (onPaidAmountChange && initialPaidAmount !== paidAmount) {
        console.log("🔄 Updating paid amount:", initialPaidAmount);
        onPaidAmountChange(initialPaidAmount);
      }

      if (onPaymentDateChange && initialPaymentDate !== paymentDate) {
        console.log("🔄 Updating payment date:", initialPaymentDate);
        onPaymentDateChange(initialPaymentDate);
      }

      if (onDueDateChange && initialDueDate && initialDueDate !== dueDate) {
        console.log("🔄 Updating due date:", initialDueDate);
        onDueDateChange(initialDueDate);
      }

      if (onCreditDaysChange && initialCreditDays !== creditDays) {
        console.log("🔄 Updating credit days:", initialCreditDays);
        onCreditDaysChange(initialCreditDays);
      }

      if (onNotesChange && initialNotes !== notes) {
        console.log("🔄 Updating payment notes:", initialNotes);
        onNotesChange(initialNotes);
      }

      console.log("✅ PaymentSection initialized successfully with:", {
        method: initialPaymentMethod,
        paidAmount: initialPaidAmount,
        paymentDate: initialPaymentDate,
        dueDate: initialDueDate,
        creditDays: initialCreditDays,
        notes: initialNotes,
        bankAccountId: initialBankAccountId,
      });

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

      // Only update if no manual due date is set
      if (onDueDateChange && !dueDate) {
        onDueDateChange(formattedDate);
      }
    }
  }, [paymentDate, creditDays, onDueDateChange, dueDate]);

  // ✅ UPDATED: Enhanced payment method change handler with bank account logic
  const handlePaymentMethodChange = (method) => {
    const normalizedMethod = normalizePaymentMethod(method);
    console.log("💳 Payment method changed:", method, "->", normalizedMethod);

    // ✅ Update internal state first
    setInternalPaymentMethod(normalizedMethod);

    // ✅ Clear bank account selection for non-bank methods
    if (!["bank", "bank_transfer"].includes(normalizedMethod)) {
      setSelectedBankAccountId("");
    }

    // ✅ Then notify parent
    onPaymentMethodChange(normalizedMethod);

    if (normalizedMethod === "credit") {
      setShowCreditOptions(true);
      setIsPartialPayment(false);
      if (onPaidAmountChange && !editMode) {
        onPaidAmountChange(0); // No immediate payment for credit (only for new)
      }
    } else if (normalizedMethod === "partial") {
      setShowCreditOptions(true);
      setIsPartialPayment(true);
      // Keep existing paid amount or set to 50% if none
      if (onPaidAmountChange && (!paidAmount || paidAmount === 0)) {
        onPaidAmountChange(totalAmount * 0.5);
      }
    } else {
      setShowCreditOptions(false);
      setIsPartialPayment(false);
      if (onPaidAmountChange && !editMode) {
        onPaidAmountChange(totalAmount); // Full payment for immediate methods (only for new invoices)
      }
    }
  };

  // Handle paid amount change
  const handlePaidAmountChange = (amount) => {
    const numericAmount = parseFloat(amount) || 0;
    console.log("💰 Paid amount changed to:", numericAmount);

    if (onPaidAmountChange) {
      onPaidAmountChange(numericAmount);
    }

    // Auto-detect partial payment
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
        // Switch to appropriate payment method for full payment
        handlePaymentMethodChange("cash");
      }
    }
  };

  // Handle credit days change
  const handleCreditDaysChange = (days) => {
    const numericDays = parseInt(days) || 0;
    console.log("📅 Credit days changed to:", numericDays);

    if (onCreditDaysChange) {
      onCreditDaysChange(numericDays);
    }
  };

  // ✅ Enhanced payment status badge
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

  // Get due date status
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

  // ✅ Enhanced payment summary for edit mode
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

  // ✅ Enhanced edit mode indicator
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
        {/* ✅ Payment Summary for Edit Mode */}
        {getPaymentSummary()}

        {/* ✅ Edit Mode Warning */}
        {getEditModeIndicator()}

        {/* Payment Amount Summary */}
        <div className="mb-3 p-3 bg-light rounded">
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
              <div key={option.value} className="border rounded p-2">
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

        {/* ✅ ADD: Bank Account Selection for Bank Transfer */}
        {effectivePaymentMethod === "bank" && (
          <Form.Group className="mb-3">
            <Form.Label className="text-muted fw-bold">
              <FontAwesomeIcon icon={faUniversity} className="me-2" />
              Select Bank Account *
            </Form.Label>

            {loadingBankAccounts ? (
              <div className="text-center py-3 bg-light rounded border">
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

        {/* ✅ Enhanced Paid Amount Input - Always show in edit mode or for partial payments */}
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
                max={totalAmount * 1.1} // Allow 10% overpayment
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

              {/* Credit Summary */}
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

        {/* ✅ Bank Account Validation Warning */}
        {effectivePaymentMethod === "bank" && !selectedBankAccountId && (
          <Alert variant="danger" className="mb-3">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            <strong>Required:</strong> Please select a bank account for bank
            transfer payment.
          </Alert>
        )}

        {/* Notes Section */}
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

      {/* Custom Styles */}
      <style jsx>{`
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
