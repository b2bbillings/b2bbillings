import React, { useState, useEffect, useRef } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Spinner, Card, Table, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faMoneyBillWave,
    faTimes,
    faExclamationTriangle,
    faInfoCircle,
    faCheckCircle,
    faSave,
    faPlus,
    faFileInvoice,
    faEye,
    faCalendar,
    faRupeeSign
} from '@fortawesome/free-solid-svg-icons';

// Service imports
import paymentService from '../../../services/paymentService';
import bankAccountService from '../../../services/bankAccountService';
import authService from '../../../services/authService';

function PayIn({
    show,
    onHide,
    party,
    onPaymentRecorded,
    currentCompany,
    companyId,
    currentUser
}) {
    // Form data state
    const [formData, setFormData] = useState({
        customerName: '',
        date: new Date().toISOString().split('T')[0],
        employeeName: '',
        totalOutstanding: 0,
        amountReceived: '',
        paymentType: 'advance',
        selectedSaleOrder: '',
        paymentMethod: 'cash',
        selectedBank: '',
        bankDetails: '',
        additionalNotes: ''
    });

    // UI states
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [pendingInvoices, setPendingInvoices] = useState([]);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
    const [availableBanks, setAvailableBanks] = useState([]);
    const [isLoadingBanks, setIsLoadingBanks] = useState(false);

    // Invoice selection state
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    // ✅ NEW: State to control invoice panel visibility
    const [showInvoicePanel, setShowInvoicePanel] = useState(false);

    // Payment methods for dropdown
    const paymentMethods = [
        { value: 'cash', label: 'Cash' },
        { value: 'bank_transfer', label: 'Bank Transfer' },
        { value: 'cheque', label: 'Cheque' },
        { value: 'upi', label: 'UPI' },
        { value: 'card', label: 'Card' }
    ];

    // ✅ MODIFIED: Load pending invoices only when called explicitly
    const loadPendingInvoices = async () => {
        if (!party || !companyId) return;

        try {
            setIsLoadingInvoices(true);

            const response = await paymentService.getPendingInvoicesForPayment(
                companyId,
                party._id || party.id
            );

            if (response.success) {
                const invoices = response.data.invoices ||
                    response.data.salesOrders ||
                    response.data.orders ||
                    [];

                const invoicesWithDue = invoices.filter(invoice => {
                    const totalAmount = parseFloat(
                        invoice.totalAmount ||
                        invoice.amount ||
                        invoice.finalTotal ||
                        0
                    );
                    const paidAmount = parseFloat(
                        invoice.paidAmount ||
                        invoice.amountPaid ||
                        0
                    );
                    const dueAmount = totalAmount - paidAmount;
                    return dueAmount > 0;
                });

                setPendingInvoices(invoicesWithDue);
            } else {
                setPendingInvoices([]);
            }
        } catch (error) {
            console.error('Error loading pending invoices:', error);
            setPendingInvoices([]);
        } finally {
            setIsLoadingInvoices(false);
        }
    };

    // Load available banks from backend
    const loadAvailableBanks = async () => {
        if (!companyId) return;

        try {
            setIsLoadingBanks(true);
            const response = await bankAccountService.getBankAccounts(companyId, {
                active: 'true',
                limit: 100
            });

            if (response.success) {
                const banks = response.banks || response.data?.banks || response.data || [];
                setAvailableBanks(banks);
            } else {
                setAvailableBanks([]);
            }
        } catch (error) {
            setAvailableBanks([]);
        } finally {
            setIsLoadingBanks(false);
        }
    };

    // ✅ ENHANCED: Auto-fill employee information with better fallbacks
    const autoFillEmployeeData = () => {
        try {
            const user = currentUser || authService.getCurrentUser();
            if (user) {
                const employeeName =
                    user.fullName ||
                    user.name ||
                    user.username ||
                    user.displayName ||
                    user.firstName + ' ' + user.lastName ||
                    user.email?.split('@')[0] ||
                    '';

                setFormData(prev => ({
                    ...prev,
                    employeeName: employeeName.trim()
                }));
            }
        } catch (error) {
            console.error('Error auto-filling employee data:', error);
        }
    };

    // ✅ MODIFIED: Initialize form without loading invoices
    useEffect(() => {
        if (show && party) {
            setFormData({
                customerName: party.name,
                date: new Date().toISOString().split('T')[0],
                employeeName: '',
                totalOutstanding: Math.abs(party.currentBalance || party.balance || 0),
                amountReceived: '',
                paymentType: 'advance',
                selectedSaleOrder: '',
                paymentMethod: 'cash',
                selectedBank: '',
                bankDetails: '',
                additionalNotes: ''
            });

            setError('');
            setSuccess('');
            setPendingInvoices([]);
            setAvailableBanks([]);
            setSelectedInvoice(null);
            setShowInvoicePanel(false); // ✅ Hide invoice panel by default

            // Auto-fill employee data
            setTimeout(() => {
                autoFillEmployeeData();
            }, 100);

            // Focus on amount input
            setTimeout(() => {
                const amountInput = document.querySelector('[name="amountReceived"]');
                if (amountInput) amountInput.focus();
            }, 200);
        }
    }, [show, party, companyId, currentUser]);

    // Load banks when payment method changes to 'bank_transfer'
    useEffect(() => {
        if (show && formData.paymentMethod === 'bank_transfer' && companyId) {
            loadAvailableBanks();
        } else {
            setAvailableBanks([]);
            setFormData(prev => ({ ...prev, selectedBank: '', bankDetails: '' }));
        }
    }, [formData.paymentMethod, show, companyId]);

    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    // Handle bank selection
    const handleBankSelect = (e) => {
        const bankId = e.target.value;
        setFormData(prev => ({ ...prev, selectedBank: bankId }));
    };

    // Handle invoice selection
    const handleInvoiceSelection = (invoice) => {
        setSelectedInvoice(invoice);
        setFormData(prev => ({
            ...prev,
            selectedSaleOrder: invoice._id || invoice.id,
            paymentType: 'pending'
        }));

        // Auto-fill amount with due amount
        const totalAmount = parseFloat(invoice.totalAmount || invoice.amount || invoice.finalTotal || 0);
        const paidAmount = parseFloat(invoice.paidAmount || invoice.amountPaid || 0);
        const dueAmount = totalAmount - paidAmount;

        if (dueAmount > 0) {
            setFormData(prev => ({
                ...prev,
                amountReceived: dueAmount.toFixed(2)
            }));
        }
    };

    // ✅ MODIFIED: Handle payment type change with invoice panel control
    const handlePaymentTypeChange = (e) => {
        const paymentType = e.target.value;
        setFormData(prev => ({ ...prev, paymentType }));

        if (paymentType === 'advance') {
            setSelectedInvoice(null);
            setFormData(prev => ({ ...prev, selectedSaleOrder: '', amountReceived: '' }));
            setShowInvoicePanel(false); // ✅ Hide invoice panel
            setPendingInvoices([]); // Clear invoices
        } else if (paymentType === 'pending') {
            setShowInvoicePanel(true); // ✅ Show invoice panel
            loadPendingInvoices(); // ✅ Load invoices only when needed
        }
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validation
        if (!formData.amountReceived || parseFloat(formData.amountReceived) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (formData.paymentType === 'pending' && !formData.selectedSaleOrder) {
            setError('Please select an invoice');
            return;
        }

        if (!formData.employeeName.trim()) {
            setError('Employee name is required');
            return;
        }

        if (formData.paymentMethod === 'bank_transfer' && !formData.selectedBank) {
            setError('Please select a bank account');
            return;
        }

        if (formData.paymentMethod !== 'cash' && formData.paymentMethod !== 'bank_transfer' && !formData.bankDetails.trim()) {
            setError('Please enter payment details');
            return;
        }

        try {
            setIsLoading(true);

            const paymentData = {
                partyId: party._id || party.id,
                partyName: party.name,
                amount: parseFloat(formData.amountReceived),
                paymentMethod: formData.paymentMethod,
                paymentDate: formData.date,
                paymentType: formData.paymentType,
                saleOrderId: formData.selectedSaleOrder || null,
                notes: formData.additionalNotes,
                employeeName: formData.employeeName,
                bankAccountId: formData.selectedBank || null,
                paymentDetails: {
                    bankDetails: formData.bankDetails,
                    paymentMethodDetails: formData.bankDetails
                },
                companyId: companyId
            };

            const response = await paymentService.createPaymentIn(paymentData);

            if (response.success) {
                const amount = parseFloat(formData.amountReceived);
                const methodText = paymentMethods.find(m => m.value === formData.paymentMethod)?.label || formData.paymentMethod;

                setSuccess(`Payment of ₹${amount.toLocaleString('en-IN')} received via ${methodText}!`);

                if (onPaymentRecorded) {
                    onPaymentRecorded({
                        type: 'payment_in',
                        amount: paymentData.amount,
                        paymentMethod: paymentData.paymentMethod,
                        paymentType: paymentData.paymentType,
                        partyName: paymentData.partyName,
                        employeeName: paymentData.employeeName
                    }, party);
                }

                setTimeout(() => {
                    onHide();
                }, 1500);
            } else {
                setError(response.message || 'Failed to record payment');
            }
        } catch (error) {
            console.error('Payment submission error:', error);
            setError(error.message || 'Failed to record payment');
        } finally {
            setIsLoading(false);
        }
    };

    if (!party) return null;

    return (
        <Modal show={show} onHide={onHide} centered size={showInvoicePanel ? "xl" : "lg"} backdrop="static">
            <div style={{
                backgroundColor: '#4A90E2',
                minHeight: '100vh',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: showInvoicePanel ? '1200px' : '700px',
                    display: 'flex',
                    gap: '20px',
                    transition: 'all 0.3s ease' // ✅ Smooth transition
                }}>
                    {/* Left Side - Payment Form */}
                    <Card style={{
                        flex: showInvoicePanel ? '0 0 55%' : '1', // ✅ Dynamic width
                        border: '2px solid #000',
                        borderRadius: '10px',
                        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)',
                        transition: 'all 0.3s ease' // ✅ Smooth transition
                    }}>
                        <Card.Body className="p-4">
                            {/* Header with Close Button */}
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h4 className="fw-bold text-primary mb-0">
                                    <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                                    Payment In - {party.name}
                                </h4>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={onHide}
                                    disabled={isLoading}
                                    className="border-2"
                                    style={{ borderColor: '#000' }}
                                >
                                    <FontAwesomeIcon icon={faTimes} />
                                </Button>
                            </div>

                            {/* Error/Success Alerts */}
                            {error && (
                                <Alert variant="danger" className="mb-3 border-2" style={{ borderColor: '#000' }}>
                                    <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                                    {error}
                                </Alert>
                            )}
                            {success && (
                                <Alert variant="success" className="mb-3 border-2" style={{ borderColor: '#000' }}>
                                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                                    {success}
                                </Alert>
                            )}

                            <Form onSubmit={handleSubmit}>
                                {/* Basic Information */}
                                <Row className="mb-3">
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold text-secondary small">
                                                Customer Name
                                            </Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="customerName"
                                                value={formData.customerName}
                                                className="border-2 bg-light"
                                                style={{ borderColor: '#000' }}
                                                readOnly
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold text-secondary small">
                                                Date <span className="text-danger">*</span>
                                            </Form.Label>
                                            <Form.Control
                                                type="date"
                                                name="date"
                                                value={formData.date}
                                                onChange={handleChange}
                                                className="border-2"
                                                style={{ borderColor: '#000' }}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Row className="mb-3">
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold text-secondary small">
                                                Employee Name <span className="text-danger">*</span>
                                            </Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="employeeName"
                                                value={formData.employeeName}
                                                onChange={handleChange}
                                                className="border-2"
                                                style={{ borderColor: '#000' }}
                                                placeholder="Enter employee name"
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold text-warning small">
                                                Outstanding Balance
                                            </Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={`₹ ${formData.totalOutstanding.toLocaleString('en-IN')}`}
                                                className="border-2 bg-light fw-bold"
                                                style={{ borderColor: '#000', color: '#e74c3c' }}
                                                readOnly
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                {/* Amount and Payment Type */}
                                <Row className="mb-3">
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold text-success small">
                                                Amount Received <span className="text-danger">*</span>
                                            </Form.Label>
                                            <Form.Control
                                                type="number"
                                                name="amountReceived"
                                                value={formData.amountReceived}
                                                onChange={handleChange}
                                                className="border-2 fw-bold"
                                                style={{ borderColor: '#000' }}
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold text-info small">
                                                Payment Type <span className="text-danger">*</span>
                                            </Form.Label>
                                            <Form.Select
                                                name="paymentType"
                                                value={formData.paymentType}
                                                onChange={handlePaymentTypeChange}
                                                className="border-2"
                                                style={{ borderColor: '#000' }}
                                                required
                                            >
                                                <option value="advance">Advance Payment</option>
                                                <option value="pending">Against Invoice</option>
                                            </Form.Select>
                                            <Form.Text className="text-muted">
                                                <small>
                                                    {formData.paymentType === 'advance'
                                                        ? 'Payment without specific invoice'
                                                        : 'Payment against a specific invoice'
                                                    }
                                                </small>
                                            </Form.Text>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                {/* Selected Invoice Display (Conditional) */}
                                {formData.paymentType === 'pending' && (
                                    <Row className="mb-3">
                                        <Col md={12}>
                                            <Form.Group>
                                                <Form.Label className="fw-bold text-warning small">
                                                    Selected Invoice <span className="text-danger">*</span>
                                                </Form.Label>
                                                {selectedInvoice ? (
                                                    <Card className="border-2" style={{ borderColor: '#000' }}>
                                                        <Card.Body className="p-3">
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <div>
                                                                    <h6 className="mb-1 fw-bold text-primary">
                                                                        {selectedInvoice.orderNumber || selectedInvoice.saleNumber}
                                                                    </h6>
                                                                    <small className="text-muted">
                                                                        Due: ₹{(
                                                                            parseFloat(selectedInvoice.totalAmount || selectedInvoice.amount || 0) -
                                                                            parseFloat(selectedInvoice.paidAmount || selectedInvoice.amountPaid || 0)
                                                                        ).toFixed(2)}
                                                                    </small>
                                                                </div>
                                                                <Badge bg="success">Selected</Badge>
                                                            </div>
                                                        </Card.Body>
                                                    </Card>
                                                ) : (
                                                    <Card className="border-2 border-warning">
                                                        <Card.Body className="p-3 text-center">
                                                            <small className="text-muted">Please select an invoice from the right panel</small>
                                                        </Card.Body>
                                                    </Card>
                                                )}
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                )}

                                {/* Payment Method */}
                                <Row className="mb-3">
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold text-primary small">
                                                Payment Method <span className="text-danger">*</span>
                                            </Form.Label>
                                            <Form.Select
                                                name="paymentMethod"
                                                value={formData.paymentMethod}
                                                onChange={handleChange}
                                                className="border-2"
                                                style={{ borderColor: '#000' }}
                                                required
                                            >
                                                {paymentMethods.map((method) => (
                                                    <option key={method.value} value={method.value}>
                                                        {method.label}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        {/* Bank Selection for Bank Transfer */}
                                        {formData.paymentMethod === 'bank_transfer' && (
                                            <Form.Group>
                                                <Form.Label className="fw-bold text-success small">
                                                    Bank Account <span className="text-danger">*</span>
                                                </Form.Label>
                                                {isLoadingBanks ? (
                                                    <div className="text-center p-2 bg-light border rounded">
                                                        <Spinner size="sm" />
                                                    </div>
                                                ) : availableBanks.length > 0 ? (
                                                    <Form.Select
                                                        name="selectedBank"
                                                        value={formData.selectedBank}
                                                        onChange={handleBankSelect}
                                                        className="border-2"
                                                        style={{ borderColor: '#000' }}
                                                        required
                                                    >
                                                        <option value="">Choose bank</option>
                                                        {availableBanks.map((bank) => (
                                                            <option key={bank._id || bank.id} value={bank._id || bank.id}>
                                                                {bank.accountName} - {bank.bankName}
                                                            </option>
                                                        ))}
                                                    </Form.Select>
                                                ) : (
                                                    <Form.Control
                                                        type="text"
                                                        value="No banks available"
                                                        className="border-2 bg-light"
                                                        style={{ borderColor: '#000' }}
                                                        readOnly
                                                    />
                                                )}
                                            </Form.Group>
                                        )}

                                        {/* Payment Details for Other Methods */}
                                        {formData.paymentMethod !== 'cash' && formData.paymentMethod !== 'bank_transfer' && (
                                            <Form.Group>
                                                <Form.Label className="fw-bold text-warning small">
                                                    {formData.paymentMethod === 'cheque' && 'Cheque Number'}
                                                    {formData.paymentMethod === 'upi' && 'UPI Transaction ID'}
                                                    {formData.paymentMethod === 'card' && 'Card Reference'}
                                                    <span className="text-danger"> *</span>
                                                </Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="bankDetails"
                                                    value={formData.bankDetails}
                                                    onChange={handleChange}
                                                    className="border-2"
                                                    style={{ borderColor: '#000' }}
                                                    placeholder="Enter details"
                                                    required
                                                />
                                            </Form.Group>
                                        )}
                                    </Col>
                                </Row>

                                {/* Transaction Reference for Bank Transfer (Optional) */}
                                {formData.paymentMethod === 'bank_transfer' && formData.selectedBank && (
                                    <Row className="mb-3">
                                        <Col md={12}>
                                            <Form.Group>
                                                <Form.Label className="fw-bold text-info small">
                                                    Transaction Reference (Optional)
                                                </Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="bankDetails"
                                                    value={formData.bankDetails}
                                                    onChange={handleChange}
                                                    className="border-2"
                                                    style={{ borderColor: '#000' }}
                                                    placeholder="UTR Number / Transaction ID"
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                )}

                                {/* Additional Notes */}
                                <Row className="mb-4">
                                    <Col md={12}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold text-secondary small">
                                                Additional Notes
                                            </Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={2}
                                                name="additionalNotes"
                                                value={formData.additionalNotes}
                                                onChange={handleChange}
                                                className="border-2"
                                                style={{ borderColor: '#000', resize: 'none' }}
                                                placeholder="Enter any additional notes..."
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                {/* Action Buttons */}
                                <Row>
                                    <Col className="text-center">
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    amountReceived: '',
                                                    selectedSaleOrder: '',
                                                    bankDetails: '',
                                                    additionalNotes: '',
                                                    paymentType: 'advance' // ✅ Reset to advance
                                                }));
                                                setSelectedInvoice(null);
                                                setShowInvoicePanel(false); // ✅ Hide panel
                                                setPendingInvoices([]); // ✅ Clear invoices
                                                setError('');
                                                setSuccess('');
                                            }}
                                            disabled={isLoading}
                                            className="me-3 border-2"
                                            style={{
                                                backgroundColor: '#FFD700',
                                                borderColor: '#000',
                                                color: '#000',
                                                fontWeight: 'bold',
                                                minWidth: '120px'
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faPlus} className="me-2" />
                                            Reset
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isLoading}
                                            className="border-2"
                                            style={{
                                                backgroundColor: '#90EE90',
                                                borderColor: '#000',
                                                color: '#000',
                                                fontWeight: 'bold',
                                                minWidth: '120px'
                                            }}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Spinner size="sm" className="me-2" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <FontAwesomeIcon icon={faSave} className="me-2" />
                                                    Save Payment
                                                </>
                                            )}
                                        </Button>
                                    </Col>
                                </Row>
                            </Form>
                        </Card.Body>
                    </Card>

                    {/* ✅ CONDITIONAL: Right Side - Invoice Panel (Only show when needed) */}
                    {showInvoicePanel && (
                        <Card style={{
                            flex: '0 0 42%',
                            border: '2px solid #000',
                            borderRadius: '10px',
                            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)',
                            backgroundColor: '#ffffff',
                            animation: 'slideInRight 0.3s ease' // ✅ Slide in animation
                        }}>
                            <Card.Header className="bg-primary text-white border-0">
                                <h5 className="mb-0 d-flex align-items-center">
                                    <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                                    Pending Invoices
                                    {pendingInvoices.length > 0 && (
                                        <Badge bg="light" text="dark" className="ms-2">{pendingInvoices.length}</Badge>
                                    )}
                                </h5>
                            </Card.Header>
                            <Card.Body className="p-0" style={{ height: '500px', overflow: 'hidden' }}>
                                {isLoadingInvoices ? (
                                    <div className="d-flex flex-column align-items-center justify-content-center h-100">
                                        <Spinner animation="border" variant="primary" />
                                        <p className="mt-3 text-muted">Loading invoices...</p>
                                    </div>
                                ) : pendingInvoices.length > 0 ? (
                                    <div style={{ height: '100%', overflowY: 'auto' }}>
                                        <Table hover responsive className="mb-0">
                                            <thead className="bg-light sticky-top">
                                                <tr>
                                                    <th className="border-0 fw-bold small">Invoice</th>
                                                    <th className="border-0 fw-bold small">Date</th>
                                                    <th className="border-0 fw-bold small text-end">Due</th>
                                                    <th className="border-0 fw-bold small text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pendingInvoices.map((invoice, index) => {
                                                    const totalAmount = parseFloat(invoice.totalAmount || invoice.amount || invoice.finalTotal || 0);
                                                    const paidAmount = parseFloat(invoice.paidAmount || invoice.amountPaid || 0);
                                                    const dueAmount = totalAmount - paidAmount;
                                                    const isSelected = selectedInvoice && (selectedInvoice._id || selectedInvoice.id) === (invoice._id || invoice.id);

                                                    return (
                                                        <tr key={invoice._id || invoice.id || index} className={isSelected ? 'table-primary' : ''}>
                                                            <td className="fw-semibold small">
                                                                {invoice.orderNumber || invoice.saleNumber || `INV-${index + 1}`}
                                                                {isSelected && <Badge bg="success" className="ms-2 small">Selected</Badge>}
                                                            </td>
                                                            <td className="small">
                                                                <FontAwesomeIcon icon={faCalendar} className="me-1 text-muted" />
                                                                {invoice.orderDate ? new Date(invoice.orderDate).toLocaleDateString('en-IN') : 'N/A'}
                                                            </td>
                                                            <td className="text-end fw-bold text-danger small">
                                                                <FontAwesomeIcon icon={faRupeeSign} className="me-1" />
                                                                {dueAmount.toLocaleString('en-IN')}
                                                            </td>
                                                            <td className="text-center">
                                                                <Button
                                                                    variant={isSelected ? "success" : "outline-primary"}
                                                                    size="sm"
                                                                    onClick={() => handleInvoiceSelection(invoice)}
                                                                    className="px-2 small"
                                                                >
                                                                    {isSelected ? (
                                                                        <>
                                                                            <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                                                                            Selected
                                                                        </>
                                                                    ) : (
                                                                        'Select'
                                                                    )}
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column align-items-center justify-content-center h-100">
                                        <FontAwesomeIcon icon={faInfoCircle} className="fs-1 text-muted mb-3" />
                                        <h6 className="text-muted">No Pending Invoices</h6>
                                        <p className="text-muted small text-center px-3">
                                            All invoices are fully paid.<br />
                                            You can make an advance payment.
                                        </p>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    )}
                </div>
            </div>

            {/* ✅ CSS for smooth animations */}
            <style jsx>{`
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </Modal>
    );
}

export default PayIn;