import React, {useState, useEffect} from "react";
import {Container, Row, Col} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faTachometerAlt,
  faExchangeAlt,
  faComments,
  faEye,
} from "@fortawesome/free-solid-svg-icons";

// Import components
import MainNavbar from "./MainNavbar";
import TeamChats from "./TeamChats";
import DailyTransaction from "./DailyTransaction";
import AdvertiseSection from "./AdvertiseSection";
import "./MainDashboard.css";

function MainDashboard({
  currentCompany,
  currentUser,
  onNavigate,
  addToast,
  isOnline,
  onLogout,
  onCompanyChange,
  onCompanyCreated,
  companies = [],
  isLoadingCompanies = false,
  companyId,
}) {
  // State management with localStorage persistence
  const [activeView, setActiveView] = useState(() => {
    // Get the saved view from localStorage, default to "dashboard"
    const savedView = localStorage.getItem("dashboard-active-view");
    return savedView &&
      ["dashboard", "transactions", "chats", "ads"].includes(savedView)
      ? savedView
      : "dashboard";
  });

  // View tabs configuration
  const viewTabs = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: faTachometerAlt,
      shortcut: "Ctrl+1",
      description: "Overview of all business activities",
    },
    {
      key: "transactions",
      label: "Daily Transactions",
      icon: faExchangeAlt,
      shortcut: "Ctrl+2",
      description: "View and manage daily business transactions",
    },
    {
      key: "chats",
      label: "Team Chats",
      icon: faComments,
      shortcut: "Ctrl+3",
      description: "Communicate with your team members",
    },
    {
      key: "ads",
      label: "Quick Actions",
      icon: faEye,
      shortcut: "Ctrl+4",
      description: "Access frequently used business functions",
    },
  ];

  // Save active view to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("dashboard-active-view", activeView);
  }, [activeView]);

  // Handle page refresh and navigation
  useEffect(() => {
    // Prevent navigation away from dashboard on page load
    const handleBeforeUnload = (e) => {
      // Save current state before page unload
      localStorage.setItem("dashboard-active-view", activeView);
    };

    // Handle browser back/forward navigation
    const handlePopState = (e) => {
      // Prevent going back to other pages when on dashboard
      e.preventDefault();
      setActiveView("dashboard");
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
  }, [activeView]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey) {
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
          case "4":
            e.preventDefault();
            handleViewChange("ads");
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, []);

  // Handle view changes
  const handleViewChange = (viewKey) => {
    setActiveView(viewKey);

    // Update browser history without causing navigation
    const tab = viewTabs.find((tab) => tab.key === viewKey);
    const title = tab?.label || "Dashboard";
    window.history.pushState(viewKey, title, `/dashboard/${viewKey}`);

    // Show toast notification
    addToast?.(`Switched to ${title}`, "info");
  };

  // Enhanced navigation handler with comprehensive route mapping
  const handleNavigation = (route) => {
    // Define route mappings for different types of navigation
    const routeMap = {
      // Dashboard views
      dashboard: "dashboard",
      transactions: "transactions",
      chats: "chats",
      ads: "ads",

      // Quick Actions from AdvertiseSection
      createInvoice: "create-invoice",
      paymentIn: "payment-in",
      paymentOut: "payment-out",
      dailySummary: "daily-summary",
      allProducts: "products",
      reports: "reports",
      expenses: "expenses",
      parties: "parties",
      createQuotation: "create-quotation",
      purchaseOrders: "purchase-orders",
      stockAnalysis: "stock-analysis",
      createPurchaseOrder: "create-purchase-order",
      salesOrders: "sales-orders",

      // Financial actions
      bankAccounts: "bank-accounts",
      cashAccounts: "cash-accounts",
      bankTransactions: "bank-transactions",
      bankReconciliation: "bank-reconciliation",
      cashFlow: "cash-flow",

      // Inventory actions
      inventory: "inventory",
      lowStock: "low-stock",
      stockMovement: "stock-movement",

      // Sales actions
      sales: "sales",
      invoices: "invoices",
      creditNotes: "credit-notes",

      // Purchase actions
      purchases: "purchases",
      purchaseBills: "purchase-bills",
      createPurchase: "create-purchase",

      // Management actions
      staff: "staff",
      insights: "insights",
      settings: "settings",

      // Company management
      companies: "companies",
      createCompany: "create-company",

      // Profile and user management
      profile: "profile",
    };

    // Get the mapped route
    const mappedRoute = routeMap[route] || route;

    // Dashboard view changes (don't trigger external navigation)
    const dashboardViews = ["dashboard", "transactions", "chats", "ads"];
    if (dashboardViews.includes(route)) {
      handleViewChange(route);
      return;
    }

    // External navigation for business functions
    if (onNavigate) {
      onNavigate(mappedRoute);
    } else {
      addToast?.("Navigation function not available", "warning");
    }
  };

  // Handle tab click with navigation prevention
  const handleTabClick = (tabKey) => {
    handleViewChange(tabKey);
  };

  // Silent company change handler - no messages or navigation
  const handleCompanyChange = (company) => {
    if (onCompanyChange) {
      onCompanyChange(company);
    }
  };

  // Silent company creation handler - no automatic navigation
  const handleCompanyCreated = (newCompany) => {
    if (onCompanyCreated) {
      onCompanyCreated(newCompany);
    }
  };

  return (
    <div className="main-dashboard">
      {/* Navigation Bar */}
      <MainNavbar
        currentUser={currentUser}
        currentCompany={currentCompany}
        companies={companies}
        onNavigate={handleNavigation}
        onLogout={onLogout}
        onCompanyChange={handleCompanyChange}
        onCompanyCreated={handleCompanyCreated}
        addToast={addToast}
        isOnline={isOnline}
        notificationCount={3}
        isLoadingCompanies={isLoadingCompanies}
        companyId={companyId}
      />

      {/* View Tabs */}
      <div className="view-tabs-container">
        <Container fluid>
          <div className="view-tabs">
            {viewTabs.map((tab) => (
              <button
                key={tab.key}
                className={`view-tab ${activeView === tab.key ? "active" : ""}`}
                onClick={() => handleTabClick(tab.key)}
                title={`${tab.label} - ${tab.shortcut}\n${tab.description}`}
              >
                <FontAwesomeIcon icon={tab.icon} className="me-2" />
                <span className="tab-label">{tab.label}</span>
                {activeView === tab.key && <div className="active-indicator" />}
              </button>
            ))}
          </div>
        </Container>
      </div>

      {/* Main Content */}
      <Container fluid className="dashboard-content">
        {activeView === "dashboard" && (
          <Row className="dashboard-layout g-3">
            {/* Left Column - Team Chats */}
            <Col xl={3} lg={4} md={12} className="left-column">
              <div className="section-wrapper">
                <TeamChats
                  currentUser={currentUser}
                  currentCompany={currentCompany}
                  addToast={addToast}
                  isOnline={isOnline}
                  onNavigate={handleNavigation}
                />
              </div>
            </Col>

            {/* Center Column - Daily Transactions */}
            <Col xl={6} lg={8} md={12} className="center-column">
              <div className="section-wrapper">
                <DailyTransaction
                  currentUser={currentUser}
                  currentCompany={currentCompany}
                  onNavigate={handleNavigation}
                  addToast={addToast}
                  isOnline={isOnline}
                />
              </div>
            </Col>

            {/* Right Column - Quick Actions & Ads */}
            <Col xl={3} lg={12} md={12} className="right-column">
              <div className="section-wrapper">
                <AdvertiseSection
                  currentUser={currentUser}
                  currentCompany={currentCompany}
                  addToast={addToast}
                  isOnline={isOnline}
                  onNavigate={handleNavigation}
                />
              </div>
            </Col>
          </Row>
        )}

        {/* Individual Component Views */}
        {activeView === "transactions" && (
          <div className="single-view">
            <DailyTransaction
              currentUser={currentUser}
              currentCompany={currentCompany}
              onNavigate={handleNavigation}
              addToast={addToast}
              isOnline={isOnline}
            />
          </div>
        )}

        {activeView === "chats" && (
          <div className="single-view">
            <TeamChats
              currentUser={currentUser}
              currentCompany={currentCompany}
              addToast={addToast}
              isOnline={isOnline}
              onNavigate={handleNavigation}
            />
          </div>
        )}

        {activeView === "ads" && (
          <div className="single-view">
            <AdvertiseSection
              currentUser={currentUser}
              currentCompany={currentCompany}
              addToast={addToast}
              isOnline={isOnline}
              onNavigate={handleNavigation}
            />
          </div>
        )}
      </Container>
    </div>
  );
}

export default MainDashboard;
