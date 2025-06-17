// Frontend/src/components/Home/Party/PayIn.jsx
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
    faRupeeSign,
    faReceipt,
    faHistory,
    faRefresh
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
        additionalNotes: '',
        reference: '',
        invoiceAllocations: []
    });

    // UI states
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [pendingInvoices, setPendingInvoices] = useState([]);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
    const [availableBanks, setAvailableBanks] = useState([]);
    const [isLoadingBanks, setIsLoadingBanks] = useState(false);

    // Invoice selection state
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showInvoicePanel, setShowInvoicePanel] = useState(false);

    // Payment methods for dropdown
    const paymentMethods = [
        { value: 'cash', label: 'Cash' },
        { value: 'bank_transfer', label: 'Bank Transfer' },
        { value: 'cheque', label: 'Cheque' },
        { value: 'upi', label: 'UPI' },
        { value: 'card', label: 'Card' }
    ];

    // **ENHANCED: Load pending invoices with better error handling and fresh data**
    const loadPendingInvoices = async (forceRefresh = false) => {
        if (!party || !companyId) return;

        try {
            setIsLoadingInvoices(true);
            console.log('📋 Loading pending invoices for party:', party.name, forceRefresh ? '(forced refresh)' : '');

            const response = await paymentService.getPendingInvoicesForPayment(
                companyId,
                party._id || party.id
            );

            if (response.success) {
                const invoices = response.data.invoices ||
                    response.data.salesOrders ||
                    response.data.orders ||
                    [];

                // **ENHANCED: Use updated due amounts from the response**
                const invoicesWithDue = invoices.filter(invoice => {
                    const dueAmount = parseFloat(invoice.dueAmount || 0);
                    const totalAmount = parseFloat(
                        invoice.totalAmount ||
                        invoice.amount ||
                        invoice.finalTotal ||
                        0
                    );

                    console.log(`🧾 Invoice ${invoice.invoiceNumber || invoice.orderNumber}: Due=₹${dueAmount}, Total=₹${totalAmount}`);

                    return dueAmount > 0 && totalAmount > 0;
                });

                console.log(`📊 Found ${invoicesWithDue.length} invoices with pending amounts`);
                setPendingInvoices(invoicesWithDue);

                // **NEW: Update the selected invoice if it still exists but with updated amounts**
                if (selectedInvoice && invoicesWithDue.length > 0) {
                    const updatedSelectedInvoice = invoicesWithDue.find(inv =>
                        (inv._id || inv.id) === (selectedInvoice._id || selectedInvoice.id)
                    );

                    if (updatedSelectedInvoice) {
                        console.log('🔄 Updating selected invoice with fresh data');
                        setSelectedInvoice(updatedSelectedInvoice);

                        // Update the form with new due amount
                        const newDueAmount = parseFloat(updatedSelectedInvoice.dueAmount || 0);
                        if (newDueAmount > 0) {
                            setFormData(prev => ({
                                ...prev,
                                amountReceived: newDueAmount.toFixed(2)
                            }));
                        }
                    } else {
                        // Invoice is fully paid, clear selection
                        console.log('✅ Selected invoice is now fully paid, clearing selection');
                        setSelectedInvoice(null);
                        setFormData(prev => ({
                            ...prev,
                            selectedSaleOrder: '',
                            amountReceived: ''
                        }));
                    }
                }

            } else {
                console.log('⚠️ No pending invoices found:', response.message);
                setPendingInvoices([]);
            }
        } catch (error) {
            console.error('❌ Error loading pending invoices:', error);
            setPendingInvoices([]);
            if (!forceRefresh) {
                setError('Failed to load pending invoices');
            }
        } finally {
            setIsLoadingInvoices(false);
        }
    };

    // **NEW: Refresh invoice data after payment**
    const refreshInvoiceData = async () => {
        if (formData.paymentType === 'pending' && party && companyId) {
            console.log('🔄 Refreshing invoice data after payment...');
            await loadPendingInvoices(true);
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
            console.error('Error loading banks:', error);
            setAvailableBanks([]);
        } finally {
            setIsLoadingBanks(false);
        }
    };

    // Auto-fill employee information
    const autoFillEmployeeData = () => {
        try {
            const user = currentUser || authService.getCurrentUser();
            if (user) {
                const employeeName =
                    user.fullName ||
                    user.name ||
                    user.username ||
                    user.displayName ||
                    (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : '') ||
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

    // Initialize form when modal opens
    useEffect(() => {
        if (show && party) {
            console.log('🔄 Initializing PayIn form for party:', party.name);

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
                additionalNotes: '',
                reference: '',
                invoiceAllocations: []
            });

            setError('');
            setSuccess('');
            setPendingInvoices([]);
            setAvailableBanks([]);
            setSelectedInvoice(null);
            setShowInvoicePanel(false);

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

    // Load banks when payment method changes to bank_transfer
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

    // **ENHANCED: Handle invoice selection with updated due amounts**
    const handleInvoiceSelection = (invoice) => {
        console.log('📋 Invoice selected:', invoice.orderNumber || invoice.saleNumber);

        setSelectedInvoice(invoice);
        setFormData(prev => ({
            ...prev,
            selectedSaleOrder: invoice._id || invoice.id,
            paymentType: 'pending'
        }));

        // Auto-fill amount with current due amount
        const dueAmount = parseFloat(invoice.dueAmount || 0);
        if (dueAmount > 0) {
            setFormData(prev => ({
                ...prev,
                amountReceived: dueAmount.toFixed(2)
            }));
        }
    };

    // Handle payment type change
    const handlePaymentTypeChange = (e) => {
        const paymentType = e.target.value;
        console.log('💳 Payment type changed to:', paymentType);

        setFormData(prev => ({ ...prev, paymentType }));

        if (paymentType === 'advance') {
            setSelectedInvoice(null);
            setFormData(prev => ({
                ...prev,
                selectedSaleOrder: '',
                amountReceived: '',
                invoiceAllocations: []
            }));
            setShowInvoicePanel(false);
            setPendingInvoices([]);
        } else if (paymentType === 'pending') {
            setShowInvoicePanel(true);
            loadPendingInvoices();
        }
    };

    // **ENHANCED: Handle form submission with better data handling**
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        setSuccess('');

        try {
            console.log('💰 Creating PayIn with data:', formData);

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

            // **ENHANCED: Prepare payment data with correct structure**
            const paymentData = {
                companyId: companyId,
                partyId: party._id || party.id,
                party: party._id || party.id, // Backend expects this field
                partyName: party.name,
                type: 'in', // Backend expects 'in' or 'out'
                amount: parseFloat(formData.amountReceived),
                paymentMethod: formData.paymentMethod,
                paymentDate: formData.date,
                paymentType: formData.paymentType,
                reference: formData.reference,
                notes: formData.additionalNotes,
                employeeName: formData.employeeName,
                bankAccountId: formData.selectedBank,
                bankAccount: formData.selectedBank,
                saleOrderId: formData.selectedSaleOrder,
                invoiceId: formData.selectedSaleOrder, // Some backends expect this
                invoiceAllocations: formData.invoiceAllocations,
                status: 'completed'
            };

            console.log('📤 Submitting payment data:', paymentData);

            const response = await paymentService.createPaymentIn(paymentData);

            if (response.success) {
                const { details, data } = response;

                // **ENHANCED: Show detailed success message with invoice allocation info**
                let successMsg = `✅ Payment of ₹${parseFloat(formData.amountReceived).toLocaleString()} recorded successfully!`;

                if (details && details.invoicesUpdated > 0) {
                    successMsg += `\n\n📋 Updated ${details.invoicesUpdated} invoice(s):`;
                    details.invoiceList?.forEach(allocation => {
                        successMsg += `\n• ${allocation.invoiceNumber}: ₹${allocation.allocatedAmount.toLocaleString()}`;
                    });

                    if (details.remainingAmount > 0) {
                        successMsg += `\n\n💰 Remaining amount: ₹${details.remainingAmount.toLocaleString()} (credited to account)`;
                    }
                } else if (formData.paymentType === 'advance') {
                    successMsg += `\n\n💰 Amount credited to customer account as advance payment.`;
                }

                // Show party balance update if available
                if (data && data.partyBalance !== undefined) {
                    successMsg += `\n\n📊 Updated party balance: ₹${Math.abs(data.partyBalance).toLocaleString()}`;
                }

                setSuccess(successMsg);

                // **NEW: Refresh invoice data to show updated amounts**
                setTimeout(async () => {
                    await refreshInvoiceData();
                }, 500);

                // Reset form
                setFormData({
                    customerName: party.name,
                    date: new Date().toISOString().split('T')[0],
                    employeeName: formData.employeeName, // Keep employee name
                    totalOutstanding: Math.abs(party.currentBalance || party.balance || 0),
                    amountReceived: '',
                    paymentType: 'advance',
                    selectedSaleOrder: '',
                    paymentMethod: 'cash',
                    selectedBank: '',
                    bankDetails: '',
                    additionalNotes: '',
                    reference: '',
                    invoiceAllocations: []
                });

                setSelectedInvoice(null);
                setPendingInvoices([]);
                setShowInvoicePanel(false);

                // Call parent callback with enhanced data
                if (onPaymentRecorded) {
                    onPaymentRecorded({
                        ...data,
                        type: 'payment_in',
                        partyId: party._id || party.id,
                        partyName: party.name,
                        allocations: details?.invoiceList || [],
                        invoicesUpdated: details?.invoicesUpdated || 0,
                        remainingAmount: details?.remainingAmount || 0
                    });
                }

                // Auto-close after delay
                setTimeout(() => {
                    onHide();
                }, 3000);

            } else {
                setError(response.message || 'Failed to record payment');
            }

        } catch (error) {
            console.error('❌ PayIn Error:', error);
            setError(error.message || 'Failed to record payment. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reset form function
    const resetForm = () => {
        setFormData(prev => ({
            ...prev,
            amountReceived: '',
            selectedSaleOrder: '',
            bankDetails: '',
            additionalNotes: '',
            reference: '',
            paymentType: 'advance',
            invoiceAllocations: []
        }));
        setSelectedInvoice(null);
        setShowInvoicePanel(false);
        setPendingInvoices([]);
        setError('');
        setSuccess('');
    };

    // **NEW: Manual refresh function for invoices**
    const handleRefreshInvoices = () => {
        if (formData.paymentType === 'pending') {
            loadPendingInvoices(true);
        }
    };

    if (!party) return null;

    return (
        <Modal
            show={show}
            onHide={onHide}
            centered
            size={showInvoicePanel ? "xl" : "lg"}
            backdrop="static"
            className="payment-modal"
        >
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title className="fw-bold">
                    <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                    Payment In - {party.name}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-0">
                <div className="d-flex" style={{ minHeight: '500px' }}>
                    {/* Left Side - Payment Form */}
                    <div
                        className="p-4 bg-white"
                        style={{
                            flex: showInvoicePanel ? '0 0 55%' : '1',
                            borderRight: showInvoicePanel ? '1px solid #dee2e6' : 'none'
                        }}
                    >
                        {/* Error/Success Alerts */}
                        {error && (
                            <Alert variant="danger" className="mb-3">
                                <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                                {error}
                            </Alert>
                        )}
                        {success && (
                            <Alert variant="success" className="mb-3">
                                <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                                <div style={{ whiteSpace: 'pre-line' }}>{success}</div>
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
                                            className="bg-light"
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
                                            className="bg-light fw-bold text-danger"
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
                                            className="fw-bold"
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
                                            required
                                        >
                                            <option value="advance">Advance Payment</option>
                                            <option value="pending">Against Invoice</option>
                                        </Form.Select>
                                        <Form.Text className="text-muted">
                                            <small>
                                                {formData.paymentType === 'advance'
                                                    ? 'Payment will be auto-allocated to pending invoices'
                                                    : 'Payment against a specific invoice'
                                                }
                                            </small>
                                        </Form.Text>
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* Selected Invoice Display */}
                            {formData.paymentType === 'pending' && (
                                <Row className="mb-3">
                                    <Col md={12}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold text-warning small">
                                                Selected Invoice <span className="text-danger">*</span>
                                            </Form.Label>
                                            {selectedInvoice ? (
                                                <Card className="border-success">
                                                    <Card.Body className="p-3">
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <div>
                                                                <h6 className="mb-1 fw-bold text-primary">
                                                                    <FontAwesomeIcon icon={faReceipt} className="me-2" />
                                                                    {selectedInvoice.orderNumber || selectedInvoice.saleNumber}
                                                                </h6>
                                                                <small className="text-muted">
                                                                    Due: ₹{parseFloat(selectedInvoice.dueAmount || 0).toLocaleString('en-IN')}
                                                                </small>
                                                            </div>
                                                            <Badge bg="success">
                                                                <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                                                                Selected
                                                            </Badge>
                                                        </div>
                                                    </Card.Body>
                                                </Card>
                                            ) : (
                                                <Card className="border-warning">
                                                    <Card.Body className="p-3 text-center">
                                                        <FontAwesomeIcon icon={faInfoCircle} className="me-2 text-warning" />
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
                                                    className="bg-light"
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
                                                placeholder="Enter details"
                                                required
                                            />
                                        </Form.Group>
                                    )}
                                </Col>
                            </Row>

                            {/* Transaction Reference for Bank Transfer */}
                            {formData.paymentMethod === 'bank_transfer' && formData.selectedBank && (
                                <Row className="mb-3">
                                    <Col md={12}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold text-info small">
                                                Transaction Reference (Optional)
                                            </Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="reference"
                                                value={formData.reference}
                                                onChange={handleChange}
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
                                            style={{ resize: 'none' }}
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
                                        onClick={resetForm}
                                        disabled={isSubmitting}
                                        variant="outline-warning"
                                        className="me-3"
                                        style={{ minWidth: '120px' }}
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="me-2" />
                                        Reset
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        variant="success"
                                        style={{ minWidth: '120px' }}
                                    >
                                        {isSubmitting ? (
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
                    </div>

                    {/* Right Side - Invoice Panel */}
                    {showInvoicePanel && (
                        <div
                            className="bg-light border-start"
                            style={{
                                flex: '0 0 45%',
                                maxHeight: '600px',
                                overflowY: 'auto'
                            }}
                        >
                            <div className="p-3 bg-primary text-white d-flex justify-content-between align-items-center">
                                <h6 className="mb-0 d-flex align-items-center">
                                    <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                                    Pending Invoices
                                    {pendingInvoices.length > 0 && (
                                        <Badge bg="light" text="dark" className="ms-2">{pendingInvoices.length}</Badge>
                                    )}
                                </h6>
                                {/* **NEW: Refresh button** */}
                                <Button
                                    variant="light"
                                    size="sm"
                                    onClick={handleRefreshInvoices}
                                    disabled={isLoadingInvoices}
                                    title="Refresh invoice list"
                                >
                                    <FontAwesomeIcon
                                        icon={faRefresh}
                                        className={isLoadingInvoices ? "fa-spin" : ""}
                                    />
                                </Button>
                            </div>

                            <div className="p-3">
                                {isLoadingInvoices ? (
                                    <div className="text-center py-4">
                                        <Spinner animation="border" variant="primary" />
                                        <p className="mt-3 text-muted">Loading invoices...</p>
                                    </div>
                                ) : pendingInvoices.length > 0 ? (
                                    <div>
                                        {pendingInvoices.map((invoice, index) => {
                                            const dueAmount = parseFloat(invoice.dueAmount || 0);
                                            const isSelected = selectedInvoice && (selectedInvoice._id || selectedInvoice.id) === (invoice._id || invoice.id);

                                            return (
                                                <Card
                                                    key={invoice._id || invoice.id || index}
                                                    className={`mb-2 ${isSelected ? 'border-primary' : 'border-light'}`}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => handleInvoiceSelection(invoice)}
                                                >
                                                    <Card.Body className="p-3">
                                                        <div className="d-flex justify-content-between align-items-start">
                                                            <div className="flex-grow-1">
                                                                <h6 className="mb-1 fw-bold">
                                                                    {invoice.orderNumber || invoice.saleNumber || invoice.invoiceNumber || `INV-${index + 1}`}
                                                                    {isSelected && (
                                                                        <Badge bg="success" className="ms-2 small">Selected</Badge>
                                                                    )}
                                                                </h6>
                                                                <div className="small text-muted mb-2">
                                                                    <FontAwesomeIcon icon={faCalendar} className="me-1" />
                                                                    {invoice.orderDate || invoice.invoiceDate ?
                                                                        new Date(invoice.orderDate || invoice.invoiceDate).toLocaleDateString('en-IN') :
                                                                        'N/A'
                                                                    }
                                                                </div>
                                                                <div className="fw-bold text-danger">
                                                                    <FontAwesomeIcon icon={faRupeeSign} className="me-1" />
                                                                    Due: ₹{dueAmount.toLocaleString('en-IN')}
                                                                </div>
                                                                {/* **NEW: Show payment status** */}
                                                                <div className="mt-1">
                                                                    <Badge
                                                                        bg={invoice.paymentStatus === 'paid' ? 'success' :
                                                                            invoice.paymentStatus === 'partial' ? 'warning' : 'danger'}
                                                                        className="small"
                                                                    >
                                                                        {invoice.paymentStatus || 'pending'}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant={isSelected ? "success" : "outline-primary"}
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleInvoiceSelection(invoice);
                                                                }}
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
                                                        </div>
                                                    </Card.Body>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <FontAwesomeIcon icon={faInfoCircle} className="fs-1 text-muted mb-3" />
                                        <h6 className="text-muted">No Pending Invoices</h6>
                                        <p className="text-muted small">
                                            All invoices are fully paid.<br />
                                            You can make an advance payment instead.
                                        </p>
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, paymentType: 'advance' }));
                                                setShowInvoicePanel(false);
                                            }}
                                        >
                                            Switch to Advance Payment
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Modal.Body>
        </Modal>
    );
}

export default PayIn;