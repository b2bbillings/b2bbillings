import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Row, Col, Card, ListGroup, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes,
    faFileContract,
    faUserPlus,
    faUser,
    faToggleOn,
    faToggleOff,
    faPlus,
    faCalendar,
    faSearch,
    faShoppingBag
} from '@fortawesome/free-solid-svg-icons';
import PurchaseItemsTable from './PurchaseItemsTable';

function PurchaseOrderModal({
    show,
    onHide,
    editingPurchaseOrder,
    formData,
    suppliers,
    onInputChange,
    onSupplierSelection,
    onItemChange,
    onAddItem,
    onRemoveItem,
    onSavePurchaseOrder,
    onShowAddSupplierModal
}) {
    // Local state for supplier search
    const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuppliers, setFilteredSuppliers] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState(null);

    // Refs
    const supplierInputRef = useRef(null);

    // Calculate purchase order totals based on items
    const calculatePurchaseSummary = () => {
        if (!formData.items || formData.items.length === 0) {
            return {
                subtotal: 0,
                totalGST: 0,
                totalAfterDiscount: 0,
                finalTotal: 0
            };
        }

        let subtotal = 0;
        let totalGST = 0;

        formData.items.forEach(item => {
            const quantity = parseFloat(item.quantity || 0);
            const price = parseFloat(item.price || 0);
            const gstRate = parseFloat(item.gstRate || 0);
            const itemTotal = quantity * price;

            if (formData.purchaseType === 'gst' && gstRate > 0) {
                const isItemTaxInclusive = item.taxInclusive !== undefined ? item.taxInclusive : false;

                if (isItemTaxInclusive) {
                    // Tax inclusive: extract GST from total
                    const baseAmount = itemTotal / (1 + gstRate / 100);
                    const gstAmount = itemTotal - baseAmount;
                    subtotal += baseAmount;
                    totalGST += gstAmount;
                } else {
                    // Tax exclusive: add GST to base amount
                    const gstAmount = (itemTotal * gstRate) / 100;
                    subtotal += itemTotal;
                    totalGST += gstAmount;
                }
            } else {
                // Non-GST or no GST rate
                subtotal += itemTotal;
            }
        });

        // Apply discount
        const discountRate = parseFloat(formData.discount || 0);
        const discountAmount = (subtotal * discountRate) / 100;
        const totalAfterDiscount = subtotal - discountAmount;

        // Final total includes GST (for tax exclusive) or is same as discounted total (for tax inclusive)
        const finalTotal = totalAfterDiscount + totalGST;

        return {
            subtotal: subtotal.toFixed(2),
            totalGST: totalGST.toFixed(2),
            discountAmount: discountAmount.toFixed(2),
            totalAfterDiscount: totalAfterDiscount.toFixed(2),
            finalTotal: finalTotal.toFixed(2)
        };
    };

    // Get calculated summary
    const purchaseSummary = calculatePurchaseSummary();

    // Update formData totals when items or discount changes
    useEffect(() => {
        const summary = calculatePurchaseSummary();

        // Update parent component's formData with calculated totals
        if (parseFloat(formData.subtotal || 0) !== parseFloat(summary.subtotal) ||
            parseFloat(formData.total || 0) !== parseFloat(summary.finalTotal)) {

            // Use setTimeout to avoid direct state mutation during render
            setTimeout(() => {
                onInputChange({
                    target: { name: 'subtotal', value: summary.subtotal }
                });
                onInputChange({
                    target: { name: 'total', value: summary.finalTotal }
                });
                onInputChange({
                    target: { name: 'gstAmount', value: summary.totalGST }
                });
            }, 0);
        }
    }, [formData.items, formData.discount, formData.purchaseType]);

    // Initialize when modal opens
    useEffect(() => {
        if (show) {
            console.log('🎬 PurchaseOrderModal opened');

            if (editingPurchaseOrder && formData.selectedSupplier) {
                const supplier = suppliers.find(s => s.id.toString() === formData.selectedSupplier);
                if (supplier && (!selectedSupplier || selectedSupplier.id !== supplier.id)) {
                    console.log('📝 Setting supplier for editing:', supplier);
                    setSupplierSearchQuery(supplier.name);
                    setSelectedSupplier(supplier);
                }
            } else if (!editingPurchaseOrder) {
                console.log('📝 Resetting for new purchase order');
                setSupplierSearchQuery('');
                setSelectedSupplier(null);
                setShowSuggestions(false);
            }
        }
    }, [show, editingPurchaseOrder]);

    // Filter suppliers when search query changes
    useEffect(() => {
        if (supplierSearchQuery.trim() && !selectedSupplier) {
            const filtered = suppliers
                .filter(supplier => {
                    const searchTerm = supplierSearchQuery.toLowerCase();
                    return (
                        supplier.name.toLowerCase().includes(searchTerm) ||
                        (supplier.phone && supplier.phone.toLowerCase().includes(searchTerm)) ||
                        (supplier.whatsappNumber && supplier.whatsappNumber.toLowerCase().includes(searchTerm)) ||
                        (supplier.email && supplier.email.toLowerCase().includes(searchTerm)) ||
                        (supplier.gstNumber && supplier.gstNumber.toLowerCase().includes(searchTerm))
                    );
                })
                .slice(0, 5);

            setFilteredSuppliers(filtered);
            setShowSuggestions(true);
        } else {
            setFilteredSuppliers([]);
            setShowSuggestions(false);
        }
    }, [supplierSearchQuery, suppliers, selectedSupplier]);

    // Handle supplier search input change
    const handleSupplierSearchChange = (e) => {
        const value = e.target.value;
        console.log('📝 Supplier search changed:', value);

        setSupplierSearchQuery(value);

        if (selectedSupplier && value.trim() !== selectedSupplier.name.trim()) {
            console.log('📝 Clearing selected supplier as name changed');
            setSelectedSupplier(null);

            onSupplierSelection({
                target: {
                    name: 'selectedSupplier',
                    value: ''
                }
            });
        }

        if (value.trim() && !selectedSupplier) {
            setShowSuggestions(true);
        } else if (!value.trim()) {
            setShowSuggestions(false);
        }
    };

    // Select supplier from suggestions
    const handleSupplierSelect = (supplier, e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        console.log('🎯 Supplier selected:', supplier);

        setSupplierSearchQuery(supplier.name);
        setSelectedSupplier(supplier);
        setShowSuggestions(false);

        setTimeout(() => {
            onSupplierSelection({
                target: {
                    name: 'selectedSupplier',
                    value: supplier.id.toString(),
                    selectedSupplierData: supplier
                }
            });
        }, 0);
    };

    // Handle input focus
    const handleInputFocus = () => {
        if (supplierSearchQuery.trim() && !selectedSupplier) {
            console.log('📝 Input focused, showing suggestions');
            setShowSuggestions(true);
        }
    };

    // Handle purchase type toggle
    const handlePurchaseTypeToggle = () => {
        const newType = formData.purchaseType === 'gst' ? 'non-gst' : 'gst';
        onInputChange({
            target: {
                name: 'purchaseType',
                value: newType
            }
        });
    };

    const handleAddPermanentSupplier = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        console.log('🎯 Add as Permanent Supplier clicked');
        console.log('📝 Supplier search query:', supplierSearchQuery.trim());
        setShowSuggestions(false);

        if (typeof onShowAddSupplierModal === 'function') {
            onShowAddSupplierModal(supplierSearchQuery.trim(), 'supplier');
        } else {
            console.error('❌ onShowAddSupplierModal is not a function');
            alert('Add supplier function not available');
        }
    };

    // Handle discount change
    const handleDiscountChange = (e) => {
        const discountValue = parseFloat(e.target.value) || 0;

        // Ensure discount is within valid range
        if (discountValue >= 0 && discountValue <= 100) {
            onInputChange({
                target: {
                    name: 'discount',
                    value: discountValue
                }
            });
        }
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('📝 Form submitted');

        // Basic validation
        if (!formData.orderDate) {
            alert('Please select order date');
            return;
        }

        if (!formData.expectedDeliveryDate) {
            alert('Please select expected delivery date');
            return;
        }

        if (!selectedSupplier && !supplierSearchQuery.trim()) {
            alert('Please select or enter a supplier name');
            return;
        }

        if (!formData.items || formData.items.length === 0) {
            alert('Please add at least one item');
            return;
        }

        // Validate items have required data
        const invalidItems = formData.items.filter(item =>
            !item.productService || !item.quantity || !item.price
        );

        if (invalidItems.length > 0) {
            alert('Please fill in all item details (product, quantity, and price)');
            return;
        }

        onSavePurchaseOrder(e);
    };

    // Click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (supplierInputRef.current && !supplierInputRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <Modal show={show} onHide={onHide} size="xl" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <FontAwesomeIcon icon={faShoppingBag} className="me-2" />
                    {editingPurchaseOrder ? 'Edit Purchase Order' : 'Create New Purchase Order'}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <Form onSubmit={handleSubmit}>
                    <Row className="mb-4">
                        {/* Left Column - Supplier Details */}
                        <Col md={6}>
                            {/* Purchase Type Toggle */}
                            <div className="mb-3">
                                <Form.Label className="fw-semibold">Purchase Type</Form.Label>
                                <div>
                                    <Button
                                        variant="outline-primary"
                                        onClick={handlePurchaseTypeToggle}
                                        className="d-flex align-items-center gap-2"
                                        type="button"
                                    >
                                        <FontAwesomeIcon
                                            icon={formData.purchaseType === 'gst' ? faToggleOn : faToggleOff}
                                            className={formData.purchaseType === 'gst' ? 'text-success' : 'text-muted'}
                                        />
                                        {formData.purchaseType === 'gst' ? 'GST Purchase' : 'Non-GST Purchase'}
                                    </Button>
                                </div>
                            </div>

                            {/* Supplier Name */}
                            <div className="mb-3 position-relative" ref={supplierInputRef}>
                                <Form.Label className="fw-semibold">
                                    Supplier Name <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    value={supplierSearchQuery}
                                    onChange={handleSupplierSearchChange}
                                    onFocus={handleInputFocus}
                                    placeholder="Type supplier name to search..."
                                    autoComplete="off"
                                />

                                {/* Supplier Suggestions Dropdown */}
                                {showSuggestions && (
                                    <div
                                        className="position-absolute w-100 mt-1"
                                        style={{ zIndex: 1070 }}
                                    >
                                        <Card className="border shadow-lg">
                                            <Card.Body className="p-0">
                                                {filteredSuppliers.length > 0 ? (
                                                    <>
                                                        <div className="px-3 py-2 bg-light border-bottom">
                                                            <small className="text-muted fw-semibold">Existing Suppliers</small>
                                                        </div>
                                                        <ListGroup variant="flush">
                                                            {filteredSuppliers.map((supplier) => (
                                                                <ListGroup.Item
                                                                    key={supplier.id}
                                                                    action
                                                                    onClick={(e) => handleSupplierSelect(supplier, e)}
                                                                    className="cursor-pointer"
                                                                    style={{ cursor: 'pointer' }}
                                                                >
                                                                    <div className="d-flex align-items-center">
                                                                        <FontAwesomeIcon
                                                                            icon={faUser}
                                                                            className="text-muted me-3"
                                                                        />
                                                                        <div>
                                                                            <div className="fw-semibold">{supplier.name}</div>
                                                                            <small className="text-muted">
                                                                                {supplier.phone || supplier.whatsappNumber || 'No phone'}
                                                                                {supplier.email && ` • ${supplier.email}`}
                                                                                {supplier.gstNumber && ` • GST: ${supplier.gstNumber}`}
                                                                            </small>
                                                                        </div>
                                                                    </div>
                                                                </ListGroup.Item>
                                                            ))}
                                                        </ListGroup>
                                                    </>
                                                ) : supplierSearchQuery.trim() && (
                                                    <>
                                                        <div className="px-3 py-2 bg-light border-bottom">
                                                            <small className="text-muted">No existing supplier found</small>
                                                        </div>
                                                        <div className="p-4 text-center">
                                                            <FontAwesomeIcon icon={faUser} size="3x" className="text-muted mb-3" />
                                                            <div className="mb-2">
                                                                <strong>"{supplierSearchQuery}"</strong> - New Supplier
                                                            </div>
                                                            <small className="text-muted d-block mb-4">
                                                                This supplier doesn't exist in your database
                                                            </small>

                                                            <div className="d-grid">
                                                                <Button
                                                                    variant="primary"
                                                                    onClick={handleAddPermanentSupplier}
                                                                    type="button"
                                                                >
                                                                    <FontAwesomeIcon icon={faUserPlus} className="me-2" />
                                                                    Add as Permanent Supplier
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </Card.Body>
                                        </Card>
                                    </div>
                                )}

                                {/* Selected Supplier Display */}
                                {selectedSupplier && (
                                    <div className="mt-2">
                                        <Badge bg="success" className="p-2">
                                            <FontAwesomeIcon icon={faUser} className="me-2" />
                                            ✓ {selectedSupplier.name} selected
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </Col>

                        {/* Right Column - Order Details */}
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Purchase Order Number</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="orderNumber"
                                    value={formData.orderNumber}
                                    onChange={onInputChange}
                                    placeholder="Auto-generated"
                                    readOnly
                                    className="bg-light"
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>
                                    <FontAwesomeIcon icon={faCalendar} className="me-1" />
                                    Order Date <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Control
                                    type="date"
                                    name="orderDate"
                                    value={formData.orderDate}
                                    onChange={onInputChange}
                                    required
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>
                                    <FontAwesomeIcon icon={faCalendar} className="me-1" />
                                    Expected Delivery Date <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Control
                                    type="date"
                                    name="expectedDeliveryDate"
                                    value={formData.expectedDeliveryDate}
                                    onChange={onInputChange}
                                    required
                                    min={formData.orderDate} // Can't be before order date
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Items Section */}
                    <div className="mb-4">
                        <h6 className="fw-bold mb-3">Items</h6>
                        <PurchaseItemsTable
                            items={formData.items}
                            onItemChange={onItemChange}
                            onAddItem={onAddItem}
                            onRemoveItem={onRemoveItem}
                            purchaseType={formData.purchaseType}
                        />
                    </div>

                    {/* Notes and Summary */}
                    <Row>
                        <Col md={8}>
                            <Form.Group className="mb-3">
                                <Form.Label>Notes</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    name="notes"
                                    value={formData.notes || ''}
                                    onChange={onInputChange}
                                    placeholder="Any additional notes for the supplier..."
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            {/* Enhanced Summary Card */}
                            <Card className="bg-light border">
                                <Card.Body>
                                    <h6 className="fw-bold mb-3 text-primary">
                                        <FontAwesomeIcon icon={faShoppingBag} className="me-2" />
                                        Purchase Summary
                                    </h6>

                                    {/* Subtotal */}
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Subtotal:</span>
                                        <span className="fw-semibold">₹{purchaseSummary.subtotal}</span>
                                    </div>

                                    {/* GST Amount - Only show for GST purchases */}
                                    {formData.purchaseType === 'gst' && parseFloat(purchaseSummary.totalGST) > 0 && (
                                        <div className="d-flex justify-content-between mb-2">
                                            <span className="text-success">
                                                <small>GST Amount:</small>
                                            </span>
                                            <span className="fw-semibold text-success">₹{purchaseSummary.totalGST}</span>
                                        </div>
                                    )}

                                    {/* Discount */}
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span>Discount:</span>
                                        <div className="d-flex align-items-center gap-1">
                                            <Form.Control
                                                type="number"
                                                name="discount"
                                                value={formData.discount || 0}
                                                onChange={handleDiscountChange}
                                                style={{ width: '60px' }}
                                                className="text-center"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                size="sm"
                                            />
                                            <span className="text-muted">%</span>
                                            {parseFloat(purchaseSummary.discountAmount) > 0 && (
                                                <small className="text-danger ms-1">
                                                    (-₹{purchaseSummary.discountAmount})
                                                </small>
                                            )}
                                        </div>
                                    </div>

                                    <hr className="my-2" />

                                    {/* Final Total */}
                                    <div className="d-flex justify-content-between fw-bold fs-5">
                                        <span>Total Amount:</span>
                                        <span className="text-primary">₹{purchaseSummary.finalTotal}</span>
                                    </div>

                                    {/* Summary Statistics */}
                                    <hr className="my-2" />
                                    <div className="text-center">
                                        <small className="text-muted">
                                            {formData.items?.length || 0} item{(formData.items?.length || 0) !== 1 ? 's' : ''}
                                            {formData.purchaseType === 'gst' && (
                                                <span className="d-block">
                                                    {formData.purchaseType.toUpperCase()} Purchase
                                                </span>
                                            )}
                                        </small>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Action Buttons */}
                    <div className="d-flex gap-3 justify-content-end mt-4">
                        <Button variant="outline-secondary" onClick={onHide} type="button">
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                            <FontAwesomeIcon icon={faShoppingBag} className="me-2" />
                            {editingPurchaseOrder ? 'Update Purchase Order' : 'Create Purchase Order'}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
}

export default PurchaseOrderModal;