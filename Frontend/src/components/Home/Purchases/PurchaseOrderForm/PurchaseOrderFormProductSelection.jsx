import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Form, Button, Spinner, Alert, Card, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faBox, faRupeeSign, faBoxOpen, faCheck, faEdit, faTimes } from '@fortawesome/free-solid-svg-icons';
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
    const [products, setProducts] = useState({});
    const [productSearchTerms, setProductSearchTerms] = useState({});
    const [showProductSuggestions, setShowProductSuggestions] = useState({});
    const [isLoadingProducts, setIsLoadingProducts] = useState({});
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState({});

    // ✅ ADDED: Description modal states - following sales order structure
    const [showDescriptionModal, setShowDescriptionModal] = useState({});
    const [tempDescription, setTempDescription] = useState({});
    const descriptionTextareaRef = useRef({});

    // Modal states for adding new items
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [quickAddContext, setQuickAddContext] = useState(null);

    // Enhanced refs for better keyboard navigation
    const inputRefs = useRef({});
    const isSelectingProductRef = useRef({});
    const searchTimeoutRefs = useRef({});

    // ✅ STANDARDIZED INPUT STYLES - following sales order structure
    const inputStyle = {
        borderColor: '#000',
        fontSize: '13px',
        padding: '10px 14px',
        height: '42px', // ✅ Consistent height matching sales order
        borderWidth: '2px'
    };

    const getInputStyleWithError = (fieldName) => ({
        ...inputStyle,
        borderColor: errors[fieldName] ? '#dc3545' : '#000'
    });

    // Load products from backend using itemService
    const searchProducts = async (searchTerm, itemIndex) => {
        if (!companyId || !searchTerm || searchTerm.length < 2) {
            setProducts(prev => ({ ...prev, [itemIndex]: [] }));
            setShowProductSuggestions(prev => ({ ...prev, [itemIndex]: false }));
            return;
        }

        try {
            setIsLoadingProducts(prev => ({ ...prev, [itemIndex]: true }));

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
                    // ✅ ENHANCED: Better purchase price mapping for purchase orders
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

                setProducts(prev => ({ ...prev, [itemIndex]: formattedProducts }));

                if (!isSelectingProductRef.current[itemIndex]) {
                    setShowProductSuggestions(prev => ({ ...prev, [itemIndex]: true }));
                }
                setSelectedSuggestionIndex(prev => ({ ...prev, [itemIndex]: -1 }));
            } else {
                setProducts(prev => ({ ...prev, [itemIndex]: [] }));
                if (!isSelectingProductRef.current[itemIndex]) {
                    setShowProductSuggestions(prev => ({ ...prev, [itemIndex]: true }));
                }
                setSelectedSuggestionIndex(prev => ({ ...prev, [itemIndex]: -1 }));
            }
        } catch (error) {
            setProducts(prev => ({ ...prev, [itemIndex]: [] }));
            if (!isSelectingProductRef.current[itemIndex]) {
                setShowProductSuggestions(prev => ({ ...prev, [itemIndex]: true }));
            }
            setSelectedSuggestionIndex(prev => ({ ...prev, [itemIndex]: -1 }));
            if (searchTerm.length >= 2) {
                addToast?.('Failed to search products: ' + error.message, 'error');
            }
        } finally {
            setIsLoadingProducts(prev => ({ ...prev, [itemIndex]: false }));
        }
    };

    // Alternative search method using itemService.searchItems
    const searchProductsAlternative = async (searchTerm, itemIndex) => {
        if (!companyId || !searchTerm || searchTerm.length < 2) {
            setProducts(prev => ({ ...prev, [itemIndex]: [] }));
            setShowProductSuggestions(prev => ({ ...prev, [itemIndex]: false }));
            return;
        }

        try {
            setIsLoadingProducts(prev => ({ ...prev, [itemIndex]: true }));
            const response = await itemService.searchItems(companyId, searchTerm, 'product', 20);

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

                setProducts(prev => ({ ...prev, [itemIndex]: formattedProducts }));

                if (!isSelectingProductRef.current[itemIndex]) {
                    setShowProductSuggestions(prev => ({ ...prev, [itemIndex]: true }));
                }
                setSelectedSuggestionIndex(prev => ({ ...prev, [itemIndex]: -1 }));
            } else {
                setProducts(prev => ({ ...prev, [itemIndex]: [] }));
                if (!isSelectingProductRef.current[itemIndex]) {
                    setShowProductSuggestions(prev => ({ ...prev, [itemIndex]: true }));
                }
                setSelectedSuggestionIndex(prev => ({ ...prev, [itemIndex]: -1 }));
            }
        } catch (error) {
            await searchProducts(searchTerm, itemIndex);
        } finally {
            setIsLoadingProducts(prev => ({ ...prev, [itemIndex]: false }));
        }
    };

    // Enhanced debounced product search with better timing
    useEffect(() => {
        Object.entries(productSearchTerms).forEach(([itemIndex, searchTerm]) => {
            if (searchTimeoutRefs.current[itemIndex]) {
                clearTimeout(searchTimeoutRefs.current[itemIndex]);
            }

            if (searchTerm && searchTerm.length >= 2 && !isSelectingProductRef.current[itemIndex]) {
                searchTimeoutRefs.current[itemIndex] = setTimeout(async () => {
                    try {
                        await searchProductsAlternative(searchTerm, parseInt(itemIndex));
                    } catch (error) {
                        await searchProducts(searchTerm, parseInt(itemIndex));
                    }
                }, 300);
            } else if (searchTerm.length === 0) {
                setShowProductSuggestions(prev => ({ ...prev, [itemIndex]: false }));
            }
        });

        return () => {
            Object.values(searchTimeoutRefs.current).forEach(timeoutId => {
                if (timeoutId) clearTimeout(timeoutId);
            });
        };
    }, [productSearchTerms, companyId]);

    // Watch for GST type changes and recalculate all items
    useEffect(() => {
        if (formData._gstTypeChanged) {
            const items = formData.items || [];
            const updatedItems = items.map((item, index) => {
                if (item.quantity && item.price) {
                    const newItem = { ...item };
                    calculateItemTotal([newItem], 0);
                    return newItem;
                }
                return item;
            });
            onFormDataChange('items', updatedItems);
            onFormDataChange('_gstTypeChanged', null);
        }
    }, [formData._gstTypeChanged, formData.gstType]);

    // Enhanced product search input handling
    const handleProductSearchChange = (itemIndex, value) => {
        if (isSelectingProductRef.current[itemIndex]) {
            return;
        }

        setProductSearchTerms(prev => ({ ...prev, [itemIndex]: value }));

        const newItems = [...(formData.items || [])];
        const currentItem = newItems[itemIndex];

        if (currentItem.selectedProduct && value !== currentItem.productName) {
            newItems[itemIndex] = {
                ...currentItem,
                productName: value,
                selectedProduct: '',
                price: '',
                gstRate: 18,
                description: '',
                productCode: '',
                unit: 'pcs',
                availableStock: 0,
                hsnNumber: '',
                purchasePrice: '',
                sellingPrice: ''
            };
        } else {
            newItems[itemIndex] = {
                ...currentItem,
                productName: value
            };
        }

        onFormDataChange('items', newItems);
    };

    // ✅ UPDATED: Product selection with description modal - following sales order structure
    const handleProductSelect = (itemIndex, product) => {
        console.log('Product selected:', product);
        console.log('Product description:', product.description);

        isSelectingProductRef.current[itemIndex] = true;

        const newItems = [...(formData.items || [])];

        // ✅ Use purchase price for purchase orders
        const purchasePrice = product.purchasePrice || 0;
        const priceString = purchasePrice.toString();

        newItems[itemIndex] = {
            ...newItems[itemIndex],
            selectedProduct: product.id,
            productName: product.name,
            productCode: product.code,
            description: product.description, // ✅ Auto-fill description
            price: priceString, // ✅ Use purchase price
            gstRate: product.gstRate,
            unit: product.unit,
            availableStock: product.stock,
            hsnNumber: product.hsnNumber,
            purchasePrice: priceString,
            sellingPrice: product.sellingPrice.toString()
        };

        calculateItemTotal(newItems, itemIndex);
        onFormDataChange('items', newItems);

        setProductSearchTerms(prev => ({ ...prev, [itemIndex]: product.name }));
        setShowProductSuggestions(prev => ({ ...prev, [itemIndex]: false }));
        setSelectedSuggestionIndex(prev => ({ ...prev, [itemIndex]: -1 }));

        // ✅ ADDED: Description modal like sales order
        setTempDescription(prev => ({ ...prev, [itemIndex]: product.description || '' }));

        setTimeout(() => {
            setShowDescriptionModal(prev => ({ ...prev, [itemIndex]: true }));
            setTimeout(() => {
                const textarea = descriptionTextareaRef.current[itemIndex];
                if (textarea) {
                    textarea.focus();
                    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                }
            }, 200);
        }, 100);

        setTimeout(() => {
            isSelectingProductRef.current[itemIndex] = false;
        }, 300);
    };

    // ✅ ADDED: Description modal handlers - following sales order structure
    const handleDescriptionModalSave = (itemIndex) => {
        console.log('Saving description for item:', itemIndex, 'Description:', tempDescription[itemIndex]);

        const newItems = [...(formData.items || [])];
        newItems[itemIndex].description = tempDescription[itemIndex] || '';
        onFormDataChange('items', newItems);

        setShowDescriptionModal(prev => ({ ...prev, [itemIndex]: false }));
        setTempDescription(prev => ({ ...prev, [itemIndex]: '' }));

        // Focus on quantity after description
        setTimeout(() => {
            const quantityInput = document.querySelector(`[data-quantity-input="${itemIndex}"]`);
            if (quantityInput) {
                quantityInput.focus();
                quantityInput.select();
            }
        }, 200);
    };

    const handleDescriptionModalSkip = (itemIndex) => {
        console.log('Skipping description for item:', itemIndex);

        setShowDescriptionModal(prev => ({ ...prev, [itemIndex]: false }));
        setTempDescription(prev => ({ ...prev, [itemIndex]: '' }));

        // Focus on quantity after skipping description
        setTimeout(() => {
            const quantityInput = document.querySelector(`[data-quantity-input="${itemIndex}"]`);
            if (quantityInput) {
                quantityInput.focus();
                quantityInput.select();
            }
        }, 200);
    };

    // ✅ ADDED: Handle manual description edit
    const handleEditDescription = (itemIndex) => {
        const item = formData.items?.[itemIndex];
        setTempDescription(prev => ({ ...prev, [itemIndex]: item?.description || '' }));
        setShowDescriptionModal(prev => ({ ...prev, [itemIndex]: true }));

        setTimeout(() => {
            const textarea = descriptionTextareaRef.current[itemIndex];
            if (textarea) {
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            }
        }, 200);
    };

    // Enhanced keyboard navigation
    const handleKeyDown = (e, itemIndex) => {
        if (!showProductSuggestions[itemIndex]) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const quantityInput = document.querySelector(`[data-quantity-input="${itemIndex}"]`);
                if (quantityInput) {
                    quantityInput.focus();
                    quantityInput.select();
                }
            }
            return;
        }

        const productList = products[itemIndex] || [];
        const hasAddNewOption = productList.length === 0 && productSearchTerms[itemIndex]?.length >= 2;
        const totalOptions = productList.length + (hasAddNewOption ? 1 : 0);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedSuggestionIndex(prev => ({
                    ...prev,
                    [itemIndex]: Math.min((prev[itemIndex] ?? -1) + 1, totalOptions - 1)
                }));
                break;

            case 'ArrowUp':
                e.preventDefault();
                setSelectedSuggestionIndex(prev => ({
                    ...prev,
                    [itemIndex]: Math.max((prev[itemIndex] ?? 0) - 1, -1)
                }));
                break;

            case 'Enter':
                e.preventDefault();
                const selectedIndex = selectedSuggestionIndex[itemIndex] ?? -1;

                if (selectedIndex === -1) {
                    const quantityInput = document.querySelector(`[data-quantity-input="${itemIndex}"]`);
                    if (quantityInput) {
                        setShowProductSuggestions(prev => ({ ...prev, [itemIndex]: false }));
                        quantityInput.focus();
                        quantityInput.select();
                    }
                } else if (selectedIndex < productList.length) {
                    const selectedProduct = productList[selectedIndex];
                    if (selectedProduct) {
                        handleProductSelect(itemIndex, selectedProduct);
                    }
                } else if (hasAddNewOption && selectedIndex === productList.length) {
                    handleAddNewItemClick(productSearchTerms[itemIndex], itemIndex);
                }
                break;

            case 'Escape':
                e.preventDefault();
                setShowProductSuggestions(prev => ({ ...prev, [itemIndex]: false }));
                setSelectedSuggestionIndex(prev => ({ ...prev, [itemIndex]: -1 }));
                break;

            case 'Tab':
                setShowProductSuggestions(prev => ({ ...prev, [itemIndex]: false }));
                setSelectedSuggestionIndex(prev => ({ ...prev, [itemIndex]: -1 }));
                break;
        }
    };

    // ✅ UPDATED: Enhanced keyboard navigation - following sales order structure
    const handleFieldKeyDown = (e, itemIndex, fieldType) => {
        if (e.key === 'Enter') {
            e.preventDefault();

            // ✅ Simplified field order - product → quantity → price → gstmode → total
            const fieldOrder = ['product', 'quantity', 'price', 'gstmode', 'total'];
            const currentFieldIndex = fieldOrder.indexOf(fieldType);

            if (currentFieldIndex < fieldOrder.length - 1) {
                const nextField = fieldOrder[currentFieldIndex + 1];
                const nextInput = document.querySelector(`[data-${nextField}-input="${itemIndex}"]`);
                if (nextInput) {
                    nextInput.focus();
                    if (nextInput.select) nextInput.select();
                }
            } else {
                const nextRowIndex = itemIndex + 1;
                const nextRowInput = document.querySelector(`[data-product-input="${nextRowIndex}"]`);

                if (nextRowInput) {
                    nextRowInput.focus();
                } else {
                    addNewProductRow();
                    setTimeout(() => {
                        const newRowInput = document.querySelector(`[data-product-input="${nextRowIndex}"]`);
                        if (newRowInput) {
                            newRowInput.focus();
                        }
                    }, 100);
                }
            }
        }
    };

    // Enhanced focus handling for product inputs
    const handleProductInputFocus = (itemIndex) => {
        if (!isSelectingProductRef.current[itemIndex] && !formData.items?.[itemIndex]?.selectedProduct) {
            const searchTerm = productSearchTerms[itemIndex] || formData.items?.[itemIndex]?.productName;
            if (searchTerm && searchTerm.length >= 2) {
                setShowProductSuggestions(prev => ({ ...prev, [itemIndex]: true }));
            }
        }
    };

    // Enhanced blur handling for product inputs
    const handleProductInputBlur = (itemIndex) => {
        if (!isSelectingProductRef.current[itemIndex]) {
            setTimeout(() => {
                if (!isSelectingProductRef.current[itemIndex]) {
                    setShowProductSuggestions(prev => ({ ...prev, [itemIndex]: false }));
                    setSelectedSuggestionIndex(prev => ({ ...prev, [itemIndex]: -1 }));
                }
            }, 150);
        }
    };

    // Handle item field changes
    const handleItemChange = (itemIndex, field, value) => {
        const newItems = [...(formData.items || [])];
        newItems[itemIndex] = {
            ...newItems[itemIndex],
            [field]: value
        };

        if (['quantity', 'price', 'gstMode', 'gstRate'].includes(field)) {
            calculateItemTotal(newItems, itemIndex);
        }

        onFormDataChange('items', newItems);
    };

    // Calculate total for a specific item
    const calculateItemTotal = (items, itemIndex) => {
        const item = items[itemIndex];
        const quantity = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        const gstRate = parseFloat(item.gstRate) || 0;

        let subtotal = quantity * price;
        let gstAmount = 0;
        let totalAmount = 0;

        if (formData.gstType === 'gst') {
            if (item.gstMode === 'include') {
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

        items[itemIndex].subtotal = Math.round(subtotal * 100) / 100;
        items[itemIndex].gstAmount = Math.round(gstAmount * 100) / 100;
        items[itemIndex].totalAmount = Math.round(totalAmount * 100) / 100;
    };

    // Add new product row
    const addNewProductRow = () => {
        const currentItems = formData.items || [];
        const newItem = {
            id: Date.now(),
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
        };

        onFormDataChange('items', [...currentItems, newItem]);
    };

    // Remove product row
    const removeProductRow = (itemIndex) => {
        const currentItems = formData.items || [];
        if (currentItems.length > 1) {
            const newItems = currentItems.filter((_, index) => index !== itemIndex);
            onFormDataChange('items', newItems);

            const cleanupStates = (stateObj) => {
                const newState = { ...stateObj };
                delete newState[itemIndex];
                return newState;
            };

            setProductSearchTerms(cleanupStates);
            setShowProductSuggestions(cleanupStates);
            setProducts(cleanupStates);
            setIsLoadingProducts(cleanupStates);
            setSelectedSuggestionIndex(cleanupStates);
            setShowDescriptionModal(cleanupStates);
            setTempDescription(cleanupStates);

            delete isSelectingProductRef.current[itemIndex];
            delete descriptionTextareaRef.current[itemIndex];
            if (searchTimeoutRefs.current[itemIndex]) {
                clearTimeout(searchTimeoutRefs.current[itemIndex]);
                delete searchTimeoutRefs.current[itemIndex];
            }
        } else {
            addToast?.('At least one product row is required', 'warning');
        }
    };

    // Handle "Add New Item" click from suggestions
    const handleAddNewItemClick = (searchTerm, itemIndex) => {
        isSelectingProductRef.current[itemIndex] = true;

        setQuickAddContext({
            type: 'item',
            searchTerm: searchTerm,
            itemIndex: itemIndex
        });
        setShowAddItemModal(true);
        setShowProductSuggestions(prev => ({ ...prev, [itemIndex]: false }));
        setSelectedSuggestionIndex(prev => ({ ...prev, [itemIndex]: -1 }));
    };

    // Handle new item saved callback
    const handleNewItemSaved = (newItem) => {
        addToast?.('New item created successfully!', 'success');

        if (quickAddContext && quickAddContext.type === 'item') {
            const itemIndex = quickAddContext.itemIndex;

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

            handleProductSelect(itemIndex, formattedProduct);
            addToast?.('New item added and selected successfully!', 'success');
        }

        setQuickAddContext(null);
        setShowAddItemModal(false);

        setTimeout(() => {
            if (quickAddContext?.itemIndex !== undefined) {
                isSelectingProductRef.current[quickAddContext.itemIndex] = false;
            }
        }, 100);
    };

    // Handle modal close
    const handleModalClose = () => {
        if (quickAddContext?.itemIndex !== undefined) {
            isSelectingProductRef.current[quickAddContext.itemIndex] = false;
        }
        setQuickAddContext(null);
        setShowAddItemModal(false);
    };

    // Initialize with one item if empty
    useEffect(() => {
        if (!formData.items || formData.items.length === 0) {
            addNewProductRow();
        }
    }, []);

    const items = formData.items || [];

    const dropdownStyles = `
        .purchase-order-form-product-section .position-relative {
            overflow: visible !important;
        }
        
        .purchase-order-form-product-section .card-body {
            overflow: visible !important;
        }
        
        .purchase-order-form-product-section .card {
            overflow: visible !important;
        }
        
        .purchase-order-form-product-section {
            overflow: visible !important;
        }
        
        .container, .container-fluid, .row, .col, .col-md-4, .col-md-3, .col-md-2, .col-md-1 {
            overflow: visible !important;
        }
        
        .product-suggestions-dropdown {
            z-index: 9999 !important;
            position: absolute !important;
            background: white !important;
            border: 2px solid #000 !important;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15) !important;
        }

        .suggestion-item-selected {
            background-color: #007bff !important;
            color: white !important;
        }

        .suggestion-item-selected .text-primary {
            color: white !important;
        }

        .suggestion-item-selected .text-muted {
            color: #e0e0e0 !important;
        }

        .suggestion-item-selected .text-warning {
            color: #ffeb3b !important;
        }

        .suggestion-item-selected .text-success {
            color: #90ee90 !important;
        }

        .suggestion-item-selected .text-info {
            color: #add8e6 !important;
        }

        .product-selected-input {
            background-color: #e8f5e8 !important;
            border-color: #28a745 !important;
            color: #155724 !important;
            font-weight: bold !important;
        }

        .product-selected-icon {
            color: #28a745 !important;
        }

        /* ✅ Perfect alignment styles - following sales order structure */
        .form-group-aligned {
            margin-bottom: 0 !important;
        }

        .label-aligned {
            font-size: 14px !important;
            font-weight: bold !important;
            margin-bottom: 8px !important;
            display: block !important;
        }

        .input-aligned {
            height: 42px !important;
            border: 2px solid #000 !important;
            font-size: 13px !important;
            padding: 10px 14px !important;
        }

        /* ✅ Purchase price styling */
        .purchase-price-highlight {
            background-color: #fff3cd !important;
            border-color: #ffc107 !important;
            color: #856404 !important;
            font-weight: bold !important;
        }

        .purchase-price-highlight:focus {
            background-color: #fff3cd !important;
            border-color: #ffc107 !important;
            color: #856404 !important;
            box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.25) !important;
        }
    `;

    return (
        <>
            <style>{dropdownStyles}</style>
            <div className="purchase-order-form-product-section">
                <div className="mb-4">
                    {items.map((item, index) => (
                        <Card key={item.id || index} className="mb-3 border-2" style={{ borderColor: '#000', overflow: 'visible' }}>
                            <Card.Body className="p-4" style={{ overflow: 'visible' }}>
                                {/* ✅ RESTRUCTURED: First Row - Product + Quantity + Delete - following sales order structure */}
                                <Row className="mb-4 align-items-end">
                                    {/* Product Selection - 5 columns */}
                                    <Col md={5} style={{ overflow: 'visible' }}>
                                        <Form.Group className="form-group-aligned position-relative" style={{ overflow: 'visible' }}>
                                            <Form.Label className="label-aligned text-danger">
                                                Select Product *
                                                {item.selectedProduct && (
                                                    <span className="ms-2 text-success">
                                                        <FontAwesomeIcon icon={faCheck} className="me-1" />
                                                        Selected
                                                    </span>
                                                )}
                                                {item.selectedProduct && (
                                                    <Button
                                                        variant="link"
                                                        size="sm"
                                                        className="p-0 ms-2 text-decoration-none"
                                                        style={{ fontSize: '12px' }}
                                                        onClick={() => handleEditDescription(index)}
                                                        title="Edit description"
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} className="me-1" />
                                                        {item.description ? 'Edit Description' : 'Add Description'}
                                                    </Button>
                                                )}
                                            </Form.Label>
                                            <div className="position-relative" style={{ overflow: 'visible' }}>
                                                <Form.Control
                                                    ref={el => inputRefs.current[`product-${index}`] = el}
                                                    type="text"
                                                    value={productSearchTerms[index] || item.productName || ''}
                                                    onChange={(e) => handleProductSearchChange(index, e.target.value)}
                                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                                    onFocus={() => handleProductInputFocus(index)}
                                                    onBlur={() => handleProductInputBlur(index)}
                                                    className={`input-aligned ${item.selectedProduct ? 'product-selected-input' : ''}`}
                                                    style={{
                                                        paddingLeft: '35px',
                                                        backgroundColor: item.selectedProduct ? '#e8f5e8' : 'white',
                                                        color: item.selectedProduct ? '#155724' : 'inherit',
                                                        fontWeight: item.selectedProduct ? 'bold' : 'normal',
                                                        borderColor: errors[`items.${index}.productName`] ? '#dc3545' : '#000'
                                                    }}
                                                    placeholder="Search product..."
                                                    disabled={disabled}
                                                    isInvalid={!!errors[`items.${index}.productName`]}
                                                    data-product-input={index}
                                                />

                                                {isLoadingProducts[index] && (
                                                    <div className="position-absolute top-50 end-0 translate-middle-y me-2" style={{ zIndex: 10 }}>
                                                        <Spinner size="sm" />
                                                    </div>
                                                )}

                                                <div className="position-absolute top-50 start-0 translate-middle-y ms-3" style={{ zIndex: 10 }}>
                                                    <FontAwesomeIcon
                                                        icon={item.selectedProduct ? faCheck : faBox}
                                                        className={item.selectedProduct ? 'product-selected-icon' : 'text-muted'}
                                                        style={{ fontSize: '14px' }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Product Suggestions Dropdown */}
                                            {showProductSuggestions[index] && !item.selectedProduct && (
                                                <div
                                                    className="product-suggestions-dropdown w-100 bg-white border border-2 rounded mt-1 shadow-lg"
                                                    style={{
                                                        position: 'absolute',
                                                        zIndex: 9999,
                                                        maxHeight: '250px',
                                                        overflowY: 'auto',
                                                        borderColor: '#000',
                                                        top: '100%',
                                                        left: 0,
                                                        right: 0,
                                                        backgroundColor: 'white'
                                                    }}
                                                >
                                                    {products[index] && products[index].length > 0 && (
                                                        <>
                                                            {products[index].slice(0, 5).map((product, productIndex) => (
                                                                <div
                                                                    key={product.id}
                                                                    className={`p-2 border-bottom cursor-pointer ${selectedSuggestionIndex[index] === productIndex ? 'suggestion-item-selected' : ''}`}
                                                                    style={{
                                                                        fontSize: '12px',
                                                                        cursor: 'pointer',
                                                                        transition: 'background-color 0.2s',
                                                                        backgroundColor: selectedSuggestionIndex[index] === productIndex ? '#007bff' : 'white'
                                                                    }}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        handleProductSelect(index, product);
                                                                    }}
                                                                    onMouseEnter={() => setSelectedSuggestionIndex(prev => ({ ...prev, [index]: productIndex }))}
                                                                >
                                                                    <div className="fw-bold text-primary mb-1" style={{ fontSize: '13px' }}>{product.name}</div>
                                                                    <div className="text-muted" style={{ fontSize: '11px' }}>
                                                                        <span className="text-warning fw-bold">Purchase: ₹{product.purchasePrice.toFixed(2)}</span>
                                                                        <span className="ms-2 text-success">Sale: ₹{product.sellingPrice.toFixed(2)}</span>
                                                                        <span className="ms-2 text-info">Stock: {product.stock}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </>
                                                    )}

                                                    {((products[index] && products[index].length === 0) || !products[index]) &&
                                                        productSearchTerms[index] &&
                                                        productSearchTerms[index].length >= 2 &&
                                                        !isLoadingProducts[index] && (
                                                            <div
                                                                className={`p-2 cursor-pointer bg-success bg-opacity-10 ${selectedSuggestionIndex[index] === 0 ? 'suggestion-item-selected' : ''}`}
                                                                style={{
                                                                    cursor: 'pointer',
                                                                    fontSize: '12px'
                                                                }}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleAddNewItemClick(productSearchTerms[index], index);
                                                                }}
                                                            >
                                                                <FontAwesomeIcon icon={faPlus} className="text-success me-2" />
                                                                Add "{productSearchTerms[index]}"
                                                            </div>
                                                        )}

                                                    {isLoadingProducts[index] && (
                                                        <div className="p-2 text-center">
                                                            <Spinner size="sm" className="me-2" />
                                                            <span style={{ fontSize: '12px' }}>Searching...</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {errors[`items.${index}.productName`] && (
                                                <div className="invalid-feedback d-block" style={{ fontSize: '12px' }}>
                                                    {errors[`items.${index}.productName`]}
                                                </div>
                                            )}
                                        </Form.Group>
                                    </Col>

                                    {/* Quantity - 4 columns */}
                                    <Col md={4}>
                                        <Form.Group className="form-group-aligned">
                                            <Form.Label className="label-aligned text-danger">
                                                Quantity *
                                            </Form.Label>
                                            <Form.Control
                                                type="number"
                                                value={item.quantity || ''}
                                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                onKeyDown={(e) => handleFieldKeyDown(e, index, 'quantity')}
                                                className="input-aligned"
                                                style={{
                                                    borderColor: errors[`items.${index}.quantity`] ? '#dc3545' : '#000'
                                                }}
                                                placeholder="0"
                                                min="0"
                                                step="0.01"
                                                disabled={disabled}
                                                isInvalid={!!errors[`items.${index}.quantity`]}
                                                data-quantity-input={index}
                                            />
                                            {item.unit && (
                                                <Form.Text className="text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                                                    Unit: {item.unit}
                                                </Form.Text>
                                            )}
                                        </Form.Group>
                                    </Col>

                                    {/* Remove Button - 3 columns */}
                                    <Col md={3}>
                                        <Form.Group className="form-group-aligned">
                                            <Form.Label className="label-aligned" style={{ color: 'transparent' }}>
                                                Action
                                            </Form.Label>
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => removeProductRow(index)}
                                                disabled={disabled || items.length === 1}
                                                title="Remove product"
                                                className="input-aligned w-100 d-flex align-items-center justify-content-center"
                                                style={{
                                                    borderColor: '#000',
                                                    fontSize: '12px',
                                                    padding: '10px'
                                                }}
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </Button>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                {/* ✅ RESTRUCTURED: Second Row - Price + GST Mode + Total - following sales order structure */}
                                <Row className="mb-2">
                                    {/* Purchase Price - 4 columns */}
                                    <Col md={4}>
                                        <Form.Group className="form-group-aligned">
                                            <Form.Label className="label-aligned text-danger">
                                                Purchase Price *
                                                <span className="ms-2 badge bg-warning text-dark" style={{ fontSize: '10px' }}>
                                                    Purchase
                                                </span>
                                            </Form.Label>
                                            <div className="input-group">
                                                <span className="input-group-text" style={{
                                                    borderColor: '#ffc107',
                                                    borderWidth: '2px',
                                                    fontSize: '12px',
                                                    padding: '10px 12px',
                                                    backgroundColor: '#fff3cd',
                                                    color: '#856404',
                                                    fontWeight: 'bold'
                                                }}>
                                                    <FontAwesomeIcon icon={faRupeeSign} />
                                                </span>
                                                <Form.Control
                                                    type="number"
                                                    value={item.price || ''}
                                                    onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                                    onKeyDown={(e) => handleFieldKeyDown(e, index, 'price')}
                                                    className="input-aligned purchase-price-highlight"
                                                    style={{
                                                        borderColor: errors[`items.${index}.price`] ? '#dc3545' : '#ffc107',
                                                        borderLeftWidth: '0'
                                                    }}
                                                    placeholder="0.00"
                                                    min="0"
                                                    step="0.01"
                                                    disabled={disabled}
                                                    isInvalid={!!errors[`items.${index}.price`]}
                                                    data-price-input={index}
                                                />
                                            </div>
                                            <Form.Text className="text-warning" style={{ fontSize: '12px' }}>
                                                💰 Purchase price for this order
                                            </Form.Text>
                                        </Form.Group>
                                    </Col>

                                    {/* GST Mode - 4 columns */}
                                    <Col md={4}>
                                        <Form.Group className="form-group-aligned">
                                            <Form.Label className="label-aligned text-danger">
                                                GST Mode
                                            </Form.Label>
                                            <Form.Select
                                                value={item.gstMode || 'exclude'}
                                                onChange={(e) => handleItemChange(index, 'gstMode', e.target.value)}
                                                onKeyDown={(e) => handleFieldKeyDown(e, index, 'gstmode')}
                                                className="input-aligned"
                                                style={{
                                                    backgroundColor: formData.gstType === 'gst' ? '#FFD700' : '#f8f9fa',
                                                    fontWeight: 'bold',
                                                    opacity: formData.gstType === 'non-gst' ? 0.6 : 1
                                                }}
                                                disabled={disabled || formData.gstType === 'non-gst'}
                                                data-gstmode-input={index}
                                            >
                                                <option value="include">GST Include</option>
                                                <option value="exclude">GST Exclude</option>
                                            </Form.Select>
                                            <Form.Text className="text-muted" style={{ fontSize: '12px' }}>
                                                Rate: {formData.gstType === 'gst' ? `${item.gstRate || 18}%` : 'No GST'}
                                            </Form.Text>
                                        </Form.Group>
                                    </Col>

                                    {/* Total - 4 columns */}
                                    <Col md={4}>
                                        <Form.Group className="form-group-aligned">
                                            <Form.Label className="label-aligned text-danger">
                                                Total
                                            </Form.Label>
                                            <div
                                                className="input-aligned form-control bg-light text-center fw-bold d-flex align-items-center justify-content-center"
                                                style={{
                                                    borderColor: '#28a745',
                                                    color: '#28a745'
                                                }}
                                                data-total-input={index}
                                            >
                                                ₹{(item.totalAmount || 0).toFixed(2)}
                                            </div>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                {/* Product Info Display */}
                                {item.selectedProduct && item.availableStock !== undefined && (
                                    <Row className="mb-2">
                                        <Col md={12}>
                                            <div className="p-2 bg-warning bg-opacity-10 rounded border border-warning" style={{ fontSize: '12px' }}>
                                                <div className="d-flex justify-content-between flex-wrap gap-2">
                                                    <span><strong>Code:</strong> {item.productCode || 'N/A'}</span>
                                                    <span><strong>Stock:</strong> {item.availableStock} {item.unit}</span>
                                                    <span><strong>Purchase Price:</strong> ₹{item.purchasePrice || item.price || '0.00'}</span>
                                                    {item.sellingPrice && (
                                                        <span><strong>Selling Price:</strong> ₹{item.sellingPrice}</span>
                                                    )}
                                                    <span><strong>GST:</strong> ₹{item.gstAmount?.toFixed(2) || '0.00'}</span>
                                                    <span><strong>Subtotal:</strong> ₹{item.subtotal?.toFixed(2) || '0.00'}</span>
                                                    {item.hsnNumber && (
                                                        <span><strong>HSN:</strong> {item.hsnNumber}</span>
                                                    )}
                                                    {item.description && (
                                                        <span><strong>Description:</strong> {item.description.substring(0, 50)}{item.description.length > 50 ? '...' : ''}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                )}
                            </Card.Body>
                        </Card>
                    ))}
                </div>

                <Row className="mb-3">
                    <Col md={12}>
                        <Button
                            style={{
                                backgroundColor: '#FFD700',
                                borderColor: '#000',
                                color: '#000',
                                fontSize: '14px',
                                padding: '10px 20px',
                                fontWeight: 'bold',
                                height: '42px'
                            }}
                            onClick={addNewProductRow}
                            disabled={disabled}
                            className="border-2"
                        >
                            <FontAwesomeIcon icon={faPlus} className="me-2" />
                            Add New Product
                        </Button>
                    </Col>
                </Row>

                {/* ✅ ADDED: Description Modals - following sales order structure */}
                {Object.entries(showDescriptionModal).map(([itemIndex, show]) => {
                    return show && (
                        <Modal
                            key={itemIndex}
                            show={show}
                            onHide={() => handleDescriptionModalSkip(parseInt(itemIndex))}
                            centered
                            backdrop="static"
                            onEntered={() => {
                                const textarea = descriptionTextareaRef.current[itemIndex];
                                if (textarea) {
                                    textarea.focus();
                                    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                                }
                            }}
                        >
                            <Modal.Header closeButton>
                                <Modal.Title style={{ fontSize: '16px' }}>
                                    Product Description
                                </Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                <Form.Group>
                                    <Form.Label className="fw-bold" style={{ fontSize: '14px' }}>
                                        Description for: <span className="text-primary">{formData.items?.[parseInt(itemIndex)]?.productName}</span>
                                    </Form.Label>
                                    <Form.Control
                                        ref={el => descriptionTextareaRef.current[itemIndex] = el}
                                        as="textarea"
                                        rows={4}
                                        value={tempDescription[itemIndex] || ''}
                                        onChange={(e) => setTempDescription(prev => ({ ...prev, [itemIndex]: e.target.value }))}
                                        className="border-2"
                                        style={{
                                            borderColor: '#000',
                                            fontSize: '13px',
                                            padding: '10px 14px'
                                        }}
                                        placeholder="Enter product description (optional)..."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.ctrlKey) {
                                                e.preventDefault();
                                                handleDescriptionModalSave(parseInt(itemIndex));
                                            } else if (e.key === 'Escape') {
                                                e.preventDefault();
                                                handleDescriptionModalSkip(parseInt(itemIndex));
                                            }
                                        }}
                                    />
                                    <Form.Text className="text-muted" style={{ fontSize: '12px' }}>
                                        Press Ctrl+Enter to save, Escape to skip
                                    </Form.Text>
                                </Form.Group>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button
                                    variant="outline-secondary"
                                    onClick={() => handleDescriptionModalSkip(parseInt(itemIndex))}
                                    className="border-2"
                                    style={{ borderColor: '#000' }}
                                >
                                    <FontAwesomeIcon icon={faTimes} className="me-2" />
                                    Skip
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={() => handleDescriptionModalSave(parseInt(itemIndex))}
                                    className="border-2"
                                    style={{ borderColor: '#000' }}
                                >
                                    <FontAwesomeIcon icon={faCheck} className="me-2" />
                                    Save & Continue
                                </Button>
                            </Modal.Footer>
                        </Modal>
                    );
                })}

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
            </div>
        </>
    );
}

export default PurchaseOrderFormProductSelection;