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

// Import the components - UPDATED: Added PurchaseOrderForm
import DayBook from '../components/Home/DayBook';
import Parties from '../components/Home/Parties';
import Sales from '../components/Home/Sales';
import SalesOrderForm from '../components/Home/Sales/SalesOrder/SalesOrderForm';
import Inventory from '../components/Home/Inventory';
import StaffManagement from '../components/Home/StaffManagement';
import PurchaseOrders from '../components/Home/PurchaseOrders';
import Bank from '../components/Home/Bank';

// ✅ NEW: Import PurchaseOrder component
import PurchaseOrder from '../components/Home/Purchases/PurchaseOrder';

// ✅ NEW: Import PurchaseOrderForm for direct page rendering
import PurchaseOrderForm from '../components/Home/Purchases/PurchaseOrderForm';

// Import form components
import PurchaseForm from '../components/Home/Purchases/PurchaseForm';

// Import services
import companyService from '../services/companyService';
import partyService from '../services/partyService';
import purchaseService from '../services/purchaseService';
// ✅ CRITICAL FIX: Add salesService import
import salesService from '../services/salesService';

// Import utility components
import ErrorBoundary from '../components/ErrorBoundary';
import Loading from '../components/Loading';

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

    const getViewFromPath = () => {
        const pathParts = location.pathname.split('/');
        const lastPart = pathParts[pathParts.length - 1];
        const secondLastPart = pathParts[pathParts.length - 2];

        // Handle form routes like "purchases/add", "sales/add", "quotations/add", "sales-orders/add"
        if (lastPart === 'add') {
            if (secondLastPart === 'purchases') return 'createPurchase';
            if (secondLastPart === 'sales') return 'createInvoice';
            if (secondLastPart === 'purchase-orders') return 'createPurchaseOrder';
            if (secondLastPart === 'quotations') return 'createQuotation';
            if (secondLastPart === 'sales-orders') return 'createSalesOrder';
        }

        // Map URL paths to views - ✅ UPDATED: Properly map purchase-order URL
        const pathViewMap = {
            'dashboard': 'dailySummary',
            'daybook': 'dailySummary',
            'transactions': 'transactions',
            'cash-bank': 'cashAndBank',
            'parties': 'parties',
            // Sales
            'sales': 'invoices',
            'quotations': 'quotations',
            'sales-orders': 'salesOrders',
            'invoices': 'invoices',
            // Purchase - ✅ UPDATED: Map purchase-order to purchaseOrder
            'purchases': 'allPurchases',
            'purchase-bills': 'purchaseBills',
            'purchase-orders': 'purchaseOrder', // ✅ FIXED: This should map to purchaseOrder view
            // Inventory
            'inventory': 'inventory',
            'products': 'allProducts',
            'low-stock': 'lowStock',
            'stock-movement': 'stockMovement',
            // Bank & Cash
            'bank-accounts': 'bankAccounts',
            'cash-accounts': 'cashAccounts',
            'bank-transactions': 'bankTransactions',
            'bank-reconciliation': 'bankReconciliation',
            'cash-flow': 'cashFlow',
            // Other
            'staff': 'staff',
            'insights': 'insights',
            'reports': 'reports',
            'settings': 'settings'
        };

        return pathViewMap[lastPart] || 'dailySummary';
    };

    // Current view state - derived from URL
    const [currentView, setCurrentView] = useState(getViewFromPath());

    // Company state - use prop or find from companies list
    const [currentCompany, setCurrentCompany] = useState(null);

    // Loading and error states
    const [isLoadingCompany, setIsLoadingCompany] = useState(false);
    const [companyError, setCompanyError] = useState(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Toast notifications state
    const [toasts, setToasts] = useState([]);

    // Component health check state
    const [componentHealth, setComponentHealth] = useState({
        parties: 'unknown',
        sales: 'unknown',
        purchaseOrders: 'unknown',
        inventory: 'unknown'
    });

    // Update view when URL changes
    useEffect(() => {
        const newView = getViewFromPath();
        setCurrentView(newView);
    }, [location.pathname]);

    // Update company when companyId in URL changes or when prop changes
    useEffect(() => {
        if (companyId && companies.length > 0) {
            const foundCompany = companies.find(c =>
                (c.id || c._id) === companyId
            );

            if (foundCompany) {
                setCurrentCompany(foundCompany);
                setCompanyError(null);
            } else if (propCurrentCompany && (propCurrentCompany.id || propCurrentCompany._id) === companyId) {
                setCurrentCompany(propCurrentCompany);
                setCompanyError(null);
            } else {
                setCompanyError(`Company with ID ${companyId} not found`);
            }
        } else if (propCurrentCompany) {
            setCurrentCompany(propCurrentCompany);
            setCompanyError(null);
        }
    }, [companyId, companies, propCurrentCompany]);

    // Add toast notification helper
    const addToast = useCallback((message, type = 'info', duration = 5000) => {
        const id = Date.now() + Math.random();
        const toast = { id, message, type, duration };

        setToasts(prev => [...prev, toast]);

        // Auto remove toast after duration
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    // Remove toast manually
    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Monitor online/offline status
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            addToast('Connection restored', 'success', 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            addToast('Connection lost. Some features may not work.', 'warning', 10000);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [addToast]);

    // Health check for components
    const performHealthCheck = useCallback(async () => {
        if (!isOnline || !currentCompany?.id) return;

        try {
            // Test parties service
            try {
                await partyService.getParties({ limit: 1 });
                setComponentHealth(prev => ({ ...prev, parties: 'healthy' }));
            } catch (error) {
                setComponentHealth(prev => ({ ...prev, parties: 'error' }));
            }

            // Add other service health checks here as they're implemented

        } catch (error) {
            // Silent error handling
        }
    }, [isOnline, currentCompany]);

    // Perform health check when company changes or comes online
    useEffect(() => {
        if (currentCompany?.id && isOnline) {
            performHealthCheck();
        }
    }, [currentCompany, isOnline, performHealthCheck]);

    // Handle navigation changes - ✅ UPDATED: Map purchaseOrder to purchase-orders URL
    const handleNavigation = useCallback((page) => {
        if (!currentCompany?.id && !currentCompany?._id) {
            addToast('Please select a company first to access this feature', 'warning', 5000);
            return;
        }

        const companyId = currentCompany.id || currentCompany._id;

        // Map views to URL paths - ✅ UPDATED: Properly map purchaseOrder to URL
        const viewPathMap = {
            'dailySummary': 'dashboard',
            'transactions': 'transactions',
            'cashAndBank': 'cash-bank',
            'parties': 'parties',
            // Sales
            'invoices': 'sales',
            'quotations': 'quotations',
            'salesOrders': 'sales-orders',
            // Purchase - ✅ UPDATED: Map purchaseOrder to purchase-orders URL
            'allPurchases': 'purchases',
            'purchaseBills': 'purchase-bills',
            'purchaseOrder': 'purchase-orders', // ✅ FIXED: This should map to purchase-orders URL
            'purchaseOrders': 'purchase-orders', // ✅ Keep both for backward compatibility
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
            // Form routes
            'createInvoice': 'sales/add',
            'createQuotation': 'quotations/add',
            'createSalesOrder': 'sales-orders/add',
            'createPurchase': 'purchases/add',
            'createPurchaseOrder': 'purchase-orders/add'
        };

        const urlPath = viewPathMap[page] || 'dashboard';
        const newPath = `/companies/${companyId}/${urlPath}`;

        navigate(newPath);
    }, [currentCompany, navigate, addToast]);

    // Handle company change from child components
    const handleCompanyChange = useCallback(async (company) => {
        setIsLoadingCompany(true);
        setCompanyError(null);

        try {
            // Validate company data
            if (company && (!company.id && !company._id)) {
                throw new Error('Invalid company data: missing ID');
            }

            setCurrentCompany(company);

            if (company) {
                addToast(`Company changed to ${company.businessName || company.name}`, 'success', 3000);

                // Navigate to new company's dashboard
                const companyId = company.id || company._id;
                navigate(`/companies/${companyId}/dashboard`);
            }

            // Propagate to parent
            if (onCompanyChange) {
                onCompanyChange(company);
            }

        } catch (error) {
            setCompanyError(error.message);
            addToast('Failed to change company: ' + error.message, 'error', 5000);
        } finally {
            setIsLoadingCompany(false);
        }
    }, [onCompanyChange, addToast, navigate]);

    // ✅ CRITICAL FIX: Handle sales invoice save
    const handleSaveInvoice = useCallback(async (invoiceData) => {
        try {
            console.log('🏠 HomePage: Handling invoice save:', {
                companyId: invoiceData.companyId,
                customerName: invoiceData.customerName,
                itemCount: invoiceData.items?.length,
                totalAmount: invoiceData.totals?.finalTotal
            });

            // Call your sales service to save the invoice
            const result = await salesService.createInvoice(invoiceData);

            console.log('🏠 HomePage: Sales service result:', result);

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
            console.error('❌ HomePage: Error saving invoice:', error);
            addToast(`Error creating invoice: ${error.message}`, 'error', 8000);
            throw error;
        }
    }, [addToast, currentCompany, navigate]);

    // Handle purchase form save
    const handleSavePurchase = useCallback(async (purchaseData) => {
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
            addToast(`Error creating purchase: ${error.message}`, 'error');
            throw error;
        }
    }, [currentCompany, addToast, navigate]);

    // ✅ NEW: Handle purchase order form save
    const handleSavePurchaseOrder = useCallback(async (purchaseOrderData) => {
        try {
            addToast('Purchase order created successfully!', 'success');
            // Navigate back to purchase orders
            handleNavigation('purchaseOrder');
        } catch (error) {
            addToast(`Error saving purchase order: ${error.message}`, 'error');
            throw error;
        }
    }, [handleNavigation, addToast]);

    // Handle quotation save
    const handleSaveQuotation = useCallback(async (orderData, status) => {
        try {
            addToast(`Quotation ${status === 'confirmed' ? 'confirmed' : 'saved'} successfully!`, 'success');
            // Navigate back to quotations
            handleNavigation('quotations');
        } catch (error) {
            addToast(`Error saving quotation: ${error.message}`, 'error');
            throw error;
        }
    }, [handleNavigation, addToast]);

    // Handle sales order save
    const handleSaveSalesOrder = useCallback(async (orderData, status) => {
        try {
            addToast(`Sales order ${status === 'confirmed' ? 'confirmed' : 'saved'} successfully!`, 'success');
            // Navigate back to sales orders
            handleNavigation('salesOrders');
        } catch (error) {
            addToast(`Error saving sales order: ${error.message}`, 'error');
            throw error;
        }
    }, [handleNavigation, addToast]);

    // Common props to pass to all components
    const commonProps = {
        currentCompany,
        onNavigate: handleNavigation,
        onCompanyChange: handleCompanyChange,
        isOnline,
        addToast,
        companyId: currentCompany?.id || currentCompany?._id
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

    // Check if component requires company - ✅ UPDATED: Removed expenses and purchaseReturn
    const requiresCompany = (viewName) => {
        const companyRequiredViews = [
            'inventory', 'allProducts', 'lowStock', 'stockMovement',
            'quotations', 'invoices', 'salesOrders',
            'purchaseBills', 'purchaseOrder', // ✅ REMOVED: expenses, purchaseReturn
            'allPurchases', 'purchaseOrders',
            'bankAccounts', 'cashAccounts', 'bankTransactions',
            'bankReconciliation', 'cashFlow',
            'parties',
            'createPurchase', 'createInvoice', 'createPurchaseOrder',
            'createQuotation', 'createSalesOrder'
        ];
        return companyRequiredViews.includes(viewName);
    };

    // Render the appropriate component based on the current view - ✅ UPDATED
    const renderContent = () => {
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
                'inventory': 'Inventory Management',
                'allProducts': 'Products & Services',
                'lowStock': 'Low Stock Items',
                'stockMovement': 'Stock Movement',
                'quotations': 'Quotations',
                'salesOrders': 'Sales Orders',
                'invoices': 'Sales Invoices',
                'purchaseBills': 'Purchase Bills',
                'purchaseOrder': 'Purchase Orders', // ✅ UPDATED: Removed expenses, purchaseReturn
                'allPurchases': 'Purchase Management',
                'purchaseOrders': 'Purchase Orders',
                'bankAccounts': 'Bank Accounts',
                'cashAccounts': 'Cash Accounts',
                'bankTransactions': 'Bank Transactions',
                'bankReconciliation': 'Bank Reconciliation',
                'cashFlow': 'Cash Flow',
                'parties': 'Parties Management',
                'createPurchase': 'Create Purchase',
                'createInvoice': 'Create Sales Invoice',
                'createPurchaseOrder': 'Create Purchase Order',
                'createQuotation': 'Create Quotation',
                'createSalesOrder': 'Create Sales Order'
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

            // ✅ CRITICAL FIX: Sales cases - Add onSave prop
            case 'quotations':
                return wrapWithErrorBoundary(
                    <Sales
                        view="quotations"
                        {...commonProps}
                        onNavigate={handleNavigation}
                        onSave={handleSaveInvoice} // ✅ ADD THIS
                    />
                );
            case 'invoices':
            case 'salesOrders':
                return wrapWithErrorBoundary(
                    <Sales
                        view={currentView}
                        {...commonProps}
                        onSave={handleSaveInvoice} // ✅ ADD THIS
                    />
                );

            // ✅ UPDATED: Purchase cases - Separate purchaseOrder from others
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

            // Form cases
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
                        addToast={addToast}
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

            case 'createQuotation':
                return wrapWithErrorBoundary(
                    <SalesOrderForm
                        show={true}
                        onHide={() => handleNavigation('quotations')}
                        onSaveOrder={handleSaveQuotation}
                        orderType="quotation"
                        {...commonProps}
                    />
                );

            case 'createSalesOrder':
                return wrapWithErrorBoundary(
                    <SalesOrderForm
                        show={true}
                        onHide={() => handleNavigation('salesOrders')}
                        onSaveOrder={handleSaveSalesOrder}
                        orderType="sales_order"
                        {...commonProps}
                    />
                );

            // ✅ UPDATED: Purchase Order Form - Now renders as a page instead of placeholder
            case 'createPurchaseOrder':
                return wrapWithErrorBoundary(
                    <PurchaseOrderForm
                        onSave={handleSavePurchaseOrder}
                        onCancel={() => handleNavigation('purchaseOrder')}
                        currentCompany={currentCompany}
                        currentUser={currentUser}
                        companyId={currentCompany?.id || currentCompany?._id}
                        addToast={addToast}
                        onNavigate={handleNavigation}
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