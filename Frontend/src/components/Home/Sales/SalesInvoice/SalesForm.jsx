import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import GSTToggle from './SalesForm/GSTToggle';
import CustomerSection from './SalesForm/CustomerSection';
import InvoiceDetails from './SalesForm/InvoiceDetails';
import ItemsTable from './SalesForm/ItemsTable';
import TotalSection from './SalesForm/TotalSection';
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
        roundOff: 0,
        roundOffEnabled: false,
        notes: ''
    });

    // ✅ NEW: Separate state for totals from ItemsTable
    const [itemsTableTotals, setItemsTableTotals] = useState({
        subtotal: 0,
        totalCGST: 0,
        totalSGST: 0,
        totalTax: 0,
        finalTotal: 0
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
            cgstAmount: 0, // ✅ FIXED: Use cgstAmount instead of cgst
            sgstAmount: 0, // ✅ FIXED: Use sgstAmount instead of sgst
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

    // ✅ NEW: Handle totals from ItemsTable
    const handleTotalsChange = useCallback((newTotals) => {
        console.log('📊 SalesForm received totals from ItemsTable:', newTotals);
        setItemsTableTotals(newTotals);
    }, []);

    // ✅ FIXED: Enhanced totals calculation that includes round off
    const totals = useMemo(() => {
        // Use totals from ItemsTable as base - DON'T modify finalTotal here
        const baseTotals = {
            subtotal: itemsTableTotals.subtotal || 0,
            totalCGST: itemsTableTotals.totalCGST || 0,
            totalSGST: itemsTableTotals.totalSGST || 0,
            totalTax: itemsTableTotals.totalTax || 0,
            finalTotal: itemsTableTotals.finalTotal || 0 // ✅ Keep the exact amount from ItemsTable
        };

        // ✅ DON'T apply round off here - let TotalSection handle it
        const calculatedTotals = {
            ...baseTotals
            // ✅ Remove the finalTotal override - let TotalSection add round off
        };

        console.log('🧮 SalesForm calculated final totals:', {
            fromItemsTable: itemsTableTotals,
            roundOff: formData.roundOff,
            roundOffEnabled: formData.roundOffEnabled,
            finalCalculated: calculatedTotals
        });

        return calculatedTotals;
    }, [itemsTableTotals, formData.roundOff, formData.roundOffEnabled]);

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

    // ✅ FIXED: Handle round off changes with immediate totals update
    const handleRoundOffChange = useCallback((value) => {
        const roundOffValue = parseFloat(value) || 0;
        console.log('🔄 Round off changing to:', roundOffValue);
        updateFormData('roundOff', roundOffValue);
    }, []);

    const handleRoundOffToggle = useCallback((enabled) => {
        console.log('🔄 Round off toggle:', enabled);
        updateFormData('roundOffEnabled', enabled);
        if (!enabled) {
            updateFormData('roundOff', 0);
        }
    }, []);

    // Enhanced validation function
    const validateForm = () => {
        const errors = [];

        // Company validation
        if (!effectiveCompanyId) {
            errors.push('Company selection is required');
        }

        // Customer validation
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
                errors.push('HSN codes are required for GST invoices');
            }
        }

        // Amount validation
        if (totals.finalTotal <= 0) {
            errors.push('Invoice total must be greater than zero');
        }

        return errors;
    };

    // Handle save
    const handleSave = () => {
        const errors = validateForm();

        if (errors.length > 0) {
            alert('Please fix the following errors:\n\n' + errors.join('\n'));
            return;
        }

        const validItems = formData.items.filter(item =>
            item.itemName &&
            parseFloat(item.quantity) > 0 &&
            parseFloat(item.pricePerUnit) > 0
        );

        const saleData = {
            ...formData,
            companyId: effectiveCompanyId,
            items: validItems,
            totals,
            itemsTableTotals, // ✅ NEW: Include raw totals from ItemsTable
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        console.log('💾 Saving invoice data:', saleData);

        if (onSave) {
            onSave(saleData);
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
            totals,
            itemsTableTotals, // ✅ NEW: Include ItemsTable totals for reference
            itemCount: formData.items.filter(item => item.itemName).length
        };

        console.log('📤 Sharing invoice:', shareData);
        alert(`Invoice ${formData.invoiceNumber} ready to share!\nTotal: ₹${totals.finalTotal.toLocaleString('en-IN')}`);
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

    // Auto-save draft functionality
    useEffect(() => {
        if (formData.invoiceNumber && effectiveCompanyId) {
            const draftKey = `invoice_draft_${effectiveCompanyId}_${formData.invoiceNumber}`;
            const draftData = {
                ...formData,
                companyId: effectiveCompanyId,
                totals,
                itemsTableTotals, // ✅ NEW: Include ItemsTable totals in draft
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
    }, [formData, totals, itemsTableTotals, effectiveCompanyId]);

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

                {/* ✅ FIXED: Items Table with correct props */}
                <div className="mb-3">
                    <ItemsTable
                        items={formData.items} // ✅ FIXED: Use formData.items
                        gstEnabled={formData.gstEnabled} // ✅ FIXED: Use formData.gstEnabled
                        invoiceType={formData.invoiceType} // ✅ FIXED: Use formData.invoiceType
                        onItemsChange={handleItemsChange}
                        onTotalsChange={handleTotalsChange} // ✅ FIXED: This handles totals from ItemsTable
                        createEmptyItem={createEmptyItem}
                        onAddItem={handleAddItem} // ✅ FIXED: Use handleAddItem instead of onAddItem
                        companyId={effectiveCompanyId} // ✅ FIXED: Use effectiveCompanyId
                    />
                </div>

                {/* ✅ FIXED: Total Section with proper props */}
                <div className="mb-3">
                    <TotalSection
                        totals={totals} // ✅ FIXED: Pass calculated totals with round off
                        roundOff={formData.roundOff}
                        roundOffEnabled={formData.roundOffEnabled}
                        onRoundOffChange={handleRoundOffChange}
                        onRoundOffToggle={handleRoundOffToggle}
                        onSave={handleSave}
                        onShare={handleShare}
                        onCancel={onCancel}
                        formType="sales"
                        gstEnabled={formData.gstEnabled} // ✅ NEW: Pass GST enabled status
                    />
                </div>

                {/* ✅ NEW: Debug section for development */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mb-3">
                        <Card className="bg-info bg-opacity-10 border-info">
                            <Card.Body className="p-3">
                                <h6 className="text-info mb-2">🔧 Debug - SalesForm Totals Flow</h6>
                                <Row className="small text-muted">
                                    <Col md={4}>
                                        <div><strong>ItemsTable Totals:</strong></div>
                                        <div>Subtotal: ₹{itemsTableTotals.subtotal}</div>
                                        <div>CGST: ₹{itemsTableTotals.totalCGST}</div>
                                        <div>SGST: ₹{itemsTableTotals.totalSGST}</div>
                                        <div>Base Total: ₹{itemsTableTotals.finalTotal}</div>
                                    </Col>
                                    <Col md={4}>
                                        <div><strong>Round Off:</strong></div>
                                        <div>Enabled: {formData.roundOffEnabled ? 'Yes' : 'No'}</div>
                                        <div>Amount: ₹{formData.roundOff || 0}</div>
                                        <div>GST Enabled: {formData.gstEnabled ? 'Yes' : 'No'}</div>
                                    </Col>
                                    <Col md={4}>
                                        <div><strong>Final Totals:</strong></div>
                                        <div>Subtotal: ₹{totals.subtotal}</div>
                                        <div>Total Tax: ₹{totals.totalTax}</div>
                                        <div>Final Total: ₹{totals.finalTotal}</div>
                                        <div>Items Count: {formData.items.length}</div>
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