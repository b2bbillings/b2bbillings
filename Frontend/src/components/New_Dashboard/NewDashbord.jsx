import React, { useState, useCallback, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faTimes,
  faExpand,
  faCompress,
  faHome,
} from "@fortawesome/free-solid-svg-icons";
import PropTypes from "prop-types";
import NewSidebar from "./NewSidebar";
import ContentDisplay from "./ContentDisplay";
import "./NewDashboard.css";

/**
 * NewDashboard - Main dashboard component with sidebar and content area
 * Features:
 * - Responsive design
 * - Sidebar toggle
 * - Content display based on sidebar selection
 * - Modern gradient background
 * - Full screen mode
 */
const NewDashboard = ({
  currentCompany = null,
  currentUser = null,
  companies = [],
  onNavigate = () => {},
  addToast = () => {},
  isOnline = true,
  onLogout = () => {},
  onCompanyChange = () => {},
  onCompanyCreated = () => {},
  onCompanyUpdated = () => {},
  isLoadingCompanies = false,
  companyId = null,
}) => {
  // State management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeContent, setActiveContent] = useState(null);
  const [contentType, setContentType] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sidebar toggle handler
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Content change handler - called when sidebar items are clicked
  const handleContentChange = useCallback((contentId, contentLabel) => {
    console.log("🎯 NewDashboard handleContentChange called:", { contentId, contentLabel });
    setIsLoading(true);
    setActiveContent(contentLabel);
    setContentType(contentId);

    // Close sidebar on mobile after selection
    if (isMobile) {
      setSidebarOpen(false);
    }

    // Simulate loading delay
    setTimeout(() => {
      setIsLoading(false);
    }, 500);

    // Show feedback toast
    if (addToast) {
      addToast(`Loading ${contentLabel}...`, "info");
    }
  }, [isMobile, addToast]);

  // Navigation handler - delegates to parent component
  const handleNavigation = useCallback((page) => {
    if (onNavigate) {
      onNavigate(page);
    }
  }, [onNavigate]);

  // Fullscreen toggle
  const handleFullscreenToggle = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.log('Fullscreen request failed:', err);
        if (addToast) {
          addToast("Fullscreen not supported", "warning");
        }
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.log('Exit fullscreen failed:', err);
      });
    }
  }, [addToast]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Close sidebar when clicking outside on mobile
  const handleBackdropClick = useCallback(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isMobile, sidebarOpen]);

  // Get effective company ID
  const effectiveCompanyId = companyId || currentCompany?.id || currentCompany?._id;

  return (
    <div className={`new-dashboard ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div 
          className="mobile-backdrop" 
          onClick={handleBackdropClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSidebarOpen(false);
            }
          }}
          aria-label="Close sidebar"
        />
      )}

      {/* Top bar - visible when sidebar is closed or on mobile */}
      {(!sidebarOpen || isMobile) && (
        <div className="dashboard-topbar">
          <div className="topbar-left">
            <button
              className="sidebar-toggle-btn"
              onClick={handleSidebarToggle}
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              <FontAwesomeIcon icon={sidebarOpen ? faTimes : faBars} />
            </button>
            <div className="topbar-title">
              <FontAwesomeIcon icon={faHome} className="me-2" />
              New Dashboard
            </div>
          </div>

          <div className="topbar-right">
            {currentCompany && (
              <div className="topbar-company">
                {currentCompany.businessName || currentCompany.name}
              </div>
            )}
            <button
              className="fullscreen-toggle-btn"
              onClick={handleFullscreenToggle}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
            </button>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="dashboard-layout">
        {/* Sidebar */}
        <div className={`sidebar-container ${sidebarOpen ? 'open' : 'closed'}`}>
          <NewSidebar
            isOpen={sidebarOpen}
            toggleSidebar={handleSidebarToggle}
            onNavigate={handleNavigation}
            activePage=""
            currentCompany={currentCompany}
            currentUser={currentUser}
            isOnline={isOnline}
            companyId={effectiveCompanyId}
            onContentChange={handleContentChange}
          />
        </div>

        {/* Content area */}
        <div className="content-container">
          <ContentDisplay
            activeContent={activeContent}
            contentType={contentType}
            currentCompany={currentCompany}
            currentUser={currentUser}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Floating action button for mobile */}
      {isMobile && !sidebarOpen && (
        <button
          className="floating-menu-btn"
          onClick={handleSidebarToggle}
          aria-label="Open menu"
        >
          <FontAwesomeIcon icon={faBars} />
        </button>
      )}

      {/* Debug info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info">
          <div>Sidebar: {sidebarOpen ? 'Open' : 'Closed'}</div>
          <div>Mobile: {isMobile ? 'Yes' : 'No'}</div>
          <div>Active: {activeContent || 'None'}</div>
          <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
          <div>Company: {currentCompany?.businessName || 'None'}</div>
        </div>
      )}
    </div>
  );
};

// PropTypes
NewDashboard.propTypes = {
  currentCompany: PropTypes.shape({
    id: PropTypes.string,
    _id: PropTypes.string,
    name: PropTypes.string,
    businessName: PropTypes.string,
    email: PropTypes.string,
  }),
  currentUser: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    role: PropTypes.string,
    email: PropTypes.string,
  }),
  companies: PropTypes.array,
  onNavigate: PropTypes.func,
  addToast: PropTypes.func,
  isOnline: PropTypes.bool,
  onLogout: PropTypes.func,
  onCompanyChange: PropTypes.func,
  onCompanyCreated: PropTypes.func,
  onCompanyUpdated: PropTypes.func,
  isLoadingCompanies: PropTypes.bool,
  companyId: PropTypes.string,
};

NewDashboard.displayName = "NewDashboard";

export default NewDashboard;