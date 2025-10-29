import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Accordion, Nav } from "react-bootstrap";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
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
  faReceipt,
  faMoneyBillWave,
  faArrowDown,
  faArrowUp,
  faExchangeAlt,
} from "@fortawesome/free-solid-svg-icons";
import PropTypes from "prop-types";
import "./NewSidebar.css";

// Navigation constants
const NAVIGATION_CONSTANTS = Object.freeze({
  ACCORDION_SECTIONS: {
    PARTIES: "parties",
    SALES: "sales",
    PURCHASE_EXPENSE: "purchaseExpense",
    EXPENSES: "expenses",
    TRANSACTIONS: "transactions",
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
    isActive: true,
  },
  {
    id: "categories",
    label: "Category Management",
    icon: faClipboardList,
    type: "single",
    requiresCompany: false,
    isActive: true,
  },
  {
    id: "items",
    label: "Item Management",
    icon: faBox,
    type: "single",
    requiresCompany: false,
    isActive: true,
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
        id: "endCustomers",
        label: "End Customers",
        icon: faUserFriends,
        path: "/end-customers", // This must match your routeMap key!
        requiresCompany: true,
        isActive: true,
      },
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
    icon: faMoneyBillWave,
    type: "accordion",
    section: "sales",
    requiresCompany: true,
    isActive: true,
    children: [
      {
        id: "sales-with-gst",
        label: "Sales with GST",
        icon: faFileInvoiceDollar,
        requiresCompany: true,
        isActive: true,
      },
      {
        id: "sales-without-gst",
        label: "Sales without GST",
        icon: faFileInvoice,
        requiresCompany: true,
        isActive: true,
      },
      {
        id: "sales-invoice", // Add this new item
        label: "Sales Invoice",
        icon: faFileContract,
        requiresCompany: true,
        isActive: true,
      },
      {
        id: "all-bills",
        label: "All Bills",
        icon: faClipboardList,
        requiresCompany: true,
        isActive: true,
      },
    ],
  },
  {
    id: "purchase",
    label: "Purchase",
    icon: faShoppingBag,
    type: "accordion",
    section: "purchase",
    requiresCompany: true,
    isActive: true,
    children: [
      {
        id: "purchaseBill",
        label: "Purchase Bill",
        icon: faFileInvoiceDollar,
        path: "/purchase-bill",
        requiresCompany: true,
        isActive: true,
      },
      {
        id: "purchaseOrder",
        label: "Purchase Order",
        icon: faClipboardList,
        path: "/purchase-order",
        requiresCompany: true,
        isActive: true,
      },
      {
        id: "purchaseBillWithoutGST", // <-- Add this block
        label: "Purchase Bill Without GST",
        icon: faFileInvoice,
        path: "/purchase-bill-without-gst",
        requiresCompany: true,
        isActive: true,
      },
    ],
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: faReceipt,
    type: "accordion",
    section: "expenses",
    isActive: true, // ✅ ACTIVE - New Expenses management
    children: [
      {
        id: "expenseManagement",
        label: "Expenses",
        icon: faMoneyBillWave,
        requiresCompany: true,
        isActive: true,
      },
      {
        id: "indirectIncome",
        label: "Indirect Income",
        icon: faChartLine,
        requiresCompany: true,
        isActive: true,
      },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    icon: faMoneyBillWave,
    type: "accordion",
    section: "sales",
    requiresCompany: true,
    isActive: true,
    children: [
      {
        id: "sales-with-gst",
        label: "Sales with GST",
        icon: faFileInvoiceDollar,
        requiresCompany: true,
        isActive: true,
      },
      {
        id: "sales-without-gst",
        label: "Sales without GST",
        icon: faFileInvoice,
        requiresCompany: true,
        isActive: true,
      },
      {
        id: "sales-invoice", // Add this new item
        label: "Sales Invoice",
        icon: faFileContract,
        requiresCompany: true,
        isActive: true,
      },
      {
        id: "all-bills",
        label: "All Bills",
        icon: faClipboardList,
        requiresCompany: true,
        isActive: true,
      },
    ],
  },
  {
    id: "bankAccounts",
    label: "Bank Accounts",
    icon: faUniversity,
    type: "single",
    requiresCompany: true,
    isActive: true,
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: faExchangeAlt,
    type: "accordion",
    section: "transactions",
    requiresCompany: true,
    isActive: true, // ✅ ACTIVE - New Transactions management
    children: [
      {
        id: "paymentIn",
        label: "Payment In",
        icon: faArrowDown,
        requiresCompany: true,
        isActive: true,
      },
      {
        id: "paymentOut",
        label: "Payment Out",
        icon: faArrowUp,
        requiresCompany: true,
        isActive: true,
      },
    ],
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
      // console.log("🎯 SubMenuItem handleClick called for:", child.id);
      
      // Prevent default link behavior to allow React Router navigation
      e.preventDefault();
      
      if (isDisabled || !child.isActive) {
        // console.log("⚠️ Item disabled or inactive:", { isDisabled, isActive: child.isActive });
        return;
      }
      
      // Handle navigation for info items through routes
      const routeNavigationItems = ['gst', 'companyBrand'];
      const contentDisplayItems = ['parties', 'customers', 'vendors', 'expenseManagement', 'indirectIncome', 'paymentIn', 'paymentOut'];
      const navigationItems = [];
      
      if (routeNavigationItems.includes(child.id)) {
        // For customers and vendors, navigate to the specific route
        // console.log("🚀 Route navigation item - navigating to:", child.id);
        onClick(child.id);
      } else if (contentDisplayItems.includes(child.id)) {
        // For pure content display items, only call onContentChange
        // console.log("📋 Content display item - calling onContentChange for:", child.id, child.label);
        if (onContentChange) {
          onContentChange(child.id, child.label);
        }
        // Explicitly return to avoid any further processing
        return;
      } else {
        // For all other items, call both onClick and onContentChange
        // console.log("🚀 Calling onClick for:", child.id);
        onClick(child.id);
        
        // Also call onContentChange
        if (onContentChange) {
          // console.log("📋 Calling onContentChange for:", child.id, child.label);
          onContentChange(child.id, child.label);
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
    onSelect, // Add onSelect prop for compatibility
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
      [companyId, currentCompany]
    );

    const companyDisplayName = useMemo(() => {
      return currentCompany?.businessName || currentCompany?.name || "No Company";
    }, [currentCompany]);

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
            // console.log("🎯 GST Navigation Debug:", {
            //   effectiveCompanyId,
            //   targetUrl: effectiveCompanyId ? `/companies/${effectiveCompanyId}/info/gst` : "/info/gst"
            // });
            try {
              const targetUrl = effectiveCompanyId ? `/companies/${effectiveCompanyId}/info/gst` : "/info/gst";
              // console.log("🚀 About to call navigate() with:", targetUrl);
              // console.log("🔧 Navigate function:", typeof navigate, navigate);
              
              // Try multiple navigation approaches
              try {
                navigate(targetUrl, { replace: false });
                console.log("✅ Navigate call completed successfully");
              } catch (navError) {
                console.error("❌ navigate() failed:", navError);
              }
              
              // Force URL change and trigger React Router
              setTimeout(() => {
                // console.log("🔄 Checking if URL changed:", window.location.pathname);
                if (!window.location.pathname.includes('/info/gst')) {
                  // console.log("⚠️ URL didn't change, forcing navigation...");
                  window.history.pushState(null, '', targetUrl);
                  
                  // Trigger a popstate event to make React Router aware of the change
                  window.dispatchEvent(new PopStateEvent('popstate'));
                  
                  // Also try a hard refresh if needed
                  setTimeout(() => {
                    if (!window.location.pathname.includes('/info/gst')) {
                      // console.log("🔄 Hard refresh needed");
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
            // console.log("🎯 Company/Brand Navigation Debug:", {
            //   effectiveCompanyId,
            //   targetUrl: effectiveCompanyId ? `/companies/${effectiveCompanyId}/info/company-brand` : "/info/company-brand"
            // });
            try {
              const targetUrl = effectiveCompanyId ? `/companies/${effectiveCompanyId}/info/company-brand` : "/info/company-brand";
              // console.log("🚀 About to call navigate() with:", targetUrl);
              // console.log("🔧 Navigate function:", typeof navigate, navigate);
              
              // Try multiple navigation approaches
              try {
                navigate(targetUrl, { replace: false });
                // console.log("✅ Navigate call completed successfully");
              } catch (navError) {
                console.error("❌ navigate() failed:", navError);
              }
              
              // Force URL change and trigger React Router
              setTimeout(() => {
                // console.log("🔄 Checking if URL changed:", window.location.pathname);
                if (!window.location.pathname.includes('/info/company-brand')) {
                  // console.log("⚠️ URL didn't change, forcing navigation...");
                  window.history.pushState(null, '', targetUrl);
                  
                  // Trigger a popstate event to make React Router aware of the change
                  window.dispatchEvent(new PopStateEvent('popstate'));
                  
                  // Also try a hard refresh if needed
                  setTimeout(() => {
                    if (!window.location.pathname.includes('/info/company-brand')) {
                      // console.log("🔄 Hard refresh needed");
                      window.location.href = targetUrl;
                    }
                  }, 200);
                }
              }, 100);
            } catch (error) {
              console.error("❌ Navigation error:", error);
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

    const getPath = (type) => {
      const infoMap = {
        gst: '/info/gst',
        companyBrand: '/info/company-brand',
      };

      let path = `/${type}`;

      switch (type) {
        case 'expenseManagement':
          path = '/expenses';
          break;
        case 'indirectIncome':
          path = '/indirect-income';
          break;
        case 'paymentIn':
          path = '/payment-in';
          break;
        case 'paymentOut':
          path = '/payment-out';
          break;
        case 'salesWithGST':
          path = '/salesWithGST';
          break;
        case 'salesWithoutGST':
          path = '/salesWithoutGST';
          break;
        case 'salesInvoice': // Navigate to landing page (SalesInvoiceList)
          path = '/sales';
          break;
        case 'allBills':
          path = '/allBills';
          break;
        case 'gst':
          path = '/gst';
          break;
        case 'companyBrand':
          path = '/company-brand';
          break;
        case 'endCustomers':
          path = '/end-customers';
          break;
        case 'purchaseBill': // Navigate to landing page (PurchaseInvoiceList)
          path = '/purchases';
          break;
        case 'purchaseOrder':
          path = '/purchase-order';
          break;
        case 'purchaseBillWithoutGST':
          path = '/purchase-bill-without-gst';
          break;
        case 'bankAccounts':
          path = '/bank-accounts';
          break;
        // Add more mappings if needed
        default:
          break;
      }

      if (effectiveCompanyId) {
        if (infoMap[type]) {
          path = `/companies/${effectiveCompanyId}${infoMap[type]}`;
        } else {
          path = `/companies/${effectiveCompanyId}${path}`;
        }
      } else if (infoMap[type]) {
        path = infoMap[type];
      }

      // console.log("🔗 Generated path for", type, ":", path); // Debug log
      return path;
    };

    // Navigation handler for simple routes
    const handleSimpleNavigation = (title, type) => {
      const path = getPath(type);
      if (onSelect) onSelect(title, type);
      if (onContentChange) onContentChange(type, title);
      navigate(path);
      if (isMobileDevice() && toggleSidebar) {
        toggleSidebar();
      }
    };

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

          {/* Sidebar Header */}
          <div className="new-sidebar-header-section">
            <div className="new-sidebar-title">
              <FontAwesomeIcon icon={faBuilding} className="me-2" />
              <span className="new-sidebar-text">{companyDisplayName}</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="new-sidebar-menu">
            {/* Single Links for Dashboard, Categories, Items */}
            <div className="new-sidebar-item">
              <NavLink
                to={getPath('dashboard')}
                className={({ isActive }) => `new-sidebar-link ${isActive ? "active" : ""}`}
                onClick={() => handleSimpleNavigation("Dashboard", "dashboard")}
              >
                <div className="new-sidebar-link-content">
                  <FontAwesomeIcon icon={faTachometerAlt} className="new-sidebar-icon" />
                  <span className="new-sidebar-text">Dashboard</span>
                </div>
              </NavLink>
            </div>

            <div className="new-sidebar-item">
              <NavLink
                to={getPath('categories')}
                className={({ isActive }) => `new-sidebar-link ${isActive ? "active" : ""}`}
                onClick={() => handleSimpleNavigation("Category Management", "categories")}
              >
                <div className="new-sidebar-link-content">
                  <FontAwesomeIcon icon={faClipboardList} className="new-sidebar-icon" />
                  <span className="new-sidebar-text">Categories</span>
                </div>
              </NavLink>
            </div>

            <div className="new-sidebar-item">
              <NavLink
                to={getPath('items')}
                className={({ isActive }) => `new-sidebar-link ${isActive ? "active" : ""}`}
                onClick={() => handleSimpleNavigation("Item Management", "items")}
              >
                <div className="new-sidebar-link-content">
                  <FontAwesomeIcon icon={faBox} className="new-sidebar-icon" />
                  <span className="new-sidebar-text">Items</span>
                </div>
              </NavLink>
            </div>

            <div className="new-sidebar-item">
              <NavLink
                to={getPath('bankAccounts')}
                className={({ isActive }) => `new-sidebar-link ${isActive ? "active" : ""}`}
                onClick={() => handleSimpleNavigation("Bank Accounts", "bankAccounts")}
              >
                <div className="new-sidebar-link-content">
                  <FontAwesomeIcon icon={faUniversity} className="new-sidebar-icon" />
                  <span className="new-sidebar-text">Bank Accounts</span>
                </div>
              </NavLink>
            </div>

            {/* Accordion Navigation */}
            <Accordion className="new-sidebar-accordion" activeKey={activeKey}>
              {/* Parties Section */}
              <Accordion.Item eventKey="parties" className="new-sidebar-accordion-item">
                <div className="new-sidebar-header">
                  <Accordion.Button onClick={() => handleToggle("parties")}>
                    <div className="new-sidebar-link-content">
                      <FontAwesomeIcon icon={faUsers} className="new-sidebar-icon" />
                      <span className="new-sidebar-text">Parties</span>
                    </div>
                    <FontAwesomeIcon 
                      icon={faAngleRight} 
                      className={`chevron-icon ${activeKey === "parties" ? "rotated" : ""}`} 
                    />
                  </Accordion.Button>
                </div>
                <Accordion.Collapse eventKey="parties">
                  <div className="new-sidebar-submenu">
                    <NavLink
                      to={getPath('customers')}
                      className={({ isActive }) => `new-submenu-item ${isActive ? "active" : ""}`}
                      onClick={() => handleSimpleNavigation("Customers", "customers")}
                    >
                      <FontAwesomeIcon icon={faUserFriends} className="me-2" />
                      Customers
                    </NavLink>
                    <NavLink
                      to={getPath('vendors')}
                      className={({ isActive }) => `new-submenu-item ${isActive ? "active" : ""}`}
                      onClick={() => handleSimpleNavigation("Vendors", "vendors")}
                    >
                      <FontAwesomeIcon icon={faUserTie} className="me-2" />
                      Vendors
                    </NavLink>
                    <NavLink
                      to={getPath('endCustomers')}
                      className={({ isActive }) => `new-submenu-item ${isActive ? "active" : ""}`}
                      onClick={() => handleSimpleNavigation("End Customers", "endCustomers")}
                    >
                      <FontAwesomeIcon icon={faUserFriends} className="me-2" />
                      End Customers
                    </NavLink>
                  </div>
                </Accordion.Collapse>
              </Accordion.Item>

              {/* Expenses Section */}
              <Accordion.Item eventKey="expenses" className="new-sidebar-accordion-item">
                <div className="new-sidebar-header">
                  <Accordion.Button onClick={() => handleToggle("expenses")}>
                    <div className="new-sidebar-link-content">
                      <FontAwesomeIcon icon={faMoneyBillWave} className="new-sidebar-icon" />
                      <span className="new-sidebar-text">Expenses</span>
                    </div>
                    <FontAwesomeIcon 
                      icon={faAngleRight} 
                      className={`chevron-icon ${activeKey === "expenses" ? "rotated" : ""}`} 
                    />
                  </Accordion.Button>
                </div>
                <Accordion.Collapse eventKey="expenses">
                  <div className="new-sidebar-submenu">
                    <NavLink
                      to={getPath('expenseManagement')}
                      className={({ isActive }) => `new-submenu-item ${isActive ? "active" : ""}`}
                      onClick={() => handleSimpleNavigation("Expenses", "expenseManagement")}
                    >
                      <FontAwesomeIcon icon={faReceipt} className="me-2" />
                      Expenses
                    </NavLink>
                    <NavLink
                      to={getPath('indirectIncome')}
                      className={({ isActive }) => `new-submenu-item ${isActive ? "active" : ""}`}
                      onClick={() => handleSimpleNavigation("Indirect Income", "indirectIncome")}
                    >
                      <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
                      Indirect Income
                    </NavLink>
                  </div>
                </Accordion.Collapse>
              </Accordion.Item>

              {/* Sales Section */}
              <Accordion.Item eventKey="sales" className="new-sidebar-accordion-item">
                <div className="new-sidebar-header">
                  <Accordion.Button onClick={() => handleToggle("sales")}>
                    <div className="new-sidebar-link-content">
                      <FontAwesomeIcon icon={faShoppingCart} className="new-sidebar-icon" />
                      <span className="new-sidebar-text">Sales</span>
                    </div>
                    <FontAwesomeIcon 
                      icon={faAngleRight} 
                      className={`chevron-icon ${activeKey === "sales" ? "rotated" : ""}`} 
                    />
                  </Accordion.Button>
                </div>
                <Accordion.Collapse eventKey="sales">
                  <div className="new-sidebar-submenu">
                    <NavLink
                      to={getPath('salesWithGST')}
                      className={({ isActive }) => `new-submenu-item ${isActive ? "active" : ""}`}
                      onClick={() => {
                        // console.log("🖱️ Clicked Sales with GST"); // Debug log
                        handleSimpleNavigation("Sales with GST", "salesWithGST");
                      }}
                    >
                      <FontAwesomeIcon icon={faFileInvoiceDollar} className="me-2" />
                      Sales with GST
                    </NavLink>
                    <NavLink
                      to={getPath('salesWithoutGST')}
                      className={({ isActive }) => `new-submenu-item ${isActive ? "active" : ""}`}
                      onClick={() => {
                        // console.log("🖱️ Clicked Sales without GST"); // Debug log
                        handleSimpleNavigation("Sales without GST", "salesWithoutGST");
                      }}
                    >
                      <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                      Sales without GST
                    </NavLink>
                    <NavLink
                      to={getPath('salesInvoice')}
                      className={({ isActive }) => `new-submenu-item ${isActive ? "active" : ""}`}
                      onClick={() => {
                        // console.log("🖱️ Clicked Sales Invoice"); // Debug log
                        handleSimpleNavigation("Sales Invoice", "salesInvoice");
                      }}
                    >
                      <FontAwesomeIcon icon={faFileContract} className="me-2" />
                      Sales Invoice
                    </NavLink>
                    <NavLink
                      to={getPath('allBills')}
                      className={({ isActive }) => `new-submenu-item ${isActive ? "active" : ""}`}
                      onClick={() => {
                        // console.log("🖱️ Clicked All Bills"); // Debug log
                        handleSimpleNavigation("All Bills", "allBills");
                      }}
                    >
                      <FontAwesomeIcon icon={faClipboardList} className="me-2" />
                      All Bills
                    </NavLink>
                  </div>
                </Accordion.Collapse>
              </Accordion.Item>

              {/* Transactions Section */}
              <Accordion.Item eventKey="transactions" className="new-sidebar-accordion-item">
                <div className="new-sidebar-header">
                  <Accordion.Button onClick={() => handleToggle("transactions")}>
                    <div className="new-sidebar-link-content">
                      <FontAwesomeIcon icon={faExchangeAlt} className="new-sidebar-icon" />
                      <span className="new-sidebar-text">Transactions</span>
                    </div>
                    <FontAwesomeIcon 
                      icon={faAngleRight} 
                      className={`chevron-icon ${activeKey === "transactions" ? "rotated" : ""}`} 
                    />
                  </Accordion.Button>
                </div>
                <Accordion.Collapse eventKey="transactions">
                  <div className="new-sidebar-submenu">
                    <NavLink
                      to={getPath('paymentIn')}
                      className={({ isActive }) => `new-submenu-item ${isActive ? "active" : ""}`}
                      onClick={() => handleSimpleNavigation("Payment In", "paymentIn")}
                    >
                      <FontAwesomeIcon icon={faArrowDown} className="me-2" />
                      Payment In
                    </NavLink>
                    <NavLink
                      to={getPath('paymentOut')}
                      className={({ isActive }) => `new-submenu-item ${isActive ? "active" : ""}`}
                      onClick={() => handleSimpleNavigation("Payment Out", "paymentOut")}
                    >
                      <FontAwesomeIcon icon={faArrowUp} className="me-2" />
                      Payment Out
                    </NavLink>
                  </div>
                </Accordion.Collapse>
              </Accordion.Item>

              {/* Info Section */}
              <Accordion.Item eventKey="info" className="new-sidebar-accordion-item">
                <div className="new-sidebar-header">
                  <Accordion.Button onClick={() => handleToggle("info")}>
                    <div className="new-sidebar-link-content">
                      <FontAwesomeIcon icon={faInfoCircle} className="new-sidebar-icon" />
                      <span className="new-sidebar-text">Info</span>
                    </div>
                    <FontAwesomeIcon 
                      icon={faAngleRight} 
                      className={`chevron-icon ${activeKey === "info" ? "rotated" : ""}`} 
                    />
                  </Accordion.Button>
                </div>
                <Accordion.Collapse eventKey="info">
                  <div className="new-sidebar-submenu">
                    <NavLink
                      to={getPath('gst')}
                      className={({ isActive }) => `new-submenu-item ${isActive ? "active" : ""}`}
                      onClick={() => handleSimpleNavigation("GST", "gst")}
                    >
                      <FontAwesomeIcon icon={faPercent} className="me-2" />
                      GST
                    </NavLink>
                    <NavLink
                      to={getPath('companyBrand')}
                      className={({ isActive }) => `new-submenu-item ${isActive ? "active" : ""}`}
                      onClick={() => handleSimpleNavigation("Company/Brand", "companyBrand")}
                    >
                      <FontAwesomeIcon icon={faBuilding} className="me-2" />
                      Company/Brand
                    </NavLink>
                  </div>
                </Accordion.Collapse>
              </Accordion.Item>

              {/* Purchase Section */}
              <Accordion.Item eventKey="purchase" className="new-sidebar-accordion-item">
                <div className="new-sidebar-header">
                  <Accordion.Button onClick={() => handleToggle("purchase")}>
                    <div className="new-sidebar-link-content">
                      <FontAwesomeIcon icon={faShoppingBag} className="new-sidebar-icon" />
                      <span className="new-sidebar-text">Purchase</span>
                    </div>
                    <FontAwesomeIcon 
                      icon={faAngleRight} 
                      className={`chevron-icon ${activeKey === "purchase" ? "rotated" : ""}`} 
                    />
                  </Accordion.Button>
                </div>
                <Accordion.Collapse eventKey="purchase">
                  <div className="new-sidebar-submenu">
                    <NavLink
                      to={getPath('purchaseBill')}
                      className={({ isActive }) => `new-submenu-item ${isActive ? "active" : ""}`}
                      onClick={() => handleSimpleNavigation("Purchase Bill", "purchaseBill")}
                    >
                      <FontAwesomeIcon icon={faFileInvoiceDollar} className="me-2" />
                      Purchase Bill
                    </NavLink>
                    <NavLink
                      to={getPath('purchaseOrder')}
                      className={({ isActive }) => `new-submenu-item ${isActive ? "active" : ""}`}
                      onClick={() => handleSimpleNavigation("Purchase Order", "purchaseOrder")}
                    >
                      <FontAwesomeIcon icon={faClipboardList} className="me-2" />
                      Purchase Order
                    </NavLink>
                    <NavLink
                      to={getPath('purchaseBillWithoutGST')}
                      className={({ isActive }) => `new-submenu-item ${isActive ? "active" : ""}`}
                      onClick={() => handleSimpleNavigation("Purchase Bill Without GST", "purchaseBillWithoutGST")}
                    >
                      <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                      Purchase Bill Without GST
                    </NavLink>
                  </div>
                </Accordion.Collapse>
              </Accordion.Item>
            </Accordion>
          </div>
          
          {/* Bottom Spacer */}
          <div className="new-sidebar-spacer"></div>
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
  onSelect: PropTypes.func, // Add onSelect to PropTypes
};

NewSidebar.displayName = "NewSidebar";

export default NewSidebar;