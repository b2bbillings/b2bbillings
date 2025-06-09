import React, { useState, useEffect } from 'react';
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
    faPercent,
    faShoppingCart,
    faTruck,
    faSync,
    faCheckCircle
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
    formType = 'sales', // 'sales' or 'purchase'
    gstEnabled = false   // GST enabled flag
}) {
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(Date.now());
    const [paymentData, setPaymentData] = useState({
        partyName: '',
        paymentType: 'Cash',
        isAdvance: false,
        selectedInvoice: '',
        paymentAmount: 0
    });

    // ✅ FIXED: Better handling of missing or incorrect totals
    const safeTotals = {
        subtotal: Math.max(0, parseFloat(totals?.subtotal) || 0),
        totalCGST: Math.max(0, parseFloat(totals?.totalCGST) || 0),
        totalSGST: Math.max(0, parseFloat(totals?.totalSGST) || 0),
        totalTax: Math.max(0, parseFloat(totals?.totalTax) || 0),
        finalTotal: Math.max(0, parseFloat(totals?.finalTotal) || 0),
    };

    // ✅ FIXED: Calculate correct total with proper fallback
    const calculateCorrectTotal = () => {
        console.log('🔢 TotalSection calculating total from:', safeTotals);

        // Priority 1: Use finalTotal if it exists and is > 0
        if (safeTotals.finalTotal > 0) {
            console.log('✅ Using finalTotal from ItemsTable:', safeTotals.finalTotal);
            return safeTotals.finalTotal;
        }

        // Priority 2: Calculate from subtotal + tax
        if (safeTotals.subtotal > 0) {
            const calculatedTotal = safeTotals.subtotal + safeTotals.totalTax;
            console.log('✅ Calculated from subtotal + tax:', calculatedTotal);
            return calculatedTotal;
        }

        // Priority 3: Calculate from subtotal + individual tax components
        if (safeTotals.subtotal > 0 && (safeTotals.totalCGST > 0 || safeTotals.totalSGST > 0)) {
            const calculatedTotal = safeTotals.subtotal + safeTotals.totalCGST + safeTotals.totalSGST;
            console.log('✅ Calculated from subtotal + CGST + SGST:', calculatedTotal);
            return calculatedTotal;
        }

        console.log('⚠️ Using fallback subtotal:', safeTotals.subtotal);
        return safeTotals.subtotal;
    };

    const baseTotal = calculateCorrectTotal();
    const finalTotalWithRoundOff = baseTotal + (roundOffEnabled ? (roundOff || 0) : 0);

    // ✅ NEW: Track totals changes for real-time updates
    useEffect(() => {
        if (totals) {
            setLastUpdated(Date.now());
            console.log('📊 TotalSection received updated totals:', {
                received: totals,
                processed: safeTotals,
                baseTotal: baseTotal,
                roundOff: roundOff,
                roundOffEnabled: roundOffEnabled,
                finalDisplayTotal: finalTotalWithRoundOff,
                timestamp: new Date().toLocaleTimeString()
            });
        }
    }, [totals, roundOff, roundOffEnabled]);

    // Enhanced logic for showing tax breakdown
    const shouldShowTaxBreakdown = gstEnabled &&
        safeTotals.totalTax > 0 &&
        safeTotals.subtotal > 0 &&
        (safeTotals.totalCGST > 0 || safeTotals.totalSGST > 0);

    // Check if there are any items with cost - use the actual total amount
    const hasValidItems = baseTotal > 0;

    // ✅ ENHANCED: Debug logging with better formatting
    console.log('🧮 TotalSection Debug:', {
        formType,
        gstEnabled,
        roundOffEnabled,
        roundOff,
        receivedTotals: totals,
        safeTotals,
        baseTotal,
        finalTotalWithRoundOff,
        shouldShowTaxBreakdown,
        hasValidItems,
        lastUpdated: new Date(lastUpdated).toLocaleTimeString()
    });

    // Format currency safely
    const formatCurrency = (amount) => {
        const value = Number(amount) || 0;
        return value.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    // ✅ ENHANCED: Round off change handler with immediate total calculation
    const handleRoundOffChange = (value) => {
        const numValue = parseFloat(value) || 0;
        console.log('🔄 Round off changing from', roundOff, 'to', numValue);
        onRoundOffChange(numValue);
    };

    // ✅ ENHANCED: Round off toggle handler
    const handleRoundOffToggle = (enabled) => {
        console.log('🔄 Round off toggle:', enabled);
        onRoundOffToggle(enabled);
        if (!enabled) {
            onRoundOffChange(0); // Reset to 0 when disabled
        }
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
            saveButtonText: 'Save Invoice',
            saveButtonVariant: 'success',
            successMessage: (type, party) => `Payment received via ${type} from ${party}`,
            formIcon: faShoppingCart,
            emptyMessage: 'Add items to invoice'
        },
        purchase: {
            paymentAction: 'Payment Out',
            paymentIcon: faArrowUp,
            modalTitle: 'Payment Out',
            modalHeader: 'bg-primary',
            buttonVariant: 'primary',
            actionText: 'Make Payment',
            partyLabel: 'Supplier Name',
            invoicePrefix: 'PUR-',
            actionButtonColor: 'outline-primary',
            totalLabel: 'Total Cost',
            totalBorderColor: 'border-primary',
            totalBgColor: 'bg-primary',
            totalTextColor: 'text-primary',
            saveButtonText: 'Save Purchase',
            saveButtonVariant: 'primary',
            successMessage: (type, party) => `Payment made via ${type} to ${party}`,
            formIcon: faTruck,
            emptyMessage: 'Add items to purchase'
        }
    };

    const currentConfig = config[formType];

    const handlePayment = () => {
        // Validate totals before opening modal
        if (!hasValidItems || finalTotalWithRoundOff <= 0) {
            alert(`Please add items with valid costs to the ${formType} before processing payment.`);
            return;
        }

        // ✅ FIXED: Set default payment amount to final total
        setPaymentData(prev => ({
            ...prev,
            paymentAmount: finalTotalWithRoundOff
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

        if (paymentData.paymentAmount > finalTotalWithRoundOff) {
            alert(`Payment amount cannot exceed ₹${formatCurrency(finalTotalWithRoundOff)}`);
            return;
        }

        console.log(`${currentConfig.paymentAction} Data:`, {
            ...paymentData,
            totalAmount: finalTotalWithRoundOff,
            remainingBalance: finalTotalWithRoundOff - paymentData.paymentAmount
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
        updatePaymentData('paymentAmount', finalTotalWithRoundOff);
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

    // Calculate grid layout based on sections that should be visible
    const getGridLayout = () => {
        const hasPaymentButton = hasValidItems; // Only show if there are valid items
        const hasTaxBreakdown = shouldShowTaxBreakdown; // Only show if GST enabled and tax exists
        const hasTotalSection = true; // Always show total section
        const hasActionButtons = true; // Always show action buttons

        // Count active sections
        const sectionCount = [hasPaymentButton, hasTaxBreakdown, hasTotalSection, hasActionButtons].filter(Boolean).length;

        // Return appropriate column sizes
        if (sectionCount === 4) {
            return { payment: 3, tax: 3, total: 3, actions: 3 };
        } else if (sectionCount === 3) {
            // No tax breakdown
            return { payment: 3, tax: 0, total: 4, actions: 5 };
        } else if (sectionCount === 2) {
            // No payment button and no tax breakdown
            return { payment: 0, tax: 0, total: 6, actions: 6 };
        } else {
            return { payment: 4, tax: 0, total: 4, actions: 4 };
        }
    };

    const gridLayout = getGridLayout();

    // ✅ ENHANCED: Get appropriate status message for the totals
    const getStatusMessage = () => {
        if (!hasValidItems) {
            return currentConfig.emptyMessage;
        }

        if (gstEnabled) {
            if (shouldShowTaxBreakdown) {
                return `GST Applied - Base: ₹${formatCurrency(safeTotals.subtotal)} + Tax: ₹${formatCurrency(safeTotals.totalTax)}`;
            } else {
                return 'GST Enabled - No Tax Applied';
            }
        } else {
            return 'Non-GST Transaction';
        }
    };

    return (
        <>
            <Card className="border-0 shadow-sm">
                <Card.Body className="p-4">
                    {/* ✅ NEW: Real-time sync indicator */}
                    {process.env.NODE_ENV === 'development' && (
                        <div className="d-flex justify-content-between align-items-center mb-3 p-2 bg-info bg-opacity-10 rounded">
                            <small className="text-info">
                                <FontAwesomeIcon icon={faSync} className="me-1" />
                                Last Update: {new Date(lastUpdated).toLocaleTimeString()}
                            </small>
                            <small className="text-success">
                                <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                                Direct from ItemsTable: ₹{formatCurrency(baseTotal)} → Final: ₹{formatCurrency(finalTotalWithRoundOff)}
                            </small>
                        </div>
                    )}

                    {/* Enhanced Layout with Better Spacing */}
                    <Row className="align-items-center g-4">
                        {/* Payment Button - Only show if there are valid items */}
                        {hasValidItems && (
                            <Col md={gridLayout.payment}>
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
                                        disabled={finalTotalWithRoundOff <= 0}
                                    >
                                        <FontAwesomeIcon icon={currentConfig.paymentIcon} className="mb-1" size="lg" />
                                        <span className="small">{currentConfig.paymentAction}</span>
                                    </Button>
                                </div>
                            </Col>
                        )}

                        {/* ✅ ENHANCED: Tax Breakdown Section with better formatting */}
                        {shouldShowTaxBreakdown && (
                            <Col md={gridLayout.tax}>
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

                        {/* ✅ FIXED: Final Total Section - Use exact amount from ItemsTable */}
                        <Col md={gridLayout.total}>
                            <Card className={`${hasValidItems ? currentConfig.totalBorderColor : 'border-secondary'} border-3 h-100`}>
                                <Card.Body className="p-3">
                                    <div className="text-center mb-3">
                                        <FontAwesomeIcon icon={currentConfig.formIcon} className="me-2 text-muted" />
                                        <span className="fw-bold text-secondary small">{currentConfig.totalLabel}</span>
                                    </div>

                                    {/* ✅ FIXED: Main Total Display - Show the exact total from ItemsTable + round off */}
                                    <div className={`fw-bold ${hasValidItems ? currentConfig.totalTextColor : 'text-secondary'} h4 mb-3 text-center`}>
                                        ₹{formatCurrency(finalTotalWithRoundOff)}
                                    </div>

                                    {/* ✅ ENHANCED: Round Off Controls with better UX */}
                                    {hasValidItems && (
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
                                                    onChange={(e) => handleRoundOffToggle(e.target.checked)}
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
                                                        onChange={(e) => handleRoundOffChange(e.target.value)}
                                                        className="text-center fw-bold"
                                                        style={{ fontSize: '14px' }}
                                                        step="0.01"
                                                        min="-10"
                                                        max="10"
                                                        placeholder="0.00"
                                                    />
                                                </InputGroup>
                                            )}

                                            {/* ✅ FIXED: Show breakdown when round off is applied */}
                                            {roundOffEnabled && roundOff !== 0 && (
                                                <div className="mt-2 p-2 bg-warning bg-opacity-10 rounded">
                                                    <div className="d-flex justify-content-between small">
                                                        <span className="text-muted">Items Total:</span>
                                                        <span>₹{formatCurrency(baseTotal)}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between small">
                                                        <span className="text-muted">Round Off:</span>
                                                        <span className={roundOff > 0 ? 'text-success' : 'text-danger'}>
                                                            {roundOff > 0 ? '+' : ''}₹{formatCurrency(Math.abs(roundOff))}
                                                        </span>
                                                    </div>
                                                    <hr className="my-1" />
                                                    <div className="d-flex justify-content-between small fw-bold">
                                                        <span>Final Total:</span>
                                                        <span>₹{formatCurrency(finalTotalWithRoundOff)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Summary Details */}
                                    <div className="small text-muted text-center mt-3">
                                        {!hasValidItems ? (
                                            <div className="text-center">
                                                <small className="text-muted">{currentConfig.emptyMessage}</small>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mb-1">{getStatusMessage()}</div>
                                                <div className="text-info">
                                                    <small>
                                                        Direct sync from Items: ₹{formatCurrency(baseTotal)}
                                                        {roundOffEnabled && roundOff !== 0 && ` + Round Off`}
                                                    </small>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Action Buttons */}
                        <Col md={gridLayout.actions}>
                            <div className="d-grid gap-2">
                                {/* Share Button */}
                                <Button
                                    variant="outline-info"
                                    size="lg"
                                    className="d-flex align-items-center justify-content-center gap-2 fw-semibold border-2"
                                    onClick={onShare}
                                    disabled={!hasValidItems || finalTotalWithRoundOff <= 0}
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

                    {/* ✅ ENHANCED: Debug Info with real-time totals tracking */}
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-4 p-3 bg-warning bg-opacity-10 border border-warning rounded">
                            <h6 className="text-warning mb-2">
                                <FontAwesomeIcon icon={faCalculator} className="me-2" />
                                Debug Information - TotalSection (Direct Sync)
                            </h6>
                            <Row className="small text-muted">
                                <Col md={3}>
                                    <div><strong>Subtotal:</strong> ₹{formatCurrency(safeTotals.subtotal)}</div>
                                    <div><strong>CGST:</strong> ₹{formatCurrency(safeTotals.totalCGST)}</div>
                                </Col>
                                <Col md={3}>
                                    <div><strong>SGST:</strong> ₹{formatCurrency(safeTotals.totalSGST)}</div>
                                    <div><strong>Total Tax:</strong> ₹{formatCurrency(safeTotals.totalTax)}</div>
                                </Col>
                                <Col md={3}>
                                    <div><strong>Items Total:</strong> ₹{formatCurrency(baseTotal)}</div>
                                    <div><strong>Round Off:</strong> ₹{formatCurrency(roundOff || 0)}</div>
                                </Col>
                                <Col md={3}>
                                    <div><strong>Final Display:</strong> ₹{formatCurrency(finalTotalWithRoundOff)}</div>
                                    <div><strong>Match Check:</strong> {Math.abs(baseTotal - safeTotals.finalTotal) < 0.01 ? '✅ Match' : '❌ Mismatch'}</div>
                                </Col>
                            </Row>
                            <div className="mt-2 small text-muted">
                                <div className="d-flex flex-wrap gap-3">
                                    <span><strong>GST Enabled:</strong> {gstEnabled ? '✅ Yes' : '❌ No'}</span>
                                    <span><strong>Round Off:</strong> {roundOffEnabled ? '✅ Enabled' : '❌ Disabled'}</span>
                                    <span><strong>Form Type:</strong> {formType}</span>
                                    <span><strong>Tax Breakdown:</strong> {shouldShowTaxBreakdown ? '✅ Visible' : '❌ Hidden'}</span>
                                    <span><strong>Valid Items:</strong> {hasValidItems ? '✅ Yes' : '❌ No'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* ✅ ENHANCED: Payment Modal with correct totals */}
            <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} centered size="lg">
                <Modal.Header closeButton className={`${currentConfig.modalHeader} text-white`}>
                    <Modal.Title className="d-flex align-items-center gap-2">
                        <FontAwesomeIcon icon={currentConfig.paymentIcon} />
                        {currentConfig.modalTitle} - ₹{formatCurrency(finalTotalWithRoundOff)}
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
                                            max={finalTotalWithRoundOff}
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
                                            Maximum: ₹{formatCurrency(finalTotalWithRoundOff)}
                                        </Form.Text>
                                        {paymentData.paymentAmount > 0 && paymentData.paymentAmount < finalTotalWithRoundOff && (
                                            <Form.Text className="text-warning fw-bold">
                                                Balance: ₹{formatCurrency(finalTotalWithRoundOff - paymentData.paymentAmount)}
                                            </Form.Text>
                                        )}
                                    </div>
                                </div>
                            </Form>
                        </Col>

                        <Col md={6}>
                            {/* ✅ FIXED: Payment Summary with correct totals */}
                            <Card className="bg-light h-100">
                                <Card.Header className={`${currentConfig.totalBgColor} text-white`}>
                                    <h6 className="mb-0">Payment Summary</h6>
                                </Card.Header>
                                <Card.Body>
                                    <div className="mb-3">
                                        <div className="d-flex justify-content-between mb-2">
                                            <span>Items Total:</span>
                                            <span className="fw-bold">₹{formatCurrency(baseTotal)}</span>
                                        </div>
                                        {roundOffEnabled && roundOff !== 0 && (
                                            <div className="d-flex justify-content-between mb-2">
                                                <span>Round Off:</span>
                                                <span className={`fw-bold ${roundOff > 0 ? 'text-success' : 'text-danger'}`}>
                                                    {roundOff > 0 ? '+' : ''}₹{formatCurrency(Math.abs(roundOff))}
                                                </span>
                                            </div>
                                        )}
                                        <div className="d-flex justify-content-between mb-2 border-top pt-2">
                                            <span className="fw-bold">Final Total:</span>
                                            <span className="fw-bold text-primary">₹{formatCurrency(finalTotalWithRoundOff)}</span>
                                        </div>
                                        <div className="d-flex justify-content-between mb-2">
                                            <span>Payment Amount:</span>
                                            <span className="fw-bold text-success">₹{formatCurrency(paymentData.paymentAmount)}</span>
                                        </div>
                                        <hr />
                                        <div className="d-flex justify-content-between">
                                            <span className="fw-bold">Remaining Balance:</span>
                                            <span className={`fw-bold ${(finalTotalWithRoundOff - paymentData.paymentAmount) === 0 ? 'text-success' : 'text-warning'}`}>
                                                ₹{formatCurrency(finalTotalWithRoundOff - paymentData.paymentAmount)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="text-center">
                                        {paymentData.paymentAmount === finalTotalWithRoundOff ? (
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