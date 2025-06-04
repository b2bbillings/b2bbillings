import React, { useState, useEffect, useRef } from 'react';
import { Form, ListGroup, Card, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faPhone, faUserPlus, faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
// Correct import path for AddNewParty
import AddNewParty from '../../../Party/AddNewParty';

function CustomerSection({ customer, mobileNumber, onCustomerChange, onMobileChange }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
    const inputRef = useRef(null);

    // Sample customers data
    const [customers, setCustomers] = useState([
        { id: 1, name: 'John Doe', phone: '9876543210', email: 'john@example.com', address: 'Mumbai' },
        { id: 2, name: 'Jane Smith', phone: '9876543211', email: 'jane@example.com', address: 'Delhi' },
        { id: 3, name: 'Mike Johnson', phone: '9876543212', email: 'mike@example.com', address: 'Pune' },
    ]);

    // Keyboard shortcut handler
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                setShowAddCustomerModal(true);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Filter customers based on search
    useEffect(() => {
        if (searchQuery.trim() && !customer) {
            const filtered = customers.filter(cust =>
                cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                cust.phone.includes(searchQuery)
            ).slice(0, 5);

            setFilteredCustomers(filtered);
            setShowSuggestions(true);
        } else {
            setFilteredCustomers([]);
            setShowSuggestions(false);
        }
    }, [searchQuery, customer, customers]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);

        if (customer && value !== customer.name) {
            onCustomerChange(null);
            onMobileChange('');
        }
    };

    const handleCustomerSelect = (selectedCustomer) => {
        setSearchQuery(selectedCustomer.name);
        onCustomerChange(selectedCustomer);
        onMobileChange(selectedCustomer.phone);
        setShowSuggestions(false);
    };

    const handleRemoveCustomer = () => {
        setSearchQuery('');
        onCustomerChange(null);
        onMobileChange('');
    };

    const handleAddNewCustomer = () => {
        // Close suggestions when opening modal to prevent overlap
        setShowSuggestions(false);
        setShowAddCustomerModal(true);
    };

    const handleSaveNewCustomer = (newCustomer, isQuickAdd = false, isEdit = false) => {
        console.log('💾 Saving new customer:', newCustomer);
        
        // Normalize the customer data to handle different field structures
        const normalizedCustomer = {
            id: newCustomer.id || Date.now(),
            name: newCustomer.name,
            phone: newCustomer.phone || newCustomer.phoneNumber,
            phoneNumber: newCustomer.phoneNumber || newCustomer.phone,
            email: newCustomer.email || '',
            address: newCustomer.address || newCustomer.addressLine || '',
            addressLine: newCustomer.addressLine || newCustomer.address || '',
            partyType: newCustomer.partyType || 'customer',
            isRunningCustomer: newCustomer.isRunningCustomer || false,
            companyName: newCustomer.companyName || '',
            gstNumber: newCustomer.gstNumber || '',
            city: newCustomer.city || '',
            state: newCustomer.state || '',
            pincode: newCustomer.pincode || '',
            taluka: newCustomer.taluka || '',
            district: newCustomer.district || '',
            whatsappNumber: newCustomer.whatsappNumber || newCustomer.phone || newCustomer.phoneNumber,
            phoneNumbers: newCustomer.phoneNumbers || [],
            openingBalance: newCustomer.openingBalance || 0,
            openingBalanceType: newCustomer.openingBalanceType || 'debit',
            createdAt: newCustomer.createdAt || new Date().toISOString()
        };

        // Add to customers list
        setCustomers(prev => [...prev, normalizedCustomer]);
        
        // Select the new customer immediately
        handleCustomerSelect(normalizedCustomer);
        
        // Close modal
        setShowAddCustomerModal(false);
        
        console.log('✅ Customer added and selected successfully');
    };

    const handleCloseModal = () => {
        setShowAddCustomerModal(false);
    };

    // Click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (inputRef.current && !inputRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle keyboard navigation in suggestions
    const handleKeyDown = (e) => {
        if (!showSuggestions) return;

        if (e.key === 'Escape') {
            setShowSuggestions(false);
            e.preventDefault();
        } else if (e.key === 'ArrowDown' && filteredCustomers.length > 0) {
            e.preventDefault();
            // Focus first suggestion or implement arrow navigation
        }
    };

    // Auto-hide suggestions when modal opens
    useEffect(() => {
        if (showAddCustomerModal) {
            setShowSuggestions(false);
        }
    }, [showAddCustomerModal]);

    return (
        <>
            <div className="h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <small className="text-primary fw-semibold">Customer Details</small>
                    <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                        Press <kbd>Alt + C</kbd> to add new
                    </small>
                </div>

                {/* Customer Search */}
                <div className="position-relative mb-3" ref={inputRef}>
                    <Form.Label className="text-muted small mb-1">Search Customer</Form.Label>
                    <div className="input-group input-group-sm">
                        <span className="input-group-text">
                            <FontAwesomeIcon icon={faSearch} size="sm" />
                        </span>
                        <Form.Control
                            type="text"
                            placeholder="Search by name or phone"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onKeyDown={handleKeyDown}
                            className="customer-search-input"
                            size="sm"
                            autoComplete="off"
                        />
                        {customer && (
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={handleRemoveCustomer}
                                className="border-0"
                            >
                                <FontAwesomeIcon icon={faTimes} size="sm" />
                            </Button>
                        )}
                    </div>

                    {/* Customer Suggestions - Fixed z-index */}
                    {showSuggestions && !showAddCustomerModal && (
                        <div 
                            className="position-absolute w-100 mt-1" 
                            style={{ zIndex: 1050 }}  // Lower than modal backdrop (1055)
                        >
                            <Card className="border shadow-lg">
                                <Card.Body className="p-0">
                                    {filteredCustomers.length > 0 ? (
                                        <ListGroup variant="flush" className="small">
                                            {filteredCustomers.map((cust) => (
                                                <ListGroup.Item
                                                    key={cust.id}
                                                    action
                                                    onClick={() => handleCustomerSelect(cust)}
                                                    className="cursor-pointer py-2"
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <div className="d-flex align-items-center">
                                                        <FontAwesomeIcon
                                                            icon={faUser}
                                                            className="text-primary me-2"
                                                            size="sm"
                                                        />
                                                        <div className="flex-grow-1">
                                                            <div className="fw-semibold small">{cust.name}</div>
                                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                                {cust.phone}
                                                                {cust.address && ` • ${cust.address}`}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </ListGroup.Item>
                                            ))}
                                            <ListGroup.Item className="text-center py-2 bg-light">
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    onClick={handleAddNewCustomer}
                                                    className="text-decoration-none"
                                                >
                                                    <FontAwesomeIcon icon={faUserPlus} className="me-1" size="sm" />
                                                    Add New Party
                                                </Button>
                                            </ListGroup.Item>
                                        </ListGroup>
                                    ) : searchQuery.trim() && (
                                        <div className="p-3 text-center">
                                            <div className="mb-2 text-muted small">
                                                No customer found for "<strong>{searchQuery}</strong>"
                                            </div>
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={handleAddNewCustomer}
                                                className="btn-sm"
                                            >
                                                <FontAwesomeIcon icon={faUserPlus} className="me-1" size="sm" />
                                                Add New Party
                                            </Button>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </div>
                    )}
                </div>

                {/* Selected Customer Display - Compact */}
                {customer && (
                    <div className="mb-3">
                        <div className="bg-success text-white p-2 rounded small d-flex align-items-center justify-content-between">
                            <div>
                                <FontAwesomeIcon icon={faUser} className="me-1" size="sm" />
                                <strong>{customer.name}</strong> • {customer.phone}
                                {customer.isRunningCustomer && (
                                    <span className="ms-2 badge bg-warning text-dark">Quick</span>
                                )}
                            </div>
                            <Button
                                variant="link"
                                size="sm"
                                onClick={handleRemoveCustomer}
                                className="text-white p-0 border-0"
                            >
                                <FontAwesomeIcon icon={faTimes} size="sm" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Mobile Number - Compact */}
                <div>
                    <Form.Label className="text-muted small mb-1">Mobile Number</Form.Label>
                    <div className="input-group input-group-sm">
                        <span className="input-group-text">
                            <FontAwesomeIcon icon={faPhone} size="sm" />
                        </span>
                        <Form.Control
                            type="tel"
                            placeholder="Enter mobile number"
                            value={mobileNumber}
                            onChange={(e) => onMobileChange(e.target.value)}
                            maxLength="10"
                            pattern="[0-9]{10}"
                            size="sm"
                        />
                    </div>
                    {mobileNumber && mobileNumber.length !== 10 && (
                        <small className="text-warning">Mobile number should be 10 digits</small>
                    )}
                </div>
            </div>

            {/* Use the actual AddNewParty component with FULL FORM */}
            <AddNewParty
                show={showAddCustomerModal}
                onHide={handleCloseModal}
                onSaveParty={handleSaveNewCustomer}
                isQuickAdd={false}              // Changed to false for full form
                quickAddType="customer"         // Still specify customer type
                editingParty={null}             // Not editing, adding new
                initialData={{                  // Pre-fill with search query
                    name: searchQuery || '',
                    partyType: 'customer'
                }}
            />
        </>
    );
}

export default CustomerSection;