import React, {useState, useEffect, useCallback} from "react";
import {useParams, useNavigate, useLocation} from "react-router-dom";
import {
  Alert,
  Spinner,
  Container,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faExclamationTriangle,
  faBuilding,
  faCheckCircle,
  faInfoCircle,
  faWifi,
  faTimesCircle,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";

// Import components - UPDATED IMPORTS
import DayBook from "../components/Home/DayBook";
import Parties from "../components/Home/Parties";
import Sales from "../components/Home/Sales";
import Quotations from "../components/Home/Quotations";
import Inventory from "../components/Home/Inventory";
import StaffManagement from "../components/Home/StaffManagement";
import PurchaseOrder from "../components/Home/Purchases/PurchaseOrder";
import Bank from "../components/Home/Bank";
import PurchaseBills from "../components/Home/Purchases/PurchaseBills";

// Import utility components
import ErrorBoundary from "../components/ErrorBoundary";
import Loading from "../components/Loading";
import {useOnlineStatus} from "../hooks/useOnlineStatus";

// ✅ UPDATED: Import proper services
import authService from "../services/authService";
import bankAccountService from "../services/bankAccountService";
import companyService from "../services/companyService";
import itemService from "../services/itemService";
import partyService from "../services/partyService";
import paymentService from "../services/paymentService";
import purchaseOrderService from "../services/purchaseOrderService";
import purchaseService from "../services/purchaseService";
import saleOrderService from "../services/saleOrderService";
import salesService from "../services/salesService";
import transactionService from "../services/transactionService";

import "./HomePage.css";

function HomePage({
  currentCompany: propCurrentCompany,
  onCompanyChange,
  companies,
  currentUser,
}) {
  const {companyId} = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {isOnline, lastChecked} = useOnlineStatus();

  // State management
  const [currentView, setCurrentView] = useState("dailySummary");
  const [currentCompany, setCurrentCompany] = useState(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  const [companyError, setCompanyError] = useState(null);
  const [toasts, setToasts] = useState([]);

  // ✅ FIXED: Enhanced path to view mapping with /add and /edit support
  const getViewFromPath = () => {
    const pathParts = location.pathname.split("/").filter((part) => part);
    const lastPart = pathParts[pathParts.length - 1];
    const secondLastPart = pathParts[pathParts.length - 2];

    // ✅ Handle /add routes specifically
    if (lastPart === "add" && secondLastPart) {
      const addRouteMap = {
        "purchase-orders": "createPurchaseOrder",
        purchases: "createPurchaseBill",
        quotations: "createQuotation",
        "sales-orders": "createSalesOrder",
        products: "createProduct",
        parties: "createParty",
        items: "createItem",
      };

      if (addRouteMap[secondLastPart]) {
        return addRouteMap[secondLastPart];
      }
    }

    // ✅ Handle /edit routes
    if (lastPart === "edit" && pathParts.length >= 4) {
      const editType = pathParts[pathParts.length - 3];
      const editId = pathParts[pathParts.length - 2];

      const editRouteMap = {
        "purchase-orders": "editPurchaseOrder",
        purchases: "editPurchaseBill",
        quotations: "editQuotation",
        "sales-orders": "editSalesOrder",
        products: "editProduct",
        parties: "editParty",
        items: "editItem",
      };

      if (editRouteMap[editType]) {
        return editRouteMap[editType];
      }
    }

    // ✅ Handle /new routes (legacy support)
    if (lastPart === "new" && secondLastPart) {
      const newRouteMap = {
        purchases: "createPurchaseBill",
        products: "createProduct",
        parties: "createParty",
        items: "createItem",
      };

      if (newRouteMap[secondLastPart]) {
        return newRouteMap[secondLastPart];
      }
    }

    // URL path to view mapping (list views)
    const pathViewMap = {
      dashboard: "dailySummary",
      daybook: "dailySummary",
      transactions: "transactions",
      "cash-bank": "cashAndBank",
      parties: "parties",
      sales: "invoices",
      quotations: "quotations",
      "sales-orders": "salesOrders",
      invoices: "invoices",
      purchases: "purchaseBills",
      "purchase-bills": "purchaseBills",
      "purchase-orders": "purchaseOrders",
      inventory: "inventory",
      products: "allProducts",
      items: "allProducts",
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

    return pathViewMap[lastPart] || "dailySummary";
  };

  // Update view when URL changes
  useEffect(() => {
    const newView = getViewFromPath();
    console.log(
      "🔄 URL changed, new view:",
      newView,
      "from path:",
      location.pathname
    );
    setCurrentView(newView);
  }, [location.pathname]);

  // Update company state
  useEffect(() => {
    if (companyId && companies.length > 0) {
      const foundCompany = companies.find((c) => (c.id || c._id) === companyId);
      if (foundCompany) {
        setCurrentCompany(foundCompany);
        setCompanyError(null);
      } else if (
        propCurrentCompany &&
        (propCurrentCompany.id || propCurrentCompany._id) === companyId
      ) {
        setCurrentCompany(propCurrentCompany);
        setCompanyError(null);
      } else {
        setCompanyError(`Company with ID ${companyId} not found`);
      }
    } else if (propCurrentCompany) {
      setCurrentCompany(propCurrentCompany);
      setCompanyError(null);
    }
  }, [companyId, companies, propCurrentCompany]);

  // ✅ Toast management
  const addToast = useCallback((message, type = "info", duration = 5000) => {
    const id = Date.now() + Math.random();
    const toast = {id, message, type, duration};
    setToasts((prev) => [...prev.slice(-4), toast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ✅ FIXED: Enhanced navigation handler with proper routing
  const handleNavigation = useCallback(
    (page, params = {}) => {
      if (!currentCompany?.id && !currentCompany?._id) {
        addToast(
          "Please select a company first to access this feature",
          "warning"
        );
        return;
      }

      const companyId = currentCompany.id || currentCompany._id;

      // ✅ FIXED: Updated view path map with consistent /add routes
      const viewPathMap = {
        dailySummary: "dashboard",
        transactions: "transactions",
        cashAndBank: "cash-bank",
        parties: "parties",
        invoices: "sales",
        quotations: "quotations",
        salesOrders: "sales-orders",
        purchaseBills: "purchases",
        purchaseOrders: "purchase-orders",
        inventory: "inventory",
        allProducts: "products",
        items: "items",
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

        // ✅ FIXED: Create actions with /add routes
        createQuotation: "quotations/add",
        editQuotation: `quotations/${params.quotationId}/edit`,
        createSalesOrder: "sales-orders/add",
        editSalesOrder: `sales-orders/${params.salesOrderId}/edit`,
        createPurchaseOrder: "purchase-orders/add",
        editPurchaseOrder: `purchase-orders/${params.purchaseOrderId}/edit`,
        createPurchaseBill: "purchases/add", // ✅ Changed from /new to /add
        editPurchaseBill: `purchases/${params.purchaseBillId}/edit`,
        createItem: "products/add", // ✅ Changed from /new to /add
        editItem: `products/${params.itemId}/edit`,
        createProduct: "products/add", // ✅ Changed from /new to /add
        editProduct: `products/${params.productId}/edit`,
        createParty: "parties/add", // ✅ Changed from /new to /add
        editParty: `parties/${params.partyId}/edit`,
      };

      const urlPath = viewPathMap[page] || "dashboard";

      console.log(
        `🔄 Navigation: ${page} -> /companies/${companyId}/${urlPath}`
      );

      // Handle navigation with state for duplication
      if (params.duplicateData) {
        navigate(`/companies/${companyId}/${urlPath}`, {
          state: {duplicateData: params.duplicateData},
        });
      } else {
        navigate(`/companies/${companyId}/${urlPath}`);
      }

      // ✅ Add navigation toast
      const pageDisplayNames = {
        createPurchaseOrder: "Create Purchase Order",
        createPurchaseBill: "Create Purchase Bill",
        createQuotation: "Create Quotation",
        createSalesOrder: "Create Sales Order",
        createProduct: "Create Product",
        createParty: "Create Party",
        createItem: "Create Item",
      };

      if (pageDisplayNames[page]) {
        addToast(`Opening ${pageDisplayNames[page]}...`, "info", 2000);
      }
    },
    [currentCompany, navigate, addToast]
  );

  // ✅ Company change handler
  const handleCompanyChange = useCallback(
    async (company) => {
      setIsLoadingCompany(true);
      setCompanyError(null);

      try {
        if (company && !company.id && !company._id) {
          throw new Error("Invalid company data: missing ID");
        }

        setCurrentCompany(company);

        if (company) {
          const companyName = company.businessName || company.name;
          addToast(`Company changed to ${companyName}`, "success", 3000);
          const companyId = company.id || company._id;
          navigate(`/companies/${companyId}/dashboard`);
        }

        if (onCompanyChange) {
          onCompanyChange(company);
        }
      } catch (error) {
        setCompanyError(error.message);
        addToast("Failed to change company: " + error.message, "error");
      } finally {
        setIsLoadingCompany(false);
      }
    },
    [onCompanyChange, addToast, navigate]
  );

  // ✅ Common props with services
  const commonProps = {
    currentCompany,
    currentUser,
    onNavigate: handleNavigation,
    onCompanyChange: handleCompanyChange,
    isOnline,
    lastChecked,
    addToast,
    companyId: currentCompany?.id || currentCompany?._id,
  };

  // ✅ Service props using actual service files
  const serviceProps = {
    authService: authService,
    companyService: companyService,
    saleOrderService: saleOrderService,
    salesService: salesService,
    purchaseOrderService: purchaseOrderService,
    purchaseService: purchaseService,
    itemService: itemService,
    inventoryService: itemService,
    partyService: partyService,
    partiesService: partyService,
    bankAccountService: bankAccountService,
    bankService: bankAccountService,
    paymentService: paymentService,
    transactionService: transactionService,
  };

  // ✅ Render states
  const renderLoadingState = (message = "Loading...") => (
    <div className="homepage-container">
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <Loading message={message} size="lg" />
      </Container>
    </div>
  );

  const renderErrorState = (error, onRetry = null) => (
    <div className="homepage-container">
      <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100">
        <FontAwesomeIcon
          icon={faExclamationTriangle}
          size="3x"
          className="text-danger mb-3"
        />
        <h4 className="text-danger">Something went wrong</h4>
        <p className="text-muted text-center mb-3">{error}</p>
        {onRetry && (
          <button className="btn btn-outline-primary" onClick={onRetry}>
            Try Again
          </button>
        )}
      </Container>
    </div>
  );

  const renderNoCompanyState = (componentName) => (
    <div className="homepage-container">
      <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100">
        <FontAwesomeIcon
          icon={faBuilding}
          size="3x"
          className="text-muted mb-3"
        />
        <h4 className="text-muted">No Company Selected</h4>
        <p className="text-muted text-center">
          Please select a company from the header to access {componentName}.
        </p>
      </Container>
    </div>
  );

  // ✅ Check if component requires company
  const requiresCompany = (viewName) => {
    const companyRequiredViews = [
      "inventory",
      "allProducts",
      "lowStock",
      "stockMovement",
      "quotations",
      "invoices",
      "salesOrders",
      "purchaseBills",
      "purchaseOrders",
      "bankAccounts",
      "cashAccounts",
      "bankTransactions",
      "bankReconciliation",
      "cashFlow",
      "parties",
      // Form views also require company
      "createPurchaseOrder",
      "createPurchaseBill",
      "createQuotation",
      "createSalesOrder",
      "createProduct",
      "createParty",
      "createItem",
      "editPurchaseOrder",
      "editPurchaseBill",
      "editQuotation",
      "editSalesOrder",
      "editProduct",
      "editParty",
      "editItem",
    ];
    return companyRequiredViews.includes(viewName);
  };

  // ✅ FIXED: Enhanced content rendering with form views
  const renderContent = () => {
    if (isLoadingCompany) {
      return renderLoadingState("Loading company data...");
    }

    if (companyError) {
      return renderErrorState(companyError, () => {
        setCompanyError(null);
        if (currentCompany) {
          handleCompanyChange(currentCompany);
        }
      });
    }

    if (
      requiresCompany(currentView) &&
      !currentCompany?.id &&
      !currentCompany?._id
    ) {
      const componentNameMap = {
        inventory: "Inventory Management",
        allProducts: "Products & Services",
        lowStock: "Low Stock Items",
        stockMovement: "Stock Movement",
        quotations: "Quotations",
        salesOrders: "Sales Orders",
        invoices: "Sales Invoices",
        purchaseBills: "Purchase Bills",
        purchaseOrders: "Purchase Orders",
        createPurchaseOrder: "Create Purchase Order",
        createPurchaseBill: "Create Purchase Bill",
        createQuotation: "Create Quotation",
        createSalesOrder: "Create Sales Order",
        createProduct: "Create Product",
        createParty: "Create Party",
        createItem: "Create Item",
        bankAccounts: "Bank Accounts",
        cashAccounts: "Cash Accounts",
        bankTransactions: "Bank Transactions",
        bankReconciliation: "Bank Reconciliation",
        cashFlow: "Cash Flow",
        parties: "Parties Management",
      };
      return renderNoCompanyState(
        componentNameMap[currentView] || "this feature"
      );
    }

    const wrapWithErrorBoundary = (component) => (
      <ErrorBoundary>{component}</ErrorBoundary>
    );

    switch (currentView) {
      // Day Book and transaction views
      case "dailySummary":
      case "transactions":
      case "cashAndBank":
        return wrapWithErrorBoundary(
          <DayBook
            view={currentView}
            {...commonProps}
            transactionService={serviceProps.transactionService}
            bankAccountService={serviceProps.bankAccountService}
            paymentService={serviceProps.paymentService}
          />
        );

      // Parties management
      case "parties":
        return wrapWithErrorBoundary(
          <Parties
            {...commonProps}
            partyService={serviceProps.partyService}
            partiesService={serviceProps.partiesService}
          />
        );

      // Quotations
      case "quotations":
        return wrapWithErrorBoundary(
          <Quotations
            view="quotations"
            {...commonProps}
            saleOrderService={serviceProps.saleOrderService}
          />
        );

      // Sales views
      case "invoices":
        return wrapWithErrorBoundary(
          <Sales
            view="invoices"
            {...commonProps}
            salesService={serviceProps.salesService}
            saleOrderService={serviceProps.saleOrderService}
          />
        );

      case "salesOrders":
        return wrapWithErrorBoundary(
          <Sales
            view="salesOrders"
            {...commonProps}
            saleOrderService={serviceProps.saleOrderService}
            salesService={serviceProps.salesService}
          />
        );

      // Purchase management
      case "purchaseBills":
        return wrapWithErrorBoundary(
          <PurchaseBills
            {...commonProps}
            purchaseService={serviceProps.purchaseService}
            purchaseOrderService={serviceProps.purchaseOrderService}
          />
        );

      case "purchaseOrders":
        return wrapWithErrorBoundary(
          <PurchaseOrder
            {...commonProps}
            purchaseOrderService={serviceProps.purchaseOrderService}
            purchaseService={serviceProps.purchaseService}
          />
        );

      // ✅ NEW: Form views for creating items
      case "createPurchaseOrder":
        return wrapWithErrorBoundary(
          <div className="form-container">
            <Container className="py-4">
              <div className="d-flex align-items-center mb-4">
                <button
                  className="btn btn-outline-secondary me-3"
                  onClick={() => handleNavigation("purchaseOrders")}
                >
                  ← Back to Purchase Orders
                </button>
                <h2 className="mb-0">Create Purchase Order</h2>
              </div>
              <div className="alert alert-info">
                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                Purchase Order form component will be implemented here.
                <div className="mt-2">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() =>
                      addToast("Form integration coming soon!", "info")
                    }
                  >
                    Continue Setup
                  </button>
                </div>
              </div>
            </Container>
          </div>
        );

      case "createPurchaseBill":
        return wrapWithErrorBoundary(
          <div className="form-container">
            <Container className="py-4">
              <div className="d-flex align-items-center mb-4">
                <button
                  className="btn btn-outline-secondary me-3"
                  onClick={() => handleNavigation("purchaseBills")}
                >
                  ← Back to Purchase Bills
                </button>
                <h2 className="mb-0">Create Purchase Bill</h2>
              </div>
              <div className="alert alert-info">
                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                Purchase Bill form component will be implemented here.
                <div className="mt-2">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() =>
                      addToast("Form integration coming soon!", "info")
                    }
                  >
                    Continue Setup
                  </button>
                </div>
              </div>
            </Container>
          </div>
        );

      case "createQuotation":
        return wrapWithErrorBoundary(
          <div className="form-container">
            <Container className="py-4">
              <div className="d-flex align-items-center mb-4">
                <button
                  className="btn btn-outline-secondary me-3"
                  onClick={() => handleNavigation("quotations")}
                >
                  ← Back to Quotations
                </button>
                <h2 className="mb-0">Create Quotation</h2>
              </div>
              <div className="alert alert-info">
                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                Quotation form component will be implemented here.
                <div className="mt-2">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() =>
                      addToast("Form integration coming soon!", "info")
                    }
                  >
                    Continue Setup
                  </button>
                </div>
              </div>
            </Container>
          </div>
        );

      case "createSalesOrder":
        return wrapWithErrorBoundary(
          <div className="form-container">
            <Container className="py-4">
              <div className="d-flex align-items-center mb-4">
                <button
                  className="btn btn-outline-secondary me-3"
                  onClick={() => handleNavigation("salesOrders")}
                >
                  ← Back to Sales Orders
                </button>
                <h2 className="mb-0">Create Sales Order</h2>
              </div>
              <div className="alert alert-info">
                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                Sales Order form component will be implemented here.
                <div className="mt-2">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() =>
                      addToast("Form integration coming soon!", "info")
                    }
                  >
                    Continue Setup
                  </button>
                </div>
              </div>
            </Container>
          </div>
        );

      case "createProduct":
      case "createItem":
        return wrapWithErrorBoundary(
          <div className="form-container">
            <Container className="py-4">
              <div className="d-flex align-items-center mb-4">
                <button
                  className="btn btn-outline-secondary me-3"
                  onClick={() => handleNavigation("allProducts")}
                >
                  ← Back to Products
                </button>
                <h2 className="mb-0">Create Product</h2>
              </div>
              <div className="alert alert-info">
                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                Product form component will be implemented here.
                <div className="mt-2">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() =>
                      addToast("Form integration coming soon!", "info")
                    }
                  >
                    Continue Setup
                  </button>
                </div>
              </div>
            </Container>
          </div>
        );

      case "createParty":
        return wrapWithErrorBoundary(
          <div className="form-container">
            <Container className="py-4">
              <div className="d-flex align-items-center mb-4">
                <button
                  className="btn btn-outline-secondary me-3"
                  onClick={() => handleNavigation("parties")}
                >
                  ← Back to Parties
                </button>
                <h2 className="mb-0">Create Party</h2>
              </div>
              <div className="alert alert-info">
                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                Party form component will be implemented here.
                <div className="mt-2">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() =>
                      addToast("Form integration coming soon!", "info")
                    }
                  >
                    Continue Setup
                  </button>
                </div>
              </div>
            </Container>
          </div>
        );

      // Bank & Cash management
      case "bankAccounts":
        return wrapWithErrorBoundary(
          <Bank
            view="bankAccounts"
            activeType="bank"
            {...commonProps}
            bankAccountService={serviceProps.bankAccountService}
            bankService={serviceProps.bankService}
            paymentService={serviceProps.paymentService}
          />
        );

      case "cashAccounts":
        return wrapWithErrorBoundary(
          <Bank
            view="cashAccounts"
            activeType="cash"
            {...commonProps}
            bankAccountService={serviceProps.bankAccountService}
            bankService={serviceProps.bankService}
            paymentService={serviceProps.paymentService}
          />
        );

      case "bankTransactions":
        return wrapWithErrorBoundary(
          <Bank
            view="bankTransactions"
            {...commonProps}
            bankAccountService={serviceProps.bankAccountService}
            bankService={serviceProps.bankService}
            transactionService={serviceProps.transactionService}
            paymentService={serviceProps.paymentService}
          />
        );

      case "bankReconciliation":
        return wrapWithErrorBoundary(
          <Bank
            view="bankReconciliation"
            {...commonProps}
            bankAccountService={serviceProps.bankAccountService}
            bankService={serviceProps.bankService}
            transactionService={serviceProps.transactionService}
          />
        );

      case "cashFlow":
        return wrapWithErrorBoundary(
          <Bank
            view="cashFlow"
            {...commonProps}
            bankAccountService={serviceProps.bankAccountService}
            bankService={serviceProps.bankService}
            transactionService={serviceProps.transactionService}
            paymentService={serviceProps.paymentService}
          />
        );

      // Inventory management
      case "inventory":
      case "allProducts":
      case "lowStock":
      case "stockMovement":
        return wrapWithErrorBoundary(
          <Inventory
            view={currentView}
            {...commonProps}
            itemService={serviceProps.itemService}
            inventoryService={serviceProps.inventoryService}
          />
        );

      // Staff management
      case "staff":
        return wrapWithErrorBoundary(
          <StaffManagement
            view={currentView}
            {...commonProps}
            authService={serviceProps.authService}
            companyService={serviceProps.companyService}
          />
        );

      // Placeholder pages
      case "insights":
        return wrapWithErrorBoundary(
          <div className="placeholder-content">
            <Container className="py-5 text-center">
              <h3>Insights Dashboard</h3>
              <p className="text-muted">
                Business insights and analytics coming soon...
              </p>
            </Container>
          </div>
        );

      case "reports":
        return wrapWithErrorBoundary(
          <div className="placeholder-content">
            <Container className="py-5 text-center">
              <h3>Reports & Analytics</h3>
              <p className="text-muted">
                Comprehensive reporting tools coming soon...
              </p>
            </Container>
          </div>
        );

      case "settings":
        return wrapWithErrorBoundary(
          <div className="placeholder-content">
            <Container className="py-5 text-center">
              <h3>Settings</h3>
              <p className="text-muted">
                Application settings and configuration...
              </p>
            </Container>
          </div>
        );

      // Default case
      default:
        return wrapWithErrorBoundary(
          <DayBook
            view="dailySummary"
            {...commonProps}
            transactionService={serviceProps.transactionService}
            bankAccountService={serviceProps.bankAccountService}
            paymentService={serviceProps.paymentService}
          />
        );
    }
  };

  return (
    <div className="homepage-container">
      {/* Online/Offline Indicator */}
      <div className="position-fixed top-0 end-0 m-3" style={{zIndex: 1050}}>
        <div className={`badge ${isOnline ? "bg-success" : "bg-danger"}`}>
          <FontAwesomeIcon
            icon={isOnline ? faWifi : faTimesCircle}
            className="me-1"
          />
          {isOnline ? "Online" : "Offline"}
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer position="top-end" className="p-3" style={{zIndex: 1055}}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            show={true}
            onClose={() => removeToast(toast.id)}
            delay={toast.duration}
            autohide
            className={`border-${
              toast.type === "success"
                ? "success"
                : toast.type === "error"
                ? "danger"
                : toast.type === "warning"
                ? "warning"
                : "info"
            }`}
          >
            <Toast.Header
              className={`bg-${
                toast.type === "success"
                  ? "success"
                  : toast.type === "error"
                  ? "danger"
                  : toast.type === "warning"
                  ? "warning"
                  : "info"
              } text-white`}
            >
              <FontAwesomeIcon
                icon={
                  toast.type === "success"
                    ? faCheckCircle
                    : toast.type === "error"
                    ? faExclamationTriangle
                    : toast.type === "warning"
                    ? faExclamationTriangle
                    : faInfoCircle
                }
                className="me-2"
              />
              <strong className="me-auto">
                {toast.type === "success"
                  ? "Success"
                  : toast.type === "error"
                  ? "Error"
                  : toast.type === "warning"
                  ? "Warning"
                  : "Info"}
              </strong>
            </Toast.Header>
            <Toast.Body>{toast.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>

      {/* Main Content */}
      {renderContent()}
    </div>
  );
}

export default HomePage;
