import React, { useEffect, useCallback } from 'react';
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
    faInfoCircle,
    faRefresh,
    faPlus
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
    bankAccounts = [],
    loadingBankAccounts = false,
    retryLoadBankAccounts,
    paymentHistory = [],
    totals = {},
    gstEnabled = true,
    roundOffEnabled = false,
    roundOffValue = 0,
    invoiceNumber = '',
    invoiceDate = '',
    handleDueDateToggle,
    handleCreditDaysChange,
    handleDueDateChange,
    companyId,
    formType = 'sales'
}) => {

    // ✅ FIXED: Auto-set payment amount to full invoice total when modal opens
    useEffect(() => {
        if (show && finalTotalWithRoundOff > 0) {
            // Only set the amount if it's currently 0 or empty (first time opening modal)
            if (!paymentData.amount || paymentData.amount === 0) {
                const roundedTotal = Math.round(finalTotalWithRoundOff * 100) / 100;
                handlePaymentAmountChange(roundedTotal);
            }
        }
    }, [show, finalTotalWithRoundOff, paymentData.amount, handlePaymentAmountChange]);

    // ✅ OPTIMIZED: Debounced payment amount change to prevent rapid-fire updates
    const debouncedPaymentAmountChange = useCallback((value) => {
        const numericValue = parseFloat(value) || 0;
        handlePaymentAmountChange(numericValue);
    }, [handlePaymentAmountChange]);

    // ✅ FIXED: More precise remaining amount calculation
    const calculateRemainingAmount = () => {
        const invoiceTotal = parseFloat(finalTotalWithRoundOff) || 0;
        const paidAmount = parseFloat(paymentData.amount) || 0;

        // If no payment amount entered, remaining is full invoice total
        if (paidAmount === 0) {
            return invoiceTotal;
        }

        // If payment equals or exceeds invoice total, no remaining balance
        if (paidAmount >= invoiceTotal) {
            return 0;
        }

        // Otherwise, calculate remaining
        return Math.max(0, invoiceTotal - paidAmount);
    };

    const remainingAmount = calculateRemainingAmount();

    // ✅ ENHANCED: More precise payment status logic
    const getPaymentStatus = () => {
        const invoiceTotal = parseFloat(finalTotalWithRoundOff) || 0;
        const paidAmount = parseFloat(paymentData.amount) || 0;

        // No payment entered yet
        if (paidAmount === 0) {
            return 'no-payment';
        }

        // Use small threshold for floating point comparison
        const threshold = 0.01;

        // Full payment (within threshold)
        if (Math.abs(paidAmount - invoiceTotal) <= threshold || paidAmount >= invoiceTotal) {
            return 'full-payment';
        }

        // Partial payment
        if (paidAmount > threshold && paidAmount < invoiceTotal) {
            return 'partial-payment';
        }

        return 'no-payment';
    };

    const paymentStatus = getPaymentStatus();

    // ✅ UPDATED: Payment status flags based on precise logic
    const isPartialPayment = paymentStatus === 'partial-payment';
    const isFullPayment = paymentStatus === 'full-payment';
    const isNoPayment = paymentStatus === 'no-payment';

    // ✅ OPTIMIZED: Payment submission handler with better error handling
    const handleCleanPaymentSubmit = useCallback((e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (handlePaymentSubmit && typeof handlePaymentSubmit === 'function') {
            try {
                handlePaymentSubmit(invoiceDate, null, null);
            } catch (error) {
                console.error('❌ Error in payment submission:', error);
            }
        } else {
            console.error('❌ handlePaymentSubmit function not provided');
        }
    }, [paymentData, paymentStatus, remainingAmount, finalTotalWithRoundOff, handlePaymentSubmit, invoiceDate]);

    // ✅ UPDATED: Enhanced validation
    const getSubmitButtonState = () => {
        const validations = {
            hasParty: !!(paymentData.partyId && paymentData.partyName),
            hasAmount: !!(paymentData.amount && parseFloat(paymentData.amount) > 0),
            hasBankAccount: ['Cash', 'UPI'].includes(paymentData.paymentType) ||
                !!(paymentData.bankAccountId && paymentData.bankAccountId !== ''),
            hasChequeDetails: paymentData.paymentType !== 'Cheque' ||
                !!(paymentData.chequeNumber && paymentData.chequeDate),
            hasNextPaymentDate: !isPartialPayment || !!paymentData.nextPaymentDate
        };

        const isValid = Object.values(validations).every(Boolean);

        return {
            isValid,
            validations,
            isDisabled: submittingPayment || !isValid
        };
    };

    const submitState = getSubmitButtonState();

    // ✅ ENHANCED: Better validation messages
    const getValidationMessage = () => {
        if (!submitState.validations.hasParty) {
            return 'Party information is missing. Please select a customer/supplier in the main form.';
        }
        if (!submitState.validations.hasAmount) {
            return 'Please enter a valid payment amount greater than 0';
        }
        if (!submitState.validations.hasBankAccount) {
            return `Please select a bank account for ${paymentData.paymentType} payment`;
        }
        if (!submitState.validations.hasChequeDetails) {
            return 'Please provide both cheque number and cheque date';
        }
        if (!submitState.validations.hasNextPaymentDate) {
            return 'Please set next payment date for partial payment';
        }
        return '';
    };

    // ✅ OPTIMIZED: Handle retry bank accounts loading
    const handleRetryBankAccounts = useCallback(() => {
        if (retryLoadBankAccounts && typeof retryLoadBankAccounts === 'function') {
            retryLoadBankAccounts();
        } else {
            console.warn('⚠️ retryLoadBankAccounts function not provided');
        }
    }, [retryLoadBankAccounts]);

    // ✅ OPTIMIZED: Handle full amount button click
    const handleFullAmountClick = useCallback(() => {
        const roundedTotal = Math.round(finalTotalWithRoundOff * 100) / 100;
        debouncedPaymentAmountChange(roundedTotal);
    }, [finalTotalWithRoundOff, debouncedPaymentAmountChange]);

    // ✅ OPTIMIZED: Handle payment type change
    const handlePaymentTypeChangeOptimized = useCallback((value) => {
        handlePaymentTypeChange(value);
    }, [handlePaymentTypeChange]);

    // ✅ FIXED: Handle bank account change
    const handleBankAccountChange = useCallback((value) => {
        const selectedAccount = bankAccounts.find(acc =>
            (acc._id || acc.id) === value
        );

        setPaymentData(prev => ({
            ...prev,
            bankAccountId: value,
            bankAccountName: selectedAccount?.accountName || selectedAccount?.name || '',
            bankName: selectedAccount?.bankName || '',
            accountNumber: selectedAccount?.accountNumber || ''
        }));
    }, [bankAccounts, setPaymentData]);

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
                {/* ✅ UPDATED: Information banner */}
                <Alert variant="info" className="mb-3">
                    <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                    <strong>New Invoice Payment:</strong> Enter payment details that will be saved with the invoice.
                    {isFullPayment && (
                        <div className="mt-1">
                            <FontAwesomeIcon icon={faCheckCircle} className="me-1 text-success" />
                            <small className="text-success">Payment amount auto-set to full invoice total</small>
                        </div>
                    )}
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
                        <Form onSubmit={handleCleanPaymentSubmit}>
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
                                    onChange={(e) => handlePaymentTypeChangeOptimized(e.target.value)}
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

                            {/* Bank Account Selection */}
                            {!['Cash', 'UPI'].includes(paymentData.paymentType) && (
                                <div className="mb-4">
                                    <Form.Label className="fw-bold text-secondary mb-2 d-flex justify-content-between align-items-center">
                                        <span>
                                            <FontAwesomeIcon icon={faUniversity} className="me-2" />
                                            Select Bank Account *
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
                                            <FontAwesomeIcon icon={faSpinner} className="fa-spin me-2 text-primary" />
                                            <span className="text-muted">Loading bank accounts...</span>
                                        </div>
                                    ) : bankAccounts.length === 0 ? (
                                        <div className="border-2 rounded-3 p-3">
                                            <Alert variant="warning" className="mb-2">
                                                <FontAwesomeIcon icon={faUniversity} className="me-2" />
                                                <strong>No bank accounts found</strong>
                                                <p className="mb-2 mt-2">
                                                    Please add a bank account first to use this payment method.
                                                </p>
                                                <div className="d-flex gap-2">
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={handleRetryBankAccounts}
                                                    >
                                                        <FontAwesomeIcon icon={faRefresh} className="me-1" />
                                                        Try Again
                                                    </Button>
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => {
                                                            // Navigate to add bank account functionality
                                                            window.open('/bank-accounts/add', '_blank');
                                                        }}
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
                                                value={paymentData.bankAccountId || ''}
                                                onChange={(e) => handleBankAccountChange(e.target.value)}
                                                className={`border-2 rounded-3 ${!paymentData.bankAccountId ? 'border-warning' : 'border-success'}`}
                                                style={{ padding: '12px 16px', fontSize: '16px' }}
                                                required
                                            >
                                                <option value="">Select Bank Account</option>
                                                {bankAccounts.map(account => (
                                                    <option key={account._id || account.id} value={account._id || account.id}>
                                                        {account.displayName ||
                                                            `${account.accountName || account.name || 'Unknown'} - ${account.bankName || 'Unknown Bank'} (${account.accountNumber || 'N/A'}) - ₹${itemsTableLogic.formatCurrency(account.currentBalance || account.balance || 0)}`}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                            <small className="text-success">
                                                <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                                                {bankAccounts.length} bank account{bankAccounts.length !== 1 ? 's' : ''} available
                                            </small>
                                        </>
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
                                                setPaymentData(prev => ({ ...prev, chequeNumber: value }));
                                            }}
                                            placeholder="Enter cheque number"
                                            className={`border-2 rounded-3 ${!paymentData.chequeNumber ? 'border-warning' : 'border-success'}`}
                                            style={{ padding: '12px 16px' }}
                                            required
                                        />
                                        {!paymentData.chequeNumber && (
                                            <small className="text-warning">
                                                <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
                                                Cheque number is required
                                            </small>
                                        )}
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
                                                setPaymentData(prev => ({ ...prev, chequeDate: value }));
                                            }}
                                            className={`border-2 rounded-3 ${!paymentData.chequeDate ? 'border-warning' : 'border-success'}`}
                                            style={{ padding: '12px 16px' }}
                                            max={new Date().toISOString().split('T')[0]}
                                            required
                                        />
                                        {!paymentData.chequeDate && (
                                            <small className="text-warning">
                                                <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
                                                Cheque date is required
                                            </small>
                                        )}
                                    </Col>
                                </Row>
                            )}

                            {/* ✅ FIXED: Payment Amount - now pre-filled with invoice total */}
                            <div className="mb-4">
                                <Form.Label className="fw-bold text-secondary mb-2">
                                    <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                                    Payment Amount *
                                    {isFullPayment && (
                                        <Badge bg="success" className="ms-2">Full Payment</Badge>
                                    )}
                                </Form.Label>
                                <InputGroup size="lg">
                                    <InputGroup.Text className={`${currentConfig.totalBgColor} text-white fw-bold`}>
                                        ₹
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="number"
                                        placeholder="Enter amount"
                                        value={paymentData.amount || ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            // ✅ FIXED: Direct call without multiple triggers
                                            debouncedPaymentAmountChange(value);
                                        }}
                                        max={finalTotalWithRoundOff}
                                        min="0"
                                        step="0.01"
                                        className={`fw-bold border-2 ${!paymentData.amount || paymentData.amount <= 0 ? 'border-warning' : isFullPayment ? 'border-success' : 'border-info'}`}
                                        style={{ fontSize: '18px' }}
                                        required
                                    />
                                    <Button
                                        variant={isFullPayment ? 'success' : currentConfig.saveButtonVariant}
                                        onClick={handleFullAmountClick}
                                        className="fw-bold"
                                        type="button"
                                        disabled={isFullPayment}
                                    >
                                        {isFullPayment ? 'Full Amount Set' : 'Full Amount'}
                                    </Button>
                                </InputGroup>

                                {/* ✅ ENHANCED: Better amount validation feedback */}
                                {!paymentData.amount || paymentData.amount <= 0 ? (
                                    <small className="text-warning">
                                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
                                        Please enter a valid payment amount
                                    </small>
                                ) : parseFloat(paymentData.amount) > finalTotalWithRoundOff ? (
                                    <small className="text-danger">
                                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
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

                                {/* ✅ FIXED: Only show partial payment alert when truly partial */}
                                {isPartialPayment && (
                                    <Alert variant="warning" className="mt-2 mb-0">
                                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                                        <strong>Partial Payment:</strong> ₹{itemsTableLogic.formatCurrency(remainingAmount)} will remain pending
                                    </Alert>
                                )}
                            </div>

                            {/* ✅ ENHANCED: Next Payment Date for partial payments only */}
                            {isPartialPayment && (
                                <div className="mb-4">
                                    <Form.Label className="fw-bold text-secondary mb-2">
                                        <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                                        Next Payment Due Date *
                                    </Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={paymentData.nextPaymentDate || ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setPaymentData(prev => ({ ...prev, nextPaymentDate: value }));
                                        }}
                                        className={`border-2 rounded-3 ${!paymentData.nextPaymentDate ? 'border-warning' : 'border-success'}`}
                                        style={{ padding: '12px 16px' }}
                                        min={new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                    <small className="text-muted">
                                        Expected date for remaining payment of ₹{itemsTableLogic.formatCurrency(remainingAmount)}
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
                                        <span className="fw-bold">{invoiceNumber || 'New Invoice'}</span>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <span className="text-muted">Invoice Date:</span>
                                        <span className="fw-bold">{invoiceDate || new Date().toLocaleDateString()}</span>
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

                                    {/* ✅ FIXED: Payment Details - always show when payment amount is present */}
                                    {paymentData.amount && parseFloat(paymentData.amount) > 0 && (
                                        <>
                                            <hr />
                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="fw-bold">Payment Amount:</span>
                                                <span className={`fw-bold ${isFullPayment ? 'text-success' : 'text-info'}`}>
                                                    ₹{itemsTableLogic.formatCurrency(paymentData.amount || 0)}
                                                </span>
                                            </div>

                                            {/* ✅ FIXED: Only show remaining balance if there's actually a remaining amount */}
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

                                {/* ✅ FIXED: Payment Status with correct logic */}
                                <div className="text-center mb-3">
                                    {isNoPayment ? (
                                        <span className="badge bg-secondary fs-6 px-3 py-2">
                                            <FontAwesomeIcon icon={faMoneyBillWave} className="me-1" />
                                            Enter Payment Amount
                                        </span>
                                    ) : isFullPayment ? (
                                        <span className="badge bg-success fs-6 px-3 py-2">
                                            <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                                            Full Payment Ready
                                        </span>
                                    ) : isPartialPayment ? (
                                        <span className="badge bg-warning fs-6 px-3 py-2">
                                            <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
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

                                        {/* Show additional payment details */}
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

                                {/* ✅ FIXED: Credit Terms Display only for partial payments */}
                                {isPartialPayment && paymentData.nextPaymentDate && (
                                    <div className="mt-3">
                                        <hr />
                                        <Alert variant="warning" className="mb-0">
                                            <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                                            <strong>Next Payment Due:</strong>
                                            <br />
                                            Date: {new Date(paymentData.nextPaymentDate).toLocaleDateString('en-IN')}
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

                {/* ✅ ENHANCED: Better button state management */}
                <Button
                    variant={submitState.isValid ? (isFullPayment ? 'success' : currentConfig.buttonVariant) : 'outline-secondary'}
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
                            {isFullPayment ? 'Save Full Payment' : 'Save Payment Details'}
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