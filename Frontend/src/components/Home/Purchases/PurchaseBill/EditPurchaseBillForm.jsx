import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft, faPlus, faShoppingCart } from '@fortawesome/free-solid-svg-icons';
import PurchaseItemsTable from '../PurchaseItemsTable';
import ProductSelector from '../ProductSelector';

function EditPurchaseBillForm({
    purchaseBill,
    onSave,
    onCancel,
    isLoading = false
}) {
    const [formData, setFormData] = useState({
        billNumber: '',
        billDate: new Date().toISOString().split('T')[0],
        supplierName: '',
        supplierPhone: '',
        supplierEmail: '',
        supplierAddress: '',
        supplierGstNumber: '',
        items: [],
        paymentType: 'credit',
        paymentStatus: 'pending',
        dueDate: '',
        notes: '',
        discount: 0,
        discountType: 'percentage',
        taxMode: 'with-tax',
        cgstPercent: 9,
        sgstPercent: 9,
        igstPercent: 18,
        isInterstate: false,
        referenceNumber: ''
    });

    const [totals, setTotals] = useState({
        subtotal: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: 0,
        grandTotal: 0,
        discount: 0
    });

    const [errors, setErrors] = useState({});
    const [showProductSelector, setShowProductSelector] = useState(false);

    useEffect(() => {
        if (purchaseBill) {
            setFormData({
                billNumber: purchaseBill.billNumber || purchaseBill.purchaseNumber || '',
                billDate: purchaseBill.billDate ? new Date(purchaseBill.billDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                supplierName: purchaseBill.supplierName || '',
                supplierPhone: purchaseBill.supplierPhone || purchaseBill.supplierMobile || '',
                supplierEmail: purchaseBill.supplierEmail || '',
                supplierAddress: purchaseBill.supplierAddress || '',
                supplierGstNumber: purchaseBill.supplierGstNumber || '',
                items: purchaseBill.items || [],
                paymentType: purchaseBill.paymentType || 'credit',
                paymentStatus: purchaseBill.paymentStatus || 'pending',
                dueDate: purchaseBill.dueDate ? new Date(purchaseBill.dueDate).toISOString().split('T')[0] : '',
                notes: purchaseBill.notes || '',
                discount: purchaseBill.discount || 0,
                discountType: purchaseBill.discountType || 'percentage',
                taxMode: purchaseBill.taxMode || 'with-tax',
                cgstPercent: purchaseBill.cgstPercent || 9,
                sgstPercent: purchaseBill.sgstPercent || 9,
                igstPercent: purchaseBill.igstPercent || 18,
                isInterstate: purchaseBill.isInterstate || false,
                referenceNumber: purchaseBill.referenceNumber || ''
            });
        }
    }, [purchaseBill]);

    useEffect(() => {
        calculateTotals();
    }, [formData.items, formData.discount, formData.discountType, formData.isInterstate, formData.cgstPercent, formData.sgstPercent, formData.igstPercent]);

    const calculateTotals = () => {
        const subtotal = formData.items.reduce((sum, item) => {
            return sum + (item.quantity * item.purchasePrice);
        }, 0);

        let discountAmount = 0;
        if (formData.discountType === 'percentage') {
            discountAmount = (subtotal * formData.discount) / 100;
        } else {
            discountAmount = formData.discount;
        }

        const discountedSubtotal = subtotal - discountAmount;

        let cgst = 0, sgst = 0, igst = 0;

        if (formData.isInterstate) {
            igst = (discountedSubtotal * formData.igstPercent) / 100;
        } else {
            cgst = (discountedSubtotal * formData.cgstPercent) / 100;
            sgst = (discountedSubtotal * formData.sgstPercent) / 100;
        }

        const totalTax = cgst + sgst + igst;
        const grandTotal = discountedSubtotal + totalTax;

        setTotals({
            subtotal: Math.round(subtotal * 100) / 100,
            cgst: Math.round(cgst * 100) / 100,
            sgst: Math.round(sgst * 100) / 100,
            igst: Math.round(igst * 100) / 100,
            totalTax: Math.round(totalTax * 100) / 100,
            grandTotal: Math.round(grandTotal * 100) / 100,
            discount: Math.round(discountAmount * 100) / 100
        });
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: null
            }));
        }
    };

    const handleAddItem = (product) => {
        const newItem = {
            id: Date.now(),
            productName: product.name,
            productCode: product.code || '',
            hsnNumber: product.hsnNumber || '',
            quantity: 1,
            purchasePrice: product.purchasePrice || product.price || 0,
            unit: product.unit || 'pcs',
            description: product.description || ''
        };

        setFormData(prev => ({
            ...prev,
            items: [...prev.items, newItem]
        }));
        setShowProductSelector(false);
    };

    const handleUpdateItem = (itemId, field, value) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.id === itemId ? { ...item, [field]: value } : item
            )
        }));
    };

    const handleRemoveItem = (itemId) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== itemId)
        }));
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.supplierName.trim()) {
            newErrors.supplierName = 'Supplier name is required';
        }

        if (!formData.billNumber.trim()) {
            newErrors.billNumber = 'Bill number is required';
        }

        if (formData.items.length === 0) {
            newErrors.items = 'At least one item is required';
        }

        formData.items.forEach((item, index) => {
            if (!item.productName.trim()) {
                newErrors[`item_${index}_name`] = 'Product name is required';
            }
            if (item.quantity <= 0) {
                newErrors[`item_${index}_quantity`] = 'Quantity must be greater than 0';
            }
            if (item.purchasePrice <= 0) {
                newErrors[`item_${index}_price`] = 'Purchase price must be greater than 0';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const billData = {
            ...formData,
            totals,
            updatedAt: new Date().toISOString()
        };

        try {
            await onSave(billData);
        } catch (error) {
            console.error('Error saving purchase bill:', error);
        }
    };

    return (
        <Container fluid className="p-4">
            <Card className="shadow-sm">
                <Card.Header className="bg-success text-white">
                    <div className="d-flex justify-content-between align-items-center">
                        <h4 className="mb-0">
                            <FontAwesomeIcon icon={faShoppingCart} className="me-2" />
                            Edit Purchase Bill
                        </h4>
                        <Button variant="outline-light" onClick={onCancel}>
                            <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
                            Back to List
                        </Button>
                    </div>
                </Card.Header>

                <Card.Body>
                    <Form onSubmit={handleSubmit}>
                        <Row className="mb-4">
                            <Col md={6}>
                                <Card className="h-100">
                                    <Card.Header>
                                        <h6 className="mb-0">Bill Details</h6>
                                    </Card.Header>
                                    <Card.Body>
                                        <Row>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Bill Number *</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        value={formData.billNumber}
                                                        onChange={(e) => handleInputChange('billNumber', e.target.value)}
                                                        isInvalid={!!errors.billNumber}
                                                        placeholder="BILL-001"
                                                    />
                                                    <Form.Control.Feedback type="invalid">
                                                        {errors.billNumber}
                                                    </Form.Control.Feedback>
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Bill Date</Form.Label>
                                                    <Form.Control
                                                        type="date"
                                                        value={formData.billDate}
                                                        onChange={(e) => handleInputChange('billDate', e.target.value)}
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Reference Number</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={formData.referenceNumber}
                                                onChange={(e) => handleInputChange('referenceNumber', e.target.value)}
                                                placeholder="Supplier's invoice number"
                                            />
                                        </Form.Group>

                                        <Row>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Payment Type</Form.Label>
                                                    <Form.Select
                                                        value={formData.paymentType}
                                                        onChange={(e) => handleInputChange('paymentType', e.target.value)}
                                                    >
                                                        <option value="credit">Credit</option>
                                                        <option value="cash">Cash</option>
                                                        <option value="bank_transfer">Bank Transfer</option>
                                                        <option value="upi">UPI</option>
                                                        <option value="cheque">Cheque</option>
                                                    </Form.Select>
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Due Date</Form.Label>
                                                    <Form.Control
                                                        type="date"
                                                        value={formData.dueDate}
                                                        onChange={(e) => handleInputChange('dueDate', e.target.value)}
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>
                            </Col>

                            <Col md={6}>
                                <Card className="h-100">
                                    <Card.Header>
                                        <h6 className="mb-0">Supplier Information</h6>
                                    </Card.Header>
                                    <Card.Body>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Supplier Name *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={formData.supplierName}
                                                onChange={(e) => handleInputChange('supplierName', e.target.value)}
                                                isInvalid={!!errors.supplierName}
                                                placeholder="Enter supplier name"
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {errors.supplierName}
                                            </Form.Control.Feedback>
                                        </Form.Group>

                                        <Row>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Phone</Form.Label>
                                                    <Form.Control
                                                        type="tel"
                                                        value={formData.supplierPhone}
                                                        onChange={(e) => handleInputChange('supplierPhone', e.target.value)}
                                                        placeholder="Phone number"
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Email</Form.Label>
                                                    <Form.Control
                                                        type="email"
                                                        value={formData.supplierEmail}
                                                        onChange={(e) => handleInputChange('supplierEmail', e.target.value)}
                                                        placeholder="Email address"
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Address</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={2}
                                                value={formData.supplierAddress}
                                                onChange={(e) => handleInputChange('supplierAddress', e.target.value)}
                                                placeholder="Supplier address"
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>GST Number</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={formData.supplierGstNumber}
                                                onChange={(e) => handleInputChange('supplierGstNumber', e.target.value)}
                                                placeholder="GST Number (optional)"
                                            />
                                        </Form.Group>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        {/* Items Section */}
                        <Card className="mb-4">
                            <Card.Header className="d-flex justify-content-between align-items-center">
                                <h6 className="mb-0">Purchase Items</h6>
                                <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => setShowProductSelector(true)}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="me-1" />
                                    Add Item
                                </Button>
                            </Card.Header>
                            <Card.Body>
                                {errors.items && (
                                    <Alert variant="danger" className="mb-3">
                                        {errors.items}
                                    </Alert>
                                )}

                                <PurchaseItemsTable
                                    items={formData.items}
                                    onUpdateItem={handleUpdateItem}
                                    onRemoveItem={handleRemoveItem}
                                    errors={errors}
                                    showActions={true}
                                />
                            </Card.Body>
                        </Card>

                        {/* Tax & Totals Section */}
                        <Row className="mb-4">
                            <Col md={6}>
                                <Card>
                                    <Card.Header>
                                        <h6 className="mb-0">Tax Settings</h6>
                                    </Card.Header>
                                    <Card.Body>
                                        <Form.Group className="mb-3">
                                            <Form.Check
                                                type="checkbox"
                                                label="Interstate Purchase (IGST)"
                                                checked={formData.isInterstate}
                                                onChange={(e) => handleInputChange('isInterstate', e.target.checked)}
                                            />
                                        </Form.Group>

                                        {formData.isInterstate ? (
                                            <Form.Group className="mb-3">
                                                <Form.Label>IGST Rate (%)</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.igstPercent}
                                                    onChange={(e) => handleInputChange('igstPercent', parseFloat(e.target.value) || 0)}
                                                />
                                            </Form.Group>
                                        ) : (
                                            <Row>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>CGST Rate (%)</Form.Label>
                                                        <Form.Control
                                                            type="number"
                                                            step="0.01"
                                                            value={formData.cgstPercent}
                                                            onChange={(e) => handleInputChange('cgstPercent', parseFloat(e.target.value) || 0)}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>SGST Rate (%)</Form.Label>
                                                        <Form.Control
                                                            type="number"
                                                            step="0.01"
                                                            value={formData.sgstPercent}
                                                            onChange={(e) => handleInputChange('sgstPercent', parseFloat(e.target.value) || 0)}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                            </Row>
                                        )}

                                        <Row>
                                            <Col md={8}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Discount</Form.Label>
                                                    <Form.Control
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.discount}
                                                        onChange={(e) => handleInputChange('discount', parseFloat(e.target.value) || 0)}
                                                        placeholder="0"
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={4}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Type</Form.Label>
                                                    <Form.Select
                                                        value={formData.discountType}
                                                        onChange={(e) => handleInputChange('discountType', e.target.value)}
                                                    >
                                                        <option value="percentage">%</option>
                                                        <option value="amount">₹</option>
                                                    </Form.Select>
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>
                            </Col>

                            <Col md={6}>
                                <Card>
                                    <Card.Header>
                                        <h6 className="mb-0">Bill Summary</h6>
                                    </Card.Header>
                                    <Card.Body>
                                        <div className="d-flex justify-content-between mb-2">
                                            <span>Subtotal:</span>
                                            <span>₹{totals.subtotal.toFixed(2)}</span>
                                        </div>

                                        {totals.discount > 0 && (
                                            <div className="d-flex justify-content-between mb-2 text-success">
                                                <span>Discount:</span>
                                                <span>-₹{totals.discount.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {!formData.isInterstate ? (
                                            <>
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span>CGST ({formData.cgstPercent}%):</span>
                                                    <span>₹{totals.cgst.toFixed(2)}</span>
                                                </div>
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span>SGST ({formData.sgstPercent}%):</span>
                                                    <span>₹{totals.sgst.toFixed(2)}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="d-flex justify-content-between mb-2">
                                                <span>IGST ({formData.igstPercent}%):</span>
                                                <span>₹{totals.igst.toFixed(2)}</span>
                                            </div>
                                        )}

                                        <hr />
                                        <div className="d-flex justify-content-between fw-bold">
                                            <span>Grand Total:</span>
                                            <span>₹{totals.grandTotal.toFixed(2)}</span>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        {/* Notes Section */}
                        <Card className="mb-4">
                            <Card.Header>
                                <h6 className="mb-0">Additional Notes</h6>
                            </Card.Header>
                            <Card.Body>
                                <Form.Group>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={formData.notes}
                                        onChange={(e) => handleInputChange('notes', e.target.value)}
                                        placeholder="Any additional notes or terms..."
                                    />
                                </Form.Group>
                            </Card.Body>
                        </Card>

                        {/* Action Buttons */}
                        <div className="d-flex justify-content-end gap-2">
                            <Button variant="secondary" onClick={onCancel}>
                                Cancel
                            </Button>
                            <Button
                                variant="success"
                                type="submit"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Spinner size="sm" className="me-1" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faSave} className="me-1" />
                                        Save Purchase Bill
                                    </>
                                )}
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>

            {/* Product Selector Modal */}
            {showProductSelector && (
                <ProductSelector
                    show={showProductSelector}
                    onHide={() => setShowProductSelector(false)}
                    onSelectProduct={handleAddItem}
                />
            )}
        </Container>
    );
}

export default EditPurchaseBillForm;