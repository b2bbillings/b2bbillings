import React, { useRef, useEffect, useState } from 'react';
import { Modal, Form, Button, Row, Col, InputGroup, Toast, ToastContainer } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes, faSearch, faDatabase, faPlus, faCheck } from '@fortawesome/free-solid-svg-icons';
import ProductSearchModal from './ProductSearchModal';

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
    const typeRef = useRef(null);
    const gstRateRef = useRef(null);
    const nameRef = useRef(null);
    const itemCodeRef = useRef(null);
    const hsnNumberRef = useRef(null);
    const unitRef = useRef(null);
    const categoryRef = useRef(null);
    const descriptionRef = useRef(null);
    const openingStockRef = useRef(null);
    const minStockLevelRef = useRef(null);
    const isActiveRef = useRef(null);
    const cancelButtonRef = useRef(null);
    const saveAndAddButtonRef = useRef(null);
    const saveButtonRef = useRef(null);

    // Local state for product search and toast
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [isSaveAndAdd, setIsSaveAndAdd] = useState(false);
    const [searchProducts] = useState([
        // Sample database products - replace with actual API call
        { id: 1, name: 'HP Laptop i5 8GB', sku: 'HP-LAP-001', price: 45000, gstRate: 18, unit: 'PCS', category: 'Electronics', hsnNumber: '8471', description: 'HP Pavilion Laptop with i5 processor' },
        { id: 2, name: 'Office Chair Executive', sku: 'OFC-CHR-001', price: 8500, gstRate: 12, unit: 'PCS', category: 'Furniture', hsnNumber: '9401', description: 'Executive office chair with lumbar support' },
        { id: 3, name: 'A4 Paper 500 Sheets', sku: 'PPR-A4-001', price: 350, gstRate: 12, unit: 'PAC', category: 'Stationery', hsnNumber: '4802', description: 'Premium quality A4 printing paper' },
        { id: 4, name: 'Wireless Mouse Optical', sku: 'MSE-WL-001', price: 850, gstRate: 18, unit: 'PCS', category: 'Electronics', hsnNumber: '8471', description: 'Optical wireless mouse with USB receiver' },
        { id: 5, name: 'Business Consultation', sku: 'SVC-CONS-001', price: 2500, gstRate: 18, unit: 'HRS', category: 'Services', type: 'service', description: 'Professional business consultation service' },
        { id: 6, name: 'LED Monitor 24 inch', sku: 'MON-LED-001', price: 12000, gstRate: 18, unit: 'PCS', category: 'Electronics', hsnNumber: '8528', description: '24 inch LED monitor with HDMI' },
        { id: 7, name: 'Steel Almirah 4 Door', sku: 'ALM-STL-001', price: 15000, gstRate: 18, unit: 'PCS', category: 'Furniture', hsnNumber: '9403', description: '4 door steel almirah for office use' },
        { id: 8, name: 'Printer Inkjet Color', sku: 'PRT-INK-001', price: 8500, gstRate: 18, unit: 'PCS', category: 'Electronics', hsnNumber: '8443', description: 'Color inkjet printer with scanner' }
    ]);

    const unitOptions = [
        'BAG', 'BTL', 'BOX', 'BUN', 'CAN', 'CTN', 'DOZ', 'DRM', 'FEW', 'GMS', 'GRS', 'KGS', 'KME', 'LTR', 'MLS', 'MTR', 'NOS', 'PAC', 'PCS', 'QTL', 'ROL', 'SET', 'SQF', 'SQM', 'TBS', 'TGM', 'THD', 'TON', 'TUB', 'UGS', 'UNT', 'YDS', 'OTH'
    ];

    const gstRateOptions = [0, 0.25, 3, 5, 12, 18, 28];

    // Auto-focus first field when modal opens
    useEffect(() => {
        if (show && typeRef.current) {
            setTimeout(() => {
                typeRef.current.focus();
            }, 100);
        }
    }, [show]);

    // Reset save and add flag when modal closes
    useEffect(() => {
        if (!show) {
            setIsSaveAndAdd(false);
        }
    }, [show]);

    // Handle keyboard navigation
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
            handleSaveAndAddAnother(e);
            return;
        }

        // Handle Enter key navigation
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            navigateToNext(e.target);
        }
    };

    // Navigate to next field
    const navigateToNext = (currentElement) => {
        const formRefs = [
            typeRef, gstRateRef, nameRef, itemCodeRef, hsnNumberRef, unitRef,
            categoryRef, descriptionRef,
            ...(formData.type !== 'service' ? [openingStockRef, minStockLevelRef] : []),
            isActiveRef, saveAndAddButtonRef, saveButtonRef
        ];

        const currentIndex = formRefs.findIndex(ref => ref.current === currentElement);
        if (currentIndex !== -1 && currentIndex < formRefs.length - 1) {
            const nextRef = formRefs[currentIndex + 1];
            if (nextRef && nextRef.current) {
                nextRef.current.focus();
            }
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
        const fieldsToReset = ['name', 'itemCode', 'hsnNumber', 'description', 'openingStock', 'minStockLevel'];

        fieldsToReset.forEach(field => {
            onInputChange({
                target: { name: field, value: '' }
            });
        });

        // Keep isActive as true
        onInputChange({
            target: { name: 'isActive', value: true, type: 'checkbox', checked: true }
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
            price: product.price,
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
                size="lg"
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
                                (Tab/Enter to navigate, Esc to close, Ctrl+S to save, Ctrl+Shift+S to save & add another)
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

                        {/* Quick Database Search Section */}
                        <div className="mb-4 p-3 bg-light rounded border">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="mb-1 fw-bold text-primary">
                                        <FontAwesomeIcon icon={faDatabase} className="me-2" />
                                        Quick Add from Database
                                    </h6>
                                    <small className="text-muted">
                                        Search and import product details from our database to save time
                                    </small>
                                </div>
                                <Button
                                    variant="outline-primary"
                                    onClick={() => setShowProductSearch(true)}
                                    className="d-flex align-items-center gap-2"
                                >
                                    <FontAwesomeIcon icon={faSearch} />
                                    Search Database
                                </Button>
                            </div>
                        </div>

                        <Form onSubmit={handleSubmit} autoComplete="off">
                            {/* Type Selection at Top */}
                            <Row className="mb-4">
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">
                                            Type <span className="text-danger">*</span>
                                        </Form.Label>
                                        <Form.Select
                                            ref={typeRef}
                                            name="type"
                                            value={formData.type || 'product'}
                                            onChange={onInputChange}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    gstRateRef.current?.focus();
                                                }
                                            }}
                                            className="form-input"
                                            required
                                        >
                                            <option value="product">Product</option>
                                            <option value="service">Service</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">GST Rate (%)</Form.Label>
                                        <Form.Select
                                            ref={gstRateRef}
                                            name="gstRate"
                                            value={formData.gstRate}
                                            onChange={onInputChange}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    nameRef.current?.focus();
                                                }
                                            }}
                                            className="form-input"
                                        >
                                            {gstRateOptions.map(rate => (
                                                <option key={rate} value={rate}>
                                                    {rate}%
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* Basic Information */}
                            <Row className="mb-4">
                                <Col md={12}>
                                    <h6 className="fw-bold text-primary mb-3">Basic Information</h6>

                                    <Row>
                                        <Col md={8}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-semibold">
                                                    Item Name <span className="text-danger">*</span>
                                                </Form.Label>
                                                <Form.Control
                                                    ref={nameRef}
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={onInputChange}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            itemCodeRef.current?.focus();
                                                        }
                                                    }}
                                                    placeholder="Enter item name (required)"
                                                    className="form-input"
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>

                                        <Col md={4}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-semibold">Item Code</Form.Label>
                                                <Form.Control
                                                    ref={itemCodeRef}
                                                    type="text"
                                                    name="itemCode"
                                                    value={formData.itemCode}
                                                    onChange={onInputChange}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            hsnNumberRef.current?.focus();
                                                        }
                                                    }}
                                                    placeholder="Optional code"
                                                    className="form-input"
                                                />
                                                <Form.Text className="text-muted">
                                                    Optional item code for reference
                                                </Form.Text>
                                            </Form.Group>
                                        </Col>
                                    </Row>

                                    <Row>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-semibold">HSN Number</Form.Label>
                                                <Form.Control
                                                    ref={hsnNumberRef}
                                                    type="text"
                                                    name="hsnNumber"
                                                    value={formData.hsnNumber}
                                                    onChange={onInputChange}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            unitRef.current?.focus();
                                                        }
                                                    }}
                                                    placeholder="HSN/SAC code"
                                                    className="form-input"
                                                />
                                                <Form.Text className="text-muted">
                                                    HSN for goods, SAC for services
                                                </Form.Text>
                                            </Form.Group>
                                        </Col>

                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-semibold">
                                                    Unit <span className="text-danger">*</span>
                                                </Form.Label>
                                                <Form.Select
                                                    ref={unitRef}
                                                    name="unit"
                                                    value={formData.unit}
                                                    onChange={onInputChange}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            categoryRef.current?.focus();
                                                        }
                                                    }}
                                                    className="form-input"
                                                    required
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

                                    <Row>
                                        <Col md={12}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-semibold">
                                                    Category <span className="text-danger">*</span>
                                                </Form.Label>
                                                <Form.Select
                                                    ref={categoryRef}
                                                    name="category"
                                                    value={formData.category}
                                                    onChange={onInputChange}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            descriptionRef.current?.focus();
                                                        }
                                                    }}
                                                    className="form-input"
                                                    required
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
                                    </Row>

                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">Description</Form.Label>
                                        <Form.Control
                                            ref={descriptionRef}
                                            as="textarea"
                                            rows={3}
                                            name="description"
                                            value={formData.description}
                                            onChange={onInputChange}
                                            onKeyDown={(e) => {
                                                if (e.ctrlKey && e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (formData.type !== 'service') {
                                                        openingStockRef.current?.focus();
                                                    } else {
                                                        isActiveRef.current?.focus();
                                                    }
                                                }
                                            }}
                                            placeholder="Item description... (Ctrl+Enter to continue)"
                                            className="form-input"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* Opening Stock - Only for Products */}
                            {formData.type !== 'service' && (
                                <Row className="mb-4">
                                    <Col md={12}>
                                        <h6 className="fw-bold text-primary mb-3">Opening Stock</h6>

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
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                minStockLevelRef.current?.focus();
                                                            }
                                                        }}
                                                        placeholder="0"
                                                        className="form-input"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                    <Form.Text className="text-muted">
                                                        Initial stock quantity
                                                    </Form.Text>
                                                </Form.Group>
                                            </Col>

                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="fw-semibold">Minimum Stock Level</Form.Label>
                                                    <Form.Control
                                                        ref={minStockLevelRef}
                                                        type="number"
                                                        name="minStockLevel"
                                                        value={formData.minStockLevel}
                                                        onChange={onInputChange}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                isActiveRef.current?.focus();
                                                            }
                                                        }}
                                                        placeholder="10"
                                                        className="form-input"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                    <Form.Text className="text-muted">
                                                        Alert when stock goes below this level
                                                    </Form.Text>
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                    </Col>
                                </Row>
                            )}

                            {/* Status */}
                            <Row className="mb-4">
                                <Col md={12}>
                                    <h6 className="fw-bold text-primary mb-3">Status</h6>

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
                                            if (e.key === 'Tab' && !e.shiftKey) {
                                                e.preventDefault();
                                                saveAndAddButtonRef.current?.focus();
                                            }
                                        }}
                                        label="Item is active (Space/Enter to toggle)"
                                        className="mb-3"
                                    />
                                    <Form.Text className="text-muted">
                                        Inactive items won't appear in transaction forms
                                    </Form.Text>
                                </Col>
                            </Row>

                            {/* Action Buttons */}
                            <div className="d-flex gap-3 justify-content-end mt-4">
                                <Button
                                    ref={cancelButtonRef}
                                    variant="outline-secondary"
                                    onClick={handleModalHide}
                                    className="px-4"
                                    type="button"
                                >
                                    <FontAwesomeIcon icon={faTimes} className="me-2" />
                                    Cancel (Esc)
                                </Button>

                                {/* Save & Add Another Button - Only show for new items */}
                                {!editingProduct && (
                                    <Button
                                        ref={saveAndAddButtonRef}
                                        variant="outline-success"
                                        onClick={handleSaveAndAddAnother}
                                        className="px-4 save-and-add-btn"
                                        type="button"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Tab' && !e.shiftKey) {
                                                e.preventDefault();
                                                saveButtonRef.current?.focus();
                                            }
                                        }}
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="me-2" />
                                        Save & Add Another (Ctrl+Shift+S)
                                    </Button>
                                )}

                                <Button
                                    ref={saveButtonRef}
                                    variant="primary"
                                    type="submit"
                                    className="px-4"
                                >
                                    <FontAwesomeIcon icon={faSave} className="me-2" />
                                    {editingProduct ? 'Update Item' : 'Save Item'} (Ctrl+S)
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

            <style jsx>{`
                /* Blur effect for the underlying modal */
                .modal-blurred .modal-content {
                    filter: blur(3px);
                    transition: filter 0.3s ease;
                }

                .content-blurred {
                    filter: blur(3px);
                    opacity: 0.7;
                    transition: all 0.3s ease;
                    pointer-events: none;
                }

                .product-modal .modal-content {
                    border-radius: 12px;
                    border: none;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                    background: rgba(255, 255, 255, 0.98);
                    backdrop-filter: blur(10px);
                }

                .product-modal .modal-header {
                    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                    border-radius: 12px 12px 0 0;
                }

                .form-input {
                    border-radius: 8px;
                    border: 1px solid #dee2e6;
                    transition: all 0.2s ease;
                }

                .form-input:focus {
                    border-color: #007bff;
                    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.1);
                    transform: translateY(-1px);
                }

                .btn {
                    border-radius: 8px;
                    transition: all 0.2s ease;
                }

                .btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                /* Save & Add Another Button Styling */
                .save-and-add-btn {
                    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                    border: 2px solid #28a745;
                    color: #28a745;
                    font-weight: 600;
                    position: relative;
                    overflow: hidden;
                }

                .save-and-add-btn:hover {
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                    border-color: #28a745;
                    color: white;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(40, 167, 69, 0.3);
                }

                .save-and-add-btn:focus {
                    box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);
                    border-color: #28a745;
                }

                .save-and-add-btn:active {
                    transform: translateY(0);
                    box-shadow: 0 2px 8px rgba(40, 167, 69, 0.2);
                }

                /* Success Toast Styling */
                .success-toast {
                    border: none;
                    box-shadow: 0 8px 25px rgba(40, 167, 69, 0.3);
                    border-radius: 12px;
                    overflow: hidden;
                    animation: slideInRight 0.4s ease-out;
                }

                .success-toast .toast-header {
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                    border: none;
                }

                .success-toast .toast-body {
                    background: linear-gradient(135deg, #f8fff9 0%, #e8f5e8 100%);
                    border: none;
                    padding: 1rem;
                }

                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                /* Enhanced backdrop for layered modals */
                .product-modal.modal-blurred::before {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.3);
                    z-index: 1060;
                    backdrop-filter: blur(5px);
                    animation: fadeIn 0.3s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                /* Button animations */
                .save-and-add-btn::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
                    transition: left 0.5s;
                }

                .save-and-add-btn:hover::before {
                    left: 100%;
                }

                /* Responsive button layout */
                @media (max-width: 768px) {
                    .d-flex.gap-3.justify-content-end {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .save-and-add-btn {
                        order: 1;
                    }

                    .btn-primary {
                        order: 2;
                    }

                    .btn-outline-secondary {
                        order: 3;
                    }
                }
            `}</style>
        </>
    );
}

export default ProductModal;