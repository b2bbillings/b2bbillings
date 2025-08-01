import {useState, useEffect, useRef} from "react";
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
  faChevronDown,
  faEllipsisV,
  faUserShield,
  faTrash,
  faCheckCircle,
  faEye,
  faBellSlash,
} from "@fortawesome/free-solid-svg-icons";
import {useParams, useNavigate, useLocation} from "react-router-dom";
import CreateCompany from "../components/Company/CreateCompany";
import notificationService from "../services/notificationService";
import "./Navbar.css";

function Navbar({
  onLogout,
  toggleSidebar,
  currentCompany,
  companies,
  onCompanyChange,
  onCompanyCreated,
  onCompanyUpdated,
  currentUser,
  isLoadingCompanies,
  isOnline,
  companyId,
}) {
  // React Router hooks
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

  // ✅ NEW: Notification service state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState(null);

  // ✅ NEW: Toast notification state
  const [toastNotifications, setToastNotifications] = useState([]);

  // Refs for click outside detection
  const notificationRef = useRef(null);
  const userDropdownRef = useRef(null);
  const businessDropdownRef = useRef(null);

  // Temporary logo as base64 SVG - shop/cart icon with gradient
  const tempLogo =
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM1ZTYwY2UiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM4MDYwZmYiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48Y2lyY2xlIGN4PSIyNTYiIGN5PSIyNTYiIHI9IjI1MCIgZmlsbD0id2hpdGUiLz48cGF0aCBmaWxsPSJ1cmwoI2EpIiBkPSJNMTgwIDgwQzE4MCA1Ny45MDkgMTk3LjkwOSA0MCAyMjAgNDBIMjkyQzMxNC4wOTEgNDAgMzMyIDU3LjkwOSAzMzIgODBWOTZIMzgwLjY0TDQzMiAyMjRMNDMyIDM3Nkg4MFYyMjRMMTMxLjM2IDk2SDE4MFY4MFpNODAgMzc2VjQzMkgxMzZWNDAwSDE4OFY0MzJIMzI0VjQwMEgzNzZWNDMySDQzMlYzNzZIODBaIi8+PGNpcmNsZSBjeD0iMTYwIiBjeT0iMzA0IiByPSIzMiIgZmlsbD0id2hpdGUiLz48Y2lyY2xlIGN4PSIzNTIiIGN5PSIzMDQiIHI9IjMyIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==";

  // ===============================
  // 🔔 NOTIFICATION SERVICE INTEGRATION
  // ===============================

  // ✅ Setup notification service listeners
  useEffect(() => {
    const handleNewNotification = (notification) => {
      console.log("📢 New notification in Navbar:", notification);
      setNotifications((prev) => [notification, ...prev.slice(0, 49)]); // Keep max 50
      setUnreadCount((prev) => prev + 1);
    };

    const handleUnreadCountUpdated = ({count}) => {
      console.log("🔔 Unread count updated:", count);
      setUnreadCount(count);
    };

    const handleNotificationsFetched = ({
      notifications: fetchedNotifications,
    }) => {
      console.log("📥 Notifications fetched:", fetchedNotifications);
      setNotifications(fetchedNotifications || []);
      setIsLoadingNotifications(false);
      setNotificationError(null);
    };

    const handleNotificationRead = (notificationId) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? {...n, isRead: true, readAt: new Date().toISOString()}
            : n
        )
      );
    };

    const handleAllNotificationsRead = () => {
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    };

    const handleNotificationDeleted = (notificationId) => {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    };

    const handleToastNotification = ({message, type}) => {
      const toastId = Date.now();
      const newToast = {
        id: toastId,
        message,
        type,
        show: true,
      };

      setToastNotifications((prev) => [...prev, newToast]);

      // Auto-remove toast after 5 seconds
      setTimeout(() => {
        setToastNotifications((prev) => prev.filter((t) => t.id !== toastId));
      }, 5000);
    };

    const handleNotificationToast = (toastData) => {
      const toastId = Date.now();
      const newToast = {
        id: toastId,
        title: toastData.title,
        message: toastData.message,
        type: toastData.type || "info",
        priority: toastData.priority,
        show: true,
        onClick: toastData.onClick,
      };

      setToastNotifications((prev) => [...prev, newToast]);

      // Auto-remove toast after delay based on priority
      const delay = toastData.priority === "critical" ? 10000 : 5000;
      setTimeout(() => {
        setToastNotifications((prev) => prev.filter((t) => t.id !== toastId));
      }, delay);
    };

    // Add listeners
    const unsubscribers = [
      notificationService.on("new_notification", handleNewNotification),
      notificationService.on("unread_count_updated", handleUnreadCountUpdated),
      notificationService.on(
        "notifications_fetched",
        handleNotificationsFetched
      ),
      notificationService.on("notification_read", handleNotificationRead),
      notificationService.on(
        "all_notifications_read",
        handleAllNotificationsRead
      ),
      notificationService.on("notification_deleted", handleNotificationDeleted),
      notificationService.on("show_toast", handleToastNotification),
      notificationService.on(
        "show_notification_toast",
        handleNotificationToast
      ),
    ];

    return () => {
      // Cleanup listeners
      unsubscribers.forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      });
    };
  }, []);

  // ✅ Initial notification fetch
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
        console.error("❌ Error loading notifications:", error);
        setNotificationError("Failed to load notifications");
      } finally {
        setIsLoadingNotifications(false);
      }
    };

    loadInitialNotifications();
  }, [effectiveCompanyId]);

  // ✅ Handle notification actions
  const handleNotificationClick = async (notification) => {
    try {
      // Mark as read if not already read
      if (!notification.isRead) {
        await notificationService.markAsRead(notification.id);
      }

      // Mark as clicked for analytics
      await notificationService.markAsClicked(notification.id);

      // Navigate to action URL if provided
      if (notification.actionUrl) {
        navigate(notification.actionUrl);
        setShowNotifications(false);
      }
    } catch (error) {
      console.error("❌ Error handling notification click:", error);
    }
  };

  const handleMarkAsRead = async (notificationId, event) => {
    event.stopPropagation();
    try {
      await notificationService.markAsRead(notificationId);
    } catch (error) {
      console.error("❌ Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(effectiveCompanyId);
    } catch (error) {
      console.error("❌ Error marking all notifications as read:", error);
    }
  };

  const handleDeleteNotification = async (notificationId, event) => {
    event.stopPropagation();
    try {
      await notificationService.deleteNotification(notificationId);
    } catch (error) {
      console.error("❌ Error deleting notification:", error);
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
      console.error("❌ Error refreshing notifications:", error);
    }
  };

  // ✅ Remove toast notification
  const removeToast = (toastId) => {
    setToastNotifications((prev) => prev.filter((t) => t.id !== toastId));
  };

  // Generate initials from company name
  const generateInitials = (name) => {
    if (!name) return "NA";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate random color for company
  const getRandomColor = () => {
    const colors = [
      "#ff9e43",
      "#4e73df",
      "#1cc88a",
      "#e74a3b",
      "#f39c12",
      "#9b59b6",
      "#34495e",
      "#17a2b8",
      "#6f42c1",
      "#e83e8c",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Handle clicks outside of dropdowns
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

  // Get current view from URL path for context
  const getCurrentView = () => {
    const pathParts = location.pathname.split("/");
    const lastPart = pathParts[pathParts.length - 1];

    const viewDisplayNames = {
      dashboard: "Dashboard",
      daybook: "Day Book",
      transactions: "Transactions",
      "cash-bank": "Cash & Bank",
      parties: "Parties",
      sales: "Sales",
      invoices: "Invoices",
      "create-invoice": "Create Invoice",
      "credit-notes": "Credit Notes",
      "sales-orders": "Sales Orders",
      "create-sales-order": "Create Sales Order",
      purchases: "Purchases",
      "purchase-bills": "Purchase Bills",
      "create-purchase": "Create Purchase",
      "purchase-orders": "Purchase Orders",
      "create-purchase-order": "Create Purchase Order",
      inventory: "Inventory",
      products: "Products",
      "low-stock": "Low Stock",
      "stock-movement": "Stock Movement",
      "bank-accounts": "Bank Accounts",
      "cash-accounts": "Cash Accounts",
      "bank-transactions": "Bank Transactions",
      "bank-reconciliation": "Bank Reconciliation",
      "cash-flow": "Cash Flow",
      staff: "Staff",
      insights: "Insights",
      reports: "Reports",
      settings: "Settings",
      chats: "Chats",
    };

    return viewDisplayNames[lastPart] || "Dashboard";
  };

  // Handle company selection with navigation
  const handleCompanySelect = (company) => {
    try {
      if (!company) {
        return;
      }

      const newCompanyId = company.id || company._id;
      if (!newCompanyId) {
        return;
      }

      // Determine current view to maintain context when switching companies
      const pathParts = location.pathname.split("/");
      const currentView = pathParts[pathParts.length - 1] || "dashboard";

      // Navigate to the same view but with new company
      const newPath = `/companies/${newCompanyId}/${currentView}`;
      navigate(newPath);

      // Notify parent component
      if (onCompanyChange) {
        onCompanyChange(company);
      }
    } catch (error) {
      console.error("Error selecting company:", error);
    } finally {
      setShowBusinessDropdown(false);
    }
  };

  // Handle opening create company modal
  const handleAddNewBusiness = () => {
    if (!isOnline) {
      return;
    }

    setShowCreateCompany(true);
    setShowBusinessDropdown(false);
  };

  // Handle closing create company modal
  const handleCloseCreateCompany = () => {
    setShowCreateCompany(false);
  };

  // Handle company creation success
  const handleCompanyCreated = (newCompany) => {
    try {
      // Notify parent component first
      if (onCompanyCreated) {
        onCompanyCreated(newCompany);
      }

      // Auto-navigate to new company's dashboard
      if (newCompany) {
        const newCompanyId = newCompany.id || newCompany._id;
        if (newCompanyId) {
          const newPath = `/companies/${newCompanyId}/dashboard`;

          // Small delay to ensure state updates are processed
          setTimeout(() => {
            navigate(newPath);
          }, 100);
        }
      }
    } catch (error) {
      console.error("Error handling company creation:", error);
    } finally {
      setShowCreateCompany(false);
    }
  };

  // Handle navigation to home
  const handleNavigateHome = () => {
    if (effectiveCompanyId) {
      navigate(`/companies/${effectiveCompanyId}/dashboard`);
    } else if (companies.length > 0) {
      const firstCompany = companies[0];
      const companyId = firstCompany.id || firstCompany._id;
      navigate(`/companies/${companyId}/dashboard`);
    } else {
      navigate("/");
    }
  };

  // Handle admin panel navigation
  const handleAdminPanel = () => {
    console.log("🚀 Navigating to admin panel");
    setShowUserDropdown(false);
    navigate("/admin");
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (currentUser?.name) {
      return currentUser.name;
    }
    if (currentUser?.email) {
      return currentUser.email.split("@")[0];
    }
    return "User";
  };

  // Get user avatar URL
  const getUserAvatarUrl = () => {
    const displayName = getUserDisplayName();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      displayName
    )}&background=5e60ce&color=fff&size=36`;
  };

  // Handle logout function
  const handleLogout = () => {
    try {
      console.log("🚪 Logout initiated");

      // Close all dropdowns first
      setShowUserDropdown(false);
      setShowNotifications(false);
      setShowBusinessDropdown(false);

      // Call the logout function passed from parent
      if (onLogout && typeof onLogout === "function") {
        onLogout();
      } else {
        console.warn("⚠️ No logout function provided");
        // Fallback: Clear local storage and redirect
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("❌ Error during logout:", error);
      // Fallback logout
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  // Handle profile menu interactions with admin panel
  const handleProfileAction = (action) => {
    setShowUserDropdown(false);

    switch (action) {
      case "profile":
        console.log("Navigate to profile");
        // TODO: Navigate to profile page
        break;
      case "settings":
        console.log("Navigate to settings");
        if (effectiveCompanyId) {
          navigate(`/companies/${effectiveCompanyId}/settings`);
        }
        break;
      case "activity":
        console.log("Navigate to activity log");
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

  // Render company selector content
  const renderCompanySelector = () => {
    if (isLoadingCompanies) {
      return (
        <div className="d-flex align-items-center">
          <div className="business-avatar bg-secondary d-flex align-items-center justify-content-center">
            <Spinner animation="border" size="sm" variant="light" />
          </div>
          <div className="business-name-container ms-2 d-none d-md-flex flex-column">
            <div className="business-name text-muted">Loading...</div>
            <div className="add-business">
              <span>Loading companies...</span>
            </div>
          </div>
          <FontAwesomeIcon
            icon={faChevronDown}
            className="ms-2 text-muted"
            size="sm"
          />
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
            <div className="business-name">No Company</div>
            <div className="add-business">
              <FontAwesomeIcon icon={faPlus} className="me-1" size="xs" />
              <span>Add Company</span>
            </div>
          </div>
          <FontAwesomeIcon
            icon={faChevronDown}
            className="ms-2 text-muted"
            size="sm"
          />
        </div>
      );
    }

    // Generate company display data
    const companyName =
      currentCompany.businessName || currentCompany.name || "Company";
    const companyInitials = generateInitials(companyName);
    const companyColor = currentCompany.color || getRandomColor();

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
            <FontAwesomeIcon icon={faPlus} className="me-1" size="xs" />
            <span>Switch Company</span>
          </div>
        </div>
        <FontAwesomeIcon
          icon={faChevronDown}
          className="ms-2 text-muted"
          size="sm"
        />
      </div>
    );
  };

  // Render company validation warning if needed
  const renderCompanyValidationWarning = () => {
    if (!effectiveCompanyId || !currentCompany) return null;

    const currentCompanyId = currentCompany.id || currentCompany._id;
    if (effectiveCompanyId !== currentCompanyId) {
      return (
        <div className="company-validation-warning">
          <small className="text-warning">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
            Company mismatch detected
          </small>
        </div>
      );
    }
    return null;
  };

  // ✅ Render notifications dropdown
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
          <div className="small text-muted">You're all caught up!</div>
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
              {/* Sidebar toggle button */}
              <Button
                variant="link"
                className="p-0 me-2 sidebar-toggle"
                onClick={toggleSidebar}
                title="Toggle Sidebar"
              >
                <FontAwesomeIcon icon={faBars} />
              </Button>

              {/* Logo and brand name */}
              <BootstrapNavbar.Brand
                className="d-flex align-items-center me-2"
                onClick={handleNavigateHome}
                style={{cursor: "pointer"}}
                title="Go to Dashboard"
              >
                <img
                  src={tempLogo}
                  alt="ShopManager Logo"
                  width="30"
                  height="30"
                  className="d-inline-block align-top me-2"
                />
                <span className="brand-text">ShopManager</span>
              </BootstrapNavbar.Brand>

              {/* Current page breadcrumb (visible on larger screens) */}
              <div className="d-none d-lg-flex align-items-center text-muted">
                <FontAwesomeIcon icon={faHome} className="me-2" size="sm" />
                <span className="me-2">/</span>
                <span className="current-page-name">{getCurrentView()}</span>
              </div>
            </div>

            {/* Center section - Company Selector */}
            <div className="mx-auto d-flex align-items-center">
              <div
                ref={businessDropdownRef}
                className="business-selector d-flex align-items-center position-relative"
              >
                <div
                  className="d-flex align-items-center business-dropdown-toggle"
                  onClick={() => setShowBusinessDropdown(!showBusinessDropdown)}
                  style={{cursor: "pointer"}}
                  title="Switch Company"
                >
                  {renderCompanySelector()}
                </div>

                {showBusinessDropdown && (
                  <div className="dropdown-menu business-dropdown-menu shadow animated--grow-in show">
                    <div className="d-flex justify-content-between align-items-center px-3 py-2">
                      <h6 className="mb-0">Switch Company</h6>
                      {/* Network status indicator */}
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
                          You're offline. Company data may be outdated.
                        </Alert>
                      </div>
                    )}

                    {isLoadingCompanies ? (
                      <div className="px-3 py-2 text-center">
                        <Spinner
                          animation="border"
                          size="sm"
                          className="me-2"
                        />
                        <span className="small text-muted">
                          Loading companies...
                        </span>
                      </div>
                    ) : (
                      <>
                        {companies && companies.length > 0 ? (
                          companies.map((company) => {
                            const companyName =
                              company.businessName ||
                              company.name ||
                              "Unnamed Company";
                            const companyId = company.id || company._id;
                            const isCurrentCompany =
                              companyId === effectiveCompanyId ||
                              (currentCompany &&
                                companyId ===
                                  (currentCompany.id || currentCompany._id));

                            return (
                              <a
                                key={companyId}
                                className={`dropdown-item d-flex align-items-center ${
                                  isCurrentCompany ? "active" : ""
                                }`}
                                onClick={() => handleCompanySelect(company)}
                                style={{cursor: "pointer"}}
                              >
                                <div
                                  className="business-dropdown-avatar me-2"
                                  style={{
                                    backgroundColor:
                                      company.color || getRandomColor(),
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
                              </a>
                            );
                          })
                        ) : (
                          <div className="px-3 py-2 text-center text-muted small">
                            {isOnline
                              ? "No companies found"
                              : "No companies available offline"}
                          </div>
                        )}

                        <div className="dropdown-divider"></div>
                        <a
                          className="dropdown-item"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handleAddNewBusiness();
                          }}
                          style={{
                            opacity: isOnline ? 1 : 0.5,
                            cursor: isOnline ? "pointer" : "not-allowed",
                          }}
                          title={
                            !isOnline
                              ? "Available when online"
                              : "Create a new company"
                          }
                        >
                          <FontAwesomeIcon icon={faPlus} className="me-2" />
                          Add New Company
                        </a>
                        <a
                          className="dropdown-item"
                          href="#"
                          title="Manage companies (Coming soon)"
                          onClick={(e) => e.preventDefault()}
                        >
                          <FontAwesomeIcon icon={faBuilding} className="me-2" />
                          Manage Companies
                        </a>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Company validation warning */}
              {renderCompanyValidationWarning()}
            </div>

            {/* Right section - Admin panel button, Notifications and profile */}
            <div className="ms-auto d-flex align-items-center navbar-right">
              {/* Admin Panel Button for Development */}
              <Nav.Item className="me-2">
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={handleAdminPanel}
                  className="admin-panel-btn d-flex align-items-center"
                  title="Admin Panel (Development)"
                >
                  <FontAwesomeIcon icon={faUserShield} className="me-2" />
                  <span className="d-none d-md-inline">Admin</span>
                </Button>
              </Nav.Item>

              {/* Network status icon (visible on smaller screens) */}
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

              {/* ✅ Updated Notifications dropdown */}
              <Nav.Item
                className="position-relative me-3"
                ref={notificationRef}
              >
                <div
                  className="icon-link"
                  role="button"
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowUserDropdown(false);
                    setShowBusinessDropdown(false);
                  }}
                  title="Notifications"
                  style={{cursor: "pointer"}}
                >
                  <FontAwesomeIcon icon={faBell} />
                  {unreadCount > 0 && (
                    <span className="notification-badge">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>

                {showNotifications && (
                  <div className="dropdown-menu dropdown-menu-end shadow animated--grow-in show notifications-dropdown">
                    <div className="dropdown-header d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        <span>Notifications</span>
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
                        <div className="dropdown-divider"></div>
                        <a
                          className="dropdown-item text-center small text-gray-500"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            // TODO: Navigate to full notifications page
                          }}
                        >
                          View All Notifications
                        </a>
                      </>
                    )}
                  </div>
                )}
              </Nav.Item>

              {/* User profile dropdown with admin panel option */}
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
                          {effectiveCompanyId && currentCompany && (
                            <small className="text-muted d-block">
                              <FontAwesomeIcon
                                icon={faBuilding}
                                className="me-1"
                              />
                              {currentCompany?.businessName ||
                                currentCompany?.name ||
                                "Company"}
                            </small>
                          )}
                        </div>
                      </div>
                    </div>

                    <Dropdown.Divider />

                    {/* Admin Panel Option - First in the list */}
                    <Dropdown.Item
                      onClick={() => handleProfileAction("admin")}
                      className="d-flex align-items-center py-2 admin-menu-item"
                    >
                      <FontAwesomeIcon
                        icon={faUserShield}
                        className="fa-sm fa-fw me-3 text-danger"
                      />
                      <div>
                        <div className="fw-medium text-danger">Admin Panel</div>
                        <small className="text-muted">
                          System administration (Dev)
                        </small>
                      </div>
                    </Dropdown.Item>

                    <Dropdown.Divider />

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
                          Application preferences
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
                          View recent activity
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
        onHide={handleCloseCreateCompany}
        onCompanyCreated={handleCompanyCreated}
        isOnline={isOnline}
        currentUser={currentUser}
      />

      {/* ✅ Toast Notifications */}
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
              <span className="me-auto fw-bold">
                {toast.title || "Notification"}
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

      {/* CSS Styles */}
      <style>
        {`
          /* ✅ Updated notification styles */
          .notification-item {
            border: none !important;
            border-radius: 8px !important;
            margin: 2px 8px !important;
            transition: all 0.2s ease !important;
            border-left: 3px solid transparent !important;
          }

          .notification-item:hover {
            background: linear-gradient(135deg, rgba(94, 96, 206, 0.05), rgba(128, 96, 255, 0.05)) !important;
            transform: translateX(2px) !important;
          }

          .notification-item.unread {
            background: linear-gradient(135deg, rgba(94, 96, 206, 0.08), rgba(128, 96, 255, 0.08)) !important;
            border-left-color: #5e60ce !important;
          }

          .notification-icon .icon-circle {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
          }

          .notification-list {
            max-height: 400px;
            overflow-y: auto;
          }

          .notification-actions .btn {
            opacity: 0.6;
            transition: opacity 0.2s ease;
          }

          .notification-item:hover .notification-actions .btn {
            opacity: 1;
          }

          .toast-info {
            border-left: 4px solid #17a2b8;
          }

          .toast-success {
            border-left: 4px solid #28a745;
          }

          .toast-error {
            border-left: 4px solid #dc3545;
          }

          .toast-warning {
            border-left: 4px solid #ffc107;
          }

          .toast-chat {
            border-left: 4px solid #6f42c1;
          }

          .admin-panel-btn {
            border: 2px solid #dc3545 !important;
            color: #dc3545 !important;
            background: transparent !important;
            transition: all 0.2s ease;
            font-weight: 600;
            border-radius: 8px;
            padding: 6px 12px;
          }

          .admin-panel-btn:hover {
            background: #dc3545 !important;
            color: white !important;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
          }

          .admin-panel-btn:focus {
            box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.25) !important;
          }

          .admin-menu-item {
            background: linear-gradient(
              135deg,
              rgba(220, 53, 69, 0.05),
              rgba(220, 53, 69, 0.1)
            );
            border-radius: 6px;
            margin: 2px 8px;
            border: 1px solid rgba(220, 53, 69, 0.1);
          }

          .admin-menu-item:hover {
            background: linear-gradient(
              135deg,
              rgba(220, 53, 69, 0.1),
              rgba(220, 53, 69, 0.15)
            );
            border-color: rgba(220, 53, 69, 0.2);
            transform: translateX(2px);
          }

          .user-dropdown-toggle {
            border: none !important;
            background: none !important;
            box-shadow: none !important;
            outline: none !important;
          }

          .user-dropdown-toggle:hover {
            transform: scale(1.02);
            transition: transform 0.2s ease;
          }

          .user-dropdown-toggle:focus {
            box-shadow: 0 0 0 2px rgba(94, 96, 206, 0.25) !important;
          }

          .img-profile {
            border: 2px solid #f8f9fa;
            transition: all 0.2s ease;
          }

          .img-profile:hover {
            border-color: #5e60ce;
            box-shadow: 0 2px 8px rgba(94, 96, 206, 0.3);
          }

          .dropdown-item {
            border-radius: 6px;
            margin: 2px 8px;
            transition: all 0.2s ease;
          }

          .dropdown-item:hover {
            background: linear-gradient(
              135deg,
              rgba(94, 96, 206, 0.1),
              rgba(128, 96, 255, 0.1)
            );
            transform: translateX(2px);
          }

          .dropdown-header {
            border-radius: 8px 8px 0 0;
            margin: -8px -8px 8px -8px;
            padding: 16px !important;
          }

          .notification-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            background: #dc3545;
            color: white;
            border-radius: 10px;
            padding: 2px 6px;
            font-size: 10px;
            font-weight: bold;
            min-width: 18px;
            text-align: center;
            line-height: 1;
            border: 2px solid white;
            animation: pulse 2s infinite;
          }

          @keyframes pulse {
            0% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.1);
            }
            100% {
              transform: scale(1);
            }
          }

          .icon-link {
            padding: 8px;
            border-radius: 6px;
            color: #6c757d;
            transition: all 0.2s ease;
            text-decoration: none;
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          .icon-link:hover {
            color: #5e60ce;
            background: rgba(94, 96, 206, 0.1);
            transform: translateY(-1px);
          }

          .dropdown-menu {
            border: none;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
            border-radius: 12px;
            padding: 8px;
            margin-top: 8px;
            animation: fadeInDown 0.3s ease;
          }

          @keyframes fadeInDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .business-dropdown-menu {
            min-width: 320px;
            max-height: 400px;
            overflow-y: auto;
          }

          .notifications-dropdown {
            min-width: 360px;
            max-height: 450px;
            overflow-y: auto;
          }

          .business-avatar,
          .business-dropdown-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
            flex-shrink: 0;
          }

          .business-dropdown-avatar {
            width: 28px;
            height: 28px;
            font-size: 11px;
          }

          .business-name {
            font-weight: 600;
            font-size: 14px;
            color: #333;
            line-height: 1.2;
          }

          .add-business {
            font-size: 11px;
            color: #6c757d;
            line-height: 1.2;
          }

          .business-dropdown-toggle:hover {
            background: rgba(94, 96, 206, 0.05);
            border-radius: 8px;
            padding: 4px 8px;
            margin: -4px -8px;
            transition: all 0.2s ease;
          }

          .user-name {
            font-weight: 500;
            color: #333;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          @media (max-width: 768px) {
            .business-name-container {
              display: none !important;
            }

            .user-name {
              display: none !important;
            }

            .current-page-name {
              display: none !important;
            }

            .dropdown-menu {
              min-width: 280px !important;
            }

            .admin-panel-btn span {
              display: none !important;
            }

            .admin-panel-btn {
              padding: 6px 8px !important;
            }

            .notifications-dropdown {
              min-width: 300px !important;
            }
          }
        `}
      </style>
    </>
  );
}

export default Navbar;
