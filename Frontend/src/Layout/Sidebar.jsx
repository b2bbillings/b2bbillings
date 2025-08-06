import React, {useState, useEffect, useCallback, useMemo} from "react";
import {Accordion, Nav} from "react-bootstrap";
import {useNavigate, useLocation} from "react-router-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faShoppingCart,
  faShoppingBag,
  faClipboardList,
  faBook,
  faUserFriends,
  faAngleRight,
  faWarehouse,
  faExclamationTriangle,
  faUserTie,
  faFileInvoice,
  faFileContract,
  faFileInvoiceDollar,
  faUniversity,
  faUsers,
  faTasks,
  faWifi,
  faCircle,
  faDotCircle,
  faTimes,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import PropTypes from "prop-types";
import "./Sidebar.css";

// ✅ PERFORMANCE: Pre-computed constants (moved outside component)
const NAVIGATION_CONSTANTS = Object.freeze({
  ACCORDION_SECTIONS: {
    DAY_BOOK: "dayBook",
    SALES: "sales",
    PURCHASE_EXPENSE: "purchaseExpense",
    STAFF_MANAGEMENT: "staffManagement",
  },
  COMPANY_REQUIRED_PAGES: new Set([
    "inventory",
    "allProducts",
    "quotations",
    "invoices",
    "purchaseBills",
    "purchaseOrders",
    "bankAccounts",
    "parties",
  ]),
  DEFAULT_ACTIVE_SECTIONS: ["dayBook"],
  CACHE_KEY: "sidebar_accordion_state",
  DEBOUNCE_DELAY: 150,
});

// ✅ PERFORMANCE: Pre-computed route patterns (removed insights, reports, settings)
const ROUTE_PATTERNS = new Map([
  ["daybook", [/\/daybook/, /\/companies\/[^/]+\/daybook/]],
  ["parties", [/\/parties/, /\/companies\/[^/]+\/parties/]],
  ["quotations", [/\/quotations/, /\/companies\/[^/]+\/quotations/]],
  ["invoices", [/\/sales/, /\/invoices/, /\/companies\/[^/]+\/sales/]],
  ["purchases", [/\/purchases/, /\/companies\/[^/]+\/purchases/]],
  [
    "purchase-orders",
    [/\/purchase-orders/, /\/companies\/[^/]+\/purchase-orders/],
  ],
  ["inventory", [/\/inventory/, /\/companies\/[^/]+\/inventory/]],
  ["bank-accounts", [/\/bank-accounts/, /\/companies\/[^/]+\/bank-accounts/]],
  ["staff", [/\/staff/, /\/companies\/[^/]+\/staff/]],
]);

// ✅ PERFORMANCE: Lightweight navigation config (removed insights, reports, settings)
const NAVIGATION_ITEMS = [
  {
    id: "dailySummary",
    label: "Day Book",
    icon: faBook,
    type: "single",
    requiresCompany: false,
  },
  {
    id: "parties",
    label: "Parties",
    icon: faUserFriends,
    type: "single",
    requiresCompany: true,
  },
  {
    id: "sales",
    label: "Sales",
    icon: faShoppingCart,
    type: "accordion",
    section: "sales",
    children: [
      {
        id: "quotations",
        label: "Quotations",
        icon: faFileContract,
        requiresCompany: true,
      },
      {
        id: "invoices",
        label: "Invoices",
        icon: faFileInvoice,
        requiresCompany: true,
      },
    ],
  },
  {
    id: "purchaseExpense",
    label: "Purchase & Expense",
    icon: faShoppingBag,
    type: "accordion",
    section: "purchaseExpense",
    children: [
      {
        id: "purchaseBills",
        label: "Purchase Bills",
        icon: faFileInvoiceDollar,
        requiresCompany: true,
      },
      {
        id: "purchaseOrders",
        label: "Purchase Orders",
        icon: faClipboardList,
        requiresCompany: true,
      },
    ],
  },
  {
    id: "bankAccounts",
    label: "Bank Accounts",
    icon: faUniversity,
    type: "single",
    requiresCompany: true,
  },
  {
    id: "allProducts",
    label: "Inventory",
    icon: faWarehouse,
    type: "single",
    requiresCompany: true,
  },
  {
    id: "staffManagement",
    label: "Staff Management",
    icon: faUserTie,
    type: "accordion",
    section: "staffManagement",
    children: [
      {
        id: "staffList",
        label: "Staff List",
        icon: faUsers,
        requiresCompany: false,
      },
      {
        id: "dailyTaskAssignment",
        label: "Daily Task Assignment",
        icon: faTasks,
        requiresCompany: false,
      },
    ],
  },
];

// ✅ PERFORMANCE: Simplified storage utilities
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
      console.warn("Storage failed:", e);
    }
  },
};

// ✅ PERFORMANCE: Optimized debounce hook
const useDebounce = (callback, delay) => {
  const timeoutRef = React.useRef();

  return useCallback(
    (...args) => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay]
  );
};

// ✅ PERFORMANCE: Memoized route checker
const useRouteChecker = (pathname, activePage) => {
  return useCallback(
    (pageId) => {
      const patterns = ROUTE_PATTERNS.get(pageId);
      if (!patterns) return activePage === pageId;

      return (
        patterns.some((pattern) => pattern.test(pathname)) ||
        activePage === pageId
      );
    },
    [pathname, activePage]
  );
};

// ✅ FIXED: Individual navigation item components with item-specific loading
const NavigationLink = React.memo(
  ({item, isActive, isDisabled, onClick, navigatingItemId}) => {
    const isNavigating = navigatingItemId === item.id;
    const className = `sidebar-link ${isActive ? "active" : ""} ${
      isDisabled ? "disabled" : ""
    } ${isNavigating ? "navigating" : ""}`;

    return (
      <div className="sidebar-item">
        <Nav.Link
          onClick={onClick}
          className={className}
          disabled={isDisabled}
          aria-label={item.label}
        >
          <div className="sidebar-link-content">
            <FontAwesomeIcon icon={item.icon} className="sidebar-icon" />
            <span className="sidebar-text">{item.label}</span>
          </div>
        </Nav.Link>
      </div>
    );
  }
);

NavigationLink.displayName = "NavigationLink";

const AccordionItem = React.memo(({item, isExpanded, onToggle, children}) => (
  <div className="sidebar-item">
    <Accordion.Item eventKey={item.section} className="sidebar-accordion-item">
      <Accordion.Header
        className="sidebar-header"
        onClick={(e) => {
          e.preventDefault();
          onToggle(item.section);
        }}
      >
        <div className="sidebar-link-content">
          <FontAwesomeIcon icon={item.icon} className="sidebar-icon" />
          <span className="sidebar-text">{item.label}</span>
        </div>
        <FontAwesomeIcon
          icon={faAngleRight}
          className={`chevron-icon ${isExpanded ? "rotated" : ""}`}
        />
      </Accordion.Header>
      <Accordion.Body className="sidebar-submenu">
        <Nav className="flex-column">{children}</Nav>
      </Accordion.Body>
    </Accordion.Item>
  </div>
));

AccordionItem.displayName = "AccordionItem";

const SubMenuItem = React.memo(
  ({child, isActive, isDisabled, onClick, navigatingItemId}) => {
    const isNavigating = navigatingItemId === child.id;
    const className = `submenu-item ${isActive ? "active" : ""} ${
      isDisabled ? "disabled" : ""
    } ${isNavigating ? "navigating" : ""}`;

    return (
      <Nav.Link
        onClick={onClick}
        className={className}
        disabled={isDisabled}
        aria-label={child.label}
      >
        <FontAwesomeIcon icon={child.icon} className="me-2" />
        {child.label}
      </Nav.Link>
    );
  }
);

SubMenuItem.displayName = "SubMenuItem";

// ✅ FIXED: Main Sidebar Component with item-specific loading
const Sidebar = React.memo(
  ({
    isOpen = true,
    toggleSidebar,
    onNavigate,
    activePage = "",
    currentCompany = null,
    currentUser = null,
    isOnline = true,
    companyId = null,
  }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // ✅ FIXED: Item-specific navigation state
    const [activeKey, setActiveKey] = useState(() =>
      storage.get(
        NAVIGATION_CONSTANTS.CACHE_KEY,
        NAVIGATION_CONSTANTS.DEFAULT_ACTIVE_SECTIONS
      )
    );
    const [navigatingItemId, setNavigatingItemId] = useState(null); // ✅ FIXED: Track specific item

    // ✅ PERFORMANCE: Memoized computations
    const effectiveCompanyId = useMemo(
      () => companyId || currentCompany?.id || currentCompany?._id || null,
      [companyId, currentCompany?.id, currentCompany?._id]
    );

    const companyDisplayName = useMemo(() => {
      if (!currentCompany) return null;
      return (
        currentCompany.businessName || currentCompany.name || "Unknown Company"
      );
    }, [currentCompany?.businessName, currentCompany?.name]);

    const isRouteActive = useRouteChecker(location.pathname, activePage);

    // ✅ PERFORMANCE: Debounced state saving
    const debouncedSaveState = useDebounce((state) => {
      storage.set(NAVIGATION_CONSTANTS.CACHE_KEY, state);
    }, NAVIGATION_CONSTANTS.DEBOUNCE_DELAY);

    // ✅ PERFORMANCE: Optimized navigation handlers (removed insights, reports, settings)
    const routeHandlers = useMemo(() => {
      const handlers = new Map();

      // Company-independent routes
      handlers.set("dailySummary", () => {
        const route = effectiveCompanyId
          ? `/companies/${effectiveCompanyId}/daybook`
          : "/daybook";
        navigate(route);
      });

      handlers.set("staffList", () => {
        const route = effectiveCompanyId
          ? `/companies/${effectiveCompanyId}/staff`
          : "/staff";
        navigate(route);
      });

      handlers.set("dailyTaskAssignment", () => {
        const route = effectiveCompanyId
          ? `/companies/${effectiveCompanyId}/staff/daily-task-assignment`
          : "/staff/daily-task-assignment";
        navigate(route);
      });

      // Company-dependent routes
      if (effectiveCompanyId) {
        handlers.set("parties", () =>
          navigate(`/companies/${effectiveCompanyId}/parties`)
        );
        handlers.set("allProducts", () =>
          navigate(`/companies/${effectiveCompanyId}/inventory`)
        );
        handlers.set("quotations", () =>
          navigate(`/companies/${effectiveCompanyId}/quotations`)
        );
        handlers.set("invoices", () =>
          navigate(`/companies/${effectiveCompanyId}/sales`)
        );
        handlers.set("purchaseBills", () =>
          navigate(`/companies/${effectiveCompanyId}/purchases`)
        );
        handlers.set("purchaseOrders", () =>
          navigate(`/companies/${effectiveCompanyId}/purchase-orders`)
        );
        handlers.set("bankAccounts", () =>
          navigate(`/companies/${effectiveCompanyId}/bank-accounts`)
        );
      }

      return handlers;
    }, [effectiveCompanyId, navigate]);

    // ✅ PERFORMANCE: Optimized toggle handler
    const handleToggle = useCallback(
      (eventKey) => {
        setActiveKey((prev) => {
          const newState = prev.includes(eventKey)
            ? prev.filter((key) => key !== eventKey)
            : [...prev, eventKey];
          debouncedSaveState(newState);
          return newState;
        });
      },
      [debouncedSaveState]
    );

    // ✅ FIXED: Navigation handler with item-specific loading
    const handleNavigation = useCallback(
      (page) => {
        // Check company requirement
        if (
          NAVIGATION_CONSTANTS.COMPANY_REQUIRED_PAGES.has(page) &&
          !effectiveCompanyId
        ) {
          if (window.showToast) {
            window.showToast("Please select a company first", "warning");
          }
          return;
        }

        // ✅ FIXED: Set loading state for specific item only
        setNavigatingItemId(page);

        // Execute navigation
        const handler = routeHandlers.get(page);
        if (handler) {
          handler();
        } else if (onNavigate) {
          onNavigate(page);
        } else {
          navigate(`/${page}`);
        }

        // ✅ FIXED: Clear loading state for specific item
        setTimeout(() => {
          setNavigatingItemId(null);
        }, 500); // Slightly longer to show loading feedback
      },
      [effectiveCompanyId, routeHandlers, onNavigate, navigate]
    );

    // ✅ PERFORMANCE: Memoized disabled checker
    const isItemDisabled = useCallback(
      (page) =>
        NAVIGATION_CONSTANTS.COMPANY_REQUIRED_PAGES.has(page) &&
        !effectiveCompanyId,
      [effectiveCompanyId]
    );

    // ✅ FIXED: Navigation state effect to clear loading when route changes
    useEffect(() => {
      // Clear navigation loading when route actually changes
      setNavigatingItemId(null);
    }, [location.pathname]);

    // ✅ FIXED: Render optimized navigation items with item-specific loading
    const renderedItems = useMemo(
      () =>
        NAVIGATION_ITEMS.map((item) => {
          if (item.type === "accordion") {
            const isExpanded = activeKey.includes(item.section);

            return (
              <AccordionItem
                key={item.id}
                item={item}
                isExpanded={isExpanded}
                onToggle={handleToggle}
              >
                {item.children?.map((child) => (
                  <SubMenuItem
                    key={child.id}
                    child={child}
                    isActive={isRouteActive(child.id)}
                    isDisabled={isItemDisabled(child.id)}
                    onClick={() => handleNavigation(child.id)}
                    navigatingItemId={navigatingItemId} // ✅ FIXED: Pass specific loading state
                  />
                ))}
              </AccordionItem>
            );
          }

          return (
            <NavigationLink
              key={item.id}
              item={item}
              isActive={isRouteActive(item.id)}
              isDisabled={isItemDisabled(item.id)}
              onClick={() => handleNavigation(item.id)}
              navigatingItemId={navigatingItemId} // ✅ FIXED: Pass specific loading state
            />
          );
        }),
      [
        activeKey,
        handleToggle,
        isRouteActive,
        isItemDisabled,
        handleNavigation,
        navigatingItemId, // ✅ FIXED: Include in dependencies
      ]
    );

    // ✅ PERFORMANCE: Early return for error state
    if (!Array.isArray(NAVIGATION_ITEMS)) {
      return (
        <div className="sidebar error-state">
          <div className="error-message">Navigation configuration error</div>
        </div>
      );
    }

    // ✅ PERFORMANCE: Optimized render
    return (
      <div
        className={`sidebar ${isOpen ? "open" : "closed"}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="sidebar-menu">
          {/* Company Info */}
          {isOpen && companyDisplayName && (
            <div className="sidebar-company-info">
              <div className="company-name" title={companyDisplayName}>
                {companyDisplayName}
              </div>
              <div className="company-status">
                <FontAwesomeIcon
                  icon={isOnline ? faCheck : faTimes}
                  className={`status-icon ${isOnline ? "online" : "offline"}`}
                  title={isOnline ? "Online" : "Offline"}
                />
              </div>
            </div>
          )}

          {/* Navigation Menu */}
          <Accordion activeKey={activeKey} className="sidebar-accordion" flush>
            {renderedItems}
          </Accordion>

          {/* Status Messages */}
          {isOpen && (
            <div className="sidebar-status">
              {!currentCompany && (
                <div className="alert alert-warning small">
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    className="me-2"
                  />
                  Select a company to access all features
                </div>
              )}

              {!isOnline && (
                <div className="alert alert-info small">
                  <FontAwesomeIcon icon={faTimes} className="me-2" />
                  You're offline. Some features may be limited.
                </div>
              )}

              {/* ✅ DEBUG: Show current navigating item (remove in production) */}
              {process.env.NODE_ENV === "development" && navigatingItemId && (
                <div className="alert alert-info small">
                  Loading: {navigatingItemId}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

// ✅ PRODUCTION: PropTypes
Sidebar.propTypes = {
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
  isOnline: PropTypes.bool,
  companyId: PropTypes.string,
};

Sidebar.displayName = "Sidebar";

export default Sidebar;
