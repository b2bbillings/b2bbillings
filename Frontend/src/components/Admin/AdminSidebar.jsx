import React, {useState} from "react";
import {Nav, Collapse, Badge} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faHome,
  faChartLine,
  faBuilding,
  faUsers,
  faShieldAlt,
  faDatabase,
  faFileAlt,
  faBell,
  faCog,
  faSignOutAlt,
  faChevronDown,
  faChevronRight,
  faTachometerAlt,
  faLock,
  faUserCog,
  faTools,
  faHistory,
  faAnglesLeft,
  faAnglesRight,
  faBoxes,
  faShoppingCart,
  faWarehouse,
  faClipboardList,
  faFileInvoice,
  faFileInvoiceDollar,
  faMoneyBillWave,
  faReceipt,
} from "@fortawesome/free-solid-svg-icons";

function AdminSidebar({
  activeTab,
  onTabChange,
  currentUser,
  onLogout,
  isCollapsed,
  onToggleCollapse,
  adminData,
}) {
  // State for managing collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    inventory: true,
    sales: true,
    system: false,
  });

  // State for managing dropdown menus
  const [expandedDropdowns, setExpandedDropdowns] = useState({
    orders: false,
    invoices: false,
  });

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Toggle dropdown expansion
  const toggleDropdown = (dropdown) => {
    setExpandedDropdowns((prev) => ({
      ...prev,
      [dropdown]: !prev[dropdown],
    }));
  };

  // Main navigation items for shop management
  const mainNavItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: faTachometerAlt,
      badge: null,
      description: "System overview and statistics",
    },
    {
      key: "analytics",
      label: "Analytics",
      icon: faChartLine,
      badge: null,
      description: "Advanced analytics and insights",
    },
  ];

  // Navigation sections for shop management
  const navigationSections = [
    // Inventory Management Section
    {
      section: "inventory",
      title: "Inventory Management",
      items: [
        {
          key: "companies",
          label: "Companies",
          icon: faBuilding,
          badge: adminData?.totalCompanies || 0,
          description: "Manage companies and suppliers",
        },
        {
          key: "users",
          label: "Users",
          icon: faUsers,
          badge: adminData?.totalUsers || 0,
          description: "User accounts and permissions",
        },
        {
          key: "products",
          label: "Products",
          icon: faBoxes,
          badge: null,
          description: "Product catalog management",
        },
        {
          key: "inventory",
          label: "Stock Management",
          icon: faWarehouse,
          badge: null,
          description: "Inventory and stock levels",
        },
      ],
    },
    // Sales & Operations Section
    {
      section: "sales",
      title: "Sales & Operations",
      items: [
        // Orders with dropdown
        {
          key: "orders",
          label: "Orders",
          icon: faShoppingCart,
          badge: null,
          description: "Order management and tracking",
          hasDropdown: true,
          dropdownItems: [
            {
              key: "sales-orders",
              label: "Sales Orders",
              icon: faMoneyBillWave,
              description: "Manage sales orders",
            },
            {
              key: "purchase-orders",
              label: "Purchase Orders",
              icon: faShoppingCart,
              description: "Manage purchase orders",
            },
          ],
        },
        // Invoices with dropdown
        {
          key: "invoices",
          label: "Invoices",
          icon: faFileInvoice,
          badge: null,
          description: "Invoice management and billing",
          hasDropdown: true,
          dropdownItems: [
            {
              key: "sales-invoices",
              label: "Sales Invoices",
              icon: faFileInvoiceDollar,
              description: "Manage sales invoices",
            },
            {
              key: "purchase-invoices",
              label: "Purchase Invoices",
              icon: faReceipt,
              description: "Manage purchase invoices",
            },
          ],
        },
        {
          key: "reports",
          label: "Reports",
          icon: faFileAlt,
          badge: null,
          description: "Generate business reports",
        },
        {
          key: "staff",
          label: "Staff Management",
          icon: faUserCog,
          badge: null,
          description: "Employee management",
        },
      ],
    },
    // System Section
    {
      section: "system",
      title: "System & Security",
      items: [
        {
          key: "security",
          label: "Security",
          icon: faShieldAlt,
          badge: adminData?.alerts || 0,
          badgeVariant: "danger",
          description: "Security monitoring and controls",
        },
        {
          key: "permissions",
          label: "Permissions",
          icon: faLock,
          badge: null,
          description: "Access control management",
        },
        {
          key: "database",
          label: "Database",
          icon: faDatabase,
          badge: null,
          description: "Database management",
        },
        {
          key: "notifications",
          label: "Notifications",
          icon: faBell,
          badge: adminData?.notifications || 0,
          badgeVariant: "warning",
          description: "System notifications",
        },
        {
          key: "settings",
          label: "Settings",
          icon: faCog,
          badge: null,
          description: "System configuration",
        },
      ],
    },
  ];

  // Generate CSS styles
  const getStyles = () => `
    .admin-sidebar {
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      width: ${isCollapsed ? "70px" : "280px"};
      background: linear-gradient(180deg, #4e73df 0%, #3a5bd7 100%);
      transition: width 0.3s ease;
      z-index: 1000;
      overflow-y: auto;
      overflow-x: hidden;
      color: white;
    }

    .admin-sidebar::-webkit-scrollbar {
      width: 4px;
    }

    .admin-sidebar::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
    }

    .admin-sidebar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
    }

    .admin-sidebar::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.5);
    }

    /* Header */
    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 15px;
      height: 70px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      flex-shrink: 0;
    }

    .sidebar-title {
      margin: 0;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 1.5rem;
      letter-spacing: 1px;
      transition: opacity 0.3s ease;
      color: white;
    }

    .sidebar-toggle-btn {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.9);
      padding: 8px;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sidebar-toggle-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: scale(1.1);
      color: white;
    }

    /* Menu */
    .sidebar-menu {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 70px);
      padding: 15px 0;
    }

    .sidebar-main-nav {
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 15px;
      margin-bottom: 15px;
    }

    .sidebar-sections {
      flex-grow: 1;
    }

    .sidebar-logout {
      margin-top: auto;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 15px;
    }

    /* Lists */
    .sidebar-nav-list,
    .sidebar-dropdown-list {
      list-style: none;
      margin: 0;
      padding: 0 10px;
    }

    .sidebar-dropdown-list {
      padding: 0 20px;
    }

    /* Navigation Items */
    .sidebar-nav-item,
    .sidebar-dropdown-item {
      margin: 2px 0;
    }

    .sidebar-nav-link,
    .sidebar-dropdown-link {
      display: flex;
      align-items: center;
      padding: 12px 15px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      color: rgba(255, 255, 255, 0.85);
      text-decoration: none;
    }

    .sidebar-dropdown-link {
      padding: 8px 15px 8px 45px;
      font-size: 0.9rem;
      background: rgba(255, 255, 255, 0.05);
      border-left: 2px solid rgba(255, 255, 255, 0.3);
      margin-left: 10px;
      color: rgba(255, 255, 255, 0.8);
    }

    /* Hover Effects */
    .sidebar-nav-link:hover,
    .sidebar-dropdown-link:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      transform: translateX(5px);
    }

    .sidebar-dropdown-link:hover {
      background: rgba(255, 255, 255, 0.15);
      border-left-color: rgba(255, 255, 255, 0.7);
    }

    /* Active States */
    .sidebar-nav-item.active .sidebar-nav-link,
    .sidebar-dropdown-item.active .sidebar-dropdown-link {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      font-weight: bold;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .sidebar-dropdown-item.active .sidebar-dropdown-link {
      background: rgba(255, 255, 255, 0.25);
      border-left-color: white;
    }

    /* Icons and Labels - IMPROVED VISIBILITY */
    .sidebar-icon {
      width: 20px;
      text-align: center;
      font-size: ${isCollapsed ? "1.3rem" : "1.1rem"};
      margin-right: ${isCollapsed ? "0" : "12px"};
      color: rgba(255, 255, 255, 0.9);
      font-weight: 500;
      transition: all 0.3s ease;
    }

    /* Icon hover effects */
    .sidebar-nav-link:hover .sidebar-icon,
    .sidebar-dropdown-link:hover .sidebar-icon {
      color: white;
      transform: scale(1.1);
      text-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
    }

    /* Active icon styling */
    .sidebar-nav-item.active .sidebar-icon,
    .sidebar-dropdown-item.active .sidebar-icon {
      color: white;
      text-shadow: 0 0 10px rgba(255, 255, 255, 0.4);
    }

    .sidebar-label {
      flex-grow: 1;
      font-weight: 500;
    }

    .sidebar-badge {
      margin-right: 8px;
      font-size: 0.7rem;
      animation: pulse 2s infinite;
    }

    .sidebar-chevron {
      font-size: 0.8rem;
      transition: transform 0.3s ease;
      color: rgba(255, 255, 255, 0.8);
    }

    .sidebar-nav-link:hover .sidebar-chevron {
      transform: scale(1.1);
      color: white;
    }

    /* Sections */
    .sidebar-section {
      margin-bottom: 15px;
    }

    .sidebar-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 15px;
      margin: 0 10px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }

    .sidebar-section-header:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .sidebar-section-title {
      color: rgba(255, 255, 255, 0.8);
      font-weight: bold;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.5px;
    }

    .sidebar-section-chevron {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.7rem;
    }

    /* Dropdown Container */
    .sidebar-dropdown-container {
      margin-top: 5px;
    }

    /* Logout Special Styling */
    .logout-link {
      transition: all 0.3s ease;
    }

    .logout-link:hover {
      background: rgba(255, 107, 107, 0.15) !important;
      color: #ff6b6b !important;
    }

    .logout-link:hover .sidebar-icon {
      color: #ff6b6b !important;
      transform: scale(1.15);
      text-shadow: 0 0 10px rgba(255, 107, 107, 0.4);
    }

    /* Tooltips for collapsed state */
    .admin-sidebar.collapsed .sidebar-nav-link[title]:hover::before,
    .admin-sidebar.collapsed .sidebar-dropdown-link[title]:hover::before {
      content: attr(title);
      position: fixed;
      left: 80px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.8rem;
      white-space: nowrap;
      z-index: 1001;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    /* Enhanced collapsed state icon visibility */
    .admin-sidebar.collapsed .sidebar-icon {
      font-size: 1.4rem;
      color: rgba(255, 255, 255, 0.95);
      font-weight: 600;
    }

    .admin-sidebar.collapsed .sidebar-nav-link:hover .sidebar-icon {
      color: white;
      transform: scale(1.2);
      text-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
    }

    .admin-sidebar.collapsed .sidebar-nav-item.active .sidebar-icon {
      color: white;
      text-shadow: 0 0 15px rgba(255, 255, 255, 0.6);
    }

    /* Badge styling improvements */
    .sidebar-badge {
      background: rgba(255, 255, 255, 0.9) !important;
      color: #4e73df !important;
      font-weight: 600;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    /* Animations */
    @keyframes pulse {
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
      100% {
        transform: scale(1);
      }
    }

    /* Glow effect for active items */
    @keyframes glow {
      0% {
        box-shadow: 0 0 5px rgba(255, 255, 255, 0.1);
      }
      50% {
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
      }
      100% {
        box-shadow: 0 0 5px rgba(255, 255, 255, 0.1);
      }
    }

    .sidebar-nav-item.active .sidebar-nav-link,
    .sidebar-dropdown-item.active .sidebar-dropdown-link {
      animation: glow 2s ease-in-out infinite alternate;
    }

    /* Mobile responsiveness */
    @media (max-width: 767px) {
      .admin-sidebar {
        transform: translateX(-100%);
        transition: transform 0.3s ease;
      }

      .admin-sidebar.show {
        transform: translateX(0);
      }

      /* Better icon visibility on mobile */
      .sidebar-icon {
        font-size: 1.2rem;
        color: rgba(255, 255, 255, 0.95);
      }
    }

    /* Additional contrast improvements */
    .sidebar-nav-link,
    .sidebar-dropdown-link {
      border: 1px solid transparent;
      transition: all 0.3s ease;
    }

    .sidebar-nav-link:hover,
    .sidebar-dropdown-link:hover {
      border-color: rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.12);
    }

    .sidebar-nav-item.active .sidebar-nav-link,
    .sidebar-dropdown-item.active .sidebar-dropdown-link {
      border-color: rgba(255, 255, 255, 0.2);
    }
  `;

  // Render dropdown item
  const renderDropdownItem = (item, parentKey) => {
    const isActive = activeTab === item.key;

    return (
      <li
        key={item.key}
        className={`sidebar-dropdown-item ${isActive ? "active" : ""}`}
      >
        <div
          className="sidebar-dropdown-link"
          onClick={(e) => {
            e.preventDefault();
            onTabChange(item.key);
          }}
          title={isCollapsed ? item.description : ""}
        >
          <FontAwesomeIcon icon={item.icon} className="sidebar-icon" />
          {!isCollapsed && <span className="sidebar-label">{item.label}</span>}
        </div>
      </li>
    );
  };

  // Render navigation item
  const renderNavItem = (item, isMain = false) => {
    const isActive = activeTab === item.key;
    const hasDropdown = item.hasDropdown;
    const isDropdownExpanded = expandedDropdowns[item.key];

    return (
      <div key={item.key}>
        <li className={`sidebar-nav-item ${isActive ? "active" : ""}`}>
          <div
            className="sidebar-nav-link"
            onClick={(e) => {
              e.preventDefault();
              if (hasDropdown && !isCollapsed) {
                toggleDropdown(item.key);
              } else {
                onTabChange(item.key);
              }
            }}
            title={isCollapsed ? item.description : ""}
          >
            <FontAwesomeIcon icon={item.icon} className="sidebar-icon" />
            {!isCollapsed && (
              <>
                <span className="sidebar-label">{item.label}</span>
                {item.badge !== null && item.badge > 0 && (
                  <Badge
                    bg={item.badgeVariant || "primary"}
                    className="sidebar-badge"
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </Badge>
                )}
                {hasDropdown && (
                  <FontAwesomeIcon
                    icon={isDropdownExpanded ? faChevronDown : faChevronRight}
                    className="sidebar-chevron"
                  />
                )}
              </>
            )}
          </div>
        </li>

        {/* Dropdown items */}
        {hasDropdown && !isCollapsed && (
          <Collapse in={isDropdownExpanded}>
            <div className="sidebar-dropdown-container">
              <ul className="sidebar-dropdown-list">
                {item.dropdownItems.map((dropdownItem) =>
                  renderDropdownItem(dropdownItem, item.key)
                )}
              </ul>
            </div>
          </Collapse>
        )}
      </div>
    );
  };

  // Render section
  const renderSection = (section) => {
    const isExpanded = expandedSections[section.section];

    return (
      <div key={section.section} className="sidebar-section">
        {!isCollapsed && (
          <div
            className="sidebar-section-header"
            onClick={() => toggleSection(section.section)}
          >
            <small className="sidebar-section-title">{section.title}</small>
            <FontAwesomeIcon
              icon={isExpanded ? faChevronDown : faChevronRight}
              className="sidebar-section-chevron"
            />
          </div>
        )}

        <Collapse in={isExpanded || isCollapsed}>
          <div>
            <ul className="sidebar-nav-list">
              {section.items.map((item) => renderNavItem(item))}
            </ul>
          </div>
        </Collapse>
      </div>
    );
  };

  return (
    <>
      <div className={`admin-sidebar ${isCollapsed ? "collapsed" : ""}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <h3 className={`sidebar-title ${isCollapsed ? "d-none" : ""}`}>
            Management
          </h3>
          <button
            className="sidebar-toggle-btn"
            onClick={onToggleCollapse}
            aria-label="Toggle Sidebar"
          >
            <FontAwesomeIcon
              icon={isCollapsed ? faAnglesRight : faAnglesLeft}
            />
          </button>
        </div>

        {/* Sidebar Menu */}
        <div className="sidebar-menu">
          {/* Main Navigation */}
          <div className="sidebar-main-nav">
            <ul className="sidebar-nav-list">
              {mainNavItems.map((item) => renderNavItem(item, true))}
            </ul>
          </div>

          {/* Additional Sections */}
          <div className="sidebar-sections">
            {navigationSections.map(renderSection)}
          </div>

          {/* Logout Section */}
          <div className="sidebar-logout">
            <ul className="sidebar-nav-list">
              <li className="sidebar-nav-item">
                <div
                  className="sidebar-nav-link logout-link"
                  onClick={(e) => {
                    e.preventDefault();
                    onLogout();
                  }}
                >
                  <FontAwesomeIcon
                    icon={faSignOutAlt}
                    className="sidebar-icon"
                  />
                  {!isCollapsed && (
                    <span className="sidebar-label">Logout</span>
                  )}
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* CSS Styles */}
      <style dangerouslySetInnerHTML={{__html: getStyles()}} />
    </>
  );
}

export default AdminSidebar;
