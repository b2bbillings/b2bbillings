import React, {useState, useEffect, useCallback, useMemo} from "react";
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
import PropTypes from "prop-types";

// Import components
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

// Import services
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

// ✅ FIXED: Use JavaScript default parameters instead of defaultProps
function HomePage({
  currentCompany: propCurrentCompany = null,
  onCompanyChange = null,
  companies = [],
  currentUser = null,
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

  // Enhanced path to view mapping with production URLs
  const getViewFromPath = useCallback(() => {
    const pathParts = location.pathname.split("/").filter((part) => part);
    const lastPart = pathParts[pathParts.length - 1];
    const secondLastPart = pathParts[pathParts.length - 2];

    // Handle /add routes
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

      return addRouteMap[secondLastPart] || "dailySummary";
    }

    // Handle /edit routes
    if (lastPart === "edit" && pathParts.length >= 4) {
      const editType = pathParts[pathParts.length - 3];
      const editRouteMap = {
        "purchase-orders": "editPurchaseOrder",
        purchases: "editPurchaseBill",
        quotations: "editQuotation",
        "sales-orders": "editSalesOrder",
        products: "editProduct",
        parties: "editParty",
        items: "editItem",
      };

      return editRouteMap[editType] || "dailySummary";
    }

    // Handle view/detail routes
    if (pathParts.length >= 4 && pathParts[pathParts.length - 2] !== "add") {
      const viewType = pathParts[pathParts.length - 2];
      const detailRouteMap = {
        "purchase-orders": "viewPurchaseOrder",
        purchases: "viewPurchaseBill",
        quotations: "viewQuotation",
        "sales-orders": "viewSalesOrder",
        products: "viewProduct",
        parties: "viewParty",
        items: "viewItem",
      };

      return detailRouteMap[viewType] || "dailySummary";
    }

    // Standard path mapping
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
  }, [location.pathname]);

  // Update view when URL changes
  useEffect(() => {
    const newView = getViewFromPath();
    if (newView !== currentView) {
      setCurrentView(newView);
    }
  }, [getViewFromPath, currentView]);

  // Enhanced company state management
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

  // Enhanced toast management with production limits
  const addToast = useCallback((message, type = "info", duration = 5000) => {
    try {
      const id = Date.now() + Math.random();
      const toast = {
        id,
        message: String(message).slice(0, 200), // Limit message length
        type,
        duration: Math.min(duration, 10000), // Max 10 seconds
        timestamp: new Date().toISOString(),
      };

      setToasts((prev) => {
        // Keep only last 3 toasts for performance
        const newToasts = [...prev.slice(-2), toast];
        return newToasts;
      });

      // Auto-remove toast
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, toast.duration);
    } catch (error) {
      console.error("Error adding toast:", error);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Enhanced navigation handler with production routing
  const handleNavigation = useCallback(
    (page, params = {}) => {
      try {
        if (!currentCompany?.id && !currentCompany?._id) {
          addToast(
            "Please select a company first to access this feature",
            "warning"
          );
          return;
        }

        const companyId = currentCompany.id || currentCompany._id;

        // Production URL mapping
        const viewPathMap = {
          // Dashboard and core views
          dailySummary: "dashboard",
          transactions: "transactions",
          cashAndBank: "cash-bank",

          // Management views
          parties: "parties",
          invoices: "sales",
          quotations: "quotations",
          salesOrders: "sales-orders",
          purchaseBills: "purchases",
          purchaseOrders: "purchase-orders",

          // Inventory views
          inventory: "inventory",
          allProducts: "products",
          items: "items",
          lowStock: "low-stock",
          stockMovement: "stock-movement",

          // Financial views
          bankAccounts: "bank-accounts",
          cashAccounts: "cash-accounts",
          bankTransactions: "bank-transactions",
          bankReconciliation: "bank-reconciliation",
          cashFlow: "cash-flow",

          // Other views
          staff: "staff",
          insights: "insights",
          reports: "reports",
          settings: "settings",

          // Create actions
          createQuotation: "quotations/add",
          createSalesOrder: "sales-orders/add",
          createPurchaseOrder: "purchase-orders/add",
          createPurchaseBill: "purchases/add",
          createItem: "products/add",
          createProduct: "products/add",
          createParty: "parties/add",

          // Edit actions
          editQuotation: `quotations/${params.quotationId || params.id}/edit`,
          editSalesOrder: `sales-orders/${
            params.salesOrderId || params.id
          }/edit`,
          editPurchaseOrder: `purchase-orders/${
            params.purchaseOrderId || params.id
          }/edit`,
          editPurchaseBill: `purchases/${
            params.purchaseBillId || params.id
          }/edit`,
          editItem: `products/${params.itemId || params.id}/edit`,
          editProduct: `products/${params.productId || params.id}/edit`,
          editParty: `parties/${params.partyId || params.id}/edit`,

          // View actions
          viewQuotation: `quotations/${params.quotationId || params.id}`,
          viewSalesOrder: `sales-orders/${params.salesOrderId || params.id}`,
          viewPurchaseOrder: `purchase-orders/${
            params.purchaseOrderId || params.id
          }`,
          viewPurchaseBill: `purchases/${params.purchaseBillId || params.id}`,
          viewItem: `products/${params.itemId || params.id}`,
          viewProduct: `products/${params.productId || params.id}`,
          viewParty: `parties/${params.partyId || params.id}`,
        };

        const urlPath = viewPathMap[page] || "dashboard";
        const fullPath = `/companies/${companyId}/${urlPath}`;

        // Handle navigation with state
        const navigationOptions = {};
        if (params.state || params.duplicateData) {
          navigationOptions.state = {
            ...params.state,
            duplicateData: params.duplicateData,
          };
        }

        console.log(`🔄 Navigation: ${page} -> ${fullPath}`);
        navigate(fullPath, navigationOptions);

        // Success feedback for create actions
        const createActionNames = {
          createPurchaseOrder: "Create Purchase Order",
          createPurchaseBill: "Create Purchase Bill",
          createQuotation: "Create Quotation",
          createSalesOrder: "Create Sales Order",
          createProduct: "Create Product",
          createParty: "Create Party",
          createItem: "Create Item",
        };

        if (createActionNames[page]) {
          addToast(`Opening ${createActionNames[page]}...`, "info", 2000);
        }
      } catch (error) {
        console.error("Navigation error:", error);
        addToast("Navigation failed. Please try again.", "error");
      }
    },
    [currentCompany, navigate, addToast]
  );

  // Enhanced company change handler
  const handleCompanyChange = useCallback(
    async (company) => {
      if (isLoadingCompany) return; // Prevent concurrent changes

      setIsLoadingCompany(true);
      setCompanyError(null);

      try {
        if (company && !company.id && !company._id) {
          throw new Error("Invalid company data: missing ID");
        }

        setCurrentCompany(company);

        if (company) {
          const companyName = company.businessName || company.name;
          addToast(`Switched to ${companyName}`, "success", 3000);

          const companyId = company.id || company._id;
          navigate(`/companies/${companyId}/dashboard`, {replace: true});
        }

        if (onCompanyChange) {
          await onCompanyChange(company);
        }
      } catch (error) {
        console.error("Company change error:", error);
        setCompanyError(error.message);
        addToast("Failed to change company: " + error.message, "error");
      } finally {
        setIsLoadingCompany(false);
      }
    },
    [onCompanyChange, addToast, navigate, isLoadingCompany]
  );

  // Memoized common props for better performance
  const commonProps = useMemo(
    () => ({
      currentCompany,
      currentUser,
      onNavigate: handleNavigation,
      onCompanyChange: handleCompanyChange,
      isOnline,
      lastChecked,
      addToast,
      companyId: currentCompany?.id || currentCompany?._id,
    }),
    [
      currentCompany,
      currentUser,
      handleNavigation,
      handleCompanyChange,
      isOnline,
      lastChecked,
      addToast,
    ]
  );

  // Memoized service props
  const serviceProps = useMemo(
    () => ({
      authService,
      companyService,
      saleOrderService,
      salesService,
      purchaseOrderService,
      purchaseService,
      itemService,
      inventoryService: itemService,
      partyService,
      partiesService: partyService,
      bankAccountService,
      bankService: bankAccountService,
      paymentService,
      transactionService,
    }),
    []
  );

  // Enhanced render helpers
  const renderLoadingState = useCallback(
    (message = "Loading...") => (
      <div className="homepage-container">
        <Container className="d-flex justify-content-center align-items-center min-vh-100">
          <div className="text-center">
            <Spinner
              animation="border"
              variant="primary"
              className="mb-3"
              style={{width: "3rem", height: "3rem"}}
            />
            <h5 className="text-muted">{message}</h5>
          </div>
        </Container>
      </div>
    ),
    []
  );

  const renderErrorState = useCallback(
    (error, onRetry = null) => (
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
              <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
              Try Again
            </button>
          )}
        </Container>
      </div>
    ),
    []
  );

  const renderNoCompanyState = useCallback(
    (componentName) => (
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
          <button
            className="btn btn-primary"
            onClick={() => navigate("/dashboard")}
          >
            <FontAwesomeIcon icon={faBuilding} className="me-2" />
            Go to Dashboard
          </button>
        </Container>
      </div>
    ),
    [navigate]
  );

  // Check if component requires company
  const requiresCompany = useCallback((viewName) => {
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
      // Form views
      "createPurchaseOrder",
      "createPurchaseBill",
      "createQuotation",
      "createSalesOrder",
      "createProduct",
      "createParty",
      "createItem",
      // Edit views
      "editPurchaseOrder",
      "editPurchaseBill",
      "editQuotation",
      "editSalesOrder",
      "editProduct",
      "editParty",
      "editItem",
      // View/Detail views
      "viewPurchaseOrder",
      "viewPurchaseBill",
      "viewQuotation",
      "viewSalesOrder",
      "viewProduct",
      "viewParty",
      "viewItem",
    ];
    return companyRequiredViews.includes(viewName);
  }, []);

  // Enhanced content rendering with better error boundaries
  const renderContent = useCallback(() => {
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
      <ErrorBoundary
        fallback={
          <div className="text-center p-5">
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              size="2x"
              className="text-danger mb-3"
            />
            <h5>Component Error</h5>
            <p className="text-muted">This component encountered an error.</p>
            <button
              className="btn btn-outline-primary"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        }
      >
        {component}
      </ErrorBoundary>
    );

    try {
      switch (currentView) {
        // Dashboard and transactions
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

        // Create form views
        case "createPurchaseOrder":
          return wrapWithErrorBoundary(
            <div className="form-container">
              <Container className="py-4">
                <div className="d-flex align-items-center mb-4">
                  <button
                    className="btn btn-outline-secondary me-3"
                    onClick={() => handleNavigation("purchaseOrders")}
                  >
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />←
                    Back to Purchase Orders
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
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />←
                    Back to Purchase Bills
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
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />←
                    Back to Quotations
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
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />←
                    Back to Sales Orders
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
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />←
                    Back to Products
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
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />←
                    Back to Parties
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
                <FontAwesomeIcon
                  icon={faInfoCircle}
                  size="3x"
                  className="text-primary mb-3"
                />
                <h3>Insights Dashboard</h3>
                <p className="text-muted">
                  Business insights and analytics coming soon...
                </p>
                <button
                  className="btn btn-outline-primary"
                  onClick={() =>
                    addToast("Insights feature in development", "info")
                  }
                >
                  Learn More
                </button>
              </Container>
            </div>
          );

        case "reports":
          return wrapWithErrorBoundary(
            <div className="placeholder-content">
              <Container className="py-5 text-center">
                <FontAwesomeIcon
                  icon={faInfoCircle}
                  size="3x"
                  className="text-success mb-3"
                />
                <h3>Reports & Analytics</h3>
                <p className="text-muted">
                  Comprehensive reporting tools coming soon...
                </p>
                <button
                  className="btn btn-outline-success"
                  onClick={() =>
                    addToast("Reports feature in development", "info")
                  }
                >
                  Learn More
                </button>
              </Container>
            </div>
          );

        case "settings":
          return wrapWithErrorBoundary(
            <div className="placeholder-content">
              <Container className="py-5 text-center">
                <FontAwesomeIcon
                  icon={faInfoCircle}
                  size="3x"
                  className="text-warning mb-3"
                />
                <h3>Settings</h3>
                <p className="text-muted">
                  Application settings and configuration...
                </p>
                <button
                  className="btn btn-outline-warning"
                  onClick={() =>
                    addToast("Settings feature in development", "info")
                  }
                >
                  Learn More
                </button>
              </Container>
            </div>
          );

        // Default fallback
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
    } catch (error) {
      console.error("Render error:", error);
      return renderErrorState(
        "Failed to render component: " + error.message,
        () => window.location.reload()
      );
    }
  }, [
    currentView,
    isLoadingCompany,
    companyError,
    requiresCompany,
    currentCompany,
    commonProps,
    serviceProps,
    renderLoadingState,
    renderErrorState,
    renderNoCompanyState,
    handleNavigation,
    addToast,
  ]);

  return (
    <div className="homepage-container">
      {/* Online/Offline Indicator */}
      <div className="position-fixed top-0 end-0 m-3" style={{zIndex: 1050}}>
        <div
          className={`badge ${isOnline ? "bg-success" : "bg-danger"}`}
          title={`Status: ${
            isOnline ? "Online" : "Offline"
          } • Last checked: ${new Date(lastChecked).toLocaleTimeString()}`}
        >
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
              <small className="text-white-50">
                {new Date(toast.timestamp).toLocaleTimeString()}
              </small>
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

// ✅ UPDATED: Keep PropTypes for development assistance
HomePage.propTypes = {
  currentCompany: PropTypes.object,
  onCompanyChange: PropTypes.func,
  companies: PropTypes.array,
  currentUser: PropTypes.object,
};

// ✅ REMOVED: defaultProps (replaced with default parameters)

export default HomePage;
