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
        if (!amount && amount !== 0) return '₹0';

        // Ultra compact currency formatting
        if (amount >= 10000000) { // 1 crore
            return `₹${(amount / 10000000).toFixed(1)}Cr`;
        } else if (amount >= 100000) { // 1 lakh
            return `₹${(amount / 100000).toFixed(1)}L`;
        } else if (amount >= 1000) { // 1 thousand
            return `₹${(amount / 1000).toFixed(1)}K`;
        }
        return `₹${Math.round(amount)}`;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit'
        }); // Only DD/MM format for compactness
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
                    {/* Ultra Compact Header */}
                    <div className="sales-table-header bg-gradient-purple border-0 pb-0">
                        <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap">
                            <div className="header-info">
                                <h6 className="fw-bold mb-1 text-white">Sales Invoices</h6>
                                <small className="text-white-50" style={{ fontSize: '0.65rem' }}>
                                    {filteredTransactions.length} records
                                </small>
                            </div>
                            <div className="d-flex gap-1 align-items-center flex-wrap">
                                <InputGroup className="search-group">
                                    <InputGroup.Text className="bg-white bg-opacity-25 border-white border-opacity-25 text-white px-2">
                                        <FontAwesomeIcon icon={faSearch} className="text-white" style={{ fontSize: '0.65rem' }} />
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="border-white border-opacity-25 bg-white bg-opacity-25 text-white placeholder-white-50 search-input"
                                        size="sm"
                                        style={{ fontSize: '0.75rem' }}
                                    />
                                </InputGroup>
                                <div className="d-flex gap-1">
                                    <Button variant="outline-light" size="sm" className="table-action-btn" title="Export">
                                        <FontAwesomeIcon icon={faFileExcel} style={{ fontSize: '0.6rem' }} />
                                    </Button>
                                    <Button variant="outline-light" size="sm" className="table-action-btn" title="Print">
                                        <FontAwesomeIcon icon={faPrint} style={{ fontSize: '0.6rem' }} />
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
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold">
                                            <div className="d-flex align-items-center">
                                                <span>Date</span>
                                                <FontAwesomeIcon icon={faFilter} className="ms-1 filter-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold">
                                            <div className="d-flex align-items-center">
                                                <span>Invoice</span>
                                                <FontAwesomeIcon icon={faFilter} className="ms-1 filter-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold">
                                            <div className="d-flex align-items-center">
                                                <span>Party</span>
                                                <FontAwesomeIcon icon={faFilter} className="ms-1 filter-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold">
                                            <div className="d-flex align-items-center">
                                                <span>Type</span>
                                                <FontAwesomeIcon icon={faFilter} className="ms-1 filter-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold">
                                            <div className="d-flex align-items-center">
                                                <span>Payment</span>
                                                <FontAwesomeIcon icon={faFilter} className="ms-1 filter-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold text-center">
                                            <div className="d-flex align-items-center justify-content-center">
                                                <span>CGST</span>
                                                <FontAwesomeIcon icon={faFilter} className="ms-1 filter-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold text-center">
                                            <div className="d-flex align-items-center justify-content-center">
                                                <span>SGST</span>
                                                <FontAwesomeIcon icon={faFilter} className="ms-1 filter-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold text-end">
                                            <div className="d-flex align-items-center justify-content-end">
                                                <span>Amount</span>
                                                <FontAwesomeIcon icon={faFilter} className="ms-1 filter-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold text-end">
                                            <div className="d-flex align-items-center justify-content-end">
                                                <span>Balance</span>
                                                <FontAwesomeIcon icon={faFilter} className="ms-1 filter-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold text-center">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="text-center text-muted py-4 border-0">
                                                <div className="empty-state">
                                                    <div className="empty-icon mb-2">📊</div>
                                                    <h6 className="fw-semibold mb-1 text-purple" style={{ fontSize: '0.9rem' }}>No invoices found</h6>
                                                    <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>
                                                        {searchQuery
                                                            ? 'Try adjusting your search terms'
                                                            : 'Create your first sales invoice'
                                                        }
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTransactions.map((transaction, index) => (
                                            <tr key={transaction.id} className="sales-transaction-row">
                                                {/* Date - Ultra Compact */}
                                                <td className="border-0 py-2">
                                                    <div className="date-info">
                                                        <span className="text-dark fw-medium" style={{ fontSize: '0.75rem' }}>
                                                            {formatDate(transaction.date)}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Invoice Number - Compact */}
                                                <td className="border-0 py-2">
                                                    <div className="invoice-number">
                                                        <span className="fw-bold text-primary" style={{ fontSize: '0.75rem' }}>
                                                            {transaction.invoiceNo}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Party Name - Truncated */}
                                                <td className="border-0 py-2">
                                                    <div className="party-info">
                                                        <div className="fw-medium text-dark mb-0"
                                                            style={{ fontSize: '0.75rem' }}
                                                            title={transaction.partyName}>
                                                            {transaction.partyName?.length > 12
                                                                ? `${transaction.partyName.substring(0, 12)}...`
                                                                : transaction.partyName}
                                                        </div>
                                                        {transaction.partyPhone && (
                                                            <small className="text-purple-muted d-block" style={{ fontSize: '0.6rem' }}>
                                                                {transaction.partyPhone.substring(0, 10)}
                                                            </small>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Transaction Type - Icon + Badge */}
                                                <td className="border-0 py-2">
                                                    <div className="d-flex align-items-center">
                                                        <span className="me-1" style={{ fontSize: '0.7rem' }}>
                                                            {getTransactionIcon(transaction.transaction)}
                                                        </span>
                                                        <Badge
                                                            bg={getTransactionVariant(transaction.transaction)}
                                                            className="px-1 py-1 text-capitalize transaction-badge"
                                                            style={{ fontSize: '0.6rem' }}
                                                        >
                                                            {transaction.transaction?.substring(0, 4)}
                                                        </Badge>
                                                    </div>
                                                </td>

                                                {/* Payment Type - Small Badge */}
                                                <td className="border-0 py-2">
                                                    <Badge
                                                        bg={getPaymentTypeVariant(transaction.paymentType)}
                                                        className="px-1 py-1 payment-badge"
                                                        style={{ fontSize: '0.6rem' }}
                                                        text={getPaymentTypeVariant(transaction.paymentType) === 'light' ? 'dark' : 'white'}
                                                    >
                                                        {transaction.paymentType?.substring(0, 4)}
                                                    </Badge>
                                                </td>

                                                {/* CGST - Compact */}
                                                <td className="border-0 py-2 text-center">
                                                    <div className="tax-info">
                                                        <span className="fw-semibold text-info" style={{ fontSize: '0.7rem' }}>
                                                            {formatCurrency(transaction.cgst || 0)}
                                                        </span>
                                                        {transaction.cgstPercent && (
                                                            <div className="tax-percent">
                                                                <small className="text-muted" style={{ fontSize: '0.55rem' }}>
                                                                    ({transaction.cgstPercent}%)
                                                                </small>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* SGST - Compact */}
                                                <td className="border-0 py-2 text-center">
                                                    <div className="tax-info">
                                                        <span className="fw-semibold text-warning" style={{ fontSize: '0.7rem' }}>
                                                            {formatCurrency(transaction.sgst || 0)}
                                                        </span>
                                                        {transaction.sgstPercent && (
                                                            <div className="tax-percent">
                                                                <small className="text-muted" style={{ fontSize: '0.55rem' }}>
                                                                    ({transaction.sgstPercent}%)
                                                                </small>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Total Amount - Prominent but Compact */}
                                                <td className="border-0 py-2 text-end">
                                                    <div className="amount-info">
                                                        <span className="fw-bold text-success" style={{ fontSize: '0.8rem' }}>
                                                            {formatCurrency(transaction.amount)}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Balance - Compact */}
                                                <td className="border-0 py-2 text-end">
                                                    <div className="balance-info">
                                                        <span className={`fw-bold ${transaction.balance > 0 ? 'text-danger' : 'text-success'}`}
                                                            style={{ fontSize: '0.75rem' }}>
                                                            {formatCurrency(transaction.balance)}
                                                        </span>
                                                        {transaction.balance > 0 && (
                                                            <small className="text-danger d-block" style={{ fontSize: '0.55rem' }}>
                                                                Due
                                                            </small>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Actions - Ultra Compact */}
                                                <td className="border-0 py-2 text-center">
                                                    <div className="d-flex gap-1 align-items-center justify-content-center">
                                                        <Button
                                                            variant="outline-primary"
                                                            size="sm"
                                                            className="action-btn"
                                                            title="Print"
                                                            onClick={() => onPrintTransaction(transaction)}
                                                        >
                                                            <FontAwesomeIcon icon={faPrint} style={{ fontSize: '0.6rem' }} />
                                                        </Button>
                                                        <Dropdown>
                                                            <Dropdown.Toggle
                                                                variant="outline-secondary"
                                                                size="sm"
                                                                className="action-btn dropdown-toggle-no-caret"
                                                                title="More"
                                                            >
                                                                <FontAwesomeIcon icon={faEllipsisV} style={{ fontSize: '0.6rem' }} />
                                                            </Dropdown.Toggle>
                                                            <Dropdown.Menu align="end" className="shadow-lg border-0 dropdown-menu-enhanced">
                                                                <Dropdown.Item
                                                                    onClick={() => onViewTransaction(transaction)}
                                                                    className="dropdown-item-enhanced"
                                                                >
                                                                    <FontAwesomeIcon icon={faEye} className="me-2 text-primary" />
                                                                    View
                                                                </Dropdown.Item>
                                                                <Dropdown.Item
                                                                    onClick={() => onEditTransaction(transaction)}
                                                                    className="dropdown-item-enhanced"
                                                                >
                                                                    <FontAwesomeIcon icon={faEdit} className="me-2 text-warning" />
                                                                    Edit
                                                                </Dropdown.Item>
                                                                <Dropdown.Item
                                                                    onClick={() => onShareTransaction(transaction)}
                                                                    className="dropdown-item-enhanced"
                                                                >
                                                                    <FontAwesomeIcon icon={faShare} className="me-2 text-info" />
                                                                    Share
                                                                </Dropdown.Item>
                                                                <Dropdown.Divider />
                                                                <Dropdown.Item
                                                                    onClick={() => onDeleteTransaction(transaction)}
                                                                    className="dropdown-item-enhanced text-danger"
                                                                >
                                                                    <FontAwesomeIcon icon={faTrash} className="me-2" />
                                                                    Delete
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

                        {/* Compact Footer */}
                        {filteredTransactions.length > 0 && (
                            <div className="table-footer p-2 bg-light border-top">
                                <div className="d-flex justify-content-between align-items-center">
                                    <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                        {filteredTransactions.length} of {transactions.length} records
                                    </small>
                                    <div className="d-flex gap-1">
                                        <Button variant="outline-primary" size="sm" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}>
                                            Prev
                                        </Button>
                                        <Button variant="outline-primary" size="sm" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}>
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Ultra Compact Table Styles - ALL COLUMNS VISIBLE */}
            <style>
                {`
                .sales-invoices-table-container {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
                    overflow: hidden;
                    margin: 0;
                    height: fit-content;
                    width: 100%;
                }

                .sales-table-card {
                    border-radius: 12px;
                    overflow: hidden;
                }

                .bg-gradient-purple {
                    background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 50%, #b794f6 100%);
                    padding: 0.75rem 1rem 0.5rem;
                }

                .bg-gradient-light-purple {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.06) 0%, rgba(156, 136, 255, 0.06) 50%, rgba(183, 148, 246, 0.06) 100%);
                }

                .text-purple {
                    color: #6c63ff !important;
                }

                .text-purple-muted {
                    color: #9c88ff !important;
                }

                .header-info h6 {
                    font-size: 0.9rem;
                    margin-bottom: 0.1rem;
                }

                .search-group {
                    width: 180px;
                    min-width: 150px;
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

                .table-action-btn {
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                    padding: 0;
                }

                .table-action-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    border-color: rgba(255, 255, 255, 0.5);
                    color: white;
                    transform: translateY(-1px);
                }

                /* ULTRA COMPACT TABLE - ALL COLUMNS VISIBLE */
                .sales-transactions-table {
                    font-size: 0.7rem;
                    table-layout: fixed;
                    width: 100%;
                }

                .sales-transactions-table th {
                    font-size: 0.6rem;
                    text-transform: uppercase;
                    letter-spacing: 0.2px;
                    padding: 0.5rem 0.3rem;
                    font-weight: 600;
                    border-bottom: 2px solid rgba(108, 99, 255, 0.1);
                    white-space: nowrap;
                    vertical-align: middle;
                }

                .sales-transactions-table td {
                    padding: 0.4rem 0.3rem;
                    vertical-align: middle;
                    font-size: 0.7rem;
                    border-bottom: 1px solid rgba(108, 99, 255, 0.05);
                }

                /* OPTIMIZED COLUMN WIDTHS FOR ALL COLUMNS VISIBILITY */
                .sales-transactions-table th:nth-child(1), /* Date */
                .sales-transactions-table td:nth-child(1) {
                    width: 8%;
                    min-width: 60px;
                }

                .sales-transactions-table th:nth-child(2), /* Invoice */
                .sales-transactions-table td:nth-child(2) {
                    width: 10%;
                    min-width: 80px;
                }

                .sales-transactions-table th:nth-child(3), /* Party */
                .sales-transactions-table td:nth-child(3) {
                    width: 15%;
                    min-width: 100px;
                }

                .sales-transactions-table th:nth-child(4), /* Type */
                .sales-transactions-table td:nth-child(4) {
                    width: 8%;
                    min-width: 70px;
                }

                .sales-transactions-table th:nth-child(5), /* Payment */
                .sales-transactions-table td:nth-child(5) {
                    width: 8%;
                    min-width: 70px;
                }

                .sales-transactions-table th:nth-child(6), /* CGST */
                .sales-transactions-table td:nth-child(6) {
                    width: 10%;
                    min-width: 70px;
                }

                .sales-transactions-table th:nth-child(7), /* SGST */
                .sales-transactions-table td:nth-child(7) {
                    width: 10%;
                    min-width: 70px;
                }

                .sales-transactions-table th:nth-child(8), /* Amount */
                .sales-transactions-table td:nth-child(8) {
                    width: 12%;
                    min-width: 80px;
                }

                .sales-transactions-table th:nth-child(9), /* Balance */
                .sales-transactions-table td:nth-child(9) {
                    width: 10%;
                    min-width: 70px;
                }

                .sales-transactions-table th:nth-child(10), /* Actions */
                .sales-transactions-table td:nth-child(10) {
                    width: 9%;
                    min-width: 70px;
                }

                .sales-transaction-row {
                    transition: all 0.2s ease;
                }

                .sales-transaction-row:hover {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.02) 0%, rgba(156, 136, 255, 0.02) 100%);
                    transform: translateY(-1px);
                    box-shadow: 0 2px 6px rgba(108, 99, 255, 0.08);
                }

                .filter-icon {
                    opacity: 0.4;
                    font-size: 0.35rem !important;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    color: #9c88ff;
                }

                .filter-icon:hover {
                    opacity: 0.7;
                    transform: scale(1.1);
                    color: #6c63ff;
                }

                .date-info {
                    min-width: 50px;
                }

                .invoice-number {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.08) 0%, rgba(156, 136, 255, 0.08) 100%);
                    padding: 2px 4px;
                    border-radius: 4px;
                    display: inline-block;
                }

                .party-info {
                    min-width: 80px;
                    max-width: 100px;
                    overflow: hidden;
                }

                .tax-info {
                    text-align: center;
                    min-width: 60px;
                }

                .tax-percent {
                    line-height: 1;
                    margin-top: 1px;
                }

                .amount-info {
                    min-width: 70px;
                }

                .balance-info {
                    min-width: 60px;
                }

                .transaction-badge,
                .payment-badge {
                    font-size: 0.55rem;
                    font-weight: 600;
                    border: none;
                    border-radius: 3px;
                    padding: 2px 4px !important;
                    white-space: nowrap;
                }

                .action-btn {
                    width: 24px;
                    height: 24px;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                }

                .action-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
                }

                .dropdown-toggle-no-caret::after {
                    display: none;
                }

                .dropdown-menu-enhanced {
                    border-radius: 6px;
                    padding: 0.3rem;
                    min-width: 120px;
                    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
                }

                .dropdown-item-enhanced {
                    padding: 0.4rem 0.6rem;
                    font-size: 0.7rem;
                    transition: all 0.2s ease;
                    border-radius: 4px;
                    margin: 1px 0;
                }

                .dropdown-item-enhanced:hover {
                    background: rgba(108, 99, 255, 0.08);
                    transform: translateX(2px);
                }

                .empty-state {
                    padding: 2rem 1rem;
                }

                .empty-icon {
                    font-size: 2rem;
                    opacity: 0.6;
                }

                .table-footer {
                    background: rgba(108, 99, 255, 0.02) !important;
                    border-top: 1px solid rgba(108, 99, 255, 0.08) !important;
                }

                /* RESPONSIVE DESIGN - MAINTAIN ALL COLUMNS */
                @media (max-width: 1400px) {
                    .search-group {
                        width: 160px;
                    }

                    .sales-transactions-table th,
                    .sales-transactions-table td {
                        padding: 0.35rem 0.25rem;
                        font-size: 0.65rem;
                    }

                    .sales-transactions-table th {
                        font-size: 0.55rem;
                    }
                }

                @media (max-width: 1200px) {
                    .search-group {
                        width: 140px;
                    }

                    .sales-transactions-table th,
                    .sales-transactions-table td {
                        padding: 0.3rem 0.2rem;
                        font-size: 0.6rem;
                    }

                    .sales-transactions-table th {
                        font-size: 0.5rem;
                    }

                    .party-info {
                        max-width: 80px;
                    }

                    .action-btn {
                        width: 22px;
                        height: 22px;
                    }
                }

                @media (max-width: 992px) {
                    .bg-gradient-purple {
                        padding: 0.5rem 0.75rem 0.25rem;
                    }

                    .sales-table-header .d-flex {
                        flex-direction: column;
                        gap: 0.5rem;
                        align-items: stretch !important;
                    }

                    .search-group {
                        width: 100%;
                        max-width: 200px;
                    }

                    /* Still show all columns but with smaller content */
                    .sales-transactions-table th,
                    .sales-transactions-table td {
                        padding: 0.25rem 0.15rem;
                        font-size: 0.55rem;
                    }

                    .sales-transactions-table th {
                        font-size: 0.45rem;
                    }

                    .party-info {
                        max-width: 70px;
                    }
                }

                @media (max-width: 768px) {
                    .bg-gradient-purple {
                        padding: 0.4rem 0.5rem 0.2rem;
                    }

                    .sales-transactions-table th,
                    .sales-transactions-table td {
                        padding: 0.2rem 0.1rem;
                        font-size: 0.5rem;
                    }

                    .sales-transactions-table th {
                        font-size: 0.4rem;
                    }

                    .action-btn {
                        width: 20px;
                        height: 20px;
                    }

                    .party-info {
                        max-width: 60px;
                    }

                    .filter-icon {
                        font-size: 0.3rem !important;
                    }

                    /* Horizontal scroll for mobile to maintain all columns */
                    .table-responsive {
                        overflow-x: auto;
                        -webkit-overflow-scrolling: touch;
                    }

                    .sales-transactions-table {
                        min-width: 800px; /* Force horizontal scroll instead of hiding columns */
                    }
                }

                /* Enhanced Colors */
                .text-primary { color: #6c63ff !important; }
                .text-success { color: #10b981 !important; }
                .text-warning { color: #f59e0b !important; }
                .text-info { color: #06b6d4 !important; }
                .text-danger { color: #ef4444 !important; }

                /* Badge Gradients */
                .badge.bg-success { background: linear-gradient(135deg, #10b981 0%, #34d399 100%) !important; }
                .badge.bg-primary { background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 100%) !important; }
                .badge.bg-danger { background: linear-gradient(135deg, #ef4444 0%, #f87171 100%) !important; }
                .badge.bg-info { background: linear-gradient(135deg, #06b6d4 0%, #38bdf8 100%) !important; }
                .badge.bg-warning { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%) !important; }
                .badge.bg-secondary { background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%) !important; }
                .badge.bg-light { background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%) !important; color: #374151 !important; }

                /* Smooth Animations */
                @keyframes slideInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .sales-transaction-row {
                    animation: slideInUp 0.3s ease-out;
                }

                /* Table Scroll Enhancement */
                .table-responsive::-webkit-scrollbar {
                    height: 4px;
                }

                .table-responsive::-webkit-scrollbar-track {
                    background: rgba(108, 99, 255, 0.05);
                    border-radius: 2px;
                }

                .table-responsive::-webkit-scrollbar-thumb {
                    background: rgba(108, 99, 255, 0.2);
                    border-radius: 2px;
                }

                .table-responsive::-webkit-scrollbar-thumb:hover {
                    background: rgba(108, 99, 255, 0.3);
                }
                `}
            </style>
        </>
    );
}

export default SalesInvoicesTable;