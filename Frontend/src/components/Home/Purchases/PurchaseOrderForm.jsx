import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faUser, faRefresh } from '@fortawesome/free-solid-svg-icons';
import { useParams } from 'react-router-dom';
import purchaseOrderService from '../../../services/purchaseOrderService';
import authService from '../../../services/authService';
import PurchaseOrderFormHeader from './PurchaseOrderForm/PurchaseOrderFormHeader';
import PurchaseOrderFormProductSelection from './PurchaseOrderForm/PurchaseOrderFormProductSelection';

function PurchaseOrderForm({
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
        purchaseDate: new Date().toISOString().split('T')[0],
        purchaseOrderNumber: '',
        employeeName: '',
        employeeId: '',
        selectedEmployee: '',
        description: '',

        // Party/Supplier selection
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
            purchasePrice: '',
            unit: 'pcs',
            gstMode: 'exclude',
            gstRate: 18,
            subtotal: 0,
            gstAmount: 0,
            totalAmount: 0,
            availableStock: 0,
            hsnNumber: ''
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
                items: editingOrder.items || prev.items,
                // Map purchase order specific fields
                purchaseOrderNumber: editingOrder.purchaseOrderNumber || editingOrder.orderNumber,
                purchaseDate: editingOrder.purchaseDate || editingOrder.orderDate,
                deliveryDate: editingOrder.deliveryDate || editingOrder.expectedDeliveryDate
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

    // ✅ Enhanced form data handler with cleaner GST calculation
    const handleFormDataChange = (field, value) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };

            // Handle GST type change - recalculate all item totals
            if (field === 'gstType' || field === '_gstTypeChanged') {
                newData.items = (newData.items || []).map(item => {
                    if (item.quantity && item.price) {
                        return calculateItemTotals(item, newData.gstType);
                    }
                    return item;
                });
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

    // ✅ Extracted calculation logic for better maintainability
    const calculateItemTotals = (item, gstType) => {
        const quantity = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        const gstRate = parseFloat(item.gstRate) || 0;

        let subtotal = quantity * price;
        let gstAmount = 0;
        let totalAmount = 0;

        if (gstType === 'gst') {
            if (item.gstMode === 'include') {
                totalAmount = subtotal;
                gstAmount = (subtotal * gstRate) / (100 + gstRate);
                subtotal = totalAmount - gstAmount;
            } else {
                gstAmount = (subtotal * gstRate) / 100;
                totalAmount = subtotal + gstAmount;
            }
        } else {
            totalAmount = subtotal;
            gstAmount = 0;
        }

        return {
            ...item,
            subtotal: Math.round(subtotal * 100) / 100,
            gstAmount: Math.round(gstAmount * 100) / 100,
            totalAmount: Math.round(totalAmount * 100) / 100
        };
    };

    // ✅ Enhanced validation with better error messages
    const validateForm = () => {
        const newErrors = {};

        // Required field validations
        const requiredFields = [
            { field: 'partyName', message: 'Please select a supplier' },
            { field: 'purchaseOrderNumber', message: 'Purchase order number is required' },
            { field: 'purchaseDate', message: 'Purchase date is required' },
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
                    newErrors[`items.${index}.price`] = 'Purchase price is required';
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

    // ✅ Enhanced save handler with better data mapping for purchase orders
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

            // ✅ Clean data mapping for purchase order backend
            const purchaseOrderData = {
                purchaseOrderNumber: formData.purchaseOrderNumber,
                purchaseDate: formData.purchaseDate,
                deliveryDate: formData.deliveryDate,
                expectedDeliveryDate: formData.deliveryDate,
                orderType: 'purchase_order',

                // Supplier information
                supplierName: formData.partyName,
                supplierMobile: formData.partyPhone,
                supplierEmail: formData.partyEmail,
                supplierAddress: formData.partyAddress,
                supplierGstNumber: formData.partyGstNumber,

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

                // Items with dual field mapping for backend compatibility - PURCHASE FOCUSED
                items: validItems.map((item, index) => ({
                    lineNumber: index + 1,
                    // Product information (dual mapping)
                    productName: item.productName,
                    itemName: item.productName,
                    productCode: item.productCode,
                    itemCode: item.productCode,
                    description: item.description,
                    hsnNumber: item.hsnNumber,

                    // Quantity and pricing (dual mapping) - PURCHASE PRICE FOCUS
                    quantity: parseFloat(item.quantity),
                    price: parseFloat(item.price), // This is purchase price
                    purchasePrice: parseFloat(item.price),
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

                    // Additional purchase-specific fields
                    availableStock: item.availableStock || 0,
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

            // Use purchaseOrderService instead of saleOrderService
            const response = await purchaseOrderService.createPurchaseOrder(purchaseOrderData);

            if (response.success) {
                addToast?.(`Purchase Order ${formData.purchaseOrderNumber} created successfully!`, 'success');

                if (onSave) {
                    onSave(response.data);
                }

                setTimeout(() => {
                    if (onNavigate) {
                        onNavigate('purchase-orders');
                    }
                }, 1500);
            } else {
                throw new Error(response.message || 'Failed to create purchase order');
            }

        } catch (error) {
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
                    <p className="mt-2">Loading purchase order form...</p>
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
        return "Save purchase order";
    };

    return (
        <Container className="py-3" style={{ backgroundColor: '#FF8C00', minHeight: '100vh' }}>
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

            {/* Main Form Card - Reduced max width */}
            <Card className="mx-auto shadow-lg" style={{ maxWidth: '850px' }}>
                <Card.Body className="p-4">
                    {/* Header Section */}
                    <PurchaseOrderFormHeader
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
                    <PurchaseOrderFormProductSelection
                        formData={formData}
                        onFormDataChange={handleFormDataChange}
                        companyId={effectiveCompanyId}
                        currentUser={currentUser || propCurrentUser}
                        addToast={addToast}
                        errors={errors}
                        disabled={saving}
                    />

                    {/* Description Section - Compact */}
                    <Row className="mb-3">
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label className="fw-bold text-danger small mb-1">
                                    Description
                                </Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    value={formData.description || ''}
                                    onChange={(e) => handleFormDataChange('description', e.target.value)}
                                    className="border-2"
                                    style={{
                                        borderColor: '#000',
                                        fontSize: '12px',
                                        padding: '6px 8px',
                                        resize: 'none'
                                    }}
                                    placeholder="Enter description..."
                                    disabled={saving}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

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
                                            <div className="text-warning fw-bold" style={{ fontSize: '16px' }}>
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
                                        backgroundColor: '#FFD700',
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

export default PurchaseOrderForm;