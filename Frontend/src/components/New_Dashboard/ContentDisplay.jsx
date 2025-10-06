import React, { useState, useEffect } from "react";
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
import "./ContentDisplay.css";

// Content display component for new dashboard
const ContentDisplay = ({ activeContent, contentType, currentCompany, currentUser, isLoading, addToast }) => {
  const [localLoading, setLocalLoading] = useState(false);

  // Debug logging
  console.log("ContentDisplay props:", { activeContent, contentType, isLoading });
  console.log("🎯 ContentDisplay Debug - contentType:", contentType, "activeContent:", activeContent);

  useEffect(() => {
    if (activeContent && contentType) {
      setLocalLoading(true);
      // Simulate loading delay
      const timer = setTimeout(() => {
        setLocalLoading(false);
      }, 800);

      return () => clearTimeout(timer);
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
    <div className="content-section">
      <div className="content-header">
        <div className="content-title">
          <FontAwesomeIcon icon={faClipboardList} className="content-icon" />
          <h2>Category Management</h2>
        </div>
        <div className="content-actions">
          <button className="btn btn-primary">
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Add Category
          </button>
        </div>
      </div>

      <div className="content-body">
        <div className="info-banner">
          <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
          This section will redirect to the existing Category Management page
        </div>

        <div className="feature-overview">
          <h3>Category Management Features</h3>
          <div className="feature-grid">
            <div className="feature-item">
              <FontAwesomeIcon icon={faPlus} className="feature-item-icon" />
              <div>
                <h4>Create Categories</h4>
                <p>Add new product categories</p>
              </div>
            </div>
            <div className="feature-item">
              <FontAwesomeIcon icon={faEdit} className="feature-item-icon" />
              <div>
                <h4>Edit Categories</h4>
                <p>Modify existing categories</p>
              </div>
            </div>
            <div className="feature-item">
              <FontAwesomeIcon icon={faTrash} className="feature-item-icon" />
              <div>
                <h4>Delete Categories</h4>
                <p>Remove unused categories</p>
              </div>
            </div>
            <div className="feature-item">
              <FontAwesomeIcon icon={faLayerGroup} className="feature-item-icon" />
              <div>
                <h4>Organize Hierarchy</h4>
                <p>Structure category relationships</p>
              </div>
            </div>
          </div>
        </div>

        <div className="redirect-info">
          <div className="redirect-card">
            <FontAwesomeIcon icon={faArrowRight} className="redirect-icon" />
            <div>
              <h4>Ready to manage categories?</h4>
              <p>Click the Category Management link in the sidebar to access the full category management interface.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Item Management Content
  const renderItemContent = () => (
    <div className="content-section">
      <div className="content-header">
        <div className="content-title">
          <FontAwesomeIcon icon={faBox} className="content-icon" />
          <h2>Item Management</h2>
        </div>
        <div className="content-actions">
          <button className="btn btn-primary">
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Add Item
          </button>
        </div>
      </div>

      <div className="content-body">
        <div className="info-banner">
          <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
          This section will redirect to the existing Item Management page
        </div>

        <div className="feature-overview">
          <h3>Item Management Features</h3>
          <div className="feature-grid">
            <div className="feature-item">
              <FontAwesomeIcon icon={faBox} className="feature-item-icon" />
              <div>
                <h4>Create Items</h4>
                <p>Add new inventory items</p>
              </div>
            </div>
            <div className="feature-item">
              <FontAwesomeIcon icon={faBarcode} className="feature-item-icon" />
              <div>
                <h4>Track Inventory</h4>
                <p>Monitor stock levels</p>
              </div>
            </div>
            <div className="feature-item">
              <FontAwesomeIcon icon={faTags} className="feature-item-icon" />
              <div>
                <h4>Price Management</h4>
                <p>Set and update pricing</p>
              </div>
            </div>
            <div className="feature-item">
              <FontAwesomeIcon icon={faSearch} className="feature-item-icon" />
              <div>
                <h4>Search & Filter</h4>
                <p>Find items quickly</p>
              </div>
            </div>
          </div>
        </div>

        <div className="redirect-info">
          <div className="redirect-card">
            <FontAwesomeIcon icon={faArrowRight} className="redirect-icon" />
            <div>
              <h4>Ready to manage items?</h4>
              <p>Click the Item Management link in the sidebar to access the full item management interface.</p>
            </div>
          </div>
        </div>
      </div>
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

  // Loading Content
  const renderLoadingContent = () => (
    <div className="content-loading">
      <div className="loading-container">
        <div className="loading-spinner">
          <FontAwesomeIcon icon={faSpinner} spin />
        </div>
        <h3>Loading {activeContent}...</h3>
        <p>Please wait while we prepare the content for you.</p>
      </div>
    </div>
  );

  // Main render logic
  const renderContent = () => {
    console.log("🎯 ContentDisplay renderContent - contentType:", contentType, "activeContent:", activeContent);
    console.log("🎯 ContentDisplay renderContent - full debug:", { 
      contentType, 
      activeContent, 
      isLoading, 
      localLoading,
      hasContent: !!(activeContent && contentType)
    });
    
    if (isLoading || localLoading) {
      console.log("🎯 ContentDisplay - showing loading content");
      return renderLoadingContent();
    }

    if (!activeContent || !contentType) {
      console.log("🎯 ContentDisplay - no content, showing welcome");
      return renderWelcomeContent();
    }

    console.log("🎯 ContentDisplay - switching on contentType:", contentType);
    switch (contentType) {
      case "categories":
        console.log("🎯 ContentDisplay - rendering category content");
        return renderCategoryContent();
      case "items":
        console.log("🎯 ContentDisplay - rendering items content");
        return renderItemContent();
      case "parties":
        console.log("🎯 ContentDisplay - rendering parties content");
        return renderPartiesContent();
      case "customers":
        console.log("🎯 ContentDisplay - rendering customers content");
        return renderCustomersContent();
      case "vendors":
        console.log("🎯 ContentDisplay - rendering vendors content");
        return renderVendorsContent();
      case "expenseManagement":
        console.log("🎯 ContentDisplay - rendering expenses content");
        return renderExpensesContent();
      case "indirectIncome":
        console.log("🎯 ContentDisplay - rendering indirect income content");
        return renderIndirectIncomeContent();
      case "paymentIn":
        console.log("🎯 ContentDisplay - rendering payment in content");
        return renderPaymentInContent();
      case "paymentOut":
        console.log("🎯 ContentDisplay - rendering payment out content");
        return renderPaymentOutContent();
      default:
        console.log("🎯 ContentDisplay - rendering coming soon content for:", contentType);
        return renderComingSoonContent();
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