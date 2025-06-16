import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, InputGroup, Form, Button, Dropdown, Pagination } from 'react-bootstrap';
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
    faTrash,
    faChevronLeft,
    faChevronRight,
    faAngleDoubleLeft,
    faAngleDoubleRight
} from '@fortawesome/free-solid-svg-icons';
import { useParams } from 'react-router-dom';
import transactionService from '../../../services/transactionService';
import './TransactionHistory.css'; // Import the CSS file

function TransactionHistory({
    selectedAccount,
    searchQuery = '',
    onSearchChange,
    loading = false,
    onRefresh
}) {
    const { companyId } = useParams();

    // State management
    const [transactions, setTransactions] = useState([]);
    const [transactionLoading, setTransactionLoading] = useState(false);
    const [transactionError, setTransactionError] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [sortField, setSortField] = useState('transactionDate');
    const [sortDirection, setSortDirection] = useState('desc');
    const [dateRange, setDateRange] = useState('all');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });

    // Load transactions from backend
    const loadTransactions = async (resetPage = false) => {
        if (!selectedAccount || !companyId) {
            setTransactions([]);
            return;
        }

        setTransactionLoading(true);
        setTransactionError('');

        try {
            const currentPage = resetPage ? 1 : pagination.page;

            const filters = {
                page: currentPage,
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
                setPagination({
                    page: currentPage,
                    limit: pagination.limit,
                    total: response.data.pagination?.total || 0,
                    totalPages: response.data.pagination?.totalPages || 0
                });
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

    // Load transactions when dependencies change
    useEffect(() => {
        loadTransactions(true);
    }, [selectedAccount, companyId, filterType, sortField, sortDirection, dateRange, searchQuery]);

    // Load transactions when page changes
    useEffect(() => {
        loadTransactions(false);
    }, [pagination.page]);

    // Handle page changes
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.page) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    // Handle items per page change
    const handleLimitChange = (newLimit) => {
        setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
    };

    // Enhanced date formatting
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

    // Get transaction icon
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

    // Get transaction variant
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

    // Format currency
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

    // Handle sort
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Get sort icon
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

    // Calculate summary stats for current page
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

    // Render pagination controls
    const renderPagination = () => {
        if (pagination.totalPages <= 1) return null;

        const maxVisiblePages = 5;
        const currentPage = pagination.page;
        const totalPages = pagination.totalPages;

        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        const pages = [];
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return (
            <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                    <span className="me-2 text-muted small">Show:</span>
                    <Form.Select
                        size="sm"
                        value={pagination.limit}
                        onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                        style={{ width: 'auto' }}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </Form.Select>
                    <span className="ms-2 text-muted small">per page</span>
                </div>

                <Pagination className="mb-0">
                    <Pagination.Item
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        title="First page"
                    >
                        <FontAwesomeIcon icon={faAngleDoubleLeft} />
                    </Pagination.Item>
                    <Pagination.Item
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        title="Previous page"
                    >
                        <FontAwesomeIcon icon={faChevronLeft} />
                    </Pagination.Item>
                    {pages.map(page => (
                        <Pagination.Item
                            key={page}
                            active={page === currentPage}
                            onClick={() => handlePageChange(page)}
                        >
                            {page}
                        </Pagination.Item>
                    ))}
                    <Pagination.Item
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        title="Next page"
                    >
                        <FontAwesomeIcon icon={faChevronRight} />
                    </Pagination.Item>
                    <Pagination.Item
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        title="Last page"
                    >
                        <FontAwesomeIcon icon={faAngleDoubleRight} />
                    </Pagination.Item>
                </Pagination>

                <div className="text-muted small">
                    Page {currentPage} of {totalPages} ({pagination.total} total)
                </div>
            </div>
        );
    };

    return (
        <div className="transaction-history-container">
            <div className="card border-0 shadow-sm">
                {/* Header */}
                <div className="card-header bg-primary text-white border-0">
                    <div className="row align-items-center">
                        <div className="col-md-6">
                            <h5 className="mb-1 fw-bold">Transaction History</h5>
                            <small className="text-white-50">
                                {selectedAccount ? `${selectedAccount.accountName} • ` : ''}
                                {pagination.total} transaction{pagination.total !== 1 ? 's' : ''}
                                {pagination.total > pagination.limit && ` (showing ${transactions.length})`}
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
                                        All Types
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => setFilterType('credit')}>
                                        Credits
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => setFilterType('debit')}>
                                        Debits
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
                                    loadTransactions(true);
                                    if (onRefresh) onRefresh();
                                }}
                                disabled={transactionLoading}
                            >
                                {transactionLoading ? 'Loading...' : '🔄 Refresh'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Content Area with Flex Layout */}
                <div className="card-body p-0 d-flex flex-column" style={{ height: '70vh' }}>
                    {/* Loading State */}
                    {(transactionLoading || loading) && (
                        <div className="text-center py-5 flex-grow-1 d-flex align-items-center justify-content-center">
                            <div>
                                <div className="spinner-border text-primary mb-2" role="status">
                                    <span className="visually-hidden">Loading transactions...</span>
                                </div>
                                <div className="text-muted">Loading transactions...</div>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {transactionError && !transactionLoading && (
                        <div className="alert alert-danger m-3 flex-grow-1 d-flex align-items-center justify-content-center">
                            <div className="text-center">
                                <div>
                                    <strong>Error:</strong> {transactionError}
                                </div>
                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => loadTransactions(true)}
                                >
                                    Retry
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Transactions Table - Takes remaining space */}
                    {!transactionLoading && !loading && !transactionError && (
                        <div className="table-container flex-grow-1 d-flex flex-column">
                            <div className="table-responsive flex-grow-1">
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

                                                    {/* Amount */}
                                                    <td className="border-0 text-end px-2" style={{ width: '90px' }}>
                                                        <div className={`fw-bold ${transaction.direction === 'in' ? 'text-success' : 'text-danger'}`} style={{ fontSize: '0.75rem' }}>
                                                            {transaction.direction === 'in' ? '+' : '-'}₹{formatCurrency(transaction.amount)}
                                                        </div>
                                                    </td>

                                                    {/* Balance */}
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

                            {/* Pagination Controls - Fixed at bottom */}
                            {!transactionLoading && !loading && !transactionError && transactions.length > 0 && (
                                <div className="pagination-container p-3 border-top bg-white">
                                    {renderPagination()}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer with Summary */}
                {!transactionLoading && !loading && transactions.length > 0 && (
                    <div className="card-footer bg-light border-0">
                        <div className="row align-items-center">
                            <div className="col-md-6">
                                <small className="text-muted">
                                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} transactions
                                </small>
                            </div>
                            <div className="col-md-6">
                                <div className="row text-center small">
                                    <div className="col-6">
                                        <div className="text-success fw-bold">+₹{formatCurrency(stats.totalCredits)}</div>
                                        <small className="text-muted">Credits ({stats.creditCount}) - Current Page</small>
                                    </div>
                                    <div className="col-6">
                                        <div className="text-danger fw-bold">-₹{formatCurrency(stats.totalDebits)}</div>
                                        <small className="text-muted">Debits ({stats.debitCount}) - Current Page</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TransactionHistory;