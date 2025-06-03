import React from 'react';
import { Form, Card, Row, Col, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
// import './AccountSetupStep.css';

function AccountSetupStep({ formData, handleInputChange, errors, editMode, roleOptions }) {
    return (
        <div className="step-content-modern">
            <Row>
                <Col lg={6}>
                    <Card className="h-100">
                        <Card.Body>
                            <h6 className="text-primary mb-4">Login Credentials</h6>
                            <Form.Group className="mb-3">
                                <Form.Label>
                                    Password {!editMode && <span className="text-danger">*</span>}
                                </Form.Label>
                                <Form.Control
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder={editMode ? "Leave blank to keep current" : "Enter password"}
                                    isInvalid={!!errors.password}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {errors.password}
                                </Form.Control.Feedback>
                            </Form.Group>
                            <Form.Group className="mb-4">
                                <Form.Label>
                                    Confirm Password {!editMode && <span className="text-danger">*</span>}
                                </Form.Label>
                                <Form.Control
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    placeholder="Confirm password"
                                    isInvalid={!!errors.confirmPassword}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {errors.confirmPassword}
                                </Form.Control.Feedback>
                            </Form.Group>
                            {!editMode && (
                                <Alert variant="success">
                                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                                    Employee ID will be auto-generated.
                                </Alert>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={6}>
                    <Card className="h-100">
                        <Card.Body>
                            <h6 className="text-primary mb-4">Summary & Review</h6>
                            <div className="summary-item"><strong>Name:</strong> {formData.name || 'Not provided'}</div>
                            <div className="summary-item"><strong>Role:</strong> {roleOptions.find(r => r.value === formData.role)?.label}</div>
                            <div className="summary-item"><strong>Mobile:</strong> {formData.mobileNumbers.filter(n => n.trim()).join(', ') || 'Not provided'}</div>
                            <div className="summary-item"><strong>Email:</strong> {formData.email || 'Not provided'}</div>
                            <div className="summary-item"><strong>City:</strong> {formData.city || 'Not provided'}</div>
                            <div className="summary-item"><strong>Joining Date:</strong> {formData.joinDate || 'Not provided'}</div>
                            <div className="summary-item"><strong>Documents:</strong> {formData.documents.length} uploaded</div>
                            <div className="summary-item"><strong>Permissions:</strong> {formData.permissions.length} selected</div>
                            <Alert variant="info" className="mt-4">
                                <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                                Please review all information before submitting.
                            </Alert>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

export default AccountSetupStep;