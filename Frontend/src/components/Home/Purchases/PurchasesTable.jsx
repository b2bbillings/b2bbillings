import React from 'react';
import { Row, Col, Card, Table, Button, Form, InputGroup, Badge, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSearch,
    faCalendarAlt,
    faEdit,
    faTrash,
    faEye,
    faMoneyBillWave,
    faEllipsisV,
    faDownload,
    faPlus
} from '@fortawesome/free-solid-svg-icons';

function PurchasesTable({
    filteredPurchases,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    onCreatePurchase,
    onEditPurchase,
    onDeletePurchase,
    onManagePayment,
    onPrintPurchase
}) {

    const getStatusBadge = (status) => {
        switch (status) {
            case 'ordered':
                return <Badge bg="info">Ordered</Badge>;
            case 'received':
                return <Badge bg="success">Received</Badge>;
            case 'cancelled':
                return <Badge bg="danger">Cancelled</Badge>;
            case 'partial':
                return <Badge bg="warning">Partial</Badge>;
            default:
                return <Badge bg="secondary">Unknown</Badge>;
        }
    };

    const getPaymentStatusBadge = (purchase) => {
        if (!purchase.paymentHistory || purchase.paymentHistory.length === 0) {
            return <Badge bg="danger">Unpaid</Badge>;
        }

        const totalPaid = purchase.paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
        const totalAmount = purchase.total;

        if (totalPaid >= totalAmount) {
            return <Badge bg="success">Paid</Badge>;
        } else if (totalPaid > 0) {
            return <Badge bg="warning">Partial</Badge>;
        } else {
            return <Badge bg="danger">Unpaid</Badge>;
        }
    };

    return (
        <>
            {/* Search and Filter Section */}
            <Card className="mb-4">
                <Card.Body>
                    <Row className="align-items-end">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Search Purchases</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text>
                                        <FontAwesomeIcon icon={faSearch} />
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search by supplier, purchase number..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </InputGroup>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>From Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={dateFilter.from}
                                    onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>To Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={dateFilter.to}
                                    onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Button
                                variant="outline-secondary"
                                onClick={() => {
                                    setDateFilter({ from: '', to: '' });
                                    setSearchQuery('');
                                }}
                                className="w-100"
                            >
                                Clear Filters
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Purchases Table */}
            <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Purchase Orders ({filteredPurchases.length})</h5>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={onCreatePurchase}
                    >
                        <FontAwesomeIcon icon={faPlus} className="me-1" />
                        Add Purchase
                    </Button>
                </Card.Header>
                <Card.Body className="p-0">
                    <div className="table-responsive">
                        <Table className="mb-0" hover>
                            <thead className="bg-light">
                                <tr>
                                    <th>Purchase #</th>
                                    <th>Date</th>
                                    <th>Supplier</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Payment</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPurchases.length > 0 ? (
                                    filteredPurchases.map((purchase) => (
                                        <tr key={purchase.id}>
                                            <td>
                                                <div className="fw-semibold">
                                                    {purchase.purchaseNumber}
                                                </div>
                                                <small className="text-muted">
                                                    {purchase.purchaseType?.toUpperCase()} Purchase
                                                </small>
                                            </td>
                                            <td>
                                                <div>
                                                    {new Date(purchase.purchaseDate).toLocaleDateString()}
                                                </div>
                                                <small className="text-muted">
                                                    Created: {new Date(purchase.createdAt).toLocaleDateString()}
                                                </small>
                                            </td>
                                            <td>
                                                <div className="fw-semibold">
                                                    {purchase.supplierName}
                                                </div>
                                                {purchase.supplierPhone && (
                                                    <small className="text-muted">
                                                        {purchase.supplierPhone}
                                                    </small>
                                                )}
                                            </td>
                                            <td>
                                                <div className="fw-semibold">
                                                    ₹{purchase.total?.toLocaleString() || '0'}
                                                </div>
                                                {purchase.purchaseType === 'gst' && purchase.gstAmount > 0 && (
                                                    <small className="text-muted">
                                                        GST: ₹{purchase.gstAmount.toFixed(2)}
                                                    </small>
                                                )}
                                            </td>
                                            <td>
                                                {getStatusBadge(purchase.status)}
                                            </td>
                                            <td>
                                                {getPaymentStatusBadge(purchase)}
                                            </td>
                                            <td>
                                                <div className="d-flex gap-1">
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => onEditPurchase(purchase)}
                                                        title="Edit Purchase"
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </Button>
                                                    <Button
                                                        variant="outline-success"
                                                        size="sm"
                                                        onClick={() => onManagePayment(purchase)}
                                                        title="Manage Payment"
                                                    >
                                                        <FontAwesomeIcon icon={faMoneyBillWave} />
                                                    </Button>
                                                    <Dropdown>
                                                        <Dropdown.Toggle
                                                            variant="outline-secondary"
                                                            size="sm"
                                                            id={`dropdown-${purchase.id}`}
                                                        >
                                                            <FontAwesomeIcon icon={faEllipsisV} />
                                                        </Dropdown.Toggle>
                                                        <Dropdown.Menu>
                                                            <Dropdown.Item onClick={() => onPrintPurchase(purchase)}>
                                                                <FontAwesomeIcon icon={faEye} className="me-2" />
                                                                View/Print
                                                            </Dropdown.Item>
                                                            <Dropdown.Item onClick={() => onPrintPurchase(purchase)}>
                                                                <FontAwesomeIcon icon={faDownload} className="me-2" />
                                                                Download PDF
                                                            </Dropdown.Item>
                                                            <Dropdown.Divider />
                                                            <Dropdown.Item
                                                                onClick={() => onDeletePurchase(purchase.id)}
                                                                className="text-danger"
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
                                        <td colSpan="7" className="text-center py-4">
                                            <div className="text-muted">
                                                <FontAwesomeIcon icon={faSearch} size="2x" className="mb-3 d-block" />
                                                No purchases found matching your criteria.
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>
        </>
    );
}

export default PurchasesTable;