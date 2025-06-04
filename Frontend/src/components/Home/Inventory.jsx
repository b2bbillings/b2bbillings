import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import './Inventory.css';

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

function Inventory({ view = 'allProducts', onNavigate }) {
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
        sku: '',
        itemCode: '',
        hsnNumber: '',
        category: '',
        description: '',
        price: 0,
        buyPrice: 0,
        salePrice: 0,
        gstRate: 18,
        unit: 'PCS',
        type: 'product',
        minStockLevel: 10,
        currentStock: 0,
        openingStock: 0,
        isActive: true
    });

    const [categoryFormData, setCategoryFormData] = useState({
        name: '',
        description: '',
        isActive: true
    });

    // Load sample data
    useEffect(() => {
        const sampleCategories = [
            { id: 1, name: 'Electronics', description: 'Electronic items and gadgets', isActive: true },
            { id: 2, name: 'Furniture', description: 'Office and home furniture', isActive: true },
            { id: 3, name: 'Stationery', description: 'Office stationery items', isActive: true },
            { id: 4, name: 'Services', description: 'Service-based offerings', isActive: true },
        ];

        const sampleProducts = [
            {
                id: 1,
                name: 'Laptop',
                itemCode: 'DELL-INS-15-001',
                hsnNumber: '8471',
                category: 'Electronics',
                buyPrice: 42000,
                salePrice: 100000,
                gstRate: 18,
                unit: 'PCS',
                currentStock: 0,
                minStockLevel: 5,
                description: 'Dell Inspiron 15 3000 Series Laptop with i5 processor and 8GB RAM',
                type: 'product',
                isActive: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                name: 'Sample Item',
                itemCode: 'SAMPLE-001',
                hsnNumber: '9401',
                category: 'Furniture',
                buyPrice: 7500,
                salePrice: 8500,
                gstRate: 12,
                unit: 'PCS',
                currentStock: 1,
                minStockLevel: 10,
                description: 'Sample item for testing purposes',
                type: 'product',
                isActive: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                name: 'Business Consultation',
                itemCode: 'SVC-CONS-001',
                hsnNumber: '998314',
                category: 'Services',
                buyPrice: 0,
                salePrice: 2000,
                gstRate: 18,
                unit: 'HRS',
                currentStock: null,
                minStockLevel: null,
                description: 'Professional business consultation service per hour',
                type: 'service',
                isActive: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 4,
                name: 'Wireless Mouse',
                itemCode: 'MOU-WL-001',
                hsnNumber: '8471',
                category: 'Electronics',
                buyPrice: 1000,
                salePrice: 1200,
                gstRate: 18,
                unit: 'PCS',
                currentStock: 15,
                minStockLevel: 20,
                description: 'Optical wireless mouse with USB receiver',
                type: 'product',
                isActive: true,
                createdAt: new Date().toISOString()
            }
        ];

        const sampleTransactions = [
            {
                id: 1,
                type: 'Sale',
                invoiceNumber: '1',
                itemId: 1,
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
                itemId: 1,
                customerName: 'IT Solution',
                date: '03/06/2025',
                quantity: 1,
                pricePerUnit: 11111,
                status: 'Paid'
            },
            {
                id: 3,
                type: 'Sale',
                invoiceNumber: '2',
                itemId: 2,
                customerName: 'ABC Corp',
                date: '02/06/2025',
                quantity: 2,
                pricePerUnit: 8500,
                status: 'Paid'
            }
        ];

        setCategories(sampleCategories);
        setProducts(sampleProducts);
        setTransactions(sampleTransactions);

        // Set first product as selected by default
        if (sampleProducts.length > 0) {
            setSelectedItem(sampleProducts[0]);
        }
    }, []);

    // Filter products/services based on active type
    const filteredItems = products.filter(product => {
        const typeMatch = activeType === 'products' ? product.type === 'product' : product.type === 'service';
        return typeMatch;
    });

    // Handle type change
    const handleTypeChange = (type) => {
        setActiveType(type);
        setSidebarSearchQuery('');
        // Reset selection when switching types
        const typeItems = products.filter(product =>
            type === 'products' ? product.type === 'product' : product.type === 'service'
        );
        if (typeItems.length > 0) {
            setSelectedItem(typeItems[0]);
        } else {
            setSelectedItem(null);
        }
    };

    // Handle item selection
    const handleItemSelect = (item) => {
        setSelectedItem(item);
    };

    // Navigation handlers for Sales/Purchase forms (matching Bank.jsx pattern)
    const handleAddSale = () => {
        setCurrentView('sale');
    };

    const handleAddPurchase = () => {
        setCurrentView('purchase');
    };

    const handleBackToInventory = () => {
        setCurrentView('inventory');
    };


    // Form save handlers (matching Bank.jsx pattern)
    const handleSaleFormSave = (saleData) => {
        console.log('💾 Saving sale data from Inventory component:', saleData);

        // Add transaction to inventory records
        const newTransaction = {
            id: Date.now(),
            type: 'Sale',
            invoiceNumber: saleData.invoiceNumber,
            itemId: selectedItem?.id || 1,
            customerName: saleData.customer?.name || 'Customer',
            date: new Date().toLocaleDateString('en-GB'),
            quantity: saleData.items?.reduce((total, item) => total + item.quantity, 0) || 1,
            pricePerUnit: saleData.totals?.finalTotal || 0,
            status: saleData.paymentStatus || 'Unpaid'
        };

        // Update transactions
        setTransactions(prev => [...prev, newTransaction]);

        // Update product stock if applicable
        if (saleData.items) {
            saleData.items.forEach(item => {
                setProducts(prev => prev.map(product =>
                    product.id === item.productId
                        ? { ...product, currentStock: Math.max(0, product.currentStock - item.quantity) }
                        : product
                ));
            });
        }

        // Go back to inventory view
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
            itemId: selectedItem?.id || 1,
            customerName: purchaseData.supplier?.name || 'Supplier',
            date: new Date().toLocaleDateString('en-GB'),
            quantity: purchaseData.items?.reduce((total, item) => total + item.quantity, 0) || 1,
            pricePerUnit: purchaseData.totals?.finalTotal || 0,
            status: purchaseData.paymentStatus || 'Paid'
        };

        // Update transactions
        setTransactions(prev => [...prev, newTransaction]);

        // Update product stock if applicable
        if (purchaseData.items) {
            purchaseData.items.forEach(item => {
                setProducts(prev => prev.map(product =>
                    product.id === item.productId
                        ? { ...product, currentStock: product.currentStock + item.quantity }
                        : product
                ));
            });
        }

        // Go back to inventory view
        setCurrentView('inventory');
        alert(`Purchase ${purchaseData.purchaseNumber} saved successfully!`);
    };

    const handleAddCategory = (categoryData) => {
        console.log('Adding new category:', categoryData);
        setCategories(prev => [...prev, categoryData]);
    };
    // Handle Add Item
    const handleAddItem = (itemType) => {
        setEditingProduct(null);
        setFormData({
            name: '',
            sku: '',
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
            isActive: true
        });
        setShowCreateModal(true);
    };

    // Handle Edit Item
    const handleEditItem = (item) => {
        setEditingProduct(item);
        setFormData(item);
        setShowCreateModal(true);
    };

    // Handle Adjust Stock
    const handleAdjustStock = (item) => {
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

    const handleSaveProduct = async (e, isSaveAndAdd = false) => {
        e.preventDefault();

        try {
            const productData = {
                ...formData,
                id: editingProduct ? editingProduct.id : Date.now(),
                createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString()
            };

            if (editingProduct) {
                setProducts(products.map(product =>
                    product.id === editingProduct.id ? productData : product
                ));
                // Update selected item if it's the one being edited
                if (selectedItem?.id === editingProduct.id) {
                    setSelectedItem(productData);
                }
            } else {
                setProducts(prev => [...prev, productData]);
            }

            if (!isSaveAndAdd) {
                handleCloseModal();
            } else {
                // Reset form for new item
                setFormData({
                    ...formData,
                    name: '',
                    itemCode: '',
                    description: '',
                    buyPrice: 0,
                    salePrice: 0,
                    currentStock: 0,
                    openingStock: 0
                });
            }
            return true;
        } catch (error) {
            console.error('Error saving product:', error);
            return false;
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

    const handleUpdateStock = (productId, newStock, reason) => {
        setProducts(products.map(product =>
            product.id === productId
                ? { ...product, currentStock: newStock }
                : product
        ));
        setShowStockModal(false);
        setSelectedProductForStock(null);
        // Update selected item if it's the one being updated
        if (selectedItem?.id === productId) {
            setSelectedItem(prev => ({ ...prev, currentStock: newStock }));
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

    // Render Sales Form View
    if (currentView === 'sale') {
        return (
            <div className="d-flex flex-column vh-100">
                {/* Header with Back Button */}
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
                            </Col>
                        </Row>
                    </Container>
                </div>

                {/* Sales Form */}
                <SalesForm
                    onSave={handleSaleFormSave}
                    onCancel={handleBackToInventory}
                />
            </div>
        );
    }

    // Render Purchase Form View
    if (currentView === 'purchase') {
        return (
            <div className="d-flex flex-column vh-100">
                {/* Header with Back Button */}
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
                            </Col>
                        </Row>
                    </Container>
                </div>

                {/* Purchase Form */}
                <PurchaseForm
                    onSave={handlePurchaseFormSave}
                    onCancel={handleBackToInventory}
                />
            </div>
        );
    }

    // Render Inventory View (Default)
    return (
        <div className="d-flex flex-column vh-100">
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
                                onAddCategory={handleAddCategory} // Now passes category data
                                searchQuery={sidebarSearchQuery}
                                onSearchChange={setSidebarSearchQuery}
                                activeType={activeType}
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
                                    />
                                </div>

                                {/* Transaction History */}
                                <div className="flex-grow-1 px-3 pb-3">
                                    <TransactionHistory
                                        transactions={transactions}
                                        selectedItem={selectedItem}
                                        searchQuery={transactionSearchQuery}
                                        onSearchChange={setTransactionSearchQuery}
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
            />

            <StockAdjustmentModal
                show={showStockModal}
                onHide={() => setShowStockModal(false)}
                product={selectedProductForStock}
                onUpdateStock={handleUpdateStock}
            />

            <CategoryModal
                show={showCategoryModal}
                onHide={() => setShowCategoryModal(false)}
                categoryFormData={categoryFormData}
                onCategoryInputChange={handleCategoryInputChange}
                onSaveCategory={handleSaveCategory}
            />

            <BulkImportModal
                show={showBulkImportModal}
                onHide={() => setShowBulkImportModal(false)}
                categories={categories}
                onProductsImported={(importedProducts) => {
                    setProducts([...products, ...importedProducts]);
                }}
            />
        </div>
    );
}

export default Inventory;