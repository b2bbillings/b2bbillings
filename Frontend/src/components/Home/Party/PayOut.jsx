import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Spinner, Card, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faMoneyBillWave,
    faExclamationTriangle,
    faInfoCircle,
    faCheckCircle,
    faSave,
    faPlus,
    faArrowUp,
    faFileInvoice,
    faCalendar,
    faRupeeSign,
    faReceipt,
    faRefresh,
    faUniversity
} from '@fortawesome/free-solid-svg-icons';

import paymentService from '../../../services/paymentService';
import bankAccountService from '../../../services/bankAccountService';
import authService from '../../../services/authService';

function PayOut({
    show,
    onHide,
    party,
    onPaymentRecorded,
    currentCompany,
    companyId,
    currentUser
}) {
    const [formData, setFormData] = useState({
        supplierName: '',
        date: new Date().toISOString().split('T')[0],
        clearingDate: '',
        employeeName: '',
        totalOutstanding: 0,
        amountPaid: '',
        paymentType: 'advance',
        selectedPurchaseInvoice: '',
        paymentMethod: 'cash',
        selectedBank: '',
        bankDetails: '',
        additionalNotes: '',
        reference: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [pendingInvoices, setPendingInvoices] = useState([]);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
    const [availableBanks, setAvailableBanks] = useState([]);
    const [isLoadingBanks, setIsLoadingBanks] = useState(false);
    const [selectedBankDetails, setSelectedBankDetails] = useState(null);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showInvoicePanel, setShowInvoicePanel] = useState(false);

    const paymentMethods = [
        { value: 'cash', label: 'Cash' },
        { value: 'bank_transfer', label: 'Bank Transfer' },
        { value: 'cheque', label: 'Cheque' },
        { value: 'upi', label: 'UPI' },
        { value: 'card', label: 'Card' }
    ];

    const loadPendingInvoices = async (forceRefresh = false) => {
        if (!party || !companyId) return;

        try {
            setIsLoadingInvoices(true);
            const response = await paymentService.getPendingPurchaseInvoicesForPayment(
                companyId,
                party._id || party.id
            );

            if (response.success) {
                const invoices = response.data.purchaseInvoices ||
                    response.data.invoices ||
                    response.data.data ||
                    [];

                const invoicesWithDue = invoices.filter(invoice => {
                    const totalAmount = parseFloat(
                        invoice.totals?.finalTotal ||
                        invoice.totalAmount ||
                        invoice.amount ||
                        0
                    );
                    const paidAmount = parseFloat(
                        invoice.payment?.paidAmount ||
                        invoice.paidAmount ||
                        0
                    );
                    const dueAmount = totalAmount - paidAmount;
                    return dueAmount > 0.01;
                });

                setPendingInvoices(invoicesWithDue);

                if (selectedInvoice && invoicesWithDue.length > 0) {
                    const updatedSelectedInvoice = invoicesWithDue.find(invoice =>
                        (invoice._id || invoice.id) === (selectedInvoice._id || selectedInvoice.id)
                    );

                    if (updatedSelectedInvoice) {
                        setSelectedInvoice(updatedSelectedInvoice);

                        const totalAmount = parseFloat(
                            updatedSelectedInvoice.totals?.finalTotal ||
                            updatedSelectedInvoice.totalAmount ||
                            updatedSelectedInvoice.amount ||
                            0
                        );
                        const paidAmount = parseFloat(
                            updatedSelectedInvoice.payment?.paidAmount ||
                            updatedSelectedInvoice.paidAmount ||
                            0
                        );
                        const dueAmount = totalAmount - paidAmount;

                        if (dueAmount > 0) {
                            setFormData(prev => ({
                                ...prev,
                                amountPaid: dueAmount.toFixed(2)
                            }));
                        }
                    } else {
                        setSelectedInvoice(null);
                        setFormData(prev => ({
                            ...prev,
                            selectedPurchaseInvoice: '',
                            amountPaid: ''
                        }));
                    }
                }
            } else {
                setPendingInvoices([]);
            }
        } catch (error) {
            setPendingInvoices([]);
            if (!forceRefresh) {
                setError('Failed to load pending invoices');
            }
        } finally {
            setIsLoadingInvoices(false);
        }
    };

    const refreshInvoiceData = async () => {
        if (formData.paymentType === 'pending' && party && companyId) {
            await loadPendingInvoices(true);
        }
    };

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

    useEffect(() => {
        if (show && party) {
            setFormData({
                supplierName: party.name,
                date: new Date().toISOString().split('T')[0],
                clearingDate: '',
                employeeName: '',
                totalOutstanding: Math.abs(party.currentBalance || party.balance || 0),
                amountPaid: '',
                paymentType: 'advance',
                selectedPurchaseInvoice: '',
                paymentMethod: 'cash',
                selectedBank: '',
                bankDetails: '',
                additionalNotes: '',
                reference: ''
            });

            setError('');
            setSuccess('');
            setPendingInvoices([]);
            setAvailableBanks([]);
            setSelectedInvoice(null);
            setShowInvoicePanel(false);
            setSelectedBankDetails(null);

            setTimeout(() => {
                autoFillEmployeeData();
            }, 100);

            setTimeout(() => {
                const amountInput = document.querySelector('[name="amountPaid"]');
                if (amountInput) amountInput.focus();
            }, 200);
        }
    }, [show, party, companyId, currentUser]);

    useEffect(() => {
        if (show && formData.paymentMethod === 'bank_transfer' && companyId) {
            loadAvailableBanks();
        } else {
            setAvailableBanks([]);
            setSelectedBankDetails(null);
            setFormData(prev => ({ ...prev, selectedBank: '', bankDetails: '' }));
        }
    }, [formData.paymentMethod, show, companyId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const handleBankSelect = (e) => {
        const bankId = e.target.value;
        setFormData(prev => ({ ...prev, selectedBank: bankId }));

        if (bankId && availableBanks.length > 0) {
            const selectedBank = availableBanks.find(bank => (bank._id || bank.id) === bankId);
            if (selectedBank) {
                setSelectedBankDetails(selectedBank);
            }
        } else {
            setSelectedBankDetails(null);
        }
    };

    const handleInvoiceSelection = (invoice) => {
        setSelectedInvoice(invoice);
        setFormData(prev => ({
            ...prev,
            selectedPurchaseInvoice: invoice._id || invoice.id,
            paymentType: 'pending'
        }));

        const totalAmount = parseFloat(
            invoice.totals?.finalTotal ||
            invoice.totalAmount ||
            invoice.amount ||
            0
        );
        const paidAmount = parseFloat(
            invoice.payment?.paidAmount ||
            invoice.paidAmount ||
            0
        );
        const dueAmount = totalAmount - paidAmount;

        if (dueAmount > 0) {
            setFormData(prev => ({
                ...prev,
                amountPaid: dueAmount.toFixed(2)
            }));
        }
    };

    const handlePaymentTypeChange = (e) => {
        const paymentType = e.target.value;
        setFormData(prev => ({ ...prev, paymentType }));

        if (paymentType === 'advance') {
            setSelectedInvoice(null);
            setFormData(prev => ({
                ...prev,
                selectedPurchaseInvoice: '',
                amountPaid: ''
            }));
            setShowInvoicePanel(false);
            setPendingInvoices([]);
        } else if (paymentType === 'pending') {
            setShowInvoicePanel(true);
            loadPendingInvoices();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        setSuccess('');

        try {
            if (!formData.amountPaid || parseFloat(formData.amountPaid) <= 0) {
                setError('Please enter a valid amount');
                return;
            }

            if (formData.paymentType === 'pending' && !formData.selectedPurchaseInvoice) {
                setError('Please select a purchase invoice');
                return;
            }

            if (!formData.employeeName.trim()) {
                setError('Employee name is required');
                return;
            }

            if (formData.paymentMethod !== 'cash' && !formData.selectedBank) {
                setError('Please select a bank account for non-cash payments');
                return;
            }

            if (formData.paymentMethod !== 'cash' && formData.paymentMethod !== 'bank_transfer' && !formData.bankDetails.trim()) {
                setError('Please enter payment details');
                return;
            }

            if (formData.paymentMethod === 'cheque' && !formData.clearingDate) {
                setError('Clearing date is required for cheque payments');
                return;
            }

            const paymentData = {
                companyId: companyId,
                partyId: party._id || party.id,
                party: party._id || party.id,
                partyName: party.name,
                type: 'out',
                amount: parseFloat(formData.amountPaid),
                paymentMethod: formData.paymentMethod,
                paymentDate: formData.date,
                clearingDate: formData.clearingDate || null,
                paymentType: formData.paymentType,
                reference: formData.reference,
                notes: formData.additionalNotes,
                employeeName: formData.employeeName,
                status: 'completed',
                ...(formData.selectedBank && {
                    bankAccountId: formData.selectedBank,
                    bankAccount: formData.selectedBank
                }),
                ...(formData.selectedPurchaseInvoice && {
                    purchaseInvoiceId: formData.selectedPurchaseInvoice,
                    invoiceId: formData.selectedPurchaseInvoice
                })
            };

            if (formData.paymentType === 'pending' && selectedInvoice) {
                const selectedInvoiceData = {
                    _id: selectedInvoice._id || selectedInvoice.id,
                    invoiceNumber: selectedInvoice.invoiceNumber || selectedInvoice.purchaseNumber,
                    dueAmount: parseFloat(
                        (selectedInvoice.totals?.finalTotal || selectedInvoice.totalAmount || selectedInvoice.amount || 0) -
                        (selectedInvoice.payment?.paidAmount || selectedInvoice.paidAmount || 0)
                    ),
                    selected: true,
                    isSelected: true,
                    allocatedAmount: parseFloat(formData.amountPaid)
                };

                paymentData.selectedPurchaseInvoices = [selectedInvoiceData];
                paymentData.purchaseInvoiceAllocations = [{
                    purchaseInvoiceId: selectedInvoiceData._id,
                    invoiceNumber: selectedInvoiceData.invoiceNumber,
                    allocatedAmount: selectedInvoiceData.allocatedAmount
                }];
            }

            const response = await paymentService.createPaymentOut(paymentData);

            if (response.success) {
                const { details, data } = response;

                let successMsg = `✅ Payment of ₹${parseFloat(formData.amountPaid).toLocaleString()} made successfully!`;
                successMsg += `\n• Payment Number: ${data.paymentNumber}`;

                if (data.bankTransaction) {
                    successMsg += `\n\n🏦 Bank Transaction Created:`;
                    successMsg += `\n• Transaction #: ${data.bankTransaction.transactionNumber}`;
                    successMsg += `\n• Bank: ${data.bankTransaction.bankName}`;
                    successMsg += `\n• Amount: -₹${parseFloat(formData.amountPaid).toLocaleString()} (Debit)`;
                    successMsg += `\n• New Balance: ₹${data.bankTransaction.balance?.toLocaleString() || 'N/A'}`;
                    if (formData.reference) {
                        successMsg += `\n• Reference: ${formData.reference}`;
                    }
                } else if (formData.paymentMethod === 'cash') {
                    successMsg += `\n\n💵 Cash Payment - No bank transaction needed`;
                }

                if (details && details.invoicesUpdated > 0) {
                    successMsg += `\n\n📋 Invoice Allocations:`;
                    details.invoiceList?.forEach(allocation => {
                        successMsg += `\n• ${allocation.invoiceNumber}: ₹${allocation.allocatedAmount.toLocaleString()} (${allocation.paymentStatus})`;
                    });

                    if (details.remainingAmount > 0) {
                        successMsg += `\n\n💰 Advance Amount: ₹${details.remainingAmount.toLocaleString()}`;
                    }
                } else if (formData.paymentType === 'advance') {
                    successMsg += `\n\n💰 Advance payment debited from supplier account`;
                }

                if (data && data.partyBalance !== undefined) {
                    const balanceStatus = data.partyBalance >= 0 ? 'Credit' : 'Debit';
                    successMsg += `\n\n📊 Supplier Balance: ₹${Math.abs(data.partyBalance).toLocaleString()} ${balanceStatus}`;
                }

                setSuccess(successMsg);

                setTimeout(async () => {
                    await refreshInvoiceData();
                }, 500);

                setFormData({
                    supplierName: party.name,
                    date: new Date().toISOString().split('T')[0],
                    clearingDate: '',
                    employeeName: formData.employeeName,
                    totalOutstanding: Math.abs(party.currentBalance || party.balance || 0),
                    amountPaid: '',
                    paymentType: 'advance',
                    selectedPurchaseInvoice: '',
                    paymentMethod: 'cash',
                    selectedBank: '',
                    bankDetails: '',
                    additionalNotes: '',
                    reference: ''
                });

                setSelectedInvoice(null);
                setPendingInvoices([]);
                setShowInvoicePanel(false);
                setSelectedBankDetails(null);

                if (onPaymentRecorded) {
                    onPaymentRecorded({
                        ...data,
                        type: 'payment_out',
                        partyId: party._id || party.id,
                        partyName: party.name,
                        allocations: details?.invoiceList || [],
                        invoicesUpdated: details?.invoicesUpdated || 0,
                        remainingAmount: details?.remainingAmount || 0,
                        bankTransactionCreated: !!data.bankTransaction,
                        bankTransaction: data.bankTransaction,
                        bankAccount: data.bankAccount,
                        paymentMethod: formData.paymentMethod
                    });
                }

                setTimeout(() => {
                    onHide();
                }, 3000);

            } else {
                setError(response.message || 'Failed to record payment');
            }
        } catch (error) {
            setError(error.message || 'Failed to record payment. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData(prev => ({
            ...prev,
            amountPaid: '',
            selectedPurchaseInvoice: '',
            bankDetails: '',
            additionalNotes: '',
            reference: '',
            clearingDate: '',
            paymentType: 'advance'
        }));
        setSelectedInvoice(null);
        setShowInvoicePanel(false);
        setPendingInvoices([]);
        setSelectedBankDetails(null);
        setError('');
        setSuccess('');
    };

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
            <Modal.Header closeButton style={{ backgroundColor: '#6f42c1', color: 'white' }}>
                <Modal.Title className="fw-bold">
                    <FontAwesomeIcon icon={faArrowUp} className="me-2" />
                    Payment Out - {party.name}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-0">
                <div className="d-flex" style={{ minHeight: '500px' }}>
                    <div
                        className="p-4 bg-white"
                        style={{
                            flex: showInvoicePanel ? '0 0 55%' : '1',
                            borderRight: showInvoicePanel ? '1px solid #dee2e6' : 'none'
                        }}
                    >
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
                            <Row className="mb-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-secondary small">
                                            Supplier Name
                                        </Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="supplierName"
                                            value={formData.supplierName}
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

                            <Row className="mb-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-danger small">
                                            Amount Paid <span className="text-danger">*</span>
                                        </Form.Label>
                                        <Form.Control
                                            type="number"
                                            name="amountPaid"
                                            value={formData.amountPaid}
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

                            {formData.paymentType === 'pending' && (
                                <Row className="mb-3">
                                    <Col md={12}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold text-warning small">
                                                Selected Purchase Invoice <span className="text-danger">*</span>
                                            </Form.Label>
                                            {selectedInvoice ? (
                                                <Card className="border-success">
                                                    <Card.Body className="p-3">
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <div>
                                                                <h6 className="mb-1 fw-bold" style={{ color: '#6f42c1' }}>
                                                                    <FontAwesomeIcon icon={faReceipt} className="me-2" />
                                                                    {selectedInvoice.invoiceNumber || selectedInvoice.purchaseNumber}
                                                                </h6>
                                                                <small className="text-muted">
                                                                    Due: ₹{(
                                                                        parseFloat(selectedInvoice.totals?.finalTotal || selectedInvoice.totalAmount || selectedInvoice.amount || 0) -
                                                                        parseFloat(selectedInvoice.payment?.paidAmount || selectedInvoice.paidAmount || 0)
                                                                    ).toLocaleString('en-IN')}
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
                                                        <small className="text-muted">Please select a purchase invoice from the right panel</small>
                                                    </Card.Body>
                                                </Card>
                                            )}
                                        </Form.Group>
                                    </Col>
                                </Row>
                            )}

                            <Row className="mb-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold small" style={{ color: '#6f42c1' }}>
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
                                    {formData.paymentMethod === 'bank_transfer' && (
                                        <Form.Group>
                                            <Form.Label className="fw-bold text-success small">
                                                Bank Account <span className="text-danger">*</span>
                                                <small className="text-info ms-2">
                                                    <FontAwesomeIcon icon={faUniversity} className="me-1" />
                                                    Will create bank transaction
                                                </small>
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
                                            {selectedBankDetails && (
                                                <Form.Text className="text-muted">
                                                    <small>
                                                        <FontAwesomeIcon icon={faUniversity} className="me-1" />
                                                        {selectedBankDetails.bankName} - {selectedBankDetails.accountNumber}
                                                    </small>
                                                </Form.Text>
                                            )}
                                        </Form.Group>
                                    )}

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

                            {formData.paymentMethod === 'cheque' && (
                                <Row className="mb-3">
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold text-warning small">
                                                Clearing Date <span className="text-danger">*</span>
                                            </Form.Label>
                                            <Form.Control
                                                type="date"
                                                name="clearingDate"
                                                value={formData.clearingDate}
                                                onChange={handleChange}
                                                required
                                            />
                                            <Form.Text className="text-muted">
                                                <small>Expected date when cheque will clear</small>
                                            </Form.Text>
                                        </Form.Group>
                                    </Col>
                                </Row>
                            )}

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
                                            <Form.Text className="text-muted">
                                                <small>This reference will be included in the bank transaction</small>
                                            </Form.Text>
                                        </Form.Group>
                                    </Col>
                                </Row>
                            )}

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

                            {formData.paymentMethod !== 'cash' && formData.selectedBank && selectedBankDetails && (
                                <Row className="mb-3">
                                    <Col md={12}>
                                        <Card className="border-info bg-light">
                                            <Card.Body className="p-3">
                                                <h6 className="text-info mb-2">
                                                    <FontAwesomeIcon icon={faUniversity} className="me-2" />
                                                    Bank Transaction Summary
                                                </h6>
                                                <div className="small">
                                                    <div><strong>Bank:</strong> {selectedBankDetails.bankName}</div>
                                                    <div><strong>Account:</strong> {selectedBankDetails.accountName}</div>
                                                    <div><strong>Transaction Type:</strong> Debit (-)</div>
                                                    <div><strong>Amount:</strong> ₹{formData.amountPaid ? parseFloat(formData.amountPaid).toLocaleString('en-IN') : '0.00'}</div>
                                                    <div><strong>Description:</strong> Payment made to {party.name}</div>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>
                            )}

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
                                        style={{
                                            backgroundColor: '#6f42c1',
                                            borderColor: '#6f42c1',
                                            minWidth: '120px'
                                        }}
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

                    {showInvoicePanel && (
                        <div
                            className="bg-light border-start"
                            style={{
                                flex: '0 0 45%',
                                maxHeight: '600px',
                                overflowY: 'auto'
                            }}
                        >
                            <div className="p-3 text-white d-flex justify-content-between align-items-center" style={{ backgroundColor: '#6f42c1' }}>
                                <h6 className="mb-0 d-flex align-items-center">
                                    <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                                    Pending Purchase Invoices
                                    {pendingInvoices.length > 0 && (
                                        <Badge bg="light" text="dark" className="ms-2">{pendingInvoices.length}</Badge>
                                    )}
                                </h6>
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
                                        <Spinner animation="border" style={{ color: '#6f42c1' }} />
                                        <p className="mt-3 text-muted">Loading purchase invoices...</p>
                                    </div>
                                ) : pendingInvoices.length > 0 ? (
                                    <div>
                                        {pendingInvoices.map((invoice, index) => {
                                            const totalAmount = parseFloat(invoice.totals?.finalTotal || invoice.totalAmount || invoice.amount || 0);
                                            const paidAmount = parseFloat(invoice.payment?.paidAmount || invoice.paidAmount || 0);
                                            const dueAmount = totalAmount - paidAmount;
                                            const isSelected = selectedInvoice && (selectedInvoice._id || selectedInvoice.id) === (invoice._id || invoice.id);

                                            return (
                                                <Card
                                                    key={invoice._id || invoice.id || index}
                                                    className={`mb-2 ${isSelected ? 'border-3' : 'border-light'}`}
                                                    style={{
                                                        cursor: 'pointer',
                                                        borderColor: isSelected ? '#6f42c1' : undefined
                                                    }}
                                                    onClick={() => handleInvoiceSelection(invoice)}
                                                >
                                                    <Card.Body className="p-3">
                                                        <div className="d-flex justify-content-between align-items-start">
                                                            <div className="flex-grow-1">
                                                                <h6 className="mb-1 fw-bold">
                                                                    {invoice.invoiceNumber || invoice.purchaseNumber || `INV-${index + 1}`}
                                                                    {isSelected && (
                                                                        <Badge bg="success" className="ms-2 small">Selected</Badge>
                                                                    )}
                                                                </h6>
                                                                <div className="small text-muted mb-2">
                                                                    <FontAwesomeIcon icon={faCalendar} className="me-1" />
                                                                    {invoice.invoiceDate || invoice.purchaseDate ?
                                                                        new Date(invoice.invoiceDate || invoice.purchaseDate).toLocaleDateString('en-IN') :
                                                                        'N/A'
                                                                    }
                                                                </div>
                                                                <div className="fw-bold text-danger">
                                                                    <FontAwesomeIcon icon={faRupeeSign} className="me-1" />
                                                                    Due: ₹{dueAmount.toLocaleString('en-IN')}
                                                                </div>
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
                                                                style={!isSelected ? {
                                                                    borderColor: '#6f42c1',
                                                                    color: '#6f42c1'
                                                                } : undefined}
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
                                        <h6 className="text-muted">No Pending Purchase Invoices</h6>
                                        <p className="text-muted small">
                                            All purchase invoices are fully paid.<br />
                                            You can make an advance payment instead.
                                        </p>
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, paymentType: 'advance' }));
                                                setShowInvoicePanel(false);
                                            }}
                                            style={{
                                                borderColor: '#6f42c1',
                                                color: '#6f42c1'
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

export default PayOut;