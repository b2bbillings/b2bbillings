import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Form, Card, ListGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faTag, faWarehouse, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useProducts } from '../../../hooks/useProducts';
import './ProductSelector.css';

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
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);
    const { searchProducts } = useProducts();

    // Memoize filtered products to prevent unnecessary recalculations
    const filteredProducts = useMemo(() => {
        if (searchQuery.trim() && !selectedProduct) {
            return searchProducts(searchQuery);
        }
        return [];
    }, [searchQuery, selectedProduct, searchProducts]);

    // Calculate dropdown position - memoized to prevent unnecessary recalculations
    const calculateDropdownPosition = useCallback(() => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

            setDropdownPosition({
                // top: rect.bottom + scrollTop ,
                left: rect.left + scrollLeft,
                width: Math.max(rect.width, 300)
            });
        }
    }, []);

    // Handle input changes
    const handleInputChange = useCallback((e) => {
        const newValue = e.target.value;
        setSearchQuery(newValue);
        setSelectedProduct(null);

        // Show suggestions if there's a query
        if (newValue.trim()) {
            setShowSuggestions(true);
            calculateDropdownPosition();
        } else {
            setShowSuggestions(false);
        }

        // Call parent onChange
        if (onChange) {
            onChange({
                target: {
                    value: newValue,
                    selectedProduct: null
                }
            });
        }
    }, [onChange, calculateDropdownPosition]);

    // Handle input focus
    const handleInputFocus = useCallback(() => {
        if (searchQuery.trim() && !selectedProduct) {
            setShowSuggestions(true);
            calculateDropdownPosition();
        }
    }, [searchQuery, selectedProduct, calculateDropdownPosition]);

    // Select a product
    const selectProduct = useCallback((product) => {
        setSearchQuery(product.name);
        setSelectedProduct(product);
        setShowSuggestions(false);

        // Call callbacks
        if (onProductSelect) {
            onProductSelect(product);
        }

        if (onChange) {
            onChange({
                target: {
                    value: product.name,
                    selectedProduct: product
                }
            });
        }
    }, [onChange, onProductSelect]);

    // Clear selection
    const clearSelection = useCallback(() => {
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
    }, [onChange]);

    // Handle click outside
    const handleClickOutside = useCallback((e) => {
        if (inputRef.current && !inputRef.current.contains(e.target)) {
            // Check if click is inside dropdown
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        }
    }, []);

    // Handle window resize and scroll
    const handleResize = useCallback(() => {
        if (showSuggestions) {
            calculateDropdownPosition();
        }
    }, [showSuggestions, calculateDropdownPosition]);

    const handleScroll = useCallback(() => {
        if (showSuggestions) {
            calculateDropdownPosition();
        }
    }, [showSuggestions, calculateDropdownPosition]);

    // Sync with external value prop changes
    useEffect(() => {
        if (value !== searchQuery && value !== undefined) {
            setSearchQuery(value || '');
            if (!value) {
                setSelectedProduct(null);
            }
        }
    }, [value]); // Only depend on value prop

    // Add event listeners
    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [handleClickOutside, handleResize, handleScroll]);

    // Update suggestions visibility based on filtered products
    useEffect(() => {
        if (searchQuery.trim() && !selectedProduct) {
            const hasProducts = filteredProducts.length > 0;
            setShowSuggestions(hasProducts || searchQuery.trim().length > 0);

            if (hasProducts || searchQuery.trim().length > 0) {
                calculateDropdownPosition();
            }
        } else {
            setShowSuggestions(false);
        }
    }, [searchQuery, selectedProduct, filteredProducts.length, calculateDropdownPosition]);

    // Stock status helpers
    const getStockStatusClass = (stock) => {
        if (stock === null) return 'service';
        if (stock === 0) return 'out-of-stock';
        if (stock <= 10) return 'low-stock';
        return 'in-stock';
    };

    const getStockStatusText = (stock) => {
        if (stock === null) return 'Service';
        if (stock === 0) return 'Out of Stock';
        if (stock <= 10) return 'Low Stock';
        return 'In Stock';
    };

    return (
        <>
            <div className={`product-selector-container ${className}`} ref={inputRef}>
                <Form.Control
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    placeholder={placeholder}
                    className="product-selector-input"
                    autoComplete="off"
                    disabled={disabled}
                />

                {/* Selected Product Display */}
                {selectedProduct && (
                    <div className="selected-product-display">
                        <div className="selected-product-card d-flex align-items-center">
                            <FontAwesomeIcon icon={faBox} className="selected-product-icon me-2" />
                            <div className="flex-grow-1">
                                <div className="selected-product-name">
                                    ✓ {selectedProduct.name}
                                </div>
                                <div className="selected-product-details">
                                    ₹{selectedProduct.price?.toLocaleString()} • {selectedProduct.gstRate}% GST • {selectedProduct.sku}
                                </div>
                            </div>
                            <button
                                type="button"
                                className="clear-selection-btn"
                                onClick={clearSelection}
                                aria-label="Clear selection"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Product Suggestions Dropdown */}
            {showSuggestions && (
                <div
                    ref={dropdownRef}
                    className="product-suggestions-dropdown"
                    style={{
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                        width: `${dropdownPosition.width}px`,
                        zIndex: 9999
                    }}
                >
                    <Card className="product-suggestions-card shadow-lg">
                        <Card.Body className="p-0">
                            {filteredProducts.length > 0 ? (
                                <>
                                    <div className="product-suggestions-header px-3 py-2 bg-light border-bottom">
                                        <small className="text-muted fw-semibold">
                                            <FontAwesomeIcon icon={faWarehouse} className="me-1" />
                                            Products from Inventory
                                        </small>
                                    </div>
                                    <ListGroup className="product-suggestions-list" variant="flush">
                                        {filteredProducts.map((product) => (
                                            <ListGroup.Item key={product.id} className="p-0 border-0">
                                                <button
                                                    type="button"
                                                    className="product-suggestion-item w-100 text-start border-0 bg-transparent p-3"
                                                    onClick={() => selectProduct(product)}
                                                >
                                                    <div className="d-flex align-items-start gap-3">
                                                        <div className="product-icon text-muted">
                                                            <FontAwesomeIcon icon={faBox} />
                                                        </div>
                                                        <div className="product-content flex-grow-1">
                                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                                <div className="product-name fw-semibold">
                                                                    {product.name}
                                                                </div>
                                                                <div className="text-end">
                                                                    <div className="product-price fw-bold text-primary">
                                                                        ₹{product.price?.toLocaleString()}
                                                                    </div>
                                                                    <div className="product-unit text-muted small">
                                                                        per {product.unit}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="product-details">
                                                                <div className="product-meta d-flex gap-3 mb-1">
                                                                    <span className="product-sku text-muted small">
                                                                        SKU: {product.sku}
                                                                    </span>
                                                                    <span className="product-gst-badge text-info small">
                                                                        <FontAwesomeIcon icon={faTag} className="me-1" />
                                                                        {product.gstRate}% GST
                                                                    </span>
                                                                </div>
                                                                <div className={`stock-status small ${getStockStatusClass(product.stock)}`}>
                                                                    {getStockStatusText(product.stock)}
                                                                    {product.stock !== null && ` (${product.stock})`}
                                                                </div>
                                                            </div>
                                                            {product.description && (
                                                                <div className="product-description text-muted small mt-2">
                                                                    {product.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                </>
                            ) : searchQuery.trim() && (
                                <div className="custom-item-display p-4 text-center">
                                    <div className="custom-item-icon text-muted mb-2">
                                        <FontAwesomeIcon icon={faBox} size="2x" />
                                    </div>
                                    <div className="custom-item-title mb-1">
                                        <strong>"{searchQuery}"</strong> - Custom Item
                                    </div>
                                    <div className="custom-item-subtitle text-muted small">
                                        This will be added as a custom item (not from inventory)
                                    </div>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </div>
            )}
        </>
    );
}

export default ProductSelector;