import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Row, Col, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes,
    faPlus,
    faMinus,
    faEdit,
    faUser,
    faRocket,
    faKeyboard
} from '@fortawesome/free-solid-svg-icons';
import useKeyboardNavigation from '../../../hooks/useKeyboardNavigation';
import KeyboardShortcutsHelp from '../../../hooks/KeyboardShortcutsHelp';

function AddNewParty({
    show,
    onHide,
    editingParty,
    onSaveParty,
    isQuickAdd = false,
    quickAddType = 'customer'
}) {
    const [showAdditionalPhones, setShowAdditionalPhones] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);

    // Form refs for keyboard navigation
    const nameRef = useRef(null);
    const emailRef = useRef(null);
    const phoneRef = useRef(null);
    const companyRef = useRef(null);
    const gstRef = useRef(null);
    const addressRef = useRef(null);
    const pincodeRef = useRef(null);
    const stateRef = useRef(null);
    const districtRef = useRef(null);
    const talukaRef = useRef(null);
    const balanceRef = useRef(null);
    const saveButtonRef = useRef(null);
    const cancelButtonRef = useRef(null);

    // Navigation refs array
    const navigationRefs = [
        nameRef, emailRef, phoneRef, companyRef, gstRef,
        addressRef, pincodeRef, stateRef, districtRef, talukaRef,
        balanceRef, saveButtonRef, cancelButtonRef
    ];

    // Quick add refs
    const quickNameRef = useRef(null);
    const quickPhoneRef = useRef(null);
    const quickSaveRef = useRef(null);
    const quickCancelRef = useRef(null);

    const quickNavigationRefs = [quickNameRef, quickPhoneRef, quickSaveRef, quickCancelRef];

    // Form data for regular add/edit party
    const [formData, setFormData] = useState({
        partyType: 'customer',
        name: '',
        email: '',
        phoneNumber: '',
        companyName: '',
        gstNumber: '',
        country: 'INDIA',
        addressLine: '',
        pincode: '',
        state: '',
        district: '',
        taluka: '',
        openingBalanceType: 'debit',
        openingBalance: 0,
        phoneNumbers: [{ number: '', label: '' }]
    });

    // Quick add form data
    const [quickFormData, setQuickFormData] = useState({
        name: '',
        phone: ''
    });

    // Keyboard shortcuts configuration
    const shortcuts = {
        'Ctrl+S': 'Save party',
        'Ctrl+Q': isQuickAdd ? 'Save quick customer' : 'Toggle quick add mode',
        'Ctrl+P': 'Add additional phone number',
        'F1': 'Show keyboard shortcuts'
    };

    // Keyboard navigation setup
    const { focusFirst } = useKeyboardNavigation({
        enabled: show,
        refs: isQuickAdd ? quickNavigationRefs : navigationRefs,
        loop: true,
        shortcuts: {
            'ctrl+s': (e) => {
                e.preventDefault();
                handleSubmit(e);
            },
            'ctrl+p': () => {
                if (!isQuickAdd && !showAdditionalPhones) {
                    setShowAdditionalPhones(true);
                }
            },
            'f1': () => setShowShortcuts(true)
        },
        onEscape: onHide,
        onEnter: (e) => {
            if (e.target === nameRef.current || e.target === quickNameRef.current) {
                e.preventDefault();
                if (isQuickAdd) {
                    quickPhoneRef.current?.focus();
                } else {
                    emailRef.current?.focus();
                }
            }
        }
    });

    // Reset form when modal opens/closes
    useEffect(() => {
        if (show) {
            if (!editingParty) {
                if (isQuickAdd) {
                    setQuickFormData({ name: '', phone: '' });
                } else {
                    setFormData({
                        partyType: quickAddType || 'customer',
                        name: '',
                        email: '',
                        phoneNumber: '',
                        companyName: '',
                        gstNumber: '',
                        country: 'INDIA',
                        addressLine: '',
                        pincode: '',
                        state: '',
                        district: '',
                        taluka: '',
                        openingBalanceType: 'debit',
                        openingBalance: 0,
                        phoneNumbers: [{ number: '', label: '' }]
                    });
                    setShowAdditionalPhones(false);
                }
            } else {
                // Populate form for editing
                const editData = {
                    partyType: editingParty.partyType || 'customer',
                    name: editingParty.name || '',
                    email: editingParty.email || '',
                    phoneNumber: editingParty.phoneNumber || editingParty.phone || '',
                    companyName: editingParty.companyName || '',
                    gstNumber: editingParty.gstNumber || '',
                    country: editingParty.country || 'INDIA',
                    addressLine: editingParty.addressLine || editingParty.address || '',
                    pincode: editingParty.pincode || '',
                    state: editingParty.state || '',
                    district: editingParty.district || '',
                    taluka: editingParty.taluka || '',
                    openingBalanceType: editingParty.openingBalanceType || 'debit',
                    openingBalance: editingParty.openingBalance || 0,
                    phoneNumbers: editingParty.phoneNumbers || [{ number: editingParty.phone || '', label: 'Primary' }]
                };
                setFormData(editData);
                setShowAdditionalPhones(editData.phoneNumbers?.length > 1);
            }

            // Focus first input after modal is fully open
            setTimeout(() => {
                if (isQuickAdd) {
                    quickNameRef.current?.focus();
                } else {
                    nameRef.current?.focus();
                }
            }, 100);
        }
    }, [show, editingParty, isQuickAdd, quickAddType]);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle quick form input changes
    const handleQuickInputChange = (e) => {
        const { name, value } = e.target;
        setQuickFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle phone number changes
    const handlePhoneNumberChange = (index, field, value) => {
        const newPhoneNumbers = [...formData.phoneNumbers];
        newPhoneNumbers[index][field] = value;
        setFormData(prev => ({ ...prev, phoneNumbers: newPhoneNumbers }));
    };

    // Add new phone number field
    const addPhoneNumber = () => {
        setFormData(prev => ({
            ...prev,
            phoneNumbers: [...prev.phoneNumbers, { number: '', label: '' }]
        }));
    };

    // Remove phone number field
    const removePhoneNumber = (index) => {
        const newPhoneNumbers = formData.phoneNumbers.filter((_, i) => i !== index);
        if (newPhoneNumbers.length === 0) {
            setShowAdditionalPhones(false);
            setFormData(prev => ({ ...prev, phoneNumbers: [{ number: '', label: '' }] }));
        } else {
            setFormData(prev => ({ ...prev, phoneNumbers: newPhoneNumbers }));
        }
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();

        if (isQuickAdd) {
            if (!quickFormData.name.trim() || !quickFormData.phone.trim()) {
                alert('Please enter both name and phone number');
                return;
            }

            const newRunningCustomer = {
                id: Date.now(),
                name: quickFormData.name.trim(),
                phone: quickFormData.phone.trim(),
                phoneNumber: quickFormData.phone.trim(),
                partyType: 'customer',
                isRunningCustomer: true,
                email: '',
                address: '',
                pincode: '',
                state: '',
                district: '',
                taluka: '',
                gstNumber: '',
                companyName: '',
                openingBalance: 0,
                openingBalanceType: 'debit',
                country: 'INDIA',
                phoneNumbers: [{ number: quickFormData.phone.trim(), label: 'Primary' }],
                createdAt: new Date().toISOString()
            };

            onSaveParty(newRunningCustomer, true);
        } else {
            if (!formData.name.trim()) {
                alert('Please enter a name');
                return;
            }

            const partyData = {
                ...formData,
                phone: formData.phoneNumber,
                address: formData.addressLine,
                isRunningCustomer: false
            };

            if (editingParty) {
                const updatedParty = {
                    ...partyData,
                    id: editingParty.id,
                    createdAt: editingParty.createdAt,
                    updatedAt: new Date().toISOString()
                };
                onSaveParty(updatedParty, false, true);
            } else {
                const newParty = {
                    ...partyData,
                    id: Date.now(),
                    createdAt: new Date().toISOString()
                };
                onSaveParty(newParty, false, false);
            }
        }
    };

    if (isQuickAdd) {
        return (
            <>
                <Modal show={show} onHide={onHide} centered>
                    <Modal.Header className="d-flex justify-content-between align-items-center border-0 bg-light">
                        <Modal.Title className="fw-bold text-dark mb-0">
                            <FontAwesomeIcon icon={faRocket} className="me-2 text-warning" />
                            Quick Add Customer
                        </Modal.Title>
                        <div className="d-flex align-items-center gap-2">
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => setShowShortcuts(true)}
                                title="Keyboard Shortcuts (F1)"
                                className="border-0"
                            >
                                <FontAwesomeIcon icon={faKeyboard} />
                            </Button>
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={onHide}
                                className="border-0 p-1"
                                aria-label="Close"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </Button>
                        </div>
                    </Modal.Header>

                    <Modal.Body className="p-4">
                        <Form onSubmit={handleSubmit}>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="text-muted small">Customer Name *</Form.Label>
                                        <Form.Control
                                            ref={quickNameRef}
                                            type="text"
                                            name="name"
                                            value={quickFormData.name}
                                            onChange={handleQuickInputChange}
                                            placeholder="Enter customer name"
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="text-muted small">Phone Number *</Form.Label>
                                        <Form.Control
                                            ref={quickPhoneRef}
                                            type="tel"
                                            name="phone"
                                            value={quickFormData.phone}
                                            onChange={handleQuickInputChange}
                                            placeholder="Enter phone number"
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <div className="d-flex gap-2 justify-content-end mt-4">
                                <Button
                                    ref={quickCancelRef}
                                    variant="outline-secondary"
                                    onClick={onHide}
                                    size="sm"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    ref={quickSaveRef}
                                    variant="warning"
                                    type="submit"
                                    size="sm"
                                >
                                    <FontAwesomeIcon icon={faRocket} className="me-1" />
                                    Add Customer
                                </Button>
                            </div>
                        </Form>
                    </Modal.Body>
                </Modal>

                <KeyboardShortcutsHelp
                    show={showShortcuts}
                    onHide={() => setShowShortcuts(false)}
                    shortcuts={shortcuts}
                />
            </>
        );
    }

    return (
        <>
            <Modal show={show} onHide={onHide} centered size="lg">
                <Modal.Header className="d-flex justify-content-between align-items-center border-0 bg-light">
                    <Modal.Title className="fw-bold text-dark mb-0">
                        <FontAwesomeIcon icon={editingParty ? faEdit : faUser} className="me-2 text-primary" />
                        {editingParty ? 'Edit Party' : 'Add New Party'}
                    </Modal.Title>
                    <div className="d-flex align-items-center gap-2">
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => setShowShortcuts(true)}
                            title="Keyboard Shortcuts (F1)"
                            className="border-0"
                        >
                            <FontAwesomeIcon icon={faKeyboard} />
                        </Button>
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={onHide}
                            className="border-0 p-1"
                            aria-label="Close"
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </Button>
                    </div>
                </Modal.Header>

                <Modal.Body className="p-4">
                    <Form onSubmit={handleSubmit}>
                        {/* Party Type */}
                        <div className="mb-4">
                            <Form.Label className="text-muted small mb-2">Party Type</Form.Label>
                            <div className="d-flex gap-4">
                                <Form.Check
                                    type="radio"
                                    name="partyType"
                                    id="customer"
                                    label="Customer"
                                    value="customer"
                                    checked={formData.partyType === 'customer'}
                                    onChange={handleInputChange}
                                />
                                <Form.Check
                                    type="radio"
                                    name="partyType"
                                    id="supplier"
                                    label="Supplier"
                                    value="supplier"
                                    checked={formData.partyType === 'supplier'}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        {/* Basic Information */}
                        <div className="mb-4 p-3 bg-light rounded">
                            <h6 className="text-muted mb-3 small">Basic Information</h6>
                            <Row>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="text-muted small">
                                            {formData.partyType === 'customer' ? 'Customer Name' : 'Supplier Name'} *
                                        </Form.Label>
                                        <Form.Control
                                            ref={nameRef}
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            placeholder={`Enter ${formData.partyType} name`}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="text-muted small">Email Address</Form.Label>
                                        <Form.Control
                                            ref={emailRef}
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder="Email address"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="text-muted small">Phone Number</Form.Label>
                                        <InputGroup>
                                            <InputGroup.Text className="small">+91</InputGroup.Text>
                                            <Form.Control
                                                ref={phoneRef}
                                                type="tel"
                                                name="phoneNumber"
                                                value={formData.phoneNumber}
                                                onChange={handleInputChange}
                                                placeholder="Phone number"
                                                maxLength="10"
                                            />
                                        </InputGroup>
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* Additional Phone Numbers */}
                            {showAdditionalPhones && (
                                <div className="mt-3">
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <small className="text-muted">Additional Phone Numbers</small>
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={addPhoneNumber}
                                            type="button"
                                        >
                                            <FontAwesomeIcon icon={faPlus} className="me-1" />
                                            Add
                                        </Button>
                                    </div>
                                    {formData.phoneNumbers.map((phone, index) => (
                                        <Row key={index} className="mb-2 align-items-end">
                                            <Col md={4}>
                                                <Form.Control
                                                    type="text"
                                                    value={phone.label}
                                                    onChange={(e) => handlePhoneNumberChange(index, 'label', e.target.value)}
                                                    placeholder="Label (e.g., Office)"
                                                    size="sm"
                                                />
                                            </Col>
                                            <Col md={6}>
                                                <Form.Control
                                                    type="tel"
                                                    value={phone.number}
                                                    onChange={(e) => handlePhoneNumberChange(index, 'number', e.target.value)}
                                                    placeholder="Phone number"
                                                    size="sm"
                                                />
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

                            {/* Toggle Additional Phones */}
                            {!showAdditionalPhones && (
                                <div className="text-center mt-3">
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => setShowAdditionalPhones(true)}
                                        type="button"
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="me-1" />
                                        Add Additional Phone Numbers
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Company Details */}
                        <div className="mb-4 p-3 bg-light rounded">
                            <h6 className="text-muted mb-3 small">Company Details</h6>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="text-muted small">Company Name</Form.Label>
                                        <Form.Control
                                            ref={companyRef}
                                            type="text"
                                            name="companyName"
                                            value={formData.companyName}
                                            onChange={handleInputChange}
                                            placeholder="Company name"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="text-muted small">GST Number</Form.Label>
                                        <Form.Control
                                            ref={gstRef}
                                            type="text"
                                            name="gstNumber"
                                            value={formData.gstNumber}
                                            onChange={handleInputChange}
                                            placeholder="GST number"
                                            style={{ textTransform: 'uppercase' }}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </div>

                        {/* Address Information */}
                        <div className="mb-4 p-3 bg-light rounded">
                            <h6 className="text-muted mb-3 small">Address Information</h6>
                            <Row>
                                <Col md={12}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="text-muted small">Address</Form.Label>
                                        <Form.Control
                                            ref={addressRef}
                                            as="textarea"
                                            rows={2}
                                            name="addressLine"
                                            value={formData.addressLine}
                                            onChange={handleInputChange}
                                            placeholder="Enter full address"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={3}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="text-muted small">PIN Code</Form.Label>
                                        <Form.Control
                                            ref={pincodeRef}
                                            type="text"
                                            name="pincode"
                                            value={formData.pincode}
                                            onChange={handleInputChange}
                                            placeholder="PIN Code"
                                            maxLength="6"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="text-muted small">State</Form.Label>
                                        <Form.Control
                                            ref={stateRef}
                                            type="text"
                                            name="state"
                                            value={formData.state}
                                            onChange={handleInputChange}
                                            placeholder="State"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="text-muted small">District</Form.Label>
                                        <Form.Control
                                            ref={districtRef}
                                            type="text"
                                            name="district"
                                            value={formData.district}
                                            onChange={handleInputChange}
                                            placeholder="District"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="text-muted small">Taluka</Form.Label>
                                        <Form.Control
                                            ref={talukaRef}
                                            type="text"
                                            name="taluka"
                                            value={formData.taluka}
                                            onChange={handleInputChange}
                                            placeholder="Taluka"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </div>

                        {/* Opening Balance */}
                        <div className="mb-4 p-3 bg-light rounded">
                            <h6 className="text-muted mb-3 small">Opening Balance</h6>
                            <Row>
                                <Col md={6}>
                                    <div className="d-flex gap-3 mb-2">
                                        <Form.Check
                                            type="radio"
                                            name="openingBalanceType"
                                            id="credit"
                                            label="Credit"
                                            value="credit"
                                            checked={formData.openingBalanceType === 'credit'}
                                            onChange={handleInputChange}
                                        />
                                        <Form.Check
                                            type="radio"
                                            name="openingBalanceType"
                                            id="debit"
                                            label="Debit"
                                            value="debit"
                                            checked={formData.openingBalanceType === 'debit'}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <InputGroup>
                                        <InputGroup.Text className="small">₹</InputGroup.Text>
                                        <Form.Control
                                            ref={balanceRef}
                                            type="number"
                                            name="openingBalance"
                                            value={formData.openingBalance}
                                            onChange={handleInputChange}
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                        />
                                    </InputGroup>
                                </Col>
                            </Row>
                        </div>

                        {/* Action Buttons */}
                        <div className="d-flex gap-2 justify-content-end">
                            <Button
                                ref={cancelButtonRef}
                                variant="outline-secondary"
                                onClick={onHide}
                                size="sm"
                            >
                                Cancel
                            </Button>
                            <Button
                                ref={saveButtonRef}
                                variant="primary"
                                type="submit"
                                size="sm"
                            >
                                <FontAwesomeIcon icon={editingParty ? faEdit : faPlus} className="me-1" />
                                {editingParty ? 'Update' : 'Save'} Party
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            <KeyboardShortcutsHelp
                show={showShortcuts}
                onHide={() => setShowShortcuts(false)}
                shortcuts={shortcuts}
            />
        </>
    );
}

export default AddNewParty;