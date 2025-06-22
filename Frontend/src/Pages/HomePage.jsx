import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Alert, Spinner, Container, Toast, ToastContainer } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faExclamationTriangle,
    faBuilding,
    faCheckCircle,
    faInfoCircle,
    faWifi,
    faTimesCircle,
    faExclamationCircle
} from '@fortawesome/free-solid-svg-icons';

// Import the components
import DayBook from '../components/Home/DayBook';
import Parties from '../components/Home/Parties';
import Sales from '../components/Home/Sales';
import Quotations from '../components/Home/Quotations'; // ✅ FIXED: Import Quotations component
import SalesOrderForm from '../components/Home/Sales/SalesOrder/SalesOrderForm';
import Inventory from '../components/Home/Inventory';
import StaffManagement from '../components/Home/StaffManagement';
import PurchaseOrders from '../components/Home/PurchaseOrders';
import Bank from '../components/Home/Bank';

// Import PurchaseOrder component
import PurchaseOrder from '../components/Home/Purchases/PurchaseOrder';

// Import PurchaseOrderForm for direct page rendering
import PurchaseOrderForm from '../components/Home/Purchases/PurchaseOrderForm';

// Import form components
import PurchaseForm from '../components/Home/Purchases/PurchaseForm';

// ✅ NEW: Import edit components
import EditSalesInvoice from '../components/Home/Sales/EditSalesInvoice';
import EditQuotation from '../components/Home/Sales/EditQuotation';

// Import services
import companyService from '../services/companyService';
import partyService from '../services/partyService';
import purchaseService from '../services/purchaseService';
import salesService from '../services/salesService';
import saleOrderService from '../services/saleOrderService'; // ✅ FIXED: Use saleOrderService for quotations

// Import utility components
import ErrorBoundary from '../components/ErrorBoundary';
import Loading from '../components/Loading';

// ✅ NEW: Import custom hook for better online detection
import { useOnlineStatus } from '../hooks/useOnlineStatus';

import './HomePage.css';

function HomePage({
    currentCompany: propCurrentCompany,
    onCompanyChange,
    companies,
    currentUser
}) {
    const { companyId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // ✅ ENHANCED: Better online status detection
    const { isOnline, lastChecked } = useOnlineStatus();

    // ✅ ENHANCED: Better path parsing for complex routes
    const getViewFromPath = () => {
        const pathParts = location.pathname.split('/').filter(part => part);
        const lastPart = pathParts[pathParts.length - 1];
        const secondLastPart = pathParts[pathParts.length - 2];
        const thirdLastPart = pathParts[pathParts.length - 3];

        console.log('🔍 HomePage - Path analysis:', {
            fullPath: location.pathname,
            pathParts,
            lastPart,
            secondLastPart,
            thirdLastPart
        });

        // ✅ ENHANCED: Handle edit routes with better pattern matching
        if (lastPart && (lastPart.match(/^[a-f0-9]{24}$/) || lastPart.match(/^\d+$/) || lastPart.includes('edit'))) {
            if (secondLastPart === 'edit') {
                if (thirdLastPart === 'sales' || thirdLastPart === 'invoices') return 'editSalesInvoice';
                if (thirdLastPart === 'quotations') return 'editQuotation';
                if (thirdLastPart === 'sales-orders') return 'editSalesOrder';
            }
            // Handle direct edit URLs like /quotations/edit/id
            if (lastPart.includes('edit') && secondLastPart === 'quotations') return 'editQuotation';
            if (lastPart.includes('edit') && (secondLastPart === 'sales' || secondLastPart === 'invoices')) return 'editSalesInvoice';
            if (lastPart.includes('edit') && secondLastPart === 'sales-orders') return 'editSalesOrder';
        }

        // ✅ ENHANCED: Handle form routes with better detection
        if (lastPart === 'add' || lastPart === 'create') {
            console.log('📝 Add/Create route detected for:', secondLastPart);
            if (secondLastPart === 'purchases') return 'createPurchase';
            if (secondLastPart === 'sales' || secondLastPart === 'invoices') return 'createInvoice';
            if (secondLastPart === 'purchase-orders') return 'createPurchaseOrder';
            if (secondLastPart === 'quotations') return 'createQuotation';
            if (secondLastPart === 'sales-orders') return 'createSalesOrder';
        }

        // ✅ ENHANCED: Map URL paths to views with more comprehensive mapping
        const pathViewMap = {
            // Dashboard & Day Book
            'dashboard': 'dailySummary',
            'daybook': 'dailySummary',
            'day-book': 'dailySummary',
            'transactions': 'transactions',
            'cash-bank': 'cashAndBank',
            'cash-and-bank': 'cashAndBank',

            // Parties
            'parties': 'parties',
            'customers': 'parties',
            'suppliers': 'parties',

            // Sales - Enhanced mapping
            'sales': 'invoices',
            'quotations': 'quotations',
            'quotes': 'quotations',
            'sales-orders': 'salesOrders',
            'invoices': 'invoices',
            'bills': 'invoices',

            // Purchase
            'purchases': 'allPurchases',
            'purchase-bills': 'purchaseBills',
            'purchase-orders': 'purchaseOrder',
            'purchase-order': 'purchaseOrder',

            // Inventory
            'inventory': 'inventory',
            'products': 'allProducts',
            'items': 'allProducts',
            'low-stock': 'lowStock',
            'stock-movement': 'stockMovement',
            'stock-movements': 'stockMovement',

            // Bank & Cash
            'bank-accounts': 'bankAccounts',
            'cash-accounts': 'cashAccounts',
            'bank-transactions': 'bankTransactions',
            'bank-reconciliation': 'bankReconciliation',
            'cash-flow': 'cashFlow',

            // Other
            'staff': 'staff',
            'employees': 'staff',
            'insights': 'insights',
            'analytics': 'insights',
            'reports': 'reports',
            'settings': 'settings',
            'configuration': 'settings'
        };

        const detectedView = pathViewMap[lastPart] || 'dailySummary';
        console.log('🎯 HomePage - Detected view:', detectedView, 'from path:', lastPart);
        return detectedView;
    };

    // Current view state - derived from URL
    const [currentView, setCurrentView] = useState(getViewFromPath());

    // Company state - use prop or find from companies list
    const [currentCompany, setCurrentCompany] = useState(null);

    // Loading and error states
    const [isLoadingCompany, setIsLoadingCompany] = useState(false);
    const [companyError, setCompanyError] = useState(null);

    // Toast notifications state
    const [toasts, setToasts] = useState([]);

    // Component health check state
    const [componentHealth, setComponentHealth] = useState({
        parties: 'unknown',
        sales: 'unknown',
        quotations: 'unknown',
        purchases: 'unknown',
        purchaseOrders: 'unknown',
        inventory: 'unknown'
    });

    // ✅ ENHANCED: Update view when URL changes with better logging
    useEffect(() => {
        const newView = getViewFromPath();
        console.log('🔄 HomePage - View change detected:', {
            oldView: currentView,
            newView,
            pathname: location.pathname
        });
        setCurrentView(newView);
    }, [location.pathname, currentView]);

    // ✅ ENHANCED: Update company state with better error handling
    useEffect(() => {
        console.log('🏢 HomePage - Company effect triggered:', {
            companyId,
            companiesCount: companies.length,
            propCurrentCompany: propCurrentCompany?.name || propCurrentCompany?.businessName
        });

        if (companyId && companies.length > 0) {
            const foundCompany = companies.find(c =>
                (c.id || c._id) === companyId
            );

            if (foundCompany) {
                console.log('✅ Company found in companies list:', foundCompany.name || foundCompany.businessName);
                setCurrentCompany(foundCompany);
                setCompanyError(null);
            } else if (propCurrentCompany && (propCurrentCompany.id || propCurrentCompany._id) === companyId) {
                console.log('✅ Using prop company:', propCurrentCompany.name || propCurrentCompany.businessName);
                setCurrentCompany(propCurrentCompany);
                setCompanyError(null);
            } else {
                console.log('❌ Company not found:', companyId);
                setCompanyError(`Company with ID ${companyId} not found`);
            }
        } else if (propCurrentCompany) {
            console.log('✅ Using prop company (no URL companyId):', propCurrentCompany.name || propCurrentCompany.businessName);
            setCurrentCompany(propCurrentCompany);
            setCompanyError(null);
        } else {
            console.log('⚠️ No company available');
        }
    }, [companyId, companies, propCurrentCompany]);

    // ✅ ENHANCED: Toast notification helper with better management
    const addToast = useCallback((message, type = 'info', duration = 5000) => {
        const id = Date.now() + Math.random();
        const toast = { id, message, type, duration };

        console.log('🍞 Adding toast:', { message, type, duration });
        setToasts(prev => [...prev.slice(-4), toast]); // Keep only last 5 toasts

        // Auto remove toast after duration
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    // Remove toast manually
    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // ✅ FIXED: Health check for components with proper API calls
    const performHealthCheck = useCallback(async () => {
        if (!isOnline || !currentCompany?.id) return;

        console.log('🔍 Performing health check for company:', currentCompany.name || currentCompany.businessName);

        try {
            // Test parties service
            try {
                await partyService.getParties({ limit: 1 });
                setComponentHealth(prev => ({ ...prev, parties: 'healthy' }));
            } catch (error) {
                console.warn('Parties health check failed:', error);
                setComponentHealth(prev => ({ ...prev, parties: 'error' }));
            }

            // ✅ FIXED: Test quotations using saleOrderService with proper companyId
            try {
                const companyId = currentCompany.id || currentCompany._id;
                await saleOrderService.getQuotations(companyId, { limit: 1 });
                setComponentHealth(prev => ({ ...prev, quotations: 'healthy' }));
            } catch (error) {
                console.warn('Quotations health check failed:', error);
                setComponentHealth(prev => ({ ...prev, quotations: 'error' }));
            }

            // ✅ FIXED: Test sales service with proper query parameters
            try {
                const companyId = currentCompany.id || currentCompany._id;
                await salesService.getInvoices({
                    companyId: companyId,
                    limit: 1
                });
                setComponentHealth(prev => ({ ...prev, sales: 'healthy' }));
            } catch (error) {
                console.warn('Sales health check failed:', error);
                setComponentHealth(prev => ({ ...prev, sales: 'error' }));
            }

            // ✅ NEW: Test purchase service
            try {
                const companyId = currentCompany.id || currentCompany._id;
                await purchaseService.getPurchases({
                    companyId: companyId,
                    limit: 1
                });
                setComponentHealth(prev => ({ ...prev, purchases: 'healthy' }));
            } catch (error) {
                console.warn('Purchases health check failed:', error);
                setComponentHealth(prev => ({ ...prev, purchases: 'error' }));
            }

        } catch (error) {
            console.warn('Health check failed:', error);
        }
    }, [isOnline, currentCompany]);

    // Perform health check when company changes or comes online
    useEffect(() => {
        if (currentCompany?.id && isOnline) {
            performHealthCheck();
        }
    }, [currentCompany, isOnline, performHealthCheck]);

    // ✅ ENHANCED: Handle navigation changes with better error handling
    const handleNavigation = useCallback((page) => {
        console.log('🧭 Navigation requested:', page);

        if (!currentCompany?.id && !currentCompany?._id) {
            addToast('Please select a company first to access this feature', 'warning', 5000);
            return;
        }

        const companyId = currentCompany.id || currentCompany._id;

        // ✅ ENHANCED: Map views to URL paths with comprehensive mapping
        const viewPathMap = {
            // Dashboard & Day Book
            'dailySummary': 'dashboard',
            'transactions': 'transactions',
            'cashAndBank': 'cash-bank',

            // Parties
            'parties': 'parties',

            // Sales - Enhanced mapping
            'invoices': 'sales',
            'quotations': 'quotations',
            'salesOrders': 'sales-orders',

            // Purchase
            'allPurchases': 'purchases',
            'purchaseBills': 'purchase-bills',
            'purchaseOrder': 'purchase-orders',
            'purchaseOrders': 'purchase-orders',

            // Inventory
            'inventory': 'inventory',
            'allProducts': 'products',
            'lowStock': 'low-stock',
            'stockMovement': 'stock-movement',

            // Bank & Cash
            'bankAccounts': 'bank-accounts',
            'cashAccounts': 'cash-accounts',
            'bankTransactions': 'bank-transactions',
            'bankReconciliation': 'bank-reconciliation',
            'cashFlow': 'cash-flow',

            // Other
            'staff': 'staff',
            'insights': 'insights',
            'reports': 'reports',
            'settings': 'settings',

            // Form routes - Enhanced
            'createInvoice': 'sales/add',
            'createQuotation': 'quotations/add',
            'createSalesOrder': 'sales-orders/add',
            'createPurchase': 'purchases/add',
            'createPurchaseOrder': 'purchase-orders/add'
        };

        const urlPath = viewPathMap[page] || 'dashboard';
        const newPath = `/companies/${companyId}/${urlPath}`;

        console.log('🎯 Navigating to:', newPath);
        navigate(newPath);
    }, [currentCompany, navigate, addToast]);

    // ✅ ENHANCED: Handle company change with better validation
    const handleCompanyChange = useCallback(async (company) => {
        console.log('🏢 Company change requested:', company?.name || company?.businessName);
        setIsLoadingCompany(true);
        setCompanyError(null);

        try {
            // Validate company data
            if (company && (!company.id && !company._id)) {
                throw new Error('Invalid company data: missing ID');
            }

            setCurrentCompany(company);

            if (company) {
                const companyName = company.businessName || company.name;
                addToast(`Company changed to ${companyName}`, 'success', 3000);

                // Navigate to new company's dashboard
                const companyId = company.id || company._id;
                navigate(`/companies/${companyId}/dashboard`);
            }

            // Propagate to parent
            if (onCompanyChange) {
                onCompanyChange(company);
            }

        } catch (error) {
            console.error('❌ Company change failed:', error);
            setCompanyError(error.message);
            addToast('Failed to change company: ' + error.message, 'error', 5000);
        } finally {
            setIsLoadingCompany(false);
        }
    }, [onCompanyChange, addToast, navigate]);

    // ✅ ENHANCED: Handle sales invoice save with better error handling
    const handleSaveInvoice = useCallback(async (invoiceData) => {
        console.log('💾 Saving invoice:', invoiceData);
        try {
            const result = await salesService.createInvoice(invoiceData);

            if (result && result.success) {
                addToast('Invoice created successfully!', 'success', 5000);

                // Navigate back to invoices list after a short delay
                setTimeout(() => {
                    const companyId = currentCompany.id || currentCompany._id;
                    navigate(`/companies/${companyId}/sales`);
                }, 1500);

                return result;
            } else {
                throw new Error(result?.message || result?.error || 'Failed to create invoice');
            }

        } catch (error) {
            console.error('❌ Invoice save failed:', error);
            addToast(`Error creating invoice: ${error.message}`, 'error', 8000);
            throw error;
        }
    }, [addToast, currentCompany, navigate]);

    // ✅ ENHANCED: Handle purchase form save with transaction support
    const handleSavePurchase = useCallback(async (purchaseData) => {
        console.log('💾 Saving purchase:', purchaseData);
        try {
            // Call the purchase service with transaction support
            const result = await purchaseService.createPurchaseWithTransaction(purchaseData);

            if (result && result.success) {
                addToast('Purchase created successfully!', 'success');

                // Navigate back to purchase bills
                const companyId = currentCompany.id || currentCompany._id;
                navigate(`/companies/${companyId}/purchase-bills`);

                return result;
            } else {
                throw new Error(result?.message || 'Failed to create purchase');
            }

        } catch (error) {
            console.error('❌ Purchase save failed:', error);
            addToast(`Error creating purchase: ${error.message}`, 'error');
            throw error;
        }
    }, [currentCompany, addToast, navigate]);

    // ✅ ENHANCED: Handle purchase order form save
    const handleSavePurchaseOrder = useCallback(async (purchaseOrderData) => {
        console.log('💾 Saving purchase order:', purchaseOrderData);
        try {
            addToast('Purchase order created successfully!', 'success');
            // Navigate back to purchase orders
            handleNavigation('purchaseOrder');
        } catch (error) {
            console.error('❌ Purchase order save failed:', error);
            addToast(`Error saving purchase order: ${error.message}`, 'error');
            throw error;
        }
    }, [handleNavigation, addToast]);

    // ✅ FIXED: Handle quotation save using saleOrderService
    const handleSaveQuotation = useCallback(async (orderData, status) => {
        console.log('💾 HomePage: Saving quotation using saleOrderService:', { orderData, status });

        try {
            // Transform orderData to quotation format
            const quotationData = {
                ...orderData,
                orderType: 'quotation', // ✅ CRITICAL: Set orderType to quotation
                quotationStatus: status || orderData.quotationStatus || 'draft',
                documentType: 'quotation',
                mode: 'quotations',
                quotationNumber: orderData.quotationNumber || orderData.orderNumber,
                quotationDate: orderData.quotationDate || orderData.orderDate,
                companyId: currentCompany?.id || currentCompany?._id,
                status: status || 'draft'
            };

            console.log('✅ Transformed quotation data for saleOrderService:', quotationData);

            // ✅ FIXED: Use saleOrderService.createSalesOrder with quotation orderType
            const result = await saleOrderService.createSalesOrder(quotationData);

            if (result && result.success) {
                addToast(`Quotation ${status === 'confirmed' ? 'confirmed' : 'saved'} successfully!`, 'success');

                // Navigate back to quotations after a short delay
                setTimeout(() => {
                    handleNavigation('quotations');
                }, 1000);

                return { success: true, data: result.data || quotationData };
            } else {
                throw new Error(result?.message || 'Failed to save quotation');
            }

        } catch (error) {
            console.error('❌ Error saving quotation:', error);
            addToast(`Error saving quotation: ${error.message}`, 'error');
            throw error;
        }
    }, [handleNavigation, addToast, currentCompany]);

    // ✅ ENHANCED: Handle sales order save using saleOrderService
    const handleSaveSalesOrder = useCallback(async (orderData, status) => {
        console.log('💾 Saving sales order using saleOrderService:', { orderData, status });
        try {
            // Transform orderData to sales order format
            const salesOrderData = {
                ...orderData,
                orderType: 'sales_order', // ✅ CRITICAL: Set orderType to sales_order
                status: status || 'draft',
                companyId: currentCompany?.id || currentCompany?._id
            };

            const result = await saleOrderService.createSalesOrder(salesOrderData);

            if (result && result.success) {
                addToast(`Sales order ${status === 'confirmed' ? 'confirmed' : 'saved'} successfully!`, 'success');
                // Navigate back to sales orders
                handleNavigation('salesOrders');
                return result;
            } else {
                throw new Error(result?.message || 'Failed to save sales order');
            }
        } catch (error) {
            console.error('❌ Sales order save failed:', error);
            addToast(`Error saving sales order: ${error.message}`, 'error');
            throw error;
        }
    }, [handleNavigation, addToast, currentCompany]);

    // ✅ ENHANCED: Common props with saleOrderService
    const commonProps = {
        currentCompany,
        currentUser,
        onNavigate: handleNavigation,
        onCompanyChange: handleCompanyChange,
        isOnline,
        lastChecked, // ✅ NEW: Add last checked time for connectivity
        addToast,
        companyId: currentCompany?.id || currentCompany?._id,
        // Additional props for enhanced functionality
        componentHealth,
        saleOrderService // ✅ FIXED: Pass saleOrderService instead of quotationService
    };

    // Render loading state
    const renderLoadingState = (message = 'Loading...') => (
        <div className="homepage-container">
            <Container className="d-flex justify-content-center align-items-center min-vh-100">
                <Loading message={message} size="lg" />
            </Container>
        </div>
    );

    // Render error state
    const renderErrorState = (error, onRetry = null) => (
        <div className="homepage-container">
            <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100">
                <FontAwesomeIcon icon={faExclamationTriangle} size="3x" className="text-danger mb-3" />
                <h4 className="text-danger">Something went wrong</h4>
                <p className="text-muted text-center mb-3">{error}</p>
                {onRetry && (
                    <button className="btn btn-outline-primary" onClick={onRetry}>
                        Try Again
                    </button>
                )}
            </Container>
        </div>
    );

    // Render no company selected state for components that require it
    const renderNoCompanyState = (componentName) => (
        <div className="homepage-container">
            <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100">
                <FontAwesomeIcon icon={faBuilding} size="3x" className="text-muted mb-3" />
                <h4 className="text-muted">No Company Selected</h4>
                <p className="text-muted text-center">
                    Please select a company from the header to access {componentName}.
                </p>
                <small className="text-muted">
                    You can create a new company or select an existing one from the company dropdown in the header.
                </small>
            </Container>
        </div>
    );

    // ✅ ENHANCED: Check if component requires company with more views
    const requiresCompany = (viewName) => {
        const companyRequiredViews = [
            // Inventory
            'inventory', 'allProducts', 'lowStock', 'stockMovement',
            // Sales
            'quotations', 'invoices', 'salesOrders',
            // Purchase
            'purchaseBills', 'purchaseOrder', 'allPurchases', 'purchaseOrders',
            // Bank & Cash
            'bankAccounts', 'cashAccounts', 'bankTransactions',
            'bankReconciliation', 'cashFlow',
            // Parties
            'parties',
            // Form routes
            'createPurchase', 'createInvoice', 'createPurchaseOrder',
            'createQuotation', 'createSalesOrder',
            // Edit routes
            'editSalesInvoice', 'editQuotation', 'editSalesOrder'
        ];
        return companyRequiredViews.includes(viewName);
    };

    // ✅ ENHANCED: Render the appropriate component based on the current view
    const renderContent = () => {
        console.log('🎨 Rendering content for view:', currentView);

        // Show loading state if company is being loaded
        if (isLoadingCompany) {
            return renderLoadingState('Loading company data...');
        }

        // Show error state if there's a company error
        if (companyError) {
            return renderErrorState(companyError, () => {
                setCompanyError(null);
                if (currentCompany) {
                    handleCompanyChange(currentCompany);
                }
            });
        }

        // Check if current view requires a company and if we don't have one
        if (requiresCompany(currentView) && !currentCompany?.id && !currentCompany?._id) {
            const componentNameMap = {
                // Inventory
                'inventory': 'Inventory Management',
                'allProducts': 'Products & Services',
                'lowStock': 'Low Stock Items',
                'stockMovement': 'Stock Movement',
                // Sales
                'quotations': 'Quotations',
                'salesOrders': 'Sales Orders',
                'invoices': 'Sales Invoices',
                // Purchase
                'purchaseBills': 'Purchase Bills',
                'purchaseOrder': 'Purchase Orders',
                'allPurchases': 'Purchase Management',
                'purchaseOrders': 'Purchase Orders',
                // Bank & Cash
                'bankAccounts': 'Bank Accounts',
                'cashAccounts': 'Cash Accounts',
                'bankTransactions': 'Bank Transactions',
                'bankReconciliation': 'Bank Reconciliation',
                'cashFlow': 'Cash Flow',
                // Parties
                'parties': 'Parties Management',
                // Form routes
                'createPurchase': 'Create Purchase',
                'createInvoice': 'Create Sales Invoice',
                'createPurchaseOrder': 'Create Purchase Order',
                'createQuotation': 'Create Quotation',
                'createSalesOrder': 'Create Sales Order',
                // Edit routes
                'editSalesInvoice': 'Edit Sales Invoice',
                'editQuotation': 'Edit Quotation',
                'editSalesOrder': 'Edit Sales Order'
            };

            return renderNoCompanyState(componentNameMap[currentView] || 'this feature');
        }

        // Wrap each component in error boundary for better error handling
        const wrapWithErrorBoundary = (component) => (
            <ErrorBoundary>
                {component}
            </ErrorBoundary>
        );

        switch (currentView) {
            // Day Book cases
            case 'dailySummary':
            case 'transactions':
            case 'cashAndBank':
                return wrapWithErrorBoundary(
                    <DayBook view={currentView} {...commonProps} />
                );

            // Parties case
            case 'parties':
                return wrapWithErrorBoundary(
                    <Parties {...commonProps} />
                );

            // ✅ FIXED: Sales cases with proper component usage
            case 'quotations':
                return wrapWithErrorBoundary(
                    <Quotations
                        view="quotations"
                        {...commonProps}
                        onNavigate={handleNavigation}
                        onSave={handleSaveQuotation}
                        useAdvancedForm={false} // ✅ Use page navigation by default
                    />
                );

            case 'invoices':
                return wrapWithErrorBoundary(
                    <Sales
                        view="invoices"
                        {...commonProps}
                        onSave={handleSaveInvoice}
                    />
                );

            case 'salesOrders':
                return wrapWithErrorBoundary(
                    <Sales
                        view="salesOrders"
                        {...commonProps}
                        onSave={handleSaveSalesOrder}
                    />
                );

            // ✅ ENHANCED: Edit cases with better props
            case 'editSalesInvoice':
                return wrapWithErrorBoundary(
                    <EditSalesInvoice
                        {...commonProps}
                        onSave={handleSaveInvoice}
                        onCancel={() => handleNavigation('invoices')}
                    />
                );

            case 'editQuotation':
                return wrapWithErrorBoundary(
                    <EditQuotation
                        {...commonProps}
                        onSave={handleSaveQuotation}
                        onCancel={() => handleNavigation('quotations')}
                    />
                );

            case 'editSalesOrder':
                return wrapWithErrorBoundary(
                    <EditSalesOrder
                        {...commonProps}
                        orderType="sales_order"
                        onSave={handleSaveSalesOrder}
                        onCancel={() => handleNavigation('salesOrders')}
                    />
                );

            // Purchase cases
            case 'purchaseOrder':
                return wrapWithErrorBoundary(
                    <PurchaseOrder {...commonProps} />
                );

            // Other purchase cases handled by PurchaseOrders component
            case 'purchaseBills':
            case 'allPurchases':
            case 'purchaseOrders':
                return wrapWithErrorBoundary(
                    <PurchaseOrders view={currentView} {...commonProps} />
                );

            // ✅ FIXED: Form cases with page mode support
            case 'createPurchase':
                return wrapWithErrorBoundary(
                    <PurchaseForm
                        onSave={handleSavePurchase}
                        onCancel={() => {
                            const companyId = currentCompany.id || currentCompany._id;
                            navigate(`/companies/${companyId}/purchase-bills`);
                        }}
                        onExit={() => {
                            const companyId = currentCompany.id || currentCompany._id;
                            navigate(`/companies/${companyId}/purchase-bills`);
                        }}
                        inventoryItems={[]}
                        categories={[]}
                        bankAccounts={[]}
                        {...commonProps}
                    />
                );

            case 'createInvoice':
                return wrapWithErrorBoundary(
                    <div className="placeholder-content">
                        <Container className="py-5 text-center">
                            <h3>Create Sales Invoice</h3>
                            <p className="text-muted">Sales invoice form is handled within the Sales component</p>
                            <button
                                className="btn btn-primary mt-3"
                                onClick={() => handleNavigation('invoices')}
                            >
                                Go to Invoices
                            </button>
                            <small className="text-muted d-block mt-2">
                                Current Company: {currentCompany?.businessName || currentCompany?.name}
                            </small>
                        </Container>
                    </div>
                );

            // ✅ FIXED: Enhanced quotation form with page mode (like purchase order)
            case 'createQuotation':
                console.log('🎯 Rendering createQuotation as full page (like purchase order)');
                return wrapWithErrorBoundary(
                    <SalesOrderForm
                        // ✅ CRITICAL: Enable page mode like purchase order
                        isPageMode={true}
                        show={true} // Always show in page mode
                        onHide={() => {
                            console.log('🔄 Quotation form closed, navigating back to quotations');
                            handleNavigation('quotations');
                        }}
                        onCancel={() => {
                            console.log('🔄 Quotation form cancelled, navigating back to quotations');
                            handleNavigation('quotations');
                        }}
                        onSaveOrder={handleSaveQuotation}
                        orderType="quotation"
                        editMode={false}
                        // ✅ CRITICAL: Add these props to identify it as a quotation
                        mode="quotations"
                        documentType="quotation"
                        formType="quotation"
                        isQuotationMode={true}
                        // Common props
                        {...commonProps}
                        // Additional quotation-specific props
                        title="Create New Quotation"
                        submitButtonText="Save Quotation"
                        enableQuotationFields={true}
                        // Enhanced props for better functionality
                        defaultQuotationValidity={30}
                        quotationStatuses={['draft', 'sent', 'accepted', 'declined', 'expired']}
                        // ✅ Service props for order number generation
                        orderService={saleOrderService}
                    />
                );

            case 'createSalesOrder':
                return wrapWithErrorBoundary(
                    <SalesOrderForm
                        // ✅ CRITICAL: Enable page mode 
                        isPageMode={true}
                        show={true} // Always show in page mode
                        onHide={() => handleNavigation('salesOrders')}
                        onCancel={() => handleNavigation('salesOrders')}
                        onSaveOrder={handleSaveSalesOrder}
                        orderType="sales_order"
                        editMode={false}
                        mode="sales_orders"
                        documentType="sales_order"
                        formType="sales_order"
                        {...commonProps}
                        orderService={saleOrderService}
                    />
                );

            case 'createPurchaseOrder':
                return wrapWithErrorBoundary(
                    <PurchaseOrderForm
                        onSave={handleSavePurchaseOrder}
                        onCancel={() => handleNavigation('purchaseOrder')}
                        {...commonProps}
                    />
                );

            // Bank & Cash cases
            case 'bankAccounts':
                return wrapWithErrorBoundary(
                    <Bank view="bankAccounts" activeType="bank" {...commonProps} />
                );
            case 'cashAccounts':
                return wrapWithErrorBoundary(
                    <Bank view="cashAccounts" activeType="cash" {...commonProps} />
                );
            case 'bankTransactions':
                return wrapWithErrorBoundary(
                    <Bank view="bankTransactions" {...commonProps} />
                );
            case 'bankReconciliation':
                return wrapWithErrorBoundary(
                    <Bank view="bankReconciliation" {...commonProps} />
                );
            case 'cashFlow':
                return wrapWithErrorBoundary(
                    <Bank view="cashFlow" {...commonProps} />
                );

            // Inventory cases
            case 'inventory':
            case 'allProducts':
            case 'lowStock':
            case 'stockMovement':
                return wrapWithErrorBoundary(
                    <Inventory view={currentView} {...commonProps} />
                );

            // Staff Management case
            case 'staff':
                return wrapWithErrorBoundary(
                    <StaffManagement view={currentView} {...commonProps} />
                );

            // Other cases
            case 'insights':
                return wrapWithErrorBoundary(
                    <div className="placeholder-content">
                        <Container className="py-5 text-center">
                            <h3>Insights Dashboard</h3>
                            <p className="text-muted">Business insights and analytics coming soon...</p>
                            {currentCompany && (
                                <small className="text-muted">
                                    Current Company: {currentCompany.businessName || currentCompany.name}
                                </small>
                            )}
                        </Container>
                    </div>
                );

            case 'reports':
                return wrapWithErrorBoundary(
                    <div className="placeholder-content">
                        <Container className="py-5 text-center">
                            <h3>Reports & Analytics</h3>
                            <p className="text-muted">Comprehensive reporting tools coming soon...</p>
                            {currentCompany && (
                                <small className="text-muted">
                                    Current Company: {currentCompany.businessName || currentCompany.name}
                                </small>
                            )}
                        </Container>
                    </div>
                );

            case 'settings':
                return wrapWithErrorBoundary(
                    <div className="placeholder-content">
                        <Container className="py-5 text-center">
                            <h3>Settings</h3>
                            <p className="text-muted">Application settings and configuration...</p>
                            {currentCompany && (
                                <small className="text-muted">
                                    Current Company: {currentCompany.businessName || currentCompany.name}
                                </small>
                            )}
                        </Container>
                    </div>
                );

            // Default case
            default:
                console.log('🔄 Falling back to default view (dailySummary)');
                return wrapWithErrorBoundary(
                    <DayBook view="dailySummary" {...commonProps} />
                );
        }
    };

    return (
        <div className="homepage-container">
            {/* Online/Offline Indicator */}
            <div className="position-fixed top-0 end-0 m-3" style={{ zIndex: 1050 }}>
                <div className={`badge ${isOnline ? 'bg-success' : 'bg-danger'}`}>
                    <FontAwesomeIcon icon={isOnline ? faWifi : faTimesCircle} className="me-1" />
                    {isOnline ? 'Online' : 'Offline'}
                </div>
                {lastChecked && (
                    <div className="small text-muted mt-1">
                        Last checked: {new Date(lastChecked).toLocaleTimeString()}
                    </div>
                )}
            </div>

            {/* Toast Notifications */}
            <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1055 }}>
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        show={true}
                        onClose={() => removeToast(toast.id)}
                        delay={toast.duration}
                        autohide
                        className={`border-${toast.type === 'success' ? 'success' :
                            toast.type === 'error' ? 'danger' :
                                toast.type === 'warning' ? 'warning' : 'info'
                            }`}
                    >
                        <Toast.Header className={`bg-${toast.type === 'success' ? 'success' :
                            toast.type === 'error' ? 'danger' :
                                toast.type === 'warning' ? 'warning' : 'info'
                            } text-white`}>
                            <FontAwesomeIcon
                                icon={
                                    toast.type === 'success' ? faCheckCircle :
                                        toast.type === 'error' ? faExclamationTriangle :
                                            toast.type === 'warning' ? faExclamationTriangle : faInfoCircle
                                }
                                className="me-2"
                            />
                            <strong className="me-auto">
                                {toast.type === 'success' ? 'Success' :
                                    toast.type === 'error' ? 'Error' :
                                        toast.type === 'warning' ? 'Warning' : 'Info'}
                            </strong>
                        </Toast.Header>
                        <Toast.Body>{toast.message}</Toast.Body>
                    </Toast>
                ))}
            </ToastContainer>

            {/* Main Content */}
            {renderContent()}
        </div>
    );
}

export default HomePage;