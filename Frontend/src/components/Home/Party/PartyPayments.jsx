import React, { useState, useMemo } from 'react';
import { Row, Col, Card, Table, Button, Badge, Modal, Form, Alert, InputGroup, Dropdown, ProgressBar } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faMoneyBillWave,
    faPlus,
    faEdit,
    faTrash,
    faEye,
    faDownload,
    faFilter,
    faSearch,
    faCalendarAlt,
    faCreditCard,
    faUniversity,
    faMobileAlt,
    faHandHoldingUsd,
    faFileInvoice,
    faExclamationTriangle,
    faCheckCircle,
    faClock,
    faSort,
    faPrint
} from '@fortawesome/free-solid-svg-icons';

function PartyPayments({ party, sales = [], purchases = [], onAddPayment, onEditPayment, onDeletePayment }) {
    const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
    const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');

    // New payment form state
    const [paymentForm, setPaymentForm] = useState({
        transactionId: '',
        transactionType: '', // 'sale' or 'purchase'
        amount: '',
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        reference: '',
        notes: '',
        bankDetails: {
            bankName: '',
            accountNumber: '',
            transactionId: ''
        }
    });

    // Generate sample data if no real data exists
    const getSamplePaymentData = () => {
        if (!party) return null;

        const sampleTransactions = [
            {
                id: 1,
                type: 'sale',
                date: '2025-05-15',
                amount: 75000,
                reference: 'INV-2025-001',
                payments: [
                    { id: 1, amount: 50000, paymentMethod: 'bank', date: '2025-05-20', reference: 'TXN123456', notes: 'First installment' },
                    { id: 2, amount: 15000, paymentMethod: 'cash', date: '2025-05-25', reference: '', notes: 'Partial payment' }
                ],
                dueDate: '2025-06-15'
            },
            {
                id: 2,
                type: 'sale',
                date: '2025-04-10',
                amount: 45000,
                reference: 'INV-2025-002',
                payments: [
                    { id: 3, amount: 45000, paymentMethod: 'upi', date: '2025-04-15', reference: 'UPI789012', notes: 'Full payment via UPI' }
                ],
                dueDate: '2025-05-10'
            },
            {
                id: 3,
                type: 'purchase',
                date: '2025-03-20',
                amount: 32000,
                reference: 'PUR-2025-001',
                payments: [
                    { id: 4, amount: 20000, paymentMethod: 'card', date: '2025-03-25', reference: 'CARD345678', notes: 'Credit card payment' }
                ],
                dueDate: '2025-04-20'
            },
            {
                id: 4,
                type: 'sale',
                date: '2025-06-01',
                amount: 28000,
                reference: 'INV-2025-003',
                payments: [],
                dueDate: '2025-07-01'
            }
        ];

        const allPayments = [];
        sampleTransactions.forEach(transaction => {
            transaction.payments.forEach(payment => {
                allPayments.push({
                    ...payment,
                    transactionId: transaction.id,
                    transactionType: transaction.type,
                    transactionReference: transaction.reference,
                    transactionAmount: transaction.amount,
                    paymentDate: payment.date
                });
            });
        });

        return {
            allTransactions: sampleTransactions,
            allPayments: allPayments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)),
            paymentSummary: {
                totalSalesValue: 148000,
                totalPurchasesValue: 32000,
                totalSalesPaid: 110000,
                totalPurchasesPaid: 20000,
                salesOutstanding: 38000,
                purchasesOutstanding: 12000,
                netOutstanding: 26000,
                totalPayments: 4
            },
            overdueTransactions: [
                {
                    id: 3,
                    type: 'purchase',
                    reference: 'PUR-2025-001',
                    amount: 32000,
                    payments: [{ amount: 20000 }],
                    dueDate: '2025-04-20'
                }
            ]
        };
    };

    // Calculate payment data using useMemo
    const paymentData = useMemo(() => {
        if (!party) {
            return {
                allTransactions: [],
                allPayments: [],
                paymentSummary: {},
                overdueTransactions: []
            };
        }

        // Check if we have real data
        const hasRealData = sales.length > 0 || purchases.length > 0;
        
        if (!hasRealData) {
            // Return sample data
            return getSamplePaymentData();
        }

        // Real data logic would go here...
        // For now, return sample data
        return getSamplePaymentData();
    }, [party, sales, purchases]);

    // Filter and sort payments
    const filteredPayments = useMemo(() => {
        let filtered = paymentData.allPayments;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(payment =>
                payment.transactionReference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.notes?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply status filter
        if (filterStatus !== 'all') {
            filtered = filtered.filter(payment => {
                if (filterStatus === 'sale') return payment.transactionType === 'sale';
                if (filterStatus === 'purchase') return payment.transactionType === 'purchase';
                if (filterStatus === 'recent') return new Date(payment.paymentDate) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                return true;
            });
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue, bValue;
            switch (sortBy) {
                case 'amount':
                    aValue = parseFloat(a.amount || 0);
                    bValue = parseFloat(b.amount || 0);
                    break;
                case 'date':
                default:
                    aValue = new Date(a.paymentDate);
                    bValue = new Date(b.paymentDate);
                    break;
            }
            return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        });

        return filtered;
    }, [paymentData.allPayments, searchTerm, filterStatus, sortBy, sortOrder]);

    // Get outstanding transactions for payment dropdown
    const outstandingTransactions = useMemo(() => {
        return paymentData.allTransactions.filter(transaction => {
            const paidAmount = transaction.payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
            return transaction.amount > paidAmount;
        });
    }, [paymentData.allTransactions]);

    const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const formatDate = (date) => new Date(date).toLocaleDateString('en-IN');

    const getPaymentMethodIcon = (method) => {
        switch (method?.toLowerCase()) {
            case 'cash': return faHandHoldingUsd;
            case 'card': return faCreditCard;
            case 'bank': return faUniversity;
            case 'upi': return faMobileAlt;
            default: return faMoneyBillWave;
        }
    };

    const getPaymentMethodColor = (method) => {
        switch (method?.toLowerCase()) {
            case 'cash': return 'success';
            case 'card': return 'primary';
            case 'bank': return 'info';
            case 'upi': return 'warning';
            default: return 'secondary';
        }
    };

    const getTransactionStatus = (transaction) => {
        const paidAmount = transaction.payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
        const outstanding = transaction.amount - paidAmount;
        const isOverdue = new Date(transaction.dueDate) < new Date();

        if (outstanding <= 0) {
            return { status: 'Paid', color: 'success', icon: faCheckCircle };
        } else if (isOverdue) {
            return { status: 'Overdue', color: 'danger', icon: faExclamationTriangle };
        } else {
            return { status: 'Pending', color: 'warning', icon: faClock };
        }
    };

    const handleAddPayment = () => {
        setPaymentForm({
            transactionId: '',
            transactionType: '',
            amount: '',
            paymentMethod: 'cash',
            paymentDate: new Date().toISOString().split('T')[0],
            reference: '',
            notes: '',
            bankDetails: {
                bankName: '',
                accountNumber: '',
                transactionId: ''
            }
        });
        setSelectedTransaction(null);
        setShowAddPaymentModal(true);
    };

    const handleEditPayment = (payment) => {
        setSelectedPayment(payment);
        setPaymentForm({
            transactionId: payment.transactionId,
            transactionType: payment.transactionType,
            amount: payment.amount.toString(),
            paymentMethod: payment.paymentMethod || 'cash',
            paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toISOString().split('T')[0] : '',
            reference: payment.reference || '',
            notes: payment.notes || '',
            bankDetails: payment.bankDetails || {
                bankName: '',
                accountNumber: '',
                transactionId: ''
            }
        });
        setShowEditPaymentModal(true);
    };

    const handleSubmitPayment = () => {
        const paymentData = {
            ...paymentForm,
            amount: parseFloat(paymentForm.amount),
            partyId: party.id,
            partyName: party.name
        };

        if (selectedPayment) {
            onEditPayment && onEditPayment(selectedPayment.id, paymentData);
        } else {
            onAddPayment && onAddPayment(paymentData);
        }

        setShowAddPaymentModal(false);
        setShowEditPaymentModal(false);
        setSelectedPayment(null);
    };

    const handleTransactionSelect = (transactionId) => {
        const transaction = outstandingTransactions.find(t => t.id === transactionId);
        if (transaction) {
            setSelectedTransaction(transaction);
            const paidAmount = transaction.payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
            const outstanding = transaction.amount - paidAmount;
            
            setPaymentForm(prev => ({
                ...prev,
                transactionId: transaction.id,
                transactionType: transaction.type,
                amount: outstanding.toString()
            }));
        }
    };

    if (!party) {
        return (
            <div className="text-center py-4">
                <FontAwesomeIcon icon={faMoneyBillWave} size="3x" className="text-muted mb-3" />
                <h5>No Party Selected</h5>
                <p className="text-muted">Select a party to manage payments</p>
            </div>
        );
    }

    return (
        <div className="party-payments">
            {/* Payment Summary Cards */}
            <Row className="mb-4">
                <Col md={3}>
                    <Card className="payment-summary-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon={faMoneyBillWave} size="2x" className="text-success mb-2" />
                            <h4 className="text-success">{formatCurrency(paymentData.paymentSummary.totalSalesPaid)}</h4>
                            <p className="text-muted mb-0">Total Received</p>
                            <small className="text-muted">From {paymentData.paymentSummary.totalSalesValue ? Math.round((paymentData.paymentSummary.totalSalesPaid / paymentData.paymentSummary.totalSalesValue) * 100) : 0}% of sales</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="payment-summary-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon={faUniversity} size="2x" className="text-primary mb-2" />
                            <h4 className="text-primary">{formatCurrency(paymentData.paymentSummary.totalPurchasesPaid)}</h4>
                            <p className="text-muted mb-0">Total Paid</p>
                            <small className="text-muted">From {paymentData.paymentSummary.totalPurchasesValue ? Math.round((paymentData.paymentSummary.totalPurchasesPaid / paymentData.paymentSummary.totalPurchasesValue) * 100) : 0}% of purchases</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="payment-summary-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon 
                                icon={paymentData.paymentSummary.netOutstanding >= 0 ? faExclamationTriangle : faCheckCircle} 
                                size="2x" 
                                className={paymentData.paymentSummary.netOutstanding >= 0 ? "text-danger" : "text-success"} 
                            />
                            <h4 className={paymentData.paymentSummary.netOutstanding >= 0 ? "text-danger" : "text-success"}>
                                {formatCurrency(Math.abs(paymentData.paymentSummary.netOutstanding))}
                            </h4>
                            <p className="text-muted mb-0">Net Outstanding</p>
                            <small className="text-muted">
                                {paymentData.paymentSummary.netOutstanding >= 0 ? 'You will receive' : 'You need to pay'}
                            </small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="payment-summary-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon={faFileInvoice} size="2x" className="text-info mb-2" />
                            <h4 className="text-info">{paymentData.paymentSummary.totalPayments}</h4>
                            <p className="text-muted mb-0">Total Payments</p>
                            <small className="text-muted">{paymentData.overdueTransactions.length} overdue transactions</small>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Overdue Transactions Alert */}
            {paymentData.overdueTransactions.length > 0 && (
                <Alert variant="warning" className="mb-4">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                    <strong>Attention:</strong> {paymentData.overdueTransactions.length} transaction(s) are overdue.
                    <div className="mt-2">
                        {paymentData.overdueTransactions.slice(0, 3).map((transaction, index) => (
                            <div key={index} className="d-flex justify-content-between align-items-center">
                                <span>{transaction.reference}</span>
                                <Badge bg="danger">{formatCurrency(transaction.amount - transaction.payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0))}</Badge>
                            </div>
                        ))}
                        {paymentData.overdueTransactions.length > 3 && (
                            <small className="text-muted">And {paymentData.overdueTransactions.length - 3} more...</small>
                        )}
                    </div>
                </Alert>
            )}

            {/* Actions and Filters */}
            <Card className="mb-4">
                <Card.Header>
                    <Row className="align-items-center">
                        <Col>
                            <h5 className="mb-0">
                                <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                                Payment History
                            </h5>
                        </Col>
                        <Col xs="auto">
                            <div className="d-flex gap-2">
                                <Button variant="primary" size="sm" onClick={handleAddPayment}>
                                    <FontAwesomeIcon icon={faPlus} className="me-1" />
                                    Add Payment
                                </Button>
                                <Button variant="outline-secondary" size="sm">
                                    <FontAwesomeIcon icon={faDownload} className="me-1" />
                                    Export
                                </Button>
                                <Button variant="outline-secondary" size="sm">
                                    <FontAwesomeIcon icon={faPrint} className="me-1" />
                                    Print
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </Card.Header>
                <Card.Body>
                    {/* Filters and Search */}
                    <Row className="mb-3">
                        <Col md={4}>
                            <InputGroup size="sm">
                                <InputGroup.Text>
                                    <FontAwesomeIcon icon={faSearch} />
                                </InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    placeholder="Search payments..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </InputGroup>
                        </Col>
                        <Col md={3}>
                            <Form.Select
                                size="sm"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="all">All Payments</option>
                                <option value="sale">Sales Payments</option>
                                <option value="purchase">Purchase Payments</option>
                                <option value="recent">Recent (30 days)</option>
                            </Form.Select>
                        </Col>
                        <Col md={2}>
                            <Form.Select
                                size="sm"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="date">Sort by Date</option>
                                <option value="amount">Sort by Amount</option>
                            </Form.Select>
                        </Col>
                        <Col md={2}>
                            <Form.Select
                                size="sm"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                            >
                                <option value="desc">Descending</option>
                                <option value="asc">Ascending</option>
                            </Form.Select>
                        </Col>
                        <Col md={1}>
                            <Button variant="outline-secondary" size="sm" className="w-100">
                                <FontAwesomeIcon icon={faFilter} />
                            </Button>
                        </Col>
                    </Row>

                    {/* Payment Table */}
                    <div className="table-responsive">
                        <Table hover size="sm">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Transaction</th>
                                    <th>Type</th>
                                    <th>Method</th>
                                    <th className="text-end">Amount</th>
                                    <th>Reference</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayments.length > 0 ? (
                                    filteredPayments.map((payment, index) => (
                                        <tr key={payment.id || index}>
                                            <td className="fw-semibold">{formatDate(payment.paymentDate)}</td>
                                            <td>
                                                <div className="d-flex flex-column">
                                                    <span className="fw-semibold">{payment.transactionReference}</span>
                                                    <small className="text-muted">{formatCurrency(payment.transactionAmount)} total</small>
                                                </div>
                                            </td>
                                            <td>
                                                <Badge bg={payment.transactionType === 'sale' ? 'success' : 'primary'}>
                                                    {payment.transactionType === 'sale' ? 'Sale' : 'Purchase'}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Badge bg={getPaymentMethodColor(payment.paymentMethod)}>
                                                    <FontAwesomeIcon icon={getPaymentMethodIcon(payment.paymentMethod)} className="me-1" />
                                                    {payment.paymentMethod?.toUpperCase()}
                                                </Badge>
                                            </td>
                                            <td className="text-end fw-bold text-success">{formatCurrency(payment.amount)}</td>
                                            <td>
                                                <div className="d-flex flex-column">
                                                    {payment.reference && <span className="fw-semibold">{payment.reference}</span>}
                                                    {payment.notes && <small className="text-muted">{payment.notes}</small>}
                                                </div>
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
                                                        onClick={() => onDeletePayment && onDeletePayment(payment.id)}
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </Button>
                                                    <Button variant="outline-secondary" size="sm">
                                                        <FontAwesomeIcon icon={faEye} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="text-center py-4">
                                            <FontAwesomeIcon icon={faMoneyBillWave} size="2x" className="text-muted mb-2" />
                                            <div>No payments found</div>
                                            <small className="text-muted">Add a payment to get started</small>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>

            {/* Outstanding Transactions */}
            {outstandingTransactions.length > 0 && (
                <Card>
                    <Card.Header>
                        <h6 className="mb-0">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                            Outstanding Transactions ({outstandingTransactions.length})
                        </h6>
                    </Card.Header>
                    <Card.Body>
                        <div className="table-responsive">
                            <Table hover size="sm">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Reference</th>
                                        <th>Type</th>
                                        <th className="text-end">Total</th>
                                        <th className="text-end">Paid</th>
                                        <th className="text-end">Outstanding</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {outstandingTransactions.map((transaction, index) => {
                                        const paidAmount = transaction.payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
                                        const outstanding = transaction.amount - paidAmount;
                                        const status = getTransactionStatus(transaction);
                                        const paymentProgress = (paidAmount / transaction.amount) * 100;

                                        return (
                                            <tr key={transaction.id || index}>
                                                <td>{formatDate(transaction.date)}</td>
                                                <td className="fw-semibold">{transaction.reference}</td>
                                                <td>
                                                    <Badge bg={transaction.type === 'sale' ? 'success' : 'primary'}>
                                                        {transaction.type === 'sale' ? 'Sale' : 'Purchase'}
                                                    </Badge>
                                                </td>
                                                <td className="text-end">{formatCurrency(transaction.amount)}</td>
                                                <td className="text-end text-success">{formatCurrency(paidAmount)}</td>
                                                <td className="text-end fw-bold text-danger">{formatCurrency(outstanding)}</td>
                                                <td>
                                                    <div className="d-flex flex-column">
                                                        <Badge bg={status.color} className="mb-1">
                                                            <FontAwesomeIcon icon={status.icon} className="me-1" />
                                                            {status.status}
                                                        </Badge>
                                                        <ProgressBar
                                                            now={paymentProgress}
                                                            size="sm"
                                                            variant={paymentProgress === 100 ? 'success' : paymentProgress > 50 ? 'warning' : 'danger'}
                                                        />
                                                    </div>
                                                </td>
                                                <td>
                                                    <Button
                                                        variant="outline-success"
                                                        size="sm"
                                                        onClick={() => {
                                                            handleTransactionSelect(transaction.id);
                                                            setShowAddPaymentModal(true);
                                                        }}
                                                    >
                                                        <FontAwesomeIcon icon={faMoneyBillWave} className="me-1" />
                                                        Pay
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </div>
                    </Card.Body>
                </Card>
            )}

            {/* Add/Edit Payment Modal */}
            <Modal show={showAddPaymentModal || showEditPaymentModal} onHide={() => {
                setShowAddPaymentModal(false);
                setShowEditPaymentModal(false);
                setSelectedPayment(null);
            }} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                        {selectedPayment ? 'Edit Payment' : 'Add Payment'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Transaction</Form.Label>
                                    <Form.Select
                                        value={paymentForm.transactionId}
                                        onChange={(e) => handleTransactionSelect(e.target.value)}
                                        disabled={!!selectedPayment}
                                    >
                                        <option value="">Select Transaction</option>
                                        {outstandingTransactions.map(transaction => {
                                            const paidAmount = transaction.payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
                                            const outstanding = transaction.amount - paidAmount;
                                            return (
                                                <option key={transaction.id} value={transaction.id}>
                                                    {transaction.reference} - {formatCurrency(outstanding)} outstanding
                                                </option>
                                            );
                                        })}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Payment Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={paymentForm.paymentDate}
                                        onChange={(e) => setPaymentForm(prev => ({...prev, paymentDate: e.target.value}))}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Amount</Form.Label>
                                    <InputGroup>
                                        <InputGroup.Text>₹</InputGroup.Text>
                                        <Form.Control
                                            type="number"
                                            value={paymentForm.amount}
                                            onChange={(e) => setPaymentForm(prev => ({...prev, amount: e.target.value}))}
                                            placeholder="0.00"
                                        />
                                    </InputGroup>
                                    {selectedTransaction && (
                                        <Form.Text className="text-muted">
                                            Outstanding: {formatCurrency(selectedTransaction.amount - selectedTransaction.payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0))}
                                        </Form.Text>
                                    )}
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Payment Method</Form.Label>
                                    <Form.Select
                                        value={paymentForm.paymentMethod}
                                        onChange={(e) => setPaymentForm(prev => ({...prev, paymentMethod: e.target.value}))}
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
                                    <Form.Label>Reference Number</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={paymentForm.reference}
                                        onChange={(e) => setPaymentForm(prev => ({...prev, reference: e.target.value}))}
                                        placeholder="Transaction ID, Cheque No, etc."
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Notes</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={paymentForm.notes}
                                        onChange={(e) => setPaymentForm(prev => ({...prev, notes: e.target.value}))}
                                        placeholder="Additional notes"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => {
                        setShowAddPaymentModal(false);
                        setShowEditPaymentModal(false);
                        setSelectedPayment(null);
                    }}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSubmitPayment}>
                        <FontAwesomeIcon icon={faMoneyBillWave} className="me-1" />
                        {selectedPayment ? 'Update Payment' : 'Add Payment'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default PartyPayments;