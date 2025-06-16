import React from 'react';
import { Form, Row, Col } from 'react-bootstrap';

function SalesOrderDetails({ formData, onInputChange }) {
    return (
        <div className="sales-order-details">
            <Row>
                <Col md={12} className="mb-3">
                    <Form.Group>
                        <Form.Label className="small">Expected Delivery Date</Form.Label>
                        <Form.Control
                            type="date"
                            value={formData.deliveryDate}
                            onChange={(e) => onInputChange('deliveryDate', e.target.value)}
                            size="sm"
                        />
                    </Form.Group>
                </Col>
                <Col md={12} className="mb-3">
                    <Form.Group>
                        <Form.Label className="small">Valid Until</Form.Label>
                        <Form.Control
                            type="date"
                            value={formData.validUntil}
                            onChange={(e) => onInputChange('validUntil', e.target.value)}
                            size="sm"
                        />
                    </Form.Group>
                </Col>
                <Col md={12} className="mb-3">
                    <Form.Group>
                        <Form.Label className="small">Order Status</Form.Label>
                        <Form.Select
                            value={formData.orderStatus}
                            onChange={(e) => onInputChange('orderStatus', e.target.value)}
                            size="sm"
                        >
                            <option value="draft">Draft</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={12} className="mb-3">
                    <Form.Group>
                        <Form.Label className="small">Priority</Form.Label>
                        <Form.Select
                            value={formData.priority}
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
                <Col md={12} className="mb-3">
                    <Form.Group>
                        <Form.Label className="small">Notes</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={formData.notes}
                            onChange={(e) => onInputChange('notes', e.target.value)}
                            placeholder="Order notes or special instructions..."
                            size="sm"
                        />
                    </Form.Group>
                </Col>
                <Col md={12}>
                    <Form.Group>
                        <Form.Label className="small">Terms & Conditions</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={formData.termsAndConditions}
                            onChange={(e) => onInputChange('termsAndConditions', e.target.value)}
                            placeholder="Terms and conditions..."
                            size="sm"
                        />
                    </Form.Group>
                </Col>
            </Row>
        </div>
    );
}

export default SalesOrderDetails;