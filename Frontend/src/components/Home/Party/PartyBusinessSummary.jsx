import React from 'react';
import { Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFileInvoice,
    faMoneyBillWave,
    faChartLine,
    faUser,
    faUserCheck,
    faBuilding,
    faChartBar,
    faPhone,
    faEnvelope,
    faIdCard,
    faMapMarkerAlt,
    faComments,
    faFileAlt,
    faComment,
    faHistory
} from '@fortawesome/free-solid-svg-icons';

function PartyBusinessSummary({ party, partyTransactions, paymentSummary, formatCurrency, onTabChange }) {
    return (
        <div className="p-4">
            <h4 className="mb-3">Business Summary</h4>
            
            {/* Key Metrics Row */}
            <Row className="mb-4">
                <Col md={3}>
                    <Card className="quick-stat-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon={faFileInvoice} size="2x" className="text-primary mb-2" />
                            <h4 className="mb-1">{partyTransactions.length}</h4>
                            <p className="text-muted mb-0">Total Transactions</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="quick-stat-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon
                                icon={faMoneyBillWave}
                                size="2x"
                                className={paymentSummary.netBalance >= 0 ? "text-success" : "text-danger"}
                            />
                            <h4 className={`mb-1 ${paymentSummary.netBalance >= 0 ? "text-success" : "text-danger"}`}>
                                ₹{formatCurrency(Math.abs(paymentSummary.netBalance))}
                            </h4>
                            <p className="text-muted mb-0">Net Balance</p>
                            <small className="text-muted">
                                {paymentSummary.netBalance >= 0 ? 'You will receive' : 'You need to pay'}
                            </small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="quick-stat-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon icon={faChartLine} size="2x" className="text-info mb-2" />
                            <h4 className="mb-1">₹{formatCurrency((paymentSummary.totalSales + paymentSummary.totalPurchases) / (partyTransactions.length || 1))}</h4>
                            <p className="text-muted mb-0">Avg Transaction</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="quick-stat-card h-100">
                        <Card.Body className="text-center">
                            <FontAwesomeIcon
                                icon={paymentSummary.salesDue > 0 ? faUser : faUserCheck}
                                size="2x"
                                className={paymentSummary.salesDue > 0 ? "text-warning" : "text-success"}
                            />
                            <h4 className={`mb-1 ${paymentSummary.salesDue > 0 ? "text-warning" : "text-success"}`}>
                                {paymentSummary.salesDue > 0 ? 'Outstanding' : 'Clear'}
                            </h4>
                            <p className="text-muted mb-0">Payment Status</p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Business Summary Section */}
            <Row className="mb-4">
                <Col md={12}>
                    <Card>
                        <Card.Header>
                            <h6 className="mb-0">
                                <FontAwesomeIcon icon={faChartBar} className="me-2" />
                                Business Details
                            </h6>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={6}>
                                    <h6>Transaction Summary</h6>
                                    <div className="mb-3">
                                        <div className="stat-item mb-2">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <span className="text-muted">First Transaction</span>
                                                <span className="fw-bold">
                                                    {partyTransactions.length > 0 ? 
                                                    new Date(partyTransactions[partyTransactions.length - 1].date).toLocaleDateString() : 
                                                    'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="stat-item mb-2">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <span className="text-muted">Latest Transaction</span>
                                                <span className="fw-bold">
                                                    {partyTransactions.length > 0 ? 
                                                    new Date(partyTransactions[0].date).toLocaleDateString() : 
                                                    'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="stat-item mb-2">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <span className="text-muted">Total Business Volume</span>
                                                <span className="fw-bold text-primary">
                                                    ₹{formatCurrency(paymentSummary.totalSales + paymentSummary.totalPurchases)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <hr />
                                    
                                    <h6>{party.partyType === 'customer' ? 'Sales Summary' : 'Purchase Summary'}</h6>
                                    {party.partyType === 'customer' ? (
                                        <div className="mt-3">
                                            <div className="stat-item mb-2">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="text-muted">Total Sales</span>
                                                    <span className="fw-bold text-success">₹{formatCurrency(paymentSummary.totalSales)}</span>
                                                </div>
                                            </div>
                                            <div className="stat-item mb-2">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="text-muted">Amount Received</span>
                                                    <span className="fw-bold text-info">₹{formatCurrency(paymentSummary.totalSalesPaid)}</span>
                                                </div>
                                            </div>
                                            <div className="stat-item mb-2">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="text-muted">Amount Due</span>
                                                    <span className={`fw-bold ${paymentSummary.salesDue > 0 ? 'text-danger' : 'text-success'}`}>
                                                        ₹{formatCurrency(paymentSummary.salesDue)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-3">
                                            <div className="stat-item mb-2">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="text-muted">Total Purchases</span>
                                                    <span className="fw-bold text-primary">₹{formatCurrency(paymentSummary.totalPurchases)}</span>
                                                </div>
                                            </div>
                                            <div className="stat-item mb-2">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="text-muted">Amount Paid</span>
                                                    <span className="fw-bold text-info">₹{formatCurrency(paymentSummary.totalPurchasesPaid)}</span>
                                                </div>
                                            </div>
                                            <div className="stat-item mb-2">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="text-muted">Amount Payable</span>
                                                    <span className={`fw-bold ${paymentSummary.purchasesDue > 0 ? 'text-warning' : 'text-success'}`}>
                                                        ₹{formatCurrency(paymentSummary.purchasesDue)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Col>
                                
                                <Col md={6}>
                                    <h6>Contact Information</h6>
                                    <div className="mt-3">
                                        {party.phone && (
                                            <div className="contact-item mb-2">
                                                <FontAwesomeIcon icon={faPhone} className="me-2 text-primary" />
                                                <span>{party.phone}</span>
                                                <Button variant="outline-success" size="sm" className="ms-2 py-0 px-2">
                                                    <FontAwesomeIcon icon={faComments} className="me-1" />
                                                    Message
                                                </Button>
                                            </div>
                                        )}
                                        
                                        {party.email && (
                                            <div className="contact-item mb-2">
                                                <FontAwesomeIcon icon={faEnvelope} className="me-2 text-info" />
                                                <span>{party.email}</span>
                                            </div>
                                        )}
                                        
                                        {party.gstNumber && (
                                            <div className="contact-item mb-2">
                                                <FontAwesomeIcon icon={faIdCard} className="me-2 text-danger" />
                                                <span>GST: {party.gstNumber}</span>
                                            </div>
                                        )}
                                        
                                        {(party.city || party.taluka || party.state) && (
                                            <div className="contact-item mb-2">
                                                <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2 text-warning" />
                                                <span>
                                                    {[party.city, party.taluka, party.state]
                                                        .filter(Boolean)
                                                        .join(', ')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <hr />
                                    
                                    <h6>Important Actions</h6>
                                    <div className="d-flex flex-wrap gap-2 mt-3">
                                        <Button variant="primary" size="sm">
                                            <FontAwesomeIcon icon={faFileInvoice} className="me-1" />
                                            New {party.partyType === 'customer' ? 'Sale' : 'Purchase'}
                                        </Button>
                                        
                                        <Button variant="success" size="sm">
                                            <FontAwesomeIcon icon={faMoneyBillWave} className="me-1" />
                                            Record Payment
                                        </Button>
                                        
                                        <Button variant="info" size="sm" className="text-white">
                                            <FontAwesomeIcon icon={faFileAlt} className="me-1" />
                                            Send Statement
                                        </Button>
                                        
                                        <Button variant="warning" size="sm" className="text-dark">
                                            <FontAwesomeIcon icon={faComment} className="me-1" />
                                            Send Message
                                        </Button>
                                    </div>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            
            {/* Recent Activity */}
            <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">
                        <FontAwesomeIcon icon={faHistory} className="me-2" />
                        Recent Activity
                    </h6>
                    <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => onTabChange('transactions')}
                    >
                        View All
                    </Button>
                </Card.Header>
                <Card.Body>
                    {partyTransactions.length > 0 ? (
                        <div className="activity-list">
                            {partyTransactions.slice(0, 5).map((transaction, index) => (
                                <div key={transaction.id || index} className="activity-item d-flex align-items-center gap-3 mb-3 p-3 bg-light rounded">
                                    <div className={`activity-icon ${transaction.type === 'sale' ? 'text-success' : 'text-primary'}`}>
                                        <FontAwesomeIcon
                                            icon={transaction.type === 'sale' ? faFileInvoice : faBuilding}
                                            size="lg"
                                        />
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className="fw-semibold">
                                            {transaction.type === 'sale' ? 'Sale' : 'Purchase'} - {transaction.reference}
                                        </div>
                                        <div className="text-muted small">
                                            {new Date(transaction.date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className={`fw-bold ${transaction.type === 'sale' ? 'text-success' : 'text-primary'}`}>
                                        ₹{formatCurrency(transaction.amount)}
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

export default PartyBusinessSummary;