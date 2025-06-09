import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Button, Form, Card, Dropdown, ListGroup, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faChevronDown, faSearch, faTimes, faLightbulb, faBox, faTag, faWarehouse, faSpinner } from '@fortawesome/free-solid-svg-icons';
import ProductModal from '../../../Inventory/ProductModal';
import itemService from '../../../../../services/itemService';
import './ItemsTable.css';

function ItemsTable({
    items,
    gstEnabled,
    invoiceType,
    onItemsChange,
    onTotalsChange, // ✅ NEW: Add this prop to communicate totals
    createEmptyItem,
    onAddItem,
    companyId
}) {
    const [globalTaxMode, setGlobalTaxMode] = useState('with-tax');
    const [itemSearches, setItemSearches] = useState({});
    const [itemSuggestions, setItemSuggestions] = useState({});
    const [showItemSuggestions, setShowItemSuggestions] = useState({});
    const [searchNotFound, setSearchNotFound] = useState({});
    const [searchLoading, setSearchLoading] = useState({});
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [selectedRowIndex, setSelectedRowIndex] = useState(null);
    const [categories, setCategories] = useState([]);
    const searchTimeoutRefs = useRef({});

    // Product form data for the modal
    const [productFormData, setProductFormData] = useState({
        type: 'product',
        name: '',
        itemCode: '',
        hsnNumber: '',
        unit: 'PCS',
        category: '',
        description: '',
        gstRate: 18,
        openingStock: 0,
        asOfDate: new Date().toISOString().split('T')[0],
        minStockLevel: 0,
        buyPrice: 0,
        salePrice: 0,
        isActive: true
    });

    // Debug effect to log component state
    useEffect(() => {
        console.log('🔧 ItemsTable Debug Info:', {
            companyId,
            hasItemService: !!itemService,
            itemsCount: items.length,
            categoriesCount: categories.length,
            categoriesType: typeof categories,
            categoriesIsArray: Array.isArray(categories),
            hasOnTotalsChange: !!onTotalsChange
        });
    }, [companyId, items.length, categories, onTotalsChange]);

    // Load categories on component mount
    useEffect(() => {
        if (companyId) {
            loadCategories();
        }
    }, [companyId]);

    // ✅ FIXED: Enhanced totals calculation with proper field mapping for TotalSection
    const calculateTotals = useCallback(() => {
        let totalQuantity = 0;
        let totalDiscountAmount = 0;
        let totalCgstAmount = 0;
        let totalSgstAmount = 0;
        let subtotal = 0;
        let totalAmount = 0;

        items.forEach(item => {
            const quantity = parseFloat(item.quantity) || 0;
            const pricePerUnit = parseFloat(item.pricePerUnit) || 0;
            const amount = parseFloat(item.amount) || 0;
            const discountAmount = parseFloat(item.discountAmount) || 0;
            const cgstAmount = parseFloat(item.cgstAmount) || 0;
            const sgstAmount = parseFloat(item.sgstAmount) || 0;

            if (quantity > 0 && pricePerUnit > 0) {
                const baseAmount = quantity * pricePerUnit;

                totalQuantity += quantity;
                totalDiscountAmount += discountAmount;
                totalCgstAmount += cgstAmount;
                totalSgstAmount += sgstAmount;
                subtotal += (baseAmount - discountAmount); // Subtotal before tax
                totalAmount += amount; // Final amount after tax
            }
        });

        const totalTax = totalCgstAmount + totalSgstAmount;

        // ✅ FIXED: Return totals in both formats - for ItemsTable display AND TotalSection
        const calculatedTotals = {
            // For ItemsTable display (existing format)
            totalQuantity: parseFloat(totalQuantity.toFixed(2)),
            totalDiscountAmount: parseFloat(totalDiscountAmount.toFixed(2)),
            totalCgstAmount: parseFloat(totalCgstAmount.toFixed(2)),
            totalSgstAmount: parseFloat(totalSgstAmount.toFixed(2)),
            totalAmount: parseFloat(totalAmount.toFixed(2)),

            // ✅ NEW: For TotalSection compatibility (matching expected field names)
            subtotal: parseFloat(subtotal.toFixed(2)),
            totalCGST: parseFloat(totalCgstAmount.toFixed(2)), // Maps cgstAmount → totalCGST
            totalSGST: parseFloat(totalSgstAmount.toFixed(2)), // Maps sgstAmount → totalSGST
            totalTax: parseFloat(totalTax.toFixed(2)),
            finalTotal: parseFloat(totalAmount.toFixed(2))
        };

        console.log('📊 ItemsTable calculated totals:', calculatedTotals);
        return calculatedTotals;
    }, [items]);

    // ✅ NEW: Notify parent component about totals changes
    const notifyTotalsChange = useCallback((newTotals) => {
        if (onTotalsChange && typeof onTotalsChange === 'function') {
            console.log('📤 Sending totals to parent:', newTotals);
            onTotalsChange(newTotals);
        }
    }, [onTotalsChange]);

    // ✅ FIXED: Update totals whenever items change
    useEffect(() => {
        const totals = calculateTotals();
        notifyTotalsChange(totals);
    }, [items, gstEnabled, calculateTotals, notifyTotalsChange]);

    const loadCategories = async () => {
        try {
            console.log('📂 Loading categories for company:', companyId);
            const response = await itemService.getCategories(companyId);

            if (response && response.success && response.data) {
                let categoriesArray = [];

                if (response.data.categories && Array.isArray(response.data.categories)) {
                    categoriesArray = response.data.categories.map((categoryName, index) => ({
                        id: index + 1,
                        name: categoryName,
                        description: `${categoryName} category`,
                        isActive: true
                    }));
                } else if (Array.isArray(response.data)) {
                    categoriesArray = response.data.map((category, index) => {
                        if (typeof category === 'string') {
                            return {
                                id: index + 1,
                                name: category,
                                description: `${category} category`,
                                isActive: true
                            };
                        } else {
                            return {
                                id: category.id || index + 1,
                                name: category.name || category,
                                description: category.description || `${category.name || category} category`,
                                isActive: category.isActive !== undefined ? category.isActive : true
                            };
                        }
                    });
                }

                if (categoriesArray.length === 0) {
                    categoriesArray = [
                        { id: 1, name: 'Electronics', description: 'Electronic items and gadgets', isActive: true },
                        { id: 2, name: 'Furniture', description: 'Office and home furniture', isActive: true },
                        { id: 3, name: 'Stationery', description: 'Office stationery items', isActive: true },
                        { id: 4, name: 'Services', description: 'Service-based offerings', isActive: true },
                    ];
                }

                setCategories(categoriesArray);
                console.log('✅ Categories loaded:', categoriesArray);
            } else {
                setCategories([
                    { id: 1, name: 'Electronics', description: 'Electronic items and gadgets', isActive: true },
                    { id: 2, name: 'Furniture', description: 'Office and home furniture', isActive: true },
                    { id: 3, name: 'Stationery', description: 'Office stationery items', isActive: true },
                    { id: 4, name: 'Services', description: 'Service-based offerings', isActive: true },
                ]);
            }
        } catch (error) {
            console.error('❌ Error loading categories:', error);
            setCategories([
                { id: 1, name: 'Electronics', description: 'Electronic items and gadgets', isActive: true },
                { id: 2, name: 'Furniture', description: 'Office and home furniture', isActive: true },
                { id: 3, name: 'Stationery', description: 'Office stationery items', isActive: true },
                { id: 4, name: 'Services', description: 'Service-based offerings', isActive: true },
            ]);
        }
    };

    // Enhanced search function
    const searchItems = useCallback(async (query, rowIndex) => {
        if (!query.trim() || query.length < 2) {
            setItemSuggestions(prev => ({ ...prev, [rowIndex]: [] }));
            setShowItemSuggestions(prev => ({ ...prev, [rowIndex]: false }));
            setSearchNotFound(prev => ({ ...prev, [rowIndex]: false }));
            return;
        }

        if (!companyId) {
            setSearchNotFound(prev => ({ ...prev, [rowIndex]: query }));
            setSelectedRowIndex(rowIndex);
            return;
        }

        setSearchLoading(prev => ({ ...prev, [rowIndex]: true }));

        try {
            const response = await itemService.searchItems(companyId, query, 'product', 8);
            let items = [];

            if (response?.success && response.data) {
                if (response.data.items && Array.isArray(response.data.items)) {
                    items = response.data.items;
                } else if (Array.isArray(response.data)) {
                    items = response.data;
                }
            }

            if (items.length > 0) {
                setItemSuggestions(prev => ({ ...prev, [rowIndex]: items }));
                setShowItemSuggestions(prev => ({ ...prev, [rowIndex]: true }));
                setSearchNotFound(prev => ({ ...prev, [rowIndex]: false }));
                setSelectedRowIndex(null);
            } else {
                setItemSuggestions(prev => ({ ...prev, [rowIndex]: [] }));
                setShowItemSuggestions(prev => ({ ...prev, [rowIndex]: false }));
                if (query.length >= 2) {
                    setSearchNotFound(prev => ({ ...prev, [rowIndex]: query }));
                    setSelectedRowIndex(rowIndex);
                }
            }
        } catch (error) {
            console.error('❌ Error searching items:', error);
            setItemSuggestions(prev => ({ ...prev, [rowIndex]: [] }));
            setShowItemSuggestions(prev => ({ ...prev, [rowIndex]: false }));
            if (query.length >= 2) {
                setSearchNotFound(prev => ({ ...prev, [rowIndex]: query }));
                setSelectedRowIndex(rowIndex);
            }
        } finally {
            setSearchLoading(prev => ({ ...prev, [rowIndex]: false }));
        }
    }, [companyId]);

    // Handle Alt+C keyboard shortcut
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
        console.log(`📝 handleItemChange: row ${index}, field ${field}, value:`, value);

        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Handle item name search
        if (field === 'itemName') {
            handleItemSearch(index, value);
        }

        // ✅ FIXED: Calculate totals for specific fields and notify parent
        if (['quantity', 'pricePerUnit', 'discountPercent', 'discountAmount', 'cgstAmount', 'sgstAmount', 'taxMode'].includes(field)) {
            calculateItemTotals(newItems[index], index, newItems, field);

            // ✅ NEW: Immediately notify parent of totals change
            setTimeout(() => {
                const updatedTotals = calculateTotals();
                notifyTotalsChange(updatedTotals);
            }, 0);
        }

        onItemsChange(newItems);
    };

    const handleItemSearch = (rowIndex, searchQuery) => {
        setItemSearches(prev => ({ ...prev, [rowIndex]: searchQuery }));

        if (searchTimeoutRefs.current[rowIndex]) {
            clearTimeout(searchTimeoutRefs.current[rowIndex]);
        }

        if (searchQuery.length > 0) {
            if (searchQuery.length >= 2) {
                searchTimeoutRefs.current[rowIndex] = setTimeout(() => {
                    searchItems(searchQuery, rowIndex);
                }, 300);
            } else {
                setShowItemSuggestions(prev => ({ ...prev, [rowIndex]: false }));
                setSearchNotFound(prev => ({ ...prev, [rowIndex]: false }));
                setItemSuggestions(prev => ({ ...prev, [rowIndex]: [] }));
                setSelectedRowIndex(null);
            }
        } else {
            setShowItemSuggestions(prev => ({ ...prev, [rowIndex]: false }));
            setSearchNotFound(prev => ({ ...prev, [rowIndex]: false }));
            setItemSuggestions(prev => ({ ...prev, [rowIndex]: [] }));
            setSelectedRowIndex(null);
        }
    };

    const handleItemSuggestionClick = (rowIndex, item) => {
        const newItems = [...items];
        const taxRate = item.gstRate || 0;

        newItems[rowIndex] = {
            ...newItems[rowIndex],
            itemRef: item._id || item.id,
            itemName: item.name,
            hsnCode: item.hsnNumber || '',
            unit: item.unit || 'PCS',
            pricePerUnit: item.salePrice || 0,
            taxRate: taxRate,
            itemCode: item.itemCode || '',
            category: item.category || '',
            currentStock: item.currentStock || 0,
            minStockLevel: item.minStockLevel || item.minStockToMaintain || 0
        };

        calculateItemTotals(newItems[rowIndex], rowIndex, newItems);

        setItemSearches(prev => ({ ...prev, [rowIndex]: item.name }));
        setShowItemSuggestions(prev => ({ ...prev, [rowIndex]: false }));
        setSearchNotFound(prev => ({ ...prev, [rowIndex]: false }));
        setSearchLoading(prev => ({ ...prev, [rowIndex]: false }));
        setSelectedRowIndex(null);

        onItemsChange(newItems);
    };

    const clearItemSearch = (rowIndex) => {
        setItemSearches(prev => ({ ...prev, [rowIndex]: '' }));
        setShowItemSuggestions(prev => ({ ...prev, [rowIndex]: false }));
        setSearchNotFound(prev => ({ ...prev, [rowIndex]: false }));
        setSearchLoading(prev => ({ ...prev, [rowIndex]: false }));
        setItemSuggestions(prev => ({ ...prev, [rowIndex]: [] }));
        setSelectedRowIndex(null);

        const newItems = [...items];
        newItems[rowIndex] = {
            ...newItems[rowIndex],
            itemRef: null,
            itemName: '',
            hsnCode: '',
            unit: 'PCS',
            pricePerUnit: 0,
            taxRate: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            itemCode: '',
            category: '',
            currentStock: 0,
            minStockLevel: 0
        };
        onItemsChange(newItems);
    };

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
        console.log('💾 Saving product:', productFormData);

        if (!companyId) {
            alert('Company ID is required to create items');
            return false;
        }

        try {
            let result;
            if (onAddItem) {
                result = await onAddItem(productFormData);
            } else {
                result = await itemService.createItem(companyId, productFormData);
            }

            if (result && result.success) {
                const newItem = result.data;
                const taxRate = newItem.gstRate || 0;

                if (selectedRowIndex !== null) {
                    const newItems = [...items];
                    newItems[selectedRowIndex] = {
                        ...newItems[selectedRowIndex],
                        itemRef: newItem._id || newItem.id,
                        itemName: newItem.name,
                        hsnCode: newItem.hsnNumber || '',
                        unit: newItem.unit || 'PCS',
                        pricePerUnit: newItem.salePrice || 0,
                        taxRate: taxRate,
                        itemCode: newItem.itemCode || '',
                        category: newItem.category || '',
                        currentStock: newItem.currentStock || newItem.openingStock || 0,
                        minStockLevel: newItem.minStockLevel || newItem.minStockToMaintain || 0
                    };

                    calculateItemTotals(newItems[selectedRowIndex], selectedRowIndex, newItems);
                    setItemSearches(prev => ({ ...prev, [selectedRowIndex]: newItem.name }));
                    setSearchNotFound(prev => ({ ...prev, [selectedRowIndex]: false }));
                    onItemsChange(newItems);
                }

                loadCategories();

                if (!saveAndAdd) {
                    setShowAddItemModal(false);
                    setSelectedRowIndex(null);
                    resetProductForm();
                } else {
                    resetProductForm();
                }

                return result;
            } else {
                throw new Error(result?.message || 'Failed to save product');
            }
        } catch (error) {
            console.error('❌ Error saving product:', error);
            alert(`Error saving product: ${error.message}`);
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
            unit: 'PCS',
            category: '',
            description: '',
            gstRate: 18,
            openingStock: 0,
            asOfDate: new Date().toISOString().split('T')[0],
            minStockLevel: 0,
            buyPrice: 0,
            salePrice: 0,
            isActive: true
        });
    };

    const handleGlobalTaxModeChange = (mode) => {
        setGlobalTaxMode(mode);
        const newItems = items.map(item => ({ ...item, taxMode: mode }));

        newItems.forEach((item, index) => {
            calculateItemTotals(item, index, newItems);
        });

        onItemsChange(newItems);
    };

    // ✅ FIXED: Enhanced calculation function for proper "with tax" handling
    const calculateItemTotals = (item, index, allItems, changedField = null) => {
        const quantity = parseFloat(item.quantity) || 0;
        const pricePerUnit = parseFloat(item.pricePerUnit) || 0;
        const taxMode = item.taxMode || globalTaxMode;

        // Base amount calculation
        const baseAmount = quantity * pricePerUnit;

        let discountPercent = parseFloat(item.discountPercent) || 0;
        let discountAmount = parseFloat(item.discountAmount) || 0;
        let cgstAmount = parseFloat(item.cgstAmount) || 0;
        let sgstAmount = parseFloat(item.sgstAmount) || 0;

        // Handle discount calculations
        if (changedField === 'discountPercent') {
            discountAmount = (baseAmount * discountPercent) / 100;
        } else if (changedField === 'discountAmount') {
            discountPercent = baseAmount > 0 ? (discountAmount * 100) / baseAmount : 0;
        } else if (!changedField || changedField === 'quantity' || changedField === 'pricePerUnit') {
            discountAmount = (baseAmount * discountPercent) / 100;
        }

        const amountAfterDiscount = baseAmount - discountAmount;

        // ✅ FIXED: Handle tax calculations based on mode
        if (gstEnabled) {
            if (changedField === 'cgstAmount') {
                sgstAmount = cgstAmount; // Mirror CGST to SGST
            } else if (changedField === 'sgstAmount') {
                cgstAmount = sgstAmount; // Mirror SGST to CGST
            } else if (!changedField || ['quantity', 'pricePerUnit', 'discountPercent', 'discountAmount', 'taxMode'].includes(changedField)) {
                const taxRate = parseFloat(item.taxRate) || 0;
                if (taxRate > 0) {
                    let totalTaxAmount;

                    if (taxMode === 'with-tax') {
                        // ✅ FIXED: For "with tax" - the price includes tax, so extract tax from the amount
                        totalTaxAmount = (amountAfterDiscount * taxRate) / (100 + taxRate);
                    } else {
                        // For "without tax" - add tax to the amount
                        totalTaxAmount = (amountAfterDiscount * taxRate) / 100;
                    }

                    cgstAmount = totalTaxAmount / 2;
                    sgstAmount = totalTaxAmount / 2;
                }
            }
        } else {
            cgstAmount = 0;
            sgstAmount = 0;
        }

        // ✅ FIXED: Calculate final amount based on tax mode
        const totalTaxAmount = cgstAmount + sgstAmount;
        let finalAmount;

        if (gstEnabled && totalTaxAmount > 0) {
            if (taxMode === 'with-tax') {
                // ✅ FIXED: For "with tax" - the amount after discount IS the final amount (tax included)
                finalAmount = amountAfterDiscount;
            } else {
                // For "without tax" - add tax to get final amount
                finalAmount = amountAfterDiscount + totalTaxAmount;
            }
        } else {
            finalAmount = amountAfterDiscount;
        }

        const igst = totalTaxAmount;

        // Update the item with calculated values
        allItems[index] = {
            ...item,
            discountPercent: parseFloat(discountPercent.toFixed(2)),
            discountAmount: parseFloat(discountAmount.toFixed(2)),
            cgstAmount: parseFloat(cgstAmount.toFixed(2)),
            sgstAmount: parseFloat(sgstAmount.toFixed(2)),
            igst: parseFloat(igst.toFixed(2)),
            amount: parseFloat(finalAmount.toFixed(2))
        };

        console.log('🧮 Item calculation:', {
            index,
            taxMode,
            baseAmount,
            amountAfterDiscount,
            totalTaxAmount,
            finalAmount,
            cgstAmount,
            sgstAmount
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

            const newItemSearches = { ...itemSearches };
            const newItemSuggestions = { ...itemSuggestions };
            const newShowItemSuggestions = { ...showItemSuggestions };
            const newSearchNotFound = { ...searchNotFound };
            const newSearchLoading = { ...searchLoading };

            delete newItemSearches[index];
            delete newItemSuggestions[index];
            delete newShowItemSuggestions[index];
            delete newSearchNotFound[index];
            delete newSearchLoading[index];

            setItemSearches(newItemSearches);
            setItemSuggestions(newItemSuggestions);
            setShowItemSuggestions(newShowItemSuggestions);
            setSearchNotFound(newSearchNotFound);
            setSearchLoading(newSearchLoading);

            if (searchTimeoutRefs.current[index]) {
                clearTimeout(searchTimeoutRefs.current[index]);
                delete searchTimeoutRefs.current[index];
            }

            onItemsChange(newItems);
        }
    };

    // ✅ FIXED: Get current totals for display
    const totals = calculateTotals();
    const unitOptions = ['NONE', 'KG', 'GM', 'LTR', 'ML', 'PCS', 'BOX', 'M', 'CM'];

    const getColumnWidths = () => {
        if (gstEnabled) {
            return {
                serial: '3%',
                item: '20%',
                hsn: '8%',
                qty: '7%',
                unit: '7%',
                price: '13%',
                discount: '15%',
                tax: '15%',
                amount: '12%',
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
                discount: '18%',
                amount: '12%',
                action: '4%'
            };
        }
    };

    const colWidths = getColumnWidths();

    useEffect(() => {
        return () => {
            Object.values(searchTimeoutRefs.current).forEach(timeout => {
                clearTimeout(timeout);
            });
        };
    }, []);

    return (
        <>
            <div className="mt-4">
                <Card className="shadow-sm">
                    <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">Items Details</h6>
                        <div className="d-flex align-items-center gap-2">
                            <small className="text-muted">
                                {companyId ? `Connected to Company: ${companyId}` : 'No Company ID'}
                            </small>
                            <small className="text-success">
                                Categories: {categories.length}
                            </small>
                            {/* ✅ NEW: Debug totals sync indicator */}
                            {process.env.NODE_ENV === 'development' && (
                                <small className="text-info">
                                    Totals: {onTotalsChange ? '✅ Synced' : '❌ No sync'}
                                </small>
                            )}
                        </div>
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
                                            <div className="tax-header-container">
                                                <div className="tax-main-header">TAX</div>
                                                <div className="tax-sub-headers">
                                                    <div className="tax-sub-header cgst-header">
                                                        CGST ₹
                                                    </div>
                                                    <div className="tax-sub-header sgst-header">
                                                        SGST ₹
                                                    </div>
                                                </div>
                                            </div>
                                        </th>
                                    )}
                                    <th style={{ width: colWidths.amount }}>AMOUNT</th>
                                    <th style={{ width: colWidths.action }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <React.Fragment key={item.id}>
                                        {/* ...existing table rows code remains the same... */}
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
                                                        {searchLoading[index] && (
                                                            <div className="position-absolute top-50 end-0 translate-middle-y me-5">
                                                                <FontAwesomeIcon icon={faSpinner} spin className="text-muted" size="sm" />
                                                            </div>
                                                        )}
                                                        {(itemSearches[index] || item.itemName) && !searchLoading[index] && (
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

                                                    {/* Stock warning for selected items */}
                                                    {item.itemRef && item.currentStock !== undefined && (
                                                        <div className="mt-1">
                                                            <small className={`text-${item.currentStock <= item.minStockLevel ? 'danger' : item.currentStock < 10 ? 'warning' : 'muted'}`}>
                                                                Stock: {item.currentStock} {item.unit}
                                                                {item.currentStock <= item.minStockLevel && ' (Low Stock!)'}
                                                            </small>
                                                        </div>
                                                    )}

                                                    {/* Item Suggestions Dropdown */}
                                                    {showItemSuggestions[index] && itemSuggestions[index]?.length > 0 && (
                                                        <div className="suggestions-dropdown position-absolute w-100" style={{ zIndex: 1050, top: '100%' }}>
                                                            <div className="suggestions-container shadow-lg border rounded">
                                                                <div className="suggestions-header bg-primary text-white py-2 px-3">
                                                                    <div className="d-flex align-items-center">
                                                                        <FontAwesomeIcon icon={faLightbulb} className="me-2" />
                                                                        <span className="fw-semibold small">Found {itemSuggestions[index].length} items</span>
                                                                        <FontAwesomeIcon icon={faSearch} className="ms-auto opacity-75" size="sm" />
                                                                    </div>
                                                                </div>
                                                                <div className="suggestions-list">
                                                                    {itemSuggestions[index].slice(0, 6).map((inventoryItem) => (
                                                                        <div
                                                                            key={inventoryItem._id || inventoryItem.id}
                                                                            className="suggestion-item py-3 px-3 border-bottom cursor-pointer hover:bg-light"
                                                                            onClick={() => handleItemSuggestionClick(index, inventoryItem)}
                                                                            style={{ cursor: 'pointer' }}
                                                                        >
                                                                            <div className="d-flex justify-content-between align-items-start">
                                                                                <div className="flex-grow-1 me-3">
                                                                                    <div className="item-name fw-bold text-dark mb-1">
                                                                                        {inventoryItem.name}
                                                                                    </div>
                                                                                    <div className="item-details d-flex flex-wrap gap-2 small text-muted">
                                                                                        <span className="d-flex align-items-center">
                                                                                            <FontAwesomeIcon icon={faTag} className="me-1" size="xs" />
                                                                                            {inventoryItem.itemCode || 'No Code'}
                                                                                        </span>
                                                                                        <span className="text-primary">
                                                                                            {inventoryItem.category || 'No Category'}
                                                                                        </span>
                                                                                        <span className="d-flex align-items-center">
                                                                                            <FontAwesomeIcon icon={faWarehouse} className="me-1" size="xs" />
                                                                                            HSN: {inventoryItem.hsnNumber || 'N/A'}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="item-price-info text-end">
                                                                                    <div className="price text-success fw-bold">
                                                                                        ₹{inventoryItem.salePrice?.toLocaleString('en-IN') || '0'}
                                                                                    </div>
                                                                                    <div className="stock-info small">
                                                                                        <span className={`stock-badge ${(inventoryItem.currentStock || 0) > (inventoryItem.minStockLevel || inventoryItem.minStockToMaintain || 0) ? 'text-success' : 'text-warning'}`}>
                                                                                            Stock: {inventoryItem.currentStock || inventoryItem.openingStock || 0}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="gst-rate text-muted" style={{ fontSize: '0.7rem' }}>
                                                                                        GST: {inventoryItem.gstRate || 0}%
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
                                                    {searchNotFound[index] && !searchLoading[index] && !showItemSuggestions[index] && (
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
                                                {item.itemRef && item.currentStock !== undefined && item.quantity > item.currentStock && (
                                                    <small className="text-danger">
                                                        Exceeds stock ({item.currentStock})
                                                    </small>
                                                )}
                                            </td>
                                            <td>
                                                <Form.Select
                                                    value={item.unit || 'PCS'}
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
                                                        style={{ width: '65px' }}
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
                                                        style={{ width: '75px' }}
                                                        placeholder="₹"
                                                    />
                                                </div>
                                            </td>
                                            {gstEnabled && (
                                                <td>
                                                    <div className="d-flex flex-column gap-1">
                                                        <Form.Control
                                                            type="number"
                                                            value={item.cgstAmount || ''}
                                                            onChange={(e) => handleItemChange(index, 'cgstAmount', e.target.value)}
                                                            min="0"
                                                            step="0.01"
                                                            className="text-center"
                                                            size="sm"
                                                            placeholder="CGST ₹"
                                                        />
                                                        <Form.Control
                                                            type="number"
                                                            value={item.sgstAmount || ''}
                                                            onChange={(e) => handleItemChange(index, 'sgstAmount', e.target.value)}
                                                            min="0"
                                                            step="0.01"
                                                            className="text-center"
                                                            size="sm"
                                                            placeholder="SGST ₹"
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

                                {/* ✅ FIXED: Enhanced totals row with correct field names */}
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
                                            <div className="d-flex flex-column gap-1">
                                                <span>
                                                    <strong>₹{totals.totalCgstAmount.toLocaleString('en-IN')}</strong>
                                                </span>
                                                <span>
                                                    <strong>₹{totals.totalSgstAmount.toLocaleString('en-IN')}</strong>
                                                </span>
                                            </div>
                                        </td>
                                    )}
                                    <td className="text-center">
                                        <strong className="text-success">₹{totals.totalAmount.toLocaleString('en-IN')}</strong>
                                    </td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </Table>

                        {/* ✅ NEW: Debug section for totals sync */}
                        {process.env.NODE_ENV === 'development' && (
                            <div className="p-3 bg-light border-top">
                                <h6 className="text-muted mb-2">🔧 Debug - ItemsTable Totals</h6>
                                <div className="small text-muted">
                                    <div className="row">
                                        <div className="col-md-6">
                                            <div><strong>Subtotal:</strong> ₹{totals.subtotal}</div>
                                            <div><strong>Total CGST:</strong> ₹{totals.totalCGST}</div>
                                            <div><strong>Total SGST:</strong> ₹{totals.totalSGST}</div>
                                        </div>
                                        <div className="col-md-6">
                                            <div><strong>Total Tax:</strong> ₹{totals.totalTax}</div>
                                            <div><strong>Final Total:</strong> ₹{totals.finalTotal}</div>
                                            <div><strong>Sync Status:</strong> {onTotalsChange ? '✅ Active' : '❌ Missing'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </div>

            <ProductModal
                show={showAddItemModal}
                onHide={handleCloseProductModal}
                editingProduct={null}
                formData={productFormData}
                categories={Array.isArray(categories) ? categories : []}
                onInputChange={handleProductInputChange}
                onSaveProduct={handleSaveProduct}
                currentCompany={{ id: companyId, companyName: 'Current Company' }}
                mode="add"
                type={productFormData.type || 'product'}
            />
        </>
    );
}

export default ItemsTable;