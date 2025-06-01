import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBoxes,
    faExclamationTriangle,
    faChartLine,
    faTags
} from '@fortawesome/free-solid-svg-icons';

function InventorySummaryCards({ products, lowStockItems, categories }) {
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.isActive).length;
    const totalValue = products.reduce((sum, product) => sum + (product.price * (product.currentStock || 0)), 0);
    const outOfStockItems = products.filter(p => !p.isService && p.currentStock === 0).length;

    return (
        <Row className="mb-4">
            <Col md={3}>
                <Card className="summary-card border-left-primary">
                    <Card.Body>
                        <div className="d-flex align-items-center">
                            <div className="me-3">
                                <FontAwesomeIcon icon={faBoxes} className="text-primary fa-2x" />
                            </div>
                            <div>
                                <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                    Total Products
                                </div>
                                <div className="h5 mb-0 font-weight-bold text-gray-800">
                                    {totalProducts}
                                    <small className="text-muted ms-2">({activeProducts} active)</small>
                                </div>
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            </Col>
            <Col md={3}>
                <Card className="summary-card border-left-warning">
                    <Card.Body>
                        <div className="d-flex align-items-center">
                            <div className="me-3">
                                <FontAwesomeIcon icon={faExclamationTriangle} className="text-warning fa-2x" />
                            </div>
                            <div>
                                <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                                    Low Stock Items
                                </div>
                                <div className="h5 mb-0 font-weight-bold text-gray-800">
                                    {lowStockItems.length}
                                    <small className="text-muted ms-2">({outOfStockItems} out of stock)</small>
                                </div>
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            </Col>
            <Col md={3}>
                <Card className="summary-card border-left-success">
                    <Card.Body>
                        <div className="d-flex align-items-center">
                            <div className="me-3">
                                <FontAwesomeIcon icon={faChartLine} className="text-success fa-2x" />
                            </div>
                            <div>
                                <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                                    Total Value
                                </div>
                                <div className="h5 mb-0 font-weight-bold text-gray-800">
                                    ₹{totalValue.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            </Col>
            <Col md={3}>
                <Card className="summary-card border-left-info">
                    <Card.Body>
                        <div className="d-flex align-items-center">
                            <div className="me-3">
                                <FontAwesomeIcon icon={faTags} className="text-info fa-2x" />
                            </div>
                            <div>
                                <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                                    Categories
                                </div>
                                <div className="h5 mb-0 font-weight-bold text-gray-800">
                                    {categories.filter(c => c.isActive).length}
                                </div>
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
}

export default InventorySummaryCards;