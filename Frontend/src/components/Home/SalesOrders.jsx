import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Badge, Tabs, Tab } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFileContract } from '@fortawesome/free-solid-svg-icons';

// Reuse components from Sales
import SalesSummaryCards from './Sales/SalesSummaryCards';
import SalesEmptyState from './Sales/SalesEmptyState';
import SalesModal from './Sales/SalesOrderModal'; // We'll create this next
import QuickPartyModal from './Sales/QuickPartyModal';
import PrintInvoiceModal from './Sales/PrintInvoiceModal';

function SalesOrders({ view = 'salesOrders', onNavigate }) {
    // State management
    const [salesOrders, setSalesOrders] = useState([]);
    const [parties, setParties] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddPartyModal, setShowAddPartyModal] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);

    const [editingSalesOrder, setEditingSalesOrder] = useState(null);
    const [selectedSalesOrderForPrint, setSelectedSalesOrderForPrint] = useState(null);
    const [activeTab, setActiveTab] = useState(view || 'salesOrders');
    const [searchQuery, setSearchQuery] = useState('');

    const [dateFilter, setDateFilter] = useState({
        from: '',
        to: ''
    });

    // Form data structure
    const [formData, setFormData] = useState({
        orderNumber: '',
        orderDate: new Date().toISOString().split('T')[0],
        selectedParty: '',
        invoiceType: 'non-gst',
        items: [{
            productService: '',
            quantity: 1,
            price: 0,
            total: 0,
            gstRate: 0,
            taxInclusive: false
        }],
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
        notes: '',
        status: 'draft', // draft, confirmed, delivered, cancelled, converted
        deliveryDate: ''
    });

    // Quick party form data
    const [quickPartyData, setQuickPartyData] = useState({
        partyType: 'customer',
        name: '',
        phone: '',
        email: '',
        address: ''
    });

    // Check if there are any sales orders
    const hasSalesOrders = salesOrders.length > 0;

    // Load parties on component mount
    useEffect(() => {
        // Same as in Sales.jsx
        const sampleParties = [
            {
                id: 1,
                name: 'John Doe',
                phone: '9876543210',
                whatsappNumber: '9876543210',
                email: 'john@example.com',
                partyType: 'customer',
                city: 'Mumbai',
                address: '123 Main St',
                gstNumber: ''
            },
            {
                id: 2,
                name: 'ABC Suppliers',
                phone: '9876543211',
                whatsappNumber: '9876543211',
                email: 'abc@example.com',
                partyType: 'supplier',
                city: 'Delhi',
                address: '456 Business Ave',
                gstNumber: '27AAACR5055K1ZX'
            },
            {
                id: 3,
                name: 'XYZ Company',
                phone: '9876543212',
                whatsappNumber: '9876543212',
                email: 'xyz@example.com',
                partyType: 'customer',
                city: 'Pune',
                address: '789 Corporate Blvd',
                gstNumber: ''
            }
        ];
        setParties(sampleParties);
    }, []);

    // Generate sales order number
    const generateOrderNumber = (invoiceType = 'non-gst') => {
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(1000 + Math.random() * 9000);

        // Different prefix for Sales Orders
        return `SO-${year}${month}${day}-${random}`;
    };

    // Modal operations
    const handleOpenCreateModal = () => {
        setEditingSalesOrder(null);
        const orderNumber = generateOrderNumber();

        setFormData({
            orderNumber: orderNumber,
            orderDate: new Date().toISOString().split('T')[0],
            deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
            selectedParty: '',
            invoiceType: 'non-gst',
            items: [{
                productService: '',
                quantity: 1,
                price: 0,
                total: 0,
                gstRate: 0,
                taxInclusive: false
            }],
            subtotal: 0,
            tax: 0,
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
            deliveryDate: '',
            selectedParty: '',
            invoiceType: 'non-gst',
            items: [{
                productService: '',
                quantity: 1,
                price: 0,
                total: 0,
                gstRate: 0,
                taxInclusive: false
            }],
            subtotal: 0,
            tax: 0,
            discount: 0,
            total: 0,
            notes: '',
            status: 'draft'
        });
        setEditingSalesOrder(null);
    };

    // Party selection
    const handlePartySelection = (e) => {
        const { value, selectedPartyData } = e.target;

        setFormData(prev => ({
            ...prev,
            selectedParty: value,
            customerName: selectedPartyData?.name || '',
            customerPhone: selectedPartyData?.phone || selectedPartyData?.whatsappNumber || '',
            customerEmail: selectedPartyData?.email || '',
            customerAddress: selectedPartyData?.address || '',
        }));
    };

    // Form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            return newData;
        });
    };

    // Quick party changes
    const handleQuickPartyChange = (e) => {
        const { name, value } = e.target;
        setQuickPartyData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Add quick party
    const handleAddQuickParty = (e) => {
        e.preventDefault();

        if (!quickPartyData.name.trim()) {
            alert('Please enter party name');
            return;
        }

        const newParty = {
            id: Date.now(),
            ...quickPartyData,
            whatsappNumber: quickPartyData.phone,
            city: '',
            gstNumber: ''
        };

        setParties(prev => [...prev, newParty]);

        setFormData(prev => ({
            ...prev,
            selectedParty: newParty.id.toString()
        }));

        setQuickPartyData({
            partyType: 'customer',
            name: '',
            phone: '',
            email: '',
            address: ''
        });

        setShowAddPartyModal(false);
        alert('Party added successfully!');
    };

    // Show Add Party Modal Handler
    const handleShowAddPartyModal = (prefilledName = '', defaultPartyType = 'customer') => {
        setQuickPartyData(prev => ({
            ...prev,
            name: prefilledName || '',
            partyType: defaultPartyType,
            phone: '',
            email: '',
            address: ''
        }));

        setShowAddPartyModal(true);
    };

    // Item operations
    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;

        if (field === 'quantity' || field === 'price') {
            const quantity = parseFloat(newItems[index].quantity) || 0;
            const price = parseFloat(newItems[index].price) || 0;
            newItems[index].total = quantity * price;
        }

        setFormData(prev => ({
            ...prev,
            items: newItems
        }));

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
                sku: '',
                unit: 'piece',
                selectedProduct: null
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
            const quantity = parseFloat(item.quantity || 0);
            const price = parseFloat(item.price || 0);
            const gstRate = parseFloat(item.gstRate || 0);
            const itemTotal = quantity * price;

            if (formData.invoiceType === 'gst' && gstRate > 0) {
                const isItemTaxInclusive = item.taxInclusive !== undefined ? item.taxInclusive : false;

                if (isItemTaxInclusive) {
                    // Tax inclusive: extract GST from total
                    const baseAmount = itemTotal / (1 + gstRate / 100);
                    const gstAmount = itemTotal - baseAmount;
                    subtotal += baseAmount;
                    totalGST += gstAmount;
                } else {
                    // Tax exclusive: add GST to base amount
                    const gstAmount = (itemTotal * gstRate) / 100;
                    subtotal += itemTotal;
                    totalGST += gstAmount;
                }
            } else {
                // Non-GST or no GST rate
                subtotal += itemTotal;
            }
        });

        // Apply discount
        const discountRate = parseFloat(formData.discount || 0);
        const discountAmount = (subtotal * discountRate) / 100;
        const finalSubtotal = subtotal - discountAmount;

        let finalGST = totalGST;
        if (discountAmount > 0 && formData.invoiceType === 'gst') {
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

    // Validation
    const validateForm = () => {
        if (!formData.orderDate || formData.orderDate.trim() === '') {
            alert('Please select an order date');
            return false;
        }

        if (!formData.invoiceType || formData.invoiceType === '') {
            alert('Please select invoice type (GST or Non-GST)');
            return false;
        }

        if (!formData.selectedParty || formData.selectedParty === '') {
            alert('Please select a customer');
            return false;
        }

        if (!formData.deliveryDate || formData.deliveryDate.trim() === '') {
            alert('Please select an expected delivery date');
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

    // Save sales order
    const handleSaveSalesOrder = (e) => {
        e.preventDefault();

        console.log('Saving sales order with data:', formData);
        try {
            if (!validateForm()) {
                return;
            }

            let customerData = {};
            let selectedParty = null;

            if (formData.selectedParty === 'walk-in') {
                customerData = formData.selectedPartyData || {};
            } else if (formData.selectedParty.startsWith('db_')) {
                customerData = formData.selectedPartyData || {};
            } else {
                selectedParty = parties.find(p => p.id.toString() === formData.selectedParty);
                customerData = selectedParty || {};
            }

            const salesOrderData = {
                id: editingSalesOrder ? editingSalesOrder.id : Date.now(),
                orderNumber: formData.orderNumber || generateOrderNumber(),
                orderDate: formData.orderDate,
                deliveryDate: formData.deliveryDate,
                invoiceType: formData.invoiceType || 'non-gst',
                customerName: formData.customerName || selectedParty?.name || 'Walk-in Customer',
                customerPhone: formData.customerPhone || selectedParty?.phone || '',
                customerEmail: formData.customerEmail || selectedParty?.email || '',
                customerAddress: formData.customerAddress || selectedParty?.address || '',
                items: formData.items,
                subtotal: formData.subtotal || 0,
                discount: formData.discount || 0,
                gstAmount: formData.gstAmount || 0,
                total: formData.total || 0,
                notes: formData.notes || '',
                status: formData.status || 'draft',
                createdAt: editingSalesOrder ? editingSalesOrder.createdAt : new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (editingSalesOrder) {
                setSalesOrders(prev => prev.map(order =>
                    order.id === editingSalesOrder.id ? salesOrderData : order
                ));
                alert('Sales Order updated successfully!');
                handleCloseModal();
            } else {
                setSalesOrders(prev => [...prev, salesOrderData]);
                alert('Sales Order created successfully!');
                handleCloseModal();
            }

        } catch (error) {
            console.error('❌ Error saving sales order:', error);
            alert('Error saving sales order. Please try again.');
        }
    };

    // Convert Sales Order to Invoice
    const handleConvertToInvoice = (salesOrder) => {
        // This would typically send the sales order data to your Sales component
        // to create a new invoice from this sales order
        alert(`Converting Sales Order ${salesOrder.orderNumber} to Invoice. This functionality will be implemented soon.`);
    };

    // Edit and delete operations
    const handleEditSalesOrder = (salesOrder) => {
        setEditingSalesOrder(salesOrder);
        setFormData({
            ...salesOrder,
            items: salesOrder.items?.map(item => ({
                productService: item.productService || item.product || '',
                quantity: item.quantity || 1,
                price: item.price || 0,
                total: item.total || 0,
                gstRate: item.gstRate || 0,
                taxInclusive: item.taxInclusive || false
            })) || [{ productService: '', quantity: 1, price: 0, total: 0, gstRate: 0, taxInclusive: false }]
        });
        setShowCreateModal(true);
    };

    const handleDeleteSalesOrder = (orderId) => {
        if (window.confirm('Are you sure you want to delete this sales order?')) {
            setSalesOrders(salesOrders.filter(order => order.id !== orderId));
        }
    };

    // Filter sales orders
    const filteredSalesOrders = salesOrders.filter(order => {
        const matchesSearch = (order.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (order.orderNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

        let matchesDate = true;
        if (dateFilter.from && dateFilter.to) {
            const orderDate = new Date(order.orderDate).toISOString().split('T')[0];
            matchesDate = orderDate >= dateFilter.from && orderDate <= dateFilter.to;
        }

        return matchesSearch && matchesDate;
    });

    const handlePrintSalesOrder = (order) => {
        setSelectedSalesOrderForPrint(order);
        setShowPrintModal(true);
    };

    return (
        <Container fluid className="py-4">
            {/* Page Header */}
            <Row className="mb-4 align-items-center">
                <Col>
                    <h1 className="page-title mb-0">
                        Sales Orders
                        {hasSalesOrders && (
                            <Badge bg="secondary" className="ms-2">{salesOrders.length}</Badge>
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
                        Create Sales Order
                    </Button>
                </Col>
            </Row>

            {/* Sales Orders Content */}
            <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-4 custom-tabs"
            >
                <Tab eventKey="salesOrders" title="All Sales Orders">
                    {hasSalesOrders ? (
                        <>
                            {/* Add SalesOrdersTable component here */}
                            <div className="alert alert-info">
                                <FontAwesomeIcon icon={faFileContract} className="me-2" />
                                {salesOrders.length} Sales Orders available. Display them in a table similar to Sales Invoices.
                            </div>
                        </>
                    ) : (
                        <div className="empty-state-container">
                            <div className="empty-state-content text-center">
                                <h2 className="mt-4">Create Your First Sales Order</h2>
                                <p className="text-muted mb-4">
                                    Sales Orders allow you to record customer orders before creating invoices.
                                    <br />
                                    Track orders, set delivery dates, and convert to invoices when ready!
                                </p>

                                <div className="empty-state-image-container mb-4">
                                    {/* You can add an image here */}
                                </div>

                                <Button
                                    variant="primary"
                                    size="lg"
                                    className="create-sale-btn"
                                    onClick={handleOpenCreateModal}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="me-2" />
                                    Create Your First Sales Order
                                </Button>
                            </div>
                        </div>
                    )}
                </Tab>
                <Tab eventKey="draft" title="Draft Orders">
                    <div className="text-center py-5">
                        <p>Draft sales orders will be displayed here.</p>
                    </div>
                </Tab>
                <Tab eventKey="confirmed" title="Confirmed Orders">
                    <div className="text-center py-5">
                        <p>Confirmed sales orders will be displayed here.</p>
                    </div>
                </Tab>
                <Tab eventKey="reports" title="Reports">
                    <div className="text-center py-5">
                        <p>Sales order reports and analytics will be available here.</p>
                    </div>
                </Tab>
            </Tabs>

            {/* Modals */}
            {/* Sales Order Modal - will create this in the next step */}
            <SalesModal
                show={showCreateModal}
                onHide={handleCloseModal}
                editingSalesOrder={editingSalesOrder}
                formData={formData}
                parties={parties}
                onInputChange={handleInputChange}
                onPartySelection={handlePartySelection}
                onItemChange={handleItemChange}
                onAddItem={addItem}
                onRemoveItem={removeItem}
                onSaveSalesOrder={handleSaveSalesOrder}
                onShowAddPartyModal={handleShowAddPartyModal}
            />

            <QuickPartyModal
                show={showAddPartyModal}
                onHide={() => setShowAddPartyModal(false)}
                quickPartyData={quickPartyData}
                onQuickPartyChange={handleQuickPartyChange}
                onAddQuickParty={handleAddQuickParty}
            />

            <PrintInvoiceModal
                show={showPrintModal}
                onHide={() => setShowPrintModal(false)}
                sale={selectedSalesOrderForPrint}
            />
        </Container>
    );
}

export default SalesOrders;