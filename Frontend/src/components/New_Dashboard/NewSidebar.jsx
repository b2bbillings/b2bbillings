import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Accordion, Nav } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShoppingCart,
  faShoppingBag,
  faClipboardList,
  faBook,
  faUserFriends,
  faAngleRight,
  faAngleLeft,
  faWarehouse,
  faExclamationTriangle,
  faUserTie,
  faFileInvoice,
  faFileContract,
  faFileInvoiceDollar,
  faUniversity,
  faUsers,
  faTasks,
  faCircle,
  faDotCircle,
  faTimes,
  faCheck,
  faBox,
  faHome,
  faChartLine,
  faCog,
  faInfoCircle,
  faPercent,
  faBuilding,
  faTachometerAlt,
} from "@fortawesome/free-solid-svg-icons";
import PropTypes from "prop-types";
import "./NewSidebar.css";

// Navigation constants
const NAVIGATION_CONSTANTS = Object.freeze({
  ACCORDION_SECTIONS: {
    PARTIES: "parties",
    SALES: "sales",
    PURCHASE_EXPENSE: "purchaseExpense",
    STAFF_MANAGEMENT: "staffManagement",
    INFO: "info",
  },
  // Only one accordion section open at a time (null = none)
  DEFAULT_ACTIVE_SECTIONS: null,
  CACHE_KEY: "new_sidebar_accordion_state",
});

// Navigation items configuration - all items from original sidebar
const NAVIGATION_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: faTachometerAlt,
    type: "single",
    requiresCompany: false,
    isActive: true, // ✅ ACTIVE - Dashboard overview
  },
  {
    id: "categories",
    label: "Category Management",
    icon: faClipboardList,
    type: "single",
    requiresCompany: false,
    isActive: true, // ✅ ACTIVE - functional link
  },
  {
    id: "items",
    label: "Item Management",
    icon: faBox,
    type: "single",
    requiresCompany: false,
    isActive: true, // ✅ ACTIVE - functional link
  },
  {
    id: "parties",
    label: "Parties",
    icon: faUserFriends,
    type: "accordion",
    section: "parties",
    requiresCompany: true,
    isActive: true, // ✅ ACTIVE - New Parties component
    children: [
      {
        id: "customers",
        label: "Customers",
        icon: faUsers,
        requiresCompany: true,
        isActive: true,
      },
      {
        id: "vendors",
        label: "Vendors",
        icon: faBuilding,
        requiresCompany: true,
        isActive: true,
      },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    icon: faShoppingCart,
    type: "accordion",
    section: "sales",
    isActive: false, // Will be redesigned later
    children: [
      {
        id: "quotations",
        label: "Quotations",
        icon: faFileContract,
        requiresCompany: true,
        isActive: false,
      },
      {
        id: "invoices",
        label: "Invoices",
        icon: faFileInvoice,
        requiresCompany: true,
        isActive: false,
      },
    ],
  },
  {
    id: "purchaseExpense",
    label: "Purchase & Expense",
    icon: faShoppingBag,
    type: "accordion",
    section: "purchaseExpense",
    isActive: false, // Will be redesigned later
    children: [
      {
        id: "purchaseBills",
        label: "Purchase Bills",
        icon: faFileInvoiceDollar,
        requiresCompany: true,
        isActive: false,
      },
      {
        id: "purchaseOrders",
        label: "Purchase Orders",
        icon: faClipboardList,
        requiresCompany: true,
        isActive: false,
      },
    ],
  },
  {
    id: "bankAccounts",
    label: "Bank Accounts",
    icon: faUniversity,
    type: "single",
    requiresCompany: true,
    isActive: false, // Will be redesigned later
  },
  {
    id: "allProducts",
    label: "Inventory",
    icon: faWarehouse,
    type: "single",
    requiresCompany: true,
    isActive: false, // Will be redesigned later
  },
  {
    id: "staffManagement",
    label: "Staff Management",
    icon: faUserTie,
    type: "accordion",
    section: "staffManagement",
    isActive: false, // Will be redesigned later
    children: [
      {
        id: "staffList",
        label: "Staff List",
        icon: faUsers,
        requiresCompany: false,
        isActive: false,
      },
      {
        id: "dailyTaskAssignment",
        label: "Daily Task Assignment",
        icon: faTasks,
        requiresCompany: false,
        isActive: false,
      },
    ],
  },
  {
    id: "info",
    label: "Info",
    icon: faInfoCircle,
    type: "accordion",
    section: "info",
    isActive: true, // ✅ ACTIVE - functional link
    children: [
      {
        id: "gst",
        label: "GST Information",
        icon: faPercent,
        requiresCompany: false,
        isActive: true,
      },
      {
        id: "companyBrand",
        label: "Company/Brand",
        icon: faBuilding,
        requiresCompany: false,
        isActive: true,
      },
    ],
  },
];

// Storage utilities
const storage = {
  get: (key, fallback = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("Failed to save to localStorage:", e);
    }
  },
};

// Utility function to check if device is mobile
const isMobileDevice = () => window.innerWidth < 768;

// Individual navigation components
const NavigationLink = React.memo(
  ({ item, isActive, isDisabled, onClick, isNavigating, onContentChange, toggleSidebar }) => {
    const handleClick = () => {
      if (isDisabled || !item.isActive) {
        return;
      }
      onClick(item.id);
      if (onContentChange) {
        onContentChange(item.id, item.label);
      }
      // Close sidebar on mobile after navigation
      if (isMobileDevice() && toggleSidebar) {
        toggleSidebar();
      }
    };

    const className = `new-sidebar-link ${isActive ? "active" : ""} ${
      isDisabled ? "disabled" : ""
    } ${isNavigating ? "navigating" : ""} ${!item.isActive ? "inactive" : ""}`;

    return (
      <div className="new-sidebar-item">
        <Nav.Link
          onClick={handleClick}
          className={className}
          disabled={isDisabled}
          aria-label={item.label}
        >
          <div className="new-sidebar-link-content">
            <FontAwesomeIcon icon={item.icon} className="new-sidebar-icon" />
            <span className="new-sidebar-text">{item.label}</span>
            {!item.isActive && <span className="coming-soon-badge">Soon</span>}
          </div>
        </Nav.Link>
      </div>
    );
  }
);

NavigationLink.displayName = "NavigationLink";

const AccordionItem = React.memo(({ item, isExpanded, onToggle, children, onContentChange, isOpen }) => {
  return (
    <div className="new-sidebar-item">
      <Accordion.Item eventKey={item.section} className="new-sidebar-accordion-item">
        <Accordion.Header
          className={`new-sidebar-header ${!item.isActive ? "inactive" : ""}`}
        >
          <div className="new-sidebar-link-content">
            <FontAwesomeIcon icon={item.icon} className="new-sidebar-icon" />
            <span className="new-sidebar-text">{item.label}</span>
            {!item.isActive && <span className="coming-soon-badge">Soon</span>}
          </div>
          <FontAwesomeIcon
            icon={faAngleRight}
            className={`chevron-icon ${isExpanded ? "rotated" : ""}`}
          />
        </Accordion.Header>
        {item.isActive && (
          <Accordion.Body className="new-sidebar-submenu">
            <Nav className="flex-column">{children}</Nav>
          </Accordion.Body>
        )}
      </Accordion.Item>
    </div>
  );
});

AccordionItem.displayName = "AccordionItem";

const SubMenuItem = React.memo(
  ({ child, isActive, isDisabled, onClick, isNavigating, onContentChange, toggleSidebar }) => {
    const handleClick = (e) => {
      console.log("🎯 SubMenuItem handleClick called for:", child.id);
      
      // Prevent default link behavior to allow React Router navigation
      e.preventDefault();
      
      if (isDisabled || !child.isActive) {
        console.log("⚠️ Item disabled or inactive:", { isDisabled, isActive: child.isActive });
        return;
      }
      
      // Handle navigation for customers and vendors through routes
      const routeNavigationItems = ['customers', 'vendors'];
      const contentDisplayItems = [];
      const navigationItems = ['gst', 'companyBrand'];
      
      if (routeNavigationItems.includes(child.id)) {
        // For customers and vendors, navigate to the specific route
        console.log("🚀 Route navigation item - navigating to:", child.id);
        onClick(child.id);
      } else if (contentDisplayItems.includes(child.id)) {
        // For pure content display items, only call onContentChange
        console.log("📋 Content display item - calling onContentChange for:", child.id, child.label);
        if (onContentChange) {
          onContentChange(child.id, child.label);
        }
      } else {
        // For other items, call onClick (navigation handler)
        console.log("🚀 Calling onClick for:", child.id);
        onClick(child.id);
        
        // Also call onContentChange for non-navigation items
        if (onContentChange && !navigationItems.includes(child.id)) {
          console.log("📋 Calling onContentChange for:", child.id, child.label);
          onContentChange(child.id, child.label);
        } else {
          console.log("🚫 Skipping onContentChange for navigation item:", child.id);
        }
      }
      
      // Close sidebar on mobile after navigation
      if (isMobileDevice() && toggleSidebar) {
        toggleSidebar();
      }
    };

    const className = `new-submenu-item ${isActive ? "active" : ""} ${
      isDisabled ? "disabled" : ""
    } ${isNavigating ? "navigating" : ""} ${!child.isActive ? "inactive" : ""}`;

    return (
      <Nav.Link
        onClick={handleClick}
        className={className}
        disabled={isDisabled}
        aria-label={child.label}
      >
        <FontAwesomeIcon icon={child.icon} className="me-2" />
        {child.label}
        {!child.isActive && <span className="coming-soon-badge-small">Soon</span>}
      </Nav.Link>
    );
  }
);

SubMenuItem.displayName = "SubMenuItem";

// Main NewSidebar Component
const NewSidebar = React.memo(
  ({
    isOpen = true,
    toggleSidebar,
    onNavigate,
    activePage = "",
    currentCompany = null,
    currentUser = null,
    companyId = null,
    onContentChange = () => {},
  }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const sidebarRef = useRef(null);

    // State management
    const [activeKey, setActiveKey] = useState(() => {
      const stored = storage.get(
        NAVIGATION_CONSTANTS.CACHE_KEY,
        NAVIGATION_CONSTANTS.DEFAULT_ACTIVE_SECTIONS
      );
      // Backwards compatibility: older version stored an array
      if (Array.isArray(stored)) {
        return stored[0] || null;
      }
      return stored || null;
    });
    const [navigatingItemId, setNavigatingItemId] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);

    // Memoized computations
    const effectiveCompanyId = useMemo(
      () => companyId || currentCompany?.id || currentCompany?._id || null,
      [companyId, currentCompany?.id, currentCompany?._id]
    );

    const companyDisplayName = useMemo(() => {
      return currentCompany?.businessName || currentCompany?.name || "No Company";
    }, [currentCompany?.businessName, currentCompany?.name]);

    // Toggle handler for accordion
    const handleToggle = useCallback(
      (eventKey) => {
        if (eventKey == null) return;
        // Toggle same section to close, otherwise open the clicked one exclusively
        const newActiveKey = activeKey === eventKey ? null : eventKey;
        setActiveKey(newActiveKey);
        storage.set(NAVIGATION_CONSTANTS.CACHE_KEY, newActiveKey);
      },
      [activeKey]
    );

    // Navigation handler - only works for active items
    const handleNavigation = useCallback(
      (pageId) => {
        const page = NAVIGATION_ITEMS.find((item) => item.id === pageId) ||
          NAVIGATION_ITEMS.flatMap((item) => item.children || []).find(
            (child) => child.id === pageId
          );

        if (!page || !page.isActive) {
          return;
        }

        setNavigatingItemId(pageId);
        setSelectedItem(pageId);

        setTimeout(() => {
          setNavigatingItemId(null);
        }, 1000);

        // Handle navigation based on page type
        switch (pageId) {
          case "dashboard":
            if (effectiveCompanyId) {
              navigate(`/companies/${effectiveCompanyId}/dashboard`);
            } else {
              navigate("/dashboard");
            }
            break;
          case "categories":
            if (effectiveCompanyId) {
              navigate(`/companies/${effectiveCompanyId}/categories`);
            } else {
              navigate("/categories");
            }
            break;
          case "items":
            if (effectiveCompanyId) {
              navigate(`/companies/${effectiveCompanyId}/items`);
            } else {
              navigate("/items");
            }
            break;
          case "gst":
            console.log("🎯 GST Navigation Debug:", {
              effectiveCompanyId,
              targetUrl: effectiveCompanyId ? `/companies/${effectiveCompanyId}/info/gst` : "/info/gst"
            });
            try {
              const targetUrl = effectiveCompanyId ? `/companies/${effectiveCompanyId}/info/gst` : "/info/gst";
              console.log("🚀 About to call navigate() with:", targetUrl);
              console.log("🔧 Navigate function:", typeof navigate, navigate);
              
              // Try multiple navigation approaches
              try {
                navigate(targetUrl, { replace: false });
                console.log("✅ Navigate call completed successfully");
              } catch (navError) {
                console.error("❌ navigate() failed:", navError);
              }
              
              // Force URL change and trigger React Router
              setTimeout(() => {
                console.log("🔄 Checking if URL changed:", window.location.pathname);
                if (!window.location.pathname.includes('/info/gst')) {
                  console.log("⚠️ URL didn't change, forcing navigation...");
                  window.history.pushState(null, '', targetUrl);
                  
                  // Trigger a popstate event to make React Router aware of the change
                  window.dispatchEvent(new PopStateEvent('popstate'));
                  
                  // Also try a hard refresh if needed
                  setTimeout(() => {
                    if (!window.location.pathname.includes('/info/gst')) {
                      console.log("🔄 Hard refresh needed");
                      window.location.href = targetUrl;
                    }
                  }, 200);
                }
              }, 100);
            } catch (error) {
              console.error("❌ Navigation error:", error);
            }
            break;
          case "companyBrand":
            console.log("🎯 Company/Brand Navigation Debug:", {
              effectiveCompanyId,
              targetUrl: effectiveCompanyId ? `/companies/${effectiveCompanyId}/info/company-brand` : "/info/company-brand"
            });
            try {
              const targetUrl = effectiveCompanyId ? `/companies/${effectiveCompanyId}/info/company-brand` : "/info/company-brand";
              console.log("🚀 About to call navigate() with:", targetUrl);
              console.log("🔧 Navigate function:", typeof navigate, navigate);
              
              // Try multiple navigation approaches
              try {
                navigate(targetUrl, { replace: false });
                console.log("✅ Navigate call completed successfully");
              } catch (navError) {
                console.error("❌ navigate() failed:", navError);
              }
              
              // Force URL change and trigger React Router
              setTimeout(() => {
                console.log("🔄 Checking if URL changed:", window.location.pathname);
                if (!window.location.pathname.includes('/info/company-brand')) {
                  console.log("⚠️ URL didn't change, forcing navigation...");
                  window.history.pushState(null, '', targetUrl);
                  
                  // Trigger a popstate event to make React Router aware of the change
                  window.dispatchEvent(new PopStateEvent('popstate'));
                  
                  // Also try a hard refresh if needed
                  setTimeout(() => {
                    if (!window.location.pathname.includes('/info/company-brand')) {
                      console.log("🔄 Hard refresh needed");
                      window.location.href = targetUrl;
                    }
                  }, 200);
                }
              }, 100);
            } catch (error) {
              console.error("❌ Navigation error:", error);
            }
            break;
          case "parties":
            // Navigate to dedicated parties route
            console.log(`🎯 Navigating to parties route, effectiveCompanyId:`, effectiveCompanyId);
            if (effectiveCompanyId) {
              const fullUrl = `/companies/${effectiveCompanyId}/parties`;
              console.log(`🎯 Navigating to URL:`, fullUrl);
              navigate(fullUrl);
            } else {
              console.log(`🎯 Navigating to global parties route`);
              navigate("/parties");
            }
            break;
          case "customers":
            // Navigate to dedicated customers route
            console.log(`🎯 Navigating to customers route, effectiveCompanyId:`, effectiveCompanyId);
            if (effectiveCompanyId) {
              const fullUrl = `/companies/${effectiveCompanyId}/customers`;
              console.log(`🎯 Navigating to URL:`, fullUrl);
              navigate(fullUrl);
            } else {
              console.log(`🎯 Navigating to global customers route`);
              navigate("/customers");
            }
            break;
          case "vendors":
            // Navigate to dedicated vendors route
            console.log(`🎯 Navigating to vendors route, effectiveCompanyId:`, effectiveCompanyId);
            if (effectiveCompanyId) {
              const fullUrl = `/companies/${effectiveCompanyId}/vendors`;
              console.log(`🎯 Navigating to URL:`, fullUrl);
              navigate(fullUrl);
            } else {
              console.log(`🎯 Navigating to global vendors route`);
              navigate("/vendors");
            }
            break;
          default:
            // Handle other navigation if needed
            break;
        }

        if (onNavigate) {
          onNavigate(pageId);
        }
      },
      [effectiveCompanyId, navigate]
    );

    // Check if item is disabled
    const isItemDisabled = useCallback(
      (page) => {
        return page.requiresCompany && !effectiveCompanyId;
      },
      [effectiveCompanyId]
    );

    // Check if route is active
    const isRouteActive = useCallback(
      (pageId) => {
        return selectedItem === pageId || activePage === pageId;
      },
      [selectedItem, activePage]
    );

    // Clear navigation state when route changes
    useEffect(() => {
      setNavigatingItemId(null);
    }, [location.pathname]);

    // Handle click outside sidebar on mobile to close it
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          isMobileDevice() &&
          isOpen &&
          sidebarRef.current &&
          !sidebarRef.current.contains(event.target) &&
          toggleSidebar
        ) {
          toggleSidebar();
        }
      };

      // Only add event listener on mobile when sidebar is open
      if (isMobileDevice() && isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }, [isOpen, toggleSidebar]);

    // Render navigation items
    const renderedItems = useMemo(
      () =>
        NAVIGATION_ITEMS.map((item) => {
          if (item.type === "single") {
            return (
              <NavigationLink
                key={item.id}
                item={item}
                isActive={isRouteActive(item.id)}
                isDisabled={isItemDisabled(item)}
                onClick={handleNavigation}
                isNavigating={navigatingItemId === item.id}
                onContentChange={onContentChange}
                toggleSidebar={toggleSidebar}
              />
            );
          }

          if (item.type === "accordion") {
            const isExpanded = activeKey === item.section;
            return (
              <AccordionItem
                key={item.id}
                item={item}
                isExpanded={isExpanded}
                onToggle={handleToggle}
                onContentChange={onContentChange}
                isOpen={isOpen}
              >
                {item.children?.map((child) => (
                  <SubMenuItem
                    key={child.id}
                    child={child}
                    isActive={isRouteActive(child.id)}
                    isDisabled={isItemDisabled(child)}
                    onClick={handleNavigation}
                    isNavigating={navigatingItemId === child.id}
                    onContentChange={onContentChange}
                    toggleSidebar={toggleSidebar}
                  />
                ))}
              </AccordionItem>
            );
          }

          return null;
        }),
      [
        activeKey,
        handleToggle,
        isRouteActive,
        isItemDisabled,
        handleNavigation,
        navigatingItemId,
        onContentChange,
        isOpen,
      ]
    );

    return (
      <>
        {/* Mobile Backdrop - Only show on mobile when sidebar is open */}
        {isOpen && (
          <div 
            className="new-sidebar-backdrop d-block d-md-none"
            onClick={toggleSidebar}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1040,
              cursor: 'pointer'
            }}
          />
        )}
        
        <div 
          ref={sidebarRef}
          className={`new-sidebar ${isOpen ? "open" : "closed"}`}
        >
          {/* Toggle Button */}
          <button
            className="modern-sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
          >
            <FontAwesomeIcon icon={isOpen ? faAngleLeft : faAngleRight} />
          </button>

        {/* Sidebar Menu */}
        <Nav className="new-sidebar-menu">
          {/* Header Section */}
          <div className="new-sidebar-header-section">
            <div className="new-sidebar-title">
              <FontAwesomeIcon icon={faHome} className="me-2" />
              <span className="new-sidebar-text">{companyDisplayName}</span>
            </div>
          </div>

          {/* Navigation Items */}
          <Accordion
            activeKey={activeKey || undefined}
            onSelect={handleToggle}
            className="new-sidebar-accordion"
            flush
          >
            {renderedItems}
          </Accordion>
          
          {/* Bottom Spacer */}
          <div className="new-sidebar-spacer"></div>
        </Nav>
      </div>
      </>
    );
  }
);

// PropTypes
NewSidebar.propTypes = {
  isOpen: PropTypes.bool,
  toggleSidebar: PropTypes.func,
  onNavigate: PropTypes.func,
  activePage: PropTypes.string,
  currentCompany: PropTypes.shape({
    id: PropTypes.string,
    _id: PropTypes.string,
    name: PropTypes.string,
    businessName: PropTypes.string,
  }),
  currentUser: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    role: PropTypes.string,
  }),
  companyId: PropTypes.string,
  onContentChange: PropTypes.func,
};

NewSidebar.displayName = "NewSidebar";

export default NewSidebar;