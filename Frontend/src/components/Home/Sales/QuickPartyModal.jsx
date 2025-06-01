import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faUserPlus, faPlus, faMinus } from '@fortawesome/free-solid-svg-icons';
import './QuickPartyModal.css';

function QuickPartyModal({
    show,
    onHide,
    quickPartyData,
    onQuickPartyChange,
    onAddQuickParty
}) {
    const [showAdditionalPhones, setShowAdditionalPhones] = useState(false);
    const [phoneNumbers, setPhoneNumbers] = useState([{ number: '', label: '' }]);

    // Auto-focus name field when modal opens
    useEffect(() => {
        if (show) {
            console.log('🎬 QuickPartyModal opened with data:', quickPartyData);
        }
    }, [show, quickPartyData]);

    // Handle phone number changes
    const handlePhoneNumberChange = (index, field, value) => {
        const newPhoneNumbers = [...phoneNumbers];
        newPhoneNumbers[index][field] = value;
        setPhoneNumbers(newPhoneNumbers);
    };

    // Add new phone number field
    const addPhoneNumber = () => {
        setPhoneNumbers([...phoneNumbers, { number: '', label: '' }]);
    };

    // Remove phone number field
    const removePhoneNumber = (index) => {
        const newPhoneNumbers = phoneNumbers.filter((_, i) => i !== index);
        if (newPhoneNumbers.length === 0) {
            setShowAdditionalPhones(false);
            setPhoneNumbers([{ number: '', label: '' }]);
        } else {
            setPhoneNumbers(newPhoneNumbers);
        }
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('📝 Submitting quick party form');

        // Include phone numbers in the submission
        const partyWithPhones = {
            ...quickPartyData,
            phoneNumbers: phoneNumbers.filter(phone => phone.number.trim() !== ''),
            whatsappNumber: quickPartyData.phone || '',
            phone: quickPartyData.phone || (phoneNumbers.find(p => p.number)?.number || '')
        };

        onAddQuickParty(e, partyWithPhones);
    };

    // Get dynamic placeholders based on party type
    const getPlaceholders = () => {
        const partyType = quickPartyData.partyType;

        switch (partyType) {
            case 'customer':
                return {
                    name: "Enter customer name",
                    phone: "Customer's WhatsApp number",
                    email: "Customer's email address",
                    gst: "Customer's GST number (optional)",
                    city: "Customer's city",
                    address: "Customer's complete address"
                };
            case 'supplier':
                return {
                    name: "Enter supplier/vendor name",
                    phone: "Supplier's WhatsApp number",
                    email: "Supplier's email address",
                    gst: "Supplier's GST number (optional)",
                    city: "Supplier's city",
                    address: "Supplier's complete address"
                };
            case 'running_customer':
                return {
                    name: "Enter running customer name",
                    phone: "Running customer's contact number",
                    email: "",
                    gst: "",
                    city: "",
                    address: ""
                };
            default:
                return {
                    name: "Enter party name",
                    phone: "Enter WhatsApp number",
                    email: "Enter email address",
                    gst: "Enter GST number (optional)",
                    city: "Enter city",
                    address: "Enter complete address"
                };
        }
    };

    const placeholders = getPlaceholders();
    const isRunningCustomer = quickPartyData.partyType === 'running_customer';

    return (
        <Modal
            show={show}
            onHide={onHide}
            centered
            size="lg"
            className="quick-party-modal-wrapper"
        >
            <Modal.Header closeButton>
                <Modal.Title className="fw-bold">
                    <FontAwesomeIcon icon={faUserPlus} className="me-2 text-primary" />
                    Add New Party
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <Form onSubmit={handleSubmit}>
                    {/* Party Type */}
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Party Type</Form.Label>
                        <div className="d-flex gap-4">
                            <Form.Check
                                type="radio"
                                name="partyType"
                                id="quick-customer"
                                label="Customer"
                                value="customer"
                                checked={quickPartyData.partyType === 'customer'}
                                onChange={onQuickPartyChange}
                            />
                            <Form.Check
                                type="radio"
                                name="partyType"
                                id="quick-supplier"
                                label="Supplier"
                                value="supplier"
                                checked={quickPartyData.partyType === 'supplier'}
                                onChange={onQuickPartyChange}
                            />
                            <Form.Check
                                type="radio"
                                name="partyType"
                                id="quick-running-customer"
                                label="Running Customer"
                                value="running_customer"
                                checked={quickPartyData.partyType === 'running_customer'}
                                onChange={onQuickPartyChange}
                            />
                        </div>
                        {isRunningCustomer && (
                            <small className="text-muted mt-1 d-block">
                                Quick entry for walk-in customers - only name and contact required
                            </small>
                        )}
                    </Form.Group>

                    {/* Basic Information */}
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">
                                    Name <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    name="name"
                                    value={quickPartyData.name}
                                    onChange={onQuickPartyChange}
                                    placeholder={placeholders.name}
                                    required
                                    autoFocus
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">
                                    {isRunningCustomer ? 'Contact Number' : 'WhatsApp Number'}
                                    <small className="text-muted ms-1">
                                        {isRunningCustomer ? '(Required)' : '(Primary Contact)'}
                                    </small>
                                </Form.Label>
                                <Form.Control
                                    type="tel"
                                    name="phone"
                                    value={quickPartyData.phone}
                                    onChange={onQuickPartyChange}
                                    placeholder={placeholders.phone}
                                    required={isRunningCustomer}
                                />

                                {/* Add Phone Number Button - Hide for Running Customer */}
                                {!showAdditionalPhones && !isRunningCustomer && (
                                    <div className="mt-2">
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => setShowAdditionalPhones(true)}
                                            type="button"
                                        >
                                            <FontAwesomeIcon icon={faPlus} className="me-1" />
                                            Add Phone Numbers
                                        </Button>
                                    </div>
                                )}
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Multiple Phone Numbers Section - Hide for Running Customer */}
                    {showAdditionalPhones && !isRunningCustomer && (
                        <div className="mb-4 phone-numbers-section">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <Form.Label className="fw-semibold mb-0">
                                    Additional Phone Numbers
                                    <small className="text-muted ms-1">(Optional)</small>
                                </Form.Label>
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={addPhoneNumber}
                                    type="button"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="me-1" />
                                    Add Phone
                                </Button>
                            </div>

                            {phoneNumbers.map((phone, index) => (
                                <Row key={index} className="mb-2 align-items-end">
                                    <Col md={4}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold small">Label</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={phone.label}
                                                onChange={(e) => handlePhoneNumberChange(index, 'label', e.target.value)}
                                                placeholder="e.g., Office, Home, Mobile"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold small">Phone Number</Form.Label>
                                            <Form.Control
                                                type="tel"
                                                value={phone.number}
                                                onChange={(e) => handlePhoneNumberChange(index, 'number', e.target.value)}
                                                placeholder="Enter phone number"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={2}>
                                        <Button
                                            variant="outline-danger"
                                            size="sm"
                                            onClick={() => removePhoneNumber(index)}
                                            className="w-100"
                                            type="button"
                                        >
                                            <FontAwesomeIcon icon={faMinus} />
                                        </Button>
                                    </Col>
                                </Row>
                            ))}
                        </div>
                    )}

                    {/* Additional Fields - Hide for Running Customer */}
                    {!isRunningCustomer && (
                        <>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">Email</Form.Label>
                                        <Form.Control
                                            type="email"
                                            name="email"
                                            value={quickPartyData.email}
                                            onChange={onQuickPartyChange}
                                            placeholder={placeholders.email}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">GST Number</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="gstNumber"
                                            value={quickPartyData.gstNumber || ''}
                                            onChange={onQuickPartyChange}
                                            placeholder={placeholders.gst}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">City</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="city"
                                            value={quickPartyData.city || ''}
                                            onChange={onQuickPartyChange}
                                            placeholder={placeholders.city}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">
                                            Pin Code
                                            <small className="text-muted ms-1">(Optional)</small>
                                        </Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="pincode"
                                            value={quickPartyData.pincode || ''}
                                            onChange={onQuickPartyChange}
                                            placeholder="Enter 6-digit pin code"
                                            maxLength="6"
                                            pattern="[0-9]{6}"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Row>
                                <Col md={12}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">Address</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={3}
                                            name="address"
                                            value={quickPartyData.address}
                                            onChange={onQuickPartyChange}
                                            placeholder={placeholders.address}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </>
                    )}

                    {/* Action Buttons */}
                    <div className="d-flex gap-3 justify-content-end">
                        <Button
                            variant="outline-secondary"
                            onClick={onHide}
                            className="px-4"
                            type="button"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            className="px-4"
                        >
                            <FontAwesomeIcon icon={faUserPlus} className="me-2" />
                            Add {quickPartyData.partyType === 'running_customer' ? 'Running Customer' :
                                quickPartyData.partyType === 'supplier' ? 'Supplier' : 'Customer'}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
}

export default QuickPartyModal;