import { useState, useEffect, useRef } from 'react';
import { Navbar as BootstrapNavbar, Container, Nav, Button, Image, Spinner, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
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
    faCheck
} from '@fortawesome/free-solid-svg-icons';
import CreateCompany from '../components/Company/CreateCompany';
import './Navbar.css';

function Navbar({
    onLogout,
    toggleSidebar,
    currentCompany,
    companies,
    onCompanyChange,
    onCompanyCreated,
    currentUser,
    isLoadingCompanies,
    isOnline
}) {
    // Dropdown states
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
    const [showCreateCompany, setShowCreateCompany] = useState(false);

    // Refs for click outside detection
    const notificationRef = useRef(null);
    const userDropdownRef = useRef(null);
    const businessDropdownRef = useRef(null);

    // Temporary logo as base64 SVG - shop/cart icon with gradient
    const tempLogo = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM1ZTYwY2UiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM4MDYwZmYiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48Y2lyY2xlIGN4PSIyNTYiIGN5PSIyNTYiIHI9IjI1MCIgZmlsbD0id2hpdGUiLz48cGF0aCBmaWxsPSJ1cmwoI2EpIiBkPSJNMTgwIDgwQzE4MCA1Ny45MDkgMTk3LjkwOSA0MCAyMjAgNDBIMjkyQzMxNC4wOTEgNDAgMzMyIDU3LjkwOSAzMzIgODBWOTZIMzgwLjY0TDQzMiAyMjRMNDMyIDM3Nkg4MFYyMjRMMTMxLjM2IDk2SDE4MFY4MFpNODAgMzc2VjQzMkgxMzZWNDAwSDE4OFY0MzJIMzI0VjQwMEgzNzZWNDMySDQzMlYzNzZIODBaIi8+PGNpcmNsZSBjeD0iMTYwIiBjeT0iMzA0IiByPSIzMiIgZmlsbD0id2hpdGUiLz48Y2lyY2xlIGN4PSIzNTIiIGN5PSIzMDQiIHI9IjMyIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==";

    // Mock notifications (to be replaced with real notifications from backend)
    const notifications = [
        { id: 1, message: 'New order received - ORD-2023-7865', time: '2 minutes ago', isRead: false },
        { id: 2, message: 'Payment confirmed for order ORD-2023-7860', time: '1 hour ago', isRead: false },
        { id: 3, message: 'Low stock alert for "Premium T-Shirt XL"', time: '3 hours ago', isRead: true },
        { id: 4, message: 'Staff meeting scheduled for tomorrow 10:00 AM', time: '5 hours ago', isRead: true },
    ];

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Generate initials from company name
    const generateInitials = (name) => {
        if (!name) return 'NA';
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Generate random color for company
    const getRandomColor = () => {
        const colors = ['#ff9e43', '#4e73df', '#1cc88a', '#e74a3b', '#f39c12', '#9b59b6', '#34495e', '#17a2b8', '#6f42c1', '#e83e8c'];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    // Handle clicks outside of dropdowns
    useEffect(() => {
        function handleClickOutside(event) {
            if (showNotifications &&
                notificationRef.current &&
                !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }

            if (showUserDropdown &&
                userDropdownRef.current &&
                !userDropdownRef.current.contains(event.target)) {
                setShowUserDropdown(false);
            }

            if (showBusinessDropdown &&
                businessDropdownRef.current &&
                !businessDropdownRef.current.contains(event.target)) {
                setShowBusinessDropdown(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showNotifications, showUserDropdown, showBusinessDropdown]);

    // Handle company selection
    const handleCompanySelect = (company) => {
        console.log('🏢 Navbar: Company selected:', company?.companyName || company?.name);

        if (onCompanyChange) {
            onCompanyChange(company);
        }

        setShowBusinessDropdown(false);
    };

    // Handle opening create company modal
    const handleAddNewBusiness = () => {
        setShowCreateCompany(true);
        setShowBusinessDropdown(false);
    };

    // Handle closing create company modal
    const handleCloseCreateCompany = () => {
        setShowCreateCompany(false);
    };

    // Handle company creation success
    const handleCompanyCreated = (newCompany) => {
        console.log('🆕 Navbar: Company created:', newCompany);

        if (onCompanyCreated) {
            onCompanyCreated(newCompany);
        }

        setShowCreateCompany(false);
    };

    // Get user display name
    const getUserDisplayName = () => {
        if (currentUser?.name) {
            return currentUser.name;
        }
        if (currentUser?.email) {
            return currentUser.email.split('@')[0];
        }
        return 'User';
    };

    // Get user avatar URL
    const getUserAvatarUrl = () => {
        const displayName = getUserDisplayName();
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=5e60ce&color=fff&size=36`;
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
                </div>
            );
        }

        // Generate company display data
        const companyName = currentCompany.companyName || currentCompany.businessName || currentCompany.name || 'Company';
        const companyInitials = generateInitials(companyName);
        const companyColor = currentCompany.color || getRandomColor();

        return (
            <div className="d-flex align-items-center">
                <div
                    className="business-avatar"
                    style={{ backgroundColor: companyColor }}
                >
                    {companyInitials}
                </div>
                <div className="business-name-container ms-2 d-none d-md-flex flex-column">
                    <div className="business-name" title={companyName}>
                        {companyName.length > 20
                            ? `${companyName.substring(0, 20)}...`
                            : companyName
                        }
                    </div>
                    <div className="add-business">
                        <FontAwesomeIcon icon={faPlus} className="me-1" size="xs" />
                        <span>Add Another Company</span>
                    </div>
                </div>
            </div>
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
                            >
                                <FontAwesomeIcon icon={faBars} />
                            </Button>

                            {/* Logo and brand name */}
                            <BootstrapNavbar.Brand href="#" className="d-flex align-items-center me-2">
                                <img
                                    src={tempLogo}
                                    alt="ShopManager Logo"
                                    width="30"
                                    height="30"
                                    className="d-inline-block align-top me-2"
                                />
                                <span className="brand-text">ShopManager</span>
                            </BootstrapNavbar.Brand>

                            {/* Company Selector */}
                            <div
                                ref={businessDropdownRef}
                                className="business-selector d-flex align-items-center position-relative"
                            >
                                <div
                                    className="d-flex align-items-center business-dropdown-toggle"
                                    onClick={() => setShowBusinessDropdown(!showBusinessDropdown)}
                                    style={{ cursor: 'pointer' }}
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
                                                    className={`me-2 ${isOnline ? 'text-success' : 'text-danger'}`}
                                                    title={isOnline ? 'Online' : 'Offline'}
                                                />
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
                                                <Spinner animation="border" size="sm" className="me-2" />
                                                <span className="small text-muted">Loading companies...</span>
                                            </div>
                                        ) : (
                                            <>
                                                {companies && companies.length > 0 ? (
                                                    companies.map(company => {
                                                        const companyName = company.companyName || company.businessName || company.name || 'Unnamed Company';
                                                        const companyId = company.id || company._id;
                                                        const currentCompanyId = currentCompany?.id || currentCompany?._id;
                                                        const isCurrentCompany = companyId === currentCompanyId;

                                                        return (
                                                            <a
                                                                key={companyId}
                                                                className={`dropdown-item d-flex align-items-center ${isCurrentCompany ? 'active' : ''}`}
                                                                onClick={() => handleCompanySelect(company)}
                                                                style={{ cursor: 'pointer' }}
                                                            >
                                                                <div
                                                                    className="business-dropdown-avatar me-2"
                                                                    style={{ backgroundColor: company.color || getRandomColor() }}
                                                                >
                                                                    {generateInitials(companyName)}
                                                                </div>
                                                                <div className="flex-grow-1">
                                                                    <div className="business-dropdown-name">{companyName}</div>
                                                                    {(company.city || company.state) && (
                                                                        <small className="text-muted">
                                                                            {[company.city, company.state].filter(Boolean).join(', ')}
                                                                        </small>
                                                                    )}
                                                                    {company.email && (
                                                                        <small className="text-muted d-block">{company.email}</small>
                                                                    )}
                                                                </div>
                                                                {isCurrentCompany && (
                                                                    <FontAwesomeIcon icon={faCheck} className="text-success ms-2" />
                                                                )}
                                                            </a>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="px-3 py-2 text-center text-muted small">
                                                        {isOnline ? 'No companies found' : 'No companies available offline'}
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
                                                    style={{ opacity: isOnline ? 1 : 0.5 }}
                                                    title={!isOnline ? 'Available when online' : ''}
                                                >
                                                    <FontAwesomeIcon icon={faPlus} className="me-2" />
                                                    Add New Company
                                                </a>
                                                <a className="dropdown-item" href="#" title="Coming soon">
                                                    <FontAwesomeIcon icon={faBuilding} className="me-2" />
                                                    Manage Companies
                                                </a>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right section - Notifications and profile */}
                        <div className="ms-auto d-flex align-items-center navbar-right">
                            {/* Network status icon (visible on smaller screens) */}
                            <Nav.Item className="d-lg-none me-2">
                                <FontAwesomeIcon
                                    icon={isOnline ? faWifi : faTimes}
                                    className={isOnline ? 'text-success' : 'text-danger'}
                                    title={isOnline ? 'Online' : 'Offline'}
                                />
                            </Nav.Item>

                            {/* Help icon */}
                            <Nav.Item className="d-none d-lg-block">
                                <Nav.Link href="#" className="icon-link" title="Help & Support">
                                    <FontAwesomeIcon icon={faQuestionCircle} />
                                </Nav.Link>
                            </Nav.Item>

                            {/* Notifications dropdown */}
                            <Nav.Item className="position-relative" ref={notificationRef}>
                                <div
                                    className="icon-link"
                                    role="button"
                                    onClick={() => {
                                        setShowNotifications(!showNotifications);
                                        setShowUserDropdown(false);
                                        setShowBusinessDropdown(false);
                                    }}
                                    title="Notifications"
                                >
                                    <FontAwesomeIcon icon={faBell} />
                                    {unreadCount > 0 && (
                                        <span className="notification-badge">
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </span>
                                    )}
                                </div>

                                {showNotifications && (
                                    <div className="dropdown-menu dropdown-menu-end shadow animated--grow-in show notifications-dropdown">
                                        <h6 className="dropdown-header d-flex justify-content-between align-items-center">
                                            <span>Notifications</span>
                                            {unreadCount > 0 && (
                                                <span className="badge bg-primary">{unreadCount}</span>
                                            )}
                                        </h6>
                                        {notifications.length > 0 ? (
                                            notifications.map(notification => (
                                                <a
                                                    key={notification.id}
                                                    className={`dropdown-item d-flex align-items-center ${!notification.isRead ? 'unread' : ''}`}
                                                    href="#"
                                                >
                                                    <div className="notification-icon me-3">
                                                        <div className={`icon-circle ${!notification.isRead ? 'bg-primary' : 'bg-secondary'}`}>
                                                            <FontAwesomeIcon icon={faBell} className="text-white" />
                                                        </div>
                                                    </div>
                                                    <div className="notification-content">
                                                        <div className="small text-gray-500">{notification.time}</div>
                                                        <span className={!notification.isRead ? 'fw-bold' : ''}>{notification.message}</span>
                                                    </div>
                                                </a>
                                            ))
                                        ) : (
                                            <div className="px-3 py-2 text-center text-muted small">
                                                No notifications
                                            </div>
                                        )}
                                        <div className="dropdown-divider"></div>
                                        <a className="dropdown-item text-center small text-gray-500" href="#">
                                            View All Notifications
                                        </a>
                                    </div>
                                )}
                            </Nav.Item>

                            {/* User profile dropdown */}
                            <Nav.Item className="user-dropdown" ref={userDropdownRef}>
                                <div
                                    className="d-flex align-items-center"
                                    role="button"
                                    onClick={() => {
                                        setShowUserDropdown(!showUserDropdown);
                                        setShowNotifications(false);
                                        setShowBusinessDropdown(false);
                                    }}
                                    title="User Menu"
                                >
                                    <span className="me-2 d-none d-xl-inline user-name">
                                        {getUserDisplayName()}
                                    </span>
                                    <Image
                                        src={getUserAvatarUrl()}
                                        alt="User"
                                        roundedCircle
                                        className="img-profile"
                                    />
                                </div>

                                {showUserDropdown && (
                                    <div className="dropdown-menu dropdown-menu-end shadow animated--grow-in show">
                                        {/* User info header */}
                                        <div className="dropdown-header">
                                            <div className="fw-bold">{getUserDisplayName()}</div>
                                            {currentUser?.email && (
                                                <small className="text-muted">{currentUser.email}</small>
                                            )}
                                        </div>
                                        <div className="dropdown-divider"></div>

                                        <a className="dropdown-item" href="#" title="View and edit profile">
                                            <FontAwesomeIcon icon={faUser} className="fa-sm fa-fw me-2 text-gray-400" />
                                            Profile
                                        </a>
                                        <a className="dropdown-item" href="#" title="Application settings">
                                            <FontAwesomeIcon icon={faCog} className="fa-sm fa-fw me-2 text-gray-400" />
                                            Settings
                                        </a>
                                        <a className="dropdown-item" href="#" title="View activity history">
                                            <FontAwesomeIcon icon={faClipboardList} className="fa-sm fa-fw me-2 text-gray-400" />
                                            Activity Log
                                        </a>

                                        <div className="dropdown-divider"></div>

                                        <a
                                            className="dropdown-item text-danger"
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (onLogout) {
                                                    onLogout();
                                                }
                                            }}
                                            title="Sign out of your account"
                                        >
                                            <FontAwesomeIcon icon={faSignOutAlt} className="fa-sm fa-fw me-2" />
                                            Logout
                                        </a>
                                    </div>
                                )}
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
            />
        </>
    );
}

export default Navbar;