import React, { useState, useEffect } from 'react';
import { Table, Button, Form, InputGroup, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faEdit, faToggleOn, faToggleOff, faPercentage } from '@fortawesome/free-solid-svg-icons';
import ProductSelector from './ProductSelector';

function PurchaseItemsTable({ items = [], onItemChange, onAddItem, onRemoveItem, purchaseType }) {
    // Global tax inclusive state for all items
    const [globalTaxInclusive, setGlobalTaxInclusive] = useState(false);

    const handleInputChange = (index, field, value) => {
        onItemChange(index, field, value);
    };

    const handleProductSelect = (index, product) => {
        if (product) {
            // Auto-fill the product name and GST rate from inventory
            onItemChange(index, 'productService', product.name);
            onItemChange(index, 'selectedProduct', product);
            // Auto-fill GST rate from inventory
            onItemChange(index, 'gstRate', product.gstRate || 0);
            // Set tax inclusive based on global setting
            onItemChange(index, 'taxInclusive', globalTaxInclusive);
            // Don't auto-fill price - let user enter manually
        }
    };

    // Handle editing a selected product
    const handleEditProduct = (index) => {
        onItemChange(index, 'selectedProduct', null);
        // Keep the product name and GST rate but allow editing
    };

    // Handle global tax inclusive toggle
    const handleGlobalTaxInclusiveChange = (isChecked) => {
        setGlobalTaxInclusive(isChecked);

        // Apply to all existing items
        items.forEach((item, index) => {
            if (item.productService) {
                onItemChange(index, 'taxInclusive', isChecked);
            }
        });
    };

    // Handle individual item tax inclusive toggle
    const handleIndividualTaxInclusiveToggle = (index) => {
        const currentValue = items[index]?.taxInclusive || false;
        onItemChange(index, 'taxInclusive', !currentValue);
    };

    // Apply global tax inclusive to new items
    useEffect(() => {
        items.forEach((item, index) => {
            if (item.productService && item.taxInclusive === undefined) {
                onItemChange(index, 'taxInclusive', globalTaxInclusive);
            }
        });
    }, [items.length, globalTaxInclusive]);

    const calculateItemTotal = (quantity, price) => {
        return (parseFloat(quantity || 0) * parseFloat(price || 0)).toFixed(2);
    };

    const getGSTAmount = (item, purchaseType) => {
        if (purchaseType !== 'gst' || !item.gstRate) return 0;

        const baseAmount = parseFloat(item.total || 0);
        const itemTaxInclusive = item.taxInclusive !== undefined ? item.taxInclusive : globalTaxInclusive;

        if (itemTaxInclusive) {
            const gstAmount = baseAmount - (baseAmount / (1 + parseFloat(item.gstRate) / 100));
            return gstAmount;
        } else {
            return (baseAmount * parseFloat(item.gstRate)) / 100;
        }
    };

    const getFinalTotal = (item) => {
        const baseTotal = parseFloat(calculateItemTotal(item.quantity, item.price));

        if (purchaseType !== 'gst' || !item.gstRate) {
            return baseTotal;
        }

        const itemTaxInclusive = item.taxInclusive !== undefined ? item.taxInclusive : globalTaxInclusive;

        if (itemTaxInclusive) {
            return baseTotal;
        } else {
            const gstAmount = getGSTAmount(item, purchaseType);
            return baseTotal + gstAmount;
        }
    };

    // Helper function to check if GST features should be shown
    const showGSTFeatures = () => {
        return purchaseType === 'gst';
    };

    return (
        <div className="items-table-container">
            <div className="table-responsive">
                <Table bordered className="items-table">
                    <thead className="table-light">
                        <tr>
                            <th style={{ width: showGSTFeatures() ? '35%' : '45%' }}>Product/Service</th>
                            <th style={{ width: '10%' }}>Quantity</th>
                            <th style={{ width: showGSTFeatures() ? '25%' : '30%' }}>
                                <div className="d-flex align-items-center justify-content-between">
                                    <span>Price (₹)</span>
                                    {showGSTFeatures() && (
                                        <div className="d-flex align-items-center gap-2">
                                            <Form.Check
                                                type="switch"
                                                id="global-tax-inclusive-purchase"
                                                checked={globalTaxInclusive}
                                                onChange={(e) => handleGlobalTaxInclusiveChange(e.target.checked)}
                                                className="mb-0"
                                            />
                                            <small className="text-muted">
                                                {globalTaxInclusive ? 'Tax Inc.' : 'Tax Exc.'}
                                            </small>
                                        </div>
                                    )}
                                </div>
                            </th>
                            {showGSTFeatures() && <th style={{ width: '10%' }}>GST (%)</th>}
                            <th style={{ width: '15%' }}>Total (₹)</th>
                            <th style={{ width: '8%' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => {
                            const itemTaxInclusive = item.taxInclusive !== undefined ? item.taxInclusive : globalTaxInclusive;
                            const gstAmount = getGSTAmount(item, purchaseType);
                            const baseAmount = parseFloat(calculateItemTotal(item.quantity, item.price));

                            return (
                                <tr key={index}>
                                    {/* Product/Service Column */}
                                    <td>
                                        {item.selectedProduct ? (
                                            // Show selected product name with edit option
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div>
                                                    <span className="fw-semibold">{item.productService}</span>
                                                    {item.selectedProduct.sku && (
                                                        <div>
                                                            <small className="text-muted">SKU: {item.selectedProduct.sku}</small>
                                                        </div>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="outline-secondary"
                                                    size="sm"
                                                    onClick={() => handleEditProduct(index)}
                                                    title="Edit Product"
                                                >
                                                    <FontAwesomeIcon icon={faEdit} />
                                                </Button>
                                            </div>
                                        ) : (
                                            // Show product selector
                                            <ProductSelector
                                                value={item.productService || ''}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    const selectedProduct = e.target.selectedProduct;

                                                    if (selectedProduct) {
                                                        handleProductSelect(index, selectedProduct);
                                                    } else {
                                                        handleInputChange(index, 'productService', value);
                                                        handleInputChange(index, 'selectedProduct', null);
                                                        handleInputChange(index, 'gstRate', 0);
                                                        handleInputChange(index, 'taxInclusive', globalTaxInclusive);
                                                    }
                                                }}
                                                placeholder="Search products or enter custom item..."
                                                className="border-0"
                                            />
                                        )}
                                    </td>

                                    {/* Quantity Column */}
                                    <td>
                                        <Form.Control
                                            type="number"
                                            value={item.quantity || ''}
                                            onChange={(e) => {
                                                const quantity = parseFloat(e.target.value) || 0;
                                                handleInputChange(index, 'quantity', quantity);
                                                const price = parseFloat(item.price) || 0;
                                                const total = quantity * price;
                                                handleInputChange(index, 'total', total);
                                            }}
                                            placeholder="1"
                                            min="0"
                                            step="1"
                                            className="text-center quantity-input"
                                        />
                                    </td>

                                    {/* Price Column with Compact Layout */}
                                    <td>
                                        <div className="d-flex align-items-center gap-2">
                                            {/* Price Input with Border */}
                                            <InputGroup style={{ flex: '1', minWidth: '80px' }}>
                                                <InputGroup.Text className="bg-light border px-2">₹</InputGroup.Text>
                                                <Form.Control
                                                    type="number"
                                                    value={item.price || ''}
                                                    onChange={(e) => {
                                                        const price = parseFloat(e.target.value) || 0;
                                                        handleInputChange(index, 'price', price);
                                                        const quantity = parseFloat(item.quantity) || 1;
                                                        const total = quantity * price;
                                                        handleInputChange(index, 'total', total);
                                                    }}
                                                    placeholder="0.00"
                                                    min="0"
                                                    step="0.01"
                                                    className="border price-input text-end"
                                                    size="sm"
                                                />
                                            </InputGroup>

                                            {/* Compact Tax Toggle */}
                                            {showGSTFeatures() && (
                                                <Button
                                                    variant={itemTaxInclusive ? "success" : "outline-secondary"}
                                                    size="sm"
                                                    onClick={() => handleIndividualTaxInclusiveToggle(index)}
                                                    title={itemTaxInclusive ? "Tax Inclusive - Click to make Tax Exclusive" : "Tax Exclusive - Click to make Tax Inclusive"}
                                                    className="px-2"
                                                    style={{ minWidth: '50px', fontSize: '0.75rem' }}
                                                >
                                                    <FontAwesomeIcon
                                                        icon={itemTaxInclusive ? faToggleOn : faToggleOff}
                                                        className="me-1"
                                                        style={{ fontSize: '0.8rem' }}
                                                    />
                                                    {itemTaxInclusive ? 'Inc' : 'Exc'}
                                                </Button>
                                            )}
                                        </div>
                                    </td>

                                    {/* GST Column - Auto-filled from inventory, editable */}
                                    {showGSTFeatures() && (
                                        <td>
                                            <div className="text-center">
                                                <InputGroup size="sm">
                                                    <Form.Control
                                                        type="number"
                                                        value={item.gstRate || ''}
                                                        onChange={(e) => {
                                                            const gstRate = parseFloat(e.target.value) || 0;
                                                            handleInputChange(index, 'gstRate', gstRate);
                                                        }}
                                                        placeholder="0"
                                                        min="0"
                                                        max="50"
                                                        step="0.1"
                                                        className="text-center"
                                                    />
                                                    <InputGroup.Text>%</InputGroup.Text>
                                                </InputGroup>
                                                {item.selectedProduct && item.selectedProduct.gstRate && (
                                                    <div className="mt-1">
                                                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                                            Default: {item.selectedProduct.gstRate}%
                                                        </small>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    )}

                                    {/* Total Column with GST/Base Info */}
                                    <td>
                                        <div className="text-center">
                                            <div className="fw-semibold">
                                                ₹{getFinalTotal(item).toFixed(2)}
                                            </div>

                                            {/* Show GST and Base amount info in total section */}
                                            {showGSTFeatures() && baseAmount > 0 && (
                                                <div className="mt-1">
                                                    {gstAmount > 0 && (
                                                        <div>
                                                            <small className={itemTaxInclusive ? "text-info" : "text-warning"} style={{ fontSize: '0.7rem' }}>
                                                                <FontAwesomeIcon icon={faPercentage} className="me-1" />
                                                                GST: ₹{gstAmount.toFixed(2)}
                                                            </small>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                                            Base: ₹{itemTaxInclusive ? (baseAmount - gstAmount).toFixed(2) : baseAmount.toFixed(2)}
                                                        </small>
                                                    </div>
                                                    {itemTaxInclusive ? (
                                                        <div>
                                                            <small className="text-success" style={{ fontSize: '0.7rem' }}>
                                                                All Inclusive
                                                            </small>
                                                        </div>
                                                    ) : gstAmount > 0 && (
                                                        <div>
                                                            <small className="text-primary" style={{ fontSize: '0.7rem' }}>
                                                                +GST Added
                                                            </small>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* Action Column */}
                                    <td>
                                        <Button
                                            variant="outline-danger"
                                            size="sm"
                                            onClick={() => onRemoveItem(index)}
                                            disabled={items.length === 1}
                                            className="w-100"
                                            title="Remove Item"
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>
            </div>

            <div className="d-flex justify-content-between align-items-center mt-3">
                <Button
                    variant="outline-primary"
                    onClick={onAddItem}
                    className="d-flex align-items-center"
                >
                    <FontAwesomeIcon icon={faPlus} className="me-2" />
                    Add Item
                </Button>

                <div className="text-end">
                    <div className="d-flex gap-3 align-items-center">
                        {showGSTFeatures() && (
                            <div className="text-muted">
                                <small>
                                    <FontAwesomeIcon
                                        icon={globalTaxInclusive ? faToggleOn : faToggleOff}
                                        className={`me-1 ${globalTaxInclusive ? 'text-success' : 'text-secondary'}`}
                                    />
                                    Global: {globalTaxInclusive ? 'Tax Inclusive' : 'Tax Exclusive'}
                                </small>
                            </div>
                        )}
                        <small className="text-muted">
                            {items.length} item{items.length !== 1 ? 's' : ''} added
                        </small>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PurchaseItemsTable;