import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import GSTToggle from './SalesForm/GSTToggle';
import CustomerSection from './SalesForm/CustomerSection';
import InvoiceDetails from './SalesForm/InvoiceDetails';
import ItemsTable from './SalesForm/ItemsTable';
import TotalSection from './SalesForm/TotalSection';
import './SalesForm.css';

function SalesForm({ onSave, onCancel, onExit, inventoryItems = [], categories = [], onAddItem }) {
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
        console.log('📋 Changing invoice type to:', newType);

        const gstEnabled = newType === 'gst';
        const newInvoiceNumber = generateInvoiceNumber(newType);

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
                cgst: enabled ? item.cgst : 0,
                sgst: enabled ? item.sgst : 0,
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

    // Enhanced totals calculation with useMemo for performance
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

    // Enhanced validation function
    const validateForm = () => {
        const errors = [];

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
            items: validItems,
            totals,
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
            invoiceNumber: formData.invoiceNumber,
            invoiceType: formData.invoiceType,
            customer: formData.customer || { name: 'Cash Customer', phone: formData.mobileNumber },
            totals,
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
        if (formData.invoiceNumber) {
            const draftKey = `invoice_draft_${formData.invoiceNumber}`;
            const draftData = {
                ...formData,
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
                const keys = Object.keys(localStorage).filter(key => key.startsWith('invoice_draft_'));
                if (keys.length > 10) {
                    keys.slice(0, -10).forEach(key => localStorage.removeItem(key));
                }
            } catch (error) {
                console.warn('Could not cleanup drafts:', error);
            }
        };
    }, [formData, totals]);

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
                        onCancel={onCancel}
                        formType="sales"
                    />
                </div>

                {/* Enhanced Debug Information - Development Only */}
                {process.env.NODE_ENV === 'development' && (
                    <Card className="mt-4 bg-warning bg-opacity-10 border border-warning">
                        <Card.Body className="p-3">
                            <h6 className="text-warning mb-3">🔧 Development Debug Information</h6>

                            <Row className="small text-dark">
                                <Col md={3}>
                                    <div className="mb-2">
                                        <strong>Form State:</strong><br />
                                        GST Enabled: {formData.gstEnabled ? '✅' : '❌'}<br />
                                        Invoice Type: {formData.invoiceType}<br />
                                        Items Count: {formData.items.length}<br />
                                        Valid Items: {formData.items.filter(item => item.itemName && parseFloat(item.quantity) > 0).length}
                                    </div>
                                </Col>

                                <Col md={3}>
                                    <div className="mb-2">
                                        <strong>Amounts:</strong><br />
                                        Subtotal: ₹{totals.subtotal.toLocaleString('en-IN')}<br />
                                        Discount: ₹{totals.totalDiscountAmount.toLocaleString('en-IN')}<br />
                                        After Discount: ₹{totals.amountAfterDiscount.toLocaleString('en-IN')}
                                    </div>
                                </Col>

                                <Col md={3}>
                                    <div className="mb-2">
                                        <strong>Tax Details:</strong><br />
                                        CGST: ₹{totals.totalCGST.toLocaleString('en-IN')}<br />
                                        SGST: ₹{totals.totalSGST.toLocaleString('en-IN')}<br />
                                        Total Tax: ₹{totals.totalTaxAmount.toLocaleString('en-IN')}
                                    </div>
                                </Col>

                                <Col md={3}>
                                    <div className="mb-2">
                                        <strong>Final Calculation:</strong><br />
                                        Base Total: ₹{totals.baseTotal.toLocaleString('en-IN')}<br />
                                        Round Off: {formData.roundOffEnabled ? `₹${formData.roundOff}` : 'Disabled'}<br />
                                        <span className="fw-bold text-success">Final Total: ₹{totals.finalTotal.toLocaleString('en-IN')}</span>
                                    </div>
                                </Col>
                            </Row>

                            <div className="mt-3 pt-3 border-top">
                                <strong>Recent Item Changes:</strong>
                                <div className="mt-2" style={{ maxHeight: '150px', overflow: 'auto' }}>
                                    {formData.items.map((item, index) => (
                                        item.itemName && (
                                            <div key={item.id} className="small mb-1 p-2 bg-white rounded border">
                                                <strong>Item {index + 1}:</strong> {item.itemName} |
                                                Qty: {item.quantity} |
                                                Price: ₹{item.pricePerUnit} |
                                                Tax Mode: {item.taxMode} |
                                                Tax Rate: {item.taxRate}% |
                                                Amount: ₹{item.amount}
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                )}
            </Container>
        </div>
    );
}

export default SalesForm;