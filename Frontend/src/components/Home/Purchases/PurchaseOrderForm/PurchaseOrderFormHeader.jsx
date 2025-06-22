import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Form, Spinner, Button, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faUser, faSpinner, faRefresh, faCalendarAlt, faFileInvoice, faTruck, faTag } from '@fortawesome/free-solid-svg-icons';
import partyService from '../../../../services/partyService';
import purchaseOrderService from '../../../../services/purchaseOrderService';
import authService from '../../../../services/authService';
import AddNewParty from '../../Party/AddNewParty';

function PurchaseOrderFormHeader({
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

    const fieldRefs = useRef({
        gstType: null,
        deliveryDate: null,
        partyName: null,
        purchaseDate: null
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
            return null;

        } catch (error) {
            setUserError(error.message || 'Failed to fetch user information');
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
                displayText: formData.employeeName,
                isLoading: false,
                hasUser: true,
                user: user
            };
        }

        if (user?.name) {
            return {
                displayText: user.name,
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
                type: 'supplier',
                page: 1,
                sortBy: 'name',
                sortOrder: 'asc'
            });

            if (response.success) {
                const supplierList = response.data?.parties || response.data || [];
                const formattedParties = supplierList.map(supplier => ({
                    id: supplier._id || supplier.id,
                    name: supplier.name || supplier.partyName || 'Unknown Supplier',
                    phone: supplier.phoneNumber || supplier.phone || supplier.mobile || supplier.contactNumber || '',
                    email: supplier.email || '',
                    address: supplier.homeAddressLine || supplier.address || '',
                    gstNumber: supplier.gstNumber || '',
                    balance: supplier.currentBalance || supplier.balance || supplier.openingBalance || 0,
                    type: supplier.partyType || 'supplier',
                    companyName: supplier.companyName || '',
                    creditLimit: supplier.creditLimit || 0
                }));

                setParties(formattedParties);

                if (searchTerm && !isSelectingPartyRef.current) {
                    setShowPartySuggestions(true);
                }
            } else {
                setParties([]);
            }
        } catch (error) {
            setParties([]);
        } finally {
            setIsLoadingParties(false);
        }
    };

    const searchPartiesAlternative = async (searchTerm) => {
        if (!companyId || !searchTerm || searchTerm.length < 2) return;

        try {
            const response = await partyService.searchParties(searchTerm, 'supplier', 20);

            if (response.success) {
                const supplierList = response.data || [];
                const formattedParties = supplierList.map(supplier => ({
                    id: supplier._id || supplier.id,
                    name: supplier.name || supplier.partyName || 'Unknown Supplier',
                    phone: supplier.phoneNumber || supplier.phone || supplier.mobile || supplier.contactNumber || '',
                    email: supplier.email || '',
                    address: supplier.homeAddressLine || supplier.address || '',
                    gstNumber: supplier.gstNumber || '',
                    balance: supplier.currentBalance || supplier.balance || supplier.openingBalance || 0,
                    type: supplier.partyType || 'supplier',
                    companyName: supplier.companyName || '',
                    creditLimit: supplier.creditLimit || 0
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

            const response = await purchaseOrderService.generateOrderNumber(
                companyId,
                'purchase_order'
            );

            if (response.success && response.data?.nextOrderNumber) {
                onFormDataChange('purchaseOrderNumber', response.data.nextOrderNumber);
            } else {
                const now = new Date();
                const year = now.getFullYear().toString().slice(-2);
                const month = (now.getMonth() + 1).toString().padStart(2, '0');
                const day = now.getDate().toString().padStart(2, '0');
                const hours = now.getHours().toString().padStart(2, '0');
                const minutes = now.getMinutes().toString().padStart(2, '0');
                const seconds = now.getSeconds().toString().padStart(2, '0');

                const fallbackNumber = `PO-${year}${month}${day}-${hours}${minutes}${seconds}`;
                onFormDataChange('purchaseOrderNumber', fallbackNumber);
            }
        } catch (error) {
            const timestamp = Date.now().toString();
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const emergencyNumber = `PO-${timestamp.slice(-8)}-${randomNum}`;

            onFormDataChange('purchaseOrderNumber', emergencyNumber);
        } finally {
            setIsGeneratingOrderNumber(false);
        }
    };

    const focusNextField = (currentField) => {
        const fieldOrder = ['gstType', 'deliveryDate', 'partyName', 'purchaseDate'];
        const currentIndex = fieldOrder.indexOf(currentField);

        if (currentIndex < fieldOrder.length - 1) {
            const nextField = fieldOrder[currentIndex + 1];
            const nextFieldRef = fieldRefs.current[nextField];
            if (nextFieldRef) {
                nextFieldRef.focus();
                if (nextFieldRef.select) nextFieldRef.select();
            }
        } else {
            const firstProductInput = document.querySelector('[data-product-input="0"]');
            if (firstProductInput) {
                firstProductInput.focus();
            }
        }
    };

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
                        handleAddNewParty();
                        return;
                    }
                }
            }

            focusNextField(fieldName);
        }
    };

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
                break;

            default:
                setSelectedPartySuggestionIndex(-1);
                break;
        }
    };

    const handleAddNewParty = () => {
        isSelectingPartyRef.current = true;
        setQuickAddPartyData({
            name: partySearchTerm || '',
            type: 'supplier'
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
            type: newParty.partyType || 'supplier',
            companyName: newParty.companyName || '',
            creditLimit: newParty.creditLimit || 0
        };

        handlePartySelect(formattedParty);
        setParties(prev => [formattedParty, ...prev]);
        setShowAddPartyModal(false);
        setShowPartySuggestions(false);

        setTimeout(() => {
            isSelectingPartyRef.current = false;
            const purchaseDateRef = fieldRefs.current.purchaseDate;
            if (purchaseDateRef) {
                purchaseDateRef.focus();
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

            if (!formData.purchaseOrderNumber || formData.purchaseOrderNumber.trim() === '') {
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
            const purchaseDateRef = fieldRefs.current.purchaseDate;
            if (purchaseDateRef) {
                purchaseDateRef.focus();
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

    // Theme-consistent styling
    const inputStyle = {
        borderColor: '#000',
        fontSize: '13px',
        padding: '10px 14px',
        height: '42px',
        borderWidth: '2px',
        borderRadius: '8px',
        fontWeight: '500'
    };

    const getInputStyleWithError = (fieldName) => ({
        ...inputStyle,
        borderColor: errors[fieldName] ? '#dc3545' : '#000',
        backgroundColor: errors[fieldName] ? '#fff5f5' : 'white'
    });

    const labelStyle = {
        fontSize: '14px',
        fontWeight: 'bold',
        marginBottom: '8px',
        color: '#2c3e50'
    };

    const cardStyle = {
        border: '3px solid #000',
        borderRadius: '12px',
        backgroundColor: 'white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    };

    return (
        <div className="purchase-order-form-header mb-4">
            {/* Header Section */}
            <Card className="mb-4" style={cardStyle}>
                <Card.Header className="bg-light border-bottom-3" style={{ borderBottomColor: '#000', padding: '15px 20px' }}>
                    <div className="d-flex align-items-center">
                        <FontAwesomeIcon icon={faFileInvoice} className="me-3 text-primary" size="lg" />
                        <h5 className="mb-0 fw-bold text-dark">Purchase Order Details</h5>
                    </div>
                </Card.Header>
                <Card.Body className="p-4">
                    <Row className="g-4">
                        {/* Left Column */}
                        <Col md={6}>
                            <Form.Group className="mb-4">
                                <Form.Label className="d-flex align-items-center" style={labelStyle}>
                                    <FontAwesomeIcon icon={faTag} className="me-2 text-primary" />
                                    GST / Non GST *
                                </Form.Label>
                                <Form.Select
                                    ref={el => fieldRefs.current.gstType = el}
                                    value={formData.gstType || 'gst'}
                                    onChange={(e) => handleInputChange('gstType', e.target.value)}
                                    onKeyDown={(e) => handleFieldKeyDown(e, 'gstType')}
                                    style={{
                                        ...getInputStyleWithError('gstType'),
                                        backgroundColor: formData.gstType === 'gst' ? '#e8f5e8' : '#fff3e0',
                                        cursor: 'pointer'
                                    }}
                                    disabled={disabled}
                                    isInvalid={!!errors.gstType}
                                >
                                    <option value="gst">✅ GST Applicable</option>
                                    <option value="non-gst">❌ Non-GST</option>
                                </Form.Select>
                                {errors.gstType && (
                                    <Form.Control.Feedback type="invalid" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                                        {errors.gstType}
                                    </Form.Control.Feedback>
                                )}
                                <Form.Text className="text-info fw-bold" style={{ fontSize: '12px' }}>
                                    {formData.gstType === 'gst' ? '✅ GST will be calculated on items' : '⚠️ No GST will be applied'}
                                </Form.Text>
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label className="d-flex align-items-center" style={labelStyle}>
                                    <FontAwesomeIcon icon={faTruck} className="me-2 text-warning" />
                                    Expected Delivery Date
                                </Form.Label>
                                <Form.Control
                                    ref={el => fieldRefs.current.deliveryDate = el}
                                    type="date"
                                    value={formData.deliveryDate || ''}
                                    onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                                    onKeyDown={(e) => handleFieldKeyDown(e, 'deliveryDate')}
                                    style={{
                                        ...getInputStyleWithError('deliveryDate'),
                                        cursor: 'pointer'
                                    }}
                                    disabled={disabled}
                                    isInvalid={!!errors.deliveryDate}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                                {errors.deliveryDate && (
                                    <Form.Control.Feedback type="invalid" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                                        {errors.deliveryDate}
                                    </Form.Control.Feedback>
                                )}
                                <Form.Text className="text-muted fw-bold" style={{ fontSize: '12px' }}>
                                    📅 When do you expect delivery from supplier?
                                </Form.Text>
                            </Form.Group>

                            <Form.Group className="position-relative">
                                <Form.Label className="d-flex align-items-center" style={{ ...labelStyle, color: '#dc3545' }}>
                                    <FontAwesomeIcon icon={faUserPlus} className="me-2 text-danger" />
                                    Select Supplier *
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
                                        style={getInputStyleWithError('partyName')}
                                        placeholder="🔍 Search supplier name or phone..."
                                        disabled={disabled || isLoadingParties}
                                        isInvalid={!!errors.partyName}
                                    />

                                    {isLoadingParties && (
                                        <div className="position-absolute top-50 end-0 translate-middle-y me-3">
                                            <Spinner size="sm" className="text-primary" />
                                        </div>
                                    )}
                                </div>

                                {showPartySuggestions && partySearchTerm.length >= 2 && !formData.selectedParty && (
                                    <div
                                        className="position-absolute w-100 bg-white border-3 rounded-3 mt-2 shadow-lg"
                                        style={{
                                            zIndex: 1000,
                                            maxHeight: '250px',
                                            overflowY: 'auto',
                                            borderColor: '#000 !important'
                                        }}
                                    >
                                        {filteredParties.length > 0 && (
                                            filteredParties.slice(0, 5).map((party, index) => (
                                                <div
                                                    key={party.id}
                                                    className={`p-3 border-bottom cursor-pointer ${selectedPartySuggestionIndex === index ? 'bg-primary text-white' : 'hover-bg-light'}`}
                                                    style={{
                                                        fontSize: '13px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        borderRadius: selectedPartySuggestionIndex === index ? '8px' : '0'
                                                    }}
                                                    onClick={() => handlePartySelect(party)}
                                                    onMouseEnter={() => setSelectedPartySuggestionIndex(index)}
                                                >
                                                    <div className={`fw-bold mb-1 ${selectedPartySuggestionIndex === index ? 'text-white' : 'text-primary'}`} style={{ fontSize: '14px' }}>
                                                        🏢 {party.name}
                                                    </div>
                                                    {party.phone && (
                                                        <div className={`${selectedPartySuggestionIndex === index ? 'text-light' : 'text-muted'}`} style={{ fontSize: '12px' }}>
                                                            📞 {party.phone}
                                                        </div>
                                                    )}
                                                    {party.gstNumber && (
                                                        <div className={`${selectedPartySuggestionIndex === index ? 'text-light' : 'text-info'}`} style={{ fontSize: '11px' }}>
                                                            🏷️ GST: {party.gstNumber}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}

                                        <div
                                            className={`p-3 cursor-pointer border-top-3 ${selectedPartySuggestionIndex === filteredParties.length ? 'bg-success text-white' : 'bg-light'}`}
                                            style={{
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                borderTopColor: '#000 !important'
                                            }}
                                            onClick={handleAddNewParty}
                                            onMouseEnter={() => setSelectedPartySuggestionIndex(filteredParties.length)}
                                        >
                                            <div className="text-center">
                                                <FontAwesomeIcon
                                                    icon={faUserPlus}
                                                    className={`me-2 ${selectedPartySuggestionIndex === filteredParties.length ? 'text-white' : 'text-success'}`}
                                                />
                                                <span className={`fw-bold ${selectedPartySuggestionIndex === filteredParties.length ? 'text-white' : 'text-success'}`} style={{ fontSize: '13px' }}>
                                                    ➕ Add New Supplier
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {formData.selectedParty && formData.partyName && (
                                    <div className="mt-3 p-3 bg-success bg-opacity-10 border-3 rounded-3" style={{ borderColor: '#28a745' }}>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <div className="fw-bold text-success mb-1" style={{ fontSize: '14px' }}>
                                                    ✅ {formData.partyName}
                                                </div>
                                                {formData.partyPhone && (
                                                    <div className="text-muted" style={{ fontSize: '12px' }}>
                                                        📞 {formData.partyPhone}
                                                    </div>
                                                )}
                                                {formData.partyGstNumber && (
                                                    <div className="text-info" style={{ fontSize: '11px' }}>
                                                        🏷️ GST: {formData.partyGstNumber}
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={clearPartySelection}
                                                disabled={disabled}
                                                title="Clear selection"
                                                style={{
                                                    fontSize: '12px',
                                                    padding: '6px 12px',
                                                    borderWidth: '2px',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                ✕ Clear
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {errors.partyName && (
                                    <div className="invalid-feedback d-block fw-bold" style={{ fontSize: '12px' }}>
                                        ⚠️ {errors.partyName}
                                    </div>
                                )}
                            </Form.Group>
                        </Col>

                        {/* Right Column */}
                        <Col md={6}>
                            <Form.Group className="mb-4">
                                <Form.Label className="d-flex align-items-center" style={{ ...labelStyle, color: '#dc3545' }}>
                                    <FontAwesomeIcon icon={faCalendarAlt} className="me-2 text-danger" />
                                    Purchase Date *
                                </Form.Label>
                                <Form.Control
                                    ref={el => fieldRefs.current.purchaseDate = el}
                                    type="date"
                                    value={formData.purchaseDate || new Date().toISOString().split('T')[0]}
                                    onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
                                    onKeyDown={(e) => handleFieldKeyDown(e, 'purchaseDate')}
                                    style={{
                                        ...getInputStyleWithError('purchaseDate'),
                                        cursor: 'pointer'
                                    }}
                                    disabled={disabled}
                                    isInvalid={!!errors.purchaseDate}
                                />
                                {errors.purchaseDate && (
                                    <Form.Control.Feedback type="invalid" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                                        {errors.purchaseDate}
                                    </Form.Control.Feedback>
                                )}
                                <Form.Text className="text-muted fw-bold" style={{ fontSize: '12px' }}>
                                    📅 Date of purchase order creation
                                </Form.Text>
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label className="d-flex align-items-center justify-content-between" style={{ ...labelStyle, color: '#dc3545' }}>
                                    <span>
                                        <FontAwesomeIcon icon={faFileInvoice} className="me-2 text-danger" />
                                        Purchase Order No. *
                                    </span>
                                    {!formData.purchaseOrderNumber && (
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={generateOrderNumber}
                                            disabled={isGeneratingOrderNumber}
                                            style={{
                                                fontSize: '11px',
                                                padding: '4px 8px',
                                                borderWidth: '2px',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {isGeneratingOrderNumber ? (
                                                <>
                                                    <Spinner size="sm" className="me-1" />
                                                    Generating...
                                                </>
                                            ) : (
                                                '🔄 Generate Now'
                                            )}
                                        </Button>
                                    )}
                                </Form.Label>
                                <div className="position-relative">
                                    <Form.Control
                                        type="text"
                                        value={formData.purchaseOrderNumber || ''}
                                        style={{
                                            ...getInputStyleWithError('purchaseOrderNumber'),
                                            backgroundColor: isGeneratingOrderNumber ? '#f8f9fa' : '#e9ecef',
                                            fontWeight: 'bold',
                                            color: formData.purchaseOrderNumber ? '#28a745' : '#6c757d'
                                        }}
                                        disabled
                                        readOnly
                                        isInvalid={!!errors.purchaseOrderNumber}
                                        placeholder={isGeneratingOrderNumber ? "🔄 Auto-generating order number..." : "📋 Order number will be generated automatically"}
                                    />
                                    {isGeneratingOrderNumber && (
                                        <div className="position-absolute top-50 end-0 translate-middle-y me-3">
                                            <Spinner size="sm" className="text-primary" />
                                        </div>
                                    )}
                                </div>
                                {formData.purchaseOrderNumber && (
                                    <Form.Text className="text-success fw-bold" style={{ fontSize: '12px' }}>
                                        ✅ Order number: <strong>{formData.purchaseOrderNumber}</strong>
                                    </Form.Text>
                                )}
                                {errors.purchaseOrderNumber && (
                                    <Form.Control.Feedback type="invalid" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                                        {errors.purchaseOrderNumber}
                                    </Form.Control.Feedback>
                                )}
                            </Form.Group>

                            <Form.Group>
                                <Form.Label className="d-flex align-items-center justify-content-between" style={{ ...labelStyle, color: '#dc3545' }}>
                                    <span>
                                        <FontAwesomeIcon icon={faUser} className="me-2 text-danger" />
                                        Employee *
                                    </span>
                                    {userError && (
                                        <Button
                                            variant="outline-warning"
                                            size="sm"
                                            onClick={retryUserFetch}
                                            disabled={isLoadingUser}
                                            title="Retry fetching user information"
                                            style={{
                                                fontSize: '11px',
                                                padding: '4px 8px',
                                                borderWidth: '2px',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faRefresh} className="me-1" />
                                            🔄 Retry
                                        </Button>
                                    )}
                                </Form.Label>

                                <div className="position-relative">
                                    <Form.Control
                                        type="text"
                                        value={userDisplayInfo.displayText}
                                        style={{
                                            ...inputStyle,
                                            borderColor: errors.employeeName ? '#dc3545' : (userDisplayInfo.hasUser ? '#28a745' : '#ffc107'),
                                            backgroundColor: userDisplayInfo.hasUser ? '#e8f5e8' : '#fff3e0',
                                            fontWeight: 'bold',
                                            color: userDisplayInfo.hasUser ? '#155724' : '#856404'
                                        }}
                                        readOnly
                                        disabled={disabled}
                                        isInvalid={!!errors.employeeName}
                                        placeholder={isLoadingUser ? "🔄 Loading user information..." : "👤 Employee information will appear here"}
                                    />

                                    {isLoadingUser && (
                                        <div className="position-absolute top-50 end-0 translate-middle-y me-3">
                                            <Spinner size="sm" className="text-primary" />
                                        </div>
                                    )}
                                </div>

                                {userDisplayInfo.hasUser && !isLoadingUser && (
                                    <Form.Text className="text-success fw-bold d-block" style={{ fontSize: '12px' }}>
                                        ✅ Employee: <strong>{userDisplayInfo.displayText}</strong>
                                        {userDisplayInfo.user?.role && (
                                            <span className="ms-2 badge bg-success" style={{ fontSize: '10px' }}>
                                                {userDisplayInfo.user.role}
                                            </span>
                                        )}
                                    </Form.Text>
                                )}

                                {isLoadingUser && (
                                    <Form.Text className="text-info fw-bold d-block" style={{ fontSize: '12px' }}>
                                        <FontAwesomeIcon icon={faSpinner} className="me-1" spin />
                                        🔄 Loading user information...
                                    </Form.Text>
                                )}

                                {userError && !isLoadingUser && (
                                    <Form.Text className="text-warning fw-bold d-block" style={{ fontSize: '12px' }}>
                                        ⚠️ {userError}. Click "Retry" to fetch again.
                                    </Form.Text>
                                )}

                                {!userDisplayInfo.hasUser && !isLoadingUser && !userError && (
                                    <Form.Text className="text-muted fw-bold d-block" style={{ fontSize: '12px' }}>
                                        ℹ️ User information will be auto-filled when available
                                    </Form.Text>
                                )}

                                {errors.employeeName && (
                                    <Form.Control.Feedback type="invalid" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                                        ⚠️ {errors.employeeName}
                                    </Form.Control.Feedback>
                                )}
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

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

export default PurchaseOrderFormHeader;