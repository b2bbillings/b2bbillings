import React, { useState, useEffect, useRef } from 'react';
import { Modal, Form, Button, Row, Col, InputGroup, Alert, Spinner, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faMoneyBillWave,
    faUser,
    faCalendarDay,
    faFileInvoice,
    faStickyNote,
    faTimes,
    faCheck,
    faCreditCard,
    faUniversity,
    faWallet,
    faMobileAlt,
    faArrowUp
} from '@fortawesome/free-solid-svg-icons';
import paymentService from '../../../services/paymentService'; // Use the payment service

function PayOut({
    show,
    onHide,
    party,
    onPaymentRecorded,
    currentCompany
}) {
    // Form data state
    const [formData, setFormData] = useState({
        amount: '',
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        reference: '',
        notes: '',
        paymentDetails: {}
    });

    // UI states
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Refs for form fields
    const amountRef = useRef(null);

    // Payment methods
    const paymentMethods = [
        { value: 'cash', label: 'Cash', icon: faWallet },
        { value: 'bank_transfer', label: 'Bank Transfer', icon: faUniversity },
        { value: 'cheque', label: 'Cheque', icon: faFileInvoice },
        { value: 'card', label: 'Card', icon: faCreditCard },
        { value: 'upi', label: 'UPI', icon: faMobileAlt },
        { value: 'other', label: 'Other', icon: faMoneyBillWave }
    ];

    // Reset form when modal opens
    useEffect(() => {
        if (show) {
            setFormData({
                amount: '',
                paymentMethod: 'cash',
                paymentDate: new Date().toISOString().split('T')[0],
                reference: '',
                notes: '',
                paymentDetails: {}
            });
            setError('');
            setSuccess('');
            
            // Focus on amount field
            setTimeout(() => {
                if (amountRef.current) {
                    amountRef.current.focus();
                }
            }, 100);
        }
    }, [show]);

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle payment details changes
    const handlePaymentDetailChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            paymentDetails: {
                ...prev.paymentDetails,
                [field]: value
            }
        }));
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validation
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            setError('Please enter a valid amount greater than 0');
            return;
        }

        if (!formData.paymentDate) {
            setError('Please select a payment date');
            return;
        }

        // Method-specific validation
        if (formData.paymentMethod === 'cheque') {
            if (!formData.paymentDetails.chequeNumber) {
                setError('Please enter cheque number');
                return;
            }
        }

        if (formData.paymentMethod === 'bank_transfer' && !formData.paymentDetails.transactionId) {
            setError('Please enter transaction ID for bank transfer');
            return;
        }

        if (formData.paymentMethod === 'upi' && !formData.paymentDetails.upiTransactionId) {
            setError('Please enter UPI transaction ID');
            return;
        }

        try {
            setIsLoading(true);

            const paymentData = {
                partyId: party._id || party.id, // Fixed: Use _id first (MongoDB standard)
                amount: parseFloat(formData.amount),
                paymentMethod: formData.paymentMethod,
                paymentDate: formData.paymentDate,
                reference: formData.reference,
                notes: formData.notes,
                paymentDetails: formData.paymentDetails,
                companyId: currentCompany?._id || currentCompany?.id // Fixed: Use _id first
            };

            console.log('💸 Recording payment out:', paymentData);

            // Use the payment service instead of direct axios
            const response = await paymentService.createPaymentOut(paymentData);

            if (response.success) {
                setSuccess(`Payment of ₹${formData.amount} recorded successfully!`);

                // Callback to parent
                if (onPaymentRecorded) {
                    onPaymentRecorded({
                        type: 'payment_out',
                        amount: paymentData.amount,
                        paymentMethod: paymentData.paymentMethod,
                        paymentDate: paymentData.paymentDate,
                        reference: paymentData.reference,
                        notes: paymentData.notes,
                        paymentNumber: response.data?.payment?.paymentNumber
                    }, response.data?.party);
                }

                // Close modal after short delay
                setTimeout(() => {
                    onHide();
                }, 1500);
            } else {
                setError(response.message || 'Failed to record payment');
            }

        } catch (error) {
            console.error('❌ Error recording payment:', error);
            
            if (error.message) {
                setError(error.message);
            } else {
                setError('Failed to record payment. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (!show) return;

            if (e.key === 'Escape') {
                onHide();
            } else if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                handleSubmit(e);
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [show]);

    if (!party) return null;

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header className="bg-danger bg-opacity-10 border-0">
                <Modal.Title className="d-flex align-items-center text-danger">
                    <FontAwesomeIcon icon={faArrowUp} className="me-2" />
                    Payment Made
                </Modal.Title>
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={onHide}
                    className="border-0"
                    disabled={isLoading}
                >
                    <FontAwesomeIcon icon={faTimes} />
                </Button>
            </Modal.Header>

            <Modal.Body className="p-4">
                {/* Party Information */}
                <div className="bg-light rounded p-3 mb-4">
                    <div className="d-flex align-items-center justify-content-between">
                        <div>
                            <h6 className="mb-1 d-flex align-items-center">
                                <FontAwesomeIcon icon={faUser} className="me-2 text-muted" />
                                {party.name}
                                <Badge bg={party.partyType === 'customer' ? 'success' : 'warning'} className="ms-2">
                                    {party.partyType}
                                </Badge>
                            </h6>
                            <small className="text-muted">
                                Phone: {party.phone || party.phoneNumber}
                            </small>
                        </div>
                        <div className="text-end">
                            <div className="text-muted small">Current Balance</div>
                            <div className={`fw-bold ${(party.currentBalance || party.balance || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                                ₹{Math.abs(party.currentBalance || party.balance || 0).toLocaleString('en-IN', { 
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2 
                                })}
                                <small className="ms-1">
                                    ({(party.currentBalance || party.balance || 0) >= 0 ? 'To Receive' : 'To Pay'})
                                </small>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alerts */}
                {error && (
                    <Alert variant="danger" className="mb-3" dismissible onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert variant="success" className="mb-3">
                        <FontAwesomeIcon icon={faCheck} className="me-2" />
                        {success}
                    </Alert>
                )}

                {/* Payment Form */}
                <Form onSubmit={handleSubmit}>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Amount Paid *</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text>₹</InputGroup.Text>
                                    <Form.Control
                                        ref={amountRef}
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        required
                                        disabled={isLoading}
                                    />
                                </InputGroup>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Payment Date *</Form.Label>
                                <Form.Control
                                    type="date"
                                    name="paymentDate"
                                    value={formData.paymentDate}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isLoading}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>Payment Method *</Form.Label>
                        <div className="d-flex flex-wrap gap-2">
                            {paymentMethods.map((method) => (
                                <Form.Check
                                    key={method.value}
                                    type="radio"
                                    name="paymentMethod"
                                    id={`out_${method.value}`}
                                    value={method.value}
                                    checked={formData.paymentMethod === method.value}
                                    onChange={handleInputChange}
                                    label={
                                        <span>
                                            <FontAwesomeIcon icon={method.icon} className="me-1" />
                                            {method.label}
                                        </span>
                                    }
                                    className="me-3"
                                    disabled={isLoading}
                                />
                            ))}
                        </div>
                    </Form.Group>

                    {/* Method-specific fields */}
                    {formData.paymentMethod === 'cheque' && (
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Cheque Number *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.paymentDetails.chequeNumber || ''}
                                        onChange={(e) => handlePaymentDetailChange('chequeNumber', e.target.value)}
                                        placeholder="Enter cheque number"
                                        required
                                        disabled={isLoading}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Cheque Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={formData.paymentDetails.chequeDate || ''}
                                        onChange={(e) => handlePaymentDetailChange('chequeDate', e.target.value)}
                                        disabled={isLoading}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    )}

                    {formData.paymentMethod === 'bank_transfer' && (
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Bank Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.paymentDetails.bankName || ''}
                                        onChange={(e) => handlePaymentDetailChange('bankName', e.target.value)}
                                        placeholder="Bank name"
                                        disabled={isLoading}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Transaction ID *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.paymentDetails.transactionId || ''}
                                        onChange={(e) => handlePaymentDetailChange('transactionId', e.target.value)}
                                        placeholder="Transaction/UTR number"
                                        required
                                        disabled={isLoading}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    )}

                    {formData.paymentMethod === 'upi' && (
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>UPI ID</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.paymentDetails.upiId || ''}
                                        onChange={(e) => handlePaymentDetailChange('upiId', e.target.value)}
                                        placeholder="example@upi"
                                        disabled={isLoading}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>UPI Transaction ID *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.paymentDetails.upiTransactionId || ''}
                                        onChange={(e) => handlePaymentDetailChange('upiTransactionId', e.target.value)}
                                        placeholder="UPI transaction ID"
                                        required
                                        disabled={isLoading}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    )}

                    {formData.paymentMethod === 'card' && (
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Card Type</Form.Label>
                                    <Form.Select
                                        value={formData.paymentDetails.cardType || ''}
                                        onChange={(e) => handlePaymentDetailChange('cardType', e.target.value)}
                                        disabled={isLoading}
                                    >
                                        <option value="">Select card type</option>
                                        <option value="credit">Credit Card</option>
                                        <option value="debit">Debit Card</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Last 4 Digits</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.paymentDetails.cardLastFour || ''}
                                        onChange={(e) => handlePaymentDetailChange('cardLastFour', e.target.value)}
                                        placeholder="xxxx"
                                        maxLength="4"
                                        disabled={isLoading}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    )}

                    <Form.Group className="mb-3">
                        <Form.Label>Reference</Form.Label>
                        <Form.Control
                            type="text"
                            name="reference"
                            value={formData.reference}
                            onChange={handleInputChange}
                            placeholder="Reference number (optional)"
                            disabled={isLoading}
                        />
                    </Form.Group>

                    <Form.Group className="mb-4">
                        <Form.Label>Notes</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            placeholder="Additional notes about this payment..."
                            disabled={isLoading}
                        />
                    </Form.Group>

                    {/* Action Buttons */}
                    <div className="d-flex gap-2 justify-content-end">
                        <Button
                            variant="outline-secondary"
                            onClick={onHide}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Spinner size="sm" className="me-2" />
                                    Recording...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faCheck} className="me-2" />
                                    Record Payment
                                </>
                            )}
                        </Button>
                    </div>
                </Form>

                {/* Keyboard shortcuts info */}
                <div className="mt-3 text-center">
                    <small className="text-muted">
                        Press <kbd>Ctrl+Enter</kbd> to save or <kbd>Esc</kbd> to cancel
                    </small>
                </div>
            </Modal.Body>
        </Modal>
    );
}

export default PayOut;