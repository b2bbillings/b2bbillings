import React from 'react';
import { Form, Row, Col, Card } from 'react-bootstrap';
// import './AddressDetailsStep.css';

function AddressDetailsStep({ formData, handleInputChange, errors, stateOptions }) {
    return (
        <div className="step-content-modern">
            <Card>
                <Card.Body>
                    <h6 className="text-primary mb-4">Address Information</h6>
                    <Form.Group className="mb-4">
                        <Form.Label>Full Address <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            isInvalid={!!errors.address}
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.address}
                        </Form.Control.Feedback>
                    </Form.Group>
                    <Row>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>City <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    name="city"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                    isInvalid={!!errors.city}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {errors.city}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>State <span className="text-danger">*</span></Form.Label>
                                <Form.Select
                                    name="state"
                                    value={formData.state}
                                    onChange={handleInputChange}
                                    isInvalid={!!errors.state}
                                >
                                    <option value="">Select State</option>
                                    {stateOptions.map(state => (
                                        <option key={state} value={state}>{state}</option>
                                    ))}
                                </Form.Select>
                                <Form.Control.Feedback type="invalid">
                                    {errors.state}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Taluka/District</Form.Label>
                                <Form.Control
                                    name="taluka"
                                    value={formData.taluka}
                                    onChange={handleInputChange}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row className="mt-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>PIN Code</Form.Label>
                                <Form.Control
                                    name="pincode"
                                    value={formData.pincode}
                                    onChange={handleInputChange}
                                    maxLength={6}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
        </div>
    );
}

export default AddressDetailsStep;