import React from 'react';
import BankAccountDashboard from './BankAccountDashboard';
import AddCompanyForm from './AddCompanyForm';
import './ContentDisplay.css';

const ContentDisplay = ({ 
  activeContent, 
  currentUser, 
  currentCompany, 
  addToast,
  onContentChange 
}) => {

  const renderContent = () => {
    switch (activeContent) {
      case 'dashboard':
      case 'dayBook':
        return (
          <div className="dashboard-overview">
            <div className="dashboard-header">
              <h1>Day Book</h1>
              <p>Daily transaction overview for {currentUser?.firstName || 'User'}</p>
            </div>
            
            <div className="dashboard-stats">
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <h3>Today's Sales</h3>
                  <p>₹0.00</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">🛒</div>
                <div className="stat-info">
                  <h3>Today's Purchases</h3>
                  <p>₹0.00</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">�</div>
                <div className="stat-info">
                  <h3>Cash In Hand</h3>
                  <p>₹0.00</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">🏦</div>
                <div className="stat-info">
                  <h3>Bank Balance</h3>
                  <p>₹0.00</p>
                </div>
              </div>
            </div>

            <div className="dashboard-charts">
              <div className="chart-card">
                <h3>Daily Transaction Summary</h3>
                <div className="chart-placeholder">
                  <p>Today's transaction chart will be displayed here</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'categoryManagement':
        return (
          <div className="category-management-content">
            <div className="content-header">
              <h1>Category Management</h1>
              <p>Manage product and service categories</p>
            </div>
            <div className="coming-soon">
              <h3>Coming Soon</h3>
              <p>Category management features will be available here</p>
            </div>
          </div>
        );

      case 'itemManagement':
        return (
          <div className="item-management-content">
            <div className="content-header">
              <h1>Item Management</h1>
              <p>Manage your products and services</p>
            </div>
            <div className="coming-soon">
              <h3>Coming Soon</h3>
              <p>Item management features will be available here</p>
            </div>
          </div>
        );

      case 'sales':
        return (
          <div className="sales-content">
            <div className="content-header">
              <h1>Sales Management</h1>
              <p>Manage your sales invoices and orders</p>
            </div>
            <div className="sales-options">
              <div className="option-card">
                <h3>Sales with GST</h3>
                <p>Create sales invoices with GST calculations</p>
                <button className="btn btn-primary">Create Invoice</button>
              </div>
              <div className="option-card">
                <h3>Sales without GST</h3>
                <p>Create simple sales invoices without GST</p>
                <button className="btn btn-secondary">Create Invoice</button>
              </div>
            </div>
          </div>
        );

      case 'purchases':
        return (
          <div className="purchases-content">
            <div className="content-header">
              <h1>Purchase & Expense</h1>
              <p>Manage your purchases and business expenses</p>
            </div>
            <div className="purchase-options">
              <div className="option-card">
                <h3>Purchase Bills</h3>
                <p>Create and manage purchase bills</p>
                <button className="btn btn-primary">Create Bill</button>
              </div>
              <div className="option-card">
                <h3>Expenses</h3>
                <p>Track business expenses</p>
                <button className="btn btn-secondary">Add Expense</button>
              </div>
            </div>
          </div>
        );

      case 'inventory':
        return (
          <div className="inventory-content">
            <div className="content-header">
              <h1>Inventory Management</h1>
              <p>Track and manage your stock levels</p>
            </div>
            <div className="coming-soon">
              <h3>Coming Soon</h3>
              <p>Inventory management features will be available here</p>
            </div>
          </div>
        );

      case 'staffManagement':
        return (
          <div className="staff-management-content">
            <div className="content-header">
              <h1>Staff Management</h1>
              <p>Manage your team and staff members</p>
            </div>
            <div className="coming-soon">
              <h3>Coming Soon</h3>
              <p>Staff management features will be available here</p>
            </div>
          </div>
        );

      case 'purchaseBills':
        return (
          <div className="purchase-bills-content">
            <div className="content-header">
              <h1>Purchase Bills</h1>
              <p>View and manage purchase bills</p>
            </div>
            <div className="coming-soon">
              <h3>Coming Soon</h3>
              <p>Purchase bills management will be available here</p>
            </div>
          </div>
        );

      case 'purchaseOrders':
        return (
          <div className="purchase-orders-content">
            <div className="content-header">
              <h1>Purchase Orders</h1>
              <p>View and manage purchase orders</p>
            </div>
            <div className="coming-soon">
              <h3>Coming Soon</h3>
              <p>Purchase orders management will be available here</p>
            </div>
          </div>
        );

      case 'reports':
        return (
          <div className="reports-content">
            <div className="content-header">
              <h1>Reports</h1>
              <p>View business reports and analytics</p>
            </div>
            <div className="coming-soon">
              <h3>Coming Soon</h3>
              <p>Business reports and analytics will be available here</p>
            </div>
          </div>
        );

      case 'parties':
        return (
          <div className="parties-content">
            <div className="content-header">
              <h1>Parties Management</h1>
              <p>Manage customers and suppliers</p>
            </div>
            <div className="coming-soon">
              <h3>Coming Soon</h3>
              <p>Party management features will be available here</p>
            </div>
          </div>
        );

      case 'bankAccounts':
      case 'addBankAccount':
      case 'viewBankAccounts':
        return (
          <BankAccountDashboard 
            currentUser={currentUser}
            currentCompany={currentCompany}
            addToast={addToast}
          />
        );

      case 'addCompany':
        return (
          <div className="add-company-container">
            <div className="content-header">
              <h1>Add Company</h1>
              <p>Add a new company to your account</p>
            </div>
            <AddCompanyForm 
              currentUser={currentUser}
              currentCompany={currentCompany}
              onClose={() => onContentChange('dashboard')}
            />
          </div>
        );

      case 'settings':
        return (
          <div className="settings-content">
            <div className="content-header">
              <h1>Settings</h1>
              <p>Configure your application settings</p>
            </div>
            <div className="coming-soon">
              <h3>Coming Soon</h3>
              <p>Settings and configuration options will be available here</p>
            </div>
          </div>
        );

      default:
        return (
          <div className="default-content">
            <div className="content-header">
              <h1>Welcome to B2B Billing</h1>
              <p>Select an option from the sidebar to get started</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="content-display">
      {renderContent()}
    </div>
  );
};

export default ContentDisplay;