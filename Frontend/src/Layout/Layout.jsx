import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import '../App.css';

function Layout({ children, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState('dailySummary');

  // Check screen size on mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 992) {
        setSidebarOpen(false);
      }
    };

    // Initial check
    checkScreenSize();

    // Add resize listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Create a navigation function that will be passed to the Sidebar
  // and ultimately to the HomePage component
  const handleNavigation = (page) => {
    console.log('Layout: Navigation request for:', page); // Debug log
    setCurrentPage(page);
  };

  // Clone children with the navigation function and current page
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        onNavigate: handleNavigation,
        currentView: currentPage
      });
    }
    return child;
  });

  return (
    <div className="layout-container">
      {/* Fixed-position navbar at the top */}
      <Navbar onLogout={onLogout} toggleSidebar={toggleSidebar} />

      {/* Main content section with sidebar */}
      <div className="d-flex">
        <Sidebar
          isOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          onNavigate={handleNavigation}
          activePage={currentPage}
        />

        <div className={`content-wrapper ${sidebarOpen ? '' : 'expanded'}`}>
          <main className="main-content">
            {childrenWithProps}
          </main>

          <Footer />
        </div>
      </div>
    </div>
  );
}

export default Layout;