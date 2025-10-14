import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboardList,
  faBox,
  faSpinner,
  faExclamationCircle,
  faInfoCircle,
  faArrowRight,
  faHome,
  faLayerGroup,
  faTags,
  faBarcode,
  faCheck,
  faPlus,
  faEdit,
  faTrash,
  faSearch,
  faMoneyBillWave,
  faArrowDown,
  faArrowUp,
} from "@fortawesome/free-solid-svg-icons";
import PropTypes from "prop-types";
import New_parties from "./New_parties/New_parties";
import Customers from "./New_parties/Customers/Customers";
import Vendors from "./New_parties/Vendors/Vendors";
import Expense from "./Expenses+/Expense";
import IndirectIncome from "./Expenses+/Indirect_Income/indirectIncome";
import PaymentIn from "./Transactions/PaymentIn";
import PaymentOut from "./Transactions/PaymentOut";
import SimpleItems from "./Items/SimpleItems";
import GSTInfo from "./Info/GSTInfo";
import CompanyBrandInfo from "./Info/CompanyBrandInfo";
import Sales from "./Sales/Sales";
import NewSalesInvoice from "./Sales/invoice/NewSalesInvoice"; // Add this import
import EndCustomers from "./New_parties/End_Customer/EndCustomers";
import PurchaseBillGst from "./Purchase/PurchaseBillGst";
import "./ContentDisplay.css";

// Content display component for new dashboard
const ContentDisplay = ({ activeContent, contentType, currentCompany, currentUser, isLoading, addToast }) => {
  const location = useLocation();
  const [localLoading, setLocalLoading] = useState(false);
  const [routeContent, setRouteContent] = useState({
    title: activeContent,
    type: contentType,
  });

  // Map path to content type
  const routeMap = {
    "/": { title: "Home", type: "welcome" },
    "/categories": { title: "Category Management", type: "categories" },
    "/items": { title: "Item Management", type: "items" },
    "/parties": { title: "Parties", type: "parties" },
    "/customers": { title: "Customers", type: "customers" },
    "/vendors": { title: "Vendors", type: "vendors" },
    "/expenses": { title: "Expenses", type: "expenseManagement" },
    "/indirect-income": { title: "Indirect Income", type: "indirectIncome" },
    "/payment-in": { title: "Payment In", type: "paymentIn" },
    "/payment-out": { title: "Payment Out", type: "paymentOut" },
    "/sales-with-gst": { title: "Sales with GST", type: "salesWithGST" },
    "/sales-without-gst": { title: "Sales without GST", type: "salesWithoutGST" },
    "/all-bills": { title: "All Bills", type: "allBills" },
    "/sales-invoice": { title: "Sales Invoice", type: "salesInvoice" }, // Make sure this is here
    "/gst": { title: "GST", type: "gst" },
    "/company-brand": { title: "Company/Brand", type: "companyBrand" },
    "/end-customers": { title: "End Customers", type: "endCustomers" },
    "/purchase-bill": { title: "Purchase Bill", type: "purchaseBill" },
    "/purchase-order": { title: "Purchase Order", type: "purchaseOrder" },
  };

  useEffect(() => {
    const path = location.pathname;
    console.log("🔍 Current path:", path); // Debug log
    
    // Extract the content type from company-specific URLs
    // URL format: /companies/{companyId}/{contentType}
    const pathParts = path.split('/');
    let contentPath = path;
    
    if (pathParts.length >= 4 && pathParts[1] === 'companies') {
      // Extract the content type from company URL
      contentPath = '/' + pathParts.slice(3).join('/');
      console.log("🔍 Extracted content path:", contentPath); // Debug log
    }
    
    // Check if we have a direct match in routeMap
    if (routeMap[contentPath]) {
      console.log("✅ Found direct match:", routeMap[contentPath]); // Debug log
      setRouteContent(routeMap[contentPath]);
    } else {
      // Try to match the last part of the path for content types
      const lastPart = pathParts[pathParts.length - 1];
      console.log("🔍 Checking last part:", lastPart); // Debug log
      
      const contentTypeMap = {
        'salesWithGST': { title: "Sales with GST", type: "salesWithGST" },
        'salesWithoutGST': { title: "Sales without GST", type: "salesWithoutGST" },
        'allBills': { title: "All Bills", type: "allBills" },
        'sales-invoice': { title: "Sales Invoice", type: "salesInvoice" }, // Add this key
        'salesInvoice': { title: "Sales Invoice", type: "salesInvoice" }, // Keep this too
        'categories': { title: "Category Management", type: "categories" },
        'items': { title: "Item Management", type: "items" },
        'parties': { title: "Parties", type: "parties" },
        'customers': { title: "Customers", type: "customers" },
        'vendors': { title: "Vendors", type: "vendors" },
        'expenseManagement': { title: "Expenses", type: "expenseManagement" },
        'indirectIncome': { title: "Indirect Income", type: "indirectIncome" },
        'paymentIn': { title: "Payment In", type: "paymentIn" },
        'paymentOut': { title: "Payment Out", type: "paymentOut" },
        'gst': { title: "GST", type: "gst" },
        'companyBrand': { title: "Company/Brand", type: "companyBrand" },
        'end-customers': { title: "End Customers", type: "endCustomers" },
        'endCustomers': { title: "End Customers", type: "endCustomers" },
      };
      
      if (contentTypeMap[lastPart]) {
        console.log("✅ Found content type match:", contentTypeMap[lastPart]); // Debug log
        setRouteContent(contentTypeMap[lastPart]);
      } else {
        console.log("❌ No match found, defaulting to welcome"); // Debug log
        setRouteContent({ title: "Home", type: "welcome" });
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    setLocalLoading(true);
    const timer = setTimeout(() => setLocalLoading(false), 400);
    return () => clearTimeout(timer);
  }, [routeContent]);

  // Handle direct prop changes from sidebar navigation
  useEffect(() => {
    if (activeContent && contentType) {
      console.log("🎯 Setting from props:", { activeContent, contentType }); // Debug log
      setRouteContent({
        title: activeContent,
        type: contentType,
      });
    }
  }, [activeContent, contentType]);

  // Default/Welcome Content
  const renderWelcomeContent = () => (
    <div className="content-welcome">
      <div className="welcome-container">
        <div className="welcome-icon">
          <FontAwesomeIcon icon={faHome} />
        </div>
        <h1 className="welcome-title">Welcome to New Dashboard</h1>
        <p className="welcome-subtitle">
          Select an item from the sidebar to get started
        </p>
        
        <div className="welcome-features">
          <div className="feature-card">
            <div className="feature-icon active">
              <FontAwesomeIcon icon={faClipboardList} />
            </div>
            <h3>Category Management</h3>
            <p>Organize your products with categories</p>
            <div className="status-badge active">Active</div>
          </div>

          <div className="feature-card">
            <div className="feature-icon active">
              <FontAwesomeIcon icon={faBox} />
            </div>
            <h3>Item Management</h3>
            <p>Manage your inventory items</p>
            <div className="status-badge active">Active</div>
          </div>

          <div className="feature-card">
            <div className="feature-icon inactive">
              <FontAwesomeIcon icon={faLayerGroup} />
            </div>
            <h3>More Features</h3>
            <p>Additional features coming soon</p>
            <div className="status-badge coming-soon">Coming Soon</div>
          </div>
        </div>

        {currentCompany && (
          <div className="current-company-info">
            <h4>Current Company</h4>
            <div className="company-details">
              <strong>{currentCompany.businessName || currentCompany.name}</strong>
              {currentCompany.email && (
                <p className="company-email">{currentCompany.email}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Category Management Content
  const renderCategoryContent = () => (
    <div className="content-categories">
      <div className="content-header">
        <div className="content-title">
          <FontAwesomeIcon icon={faArrowRight} className="me-2" />
          <h2>Category Management</h2>
        </div>
        <p className="content-description">Manage your product categories efficiently</p>
      </div>
      <div className="coming-soon-container">
        <div className="coming-soon-icon">
          <FontAwesomeIcon icon={faExclamationCircle} />
        </div>
        <h3>Coming Soon!</h3>
        <p>This feature is currently being redesigned and will be available soon.</p>
        
        <div className="development-status">
          <h4>What's being worked on:</h4>
          <ul>
            <li><FontAwesomeIcon icon={faCheck} className="text-success me-2" />Modern UI/UX Design</li>
            <li><FontAwesomeIcon icon={faCheck} className="text-success me-2" />Enhanced Performance</li>
            <li><FontAwesomeIcon icon={faSpinner} className="text-warning me-2" />Feature Integration</li>
            <li><FontAwesomeIcon icon={faSpinner} className="text-warning me-2" />Testing & Quality Assurance</li>
          </ul>
        </div>

        <div className="timeline-info">
          <p><strong>Expected Release:</strong> Next Update</p>
          <p><strong>Status:</strong> In Development</p>
        </div>
      </div>
    </div>
  );

  // Item Management Content
  const renderItemContent = () => (
    <div className="content-items">
      <div className="content-header">
        <div className="content-title">
          <FontAwesomeIcon icon={faArrowRight} className="me-2" />
          <h2>Item Management</h2>
        </div>
        <p className="content-description">Manage your inventory items efficiently</p>
      </div>
      <SimpleItems 
        currentCompany={currentCompany}
        currentUser={currentUser}
        addToast={addToast}
      />
    </div>
  );

  // Parties Content - New Parties Component
  const renderPartiesContent = () => (
    <div className="content-parties">
      <New_parties />
    </div>
  );

  // Customers Content
  const renderCustomersContent = () => (
    <div className="content-customers">
      <div className="content-header">
        <div className="content-title">
          <FontAwesomeIcon icon={faArrowRight} className="me-2" />
          <h2>Customer Management</h2>
        </div>
        <p className="content-description">Manage your customers efficiently</p>
      </div>
      <Customers />
    </div>
  );

  // Vendors Content
  const renderVendorsContent = () => (
    <div className="content-vendors">
      <div className="content-header">
        <div className="content-title">
          <FontAwesomeIcon icon={faArrowRight} className="me-2" />
          <h2>Vendor Management</h2>
        </div>
        <p className="content-description">Manage your vendors efficiently</p>
      </div>
      <Vendors />
    </div>
  );

  // Expenses Content
  const renderExpensesContent = () => (
    <div className="content-expenses">
      <div className="content-header">
        <div className="content-title">
          <FontAwesomeIcon icon={faArrowRight} className="me-2" />
          <h2>Expense Management</h2>
        </div>
        <p className="content-description">Manage your business expenses efficiently</p>
      </div>
      <Expense />
    </div>
  );

  // Indirect Income Content
  const renderIndirectIncomeContent = () => (
    <div className="content-indirect-income">
      <div className="content-header">
        <div className="content-title">
          <FontAwesomeIcon icon={faArrowRight} className="me-2" />
          <h2>Indirect Income Management</h2>
        </div>
        <p className="content-description">Manage your indirect income sources efficiently</p>
      </div>
      <IndirectIncome />
    </div>
  );

  // Payment In Content
  const renderPaymentInContent = () => (
    <div className="content-payment-in">
      <div className="content-header">
        <div className="content-title">
          <FontAwesomeIcon icon={faArrowDown} className="me-2" />
          <h2>Payment In</h2>
        </div>
        <p className="content-description">Record incoming payments from customers and vendors</p>
      </div>
      <PaymentIn 
        currentCompany={currentCompany}
        currentUser={currentUser}
        addToast={addToast}
      />
    </div>
  );

  // Payment Out Content
  const renderPaymentOutContent = () => (
    <div className="content-payment-out">
      <div className="content-header">
        <div className="content-title">
          <FontAwesomeIcon icon={faArrowUp} className="me-2" />
          <h2>Payment Out</h2>
        </div>
        <p className="content-description">Record outgoing payments to customers and vendors</p>
      </div>
      <PaymentOut 
        currentCompany={currentCompany}
        currentUser={currentUser}
        addToast={addToast}
      />
    </div>
  );

  // Sales Content - All sales management in one component
  const renderSalesContent = () => (
    <div className="content-sales">
      <Sales 
        currentCompany={currentCompany}
        currentUser={currentUser}
        addToast={addToast}
      />
    </div>
  );

  // Sales Invoice Content - Make sure this function exists
  const renderSalesInvoiceContent = () => {
    console.log("🎯 Rendering NewSalesInvoice component"); // Debug log
    return (
      <div className="content-sales-invoice">
        <NewSalesInvoice 
          currentCompany={currentCompany}
          currentUser={currentUser}
          addToast={addToast}
        />
      </div>
    );
  };

  // GST Content
  const renderGSTContent = () => (
    <div className="content-gst">
      <div className="content-header">
        <div className="content-title">
          <FontAwesomeIcon icon={faArrowRight} className="me-2" />
          <h2>GST Management</h2>
        </div>
        <p className="content-description">Manage your GST settings and configurations</p>
      </div>
      <GSTInfo 
        currentCompany={currentCompany}
        currentUser={currentUser}
        addToast={addToast}
      />
    </div>
  );

  // Company/Brand Content
  const renderCompanyBrandContent = () => (
    <div className="content-company-brand">
      <div className="content-header">
        <div className="content-title">
          <FontAwesomeIcon icon={faArrowRight} className="me-2" />
          <h2>Company/Brand Management</h2>
        </div>
        <p className="content-description">Manage your company and brand information</p>
      </div>
      <CompanyBrandInfo 
        currentCompany={currentCompany}
        currentUser={currentUser}
        addToast={addToast}
      />
    </div>
  );

  // End Customers Content
  const renderEndCustomersContent = () => (
    <div className="content-end-customers">
      <div className="content-header">
        <div className="content-title">
          <h2>End Customers</h2>
        </div>
        <p className="content-description">Add End Customers (only Name and WhatsApp required)</p>
      </div>
      <EndCustomers />
    </div>
  );

  // Purchase Bill Content
  const renderPurchaseBillContent = () => (
    <div className="content-purchase-bill">
      <PurchaseBillGst />
    </div>
  );

  // Coming Soon Content
  const renderComingSoonContent = () => (
    <div className="content-section">
      <div className="content-header">
        <div className="content-title">
          <FontAwesomeIcon icon={faExclamationCircle} className="content-icon" />
          <h2>{activeContent}</h2>
        </div>
      </div>

      <div className="content-body">
        <div className="coming-soon-container">
          <div className="coming-soon-icon">
            <FontAwesomeIcon icon={faExclamationCircle} />
          </div>
          <h3>Coming Soon!</h3>
          <p>This feature is currently being redesigned and will be available soon.</p>
          
          <div className="development-status">
            <h4>What's being worked on:</h4>
            <ul>
              <li><FontAwesomeIcon icon={faCheck} className="text-success me-2" />Modern UI/UX Design</li>
              <li><FontAwesomeIcon icon={faCheck} className="text-success me-2" />Enhanced Performance</li>
              <li><FontAwesomeIcon icon={faSpinner} className="text-warning me-2" />Feature Integration</li>
              <li><FontAwesomeIcon icon={faSpinner} className="text-warning me-2" />Testing & Quality Assurance</li>
            </ul>
          </div>

          <div className="timeline-info">
            <p><strong>Expected Release:</strong> Next Update</p>
            <p><strong>Status:</strong> In Development</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Main render logic - updated to use route-based content
  const renderContent = () => {
    console.log("🎯 ContentDisplay renderContent - routeContent:", routeContent);
    
    if (isLoading || localLoading) {
      return (
        <div className="content-loading">
          <div className="loading-container">
            <div className="loading-spinner">
              <FontAwesomeIcon icon={faSpinner} spin />
            </div>
            <h3>Loading {routeContent.title}...</h3>
            <p>Please wait while we prepare the content for you.</p>
          </div>
        </div>
      );
    }

    switch (routeContent.type) {
      case "categories":
        return renderCategoryContent();
      case "items":
        return renderItemContent();
      case "parties":
        return renderPartiesContent();
      case "customers":
        return renderCustomersContent();
      case "vendors":
        return renderVendorsContent();
      case "expenseManagement":
        return renderExpensesContent();
      case "indirectIncome":
        return renderIndirectIncomeContent();
      case "paymentIn":
        return renderPaymentInContent();
      case "paymentOut":
        return renderPaymentOutContent();
      case "salesWithGST":
      case "salesWithoutGST":
      case "allBills":
        return renderSalesContent();
      case "salesInvoice": // Make sure this case exists
        console.log("🎯 Rendering Sales Invoice Content"); // Debug log
        return renderSalesInvoiceContent();
      case "gst":
        return renderGSTContent();
      case "companyBrand":
        return renderCompanyBrandContent();
      case "endCustomers":
        return renderEndCustomersContent();
      case "purchaseBill": // Add this case
        return renderPurchaseBillContent();
      case "welcome":
      default:
        return renderWelcomeContent();
    }
  };

  return (
    <div className="content-display">
      {renderContent()}
    </div>
  );
};

// PropTypes
ContentDisplay.propTypes = {
  activeContent: PropTypes.string,
  contentType: PropTypes.string,
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
  }),
  isLoading: PropTypes.bool,
  addToast: PropTypes.func,
};

ContentDisplay.defaultProps = {
  activeContent: null,
  contentType: null,
  currentCompany: null,
  currentUser: null,
  isLoading: false,
  addToast: () => {},
};

ContentDisplay.displayName = "ContentDisplay";

export default ContentDisplay;