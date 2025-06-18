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

// ✅ FIXED: Import services only as fallback
import defaultSalesService from '../../../services/salesService';
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
    addToast,
    // ✅ ADDED: Accept service instances from parent
    salesService: propSalesService,
    onCreateSale,
    onSave,
    // ✅ NEW: Quotation-specific props
    onSaveQuotation,
    onCreateQuotation,
    quotationService,
    formType
}) {
    const { companyId: paramCompanyId } = useParams();
    const companyId = propCompanyId || paramCompanyId;

    // ✅ FIXED: Use service from props or fallback to default
    const salesService = propSalesService || defaultSalesService;

    // ✅ FIXED: Enhanced mode detection logic with debugging
    const isQuotationsMode = useMemo(() => {
        const modes = [view, mode, documentType, formType];
        const isQuotation = modes.some(m =>
            m === 'quotations' ||
            m === 'quotation' ||
            m === 'quote' ||
            m === 'quotes'
        );

        console.log('🔍 SalesInvoices Mode Detection:', {
            view,
            mode,
            documentType,
            formType,
            modes,
            isQuotation,
            detectedAs: isQuotation ? 'QUOTATIONS' : 'INVOICES'
        });

        return isQuotation;
    }, [view, mode, documentType, formType]);

    // ✅ FIXED: Dynamic field labels based on mode with enhanced labels
    const labels = useMemo(() => {
        return isQuotationsMode
            ? {
                documentName: 'Quotation',
                documentNamePlural: 'Quotations',
                documentAction: 'Create Quotation',
                editAction: 'Edit Quotation',
                backToList: 'Back to Quotations',
                createNew: 'Create New Quotation',
                pageTitle: 'Quotations Management',
                formTitle: 'Add Sales Quotation',
                savingText: 'Saving quotation...',
                savedText: 'Quotation saved successfully!',
                deletingText: 'Deleting quotation...',
                deletedText: 'Quotation deleted successfully!'
            }
            : {
                documentName: 'Invoice',
                documentNamePlural: 'Invoices',
                documentAction: 'Create Invoice',
                editAction: 'Edit Invoice',
                backToList: 'Back to Invoices',
                createNew: 'Create New Sale Invoice',
                pageTitle: 'Sales Invoices Management',
                formTitle: 'Add Sales Invoice',
                savingText: 'Saving invoice...',
                savedText: 'Invoice saved successfully!',
                deletingText: 'Deleting invoice...',
                deletedText: 'Invoice deleted successfully!'
            };
    }, [isQuotationsMode]);

    // ✅ FIXED: State management with proper initialization
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

    // ✅ FIXED: Enhanced data loading with better error handling
    const loadSalesData = async () => {
        try {
            setLoading(true);
            console.log(`🔄 Loading ${isQuotationsMode ? 'quotations' : 'sales'} data for company:`, companyId);

            const filters = {
                dateFrom: startDate.toISOString().split('T')[0],
                dateTo: endDate.toISOString().split('T')[0]
            };

            let response;

            if (isQuotationsMode) {
                try {
                    // ✅ FIXED: Check if method exists before calling
                    if (saleOrderService && typeof saleOrderService.getQuotations === 'function') {
                        response = await saleOrderService.getQuotations(companyId, filters);
                    } else if (saleOrderService && typeof saleOrderService.getSalesOrders === 'function') {
                        // Fallback to getSalesOrders
                        response = await saleOrderService.getSalesOrders(companyId, { ...filters, orderType: 'quotation' });
                    } else {
                        console.warn('⚠️ saleOrderService.getQuotations not available');
                        response = { success: false, message: 'Quotations service not available' };
                    }
                } catch (serviceError) {
                    console.error('❌ Error loading quotations:', serviceError);
                    throw serviceError;
                }
            } else {
                // ✅ FIXED: Check if service and method exist before calling
                if (salesService && typeof salesService.getInvoices === 'function') {
                    response = await salesService.getInvoices(companyId, filters);
                } else if (salesService && typeof salesService.getSales === 'function') {
                    // Fallback to getSales
                    response = await salesService.getSales(companyId, filters);
                } else {
                    console.error('❌ salesService.getInvoices is not a function. Available methods:',
                        salesService ? Object.getOwnPropertyNames(Object.getPrototypeOf(salesService)) : 'salesService is null');
                    throw new Error('Sales service getInvoices method not available');
                }
            }

            console.log(`📥 ${isQuotationsMode ? 'Quotations' : 'Sales'} response:`, response);

            if (response && response.success && response.data) {
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
                        dataArray = response.data.salesOrders.filter(order =>
                            order.orderType === 'quotation' ||
                            order.documentType === 'quotation'
                        );
                    } else if (Array.isArray(response.data)) {
                        dataArray = response.data.filter(item =>
                            item.orderType === 'quotation' ||
                            item.documentType === 'quotation'
                        );
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
                        (Array.isArray(response.data) ? response.data : []);
                }

                console.log(`📊 Data array extracted:`, dataArray);

                // Add safety check
                if (!Array.isArray(dataArray)) {
                    console.warn('⚠️ Data is not an array:', dataArray);
                    setTransactions([]);
                    return;
                }

                if (dataArray.length === 0) {
                    console.log('📭 No transactions found');
                    setTransactions([]);
                    return;
                }

                // Enhanced transformation
                const transformedTransactions = dataArray.map((item, index) => {
                    if (isQuotationsMode) {
                        return {
                            id: item._id || item.id || `quo-${index}`,
                            invoiceNo: item.orderNo ||
                                item.orderNumber ||
                                item.quotationNumber ||
                                `QUO-${item._id?.slice(-6) || index}`,
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
                        // ✅ FIXED: Better transformation for invoices
                        return {
                            id: item._id || item.id || `inv-${index}`,
                            invoiceNo: item.invoiceNumber ||
                                item.invoiceNo ||
                                item.orderNo ||
                                `INV-${item._id?.slice(-6) || index}`,
                            partyName: item.customer?.name ||
                                item.customerName ||
                                item.partyName ||
                                'Walk-in Customer',
                            partyPhone: item.customer?.mobile ||
                                item.customerMobile ||
                                item.partyPhone,
                            amount: item.totals?.finalTotal ||
                                item.totals?.totalAmount ||
                                item.amount ||
                                0,
                            balance: item.payment?.pendingAmount ||
                                item.balanceAmount ||
                                item.balance ||
                                0,
                            date: item.invoiceDate ||
                                item.date ||
                                item.createdAt,
                            transaction: item.gstEnabled ? 'GST Invoice' : 'Sale',
                            documentType: 'invoice',
                            status: item.status || 'completed',
                            paymentType: item.payment?.method ||
                                item.paymentType ||
                                'Cash',
                            cgst: item.totals?.totalCgstAmount ||
                                item.totals?.totalCGST ||
                                0,
                            sgst: item.totals?.totalSgstAmount ||
                                item.totals?.totalSGST ||
                                0,
                            gstEnabled: item.gstEnabled !== undefined ? item.gstEnabled : true,
                            originalSale: item
                        };
                    }
                });

                console.log(`✅ Transformed ${transformedTransactions.length} transactions`);
                setTransactions(transformedTransactions);
            } else {
                console.warn('⚠️ Invalid response structure:', response);
                setTransactions([]);

                if (response && response.message) {
                    console.error('📥 API Error:', response.message);
                }
            }

        } catch (error) {
            console.error(`❌ Error loading ${isQuotationsMode ? 'quotations' : 'sales'} data:`, error);
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
            console.log('🔄 Loading inventory items for company:', companyId);

            if (itemService && typeof itemService.getItems === 'function') {
                const response = await itemService.getItems(companyId);

                if (response.success && response.data && response.data.items) {
                    console.log('✅ Loaded inventory items:', response.data.items.length);
                    setInventoryItems(response.data.items);
                } else {
                    console.log('📭 No inventory items found');
                    setInventoryItems([]);
                }
            } else {
                console.warn('⚠️ itemService.getItems not available');
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

    // ✅ FIXED: Enhanced handleCreateSale with better debugging
    const handleCreateSale = useCallback(() => {
        console.log('🎯 Creating sale/quotation:', {
            isQuotationsMode,
            mode,
            documentType,
            view,
            formType,
            expectedFormProps: {
                mode: isQuotationsMode ? 'quotations' : 'invoices',
                documentType: isQuotationsMode ? 'quotation' : 'invoice',
                formType: isQuotationsMode ? 'quotation' : 'sales'
            }
        });

        setEditingSale(null);
        setCurrentView('sale');

        // ✅ FIXED: Call appropriate handler based on mode
        if (isQuotationsMode) {
            if (onCreateQuotation) {
                console.log('📞 Calling onCreateQuotation handler');
                onCreateQuotation();
            } else if (onAddSale) {
                console.log('📞 Calling onAddSale handler (fallback)');
                onAddSale();
            }
        } else {
            if (onAddSale) {
                console.log('📞 Calling onAddSale handler');
                onAddSale();
            }
        }
    }, [onAddSale, onCreateQuotation, isQuotationsMode, mode, documentType, view, formType]);

    const handleBackToList = useCallback(() => {
        console.log('↩️ Returning to list view');
        setCurrentView('list');
        setEditingSale(null);
    }, []);

    // ✅ FIXED: Enhanced save handler with proper service usage
    const handleSaleFormSave = useCallback(async (saleData) => {
        try {
            console.log('💾 Saving sale/quotation data:', {
                isQuotationsMode,
                mode,
                documentType,
                formType,
                data: saleData
            });

            setLoading(true);

            // Show saving toast
            if (addToast) {
                addToast(labels.savingText, 'info');
            }

            let result;

            // ✅ FIXED: Handle quotations vs invoices properly
            if (isQuotationsMode) {
                // Handle quotation save
                if (onSaveQuotation) {
                    console.log('📞 Using onSaveQuotation handler');
                    result = await onSaveQuotation(saleData);
                } else if (quotationService && quotationService.createQuotation) {
                    console.log('📞 Using quotationService.createQuotation');
                    result = await quotationService.createQuotation(saleData);
                } else if (saleOrderService && saleOrderService.createSalesOrder) {
                    console.log('📞 Using saleOrderService.createSalesOrder for quotation');
                    const quotationData = {
                        ...saleData,
                        documentType: 'quotation',
                        orderType: 'quotation',
                        mode: 'quotations'
                    };
                    result = await saleOrderService.createSalesOrder(quotationData);
                } else if (onSave) {
                    console.log('📞 Using onSave handler with quotation data');
                    const quotationData = {
                        ...saleData,
                        documentType: 'quotation',
                        orderType: 'quotation',
                        mode: 'quotations'
                    };
                    result = await onSave(quotationData);
                } else {
                    throw new Error('No quotation save handler available');
                }
            } else {
                // Handle regular sales save
                if (onSave) {
                    console.log('📞 Using onSave handler for invoice');
                    result = await onSave(saleData);
                } else if (salesService && salesService.createInvoice) {
                    console.log('📞 Using salesService.createInvoice');
                    result = await salesService.createInvoice(saleData);
                } else {
                    throw new Error('No invoice save handler available');
                }
            }

            console.log('📨 Save result:', result);

            if (result && result.success) {
                // Update local state
                if (result.data) {
                    const newTransaction = {
                        id: result.data._id || result.data.id || Date.now(),
                        invoiceNo: result.data.invoiceNumber || result.data.invoiceNo || result.data.orderNo || saleData.invoiceNumber,
                        quotationNumber: result.data.quotationNumber || result.data.orderNo,
                        partyName: result.data.customerName || saleData.customerName,
                        amount: result.data.totals?.finalTotal || result.data.amount || 0,
                        date: result.data.invoiceDate || result.data.orderDate || saleData.invoiceDate,
                        transaction: isQuotationsMode ? 'Quotation' : 'Sale',
                        documentType: isQuotationsMode ? 'quotation' : 'invoice',
                        status: result.data.status || (isQuotationsMode ? 'draft' : 'completed'),
                        originalSale: result.data
                    };

                    if (editingSale) {
                        setTransactions(prev =>
                            prev.map(t => t.id === editingSale.id ? newTransaction : t)
                        );
                    } else {
                        setTransactions(prev => [newTransaction, ...prev]);
                    }
                }

                setCurrentView('list');
                setEditingSale(null);

                // Show success toast
                if (addToast) {
                    addToast(labels.savedText, 'success');
                }

                // Optionally reload data
                setTimeout(() => {
                    loadSalesData();
                }, 1000);

                return result;
            } else {
                throw new Error(result?.error || result?.message || 'Save operation failed');
            }

        } catch (error) {
            console.error('❌ Error saving sale/quotation:', error);
            const errorMessage = `Error saving ${labels.documentName.toLowerCase()}: ${error.message}`;
            if (addToast) {
                addToast(errorMessage, 'error');
            }

            return {
                success: false,
                error: error.message,
                message: errorMessage
            };
        } finally {
            setLoading(false);
        }
    }, [editingSale, companyId, labels, isQuotationsMode, addToast, onSave, onSaveQuotation, onCreateSale, salesService, quotationService, saleOrderService, loadSalesData]);

    const handleAddItem = useCallback(async (productData) => {
        try {
            if (itemService && typeof itemService.createItem === 'function') {
                const response = await itemService.createItem(companyId, productData);

                if (response.success) {
                    setInventoryItems(prev => [...prev, response.data]);

                    if (addToast) {
                        addToast(`Item "${productData.name}" added successfully`, 'success');
                    }

                    return {
                        success: true,
                        data: response.data,
                        message: `Item "${productData.name}" added successfully`
                    };
                } else {
                    throw new Error(response.message || 'Failed to add item');
                }
            } else {
                throw new Error('Item service not available');
            }

        } catch (error) {
            if (addToast) {
                addToast('Error adding item to inventory', 'error');
            }
            return {
                success: false,
                error: error.message,
                message: 'Error adding item to inventory'
            };
        }
    }, [companyId, addToast]);

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
        console.log('✏️ Editing transaction:', transaction);
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

                if (addToast) {
                    addToast(labels.deletingText, 'info');
                }

                let response;
                if (isQuotationsMode) {
                    if (saleOrderService && typeof saleOrderService.deleteSalesOrder === 'function') {
                        response = await saleOrderService.deleteSalesOrder(transaction.id);
                    } else {
                        throw new Error('Delete quotation service not available');
                    }
                } else {
                    if (salesService && typeof salesService.deleteInvoice === 'function') {
                        response = await salesService.deleteInvoice(transaction.id);
                    } else {
                        throw new Error('Delete invoice service not available');
                    }
                }

                if (response && response.success) {
                    setTransactions(prev => prev.filter(t => t.id !== transaction.id));
                    const message = `${labels.documentName} ${documentNumber} deleted successfully`;
                    if (addToast) {
                        addToast(message, 'success');
                    }
                } else {
                    throw new Error(response?.message || `Failed to delete ${labels.documentName.toLowerCase()}`);
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
    }, [labels.documentName, isQuotationsMode, addToast, salesService]);

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

                if (saleOrderService && typeof saleOrderService.convertToInvoice === 'function') {
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
                } else {
                    throw new Error('Convert to invoice service not available');
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

    // ✅ FIXED: Light color scheme with better contrast
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

    // ✅ DEBUG: Log service availability
    useEffect(() => {
        console.log('🔧 SalesInvoices Debug Info:', {
            salesService: salesService ? 'Available' : 'Missing',
            salesServiceMethods: salesService ? Object.getOwnPropertyNames(Object.getPrototypeOf(salesService)) : [],
            saleOrderService: saleOrderService ? 'Available' : 'Missing',
            itemService: itemService ? 'Available' : 'Missing',
            companyId,
            isQuotationsMode,
            propSalesService: propSalesService ? 'Provided' : 'Not provided',
            onSave: onSave ? 'Provided' : 'Not provided',
            onCreateSale: onCreateSale ? 'Provided' : 'Not provided',
            onSaveQuotation: onSaveQuotation ? 'Provided' : 'Not provided',
            onCreateQuotation: onCreateQuotation ? 'Provided' : 'Not provided',
            quotationService: quotationService ? 'Available' : 'Missing',
            currentView,
            editingSale: editingSale ? 'Set' : 'Not set'
        });
    }, [salesService, propSalesService, onSave, onCreateSale, onSaveQuotation, onCreateQuotation, quotationService, companyId, isQuotationsMode, currentView, editingSale]);

    // ✅ FIXED: CSS-in-JS styles instead of styled-jsx
    const containerStyles = {
        backgroundColor: '#f8f9fa',
        minHeight: '100vh',
        '--primary-color': colors.primary,
        '--primary-rgb': colors.primaryRgb,
        '--secondary-color': colors.secondary,
        '--primary-gradient': colors.gradient
    };

    const formHeaderStyles = {
        zIndex: 1020,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        borderBottom: `2px solid ${colors.primary}`
    };

    const pageTitleStyles = {
        fontSize: '1.1rem',
        color: colors.primary,
        fontWeight: 600
    };

    const backBtnStyles = {
        borderColor: colors.primary,
        color: colors.primary,
        transition: 'all 0.3s ease'
    };

    // ✅ FIXED: Render Sales Form View with proper props
    if (currentView === 'sale') {
        console.log('🎨 Rendering SalesForm with props:', {
            mode: isQuotationsMode ? 'quotations' : 'invoices',
            documentType: isQuotationsMode ? 'quotation' : 'invoice',
            formType: isQuotationsMode ? 'quotation' : 'sales',
            pageTitle: labels.formTitle,
            editingSale: editingSale ? 'Present' : 'Not present',
            hasAddToast: !!addToast,
            isQuotationMode: isQuotationsMode
        });

        return (
            <div className="sales-invoices-wrapper" style={containerStyles} data-mode={isQuotationsMode ? 'quotations' : 'invoices'}>
                <div className="sales-form-header bg-white border-bottom sticky-top" style={formHeaderStyles}>
                    <Container fluid className="px-4">
                        <Row className="align-items-center py-3">
                            <Col>
                                <Button
                                    variant="outline-secondary"
                                    onClick={handleBackToList}
                                    className="me-3 back-btn"
                                    style={backBtnStyles}
                                    disabled={loading}
                                >
                                    <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                                    {labels.backToList}
                                </Button>
                                <span className="page-title-text fw-semibold" style={pageTitleStyles}>
                                    {editingSale
                                        ? `${labels.editAction} ${editingSale.quotationNumber || editingSale.invoiceNo}`
                                        : labels.formTitle
                                    }
                                </span>
                            </Col>
                        </Row>
                    </Container>
                </div>

                {/* ✅ FIXED: SalesForm with all required props */}
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
                    pageTitle={labels.formTitle}
                    addToast={addToast}
                    // ✅ FIXED: Pass quotation-specific props
                    isQuotationMode={isQuotationsMode}
                    quotationService={quotationService || saleOrderService}
                />
            </div>
        );
    }

    // Render Main Sales Invoices View with Compact Sidebar Layout
    return (
        <div className="sales-invoices-wrapper" style={containerStyles} data-mode={isQuotationsMode ? 'quotations' : 'invoices'}>
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
        </div>
    );
}

export default SalesInvoices;