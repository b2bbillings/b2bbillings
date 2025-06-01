import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Badge, Tabs, Tab } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

// Import components
import PurchasesSummaryCards from './Purchases/PurchasesSummaryCards';
import PurchasesTable from './Purchases/PurchasesTable';
import PurchasesEmptyState from './Purchases/PurchasesEmptyState';
import PurchaseModal from './Purchases/PurchaseModal';
import QuickSupplierModal from './Purchases/QuickSupplierModal';

function Purchases({ view = 'allPurchases', onNavigate }) {
    // State management
    const [purchases, setPurchases] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState(null);
    const [activeTab, setActiveTab] = useState(view || 'allPurchases');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState({
        from: '',
        to: ''
    });

    // Form data structure matching sales
    const [formData, setFormData] = useState({
        purchaseNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        selectedSupplier: '',
        purchaseType: '', // GST or Non-GST
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

    const hasPurchases = purchases.length > 0;

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

    // Generate purchase number
    const generatePurchaseNumber = (type = 'gst') => {
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
        setEditingPurchase(null);
        setFormData({
            purchaseNumber: generatePurchaseNumber(),
            purchaseDate: new Date().toISOString().split('T')[0],
            selectedSupplier: '',
            purchaseType: 'gst',
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
        setShowCreateModal(true);
    };

    const handleCloseModal = () => {
        setShowCreateModal(false);
        setFormData({
            purchaseNumber: '',
            purchaseDate: new Date().toISOString().split('T')[0],
            selectedSupplier: '',
            purchaseType: '',
            paymentTerms: 'net30',
            items: [{
                productService: '',
                quantity: 1,
                price: 0,
                total: 0
            }],
            subtotal: 0,
            gstAmount: 0,
            discount: 0,
            total: 0,
            notes: ''
        });
        setEditingPurchase(null);
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
    // Update the handleAddQuickSupplier function around line 190-210
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
        alert(`${quickSupplierData.partyType === 'customer' ? 'Customer' : 'Supplier'} added and selected successfully!`);
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
                taxInclusive: false
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
        if (!formData.purchaseDate || formData.purchaseDate.trim() === '') {
            alert('Please select a purchase date');
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

        return true;
    };

    // Save purchase
    const handleSavePurchase = (e) => {
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

        // Prepare purchase data
        const purchaseData = {
            ...formData,
            supplierName: supplierData.name || 'Unknown Supplier',
            supplierPhone: supplierData.phone || supplierData.whatsappNumber || '',
            supplierEmail: supplierData.email || '',
            supplierAddress: supplierData.address || '',
            supplierGSTNumber: supplierData.gstNumber || '',
            status: 'pending'
        };

        if (editingPurchase) {
            setPurchases(purchases.map(purchase =>
                purchase.id === editingPurchase.id
                    ? { ...purchaseData, id: editingPurchase.id, createdAt: editingPurchase.createdAt }
                    : purchase
            ));
            alert('Purchase order updated successfully!');
        } else {
            const newPurchase = {
                ...purchaseData,
                id: Date.now(),
                createdAt: new Date().toISOString()
            };
            setPurchases([...purchases, newPurchase]);
            alert('Purchase order created successfully!');
        }

        handleCloseModal();
    };

    // Edit and delete operations
    const handleEditPurchase = (purchase) => {
        setEditingPurchase(purchase);
        setFormData({
            ...purchase,
            items: purchase.items?.map(item => ({
                productService: item.productService || '',
                quantity: item.quantity || 1,
                price: item.price || 0,
                total: item.total || 0,
                gstRate: item.gstRate || 0,
                taxInclusive: item.taxInclusive || false
            })) || [{ productService: '', quantity: 1, price: 0, total: 0 }]
        });
        setShowCreateModal(true);
    };

    const handleDeletePurchase = (purchaseId) => {
        if (window.confirm('Are you sure you want to delete this purchase order?')) {
            setPurchases(purchases.filter(purchase => purchase.id !== purchaseId));
        }
    };

    // Filter purchases
    const filteredPurchases = purchases.filter(purchase => {
        const matchesSearch = (purchase.supplierName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (purchase.purchaseNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

        let matchesDate = true;
        if (dateFilter.from && dateFilter.to) {
            const purchaseDate = new Date(purchase.createdAt).toISOString().split('T')[0];
            matchesDate = purchaseDate >= dateFilter.from && purchaseDate <= dateFilter.to;
        }

        return matchesSearch && matchesDate;
    });

    return (
        <Container fluid className="py-4">
            {/* Page Header */}
            <Row className="mb-4 align-items-center">
                <Col>
                    <h1 className="page-title mb-0">
                        Purchase Management
                        {hasPurchases && (
                            <Badge bg="secondary" className="ms-2">{purchases.length}</Badge>
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
                <Tab eventKey="allPurchases" title="All Purchases">
                    {hasPurchases ? (
                        <>
                            <PurchasesSummaryCards purchases={purchases} />
                            <PurchasesTable
                                filteredPurchases={filteredPurchases}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                dateFilter={dateFilter}
                                setDateFilter={setDateFilter}
                                onCreatePurchase={handleOpenCreateModal}
                                onEditPurchase={handleEditPurchase}
                                onDeletePurchase={handleDeletePurchase}
                            />
                        </>
                    ) : (
                        <PurchasesEmptyState onCreatePurchase={handleOpenCreateModal} />
                    )}
                </Tab>
                <Tab eventKey="orders" title="Purchase Orders">
                    <div className="text-center py-5">
                        <p>Purchase orders management will be available here.</p>
                    </div>
                </Tab>
                <Tab eventKey="reports" title="Reports">
                    <div className="text-center py-5">
                        <p>Purchase reports and analytics will be available here.</p>
                    </div>
                </Tab>
            </Tabs>

            {/* Modals */}
            <PurchaseModal
                show={showCreateModal}
                onHide={handleCloseModal}
                editingPurchase={editingPurchase}
                formData={formData}
                suppliers={suppliers}
                onInputChange={handleInputChange}
                onSupplierSelection={handleSupplierSelection}
                onItemChange={handleItemChange}
                onAddItem={addItem}
                onRemoveItem={removeItem}
                onSavePurchase={handleSavePurchase}
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

export default Purchases;