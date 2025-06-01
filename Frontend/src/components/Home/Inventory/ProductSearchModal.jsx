import React, { useState, useRef, useEffect } from 'react';
import { Modal, Form, InputGroup, Badge, Button, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSearch,
    faTimes,
    faSpinner,
    faCopy,
    faDownload,
    faKeyboard,
    faArrowUp,
    faArrowDown
} from '@fortawesome/free-solid-svg-icons';
import './ProductSearchModal.css';

function ProductSearchModal({ show, onHide, products, onProductSelect }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const searchRef = useRef(null);
    const resultsRef = useRef([]);

    // Auto-focus search input when modal opens
    useEffect(() => {
        if (show && searchRef.current) {
            // Use requestAnimationFrame for better performance
            requestAnimationFrame(() => {
                setTimeout(() => {
                    searchRef.current?.focus();
                }, 100);
            });
        }
    }, [show]);

    // Reset state when modal closes
    useEffect(() => {
        if (!show) {
            setSearchQuery('');
            setSearchResults([]);
            setSelectedIndex(-1);
        }
    }, [show]);

    // Search products function - optimized for performance
    const searchProducts = (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            setSelectedIndex(-1);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);

        // Use requestAnimationFrame for smooth performance
        requestAnimationFrame(() => {
            try {
                // Filter products based on search query
                const filteredProducts = products.filter(product =>
                    product.name?.toLowerCase().includes(query.toLowerCase()) ||
                    product.sku?.toLowerCase().includes(query.toLowerCase()) ||
                    product.itemCode?.toLowerCase().includes(query.toLowerCase()) ||
                    product.hsnNumber?.toLowerCase().includes(query.toLowerCase()) ||
                    product.category?.toLowerCase().includes(query.toLowerCase()) ||
                    product.description?.toLowerCase().includes(query.toLowerCase())
                );

                // Sort by relevance (name matches first)
                const sortedResults = filteredProducts.sort((a, b) => {
                    const aNameMatch = a.name?.toLowerCase().includes(query.toLowerCase());
                    const bNameMatch = b.name?.toLowerCase().includes(query.toLowerCase());

                    if (aNameMatch && !bNameMatch) return -1;
                    if (!aNameMatch && bNameMatch) return 1;

                    return a.name?.localeCompare(b.name) || 0;
                });

                setSearchResults(sortedResults.slice(0, 20));
                setSelectedIndex(-1);
                setIsSearching(false);

            } catch (error) {
                console.error('Error searching products:', error);
                setSearchResults([]);
                setIsSearching(false);
            }
        });
    };

    // Handle search input change with optimized debouncing
    const handleSearchChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        // Faster debounce for better responsiveness
        clearTimeout(window.productSearchTimeout);
        window.productSearchTimeout = setTimeout(() => {
            searchProducts(query);
        }, 100);
    };

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < searchResults.length - 1 ? prev + 1 : 0
                );
                break;

            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : searchResults.length - 1
                );
                break;

            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && searchResults[selectedIndex]) {
                    handleProductSelect(searchResults[selectedIndex]);
                }
                break;

            case 'Escape':
                e.preventDefault();
                onHide();
                break;

            default:
                break;
        }
    };

    // Handle product selection - simplified for better performance
    const handleProductSelect = (product) => {
        onProductSelect(product);
        onHide();
    };

    // Clear search
    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setSelectedIndex(-1);
        searchRef.current?.focus();
    };

    // Smooth scroll selected item into view
    useEffect(() => {
        if (selectedIndex >= 0 && resultsRef.current[selectedIndex]) {
            resultsRef.current[selectedIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        }
    }, [selectedIndex]);

    return (
        <>
            {/* Optimized Custom Backdrop */}
            {show && (
                <div className="custom-backdrop-optimized" onClick={onHide}>
                    <div className="backdrop-blur-optimized"></div>
                </div>
            )}

            <Modal
                show={show}
                onHide={onHide}
                size="lg"
                centered
                backdrop={false}
                className="product-search-modal-optimized"
                style={{ zIndex: 1070 }}
            >
                <div className="modal-shadow-wrapper-optimized">
                    <Modal.Header className="border-0 pb-2 bg-white rounded-top">
                        <Modal.Title className="fw-bold d-flex align-items-center w-100">
                            <div className="d-flex align-items-center">
                                <FontAwesomeIcon icon={faSearch} className="me-2 text-primary" />
                                <span>Search Products Database</span>
                                <Badge bg="secondary" className="ms-2 small animated-badge">
                                    {products?.length || 0} items
                                </Badge>
                            </div>
                            <Button
                                variant="link"
                                className="p-0 border-0 text-muted ms-auto close-btn"
                                onClick={onHide}
                            >
                                <FontAwesomeIcon icon={faTimes} size="lg" />
                            </Button>
                        </Modal.Title>
                    </Modal.Header>

                    <Modal.Body className="px-4 pb-4 bg-white rounded-bottom">
                        {/* Optimized Search Input */}
                        <div className="mb-3">
                            <InputGroup size="lg" className="search-input-group-optimized">
                                <InputGroup.Text className="bg-light border-end-0 search-icon-container">
                                    <FontAwesomeIcon
                                        icon={isSearching ? faSpinner : faSearch}
                                        className={`search-input-icon ${isSearching ? 'fa-spin text-primary loading-spinner' : 'text-muted'}`}
                                    />
                                </InputGroup.Text>
                                <Form.Control
                                    ref={searchRef}
                                    type="text"
                                    placeholder="Search by name, SKU, code, HSN, category..."
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    onKeyDown={handleKeyDown}
                                    className="border-start-0 shadow-none search-input-enhanced"
                                    style={{ fontSize: '1.1rem' }}
                                />
                                {searchQuery && (
                                    <Button
                                        variant="outline-secondary"
                                        onClick={clearSearch}
                                        className="border-start-0 clear-btn"
                                    >
                                        <FontAwesomeIcon icon={faTimes} />
                                    </Button>
                                )}
                            </InputGroup>
                        </div>

                        {/* Keyboard Shortcuts Help */}
                        <div className="mb-3 text-center">
                            <small className="text-muted d-flex align-items-center justify-content-center gap-3 flex-wrap keyboard-help">
                                <span className="d-flex align-items-center">
                                    <FontAwesomeIcon icon={faKeyboard} className="me-1" />
                                    Keyboard shortcuts:
                                </span>
                                <span className="d-flex align-items-center">
                                    <FontAwesomeIcon icon={faArrowUp} className="me-1" />
                                    <FontAwesomeIcon icon={faArrowDown} className="me-1" />
                                    Navigate
                                </span>
                                <span>Enter: Select</span>
                                <span>Esc: Close</span>
                            </small>
                        </div>

                        {/* Optimized Search Results */}
                        <div className="search-results-container-optimized" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            {searchQuery && searchResults.length === 0 && !isSearching && (
                                <div className="text-center py-5 text-muted empty-state">
                                    <FontAwesomeIcon icon={faSearch} size="3x" className="mb-3 opacity-50 empty-icon" />
                                    <div className="h5">No products found</div>
                                    <p>Try searching with different keywords</p>
                                </div>
                            )}

                            {!searchQuery && (
                                <div className="text-center py-5 text-muted empty-state">
                                    <FontAwesomeIcon icon={faSearch} size="3x" className="mb-3 opacity-50 empty-icon" />
                                    <div className="h5">Start typing to search</div>
                                    <p>Search across {products?.length || 0} products by name, SKU, HSN, or category</p>
                                </div>
                            )}

                            {/* Loading state */}
                            {isSearching && (
                                <div className="text-center py-5 loading-state">
                                    <FontAwesomeIcon icon={faSpinner} size="3x" className="mb-3 fa-spin text-primary loading-spinner" />
                                    <div className="h5">Searching...</div>
                                </div>
                            )}

                            {/* Results - simplified for performance */}
                            {searchResults.map((product, index) => (
                                <div
                                    key={product.id || index}
                                    ref={el => resultsRef.current[index] = el}
                                    className={`search-result-item-optimized p-3 border rounded mb-2 ${index === selectedIndex ? 'border-primary bg-primary bg-opacity-10 shadow-sm' : 'border-light bg-white'
                                        }`}
                                    onClick={() => handleProductSelect(product)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <Row className="align-items-center">
                                        <Col md={8}>
                                            <div className="fw-semibold text-primary mb-1 product-name">
                                                {product.name || 'Unnamed Product'}
                                            </div>
                                            <div className="small text-muted mb-2 product-details">
                                                <Row>
                                                    <Col sm={6}>
                                                        <strong>SKU:</strong> {product.sku || product.itemCode || 'N/A'}
                                                    </Col>
                                                    <Col sm={6}>
                                                        <strong>HSN:</strong> {product.hsnNumber || 'N/A'}
                                                    </Col>
                                                </Row>
                                                <Row>
                                                    <Col sm={6}>
                                                        <strong>Category:</strong> {product.category || 'N/A'}
                                                    </Col>
                                                    <Col sm={6}>
                                                        <strong>Unit:</strong> {product.unit || 'N/A'}
                                                    </Col>
                                                </Row>
                                            </div>
                                            <div className="d-flex gap-2 align-items-center product-badges">
                                                <Badge bg={product.type === 'service' || product.isService ? 'info' : 'primary'} className="small animated-badge">
                                                    {(product.type === 'service' || product.isService) ? 'Service' : 'Product'}
                                                </Badge>
                                                <span className="small text-muted">
                                                    GST: {product.gstRate || 18}%
                                                </span>
                                                {!(product.type === 'service' || product.isService) && (
                                                    <span className="small text-muted">
                                                        Stock: {product.currentStock || product.stock || 0}
                                                    </span>
                                                )}
                                            </div>
                                        </Col>
                                        <Col md={4} className="text-end">
                                            <div className="text-success fw-bold mb-1 product-price">
                                                ₹{product.price?.toLocaleString() || '0'}
                                            </div>
                                            <div className="small text-muted mb-2">
                                                Click to select
                                            </div>
                                            <FontAwesomeIcon
                                                icon={faCopy}
                                                className="text-muted select-icon"
                                                size="lg"
                                            />
                                        </Col>
                                    </Row>
                                </div>
                            ))}

                            {searchResults.length >= 20 && (
                                <div className="text-center py-3 border-top mt-3 more-results">
                                    <small className="text-muted">
                                        Showing first 20 results. Refine your search for more specific results.
                                    </small>
                                </div>
                            )}
                        </div>
                    </Modal.Body>
                </div>
            </Modal>
        </>
    );
}

export default ProductSearchModal;