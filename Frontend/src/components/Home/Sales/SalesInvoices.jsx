import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

// Import components
import SalesInvoicesHeader from './SalesInvoice/SalesInvoicesHeader';
import SalesInvoicesPageTitle from './SalesInvoice/SalesInvoicesPageTitle';
import SalesInvoicesFilter from './SalesInvoice/SalesInvoicesFilter';
import SalesInvoicesSummary from './SalesInvoice/SalesInvoicesSummary';
import SalesInvoicesTable from './SalesInvoice/SalesInvoicesTable';
import SalesForm from './SalesInvoice/SalesForm';
import PurchaseForm from '../Purchases/PurchaseForm';
import './SalesInvoices.css';

// Debounce hook for optimizing search
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

function SalesInvoices() {
    // State management
    const [currentView, setCurrentView] = useState('list'); // 'list', 'sale', or 'purchase'
    const [dateRange, setDateRange] = useState('This Month');
    const [startDate, setStartDate] = useState(new Date(2025, 5, 1)); // June 1, 2025
    const [endDate, setEndDate] = useState(new Date(2025, 5, 30)); // June 30, 2025
    const [selectedFirm, setSelectedFirm] = useState('All Firms');
    const [topSearchTerm, setTopSearchTerm] = useState('');

    // Debounced search term for better performance
    const debouncedSearchTerm = useDebounce(topSearchTerm, 300);

    // Transactions state
    const [transactions, setTransactions] = useState([
        {
            id: 1,
            date: '03/06/2025',
            invoiceNo: '1',
            partyName: 'IT Solution',
            transaction: 'Sale',
            paymentType: 'Cash',
            amount: 90000,
            balance: 90000,
            status: 'Paid'
        }
    ]);

    // Memoized categories to prevent recreation on every render
    const categories = useMemo(() => [
        { id: 1, name: 'Electronics', description: 'Electronic items and gadgets', isActive: true },
        { id: 2, name: 'Furniture', description: 'Office and home furniture', isActive: true },
        { id: 3, name: 'Stationery', description: 'Office supplies and stationery', isActive: true },
        { id: 4, name: 'Services', description: 'Professional services', isActive: true },
        { id: 5, name: 'Hardware', description: 'Computer hardware components', isActive: true },
        { id: 6, name: 'Software', description: 'Software licenses and subscriptions', isActive: true },
        { id: 7, name: 'Accessories', description: 'Various accessories', isActive: true },
        { id: 8, name: 'Tools', description: 'Professional tools and equipment', isActive: true }
    ], []);

    // Inventory items state with memoization
    const [inventoryItems, setInventoryItems] = useState(() => [
        {
            id: 1,
            name: 'HP Laptop i5 8GB',
            itemCode: 'HP-LAP-001',
            category: 'Electronics',
            salePrice: 50000,
            buyPrice: 45000,
            currentStock: 10,
            minStockLevel: 2,
            unit: 'Piece',
            hsnNumber: '8471',
            gstRate: 18,
            description: 'HP Pavilion Laptop with i5 processor and 8GB RAM',
            isActive: true
        },
        {
            id: 2,
            name: 'Office Chair Executive',
            itemCode: 'OFC-CHR-001',
            category: 'Furniture',
            salePrice: 12000,
            buyPrice: 9000,
            currentStock: 5,
            minStockLevel: 1,
            unit: 'Piece',
            hsnNumber: '9401',
            gstRate: 18,
            description: 'Executive office chair with lumbar support',
            isActive: true
        },
        {
            id: 3,
            name: 'A4 Paper 500 Sheets',
            itemCode: 'PPR-A4-001',
            category: 'Stationery',
            salePrice: 400,
            buyPrice: 320,
            currentStock: 50,
            minStockLevel: 10,
            unit: 'Ream',
            hsnNumber: '4802',
            gstRate: 12,
            description: 'Premium quality A4 printing paper',
            isActive: true
        },
        {
            id: 4,
            name: 'Wireless Mouse Optical',
            itemCode: 'MSE-WL-001',
            category: 'Electronics',
            salePrice: 1200,
            buyPrice: 800,
            currentStock: 25,
            minStockLevel: 5,
            unit: 'Piece',
            hsnNumber: '8471',
            gstRate: 18,
            description: 'Optical wireless mouse with USB receiver',
            isActive: true
        },
        {
            id: 5,
            name: 'Business Consultation',
            itemCode: 'SVC-CONS-001',
            category: 'Services',
            salePrice: 3500,
            buyPrice: 0,
            currentStock: 0,
            minStockLevel: 0,
            unit: 'Hour',
            hsnNumber: '9983',
            gstRate: 18,
            type: 'service',
            description: 'Professional business consultation service',
            isActive: true
        },
        {
            id: 6,
            name: 'Dell Monitor 24 inch',
            itemCode: 'DEL-MON-001',
            category: 'Electronics',
            salePrice: 18000,
            buyPrice: 15000,
            currentStock: 8,
            minStockLevel: 2,
            unit: 'Piece',
            hsnNumber: '8528',
            gstRate: 18,
            description: 'Dell 24-inch LED monitor with full HD resolution',
            isActive: true
        },
        {
            id: 7,
            name: 'Office Desk Wooden',
            itemCode: 'OFC-DSK-001',
            category: 'Furniture',
            salePrice: 25000,
            buyPrice: 20000,
            currentStock: 3,
            minStockLevel: 1,
            unit: 'Piece',
            hsnNumber: '9403',
            gstRate: 18,
            description: 'Wooden office desk with drawers',
            isActive: true
        },
        {
            id: 8,
            name: 'Printer Ink Cartridge',
            itemCode: 'PRT-INK-001',
            category: 'Accessories',
            salePrice: 2500,
            buyPrice: 2000,
            currentStock: 15,
            minStockLevel: 3,
            unit: 'Piece',
            hsnNumber: '8443',
            gstRate: 18,
            description: 'Original printer ink cartridge',
            isActive: true
        }
    ]);

    // Summary data
    const [summary, setSummary] = useState({
        totalSalesAmount: 90000,
        totalPurchaseAmount: 0,
        growthPercentage: 100,
        received: 0,
        balance: 90000
    });

    // Memoized static options to prevent recreation
    const dateRangeOptions = useMemo(() => [
        'Today',
        'Yesterday',
        'This Week',
        'This Month',
        'Last Month',
        'This Quarter',
        'This Year',
        'Custom Range'
    ], []);

    const firmOptions = useMemo(() => [
        'All Firms',
        'Main Branch',
        'Secondary Branch',
        'IT Solution'
    ], []);

    // Memoized filtered transactions for better performance
    const filteredTransactions = useMemo(() => {
        if (!debouncedSearchTerm) return transactions;

        const searchLower = debouncedSearchTerm.toLowerCase();
        return transactions.filter(transaction =>
            transaction.partyName.toLowerCase().includes(searchLower) ||
            (transaction.invoiceNo && transaction.invoiceNo.toLowerCase().includes(searchLower))
        );
    }, [transactions, debouncedSearchTerm]);

    // Optimized event handlers with useCallback
    const handleDateRangeChange = useCallback((range) => {
        setDateRange(range);
        // Add your date calculation logic here
    }, []);

    const handleStartDateChange = useCallback((e) => {
        const newDate = new Date(e.target.value);
        setStartDate(newDate);
        setDateRange('Custom Range');
    }, []);

    const handleEndDateChange = useCallback((e) => {
        const newDate = new Date(e.target.value);
        setEndDate(newDate);
        setDateRange('Custom Range');
    }, []);

    const handleAddSale = useCallback(() => {
        setCurrentView('sale');
    }, []);

    const handleAddPurchase = useCallback(() => {
        setCurrentView('purchase');
    }, []);

    const handleBackToList = useCallback(() => {
        setCurrentView('list');
    }, []);

    const handleSaleFormSave = useCallback((saleData) => {
        console.log('💾 Saving sale data:', saleData);

        // Generate new transaction from sale data
        const newTransaction = {
            id: Date.now(), // Use timestamp for better uniqueness
            date: new Date().toLocaleDateString('en-GB'),
            invoiceNo: saleData.invoiceNumber.replace('NTPL-', ''),
            partyName: saleData.customer?.name || 'Unknown Customer',
            transaction: 'Sale',
            paymentType: saleData.paymentDetails?.method || 'Cash',
            amount: saleData.totals.finalTotal,
            balance: saleData.totals.finalTotal - (saleData.paymentIn || 0),
            status: (saleData.paymentIn || 0) >= saleData.totals.finalTotal ? 'Paid' : 'Pending'
        };

        // Add new transaction
        setTransactions(prev => [...prev, newTransaction]);

        // Update summary
        setSummary(prev => ({
            ...prev,
            totalSalesAmount: prev.totalSalesAmount + saleData.totals.finalTotal,
            received: prev.received + (saleData.paymentIn || 0),
            balance: prev.balance + (saleData.totals.finalTotal - (saleData.paymentIn || 0))
        }));

        // Go back to list view
        setCurrentView('list');

        // Show success message
        alert(`Sale ${saleData.invoiceNumber} saved successfully!`);
    }, []);

    const handlePurchaseFormSave = useCallback((purchaseData) => {
        console.log('💾 Saving purchase data:', purchaseData);

        // Generate new transaction from purchase data
        const newTransaction = {
            id: Date.now(), // Use timestamp for better uniqueness
            date: new Date().toLocaleDateString('en-GB'),
            invoiceNo: purchaseData.purchaseNumber.replace('PUR-', '').replace('GST-', ''),
            partyName: purchaseData.supplier?.name || 'Unknown Supplier',
            transaction: 'Purchase',
            paymentType: purchaseData.paymentDetails?.method || 'Cash',
            amount: purchaseData.totals.finalTotal,
            balance: purchaseData.totals.finalTotal - (purchaseData.paymentOut || 0),
            status: (purchaseData.paymentOut || 0) >= purchaseData.totals.finalTotal ? 'Paid' : 'Pending'
        };

        // Add new transaction
        setTransactions(prev => [...prev, newTransaction]);

        // Update summary
        setSummary(prev => ({
            ...prev,
            totalPurchaseAmount: (prev.totalPurchaseAmount || 0) + purchaseData.totals.finalTotal,
            balance: prev.balance + (purchaseData.totals.finalTotal - (purchaseData.paymentOut || 0))
        }));

        // Go back to list view
        setCurrentView('list');

        // Show success message
        alert(`Purchase ${purchaseData.purchaseNumber} saved successfully!`);
    }, []);

    // Handler for adding new items to inventory with optimization
    const handleAddItem = useCallback(async (productData) => {
        try {
            console.log('Adding item to inventory:', productData);

            // Create new item with unique ID
            const newItem = {
                ...productData,
                id: Date.now(), // Use timestamp for better uniqueness
                currentStock: productData.openingStock || 0,
                isActive: true
            };

            // Add to inventory items
            setInventoryItems(prev => [...prev, newItem]);

            // Show success message
            alert(`Item "${productData.name}" added to inventory successfully!`);

            // Return success
            return true;
        } catch (error) {
            console.error('Error adding item:', error);
            alert('Error adding item to inventory. Please try again.');
            return false;
        }
    }, []);

    // Optimized search handler with immediate UI update
    const handleSearchChange = useCallback((e) => {
        setTopSearchTerm(e.target.value);
    }, []);

    // Other optimized event handlers
    const handleMoreOptions = useCallback(() => console.log('More options clicked'), []);
    const handleSettings = useCallback(() => console.log('Settings clicked'), []);
    const handleExcelExport = useCallback(() => console.log('Excel Export clicked'), []);
    const handlePrint = useCallback(() => window.print(), []);

    const handleViewTransaction = useCallback((transaction) => {
        console.log('View transaction:', transaction);
        // Implement view transaction logic
    }, []);

    const handleEditTransaction = useCallback((transaction) => {
        console.log('Edit transaction:', transaction);
        // Implement edit transaction logic
    }, []);

    const handleDeleteTransaction = useCallback((transaction) => {
        if (window.confirm(`Are you sure you want to delete transaction ${transaction.invoiceNo}?`)) {
            setTransactions(prev => prev.filter(t => t.id !== transaction.id));

            // Update summary when deleting
            setSummary(prev => ({
                ...prev,
                totalSalesAmount: transaction.transaction === 'Sale'
                    ? prev.totalSalesAmount - transaction.amount
                    : prev.totalSalesAmount,
                totalPurchaseAmount: transaction.transaction === 'Purchase'
                    ? (prev.totalPurchaseAmount || 0) - transaction.amount
                    : prev.totalPurchaseAmount,
                balance: prev.balance - transaction.balance
            }));

            alert('Transaction deleted successfully');
        }
    }, []);

    const handlePrintTransaction = useCallback((transaction) => {
        console.log('Print transaction:', transaction);
        alert(`Printing invoice ${transaction.invoiceNo}`);
    }, []);

    const handleShareTransaction = useCallback((transaction) => {
        console.log('Share transaction:', transaction);
        alert(`Sharing invoice ${transaction.invoiceNo}`);
    }, []);

    // Render Sales Form View
    if (currentView === 'sale') {
        return (
            <div className="sales-invoices-wrapper">
                {/* Header with Back Button */}
                <div className="sales-form-header bg-white border-bottom">
                    <Container fluid className="px-4">
                        <Row className="align-items-center py-3">
                            <Col>
                                <Button
                                    variant="outline-secondary"
                                    onClick={handleBackToList}
                                    className="me-3"
                                >
                                    <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                                    Back to Transactions
                                </Button>
                                <span className="page-title-text">Create New Sale</span>
                            </Col>
                        </Row>
                    </Container>
                </div>

                {/* Sales Form */}
                <SalesForm
                    onSave={handleSaleFormSave}
                    onCancel={handleBackToList}
                />
            </div>
        );
    }

    // Render Purchase Form View
    if (currentView === 'purchase') {
        return (
            <div className="sales-invoices-wrapper">
                {/* Header with Back Button */}
                <div className="sales-form-header bg-white border-bottom">
                    <Container fluid className="px-4">
                        <Row className="align-items-center py-3">
                            <Col>
                                <Button
                                    variant="outline-secondary"
                                    onClick={handleBackToList}
                                    className="me-3"
                                >
                                    <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                                    Back to Transactions
                                </Button>
                                <span className="page-title-text">Create New Purchase</span>
                            </Col>
                        </Row>
                    </Container>
                </div>

                {/* Purchase Form */}
                <PurchaseForm
                    onSave={handlePurchaseFormSave}
                    onCancel={handleBackToList}
                />
            </div>
        );
    }

    // Render Transactions List View (Default)
    return (
        <div className="sales-invoices-wrapper">
            <SalesInvoicesHeader
                searchTerm={topSearchTerm}
                onSearchChange={handleSearchChange}
                onAddSale={handleAddSale}
                onAddPurchase={handleAddPurchase}
                onMoreOptions={handleMoreOptions}
                onSettings={handleSettings}
            />

            <SalesInvoicesPageTitle onAddSale={handleAddSale} />

            <SalesInvoicesFilter
                dateRange={dateRange}
                startDate={startDate}
                endDate={endDate}
                selectedFirm={selectedFirm}
                dateRangeOptions={dateRangeOptions}
                firmOptions={firmOptions}
                onDateRangeChange={handleDateRangeChange}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
                onFirmChange={setSelectedFirm}
                onExcelExport={handleExcelExport}
                onPrint={handlePrint}
            />

            <SalesInvoicesSummary summary={summary} />

            <SalesInvoicesTable
                transactions={filteredTransactions}
                onViewTransaction={handleViewTransaction}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onPrintTransaction={handlePrintTransaction}
                onShareTransaction={handleShareTransaction}
                categories={categories}
                onAddItem={handleAddItem}
                inventoryItems={inventoryItems}
            />
        </div>
    );
}

export default SalesInvoices;