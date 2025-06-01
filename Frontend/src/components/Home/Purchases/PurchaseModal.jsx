import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Row, Col, Card, ListGroup, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faFileInvoice, faUserPlus, faUser, faToggleOn, faToggleOff, faSearch, faCheckCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import PurchaseItemsTable from './PurchaseItemsTable';

function PurchaseModal({
    show,
    onHide,
    editingPurchase,
    formData,
    suppliers,
    onInputChange,
    onSupplierSelection,
    onItemChange,
    onAddItem,
    onRemoveItem,
    onSavePurchase,
    onShowAddSupplierModal,
    existingPurchases = [] // Add this prop to check for existing bills
}) {
    // Local state for supplier autocomplete
    const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuppliers, setFilteredSuppliers] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // New state for invoice number handling
    const [invoiceNumberStatus, setInvoiceNumberStatus] = useState({
        isChecking: false,
        isExisting: false,
        existingData: null,
        isDuplicate: false
    });

    // Add fake products data
    const [products] = useState([
        { id: 1, name: 'Laptop Computer', sku: 'LPT-001', price: 45000, gstRate: 18, unit: 'piece', category: 'Electronics' },
        { id: 2, name: 'Office Chair', sku: 'CHR-001', price: 8500, gstRate: 18, unit: 'piece', category: 'Furniture' },
        { id: 3, name: 'Printer Paper A4', sku: 'PPR-001', price: 350, gstRate: 12, unit: 'pack', category: 'Stationery' },
        { id: 4, name: 'USB Cable', sku: 'USB-001', price: 250, gstRate: 18, unit: 'piece', category: 'Electronics' },
        { id: 5, name: 'Desk Lamp', sku: 'LMP-001', price: 1200, gstRate: 18, unit: 'piece', category: 'Furniture' },
        { id: 6, name: 'Wireless Mouse', sku: 'MSE-001', price: 850, gstRate: 18, unit: 'piece', category: 'Electronics' },
        { id: 7, name: 'Notebook Set', sku: 'NTB-001', price: 120, gstRate: 12, unit: 'set', category: 'Stationery' },
        { id: 8, name: 'Monitor Stand', sku: 'STD-001', price: 2500, gstRate: 18, unit: 'piece', category: 'Furniture' },
        { id: 9, name: 'Keyboard Wireless', sku: 'KBD-001', price: 1500, gstRate: 18, unit: 'piece', category: 'Electronics' },
        { id: 10, name: 'File Cabinet', sku: 'CAB-001', price: 12000, gstRate: 18, unit: 'piece', category: 'Furniture' },
        { id: 11, name: 'Pen Drive 32GB', sku: 'PEN-001', price: 450, gstRate: 18, unit: 'piece', category: 'Electronics' },
        { id: 12, name: 'Whiteboard', sku: 'WBD-001', price: 3200, gstRate: 18, unit: 'piece', category: 'Office Supplies' },
        { id: 13, name: 'Conference Table', sku: 'TBL-001', price: 25000, gstRate: 18, unit: 'piece', category: 'Furniture' },
        { id: 14, name: 'Stapler Heavy Duty', sku: 'STP-001', price: 180, gstRate: 12, unit: 'piece', category: 'Stationery' },
        { id: 15, name: 'Security Camera', sku: 'CAM-001', price: 3500, gstRate: 18, unit: 'piece', category: 'Electronics' },
        { id: 16, name: 'Air Conditioner', sku: 'AC-001', price: 35000, gstRate: 28, unit: 'piece', category: 'Appliances' },
        { id: 17, name: 'Coffee Machine', sku: 'COF-001', price: 8500, gstRate: 18, unit: 'piece', category: 'Appliances' },
        { id: 18, name: 'Storage Box', sku: 'BOX-001', price: 450, gstRate: 18, unit: 'piece', category: 'Storage' },
        { id: 19, name: 'Projector', sku: 'PRJ-001', price: 22000, gstRate: 18, unit: 'piece', category: 'Electronics' },
        { id: 20, name: 'Water Dispenser', sku: 'WTR-001', price: 6500, gstRate: 18, unit: 'piece', category: 'Appliances' }
    ]);

    const inputRef = useRef(null);

    // Handle invoice number change and check for existing data
    const handleInvoiceNumberChange = async (e) => {
        const invoiceNumber = e.target.value;

        // Update form data
        onInputChange({
            target: {
                name: 'supplierInvoiceNumber',
                value: invoiceNumber
            }
        });

        // Reset status
        setInvoiceNumberStatus({
            isChecking: false,
            isExisting: false,
            existingData: null,
            isDuplicate: false
        });

        if (invoiceNumber.trim() === '') return;

        // Check if this invoice number already exists (duplicate check)
        const duplicateCheck = existingPurchases.find(purchase =>
            purchase.supplierInvoiceNumber === invoiceNumber.trim() &&
            purchase.id !== editingPurchase?.id
        );

        if (duplicateCheck) {
            setInvoiceNumberStatus({
                isChecking: false,
                isExisting: false,
                existingData: null,
                isDuplicate: true
            });
            return;
        }

        // Set checking status
        setInvoiceNumberStatus(prev => ({ ...prev, isChecking: true }));

        // Simulate API call delay
        setTimeout(() => {
            // Check if this invoice number was created from this website
            const existingPurchase = existingPurchases.find(purchase =>
                purchase.supplierInvoiceNumber === invoiceNumber.trim() &&
                purchase.isFromThisWebsite === true
            );

            if (existingPurchase) {
                setInvoiceNumberStatus({
                    isChecking: false,
                    isExisting: true,
                    existingData: existingPurchase,
                    isDuplicate: false
                });

                // Auto-fill the form with existing data
                autoFillFromExisting(existingPurchase);
            } else {
                setInvoiceNumberStatus({
                    isChecking: false,
                    isExisting: false,
                    existingData: null,
                    isDuplicate: false
                });
            }
        }, 500);
    };

    // Auto-fill form with existing purchase data
    const autoFillFromExisting = (existingData) => {
        // Fill supplier data
        if (existingData.supplier) {
            setSupplierSearchQuery(existingData.supplier.name);
            setSelectedSupplier(existingData.supplier);
            onSupplierSelection({
                target: {
                    value: existingData.supplier.id.toString(),
                    selectedSupplierData: existingData.supplier
                }
            });
        }

        // Fill purchase type
        onInputChange({
            target: {
                name: 'purchaseType',
                value: existingData.purchaseType || 'non-gst'
            }
        });

        // Fill purchase date
        onInputChange({
            target: {
                name: 'purchaseDate',
                value: existingData.purchaseDate || ''
            }
        });

        // Fill items (if any)
        if (existingData.items && existingData.items.length > 0) {
            existingData.items.forEach((item, index) => {
                onItemChange(index, 'productService', item.productService || '');
                onItemChange(index, 'quantity', item.quantity || 1);
                onItemChange(index, 'price', item.price || 0);
                onItemChange(index, 'unit', item.unit || 'piece');
                onItemChange(index, 'gstRate', item.gstRate || 0);
                onItemChange(index, 'taxInclusive', item.taxInclusive || false);
            });
        }

        // Fill notes
        if (existingData.notes) {
            onInputChange({
                target: {
                    name: 'notes',
                    value: existingData.notes
                }
            });
        }

        // Fill discount
        if (existingData.discount) {
            onInputChange({
                target: {
                    name: 'discount',
                    value: existingData.discount
                }
            });
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

    // Initialize modal state
    useEffect(() => {
        if (show && !isInitialized) {
            console.log('🎬 Initializing purchase modal for:', editingPurchase ? 'edit' : 'new');

            if (editingPurchase && formData.selectedSupplier) {
                const supplier = suppliers.find(s => s.id.toString() === formData.selectedSupplier);
                if (supplier) {
                    setSupplierSearchQuery(supplier.name);
                    setSelectedSupplier(supplier);
                }
            } else {
                setSupplierSearchQuery('');
                setSelectedSupplier(null);
                setShowSuggestions(false);
            }
            setIsInitialized(true);
        } else if (!show) {
            setIsInitialized(false);
            // Reset invoice status when modal closes
            setInvoiceNumberStatus({
                isChecking: false,
                isExisting: false,
                existingData: null,
                isDuplicate: false
            });
        }
    }, [show, editingPurchase, formData.selectedSupplier, suppliers, isInitialized]);

    // Filter suppliers based on search query
    useEffect(() => {
        if (!isInitialized) return;

        if (supplierSearchQuery.trim() && !selectedSupplier) {
            const filtered = suppliers
                .filter(supplier => {
                    const isSupplier = !supplier.partyType || supplier.partyType === 'supplier';
                    if (!isSupplier) return false;

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
            setShowSuggestions(filtered.length > 0 || supplierSearchQuery.trim().length > 0);
        } else {
            setFilteredSuppliers([]);
            setShowSuggestions(false);
        }
    }, [supplierSearchQuery, suppliers, selectedSupplier, isInitialized]);

    // Enhanced calculate summary values with proper GST handling
    const calculateSummaryValues = () => {
        let subtotal = 0;
        let totalGstAmount = 0;
        let itemsCount = 0;

        if (formData.items && formData.items.length > 0) {
            formData.items.forEach(item => {
                if (item.productService && item.productService.trim() !== '') {
                    itemsCount++;
                    const quantity = parseFloat(item.quantity) || 0;
                    const price = parseFloat(item.price) || 0;
                    const gstRate = parseFloat(item.gstRate) || 0;

                    let itemTotal = quantity * price;
                    subtotal += itemTotal;

                    // Calculate GST for GST purchases
                    if (formData.purchaseType === 'gst' && gstRate > 0) {
                        if (item.taxInclusive) {
                            // If tax inclusive, extract GST from the total
                            const gstAmount = (itemTotal * gstRate) / (100 + gstRate);
                            totalGstAmount += gstAmount;
                            // Adjust subtotal to exclude GST
                            subtotal -= gstAmount;
                        } else {
                            // If tax exclusive, add GST to the total
                            const gstAmount = (itemTotal * gstRate) / 100;
                            totalGstAmount += gstAmount;
                        }
                    }
                }
            });
        }

        const discountPercent = parseFloat(formData.discount) || 0;
        const discountAmount = (subtotal * discountPercent) / 100;
        const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);

        // Apply discount to GST proportionally
        let finalGstAmount = 0;
        if (formData.purchaseType === 'gst' && totalGstAmount > 0) {
            if (discountPercent > 0) {
                finalGstAmount = totalGstAmount * (1 - discountPercent / 100);
            } else {
                finalGstAmount = totalGstAmount;
            }
        }

        const finalTotal = subtotalAfterDiscount + finalGstAmount;

        return {
            subtotal: subtotal,
            gstAmount: finalGstAmount,
            discountPercent: discountPercent,
            discountAmount: discountAmount,
            subtotalAfterDiscount: subtotalAfterDiscount,
            finalTotal: finalTotal,
            itemsCount: itemsCount,
            averageGstRate: totalGstAmount > 0 ? (totalGstAmount / subtotal) * 100 : 0
        };
    };

    // Form validation
    const isFormValid = () => {
        if (!formData.purchaseDate || formData.purchaseDate.trim() === '') return false;
        if (!formData.purchaseType || formData.purchaseType === '') return false;
        if (!formData.supplierInvoiceNumber || formData.supplierInvoiceNumber.trim() === '') return false;
        if (invoiceNumberStatus.isDuplicate) return false;
        if (!selectedSupplier && (!supplierSearchQuery || supplierSearchQuery.trim() === '')) return false;
        if (!formData.items || formData.items.length === 0) return false;

        const validItems = formData.items.filter(item =>
            item.productService && item.productService.trim() !== ''
        );

        return validItems.length > 0;
    };

    // Handle supplier search input
    const handleSupplierSearchChange = (e) => {
        const value = e.target.value;
        setSupplierSearchQuery(value);

        if (selectedSupplier && value !== selectedSupplier.name) {
            setSelectedSupplier(null);
            onSupplierSelection({ target: { value: '' } });
        }
    };

    // Select supplier from suggestions
    const selectSupplier = (supplier) => {
        setSupplierSearchQuery(supplier.name);
        setSelectedSupplier(supplier);
        setShowSuggestions(false);

        onSupplierSelection({
            target: {
                value: supplier.id.toString(),
                selectedSupplierData: supplier
            }
        });
    };

    // Handle input focus
    const handleInputFocus = () => {
        if (supplierSearchQuery && !selectedSupplier) {
            setShowSuggestions(true);
        }
    };

    // Handle form submission
    const handleFormSubmit = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isFormValid()) {
            alert('Please fill in all required fields:\n- Purchase Date\n- Purchase Type\n- Supplier Invoice Number\n- Supplier Name\n- At least one item with product/service name');
            return;
        }

        if (!selectedSupplier && supplierSearchQuery.trim()) {
            onSupplierSelection({
                target: {
                    value: 'walk-in',
                    selectedSupplierData: {
                        name: supplierSearchQuery.trim(),
                        phone: '',
                        email: '',
                        address: ''
                    }
                }
            });
        }

        onSavePurchase(e);
    };

    // Handle clicking outside to close suggestions
    const handleClickOutside = (e) => {
        if (inputRef.current && !inputRef.current.contains(e.target)) {
            setShowSuggestions(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const summaryValues = calculateSummaryValues();

    return (
        <Modal show={show} onHide={onHide} size="xl" centered>
            <Modal.Header closeButton onHide={onHide} className="border-0 pb-0">
                <Modal.Title className="fw-bold">
                    {editingPurchase ? 'Edit Purchase Order' : 'Create Purchase Order'}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="px-4 pb-4">
                <Form onSubmit={handleFormSubmit} autoComplete="off">
                    {/* Purchase Type Toggle and Details */}
                    <Row className="mb-4">
                        {/* Left Side: Purchase Type Toggle and Supplier */}
                        <Col md={6}>
                            {/* Purchase Type Toggle */}
                            <div className="mb-4">
                                <Form.Label className="fw-semibold d-block mb-2">Purchase Type</Form.Label>
                                <div className="d-flex align-items-center gap-3">
                                    <Button
                                        variant={formData.purchaseType === 'non-gst' ? 'outline-secondary' : 'outline-primary'}
                                        className="d-flex align-items-center gap-2"
                                        onClick={handlePurchaseTypeToggle}
                                        type="button"
                                    >
                                        <FontAwesomeIcon
                                            icon={formData.purchaseType === 'gst' ? faToggleOn : faToggleOff}
                                            size="lg"
                                            className={formData.purchaseType === 'gst' ? 'text-success' : 'text-muted'}
                                        />
                                        {formData.purchaseType === 'gst' ? 'GST Purchase' : 'Non-GST Purchase'}
                                    </Button>
                                    {formData.purchaseType === 'gst' && (
                                        <small className="text-success fw-semibold">
                                            ✓ Tax calculations enabled
                                        </small>
                                    )}
                                </div>
                            </div>

                            {/* Supplier Selection */}
                            <div className="mb-3">
                                <h6 className="fw-bold text-primary mb-3">Supplier Details</h6>
                                <Form.Group className="position-relative" ref={inputRef}>
                                    <Form.Label className="fw-semibold">
                                        Supplier Name <span className="text-danger">*</span>
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={supplierSearchQuery}
                                        onChange={handleSupplierSearchChange}
                                        onFocus={handleInputFocus}
                                        placeholder="Type supplier name to search existing suppliers..."
                                        className="form-input w-75"
                                        autoComplete="off"
                                    />

                                    {/* Supplier Suggestions Dropdown */}
                                    {showSuggestions && (
                                        <div className="position-absolute w-100 mt-1" style={{ zIndex: 1070 }}>
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
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            selectSupplier(supplier);
                                                                        }}
                                                                        className="d-flex align-items-center py-2 cursor-pointer"
                                                                        style={{ cursor: 'pointer' }}
                                                                    >
                                                                        <FontAwesomeIcon
                                                                            icon={faUser}
                                                                            className="text-muted me-3"
                                                                        />
                                                                        <div className="flex-grow-1">
                                                                            <div className="fw-semibold">{supplier.name}</div>
                                                                            <div className="small text-muted">
                                                                                {supplier.phone || supplier.whatsappNumber || 'No phone'}
                                                                                {supplier.email && ` • ${supplier.email}`}
                                                                                {supplier.gstNumber && ` • GST: ${supplier.gstNumber}`}
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
                                                            <div className="p-3 text-center">
                                                                <div className="mb-2">
                                                                    <FontAwesomeIcon icon={faUser} size="2x" className="text-muted" />
                                                                </div>
                                                                <div className="mb-2">
                                                                    <strong>"{supplierSearchQuery}"</strong> - New Supplier
                                                                </div>
                                                                <small className="text-muted">
                                                                    This will be saved as a walk-in supplier
                                                                </small>
                                                                <div className="mt-3">
                                                                    <Button
                                                                        variant="outline-primary"
                                                                        size="sm"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setShowSuggestions(false);
                                                                            onShowAddSupplierModal();
                                                                        }}
                                                                        type="button"
                                                                    >
                                                                        <FontAwesomeIcon icon={faUserPlus} className="me-1" />
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
                                            <div className="d-flex align-items-center p-2 bg-success bg-opacity-10 border border-success border-opacity-25 rounded">
                                                <FontAwesomeIcon icon={faUser} className="text-success me-2" />
                                                <div className="flex-grow-1">
                                                    <div className="fw-semibold text-success">
                                                        ✓ {selectedSupplier.name}
                                                    </div>
                                                    <small className="text-muted">
                                                        {selectedSupplier.phone || selectedSupplier.whatsappNumber || 'No phone'}
                                                        {selectedSupplier.email && ` • ${selectedSupplier.email}`}
                                                    </small>
                                                </div>
                                                <Button
                                                    variant="outline-secondary"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setSelectedSupplier(null);
                                                        setSupplierSearchQuery('');
                                                        onSupplierSelection({ target: { value: '' } });
                                                    }}
                                                    type="button"
                                                >
                                                    <FontAwesomeIcon icon={faTimes} />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </Form.Group>
                            </div>
                        </Col>

                        {/* Right Side: Invoice Number and Date */}
                        <Col md={6}>
                            <div className="d-flex flex-column h-100 justify-content-start">
                                {/* Supplier Invoice Number */}
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold">
                                        Supplier Invoice Number <span className="text-danger">*</span>
                                    </Form.Label>
                                    <div className="position-relative">
                                        <Form.Control
                                            type="text"
                                            name="supplierInvoiceNumber"
                                            value={formData.supplierInvoiceNumber || ''}
                                            onChange={handleInvoiceNumberChange}
                                            placeholder="Enter supplier's invoice/bill number"
                                            className={`form-input ${invoiceNumberStatus.isDuplicate ? 'is-invalid' : invoiceNumberStatus.isExisting ? 'is-valid' : ''}`}
                                            required
                                        />
                                        {invoiceNumberStatus.isChecking && (
                                            <div className="position-absolute top-50 end-0 translate-middle-y me-3">
                                                <div className="spinner-border spinner-border-sm text-primary" role="status">
                                                    <span className="visually-hidden">Checking...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Status Messages */}
                                    {invoiceNumberStatus.isDuplicate && (
                                        <Alert variant="danger" className="mt-2 py-2">
                                            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                                            <strong>Duplicate Invoice!</strong> This invoice number already exists in the system.
                                        </Alert>
                                    )}

                                    {invoiceNumberStatus.isExisting && invoiceNumberStatus.existingData && (
                                        <Alert variant="success" className="mt-2 py-2">
                                            <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                                            <strong>Found existing data!</strong> Invoice created on {new Date(invoiceNumberStatus.existingData.createdAt).toLocaleDateString()}. Data auto-filled.
                                        </Alert>
                                    )}

                                    <Form.Text className="text-muted">
                                        Enter the supplier's original invoice/bill number
                                    </Form.Text>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold">
                                        Purchase Date <span className="text-danger">*</span>
                                    </Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="purchaseDate"
                                        value={formData.purchaseDate}
                                        onChange={onInputChange}
                                        className="form-input"
                                        required
                                    />
                                </Form.Group>
                            </div>
                        </Col>
                    </Row>

                    {/* Items Section */}
                    <div className="mb-4" style={{ position: 'relative', zIndex: 1 }}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="fw-bold mb-0">Purchase Items</h6>
                            <div className="text-muted small">
                                {summaryValues.itemsCount} item(s) • Total Qty: {formData.items?.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0) || 0}
                            </div>
                        </div>
                        <PurchaseItemsTable
                            items={formData.items}
                            onItemChange={onItemChange}
                            onAddItem={onAddItem}
                            onRemoveItem={onRemoveItem}
                            purchaseType={formData.purchaseType}
                        />
                    </div>

                    {/* Totals and Notes */}
                    <Row>
                        <Col md={8}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">Notes & Terms</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={4}
                                    name="notes"
                                    value={formData.notes || ''}
                                    onChange={onInputChange}
                                    placeholder="Any additional notes, special terms, or delivery instructions for this purchase order..."
                                    className="form-input"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Card className="bg-light border-0 shadow-sm">
                                <Card.Body>
                                    <h6 className="fw-bold mb-3 text-center text-primary">Purchase Summary</h6>

                                    {/* Items Count */}
                                    {summaryValues.itemsCount > 0 && (
                                        <div className="d-flex justify-content-between mb-2 text-muted small">
                                            <span>Items:</span>
                                            <span>{summaryValues.itemsCount} line item(s)</span>
                                        </div>
                                    )}

                                    {/* Subtotal */}
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>
                                            {formData.purchaseType === 'gst' ? 'Base Amount:' : 'Subtotal:'}
                                        </span>
                                        <span className="fw-semibold">₹{summaryValues.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>

                                    {/* Discount Section */}
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Discount:</span>
                                        <div className="d-flex align-items-center">
                                            <Form.Control
                                                type="number"
                                                name="discount"
                                                value={formData.discount || 0}
                                                onChange={onInputChange}
                                                style={{ width: '60px', fontSize: '0.8rem' }}
                                                className="form-input me-1 text-center"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                            />
                                            <span style={{ fontSize: '0.8rem' }}>%</span>
                                        </div>
                                    </div>

                                    {summaryValues.discountPercent > 0 && (
                                        <div className="d-flex justify-content-between mb-2 text-danger">
                                            <span>Discount Amount:</span>
                                            <span>-₹{summaryValues.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    )}

                                    {/* After Discount Subtotal */}
                                    {summaryValues.discountPercent > 0 && (
                                        <div className="d-flex justify-content-between mb-2">
                                            <span>After Discount:</span>
                                            <span>₹{summaryValues.subtotalAfterDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    )}

                                    {/* GST Section */}
                                    {formData.purchaseType === 'gst' && (
                                        <>
                                            {summaryValues.gstAmount > 0 && (
                                                <div className="d-flex justify-content-between mb-2 text-info">
                                                    <span>
                                                        GST Amount:
                                                        {summaryValues.averageGstRate > 0 && (
                                                            <small className="ms-1">({summaryValues.averageGstRate.toFixed(1)}% avg)</small>
                                                        )}
                                                    </span>
                                                    <span>₹{summaryValues.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <hr className="my-3" />

                                    {/* Final Total */}
                                    <div className="d-flex justify-content-between fw-bold mb-3">
                                        <span className="text-lg">Total Amount:</span>
                                        <span className="text-primary text-lg">₹{summaryValues.finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>

                                    {/* Invoice Number Display */}
                                    {formData.supplierInvoiceNumber && (
                                        <div className="mt-3 p-2 bg-info bg-opacity-10 border border-info border-opacity-25 rounded">
                                            <small className="text-muted">
                                                <strong>Supplier Invoice:</strong> {formData.supplierInvoiceNumber}
                                            </small>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Action Buttons */}
                    <div className="d-flex gap-3 justify-content-end mt-4">
                        <Button
                            variant="outline-secondary"
                            onClick={onHide}
                            className="px-4"
                            type="button"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            className="px-4"
                            disabled={!isFormValid()}
                        >
                            <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                            {editingPurchase ? 'Update Purchase' : 'Create Purchase Order'}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
}

export default PurchaseModal;