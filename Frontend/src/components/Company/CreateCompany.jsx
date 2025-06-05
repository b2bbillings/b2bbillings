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
    faFileSignature,
    faSpinner
} from '@fortawesome/free-solid-svg-icons';
import useKeyboardNavigation from '../../hooks/useKeyboardNavigation';
import './CreateCompany.css';
import companyService from '../../services/companyService';

function CreateCompany({ show, onHide, onCompanyCreated }) {
    // Business Categories
    const businessCategories = [
        'Accounting & CA',
        'Interior Designer',
        'Automobiles / Auto Parts',
        'Salon / Spa',
        'Liquor Store',
        'Book / Stationary Store',
        'Construction Materials & Equipment',
        'Repairing Plumbing & Electrician',
        'Chemical & Fertilizer',
        'Computer Equipment & Software',
        'Electrical & Electronics Equipment',
        'Fashion Accessory / Cosmetics',
        'Tailoring / Boutique',
        'Fruit and Vegetable',
        'Kirana / General Merchant',
        'FMCG Products',
        'Dairy Farm Products / Poultry',
        'Furniture',
        'Garment / Fashion & Hosiery',
        'Jewellery & Gems',
        'Pharmacy / Medical',
        'Hardware Store',
        'Mobile & Accessories',
        'Nursery / Plants',
        'Petroleum Bulk Stations & Terminals / Petrol',
        'Restaurant / Hotel',
        'Footwear',
        'Paper & Paper Products',
        'Sweet Shop / Bakery',
        'Gift & Toys',
        'Laundry / Washing / Dry Clean',
        'Coaching & Training',
        'Renting & Leasing',
        'Fitness Center',
        'Oil & Gas',
        'Real Estate',
        'NGO & Charitable Trust',
        'Tours & Travels',
        'Other'
    ];

    // Business Types
    const businessTypes = [
        'Retail',
        'Wholesale',
        'Distributor',
        'Service',
        'Manufacturing',
        'Others'
    ];

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
    const [apiError, setApiError] = useState('');

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

    // Validation function
    const validateForm = useCallback(() => {
        const newErrors = {};

        // Required fields validation
        if (!formData.businessName.trim()) {
            newErrors.businessName = 'Business name is required';
        } else if (formData.businessName.trim().length < 2) {
            newErrors.businessName = 'Business name must be at least 2 characters';
        }

        if (!formData.phoneNumber.trim()) {
            newErrors.phoneNumber = 'Phone number is required';
        } else if (!/^[0-9]{10}$/.test(formData.phoneNumber.replace(/\D/g, ''))) {
            newErrors.phoneNumber = 'Please enter a valid 10-digit phone number';
        }

        // Optional field validations
        if (formData.email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (formData.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstin.toUpperCase())) {
            newErrors.gstin = 'Please enter a valid GSTIN';
        }

        if (formData.pincode && !/^[0-9]{6}$/.test(formData.pincode)) {
            newErrors.pincode = 'Please enter a valid 6-digit PIN code';
        }

        // Validate additional phone numbers
        additionalPhones.forEach((phone, index) => {
            if (phone.trim() && !/^[0-9]{10}$/.test(phone.replace(/\D/g, ''))) {
                newErrors[`additionalPhone${index}`] = 'Please enter a valid 10-digit phone number';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData, additionalPhones]);

    // Handle form submission
    const handleSubmit = useCallback(async (e) => {
        if (e) e.preventDefault();

        if (isSubmitting) return;

        // Clear previous API errors
        setApiError('');

        // Validate form
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
            // Prepare company data for API
            const companyData = {
                businessName: formData.businessName.trim(),
                phoneNumber: formData.phoneNumber.replace(/\D/g, ''),
                gstin: formData.gstin.trim().toUpperCase() || undefined,
                email: formData.email.trim() || undefined,
                businessType: formData.businessType || undefined,
                businessCategory: formData.businessCategory || undefined,
                state: formData.state.trim() || undefined,
                pincode: formData.pincode.trim() || undefined,
                city: formData.city.trim() || undefined,
                tehsil: formData.tehsil.trim() || undefined,
                address: formData.address.trim() || undefined,
                logo: companyLogo,
                signatureImage: signatureImage,
                additionalPhones: additionalPhones.filter(phone => phone.trim()).map(phone => phone.replace(/\D/g, ''))
            };

            // Call API to create company
            const response = await companyService.createCompany(companyData);

            // Success handling
            console.log('✅ Company created successfully:', response);

            // Prepare data for parent component
            const companyDataForParent = {
                ...response.data.company,
                id: response.data.company._id || response.data.company.id,
                name: response.data.company.businessName,
                logo: response.data.company.logo?.url || response.data.company.logo?.base64,
                signatureImage: response.data.company.signatureImage?.url || response.data.company.signatureImage?.base64
            };

            // Call the callback function
            if (onCompanyCreated) {
                onCompanyCreated(companyDataForParent);
            }

            // Show success message
            alert(`Company "${response.data.company.businessName}" created successfully!`);

            // Reset form and close modal
            resetForm();
            onHide();

        } catch (error) {
            console.error('❌ Error creating company:', error);

            // Handle specific error types
            if (error.message.includes('phone number already exists')) {
                setErrors({ phoneNumber: 'A company with this phone number already exists' });
            } else if (error.message.includes('email already exists')) {
                setErrors({ email: 'A company with this email already exists' });
            } else if (error.message.includes('GSTIN already exists')) {
                setErrors({ gstin: 'A company with this GSTIN already exists' });
            } else if (error.message.includes('Validation failed')) {
                // Handle validation errors from backend
                try {
                    const errorData = JSON.parse(error.message);
                    if (errorData.errors) {
                        const backendErrors = {};
                        errorData.errors.forEach(err => {
                            backendErrors[err.param] = err.msg;
                        });
                        setErrors(backendErrors);
                    }
                } catch {
                    setApiError(error.message);
                }
            } else if (error.message.includes('Network Error') || error.message.includes('fetch')) {
                setApiError('Unable to connect to server. Please check your internet connection and try again.');
            } else {
                setApiError(error.message || 'An unexpected error occurred. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, additionalPhones, companyLogo, signatureImage, isSubmitting, errors, onCompanyCreated, onHide, validateForm]);

    // Reset form function
    const resetForm = useCallback(() => {
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
        setApiError('');
        setIsSubmitting(false);
    }, []);

    // Add additional phone number
    const addPhoneNumber = useCallback(() => {
        setAdditionalPhones(prev => [...prev, '']);
    }, []);

    // Handle cancel - close modal without saving
    const handleCancel = useCallback(() => {
        if (isSubmitting) return;
        resetForm();
        onHide();
    }, [isSubmitting, onHide, resetForm]);

    // Keyboard shortcuts
    const keyboardShortcuts = useRef({
        'Ctrl+S': (e) => handleSubmit(e),
        'Escape': handleCancel,
        'Ctrl+L': () => logoInputRef.current?.click(),
        'Ctrl+P': addPhoneNumber,
        'Ctrl+G': () => signatureInputRef.current?.click()
    });

    // Update shortcuts when dependencies change
    useEffect(() => {
        keyboardShortcuts.current = {
            'Ctrl+S': (e) => handleSubmit(e),
            'Escape': handleCancel,
            'Ctrl+L': () => logoInputRef.current?.click(),
            'Ctrl+P': addPhoneNumber,
            'Ctrl+G': () => signatureInputRef.current?.click()
        };
    }, [handleSubmit, handleCancel, addPhoneNumber]);

    // Initialize keyboard navigation
    const { focusNext, focusPrev } = useKeyboardNavigation({
        enabled: show,
        refs: formRefs.current,
        loop: true,
        shortcuts: keyboardShortcuts.current,
        onEscape: handleCancel,
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
            resetForm();
        }
    }, [show, resetForm]);

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

        // Clear API error when user makes changes
        if (apiError) {
            setApiError('');
        }
    }, [apiError]);

    // Handle logo upload with enhanced error handling
    const handleLogoUpload = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            // Clear previous errors
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.logo;
                return newErrors;
            });

            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, logo: 'Logo file size should be less than 2MB' }));
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                setErrors(prev => ({ ...prev, logo: 'Please select an image file for logo' }));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                setCompanyLogo(e.target.result);
            };
            reader.onerror = () => {
                setErrors(prev => ({ ...prev, logo: 'Error reading logo file' }));
            };
            reader.readAsDataURL(file);
        }
    }, []);

    // Handle signature upload with enhanced error handling
    const handleSignatureUpload = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            // Clear previous errors
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.signature;
                return newErrors;
            });

            // Validate file size (max 1MB)
            if (file.size > 1 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, signature: 'Signature file size should be less than 1MB' }));
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                setErrors(prev => ({ ...prev, signature: 'Please select an image file for signature' }));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                setSignatureImage(e.target.result);
            };
            reader.onerror = () => {
                setErrors(prev => ({ ...prev, signature: 'Error reading signature file' }));
            };
            reader.readAsDataURL(file);
        }
    }, []);

    // Remove additional phone number
    const removePhoneNumber = useCallback((index) => {
        setAdditionalPhones(prev => prev.filter((_, i) => i !== index));
        // Clear related errors
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[`additionalPhone${index}`];
            return newErrors;
        });
    }, []);

    // Handle additional phone number change
    const handleAdditionalPhoneChange = useCallback((index, value) => {
        setAdditionalPhones(prev =>
            prev.map((phone, i) => i === index ? value : phone)
        );
        // Clear error for this field
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[`additionalPhone${index}`];
            return newErrors;
        });
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
            onHide={handleCancel}
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

            <Modal.Body className="px-4 py-3" style={{ position: 'relative' }}>
                {/* Loading overlay */}
                {isSubmitting && (
                    <div
                        className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75"
                        style={{ zIndex: 1050 }}
                    >
                        <div className="text-center">
                            <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-primary mb-2" />
                            <div className="fw-bold">Creating company...</div>
                            <small className="text-muted">Please wait while we save your company details</small>
                        </div>
                    </div>
                )}

                {/* API Error Alert */}
                {apiError && (
                    <Alert variant="danger" className="mb-3" onClose={() => setApiError('')} dismissible>
                        <Alert.Heading>Error</Alert.Heading>
                        <p className="mb-0">{apiError}</p>
                    </Alert>
                )}

                {/* Keyboard shortcuts info */}
                <Alert variant="info" className="py-2 mb-3 small">
                    <strong>Shortcuts:</strong> Ctrl+S (Save), Esc (Close), Ctrl+L (Logo), Ctrl+G (Signature), Ctrl+P (Add Phone), Alt+↑↓ (Navigate)
                </Alert>

                <Form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
                    {/* Company Logo Upload Section */}
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
                                                disabled={isSubmitting}
                                            >
                                                <FontAwesomeIcon icon={faUpload} className="me-2" />
                                                {companyLogo ? 'Change Logo' : 'Upload Logo'}
                                            </Button>
                                            <Form.Text className="text-muted d-block">
                                                Max 2MB, Image files only
                                            </Form.Text>
                                            {errors.logo && (
                                                <div className="text-danger small mt-1">{errors.logo}</div>
                                            )}
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
                                                    disabled={isSubmitting}
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
                                        disabled={isSubmitting}
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
                                            disabled={isSubmitting}
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
                                        <Form.Select
                                            ref={businessTypeRef}
                                            name="businessType"
                                            value={formData.businessType}
                                            onChange={handleInputChange}
                                            size="sm"
                                            disabled={isSubmitting}
                                        >
                                            <option value="">Select business type</option>
                                            {businessTypes.map((type, index) => (
                                                <option key={index} value={type}>
                                                    {type}
                                                </option>
                                            ))}
                                        </Form.Select>
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
                                                disabled={isSubmitting}
                                            />
                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                onClick={addPhoneNumber}
                                                title="Ctrl+P"
                                                disabled={isSubmitting}
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
                                                    disabled={isSubmitting}
                                                />
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => removePhoneNumber(index)}
                                                    disabled={isSubmitting}
                                                >
                                                    <FontAwesomeIcon icon={faTimes} />
                                                </Button>
                                                {errors[`additionalPhone${index}`] && (
                                                    <div className="text-danger small">{errors[`additionalPhone${index}`]}</div>
                                                )}
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
                                        <Form.Select
                                            ref={businessCategoryRef}
                                            name="businessCategory"
                                            value={formData.businessCategory}
                                            onChange={handleInputChange}
                                            size="sm"
                                            disabled={isSubmitting}
                                        >
                                            <option value="">Select business category</option>
                                            {businessCategories.map((category, index) => (
                                                <option key={index} value={category}>
                                                    {category}
                                                </option>
                                            ))}
                                        </Form.Select>
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
                                            disabled={isSubmitting}
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
                                            disabled={isSubmitting}
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
                                            disabled={isSubmitting}
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
                                            disabled={isSubmitting}
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
                                            disabled={isSubmitting}
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
                                            disabled={isSubmitting}
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
                                            disabled={isSubmitting}
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
                                                <Button
                                                    variant="outline-success"
                                                    size="sm"
                                                    onClick={() => signatureInputRef.current?.click()}
                                                    title="Ctrl+G"
                                                    disabled={isSubmitting}
                                                >
                                                    <FontAwesomeIcon icon={faUpload} className="me-2" />
                                                    {signatureImage ? 'Change Signature' : 'Upload Signature'}
                                                </Button>
                                                <Form.Text className="text-muted ms-2">
                                                    Max 1MB, Image files only
                                                </Form.Text>
                                                {errors.signature && (
                                                    <div className="text-danger small mt-1">{errors.signature}</div>
                                                )}
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
                                                        disabled={isSubmitting}
                                                    >
                                                        <FontAwesomeIcon icon={faTimes} />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            ref={signatureInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleSignatureUpload}
                                            style={{ display: 'none' }}
                                            disabled={isSubmitting}
                                        />
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
                    <FontAwesomeIcon icon={isSubmitting ? faSpinner : faSave} className={`me-2 ${isSubmitting ? 'fa-spin' : ''}`} />
                    {isSubmitting ? 'Saving...' : 'Save & Exit'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

export default CreateCompany;