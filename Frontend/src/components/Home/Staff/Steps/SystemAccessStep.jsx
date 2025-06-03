import React from 'react';
import { Card, Form, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
// import './SystemAccessStep.css';

function SystemAccessStep({ permissions, permissionOptions, handleInputChange }) {
    return (
        <div className="step-content-modern">
            <Card>
                <Card.Body>
                    <h6 className="text-primary mb-4">System Permissions & Access Rights</h6>
                    <div className="permissions-modern-grid">
                        {permissionOptions.map(permission => (
                            <Card
                                key={permission.value}
                                className={`permission-card ${permissions.includes(permission.value) ? 'selected' : ''}`}
                            >
                                <Card.Body className="p-3">
                                    <Form.Check
                                        type="checkbox"
                                        id={`permission-${permission.value}`}
                                        name="permissions"
                                        value={permission.value}
                                        checked={permissions.includes(permission.value)}
                                        onChange={handleInputChange}
                                        className="permission-checkbox"
                                    />
                                    <div className="permission-content">
                                        <h6 className="permission-title">{permission.label}</h6>
                                        <p className="permission-description text-muted mb-0">{permission.description}</p>
                                    </div>
                                </Card.Body>
                            </Card>
                        ))}
                    </div>
                    {permissions.length > 0 && (
                        <Alert variant="info" className="mt-4">
                            <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                            <strong>{permissions.length}</strong> permissions selected
                        </Alert>
                    )}
                </Card.Body>
            </Card>
        </div>
    );
}

export default SystemAccessStep;