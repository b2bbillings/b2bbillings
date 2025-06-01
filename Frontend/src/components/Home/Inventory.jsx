import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Badge, Tabs, Tab, Toast, ToastContainer } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import './Inventory.css';

// Import components
import InventorySummaryCards from './Inventory/InventorySummaryCards';
import InventoryTable from './Inventory/InventoryTable';
import InventoryEmptyState from './Inventory/InventoryEmptyState';
import ProductModal from './Inventory/ProductModal';
import StockAdjustmentModal from './Inventory/StockAdjustmentModal';
import CategoryModal from './Inventory/CategoryModal';
import BulkImportModal from './Inventory/BulkImportModal';
import ProductSearchModal from './Inventory/ProductSearchModal';

function Inventory({ view = 'allProducts', onNavigate }) {
    // State management
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [lowStockItems, setLowStockItems] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showBulkImportModal, setShowBulkImportModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [selectedProductForStock, setSelectedProductForStock] = useState(null);
    const [activeTab, setActiveTab] = useState(view || 'allProducts');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [stockFilter, setStockFilter] = useState('');
    const [showSearchModal, setShowSearchModal] = useState(false);

    // Toast notification state
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastVariant, setToastVariant] = useState('success');

    // Product form data
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        category: '',
        price: 0,
        gstRate: 18,
        unit: 'piece',
        minStockLevel: 10,
        currentStock: 0,
        description: '',
        isService: false,
        isActive: true
    });

    // Category form data
    const [categoryFormData, setCategoryFormData] = useState({
        name: '',
        description: '',
        isActive: true
    });

    const hasProducts = products.length > 0;

    // Load sample data on component mount
    useEffect(() => {
        const sampleCategories = [
            { id: 1, name: 'Electronics', description: 'Electronic items and gadgets', isActive: true },
            { id: 2, name: 'Furniture', description: 'Office and home furniture', isActive: true },
            { id: 3, name: 'Stationery', description: 'Office stationery items', isActive: true },
            { id: 4, name: 'Appliances', description: 'Home and office appliances', isActive: true },
            { id: 5, name: 'Services', description: 'Service-based offerings', isActive: true },
        ];

        const sampleProducts = [
            {
                id: 1,
                name: 'Laptop Dell Inspiron 15',
                sku: 'DELL-INS-15-001',
                category: 'Electronics',
                price: 45000,
                gstRate: 18,
                unit: 'piece',
                currentStock: 25,
                minStockLevel: 5,
                description: 'Dell Inspiron 15 3000 Series Laptop',
                isService: false,
                isActive: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                name: 'Office Chair Executive',
                sku: 'OFC-CHR-EXE-001',
                category: 'Furniture',
                price: 8500,
                gstRate: 12,
                unit: 'piece',
                currentStock: 3,
                minStockLevel: 10,
                description: 'Executive Office Chair with Lumbar Support',
                isService: false,
                isActive: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                name: 'Printer Paper A4',
                sku: 'PPR-A4-001',
                category: 'Stationery',
                price: 350,
                gstRate: 12,
                unit: 'pack',
                currentStock: 150,
                minStockLevel: 50,
                description: 'A4 Size Printer Paper 500 Sheets',
                isService: false,
                isActive: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 4,
                name: 'Consultation Service',
                sku: 'SVC-CONS-001',
                category: 'Services',
                price: 2000,
                gstRate: 18,
                unit: 'hour',
                currentStock: null,
                minStockLevel: null,
                description: 'Business Consultation Service per hour',
                isService: true,
                isActive: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 5,
                name: 'Wireless Mouse',
                sku: 'MOU-WL-001',
                category: 'Electronics',
                price: 1200,
                gstRate: 18,
                unit: 'piece',
                currentStock: 0,
                minStockLevel: 20,
                description: 'Wireless Optical Mouse',
                isService: false,
                isActive: true,
                createdAt: new Date().toISOString()
            }
        ];

        setCategories(sampleCategories);
        setProducts(sampleProducts);

        // Calculate low stock items
        const lowStock = sampleProducts.filter(product =>
            !product.isService &&
            product.currentStock <= product.minStockLevel
        );
        setLowStockItems(lowStock);
    }, []);

    // Show toast notification
    const showToastNotification = (message, variant = 'success') => {
        setToastMessage(message);
        setToastVariant(variant);
        setShowToast(true);

        // Auto-hide toast after 4 seconds
        setTimeout(() => {
            setShowToast(false);
        }, 4000);
    };

    // Modal operations
    const handleOpenCreateModal = () => {
        setEditingProduct(null);
        setFormData({
            name: '',
            sku: generateSKU(),
            itemCode: '',
            hsnNumber: '',
            category: '',
            description: '',
            price: 0,
            gstRate: 18,
            unit: 'piece',
            type: 'product',
            minStockLevel: 10,
            currentStock: 0,
            openingStock: 0,
            isService: false,
            isActive: true
        });
        setShowCreateModal(true);
    };

    const handleCloseModal = () => {
        setShowCreateModal(false);
        setFormData({
            name: '',
            sku: '',
            itemCode: '',
            hsnNumber: '',
            category: '',
            description: '',
            price: 0,
            gstRate: 18,
            unit: 'piece',
            type: 'product',
            minStockLevel: 10,
            currentStock: 0,
            openingStock: 0,
            isService: false,
            isActive: true
        });
        setEditingProduct(null);
    };

    const handleProductFromSearch = (product) => {
        // Pre-fill form with selected product data
        setFormData({
            name: product.name || '',
            sku: product.sku || product.itemCode || generateSKU(),
            itemCode: product.itemCode || product.sku || '',
            hsnNumber: product.hsnNumber || '',
            unit: product.unit || 'piece',
            category: product.category || '',
            description: product.description || '',
            price: product.price || 0,
            type: product.type || (product.isService ? 'service' : 'product'),
            gstRate: product.gstRate || 18,
            openingStock: product.currentStock || product.openingStock || 0,
            currentStock: product.currentStock || 0,
            minStockLevel: product.minStockLevel || 10,
            isService: product.type === 'service' || product.isService || false,
            isActive: product.isActive !== undefined ? product.isActive : true
        });

        // Open the product modal
        setEditingProduct(null); // This will be a new product, not editing
        setShowCreateModal(true);
    };

    // Generate SKU
    const generateSKU = () => {
        const timestamp = Date.now().toString().slice(-6);
        return `PRD-${timestamp}`;
    };

    // Form input changes
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Auto-generate SKU based on product name
        if (name === 'name' && value && !editingProduct) {
            const skuBase = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
            const timestamp = Date.now().toString().slice(-3);
            setFormData(prev => ({
                ...prev,
                sku: `${skuBase}-${timestamp}`
            }));
        }
    };

    // Category form changes
    const handleCategoryInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCategoryFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Updated handleSaveProduct function
    const handleSaveProduct = async (e, isSaveAndAdd = false) => {
        e.preventDefault();

        try {
            // Validation
            if (!formData.name.trim()) {
                showToastNotification('Please enter product name', 'error');
                return false;
            }

            if (!formData.category) {
                showToastNotification('Please select a category', 'error');
                return false;
            }

            // Map form data to product structure
            const productData = {
                name: formData.name,
                sku: formData.sku || formData.itemCode || generateSKU(),
                itemCode: formData.itemCode || formData.sku,
                hsnNumber: formData.hsnNumber || '',
                category: formData.category,
                description: formData.description || '',
                price: parseFloat(formData.price) || 0,
                gstRate: parseFloat(formData.gstRate) || 18,
                unit: formData.unit || 'piece',
                currentStock: formData.isService || formData.type === 'service' ? null : (parseFloat(formData.currentStock) || parseFloat(formData.openingStock) || 0),
                minStockLevel: formData.isService || formData.type === 'service' ? null : (parseFloat(formData.minStockLevel) || 10),
                isService: formData.isService || formData.type === 'service',
                type: formData.type || (formData.isService ? 'service' : 'product'),
                isActive: formData.isActive !== false
            };

            if (editingProduct) {
                // Update existing product
                setProducts(products.map(product =>
                    product.id === editingProduct.id
                        ? { ...productData, id: editingProduct.id, createdAt: editingProduct.createdAt }
                        : product
                ));

                if (!isSaveAndAdd) {
                    showToastNotification(`${productData.name} updated successfully!`);
                    handleCloseModal();
                }
            } else {
                // Create new product
                const newProduct = {
                    ...productData,
                    id: Date.now(),
                    createdAt: new Date().toISOString()
                };
                setProducts(prevProducts => [...prevProducts, newProduct]);

                if (!isSaveAndAdd) {
                    showToastNotification(`${productData.name} created successfully!`);
                    handleCloseModal();
                }
            }

            updateLowStockItems();
            return true; // Return success

        } catch (error) {
            console.error('Error saving product:', error);
            showToastNotification('Error saving product. Please try again.', 'error');
            return false; // Return failure
        }
    };

    // Save category
    const handleSaveCategory = (e) => {
        e.preventDefault();

        if (!categoryFormData.name.trim()) {
            showToastNotification('Please enter category name', 'error');
            return;
        }

        const newCategory = {
            ...categoryFormData,
            id: Date.now()
        };

        setCategories([...categories, newCategory]);
        setCategoryFormData({
            name: '',
            description: '',
            isActive: true
        });
        setShowCategoryModal(false);
        showToastNotification(`Category "${newCategory.name}" created successfully!`);
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name || '',
            sku: product.sku || '',
            itemCode: product.itemCode || product.sku || '',
            hsnNumber: product.hsnNumber || '',
            category: product.category || '',
            description: product.description || '',
            price: product.price || 0,
            gstRate: product.gstRate || 18,
            unit: product.unit || 'piece',
            type: product.type || (product.isService ? 'service' : 'product'),
            minStockLevel: product.minStockLevel || 10,
            currentStock: product.currentStock || 0,
            openingStock: product.currentStock || 0,
            isService: product.isService || product.type === 'service',
            isActive: product.isActive !== false
        });
        setShowCreateModal(true);
    };

    const handleDeleteProduct = (productId) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            setProducts(products.filter(product => product.id !== productId));
            updateLowStockItems();
            showToastNotification('Product deleted successfully!');
        }
    };

    // Stock adjustment
    const handleStockAdjustment = (product) => {
        setSelectedProductForStock(product);
        setShowStockModal(true);
    };

    const handleUpdateStock = (productId, newStock, reason) => {
        setProducts(products.map(product =>
            product.id === productId
                ? { ...product, currentStock: newStock }
                : product
        ));
        setShowStockModal(false);
        setSelectedProductForStock(null);
        updateLowStockItems();
        showToastNotification('Stock updated successfully!');
    };

    // Update low stock items
    const updateLowStockItems = () => {
        const lowStock = products.filter(product =>
            !product.isService &&
            product.currentStock <= product.minStockLevel
        );
        setLowStockItems(lowStock);
    };

    // Filter products
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory = !categoryFilter || product.category === categoryFilter;

        let matchesStock = true;
        if (stockFilter === 'in-stock') {
            matchesStock = product.isService || product.currentStock > product.minStockLevel;
        } else if (stockFilter === 'low-stock') {
            matchesStock = !product.isService && product.currentStock <= product.minStockLevel && product.currentStock > 0;
        } else if (stockFilter === 'out-of-stock') {
            matchesStock = !product.isService && product.currentStock === 0;
        }

        return matchesSearch && matchesCategory && matchesStock;
    });

    return (
        <Container fluid className="py-4">
            {/* Toast Notifications */}
            <ToastContainer
                position="top-end"
                className="p-3"
                style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    zIndex: 9999
                }}
            >
                <Toast
                    show={showToast}
                    onClose={() => setShowToast(false)}
                    className={`inventory-toast ${toastVariant === 'error' ? 'error-toast' : 'success-toast'}`}
                    autohide
                    delay={4000}
                >
                    <Toast.Header className={`${toastVariant === 'error' ? 'bg-danger' : 'bg-success'} text-white border-0`}>
                        <FontAwesomeIcon
                            icon={toastVariant === 'error' ? faExclamationTriangle : faCheck}
                            className="me-2"
                        />
                        <strong className="me-auto">
                            {toastVariant === 'error' ? 'Error' : 'Success'}
                        </strong>
                    </Toast.Header>
                    <Toast.Body className="bg-light border-0">
                        <div className="d-flex align-items-center">
                            <FontAwesomeIcon
                                icon={toastVariant === 'error' ? faExclamationTriangle : faCheck}
                                className={`${toastVariant === 'error' ? 'text-danger' : 'text-success'} me-2`}
                            />
                            <span>{toastMessage}</span>
                        </div>
                    </Toast.Body>
                </Toast>
            </ToastContainer>

            {/* Page Header */}
            <Row className="mb-4 align-items-center">
                <Col>
                    <h1 className="page-title mb-0">
                        Inventory Management
                        {hasProducts && (
                            <Badge bg="secondary" className="ms-2">{products.length}</Badge>
                        )}
                    </h1>
                </Col>
                <Col xs="auto" className="d-flex gap-2">
                    {/* Add Search Button */}
                    <Button
                        variant="outline-info"
                        onClick={() => setShowSearchModal(true)}
                        className="d-flex align-items-center"
                    >
                        <FontAwesomeIcon icon={faSearch} className="me-2" />
                        Search Products
                    </Button>
                    <Button
                        variant="outline-primary"
                        onClick={() => setShowCategoryModal(true)}
                    >
                        Add Category
                    </Button>
                    <Button
                        variant="outline-secondary"
                        onClick={() => setShowBulkImportModal(true)}
                    >
                        Bulk Import
                    </Button>
                    <Button
                        variant="primary"
                        className="d-flex align-items-center"
                        onClick={handleOpenCreateModal}
                    >
                        <FontAwesomeIcon icon={faPlus} className="me-2" />
                        Add Product
                    </Button>
                </Col>
            </Row>

            {/* Tabs */}
            <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-4 custom-tabs"
            >
                <Tab eventKey="allProducts" title="All Products">
                    {hasProducts ? (
                        <>
                            <InventorySummaryCards
                                products={products}
                                lowStockItems={lowStockItems}
                                categories={categories}
                            />
                            <InventoryTable
                                filteredProducts={filteredProducts}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                categoryFilter={categoryFilter}
                                setCategoryFilter={setCategoryFilter}
                                stockFilter={stockFilter}
                                setStockFilter={setStockFilter}
                                categories={categories}
                                onCreateProduct={handleOpenCreateModal}
                                onEditProduct={handleEditProduct}
                                onDeleteProduct={handleDeleteProduct}
                                onStockAdjustment={handleStockAdjustment}
                            />
                        </>
                    ) : (
                        <InventoryEmptyState onCreateProduct={handleOpenCreateModal} />
                    )}
                </Tab>
                <Tab eventKey="lowStock" title={`Low Stock ${lowStockItems.length > 0 ? `(${lowStockItems.length})` : ''}`}>
                    <div className="text-center py-5">
                        <p>Low stock items management will be available here.</p>
                    </div>
                </Tab>
                <Tab eventKey="stockMovement" title="Stock Movement">
                    <div className="text-center py-5">
                        <p>Stock movement tracking will be available here.</p>
                    </div>
                </Tab>
                <Tab eventKey="reports" title="Reports">
                    <div className="text-center py-5">
                        <p>Inventory reports and analytics will be available here.</p>
                    </div>
                </Tab>
            </Tabs>

            {/* Modals */}
            <ProductModal
                show={showCreateModal}
                onHide={handleCloseModal}
                editingProduct={editingProduct}
                formData={formData}
                categories={categories}
                onInputChange={handleInputChange}
                onSaveProduct={handleSaveProduct}
                existingProducts={products}
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
                    updateLowStockItems();
                }}
            />
            <ProductSearchModal
                show={showSearchModal}
                onHide={() => setShowSearchModal(false)}
                products={products}
                onProductSelect={handleProductFromSearch}
            />

            <style jsx>{`
                /* Toast Styling */
                .inventory-toast {
                    border: none;
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                    border-radius: 12px;
                    overflow: hidden;
                    animation: slideInRight 0.4s ease-out;
                }

                .success-toast .toast-header {
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                    border: none;
                }

                .error-toast .toast-header {
                    background: linear-gradient(135deg, #dc3545 0%, #e55353 100%);
                    border: none;
                }

                .inventory-toast .toast-body {
                    background: linear-gradient(135deg, #f8fff9 0%, #e8f5e8 100%);
                    border: none;
                    padding: 1rem;
                }

                .error-toast .toast-body {
                    background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
                }

                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;

                    }
                }
            `}</style>

        </Container>
    );
}

export default Inventory;