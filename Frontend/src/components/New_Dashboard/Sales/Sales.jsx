import React, { useState } from 'react';
import SalesSecondarySidebar from './SalesSecondarySidebar';
import SalesWithGST from './SalesWithGST';
import SalesWithoutGST from './SalesWithoutGST';
import AllBillsList from './AllBillsList';
import './Sales.css';

const Sales = ({ currentCompany, currentUser, addToast }) => {
  const [activeMenu, setActiveMenu] = useState('sales-with-gst');

  const handleMenuSelect = (menuId) => {
    setActiveMenu(menuId);
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'sales-with-gst':
        return (
          <SalesWithGST 
            currentCompany={currentCompany}
            currentUser={currentUser}
            addToast={addToast}
          />
        );
      case 'sales-without-gst':
        return (
          <SalesWithoutGST 
            currentCompany={currentCompany}
            currentUser={currentUser}
            addToast={addToast}
          />
        );
      case 'all-bills':
        return (
          <AllBillsList 
            currentCompany={currentCompany}
            currentUser={currentUser}
            addToast={addToast}
          />
        );
      default:
        return (
          <SalesWithGST 
            currentCompany={currentCompany}
            currentUser={currentUser}
            addToast={addToast}
          />
        );
    }
  };

  return (
    <div className="sales-container">
      <div className="sales-layout">
        <div className="sales-secondary-sidebar-container">
          <SalesSecondarySidebar 
            onMenuSelect={handleMenuSelect}
            activeMenu={activeMenu}
          />
        </div>
        <div className="sales-content-container">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Sales;