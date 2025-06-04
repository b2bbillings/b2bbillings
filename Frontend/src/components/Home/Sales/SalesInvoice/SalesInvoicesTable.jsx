import React from 'react';
import { Container, Row, Col, Button, Table, Badge, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSearch,
    faChartLine,
    faFileExcel,
    faPrint,
    faFilter,
    faEllipsisV,
    faEye,
    faEdit,
    faTrash,
    faCopy
} from '@fortawesome/free-solid-svg-icons';

function SalesInvoicesTable({
    transactions,
    onViewTransaction,
    onEditTransaction,
    onDeleteTransaction,
    onPrintTransaction,
    onShareTransaction
}) {
    const formatCurrency = (amount) => {
        return `₹ ${amount.toLocaleString('en-IN')}`;
    };

    return (
        <div className="transactions-section bg-white rounded shadow-sm">
            <Container fluid>
                {/* Table Header */}
                <div className="table-header border-bottom">
                    <Row className="align-items-center py-3">
                        <Col>
                            <h5 className="table-title mb-0 text-dark fw-semibold">Transactions</h5>
                        </Col>
                        <Col xs="auto">
                            <div className="d-flex gap-2">
                                <Button variant="outline-secondary" size="sm" className="table-action-btn">
                                    <FontAwesomeIcon icon={faSearch} />
                                </Button>
                                <Button variant="outline-secondary" size="sm" className="table-action-btn">
                                    <FontAwesomeIcon icon={faChartLine} />
                                </Button>
                                <Button variant="outline-secondary" size="sm" className="table-action-btn">
                                    <FontAwesomeIcon icon={faFileExcel} />
                                </Button>
                                <Button variant="outline-secondary" size="sm" className="table-action-btn">
                                    <FontAwesomeIcon icon={faPrint} />
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </div>

                {/* Table Content */}
                <div className="table-content">
                    <div className="table-responsive">
                        <Table className="transactions-table mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th className="table-header-cell">
                                        <div className="d-flex align-items-center">
                                            <span className="fw-semibold">Date</span>
                                            <FontAwesomeIcon icon={faFilter} className="ms-2 text-muted filter-icon" />
                                        </div>
                                    </th>
                                    <th className="table-header-cell">
                                        <div className="d-flex align-items-center">
                                            <span className="fw-semibold">Invoice no</span>
                                            <FontAwesomeIcon icon={faFilter} className="ms-2 text-muted filter-icon" />
                                        </div>
                                    </th>
                                    <th className="table-header-cell">
                                        <div className="d-flex align-items-center">
                                            <span className="fw-semibold">Party Name</span>
                                            <FontAwesomeIcon icon={faFilter} className="ms-2 text-muted filter-icon" />
                                        </div>
                                    </th>
                                    <th className="table-header-cell">
                                        <div className="d-flex align-items-center">
                                            <span className="fw-semibold">Transaction</span>
                                            <FontAwesomeIcon icon={faFilter} className="ms-2 text-muted filter-icon" />
                                        </div>
                                    </th>
                                    <th className="table-header-cell">
                                        <div className="d-flex align-items-center">
                                            <span className="fw-semibold">Payment Type</span>
                                            <FontAwesomeIcon icon={faFilter} className="ms-2 text-muted filter-icon" />
                                        </div>
                                    </th>
                                    <th className="table-header-cell">
                                        <div className="d-flex align-items-center">
                                            <span className="fw-semibold">Amount</span>
                                            <FontAwesomeIcon icon={faFilter} className="ms-2 text-muted filter-icon" />
                                        </div>
                                    </th>
                                    <th className="table-header-cell">
                                        <div className="d-flex align-items-center">
                                            <span className="fw-semibold">Balance</span>
                                            <FontAwesomeIcon icon={faFilter} className="ms-2 text-muted filter-icon" />
                                        </div>
                                    </th>
                                    <th className="table-header-cell">
                                        <span className="fw-semibold">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length > 0 ? (
                                    transactions.map((transaction) => (
                                        <tr key={transaction.id} className="transaction-row">
                                            <td className="table-cell">{transaction.date}</td>
                                            <td className="table-cell text-primary fw-semibold">{transaction.invoiceNo}</td>
                                            <td className="table-cell">{transaction.partyName}</td>
                                            <td className="table-cell">
                                                <Badge bg="light" text="dark" className="transaction-badge">
                                                    {transaction.transaction}
                                                </Badge>
                                            </td>
                                            <td className="table-cell">
                                                <Badge bg="light" text="dark" className="payment-badge">
                                                    {transaction.paymentType}
                                                </Badge>
                                            </td>
                                            <td className="table-cell amount-cell">
                                                {formatCurrency(transaction.amount)}
                                            </td>
                                            <td className="table-cell balance-cell">
                                                {formatCurrency(transaction.balance)}
                                            </td>
                                            <td className="table-cell actions-cell">
                                                <div className="d-flex gap-1 align-items-center">
                                                    <Button
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        className="action-btn"
                                                        title="Print"
                                                        onClick={() => onPrintTransaction(transaction)}
                                                    >
                                                        <FontAwesomeIcon icon={faPrint} />
                                                    </Button>
                                                    <Button
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        className="action-btn"
                                                        title="Share"
                                                        onClick={() => onShareTransaction(transaction)}
                                                    >
                                                        <FontAwesomeIcon icon={faCopy} />
                                                    </Button>
                                                    <Dropdown>
                                                        <Dropdown.Toggle
                                                            variant="outline-secondary"
                                                            size="sm"
                                                            className="action-btn dropdown-toggle-no-caret"
                                                        >
                                                            <FontAwesomeIcon icon={faEllipsisV} />
                                                        </Dropdown.Toggle>
                                                        <Dropdown.Menu align="end">
                                                            <Dropdown.Item
                                                                onClick={() => onViewTransaction(transaction)}
                                                            >
                                                                <FontAwesomeIcon icon={faEye} className="me-2" />
                                                                View
                                                            </Dropdown.Item>
                                                            <Dropdown.Item
                                                                onClick={() => onEditTransaction(transaction)}
                                                            >
                                                                <FontAwesomeIcon icon={faEdit} className="me-2" />
                                                                Edit
                                                            </Dropdown.Item>
                                                            <Dropdown.Item
                                                                className="text-danger"
                                                                onClick={() => onDeleteTransaction(transaction)}
                                                            >
                                                                <FontAwesomeIcon icon={faTrash} className="me-2" />
                                                                Delete
                                                            </Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="text-center py-5 text-muted">
                                            No transactions found for the selected criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                </div>
            </Container>
        </div>
    );
}

export default SalesInvoicesTable;