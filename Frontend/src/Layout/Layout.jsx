import React, {useState, useEffect} from "react";
import {Alert, Container} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faExclamationTriangle,
  faWifi,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import {useParams, useLocation, useNavigate} from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import "../App.css";

function Layout({
  children,
  onLogout,
  currentCompany,
  companies,
  onCompanyChange,
  onCompanyCreated,
  onCompanyUpdated,
  currentUser,
  isLoadingCompanies,
}) {
  const {companyId} = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [companyError, setCompanyError] = useState(null);

  // ✅ SIMPLIFIED: Path to view mapping
  const pathViewMap = {
    dashboard: "dailySummary",
    daybook: "dailySummary",
    transactions: "transactions",
    "cash-bank": "cashAndBank",
    parties: "parties",
    sales: "invoices",
    quotations: "quotations",
    invoices: "invoices",
    "credit-notes": "creditNotes",
    "sales-orders": "salesOrders",
    purchases: "allPurchases",
    "purchase-bills": "purchaseBills",
    "purchase-orders": "purchaseOrder",
    inventory: "inventory",
    products: "allProducts",
    "low-stock": "lowStock",
    "stock-movement": "stockMovement",
    "bank-accounts": "bankAccounts",
    "cash-accounts": "cashAccounts",
    "bank-transactions": "bankTransactions",
    "bank-reconciliation": "bankReconciliation",
    "cash-flow": "cashFlow",
    staff: "staff",
    insights: "insights",
    reports: "reports",
    settings: "settings",
  };

  // ✅ SIMPLIFIED: View to path mapping
  const viewPathMap = {
    dailySummary: "dashboard",
    transactions: "transactions",
    cashAndBank: "cash-bank",
    parties: "parties",
    invoices: "sales",
    allSales: "sales",
    createInvoice: "sales/add",
    salesInvoices: "sales",
    quotations: "quotations",
    createQuotation: "quotations/add",
    addQuotation: "quotations/add",
    creditNotes: "credit-notes",
    salesOrders: "sales-orders",
    createSalesOrder: "sales-orders/add",
    allPurchases: "purchases",
    purchaseBills: "purchase-bills",
    createPurchase: "purchases/add",
    purchaseOrder: "purchase-orders",
    purchaseOrders: "purchase-orders",
    createPurchaseOrder: "purchase-orders/add",
    inventory: "inventory",
    allProducts: "products",
    lowStock: "low-stock",
    stockMovement: "stock-movement",
    bankAccounts: "bank-accounts",
    cashAccounts: "cash-accounts",
    bankTransactions: "bank-transactions",
    bankReconciliation: "bank-reconciliation",
    cashFlow: "cash-flow",
    staff: "staff",
    insights: "insights",
    reports: "reports",
    settings: "settings",
  };

  // ✅ SIMPLIFIED: Get current view from path
  const getCurrentViewFromPath = () => {
    const pathParts = location.pathname.split("/").filter((part) => part);

    // Handle edit routes
    if (pathParts.includes("edit")) {
      const editIndex = pathParts.indexOf("edit");
      if (editIndex > 0) {
        const baseSection = pathParts[editIndex - 1];
        const editRouteMap = {
          sales: "invoices",
          quotations: "quotations",
          purchases: "purchaseBills",
          "purchase-bills": "purchaseBills",
          "sales-orders": "salesOrders",
          "purchase-orders": "purchaseOrder",
        };
        return editRouteMap[baseSection] || baseSection;
      }
    }

    // Handle add routes
    if (pathParts.includes("add")) {
      const addIndex = pathParts.indexOf("add");
      if (addIndex > 0) {
        const baseSection = pathParts[addIndex - 1];
        const addRouteMap = {
          sales: "createInvoice",
          quotations: "createQuotation",
          purchases: "createPurchase",
          "purchase-bills": "createPurchase",
          "sales-orders": "createSalesOrder",
          "purchase-orders": "createPurchaseOrder",
        };
        return addRouteMap[baseSection] || baseSection;
      }
    }

    const lastPart = pathParts[pathParts.length - 1];
    return pathViewMap[lastPart] || "dailySummary";
  };

  const currentPage = getCurrentViewFromPath();
  const isEditMode = location.pathname.includes("/edit/");
  const isAddMode = location.pathname.includes("/add");

  // ✅ SIMPLIFIED: Screen size management
  useEffect(() => {
    const checkScreenSize = () => {
      setSidebarOpen(window.innerWidth >= 992);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // ✅ SIMPLIFIED: Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
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

  // ✅ SIMPLIFIED: Navigation handler
  const handleNavigation = (page) => {
    setCompanyError(null);

    const effectiveCompanyId =
      companyId || currentCompany?.id || currentCompany?._id;

    if (!effectiveCompanyId) {
      setCompanyError("Please select a company to access this feature");
      return;
    }

    const urlPath = viewPathMap[page] || "dashboard";
    const newPath = `/companies/${effectiveCompanyId}/${urlPath}`;
    navigate(newPath);
  };

  // ✅ SIMPLIFIED: Company change handler
  const handleCompanyChange = (company) => {
    setCompanyError(null);

    try {
      if (company) {
        const newCompanyId = company.id || company._id;
        const currentView = getCurrentViewFromPath();

        // If in edit/add mode, navigate to the list view instead
        let targetView = currentView;
        if (isEditMode || isAddMode) {
          const editToListMap = {
            invoices: "invoices",
            quotations: "quotations",
            purchaseBills: "purchaseBills",
            salesOrders: "salesOrders",
            purchaseOrder: "purchaseOrder",
          };
          targetView = editToListMap[currentView] || "dailySummary";
        }

        const urlPath = viewPathMap[targetView] || "dashboard";
        const newPath = `/companies/${newCompanyId}/${urlPath}`;
        navigate(newPath);
      }

      if (onCompanyChange) {
        onCompanyChange(company);
      }
    } catch (error) {
      setCompanyError(`Failed to switch company: ${error.message}`);
    }
  };

  // ✅ SIMPLIFIED: Company creation handler
  const handleCompanyCreated = (newCompany) => {
    setCompanyError(null);

    try {
      if (onCompanyCreated) {
        onCompanyCreated(newCompany);
      }

      if (newCompany) {
        const newCompanyId = newCompany.id || newCompany._id;
        const newPath = `/companies/${newCompanyId}/dashboard`;
        setTimeout(() => navigate(newPath), 100);
      }
    } catch (error) {
      setCompanyError(`Failed to create company: ${error.message}`);
    }
  };

  // ✅ SIMPLIFIED: Company update handler
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

  // ✅ SIMPLIFIED: Enhanced children props
  const childrenWithProps = React.Children.map(children, (child) => {
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
        isEditMode,
        isAddMode,
        currentLocation: location,
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
          <strong>No Internet Connection</strong> - Some features may not work
          properly
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

      {/* Navbar */}
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
        isEditMode={isEditMode}
        isAddMode={isAddMode}
      />

      {/* Main content section */}
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
          isEditMode={isEditMode}
          isAddMode={isAddMode}
        />

        <div className={`content-wrapper ${sidebarOpen ? "" : "expanded"}`}>
          <main className="main-content">
            {/* Loading Companies State */}
            {isLoadingCompanies && (
              <div
                className="position-fixed top-50 start-50 translate-middle"
                style={{zIndex: 1050}}
              >
                <div className="bg-white p-3 rounded shadow text-center">
                  <div
                    className="spinner-border text-primary mb-2"
                    role="status"
                  >
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <div className="small text-muted">Loading companies...</div>
                </div>
              </div>
            )}

            {/* No Companies State */}
            {!isLoadingCompanies && companies.length === 0 && currentUser && (
              <Container className="py-4">
                <Alert variant="info" className="text-center">
                  <h5>No Companies Found</h5>
                  <p className="mb-0">
                    It looks like you don't have any companies set up yet. You
                    can create your first company using the "+" button in the
                    header.
                  </p>
                </Alert>
              </Container>
            )}

            {/* Company ID Mismatch Warning */}
            {companyId &&
              currentCompany &&
              currentCompany.id !== companyId &&
              currentCompany._id !== companyId &&
              !isEditMode && (
                <Container className="py-2">
                  <Alert variant="warning" className="mb-3">
                    <FontAwesomeIcon
                      icon={faExclamationTriangle}
                      className="me-2"
                    />
                    <strong>Company Mismatch:</strong> URL company ID doesn't
                    match selected company.
                    <button
                      className="btn btn-sm btn-outline-warning ms-2"
                      onClick={() => {
                        const correctId =
                          currentCompany.id || currentCompany._id;
                        const currentView = getCurrentViewFromPath();
                        const urlPath = viewPathMap[currentView] || "dashboard";
                        navigate(`/companies/${correctId}/${urlPath}`);
                      }}
                    >
                      Fix URL
                    </button>
                  </Alert>
                </Container>
              )}

            {/* Edit Mode Indicator */}
            {isEditMode && (
              <Container className="py-2">
                <Alert
                  variant="info"
                  className="mb-3 d-flex align-items-center"
                >
                  <div className="me-auto">
                    <FontAwesomeIcon
                      icon={faExclamationTriangle}
                      className="me-2"
                    />
                    <strong>Edit Mode:</strong> You are currently editing a
                    document.
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
