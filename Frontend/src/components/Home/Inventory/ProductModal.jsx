import React, { useRef, useEffect, useState } from 'react';
import { Modal, Form, Button, Row, Col, InputGroup, Toast, ToastContainer } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes, faSearch, faDatabase, faPlus, faCheck, faToggleOn, faToggleOff } from '@fortawesome/free-solid-svg-icons';
import ProductSearchModal from './ProductSearchModal';
import './ProductModal.css';

function ProductModal({
    show,
    onHide,
    editingProduct,
    formData,
    categories,
    onInputChange,
    onSaveProduct
}) {
    // Refs for keyboard navigation
    const productServiceToggleRef = useRef(null);
    const searchDatabaseRef = useRef(null);
    const nameRef = useRef(null);
    const hsnNumberRef = useRef(null);
    const itemCodeRef = useRef(null);
    const assignCodeRef = useRef(null);
    const unitRef = useRef(null);
    const categoryRef = useRef(null);
    const gstRateRef = useRef(null);
    const descriptionRef = useRef(null);
    const openingStockRef = useRef(null);
    const asOfDateRef = useRef(null);
    const minStockLevelRef = useRef(null);
    const buyPriceRef = useRef(null);
    const buyTaxToggleRef = useRef(null);
    const salePriceRef = useRef(null);
    const saleTaxToggleRef = useRef(null);
    const isActiveRef = useRef(null);
    const cancelButtonRef = useRef(null);
    const saveAndAddButtonRef = useRef(null);
    const saveButtonRef = useRef(null);

    // Local state for product search and toast
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [isSaveAndAdd, setIsSaveAndAdd] = useState(false);
    const [buyPriceTaxInclusive, setBuyPriceTaxInclusive] = useState(false);
    const [salePriceTaxInclusive, setSalePriceTaxInclusive] = useState(false);

    // Sample database products - replace with actual API call
    const [searchProducts] = useState([
        { id: 1, name: 'HP Laptop i5 8GB', sku: 'HP-LAP-001', buyPrice: 45000, salePrice: 50000, gstRate: 18, unit: 'PCS', category: 'Electronics', hsnNumber: '8471', description: 'HP Pavilion Laptop with i5 processor' },
        { id: 2, name: 'Office Chair Executive', sku: 'OFC-CHR-001', buyPrice: 8500, salePrice: 12000, gstRate: 12, unit: 'PCS', category: 'Furniture', hsnNumber: '9401', description: 'Executive office chair with lumbar support' },
        { id: 3, name: 'A4 Paper 500 Sheets', sku: 'PPR-A4-001', buyPrice: 350, salePrice: 400, gstRate: 12, unit: 'PAC', category: 'Stationery', hsnNumber: '4802', description: 'Premium quality A4 printing paper' },
        { id: 4, name: 'Wireless Mouse Optical', sku: 'MSE-WL-001', buyPrice: 850, salePrice: 1200, gstRate: 18, unit: 'PCS', category: 'Electronics', hsnNumber: '8471', description: 'Optical wireless mouse with USB receiver' },
        { id: 5, name: 'Business Consultation', sku: 'SVC-CONS-001', buyPrice: 2500, salePrice: 3500, gstRate: 18, unit: 'HRS', category: 'Services', type: 'service', description: 'Professional business consultation service' },
        { id: 6, name: 'LED Monitor 24 inch', sku: 'MON-LED-001', buyPrice: 12000, salePrice: 15000, gstRate: 18, unit: 'PCS', category: 'Electronics', hsnNumber: '8528', description: '24 inch LED monitor with HDMI' },
        { id: 7, name: 'Steel Almirah 4 Door', sku: 'ALM-STL-001', buyPrice: 15000, salePrice: 18000, gstRate: 18, unit: 'PCS', category: 'Furniture', hsnNumber: '9403', description: '4 door steel almirah for office use' },
        { id: 8, name: 'Printer Inkjet Color', sku: 'PRT-INK-001', buyPrice: 8500, salePrice: 12000, gstRate: 18, unit: 'PCS', category: 'Electronics', hsnNumber: '8443', description: 'Color inkjet printer with scanner' }
    ]);

    const unitOptions = [
        'BAG', 'BTL', 'BOX', 'BUN', 'CAN', 'CTN', 'DOZ', 'DRM', 'FEW', 'GMS', 'GRS', 'KGS', 'KME', 'LTR', 'MLS', 'MTR', 'NOS', 'PAC', 'PCS', 'QTL', 'ROL', 'SET', 'SQF', 'SQM', 'TBS', 'TGM', 'THD', 'TON', 'TUB', 'UGS', 'UNT', 'YDS', 'OTH'
    ];

    const gstRateOptions = [0, 0.25, 3, 5, 12, 18, 28];

    // Auto-focus first field when modal opens
    useEffect(() => {
        if (show && productServiceToggleRef.current) {
            setTimeout(() => {
                productServiceToggleRef.current.focus();
            }, 100);
        }
    }, [show]);

    // Reset save and add flag when modal closes
    useEffect(() => {
        if (!show) {
            setIsSaveAndAdd(false);
        }
    }, [show]);

    // Generate item code automatically
    const generateItemCode = (name, category) => {
        if (!name || !category) return '';

        const namePrefix = name.substring(0, 3).toUpperCase();
        const categoryPrefix = category.substring(0, 3).toUpperCase();
        const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

        return `${namePrefix}-${categoryPrefix}-${randomNum}`;
    };

    // Calculate price with/without tax
    const calculatePriceWithTax = (price, gstRate, isInclusive) => {
        if (!price || !gstRate) return price;

        if (isInclusive) {
            // Tax inclusive - return price without tax
            return (price / (1 + gstRate / 100)).toFixed(2);
        } else {
            // Tax exclusive - return price with tax
            return (price * (1 + gstRate / 100)).toFixed(2);
        }
    };

    // Get ordered navigation refs based on current form state
    const getNavigationRefs = () => {
        const baseRefs = [
            productServiceToggleRef,
            searchDatabaseRef,
            nameRef,
            hsnNumberRef,
            itemCodeRef,
            assignCodeRef,
            unitRef,
            categoryRef,
            gstRateRef,
            descriptionRef
        ];

        const stockRefs = formData.type !== 'service' ? [
            openingStockRef,
            asOfDateRef,
            minStockLevelRef
        ] : [];

        // For services, only show sale price (service rate). For products, show both buy and sale price
        const pricingRefs = formData.type === 'service' ? [
            salePriceRef,
            saleTaxToggleRef
        ] : [
            buyPriceRef,
            buyTaxToggleRef,
            salePriceRef,
            saleTaxToggleRef
        ];

        const endRefs = [
            isActiveRef,
            cancelButtonRef,
            ...(editingProduct ? [] : [saveAndAddButtonRef]),
            saveButtonRef
        ];

        return [...baseRefs, ...stockRefs, ...pricingRefs, ...endRefs];
    };

    // Handle keyboard navigation globally
    const handleKeyDown = (e) => {
        // Handle Escape key
        if (e.key === 'Escape') {
            e.preventDefault();
            onHide();
            return;
        }

        // Handle Ctrl+S for save
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            handleSubmit(e);
            return;
        }

        // Handle Ctrl+Shift+S for save and add another
        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            if (!editingProduct) {
                handleSaveAndAddAnother(e);
            }
            return;
        }

        // Handle Ctrl+G for generate code
        if (e.ctrlKey && e.key === 'g') {
            e.preventDefault();
            handleGenerateCode();
            return;
        }

        // Handle Ctrl+D for database search
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            setShowProductSearch(true);
            return;
        }

        // Handle Tab navigation
        if (e.key === 'Tab') {
            e.preventDefault();
            const refs = getNavigationRefs();
            const currentElement = document.activeElement;
            const currentIndex = refs.findIndex(ref => ref.current === currentElement);

            if (e.shiftKey) {
                // Shift+Tab - go to previous
                const prevIndex = currentIndex <= 0 ? refs.length - 1 : currentIndex - 1;
                const prevRef = refs[prevIndex];
                if (prevRef && prevRef.current) {
                    prevRef.current.focus();
                }
            } else {
                // Tab - go to next
                const nextIndex = currentIndex >= refs.length - 1 ? 0 : currentIndex + 1;
                const nextRef = refs[nextIndex];
                if (nextRef && nextRef.current) {
                    nextRef.current.focus();
                }
            }
            return;
        }

        // Handle Enter key navigation (except for textarea and buttons)
        if (e.key === 'Enter' && !['TEXTAREA', 'BUTTON'].includes(e.target.tagName)) {
            e.preventDefault();
            const refs = getNavigationRefs();
            const currentElement = document.activeElement;
            const currentIndex = refs.findIndex(ref => ref.current === currentElement);

            if (currentIndex !== -1 && currentIndex < refs.length - 1) {
                const nextRef = refs[currentIndex + 1];
                if (nextRef && nextRef.current) {
                    nextRef.current.focus();
                }
            }
        }
    };

    // Handle toggle keyboard interactions
    const handleToggleKeyDown = (e, action) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            action();
        }
    };

    // Generate item code
    const handleGenerateCode = () => {
        if (formData.name && formData.category) {
            const generatedCode = generateItemCode(formData.name, formData.category);
            onInputChange({
                target: { name: 'itemCode', value: generatedCode }
            });
            setToastMessage('Item code generated automatically!');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
        } else {
            setToastMessage('Please enter item name and select category first');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
    };

    // Show success toast
    const showSuccessToast = (productName) => {
        setToastMessage(`${productName} saved successfully!`);
        setShowToast(true);

        // Auto-hide toast after 4 seconds
        setTimeout(() => {
            setShowToast(false);
        }, 4000);
    };

    // Validate form data
    const validateForm = () => {
        if (!formData.name?.trim()) {
            nameRef.current?.focus();
            setToastMessage('Please enter item name');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
            return false;
        }

        if (!formData.unit) {
            unitRef.current?.focus();
            setToastMessage('Please select unit');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
            return false;
        }

        if (!formData.category) {
            categoryRef.current?.focus();
            setToastMessage('Please select category');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
            return false;
        }

        return true;
    };

    // Clear form fields but keep common ones
    const clearFormForNext = () => {
        // Reset specific fields to empty
        const fieldsToReset = ['name', 'itemCode', 'hsnNumber', 'description', 'openingStock', 'minStockLevel', 'buyPrice', 'salePrice'];

        fieldsToReset.forEach(field => {
            onInputChange({
                target: { name: field, value: '' }
            });
        });

        // Keep isActive as true and reset date
        onInputChange({
            target: { name: 'isActive', value: true, type: 'checkbox', checked: true }
        });

        onInputChange({
            target: { name: 'asOfDate', value: new Date().toISOString().split('T')[0] }
        });
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!validateForm()) {
            return;
        }

        // Call parent save function with normal save
        onSaveProduct(e, false);
    };

    // Handle save and add another
    const handleSaveAndAddAnother = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!validateForm()) {
            return;
        }

        try {
            // Store the current product name for toast
            const currentProductName = formData.name;

            // Set flag to prevent modal from closing
            setIsSaveAndAdd(true);

            // Create a custom event that prevents modal closure
            const customEvent = {
                ...e,
                preventDefault: () => { },
                stopPropagation: () => { },
                saveAndAdd: true  // Flag for parent component
            };

            // Call parent save function with save and add flag
            const result = await onSaveProduct(customEvent, true);

            // Check if save was successful
            if (result !== false) {
                // Show success toast
                showSuccessToast(currentProductName);

                // Clear form for new product while keeping common fields
                clearFormForNext();

                // Focus on name field for next product
                setTimeout(() => {
                    nameRef.current?.focus();
                }, 200);
            }

        } catch (error) {
            console.error('Error saving product:', error);
            setToastMessage('Error saving product. Please try again.');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } finally {
            setIsSaveAndAdd(false);
        }
    };

    // Custom onHide that checks for save and add
    const handleModalHide = () => {
        if (isSaveAndAdd) {
            return; // Don't close modal if we're in save and add mode
        }
        onHide();
    };

    // Handle product selection from search modal
    const handleProductSelection = (product) => {
        // Auto-fill form with selected product data
        const productData = {
            name: product.name,
            itemCode: product.sku,
            hsnNumber: product.hsnNumber,
            unit: product.unit,
            category: product.category,
            description: product.description,
            gstRate: product.gstRate,
            type: product.type || (product.type === 'service' ? 'service' : 'product'),
            buyPrice: product.buyPrice,
            salePrice: product.salePrice,
            isActive: true
        };

        // Update form data using individual onInputChange calls
        Object.entries(productData).forEach(([name, value]) => {
            if (value !== undefined) {
                onInputChange({
                    target: { name, value }
                });
            }
        });

        setShowProductSearch(false);

        // Focus on the next relevant field after auto-fill
        setTimeout(() => {
            if (formData.type !== 'service') {
                openingStockRef.current?.focus();
            } else {
                isActiveRef.current?.focus();
            }
        }, 100);
    };

    return (
        <>
            <Modal
                show={show}
                onHide={handleModalHide}
                size="xl"
                centered
                onKeyDown={handleKeyDown}
                backdrop="static"
                className={`product-modal ${showProductSearch ? 'modal-blurred' : ''}`}
            >
                <div className={`modal-content-wrapper ${showProductSearch ? 'content-blurred' : ''}`}>
                    <Modal.Header className="border-0 pb-0">
                        <Modal.Title className="fw-bold">
                            {editingProduct ? 'Edit Item' : 'Add New Item'}
                            <small className="text-muted ms-2 fw-normal">
                                (Tab/Enter: navigate, Esc: close, Ctrl+S: save, Ctrl+Shift+S: save & add, Ctrl+G: generate code, Ctrl+D: search database)
                            </small>
                        </Modal.Title>
                        <Button
                            variant="link"
                            className="p-0 border-0 text-muted"
                            onClick={handleModalHide}
                        >
                            <FontAwesomeIcon icon={faTimes} size="lg" />
                        </Button>
                    </Modal.Header>

                    <Modal.Body className="px-4 pb-4">
                        {/* Success Toast */}
                        <ToastContainer
                            position="top-end"
                            className="p-3"
                            style={{
                                position: 'fixed',
                                top: '20px',
                                right: '20px',
                                zIndex: 9999
                            }}
                        >
                            <Toast
                                show={showToast}
                                onClose={() => setShowToast(false)}
                                className="success-toast"
                                autohide
                                delay={4000}
                            >
                                <Toast.Header className="bg-success text-white border-0">
                                    <FontAwesomeIcon icon={faCheck} className="me-2" />
                                    <strong className="me-auto">Success</strong>
                                </Toast.Header>
                                <Toast.Body className="bg-light border-0">
                                    <div className="d-flex align-items-center">
                                        <FontAwesomeIcon icon={faCheck} className="text-success me-2" />
                                        <span>{toastMessage}</span>
                                    </div>
                                    {isSaveAndAdd && (
                                        <small className="text-muted mt-1 d-block">
                                            Ready to add another product...
                                        </small>
                                    )}
                                </Toast.Body>
                            </Toast>
                        </ToastContainer>

                        {/* Header Section with Type Toggle and Database Search */}
                        <Row className="mb-4">
                            <Col md={6}>
                                {/* Product/Service Toggle */}
                                <div className="product-service-toggle p-3 bg-light rounded border">
                                    <div className="d-flex align-items-center justify-content-center">
                                        <span className={`toggle-label ${formData.type === 'product' ? 'active' : ''}`}>
                                            Product
                                        </span>
                                        <div
                                            ref={productServiceToggleRef}
                                            className="custom-toggle mx-3"
                                            onClick={() => {
                                                const newType = formData.type === 'product' ? 'service' : 'product';
                                                onInputChange({
                                                    target: { name: 'type', value: newType }
                                                });
                                            }}
                                            onKeyDown={(e) => handleToggleKeyDown(e, () => {
                                                const newType = formData.type === 'product' ? 'service' : 'product';
                                                onInputChange({
                                                    target: { name: 'type', value: newType }
                                                });
                                            })}
                                            tabIndex={0}
                                            role="button"
                                            aria-label={`Switch to ${formData.type === 'product' ? 'service' : 'product'} mode`}
                                        >
                                            <div className={`toggle-slider ${formData.type === 'service' ? 'active' : ''}`}>
                                                <FontAwesomeIcon
                                                    icon={formData.type === 'service' ? faToggleOn : faToggleOff}
                                                    size="2x"
                                                    className={formData.type === 'service' ? 'text-primary' : 'text-secondary'}
                                                />
                                            </div>
                                        </div>
                                        <span className={`toggle-label ${formData.type === 'service' ? 'active' : ''}`}>
                                            Services
                                        </span>
                                    </div>
                                </div>
                            </Col>

                            <Col md={6}>
                                {/* Quick Database Search Section */}
                                <div className="p-3 bg-light rounded border">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 className="mb-1 fw-bold text-primary">
                                                <FontAwesomeIcon icon={faDatabase} className="me-2" />
                                                Search Items in Database
                                            </h6>
                                            <small className="text-muted">
                                                Import details to save time (Ctrl+D)
                                            </small>
                                        </div>
                                        <Button
                                            ref={searchDatabaseRef}
                                            variant="outline-primary"
                                            onClick={() => setShowProductSearch(true)}
                                            className="search-database-btn"
                                            tabIndex={0}
                                        >
                                            <FontAwesomeIcon icon={faSearch} />
                                        </Button>
                                    </div>
                                </div>
                            </Col>
                        </Row>

                        <Form onSubmit={handleSubmit} autoComplete="off">
                            {/* First Row - Item Details */}
                            <Row className="mb-4">
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">
                                            {formData.type === 'service' ? 'Service Name' : 'Item Name'} <span className="text-danger">*</span>
                                        </Form.Label>
                                        <Form.Control
                                            ref={nameRef}
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={onInputChange}
                                            placeholder={formData.type === 'service' ? 'Service Name' : 'Item Name'}
                                            className="form-input"
                                            required
                                            tabIndex={0}
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={3}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">
                                            {formData.type === 'service' ? 'SAC Code' : 'HSN Code'}
                                        </Form.Label>
                                        <Form.Control
                                            ref={hsnNumberRef}
                                            type="text"
                                            name="hsnNumber"
                                            value={formData.hsnNumber}
                                            onChange={onInputChange}
                                            placeholder={formData.type === 'service' ? 'SAC Code' : 'HSN Code'}
                                            className="form-input"
                                            tabIndex={0}
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={3}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">
                                            {formData.type === 'service' ? 'Service Code' : 'Item Code'}
                                            <Button
                                                ref={assignCodeRef}
                                                variant="link"
                                                size="sm"
                                                className="p-0 ms-2 text-primary"
                                                onClick={handleGenerateCode}
                                                title="Generate Code (Ctrl+G)"
                                                tabIndex={0}
                                            >
                                                Assign Code
                                            </Button>
                                        </Form.Label>
                                        <Form.Control
                                            ref={itemCodeRef}
                                            type="text"
                                            name="itemCode"
                                            value={formData.itemCode}
                                            onChange={onInputChange}
                                            placeholder={formData.type === 'service' ? 'Service Code' : 'Item Code'}
                                            className="form-input"
                                            tabIndex={0}
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={2}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">
                                            Select Unit <span className="text-danger">*</span>
                                        </Form.Label>
                                        <Form.Select
                                            ref={unitRef}
                                            name="unit"
                                            value={formData.unit}
                                            onChange={onInputChange}
                                            className="form-input"
                                            required
                                            tabIndex={0}
                                        >
                                            <option value="">Select Unit</option>
                                            {unitOptions.map(unit => (
                                                <option key={unit} value={unit}>
                                                    {unit}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* Second Row - Category, GST, Description */}
                            <Row className="mb-4">
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">
                                            Select Category <span className="text-danger">*</span>
                                        </Form.Label>
                                        <Form.Select
                                            ref={categoryRef}
                                            name="category"
                                            value={formData.category}
                                            onChange={onInputChange}
                                            className="form-input"
                                            required
                                            tabIndex={0}
                                        >
                                            <option value="">Select Category</option>
                                            {categories.filter(cat => cat.isActive).map(category => (
                                                <option key={category.id} value={category.name}>
                                                    {category.name}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>

                                <Col md={3}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">GST Rate</Form.Label>
                                        <Form.Select
                                            ref={gstRateRef}
                                            name="gstRate"
                                            value={formData.gstRate}
                                            onChange={onInputChange}
                                            className="form-input"
                                            tabIndex={0}
                                        >
                                            {gstRateOptions.map(rate => (
                                                <option key={rate} value={rate}>
                                                    {rate}%
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>

                                <Col md={5}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">Description</Form.Label>
                                        <Form.Control
                                            ref={descriptionRef}
                                            as="textarea"
                                            rows={2}
                                            name="description"
                                            value={formData.description}
                                            onChange={onInputChange}
                                            placeholder="Description"
                                            className="form-input"
                                            tabIndex={0}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* Stock and Pricing Section */}
                            <Row className="mb-4">
                                {/* Stock Section - Only for Products */}
                                {formData.type !== 'service' && (
                                    <Col md={6}>
                                        <div className="section-header">
                                            <h6 className="fw-bold text-primary mb-3">Stock</h6>
                                        </div>

                                        <Row>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="fw-semibold">Opening Quantity</Form.Label>
                                                    <Form.Control
                                                        ref={openingStockRef}
                                                        type="number"
                                                        name="openingStock"
                                                        value={formData.openingStock || ''}
                                                        onChange={onInputChange}
                                                        placeholder="Opening Quantity"
                                                        className="form-input"
                                                        min="0"
                                                        step="0.01"
                                                        tabIndex={0}
                                                    />
                                                </Form.Group>
                                            </Col>

                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="fw-semibold">As of Date</Form.Label>
                                                    <Form.Control
                                                        ref={asOfDateRef}
                                                        type="date"
                                                        name="asOfDate"
                                                        value={formData.asOfDate || new Date().toISOString().split('T')[0]}
                                                        onChange={onInputChange}
                                                        className="form-input date-input"
                                                        tabIndex={0}
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>

                                        <Row>
                                            <Col md={12}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="fw-semibold">Min Stock Level</Form.Label>
                                                    <Form.Control
                                                        ref={minStockLevelRef}
                                                        type="number"
                                                        name="minStockLevel"
                                                        value={formData.minStockLevel}
                                                        onChange={onInputChange}
                                                        placeholder="Minimum Stock to Maintain"
                                                        className="form-input"
                                                        min="0"
                                                        step="0.01"
                                                        tabIndex={0}
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                    </Col>
                                )}

                                {/* Pricing Section */}
                                <Col md={formData.type !== 'service' ? 6 : 12}>
                                    <div className="section-header">
                                        <h6 className="fw-bold text-primary mb-3">
                                            {formData.type === 'service' ? 'Service Rate' : 'Pricing'}
                                        </h6>
                                    </div>

                                    <Row>
                                        {/* Buy Price - Only for Products */}
                                        {formData.type !== 'service' && (
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="fw-semibold">
                                                        Purchase Price
                                                        <div className="tax-toggle-container">
                                                            <small
                                                                ref={buyTaxToggleRef}
                                                                className={`tax-toggle ${!buyPriceTaxInclusive ? 'active' : ''}`}
                                                                onClick={() => setBuyPriceTaxInclusive(false)}
                                                                onKeyDown={(e) => handleToggleKeyDown(e, () => setBuyPriceTaxInclusive(false))}
                                                                tabIndex={0}
                                                                role="button"
                                                                aria-label="Set purchase price to include tax"
                                                            >
                                                                With Tax
                                                            </small>
                                                            <small
                                                                className={`tax-toggle ${buyPriceTaxInclusive ? 'active' : ''}`}
                                                                onClick={() => setBuyPriceTaxInclusive(true)}
                                                                onKeyDown={(e) => handleToggleKeyDown(e, () => setBuyPriceTaxInclusive(true))}
                                                                tabIndex={0}
                                                                role="button"
                                                                aria-label="Set purchase price to exclude tax"
                                                            >
                                                                Without Tax
                                                            </small>
                                                        </div>
                                                    </Form.Label>
                                                    <InputGroup>
                                                        <Form.Control
                                                            ref={buyPriceRef}
                                                            type="number"
                                                            name="buyPrice"
                                                            value={formData.buyPrice || ''}
                                                            onChange={onInputChange}
                                                            placeholder="Purchase Price"
                                                            className="form-input"
                                                            min="0"
                                                            step="0.01"
                                                            tabIndex={0}
                                                        />
                                                        <InputGroup.Text>
                                                            {buyPriceTaxInclusive ? 'Excl.' : 'Incl.'}
                                                        </InputGroup.Text>
                                                    </InputGroup>
                                                    {formData.buyPrice && formData.gstRate && (
                                                        <Form.Text className="text-muted">
                                                            {buyPriceTaxInclusive ? 'With tax: ' : 'Without tax: '}
                                                            ₹{calculatePriceWithTax(formData.buyPrice, formData.gstRate, buyPriceTaxInclusive)}
                                                        </Form.Text>
                                                    )}
                                                </Form.Group>
                                            </Col>
                                        )}

                                        {/* Sale Price/Service Rate */}
                                        <Col md={formData.type === 'service' ? 12 : 6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-semibold">
                                                    {formData.type === 'service' ? 'Service Rate' : 'Selling Price'}
                                                    <div className="tax-toggle-container">
                                                        <small
                                                            ref={saleTaxToggleRef}
                                                            className={`tax-toggle ${!salePriceTaxInclusive ? 'active' : ''}`}
                                                            onClick={() => setSalePriceTaxInclusive(false)}
                                                            onKeyDown={(e) => handleToggleKeyDown(e, () => setSalePriceTaxInclusive(false))}
                                                            tabIndex={0}
                                                            role="button"
                                                            aria-label={`Set ${formData.type === 'service' ? 'service rate' : 'selling price'} to include tax`}
                                                        >
                                                            With Tax
                                                        </small>
                                                        <small
                                                            className={`tax-toggle ${salePriceTaxInclusive ? 'active' : ''}`}
                                                            onClick={() => setSalePriceTaxInclusive(true)}
                                                            onKeyDown={(e) => handleToggleKeyDown(e, () => setSalePriceTaxInclusive(true))}
                                                            tabIndex={0}
                                                            role="button"
                                                            aria-label={`Set ${formData.type === 'service' ? 'service rate' : 'selling price'} to exclude tax`}
                                                        >
                                                            Without Tax
                                                        </small>
                                                    </div>
                                                </Form.Label>
                                                <InputGroup>
                                                    <Form.Control
                                                        ref={salePriceRef}
                                                        type="number"
                                                        name="salePrice"
                                                        value={formData.salePrice || ''}
                                                        onChange={onInputChange}
                                                        placeholder={formData.type === 'service' ? 'Service Rate' : 'Selling Price'}
                                                        className="form-input"
                                                        min="0"
                                                        step="0.01"
                                                        tabIndex={0}
                                                    />
                                                    <InputGroup.Text>
                                                        {salePriceTaxInclusive ? 'Excl.' : 'Incl.'}
                                                    </InputGroup.Text>
                                                </InputGroup>
                                                {formData.salePrice && formData.gstRate && (
                                                    <Form.Text className="text-muted">
                                                        {salePriceTaxInclusive ? 'With tax: ' : 'Without tax: '}
                                                        ₹{calculatePriceWithTax(formData.salePrice, formData.gstRate, salePriceTaxInclusive)}
                                                    </Form.Text>
                                                )}
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </Col>
                            </Row>

                            {/* Status */}
                            <Row className="mb-4">
                                <Col md={12}>
                                    <Form.Check
                                        ref={isActiveRef}
                                        type="switch"
                                        id="isActive"
                                        name="isActive"
                                        checked={formData.isActive}
                                        onChange={onInputChange}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                onInputChange({
                                                    target: {
                                                        name: 'isActive',
                                                        type: 'checkbox',
                                                        checked: !formData.isActive
                                                    }
                                                });
                                            }
                                        }}
                                        label={`${formData.type === 'service' ? 'Service' : 'Item'} is active (Space/Enter to toggle)`}
                                        className="mb-3"
                                        tabIndex={0}
                                    />
                                </Col>
                            </Row>

                            {/* Action Buttons */}
                            <div className="action-buttons">
                                <Button
                                    ref={cancelButtonRef}
                                    variant="outline-secondary"
                                    onClick={handleModalHide}
                                    className="cancel-btn"
                                    type="button"
                                    tabIndex={0}
                                >
                                    <FontAwesomeIcon icon={faTimes} className="me-2" />
                                    Cancel
                                </Button>

                                {/* Save & Add Another Button - Only show for new items */}
                                {!editingProduct && (
                                    <Button
                                        ref={saveAndAddButtonRef}
                                        variant="outline-success"
                                        onClick={handleSaveAndAddAnother}
                                        className="save-and-new-btn"
                                        type="button"
                                        tabIndex={0}
                                        style={{ whiteSpace: 'nowrap' }}
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="me-2" />
                                        Save & Add New
                                    </Button>
                                )}

                                <Button
                                    ref={saveButtonRef}
                                    variant="primary"
                                    type="submit"
                                    className="save-and-exit-btn"
                                    tabIndex={0}
                                    style={{ whiteSpace: 'nowrap' }}
                                >
                                    <FontAwesomeIcon icon={faSave} className="me-2" />
                                    {editingProduct ? 'Update' : 'Save'} & Close
                                </Button>
                            </div>

                        </Form>
                    </Modal.Body>
                </div>
            </Modal>

            {/* Product Search Modal */}
            <ProductSearchModal
                show={showProductSearch}
                onHide={() => setShowProductSearch(false)}
                products={searchProducts}
                onProductSelect={handleProductSelection}
            />
        </>
    );
}

export default ProductModal;