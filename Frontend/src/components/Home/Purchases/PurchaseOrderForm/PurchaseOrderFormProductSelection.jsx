import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Form, Button, Spinner, Alert, Card, Modal, Table, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faBox, faRupeeSign, faBoxOpen, faCheck, faEdit, faTimes, faShoppingCart, faSave, faEye } from '@fortawesome/free-solid-svg-icons';
import itemService from '../../../../services/itemService';
import ProductModal from '../../Inventory/ProductModal';

function PurchaseOrderFormProductSelection({
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

    // Main product form modal state
    const [showProductFormModal, setShowProductFormModal] = useState(false);
    const [currentEditingIndex, setCurrentEditingIndex] = useState(null);
    const [tempFormData, setTempFormData] = useState({
        selectedProduct: '',
        productName: '',
        productCode: '',
        description: '',
        quantity: '',
        price: '',
        purchasePrice: '',
        sellingPrice: '',
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

    // Theme-consistent styling
    const inputStyle = {
        borderColor: '#000',
        fontSize: '13px',
        padding: '10px 14px',
        height: '42px',
        borderWidth: '2px',
        borderRadius: '8px',
        fontWeight: '500'
    };

    const cardStyle = {
        border: '3px solid #000',
        borderRadius: '12px',
        backgroundColor: 'white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
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
                    purchasePrice: parseFloat(
                        item.buyPrice ||
                        item.purchasePrice ||
                        item.costPrice ||
                        item.cost ||
                        item.purchaseRate ||
                        item.buyingPrice ||
                        item.salePrice ||
                        item.sellingPrice ||
                        item.price ||
                        0
                    ),
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

    // Handle opening product form modal
    const handleAddProductClick = () => {
        setCurrentEditingIndex(null);
        setTempFormData({
            selectedProduct: '',
            productName: '',
            productCode: '',
            description: '',
            quantity: '',
            price: '',
            purchasePrice: '',
            sellingPrice: '',
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

    // Handle editing existing product
    const handleEditProduct = (index) => {
        const item = formData.items[index];
        setCurrentEditingIndex(index);
        setTempFormData({ ...item });
        setProductSearchTerms(item.productName || '');
        setShowProductFormModal(true);
    };

    // Handle product search in modal
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
                    purchasePrice: '',
                    sellingPrice: '',
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

    // Handle product selection in modal
    const handleProductSelect = (product) => {
        isSelectingProductRef.current = true;

        setTempFormData(prev => ({
            ...prev,
            selectedProduct: product.id,
            productName: product.name,
            productCode: product.code,
            description: product.description,
            price: product.purchasePrice.toString(),
            purchasePrice: product.purchasePrice.toString(),
            sellingPrice: product.sellingPrice.toString(),
            gstRate: product.gstRate,
            unit: product.unit,
            availableStock: product.stock,
            hsnNumber: product.hsnNumber
        }));

        setProductSearchTerms(product.name);
        setShowProductSuggestions(false);
        setSelectedSuggestionIndex(-1);

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

    // Handle form field changes in modal
    const handleTempFormChange = (field, value) => {
        setTempFormData(prev => {
            const updated = { ...prev, [field]: value };

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

    // Handle save and add another
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

        // Reset form for next product
        setTempFormData({
            selectedProduct: '',
            productName: '',
            productCode: '',
            description: '',
            quantity: '',
            price: '',
            purchasePrice: '',
            sellingPrice: '',
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

    // Handle save and exit
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
        } else {
            updatedItems = [...currentItems, newItem];
        }

        onFormDataChange('items', updatedItems);
        setShowProductFormModal(false);
        setCurrentEditingIndex(null);
    };

    // Validate temp form
    const validateTempForm = () => {
        if (!tempFormData.productName?.trim()) {
            return false;
        }
        if (!tempFormData.quantity || parseFloat(tempFormData.quantity) <= 0) {
            return false;
        }
        if (!tempFormData.price || parseFloat(tempFormData.price) <= 0) {
            return false;
        }
        return true;
    };

    // Handle removing product from list
    const handleRemoveProduct = (index) => {
        const currentItems = formData.items || [];
        if (currentItems.length > 0) {
            const updatedItems = currentItems.filter((_, i) => i !== index);
            onFormDataChange('items', updatedItems);
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
        const formattedProduct = {
            id: newItem._id || newItem.id,
            name: newItem.name || newItem.itemName || 'New Product',
            code: newItem.itemCode || newItem.code || '',
            description: newItem.description || '',
            sellingPrice: parseFloat(newItem.salePrice || newItem.sellingPrice || newItem.price || 0),
            purchasePrice: parseFloat(newItem.buyPrice || newItem.purchasePrice || newItem.cost || 0),
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
            <div className="purchase-order-form-product-section">
                {/* Header Section with Add Button */}
                <Card className="mb-4" style={cardStyle}>
                    <Card.Header className="bg-light border-bottom-3" style={{ borderBottomColor: '#000', padding: '15px 20px' }}>
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                                <FontAwesomeIcon icon={faShoppingCart} className="me-3 text-primary" size="lg" />
                                <div>
                                    <h5 className="mb-0 fw-bold text-dark">Purchase Products</h5>
                                    {items.length > 0 && items.some(item => item.productName) && (
                                        <small className="text-muted">
                                            {items.filter(item => item.productName).length} product{items.filter(item => item.productName).length !== 1 ? 's' : ''} added
                                        </small>
                                    )}
                                </div>
                            </div>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleAddProductClick}
                                disabled={disabled}
                                style={{
                                    backgroundColor: '#007bff',
                                    borderColor: '#000',
                                    color: 'white',
                                    fontSize: '13px',
                                    fontWeight: 'bold',
                                    padding: '8px 16px',
                                    borderWidth: '2px',
                                    borderRadius: '8px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                            >
                                <FontAwesomeIcon icon={faPlus} className="me-2" />
                                Add Product
                            </Button>
                        </div>
                    </Card.Header>

                    {/* Products Table or Empty State */}
                    <Card.Body className="p-0">
                        {items.length > 0 && items.some(item => item.productName) ? (
                            <Table responsive hover className="mb-0">
                                <thead className="bg-light border-bottom-2" style={{ borderBottomColor: '#000' }}>
                                    <tr>
                                        <th style={{ fontSize: '13px', fontWeight: 'bold', padding: '12px', borderColor: '#000' }}>#</th>
                                        <th style={{ fontSize: '13px', fontWeight: 'bold', padding: '12px', borderColor: '#000' }}>Product Details</th>
                                        <th style={{ fontSize: '13px', fontWeight: 'bold', padding: '12px', borderColor: '#000' }}>Quantity</th>
                                        <th style={{ fontSize: '13px', fontWeight: 'bold', padding: '12px', borderColor: '#000' }}>Purchase Price</th>
                                        <th style={{ fontSize: '13px', fontWeight: 'bold', padding: '12px', borderColor: '#000' }}>GST</th>
                                        <th style={{ fontSize: '13px', fontWeight: 'bold', padding: '12px', borderColor: '#000' }}>Total</th>
                                        <th style={{ fontSize: '13px', fontWeight: 'bold', padding: '12px', borderColor: '#000' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.filter(item => item.productName).map((item, index) => (
                                        <tr key={item.id || index} style={{ borderColor: '#000' }}>
                                            <td style={{ padding: '12px', fontSize: '13px', borderColor: '#000' }}>
                                                <Badge bg="secondary" style={{ fontSize: '11px' }}>
                                                    {index + 1}
                                                </Badge>
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px', borderColor: '#000' }}>
                                                <div>
                                                    <div className="fw-bold text-dark">{item.productName}</div>
                                                    {item.productCode && (
                                                        <Badge bg="info" className="me-2" style={{ fontSize: '10px' }}>
                                                            {item.productCode}
                                                        </Badge>
                                                    )}
                                                    {item.unit && (
                                                        <Badge bg="secondary" style={{ fontSize: '10px' }}>
                                                            {item.unit}
                                                        </Badge>
                                                    )}
                                                    {item.description && (
                                                        <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                                                            {item.description.length > 50
                                                                ? `${item.description.substring(0, 50)}...`
                                                                : item.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px', borderColor: '#000' }}>
                                                <div className="text-center">
                                                    <div className="fw-bold text-primary" style={{ fontSize: '14px' }}>
                                                        {item.quantity}
                                                    </div>
                                                    <small className="text-muted">{item.unit || 'pcs'}</small>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px', borderColor: '#000' }}>
                                                <div className="text-center">
                                                    <Badge bg="warning" text="dark" className="mb-1" style={{ fontSize: '10px' }}>
                                                        Purchase
                                                    </Badge>
                                                    <div className="fw-bold text-warning">
                                                        ₹{parseFloat(item.price || 0).toFixed(2)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px', borderColor: '#000' }}>
                                                <div className="text-center">
                                                    {formData.gstType === 'gst' ? (
                                                        <>
                                                            <Badge
                                                                bg={item.gstMode === 'include' ? 'success' : 'warning'}
                                                                className="mb-1"
                                                                style={{ fontSize: '10px' }}
                                                            >
                                                                {item.gstMode === 'include' ? 'Inc' : 'Exc'} {item.gstRate}%
                                                            </Badge>
                                                            <div className="fw-bold text-success">
                                                                ₹{(item.gstAmount || 0).toFixed(2)}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <Badge bg="secondary" style={{ fontSize: '10px' }}>
                                                            No GST
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px', borderColor: '#000' }}>
                                                <div className="text-center">
                                                    <div className="fw-bold text-success" style={{ fontSize: '15px' }}>
                                                        ₹{(item.totalAmount || 0).toFixed(2)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '13px', borderColor: '#000' }}>
                                                <div className="d-flex gap-1 justify-content-center">
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => handleEditProduct(items.indexOf(item))}
                                                        disabled={disabled}
                                                        title="Edit product"
                                                        style={{
                                                            borderWidth: '2px',
                                                            fontSize: '11px',
                                                            padding: '4px 8px'
                                                        }}
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => handleRemoveProduct(items.indexOf(item))}
                                                        disabled={disabled}
                                                        title="Remove product"
                                                        style={{
                                                            borderWidth: '2px',
                                                            fontSize: '11px',
                                                            padding: '4px 8px'
                                                        }}
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        ) : (
                            <div className="text-center text-muted py-5">
                                <FontAwesomeIcon icon={faBoxOpen} size="3x" className="mb-3 opacity-50" />
                                <h5 className="text-muted mb-2">No Products Added Yet</h5>
                                <p className="text-muted">
                                    Click the "Add Product" button above to start adding products to your purchase order.
                                </p>
                            </div>
                        )}
                    </Card.Body>
                </Card>

                {/* Description Section - Only show if there are products */}
                {items.length > 0 && items.some(item => item.productName) && (
                    <Card className="mb-3" style={cardStyle}>
                        <Card.Body className="p-4">
                            <Form.Group>
                                <Form.Label className="d-flex align-items-center fw-bold" style={{ fontSize: '14px', color: '#2c3e50' }}>
                                    <FontAwesomeIcon icon={faEdit} className="me-2 text-primary" />
                                    Purchase Order Description
                                </Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={formData.purchaseDescription || ''}
                                    onChange={(e) => onFormDataChange('purchaseDescription', e.target.value)}
                                    style={inputStyle}
                                    placeholder="Enter purchase order description, terms & conditions..."
                                    disabled={disabled}
                                />
                                <Form.Text className="text-muted fw-bold" style={{ fontSize: '12px' }}>
                                    📝 This description will appear on the purchase order document
                                </Form.Text>
                            </Form.Group>
                        </Card.Body>
                    </Card>
                )}
            </div>

            {/* Product Form Modal */}
            <Modal
                show={showProductFormModal}
                onHide={() => setShowProductFormModal(false)}
                size="lg"
                centered
                backdrop="static"
            >
                <Modal.Header
                    closeButton
                    className="border-bottom-3"
                    style={{
                        borderBottomColor: '#000',
                        backgroundColor: '#f8f9fa'
                    }}
                >
                    <Modal.Title className="fw-bold">
                        <FontAwesomeIcon
                            icon={currentEditingIndex !== null ? faEdit : faPlus}
                            className="me-2 text-primary"
                        />
                        {currentEditingIndex !== null ? 'Edit Purchase Product' : 'Add Purchase Product'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Row>
                        {/* Product Selection */}
                        <Col md={6}>
                            <Form.Group className="mb-3 position-relative">
                                <Form.Label className="fw-bold text-danger d-flex align-items-center" style={{ fontSize: '14px' }}>
                                    <FontAwesomeIcon icon={faBox} className="me-2" />
                                    Select Product *
                                    {tempFormData.selectedProduct && (
                                        <Badge bg="success" className="ms-2" style={{ fontSize: '10px' }}>
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
                                        placeholder="🔍 Search product..."
                                    />

                                    {isLoadingProducts && (
                                        <div className="position-absolute" style={{
                                            top: '50%',
                                            right: '12px',
                                            transform: 'translateY(-50%)',
                                            zIndex: 10
                                        }}>
                                            <Spinner size="sm" className="text-primary" />
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
                                            className="position-absolute w-100 bg-white border-3 rounded-3 mt-2 shadow-lg"
                                            style={{
                                                zIndex: 9999,
                                                maxHeight: '200px',
                                                overflowY: 'auto',
                                                borderColor: '#000'
                                            }}
                                        >
                                            {products && products.length > 0 && (
                                                <>
                                                    {products.slice(0, 5).map((product, productIndex) => (
                                                        <div
                                                            key={product.id}
                                                            className={`p-3 border-bottom cursor-pointer ${selectedSuggestionIndex === productIndex ? 'bg-primary text-white' : 'hover-bg-light'}`}
                                                            style={{
                                                                fontSize: '13px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                handleProductSelect(product);
                                                            }}
                                                            onMouseEnter={() => setSelectedSuggestionIndex(productIndex)}
                                                        >
                                                            <div className={`fw-bold mb-1 ${selectedSuggestionIndex === productIndex ? 'text-white' : 'text-primary'}`} style={{ fontSize: '14px' }}>
                                                                📦 {product.name}
                                                            </div>
                                                            <div className={selectedSuggestionIndex === productIndex ? 'text-light' : 'text-muted'} style={{ fontSize: '12px' }}>
                                                                <span className="me-3">💰 Purchase: ₹{product.purchasePrice.toFixed(2)}</span>
                                                                <span className="me-3">📊 Stock: {product.stock}</span>
                                                                {product.code && <span>🏷️ {product.code}</span>}
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
                                                        className="p-3 cursor-pointer bg-success bg-opacity-10 border-top-3"
                                                        style={{
                                                            fontSize: '13px',
                                                            cursor: 'pointer',
                                                            borderTopColor: '#000'
                                                        }}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            handleAddNewItemClick(productSearchTerms);
                                                        }}
                                                    >
                                                        <div className="text-center">
                                                            <FontAwesomeIcon icon={faPlus} className="text-success me-2" />
                                                            <span className="fw-bold text-success">
                                                                ➕ Add "{productSearchTerms}" as new product
                                                            </span>
                                                        </div>
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
                                <Form.Label className="fw-bold text-danger d-flex align-items-center" style={{ fontSize: '14px' }}>
                                    📊 Quantity *
                                </Form.Label>
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
                                    <Form.Text className="text-muted fw-bold" style={{ fontSize: '12px' }}>
                                        📦 Unit: {tempFormData.unit}
                                    </Form.Text>
                                )}
                            </Form.Group>
                        </Col>

                        {/* Purchase Price */}
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold text-danger d-flex align-items-center" style={{ fontSize: '14px' }}>
                                    💰 Purchase Price *
                                    <Badge bg="warning" text="dark" className="ms-2" style={{ fontSize: '10px' }}>
                                        Purchase
                                    </Badge>
                                </Form.Label>
                                <div className="input-group">
                                    <span className="input-group-text" style={{
                                        ...inputStyle,
                                        borderRight: 'none',
                                        backgroundColor: '#fff3cd',
                                        color: '#856404',
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
                                            backgroundColor: '#fff3cd',
                                            color: '#856404',
                                            fontWeight: 'bold'
                                        }}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <Form.Text className="text-warning fw-bold" style={{ fontSize: '12px' }}>
                                    💰 Purchase price for this order
                                </Form.Text>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        {/* GST Mode */}
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold d-flex align-items-center" style={{ fontSize: '14px', color: '#2c3e50' }}>
                                    🏷️ GST Mode
                                </Form.Label>
                                <Form.Select
                                    value={tempFormData.gstMode || 'exclude'}
                                    onChange={(e) => handleTempFormChange('gstMode', e.target.value)}
                                    style={{
                                        ...inputStyle,
                                        backgroundColor: formData.gstType === 'gst' ? '#e8f5e8' : '#f8f9fa',
                                        opacity: formData.gstType === 'non-gst' ? 0.6 : 1
                                    }}
                                    disabled={formData.gstType === 'non-gst'}
                                >
                                    <option value="include">✅ GST Include</option>
                                    <option value="exclude">❌ GST Exclude</option>
                                </Form.Select>
                                <Form.Text className="text-muted fw-bold" style={{ fontSize: '12px' }}>
                                    🏷️ Rate: {formData.gstType === 'gst' ? `${tempFormData.gstRate || 18}%` : 'No GST'}
                                </Form.Text>
                            </Form.Group>
                        </Col>

                        {/* Description */}
                        <Col md={8}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold d-flex align-items-center" style={{ fontSize: '14px', color: '#2c3e50' }}>
                                    <FontAwesomeIcon icon={faEdit} className="me-2" />
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
                                <Form.Text className="text-muted fw-bold" style={{ fontSize: '12px' }}>
                                    📝 Optional: Add product details, specifications, or notes
                                </Form.Text>
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Product Info Display */}
                    {tempFormData.selectedProduct && (
                        <Alert variant="info" className="mb-3" style={{ borderColor: '#000', borderWidth: '2px' }}>
                            <Row>
                                <Col md={3}>
                                    <strong>🏷️ Code:</strong> {tempFormData.productCode || 'N/A'}
                                </Col>
                                <Col md={3}>
                                    <strong>📦 Stock:</strong> {tempFormData.availableStock} {tempFormData.unit}
                                </Col>
                                <Col md={3}>
                                    <strong>💰 Purchase:</strong> ₹{parseFloat(tempFormData.purchasePrice || tempFormData.price || 0).toFixed(2)}
                                </Col>
                                <Col md={3}>
                                    <strong>💵 Selling:</strong> ₹{parseFloat(tempFormData.sellingPrice || 0).toFixed(2)}
                                </Col>
                            </Row>
                            <Row className="mt-2">
                                <Col md={4}>
                                    <strong>🏷️ GST:</strong> ₹{(tempFormData.gstAmount || 0).toFixed(2)}
                                </Col>
                                <Col md={4}>
                                    <strong>📊 Subtotal:</strong> ₹{(tempFormData.subtotal || 0).toFixed(2)}
                                </Col>
                                {tempFormData.hsnNumber && (
                                    <Col md={4}>
                                        <strong>🔢 HSN:</strong> {tempFormData.hsnNumber}
                                    </Col>
                                )}
                            </Row>
                        </Alert>
                    )}

                    {/* Total Display */}
                    <div className="text-center mb-3 p-3 bg-success bg-opacity-10 rounded-3" style={{ border: '2px solid #28a745' }}>
                        <h4 className="text-success fw-bold mb-0">
                            💰 Total: ₹{(tempFormData.totalAmount || 0).toFixed(2)}
                        </h4>
                    </div>
                </Modal.Body>
                <Modal.Footer className="border-top-3" style={{ borderTopColor: '#000' }}>
                    <Button
                        variant="outline-secondary"
                        onClick={() => setShowProductFormModal(false)}
                        style={{
                            borderWidth: '2px',
                            fontWeight: 'bold'
                        }}
                    >
                        <FontAwesomeIcon icon={faTimes} className="me-2" />
                        Cancel
                    </Button>
                    <Button
                        variant="success"
                        onClick={handleSaveAndAdd}
                        disabled={!tempFormData.productName || !tempFormData.quantity || !tempFormData.price}
                        style={{
                            borderWidth: '2px',
                            fontWeight: 'bold'
                        }}
                    >
                        <FontAwesomeIcon icon={faPlus} className="me-2" />
                        Save & Add Another
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSaveAndExit}
                        disabled={!tempFormData.productName || !tempFormData.quantity || !tempFormData.price}
                        style={{
                            borderWidth: '2px',
                            fontWeight: 'bold'
                        }}
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
                <Modal.Header closeButton className="border-bottom-3" style={{ borderBottomColor: '#000' }}>
                    <Modal.Title className="fw-bold">
                        <FontAwesomeIcon icon={faEdit} className="me-2 text-primary" />
                        Product Description
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Form.Group>
                        <Form.Label className="fw-bold d-flex align-items-center" style={{ fontSize: '14px' }}>
                            📝 Description for: <span className="text-primary ms-2">{tempFormData.productName}</span>
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
                        <Form.Text className="text-muted fw-bold" style={{ fontSize: '12px' }}>
                            ⌨️ Press Ctrl+Enter to save, Escape to skip
                        </Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="border-top-3" style={{ borderTopColor: '#000' }}>
                    <Button
                        variant="outline-secondary"
                        onClick={handleDescriptionModalSkip}
                        style={{ borderWidth: '2px', fontWeight: 'bold' }}
                    >
                        <FontAwesomeIcon icon={faTimes} className="me-2" />
                        Skip
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleDescriptionModalSave}
                        style={{ borderWidth: '2px', fontWeight: 'bold' }}
                    >
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

export default PurchaseOrderFormProductSelection;