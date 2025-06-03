import React from 'react';
import { Form, Row, Col, InputGroup, Card } from 'react-bootstrap';
// import './EmploymentInfoStep.css';

function EmploymentInfoStep({ formData, handleInputChange, errors, departments }) {
    return (
        <div className="step-content-modern">
            <Card>
                <Card.Body>
                    <h6 className="text-primary mb-4">Employment Details</h6>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-4">
                                <Form.Label>Joining Date <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="date"
                                    name="joinDate"
                                    value={formData.joinDate}
                                    onChange={handleInputChange}
                                    isInvalid={!!errors.joinDate}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {errors.joinDate}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-4">
                                <Form.Label>Monthly Salary</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text>₹</InputGroup.Text>
                                    <Form.Control
                                        type="number"
                                        name="salary"
                                        value={formData.salary}
                                        onChange={handleInputChange}
                                        isInvalid={!!errors.salary}
                                    />
                                </InputGroup>
                                <Form.Control.Feedback type="invalid">
                                    {errors.salary}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>
                    </Row>
                    {/* Department and Reporting To fields have been removed */}
                </Card.Body>
            </Card>
        </div>
    );
}

export default EmploymentInfoStep;