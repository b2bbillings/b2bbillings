import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import GSTToggle from './SalesForm/GSTToggle';
import CustomerSection from './SalesForm/CustomerSection';
import InvoiceDetails from './SalesForm/InvoiceDetails';
// ✅ UPDATED: Import the new combined component
import ItemsTableWithTotals from './SalesForm/itemsTableWithTotals';
import './SalesForm.css';



function SalesForm({ onSave, onCancel, onExit, inventoryItems = [], categories = [], onAddItem }) {
    // Get companyId from URL params
    const { companyId } = useParams();

    // Alternative: Get companyId from localStorage if not in URL
    const [localCompanyId, setLocalCompanyId] = useState(null);

    useEffect(() => {
        if (!companyId) {
            // Try to get companyId from localStorage
            const storedCompanyId = localStorage.getItem('selectedCompanyId') ||
                localStorage.getItem('companyId') ||
                sessionStorage.getItem('companyId');

            console.log('🏢 SalesForm - CompanyId from storage:', storedCompanyId);
            setLocalCompanyId(storedCompanyId);
        }
    }, [companyId]);

    // Use companyId from params, fallback to localStorage
    const effectiveCompanyId = companyId || localCompanyId;

    // Generate invoice number function
    const generateInvoiceNumber = (invoiceType = 'non-gst') => {
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(1000 + Math.random() * 9000);

        if (invoiceType === 'gst') {
            return `GST-${year}${month}${day}-${random}`;
        } else {
            return `INV-${year}${month}${day}-${random}`;
        }
    };

    // Initialize form data state
    const [formData, setFormData] = useState({
        gstEnabled: true,
        invoiceType: 'gst',
        customer: null,
        mobileNumber: '',
        invoiceNumber: generateInvoiceNumber('gst'),
        invoiceDate: new Date().toISOString().split('T')[0],
        items: [],
        paymentMethod: 'cash',
        notes: ''
    });

    // ✅ REMOVED: No longer need separate itemsTableTotals state - handled by ItemsTableWithTotals

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
            cgstAmount: 0, // ✅ FIXED: Use cgstAmount instead of cgst
            sgstAmount: 0, // ✅ FIXED: Use sgstAmount instead of sgst
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
    }, [formData.gstEnabled]); // Re-run when GST status changes

    // Handle invoice type change
    const handleInvoiceTypeChange = (newType) => {
        console.log('📋 Changing invoice type to:', newType);

        const gstEnabled = newType === 'gst';
        const newInvoiceNumber = generateInvoiceNumber(newType);

        setFormData(prev => {
            const updatedItems = prev.items.map(item => ({
                ...item,
                taxRate: gstEnabled ? (item.taxRate || 18) : 0,
                cgstAmount: gstEnabled ? item.cgstAmount : 0, // ✅ FIXED
                sgstAmount: gstEnabled ? item.sgstAmount : 0, // ✅ FIXED
                igst: gstEnabled ? item.igst : 0,
                taxAmount: gstEnabled ? item.taxAmount : 0
            }));

            return {
                ...prev,
                invoiceType: newType,
                gstEnabled,
                invoiceNumber: newInvoiceNumber,
                items: updatedItems
            };
        });
    };

    // Handle GST toggle change
    const handleGSTToggleChange = (enabled) => {
        console.log('🔄 GST Toggle changed to:', enabled);

        const newInvoiceType = enabled ? 'gst' : 'non-gst';
        const newInvoiceNumber = generateInvoiceNumber(newInvoiceType);

        setFormData(prev => {
            const updatedItems = prev.items.map(item => ({
                ...item,
                taxRate: enabled ? (item.taxRate || 18) : 0,
                cgstAmount: enabled ? item.cgstAmount : 0, // ✅ FIXED
                sgstAmount: enabled ? item.sgstAmount : 0, // ✅ FIXED
                igst: enabled ? item.igst : 0,
                taxAmount: enabled ? item.taxAmount : 0
            }));

            return {
                ...prev,
                gstEnabled: enabled,
                invoiceType: newInvoiceType,
                invoiceNumber: newInvoiceNumber,
                items: updatedItems
            };
        });
    };

    // ✅ REMOVED: handleTotalsChange - no longer needed as ItemsTableWithTotals handles everything

    // ✅ REMOVED: totals calculation - handled internally by ItemsTableWithTotals

    // Update form data helper
    const updateFormData = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handle items change with proper validation
    const handleItemsChange = (newItems) => {
        console.log('🔄 Items updated:', newItems.length);
        updateFormData('items', newItems);
    };

    // ✅ REMOVED: Round off handlers - handled by ItemsTableWithTotals

    // ✅ UPDATED: Enhanced validation function with better error handling
    const validateForm = () => {
        const errors = [];

        // Company validation
        if (!effectiveCompanyId) {
            errors.push('Company selection is required');
        }

        // Customer validation - more flexible for different scenarios
        if (!formData.customer && !formData.mobileNumber) {
            errors.push('Please select a customer or enter mobile number');
        }

        // Invoice number validation
        if (!formData.invoiceNumber) {
            errors.push('Invoice number is required');
        } else {
            const gstPattern = /^GST-\d{8}-\d{4}$/;
            const nonGstPattern = /^INV-\d{8}-\d{4}$/;

            if (formData.invoiceType === 'gst' && !gstPattern.test(formData.invoiceNumber)) {
                errors.push('GST invoice number must follow format: GST-YYYYMMDD-XXXX');
            }

            if (formData.invoiceType === 'non-gst' && !nonGstPattern.test(formData.invoiceNumber)) {
                errors.push('Invoice number must follow format: INV-YYYYMMDD-XXXX');
            }
        }

        // Invoice date validation
        if (!formData.invoiceDate) {
            errors.push('Invoice date is required');
        } else {
            const invoiceDate = new Date(formData.invoiceDate);
            const today = new Date();
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(today.getFullYear() - 1);

            if (invoiceDate > today) {
                errors.push('Invoice date cannot be in the future');
            }

            if (invoiceDate < oneYearAgo) {
                errors.push('Invoice date cannot be more than one year old');
            }
        }

        // Items validation - enhanced
        const validItems = formData.items.filter(item =>
            item.itemName &&
            parseFloat(item.quantity) > 0 &&
            parseFloat(item.pricePerUnit) > 0
        );

        if (validItems.length === 0) {
            errors.push('Please add at least one valid item with name, quantity, and price');
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
                errors.push(`${itemsWithoutHSN.length} item(s) are missing HSN codes. HSN codes are required for GST invoices.`);
            }

            // Validate tax rates for GST items
            const itemsWithInvalidTax = validItems.filter(item => {
                const taxRate = parseFloat(item.taxRate) || 0;
                return taxRate < 0 || taxRate > 28; // GST rates typically range from 0% to 28%
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
            errors.push('Invoice total must be greater than zero');
        }

        // Large amount validation (optional business rule)
        if (totalAmount > 1000000) { // 10 lakh
            console.warn('⚠️ Large invoice amount detected:', totalAmount);
            // Could add to errors if business rules require approval for large amounts
        }

        return errors;
    };

    // ✅ FIXED: Enhanced save handler with proper return values
    const handleSave = (invoiceDataFromTable) => {
        console.log('📥 SalesForm received invoice data:', invoiceDataFromTable);

        const errors = validateForm();

        if (errors.length > 0) {
            alert('Please fix the following errors:\n\n' + errors.join('\n'));
            return Promise.resolve({
                success: false,
                error: 'Validation failed',
                message: errors.join('; ')
            });
        }

        // ✅ FIXED: Use data from ItemsTableWithTotals if provided, otherwise use form data
        const itemsToSave = invoiceDataFromTable?.items || formData.items.filter(item =>
            item.itemName &&
            parseFloat(item.quantity) > 0 &&
            parseFloat(item.pricePerUnit) > 0
        );

        // ✅ FIXED: Include totals from ItemsTableWithTotals
        const saleData = {
            ...formData,
            companyId: effectiveCompanyId,
            items: itemsToSave,

            // ✅ CRITICAL: Include totals from ItemsTableWithTotals
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

            // ✅ Include payment information if any
            paymentInfo: invoiceDataFromTable?.paymentInfo || null,

            // ✅ Include round-off information
            roundOff: invoiceDataFromTable?.roundOff || {
                enabled: false,
                value: 0
            },

            // ✅ Additional metadata
            gstCalculationMode: invoiceDataFromTable?.gstEnabled !== undefined
                ? (invoiceDataFromTable.gstEnabled ? 'enabled' : 'disabled')
                : (formData.gstEnabled ? 'enabled' : 'disabled'),

            invoiceMetadata: {
                formType: invoiceDataFromTable?.formType || 'sales',
                createdFrom: 'ItemsTableWithTotals',
                hasPayment: !!(invoiceDataFromTable?.paymentInfo?.amount),
                paymentAmount: invoiceDataFromTable?.paymentInfo?.amount || 0,
                enhancedDataProvided: !!invoiceDataFromTable,
                calculationMethod: 'ItemsTableWithTotals'
            },

            // Timestamps
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        console.log('💾 Saving invoice data with totals:', {
            invoiceNumber: saleData.invoiceNumber,
            itemCount: saleData.items.length,
            totalsFinalTotal: saleData.totals.finalTotal,
            hasPayment: !!saleData.paymentInfo,
            gstEnabled: saleData.gstEnabled,
            companyId: saleData.companyId
        });

        // ✅ FIXED: Proper async handling with explicit return
        if (onSave) {
            try {
                const result = onSave(saleData);
                console.log('📨 onSave returned:', result);

                // ✅ FIXED: Handle both sync and async onSave functions properly
                if (result && typeof result.then === 'function') {
                    // onSave returns a promise
                    return result.then(successResult => {
                        console.log('✅ Async save completed:', successResult);

                        // ✅ CRITICAL FIX: Return the actual result instead of undefined
                        if (successResult && successResult.success) {
                            // Return the successful result properly
                            return {
                                success: true,
                                data: successResult.data || successResult,
                                message: successResult.message || 'Invoice saved successfully',
                                totals: saleData.totals,
                                paymentInfo: saleData.paymentInfo,
                                invoiceNumber: saleData.invoiceNumber,
                                originalResult: successResult
                            };
                        } else {
                            // Handle case where success result doesn't have success flag
                            return {
                                success: true,
                                data: successResult || saleData,
                                message: 'Invoice saved successfully',
                                totals: saleData.totals,
                                paymentInfo: saleData.paymentInfo,
                                invoiceNumber: saleData.invoiceNumber,
                                originalResult: successResult
                            };
                        }

                    }).catch(error => {
                        console.error('❌ Error in async onSave:', error);
                        return {
                            success: false,
                            error: error.message || 'Save operation failed',
                            data: null,
                            totals: saleData.totals
                        };
                    });
                } else {
                    // onSave returns synchronously
                    console.log('✅ Sync save completed:', result);

                    // ✅ FIXED: Return proper success result for sync operations
                    if (result && result.success) {
                        return Promise.resolve({
                            success: true,
                            data: result.data || result,
                            message: result.message || 'Invoice saved successfully',
                            totals: saleData.totals,
                            paymentInfo: saleData.paymentInfo,
                            invoiceNumber: saleData.invoiceNumber,
                            originalResult: result
                        });
                    } else {
                        // Handle case where sync result doesn't have success flag
                        return Promise.resolve({
                            success: true,
                            data: result || saleData,
                            message: 'Invoice saved successfully',
                            totals: saleData.totals,
                            paymentInfo: saleData.paymentInfo,
                            invoiceNumber: saleData.invoiceNumber,
                            originalResult: result
                        });
                    }
                }
            } catch (error) {
                console.error('❌ Error in onSave:', error);
                return Promise.resolve({
                    success: false,
                    error: error.message || 'Save operation failed',
                    data: null,
                    totals: saleData.totals
                });
            }
        } else {
            console.warn('⚠️ No onSave handler provided');
            return Promise.resolve({
                success: false,
                error: 'No save handler provided',
                data: null,
                totals: saleData.totals
            });
        }
    };

    // Handle share
    const handleShare = () => {
        const errors = validateForm();

        if (errors.length > 0) {
            alert('Please complete the invoice before sharing:\n\n' + errors.join('\n'));
            return;
        }

        const shareData = {
            companyId: effectiveCompanyId,
            invoiceNumber: formData.invoiceNumber,
            invoiceType: formData.invoiceType,
            customer: formData.customer || { name: 'Cash Customer', phone: formData.mobileNumber },
            itemCount: formData.items.filter(item => item.itemName).length
        };

        console.log('📤 Sharing invoice:', shareData);
        alert(`Invoice ${formData.invoiceNumber} ready to share!`);
    };

    // Handle adding new item from ItemsTable
    const handleAddItem = async (productData) => {
        try {
            console.log('📦 Adding new product:', productData);

            if (onAddItem) {
                const result = await onAddItem(productData);
                if (result !== false) {
                    console.log('✅ Product added successfully');
                    return result;
                }
            } else {
                // Simulate successful addition if no handler provided
                console.log('✅ Product added (simulated):', productData.name);
                return { id: Date.now(), ...productData };
            }
        } catch (error) {
            console.error('❌ Error adding product:', error);
            return false;
        }
    };

    // ✅ SIMPLIFIED: Auto-save draft functionality
    useEffect(() => {
        if (formData.invoiceNumber && effectiveCompanyId) {
            const draftKey = `invoice_draft_${effectiveCompanyId}_${formData.invoiceNumber}`;
            const draftData = {
                ...formData,
                companyId: effectiveCompanyId,
                lastSaved: new Date().toISOString()
            };

            // Save to localStorage
            try {
                localStorage.setItem(draftKey, JSON.stringify(draftData));
            } catch (error) {
                console.warn('Could not save draft:', error);
            }
        }

        // Cleanup old drafts
        return () => {
            try {
                const keys = Object.keys(localStorage).filter(key => key.startsWith('invoice_draft_'));
                if (keys.length > 10) {
                    keys.slice(0, -10).forEach(key => localStorage.removeItem(key));
                }
            } catch (error) {
                console.warn('Could not cleanup drafts:', error);
            }
        };
    }, [formData, effectiveCompanyId]);

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
                                Please select a company to create sales invoices.
                            </p>
                            <div className="mt-3">
                                <small className="text-muted">
                                    Debug Info:<br />
                                    URL CompanyId: {companyId || 'Not found'}<br />
                                    Storage CompanyId: {localCompanyId || 'Not found'}<br />
                                    Current URL: {window.location.pathname}
                                </small>
                            </div>
                        </Card.Body>
                    </Card>
                </Container>
            </div>
        );
    }

    return (
        <div className="sales-form-wrapper" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <Container fluid className="py-3 px-4">
                {/* Compact Header Section */}
                <div className="mb-3">
                    <GSTToggle
                        gstEnabled={formData.gstEnabled}
                        invoiceType={formData.invoiceType}
                        onChange={handleGSTToggleChange}
                    />
                </div>

                {/* Customer and Invoice Details Row */}
                <Row className="g-3 mb-3">
                    <Col lg={6}>
                        <Card className="h-100 border-0 shadow-sm">
                            <Card.Body className="p-3">
                                <CustomerSection
                                    customer={formData.customer}
                                    mobileNumber={formData.mobileNumber}
                                    onCustomerChange={(customer) => updateFormData('customer', customer)}
                                    onMobileChange={(mobile) => updateFormData('mobileNumber', mobile)}
                                    isSupplierMode={false} // ✅ This keeps customer mode
                                    companyId={effectiveCompanyId}
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
                        formType="sales"
                        onSave={handleSave}
                        onShare={handleShare}
                        onCancel={onCancel}
                        selectedCustomer={formData.customer}
                        selectedSupplier={null}
                        invoiceNumber={formData.invoiceNumber}
                        invoiceDate={formData.invoiceDate}
                        userId={null}
                    />
                </div>

                {/* ✅ SIMPLIFIED: Debug section for development */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mb-3">
                        <Card className="bg-info bg-opacity-10 border-info">
                            <Card.Body className="p-3">
                                <h6 className="text-info mb-2">🔧 Debug - SalesForm State</h6>
                                <Row className="small text-muted">
                                    <Col md={4}>
                                        <div><strong>Form Data:</strong></div>
                                        <div>GST Enabled: {formData.gstEnabled ? 'Yes' : 'No'}</div>
                                        <div>Invoice Type: {formData.invoiceType}</div>
                                        <div>Invoice Number: {formData.invoiceNumber}</div>
                                        <div>Company ID: {effectiveCompanyId}</div>
                                    </Col>
                                    <Col md={4}>
                                        <div><strong>Customer Info:</strong></div>
                                        <div>Customer: {formData.customer?.name || 'None'}</div>
                                        <div>Mobile: {formData.mobileNumber || 'None'}</div>
                                        <div>Date: {formData.invoiceDate}</div>
                                    </Col>
                                    <Col md={4}>
                                        <div><strong>Items:</strong></div>
                                        <div>Total Items: {formData.items.length}</div>
                                        <div>Valid Items: {formData.items.filter(item => item.itemName).length}</div>
                                        <div>Component: ItemsTableWithTotals</div>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    </div>
                )}
            </Container>
        </div>
    );
}

export default SalesForm;