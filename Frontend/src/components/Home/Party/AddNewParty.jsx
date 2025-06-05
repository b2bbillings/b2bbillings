import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Row, Col, InputGroup, Nav, Tab } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes,
    faPlus,
    faMinus,
    faEdit,
    faUser,
    faRocket,
    faKeyboard,
    faHome,
    faTruck,
    faCopy
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
    const [activeAddressTab, setActiveAddressTab] = useState('home');

    // Form refs for keyboard navigation
    const nameRef = useRef(null);
    const emailRef = useRef(null);
    const phoneRef = useRef(null);
    const companyRef = useRef(null);
    const gstRef = useRef(null);

    // Home address refs
    const homeAddressRef = useRef(null);
    const homePincodeRef = useRef(null);
    const homeStateRef = useRef(null);
    const homeDistrictRef = useRef(null);
    const homeTalukaRef = useRef(null);

    // Delivery address refs
    const deliveryAddressRef = useRef(null);
    const deliveryPincodeRef = useRef(null);
    const deliveryStateRef = useRef(null);
    const deliveryDistrictRef = useRef(null);
    const deliveryTalukaRef = useRef(null);

    const balanceRef = useRef(null);
    const saveButtonRef = useRef(null);
    const cancelButtonRef = useRef(null);

    // Navigation refs array
    const navigationRefs = [
        nameRef, emailRef, phoneRef, companyRef, gstRef,
        homeAddressRef, homePincodeRef, homeStateRef, homeDistrictRef, homeTalukaRef,
        deliveryAddressRef, deliveryPincodeRef, deliveryStateRef, deliveryDistrictRef, deliveryTalukaRef,
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

        // Home Address
        homeAddressLine: '',
        homePincode: '',
        homeState: '',
        homeDistrict: '',
        homeTaluka: '',

        // Delivery Address
        deliveryAddressLine: '',
        deliveryPincode: '',
        deliveryState: '',
        deliveryDistrict: '',
        deliveryTaluka: '',
        sameAsHomeAddress: false,

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
        'Ctrl+D': 'Copy home address to delivery address',
        'F1': 'Show keyboard shortcuts'
    };

    // Copy home address to delivery address
    const copyHomeToDelivery = () => {
        setFormData(prev => ({
            ...prev,
            deliveryAddressLine: prev.homeAddressLine,
            deliveryPincode: prev.homePincode,
            deliveryState: prev.homeState,
            deliveryDistrict: prev.homeDistrict,
            deliveryTaluka: prev.homeTaluka,
            sameAsHomeAddress: true
        }));
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
            'ctrl+d': () => {
                if (!isQuickAdd) {
                    copyHomeToDelivery();
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

                        // Home Address
                        homeAddressLine: '',
                        homePincode: '',
                        homeState: '',
                        homeDistrict: '',
                        homeTaluka: '',

                        // Delivery Address
                        deliveryAddressLine: '',
                        deliveryPincode: '',
                        deliveryState: '',
                        deliveryDistrict: '',
                        deliveryTaluka: '',
                        sameAsHomeAddress: false,

                        openingBalanceType: 'debit',
                        openingBalance: 0,
                        phoneNumbers: [{ number: '', label: '' }]
                    });
                    setShowAdditionalPhones(false);
                    setActiveAddressTab('home');
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

                    // Home Address (backward compatibility)
                    homeAddressLine: editingParty.homeAddressLine || editingParty.addressLine || editingParty.address || '',
                    homePincode: editingParty.homePincode || editingParty.pincode || '',
                    homeState: editingParty.homeState || editingParty.state || '',
                    homeDistrict: editingParty.homeDistrict || editingParty.district || '',
                    homeTaluka: editingParty.homeTaluka || editingParty.taluka || '',

                    // Delivery Address
                    deliveryAddressLine: editingParty.deliveryAddressLine || '',
                    deliveryPincode: editingParty.deliveryPincode || '',
                    deliveryState: editingParty.deliveryState || '',
                    deliveryDistrict: editingParty.deliveryDistrict || '',
                    deliveryTaluka: editingParty.deliveryTaluka || '',
                    sameAsHomeAddress: editingParty.sameAsHomeAddress || false,

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
        const { name, value, type, checked } = e.target;
        const fieldValue = type === 'checkbox' ? checked : value;

        setFormData(prev => {
            const newData = { ...prev, [name]: fieldValue };

            // If "Same as Home Address" is checked, copy home address to delivery
            if (name === 'sameAsHomeAddress' && checked) {
                newData.deliveryAddressLine = prev.homeAddressLine;
                newData.deliveryPincode = prev.homePincode;
                newData.deliveryState = prev.homeState;
                newData.deliveryDistrict = prev.homeDistrict;
                newData.deliveryTaluka = prev.homeTaluka;
            }

            // If any delivery field is manually changed, uncheck "Same as Home Address"
            if (name.startsWith('delivery') && name !== 'sameAsHomeAddress') {
                newData.sameAsHomeAddress = false;
            }

            return newData;
        });
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
                homeAddressLine: '',
                homePincode: '',
                homeState: '',
                homeDistrict: '',
                homeTaluka: '',
                deliveryAddressLine: '',
                deliveryPincode: '',
                deliveryState: '',
                deliveryDistrict: '',
                deliveryTaluka: '',
                sameAsHomeAddress: false,
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
                // Keep backward compatibility
                address: formData.homeAddressLine,
                addressLine: formData.homeAddressLine,
                pincode: formData.homePincode,
                state: formData.homeState,
                district: formData.homeDistrict,
                taluka: formData.homeTaluka,
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
            <Modal show={show} onHide={onHide} centered size="xl" className="add-party-modal">
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

                        {/* Address Information - Enhanced with Tabs */}
                        <div className="mb-4 p-3 bg-light rounded">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h6 className="text-muted mb-0 small">Address Information</h6>
                                <Button
                                    variant="outline-info"
                                    size="sm"
                                    onClick={copyHomeToDelivery}
                                    type="button"
                                    title="Copy home address to delivery address (Ctrl+D)"
                                >
                                    <FontAwesomeIcon icon={faCopy} className="me-1" />
                                    Copy Home to Delivery
                                </Button>
                            </div>

                            <Tab.Container activeKey={activeAddressTab} onSelect={setActiveAddressTab}>
                                <Nav variant="tabs" className="mb-3">
                                    <Nav.Item>
                                        <Nav.Link eventKey="home" className="small">
                                            <FontAwesomeIcon icon={faHome} className="me-1" />
                                            Home Address
                                        </Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link eventKey="delivery" className="small">
                                            <FontAwesomeIcon icon={faTruck} className="me-1" />
                                            Delivery Address
                                        </Nav.Link>
                                    </Nav.Item>
                                </Nav>

                                <Tab.Content>
                                    {/* Home Address Tab */}
                                    <Tab.Pane eventKey="home">
                                        <Row>
                                            <Col md={12}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="text-muted small">Home Address</Form.Label>
                                                    <Form.Control
                                                        ref={homeAddressRef}
                                                        as="textarea"
                                                        rows={2}
                                                        name="homeAddressLine"
                                                        value={formData.homeAddressLine}
                                                        onChange={handleInputChange}
                                                        placeholder="Enter home address"
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Col md={3}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="text-muted small">PIN Code</Form.Label>
                                                    <Form.Control
                                                        ref={homePincodeRef}
                                                        type="text"
                                                        name="homePincode"
                                                        value={formData.homePincode}
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
                                                        ref={homeStateRef}
                                                        type="text"
                                                        name="homeState"
                                                        value={formData.homeState}
                                                        onChange={handleInputChange}
                                                        placeholder="State"
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={3}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="text-muted small">District</Form.Label>
                                                    <Form.Control
                                                        ref={homeDistrictRef}
                                                        type="text"
                                                        name="homeDistrict"
                                                        value={formData.homeDistrict}
                                                        onChange={handleInputChange}
                                                        placeholder="District"
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={3}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="text-muted small">Taluka</Form.Label>
                                                    <Form.Control
                                                        ref={homeTalukaRef}
                                                        type="text"
                                                        name="homeTaluka"
                                                        value={formData.homeTaluka}
                                                        onChange={handleInputChange}
                                                        placeholder="Taluka"
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                    </Tab.Pane>

                                    {/* Delivery Address Tab */}
                                    <Tab.Pane eventKey="delivery">
                                        <div className="mb-3">
                                            <Form.Check
                                                type="checkbox"
                                                name="sameAsHomeAddress"
                                                id="sameAsHomeAddress"
                                                label="Same as home address"
                                                checked={formData.sameAsHomeAddress}
                                                onChange={handleInputChange}
                                                className="mb-3"
                                            />
                                        </div>

                                        <Row>
                                            <Col md={12}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="text-muted small">Delivery Address</Form.Label>
                                                    <Form.Control
                                                        ref={deliveryAddressRef}
                                                        as="textarea"
                                                        rows={2}
                                                        name="deliveryAddressLine"
                                                        value={formData.deliveryAddressLine}
                                                        onChange={handleInputChange}
                                                        placeholder="Enter delivery address"
                                                        disabled={formData.sameAsHomeAddress}
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Col md={3}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="text-muted small">PIN Code</Form.Label>
                                                    <Form.Control
                                                        ref={deliveryPincodeRef}
                                                        type="text"
                                                        name="deliveryPincode"
                                                        value={formData.deliveryPincode}
                                                        onChange={handleInputChange}
                                                        placeholder="PIN Code"
                                                        maxLength="6"
                                                        disabled={formData.sameAsHomeAddress}
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={3}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="text-muted small">State</Form.Label>
                                                    <Form.Control
                                                        ref={deliveryStateRef}
                                                        type="text"
                                                        name="deliveryState"
                                                        value={formData.deliveryState}
                                                        onChange={handleInputChange}
                                                        placeholder="State"
                                                        disabled={formData.sameAsHomeAddress}
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={3}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="text-muted small">District</Form.Label>
                                                    <Form.Control
                                                        ref={deliveryDistrictRef}
                                                        type="text"
                                                        name="deliveryDistrict"
                                                        value={formData.deliveryDistrict}
                                                        onChange={handleInputChange}
                                                        placeholder="District"
                                                        disabled={formData.sameAsHomeAddress}
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={3}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="text-muted small">Taluka</Form.Label>
                                                    <Form.Control
                                                        ref={deliveryTalukaRef}
                                                        type="text"
                                                        name="deliveryTaluka"
                                                        value={formData.deliveryTaluka}
                                                        onChange={handleInputChange}
                                                        placeholder="Taluka"
                                                        disabled={formData.sameAsHomeAddress}
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                    </Tab.Pane>
                                </Tab.Content>
                            </Tab.Container>
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

            <style>
                {`
                .add-party-modal .modal-dialog {
                    max-width: 1200px;
                }
                
                .add-party-modal .nav-tabs .nav-link {
                    padding: 0.5rem 1rem;
                    font-size: 0.875rem;
                }
                
                .add-party-modal .nav-tabs .nav-link.active {
                    background-color: #f8f9fa;
                    border-color: #dee2e6 #dee2e6 #f8f9fa;
                }
                
                .add-party-modal .tab-content {
                    border: 1px solid #dee2e6;
                    border-top: none;
                    padding: 1rem;
                    border-radius: 0 0 0.375rem 0.375rem;
                    background-color: white;
                }
                `}
            </style>
        </>
    );
}

export default AddNewParty;