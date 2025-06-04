import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

function PurchaseBillsSummary({ summary }) {
    const formatCurrency = (amount) => {
        return `₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    };

    return (
        <Row className="mb-4">
            <Col md={4}>
                <Card className="summary-card paid-card">
                    <Card.Body className="text-center py-3">
                        <div className="d-flex align-items-center justify-content-center">
                            <div className="summary-icon paid">
                                <FontAwesomeIcon icon={faPlus} />
                            </div>
                            <div className="ms-3">
                                <div className="summary-label">Paid</div>
                                <div className="summary-amount">{formatCurrency(summary.paid)}</div>
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            </Col>

            <Col md={4}>
                <Card className="summary-card unpaid-card">
                    <Card.Body className="text-center py-3">
                        <div className="d-flex align-items-center justify-content-center">
                            <div className="summary-equal">=</div>
                            <div className="ms-3">
                                <div className="summary-label">Unpaid</div>
                                <div className="summary-amount">{formatCurrency(summary.unpaid)}</div>
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            </Col>

            <Col md={4}>
                <Card className="summary-card total-card">
                    <Card.Body className="text-center py-3">
                        <div className="d-flex align-items-center justify-content-center">
                            <div className="summary-label me-3">Total</div>
                            <div className="summary-amount total">{formatCurrency(summary.total)}</div>
                        </div>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
}

export default PurchaseBillsSummary;