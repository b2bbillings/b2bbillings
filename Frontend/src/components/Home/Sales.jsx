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
import PaymentModal from './Sales/PaymentModal'; // Only use PaymentModal
import PrintInvoiceModal from './Sales/PrintInvoiceModal';

function Sales({ view = 'allSales', onNavigate }) {
    // State management
    const [sales, setSales] = useState([]);
    const [parties, setParties] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddPartyModal, setShowAddPartyModal] = useState(false);

    // Payment and Print modal states - SIMPLIFIED
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [selectedSaleForPayment, setSelectedSaleForPayment] = useState(null);
    const [selectedSaleForPrint, setSelectedSaleForPrint] = useState(null);

    const [editingSale, setEditingSale] = useState(null);
    const [activeTab, setActiveTab] = useState(view || 'allSales');
    const [searchQuery, setSearchQuery] = useState('');

    // Simplified payment modal state - use same modal for both scenarios
    const [showPaymentAfterInvoice, setShowPaymentAfterInvoice] = useState(false);
    const [newlyCreatedInvoice, setNewlyCreatedInvoice] = useState(null);

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
    const generateInvoiceNumber = (invoiceType = 'non-gst') => {
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(1000 + Math.random() * 9000);

        if (invoiceType === 'gst') {
            return `GST-${year}${month}${day}-${random}`;
        } else {
            return `INV-${year}${month}${day}-${random}`;
        }
    };

    // Modal operations
    const handleOpenCreateModal = () => {
        setEditingSale(null);

        const defaultInvoiceType = 'non-gst';
        const invoiceNumber = generateInvoiceNumber(defaultInvoiceType);

        setFormData({
            invoiceNumber: invoiceNumber,
            invoiceDate: new Date().toISOString().split('T')[0],
            selectedParty: '',
            invoiceType: defaultInvoiceType,
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
            notes: ''
        });
        setShowCreateModal(true);
    };

    const handleCloseModal = () => {
        setShowCreateModal(false);
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
        setEditingSale(null);
    };

    // SIMPLIFIED Payment handler - now just opens PaymentModal for existing invoices
    const handleManagePayment = (sale) => {
        console.log('🎯 Opening payment modal for existing sale:', sale);
        setSelectedSaleForPayment(sale);
        setShowPaymentModal(true);
    };

    const handlePrintInvoice = (sale) => {
        setSelectedSaleForPrint(sale);
        setShowPrintModal(true);
    };

    // UNIFIED Payment handler - handles both new and existing invoice payments
    const handleSavePaymentPlan = (paymentData) => {
        console.log('💰 Saving payment plan:', paymentData);

        try {
            const invoiceId = paymentData.invoiceId;

            setSales(prevSales => {
                return prevSales.map(sale => {
                    if (sale.id === invoiceId) {
                        const updatedSale = {
                            ...sale,
                            payments: paymentData.payments || [],
                            nextDueDate: paymentData.nextDueDate,
                            paymentHistory: [...(sale.paymentHistory || []), {
                                id: Date.now(),
                                type: 'payment_plan_updated',
                                data: paymentData.summary,
                                createdAt: new Date().toISOString()
                            }]
                        };

                        // Update payment status based on summary
                        if (paymentData.summary) {
                            updatedSale.paymentStatus = paymentData.summary.paymentStatus;
                            updatedSale.remainingAmount = paymentData.summary.remainingAmount;
                        }

                        return updatedSale;
                    }
                    return sale;
                });
            });

            alert('Payment plan saved successfully!');

            // Close the appropriate modal
            if (showPaymentAfterInvoice) {
                setShowPaymentAfterInvoice(false);
                setNewlyCreatedInvoice(null);
            } else {
                setShowPaymentModal(false);
                setSelectedSaleForPayment(null);
            }

        } catch (error) {
            console.error('❌ Error saving payment plan:', error);
            alert('Error saving payment plan. Please try again.');
        }
    };

    // Party selection
    const handlePartySelection = (e) => {
        console.log('Party selection:', e.target);

        const { value, selectedPartyData } = e.target;

        setFormData(prev => ({
            ...prev,
            selectedParty: value,
            customerName: selectedPartyData?.name || '',
            customerPhone: selectedPartyData?.phone || selectedPartyData?.whatsappNumber || '',
            customerEmail: selectedPartyData?.email || '',
            customerAddress: selectedPartyData?.address || '',
        }));

        console.log('Form data updated with party:', selectedPartyData);
    };

    // Form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = {
                ...prev,
                [name]: value
            };

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
    const handleShowAddPartyModal = (prefilledName = '',defaultPartyType = 'customer') => {
        console.log('🎯 handleShowAddPartyModal called with prefilledName:', prefilledName);

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
            const itemTotal = parseFloat(item.total) || 0;
            subtotal += itemTotal;

            if (formData.invoiceType === 'gst' && item.gstRate) {
                const itemGST = (itemTotal * parseFloat(item.gstRate)) / 100;
                totalGST += itemGST;
            }
        });

        const discountAmount = (subtotal * (parseFloat(formData.discount) || 0)) / 100;
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
        console.log('Validating form data:', formData);

        if (!formData.invoiceDate || formData.invoiceDate.trim() === '') {
            alert('Please select an invoice date');
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

    // Save invoice - shows PaymentModal after creation
    const handleSaveInvoice = (e) => {
        e.preventDefault();

        console.log('Saving invoice with data:', formData);
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

            const invoiceData = {
                id: editingSale ? editingSale.id : Date.now(),
                invoiceNumber: formData.invoiceNumber || generateInvoiceNumber(),
                invoiceDate: formData.invoiceDate,
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
                finalTotal: formData.total || 0, // For PaymentModal compatibility
                notes: formData.notes || '',
                createdAt: editingSale ? editingSale.createdAt : new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'completed',
                payments: editingSale ? editingSale.payments || [] : [],
                paymentHistory: editingSale ? editingSale.paymentHistory || [] : [],
                paymentStatus: 'pending',
                remainingAmount: formData.total || 0,
                // For PaymentModal compatibility
                partyName: formData.customerName || selectedParty?.name || 'Walk-in Customer'
            };

            if (editingSale) {
                setSales(prev => prev.map(sale =>
                    sale.id === editingSale.id ? invoiceData : sale
                ));
                alert('Invoice updated successfully!');
                handleCloseModal();
            } else {
                setSales(prev => [...prev, invoiceData]);
                setNewlyCreatedInvoice(invoiceData);

                alert('Invoice created successfully!');
                console.log('✅ New invoice created:', invoiceData);

                handleCloseModal();

                // Show PaymentModal after invoice creation
                setTimeout(() => {
                    setShowPaymentAfterInvoice(true);
                }, 500);
            }

        } catch (error) {
            console.error('❌ Error saving invoice:', error);
            alert('Error saving invoice. Please try again.');
        }
    };

    const handleClosePaymentAfterInvoice = () => {
        setShowPaymentAfterInvoice(false);
        setNewlyCreatedInvoice(null);
    };

    const handleClosePaymentModal = () => {
        setShowPaymentModal(false);
        setSelectedSaleForPayment(null);
    };

    // Edit and delete operations
    const handleEditSale = (sale) => {
        setEditingSale(sale);
        setFormData({
            ...sale,
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
                                statusFilter="all"
                                setStatusFilter={() => { }}
                                paymentStatusFilter="all"
                                setPaymentStatusFilter={() => { }}
                                sortConfig={{ field: 'createdAt', direction: 'desc' }}
                                setSortConfig={() => { }}
                                onCreateInvoice={handleOpenCreateModal}
                                onEditSale={handleEditSale}
                                onDeleteSale={handleDeleteSale}
                                onManagePayment={handleManagePayment}
                                onPrintInvoice={handlePrintInvoice}
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
                onShowAddPartyModal={handleShowAddPartyModal}
            />

            <QuickPartyModal
                show={showAddPartyModal}
                onHide={() => setShowAddPartyModal(false)}
                quickPartyData={quickPartyData}
                onQuickPartyChange={handleQuickPartyChange}
                onAddQuickParty={handleAddQuickParty}
            />

            {/* Payment Modal for Existing Invoices */}
            <PaymentModal
                show={showPaymentModal}
                onHide={handleClosePaymentModal}
                invoiceData={selectedSaleForPayment}
                onSavePayment={handleSavePaymentPlan}
                onSetReminder={(data) => {
                    console.log('Setting payment reminder for existing invoice:', data);
                }}
            />

            {/* Payment Modal After Invoice Creation */}
            <PaymentModal
                show={showPaymentAfterInvoice}
                onHide={handleClosePaymentAfterInvoice}
                invoiceData={newlyCreatedInvoice}
                onSavePayment={handleSavePaymentPlan}
                onSetReminder={(data) => {
                    console.log('Setting payment reminder for new invoice:', data);
                }}
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