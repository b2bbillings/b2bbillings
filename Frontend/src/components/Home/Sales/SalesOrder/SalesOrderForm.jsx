import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Container, Row, Col, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFileInvoice,
    faSave,
    faSpinner,
    faExclamationTriangle,
    faCalculator,
    faTimes,
    faArrowLeft
} from '@fortawesome/free-solid-svg-icons';

// ✅ CORRECTED: Import the required components
import OrderFormHeader from './SalesOrderForm/OrderFormHeader';
import OrderFormProductSection from './SalesOrderForm/OrderFormProductSection';
import saleOrderService from '../../../../services/saleOrderService';

function SalesOrderForm({
    show = false,
    onHide,
    onSaveOrder,
    orderType = 'quotation',
    currentCompany,
    currentUser,
    companyId: propCompanyId,
    addToast,
    onNavigate,
    isOnline = true,
    editMode = false,
    existingOrder = null,
    orderId = null,
    // ✅ NEW: Add page mode support
    isPageMode = false, // When true, renders as full page instead of modal
    onCancel = null     // For page mode cancel action
}) {
    const { companyId: urlCompanyId } = useParams();
    const navigate = useNavigate();

    const companyId = propCompanyId || urlCompanyId;
    const isQuotationMode = orderType === 'quotation';

    // ✅ Form state for order/quotation data
    const [formData, setFormData] = useState({
        // Header fields
        gstType: 'gst',
        deliveryDate: '',
        partyName: '',
        selectedParty: '',
        partyPhone: '',
        partyEmail: '',
        partyAddress: '',
        partyGstNumber: '',
        orderDate: new Date().toISOString().split('T')[0],
        orderNumber: '',
        quotationDate: new Date().toISOString().split('T')[0],
        quotationNumber: '',
        employeeName: '',
        employeeId: '',

        // Product fields
        items: [],
        invoiceDescription: '',

        // Totals (calculated)
        subtotal: 0,
        totalTax: 0,
        finalTotal: 0,
        roundOffValue: 0,
        finalTotalWithRoundOff: 0
    });

    // ✅ UI state
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);

    // ✅ Load existing order/quotation for edit mode
    useEffect(() => {
        if (editMode && (existingOrder || orderId)) {
            loadExistingOrder();
        }
    }, [editMode, existingOrder, orderId]);

    const loadExistingOrder = async () => {
        setLoading(true);
        try {
            let orderData = existingOrder;

            // If we have an ID but no data, fetch it
            if (!orderData && orderId) {
                const response = await saleOrderService.getSalesOrder(orderId);
                if (response?.success) {
                    orderData = response.data;
                } else {
                    throw new Error('Failed to load order data');
                }
            }

            if (orderData) {
                setFormData({
                    gstType: orderData.gstType || 'gst',
                    deliveryDate: orderData.deliveryDate || '',
                    partyName: orderData.partyName || orderData.customerName || '',
                    selectedParty: orderData.selectedParty || orderData.customerId || '',
                    partyPhone: orderData.partyPhone || orderData.customerPhone || '',
                    partyEmail: orderData.partyEmail || orderData.customerEmail || '',
                    partyAddress: orderData.partyAddress || orderData.customerAddress || '',
                    partyGstNumber: orderData.partyGstNumber || orderData.customerGstNumber || '',
                    orderDate: orderData.orderDate || orderData.quotationDate || new Date().toISOString().split('T')[0],
                    orderNumber: orderData.orderNo || orderData.quotationNumber || '',
                    quotationDate: orderData.quotationDate || orderData.orderDate || new Date().toISOString().split('T')[0],
                    quotationNumber: orderData.quotationNumber || orderData.orderNo || '',
                    employeeName: orderData.employeeName || '',
                    employeeId: orderData.employeeId || '',
                    items: orderData.items || [],
                    invoiceDescription: orderData.invoiceDescription || orderData.description || '',
                    subtotal: orderData.subtotal || 0,
                    totalTax: orderData.totalTax || 0,
                    finalTotal: orderData.finalTotal || orderData.totalAmount || 0,
                    roundOffValue: orderData.roundOffValue || 0,
                    finalTotalWithRoundOff: orderData.finalTotalWithRoundOff || orderData.totalAmount || 0
                });
            }
        } catch (error) {
            console.error('Error loading existing order:', error);
            addToast?.(`Error loading ${isQuotationMode ? 'quotation' : 'order'} data: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // ✅ Calculate totals when items change
    useEffect(() => {
        calculateTotals();
    }, [formData.items, formData.gstType]);

    const calculateTotals = () => {
        const items = formData.items || [];

        let subtotal = 0;
        let totalTax = 0;

        items.forEach(item => {
            const itemSubtotal = parseFloat(item.subtotal || 0);
            const itemTax = parseFloat(item.gstAmount || item.totalTaxAmount || 0);

            subtotal += itemSubtotal;
            if (formData.gstType === 'gst') {
                totalTax += itemTax;
            }
        });

        const finalTotal = subtotal + (formData.gstType === 'gst' ? totalTax : 0);
        const roundOffValue = Math.round(finalTotal) - finalTotal;
        const finalTotalWithRoundOff = Math.round(finalTotal);

        setFormData(prev => ({
            ...prev,
            subtotal: Math.round(subtotal * 100) / 100,
            totalTax: Math.round(totalTax * 100) / 100,
            finalTotal: Math.round(finalTotal * 100) / 100,
            roundOffValue: Math.round(roundOffValue * 100) / 100,
            finalTotalWithRoundOff
        }));
    };

    // ✅ Handle form data changes
    const handleFormDataChange = useCallback((field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: null
            }));
        }
    }, [errors]);

    // ✅ Validate form
    const validateForm = () => {
        const newErrors = {};

        // Header validation
        if (!formData.gstType) {
            newErrors.gstType = 'GST type is required';
        }

        if (!formData.partyName && !formData.selectedParty) {
            newErrors.partyName = 'Please select a customer';
        }

        const dateField = isQuotationMode ? 'quotationDate' : 'orderDate';
        const numberField = isQuotationMode ? 'quotationNumber' : 'orderNumber';

        if (!formData[dateField]) {
            newErrors[dateField] = `${isQuotationMode ? 'Quotation' : 'Order'} date is required`;
        }

        if (!formData[numberField]) {
            newErrors[numberField] = `${isQuotationMode ? 'Quotation' : 'Order'} number is required`;
        }

        // Product validation
        if (!formData.items || formData.items.length === 0) {
            newErrors.items = 'At least one product is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ✅ Handle save
    const handleSave = async () => {
        if (!validateForm()) {
            addToast?.('Please fix the errors before saving', 'error');
            return;
        }

        setSaving(true);

        try {
            // Prepare order/quotation data
            const orderData = {
                companyId,
                documentType: isQuotationMode ? 'quotation' : 'sales_order',
                orderType: isQuotationMode ? 'quotation' : 'sales_order',
                mode: isQuotationMode ? 'quotations' : 'sales_orders',

                // Header data
                gstType: formData.gstType,
                gstEnabled: formData.gstType === 'gst',
                deliveryDate: formData.deliveryDate,

                // Date and number fields
                ...(isQuotationMode ? {
                    quotationDate: formData.quotationDate,
                    quotationNumber: formData.quotationNumber,
                    orderDate: formData.quotationDate,
                } : {
                    orderDate: formData.orderDate,
                    orderNo: formData.orderNumber,
                    quotationDate: formData.orderDate,
                }),

                // Customer data
                customerId: formData.selectedParty,
                customerName: formData.partyName,
                customerPhone: formData.partyPhone,
                customerEmail: formData.partyEmail,
                customerAddress: formData.partyAddress,
                customerGstNumber: formData.partyGstNumber,

                // Employee data
                employeeName: formData.employeeName,
                employeeId: formData.employeeId,

                // Product data
                items: formData.items,
                invoiceDescription: formData.invoiceDescription,
                description: formData.invoiceDescription,

                // Totals
                subtotal: formData.subtotal,
                totalTax: formData.totalTax,
                finalTotal: formData.finalTotal,
                totalAmount: formData.finalTotalWithRoundOff,
                roundOffValue: formData.roundOffValue,

                // Enhanced totals object
                totals: {
                    subtotal: formData.subtotal,
                    totalTaxAmount: formData.totalTax,
                    totalCgstAmount: formData.totalTax / 2,
                    totalSgstAmount: formData.totalTax / 2,
                    totalIgstAmount: 0,
                    roundOffValue: formData.roundOffValue,
                    finalTotal: formData.finalTotalWithRoundOff
                },

                // Status
                status: 'draft',
                ...(isQuotationMode && { quotationStatus: 'active' }),

                // Metadata
                createdBy: currentUser?.name || 'System',
                updatedBy: currentUser?.name || 'System',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            console.log(`💾 Saving ${isQuotationMode ? 'quotation' : 'sales order'}:`, orderData);

            let result;
            if (onSaveOrder) {
                result = await onSaveOrder(orderData);
            } else {
                if (editMode && (existingOrder?.id || existingOrder?._id || orderId)) {
                    const id = existingOrder?.id || existingOrder?._id || orderId;
                    result = await saleOrderService.updateSalesOrder(id, orderData);
                } else {
                    result = await saleOrderService.createSalesOrder(orderData);
                }
            }

            if (result?.success) {
                const docType = isQuotationMode ? 'Quotation' : 'Sales Order';
                const action = editMode ? 'updated' : 'created';
                addToast?.(`${docType} ${action} successfully!`, 'success');

                // ✅ FIXED: Handle both modal and page mode
                setTimeout(() => {
                    if (isPageMode) {
                        // Navigate back to list for page mode
                        if (isQuotationMode) {
                            navigate(`/companies/${companyId}/quotations`);
                        } else {
                            navigate(`/companies/${companyId}/sales-orders`);
                        }
                    } else {
                        // Close modal for modal mode
                        if (onHide) {
                            onHide();
                        }
                    }
                }, 1000);
            } else {
                throw new Error(result?.error || result?.message || `Failed to save ${isQuotationMode ? 'quotation' : 'sales order'}`);
            }

        } catch (error) {
            console.error(`❌ Error saving ${isQuotationMode ? 'quotation' : 'sales order'}:`, error);
            addToast?.(`Error saving ${isQuotationMode ? 'quotation' : 'sales order'}: ${error.message}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ✅ Handle close/cancel
    const handleClose = () => {
        if (isPageMode) {
            // For page mode, use custom cancel handler or navigate back
            if (onCancel) {
                onCancel();
            } else {
                if (isQuotationMode) {
                    navigate(`/companies/${companyId}/quotations`);
                } else {
                    navigate(`/companies/${companyId}/sales-orders`);
                }
            }
        } else {
            // For modal mode, use onHide
            if (onHide) {
                onHide();
            }
        }
    };

    // ✅ Validation checks
    if (!companyId) {
        const errorContent = (
            <Alert variant="warning" className="text-center">
                <h5>⚠️ No Company Selected</h5>
                <p className="mb-0">
                    Please select a company to manage {isQuotationMode ? 'quotations' : 'sales orders'}.
                </p>
            </Alert>
        );

        if (isPageMode) {
            return (
                <Container className="py-4">
                    {errorContent}
                </Container>
            );
        } else {
            return (
                <Modal show={show} onHide={onHide} size="lg" backdrop="static">
                    <Modal.Body>{errorContent}</Modal.Body>
                </Modal>
            );
        }
    }

    if (!isOnline) {
        const errorContent = (
            <Alert variant="warning" className="text-center">
                <h5>📡 No Internet Connection</h5>
                <p className="mb-0">
                    {isQuotationMode ? 'Quotations' : 'Sales Orders'} data requires an internet connection.
                </p>
            </Alert>
        );

        if (isPageMode) {
            return (
                <Container className="py-4">
                    {errorContent}
                </Container>
            );
        } else {
            return (
                <Modal show={show} onHide={onHide} size="lg" backdrop="static">
                    <Modal.Body>{errorContent}</Modal.Body>
                </Modal>
            );
        }
    }

    // ✅ Main form content
    const formContent = (
        <>
            {/* Error Alert */}
            {Object.keys(errors).length > 0 && (
                <Alert variant="danger" className="mb-3">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                    <strong>Please fix the following errors:</strong>
                    <ul className="mb-0 mt-2">
                        {Object.entries(errors).map(([field, error]) => (
                            <li key={field}>{error}</li>
                        ))}
                    </ul>
                </Alert>
            )}

            <Row>
                <Col lg={8}>
                    {/* ✅ Header Section */}
                    <Card className="mb-3 border-2" style={{ borderColor: '#007bff' }}>
                        <Card.Header className="bg-primary text-white">
                            <h6 className="mb-0">
                                <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                                {isQuotationMode ? 'Quotation' : 'Sales Order'} Details
                            </h6>
                        </Card.Header>
                        <Card.Body>
                            <OrderFormHeader
                                formData={formData}
                                onFormDataChange={handleFormDataChange}
                                companyId={companyId}
                                currentUser={currentUser}
                                currentCompany={currentCompany}
                                addToast={addToast}
                                errors={errors}
                                disabled={saving}
                                isQuotationMode={isQuotationMode}
                            />
                        </Card.Body>
                    </Card>

                    {/* ✅ Products Section */}
                    <Card className="mb-3 border-2" style={{ borderColor: '#28a745' }}>
                        <Card.Header className="bg-success text-white">
                            <h6 className="mb-0">
                                <FontAwesomeIcon icon={faCalculator} className="me-2" />
                                Products & Services
                            </h6>
                        </Card.Header>
                        <Card.Body>
                            <OrderFormProductSection
                                formData={formData}
                                onFormDataChange={handleFormDataChange}
                                companyId={companyId}
                                currentUser={currentUser}
                                addToast={addToast}
                                errors={errors}
                                disabled={saving}
                                isQuotationMode={isQuotationMode}
                            />
                        </Card.Body>
                    </Card>
                </Col>

                {/* ✅ Summary Sidebar */}
                <Col lg={4}>
                    <Card className="border-2" style={{ borderColor: '#17a2b8' }}>
                        <Card.Header className="bg-info text-white">
                            <h6 className="mb-0">
                                <FontAwesomeIcon icon={faCalculator} className="me-2" />
                                {isQuotationMode ? 'Quotation' : 'Order'} Summary
                            </h6>
                        </Card.Header>
                        <Card.Body>
                            <div className="order-summary">
                                <div className="d-flex justify-content-between mb-2">
                                    <span>Items:</span>
                                    <strong>{formData.items?.length || 0}</strong>
                                </div>

                                <div className="d-flex justify-content-between mb-2">
                                    <span>Subtotal:</span>
                                    <strong>₹{formData.subtotal.toFixed(2)}</strong>
                                </div>

                                {formData.gstType === 'gst' && (
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>GST:</span>
                                        <strong>₹{formData.totalTax.toFixed(2)}</strong>
                                    </div>
                                )}

                                {formData.roundOffValue !== 0 && (
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Round Off:</span>
                                        <strong>₹{formData.roundOffValue.toFixed(2)}</strong>
                                    </div>
                                )}

                                <hr />

                                <div className="d-flex justify-content-between mb-3">
                                    <span className="h6">Total:</span>
                                    <strong className="h6 text-primary">₹{formData.finalTotalWithRoundOff.toFixed(2)}</strong>
                                </div>

                                {formData.partyName && (
                                    <div className="bg-light p-2 rounded">
                                        <h6 className="mb-1 small">Customer Details</h6>
                                        <div className="small"><strong>{formData.partyName}</strong></div>
                                        {formData.partyPhone && <div className="small">📞 {formData.partyPhone}</div>}
                                        {formData.partyEmail && <div className="small">✉️ {formData.partyEmail}</div>}
                                    </div>
                                )}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </>
    );

    // ✅ Loading state
    const loadingContent = (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
            <div className="text-center">
                <Spinner animation="border" role="status" className="mb-3">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
                <p className="text-muted">Loading form...</p>
            </div>
        </div>
    );

    // ✅ Action buttons
    const actionButtons = (
        <>
            <Button
                variant="outline-secondary"
                onClick={handleClose}
                disabled={saving}
                className="me-2"
            >
                {isPageMode && <FontAwesomeIcon icon={faArrowLeft} className="me-2" />}
                Cancel
            </Button>
            <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving || !formData.items?.length}
            >
                {saving ? (
                    <>
                        <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                        Saving...
                    </>
                ) : (
                    <>
                        <FontAwesomeIcon icon={faSave} className="me-2" />
                        {editMode ? 'Update' : 'Save'} {isQuotationMode ? 'Quotation' : 'Order'}
                    </>
                )}
            </Button>
        </>
    );

    // ✅ FIXED: Render based on mode
    if (isPageMode) {
        // ✅ Page mode - render as full page
        return (
            <div className="sales-order-page" style={{
                width: '100%',
                minHeight: '100vh',
                backgroundColor: '#f8f9fa'
            }}>
                {/* Page Header */}
                <div className="page-header bg-white border-bottom sticky-top">
                    <Container>
                        <div className="d-flex justify-content-between align-items-center py-3">
                            <div className="d-flex align-items-center">
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={handleClose}
                                    className="me-3"
                                    disabled={saving}
                                >
                                    <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                                    Back
                                </Button>
                                <div>
                                    <h4 className="mb-0">
                                        <FontAwesomeIcon icon={faFileInvoice} className="me-2 text-primary" />
                                        {editMode ? 'Edit' : 'Create'} {isQuotationMode ? 'Quotation' : 'Sales Order'}
                                    </h4>
                                    {(formData.quotationNumber || formData.orderNumber) && (
                                        <small className="text-muted">
                                            #{formData.quotationNumber || formData.orderNumber}
                                        </small>
                                    )}
                                </div>
                            </div>
                            <div>
                                {actionButtons}
                            </div>
                        </div>
                    </Container>
                </div>

                {/* Page Content */}
                <Container className="py-4">
                    {loading ? loadingContent : formContent}
                </Container>
            </div>
        );
    } else {
        // ✅ Modal mode - render as modal
        return (
            <Modal show={show} onHide={handleClose} size="xl" backdrop="static" className="sales-order-form-modal">
                <Modal.Header className="bg-primary text-white">
                    <Modal.Title className="d-flex align-items-center">
                        <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                        {editMode ? 'Edit' : 'Create'} {isQuotationMode ? 'Quotation' : 'Sales Order'}
                        {(formData.quotationNumber || formData.orderNumber) && (
                            <span className="ms-2 badge bg-light text-dark">
                                {formData.quotationNumber || formData.orderNumber}
                            </span>
                        )}
                    </Modal.Title>
                    <Button variant="light" size="sm" onClick={handleClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </Button>
                </Modal.Header>

                <Modal.Body className="p-0">
                    <Container fluid className="py-3">
                        {loading ? loadingContent : formContent}
                    </Container>
                </Modal.Body>

                <Modal.Footer className="bg-light">
                    {actionButtons}
                </Modal.Footer>
            </Modal>
        );
    }
}

export default SalesOrderForm;