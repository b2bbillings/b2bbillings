import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Button, Card, Badge, Spinner, Dropdown, Form, InputGroup, Table } from 'react-bootstrap';
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
    faExclamationTriangle,
    faCopy
} from '@fortawesome/free-solid-svg-icons';

// Import modals and services
import TransactionDetailsModal from './TransactionDetailsModal';
import EditTransactionModal from './EditTransactionModal';
import paymentService from '../../../services/paymentService';

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
    formatCurrency,
    companyId,
    refreshTrigger,
    onViewAllocations,
    showAllocationDetails,
    paymentSummary,
    onTransactionUpdated,
    onTransactionDeleted,
    addToast,
    bankAccounts,
    currentUser
}) => {
    // Modal states
    const [showTransactionDetails, setShowTransactionDetails] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [showEditTransaction, setShowEditTransaction] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);

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
            return date.toLocaleString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
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
        const isRecent = (new Date() - paymentDate) < (24 * 60 * 60 * 1000);
        const isToday = paymentDate.toDateString() === new Date().toDateString();

        // Better transaction type detection
        let displayType = 'pay-out';
        let transactionType = transaction.type || 'Payment Voucher';

        if (transaction.type === 'Receipt Voucher' ||
            transaction.type === 'payment_in' ||
            transaction.paymentType === 'payment_in' ||
            (transaction.amount > 0 && (transaction.direction === 'in' || transaction.transactionType === 'payment_in'))) {
            displayType = 'pay-in';
            transactionType = 'Receipt Voucher';
        } else if (transaction.type === 'Payment Voucher' ||
            transaction.type === 'payment_out' ||
            transaction.paymentType === 'payment_out' ||
            (transaction.amount > 0 && (transaction.direction === 'out' || transaction.transactionType === 'payment_out'))) {
            displayType = 'pay-out';
            transactionType = 'Payment Voucher';
        }

        return {
            ...transaction,
            isRecent,
            isToday,
            formattedDate: formatTransactionDate(transaction.paymentDate || transaction.createdAt),
            formattedAmount: formatCurrency(transaction.total || transaction.amount),
            displayType: displayType,
            type: transactionType,
            paymentNumber: transaction.paymentNumber || transaction.number || transaction.reference,
            paymentDate: transaction.paymentDate || transaction.createdAt,
            paymentMethod: transaction.paymentMethod || 'cash'
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

    // Show toast notification
    const showToast = (message, type = 'info') => {
        if (addToast) {
            addToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
            if (type === 'error') {
                alert(message);
            }
        }
    };

    // Enhanced transaction action handler
    const handleTransactionAction = (action, transaction) => {
        switch (action) {
            case 'view':
                setSelectedTransaction(transaction);
                setShowTransactionDetails(true);
                break;
            case 'edit':
                try {
                    const permissions = paymentService.getTransactionActionPermissions(transaction, currentUser?.role);
                    if (!permissions.canEdit) {
                        showToast(`Cannot edit transaction: ${permissions.restrictions.join(', ')}`, 'error');
                        return;
                    }
                    setEditingTransaction(transaction);
                    setShowEditTransaction(true);
                } catch (error) {
                    console.error('Error checking edit permissions:', error);
                    setEditingTransaction(transaction);
                    setShowEditTransaction(true);
                }
                break;
            case 'delete':
                try {
                    const deletePermissions = paymentService.getTransactionActionPermissions(transaction, currentUser?.role);
                    if (!deletePermissions.canDelete) {
                        showToast(`Cannot delete transaction: ${deletePermissions.restrictions.join(', ')}`, 'error');
                        return;
                    }

                    const confirmMessage = `Are you sure you want to delete this transaction?
Transaction: ${transaction.paymentNumber || transaction.number}
Amount: ₹${formatCurrency(transaction.amount)}
Date: ${new Date(transaction.paymentDate || transaction.createdAt).toLocaleDateString()}

This action cannot be undone.`;

                    if (window.confirm(confirmMessage)) {
                        handleDeleteTransaction(transaction);
                    }
                } catch (error) {
                    console.error('Error checking delete permissions:', error);
                    if (window.confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
                        handleDeleteTransaction(transaction);
                    }
                }
                break;
            case 'duplicate':
                handleDuplicateTransaction(transaction);
                break;
            case 'allocations':
                if (onViewAllocations) {
                    onViewAllocations(transaction);
                }
                break;
            default:
                break;
        }
    };

    // Enhanced transaction update handler
    const handleTransactionUpdated = async (updatedData) => {
        try {
            console.log('🔄 Transaction updated:', updatedData);
            setShowEditTransaction(false);
            setEditingTransaction(null);

            if (selectedParty && onLoadTransactions) {
                await onLoadTransactions(selectedParty._id || selectedParty.id);
            }

            if (onTransactionUpdated) {
                onTransactionUpdated(updatedData);
            }

            showToast('Transaction updated successfully', 'success');
        } catch (error) {
            console.error('❌ Error handling transaction update:', error);
            showToast('Failed to update transaction', 'error');
        }
    };

    // Enhanced transaction deletion handler
    const handleDeleteTransaction = async (transaction) => {
        try {
            const reason = prompt('Please provide a reason for deleting this transaction:') || 'Deleted by user';

            if (onTransactionDeleted) {
                await onTransactionDeleted(transaction, reason);
            } else {
                const result = await paymentService.deleteTransaction(transaction._id || transaction.id, reason);

                if (result.success) {
                    console.log('✅ Transaction deleted successfully:', result.message);

                    if (selectedParty && onLoadTransactions) {
                        onLoadTransactions(selectedParty._id || selectedParty.id);
                    }

                    showToast(result.message, 'success');
                } else {
                    throw new Error(result.message || 'Failed to delete transaction');
                }
            }
        } catch (error) {
            console.error('❌ Error deleting transaction:', error);
            showToast(`Failed to delete transaction: ${error.message}`, 'error');
        }
    };

    // Enhanced transaction duplication handler
    const handleDuplicateTransaction = (transaction) => {
        try {
            const duplicateData = {
                partyId: transaction.partyId || selectedParty?._id || selectedParty?.id,
                partyName: transaction.partyName || selectedParty?.name,
                amount: transaction.amount,
                paymentMethod: transaction.paymentMethod || 'cash',
                paymentDate: new Date().toISOString().split('T')[0],
                reference: `DUP-${transaction.reference || transaction.paymentNumber || ''}`,
                notes: `Duplicate of ${transaction.paymentNumber || transaction.number} (${new Date(transaction.paymentDate || transaction.createdAt).toLocaleDateString()})`,
                companyId: companyId,
                bankAccountId: transaction.bankAccountId,
                bankDetails: transaction.bankDetails,
                invoiceAllocations: transaction.invoiceAllocations,
                purchaseInvoiceAllocations: transaction.purchaseInvoiceAllocations
            };

            console.log('🔄 Duplicating transaction:', {
                original: transaction,
                duplicate: duplicateData,
                type: transaction.displayType
            });

            if (transaction.displayType === 'pay-in') {
                if (onPayIn) {
                    onPayIn(duplicateData);
                    showToast('Opening PayIn modal with duplicate data', 'info');
                } else {
                    console.warn('⚠️ onPayIn handler not provided');
                    showToast('PayIn functionality not available', 'error');
                }
            } else if (transaction.displayType === 'pay-out') {
                if (onPayOut) {
                    onPayOut(duplicateData);
                    showToast('Opening PayOut modal with duplicate data', 'info');
                } else {
                    console.warn('⚠️ onPayOut handler not provided');
                    showToast('PayOut functionality not available', 'error');
                }
            } else {
                console.warn('⚠️ Unknown transaction type for duplication:', transaction.type);
                showToast('Unable to determine transaction type for duplication', 'error');
            }
        } catch (error) {
            console.error('❌ Error duplicating transaction:', error);
            showToast(`Failed to duplicate transaction: ${error.message}`, 'error');
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

    // Export transactions
    const handleExportTransactions = () => {
        try {
            if (enhancedTransactions.length === 0) {
                showToast('No transactions to export', 'warning');
                return;
            }

            const csvContent = enhancedTransactions.map(transaction => ({
                'Transaction Number': transaction.paymentNumber || transaction.number,
                'Date': transaction.formattedDate,
                'Type': transaction.type,
                'Amount': transaction.formattedAmount,
                'Payment Method': transaction.paymentMethod,
                'Status': transaction.status,
                'Reference': transaction.reference || '',
                'Notes': transaction.notes || ''
            }));

            const csvString = [
                Object.keys(csvContent[0]).join(','),
                ...csvContent.map(row => Object.values(row).map(val => `"${val}"`).join(','))
            ].join('\n');

            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${selectedParty?.name || 'Party'}_Transactions_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            showToast(`Exported ${enhancedTransactions.length} transactions successfully`, 'success');
        } catch (error) {
            console.error('Error exporting transactions:', error);
            showToast('Failed to export transactions', 'error');
        }
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
        <div className="h-100 transaction-table-wrapper">
            {/* ✅ CSS STYLES MOVED TO SEPARATE COMPONENT */}
            <TransactionTableStyles />

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
                                <Dropdown.Item onClick={handleExportTransactions} style={{ fontSize: '12px' }}>
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
                <div className="table-container">
                    <Table className="transaction-table mb-0" style={{ fontSize: '12px' }}>
                        <thead className="bg-light sticky-top">
                            <tr>
                                <th
                                    style={{ fontSize: '11px', cursor: 'pointer', width: '15%', padding: '12px 8px' }}
                                    onClick={() => handleTransactionSort('type')}
                                >
                                    <div className="d-flex align-items-center">
                                        TYPE
                                        <FontAwesomeIcon
                                            icon={getSortIcon('type')}
                                            className="ms-1"
                                            size="xs"
                                        />
                                    </div>
                                </th>
                                <th
                                    style={{ fontSize: '11px', cursor: 'pointer', width: '15%', padding: '12px 8px' }}
                                    onClick={() => handleTransactionSort('number')}
                                >
                                    <div className="d-flex align-items-center">
                                        NUMBER
                                        <FontAwesomeIcon
                                            icon={getSortIcon('number')}
                                            className="ms-1"
                                            size="xs"
                                        />
                                    </div>
                                </th>
                                <th
                                    style={{ fontSize: '11px', cursor: 'pointer', width: '15%', padding: '12px 8px' }}
                                    onClick={() => handleTransactionSort('paymentDate')}
                                >
                                    <div className="d-flex align-items-center">
                                        DATE
                                        <FontAwesomeIcon
                                            icon={getSortIcon('paymentDate')}
                                            className="ms-1"
                                            size="xs"
                                        />
                                    </div>
                                </th>
                                {viewOptions.showAmount && (
                                    <th
                                        style={{ fontSize: '11px', cursor: 'pointer', width: '15%', padding: '12px 8px' }}
                                        onClick={() => handleTransactionSort('amount')}
                                    >
                                        <div className="d-flex align-items-center">
                                            AMOUNT
                                            <FontAwesomeIcon
                                                icon={getSortIcon('amount')}
                                                className="ms-1"
                                                size="xs"
                                            />
                                        </div>
                                    </th>
                                )}
                                {viewOptions.showMethod && !viewOptions.compactView && (
                                    <th
                                        style={{ fontSize: '11px', cursor: 'pointer', width: '12%', padding: '12px 8px' }}
                                        onClick={() => handleTransactionSort('paymentMethod')}
                                    >
                                        <div className="d-flex align-items-center">
                                            METHOD
                                            <FontAwesomeIcon
                                                icon={getSortIcon('paymentMethod')}
                                                className="ms-1"
                                                size="xs"
                                            />
                                        </div>
                                    </th>
                                )}
                                {viewOptions.showStatus && !viewOptions.compactView && (
                                    <th
                                        style={{ fontSize: '11px', cursor: 'pointer', width: '12%', padding: '12px 8px' }}
                                        onClick={() => handleTransactionSort('status')}
                                    >
                                        <div className="d-flex align-items-center">
                                            STATUS
                                            <FontAwesomeIcon
                                                icon={getSortIcon('status')}
                                                className="ms-1"
                                                size="xs"
                                            />
                                        </div>
                                    </th>
                                )}
                                {viewOptions.showBalance && (
                                    <th style={{ fontSize: '11px', width: '12%', padding: '12px 8px' }}>
                                        BALANCE
                                    </th>
                                )}
                                <th
                                    className="text-center"
                                    style={{ fontSize: '11px', width: '100px', padding: '12px 8px' }}
                                >
                                    ACTIONS
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {enhancedTransactions.map((transaction, index) => (
                                <tr
                                    key={transaction.id || transaction._id || index}
                                    className={`${transaction.isRecent ? 'table-success' : ''} ${transaction.isToday ? 'border-start border-success border-3' : ''}`}
                                    style={{
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s ease'
                                    }}
                                    onClick={() => handleTransactionAction('view', transaction)}
                                    onMouseEnter={(e) => {
                                        if (!transaction.isRecent) {
                                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!transaction.isRecent) {
                                            e.currentTarget.style.backgroundColor = '';
                                        }
                                    }}
                                >
                                    <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                                        <div className="d-flex align-items-center">
                                            <Badge
                                                bg={transaction.displayType === 'pay-in' ? 'success' : 'danger'}
                                                className="me-2"
                                                style={{ fontSize: '9px' }}
                                            >
                                                {transaction.displayType === 'pay-in' ? 'IN' : 'OUT'}
                                            </Badge>
                                            <div>
                                                <span className="fw-medium">
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
                                    </td>
                                    <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                                        <span
                                            style={{
                                                fontFamily: 'monospace',
                                                fontWeight: transaction.isRecent ? 'bold' : 'normal'
                                            }}
                                            className="text-primary"
                                        >
                                            {transaction.paymentNumber || transaction.number}
                                        </span>
                                        {viewOptions.compactView && transaction.reference && (
                                            <div style={{ fontSize: '11px' }} className="text-muted">
                                                Ref: {transaction.reference}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                                        <div>
                                            <span
                                                style={{
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
                                    </td>
                                    {viewOptions.showAmount && (
                                        <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                                            <span
                                                className={`fw-bold ${transaction.displayType === 'pay-in' ? 'text-success' : 'text-danger'}`}
                                                style={{ fontSize: '13px' }}
                                            >
                                                {transaction.displayType === 'pay-in' ? '+' : '-'}₹{transaction.formattedAmount}
                                            </span>
                                        </td>
                                    )}
                                    {viewOptions.showMethod && !viewOptions.compactView && (
                                        <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
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
                                        </td>
                                    )}
                                    {viewOptions.showStatus && !viewOptions.compactView && (
                                        <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
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
                                        </td>
                                    )}
                                    {viewOptions.showBalance && (
                                        <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                                            <span
                                                className={`fw-medium ${transaction.balance > 0 ? 'text-success' :
                                                    transaction.balance < 0 ? 'text-danger' : 'text-muted'
                                                    }`}
                                                style={{ fontSize: '12px' }}
                                            >
                                                ₹{formatCurrency(transaction.balance)}
                                            </span>
                                        </td>
                                    )}
                                    <td
                                        className="text-center actions-cell"
                                        style={{ padding: '10px 8px', verticalAlign: 'middle' }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* ✅ IMPROVED DROPDOWN WITH BETTER POSITIONING */}
                                        <Dropdown>
                                            <Dropdown.Toggle
                                                variant="outline-secondary"
                                                size="sm"
                                                className="dropdown-toggle-custom"
                                                style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: 'none',
                                                    backgroundColor: 'transparent'
                                                }}
                                            >
                                                <FontAwesomeIcon icon={faEllipsisV} size="sm" />
                                            </Dropdown.Toggle>

                                            <Dropdown.Menu className="dropdown-menu-custom">
                                                <Dropdown.Item
                                                    onClick={() => handleTransactionAction('view', transaction)}
                                                    style={{ fontSize: '12px' }}
                                                >
                                                    <FontAwesomeIcon icon={faEye} className="me-2 text-info" />
                                                    View Details
                                                </Dropdown.Item>

                                                {(showAllocationDetails && (transaction.invoiceAllocations || transaction.purchaseInvoiceAllocations)) && (
                                                    <Dropdown.Item
                                                        onClick={() => handleTransactionAction('allocations', transaction)}
                                                        style={{ fontSize: '12px' }}
                                                    >
                                                        <FontAwesomeIcon icon={faFileInvoice} className="me-2 text-primary" />
                                                        View Allocations ({(transaction.invoiceAllocations || transaction.purchaseInvoiceAllocations || []).length})
                                                    </Dropdown.Item>
                                                )}

                                                <Dropdown.Divider />

                                                <Dropdown.Item
                                                    onClick={() => handleTransactionAction('edit', transaction)}
                                                    style={{ fontSize: '12px' }}
                                                    disabled={transaction.status === 'cancelled'}
                                                >
                                                    <FontAwesomeIcon icon={faEdit} className="me-2 text-warning" />
                                                    Edit Transaction
                                                </Dropdown.Item>

                                                <Dropdown.Item
                                                    onClick={() => handleTransactionAction('duplicate', transaction)}
                                                    style={{ fontSize: '12px' }}
                                                >
                                                    <FontAwesomeIcon icon={faCopy} className="me-2 text-secondary" />
                                                    Create Similar {transaction.displayType === 'pay-in' ? 'PayIn' : 'PayOut'}
                                                </Dropdown.Item>

                                                <Dropdown.Divider />

                                                <Dropdown.Item
                                                    onClick={() => handleTransactionAction('delete', transaction)}
                                                    className="text-danger"
                                                    style={{ fontSize: '12px' }}
                                                    disabled={transaction.status === 'cancelled'}
                                                >
                                                    <FontAwesomeIcon icon={faTrash} className="me-2" />
                                                    {transaction.status === 'cancelled' ? 'Already Cancelled' : 'Cancel Transaction'}
                                                </Dropdown.Item>
                                            </Dropdown.Menu>
                                        </Dropdown>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>

                    {/* Pagination */}
                    {transactionsPagination.totalPages > 1 && (
                        <div className="p-3 border-top bg-light">
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
                                onClick={() => onPayIn && onPayIn()}
                                style={{ fontSize: '12px' }}
                            >
                                <FontAwesomeIcon icon={faArrowDown} className="me-1" />
                                Record Payment In
                            </Button>
                            <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => onPayOut && onPayOut()}
                                style={{ fontSize: '12px' }}
                            >
                                <FontAwesomeIcon icon={faArrowUp} className="me-1" />
                                Record Payment Out
                            </Button>
                        </div>
                    </Card.Body>
                </Card>
            )}

            {/* Transaction Details Modal */}
            <TransactionDetailsModal
                show={showTransactionDetails}
                onHide={() => {
                    setShowTransactionDetails(false);
                    setSelectedTransaction(null);
                }}
                transaction={selectedTransaction}
                selectedParty={selectedParty}
                formatCurrency={formatCurrency}
                companyId={companyId}
                onEditTransaction={(transaction) => {
                    setShowTransactionDetails(false);
                    setEditingTransaction(transaction);
                    setShowEditTransaction(true);
                }}
                onDeleteTransaction={handleDeleteTransaction}
                onDuplicateTransaction={handleDuplicateTransaction}
            />

            {/* Edit Transaction Modal */}
            <EditTransactionModal
                show={showEditTransaction}
                onHide={() => {
                    setShowEditTransaction(false);
                    setEditingTransaction(null);
                }}
                transaction={editingTransaction}
                selectedParty={selectedParty}
                companyId={companyId}
                formatCurrency={formatCurrency}
                onTransactionUpdated={handleTransactionUpdated}
                bankAccounts={bankAccounts}
                paymentService={paymentService}
            />
        </div>
    );
};

// ✅ SEPARATE STYLES COMPONENT TO AVOID JSX WARNINGS
const TransactionTableStyles = () => {
    React.useEffect(() => {
        // Create and inject styles
        const styleId = 'transaction-table-styles';

        // Remove existing styles if any
        const existingStyles = document.getElementById(styleId);
        if (existingStyles) {
            existingStyles.remove();
        }

        // Create new style element
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .transaction-table-wrapper {
                position: relative;
                z-index: 1;
            }
            
            .table-container {
                border: 1px solid #dee2e6;
                border-radius: 0.375rem;
                background: white;
                box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
                overflow: visible;
                position: relative;
            }
            
            .transaction-table {
                border-collapse: separate;
                border-spacing: 0;
            }
            
            .sticky-top {
                position: sticky;
                top: 0;
                z-index: 10;
                background: #f8f9fa;
                border-bottom: 2px solid #dee2e6;
            }
            
            .actions-cell {
                position: relative;
                overflow: visible;
            }
            
            /* Clean dropdown button styling */
            .dropdown-toggle-custom::after {
                display: none;
            }
            
            .dropdown-toggle-custom:hover {
                background-color: #f8f9fa;
                border-color: #dee2e6;
            }
            
            .dropdown-toggle-custom:focus {
                box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
            }
            
            /* Properly positioned dropdown menu */
            .dropdown-menu-custom {
                position: absolute;
                top: 100%;
                right: 0;
                z-index: 1050;
                min-width: 220px;
                max-width: 300px;
                margin-top: 8px;
                box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.175);
                border: 1px solid rgba(0, 0, 0, 0.15);
                border-radius: 0.375rem;
                background-color: #fff;
                background-clip: padding-box;
            }
            
            .dropdown-menu-custom .dropdown-item {
                padding: 0.5rem 1rem;
                font-size: 12px;
                line-height: 1.5;
                color: #212529;
                text-decoration: none;
                background-color: transparent;
                border: 0;
                display: flex;
                align-items: center;
                white-space: nowrap;
            }
            
            .dropdown-menu-custom .dropdown-item:hover,
            .dropdown-menu-custom .dropdown-item:focus {
                background-color: #f8f9fa;
                color: #212529;
            }
            
            .dropdown-menu-custom .dropdown-item.text-danger:hover {
                background-color: #f8d7da;
                color: #721c24;
            }
            
            .dropdown-menu-custom .dropdown-item:disabled {
                color: #6c757d;
                pointer-events: none;
                background-color: transparent;
            }
            
            .dropdown-menu-custom .dropdown-divider {
                height: 0;
                margin: 0.5rem 0;
                overflow: hidden;
                border-top: 1px solid #e9ecef;
            }
            
            /* Ensure all parent containers allow overflow */
            .h-100,
            .container-fluid,
            .row,
            .col {
                overflow: visible;
            }
            
            /* Mobile responsiveness */
            @media (max-width: 768px) {
                .dropdown-menu-custom {
                    min-width: 200px;
                    font-size: 11px;
                }
                
                .dropdown-menu-custom .dropdown-item {
                    padding: 0.4rem 0.8rem;
                    font-size: 11px;
                }
            }
        `;

        // Append to head
        document.head.appendChild(style);

        // Cleanup function
        return () => {
            const styleElement = document.getElementById(styleId);
            if (styleElement) {
                styleElement.remove();
            }
        };
    }, []);

    return null;
};

export default TransactionTable;