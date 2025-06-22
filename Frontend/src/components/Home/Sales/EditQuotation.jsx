import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

import SalesForm from './SalesInvoice/SalesForm';
import saleOrderService from '../../../services/saleOrderService';
import itemService from '../../../services/itemService';

function EditQuotation({ addToast }) {
    const { companyId, transactionId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [quotation, setQuotation] = useState(null);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [error, setError] = useState(null);

    // Mock categories - replace with actual API call
    const mockCategories = [
        { id: 1, name: 'Electronics', description: 'Electronic items and gadgets', isActive: true },
        { id: 2, name: 'Furniture', description: 'Office and home furniture', isActive: true },
        { id: 3, name: 'Stationery', description: 'Office supplies and stationery', isActive: true },
        { id: 4, name: 'Services', description: 'Professional services', isActive: true },
        { id: 5, name: 'Hardware', description: 'Computer hardware components', isActive: true },
        { id: 6, name: 'Software', description: 'Software licenses and subscriptions', isActive: true },
        { id: 7, name: 'Accessories', description: 'Various accessories', isActive: true },
        { id: 8, name: 'Tools', description: 'Professional tools and equipment', isActive: true }
    ];

    useEffect(() => {
        if (companyId && transactionId) {
            loadQuotationAndData();
        }
    }, [companyId, transactionId]);

    const loadQuotationAndData = async () => {
        try {
            setLoading(true);
            setError(null);

            await Promise.all([
                loadQuotation(),
                loadInventoryItems()
            ]);

            setCategories(mockCategories);

        } catch (error) {
            console.error('Error loading data:', error);
            setError(error.message);
            addToast?.('Failed to load quotation for editing', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadQuotation = async () => {
        try {
            const response = await saleOrderService.getQuotationById(transactionId);

            if (response.success && response.data) {
                const quotationData = response.data;

                // Transform the data to match SalesForm expectations
                const transformedQuotation = {
                    id: quotationData._id || quotationData.id,
                    quotationNumber: quotationData.quotationNumber || quotationData.orderNo,
                    quotationDate: quotationData.quotationDate || quotationData.orderDate,
                    validUntil: quotationData.validUntil,

                    // Customer information
                    customer: quotationData.customer || {
                        name: quotationData.customerName || quotationData.partyName,
                        mobile: quotationData.customerMobile || quotationData.partyPhone,
                        email: quotationData.customerEmail || quotationData.partyEmail,
                        address: quotationData.customerAddress || quotationData.partyAddress,
                        gstNumber: quotationData.customerGstNumber || quotationData.partyGstNumber
                    },
                    customerName: quotationData.customerName || quotationData.partyName,
                    customerMobile: quotationData.customerMobile || quotationData.partyPhone,
                    customerEmail: quotationData.customerEmail || quotationData.partyEmail,
                    customerAddress: quotationData.customerAddress || quotationData.partyAddress,
                    customerGstNumber: quotationData.customerGstNumber || quotationData.partyGstNumber,

                    // Items
                    items: quotationData.items || [],

                    // Totals
                    totals: quotationData.totals || {
                        subtotal: quotationData.subtotal || 0,
                        totalTax: quotationData.totalTax || 0,
                        finalTotal: quotationData.amount || quotationData.finalTotal || 0
                    },

                    // GST and Tax settings
                    gstEnabled: quotationData.gstEnabled !== undefined ? quotationData.gstEnabled : true,
                    taxMode: quotationData.taxMode || 'without-tax',
                    priceIncludesTax: quotationData.priceIncludesTax || false,

                    // Quotation specific fields
                    status: quotationData.status || 'draft',
                    priority: quotationData.priority || 'normal',
                    notes: quotationData.notes || quotationData.description || '',
                    termsAndConditions: quotationData.termsAndConditions || '',
                    roundOffEnabled: quotationData.roundOffEnabled || false,
                    roundOffValue: quotationData.roundOffValue || 0,
                    convertedToInvoice: quotationData.convertedToInvoice || false,

                    // Keep original data for reference
                    originalData: quotationData
                };

                setQuotation(transformedQuotation);
                return transformedQuotation;
            } else {
                throw new Error(response.message || 'Failed to load quotation');
            }
        } catch (error) {
            console.error('Error loading quotation:', error);
            throw error;
        }
    };

    const loadInventoryItems = async () => {
        try {
            if (itemService?.getItems) {
                const response = await itemService.getItems(companyId);

                if (response.success && response.data?.items) {
                    setInventoryItems(response.data.items);
                    return response.data.items;
                } else {
                    setInventoryItems([]);
                    return [];
                }
            } else {
                setInventoryItems([]);
                return [];
            }
        } catch (error) {
            console.error('Error loading inventory items:', error);
            setInventoryItems([]);
            return [];
        }
    };

    const handleSave = async (formData) => {
        try {
            setSaving(true);

            console.log('💾 Saving updated quotation data:', formData);

            // Prepare the data for update
            const updateData = {
                companyId: companyId,
                quotationNumber: formData.quotationNumber,
                quotationDate: formData.quotationDate,
                validUntil: formData.validUntil,

                // Customer data
                customer: formData.customer,
                customerName: formData.customerName,
                customerMobile: formData.customerMobile,
                customerEmail: formData.customerEmail,
                customerAddress: formData.customerAddress,
                customerGstNumber: formData.customerGstNumber,

                // Items and totals
                items: formData.items || [],
                totals: formData.totals,

                // Tax settings
                gstEnabled: formData.gstEnabled,
                taxMode: formData.taxMode,
                priceIncludesTax: formData.priceIncludesTax,

                // Quotation specific fields
                status: formData.status || 'draft',
                priority: formData.priority || 'normal',
                notes: formData.notes,
                termsAndConditions: formData.termsAndConditions,
                roundOffEnabled: formData.roundOffEnabled,
                roundOffValue: formData.roundOffValue,

                // Update metadata
                lastModified: new Date().toISOString(),
                modifiedBy: 'current-user' // Replace with actual user ID
            };

            const response = await saleOrderService.updateQuotation(transactionId, updateData);

            if (response.success) {
                addToast?.('Quotation updated successfully!', 'success');

                // Navigate back to quotations list after a short delay
                setTimeout(() => {
                    navigate(`/companies/${companyId}/quotations`);
                }, 1500);

                return response;
            } else {
                throw new Error(response.message || 'Failed to update quotation');
            }
        } catch (error) {
            console.error('Error updating quotation:', error);
            addToast?.('Failed to update quotation: ' + error.message, 'error');
            throw error;
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (saving) {
            return; // Prevent navigation while saving
        }

        navigate(`/companies/${companyId}/quotations`);
    };

    const handleAddItem = async (productData) => {
        try {
            if (itemService?.createItem) {
                const response = await itemService.createItem(companyId, productData);

                if (response.success) {
                    setInventoryItems(prev => [...prev, response.data]);
                    addToast?.(`Item "${productData.name}" added successfully`, 'success');

                    return {
                        success: true,
                        data: response.data,
                        message: `Item "${productData.name}" added successfully`
                    };
                } else {
                    throw new Error(response.message || 'Failed to add item');
                }
            } else {
                throw new Error('Item service not available');
            }
        } catch (error) {
            addToast?.('Error adding item to inventory', 'error');
            return {
                success: false,
                error: error.message,
                message: 'Error adding item to inventory'
            };
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="edit-quotation">
                <Container className="d-flex justify-content-center align-items-center min-vh-100">
                    <div className="text-center">
                        <Spinner animation="border" role="status" className="mb-3" style={{ width: '3rem', height: '3rem' }}>
                            <span className="visually-hidden">Loading...</span>
                        </Spinner>
                        <h5 className="text-muted">Loading quotation for editing...</h5>
                        <p className="text-muted">Please wait while we fetch the quotation details.</p>
                    </div>
                </Container>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="edit-quotation">
                <Container className="py-4">
                    <Alert variant="danger" className="text-center">
                        <FontAwesomeIcon icon={faExclamationTriangle} size="3x" className="mb-3 text-danger" />
                        <h5>Error Loading Quotation</h5>
                        <p className="mb-3">{error}</p>
                        <div className="d-flex gap-2 justify-content-center">
                            <Button
                                variant="outline-primary"
                                onClick={() => loadQuotationAndData()}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                                        Retrying...
                                    </>
                                ) : (
                                    'Try Again'
                                )}
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => navigate(`/companies/${companyId}/quotations`)}
                            >
                                <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                                Back to Quotations
                            </Button>
                        </div>
                    </Alert>
                </Container>
            </div>
        );
    }

    // Main edit form
    return (
        <div className="edit-quotation">
            {/* Header */}
            <div className="bg-white border-bottom sticky-top" style={{ zIndex: 1020, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <Container fluid className="px-4">
                    <Row className="align-items-center py-3">
                        <Col>
                            <div className="d-flex align-items-center">
                                <Button
                                    variant="outline-secondary"
                                    onClick={handleCancel}
                                    className="me-3"
                                    disabled={saving}
                                    style={{
                                        borderColor: '#0ea5e9',
                                        color: '#0ea5e9',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                                    Back to Quotations
                                </Button>
                                <div>
                                    <span className="fw-semibold text-info" style={{ fontSize: '1.1rem' }}>
                                        Edit Quotation {quotation?.quotationNumber}
                                    </span>
                                    {saving && (
                                        <div className="mt-1">
                                            <small className="text-muted">
                                                <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                                                Saving changes...
                                            </small>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Col>
                        <Col xs="auto">
                            <div className="d-flex align-items-center gap-2">
                                <small className="text-muted">
                                    Status: <Badge bg="info">{quotation?.status || 'Draft'}</Badge>
                                </small>
                                {quotation?.convertedToInvoice && (
                                    <Badge bg="success">✅ Converted</Badge>
                                )}
                                {quotation?.originalData?.createdAt && (
                                    <small className="text-muted">
                                        Created: {new Date(quotation.originalData.createdAt).toLocaleDateString()}
                                    </small>
                                )}
                            </div>
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* Edit Form */}
            <SalesForm
                editingSale={quotation}
                onSave={handleSave}
                onCancel={handleCancel}
                onExit={handleCancel}
                companyId={companyId}
                inventoryItems={inventoryItems}
                categories={categories}
                onAddItem={handleAddItem}
                loading={saving}
                mode="quotations"
                documentType="quotation"
                formType="quotation"
                pageTitle="Edit Quotation"
                addToast={addToast}
                isEditMode={true}
                isQuotationMode={true}
                // Additional props for edit mode
                originalTransaction={quotation?.originalData}
                transactionId={transactionId}
            />
        </div>
    );
}

export default EditQuotation;