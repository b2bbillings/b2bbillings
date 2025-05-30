import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Modal, Form, Table, Badge, Dropdown, InputGroup, Card, ListGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTimes, faEdit, faTrash, faEllipsisV, faUser, faBuilding, faPhone, faEnvelope, faMinus, faSearch, faFilter, faDownload } from '@fortawesome/free-solid-svg-icons';
import './Parties.css';
import emptyStateImage from '../../assets/images/parties-empty-state.svg';

function Parties() {
    // State for managing parties and modal
    const [parties, setParties] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingParty, setEditingParty] = useState(null);
    const [showAdditionalPhones, setShowAdditionalPhones] = useState(false);

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, customer, supplier
    const [showDatabaseSearch, setShowDatabaseSearch] = useState(false);
    const [databaseSearchQuery, setDatabaseSearchQuery] = useState('');
    const [databaseSearchResults, setDatabaseSearchResults] = useState([]);
    const [isSearchingDatabase, setIsSearchingDatabase] = useState(false);

    const [formData, setFormData] = useState({
        partyType: 'customer',
        name: '',
        whatsappNumber: '',
        phoneNumbers: [{ number: '', label: '' }],
        email: '',
        address: '',
        city: '',
        pincode: '',
        gstNumber: ''
    });

    // Sample database parties (simulating external database)
    const [databaseParties] = useState([
        { id: 'db1', name: 'Reliance Industries', phone: '9876543210', email: 'contact@reliance.com', partyType: 'supplier', city: 'Mumbai', gstNumber: '27AAACR5055K1ZX' },
        { id: 'db2', name: 'Tata Motors', phone: '9876543211', email: 'info@tatamotors.com', partyType: 'supplier', city: 'Pune', gstNumber: '27AAACT2727Q1ZN' },
        { id: 'db3', name: 'Amit Kumar', phone: '9876543212', email: 'amit@gmail.com', partyType: 'customer', city: 'Delhi', gstNumber: '' },
        { id: 'db4', name: 'Infosys Ltd', phone: '9876543213', email: 'contact@infosys.com', partyType: 'supplier', city: 'Bangalore', gstNumber: '29AAACI1681G1ZK' },
        { id: 'db5', name: 'Priya Sharma', phone: '9876543214', email: 'priya@gmail.com', partyType: 'customer', city: 'Jaipur', gstNumber: '' },
        { id: 'db6', name: 'Mahindra & Mahindra', phone: '9876543215', email: 'info@mahindra.com', partyType: 'supplier', city: 'Mumbai', gstNumber: '27AAACM1294H1Z8' }
    ]);

    const hasParties = parties.length > 0;

    // Filter parties based on search and type
    const filteredParties = parties.filter(party => {
        const matchesSearch = party.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            party.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            party.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            party.city?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesType = filterType === 'all' || party.partyType === filterType;

        return matchesSearch && matchesType;
    });

    // Search database parties
    const searchDatabaseParties = (query) => {
        if (!query.trim()) {
            setDatabaseSearchResults([]);
            return;
        }

        setIsSearchingDatabase(true);

        // Simulate API call delay
        setTimeout(() => {
            const results = databaseParties.filter(party => {
                const existingPartyIds = parties.map(p => p.originalId || p.id);
                const isNotAlreadyAdded = !existingPartyIds.includes(party.id);

                const matchesQuery = party.name.toLowerCase().includes(query.toLowerCase()) ||
                    party.phone.toLowerCase().includes(query.toLowerCase()) ||
                    party.email.toLowerCase().includes(query.toLowerCase()) ||
                    party.city.toLowerCase().includes(query.toLowerCase());

                return matchesQuery && isNotAlreadyAdded;
            });

            setDatabaseSearchResults(results);
            setIsSearchingDatabase(false);
        }, 500);
    };

    // Handle database search input
    const handleDatabaseSearch = (e) => {
        const query = e.target.value;
        setDatabaseSearchQuery(query);
        searchDatabaseParties(query);
    };

    // Add party from database
    const addPartyFromDatabase = (dbParty) => {
        const newParty = {
            ...dbParty,
            id: Date.now(),
            originalId: dbParty.id,
            createdAt: new Date().toISOString(),
            phoneNumbers: [{ number: dbParty.phone, label: 'Primary' }],
            whatsappNumber: dbParty.phone,
            pincode: ''
        };

        setParties([...parties, newParty]);

        // Remove from search results
        setDatabaseSearchResults(databaseSearchResults.filter(party => party.id !== dbParty.id));

        alert(`${dbParty.name} added successfully!`);
    };

    // Handle modal open/close
    const handleOpenModal = () => {
        setEditingParty(null);
        setShowAdditionalPhones(false);
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setEditingParty(null);
        setShowAdditionalPhones(false);
        setFormData({
            partyType: 'customer',
            name: '',
            whatsappNumber: '',
            phoneNumbers: [{ number: '', label: '' }],
            email: '',
            address: '',
            city: '',
            pincode: '',
            gstNumber: ''
        });
    };

    // Handle edit party
    const handleEditParty = (party) => {
        setEditingParty(party);
        const editData = {
            ...party,
            phoneNumbers: party.phoneNumbers || [{ number: party.phone || '', label: 'Primary' }],
            whatsappNumber: party.whatsappNumber || party.phone || ''
        };
        setFormData(editData);
        setShowAdditionalPhones(editData.phoneNumbers && editData.phoneNumbers.length > 0 && editData.phoneNumbers.some(phone => phone.number.trim() !== ''));
        setShowAddModal(true);
    };

    // Handle delete party
    const handleDeleteParty = (partyId) => {
        if (window.confirm('Are you sure you want to delete this party?')) {
            setParties(parties.filter(party => party.id !== partyId));
        }
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle phone number changes
    const handlePhoneNumberChange = (index, field, value) => {
        const newPhoneNumbers = [...formData.phoneNumbers];
        newPhoneNumbers[index][field] = value;
        setFormData(prev => ({
            ...prev,
            phoneNumbers: newPhoneNumbers
        }));
    };

    // Show additional phone numbers section
    const showAdditionalPhonesSection = () => {
        setShowAdditionalPhones(true);
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
            setFormData(prev => ({
                ...prev,
                phoneNumbers: [{ number: '', label: '' }]
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                phoneNumbers: newPhoneNumbers
            }));
        }
    };

    // Handle form submission
    const handleSaveParty = (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            alert('Please enter a name');
            return;
        }

        const validPhoneNumbers = formData.phoneNumbers.filter(phone => phone.number.trim() !== '');

        const partyData = {
            ...formData,
            phoneNumbers: validPhoneNumbers,
            phone: formData.whatsappNumber || (validPhoneNumbers.length > 0 ? validPhoneNumbers[0].number : '')
        };

        if (editingParty) {
            setParties(parties.map(party =>
                party.id === editingParty.id
                    ? { ...partyData, id: editingParty.id, createdAt: editingParty.createdAt }
                    : party
            ));
            alert('Party updated successfully!');
        } else {
            const newParty = {
                ...partyData,
                id: Date.now(),
                createdAt: new Date().toISOString()
            };
            setParties([...parties, newParty]);
            alert('Party added successfully!');
        }

        handleCloseModal();
    };

    // Render search and filter section
    const renderSearchAndFilters = () => (
        <Card className="mb-4 border-0 shadow-sm">
            <Card.Body className="p-3">
                <Row className="align-items-center">
                    <Col md={4}>
                        <InputGroup>
                            <InputGroup.Text className="bg-light border-end-0">
                                <FontAwesomeIcon icon={faSearch} className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Search parties by name, phone, email, city..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="border-start-0"
                            />
                        </InputGroup>
                    </Col>
                    <Col md={3}>
                        <Form.Select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="form-input"
                        >
                            <option value="all">All Types</option>
                            <option value="customer">Customers Only</option>
                            <option value="supplier">Suppliers Only</option>
                        </Form.Select>
                    </Col>
                    <Col md={3}>
                        <Button
                            variant="outline-primary"
                            onClick={() => setShowDatabaseSearch(!showDatabaseSearch)}
                            className="w-100"
                        >
                            <FontAwesomeIcon icon={faDownload} className="me-2" />
                            Import from Database
                        </Button>
                    </Col>
                    <Col md={2}>
                        <div className="text-muted small">
                            {filteredParties.length} of {parties.length} parties
                        </div>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
    );

    // Render database search section
    const renderDatabaseSearch = () => (
        showDatabaseSearch && (
            <Card className="mb-4 border-primary">
                <Card.Header className="bg-primary text-white">
                    <div className="d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">
                            <FontAwesomeIcon icon={faDownload} className="me-2" />
                            Import Parties from Database
                        </h6>
                        <Button
                            variant="outline-light"
                            size="sm"
                            onClick={() => {
                                setShowDatabaseSearch(false);
                                setDatabaseSearchQuery('');
                                setDatabaseSearchResults([]);
                            }}
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </Button>
                    </div>
                </Card.Header>
                <Card.Body>
                    <InputGroup className="mb-3">
                        <InputGroup.Text>
                            <FontAwesomeIcon icon={faSearch} />
                        </InputGroup.Text>
                        <Form.Control
                            type="text"
                            placeholder="Search database parties by name, phone, email, or city..."
                            value={databaseSearchQuery}
                            onChange={handleDatabaseSearch}
                        />
                    </InputGroup>

                    {isSearchingDatabase && (
                        <div className="text-center py-3">
                            <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                            Searching database...
                        </div>
                    )}

                    {databaseSearchResults.length > 0 && (
                        <div>
                            <h6 className="mb-3">Search Results ({databaseSearchResults.length})</h6>
                            <ListGroup className="database-search-results">
                                {databaseSearchResults.map((party) => (
                                    <ListGroup.Item key={party.id} className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <div className="d-flex align-items-center">
                                                <FontAwesomeIcon
                                                    icon={party.partyType === 'customer' ? faUser : faBuilding}
                                                    className="text-muted me-2"
                                                />
                                                <div>
                                                    <div className="fw-semibold">{party.name}</div>
                                                    <div className="small text-muted">
                                                        <FontAwesomeIcon icon={faPhone} className="me-1" />
                                                        {party.phone}
                                                        {party.email && (
                                                            <>
                                                                <span className="mx-2">•</span>
                                                                <FontAwesomeIcon icon={faEnvelope} className="me-1" />
                                                                {party.email}
                                                            </>
                                                        )}
                                                        {party.city && (
                                                            <>
                                                                <span className="mx-2">•</span>
                                                                {party.city}
                                                            </>
                                                        )}
                                                    </div>
                                                    {party.gstNumber && (
                                                        <div className="small text-muted">GST: {party.gstNumber}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <Badge bg={party.partyType === 'customer' ? 'primary' : 'success'}>
                                                {party.partyType}
                                            </Badge>
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => addPartyFromDatabase(party)}
                                            >
                                                <FontAwesomeIcon icon={faPlus} className="me-1" />
                                                Add
                                            </Button>
                                        </div>
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        </div>
                    )}

                    {databaseSearchQuery && !isSearchingDatabase && databaseSearchResults.length === 0 && (
                        <div className="text-center py-4 text-muted">
                            <FontAwesomeIcon icon={faSearch} size="2x" className="mb-2" />
                            <div>No parties found matching your search.</div>
                            <small>Try different keywords or check if the party is already added.</small>
                        </div>
                    )}

                    {!databaseSearchQuery && (
                        <div className="text-center py-4 text-muted">
                            <FontAwesomeIcon icon={faSearch} size="2x" className="mb-2" />
                            <div>Start typing to search for parties in the database.</div>
                        </div>
                    )}
                </Card.Body>
            </Card>
        )
    );

    // Render parties list
    const renderPartiesList = () => (
        <div className="parties-list-container">
            <div className="table-responsive">
                <Table hover className="parties-table">
                    <thead className="table-light">
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Contact</th>
                            <th>Location</th>
                            <th>GST</th>
                            <th width="50">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredParties.map((party) => (
                            <tr key={party.id}>
                                <td>
                                    <div className="d-flex align-items-center">
                                        <div className="party-avatar me-3">
                                            <FontAwesomeIcon
                                                icon={party.partyType === 'customer' ? faUser : faBuilding}
                                                className="text-muted"
                                            />
                                        </div>
                                        <div>
                                            <div className="fw-semibold">{party.name}</div>
                                            {party.email && (
                                                <small className="text-muted">
                                                    <FontAwesomeIcon icon={faEnvelope} className="me-1" />
                                                    {party.email}
                                                </small>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <Badge
                                        bg={party.partyType === 'customer' ? 'primary' : 'success'}
                                        className="party-type-badge"
                                    >
                                        {party.partyType === 'customer' ? 'Customer' : 'Supplier'}
                                    </Badge>
                                </td>
                                <td>
                                    <div className="contact-info">
                                        {party.whatsappNumber && (
                                            <div className="text-muted mb-1">
                                                <FontAwesomeIcon icon={faPhone} className="me-1 text-success" />
                                                <small className="text-success">WhatsApp:</small> {party.whatsappNumber}
                                            </div>
                                        )}
                                        {party.phoneNumbers && party.phoneNumbers.length > 0 && (
                                            party.phoneNumbers.slice(0, 2).map((phone, index) => (
                                                phone.number && (
                                                    <div key={index} className="text-muted">
                                                        <FontAwesomeIcon icon={faPhone} className="me-1" />
                                                        {phone.label && <small>{phone.label}:</small>} {phone.number}
                                                    </div>
                                                )
                                            ))
                                        )}
                                        {party.phoneNumbers && party.phoneNumbers.length > 2 && (
                                            <small className="text-muted">+{party.phoneNumbers.length - 2} more</small>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <div>
                                        <span className="text-muted">{party.city || '-'}</span>
                                        {party.pincode && (
                                            <div>
                                                <small className="text-muted">PIN: {party.pincode}</small>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <span className="text-muted">{party.gstNumber || '-'}</span>
                                </td>
                                <td>
                                    <Dropdown>
                                        <Dropdown.Toggle
                                            variant="link"
                                            className="p-0 border-0 text-muted"
                                            id={`dropdown-${party.id}`}
                                        >
                                            <FontAwesomeIcon icon={faEllipsisV} />
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu>
                                            <Dropdown.Item onClick={() => handleEditParty(party)}>
                                                <FontAwesomeIcon icon={faEdit} className="me-2" />
                                                Edit
                                            </Dropdown.Item>
                                            <Dropdown.Item
                                                onClick={() => handleDeleteParty(party.id)}
                                                className="text-danger"
                                            >
                                                <FontAwesomeIcon icon={faTrash} className="me-2" />
                                                Delete
                                            </Dropdown.Item>
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        </div>
    );

    return (
        <Container fluid className="py-4">
            <Row className="mb-4 align-items-center">
                <Col>
                    <h1 className="page-title mb-0">
                        Parties
                        {hasParties && (
                            <Badge bg="secondary" className="ms-2">{parties.length}</Badge>
                        )}
                    </h1>
                </Col>
                <Col xs="auto">
                    <Button
                        variant="primary"
                        className="d-flex align-items-center"
                        onClick={handleOpenModal}
                    >
                        <FontAwesomeIcon icon={faPlus} className="me-2" />
                        Add New Party
                    </Button>
                </Col>
            </Row>

            {/* Search and Filters */}
            {hasParties && renderSearchAndFilters()}

            {/* Database Search */}
            {renderDatabaseSearch()}

            {!hasParties ? (
                <div className="empty-state-container">
                    <div className="empty-state-content text-center">
                        <h2 className="mt-4">Party Details</h2>
                        <p className="text-muted mb-4">
                            Add your customers and suppliers to manage your business easily.
                            <br />
                            Track payments and grow your business without any hassle!
                        </p>

                        <div className="empty-state-image-container mb-4">
                            <img
                                src={emptyStateImage}
                                alt="Add your first party"
                                className="empty-state-image"
                            />
                        </div>

                        <div className="d-flex gap-3 justify-content-center">
                            <Button
                                variant="danger"
                                className="add-party-btn"
                                onClick={handleOpenModal}
                            >
                                <FontAwesomeIcon icon={faPlus} className="me-2" />
                                Add Your First Party
                            </Button>
                            <Button
                                variant="outline-primary"
                                onClick={() => setShowDatabaseSearch(true)}
                            >
                                <FontAwesomeIcon icon={faDownload} className="me-2" />
                                Import from Database
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {filteredParties.length === 0 ? (
                        <div className="text-center py-5">
                            <FontAwesomeIcon icon={faSearch} size="3x" className="text-muted mb-3" />
                            <h4>No parties found</h4>
                            <p className="text-muted">
                                No parties match your current search criteria.
                                <br />
                                Try adjusting your search terms or filters.
                            </p>
                            <Button variant="outline-primary" onClick={() => {
                                setSearchQuery('');
                                setFilterType('all');
                            }}>
                                Clear Filters
                            </Button>
                        </div>
                    ) : (
                        renderPartiesList()
                    )}
                </>
            )}

            {/* Add/Edit Party Modal - keeping the existing modal code */}
            <Modal show={showAddModal} onHide={handleCloseModal} centered size="xl">
                {/* ... existing modal content ... */}
                <Modal.Header className="border-0 pb-0">
                    <Modal.Title className="fw-bold">
                        {editingParty ? 'Edit Party' : 'Add New Party'}
                    </Modal.Title>
                    <Button
                        variant="link"
                        className="p-0 border-0 text-muted"
                        onClick={handleCloseModal}
                    >
                        <FontAwesomeIcon icon={faTimes} size="lg" />
                    </Button>
                </Modal.Header>

                <Modal.Body className="px-4 pb-4">
                    <Form onSubmit={handleSaveParty}>
                        {/* Party Type Selection */}
                        <Form.Group className="mb-4">
                            <Form.Label className="fw-semibold mb-3">Party Type</Form.Label>
                            <div className="d-flex gap-4">
                                <Form.Check
                                    type="radio"
                                    name="partyType"
                                    id="customer"
                                    label="Customer"
                                    value="customer"
                                    checked={formData.partyType === 'customer'}
                                    onChange={handleInputChange}
                                    className="party-type-radio"
                                />
                                <Form.Check
                                    type="radio"
                                    name="partyType"
                                    id="supplier"
                                    label="Supplier"
                                    value="supplier"
                                    checked={formData.partyType === 'supplier'}
                                    onChange={handleInputChange}
                                    className="party-type-radio"
                                />
                            </div>
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
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Enter party name"
                                        className="form-input"
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold">
                                        WhatsApp Number
                                        <small className="text-muted ms-1">(Primary Contact)</small>
                                    </Form.Label>
                                    <Form.Control
                                        type="tel"
                                        name="whatsappNumber"
                                        value={formData.whatsappNumber}
                                        onChange={handleInputChange}
                                        placeholder="Enter WhatsApp number"
                                        className="form-input"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        {/* Add Phone Number Button */}
                        {!showAdditionalPhones && (
                            <Row className="mb-3">
                                <Col>
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={showAdditionalPhonesSection}
                                        type="button"
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="me-1" />
                                        Add Phone Numbers
                                    </Button>
                                </Col>
                            </Row>
                        )}

                        {/* Multiple Phone Numbers Section */}
                        {showAdditionalPhones && (
                            <div className="mb-4">
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

                                {formData.phoneNumbers.map((phone, index) => (
                                    <Row key={index} className="mb-2 align-items-end">
                                        <Col md={4}>
                                            <Form.Group>
                                                <Form.Label className="fw-semibold small">Label</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    value={phone.label}
                                                    onChange={(e) => handlePhoneNumberChange(index, 'label', e.target.value)}
                                                    placeholder="e.g., Office, Home, Mobile"
                                                    className="form-input"
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
                                                    className="form-input"
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

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold">Email</Form.Label>
                                    <Form.Control
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
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
                                        value={formData.gstNumber}
                                        onChange={handleInputChange}
                                        placeholder="Enter GST number (optional)"
                                        className="form-input"
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
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        placeholder="Enter city"
                                        className="form-input"
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
                                        value={formData.pincode}
                                        onChange={handleInputChange}
                                        placeholder="Enter 6-digit pin code"
                                        className="form-input"
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
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        placeholder="Enter complete address"
                                        className="form-input"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        {/* Action Buttons */}
                        <div className="d-flex gap-3 justify-content-end">
                            <Button
                                variant="outline-secondary"
                                onClick={handleCloseModal}
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
                                <FontAwesomeIcon icon={faPlus} className="me-2" />
                                {editingParty ? 'Update Party' : 'Save Party'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container>
    );
}

export default Parties;