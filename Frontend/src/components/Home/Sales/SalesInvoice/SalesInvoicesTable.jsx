import React, { useState } from 'react';
import { Button, Table, Badge, Dropdown, InputGroup, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSearch,
    faFileExcel,
    faPrint,
    faSort,
    faEllipsisV,
    faEye,
    faEdit,
    faTrash,
    faShare,
    faArrowUp,
    faArrowDown
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
    const [sortField, setSortField] = useState('');
    const [sortDirection, setSortDirection] = useState('asc');

    const filteredTransactions = transactions.filter(transaction =>
        transaction.partyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.invoiceNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.transaction?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.paymentType?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return '₹0';

        if (amount >= 10000000) {
            return `₹${(amount / 10000000).toFixed(1)}Cr`;
        } else if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(1)}L`;
        } else if (amount >= 1000) {
            return `₹${(amount / 1000).toFixed(1)}K`;
        }
        return `₹${Math.round(amount)}`;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
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

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (field) => {
        if (sortField !== field) {
            return <FontAwesomeIcon icon={faSort} className="ms-1 text-muted" style={{ fontSize: '0.6rem' }} />;
        }
        return (
            <FontAwesomeIcon
                icon={sortDirection === 'asc' ? faArrowUp : faArrowDown}
                className="ms-1 text-primary"
                style={{ fontSize: '0.6rem' }}
            />
        );
    };

    return (
        <div className="sales-invoices-container">
            <div className="card border-0 shadow-sm">
                {/* Header */}
                <div className="card-header bg-primary text-white border-0">
                    <div className="row align-items-center">
                        <div className="col-md-6">
                            <h5 className="mb-1 fw-bold">Sales Invoices</h5>
                            <small className="text-white-50">
                                {filteredTransactions.length} records
                            </small>
                        </div>
                        <div className="col-md-6">
                            <div className="row g-2">
                                <div className="col-md-8">
                                    <InputGroup size="sm">
                                        <InputGroup.Text className="bg-white bg-opacity-25 border-white border-opacity-25 text-white">
                                            <FontAwesomeIcon icon={faSearch} />
                                        </InputGroup.Text>
                                        <Form.Control
                                            type="text"
                                            placeholder="Search invoices..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="border-white border-opacity-25 bg-white bg-opacity-25 text-white placeholder-white-50"
                                        />
                                    </InputGroup>
                                </div>
                                <div className="col-md-4">
                                    <div className="d-flex gap-1">
                                        <Button variant="outline-light" size="sm" title="Export">
                                            <FontAwesomeIcon icon={faFileExcel} />
                                        </Button>
                                        <Button variant="outline-light" size="sm" title="Print">
                                            <FontAwesomeIcon icon={faPrint} />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="card-body p-0">
                    <div className="table-responsive" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <Table className="mb-0 table-hover table-sm sticky-header">
                            <thead className="table-light sticky-top">
                                <tr>
                                    <th
                                        className="border-0 text-primary fw-semibold cursor-pointer px-2"
                                        onClick={() => handleSort('date')}
                                        style={{ minWidth: '65px', width: '65px' }}
                                    >
                                        <div className="d-flex align-items-center">
                                            <span style={{ fontSize: '0.7rem' }}>Date</span>
                                            {getSortIcon('date')}
                                        </div>
                                    </th>
                                    <th
                                        className="border-0 text-primary fw-semibold cursor-pointer px-2"
                                        onClick={() => handleSort('invoiceNo')}
                                        style={{ minWidth: '80px', width: '80px' }}
                                    >
                                        <div className="d-flex align-items-center">
                                            <span style={{ fontSize: '0.7rem' }}>Invoice</span>
                                            {getSortIcon('invoiceNo')}
                                        </div>
                                    </th>
                                    <th
                                        className="border-0 text-primary fw-semibold cursor-pointer px-2"
                                        onClick={() => handleSort('partyName')}
                                        style={{ minWidth: '100px', width: '100px' }}
                                    >
                                        <div className="d-flex align-items-center">
                                            <span style={{ fontSize: '0.7rem' }}>Party</span>
                                            {getSortIcon('partyName')}
                                        </div>
                                    </th>
                                    <th
                                        className="border-0 text-primary fw-semibold cursor-pointer px-2"
                                        onClick={() => handleSort('transaction')}
                                        style={{ minWidth: '70px', width: '70px' }}
                                    >
                                        <div className="d-flex align-items-center">
                                            <span style={{ fontSize: '0.7rem' }}>Type</span>
                                            {getSortIcon('transaction')}
                                        </div>
                                    </th>
                                    <th
                                        className="border-0 text-primary fw-semibold cursor-pointer px-2"
                                        onClick={() => handleSort('paymentType')}
                                        style={{ minWidth: '70px', width: '70px' }}
                                    >
                                        <div className="d-flex align-items-center">
                                            <span style={{ fontSize: '0.7rem' }}>Payment</span>
                                            {getSortIcon('paymentType')}
                                        </div>
                                    </th>
                                    <th
                                        className="border-0 text-primary fw-semibold text-center cursor-pointer px-2"
                                        onClick={() => handleSort('cgst')}
                                        style={{ minWidth: '60px', width: '60px' }}
                                    >
                                        <div className="d-flex align-items-center justify-content-center">
                                            <span style={{ fontSize: '0.7rem' }}>CGST</span>
                                            {getSortIcon('cgst')}
                                        </div>
                                    </th>
                                    <th
                                        className="border-0 text-primary fw-semibold text-center cursor-pointer px-2"
                                        onClick={() => handleSort('sgst')}
                                        style={{ minWidth: '60px', width: '60px' }}
                                    >
                                        <div className="d-flex align-items-center justify-content-center">
                                            <span style={{ fontSize: '0.7rem' }}>SGST</span>
                                            {getSortIcon('sgst')}
                                        </div>
                                    </th>
                                    <th
                                        className="border-0 text-primary fw-semibold text-end cursor-pointer px-2"
                                        onClick={() => handleSort('amount')}
                                        style={{ minWidth: '80px', width: '80px' }}
                                    >
                                        <div className="d-flex align-items-center justify-content-end">
                                            <span style={{ fontSize: '0.7rem' }}>Amount</span>
                                            {getSortIcon('amount')}
                                        </div>
                                    </th>
                                    <th
                                        className="border-0 text-primary fw-semibold text-end cursor-pointer px-2"
                                        onClick={() => handleSort('balance')}
                                        style={{ minWidth: '80px', width: '80px' }}
                                    >
                                        <div className="d-flex align-items-center justify-content-end">
                                            <span style={{ fontSize: '0.7rem' }}>Balance</span>
                                            {getSortIcon('balance')}
                                        </div>
                                    </th>
                                    <th
                                        className="border-0 text-primary fw-semibold text-center px-2 actions-column-header"
                                        style={{
                                            minWidth: '110px',
                                            width: '110px',
                                            position: 'sticky',
                                            right: 0,
                                            background: '#f8f9fa',
                                            zIndex: 30
                                        }}
                                    >
                                        <span style={{ fontSize: '0.7rem' }}>Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center text-muted py-5 border-0">
                                            <div className="d-flex flex-column align-items-center">
                                                <div className="mb-3" style={{ fontSize: '3rem', opacity: '0.5' }}>📊</div>
                                                <h6 className="fw-semibold mb-2 text-secondary">No invoices found</h6>
                                                <p className="text-muted mb-0">
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
                                        <tr key={transaction.id || index} className="align-middle">
                                            {/* Date */}
                                            <td className="border-0 px-2" style={{ width: '65px' }}>
                                                <span className="text-dark fw-medium" style={{ fontSize: '0.7rem' }}>
                                                    {formatDate(transaction.date)}
                                                </span>
                                            </td>

                                            {/* Invoice Number */}
                                            <td className="border-0 px-2" style={{ width: '80px' }}>
                                                <Badge bg="primary" bg-opacity="10" text="primary" className="fw-bold" style={{ fontSize: '0.6rem' }}>
                                                    {transaction.invoiceNo}
                                                </Badge>
                                            </td>

                                            {/* Party Name */}
                                            <td className="border-0 px-2" style={{ width: '100px' }}>
                                                <div>
                                                    <div className="fw-medium text-dark" title={transaction.partyName} style={{ fontSize: '0.7rem' }}>
                                                        {transaction.partyName?.length > 8
                                                            ? `${transaction.partyName.substring(0, 8)}...`
                                                            : transaction.partyName}
                                                    </div>
                                                    {transaction.partyPhone && (
                                                        <small className="text-muted d-block" style={{ fontSize: '0.6rem' }}>
                                                            {transaction.partyPhone.substring(0, 6)}
                                                        </small>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Transaction Type */}
                                            <td className="border-0 px-2" style={{ width: '70px' }}>
                                                <div className="d-flex align-items-center">
                                                    <span className="me-1" style={{ fontSize: '0.6rem' }}>
                                                        {getTransactionIcon(transaction.transaction)}
                                                    </span>
                                                    <Badge
                                                        bg={getTransactionVariant(transaction.transaction)}
                                                        text="dark"
                                                        className="text-capitalize"
                                                        style={{ fontSize: '0.55rem' }}
                                                    >
                                                        {transaction.transaction}
                                                    </Badge>
                                                </div>
                                            </td>

                                            {/* Payment Type */}
                                            <td className="border-0 px-2" style={{ width: '70px' }}>
                                                <Badge
                                                    bg={getPaymentTypeVariant(transaction.paymentType)}
                                                    text="dark"
                                                    style={{ fontSize: '0.55rem' }}
                                                >
                                                    {transaction.paymentType}
                                                </Badge>
                                            </td>

                                            {/* CGST */}
                                            <td className="border-0 text-center px-2" style={{ width: '60px' }}>
                                                <div>
                                                    <div className="fw-semibold text-info" style={{ fontSize: '0.65rem' }}>
                                                        {formatCurrency(transaction.cgst || 0)}
                                                    </div>
                                                    {transaction.cgstPercent && (
                                                        <small className="text-muted" style={{ fontSize: '0.55rem' }}>
                                                            ({transaction.cgstPercent}%)
                                                        </small>
                                                    )}
                                                </div>
                                            </td>

                                            {/* SGST */}
                                            <td className="border-0 text-center px-2" style={{ width: '60px' }}>
                                                <div>
                                                    <div className="fw-semibold text-warning" style={{ fontSize: '0.65rem' }}>
                                                        {formatCurrency(transaction.sgst || 0)}
                                                    </div>
                                                    {transaction.sgstPercent && (
                                                        <small className="text-muted" style={{ fontSize: '0.55rem' }}>
                                                            ({transaction.sgstPercent}%)
                                                        </small>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Total Amount */}
                                            <td className="border-0 text-end px-2" style={{ width: '80px' }}>
                                                <div className="fw-bold text-success" style={{ fontSize: '0.7rem' }}>
                                                    {formatCurrency(transaction.amount)}
                                                </div>
                                            </td>

                                            {/* Balance */}
                                            <td className="border-0 text-end px-2" style={{ width: '80px' }}>
                                                <div>
                                                    <div className={`fw-bold ${transaction.balance > 0 ? 'text-danger' : 'text-success'}`} style={{ fontSize: '0.7rem' }}>
                                                        {formatCurrency(transaction.balance)}
                                                    </div>
                                                    {transaction.balance > 0 && (
                                                        <small className="text-danger" style={{ fontSize: '0.55rem' }}>
                                                            Due
                                                        </small>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions - Sticky Right */}
                                            <td
                                                className="border-0 text-center px-2 actions-column"
                                                style={{
                                                    width: '110px',
                                                    position: 'sticky',
                                                    right: 0,
                                                    background: 'white',
                                                    zIndex: 20,
                                                    boxShadow: '-2px 0 4px rgba(0,0,0,0.05)'
                                                }}
                                            >
                                                <div className="d-flex gap-1 justify-content-center actions-wrapper">
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        title="Print"
                                                        onClick={() => onPrintTransaction(transaction)}
                                                        className="action-btn-print"
                                                    >
                                                        <FontAwesomeIcon icon={faPrint} style={{ fontSize: '0.7rem' }} />
                                                    </Button>
                                                    <div className="dropdown-container">
                                                        <Dropdown>
                                                            <Dropdown.Toggle
                                                                variant="outline-secondary"
                                                                size="sm"
                                                                className="dropdown-toggle-no-caret action-btn-menu"
                                                                title="More Actions"
                                                            >
                                                                <FontAwesomeIcon icon={faEllipsisV} style={{ fontSize: '0.7rem' }} />
                                                            </Dropdown.Toggle>
                                                            <Dropdown.Menu align="end" className="dropdown-menu-custom">
                                                                <Dropdown.Item
                                                                    onClick={() => onViewTransaction(transaction)}
                                                                    className="d-flex align-items-center dropdown-item-custom"
                                                                >
                                                                    <FontAwesomeIcon icon={faEye} className="me-2 text-primary" />
                                                                    View
                                                                </Dropdown.Item>
                                                                <Dropdown.Item
                                                                    onClick={() => onEditTransaction(transaction)}
                                                                    className="d-flex align-items-center dropdown-item-custom"
                                                                >
                                                                    <FontAwesomeIcon icon={faEdit} className="me-2 text-warning" />
                                                                    Edit
                                                                </Dropdown.Item>
                                                                <Dropdown.Item
                                                                    onClick={() => onShareTransaction(transaction)}
                                                                    className="d-flex align-items-center dropdown-item-custom"
                                                                >
                                                                    <FontAwesomeIcon icon={faShare} className="me-2 text-info" />
                                                                    Share
                                                                </Dropdown.Item>
                                                                <Dropdown.Divider />
                                                                <Dropdown.Item
                                                                    onClick={() => onDeleteTransaction(transaction)}
                                                                    className="d-flex align-items-center dropdown-item-custom text-danger"
                                                                >
                                                                    <FontAwesomeIcon icon={faTrash} className="me-2" />
                                                                    Delete
                                                                </Dropdown.Item>
                                                            </Dropdown.Menu>
                                                        </Dropdown>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </div>

                    {/* Footer */}
                    {filteredTransactions.length > 0 && (
                        <div className="card-footer bg-light border-0">
                            <div className="row align-items-center">
                                <div className="col-md-6">
                                    <small className="text-muted">
                                        Showing {filteredTransactions.length} of {transactions.length} records
                                    </small>
                                </div>
                                <div className="col-md-6">
                                    <div className="d-flex justify-content-end gap-2">
                                        <Button variant="outline-primary" size="sm">
                                            Previous
                                        </Button>
                                        <Button variant="outline-primary" size="sm">
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .sales-invoices-container {
                    padding: 0.5rem;
                    width: 100%;
                    overflow: hidden;
                }

                .card {
                    border-radius: 0.75rem;
                    overflow: hidden;
                    width: 100%;
                }

                .card-header {
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    border-bottom: none;
                    padding: 1rem;
                }

                .placeholder-white-50::placeholder {
                    color: rgba(255, 255, 255, 0.7);
                }

                .form-control:focus {
                    background: rgba(255, 255, 255, 0.35);
                    border-color: rgba(255, 255, 255, 0.5);
                    box-shadow: 0 0 0 0.2rem rgba(255, 255, 255, 0.25);
                    color: white;
                }

                .cursor-pointer {
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .cursor-pointer:hover {
                    background-color: rgba(99, 102, 241, 0.05);
                }

                .table-hover tbody tr:hover {
                    background-color: rgba(99, 102, 241, 0.02);
                    transition: all 0.2s ease;
                }

                .table-hover tbody tr:hover .actions-column {
                    background-color: rgba(99, 102, 241, 0.02);
                }

                .dropdown-toggle-no-caret::after {
                    display: none;
                }

                .badge {
                    font-weight: 600;
                }

                .table th {
                    border-bottom: 2px solid rgba(99, 102, 241, 0.1);
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    padding: 0.4rem 0.3rem;
                    white-space: nowrap;
                    background-color: #f8f9fa;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }

                .table td {
                    padding: 0.4rem 0.3rem;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                    vertical-align: middle;
                    white-space: nowrap;
                }

                .table-responsive {
                    overflow-x: auto;
                    overflow-y: auto;
                    max-width: 100%;
                    scrollbar-width: thin;
                    scrollbar-color: #6366f1 #f1f1f1;
                }

                .table-responsive::-webkit-scrollbar {
                    height: 8px;
                    width: 8px;
                }

                .table-responsive::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 4px;
                }

                .table-responsive::-webkit-scrollbar-thumb {
                    background: #6366f1;
                    border-radius: 4px;
                }

                .table-responsive::-webkit-scrollbar-thumb:hover {
                    background: #4f46e5;
                }

                .sticky-header {
                    position: relative;
                }

                .sticky-top {
                    position: sticky;
                    top: 0;
                    z-index: 1020;
                }

                .actions-column {
                    border-left: 1px solid rgba(0, 0, 0, 0.05);
                }

                .actions-column-header {
                    border-left: 1px solid rgba(0, 0, 0, 0.05);
                }

                .dropdown-container {
                    position: relative;
                    z-index: 1000;
                }

                .dropdown-menu-custom {
                    position: fixed;
                    z-index: 10000;
                    min-width: 140px;
                    padding: 0.5rem 0;
                    margin: 0;
                    font-size: 0.8rem;
                    background: white;
                    border: 1px solid rgba(0, 0, 0, 0.1);
                    border-radius: 0.5rem;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                }

                .dropdown-item-custom {
                    padding: 0.5rem 1rem;
                    font-size: 0.8rem;
                    transition: all 0.2s ease;
                }

                .dropdown-item-custom:hover {
                    background-color: rgba(99, 102, 241, 0.05);
                }

                .action-btn-print,
                .action-btn-menu {
                    padding: 0.25rem 0.4rem;
                    font-size: 0.7rem;
                    min-width: 32px;
                    height: 28px;
                    border-radius: 0.25rem;
                    transition: all 0.2s ease;
                }

                .action-btn-print:hover,
                .action-btn-menu:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .actions-wrapper {
                    position: relative;
                    z-index: 1;
                }

                @media (max-width: 768px) {
                    .sales-invoices-container {
                        padding: 0.25rem;
                    }

                    .card-header {
                        padding: 0.75rem;
                    }

                    .table-responsive {
                        font-size: 0.7rem;
                    }

                    .table th,
                    .table td {
                        padding: 0.3rem 0.2rem;
                    }

                    .actions-column {
                        width: 100px;
                        min-width: 100px;
                    }

                    .actions-column-header {
                        width: 100px;
                        min-width: 100px;
                    }
                }

                .text-primary { color: #6366f1; }
                .text-success { color: #10b981; }
                .text-warning { color: #f59e0b; }
                .text-info { color: #06b6d4; }
                .text-danger { color: #ef4444; }

                .bg-primary { background-color: #6366f1; }
                .bg-success { background-color: #10b981; }
                .bg-warning { background-color: #f59e0b; }
                .bg-info { background-color: #06b6d4; }
                .bg-danger { background-color: #ef4444; }
                .bg-light { background-color: #f8f9fa; }
                .bg-secondary { background-color: #6c757d; }
            `}</style>
        </div>
    );
}

export default SalesInvoicesTable;