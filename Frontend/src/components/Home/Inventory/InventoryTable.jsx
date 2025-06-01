import React from 'react';
import { Card, Table, Button, Badge, Form, Row, Col, InputGroup, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSearch,
    faEdit,
    faTrash,
    faAdjust,
    faEllipsisV,
    faFilter,
    faDownload
} from '@fortawesome/free-solid-svg-icons';

function InventoryTable({
    filteredProducts,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    stockFilter,
    setStockFilter,
    categories,
    onCreateProduct,
    onEditProduct,
    onDeleteProduct,
    onStockAdjustment
}) {

    const getStockStatus = (product) => {
        if (product.isService) return 'service';
        if (product.currentStock === 0) return 'out';
        if (product.currentStock <= product.minStockLevel) return 'low';
        return 'good';
    };

    const getStockBadge = (product) => {
        const status = getStockStatus(product);

        switch (status) {
            case 'service':
                return <Badge bg="secondary" className="stock-status-service">Service</Badge>;
            case 'out':
                return <Badge bg="danger" className="stock-status-out">Out of Stock</Badge>;
            case 'low':
                return <Badge bg="warning" className="stock-status-low">Low Stock</Badge>;
            case 'good':
                return <Badge bg="success" className="stock-status-good">In Stock</Badge>;
            default:
                return <Badge bg="secondary">Unknown</Badge>;
        }
    };

    const handleExport = () => {
        // Create CSV content
        const headers = ['Name', 'SKU', 'Category', 'Price', 'Current Stock', 'Min Stock', 'Status', 'GST Rate'];
        const csvContent = [
            headers.join(','),
            ...filteredProducts.map(product => [
                `"${product.name}"`,
                product.sku,
                product.category,
                product.price,
                product.isService ? 'N/A' : product.currentStock,
                product.isService ? 'N/A' : product.minStockLevel,
                getStockStatus(product),
                `${product.gstRate}%`
            ].join(','))
        ].join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `inventory_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Card className="border-0 shadow-sm">
            {/* Filters */}
            <Card.Header className="bg-white border-0 pb-0">
                <Row className="align-items-center">
                    <Col md={4}>
                        <InputGroup>
                            <InputGroup.Text>
                                <FontAwesomeIcon icon={faSearch} className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Search products or SKU..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="border-start-0"
                            />
                        </InputGroup>
                    </Col>

                    <Col md={2}>
                        <Form.Select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">All Categories</option>
                            {categories.map(category => (
                                <option key={category.id} value={category.name}>
                                    {category.name}
                                </option>
                            ))}
                        </Form.Select>
                    </Col>

                    <Col md={2}>
                        <Form.Select
                            value={stockFilter}
                            onChange={(e) => setStockFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">All Stock</option>
                            <option value="in-stock">In Stock</option>
                            <option value="low-stock">Low Stock</option>
                            <option value="out-of-stock">Out of Stock</option>
                        </Form.Select>
                    </Col>

                    <Col md={4} className="text-end">
                        <div className="d-flex gap-2 justify-content-end">
                            <Button
                                variant="outline-success"
                                size="sm"
                                onClick={handleExport}
                                className="export-btn"
                            >
                                <FontAwesomeIcon icon={faDownload} className="me-1" />
                                Export
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={onCreateProduct}
                            >
                                Add Product
                            </Button>
                        </div>
                    </Col>
                </Row>
            </Card.Header>

            <Card.Body className="p-0">
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-5">
                        <div className="text-muted mb-3" style={{ fontSize: '3rem' }}>
                            🔍
                        </div>
                        <h5>No products found</h5>
                        <p className="text-muted">
                            {searchQuery || categoryFilter || stockFilter
                                ? 'Try adjusting your filters to see more results.'
                                : 'Start by adding your first product.'
                            }
                        </p>
                        {!searchQuery && !categoryFilter && !stockFilter && (
                            <Button variant="primary" onClick={onCreateProduct}>
                                Add Product
                            </Button>
                        )}
                    </div>
                ) : (
                    <Table responsive hover className="mb-0">
                        <thead>
                            <tr>
                                <th style={{ width: '25%' }}>Product</th>
                                <th style={{ width: '15%' }}>Category</th>
                                <th style={{ width: '12%' }}>Price</th>
                                <th style={{ width: '12%' }}>Current Stock</th>
                                <th style={{ width: '12%' }}>Status</th>
                                <th style={{ width: '10%' }}>GST Rate</th>
                                <th style={{ width: '14%' }} className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((product) => (
                                <tr key={product.id}>
                                    <td>
                                        <div className="d-flex align-items-center">
                                            <div className="product-image-placeholder me-3">
                                                📦
                                            </div>
                                            <div>
                                                <div className="fw-semibold">{product.name}</div>
                                                <div className="sku-display">{product.sku}</div>
                                                {product.isService && (
                                                    <div className="service-indicator">
                                                        <small>Service</small>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <Badge bg="light" text="dark" className="category-badge">
                                            {product.category}
                                        </Badge>
                                    </td>
                                    <td>
                                        <span className="price-display">
                                            ₹{product.price.toLocaleString()}
                                        </span>
                                        <div>
                                            <small className="text-muted">per {product.unit}</small>
                                        </div>
                                    </td>
                                    <td>
                                        {product.isService ? (
                                            <span className="text-muted">N/A</span>
                                        ) : (
                                            <div>
                                                <div className="fw-semibold">
                                                    {product.currentStock} {product.unit}
                                                </div>
                                                <small className="text-muted">
                                                    Min: {product.minStockLevel}
                                                </small>
                                                {!product.isService && (
                                                    <div className="stock-progress mt-1">
                                                        <div
                                                            className={`stock-progress-bar stock-progress-${getStockStatus(product)}`}
                                                            style={{
                                                                width: `${Math.max(10, Math.min(100, (product.currentStock / (product.minStockLevel * 2)) * 100))}%`
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        {getStockBadge(product)}
                                    </td>
                                    <td>
                                        <span className="fw-semibold">{product.gstRate}%</span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                onClick={() => onEditProduct(product)}
                                                title="Edit Product"
                                            >
                                                <FontAwesomeIcon icon={faEdit} />
                                            </Button>

                                            {!product.isService && (
                                                <Button
                                                    variant="outline-info"
                                                    size="sm"
                                                    onClick={() => onStockAdjustment(product)}
                                                    title="Adjust Stock"
                                                >
                                                    <FontAwesomeIcon icon={faAdjust} />
                                                </Button>
                                            )}

                                            <Dropdown drop="start">
                                                <Dropdown.Toggle
                                                    variant="outline-secondary"
                                                    size="sm"
                                                    id={`dropdown-${product.id}`}
                                                >
                                                    <FontAwesomeIcon icon={faEllipsisV} />
                                                </Dropdown.Toggle>

                                                <Dropdown.Menu>
                                                    <Dropdown.Item onClick={() => onEditProduct(product)}>
                                                        <FontAwesomeIcon icon={faEdit} className="me-2" />
                                                        Edit Product
                                                    </Dropdown.Item>
                                                    {!product.isService && (
                                                        <Dropdown.Item onClick={() => onStockAdjustment(product)}>
                                                            <FontAwesomeIcon icon={faAdjust} className="me-2" />
                                                            Adjust Stock
                                                        </Dropdown.Item>
                                                    )}
                                                    <Dropdown.Divider />
                                                    <Dropdown.Item
                                                        onClick={() => onDeleteProduct(product.id)}
                                                        className="text-danger"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} className="me-2" />
                                                        Delete Product
                                                    </Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Card.Body>

            {filteredProducts.length > 0 && (
                <Card.Footer className="bg-white border-0 pt-3">
                    <div className="d-flex justify-content-between align-items-center text-muted">
                        <small>
                            Showing {filteredProducts.length} of {filteredProducts.length} products
                        </small>
                        <small>
                            Total value: ₹{filteredProducts.reduce((sum, p) => sum + (p.price * (p.currentStock || 0)), 0).toLocaleString()}
                        </small>
                    </div>
                </Card.Footer>
            )}
        </Card>
    );
}

export default InventoryTable;