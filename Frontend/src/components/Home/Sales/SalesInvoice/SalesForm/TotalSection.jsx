import React, { useState } from 'react';
import { Button, Form, InputGroup, Card, Modal, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faShare,
    faSave,
    faTimes,
    faDownload,
    faMoneyBillWave,
    faUser,
    faCreditCard,
    faArrowUp,
    faArrowDown,
    faCalculator,
    faPercent
} from '@fortawesome/free-solid-svg-icons';

function TotalSection({
    totals,
    roundOff,
    roundOffEnabled,
    onRoundOffChange,
    onRoundOffToggle,
    onSave,
    onShare,
    onCancel,
    formType = 'sales' // 'sales' or 'purchase'
}) {
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentData, setPaymentData] = useState({
        partyName: '',
        paymentType: 'Cash',
        isAdvance: false,
        selectedInvoice: '',
        paymentAmount: 0
    });

    // Safe totals handling with fallback values
    const safeTotals = {
        subtotal: parseFloat(totals?.subtotal) || 0,
        totalCGST: parseFloat(totals?.totalCGST) || 0,
        totalSGST: parseFloat(totals?.totalSGST) || 0,
        totalTax: parseFloat(totals?.totalTax) || 0,
        finalTotal: parseFloat(totals?.finalTotal) || 0
    };

    // Format currency safely
    const formatCurrency = (amount) => {
        const value = Number(amount) || 0;
        return value.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    // Dynamic configuration based on form type
    const config = {
        sales: {
            paymentAction: 'Payment In',
            paymentIcon: faArrowDown,
            modalTitle: 'Payment In',
            modalHeader: 'bg-success',
            buttonVariant: 'success',
            actionText: 'Receive Payment',
            partyLabel: 'Customer Name',
            invoicePrefix: 'INV-',
            actionButtonColor: 'outline-success',
            totalLabel: 'Total Amount',
            totalBorderColor: 'border-success',
            totalBgColor: 'bg-success',
            totalTextColor: 'text-success',
            saveButtonText: 'Save & Exit',
            saveButtonVariant: 'success',
            successMessage: (type, party) => `Payment received via ${type} from ${party}`
        },
        purchase: {
            paymentAction: 'Payment Out',
            paymentIcon: faArrowUp,
            modalTitle: 'Payment Out',
            modalHeader: 'bg-danger',
            buttonVariant: 'danger',
            actionText: 'Make Payment',
            partyLabel: 'Supplier Name',
            invoicePrefix: 'PUR-',
            actionButtonColor: 'outline-danger',
            totalLabel: 'Total Cost',
            totalBorderColor: 'border-danger',
            totalBgColor: 'bg-danger',
            totalTextColor: 'text-danger',
            saveButtonText: 'Save Purchase',
            saveButtonVariant: 'danger',
            successMessage: (type, party) => `Payment made via ${type} to ${party}`
        }
    };

    const currentConfig = config[formType];

    const handlePayment = () => {
        // Validate totals before opening modal
        if (safeTotals.finalTotal <= 0) {
            alert('Please add items to the invoice before processing payment.');
            return;
        }

        // Set default payment amount to final total
        setPaymentData(prev => ({
            ...prev,
            paymentAmount: safeTotals.finalTotal
        }));

        setShowPaymentModal(true);
    };

    const handlePaymentSubmit = () => {
        if (!paymentData.partyName) {
            alert('Please select a party name.');
            return;
        }

        if (paymentData.paymentAmount <= 0) {
            alert('Please enter a valid payment amount.');
            return;
        }

        if (paymentData.paymentAmount > safeTotals.finalTotal) {
            alert(`Payment amount cannot exceed ₹${formatCurrency(safeTotals.finalTotal)}`);
            return;
        }

        console.log(`${currentConfig.paymentAction} Data:`, {
            ...paymentData,
            totalAmount: safeTotals.finalTotal,
            remainingBalance: safeTotals.finalTotal - paymentData.paymentAmount
        });

        const successMsg = `${currentConfig.successMessage(paymentData.paymentType, paymentData.partyName)}\nAmount: ₹${formatCurrency(paymentData.paymentAmount)}`;
        alert(successMsg);

        setShowPaymentModal(false);

        // Reset form
        setPaymentData({
            partyName: '',
            paymentType: 'Cash',
            isAdvance: false,
            selectedInvoice: '',
            paymentAmount: 0
        });
    };

    const updatePaymentData = (field, value) => {
        setPaymentData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleFullAmountClick = () => {
        updatePaymentData('paymentAmount', safeTotals.finalTotal);
    };

    // Dynamic party options based on form type
    const getPartyOptions = () => {
        if (formType === 'sales') {
            return [
                { value: "customer1", label: "John Doe" },
                { value: "customer2", label: "ABC Company" },
                { value: "customer3", label: "XYZ Enterprises" },
                { value: "cash", label: "Cash Customer" }
            ];
        } else {
            return [
                { value: "supplier1", label: "ABC Suppliers" },
                { value: "supplier2", label: "XYZ Distributors" },
                { value: "supplier3", label: "Global Trading Co." },
                { value: "cash", label: "Cash Purchase" }
            ];
        }
    };

    return (
        <>
            <Card className="border-0 shadow-sm">
                <Card.Body className="p-4">
                    {/* Enhanced Layout with Better Spacing */}
                    <Row className="align-items-center g-4">
                        {/* Payment Button */}
                        <Col md={3}>
                            <div className="text-center">
                                <Button
                                    variant={currentConfig.actionButtonColor}
                                    size="lg"
                                    className="w-100 h-100 d-flex align-items-center justify-content-center flex-column border-2 border-dashed fw-semibold"
                                    style={{
                                        minHeight: '80px',
                                        borderRadius: '12px',
                                        fontSize: '13px'
                                    }}
                                    onClick={handlePayment}
                                    disabled={safeTotals.finalTotal <= 0}
                                >
                                    <FontAwesomeIcon icon={currentConfig.paymentIcon} className="mb-1" size="lg" />
                                    <span className="small">{currentConfig.paymentAction}</span>
                                </Button>
                            </div>
                        </Col>

                        {/* Tax Breakdown Section - Only show if tax exists */}
                        {safeTotals.totalTax > 0 && (
                            <Col md={3}>
                                <Card className="bg-light border-0 h-100">
                                    <Card.Body className="p-3">
                                        <div className="text-center mb-2">
                                            <FontAwesomeIcon icon={faPercent} className="me-2 text-info" />
                                            <span className="fw-bold text-secondary small">Tax Breakdown</span>
                                        </div>
                                        <div className="small">
                                            <div className="d-flex justify-content-between mb-1">
                                                <span className="text-muted">Subtotal:</span>
                                                <span className="fw-semibold">₹{formatCurrency(safeTotals.subtotal)}</span>
                                            </div>
                                            <div className="d-flex justify-content-between mb-1">
                                                <span className="text-muted">CGST:</span>
                                                <span className="fw-semibold text-info">₹{formatCurrency(safeTotals.totalCGST)}</span>
                                            </div>
                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="text-muted">SGST:</span>
                                                <span className="fw-semibold text-info">₹{formatCurrency(safeTotals.totalSGST)}</span>
                                            </div>
                                            <hr className="my-2" />
                                            <div className="d-flex justify-content-between">
                                                <span className="fw-bold text-dark">Total Tax:</span>
                                                <span className="fw-bold text-primary">₹{formatCurrency(safeTotals.totalTax)}</span>
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        )}

                        {/* Final Total Section with Integrated Round Off */}
                        <Col md={safeTotals.totalTax > 0 ? 3 : 3}>
                            <Card className={`${currentConfig.totalBorderColor} border-3 h-100`}>
                                <Card.Body className="p-3">
                                    <div className="text-center mb-3">
                                        <span className="fw-bold text-secondary small">{currentConfig.totalLabel}</span>
                                    </div>

                                    {/* Main Total Display */}
                                    <div className={`fw-bold ${currentConfig.totalTextColor} h4 mb-3 text-center`}>
                                        ₹{formatCurrency(safeTotals.finalTotal)}
                                    </div>

                                    {/* Round Off Controls */}
                                    <div className="border-top pt-3">
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <div className="d-flex align-items-center">
                                                <FontAwesomeIcon icon={faCalculator} className="me-2 text-warning" size="sm" />
                                                <span className="fw-semibold text-secondary small">Round Off</span>
                                            </div>
                                            <Form.Check
                                                type="switch"
                                                id="roundoff-switch"
                                                checked={roundOffEnabled}
                                                onChange={(e) => onRoundOffToggle(e.target.checked)}
                                                className="form-check-sm"
                                            />
                                        </div>

                                        {roundOffEnabled && (
                                            <InputGroup size="sm">
                                                <InputGroup.Text className="bg-light text-muted fw-bold">
                                                    ₹
                                                </InputGroup.Text>
                                                <Form.Control
                                                    type="number"
                                                    value={roundOff || ''}
                                                    onChange={(e) => onRoundOffChange(parseFloat(e.target.value) || 0)}
                                                    className="text-center fw-bold"
                                                    style={{ fontSize: '14px' }}
                                                    step="0.01"
                                                    min="-10"
                                                    max="10"
                                                    placeholder="0.00"
                                                />
                                            </InputGroup>
                                        )}
                                    </div>

                                    {/* Summary Details */}
                                    {safeTotals.finalTotal === 0 ? (
                                        <div className="text-center mt-2">
                                            <small className="text-muted">Add items to calculate</small>
                                        </div>
                                    ) : (
                                        <div className="small text-muted text-center mt-2">
                                            {safeTotals.totalTax > 0 ? (
                                                <>
                                                    <div>Base: ₹{formatCurrency(safeTotals.subtotal)}</div>
                                                    <div>Tax: ₹{formatCurrency(safeTotals.totalTax)}</div>
                                                </>
                                            ) : (
                                                <div>No Tax Applied</div>
                                            )}
                                            {roundOffEnabled && roundOff !== 0 && (
                                                <div className="text-warning fw-semibold">
                                                    Round: {roundOff > 0 ? '+' : ''}₹{formatCurrency(roundOff)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Action Buttons */}
                        <Col md={3}>
                            <div className="d-grid gap-2">
                                {/* Share Button */}
                                <Button
                                    variant="outline-info"
                                    size="lg"
                                    className="d-flex align-items-center justify-content-center gap-2 fw-semibold border-2"
                                    onClick={onShare}
                                    disabled={safeTotals.finalTotal <= 0}
                                    style={{
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <span>Share</span>
                                    <FontAwesomeIcon icon={faDownload} />
                                </Button>

                                {/* Save Button */}
                                <Button
                                    variant={currentConfig.saveButtonVariant}
                                    size="lg"
                                    className="d-flex align-items-center justify-content-center gap-2 fw-bold border-0 shadow"
                                    onClick={onSave}
                                    style={{
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <FontAwesomeIcon icon={faSave} />
                                    <span>{currentConfig.saveButtonText}</span>
                                </Button>

                                {/* Cancel Button */}
                                <Button
                                    variant="outline-secondary"
                                    size="lg"
                                    className="d-flex align-items-center justify-content-center gap-2 fw-semibold border-2"
                                    onClick={onCancel}
                                    style={{
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <FontAwesomeIcon icon={faTimes} />
                                    <span>Cancel</span>
                                </Button>
                            </div>
                        </Col>
                    </Row>

                    {/* Enhanced Debug Info */}
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-4 p-3 bg-warning bg-opacity-10 border border-warning rounded">
                            <h6 className="text-warning mb-2">
                                <FontAwesomeIcon icon={faCalculator} className="me-2" />
                                Debug Information
                            </h6>
                            <Row className="small text-muted">
                                <Col md={3}>
                                    <strong>Subtotal:</strong> ₹{safeTotals.subtotal}
                                </Col>
                                <Col md={3}>
                                    <strong>CGST:</strong> ₹{safeTotals.totalCGST}
                                </Col>
                                <Col md={3}>
                                    <strong>SGST:</strong> ₹{safeTotals.totalSGST}
                                </Col>
                                <Col md={3}>
                                    <strong>Final:</strong> ₹{safeTotals.finalTotal}
                                </Col>
                            </Row>
                            <div className="mt-2 small text-muted">
                                <strong>Round Off:</strong> {roundOffEnabled ? `₹${roundOff || 0}` : 'Disabled'} |
                                <strong> Form Type:</strong> {formType} |
                                <strong> Total Tax:</strong> ₹{safeTotals.totalTax}
                            </div>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* Enhanced Payment Modal */}
            <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} centered size="lg">
                <Modal.Header closeButton className={`${currentConfig.modalHeader} text-white`}>
                    <Modal.Title className="d-flex align-items-center gap-2">
                        <FontAwesomeIcon icon={currentConfig.paymentIcon} />
                        {currentConfig.modalTitle} - ₹{formatCurrency(safeTotals.finalTotal)}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Row>
                        <Col md={6}>
                            <Form>
                                {/* Party Name Selection */}
                                <div className="mb-4">
                                    <Form.Label className="fw-bold text-secondary mb-2">
                                        <FontAwesomeIcon icon={faUser} className="me-2" />
                                        {currentConfig.partyLabel}
                                    </Form.Label>
                                    <Form.Select
                                        value={paymentData.partyName}
                                        onChange={(e) => updatePaymentData('partyName', e.target.value)}
                                        className="border-2 rounded-3"
                                        style={{ padding: '12px 16px', fontSize: '16px' }}
                                    >
                                        <option value="">Select {currentConfig.partyLabel}</option>
                                        {getPartyOptions().map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </div>

                                {/* Payment Type */}
                                <div className="mb-4">
                                    <Form.Label className="fw-bold text-secondary mb-2">
                                        <FontAwesomeIcon icon={faCreditCard} className="me-2" />
                                        Payment Method
                                    </Form.Label>
                                    <Form.Select
                                        value={paymentData.paymentType}
                                        onChange={(e) => updatePaymentData('paymentType', e.target.value)}
                                        className="border-2 rounded-3"
                                        style={{ padding: '12px 16px', fontSize: '16px' }}
                                    >
                                        <option value="Cash">💵 Cash Payment</option>
                                        <option value="UPI">📱 UPI Transfer</option>
                                        <option value="Bank">🏦 Bank Transfer</option>
                                        <option value="Card">💳 Card Payment</option>
                                        <option value="Cheque">📝 Cheque Payment</option>
                                        <option value="Online">🌐 Online Payment</option>
                                        <option value="NEFT">💸 NEFT Transfer</option>
                                        <option value="RTGS">⚡ RTGS Transfer</option>
                                    </Form.Select>
                                </div>

                                {/* Payment Amount */}
                                <div className="mb-4">
                                    <Form.Label className="fw-bold text-secondary mb-2">
                                        <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                                        Payment Amount
                                    </Form.Label>
                                    <InputGroup size="lg">
                                        <InputGroup.Text className={`${currentConfig.totalBgColor} text-white fw-bold`}>
                                            ₹
                                        </InputGroup.Text>
                                        <Form.Control
                                            type="number"
                                            placeholder="Enter amount"
                                            value={paymentData.paymentAmount || ''}
                                            onChange={(e) => updatePaymentData('paymentAmount', parseFloat(e.target.value) || 0)}
                                            max={safeTotals.finalTotal}
                                            min="0"
                                            step="0.01"
                                            className="fw-bold border-2"
                                            style={{ fontSize: '18px' }}
                                        />
                                        <Button
                                            variant={currentConfig.saveButtonVariant}
                                            onClick={handleFullAmountClick}
                                            className="fw-bold"
                                        >
                                            Full Amount
                                        </Button>
                                    </InputGroup>
                                    <div className="d-flex justify-content-between mt-2">
                                        <Form.Text className="text-muted fw-semibold">
                                            Maximum: ₹{formatCurrency(safeTotals.finalTotal)}
                                        </Form.Text>
                                        {paymentData.paymentAmount > 0 && paymentData.paymentAmount < safeTotals.finalTotal && (
                                            <Form.Text className="text-warning fw-bold">
                                                Balance: ₹{formatCurrency(safeTotals.finalTotal - paymentData.paymentAmount)}
                                            </Form.Text>
                                        )}
                                    </div>
                                </div>
                            </Form>
                        </Col>

                        <Col md={6}>
                            {/* Payment Summary */}
                            <Card className="bg-light h-100">
                                <Card.Header className={`${currentConfig.totalBgColor} text-white`}>
                                    <h6 className="mb-0">Payment Summary</h6>
                                </Card.Header>
                                <Card.Body>
                                    <div className="mb-3">
                                        <div className="d-flex justify-content-between mb-2">
                                            <span>Invoice Total:</span>
                                            <span className="fw-bold">₹{formatCurrency(safeTotals.finalTotal)}</span>
                                        </div>
                                        <div className="d-flex justify-content-between mb-2">
                                            <span>Payment Amount:</span>
                                            <span className="fw-bold text-primary">₹{formatCurrency(paymentData.paymentAmount)}</span>
                                        </div>
                                        <hr />
                                        <div className="d-flex justify-content-between">
                                            <span className="fw-bold">Remaining Balance:</span>
                                            <span className={`fw-bold ${(safeTotals.finalTotal - paymentData.paymentAmount) === 0 ? 'text-success' : 'text-warning'}`}>
                                                ₹{formatCurrency(safeTotals.finalTotal - paymentData.paymentAmount)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="text-center">
                                        {paymentData.paymentAmount === safeTotals.finalTotal ? (
                                            <span className="badge bg-success fs-6 px-3 py-2">Fully Paid</span>
                                        ) : paymentData.paymentAmount > 0 ? (
                                            <span className="badge bg-warning fs-6 px-3 py-2">Partially Paid</span>
                                        ) : (
                                            <span className="badge bg-secondary fs-6 px-3 py-2">No Payment</span>
                                        )}
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-between bg-light">
                    <Button variant="outline-secondary" size="lg" onClick={() => setShowPaymentModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant={currentConfig.buttonVariant}
                        size="lg"
                        onClick={handlePaymentSubmit}
                        disabled={!paymentData.partyName || paymentData.paymentAmount <= 0}
                        className="fw-bold px-4"
                    >
                        <FontAwesomeIcon icon={currentConfig.paymentIcon} className="me-2" />
                        {currentConfig.actionText}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default TotalSection;