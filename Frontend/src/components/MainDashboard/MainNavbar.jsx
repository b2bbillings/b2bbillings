import React, {useState, useEffect, useRef} from "react";
import {createPortal} from "react-dom";
import {
  Navbar,
  Nav,
  Button,
  Dropdown,
  Badge,
  Container,
  Form,
  InputGroup,
  Image,
  Spinner,
  Alert,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faUser,
  faBell,
  faSearch,
  faCog,
  faSignOutAlt,
  faBars,
  faTimes,
  faPlus,
  faBuilding,
  faCheck,
  faChevronDown,
  faWifi,
  faExclamationTriangle,
  faUserShield,
  faReceipt,
  faChartLine,
  faFileInvoice,
  faHandshake,
} from "@fortawesome/free-solid-svg-icons";
import {useParams, useNavigate, useLocation} from "react-router-dom";

function MainNavbar({
  currentUser = {
    name: "Atharva Sach",
    email: "atharva@company.com",
    role: "Manager",
    avatar: "AS",
  },
  currentCompany,
  companies = [],
  onNavigate,
  onLogout,
  onCompanyChange,
  onCompanyCreated,
  addToast,
  isOnline = true,
  notificationCount = 0, // ✅ HIDDEN: Set to 0 to hide notifications
  isLoadingCompanies = false,
  companyId,
}) {
  // React Router hooks
  const {companyId: urlCompanyId} = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Use companyId from props or URL
  const effectiveCompanyId = companyId || urlCompanyId;

  // State management
  const [activeLink, setActiveLink] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  // Refs for dropdown and search management
  const businessDropdownRef = useRef(null);
  const searchRef = useRef(null);

  // ✅ PRODUCTION: Main navigation links - only production-ready features
  const navLinks = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: faChartLine,
      description: "Business overview and analytics",
    },
    {
      key: "transactions",
      label: "Transactions",
      icon: faReceipt,
      description: "View all business transactions",
    },
    // {
    //   key: "partners",
    //   label: "Partners",
    //   icon: faHandshake,
    //   description: "Manage business partnerships",
    // },
    // ✅ HIDDEN: Invoicing feature (coming soon)
    // {
    //   key: "invoicing",
    //   label: "Invoicing",
    //   icon: faFileInvoice,
    //   description: "Create and manage invoices",
    // },
  ];

  // ✅ PRODUCTION: Search data - only working features
  const searchableItems = [
    // Dashboard items
    {
      type: "nav",
      title: "Dashboard",
      description: "Main dashboard overview",
      route: "dashboard",
    },
    {
      type: "nav",
      title: "Analytics",
      description: "Business analytics and insights",
      route: "dashboard",
    },

    // Transaction items
    {
      type: "nav",
      title: "Transactions",
      description: "All business transactions",
      route: "transactions",
    },
    {
      type: "action",
      title: "Add Sale",
      description: "Record new sale",
      route: "sales/add",
    },
    {
      type: "action",
      title: "Add Purchase",
      description: "Record new purchase",
      route: "purchases/add",
    },

    // Partner items
    {
      type: "nav",
      title: "Partners",
      description: "Partner management",
      route: "partners",
    },
    {
      type: "action",
      title: "Add Customer",
      description: "Add new customer",
      route: "parties/add?type=customer",
    },
    {
      type: "action",
      title: "Add Supplier",
      description: "Add new supplier",
      route: "parties/add?type=supplier",
    },
    {
      type: "action",
      title: "Customer List",
      description: "View all customers",
      route: "parties?type=customer",
    },
    {
      type: "action",
      title: "Supplier List",
      description: "View all suppliers",
      route: "parties?type=supplier",
    },

    // Settings items
    {
      type: "action",
      title: "Settings",
      description: "Application settings",
      route: "settings",
    },
    {
      type: "action",
      title: "Profile",
      description: "User profile settings",
      route: "profile",
    },
    {
      type: "action",
      title: "Company Settings",
      description: "Company configuration",
      route: "companies",
    },

    // ✅ HIDDEN: Coming soon features removed from search
    // Invoicing items (coming soon)
    // Inventory items (coming soon)
    // Financial reports (coming soon)
    // Advanced features (coming soon)
  ];

  // Create a comprehensive companies list that includes current company
  const getAllCompanies = () => {
    const companiesMap = new Map();

    // Add current company first if it exists
    if (currentCompany) {
      const currentId = currentCompany.id || currentCompany._id || "current";
      companiesMap.set(currentId, {
        ...currentCompany,
        id: currentId,
        isCurrent: true,
      });
    }

    // Add other companies from the array
    if (companies && companies.length > 0) {
      companies.forEach((company) => {
        const companyId = company.id || company._id;
        if (companyId && !companiesMap.has(companyId)) {
          companiesMap.set(companyId, {
            ...company,
            id: companyId,
            isCurrent: false,
          });
        }
      });
    }

    // If no companies at all, create a mock current company
    if (companiesMap.size === 0 && currentCompany?.name) {
      companiesMap.set("mock-current", {
        id: "mock-current",
        name: currentCompany.name,
        businessName: currentCompany.businessName || currentCompany.name,
        color: currentCompany.color || "#4f46e5",
        isCurrent: true,
        ...currentCompany,
      });
    }

    return Array.from(companiesMap.values());
  };

  // Get the effective companies list
  const effectiveCompanies = getAllCompanies();

  // Utility functions
  const generateInitials = (name) => {
    if (!name) return "BB";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserDisplayName = () => {
    if (currentUser?.name) return currentUser.name;
    if (currentUser?.email) return currentUser.email.split("@")[0];
    return "User";
  };

  const getUserInitials = () => {
    return generateInitials(getUserDisplayName());
  };

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

  // Get current view from URL path for context - only working features
  const getCurrentView = () => {
    const pathParts = location.pathname.split("/");
    const lastPart = pathParts[pathParts.length - 1];

    const viewDisplayNames = {
      dashboard: "Dashboard",
      transactions: "Transactions",
      parties: "Partners",
      partners: "Partners",
      sales: "Sales",
      purchases: "Purchases",
      settings: "Settings",
      profile: "Profile",
      companies: "Companies",
      // ✅ HIDDEN: Removed coming soon features
      // daybook: "Day Book",
      // invoicing: "Invoicing",
      // "cash-bank": "Cash & Bank",
      // invoices: "Invoices",
      // inventory: "Inventory",
      // reports: "Reports",
      // insights: "Insights",
    };

    return viewDisplayNames[lastPart] || "Dashboard";
  };

  // Get user avatar URL
  const getUserAvatarUrl = () => {
    const displayName = getUserDisplayName();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      displayName
    )}&background=4f46e5&color=fff&size=36`;
  };

  // ✅ PRODUCTION: Enhanced search functionality
  const performSearch = (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);

    // Simulate API delay for better UX
    setTimeout(() => {
      const lowerQuery = query.toLowerCase().trim();

      const results = searchableItems
        .filter(
          (item) =>
            item.title.toLowerCase().includes(lowerQuery) ||
            item.description.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 8); // Limit to 8 results

      setSearchResults(results);
      setShowSearchResults(results.length > 0);
      setIsSearching(false);
    }, 200);
  };

  // Enhanced dropdown position calculation
  const calculateDropdownPosition = () => {
    if (businessDropdownRef.current) {
      const rect = businessDropdownRef.current.getBoundingClientRect();
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;

      const newPosition = {
        top: rect.bottom + scrollY + 8,
        left: rect.left + rect.width / 2 + scrollX,
        width: rect.width,
      };

      setDropdownPosition(newPosition);
      return newPosition;
    }
    return null;
  };

  // Event handlers
  const handleNavClick = (linkKey) => {
    setActiveLink(linkKey);
    setShowMobileMenu(false);
    if (onNavigate) onNavigate(linkKey);
    // ✅ REMOVED: No toast for smooth navigation
  };

  // ✅ PRODUCTION: Enhanced search handlers
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    performSearch(query);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim() && searchResults.length > 0) {
      handleSearchResultClick(searchResults[0]);
    }
  };

  const handleSearchResultClick = (result) => {
    setSearchQuery("");
    setShowSearchResults(false);
    setSearchResults([]);

    if (onNavigate) {
      onNavigate(result.route);
    }

    // ✅ OPTIONAL: Only show toast for search navigation
    if (addToast) {
      addToast(`Navigating to ${result.title}`, "success");
    }
  };

  const handleSearchBlur = () => {
    // Delay hiding results to allow for clicks
    setTimeout(() => {
      setShowSearchResults(false);
    }, 200);
  };

  const handleSearchFocus = () => {
    if (searchQuery && searchResults.length > 0) {
      setShowSearchResults(true);
    }
  };

  // Silent company selection without navigation or messages
  const handleCompanySelect = (company) => {
    try {
      if (!company) {
        return;
      }

      const newCompanyId = company.id || company._id;
      if (!newCompanyId) {
        return;
      }

      // Close dropdown immediately
      setShowBusinessDropdown(false);

      // Notify parent component ONLY - no navigation or messages
      if (onCompanyChange) {
        onCompanyChange(company);
      }
    } catch (error) {
      // Silent error handling
    }
  };

  // Enhanced dropdown toggle with immediate position calculation
  const handleDropdownToggle = () => {
    if (!showBusinessDropdown) {
      // Calculate position BEFORE setting state
      calculateDropdownPosition();
    }

    setShowBusinessDropdown(!showBusinessDropdown);
  };

  // Handle creating new company
  const handleAddNewCompany = () => {
    if (!isOnline) {
      addToast?.("Cannot create company while offline", "warning");
      return;
    }

    setShowCreateCompany(true);
    setShowBusinessDropdown(false);

    if (onNavigate) {
      onNavigate("create-company");
    }
  };

  // Handle company creation success
  const handleCompanyCreated = (newCompany) => {
    try {
      if (onCompanyCreated) {
        onCompanyCreated(newCompany);
      }

      const companyName =
        newCompany?.businessName || newCompany?.name || "New Company";
      addToast?.(`Successfully created ${companyName}!`, "success");
    } catch (error) {
      addToast?.("Error after company creation", "error");
    } finally {
      setShowCreateCompany(false);
    }
  };

  // Handle profile actions
  const handleProfileAction = (action) => {
    switch (action) {
      case "profile":
        onNavigate?.("profile");
        break;
      case "settings":
        onNavigate?.("settings");
        break;
      case "admin":
        // ✅ HIDDEN: Admin panel for security (only show for super admin)
        if (currentUser?.role === "SuperAdmin") {
          navigate("/admin");
          addToast?.("Opening admin panel...", "info");
        } else {
          addToast?.("Admin access not available", "warning");
        }
        break;
      case "logout":
        if (onLogout) {
          addToast?.("Logging out...", "info");
          onLogout();
        }
        break;
      default:
        break;
    }
  };

  // Handle navigation to home
  const handleNavigateHome = () => {
    if (effectiveCompanyId) {
      navigate(`/companies/${effectiveCompanyId}/dashboard`);
    } else if (effectiveCompanies.length > 0) {
      const firstCompany = effectiveCompanies[0];
      const companyId = firstCompany.id || firstCompany._id;
      navigate(`/companies/${companyId}/dashboard`);
    } else {
      navigate("/");
    }
  };

  // Enhanced click outside handler for portal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showBusinessDropdown) {
        // Check if click is on the toggle button
        if (
          businessDropdownRef.current &&
          businessDropdownRef.current.contains(event.target)
        ) {
          return;
        }

        // Check if click is on the dropdown content
        const dropdownElement = document.querySelector(
          ".portal-company-dropdown"
        );
        if (dropdownElement && dropdownElement.contains(event.target)) {
          return;
        }

        setShowBusinessDropdown(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showBusinessDropdown]);

  // Handle window resize to recalculate position
  useEffect(() => {
    const handleResize = () => {
      if (showBusinessDropdown) {
        calculateDropdownPosition();
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize);
    };
  }, [showBusinessDropdown]);

  // Prevent body scroll when dropdown is open
  useEffect(() => {
    if (showBusinessDropdown) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("dropdown-open");
    } else {
      document.body.style.overflow = "unset";
      document.body.classList.remove("dropdown-open");
    }

    return () => {
      document.body.style.overflow = "unset";
      document.body.classList.remove("dropdown-open");
    };
  }, [showBusinessDropdown]);

  // Enhanced company selector with better state handling
  const renderCompanySelector = () => {
    if (isLoadingCompanies) {
      return (
        <div className="d-flex align-items-center">
          <div className="company-avatar bg-secondary">
            <Spinner animation="border" size="sm" variant="light" />
          </div>
          <span className="company-name">Loading...</span>
        </div>
      );
    }

    if (!currentCompany) {
      return (
        <div className="d-flex align-items-center">
          <div className="company-avatar bg-secondary">
            <FontAwesomeIcon icon={faBuilding} size="sm" />
          </div>
          <span className="company-name">Select Company</span>
          <small className="company-switch-text">+ Add Company</small>
        </div>
      );
    }

    const companyName =
      currentCompany.businessName || currentCompany.name || "Company";
    const companyInitials = generateInitials(companyName);
    const companyColor = currentCompany.color || "#4f46e5";

    return (
      <div className="d-flex align-items-center">
        <div
          className="company-avatar text-white"
          style={{backgroundColor: companyColor}}
        >
          {companyInitials}
        </div>
        <span className="company-name" title={companyName}>
          {companyName.length > 20
            ? `${companyName.substring(0, 20)}...`
            : companyName}
        </span>
        <small className="company-switch-text">
          {effectiveCompanies.length > 1
            ? `+ Switch (${effectiveCompanies.length})`
            : "+ Add Company"}
        </small>
      </div>
    );
  };

  return (
    <>
      <Navbar
        bg="white"
        variant="light"
        expand="lg"
        className="shadow-sm border-bottom px-0"
        style={{zIndex: 1030, height: "60px"}}
        fixed="top"
      >
        <Container fluid className="px-3 h-100">
          <div className="d-flex align-items-center justify-content-between w-100 h-100">
            {/* Left Section - Logo and Navigation */}
            <div className="d-flex align-items-center flex-shrink-0">
              {/* ✅ UPDATED: B2B Billing Brand Logo */}
              <Navbar.Brand
                className="d-flex align-items-center me-4"
                onClick={handleNavigateHome}
                style={{cursor: "pointer"}}
                title="Go to Dashboard - B2B Billing Solution"
              >
                <div className="brand-logo me-2">
                  <FontAwesomeIcon icon={faFileInvoice} size="lg" />
                </div>
                <span className="brand-text">B2B Billing</span>
              </Navbar.Brand>

              {/* Navigation Links - Desktop - Only working features */}
              <Nav className="d-none d-lg-flex">
                {navLinks.map((link) => (
                  <Button
                    key={link.key}
                    variant="link"
                    className={`nav-btn me-1 ${
                      activeLink === link.key ? "active" : ""
                    }`}
                    onClick={() => handleNavClick(link.key)}
                    title={link.description}
                  >
                    <FontAwesomeIcon icon={link.icon} className="me-2" />
                    {link.label}
                  </Button>
                ))}
              </Nav>
            </div>

            {/* Center Section - Company Selector */}
            <div
              className="position-relative flex-shrink-0"
              ref={businessDropdownRef}
            >
              <Button
                variant="outline-light"
                className="company-selector d-flex align-items-center"
                onClick={handleDropdownToggle}
                title={`Switch Company (${effectiveCompanies.length} available)`}
                style={{
                  borderColor: showBusinessDropdown ? "#4f46e5" : "#e5e7eb",
                  backgroundColor: showBusinessDropdown ? "#f8fafc" : "white",
                }}
              >
                {renderCompanySelector()}
                <FontAwesomeIcon
                  icon={faChevronDown}
                  size="sm"
                  className="ms-2"
                  style={{
                    transform: showBusinessDropdown
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </Button>
            </div>

            {/* Right Section - Search and Profile */}
            <div className="d-flex align-items-center flex-shrink-0">
              {/* ✅ PRODUCTION: Enhanced Search Bar with Results */}
              <div
                className="position-relative d-none d-lg-flex me-3"
                ref={searchRef}
              >
                <Form onSubmit={handleSearchSubmit}>
                  <InputGroup className="search-group">
                    <Form.Control
                      type="text"
                      placeholder="Search customers, products, transactions..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onFocus={handleSearchFocus}
                      onBlur={handleSearchBlur}
                      className="search-input"
                    />
                    <InputGroup.Text className="search-icon">
                      {isSearching ? (
                        <Spinner size="sm" animation="border" />
                      ) : (
                        <FontAwesomeIcon icon={faSearch} />
                      )}
                    </InputGroup.Text>
                  </InputGroup>
                </Form>

                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="search-results-dropdown">
                    <div className="search-results-header">
                      <small className="text-muted">
                        Found {searchResults.length} result
                        {searchResults.length !== 1 ? "s" : ""}
                      </small>
                    </div>
                    {searchResults.map((result, index) => (
                      <div
                        key={index}
                        className="search-result-item"
                        onClick={() => handleSearchResultClick(result)}
                      >
                        <div className="search-result-content">
                          <div className="search-result-title">
                            {result.title}
                          </div>
                          <div className="search-result-description">
                            {result.description}
                          </div>
                        </div>
                        <div className="search-result-type">
                          <Badge
                            bg={result.type === "nav" ? "primary" : "secondary"}
                            size="sm"
                          >
                            {result.type === "nav" ? "Page" : "Action"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ✅ COMPLETELY HIDDEN: Notifications (coming soon) */}
              {/* Notifications will only show when backend is ready and notificationCount > 0 */}

              {/* Profile Dropdown */}
              <Dropdown align="end">
                <Dropdown.Toggle
                  as={Button}
                  variant="link"
                  className="profile-btn"
                  title="User Menu"
                >
                  <Image
                    src={getUserAvatarUrl()}
                    alt="User"
                    roundedCircle
                    className="profile-avatar"
                    width="32"
                    height="32"
                  />
                </Dropdown.Toggle>

                <Dropdown.Menu className="profile-dropdown">
                  <div className="profile-header">
                    <Image
                      src={getUserAvatarUrl()}
                      alt="User"
                      roundedCircle
                      className="profile-header-avatar me-3"
                      width="48"
                      height="48"
                    />
                    <div>
                      <div className="profile-header-name">
                        {getUserDisplayName()}
                      </div>
                      <small className="profile-header-email">
                        {currentUser?.email}
                      </small>
                      <Badge bg="primary" size="sm" className="mt-1">
                        {currentUser?.role || "User"}
                      </Badge>
                    </div>
                  </div>

                  <Dropdown.Divider />

                  {/* ✅ HIDDEN: Admin panel - only for super admin */}
                  {currentUser?.role === "SuperAdmin" && (
                    <>
                      <Dropdown.Item
                        onClick={() => handleProfileAction("admin")}
                        className="admin-option"
                      >
                        <FontAwesomeIcon
                          icon={faUserShield}
                          className="me-2 text-danger"
                        />
                        System Admin
                      </Dropdown.Item>
                      <Dropdown.Divider />
                    </>
                  )}

                  <Dropdown.Item onClick={() => handleProfileAction("profile")}>
                    <FontAwesomeIcon icon={faUser} className="me-2" />
                    My Profile
                  </Dropdown.Item>

                  <Dropdown.Item
                    onClick={() => handleProfileAction("settings")}
                  >
                    <FontAwesomeIcon icon={faCog} className="me-2" />
                    Settings
                  </Dropdown.Item>

                  <Dropdown.Divider />

                  <Dropdown.Item
                    onClick={() => handleProfileAction("logout")}
                    className="text-danger"
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} className="me-2" />
                    Sign Out
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              {/* Mobile Menu Toggle */}
              <Button
                variant="link"
                className="d-lg-none ms-2 icon-btn"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                <FontAwesomeIcon icon={showMobileMenu ? faTimes : faBars} />
              </Button>
            </div>
          </div>
        </Container>

        {/* Mobile Menu - Only working features */}
        {showMobileMenu && (
          <div className="mobile-menu d-lg-none">
            {/* Mobile Search */}
            <Form onSubmit={handleSearchSubmit} className="mb-3">
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
                <InputGroup.Text>
                  {isSearching ? (
                    <Spinner size="sm" animation="border" />
                  ) : (
                    <FontAwesomeIcon icon={faSearch} />
                  )}
                </InputGroup.Text>
              </InputGroup>
            </Form>

            {/* Mobile Navigation - Only working features */}
            <Nav className="flex-column">
              {navLinks.map((link) => (
                <Button
                  key={link.key}
                  variant="link"
                  className={`mobile-nav-btn ${
                    activeLink === link.key ? "active" : ""
                  }`}
                  onClick={() => handleNavClick(link.key)}
                >
                  <FontAwesomeIcon icon={link.icon} className="me-2" />
                  {link.label}
                </Button>
              ))}
            </Nav>
          </div>
        )}
      </Navbar>

      {/* Portal-based Company Dropdown */}
      {showBusinessDropdown &&
        createPortal(
          <div
            className="portal-company-dropdown"
            style={{
              position: "fixed",
              top: `${dropdownPosition.top || 100}px`,
              left: `${dropdownPosition.left || 200}px`,
              transform: "translateX(-50%)",
              zIndex: 99999,
              minWidth: "360px",
              maxWidth: "450px",
              background: "white",
              border: "2px solid #e5e7eb",
              borderRadius: "12px",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25)",
              maxHeight: "70vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header - Fixed */}
            <div
              style={{
                padding: "16px",
                borderBottom: "1px solid #f3f4f6",
                background: "linear-gradient(135deg, #f9fafb, #f3f4f6)",
                borderRadius: "12px 12px 0 0",
                flexShrink: 0,
              }}
            >
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  Switch Company
                  <Badge
                    bg="primary"
                    className="ms-2"
                    style={{fontSize: "10px"}}
                  >
                    {effectiveCompanies.length}
                  </Badge>
                </h6>
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon
                    icon={isOnline ? faWifi : faTimes}
                    className={`me-2 ${
                      isOnline ? "text-success" : "text-danger"
                    }`}
                    title={isOnline ? "Online" : "Offline"}
                  />
                  <small className="text-muted me-2">{getCurrentView()}</small>
                  <button
                    onClick={() => setShowBusinessDropdown(false)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#6b7280",
                      fontSize: "16px",
                      cursor: "pointer",
                      padding: "4px",
                      borderRadius: "4px",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = "#f3f4f6";
                      e.target.style.color = "#374151";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "none";
                      e.target.style.color = "#6b7280";
                    }}
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </div>
              </div>
            </div>

            {/* Offline Warning */}
            {!isOnline && (
              <div className="px-3 py-2">
                <Alert variant="warning" className="mb-0 py-1 small">
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    className="me-1"
                  />
                  You're offline. Company data may be outdated.
                </Alert>
              </div>
            )}

            {/* Scrollable Content Area */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                padding: "8px 0",
                minHeight: 0,
              }}
              onScroll={(e) => e.stopPropagation()}
            >
              {isLoadingCompanies ? (
                <div className="px-3 py-2 text-center">
                  <Spinner animation="border" size="sm" className="me-2" />
                  <span className="small text-muted">Loading companies...</span>
                </div>
              ) : (
                <>
                  {effectiveCompanies && effectiveCompanies.length > 0 ? (
                    effectiveCompanies.map((company) => {
                      const companyName =
                        company.businessName ||
                        company.name ||
                        "Unnamed Company";
                      const companyId = company.id || company._id;
                      const isCurrentCompany =
                        companyId === effectiveCompanyId ||
                        (currentCompany &&
                          companyId ===
                            (currentCompany.id || currentCompany._id)) ||
                        company.isCurrent;
                      const companyColor = company.color || getRandomColor();

                      return (
                        <div
                          key={companyId}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompanySelect(company);
                          }}
                          style={{
                            width: "calc(100% - 16px)",
                            margin: "2px 8px",
                            padding: "12px 16px",
                            display: "flex",
                            alignItems: "center",
                            background: isCurrentCompany
                              ? "linear-gradient(135deg, #eff6ff, #dbeafe)"
                              : "white",
                            color: isCurrentCompany ? "#1d4ed8" : "#374151",
                            border: isCurrentCompany
                              ? "2px solid #4f46e5"
                              : "1px solid transparent",
                            borderRadius: "8px",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            userSelect: "none",
                          }}
                          onMouseEnter={(e) => {
                            if (!isCurrentCompany) {
                              e.currentTarget.style.background = "#f8fafc";
                              e.currentTarget.style.transform =
                                "translateX(4px)";
                              e.currentTarget.style.borderColor = "#e5e7eb";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isCurrentCompany) {
                              e.currentTarget.style.background = "white";
                              e.currentTarget.style.transform = "translateX(0)";
                              e.currentTarget.style.borderColor = "transparent";
                            }
                          }}
                        >
                          {/* Avatar */}
                          <div
                            style={{
                              backgroundColor: companyColor,
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "13px",
                              fontWeight: "bold",
                              marginRight: "12px",
                              flexShrink: 0,
                              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                            }}
                          >
                            {generateInitials(companyName)}
                          </div>

                          {/* Details */}
                          <div style={{flex: 1, minWidth: 0}}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: "14px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                marginBottom: "2px",
                              }}
                            >
                              {companyName}
                            </div>
                            {(company.city || company.state) && (
                              <small
                                style={{
                                  color: "#6b7280",
                                  display: "block",
                                  fontSize: "12px",
                                  lineHeight: 1.3,
                                }}
                              >
                                {[company.city, company.state]
                                  .filter(Boolean)
                                  .join(", ")}
                              </small>
                            )}
                            {company.email && (
                              <small
                                style={{
                                  color: "#6b7280",
                                  display: "block",
                                  fontSize: "12px",
                                  lineHeight: 1.3,
                                }}
                              >
                                {company.email}
                              </small>
                            )}
                          </div>

                          {/* Check Mark */}
                          {isCurrentCompany && (
                            <FontAwesomeIcon
                              icon={faCheck}
                              className="ms-auto text-success"
                              style={{fontSize: "14px"}}
                            />
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2 text-center text-muted small">
                      <div className="text-center py-3">
                        <FontAwesomeIcon
                          icon={faBuilding}
                          size="2x"
                          className="text-muted mb-2"
                        />
                        <p className="mb-1">
                          {isOnline
                            ? "No companies found"
                            : "No companies available offline"}
                        </p>
                        <small className="text-muted">
                          {isOnline
                            ? "Create your first company to get started"
                            : "Companies will appear when you're online"}
                        </small>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Actions - Fixed */}
            <div
              style={{
                borderTop: "1px solid #f3f4f6",
                padding: "8px 0",
                flexShrink: 0,
                background: "white",
                borderRadius: "0 0 12px 12px",
              }}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddNewCompany();
                }}
                style={{
                  width: "calc(100% - 16px)",
                  margin: "2px 8px",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  color: "#4f46e5",
                  background: "white",
                  border: "1px solid transparent",
                  borderRadius: "8px",
                  cursor: isOnline ? "pointer" : "not-allowed",
                  opacity: isOnline ? 1 : 0.5,
                  transition: "all 0.2s ease",
                  userSelect: "none",
                }}
                onMouseEnter={(e) => {
                  if (isOnline) {
                    e.currentTarget.style.background = "#f8fafc";
                    e.currentTarget.style.transform = "translateX(4px)";
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }
                }}
                onMouseLeave={(e) => {
                  if (isOnline) {
                    e.currentTarget.style.background = "white";
                    e.currentTarget.style.transform = "translateX(0)";
                    e.currentTarget.style.borderColor = "transparent";
                  }
                }}
              >
                <FontAwesomeIcon icon={faPlus} className="me-2" />
                Add New Company
              </div>

              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBusinessDropdown(false);
                  if (onNavigate) {
                    onNavigate("companies");
                  }
                }}
                style={{
                  width: "calc(100% - 16px)",
                  margin: "2px 8px",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  color: "#4f46e5",
                  background: "white",
                  border: "1px solid transparent",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  userSelect: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f8fafc";
                  e.currentTarget.style.transform = "translateX(4px)";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.transform = "translateX(0)";
                  e.currentTarget.style.borderColor = "transparent";
                }}
              >
                <FontAwesomeIcon icon={faBuilding} className="me-2" />
                Manage Companies
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ✅ PRODUCTION: Enhanced Styles with Search Results */}
      <style>{`
        .navbar .container-fluid {
          max-width: 100%;
          overflow: visible;
        }

        .brand-logo {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #4f46e5, #3b82f6);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
          flex-shrink: 0;
        }

        .brand-text {
          font-weight: 700;
          color: #4f46e5;
          font-size: 1.1rem;
          margin: 0;
          white-space: nowrap;
        }

        .nav-btn {
          text-decoration: none;
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          transition: all 0.2s;
          white-space: nowrap;
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }

        .nav-btn:hover {
          color: #4f46e5;
          background-color: #f3f4f6;
          transform: translateY(-1px);
        }

        .nav-btn.active {
          color: white;
          background-color: #4f46e5;
          box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
        }

        .company-selector {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 6px 12px;
          background: white !important;
          color: #374151;
          font-size: 14px;
          min-width: 200px;
          max-width: 280px;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .company-selector:hover {
          border-color: #d1d5db;
          background: #f9fafb !important;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .company-selector:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .company-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          margin-right: 8px;
          flex-shrink: 0;
        }

        .company-name {
          font-weight: 600;
          color: #111827;
          margin-right: 4px;
          flex-shrink: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .company-switch-text {
          color: #4f46e5;
          font-size: 11px;
          flex-shrink: 0;
        }

        .search-group {
          width: 350px;
          max-width: 350px;
          flex-shrink: 0;
          position: relative;
        }

        .search-input {
          border: 1px solid #e5e7eb;
          border-right: none;
          font-size: 14px;
          padding: 8px 12px;
          transition: all 0.2s ease;
        }

        .search-input:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .search-icon {
          border: 1px solid #e5e7eb;
          border-left: none;
          background: #f9fafb;
          color: #6b7280;
          transition: all 0.2s ease;
          min-width: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .search-input:focus + .search-icon {
          border-color: #4f46e5;
          background: #eff6ff;
          color: #4f46e5;
        }

        .search-results-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          max-height: 400px;
          overflow-y: auto;
          margin-top: 4px;
        }

        .search-results-header {
          padding: 8px 12px;
          border-bottom: 1px solid #f3f4f6;
          background: #f9fafb;
          border-radius: 8px 8px 0 0;
        }

        .search-result-item {
          padding: 12px;
          border-bottom: 1px solid #f3f4f6;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .search-result-item:hover {
          background: #f8fafc;
          transform: translateX(4px);
        }

        .search-result-item:last-child {
          border-bottom: none;
          border-radius: 0 0 8px 8px;
        }

        .search-result-content {
          flex: 1;
          min-width: 0;
        }

        .search-result-title {
          font-weight: 600;
          color: #111827;
          font-size: 14px;
          margin-bottom: 2px;
        }

        .search-result-description {
          color: #6b7280;
          font-size: 12px;
          line-height: 1.3;
        }

        .search-result-type {
          flex-shrink: 0;
          margin-left: 12px;
        }

        .portal-company-dropdown div::-webkit-scrollbar {
          width: 6px;
        }

        .portal-company-dropdown div::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .portal-company-dropdown div::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .portal-company-dropdown div::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .search-results-dropdown::-webkit-scrollbar {
          width: 6px;
        }

        .search-results-dropdown::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .search-results-dropdown::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        body.dropdown-open {
          overflow: hidden !important;
        }

        .portal-company-dropdown {
          scroll-behavior: smooth;
        }

        .icon-btn {
          color: #6b7280;
          border: none;
          padding: 8px;
          font-size: 16px;
          border-radius: 6px;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .icon-btn:hover {
          color: #4f46e5;
          background: #f3f4f6;
          transform: translateY(-1px);
        }

        .notification-badge {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        .profile-btn {
          border: none;
          color: #374151;
          text-decoration: none;
          display: flex;
          align-items: center;
          padding: 4px;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .profile-btn:hover {
          transform: scale(1.05);
        }

        .profile-avatar {
          border: 2px solid #f8f9fa;
          transition: all 0.2s ease;
        }

        .profile-avatar:hover {
          border-color: #5e60ce;
          box-shadow: 0 2px 8px rgba(94, 96, 206, 0.3);
        }

        .profile-dropdown {
          border: none;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          border-radius: 12px;
          min-width: 280px;
          animation: fadeInDown 0.3s ease;
        }

        .profile-header {
          padding: 20px;
          background: linear-gradient(135deg, #f9fafb, #f3f4f6);
          display: flex;
          align-items: center;
          border-radius: 12px 12px 0 0;
        }

        .profile-header-avatar {
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .profile-header-name {
          font-weight: 600;
          color: #111827;
          font-size: 16px;
        }

        .profile-header-email {
          color: #6b7280;
          font-size: 13px;
        }

        .admin-option {
          color: #dc2626 !important;
          background: linear-gradient(135deg, rgba(220, 53, 69, 0.05), rgba(220, 53, 69, 0.1)) !important;
          margin: 2px 8px;
          border-radius: 8px;
        }

        .admin-option:hover {
          background: linear-gradient(135deg, rgba(220, 53, 69, 0.1), rgba(220, 53, 69, 0.15)) !important;
          transform: translateX(4px);
        }

        .mobile-menu {
          background: white;
          border-top: 1px solid #e5e7eb;
          padding: 16px;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
        }

        .mobile-nav-btn {
          width: 100%;
          text-align: left;
          border: none;
          padding: 12px 0;
          color: #6b7280;
          text-decoration: none;
          font-size: 14px;
          transition: all 0.2s ease;
          border-radius: 6px;
          display: flex;
          align-items: center;
        }

        .mobile-nav-btn:hover {
          color: #4f46e5;
          background: #f3f4f6;
          padding-left: 8px;
        }

        .mobile-nav-btn.active {
          color: #4f46e5;
          font-weight: 600;
          background: #eff6ff;
        }

        @media (max-width: 1200px) {
          .search-group {
            width: 300px;
          }
        }

        @media (max-width: 992px) {
          .company-name,
          .company-switch-text {
            display: none;
          }

          .company-selector {
            min-width: auto;
            padding: 6px 8px;
            max-width: 48px;
          }

          .search-group {
            width: 250px;
          }
        }

        @media (max-width: 768px) {
          .search-group {
            width: 200px;
          }

          .brand-text {
            font-size: 1rem;
          }

          .nav-btn {
            padding: 6px 12px;
            font-size: 13px;
          }
        }

        @media (max-width: 576px) {
          .brand-text {
            display: none;
          }

          .company-selector {
            max-width: 40px;
            padding: 4px 6px;
          }
        }

        * {
          box-sizing: border-box;
        }

        .d-flex {
          min-width: 0;
        }

        .flex-shrink-0 {
          flex-shrink: 0;
        }

        .navbar {
          overflow: visible;
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
      `}</style>
    </>
  );
}

export default MainNavbar;
