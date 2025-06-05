import React, { useState, useEffect } from 'react';
import { Alert, Container } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faWifi, faTimes } from '@fortawesome/free-solid-svg-icons';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import '../App.css';

function Layout({
  children,
  onLogout,
  onNavigate,
  currentView,
  currentCompany,
  companies,
  onCompanyChange,
  onCompanyCreated,
  currentUser,
  isLoadingCompanies
}) {
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Current page state (fallback if not provided via props)
  const [currentPage, setCurrentPage] = useState(currentView || 'dailySummary');

  // Network status state
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Company error state
  const [companyError, setCompanyError] = useState(null);

  // Sync internal page state with props
  useEffect(() => {
    if (currentView && currentView !== currentPage) {
      console.log('📍 Layout: Updating current page from props:', currentView);
      setCurrentPage(currentView);
    }
  }, [currentView]);

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
      console.log('🌐 Network: Back online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('📵 Network: Gone offline');
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

  // Handle navigation with proper prop propagation
  const handleNavigation = (page) => {
    console.log('🧭 Layout: Navigation request for:', page);
    setCurrentPage(page);

    // Clear any company errors when navigating
    setCompanyError(null);

    // Propagate navigation to parent if provided
    if (onNavigate) {
      onNavigate(page);
    }
  };

  // Handle company change with error handling
  const handleCompanyChange = (company) => {
    console.log('🏢 Layout: Company change request:', company?.companyName || 'None');
    setCompanyError(null);

    try {
      if (onCompanyChange) {
        onCompanyChange(company);
      }
    } catch (error) {
      console.error('❌ Error changing company:', error);
      setCompanyError(`Failed to switch company: ${error.message}`);
    }
  };

  // Handle company creation
  const handleCompanyCreated = (newCompany) => {
    console.log('🆕 Layout: New company created:', newCompany);
    setCompanyError(null);

    try {
      if (onCompanyCreated) {
        onCompanyCreated(newCompany);
      }
    } catch (error) {
      console.error('❌ Error handling new company:', error);
      setCompanyError(`Failed to create company: ${error.message}`);
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
        currentUser,
        isOnline
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
        currentUser={currentUser}
        isLoadingCompanies={isLoadingCompanies}
        isOnline={isOnline}
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

            {childrenWithProps}
          </main>

          <Footer
            currentCompany={currentCompany}
            isOnline={isOnline}
          />
        </div>
      </div>

      {/* Development Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="position-fixed bottom-0 start-0 m-3" style={{ zIndex: 1000 }}>
          <div className="bg-dark text-white p-2 rounded small" style={{ fontSize: '0.75rem' }}>
            <div><strong>User:</strong> {currentUser?.name || 'Not logged in'}</div>
            <div><strong>Company:</strong> {currentCompany?.companyName || 'None selected'}</div>
            <div><strong>Page:</strong> {currentPage}</div>
            <div><strong>Sidebar:</strong> {sidebarOpen ? 'Open' : 'Closed'}</div>
            <div><strong>Online:</strong>
              <FontAwesomeIcon
                icon={isOnline ? faWifi : faTimes}
                className={`ms-1 ${isOnline ? 'text-success' : 'text-danger'}`}
              />
            </div>
            <div><strong>Companies:</strong> {companies.length}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Layout;