import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Badge, Tabs, Tab } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faShoppingBag } from '@fortawesome/free-solid-svg-icons';

// Import components
import PurchasesSummaryCards from './Purchases/PurchasesSummaryCards';
import PurchasesEmptyState from './Purchases/PurchasesEmptyState';
import PurchaseOrderModal from './Purchases/PurchaseOrderModal';
import QuickSupplierModal from './Purchases/QuickSupplierModal';
import PurchasesTable from './Purchases/PurchasesTable';

function PurchaseOrders({ view = 'purchaseOrders', onNavigate }) {
    // State management
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
    const [editingPurchaseOrder, setEditingPurchaseOrder] = useState(null);
    const [activeTab, setActiveTab] = useState(view || 'purchaseOrders');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState({
        from: '',
        to: ''
    });

    // Form data structure
    const [formData, setFormData] = useState({
        orderNumber: '',
        orderDate: new Date().toISOString().split('T')[0],
        selectedSupplier: '',
        purchaseType: 'non-gst',
        paymentTerms: 'net30',
        items: [{
            productService: '',
            quantity: 1,
            price: 0,
            total: 0,
            gstRate: 0,
            taxInclusive: false
        }],
        subtotal: 0,
        gstAmount: 0,
        discount: 0,
        total: 0,
        notes: ''
    });

    // Quick supplier form data
    const [quickSupplierData, setQuickSupplierData] = useState({
        partyType: 'supplier',
        name: '',
        phone: '',
        email: '',
        gstNumber: '',
        address: ''
    });

    const hasPurchaseOrders = purchaseOrders.length > 0;

    // Load suppliers on component mount
    useEffect(() => {
        const sampleSuppliers = [
            {
                id: 1,
                name: 'ABC Suppliers Ltd',
                phone: '9876543211',
                whatsappNumber: '9876543211',
                email: 'abc@suppliers.com',
                partyType: 'supplier',
                city: 'Delhi',
                address: '456 Business Ave',
                gstNumber: '27AAACR5055K1ZX'
            },
            {
                id: 2,
                name: 'XYZ Vendors',
                phone: '9876543212',
                whatsappNumber: '9876543212',
                email: 'xyz@vendors.com',
                partyType: 'supplier',
                city: 'Mumbai',
                address: '789 Industrial Road',
                gstNumber: '27BBBBR5055K1ZY'
            }
        ];
        setSuppliers(sampleSuppliers);
    }, []);

    // Generate purchase order number
    const generatePurchaseOrderNumber = (type = 'non-gst') => {
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(1000 + Math.random() * 9000);

        if (type === 'gst') {
            return `PO-GST-${year}${month}${day}-${random}`;
        } else {
            return `PO-${year}${month}${day}-${random}`;
        }
    };

    // Modal operations
    const handleOpenCreateModal = () => {
        setEditingPurchaseOrder(null);
        setFormData({
            orderNumber: generatePurchaseOrderNumber(),
            orderDate: new Date().toISOString().split('T')[0],
            expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
            selectedSupplier: '',
            purchaseType: 'non-gst',
            paymentTerms: 'net30',
            items: [{
                productService: '',
                quantity: 1,
                price: 0,
                total: 0,
                gstRate: 0,
                taxInclusive: false
            }],
            subtotal: 0,
            gstAmount: 0,
            discount: 0,
            total: 0,
            notes: '',
            status: 'draft'
        });
        setShowCreateModal(true);
    };

    const handleCloseModal = () => {
        setShowCreateModal(false);
        setFormData({
            orderNumber: '',
            orderDate: new Date().toISOString().split('T')[0],
            expectedDeliveryDate: '',
            selectedSupplier: '',
            purchaseType: '',
            paymentTerms: 'net30',
            items: [{
                productService: '',
                quantity: 1,
                price: 0,
                total: 0,
                gstRate: 0,
                taxInclusive: false
            }],
            subtotal: 0,
            gstAmount: 0,
            discount: 0,
            total: 0,
            notes: ''
        });
        setEditingPurchaseOrder(null);
    };

    // Supplier selection
    const handleSupplierSelection = (e) => {
        const value = e.target.value;
        const selectedSupplierData = e.target.selectedSupplierData;

        setFormData(prev => ({
            ...prev,
            selectedSupplier: value,
            ...(selectedSupplierData && { selectedSupplierData })
        }));
    };

    // Form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Quick supplier changes
    const handleQuickSupplierChange = (e) => {
        const { name, value } = e.target;
        setQuickSupplierData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Add quick supplier
    const handleAddQuickSupplier = (e) => {
        e.preventDefault();

        if (!quickSupplierData.name.trim()) {
            alert('Please enter supplier name');
            return;
        }

        const newSupplier = {
            id: Date.now(),
            ...quickSupplierData,
            // Include additional phones if passed from modal
            additionalPhones: e.additionalPhones || [],
            createdAt: new Date().toISOString()
        };

        setSuppliers(prev => [...prev, newSupplier]);

        // Auto-select the newly added supplier
        setFormData(prev => ({
            ...prev,
            selectedSupplier: newSupplier.id.toString()
        }));

        // Reset form
        setQuickSupplierData({
            partyType: 'supplier',
            name: '',
            whatsappNumber: '',
            email: '',
            gstNumber: '',
            address: '',
            city: '',
            pincode: ''
        });

        setShowAddSupplierModal(false);

        console.log('✅ Supplier added and selected:', newSupplier);
        alert('Supplier added and selected successfully!');
    };

    // Item operations
    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;

        // Recalculate item total
        if (field === 'quantity' || field === 'price') {
            const quantity = parseFloat(newItems[index].quantity) || 0;
            const price = parseFloat(newItems[index].price) || 0;
            newItems[index].total = quantity * price;
        }

        setFormData(prev => ({
            ...prev,
            items: newItems
        }));

        // Recalculate totals
        setTimeout(() => calculateTotals(newItems), 0);
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, {
                productService: '',
                quantity: 1,
                price: 0,
                total: 0,
                gstRate: 0,
                taxInclusive: false,
                sku: '',
                unit: 'piece'
            }]
        }));
    };

    const removeItem = (index) => {
        if (formData.items.length > 1) {
            const newItems = formData.items.filter((_, i) => i !== index);
            setFormData(prev => ({
                ...prev,
                items: newItems
            }));
            calculateTotals(newItems);
        }
    };

    // Calculate totals
    const calculateTotals = (items = formData.items) => {
        let subtotal = 0;
        let totalGST = 0;

        items.forEach(item => {
            const itemTotal = parseFloat(item.total) || 0;
            subtotal += itemTotal;

            // Calculate GST for each item if purchase type is GST
            if (formData.purchaseType === 'gst' && item.gstRate) {
                const itemGST = (itemTotal * parseFloat(item.gstRate)) / 100;
                totalGST += itemGST;
            }
        });

        // Apply overall discount on subtotal
        const discountAmount = (subtotal * (parseFloat(formData.discount) || 0)) / 100;
        const finalSubtotal = subtotal - discountAmount;

        // GST should be calculated on the discounted amount
        let finalGST = totalGST;
        if (discountAmount > 0 && formData.purchaseType === 'gst') {
            finalGST = totalGST * (finalSubtotal / subtotal);
        }

        const total = finalSubtotal + finalGST;

        setFormData(prev => ({
            ...prev,
            subtotal: subtotal,
            gstAmount: finalGST,
            total: Math.max(0, total)
        }));
    };

    // Form validation
    const validateForm = () => {
        if (!formData.orderDate || formData.orderDate.trim() === '') {
            alert('Please select an order date');
            return false;
        }

        if (!formData.expectedDeliveryDate || formData.expectedDeliveryDate.trim() === '') {
            alert('Please select an expected delivery date');
            return false;
        }

        if (!formData.purchaseType || formData.purchaseType === '') {
            alert('Please select purchase type (GST or Non-GST)');
            return false;
        }

        if (!formData.selectedSupplier || formData.selectedSupplier === '') {
            alert('Please select a supplier');
            return false;
        }

        if (!formData.items || formData.items.length === 0) {
            alert('Please add at least one item');
            return false;
        }

        const validItems = formData.items.filter(item =>
            item.productService && item.productService.trim() !== ''
        );

        if (validItems.length === 0) {
            alert('Please enter product/service name for at least one item');
            return false;
        }

        const invalidItems = formData.items.filter(item =>
            item.productService && item.productService.trim() !== '' &&
            (parseFloat(item.quantity) <= 0 || parseFloat(item.price) <= 0)
        );

        if (invalidItems.length > 0) {
            alert('Please enter valid quantity and price for all items');
            return false;
        }

        return true;
    };

    // Save purchase order
    const handleSavePurchaseOrder = (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        // Get selected supplier details
        let supplierData = {};
        if (formData.selectedSupplier === 'walk-in') {
            supplierData = formData.selectedSupplierData || {};
        } else {
            const selectedSupplier = suppliers.find(s => s.id.toString() === formData.selectedSupplier);
            supplierData = selectedSupplier || {};
        }

        // Prepare purchase order data
        const purchaseOrderData = {
            id: editingPurchaseOrder ? editingPurchaseOrder.id : Date.now(),
            orderNumber: formData.orderNumber || generatePurchaseOrderNumber(formData.purchaseType),
            orderType: 'purchaseOrder', // Distinguish from regular purchases
            orderDate: formData.orderDate,
            expectedDeliveryDate: formData.expectedDeliveryDate,
            purchaseType: formData.purchaseType || 'non-gst',
            supplierName: supplierData.name || 'Unknown Supplier',
            supplierPhone: supplierData.phone || supplierData.whatsappNumber || '',
            supplierEmail: supplierData.email || '',
            supplierAddress: supplierData.address || '',
            supplierGSTNumber: supplierData.gstNumber || '',
            items: formData.items,
            subtotal: parseFloat(formData.subtotal) || 0,
            discount: parseFloat(formData.discount) || 0,
            gstAmount: parseFloat(formData.gstAmount) || 0,
            total: parseFloat(formData.total) || 0,
            notes: formData.notes || '',
            status: formData.status || 'draft',
            createdAt: editingPurchaseOrder ? editingPurchaseOrder.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            paymentStatus: 'pending'
        };

        if (editingPurchaseOrder) {
            setPurchaseOrders(prev => prev.map(order =>
                order.id === editingPurchaseOrder.id ? purchaseOrderData : order
            ));
            alert('Purchase Order updated successfully!');
        } else {
            setPurchaseOrders(prev => [...prev, purchaseOrderData]);
            alert('Purchase Order created successfully!');
        }

        handleCloseModal();
    };

    // Edit and delete operations
    const handleEditPurchaseOrder = (order) => {
        setEditingPurchaseOrder(order);
        setFormData({
            ...order,
            items: order.items?.map(item => ({
                productService: item.productService || '',
                quantity: item.quantity || 1,
                price: item.price || 0,
                total: item.total || 0,
                gstRate: item.gstRate || 0,
                taxInclusive: item.taxInclusive || false
            })) || [{ productService: '', quantity: 1, price: 0, total: 0, gstRate: 0, taxInclusive: false }]
        });
        setShowCreateModal(true);
    };

    const handleDeletePurchaseOrder = (orderId) => {
        if (window.confirm('Are you sure you want to delete this purchase order?')) {
            setPurchaseOrders(purchaseOrders.filter(order => order.id !== orderId));
        }
    };

    // Convert PurchaseOrder to Purchase
    const handleConvertToPurchase = (order) => {
        alert(`Converting Purchase Order ${order.orderNumber} to Purchase. This functionality will be implemented soon.`);
    };

    // Filter purchase orders
    const filteredPurchaseOrders = purchaseOrders.filter(order => {
        const matchesSearch = (order.supplierName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (order.orderNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

        let matchesDate = true;
        if (dateFilter.from && dateFilter.to) {
            const orderDate = new Date(order.orderDate).toISOString().split('T')[0];
            matchesDate = orderDate >= dateFilter.from && orderDate <= dateFilter.to;
        }

        return matchesSearch && matchesDate;
    });

    return (
        <Container fluid className="py-4">
            {/* Page Header */}
            <Row className="mb-4 align-items-center">
                <Col>
                    <h1 className="page-title mb-0">
                        Purchase Orders
                        {hasPurchaseOrders && (
                            <Badge bg="secondary" className="ms-2">{purchaseOrders.length}</Badge>
                        )}
                    </h1>
                </Col>
                <Col xs="auto">
                    <Button
                        variant="primary"
                        className="d-flex align-items-center"
                        onClick={handleOpenCreateModal}
                    >
                        <FontAwesomeIcon icon={faPlus} className="me-2" />
                        Create Purchase Order
                    </Button>
                </Col>
            </Row>

            {/* Tabs */}
            <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-4 custom-tabs"
            >
                <Tab eventKey="purchaseOrders" title="All Purchase Orders">
                    {hasPurchaseOrders ? (
                        <>
                            <PurchasesSummaryCards purchases={purchaseOrders} />
                            <PurchasesTable
                                filteredPurchases={filteredPurchaseOrders}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                dateFilter={dateFilter}
                                setDateFilter={setDateFilter}
                                onCreatePurchase={handleOpenCreateModal}
                                onEditPurchase={handleEditPurchaseOrder}
                                onDeletePurchase={handleDeletePurchaseOrder}
                                onManagePayment={() => alert('Payment management not available for purchase orders')}
                                onPrintPurchase={() => alert('Print functionality will be available soon')}
                                isPurchaseOrder={true} // Flag to indicate this is purchase orders table
                            />
                        </>
                    ) : (
                        <PurchasesEmptyState onCreatePurchase={handleOpenCreateModal} />
                    )}
                </Tab>
                <Tab eventKey="draft" title="Draft Orders">
                    <div className="text-center py-5">
                        <p>Draft purchase orders will be displayed here.</p>
                    </div>
                </Tab>
                <Tab eventKey="sent" title="Sent Orders">
                    <div className="text-center py-5">
                        <p>Sent purchase orders will be displayed here.</p>
                    </div>
                </Tab>
                <Tab eventKey="reports" title="Reports">
                    <div className="text-center py-5">
                        <p>Purchase order reports and analytics will be available here.</p>
                    </div>
                </Tab>
            </Tabs>

            {/* Modals */}
            <PurchaseOrderModal
                show={showCreateModal}
                onHide={handleCloseModal}
                editingPurchaseOrder={editingPurchaseOrder}
                formData={formData}
                suppliers={suppliers}
                onInputChange={handleInputChange}
                onSupplierSelection={handleSupplierSelection}
                onItemChange={handleItemChange}
                onAddItem={addItem}
                onRemoveItem={removeItem}
                onSavePurchaseOrder={handleSavePurchaseOrder}
                onShowAddSupplierModal={() => setShowAddSupplierModal(true)}
            />

            <QuickSupplierModal
                show={showAddSupplierModal}
                onHide={() => setShowAddSupplierModal(false)}
                quickSupplierData={quickSupplierData}
                onQuickSupplierChange={handleQuickSupplierChange}
                onAddQuickSupplier={handleAddQuickSupplier}
            />
        </Container>
    );
}

export default PurchaseOrders;