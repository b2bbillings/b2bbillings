import React, { useState, useEffect } from 'react';
import { Alert, Spinner, Container } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faBuilding } from '@fortawesome/free-solid-svg-icons';

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
    const [currentView, setCurrentView] = useState('dailySummary');

    // Company state - tracks current selected company
    const [currentCompany, setCurrentCompany] = useState(null);

    // Loading and error states
    const [isLoadingCompany, setIsLoadingCompany] = useState(false);
    const [companyError, setCompanyError] = useState(null);

    // Update internal view state when props change
    useEffect(() => {
        if (propCurrentView && propCurrentView !== currentView) {
            console.log('📍 HomePage: Updating view from props:', propCurrentView);
            setCurrentView(propCurrentView);
        }
    }, [propCurrentView]);

    // Update internal company state when props change
    useEffect(() => {
        if (propCurrentCompany !== currentCompany) {
            console.log('🏢 HomePage: Updating company from props:', propCurrentCompany);
            setCurrentCompany(propCurrentCompany);
            setCompanyError(null);
        }
    }, [propCurrentCompany]);

    // Handle navigation changes, potentially propagating up to parent
    const handleNavigation = (page) => {
        console.log('🧭 HomePage: Navigating to:', page);
        setCurrentView(page);
        if (onNavigate) {
            onNavigate(page);
        }
    };

    // Handle company change from child components
    const handleCompanyChange = (company) => {
        console.log('🏢 HomePage: Company changed from child component:', company);
        setCurrentCompany(company);
        setCompanyError(null);

        // Propagate to parent
        if (onCompanyChange) {
            onCompanyChange(company);
        }
    };

    // Common props to pass to all components
    const commonProps = {
        currentCompany,
        onNavigate: handleNavigation,
        onCompanyChange: handleCompanyChange
    };

    // Render no company selected state for components that require it
    const renderNoCompanyState = (componentName) => (
        <div className="homepage-container">
            <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100">
                <FontAwesomeIcon icon={faBuilding} size="3x" className="text-muted mb-3" />
                <h4 className="text-muted">No Company Selected</h4>
                <p className="text-muted text-center">
                    Please select a company from the header to access {componentName}.
                </p>
            </Container>
        </div>
    );

    // Render the appropriate component based on the current view
    const renderContent = () => {
        // Components that require a company to be selected
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

        // Check if current view requires a company and if we don't have one
        if (companyRequiredViews.includes(currentView) && !currentCompany?.id && !currentCompany?._id) {
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

        switch (currentView) {
            // Day Book cases - These can work without a company (show general info)
            case 'dailySummary':
                return <DayBook view={currentView} {...commonProps} />;
            case 'transactions':
                return <DayBook view={currentView} {...commonProps} />;
            case 'cashAndBank':
                return <DayBook view={currentView} {...commonProps} />;

            // Parties case - Requires company
            case 'parties':
                return <Parties {...commonProps} />;

            // Sales cases - Requires company
            case 'allSales':
            case 'invoices':
            case 'createInvoice':
            case 'creditNotes':
                return <Sales view={currentView} {...commonProps} />;

            // Sales Orders cases - Requires company
            case 'salesOrders':
            case 'createSalesOrder':
                return <SalesOrders view={currentView} {...commonProps} />;

            // Purchase & Expense cases - Requires company
            case 'purchaseBills':
            case 'paymentOut':
            case 'expenses':
            case 'purchaseOrder':
            case 'purchaseReturn':
            case 'allPurchases':
            case 'createPurchase':
            case 'purchaseOrders':
                return <Purchases view={currentView} {...commonProps} />;

            // Legacy Purchase Order case (keep for backward compatibility) - Requires company
            case 'createPurchaseOrder':
                return <PurchaseOrders view={currentView} {...commonProps} />;

            // Bank & Cash cases - Requires company
            case 'bankAccounts':
                return <Bank view="bankAccounts" activeType="bank" {...commonProps} />;
            case 'cashAccounts':
                return <Bank view="cashAccounts" activeType="cash" {...commonProps} />;
            case 'bankTransactions':
                return <Bank view="bankTransactions" {...commonProps} />;
            case 'bankReconciliation':
                return <Bank view="bankReconciliation" {...commonProps} />;
            case 'cashFlow':
                return <Bank view="cashFlow" {...commonProps} />;

            // Products & Services case - Basic placeholder (doesn't require company for now)
            case 'products':
                return (
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
                return <Inventory view={currentView} {...commonProps} />;

            // Staff Management case - May require company in future
            case 'staff':
                return <StaffManagement view={currentView} {...commonProps} />;

            // Other cases - General features that don't require company
            case 'insights':
                return (
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
                return (
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
                return (
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
                return <DayBook view="dailySummary" {...commonProps} />;
        }
    };

    return (
        <div className="homepage-container">
            {/* Company Context Debug Info (only in development) */}
            {process.env.NODE_ENV === 'development' && currentCompany && (
                <div className="position-fixed bottom-0 end-0 m-3" style={{ zIndex: 1000 }}>
                    <div className="bg-info text-white p-2 rounded small" style={{ fontSize: '0.75rem' }}>
                        <strong>Company:</strong> {currentCompany.companyName || currentCompany.name}<br />
                        <strong>ID:</strong> {currentCompany.id || currentCompany._id}<br />
                        <strong>View:</strong> {currentView}
                    </div>
                </div>
            )}

            {renderContent()}
        </div>
    );
}

export default HomePage;