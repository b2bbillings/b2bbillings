import React, { useState } from 'react';
import { Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFileAlt,
    faCalendarDay,
    faCalendar,
    faCalendarAlt,
    faFileInvoice
} from '@fortawesome/free-solid-svg-icons';

function PartyStatement({ party, partyTransactions, paymentSummary, formatCurrency }) {
    const [statementView, setStatementView] = useState('daywise');

    // Group transactions by date, month, or year for statements
    const getGroupedTransactions = () => {
        if (!partyTransactions.length) return {};
        
        switch (statementView) {
            case 'daywise':
                // Group by day
                return partyTransactions.reduce((acc, transaction) => {
                    const date = new Date(transaction.date).toLocaleDateString();
                    if (!acc[date]) acc[date] = [];
                    acc[date].push(transaction);
                    return acc;
                }, {});
            
            case 'monthly':
                // Group by month
                return partyTransactions.reduce((acc, transaction) => {
                    const date = new Date(transaction.date);
                    const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
                    if (!acc[monthYear]) acc[monthYear] = [];
                    acc[monthYear].push(transaction);
                    return acc;
                }, {});
            
            case 'yearly':
                // Group by year
                return partyTransactions.reduce((acc, transaction) => {
                    const year = new Date(transaction.date).getFullYear().toString();
                    if (!acc[year]) acc[year] = [];
                    acc[year].push(transaction);
                    return acc;
                }, {});
                
            default:
                return {};
        }
    };

    return (
        <div className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="mb-0">Statement of Account</h4>
                <div className="btn-group">
                    <Button 
                        variant={statementView === 'daywise' ? 'primary' : 'outline-primary'}
                        onClick={() => setStatementView('daywise')}
                    >
                        <FontAwesomeIcon icon={faCalendarDay} className="me-1" />
                        Daily
                    </Button>
                    <Button 
                        variant={statementView === 'monthly' ? 'primary' : 'outline-primary'}
                        onClick={() => setStatementView('monthly')}
                    >
                        <FontAwesomeIcon icon={faCalendar} className="me-1" />
                        Monthly
                    </Button>
                    <Button 
                        variant={statementView === 'yearly' ? 'primary' : 'outline-primary'}
                        onClick={() => setStatementView('yearly')}
                    >
                        <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                        Yearly
                    </Button>
                </div>
            </div>
            
            <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">
                        <FontAwesomeIcon icon={faFileAlt} className="me-2" />
                        {statementView === 'daywise' ? 'Daywise' : statementView === 'monthly' ? 'Monthly' : 'Yearly'} Statement
                    </h6>
                    <Button variant="outline-primary" size="sm">
                        <FontAwesomeIcon icon={faFileAlt} className="me-1" />
                        Export
                    </Button>
                </Card.Header>
                <Card.Body>
                    {Object.keys(getGroupedTransactions()).length > 0 ? (
                        <>
                            <div className="statement-summary mb-4 p-3 bg-light rounded">
                                <Row>
                                    <Col md={4}>
                                        <div className="text-muted">Opening Balance</div>
                                        <div className="fw-bold">₹0.00</div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="text-muted">Closing Balance</div>
                                        <div className={`fw-bold ${paymentSummary.netBalance >= 0 ? 'text-success' : 'text-danger'}`}>
                                            ₹{formatCurrency(Math.abs(paymentSummary.netBalance))}
                                            <small className="ms-1">
                                                {paymentSummary.netBalance >= 0 ? '(Dr)' : '(Cr)'}
                                            </small>
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="text-muted">Period</div>
                                        <div className="fw-bold">
                                            {partyTransactions.length > 0 ? (
                                                <>
                                                    {new Date(partyTransactions[partyTransactions.length - 1].date).toLocaleDateString()}
                                                    {' to '}
                                                    {new Date(partyTransactions[0].date).toLocaleDateString()}
                                                </>
                                            ) : 'N/A'}
                                        </div>
                                    </Col>
                                </Row>
                            </div>
                            
                            {Object.entries(getGroupedTransactions()).map(([period, transactions]) => (
                                <div key={period} className="statement-period mb-4">
                                    <h6 className="border-bottom pb-2">{period}</h6>
                                    <table className="table table-sm">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Date</th>
                                                <th>Reference</th>
                                                <th>Type</th>
                                                <th className="text-end">Amount</th>
                                                <th className="text-end">Running Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map((transaction, idx) => {
                                                // Calculate running balance (just a mock implementation)
                                                const runningBalance = transactions
                                                    .slice(0, idx + 1)
                                                    .reduce((sum, t) => {
                                                        return sum + (t.type === 'sale' ? t.amount : -t.amount);
                                                    }, 0);
                                                    
                                                return (
                                                    <tr key={transaction.id || idx}>
                                                        <td>{new Date(transaction.date).toLocaleDateString()}</td>
                                                        <td>{transaction.reference}</td>
                                                        <td>
                                                            <Badge 
                                                                bg={transaction.type === 'sale' ? 'success' : 'primary'}
                                                            >
                                                                {transaction.type === 'sale' ? 'Sale' : 'Purchase'}
                                                            </Badge>
                                                        </td>
                                                        <td className="text-end">₹{formatCurrency(transaction.amount)}</td>
                                                        <td className={`text-end ${runningBalance >= 0 ? 'text-success' : 'text-danger'}`}>
                                                            ₹{formatCurrency(Math.abs(runningBalance))} 
                                                            <small className="ms-1">
                                                                {runningBalance >= 0 ? '(Dr)' : '(Cr)'}
                                                            </small>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="table-light">
                                            <tr>
                                                <th colSpan={3}>Total</th>
                                                <th className="text-end">
                                                    ₹{formatCurrency(transactions.reduce((sum, t) => sum + t.amount, 0))}
                                                </th>
                                                <th className="text-end">
                                                    -
                                                </th>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            ))}
                        </>
                    ) : (
                        <Alert variant="info">
                            <FontAwesomeIcon icon={faFileAlt} className="me-2" />
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

export default PartyStatement;