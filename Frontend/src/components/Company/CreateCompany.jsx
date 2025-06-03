import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBuilding,
    faSave,
    faTimes,
    faImage,
    faPlus,
    faUpload,
    faFileSignature
} from '@fortawesome/free-solid-svg-icons';
import useKeyboardNavigation from '../../hooks/useKeyboardNavigation';
import './CreateCompany.css';

function CreateCompany({ show, onHide, onCompanyCreated }) {
    // Form state
    const [formData, setFormData] = useState({
        businessName: '',
        phoneNumber: '',
        gstin: '',
        email: '',
        businessType: '',
        businessCategory: '',
        state: '',
        pincode: '',
        city: '',
        tehsil: '',
        address: ''
    });

    const [companyLogo, setCompanyLogo] = useState(null);
    const [signatureImage, setSignatureImage] = useState(null);
    const [additionalPhones, setAdditionalPhones] = useState([]);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Refs for keyboard navigation
    const businessNameRef = useRef(null);
    const phoneNumberRef = useRef(null);
    const gstinRef = useRef(null);
    const emailRef = useRef(null);
    const businessTypeRef = useRef(null);
    const businessCategoryRef = useRef(null);
    const stateRef = useRef(null);
    const pincodeRef = useRef(null);
    const cityRef = useRef(null);
    const tehsilRef = useRef(null);
    const addressRef = useRef(null);
    const logoInputRef = useRef(null);
    const signatureInputRef = useRef(null);

    // Array of refs for keyboard navigation - memoized to prevent recreation
    const formRefs = useRef([
        businessNameRef,
        phoneNumberRef,
        gstinRef,
        emailRef,
        businessTypeRef,
        businessCategoryRef,
        stateRef,
        pincodeRef,
        cityRef,
        tehsilRef,
        addressRef
    ]);

    // Handle form submission
    const handleSubmit = useCallback((e) => {
        if (e) e.preventDefault();

        if (isSubmitting) return;

        // Validate form function
        const validateForm = () => {
            const newErrors = {};

            // Required fields
            if (!formData.businessName.trim()) {
                newErrors.businessName = 'Business name is required';
            }

            if (!formData.phoneNumber.trim()) {
                newErrors.phoneNumber = 'Phone number is required';
            } else if (!/^\d{10}$/.test(formData.phoneNumber.replace(/\D/g, ''))) {
                newErrors.phoneNumber = 'Please enter a valid 10-digit phone number';
            }

            // Optional field validations
            if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
                newErrors.email = 'Please enter a valid email address';
            }

            if (formData.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstin)) {
                newErrors.gstin = 'Please enter a valid GSTIN';
            }

            if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
                newErrors.pincode = 'Please enter a valid 6-digit PIN code';
            }

            // Validate additional phone numbers
            additionalPhones.forEach((phone, index) => {
                if (phone && !/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
                    newErrors[`additionalPhone${index}`] = 'Please enter a valid 10-digit phone number';
                }
            });

            setErrors(newErrors);
            return Object.keys(newErrors).length === 0;
        };

        if (!validateForm()) {
            // Focus first error field
            const firstErrorField = Object.keys(errors)[0];
            const errorRef = formRefs.current.find(ref => ref.current?.name === firstErrorField);
            if (errorRef?.current) {
                errorRef.current.focus();
            }
            return;
        }

        setIsSubmitting(true);

        try {
            const companyData = {
                ...formData,
                logo: companyLogo,
                signatureImage: signatureImage,
                additionalPhones: additionalPhones.filter(phone => phone.trim()),
                createdAt: new Date().toISOString(),
                id: Date.now() // Simple ID generation
            };

            // Call the callback function
            if (onCompanyCreated) {
                onCompanyCreated(companyData);
            }

            // Close modal
            onHide();
        } catch (error) {
            console.error('Error creating company:', error);
            alert('Error creating company. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, additionalPhones, companyLogo, signatureImage, isSubmitting, errors, onCompanyCreated, onHide]);

    // Add additional phone number
    const addPhoneNumber = useCallback(() => {
        setAdditionalPhones(prev => [...prev, '']);
    }, []);

    // Handle cancel - close modal without saving
    const handleCancel = useCallback(() => {
        if (isSubmitting) return;
        onHide();
    }, [isSubmitting, onHide]);

    // Keyboard shortcuts
    const keyboardShortcuts = useRef({
        'Ctrl+S': (e) => handleSubmit(e),
        'Escape': onHide,
        'Ctrl+L': () => logoInputRef.current?.click(),
        'Ctrl+P': addPhoneNumber,
        'Ctrl+G': () => signatureInputRef.current?.click()
    });

    // Update shortcuts when dependencies change
    useEffect(() => {
        keyboardShortcuts.current = {
            'Ctrl+S': (e) => handleSubmit(e),
            'Escape': onHide,
            'Ctrl+L': () => logoInputRef.current?.click(),
            'Ctrl+P': addPhoneNumber,
            'Ctrl+G': () => signatureInputRef.current?.click()
        };
    }, [handleSubmit, onHide, addPhoneNumber]);

    // Initialize keyboard navigation
    const { focusNext, focusPrev } = useKeyboardNavigation({
        enabled: show,
        refs: formRefs.current,
        loop: true,
        shortcuts: keyboardShortcuts.current,
        onEscape: onHide,
        onEnter: (e) => {
            if (e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                focusNext();
            }
        }
    });

    // Reset form when modal opens/closes
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                if (businessNameRef.current) {
                    businessNameRef.current.focus();
                }
            }, 100);

            return () => clearTimeout(timer);
        } else {
            setFormData({
                businessName: '',
                phoneNumber: '',
                gstin: '',
                email: '',
                businessType: '',
                businessCategory: '',
                state: '',
                pincode: '',
                city: '',
                tehsil: '',
                address: ''
            });
            setCompanyLogo(null);
            setSignatureImage(null);
            setAdditionalPhones([]);
            setErrors({});
            setIsSubmitting(false);
        }
    }, [show]);

    // Handle input changes
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Clear error when user starts typing
        setErrors(prev => {
            if (prev[name]) {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            }
            return prev;
        });
    }, []);

    // Handle logo upload
    const handleLogoUpload = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                alert('File size should be less than 2MB');
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                setCompanyLogo(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }, []);

    // Handle signature upload
    const handleSignatureUpload = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (max 1MB)
            if (file.size > 1 * 1024 * 1024) {
                alert('Signature file size should be less than 1MB');
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file for signature');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                setSignatureImage(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }, []);

    // Remove additional phone number
    const removePhoneNumber = useCallback((index) => {
        setAdditionalPhones(prev => prev.filter((_, i) => i !== index));
    }, []);

    // Handle additional phone number change
    const handleAdditionalPhoneChange = useCallback((index, value) => {
        setAdditionalPhones(prev =>
            prev.map((phone, i) => i === index ? value : phone)
        );
    }, []);

    // Handle key down for navigation
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'ArrowUp' && e.altKey) {
            e.preventDefault();
            focusPrev();
        } else if (e.key === 'ArrowDown' && e.altKey) {
            e.preventDefault();
            focusNext();
        }
    }, [focusNext, focusPrev]);

    return (
        <Modal
            show={show}
            onHide={onHide}
            size="xl"
            centered
            className="create-company-modal"
            backdrop="static"
            keyboard={false}
        >
            <Modal.Header className="border-bottom-0 pb-2">
                <Modal.Title className="fw-bold text-dark d-flex align-items-center">
                    <span className="bg-primary text-white rounded px-2 py-1 me-2 small">1.</span>
                    Create Company
                </Modal.Title>
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={handleCancel}
                    className="ms-auto me-2"
                    title="Close (Esc)"
                    disabled={isSubmitting}
                >
                    <FontAwesomeIcon icon={faTimes} />
                </Button>
            </Modal.Header>

            <Modal.Body className="px-4 py-3">
                {/* Keyboard shortcuts info */}
                <Alert variant="info" className="py-2 mb-3 small">
                    <strong>Shortcuts:</strong> Ctrl+S (Save), Esc (Close), Ctrl+L (Logo), Ctrl+G (Signature), Ctrl+P (Add Phone), Alt+↑↓ (Navigate)
                </Alert>

                <Form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
                    {/* Company Logo Upload Section - Smaller */}
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group as={Row} className="mb-3">
                                <Form.Label column sm={4} className="fw-medium d-flex align-items-center">
                                    <FontAwesomeIcon icon={faImage} className="me-2 text-primary" />
                                    Company Logo
                                </Form.Label>
                                <Col sm={8}>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="flex-grow-1">
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                onClick={() => logoInputRef.current?.click()}
                                                title="Ctrl+L"
                                                className="w-100"
                                            >
                                                <FontAwesomeIcon icon={faUpload} className="me-2" />
                                                {companyLogo ? 'Change Logo' : 'Upload Logo'}
                                            </Button>
                                            <Form.Text className="text-muted">
                                                Max 2MB, Image files only
                                            </Form.Text>
                                        </div>
                                        {companyLogo && (
                                            <div className="d-flex align-items-center gap-2">
                                                <img
                                                    src={companyLogo}
                                                    alt="Company Logo"
                                                    className="border rounded"
                                                    style={{ maxWidth: '60px', maxHeight: '40px', objectFit: 'contain' }}
                                                />
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => setCompanyLogo(null)}
                                                    title="Remove logo"
                                                >
                                                    <FontAwesomeIcon icon={faTimes} />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        ref={logoInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        style={{ display: 'none' }}
                                    />
                                </Col>
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Business Details Section */}
                    <div className="mb-4">
                        <h5 className="fw-bold mb-3 text-primary border-bottom pb-2">
                            <FontAwesomeIcon icon={faBuilding} className="me-2" />
                            Business Details
                        </h5>

                        <Row className="mb-3">
                            <Col md={6}>
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm={4} className="fw-medium">
                                        Business Name <span className="text-danger">*</span>
                                    </Form.Label>
                                    <Col sm={8}>
                                        <Form.Control
                                            ref={businessNameRef}
                                            type="text"
                                            name="businessName"
                                            value={formData.businessName}
                                            onChange={handleInputChange}
                                            placeholder="Enter business name"
                                            isInvalid={!!errors.businessName}
                                            size="sm"
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {errors.businessName}
                                        </Form.Control.Feedback>
                                    </Col>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm={4} className="fw-medium">
                                        Business Type
                                    </Form.Label>
                                    <Col sm={8}>
                                        <Form.Control
                                            ref={businessTypeRef}
                                            type="text"
                                            name="businessType"
                                            value={formData.businessType}
                                            onChange={handleInputChange}
                                            placeholder="Enter business type"
                                            size="sm"
                                        />
                                    </Col>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row className="mb-3">
                            <Col md={6}>
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm={4} className="fw-medium">
                                        Phone Number <span className="text-danger">*</span>
                                    </Form.Label>
                                    <Col sm={8}>
                                        <div className="d-flex gap-2">
                                            <Form.Control
                                                ref={phoneNumberRef}
                                                type="tel"
                                                name="phoneNumber"
                                                value={formData.phoneNumber}
                                                onChange={handleInputChange}
                                                placeholder="Enter phone number"
                                                isInvalid={!!errors.phoneNumber}
                                                size="sm"
                                            />
                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                onClick={addPhoneNumber}
                                                title="Ctrl+P"
                                            >
                                                <FontAwesomeIcon icon={faPlus} />
                                            </Button>
                                        </div>
                                        <Form.Control.Feedback type="invalid">
                                            {errors.phoneNumber}
                                        </Form.Control.Feedback>

                                        {/* Additional Phone Numbers */}
                                        {additionalPhones.map((phone, index) => (
                                            <div key={index} className="d-flex gap-2 mt-2">
                                                <Form.Control
                                                    type="tel"
                                                    value={phone}
                                                    onChange={(e) => handleAdditionalPhoneChange(index, e.target.value)}
                                                    placeholder="Additional phone"
                                                    isInvalid={!!errors[`additionalPhone${index}`]}
                                                    size="sm"
                                                />
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => removePhoneNumber(index)}
                                                >
                                                    <FontAwesomeIcon icon={faTimes} />
                                                </Button>
                                            </div>
                                        ))}
                                    </Col>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm={4} className="fw-medium">
                                        Business Category
                                    </Form.Label>
                                    <Col sm={8}>
                                        <Form.Control
                                            ref={businessCategoryRef}
                                            type="text"
                                            name="businessCategory"
                                            value={formData.businessCategory}
                                            onChange={handleInputChange}
                                            placeholder="Enter business category"
                                            size="sm"
                                        />
                                    </Col>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row className="mb-3">
                            <Col md={6}>
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm={4} className="fw-medium">
                                        GSTIN
                                    </Form.Label>
                                    <Col sm={8}>
                                        <Form.Control
                                            ref={gstinRef}
                                            type="text"
                                            name="gstin"
                                            value={formData.gstin}
                                            onChange={handleInputChange}
                                            placeholder="Enter GSTIN"
                                            isInvalid={!!errors.gstin}
                                            style={{ textTransform: 'uppercase' }}
                                            maxLength="15"
                                            size="sm"
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {errors.gstin}
                                        </Form.Control.Feedback>
                                    </Col>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm={4} className="fw-medium">
                                        E-Mail ID
                                    </Form.Label>
                                    <Col sm={8}>
                                        <Form.Control
                                            ref={emailRef}
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder="Enter email address"
                                            isInvalid={!!errors.email}
                                            size="sm"
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {errors.email}
                                        </Form.Control.Feedback>
                                    </Col>
                                </Form.Group>
                            </Col>
                        </Row>
                    </div>

                    {/* Other Details Section */}
                    <div className="mb-4">
                        <h5 className="fw-bold mb-3 text-secondary border-bottom pb-2">
                            Other Details
                        </h5>

                        <Row className="mb-3">
                            <Col md={6}>
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm={4} className="fw-medium">
                                        State
                                    </Form.Label>
                                    <Col sm={8}>
                                        <Form.Control
                                            ref={stateRef}
                                            type="text"
                                            name="state"
                                            value={formData.state}
                                            onChange={handleInputChange}
                                            placeholder="Enter state"
                                            size="sm"
                                        />
                                    </Col>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm={4} className="fw-medium">
                                        PIN Code
                                    </Form.Label>
                                    <Col sm={8}>
                                        <Form.Control
                                            ref={pincodeRef}
                                            type="text"
                                            name="pincode"
                                            value={formData.pincode}
                                            onChange={handleInputChange}
                                            placeholder="Enter PIN code"
                                            isInvalid={!!errors.pincode}
                                            maxLength="6"
                                            size="sm"
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {errors.pincode}
                                        </Form.Control.Feedback>
                                    </Col>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row className="mb-3">
                            <Col md={6}>
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm={4} className="fw-medium">
                                        City
                                    </Form.Label>
                                    <Col sm={8}>
                                        <Form.Control
                                            ref={cityRef}
                                            type="text"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleInputChange}
                                            placeholder="Enter city"
                                            size="sm"
                                        />
                                    </Col>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm={4} className="fw-medium">
                                        Tehsil / Taluka
                                    </Form.Label>
                                    <Col sm={8}>
                                        <Form.Control
                                            ref={tehsilRef}
                                            type="text"
                                            name="tehsil"
                                            value={formData.tehsil}
                                            onChange={handleInputChange}
                                            placeholder="Enter tehsil/taluka"
                                            size="sm"
                                        />
                                    </Col>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row className="mb-3">
                            <Col md={12}>
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm={2} className="fw-medium">
                                        Address
                                    </Form.Label>
                                    <Col sm={10}>
                                        <Form.Control
                                            ref={addressRef}
                                            as="textarea"
                                            rows={2}
                                            name="address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            placeholder="Enter full address"
                                            size="sm"
                                        />
                                    </Col>
                                </Form.Group>
                            </Col>
                        </Row>

                        {/* Signature Upload Section */}
                        <Row className="mb-3">
                            <Col md={12}>
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm={2} className="fw-medium d-flex align-items-center">
                                        <FontAwesomeIcon icon={faFileSignature} className="me-2 text-success" />
                                        Signature
                                    </Form.Label>
                                    <Col sm={10}>
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="flex-grow-1">
                                                <Form.Control
                                                    ref={signatureInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleSignatureUpload}
                                                    size="sm"
                                                    className="d-inline-block"
                                                    style={{ width: 'auto' }}
                                                />
                                                <Form.Text className="text-muted ms-2">
                                                    Max 1MB, Image files only
                                                </Form.Text>
                                            </div>
                                            {signatureImage && (
                                                <div className="d-flex align-items-center gap-2">
                                                    <img
                                                        src={signatureImage}
                                                        alt="Signature Preview"
                                                        className="border rounded"
                                                        style={{ maxWidth: '80px', maxHeight: '40px', objectFit: 'contain' }}
                                                    />
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => setSignatureImage(null)}
                                                        title="Remove signature"
                                                    >
                                                        <FontAwesomeIcon icon={faTimes} />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </Col>
                                </Form.Group>
                            </Col>
                        </Row>
                    </div>
                </Form>
            </Modal.Body>

            <Modal.Footer className="border-top-0 pt-2 justify-content-between">
                <Button
                    variant="secondary"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    size="lg"
                    className="px-4"
                    title="Cancel (Esc)"
                >
                    <FontAwesomeIcon icon={faTimes} className="me-2" />
                    Cancel
                </Button>
                <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    title="Press Ctrl+S"
                    size="lg"
                    className="px-4"
                >
                    <FontAwesomeIcon icon={faSave} className="me-2" />
                    {isSubmitting ? 'Saving...' : 'Save & Exit'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

export default CreateCompany;