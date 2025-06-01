import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faUserPlus, faBuilding, faPhone, faEnvelope, faMapMarkerAlt, faIdCard, faGlobe, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import './QuickSupplierModal.css';

function QuickSupplierModal({
    show,
    onHide,
    quickSupplierData,
    onQuickSupplierChange,
    onAddQuickSupplier
}) {
    const nameInputRef = useRef(null);
    const [additionalPhones, setAdditionalPhones] = useState([]);

    useEffect(() => {
        if (show) {
            // Add body class immediately
            document.body.classList.add('quick-supplier-modal-open');

            // Function to apply backdrop class
            const applyBackdropClass = () => {
                // Target all modal backdrops
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => {
                    backdrop.classList.add('quick-supplier-modal-backdrop');
                });

                // Also target by attribute selectors
                const backdropsByShow = document.querySelectorAll('.modal-backdrop.show');
                backdropsByShow.forEach(backdrop => {
                    backdrop.classList.add('quick-supplier-modal-backdrop');
                });
            };

            // Apply immediately and with delays to catch dynamically created backdrops
            applyBackdropClass();

            const timers = [10, 50, 100, 200, 300, 500];
            const timeoutIds = timers.map(delay =>
                setTimeout(applyBackdropClass, delay)
            );

            // Observer to catch backdrop creation
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && node.classList?.contains('modal-backdrop')) {
                            node.classList.add('quick-supplier-modal-backdrop');
                        }
                    });
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Cleanup function
            return () => {
                timeoutIds.forEach(id => clearTimeout(id));
                observer.disconnect();
            };

        } else {
            // Cleanup when modal closes
            document.body.classList.remove('quick-supplier-modal-open');

            // Remove backdrop classes
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => {
                backdrop.classList.remove('quick-supplier-modal-backdrop');
            });
        }
    }, [show]);

    // Auto-focus name field when modal opens
    useEffect(() => {
        if (show && nameInputRef.current) {
            setTimeout(() => {
                nameInputRef.current.focus();
            }, 200);
        }
    }, [show]);

    // Reset additional phones when modal closes
    useEffect(() => {
        if (!show) {
            setAdditionalPhones([]);
        }
    }, [show]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!quickSupplierData.name?.trim()) {
            alert('Please enter party name');
            return;
        }

        // Pass the event object directly to onAddQuickSupplier
        // The parent component expects the original event object
        onAddQuickSupplier(e);
    };

    const addPhoneNumber = () => {
        setAdditionalPhones(prev => [...prev, { label: '', number: '' }]);
    };

    const removePhoneNumber = (index) => {
        setAdditionalPhones(prev => prev.filter((_, i) => i !== index));
    };

    const updatePhoneNumber = (index, field, value) => {
        setAdditionalPhones(prev => prev.map((phone, i) =>
            i === index ? { ...phone, [field]: value } : phone
        ));
    };

    return (
        <Modal
            show={show}
            onHide={onHide}
            size="lg"
            centered
            backdrop="static"
            keyboard={false}
            className="quick-supplier-modal"
        >
            <Modal.Header closeButton className="border-0 pb-0 bg-light">
                <Modal.Title className="fw-bold text-primary">
                    <FontAwesomeIcon icon={faUserPlus} className="me-2" />
                    Add New Party
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="px-4 pb-4">
                <Form onSubmit={handleSubmit}>
                    {/* Party Type Section */}
                    <Form.Group className="mb-4">
                        <Form.Label className="fw-semibold mb-3">Party Type</Form.Label>
                        <div className="d-flex gap-4">
                            <Form.Check
                                type="radio"
                                name="partyType"
                                id="quick-customer"
                                label="Customer"
                                value="customer"
                                checked={quickSupplierData.partyType === 'customer'}
                                onChange={onQuickSupplierChange}
                                className="party-type-radio"
                            />
                            <Form.Check
                                type="radio"
                                name="partyType"
                                id="quick-supplier"
                                label="Supplier"
                                value="supplier"
                                checked={quickSupplierData.partyType === 'supplier'}
                                onChange={onQuickSupplierChange}
                                className="party-type-radio"
                            />
                        </div>
                    </Form.Group>

                    {/* Name and WhatsApp Number Row */}
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">
                                    Name <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Control
                                    ref={nameInputRef}
                                    type="text"
                                    name="name"
                                    value={quickSupplierData.name}
                                    onChange={onQuickSupplierChange}
                                    placeholder="Enter party name"
                                    className="form-input"
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">
                                    WhatsApp Number <small className="text-muted">(Primary Contact)</small>
                                </Form.Label>
                                <Form.Control
                                    type="tel"
                                    name="whatsappNumber"
                                    value={quickSupplierData.whatsappNumber || ''}
                                    onChange={onQuickSupplierChange}
                                    placeholder="Enter WhatsApp number"
                                    className="form-input"
                                />
                                <div className="mt-2 d-flex justify-content-end">
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        type="button"
                                        onClick={addPhoneNumber}
                                        className="d-flex align-items-center"
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="me-1" />
                                        Add Phone
                                    </Button>
                                </div>
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Additional Phone Numbers Section */}
                    {additionalPhones.length > 0 && (
                        <div className="mb-4">
                            <Form.Label className="fw-semibold mb-3">
                                Additional Phone Numbers <small className="text-muted">(Optional)</small>
                            </Form.Label>

                            {additionalPhones.map((phone, index) => (
                                <Row key={index} className="mb-3 align-items-end">
                                    <Col md={5}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold small">Label</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={phone.label}
                                                onChange={(e) => updatePhoneNumber(index, 'label', e.target.value)}
                                                placeholder="e.g., Office, Home, Mobile"
                                                className="form-input"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={5}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold small">Phone Number</Form.Label>
                                            <Form.Control
                                                type="tel"
                                                value={phone.number}
                                                onChange={(e) => updatePhoneNumber(index, 'number', e.target.value)}
                                                placeholder="Enter phone number"
                                                className="form-input"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={2}>
                                        <Button
                                            variant="outline-danger"
                                            size="sm"
                                            type="button"
                                            onClick={() => removePhoneNumber(index)}
                                            className="w-100"
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </Button>
                                    </Col>
                                </Row>
                            ))}
                        </div>
                    )}

                    {/* Email and GST Number Row */}
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">Email</Form.Label>
                                <Form.Control
                                    type="email"
                                    name="email"
                                    value={quickSupplierData.email}
                                    onChange={onQuickSupplierChange}
                                    placeholder="Enter email address"
                                    className="form-input"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">GST Number</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="gstNumber"
                                    value={quickSupplierData.gstNumber}
                                    onChange={onQuickSupplierChange}
                                    placeholder="Enter GST number (optional)"
                                    className="form-input"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* City and Pin Code Row */}
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">City</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="city"
                                    value={quickSupplierData.city || ''}
                                    onChange={onQuickSupplierChange}
                                    placeholder="Enter city"
                                    className="form-input"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">
                                    Pin Code <small className="text-muted">(Optional)</small>
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    name="pincode"
                                    value={quickSupplierData.pincode || ''}
                                    onChange={onQuickSupplierChange}
                                    placeholder="Enter 6-digit pin code"
                                    className="form-input"
                                    maxLength="6"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Address Row */}
                    <Row>
                        <Col md={12}>
                            <Form.Group className="mb-4">
                                <Form.Label className="fw-semibold">Address</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    name="address"
                                    value={quickSupplierData.address}
                                    onChange={onQuickSupplierChange}
                                    placeholder="Enter complete address"
                                    className="form-input"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Action Buttons */}
                    <div className="d-flex gap-3 justify-content-end pt-3 border-top">
                        <Button
                            variant="outline-secondary"
                            onClick={onHide}
                            className="px-4 py-2"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            className="px-4 py-2 d-flex align-items-center"
                        >
                            <FontAwesomeIcon icon={faPlus} className="me-2" />
                            Save Party
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
}

export default QuickSupplierModal;