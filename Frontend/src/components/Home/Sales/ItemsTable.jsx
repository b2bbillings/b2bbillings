// Frontend/src/components/Home/Sales/ItemsTable.jsx
import React from 'react';
import { Table, Button, Form, InputGroup, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faBox } from '@fortawesome/free-solid-svg-icons';
import ProductSelector from './ProductSelector';

function ItemsTable({ items = [], onItemChange, onAddItem, onRemoveItem, invoiceType }) {
    const handleInputChange = (index, field, value) => {
        onItemChange(index, field, value);
    };

    const handleProductSelect = (index, product) => {
        if (product) {
            // Auto-fill product details
            onItemChange(index, 'productService', product.name);
            onItemChange(index, 'price', product.price);
            onItemChange(index, 'gstRate', product.gstRate);
            onItemChange(index, 'sku', product.sku);
            onItemChange(index, 'unit', product.unit);
            onItemChange(index, 'selectedProduct', product);

            // Recalculate total for this item
            const quantity = items[index]?.quantity || 1;
            const total = quantity * product.price;
            onItemChange(index, 'total', total);
        }
    };

    const calculateItemTotal = (quantity, price) => {
        return (parseFloat(quantity || 0) * parseFloat(price || 0)).toFixed(2);
    };

    const getGSTAmount = (item, invoiceType) => {
        if (invoiceType !== 'gst' || !item.gstRate) return 0;
        const baseAmount = parseFloat(item.total || 0);
        return (baseAmount * parseFloat(item.gstRate)) / 100;
    };

    return (
        <div className="items-table-container">
            <div className="table-responsive">
                <Table bordered className="items-table">
                    <thead className="table-light">
                        <tr>
                            <th style={{ width: '35%' }}>Product/Service</th>
                            <th style={{ width: '12%' }}>Quantity</th>
                            <th style={{ width: '15%' }}>Price (₹)</th>
                            {invoiceType === 'gst' && <th style={{ width: '10%' }}>GST</th>}
                            <th style={{ width: '15%' }}>Total (₹)</th>
                            <th style={{ width: '8%' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index}>
                                <td>
                                    <ProductSelector
                                        value={item.productService || ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const selectedProduct = e.target.selectedProduct;

                                            if (selectedProduct) {
                                                handleProductSelect(index, selectedProduct);
                                            } else {
                                                handleInputChange(index, 'productService', value);
                                                // Clear product-specific data if typing custom item
                                                if (!selectedProduct) {
                                                    handleInputChange(index, 'selectedProduct', null);
                                                    handleInputChange(index, 'gstRate', 0);
                                                    handleInputChange(index, 'sku', '');
                                                    handleInputChange(index, 'unit', 'piece');
                                                }
                                            }
                                        }}
                                        placeholder="Search products or enter custom item..."
                                        className="border-0"
                                    />
                                    {item.selectedProduct && (
                                        <div className="mt-1">
                                            <small className="text-muted d-flex align-items-center gap-1">
                                                <FontAwesomeIcon icon={faBox} />
                                                SKU: {item.sku} • Unit: {item.unit}
                                                {item.selectedProduct.stock !== null && (
                                                    <span className="ms-2">
                                                        Stock: {item.selectedProduct.stock}
                                                    </span>
                                                )}
                                            </small>
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <Form.Control
                                        type="number"
                                        value={item.quantity || 1}
                                        onChange={(e) => {
                                            const quantity = parseFloat(e.target.value) || 1;
                                            handleInputChange(index, 'quantity', quantity);
                                            // Recalculate total
                                            const total = quantity * (parseFloat(item.price) || 0);
                                            handleInputChange(index, 'total', total);
                                        }}
                                        min="1"
                                        step="1"
                                        className="border-0 text-center"
                                    />
                                    {item.selectedProduct && item.selectedProduct.stock !== null && (
                                        <small className="text-muted d-block text-center">
                                            Max: {item.selectedProduct.stock}
                                        </small>
                                    )}
                                </td>
                                <td>
                                    <InputGroup>
                                        <InputGroup.Text className="border-0 bg-transparent">₹</InputGroup.Text>
                                        <Form.Control
                                            type="number"
                                            value={item.price || ''}
                                            onChange={(e) => {
                                                const price = parseFloat(e.target.value) || 0;
                                                handleInputChange(index, 'price', price);
                                                // Recalculate total
                                                const total = (parseFloat(item.quantity) || 1) * price;
                                                handleInputChange(index, 'total', total);
                                            }}
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                            className="border-0"
                                        />
                                    </InputGroup>
                                </td>
                                {invoiceType === 'gst' && (
                                    <td>
                                        <div className="text-center">
                                            {item.gstRate ? (
                                                <>
                                                    <Badge bg="info" className="d-block mb-1">
                                                        {item.gstRate}%
                                                    </Badge>
                                                    <small className="text-muted">
                                                        ₹{getGSTAmount(item, invoiceType).toFixed(2)}
                                                    </small>
                                                </>
                                            ) : (
                                                <small className="text-muted">No GST</small>
                                            )}
                                        </div>
                                    </td>
                                )}
                                <td>
                                    <div className="text-center">
                                        <div className="fw-semibold text-primary">
                                            ₹{calculateItemTotal(item.quantity, item.price)}
                                        </div>
                                        {invoiceType === 'gst' && item.gstRate > 0 && (
                                            <small className="text-muted">
                                                +₹{getGSTAmount(item, invoiceType).toFixed(2)} GST
                                            </small>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => onRemoveItem(index)}
                                        disabled={items.length === 1}
                                        className="w-100"
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

                <small className="text-muted">
                    {items.length} item{items.length !== 1 ? 's' : ''} added
                </small>
            </div>
        </div>
    );
}

export default ItemsTable;