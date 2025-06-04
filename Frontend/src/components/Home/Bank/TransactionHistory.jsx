import React from 'react';
import { Card, Table, Badge, InputGroup, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFilter } from '@fortawesome/free-solid-svg-icons';

function TransactionHistory({ transactions = [], selectedAccount, searchQuery = '', onSearchChange }) {
    const filtered = transactions
        .filter(txn => selectedAccount && txn.accountId === selectedAccount.id)
        .filter(txn =>
            txn.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            txn.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            txn.category?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getTransactionIcon = (type) => {
        return type === 'deposit' ? '↗️' : '↙️';
    };

    return (
        <>
            <Card className="transaction-history-card border-0">
                <Card.Header className="bg-gradient-purple border-0 pb-0">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h6 className="fw-bold mb-1 text-white fs-6">Transaction History</h6>
                            <small className="text-white-50 small">
                                {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} found
                            </small>
                        </div>
                        <InputGroup style={{ width: '250px' }}>
                            <InputGroup.Text className="bg-white bg-opacity-25 border-white border-opacity-25 text-white">
                                <FontAwesomeIcon icon={faSearch} className="text-white" size="xs" />
                            </InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Search transactions..."
                                value={searchQuery}
                                onChange={e => onSearchChange(e.target.value)}
                                className="border-white border-opacity-25 bg-white bg-opacity-25 text-white placeholder-white-50 small search-input"
                                size="sm"
                            />
                        </InputGroup>
                    </div>
                </Card.Header>
                
                <Card.Body className="p-0">
                    <div className="table-responsive">
                        <Table className="mb-0 transaction-table">
                            <thead>
                                <tr>
                                    <th className="border-0 bg-gradient-light-purple text-purple fw-semibold small">Date</th>
                                    <th className="border-0 bg-gradient-light-purple text-purple fw-semibold small">Type</th>
                                    <th className="border-0 bg-gradient-light-purple text-purple fw-semibold small">Description</th>
                                    <th className="border-0 bg-gradient-light-purple text-purple fw-semibold small">Reference</th>
                                    <th className="border-0 bg-gradient-light-purple text-purple fw-semibold text-end small">Amount</th>
                                    <th className="border-0 bg-gradient-light-purple text-purple fw-semibold text-end small">Balance</th>
                                    <th className="border-0 bg-gradient-light-purple text-purple fw-semibold text-center small">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center text-muted py-4 border-0">
                                            <div className="empty-state">
                                                <div className="mb-2">📊</div>
                                                <div className="fw-semibold mb-1 small text-purple">No transactions found</div>
                                                <small className="small text-muted">
                                                    {searchQuery 
                                                        ? 'Try adjusting your search terms' 
                                                        : selectedAccount 
                                                            ? 'No transactions available for this account'
                                                            : 'Select an account to view transactions'
                                                    }
                                                </small>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((txn, index) => (
                                        <tr key={txn.id} className="transaction-row">
                                            <td className="border-0 py-2">
                                                <span className="text-dark fw-medium small">
                                                    {formatDate(txn.transactionDate)}
                                                </span>
                                            </td>
                                            <td className="border-0 py-2">
                                                <div className="d-flex align-items-center">
                                                    <span className="me-1 small">{getTransactionIcon(txn.transactionType)}</span>
                                                    <Badge 
                                                        className={`px-2 py-1 text-capitalize transaction-badge small ${
                                                            txn.transactionType === 'deposit' ? 'badge-success-gradient' : 'badge-danger-gradient'
                                                        }`}
                                                    >
                                                        {txn.transactionType}
                                                    </Badge>
                                                </div>
                                            </td>
                                            <td className="border-0 py-2">
                                                <div>
                                                    <div className="fw-medium text-dark small">{txn.description}</div>
                                                    {txn.category && (
                                                        <small className="text-purple-muted" style={{fontSize: '0.7rem'}}>{txn.category}</small>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="border-0 py-2">
                                                <code className="bg-purple-light px-2 py-1 rounded text-purple small">
                                                    {txn.reference || '—'}
                                                </code>
                                            </td>
                                            <td className={`border-0 py-2 text-end fw-bold small ${
                                                txn.transactionType === 'deposit' ? 'text-success' : 'text-danger'
                                            }`}>
                                                {txn.transactionType === 'deposit' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                                            </td>
                                            <td className="border-0 py-2 text-end fw-semibold text-dark small">
                                                ₹{txn.balance?.toLocaleString('en-IN')}
                                            </td>
                                            <td className="border-0 py-2 text-center">
                                                <Badge 
                                                    className={`px-2 py-1 status-badge small ${
                                                        txn.status === 'completed' ? 'badge-success-gradient' : 'badge-warning-gradient'
                                                    }`}
                                                >
                                                    {txn.status === 'completed' ? '✓ Done' : '⏳ Pending'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>

            {/* Custom Purple Theme Styles */}
            <style>
                {`
                .transaction-history-card {
                    border-radius: 16px;
                    overflow: hidden;
                }

                .bg-gradient-purple {
                    background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 50%, #b794f6 100%);
                    padding: 1.25rem 1.5rem 0.75rem;
                }

                .bg-gradient-light-purple {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.08) 0%, rgba(156, 136, 255, 0.08) 100%);
                }

                .text-purple {
                    color: #6c63ff !important;
                }

                .text-purple-muted {
                    color: #9c88ff !important;
                }

                .bg-purple-light {
                    background: rgba(108, 99, 255, 0.1) !important;
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

                .transaction-table {
                    font-size: 0.8rem;
                }

                .transaction-table th {
                    font-size: 0.7rem;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                    padding: 0.75rem 1rem;
                    font-weight: 600;
                    border-bottom: 2px solid rgba(108, 99, 255, 0.1);
                }

                .transaction-table td {
                    padding: 0.5rem 1rem;
                    vertical-align: middle;
                    font-size: 0.8rem;
                }

                .transaction-row {
                    border-bottom: 1px solid rgba(108, 99, 255, 0.08);
                }

                .transaction-row:last-child {
                    border-bottom: none;
                }

                .badge-success-gradient {
                    background: linear-gradient(135deg, #10b981 0%, #34d399 100%) !important;
                    color: white !important;
                    font-size: 0.65rem;
                    font-weight: 600;
                    border: none;
                }

                .badge-danger-gradient {
                    background: linear-gradient(135deg, #ef4444 0%, #f87171 100%) !important;
                    color: white !important;
                    font-size: 0.65rem;
                    font-weight: 600;
                    border: none;
                }

                .badge-warning-gradient {
                    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%) !important;
                    color: white !important;
                    font-size: 0.65rem;
                    font-weight: 500;
                    border: none;
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

                @media (max-width: 768px) {
                    .bg-gradient-purple {
                        padding: 1rem;
                    }

                    .transaction-history-card .card-header .d-flex {
                        flex-direction: column;
                        gap: 1rem;
                    }

                    .transaction-table th,
                    .transaction-table td {
                        padding: 0.4rem 0.6rem;
                        font-size: 0.75rem;
                    }

                    .transaction-table th {
                        font-size: 0.65rem;
                    }

                    .input-group {
                        width: 100% !important;
                    }

                    .badge-success-gradient,
                    .badge-danger-gradient,
                    .badge-warning-gradient {
                        font-size: 0.6rem;
                    }
                }

                @media (max-width: 576px) {
                    .transaction-table {
                        font-size: 0.7rem;
                    }

                    .transaction-table th:nth-child(4),
                    .transaction-table td:nth-child(4) {
                        display: none;
                    }

                    .transaction-table th:nth-child(6),
                    .transaction-table td:nth-child(6) {
                        display: none;
                    }

                    .transaction-table th,
                    .transaction-table td {
                        padding: 0.3rem 0.5rem;
                        font-size: 0.7rem;
                    }
                }

                /* Subtle animations */
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .transaction-row {
                    animation: fadeInUp 0.3s ease-out;
                }

                .transaction-row:nth-child(odd) {
                    animation-delay: 0.05s;
                }

                .transaction-row:nth-child(even) {
                    animation-delay: 0.1s;
                }
                `}
            </style>
        </>
    );
}

export default TransactionHistory;