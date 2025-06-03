import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Card, Form, InputGroup, ListGroup, Badge, Table, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus,
    faSearch,
    faEdit,
    faPhone,
    faEnvelope,
    faMapMarkerAlt,
    faBuilding,
    faUser,
    faFileInvoice,
    faShoppingCart,
    faChevronDown,
    faCog,
    faEllipsisV,
    faArrowUp,
    faArrowDown,
    faFilter,
    faSort,
    faSortUp,
    faSortDown
} from '@fortawesome/free-solid-svg-icons';
import './Parties.css';
import AddNewParty from './Party/AddNewParty';

function Parties() {
    // State for managing parties
    const [parties, setParties] = useState([
        {
            id: 1,
            name: 'IT Solution',
            phone: '9999999999',
            email: 'it@solution.com',
            address: 'LATUR',
            partyType: 'customer',
            balance: 90000.00,
            isSelected: true
        },
        {
            id: 2,
            name: 'Atharva',
            phone: '9876543210',
            email: 'atharva@gmail.com',
            address: 'Mumbai',
            partyType: 'customer',
            balance: 0,
            isSelected: false
        }
    ]);

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingParty, setEditingParty] = useState(null);
    const [selectedParty, setSelectedParty] = useState(parties[0]);

    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [transactionSearchQuery, setTransactionSearchQuery] = useState('');

    // Sorting states
    const [sortConfig, setSortConfig] = useState({
        key: null,
        direction: 'asc'
    });

    // Filter states for each column
    const [filters, setFilters] = useState({
        type: [],
        number: '',
        date: '',
        total: '',
        balance: ''
    });

    // Sample transactions for selected party
    const [transactions, setTransactions] = useState([
        {
            id: 1,
            type: 'Sale',
            number: '1',
            date: '03/06/2025',
            total: 90000.00,
            balance: 90000.00
        }
    ]);

    // Available transaction types
    const transactionTypes = [
        'Sale',
        'Sale (e-Invoice)',
        'Purchase',
        'Credit Note',
        'Credit Note (e-Invoice)',
        'Debit Note',
        'Sale Order',
        'Purchase Order',
        'Quotation',
        'Delivery Challan',
        'Receipt Voucher',
        'Payment Voucher'
    ];

    // Helper function to format currency safely
    const formatCurrency = (amount) => {
        const numericAmount = parseFloat(amount) || 0;
        return numericAmount.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    // Helper function to ensure party has all required properties
    const normalizeParty = (party) => {
        return {
            id: party.id || Date.now(),
            name: party.name || party.businessName || '',
            phone: party.phone || party.phoneNumber || party.whatsappNumber || '',
            email: party.email || '',
            address: party.address || '',
            partyType: party.partyType || 'customer',
            balance: parseFloat(party.balance) || 0,
            isSelected: party.isSelected || false,
            // Add any additional fields from AddNewParty form
            city: party.city || '',
            state: party.state || '',
            pincode: party.pincode || '',
            gstNumber: party.gstNumber || '',
            panNumber: party.panNumber || '',
            whatsappNumber: party.whatsappNumber || '',
            phoneNumbers: party.phoneNumbers || [],
            taluka: party.taluka || '',
            // Preserve any other existing fields
            ...party
        };
    };

    // Handle sorting
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Sort parties based on current sort configuration
    const sortedParties = React.useMemo(() => {
        let sortableParties = [...parties];
        if (sortConfig.key) {
            sortableParties.sort((a, b) => {
                if (sortConfig.key === 'name') {
                    const aValue = (a.name || '').toLowerCase();
                    const bValue = (b.name || '').toLowerCase();
                    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                } else if (sortConfig.key === 'balance') {
                    const aValue = parseFloat(a.balance) || 0;
                    const bValue = parseFloat(b.balance) || 0;
                    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                }
                return 0;
            });
        }
        return sortableParties;
    }, [parties, sortConfig]);

    // Filter parties based on search
    const filteredParties = sortedParties.filter(party => {
        const name = party.name || '';
        const phone = party.phone || '';
        const searchTerm = searchQuery.toLowerCase();

        return name.toLowerCase().includes(searchTerm) ||
            phone.includes(searchQuery);
    });

    // Handle party selection
    const handlePartySelect = (party) => {
        const normalizedParty = normalizeParty(party);
        setParties(parties.map(p => ({ ...p, isSelected: p.id === normalizedParty.id })));
        setSelectedParty(normalizedParty);

        // Set sample transactions based on selected party
        if (normalizedParty.id === 1) {
            setTransactions([
                {
                    id: 1,
                    type: 'Sale',
                    number: '1',
                    date: '03/06/2025',
                    total: 90000.00,
                    balance: 90000.00
                }
            ]);
        } else {
            setTransactions([]);
        }
    };

    // Handle filter changes
    const handleFilterChange = (column, value) => {
        setFilters(prev => ({
            ...prev,
            [column]: value
        }));
    };

    // Handle type filter toggle
    const handleTypeFilter = (type) => {
        setFilters(prev => ({
            ...prev,
            type: prev.type.includes(type)
                ? prev.type.filter(t => t !== type)
                : [...prev.type, type]
        }));
    };

    // Clear all filters
    const clearFilters = () => {
        setFilters({
            type: [],
            number: '',
            date: '',
            total: '',
            balance: ''
        });
    };

    // Apply filters to transactions
    const filteredTransactions = transactions.filter(transaction => {
        if (filters.type.length > 0 && !filters.type.includes(transaction.type)) return false;
        if (filters.number && !transaction.number.toString().includes(filters.number)) return false;
        if (filters.date && !transaction.date.includes(filters.date)) return false;
        if (filters.total && !transaction.total.toString().includes(filters.total)) return false;
        if (filters.balance && !transaction.balance.toString().includes(filters.balance)) return false;
        return true;
    });

    // Get sort icon for a specific column
    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return faSort;
        }
        return sortConfig.direction === 'asc' ? faSortUp : faSortDown;
    };

    // Modal handlers
    const handleOpenModal = () => {
        setEditingParty(null);
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setEditingParty(null);
    };

    // Handle edit party
    const handleEditParty = (party) => {
        setEditingParty(normalizeParty(party));
        setShowAddModal(true);
    };

    // Handle save party - Updated with better error handling
    const handleSaveParty = (partyData, isQuickAdd = false, isEdit = false) => {
        try {
            const normalizedParty = normalizeParty(partyData);

            if (isEdit) {
                setParties(prevParties =>
                    prevParties.map(party =>
                        party.id === normalizedParty.id ? normalizedParty : party
                    )
                );

                // Update selected party if it's the one being edited
                if (selectedParty && selectedParty.id === normalizedParty.id) {
                    setSelectedParty(normalizedParty);
                }

                alert('Party updated successfully!');
            } else {
                // Ensure unique ID for new party
                if (!normalizedParty.id) {
                    normalizedParty.id = Date.now() + Math.random();
                }

                setParties(prevParties => [...prevParties, normalizedParty]);

                if (isQuickAdd) {
                    alert('Quick customer added successfully!');
                } else {
                    alert('Party added successfully!');
                }
            }

            handleCloseModal();
        } catch (error) {
            console.error('Error saving party:', error);
            alert('Error saving party. Please try again.');
        }
    };

    // Handle payment actions
    const handlePayIn = () => {
        if (selectedParty) {
            alert(`Recording payment received from ${selectedParty.name}`);
        }
    };

    const handlePayOut = () => {
        if (selectedParty) {
            alert(`Recording payment made to ${selectedParty.name}`);
        }
    };

    return (
        <div className="parties-layout bg-light min-vh-100" style={{ fontSize: '13px' }}>
            {/* Top Header - Transaction Search */}
            <div className="bg-white border-bottom shadow-sm p-2">
                <Container fluid>
                    <Row className="align-items-center g-2">
                        <Col lg={7} md={6}>
                            <InputGroup size="sm">
                                <InputGroup.Text className="bg-light border-end-0 rounded-start-pill">
                                    <FontAwesomeIcon icon={faSearch} className="text-muted" size="sm" />
                                </InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    placeholder="Search transactions..."
                                    value={transactionSearchQuery}
                                    onChange={(e) => setTransactionSearchQuery(e.target.value)}
                                    className="border-start-0 rounded-end-pill"
                                    style={{ fontSize: '13px' }}
                                />
                            </InputGroup>
                        </Col>
                        <Col lg={5} md={6} className="text-end">
                            <div className="d-flex gap-2 justify-content-end flex-wrap">
                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    className="px-2 border-2"
                                    style={{ fontSize: '12px' }}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="me-1" size="sm" />
                                    Add Sale
                                </Button>
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="px-2 border-2"
                                    style={{ fontSize: '12px' }}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="me-1" size="sm" />
                                    Add Purchase
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* Parties Section Header */}
            <div className="bg-white border-bottom shadow-sm p-2">
                <Container fluid>
                    <Row className="align-items-center">
                        <Col>
                            <Dropdown>
                                <Dropdown.Toggle
                                    variant="link"
                                    className="text-dark text-decoration-none p-0 border-0 shadow-none bg-transparent"
                                    id="parties-dropdown"
                                >
                                    <h5 className="mb-0 fw-bold d-flex align-items-center" style={{ fontSize: '16px' }}>
                                        Parties
                                        <FontAwesomeIcon icon={faChevronDown} className="ms-2" size="sm" />
                                    </h5>
                                </Dropdown.Toggle>
                                <Dropdown.Menu className="shadow border-0">
                                    <Dropdown.Item className="py-2" style={{ fontSize: '13px' }}>All Parties</Dropdown.Item>
                                    <Dropdown.Item className="py-2" style={{ fontSize: '13px' }}>Customers</Dropdown.Item>
                                    <Dropdown.Item className="py-2" style={{ fontSize: '13px' }}>Suppliers</Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item className="py-2" style={{ fontSize: '13px' }}>Export Parties</Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </Col>
                        <Col xs="auto">
                            <div className="d-flex align-items-center gap-2">
                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={handleOpenModal}
                                    className="px-2 border-2"
                                    style={{ fontSize: '12px' }}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="me-1" />
                                    Add Party
                                </Button>
                                <Button variant="outline-secondary" size="sm" className="border-0 p-1">
                                    <FontAwesomeIcon icon={faCog} size="sm" />
                                </Button>
                                <Button variant="outline-secondary" size="sm" className="border-0 p-1">
                                    <FontAwesomeIcon icon={faEllipsisV} size="sm" />
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* Main Content */}
            <Container fluid className="p-0">
                <Row className="g-0" style={{ height: 'calc(100vh - 120px)' }}>
                    {/* Left Sidebar - Parties List */}
                    <Col xl={3} lg={4} md={5} className="bg-white border-end">
                        <div className="h-100 d-flex flex-column">
                            {/* Search Party */}
                            <div className="p-2 border-bottom bg-light ">
                                <InputGroup size="sm">
                                    <InputGroup.Text className="bg-white border-end-0 rounded-start-pill">
                                        <FontAwesomeIcon icon={faSearch} className="text-muted" size="sm" />
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search Party Name"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="border-start-0 rounded-end-pill"
                                        style={{ fontSize: '13px' }}
                                    />
                                </InputGroup>
                            </div>

                            {/* Parties List Header */}
                            <div className="bg-light border-bottom px-2 py-1">
                                <Row className="align-items-center">
                                    <Col>
                                        <small
                                            className="text-muted fw-bold text-uppercase d-flex align-items-center cursor-pointer"
                                            style={{ fontSize: '11px' }}
                                            onClick={() => handleSort('name')}
                                        >
                                            <FontAwesomeIcon icon={faFilter} className="me-1" size="xs" />
                                            Party Name
                                            <FontAwesomeIcon
                                                icon={getSortIcon('name')}
                                                className="ms-auto"
                                                size="xs"
                                            />
                                        </small>
                                    </Col>
                                    <Col xs="auto">
                                        <small
                                            className="text-muted fw-bold text-uppercase d-flex align-items-center cursor-pointer"
                                            style={{ fontSize: '11px' }}
                                            onClick={() => handleSort('balance')}
                                        >
                                            Amount
                                            <FontAwesomeIcon
                                                icon={getSortIcon('balance')}
                                                className="ms-1"
                                                size="xs"
                                            />
                                        </small>
                                    </Col>
                                </Row>
                            </div>

                            {/* Parties List */}
                            <div className="flex-grow-1 parties-list-container">
                                <ListGroup variant="flush" className="border-0">
                                    {filteredParties.map((party) => {
                                        const normalizedParty = normalizeParty(party);
                                        return (
                                            <ListGroup.Item
                                                key={normalizedParty.id}
                                                action
                                                active={normalizedParty.isSelected}
                                                onClick={() => handlePartySelect(normalizedParty)}
                                                className={`border-0 border-bottom party-item p-2 ${normalizedParty.isSelected
                                                    ? 'bg-primary bg-opacity-75 text-white'
                                                    : 'bg-white'
                                                    }`}
                                                style={{
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.2s ease'
                                                }}
                                            >
                                                <Row className="align-items-center">
                                                    <Col>
                                                        <div
                                                            className={`fw-bold mb-1 ${normalizedParty.isSelected ? 'text-white' : 'text-dark'
                                                                }`}
                                                            style={{ fontSize: '13px' }}
                                                        >
                                                            {normalizedParty.name}
                                                        </div>
                                                        <small
                                                            className={
                                                                normalizedParty.isSelected ? 'text-white text-opacity-75' : 'text-muted'
                                                            }
                                                            style={{ fontSize: '11px' }}
                                                        >
                                                            {normalizedParty.phone}
                                                        </small>
                                                    </Col>
                                                    <Col xs="auto" className="text-end">
                                                        <div
                                                            className={`fw-bold ${normalizedParty.isSelected
                                                                ? 'text-white'
                                                                : normalizedParty.balance > 0
                                                                    ? 'text-success'
                                                                    : 'text-secondary'
                                                                }`}
                                                            style={{ fontSize: '12px' }}
                                                        >
                                                            ₹{formatCurrency(normalizedParty.balance)}
                                                        </div>
                                                    </Col>
                                                </Row>
                                            </ListGroup.Item>
                                        );
                                    })}
                                </ListGroup>
                            </div>

                            {/* Bottom Contact Info */}
                            <div className="p-2 border-top bg-light">
                                <Card className="border-0 bg-success bg-opacity-10 text-center">
                                    <Card.Body className="p-2">
                                        <FontAwesomeIcon icon={faPhone} className="text-success mb-1" />
                                        <div className="small text-muted" style={{ fontSize: '11px' }}>
                                            Use contacts from your Phone or Gmail to{' '}
                                            <strong className="text-dark">quickly create parties.</strong>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </div>
                        </div>
                    </Col>

                    {/* Right Content Area - Party Details */}
                    <Col xl={9} lg={8} md={7}>
                        {selectedParty ? (
                            <div className="h-100 bg-white">
                                {/* Party Header */}
                                <div className="border-bottom p-3 bg-light">
                                    <Row className="align-items-center">
                                        <Col>
                                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                                <div>
                                                    <h5 className="mb-1 fw-bold d-flex align-items-center" style={{ fontSize: '16px' }}>
                                                        {selectedParty.name}
                                                        <Button
                                                            variant="link"
                                                            size="sm"
                                                            className="p-1 ms-2 text-primary"
                                                            onClick={() => handleEditParty(selectedParty)}
                                                        >
                                                            <FontAwesomeIcon icon={faEdit} size="sm" />
                                                        </Button>
                                                    </h5>
                                                    <div className="text-muted" style={{ fontSize: '12px' }}>
                                                        <FontAwesomeIcon icon={faPhone} className="me-1" />
                                                        {selectedParty.phone}
                                                        <span className="mx-2">|</span>
                                                        <FontAwesomeIcon icon={faEnvelope} className="me-1" />
                                                        {selectedParty.email}
                                                    </div>
                                                </div>
                                                <div className="d-flex gap-2">
                                                    <Button
                                                        variant="outline-success"
                                                        size="sm"
                                                        onClick={handlePayIn}
                                                        className="px-2 border-2"
                                                        style={{ fontSize: '12px' }}
                                                    >
                                                        <FontAwesomeIcon icon={faArrowDown} className="me-1" />
                                                        Pay In
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={handlePayOut}
                                                        className="px-2 border-2"
                                                        style={{ fontSize: '12px' }}
                                                    >
                                                        <FontAwesomeIcon icon={faArrowUp} className="me-1" />
                                                        Pay Out
                                                    </Button>
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                </div>

                                {/* Transactions Section */}
                                <div className="p-3">
                                    <Row className="align-items-center mb-3">
                                        <Col>
                                            <h6 className="mb-0 fw-bold" style={{ fontSize: '14px' }}>Transactions</h6>
                                        </Col>
                                        <Col xs="auto">
                                            <div className="d-flex gap-1">
                                                <Button variant="outline-secondary" size="sm" className="border-0 p-1">
                                                    <FontAwesomeIcon icon={faSearch} size="sm" />
                                                </Button>
                                                <Button variant="outline-secondary" size="sm" className="border-0 p-1">
                                                    <FontAwesomeIcon icon={faFileInvoice} size="sm" />
                                                </Button>
                                                <Button variant="outline-secondary" size="sm" className="border-0 p-1">
                                                    <FontAwesomeIcon icon={faEllipsisV} size="sm" />
                                                </Button>
                                            </div>
                                        </Col>
                                    </Row>

                                    {/* Transactions Table */}
                                    {filteredTransactions.length > 0 ? (
                                        <div className="border rounded">
                                            {/* Table Headers with Inline Filters */}
                                            <div className="bg-light border-bottom">
                                                <Row className="align-items-center py-2 px-3">
                                                    <Col lg={2} md={3}>
                                                        <Dropdown>
                                                            <Dropdown.Toggle
                                                                variant="link"
                                                                className="text-muted fw-bold text-uppercase text-decoration-none p-0 border-0 shadow-none bg-transparent d-flex align-items-center"
                                                                style={{ fontSize: '11px' }}
                                                            >
                                                                TYPE
                                                                <FontAwesomeIcon icon={faChevronDown} className="ms-1" size="xs" />
                                                            </Dropdown.Toggle>
                                                            <Dropdown.Menu className="p-3" style={{ minWidth: '250px' }}>
                                                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                                                    {transactionTypes.map((type) => (
                                                                        <Form.Check
                                                                            key={type}
                                                                            type="checkbox"
                                                                            id={`type-${type}`}
                                                                            label={type}
                                                                            checked={filters.type.includes(type)}
                                                                            onChange={() => handleTypeFilter(type)}
                                                                            className="mb-2"
                                                                            style={{ fontSize: '12px' }}
                                                                        />
                                                                    ))}
                                                                </div>
                                                                <hr />
                                                                <div className="d-flex gap-2">
                                                                    <Button
                                                                        variant="outline-secondary"
                                                                        size="sm"
                                                                        onClick={clearFilters}
                                                                        style={{ fontSize: '11px' }}
                                                                    >
                                                                        Clear
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline-danger"
                                                                        size="sm"
                                                                        style={{ fontSize: '11px' }}
                                                                    >
                                                                        Apply
                                                                    </Button>
                                                                </div>
                                                            </Dropdown.Menu>
                                                        </Dropdown>
                                                    </Col>
                                                    <Col lg={2} md={3}>
                                                        <Dropdown>
                                                            <Dropdown.Toggle
                                                                variant="link"
                                                                className="text-muted fw-bold text-uppercase text-decoration-none p-0 border-0 shadow-none bg-transparent d-flex align-items-center"
                                                                style={{ fontSize: '11px' }}
                                                            >
                                                                NUMBER
                                                                <FontAwesomeIcon icon={faFilter} className="ms-1" size="xs" />
                                                            </Dropdown.Toggle>
                                                            <Dropdown.Menu className="p-2">
                                                                <Form.Control
                                                                    size="sm"
                                                                    placeholder="Filter by number..."
                                                                    value={filters.number}
                                                                    onChange={(e) => handleFilterChange('number', e.target.value)}
                                                                    style={{ fontSize: '12px' }}
                                                                />
                                                            </Dropdown.Menu>
                                                        </Dropdown>
                                                    </Col>
                                                    <Col lg={2} md={3}>
                                                        <Dropdown>
                                                            <Dropdown.Toggle
                                                                variant="link"
                                                                className="text-muted fw-bold text-uppercase text-decoration-none p-0 border-0 shadow-none bg-transparent d-flex align-items-center"
                                                                style={{ fontSize: '11px' }}
                                                            >
                                                                DATE
                                                                <FontAwesomeIcon icon={faFilter} className="ms-1" size="xs" />
                                                            </Dropdown.Toggle>
                                                            <Dropdown.Menu className="p-2">
                                                                <Form.Control
                                                                    size="sm"
                                                                    placeholder="Filter by date..."
                                                                    value={filters.date}
                                                                    onChange={(e) => handleFilterChange('date', e.target.value)}
                                                                    style={{ fontSize: '12px' }}
                                                                />
                                                            </Dropdown.Menu>
                                                        </Dropdown>
                                                    </Col>
                                                    <Col lg={2} md={3}>
                                                        <Dropdown>
                                                            <Dropdown.Toggle
                                                                variant="link"
                                                                className="text-muted fw-bold text-uppercase text-decoration-none p-0 border-0 shadow-none bg-transparent d-flex align-items-center"
                                                                style={{ fontSize: '11px' }}
                                                            >
                                                                TOTAL
                                                                <FontAwesomeIcon icon={faFilter} className="ms-1" size="xs" />
                                                            </Dropdown.Toggle>
                                                            <Dropdown.Menu className="p-2">
                                                                <Form.Control
                                                                    size="sm"
                                                                    placeholder="Filter by total..."
                                                                    value={filters.total}
                                                                    onChange={(e) => handleFilterChange('total', e.target.value)}
                                                                    style={{ fontSize: '12px' }}
                                                                />
                                                            </Dropdown.Menu>
                                                        </Dropdown>
                                                    </Col>
                                                    <Col lg={2} md={3}>
                                                        <Dropdown>
                                                            <Dropdown.Toggle
                                                                variant="link"
                                                                className="text-muted fw-bold text-uppercase text-decoration-none p-0 border-0 shadow-none bg-transparent d-flex align-items-center"
                                                                style={{ fontSize: '11px' }}
                                                            >
                                                                BALANCE
                                                                <FontAwesomeIcon icon={faFilter} className="ms-1" size="xs" />
                                                            </Dropdown.Toggle>
                                                            <Dropdown.Menu className="p-2">
                                                                <Form.Control
                                                                    size="sm"
                                                                    placeholder="Filter by balance..."
                                                                    value={filters.balance}
                                                                    onChange={(e) => handleFilterChange('balance', e.target.value)}
                                                                    style={{ fontSize: '12px' }}
                                                                />
                                                            </Dropdown.Menu>
                                                        </Dropdown>
                                                    </Col>
                                                    <Col lg={2} md={3}>
                                                    </Col>
                                                </Row>
                                            </div>

                                            {/* Table Data */}
                                            <div>
                                                {filteredTransactions.map((transaction, index) => (
                                                    <Row key={index} className="align-items-center py-2 px-3 border-bottom">
                                                        <Col lg={2} md={3}>
                                                            <span style={{ fontSize: '13px' }}>{transaction.type}</span>
                                                        </Col>
                                                        <Col lg={2} md={3}>
                                                            <span style={{ fontSize: '13px' }}>{transaction.number}</span>
                                                        </Col>
                                                        <Col lg={2} md={3}>
                                                            <span style={{ fontSize: '13px' }}>{transaction.date}</span>
                                                        </Col>
                                                        <Col lg={2} md={3}>
                                                            <span style={{ fontSize: '13px' }}>₹{formatCurrency(transaction.total)}</span>
                                                        </Col>
                                                        <Col lg={2} md={3}>
                                                            <span style={{ fontSize: '13px' }}>₹{formatCurrency(transaction.balance)}</span>
                                                        </Col>
                                                        <Col lg={2} md={3} className="text-center">
                                                            <FontAwesomeIcon icon={faEllipsisV} className="text-muted" size="sm" />
                                                        </Col>
                                                    </Row>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <Card className="border-0 bg-light text-center py-4">
                                            <Card.Body>
                                                <div className="mb-3">
                                                    <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px' }}>
                                                        <FontAwesomeIcon icon={faFileInvoice} size="lg" className="text-primary" />
                                                    </div>
                                                </div>
                                                <h6 className="text-muted mb-1" style={{ fontSize: '14px' }}>No Transactions to Show</h6>
                                                <p className="text-muted mb-0" style={{ fontSize: '12px' }}>You haven't added any transactions yet</p>
                                            </Card.Body>
                                        </Card>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-100 d-flex align-items-center justify-content-center bg-light">
                                <Card className="border-0 bg-white text-center shadow-sm">
                                    <Card.Body className="p-4">
                                        <FontAwesomeIcon icon={faUser} size="2x" className="text-muted mb-3" />
                                        <h6 className="text-muted" style={{ fontSize: '14px' }}>Select a party to view details</h6>
                                        <p className="text-muted mb-0" style={{ fontSize: '12px' }}>Choose a party from the list to see their information and transactions</p>
                                    </Card.Body>
                                </Card>
                            </div>
                        )}
                    </Col>
                </Row>
            </Container>

            {/* Add Party Modal */}
            <AddNewParty
                show={showAddModal}
                onHide={handleCloseModal}
                editingParty={editingParty}
                onSaveParty={handleSaveParty}
                isQuickAdd={false}
            />
        </div>
    );
}

export default Parties;