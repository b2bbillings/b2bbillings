import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useParams } from 'react-router-dom';

// Import components
import SalesInvoicesHeader from './SalesInvoice/SalesInvoicesHeader';
import SalesInvoicesPageTitle from './SalesInvoice/SalesInvoicesPageTitle';
import SalesInvoicesFilter from './SalesInvoice/SalesInvoicesFilter';
import SalesInvoicesSummary from './SalesInvoice/SalesInvoicesSummary';
import SalesInvoicesTable from './SalesInvoice/SalesInvoicesTable';
import SalesForm from './SalesInvoice/SalesForm';

// Import API services
import salesService from '../../../services/salesService';
import itemService from '../../../services/itemService';
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

function SalesInvoices({ companyId: propCompanyId }) {
    const { companyId: paramCompanyId } = useParams();
    const companyId = propCompanyId || paramCompanyId;

    // State management
    const [currentView, setCurrentView] = useState('list');
    const [editingSale, setEditingSale] = useState(null);
    const [dateRange, setDateRange] = useState('This Month');
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
    const [selectedFirm, setSelectedFirm] = useState('All Firms');
    const [topSearchTerm, setTopSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    // Debounced search term for better performance
    const debouncedSearchTerm = useDebounce(topSearchTerm, 300);

    // Data state
    const [transactions, setTransactions] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);

    // Categories
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

    // Enhanced summary calculation with better metrics
    const summary = useMemo(() => {
        const salesTransactions = transactions.filter(t => t.transaction === 'Sale' || t.transaction === 'GST Invoice');
        const totalSales = salesTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalReceived = salesTransactions.reduce((sum, t) => sum + ((t.amount || 0) - (t.balance || 0)), 0);
        const totalBalance = salesTransactions.reduce((sum, t) => sum + (t.balance || 0), 0);

        // Calculate today's sales
        const today = new Date().toDateString();
        const todaysSales = salesTransactions
            .filter(t => new Date(t.date).toDateString() === today)
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        // Calculate average sale value
        const avgSaleValue = salesTransactions.length > 0 ? totalSales / salesTransactions.length : 0;

        // Mock growth percentage (you can implement actual calculation)
        const growthPercentage = Math.random() * 20 - 10; // Random between -10 and +10

        return {
            totalSalesAmount: totalSales,
            received: totalReceived,
            balance: totalBalance,
            todaysSales: todaysSales,
            totalInvoices: salesTransactions.length,
            avgSaleValue: avgSaleValue,
            growthPercentage: growthPercentage,
            paidInvoices: salesTransactions.filter(t => (t.balance || 0) === 0).length,
            pendingInvoices: salesTransactions.filter(t => (t.balance || 0) > 0).length
        };
    }, [transactions]);

    // Options
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
        'All Firms'
    ], []);

    // Filtered transactions
    const filteredTransactions = useMemo(() => {
        if (!debouncedSearchTerm) return transactions;

        const searchLower = debouncedSearchTerm.toLowerCase();
        return transactions.filter(transaction =>
            (transaction.partyName || '').toLowerCase().includes(searchLower) ||
            (transaction.invoiceNo || '').toLowerCase().includes(searchLower) ||
            (transaction.partyPhone || '').includes(searchLower)
        );
    }, [transactions, debouncedSearchTerm]);

    // Load data on mount
    useEffect(() => {
        if (companyId) {
            loadSalesData();
            loadInventoryItems();
        }
    }, [companyId, startDate, endDate]);

    // API functions
    const loadSalesData = async () => {
        try {
            setLoading(true);
            console.log('📊 Loading sales data for company:', companyId);

            const filters = {
                dateFrom: startDate.toISOString().split('T')[0],
                dateTo: endDate.toISOString().split('T')[0]
            };

            const response = await salesService.getInvoices(companyId, filters);

            if (response.success && response.data && response.data.sales) {
                const transformedTransactions = response.data.sales.map(sale =>
                    salesService.transformToFrontendFormat(sale)
                );
                setTransactions(transformedTransactions);
                console.log('✅ Loaded sales data:', transformedTransactions);
            } else {
                console.warn('⚠️ No sales data found');
                setTransactions([]);
            }

        } catch (error) {
            console.error('❌ Error loading sales data:', error);
            setTransactions([]);
            if (!error.message.includes('fetch') && !error.message.includes('Failed to fetch')) {
                alert('Failed to load sales data: ' + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const loadInventoryItems = async () => {
        try {
            console.log('📦 Loading inventory items for company:', companyId);
            const response = await itemService.getItems(companyId);

            if (response.success && response.data && response.data.items) {
                setInventoryItems(response.data.items);
                console.log('✅ Loaded inventory items:', response.data.items);
            } else {
                console.warn('⚠️ No inventory items found');
                setInventoryItems([]);
            }
        } catch (error) {
            console.error('❌ Error loading inventory items:', error);
            setInventoryItems([]);
        }
    };

    // Event handlers
    const handleDateRangeChange = useCallback((range) => {
        setDateRange(range);
        console.log('📅 Date range changed to:', range);
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

    const handleCreateSale = useCallback(() => {
        setEditingSale(null);
        setCurrentView('sale');
    }, []);

    const handleBackToList = useCallback(() => {
        setCurrentView('list');
        setEditingSale(null);
    }, []);

    const handleSaleFormSave = useCallback(async (saleData) => {
        console.log('💾 Saving sale data:', saleData);

        try {
            setLoading(true);
            const saleDataWithCompany = {
                ...saleData,
                companyId: companyId
            };

            let response;
            if (editingSale) {
                console.log('📝 Updating existing sale:', editingSale.id);
                response = await salesService.updateInvoice(editingSale.id, saleDataWithCompany);
            } else {
                console.log('📄 Creating new sale');
                response = await salesService.createInvoice(saleDataWithCompany);
            }

            if (response.success) {
                console.log('✅ Sale saved successfully:', response);
                const transformedSale = salesService.transformToFrontendFormat(response.data.sale);

                if (editingSale) {
                    setTransactions(prev =>
                        prev.map(t => t.id === editingSale.id ? transformedSale : t)
                    );
                    alert(`Invoice ${transformedSale.invoiceNo} updated successfully!`);
                } else {
                    setTransactions(prev => [transformedSale, ...prev]);
                    alert(`Invoice ${transformedSale.invoiceNo} created successfully!`);
                }

                setCurrentView('list');
                setEditingSale(null);
            } else {
                throw new Error(response.message || 'Failed to save sale');
            }

        } catch (error) {
            console.error('❌ Error saving sale:', error);
            alert('Error saving invoice: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [editingSale, companyId]);

    const handleAddItem = useCallback(async (productData) => {
        try {
            console.log('📦 Adding item to inventory:', productData);
            const response = await itemService.createItem(companyId, productData);

            if (response.success) {
                setInventoryItems(prev => [...prev, response.data]);
                console.log('✅ Item added successfully:', response.data);

                return {
                    success: true,
                    data: response.data,
                    message: `Item "${productData.name}" added successfully`
                };
            } else {
                throw new Error(response.message || 'Failed to add item');
            }

        } catch (error) {
            console.error('❌ Error adding item:', error);
            return {
                success: false,
                error: error.message,
                message: 'Error adding item to inventory'
            };
        }
    }, [companyId]);

    const handleSearchChange = useCallback((e) => {
        setTopSearchTerm(e.target.value);
    }, []);

    // Transaction handlers
    const handleViewTransaction = useCallback((transaction) => {
        console.log('👁️ View transaction:', transaction);
        alert(`Viewing Invoice: ${transaction.invoiceNo}\nCustomer: ${transaction.partyName}\nAmount: ₹${(transaction.amount || 0).toLocaleString()}`);
    }, []);

    const handleEditTransaction = useCallback((transaction) => {
        console.log('✏️ Edit transaction:', transaction);
        setEditingSale(transaction.originalSale || transaction);
        setCurrentView('sale');
    }, []);

    const handleDeleteTransaction = useCallback(async (transaction) => {
        if (window.confirm(`Are you sure you want to delete invoice ${transaction.invoiceNo}?\n\nThis action cannot be undone.`)) {
            try {
                setLoading(true);
                console.log('🗑️ Deleting transaction:', transaction.id);

                const response = await salesService.deleteInvoice(transaction.id);

                if (response.success) {
                    setTransactions(prev => prev.filter(t => t.id !== transaction.id));
                    alert(`Invoice ${transaction.invoiceNo} deleted successfully`);
                } else {
                    throw new Error(response.message || 'Failed to delete invoice');
                }
            } catch (error) {
                console.error('❌ Error deleting transaction:', error);
                alert('Error deleting invoice: ' + error.message);
            } finally {
                setLoading(false);
            }
        }
    }, []);

    const handlePrintTransaction = useCallback((transaction) => {
        console.log('🖨️ Print transaction:', transaction);
        alert(`Printing invoice ${transaction.invoiceNo}...`);
    }, []);

    const handleShareTransaction = useCallback((transaction) => {
        console.log('📤 Share transaction:', transaction);
        const shareText = `Invoice ${transaction.invoiceNo}\nCustomer: ${transaction.partyName}\nAmount: ₹${(transaction.amount || 0).toLocaleString()}\nStatus: ${transaction.status}`;

        if (navigator.share) {
            navigator.share({
                title: `Invoice ${transaction.invoiceNo}`,
                text: shareText,
                url: window.location.href
            }).catch(err => console.log('Error sharing:', err));
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(shareText).then(() => {
                alert('Invoice details copied to clipboard!');
            }).catch(() => {
                alert(`Invoice Details:\n${shareText}`);
            });
        } else {
            alert(`Invoice Details:\n${shareText}`);
        }
    }, []);

    // Utility handlers
    const handleMoreOptions = useCallback(() => {
        console.log('⚙️ More options clicked');
    }, []);

    const handleSettings = useCallback(() => {
        console.log('⚙️ Settings clicked');
    }, []);

    const handleExcelExport = useCallback(() => {
        console.log('📊 Excel Export clicked');
        alert('Excel export feature coming soon!');
    }, []);

    const handlePrint = useCallback(() => {
        console.log('🖨️ Print clicked');
        window.print();
    }, []);

    // Render Sales Form View
    if (currentView === 'sale') {
        return (
            <div className="sales-invoices-wrapper">
                <div className="sales-form-header bg-white border-bottom sticky-top">
                    <Container fluid className="px-4">
                        <Row className="align-items-center py-3">
                            <Col>
                                <Button
                                    variant="outline-secondary"
                                    onClick={handleBackToList}
                                    className="me-3"
                                    disabled={loading}
                                >
                                    <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                                    Back to Invoices
                                </Button>
                                <span className="page-title-text fw-semibold">
                                    {editingSale ? `Edit Invoice ${editingSale.invoiceNo}` : 'Create New Sale Invoice'}
                                </span>
                            </Col>
                        </Row>
                    </Container>
                </div>

                <SalesForm
                    editingSale={editingSale}
                    onSave={handleSaleFormSave}
                    onCancel={handleBackToList}
                    onExit={handleBackToList}
                    companyId={companyId}
                    inventoryItems={inventoryItems}
                    categories={categories}
                    onAddItem={handleAddItem}
                    loading={loading}
                />
            </div>
        );
    }

    // Render Main Sales Invoices View with Compact Sidebar Layout
    return (
        <div className="sales-invoices-wrapper">
            {/* Header Section */}
            <SalesInvoicesHeader
                searchTerm={topSearchTerm}
                onSearchChange={handleSearchChange}
                onAddSale={handleCreateSale}
                onMoreOptions={handleMoreOptions}
                onSettings={handleSettings}
                companyId={companyId}
            />

            <SalesInvoicesPageTitle
                onAddSale={handleCreateSale}
                invoiceCount={transactions.length}
                companyId={companyId}
            />

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
                resultCount={filteredTransactions.length}
            />

            {/* Main Content Area with Sidebar Layout */}
            <Container fluid className="px-4 py-3">
                <Row className="g-3">
                    {/* Compact Left Sidebar - Summary */}
                    <Col xl={2} lg={3} md={3} sm={12} className="sidebar-col">
                        <SalesInvoicesSummary
                            summary={summary}
                            loading={loading}
                            dateRange={dateRange}
                        />
                    </Col>

                    {/* Right Content - Table taking most space */}
                    <Col xl={10} lg={9} md={9} sm={12} className="content-col">
                        <SalesInvoicesTable
                            transactions={filteredTransactions}
                            onCreateInvoice={handleCreateSale}
                            onViewTransaction={handleViewTransaction}
                            onEditTransaction={handleEditTransaction}
                            onDeleteTransaction={handleDeleteTransaction}
                            onPrintTransaction={handlePrintTransaction}
                            onShareTransaction={handleShareTransaction}
                            categories={categories}
                            onAddItem={handleAddItem}
                            inventoryItems={inventoryItems}
                            loading={loading}
                            companyId={companyId}
                            searchTerm={debouncedSearchTerm}
                        />
                    </Col>
                </Row>
            </Container>

            {/* Enhanced Styles */}
            <style jsx>{`
                .sales-invoices-wrapper {
                    background-color: #f8f9fa;
                    min-height: 100vh;
                }
                
                .sales-form-header {
                    z-index: 1020;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                .page-title-text {
                    font-size: 1.1rem;
                    color: #495057;
                }

                .sidebar-col {
                    padding-right: 0.75rem;
                }

                .content-col {
                    padding-left: 0.75rem;
                }

                /* Enhanced responsive design */
                @media (max-width: 1200px) {
                    .sidebar-col {
                        padding-right: 0.5rem;
                    }
                    
                    .content-col {
                        padding-left: 0.5rem;
                    }
                }

                @media (max-width: 992px) {
                    .sidebar-col {
                        padding-right: 0;
                        margin-bottom: 1rem;
                    }
                    
                    .content-col {
                        padding-left: 0;
                    }
                }
                
                @media (max-width: 768px) {
                    .page-title-text {
                        font-size: 1rem;
                    }

                    .sidebar-col,
                    .content-col {
                        padding-left: 0;
                        padding-right: 0;
                    }
                }

                /* Smooth transitions */
                .sidebar-col,
                .content-col {
                    transition: all 0.3s ease;
                }

                /* Loading states */
                .sales-invoices-wrapper.loading {
                    opacity: 0.7;
                    pointer-events: none;
                }

                /* Enhanced Container */
                .container-fluid {
                    max-width: 100%;
                    margin: 0 auto;
                }

                /* Better spacing for main content */
                .g-3 {
                    --bs-gutter-x: 1rem;
                    --bs-gutter-y: 1rem;
                }

                @media (min-width: 1400px) {
                    .g-3 {
                        --bs-gutter-x: 1.5rem;
                    }
                    
                    .sidebar-col {
                        padding-right: 1rem;
                    }
                    
                    .content-col {
                        padding-left: 1rem;
                    }
                }
            `}</style>
        </div>
    );
}

export default SalesInvoices;