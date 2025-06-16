import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Alert, Button } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';

// Import existing PurchaseBill components for reuse
import PurchaseBillsHeader from './PurchaseBill/PurchaseBillsHeader';
import PurchaseBillsFilter from './PurchaseBill/PurchaseBillsFilter';
import PurchaseBillsSummary from './PurchaseBill/PurchaseBillsSummary';
import PurchaseBillsTable from './PurchaseBill/PurchaseBillsTable';

// Import services
import purchaseOrderService from '../../../services/purchaseOrderService';
import itemService from '../../../services/itemService';
import partyService from '../../../services/partyService';

// Utility: Debounce hook for search optimization
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
};

// Utility: Date range calculator
const getDateRangeFromOption = (option) => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    switch (option) {
        case 'Today':
            return {
                start: startOfToday,
                end: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1)
            };
        case 'Yesterday':
            const yesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
            return {
                start: yesterday,
                end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1)
            };
        case 'This Week':
            const startOfWeek = new Date(startOfToday);
            startOfWeek.setDate(today.getDate() - today.getDay());
            return {
                start: startOfWeek,
                end: new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
            };
        case 'This Month':
            return {
                start: new Date(today.getFullYear(), today.getMonth(), 1),
                end: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
            };
        case 'Last Month':
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            return {
                start: lastMonth,
                end: new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59)
            };
        case 'This Quarter':
            const quarter = Math.floor(today.getMonth() / 3);
            return {
                start: new Date(today.getFullYear(), quarter * 3, 1),
                end: new Date(today.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59)
            };
        case 'This Year':
            return {
                start: new Date(today.getFullYear(), 0, 1),
                end: new Date(today.getFullYear(), 11, 31, 23, 59, 59)
            };
        default:
            return {
                start: new Date(today.getFullYear(), today.getMonth(), 1),
                end: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
            };
    }
};

function PurchaseOrder({
    currentCompany,
    addToast,
    isOnline = true,
    companyId: propCompanyId,
    onNavigate
}) {
    const { companyId: urlCompanyId } = useParams();
    const navigate = useNavigate();

    // Company ID resolution with fallbacks
    const effectiveCompanyId = useMemo(() => {
        return propCompanyId ||
            urlCompanyId ||
            currentCompany?.id ||
            currentCompany?._id ||
            localStorage.getItem('selectedCompanyId') ||
            sessionStorage.getItem('companyId') ||
            localStorage.getItem('companyId');
    }, [propCompanyId, urlCompanyId, currentCompany]);

    // Core component state
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);

    // UI state
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Filters and search
    const [dateRange, setDateRange] = useState('This Month');
    const [startDate, setStartDate] = useState(() => {
        const range = getDateRangeFromOption('This Month');
        return range.start;
    });
    const [endDate, setEndDate] = useState(() => {
        const range = getDateRangeFromOption('This Month');
        return range.end;
    });
    const [selectedFirm, setSelectedFirm] = useState('All Firms');
    const [selectedOrderType, setSelectedOrderType] = useState('All Types');
    const [selectedStatus, setSelectedStatus] = useState('All Status');
    const [topSearchTerm, setTopSearchTerm] = useState('');

    // Debounced search term
    const debouncedSearchTerm = useDebounce(topSearchTerm, 300);

    // Order types configuration
    const orderTypes = useMemo(() => [
        {
            value: 'purchase_order',
            label: 'Purchase Order',
            icon: '📋',
            description: 'Standard purchase orders for regular procurement'
        },
        {
            value: 'purchase_quotation',
            label: 'Purchase Quotation',
            icon: '💰',
            description: 'Request for quotations from suppliers'
        },
        {
            value: 'proforma_purchase',
            label: 'Proforma Purchase',
            icon: '📄',
            description: 'Proforma invoices for advance orders'
        }
    ], []);

    // Order statuses configuration
    const orderStatuses = useMemo(() => [
        { value: 'draft', label: 'Draft', color: 'secondary' },
        { value: 'sent', label: 'Sent', color: 'info' },
        { value: 'confirmed', label: 'Confirmed', color: 'success' },
        { value: 'received', label: 'Received', color: 'primary' },
        { value: 'partially_received', label: 'Partially Received', color: 'warning' },
        { value: 'completed', label: 'Completed', color: 'success' },
        { value: 'cancelled', label: 'Cancelled', color: 'danger' },
        { value: 'expired', label: 'Expired', color: 'dark' }
    ], []);

    // Transform Purchase Orders to Purchase Bills format for component reuse
    const transformedPurchaseOrders = useMemo(() => {
        if (!Array.isArray(purchaseOrders)) return [];

        return purchaseOrders
            .filter(order => {
                if (!order) return false;

                // Apply search filter
                if (debouncedSearchTerm) {
                    const searchLower = debouncedSearchTerm.toLowerCase();
                    const matchesSearch =
                        (order.orderNumber && order.orderNumber.toLowerCase().includes(searchLower)) ||
                        (order.supplierName && order.supplierName.toLowerCase().includes(searchLower)) ||
                        (order.supplier?.name && order.supplier.name.toLowerCase().includes(searchLower)) ||
                        (order.orderType && order.orderType.toLowerCase().includes(searchLower)) ||
                        (order.status && order.status.toLowerCase().includes(searchLower));

                    if (!matchesSearch) return false;
                }

                // Apply status filter
                if (selectedStatus !== 'All Status' && order.status !== selectedStatus) {
                    return false;
                }

                // Apply order type filter
                if (selectedOrderType !== 'All Types' && order.orderType !== selectedOrderType) {
                    return false;
                }

                return true;
            })
            .map(order => ({
                // ID mapping
                id: order._id || order.id,
                _id: order._id || order.id,

                // Basic order info mapping
                purchaseNumber: order.orderNumber || order.purchaseOrderNumber || order.quotationNumber,
                purchaseNo: order.orderNumber || order.purchaseOrderNumber || order.quotationNumber,
                billNumber: order.orderNumber || order.purchaseOrderNumber || order.quotationNumber,
                billNo: order.orderNumber || order.purchaseOrderNumber || order.quotationNumber,

                // Date mapping
                purchaseDate: order.orderDate || order.quotationDate || order.createdAt,
                billDate: order.orderDate || order.quotationDate || order.createdAt,
                date: order.orderDate || order.quotationDate || order.createdAt,

                // Supplier info mapping
                supplierName: order.supplierName || order.supplier?.name || order.supplier?.businessName,
                supplierMobile: order.supplierMobile || order.supplier?.mobile || order.supplier?.phone,
                partyName: order.supplierName || order.supplier?.name || order.supplier?.businessName,
                partyMobile: order.supplierMobile || order.supplier?.mobile || order.supplier?.phone,

                // Amount mapping with fallbacks
                totalAmount: parseFloat(order.totalAmount || order.amount || order.grandTotal || order.finalTotal || 0),
                amount: parseFloat(order.totalAmount || order.amount || order.grandTotal || order.finalTotal || 0),
                finalTotal: parseFloat(order.totalAmount || order.amount || order.grandTotal || order.finalTotal || 0),
                grandTotal: parseFloat(order.totalAmount || order.amount || order.grandTotal || order.finalTotal || 0),

                // Balance and payment mapping
                balanceAmount: parseFloat(order.balanceAmount || order.pendingAmount || order.dueAmount || 0),
                balance: parseFloat(order.balanceAmount || order.pendingAmount || order.dueAmount || 0),
                pendingAmount: parseFloat(order.balanceAmount || order.pendingAmount || order.dueAmount || 0),
                paidAmount: parseFloat(order.paidAmount || order.amountPaid || 0),
                amountPaid: parseFloat(order.paidAmount || order.amountPaid || 0),

                // Status mapping
                status: order.status || 'draft',
                purchaseStatus: order.status || 'draft',
                billStatus: order.status || 'draft',
                orderStatus: order.status || 'draft',

                // Order specific fields
                orderType: order.orderType || 'purchase_order',
                priority: order.priority || 'medium',
                expectedDeliveryDate: order.expectedDeliveryDate,
                requiredBy: order.requiredBy,
                validUntil: order.validUntil,

                // Payment info mapping
                payment: order.payment || {
                    method: order.paymentMethod || 'credit',
                    amount: order.paidAmount || 0,
                    status: order.paymentStatus || 'pending'
                },
                paymentMethod: order.payment?.method || order.paymentMethod || 'credit',
                paymentType: order.payment?.method || order.paymentMethod || 'credit',
                paymentStatus: order.payment?.status || order.paymentStatus || 'pending',

                // GST and tax mapping
                gstEnabled: order.gstEnabled !== undefined ? order.gstEnabled : true,
                taxMode: order.taxMode || 'inclusive',
                totalTaxAmount: parseFloat(order.totalTaxAmount || order.taxAmount || 0),
                totalCGST: parseFloat(order.totalCGST || order.cgstAmount || 0),
                totalSGST: parseFloat(order.totalSGST || order.sgstAmount || 0),
                totalIGST: parseFloat(order.totalIGST || order.igstAmount || 0),

                // Tax breakdown for table display
                taxBreakup: {
                    cgst: parseFloat(order.totalCGST || order.cgstAmount || 0),
                    sgst: parseFloat(order.totalSGST || order.sgstAmount || 0),
                    igst: parseFloat(order.totalIGST || order.igstAmount || 0)
                },

                // Items mapping
                items: Array.isArray(order.items) ? order.items : [],
                orderItems: Array.isArray(order.items) ? order.items : [],

                // Additional fields
                notes: order.notes || '',
                internalNotes: order.internalNotes || '',
                termsAndConditions: order.termsAndConditions || '',

                // Company and user info
                companyId: order.companyId || effectiveCompanyId,
                userId: order.userId,
                createdBy: order.createdBy,

                // Timestamps
                createdAt: order.createdAt,
                updatedAt: order.updatedAt || order.lastModified,
                lastModified: order.updatedAt || order.lastModified,

                // Reference to original order for actions
                fullObject: order,
                originalOrder: order
            }));
    }, [purchaseOrders, debouncedSearchTerm, selectedStatus, selectedOrderType, effectiveCompanyId]);

    // Enhanced summary calculation for orders
    const summary = useMemo(() => {
        if (!Array.isArray(purchaseOrders)) {
            return {
                totalOrderAmount: 0,
                totalOrders: 0,
                paidAmount: 0,
                payableAmount: 0,
                totalTaxAmount: 0,
                totalDiscountAmount: 0,
                totalSuppliers: 0,
                avgOrderValue: 0,
                draftCount: 0,
                sentCount: 0,
                confirmedCount: 0,
                receivedCount: 0,
                completedCount: 0,
                quotationCount: 0,
                orderCount: 0,
                proformaCount: 0,
                growthPercentage: 0
            };
        }

        // Calculate totals
        const totalAmount = purchaseOrders.reduce((sum, order) =>
            sum + (parseFloat(order.totalAmount) || parseFloat(order.amount) || 0), 0);
        const totalTaxAmount = purchaseOrders.reduce((sum, order) =>
            sum + (parseFloat(order.totalTaxAmount) || parseFloat(order.taxAmount) || 0), 0);
        const totalDiscountAmount = purchaseOrders.reduce((sum, order) =>
            sum + (parseFloat(order.totalDiscountAmount) || parseFloat(order.discountAmount) || 0), 0);
        const paidAmount = purchaseOrders.reduce((sum, order) =>
            sum + (parseFloat(order.paidAmount) || parseFloat(order.amountPaid) || 0), 0);
        const payableAmount = totalAmount - paidAmount;

        // Calculate by status
        const statusCounts = purchaseOrders.reduce((counts, order) => {
            const status = order.status || 'draft';
            counts[status] = (counts[status] || 0) + 1;
            return counts;
        }, {});

        // Calculate by order type
        const typeCounts = purchaseOrders.reduce((counts, order) => {
            const type = order.orderType || 'purchase_order';
            counts[type] = (counts[type] || 0) + 1;
            return counts;
        }, {});

        // Calculate unique suppliers
        const uniqueSuppliers = new Set();
        purchaseOrders.forEach(order => {
            const supplierName = order.supplierName || order.supplier?.name || order.supplier?.businessName;
            if (supplierName) {
                uniqueSuppliers.add(supplierName);
            }
        });

        return {
            // Main totals (mapped to PurchaseBills format)
            totalPurchaseAmount: totalAmount,
            totalBills: purchaseOrders.length,
            paidAmount: paidAmount,
            payableAmount: payableAmount,

            // Order-specific totals
            totalOrderAmount: totalAmount,
            totalOrders: purchaseOrders.length,
            totalTaxAmount: totalTaxAmount,
            totalDiscountAmount: totalDiscountAmount,
            totalSuppliers: uniqueSuppliers.size,
            avgOrderValue: purchaseOrders.length > 0 ? totalAmount / purchaseOrders.length : 0,

            // Status breakdown
            draftCount: statusCounts.draft || 0,
            sentCount: statusCounts.sent || 0,
            confirmedCount: statusCounts.confirmed || 0,
            receivedCount: statusCounts.received || 0,
            completedCount: statusCounts.completed || 0,
            cancelledCount: statusCounts.cancelled || 0,
            expiredCount: statusCounts.expired || 0,

            // Type breakdown
            quotationCount: typeCounts.purchase_quotation || 0,
            orderCount: typeCounts.purchase_order || 0,
            proformaCount: typeCounts.proforma_purchase || 0,

            // Growth calculation (mock for now)
            growthPercentage: Math.round((Math.random() * 40 - 20) * 100) / 100
        };
    }, [purchaseOrders]);

    // Filter options
    const dateRangeOptions = useMemo(() => [
        'Today', 'Yesterday', 'This Week', 'This Month', 'Last Month', 'This Quarter', 'This Year', 'Custom Range'
    ], []);

    const firmOptions = useMemo(() => {
        const firms = new Set(['All Firms']);
        purchaseOrders.forEach(order => {
            const supplierName = order.supplierName || order.supplier?.name;
            if (supplierName) {
                firms.add(supplierName);
            }
        });
        return Array.from(firms);
    }, [purchaseOrders]);

    const purchaseStatusOptions = useMemo(() => [
        { value: 'All Status', label: 'All Status', color: 'secondary' },
        ...orderStatuses.map(status => ({
            value: status.value,
            label: status.label,
            color: status.color
        }))
    ], [orderStatuses]);

    // Load purchase orders data
    const loadPurchaseOrdersData = useCallback(async (showLoading = true) => {
        if (!effectiveCompanyId) {
            setPurchaseOrders([]);
            setError('No company selected. Please select a company first.');
            return;
        }

        try {
            if (showLoading) setLoading(true);
            setError(null);

            const filters = {
                startDate: startDate?.toISOString?.()?.split('T')[0],
                endDate: endDate?.toISOString?.()?.split('T')[0],
                page: 1,
                limit: 1000,
                ...(selectedStatus !== 'All Status' && { status: selectedStatus }),
                ...(selectedOrderType !== 'All Types' && { orderType: selectedOrderType }),
                ...(debouncedSearchTerm && { search: debouncedSearchTerm })
            };

            const response = await purchaseOrderService.getPurchaseOrders(effectiveCompanyId, filters);

            if (response?.success) {
                const rawData = response.data;
                let transformedOrders = [];

                // Handle different response formats
                if (Array.isArray(rawData)) {
                    transformedOrders = rawData;
                } else if (rawData?.orders && Array.isArray(rawData.orders)) {
                    transformedOrders = rawData.orders;
                } else if (rawData?.purchaseOrders && Array.isArray(rawData.purchaseOrders)) {
                    transformedOrders = rawData.purchaseOrders;
                } else if (rawData?.data && Array.isArray(rawData.data)) {
                    transformedOrders = rawData.data;
                } else if (rawData && typeof rawData === 'object' && rawData._id) {
                    transformedOrders = [rawData];
                } else {
                    transformedOrders = [];
                }

                setPurchaseOrders(transformedOrders);
            } else {
                setPurchaseOrders([]);
                if (response?.message && !response.message.includes('No purchase orders found')) {
                    setError('Failed to load purchase orders: ' + response.message);
                }
            }
        } catch (error) {
            setPurchaseOrders([]);
            setError('Failed to load purchase orders: ' + error.message);
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [effectiveCompanyId, startDate, endDate, selectedStatus, selectedOrderType, debouncedSearchTerm]);

    // Load inventory items
    const loadInventoryItems = useCallback(async () => {
        if (!effectiveCompanyId) {
            setInventoryItems([]);
            return;
        }

        try {
            const response = await itemService.getItems(effectiveCompanyId);
            if (response?.success && response.data) {
                const items = response.data.items || response.data || [];
                const itemsArray = Array.isArray(items) ? items : [];
                setInventoryItems(itemsArray);
            } else {
                setInventoryItems([]);
            }
        } catch (error) {
            setInventoryItems([]);
        }
    }, [effectiveCompanyId]);

    // Load suppliers
    const loadSuppliers = useCallback(async () => {
        if (!effectiveCompanyId) {
            setSuppliers([]);
            return;
        }

        try {
            const response = await partyService.getParties(effectiveCompanyId, { type: 'supplier' });
            if (response?.success && response.data) {
                const supplierList = response.data.parties || response.data || [];
                const suppliersArray = Array.isArray(supplierList) ? supplierList : [];
                setSuppliers(suppliersArray);
            } else {
                setSuppliers([]);
            }
        } catch (error) {
            setSuppliers([]);
        }
    }, [effectiveCompanyId]);

    // Load categories and bank accounts
    const loadCategories = useCallback(async () => {
        if (!effectiveCompanyId) {
            setCategories([]);
            return;
        }

        try {
            const mockCategories = [
                { id: 1, name: 'Electronics', description: 'Electronic items' },
                { id: 2, name: 'Office Supplies', description: 'Office supplies and stationery' },
                { id: 3, name: 'Raw Materials', description: 'Raw materials for production' },
                { id: 4, name: 'Services', description: 'Service items' }
            ];
            setCategories(mockCategories);
        } catch (error) {
            setCategories([]);
        }
    }, [effectiveCompanyId]);

    const loadBankAccounts = useCallback(async () => {
        if (!effectiveCompanyId) {
            setBankAccounts([]);
            return;
        }

        try {
            const mockBankAccounts = [
                { id: 1, name: 'Primary Business Account', accountNumber: '****1234', bank: 'State Bank' },
                { id: 2, name: 'Secondary Account', accountNumber: '****5678', bank: 'HDFC Bank' }
            ];
            setBankAccounts(mockBankAccounts);
        } catch (error) {
            setBankAccounts([]);
        }
    }, [effectiveCompanyId]);

    // Load all data on component mount and dependency changes
    useEffect(() => {
        if (effectiveCompanyId) {
            const loadAllData = async () => {
                await Promise.allSettled([
                    loadPurchaseOrdersData(true),
                    loadInventoryItems(),
                    loadSuppliers(),
                    loadCategories(),
                    loadBankAccounts()
                ]);
            };

            const timer = setTimeout(loadAllData, 100);
            return () => clearTimeout(timer);
        } else {
            setPurchaseOrders([]);
            setInventoryItems([]);
            setSuppliers([]);
            setCategories([]);
            setBankAccounts([]);
        }
    }, [effectiveCompanyId, loadPurchaseOrdersData, loadInventoryItems, loadSuppliers, loadCategories, loadBankAccounts]);

    // Reload data when filters change
    useEffect(() => {
        if (effectiveCompanyId) {
            loadPurchaseOrdersData(false);
        }
    }, [startDate, endDate, selectedStatus, selectedOrderType, debouncedSearchTerm, loadPurchaseOrdersData]);

    // Date range handlers
    const handleDateRangeChange = useCallback((range) => {
        setDateRange(range);
        if (range !== 'Custom Range') {
            const dateRange = getDateRangeFromOption(range);
            setStartDate(dateRange.start);
            setEndDate(dateRange.end);
        }
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

    // Navigation handlers
    const handleCreateOrder = useCallback(() => {
        if (onNavigate) {
            onNavigate('createPurchaseOrder');
        } else if (effectiveCompanyId) {
            navigate(`/companies/${effectiveCompanyId}/purchase-orders/add`);
        }
    }, [onNavigate, effectiveCompanyId, navigate]);

    // Purchase order action handlers
    const handleViewPurchase = useCallback((purchase) => {
        // View functionality - no toast needed
    }, []);

    const handleEditPurchase = useCallback((purchase) => {
        const originalOrder = purchase.originalOrder || purchase;

        if (onNavigate) {
            onNavigate('createPurchaseOrder', { editingOrder: originalOrder });
        } else if (effectiveCompanyId) {
            navigate(`/companies/${effectiveCompanyId}/purchase-orders/add`, {
                state: { editingOrder: originalOrder }
            });
        }
    }, [onNavigate, effectiveCompanyId, navigate]);

    const handleDeletePurchase = useCallback(async (purchase) => {
        const originalOrder = purchase.originalOrder || purchase;
        const orderNumber = originalOrder.orderNumber || originalOrder._id;

        const confirmMessage = `Are you sure you want to delete order "${orderNumber}"?\n\nThis action cannot be undone.`;

        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            setLoading(true);
            const response = await purchaseOrderService.deletePurchaseOrder(originalOrder._id);

            if (response?.success) {
                addToast?.(`Purchase order "${orderNumber}" deleted successfully!`, 'success');
                await loadPurchaseOrdersData(false);
            } else {
                addToast?.(response?.message || 'Failed to delete purchase order', 'error');
            }
        } catch (error) {
            addToast?.('Error deleting purchase order: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast, loadPurchaseOrdersData]);

    const handlePrintPurchase = useCallback((purchase) => {
        // Print functionality - no toast needed for UI action
    }, []);

    const handleSharePurchase = useCallback((purchase) => {
        // Share functionality - no toast needed for UI action
    }, []);

    // Order status change handlers
    const handleMarkAsOrdered = useCallback(async (purchase) => {
        const originalOrder = purchase.originalOrder || purchase;
        const orderNumber = originalOrder.orderNumber || originalOrder._id;

        try {
            setRefreshing(true);
            const response = await purchaseOrderService.sendOrder(originalOrder._id);

            if (response?.success) {
                addToast?.(`Purchase order "${orderNumber}" sent successfully!`, 'success');
                await loadPurchaseOrdersData(false);
            } else {
                addToast?.(response?.message || 'Failed to send purchase order', 'error');
            }
        } catch (error) {
            addToast?.('Error sending purchase order: ' + error.message, 'error');
        } finally {
            setRefreshing(false);
        }
    }, [addToast, loadPurchaseOrdersData]);

    const handleMarkAsReceived = useCallback(async (purchase) => {
        const originalOrder = purchase.originalOrder || purchase;
        const orderNumber = originalOrder.orderNumber || originalOrder._id;

        try {
            setRefreshing(true);
            const response = await purchaseOrderService.receiveOrder(originalOrder._id);

            if (response?.success) {
                addToast?.(`Purchase order "${orderNumber}" marked as received successfully!`, 'success');
                await loadPurchaseOrdersData(false);
            } else {
                addToast?.(response?.message || 'Failed to mark order as received', 'error');
            }
        } catch (error) {
            addToast?.('Error marking order as received: ' + error.message, 'error');
        } finally {
            setRefreshing(false);
        }
    }, [addToast, loadPurchaseOrdersData]);

    const handleCompletePurchase = useCallback(async (purchase) => {
        const originalOrder = purchase.originalOrder || purchase;
        const orderNumber = originalOrder.orderNumber || originalOrder._id;

        try {
            setRefreshing(true);
            const response = await purchaseOrderService.completeOrder(originalOrder._id);

            if (response?.success) {
                addToast?.(`Purchase order "${orderNumber}" completed successfully!`, 'success');
                await loadPurchaseOrdersData(false);
            } else {
                addToast?.(response?.message || 'Failed to complete purchase order', 'error');
            }
        } catch (error) {
            addToast?.('Error completing purchase order: ' + error.message, 'error');
        } finally {
            setRefreshing(false);
        }
    }, [addToast, loadPurchaseOrdersData]);

    // Refresh data
    const handleRefresh = useCallback(async () => {
        await loadPurchaseOrdersData(true);
    }, [loadPurchaseOrdersData]);

    // Loading state
    if (!effectiveCompanyId) {
        return (
            <div className="purchase-order-wrapper" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
                <Container fluid className="py-5 px-4">
                    <Alert variant="warning" className="text-center shadow-sm border-0">
                        <div className="text-warning mb-3">
                            <i className="fas fa-exclamation-triangle fa-3x"></i>
                        </div>
                        <h5 className="fw-bold">Company Not Selected</h5>
                        <p className="mb-3">Please select a company to view and manage purchase orders.</p>
                        <Button variant="warning" onClick={() => navigate('/companies')}>
                            <i className="fas fa-building me-2"></i>
                            Select Company
                        </Button>
                    </Alert>
                </Container>
            </div>
        );
    }

    return (
        <div className="purchase-order-wrapper" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            {/* Header with order mode */}
            <PurchaseBillsHeader
                searchTerm={topSearchTerm}
                onSearchChange={(e) => setTopSearchTerm(e.target.value)}
                onAddPurchase={handleCreateOrder}
                currentCompany={currentCompany}
                addToast={addToast}
                isOrderMode={true}
            />

            {/* Page title section */}
            <div className="purchase-page-title bg-white border-bottom">
                <Container fluid className="px-4">
                    <Row className="align-items-center py-3">
                        <Col>
                            <div className="d-flex align-items-center justify-content-between flex-wrap">
                                <div className="mb-2 mb-lg-0">
                                    <h4 className="mb-1 text-purple fw-bold">
                                        <i className="fas fa-clipboard-list me-2"></i>
                                        Purchase Orders
                                    </h4>
                                    <p className="text-muted mb-0">
                                        Manage purchase orders, quotations, and proforma purchases
                                        <span className="badge bg-light text-dark ms-2">
                                            {transformedPurchaseOrders.length} of {purchaseOrders.length} orders
                                        </span>
                                    </p>
                                </div>
                                <div className="d-flex gap-2 align-items-center">
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={handleRefresh}
                                        disabled={loading || refreshing}
                                        className="px-3"
                                    >
                                        <i className={`fas fa-sync-alt me-2 ${(loading || refreshing) ? 'fa-spin' : ''}`}></i>
                                        Refresh
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={handleCreateOrder}
                                        className="px-4"
                                        disabled={loading}
                                        style={{
                                            background: 'linear-gradient(135deg, #6c63ff 0%, #9c88ff 100%)',
                                            border: 'none',
                                            boxShadow: '0 2px 4px rgba(108, 99, 255, 0.25)'
                                        }}
                                    >
                                        <i className="fas fa-plus me-2"></i>
                                        Create Order
                                    </Button>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* Error display */}
            {error && (
                <Container fluid className="px-4 pt-3">
                    <Alert variant="danger" className="border-0 shadow-sm" dismissible onClose={() => setError(null)}>
                        <Alert.Heading className="h6">
                            <i className="fas fa-exclamation-triangle me-2"></i>
                            Error Loading Data
                        </Alert.Heading>
                        <p className="mb-0">{error}</p>
                    </Alert>
                </Container>
            )}

            {/* Filters */}
            <PurchaseBillsFilter
                dateRange={dateRange}
                startDate={startDate}
                endDate={endDate}
                selectedFirm={selectedFirm}
                purchaseStatus={selectedStatus}
                dateRangeOptions={dateRangeOptions}
                firmOptions={firmOptions}
                purchaseStatusOptions={purchaseStatusOptions}
                onDateRangeChange={handleDateRangeChange}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
                onFirmChange={setSelectedFirm}
                onPurchaseStatusChange={setSelectedStatus}
                isOrderMode={true}
            />

            {/* Main content */}
            <Container fluid className="px-4 py-3">
                <Row className="g-3">
                    {/* Sidebar summary */}
                    <Col xl={2} lg={3} md={3} sm={12} className="sidebar-col">
                        <PurchaseBillsSummary
                            summary={summary}
                            purchases={transformedPurchaseOrders}
                            isLoading={loading || refreshing}
                            isOrderMode={true}
                        />
                    </Col>

                    {/* Main table */}
                    <Col xl={10} lg={9} md={9} sm={12} className="content-col">
                        <PurchaseBillsTable
                            purchases={transformedPurchaseOrders}
                            onViewPurchase={handleViewPurchase}
                            onEditPurchase={handleEditPurchase}
                            onDeletePurchase={handleDeletePurchase}
                            onPrintPurchase={handlePrintPurchase}
                            onSharePurchase={handleSharePurchase}
                            onMarkAsOrdered={handleMarkAsOrdered}
                            onMarkAsReceived={handleMarkAsReceived}
                            onCompletePurchase={handleCompletePurchase}
                            isLoading={loading || refreshing}
                            isPurchaseOrderView={true}
                            title="Purchase Orders"
                            searchPlaceholder="Search orders, suppliers, items..."
                        />
                    </Col>
                </Row>
            </Container>

            {/* Styles */}
            <style>
                {`
                .purchase-order-wrapper {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                }

                .text-purple {
                    color: #6c63ff !important;
                }

                .purchase-page-title {
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                .purchase-page-title .btn-primary {
                    transition: all 0.2s ease;
                }

                .purchase-page-title .btn-primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(108, 99, 255, 0.3);
                }

                .purchase-page-title .btn-outline-primary {
                    border-color: #6c63ff;
                    color: #6c63ff;
                    transition: all 0.2s ease;
                }

                .purchase-page-title .btn-outline-primary:hover {
                    background-color: #6c63ff;
                    border-color: #6c63ff;
                    transform: translateY(-1px);
                }

                .sidebar-col {
                    order: 2;
                }

                .content-col {
                    order: 1;
                }

                @media (min-width: 768px) {
                    .sidebar-col {
                        order: 1;
                    }
                    .content-col {
                        order: 2;
                    }
                }

                .fa-spin {
                    animation: fa-spin 1s infinite linear;
                }

                @keyframes fa-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .badge.bg-light {
                    color: #6c757d !important;
                    font-weight: 500;
                }

                .alert {
                    border-radius: 8px;
                }

                .alert-danger {
                    background: linear-gradient(135deg, #fee, #fdd);
                    border-color: #f5c6cb;
                    color: #721c24;
                }

                .alert-warning {
                    background: linear-gradient(135deg, #fff3cd, #ffeaa7);
                    border-color: #ffeaa7;
                    color: #856404;
                }

                @media (max-width: 992px) {
                    .purchase-page-title .d-flex {
                        flex-direction: column;
                        align-items: stretch !important;
                        gap: 1rem;
                    }

                    .purchase-page-title .d-flex > div:last-child {
                        justify-content: center;
                    }
                }

                @media (max-width: 576px) {
                    .purchase-page-title .btn {
                        width: 100%;
                        margin-bottom: 0.5rem;
                    }

                    .purchase-page-title .d-flex.gap-2 {
                        flex-direction: column;
                        gap: 0.5rem !important;
                    }
                }
                `}
            </style>
        </div>
    );
}

export default PurchaseOrder;