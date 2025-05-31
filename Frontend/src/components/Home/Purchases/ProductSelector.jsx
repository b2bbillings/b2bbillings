import React, { useState, useEffect, useRef } from 'react';
import { Form, Card, ListGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faSearch } from '@fortawesome/free-solid-svg-icons';

function ProductSelector({ value, onChange, placeholder, className, products = [] }) {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [inputValue, setInputValue] = useState(value || '');
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Sample products data - you can pass this as props or fetch from API
    const defaultProducts = [
        { id: 1, name: 'Laptop Computer', sku: 'LPT-001', price: 45000, gstRate: 18, unit: 'piece', category: 'Electronics' },
        { id: 2, name: 'Office Chair', sku: 'CHR-001', price: 8500, gstRate: 18, unit: 'piece', category: 'Furniture' },
        { id: 3, name: 'Printer Paper A4', sku: 'PPR-001', price: 350, gstRate: 12, unit: 'pack', category: 'Stationery' },
        { id: 4, name: 'USB Cable', sku: 'USB-001', price: 250, gstRate: 18, unit: 'piece', category: 'Electronics' },
        { id: 5, name: 'Desk Lamp', sku: 'LMP-001', price: 1200, gstRate: 18, unit: 'piece', category: 'Furniture' },
        { id: 6, name: 'Wireless Mouse', sku: 'MSE-001', price: 850, gstRate: 18, unit: 'piece', category: 'Electronics' },
        { id: 7, name: 'Notebook Set', sku: 'NTB-001', price: 120, gstRate: 12, unit: 'set', category: 'Stationery' },
        { id: 8, name: 'Monitor Stand', sku: 'STD-001', price: 2500, gstRate: 18, unit: 'piece', category: 'Furniture' },
        { id: 9, name: 'Keyboard Wireless', sku: 'KBD-001', price: 1500, gstRate: 18, unit: 'piece', category: 'Electronics' },
        { id: 10, name: 'File Cabinet', sku: 'CAB-001', price: 12000, gstRate: 18, unit: 'piece', category: 'Furniture' }
    ];

    const productList = products.length > 0 ? products : defaultProducts;

    // Update input value when prop changes
    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    // Filter products based on input
    const filterProducts = (searchTerm) => {
        if (!searchTerm || searchTerm.length < 1) {
            return [];
        }

        const filtered = productList.filter(product => {
            const term = searchTerm.toLowerCase();
            return (
                product.name.toLowerCase().includes(term) ||
                product.sku.toLowerCase().includes(term) ||
                product.category.toLowerCase().includes(term)
            );
        });

        return filtered.slice(0, 8); // Limit to 8 suggestions
    };

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);

        // Filter products and show suggestions
        const filtered = filterProducts(newValue);
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0 && newValue.trim().length > 0);

        // Call parent onChange with just the value
        const syntheticEvent = {
            target: {
                value: newValue,
                selectedProduct: null
            }
        };
        onChange(syntheticEvent);
    };

    const handleProductSelect = (product) => {
        setInputValue(product.name);
        setShowSuggestions(false);

        // Call parent onChange with selected product
        const syntheticEvent = {
            target: {
                value: product.name,
                selectedProduct: product
            }
        };
        onChange(syntheticEvent);
    };

    const handleInputFocus = () => {
        if (inputValue.trim().length > 0) {
            const filtered = filterProducts(inputValue);
            setSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        }
    };

    const handleInputBlur = (e) => {
        // Delay hiding suggestions to allow for clicks
        setTimeout(() => {
            setShowSuggestions(false);
        }, 200);
    };

    // Handle clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="position-relative" ref={containerRef}>
            <Form.Control
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder={placeholder || "Search products or enter manually..."}
                className={className}
                autoComplete="off"
            />

            {/* Product Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div 
                    className="position-absolute w-100 mt-1" 
                    style={{ zIndex: 1050 }}
                >
                    <Card className="border shadow-sm">
                        <Card.Body className="p-0">
                            <div className="px-3 py-2 bg-light border-bottom">
                                <small className="text-muted fw-semibold">
                                    <FontAwesomeIcon icon={faSearch} className="me-1" />
                                    Available Products
                                </small>
                            </div>
                            <ListGroup variant="flush" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                {suggestions.map((product) => (
                                    <ListGroup.Item
                                        key={product.id}
                                        action
                                        onClick={() => handleProductSelect(product)}
                                        className="py-2 cursor-pointer"
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="d-flex align-items-center">
                                            <FontAwesomeIcon
                                                icon={faBox}
                                                className="text-muted me-3"
                                            />
                                            <div className="flex-grow-1">
                                                <div className="fw-semibold">{product.name}</div>
                                                <div className="small text-muted">
                                                    SKU: {product.sku} • 
                                                    ₹{product.price.toLocaleString('en-IN')} • 
                                                    GST: {product.gstRate}% • 
                                                    {product.category}
                                                </div>
                                            </div>
                                        </div>
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        </Card.Body>
                    </Card>
                </div>
            )}
        </div>
    );
}

export default ProductSelector;