import React, {useState, useEffect, useRef} from "react";
import {
  Navbar as BootstrapNavbar,
  Container,
  Nav,
  Button,
  Image,
  Spinner,
  Alert,
  Dropdown,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faBell,
  faUser,
  faCog,
  faClipboardList,
  faSignOutAlt,
  faBars,
  faQuestionCircle,
  faPlus,
  faBuilding,
  faExclamationTriangle,
  faSync,
  faWifi,
  faTimes,
  faCheck,
  faHome,
  faUserShield,
  faTrash,
  faCheckCircle,
  faEye,
  faBellSlash,
  faFileInvoice,
} from "@fortawesome/free-solid-svg-icons";
import {useParams, useNavigate, useLocation} from "react-router-dom";
import PropTypes from "prop-types";

// Import components
import CreateCompany from "../components/Company/CreateCompany";

// Import services
import notificationService from "../services/notificationService";
import authService from "../services/authService";

// Import styles
import "./Navbar.css";

// Optimized SVG logo
const B2B_LOGO = `data:image/svg+xml;base64,${btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#2563eb"/>
        <stop offset="50%" stop-color="#3b82f6"/>
        <stop offset="100%" stop-color="#1d4ed8"/>
      </linearGradient>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#00000020"/>
      </filter>
    </defs>
    
    <circle cx="256" cy="256" r="240" fill="url(#brandGradient)" filter="url(#shadow)"/>
    
    <text x="256" y="200" font-family="Arial, sans-serif" font-weight="bold" font-size="72" 
          text-anchor="middle" fill="white">B2B</text>
    
    <rect x="180" y="280" width="152" height="120" rx="8" fill="white" opacity="0.9"/>
    <rect x="200" y="300" width="112" height="8" rx="4" fill="#2563eb"/>
    <rect x="200" y="320" width="80" height="6" rx="3" fill="#64748b"/>
    <rect x="200" y="335" width="100" height="6" rx="3" fill="#64748b"/>
    <rect x="200" y="350" width="60" height="6" rx="3" fill="#64748b"/>
    
    <circle cx="420" cy="160" r="45" fill="white" opacity="0.95"/>
    <text x="420" y="175" font-family="Arial, sans-serif" font-weight="bold" font-size="36" 
          text-anchor="middle" fill="#2563eb">$</text>
  </svg>
`)}`;

// Professional color palette
const COMPANY_COLORS = [
  "#2563eb",
  "#059669",
  "#dc2626",
  "#7c3aed",
  "#ea580c",
  "#0891b2",
  "#be123c",
  "#4338ca",
  "#16a34a",
  "#c2410c",
  "#9333ea",
  "#0d9488",
];

// View display mapping
const VIEW_DISPLAY_NAMES = {
  dashboard: "Dashboard",
  daybook: "Day Book",
  transactions: "Transactions",
  "cash-bank": "Cash & Bank",
  parties: "Business Partners",
  sales: "Sales Management",
  invoices: "Sales Invoices",
  "sales-orders": "Sales Orders",
  purchases: "Purchase Management",
  "purchase-bills": "Purchase Bills",
  "purchase-orders": "Purchase Orders",
  inventory: "Inventory Management",
  products: "Product Catalog",
  "low-stock": "Low Stock Alert",
  "stock-movement": "Stock Movement",
  "bank-accounts": "Bank Accounts",
  "cash-accounts": "Cash Management",
  "bank-transactions": "Bank Transactions",
  "bank-reconciliation": "Bank Reconciliation",
  "cash-flow": "Cash Flow Analysis",
  staff: "Staff Management",
  quotations: "Quotations",
  "daily-task-assignment": "Task Assignment",
};

function Navbar({
  onLogout,
  toggleSidebar,
  currentCompany = null,
  companies = [],
  onCompanyChange,
  onCompanyCreated,
  onCompanyUpdated,
  currentUser = null,
  isLoadingCompanies = false,
  isOnline = true,
  companyId,
}) {
  // ===============================
  // HOOKS & STATE
  // ===============================
  const {companyId: urlCompanyId} = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Use companyId from props or URL
  const effectiveCompanyId = companyId || urlCompanyId;

  // Dropdown states
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [showCreateCompany, setShowCreateCompany] = useState(false);

  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState(null);

  // Toast states
  const [toastNotifications, setToastNotifications] = useState([]);

  // Refs for click outside detection
  const notificationRef = useRef(null);
  const userDropdownRef = useRef(null);
  const businessDropdownRef = useRef(null);

  // ===============================
  // UTILITY FUNCTIONS
  // ===============================

  // Generate company initials
  const generateInitials = (name) => {
    if (!name) return "NA";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get company color
  const getCompanyColor = (index = 0) => {
    return COMPANY_COLORS[index % COMPANY_COLORS.length];
  };

  // ✅ ENHANCED ADMIN CHECK - Multiple validation methods
  const isUserAdmin = () => {
    if (!currentUser) return false;

    // Primary admin checks
    const roleBasedAdmin =
      currentUser.role === "admin" ||
      currentUser.role === "administrator" ||
      currentUser.userType === "admin";

    const propertyBasedAdmin = currentUser.isAdmin === true;

    // Array-based role checks
    const arrayRoleAdmin =
      Array.isArray(currentUser.roles) && currentUser.roles.includes("admin");

    const arrayPermissionAdmin =
      Array.isArray(currentUser.permissions) &&
      currentUser.permissions.includes("admin");

    // Special admin emails (for development/testing)
    const emailBasedAdmin =
      currentUser.email === "admin@b2bbillings.com" ||
      currentUser.email === "admin@shopmanagement.com" ||
      currentUser.email === "superadmin@b2bbillings.com";

    // Check against auth service
    const authServiceAdmin = authService.isAdmin();

    // Admin level checks (if your system uses levels)
    const levelBasedAdmin =
      currentUser.adminLevel === "super" ||
      currentUser.adminLevel === "admin" ||
      currentUser.accessLevel === "admin";

    // Department-based admin check
    const departmentAdmin =
      currentUser.department === "administration" &&
      currentUser.isManager === true;

    // Combine all checks
    const isAdmin =
      roleBasedAdmin ||
      propertyBasedAdmin ||
      arrayRoleAdmin ||
      arrayPermissionAdmin ||
      emailBasedAdmin ||
      authServiceAdmin ||
      levelBasedAdmin ||
      departmentAdmin;

    // Additional validation: Must have user ID and email
    const hasValidCredentials =
      (currentUser.id || currentUser._id) &&
      currentUser.email &&
      currentUser.email.includes("@");

    // Final result
    const finalAdminStatus = isAdmin && hasValidCredentials;

    return finalAdminStatus;
  };

  // Get current view display name
  const getCurrentView = () => {
    const pathParts = location.pathname.split("/");
    const lastPart = pathParts[pathParts.length - 1];
    return VIEW_DISPLAY_NAMES[lastPart] || "B2B Billing Dashboard";
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (currentUser?.name) return currentUser.name;
    if (currentUser?.email) return currentUser.email.split("@")[0];
    return "User";
  };

  // Get user avatar URL
  const getUserAvatarUrl = () => {
    const displayName = getUserDisplayName();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      displayName
    )}&background=2563eb&color=fff&size=36&font-size=0.33`;
  };

  // ===============================
  // NOTIFICATION HANDLERS
  // ===============================

  // Setup notification service listeners
  useEffect(() => {
    const handlers = {
      handleNewNotification: (notification) => {
        setNotifications((prev) => [notification, ...prev.slice(0, 49)]);
        setUnreadCount((prev) => prev + 1);
      },

      handleUnreadCountUpdated: ({count}) => {
        setUnreadCount(count);
      },

      handleNotificationsFetched: ({notifications: fetchedNotifications}) => {
        setNotifications(fetchedNotifications || []);
        setIsLoadingNotifications(false);
        setNotificationError(null);
      },

      handleNotificationRead: (notificationId) => {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? {...n, isRead: true, readAt: new Date().toISOString()}
              : n
          )
        );
      },

      handleAllNotificationsRead: () => {
        setNotifications((prev) =>
          prev.map((n) => ({
            ...n,
            isRead: true,
            readAt: new Date().toISOString(),
          }))
        );
        setUnreadCount(0);
      },

      handleNotificationDeleted: (notificationId) => {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      },

      handleToastNotification: ({message, type, title, priority, onClick}) => {
        const toastId = Date.now();
        const newToast = {
          id: toastId,
          title: title || "B2BBillings",
          message,
          type: type || "info",
          priority,
          show: true,
          onClick,
        };

        setToastNotifications((prev) => [...prev, newToast]);

        // Auto-remove toast
        const delay = priority === "critical" ? 10000 : 5000;
        setTimeout(() => {
          setToastNotifications((prev) => prev.filter((t) => t.id !== toastId));
        }, delay);
      },
    };

    // Add listeners
    const unsubscribers = [
      notificationService.on(
        "new_notification",
        handlers.handleNewNotification
      ),
      notificationService.on(
        "unread_count_updated",
        handlers.handleUnreadCountUpdated
      ),
      notificationService.on(
        "notifications_fetched",
        handlers.handleNotificationsFetched
      ),
      notificationService.on(
        "notification_read",
        handlers.handleNotificationRead
      ),
      notificationService.on(
        "all_notifications_read",
        handlers.handleAllNotificationsRead
      ),
      notificationService.on(
        "notification_deleted",
        handlers.handleNotificationDeleted
      ),
      notificationService.on("show_toast", handlers.handleToastNotification),
      notificationService.on(
        "show_notification_toast",
        handlers.handleToastNotification
      ),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      });
    };
  }, []);

  // Initial notification fetch
  useEffect(() => {
    const loadInitialNotifications = async () => {
      if (!effectiveCompanyId) return;

      setIsLoadingNotifications(true);
      setNotificationError(null);

      try {
        // Get cached notifications first
        const cachedNotifications = notificationService.getNotifications();
        const cachedUnreadCount = notificationService.getUnreadCount();

        if (cachedNotifications.length > 0) {
          setNotifications(cachedNotifications);
          setUnreadCount(cachedUnreadCount);
        }

        // Fetch fresh notifications
        const result = await notificationService.fetchNotifications({
          limit: 20,
          companyId: effectiveCompanyId,
        });

        if (!result.success) {
          setNotificationError(result.error);
        }

        // Fetch unread count
        await notificationService.fetchUnreadCount(effectiveCompanyId);
      } catch (error) {
        console.error("Error loading notifications:", error);
        setNotificationError("Failed to load notifications");
      } finally {
        setIsLoadingNotifications(false);
      }
    };

    loadInitialNotifications();
  }, [effectiveCompanyId]);

  // Notification action handlers
  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await notificationService.markAsRead(notification.id);
      }
      await notificationService.markAsClicked(notification.id);

      if (notification.actionUrl) {
        navigate(notification.actionUrl);
        setShowNotifications(false);
      }
    } catch (error) {
      console.error("Error handling notification click:", error);
    }
  };

  const handleMarkAsRead = async (notificationId, event) => {
    event.stopPropagation();
    try {
      await notificationService.markAsRead(notificationId);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(effectiveCompanyId);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const handleDeleteNotification = async (notificationId, event) => {
    event.stopPropagation();
    try {
      await notificationService.deleteNotification(notificationId);
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleRefreshNotifications = async () => {
    setIsLoadingNotifications(true);
    try {
      await notificationService.fetchNotifications({
        limit: 20,
        companyId: effectiveCompanyId,
      });
    } catch (error) {
      console.error("Error refreshing notifications:", error);
    }
  };

  // ===============================
  // NAVIGATION HANDLERS
  // ===============================

  // Handle company selection
  const handleCompanySelect = (company) => {
    try {
      if (!company) return;

      const newCompanyId = company.id || company._id;
      if (!newCompanyId) return;

      // Maintain current view when switching companies
      const pathParts = location.pathname.split("/");
      const currentView = pathParts[pathParts.length - 1] || "daybook";

      const newPath = `/companies/${newCompanyId}/${currentView}`;
      navigate(newPath);

      if (onCompanyChange) {
        onCompanyChange(company);
      }
    } catch (error) {
      console.error("Error selecting company:", error);
    } finally {
      setShowBusinessDropdown(false);
    }
  };

  // Handle navigation to home
  const handleNavigateHome = () => {
    if (effectiveCompanyId) {
      navigate(`/companies/${effectiveCompanyId}/daybook`);
    } else if (companies.length > 0) {
      const firstCompany = companies[0];
      const companyId = firstCompany.id || firstCompany._id;
      navigate(`/companies/${companyId}/daybook`);
    } else {
      navigate("/");
    }
  };

  // Handle add new business
  const handleAddNewBusiness = () => {
    if (!isOnline) return;
    setShowCreateCompany(true);
    setShowBusinessDropdown(false);
  };

  // Handle company creation
  const handleCompanyCreated = (newCompany) => {
    try {
      if (onCompanyCreated) {
        onCompanyCreated(newCompany);
      }

      if (newCompany) {
        const newCompanyId = newCompany.id || newCompany._id;
        if (newCompanyId) {
          setTimeout(() => {
            navigate(`/companies/${newCompanyId}/daybook`);
          }, 100);
        }
      }
    } catch (error) {
      console.error("Error handling company creation:", error);
    } finally {
      setShowCreateCompany(false);
    }
  };

  // ===============================
  // USER MENU HANDLERS
  // ===============================

  // Handle admin panel access with enhanced security
  const handleAdminPanel = () => {
    const userIsAdmin = isUserAdmin();

    if (userIsAdmin) {
      setShowUserDropdown(false);
      navigate("/admin");
    } else {
      console.warn(
        "Admin access denied for user:",
        currentUser?.email || "unknown"
      );
      setToastNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          title: "Access Denied",
          message: "Administrator privileges required to access this feature.",
          type: "error",
          show: true,
        },
      ]);
    }
  };

  // Handle logout
  const handleLogout = () => {
    try {
      setShowUserDropdown(false);
      setShowNotifications(false);
      setShowBusinessDropdown(false);

      if (onLogout && typeof onLogout === "function") {
        onLogout();
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        window.location.href = "/auth";
      }
    } catch (error) {
      console.error("Error during logout:", error);
      localStorage.clear();
      window.location.href = "/auth";
    }
  };

  // Handle profile actions
  const handleProfileAction = (action) => {
    setShowUserDropdown(false);

    switch (action) {
      case "profile":
        // TODO: Navigate to profile page
        break;
      case "settings":
        if (effectiveCompanyId) {
          navigate(`/companies/${effectiveCompanyId}/settings`);
        }
        break;
      case "activity":
        // TODO: Navigate to activity log
        break;
      case "admin":
        handleAdminPanel();
        break;
      case "logout":
        handleLogout();
        break;
      default:
        break;
    }
  };

  // Remove toast notification
  const removeToast = (toastId) => {
    setToastNotifications((prev) => prev.filter((t) => t.id !== toastId));
  };

  // ===============================
  // CLICK OUTSIDE DETECTION
  // ===============================

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        showNotifications &&
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }

      if (
        showUserDropdown &&
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target)
      ) {
        setShowUserDropdown(false);
      }

      if (
        showBusinessDropdown &&
        businessDropdownRef.current &&
        !businessDropdownRef.current.contains(event.target)
      ) {
        setShowBusinessDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications, showUserDropdown, showBusinessDropdown]);

  // ===============================
  // RENDER HELPERS
  // ===============================

  // Render company selector
  const renderCompanySelector = () => {
    if (isLoadingCompanies) {
      return (
        <div className="d-flex align-items-center">
          <div className="business-avatar bg-secondary d-flex align-items-center justify-content-center">
            <Spinner animation="border" size="sm" variant="light" />
          </div>
          <div className="business-name-container ms-2 d-none d-md-flex flex-column">
            <div className="business-name text-muted">Loading...</div>
            <div className="add-business">Loading businesses...</div>
          </div>
        </div>
      );
    }

    if (!currentCompany) {
      return (
        <div className="d-flex align-items-center">
          <div className="business-avatar bg-secondary d-flex align-items-center justify-content-center">
            <FontAwesomeIcon icon={faBuilding} className="text-white" />
          </div>
          <div className="business-name-container ms-2 d-none d-md-flex flex-column">
            <div className="business-name">Select Business</div>
            <div className="add-business">
              <FontAwesomeIcon icon={faPlus} className="me-1" size="xs" />
              Choose or Add Business
            </div>
          </div>
        </div>
      );
    }

    const companyName =
      currentCompany.businessName || currentCompany.name || "Business";
    const companyInitials = generateInitials(companyName);
    const companyIndex = companies.findIndex(
      (c) => (c.id || c._id) === (currentCompany.id || currentCompany._id)
    );
    const companyColor = getCompanyColor(companyIndex);

    return (
      <div className="d-flex align-items-center">
        <div
          className="business-avatar"
          style={{backgroundColor: companyColor}}
        >
          {companyInitials}
        </div>
        <div className="business-name-container ms-2 d-none d-md-flex flex-column">
          <div className="business-name" title={companyName}>
            {companyName.length > 20
              ? `${companyName.substring(0, 20)}...`
              : companyName}
          </div>
          <div className="add-business">
            <FontAwesomeIcon icon={faBuilding} className="me-1" size="xs" />
            Switch Business
          </div>
        </div>
      </div>
    );
  };

  // Render notifications dropdown
  const renderNotificationsDropdown = () => {
    if (isLoadingNotifications) {
      return (
        <div className="px-3 py-4 text-center">
          <Spinner animation="border" size="sm" className="me-2" />
          <span className="small text-muted">Loading notifications...</span>
        </div>
      );
    }

    if (notificationError) {
      return (
        <div className="px-3 py-2">
          <Alert variant="danger" className="mb-0 py-2 small">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
            {notificationError}
          </Alert>
          <div className="text-center mt-2">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleRefreshNotifications}
            >
              <FontAwesomeIcon icon={faSync} className="me-1" />
              Retry
            </Button>
          </div>
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="px-3 py-4 text-center text-muted">
          <FontAwesomeIcon
            icon={faBellSlash}
            className="mb-2 text-muted"
            size="2x"
          />
          <div className="small">No notifications</div>
          <div className="small text-muted">
            All caught up with your business!
          </div>
        </div>
      );
    }

    return (
      <>
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`dropdown-item notification-item d-flex align-items-start p-3 ${
              !notification.isRead ? "unread" : ""
            }`}
            onClick={() => handleNotificationClick(notification)}
            style={{cursor: "pointer"}}
          >
            <div className="notification-icon me-3 flex-shrink-0">
              <div
                className={`icon-circle ${
                  !notification.isRead ? "bg-primary" : "bg-secondary"
                }`}
              >
                <span role="img" aria-label="notification">
                  {notificationService.getNotificationIcon(notification.type)}
                </span>
              </div>
            </div>
            <div className="notification-content flex-grow-1">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div
                    className={`notification-title ${
                      !notification.isRead ? "fw-bold" : ""
                    }`}
                  >
                    {notification.title}
                  </div>
                  <div className="notification-message small text-muted">
                    {notification.message}
                  </div>
                  <div className="notification-time small text-muted">
                    {notificationService.formatNotificationTime(
                      notification.createdAt
                    )}
                  </div>
                </div>
                <div className="notification-actions d-flex">
                  {!notification.isRead && (
                    <Button
                      variant="link"
                      size="sm"
                      className="p-1 text-success"
                      onClick={(e) => handleMarkAsRead(notification.id, e)}
                      title="Mark as read"
                    >
                      <FontAwesomeIcon icon={faEye} size="xs" />
                    </Button>
                  )}
                  <Button
                    variant="link"
                    size="sm"
                    className="p-1 text-danger"
                    onClick={(e) =>
                      handleDeleteNotification(notification.id, e)
                    }
                    title="Delete notification"
                  >
                    <FontAwesomeIcon icon={faTrash} size="xs" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </>
    );
  };

  // ✅ CHECK IF ADMIN BUTTON SHOULD BE SHOWN
  const shouldShowAdminButton = isUserAdmin();

  // ===============================
  // MAIN RENDER
  // ===============================

  return (
    <>
      <BootstrapNavbar
        fixed="top"
        expand="lg"
        bg="white"
        variant="light"
        className="shadow-sm custom-navbar"
      >
        <Container fluid className="px-3">
          <div className="d-flex align-items-center w-100">
            {/* Left section - Logo and sidebar toggle */}
            <div className="d-flex align-items-center">
              <Button
                variant="link"
                className="p-0 me-2 sidebar-toggle"
                onClick={toggleSidebar}
                title="Toggle Sidebar"
              >
                <FontAwesomeIcon icon={faBars} />
              </Button>

              <BootstrapNavbar.Brand
                className="d-flex align-items-center me-2"
                onClick={handleNavigateHome}
                style={{cursor: "pointer"}}
                title="Go to Dashboard"
              >
                <img
                  src={B2B_LOGO}
                  alt="B2BBillings Logo"
                  width="32"
                  height="32"
                  className="d-inline-block align-top me-2 brand-logo"
                />
                <div className="brand-text-container">
                  <span className="brand-text">B2BBillings</span>
                  <small className="brand-tagline d-none d-lg-block">
                    Business Billing Solutions
                  </small>
                </div>
              </BootstrapNavbar.Brand>

              <div className="d-none d-lg-flex align-items-center text-muted">
                <FontAwesomeIcon
                  icon={faFileInvoice}
                  className="me-2"
                  size="sm"
                />
                <span className="me-2">/</span>
                <span className="current-page-name">{getCurrentView()}</span>
              </div>
            </div>

            {/* Center section - Company Selector */}
            <div className="mx-auto d-flex align-items-center">
              <Dropdown
                show={showBusinessDropdown}
                onToggle={setShowBusinessDropdown}
                ref={businessDropdownRef}
                className="business-selector"
              >
                <Dropdown.Toggle
                  as="div"
                  className="business-dropdown-toggle d-flex align-items-center"
                  style={{cursor: "pointer"}}
                  title="Switch Business"
                >
                  {renderCompanySelector()}
                </Dropdown.Toggle>

                <Dropdown.Menu
                  className="business-dropdown-menu"
                  align="center"
                >
                  <div className="dropdown-header d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">Switch Business</h6>
                    <div className="d-flex align-items-center">
                      <FontAwesomeIcon
                        icon={isOnline ? faWifi : faTimes}
                        className={`me-2 ${
                          isOnline ? "text-success" : "text-danger"
                        }`}
                        title={isOnline ? "Online" : "Offline"}
                      />
                      <small className="text-muted">{getCurrentView()}</small>
                    </div>
                  </div>

                  {!isOnline && (
                    <div className="px-3 py-2">
                      <Alert variant="warning" className="mb-0 py-1 small">
                        <FontAwesomeIcon icon={faTimes} className="me-1" />
                        You're offline. Business data may be outdated.
                      </Alert>
                    </div>
                  )}

                  {isLoadingCompanies ? (
                    <div className="px-3 py-2 text-center">
                      <Spinner animation="border" size="sm" className="me-2" />
                      <span className="small text-muted">
                        Loading businesses...
                      </span>
                    </div>
                  ) : (
                    <>
                      {companies && companies.length > 0 ? (
                        companies.map((company, index) => {
                          const companyName =
                            company.businessName ||
                            company.name ||
                            "Unnamed Business";
                          const companyId = company.id || company._id;
                          const isCurrentCompany =
                            companyId === effectiveCompanyId ||
                            (currentCompany &&
                              companyId ===
                                (currentCompany.id || currentCompany._id));

                          return (
                            <Dropdown.Item
                              key={companyId}
                              className={`d-flex align-items-center ${
                                isCurrentCompany ? "current-company" : ""
                              }`}
                              onClick={() => handleCompanySelect(company)}
                            >
                              <div
                                className="business-dropdown-avatar me-2"
                                style={{
                                  backgroundColor: getCompanyColor(index),
                                }}
                              >
                                {generateInitials(companyName)}
                              </div>
                              <div className="flex-grow-1">
                                <div className="business-dropdown-name">
                                  {companyName}
                                </div>
                                {(company.city || company.state) && (
                                  <small className="text-muted">
                                    {[company.city, company.state]
                                      .filter(Boolean)
                                      .join(", ")}
                                  </small>
                                )}
                                {company.email && (
                                  <small className="text-muted d-block">
                                    {company.email}
                                  </small>
                                )}
                              </div>
                              {isCurrentCompany && (
                                <FontAwesomeIcon
                                  icon={faCheck}
                                  className="text-success ms-2"
                                />
                              )}
                            </Dropdown.Item>
                          );
                        })
                      ) : (
                        <div className="px-3 py-2 text-center text-muted small">
                          {isOnline
                            ? "No businesses found"
                            : "No businesses available offline"}
                        </div>
                      )}

                      <Dropdown.Divider />
                      <Dropdown.Item
                        onClick={handleAddNewBusiness}
                        disabled={!isOnline}
                        title={
                          !isOnline
                            ? "Available when online"
                            : "Create a new business"
                        }
                      >
                        <FontAwesomeIcon icon={faPlus} className="me-2" />
                        Add New Business
                      </Dropdown.Item>
                    </>
                  )}
                </Dropdown.Menu>
              </Dropdown>
            </div>

            {/* Right section - Notifications and profile */}
            <div className="ms-auto d-flex align-items-center navbar-right">
              {/* ✅ ADMIN PANEL - ONLY SHOWN FOR ACTUAL ADMINS */}
              {shouldShowAdminButton && (
                <Nav.Item className="me-2">
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={handleAdminPanel}
                    className="admin-panel-btn d-flex align-items-center"
                    title="Admin Panel - Administrator Access"
                  >
                    <FontAwesomeIcon icon={faUserShield} className="me-2" />
                    <span className="d-none d-md-inline">Admin Panel</span>
                  </Button>
                </Nav.Item>
              )}

              {/* Network status (mobile) */}
              <Nav.Item className="d-lg-none me-2">
                <FontAwesomeIcon
                  icon={isOnline ? faWifi : faTimes}
                  className={isOnline ? "text-success" : "text-danger"}
                  title={isOnline ? "Online" : "Offline"}
                />
              </Nav.Item>

              {/* Help icon */}
              <Nav.Item className="d-none d-lg-block">
                <Nav.Link
                  href="#"
                  className="icon-link"
                  title="Help & Support"
                  onClick={(e) => e.preventDefault()}
                >
                  <FontAwesomeIcon icon={faQuestionCircle} />
                </Nav.Link>
              </Nav.Item>

              {/* Notifications dropdown */}
              <Dropdown
                show={showNotifications}
                onToggle={setShowNotifications}
                ref={notificationRef}
                className="position-relative me-3"
              >
                <Dropdown.Toggle
                  as="div"
                  className="icon-link"
                  style={{cursor: "pointer"}}
                  title="Notifications"
                >
                  <FontAwesomeIcon icon={faBell} />
                  {unreadCount > 0 && (
                    <span className="notification-badge">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Dropdown.Toggle>

                <Dropdown.Menu className="notifications-dropdown" align="end">
                  <div className="dropdown-header d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <span>Business Notifications</span>
                      {unreadCount > 0 && (
                        <span className="badge bg-primary ms-2">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="d-flex align-items-center">
                      <Button
                        variant="link"
                        size="sm"
                        className="p-1 text-muted"
                        onClick={handleRefreshNotifications}
                        title="Refresh notifications"
                        disabled={isLoadingNotifications}
                      >
                        <FontAwesomeIcon
                          icon={faSync}
                          className={isLoadingNotifications ? "fa-spin" : ""}
                        />
                      </Button>
                      {unreadCount > 0 && (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-1 text-success"
                          onClick={handleMarkAllAsRead}
                          title="Mark all as read"
                        >
                          <FontAwesomeIcon icon={faCheckCircle} />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="notification-list">
                    {renderNotificationsDropdown()}
                  </div>

                  {notifications.length > 0 && (
                    <>
                      <Dropdown.Divider />
                      <Dropdown.Item
                        className="text-center small text-gray-500"
                        onClick={(e) => e.preventDefault()}
                      >
                        View All Notifications
                      </Dropdown.Item>
                    </>
                  )}
                </Dropdown.Menu>
              </Dropdown>

              {/* User profile dropdown */}
              <Nav.Item className="user-dropdown">
                <Dropdown
                  show={showUserDropdown}
                  onToggle={(isOpen) => {
                    setShowUserDropdown(isOpen);
                    if (isOpen) {
                      setShowNotifications(false);
                      setShowBusinessDropdown(false);
                    }
                  }}
                  align="end"
                  drop="down"
                >
                  <Dropdown.Toggle
                    as="div"
                    className="d-flex align-items-center user-dropdown-toggle"
                    style={{cursor: "pointer"}}
                    title="User Menu"
                    id="user-dropdown"
                  >
                    <span className="me-2 d-none d-xl-inline user-name">
                      {getUserDisplayName()}
                    </span>
                    <Image
                      src={getUserAvatarUrl()}
                      alt="User"
                      roundedCircle
                      className="img-profile"
                      width="36"
                      height="36"
                    />
                  </Dropdown.Toggle>

                  <Dropdown.Menu
                    className="shadow-lg border-0"
                    style={{minWidth: "280px"}}
                  >
                    {/* User info header */}
                    <div className="dropdown-header bg-light">
                      <div className="d-flex align-items-center">
                        <Image
                          src={getUserAvatarUrl()}
                          alt="User"
                          roundedCircle
                          className="me-3"
                          width="48"
                          height="48"
                        />
                        <div>
                          <div className="fw-bold text-dark">
                            {getUserDisplayName()}
                          </div>
                          {currentUser?.email && (
                            <small className="text-muted">
                              {currentUser.email}
                            </small>
                          )}
                          {shouldShowAdminButton && (
                            <small className="text-danger d-block">
                              <FontAwesomeIcon
                                icon={faUserShield}
                                className="me-1"
                              />
                              Administrator
                            </small>
                          )}
                          {effectiveCompanyId && currentCompany && (
                            <small className="text-muted d-block">
                              <FontAwesomeIcon
                                icon={faBuilding}
                                className="me-1"
                              />
                              {currentCompany?.businessName ||
                                currentCompany?.name ||
                                "Business"}
                            </small>
                          )}
                        </div>
                      </div>
                    </div>

                    <Dropdown.Divider />

                    {/* ✅ ADMIN PANEL IN DROPDOWN - ONLY FOR ACTUAL ADMINS */}
                    {shouldShowAdminButton && (
                      <>
                        <Dropdown.Item
                          onClick={() => handleProfileAction("admin")}
                          className="d-flex align-items-center py-2 admin-menu-item"
                        >
                          <FontAwesomeIcon
                            icon={faUserShield}
                            className="fa-sm fa-fw me-3 text-danger"
                          />
                          <div>
                            <div className="fw-medium text-danger">
                              Admin Panel
                            </div>
                            <small className="text-muted">
                              System administration dashboard
                            </small>
                          </div>
                        </Dropdown.Item>
                        <Dropdown.Divider />
                      </>
                    )}

                    {/* Profile actions */}
                    <Dropdown.Item
                      onClick={() => handleProfileAction("profile")}
                      className="d-flex align-items-center py-2"
                    >
                      <FontAwesomeIcon
                        icon={faUser}
                        className="fa-sm fa-fw me-3 text-primary"
                      />
                      <div>
                        <div className="fw-medium">My Profile</div>
                        <small className="text-muted">
                          View and edit profile
                        </small>
                      </div>
                    </Dropdown.Item>

                    <Dropdown.Item
                      onClick={() => handleProfileAction("settings")}
                      className="d-flex align-items-center py-2"
                    >
                      <FontAwesomeIcon
                        icon={faCog}
                        className="fa-sm fa-fw me-3 text-secondary"
                      />
                      <div>
                        <div className="fw-medium">Settings</div>
                        <small className="text-muted">
                          Business preferences
                        </small>
                      </div>
                    </Dropdown.Item>

                    <Dropdown.Item
                      onClick={() => handleProfileAction("activity")}
                      className="d-flex align-items-center py-2"
                    >
                      <FontAwesomeIcon
                        icon={faClipboardList}
                        className="fa-sm fa-fw me-3 text-info"
                      />
                      <div>
                        <div className="fw-medium">Activity Log</div>
                        <small className="text-muted">
                          View recent business activity
                        </small>
                      </div>
                    </Dropdown.Item>

                    <Dropdown.Divider />

                    {/* Logout action */}
                    <Dropdown.Item
                      onClick={() => handleProfileAction("logout")}
                      className="d-flex align-items-center py-2 text-danger"
                    >
                      <FontAwesomeIcon
                        icon={faSignOutAlt}
                        className="fa-sm fa-fw me-3"
                      />
                      <div>
                        <div className="fw-medium">Sign Out</div>
                        <small>Sign out of your account</small>
                      </div>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Nav.Item>
            </div>
          </div>
        </Container>
      </BootstrapNavbar>

      {/* Create Company Modal */}
      <CreateCompany
        show={showCreateCompany}
        onHide={() => setShowCreateCompany(false)}
        onCompanyCreated={handleCompanyCreated}
        isOnline={isOnline}
        currentUser={currentUser}
      />

      {/* Toast Notifications */}
      <ToastContainer
        position="top-end"
        className="position-fixed"
        style={{top: "80px", right: "20px", zIndex: 9999}}
      >
        {toastNotifications.map((toast) => (
          <Toast
            key={toast.id}
            show={toast.show}
            onClose={() => removeToast(toast.id)}
            delay={toast.priority === "critical" ? 10000 : 5000}
            autohide={toast.priority !== "critical"}
            className={`mb-2 toast-${toast.type}`}
          >
            <Toast.Header>
              <img
                src={B2B_LOGO}
                alt="B2BBillings"
                width="20"
                height="20"
                className="me-2"
              />
              <span className="me-auto fw-bold">
                {toast.title || "B2BBillings"}
              </span>
              <small className="text-muted">now</small>
            </Toast.Header>
            <Toast.Body
              onClick={toast.onClick}
              style={toast.onClick ? {cursor: "pointer"} : {}}
            >
              {toast.message}
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </>
  );
}

// PropTypes for type safety
Navbar.propTypes = {
  onLogout: PropTypes.func,
  toggleSidebar: PropTypes.func,
  currentCompany: PropTypes.object,
  companies: PropTypes.array,
  onCompanyChange: PropTypes.func,
  onCompanyCreated: PropTypes.func,
  onCompanyUpdated: PropTypes.func,
  currentUser: PropTypes.object,
  isLoadingCompanies: PropTypes.bool,
  isOnline: PropTypes.bool,
  companyId: PropTypes.string,
};

export default Navbar;
