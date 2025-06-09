import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom'; // ✅ Add useNavigate
import GSTToggle from '../Sales/SalesInvoice/SalesForm/GSTToggle';
import CustomerSection from '../Sales/SalesInvoice/SalesForm/CustomerSection';
import InvoiceDetails from '../Sales/SalesInvoice/SalesForm/InvoiceDetails';
import ItemsTable from '../Sales/SalesInvoice/SalesForm/ItemsTable';
import TotalSection from '../Sales/SalesInvoice/SalesForm/TotalSection';
import purchaseService from '../../../services/purchaseService';

function PurchaseForm({ onSave, onCancel, onExit, inventoryItems = [], categories = [], onAddItem }) {
    // ✅ Add navigation hook
    const navigate = useNavigate();

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

    // ✅ Add loading and error states for backend operations
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Generate purchase number function (adapted from sales)
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

    // Initialize form data state
    const [formData, setFormData] = useState({
        gstEnabled: true,
        invoiceType: 'gst',
        supplier: null,
        mobileNumber: '',
        purchaseNumber: generatePurchaseNumber('gst'),
        purchaseDate: new Date().toISOString().split('T')[0],
        items: [],
        paymentMethod: 'cash',
        roundOff: 0,
        roundOffEnabled: false,
        notes: ''
    });

    // Create empty item function - now has access to formData
    const createEmptyItem = () => {
        return {
            id: Date.now() + Math.random(),
            itemName: '',
            hsnCode: '',
            quantity: '',
            unit: 'NONE',
            pricePerUnit: '',
            discountPercent: 0,
            discountAmount: 0,
            taxRate: formData.gstEnabled ? 18 : 0,
            taxAmount: 0,
            taxMode: 'with-tax',
            cgst: 0,
            sgst: 0,
            igst: 0,
            amount: 0
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
        console.log('📋 Changing purchase type to:', newType);

        const gstEnabled = newType === 'gst';
        const newPurchaseNumber = generatePurchaseNumber(newType);

        setFormData(prev => {
            const updatedItems = prev.items.map(item => ({
                ...item,
                taxRate: gstEnabled ? (item.taxRate || 18) : 0,
                cgst: gstEnabled ? item.cgst : 0,
                sgst: gstEnabled ? item.sgst : 0,
                igst: gstEnabled ? item.igst : 0,
                taxAmount: gstEnabled ? item.taxAmount : 0
            }));

            return {
                ...prev,
                invoiceType: newType,
                gstEnabled,
                purchaseNumber: newPurchaseNumber,
                items: updatedItems
            };
        });
    };

    // Handle GST toggle change
    const handleGSTToggleChange = (enabled) => {
        console.log('🔄 GST Toggle changed to:', enabled);

        const newInvoiceType = enabled ? 'gst' : 'non-gst';
        const newPurchaseNumber = generatePurchaseNumber(newInvoiceType);

        setFormData(prev => {
            const updatedItems = prev.items.map(item => ({
                ...item,
                taxRate: enabled ? (item.taxRate || 18) : 0,
                cgst: enabled ? item.cgst : 0,
                sgst: enabled ? item.sgst : 0,
                igst: enabled ? item.igst : 0,
                taxAmount: enabled ? item.taxAmount : 0
            }));

            return {
                ...prev,
                gstEnabled: enabled,
                invoiceType: newInvoiceType,
                purchaseNumber: newPurchaseNumber,
                items: updatedItems
            };
        });
    };

    // Enhanced totals calculation with useMemo for performance (adapted from sales)
    const totals = useMemo(() => {
        let subtotal = 0;
        let totalDiscountAmount = 0;
        let totalTaxAmount = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        let totalIGST = 0;

        formData.items.forEach(item => {
            const quantity = parseFloat(item.quantity) || 0;
            const pricePerUnit = parseFloat(item.pricePerUnit) || 0;

            if (quantity > 0 && pricePerUnit > 0) {
                // Base amount calculation
                const baseAmount = quantity * pricePerUnit;
                subtotal += baseAmount;

                // Add up the calculated amounts from items
                totalDiscountAmount += parseFloat(item.discountAmount) || 0;
                totalTaxAmount += parseFloat(item.taxAmount) || 0;
                totalCGST += parseFloat(item.cgst) || 0;
                totalSGST += parseFloat(item.sgst) || 0;
                totalIGST += parseFloat(item.igst) || 0;
            }
        });

        // Calculate final amounts
        const amountAfterDiscount = subtotal - totalDiscountAmount;
        const baseTotal = amountAfterDiscount + (formData.gstEnabled ? totalTaxAmount : 0);
        const finalTotal = baseTotal + (formData.roundOffEnabled ? (formData.roundOff || 0) : 0);

        return {
            subtotal: parseFloat(subtotal.toFixed(2)),
            totalDiscountAmount: parseFloat(totalDiscountAmount.toFixed(2)),
            totalTaxAmount: parseFloat(totalTaxAmount.toFixed(2)),
            totalCGST: parseFloat(totalCGST.toFixed(2)),
            totalSGST: parseFloat(totalSGST.toFixed(2)),
            totalIGST: parseFloat(totalIGST.toFixed(2)),
            amountAfterDiscount: parseFloat(amountAfterDiscount.toFixed(2)),
            baseTotal: parseFloat(baseTotal.toFixed(2)),
            finalTotal: parseFloat(finalTotal.toFixed(2))
        };
    }, [formData.items, formData.gstEnabled, formData.roundOff, formData.roundOffEnabled]);

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

    // Handle round off changes
    const handleRoundOffChange = (value) => {
        const roundOffValue = parseFloat(value) || 0;
        updateFormData('roundOff', roundOffValue);
    };

    const handleRoundOffToggle = (enabled) => {
        updateFormData('roundOffEnabled', enabled);
        if (!enabled) {
            updateFormData('roundOff', 0);
        }
    };

    // Enhanced validation function (adapted from sales)
    const validateForm = () => {
        const errors = [];

        // Company validation
        if (!effectiveCompanyId) {
            errors.push('Company selection is required');
        }

        // Supplier validation (adapted from customer validation)
        if (!formData.supplier && !formData.mobileNumber) {
            errors.push('Please select a supplier or enter mobile number');
        }

        // Purchase number validation (adapted from invoice validation)
        if (!formData.purchaseNumber) {
            errors.push('Purchase number is required');
        } else {
            const gstPattern = /^PUR-GST-\d{8}-\d{4}$/;
            const nonGstPattern = /^PUR-\d{8}-\d{4}$/;

            if (formData.invoiceType === 'gst' && !gstPattern.test(formData.purchaseNumber)) {
                errors.push('GST purchase number must follow format: PUR-GST-YYYYMMDD-XXXX');
            }

            if (formData.invoiceType === 'non-gst' && !nonGstPattern.test(formData.purchaseNumber)) {
                errors.push('Purchase number must follow format: PUR-YYYYMMDD-XXXX');
            }
        }

        // Items validation
        const validItems = formData.items.filter(item =>
            item.itemName &&
            parseFloat(item.quantity) > 0 &&
            parseFloat(item.pricePerUnit) > 0
        );

        if (validItems.length === 0) {
            errors.push('Please add at least one valid item');
        }

        // GST specific validations
        if (formData.invoiceType === 'gst' && formData.gstEnabled) {
            const itemsWithoutHSN = validItems.filter(item => !item.hsnCode);
            if (itemsWithoutHSN.length > 0) {
                errors.push('HSN codes are required for GST purchases');
            }
        }

        // Amount validation
        if (totals.finalTotal <= 0) {
            errors.push('Purchase total must be greater than zero');
        }

        return errors;
    };

    // ✅ ENHANCED: Complete save handler with proper navigation
    const handleSave = async () => {
        console.log('💾 Starting purchase save process...');
        setError('');
        setIsSubmitting(true);

        try {
            // Step 1: Validate form
            const errors = validateForm();
            if (errors.length > 0) {
                throw new Error('Please fix the following errors:\n\n' + errors.join('\n'));
            }

            // Step 2: Prepare valid items
            const validItems = formData.items.filter(item =>
                item.itemName &&
                parseFloat(item.quantity) > 0 &&
                parseFloat(item.pricePerUnit) > 0
            );

            console.log('📦 Valid items prepared:', validItems.length);

            // Step 3: Enhanced supplier data preparation
            let supplierData = null;
            if (formData.supplier) {
                // Use selected supplier
                supplierData = {
                    _id: formData.supplier._id || formData.supplier.id,
                    name: formData.supplier.name || formData.supplier.businessName || 'Unknown Supplier',
                    mobile: formData.supplier.mobile || formData.supplier.phoneNumber || formData.mobileNumber || '',
                    email: formData.supplier.email || '',
                    address: formData.supplier.address || formData.supplier.billingAddress || '',
                    gstNumber: formData.supplier.gstNumber || formData.supplier.gstIN || ''
                };
            } else if (formData.mobileNumber) {
                // Create walk-in supplier from mobile number
                supplierData = {
                    name: `Walk-in Supplier (${formData.mobileNumber})`,
                    mobile: formData.mobileNumber,
                    email: '',
                    address: '',
                    gstNumber: ''
                };
            }

            console.log('🏪 Supplier data prepared:', supplierData);

            // Step 4: Prepare final purchase data
            const purchaseData = {
                ...formData,
                companyId: effectiveCompanyId,
                supplier: supplierData,
                items: validItems,
                totals,
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString()
            };

            console.log('💾 Final purchase data:', {
                companyId: purchaseData.companyId,
                supplierName: supplierData?.name,
                itemsCount: validItems.length,
                finalTotal: totals.finalTotal,
                purchaseNumber: formData.purchaseNumber
            });

            // Step 5: Call purchase service to save to backend
            console.log('🚀 Calling purchase service...');
            const response = await purchaseService.createPurchase(purchaseData);

            console.log('📡 Service response:', response);

            // Step 6: Handle successful response
            if (response && response.success) {
                console.log('✅ Purchase saved successfully to backend:', response.data);

                // Show success message
                const successMessage = `Purchase ${formData.purchaseNumber} saved successfully!\nTotal: ₹${totals.finalTotal.toLocaleString('en-IN')}\n\nRedirecting to purchase bills...`;
                alert(successMessage);

                // Clear the draft from localStorage since purchase is saved
                try {
                    const draftKey = `purchase_draft_${effectiveCompanyId}_${formData.purchaseNumber}`;
                    localStorage.removeItem(draftKey);
                    console.log('🗑️ Cleared purchase draft from localStorage');
                } catch (draftError) {
                    console.warn('Could not clear draft:', draftError);
                }

                // Call parent onSave callback if provided
                if (onSave && typeof onSave === 'function') {
                    try {
                        onSave(response.data);
                    } catch (callbackError) {
                        console.warn('Error in onSave callback:', callbackError);
                    }
                }

                // ✅ Navigate to purchase bills page
                const purchaseBillsUrl = `/companies/${effectiveCompanyId}/purchase-bills`;
                console.log('🔄 Redirecting to:', purchaseBillsUrl);

                // Add a small delay to let the user see the success message
                setTimeout(() => {
                    navigate(purchaseBillsUrl, {
                        replace: true, // Replace current entry in history
                        state: {
                            // Pass success state to the purchase bills page
                            fromPurchaseForm: true,
                            savedPurchase: response.data,
                            successMessage: `Purchase ${formData.purchaseNumber} created successfully!`,
                            timestamp: new Date().toISOString()
                        }
                    });
                }, 1500); // 1.5 second delay to let user read the message

            } else {
                // Handle unsuccessful response
                const errorMsg = response?.message || 'Failed to save purchase - Invalid response from server';
                console.error('❌ Purchase save failed:', errorMsg);
                throw new Error(errorMsg);
            }

        } catch (error) {
            console.error('❌ Error saving purchase:', error);
            setError(error.message);

            // Enhanced error handling with user-friendly messages
            let userErrorMessage = error.message || 'An unexpected error occurred while saving the purchase.';

            // Provide specific guidance based on error type
            if (error.message?.toLowerCase().includes('network')) {
                userErrorMessage += '\n\nPlease check your internet connection and try again.';
            } else if (error.message?.toLowerCase().includes('company')) {
                userErrorMessage += '\n\nPlease ensure you have selected a valid company.';
            } else if (error.message?.toLowerCase().includes('supplier')) {
                userErrorMessage += '\n\nPlease check the supplier information and try again.';
            } else if (error.message?.toLowerCase().includes('validation')) {
                userErrorMessage += '\n\nPlease check all required fields and try again.';
            }

            alert(`Error saving purchase:\n\n${userErrorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ✅ ENHANCED: Handle cancel with navigation option
    const handleCancel = () => {
        // Ask user for confirmation
        const shouldCancel = window.confirm(
            'Are you sure you want to cancel this purchase?\n\nAny unsaved changes will be lost.'
        );

        if (shouldCancel) {
            // Clear any drafts
            try {
                const draftKey = `purchase_draft_${effectiveCompanyId}_${formData.purchaseNumber}`;
                localStorage.removeItem(draftKey);
                console.log('🗑️ Cleared purchase draft on cancel');
            } catch (error) {
                console.warn('Could not clear draft:', error);
            }

            // Call parent onCancel if provided
            if (onCancel && typeof onCancel === 'function') {
                onCancel();
            } else {
                // Navigate back to purchase bills if no onCancel provided
                const purchaseBillsUrl = `/companies/${effectiveCompanyId}/purchase-bills`;
                console.log('🔄 Cancelling - redirecting to:', purchaseBillsUrl);
                navigate(purchaseBillsUrl, {
                    replace: true,
                    state: { cancelled: true }
                });
            }
        }
    };

    // ✅ ENHANCED: Handle exit/close with navigation
    const handleExit = () => {
        if (onExit && typeof onExit === 'function') {
            onExit();
        } else {
            // Navigate back to purchase bills
            const purchaseBillsUrl = `/companies/${effectiveCompanyId}/purchase-bills`;
            console.log('🔄 Exiting - redirecting to:', purchaseBillsUrl);
            navigate(purchaseBillsUrl, { replace: true });
        }
    };

    // Handle share (adapted from sales)
    const handleShare = () => {
        const errors = validateForm();

        if (errors.length > 0) {
            alert('Please complete the purchase before sharing:\n\n' + errors.join('\n'));
            return;
        }

        const shareData = {
            companyId: effectiveCompanyId,
            purchaseNumber: formData.purchaseNumber,
            invoiceType: formData.invoiceType,
            supplier: formData.supplier || { name: 'Cash Purchase', phone: formData.mobileNumber },
            totals,
            itemCount: formData.items.filter(item => item.itemName).length
        };

        console.log('📤 Sharing purchase:', shareData);
        alert(`Purchase ${formData.purchaseNumber} ready to share!\nTotal: ₹${totals.finalTotal.toLocaleString('en-IN')}`);
    };

    // Handle adding new item from ItemsTable (adapted from sales)
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

    // Auto-save draft functionality (adapted from sales)
    useEffect(() => {
        if (formData.purchaseNumber && effectiveCompanyId) {
            const draftKey = `purchase_draft_${effectiveCompanyId}_${formData.purchaseNumber}`;
            const draftData = {
                ...formData,
                companyId: effectiveCompanyId,
                totals,
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
                const keys = Object.keys(localStorage).filter(key => key.startsWith('purchase_draft_'));
                if (keys.length > 10) {
                    keys.slice(0, -10).forEach(key => localStorage.removeItem(key));
                }
            } catch (error) {
                console.warn('Could not cleanup drafts:', error);
            }
        };
    }, [formData, totals, effectiveCompanyId]);

    // ✅ Error display component
    const ErrorMessage = ({ error }) => {
        if (!error) return null;

        return (
            <div className="alert alert-danger mb-3" role="alert">
                <div className="d-flex align-items-center">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    <div>
                        <strong>Error:</strong> {error}
                    </div>
                </div>
            </div>
        );
    };

    // ✅ ENHANCED: Show better loading state if no companyId is available
    if (!effectiveCompanyId) {
        return (
            <div className="purchase-form-wrapper" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
                <Container fluid className="py-3 px-4">
                    <Card className="border-info">
                        <Card.Body className="text-center py-5">
                            <div className="text-info mb-3">
                                <div className="spinner-border" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                            <h5 className="text-info">Loading Company...</h5>
                            <p className="text-muted">
                                Please wait while we load the company information.
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
                {/* ✅ Error Message Display */}
                <ErrorMessage error={error} />

                {/* Compact Header Section */}
                <div className="mb-3">
                    <GSTToggle
                        gstEnabled={formData.gstEnabled}
                        invoiceType={formData.invoiceType}
                        onChange={handleGSTToggleChange}
                    />
                </div>

                {/* Supplier and Purchase Details Row */}
                <Row className="g-3 mb-3">
                    <Col lg={6}>
                        <Card className="h-100 border-0 shadow-sm">
                            <Card.Body className="p-3">
                                <CustomerSection
                                    customer={formData.supplier}
                                    mobileNumber={formData.mobileNumber}
                                    onCustomerChange={(supplier) => {
                                        console.log('🏢 Supplier selected in PurchaseForm:', supplier);
                                        updateFormData('supplier', supplier);
                                    }}
                                    onMobileChange={(mobile) => {
                                        console.log('📱 Mobile number changed in PurchaseForm:', mobile);
                                        updateFormData('mobileNumber', mobile);
                                    }}
                                    isSupplierMode={true}
                                    companyId={effectiveCompanyId}
                                />
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={6}>
                        <Card className="h-100 border-0 shadow-sm">
                            <Card.Body className="p-3">
                                <InvoiceDetails
                                    invoiceNumber={formData.purchaseNumber}
                                    invoiceDate={formData.purchaseDate}
                                    invoiceType={formData.invoiceType}
                                    onInvoiceNumberChange={(number) => updateFormData('purchaseNumber', number)}
                                    onInvoiceDateChange={(date) => updateFormData('purchaseDate', date)}
                                    onInvoiceTypeChange={handleInvoiceTypeChange}
                                    isPurchaseMode={true}
                                />
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Items Table - Full Width */}
                <div className="mb-3">
                    <ItemsTable
                        items={formData.items}
                        gstEnabled={formData.gstEnabled}
                        invoiceType={formData.invoiceType}
                        onItemsChange={handleItemsChange}
                        createEmptyItem={createEmptyItem}
                        inventoryItems={inventoryItems}
                        categories={categories}
                        onAddItem={handleAddItem}
                        companyId={effectiveCompanyId}
                    />
                </div>

                {/* Bottom Action Bar - Full Width */}
                <div className="mb-3">
                    <TotalSection
                        totals={totals}
                        roundOff={formData.roundOff}
                        roundOffEnabled={formData.roundOffEnabled}
                        onRoundOffChange={handleRoundOffChange}
                        onRoundOffToggle={handleRoundOffToggle}
                        onSave={handleSave}
                        onShare={handleShare}
                        onCancel={handleCancel} // ✅ Use updated handleCancel
                        formType="purchase"
                        gstEnabled={formData.gstEnabled}
                        isSubmitting={isSubmitting}
                    />
                </div>

                {/* ✅ Enhanced loading overlay during submission */}
                {isSubmitting && (
                    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
                        style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
                        <div className="bg-white p-4 rounded shadow">
                            <div className="d-flex align-items-center">
                                <div className="spinner-border text-primary me-3" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <div>
                                    <h5 className="mb-1">Saving Purchase...</h5>
                                    <small className="text-muted">
                                        Please wait while we save your purchase to the system.
                                        <br />You will be redirected to the purchase bills page.
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Container>
        </div>
    );
}

export default PurchaseForm;