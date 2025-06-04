import React from 'react';
import { Card, Row, Col, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

function ItemInfoSection({
    selectedItem,
    onEditItem,
    onAdjustStock
}) {
    if (!selectedItem) {
        return (
            <div className="d-flex align-items-center justify-content-center" style={{ height: '120px' }}>
                <div className="text-center text-muted">
                    <h6 className="mb-1">Select an item to view details</h6>
                    <small>Choose an item from the sidebar</small>
                </div>
            </div>
        );
    }

    const formatPrice = (price) => {
        return `₹ ${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Get current stock - check multiple possible field names
    const getCurrentStock = () => {
        return selectedItem.currentStock ||
            selectedItem.openingStock ||
            selectedItem.stock ||
            selectedItem.quantity ||
            0;
    };

    const getStockWarning = () => {
        if (selectedItem.type === 'service') return false;
        const stock = getCurrentStock();
        return stock === 0 || stock <= (selectedItem.minStockLevel || 0);
    };

    const currentStock = getCurrentStock();

    return (
        <Card className="border shadow-sm" style={{ borderRadius: '8px' }}>
            <Card.Body className="py-3 px-4">
                {/* Header Row */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center">
                        <h5 className="mb-0 fw-bold text-dark me-2" style={{ fontSize: '1.1rem' }}>
                            {selectedItem.name}
                        </h5>
                        <FontAwesomeIcon
                            icon={faEdit}
                            className="text-muted"
                            style={{ cursor: 'pointer', fontSize: '0.9rem' }}
                            onClick={() => onEditItem(selectedItem)}
                        />
                    </div>

                    {selectedItem.type === 'product' && (
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onAdjustStock(selectedItem)}
                            className="d-flex align-items-center gap-1 px-3 py-1"
                            style={{ fontSize: '0.75rem', fontWeight: '600' }}
                        >
                            <span style={{ fontSize: '0.8rem' }}>⚙️</span>
                            ADJUST ITEM
                        </Button>
                    )}
                </div>

                {/* Price and Stock Information */}
                <Row className="g-0">
                    <Col xs={6}>
                        <div className="mb-2">
                            <span className="text-uppercase fw-semibold text-muted" style={{ fontSize: '0.7rem' }}>
                                Sale Price:
                            </span>
                            <div className="fw-bold text-success" style={{ fontSize: '1rem' }}>
                                {formatPrice(selectedItem.salePrice || 0)}
                                <small className="text-muted ms-1" style={{ fontSize: '0.7rem' }}>(excl)</small>
                            </div>
                        </div>

                        {selectedItem.type === 'product' && selectedItem.buyPrice > 0 && (
                            <div>
                                <span className="text-uppercase fw-semibold text-muted" style={{ fontSize: '0.7rem' }}>
                                    Purchase Price:
                                </span>
                                <div className="fw-bold text-info" style={{ fontSize: '1rem' }}>
                                    {formatPrice(selectedItem.buyPrice)}
                                    <small className="text-muted ms-1" style={{ fontSize: '0.7rem' }}>(excl)</small>
                                </div>
                            </div>
                        )}
                    </Col>

                    <Col xs={6} className="text-end">
                        {selectedItem.type === 'product' && (
                            <>
                                <div className="mb-2 d-flex align-items-center justify-content-end">
                                    {getStockWarning() && (
                                        <FontAwesomeIcon
                                            icon={faExclamationTriangle}
                                            className="text-danger me-1"
                                            style={{ fontSize: '0.8rem' }}
                                        />
                                    )}
                                    <div>
                                        <span className="text-uppercase fw-semibold text-muted d-block text-end" style={{ fontSize: '0.7rem' }}>
                                            Stock Quantity:
                                        </span>
                                        <span className={`fw-bold ${getStockWarning() ? 'text-danger' : 'text-success'}`} style={{ fontSize: '1rem' }}>
                                            {currentStock}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-uppercase fw-semibold text-muted d-block text-end" style={{ fontSize: '0.7rem' }}>
                                        Stock Value:
                                    </span>
                                    <span className="fw-bold text-primary" style={{ fontSize: '1rem' }}>
                                        {formatPrice(currentStock * (selectedItem.salePrice || 0))}
                                    </span>
                                </div>
                            </>
                        )}
                    </Col>
                </Row>
            </Card.Body>

            {/* Custom Styles */}
            <style jsx>{`
                .card:hover {
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
                    transition: box-shadow 0.2s ease;
                }
                
                @media (max-width: 768px) {
                    .text-end {
                        text-align: left !important;
                        margin-top: 1rem;
                    }
                    
                    .d-flex.justify-content-between {
                        flex-direction: column;
                        align-items: flex-start !important;
                        gap: 0.5rem;
                    }
                }
                
                @media (max-width: 576px) {
                    .card-body {
                        padding: 1rem !important;
                    }
                }
            `}</style>
        </Card>
    );
}

export default ItemInfoSection;