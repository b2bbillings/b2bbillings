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
import saleOrderService from '../../../services/saleOrderService';
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

function SalesInvoices({
    companyId: propCompanyId,
    currentCompany,
    view = 'invoices',
    mode = 'invoices',
    pageTitle = 'Sales Invoices',
    documentType = 'invoice',
    onAddSale,
    onEditSale,
    onViewChange,
    onNavigate,
    isOnline = true,
    addToast
}) {
    const { companyId: paramCompanyId } = useParams();
    const companyId = propCompanyId || paramCompanyId;

    // Enhanced mode detection logic
    const isQuotationsMode = useMemo(() => {
        const modes = [view, mode, documentType];
        return modes.some(m => m === 'quotations' || m === 'quotation');
    }, [view, mode, documentType]);

    // Dynamic field labels based on mode
    const labels = useMemo(() => {
        return isQuotationsMode
            ? {
                documentName: 'Quotation',
                documentNamePlural: 'Quotations',
                documentAction: 'Create Quotation',
                editAction: 'Edit Quotation',
                backToList: 'Back to Quotations',
                createNew: 'Create New Quotation',
                pageTitle: 'Quotations Management'
            }
            : {
                documentName: 'Invoice',
                documentNamePlural: 'Invoices',
                documentAction: 'Create Invoice',
                editAction: 'Edit Invoice',
                backToList: 'Back to Invoices',
                createNew: 'Create New Sale Invoice',
                pageTitle: 'Sales Invoices Management'
            };
    }, [isQuotationsMode]);

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

    // Enhanced summary calculation with mode awareness
    const summary = useMemo(() => {
        // Filter transactions based on document type
        const relevantTransactions = isQuotationsMode
            ? transactions.filter(t =>
                t.documentType === 'quotation' ||
                t.transaction === 'Quotation' ||
                t.type === 'quotation'
            )
            : transactions.filter(t =>
                t.transaction === 'Sale' ||
                t.transaction === 'GST Invoice' ||
                t.documentType === 'invoice' ||
                t.type === 'invoice'
            );

        const totalAmount = relevantTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalReceived = relevantTransactions.reduce((sum, t) => sum + ((t.amount || 0) - (t.balance || 0)), 0);
        const totalBalance = relevantTransactions.reduce((sum, t) => sum + (t.balance || 0), 0);

        // Calculate today's transactions
        const today = new Date().toDateString();
        const todaysAmount = relevantTransactions
            .filter(t => new Date(t.date).toDateString() === today)
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        // Calculate average value
        const avgValue = relevantTransactions.length > 0 ? totalAmount / relevantTransactions.length : 0;

        // Mock growth percentage (implement actual calculation based on your needs)
        const growthPercentage = Math.random() * 20 - 10; // Random between -10 and +10

        // Mode-specific metrics
        if (isQuotationsMode) {
            const approvedQuotations = relevantTransactions.filter(t =>
                t.status === 'approved' ||
                t.quotationStatus === 'approved'
            ).length;

            const pendingQuotations = relevantTransactions.filter(t =>
                t.status === 'pending' ||
                t.quotationStatus === 'pending' ||
                t.quotationStatus === 'draft'
            ).length;

            const convertedQuotations = relevantTransactions.filter(t =>
                t.convertedToInvoice === true
            ).length;

            const conversionRate = relevantTransactions.length > 0 ? (convertedQuotations / relevantTransactions.length) * 100 : 0;

            return {
                totalAmount: totalAmount,
                received: totalReceived,
                balance: totalBalance,
                todaysAmount: todaysAmount,
                totalDocuments: relevantTransactions.length,
                avgValue: avgValue,
                growthPercentage: growthPercentage,
                approvedDocuments: approvedQuotations,
                pendingDocuments: pendingQuotations,
                convertedQuotations: convertedQuotations,
                conversionRate: conversionRate
            };
        } else {
            // Invoice-specific metrics
            const paidInvoices = relevantTransactions.filter(t => (t.balance || 0) === 0).length;
            const pendingInvoices = relevantTransactions.filter(t => (t.balance || 0) > 0).length;

            return {
                totalSalesAmount: totalAmount,
                received: totalReceived,
                balance: totalBalance,
                todaysSales: todaysAmount,
                totalInvoices: relevantTransactions.length,
                avgSaleValue: avgValue,
                growthPercentage: growthPercentage,
                paidInvoices: paidInvoices,
                pendingInvoices: pendingInvoices
            };
        }
    }, [transactions, isQuotationsMode]);

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
            (transaction.quotationNumber || '').toLowerCase().includes(searchLower) ||
            (transaction.partyPhone || '').includes(searchLower)
        );
    }, [transactions, debouncedSearchTerm]);

    // Load data on mount
    useEffect(() => {
        if (companyId) {
            loadSalesData();
            loadInventoryItems();
        }
    }, [companyId, startDate, endDate, isQuotationsMode]);

    const loadSalesData = async () => {
        try {
            setLoading(true);

            const filters = {
                dateFrom: startDate.toISOString().split('T')[0],
                dateTo: endDate.toISOString().split('T')[0]
            };

            let response;

            if (isQuotationsMode) {
                try {
                    response = await saleOrderService.getQuotations(companyId, filters);
                } catch (serviceError) {
                    throw serviceError;
                }
            } else {
                response = await salesService.getInvoices(companyId, filters);
            }

            if (response.success && response.data) {
                // Enhanced data extraction debugging
                let dataArray = [];

                if (isQuotationsMode) {
                    if (response.data.quotations) {
                        if (response.data.quotations.salesOrders) {
                            dataArray = response.data.quotations.salesOrders;
                        } else if (Array.isArray(response.data.quotations)) {
                            dataArray = response.data.quotations;
                        }
                    } else if (response.data.salesOrders) {
                        dataArray = response.data.salesOrders;
                    } else if (Array.isArray(response.data)) {
                        dataArray = response.data;
                    } else {
                        // Try other possible structures
                        dataArray = response.data.data ||
                            response.data.orders ||
                            response.data.results ||
                            [];
                    }
                } else {
                    // For sales invoices
                    dataArray = response.data.salesOrders ||
                        response.data.invoices ||
                        response.data.sales ||
                        response.data.data ||
                        [];
                }

                // Add safety check
                if (!Array.isArray(dataArray)) {
                    setTransactions([]);
                    return;
                }

                if (dataArray.length === 0) {
                    setTransactions([]);
                    return;
                }

                // Enhanced transformation
                const transformedTransactions = dataArray.map((item, index) => {
                    if (isQuotationsMode) {
                        return {
                            id: item._id || item.id,
                            invoiceNo: item.orderNo ||
                                item.orderNumber ||
                                item.quotationNumber ||
                                `QUO-${item._id?.slice(-6)}`,
                            quotationNumber: item.orderNo ||
                                item.orderNumber ||
                                item.quotationNumber,
                            partyName: item.customer?.name ||
                                item.partyName ||
                                item.customerName ||
                                item.customer?.businessName ||
                                'Walk-in Customer',
                            partyPhone: item.customer?.mobile ||
                                item.partyPhone ||
                                item.customerMobile ||
                                item.customer?.phone,
                            amount: item.totals?.finalTotal ||
                                item.totals?.totalAmount ||
                                item.amount ||
                                0,
                            balance: item.payment?.pendingAmount ||
                                item.balanceAmount ||
                                item.balance ||
                                item.totals?.finalTotal ||
                                item.amount ||
                                0,
                            date: item.orderDate ||
                                item.quotationDate ||
                                item.date ||
                                item.createdAt,
                            transaction: 'Quotation',
                            documentType: 'quotation',
                            status: item.status || 'draft',
                            quotationStatus: item.status || 'draft',
                            paymentType: item.paymentType ||
                                item.payment?.method ||
                                'Cash',
                            cgst: item.totals?.totalCgstAmount ||
                                item.totals?.totalCGST ||
                                0,
                            sgst: item.totals?.totalSgstAmount ||
                                item.totals?.totalSGST ||
                                0,
                            gstEnabled: item.gstEnabled !== undefined ? item.gstEnabled : true,
                            orderType: item.orderType || 'quotation',
                            convertedToInvoice: item.convertedToInvoice || false,
                            validUntil: item.validUntil,
                            priority: item.priority || 'normal',
                            originalSale: item
                        };
                    } else {
                        return salesService.transformToFrontendFormat ?
                            salesService.transformToFrontendFormat(item) :
                            item;
                    }
                });

                setTransactions(transformedTransactions);
            } else {
                setTransactions([]);
            }

        } catch (error) {
            setTransactions([]);

            if (!error.message.includes('fetch') && !error.message.includes('Failed to fetch')) {
                const errorMessage = `Failed to load ${isQuotationsMode ? 'quotations' : 'sales'} data: ${error.message}`;
                if (addToast) {
                    addToast(errorMessage, 'error');
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const loadInventoryItems = async () => {
        try {
            const response = await itemService.getItems(companyId);

            if (response.success && response.data && response.data.items) {
                setInventoryItems(response.data.items);
            } else {
                setInventoryItems([]);
            }
        } catch (error) {
            setInventoryItems([]);
        }
    };

    // Event handlers
    const handleDateRangeChange = useCallback((range) => {
        setDateRange(range);
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

    // Enhanced create handler
    const handleCreateSale = useCallback(() => {
        setEditingSale(null);
        setCurrentView('sale');

        // Call parent handler if provided
        if (onAddSale) {
            onAddSale();
        }
    }, [onAddSale]);

    const handleBackToList = useCallback(() => {
        setCurrentView('list');
        setEditingSale(null);
    }, []);

    // Enhanced save handler with better error handling
    const handleSaleFormSave = useCallback(async (saleData) => {
        try {
            setLoading(true);
            const documentDataWithCompany = {
                ...saleData,
                companyId: companyId,
                documentType: isQuotationsMode ? 'quotation' : 'invoice'
            };

            let response;

            if (editingSale) {
                if (isQuotationsMode) {
                    response = await saleOrderService.updateSalesOrder(editingSale.id, documentDataWithCompany);
                } else {
                    response = await salesService.updateInvoice(editingSale.id, documentDataWithCompany);
                }
            } else {
                if (isQuotationsMode) {
                    response = await saleOrderService.createSalesOrder({
                        ...documentDataWithCompany,
                        orderType: 'quotation'
                    });
                } else {
                    response = await salesService.createInvoice(documentDataWithCompany);
                }
            }

            if (response.success) {
                const transformedDocument = isQuotationsMode
                    ? {
                        ...response.data.quotation,
                        documentType: 'quotation',
                        transaction: 'Quotation'
                    }
                    : (salesService.transformToFrontendFormat ?
                        salesService.transformToFrontendFormat(response.data.sale) :
                        response.data.sale);

                const documentNumber = transformedDocument.quotationNumber || transformedDocument.invoiceNo;

                if (editingSale) {
                    setTransactions(prev =>
                        prev.map(t => t.id === editingSale.id ? transformedDocument : t)
                    );
                    const message = `${labels.documentName} ${documentNumber} updated successfully!`;
                    if (addToast) {
                        addToast(message, 'success');
                    }
                } else {
                    setTransactions(prev => [transformedDocument, ...prev]);
                    const message = `${labels.documentName} ${documentNumber} created successfully!`;
                    if (addToast) {
                        addToast(message, 'success');
                    }
                }

                setCurrentView('list');
                setEditingSale(null);
            } else {
                throw new Error(response.message || `Failed to save ${labels.documentName.toLowerCase()}`);
            }

        } catch (error) {
            const errorMessage = `Error saving ${labels.documentName.toLowerCase()}: ${error.message}`;
            if (addToast) {
                addToast(errorMessage, 'error');
            }
        } finally {
            setLoading(false);
        }
    }, [editingSale, companyId, labels, isQuotationsMode, addToast]);

    const handleAddItem = useCallback(async (productData) => {
        try {
            const response = await itemService.createItem(companyId, productData);

            if (response.success) {
                setInventoryItems(prev => [...prev, response.data]);

                return {
                    success: true,
                    data: response.data,
                    message: `Item "${productData.name}" added successfully`
                };
            } else {
                throw new Error(response.message || 'Failed to add item');
            }

        } catch (error) {
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
        const documentNumber = transaction.quotationNumber || transaction.invoiceNo;
        const amount = (transaction.amount || 0).toLocaleString();

        if (addToast) {
            addToast(`Viewing ${labels.documentName} ${documentNumber}`, 'info');
        }

        if (onEditSale) {
            onEditSale(transaction.id);
        }
    }, [labels.documentName, addToast, onEditSale]);

    const handleEditTransaction = useCallback((transaction) => {
        setEditingSale(transaction.originalSale || transaction);
        setCurrentView('sale');

        if (onEditSale) {
            onEditSale(transaction.id);
        }
    }, [onEditSale]);

    const handleDeleteTransaction = useCallback(async (transaction) => {
        const documentNumber = transaction.quotationNumber || transaction.invoiceNo;
        const confirmMessage = `Are you sure you want to delete ${labels.documentName.toLowerCase()} ${documentNumber}?\n\nThis action cannot be undone.`;

        if (window.confirm(confirmMessage)) {
            try {
                setLoading(true);

                let response;
                if (isQuotationsMode) {
                    response = await saleOrderService.deleteSalesOrder(transaction.id);
                } else {
                    response = await salesService.deleteInvoice(transaction.id);
                }

                if (response.success) {
                    setTransactions(prev => prev.filter(t => t.id !== transaction.id));
                    const message = `${labels.documentName} ${documentNumber} deleted successfully`;
                    if (addToast) {
                        addToast(message, 'success');
                    }
                } else {
                    throw new Error(response.message || `Failed to delete ${labels.documentName.toLowerCase()}`);
                }
            } catch (error) {
                const errorMessage = `Error deleting ${labels.documentName.toLowerCase()}: ${error.message}`;
                if (addToast) {
                    addToast(errorMessage, 'error');
                }
            } finally {
                setLoading(false);
            }
        }
    }, [labels.documentName, isQuotationsMode, addToast]);

    // Convert to Invoice handler
    const handleConvertTransaction = useCallback(async (transaction) => {
        const documentNumber = transaction.quotationNumber || transaction.invoiceNo;
        const confirmMessage = `Convert ${labels.documentName.toLowerCase()} ${documentNumber} to Sales Invoice?\n\nThis will create a new invoice and mark the ${labels.documentName.toLowerCase()} as converted.`;

        if (window.confirm(confirmMessage)) {
            try {
                setLoading(true);

                const conversionData = {
                    userId: 'current-user-id',
                    companyId: companyId,
                    originalOrderType: transaction.documentType || 'quotation',
                    convertedFrom: 'quotation_table'
                };

                const response = await saleOrderService.convertToInvoice(transaction.id, conversionData);

                if (response.success) {
                    // Update the transaction in the list to show it's converted
                    setTransactions(prev =>
                        prev.map(t =>
                            t.id === transaction.id
                                ? {
                                    ...t,
                                    convertedToInvoice: true,
                                    status: 'converted',
                                    quotationStatus: 'converted',
                                    invoiceId: response.data.invoice?._id || response.data.invoice?.id,
                                    invoiceNumber: response.data.invoice?.invoiceNumber || response.data.invoice?.invoiceNo
                                }
                                : t
                        )
                    );

                    if (addToast) {
                        addToast(`${labels.documentName} converted successfully!`, 'success');
                    }

                    // Optionally reload data to get fresh state
                    setTimeout(() => {
                        loadSalesData();
                    }, 1000);

                } else {
                    throw new Error(response.error || `Failed to convert ${labels.documentName.toLowerCase()}`);
                }
            } catch (error) {
                const errorMessage = `Error converting ${labels.documentName.toLowerCase()}: ${error.message}`;
                if (addToast) {
                    addToast(errorMessage, 'error');
                }
            } finally {
                setLoading(false);
            }
        }
    }, [labels.documentName, companyId, addToast, loadSalesData]);

    const handlePrintTransaction = useCallback((transaction) => {
        const documentNumber = transaction.quotationNumber || transaction.invoiceNo;
        const message = `Printing ${labels.documentName.toLowerCase()} ${documentNumber}...`;
        if (addToast) {
            addToast(message, 'info');
        }
    }, [labels.documentName, addToast]);

    const handleShareTransaction = useCallback((transaction) => {
        const documentNumber = transaction.quotationNumber || transaction.invoiceNo;
        const shareText = `${labels.documentName} ${documentNumber}\nCustomer: ${transaction.partyName}\nAmount: ₹${(transaction.amount || 0).toLocaleString()}\nStatus: ${transaction.status}`;

        if (navigator.share) {
            navigator.share({
                title: `${labels.documentName} ${documentNumber}`,
                text: shareText,
                url: window.location.href
            }).catch(err => console.log('Error sharing:', err));
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(shareText).then(() => {
                const message = `${labels.documentName} details copied to clipboard!`;
                if (addToast) {
                    addToast(message, 'success');
                }
            }).catch(() => {
                console.log(`${labels.documentName} Details:\n${shareText}`);
            });
        } else {
            console.log(`${labels.documentName} Details:\n${shareText}`);
        }
    }, [labels.documentName, addToast]);

    // Utility handlers
    const handleMoreOptions = useCallback(() => {
        // More options functionality
    }, []);

    const handleSettings = useCallback(() => {
        // Settings functionality
    }, []);

    const handleExcelExport = useCallback(() => {
        const message = `Excel export for ${labels.documentNamePlural.toLowerCase()} coming soon!`;
        if (addToast) {
            addToast(message, 'info');
        }
    }, [labels.documentNamePlural, addToast]);

    const handlePrint = useCallback(() => {
        window.print();
    }, []);

    // Light color scheme 
    const colors = useMemo(() => {
        return isQuotationsMode
            ? {
                primary: '#0ea5e9', // Light sky blue for quotations
                primaryRgb: '14, 165, 233',
                secondary: '#38bdf8',
                gradient: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)'
            }
            : {
                primary: '#6366f1', // Light indigo for invoices  
                primaryRgb: '99, 102, 241',
                secondary: '#8b5cf6',
                gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
            };
    }, [isQuotationsMode]);

    // Render Sales Form View
    if (currentView === 'sale') {
        return (
            <div className="sales-invoices-wrapper" data-mode={isQuotationsMode ? 'quotations' : 'invoices'}>
                <div className="sales-form-header bg-white border-bottom sticky-top">
                    <Container fluid className="px-4">
                        <Row className="align-items-center py-3">
                            <Col>
                                <Button
                                    variant="outline-secondary"
                                    onClick={handleBackToList}
                                    className="me-3 back-btn"
                                    disabled={loading}
                                >
                                    <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                                    {labels.backToList}
                                </Button>
                                <span className="page-title-text fw-semibold">
                                    {editingSale
                                        ? `${labels.editAction} ${editingSale.quotationNumber || editingSale.invoiceNo}`
                                        : labels.createNew
                                    }
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
                    mode={isQuotationsMode ? 'quotations' : 'invoices'}
                    documentType={isQuotationsMode ? 'quotation' : 'invoice'}
                    formType={isQuotationsMode ? 'quotation' : 'sales'}
                    pageTitle={labels.pageTitle}
                />
            </div>
        );
    }

    // Render Main Sales Invoices View with Compact Sidebar Layout
    return (
        <div className="sales-invoices-wrapper" data-mode={isQuotationsMode ? 'quotations' : 'invoices'}>
            {/* Header Section */}
            <SalesInvoicesHeader
                searchTerm={topSearchTerm}
                onSearchChange={handleSearchChange}
                onAddSale={handleCreateSale}
                onMoreOptions={handleMoreOptions}
                onSettings={handleSettings}
                companyId={companyId}
                mode={isQuotationsMode ? 'quotations' : 'invoices'}
                documentType={isQuotationsMode ? 'quotation' : 'invoice'}
                pageTitle={labels.pageTitle}
            />

            <SalesInvoicesPageTitle
                onAddSale={handleCreateSale}
                invoiceCount={transactions.length}
                companyId={companyId}
                mode={isQuotationsMode ? 'quotations' : 'invoices'}
                documentType={isQuotationsMode ? 'quotation' : 'invoice'}
                title={pageTitle || labels.documentNamePlural}
                subtitle={isQuotationsMode ? 'Create and manage quotations' : 'Manage your sales transactions'}
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
                mode={isQuotationsMode ? 'quotations' : 'invoices'}
                documentType={isQuotationsMode ? 'quotation' : 'invoice'}
                pageTitle={pageTitle || labels.documentNamePlural}
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
                            mode={isQuotationsMode ? 'quotations' : 'invoices'}
                            documentType={isQuotationsMode ? 'quotation' : 'invoice'}
                            isQuotationsMode={isQuotationsMode}
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
                            onConvertTransaction={handleConvertTransaction}
                            categories={categories}
                            onAddItem={handleAddItem}
                            inventoryItems={inventoryItems}
                            loading={loading}
                            companyId={companyId}
                            searchTerm={debouncedSearchTerm}
                            mode={isQuotationsMode ? 'quotations' : 'invoices'}
                            documentType={isQuotationsMode ? 'quotation' : 'invoice'}
                            isQuotationsMode={isQuotationsMode}
                            labels={labels}
                        />
                    </Col>
                </Row>
            </Container>

            {/* Enhanced styles with mode awareness */}
            <style jsx>{`
                .sales-invoices-wrapper {
                    background-color: #f8f9fa;
                    min-height: 100vh;
                    --primary-color: ${colors.primary};
                    --primary-rgb: ${colors.primaryRgb};
                    --secondary-color: ${colors.secondary};
                    --primary-gradient: ${colors.gradient};
                }
                
                .sales-form-header {
                    z-index: 1020;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    border-bottom: 2px solid var(--primary-color) !important;
                }
                
                .page-title-text {
                    font-size: 1.1rem;
                    color: var(--primary-color);
                    font-weight: 600;
                }

                .back-btn {
                    border-color: var(--primary-color);
                    color: var(--primary-color);
                    transition: all 0.3s ease;
                }

                .back-btn:hover {
                    background: var(--primary-gradient);
                    border-color: var(--primary-color);
                    color: white;
                    transform: translateY(-1px);
                }

                .sidebar-col {
                    padding-right: 0.75rem;
                }

                .content-col {
                    padding-left: 0.75rem;
                }

                /* Mode-specific styling */
                .sales-invoices-wrapper[data-mode="quotations"] {
                    --accent-color: rgba(255, 107, 53, 0.1);
                }

                .sales-invoices-wrapper[data-mode="invoices"] {
                    --accent-color: rgba(108, 99, 255, 0.1);
                }

                .sales-invoices-wrapper[data-mode="quotations"] .card {
                    border-left: 4px solid var(--primary-color);
                }

                .sales-invoices-wrapper[data-mode="quotations"] .card-header {
                    background: var(--accent-color);
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

                    .back-btn {
                        padding: 0.375rem 0.75rem;
                        font-size: 0.875rem;
                    }
                }

                /* Enhanced animations */
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .sales-invoices-wrapper {
                    animation: fadeIn 0.3s ease-out;
                }

                /* Theme integration */
                .sales-invoices-wrapper::before {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: var(--primary-gradient);
                    z-index: 9999;
                    opacity: 0.8;
                }

                /* Print styles */
                @media print {
                    .sales-invoices-wrapper::before,
                    .sales-form-header {
                        display: none;
                    }
                    
                    .sales-invoices-wrapper {
                        background: white !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default SalesInvoices;