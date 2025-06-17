import React, { useState, useMemo, useEffect } from 'react';
import { Row, Col, Card, Table, Button, Badge, Modal, Form, Alert, InputGroup, ProgressBar, Spinner } from 'react-bootstrap';
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
    faPrint,
    faSync,
    faArrowUp,
    faArrowDown
} from '@fortawesome/free-solid-svg-icons';
import paymentService from '../../../services/paymentService';

function PartyPayments({
    party,
    sales = [],
    purchases = [],
    onAddPayment,
    onEditPayment,
    onDeletePayment,
    currentCompany,
    actualPayments = [],
    allTransactions = [],
    loading = false,
    onRefreshPayments
}) {
    // Modal states
    const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
    const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    // Filter and search states
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');

    // Data states
    const [isLoadingPayments, setIsLoadingPayments] = useState(false);
    const [payments, setPayments] = useState([]);
    const [error, setError] = useState('');

    // Payment form state
    const [paymentForm, setPaymentForm] = useState({
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

    // Initialize payments from props if available
    useEffect(() => {
        if (actualPayments && actualPayments.length > 0) {
            setPayments(actualPayments);
        }
    }, [actualPayments]);

    // Fetch payment data when component mounts or party changes
    useEffect(() => {
        if (party && currentCompany) {
            fetchPaymentHistory();
        }
    }, [party, currentCompany]);

    const fetchPaymentHistory = async () => {
        if (!party || !currentCompany) return;

        try {
            setIsLoadingPayments(true);
            setError('');

            const partyId = party._id || party.id;
            const companyId = currentCompany._id || currentCompany.id;

            console.log('🔍 Fetching payments for:', { partyId, companyId });

            const response = await paymentService.getPaymentHistory(companyId, {
                partyId: partyId,
                limit: 100,
                sortBy: 'paymentDate',
                sortOrder: 'desc'
            });

            if (response && response.success) {
                const paymentData = response.data || response.payments || [];
                console.log('✅ Payments fetched:', paymentData.length);
                setPayments(paymentData);
            } else {
                console.log('⚠️ No payments found in response');
                setPayments([]);
            }
        } catch (error) {
            console.error('❌ Error fetching payments:', error);
            setError('Failed to load payment history: ' + error.message);
            setPayments([]);
        } finally {
            setIsLoadingPayments(false);
        }
    };

    // Calculate payment data using useMemo
    const paymentData = useMemo(() => {
        console.log('🔍 Processing payment data:', {
            party: party?.name,
            paymentsCount: payments.length,
            salesCount: sales.length,
            purchasesCount: purchases.length
        });

        if (!party) {
            return {
                allTransactions: [],
                allPayments: [],
                paymentSummary: {
                    totalSalesValue: 0,
                    totalPurchasesValue: 0,
                    totalSalesPaid: 0,
                    totalPurchasesPaid: 0,
                    salesOutstanding: 0,
                    purchasesOutstanding: 0,
                    netOutstanding: 0,
                    totalPayments: 0,
                    totalPaymentsIn: 0,
                    totalPaymentsOut: 0
                },
                overdueTransactions: []
            };
        }

        // Process actual payments from the payment service or props
        const processedPayments = payments.map(payment => {
            const paymentType = payment.type || payment.paymentType;
            const isPaymentIn = paymentType === 'payment_in';

            return {
                id: payment._id || payment.id || `payment-${Date.now()}-${Math.random()}`,
                transactionId: payment.saleOrderId || payment.purchaseOrderId || payment.referenceId,
                transactionType: isPaymentIn ? 'sale' : 'purchase',
                transactionReference: payment.reference || payment.paymentNumber || payment.notes,
                transactionAmount: payment.amount,
                amount: payment.amount,
                paymentMethod: payment.paymentMethod || 'cash',
                paymentDate: payment.paymentDate || payment.createdAt,
                reference: payment.reference || payment.paymentNumber || `PAY-${payment._id?.substring(0, 8)}`,
                notes: payment.notes,
                status: payment.status || 'completed',
                type: isPaymentIn ? 'payment_in' : 'payment_out',
                partyName: payment.partyName || party.name,
                employeeName: payment.employeeName
            };
        });

        console.log('✅ Processed payments:', processedPayments.length);

        // Filter sales and purchases for this party
        const partySales = sales.filter(sale =>
            sale.customerId === party.id ||
            sale.customer === party.id ||
            sale.customerName === party.name ||
            sale.partyId === party.id ||
            sale.customerId === party._id ||
            sale.customer === party._id
        );

        const partyPurchases = purchases.filter(purchase =>
            purchase.supplierId === party.id ||
            purchase.supplier === party.id ||
            purchase.supplierName === party.name ||
            purchase.partyId === party.id ||
            purchase.supplierId === party._id ||
            purchase.supplier === party._id
        );

        // Create business transactions
        const businessTransactions = [
            ...partySales.map(sale => ({
                id: sale.id || sale._id,
                type: 'sale',
                date: sale.invoiceDate || sale.createdAt,
                amount: parseFloat(sale.total || sale.finalTotal || sale.totals?.finalTotal || 0),
                reference: sale.invoiceNumber || sale.saleNumber || `SALE-${sale.id || sale._id}`,
                payments: sale.paymentHistory || [],
                status: sale.payment?.status || 'pending',
                dueDate: sale.payment?.dueDate,
                paidAmount: parseFloat(sale.payment?.paidAmount || 0),
                pendingAmount: parseFloat(sale.payment?.pendingAmount || (parseFloat(sale.total || sale.finalTotal || sale.totals?.finalTotal || 0) - parseFloat(sale.payment?.paidAmount || 0)))
            })),
            ...partyPurchases.map(purchase => ({
                id: purchase.id || purchase._id,
                type: 'purchase',
                date: purchase.purchaseDate || purchase.createdAt,
                amount: parseFloat(purchase.total || purchase.finalTotal || purchase.totals?.finalTotal || 0),
                reference: purchase.supplierInvoiceNumber || purchase.invoiceNumber || purchase.purchaseNumber || `PUR-${purchase.id || purchase._id}`,
                payments: purchase.paymentHistory || [],
                status: purchase.payment?.status || 'pending',
                dueDate: purchase.payment?.dueDate,
                paidAmount: parseFloat(purchase.payment?.paidAmount || 0),
                pendingAmount: parseFloat(purchase.payment?.pendingAmount || (parseFloat(purchase.total || purchase.finalTotal || purchase.totals?.finalTotal || 0) - parseFloat(purchase.payment?.paidAmount || 0)))
            }))
        ];

        // Calculate payment summary
        const totalSales = partySales.reduce((sum, sale) => {
            return sum + parseFloat(sale.total || sale.finalTotal || sale.totals?.finalTotal || 0);
        }, 0);

        const totalPurchases = partyPurchases.reduce((sum, purchase) => {
            return sum + parseFloat(purchase.total || purchase.finalTotal || purchase.totals?.finalTotal || 0);
        }, 0);

        const totalPaymentsIn = processedPayments
            .filter(p => p.type === 'payment_in')
            .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

        const totalPaymentsOut = processedPayments
            .filter(p => p.type === 'payment_out')
            .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

        const salesOutstanding = Math.max(0, totalSales - totalPaymentsIn);
        const purchasesOutstanding = Math.max(0, totalPurchases - totalPaymentsOut);
        const netOutstanding = salesOutstanding - purchasesOutstanding;

        // Find overdue transactions
        const today = new Date();
        const overdueTransactions = businessTransactions.filter(transaction => {
            const dueDate = transaction.dueDate ? new Date(transaction.dueDate) : null;
            const pendingAmount = parseFloat(transaction.pendingAmount || 0);
            return dueDate && dueDate < today && pendingAmount > 0;
        });

        const result = {
            allTransactions: businessTransactions.sort((a, b) => new Date(b.date) - new Date(a.date)),
            allPayments: processedPayments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)),
            paymentSummary: {
                totalSalesValue: totalSales,
                totalPurchasesValue: totalPurchases,
                totalSalesPaid: totalPaymentsIn,
                totalPurchasesPaid: totalPaymentsOut,
                salesOutstanding: salesOutstanding,
                purchasesOutstanding: purchasesOutstanding,
                netOutstanding: netOutstanding,
                totalPayments: processedPayments.length,
                totalPaymentsIn: totalPaymentsIn,
                totalPaymentsOut: totalPaymentsOut
            },
            overdueTransactions
        };

        console.log('🎯 Payment data result:', {
            totalPayments: result.paymentSummary.totalPayments,
            paymentsIn: result.paymentSummary.totalPaymentsIn,
            paymentsOut: result.paymentSummary.totalPaymentsOut
        });

        return result;
    }, [party, sales, purchases, payments]);

    // Filter and sort payments
    const filteredPayments = useMemo(() => {
        let filtered = paymentData.allPayments;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(payment =>
                payment.transactionReference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply status filter
        if (filterStatus !== 'all') {
            filtered = filtered.filter(payment => {
                if (filterStatus === 'payment_in') return payment.type === 'payment_in';
                if (filterStatus === 'payment_out') return payment.type === 'payment_out';
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
            const paidAmount = transaction.paidAmount || 0;
            const pendingAmount = transaction.pendingAmount || (transaction.amount - paidAmount);
            return pendingAmount > 0;
        });
    }, [paymentData.allTransactions]);

    // Utility functions
    const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const formatDate = (date) => new Date(date).toLocaleDateString('en-IN');

    const getPaymentMethodIcon = (method) => {
        switch (method?.toLowerCase()) {
            case 'cash': return faHandHoldingUsd;
            case 'card': return faCreditCard;
            case 'bank':
            case 'bank_transfer': return faUniversity;
            case 'upi': return faMobileAlt;
            default: return faMoneyBillWave;
        }
    };

    const getPaymentMethodColor = (method) => {
        switch (method?.toLowerCase()) {
            case 'cash': return 'success';
            case 'card': return 'primary';
            case 'bank':
            case 'bank_transfer': return 'info';
            case 'upi': return 'warning';
            default: return 'secondary';
        }
    };

    const getTransactionStatus = (transaction) => {
        const paidAmount = transaction.paidAmount || 0;
        const outstanding = transaction.amount - paidAmount;
        const isOverdue = transaction.dueDate && new Date(transaction.dueDate) < new Date();

        if (outstanding <= 0) {
            return { status: 'Paid', color: 'success', icon: faCheckCircle };
        } else if (isOverdue) {
            return { status: 'Overdue', color: 'danger', icon: faExclamationTriangle };
        } else {
            return { status: 'Pending', color: 'warning', icon: faClock };
        }
    };

    // Event handlers
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
            transactionId: payment.transactionId || '',
            transactionType: payment.transactionType || '',
            amount: payment.amount?.toString() || '',
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

    const handleSubmitPayment = async () => {
        try {
            const paymentData = {
                ...paymentForm,
                amount: parseFloat(paymentForm.amount),
                partyId: party.id || party._id,
                partyName: party.name
            };

            if (selectedPayment) {
                if (onEditPayment) {
                    await onEditPayment(selectedPayment.id, paymentData);
                }
            } else {
                if (onAddPayment) {
                    await onAddPayment(paymentData);
                }
            }

            setShowAddPaymentModal(false);
            setShowEditPaymentModal(false);
            setSelectedPayment(null);

            // Refresh payment data
            setTimeout(() => {
                fetchPaymentHistory();
            }, 1000);
        } catch (error) {
            console.error('Error submitting payment:', error);
            setError('Failed to save payment: ' + error.message);
        }
    };

    const handleTransactionSelect = (transactionId) => {
        const transaction = outstandingTransactions.find(t => t.id === transactionId);
        if (transaction) {
            setSelectedTransaction(transaction);
            const paidAmount = transaction.paidAmount || 0;
            const outstanding = transaction.amount - paidAmount;

            setPaymentForm(prev => ({
                ...prev,
                transactionId: transaction.id,
                transactionType: transaction.type,
                amount: outstanding.toString()
            }));
        }
    };

    const handleRefresh = () => {
        fetchPaymentHistory();
        if (onRefreshPayments) {
            onRefreshPayments();
        }
    };

    // Don't render if no party
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
            {/* Debug Info (only in development) */}
            {process.env.NODE_ENV === 'development' && (
                <Alert variant="info" className="mb-3">
                    <small>
                        <strong>Debug:</strong> Payments: {payments.length} |
                        Filtered: {filteredPayments.length} |
                        Party: {party?.name} |
                        Company: {currentCompany?.name}
                    </small>
                </Alert>
            )}

            {/* Error Alert */}
            {error && (
                <Alert variant="danger" className="mb-4" dismissible onClose={() => setError('')}>
                    <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                    {error}
                </Alert>
            )}

            {/* Payment Summary Cards */}
            <Row className="mb-4">
                <Col md={3}>
                    <Card className="payment-summary-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon={faArrowDown} size="2x" className="text-success mb-2" />
                            <h4 className="text-success">{formatCurrency(paymentData.paymentSummary.totalPaymentsIn)}</h4>
                            <p className="text-muted mb-0">Payment In (Received)</p>
                            <small className="text-muted">From sales transactions</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="payment-summary-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon={faArrowUp} size="2x" className="text-primary mb-2" />
                            <h4 className="text-primary">{formatCurrency(paymentData.paymentSummary.totalPaymentsOut)}</h4>
                            <p className="text-muted mb-0">Payment Out (Made)</p>
                            <small className="text-muted">To purchase transactions</small>
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
                        {paymentData.overdueTransactions.slice(0, 3).map((transaction, index) => {
                            const outstanding = transaction.pendingAmount || (transaction.amount - transaction.paidAmount);
                            return (
                                <div key={index} className="d-flex justify-content-between align-items-center">
                                    <span>{transaction.reference}</span>
                                    <Badge bg="danger">{formatCurrency(outstanding)}</Badge>
                                </div>
                            );
                        })}
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
                                Payment History ({filteredPayments.length})
                            </h5>
                        </Col>
                        <Col xs="auto">
                            <div className="d-flex gap-2">
                                <Button variant="outline-primary" size="sm" onClick={handleRefresh} disabled={isLoadingPayments}>
                                    <FontAwesomeIcon icon={faSync} className={isLoadingPayments ? 'fa-spin me-1' : 'me-1'} />
                                    Refresh
                                </Button>
                                <Button variant="primary" size="sm" onClick={handleAddPayment}>
                                    <FontAwesomeIcon icon={faPlus} className="me-1" />
                                    Add Payment
                                </Button>
                                <Button variant="outline-secondary" size="sm">
                                    <FontAwesomeIcon icon={faDownload} className="me-1" />
                                    Export
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
                                <option value="payment_in">Payment In (Received)</option>
                                <option value="payment_out">Payment Out (Made)</option>
                                <option value="recent">Recent (30 days)</option>
                            </Form.Select>
                        </Col>
                        <Col md={3}>
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
                    </Row>

                    {/* Payment Table */}
                    <div className="table-responsive">
                        <Table hover size="sm">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Reference</th>
                                    <th>Type</th>
                                    <th>Method</th>
                                    <th className="text-end">Amount</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoadingPayments || loading ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-4">
                                            <Spinner animation="border" size="sm" className="me-2" />
                                            Loading payments...
                                        </td>
                                    </tr>
                                ) : filteredPayments.length > 0 ? (
                                    filteredPayments.map((payment, index) => (
                                        <tr key={payment.id || index}>
                                            <td className="fw-semibold">{formatDate(payment.paymentDate)}</td>
                                            <td>
                                                <div className="d-flex flex-column">
                                                    <span className="fw-semibold">{payment.reference || 'N/A'}</span>
                                                    {payment.transactionReference && payment.reference !== payment.transactionReference && (
                                                        <small className="text-muted">{payment.transactionReference}</small>
                                                    )}
                                                    {payment.notes && (
                                                        <small className="text-muted">{payment.notes}</small>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <Badge bg={payment.type === 'payment_in' ? 'success' : 'danger'}>
                                                    <FontAwesomeIcon
                                                        icon={payment.type === 'payment_in' ? faArrowDown : faArrowUp}
                                                        className="me-1"
                                                    />
                                                    {payment.type === 'payment_in' ? 'Payment In' : 'Payment Out'}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Badge bg={getPaymentMethodColor(payment.paymentMethod)}>
                                                    <FontAwesomeIcon icon={getPaymentMethodIcon(payment.paymentMethod)} className="me-1" />
                                                    {payment.paymentMethod?.toUpperCase() || 'CASH'}
                                                </Badge>
                                            </td>
                                            <td className="text-end">
                                                <span className={`fw-bold ${payment.type === 'payment_in' ? 'text-success' : 'text-danger'}`}>
                                                    {payment.type === 'payment_in' ? '+' : '-'}{formatCurrency(payment.amount)}
                                                </span>
                                            </td>
                                            <td>
                                                <Badge bg={payment.status === 'completed' ? 'success' : payment.status === 'pending' ? 'warning' : 'secondary'}>
                                                    {payment.status || 'Completed'}
                                                </Badge>
                                            </td>
                                            <td>
                                                <div className="d-flex gap-1">
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => handleEditPayment(payment)}
                                                        title="Edit Payment"
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => onDeletePayment && onDeletePayment(payment.id)}
                                                        title="Delete Payment"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </Button>
                                                    <Button
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        title="View Details"
                                                    >
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
                                            <small className="text-muted">
                                                {searchTerm ? 'Try adjusting your search criteria' : 'Add a payment to get started'}
                                            </small>
                                            <div className="mt-2">
                                                <Button variant="outline-primary" size="sm" onClick={handleRefresh}>
                                                    <FontAwesomeIcon icon={faSync} className="me-1" />
                                                    Refresh
                                                </Button>
                                                <Button variant="primary" size="sm" className="ms-2" onClick={handleAddPayment}>
                                                    <FontAwesomeIcon icon={faPlus} className="me-1" />
                                                    Add Payment
                                                </Button>
                                            </div>
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
                                        const paidAmount = transaction.paidAmount || 0;
                                        const outstanding = transaction.pendingAmount || (transaction.amount - paidAmount);
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
            <Modal
                show={showAddPaymentModal || showEditPaymentModal}
                onHide={() => {
                    setShowAddPaymentModal(false);
                    setShowEditPaymentModal(false);
                    setSelectedPayment(null);
                    setSelectedTransaction(null);
                }}
                size="lg"
            >
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
                                        <option value="">Select Transaction (Optional)</option>
                                        {outstandingTransactions.map(transaction => {
                                            const paidAmount = transaction.paidAmount || 0;
                                            const outstanding = transaction.pendingAmount || (transaction.amount - paidAmount);
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
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentDate: e.target.value }))}
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
                                            step="0.01"
                                            value={paymentForm.amount}
                                            onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                                            placeholder="0.00"
                                            required
                                        />
                                    </InputGroup>
                                    {selectedTransaction && (
                                        <Form.Text className="text-muted">
                                            Outstanding: {formatCurrency(selectedTransaction.pendingAmount || (selectedTransaction.amount - selectedTransaction.paidAmount))}
                                        </Form.Text>
                                    )}
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Payment Method</Form.Label>
                                    <Form.Select
                                        value={paymentForm.paymentMethod}
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="card">Card</option>
                                        <option value="bank_transfer">Bank Transfer</option>
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
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
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
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Additional notes"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setShowAddPaymentModal(false);
                            setShowEditPaymentModal(false);
                            setSelectedPayment(null);
                            setSelectedTransaction(null);
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmitPayment}
                        disabled={!paymentForm.amount || parseFloat(paymentForm.amount) <= 0}
                    >
                        <FontAwesomeIcon icon={faMoneyBillWave} className="me-1" />
                        {selectedPayment ? 'Update Payment' : 'Add Payment'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default PartyPayments;