import React, { useState } from 'react';
import { Button, Form, Badge, Dropdown, Row, Col, ListGroup, InputGroup, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faPlus, faFilter, faEllipsisV, faBox, faCog, faFolder, faTimes } from '@fortawesome/free-solid-svg-icons';

function InventorySidebar({
    items = [],
    selectedItem,
    onItemSelect,
    onAddItem,
    onAddCategory,
    searchQuery,
    onSearchChange,
    activeType = 'products'
}) {
    const [showFilters, setShowFilters] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [categoryFormData, setCategoryFormData] = useState({
        name: '',
        description: '',
        isActive: true
    });

    const filteredItems = items.filter(item => {
        const searchMatch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.itemCode && item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()));
        return searchMatch;
    });

    const handleItemClick = (item) => {
        onItemSelect(item);
    };

    // Category form handlers
    const handleAddCategoryClick = () => {
        setShowCategoryModal(true);
    };

    const handleCloseCategoryModal = () => {
        setShowCategoryModal(false);
        setCategoryFormData({
            name: '',
            description: '',
            isActive: true
        });
    };

    const handleCategoryInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCategoryFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSaveCategory = (e) => {
        e.preventDefault();

        if (!categoryFormData.name.trim()) {
            alert('Please enter a category name');
            return;
        }

        // Call parent's onAddCategory function with the form data
        const newCategory = {
            ...categoryFormData,
            id: Date.now(),
            createdAt: new Date().toISOString()
        };

        onAddCategory(newCategory);
        handleCloseCategoryModal();
        alert(`Category "${categoryFormData.name}" created successfully!`);
    };

    // Get current stock - check multiple possible field names
    const getCurrentStock = (item) => {
        return item.currentStock ||
            item.openingStock ||
            item.stock ||
            item.quantity ||
            0;
    };

    const getQuantityDisplay = (item) => {
        if (item.type === 'service') return '-';
        return getCurrentStock(item);
    };

    const getQuantityColor = (item) => {
        if (item.type === 'service') return 'text-muted';
        const stock = getCurrentStock(item);
        if (stock === 0) return 'text-danger';
        if (stock <= (item.minStockLevel || 0)) return 'text-warning';
        return 'text-success';
    };

    const getStockBadge = (item) => {
        if (item.type === 'service') return null;

        const stock = getCurrentStock(item);

        if (stock === 0) {
            return <Badge bg="danger" className="small">Out</Badge>;
        }

        if (stock > 0 && stock <= (item.minStockLevel || 0)) {
            return <Badge bg="warning" className="small">Low</Badge>;
        }

        return null;
    };

    return (
        <>
            <div className="inventory-sidebar h-100 bg-light border-end mt-1">
                {/* Header Section */}
                <div className="sidebar-header p-3 bg-white border-bottom">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0 fw-bold text-dark small mt-3 ms-1">
                            {activeType === 'products' ? 'Products' : 'Services'}
                        </h6>
                        <div className="d-flex gap-2 mt-3 me-1">
                            <Dropdown>
                                <Dropdown.Toggle
                                    size="sm"
                                    variant="primary"
                                    className="btn-add-item"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="me-1" size="xs" />
                                    <span className="small">Add Item</span>
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                    <Dropdown.Item onClick={() => onAddItem('product')}>
                                        Add Product
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => onAddItem('service')}>
                                        Add Service
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>

                            <Button
                                size="sm"
                                variant="outline-secondary"
                                className="btn-add-category"
                                onClick={handleAddCategoryClick}
                                title="Add Category"
                            >
                                <FontAwesomeIcon icon={faFolder} className="me-1" size="xs" />
                                <span className="small">Add Category</span>
                            </Button>
                        </div>
                    </div>

                    {/* Search Input */}
                    <InputGroup size="sm">
                        <InputGroup.Text className="bg-light border-end-0 text-muted">
                            <FontAwesomeIcon icon={faSearch} size="xs" />
                        </InputGroup.Text>
                        <Form.Control
                            type="text"
                            placeholder={`Search ${activeType}...`}
                            value={searchQuery}
                            onChange={e => onSearchChange(e.target.value)}
                            className="border-start-0 bg-light text-dark"
                            style={{ fontSize: '0.75rem' }}
                        />
                    </InputGroup>
                </div>

                {/* Items List */}
                <div className="items-list p-2" style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-4">
                            <div className="mb-2" style={{ fontSize: '1.5rem', opacity: 0.5 }}>📦</div>
                            <div className="text-muted small fw-medium">No {activeType} found</div>
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                {searchQuery ? 'Try different search terms' : 'Click Add Item to create one'}
                            </small>
                        </div>
                    ) : (
                        <ListGroup variant="flush">
                            {filteredItems.map((item) => (
                                <ListGroup.Item
                                    key={item.id}
                                    action
                                    active={selectedItem?.id === item.id}
                                    onClick={() => handleItemClick(item)}
                                    className={`border-0 mb-2 rounded-2 item-card ${selectedItem?.id === item.id ? 'bg-primary bg-opacity-10 border-primary' : 'bg-white border'
                                        }`}
                                    style={{
                                        padding: '0.75rem',
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer',
                                        position: 'relative'
                                    }}
                                >
                                    <div className="d-flex justify-content-between align-items-start">
                                        <div className="flex-grow-1">
                                            <div className="d-flex align-items-center mb-1">
                                                <FontAwesomeIcon
                                                    icon={item.type === 'service' ? faCog : faBox}
                                                    className={`me-2 ${selectedItem?.id === item.id ? 'text-primary' : 'text-muted'
                                                        }`}
                                                    size="sm"
                                                />
                                                <span className={`fw-semibold small ${selectedItem?.id === item.id ? 'text-primary' : 'text-dark'
                                                    }`}>
                                                    {item.name}
                                                </span>
                                            </div>
                                            <div className={`${selectedItem?.id === item.id ? 'text-primary' : 'text-muted'
                                                }`} style={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>
                                                {item.itemCode || 'No Code'}
                                            </div>
                                            {/* Stock Badge */}
                                            <div className="mt-1">
                                                {getStockBadge(item)}
                                            </div>
                                        </div>
                                        <div className="text-end">
                                            <div className={`fw-bold small ${getQuantityColor(item)}`}>
                                                {item.type === 'service' ? 'Service' : `${getQuantityDisplay(item)} ${item.unit || 'PCS'}`}
                                            </div>
                                            {item.type !== 'service' && (
                                                <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                                    ₹{item.salePrice?.toLocaleString('en-IN') || '0'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {selectedItem?.id === item.id && (
                                        <div
                                            className="position-absolute start-0 top-0 bottom-0 bg-primary rounded-start"
                                            style={{ width: '3px' }}
                                        />
                                    )}
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    )}
                </div>
            </div>

            {/* Add Category Modal */}
            <Modal show={showCategoryModal} onHide={handleCloseCategoryModal} centered>
                <Modal.Header closeButton className="pb-3">
                    <Modal.Title className="fs-5 fw-bold">
                        <FontAwesomeIcon icon={faFolder} className="me-2 text-secondary" />
                        Add New Category
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="py-4">
                    <Form onSubmit={handleSaveCategory}>
                        <Row>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold small text-dark">
                                        Category Name <span className="text-danger">*</span>
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name"
                                        value={categoryFormData.name}
                                        onChange={handleCategoryInputChange}
                                        placeholder="Enter category name"
                                        className="border-2"
                                        required
                                        autoFocus
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold small text-dark">
                                        Description
                                    </Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        name="description"
                                        value={categoryFormData.description}
                                        onChange={handleCategoryInputChange}
                                        placeholder="Enter category description (optional)"
                                        className="border-2"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Check
                                        type="checkbox"
                                        name="isActive"
                                        label="Active Category"
                                        checked={categoryFormData.isActive}
                                        onChange={handleCategoryInputChange}
                                        className="fw-semibold small text-dark"
                                    />
                                    <Form.Text className="text-muted small">
                                        Active categories will be available for selection when creating items
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="pt-3 border-top">
                    <Button
                        variant="outline-secondary"
                        onClick={handleCloseCategoryModal}
                        className="me-2"
                    >
                        <FontAwesomeIcon icon={faTimes} className="me-1" size="sm" />
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSaveCategory}
                        className="px-4"
                    >
                        <FontAwesomeIcon icon={faFolder} className="me-1" size="sm" />
                        Save Category
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Professional Styling to Match BankSidebar */}
            <style>
                {`
                .btn-add-item,
                .btn-add-category {
                    font-size: 0.75rem;
                    font-weight: 600;
                    padding: 0.4rem 0.8rem;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }

                .btn-add-item:hover,
                .btn-add-category:hover {
                    transform: translateY(-1px);
                }

                .btn-add-item:hover {
                    box-shadow: 0 2px 8px rgba(13, 110, 253, 0.3);
                }

                .btn-add-category {
                    color: #6c757d;
                    border-color: #6c757d;
                }

                .btn-add-category:hover {
                    background: #6c757d;
                    border-color: #6c757d;
                    color: white;
                    box-shadow: 0 2px 8px rgba(108, 117, 125, 0.3);
                }

                .item-card:hover {
                    transform: translateX(2px);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
                }

                .item-card.active {
                    transform: translateX(2px);
                    box-shadow: 0 3px 12px rgba(13, 110, 253, 0.15) !important;
                }

                .items-list::-webkit-scrollbar {
                    width: 6px;
                }

                .items-list::-webkit-scrollbar-track {
                    background: transparent;
                }

                .items-list::-webkit-scrollbar-thumb {
                    background: #dee2e6;
                    border-radius: 3px;
                }

                .items-list::-webkit-scrollbar-thumb:hover {
                    background: #adb5bd;
                }

                /* Stock Badge Styling */
                .badge.small {
                    font-size: 0.6rem;
                    padding: 0.2rem 0.4rem;
                    border-radius: 4px;
                }

                /* Modal Styling */
                .modal-header {
                    background: #f8f9fa;
                    border-bottom: 2px solid #dee2e6;
                }

                .modal-footer {
                    background: #f8f9fa;
                }

                .form-control:focus {
                    border-color: #007bff;
                    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
                }

                .form-control.border-2 {
                    border-width: 2px !important;
                }

                /* Animation */
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .item-card {
                    animation: fadeInUp 0.3s ease-out;
                }

                .item-card:nth-child(1) { animation-delay: 0.05s; }
                .item-card:nth-child(2) { animation-delay: 0.1s; }
                .item-card:nth-child(3) { animation-delay: 0.15s; }
                .item-card:nth-child(4) { animation-delay: 0.2s; }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .sidebar-header {
                        padding: 0.75rem !important;
                    }

                    .items-list {
                        padding: 0.5rem !important;
                    }

                    .item-card {
                        padding: 0.6rem !important;
                        margin-bottom: 0.5rem !important;
                    }

                    .btn-add-item,
                    .btn-add-category {
                        font-size: 0.7rem;
                        padding: 0.3rem 0.6rem;
                    }

                    .d-flex.gap-2 {
                        flex-direction: column;
                        gap: 0.5rem !important;
                    }
                }

                @media (max-width: 576px) {
                    .sidebar-header .d-flex:first-child {
                        flex-direction: column;
                        gap: 0.75rem;
                        align-items: stretch;
                    }

                    .btn-add-item,
                    .btn-add-category {
                        width: 100%;
                        text-align: center;
                    }

                    .d-flex.gap-2 {
                        width: 100%;
                    }
                }

                /* Enhanced Visual Elements */
                .inventory-sidebar {
                    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                }

                .sidebar-header {
                    background: white !important;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                }

                .item-card {
                    background: white !important;
                    border: 1px solid #e9ecef !important;
                    transition: all 0.2s ease !important;
                }

                .item-card:hover {
                    border-color: #007bff !important;
                    background: #f8f9fa !important;
                }

                .item-card.active {
                    background: rgba(13, 110, 253, 0.08) !important;
                    border-color: #007bff !important;
                }

                /* Input Group Styling */
                .input-group-text {
                    background: #f8f9fa !important;
                    border-color: #dee2e6 !important;
                }

                .form-control {
                    background: #f8f9fa !important;
                    border-color: #dee2e6 !important;
                }

                .form-control:focus {
                    background: white !important;
                    border-color: #007bff !important;
                    box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25) !important;
                }
                `}
            </style>
        </>
    );
}

export default InventorySidebar;