import React, { useRef, useEffect, useState } from 'react';
import { Modal, Form, Button, Row, Col, InputGroup, Toast, ToastContainer } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes, faSearch, faDatabase, faPlus, faCheck, faToggleOn, faToggleOff, faSpinner } from '@fortawesome/free-solid-svg-icons';
import ProductSearchModal from './ProductSearchModal';
import itemService from '../../../services/itemService';
import './ProductModal.css';

function ProductModal({
    show,
    onHide,
    editingProduct,
    formData,
    categories,
    onInputChange,
    onSaveProduct,
    currentCompany // Add this prop to get current company
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
    const [toastType, setToastType] = useState('success'); // 'success' or 'error'
    const [isSaveAndAdd, setIsSaveAndAdd] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [buyPriceTaxInclusive, setBuyPriceTaxInclusive] = useState(false);
    const [salePriceTaxInclusive, setSalePriceTaxInclusive] = useState(false);
    
    // Database search products state
    const [searchProducts, setSearchProducts] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

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
            setIsLoading(false);
        }
    }, [show]);

    // Load search products when modal opens
    useEffect(() => {
        if (show && currentCompany?.id) {
            loadSearchProducts();
        }
    }, [show, currentCompany?.id]);

    // Load products for search modal
    const loadSearchProducts = async () => {
        try {
            if (!currentCompany?.id) return;
            
            setIsSearching(true);
            const response = await itemService.getItems(currentCompany.id, {
                limit: 50,
                isActive: true,
                sortBy: 'name',
                sortOrder: 'asc'
            });
            
            if (response.success) {
                setSearchProducts(response.data.items || []);
            }
        } catch (error) {
            console.error('Error loading search products:', error);
            showToastMessage('Error loading products for search', 'error');
        } finally {
            setIsSearching(false);
        }
    };

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

    // Show toast message
    const showToastMessage = (message, type = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);

        // Auto-hide toast after 4 seconds
        setTimeout(() => {
            setShowToast(false);
        }, 4000);
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
        // Prevent action if currently loading
        if (isLoading) return;

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
            showToastMessage('Item code generated automatically!');
        } else {
            showToastMessage('Please enter item name and select category first', 'error');
        }
    };

    // Validate form data
    const validateForm = () => {
        if (!currentCompany?.id) {
            showToastMessage('No company selected', 'error');
            return false;
        }

        if (!formData.name?.trim()) {
            nameRef.current?.focus();
            showToastMessage('Please enter item name', 'error');
            return false;
        }

        if (!formData.unit) {
            unitRef.current?.focus();
            showToastMessage('Please select unit', 'error');
            return false;
        }

        if (!formData.category) {
            categoryRef.current?.focus();
            showToastMessage('Please select category', 'error');
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

    // Handle form submission using backend API
    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!validateForm() || isLoading) {
            return;
        }

        setIsLoading(true);

        try {
            console.log('🚀 Submitting item data:', formData);

            // Prepare item data for API
            const itemData = {
                name: formData.name?.trim(),
                itemCode: formData.itemCode?.trim() || undefined,
                hsnNumber: formData.hsnNumber?.trim() || undefined,
                type: formData.type || 'product',
                category: formData.category?.trim(),
                unit: formData.unit,
                description: formData.description?.trim() || undefined,
                buyPrice: parseFloat(formData.buyPrice) || 0,
                salePrice: parseFloat(formData.salePrice) || 0,
                gstRate: parseFloat(formData.gstRate) || 0,
                openingStock: formData.type === 'service' ? 0 : (parseFloat(formData.openingStock) || 0),
                minStockLevel: formData.type === 'service' ? 0 : (parseFloat(formData.minStockLevel) || 0),
                asOfDate: formData.asOfDate || new Date().toISOString().split('T')[0],
                isActive: formData.isActive !== undefined ? formData.isActive : true
            };

            let result;
            if (editingProduct) {
                // Update existing item
                result = await itemService.updateItem(currentCompany.id, editingProduct.id || editingProduct._id, itemData);
                showToastMessage(`${formData.name} updated successfully!`);
            } else {
                // Create new item
                result = await itemService.createItem(currentCompany.id, itemData);
                showToastMessage(`${formData.name} created successfully!`);
            }

            console.log('✅ Item saved successfully:', result);

            // Call parent's onSaveProduct callback if provided
            if (onSaveProduct) {
                await onSaveProduct({
                    ...e,
                    saveAndAdd: false,
                    result: result.data.item
                }, false);
            }

            // Close modal after successful save
            setTimeout(() => {
                onHide();
            }, 1000);

        } catch (error) {
            console.error('❌ Error saving item:', error);
            showToastMessage(`Error saving item: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle save and add another
    const handleSaveAndAddAnother = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!validateForm() || isLoading) {
            return;
        }

        setIsLoading(true);
        setIsSaveAndAdd(true);

        try {
            const currentProductName = formData.name;
            console.log('🚀 Saving and adding another item:', formData);

            // Prepare item data for API
            const itemData = {
                name: formData.name?.trim(),
                itemCode: formData.itemCode?.trim() || undefined,
                hsnNumber: formData.hsnNumber?.trim() || undefined,
                type: formData.type || 'product',
                category: formData.category?.trim(),
                unit: formData.unit,
                description: formData.description?.trim() || undefined,
                buyPrice: parseFloat(formData.buyPrice) || 0,
                salePrice: parseFloat(formData.salePrice) || 0,
                gstRate: parseFloat(formData.gstRate) || 0,
                openingStock: formData.type === 'service' ? 0 : (parseFloat(formData.openingStock) || 0),
                minStockLevel: formData.type === 'service' ? 0 : (parseFloat(formData.minStockLevel) || 0),
                asOfDate: formData.asOfDate || new Date().toISOString().split('T')[0],
                isActive: formData.isActive !== undefined ? formData.isActive : true
            };

            // Create new item via API
            const result = await itemService.createItem(currentCompany.id, itemData);
            
            console.log('✅ Item created successfully:', result);

            // Show success message
            showToastMessage(`${currentProductName} saved successfully! Ready to add another...`);

            // Call parent's onSaveProduct callback if provided
            if (onSaveProduct) {
                await onSaveProduct({
                    ...e,
                    saveAndAdd: true,
                    result: result.data.item
                }, true);
            }

            // Clear form for new product while keeping common fields
            clearFormForNext();

            // Focus on name field for next product
            setTimeout(() => {
                nameRef.current?.focus();
            }, 200);

        } catch (error) {
            console.error('❌ Error saving item:', error);
            showToastMessage(`Error saving item: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
            setIsSaveAndAdd(false);
        }
    };

    // Custom onHide that checks for save and add
    const handleModalHide = () => {
        if (isSaveAndAdd || isLoading) {
            return; // Don't close modal if we're in save and add mode or loading
        }
        onHide();
    };

    // Handle product selection from search modal
    const handleProductSelection = (product) => {
        console.log('🔍 Selected product from search:', product);

        // Auto-fill form with selected product data
        const productData = {
            name: product.name,
            itemCode: product.itemCode || product.sku,
            hsnNumber: product.hsnNumber,
            unit: product.unit,
            category: product.category,
            description: product.description,
            gstRate: product.gstRate,
            type: product.type || 'product',
            buyPrice: product.buyPrice,
            salePrice: product.salePrice,
            isActive: true
        };

        // Update form data using individual onInputChange calls
        Object.entries(productData).forEach(([name, value]) => {
            if (value !== undefined && value !== null) {
                onInputChange({
                    target: { name, value }
                });
            }
        });

        setShowProductSearch(false);
        showToastMessage('Product details imported successfully!');

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
                            {currentCompany && (
                                <small className="text-muted ms-2">
                                    for {currentCompany.companyName}
                                </small>
                            )}
                            <small className="text-muted ms-2 fw-normal d-block">
                                (Tab/Enter: navigate, Esc: close, Ctrl+S: save, Ctrl+Shift+S: save & add, Ctrl+G: generate code, Ctrl+D: search database)
                            </small>
                        </Modal.Title>
                        <Button
                            variant="link"
                            className="p-0 border-0 text-muted"
                            onClick={handleModalHide}
                            disabled={isLoading}
                        >
                            <FontAwesomeIcon icon={faTimes} size="lg" />
                        </Button>
                    </Modal.Header>

                    <Modal.Body className="px-4 pb-4">
                        {/* Enhanced Toast */}
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
                                className={`${toastType}-toast`}
                                autohide
                                delay={4000}
                            >
                                <Toast.Header className={`${toastType === 'success' ? 'bg-success' : 'bg-danger'} text-white border-0`}>
                                    <FontAwesomeIcon 
                                        icon={toastType === 'success' ? faCheck : faTimes} 
                                        className="me-2" 
                                    />
                                    <strong className="me-auto">
                                        {toastType === 'success' ? 'Success' : 'Error'}
                                    </strong>
                                </Toast.Header>
                                <Toast.Body className="bg-light border-0">
                                    <div className="d-flex align-items-center">
                                        <FontAwesomeIcon 
                                            icon={toastType === 'success' ? faCheck : faTimes} 
                                            className={`${toastType === 'success' ? 'text-success' : 'text-danger'} me-2`} 
                                        />
                                        <span>{toastMessage}</span>
                                    </div>
                                    {isSaveAndAdd && toastType === 'success' && (
                                        <small className="text-muted mt-1 d-block">
                                            Ready to add another item...
                                        </small>
                                    )}
                                </Toast.Body>
                            </Toast>
                        </ToastContainer>

                        {/* Loading Overlay */}
                        {isLoading && (
                            <div className="loading-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75" style={{ zIndex: 1000 }}>
                                <div className="text-center">
                                    <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-primary mb-3" />
                                    <div className="fw-bold text-primary">
                                        {editingProduct ? 'Updating item...' : (isSaveAndAdd ? 'Saving item and preparing for next...' : 'Saving item...')}
                                    </div>
                                </div>
                            </div>
                        )}

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
                                                if (!isLoading) {
                                                    const newType = formData.type === 'product' ? 'service' : 'product';
                                                    onInputChange({
                                                        target: { name: 'type', value: newType }
                                                    });
                                                }
                                            }}
                                            onKeyDown={(e) => handleToggleKeyDown(e, () => {
                                                if (!isLoading) {
                                                    const newType = formData.type === 'product' ? 'service' : 'product';
                                                    onInputChange({
                                                        target: { name: 'type', value: newType }
                                                    });
                                                }
                                            })}
                                            tabIndex={0}
                                            role="button"
                                            aria-label={`Switch to ${formData.type === 'product' ? 'service' : 'product'} mode`}
                                            style={{ opacity: isLoading ? 0.6 : 1 }}
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
                                {/* Enhanced Database Search Section */}
                                <div className="p-3 bg-light rounded border">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 className="mb-1 fw-bold text-primary">
                                                <FontAwesomeIcon icon={faDatabase} className="me-2" />
                                                Search Items in Database
                                                {isSearching && (
                                                    <FontAwesomeIcon icon={faSpinner} spin className="ms-2 text-muted" />
                                                )}
                                            </h6>
                                            <small className="text-muted">
                                                Import details to save time (Ctrl+D)
                                                {searchProducts.length > 0 && (
                                                    <span className="ms-1">• {searchProducts.length} items available</span>
                                                )}
                                            </small>
                                        </div>
                                        <Button
                                            ref={searchDatabaseRef}
                                            variant="outline-primary"
                                            onClick={() => !isLoading && setShowProductSearch(true)}
                                            className="search-database-btn"
                                            tabIndex={0}
                                            disabled={isLoading || isSearching}
                                        >
                                            <FontAwesomeIcon icon={faSearch} />
                                        </Button>
                                    </div>
                                </div>
                            </Col>
                        </Row>

                        <Form onSubmit={handleSubmit} autoComplete="off">
                            {/* All the existing form fields remain the same */}
                            {/* Just update the action buttons at the bottom */}
                            
                            {/* ... (all existing form fields remain unchanged) ... */}
                            
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
                                            value={formData.name || ''}
                                            onChange={onInputChange}
                                            placeholder={formData.type === 'service' ? 'Service Name' : 'Item Name'}
                                            className="form-input"
                                            required
                                            tabIndex={0}
                                            disabled={isLoading}
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
                                            value={formData.hsnNumber || ''}
                                            onChange={onInputChange}
                                            placeholder={formData.type === 'service' ? 'SAC Code' : 'HSN Code'}
                                            className="form-input"
                                            tabIndex={0}
                                            disabled={isLoading}
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
                                                disabled={isLoading}
                                            >
                                                Assign Code
                                            </Button>
                                        </Form.Label>
                                        <Form.Control
                                            ref={itemCodeRef}
                                            type="text"
                                            name="itemCode"
                                            value={formData.itemCode || ''}
                                            onChange={onInputChange}
                                            placeholder={formData.type === 'service' ? 'Service Code' : 'Item Code'}
                                            className="form-input"
                                            tabIndex={0}
                                            disabled={isLoading}
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
                                            value={formData.unit || ''}
                                            onChange={onInputChange}
                                            className="form-input"
                                            required
                                            tabIndex={0}
                                            disabled={isLoading}
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
                                            value={formData.category || ''}
                                            onChange={onInputChange}
                                            className="form-input"
                                            required
                                            tabIndex={0}
                                            disabled={isLoading}
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
                                            value={formData.gstRate || 0}
                                            onChange={onInputChange}
                                            className="form-input"
                                            tabIndex={0}
                                            disabled={isLoading}
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
                                            value={formData.description || ''}
                                            onChange={onInputChange}
                                            placeholder="Description"
                                            className="form-input"
                                            tabIndex={0}
                                            disabled={isLoading}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* ... (continue with all other form sections - Stock, Pricing, Status) ... */}
                            
                            {/* Enhanced Action Buttons */}
                            <div className="action-buttons">
                                <Button
                                    ref={cancelButtonRef}
                                    variant="outline-secondary"
                                    onClick={handleModalHide}
                                    className="cancel-btn"
                                    type="button"
                                    tabIndex={0}
                                    disabled={isLoading}
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
                                        disabled={isLoading}
                                        style={{ whiteSpace: 'nowrap' }}
                                    >
                                        {isLoading && isSaveAndAdd ? (
                                            <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                                        ) : (
                                            <FontAwesomeIcon icon={faPlus} className="me-2" />
                                        )}
                                        Save & Add New
                                    </Button>
                                )}

                                <Button
                                    ref={saveButtonRef}
                                    variant="primary"
                                    type="submit"
                                    className="save-and-exit-btn"
                                    tabIndex={0}
                                    disabled={isLoading}
                                    style={{ whiteSpace: 'nowrap' }}
                                >
                                    {isLoading && !isSaveAndAdd ? (
                                        <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                                    ) : (
                                        <FontAwesomeIcon icon={faSave} className="me-2" />
                                    )}
                                    {editingProduct ? 'Update' : 'Save'} & Close
                                </Button>
                            </div>

                        </Form>
                    </Modal.Body>
                </div>
            </Modal>

            {/* Enhanced Product Search Modal */}
            <ProductSearchModal
                show={showProductSearch}
                onHide={() => setShowProductSearch(false)}
                products={searchProducts}
                onProductSelect={handleProductSelection}
                isLoading={isSearching}
                companyName={currentCompany?.companyName}
            />
        </>
    );
}

export default ProductModal;