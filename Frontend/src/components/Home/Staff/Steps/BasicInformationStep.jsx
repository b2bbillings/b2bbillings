import React, { useRef } from 'react';
import { Form, Row, Col, InputGroup, Button, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faPhone, faMinus, faPlus, faCamera, faTrash, faUserTie } from '@fortawesome/free-solid-svg-icons';
import './BasicInformationStep.css'; // We'll create this CSS file next

function BasicInformationStep({ formData, handleInputChange, errors, mobileNumbers, handleMobileNumberChange, addMobileNumber, removeMobileNumber, roleOptions, postOptions, avatar, handleAvatarChange, handleRemoveAvatar }) {
    const avatarInputRef = useRef(null);

    return (
        <div className="step-content-modern">
            <Row>
                <Col lg={8}>
                    <Card className="h-100 shadow-sm modern-card">
                        <Card.Body>
                            <h5 className="card-title-modern mb-4">
                                <FontAwesomeIcon icon={faUser} className="me-2" />
                                Personal Information
                            </h5>

                            <Form.Group className="mb-4 modern-form-group">
                                <Form.Label className="fw-semibold">
                                    Full Name <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Control
                                    size="lg"
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter employee's full name"
                                    isInvalid={!!errors.name}
                                    className="modern-input"
                                />
                                <Form.Control.Feedback type="invalid">
                                    {errors.name}
                                </Form.Control.Feedback>
                            </Form.Group>

                            <Row className="mb-4">
                                <Col md={6}>
                                    <Form.Group className="modern-form-group">
                                        <Form.Label className="fw-semibold">
                                            Role <span className="text-danger">*</span>
                                        </Form.Label>
                                        <Form.Select
                                            size="lg"
                                            name="role"
                                            value={formData.role}
                                            onChange={handleInputChange}
                                            className="modern-input"
                                        >
                                            {roleOptions.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="modern-form-group">
                                        <Form.Label className="fw-semibold">Post/Designation</Form.Label>
                                        <Form.Select
                                            size="lg"
                                            name="post"
                                            value={formData.post}
                                            onChange={handleInputChange}
                                            className="modern-input"
                                        >
                                            <option value="">Select Post</option>
                                            {postOptions.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Form.Group className="mb-4 modern-form-group">
                                <Form.Label className="fw-semibold">
                                    Mobile Numbers <span className="text-danger">*</span>
                                </Form.Label>
                                {mobileNumbers.map((number, index) => (
                                    <InputGroup key={index} className="mb-2 modern-input-group">
                                        <InputGroup.Text>
                                            <FontAwesomeIcon icon={faPhone} />
                                        </InputGroup.Text>
                                        <Form.Control
                                            type="tel"
                                            value={number}
                                            onChange={(e) => handleMobileNumberChange(index, e.target.value)}
                                            placeholder="10-digit mobile number"
                                            isInvalid={!!errors.mobileNumbers && index === 0} // Show error only for the first for simplicity or adjust as needed
                                            className="modern-input"
                                        />
                                        {mobileNumbers.length > 1 && (
                                            <Button
                                                variant="outline-danger"
                                                onClick={() => removeMobileNumber(index)}
                                                className="modern-btn-icon"
                                            >
                                                <FontAwesomeIcon icon={faMinus} />
                                            </Button>
                                        )}
                                        {index === mobileNumbers.length - 1 && (
                                            <Button
                                                variant="outline-primary"
                                                onClick={addMobileNumber}
                                                className="modern-btn-icon"
                                            >
                                                <FontAwesomeIcon icon={faPlus} />
                                            </Button>
                                        )}
                                    </InputGroup>
                                ))}
                                {errors.mobileNumbers && (
                                    <div className="text-danger small mt-1">{errors.mobileNumbers}</div>
                                )}
                            </Form.Group>

                            <Form.Group className="mb-0 modern-form-group"> {/* mb-0 if last element */}
                                <Form.Label className="fw-semibold">Email Address</Form.Label>
                                <Form.Control
                                    size="lg"
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="employee@company.com"
                                    isInvalid={!!errors.email}
                                    className="modern-input"
                                />
                                <Form.Control.Feedback type="invalid">
                                    {errors.email}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={4}>
                    <Card className="text-center h-100 shadow-sm modern-card">
                        <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                            <h5 className="card-title-modern mb-4">Profile Picture</h5>

                            <div className="avatar-upload-modern mb-3">
                                <div className="avatar-preview-modern">
                                    {avatar ? (
                                        <div className="avatar-image-container-modern">
                                            <img
                                                src={avatar}
                                                alt="Employee Avatar"
                                                className="avatar-image-modern"
                                            />
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                className="avatar-remove-btn-modern"
                                                onClick={handleRemoveAvatar}
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="avatar-placeholder-modern">
                                            <FontAwesomeIcon icon={faUserTie} size="3x" className="text-muted" />
                                            <p className="text-muted mt-2 mb-0 small">No Photo</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <input
                                type="file"
                                accept="image/*"
                                className="d-none"
                                ref={avatarInputRef}
                                onChange={handleAvatarChange}
                            />
                            <Button
                                variant="outline-primary"
                                onClick={() => avatarInputRef.current.click()}
                                className="w-100 modern-btn"
                            >
                                <FontAwesomeIcon icon={faCamera} className="me-2" />
                                {avatar ? 'Change Photo' : 'Upload Photo'}
                            </Button>
                            {errors.avatar && (
                                <div className="text-danger small mt-2">{errors.avatar}</div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

export default BasicInformationStep;