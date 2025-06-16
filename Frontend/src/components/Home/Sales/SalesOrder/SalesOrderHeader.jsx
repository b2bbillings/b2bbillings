import React from 'react';
import { Row, Col, Form, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileContract, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';

function SalesOrderHeader({
    orderNumber,
    orderDate,
    orderStatus,
    onInputChange,
    isEditing = false
}) {
    const getStatusVariant = (status) => {
        switch (status) {
            case 'draft': return 'secondary';
            case 'confirmed': return 'primary';
            case 'delivered': return 'success';
            case 'cancelled': return 'danger';
            default: return 'secondary';
        }
    };

    return (
        <div className="sales-order-header mb-4 p-4 bg-light rounded">
            <Row className="align-items-center">
                <Col md={6}>
                    <div className="d-flex align-items-center">
                        <FontAwesomeIcon icon={faFileContract} size="2x" className="text-primary me-3" />
                        <div>
                            <h4 className="mb-1">
                                {isEditing ? 'Edit Sales Order' : 'Create Sales Order'}
                            </h4>
                            <div className="d-flex align-items-center gap-3">
                                <span className="text-muted">
                                    Order #: <strong>{orderNumber || 'Auto-generated'}</strong>
                                </span>
                                {orderStatus && (
                                    <Badge bg={getStatusVariant(orderStatus)}>
                                        {orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1)}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </Col>
                <Col md={6}>
                    <Row>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="small text-muted">Order Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={orderDate}
                                    onChange={(e) => onInputChange('orderDate', e.target.value)}
                                    size="sm"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="small text-muted">Priority</Form.Label>
                                <Form.Select
                                    value={orderStatus}
                                    onChange={(e) => onInputChange('priority', e.target.value)}
                                    size="sm"
                                >
                                    <option value="low">Low</option>
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </div>
    );
}

export default SalesOrderHeader;