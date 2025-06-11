import React from 'react';
import { Modal, Row, Col, Form, InputGroup, Button, Card, Badge, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
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
    faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import itemsTableLogic from './itemsTableLogic';

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
    bankAccounts,
    loadingBankAccounts,
    paymentHistory,
    totals,
    gstEnabled,
    roundOffEnabled,
    roundOffValue,
    invoiceNumber,
    invoiceDate
}) => {

    // ✅ UPDATED: Clean payment submission handler
    const handleCleanPaymentSubmit = (e) => {
        // Prevent event object from being passed
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        console.log('💰 Payment details submission triggered (validation only)');

        // Call the original handler with clean parameters
        if (handlePaymentSubmit && typeof handlePaymentSubmit === 'function') {
            // Pass only the necessary clean parameters
            handlePaymentSubmit(
                invoiceDate,          // invoiceDate
                null,                 // onSave callback (will be handled internally)
                null                  // loadBankAccounts callback (will be handled internally)
            );
        } else {
            console.error('❌ handlePaymentSubmit function not provided');
        }
    };

    // ✅ FIXED: Make sure all references use consistent field names
    const getSubmitButtonState = () => {
        const validations = {
            hasParty: !!paymentData.partyId,
            hasAmount: (paymentData.amount || 0) > 0, // ✅ Correct
            hasBankAccount: ['Cash', 'UPI'].includes(paymentData.paymentType) || !!paymentData.bankAccountId,
            hasChequeDetails: paymentData.paymentType !== 'Cheque' || (paymentData.chequeNumber && paymentData.chequeDate),
            hasNextPaymentDate: !paymentData.isPartialPayment || (paymentData.remainingAmount || 0) <= 0 || !!paymentData.nextPaymentDate
        };

        const isValid = Object.values(validations).every(Boolean);

        return {
            isValid,
            validations,
            isDisabled: submittingPayment || !isValid
        };
    };

    const submitState = getSubmitButtonState();

    // ✅ FIXED: Add null safety
    const getValidationMessage = () => {
        if (!submitState.validations.hasParty) return 'Party information is missing';
        if (!submitState.validations.hasAmount) return 'Please enter a payment amount';
        if (!submitState.validations.hasBankAccount) return 'Please select a bank account';
        if (!submitState.validations.hasChequeDetails) return 'Please provide cheque number and date';
        if (!submitState.validations.hasNextPaymentDate) return 'Please set next payment date for partial payment';
        return '';
    };

    return (
        <Modal show={show} onHide={onHide} centered size="xl">
            <Modal.Header closeButton className={`${currentConfig.modalHeader} text-white`}>
                <Modal.Title className="d-flex align-items-center gap-2">
                    <FontAwesomeIcon icon={currentConfig.paymentIcon} />
                    {currentConfig.modalTitle} - ₹{itemsTableLogic.formatCurrency(finalTotalWithRoundOff)}
                    {paymentData.partyName && (
                        <Badge bg="light" text="dark" className="ms-2">
                            {paymentData.partyName}
                        </Badge>
                    )}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-4">
                {/* ✅ NEW: Information banner about the new flow */}
                <Alert variant="info" className="mb-3">
                    <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                    <strong>Payment Selection:</strong> This will store your payment details.
                    The actual transaction will be recorded when you create the invoice.
                </Alert>

                {/* ✅ Enhanced validation feedback */}
                {!submitState.isValid && (
                    <Alert variant="warning" className="mb-3">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                        <strong>Validation:</strong> {getValidationMessage()}
                    </Alert>
                )}

                <Row>
                    {/* Left Column - Payment Form */}
                    <Col md={7}>
                        <Form onSubmit={(e) => {
                            e.preventDefault();
                            handleCleanPaymentSubmit(e);
                        }}>
                            {/* Party Information */}
                            <div className="mb-4">
                                <Form.Label className="fw-bold text-secondary mb-2">
                                    <FontAwesomeIcon icon={faUser} className="me-2" />
                                    {currentConfig.partyLabel}
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    value={paymentData.partyName || 'No party selected'}
                                    readOnly
                                    className={`border-2 rounded-3 ${paymentData.partyName ? 'bg-light' : 'bg-warning bg-opacity-25'}`}
                                    style={{ padding: '12px 16px', fontSize: '16px' }}
                                />
                                <small className={`${paymentData.partyName ? 'text-muted' : 'text-warning'}`}>
                                    {paymentData.partyName ? 'Auto-selected from form' : 'Please select a customer/supplier in the form above'}
                                </small>
                            </div>

                            {/* Payment Type */}
                            <div className="mb-4">
                                <Form.Label className="fw-bold text-secondary mb-2">
                                    <FontAwesomeIcon icon={faCreditCard} className="me-2" />
                                    Payment Method
                                </Form.Label>
                                <Form.Select
                                    value={paymentData.paymentType || 'Cash'}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        console.log('💳 Payment type changed to:', value);
                                        handlePaymentTypeChange(value);
                                    }}
                                    className="border-2 rounded-3"
                                    style={{ padding: '12px 16px', fontSize: '16px' }}
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

                            {/* ✅ UPDATED: Bank Account Selection */}
                            {!['Cash', 'UPI'].includes(paymentData.paymentType) && (
                                <div className="mb-4">
                                    <Form.Label className="fw-bold text-secondary mb-2">
                                        <FontAwesomeIcon icon={faUniversity} className="me-2" />
                                        Select Bank Account *
                                    </Form.Label>
                                    {loadingBankAccounts ? (
                                        <div className="text-center py-3 bg-light rounded-3">
                                            <FontAwesomeIcon icon={faSpinner} className="fa-spin me-2" />
                                            Loading bank accounts...
                                        </div>
                                    ) : bankAccounts.length === 0 ? (
                                        <Alert variant="info" className="mb-2">
                                            <FontAwesomeIcon icon={faUniversity} className="me-2" />
                                            No bank accounts available. Please add a bank account first.
                                        </Alert>
                                    ) : (
                                        <Form.Select
                                            value={paymentData.bankAccountId || ''}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                console.log('🏦 Bank account selected:', value);
                                                setPaymentData(prev => ({ ...prev, bankAccountId: value }));
                                            }}
                                            className={`border-2 rounded-3 ${!paymentData.bankAccountId ? 'border-warning' : ''}`}
                                            style={{ padding: '12px 16px', fontSize: '16px' }}
                                            required
                                        >
                                            <option value="">Select Bank Account</option>
                                            {bankAccounts.map(account => (
                                                <option key={account._id || account.id} value={account._id || account.id}>
                                                    {account.accountName || account.displayName ||
                                                        `${account.bankName || 'Unknown Bank'} - ${account.accountNumber || 'N/A'} (${account.accountType || 'N/A'}) - ₹${itemsTableLogic.formatCurrency(account.currentBalance || account.balance || 0)}`}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    )}
                                </div>
                            )}

                            {/* Cheque Details */}
                            {paymentData.paymentType === 'Cheque' && (
                                <Row className="mb-4">
                                    <Col md={6}>
                                        <Form.Label className="fw-bold text-secondary mb-2">
                                            <FontAwesomeIcon icon={faReceipt} className="me-2" />
                                            Cheque Number *
                                        </Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={paymentData.chequeNumber || ''}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                console.log('📝 Cheque number:', value);
                                                setPaymentData(prev => ({ ...prev, chequeNumber: value }));
                                            }}
                                            placeholder="Enter cheque number"
                                            className={`border-2 rounded-3 ${!paymentData.chequeNumber ? 'border-warning' : ''}`}
                                            style={{ padding: '12px 16px' }}
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
                                            value={paymentData.chequeDate || ''}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                console.log('📅 Cheque date:', value);
                                                setPaymentData(prev => ({ ...prev, chequeDate: value }));
                                            }}
                                            className={`border-2 rounded-3 ${!paymentData.chequeDate ? 'border-warning' : ''}`}
                                            style={{ padding: '12px 16px' }}
                                            max={new Date().toISOString().split('T')[0]}
                                            required
                                        />
                                    </Col>
                                </Row>
                            )}

                            {/* ✅ UPDATED: Payment Amount - using correct field name */}
                            <div className="mb-4">
                                <Form.Label className="fw-bold text-secondary mb-2">
                                    <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                                    Payment Amount *
                                </Form.Label>
                                <InputGroup size="lg">
                                    <InputGroup.Text className={`${currentConfig.totalBgColor} text-white fw-bold`}>
                                        ₹
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="number"
                                        placeholder="Enter amount"
                                        value={paymentData.amount || ''} // ✅ Changed from paymentAmount to amount
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            console.log('💰 Payment amount changed:', value);
                                            handlePaymentAmountChange(value);
                                        }}
                                        max={finalTotalWithRoundOff}
                                        min="0"
                                        step="0.01"
                                        className={`fw-bold border-2 ${!paymentData.amount || paymentData.amount <= 0 ? 'border-warning' : ''}`} // ✅ Changed field name
                                        style={{ fontSize: '18px' }}
                                        required
                                    />
                                    <Button
                                        variant={currentConfig.saveButtonVariant}
                                        onClick={() => {
                                            console.log('💯 Setting full amount:', finalTotalWithRoundOff);
                                            handlePaymentAmountChange(finalTotalWithRoundOff);
                                        }}
                                        className="fw-bold"
                                        type="button"
                                    >
                                        Full Amount
                                    </Button>
                                </InputGroup>

                                {paymentData.isPartialPayment && (
                                    <Alert variant="warning" className="mt-2 mb-0">
                                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                                        <strong>Partial Payment:</strong> ₹{itemsTableLogic.formatCurrency(paymentData.remainingAmount)} will remain pending
                                    </Alert>
                                )}
                            </div>

                            {/* Next Payment Date for partial payments */}
                            {paymentData.isPartialPayment && paymentData.remainingAmount > 0 && (
                                <div className="mb-4">
                                    <Form.Label className="fw-bold text-secondary mb-2">
                                        <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                                        Next Payment Date *
                                    </Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={paymentData.nextPaymentDate || ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            console.log('📅 Next payment date:', value);
                                            setPaymentData(prev => ({ ...prev, nextPaymentDate: value }));
                                        }}
                                        className={`border-2 rounded-3 ${!paymentData.nextPaymentDate ? 'border-warning' : ''}`}
                                        style={{ padding: '12px 16px' }}
                                        min={new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                    <small className="text-muted">
                                        Expected date for remaining payment of ₹{itemsTableLogic.formatCurrency(paymentData.remainingAmount)}
                                    </small>
                                </div>
                            )}

                            {/* Transaction ID for online payments */}
                            {['UPI', 'Online', 'NEFT', 'RTGS'].includes(paymentData.paymentType) && (
                                <div className="mb-4">
                                    <Form.Label className="fw-bold text-secondary mb-2">
                                        <FontAwesomeIcon icon={faReceipt} className="me-2" />
                                        Transaction ID (Optional)
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={paymentData.transactionId || ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            console.log('🧾 Transaction ID:', value);
                                            setPaymentData(prev => ({ ...prev, transactionId: value }));
                                        }}
                                        placeholder="Enter transaction ID or reference number"
                                        className="border-2 rounded-3"
                                        style={{ padding: '12px 16px' }}
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
                                    value={paymentData.notes || ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setPaymentData(prev => ({ ...prev, notes: value }));
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
                            <Card.Header className={`${currentConfig.totalBgColor} text-white`}>
                                <h6 className="mb-0">
                                    <FontAwesomeIcon icon={faWallet} className="me-2" />
                                    Payment Summary
                                </h6>
                            </Card.Header>
                            <Card.Body>
                                {/* Invoice Details */}
                                <div className="mb-3">
                                    <div className="d-flex justify-content-between mb-2">
                                        <span className="text-muted">Invoice Number:</span>
                                        <span className="fw-bold">{invoiceNumber || 'N/A'}</span>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <span className="text-muted">Invoice Date:</span>
                                        <span className="fw-bold">{invoiceDate || 'N/A'}</span>
                                    </div>
                                    <hr />

                                    {/* Amount Breakdown */}
                                    {gstEnabled && totals.totalTax > 0 ? (
                                        <>
                                            <div className="d-flex justify-content-between mb-2">
                                                <span>Subtotal (Pre-Tax):</span>
                                                <span className="fw-bold">₹{itemsTableLogic.formatCurrency(totals.subtotal || 0)}</span>
                                            </div>
                                            <div className="d-flex justify-content-between mb-2">
                                                <span>GST Amount:</span>
                                                <span className="fw-bold text-info">₹{itemsTableLogic.formatCurrency(totals.totalTax || 0)}</span>
                                            </div>
                                            <div className="d-flex justify-content-between mb-2 border-top pt-2">
                                                <span>Total (Inc. GST):</span>
                                                <span className="fw-bold">₹{itemsTableLogic.formatCurrency(totals.finalTotal || 0)}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="d-flex justify-content-between mb-2">
                                            <span>{gstEnabled ? 'Total (Calculating GST...)' : 'Total Amount'}:</span>
                                            <span className="fw-bold">₹{itemsTableLogic.formatCurrency(totals.finalTotal || 0)}</span>
                                        </div>
                                    )}

                                    {roundOffEnabled && roundOffValue !== 0 && (
                                        <div className="d-flex justify-content-between mb-2">
                                            <span>Round Off:</span>
                                            <span className={`fw-bold ${roundOffValue > 0 ? 'text-success' : 'text-danger'}`}>
                                                {roundOffValue > 0 ? '+' : ''}₹{itemsTableLogic.formatCurrency(Math.abs(roundOffValue))}
                                            </span>
                                        </div>
                                    )}

                                    <div className="d-flex justify-content-between mb-2 border-top pt-2">
                                        <span className="fw-bold">Invoice Total:</span>
                                        <span className="fw-bold text-primary">₹{itemsTableLogic.formatCurrency(finalTotalWithRoundOff || 0)}</span>
                                    </div>

                                    {/* ✅ UPDATED: Payment Details with correct field names */}
                                    <hr />
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Current Payment:</span>
                                        <span className="fw-bold text-success">₹{itemsTableLogic.formatCurrency(paymentData.amount || 0)}</span> {/* ✅ Changed field name */}
                                    </div>

                                    {paymentData.totalPaid > 0 && (
                                        <div className="d-flex justify-content-between mb-2">
                                            <span>Previously Paid:</span>
                                            <span className="fw-bold text-info">₹{itemsTableLogic.formatCurrency(paymentData.totalPaid || 0)}</span>
                                        </div>
                                    )}

                                    <div className="d-flex justify-content-between">
                                        <span className="fw-bold">Remaining Balance:</span>
                                        <span className={`fw-bold ${(paymentData.remainingAmount || 0) === 0 ? 'text-success' : 'text-warning'}`}>
                                            ₹{itemsTableLogic.formatCurrency(paymentData.remainingAmount || 0)}
                                        </span>
                                    </div>
                                </div>

                                {/* ✅ FIXED: Payment Status with correct field names and proper JSX syntax */}
                                <div className="text-center mb-3">
                                    {(paymentData.remainingAmount || 0) === 0 && (paymentData.amount || 0) > 0 ? (
                                        <span className="badge bg-success fs-6 px-3 py-2">
                                            <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                                            Fully Paid
                                        </span>
                                    ) : (paymentData.amount || 0) > 0 ? (
                                        <span className="badge bg-warning fs-6 px-3 py-2">
                                            <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
                                            Partially Paid
                                        </span>
                                    ) : (
                                        <span className="badge bg-secondary fs-6 px-3 py-2">
                                            No Payment
                                        </span>
                                    )}
                                </div>

                                {/* Payment History */}
                                {paymentHistory && paymentHistory.length > 0 && (
                                    <div className="mt-3">
                                        <hr />
                                        <h6 className="text-secondary">
                                            <FontAwesomeIcon icon={faHistory} className="me-2" />
                                            Payment History ({paymentHistory.length})
                                        </h6>
                                        <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                                            {paymentHistory.map((payment, index) => (
                                                <div key={payment._id || payment.id || index} className="d-flex justify-content-between align-items-center mb-1 p-1 bg-white rounded">
                                                    <div>
                                                        <small className="text-muted">
                                                            {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'Unknown Date'}
                                                        </small>
                                                        <br />
                                                        <small className="fw-bold">
                                                            {payment.paymentType || payment.paymentMethod || 'Unknown Method'}
                                                        </small>
                                                    </div>
                                                    <span className="fw-bold text-success">
                                                        ₹{itemsTableLogic.formatCurrency(payment.amount || 0)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
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

                {/* ✅ UPDATED: Button text to reflect new flow */}
                <Button
                    variant={currentConfig.buttonVariant}
                    size="lg"
                    onClick={handleCleanPaymentSubmit}
                    disabled={submitState.isDisabled}
                    className="fw-bold px-4"
                    type="button"
                >
                    {submittingPayment ? (
                        <>
                            <FontAwesomeIcon icon={faSpinner} className="fa-spin me-2" />
                            Saving Payment Details...
                        </>
                    ) : (
                        <>
                            <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                            Save Payment Details
                            {(paymentData.amount || 0) > 0 && (
                                <span className="ms-2">
                                    (₹{itemsTableLogic.formatCurrency(paymentData.amount || 0)})
                                </span>
                            )}
                        </>
                    )}
                </Button>
            </Modal.Footer>
        </Modal >
    );
};

export default PaymentModal;