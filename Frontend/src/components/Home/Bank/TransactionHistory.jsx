import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, InputGroup, Form, Button, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSearch,
    faFilter,
    faArrowUp,
    faArrowDown,
    faExchange,
    faUniversity,
    faMobile,
    faCalendarAlt,
    faSort,
    faFileExcel,
    faPrint,
    faEllipsisV,
    faEye,
    faEdit,
    faTrash
} from '@fortawesome/free-solid-svg-icons';
import { useParams } from 'react-router-dom';
import transactionService from '../../../services/transactionService';

function TransactionHistory({
    selectedAccount,
    searchQuery = '',
    onSearchChange,
    loading = false,
    onRefresh
}) {
    const { companyId } = useParams();

    // ✅ State management
    const [transactions, setTransactions] = useState([]);
    const [transactionLoading, setTransactionLoading] = useState(false);
    const [transactionError, setTransactionError] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [sortField, setSortField] = useState('transactionDate');
    const [sortDirection, setSortDirection] = useState('desc');
    const [dateRange, setDateRange] = useState('all');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
    });

    // ✅ Load transactions from backend
    const loadTransactions = async () => {
        if (!selectedAccount || !companyId) {
            setTransactions([]);
            return;
        }

        setTransactionLoading(true);
        setTransactionError('');

        try {
            const filters = {
                page: pagination.page,
                limit: pagination.limit,
                sortBy: sortField,
                sortOrder: sortDirection,
                bankAccountId: selectedAccount._id || selectedAccount.id
            };

            // Add type filter
            if (filterType !== 'all') {
                filters.direction = filterType === 'credit' ? 'in' : 'out';
            }

            // Add date range filter
            if (dateRange !== 'all') {
                const now = new Date();
                const startDate = new Date();

                switch (dateRange) {
                    case 'today':
                        startDate.setHours(0, 0, 0, 0);
                        filters.dateFrom = startDate.toISOString().split('T')[0];
                        filters.dateTo = now.toISOString().split('T')[0];
                        break;
                    case 'week':
                        startDate.setDate(now.getDate() - 7);
                        filters.dateFrom = startDate.toISOString().split('T')[0];
                        break;
                    case 'month':
                        startDate.setMonth(now.getMonth() - 1);
                        filters.dateFrom = startDate.toISOString().split('T')[0];
                        break;
                }
            }

            // Add search filter
            if (searchQuery.trim()) {
                filters.search = searchQuery.trim();
            }

            const response = await transactionService.getTransactions(companyId, filters);

            if (response.success) {
                setTransactions(response.data.transactions || []);
                setPagination(response.data.pagination || pagination);
            } else {
                throw new Error(response.message || 'Failed to load transactions');
            }

        } catch (error) {
            setTransactionError(error.message || 'Failed to load transactions');
            setTransactions([]);
        } finally {
            setTransactionLoading(false);
        }
    };

    // ✅ Load transactions when dependencies change
    useEffect(() => {
        loadTransactions();
    }, [selectedAccount, companyId, filterType, sortField, sortDirection, dateRange, searchQuery, pagination.page]);

    // ✅ Enhanced date formatting
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });
    };

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    // ✅ Get transaction icon
    const getTransactionIcon = (direction, method) => {
        if (method?.toLowerCase().includes('upi')) {
            return faMobile;
        }
        switch (direction) {
            case 'in':
                return faArrowUp;
            case 'out':
                return faArrowDown;
            default:
                return faExchange;
        }
    };

    // ✅ Get transaction variant
    const getTransactionVariant = (direction) => {
        switch (direction) {
            case 'in':
                return 'success';
            case 'out':
                return 'danger';
            default:
                return 'info';
        }
    };

    // ✅ Fixed Format currency - No double rupee symbols
    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return '0';

        const numAmount = parseFloat(amount);

        if (numAmount >= 10000000) {
            return `${(numAmount / 10000000).toFixed(1)}Cr`;
        } else if (numAmount >= 100000) {
            return `${(numAmount / 100000).toFixed(1)}L`;
        } else if (numAmount >= 1000) {
            return `${(numAmount / 1000).toFixed(1)}K`;
        }
        return `${Math.round(numAmount)}`;
    };

    // ✅ Handle sort
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // ✅ Get sort icon
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

    // ✅ Calculate summary stats
    const getSummaryStats = () => {
        const credits = transactions.filter(t => t.direction === 'in');
        const debits = transactions.filter(t => t.direction === 'out');

        return {
            totalCredits: credits.reduce((sum, t) => sum + (t.amount || 0), 0),
            totalDebits: debits.reduce((sum, t) => sum + (t.amount || 0), 0),
            creditCount: credits.length,
            debitCount: debits.length
        };
    };

    const stats = getSummaryStats();

    return (
        <div className="transaction-history-container">
            <div className="card border-0 shadow-sm">
                {/* Header - Styled like SalesInvoicesTable */}
                <div className="card-header bg-primary text-white border-0">
                    <div className="row align-items-center">
                        <div className="col-md-6">
                            <h5 className="mb-1 fw-bold">Transaction History</h5>
                            <small className="text-white-50">
                                {selectedAccount ? `${selectedAccount.accountName} • ` : ''}
                                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
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
                                            placeholder="Search transactions..."
                                            value={searchQuery}
                                            onChange={e => onSearchChange(e.target.value)}
                                            className="border-white border-opacity-25 bg-white bg-opacity-25 text-white placeholder-white-50"
                                            disabled={transactionLoading}
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

                    {/* Filters Row */}
                    <div className="row g-2 mt-2">
                        <div className="col-md-4">
                            <Dropdown>
                                <Dropdown.Toggle
                                    variant="outline-light"
                                    size="sm"
                                    className="bg-white bg-opacity-25 border-white border-opacity-25 text-white w-100"
                                >
                                    <FontAwesomeIcon icon={faFilter} className="me-1" size="xs" />
                                    {filterType === 'all' ? 'All Types' : filterType === 'credit' ? 'Credits' : 'Debits'}
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                    <Dropdown.Item onClick={() => setFilterType('all')}>
                                        All Types ({transactions.length})
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => setFilterType('credit')}>
                                        Credits ({stats.creditCount})
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => setFilterType('debit')}>
                                        Debits ({stats.debitCount})
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                        <div className="col-md-4">
                            <Dropdown>
                                <Dropdown.Toggle
                                    variant="outline-light"
                                    size="sm"
                                    className="bg-white bg-opacity-25 border-white border-opacity-25 text-white w-100"
                                >
                                    <FontAwesomeIcon icon={faCalendarAlt} className="me-1" size="xs" />
                                    {dateRange === 'all' ? 'All Time' : dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                    <Dropdown.Item onClick={() => setDateRange('all')}>All Time</Dropdown.Item>
                                    <Dropdown.Item onClick={() => setDateRange('today')}>Today</Dropdown.Item>
                                    <Dropdown.Item onClick={() => setDateRange('week')}>Last 7 Days</Dropdown.Item>
                                    <Dropdown.Item onClick={() => setDateRange('month')}>Last Month</Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                        <div className="col-md-4">
                            <Button
                                variant="outline-light"
                                size="sm"
                                className="bg-white bg-opacity-25 border-white border-opacity-25 text-white w-100"
                                onClick={() => {
                                    loadTransactions();
                                    if (onRefresh) onRefresh();
                                }}
                                disabled={transactionLoading}
                            >
                                {transactionLoading ? 'Loading...' : '🔄 Refresh'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Table Body */}
                <div className="card-body p-0">
                    {/* Loading State */}
                    {(transactionLoading || loading) && (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary mb-2" role="status">
                                <span className="visually-hidden">Loading transactions...</span>
                            </div>
                            <div className="text-muted">Loading transactions...</div>
                        </div>
                    )}

                    {/* Error State */}
                    {transactionError && !transactionLoading && (
                        <div className="alert alert-danger m-3">
                            <div>
                                <strong>Error:</strong> {transactionError}
                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    className="ms-2"
                                    onClick={loadTransactions}
                                >
                                    Retry
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Transactions Table - Styled like SalesInvoicesTable */}
                    {!transactionLoading && !loading && !transactionError && (
                        <div className="table-responsive" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <Table className="mb-0 table-hover table-sm sticky-header">
                                <thead className="table-light sticky-top">
                                    <tr>
                                        <th
                                            className="border-0 text-primary fw-semibold cursor-pointer px-2"
                                            onClick={() => handleSort('transactionDate')}
                                            style={{ minWidth: '80px', width: '80px' }}
                                        >
                                            <div className="d-flex align-items-center">
                                                <span style={{ fontSize: '0.7rem' }}>Date</span>
                                                {getSortIcon('transactionDate')}
                                            </div>
                                        </th>
                                        <th
                                            className="border-0 text-primary fw-semibold cursor-pointer px-2"
                                            onClick={() => handleSort('transactionId')}
                                            style={{ minWidth: '100px', width: '100px' }}
                                        >
                                            <div className="d-flex align-items-center">
                                                <span style={{ fontSize: '0.7rem' }}>Reference</span>
                                                {getSortIcon('transactionId')}
                                            </div>
                                        </th>
                                        <th
                                            className="border-0 text-primary fw-semibold cursor-pointer px-2"
                                            onClick={() => handleSort('direction')}
                                            style={{ minWidth: '70px', width: '70px' }}
                                        >
                                            <div className="d-flex align-items-center">
                                                <span style={{ fontSize: '0.7rem' }}>Type</span>
                                                {getSortIcon('direction')}
                                            </div>
                                        </th>
                                        <th
                                            className="border-0 text-primary fw-semibold px-2"
                                            style={{ minWidth: '180px' }}
                                        >
                                            <span style={{ fontSize: '0.7rem' }}>Description</span>
                                        </th>
                                        <th
                                            className="border-0 text-primary fw-semibold px-2 d-none d-md-table-cell"
                                            style={{ minWidth: '80px', width: '80px' }}
                                        >
                                            <span style={{ fontSize: '0.7rem' }}>Method</span>
                                        </th>
                                        <th
                                            className="border-0 text-primary fw-semibold text-end cursor-pointer px-2"
                                            onClick={() => handleSort('amount')}
                                            style={{ minWidth: '90px', width: '90px' }}
                                        >
                                            <div className="d-flex align-items-center justify-content-end">
                                                <span style={{ fontSize: '0.7rem' }}>Amount</span>
                                                {getSortIcon('amount')}
                                            </div>
                                        </th>
                                        <th
                                            className="border-0 text-primary fw-semibold text-end px-2 d-none d-lg-table-cell"
                                            style={{ minWidth: '90px', width: '90px' }}
                                        >
                                            <span style={{ fontSize: '0.7rem' }}>Balance</span>
                                        </th>
                                        <th
                                            className="border-0 text-primary fw-semibold text-center px-2"
                                            style={{ minWidth: '70px', width: '70px' }}
                                        >
                                            <span style={{ fontSize: '0.7rem' }}>Status</span>
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
                                    {transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="text-center text-muted py-5 border-0">
                                                <div className="d-flex flex-column align-items-center">
                                                    <div className="mb-3" style={{ fontSize: '3rem', opacity: '0.5' }}>
                                                        {selectedAccount?.type === 'upi' ? '📱' : '🏦'}
                                                    </div>
                                                    <h6 className="fw-semibold mb-2 text-secondary">No transactions found</h6>
                                                    <p className="text-muted mb-0">
                                                        {searchQuery
                                                            ? 'Try adjusting your search or filter terms'
                                                            : selectedAccount
                                                                ? `No transactions available for this ${selectedAccount.type === 'upi' ? 'UPI' : 'bank'} account`
                                                                : 'Select an account to view transaction history'
                                                        }
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        transactions.map((transaction, index) => (
                                            <tr key={transaction._id || transaction.id || index} className="align-middle">
                                                {/* Date */}
                                                <td className="border-0 px-2" style={{ width: '80px' }}>
                                                    <div>
                                                        <span className="text-dark fw-medium" style={{ fontSize: '0.7rem' }}>
                                                            {formatDate(transaction.transactionDate)}
                                                        </span>
                                                        <small className="text-muted d-block" style={{ fontSize: '0.6rem' }}>
                                                            {formatTime(transaction.transactionDate)}
                                                        </small>
                                                    </div>
                                                </td>

                                                {/* Reference */}
                                                <td className="border-0 px-2" style={{ width: '100px' }}>
                                                    <Badge bg="primary" bg-opacity="10" text="primary" className="fw-bold" style={{ fontSize: '0.6rem' }}>
                                                        {transaction.transactionId || transaction.referenceNumber || 'N/A'}
                                                    </Badge>
                                                </td>

                                                {/* Type */}
                                                <td className="border-0 px-2" style={{ width: '70px' }}>
                                                    <div className="d-flex align-items-center">
                                                        <FontAwesomeIcon
                                                            icon={getTransactionIcon(transaction.direction, transaction.paymentMethod)}
                                                            className={`me-1 text-${getTransactionVariant(transaction.direction)}`}
                                                            style={{ fontSize: '0.6rem' }}
                                                        />
                                                        <Badge
                                                            bg={getTransactionVariant(transaction.direction)}
                                                            text="dark"
                                                            className="text-capitalize"
                                                            style={{ fontSize: '0.55rem' }}
                                                        >
                                                            {transaction.direction === 'in' ? 'Credit' : 'Debit'}
                                                        </Badge>
                                                    </div>
                                                </td>

                                                {/* Description */}
                                                <td className="border-0 px-2" style={{ minWidth: '180px' }}>
                                                    <div>
                                                        <div className="fw-medium text-dark" style={{ fontSize: '0.7rem' }}>
                                                            {transaction.description?.length > 25
                                                                ? `${transaction.description.substring(0, 25)}...`
                                                                : transaction.description || 'Transaction'}
                                                        </div>
                                                        {transaction.notes && (
                                                            <small className="text-muted" style={{ fontSize: '0.6rem' }}>
                                                                {transaction.notes.length > 18
                                                                    ? `${transaction.notes.substring(0, 18)}...`
                                                                    : transaction.notes}
                                                            </small>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Method */}
                                                <td className="border-0 px-2 d-none d-md-table-cell" style={{ width: '80px' }}>
                                                    <Badge bg="light" text="dark" style={{ fontSize: '0.55rem' }}>
                                                        {transaction.paymentMethod?.length > 8
                                                            ? `${transaction.paymentMethod.substring(0, 8)}...`
                                                            : transaction.paymentMethod || 'Transfer'}
                                                    </Badge>
                                                </td>

                                                {/* Amount - Fixed with single rupee symbol */}
                                                <td className="border-0 text-end px-2" style={{ width: '90px' }}>
                                                    <div className={`fw-bold ${transaction.direction === 'in' ? 'text-success' : 'text-danger'}`} style={{ fontSize: '0.75rem' }}>
                                                        {transaction.direction === 'in' ? '+' : '-'}₹{formatCurrency(transaction.amount)}
                                                    </div>
                                                </td>

                                                {/* Balance - Fixed with single rupee symbol */}
                                                <td className="border-0 text-end px-2 d-none d-lg-table-cell" style={{ width: '90px' }}>
                                                    <div className="fw-bold text-dark" style={{ fontSize: '0.7rem' }}>
                                                        ₹{formatCurrency(transaction.balanceAfter || selectedAccount?.currentBalance || 0)}
                                                    </div>
                                                </td>

                                                {/* Status */}
                                                <td className="border-0 text-center px-2" style={{ width: '70px' }}>
                                                    <Badge
                                                        bg={transaction.status === 'completed' ? 'success' : transaction.status === 'pending' ? 'warning' : 'danger'}
                                                        style={{ fontSize: '0.55rem' }}
                                                    >
                                                        {transaction.status === 'completed' ? '✓' :
                                                            transaction.status === 'pending' ? '⏳' : '❌'}
                                                    </Badge>
                                                </td>

                                                {/* Actions */}
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
                                                                    <Dropdown.Item className="d-flex align-items-center dropdown-item-custom">
                                                                        <FontAwesomeIcon icon={faEye} className="me-2 text-primary" />
                                                                        View Details
                                                                    </Dropdown.Item>
                                                                    <Dropdown.Item className="d-flex align-items-center dropdown-item-custom">
                                                                        <FontAwesomeIcon icon={faEdit} className="me-2 text-warning" />
                                                                        Edit
                                                                    </Dropdown.Item>
                                                                    <Dropdown.Divider />
                                                                    <Dropdown.Item className="d-flex align-items-center dropdown-item-custom text-danger">
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
                    )}
                </div>

                {/* Footer with Summary - Fixed with single rupee symbols */}
                {!transactionLoading && !loading && transactions.length > 0 && (
                    <div className="card-footer bg-light border-0">
                        <div className="row align-items-center">
                            <div className="col-md-6">
                                <small className="text-muted">
                                    Showing {transactions.length} of {pagination.total || transactions.length} transactions
                                </small>
                            </div>
                            <div className="col-md-6">
                                <div className="row text-center small">
                                    <div className="col-6">
                                        <div className="text-success fw-bold">+₹{formatCurrency(stats.totalCredits)}</div>
                                        <small className="text-muted">Credits ({stats.creditCount})</small>
                                    </div>
                                    <div className="col-6">
                                        <div className="text-danger fw-bold">-₹{formatCurrency(stats.totalDebits)}</div>
                                        <small className="text-muted">Debits ({stats.debitCount})</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Styling to match SalesInvoicesTable */}
            <style jsx>{`
                .transaction-history-container {
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
                    .transaction-history-container {
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

export default TransactionHistory;