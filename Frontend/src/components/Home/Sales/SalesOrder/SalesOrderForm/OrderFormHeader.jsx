import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Form, Spinner, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faUser, faSpinner, faRefresh } from '@fortawesome/free-solid-svg-icons';
import partyService from '../../../../../services/partyService';
import saleOrderService from '../../../../../services/saleOrderService';
import authService from '../../../../../services/authService';
import AddNewParty from '../../../Party/AddNewParty';

function OrderFormHeader({
    formData,
    onFormDataChange,
    companyId,
    currentUser: propCurrentUser,
    currentCompany,
    addToast,
    errors = {},
    disabled = false
}) {
    const [currentUser, setCurrentUser] = useState(propCurrentUser || null);
    const [isLoadingUser, setIsLoadingUser] = useState(false);
    const [userError, setUserError] = useState(null);

    // States for data loading
    const [parties, setParties] = useState([]);
    const [isLoadingParties, setIsLoadingParties] = useState(false);
    const [partySearchTerm, setPartySearchTerm] = useState('');
    const [showPartySuggestions, setShowPartySuggestions] = useState(false);
    const [isGeneratingOrderNumber, setIsGeneratingOrderNumber] = useState(false);
    const [selectedPartySuggestionIndex, setSelectedPartySuggestionIndex] = useState(-1);

    // Modal states for adding new party
    const [showAddPartyModal, setShowAddPartyModal] = useState(false);
    const [quickAddPartyData, setQuickAddPartyData] = useState(null);

    // Refs for keyboard navigation
    const partyInputRef = useRef(null);
    const isSelectingPartyRef = useRef(false);
    const searchTimeoutRef = useRef(null);

    // ✅ UPDATED: Field refs for keyboard navigation
    const fieldRefs = useRef({
        gstType: null,
        deliveryDate: null,
        partyName: null,
        quotationDate: null
    });

    const fetchCurrentUser = async () => {
        try {
            setIsLoadingUser(true);
            setUserError(null);

            const userResult = await authService.getCurrentUserSafe();

            if (userResult.success && userResult.user) {
                setCurrentUser(userResult.user);
                return userResult.user;
            }

            const storedUser = authService.getCurrentUser();
            if (storedUser) {
                setCurrentUser(storedUser);
                return storedUser;
            }

            const refreshResult = await authService.refreshCurrentUser();
            if (refreshResult.success && refreshResult.user) {
                setCurrentUser(refreshResult.user);
                return refreshResult.user;
            }

            setUserError('Unable to fetch user information');
            addToast?.('Unable to fetch user information. Some features may be limited.', 'warning');
            return null;

        } catch (error) {
            setUserError(error.message || 'Failed to fetch user information');
            addToast?.('Failed to fetch user information', 'error');
            return null;
        } finally {
            setIsLoadingUser(false);
        }
    };

    const autoFillUserData = (user) => {
        if (user && !formData.employeeName) {
            const employeeInfo = authService.getUserEmployeeInfo();

            if (employeeInfo) {
                onFormDataChange('employeeName', employeeInfo.name);
                onFormDataChange('employeeId', employeeInfo.employeeId);
            } else {
                const employeeName = user.name || user.username || user.displayName || '';
                const employeeId = user.employeeId || user.id || user._id || '';

                if (employeeName) {
                    onFormDataChange('employeeName', employeeName);
                }
                if (employeeId) {
                    onFormDataChange('employeeId', employeeId);
                }
            }
        }
    };

    // ✅ UPDATED: Show only employee name without ID
    const getUserDisplayInfo = () => {
        const user = currentUser || propCurrentUser;

        if (isLoadingUser) {
            return {
                displayText: 'Loading user...',
                isLoading: true,
                hasUser: false
            };
        }

        if (userError) {
            return {
                displayText: 'User unavailable',
                isLoading: false,
                hasUser: false,
                error: userError
            };
        }

        if (formData.employeeName) {
            return {
                displayText: formData.employeeName, // ✅ Only show name
                isLoading: false,
                hasUser: true,
                user: user
            };
        }

        if (user?.name) {
            return {
                displayText: user.name, // ✅ Only show name
                isLoading: false,
                hasUser: true,
                user: user
            };
        }

        return {
            displayText: 'User information unavailable',
            isLoading: false,
            hasUser: false
        };
    };

    const retryUserFetch = async () => {
        const user = await fetchCurrentUser();
        if (user) {
            autoFillUserData(user);
        }
    };

    const loadParties = async (searchTerm = '') => {
        if (!companyId) return;

        try {
            setIsLoadingParties(true);

            const response = await partyService.getParties(companyId, {
                search: searchTerm,
                limit: searchTerm ? 20 : 100,
                type: 'customer',
                page: 1,
                sortBy: 'name',
                sortOrder: 'asc'
            });

            if (response.success) {
                const customerList = response.data?.parties || response.data || [];
                const formattedParties = customerList.map(customer => ({
                    id: customer._id || customer.id,
                    name: customer.name || customer.partyName || 'Unknown Customer',
                    phone: customer.phoneNumber || customer.phone || customer.mobile || customer.contactNumber || '',
                    email: customer.email || '',
                    address: customer.homeAddressLine || customer.address || '',
                    gstNumber: customer.gstNumber || '',
                    balance: customer.currentBalance || customer.balance || customer.openingBalance || 0,
                    type: customer.partyType || 'customer',
                    companyName: customer.companyName || '',
                    creditLimit: customer.creditLimit || 0
                }));

                setParties(formattedParties);

                if (searchTerm && !isSelectingPartyRef.current) {
                    setShowPartySuggestions(true);
                }
            } else {
                setParties([]);
                addToast?.('Failed to load customers: ' + (response.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            setParties([]);

            let errorMessage = 'Failed to load customers';
            if (error.code === 'NETWORK_ERROR') {
                errorMessage = 'Network error. Please check your connection.';
            } else if (error.status === 401) {
                errorMessage = 'Authentication expired. Please login again.';
            } else if (error.message) {
                errorMessage = `Failed to load customers: ${error.message}`;
            }

            addToast?.(errorMessage, 'error');
        } finally {
            setIsLoadingParties(false);
        }
    };

    const searchPartiesAlternative = async (searchTerm) => {
        if (!companyId || !searchTerm || searchTerm.length < 2) return;

        try {
            const response = await partyService.searchParties(searchTerm, 'customer', 20);

            if (response.success) {
                const customerList = response.data || [];
                const formattedParties = customerList.map(customer => ({
                    id: customer._id || customer.id,
                    name: customer.name || customer.partyName || 'Unknown Customer',
                    phone: customer.phoneNumber || customer.phone || customer.mobile || customer.contactNumber || '',
                    email: customer.email || '',
                    address: customer.homeAddressLine || customer.address || '',
                    gstNumber: customer.gstNumber || '',
                    balance: customer.currentBalance || customer.balance || customer.openingBalance || 0,
                    type: customer.partyType || 'customer',
                    companyName: customer.companyName || '',
                    creditLimit: customer.creditLimit || 0
                }));

                setParties(formattedParties);

                if (!isSelectingPartyRef.current) {
                    setShowPartySuggestions(true);
                }
            }
        } catch (error) {
            await loadParties(searchTerm);
        }
    };

    const generateOrderNumber = async () => {
        if (!companyId) return;

        try {
            setIsGeneratingOrderNumber(true);

            const response = await saleOrderService.generateOrderNumber(
                companyId,
                'quotation'
            );

            if (response.success && response.data?.nextOrderNumber) {
                onFormDataChange('quotationNumber', response.data.nextOrderNumber);
                addToast?.('Order number generated successfully', 'success');
            } else {
                const now = new Date();
                const year = now.getFullYear().toString().slice(-2);
                const month = (now.getMonth() + 1).toString().padStart(2, '0');
                const day = now.getDate().toString().padStart(2, '0');
                const hours = now.getHours().toString().padStart(2, '0');
                const minutes = now.getMinutes().toString().padStart(2, '0');
                const seconds = now.getSeconds().toString().padStart(2, '0');

                const fallbackNumber = `QUO-${year}${month}${day}-${hours}${minutes}${seconds}`;
                onFormDataChange('quotationNumber', fallbackNumber);
                addToast?.('Generated fallback quotation number', 'info');
            }
        } catch (error) {
            const timestamp = Date.now().toString();
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const emergencyNumber = `QUO-${timestamp.slice(-8)}-${randomNum}`;

            onFormDataChange('quotationNumber', emergencyNumber);
            addToast?.('Generated emergency quotation number', 'warning');
        } finally {
            setIsGeneratingOrderNumber(false);
        }
    };

    // ✅ UPDATED: Keyboard navigation helper with new field order
    const focusNextField = (currentField) => {
        const fieldOrder = ['gstType', 'deliveryDate', 'partyName', 'quotationDate'];
        const currentIndex = fieldOrder.indexOf(currentField);

        if (currentIndex < fieldOrder.length - 1) {
            const nextField = fieldOrder[currentIndex + 1];
            const nextFieldRef = fieldRefs.current[nextField];
            if (nextFieldRef) {
                nextFieldRef.focus();
                if (nextFieldRef.select) nextFieldRef.select();
            }
        } else {
            // Move to first product input
            const firstProductInput = document.querySelector('[data-product-input="0"]');
            if (firstProductInput) {
                firstProductInput.focus();
            }
        }
    };

    // ✅ Enhanced keyboard handler
    const handleFieldKeyDown = (e, fieldName) => {
        if (e.key === 'Enter') {
            e.preventDefault();

            if (fieldName === 'partyName') {
                if (showPartySuggestions && selectedPartySuggestionIndex >= 0) {
                    const filteredParties = parties.filter(party =>
                        party.name.toLowerCase().includes(partySearchTerm.toLowerCase()) ||
                        party.phone.includes(partySearchTerm)
                    );

                    if (selectedPartySuggestionIndex < filteredParties.length) {
                        handlePartySelect(filteredParties[selectedPartySuggestionIndex]);
                        return;
                    } else if (selectedPartySuggestionIndex === filteredParties.length) {
                        // Add new party option
                        handleAddNewParty();
                        return;
                    }
                }
            }

            focusNextField(fieldName);
        }
    };

    // ✅ Enhanced party search keyboard handler
    const handlePartySearchKeyDown = (e) => {
        if (!showPartySuggestions) {
            handleFieldKeyDown(e, 'partyName');
            return;
        }

        const filteredParties = parties.filter(party =>
            party.name.toLowerCase().includes(partySearchTerm.toLowerCase()) ||
            party.phone.includes(partySearchTerm)
        );

        const hasAddNewOption = filteredParties.length === 0 || partySearchTerm.length >= 2;
        const totalOptions = filteredParties.length + (hasAddNewOption ? 1 : 0);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedPartySuggestionIndex(prev =>
                    Math.min(prev + 1, totalOptions - 1)
                );
                break;

            case 'ArrowUp':
                e.preventDefault();
                setSelectedPartySuggestionIndex(prev =>
                    Math.max(prev - 1, -1)
                );
                break;

            case 'Enter':
                e.preventDefault();
                if (selectedPartySuggestionIndex === -1) {
                    focusNextField('partyName');
                } else if (selectedPartySuggestionIndex < filteredParties.length) {
                    handlePartySelect(filteredParties[selectedPartySuggestionIndex]);
                } else if (hasAddNewOption && selectedPartySuggestionIndex === filteredParties.length) {
                    handleAddNewParty();
                }
                break;

            case 'Escape':
                e.preventDefault();
                setShowPartySuggestions(false);
                setSelectedPartySuggestionIndex(-1);
                break;

            case 'Tab':
                setShowPartySuggestions(false);
                setSelectedPartySuggestionIndex(-1);
                // Let natural tab behavior continue
                break;

            default:
                // For other keys, reset selection index
                setSelectedPartySuggestionIndex(-1);
                break;
        }
    };

    const handleAddNewParty = () => {
        isSelectingPartyRef.current = true;
        setQuickAddPartyData({
            name: partySearchTerm || '',
            type: 'customer'
        });
        setShowAddPartyModal(true);
        setShowPartySuggestions(false);
    };

    const handlePartyCreated = (newParty) => {
        const formattedParty = {
            id: newParty._id || newParty.id,
            name: newParty.name || newParty.partyName,
            phone: newParty.phoneNumber || newParty.phone || newParty.mobile || '',
            email: newParty.email || '',
            address: newParty.homeAddressLine || newParty.address || '',
            gstNumber: newParty.gstNumber || '',
            balance: newParty.currentBalance || newParty.balance || 0,
            type: newParty.partyType || 'customer',
            companyName: newParty.companyName || '',
            creditLimit: newParty.creditLimit || 0
        };

        handlePartySelect(formattedParty);
        setParties(prev => [formattedParty, ...prev]);
        setShowAddPartyModal(false);
        setShowPartySuggestions(false);

        addToast?.(`Customer "${formattedParty.name}" created and selected successfully!`, 'success');

        setTimeout(() => {
            isSelectingPartyRef.current = false;
            // Focus on first product after party creation
            const firstProductInput = document.querySelector('[data-product-input="0"]');
            if (firstProductInput) {
                firstProductInput.focus();
            }
        }, 100);
    };

    useEffect(() => {
        if (companyId) {
            loadParties();

            if (propCurrentUser) {
                setCurrentUser(propCurrentUser);
                autoFillUserData(propCurrentUser);
            } else if (!currentUser) {
                fetchCurrentUser().then(user => {
                    if (user) {
                        autoFillUserData(user);
                    }
                });
            } else {
                autoFillUserData(currentUser);
            }

            if (!formData.quotationNumber || formData.quotationNumber.trim() === '') {
                setTimeout(() => {
                    generateOrderNumber();
                }, 500);
            }
        }
    }, [companyId, propCurrentUser]);

    useEffect(() => {
        if (propCurrentUser && propCurrentUser !== currentUser) {
            setCurrentUser(propCurrentUser);
            setUserError(null);
            autoFillUserData(propCurrentUser);
        }
    }, [propCurrentUser]);

    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (partySearchTerm.length >= 2 && !isSelectingPartyRef.current) {
            searchTimeoutRef.current = setTimeout(async () => {
                try {
                    await searchPartiesAlternative(partySearchTerm);
                } catch (error) {
                    await loadParties(partySearchTerm);
                }
            }, 300);
        } else if (partySearchTerm.length === 0) {
            setShowPartySuggestions(false);
            loadParties();
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [partySearchTerm]);

    const handleInputChange = (field, value) => {
        onFormDataChange(field, value);

        if (field === 'gstType') {
            onFormDataChange('_gstTypeChanged', Date.now());
        }
    };

    const handlePartySearchChange = (value) => {
        if (isSelectingPartyRef.current) {
            return;
        }

        setPartySearchTerm(value);
        onFormDataChange('partyName', value);

        if (formData.selectedParty && value !== formData.partyName) {
            onFormDataChange('selectedParty', '');
            onFormDataChange('partyPhone', '');
            onFormDataChange('partyEmail', '');
            onFormDataChange('partyAddress', '');
            onFormDataChange('partyGstNumber', '');
        }
    };

    const handlePartySelect = (party) => {
        isSelectingPartyRef.current = true;

        onFormDataChange('selectedParty', party.id);
        onFormDataChange('partyName', party.name);
        onFormDataChange('partyPhone', party.phone);
        onFormDataChange('partyEmail', party.email);
        onFormDataChange('partyAddress', party.address);
        onFormDataChange('partyGstNumber', party.gstNumber);

        setPartySearchTerm(party.name);
        setShowPartySuggestions(false);
        setSelectedPartySuggestionIndex(-1);

        setTimeout(() => {
            isSelectingPartyRef.current = false;
            // Auto-focus on quotation date after party selection
            const quotationDateRef = fieldRefs.current.quotationDate;
            if (quotationDateRef) {
                quotationDateRef.focus();
            }
        }, 200);
    };

    const clearPartySelection = () => {
        isSelectingPartyRef.current = true;

        onFormDataChange('selectedParty', '');
        onFormDataChange('partyName', '');
        onFormDataChange('partyPhone', '');
        onFormDataChange('partyEmail', '');
        onFormDataChange('partyAddress', '');
        onFormDataChange('partyGstNumber', '');
        setPartySearchTerm('');
        setShowPartySuggestions(false);

        setTimeout(() => {
            isSelectingPartyRef.current = false;
        }, 100);
    };

    const handlePartyInputFocus = () => {
        if (partySearchTerm.length >= 2 && !isSelectingPartyRef.current && !formData.selectedParty) {
            setShowPartySuggestions(true);
        }
    };

    const handlePartyInputBlur = () => {
        if (!isSelectingPartyRef.current) {
            setTimeout(() => {
                if (!isSelectingPartyRef.current) {
                    setShowPartySuggestions(false);
                    setSelectedPartySuggestionIndex(-1);
                }
            }, 150);
        }
    };

    const filteredParties = parties.filter(party =>
        party.name.toLowerCase().includes(partySearchTerm.toLowerCase()) ||
        party.phone.includes(partySearchTerm)
    );

    const userDisplayInfo = getUserDisplayInfo();

    // ✅ STANDARDIZED INPUT STYLES
    const inputStyle = {
        borderColor: '#000',
        fontSize: '13px',
        padding: '10px 14px',
        height: '42px' // ✅ Consistent height for all inputs
    };

    const getInputStyleWithError = (fieldName) => ({
        ...inputStyle,
        borderColor: errors[fieldName] ? '#dc3545' : '#000'
    });

    return (
        <div className="order-form-header">
            {/* ✅ RESTRUCTURED LAYOUT */}
            <Row className="mb-3">
                {/* Left Column */}
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold text-danger" style={{ fontSize: '14px' }}>
                            GST / Non GST *
                        </Form.Label>
                        <Form.Select
                            ref={el => fieldRefs.current.gstType = el}
                            value={formData.gstType || 'gst'}
                            onChange={(e) => handleInputChange('gstType', e.target.value)}
                            onKeyDown={(e) => handleFieldKeyDown(e, 'gstType')}
                            className="border-2"
                            style={{
                                ...getInputStyleWithError('gstType'),
                                backgroundColor: formData.gstType === 'gst' ? '#e8f5e8' : '#fff3e0'
                            }}
                            disabled={disabled}
                            isInvalid={!!errors.gstType}
                        >
                            <option value="gst">GST</option>
                            <option value="non-gst">Non GST</option>
                        </Form.Select>
                        {errors.gstType && (
                            <Form.Control.Feedback type="invalid" style={{ fontSize: '12px' }}>
                                {errors.gstType}
                            </Form.Control.Feedback>
                        )}
                        <Form.Text className="text-info" style={{ fontSize: '12px' }}>
                            {formData.gstType === 'gst' ? '✅ GST will be calculated' : '⚠️ GST will not be applied'}
                        </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold text-danger" style={{ fontSize: '14px' }}>
                            Delivery Date
                        </Form.Label>
                        <Form.Control
                            ref={el => fieldRefs.current.deliveryDate = el}
                            type="date"
                            value={formData.deliveryDate || ''}
                            onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                            onKeyDown={(e) => handleFieldKeyDown(e, 'deliveryDate')}
                            className="border-2"
                            style={{
                                ...getInputStyleWithError('deliveryDate'),
                                cursor: 'pointer'
                            }}
                            disabled={disabled}
                            isInvalid={!!errors.deliveryDate}
                            min={new Date().toISOString().split('T')[0]}
                        />
                        {errors.deliveryDate && (
                            <Form.Control.Feedback type="invalid" style={{ fontSize: '12px' }}>
                                {errors.deliveryDate}
                            </Form.Control.Feedback>
                        )}
                    </Form.Group>

                    {/* ✅ MOVED: Party section below delivery date */}
                    <Form.Group className="position-relative">
                        <Form.Label className="fw-bold text-danger" style={{ fontSize: '14px' }}>
                            Select Party *
                        </Form.Label>

                        <div className="position-relative">
                            <Form.Control
                                ref={el => {
                                    partyInputRef.current = el;
                                    fieldRefs.current.partyName = el;
                                }}
                                type="text"
                                value={partySearchTerm}
                                onChange={(e) => handlePartySearchChange(e.target.value)}
                                onKeyDown={handlePartySearchKeyDown}
                                onFocus={handlePartyInputFocus}
                                onBlur={handlePartyInputBlur}
                                className="border-2"
                                style={getInputStyleWithError('partyName')}
                                placeholder="Search customer..."
                                disabled={disabled || isLoadingParties}
                                isInvalid={!!errors.partyName}
                            />

                            {isLoadingParties && (
                                <div className="position-absolute top-50 end-0 translate-middle-y me-2">
                                    <Spinner size="sm" />
                                </div>
                            )}
                        </div>

                        {/* ✅ COMPACT: Party suggestions dropdown */}
                        {showPartySuggestions && partySearchTerm.length >= 2 && !formData.selectedParty && (
                            <div
                                className="position-absolute w-100 bg-white border border-2 rounded mt-1 shadow-lg"
                                style={{
                                    zIndex: 1000,
                                    maxHeight: '200px', // ✅ Reduced height
                                    overflowY: 'auto',
                                    borderColor: '#000'
                                }}
                            >
                                {filteredParties.length > 0 && (
                                    filteredParties.slice(0, 5).map((party, index) => ( // ✅ Show only 5 parties
                                        <div
                                            key={party.id}
                                            className={`p-2 border-bottom cursor-pointer ${selectedPartySuggestionIndex === index ? 'bg-primary text-white' : ''}`} // ✅ Reduced padding
                                            style={{
                                                fontSize: '12px', // ✅ Smaller font
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s'
                                            }}
                                            onClick={() => handlePartySelect(party)}
                                            onMouseEnter={() => setSelectedPartySuggestionIndex(index)}
                                        >
                                            <div className={`fw-bold ${selectedPartySuggestionIndex === index ? 'text-white' : 'text-primary'}`} style={{ fontSize: '13px' }}>
                                                {party.name}
                                            </div>
                                            <div className={selectedPartySuggestionIndex === index ? 'text-light' : 'text-muted'} style={{ fontSize: '11px' }}>
                                                {party.phone && <span>📞 {party.phone}</span>}
                                            </div>
                                        </div>
                                    ))
                                )}

                                <div
                                    className={`p-2 cursor-pointer bg-light border-top ${selectedPartySuggestionIndex === filteredParties.length ? 'bg-primary text-white' : ''}`} // ✅ Reduced padding
                                    style={{
                                        fontSize: '12px', // ✅ Smaller font
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onClick={handleAddNewParty}
                                    onMouseEnter={() => setSelectedPartySuggestionIndex(filteredParties.length)}
                                >
                                    <div className="text-center">
                                        <FontAwesomeIcon
                                            icon={faUserPlus}
                                            className={`me-1 ${selectedPartySuggestionIndex === filteredParties.length ? 'text-white' : 'text-success'}`}
                                        />
                                        <span className={`fw-bold ${selectedPartySuggestionIndex === filteredParties.length ? 'text-white' : 'text-success'}`} style={{ fontSize: '12px' }}>
                                            Add New Customer
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ✅ COMPACT: Selected party display */}
                        {formData.selectedParty && formData.partyName && (
                            <div className="mt-2 p-2 bg-light border-2 rounded" style={{ borderColor: '#28a745' }}> {/* ✅ Reduced padding and margin */}
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div className="fw-bold text-success" style={{ fontSize: '13px' }}>✅ {formData.partyName}</div> {/* ✅ Smaller text */}
                                        {formData.partyPhone && (
                                            <div className="text-muted" style={{ fontSize: '11px' }}>📞 {formData.partyPhone}</div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={clearPartySelection}
                                        disabled={disabled}
                                        title="Clear selection"
                                        style={{ fontSize: '11px', padding: '4px 8px' }} // ✅ Smaller button
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        )}

                        {errors.partyName && (
                            <div className="invalid-feedback d-block" style={{ fontSize: '12px' }}>
                                {errors.partyName}
                            </div>
                        )}
                    </Form.Group>
                </Col>

                {/* Right Column */}
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold text-danger" style={{ fontSize: '14px' }}>
                            Date *
                        </Form.Label>
                        <Form.Control
                            ref={el => fieldRefs.current.quotationDate = el}
                            type="date"
                            value={formData.quotationDate || new Date().toISOString().split('T')[0]}
                            onChange={(e) => handleInputChange('quotationDate', e.target.value)}
                            onKeyDown={(e) => handleFieldKeyDown(e, 'quotationDate')}
                            className="border-2"
                            style={getInputStyleWithError('quotationDate')}
                            disabled={disabled}
                            isInvalid={!!errors.quotationDate}
                        />
                        {errors.quotationDate && (
                            <Form.Control.Feedback type="invalid" style={{ fontSize: '12px' }}>
                                {errors.quotationDate}
                            </Form.Control.Feedback>
                        )}
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold text-danger" style={{ fontSize: '14px' }}>
                            Quotation No. *
                            {!formData.quotationNumber && (
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 ms-2 text-decoration-none"
                                    style={{ fontSize: '12px' }}
                                    onClick={generateOrderNumber}
                                    disabled={isGeneratingOrderNumber}
                                >
                                    Generate Now
                                </Button>
                            )}
                        </Form.Label>
                        <div className="position-relative">
                            <Form.Control
                                type="text"
                                value={formData.quotationNumber || ''}
                                className="border-2"
                                style={{
                                    ...getInputStyleWithError('quotationNumber'),
                                    backgroundColor: isGeneratingOrderNumber ? '#f8f9fa' : '#e9ecef'
                                }}
                                disabled
                                readOnly
                                isInvalid={!!errors.quotationNumber}
                                placeholder={isGeneratingOrderNumber ? "Auto-generating..." : "Will be generated automatically"}
                            />
                            {isGeneratingOrderNumber && (
                                <div className="position-absolute top-50 end-0 translate-middle-y me-2">
                                    <Spinner size="sm" />
                                </div>
                            )}
                        </div>
                        {formData.quotationNumber && (
                            <Form.Text className="text-success" style={{ fontSize: '12px' }}>
                                ✅ Order number generated successfully
                            </Form.Text>
                        )}
                        {errors.quotationNumber && (
                            <Form.Control.Feedback type="invalid" style={{ fontSize: '12px' }}>
                                {errors.quotationNumber}
                            </Form.Control.Feedback>
                        )}
                    </Form.Group>

                    <Form.Group>
                        <Form.Label className="fw-bold text-danger d-flex align-items-center" style={{ fontSize: '14px' }}>
                            <FontAwesomeIcon icon={faUser} className="me-2" />
                            Employee *
                            {userError && (
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 ms-2 text-decoration-none"
                                    style={{ fontSize: '12px' }}
                                    onClick={retryUserFetch}
                                    disabled={isLoadingUser}
                                    title="Retry fetching user information"
                                >
                                    <FontAwesomeIcon icon={faRefresh} className="me-1" />
                                    Retry
                                </Button>
                            )}
                        </Form.Label>

                        <div className="position-relative">
                            <Form.Control
                                type="text"
                                value={userDisplayInfo.displayText}
                                className={`border-2 ${userDisplayInfo.hasUser ? 'bg-light' : 'bg-warning bg-opacity-25'}`}
                                style={{
                                    ...inputStyle, // ✅ Using standardized style
                                    borderColor: errors.employeeName ? '#dc3545' : (userDisplayInfo.hasUser ? '#28a745' : '#ffc107')
                                }}
                                readOnly
                                disabled={disabled}
                                isInvalid={!!errors.employeeName}
                                placeholder={isLoadingUser ? "Loading user..." : "User information will appear here"}
                            />

                            {isLoadingUser && (
                                <div className="position-absolute top-50 end-0 translate-middle-y me-2">
                                    <Spinner size="sm" />
                                </div>
                            )}
                        </div>

                        {/* ✅ UPDATED: Show only employee name in feedback */}
                        {userDisplayInfo.hasUser && !isLoadingUser && (
                            <Form.Text className="text-success d-block" style={{ fontSize: '12px' }}>
                                ✅ Employee: {userDisplayInfo.displayText}
                                {userDisplayInfo.user?.role && (
                                    <span className="ms-2 badge bg-success bg-opacity-25 text-success">
                                        {userDisplayInfo.user.role}
                                    </span>
                                )}
                            </Form.Text>
                        )}

                        {isLoadingUser && (
                            <Form.Text className="text-info d-block" style={{ fontSize: '12px' }}>
                                <FontAwesomeIcon icon={faSpinner} className="me-1" spin />
                                Loading user information...
                            </Form.Text>
                        )}

                        {userError && !isLoadingUser && (
                            <Form.Text className="text-warning d-block" style={{ fontSize: '12px' }}>
                                ⚠️ {userError}. Click "Retry" to fetch again.
                            </Form.Text>
                        )}

                        {!userDisplayInfo.hasUser && !isLoadingUser && !userError && (
                            <Form.Text className="text-muted d-block" style={{ fontSize: '12px' }}>
                                ℹ️ User information will be auto-filled when available
                            </Form.Text>
                        )}

                        {errors.employeeName && (
                            <Form.Control.Feedback type="invalid" style={{ fontSize: '12px' }}>
                                {errors.employeeName}
                            </Form.Control.Feedback>
                        )}
                    </Form.Group>
                </Col>
            </Row>

            {showAddPartyModal && (
                <AddNewParty
                    show={showAddPartyModal}
                    onHide={() => setShowAddPartyModal(false)}
                    companyId={companyId}
                    currentUser={currentUser || propCurrentUser}
                    onPartyCreated={handlePartyCreated}
                    quickAddData={quickAddPartyData}
                    addToast={addToast}
                />
            )}
        </div>
    );
}

export default OrderFormHeader;