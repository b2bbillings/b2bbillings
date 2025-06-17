import React, { useState, useEffect } from 'react';
import { Card, Badge, Alert, Spinner, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHistory,
    faFileInvoice,
    faMoneyBillWave,
    faArrowUp,
    faArrowDown,
    faBuilding,
    faRefresh
} from '@fortawesome/free-solid-svg-icons';
import paymentService from '../../../services/paymentService';

function PartyTransactions({ party, partyTransactions = [], formatCurrency, currentCompany }) {
    const [transactions, setTransactions] = useState(partyTransactions);
    const [payments, setPayments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Load payment transactions when component mounts or party changes
    useEffect(() => {
        if (party && currentCompany) {
            loadPaymentTransactions();
        }
    }, [party, currentCompany]);


    const loadPaymentTransactions = async () => {
        try {
            setIsLoading(true);
            setError('');

            const partyId = party._id || party.id;
            const companyId = currentCompany._id || currentCompany.id;

            if (!partyId) {
                throw new Error('Party ID is required');
            }

            if (!companyId) {
                throw new Error('Company ID is required');
            }

            console.log('🔍 PartyTransactions: Loading payment history for:', { partyId, companyId });

            // FIXED: Use getPartyPaymentHistory instead of getPaymentHistory
            const response = await paymentService.getPartyPaymentHistory(companyId, partyId, {
                limit: 100,
                sortBy: 'paymentDate', // Changed from 'createdAt' to 'paymentDate'
                sortOrder: 'desc'
            });

            console.log('✅ PartyTransactions: Payment response:', response);

            if (response.success) {
                const paymentData = response.data || response.payments || [];
                console.log('📊 PartyTransactions: Setting payments:', paymentData.length);
                setPayments(paymentData);
            } else {
                console.log('⚠️ PartyTransactions: No payments found');
                setPayments([]);
                if (response.message) {
                    setError(response.message);
                }
            }

        } catch (error) {
            console.error('❌ PartyTransactions: Error loading payments:', error);
            setError('Failed to load payment transactions: ' + error.message);
            setPayments([]);
        } finally {
            setIsLoading(false);
        }
    };
    // Manual refresh button
    const handleRefresh = () => {
        loadPaymentTransactions();
    };

    // Combine and sort all transactions (sales, purchases, payments)
    const allTransactions = React.useMemo(() => {
        const combined = [];

        // Add existing transactions (sales/purchases)
        transactions.forEach(transaction => {
            combined.push({
                ...transaction,
                transactionType: 'business',
                sortDate: new Date(transaction.date || transaction.createdAt)
            });
        });

        // Add payment transactions
        payments.forEach(payment => {
            combined.push({
                id: payment._id,
                reference: payment.paymentNumber || `Payment-${payment._id?.substring(0, 8)}`,
                type: payment.type === 'payment_in' ? 'payment_in' : 'payment_out',
                transactionType: 'payment',
                amount: payment.amount,
                date: payment.paymentDate || payment.createdAt,
                sortDate: new Date(payment.paymentDate || payment.createdAt),
                paymentMethod: payment.paymentMethod,
                status: payment.status,
                notes: payment.notes,
                employeeName: payment.employeeName,
                partyName: payment.partyName
            });
        });

        // Sort by date (newest first)
        return combined.sort((a, b) => b.sortDate - a.sortDate);
    }, [transactions, payments]);

    // Format transaction display functions
    const getTransactionIcon = (transaction) => {
        if (transaction.transactionType === 'payment') {
            return transaction.type === 'payment_in' ? faArrowDown : faArrowUp;
        }
        return transaction.type === 'sale' ? faFileInvoice : faBuilding;
    };

    const getTransactionColor = (transaction) => {
        if (transaction.transactionType === 'payment') {
            return transaction.type === 'payment_in' ? 'text-success' : 'text-danger';
        }
        return transaction.type === 'sale' ? 'text-success' : 'text-primary';
    };

    const getTransactionBadge = (transaction) => {
        if (transaction.transactionType === 'payment') {
            return transaction.type === 'payment_in' ? 'success' : 'danger';
        }
        return transaction.type === 'sale' ? 'success' : 'primary';
    };

    const getTransactionLabel = (transaction) => {
        if (transaction.transactionType === 'payment') {
            return transaction.type === 'payment_in' ? 'Payment Received' : 'Payment Made';
        }
        return transaction.type === 'sale' ? 'Sale' : 'Purchase';
    };

    const getTransactionAmount = (transaction) => {
        if (transaction.transactionType === 'payment') {
            const prefix = transaction.type === 'payment_in' ? '+' : '-';
            return `${prefix}₹${formatCurrency ? formatCurrency(transaction.amount) : transaction.amount.toLocaleString()}`;
        }
        return `₹${formatCurrency ? formatCurrency(transaction.amount) : transaction.amount.toLocaleString()}`;
    };

    return (
        <div className="p-4">
            <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">
                        <FontAwesomeIcon icon={faHistory} className="me-2" />
                        All Transactions ({allTransactions.length})
                        <small className="text-muted ms-2">
                            ({payments.length} payments, {transactions.length} business)
                        </small>
                    </h6>
                    <div className="d-flex align-items-center gap-2">
                        <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isLoading}
                        >
                            <FontAwesomeIcon icon={faRefresh} className={isLoading ? 'fa-spin' : ''} />
                        </Button>
                        {isLoading && (
                            <Spinner animation="border" size="sm" />
                        )}
                    </div>
                </Card.Header>
                <Card.Body>
                    {error && (
                        <Alert variant="danger" className="mb-3">
                            <small>{error}</small>
                        </Alert>
                    )}

                    {allTransactions.length > 0 ? (
                        <div className="activity-list">
                            {allTransactions.map((transaction, index) => (
                                <div key={transaction.id || `${transaction.type}-${index}`}
                                    className="activity-item d-flex align-items-center gap-3 mb-3 p-3 border rounded">
                                    <div className={`activity-icon ${getTransactionColor(transaction)}`}>
                                        <FontAwesomeIcon
                                            icon={getTransactionIcon(transaction)}
                                            size="lg"
                                        />
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div>
                                                <div className="fw-semibold">
                                                    {getTransactionLabel(transaction)} - {transaction.reference}
                                                </div>
                                                <div className="text-muted small">
                                                    {new Date(transaction.date).toLocaleDateString('en-IN', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })} •
                                                    <Badge bg={getTransactionBadge(transaction)} className="ms-1">
                                                        {getTransactionLabel(transaction).toUpperCase()}
                                                    </Badge>
                                                    {transaction.paymentMethod && (
                                                        <Badge bg="secondary" className="ms-1">
                                                            {transaction.paymentMethod.toUpperCase()}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {transaction.notes && (
                                                    <div className="text-muted small mt-1">
                                                        <em>{transaction.notes}</em>
                                                    </div>
                                                )}
                                                {transaction.employeeName && (
                                                    <div className="text-muted small">
                                                        By: {transaction.employeeName}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-end">
                                                <div className={`fw-bold ${getTransactionColor(transaction)}`}>
                                                    {getTransactionAmount(transaction)}
                                                </div>
                                                {transaction.status && (
                                                    <small className="text-muted">
                                                        Status: {transaction.status}
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
                            No transactions found for {party?.name}
                            <div className="mt-2">
                                <small>
                                    Transactions will appear here once you create sales, purchases, or payments with this party.
                                </small>
                            </div>
                        </Alert>
                    )}
                </Card.Body>
            </Card>
        </div>
    );
}

export default PartyTransactions;