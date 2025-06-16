import React, { useState, useEffect } from 'react';
import { Alert, Container } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faWifi, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import '../App.css';

function Layout({
  children,
  onLogout,
  currentCompany,
  companies,
  onCompanyChange,
  onCompanyCreated,
  onCompanyUpdated,
  currentUser,
  isLoadingCompanies
}) {
  // React Router hooks
  const { companyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Network status state
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Company error state
  const [companyError, setCompanyError] = useState(null);

  // Get current view from URL path - ✅ UPDATED: Fixed purchase-orders mapping
  const getCurrentViewFromPath = () => {
    const pathParts = location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];

    // Map URL paths to views - ✅ UPDATED: Fixed purchase-orders to purchaseOrder
    const pathViewMap = {
      'dashboard': 'dailySummary',
      'daybook': 'dailySummary',
      'transactions': 'transactions',
      'cash-bank': 'cashAndBank',
      'parties': 'parties',
      'sales': 'invoices',
      'quotations': 'quotations',
      'invoices': 'invoices',
      'create-invoice': 'createInvoice',
      'credit-notes': 'creditNotes',
      'sales-orders': 'salesOrders',
      'create-sales-order': 'createSalesOrder',
      'purchases': 'allPurchases',
      'purchase-bills': 'purchaseBills',
      'create-purchase': 'createPurchase',
      'purchase-orders': 'purchaseOrder', // ✅ UPDATED: Map to purchaseOrder (not purchaseOrders)
      'create-purchase-order': 'createPurchaseOrder',
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

  // Current page derived from URL
  const currentPage = getCurrentViewFromPath();

  // Check screen size on mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 992) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Initial check
    checkScreenSize();

    // Add resize listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Clear company error when company changes
  useEffect(() => {
    if (currentCompany) {
      setCompanyError(null);
    }
  }, [currentCompany]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Handle navigation - ✅ UPDATED: Fixed purchaseOrder mapping
  const handleNavigation = (page) => {
    console.log('🚀 Layout handleNavigation called with:', page);

    // Clear any company errors when navigating
    setCompanyError(null);

    // Check if we have a company ID to navigate to
    const effectiveCompanyId = companyId || currentCompany?.id || currentCompany?._id;

    if (!effectiveCompanyId) {
      console.warn('⚠️ No company ID available for navigation:', page);
      setCompanyError('Please select a company to access this feature');
      return;
    }

    // Map views to URL paths - ✅ UPDATED: Fixed purchaseOrder to purchase-orders
    const viewPathMap = {
      'dailySummary': 'dashboard',
      'transactions': 'transactions',
      'cashAndBank': 'cash-bank',
      'parties': 'parties',
      'invoices': 'invoices',
      'allSales': 'sales',
      'quotations': 'quotations',
      'createQuotation': 'quotations/add',
      'createInvoice': 'invoices/add',
      'creditNotes': 'credit-notes',
      'salesOrders': 'sales-orders',
      'createSalesOrder': 'sales-orders/add',
      'allPurchases': 'purchases',
      'purchaseBills': 'purchase-bills',
      'createPurchase': 'purchases/add',
      'purchaseOrder': 'purchase-orders', // ✅ UPDATED: Map purchaseOrder to purchase-orders URL
      'purchaseOrders': 'purchase-orders', // ✅ Keep for backward compatibility
      'createPurchaseOrder': 'purchase-orders/add',
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
      'settings': 'settings'
    };

    const urlPath = viewPathMap[page] || 'dashboard';
    const newPath = `/companies/${effectiveCompanyId}/${urlPath}`;

    console.log('✅ Layout navigating to:', newPath);
    navigate(newPath);
  };

  // Handle company change with error handling and navigation - ✅ UPDATED: Fixed purchaseOrder mapping
  const handleCompanyChange = (company) => {
    setCompanyError(null);

    try {
      if (company) {
        // Navigate to new company's dashboard
        const newCompanyId = company.id || company._id;
        const currentView = getCurrentViewFromPath();

        // ✅ UPDATED: Fixed purchaseOrder mapping
        const viewPathMap = {
          'dailySummary': 'dashboard',
          'transactions': 'transactions',
          'cashAndBank': 'cash-bank',
          'parties': 'parties',
          'invoices': 'invoices',
          'allSales': 'sales',
          'quotations': 'quotations',
          'createQuotation': 'quotations/add',
          'createInvoice': 'invoices/add',
          'creditNotes': 'credit-notes',
          'salesOrders': 'sales-orders',
          'createSalesOrder': 'sales-orders/add',
          'allPurchases': 'purchases',
          'purchaseBills': 'purchase-bills',
          'createPurchase': 'purchases/add',
          'purchaseOrder': 'purchase-orders', // ✅ UPDATED: Map purchaseOrder to purchase-orders URL
          'purchaseOrders': 'purchase-orders', // ✅ Keep for backward compatibility
          'createPurchaseOrder': 'purchase-orders/add',
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
          'settings': 'settings'
        };

        const urlPath = viewPathMap[currentView] || 'dashboard';
        const newPath = `/companies/${newCompanyId}/${urlPath}`;

        navigate(newPath);
      }

      // Propagate to parent component
      if (onCompanyChange) {
        onCompanyChange(company);
      }
    } catch (error) {
      setCompanyError(`Failed to switch company: ${error.message}`);
    }
  };

  // Handle company creation
  const handleCompanyCreated = (newCompany) => {
    setCompanyError(null);

    try {
      if (onCompanyCreated) {
        onCompanyCreated(newCompany);
      }

      // Automatically navigate to new company's dashboard
      if (newCompany) {
        const newCompanyId = newCompany.id || newCompany._id;
        const newPath = `/companies/${newCompanyId}/dashboard`;

        setTimeout(() => {
          navigate(newPath);
        }, 100); // Small delay to ensure state is updated
      }
    } catch (error) {
      setCompanyError(`Failed to create company: ${error.message}`);
    }
  };

  // Handle company updates
  const handleCompanyUpdated = (updatedCompany) => {
    setCompanyError(null);

    try {
      if (onCompanyUpdated) {
        onCompanyUpdated(updatedCompany);
      }
    } catch (error) {
      setCompanyError(`Failed to update company: ${error.message}`);
    }
  };

  // Enhanced children props with all necessary context
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        onNavigate: handleNavigation,
        currentView: currentPage,
        currentCompany,
        onCompanyChange: handleCompanyChange,
        onCompanyCreated: handleCompanyCreated,
        onCompanyUpdated: handleCompanyUpdated,
        currentUser,
        isOnline,
        companyId: companyId || currentCompany?.id || currentCompany?._id
      });
    }
    return child;
  });

  return (
    <div className="layout-container">
      {/* Network Status Alert */}
      {!isOnline && (
        <Alert variant="warning" className="m-0 rounded-0 text-center">
          <FontAwesomeIcon icon={faTimes} className="me-2" />
          <strong>No Internet Connection</strong> - Some features may not work properly
        </Alert>
      )}

      {/* Company Error Alert */}
      {companyError && (
        <Alert
          variant="danger"
          className="m-0 rounded-0 text-center"
          dismissible
          onClose={() => setCompanyError(null)}
        >
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          {companyError}
        </Alert>
      )}

      {/* Fixed-position navbar at the top */}
      <Navbar
        onLogout={onLogout}
        toggleSidebar={toggleSidebar}
        currentCompany={currentCompany}
        companies={companies}
        onCompanyChange={handleCompanyChange}
        onCompanyCreated={handleCompanyCreated}
        onCompanyUpdated={handleCompanyUpdated}
        currentUser={currentUser}
        isLoadingCompanies={isLoadingCompanies}
        isOnline={isOnline}
        companyId={companyId}
      />

      {/* Main content section with sidebar */}
      <div className="d-flex">
        <Sidebar
          isOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          onNavigate={handleNavigation}
          activePage={currentPage}
          currentCompany={currentCompany}
          currentUser={currentUser}
          isOnline={isOnline}
          companyId={companyId}
        />

        <div className={`content-wrapper ${sidebarOpen ? '' : 'expanded'}`}>
          <main className="main-content">
            {/* Loading Companies State */}
            {isLoadingCompanies && (
              <div className="position-fixed top-50 start-50 translate-middle" style={{ zIndex: 1050 }}>
                <div className="bg-white p-3 rounded shadow text-center">
                  <div className="spinner-border text-primary mb-2" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <div className="small text-muted">Loading companies...</div>
                </div>
              </div>
            )}

            {/* Company Loading Error State */}
            {!isLoadingCompanies && companies.length === 0 && currentUser && (
              <Container className="py-4">
                <Alert variant="info" className="text-center">
                  <h5>No Companies Found</h5>
                  <p className="mb-0">
                    It looks like you don't have any companies set up yet.
                    You can create your first company using the "+" button in the header.
                  </p>
                </Alert>
              </Container>
            )}

            {/* Company ID Mismatch Warning */}
            {companyId && currentCompany && (currentCompany.id !== companyId && currentCompany._id !== companyId) && (
              <Container className="py-2">
                <Alert variant="warning" className="mb-3">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                  <strong>Company Mismatch:</strong> URL company ID doesn't match selected company.
                  <button
                    className="btn btn-sm btn-outline-warning ms-2"
                    onClick={() => {
                      const correctId = currentCompany.id || currentCompany._id;
                      const currentView = getCurrentViewFromPath();

                      // ✅ UPDATED: Fixed purchaseOrder mapping here too
                      const viewPathMap = {
                        'dailySummary': 'dashboard',
                        'transactions': 'transactions',
                        'cashAndBank': 'cash-bank',
                        'parties': 'parties',
                        'invoices': 'invoices',
                        'allSales': 'sales',
                        'quotations': 'quotations',
                        'createQuotation': 'quotations/add',
                        'createInvoice': 'invoices/add',
                        'creditNotes': 'credit-notes',
                        'salesOrders': 'sales-orders',
                        'createSalesOrder': 'sales-orders/add',
                        'allPurchases': 'purchases',
                        'purchaseBills': 'purchase-bills',
                        'createPurchase': 'purchases/add',
                        'purchaseOrder': 'purchase-orders', // ✅ UPDATED: Map purchaseOrder to purchase-orders URL
                        'purchaseOrders': 'purchase-orders', // ✅ Keep for backward compatibility
                        'createPurchaseOrder': 'purchase-orders/add',
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
                        'settings': 'settings'
                      };
                      const urlPath = viewPathMap[currentView] || 'dashboard';
                      navigate(`/companies/${correctId}/${urlPath}`);
                    }}
                  >
                    Fix URL
                  </button>
                </Alert>
              </Container>
            )}

            {childrenWithProps}
          </main>

          <Footer
            currentCompany={currentCompany}
            isOnline={isOnline}
            companyId={companyId}
          />
        </div>
      </div>
    </div>
  );
}

export default Layout;