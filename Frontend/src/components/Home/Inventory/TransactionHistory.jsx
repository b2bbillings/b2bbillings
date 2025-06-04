import React, { useState } from 'react';
import { Card, Table, Form, InputGroup, Badge, Dropdown, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFilter, faEllipsisV, faFileExport, faSortDown } from '@fortawesome/free-solid-svg-icons';

function TransactionHistory({
    transactions = [],
    selectedItem,
    searchQuery = '',
    onSearchChange
}) {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Filter transactions for selected item and search query
    const filteredTransactions = transactions.filter(transaction => {
        if (!selectedItem) return false;

        const itemMatch = transaction.itemId === selectedItem.id;
        const searchMatch = searchQuery === '' ||
            transaction.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            transaction.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            transaction.type.toLowerCase().includes(searchQuery.toLowerCase());

        return itemMatch && searchMatch;
    });

    const formatPrice = (price) => {
        return `₹ ${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getTransactionIcon = (type) => {
        return type === 'Sale' ? '🟢' : '🔴';
    };

    const getStatusBadge = (status) => {
        const variant = status === 'Paid' ? 'success' : 'warning';
        return <Badge bg={variant} className="fw-normal">{status}</Badge>;
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <Card className="border-0 shadow-sm h-100 transaction-history-card">
            {/* Header */}
            <Card.Header className="bg-white border-bottom-0 py-3">
                <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold text-dark">TRANSACTIONS</h5>
                    <div className="d-flex align-items-center gap-3">
                        {/* Search */}
                        <div className="search-container">
                            <InputGroup size="sm" style={{ width: '250px' }}>
                                <Form.Control
                                    type="text"
                                    placeholder="Search transactions..."
                                    value={searchQuery}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    className="border-end-0"
                                />
                                <InputGroup.Text className="bg-white border-start-0">
                                    <FontAwesomeIcon icon={faSearch} className="text-muted" />
                                </InputGroup.Text>
                            </InputGroup>
                        </div>

                        {/* Export Button */}
                        <Button variant="primary" size="sm" className="d-flex align-items-center gap-2">
                            <FontAwesomeIcon icon={faFileExport} />
                        </Button>
                    </div>
                </div>
            </Card.Header>

            {/* Table */}
            <Card.Body className="p-0">
                <div className="table-responsive transaction-table-container">
                    <Table className="mb-0 transaction-table">
                        <thead className="bg-light">
                            <tr>
                                <th className="border-0 py-3 ps-4 text-muted small fw-semibold text-uppercase">
                                    <div className="d-flex align-items-center gap-2">
                                        TYPE
                                        <FontAwesomeIcon
                                            icon={faFilter}
                                            className="text-muted cursor-pointer"
                                            onClick={() => handleSort('type')}
                                            style={{ fontSize: '0.7rem' }}
                                        />
                                    </div>
                                </th>
                                <th className="border-0 py-3 text-muted small fw-semibold text-uppercase">
                                    <div className="d-flex align-items-center gap-2">
                                        INVOICE/REF.
                                        <FontAwesomeIcon
                                            icon={faFilter}
                                            className="text-muted cursor-pointer"
                                            onClick={() => handleSort('invoiceNumber')}
                                            style={{ fontSize: '0.7rem' }}
                                        />
                                    </div>
                                </th>
                                <th className="border-0 py-3 text-muted small fw-semibold text-uppercase">
                                    <div className="d-flex align-items-center gap-2">
                                        NAME
                                        <FontAwesomeIcon
                                            icon={faFilter}
                                            className="text-muted cursor-pointer"
                                            onClick={() => handleSort('customerName')}
                                            style={{ fontSize: '0.7rem' }}
                                        />
                                    </div>
                                </th>
                                <th className="border-0 py-3 text-muted small fw-semibold text-uppercase">
                                    <div className="d-flex align-items-center gap-2">
                                        DATE
                                        <FontAwesomeIcon
                                            icon={faFilter}
                                            className="text-muted cursor-pointer"
                                            onClick={() => handleSort('date')}
                                            style={{ fontSize: '0.7rem' }}
                                        />
                                    </div>
                                </th>
                                <th className="border-0 py-3 text-muted small fw-semibold text-uppercase">
                                    <div className="d-flex align-items-center gap-2">
                                        QUANTITY
                                        <FontAwesomeIcon
                                            icon={faFilter}
                                            className="text-muted cursor-pointer"
                                            onClick={() => handleSort('quantity')}
                                            style={{ fontSize: '0.7rem' }}
                                        />
                                    </div>
                                </th>
                                <th className="border-0 py-3 text-muted small fw-semibold text-uppercase">
                                    <div className="d-flex align-items-center gap-2">
                                        PRICE/UNIT
                                        <FontAwesomeIcon
                                            icon={faFilter}
                                            className="text-muted cursor-pointer"
                                            onClick={() => handleSort('pricePerUnit')}
                                            style={{ fontSize: '0.7rem' }}
                                        />
                                    </div>
                                </th>
                                <th className="border-0 py-3 text-muted small fw-semibold text-uppercase">
                                    <div className="d-flex align-items-center gap-2">
                                        STATUS
                                        <FontAwesomeIcon
                                            icon={faFilter}
                                            className="text-muted cursor-pointer"
                                            onClick={() => handleSort('status')}
                                            style={{ fontSize: '0.7rem' }}
                                        />
                                    </div>
                                </th>
                                <th className="border-0 py-3 pe-4"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-5 text-muted">
                                        {selectedItem ?
                                            (searchQuery ? 'No transactions found matching your search' : 'No transactions found for this item') :
                                            'Select an item to view transactions'
                                        }
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((transaction) => (
                                    <tr key={transaction.id} className="border-bottom transaction-row">
                                        <td className="py-3 ps-4">
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="transaction-icon">
                                                    {getTransactionIcon(transaction.type)}
                                                </span>
                                                <span className="fw-medium text-dark">
                                                    {transaction.type}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3">
                                            <span className="text-dark">
                                                {transaction.invoiceNumber || '-'}
                                            </span>
                                        </td>
                                        <td className="py-3">
                                            <span className="text-dark fw-medium">
                                                {transaction.customerName}
                                            </span>
                                        </td>
                                        <td className="py-3">
                                            <span className="text-muted">
                                                {transaction.date}
                                            </span>
                                        </td>
                                        <td className="py-3">
                                            <span className="text-dark fw-medium">
                                                {transaction.quantity}
                                            </span>
                                        </td>
                                        <td className="py-3">
                                            <span className="text-dark fw-medium">
                                                {formatPrice(transaction.pricePerUnit)}
                                            </span>
                                        </td>
                                        <td className="py-3">
                                            {getStatusBadge(transaction.status)}
                                        </td>
                                        <td className="py-3 pe-4">
                                            <Dropdown>
                                                <Dropdown.Toggle
                                                    variant="link"
                                                    className="p-0 border-0 text-muted"
                                                    id={`dropdown-${transaction.id}`}
                                                >
                                                    <FontAwesomeIcon icon={faEllipsisV} />
                                                </Dropdown.Toggle>
                                                <Dropdown.Menu>
                                                    <Dropdown.Item>View Details</Dropdown.Item>
                                                    <Dropdown.Item>Edit Transaction</Dropdown.Item>
                                                    <Dropdown.Divider />
                                                    <Dropdown.Item className="text-danger">
                                                        Delete
                                                    </Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>
            </Card.Body>
        </Card>
    );
}

export default TransactionHistory;

/* Custom CSS */
const styles = `
.transaction-history-card {
    border-radius: 12px !important;
}

.cursor-pointer {
    cursor: pointer;
}

.search-container .input-group-text {
    background-color: white;
}

.transaction-table-container {
    max-height: calc(100vh - 300px);
    overflow-y: auto;
}

.transaction-table thead th {
    position: sticky;
    top: 0;
    background-color: #f8f9fa !important;
    z-index: 10;
}

.transaction-row {
    transition: background-color 0.2s ease;
}

.transaction-row:hover {
    background-color: #f8f9fa;
}

.transaction-icon {
    font-size: 0.8rem;
}

.table td, .table th {
    vertical-align: middle;
    border-color: #e9ecef;
}

/* Scrollbar styling */
.transaction-table-container::-webkit-scrollbar {
    width: 6px;
}

.transaction-table-container::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
}

.transaction-table-container::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
}

.transaction-table-container::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
}

@media (max-width: 768px) {
    .search-container {
        display: none;
    }
    
    .transaction-table-container {
        max-height: 400px;
    }
    
    .table-responsive {
        font-size: 0.875rem;
    }
}

@media (max-width: 576px) {
    .transaction-table th,
    .transaction-table td {
        padding: 0.5rem 0.25rem;
    }
    
    .transaction-table th:first-child,
    .transaction-table td:first-child {
        padding-left: 0.75rem;
    }
    
    .transaction-table th:last-child,
    .transaction-table td:last-child {
        padding-right: 0.75rem;
    }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
}