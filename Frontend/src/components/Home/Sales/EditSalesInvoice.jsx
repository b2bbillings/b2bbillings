// Frontend/src/components/Home/Sales/EditSalesInvoice.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

import SalesForm from './SalesInvoice/SalesForm';
import salesService from '../../../services/salesService';
import saleOrderService from '../../../services/saleOrderService';
import itemService from '../../../services/itemService';

function EditSalesInvoice({ addToast, mode = 'invoices', documentType = 'invoice' }) {
    const { companyId, transactionId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [transaction, setTransaction] = useState(null);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [error, setError] = useState(null);

    // Determine if we're editing quotations or invoices
    const isQuotationsMode = mode === 'quotations' || documentType === 'quotation';

    // Mock categories - you can replace this with actual API call
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

    // ✅ FIXED: Load transaction data
    useEffect(() => {
        if (transactionId && companyId) {
            loadTransactionData();
            loadInventoryItems();
            loadCategories();
        }
    }, [transactionId, companyId, isQuotationsMode]);

    const loadTransactionData = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('📄 Loading transaction data:', {
                transactionId,
                companyId,
                isQuotationsMode,
                mode,
                documentType
            });

            let response;

            if (isQuotationsMode) {
                // Load quotation data
                response = await saleOrderService.getSalesOrderById(transactionId);
            } else {
                // Load sales invoice data
                response = await salesService.getInvoiceById(transactionId);
            }

            console.log('📥 Transaction response:', response);

            // ✅ FIXED: Handle different response formats
            let transactionData = null;

            if (response && response.success === true && response.data) {
                transactionData = response.data;
            } else if (response && (response.id || response._id)) {
                // Direct data response
                transactionData = response;
            } else if (response && response.success === false) {
                throw new Error(response.message || response.error || 'Failed to load transaction');
            } else {
                throw new Error('Invalid response format from server');
            }

            if (!transactionData) {
                throw new Error('No transaction data received');
            }

            // ✅ FIXED: Enhanced data formatting
            const formattedTransaction = {
                ...transactionData,
                // Core ID mapping
                id: transactionData._id || transactionData.id,
                _id: transactionData._id || transactionData.id,
                
                // Document number handling
                invoiceNumber: transactionData.invoiceNumber || 
                              transactionData.quotationNumber || 
                              transactionData.documentNumber,
                
                // Date handling
                invoiceDate: transactionData.invoiceDate || 
                            transactionData.quotationDate || 
                            transactionData.date,
                
                // Customer/Party data handling
                customer: transactionData.customer || (transactionData.customerId ? {
                    id: transactionData.customerId,
                    _id: transactionData.customerId,
                    name: transactionData.customerName,
                    mobile: transactionData.customerMobile,
                    email: transactionData.customerEmail,
                    address: transactionData.customerAddress
                } : null),
                
                // Mobile number
                mobileNumber: transactionData.customerMobile || 
                             transactionData.mobileNumber || 
                             transactionData.customer?.mobile || '',
                
                // Items handling with proper structure
                items: (transactionData.items || []).map((item, index) => ({
                    ...item,
                    id: item._id || item.id || `item-${index}-${Date.now()}`,
                    itemRef: item.itemRef || item.productId || item._id,
                    itemName: item.itemName || item.productName || item.name || '',
                    itemCode: item.itemCode || item.productCode || '',
                    hsnCode: item.hsnCode || item.hsnNumber || '0000',
                    quantity: parseFloat(item.quantity) || 0,
                    unit: item.unit || 'PCS',
                    pricePerUnit: parseFloat(item.pricePerUnit || item.price || item.rate) || 0,
                    taxRate: parseFloat(item.taxRate || item.gstRate) || 18,
                    discountPercent: parseFloat(item.discountPercent) || 0,
                    discountAmount: parseFloat(item.discountAmount) || 0,
                    // Tax amounts
                    cgstAmount: parseFloat(item.cgstAmount || item.cgst) || 0,
                    sgstAmount: parseFloat(item.sgstAmount || item.sgst) || 0,
                    igst: parseFloat(item.igst || item.igstAmount) || 0,
                    // Final amount
                    amount: parseFloat(item.amount || item.itemAmount) || 0,
                    // Tax mode
                    taxMode: item.taxMode || (item.priceIncludesTax ? 'with-tax' : 'without-tax'),
                    priceIncludesTax: Boolean(item.priceIncludesTax),
                    // Category and stock
                    category: item.category || '',
                    currentStock: item.currentStock || 0,
                    minStockLevel: item.minStockLevel || 0
                })),
                
                // GST and tax settings
                gstEnabled: Boolean(transactionData.gstEnabled !== false),
                invoiceType: transactionData.invoiceType || (transactionData.gstEnabled ? 'gst' : 'non-gst'),
                taxMode: transactionData.taxMode || 'exclusive',
                priceIncludesTax: Boolean(transactionData.priceIncludesTax),
                
                // Payment information
                payment: transactionData.payment || {
                    method: 'cash',
                    paidAmount: 0,
                    pendingAmount: parseFloat(transactionData.balanceAmount) || 0,
                    status: transactionData.payment?.status || 'pending'
                },
                
                // Additional fields
                notes: transactionData.notes || '',
                status: transactionData.status || 'draft',
                
                // Quotation specific fields
                ...(isQuotationsMode && {
                    quotationValidity: transactionData.quotationValidity || 30,
                    quotationStatus: transactionData.quotationStatus || 'draft'
                }),
                
                // Totals
                totals: transactionData.totals || {
                    subtotal: parseFloat(transactionData.subtotal) || 0,
                    taxAmount: parseFloat(transactionData.taxAmount) || 0,
                    finalTotal: parseFloat(transactionData.finalTotal || transactionData.total) || 0
                }
            };

            console.log('✅ Transaction formatted successfully:', formattedTransaction);
            setTransaction(formattedTransaction);
            
        } catch (err) {
            console.error('❌ Error loading transaction:', err);
            setError(err.message || 'Failed to load transaction data');
        } finally {
            setLoading(false);
        }
    };

    const loadInventoryItems = async () => {
        try {
            if (itemService && itemService.getItems) {
                const response = await itemService.getItems(companyId);
                if (response.success && response.data) {
                    setInventoryItems(response.data);
                }
            }
        } catch (err) {
            console.error('❌ Error loading inventory items:', err);
        }
    };

    const loadCategories = async () => {
        try {
            setCategories(mockCategories);
        } catch (err) {
            console.error('❌ Error loading categories:', err);
            setCategories(mockCategories);
        }
    };

    // ✅ FIXED: Handle save operation
    const handleSave = async (updatedData) => {
        try {
            setSaving(true);
            setError(null);

            console.log('💾 Saving updated transaction:', {
                transactionId,
                isQuotationsMode,
                data: updatedData
            });

            let response;

            // ✅ Prepare data for saving
            const saveData = {
                ...updatedData,
                _id: transactionId,
                companyId: companyId,
                documentType: isQuotationsMode ? 'quotation' : 'invoice',
                mode: isQuotationsMode ? 'quotations' : 'invoices'
            };

            if (isQuotationsMode) {
                // Update quotation
                response = await saleOrderService.updateSalesOrder(transactionId, saveData);
            } else {
                // Update sales invoice
                response = await salesService.updateInvoice(transactionId, saveData);
            }

            console.log('✅ Save response:', response);

            if (response.success) {
                const docType = isQuotationsMode ? 'Quotation' : 'Invoice';
                if (addToast) {
                    addToast(`${docType} updated successfully!`, 'success');
                }

                // Navigate back to list
                setTimeout(() => {
                    if (isQuotationsMode) {
                        navigate(`/companies/${companyId}/quotations`);
                    } else {
                        navigate(`/companies/${companyId}/sales`);
                    }
                }, 1500);

                return response;
            } else {
                throw new Error(response.message || 'Failed to update');
            }
        } catch (error) {
            console.error('❌ Error saving:', error);
            const docType = isQuotationsMode ? 'quotation' : 'invoice';
            if (addToast) {
                addToast(`Failed to update ${docType}: ${error.message}`, 'error');
            }
            throw error;
        } finally {
            setSaving(false);
        }
    };

    // ✅ FIXED: Handle cancel operation
    const handleCancel = () => {
        if (isQuotationsMode) {
            navigate(`/companies/${companyId}/quotations`);
        } else {
            navigate(`/companies/${companyId}/sales`);
        }
    };

    // ✅ FIXED: Handle add item operation
    const handleAddItem = async (itemData) => {
        try {
            if (itemService && itemService.createItem) {
                const response = await itemService.createItem(companyId, itemData);
                if (response.success) {
                    setInventoryItems(prev => [...prev, response.data]);
                    if (addToast) {
                        addToast(`Item "${itemData.name}" added successfully`, 'success');
                    }
                    return response;
                }
            }
        } catch (error) {
            console.error('❌ Error adding item:', error);
            if (addToast) {
                addToast('Failed to add item', 'error');
            }
        }
    };

    // ✅ Debug logging
    useEffect(() => {
        console.log('🔍 EditSalesInvoice state:', {
            loading,
            error,
            hasTransaction: !!transaction,
            transactionId,
            companyId
        });
    }, [loading, error, transaction, transactionId, companyId]);

    // ✅ Loading state
    if (loading) {
        return (
            <Container className="py-5 text-center">
                <div className="d-flex flex-column align-items-center">
                    <div className="mb-4">
                        <Button
                            variant="outline-secondary"
                            onClick={handleCancel}
                            className="d-flex align-items-center"
                        >
                            <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                            Back to {isQuotationsMode ? 'Quotations' : 'Sales'}
                        </Button>
                    </div>
                    
                    <Spinner animation="border" size="lg" className="mb-3" />
                    <h5>Loading {isQuotationsMode ? 'Quotation' : 'Invoice'}...</h5>
                    <p className="text-muted">Please wait while we load the data.</p>
                    
                    {/* Debug info */}
                    <div className="mt-3">
                        <small className="text-muted">
                            Transaction ID: {transactionId}<br />
                            Company ID: {companyId}<br />
                            Mode: {mode}<br />
                            Document Type: {documentType}
                        </small>
                    </div>
                </div>
            </Container>
        );
    }

    // ✅ Error state
    if (error) {
        return (
            <Container className="py-5">
                <div className="mb-4">
                    <Button
                        variant="outline-secondary"
                        onClick={handleCancel}
                        className="d-flex align-items-center"
                    >
                        <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                        Back to {isQuotationsMode ? 'Quotations' : 'Sales'}
                    </Button>
                </div>

                <Alert variant="danger">
                    <Alert.Heading>
                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                        Error Loading {isQuotationsMode ? 'Quotation' : 'Invoice'}
                    </Alert.Heading>
                    <p>{error}</p>
                    <div className="d-flex gap-2">
                        <Button variant="outline-danger" onClick={() => loadTransactionData()}>
                            Try Again
                        </Button>
                        <Button variant="secondary" onClick={handleCancel}>
                            Back to List
                        </Button>
                    </div>
                </Alert>
            </Container>
        );
    }

    // ✅ Transaction not found state
    if (!transaction) {
        return (
            <Container className="py-5">
                <div className="mb-4">
                    <Button
                        variant="outline-secondary"
                        onClick={handleCancel}
                        className="d-flex align-items-center"
                    >
                        <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                        Back to {isQuotationsMode ? 'Quotations' : 'Sales'}
                    </Button>
                </div>

                <Alert variant="warning">
                    <Alert.Heading>
                        {isQuotationsMode ? 'Quotation' : 'Invoice'} Not Found
                    </Alert.Heading>
                    <p>The requested {isQuotationsMode ? 'quotation' : 'invoice'} could not be found.</p>
                    <Button variant="secondary" onClick={handleCancel}>
                        Back to List
                    </Button>
                </Alert>
            </Container>
        );
    }

    // ✅ FIXED: Render the edit form
    return (
        <div className="edit-sales-invoice-container">
            {/* ✅ FIXED: SalesForm with proper props */}
            <SalesForm
                editMode={true}
                existingTransaction={transaction}
                transactionId={transactionId}
                onSave={handleSave}
                onCancel={handleCancel}
                onExit={handleCancel}
                inventoryItems={inventoryItems}
                categories={categories}
                onAddItem={handleAddItem}
                mode={isQuotationsMode ? 'quotations' : 'invoices'}
                documentType={isQuotationsMode ? 'quotation' : 'invoice'}
                formType={isQuotationsMode ? 'quotation' : 'sales'}
                pageTitle={`Edit ${isQuotationsMode ? 'Quotation' : 'Invoice'}`}
                addToast={addToast}
            />
        </div>
    );
}

export default EditSalesInvoice;