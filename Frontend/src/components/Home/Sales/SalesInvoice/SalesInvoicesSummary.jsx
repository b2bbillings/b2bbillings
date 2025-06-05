import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowUp,
    faArrowDown,
    faRupeeSign,
    faReceipt,
    faWallet,
    faChartLine
} from '@fortawesome/free-solid-svg-icons';

function SalesInvoicesSummary({ summary }) {
    const formatCurrency = (amount) => {
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    const isPositiveGrowth = summary.growthPercentage >= 0;

    return (
        <>
            <div className="sales-summary-section py-3">
                <Container fluid>
                    <Row className="g-3">
                        {/* Main Sales Card */}
                        <Col lg={4} md={6}>
                            <Card className="sales-summary-card border-0 shadow-sm h-100">
                                <Card.Body className="p-3">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <div className="summary-icon">
                                            <FontAwesomeIcon icon={faChartLine} className="text-purple" />
                                        </div>
                                        <div className={`growth-badge ${isPositiveGrowth ? 'positive' : 'negative'}`}>
                                            <FontAwesomeIcon
                                                icon={isPositiveGrowth ? faArrowUp : faArrowDown}
                                                className="me-1"
                                                size="xs"
                                            />
                                            <span className="fw-semibold">{Math.abs(summary.growthPercentage)}%</span>
                                        </div>
                                    </div>

                                    <div className="summary-content">
                                        <div className="summary-title mb-1">
                                            <small className="text-muted fw-medium">Total Sales Amount</small>
                                        </div>
                                        <h4 className="amount-value mb-0 text-dark fw-bold">
                                            {formatCurrency(summary.totalSalesAmount)}
                                        </h4>
                                        <small className="text-muted">vs last month</small>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Received Amount Card */}
                        <Col lg={4} md={6}>
                            <Card className="sales-summary-card border-0 shadow-sm h-100">
                                <Card.Body className="p-3">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <div className="summary-icon">
                                            <FontAwesomeIcon icon={faWallet} className="text-success" />
                                        </div>
                                        <div className="status-badge received">
                                            <span className="fw-semibold">Received</span>
                                        </div>
                                    </div>

                                    <div className="summary-content">
                                        <div className="summary-title mb-1">
                                            <small className="text-muted fw-medium">Amount Received</small>
                                        </div>
                                        <h4 className="amount-value mb-0 text-success fw-bold">
                                            {formatCurrency(summary.received)}
                                        </h4>
                                        <small className="text-muted">
                                            {((summary.received / summary.totalSalesAmount) * 100).toFixed(1)}% of total
                                        </small>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Balance Amount Card */}
                        <Col lg={4} md={6}>
                            <Card className="sales-summary-card border-0 shadow-sm h-100">
                                <Card.Body className="p-3">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <div className="summary-icon">
                                            <FontAwesomeIcon icon={faReceipt} className="text-warning" />
                                        </div>
                                        <div className="status-badge pending">
                                            <span className="fw-semibold">Pending</span>
                                        </div>
                                    </div>

                                    <div className="summary-content">
                                        <div className="summary-title mb-1">
                                            <small className="text-muted fw-medium">Outstanding Balance</small>
                                        </div>
                                        <h4 className="amount-value mb-0 text-warning fw-bold">
                                            {formatCurrency(summary.balance)}
                                        </h4>
                                        <small className="text-muted">
                                            {((summary.balance / summary.totalSalesAmount) * 100).toFixed(1)}% pending
                                        </small>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* Enhanced Styles */}
            <style>
                {`
                .sales-summary-section {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.03) 0%, rgba(156, 136, 255, 0.03) 100%);
                    border-radius: 12px;
                    margin-bottom: 1rem;
                }

                .sales-summary-card {
                    border-radius: 12px;
                    transition: all 0.3s ease;
                    background: white;
                    border: 1px solid rgba(108, 99, 255, 0.1);
                }

                .sales-summary-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(108, 99, 255, 0.15) !important;
                    border-color: rgba(108, 99, 255, 0.2);
                }

                .summary-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.1rem;
                    background: rgba(108, 99, 255, 0.1);
                }

                .text-purple {
                    color: #6c63ff !important;
                }

                .growth-badge {
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    color: white;
                }

                .growth-badge.positive {
                    background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
                }

                .growth-badge.negative {
                    background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
                }

                .status-badge {
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    color: white;
                }

                .status-badge.received {
                    background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
                }

                .status-badge.pending {
                    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
                }

                .summary-title {
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .amount-value {
                    font-size: 1.4rem;
                    line-height: 1.2;
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .sales-summary-section {
                        padding: 0.75rem 0;
                    }

                    .amount-value {
                        font-size: 1.2rem;
                    }

                    .summary-icon {
                        width: 35px;
                        height: 35px;
                        font-size: 1rem;
                    }

                    .growth-badge,
                    .status-badge {
                        font-size: 0.7rem;
                        padding: 3px 6px;
                    }
                }

                @media (max-width: 576px) {
                    .amount-value {
                        font-size: 1.1rem;
                    }

                    .summary-icon {
                        width: 32px;
                        height: 32px;
                        font-size: 0.9rem;
                    }
                }

                /* Animations */
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

                .sales-summary-card {
                    animation: fadeInUp 0.5s ease-out;
                }

                .sales-summary-card:nth-child(1) {
                    animation-delay: 0.1s;
                }

                .sales-summary-card:nth-child(2) {
                    animation-delay: 0.2s;
                }

                .sales-summary-card:nth-child(3) {
                    animation-delay: 0.3s;
                }

                /* Enhanced Purple Theme */
                .text-success {
                    color: #10b981 !important;
                }

                .text-warning {
                    color: #f59e0b !important;
                }

                .text-primary {
                    color: #6c63ff !important;
                }
                `}
            </style>
        </>
    );
}

export default SalesInvoicesSummary;