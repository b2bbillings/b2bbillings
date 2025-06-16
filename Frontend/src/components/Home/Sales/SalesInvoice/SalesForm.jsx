import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import GSTToggle from './SalesForm/GSTToggle';
import CustomerSection from './SalesForm/CustomerSection';
import InvoiceDetails from './SalesForm/InvoiceDetails';
// ✅ UPDATED: Import the new combined component
import ItemsTableWithTotals from './SalesForm/itemsTableWithTotals';
import './SalesForm.css';

function SalesForm({
    onSave,
    onCancel,
    onExit,
    inventoryItems = [],
    categories = [],
    onAddItem,
    // ✅ NEW: Added mode and document type props
    mode = 'invoices',
    documentType = 'invoice',
    formType = 'sales',
    pageTitle
}) {
    // Get companyId from URL params
    const { companyId } = useParams();

    // Alternative: Get companyId from localStorage if not in URL
    const [localCompanyId, setLocalCompanyId] = useState(null);

    // ✅ NEW: Dynamic content based on document type
    const isQuotationsMode = mode === 'quotations' || documentType === 'quotation';

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

    // ✅ UPDATED: Generate document number function based on mode
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

    // ✅ UPDATED: Dynamic field labels based on mode
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
        // ✅ NEW: Add quotation-specific fields
        quotationValidity: isQuotationsMode ? 30 : undefined, // 30 days validity for quotations
        quotationStatus: isQuotationsMode ? 'draft' : undefined,
        convertedToInvoice: isQuotationsMode ? false : undefined,
        documentMode: isQuotationsMode ? 'quotation' : 'invoice'
    });

    // Create empty item function - now has access to formData
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
            taxMode: 'with-tax'
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

    // ✅ UPDATED: Handle invoice type change with mode awareness
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

    // ✅ UPDATED: Handle GST toggle change with mode awareness
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

    // ✅ UPDATED: Enhanced validation function with mode awareness
    const validateForm = () => {
        const errors = [];

        // Company validation
        if (!effectiveCompanyId) {
            errors.push('Company selection is required');
        }

        // Customer validation - more flexible for different scenarios
        if (!formData.customer && !formData.mobileNumber) {
            errors.push(`Please select a customer or enter mobile number for ${labels.documentName.toLowerCase()}`);
        }

        // Document number validation with mode-specific patterns
        if (!formData.invoiceNumber) {
            errors.push(`${labels.documentNumber} is required`);
        } else {
            let validPattern = false;

            if (isQuotationsMode) {
                // Quotation patterns
                const gstQuotationPattern = /^QUO-GST-\d{8}-\d{4}$/;
                const nonGstQuotationPattern = /^QUO-\d{8}-\d{4}$/;

                if (formData.invoiceType === 'gst') {
                    validPattern = gstQuotationPattern.test(formData.invoiceNumber);
                    if (!validPattern) {
                        errors.push('GST quotation number must follow format: QUO-GST-YYYYMMDD-XXXX');
                    }
                } else {
                    validPattern = nonGstQuotationPattern.test(formData.invoiceNumber);
                    if (!validPattern) {
                        errors.push('Quotation number must follow format: QUO-YYYYMMDD-XXXX');
                    }
                }
            } else {
                // Invoice patterns
                const gstInvoicePattern = /^GST-\d{8}-\d{4}$/;
                const nonGstInvoicePattern = /^INV-\d{8}-\d{4}$/;

                if (formData.invoiceType === 'gst') {
                    validPattern = gstInvoicePattern.test(formData.invoiceNumber);
                    if (!validPattern) {
                        errors.push('GST invoice number must follow format: GST-YYYYMMDD-XXXX');
                    }
                } else {
                    validPattern = nonGstInvoicePattern.test(formData.invoiceNumber);
                    if (!validPattern) {
                        errors.push('Invoice number must follow format: INV-YYYYMMDD-XXXX');
                    }
                }
            }
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

        // ✅ NEW: Quotation-specific validations
        if (isQuotationsMode) {
            if (formData.quotationValidity && (formData.quotationValidity < 1 || formData.quotationValidity > 365)) {
                errors.push('Quotation validity must be between 1 and 365 days');
            }
        }

        // Items validation - enhanced
        const validItems = formData.items.filter(item =>
            item.itemName &&
            parseFloat(item.quantity) > 0 &&
            parseFloat(item.pricePerUnit) > 0
        );

        if (validItems.length === 0) {
            errors.push(`Please add at least one valid item with name, quantity, and price for ${labels.documentName.toLowerCase()}`);
        }

        // Check for items with invalid data
        const invalidItems = formData.items.filter((item, index) => {
            if (!item.itemName && !item.quantity && !item.pricePerUnit) {
                return false; // Empty row, skip
            }

            return (
                (item.itemName && (!item.quantity || parseFloat(item.quantity) <= 0)) ||
                (item.itemName && (!item.pricePerUnit || parseFloat(item.pricePerUnit) <= 0)) ||
                (item.quantity && !item.itemName) ||
                (item.pricePerUnit && !item.itemName)
            );
        });

        if (invalidItems.length > 0) {
            errors.push(`${invalidItems.length} item(s) have incomplete information. Please fill all required fields or remove empty items.`);
        }

        // GST specific validations
        if (formData.invoiceType === 'gst' && formData.gstEnabled) {
            const itemsWithoutHSN = validItems.filter(item => !item.hsnCode || item.hsnCode.trim() === '');
            if (itemsWithoutHSN.length > 0) {
                errors.push(`${itemsWithoutHSN.length} item(s) are missing HSN codes. HSN codes are required for GST ${labels.documentName.toLowerCase()}s.`);
            }

            // Validate tax rates for GST items
            const itemsWithInvalidTax = validItems.filter(item => {
                const taxRate = parseFloat(item.taxRate) || 0;
                return taxRate < 0 || taxRate > 28;
            });

            if (itemsWithInvalidTax.length > 0) {
                errors.push(`${itemsWithInvalidTax.length} item(s) have invalid tax rates. GST rates should be between 0% and 28%.`);
            }
        }

        // Additional business logic validations
        const totalAmount = validItems.reduce((sum, item) => {
            const quantity = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.pricePerUnit) || 0;
            const discount = parseFloat(item.discountAmount) || 0;
            return sum + (quantity * price - discount);
        }, 0);

        if (totalAmount <= 0) {
            errors.push(`${labels.documentName} total must be greater than zero`);
        }

        // Large amount validation (optional business rule)
        if (totalAmount > 1000000) {
            console.warn(`⚠️ Large ${labels.documentName.toLowerCase()} amount detected:`, totalAmount);
        }

        return errors;
    };

    // ✅ UPDATED: Enhanced save handler with mode awareness
    const handleSave = (invoiceDataFromTable) => {
        console.log(`📥 ${labels.documentName}Form received data:`, invoiceDataFromTable);

        const errors = validateForm();

        if (errors.length > 0) {
            alert(`Please fix the following errors in your ${labels.documentName.toLowerCase()}:\n\n` + errors.join('\n'));
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

        // ✅ UPDATED: Include mode-specific data
        const saleData = {
            ...formData,
            companyId: effectiveCompanyId,
            items: itemsToSave,

            // Document type information
            documentType: isQuotationsMode ? 'quotation' : 'invoice',
            documentMode: isQuotationsMode ? 'quotation' : 'invoice',
            formType: isQuotationsMode ? 'quotation' : 'sales',

            // Include totals from ItemsTableWithTotals
            totals: invoiceDataFromTable?.totals || {
                finalTotal: 0,
                subtotal: 0,
                totalTax: 0,
                totalCGST: 0,
                totalSGST: 0,
                totalAmount: 0,
                totalQuantity: 0,
                totalDiscountAmount: 0,
                withTaxTotal: 0,
                withoutTaxTotal: 0,
                roundOffValue: 0,
                roundOffEnabled: false
            },

            // Include payment information if any
            paymentInfo: invoiceDataFromTable?.paymentInfo || null,

            // Include round-off information
            roundOff: invoiceDataFromTable?.roundOff || {
                enabled: false,
                value: 0
            },

            // Additional metadata
            gstCalculationMode: invoiceDataFromTable?.gstEnabled !== undefined
                ? (invoiceDataFromTable.gstEnabled ? 'enabled' : 'disabled')
                : (formData.gstEnabled ? 'enabled' : 'disabled'),

            invoiceMetadata: {
                formType: isQuotationsMode ? 'quotation' : 'sales',
                documentType: isQuotationsMode ? 'quotation' : 'invoice',
                createdFrom: 'ItemsTableWithTotals',
                hasPayment: !!(invoiceDataFromTable?.paymentInfo?.amount),
                paymentAmount: invoiceDataFromTable?.paymentInfo?.amount || 0,
                enhancedDataProvided: !!invoiceDataFromTable,
                calculationMethod: 'ItemsTableWithTotals',
                mode: mode,
                isQuotation: isQuotationsMode
            },

            // ✅ NEW: Quotation-specific fields
            ...(isQuotationsMode && {
                quotationValidity: formData.quotationValidity || 30,
                quotationStatus: formData.quotationStatus || 'draft',
                validUntil: formData.quotationValidity ?
                    new Date(Date.now() + (formData.quotationValidity * 24 * 60 * 60 * 1000)).toISOString() :
                    new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
                convertedToInvoice: false,
                quotationNotes: formData.notes
            }),

            // Timestamps
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        console.log(`💾 Saving ${labels.documentName.toLowerCase()} data with totals:`, {
            documentNumber: saleData.invoiceNumber,
            documentType: saleData.documentType,
            itemCount: saleData.items.length,
            totalsFinalTotal: saleData.totals.finalTotal,
            hasPayment: !!saleData.paymentInfo,
            gstEnabled: saleData.gstEnabled,
            companyId: saleData.companyId,
            isQuotation: isQuotationsMode
        });

        // Handle async/sync onSave functions
        if (onSave) {
            try {
                const result = onSave(saleData);
                console.log('📨 onSave returned:', result);

                if (result && typeof result.then === 'function') {
                    return result.then(successResult => {
                        console.log(`✅ Async ${labels.documentName.toLowerCase()} save completed:`, successResult);

                        if (successResult && successResult.success) {
                            return {
                                success: true,
                                data: successResult.data || successResult,
                                message: successResult.message || `${labels.documentName} saved successfully`,
                                totals: saleData.totals,
                                paymentInfo: saleData.paymentInfo,
                                invoiceNumber: saleData.invoiceNumber,
                                documentType: saleData.documentType,
                                originalResult: successResult
                            };
                        } else {
                            return {
                                success: true,
                                data: successResult || saleData,
                                message: `${labels.documentName} saved successfully`,
                                totals: saleData.totals,
                                paymentInfo: saleData.paymentInfo,
                                invoiceNumber: saleData.invoiceNumber,
                                documentType: saleData.documentType,
                                originalResult: successResult
                            };
                        }
                    }).catch(error => {
                        console.error(`❌ Error in async ${labels.documentName.toLowerCase()} onSave:`, error);
                        return {
                            success: false,
                            error: error.message || 'Save operation failed',
                            data: null,
                            totals: saleData.totals
                        };
                    });
                } else {
                    console.log(`✅ Sync ${labels.documentName.toLowerCase()} save completed:`, result);

                    if (result && result.success) {
                        return Promise.resolve({
                            success: true,
                            data: result.data || result,
                            message: result.message || `${labels.documentName} saved successfully`,
                            totals: saleData.totals,
                            paymentInfo: saleData.paymentInfo,
                            invoiceNumber: saleData.invoiceNumber,
                            documentType: saleData.documentType,
                            originalResult: result
                        });
                    } else {
                        return Promise.resolve({
                            success: true,
                            data: result || saleData,
                            message: `${labels.documentName} saved successfully`,
                            totals: saleData.totals,
                            paymentInfo: saleData.paymentInfo,
                            invoiceNumber: saleData.invoiceNumber,
                            documentType: saleData.documentType,
                            originalResult: result
                        });
                    }
                }
            } catch (error) {
                console.error(`❌ Error in ${labels.documentName.toLowerCase()} onSave:`, error);
                return Promise.resolve({
                    success: false,
                    error: error.message || 'Save operation failed',
                    data: null,
                    totals: saleData.totals
                });
            }
        } else {
            console.warn(`⚠️ No onSave handler provided for ${labels.documentName.toLowerCase()}`);
            return Promise.resolve({
                success: false,
                error: 'No save handler provided',
                data: null,
                totals: saleData.totals
            });
        }
    };

    // ✅ UPDATED: Handle share with mode awareness
    const handleShare = () => {
        const errors = validateForm();

        if (errors.length > 0) {
            alert(`Please complete the ${labels.documentName.toLowerCase()} before sharing:\n\n` + errors.join('\n'));
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
        alert(`${labels.documentName} ${formData.invoiceNumber} ready to share!`);
    };

    // Handle adding new item from ItemsTable
    const handleAddItem = async (productData) => {
        try {
            console.log(`📦 Adding new product for ${labels.documentName.toLowerCase()}:`, productData);

            if (onAddItem) {
                const result = await onAddItem(productData);
                if (result !== false) {
                    console.log('✅ Product added successfully');
                    return result;
                }
            } else {
                console.log('✅ Product added (simulated):', productData.name);
                return { id: Date.now(), ...productData };
            }
        } catch (error) {
            console.error('❌ Error adding product:', error);
            return false;
        }
    };

    // ✅ UPDATED: Auto-save draft functionality with mode awareness
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
                        // ✅ NEW: Pass mode information
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
                                    // ✅ NEW: Pass mode information
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
                                    // ✅ NEW: Pass mode information and labels
                                    mode={mode}
                                    documentType={documentType}
                                    documentNumberLabel={labels.documentNumber}
                                    documentDateLabel={labels.documentDate}
                                    // ✅ NEW: Pass quotation-specific fields
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
                        formType={isQuotationsMode ? "quotation" : "sales"}
                        onSave={handleSave}
                        onShare={handleShare}
                        onCancel={onCancel}
                        selectedCustomer={formData.customer}
                        selectedSupplier={null}
                        invoiceNumber={formData.invoiceNumber}
                        invoiceDate={formData.invoiceDate}
                        userId={null}
                        // ✅ NEW: Pass mode information
                        mode={mode}
                        documentType={documentType}
                        documentLabels={labels}
                    />
                </div>

                {/* ✅ UPDATED: Debug section with mode information */}
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
                                        <div>Mobile: {formData.mobileNumber || 'None'}</div>
                                        <div>Label: {labels.customerLabel}</div>
                                    </Col>
                                    <Col md={3}>
                                        <div><strong>Items:</strong></div>
                                        <div>Total Items: {formData.items.length}</div>
                                        <div>Valid Items: {formData.items.filter(item => item.itemName).length}</div>
                                        <div>Component: ItemsTableWithTotals</div>
                                        <div>Form Type: {isQuotationsMode ? 'quotation' : 'sales'}</div>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    </div>
                )}
            </Container>

            {/* ✅ NEW: Mode-specific styles */}
            <style jsx>{`
                .sales-form-wrapper[data-mode="quotations"] {
                    --primary-color: #ff6b35;
                    --primary-rgb: 255, 107, 53;
                    --secondary-color: #ff8c42;
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