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
import SalesOrders from '../components/Home/SalesOrders';
// ❌ REMOVED: import Purchases from '../components/Home/Purchases';
import Inventory from '../components/Home/Inventory';
import StaffManagement from '../components/Home/StaffManagement';
import PurchaseOrders from '../components/Home/PurchaseOrders'; // ✅ This will handle all purchase-related views
import Bank from '../components/Home/Bank';

// Import services
import companyService from '../services/companyService';
import partyService from '../services/partyService';

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
    // Get URL parameters
    const { companyId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Extract view from URL path
    const getViewFromPath = () => {
        const pathParts = location.pathname.split('/');
        const lastPart = pathParts[pathParts.length - 1];

        // Map URL paths to views - Updated to use PurchaseOrders for all purchase views
        const pathViewMap = {
            'dashboard': 'dailySummary',
            'daybook': 'dailySummary',
            'transactions': 'transactions',
            'cash-bank': 'cashAndBank',
            'parties': 'parties',
            'sales': 'allSales',
            'invoices': 'invoices',
            'credit-notes': 'creditNotes',
            'sales-orders': 'salesOrders',
            // ✅ UPDATED: All purchase routes now map to purchase-related views
            'purchases': 'allPurchases',
            'purchase-bills': 'purchaseBills',
            'purchase-orders': 'purchaseOrders',
            'inventory': 'inventory',
            'products': 'allProducts',
            'low-stock': 'lowStock',
            'stock-movement': 'stockMovement',
            'bank-accounts': 'bankAccounts',
            'cash-accounts': 'cashAccounts',
            'bank-transactions': 'bankTransactions',
            'bank-reconciliation': 'bankReconciliation',
            'cash-flow': 'cashFlow',
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
        purchaseOrders: 'unknown', // ✅ UPDATED: Changed from 'purchases' to 'purchaseOrders'
        inventory: 'unknown'
    });

    // Update view when URL changes
    useEffect(() => {
        const newView = getViewFromPath();
        console.log('🧭 HomePage: URL changed, updating view to:', newView);
        setCurrentView(newView);
    }, [location.pathname]);

    // Update company when companyId in URL changes or when prop changes
    useEffect(() => {
        if (companyId && companies.length > 0) {
            console.log('🏢 HomePage: Looking for company with ID:', companyId);

            const foundCompany = companies.find(c =>
                (c.id || c._id) === companyId
            );

            if (foundCompany) {
                console.log('✅ Company found in URL:', foundCompany.businessName || foundCompany.name);
                setCurrentCompany(foundCompany);
                setCompanyError(null);
            } else if (propCurrentCompany && (propCurrentCompany.id || propCurrentCompany._id) === companyId) {
                console.log('✅ Using company from props:', propCurrentCompany.businessName || propCurrentCompany.name);
                setCurrentCompany(propCurrentCompany);
                setCompanyError(null);
            } else {
                console.warn('⚠️ Company not found for ID:', companyId);
                setCompanyError(`Company with ID ${companyId} not found`);
            }
        } else if (propCurrentCompany) {
            console.log('🏢 HomePage: Using company from props:', propCurrentCompany.businessName || propCurrentCompany.name);
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
                console.warn('Parties service health check failed:', error);
                setComponentHealth(prev => ({ ...prev, parties: 'error' }));
            }

            // Add other service health checks here as they're implemented

        } catch (error) {
            console.error('Health check failed:', error);
        }
    }, [isOnline, currentCompany]);

    // Perform health check when company changes or comes online
    useEffect(() => {
        if (currentCompany?.id && isOnline) {
            performHealthCheck();
        }
    }, [currentCompany, isOnline, performHealthCheck]);

    // Handle navigation changes - Updated to work with new routing system
    const handleNavigation = useCallback((page) => {
        console.log('🧭 HomePage: Navigating to:', page);

        if (!currentCompany?.id && !currentCompany?._id) {
            addToast('Please select a company first to access this feature', 'warning', 5000);
            return;
        }

        const companyId = currentCompany.id || currentCompany._id;

        // Map views to URL paths - Updated to match new routing
        const viewPathMap = {
            'dailySummary': 'dashboard',
            'transactions': 'transactions',
            'cashAndBank': 'cash-bank',
            'parties': 'parties',
            'allSales': 'sales',
            'invoices': 'invoices',
            'creditNotes': 'credit-notes',
            'salesOrders': 'sales-orders',
            'allPurchases': 'purchases',
            'purchaseBills': 'purchase-bills',
            'purchaseOrders': 'purchase-orders',
            'inventory': 'inventory',
            'allProducts': 'products',
            'lowStock': 'low-stock',
            'stockMovement': 'stock-movement',
            'bankAccounts': 'bank-accounts',
            'cashAccounts': 'cash-accounts',
            'bankTransactions': 'bank-transactions',
            'bankReconciliation': 'bank-reconciliation',
            'cashFlow': 'cash-flow',
            'staff': 'staff',
            'insights': 'insights',
            'reports': 'reports',
            'settings': 'settings',
            // Form routes - Navigate to dedicated form pages
            'createInvoice': 'sales/add',
            'createPurchase': 'purchases/add',
            'createSalesOrder': 'sales-orders/add',
            'createPurchaseOrder': 'purchase-orders/add'
        };

        const urlPath = viewPathMap[page] || 'dashboard';
        navigate(`/companies/${companyId}/${urlPath}`);
    }, [currentCompany, navigate, addToast]);

    // Handle company change from child components
    const handleCompanyChange = useCallback(async (company) => {
        console.log('🏢 HomePage: Company changed from child component:', company);

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
            console.error('Error changing company:', error);
            setCompanyError(error.message);
            addToast('Failed to change company: ' + error.message, 'error', 5000);
        } finally {
            setIsLoadingCompany(false);
        }
    }, [onCompanyChange, addToast, navigate]);

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

    // Check if component requires company - Updated list
    const requiresCompany = (viewName) => {
        const companyRequiredViews = [
            'inventory', 'allProducts', 'lowStock', 'stockMovement',
            'allSales', 'invoices', 'creditNotes',
            'salesOrders',
            'purchaseBills', 'paymentOut', 'expenses', 'purchaseOrder',
            'purchaseReturn', 'allPurchases', 'purchaseOrders',
            'bankAccounts', 'cashAccounts', 'bankTransactions',
            'bankReconciliation', 'cashFlow',
            'parties'
        ];
        return companyRequiredViews.includes(viewName);
    };

    // Render the appropriate component based on the current view
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
                'allSales': 'Sales Management',
                'invoices': 'Sales Invoices',
                'creditNotes': 'Credit Notes',
                'salesOrders': 'Sales Orders',
                'purchaseBills': 'Purchase Bills',
                'paymentOut': 'Payment Out',
                'expenses': 'Expenses',
                'purchaseOrder': 'Purchase Orders',
                'purchaseReturn': 'Purchase Returns',
                'allPurchases': 'Purchase Management',
                'purchaseOrders': 'Purchase Orders',
                'bankAccounts': 'Bank Accounts',
                'cashAccounts': 'Cash Accounts',
                'bankTransactions': 'Bank Transactions',
                'bankReconciliation': 'Bank Reconciliation',
                'cashFlow': 'Cash Flow',
                'parties': 'Parties Management'
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

            // Sales cases - Only list views, forms handled by dedicated routes
            case 'allSales':
            case 'invoices':
            case 'creditNotes':
                return wrapWithErrorBoundary(
                    <Sales view={currentView} {...commonProps} />
                );

            // Sales Orders cases
            case 'salesOrders':
                return wrapWithErrorBoundary(
                    <SalesOrders view={currentView} {...commonProps} />
                );

            // ✅ UPDATED: Purchase cases - All handled by PurchaseOrders component
            case 'purchaseBills':
            case 'paymentOut':
            case 'expenses':
            case 'purchaseOrder':
            case 'purchaseReturn':
            case 'allPurchases':
            case 'purchaseOrders':
                return wrapWithErrorBoundary(
                    <PurchaseOrders view={currentView} {...commonProps} />
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