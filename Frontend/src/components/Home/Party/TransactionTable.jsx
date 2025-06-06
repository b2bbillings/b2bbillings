import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Card, Badge, Spinner, Dropdown, Form, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFileInvoice,
    faRefresh,
    faEllipsisV,
    faArrowUp,
    faArrowDown,
    faSearch,
    faFilter,
    faSort,
    faSortUp,
    faSortDown,
    faDownload,
    faEye,
    faEdit,
    faTrash,
    faClock,
    faCheckCircle,
    faTimesCircle,
    faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

const TransactionTable = ({
    selectedParty,
    transactions,
    isLoadingTransactions,
    transactionsPagination,
    transactionSearchQuery,
    setTransactionSearchQuery,
    onLoadTransactions,
    onPayIn,
    onPayOut,
    formatCurrency
}) => {
    // Transaction sorting state
    const [transactionSortConfig, setTransactionSortConfig] = useState({
        key: 'paymentDate',
        direction: 'desc'
    });

    // Filter states
    const [filters, setFilters] = useState({
        type: '',
        status: '',
        paymentMethod: '',
        dateRange: ''
    });

    // View options
    const [viewOptions, setViewOptions] = useState({
        showAmount: true,
        showMethod: true,
        showStatus: true,
        showBalance: false,
        compactView: false
    });

    // Helper function to format date with time for recent transactions
    const formatTransactionDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 24) {
            // If within 24 hours, show time
            return date.toLocaleString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            // If older, show just date
            return date.toLocaleDateString('en-GB');
        }
    };

    // Handle transaction sorting
    const handleTransactionSort = (key) => {
        let direction = 'asc';
        if (transactionSortConfig.key === key && transactionSortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setTransactionSortConfig({ key, direction });

        // Reload transactions with new sort
        if (selectedParty && onLoadTransactions) {
            onLoadTransactions(selectedParty._id || selectedParty.id, {
                sortBy: key,
                sortOrder: direction,
                page: 1
            });
        }
    };

    // Get sort icon for a specific column
    const getSortIcon = (columnKey) => {
        if (transactionSortConfig.key !== columnKey) {
            return faSort;
        }
        return transactionSortConfig.direction === 'asc' ? faSortUp : faSortDown;
    };

    // Filter transactions based on local filters
    const filteredTransactions = transactions.filter(transaction => {
        if (filters.type && !transaction.type.toLowerCase().includes(filters.type.toLowerCase())) {
            return false;
        }
        if (filters.status && transaction.status !== filters.status) {
            return false;
        }
        if (filters.paymentMethod && transaction.paymentMethod !== filters.paymentMethod) {
            return false;
        }
        return true;
    });

    // Enhanced transaction data with additional properties
    const enhancedTransactions = filteredTransactions.map(transaction => {
        const paymentDate = new Date(transaction.paymentDate || transaction.createdAt);
        const isRecent = (new Date() - paymentDate) < (24 * 60 * 60 * 1000); // Within 24 hours
        const isToday = paymentDate.toDateString() === new Date().toDateString();
        
        return {
            ...transaction,
            isRecent,
            isToday,
            formattedDate: formatTransactionDate(transaction.paymentDate || transaction.createdAt),
            formattedAmount: formatCurrency(transaction.total || transaction.amount),
            displayType: transaction.type === 'Receipt Voucher' ? 'pay-in' : 'pay-out'
        };
    });

    // Get status color
    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'success';
            case 'pending': return 'warning';
            case 'failed': return 'danger';
            case 'cancelled': return 'secondary';
            default: return 'secondary';
        }
    };

    // Get payment method icon
    const getPaymentMethodIcon = (method) => {
        switch (method?.toLowerCase()) {
            case 'cash': return '💵';
            case 'bank_transfer': return '🏦';
            case 'cheque': return '📝';
            case 'card': return '💳';
            case 'upi': return '📱';
            default: return '🔄';
        }
    };

    // Handle transaction action
    const handleTransactionAction = (action, transaction) => {
        console.log(`${action} transaction:`, transaction);
        // Implement actions like view, edit, delete, etc.
        switch (action) {
            case 'view':
                // Open transaction details modal
                break;
            case 'edit':
                // Open edit transaction modal
                break;
            case 'delete':
                // Confirm and delete transaction
                break;
            case 'duplicate':
                // Create duplicate transaction
                break;
            default:
                break;
        }
    };

    // Handle pagination
    const handlePaginationChange = (newPage) => {
        if (selectedParty && onLoadTransactions) {
            onLoadTransactions(selectedParty._id || selectedParty.id, {
                page: newPage,
                sortBy: transactionSortConfig.key,
                sortOrder: transactionSortConfig.direction
            });
        }
    };

    // Clear all filters
    const clearAllFilters = () => {
        setFilters({
            type: '',
            status: '',
            paymentMethod: '',
            dateRange: ''
        });
        setTransactionSearchQuery('');
    };

    if (!selectedParty) {
        return (
            <div className="h-100 d-flex align-items-center justify-content-center bg-light">
                <Card className="border-0 bg-white text-center shadow-sm">
                    <Card.Body className="p-4">
                        <FontAwesomeIcon icon={faFileInvoice} size="2x" className="text-muted mb-3" />
                        <h6 className="text-muted" style={{ fontSize: '14px' }}>Select a party to view transactions</h6>
                        <p className="text-muted mb-0" style={{ fontSize: '12px' }}>
                            Choose a party from the list to see their payment history
                        </p>
                    </Card.Body>
                </Card>
            </div>
        );
    }

    return (
        <div className="transaction-table-container h-100">
            {/* Transaction Header */}
            <Row className="align-items-center mb-3">
                <Col>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        <h6 className="mb-0 fw-bold d-flex align-items-center" style={{ fontSize: '14px' }}>
                            Transactions
                            <Badge bg="secondary" className="ms-2" style={{ fontSize: '10px' }}>
                                {transactionsPagination.totalRecords || enhancedTransactions.length}
                            </Badge>
                            {isLoadingTransactions && (
                                <Spinner size="sm" className="ms-2" />
                            )}
                        </h6>
                        
                        {/* Quick Filters */}
                        <div className="d-flex gap-1">
                            <Button
                                variant={filters.type === 'Receipt' ? 'success' : 'outline-success'}
                                size="sm"
                                onClick={() => setFilters(prev => ({ 
                                    ...prev, 
                                    type: prev.type === 'Receipt' ? '' : 'Receipt' 
                                }))}
                                style={{ fontSize: '10px' }}
                            >
                                Pay In
                            </Button>
                            <Button
                                variant={filters.type === 'Payment' ? 'danger' : 'outline-danger'}
                                size="sm"
                                onClick={() => setFilters(prev => ({ 
                                    ...prev, 
                                    type: prev.type === 'Payment' ? '' : 'Payment' 
                                }))}
                                style={{ fontSize: '10px' }}
                            >
                                Pay Out
                            </Button>
                        </div>
                    </div>
                </Col>
                <Col xs="auto">
                    <div className="d-flex gap-1">
                        {/* Search */}
                        <InputGroup size="sm" style={{ width: '200px' }}>
                            <InputGroup.Text className="bg-light border-end-0">
                                <FontAwesomeIcon icon={faSearch} size="sm" className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Search transactions..."
                                value={transactionSearchQuery}
                                onChange={(e) => setTransactionSearchQuery(e.target.value)}
                                className="border-start-0"
                                style={{ fontSize: '12px' }}
                            />
                        </InputGroup>

                        {/* Actions */}
                        <Button 
                            variant="outline-secondary" 
                            size="sm" 
                            className="border-0 p-1"
                            onClick={() => selectedParty && onLoadTransactions(selectedParty._id || selectedParty.id)}
                            disabled={isLoadingTransactions}
                            title="Refresh transactions"
                        >
                            <FontAwesomeIcon 
                                icon={faRefresh} 
                                size="sm" 
                                className={isLoadingTransactions ? 'fa-spin' : ''} 
                            />
                        </Button>

                        {/* View Options */}
                        <Dropdown align="end">
                            <Dropdown.Toggle variant="outline-secondary" size="sm" className="border-0 p-1">
                                <FontAwesomeIcon icon={faEllipsisV} size="sm" />
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                                <Dropdown.Header style={{ fontSize: '11px' }}>View Options</Dropdown.Header>
                                <Dropdown.Item
                                    onClick={() => setViewOptions(prev => ({ ...prev, compactView: !prev.compactView }))}
                                    style={{ fontSize: '12px' }}
                                >
                                    {viewOptions.compactView ? '📋 Detailed View' : '📝 Compact View'}
                                </Dropdown.Item>
                                <Dropdown.Item
                                    onClick={() => setViewOptions(prev => ({ ...prev, showBalance: !prev.showBalance }))}
                                    style={{ fontSize: '12px' }}
                                >
                                    {viewOptions.showBalance ? '👁️ Hide Balance' : '👁️ Show Balance'}
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item onClick={clearAllFilters} style={{ fontSize: '12px' }}>
                                    <FontAwesomeIcon icon={faFilter} className="me-2" />
                                    Clear Filters
                                </Dropdown.Item>
                                <Dropdown.Item style={{ fontSize: '12px' }}>
                                    <FontAwesomeIcon icon={faDownload} className="me-2" />
                                    Export Transactions
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>
                </Col>
            </Row>

            {/* Transactions Content */}
            {isLoadingTransactions ? (
                <div className="text-center py-5">
                    <Spinner animation="border" size="sm" className="me-2" />
                    <span style={{ fontSize: '13px' }}>Loading transactions...</span>
                </div>
            ) : enhancedTransactions.length > 0 ? (
                <div className="border rounded overflow-hidden">
                    {/* Table Headers with Sorting */}
                    <div className="bg-light border-bottom">
                        <Row className="align-items-center py-2 px-3 g-0">
                            <Col lg={viewOptions.compactView ? 3 : 2}>
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 text-decoration-none text-muted fw-bold text-uppercase"
                                    onClick={() => handleTransactionSort('type')}
                                    style={{ fontSize: '11px' }}
                                >
                                    TYPE
                                    <FontAwesomeIcon
                                        icon={getSortIcon('type')}
                                        className="ms-1"
                                        size="xs"
                                    />
                                </Button>
                            </Col>
                            <Col lg={viewOptions.compactView ? 2 : 2}>
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 text-decoration-none text-muted fw-bold text-uppercase"
                                    onClick={() => handleTransactionSort('number')}
                                    style={{ fontSize: '11px' }}
                                >
                                    NUMBER
                                    <FontAwesomeIcon
                                        icon={getSortIcon('number')}
                                        className="ms-1"
                                        size="xs"
                                    />
                                </Button>
                            </Col>
                            <Col lg={viewOptions.compactView ? 2 : 2}>
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 text-decoration-none text-muted fw-bold text-uppercase"
                                    onClick={() => handleTransactionSort('paymentDate')}
                                    style={{ fontSize: '11px' }}
                                >
                                    DATE
                                    <FontAwesomeIcon
                                        icon={getSortIcon('paymentDate')}
                                        className="ms-1"
                                        size="xs"
                                    />
                                </Button>
                            </Col>
                            {viewOptions.showAmount && (
                                <Col lg={2}>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="p-0 text-decoration-none text-muted fw-bold text-uppercase"
                                        onClick={() => handleTransactionSort('amount')}
                                        style={{ fontSize: '11px' }}
                                    >
                                        AMOUNT
                                        <FontAwesomeIcon
                                            icon={getSortIcon('amount')}
                                            className="ms-1"
                                            size="xs"
                                        />
                                    </Button>
                                </Col>
                            )}
                            {viewOptions.showMethod && !viewOptions.compactView && (
                                <Col lg={2}>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="p-0 text-decoration-none text-muted fw-bold text-uppercase"
                                        onClick={() => handleTransactionSort('paymentMethod')}
                                        style={{ fontSize: '11px' }}
                                    >
                                        METHOD
                                        <FontAwesomeIcon
                                            icon={getSortIcon('paymentMethod')}
                                            className="ms-1"
                                            size="xs"
                                        />
                                    </Button>
                                </Col>
                            )}
                            {viewOptions.showStatus && !viewOptions.compactView && (
                                <Col lg={2}>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="p-0 text-decoration-none text-muted fw-bold text-uppercase"
                                        onClick={() => handleTransactionSort('status')}
                                        style={{ fontSize: '11px' }}
                                    >
                                        STATUS
                                        <FontAwesomeIcon
                                            icon={getSortIcon('status')}
                                            className="ms-1"
                                            size="xs"
                                        />
                                    </Button>
                                </Col>
                            )}
                            {viewOptions.showBalance && (
                                <Col lg={2}>
                                    <small className="text-muted fw-bold text-uppercase" style={{ fontSize: '11px' }}>
                                        BALANCE
                                    </small>
                                </Col>
                            )}
                            <Col lg={1}>
                                <small className="text-muted fw-bold text-uppercase" style={{ fontSize: '11px' }}>
                                    ACTIONS
                                </small>
                            </Col>
                        </Row>
                    </div>

                    {/* Table Data with Enhanced Display */}
                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        {enhancedTransactions.map((transaction, index) => (
                            <Row 
                                key={transaction.id || index} 
                                className={`align-items-center py-2 px-3 border-bottom transaction-row g-0 ${
                                    transaction.isRecent ? 'bg-success bg-opacity-10' : ''
                                } ${transaction.isToday ? 'border-start border-success border-3' : ''}`}
                                style={{ 
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s ease'
                                }}
                                onClick={() => handleTransactionAction('view', transaction)}
                                onMouseEnter={(e) => {
                                    if (!transaction.isRecent) {
                                        e.target.closest('.transaction-row').classList.add('bg-light');
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!transaction.isRecent) {
                                        e.target.closest('.transaction-row').classList.remove('bg-light');
                                    }
                                }}
                            >
                                <Col lg={viewOptions.compactView ? 3 : 2}>
                                    <div className="d-flex align-items-center">
                                        <Badge 
                                            bg={transaction.displayType === 'pay-in' ? 'success' : 'danger'} 
                                            className="me-2"
                                            style={{ fontSize: '9px' }}
                                        >
                                            {transaction.displayType === 'pay-in' ? 'IN' : 'OUT'}
                                        </Badge>
                                        <div>
                                            <span style={{ fontSize: '13px' }} className="fw-medium">
                                                {transaction.type}
                                            </span>
                                            {transaction.isRecent && (
                                                <Badge bg="warning" className="ms-2" style={{ fontSize: '8px' }}>
                                                    NEW
                                                </Badge>
                                            )}
                                            {viewOptions.compactView && (
                                                <div style={{ fontSize: '11px' }} className="text-muted">
                                                    {getPaymentMethodIcon(transaction.paymentMethod)} {transaction.paymentMethod}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Col>
                                <Col lg={viewOptions.compactView ? 2 : 2}>
                                    <span 
                                        style={{ 
                                            fontSize: '13px', 
                                            fontFamily: 'monospace',
                                            fontWeight: transaction.isRecent ? 'bold' : 'normal'
                                        }}
                                        className="text-primary"
                                    >
                                        {transaction.number}
                                    </span>
                                    {viewOptions.compactView && transaction.reference && (
                                        <div style={{ fontSize: '11px' }} className="text-muted">
                                            Ref: {transaction.reference}
                                        </div>
                                    )}
                                </Col>
                                <Col lg={viewOptions.compactView ? 2 : 2}>
                                    <div>
                                        <span 
                                            style={{ 
                                                fontSize: '13px',
                                                fontWeight: transaction.isRecent ? 'bold' : 'normal'
                                            }}
                                        >
                                            {transaction.formattedDate}
                                        </span>
                                        {transaction.isToday && (
                                            <Badge bg="info" className="ms-1" style={{ fontSize: '8px' }}>
                                                TODAY
                                            </Badge>
                                        )}
                                    </div>
                                </Col>
                                {viewOptions.showAmount && (
                                    <Col lg={2}>
                                        <span 
                                            className={`fw-bold ${
                                                transaction.displayType === 'pay-in' ? 'text-success' : 'text-danger'
                                            }`}
                                            style={{ fontSize: '14px' }}
                                        >
                                            {transaction.displayType === 'pay-in' ? '+' : '-'}₹{transaction.formattedAmount}
                                        </span>
                                    </Col>
                                )}
                                {viewOptions.showMethod && !viewOptions.compactView && (
                                    <Col lg={2}>
                                        <div className="d-flex align-items-center">
                                            <span className="me-1">{getPaymentMethodIcon(transaction.paymentMethod)}</span>
                                            <Badge 
                                                bg="light" 
                                                text="dark" 
                                                className="text-capitalize"
                                                style={{ fontSize: '10px' }}
                                            >
                                                {transaction.paymentMethod}
                                            </Badge>
                                        </div>
                                    </Col>
                                )}
                                {viewOptions.showStatus && !viewOptions.compactView && (
                                    <Col lg={2}>
                                        <Badge 
                                            bg={getStatusColor(transaction.status)}
                                            style={{ fontSize: '10px' }}
                                            className="text-capitalize"
                                        >
                                            <FontAwesomeIcon 
                                                icon={
                                                    transaction.status === 'completed' ? faCheckCircle :
                                                    transaction.status === 'pending' ? faClock :
                                                    transaction.status === 'failed' ? faTimesCircle :
                                                    faExclamationTriangle
                                                } 
                                                className="me-1" 
                                                size="xs" 
                                            />
                                            {transaction.status}
                                        </Badge>
                                    </Col>
                                )}
                                {viewOptions.showBalance && (
                                    <Col lg={2}>
                                        <span 
                                            className={`fw-medium ${
                                                transaction.balance > 0 ? 'text-success' : 
                                                transaction.balance < 0 ? 'text-danger' : 'text-muted'
                                            }`}
                                            style={{ fontSize: '12px' }}
                                        >
                                            ₹{formatCurrency(transaction.balance)}
                                        </span>
                                    </Col>
                                )}
                                <Col lg={1}>
                                    <Dropdown align="end" onClick={(e) => e.stopPropagation()}>
                                        <Dropdown.Toggle
                                            variant="link"
                                            size="sm"
                                            className="p-0 border-0 shadow-none bg-transparent text-muted"
                                        >
                                            <FontAwesomeIcon icon={faEllipsisV} size="sm" />
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu>
                                            <Dropdown.Item 
                                                onClick={() => handleTransactionAction('view', transaction)}
                                                style={{ fontSize: '12px' }}
                                            >
                                                <FontAwesomeIcon icon={faEye} className="me-2" />
                                                View Details
                                            </Dropdown.Item>
                                            <Dropdown.Item 
                                                onClick={() => handleTransactionAction('edit', transaction)}
                                                style={{ fontSize: '12px' }}
                                            >
                                                <FontAwesomeIcon icon={faEdit} className="me-2" />
                                                Edit
                                            </Dropdown.Item>
                                            <Dropdown.Divider />
                                            <Dropdown.Item 
                                                onClick={() => handleTransactionAction('duplicate', transaction)}
                                                style={{ fontSize: '12px' }}
                                            >
                                                Duplicate
                                            </Dropdown.Item>
                                            <Dropdown.Divider />
                                            <Dropdown.Item 
                                                onClick={() => handleTransactionAction('delete', transaction)}
                                                className="text-danger"
                                                style={{ fontSize: '12px' }}
                                            >
                                                <FontAwesomeIcon icon={faTrash} className="me-2" />
                                                Delete
                                            </Dropdown.Item>
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </Col>
                            </Row>
                        ))}
                    </div>

                    {/* Enhanced Pagination */}
                    {transactionsPagination.totalPages > 1 && (
                        <div className="p-2 border-top bg-light">
                            <Row className="align-items-center">
                                <Col>
                                    <small className="text-muted" style={{ fontSize: '11px' }}>
                                        Showing {((transactionsPagination.currentPage - 1) * 20) + 1} to{' '}
                                        {Math.min(transactionsPagination.currentPage * 20, transactionsPagination.totalRecords)} of{' '}
                                        {transactionsPagination.totalRecords} transactions
                                    </small>
                                </Col>
                                <Col xs="auto">
                                    <div className="d-flex align-items-center gap-2">
                                        <Button
                                            variant="outline-secondary"
                                            size="sm"
                                            disabled={transactionsPagination.currentPage <= 1}
                                            onClick={() => handlePaginationChange(transactionsPagination.currentPage - 1)}
                                            style={{ fontSize: '11px' }}
                                        >
                                            Previous
                                        </Button>
                                        <span className="text-muted px-2" style={{ fontSize: '11px' }}>
                                            {transactionsPagination.currentPage} of {transactionsPagination.totalPages}
                                        </span>
                                        <Button
                                            variant="outline-secondary"
                                            size="sm"
                                            disabled={transactionsPagination.currentPage >= transactionsPagination.totalPages}
                                            onClick={() => handlePaginationChange(transactionsPagination.currentPage + 1)}
                                            style={{ fontSize: '11px' }}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </Col>
                            </Row>
                        </div>
                    )}
                </div>
            ) : (
                <Card className="border-0 bg-light text-center py-4">
                    <Card.Body>
                        <div className="mb-3">
                            <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px' }}>
                                <FontAwesomeIcon icon={faFileInvoice} size="lg" className="text-primary" />
                            </div>
                        </div>
                        <h6 className="text-muted mb-1" style={{ fontSize: '14px' }}>No Transactions Found</h6>
                        <p className="text-muted mb-3" style={{ fontSize: '12px' }}>
                            {transactionSearchQuery ? 'No transactions match your search criteria' : 'This party hasn\'t made any payments yet'}
                        </p>
                        <div className="d-flex gap-2 justify-content-center flex-wrap">
                            <Button
                                variant="outline-success"
                                size="sm"
                                onClick={onPayIn}
                                style={{ fontSize: '12px' }}
                            >
                                <FontAwesomeIcon icon={faArrowDown} className="me-1" />
                                Record Payment In
                            </Button>
                            <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={onPayOut}
                                style={{ fontSize: '12px' }}
                            >
                                <FontAwesomeIcon icon={faArrowUp} className="me-1" />
                                Record Payment Out
                            </Button>
                        </div>
                    </Card.Body>
                </Card>
            )}
        </div>
    );
};

export default TransactionTable;