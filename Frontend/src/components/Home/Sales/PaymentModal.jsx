import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Card, Table, Badge, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes,
    faMoneyBillWave,
    faCalendarAlt,
    faBell,
    faCheck,
    faPlus,
    faTrash,
    faEdit,
    faCreditCard,
    faUniversity,
    faCoins
} from '@fortawesome/free-solid-svg-icons';
import './PaymentModal.css';

function PaymentModal({
    show,
    onHide,
    invoiceData,
    onSavePayment,
    onSetReminder
}) {
    const [payments, setPayments] = useState([]);
    const [newPayment, setNewPayment] = useState({
        amount: '',
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [nextDueDate, setNextDueDate] = useState('');
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [editingPayment, setEditingPayment] = useState(null);

    // Calculate payment summary
    const calculatePaymentSummary = () => {
        const totalInvoiceAmount = invoiceData?.finalTotal || 0;
        const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
        const remainingAmount = totalInvoiceAmount - totalPaid;
        const paymentStatus = remainingAmount <= 0 ? 'paid' : remainingAmount < totalInvoiceAmount ? 'partial' : 'unpaid';

        return {
            totalInvoiceAmount,
            totalPaid,
            remainingAmount,
            paymentStatus
        };
    };

    // Initialize with existing payments if any
    useEffect(() => {
        if (invoiceData?.payments) {
            setPayments(invoiceData.payments);
        }

        // Initialize next due date if exists
        if (invoiceData?.nextDueDate) {
            setNextDueDate(invoiceData.nextDueDate);
        }
    }, [invoiceData]);

    // Handle new payment input
    const handlePaymentInputChange = (e) => {
        const { name, value } = e.target;
        setNewPayment(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Add new payment
    const handleAddPayment = () => {
        if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
            alert('Please enter a valid payment amount');
            return;
        }

        const summary = calculatePaymentSummary();
        const paymentAmount = parseFloat(newPayment.amount);

        if (paymentAmount > summary.remainingAmount) {
            if (!window.confirm(`Payment amount (₹${paymentAmount}) exceeds remaining amount (₹${summary.remainingAmount.toFixed(2)}). Do you want to continue?`)) {
                return;
            }
        }

        const payment = {
            id: Date.now(),
            amount: paymentAmount,
            paymentMethod: newPayment.paymentMethod,
            paymentDate: newPayment.paymentDate,
            notes: newPayment.notes,
            createdAt: new Date().toISOString()
        };

        setPayments(prev => [...prev, payment]);
        setNewPayment({
            amount: '',
            paymentMethod: 'cash',
            paymentDate: new Date().toISOString().split('T')[0],
            notes: ''
        });
        setShowAddPayment(false);
    };

    // Edit payment
    const handleEditPayment = (payment) => {
        setEditingPayment(payment);
        setNewPayment({
            amount: payment.amount.toString(),
            paymentMethod: payment.paymentMethod,
            paymentDate: payment.paymentDate,
            notes: payment.notes || ''
        });
        setShowAddPayment(true);
    };

    // Update payment
    const handleUpdatePayment = () => {
        if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
            alert('Please enter a valid payment amount');
            return;
        }

        const updatedPayment = {
            ...editingPayment,
            amount: parseFloat(newPayment.amount),
            paymentMethod: newPayment.paymentMethod,
            paymentDate: newPayment.paymentDate,
            notes: newPayment.notes,
            updatedAt: new Date().toISOString()
        };

        setPayments(prev => prev.map(p => p.id === editingPayment.id ? updatedPayment : p));
        setEditingPayment(null);
        setNewPayment({
            amount: '',
            paymentMethod: 'cash',
            paymentDate: new Date().toISOString().split('T')[0],
            notes: ''
        });
        setShowAddPayment(false);
    };

    // Delete payment
    const handleDeletePayment = (paymentId) => {
        if (window.confirm('Are you sure you want to delete this payment?')) {
            setPayments(prev => prev.filter(p => p.id !== paymentId));
        }
    };

    // Cancel add/edit
    const handleCancelPayment = () => {
        setShowAddPayment(false);
        setEditingPayment(null);
        setNewPayment({
            amount: '',
            paymentMethod: 'cash',
            paymentDate: new Date().toISOString().split('T')[0],
            notes: ''
        });
    };

    // Save all payments and next due date
    const handleSavePayments = () => {
        const summary = calculatePaymentSummary();

        const paymentData = {
            invoiceId: invoiceData.id,
            payments: payments,
            nextDueDate: summary.remainingAmount > 0 ? nextDueDate : null,
            summary: summary
        };

        onSavePayment(paymentData);
    };

    // Get payment method icon
    const getPaymentMethodIcon = (method) => {
        switch (method) {
            case 'cash': return faCoins;
            case 'card': return faCreditCard;
            case 'bank': return faUniversity;
            case 'upi': return faMoneyBillWave;
            default: return faMoneyBillWave;
        }
    };

    // Get payment status badge
    const getPaymentStatusBadge = (status) => {
        switch (status) {
            case 'paid':
                return <Badge bg="success"><FontAwesomeIcon icon={faCheck} className="me-1" />Fully Paid</Badge>;
            case 'partial':
                return <Badge bg="warning">Partially Paid</Badge>;
            case 'unpaid':
                return <Badge bg="danger">Unpaid</Badge>;
            default:
                return <Badge bg="secondary">Unknown</Badge>;
        }
    };

    // Calculate days until due date
    const getDaysUntilDue = () => {
        if (!nextDueDate) return null;
        const today = new Date();
        const dueDate = new Date(nextDueDate);
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const summary = calculatePaymentSummary();
    const daysUntilDue = getDaysUntilDue();

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header className="border-0 pb-0">
                <Modal.Title className="fw-bold d-flex align-items-center">
                    <FontAwesomeIcon icon={faMoneyBillWave} className="me-2 text-primary" />
                    Payment Management
                </Modal.Title>
                <Button
                    variant="link"
                    className="p-0 border-0 text-muted"
                    onClick={onHide}
                >
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                </Button>
            </Modal.Header>

            <Modal.Body className="px-4 pb-4">
                {/* Invoice Summary */}
                <Card className="mb-4 border-0 bg-light">
                    <Card.Body>
                        <Row>
                            <Col md={8}>
                                <h6 className="fw-bold mb-2">Invoice Details</h6>
                                <div className="d-flex flex-wrap gap-3">
                                    <div>
                                        <small className="text-muted">Invoice Number:</small>
                                        <div className="fw-semibold">{invoiceData?.invoiceNumber}</div>
                                    </div>
                                    <div>
                                        <small className="text-muted">Party:</small>
                                        <div className="fw-semibold">{invoiceData?.partyName}</div>
                                    </div>
                                    <div>
                                        <small className="text-muted">Date:</small>
                                        <div className="fw-semibold">{invoiceData?.invoiceDate}</div>
                                    </div>
                                </div>
                            </Col>
                            <Col md={4} className="text-end">
                                <div className="mb-2">{getPaymentStatusBadge(summary.paymentStatus)}</div>
                                <div className="text-muted small">Total Amount</div>
                                <div className="h5 fw-bold text-primary mb-0">
                                    ₹{summary.totalInvoiceAmount.toFixed(2)}
                                </div>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                {/* Payment Summary */}
                <Row className="mb-4">
                    <Col md={4}>
                        <Card className="text-center border-success">
                            <Card.Body>
                                <div className="text-success">
                                    <FontAwesomeIcon icon={faCheck} size="2x" className="mb-2" />
                                </div>
                                <div className="h5 fw-bold text-success">₹{summary.totalPaid.toFixed(2)}</div>
                                <div className="text-muted small">Total Paid</div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={4}>
                        <Card className="text-center border-warning">
                            <Card.Body>
                                <div className="text-warning">
                                    <FontAwesomeIcon icon={faMoneyBillWave} size="2x" className="mb-2" />
                                </div>
                                <div className="h5 fw-bold text-warning">₹{summary.remainingAmount.toFixed(2)}</div>
                                <div className="text-muted small">Remaining</div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={4}>
                        <Card className="text-center border-info">
                            <Card.Body>
                                <div className="text-info">
                                    <FontAwesomeIcon icon={faCalendarAlt} size="2x" className="mb-2" />
                                </div>
                                <div className="h6 fw-bold text-info">{payments.length}</div>
                                <div className="text-muted small">Payment{payments.length !== 1 ? 's' : ''}</div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Payment History */}
                <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="fw-bold mb-0">Payment History</h6>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setShowAddPayment(true)}
                        >
                            <FontAwesomeIcon icon={faPlus} className="me-1" />
                            Add Payment
                        </Button>
                    </div>

                    {payments.length > 0 ? (
                        <Card>
                            <Table className="mb-0" responsive>
                                <thead className="bg-light">
                                    <tr>
                                        <th>Date</th>
                                        <th>Amount</th>
                                        <th>Method</th>
                                        <th>Notes</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map((payment) => (
                                        <tr key={payment.id}>
                                            <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                                            <td className="fw-semibold text-success">₹{payment.amount.toFixed(2)}</td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <FontAwesomeIcon
                                                        icon={getPaymentMethodIcon(payment.paymentMethod)}
                                                        className="me-2"
                                                    />
                                                    {payment.paymentMethod.toUpperCase()}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="text-muted">
                                                    {payment.notes || 'No notes'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="d-flex gap-1">
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => handleEditPayment(payment)}
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => handleDeletePayment(payment.id)}
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card>
                    ) : (
                        <Alert variant="info" className="text-center">
                            <FontAwesomeIcon icon={faMoneyBillWave} size="2x" className="mb-2 d-block" />
                            No payments recorded yet. Click "Add Payment" to record a payment.
                        </Alert>
                    )}
                </div>

                {/* Add/Edit Payment Form */}
                {showAddPayment && (
                    <Card className="mb-4 border-primary">
                        <Card.Header className="bg-primary text-white">
                            <h6 className="mb-0">
                                <FontAwesomeIcon icon={faPlus} className="me-2" />
                                {editingPayment ? 'Edit Payment' : 'Add New Payment'}
                            </h6>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Payment Amount *</Form.Label>
                                        <Form.Control
                                            type="number"
                                            name="amount"
                                            value={newPayment.amount}
                                            onChange={handlePaymentInputChange}
                                            placeholder="Enter payment amount"
                                            min="0"
                                            step="0.01"
                                        />
                                        <Form.Text className="text-muted">
                                            Remaining: ₹{summary.remainingAmount.toFixed(2)}
                                        </Form.Text>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Payment Method</Form.Label>
                                        <Form.Select
                                            name="paymentMethod"
                                            value={newPayment.paymentMethod}
                                            onChange={handlePaymentInputChange}
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="card">Card</option>
                                            <option value="bank">Bank Transfer</option>
                                            <option value="upi">UPI</option>
                                            <option value="cheque">Cheque</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Payment Date</Form.Label>
                                        <Form.Control
                                            type="date"
                                            name="paymentDate"
                                            value={newPayment.paymentDate}
                                            onChange={handlePaymentInputChange}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Notes (Optional)</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="notes"
                                            value={newPayment.notes}
                                            onChange={handlePaymentInputChange}
                                            placeholder="Payment notes..."
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <div className="d-flex gap-2">
                                <Button
                                    variant="primary"
                                    onClick={editingPayment ? handleUpdatePayment : handleAddPayment}
                                >
                                    {editingPayment ? 'Update Payment' : 'Add Payment'}
                                </Button>
                                <Button
                                    variant="outline-secondary"
                                    onClick={handleCancelPayment}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                )}

                {/* Next Payment Due Date - Only show if there's remaining amount */}
                {summary.remainingAmount > 0 && (
                    <Card className="mb-4 border-warning">
                        <Card.Header className="bg-warning text-dark">
                            <h6 className="mb-0">
                                <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                                Next Payment Due Date
                            </h6>
                        </Card.Header>
                        <Card.Body>
                            <Row className="align-items-end">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Due Date for Remaining Amount</Form.Label>
                                        <Form.Control
                                            type="date"
                                            value={nextDueDate}
                                            onChange={(e) => setNextDueDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                        <Form.Text className="text-muted">
                                            Amount due: ₹{summary.remainingAmount.toFixed(2)}
                                        </Form.Text>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    {nextDueDate && (
                                        <div className="text-center">
                                            <div className="text-muted small">Days Until Due</div>
                                            <div className={`h5 fw-bold ${daysUntilDue < 0 ? 'text-danger' : daysUntilDue <= 7 ? 'text-warning' : 'text-success'}`}>
                                                {daysUntilDue < 0
                                                    ? `${Math.abs(daysUntilDue)} days overdue`
                                                    : daysUntilDue === 0
                                                        ? 'Due today'
                                                        : `${daysUntilDue} days`
                                                }
                                            </div>
                                        </div>
                                    )}
                                </Col>
                            </Row>

                            <Alert variant="info" className="mt-3 mb-0">
                                <FontAwesomeIcon icon={faBell} className="me-2" />
                                <strong>Note:</strong> A payment reminder will appear in your Day Book on the due date.
                                If payment is not received, you can set a new due date at that time.
                            </Alert>
                        </Card.Body>
                    </Card>
                )}

                {/* Action Buttons */}
                <div className="d-flex gap-3 justify-content-end">
                    <Button
                        variant="outline-secondary"
                        onClick={onHide}
                    >
                        Close
                    </Button>
                    <Button
                        variant="success"
                        onClick={handleSavePayments}
                    >
                        <FontAwesomeIcon icon={faCheck} className="me-2" />
                        Save Payment Plan
                    </Button>
                </div>
            </Modal.Body>
        </Modal>
    );
}

export default PaymentModal;