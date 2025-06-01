import React, { useState, useEffect } from 'react';
import { Table, Button, Form, InputGroup, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';
import ProductSelector from './ProductSelector';
import './ItemsTable.css';

function ItemsTable({ items = [], onItemChange, onAddItem, onRemoveItem, invoiceType }) {
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

        // Apply to all existing items that don't have individual overrides
        items.forEach((item, index) => {
            if (item.productService && !item.hasIndividualTaxSetting) {
                onItemChange(index, 'taxInclusive', isChecked);
            }
        });
    };

    // Apply global tax inclusive to new items
    useEffect(() => {
        items.forEach((item, index) => {
            if (item.productService && item.taxInclusive === undefined && !item.hasIndividualTaxSetting) {
                onItemChange(index, 'taxInclusive', globalTaxInclusive);
            }
        });
    }, [items.length, globalTaxInclusive]);

    const calculateItemTotal = (quantity, price) => {
        return (parseFloat(quantity || 0) * parseFloat(price || 0));
    };

    const getGSTAmount = (item) => {
        if (invoiceType !== 'gst' || !item.gstRate) return 0;

        const baseAmount = parseFloat(item.total || 0);
        const isItemTaxInclusive = item.taxInclusive !== undefined ? item.taxInclusive : globalTaxInclusive;

        if (isItemTaxInclusive) {
            // Tax inclusive: extract GST from total
            const gstAmount = baseAmount - (baseAmount / (1 + parseFloat(item.gstRate) / 100));
            return gstAmount;
        } else {
            // Tax exclusive: add GST to base amount
            return (baseAmount * parseFloat(item.gstRate)) / 100;
        }
    };

    const getFinalTotal = (item) => {
        const baseTotal = calculateItemTotal(item.quantity, item.price);

        if (invoiceType !== 'gst' || !item.gstRate) {
            return baseTotal;
        }

        const isItemTaxInclusive = item.taxInclusive !== undefined ? item.taxInclusive : globalTaxInclusive;

        if (isItemTaxInclusive) {
            // Tax inclusive: price already includes GST
            return baseTotal;
        } else {
            // Tax exclusive: add GST to base amount
            const gstAmount = (baseTotal * parseFloat(item.gstRate)) / 100;
            return baseTotal + gstAmount;
        }
    };

    // Helper function to check if GST features should be shown
    const showGSTFeatures = () => {
        return invoiceType === 'gst';
    };

    // Count items with individual tax settings
    const getIndividualOverrideCount = () => {
        return items.filter(item => item.hasIndividualTaxSetting).length;
    };

    return (
        <div className="items-table-container">
            <div className="table-responsive">
                <Table bordered className="items-table">
                    <thead className="table-light">
                        <tr>
                            <th style={{ width: showGSTFeatures() ? '30%' : '45%' }}>Product/Service</th>
                            <th style={{ width: '10%' }}>Quantity</th>
                            <th style={{ width: showGSTFeatures() ? '25%' : '30%' }}>
                                <div className="d-flex align-items-center justify-content-between">
                                    <span>Price (₹)</span>
                                    {showGSTFeatures() && (
                                        <div className="d-flex align-items-center gap-2">
                                            <Form.Check
                                                type="switch"
                                                id="global-tax-inclusive"
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
                            {showGSTFeatures() && <th style={{ width: '15%' }}>GST (%)</th>}
                            <th style={{ width: '15%' }}>Total (₹)</th>
                            <th style={{ width: '5%' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index}>
                                {/* Product/Service Column */}
                                <td>
                                    {item.selectedProduct ? (
                                        // Show selected product name with edit option
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="fw-semibold">{item.productService}</span>
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

                                {/* Price Column with Individual Tax Toggle - HORIZONTAL LAYOUT */}
                                <td>
                                    <div className="d-flex align-items-center gap-2 price-tax-container">
                                        {/* Price Input - Smaller Size */}
                                        <InputGroup size="sm" className="price-input-group">
                                            <InputGroup.Text className="border-0 bg-transparent px-1">₹</InputGroup.Text>
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
                                                className="border-0 price-input text-end"
                                                size="sm"
                                            />
                                        </InputGroup>

                                        {/* Individual Tax Toggle - Horizontal after price */}
                                        {showGSTFeatures() && (
                                            <div className="d-flex align-items-center gap-1 tax-toggle-horizontal">
                                                <Form.Check
                                                    type="switch"
                                                    id={`tax-inclusive-${index}`}
                                                    checked={item.taxInclusive !== undefined ? item.taxInclusive : globalTaxInclusive}
                                                    onChange={(e) => {
                                                        handleInputChange(index, 'taxInclusive', e.target.checked);
                                                        handleInputChange(index, 'hasIndividualTaxSetting', true);
                                                    }}
                                                    className="mb-0 tax-switch"
                                                    size="sm"
                                                />
                                                <small className="text-muted tax-label">
                                                    {(item.taxInclusive !== undefined ? item.taxInclusive : globalTaxInclusive) ? 'Inc' : 'Exc'}
                                                </small>

                                                {/* Show override indicator if different from global */}
                                                {item.hasIndividualTaxSetting &&
                                                    (item.taxInclusive !== globalTaxInclusive) && (
                                                        <span
                                                            className="text-info cursor-pointer reset-icon"
                                                            title="Reset to global setting"
                                                            onClick={() => {
                                                                handleInputChange(index, 'taxInclusive', globalTaxInclusive);
                                                                handleInputChange(index, 'hasIndividualTaxSetting', false);
                                                            }}
                                                        >
                                                            ↺
                                                        </span>
                                                    )}
                                            </div>
                                        )}
                                    </div>
                                </td>

                                {/* GST Column - Only show for GST invoices */}
                                {showGSTFeatures() && (
                                    <td>
                                        <div className="text-center gst-display">
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
                                                className="text-center gst-rate"
                                                size="sm"
                                            />
                                            {item.gstRate > 0 && (
                                                <small className="text-muted gst-amount d-block mt-1">
                                                    ₹{getGSTAmount(item).toFixed(2)}
                                                </small>
                                            )}
                                        </div>
                                    </td>
                                )}

                                {/* Total Column */}
                                <td>
                                    <div className="text-center">
                                        <div className="fw-semibold text-primary">
                                            ₹{getFinalTotal(item).toFixed(2)}
                                        </div>
                                        {showGSTFeatures() && item.gstRate > 0 && (
                                            <small className="text-muted d-block">
                                                {(item.taxInclusive !== undefined ? item.taxInclusive : globalTaxInclusive) ? 'Tax Inc.' : 'Tax Exc.'}
                                            </small>
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
                        ))}
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
                    <small className="text-muted">
                        {items.length} item{items.length !== 1 ? 's' : ''} added
                        {showGSTFeatures() && getIndividualOverrideCount() > 0 && (
                            <span className="d-block">
                                {getIndividualOverrideCount()} with individual tax settings
                            </span>
                        )}
                    </small>
                </div>
            </div>
        </div>
    );
}

export default ItemsTable;