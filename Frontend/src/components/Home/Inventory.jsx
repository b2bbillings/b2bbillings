import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Container, Row, Col, Button, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faExclamationTriangle, faSync } from '@fortawesome/free-solid-svg-icons';
import './Inventory.css';

// Import services
import itemService from '../../services/itemService';

// Import components
import InventoryHeader from './Inventory/InventoryHeader';
import InventorySidebar from './Inventory/InventorySidebar';
import ItemInfoSection from './Inventory/ItemInfoSection';
import TransactionHistory from './Inventory/TransactionHistory';
import ProductModal from './Inventory/ProductModal';
import StockAdjustmentModal from './Inventory/StockAdjustmentModal';
import CategoryModal from './Inventory/CategoryModal';
import BulkImportModal from './Inventory/BulkImportModal';
import SalesForm from './Sales/SalesInvoice/SalesForm';
import PurchaseForm from './Purchases/PurchaseForm';

function Inventory({ view = 'allProducts', onNavigate, currentCompany }) {
    // Add current view state for form navigation
    const [currentView, setCurrentView] = useState('inventory'); // 'inventory', 'sale', 'purchase'

    // State management
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [activeType, setActiveType] = useState('products'); // 'products' or 'services'
    const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
    const [transactionSearchQuery, setTransactionSearchQuery] = useState('');

    // Loading and error states
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        current: 1,
        total: 1,
        count: 0,
        totalItems: 0
    });

    // Modal states - Updated for edit functionality
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false); // New state for product modal
    const [showStockModal, setShowStockModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showBulkImportModal, setShowBulkImportModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [editingItem, setEditingItem] = useState(null); // New state for editing items
    const [modalType, setModalType] = useState('add'); // 'add' or 'edit'
    const [selectedProductForStock, setSelectedProductForStock] = useState(null);

    // Updated form data states to match ProductModal
    const [formData, setFormData] = useState({
        name: '',
        itemCode: '',
        hsnNumber: '',
        category: '',
        description: '',
        buyPrice: 0,
        salePrice: 0,
        atPrice: 0, // Added atPrice field
        gstRate: 18,
        unit: 'PCS',
        type: 'product',
        // Updated stock field names to match backend model
        minStockLevel: 0,
        minStockToMaintain: 0, // Alternative name for minStockLevel
        currentStock: 0,
        openingStock: 0,
        openingQuantity: 0, // Alternative name for openingStock
        asOfDate: new Date().toISOString().split('T')[0],
        // Tax-related fields
        isBuyPriceTaxInclusive: false,
        isSalePriceTaxInclusive: false,
        buyPriceWithTax: 0,
        buyPriceWithoutTax: 0,
        salePriceWithTax: 0,
        salePriceWithoutTax: 0,
        isActive: true
    });

    const [categoryFormData, setCategoryFormData] = useState({
        name: '',
        description: '',
        isActive: true
    });

    // Improved loadItems function with better data handling
    const loadItems = async (searchQuery = '', page = 1, limit = 50) => {
        if (!currentCompany?.id) {
            console.warn('⚠️ No company selected for loading items');
            return;
        }

        try {
            setIsLoadingItems(true);
            setError(null);

            console.log('📋 Loading items for company:', currentCompany.id, {
                searchQuery,
                activeType,
                page,
                limit
            });

            const params = {
                page,
                limit,
                search: searchQuery,
                type: activeType === 'products' ? 'product' : 'service',
                isActive: true,
                sortBy: 'name',
                sortOrder: 'asc'
            };

            const response = await itemService.getItems(currentCompany.id, params);
            
            console.log('📋 Raw response from itemService:', response);

            if (response && response.success) {
                const items = response.data?.items || response.data?.data || response.data || [];
                
                console.log('📋 Raw items from response:', items);
                
                // Enhanced item normalization with proper price handling
                const normalizedItems = items.map(item => {
                    const normalized = {
                        ...item,
                        // Ensure ID consistency
                        id: item.id || item._id,
                        _id: item._id || item.id,
                        // Ensure stock field consistency with proper number conversion
                        currentStock: Number(item.currentStock || item.openingStock || item.openingQuantity || item.stock || item.quantity || 0),
                        openingStock: Number(item.openingStock || item.currentStock || item.openingQuantity || item.stock || item.quantity || 0),
                        openingQuantity: Number(item.openingQuantity || item.currentStock || item.openingStock || item.stock || item.quantity || 0),
                        // Handle price fields - prioritize actual stored prices over calculated ones
                        salePrice: Number(item.salePrice || item.salePriceWithoutTax || item.salePriceWithTax || 0),
                        buyPrice: Number(item.buyPrice || item.buyPriceWithoutTax || item.buyPriceWithTax || 0),
                        atPrice: Number(item.atPrice || 0),
                        gstRate: Number(item.gstRate || 18),
                        // Preserve calculated price fields
                        salePriceWithTax: Number(item.salePriceWithTax || 0),
                        salePriceWithoutTax: Number(item.salePriceWithoutTax || 0),
                        buyPriceWithTax: Number(item.buyPriceWithTax || 0),
                        buyPriceWithoutTax: Number(item.buyPriceWithoutTax || 0),
                        // Preserve tax flags
                        isBuyPriceTaxInclusive: item.isBuyPriceTaxInclusive || false,
                        isSalePriceTaxInclusive: item.isSalePriceTaxInclusive || false,
                        // Ensure other fields
                        unit: item.unit || 'PCS',
                        minStockLevel: Number(item.minStockLevel || item.minStockToMaintain || 0),
                        minStockToMaintain: Number(item.minStockToMaintain || item.minStockLevel || 0),
                        isActive: item.isActive !== undefined ? item.isActive : true,
                        // Ensure string fields
                        name: item.name || '',
                        itemCode: item.itemCode || '',
                        category: item.category || '',
                        type: item.type || 'product'
                    };
                    
                    console.log('📋 Normalized item:', normalized);
                    return normalized;
                });

                setProducts(normalizedItems);
                setPagination(response.data?.pagination || {});

                // Update selected item if it exists in the new data
                if (selectedItem) {
                    const selectedItemId = selectedItem.id || selectedItem._id;
                    const updatedSelectedItem = normalizedItems.find(item => 
                        (item.id === selectedItemId || item._id === selectedItemId)
                    );
                    
                    if (updatedSelectedItem) {
                        console.log('🎯 Updating selected item with fresh data from reload');
                        setSelectedItem(updatedSelectedItem);
                    } else {
                        console.log('🎯 Selected item no longer exists, clearing selection');
                        setSelectedItem(null);
                    }
                } else if (normalizedItems.length > 0) {
                    // Set first item as selected if no item is selected
                    setSelectedItem(normalizedItems[0]);
                    console.log('🎯 Auto-selected first item:', normalizedItems[0]);
                }

                console.log('✅ Items loaded and normalized successfully:', normalizedItems.length);
            } else {
                console.error('❌ Invalid response structure:', response);
                throw new Error(response?.message || 'Invalid response from server');
            }

        } catch (error) {
            console.error('❌ Error loading items:', error);
            setError(`Failed to load items: ${error.message}`);
            setProducts([]);
            setSelectedItem(null);
        } finally {
            setIsLoadingItems(false);
        }
    };

    // Load categories from backend
    const loadCategories = async () => {
        if (!currentCompany?.id) {
            console.warn('⚠️ No company selected for loading categories');
            return;
        }

        try {
            setIsLoadingCategories(true);

            console.log('📂 Loading categories for company:', currentCompany.id);

            const response = await itemService.getCategories(currentCompany.id);

            if (response.success) {
                const categoriesFromAPI = response.data.categories || [];

                // Convert API response to match component format
                const formattedCategories = categoriesFromAPI.map((categoryName, index) => ({
                    id: index + 1,
                    name: categoryName,
                    description: `${categoryName} category`,
                    isActive: true
                }));

                // Add default categories if none exist
                if (formattedCategories.length === 0) {
                    const defaultCategories = [
                        { id: 1, name: 'Electronics', description: 'Electronic items and gadgets', isActive: true },
                        { id: 2, name: 'Furniture', description: 'Office and home furniture', isActive: true },
                        { id: 3, name: 'Stationery', description: 'Office stationery items', isActive: true },
                        { id: 4, name: 'Services', description: 'Service-based offerings', isActive: true },
                    ];
                    setCategories(defaultCategories);
                } else {
                    setCategories(formattedCategories);
                }

                console.log('✅ Categories loaded successfully:', formattedCategories.length);
            } else {
                throw new Error(response.message || 'Failed to load categories');
            }

        } catch (error) {
            console.error('❌ Error loading categories:', error);
            // Set default categories on error
            const defaultCategories = [
                { id: 1, name: 'Electronics', description: 'Electronic items and gadgets', isActive: true },
                { id: 2, name: 'Furniture', description: 'Office and home furniture', isActive: true },
                { id: 3, name: 'Stationery', description: 'Office stationery items', isActive: true },
                { id: 4, name: 'Services', description: 'Service-based offerings', isActive: true },
            ];
            setCategories(defaultCategories);
        } finally {
            setIsLoadingCategories(false);
        }
    };

    // Load data when component mounts or company changes
    useEffect(() => {
        if (currentCompany?.id) {
            console.log('🔄 Company changed, loading data for:', currentCompany.companyName);
            loadItems();
            loadCategories();
        } else {
            console.warn('⚠️ No company selected, clearing data');
            setProducts([]);
            setCategories([]);
            setSelectedItem(null);
        }
    }, [currentCompany?.id]);

    // Reload items when activeType changes
    useEffect(() => {
        if (currentCompany?.id) {
            console.log('🔄 Type changed to:', activeType);
            loadItems(sidebarSearchQuery);
        }
    }, [activeType]);

    // Handle search query changes
    useEffect(() => {
        if (currentCompany?.id) {
            const debounceTimer = setTimeout(() => {
                loadItems(sidebarSearchQuery);
            }, 300);

            return () => clearTimeout(debounceTimer);
        }
    }, [sidebarSearchQuery]);

    // Sample transactions (to be replaced with API later)
    useEffect(() => {
        const sampleTransactions = [
            {
                id: 1,
                type: 'Sale',
                invoiceNumber: '1',
                itemId: selectedItem?.id || selectedItem?._id,
                customerName: 'IT Solution',
                date: '03/06/2025',
                quantity: 1,
                pricePerUnit: 100000,
                status: 'Unpaid'
            },
            {
                id: 2,
                type: 'Purchase',
                invoiceNumber: '',
                itemId: selectedItem?.id || selectedItem?._id,
                customerName: 'IT Solution',
                date: '03/06/2025',
                quantity: 1,
                pricePerUnit: 11111,
                status: 'Paid'
            }
        ];
        setTransactions(sampleTransactions);
    }, [selectedItem]);

    // Filter products/services based on active type (client-side filtering as backup)
    const filteredItems = products.filter(product => {
        const typeMatch = activeType === 'products' ? product.type === 'product' : product.type === 'service';
        return typeMatch;
    });

    // Handle type change
    const handleTypeChange = (type) => {
        setActiveType(type);
        setSidebarSearchQuery('');
        setSelectedItem(null);
    };

    // Handle item selection
    const handleItemSelect = (item) => {
        console.log('🎯 Item selected:', item);
        setSelectedItem(item);
    };

    // Navigation handlers for Sales/Purchase forms
    const handleAddSale = () => {
        setCurrentView('sale');
    };

    const handleAddPurchase = () => {
        setCurrentView('purchase');
    };

    const handleBackToInventory = () => {
        setCurrentView('inventory');
    };

    // Form save handlers
    const handleSaleFormSave = (saleData) => {
        console.log('💾 Saving sale data from Inventory component:', saleData);

        // Add transaction to inventory records
        const newTransaction = {
            id: Date.now(),
            type: 'Sale',
            invoiceNumber: saleData.invoiceNumber,
            itemId: selectedItem?.id || selectedItem?._id,
            customerName: saleData.customer?.name || 'Customer',
            date: new Date().toLocaleDateString('en-GB'),
            quantity: saleData.items?.reduce((total, item) => total + item.quantity, 0) || 1,
            pricePerUnit: saleData.totals?.finalTotal || 0,
            status: saleData.paymentStatus || 'Unpaid'
        };

        setTransactions(prev => [...prev, newTransaction]);

        // Update product stock if applicable (optimistic update)
        if (saleData.items) {
            saleData.items.forEach(item => {
                setProducts(prev => prev.map(product =>
                    (product.id === item.productId || product._id === item.productId)
                        ? { ...product, currentStock: Math.max(0, product.currentStock - item.quantity) }
                        : product
                ));
            });
        }

        setCurrentView('inventory');
        alert(`Sale ${saleData.invoiceNumber} saved successfully!`);
    };

    const handlePurchaseFormSave = (purchaseData) => {
        console.log('💾 Saving purchase data from Inventory component:', purchaseData);

        // Add transaction to inventory records
        const newTransaction = {
            id: Date.now(),
            type: 'Purchase',
            invoiceNumber: purchaseData.purchaseNumber,
            itemId: selectedItem?.id || selectedItem?._id,
            customerName: purchaseData.supplier?.name || 'Supplier',
            date: new Date().toLocaleDateString('en-GB'),
            quantity: purchaseData.items?.reduce((total, item) => total + item.quantity, 0) || 1,
            pricePerUnit: purchaseData.totals?.finalTotal || 0,
            status: purchaseData.paymentStatus || 'Paid'
        };

        setTransactions(prev => [...prev, newTransaction]);

        // Update product stock if applicable (optimistic update)
        if (purchaseData.items) {
            purchaseData.items.forEach(item => {
                setProducts(prev => prev.map(product =>
                    (product.id === item.productId || product._id === item.productId)
                        ? { ...product, currentStock: product.currentStock + item.quantity }
                        : product
                ));
            });
        }

        setCurrentView('inventory');
        alert(`Purchase ${purchaseData.purchaseNumber} saved successfully!`);
    };

    // Handle Add Category with backend integration
    const handleAddCategory = async (categoryData) => {
        console.log('Adding new category:', categoryData);

        // For now, add locally (will be enhanced when category API is ready)
        const newCategory = {
            id: Date.now(),
            name: categoryData.name,
            description: categoryData.description,
            isActive: categoryData.isActive
        };

        setCategories(prev => [...prev, newCategory]);

        // TODO: Integrate with category API when available
        // try {
        //     await categoryService.createCategory(currentCompany.id, categoryData);
        //     loadCategories(); // Reload categories
        // } catch (error) {
        //     console.error('Error adding category:', error);
        // }
    };

    // Handle Add Item with updated form structure
    const handleAddItem = (itemType) => {
        if (!currentCompany?.id) {
            alert('Please select a company first');
            return;
        }

        setEditingItem(null); // Clear editing item
        setModalType('add'); // Set to add mode
        setEditingProduct(null);
        // Reset form data with all the new fields
        setFormData({
            name: '',
            itemCode: '',
            hsnNumber: '',
            category: '',
            description: '',
            buyPrice: 0,
            salePrice: 0,
            atPrice: 0,
            gstRate: 18,
            unit: 'PCS',
            type: itemType,
            minStockLevel: 0,
            minStockToMaintain: 0,
            currentStock: 0,
            openingStock: 0,
            openingQuantity: 0,
            asOfDate: new Date().toISOString().split('T')[0],
            isBuyPriceTaxInclusive: false,
            isSalePriceTaxInclusive: false,
            buyPriceWithTax: 0,
            buyPriceWithoutTax: 0,
            salePriceWithTax: 0,
            salePriceWithoutTax: 0,
            isActive: true
        });
        setShowProductModal(true); // Use showProductModal instead of showCreateModal
    };

    // Enhanced edit item handler with proper form data population
    const handleEditItem = useCallback((item) => {
        console.log('🔧 Opening edit modal for item:', item);
        setEditingItem(item);
        setModalType('edit');

        // Pre-populate formData with comprehensive price handling
        const prePopulatedFormData = {
            name: item.name || '',
            itemCode: item.itemCode || '',
            hsnNumber: item.hsnNumber || '',
            category: item.category || '',
            description: item.description || '',
            // 🚨 CRITICAL FIX: Use the correct price fields
            buyPrice: Number(item.buyPrice) || Number(item.buyPriceWithoutTax) || 0,
            salePrice: Number(item.salePrice) || Number(item.salePriceWithoutTax) || 0,
            atPrice: Number(item.atPrice) || 0,
            gstRate: Number(item.gstRate) || 18,
            unit: item.unit || 'PCS',
            type: item.type || 'product',
            minStockLevel: Number(item.minStockLevel) || Number(item.minStockToMaintain) || 0,
            minStockToMaintain: Number(item.minStockToMaintain) || Number(item.minStockLevel) || 0,
            currentStock: Number(item.currentStock) || Number(item.openingStock) || Number(item.openingQuantity) || 0,
            openingStock: Number(item.openingStock) || Number(item.currentStock) || Number(item.openingQuantity) || 0,
            openingQuantity: Number(item.openingQuantity) || Number(item.openingStock) || Number(item.currentStock) || 0,
            asOfDate: item.asOfDate ? item.asOfDate.split('T')[0] : new Date().toISOString().split('T')[0],
            // Tax flags - ensure boolean values
            isBuyPriceTaxInclusive: Boolean(item.isBuyPriceTaxInclusive),
            isSalePriceTaxInclusive: Boolean(item.isSalePriceTaxInclusive),
            // Include calculated price fields for reference
            buyPriceWithTax: Number(item.buyPriceWithTax) || 0,
            buyPriceWithoutTax: Number(item.buyPriceWithoutTax) || 0,
            salePriceWithTax: Number(item.salePriceWithTax) || 0,
            salePriceWithoutTax: Number(item.salePriceWithoutTax) || 0,
            isActive: item.isActive !== undefined ? Boolean(item.isActive) : true
        };

        console.log('🔧 Pre-populated form data:', prePopulatedFormData);
        
        // Set the form data before opening modal
        setFormData(prePopulatedFormData);
        setShowProductModal(true);
    }, []); // Empty dependency array since it only uses setter functions

    const handleAdjustStock = (item) => {
        if (item.type === 'service') {
            alert('Stock adjustment is not applicable for services');
            return;
        }

        setSelectedProductForStock(item);
        setShowStockModal(true);
    };

    // Modal handlers - Updated
    const handleCloseModal = () => {
        setShowCreateModal(false);
        setShowProductModal(false); // Close product modal
        setEditingProduct(null);
        setEditingItem(null);
        setModalType('add');
    };

    const handleInputChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    }, []); // Empty dependency array since it only uses setFormData which is stable

    // Also memoize handleCategoryInputChange
    const handleCategoryInputChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setCategoryFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    }, []);

    // Enhanced save product with backend integration
    const handleSaveProduct = async (productData, isSaveAndAdd = false) => {
        if (!currentCompany?.id) {
            alert('Please select a company first');
            return false;
        }

        try {
            setIsLoading(true);
            console.log('💾 Creating new item with data:', productData);

            // Call the itemService to create the item
            const response = await itemService.createItem(currentCompany.id, productData);

            if (response && response.success) {
                console.log('✅ Item created successfully:', response.data);

                // Reload items to get updated data
                await loadItems(sidebarSearchQuery);

                // If not save and add, close modal
                if (!isSaveAndAdd) {
                    handleCloseModal();
                }

                return true;
            } else {
                throw new Error(response?.message || 'Failed to create item');
            }

        } catch (error) {
            console.error('❌ Error creating item:', error);
            alert(`Failed to create item: ${error.message}`);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // 🚨 FIXED UPDATE ITEM HANDLER
    const handleUpdateItem = async (updatedItemData) => {
        if (!currentCompany?.id) {
            alert('No company selected');
            return false;
        }

        if (!editingItem?.id && !editingItem?._id) {
            console.error('❌ No editing item ID found');
            alert('Cannot update item: Invalid item data');
            return false;
        }

        try {
            setIsLoading(true);
            
            // 🚨 ENHANCED DEBUG LOGGING
            console.log('🔧 Inventory - Starting update process:', {
                editingItem: editingItem,
                formData: formData,
                updatedItemData: updatedItemData
            });

            // Call the backend API to update the item
            const itemIdToUpdate = editingItem._id || editingItem.id;
            const response = await itemService.updateItem(currentCompany.id, itemIdToUpdate, updatedItemData);
            
            console.log('📝 Inventory - Backend response:', response);

            // Check if the response indicates success
            if (response && response.success) {
                console.log('✅ Inventory - Item updated successfully');

                // 🚨 SIMPLIFIED STATE UPDATE - Just reload everything
                await loadItems(sidebarSearchQuery);

                // Close modal and reset state
                setShowProductModal(false);
                setEditingItem(null);
                setModalType('add');

                // Show success message
                alert(`${updatedItemData.name || editingItem.name} has been updated successfully!`);

                return true;
            } else {
                // Handle failed response
                const errorMessage = response?.message || 'Failed to update item - no success flag';
                console.error('❌ Inventory - Update failed:', errorMessage);
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('❌ Inventory - Error updating item:', error);

            // Show user-friendly error message
            const errorMessage = error.message || 'Unknown error occurred';
            alert(`Failed to update "${editingItem.name}": ${errorMessage}`);

            // Reload items to sync with backend state on error
            console.log('🔄 Inventory - Reloading items after update error...');
            try {
                await loadItems(sidebarSearchQuery);
            } catch (reloadError) {
                console.error('❌ Inventory - Error reloading items after update failure:', reloadError);
            }

            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Delete Item - Updated with backend integration
    const handleDeleteItem = async (item) => {
        console.log('🗑️ Delete item requested:', item);

        if (!currentCompany?.id) {
            alert('No company selected');
            return false;
        }

        if (!item?.id && !item?._id) {
            console.error('❌ No item ID found');
            alert('Cannot delete item: Invalid item data');
            return false;
        }

        try {
            setIsLoading(true);
            console.log('🗑️ Deleting item from backend...');

            // Call the backend API to delete the item
            const itemIdToDelete = item._id || item.id;
            const response = await itemService.deleteItem(currentCompany.id, itemIdToDelete);

            if (response.success) {
                console.log('✅ Item deleted successfully from backend');

                // Reload items to get updated data
                await loadItems(sidebarSearchQuery);

                // Show success message
                alert(`${item.name} has been deleted successfully!`);

                return true;
            } else {
                throw new Error(response.message || 'Failed to delete item');
            }
        } catch (error) {
            console.error('❌ Error deleting item:', error);

            // Show user-friendly error message
            const errorMessage = error.message || 'Unknown error occurred';
            alert(`Failed to delete "${item.name}": ${errorMessage}`);

            // Reload items to sync with backend state
            console.log('🔄 Reloading items after delete error...');
            try {
                await loadItems(sidebarSearchQuery);
            } catch (reloadError) {
                console.error('❌ Error reloading items after delete failure:', reloadError);
            }

            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveCategory = (e) => {
        e.preventDefault();
        const newCategory = {
            ...categoryFormData,
            id: Date.now()
        };
        setCategories([...categories, newCategory]);
        setCategoryFormData({ name: '', description: '', isActive: true });
        setShowCategoryModal(false);
    };

        const handleUpdateStock = async (productId, adjustmentData) => {
        if (!currentCompany?.id) {
            alert('Please select a company first');
            return false;
        }
        try {
            setIsLoading(true);
            console.log('📊 Inventory: Updating stock for product:', productId, adjustmentData);
    
            // Call the backend API to adjust stock
            const response = await itemService.adjustStock(currentCompany.id, productId, adjustmentData);
    
            if (response && response.success) {
                console.log('✅ Stock adjusted successfully:', response.data);
    
                // Reload items to get updated stock data
                await loadItems(sidebarSearchQuery);
    
                // Close the stock modal
                setShowStockModal(false);
                setSelectedProductForStock(null);
    
                // Show success message
                alert(`Stock adjusted successfully! New quantity: ${response.data.newStock || adjustmentData.newStock}`);
    
                return true;
            } else {
                throw new Error(response?.message || 'Failed to adjust stock');
            }
        } catch (error) {
            console.error('❌ Error adjusting stock:', error);
            alert(`Failed to adjust stock: ${error.message}`);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // Header action handlers
    const handleMoreOptions = () => {
        console.log('More options clicked');
        // Add your logic here
    };

    const handleSettings = () => {
        console.log('Settings clicked');
        // Add your logic here
    };

    // Refresh data handler
    const handleRefresh = () => {
        if (currentCompany?.id) {
            console.log('🔄 Refreshing inventory data...');
            loadItems(sidebarSearchQuery);
            loadCategories();
        }
    };

    // Render company not selected state
    if (!currentCompany?.id) {
        return (
            <div className="d-flex flex-column vh-100">
                <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                    <div className="text-center">
                        <FontAwesomeIcon icon={faExclamationTriangle} size="3x" className="text-warning mb-3" />
                        <h4 className="text-muted">No Company Selected</h4>
                        <p className="text-muted">
                            Please select a company from the header to manage inventory.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Render Sales Form View
    if (currentView === 'sale') {
        return (
            <div className="d-flex flex-column vh-100">
                <div className="sales-form-header bg-white border-bottom">
                    <Container fluid className="px-4">
                        <Row className="align-items-center py-3">
                            <Col>
                                <Button
                                    variant="outline-secondary"
                                    onClick={handleBackToInventory}
                                    className="me-3"
                                >
                                    <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                                    Back to Inventory
                                </Button>
                                <span className="page-title-text fw-bold">Create New Sale</span>
                                <small className="text-muted ms-2">
                                    for {currentCompany.companyName}
                                </small>
                            </Col>
                        </Row>
                    </Container>
                </div>

                <SalesForm
                    onSave={handleSaleFormSave}
                    onCancel={handleBackToInventory}
                    currentCompany={currentCompany}
                />
            </div>
        );
    }

    // Render Purchase Form View
    if (currentView === 'purchase') {
        return (
            <div className="d-flex flex-column vh-100">
                <div className="sales-form-header bg-white border-bottom">
                    <Container fluid className="px-4">
                        <Row className="align-items-center py-3">
                            <Col>
                                <Button
                                    variant="outline-secondary"
                                    onClick={handleBackToInventory}
                                    className="me-3"
                                >
                                    <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                                    Back to Inventory
                                </Button>
                                <span className="page-title-text fw-bold">Create New Purchase</span>
                                <small className="text-muted ms-2">
                                    for {currentCompany.companyName}
                                </small>
                            </Col>
                        </Row>
                    </Container>
                </div>

                <PurchaseForm
                    onSave={handlePurchaseFormSave}
                    onCancel={handleBackToInventory}
                    currentCompany={currentCompany}
                />
            </div>
        );
    }

    // Render Inventory View (Default)
    return (
        <div className="d-flex flex-column vh-100">
            {/* Error Alert */}
            {error && (
                <Alert variant="danger" className="m-3 mb-0" dismissible onClose={() => setError(null)}>
                    <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                    {error}
                    <Button variant="link" className="ms-2 p-0" onClick={handleRefresh}>
                        <FontAwesomeIcon icon={faSync} className="me-1" />
                        Retry
                    </Button>
                </Alert>
            )}

            {/* Header */}
            <InventoryHeader
                activeType={activeType}
                onTypeChange={handleTypeChange}
                transactionSearchQuery={transactionSearchQuery}
                onTransactionSearchChange={setTransactionSearchQuery}
                onAddSale={handleAddSale}
                onAddPurchase={handleAddPurchase}
                onBulkImport={() => setShowBulkImportModal(true)}
                onMoreOptions={handleMoreOptions}
                onSettings={handleSettings}
                onRefresh={handleRefresh}
                currentCompany={currentCompany}
                totalItems={pagination.totalItems}
                isLoading={isLoadingItems}
            />

            {/* Main Content */}
            <div className="flex-grow-1 overflow-hidden">
                <Container fluid className="h-100 p-0">
                    <Row className="h-100 g-0">
                        {/* Left Sidebar - Updated with edit and delete handlers */}
                        <Col md={4} lg={3}>
                            <InventorySidebar
                                items={filteredItems}
                                selectedItem={selectedItem}
                                onItemSelect={handleItemSelect}
                                onAddItem={handleAddItem}
                                onAddCategory={handleAddCategory}
                                onEditItem={handleEditItem} // Add this line
                                onDeleteItem={handleDeleteItem} // Add this line
                                searchQuery={sidebarSearchQuery}
                                onSearchChange={setSidebarSearchQuery}
                                activeType={activeType}
                                isLoading={isLoadingItems}
                                pagination={pagination}
                                onLoadMore={() => loadItems(sidebarSearchQuery, pagination.current + 1)}
                                currentCompany={currentCompany}
                            />
                        </Col>

                        {/* Right Content */}
                        <Col md={8} lg={9}>
                            <div className="h-100 d-flex flex-column">
                                {/* Item Info Section */}
                                <div className="flex-shrink-0 p-3">
                                    <ItemInfoSection
                                        selectedItem={selectedItem}
                                        onEditItem={handleEditItem}
                                        onAdjustStock={handleAdjustStock}
                                        currentCompany={currentCompany}
                                        isLoading={isLoadingItems && !selectedItem}
                                    />
                                </div>

                                {/* Transaction History */}
                                <div className="flex-grow-1 px-3 pb-3">
                                    <TransactionHistory
                                        transactions={transactions}
                                        selectedItem={selectedItem}
                                        searchQuery={transactionSearchQuery}
                                        onSearchChange={setTransactionSearchQuery}
                                        currentCompany={currentCompany}
                                    />
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* Modals - Updated ProductModal with edit functionality */}
            <ProductModal
                show={showProductModal} // Use showProductModal instead of showCreateModal
                onHide={handleCloseModal}
                editingProduct={modalType === 'edit' ? editingItem : null} // Pass editingItem when in edit mode
                formData={formData}
                categories={categories}
                onInputChange={handleInputChange}
                onSaveProduct={modalType === 'edit' ? handleUpdateItem : handleSaveProduct} // Use different handler for edit
                currentCompany={currentCompany}
                mode={modalType} // Pass the mode ('add' or 'edit')
                type={modalType === 'edit' ? editingItem?.type : formData.type} // Pass the type
            />

            <StockAdjustmentModal
                show={showStockModal}
                onHide={() => setShowStockModal(false)}
                product={selectedProductForStock}
                onUpdateStock={handleUpdateStock}
                currentCompany={currentCompany}
            />

            <CategoryModal
                show={showCategoryModal}
                onHide={() => setShowCategoryModal(false)}
                categoryFormData={categoryFormData}
                onCategoryInputChange={handleCategoryInputChange}
                onSaveCategory={handleSaveCategory}
                currentCompany={currentCompany}
            />

            <BulkImportModal
                show={showBulkImportModal}
                onHide={() => setShowBulkImportModal(false)}
                categories={categories}
                onProductsImported={(importedProducts) => {
                    // After successful import, reload items
                    loadItems(sidebarSearchQuery);
                }}
                currentCompany={currentCompany}
            />
        </div>
    );
}

export default Inventory;