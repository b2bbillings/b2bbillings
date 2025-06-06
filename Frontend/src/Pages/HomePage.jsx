import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Spinner, Container, Toast, ToastContainer } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faExclamationTriangle, 
    faBuilding, 
    faCheckCircle, 
    faInfoCircle,
    faWifi,
    faTimesCircle,     // Use this for offline status
    faExclamationCircle // Alternative for warnings
} from '@fortawesome/free-solid-svg-icons';

// Import the components
import DayBook from '../components/Home/DayBook';
import Parties from '../components/Home/Parties';
import Sales from '../components/Home/Sales';
import SalesOrders from '../components/Home/SalesOrders';
import Purchases from '../components/Home/Purchases';
import Inventory from '../components/Home/Inventory';
import StaffManagement from '../components/Home/StaffManagement';
import PurchaseOrders from '../components/Home/PurchaseOrders';
import Bank from '../components/Home/Bank';

// Import services
import companyService from '../services/companyService';
import partyService from '../services/partyService';

// Import utility components
import ErrorBoundary from '../components/ErrorBoundary';
import Loading from '../components/Loading';

import './HomePage.css';

/**
 * HomePage component that serves as the main container for the application
 * Manages which view is currently active and passes that to child components
 * Also manages the current company context for all child components
 */
function HomePage({
    onNavigate,
    currentView: propCurrentView,
    currentCompany: propCurrentCompany,
    onCompanyChange
}) {
    // Current view state - tracks which component is being displayed
    const [currentView, setCurrentView] = useState(propCurrentView || 'dailySummary');

    // Company state - tracks current selected company
    const [currentCompany, setCurrentCompany] = useState(propCurrentCompany || null);

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
        purchases: 'unknown',
        inventory: 'unknown'
    });

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
            // Test sales service, inventory service, etc.

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

    // Update internal view state when props change
    useEffect(() => {
        if (propCurrentView && propCurrentView !== currentView) {
            console.log('📍 HomePage: Updating view from props:', propCurrentView);
            setCurrentView(propCurrentView);
        }
    }, [propCurrentView, currentView]);

    // Update internal company state when props change
    useEffect(() => {
        if (propCurrentCompany !== currentCompany) {
            console.log('🏢 HomePage: Updating company from props:', propCurrentCompany);
            setCurrentCompany(propCurrentCompany);
            setCompanyError(null);
            
            if (propCurrentCompany) {
                addToast(`Switched to ${propCurrentCompany.companyName || propCurrentCompany.name}`, 'info', 3000);
            }
        }
    }, [propCurrentCompany, currentCompany, addToast]);

    // Handle navigation changes, potentially propagating up to parent
    const handleNavigation = useCallback((page) => {
        console.log('🧭 HomePage: Navigating to:', page);
        
        // Check if component requires company and we don't have one
        const companyRequiredViews = [
            'inventory', 'allProducts', 'lowStock', 'stockMovement',
            'allSales', 'invoices', 'createInvoice', 'creditNotes',
            'salesOrders', 'createSalesOrder',
            'purchaseBills', 'paymentOut', 'expenses', 'purchaseOrder',
            'purchaseReturn', 'allPurchases', 'createPurchase', 'purchaseOrders',
            'createPurchaseOrder',
            'bankAccounts', 'cashAccounts', 'bankTransactions',
            'bankReconciliation', 'cashFlow',
            'parties'
        ];

        if (companyRequiredViews.includes(page) && !currentCompany?.id) {
            addToast('Please select a company first to access this feature', 'warning', 5000);
            return;
        }

        setCurrentView(page);
        if (onNavigate) {
            onNavigate(page);
        }
    }, [currentCompany, onNavigate, addToast]);

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
                addToast(`Company changed to ${company.companyName || company.name}`, 'success', 3000);
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
    }, [onCompanyChange, addToast]);

    // Common props to pass to all components
    const commonProps = {
        currentCompany,
        onNavigate: handleNavigation,
        onCompanyChange: handleCompanyChange,
        isOnline,
        addToast
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

    // Render offline state
    const renderOfflineState = () => (
        <div className="homepage-container">
            <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100">
                <FontAwesomeIcon icon={faTimesCircle} size="3x" className="text-warning mb-3" />
                <h4 className="text-warning">You're Offline</h4>
                <p className="text-muted text-center">
                    Please check your internet connection and try again.
                </p>
                <small className="text-muted">
                    Some features may be limited in offline mode.
                </small>
            </Container>
        </div>
    );

    // Check if component requires company
    const requiresCompany = (viewName) => {
        const companyRequiredViews = [
            'inventory', 'allProducts', 'lowStock', 'stockMovement',
            'allSales', 'invoices', 'createInvoice', 'creditNotes',
            'salesOrders', 'createSalesOrder',
            'purchaseBills', 'paymentOut', 'expenses', 'purchaseOrder',
            'purchaseReturn', 'allPurchases', 'createPurchase', 'purchaseOrders',
            'createPurchaseOrder',
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
                'createInvoice': 'Create Invoice',
                'creditNotes': 'Credit Notes',
                'salesOrders': 'Sales Orders',
                'createSalesOrder': 'Create Sales Order',
                'purchaseBills': 'Purchase Bills',
                'paymentOut': 'Payment Out',
                'expenses': 'Expenses',
                'purchaseOrder': 'Purchase Orders',
                'purchaseReturn': 'Purchase Returns',
                'allPurchases': 'Purchase Management',
                'createPurchase': 'Create Purchase',
                'purchaseOrders': 'Purchase Orders',
                'createPurchaseOrder': 'Create Purchase Order',
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
            // Day Book cases - These can work without a company (show general info)
            case 'dailySummary':
            case 'transactions':
            case 'cashAndBank':
                return wrapWithErrorBoundary(
                    <DayBook view={currentView} {...commonProps} />
                );

            // Parties case - Requires company
            case 'parties':
                return wrapWithErrorBoundary(
                    <Parties {...commonProps} />
                );

            // Sales cases - Requires company
            case 'allSales':
            case 'invoices':
            case 'createInvoice':
            case 'creditNotes':
                return wrapWithErrorBoundary(
                    <Sales view={currentView} {...commonProps} />
                );

            // Sales Orders cases - Requires company
            case 'salesOrders':
            case 'createSalesOrder':
                return wrapWithErrorBoundary(
                    <SalesOrders view={currentView} {...commonProps} />
                );

            // Purchase & Expense cases - Requires company
            case 'purchaseBills':
            case 'paymentOut':
            case 'expenses':
            case 'purchaseOrder':
            case 'purchaseReturn':
            case 'allPurchases':
            case 'createPurchase':
            case 'purchaseOrders':
                return wrapWithErrorBoundary(
                    <Purchases view={currentView} {...commonProps} />
                );

            // Legacy Purchase Order case (keep for backward compatibility) - Requires company
            case 'createPurchaseOrder':
                return wrapWithErrorBoundary(
                    <PurchaseOrders view={currentView} {...commonProps} />
                );

            // Bank & Cash cases - Requires company
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

            // Products & Services case - Basic placeholder
            case 'products':
                return wrapWithErrorBoundary(
                    <div className="placeholder-content">
                        <Container className="py-5 text-center">
                            <h3>Products & Services</h3>
                            <p className="text-muted">Product catalog management coming soon...</p>
                            {currentCompany && (
                                <small className="text-muted">
                                    Current Company: {currentCompany.companyName || currentCompany.name}
                                </small>
                            )}
                        </Container>
                    </div>
                );

            // Inventory cases - Requires company
            case 'inventory':
            case 'allProducts':
            case 'lowStock':
            case 'stockMovement':
                return wrapWithErrorBoundary(
                    <Inventory view={currentView} {...commonProps} />
                );

            // Staff Management case - May require company in future
            case 'staff':
                return wrapWithErrorBoundary(
                    <StaffManagement view={currentView} {...commonProps} />
                );

            // Other cases - General features that don't require company
            case 'insights':
                return wrapWithErrorBoundary(
                    <div className="placeholder-content">
                        <Container className="py-5 text-center">
                            <h3>Insights Dashboard</h3>
                            <p className="text-muted">Business insights and analytics coming soon...</p>
                            {currentCompany && (
                                <small className="text-muted">
                                    Current Company: {currentCompany.companyName || currentCompany.name}
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
                                    Current Company: {currentCompany.companyName || currentCompany.name}
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
                                    Current Company: {currentCompany.companyName || currentCompany.name}
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

            {/* Component Health Indicators (Development Only) */}
            {process.env.NODE_ENV === 'development' && currentCompany && (
                <div className="position-fixed bottom-0 end-0 m-3" style={{ zIndex: 1000 }}>
                    <div className="bg-dark text-white p-2 rounded small" style={{ fontSize: '0.75rem' }}>
                        <div><strong>Company:</strong> {currentCompany.companyName || currentCompany.name}</div>
                        <div><strong>ID:</strong> {currentCompany.id || currentCompany._id}</div>
                        <div><strong>View:</strong> {currentView}</div>
                        <hr className="my-1" />
                        <div><strong>Health:</strong></div>
                        {Object.entries(componentHealth).map(([service, status]) => (
                            <div key={service} className="d-flex justify-content-between">
                                <span>{service}:</span>
                                <span className={
                                    status === 'healthy' ? 'text-success' :
                                    status === 'error' ? 'text-danger' : 'text-warning'
                                }>
                                    {status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1055 }}>
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        show={true}
                        onClose={() => removeToast(toast.id)}
                        delay={toast.duration}
                        autohide
                        className={`border-${
                            toast.type === 'success' ? 'success' :
                            toast.type === 'error' ? 'danger' :
                            toast.type === 'warning' ? 'warning' : 'info'
                        }`}
                    >
                        <Toast.Header className={`bg-${
                            toast.type === 'success' ? 'success' :
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