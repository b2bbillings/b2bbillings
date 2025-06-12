import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useParams } from 'react-router-dom';

// Reuse existing components from Sales
import GSTToggle from '../Sales/SalesInvoice/SalesForm/GSTToggle';
import CustomerSection from '../Sales/SalesInvoice/SalesForm/CustomerSection';
import InvoiceDetails from '../Sales/SalesInvoice/SalesForm/InvoiceDetails';
import ItemsTableWithTotals from '../Sales/SalesInvoice/SalesForm/itemsTableWithTotals/ItemsTableWithTotals';

// Import services
import purchaseService from '../../../services/purchaseService';

function PurchaseForm({
    editingPurchase,
    onSave,
    onCancel,
    onExit,
    inventoryItems = [],
    categories = [],
    bankAccounts = [],
    onAddItem,
    addToast
}) {
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

            console.log('🏢 PurchaseForm - CompanyId from storage:', storedCompanyId);
            setLocalCompanyId(storedCompanyId);
        }
    }, [companyId]);

    // Use companyId from params, fallback to localStorage
    const effectiveCompanyId = companyId || localCompanyId;

    // Generate purchase number function (matching sales pattern)
    const generatePurchaseNumber = (purchaseType = 'non-gst') => {
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(1000 + Math.random() * 9000);

        if (purchaseType === 'gst') {
            return `PUR-GST-${year}${month}${day}-${random}`;
        } else {
            return `PUR-${year}${month}${day}-${random}`;
        }
    };

    // Initialize form data state (matching SalesForm exactly)
    const [formData, setFormData] = useState(() => {
        if (editingPurchase) {
            return {
                gstEnabled: editingPurchase.gstEnabled ?? true,
                invoiceType: editingPurchase.purchaseType || 'gst',
                customer: editingPurchase.supplier || null, // Use supplier as customer for purchase
                mobileNumber: editingPurchase.supplierMobile || editingPurchase.supplier?.mobile || '',
                invoiceNumber: editingPurchase.purchaseNumber || generatePurchaseNumber('gst'),
                invoiceDate: editingPurchase.purchaseDate ?
                    new Date(editingPurchase.purchaseDate).toISOString().split('T')[0] :
                    new Date().toISOString().split('T')[0],
                items: editingPurchase.items || [],
                paymentMethod: editingPurchase.payment?.method || 'cash',
                notes: editingPurchase.notes || ''
            };
        } else {
            return {
                gstEnabled: true,
                invoiceType: 'gst',
                customer: null, // Will represent supplier in purchase context
                mobileNumber: '',
                invoiceNumber: generatePurchaseNumber('gst'),
                invoiceDate: new Date().toISOString().split('T')[0],
                items: [],
                paymentMethod: 'cash',
                notes: ''
            };
        }
    });

    // Create empty item function (matching SalesForm)
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
            taxMode: 'without-tax' // Default for purchases
        };
    };

    // Initialize items after formData is set (matching SalesForm)
    useEffect(() => {
        if (formData.items.length === 0 && !editingPurchase) {
            setFormData(prev => ({
                ...prev,
                items: [createEmptyItem()]
            }));
        }
    }, [formData.gstEnabled, editingPurchase]);

    // Handle invoice type change (matching SalesForm)
    const handleInvoiceTypeChange = (newType) => {
        console.log('📋 Changing purchase type to:', newType);

        const gstEnabled = newType === 'gst';
        const newPurchaseNumber = generatePurchaseNumber(newType);

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
                invoiceNumber: newPurchaseNumber,
                items: updatedItems
            };
        });
    };

    // Handle GST toggle change (matching SalesForm)
    const handleGSTToggleChange = (enabled) => {
        console.log('🔄 GST Toggle changed to:', enabled);

        const newInvoiceType = enabled ? 'gst' : 'non-gst';
        const newPurchaseNumber = generatePurchaseNumber(newInvoiceType);

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
                invoiceNumber: newPurchaseNumber,
                items: updatedItems
            };
        });
    };

    // Update form data helper (matching SalesForm)
    const updateFormData = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handle items change (matching SalesForm)
    const handleItemsChange = (newItems) => {
        console.log('🔄 Items updated:', newItems.length);
        updateFormData('items', newItems);
    };

    // Enhanced validation function (adapted for purchases)
    const validateForm = () => {
        const errors = [];

        // Company validation
        if (!effectiveCompanyId) {
            errors.push('Company selection is required');
        }

        // Supplier validation (using customer field)
        if (!formData.customer && !formData.mobileNumber) {
            errors.push('Please select a supplier or enter mobile number');
        }

        // Purchase number validation
        if (!formData.invoiceNumber) {
            errors.push('Purchase number is required');
        } else {
            const gstPattern = /^PUR-GST-\d{8}-\d{4}$/;
            const nonGstPattern = /^PUR-\d{8}-\d{4}$/;

            if (formData.invoiceType === 'gst' && !gstPattern.test(formData.invoiceNumber)) {
                errors.push('GST purchase number must follow format: PUR-GST-YYYYMMDD-XXXX');
            }

            if (formData.invoiceType === 'non-gst' && !nonGstPattern.test(formData.invoiceNumber)) {
                errors.push('Purchase number must follow format: PUR-YYYYMMDD-XXXX');
            }
        }

        // Purchase date validation
        if (!formData.invoiceDate) {
            errors.push('Purchase date is required');
        } else {
            const purchaseDate = new Date(formData.invoiceDate);
            const today = new Date();
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(today.getFullYear() - 1);

            if (purchaseDate > today) {
                errors.push('Purchase date cannot be in the future');
            }

            if (purchaseDate < oneYearAgo) {
                errors.push('Purchase date cannot be more than one year old');
            }
        }

        // Items validation
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
                errors.push(`${itemsWithoutHSN.length} item(s) are missing HSN codes. HSN codes are required for GST purchases.`);
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
            errors.push('Purchase total must be greater than zero');
        }

        return errors;
    };

    // Enhanced save handler (matching SalesForm structure)
    const handleSave = (invoiceDataFromTable) => {
        console.log('📥 PurchaseForm received invoice data:', invoiceDataFromTable);

        const errors = validateForm();

        if (errors.length > 0) {
            const errorMessage = 'Please fix the following errors:\n\n' + errors.join('\n');
            if (addToast) {
                addToast(errorMessage, 'error');
            } else {
                alert(errorMessage);
            }
            return Promise.resolve({
                success: false,
                error: 'Validation failed',
                message: errors.join('; ')
            });
        }

        // Use data from ItemsTableWithTotals if provided, otherwise use form data
        const itemsToSave = invoiceDataFromTable?.items || formData.items.filter(item =>
            item.itemName &&
            parseFloat(item.quantity) > 0 &&
            parseFloat(item.pricePerUnit) > 0
        );

        // Build purchase data (mapped from invoice structure)
        const purchaseData = {
            ...formData,
            companyId: effectiveCompanyId,
            items: itemsToSave,

            // Map fields for purchase context
            purchaseNumber: formData.invoiceNumber,
            purchaseDate: formData.invoiceDate,
            purchaseType: formData.invoiceType,
            supplier: formData.customer, // Customer field represents supplier
            supplierName: formData.customer?.name || formData.customer?.businessName || 'Cash Supplier',
            supplierMobile: formData.mobileNumber || formData.customer?.mobile || '',

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

            // Include payment information
            paymentInfo: invoiceDataFromTable?.paymentInfo || {
                method: formData.paymentMethod,
                amount: invoiceDataFromTable?.paymentInfo?.amount || 0,
                notes: formData.notes || ''
            },

            // Include round-off information
            roundOff: invoiceDataFromTable?.roundOff || {
                enabled: false,
                value: 0
            },

            // Additional metadata
            gstCalculationMode: invoiceDataFromTable?.gstEnabled !== undefined
                ? (invoiceDataFromTable.gstEnabled ? 'enabled' : 'disabled')
                : (formData.gstEnabled ? 'enabled' : 'disabled'),

            purchaseMetadata: {
                formType: 'purchase',
                createdFrom: 'ItemsTableWithTotals',
                hasPayment: !!(invoiceDataFromTable?.paymentInfo?.amount),
                paymentAmount: invoiceDataFromTable?.paymentInfo?.amount || 0,
                enhancedDataProvided: !!invoiceDataFromTable,
                calculationMethod: 'ItemsTableWithTotals',
                isEdit: !!editingPurchase
            },

            // Timestamps
            createdAt: editingPurchase?.createdAt || new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        console.log('💾 Saving purchase data with totals:', {
            purchaseNumber: purchaseData.purchaseNumber,
            itemCount: purchaseData.items.length,
            totalsFinalTotal: purchaseData.totals.finalTotal,
            hasPayment: !!purchaseData.paymentInfo,
            gstEnabled: purchaseData.gstEnabled,
            companyId: purchaseData.companyId,
            isEdit: !!editingPurchase
        });

        // Handle save operation (matching SalesForm pattern)
        if (onSave) {
            try {
                const result = onSave(purchaseData);
                console.log('📨 onSave returned:', result);

                // Handle both sync and async onSave functions
                if (result && typeof result.then === 'function') {
                    // onSave returns a promise
                    return result.then(successResult => {
                        console.log('✅ Async save completed:', successResult);

                        if (successResult && successResult.success) {
                            return {
                                success: true,
                                data: successResult.data || successResult,
                                message: successResult.message || 'Purchase saved successfully',
                                totals: purchaseData.totals,
                                paymentInfo: purchaseData.paymentInfo,
                                purchaseNumber: purchaseData.purchaseNumber,
                                originalResult: successResult
                            };
                        } else {
                            return {
                                success: true,
                                data: successResult || purchaseData,
                                message: 'Purchase saved successfully',
                                totals: purchaseData.totals,
                                paymentInfo: purchaseData.paymentInfo,
                                purchaseNumber: purchaseData.purchaseNumber,
                                originalResult: successResult
                            };
                        }

                    }).catch(error => {
                        console.error('❌ Error in async onSave:', error);
                        if (addToast) {
                            addToast('Error saving purchase: ' + error.message, 'error');
                        }
                        return {
                            success: false,
                            error: error.message || 'Save operation failed',
                            data: null,
                            totals: purchaseData.totals
                        };
                    });
                } else {
                    // onSave returns synchronously
                    console.log('✅ Sync save completed:', result);

                    if (result && result.success) {
                        return Promise.resolve({
                            success: true,
                            data: result.data || result,
                            message: result.message || 'Purchase saved successfully',
                            totals: purchaseData.totals,
                            paymentInfo: purchaseData.paymentInfo,
                            purchaseNumber: purchaseData.purchaseNumber,
                            originalResult: result
                        });
                    } else {
                        return Promise.resolve({
                            success: true,
                            data: result || purchaseData,
                            message: 'Purchase saved successfully',
                            totals: purchaseData.totals,
                            paymentInfo: purchaseData.paymentInfo,
                            purchaseNumber: purchaseData.purchaseNumber,
                            originalResult: result
                        });
                    }
                }
            } catch (error) {
                console.error('❌ Error in onSave:', error);
                if (addToast) {
                    addToast('Error saving purchase: ' + error.message, 'error');
                }
                return Promise.resolve({
                    success: false,
                    error: error.message || 'Save operation failed',
                    data: null,
                    totals: purchaseData.totals
                });
            }
        } else {
            console.warn('⚠️ No onSave handler provided');
            return Promise.resolve({
                success: false,
                error: 'No save handler provided',
                data: null,
                totals: purchaseData.totals
            });
        }
    };

    // Handle share (matching SalesForm)
    const handleShare = () => {
        const errors = validateForm();

        if (errors.length > 0) {
            const message = 'Please complete the purchase before sharing:\n\n' + errors.join('\n');
            if (addToast) {
                addToast(message, 'warning');
            } else {
                alert(message);
            }
            return;
        }

        const shareData = {
            companyId: effectiveCompanyId,
            purchaseNumber: formData.invoiceNumber,
            purchaseType: formData.invoiceType,
            supplier: formData.customer || { name: 'Cash Supplier', phone: formData.mobileNumber },
            itemCount: formData.items.filter(item => item.itemName).length
        };

        console.log('📤 Sharing purchase:', shareData);

        const shareText = `Purchase ${formData.invoiceNumber} ready to share!`;
        if (addToast) {
            addToast(shareText, 'info');
        } else {
            alert(shareText);
        }
    };

    // Handle adding new item (matching SalesForm)
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
                console.log('✅ Product added (simulated):', productData.name);
                return { id: Date.now(), ...productData };
            }
        } catch (error) {
            console.error('❌ Error adding product:', error);
            if (addToast) {
                addToast('Error adding product: ' + error.message, 'error');
            }
            return false;
        }
    };

    // Auto-save draft functionality (matching SalesForm)
    useEffect(() => {
        if (formData.invoiceNumber && effectiveCompanyId && !editingPurchase) {
            const draftKey = `purchase_draft_${effectiveCompanyId}_${formData.invoiceNumber}`;
            const draftData = {
                ...formData,
                companyId: effectiveCompanyId,
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
                const keys = Object.keys(localStorage).filter(key => key.startsWith('purchase_draft_'));
                if (keys.length > 10) {
                    keys.slice(0, -10).forEach(key => localStorage.removeItem(key));
                }
            } catch (error) {
                console.warn('Could not cleanup drafts:', error);
            }
        };
    }, [formData, effectiveCompanyId, editingPurchase]);

    // Show loading state if no companyId is available (matching SalesForm)
    if (!effectiveCompanyId) {
        return (
            <div className="purchase-form-wrapper" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
                <Container fluid className="py-3 px-4">
                    <Card className="border-warning">
                        <Card.Body className="text-center py-5">
                            <div className="text-warning mb-3">
                                <i className="fas fa-exclamation-triangle fa-3x"></i>
                            </div>
                            <h5 className="text-warning">Company Not Selected</h5>
                            <p className="text-muted">
                                Please select a company to create purchase orders.
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
        <div className="purchase-form-wrapper" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <Container fluid className="py-3 px-4">
                {/* Compact Header Section */}
                <div className="mb-3">
                    <GSTToggle
                        gstEnabled={formData.gstEnabled}
                        invoiceType={formData.invoiceType}
                        onChange={handleGSTToggleChange}
                        formType="purchase" // Pass form type for purchase-specific styling
                    />
                </div>

                {/* Supplier and Purchase Details Row */}
                <Row className="g-3 mb-3">
                    <Col lg={6}>
                        <Card className="h-100 border-0 shadow-sm">
                            <Card.Body className="p-3">
                                <CustomerSection
                                    customer={formData.customer} // customer field represents supplier
                                    mobileNumber={formData.mobileNumber}
                                    onCustomerChange={(supplier) => updateFormData('customer', supplier)}
                                    onMobileChange={(mobile) => updateFormData('mobileNumber', mobile)}
                                    isSupplierMode={true} // Important: Set to supplier mode
                                    formType="purchase" // Pass form type
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
                                    isPurchaseMode={true} // Important: Set to purchase mode
                                    formType="purchase" // Pass form type
                                />
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Items Table with Totals */}
                <div className="mb-3">
                    <ItemsTableWithTotals
                        items={formData.items}
                        onItemsChange={handleItemsChange}
                        categories={categories}
                        inventoryItems={inventoryItems}
                        companyId={effectiveCompanyId}
                        gstEnabled={formData.gstEnabled}
                        formType="purchase" // Important: Set to purchase mode
                        onSave={handleSave}
                        onShare={handleShare}
                        onCancel={onCancel}
                        selectedCustomer={null} // No customer for purchases
                        selectedSupplier={formData.customer} // Pass supplier (stored in customer field)
                        invoiceNumber={formData.invoiceNumber} // Use purchase number
                        invoiceDate={formData.invoiceDate}
                        userId={null}
                        defaultTaxMode="without-tax" // Default for purchases
                        bankAccounts={bankAccounts} // Pass bank accounts for transactions
                        addToast={addToast}
                    />
                </div>

                {/* Debug section for development (matching SalesForm) */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mb-3">
                        <Card className="bg-warning bg-opacity-10 border-warning">
                            <Card.Body className="p-3">
                                <h6 className="text-warning mb-2">🔧 Debug - PurchaseForm State</h6>
                                <Row className="small text-muted">
                                    <Col md={4}>
                                        <div><strong>Form Data:</strong></div>
                                        <div>GST Enabled: {formData.gstEnabled ? 'Yes' : 'No'}</div>
                                        <div>Purchase Type: {formData.invoiceType}</div>
                                        <div>Purchase Number: {formData.invoiceNumber}</div>
                                        <div>Company ID: {effectiveCompanyId}</div>
                                        <div>Is Edit: {editingPurchase ? 'Yes' : 'No'}</div>
                                    </Col>
                                    <Col md={4}>
                                        <div><strong>Supplier Info:</strong></div>
                                        <div>Supplier: {formData.customer?.name || 'None'}</div>
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

export default PurchaseForm;