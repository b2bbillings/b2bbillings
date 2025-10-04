import React, { useState } from 'react';
import Customers from './Customers/Customers';
import Vendors from './Vendors/Vendors';
import './New_parties.css';

const New_parties = ({ initialTab = 'customers' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update active tab when initialTab prop changes
  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="new-parties-container">
      {/* <div className="parties-header">
        <h1>Parties Management</h1>
        <p>Manage your customers and vendors efficiently</p>
      </div> */}

      <div className="tab-navigation">
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

      <div className="tab-content">
        {activeTab === 'customers' && <Customers />}
        {activeTab === 'vendors' && <Vendors />}
      </div>
    </div>
  );
};

export default New_parties;
