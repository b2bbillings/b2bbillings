import React, { useState } from 'react';
import { Container, Row, Col, Button, Table, Badge, Dropdown, InputGroup, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSearch,
    faChartLine,
    faFileExcel,
    faPrint,
    faFilter,
    faEllipsisV,
    faEye,
    faEdit,
    faTrash,
    faCopy,
    faShare
} from '@fortawesome/free-solid-svg-icons';

function SalesInvoicesTable({
    transactions = [],
    onViewTransaction,
    onEditTransaction,
    onDeleteTransaction,
    onPrintTransaction,
    onShareTransaction
}) {
    const [searchQuery, setSearchQuery] = useState('');

    // Filter transactions based on search query
    const filteredTransactions = transactions.filter(transaction =>
        transaction.partyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.invoiceNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.transaction?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.paymentType?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatCurrency = (amount) => {
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getTransactionIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'sale': return '💰';
            case 'purchase': return '🛒';
            case 'return': return '↩️';
            case 'payment': return '💳';
            default: return '📄';
        }
    };

    const getPaymentTypeVariant = (paymentType) => {
        switch (paymentType?.toLowerCase()) {
            case 'cash': return 'success';
            case 'credit': return 'warning';
            case 'online': return 'info';
            case 'cheque': return 'secondary';
            default: return 'light';
        }
    };

    const getTransactionVariant = (transaction) => {
        switch (transaction?.toLowerCase()) {
            case 'sale': return 'success';
            case 'purchase': return 'primary';
            case 'return': return 'danger';
            case 'payment': return 'info';
            default: return 'light';
        }
    };

    return (
        <>
            <div className="sales-invoices-table-container">
                <div className="sales-table-card border-0">
                    <div className="sales-table-header bg-gradient-purple border-0 pb-0">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <h6 className="fw-bold mb-1 text-white fs-6">Sales Invoices</h6>
                                <small className="text-white-50 small">
                                    {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
                                </small>
                            </div>
                            <div className="d-flex gap-2 align-items-center">
                                <InputGroup style={{ width: '250px' }}>
                                    <InputGroup.Text className="bg-white bg-opacity-25 border-white border-opacity-25 text-white">
                                        <FontAwesomeIcon icon={faSearch} className="text-white fa-sm" />
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search invoices..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="border-white border-opacity-25 bg-white bg-opacity-25 text-white placeholder-white-50 small search-input"
                                        size="sm"
                                    />
                                </InputGroup>
                                <div className="d-flex gap-1">
                                    <Button variant="outline-light" size="sm" className="table-action-btn">
                                        <FontAwesomeIcon icon={faChartLine} className="fa-sm" />
                                    </Button>
                                    <Button variant="outline-light" size="sm" className="table-action-btn">
                                        <FontAwesomeIcon icon={faFileExcel} className="fa-sm" />
                                    </Button>
                                    <Button variant="outline-light" size="sm" className="table-action-btn">
                                        <FontAwesomeIcon icon={faPrint} className="fa-sm" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="sales-table-body p-0">
                        <div className="table-responsive">
                            <Table className="mb-0 sales-transactions-table">
                                <thead>
                                    <tr>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold small">
                                            <div className="d-flex align-items-center">
                                                <span>Date</span>
                                                <FontAwesomeIcon icon={faFilter} className="ms-2 filter-icon " />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold small">
                                            <div className="d-flex align-items-center">
                                                <span>Invoice No</span>
                                                <FontAwesomeIcon icon={faFilter} className="ms-2 filter-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold small">
                                            <div className="d-flex align-items-center">
                                                <span>Party Name</span>
                                                <FontAwesomeIcon icon={faFilter} className="ms-2 filter-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold small">
                                            <div className="d-flex align-items-center">
                                                <span>Transaction</span>
                                                <FontAwesomeIcon icon={faFilter} className="ms-2 filter-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold small">
                                            <div className="d-flex align-items-center">
                                                <span>Payment Type</span>
                                                <FontAwesomeIcon icon={faFilter} className="ms-2 filter-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold text-end small">
                                            <div className="d-flex align-items-center justify-content-end">
                                                <span>Amount</span>
                                                <FontAwesomeIcon icon={faFilter} className="ms-2 filter-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold text-end small">
                                            <div className="d-flex align-items-center justify-content-end">
                                                <span>Balance</span>
                                                <FontAwesomeIcon icon={faFilter} className="ms-2 filter-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold text-center small">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center text-muted py-4 border-0">
                                                <div className="empty-state">
                                                    <div className="mb-2">📊</div>
                                                    <div className="fw-semibold mb-1 small text-purple">No invoices found</div>
                                                    <small className="small text-muted">
                                                        {searchQuery
                                                            ? 'Try adjusting your search terms'
                                                            : 'No sales invoices available'
                                                        }
                                                    </small>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTransactions.map((transaction, index) => (
                                            <tr key={transaction.id} className="sales-transaction-row">
                                                <td className="border-0 py-2">
                                                    <span className="text-dark fw-medium small">
                                                        {formatDate(transaction.date)}
                                                    </span>
                                                </td>
                                                <td className="border-0 py-2">
                                                    <div className="invoice-number">
                                                        <span className="fw-semibold text-primary small">
                                                            {transaction.invoiceNo}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="border-0 py-2">
                                                    <div className="party-info">
                                                        <div className="fw-medium text-dark small">{transaction.partyName}</div>
                                                        {transaction.partyPhone && (
                                                            <small className="text-purple-muted" style={{ fontSize: '0.7rem' }}>
                                                                {transaction.partyPhone}
                                                            </small>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="border-0 py-2">
                                                    <div className="d-flex align-items-center">
                                                        <span className="me-1 small">{getTransactionIcon(transaction.transaction)}</span>
                                                        <Badge
                                                            bg={getTransactionVariant(transaction.transaction)}
                                                            className="px-2 py-1 text-capitalize transaction-badge small"
                                                        >
                                                            {transaction.transaction}
                                                        </Badge>
                                                    </div>
                                                </td>
                                                <td className="border-0 py-2">
                                                    <Badge
                                                        bg={getPaymentTypeVariant(transaction.paymentType)}
                                                        className="px-2 py-1 payment-badge small"
                                                        text={getPaymentTypeVariant(transaction.paymentType) === 'light' ? 'dark' : 'white'}
                                                    >
                                                        {transaction.paymentType}
                                                    </Badge>
                                                </td>
                                                <td className="border-0 py-2 text-end fw-bold small text-success">
                                                    {formatCurrency(transaction.amount)}
                                                </td>
                                                <td className="border-0 py-2 text-end fw-semibold text-dark small">
                                                    {formatCurrency(transaction.balance)}
                                                </td>
                                                <td className="border-0 py-2 text-center">
                                                    <div className="d-flex gap-1 align-items-center justify-content-center">
                                                        <Button
                                                            variant="outline-primary"
                                                            size="sm"
                                                            className="action-btn"
                                                            title="Print"
                                                            onClick={() => onPrintTransaction(transaction)}
                                                        >
                                                            <FontAwesomeIcon icon={faPrint} />
                                                        </Button>
                                                        <Button
                                                            variant="outline-info"
                                                            size="sm"
                                                            className="action-btn"
                                                            title="Share"
                                                            onClick={() => onShareTransaction(transaction)}
                                                        >
                                                            <FontAwesomeIcon icon={faShare} />
                                                        </Button>
                                                        <Dropdown>
                                                            <Dropdown.Toggle
                                                                variant="outline-secondary"
                                                                size="sm"
                                                                className="action-btn dropdown-toggle-no-caret"
                                                            >
                                                                <FontAwesomeIcon icon={faEllipsisV} />
                                                            </Dropdown.Toggle>
                                                            <Dropdown.Menu align="end" className="shadow-lg border-0">
                                                                <Dropdown.Item
                                                                    onClick={() => onViewTransaction(transaction)}
                                                                    className="dropdown-item-enhanced"
                                                                >
                                                                    <FontAwesomeIcon icon={faEye} className="me-2 text-primary" />
                                                                    View Details
                                                                </Dropdown.Item>
                                                                <Dropdown.Item
                                                                    onClick={() => onEditTransaction(transaction)}
                                                                    className="dropdown-item-enhanced"
                                                                >
                                                                    <FontAwesomeIcon icon={faEdit} className="me-2 text-warning" />
                                                                    Edit Invoice
                                                                </Dropdown.Item>
                                                                <Dropdown.Divider />
                                                                <Dropdown.Item
                                                                    onClick={() => onDeleteTransaction(transaction)}
                                                                    className="dropdown-item-enhanced text-danger"
                                                                >
                                                                    <FontAwesomeIcon icon={faTrash} className="me-2" />
                                                                    Delete Invoice
                                                                </Dropdown.Item>
                                                            </Dropdown.Menu>
                                                        </Dropdown>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </div>
                </div>
            </div>




            {/* Enhanced Purple Theme Styles */}
            
            <style>
                {`
                .sales-invoices-table-container {
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                    overflow: hidden;
                }

                .sales-table-card {
                    border-radius: 16px;
                    overflow: hidden;
                }

                .bg-gradient-purple {
                    background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 50%, #b794f6 100%);
                    padding: 1.25rem 1.5rem 0.75rem;
                }

                .bg-gradient-light-purple {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.08) 0%, rgba(156, 136, 255, 0.08) 50%, rgba(183, 148, 246, 0.08) 100%);
                }

                .text-purple {
                    color: #6c63ff !important;
                }

                .text-purple-muted {
                    color: #9c88ff !important;
                }

                .placeholder-white-50::placeholder {
                    color: rgba(255, 255, 255, 0.7) !important;
                }

                .search-input:focus {
                    background: rgba(255, 255, 255, 0.35) !important;
                    border-color: rgba(255, 255, 255, 0.5) !important;
                    box-shadow: 0 0 0 0.2rem rgba(255, 255, 255, 0.25) !important;
                    color: white !important;
                }

                .search-input:focus::placeholder {
                    color: rgba(255, 255, 255, 0.8) !important;
                }

                .table-action-btn {
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                }

                .table-action-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    border-color: rgba(255, 255, 255, 0.5);
                    color: white;
                    transform: translateY(-1px);
                }

                .sales-transactions-table {
                    font-size: 0.8rem;
                }

                .sales-transactions-table th {
                    font-size: 0.7rem;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                    padding: 0.75rem 1rem;
                    font-weight: 600;
                    border-bottom: 2px solid rgba(108, 99, 255, 0.1);
                }

                .sales-transactions-table td {
                    padding: 0.5rem 1rem;
                    vertical-align: middle;
                    font-size: 0.8rem;
                }

                .sales-transaction-row {
                    border-bottom: 1px solid rgba(108, 99, 255, 0.08);
                    transition: all 0.2s ease;
                }

                .sales-transaction-row:hover {
                    background: rgba(108, 99, 255, 0.02);
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(108, 99, 255, 0.1);
                }

                .sales-transaction-row:last-child {
                    border-bottom: none;
                }

                .filter-icon {
                    opacity: 0.4;
                    font-size: 0.4rem;
                    cursor: pointer;
                    transition: opacity 0.2s ease;
                }

                .filter-icon:hover {
                    opacity: 0.7;
                }

                .invoice-number {
                    background: rgba(108, 99, 255, 0.1);
                    padding: 4px 8px;
                    border-radius: 6px;
                    display: inline-block;
                }

                .party-info {
                    max-width: 180px;
                }

                .transaction-badge,
                .payment-badge {
                    font-size: 0.65rem;
                    font-weight: 600;
                    border: none;
                    border-radius: 6px;
                    padding: 4px 8px !important;
                }

                .action-btn {
                    width: 32px;
                    height: 32px;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                    font-size: 0.7rem;
                }

                .action-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                }

                .dropdown-toggle-no-caret::after {
                    display: none;
                }

                .dropdown-item-enhanced {
                    padding: 0.5rem 1rem;
                    font-size: 0.8rem;
                    transition: all 0.2s ease;
                    border-radius: 4px;
                    margin: 2px 4px;
                }

                .dropdown-item-enhanced:hover {
                    background: rgba(108, 99, 255, 0.1);
                    transform: translateX(4px);
                }

                .empty-state {
                    font-size: 0.8rem;
                    padding: 2rem;
                }

                .empty-state div:first-child {
                    font-size: 2.5rem;
                    opacity: 0.6;
                    filter: grayscale(0.3);
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .bg-gradient-purple {
                        padding: 1rem;
                    }

                    .sales-table-header .d-flex {
                        flex-direction: column;
                        gap: 1rem;
                    }

                    .sales-transactions-table th,
                    .sales-transactions-table td {
                        padding: 0.4rem 0.6rem;
                        font-size: 0.75rem;
                    }

                    .sales-transactions-table th {
                        font-size: 0.65rem;
                    }

                    .input-group {
                        width: 100% !important;
                    }

                    .action-btn {
                        width: 28px;
                        height: 28px;
                        font-size: 0.65rem;
                    }

                    .transaction-badge,
                    .payment-badge {
                        font-size: 0.6rem;
                        padding: 2px 6px !important;
                    }

                    .filter-icon {
                        font-size: 0.35rem;
                    }
                }

                @media (max-width: 576px) {
                    .sales-transactions-table {
                        font-size: 0.7rem;
                    }

                    /* Hide some columns on mobile */
                    .sales-transactions-table th:nth-child(5),
                    .sales-transactions-table td:nth-child(5) {
                        display: none;
                    }

                    .sales-transactions-table th:nth-child(7),
                    .sales-transactions-table td:nth-child(7) {
                        display: none;
                    }

                    .sales-transactions-table th,
                    .sales-transactions-table td {
                        padding: 0.3rem 0.5rem;
                        font-size: 0.7rem;
                    }

                    .party-info {
                        max-width: 120px;
                    }

                    .filter-icon {
                        font-size: 0.3rem;
                    }
                }

                /* Animations */
                @keyframes slideInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .sales-transaction-row {
                    animation: slideInUp 0.3s ease-out;
                }

                .sales-transaction-row:nth-child(odd) {
                    animation-delay: 0.05s;
                }

                .sales-transaction-row:nth-child(even) {
                    animation-delay: 0.1s;
                }

                /* Enhanced Purple Badge Variants */
                .badge.bg-success {
                    background: linear-gradient(135deg, #10b981 0%, #34d399 100%) !important;
                }

                .badge.bg-primary {
                    background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 100%) !important;
                }

                .badge.bg-danger {
                    background: linear-gradient(135deg, #ef4444 0%, #f87171 100%) !important;
                }

                .badge.bg-info {
                    background: linear-gradient(135deg, #06b6d4 0%, #38bdf8 100%) !important;
                }

                .badge.bg-warning {
                    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%) !important;
                }

                .badge.bg-secondary {
                    background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%) !important;
                }

                .badge.bg-light {
                    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%) !important;
                    color: #374151 !important;
                }

                /* Purple Theme Specific Styling */
                .text-primary {
                    color: #6c63ff !important;
                }

                /* Enhanced Purple Hover Effects */
                .sales-transaction-row:hover {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.02) 0%, rgba(156, 136, 255, 0.02) 100%);
                }

                .invoice-number {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.1) 0%, rgba(156, 136, 255, 0.1) 100%);
                }
                `}
            </style>
        </>
    );
}

export default SalesInvoicesTable;