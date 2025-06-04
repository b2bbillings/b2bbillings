import React from 'react';
import { Row, Col, Card, Table, Button, Form, InputGroup, Badge, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSearch,
    faFilter,
    faPrint,
    faCopy,
    faEllipsisV,
    faEye,
    faEdit,
    faTrash
} from '@fortawesome/free-solid-svg-icons';

function PurchaseBillsTable({
    transactions,
    searchTerm,
    onSearchChange,
    onViewTransaction,
    onEditTransaction,
    onDeleteTransaction,
    onPrintTransaction,
    onShareTransaction
}) {
    return (
        <Card className="transactions-card">
            <Card.Header className="bg-light">
                <Row className="align-items-center">
                    <Col md={6}>
                        <h5 className="mb-0">TRANSACTIONS</h5>
                    </Col>
                    <Col md={6}>
                        <InputGroup size="sm">
                            <InputGroup.Text>
                                <FontAwesomeIcon icon={faSearch} />
                            </InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Search transactions..."
                                value={searchTerm}
                                onChange={onSearchChange}
                            />
                        </InputGroup>
                    </Col>
                </Row>
            </Card.Header>

            <Card.Body className="p-0">
                <div className="table-responsive">
                    <Table className="transactions-table mb-0">
                        <thead className="table-light">
                            <tr>
                                <th>
                                    DATE
                                    <FontAwesomeIcon icon={faFilter} className="ms-2 text-muted" />
                                </th>
                                <th>
                                    INVOICE NO.
                                    <FontAwesomeIcon icon={faFilter} className="ms-2 text-muted" />
                                </th>
                                <th>
                                    PARTY NAME
                                    <FontAwesomeIcon icon={faFilter} className="ms-2 text-muted" />
                                </th>
                                <th>
                                    PAYMENT TYPE
                                    <FontAwesomeIcon icon={faFilter} className="ms-2 text-muted" />
                                </th>
                                <th>
                                    AMOUNT
                                    <FontAwesomeIcon icon={faFilter} className="ms-2 text-muted" />
                                </th>
                                <th>
                                    BALANCE DUE
                                    <FontAwesomeIcon icon={faFilter} className="ms-2 text-muted" />
                                </th>
                                <th width="100"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length > 0 ? (
                                transactions.map((transaction) => (
                                    <tr key={transaction.id}>
                                        <td>{transaction.date}</td>
                                        <td>{transaction.invoiceNo || '-'}</td>
                                        <td>{transaction.partyName}</td>
                                        <td>
                                            <Badge bg="light" text="dark" className="payment-type-badge">
                                                {transaction.paymentType}
                                            </Badge>
                                        </td>
                                        <td>{transaction.amount.toLocaleString()}</td>
                                        <td>
                                            {transaction.balanceDue === 0 ? (
                                                <span className="text-success">0</span>
                                            ) : (
                                                <span className="text-danger">{transaction.balanceDue}</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="d-flex gap-2">
                                                <Button
                                                    variant="outline-secondary"
                                                    size="sm"
                                                    title="Print"
                                                    onClick={() => onPrintTransaction(transaction)}
                                                >
                                                    <FontAwesomeIcon icon={faPrint} />
                                                </Button>
                                                <Button
                                                    variant="outline-secondary"
                                                    size="sm"
                                                    title="Share"
                                                    onClick={() => onShareTransaction(transaction)}
                                                >
                                                    <FontAwesomeIcon icon={faCopy} />
                                                </Button>
                                                <Dropdown>
                                                    <Dropdown.Toggle
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        className="no-caret"
                                                    >
                                                        <FontAwesomeIcon icon={faEllipsisV} />
                                                    </Dropdown.Toggle>
                                                    <Dropdown.Menu align="end">
                                                        <Dropdown.Item onClick={() => onViewTransaction(transaction)}>
                                                            <FontAwesomeIcon icon={faEye} className="me-2" />
                                                            View
                                                        </Dropdown.Item>
                                                        <Dropdown.Item onClick={() => onEditTransaction(transaction)}>
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
                                    <td colSpan="7" className="text-center py-4 text-muted">
                                        No transactions found for the selected criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </div>
            </Card.Body>
        </Card>
    );
}

export default PurchaseBillsTable;