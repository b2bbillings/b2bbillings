import React from 'react';
import { Card, Badge, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHistory,
    faFileInvoice,
    faBuilding
} from '@fortawesome/free-solid-svg-icons';

function PartyTransactions({ party, partyTransactions, formatCurrency }) {
    return (
        <div className="p-4">
            <Card>
                <Card.Header>
                    <h6 className="mb-0">
                        <FontAwesomeIcon icon={faHistory} className="me-2" />
                        All Transactions ({partyTransactions.length})
                    </h6>
                </Card.Header>
                <Card.Body>
                    {partyTransactions.length > 0 ? (
                        <div className="activity-list">
                            {partyTransactions.map((transaction, index) => (
                                <div key={transaction.id || index} className="activity-item d-flex align-items-center gap-3 mb-3 p-3 border rounded">
                                    <div className={`activity-icon ${transaction.type === 'sale' ? 'text-success' : 'text-primary'}`}>
                                        <FontAwesomeIcon
                                            icon={transaction.type === 'sale' ? faFileInvoice : faBuilding}
                                            size="lg"
                                        />
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div>
                                                <div className="fw-semibold">
                                                    {transaction.type === 'sale' ? 'Sale' : 'Purchase'} - {transaction.reference}
                                                </div>
                                                <div className="text-muted small">
                                                    {new Date(transaction.date).toLocaleDateString()} •
                                                    <Badge bg={transaction.type === 'sale' ? 'success' : 'primary'} className="ms-1">
                                                        {transaction.type.toUpperCase()}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="text-end">
                                                <div className={`fw-bold ${transaction.type === 'sale' ? 'text-success' : 'text-primary'}`}>
                                                    ₹{formatCurrency(transaction.amount)}
                                                </div>
                                                {transaction.payments && transaction.payments.length > 0 && (
                                                    <small className="text-muted">
                                                        {transaction.payments.length} payment(s)
                                                    </small>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Alert variant="info">
                            <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                            No transactions found for {party.name}
                            <div className="mt-2">
                                <small>Transactions will appear here once you create sales or purchases with this party.</small>
                            </div>
                        </Alert>
                    )}
                </Card.Body>
            </Card>
        </div>
    );
}

export default PartyTransactions;