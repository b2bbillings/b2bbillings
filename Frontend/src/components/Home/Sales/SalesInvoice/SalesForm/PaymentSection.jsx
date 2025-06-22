import React, { useState, useEffect } from 'react';
import { Card, Form, Badge, Row, Col, Button, Alert, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
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
    faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

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
    paymentStatus = 'pending'
}) {
    const [showCreditOptions, setShowCreditOptions] = useState(false);
    const [isPartialPayment, setIsPartialPayment] = useState(false);
    const [calculatedDueDate, setCalculatedDueDate] = useState('');

    const paymentOptions = [
        { value: 'cash', label: 'Cash Payment', icon: faCoins, color: 'success', description: 'Immediate cash payment' },
        { value: 'card', label: 'Card Payment', icon: faCreditCard, color: 'primary', description: 'Credit/Debit card payment' },
        { value: 'upi', label: 'UPI Payment', icon: faMobile, color: 'warning', description: 'Digital UPI payment' },
        { value: 'bank', label: 'Bank Transfer', icon: faUniversity, color: 'info', description: 'Direct bank transfer' },
        { value: 'credit', label: 'Credit Sale', icon: faMoneyBillWave, color: 'secondary', description: 'Pay later with credit terms' },
        { value: 'partial', label: 'Partial Payment', icon: faCalculator, color: 'dark', description: 'Partial payment with remaining credit' }
    ];

    const selectedPayment = paymentOptions.find(option => option.value === paymentMethod);
    const remainingAmount = totalAmount - paidAmount;
    const isFullyPaid = paidAmount >= totalAmount;
    const isOverpaid = paidAmount > totalAmount;

    // Calculate due date based on payment date and credit days
    useEffect(() => {
        if (paymentDate && creditDays > 0) {
            const paymentDateObj = new Date(paymentDate);
            const calculatedDate = new Date(paymentDateObj);
            calculatedDate.setDate(calculatedDate.getDate() + parseInt(creditDays));

            const formattedDate = calculatedDate.toISOString().split('T')[0];
            setCalculatedDueDate(formattedDate);

            if (onDueDateChange) {
                onDueDateChange(formattedDate);
            }
        }
    }, [paymentDate, creditDays, onDueDateChange]);

    // Handle payment method change
    const handlePaymentMethodChange = (method) => {
        onPaymentMethodChange(method);

        if (method === 'credit') {
            setShowCreditOptions(true);
            setIsPartialPayment(false);
            if (onPaidAmountChange) {
                onPaidAmountChange(0); // No immediate payment for credit
            }
        } else if (method === 'partial') {
            setShowCreditOptions(true);
            setIsPartialPayment(true);
            if (onPaidAmountChange) {
                onPaidAmountChange(totalAmount * 0.5); // Default 50% payment
            }
        } else {
            setShowCreditOptions(false);
            setIsPartialPayment(false);
            if (onPaidAmountChange) {
                onPaidAmountChange(totalAmount); // Full payment for immediate methods
            }
        }
    };

    // Handle paid amount change
    const handlePaidAmountChange = (amount) => {
        const numericAmount = parseFloat(amount) || 0;
        if (onPaidAmountChange) {
            onPaidAmountChange(numericAmount);
        }
    };

    // Handle credit days change
    const handleCreditDaysChange = (days) => {
        const numericDays = parseInt(days) || 0;
        if (onCreditDaysChange) {
            onCreditDaysChange(numericDays);
        }
    };

    // Get payment status badge
    const getPaymentStatusBadge = () => {
        if (isOverpaid) {
            return <Badge bg="warning" className="ms-2">Overpaid</Badge>;
        } else if (isFullyPaid) {
            return <Badge bg="success" className="ms-2">Fully Paid</Badge>;
        } else if (paidAmount > 0) {
            return <Badge bg="info" className="ms-2">Partially Paid</Badge>;
        } else {
            return <Badge bg="secondary" className="ms-2">Unpaid</Badge>;
        }
    };

    // Get due date status
    const getDueDateStatus = () => {
        if (!calculatedDueDate) return null;

        const today = new Date();
        const due = new Date(calculatedDueDate);
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

    return (
        <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-success text-white">
                <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">
                        <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                        Payment Details
                    </h6>
                    {getPaymentStatusBadge()}
                </div>
            </Card.Header>
            <Card.Body>
                {/* Payment Amount Summary */}
                <div className="mb-3 p-3 bg-light rounded">
                    <Row className="g-2">
                        <Col xs={6}>
                            <small className="text-muted d-block">Total Amount</small>
                            <strong className="text-primary">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                        </Col>
                        <Col xs={6}>
                            <small className="text-muted d-block">Paid Amount</small>
                            <strong className={`${isOverpaid ? 'text-warning' : isFullyPaid ? 'text-success' : 'text-info'}`}>
                                ₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </strong>
                        </Col>
                        <Col xs={12}>
                            <small className="text-muted d-block">Remaining Amount</small>
                            <strong className={`${remainingAmount > 0 ? 'text-danger' : remainingAmount === 0 ? 'text-success' : 'text-warning'}`}>
                                ₹{remainingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </strong>
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
                                    checked={paymentMethod === option.value}
                                    onChange={(e) => handlePaymentMethodChange(e.target.value)}
                                    label={
                                        <div className="d-flex align-items-center justify-content-between w-100">
                                            <div className="d-flex align-items-center">
                                                <FontAwesomeIcon
                                                    icon={option.icon}
                                                    className={`text-${option.color} me-2`}
                                                />
                                                <div>
                                                    <div className="fw-medium">{option.label}</div>
                                                    <small className="text-muted">{option.description}</small>
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

                {/* Payment Date */}
                <Form.Group className="mb-3">
                    <Form.Label className="text-muted fw-bold">
                        <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                        Payment Date
                    </Form.Label>
                    <Form.Control
                        type="date"
                        value={paymentDate}
                        onChange={(e) => onPaymentDateChange && onPaymentDateChange(e.target.value)}
                        max={new Date().toISOString().split('T')[0]} // Cannot be future date for completed payments
                    />
                </Form.Group>

                {/* Paid Amount Input for Partial Payment */}
                {(paymentMethod === 'partial' || isPartialPayment) && (
                    <Form.Group className="mb-3">
                        <Form.Label className="text-muted fw-bold">
                            <FontAwesomeIcon icon={faCalculator} className="me-2" />
                            Paid Amount
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
                            />
                        </InputGroup>
                        <div className="mt-2 d-flex gap-2 flex-wrap">
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => handlePaidAmountChange(totalAmount * 0.25)}
                            >
                                25%
                            </Button>
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => handlePaidAmountChange(totalAmount * 0.5)}
                            >
                                50%
                            </Button>
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => handlePaidAmountChange(totalAmount * 0.75)}
                            >
                                75%
                            </Button>
                            <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => handlePaidAmountChange(totalAmount)}
                            >
                                Full
                            </Button>
                        </div>
                    </Form.Group>
                )}

                {/* Credit Terms Section */}
                {(showCreditOptions || paymentMethod === 'credit' || paymentMethod === 'partial') && (
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
                                            onChange={(e) => onDueDateChange && onDueDateChange(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                        <div className="mt-1">
                                            {getDueDateStatus()}
                                        </div>
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* Credit Summary */}
                            {remainingAmount > 0 && (
                                <Alert variant="info" className="mt-3 mb-0">
                                    <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                                    <strong>Credit Summary:</strong>
                                    <br />
                                    • Remaining Amount: ₹{remainingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    <br />
                                    • Credit Period: {creditDays} days
                                    <br />
                                    • Due Date: {calculatedDueDate ? new Date(calculatedDueDate).toLocaleDateString('en-IN') : 'Not set'}
                                </Alert>
                            )}
                        </Card.Body>
                    </Card>
                )}

                {/* Payment Method Summary */}
                {selectedPayment && (
                    <div className="mb-3">
                        <Badge
                            bg={selectedPayment.color}
                            className="p-2 w-100 text-center"
                        >
                            <FontAwesomeIcon icon={selectedPayment.icon} className="me-2" />
                            {selectedPayment.label}
                            {isPartialPayment && ` (₹${paidAmount.toLocaleString('en-IN')} paid)`}
                        </Badge>
                    </div>
                )}

                {/* Validation Warnings */}
                {isOverpaid && (
                    <Alert variant="warning" className="mb-3">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                        <strong>Warning:</strong> Paid amount exceeds total amount by ₹{(paidAmount - totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                    />
                    <Form.Text className="text-muted">
                        Add reference numbers, cheque details, or special payment instructions
                    </Form.Text>
                </Form.Group>
            </Card.Body>
        </Card>
    );
}

export default PaymentSection;