import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Form, ListGroup, Card, Button, Spinner, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUser,
    faPhone,
    faUserPlus,
    faSearch,
    faTimes,
    faEnvelope,
    faMapMarkerAlt,
    faBuilding,
    faIdCard,
    faExclamationTriangle,
    faTruck
} from '@fortawesome/free-solid-svg-icons';
import AddNewParty from '../../../Party/AddNewParty';
import partyService from '../../../../../services/partyService';

function CustomerSection({
    customer,
    onCustomerChange,
    companyId,
    isSupplierMode = false,
    mobileNumber,
    onMobileChange
}) {
    // Determine entity type based on mode
    const entityType = isSupplierMode ? 'supplier' : 'customer';
    const EntityTypeCapitalized = isSupplierMode ? 'Supplier' : 'Customer';
    const entityIcon = isSupplierMode ? faTruck : faUser;

    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const inputRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const isUserTyping = useRef(false);

    // Initialize search query with customer name or mobile number
    useEffect(() => {
        if (customer) {
            setSearchQuery(customer.name || '');
        } else if (mobileNumber) {
            setSearchQuery(mobileNumber);
        }
    }, [customer, mobileNumber]);

    // Search entities function
    const searchEntities = useCallback(async (query) => {
        if (!query.trim() || query.length < 2) {
            setFilteredCustomers([]);
            setShowSuggestions(false);
            setHasSearched(false);
            return;
        }

        // Validate companyId
        if (!companyId) {
            console.warn('⚠️ No companyId provided for search - skipping search');
            setError(`Company ID is required for ${entityType} search. Please ensure you're in a valid company context.`);
            setFilteredCustomers([]);
            setShowSuggestions(false);
            setHasSearched(false);
            return;
        }

        console.log(`🔍 Starting ${entityType} search for:`, query, 'with companyId:', companyId);
        setSearchLoading(true);
        setError(null);

        try {
            const response = await partyService.searchParties(query, entityType, 8, companyId);
            console.log(`🔍 ${EntityTypeCapitalized} search response:`, response);

            if (response && response.success && response.data && Array.isArray(response.data)) {
                // Transform the response data to match our expected format
                const entities = response.data.map(party => {
                    console.log(`🔄 Transforming ${entityType}:`, party);
                    return {
                        id: party._id || party.id,
                        _id: party._id || party.id,
                        name: party.name || '',
                        mobile: party.phoneNumber || party.mobile || '',
                        email: party.email || '',
                        companyName: party.companyName || '',
                        gstNumber: party.gstNumber || '',
                        partyType: party.partyType || entityType,
                        currentBalance: party.currentBalance || 0,
                        creditLimit: party.creditLimit || 0,
                        address: {
                            street: party.homeAddressLine || '',
                            city: party.homeDistrict || '',
                            state: party.homeState || '',
                            pincode: party.homePincode || '',
                            country: party.country || 'India'
                        }
                    };
                });

                console.log(`✅ Transformed ${entityType}s:`, entities);
                setFilteredCustomers(entities);
                setShowSuggestions(true);
                setHasSearched(true);

                // Maintain focus after search results appear
                setTimeout(() => {
                    if (inputRef.current && isUserTyping.current && !customer) {
                        inputRef.current.focus();
                    }
                }, 50);

            } else {
                console.log(`❌ No ${entityType} data in response or response not successful`);
                setFilteredCustomers([]);
                setShowSuggestions(searchQuery.trim().length >= 2);
                setHasSearched(true);
            }
        } catch (err) {
            console.error(`❌ Error searching ${entityType}s:`, err);
            setError(err.message || `Failed to search ${entityType}s`);
            setFilteredCustomers([]);
            setShowSuggestions(false);
            setHasSearched(false);
        } finally {
            setSearchLoading(false);
        }
    }, [customer, searchQuery, companyId, entityType, EntityTypeCapitalized]);

    // CompanyId validation effect
    useEffect(() => {
        if (!companyId) {
            console.warn('⚠️ CustomerSection: No companyId provided');

            // Don't show error immediately, wait for companyId to load
            const timer = setTimeout(() => {
                if (!companyId) {
                    setError(`Please select a company first to search ${entityType}s`);
                    setFilteredCustomers([]);
                    setShowSuggestions(false);
                    setHasSearched(false);
                }
            }, 1000);

            return () => clearTimeout(timer);
        } else {
            // Clear error when companyId is provided
            setError(null);
            console.log('✅ CustomerSection: companyId provided:', companyId);
        }
    }, [companyId, entityType]);

    // Debounced search trigger
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchQuery.trim().length >= 2 && !customer && isUserTyping.current) {
            searchTimeoutRef.current = setTimeout(() => {
                searchEntities(searchQuery);
            }, 300);
        } else {
            setFilteredCustomers([]);
            setShowSuggestions(false);
            setHasSearched(false);
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, customer, searchEntities]);

    // Handle new customer save
    const handleSaveNewCustomer = async (newEntityData) => {
        try {
            console.log(`💾 Creating new ${entityType}:`, newEntityData);

            if (!companyId) {
                throw new Error('Company ID is required to create a new party');
            }

            // Transform data to match backend schema
            const partyData = {
                name: newEntityData.name.trim(),
                phoneNumber: newEntityData.phoneNumber || newEntityData.mobile,
                email: newEntityData.email || '',
                partyType: entityType,
                companyId: companyId,
                companyName: newEntityData.companyName || '',
                gstNumber: newEntityData.gstNumber || '',
                gstType: newEntityData.gstType || 'unregistered',
                creditLimit: parseFloat(newEntityData.creditLimit) || 0,
                openingBalance: parseFloat(newEntityData.openingBalance) || 0,
                homeAddressLine: newEntityData.homeAddressLine || newEntityData.addressLine || '',
                homeState: newEntityData.homeState || newEntityData.state || '',
                homeDistrict: newEntityData.homeDistrict || newEntityData.city || '',
                homePincode: newEntityData.homePincode || newEntityData.pincode || '',
                country: newEntityData.country || 'INDIA'
            };

            const response = await partyService.createParty(partyData);

            if (response.success && response.data) {
                const createdEntity = response.data;

                // Transform response to match our expected format
                const normalizedEntity = {
                    id: createdEntity._id,
                    _id: createdEntity._id,
                    name: createdEntity.name,
                    mobile: createdEntity.phoneNumber,
                    email: createdEntity.email || '',
                    companyName: createdEntity.companyName || '',
                    gstNumber: createdEntity.gstNumber || '',
                    partyType: createdEntity.partyType,
                    currentBalance: createdEntity.currentBalance || 0,
                    creditLimit: createdEntity.creditLimit || 0,
                    address: {
                        street: createdEntity.homeAddressLine || '',
                        city: createdEntity.homeDistrict || '',
                        state: createdEntity.homeState || '',
                        pincode: createdEntity.homePincode || '',
                        country: createdEntity.country || 'India'
                    }
                };

                // Select the new entity immediately
                handleCustomerSelect(normalizedEntity);
                setShowAddCustomerModal(false);

                console.log(`✅ ${EntityTypeCapitalized} created and selected successfully`);
            } else {
                throw new Error(`Failed to create ${entityType}`);
            }
        } catch (error) {
            console.error(`❌ Error creating ${entityType}:`, error);
            setError(error.message || `Failed to create ${entityType}`);
        }
    };

    // Handle search input change
    const handleSearchChange = (e) => {
        const value = e.target.value;
        console.log(`📝 ${EntityTypeCapitalized} search input changed:`, value);

        setSearchQuery(value);
        setError(null);
        isUserTyping.current = true;

        // Handle mobile number change if in mobile mode
        if (onMobileChange && !customer) {
            onMobileChange(value);
        }

        if (customer && value !== customer.name) {
            onCustomerChange(null);
        }
    };

    // Handle customer selection
    const handleCustomerSelect = (selectedEntity) => {
        console.log(`🎯 Selecting ${entityType}:`, selectedEntity);

        isUserTyping.current = false;
        setSearchQuery(selectedEntity.name);
        onCustomerChange(selectedEntity);

        // Update mobile number if handler provided
        if (onMobileChange) {
            onMobileChange(selectedEntity.mobile || '');
        }

        setShowSuggestions(false);
        setFilteredCustomers([]);
        setHasSearched(false);
        setError(null);
    };

    // Handle customer removal
    const handleRemoveCustomer = () => {
        console.log(`🗑️ Removing ${entityType}`);

        setSearchQuery('');
        onCustomerChange(null);

        if (onMobileChange) {
            onMobileChange('');
        }

        setShowSuggestions(false);
        setFilteredCustomers([]);
        setHasSearched(false);
        setError(null);
        isUserTyping.current = false;

        // Focus input after removal
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }, 50);
    };

    // Handle add new customer
    const handleAddNewCustomer = () => {
        console.log(`➕ Opening add ${entityType} modal`);

        isUserTyping.current = false;
        setShowSuggestions(false);
        setShowAddCustomerModal(true);
    };

    // Handle modal close
    const handleCloseModal = () => {
        setShowAddCustomerModal(false);
        // Restore focus to input when modal closes
        setTimeout(() => {
            if (inputRef.current && !customer) {
                inputRef.current.focus();
            }
        }, 100);
    };

    // Handle input focus
    const handleInputFocus = () => {
        console.log(`🎯 ${EntityTypeCapitalized} input focused`);
        isUserTyping.current = true;

        if (searchQuery.trim().length >= 2 && !customer && filteredCustomers.length > 0) {
            setShowSuggestions(true);
        }
    };

    // Handle input blur
    const handleInputBlur = (e) => {
        const relatedTarget = e.relatedTarget;
        const isClickingOnSuggestions = relatedTarget && relatedTarget.closest('.suggestions-container');

        if (!isClickingOnSuggestions) {
            setTimeout(() => {
                setShowSuggestions(false);
                isUserTyping.current = false;
            }, 150);
        }
    };

    // Handle keyboard events
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setShowSuggestions(false);
            e.preventDefault();
        }
    };

    // Click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (e) => {
            const searchContainer = e.target.closest('.position-relative');
            const suggestionsContainer = e.target.closest('.suggestions-container');

            if (!searchContainer && !suggestionsContainer) {
                setShowSuggestions(false);
                isUserTyping.current = false;
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-hide suggestions when modal opens
    useEffect(() => {
        if (showAddCustomerModal) {
            setShowSuggestions(false);
            isUserTyping.current = false;
        }
    }, [showAddCustomerModal]);

    // ✅ FIXED: Define styles as regular CSS classes or inline styles
    const componentStyles = {
        maxHeight200: {
            maxHeight: '200px'
        },
        customerSearchInput: {
            borderColor: '#0d6efd',
            boxShadow: '0 0 0 0.2rem rgba(13, 110, 253, 0.25)'
        },
        suggestionsCard: {
            border: '1px solid #dee2e6',
            boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)'
        },
        cursorPointer: {
            cursor: 'pointer'
        }
    };

    return (
        <>
            <div className="h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <small className="text-primary fw-semibold">
                        <FontAwesomeIcon icon={entityIcon} className="me-1" />
                        {EntityTypeCapitalized} Details
                    </small>
                    <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                        Search & Select
                    </small>
                </div>

                {/* Error Alert */}
                {error && (
                    <Alert variant="warning" className="py-2 mb-3" dismissible onClose={() => setError(null)}>
                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                        <small>{error}</small>
                    </Alert>
                )}

                {/* Entity Search */}
                <div className="position-relative mb-3">
                    <Form.Label className="text-muted small mb-1">
                        {isSupplierMode ? 'Search Supplier' : 'Search Customer'}
                    </Form.Label>
                    <div className="input-group input-group-sm">
                        <span className="input-group-text">
                            {searchLoading ? (
                                <Spinner size="sm" />
                            ) : (
                                <FontAwesomeIcon icon={faSearch} size="sm" />
                            )}
                        </span>
                        <Form.Control
                            ref={inputRef}
                            type="text"
                            placeholder={`Search by name, phone or company`}
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onKeyDown={handleKeyDown}
                            onFocus={handleInputFocus}
                            onBlur={handleInputBlur}
                            className="customer-search-input"
                            size="sm"
                            autoComplete="off"
                            disabled={searchLoading}
                        />
                        {customer && (
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={handleRemoveCustomer}
                                className="border-0"
                                type="button"
                            >
                                <FontAwesomeIcon icon={faTimes} size="sm" />
                            </Button>
                        )}
                    </div>

                    {/* Entity Suggestions */}
                    {showSuggestions && !showAddCustomerModal && (
                        <div
                            className="suggestions-container position-absolute w-100 mt-1"
                            style={{ zIndex: 1050 }}
                        >
                            <Card className="border shadow-lg" style={componentStyles.suggestionsCard}>
                                <Card.Body className="p-0">
                                    {searchLoading ? (
                                        <div className="p-3 text-center">
                                            <Spinner size="sm" className="me-2" />
                                            <small>Searching {entityType}s...</small>
                                        </div>
                                    ) : filteredCustomers.length > 0 ? (
                                        <>
                                            <div className="px-3 py-2 bg-light border-bottom">
                                                <small className="text-muted fw-semibold">
                                                    Found {filteredCustomers.length} {entityType}{filteredCustomers.length !== 1 ? 's' : ''}
                                                </small>
                                            </div>
                                            <div style={componentStyles.maxHeight200} className="overflow-auto">
                                                <ListGroup variant="flush" className="small">
                                                    {filteredCustomers.map((entity) => (
                                                        <ListGroup.Item
                                                            key={entity.id}
                                                            action
                                                            onClick={() => handleCustomerSelect(entity)}
                                                            className="py-2"
                                                            style={componentStyles.cursorPointer}
                                                        >
                                                            <div className="d-flex align-items-center">
                                                                <FontAwesomeIcon
                                                                    icon={entityIcon}
                                                                    className="text-primary me-2"
                                                                    size="sm"
                                                                />
                                                                <div className="flex-grow-1">
                                                                    <div className="fw-semibold small">{entity.name}</div>
                                                                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                                        <FontAwesomeIcon icon={faPhone} className="me-1" />
                                                                        {entity.mobile || 'No phone'}
                                                                        {entity.companyName && (
                                                                            <>
                                                                                <span className="mx-1">•</span>
                                                                                <FontAwesomeIcon icon={faBuilding} className="me-1" />
                                                                                {entity.companyName}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </ListGroup.Item>
                                                    ))}
                                                </ListGroup>
                                            </div>
                                            <ListGroup.Item className="text-center py-2 bg-light border-0">
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    onClick={handleAddNewCustomer}
                                                    className="text-decoration-none"
                                                >
                                                    <FontAwesomeIcon icon={faUserPlus} className="me-1" size="sm" />
                                                    Add New {EntityTypeCapitalized}
                                                </Button>
                                            </ListGroup.Item>
                                        </>
                                    ) : hasSearched && searchQuery.trim() ? (
                                        <div className="p-3 text-center">
                                            <div className="mb-2 text-muted small">
                                                No {entityType} found for "<strong>{searchQuery}</strong>"
                                            </div>
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={handleAddNewCustomer}
                                                className="btn-sm"
                                            >
                                                <FontAwesomeIcon icon={faUserPlus} className="me-1" size="sm" />
                                                Add New {EntityTypeCapitalized}
                                            </Button>
                                        </div>
                                    ) : null}
                                </Card.Body>
                            </Card>
                        </div>
                    )}
                </div>

                {/* Selected Entity Details - Simplified */}
                {customer && (
                    <div className="mb-3">
                        <Card className={`border-${isSupplierMode ? 'warning' : 'success'} bg-light`}>
                            <Card.Body className="p-3">
                                <div className="d-flex justify-content-between align-items-start">
                                    <div className="flex-grow-1">
                                        <div className="d-flex align-items-center mb-2">
                                            <FontAwesomeIcon icon={entityIcon} className="text-primary me-2" />
                                            <div className="fw-bold text-primary">{customer.name}</div>
                                        </div>

                                        <div className="small text-muted">
                                            {customer.mobile && (
                                                <div>
                                                    <FontAwesomeIcon icon={faPhone} className="me-1" />
                                                    {customer.mobile}
                                                </div>
                                            )}
                                            {customer.email && (
                                                <div>
                                                    <FontAwesomeIcon icon={faEnvelope} className="me-1" />
                                                    {customer.email}
                                                </div>
                                            )}
                                            {customer.companyName && (
                                                <div>
                                                    <FontAwesomeIcon icon={faBuilding} className="me-1" />
                                                    {customer.companyName}
                                                </div>
                                            )}
                                            {customer.gstNumber && (
                                                <div>
                                                    <FontAwesomeIcon icon={faIdCard} className="me-1" />
                                                    {customer.gstNumber}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={handleRemoveCustomer}
                                        className="border-0"
                                        title={`Remove ${entityType}`}
                                    >
                                        <FontAwesomeIcon icon={faTimes} size="sm" />
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </div>
                )}
            </div>

            {/* Add New Entity Modal */}
            <AddNewParty
                show={showAddCustomerModal}
                onHide={handleCloseModal}
                onSaveParty={handleSaveNewCustomer}
                isQuickAdd={false}
                quickAddType={entityType}
                editingParty={null}
                initialData={{
                    name: searchQuery || '',
                    partyType: entityType
                }}
            />
        </>
    );
}

export default CustomerSection;