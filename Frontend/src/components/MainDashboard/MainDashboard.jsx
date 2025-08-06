import React, {useState, useEffect, useCallback, useMemo, useRef} from "react";
import {Container, Row, Col} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faTachometerAlt,
  faExchangeAlt,
  faComments,
} from "@fortawesome/free-solid-svg-icons";
import PropTypes from "prop-types";

// Import components
import MainNavbar from "./MainNavbar";
import TeamChats from "./TeamChats";
import DailyTransaction from "./DailyTransaction";
import "./MainDashboard.css";

// ✅ FIXED: Using JavaScript default parameters instead of defaultProps
function MainDashboard({
  currentCompany,
  currentUser,
  onNavigate,
  addToast,
  isOnline = true, // ✅ Default parameter
  onLogout,
  onCompanyChange,
  onCompanyCreated,
  companies = [], // ✅ Default parameter
  isLoadingCompanies = false, // ✅ Default parameter
  companyId,
}) {
  // ✅ ADD: Chat popup state management
  const [isChatPopupOpen, setIsChatPopupOpen] = useState(false);
  const mainDashboardRef = useRef(null);

  // State management with localStorage persistence
  const [activeView, setActiveView] = useState(() => {
    const savedView = localStorage.getItem("dashboard-active-view");
    return savedView &&
      ["dashboard", "transactions", "chats"].includes(savedView)
      ? savedView
      : "dashboard";
  });

  // Enhanced responsive state management
  const [screenSize, setScreenSize] = useState(() => {
    const width = window.innerWidth;
    return {
      width,
      height: window.innerHeight,
      isMobile: width < 768,
      isTablet: width >= 768 && width < 992,
      isDesktop: width >= 992,
      isLargeDesktop: width >= 1200,
      isExtraLarge: width >= 1400,
      isUltraWide: width >= 1600,
    };
  });

  // ✅ ADD: Handle chat popup open/close
  const handleChatPopupOpen = useCallback(() => {
    setIsChatPopupOpen(true);
    document.body.classList.add("chat-popup-open");
  }, []);

  const handleChatPopupClose = useCallback(() => {
    setIsChatPopupOpen(false);
    document.body.classList.remove("chat-popup-open");
  }, []);

  // ✅ ADD: Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove("chat-popup-open");
    };
  }, []);

  // ✅ ADD: Handle escape key for chat popup
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isChatPopupOpen) {
        e.preventDefault();
        handleChatPopupClose();
      }
    };

    if (isChatPopupOpen) {
      document.addEventListener("keydown", handleKeyDown, {capture: true});
      return () =>
        document.removeEventListener("keydown", handleKeyDown, {capture: true});
    }
  }, [isChatPopupOpen, handleChatPopupClose]);

  // ✅ ADD: Prevent scrolling when popup is open
  useEffect(() => {
    if (isChatPopupOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isChatPopupOpen]);

  // Debounced resize handler for performance
  const handleResize = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    setScreenSize({
      width,
      height,
      isMobile: width < 768,
      isTablet: width >= 768 && width < 992,
      isDesktop: width >= 992,
      isLargeDesktop: width >= 1200,
      isExtraLarge: width >= 1400,
      isUltraWide: width >= 1600,
    });
  }, []);

  // Responsive screen size detection with debouncing
  useEffect(() => {
    let resizeTimer;
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 100); // Reduced debounce time
    };

    window.addEventListener("resize", debouncedResize);
    handleResize(); // Initial call

    return () => {
      window.removeEventListener("resize", debouncedResize);
      clearTimeout(resizeTimer);
    };
  }, [handleResize]);

  // Auto-optimize view for mobile
  useEffect(() => {
    if (screenSize.isMobile && activeView === "dashboard") {
      setActiveView("transactions");
    }
  }, [screenSize.isMobile, activeView]);

  // Memoized view tabs configuration
  const viewTabs = useMemo(
    () => [
      {
        key: "dashboard",
        label: screenSize.isMobile ? "Home" : "Dashboard",
        icon: faTachometerAlt,
        shortcut: "Ctrl+1",
        description: "Overview of all business activities",
        mobileLabel: "Home",
      },
      {
        key: "transactions",
        label: screenSize.isMobile ? "Transactions" : "Daily Transactions",
        icon: faExchangeAlt,
        shortcut: "Ctrl+2",
        description: "View and manage daily business transactions",
        mobileLabel: "Transactions",
      },
      {
        key: "chats",
        label: screenSize.isMobile ? "Chats" : "Team Chats",
        icon: faComments,
        shortcut: "Ctrl+3",
        description: "Communicate with your team members",
        mobileLabel: "Chats",
      },
    ],
    [screenSize.isMobile]
  );

  // Persist active view to localStorage
  useEffect(() => {
    localStorage.setItem("dashboard-active-view", activeView);
  }, [activeView]);

  // Enhanced browser history management
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.setItem("dashboard-active-view", activeView);
    };

    const handlePopState = (e) => {
      e.preventDefault();
      setActiveView(screenSize.isMobile ? "transactions" : "dashboard");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    // Set initial browser history state
    if (window.history.state !== "dashboard") {
      window.history.replaceState("dashboard", "Dashboard", "/dashboard");
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [activeView, screenSize.isMobile]);

  // Keyboard shortcuts (desktop only) - ✅ UPDATED: Skip if chat popup is open
  useEffect(() => {
    if (screenSize.isMobile || isChatPopupOpen) return;

    const handleKeyPress = (e) => {
      if (e.ctrlKey && !isChatPopupOpen) {
        switch (e.key) {
          case "1":
            e.preventDefault();
            handleViewChange("dashboard");
            break;
          case "2":
            e.preventDefault();
            handleViewChange("transactions");
            break;
          case "3":
            e.preventDefault();
            handleViewChange("chats");
            break;
          default:
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [screenSize.isMobile, isChatPopupOpen]);

  // Silent view change handler - no toast notifications
  const handleViewChange = useCallback(
    (viewKey) => {
      if (isChatPopupOpen) return; // ✅ ADD: Prevent view changes when popup is open

      setActiveView(viewKey);

      // Update browser history
      const tab = viewTabs.find((tab) => tab.key === viewKey);
      const title = tab?.label || "Dashboard";
      window.history.pushState(viewKey, title, `/dashboard/${viewKey}`);
    },
    [viewTabs, isChatPopupOpen]
  );

  // Enhanced navigation handler with comprehensive route mapping
  const handleNavigation = useCallback(
    (route) => {
      if (!route || isChatPopupOpen) return; // ✅ ADD: Prevent navigation when popup is open

      // Production route mappings
      const routeMap = {
        // Dashboard views
        dashboard: "dashboard",
        transactions: "transactions",
        chats: "chats",

        // Financial Management
        sales: "sales",
        purchases: "purchases",
        parties: "parties",
        "bank-accounts": "bank-accounts",
        "cash-accounts": "cash-accounts",
        payments: "payments",

        // Inventory Management
        items: "items",
        inventory: "inventory",
        products: "products",
        stock: "stock",

        // Business Operations
        invoices: "invoices",
        quotations: "quotations",
        "purchase-orders": "purchase-orders",
        "sales-orders": "sales-orders",

        // Reports & Analytics
        reports: "reports",
        insights: "insights",
        analytics: "analytics",

        // Settings & Management
        settings: "settings",
        profile: "profile",
        companies: "companies",
        staff: "staff",
        users: "users",

        // Quick Actions
        "sales/add": "sales/add",
        "purchases/add": "purchases/add",
        "sales-orders/add": "sales-orders/add",
        "parties/add": "parties/add",
        "items/add": "items/add",
        "bank-accounts/add": "bank-accounts/add",

        // Legacy support
        createInvoice: "sales/add",
        createPurchase: "purchases/add",
        createQuotation: "sales-orders/add",
        paymentIn: "parties",
        paymentOut: "parties",
        allProducts: "items",
        expenses: "expenses",
        dailySummary: "transactions",
        stockAnalysis: "inventory",
      };

      const mappedRoute = routeMap[route] || route;

      // Handle dashboard view changes silently
      const dashboardViews = ["dashboard", "transactions", "chats"];
      if (dashboardViews.includes(route)) {
        handleViewChange(route);
        return;
      }

      // External navigation
      if (onNavigate && typeof onNavigate === "function") {
        try {
          onNavigate(mappedRoute);
        } catch (error) {
          // Silent error handling in production
          if (process.env.NODE_ENV === "development") {
            console.error("Navigation error:", error);
          }
          if (addToast) {
            addToast("Navigation error occurred", "error");
          }
        }
      } else {
        if (process.env.NODE_ENV === "development") {
          console.warn("Navigation function not available");
        }
        if (addToast) {
          addToast("Navigation function not available", "warning");
        }
      }
    },
    [onNavigate, addToast, handleViewChange, isChatPopupOpen]
  );

  // Silent tab click handler - ✅ UPDATED: Prevent when popup is open
  const handleTabClick = useCallback(
    (tabKey) => {
      if (isChatPopupOpen) return; // ✅ ADD: Prevent tab clicks when popup is open

      if (["dashboard", "transactions", "chats"].includes(tabKey)) {
        if (screenSize.isMobile && tabKey === "dashboard") {
          handleViewChange("transactions");
        } else {
          handleViewChange(tabKey);
        }
      }
    },
    [screenSize.isMobile, handleViewChange, isChatPopupOpen]
  );

  // Enhanced company change handler
  const handleCompanyChange = useCallback(
    (company) => {
      if (isChatPopupOpen) return; // ✅ ADD: Prevent company changes when popup is open

      if (onCompanyChange && typeof onCompanyChange === "function") {
        try {
          onCompanyChange(company);
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error("Company change error:", error);
          }
          if (addToast) {
            addToast("Failed to change company", "error");
          }
        }
      }
    },
    [onCompanyChange, addToast, isChatPopupOpen]
  );

  // Company creation handler
  const handleCompanyCreated = useCallback(
    (newCompany) => {
      if (isChatPopupOpen) return; // ✅ ADD: Prevent company creation when popup is open

      if (onCompanyCreated && typeof onCompanyCreated === "function") {
        try {
          onCompanyCreated(newCompany);
          if (addToast) {
            const companyName =
              newCompany.name || newCompany.businessName || "New Company";
            addToast(
              `Company "${companyName}" created successfully`,
              "success"
            );
          }
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error("Company creation error:", error);
          }
          if (addToast) {
            addToast("Failed to process new company", "error");
          }
        }
      }
    },
    [onCompanyCreated, addToast, isChatPopupOpen]
  );

  // Validate required props
  useEffect(() => {
    if (!currentUser && addToast) {
      addToast("User authentication required", "warning");
    }
  }, [currentUser, addToast]);

  // Memoized responsive column configuration
  const responsiveColumns = useMemo(() => {
    if (screenSize.isUltraWide) {
      return {leftFlex: "0 0 320px", rightFlex: "1"};
    } else if (screenSize.isExtraLarge) {
      return {leftFlex: "0 0 300px", rightFlex: "1"};
    } else if (screenSize.isLargeDesktop) {
      return {leftFlex: "0 0 280px", rightFlex: "1"};
    } else if (screenSize.isDesktop) {
      return {leftFlex: "0 0 260px", rightFlex: "1"};
    } else {
      return {leftFlex: "0 0 240px", rightFlex: "1"};
    }
  }, [screenSize]);

  // Quick action handler for mobile FAB - ✅ UPDATED: Prevent when popup is open
  const handleQuickAction = useCallback(() => {
    if (isChatPopupOpen) return; // ✅ ADD: Prevent FAB actions when popup is open

    if (activeView === "transactions") {
      handleNavigation("sales/add");
    } else if (activeView === "chats") {
      handleNavigation("chats");
    } else {
      handleNavigation("sales/add");
    }
  }, [activeView, handleNavigation, isChatPopupOpen]);

  // ✅ UPDATE: Enhanced common props for child components
  const commonChildProps = useMemo(
    () => ({
      currentUser,
      currentCompany,
      addToast,
      isOnline,
      onNavigate: handleNavigation,
      isMobile: screenSize.isMobile,
      screenSize,
      // ✅ NEW: Chat popup handlers
      onChatPopupOpen: handleChatPopupOpen,
      onChatPopupClose: handleChatPopupClose,
      isChatPopupOpen,
    }),
    [
      currentUser,
      currentCompany,
      addToast,
      isOnline,
      handleNavigation,
      screenSize,
      handleChatPopupOpen,
      handleChatPopupClose,
      isChatPopupOpen,
    ]
  );

  return (
    <div
      ref={mainDashboardRef}
      className={`main-dashboard ${
        screenSize.isMobile ? "mobile-layout" : ""
      } ${screenSize.isTablet ? "tablet-layout" : ""} ${
        isChatPopupOpen ? "chat-popup-active" : ""
      }`}
      style={{
        // ✅ ADD: Prevent pointer events when popup is open
        pointerEvents: isChatPopupOpen ? "none" : "all",
      }}
    >
      {/* ✅ FIXED: Navigation Bar with proper z-index */}
      <MainNavbar
        {...commonChildProps}
        companies={companies}
        onLogout={onLogout}
        onCompanyChange={handleCompanyChange}
        onCompanyCreated={handleCompanyCreated}
        notificationCount={0}
        isLoadingCompanies={isLoadingCompanies}
        companyId={companyId}
        disabled={isChatPopupOpen}
      />

      {/* ✅ FIXED: View Tabs with proper z-index management */}
      <div
        className={`view-tabs-container ${
          screenSize.isMobile ? "mobile-tabs" : ""
        } ${isChatPopupOpen ? "popup-active" : ""}`}
        style={{
          pointerEvents: isChatPopupOpen ? "none" : "all",
          zIndex: isChatPopupOpen ? "1019" : "1020",
          opacity: isChatPopupOpen ? 0.5 : 1,
          transition: "opacity 0.3s ease",
        }}
      >
        <Container fluid className="px-0">
          <div
            className={`view-tabs ${
              screenSize.isMobile ? "mobile-view-tabs" : ""
            }`}
          >
            {viewTabs.map((tab) => (
              <button
                key={tab.key}
                className={`view-tab ${
                  activeView === tab.key ? "active" : ""
                } ${screenSize.isMobile ? "mobile-tab" : ""}`}
                onClick={() => handleTabClick(tab.key)}
                title={
                  screenSize.isMobile
                    ? tab.mobileLabel
                    : `${tab.label} - ${tab.shortcut}\n${tab.description}`
                }
                aria-label={`Switch to ${tab.label}`}
                aria-pressed={activeView === tab.key}
                type="button"
                disabled={isChatPopupOpen}
                style={{
                  cursor: isChatPopupOpen ? "not-allowed" : "pointer",
                }}
              >
                <FontAwesomeIcon
                  icon={tab.icon}
                  className={screenSize.isMobile ? "mb-1" : "me-2"}
                />
                <span
                  className={`tab-label ${
                    screenSize.isMobile ? "mobile-label" : ""
                  }`}
                >
                  {screenSize.isMobile ? tab.mobileLabel : tab.label}
                </span>
                {activeView === tab.key && <div className="active-indicator" />}
              </button>
            ))}
          </div>
        </Container>
      </div>

      {/* ✅ FIXED: Dashboard Content with proper overflow handling */}
      <div
        className={`dashboard-content ${
          screenSize.isMobile ? "mobile-content" : ""
        } ${isChatPopupOpen ? "popup-active" : ""}`}
        style={{
          pointerEvents: isChatPopupOpen ? "none" : "all",
          position: "relative",
          zIndex: 1,
          opacity: isChatPopupOpen ? 0.3 : 1,
          transition: "opacity 0.3s ease",
          overflow: isChatPopupOpen ? "hidden" : "visible",
        }}
      >
        {/* Desktop Dashboard View - Always 2 Column Layout */}
        {activeView === "dashboard" && !screenSize.isMobile && (
          <Container fluid className="px-0 h-100">
            <div className="dashboard-layout">
              {/* Team Chats Column - Fixed Width */}
              <div
                className="left-column"
                style={{
                  flex: responsiveColumns.leftFlex,
                  minWidth: responsiveColumns.leftFlex.split(" ")[2],
                  maxWidth: responsiveColumns.leftFlex.split(" ")[2],
                }}
              >
                <div className="section-wrapper">
                  <TeamChats {...commonChildProps} />
                </div>
              </div>

              {/* Daily Transactions Column - Flexible Width */}
              <div
                className="center-column-expanded"
                style={{flex: responsiveColumns.rightFlex}}
              >
                <div className="section-wrapper">
                  <DailyTransaction {...commonChildProps} />
                </div>
              </div>
            </div>
          </Container>
        )}

        {/* Mobile Dashboard View - Shows transactions with quick chat access */}
        {activeView === "dashboard" && screenSize.isMobile && (
          <div className="mobile-dashboard-view">
            <div className="section-wrapper mobile-section">
              <DailyTransaction {...commonChildProps} />
            </div>

            <div className="mobile-quick-chat">
              <button
                className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-2"
                onClick={() => handleViewChange("chats")}
                type="button"
                disabled={isChatPopupOpen}
                style={{
                  cursor: isChatPopupOpen ? "not-allowed" : "pointer",
                  opacity: isChatPopupOpen ? 0.5 : 1,
                }}
              >
                <FontAwesomeIcon icon={faComments} />
                Quick Access to Team Chats
              </button>
            </div>
          </div>
        )}

        {/* Single View Layouts */}
        {activeView === "transactions" && (
          <div
            className={`single-view ${
              screenSize.isMobile ? "mobile-single-view" : ""
            }`}
          >
            <div
              className={`section-wrapper ${
                screenSize.isMobile ? "mobile-section" : ""
              }`}
            >
              <DailyTransaction {...commonChildProps} />
            </div>
          </div>
        )}

        {activeView === "chats" && (
          <div
            className={`single-view ${
              screenSize.isMobile ? "mobile-single-view" : ""
            }`}
          >
            <div
              className={`section-wrapper ${
                screenSize.isMobile ? "mobile-section" : ""
              }`}
            >
              <TeamChats {...commonChildProps} />
            </div>
          </div>
        )}

        {/* Mobile Bottom Spacer */}
        {screenSize.isMobile && <div className="mobile-bottom-spacer" />}
      </div>

      {/* ✅ FIXED: Mobile FAB with proper z-index */}
      {screenSize.isMobile && (
        <div
          className="mobile-fab-container"
          style={{
            pointerEvents: isChatPopupOpen ? "none" : "all",
            zIndex: isChatPopupOpen ? "1039" : "1040",
            opacity: isChatPopupOpen ? 0.3 : 1,
            transition: "opacity 0.3s ease",
          }}
        >
          <button
            className="mobile-fab btn btn-primary rounded-circle"
            onClick={handleQuickAction}
            title="Quick Action"
            type="button"
            aria-label="Quick Action"
            disabled={isChatPopupOpen}
            style={{
              cursor: isChatPopupOpen ? "not-allowed" : "pointer",
            }}
          >
            <FontAwesomeIcon
              icon={activeView === "chats" ? faComments : faExchangeAlt}
              size="lg"
            />
          </button>
        </div>
      )}

      {/* ✅ NEW: Chat popup overlay indicator for debugging */}
      {isChatPopupOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.01)", // Nearly invisible overlay
            zIndex: 1999, // Just below chat popup
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// ✅ UPDATED: PropTypes for development assistance (keeping PropTypes for type checking)
MainDashboard.propTypes = {
  currentCompany: PropTypes.object,
  currentUser: PropTypes.object,
  onNavigate: PropTypes.func,
  addToast: PropTypes.func,
  isOnline: PropTypes.bool,
  onLogout: PropTypes.func,
  onCompanyChange: PropTypes.func,
  onCompanyCreated: PropTypes.func,
  companies: PropTypes.array,
  isLoadingCompanies: PropTypes.bool,
  companyId: PropTypes.string,
};

// ✅ REMOVED: defaultProps - replaced with JavaScript default parameters

export default MainDashboard;
