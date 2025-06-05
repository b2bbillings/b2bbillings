import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowUp,
    faArrowDown,
    faRupeeSign,
    faReceipt,
    faWallet,
    faChartLine,
    faShoppingCart
} from '@fortawesome/free-solid-svg-icons';

function PurchaseBillsSummary({ summary = {} }) {
    const formatCurrency = (amount) => {
        if (amount === undefined || amount === null || isNaN(amount)) {
            return '₹0';
        }
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    // Provide default values for all summary properties
    const {
        totalPurchaseAmount = 0,
        paid = 0,
        unpaid = 0,
        growthPercentage = 0
    } = summary;

    const isPositiveGrowth = growthPercentage >= 0;

    // Calculate percentages safely
    const paidPercentage = totalPurchaseAmount > 0
        ? ((paid / totalPurchaseAmount) * 100).toFixed(1)
        : '0.0';

    const unpaidPercentage = totalPurchaseAmount > 0
        ? ((unpaid / totalPurchaseAmount) * 100).toFixed(1)
        : '0.0';

    return (
        <>
            <div className="purchase-summary-section py-3">
                <Container fluid>
                    <Row className="g-3">
                        {/* Main Purchase Card */}
                        <Col lg={4} md={6}>
                            <Card className="purchase-summary-card border-0 shadow-sm h-100">
                                <Card.Body className="p-3">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <div className="summary-icon">
                                            <FontAwesomeIcon icon={faShoppingCart} className="text-purple" />
                                        </div>
                                        <div className={`growth-badge ${isPositiveGrowth ? 'positive' : 'negative'}`}>
                                            <FontAwesomeIcon
                                                icon={isPositiveGrowth ? faArrowUp : faArrowDown}
                                                className="me-1"
                                                size="xs"
                                            />
                                            <span className="fw-semibold">{Math.abs(growthPercentage)}%</span>
                                        </div>
                                    </div>

                                    <div className="summary-content">
                                        <div className="summary-title mb-1">
                                            <small className="text-muted fw-medium">Total Purchase Amount</small>
                                        </div>
                                        <h4 className="amount-value mb-0 text-dark fw-bold">
                                            {formatCurrency(totalPurchaseAmount)}
                                        </h4>
                                        <small className="text-muted">vs last month</small>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Paid Amount Card */}
                        <Col lg={4} md={6}>
                            <Card className="purchase-summary-card border-0 shadow-sm h-100">
                                <Card.Body className="p-3">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <div className="summary-icon">
                                            <FontAwesomeIcon icon={faWallet} className="text-success" />
                                        </div>
                                        <div className="status-badge paid">
                                            <span className="fw-semibold">Paid</span>
                                        </div>
                                    </div>

                                    <div className="summary-content">
                                        <div className="summary-title mb-1">
                                            <small className="text-muted fw-medium">Amount Paid</small>
                                        </div>
                                        <h4 className="amount-value mb-0 text-success fw-bold">
                                            {formatCurrency(paid)}
                                        </h4>
                                        <small className="text-muted">
                                            {paidPercentage}% of total
                                        </small>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Unpaid Amount Card */}
                        <Col lg={4} md={6}>
                            <Card className="purchase-summary-card border-0 shadow-sm h-100">
                                <Card.Body className="p-3">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <div className="summary-icon">
                                            <FontAwesomeIcon icon={faReceipt} className="text-warning" />
                                        </div>
                                        <div className="status-badge unpaid">
                                            <span className="fw-semibold">Unpaid</span>
                                        </div>
                                    </div>

                                    <div className="summary-content">
                                        <div className="summary-title mb-1">
                                            <small className="text-muted fw-medium">Outstanding Balance</small>
                                        </div>
                                        <h4 className="amount-value mb-0 text-warning fw-bold">
                                            {formatCurrency(unpaid)}
                                        </h4>
                                        <small className="text-muted">
                                            {unpaidPercentage}% pending
                                        </small>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* Enhanced Purple Theme Styles */}
            <style>
                {`
                .purchase-summary-section {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.03) 0%, rgba(156, 136, 255, 0.03) 100%);
                    border-radius: 12px;
                    margin-bottom: 1rem;
                }

                .purchase-summary-card {
                    border-radius: 12px;
                    transition: all 0.3s ease;
                    background: white;
                    border: 1px solid rgba(108, 99, 255, 0.1);
                }

                .purchase-summary-card:hover {
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

                .status-badge.paid {
                    background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
                }

                .status-badge.unpaid {
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
                    .purchase-summary-section {
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

                .purchase-summary-card {
                    animation: fadeInUp 0.5s ease-out;
                }

                .purchase-summary-card:nth-child(1) {
                    animation-delay: 0.1s;
                }

                .purchase-summary-card:nth-child(2) {
                    animation-delay: 0.2s;
                }

                .purchase-summary-card:nth-child(3) {
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

                /* Purchase-specific styling */
                .purchase-summary-section::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, #6c63ff 0%, #9c88ff 50%, #b794f6 100%);
                    opacity: 0.6;
                    border-radius: 12px 12px 0 0;
                }

                /* Hover Glow Effects */
                .purchase-summary-card:hover .summary-icon {
                    background: rgba(108, 99, 255, 0.15);
                    transform: scale(1.05);
                }

                .purchase-summary-card:hover .amount-value {
                    text-shadow: 0 0 8px rgba(108, 99, 255, 0.3);
                }

                /* Loading Animation (for future use) */
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.7;
                    }
                }

                .purchase-summary-card.loading {
                    animation: pulse 1.5s ease-in-out infinite;
                }

                /* Focus States for Accessibility */
                .purchase-summary-card:focus-within {
                    outline: 2px solid rgba(108, 99, 255, 0.3);
                    outline-offset: 2px;
                }
                `}
            </style>
        </>
    );
}

export default PurchaseBillsSummary;