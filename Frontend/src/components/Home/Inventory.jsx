import React, { useState, useEffect, useContext } from 'react';
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

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showBulkImportModal, setShowBulkImportModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [selectedProductForStock, setSelectedProductForStock] = useState(null);

    // Form data states
    const [formData, setFormData] = useState({
        name: '',
        itemCode: '',
        hsnNumber: '',
        category: '',
        description: '',
        buyPrice: 0,
        salePrice: 0,
        gstRate: 18,
        unit: 'PCS',
        type: 'product',
        minStockLevel: 10,
        currentStock: 0,
        openingStock: 0,
        asOfDate: new Date().toISOString().split('T')[0],
        isActive: true
    });

    const [categoryFormData, setCategoryFormData] = useState({
        name: '',
        description: '',
        isActive: true
    });

    // Load items from backend
    const loadItems = async (searchQuery = '', page = 1, limit = 50) => {
        if (!currentCompany?.id) {
            console.warn('⚠️ No company selected for loading items');
            return;
        }

        try {
            setIsLoadingItems(true);
            setError(null);

            console.log('📋 Loading items for company:', currentCompany.id);

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

            if (response.success) {
                const items = response.data.items || [];
                setProducts(items);
                setPagination(response.data.pagination || {});

                // Set first item as selected if no item is selected
                if (!selectedItem && items.length > 0) {
                    setSelectedItem(items[0]);
                }

                console.log('✅ Items loaded successfully:', items.length);
            } else {
                throw new Error(response.message || 'Failed to load items');
            }

        } catch (error) {
            console.error('❌ Error loading items:', error);
            setError(`Failed to load items: ${error.message}`);
            setProducts([]);
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

    // Handle Add Item
    const handleAddItem = (itemType) => {
        if (!currentCompany?.id) {
            alert('Please select a company first');
            return;
        }

        setEditingProduct(null);
        setFormData({
            name: '',
            itemCode: '',
            hsnNumber: '',
            category: '',
            description: '',
            buyPrice: 0,
            salePrice: 0,
            gstRate: 18,
            unit: 'PCS',
            type: itemType,
            minStockLevel: 10,
            currentStock: 0,
            openingStock: 0,
            asOfDate: new Date().toISOString().split('T')[0],
            isActive: true
        });
        setShowCreateModal(true);
    };

    // Handle Edit Item
    const handleEditItem = (item) => {
        if (!currentCompany?.id) {
            alert('Please select a company first');
            return;
        }

        console.log('✏️ Editing item:', item);
        setEditingProduct(item);

        // Format item data for form
        const formattedData = {
            name: item.name || '',
            itemCode: item.itemCode || '',
            hsnNumber: item.hsnNumber || '',
            category: item.category || '',
            description: item.description || '',
            buyPrice: item.buyPrice || 0,
            salePrice: item.salePrice || 0,
            gstRate: item.gstRate || 0,
            unit: item.unit || 'PCS',
            type: item.type || 'product',
            minStockLevel: item.minStockLevel || 0,
            currentStock: item.currentStock || 0,
            openingStock: item.openingStock || 0,
            asOfDate: item.asOfDate ? item.asOfDate.split('T')[0] : new Date().toISOString().split('T')[0],
            isActive: item.isActive !== undefined ? item.isActive : true
        };

        setFormData(formattedData);
        setShowCreateModal(true);
    };

    // Handle Adjust Stock
    const handleAdjustStock = (item) => {
        if (item.type === 'service') {
            alert('Stock adjustment is not applicable for services');
            return;
        }

        setSelectedProductForStock(item);
        setShowStockModal(true);
    };

    // Modal handlers
    const handleCloseModal = () => {
        setShowCreateModal(false);
        setEditingProduct(null);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleCategoryInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCategoryFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Enhanced save product with backend integration
    const handleSaveProduct = async (e, isSaveAndAdd = false) => {
        e.preventDefault();

        if (!currentCompany?.id) {
            alert('Please select a company first');
            return false;
        }

        try {
            setIsLoading(true);

            // Let ProductModal handle the API call and response
            // This is called after successful save in ProductModal
            console.log('✅ Product saved, reloading items...');

            // Reload items to get updated data
            await loadItems(sidebarSearchQuery);

            // If not save and add, close modal
            if (!isSaveAndAdd) {
                handleCloseModal();
            }

            return true;

        } catch (error) {
            console.error('❌ Error in handleSaveProduct:', error);
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

    const handleUpdateStock = async (productId, newStock, reason) => {
        try {
            // TODO: Implement stock adjustment API call
            // await itemService.updateStock(currentCompany.id, productId, newStock, reason);

            // For now, update locally
            setProducts(products.map(product =>
                (product.id === productId || product._id === productId)
                    ? { ...product, currentStock: newStock }
                    : product
            ));

            // Update selected item if it's the one being updated
            if (selectedItem && (selectedItem.id === productId || selectedItem._id === productId)) {
                setSelectedItem(prev => ({ ...prev, currentStock: newStock }));
            }

            setShowStockModal(false);
            setSelectedProductForStock(null);

            console.log('✅ Stock updated successfully');

        } catch (error) {
            console.error('❌ Error updating stock:', error);
            alert(`Error updating stock: ${error.message}`);
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
                        {/* Left Sidebar */}
                        <Col md={4} lg={3}>
                            <InventorySidebar
                                items={filteredItems}
                                selectedItem={selectedItem}
                                onItemSelect={handleItemSelect}
                                onAddItem={handleAddItem}
                                onAddCategory={handleAddCategory}
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

            {/* Modals */}
            <ProductModal
                show={showCreateModal}
                onHide={handleCloseModal}
                editingProduct={editingProduct}
                formData={formData}
                categories={categories}
                onInputChange={handleInputChange}
                onSaveProduct={handleSaveProduct}
                currentCompany={currentCompany}
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