import React, {useState, useEffect} from "react";
import {
  Modal,
  Button,
  Form,
  Row,
  Col,
  Alert,
  InputGroup,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faMoneyBillWave,
  faArrowUp,
  faArrowDown,
  faExchangeAlt,
  faBalanceScale,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";

function TransactionModal({
  show,
  onHide,
  account,
  formData,
  onInputChange,
  onSaveTransaction,
}) {
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // ✅ Transaction type configurations
  const transactionTypeConfig = {
    deposit: {
      label: "Deposit Money",
      icon: faArrowUp,
      color: "success",
      description: "Add money to the account",
      amountLabel: "Deposit Amount",
      placeholder: "Enter amount to deposit",
    },
    withdraw: {
      label: "Withdraw Money",
      icon: faArrowDown,
      color: "danger",
      description: "Remove money from the account",
      amountLabel: "Withdrawal Amount",
      placeholder: "Enter amount to withdraw",
    },
    "transfer-bank-to-cash": {
      label: "Bank to Cash Transfer",
      icon: faExchangeAlt,
      color: "primary",
      description: "Transfer money from bank account to cash",
      amountLabel: "Transfer Amount",
      placeholder: "Enter amount to transfer",
    },
    "transfer-cash-to-bank": {
      label: "Cash to Bank Transfer",
      icon: faExchangeAlt,
      color: "info",
      description: "Transfer money from cash to bank account",
      amountLabel: "Transfer Amount",
      placeholder: "Enter amount to transfer",
    },
    "transfer-bank-to-bank": {
      label: "Bank to Bank Transfer",
      icon: faExchangeAlt,
      color: "warning",
      description: "Transfer money between bank accounts",
      amountLabel: "Transfer Amount",
      placeholder: "Enter amount to transfer",
    },
    "adjust-balance": {
      label: "Adjust Balance",
      icon: faBalanceScale,
      color: "secondary",
      description: "Correct account balance",
      amountLabel: "Adjustment Amount",
      placeholder: "Enter adjustment amount (+ or -)",
    },
  };

  // ✅ Get current transaction config
  const currentConfig =
    transactionTypeConfig[formData?.transactionType] ||
    transactionTypeConfig["deposit"];

  // ✅ Reset validation errors when modal shows/hides
  useEffect(() => {
    if (show) {
      setValidationErrors({});
    }
  }, [show]);

  // ✅ Validate form before submission
  const validateForm = () => {
    const errors = {};

    // Amount validation
    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      errors.amount = "Please enter a valid amount greater than 0";
    }

    // Description validation for adjustments
    if (
      formData.transactionType === "adjust-balance" &&
      !formData.description?.trim()
    ) {
      errors.description = "Please provide a reason for balance adjustment";
    }

    // Transfer validation
    if (
      formData.transactionType?.includes("transfer") &&
      formData.transactionType !== "adjust-balance"
    ) {
      if (!formData.description?.trim()) {
        errors.description = "Please provide a description for the transfer";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ✅ Enhanced form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const success = await onSaveTransaction(e);
      if (success !== false) {
        // Only close if save was successful
        onHide();
      }
    } catch (error) {
      console.error("❌ Transaction submission error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Enhanced input change handler with validation
  const handleInputChange = (e) => {
    const {name, value} = e.target;

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }

    // Call parent handler
    onInputChange(e);
  };

  if (!account) return null;

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton className="bg-light">
        <Modal.Title className="d-flex align-items-center">
          <FontAwesomeIcon
            icon={currentConfig.icon}
            className={`text-${currentConfig.color} me-2`}
          />
          {currentConfig.label}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-4">
          {/* ✅ Account Info Card */}
          <div className="bg-light rounded-3 p-3 mb-4">
            <Row className="align-items-center">
              <Col>
                <div className="fw-bold text-dark">{account.accountName}</div>
                <small className="text-muted">
                  {account.accountNumber && (
                    <span className="me-3">A/C: {account.accountNumber}</span>
                  )}
                  {account.bankName && <span>{account.bankName}</span>}
                </small>
              </Col>
              <Col xs="auto">
                <div className="text-end">
                  <div
                    className={`h6 mb-0 ${
                      account.currentBalance < 0
                        ? "text-danger"
                        : "text-success"
                    }`}
                  >
                    ₹{account.currentBalance?.toLocaleString("en-IN") || "0"}
                  </div>
                  <small className="text-muted">Current Balance</small>
                </div>
              </Col>
            </Row>
          </div>

          {/* ✅ Transaction Description */}
          <Alert
            variant={currentConfig.color}
            className="d-flex align-items-center"
          >
            <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
            {currentConfig.description}
          </Alert>

          {/* ✅ Form Fields */}
          <Row className="g-3">
            {/* Transaction Type (Read-only display) */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">
                  Transaction Type
                </Form.Label>
                <Form.Control
                  value={currentConfig.label}
                  readOnly
                  className="bg-light"
                />
              </Form.Group>
            </Col>

            {/* Amount */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">
                  {currentConfig.amountLabel}{" "}
                  <span className="text-danger">*</span>
                </Form.Label>
                <InputGroup>
                  <InputGroup.Text>₹</InputGroup.Text>
                  <Form.Control
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder={currentConfig.placeholder}
                    isInvalid={!!validationErrors.amount}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.amount}
                  </Form.Control.Feedback>
                </InputGroup>
              </Form.Group>
            </Col>

            {/* Description */}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="fw-semibold">
                  Description
                  {(formData.transactionType === "adjust-balance" ||
                    formData.transactionType?.includes("transfer")) && (
                    <span className="text-danger"> *</span>
                  )}
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter transaction description or reason"
                  isInvalid={!!validationErrors.description}
                  required={
                    formData.transactionType === "adjust-balance" ||
                    formData.transactionType?.includes("transfer")
                  }
                />
                <Form.Control.Feedback type="invalid">
                  {validationErrors.description}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Reference */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">
                  Reference Number
                </Form.Label>
                <Form.Control
                  name="reference"
                  value={formData.reference}
                  onChange={handleInputChange}
                  placeholder="Check number, transaction ID, etc."
                />
                <Form.Text className="text-muted">
                  Optional: Check number, UPI ref, etc.
                </Form.Text>
              </Form.Group>
            </Col>

            {/* Transaction Date */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">
                  Transaction Date <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  name="transactionDate"
                  type="date"
                  value={formData.transactionDate}
                  onChange={handleInputChange}
                  max={new Date().toISOString().split("T")[0]}
                  required
                />
              </Form.Group>
            </Col>

            {/* Payment Method */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">Payment Method</Form.Label>
                <Form.Select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleInputChange}
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI</option>
                  <option value="neft">NEFT</option>
                  <option value="rtgs">RTGS</option>
                  <option value="imps">IMPS</option>
                  <option value="card">Card Payment</option>
                  <option value="other">Other</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Category */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">Category</Form.Label>
                <Form.Select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  <option value="">Select Category</option>
                  <option value="business">Business</option>
                  <option value="personal">Personal</option>
                  <option value="investment">Investment</option>
                  <option value="loan">Loan</option>
                  <option value="salary">Salary</option>
                  <option value="expense">Expense</option>
                  <option value="tax">Tax</option>
                  <option value="transfer">Transfer</option>
                  <option value="adjustment">Adjustment</option>
                  <option value="other">Other</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {/* ✅ Balance Impact Preview */}
          {formData.amount && parseFloat(formData.amount) > 0 && (
            <div className="mt-4 p-3 bg-light rounded-3">
              <h6 className="mb-2">Balance Impact Preview</h6>
              <Row>
                <Col>
                  <small className="text-muted d-block">Current Balance</small>
                  <span
                    className={`fw-bold ${
                      account.currentBalance < 0
                        ? "text-danger"
                        : "text-success"
                    }`}
                  >
                    ₹{account.currentBalance?.toLocaleString("en-IN") || "0"}
                  </span>
                </Col>
                <Col xs="auto" className="d-flex align-items-center">
                  <FontAwesomeIcon
                    icon={
                      formData.transactionType === "deposit"
                        ? faArrowUp
                        : formData.transactionType === "withdraw"
                        ? faArrowDown
                        : faExchangeAlt
                    }
                    className={`text-${currentConfig.color}`}
                  />
                </Col>
                <Col>
                  <small className="text-muted d-block">New Balance</small>
                  {(() => {
                    const amount = parseFloat(formData.amount) || 0;
                    const currentBalance = account.currentBalance || 0;
                    let newBalance = currentBalance;

                    if (formData.transactionType === "deposit") {
                      newBalance = currentBalance + amount;
                    } else if (
                      formData.transactionType === "withdraw" ||
                      formData.transactionType?.includes("transfer")
                    ) {
                      newBalance = currentBalance - amount;
                    } else if (formData.transactionType === "adjust-balance") {
                      newBalance = currentBalance + amount; // Can be + or -
                    }

                    return (
                      <span
                        className={`fw-bold ${
                          newBalance < 0 ? "text-danger" : "text-success"
                        }`}
                      >
                        ₹{newBalance.toLocaleString("en-IN")}
                      </span>
                    );
                  })()}
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>

        <Modal.Footer className="bg-light">
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={currentConfig.color}
            type="submit"
            disabled={loading}
            className="px-4"
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Processing...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={currentConfig.icon} className="me-2" />
                {formData.transactionType === "adjust-balance"
                  ? "Adjust Balance"
                  : formData.transactionType?.includes("transfer")
                  ? "Process Transfer"
                  : `${currentConfig.label}`}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>

      {/* ✅ Enhanced Styles */}
      <style>{`
                .modal-header {
                    border-bottom: 1px solid #dee2e6;
                }
                
                .modal-footer {
                    border-top: 1px solid #dee2e6;
                }
                
                .form-label {
                    font-size: 0.9rem;
                    margin-bottom: 0.5rem;
                }
                
                .form-control:focus,
                .form-select:focus {
                    border-color: #0d6efd;
                    box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
                }
                
                .input-group-text {
                    background-color: #f8f9fa;
                    border-color: #ced4da;
                    color: #6c757d;
                    font-weight: 600;
                }
                
                .bg-light {
                    background-color: #f8f9fa !important;
                }
                
                .alert {
                    border: none;
                    font-size: 0.9rem;
                }
                
                .modal-title {
                    font-size: 1.1rem;
                    font-weight: 600;
                }
                
                .btn {
                    font-weight: 500;
                }
                
                .spinner-border-sm {
                    width: 1rem;
                    height: 1rem;
                }
            `}</style>
    </Modal>
  );
}

export default TransactionModal;
