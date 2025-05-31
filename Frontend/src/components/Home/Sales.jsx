import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Badge, Tabs, Tab } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import './Sales.css';

// Import components
import SalesSummaryCards from './Sales/SalesSummaryCards';
import SalesTable from './Sales/SalesTable';
import SalesEmptyState from './Sales/SalesEmptyState';
import SalesModal from './Sales/SalesModal';
import QuickPartyModal from './Sales/QuickPartyModal';
import PaymentStatusModal from './Sales/PaymentStatusModal';
import PrintInvoiceModal from './Sales/PrintInvoiceModal';

function Sales({ view = 'allSales', onNavigate }) {
    // State management
    const [sales, setSales] = useState([]);
    const [parties, setParties] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddPartyModal, setShowAddPartyModal] = useState(false);

    // ADD THESE MISSING STATE VARIABLES
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [selectedSaleForPayment, setSelectedSaleForPayment] = useState(null);
    const [selectedSaleForPrint, setSelectedSaleForPrint] = useState(null);

    const [editingSale, setEditingSale] = useState(null);
    const [activeTab, setActiveTab] = useState(view || 'allSales');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState({
        from: '',
        to: ''
    });

    // Updated form data structure to match the new SalesModal
    const [formData, setFormData] = useState({
        invoiceNumber: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        selectedParty: '',
        invoiceType: '', // GST or Non-GST
        items: [{
            productService: '',
            quantity: 1,
            price: 0,
            total: 0
        }],
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
        notes: ''
    });

    // Quick party form data
    const [quickPartyData, setQuickPartyData] = useState({
        partyType: 'customer',
        name: '',
        phone: '',
        email: '',
        address: ''
    });

    const hasSales = sales.length > 0;

    // Load parties on component mount
    useEffect(() => {
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

    // Generate invoice number
    const generateInvoiceNumber = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(1000 + Math.random() * 9000);
        return `INV-${year}${month}${day}-${random}`;
    };

    // Modal operations
    const handleOpenCreateModal = () => {
        setEditingSale(null);
        setFormData({
            invoiceNumber: generateInvoiceNumber(),
            invoiceDate: new Date().toISOString().split('T')[0],
            selectedParty: '',
            invoiceType: '',
            items: [{
                productService: '',
                quantity: 1,
                price: 0,
                total: 0
            }],
            subtotal: 0,
            tax: 0,
            discount: 0,
            total: 0,
            notes: ''
        });
        setShowCreateModal(true);
    };
    const handleCloseModal = () => {
        setShowCreateModal(false); // FIXED: was setShowModal, should be setShowCreateModal

        // Reset form data to initial state
        setFormData({
            invoiceNumber: '',
            invoiceDate: new Date().toISOString().split('T')[0],
            selectedParty: '',
            invoiceType: '',
            items: [{
                productService: '',
                quantity: 1,
                price: 0,
                total: 0
            }],
            subtotal: 0,
            tax: 0,
            discount: 0,
            total: 0,
            notes: ''
        });

        // Reset editing state
        setEditingSale(null);
    };

    // Payment and Print handlers
    const handleManagePayment = (sale) => {
        setSelectedSaleForPayment(sale);
        setShowPaymentModal(true);
    };

    const handlePrintInvoice = (sale) => {
        setSelectedSaleForPrint(sale);
        setShowPrintModal(true);
    };

    const handleUpdatePayment = (updatedSale) => {
        setSales(sales.map(sale =>
            sale.id === updatedSale.id ? updatedSale : sale
        ));
        alert('Payment status updated successfully!');
    };

    // Party selection - updated to handle different party selection modes
    const handlePartySelection = (e) => {
        const value = e.target.value;
        const selectedPartyData = e.target.selectedPartyData;

        console.log('Party selection:', { value, selectedPartyData });

        setFormData(prev => ({
            ...prev,
            selectedParty: value,
            // Store additional party data if needed
            ...(selectedPartyData && { selectedPartyData })
        }));
    };

    // Form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = {
                ...prev,
                [name]: value
            };

            // Recalculate totals when tax or discount changes
            if (name === 'tax' || name === 'discount') {
                const subtotal = prev.subtotal || 0;
                const tax = name === 'tax' ? parseFloat(value) || 0 : prev.tax || 0;
                const discount = name === 'discount' ? parseFloat(value) || 0 : prev.discount || 0;

                const taxAmount = prev.invoiceType === 'gst' ? (subtotal * tax) / 100 : 0;
                const discountAmount = (subtotal * discount) / 100;
                const total = subtotal + taxAmount - discountAmount;

                newData.total = Math.max(0, total);
            }

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

        // Auto-select the newly added party
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

    // Item operations - updated for new structure
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

    // Calculate totals - updated for new structure
    const calculateTotals = (items = formData.items) => {
        let subtotal = 0;
        let totalGST = 0;

        items.forEach(item => {
            const itemTotal = parseFloat(item.total) || 0;
            subtotal += itemTotal;

            // Calculate GST for each item if invoice type is GST
            if (formData.invoiceType === 'gst' && item.gstRate) {
                const itemGST = (itemTotal * parseFloat(item.gstRate)) / 100;
                totalGST += itemGST;
            }
        });

        // Apply overall discount on subtotal
        const discountAmount = (subtotal * (parseFloat(formData.discount) || 0)) / 100;
        const finalSubtotal = subtotal - discountAmount;

        // GST should be calculated on the discounted amount
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


    // Updated validation logic
    const validateForm = () => {
        console.log('Validating form data:', formData);

        // Check invoice date
        if (!formData.invoiceDate || formData.invoiceDate.trim() === '') {
            alert('Please select an invoice date');
            return false;
        }

        // Check invoice type
        if (!formData.invoiceType || formData.invoiceType === '') {
            alert('Please select invoice type (GST or Non-GST)');
            return false;
        }

        // Check party selection
        if (!formData.selectedParty || formData.selectedParty === '') {
            alert('Please select a customer');
            return false;
        }

        // Check items
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

        // Check if any item has invalid quantity or price
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

    // Save invoice - updated validation
    const handleSaveInvoice = (e) => {
        e.preventDefault();

        console.log('Saving invoice with data:', formData);

        // Validate form
        if (!validateForm()) {
            return;
        }

        // Get selected party details for saving
        let customerData = {};

        if (formData.selectedParty === 'walk-in') {
            // Handle walk-in customer data from modal
            customerData = formData.selectedPartyData || {};
        } else if (formData.selectedParty.startsWith('db_')) {
            // Handle database party data from modal
            customerData = formData.selectedPartyData || {};
        } else {
            // Handle existing party
            const selectedParty = parties.find(p => p.id.toString() === formData.selectedParty);
            customerData = selectedParty || {};
        }

        // Prepare invoice data
        const invoiceData = {
            ...formData,
            customerName: customerData.name || 'Unknown Customer',
            customerPhone: customerData.phone || customerData.whatsappNumber || '',
            customerEmail: customerData.email || '',
            customerAddress: customerData.address || '',
            customerCity: customerData.city || '',
            gstNumber: customerData.gstNumber || '',
            status: 'completed',
            paymentHistory: [] // Initialize empty payment history
        };

        if (editingSale) {
            setSales(sales.map(sale =>
                sale.id === editingSale.id
                    ? { ...invoiceData, id: editingSale.id, createdAt: editingSale.createdAt, paymentHistory: editingSale.paymentHistory || [] }
                    : sale
            ));
            alert('Invoice updated successfully!');
        } else {
            const newSale = {
                ...invoiceData,
                id: Date.now(),
                createdAt: new Date().toISOString()
            };
            setSales([...sales, newSale]);
            alert('Invoice created successfully!');
        }

        handleCloseModal();
    };

    // Edit and delete operations
    const handleEditSale = (sale) => {
        setEditingSale(sale);
        setFormData({
            ...sale,
            // Ensure items have the correct structure
            items: sale.items?.map(item => ({
                productService: item.productService || item.product || '',
                quantity: item.quantity || 1,
                price: item.price || 0,
                total: item.total || 0
            })) || [{ productService: '', quantity: 1, price: 0, total: 0 }]
        });
        setShowCreateModal(true);
    };

    const handleDeleteSale = (saleId) => {
        if (window.confirm('Are you sure you want to delete this invoice?')) {
            setSales(sales.filter(sale => sale.id !== saleId));
        }
    };

    // Filter sales
    const filteredSales = sales.filter(sale => {
        const matchesSearch = (sale.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (sale.invoiceNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

        let matchesDate = true;
        if (dateFilter.from && dateFilter.to) {
            const saleDate = new Date(sale.createdAt).toISOString().split('T')[0];
            matchesDate = saleDate >= dateFilter.from && saleDate <= dateFilter.to;
        }

        return matchesSearch && matchesDate;
    });

    return (
        <Container fluid className="py-4">
            {/* Page Header */}
            <Row className="mb-4 align-items-center">
                <Col>
                    <h1 className="page-title mb-0">
                        Sales Management
                        {hasSales && (
                            <Badge bg="secondary" className="ms-2">{sales.length}</Badge>
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
                        Create Invoice
                    </Button>
                </Col>
            </Row>

            {/* Tabs */}
            <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-4 custom-tabs"
            >
                <Tab eventKey="allSales" title="All Sales">
                    {hasSales ? (
                        <>
                            <SalesSummaryCards sales={sales} />
                            <SalesTable
                                filteredSales={filteredSales}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                dateFilter={dateFilter}
                                setDateFilter={setDateFilter}
                                onCreateInvoice={handleOpenCreateModal}
                                onEditSale={handleEditSale}
                                onDeleteSale={handleDeleteSale}
                                onManagePayment={handleManagePayment}  // Add this line
                                onPrintInvoice={handlePrintInvoice}    // Add this line
                            />
                        </>
                    ) : (
                        <SalesEmptyState onCreateInvoice={handleOpenCreateModal} />
                    )}
                </Tab>
                <Tab eventKey="invoices" title="Invoices">
                    <div className="text-center py-5">
                        <p>Invoice management features will be available here.</p>
                    </div>
                </Tab>
                <Tab eventKey="quotations" title="Quotations">
                    <div className="text-center py-5">
                        <p>Quotation management features will be available here.</p>
                    </div>
                </Tab>
                <Tab eventKey="reports" title="Reports">
                    <div className="text-center py-5">
                        <p>Sales reports and analytics will be available here.</p>
                    </div>
                </Tab>
            </Tabs>

            {/* Modals */}
            <SalesModal
                show={showCreateModal}
                onHide={handleCloseModal}
                editingSale={editingSale}
                formData={formData}
                parties={parties}
                onInputChange={handleInputChange}
                onPartySelection={handlePartySelection}
                onItemChange={handleItemChange}
                onAddItem={addItem}
                onRemoveItem={removeItem}
                onSaveInvoice={handleSaveInvoice}
                onShowAddPartyModal={() => setShowAddPartyModal(true)}
            />

            <QuickPartyModal
                show={showAddPartyModal}
                onHide={() => setShowAddPartyModal(false)}
                quickPartyData={quickPartyData}
                onQuickPartyChange={handleQuickPartyChange}
                onAddQuickParty={handleAddQuickParty}
            />

            <PaymentStatusModal
                show={showPaymentModal}
                onHide={() => setShowPaymentModal(false)}
                sale={selectedSaleForPayment}
                onUpdatePayment={handleUpdatePayment}
            />

            <PrintInvoiceModal
                show={showPrintModal}
                onHide={() => setShowPrintModal(false)}
                sale={selectedSaleForPrint}
            />
        </Container>
    );
}

export default Sales;