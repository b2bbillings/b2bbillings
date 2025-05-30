// Frontend/src/components/Home/Sales/ProductSelector.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Form, Card, ListGroup, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faTag, faWarehouse, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useProducts } from './hooks/useProducts';

function ProductSelector({
    value,
    onChange,
    onProductSelect,
    placeholder = "Search products from inventory...",
    className = "",
    disabled = false
}) {
    const [searchQuery, setSearchQuery] = useState(value || '');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const inputRef = useRef(null);
    const { searchProducts } = useProducts();

    const [filteredProducts, setFilteredProducts] = useState([]);

    useEffect(() => {
        if (searchQuery.trim() && !selectedProduct) {
            const products = searchProducts(searchQuery);
            setFilteredProducts(products);
            setShowSuggestions(products.length > 0 || searchQuery.trim().length > 0);
        } else {
            setFilteredProducts([]);
            setShowSuggestions(false);
        }
    }, [searchQuery, selectedProduct, searchProducts]);

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setSearchQuery(newValue);
        setSelectedProduct(null);

        // Notify parent of the text change
        if (onChange) {
            onChange(e);
        }
    };

    const selectProduct = (product) => {
        setSearchQuery(product.name);
        setSelectedProduct(product);
        setShowSuggestions(false);

        // Notify parent of product selection
        if (onProductSelect) {
            onProductSelect(product);
        }

        // Also update the input value
        if (onChange) {
            onChange({
                target: {
                    value: product.name,
                    selectedProduct: product
                }
            });
        }
    };

    const clearSelection = () => {
        setSearchQuery('');
        setSelectedProduct(null);
        setShowSuggestions(false);

        if (onChange) {
            onChange({
                target: {
                    value: '',
                    selectedProduct: null
                }
            });
        }
    };

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

    const getStockStatus = (stock) => {
        if (stock === null) return { variant: 'info', text: 'Service' };
        if (stock === 0) return { variant: 'danger', text: 'Out of Stock' };
        if (stock <= 10) return { variant: 'warning', text: 'Low Stock' };
        return { variant: 'success', text: 'In Stock' };
    };

    return (
        <div className={`position-relative ${className}`} ref={inputRef}>
            <Form.Control
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={() => searchQuery && !selectedProduct && setShowSuggestions(true)}
                placeholder={placeholder}
                className="form-input"
                autoComplete="off"
                disabled={disabled}
            />

            {/* Product Suggestions Dropdown */}
            {showSuggestions && (
                <div className="position-absolute w-100 mt-1" style={{ zIndex: 1050 }}>
                    <Card className="border shadow-sm">
                        <Card.Body className="p-0">
                            {filteredProducts.length > 0 ? (
                                <>
                                    <div className="px-3 py-2 bg-light border-bottom">
                                        <small className="text-muted fw-semibold">
                                            <FontAwesomeIcon icon={faWarehouse} className="me-1" />
                                            Products from Inventory
                                        </small>
                                    </div>
                                    <ListGroup variant="flush">
                                        {filteredProducts.map((product) => {
                                            const stockStatus = getStockStatus(product.stock);
                                            return (
                                                <ListGroup.Item
                                                    key={product.id}
                                                    action
                                                    onClick={() => selectProduct(product)}
                                                    className="product-suggestion-item py-3"
                                                >
                                                    <div className="d-flex align-items-start">
                                                        <div className="me-3">
                                                            <FontAwesomeIcon
                                                                icon={faBox}
                                                                className="text-primary"
                                                                size="lg"
                                                            />
                                                        </div>
                                                        <div className="flex-grow-1">
                                                            <div className="d-flex justify-content-between align-items-start mb-1">
                                                                <div className="fw-semibold text-dark">
                                                                    {product.name}
                                                                </div>
                                                                <div className="text-end">
                                                                    <div className="fw-bold text-primary">
                                                                        ₹{product.price.toLocaleString()}
                                                                    </div>
                                                                    <small className="text-muted">per {product.unit}</small>
                                                                </div>
                                                            </div>
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <div className="d-flex gap-2 align-items-center">
                                                                    <small className="text-muted">
                                                                        SKU: {product.sku}
                                                                    </small>
                                                                    <Badge bg="light" text="dark" className="small">
                                                                        <FontAwesomeIcon icon={faTag} className="me-1" />
                                                                        {product.gstRate}% GST
                                                                    </Badge>
                                                                </div>
                                                                <Badge bg={stockStatus.variant} className="small">
                                                                    {stockStatus.text}
                                                                    {product.stock !== null && ` (${product.stock})`}
                                                                </Badge>
                                                            </div>
                                                            {product.description && (
                                                                <small className="text-muted d-block mt-1">
                                                                    {product.description}
                                                                </small>
                                                            )}
                                                        </div>
                                                    </div>
                                                </ListGroup.Item>
                                            );
                                        })}
                                    </ListGroup>
                                </>
                            ) : searchQuery.trim() && (
                                <div className="p-3 text-center">
                                    <div className="mb-2">
                                        <FontAwesomeIcon icon={faBox} size="2x" className="text-muted" />
                                    </div>
                                    <div className="mb-2">
                                        <strong>"{searchQuery}"</strong> - Custom Item
                                    </div>
                                    <small className="text-muted">
                                        This will be added as a custom item (not from inventory)
                                    </small>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </div>
            )}

            {/* Selected Product Display */}
            {selectedProduct && (
                <div className="mt-2">
                    <div className="d-flex align-items-center p-2 bg-success bg-opacity-10 border border-success border-opacity-25 rounded">
                        <FontAwesomeIcon icon={faBox} className="text-success me-2" />
                        <div className="flex-grow-1">
                            <div className="fw-semibold text-success">
                                ✓ {selectedProduct.name}
                            </div>
                            <small className="text-muted">
                                ₹{selectedProduct.price.toLocaleString()} • {selectedProduct.gstRate}% GST • {selectedProduct.sku}
                            </small>
                        </div>
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={clearSelection}
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProductSelector;