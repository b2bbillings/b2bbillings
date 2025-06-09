import React from 'react';
import { Card, Row, Col, Button, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faExclamationTriangle, faCog } from '@fortawesome/free-solid-svg-icons';

function ItemInfoSection({
    selectedItem,
    onEditItem,
    onAdjustStock,
    currentCompany,
    isLoading = false
}) {
    if (!selectedItem) {
        return (
            <div className="d-flex align-items-center justify-content-center" style={{ height: '120px' }}>
                <div className="text-center text-muted">
                    {isLoading ? (
                        <>
                            <Spinner animation="border" size="sm" className="mb-2" />
                            <h6 className="mb-1">Loading item details...</h6>
                        </>
                    ) : (
                        <>
                            <h6 className="mb-1">Select an item to view details</h6>
                            <small>Choose an item from the sidebar</small>
                        </>
                    )}
                </div>
            </div>
        );
    }

    const formatPrice = (price) => {
        if (!price || isNaN(price)) return '₹ 0.00';
        return `₹ ${Number(price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Get current stock - check multiple possible field names with better safety
    const getCurrentStock = () => {
        if (!selectedItem) return 0;

        return Number(selectedItem.currentStock) ||
            Number(selectedItem.openingStock) ||
            Number(selectedItem.stock) ||
            Number(selectedItem.quantity) ||
            Number(selectedItem.openingQuantity) ||
            0;
    };

    const getStockWarning = () => {
        if (!selectedItem || selectedItem.type === 'service') return false;
        const stock = getCurrentStock();
        const minStock = Number(selectedItem.minStockLevel) || Number(selectedItem.minStockToMaintain) || 0;
        return stock === 0 || stock <= minStock;
    };

    const currentStock = getCurrentStock();
    const salePrice = Number(selectedItem.salePrice) || Number(selectedItem.salePriceWithoutTax) || 0;
    const buyPrice = Number(selectedItem.buyPrice) || Number(selectedItem.buyPriceWithoutTax) || 0;

    // Enhanced stock adjustment handler
    const handleAdjustStock = () => {
        if (!currentCompany?.id) {
            alert('Please select a company first');
            return;
        }

        if (selectedItem.type === 'service') {
            alert('Stock adjustment is not applicable for services');
            return;
        }

        console.log('🔧 ItemInfoSection: Initiating stock adjustment for:', selectedItem);

        // Call the parent's stock adjustment handler
        if (onAdjustStock) {
            onAdjustStock(selectedItem);
        }
    };

    // Enhanced edit handler
    const handleEditItem = () => {
        if (!currentCompany?.id) {
            alert('Please select a company first');
            return;
        }

        console.log('✏️ ItemInfoSection: Initiating edit for:', selectedItem);

        // Call the parent's edit handler
        if (onEditItem) {
            onEditItem(selectedItem);
        }
    };

    return (
        <Card className="border shadow-sm item-info-card" style={{ borderRadius: '8px' }}>
            <Card.Body className="py-3 px-4">
                {/* Header Row */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center">
                        <h5 className="mb-0 fw-bold text-dark me-2" style={{ fontSize: '1.1rem' }}>
                            {selectedItem.name}
                        </h5>
                        <FontAwesomeIcon
                            icon={faEdit}
                            className="text-muted edit-icon"
                            style={{ cursor: 'pointer', fontSize: '0.9rem' }}
                            onClick={handleEditItem}
                            title="Edit Item"
                        />
                        {selectedItem.itemCode && (
                            <small className="text-muted ms-2" style={{ fontSize: '0.8rem' }}>
                                #{selectedItem.itemCode}
                            </small>
                        )}
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        {/* Category Badge */}
                        {selectedItem.category && (
                            <span className="badge bg-light text-dark border" style={{ fontSize: '0.7rem' }}>
                                {selectedItem.category}
                            </span>
                        )}

                        {/* Adjust Stock Button - Enhanced */}
                        {selectedItem.type === 'product' && (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleAdjustStock}
                                className="d-flex align-items-center gap-1 px-3 py-1 adjust-stock-btn"
                                style={{ fontSize: '0.75rem', fontWeight: '600' }}
                                disabled={!currentCompany?.id || isLoading}
                                title="Adjust Stock Quantity"
                            >
                                <FontAwesomeIcon icon={faCog} size="xs" />
                                ADJUST STOCK
                            </Button>
                        )}
                    </div>
                </div>

                {/* Item Type and Status */}
                <div className="mb-3">
                    <div className="d-flex align-items-center gap-2">
                        <span className={`badge ${selectedItem.type === 'product' ? 'bg-primary' : 'bg-info'}`} style={{ fontSize: '0.7rem' }}>
                            {selectedItem.type === 'product' ? '📦 Product' : '🔧 Service'}
                        </span>

                        {selectedItem.isActive !== undefined && (
                            <span className={`badge ${selectedItem.isActive ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '0.7rem' }}>
                                {selectedItem.isActive ? '✓ Active' : '⏸ Inactive'}
                            </span>
                        )}

                        {selectedItem.type === 'product' && getStockWarning() && (
                            <span className="badge bg-warning text-dark" style={{ fontSize: '0.7rem' }}>
                                <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" size="xs" />
                                Low Stock
                            </span>
                        )}
                    </div>
                </div>

                {/* Price and Stock Information */}
                <Row className="g-0">
                    <Col xs={6}>
                        <div className="mb-2">
                            <span className="text-uppercase fw-semibold text-muted" style={{ fontSize: '0.7rem' }}>
                                Sale Price:
                            </span>
                            <div className="fw-bold text-success" style={{ fontSize: '1rem' }}>
                                {formatPrice(salePrice)}
                                <small className="text-muted ms-1" style={{ fontSize: '0.7rem' }}>
                                    {selectedItem.isSalePriceTaxInclusive ? '(incl)' : '(excl)'}
                                </small>
                            </div>
                        </div>

                        {selectedItem.type === 'product' && buyPrice > 0 && (
                            <div className="mb-2">
                                <span className="text-uppercase fw-semibold text-muted" style={{ fontSize: '0.7rem' }}>
                                    Purchase Price:
                                </span>
                                <div className="fw-bold text-info" style={{ fontSize: '1rem' }}>
                                    {formatPrice(buyPrice)}
                                    <small className="text-muted ms-1" style={{ fontSize: '0.7rem' }}>
                                        {selectedItem.isBuyPriceTaxInclusive ? '(incl)' : '(excl)'}
                                    </small>
                                </div>
                            </div>
                        )}

                        {/* GST Rate */}
                        {selectedItem.gstRate && (
                            <div>
                                <span className="text-uppercase fw-semibold text-muted" style={{ fontSize: '0.7rem' }}>
                                    GST Rate:
                                </span>
                                <div className="fw-bold text-secondary" style={{ fontSize: '0.9rem' }}>
                                    {selectedItem.gstRate}%
                                </div>
                            </div>
                        )}
                    </Col>

                    <Col xs={6} className="text-end">
                        {selectedItem.type === 'product' ? (
                            <>
                                <div className="mb-2 d-flex align-items-center justify-content-end">
                                    {getStockWarning() && (
                                        <FontAwesomeIcon
                                            icon={faExclamationTriangle}
                                            className="text-danger me-1"
                                            style={{ fontSize: '0.8rem' }}
                                            title="Low stock warning"
                                        />
                                    )}
                                    <div>
                                        <span className="text-uppercase fw-semibold text-muted d-block text-end" style={{ fontSize: '0.7rem' }}>
                                            Stock Quantity:
                                        </span>
                                        <span className={`fw-bold ${getStockWarning() ? 'text-danger' : 'text-success'}`} style={{ fontSize: '1rem' }}>
                                            {currentStock} {selectedItem.unit || 'PCS'}
                                        </span>
                                    </div>
                                </div>

                                <div className="mb-2">
                                    <span className="text-uppercase fw-semibold text-muted d-block text-end" style={{ fontSize: '0.7rem' }}>
                                        Stock Value:
                                    </span>
                                    <span className="fw-bold text-primary" style={{ fontSize: '1rem' }}>
                                        {formatPrice(currentStock * buyPrice)}
                                    </span>
                                </div>

                                {/* Min Stock Level */}
                                {(selectedItem.minStockLevel > 0 || selectedItem.minStockToMaintain > 0) && (
                                    <div>
                                        <span className="text-uppercase fw-semibold text-muted d-block text-end" style={{ fontSize: '0.7rem' }}>
                                            Min Stock:
                                        </span>
                                        <span className="fw-bold text-warning" style={{ fontSize: '0.9rem' }}>
                                            {selectedItem.minStockLevel || selectedItem.minStockToMaintain}
                                        </span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="d-flex align-items-center justify-content-end h-100">
                                <div className="text-center">
                                    <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                                        🔧 Service Item
                                    </span>
                                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                                        No stock tracking
                                    </div>
                                </div>
                            </div>
                        )}
                    </Col>
                </Row>

                {/* Additional Information */}
                {selectedItem.description && (
                    <div className="mt-3 pt-3 border-top">
                        <span className="text-uppercase fw-semibold text-muted" style={{ fontSize: '0.7rem' }}>
                            Description:
                        </span>
                        <div className="text-dark" style={{ fontSize: '0.85rem' }}>
                            {selectedItem.description}
                        </div>
                    </div>
                )}
            </Card.Body>

            {/* Enhanced Custom Styles */}
            <style jsx>{`
                .item-info-card {
                    transition: all 0.2s ease;
                }
                
                .item-info-card:hover {
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
                }
                
                .edit-icon:hover {
                    color: #007bff !important;
                    transform: scale(1.1);
                    transition: all 0.2s ease;
                }
                
                .adjust-stock-btn {
                    transition: all 0.2s ease;
                    border-radius: 6px;
                }
                
                .adjust-stock-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(13, 110, 253, 0.3);
                }
                
                .adjust-stock-btn:disabled {
                    opacity: 0.6;
                    transform: none;
                    cursor: not-allowed;
                }
                
                .badge {
                    border-radius: 4px;
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
                    
                    .adjust-stock-btn {
                        align-self: stretch;
                        justify-content: center;
                    }
                }
                
                @media (max-width: 576px) {
                    .card-body {
                        padding: 1rem !important;
                    }
                    
                    .adjust-stock-btn {
                        font-size: 0.7rem !important;
                        padding: 0.4rem 0.8rem !important;
                    }
                }
            `}</style>
        </Card>
    );
}

export default ItemInfoSection;