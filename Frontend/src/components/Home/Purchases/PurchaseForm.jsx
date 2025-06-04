import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import GSTToggle from '../Sales/SalesInvoice/SalesForm/GSTToggle';
import CustomerSection from '../Sales/SalesInvoice/SalesForm/CustomerSection'; // Reuse for suppliers
import InvoiceDetails from '../Sales/SalesInvoice/SalesForm/InvoiceDetails'; // Reuse for purchase details
import ItemsTable from '../Sales/SalesInvoice/SalesForm/ItemsTable';
import TotalSection from '../Sales/SalesInvoice/SalesForm/TotalSection';
// import './PurchaseForm.css';

// Generate purchase number with proper typing - MOVED OUTSIDE COMPONENT
function generatePurchaseNumber(invoiceType = 'non-gst') {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);

    if (invoiceType === 'gst') {
        return `PUR-GST-${year}${month}${day}-${random}`;
    } else {
        return `PUR-${year}${month}${day}-${random}`;
    }
}

// Create empty item - MOVED OUTSIDE COMPONENT
function createEmptyItem() {
    return {
        id: Date.now(),
        itemName: '',
        hsnCode: '',
        quantity: 1,
        unit: 'PCS',
        pricePerUnit: 0,
        taxInclusive: false,
        taxRate: 18,
        cgst: 0,
        sgst: 0,
        amount: 0
    };
}

function PurchaseForm({ onSave, onCancel }) {
    // Main state - Using PURCHASE-SPECIFIC field names
    const [formData, setFormData] = useState({
        gstEnabled: true,
        invoiceType: 'gst',
        supplier: null, // Changed from 'customer' to 'supplier'
        mobileNumber: '',
        purchaseNumber: generatePurchaseNumber('gst'), // Changed from 'invoiceNumber' to 'purchaseNumber'
        purchaseDate: new Date().toISOString().split('T')[0], // Changed from 'invoiceDate' to 'purchaseDate'
        items: [createEmptyItem()],
        paymentMethod: 'cash',
        roundOff: 0,
        roundOffEnabled: false,
        notes: ''
    });

    // Handle invoice type change - UPDATED FOR PURCHASE
    const handleInvoiceTypeChange = (newType) => {
        console.log('📋 Changing purchase type to:', newType);

        updateFormData('invoiceType', newType);
        const gstEnabled = newType === 'gst';
        updateFormData('gstEnabled', gstEnabled);

        const newPurchaseNumber = generatePurchaseNumber(newType);
        updateFormData('purchaseNumber', newPurchaseNumber); // Use purchaseNumber

        if (newType === 'non-gst') {
            const updatedItems = formData.items.map(item => ({
                ...item,
                taxRate: 0,
                cgst: 0,
                sgst: 0,
                taxInclusive: false
            }));
            updateFormData('items', updatedItems);
        } else {
            const updatedItems = formData.items.map(item => ({
                ...item,
                taxRate: item.taxRate || 18
            }));
            updateFormData('items', updatedItems);
        }
    };

    // Handle GST toggle change - UPDATED FOR PURCHASE
    const handleGSTToggleChange = (enabled) => {
        console.log('🔄 GST Toggle changed to:', enabled);

        updateFormData('gstEnabled', enabled);
        const newInvoiceType = enabled ? 'gst' : 'non-gst';
        updateFormData('invoiceType', newInvoiceType);

        const newPurchaseNumber = generatePurchaseNumber(newInvoiceType);
        updateFormData('purchaseNumber', newPurchaseNumber); // Use purchaseNumber

        if (!enabled) {
            const updatedItems = formData.items.map(item => ({
                ...item,
                taxRate: 0,
                cgst: 0,
                sgst: 0,
                taxInclusive: false
            }));
            updateFormData('items', updatedItems);
        } else {
            const updatedItems = formData.items.map(item => ({
                ...item,
                taxRate: item.taxRate || 18
            }));
            updateFormData('items', updatedItems);
        }
    };

    // Calculate totals - SAME AS SALES FORM
    // Update the calculateTotals function in PurchaseForm.jsx
    const calculateTotals = () => {
        let subtotal = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        let totalTax = 0;

        formData.items.forEach(item => {
            if (item.itemName && item.quantity > 0 && item.pricePerUnit > 0) {
                const quantity = parseFloat(item.quantity) || 0;
                const pricePerUnit = parseFloat(item.pricePerUnit) || 0;
                const taxRate = parseFloat(item.taxRate) || 0;

                console.log(`Item: ${item.itemName}, Qty: ${quantity}, Price: ${pricePerUnit}, Tax: ${taxRate}%, Inclusive: ${item.taxInclusive}`);

                if (formData.gstEnabled && formData.invoiceType === 'gst' && taxRate > 0) {
                    if (item.taxInclusive) {
                        // Tax Inclusive calculation
                        const totalAmount = quantity * pricePerUnit;
                        const taxableAmount = totalAmount / (1 + taxRate / 100);
                        const taxAmount = totalAmount - taxableAmount;
                        const cgst = taxAmount / 2;
                        const sgst = taxAmount / 2;

                        subtotal += taxableAmount;
                        totalCGST += cgst;
                        totalSGST += sgst;
                        totalTax += taxAmount;

                        console.log(`Tax Inclusive - Total: ${totalAmount}, Taxable: ${taxableAmount}, Tax: ${taxAmount}`);
                    } else {
                        // Tax Exclusive calculation
                        const baseAmount = quantity * pricePerUnit;
                        const taxAmount = (baseAmount * taxRate) / 100;
                        const cgst = taxAmount / 2;
                        const sgst = taxAmount / 2;

                        subtotal += baseAmount;
                        totalCGST += cgst;
                        totalSGST += sgst;
                        totalTax += taxAmount;

                        console.log(`Tax Exclusive - Base: ${baseAmount}, Tax: ${taxAmount}, Total: ${baseAmount + taxAmount}`);
                    }
                } else {
                    // No tax calculation
                    const baseAmount = quantity * pricePerUnit;
                    subtotal += baseAmount;

                    console.log(`No Tax - Amount: ${baseAmount}`);
                }
            }
        });

        const roundOffAmount = formData.roundOffEnabled ? (parseFloat(formData.roundOff) || 0) : 0;
        const finalTotal = subtotal + totalTax + roundOffAmount;

        const calculatedTotals = {
            subtotal: parseFloat(subtotal.toFixed(2)),
            totalCGST: parseFloat(totalCGST.toFixed(2)),
            totalSGST: parseFloat(totalSGST.toFixed(2)),
            totalTax: parseFloat(totalTax.toFixed(2)),
            finalTotal: parseFloat(finalTotal.toFixed(2))
        };

        console.log('Final Totals:', calculatedTotals);
        return calculatedTotals;
    };

    const totals = calculateTotals();

    // Update form data - SAME AS SALES FORM
    const updateFormData = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Validation function - ADAPTED FOR PURCHASE
    const validateForm = () => {
        const errors = [];

        if (!formData.supplier && !formData.mobileNumber) {
            errors.push('Please select a supplier or enter mobile number');
        }

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

        const validItems = formData.items.filter(item =>
            item.itemName && item.quantity > 0 && item.pricePerUnit > 0
        );

        if (validItems.length === 0) {
            errors.push('Please add at least one valid item');
        }

        if (formData.invoiceType === 'gst' && formData.gstEnabled) {
            const itemsWithoutHSN = validItems.filter(item => !item.hsnCode);
            if (itemsWithoutHSN.length > 0) {
                errors.push('HSN codes are required for GST purchases');
            }
        }

        return errors;
    };

    // Handle save - ADAPTED FOR PURCHASE
    const handleSave = () => {
        const errors = validateForm();

        if (errors.length > 0) {
            alert('Please fix the following errors:\n\n' + errors.join('\n'));
            return;
        }

        const validItems = formData.items.filter(item =>
            item.itemName && item.quantity > 0 && item.pricePerUnit > 0
        );

        const purchaseData = {
            ...formData,
            items: validItems,
            totals,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        console.log('💾 Saving purchase data:', purchaseData);

        if (onSave) {
            onSave(purchaseData);
        }
    };

    // Handle share - ADAPTED FOR PURCHASE
    const handleShare = () => {
        const errors = validateForm();

        if (errors.length > 0) {
            alert('Please complete the purchase before sharing:\n\n' + errors.join('\n'));
            return;
        }

        const shareData = {
            purchaseNumber: formData.purchaseNumber,
            invoiceType: formData.invoiceType,
            supplier: formData.supplier || { name: 'Cash Purchase', phone: formData.mobileNumber },
            totals,
            itemCount: formData.items.filter(item => item.itemName).length
        };

        console.log('📤 Sharing purchase:', shareData);
        alert(`Purchase ${formData.purchaseNumber} ready to share!\nTotal: ₹${totals.finalTotal}`);
    };

    // Auto-save draft functionality - ADAPTED FOR PURCHASE
    useEffect(() => {
        const draftKey = `purchase_draft_${formData.purchaseNumber}`;
        const draftData = {
            ...formData,
            totals,
            lastSaved: new Date().toISOString()
        };

        localStorage.setItem(draftKey, JSON.stringify(draftData));

        return () => {
            const keys = Object.keys(localStorage).filter(key => key.startsWith('purchase_draft_'));
            if (keys.length > 10) {
                keys.slice(0, -10).forEach(key => localStorage.removeItem(key));
            }
        };
    }, [formData, totals]);

    return (
        <div className="purchase-form-wrapper" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <Container fluid className="py-3 px-4">
                {/* Compact Header Section - SAME AS SALES FORM */}
                <div className="mb-3">
                    <GSTToggle
                        gstEnabled={formData.gstEnabled}
                        invoiceType={formData.invoiceType}
                        onChange={handleGSTToggleChange}
                    />
                </div>

                {/* Supplier and Purchase Details Row - REUSING SALES COMPONENTS */}
                <Row className="g-3 mb-3">
                    <Col lg={6}>
                        <Card className="h-100 border-0 shadow-sm">
                            <Card.Body className="p-3">
                                {/* Reuse CustomerSection for Suppliers */}
                                <CustomerSection
                                    customer={formData.supplier} // Map supplier to customer prop
                                    mobileNumber={formData.mobileNumber}
                                    onCustomerChange={(supplier) => updateFormData('supplier', supplier)} // Map to supplier
                                    onMobileChange={(mobile) => updateFormData('mobileNumber', mobile)}
                                    isSupplierMode={true} // Pass flag to customize labels
                                />
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={6}>
                        <Card className="h-100 border-0 shadow-sm">
                            <Card.Body className="p-3">
                                {/* Reuse InvoiceDetails for Purchase Details */}
                                <InvoiceDetails
                                    invoiceNumber={formData.purchaseNumber} // Map purchaseNumber to invoiceNumber prop
                                    invoiceDate={formData.purchaseDate} // Map purchaseDate to invoiceDate prop
                                    invoiceType={formData.invoiceType}
                                    onInvoiceNumberChange={(number) => updateFormData('purchaseNumber', number)} // Map to purchaseNumber
                                    onInvoiceDateChange={(date) => updateFormData('purchaseDate', date)} // Map to purchaseDate
                                    onInvoiceTypeChange={handleInvoiceTypeChange}
                                    isPurchaseMode={true} // Pass flag to customize labels
                                />
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Items Table - SAME COMPONENT AS SALES FORM */}
                <div className="mb-3">
                    <ItemsTable
                        items={formData.items}
                        gstEnabled={formData.gstEnabled}
                        invoiceType={formData.invoiceType}
                        onItemsChange={(items) => updateFormData('items', items)}
                        createEmptyItem={createEmptyItem}
                    />
                </div>

                {/* Bottom Action Bar - SAME COMPONENT AS SALES FORM WITH PURCHASE TYPE */}
                <div className="mb-3">
                    <TotalSection
                        totals={totals}
                        roundOff={formData.roundOff}
                        roundOffEnabled={formData.roundOffEnabled}
                        onRoundOffChange={(value) => updateFormData('roundOff', value)}
                        onRoundOffToggle={(enabled) => updateFormData('roundOffEnabled', enabled)}
                        onSave={handleSave}
                        onShare={handleShare}
                        onCancel={onCancel}
                        formType="purchase" // THIS IS THE KEY PROP
                    />
                </div>
            </Container>
        </div>
    );
}

export default PurchaseForm;