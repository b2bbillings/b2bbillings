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

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
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
        {
          key: "orders",
          label: "Orders",
          icon: faShoppingCart,
          badge: null,
          description: "Order management and tracking",
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

  // Render navigation item
  const renderNavItem = (item, isMain = false) => {
    const isActive = activeTab === item.key;

    return (
      <li key={item.key} className={`nav-item ${isActive ? "active" : ""}`}>
        <a
          href="#"
          className={`nav-link d-flex align-items-center ${
            isActive ? "text-white fw-bold" : "text-white-50"
          }`}
          onClick={(e) => {
            e.preventDefault();
            onTabChange(item.key);
          }}
          title={isCollapsed ? item.description : ""}
          style={{
            padding: "12px 15px",
            transition: "all 0.3s ease",
            borderRadius: "8px",
            margin: "2px 0",
          }}
        >
          <FontAwesomeIcon
            icon={item.icon}
            className={`${isCollapsed ? "text-center" : "me-3"}`}
            style={{width: "20px", fontSize: isCollapsed ? "1.2rem" : "1rem"}}
          />
          {!isCollapsed && (
            <>
              <span className="flex-grow-1">{item.label}</span>
              {item.badge !== null && item.badge > 0 && (
                <Badge
                  bg={item.badgeVariant || "primary"}
                  className="ms-auto"
                  style={{fontSize: "0.7rem"}}
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </Badge>
              )}
            </>
          )}
        </a>
      </li>
    );
  };

  // Render section
  const renderSection = (section) => {
    const isExpanded = expandedSections[section.section];

    return (
      <div key={section.section} className="mb-3">
        {!isCollapsed && (
          <div
            className="px-3 py-2 d-flex justify-content-between align-items-center"
            onClick={() => toggleSection(section.section)}
            style={{
              cursor: "pointer",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderRadius: "6px",
              margin: "0 10px",
              transition: "background-color 0.3s ease",
            }}
            onMouseEnter={(e) =>
              (e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)")
            }
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = "rgba(255, 255, 255, 0.05)")
            }
          >
            <small
              className="text-white-50 fw-bold text-uppercase"
              style={{fontSize: "0.75rem", letterSpacing: "0.5px"}}
            >
              {section.title}
            </small>
            <FontAwesomeIcon
              icon={isExpanded ? faChevronDown : faChevronRight}
              className="text-white-50"
              style={{fontSize: "0.7rem"}}
            />
          </div>
        )}

        <Collapse in={isExpanded || isCollapsed}>
          <div>
            <ul className="nav flex-column px-2">
              {section.items.map((item) => renderNavItem(item))}
            </ul>
          </div>
        </Collapse>
      </div>
    );
  };

  return (
    <>
      <div
        className={`bg-primary position-fixed top-0 start-0 h-100 admin-sidebar ${
          isCollapsed ? "" : ""
        }`}
        style={{
          width: isCollapsed ? "70px" : "280px",
          background: "linear-gradient(180deg, #4e73df 0%, #3a5bd7 100%)",
          transition: "width 0.3s ease",
          zIndex: 1000,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {/* Sidebar Header */}
        <div
          className="d-flex align-items-center justify-content-between text-white px-3"
          style={{
            height: "70px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            flexShrink: 0,
          }}
        >
          <h3
            className={`mb-0 fw-bold text-uppercase ${
              isCollapsed ? "d-none" : ""
            }`}
            style={{
              fontSize: "1.5rem",
              letterSpacing: "1px",
              transition: "opacity 0.3s ease",
            }}
          >
            Management
          </h3>
          <button
            className="btn text-white p-2 rounded-circle"
            onClick={onToggleCollapse}
            aria-label="Toggle Sidebar"
            style={{
              backgroundColor: "transparent",
              border: "none",
              width: "36px",
              height: "36px",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
              e.target.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.transform = "scale(1)";
            }}
          >
            <FontAwesomeIcon
              icon={isCollapsed ? faAnglesRight : faAnglesLeft}
            />
          </button>
        </div>

        {/* Sidebar Menu */}
        <div
          className="py-3"
          style={{
            display: "flex",
            flexDirection: "column",
            height: "calc(100vh - 70px)",
          }}
        >
          {/* Main Navigation */}
          <div
            className="px-2 mb-3"
            style={{
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              paddingBottom: "15px",
            }}
          >
            <ul className="nav flex-column">
              {mainNavItems.map((item) => renderNavItem(item, true))}
            </ul>
          </div>

          {/* Additional Sections */}
          <div className="flex-grow-1">
            {navigationSections.map(renderSection)}
          </div>

          {/* Logout Section */}
          <div className="mt-auto px-2">
            <ul className="nav flex-column">
              <li
                className="nav-item"
                style={{
                  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                  paddingTop: "15px",
                }}
              >
                <a
                  href="#"
                  className="nav-link d-flex align-items-center text-white-50"
                  onClick={(e) => {
                    e.preventDefault();
                    onLogout();
                  }}
                  style={{
                    padding: "12px 15px",
                    transition: "all 0.3s ease",
                    borderRadius: "8px",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = "#ff6b6b";
                    e.target.style.backgroundColor = "rgba(255, 107, 107, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = "rgba(255, 255, 255, 0.5)";
                    e.target.style.backgroundColor = "transparent";
                  }}
                >
                  <FontAwesomeIcon
                    icon={faSignOutAlt}
                    className={`${isCollapsed ? "text-center" : "me-3"}`}
                    style={{
                      width: "20px",
                      fontSize: isCollapsed ? "1.2rem" : "1rem",
                    }}
                  />
                  {!isCollapsed && <span>Logout</span>}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style>
        {`
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

          /* Mobile responsiveness */
          @media (max-width: 767px) {
            .admin-sidebar {
              transform: translateX(-100%);
              transition: transform 0.3s ease;
            }
            .admin-sidebar.show {
              transform: translateX(0);
            }
          }

          /* Hover effects for nav items */
          .admin-sidebar .nav-link:hover {
            background-color: rgba(255, 255, 255, 0.1);
            color: white !important;
            transform: translateX(5px);
          }

          .admin-sidebar .nav-item.active .nav-link {
            background-color: rgba(255, 255, 255, 0.2);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          /* Smooth animations */
          .admin-sidebar .nav-link,
          .admin-sidebar .nav-item {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          /* Badge animations */
          .admin-sidebar .badge {
            animation: pulse 2s infinite;
          }

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

          /* Collapsed state improvements */
          .admin-sidebar .nav-link[title]:hover::after {
            content: attr(title);
            position: absolute;
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
            opacity: 0;
            animation: fadeIn 0.3s ease forwards;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-50%) translateX(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(-50%) translateX(0);
            }
          }
        `}
      </style>
    </>
  );
}

export default AdminSidebar;
