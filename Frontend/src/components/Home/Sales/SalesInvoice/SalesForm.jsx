import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import GSTToggle from './SalesForm/GSTToggle';
import CustomerSection from './SalesForm/CustomerSection';
import InvoiceDetails from './SalesForm/InvoiceDetails';
import ItemsTableWithTotals from './SalesForm/itemsTableWithTotals';
import './SalesForm.css';

function SalesForm({
    onSave,
    onCancel,
    onExit,
    inventoryItems = [],
    categories = [],
    onAddItem,
    mode = 'invoices',
    documentType = 'invoice',
    formType = 'sales',
    pageTitle,
    addToast // ✅ ADDED: Required prop for toast notifications
}) {
    // Get companyId from URL params
    const { companyId } = useParams();

    // Alternative: Get companyId from localStorage if not in URL
    const [localCompanyId, setLocalCompanyId] = useState(null);

    // ✅ FIXED: Improved mode detection with proper formType handling
    const isQuotationsMode = mode === 'quotations' || documentType === 'quotation' || formType === 'quotation';

    // ✅ ADDED: Determine effective formType for ItemsTableWithTotals
    const getEffectiveFormType = () => {
        if (isQuotationsMode) {
            return 'quotation';
        }
        return formType === 'purchase' ? 'purchase' : 'sales';
    };

    // ✅ ADDED: Default toast function if not provided
    const defaultAddToast = useCallback((message, type = 'info') => {
        console.log(`🍞 Toast (${type}):`, message);
        // Fallback to alert if no toast system available
        if (type === 'error') {
            alert(`Error: ${message}`);
        }
    }, []);

    const effectiveAddToast = addToast || defaultAddToast;

    useEffect(() => {
        if (!companyId) {
            // Try to get companyId from localStorage
            const storedCompanyId = localStorage.getItem('selectedCompanyId') ||
                localStorage.getItem('companyId') ||
                sessionStorage.getItem('companyId');

            console.log(`🏢 ${isQuotationsMode ? 'QuotationForm' : 'SalesForm'} - CompanyId from storage:`, storedCompanyId);
            setLocalCompanyId(storedCompanyId);
        }
    }, [companyId, isQuotationsMode]);

    // Use companyId from params, fallback to localStorage
    const effectiveCompanyId = companyId || localCompanyId;

    // Generate document number function based on mode
    const generateDocumentNumber = (invoiceType = 'non-gst') => {
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(1000 + Math.random() * 9000);

        if (isQuotationsMode) {
            // Quotation numbering
            if (invoiceType === 'gst') {
                return `QUO-GST-${year}${month}${day}-${random}`;
            } else {
                return `QUO-${year}${month}${day}-${random}`;
            }
        } else {
            // Invoice numbering
            if (invoiceType === 'gst') {
                return `GST-${year}${month}${day}-${random}`;
            } else {
                return `INV-${year}${month}${day}-${random}`;
            }
        }
    };

    // Dynamic field labels based on mode
    const getFieldLabels = () => {
        return isQuotationsMode
            ? {
                documentName: 'Quotation',
                documentNumber: 'Quotation Number',
                documentDate: 'Quote Date',
                documentAction: 'Create Quotation',
                shareAction: 'Share Quotation',
                saveAction: 'Save Quotation',
                customerLabel: 'Quote For',
                notesPlaceholder: 'Add quotation notes, terms & conditions...'
            }
            : {
                documentName: 'Invoice',
                documentNumber: 'Invoice Number',
                documentDate: 'Invoice Date',
                documentAction: 'Create Invoice',
                shareAction: 'Share Invoice',
                saveAction: 'Save Invoice',
                customerLabel: 'Bill To',
                notesPlaceholder: 'Add invoice notes, payment terms...'
            };
    };

    const labels = getFieldLabels();

    // Initialize form data state
    const [formData, setFormData] = useState({
        gstEnabled: true,
        invoiceType: 'gst',
        customer: null,
        mobileNumber: '',
        invoiceNumber: generateDocumentNumber('gst'),
        invoiceDate: new Date().toISOString().split('T')[0],
        items: [],
        paymentMethod: 'cash',
        notes: '',
        // Quotation-specific fields
        quotationValidity: isQuotationsMode ? 30 : undefined,
        quotationStatus: isQuotationsMode ? 'draft' : undefined,
        convertedToInvoice: isQuotationsMode ? false : undefined,
        documentMode: isQuotationsMode ? 'quotation' : 'invoice'
    });

    // Create empty item function
    const createEmptyItem = () => {
        return {
            id: Date.now() + Math.random(),
            itemRef: null,
            itemName: '',
            itemCode: '',
            hsnCode: '',
            quantity: '',
            unit: 'PCS',
            pricePerUnit: '',
            discountPercent: 0,
            discountAmount: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            igst: 0,
            taxRate: formData.gstEnabled ? 18 : 0,
            amount: 0,
            category: '',
            currentStock: 0,
            minStockLevel: 0,
            taxMode: 'without-tax'
        };
    };

    // Initialize items after formData is set
    useEffect(() => {
        if (formData.items.length === 0) {
            setFormData(prev => ({
                ...prev,
                items: [createEmptyItem()]
            }));
        }
    }, [formData.gstEnabled]);

    // Handle invoice type change with mode awareness
    const handleInvoiceTypeChange = (newType) => {
        console.log(`📋 Changing ${labels.documentName.toLowerCase()} type to:`, newType);

        const gstEnabled = newType === 'gst';
        const newDocumentNumber = generateDocumentNumber(newType);

        setFormData(prev => {
            const updatedItems = prev.items.map(item => ({
                ...item,
                taxRate: gstEnabled ? (item.taxRate || 18) : 0,
                cgstAmount: gstEnabled ? item.cgstAmount : 0,
                sgstAmount: gstEnabled ? item.sgstAmount : 0,
                igst: gstEnabled ? item.igst : 0,
                taxAmount: gstEnabled ? item.taxAmount : 0
            }));

            return {
                ...prev,
                invoiceType: newType,
                gstEnabled,
                invoiceNumber: newDocumentNumber,
                items: updatedItems
            };
        });
    };

    // Handle GST toggle change with mode awareness
    const handleGSTToggleChange = (enabled) => {
        console.log(`🔄 GST Toggle changed to:`, enabled, `for ${labels.documentName.toLowerCase()}`);

        const newInvoiceType = enabled ? 'gst' : 'non-gst';
        const newDocumentNumber = generateDocumentNumber(newInvoiceType);

        setFormData(prev => {
            const updatedItems = prev.items.map(item => ({
                ...item,
                taxRate: enabled ? (item.taxRate || 18) : 0,
                cgstAmount: enabled ? item.cgstAmount : 0,
                sgstAmount: enabled ? item.sgstAmount : 0,
                igst: enabled ? item.igst : 0,
                taxAmount: enabled ? item.taxAmount : 0
            }));

            return {
                ...prev,
                gstEnabled: enabled,
                invoiceType: newInvoiceType,
                invoiceNumber: newDocumentNumber,
                items: updatedItems
            };
        });
    };

    // Update form data helper
    const updateFormData = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handle items change with proper validation
    const handleItemsChange = (newItems) => {
        console.log(`🔄 ${labels.documentName} items updated:`, newItems.length);
        updateFormData('items', newItems);
    };

    // Enhanced validation function with mode awareness
    const validateForm = () => {
        const errors = [];

        // Company validation
        if (!effectiveCompanyId) {
            errors.push('Company selection is required');
        }

        // Customer validation - more flexible for quotations
        if (!isQuotationsMode && !formData.customer && !formData.mobileNumber) {
            errors.push(`Please select a customer or enter mobile number for ${labels.documentName.toLowerCase()}`);
        }

        // Document number validation
        if (!formData.invoiceNumber) {
            errors.push(`${labels.documentNumber} is required`);
        }

        // Document date validation
        if (!formData.invoiceDate) {
            errors.push(`${labels.documentDate} is required`);
        } else {
            const documentDate = new Date(formData.invoiceDate);
            const today = new Date();
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(today.getFullYear() - 1);

            if (documentDate > today) {
                errors.push(`${labels.documentDate} cannot be in the future`);
            }

            if (documentDate < oneYearAgo) {
                errors.push(`${labels.documentDate} cannot be more than one year old`);
            }
        }

        // Quotation-specific validations
        if (isQuotationsMode) {
            if (formData.quotationValidity && (formData.quotationValidity < 1 || formData.quotationValidity > 365)) {
                errors.push('Quotation validity must be between 1 and 365 days');
            }
        }

        // Items validation
        const validItems = formData.items.filter(item =>
            item.itemName &&
            parseFloat(item.quantity) > 0 &&
            parseFloat(item.pricePerUnit) > 0
        );

        if (validItems.length === 0) {
            errors.push(`Please add at least one valid item with name, quantity, and price for ${labels.documentName.toLowerCase()}`);
        }

        return errors;
    };

    // Enhanced save handler
    const handleSave = (invoiceDataFromTable) => {
        console.log(`📥 ${labels.documentName}Form received data:`, invoiceDataFromTable);

        const errors = validateForm();

        if (errors.length > 0) {
            const errorMessage = `Please fix the following errors in your ${labels.documentName.toLowerCase()}:\n\n` + errors.join('\n');
            effectiveAddToast(errorMessage, 'error');
            return Promise.resolve({
                success: false,
                error: 'Validation failed',
                message: errors.join('; ')
            });
        }

        const itemsToSave = invoiceDataFromTable?.items || formData.items.filter(item =>
            item.itemName &&
            parseFloat(item.quantity) > 0 &&
            parseFloat(item.pricePerUnit) > 0
        );

        // Proper customer handling for backend
        let customerData = null;
        let customerName = 'Cash Customer';
        let customerMobile = '';

        if (formData.customer && formData.customer.id) {
            customerData = formData.customer.id;
            customerName = formData.customer.name || 'Customer';
            customerMobile = formData.customer.mobile || formData.mobileNumber || '';
        } else if (formData.customer && formData.customer._id) {
            customerData = formData.customer._id;
            customerName = formData.customer.name || 'Customer';
            customerMobile = formData.customer.mobile || formData.mobileNumber || '';
        } else {
            customerName = 'Cash Customer';
            customerMobile = formData.mobileNumber || '';
        }

        // Transform items to backend format
        const transformedItems = itemsToSave.map(item => ({
            itemName: item.itemName,
            itemCode: item.itemCode || '',
            hsnCode: item.hsnCode || '0000',
            quantity: parseFloat(item.quantity) || 1,
            unit: item.unit || 'PCS',
            pricePerUnit: parseFloat(item.pricePerUnit) || 0,
            taxRate: parseFloat(item.taxRate) || (formData.gstEnabled ? 18 : 0),
            discountPercent: parseFloat(item.discountPercent) || 0,
            discountAmount: parseFloat(item.discountAmount) || 0,
            category: item.category || '',
            itemRef: item.itemRef || null,
            amount: parseFloat(item.amount) || (parseFloat(item.quantity) * parseFloat(item.pricePerUnit))
        }));

        // Get payment data from invoiceDataFromTable
        const paymentInfo = invoiceDataFromTable?.paymentData || invoiceDataFromTable?.paymentInfo;

        // Build proper backend data structure
        const saleData = {
            companyId: effectiveCompanyId,
            customer: customerData,
            customerName: customerName,
            customerMobile: customerMobile,
            invoiceNumber: formData.invoiceNumber,
            invoiceDate: formData.invoiceDate,
            invoiceType: formData.gstEnabled ? 'gst' : 'non-gst',
            gstEnabled: formData.gstEnabled,
            taxMode: 'without-tax',
            priceIncludesTax: false,
            items: transformedItems,
            payment: paymentInfo ? {
                method: paymentInfo.paymentType || paymentInfo.method || 'cash',
                paidAmount: parseFloat(paymentInfo.amount) || 0,
                status: paymentInfo.status || 'pending',
                bankAccountId: paymentInfo.bankAccountId || null,
                bankAccountName: paymentInfo.bankAccountName || null,
                reference: paymentInfo.reference || '',
                notes: paymentInfo.notes || ''
            } : {
                method: 'cash',
                paidAmount: 0,
                status: 'pending'
            },
            notes: formData.notes || '',
            status: isQuotationsMode ? 'draft' : 'completed',
            // Quotation-specific fields
            ...(isQuotationsMode && {
                documentType: 'quotation',
                quotationValidity: formData.quotationValidity || 30,
                quotationStatus: formData.quotationStatus || 'draft'
            })
        };

        console.log(`💾 Saving ${labels.documentName.toLowerCase()} with backend format:`, {
            companyId: saleData.companyId,
            customer: saleData.customer,
            customerName: saleData.customerName,
            itemCount: saleData.items.length,
            paymentAmount: saleData.payment.paidAmount,
            paymentMethod: saleData.payment.method,
            gstEnabled: saleData.gstEnabled,
            invoiceNumber: saleData.invoiceNumber,
            taxMode: saleData.taxMode,
            hasCustomerId: !!saleData.customer,
            isQuotation: isQuotationsMode
        });

        // Call onSave with proper error handling
        if (onSave) {
            try {
                const result = onSave(saleData);
                console.log('📨 onSave called with result:', result);

                if (result && typeof result.then === 'function') {
                    return result.then(successResult => {
                        console.log(`✅ Async ${labels.documentName.toLowerCase()} save completed:`, successResult);
                        effectiveAddToast(`${labels.documentName} saved successfully!`, 'success');
                        return {
                            success: true,
                            data: successResult.data || successResult,
                            message: successResult.message || `${labels.documentName} saved successfully`,
                            invoiceNumber: saleData.invoiceNumber,
                            originalResult: successResult
                        };
                    }).catch(error => {
                        console.error(`❌ Error in async ${labels.documentName.toLowerCase()} onSave:`, error);
                        effectiveAddToast(`Error saving ${labels.documentName.toLowerCase()}: ${error.message}`, 'error');
                        return {
                            success: false,
                            error: error.message || 'Save operation failed',
                            data: null
                        };
                    });
                } else {
                    console.log(`✅ Sync ${labels.documentName.toLowerCase()} save completed:`, result);
                    effectiveAddToast(`${labels.documentName} saved successfully!`, 'success');
                    return Promise.resolve({
                        success: true,
                        data: result || saleData,
                        message: `${labels.documentName} saved successfully`,
                        invoiceNumber: saleData.invoiceNumber,
                        originalResult: result
                    });
                }
            } catch (error) {
                console.error(`❌ Error in ${labels.documentName.toLowerCase()} onSave:`, error);
                effectiveAddToast(`Error saving ${labels.documentName.toLowerCase()}: ${error.message}`, 'error');
                return Promise.resolve({
                    success: false,
                    error: error.message || 'Save operation failed',
                    data: null
                });
            }
        } else {
            console.warn(`⚠️ No onSave handler provided for ${labels.documentName.toLowerCase()}`);
            effectiveAddToast('No save handler provided', 'error');
            return Promise.resolve({
                success: false,
                error: 'No save handler provided',
                data: null
            });
        }
    };

    // Handle share with mode awareness
    const handleShare = () => {
        const errors = validateForm();

        if (errors.length > 0) {
            const errorMessage = `Please complete the ${labels.documentName.toLowerCase()} before sharing:\n\n` + errors.join('\n');
            effectiveAddToast(errorMessage, 'warning');
            return;
        }

        const shareData = {
            companyId: effectiveCompanyId,
            documentNumber: formData.invoiceNumber,
            documentType: isQuotationsMode ? 'quotation' : 'invoice',
            invoiceNumber: formData.invoiceNumber,
            invoiceType: formData.invoiceType,
            customer: formData.customer || { name: 'Cash Customer', phone: formData.mobileNumber },
            itemCount: formData.items.filter(item => item.itemName).length,
            mode: mode,
            isQuotation: isQuotationsMode
        };

        console.log(`📤 Sharing ${labels.documentName.toLowerCase()}:`, shareData);
        effectiveAddToast(`${labels.documentName} ${formData.invoiceNumber} ready to share!`, 'info');
    };

    // Handle adding new item from ItemsTable
    const handleAddItem = async (productData) => {
        try {
            console.log(`📦 Adding new product for ${labels.documentName.toLowerCase()}:`, productData);

            if (onAddItem) {
                const result = await onAddItem(productData);
                if (result !== false) {
                    console.log('✅ Product added successfully');
                    effectiveAddToast('Product added successfully', 'success');
                    return result;
                }
            } else {
                console.log('✅ Product added (simulated):', productData.name);
                effectiveAddToast('Product added successfully', 'success');
                return { id: Date.now(), ...productData };
            }
        } catch (error) {
            console.error('❌ Error adding product:', error);
            effectiveAddToast(`Error adding product: ${error.message}`, 'error');
            return false;
        }
    };

    // Auto-save draft functionality with mode awareness
    useEffect(() => {
        if (formData.invoiceNumber && effectiveCompanyId) {
            const draftKey = `${isQuotationsMode ? 'quotation' : 'invoice'}_draft_${effectiveCompanyId}_${formData.invoiceNumber}`;
            const draftData = {
                ...formData,
                companyId: effectiveCompanyId,
                documentType: isQuotationsMode ? 'quotation' : 'invoice',
                lastSaved: new Date().toISOString()
            };

            try {
                localStorage.setItem(draftKey, JSON.stringify(draftData));
            } catch (error) {
                console.warn('Could not save draft:', error);
            }
        }

        return () => {
            try {
                const keyPrefix = isQuotationsMode ? 'quotation_draft_' : 'invoice_draft_';
                const keys = Object.keys(localStorage).filter(key => key.startsWith(keyPrefix));
                if (keys.length > 10) {
                    keys.slice(0, -10).forEach(key => localStorage.removeItem(key));
                }
            } catch (error) {
                console.warn('Could not cleanup drafts:', error);
            }
        };
    }, [formData, effectiveCompanyId, isQuotationsMode]);

    // Show loading state if no companyId is available
    if (!effectiveCompanyId) {
        return (
            <div className="sales-form-wrapper" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
                <Container fluid className="py-3 px-4">
                    <Card className="border-warning">
                        <Card.Body className="text-center py-5">
                            <div className="text-warning mb-3">
                                <i className="fas fa-exclamation-triangle fa-3x"></i>
                            </div>
                            <h5 className="text-warning">Company Not Selected</h5>
                            <p className="text-muted">
                                Please select a company to create {isQuotationsMode ? 'quotations' : 'sales invoices'}.
                            </p>
                            <div className="mt-3">
                                <small className="text-muted">
                                    Debug Info:<br />
                                    URL CompanyId: {companyId || 'Not found'}<br />
                                    Storage CompanyId: {localCompanyId || 'Not found'}<br />
                                    Current URL: {window.location.pathname}<br />
                                    Mode: {mode}, Document Type: {documentType}
                                </small>
                            </div>
                        </Card.Body>
                    </Card>
                </Container>
            </div>
        );
    }

    return (
        <div className="sales-form-wrapper" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }} data-mode={mode}>
            <Container fluid className="py-3 px-4">
                {/* Compact Header Section */}
                <div className="mb-3">
                    <GSTToggle
                        gstEnabled={formData.gstEnabled}
                        invoiceType={formData.invoiceType}
                        onChange={handleGSTToggleChange}
                        mode={mode}
                        documentType={documentType}
                        documentName={labels.documentName}
                    />
                </div>

                {/* Customer and Document Details Row */}
                <Row className="g-3 mb-3">
                    <Col lg={6}>
                        <Card className="h-100 border-0 shadow-sm">
                            <Card.Body className="p-3">
                                <CustomerSection
                                    customer={formData.customer}
                                    mobileNumber={formData.mobileNumber}
                                    onCustomerChange={(customer) => updateFormData('customer', customer)}
                                    onMobileChange={(mobile) => updateFormData('mobileNumber', mobile)}
                                    isSupplierMode={false}
                                    companyId={effectiveCompanyId}
                                    mode={mode}
                                    documentType={documentType}
                                    customerLabel={labels.customerLabel}
                                />
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={6}>
                        <Card className="h-100 border-0 shadow-sm">
                            <Card.Body className="p-3">
                                <InvoiceDetails
                                    invoiceNumber={formData.invoiceNumber}
                                    invoiceDate={formData.invoiceDate}
                                    invoiceType={formData.invoiceType}
                                    onInvoiceNumberChange={(number) => updateFormData('invoiceNumber', number)}
                                    onInvoiceDateChange={(date) => updateFormData('invoiceDate', date)}
                                    mode={mode}
                                    documentType={documentType}
                                    documentNumberLabel={labels.documentNumber}
                                    documentDateLabel={labels.documentDate}
                                    quotationValidity={formData.quotationValidity}
                                    onQuotationValidityChange={(validity) => updateFormData('quotationValidity', validity)}
                                />
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                <div className="mb-3">
                    <ItemsTableWithTotals
                        items={formData.items}
                        onItemsChange={handleItemsChange}
                        categories={categories}
                        inventoryItems={inventoryItems}
                        companyId={effectiveCompanyId}
                        gstEnabled={formData.gstEnabled}
                        formType={getEffectiveFormType()} // ✅ FIXED: Use proper formType
                        onSave={handleSave}
                        onShare={handleShare}
                        onCancel={onCancel}
                        selectedCustomer={formData.customer}
                        selectedSupplier={null}
                        invoiceNumber={formData.invoiceNumber}
                        invoiceDate={formData.invoiceDate}
                        userId={null}
                        mode={mode}
                        documentType={documentType}
                        addToast={effectiveAddToast} // ✅ FIXED: Pass addToast function
                        documentLabels={labels}
                    />
                </div>

                {/* Debug section */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mb-3">
                        <Card className={`border-${isQuotationsMode ? 'warning' : 'info'} bg-opacity-10`}
                            style={{ backgroundColor: isQuotationsMode ? 'rgba(255, 193, 7, 0.1)' : 'rgba(13, 202, 240, 0.1)' }}>
                            <Card.Body className="p-3">
                                <h6 className={`text-${isQuotationsMode ? 'warning' : 'info'} mb-2`}>
                                    🔧 Debug - {labels.documentName}Form State
                                </h6>
                                <Row className="small text-muted">
                                    <Col md={3}>
                                        <div><strong>Form Data:</strong></div>
                                        <div>Mode: {mode}</div>
                                        <div>Document Type: {documentType}</div>
                                        <div>Form Type: {getEffectiveFormType()}</div>
                                        <div>Is Quotations Mode: {isQuotationsMode ? 'Yes' : 'No'}</div>
                                        <div>GST Enabled: {formData.gstEnabled ? 'Yes' : 'No'}</div>
                                        <div>Invoice Type: {formData.invoiceType}</div>
                                        <div>Company ID: {effectiveCompanyId}</div>
                                    </Col>
                                    <Col md={3}>
                                        <div><strong>Document Info:</strong></div>
                                        <div>Number: {formData.invoiceNumber}</div>
                                        <div>Date: {formData.invoiceDate}</div>
                                        <div>Document Mode: {formData.documentMode}</div>
                                        {isQuotationsMode && (
                                            <>
                                                <div>Validity: {formData.quotationValidity} days</div>
                                                <div>Status: {formData.quotationStatus}</div>
                                            </>
                                        )}
                                    </Col>
                                    <Col md={3}>
                                        <div><strong>Customer Info:</strong></div>
                                        <div>Customer: {formData.customer?.name || 'None'}</div>
                                        <div>Customer ID: {formData.customer?.id || formData.customer?._id || 'None'}</div>
                                        <div>Mobile: {formData.mobileNumber || 'None'}</div>
                                        <div>Label: {labels.customerLabel}</div>
                                    </Col>
                                    <Col md={3}>
                                        <div><strong>Items:</strong></div>
                                        <div>Total Items: {formData.items.length}</div>
                                        <div>Valid Items: {formData.items.filter(item => item.itemName).length}</div>
                                        <div>Component: ItemsTableWithTotals</div>
                                        <div>Effective Form Type: {getEffectiveFormType()}</div>
                                        <div>AddToast: {addToast ? 'Provided' : 'Default'}</div>
                                    </Col>
                                </Row>
                                <div className="mt-2 pt-2 border-top">
                                    <strong>Backend Data Preview:</strong>
                                    <div className="small">
                                        Customer ID: {formData.customer?.id || formData.customer?._id || 'null'} |
                                        Customer Name: {formData.customer?.name || 'Cash Customer'} |
                                        Tax Mode: without-tax |
                                        Price Includes Tax: false |
                                        Document Type: {isQuotationsMode ? 'quotation' : 'invoice'}
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </div>
                )}
            </Container>

            {/* Mode-specific styles */}
            <style jsx>{`
                .sales-form-wrapper[data-mode="quotations"] {
                    --primary-color: #17a2b8;
                    --primary-rgb: 23, 162, 184;
                    --secondary-color: #20c997;
                }

                .sales-form-wrapper[data-mode="invoices"] {
                    --primary-color: #6c63ff;
                    --primary-rgb: 108, 99, 255;
                    --secondary-color: #9c88ff;
                }

                .sales-form-wrapper[data-mode="quotations"] .card {
                    border-left: 4px solid var(--primary-color) !important;
                }

                .sales-form-wrapper[data-mode="quotations"] .card-header {
                    background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.1) 0%, rgba(var(--primary-rgb), 0.05) 100%);
                }
            `}</style>
        </div>
    );
}

export default SalesForm;