import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faUser, faRefresh } from '@fortawesome/free-solid-svg-icons';
import { useParams } from 'react-router-dom';
import saleOrderService from '../../../../services/saleOrderService';
import authService from '../../../../services/authService';
import OrderFormHeader from './SalesOrderForm/OrderFormHeader';
import OrderFormProductSection from './SalesOrderForm/OrderFormProductSection';

function SimpleQuotationForm({
    onSave,
    onCancel,
    editingOrder = null,
    currentCompany,
    currentUser: propCurrentUser,
    companyId,
    addToast,
    onNavigate
}) {
    const { companyId: urlCompanyId } = useParams();
    const effectiveCompanyId = companyId || urlCompanyId;

    const [currentUser, setCurrentUser] = useState(propCurrentUser || null);
    const [isLoadingUser, setIsLoadingUser] = useState(false);
    const [userError, setUserError] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        // Header fields
        gstType: 'gst',
        deliveryDate: '',
        quotationDate: new Date().toISOString().split('T')[0],
        quotationNumber: '',
        employeeName: '',
        employeeId: '',
        selectedEmployee: '',
        description: '',

        // Party/Customer selection
        selectedParty: '',
        partyName: '',
        partyPhone: '',
        partyEmail: '',
        partyAddress: '',
        partyGstNumber: '',

        // Product rows
        items: [{
            id: 1,
            selectedProduct: '',
            productName: '',
            productCode: '',
            description: '',
            quantity: '',
            price: '',
            unit: 'pcs',
            gstMode: 'exclude',
            gstRate: 18,
            subtotal: 0,
            gstAmount: 0,
            totalAmount: 0,
            availableStock: 0
        }]
    });

    // UI states
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});

    // ✅ Enhanced user management
    const fetchCurrentUser = async () => {
        try {
            setIsLoadingUser(true);
            setUserError(null);

            // Try multiple methods to get user
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
                handleFormDataChange('employeeName', employeeInfo.name);
                handleFormDataChange('employeeId', employeeInfo.employeeId);
            } else {
                const employeeName = user.name || user.username || user.displayName || '';
                const employeeId = user.employeeId || user.id || user._id || '';

                if (employeeName) {
                    handleFormDataChange('employeeName', employeeName);
                }
                if (employeeId) {
                    handleFormDataChange('employeeId', employeeId);
                }
            }
        }
    };

    const retryUserFetch = async () => {
        const user = await fetchCurrentUser();
        if (user) {
            autoFillUserData(user);
        }
    };

    // ✅ Cleaner useEffect hooks
    useEffect(() => {
        if (editingOrder) {
            setFormData(prev => ({
                ...prev,
                ...editingOrder,
                items: editingOrder.items || prev.items
            }));
        }
    }, [editingOrder]);

    useEffect(() => {
        const initializeUser = async () => {
            if (propCurrentUser) {
                setCurrentUser(propCurrentUser);
                autoFillUserData(propCurrentUser);
            } else if (!currentUser && !isLoadingUser) {
                const user = await fetchCurrentUser();
                if (user) {
                    autoFillUserData(user);
                }
            } else if (currentUser && !formData.employeeName) {
                autoFillUserData(currentUser);
            }
        };

        initializeUser();
    }, [propCurrentUser]);

    useEffect(() => {
        if (propCurrentUser && propCurrentUser !== currentUser) {
            setCurrentUser(propCurrentUser);
            setUserError(null);
            autoFillUserData(propCurrentUser);
        }
    }, [propCurrentUser]);

    // ✅ FIXED: Enhanced form data handler with proper GST recalculation
    const handleFormDataChange = (field, value) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };

            // ✅ FIXED: Handle GST type change - trigger recalculation
            if (field === 'gstType') {
                console.log('GST Type changed to:', value);

                // Recalculate all items with new GST type
                newData.items = (newData.items || []).map((item, index) => {
                    if (item.quantity && item.price) {
                        const recalculatedItem = calculateItemTotals(item, value);
                        console.log(`Recalculated item ${index}:`, recalculatedItem);
                        return recalculatedItem;
                    }
                    return item;
                });

                // Set flag to trigger recalculation in ProductSection component
                newData._gstTypeChanged = true;
            }

            return newData;
        });

        // Clear field-specific errors
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: null
            }));
        }
    };

    // ✅ FIXED: Enhanced calculation logic with proper GST handling
    const calculateItemTotals = (item, gstType = formData.gstType) => {
        const quantity = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        const gstRate = parseFloat(item.gstRate) || 18;

        console.log('Calculating totals for item:', {
            quantity,
            price,
            gstRate,
            gstType,
            gstMode: item.gstMode
        });

        let subtotal = quantity * price;
        let gstAmount = 0;
        let totalAmount = 0;

        if (gstType === 'gst') {
            if (item.gstMode === 'include') {
                // Price includes GST
                totalAmount = subtotal;
                gstAmount = (subtotal * gstRate) / (100 + gstRate);
                subtotal = totalAmount - gstAmount;
            } else {
                // Price excludes GST
                gstAmount = (subtotal * gstRate) / 100;
                totalAmount = subtotal + gstAmount;
            }
        } else {
            // Non-GST calculation
            totalAmount = subtotal;
            gstAmount = 0;
        }

        const result = {
            ...item,
            subtotal: Math.round(subtotal * 100) / 100,
            gstAmount: Math.round(gstAmount * 100) / 100,
            totalAmount: Math.round(totalAmount * 100) / 100
        };

        console.log('Calculated result:', result);
        return result;
    };

    // ✅ Enhanced validation with better error messages
    const validateForm = () => {
        const newErrors = {};

        // Required field validations
        const requiredFields = [
            { field: 'partyName', message: 'Please select a party' },
            { field: 'quotationNumber', message: 'Quotation number is required' },
            { field: 'quotationDate', message: 'Date is required' },
            { field: 'employeeName', message: 'Employee selection is required' }
        ];

        requiredFields.forEach(({ field, message }) => {
            if (!formData[field]) {
                newErrors[field] = message;
            }
        });

        // Validate items
        const validItems = formData.items.filter(item =>
            item.productName && parseFloat(item.quantity) > 0 && parseFloat(item.price) > 0
        );

        if (validItems.length === 0) {
            newErrors.items = 'Please add at least one valid product';
        }

        // Validate individual items
        formData.items.forEach((item, index) => {
            if (item.productName) {
                if (!item.quantity || parseFloat(item.quantity) <= 0) {
                    newErrors[`items.${index}.quantity`] = 'Quantity is required';
                }
                if (!item.price || parseFloat(item.price) <= 0) {
                    newErrors[`items.${index}.price`] = 'Price is required';
                }
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ✅ Cleaner totals calculation
    const calculateGrandTotals = () => {
        const items = formData.items || [];
        const totals = items.reduce((acc, item) => ({
            subtotal: acc.subtotal + (parseFloat(item.subtotal) || 0),
            gstAmount: acc.gstAmount + (parseFloat(item.gstAmount) || 0),
            grandTotal: acc.grandTotal + (parseFloat(item.totalAmount) || 0),
            totalQuantity: acc.totalQuantity + (parseFloat(item.quantity) || 0)
        }), { subtotal: 0, gstAmount: 0, grandTotal: 0, totalQuantity: 0 });

        return {
            subtotal: Math.round(totals.subtotal * 100) / 100,
            gstAmount: Math.round(totals.gstAmount * 100) / 100,
            grandTotal: Math.round(totals.grandTotal * 100) / 100,
            totalQuantity: totals.totalQuantity
        };
    };

    // ✅ Enhanced save handler with better data mapping
    const handleSave = async () => {
        try {
            setSaving(true);
            setError('');

            const effectiveUser = currentUser || propCurrentUser;
            if (!effectiveUser && !formData.employeeName) {
                throw new Error('Employee information is required. Please wait for user data to load or retry.');
            }

            if (!validateForm()) {
                throw new Error('Please fix the validation errors before saving');
            }

            const validItems = formData.items.filter(item =>
                item.productName && parseFloat(item.quantity) > 0 && parseFloat(item.price) > 0
            );

            if (validItems.length === 0) {
                throw new Error('Please add at least one valid product');
            }

            const totals = calculateGrandTotals();

            // ✅ Clean data mapping for backend
            const quotationData = {
                quotationNumber: formData.quotationNumber,
                quotationDate: formData.quotationDate,
                deliveryDate: formData.deliveryDate,
                orderType: 'quotation',

                // Customer information
                customerName: formData.partyName,
                customerMobile: formData.partyPhone,
                customerEmail: formData.partyEmail,
                customerAddress: formData.partyAddress,
                customerGstNumber: formData.partyGstNumber,

                // Employee information
                employeeName: formData.employeeName || effectiveUser?.name,
                employeeId: formData.employeeId || effectiveUser?.id || effectiveUser?._id,
                createdBy: formData.employeeName || effectiveUser?.name,
                createdById: formData.employeeId || effectiveUser?.id || effectiveUser?._id,

                // GST settings
                gstEnabled: formData.gstType === 'gst',
                gstType: formData.gstType,
                taxMode: 'without-tax',
                priceIncludesTax: false,

                // Items with dual field mapping for backend compatibility
                items: validItems.map((item, index) => ({
                    lineNumber: index + 1,
                    // Product information (dual mapping)
                    productName: item.productName,
                    itemName: item.productName,
                    productCode: item.productCode,
                    itemCode: item.productCode,
                    description: item.description,

                    // Quantity and pricing (dual mapping)
                    quantity: parseFloat(item.quantity),
                    price: parseFloat(item.price),
                    pricePerUnit: parseFloat(item.price),
                    unit: item.unit,

                    // Tax information (dual mapping)
                    gstRate: formData.gstType === 'gst' ? (item.gstRate || 18) : 0,
                    taxRate: formData.gstType === 'gst' ? (item.gstRate || 18) : 0,
                    gstMode: item.gstMode,
                    taxMode: item.gstMode === 'include' ? 'with-tax' : 'without-tax',
                    priceIncludesTax: item.gstMode === 'include',

                    // Totals (dual mapping)
                    totalAmount: item.totalAmount,
                    amount: item.totalAmount,
                    itemAmount: item.totalAmount,
                    subtotal: item.subtotal,
                    gstAmount: item.gstAmount,
                    totalTaxAmount: item.gstAmount,

                    selectedProduct: item.selectedProduct || ''
                })),

                // Grand totals
                totals: {
                    subtotal: totals.subtotal,
                    totalTax: totals.gstAmount,
                    finalTotal: totals.grandTotal,
                    totalAmount: totals.grandTotal,
                    totalItems: totals.totalQuantity,
                    totalQuantity: totals.totalQuantity
                },

                notes: formData.description,
                companyId: effectiveCompanyId,
                status: 'draft'
            };

            console.log('Saving quotation data:', quotationData);

            const response = await saleOrderService.createSalesOrder(quotationData);

            if (response.success) {
                addToast?.(`Quotation ${formData.quotationNumber} created successfully!`, 'success');

                if (onSave) {
                    onSave(response.data);
                }

                setTimeout(() => {
                    if (onNavigate) {
                        onNavigate('quotations');
                    }
                }, 1500);
            } else {
                throw new Error(response.message || 'Failed to create quotation');
            }

        } catch (error) {
            console.error('Save error:', error);
            setError(error.message);
            addToast?.(error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const totals = calculateGrandTotals();

    // ✅ Enhanced loading state
    if (loading) {
        return (
            <Container className="py-4">
                <div className="text-center">
                    <Spinner animation="border" />
                    <p className="mt-2">Loading quotation form...</p>
                </div>
            </Container>
        );
    }

    // ✅ Helper function for save button state
    const isSaveDisabled = () => {
        return saving ||
            totals.grandTotal <= 0 ||
            (isLoadingUser && !formData.employeeName) ||
            (!currentUser && !propCurrentUser && !formData.employeeName);
    };

    const getSaveButtonTitle = () => {
        if (isLoadingUser) return "Waiting for user information...";
        if (!currentUser && !propCurrentUser && !formData.employeeName) return "Employee information required";
        if (totals.grandTotal <= 0) return "Add products to save";
        return "Save quotation";
    };

    return (
        <Container className="py-3" style={{ backgroundColor: '#4A90E2', minHeight: '100vh' }}>
            {/* Error Alert */}
            {error && (
                <Alert variant="danger" className="mb-3" dismissible onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* User Status Alert */}
            {(isLoadingUser || userError) && (
                <Alert
                    variant={isLoadingUser ? "info" : "warning"}
                    className="mb-3"
                >
                    <div className="d-flex align-items-center justify-content-between">
                        <div>
                            {isLoadingUser ? (
                                <>
                                    <FontAwesomeIcon icon={faUser} className="me-2" />
                                    <Spinner size="sm" className="me-2" />
                                    Loading user information...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faUser} className="me-2" />
                                    ⚠️ {userError}
                                </>
                            )}
                        </div>
                        {userError && !isLoadingUser && (
                            <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={retryUserFetch}
                                disabled={isLoadingUser}
                            >
                                <FontAwesomeIcon icon={faRefresh} className="me-1" />
                                Retry
                            </Button>
                        )}
                    </div>
                </Alert>
            )}

            {/* Debug Info */}
            {process.env.NODE_ENV === 'development' && (
                <Alert variant="info" className="mb-3">
                    <small>
                        Debug: GST Type = {formData.gstType},
                        Items Count = {formData.items?.length || 0},
                        Total = ₹{totals.grandTotal.toFixed(2)}
                    </small>
                </Alert>
            )}

            {/* Main Form Card - Reduced max width */}
            <Card className="mx-auto shadow-lg" style={{ maxWidth: '850px' }}>
                <Card.Body className="p-4">
                    {/* Header Section */}
                    <OrderFormHeader
                        formData={formData}
                        onFormDataChange={handleFormDataChange}
                        companyId={effectiveCompanyId}
                        currentUser={currentUser || propCurrentUser}
                        currentCompany={currentCompany}
                        addToast={addToast}
                        errors={errors}
                        disabled={saving}
                    />

                    {/* Product Section */}
                    <OrderFormProductSection
                        formData={formData}
                        onFormDataChange={handleFormDataChange}
                        companyId={effectiveCompanyId}
                        currentUser={currentUser || propCurrentUser}
                        addToast={addToast}
                        errors={errors}
                        disabled={saving}
                    />

                    {/* Totals and Actions Section - Compact Layout */}
                    <Row className="mb-2">
                        <Col md={7}>
                            {/* Totals Display - Compact */}
                            <Card className="border-2 bg-light h-100" style={{ borderColor: '#000' }}>
                                <Card.Body className="p-2">
                                    <Row className="g-2 align-items-center">
                                        <Col xs={6}>
                                            <div style={{ fontSize: '11px' }}>
                                                <div className="mb-1"><strong>Items: {totals.totalQuantity}</strong></div>
                                                <div className="mb-1"><strong>Subtotal: ₹{totals.subtotal.toFixed(2)}</strong></div>
                                                {formData.gstType === 'gst' && (
                                                    <div><strong>GST: ₹{totals.gstAmount.toFixed(2)}</strong></div>
                                                )}
                                            </div>
                                        </Col>
                                        <Col xs={6} className="text-end">
                                            <div className="text-primary fw-bold" style={{ fontSize: '16px' }}>
                                                <strong>₹{totals.grandTotal.toFixed(2)}</strong>
                                            </div>
                                            <div className="text-muted" style={{ fontSize: '10px' }}>
                                                {formData.gstType === 'gst' ? 'GST Inclusive' : 'Non-GST'}
                                            </div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={5} className="d-flex align-items-center justify-content-end">
                            {/* Action Buttons - Compact */}
                            <div className="d-flex gap-2">
                                <Button
                                    style={{
                                        backgroundColor: '#90EE90',
                                        borderColor: '#000',
                                        color: '#000',
                                        fontSize: '12px',
                                        padding: '8px 16px',
                                        fontWeight: 'bold',
                                        minWidth: '100px'
                                    }}
                                    onClick={handleSave}
                                    disabled={isSaveDisabled()}
                                    className="border-2"
                                    title={getSaveButtonTitle()}
                                >
                                    {saving ? (
                                        <>
                                            <Spinner size="sm" className="me-1" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <FontAwesomeIcon icon={faSave} className="me-1" />
                                            Save
                                            {isLoadingUser && (
                                                <Spinner size="sm" className="ms-1" />
                                            )}
                                        </>
                                    )}
                                </Button>

                                {onCancel && (
                                    <Button
                                        variant="secondary"
                                        onClick={onCancel}
                                        disabled={saving}
                                        className="border-2"
                                        style={{
                                            borderColor: '#000',
                                            fontSize: '12px',
                                            padding: '8px 16px',
                                            fontWeight: 'bold',
                                            minWidth: '80px'
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        </Col>
                    </Row>

                    {/* Validation Errors - Compact */}
                    {(Object.keys(errors).length > 0 || userError) && (
                        <Row>
                            <Col md={12}>
                                <Alert variant="danger" className="p-2 mb-0">
                                    <div style={{ fontSize: '11px' }}>
                                        <strong>Please fix the following issues:</strong>
                                        <ul className="mb-0 mt-1" style={{ paddingLeft: '16px' }}>
                                            {userError && (
                                                <li>
                                                    <strong>User Error:</strong> {userError}
                                                    <Button
                                                        variant="link"
                                                        size="sm"
                                                        className="p-0 ms-1 text-decoration-none"
                                                        style={{ fontSize: '10px' }}
                                                        onClick={retryUserFetch}
                                                        disabled={isLoadingUser}
                                                    >
                                                        (Retry)
                                                    </Button>
                                                </li>
                                            )}

                                            {Object.entries(errors).map(([field, message]) => (
                                                <li key={field}>
                                                    {message}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </Alert>
                            </Col>
                        </Row>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
}

export default SimpleQuotationForm;