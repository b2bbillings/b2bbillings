import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Card, Dropdown, ListGroup, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faChevronDown, faSearch, faTimes, faLightbulb, faBox, faTag, faWarehouse } from '@fortawesome/free-solid-svg-icons';
import ProductModal from '../../../Inventory/ProductModal';
import './ItemsTable.css';

function ItemsTable({
    items,
    gstEnabled,
    invoiceType,
    onItemsChange,
    createEmptyItem,
    inventoryItems = [],
    categories = [],
    onAddItem
}) {
    const [globalTaxMode, setGlobalTaxMode] = useState('with-tax');
    const [itemSearches, setItemSearches] = useState({});
    const [itemSuggestions, setItemSuggestions] = useState({});
    const [showItemSuggestions, setShowItemSuggestions] = useState({});
    const [searchNotFound, setSearchNotFound] = useState({});
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [selectedRowIndex, setSelectedRowIndex] = useState(null);

    // Fake inventory data if none provided
    const defaultInventoryItems = [
        {
            id: 1,
            name: 'HP Pavilion Laptop i5 8GB RAM',
            itemCode: 'HP-LAP-001',
            category: 'Electronics',
            salePrice: 52000,
            buyPrice: 47000,
            currentStock: 15,
            minStockLevel: 3,
            unit: 'PCS',
            hsnNumber: '8471',
            gstRate: 18,
            description: 'HP Pavilion Laptop with Intel i5 processor, 8GB RAM, 512GB SSD',
            isActive: true
        },
        {
            id: 2,
            name: 'Dell XPS 13 Ultrabook',
            itemCode: 'DELL-XPS-001',
            category: 'Electronics',
            salePrice: 78000,
            buyPrice: 72000,
            currentStock: 8,
            minStockLevel: 2,
            unit: 'PCS',
            hsnNumber: '8471',
            gstRate: 18,
            description: 'Dell XPS 13 with Intel Core i7, 16GB RAM, 1TB SSD',
            isActive: true
        },
        {
            id: 3,
            name: 'Samsung Galaxy S23 128GB',
            itemCode: 'SAM-S23-001',
            category: 'Mobile Phones',
            salePrice: 64999,
            buyPrice: 60000,
            currentStock: 25,
            minStockLevel: 5,
            unit: 'PCS',
            hsnNumber: '8517',
            gstRate: 18,
            description: 'Samsung Galaxy S23 with 128GB storage, 8GB RAM',
            isActive: true
        },
        {
            id: 4,
            name: 'iPhone 14 Pro 256GB',
            itemCode: 'APL-IP14P-001',
            category: 'Mobile Phones',
            salePrice: 129999,
            buyPrice: 125000,
            currentStock: 12,
            minStockLevel: 3,
            unit: 'PCS',
            hsnNumber: '8517',
            gstRate: 18,
            description: 'Apple iPhone 14 Pro with 256GB storage, Pro Camera System',
            isActive: true
        },
        {
            id: 5,
            name: 'Office Chair Executive Leather',
            itemCode: 'OFC-CHR-001',
            category: 'Furniture',
            salePrice: 15500,
            buyPrice: 12000,
            currentStock: 20,
            minStockLevel: 5,
            unit: 'PCS',
            hsnNumber: '9401',
            gstRate: 18,
            description: 'Premium executive office chair with genuine leather upholstery',
            isActive: true
        },
        {
            id: 6,
            name: 'Wooden Study Table with Drawer',
            itemCode: 'WD-TBL-001',
            category: 'Furniture',
            salePrice: 8500,
            buyPrice: 6500,
            currentStock: 30,
            minStockLevel: 8,
            unit: 'PCS',
            hsnNumber: '9403',
            gstRate: 18,
            description: 'Solid wood study table with storage drawer',
            isActive: true
        },
        {
            id: 7,
            name: 'Canon DSLR Camera EOS 1500D',
            itemCode: 'CAN-DSLR-001',
            category: 'Cameras',
            salePrice: 32000,
            buyPrice: 29000,
            currentStock: 10,
            minStockLevel: 2,
            unit: 'PCS',
            hsnNumber: '8525',
            gstRate: 18,
            description: 'Canon EOS 1500D DSLR Camera with 18-55mm lens',
            isActive: true
        },
        {
            id: 8,
            name: 'Sony Headphones WH-CH720N',
            itemCode: 'SNY-HP-001',
            category: 'Audio',
            salePrice: 8999,
            buyPrice: 7500,
            currentStock: 45,
            minStockLevel: 10,
            unit: 'PCS',
            hsnNumber: '8518',
            gstRate: 18,
            description: 'Sony Wireless Noise Canceling Headphones',
            isActive: true
        },
        {
            id: 9,
            name: 'Gaming Mouse RGB Wireless',
            itemCode: 'GM-MSE-001',
            category: 'Gaming',
            salePrice: 2499,
            buyPrice: 1800,
            currentStock: 60,
            minStockLevel: 15,
            unit: 'PCS',
            hsnNumber: '8471',
            gstRate: 18,
            description: 'High-precision gaming mouse with RGB lighting',
            isActive: true
        },
        {
            id: 10,
            name: 'Mechanical Keyboard Blue Switch',
            itemCode: 'MEC-KB-001',
            category: 'Gaming',
            salePrice: 4999,
            buyPrice: 3800,
            currentStock: 35,
            minStockLevel: 8,
            unit: 'PCS',
            hsnNumber: '8471',
            gstRate: 18,
            description: 'Mechanical gaming keyboard with blue switches and RGB backlight',
            isActive: true
        },
        {
            id: 11,
            name: 'Printer Ink Cartridge HP 678',
            itemCode: 'HP-INK-678',
            category: 'Accessories',
            salePrice: 1299,
            buyPrice: 950,
            currentStock: 80,
            minStockLevel: 20,
            unit: 'PCS',
            hsnNumber: '8443',
            gstRate: 18,
            description: 'Original HP 678 ink cartridge for HP printers',
            isActive: true
        },
        {
            id: 12,
            name: 'USB Flash Drive 64GB',
            itemCode: 'USB-FD-64',
            category: 'Storage',
            salePrice: 899,
            buyPrice: 650,
            currentStock: 120,
            minStockLevel: 30,
            unit: 'PCS',
            hsnNumber: '8523',
            gstRate: 18,
            description: 'High-speed USB 3.0 flash drive 64GB capacity',
            isActive: true
        }
    ];

    // Use provided inventory items or default fake data
    const currentInventoryItems = inventoryItems.length > 0 ? inventoryItems : defaultInventoryItems;

    // Product form data for the modal
    const [productFormData, setProductFormData] = useState({
        type: 'product',
        name: '',
        itemCode: '',
        hsnNumber: '',
        unit: 'NONE',
        category: '',
        description: '',
        gstRate: 18,
        openingStock: '',
        asOfDate: new Date().toISOString().split('T')[0],
        minStockLevel: '',
        buyPrice: '',
        salePrice: '',
        isActive: true
    });

    // Handle Alt+C keyboard shortcut for adding items
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey && e.key.toLowerCase() === 'c' && searchNotFound[selectedRowIndex]) {
                e.preventDefault();
                handleAddItemFromSearch(selectedRowIndex, searchNotFound[selectedRowIndex]);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [searchNotFound, selectedRowIndex]);

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Handle item name search
        if (field === 'itemName') {
            handleItemSearch(index, value);
        }

        // Calculate totals for specific fields
        if (['quantity', 'pricePerUnit', 'taxRate', 'discountPercent', 'discountAmount', 'taxAmount', 'taxMode'].includes(field)) {
            calculateItemTotals(newItems[index], index, newItems, field);
        }

        onItemsChange(newItems);
    };

    // Handle item search and suggestions
    const handleItemSearch = (rowIndex, searchQuery) => {
        setItemSearches(prev => ({ ...prev, [rowIndex]: searchQuery }));

        if (searchQuery.length > 0) {
            // Filter inventory items based on search query
            const matchingItems = currentInventoryItems.filter(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.itemCode && item.itemCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))
            );

            setItemSuggestions(prev => ({ ...prev, [rowIndex]: matchingItems }));

            // Show suggestions if we have matches
            if (matchingItems.length > 0) {
                setShowItemSuggestions(prev => ({ ...prev, [rowIndex]: true }));
                setSearchNotFound(prev => ({ ...prev, [rowIndex]: false }));
            } else {
                // No items found - show add item option
                setShowItemSuggestions(prev => ({ ...prev, [rowIndex]: false }));
                if (searchQuery.length > 2) {
                    setSearchNotFound(prev => ({ ...prev, [rowIndex]: searchQuery }));
                    setSelectedRowIndex(rowIndex);
                }
            }
        } else {
            // Reset when search is empty
            setShowItemSuggestions(prev => ({ ...prev, [rowIndex]: false }));
            setSearchNotFound(prev => ({ ...prev, [rowIndex]: false }));
            setItemSuggestions(prev => ({ ...prev, [rowIndex]: [] }));
            setSelectedRowIndex(null);
        }
    };

    // Handle item suggestion click
    const handleItemSuggestionClick = (rowIndex, item) => {
        const newItems = [...items];
        newItems[rowIndex] = {
            ...newItems[rowIndex],
            itemName: item.name,
            hsnCode: item.hsnNumber || '',
            unit: item.unit || 'NONE',
            pricePerUnit: item.salePrice || 0,
            taxRate: item.gstRate || 0
        };

        // Calculate totals for the selected item
        calculateItemTotals(newItems[rowIndex], rowIndex, newItems);

        // Clear search state for this row
        setItemSearches(prev => ({ ...prev, [rowIndex]: item.name }));
        setShowItemSuggestions(prev => ({ ...prev, [rowIndex]: false }));
        setSearchNotFound(prev => ({ ...prev, [rowIndex]: false }));
        setSelectedRowIndex(null);

        onItemsChange(newItems);
    };

    // Handle clear search for a specific row
    const clearItemSearch = (rowIndex) => {
        setItemSearches(prev => ({ ...prev, [rowIndex]: '' }));
        setShowItemSuggestions(prev => ({ ...prev, [rowIndex]: false }));
        setSearchNotFound(prev => ({ ...prev, [rowIndex]: false }));
        setItemSuggestions(prev => ({ ...prev, [rowIndex]: [] }));
        setSelectedRowIndex(null);

        // Clear the item name in the table
        const newItems = [...items];
        newItems[rowIndex] = { ...newItems[rowIndex], itemName: '' };
        onItemsChange(newItems);
    };

    // Handle adding item from search
    const handleAddItemFromSearch = (rowIndex, itemName) => {
        setSelectedRowIndex(rowIndex);
        setProductFormData(prev => ({
            ...prev,
            name: itemName,
            type: 'product'
        }));
        setShowAddItemModal(true);
    };

    const handleProductInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setProductFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSaveProduct = async (e, saveAndAdd = false) => {
        e.preventDefault();

        try {
            if (onAddItem) {
                const result = await onAddItem(productFormData);

                if (result !== false) {
                    if (selectedRowIndex !== null) {
                        const newItems = [...items];
                        newItems[selectedRowIndex] = {
                            ...newItems[selectedRowIndex],
                            itemName: productFormData.name,
                            hsnCode: productFormData.hsnNumber || '',
                            unit: productFormData.unit || 'NONE',
                            pricePerUnit: productFormData.salePrice || 0,
                            taxRate: productFormData.gstRate || 0
                        };

                        calculateItemTotals(newItems[selectedRowIndex], selectedRowIndex, newItems);
                        setItemSearches(prev => ({ ...prev, [selectedRowIndex]: productFormData.name }));
                        setSearchNotFound(prev => ({ ...prev, [selectedRowIndex]: false }));
                        onItemsChange(newItems);
                    }

                    if (!saveAndAdd) {
                        setShowAddItemModal(false);
                        setSelectedRowIndex(null);
                        resetProductForm();
                    }
                    return result;
                }
            } else {
                console.log('Product data:', productFormData);
                alert(`Product "${productFormData.name}" added successfully!`);

                if (!saveAndAdd) {
                    setShowAddItemModal(false);
                    setSelectedRowIndex(null);
                    resetProductForm();
                }
            }
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Error saving product. Please try again.');
            return false;
        }
    };

    const handleCloseProductModal = () => {
        setShowAddItemModal(false);
        setSelectedRowIndex(null);
        resetProductForm();
    };

    const resetProductForm = () => {
        setProductFormData({
            type: 'product',
            name: '',
            itemCode: '',
            hsnNumber: '',
            unit: 'NONE',
            category: '',
            description: '',
            gstRate: 18,
            openingStock: '',
            asOfDate: new Date().toISOString().split('T')[0],
            minStockLevel: '',
            buyPrice: '',
            salePrice: '',
            isActive: true
        });
    };

    const handleGlobalTaxModeChange = (mode) => {
        setGlobalTaxMode(mode);
        const newItems = items.map(item => ({ ...item, taxMode: mode }));

        // Recalculate all items with new tax mode
        newItems.forEach((item, index) => {
            calculateItemTotals(item, index, newItems);
        });

        onItemsChange(newItems);
    };

    // Fixed calculation function
    const calculateItemTotals = (item, index, allItems, changedField = null) => {
        const quantity = parseFloat(item.quantity) || 0;
        const pricePerUnit = parseFloat(item.pricePerUnit) || 0;
        const taxMode = item.taxMode || globalTaxMode;

        console.log(`🧮 Calculating item ${index + 1}:`, { quantity, pricePerUnit, taxMode, changedField });

        // Base amount calculation
        const baseAmount = quantity * pricePerUnit;

        let discountPercent = parseFloat(item.discountPercent) || 0;
        let discountAmount = parseFloat(item.discountAmount) || 0;
        let taxRate = parseFloat(item.taxRate) || 0;
        let taxAmount = parseFloat(item.taxAmount) || 0;

        // Handle discount calculations
        if (changedField === 'discountPercent') {
            discountAmount = (baseAmount * discountPercent) / 100;
        } else if (changedField === 'discountAmount') {
            discountPercent = baseAmount > 0 ? (discountAmount * 100) / baseAmount : 0;
        } else if (!changedField || changedField === 'quantity' || changedField === 'pricePerUnit') {
            discountAmount = (baseAmount * discountPercent) / 100;
        }

        const amountAfterDiscount = baseAmount - discountAmount;

        // Handle tax calculations based on tax mode
        if (gstEnabled && taxRate > 0) {
            if (changedField === 'taxRate' || changedField === 'taxMode' || !changedField) {
                if (taxMode === 'with-tax') {
                    // Price includes tax - extract tax from the amount
                    taxAmount = (amountAfterDiscount * taxRate) / (100 + taxRate);
                } else {
                    // Price excludes tax - add tax to the amount
                    taxAmount = (amountAfterDiscount * taxRate) / 100;
                }
            } else if (changedField === 'taxAmount') {
                if (taxMode === 'with-tax') {
                    taxRate = amountAfterDiscount > taxAmount ? (taxAmount * 100) / (amountAfterDiscount - taxAmount) : 0;
                } else {
                    taxRate = amountAfterDiscount > 0 ? (taxAmount * 100) / amountAfterDiscount : 0;
                }
            }
        } else {
            taxRate = 0;
            taxAmount = 0;
        }

        // Calculate final amount based on tax mode
        let finalAmount;
        if (gstEnabled && taxAmount > 0) {
            if (taxMode === 'with-tax') {
                finalAmount = amountAfterDiscount;
            } else {
                finalAmount = amountAfterDiscount + taxAmount;
            }
        } else {
            finalAmount = amountAfterDiscount;
        }

        // Calculate CGST and SGST (assuming intra-state transaction)
        const cgst = taxAmount / 2;
        const sgst = taxAmount / 2;

        // Update the item with calculated values
        allItems[index] = {
            ...item,
            discountPercent: parseFloat(discountPercent.toFixed(2)),
            discountAmount: parseFloat(discountAmount.toFixed(2)),
            taxRate: parseFloat(taxRate.toFixed(2)),
            taxAmount: parseFloat(taxAmount.toFixed(2)),
            cgst: parseFloat(cgst.toFixed(2)),
            sgst: parseFloat(sgst.toFixed(2)),
            igst: parseFloat(taxAmount.toFixed(2)),
            amount: parseFloat(finalAmount.toFixed(2))
        };

        console.log(`✅ Item ${index + 1} final:`, {
            baseAmount: baseAmount.toFixed(2),
            discountAmount: discountAmount.toFixed(2),
            amountAfterDiscount: amountAfterDiscount.toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            finalAmount: finalAmount.toFixed(2)
        });
    };

    const handleAddItem = () => {
        const newItem = createEmptyItem();
        newItem.taxMode = globalTaxMode;
        onItemsChange([...items, newItem]);
    };

    const handleRemoveItem = (index) => {
        if (items.length > 1) {
            const newItems = items.filter((_, i) => i !== index);

            // Clean up search states for removed row
            const newItemSearches = { ...itemSearches };
            const newItemSuggestions = { ...itemSuggestions };
            const newShowItemSuggestions = { ...showItemSuggestions };
            const newSearchNotFound = { ...searchNotFound };

            delete newItemSearches[index];
            delete newItemSuggestions[index];
            delete newShowItemSuggestions[index];
            delete newSearchNotFound[index];

            setItemSearches(newItemSearches);
            setItemSuggestions(newItemSuggestions);
            setShowItemSuggestions(newShowItemSuggestions);
            setSearchNotFound(newSearchNotFound);

            onItemsChange(newItems);
        }
    };

    // Fixed totals calculation
    const calculateTotals = () => {
        let totalQuantity = 0;
        let totalDiscountAmount = 0;
        let totalTaxAmount = 0;
        let totalAmount = 0;

        items.forEach(item => {
            const quantity = parseFloat(item.quantity) || 0;
            const amount = parseFloat(item.amount) || 0;
            const discountAmount = parseFloat(item.discountAmount) || 0;
            const taxAmount = parseFloat(item.taxAmount) || 0;

            // Only include items with valid data
            if (quantity > 0 && amount > 0) {
                totalQuantity += quantity;
                totalDiscountAmount += discountAmount;
                totalTaxAmount += taxAmount;
                totalAmount += amount;
            }
        });

        return {
            totalQuantity: parseFloat(totalQuantity.toFixed(2)),
            totalDiscountAmount: parseFloat(totalDiscountAmount.toFixed(2)),
            totalTaxAmount: parseFloat(totalTaxAmount.toFixed(2)),
            totalAmount: parseFloat(totalAmount.toFixed(2))
        };
    };

    const totals = calculateTotals();
    const unitOptions = ['NONE', 'KG', 'GM', 'LTR', 'ML', 'PCS', 'BOX', 'M', 'CM'];

    // Updated column widths for better spacing
    const getColumnWidths = () => {
        if (gstEnabled) {
            return {
                serial: '3%',
                item: '18%',
                hsn: '8%',
                qty: '6%',
                unit: '6%',
                price: '13%',
                discount: '14%', // Increased
                tax: '14%',      // Increased
                amount: '10%',
                action: '3%'
            };
        } else {
            return {
                serial: '4%',
                item: '24%',
                hsn: '10%',
                qty: '8%',
                unit: '8%',
                price: '15%',
                discount: '18%', // Increased
                amount: '12%',
                action: '4%'
            };
        }
    };

    const colWidths = getColumnWidths();

    return (
        <>
            <div className="mt-4">
                <Card className="shadow-sm">
                    <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">Items Details</h6>
                        <small className="text-muted">Total Items: {currentInventoryItems.length}</small>
                    </Card.Header>
                    <Card.Body className="p-0">
                        <Table bordered className="mb-0 items-table-new">
                            <thead>
                                <tr>
                                    <th style={{ width: colWidths.serial }}>#</th>
                                    <th style={{ width: colWidths.item }}>ITEM</th>
                                    {gstEnabled && (
                                        <th style={{ width: colWidths.hsn }}>
                                            HSN CODE
                                            <br /><small className="text-muted">Required</small>
                                        </th>
                                    )}
                                    {!gstEnabled && (
                                        <th style={{ width: colWidths.hsn }}>
                                            HSN CODE
                                            <br /><small className="text-muted">Optional</small>
                                        </th>
                                    )}
                                    <th style={{ width: colWidths.qty }}>QTY</th>
                                    <th style={{ width: colWidths.unit }}>UNIT</th>
                                    <th style={{ width: colWidths.price }}>
                                        PRICE/UNIT
                                        {gstEnabled && (
                                            <>
                                                <br />
                                                <Dropdown className="mt-1">
                                                    <Dropdown.Toggle
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        style={{ fontSize: '9px', padding: '1px 4px' }}
                                                    >
                                                        {globalTaxMode === 'with-tax' ? 'With Tax' : 'Without Tax'}
                                                        <FontAwesomeIcon icon={faChevronDown} className="ms-1" size="xs" />
                                                    </Dropdown.Toggle>
                                                    <Dropdown.Menu>
                                                        <Dropdown.Item
                                                            active={globalTaxMode === 'with-tax'}
                                                            onClick={() => handleGlobalTaxModeChange('with-tax')}
                                                            style={{ fontSize: '10px' }}
                                                        >
                                                            With Tax (for all)
                                                        </Dropdown.Item>
                                                        <Dropdown.Item
                                                            active={globalTaxMode === 'without-tax'}
                                                            onClick={() => handleGlobalTaxModeChange('without-tax')}
                                                            style={{ fontSize: '10px' }}
                                                        >
                                                            Without Tax (for all)
                                                        </Dropdown.Item>
                                                    </Dropdown.Menu>
                                                </Dropdown>
                                            </>
                                        )}
                                    </th>
                                    <th style={{ width: colWidths.discount }}>
                                        DISCOUNT
                                        <br /><small className="text-muted">% &nbsp;&nbsp;&nbsp; AMOUNT</small>
                                    </th>
                                    {gstEnabled && (
                                        <th style={{ width: colWidths.tax }}>
                                            TAX
                                            <br /><small className="text-muted">% &nbsp;&nbsp;&nbsp; AMOUNT</small>
                                        </th>
                                    )}
                                    <th style={{ width: colWidths.amount }}>AMOUNT</th>
                                    <th style={{ width: colWidths.action }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <React.Fragment key={item.id}>
                                        <tr>
                                            <td className="text-center">{index + 1}</td>
                                            <td>
                                                <div className="position-relative">
                                                    <div className="d-flex">
                                                        <Form.Control
                                                            type="text"
                                                            value={itemSearches[index] || item.itemName || ''}
                                                            onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                                                            placeholder="Search or enter item name..."
                                                            size="sm"
                                                            className="flex-grow-1 item-search-input"
                                                        />
                                                        {(itemSearches[index] || item.itemName) && (
                                                            <Button
                                                                variant="outline-secondary"
                                                                size="sm"
                                                                onClick={() => clearItemSearch(index)}
                                                                className="ms-1 clear-search-btn"
                                                                style={{ padding: '0.25rem 0.375rem' }}
                                                            >
                                                                <FontAwesomeIcon icon={faTimes} size="xs" />
                                                            </Button>
                                                        )}
                                                    </div>

                                                    {/* Item Suggestions Dropdown */}
                                                    {showItemSuggestions[index] && itemSuggestions[index]?.length > 0 && (
                                                        <div className="suggestions-dropdown position-absolute w-100" style={{ zIndex: 1050, top: '100%' }}>
                                                            <div className="suggestions-container shadow-lg border rounded">
                                                                <div className="suggestions-header bg-gradient-primary text-white py-2 px-3">
                                                                    <div className="d-flex align-items-center">
                                                                        <FontAwesomeIcon icon={faLightbulb} className="me-2" />
                                                                        <span className="fw-semibold small">Found {itemSuggestions[index].length} items</span>
                                                                        <FontAwesomeIcon icon={faSearch} className="ms-auto opacity-75" size="sm" />
                                                                    </div>
                                                                </div>
                                                                <div className="suggestions-list">
                                                                    {itemSuggestions[index].slice(0, 6).map((inventoryItem) => (
                                                                        <div
                                                                            key={inventoryItem.id}
                                                                            className="suggestion-item py-3 px-3 border-bottom cursor-pointer"
                                                                            onClick={() => handleItemSuggestionClick(index, inventoryItem)}
                                                                        >
                                                                            <div className="d-flex justify-content-between align-items-start">
                                                                                <div className="flex-grow-1 me-3">
                                                                                    <div className="item-name fw-bold text-dark mb-1">
                                                                                        {inventoryItem.name}
                                                                                    </div>
                                                                                    <div className="item-details d-flex flex-wrap gap-2 small text-muted">
                                                                                        <span className="d-flex align-items-center">
                                                                                            <FontAwesomeIcon icon={faTag} className="me-1" size="xs" />
                                                                                            {inventoryItem.itemCode}
                                                                                        </span>
                                                                                        <span className="text-primary">
                                                                                            {inventoryItem.category}
                                                                                        </span>
                                                                                        <span className="d-flex align-items-center">
                                                                                            <FontAwesomeIcon icon={faWarehouse} className="me-1" size="xs" />
                                                                                            HSN: {inventoryItem.hsnNumber}
                                                                                        </span>
                                                                                    </div>
                                                                                    {inventoryItem.description && (
                                                                                        <div className="item-description text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
                                                                                            {inventoryItem.description.substring(0, 80)}...
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div className="item-price-info text-end">
                                                                                    <div className="price text-success fw-bold">
                                                                                        ₹{inventoryItem.salePrice?.toLocaleString('en-IN') || '0'}
                                                                                    </div>
                                                                                    <div className="stock-info small">
                                                                                        <span className={`stock-badge ${inventoryItem.currentStock > inventoryItem.minStockLevel ? 'text-success' : 'text-warning'}`}>
                                                                                            Stock: {inventoryItem.currentStock || 0}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="gst-rate text-muted" style={{ fontSize: '0.7rem' }}>
                                                                                        GST: {inventoryItem.gstRate}%
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    {itemSuggestions[index].length > 6 && (
                                                                        <div className="text-center py-2 bg-light border-top">
                                                                            <small className="text-muted">
                                                                                +{itemSuggestions[index].length - 6} more items available
                                                                            </small>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Item Not Found Alert */}
                                                    {searchNotFound[index] && (
                                                        <div className="position-absolute w-100" style={{ zIndex: 1040, top: '100%' }}>
                                                            <Alert variant="warning" className="mb-0 py-3 shadow-sm not-found-alert">
                                                                <div className="d-flex align-items-center justify-content-between">
                                                                    <div className="d-flex align-items-center">
                                                                        <FontAwesomeIcon icon={faBox} className="me-2 text-warning" />
                                                                        <div>
                                                                            <div className="fw-semibold small mb-1">
                                                                                Item "<strong className="text-dark">{searchNotFound[index]}</strong>" not found in inventory
                                                                            </div>
                                                                            <small className="text-muted">
                                                                                Would you like to add this item to your inventory?
                                                                            </small>
                                                                        </div>
                                                                    </div>
                                                                    <Button
                                                                        variant="success"
                                                                        size="sm"
                                                                        onClick={() => handleAddItemFromSearch(index, searchNotFound[index])}
                                                                        className="add-item-btn"
                                                                    >
                                                                        <FontAwesomeIcon icon={faPlus} className="me-1" />
                                                                        Add Item (Alt+C)
                                                                    </Button>
                                                                </div>
                                                            </Alert>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <Form.Control
                                                    type="text"
                                                    value={item.hsnCode || ''}
                                                    onChange={(e) => handleItemChange(index, 'hsnCode', e.target.value)}
                                                    placeholder={gstEnabled ? "Required" : "Optional"}
                                                    size="sm"
                                                    className={gstEnabled && !item.hsnCode && item.itemName ? 'border-warning' : ''}
                                                    maxLength="8"
                                                />
                                                {gstEnabled && !item.hsnCode && item.itemName && (
                                                    <small className="text-warning">HSN required for GST</small>
                                                )}
                                            </td>
                                            <td>
                                                <Form.Control
                                                    type="number"
                                                    value={item.quantity || ''}
                                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                    min="0"
                                                    step="0.01"
                                                    className="text-center"
                                                    size="sm"
                                                />
                                            </td>
                                            <td>
                                                <Form.Select
                                                    value={item.unit || 'NONE'}
                                                    onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                                                    size="sm"
                                                >
                                                    {unitOptions.map(unit => (
                                                        <option key={unit} value={unit}>{unit}</option>
                                                    ))}
                                                </Form.Select>
                                            </td>
                                            <td>
                                                <div className="d-flex flex-column gap-1">
                                                    <Form.Control
                                                        type="number"
                                                        value={item.pricePerUnit || ''}
                                                        onChange={(e) => handleItemChange(index, 'pricePerUnit', e.target.value)}
                                                        min="0"
                                                        step="0.01"
                                                        className="text-end"
                                                        size="sm"
                                                    />
                                                    {gstEnabled && (
                                                        <Dropdown>
                                                            <Dropdown.Toggle
                                                                variant="outline-secondary"
                                                                size="sm"
                                                                className="w-100 d-flex align-items-center justify-content-between"
                                                                style={{ fontSize: '10px', padding: '2px 6px' }}
                                                            >
                                                                <span>{(item.taxMode === 'without-tax') ? 'Without Tax' : 'With Tax'}</span>
                                                                <FontAwesomeIcon icon={faChevronDown} size="xs" />
                                                            </Dropdown.Toggle>
                                                            <Dropdown.Menu>
                                                                <Dropdown.Item
                                                                    active={item.taxMode === 'with-tax' || !item.taxMode}
                                                                    onClick={() => handleItemChange(index, 'taxMode', 'with-tax')}
                                                                    style={{ fontSize: '11px' }}
                                                                >
                                                                    With Tax
                                                                </Dropdown.Item>
                                                                <Dropdown.Item
                                                                    active={item.taxMode === 'without-tax'}
                                                                    onClick={() => handleItemChange(index, 'taxMode', 'without-tax')}
                                                                    style={{ fontSize: '11px' }}
                                                                >
                                                                    Without Tax
                                                                </Dropdown.Item>
                                                            </Dropdown.Menu>
                                                        </Dropdown>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                {/* Wider discount inputs */}
                                                <div className="d-flex gap-1">
                                                    <Form.Control
                                                        type="number"
                                                        value={item.discountPercent || ''}
                                                        onChange={(e) => handleItemChange(index, 'discountPercent', e.target.value)}
                                                        min="0"
                                                        max="100"
                                                        step="0.01"
                                                        className="text-center"
                                                        size="sm"
                                                        style={{ width: '65px' }} // Increased width
                                                        placeholder="%"
                                                    />
                                                    <Form.Control
                                                        type="number"
                                                        value={item.discountAmount || ''}
                                                        onChange={(e) => handleItemChange(index, 'discountAmount', e.target.value)}
                                                        min="0"
                                                        step="0.01"
                                                        className="text-center"
                                                        size="sm"
                                                        style={{ width: '75px' }} // Increased width
                                                        placeholder="₹"
                                                    />
                                                </div>
                                            </td>
                                            {gstEnabled && (
                                                <td>
                                                    {/* Wider tax inputs */}
                                                    <div className="d-flex gap-1">
                                                        <Form.Control
                                                            type="number"
                                                            value={item.taxRate || ''}
                                                            onChange={(e) => handleItemChange(index, 'taxRate', e.target.value)}
                                                            min="0"
                                                            max="100"
                                                            step="0.01"
                                                            className="text-center"
                                                            size="sm"
                                                            style={{ width: '65px' }} // Increased width
                                                            placeholder="%"
                                                        />
                                                        <Form.Control
                                                            type="number"
                                                            value={item.taxAmount || ''}
                                                            onChange={(e) => handleItemChange(index, 'taxAmount', e.target.value)}
                                                            min="0"
                                                            step="0.01"
                                                            className="text-center"
                                                            size="sm"
                                                            style={{ width: '75px' }} // Increased width
                                                            placeholder="₹"
                                                        />
                                                    </div>
                                                </td>
                                            )}
                                            <td className="text-center">
                                                <strong>₹{(item.amount || 0).toFixed(2)}</strong>
                                            </td>
                                            <td className="text-center">
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => handleRemoveItem(index)}
                                                    disabled={items.length === 1}
                                                >
                                                    <FontAwesomeIcon icon={faTrash} size="xs" />
                                                </Button>
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                ))}

                                <tr>
                                    <td colSpan={gstEnabled ? "10" : "9"}>
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={handleAddItem}
                                            className="d-flex align-items-center gap-1"
                                        >
                                            <FontAwesomeIcon icon={faPlus} size="sm" />
                                            ADD ROW
                                        </Button>
                                    </td>
                                </tr>

                                {/* Fixed totals row */}
                                <tr className="table-secondary">
                                    <td></td>
                                    <td className="text-center"><strong>TOTAL</strong></td>
                                    <td></td>
                                    <td className="text-center">
                                        <strong>{totals.totalQuantity.toLocaleString('en-IN')}</strong>
                                    </td>
                                    <td></td>
                                    <td></td>
                                    <td className="text-center">
                                        <strong>₹{totals.totalDiscountAmount.toLocaleString('en-IN')}</strong>
                                    </td>
                                    {gstEnabled && (
                                        <td className="text-center">
                                            <strong>₹{totals.totalTaxAmount.toLocaleString('en-IN')}</strong>
                                        </td>
                                    )}
                                    <td className="text-center">
                                        <strong className="text-success">₹{totals.totalAmount.toLocaleString('en-IN')}</strong>
                                    </td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            </div>

            {/* Product Modal */}
            <ProductModal
                show={showAddItemModal}
                onHide={handleCloseProductModal}
                editingProduct={null}
                formData={productFormData}
                categories={categories}
                onInputChange={handleProductInputChange}
                onSaveProduct={handleSaveProduct}
            />

            {/* Enhanced Styles */}
            <style>
                {`
                /* Suggestions Container Styles */
                .suggestions-container {
                    max-height: 400px;
                    overflow: hidden;
                    background: white;
                    border-radius: 8px !important;
                }

                .suggestions-header {
                    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%) !important;
                    border-top-left-radius: 8px;
                    border-top-right-radius: 8px;
                }

                .suggestions-list {
                    max-height: 350px;
                    overflow-y: auto;
                }

                .suggestion-item {
                    transition: all 0.2s ease;
                    border-left: 3px solid transparent;
                }

                .suggestion-item:hover {
                    background-color: #f8f9fa !important;
                    border-left-color: #007bff;
                    transform: translateX(2px);
                }

                .suggestion-item:active {
                    background-color: #e9ecef !important;
                }

                .suggestion-item .item-name {
                    font-size: 0.9rem;
                    color: #2c3e50;
                }

                .suggestion-item .item-details {
                    font-size: 0.75rem;
                }

                .suggestion-item .item-description {
                    color: #6c757d;
                    line-height: 1.3;
                }

                .suggestion-item .price {
                    font-size: 1rem;
                    font-weight: 600;
                }

                .stock-badge {
                    font-weight: 500;
                    padding: 1px 4px;
                    border-radius: 3px;
                    background: rgba(40, 167, 69, 0.1);
                }

                /* Not Found Alert Styles */
                .not-found-alert {
                    border-left: 4px solid #ffc107;
                    background: linear-gradient(90deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%);
                    border-radius: 8px;
                }

                .add-item-btn {
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                    border: none;
                    box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);
                    transition: all 0.2s ease;
                }

                .add-item-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(40, 167, 69, 0.4);
                }

                /* Search Input Styles */
                .item-search-input {
                    border-color: #dee2e6;
                    transition: all 0.2s ease;
                }

                .item-search-input:focus {
                    border-color: #007bff;
                    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
                }

                .clear-search-btn {
                    border-color: #dee2e6;
                    color: #6c757d;
                    transition: all 0.2s ease;
                }

                .clear-search-btn:hover {
                    background-color: #e9ecef;
                    border-color: #adb5bd;
                    color: #495057;
                }

                /* Table Styles */
                .items-table-new {
                    border-radius: 8px;
                    overflow: hidden;
                }

                .items-table-new .position-relative {
                    z-index: auto;
                }

                .items-table-new .suggestions-dropdown,
                .items-table-new .alert {
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }

                .items-table-new td {
                    position: relative;
                    overflow: visible;
                    vertical-align: middle;
                }

                .items-table-new thead th {
                    background-color: #f8f9fa;
                    border-bottom: 2px solid #dee2e6;
                    font-weight: 600;
                    color: #495057;
                }

                /* Enhanced input styling for better UX */
                .items-table-new input[type="number"] {
                    transition: all 0.2s ease;
                }

                .items-table-new input[type="number"]:focus {
                    border-color: #007bff;
                    box-shadow: 0 0 0 0.1rem rgba(0, 123, 255, 0.25);
                }

                /* Scrollbar Styles */
                .suggestions-list::-webkit-scrollbar {
                    width: 6px;
                }

                .suggestions-list::-webkit-scrollbar-track {
                    background: #f1f1f1;
                }

                .suggestions-list::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 3px;
                }

                .suggestions-list::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }

                /* Animation for dropdown */
                .suggestions-dropdown {
                    animation: slideDown 0.2s ease-out;
                }

                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* Responsive Adjustments */
                @media (max-width: 768px) {
                    .suggestion-item .item-description {
                        display: none;
                    }
                    
                    .suggestion-item .item-details {
                        flex-direction: column;
                        gap: 0.25rem !important;
                    }
                }
                `}
            </style>
        </>
    );
}

export default ItemsTable;