import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Card, Table, Badge, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes,
    faMoneyBillWave,
    faCalendarAlt,
    faCreditCard,
    faPlus,
    faTrash,
    faReceipt
} from '@fortawesome/free-solid-svg-icons';

function PaymentStatusModal({ show, onHide, sale, onUpdatePayment }) {
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [newPayment, setNewPayment] = useState({
        amount: '',
        method: 'cash',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    useEffect(() => {
        if (sale) {
            setPaymentHistory(sale.paymentHistory || []);
        }
    }, [sale]);

    if (!sale) return null;

    const totalPaid = paymentHistory.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    const remainingAmount = sale.total - totalPaid;
    const paymentStatus = remainingAmount <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';

    const handleAddPayment = () => {
        if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
            alert('Please enter a valid payment amount');
            return;
        }

        if (parseFloat(newPayment.amount) > remainingAmount) {
            alert('Payment amount cannot exceed remaining amount');
            return;
        }

        const payment = {
            id: Date.now(),
            amount: parseFloat(newPayment.amount),
            method: newPayment.method,
            date: newPayment.date,
            notes: newPayment.notes,
            createdAt: new Date().toISOString()
        };

        const updatedHistory = [...paymentHistory, payment];
        setPaymentHistory(updatedHistory);

        // Reset form
        setNewPayment({
            amount: '',
            method: 'cash',
            date: new Date().toISOString().split('T')[0],
            notes: ''
        });
    };

    const handleRemovePayment = (paymentId) => {
        if (window.confirm('Are you sure you want to remove this payment?')) {
            setPaymentHistory(paymentHistory.filter(p => p.id !== paymentId));
        }
    };

    const handleSave = () => {
        const updatedSale = {
            ...sale,
            paymentHistory,
            paymentStatus,
            totalPaid,
            remainingAmount
        };

        onUpdatePayment(updatedSale);
        onHide();
    };

    const getPaymentStatusBadge = (status) => {
        switch (status) {
            case 'paid': return { bg: 'success', text: 'Fully Paid' };
            case 'partial': return { bg: 'warning', text: 'Partially Paid' };
            case 'pending': return { bg: 'danger', text: 'Pending' };
            default: return { bg: 'secondary', text: 'Unknown' };
        }
    };

    const statusBadge = getPaymentStatusBadge(paymentStatus);

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header className="border-0 pb-0">
                <Modal.Title className="fw-bold">
                    <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                    Payment Management - {sale.invoiceNumber}
                </Modal.Title>
                <Button variant="link" className="p-0 border-0 text-muted" onClick={onHide}>
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                </Button>
            </Modal.Header>

            <Modal.Body className="px-4 pb-4">
                {/* Payment Summary */}
                <Card className="mb-4 bg-light">
                    <Card.Body>
                        <Row>
                            <Col md={6}>
                                <div className="mb-2">
                                    <small className="text-muted">Customer</small>
                                    <div className="fw-bold">{sale.customerName}</div>
                                </div>
                                <div className="mb-2">
                                    <small className="text-muted">Invoice Date</small>
                                    <div>{new Date(sale.invoiceDate).toLocaleDateString()}</div>
                                </div>
                            </Col>
                            <Col md={6}>
                                <div className="mb-2">
                                    <small className="text-muted">Total Amount</small>
                                    <div className="fw-bold fs-5">₹{sale.total.toLocaleString()}</div>
                                </div>
                                <div className="mb-2">
                                    <small className="text-muted">Payment Status</small>
                                    <div>
                                        <Badge bg={statusBadge.bg} className="fs-6">
                                            {statusBadge.text}
                                        </Badge>
                                    </div>
                                </div>
                            </Col>
                        </Row>

                        <hr className="my-3" />

                        <Row>
                            <Col md={4}>
                                <div className="text-center">
                                    <div className="text-success fw-bold fs-4">₹{totalPaid.toLocaleString()}</div>
                                    <small className="text-muted">Total Paid</small>
                                </div>
                            </Col>
                            <Col md={4}>
                                <div className="text-center">
                                    <div className={`fw-bold fs-4 ${remainingAmount > 0 ? 'text-danger' : 'text-success'}`}>
                                        ₹{remainingAmount.toLocaleString()}
                                    </div>
                                    <small className="text-muted">Remaining</small>
                                </div>
                            </Col>
                            <Col md={4}>
                                <div className="text-center">
                                    <div className="text-primary fw-bold fs-4">
                                        {totalPaid > 0 ? Math.round((totalPaid / sale.total) * 100) : 0}%
                                    </div>
                                    <small className="text-muted">Completed</small>
                                </div>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                {/* Add New Payment */}
                {remainingAmount > 0 && (
                    <Card className="mb-4">
                        <Card.Header>
                            <h6 className="mb-0">
                                <FontAwesomeIcon icon={faPlus} className="me-2" />
                                Add Payment
                            </h6>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Payment Amount <span className="text-danger">*</span></Form.Label>
                                        <InputGroup>
                                            <InputGroup.Text>₹</InputGroup.Text>
                                            <Form.Control
                                                type="number"
                                                value={newPayment.amount}
                                                onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                                                placeholder="0.00"
                                                min="0"
                                                max={remainingAmount}
                                                step="0.01"
                                            />
                                        </InputGroup>
                                        <Form.Text className="text-muted">
                                            Maximum: ₹{remainingAmount.toLocaleString()}
                                        </Form.Text>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Payment Method</Form.Label>
                                        <Form.Select
                                            value={newPayment.method}
                                            onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value })}
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="card">Credit/Debit Card</option>
                                            <option value="upi">UPI</option>
                                            <option value="bank_transfer">Bank Transfer</option>
                                            <option value="check">Check</option>
                                            <option value="other">Other</option>
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
                                            value={newPayment.date}
                                            onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Notes</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={newPayment.notes}
                                            onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                                            placeholder="Optional notes..."
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Button variant="primary" onClick={handleAddPayment}>
                                <FontAwesomeIcon icon={faPlus} className="me-2" />
                                Add Payment
                            </Button>
                        </Card.Body>
                    </Card>
                )}

                {/* Payment History */}
                <Card>
                    <Card.Header>
                        <h6 className="mb-0">
                            <FontAwesomeIcon icon={faReceipt} className="me-2" />
                            Payment History ({paymentHistory.length})
                        </h6>
                    </Card.Header>
                    <Card.Body>
                        {paymentHistory.length > 0 ? (
                            <Table responsive>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Amount</th>
                                        <th>Method</th>
                                        <th>Notes</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paymentHistory.map((payment) => (
                                        <tr key={payment.id}>
                                            <td>{new Date(payment.date).toLocaleDateString()}</td>
                                            <td className="fw-bold text-success">₹{payment.amount.toLocaleString()}</td>
                                            <td>
                                                <Badge bg="secondary" className="text-capitalize">
                                                    {payment.method.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            <td>{payment.notes || '-'}</td>
                                            <td>
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => handleRemovePayment(payment.id)}
                                                >
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        ) : (
                            <div className="text-center py-4 text-muted">
                                <FontAwesomeIcon icon={faMoneyBillWave} size="3x" className="mb-3" />
                                <div>No payments recorded yet</div>
                                <small>Add a payment to get started</small>
                            </div>
                        )}
                    </Card.Body>
                </Card>

                {/* Action Buttons */}
                <div className="d-flex gap-3 justify-content-end mt-4">
                    <Button variant="outline-secondary" onClick={onHide}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSave}>
                        <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                        Update Payment Status
                    </Button>
                </div>
            </Modal.Body>
        </Modal>
    );
}

export default PaymentStatusModal;