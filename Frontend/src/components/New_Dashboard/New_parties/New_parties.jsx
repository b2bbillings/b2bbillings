import React, { useState, useEffect } from 'react';
import Customers from './Customers/Customers';
import Vendors from './Vendors/Vendors';
import AllPartiesList from './AllPartiesList';
import './New_parties.css';

const New_parties = ({ initialTab = 'customers' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showAllParties, setShowAllParties] = useState(false);

  // Update active tab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setShowAllParties(false); // Close the all parties view when switching tabs
  };

  const handleViewAll = () => {
    setShowAllParties(true);
  };

  const handleBackToForm = () => {
    setShowAllParties(false);
  };

  return (
    <div className="new-parties-container">
      <div className="tab-navigation">
        <div className="tab-buttons-group">
          <button
            className={`tab-button ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => handleTabChange('customers')}
          >
            <span className="tab-icon">👥</span>
            Customers
          </button>
          <button
            className={`tab-button ${activeTab === 'vendors' ? 'active' : ''}`}
            onClick={() => handleTabChange('vendors')}
          >
            <span className="tab-icon">🏢</span>
            Vendors
          </button>
        </div>
        
        {!showAllParties && (
          <button 
            className="view-all-btn"
            onClick={handleViewAll}
            title={`View all ${activeTab}`}
          >
            <span className="view-all-icon">📋</span>
            View All {activeTab === 'customers' ? 'Customers' : 'Vendors'}
          </button>
        )}
        
        {showAllParties && (
          <button 
            className="back-to-form-btn"
            onClick={handleBackToForm}
            title="Back to form"
          >
            <span className="back-icon">←</span>
            Back to Form
          </button>
        )}
      </div>

      <div className="tab-content">
        {!showAllParties ? (
          <>
            {activeTab === 'customers' && <Customers />}
            {activeTab === 'vendors' && <Vendors />}
          </>
        ) : (
          <AllPartiesList type={activeTab} />
        )}
      </div>
    </div>
  );
};

export default New_parties;