import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';

// Import components
import PurchaseBillsHeader from './PurchaseBill/PurchaseBillsHeader';
import PurchaseBillsFilter from './PurchaseBill/PurchaseBillsFilter';
import PurchaseBillsSummary from './PurchaseBill/PurchaseBillsSummary';
import PurchaseBillsTable from './PurchaseBill/PurchaseBillsTable';

// Import services
import purchaseService from '../../../services/purchaseService';

// Import styles
import './PurchaseBills.css';

function PurchaseBills({
    currentCompany,
    addToast,
    isOnline = true,
    companyId: propCompanyId
}) {
    const { companyId: urlCompanyId } = useParams();
    const navigate = useNavigate();

    // ✅ ENHANCED: Better company ID resolution
    const effectiveCompanyId = useMemo(() => {
        return propCompanyId ||
            urlCompanyId ||
            currentCompany?.id ||
            currentCompany?._id ||
            localStorage.getItem('selectedCompanyId') ||
            sessionStorage.getItem('companyId');
    }, [propCompanyId, urlCompanyId, currentCompany]);

    // ✅ ENHANCED: State management with better initial values
    const [filters, setFilters] = useState({
        dateRange: 'This Month',
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
        selectedFirm: 'ALL FIRMS',
        searchTerm: '',
        purchaseStatus: '',
        receivingStatus: '',
        paymentStatus: ''
    });

    // Loading and error states
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState('');

    // Data states
    const [purchases, setPurchases] = useState([]);
    const [originalPurchases, setOriginalPurchases] = useState([]);
    const [summary, setSummary] = useState({
        totalPurchaseAmount: 0,
        paidAmount: 0,
        payableAmount: 0,
        growthPercentage: 0,
        todaysPurchases: 0,
        totalBills: 0,
        totalSuppliers: 0,
        pendingDeliveries: 0,
        overdueAmount: 0,
        statusCounts: {
            draft: 0,
            ordered: 0,
            received: 0,
            completed: 0,
            paid: 0,
            overdue: 0
        }
    });

    // ✅ FIXED: Static options with hardcoded values (no service method calls)
    const staticOptions = useMemo(() => ({
        dateRangeOptions: [
            'Today',
            'Yesterday',
            'This Week',
            'This Month',
            'Last Month',
            'This Quarter',
            'This Year',
            'Custom Range'
        ],
        firmOptions: [
            'ALL FIRMS',
            'Main Branch',
            'Secondary Branch',
            'Warehouse Branch'
        ],
        purchaseStatusOptions: [
            { value: '', label: 'All Status' },
            { value: 'draft', label: 'Draft' },
            { value: 'ordered', label: 'Ordered' },
            { value: 'received', label: 'Received' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' }
        ],
        receivingStatusOptions: [
            { value: '', label: 'All Receiving Status' },
            { value: 'pending', label: 'Pending' },
            { value: 'partial', label: 'Partially Received' },
            { value: 'received', label: 'Fully Received' },
            { value: 'overdue', label: 'Overdue' }
        ],
        paymentStatusOptions: [
            { value: '', label: 'All Payment Status' },
            { value: 'unpaid', label: 'Unpaid' },
            { value: 'partial', label: 'Partially Paid' },
            { value: 'paid', label: 'Fully Paid' },
            { value: 'overdue', label: 'Overdue' }
        ]
    }), []);

    // ✅ ENHANCED: Calculate summary from purchases with better error handling
    const calculateSummaryFromPurchases = useCallback((purchaseData) => {
        console.log('🧮 Calculating summary from purchases:', purchaseData?.length || 0);

        if (!purchaseData || !Array.isArray(purchaseData) || purchaseData.length === 0) {
            return {
                totalPurchaseAmount: 0,
                paidAmount: 0,
                payableAmount: 0,
                growthPercentage: 0,
                todaysPurchases: 0,
                totalBills: 0,
                totalSuppliers: 0,
                pendingDeliveries: 0,
                overdueAmount: 0,
                statusCounts: {
                    draft: 0,
                    ordered: 0,
                    received: 0,
                    completed: 0,
                    paid: 0,
                    overdue: 0
                }
            };
        }

        try {
            const totalAmount = purchaseData.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            const totalBalance = purchaseData.reduce((sum, p) => sum + (parseFloat(p.balance) || 0), 0);
            const paidAmount = totalAmount - totalBalance;

            // Count by status
            const statusCounts = purchaseData.reduce((counts, p) => {
                const status = (p.purchaseStatus || 'draft').toLowerCase();
                counts[status] = (counts[status] || 0) + 1;
                return counts;
            }, {
                draft: 0,
                ordered: 0,
                received: 0,
                completed: 0,
                paid: 0,
                overdue: 0
            });

            // Today's purchases
            const todaysDate = new Date().toISOString().split('T')[0];
            const todaysPurchasesAmount = purchaseData
                .filter(p => {
                    try {
                        const purchaseDate = new Date(p.date).toISOString().split('T')[0];
                        return purchaseDate === todaysDate;
                    } catch {
                        return false;
                    }
                })
                .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

            // Pending deliveries
            const pendingDeliveries = purchaseData.filter(p =>
                p.receivingStatus === 'pending' || p.receivingStatus === 'partial'
            ).length;

            // Unique suppliers
            const uniqueSuppliers = new Set(
                purchaseData
                    .map(p => p.supplierName)
                    .filter(name => name && name.trim() !== '')
            ).size;

            const result = {
                totalPurchaseAmount: totalAmount,
                paidAmount: paidAmount,
                payableAmount: totalBalance,
                growthPercentage: 0, // Cannot calculate without historical data
                todaysPurchases: todaysPurchasesAmount,
                totalBills: purchaseData.length,
                totalSuppliers: uniqueSuppliers,
                pendingDeliveries: pendingDeliveries,
                overdueAmount: totalBalance, // Simplified - would need due date logic
                statusCounts: statusCounts
            };

            console.log('📊 Calculated summary:', result);
            return result;

        } catch (error) {
            console.error('❌ Error calculating summary:', error);
            return {
                totalPurchaseAmount: 0,
                paidAmount: 0,
                payableAmount: 0,
                growthPercentage: 0,
                todaysPurchases: 0,
                totalBills: 0,
                totalSuppliers: 0,
                pendingDeliveries: 0,
                overdueAmount: 0,
                statusCounts: {
                    draft: 0,
                    ordered: 0,
                    received: 0,
                    completed: 0,
                    paid: 0,
                    overdue: 0
                }
            };
        }
    }, []);

    // ✅ FIXED: Fetch purchases without summary API call
    const fetchPurchases = useCallback(async (customFilters = {}) => {
        if (!effectiveCompanyId) {
            setError('No company selected. Please select a company to view purchases.');
            setInitialLoading(false);
            return;
        }

        const isInitialLoad = !purchases.length;
        if (isInitialLoad) {
            setInitialLoading(true);
        } else {
            setLoading(true);
        }

        setError('');

        try {
            // Prepare API filters
            const currentFilters = { ...filters, ...customFilters };
            const apiFilters = {
                startDate: purchaseService.formatDateForAPI?.(currentFilters.startDate) || currentFilters.startDate?.toISOString?.()?.split('T')[0],
                endDate: purchaseService.formatDateForAPI?.(currentFilters.endDate) || currentFilters.endDate?.toISOString?.()?.split('T')[0],
                ...(currentFilters.searchTerm?.trim() && { search: currentFilters.searchTerm.trim() }),
                ...(currentFilters.purchaseStatus && { status: currentFilters.purchaseStatus }),
                ...(currentFilters.receivingStatus && { receivingStatus: currentFilters.receivingStatus }),
                ...(currentFilters.paymentStatus && { paymentStatus: currentFilters.paymentStatus }),
                ...(currentFilters.selectedFirm !== 'ALL FIRMS' && { firm: currentFilters.selectedFirm })
            };

            console.log('🔄 Fetching purchases with filters:', apiFilters);

            // Fetch purchases
            const purchasesResponse = await purchaseService.getPurchases(effectiveCompanyId, apiFilters);
            console.log('✅ Purchases Response:', purchasesResponse);

            // Transform and validate data
            let transformedPurchases = [];
            if (purchasesResponse?.success) {
                const rawData = purchasesResponse.data;

                if (Array.isArray(rawData)) {
                    transformedPurchases = rawData;
                } else if (rawData?.purchases && Array.isArray(rawData.purchases)) {
                    transformedPurchases = rawData.purchases;
                } else if (rawData && typeof rawData === 'object') {
                    // Handle other response formats
                    transformedPurchases = [];
                }

                // Transform to frontend format if transformation method exists
                if (purchaseService.transformToFrontendFormat && transformedPurchases.length > 0) {
                    transformedPurchases = transformedPurchases.map(purchase => {
                        try {
                            return purchaseService.transformToFrontendFormat(purchase);
                        } catch (transformError) {
                            console.warn('⚠️ Failed to transform purchase:', transformError, purchase);
                            return purchase; // Return original if transformation fails
                        }
                    });
                }
            }

            // Update purchases state
            setPurchases(transformedPurchases);
            setOriginalPurchases(transformedPurchases);

            // ✅ FIXED: Always calculate summary locally (no API call)
            console.log('📊 Calculating summary from purchases data...');
            const summaryData = calculateSummaryFromPurchases(transformedPurchases);
            setSummary(summaryData);

            // Success message
            if (transformedPurchases.length > 0) {
                console.log(`✅ Loaded ${transformedPurchases.length} purchases successfully`);
            } else {
                console.log('ℹ️ No purchases found for the selected criteria');
            }

        } catch (error) {
            console.error('❌ Failed to fetch purchases:', error);
            const errorMessage = `Failed to load purchases: ${error.message}`;
            setError(errorMessage);

            // Set empty data on error
            setPurchases([]);
            setOriginalPurchases([]);
            setSummary(calculateSummaryFromPurchases([]));

            // Show error toast
            addToast?.(errorMessage, 'error', 5000);
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    }, [effectiveCompanyId, filters, calculateSummaryFromPurchases, addToast, purchases.length]);

    // ✅ FIXED: Status update with simplified method calls
    const updatePurchaseStatus = useCallback(async (purchaseId, status) => {
        if (!effectiveCompanyId || !purchaseId) {
            addToast?.('Invalid purchase or company information', 'error');
            return;
        }

        try {
            setLoading(true);

            let response;

            // ✅ FIXED: Use specific status methods if available, otherwise use updatePurchase
            if (status === 'ordered' && purchaseService.markAsOrdered) {
                response = await purchaseService.markAsOrdered(effectiveCompanyId, purchaseId);
            } else if (status === 'received' && purchaseService.markAsReceived) {
                response = await purchaseService.markAsReceived(effectiveCompanyId, purchaseId);
            } else if (status === 'completed' && purchaseService.completePurchase) {
                response = await purchaseService.completePurchase(effectiveCompanyId, purchaseId);
            } else if (purchaseService.updatePurchaseStatus) {
                response = await purchaseService.updatePurchaseStatus(effectiveCompanyId, purchaseId, status);
            } else {
                throw new Error('Status update method not available');
            }

            if (response?.success || response?.data) {
                console.log(`✅ Purchase ${purchaseId} status updated to: ${status}`);
                addToast?.(`Purchase status updated to ${status}`, 'success', 3000);
                await fetchPurchases();
            } else {
                throw new Error(response?.message || 'Failed to update status');
            }

        } catch (error) {
            console.error('❌ Failed to update purchase status:', error);
            const errorMessage = `Failed to update purchase status: ${error.message}`;
            setError(errorMessage);
            addToast?.(errorMessage, 'error', 5000);
        } finally {
            setLoading(false);
        }
    }, [effectiveCompanyId, addToast, fetchPurchases]);

    // ✅ ENHANCED: Delete purchase with better confirmation
    const deletePurchase = useCallback(async (purchaseId, purchaseNo) => {
        if (!effectiveCompanyId || !purchaseId) {
            addToast?.('Invalid purchase or company information', 'error');
            return;
        }

        try {
            setLoading(true);

            const response = await purchaseService.deletePurchase(effectiveCompanyId, purchaseId);

            if (response?.success || response?.data) {
                console.log(`✅ Purchase ${purchaseId} deleted successfully`);
                addToast?.(`Purchase ${purchaseNo} deleted successfully`, 'success', 3000);
                await fetchPurchases();
            } else {
                throw new Error(response?.message || 'Failed to delete purchase');
            }

        } catch (error) {
            console.error('❌ Failed to delete purchase:', error);
            const errorMessage = `Failed to delete purchase: ${error.message}`;
            setError(errorMessage);
            addToast?.(errorMessage, 'error', 5000);
        } finally {
            setLoading(false);
        }
    }, [effectiveCompanyId, addToast, fetchPurchases]);

    // ✅ ENHANCED: Filter update with debouncing
    const updateFilters = useCallback((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    // ✅ ENHANCED: Date range calculation
    const calculateDateRange = useCallback((range) => {
        const today = new Date();
        let start, end;

        switch (range) {
            case 'Today':
                start = end = new Date(today);
                break;
            case 'Yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                start = end = yesterday;
                break;
            case 'This Week':
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                start = startOfWeek;
                end = new Date(today);
                break;
            case 'This Month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'Last Month':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'This Quarter':
                const quarter = Math.floor(today.getMonth() / 3);
                start = new Date(today.getFullYear(), quarter * 3, 1);
                end = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
                break;
            case 'This Year':
                start = new Date(today.getFullYear(), 0, 1);
                end = new Date(today.getFullYear(), 11, 31);
                break;
            default:
                return null; // Custom Range - don't update dates
        }

        return { start, end };
    }, []);

    // ✅ ENHANCED: Event handlers with better error handling
    const handleDateRangeChange = useCallback((range) => {
        const dateRange = calculateDateRange(range);
        if (dateRange) {
            updateFilters({
                dateRange: range,
                startDate: dateRange.start,
                endDate: dateRange.end
            });
        } else {
            updateFilters({ dateRange: range });
        }
    }, [calculateDateRange, updateFilters]);

    const handleStartDateChange = useCallback((e) => {
        const newDate = new Date(e.target.value);
        updateFilters({
            startDate: newDate,
            dateRange: 'Custom Range'
        });
    }, [updateFilters]);

    const handleEndDateChange = useCallback((e) => {
        const newDate = new Date(e.target.value);
        updateFilters({
            endDate: newDate,
            dateRange: 'Custom Range'
        });
    }, [updateFilters]);

    const handleSearchChange = useCallback((e) => {
        updateFilters({ searchTerm: e.target.value });
    }, [updateFilters]);

    // ✅ ENHANCED: Navigation handlers with better validation
    const handleAddPurchase = useCallback(() => {
        if (!effectiveCompanyId) {
            addToast?.('Please select a company first', 'warning', 3000);
            return;
        }
        console.log('🛒 Navigating to Add Purchase page');
        navigate(`/companies/${effectiveCompanyId}/purchases/add`);
    }, [effectiveCompanyId, addToast, navigate]);

    const handleAddSale = useCallback(() => {
        if (!effectiveCompanyId) {
            addToast?.('Please select a company first', 'warning', 3000);
            return;
        }
        console.log('🧾 Navigating to Add Sale page');
        navigate(`/companies/${effectiveCompanyId}/sales/add`);
    }, [effectiveCompanyId, addToast, navigate]);

    // ✅ FIXED: More options with better error handling
    const handleMoreOptions = useCallback(async () => {
        console.log('⚙️ More options clicked');

        if (!effectiveCompanyId) {
            addToast?.('Please select a company first', 'warning', 3000);
            return;
        }

        try {
            // ✅ FIXED: Check if export method exists and is a function
            if (purchaseService.exportCSV && typeof purchaseService.exportCSV === 'function') {
                const blob = await purchaseService.exportCSV(effectiveCompanyId, {
                    startDate: purchaseService.formatDateForAPI?.(filters.startDate) || filters.startDate?.toISOString?.()?.split('T')[0],
                    endDate: purchaseService.formatDateForAPI?.(filters.endDate) || filters.endDate?.toISOString?.()?.split('T')[0]
                });

                // Download CSV
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `purchases_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                addToast?.('Purchase data exported successfully', 'success', 3000);
            } else {
                // ✅ FIXED: Show available options instead of trying to export
                const options = [
                    'Export as CSV (Coming Soon)',
                    'Print Summary Report (Coming Soon)',
                    'Email Summary (Coming Soon)',
                    'Generate Report (Coming Soon)',
                    'Advanced Filters (Coming Soon)'
                ];

                const optionsList = options.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n');

                if (window.confirm(`More Options Available:\n\n${optionsList}\n\nWould you like to see more details about these upcoming features?`)) {
                    addToast?.('These features are coming soon! Stay tuned for updates.', 'info', 4000);
                }
            }
        } catch (error) {
            console.error('❌ More options failed:', error);
            addToast?.('Action failed. Please try again later.', 'error', 3000);
        }
    }, [effectiveCompanyId, filters.startDate, filters.endDate, addToast]);

    const handleSettings = useCallback(() => {
        if (!effectiveCompanyId) {
            addToast?.('Please select a company first', 'warning', 3000);
            return;
        }
        console.log('⚙️ Settings clicked');
        navigate(`/companies/${effectiveCompanyId}/settings`);
    }, [effectiveCompanyId, addToast, navigate]);

    // ✅ ENHANCED: Table event handlers
    const handleViewPurchase = useCallback((purchase) => {
        console.log('👁️ Viewing purchase:', purchase);
        if (effectiveCompanyId && purchase.id) {
            addToast?.(`Viewing Purchase: ${purchase.purchaseNo}`, 'info', 3000);
            // TODO: Implement view page
            // navigate(`/companies/${effectiveCompanyId}/purchases/${purchase.id}`);
        }
    }, [effectiveCompanyId, addToast]);

    const handleEditPurchase = useCallback((purchase) => {
        console.log('✏️ Editing purchase:', purchase);
        if (effectiveCompanyId && purchase.id) {
            navigate(`/companies/${effectiveCompanyId}/purchases/${purchase.id}/edit`);
        }
    }, [effectiveCompanyId, navigate]);

    const handleDeletePurchase = useCallback(async (purchase) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete purchase ${purchase.purchaseNo}?\n\nThis action cannot be undone.`
        );

        if (confirmed) {
            await deletePurchase(purchase.id, purchase.purchaseNo);
        }
    }, [deletePurchase]);

    const handlePrintPurchase = useCallback((purchase) => {
        console.log('🖨️ Printing purchase:', purchase);
        addToast?.(`Print functionality for ${purchase.purchaseNo} coming soon!`, 'info', 3000);
    }, [addToast]);

    const handleSharePurchase = useCallback((purchase) => {
        console.log('📤 Sharing purchase:', purchase);
        const shareText = `Purchase Order: ${purchase.purchaseNo}\nSupplier: ${purchase.supplierName}\nAmount: ${purchaseService.formatCurrency?.(purchase.amount) || `₹${purchase.amount}`}`;

        if (navigator.share) {
            navigator.share({
                title: `Purchase Order ${purchase.purchaseNo}`,
                text: shareText,
                url: window.location.href
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(shareText).then(() => {
                addToast?.('Purchase details copied to clipboard!', 'success', 3000);
            }).catch(() => {
                addToast?.('Sharing not supported on this device', 'warning', 3000);
            });
        }
    }, [addToast]);

    // Status workflow handlers
    const handleMarkAsOrdered = useCallback(async (purchase) => {
        console.log('📦 Marking as ordered:', purchase.purchaseNo);
        await updatePurchaseStatus(purchase.id, 'ordered');
    }, [updatePurchaseStatus]);

    const handleMarkAsReceived = useCallback(async (purchase) => {
        console.log('✅ Marking as received:', purchase.purchaseNo);
        await updatePurchaseStatus(purchase.id, 'received');
    }, [updatePurchaseStatus]);

    const handleCompletePurchase = useCallback(async (purchase) => {
        console.log('🎯 Completing purchase:', purchase.purchaseNo);
        await updatePurchaseStatus(purchase.id, 'completed');
    }, [updatePurchaseStatus]);

    // Retry function
    const handleRetry = useCallback(() => {
        setError('');
        fetchPurchases();
    }, [fetchPurchases]);

    // ✅ ENHANCED: Effects with proper dependencies
    // Initial load
    useEffect(() => {
        if (effectiveCompanyId) {
            fetchPurchases();
        }
    }, [effectiveCompanyId]);

    // Filter changes (excluding search term)
    useEffect(() => {
        if (effectiveCompanyId) {
            fetchPurchases();
        }
    }, [
        filters.dateRange,
        filters.startDate,
        filters.endDate,
        filters.selectedFirm,
        filters.purchaseStatus,
        filters.receivingStatus,
        filters.paymentStatus
    ]);

    // Search term with debouncing
    useEffect(() => {
        if (!effectiveCompanyId) return;

        const timeoutId = setTimeout(() => {
            if (filters.searchTerm !== undefined) {
                fetchPurchases();
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [filters.searchTerm, effectiveCompanyId]);

    // ✅ ENHANCED: Early returns for better UX
    if (!isOnline) {
        return (
            <div className="purchase-bills-main-container">
                <Container fluid>
                    <Alert variant="warning" className="text-center">
                        <h5>📡 No Internet Connection</h5>
                        <p>Purchase data requires an internet connection. Please check your network and try again.</p>
                    </Alert>
                </Container>
            </div>
        );
    }

    if (!effectiveCompanyId) {
        return (
            <div className="purchase-bills-main-container">
                <Container fluid>
                    <Alert variant="warning" className="text-center">
                        <h5>⚠️ No Company Selected</h5>
                        <p>Please select a company to view purchase bills.</p>
                        <small className="text-muted d-block mt-2">
                            You can select a company from the header dropdown.
                        </small>
                    </Alert>
                </Container>
            </div>
        );
    }

    // ✅ ENHANCED: Main render with better loading states
    return (
        <div className="purchase-bills-main-container">
            <Container fluid className="purchase-bills-container">
                {/* Header */}
                <Row>
                    <Col xs={12}>
                        <PurchaseBillsHeader
                            searchTerm={filters.searchTerm}
                            onSearchChange={handleSearchChange}
                            onAddPurchase={handleAddPurchase}
                            onAddSale={handleAddSale}
                            onMoreOptions={handleMoreOptions}
                            onSettings={handleSettings}
                            currentCompany={currentCompany}
                            addToast={addToast}
                        />
                    </Col>
                </Row>

                {/* Error Alert */}
                {error && (
                    <Row>
                        <Col xs={12}>
                            <Alert variant="danger" dismissible onClose={() => setError('')}>
                                <div className="d-flex align-items-center justify-content-between">
                                    <div>
                                        <strong>Error:</strong> {error}
                                    </div>
                                    <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={handleRetry}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <Spinner size="sm" animation="border" className="me-1" />
                                                Retrying...
                                            </>
                                        ) : (
                                            'Retry'
                                        )}
                                    </button>
                                </div>
                            </Alert>
                        </Col>
                    </Row>
                )}

                {/* Filter */}
                <Row>
                    <Col xs={12}>
                        <PurchaseBillsFilter
                            dateRange={filters.dateRange}
                            startDate={filters.startDate}
                            endDate={filters.endDate}
                            selectedFirm={filters.selectedFirm}
                            purchaseStatus={filters.purchaseStatus}
                            receivingStatus={filters.receivingStatus}
                            paymentStatus={filters.paymentStatus}
                            dateRangeOptions={staticOptions.dateRangeOptions}
                            firmOptions={staticOptions.firmOptions}
                            purchaseStatusOptions={staticOptions.purchaseStatusOptions}
                            receivingStatusOptions={staticOptions.receivingStatusOptions}
                            paymentStatusOptions={staticOptions.paymentStatusOptions}
                            onDateRangeChange={handleDateRangeChange}
                            onStartDateChange={handleStartDateChange}
                            onEndDateChange={handleEndDateChange}
                            onFirmChange={(firm) => updateFilters({ selectedFirm: firm })}
                            onPurchaseStatusChange={(status) => updateFilters({ purchaseStatus: status })}
                            onReceivingStatusChange={(status) => updateFilters({ receivingStatus: status })}
                            onPaymentStatusChange={(status) => updateFilters({ paymentStatus: status })}
                        />
                    </Col>
                </Row>

                {/* Main Content */}
                <Row className="purchase-main-content">
                    {/* Summary Sidebar */}
                    <Col xl={2} lg={3} md={4} className="summary-sidebar">
                        <PurchaseBillsSummary
                            summary={summary}
                            purchases={purchases}
                            isLoading={initialLoading}
                        />
                    </Col>

                    {/* Table Content */}
                    <Col xl={10} lg={9} md={8} className="table-content">
                        {initialLoading ? (
                            <div className="loading-container d-flex align-items-center justify-content-center py-5">
                                <Spinner animation="border" variant="primary" />
                                <span className="ms-2">Loading purchases...</span>
                            </div>
                        ) : (
                            <PurchaseBillsTable
                                purchases={purchases}
                                onViewPurchase={handleViewPurchase}
                                onEditPurchase={handleEditPurchase}
                                onDeletePurchase={handleDeletePurchase}
                                onPrintPurchase={handlePrintPurchase}
                                onSharePurchase={handleSharePurchase}
                                onMarkAsOrdered={handleMarkAsOrdered}
                                onMarkAsReceived={handleMarkAsReceived}
                                onCompletePurchase={handleCompletePurchase}
                                isLoading={loading}
                            />
                        )}
                    </Col>
                </Row>
            </Container>

            {/* Loading Overlay for Actions */}
            {loading && !initialLoading && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 9999 }}>
                    <div className="bg-white p-4 rounded shadow">
                        <div className="d-flex align-items-center">
                            <Spinner animation="border" size="sm" className="me-2" />
                            <span>Processing...</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PurchaseBills;