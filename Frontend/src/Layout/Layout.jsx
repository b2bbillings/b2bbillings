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

  // ✅ UPDATED: Enhanced path detection for edit routes
  const getCurrentViewFromPath = () => {
    const pathParts = location.pathname.split('/').filter(part => part);

    // Debug current path
    console.log('🔍 Layout - Current path parts:', pathParts, 'Full path:', location.pathname);

    // Handle edit routes specially
    if (pathParts.includes('edit')) {
      const editIndex = pathParts.indexOf('edit');
      if (editIndex > 0) {
        const baseSection = pathParts[editIndex - 1];
        console.log('📝 Edit route detected for section:', baseSection);

        // Map edit routes to their base sections
        const editRouteMap = {
          'sales': 'invoices',
          'quotations': 'quotations',
          'purchases': 'purchaseBills',
          'purchase-bills': 'purchaseBills',
          'sales-orders': 'salesOrders',
          'purchase-orders': 'purchaseOrder'
        };

        return editRouteMap[baseSection] || baseSection;
      }
    }

    // Handle add routes
    if (pathParts.includes('add')) {
      const addIndex = pathParts.indexOf('add');
      if (addIndex > 0) {
        const baseSection = pathParts[addIndex - 1];
        console.log('➕ Add route detected for section:', baseSection);

        // Map add routes to their create views
        const addRouteMap = {
          'sales': 'createInvoice',
          'quotations': 'createQuotation',
          'purchases': 'createPurchase',
          'purchase-bills': 'createPurchase',
          'sales-orders': 'createSalesOrder',
          'purchase-orders': 'createPurchaseOrder'
        };

        return addRouteMap[baseSection] || baseSection;
      }
    }

    const lastPart = pathParts[pathParts.length - 1];

    // Map URL paths to views
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
      'purchase-orders': 'purchaseOrder',
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

    const detectedView = pathViewMap[lastPart] || 'dailySummary';
    console.log('🎯 Layout - Detected view:', detectedView, 'from path part:', lastPart);

    return detectedView;
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

  // ✅ FIXED: Enhanced navigation handler with proper quotation support
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

    // ✅ ENHANCED: Better view to path mapping with quotation support
    const viewPathMap = {
      'dailySummary': 'dashboard',
      'transactions': 'transactions',
      'cashAndBank': 'cash-bank',
      'parties': 'parties',

      // ✅ SALES ROUTES
      'invoices': 'sales',
      'allSales': 'sales',
      'createInvoice': 'sales/add',
      'salesInvoices': 'sales',

      // ✅ QUOTATION ROUTES - Separate and distinct
      'quotations': 'quotations',
      'createQuotation': 'quotations/add',
      'addQuotation': 'quotations/add', // Alternative naming

      // ✅ OTHER SALES ROUTES
      'creditNotes': 'credit-notes',
      'salesOrders': 'sales-orders',
      'createSalesOrder': 'sales-orders/add',

      // ✅ PURCHASE ROUTES
      'allPurchases': 'purchases',
      'purchaseBills': 'purchase-bills',
      'createPurchase': 'purchases/add',
      'purchaseOrder': 'purchase-orders',
      'purchaseOrders': 'purchase-orders',
      'createPurchaseOrder': 'purchase-orders/add',

      // ✅ INVENTORY ROUTES
      'inventory': 'inventory',
      'allProducts': 'products',
      'lowStock': 'low-stock',
      'stockMovement': 'stock-movement',

      // ✅ BANK ROUTES
      'bankAccounts': 'bank-accounts',
      'cashAccounts': 'cash-accounts',
      'bankTransactions': 'bank-transactions',
      'bankReconciliation': 'bank-reconciliation',
      'cashFlow': 'cash-flow',

      // ✅ OTHER ROUTES
      'staff': 'staff',
      'insights': 'insights',
      'reports': 'reports',
      'settings': 'settings'
    };

    const urlPath = viewPathMap[page] || 'dashboard';
    const newPath = `/companies/${effectiveCompanyId}/${urlPath}`;

    console.log('✅ Layout navigating to:', newPath, 'for page:', page);
    navigate(newPath);
  };

  // ✅ UPDATED: Enhanced company change handler
  const handleCompanyChange = (company) => {
    setCompanyError(null);

    try {
      if (company) {
        // Navigate to new company's dashboard - but preserve current view if possible
        const newCompanyId = company.id || company._id;
        const currentView = getCurrentViewFromPath();

        // ✅ Check if we're in an edit route - if so, go to the list view instead
        const pathParts = location.pathname.split('/').filter(part => part);
        const isEditRoute = pathParts.includes('edit');
        const isAddRoute = pathParts.includes('add');

        let targetView = currentView;

        if (isEditRoute || isAddRoute) {
          // If in edit/add mode, navigate to the list view instead
          const editToListMap = {
            'invoices': 'invoices',
            'quotations': 'quotations',
            'purchaseBills': 'purchaseBills',
            'salesOrders': 'salesOrders',
            'purchaseOrder': 'purchaseOrder'
          };
          targetView = editToListMap[currentView] || 'dailySummary';
          console.log('🔄 Company change during edit/add - redirecting to list view:', targetView);
        }

        const viewPathMap = {
          'dailySummary': 'dashboard',
          'transactions': 'transactions',
          'cashAndBank': 'cash-bank',
          'parties': 'parties',
          'invoices': 'sales',
          'allSales': 'sales',
          'quotations': 'quotations',
          'createQuotation': 'quotations/add',
          'createInvoice': 'sales/add',
          'creditNotes': 'credit-notes',
          'salesOrders': 'sales-orders',
          'createSalesOrder': 'sales-orders/add',
          'allPurchases': 'purchases',
          'purchaseBills': 'purchase-bills',
          'createPurchase': 'purchases/add',
          'purchaseOrder': 'purchase-orders',
          'purchaseOrders': 'purchase-orders',
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

        const urlPath = viewPathMap[targetView] || 'dashboard';
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
        }, 100);
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

  // ✅ ADDED: Check if we're in edit mode for special handling
  const isEditMode = location.pathname.includes('/edit/');
  const isAddMode = location.pathname.includes('/add');

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
        companyId: companyId || currentCompany?.id || currentCompany?._id,
        // ✅ ADDED: Pass edit/add mode info
        isEditMode,
        isAddMode,
        // ✅ ADDED: Pass location info for advanced routing
        currentLocation: location
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
        // ✅ ADDED: Pass edit mode info to navbar
        isEditMode={isEditMode}
        isAddMode={isAddMode}
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
          // ✅ ADDED: Pass edit mode info to sidebar
          isEditMode={isEditMode}
          isAddMode={isAddMode}
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

            {/* ✅ UPDATED: Enhanced company ID mismatch warning */}
            {companyId && currentCompany && (currentCompany.id !== companyId && currentCompany._id !== companyId) && !isEditMode && (
              <Container className="py-2">
                <Alert variant="warning" className="mb-3">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                  <strong>Company Mismatch:</strong> URL company ID doesn't match selected company.
                  <button
                    className="btn btn-sm btn-outline-warning ms-2"
                    onClick={() => {
                      const correctId = currentCompany.id || currentCompany._id;
                      const currentView = getCurrentViewFromPath();

                      const viewPathMap = {
                        'dailySummary': 'dashboard',
                        'transactions': 'transactions',
                        'cashAndBank': 'cash-bank',
                        'parties': 'parties',
                        'invoices': 'sales',
                        'allSales': 'sales',
                        'quotations': 'quotations',
                        'createQuotation': 'quotations/add',
                        'createInvoice': 'sales/add',
                        'creditNotes': 'credit-notes',
                        'salesOrders': 'sales-orders',
                        'createSalesOrder': 'sales-orders/add',
                        'allPurchases': 'purchases',
                        'purchaseBills': 'purchase-bills',
                        'createPurchase': 'purchases/add',
                        'purchaseOrder': 'purchase-orders',
                        'purchaseOrders': 'purchase-orders',
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

            {/* ✅ ADDED: Edit mode indicator */}
            {isEditMode && (
              <Container className="py-2">
                <Alert variant="info" className="mb-3 d-flex align-items-center">
                  <div className="me-auto">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                    <strong>Edit Mode:</strong> You are currently editing a document.
                  </div>
                  <small className="text-muted">
                    Changes will be saved automatically
                  </small>
                </Alert>
              </Container>
            )}

            {childrenWithProps}
          </main>

          <Footer
            currentCompany={currentCompany}
            isOnline={isOnline}
            companyId={companyId}
            isEditMode={isEditMode}
            isAddMode={isAddMode}
          />
        </div>
      </div>
    </div>
  );
}

export default Layout;