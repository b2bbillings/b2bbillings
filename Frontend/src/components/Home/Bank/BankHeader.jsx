import React from 'react';
import { Container, Row, Col, Button, Form, InputGroup, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus,
    faSearch,
    faUniversity,
    faMoneyBillWave,
    faFileExport,
    faSync,
    faChartLine
} from '@fortawesome/free-solid-svg-icons';

function BankHeader({
    activeType,
    onTypeChange,
    transactionSearchQuery,
    onTransactionSearchChange,
    onAddAccount,
    totalBalance
}) {
    const formatCurrency = (amount) => {
        return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="bank-header">
            <Container fluid>
                <Row className="align-items-center">
                    <Col md={3}>
                        <div className="d-flex align-items-center">
                            <FontAwesomeIcon icon={faUniversity} size="lg" className="me-3" />
                            <div>
                                <h4 className="mb-0">Bank & Cash</h4>
                                <small className="opacity-75">Manage your accounts</small>
                            </div>
                        </div>
                    </Col>

                    <Col md={3}>
                        <div className="bank-type-tabs">
                            <button
                                className={`bank-type-tab ${activeType === 'bank' ? 'active' : ''}`}
                                onClick={() => onTypeChange('bank')}
                            >
                                <FontAwesomeIcon icon={faUniversity} className="me-2" />
                                Bank Accounts
                            </button>
                            <button
                                className={`bank-type-tab ${activeType === 'cash' ? 'active' : ''}`}
                                onClick={() => onTypeChange('cash')}
                            >
                                <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                                Cash Accounts
                            </button>
                        </div>
                    </Col>

                    <Col md={3}>
                        <div className="text-center">
                            <div className="text-white-50 small">Total Balance</div>
                            <div className="h5 mb-0 fw-bold">
                                {formatCurrency(totalBalance)}
                            </div>
                        </div>
                    </Col>

                    <Col md={3}>
                        <div className="d-flex justify-content-end gap-2">
                            <Button
                                variant="outline-light"
                                size="sm"
                                onClick={() => onAddAccount(activeType)}
                            >
                                <FontAwesomeIcon icon={faPlus} className="me-2" />
                                Add {activeType === 'bank' ? 'Bank Account' : 'Cash Account'}
                            </Button>

                            <Button variant="outline-light" size="sm">
                                <FontAwesomeIcon icon={faSync} className="me-2" />
                                Sync
                            </Button>

                            <Button variant="outline-light" size="sm">
                                <FontAwesomeIcon icon={faFileExport} className="me-2" />
                                Export
                            </Button>
                        </div>
                    </Col>
                </Row>

                {/* Quick Stats Row */}
                <Row className="mt-3">
                    <Col md={12}>
                        <div className="d-flex justify-content-center gap-4">
                            <div className="text-center">
                                <div className="text-white-50 small">Today's Deposits</div>
                                <div className="fw-semibold">{formatCurrency(45000)}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-white-50 small">Today's Withdrawals</div>
                                <div className="fw-semibold">{formatCurrency(12000)}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-white-50 small">Net Cash Flow</div>
                                <div className="fw-semibold text-success">{formatCurrency(33000)}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-white-50 small">Active Accounts</div>
                                <div className="fw-semibold">4</div>
                            </div>
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}

export default BankHeader;