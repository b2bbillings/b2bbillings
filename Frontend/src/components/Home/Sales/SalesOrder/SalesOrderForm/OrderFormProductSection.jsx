import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Form, Button, Spinner, Alert, Card, Modal, Table, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faBox, faRupeeSign, faBoxOpen, faCheck, faEdit, faTimes, faShoppingCart, faSave, faEye } from '@fortawesome/free-solid-svg-icons';
import itemService from '../../../../../services/itemService';
import ProductModal from '../../../Inventory/ProductModal';

function OrderFormProductSection({
    formData,
    onFormDataChange,
    companyId,
    currentUser,
    addToast,
    errors = {},
    disabled = false
}) {
    // Product search states
    const [products, setProducts] = useState([]);
    const [productSearchTerms, setProductSearchTerms] = useState('');
    const [showProductSuggestions, setShowProductSuggestions] = useState(false);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

    // ✅ NEW: Main product form modal state
    const [showProductFormModal, setShowProductFormModal] = useState(false);
    const [currentEditingIndex, setCurrentEditingIndex] = useState(null);
    const [tempFormData, setTempFormData] = useState({
        selectedProduct: '',
        productName: '',
        productCode: '',
        description: '',
        quantity: '',
        price: '',
        unit: 'pcs',
        gstMode: 'exclude',
        gstRate: 18,
        subtotal: 0,
        gstAmount: 0,
        totalAmount: 0,
        availableStock: 0,
        hsnNumber: ''
    });

    // Description modal states
    const [showDescriptionModal, setShowDescriptionModal] = useState(false);
    const [tempDescription, setTempDescription] = useState('');
    const descriptionTextareaRef = useRef(null);

    // Modal states for adding new items
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [quickAddContext, setQuickAddContext] = useState(null);

    // Enhanced refs for better keyboard navigation
    const inputRefs = useRef({});
    const isSelectingProductRef = useRef(false);
    const searchTimeoutRef = useRef(null);

    // ✅ STANDARDIZED INPUT STYLES
    const inputStyle = {
        borderColor: '#000',
        fontSize: '13px',
        padding: '10px 14px',
        height: '42px',
        borderWidth: '2px'
    };

    // Load products from backend
    const searchProducts = async (searchTerm) => {
        if (!companyId || !searchTerm || searchTerm.length < 2) {
            setProducts([]);
            setShowProductSuggestions(false);
            return;
        }

        try {
            setIsLoadingProducts(true);

            const response = await itemService.getItems(companyId, {
                search: searchTerm,
                limit: 20,
                isActive: true,
                type: 'product'
            });

            if (response.success) {
                const itemList = response.data?.items || response.data || [];
                const formattedProducts = itemList.map(item => ({
                    id: item._id || item.id,
                    name: item.name || item.itemName || 'Unknown Product',
                    code: item.itemCode || item.code || item.productCode || '',
                    description: item.description || '',
                    sellingPrice: parseFloat(item.salePrice || item.sellingPrice || item.price || 0),
                    purchasePrice: parseFloat(item.buyPrice || item.purchasePrice || item.cost || 0),
                    gstRate: parseFloat(item.gstRate || item.taxRate || 18),
                    unit: item.unit || 'pcs',
                    category: item.category || '',
                    stock: item.currentStock || item.openingStock || item.stock || 0,
                    minStock: item.minStockLevel || item.minStock || 0,
                    maxStock: item.maxStock || 0,
                    hsnNumber: item.hsnNumber || '',
                    type: item.type || 'product'
                }));

                setProducts(formattedProducts);
                if (!isSelectingProductRef.current) {
                    setShowProductSuggestions(true);
                }
                setSelectedSuggestionIndex(-1);
            } else {
                setProducts([]);
                if (!isSelectingProductRef.current) {
                    setShowProductSuggestions(true);
                }
                setSelectedSuggestionIndex(-1);
            }
        } catch (error) {
            setProducts([]);
            if (!isSelectingProductRef.current) {
                setShowProductSuggestions(true);
            }
            setSelectedSuggestionIndex(-1);
            if (searchTerm.length >= 2) {
                addToast?.('Failed to search products: ' + error.message, 'error');
            }
        } finally {
            setIsLoadingProducts(false);
        }
    };

    // Debounced product search
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (productSearchTerms && productSearchTerms.length >= 2 && !isSelectingProductRef.current) {
            searchTimeoutRef.current = setTimeout(() => {
                searchProducts(productSearchTerms);
            }, 300);
        } else if (productSearchTerms.length === 0) {
            setShowProductSuggestions(false);
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [productSearchTerms, companyId]);

    // ✅ NEW: Handle opening product form modal
    const handleAddProductClick = () => {
        setCurrentEditingIndex(null);
        setTempFormData({
            selectedProduct: '',
            productName: '',
            productCode: '',
            description: '',
            quantity: '',
            price: '',
            unit: 'pcs',
            gstMode: 'exclude',
            gstRate: 18,
            subtotal: 0,
            gstAmount: 0,
            totalAmount: 0,
            availableStock: 0,
            hsnNumber: ''
        });
        setProductSearchTerms('');
        setShowProductFormModal(true);
    };

    // ✅ NEW: Handle editing existing product
    const handleEditProduct = (index) => {
        const item = formData.items[index];
        setCurrentEditingIndex(index);
        setTempFormData({ ...item });
        setProductSearchTerms(item.productName || '');
        setShowProductFormModal(true);
    };

    // ✅ NEW: Handle product search in modal
    const handleProductSearchChange = (value) => {
        if (isSelectingProductRef.current) {
            return;
        }

        setProductSearchTerms(value);
        setTempFormData(prev => {
            if (prev.selectedProduct && value !== prev.productName) {
                return {
                    ...prev,
                    productName: value,
                    selectedProduct: '',
                    price: '',
                    gstRate: 18,
                    description: '',
                    productCode: '',
                    unit: 'pcs',
                    availableStock: 0,
                    hsnNumber: ''
                };
            } else {
                return {
                    ...prev,
                    productName: value
                };
            }
        });
    };

    // ✅ NEW: Handle product selection in modal
    const handleProductSelect = (product) => {
        isSelectingProductRef.current = true;

        setTempFormData(prev => ({
            ...prev,
            selectedProduct: product.id,
            productName: product.name,
            productCode: product.code,
            description: product.description,
            price: product.sellingPrice.toString(),
            gstRate: product.gstRate,
            unit: product.unit,
            availableStock: product.stock,
            hsnNumber: product.hsnNumber
        }));

        setProductSearchTerms(product.name);
        setShowProductSuggestions(false);
        setSelectedSuggestionIndex(-1);

        // Show description modal if product has description
        if (product.description) {
            setTempDescription(product.description);
            setTimeout(() => {
                setShowDescriptionModal(true);
            }, 100);
        }

        setTimeout(() => {
            isSelectingProductRef.current = false;
        }, 300);
    };

    // ✅ NEW: Handle form field changes in modal
    const handleTempFormChange = (field, value) => {
        setTempFormData(prev => {
            const updated = { ...prev, [field]: value };

            // Recalculate totals if quantity, price, or gstMode changes
            if (['quantity', 'price', 'gstMode', 'gstRate'].includes(field)) {
                calculateItemTotal(updated);
            }

            return updated;
        });
    };

    // Calculate total for temp form data
    const calculateItemTotal = (itemData) => {
        const quantity = parseFloat(itemData.quantity) || 0;
        const price = parseFloat(itemData.price) || 0;
        const gstRate = parseFloat(itemData.gstRate) || 0;

        let subtotal = quantity * price;
        let gstAmount = 0;
        let totalAmount = 0;

        if (formData.gstType === 'gst') {
            if (itemData.gstMode === 'include') {
                totalAmount = subtotal;
                gstAmount = (subtotal * gstRate) / (100 + gstRate);
                subtotal = totalAmount - gstAmount;
            } else {
                gstAmount = (subtotal * gstRate) / 100;
                totalAmount = subtotal + gstAmount;
            }
        } else {
            totalAmount = subtotal;
            gstAmount = 0;
        }

        itemData.subtotal = Math.round(subtotal * 100) / 100;
        itemData.gstAmount = Math.round(gstAmount * 100) / 100;
        itemData.totalAmount = Math.round(totalAmount * 100) / 100;
    };

    // ✅ NEW: Handle save and add another
    const handleSaveAndAdd = () => {
        if (!validateTempForm()) return;

        const currentItems = formData.items || [];
        const newItem = {
            ...tempFormData,
            id: currentEditingIndex !== null ? tempFormData.id : Date.now()
        };

        let updatedItems;
        if (currentEditingIndex !== null) {
            updatedItems = [...currentItems];
            updatedItems[currentEditingIndex] = newItem;
        } else {
            updatedItems = [...currentItems, newItem];
        }

        onFormDataChange('items', updatedItems);
        addToast?.('Product added successfully!', 'success');

        // Reset form for next product
        setTempFormData({
            selectedProduct: '',
            productName: '',
            productCode: '',
            description: '',
            quantity: '',
            price: '',
            unit: 'pcs',
            gstMode: 'exclude',
            gstRate: 18,
            subtotal: 0,
            gstAmount: 0,
            totalAmount: 0,
            availableStock: 0,
            hsnNumber: ''
        });
        setProductSearchTerms('');
        setCurrentEditingIndex(null);
    };

    // ✅ NEW: Handle save and exit
    const handleSaveAndExit = () => {
        if (!validateTempForm()) return;

        const currentItems = formData.items || [];
        const newItem = {
            ...tempFormData,
            id: currentEditingIndex !== null ? tempFormData.id : Date.now()
        };

        let updatedItems;
        if (currentEditingIndex !== null) {
            updatedItems = [...currentItems];
            updatedItems[currentEditingIndex] = newItem;
            addToast?.('Product updated successfully!', 'success');
        } else {
            updatedItems = [...currentItems, newItem];
            addToast?.('Product added successfully!', 'success');
        }

        onFormDataChange('items', updatedItems);
        setShowProductFormModal(false);
        setCurrentEditingIndex(null);
    };

    // ✅ NEW: Validate temp form
    const validateTempForm = () => {
        if (!tempFormData.productName?.trim()) {
            addToast?.('Please select or enter a product name', 'error');
            return false;
        }
        if (!tempFormData.quantity || parseFloat(tempFormData.quantity) <= 0) {
            addToast?.('Please enter a valid quantity', 'error');
            return false;
        }
        if (!tempFormData.price || parseFloat(tempFormData.price) <= 0) {
            addToast?.('Please enter a valid price', 'error');
            return false;
        }
        return true;
    };

    // ✅ NEW: Handle removing product from list
    const handleRemoveProduct = (index) => {
        const currentItems = formData.items || [];
        if (currentItems.length > 0) {
            const updatedItems = currentItems.filter((_, i) => i !== index);
            onFormDataChange('items', updatedItems);
            addToast?.('Product removed successfully!', 'success');
        }
    };

    // Handle description modal
    const handleDescriptionModalSave = () => {
        setTempFormData(prev => ({
            ...prev,
            description: tempDescription
        }));
        setShowDescriptionModal(false);
        setTempDescription('');
    };

    const handleDescriptionModalSkip = () => {
        setShowDescriptionModal(false);
        setTempDescription('');
    };

    // Handle "Add New Item" from suggestions
    const handleAddNewItemClick = (searchTerm) => {
        isSelectingProductRef.current = true;
        setQuickAddContext({
            type: 'item',
            searchTerm: searchTerm
        });
        setShowAddItemModal(true);
        setShowProductSuggestions(false);
        setSelectedSuggestionIndex(-1);
    };

    // Handle new item saved
    const handleNewItemSaved = (newItem) => {
        addToast?.('New item created successfully!', 'success');

        const formattedProduct = {
            id: newItem._id || newItem.id,
            name: newItem.name || newItem.itemName || 'New Product',
            code: newItem.itemCode || newItem.code || '',
            description: newItem.description || '',
            sellingPrice: parseFloat(newItem.salePrice || newItem.sellingPrice || newItem.price || 0),
            gstRate: parseFloat(newItem.gstRate || 18),
            unit: newItem.unit || 'pcs',
            stock: newItem.currentStock || newItem.stock || 0,
            hsnNumber: newItem.hsnNumber || ''
        };

        handleProductSelect(formattedProduct);
        setQuickAddContext(null);
        setShowAddItemModal(false);

        setTimeout(() => {
            isSelectingProductRef.current = false;
        }, 100);
    };

    const handleModalClose = () => {
        isSelectingProductRef.current = false;
        setQuickAddContext(null);
        setShowAddItemModal(false);
    };

    // Enhanced keyboard navigation for modal
    const handleModalKeyDown = (e) => {
        if (!showProductSuggestions) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const quantityInput = document.querySelector('[data-modal-quantity-input]');
                if (quantityInput) {
                    quantityInput.focus();
                    quantityInput.select();
                }
            }
            return;
        }

        const productList = products || [];
        const hasAddNewOption = productList.length === 0 && productSearchTerms?.length >= 2;
        const totalOptions = productList.length + (hasAddNewOption ? 1 : 0);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedSuggestionIndex(prev => Math.min((prev ?? -1) + 1, totalOptions - 1));
                break;

            case 'ArrowUp':
                e.preventDefault();
                setSelectedSuggestionIndex(prev => Math.max((prev ?? 0) - 1, -1));
                break;

            case 'Enter':
                e.preventDefault();
                const selectedIndex = selectedSuggestionIndex ?? -1;

                if (selectedIndex === -1) {
                    const quantityInput = document.querySelector('[data-modal-quantity-input]');
                    if (quantityInput) {
                        setShowProductSuggestions(false);
                        quantityInput.focus();
                        quantityInput.select();
                    }
                } else if (selectedIndex < productList.length) {
                    const selectedProduct = productList[selectedIndex];
                    if (selectedProduct) {
                        handleProductSelect(selectedProduct);
                    }
                } else if (hasAddNewOption && selectedIndex === productList.length) {
                    handleAddNewItemClick(productSearchTerms);
                }
                break;

            case 'Escape':
                e.preventDefault();
                setShowProductSuggestions(false);
                setSelectedSuggestionIndex(-1);
                break;
        }
    };

    const items = formData.items || [];

    return (
        <>
            <div className="order-form-product-section">
                {/* ✅ FIXED: Add Product Button - Always visible */}
                <div className="mb-4">
                    <Row>
                        <Col md={8}>
                            <Button
                                variant="primary"
                                size="lg"
                                onClick={handleAddProductClick}
                                disabled={disabled}
                                className="w-100"
                                style={{
                                    backgroundColor: '#007bff',
                                    borderColor: '#000',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    padding: '12px 24px',
                                    borderWidth: '2px'
                                }}
                            >
                                <FontAwesomeIcon icon={faPlus} className="me-2" />
                                Add Product
                            </Button>
                        </Col>
                        {/* ✅ FIXED: Only show product count if there are valid products */}
                        {items.length > 0 && items.some(item => item.productName) && (
                            <Col md={4}>
                                <div className="text-center text-muted d-flex align-items-center justify-content-center h-100">
                                    <div>
                                        <FontAwesomeIcon icon={faShoppingCart} className="me-2" />
                                        <strong>{items.filter(item => item.productName).length}</strong> {items.filter(item => item.productName).length === 1 ? 'Product' : 'Products'} Added
                                    </div>
                                </div>
                            </Col>
                        )}
                    </Row>
                </div>

                {/* ✅ FIXED: Only show products table if there are valid items with product names */}
                {items.length > 0 && items.some(item => item.productName) && (
                    <Card className="mb-4 border-2" style={{ borderColor: '#000' }}>
                        <Card.Header className="bg-light border-bottom-2" style={{ borderBottomColor: '#000' }}>
                            <h5 className="mb-0">
                                <FontAwesomeIcon icon={faShoppingCart} className="me-2" />
                                Added Products ({items.filter(item => item.productName).length})
                            </h5>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Table responsive hover className="mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th style={{ fontSize: '13px', fontWeight: 'bold', padding: '12px' }}>#</th>
                                        <th style={{ fontSize: '13px', fontWeight: 'bold', padding: '12px' }}>Product</th>
                                        <th style={{ fontSize: '13px', fontWeight: 'bold', padding: '12px' }}>Qty</th>
                                        <th style={{ fontSize: '13px', fontWeight: 'bold', padding: '12px' }}>Price</th>
                                        <th style={{ fontSize: '13px', fontWeight: 'bold', padding: '12px' }}>GST</th>
                                        <th style={{ fontSize: '13px', fontWeight: 'bold', padding: '12px' }}>Total</th>
                                        <th style={{ fontSize: '13px', fontWeight: 'bold', padding: '12px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.filter(item => item.productName).map((item, index) => (
                                        <tr key={item.id || index}>
                                            <td style={{ padding: '12px', fontSize: '13px' }}>
                                                {index + 1}
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px' }}>
                                                <div>
                                                    <strong>{item.productName}</strong>
                                                    {item.productCode && (
                                                        <Badge bg="secondary" className="ms-2" style={{ fontSize: '10px' }}>
                                                            {item.productCode}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {item.description && (
                                                    <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                                                        {item.description.length > 50
                                                            ? `${item.description.substring(0, 50)}...`
                                                            : item.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px' }}>
                                                {item.quantity} {item.unit}
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px' }}>
                                                <div>
                                                    <Badge bg="primary" text="white" style={{ fontSize: '10px' }}>
                                                        Sale
                                                    </Badge>
                                                    <div className="fw-bold text-primary">
                                                        ₹{parseFloat(item.price || 0).toFixed(2)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px' }}>
                                                {formData.gstType === 'gst' ? (
                                                    <div>
                                                        <Badge
                                                            bg={item.gstMode === 'include' ? 'success' : 'warning'}
                                                            style={{ fontSize: '10px' }}
                                                        >
                                                            {item.gstMode === 'include' ? 'Inc' : 'Exc'}
                                                        </Badge>
                                                        <div style={{ fontSize: '11px' }}>
                                                            ₹{(item.gstAmount || 0).toFixed(2)}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Badge bg="secondary" style={{ fontSize: '10px' }}>
                                                        No GST
                                                    </Badge>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px' }}>
                                                <strong className="text-success">
                                                    ₹{(item.totalAmount || 0).toFixed(2)}
                                                </strong>
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px' }}>
                                                <div className="d-flex gap-2">
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => handleEditProduct(items.indexOf(item))}
                                                        disabled={disabled}
                                                        title="Edit product"
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => handleRemoveProduct(items.indexOf(item))}
                                                        disabled={disabled}
                                                        title="Remove product"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                )}

                {/* ✅ FIXED: Only show description section if there are valid products */}
                {items.length > 0 && items.some(item => item.productName) && (
                    <Card className="mb-3 border-2" style={{ borderColor: '#000' }}>
                        <Card.Body>
                            <Form.Group>
                                <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>
                                    Invoice Description
                                </Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    value={formData.invoiceDescription || ''}
                                    onChange={(e) => onFormDataChange('invoiceDescription', e.target.value)}
                                    style={inputStyle}
                                    placeholder="Enter invoice description or terms & conditions..."
                                    disabled={disabled}
                                />
                                <Form.Text className="text-muted" style={{ fontSize: '12px' }}>
                                    This description will appear on the invoice
                                </Form.Text>
                            </Form.Group>
                        </Card.Body>
                    </Card>
                )}

                {/* ✅ ENHANCED: Show helpful message when no valid products are added */}
                {(!items.length || !items.some(item => item.productName)) && (
                    <div className="text-center text-muted py-5">
                        <FontAwesomeIcon icon={faBoxOpen} size="3x" className="mb-3 opacity-50" />
                        <h5 className="text-muted">No Products Added Yet</h5>
                        <p className="text-muted">
                            Click the "Add Product" button above to start adding products to your sales order.
                        </p>
                    </div>
                )}
            </div>

            {/* ✅ NEW: Product Form Modal */}
            <Modal
                show={showProductFormModal}
                onHide={() => setShowProductFormModal(false)}
                size="lg"
                centered
                backdrop="static"
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        {currentEditingIndex !== null ? 'Edit Product' : 'Add Product'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Row>
                        {/* Product Selection */}
                        <Col md={6}>
                            <Form.Group className="mb-3 position-relative">
                                <Form.Label className="fw-bold text-danger">
                                    Select Product *
                                    {tempFormData.selectedProduct && (
                                        <Badge bg="success" className="ms-2">
                                            <FontAwesomeIcon icon={faCheck} className="me-1" />
                                            Selected
                                        </Badge>
                                    )}
                                </Form.Label>
                                <div className="position-relative">
                                    <Form.Control
                                        type="text"
                                        value={productSearchTerms || ''}
                                        onChange={(e) => handleProductSearchChange(e.target.value)}
                                        onKeyDown={handleModalKeyDown}
                                        style={{
                                            ...inputStyle,
                                            paddingLeft: '40px',
                                            backgroundColor: tempFormData.selectedProduct ? '#e8f5e8' : 'white',
                                            color: tempFormData.selectedProduct ? '#155724' : 'inherit',
                                            fontWeight: tempFormData.selectedProduct ? 'bold' : 'normal'
                                        }}
                                        placeholder="Search product..."
                                    />

                                    {isLoadingProducts && (
                                        <div className="position-absolute" style={{
                                            top: '50%',
                                            right: '12px',
                                            transform: 'translateY(-50%)',
                                            zIndex: 10
                                        }}>
                                            <Spinner size="sm" />
                                        </div>
                                    )}

                                    <div className="position-absolute" style={{
                                        top: '50%',
                                        left: '12px',
                                        transform: 'translateY(-50%)',
                                        zIndex: 5
                                    }}>
                                        <FontAwesomeIcon
                                            icon={tempFormData.selectedProduct ? faCheck : faBox}
                                            className={tempFormData.selectedProduct ? 'text-success' : 'text-muted'}
                                            style={{ fontSize: '16px' }}
                                        />
                                    </div>

                                    {/* Product Suggestions */}
                                    {showProductSuggestions && !tempFormData.selectedProduct && (
                                        <div
                                            className="position-absolute w-100 bg-white border rounded shadow-lg"
                                            style={{
                                                zIndex: 9999,
                                                maxHeight: '200px',
                                                overflowY: 'auto',
                                                top: '100%',
                                                left: 0,
                                                right: 0,
                                                marginTop: '2px'
                                            }}
                                        >
                                            {products && products.length > 0 && (
                                                <>
                                                    {products.slice(0, 5).map((product, productIndex) => (
                                                        <div
                                                            key={product.id}
                                                            className={`p-2 border-bottom cursor-pointer ${selectedSuggestionIndex === productIndex ? 'bg-primary text-white' : ''}`}
                                                            style={{ cursor: 'pointer' }}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                handleProductSelect(product);
                                                            }}
                                                            onMouseEnter={() => setSelectedSuggestionIndex(productIndex)}
                                                        >
                                                            <div className="fw-bold">{product.name}</div>
                                                            <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                                                <span className="text-primary fw-bold">Sale: ₹{product.sellingPrice.toFixed(2)}</span>
                                                                <span className="ms-2 text-warning">Purchase: ₹{product.purchasePrice.toFixed(2)}</span>
                                                                <span className="ms-2 text-info">Stock: {product.stock}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </>
                                            )}

                                            {((products && products.length === 0) || !products) &&
                                                productSearchTerms &&
                                                productSearchTerms.length >= 2 &&
                                                !isLoadingProducts && (
                                                    <div
                                                        className="p-2 cursor-pointer bg-success bg-opacity-10"
                                                        style={{ cursor: 'pointer' }}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            handleAddNewItemClick(productSearchTerms);
                                                        }}
                                                    >
                                                        <FontAwesomeIcon icon={faPlus} className="text-success me-2" />
                                                        Add "{productSearchTerms}"
                                                    </div>
                                                )}
                                        </div>
                                    )}
                                </div>
                            </Form.Group>
                        </Col>

                        {/* Quantity */}
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold text-danger">Quantity *</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={tempFormData.quantity || ''}
                                    onChange={(e) => handleTempFormChange('quantity', e.target.value)}
                                    style={inputStyle}
                                    placeholder="0"
                                    min="0"
                                    step="0.01"
                                    data-modal-quantity-input
                                />
                                {tempFormData.unit && (
                                    <Form.Text className="text-muted">
                                        Unit: {tempFormData.unit}
                                    </Form.Text>
                                )}
                            </Form.Group>
                        </Col>

                        {/* Price */}
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold text-danger">
                                    Sale Price *
                                    <Badge bg="primary" text="white" className="ms-2" style={{ fontSize: '10px' }}>
                                        Sale
                                    </Badge>
                                </Form.Label>
                                <div className="input-group">
                                    <span className="input-group-text" style={{
                                        ...inputStyle,
                                        borderRight: 'none',
                                        backgroundColor: '#cce5ff',
                                        color: '#0066cc',
                                        fontWeight: 'bold'
                                    }}>
                                        <FontAwesomeIcon icon={faRupeeSign} />
                                    </span>
                                    <Form.Control
                                        type="number"
                                        value={tempFormData.price || ''}
                                        onChange={(e) => handleTempFormChange('price', e.target.value)}
                                        style={{
                                            ...inputStyle,
                                            borderLeft: 'none',
                                            backgroundColor: '#cce5ff',
                                            color: '#0066cc',
                                            fontWeight: 'bold'
                                        }}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <Form.Text className="text-primary" style={{ fontSize: '12px' }}>
                                    💰 Sale price for this order
                                </Form.Text>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        {/* GST Mode */}
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold">GST Mode</Form.Label>
                                <Form.Select
                                    value={tempFormData.gstMode || 'exclude'}
                                    onChange={(e) => handleTempFormChange('gstMode', e.target.value)}
                                    style={{
                                        ...inputStyle,
                                        backgroundColor: formData.gstType === 'gst' ? '#FFD700' : '#f8f9fa',
                                        opacity: formData.gstType === 'non-gst' ? 0.6 : 1
                                    }}
                                    disabled={formData.gstType === 'non-gst'}
                                >
                                    <option value="include">GST Include</option>
                                    <option value="exclude">GST Exclude</option>
                                </Form.Select>
                                <Form.Text className="text-muted">
                                    Rate: {formData.gstType === 'gst' ? `${tempFormData.gstRate || 18}%` : 'No GST'}
                                </Form.Text>
                            </Form.Group>
                        </Col>

                        {/* Description */}
                        <Col md={8}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold">
                                    Description
                                </Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    value={tempFormData.description || ''}
                                    onChange={(e) => handleTempFormChange('description', e.target.value)}
                                    style={inputStyle}
                                    placeholder="Enter product description..."
                                />
                                <Form.Text className="text-muted" style={{ fontSize: '12px' }}>
                                    Optional: Add product details, specifications, or notes
                                </Form.Text>
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Product Info Display */}
                    {tempFormData.selectedProduct && (
                        <Alert variant="success" className="mb-3">
                            <Row>
                                <Col md={3}>
                                    <strong>Code:</strong> {tempFormData.productCode || 'N/A'}
                                </Col>
                                <Col md={3}>
                                    <strong>Stock:</strong> {tempFormData.availableStock} {tempFormData.unit}
                                </Col>
                                <Col md={3}>
                                    <strong>GST:</strong> ₹{(tempFormData.gstAmount || 0).toFixed(2)}
                                </Col>
                                <Col md={3}>
                                    <strong>Subtotal:</strong> ₹{(tempFormData.subtotal || 0).toFixed(2)}
                                </Col>
                            </Row>
                            {tempFormData.hsnNumber && (
                                <div className="mt-2">
                                    <strong>HSN:</strong> {tempFormData.hsnNumber}
                                </div>
                            )}
                        </Alert>
                    )}

                    {/* Total Display */}
                    <div className="text-center mb-3">
                        <h4 className="text-success">
                            Total: ₹{(tempFormData.totalAmount || 0).toFixed(2)}
                        </h4>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="outline-secondary"
                        onClick={() => setShowProductFormModal(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="success"
                        onClick={handleSaveAndAdd}
                        disabled={!tempFormData.productName || !tempFormData.quantity || !tempFormData.price}
                    >
                        <FontAwesomeIcon icon={faPlus} className="me-2" />
                        Save & Add Another
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSaveAndExit}
                        disabled={!tempFormData.productName || !tempFormData.quantity || !tempFormData.price}
                    >
                        <FontAwesomeIcon icon={faSave} className="me-2" />
                        Save & Exit
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Description Modal */}
            <Modal
                show={showDescriptionModal}
                onHide={handleDescriptionModalSkip}
                centered
                backdrop="static"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Product Description</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label className="fw-bold">
                            Description for: <span className="text-primary">{tempFormData.productName}</span>
                        </Form.Label>
                        <Form.Control
                            ref={descriptionTextareaRef}
                            as="textarea"
                            rows={4}
                            value={tempDescription}
                            onChange={(e) => setTempDescription(e.target.value)}
                            style={inputStyle}
                            placeholder="Enter product description (optional)..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.ctrlKey) {
                                    e.preventDefault();
                                    handleDescriptionModalSave();
                                } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleDescriptionModalSkip();
                                }
                            }}
                        />
                        <Form.Text className="text-muted">
                            Press Ctrl+Enter to save, Escape to skip
                        </Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="outline-secondary" onClick={handleDescriptionModalSkip}>
                        <FontAwesomeIcon icon={faTimes} className="me-2" />
                        Skip
                    </Button>
                    <Button variant="primary" onClick={handleDescriptionModalSave}>
                        <FontAwesomeIcon icon={faCheck} className="me-2" />
                        Save & Continue
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Add New Item Modal */}
            {showAddItemModal && (
                <ProductModal
                    show={showAddItemModal}
                    onHide={handleModalClose}
                    onSaveProduct={handleNewItemSaved}
                    companyId={companyId}
                    currentUser={currentUser}
                    currentCompany={{ id: companyId, companyName: 'Current Company' }}
                    formData={{
                        name: quickAddContext?.searchTerm || '',
                        type: 'product',
                        unit: 'PCS',
                        gstRate: 18,
                        category: '',
                        description: '',
                        salePrice: '',
                        buyPrice: '',
                        currentStock: '',
                        minStockLevel: '',
                        hsnNumber: '',
                        itemCode: '',
                        isActive: true
                    }}
                    categories={[
                        { id: 1, name: 'Electronics' },
                        { id: 2, name: 'Furniture' },
                        { id: 3, name: 'Stationery' },
                        { id: 4, name: 'Other' }
                    ]}
                    onInputChange={() => { }}
                    mode="add"
                    type="product"
                />
            )}
        </>
    );
}

export default OrderFormProductSection;