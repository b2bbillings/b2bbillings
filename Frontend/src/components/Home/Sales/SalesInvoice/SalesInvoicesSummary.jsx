import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons';

function SalesInvoicesSummary({ summary }) {
    const formatCurrency = (amount) => {
        return `₹ ${amount.toLocaleString('en-IN')}`;
    };

    return (
        <div className="summary-section py-4">
            <Container fluid>
                <Row>
                    <Col md={5}>
                        <Card className="summary-card border-0 shadow-sm">
                            <Card.Body className="p-4">
                                <div className="summary-content">
                                    <div className="summary-header mb-2">
                                        <span className="summary-label text-muted">Total Sales Amount</span>
                                    </div>
                                    
                                    <div className="d-flex justify-content-between align-items-end mb-3">
                                        <div className="summary-amount">
                                            <h2 className="amount-value mb-0">{formatCurrency(summary.totalSalesAmount)}</h2>
                                        </div>
                                        <div className="growth-indicator text-end">
                                            <div className="growth-percentage text-success d-flex align-items-center justify-content-end">
                                                <span className="percentage-text fw-bold">{summary.growthPercentage}%</span>
                                                <FontAwesomeIcon icon={faArrowUp} className="ms-1" size="sm" />
                                            </div>
                                            <div className="growth-text text-muted small">vs last month</div>
                                        </div>
                                    </div>
                                    
                                    <div className="summary-breakdown">
                                        <Row>
                                            <Col>
                                                <span className="breakdown-label text-muted">Received: </span>
                                                <strong className="breakdown-value text-primary">
                                                    {formatCurrency(summary.received)}
                                                </strong>
                                            </Col>
                                            <Col>
                                                <div className="text-end">
                                                    <span className="breakdown-label text-muted">Balance: </span>
                                                    <strong className="breakdown-value text-dark">
                                                        {formatCurrency(summary.balance)}
                                                    </strong>
                                                </div>
                                            </Col>
                                        </Row>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}

export default SalesInvoicesSummary;