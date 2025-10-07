import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFileInvoiceDollar, 
  faReceipt, 
  faList,
  faChevronRight,
  faChevronDown 
} from '@fortawesome/free-solid-svg-icons';
import './SalesSecondarySidebar.css';

const SalesSecondarySidebar = ({ onMenuSelect, activeMenu }) => {
  const [expandedSections, setExpandedSections] = useState({
    billing: true,
    reports: false
  });

  const menuItems = [
    {
      id: 'billing',
      label: 'Billing',
      icon: faFileInvoiceDollar,
      type: 'section',
      children: [
        {
          id: 'sales-with-gst',
          label: 'Sales with GST',
          icon: faFileInvoiceDollar,
          description: 'Create GST compliant invoices'
        },
        {
          id: 'sales-without-gst',
          label: 'Sales without GST',
          icon: faReceipt,
          description: 'Create non-GST invoices'
        }
      ]
    },
    {
      id: 'reports',
      label: 'Reports & Lists',
      icon: faList,
      type: 'section',
      children: [
        {
          id: 'all-bills',
          label: 'All Bills',
          icon: faList,
          description: 'View all generated bills'
        }
      ]
    }
  ];

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleMenuClick = (menuId) => {
    onMenuSelect(menuId);
  };

  return (
    <div className="sales-secondary-sidebar">
      <div className="secondary-sidebar-header">
        <h3>Sales Management</h3>
        <p>Billing & Invoice Management</p>
      </div>
      
      <div className="secondary-sidebar-content">
        {menuItems.map(item => (
          <div key={item.id} className="secondary-sidebar-section">
            <div 
              className="section-header"
              onClick={() => toggleSection(item.id)}
            >
              <div className="section-title">
                <FontAwesomeIcon icon={item.icon} />
                <span>{item.label}</span>
              </div>
              <FontAwesomeIcon 
                icon={expandedSections[item.id] ? faChevronDown : faChevronRight}
                className="section-toggle"
              />
            </div>
            
            {expandedSections[item.id] && (
              <div className="section-items">
                {item.children.map(child => (
                  <div
                    key={child.id}
                    className={`secondary-sidebar-item ${activeMenu === child.id ? 'active' : ''}`}
                    onClick={() => handleMenuClick(child.id)}
                  >
                    <div className="item-icon">
                      <FontAwesomeIcon icon={child.icon} />
                    </div>
                    <div className="item-content">
                      <span className="item-label">{child.label}</span>
                      <span className="item-description">{child.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalesSecondarySidebar;