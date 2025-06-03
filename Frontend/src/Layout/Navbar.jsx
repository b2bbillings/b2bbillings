import { useState, useEffect, useRef } from 'react';
import { Navbar as BootstrapNavbar, Container, Nav, Button, Image } from 'react-bootstrap';
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
    faBuilding
} from '@fortawesome/free-solid-svg-icons';
import CreateCompany from '../components/Company/CreateCompany';
import './Navbar.css';

function Navbar({ onLogout, toggleSidebar }) {
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
    const [showCreateCompany, setShowCreateCompany] = useState(false);

    const notificationRef = useRef(null);
    const userDropdownRef = useRef(null);
    const businessDropdownRef = useRef(null);

    // Temporary logo as base64 SVG - shop/cart icon with gradient
    const tempLogo = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM1ZTYwY2UiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM4MDYwZmYiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48Y2lyY2xlIGN4PSIyNTYiIGN5PSIyNTYiIHI9IjI1MCIgZmlsbD0id2hpdGUiLz48cGF0aCBmaWxsPSJ1cmwoI2EpIiBkPSJNMTgwIDgwQzE4MCA1Ny45MDkgMTk3LjkwOSA0MCAyMjAgNDBIMjkyQzMxNC4wOTEgNDAgMzMyIDU3LjkwOSAzMzIgODBWOTZIMzgwLjY0TDQzMiAyMjRMNDMyIDM3Nkg4MFYyMjRMMTMxLjM2IDk2SDE4MFY4MFpNODAgMzc2VjQzMkgxMzZWNDAwSDE4OFY0MzJIMzI0VjQwMEgzNzZWNDMySDQzMlYzNzZIODBaIi8+PGNpcmNsZSBjeD0iMTYwIiBjeT0iMzA0IiByPSIzMiIgZmlsbD0id2hpdGUiLz48Y2lyY2xlIGN4PSIzNTIiIGN5PSIzMDQiIHI9IjMyIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==";

    // Mock businesses
    const [businesses, setBusinesses] = useState([
        { id: 1, name: "YOUR BUSINESS NAME", initials: "YB", color: "#ff9e43" },
        { id: 2, name: "Another Shop", initials: "AS", color: "#4e73df" },
        { id: 3, name: "Third Enterprise", initials: "TE", color: "#1cc88a" }
    ]);

    const [currentBusiness, setCurrentBusiness] = useState(businesses[0]);

    // Mock notifications
    const notifications = [
        { id: 1, message: 'New order received - ORD-2023-7865', time: '2 minutes ago', isRead: false },
        { id: 2, message: 'Payment confirmed for order ORD-2023-7860', time: '1 hour ago', isRead: false },
        { id: 3, message: 'Low stock alert for "Premium T-Shirt XL"', time: '3 hours ago', isRead: true },
        { id: 4, message: 'Staff meeting scheduled for tomorrow 10:00 AM', time: '5 hours ago', isRead: true },
    ];

    const unreadCount = notifications.filter(n => !n.isRead).length;

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
    const handleCompanyCreated = (companyData) => {
        // Generate initials from business name
        const generateInitials = (name) => {
            return name
                .split(' ')
                .map(word => word.charAt(0))
                .join('')
                .toUpperCase()
                .slice(0, 2);
        };

        // Generate random color for new business
        const colors = ['#ff9e43', '#4e73df', '#1cc88a', '#e74a3b', '#f39c12', '#9b59b6', '#34495e'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        // Create new business object
        const newBusiness = {
            id: Date.now(),
            name: companyData.businessName,
            initials: generateInitials(companyData.businessName),
            color: randomColor,
            ...companyData
        };

        // Add to businesses list
        setBusinesses(prev => [...prev, newBusiness]);

        // Switch to the new business
        setCurrentBusiness(newBusiness);

        // Close modal
        setShowCreateCompany(false);

        // Optional: Show success message
        console.log('New business created:', newBusiness);
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

                            {/* Business Selector - RIGHT of logo/brand */}
                            <div
                                ref={businessDropdownRef}
                                className="business-selector d-flex align-items-center position-relative"
                            >
                                <div
                                    className="d-flex align-items-center business-dropdown-toggle"
                                    onClick={() => setShowBusinessDropdown(!showBusinessDropdown)}
                                >
                                    <div
                                        className="business-avatar"
                                        style={{ backgroundColor: currentBusiness.color }}
                                    >
                                        {currentBusiness.initials}
                                    </div>
                                    <div className="business-name-container ms-2 d-none d-md-flex flex-column">
                                        <div className="business-name">{currentBusiness.name}</div>
                                        <div className="add-business">
                                            <FontAwesomeIcon icon={faPlus} className="me-1" size="xs" />
                                            <span>Add Another Company</span>
                                        </div>
                                    </div>
                                </div>

                                {showBusinessDropdown && (
                                    <div className="dropdown-menu business-dropdown-menu shadow animated--grow-in show">
                                        <h6 className="dropdown-header">Switch Business</h6>
                                        {businesses.map(business => (
                                            <a
                                                key={business.id}
                                                className={`dropdown-item d-flex align-items-center ${business.id === currentBusiness.id ? 'active' : ''}`}
                                                onClick={() => {
                                                    setCurrentBusiness(business);
                                                    setShowBusinessDropdown(false);
                                                }}
                                            >
                                                <div
                                                    className="business-dropdown-avatar me-2"
                                                    style={{ backgroundColor: business.color }}
                                                >
                                                    {business.initials}
                                                </div>
                                                <span className="business-dropdown-name">{business.name}</span>
                                            </a>
                                        ))}
                                        <div className="dropdown-divider"></div>
                                        <a
                                            className="dropdown-item"
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleAddNewBusiness();
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faPlus} className="me-2" />
                                            Add New Business
                                        </a>
                                        <a className="dropdown-item" href="#">
                                            <FontAwesomeIcon icon={faBuilding} className="me-2" />
                                            Manage Businesses
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right section - Notifications and profile */}
                        <div className="ms-auto d-flex align-items-center navbar-right">
                            {/* Help icon */}
                            <Nav.Item className="d-none d-lg-block">
                                <Nav.Link href="#" className="icon-link">
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
                                >
                                    <FontAwesomeIcon icon={faBell} />
                                    {unreadCount > 0 && (
                                        <span className="notification-badge">
                                            {unreadCount}
                                        </span>
                                    )}
                                </div>

                                {showNotifications && (
                                    <div className="dropdown-menu dropdown-menu-end shadow animated--grow-in show notifications-dropdown">
                                        <h6 className="dropdown-header">
                                            Notifications
                                        </h6>
                                        {notifications.map(notification => (
                                            <a key={notification.id} className={`dropdown-item d-flex align-items-center ${!notification.isRead ? 'unread' : ''}`} href="#">
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
                                        ))}
                                        <a className="dropdown-item text-center small text-gray-500" href="#">Show All Alerts</a>
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
                                >
                                    <span className="me-2 d-none d-xl-inline user-name">Business Admin</span>
                                    <Image
                                        src="https://ui-avatars.com/api/?name=Business+Admin&background=5e60ce&color=fff&size=36"
                                        alt="User"
                                        roundedCircle
                                        className="img-profile"
                                    />
                                </div>

                                {showUserDropdown && (
                                    <div className="dropdown-menu dropdown-menu-end shadow animated--grow-in show">
                                        <a className="dropdown-item" href="#">
                                            <FontAwesomeIcon icon={faUser} className="fa-sm fa-fw me-2 text-gray-400" />
                                            Profile
                                        </a>
                                        <a className="dropdown-item" href="#">
                                            <FontAwesomeIcon icon={faCog} className="fa-sm fa-fw me-2 text-gray-400" />
                                            Settings
                                        </a>
                                        <a className="dropdown-item" href="#">
                                            <FontAwesomeIcon icon={faClipboardList} className="fa-sm fa-fw me-2 text-gray-400" />
                                            Activity Log
                                        </a>
                                        <div className="dropdown-divider"></div>
                                        <a
                                            className="dropdown-item"
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (onLogout) {
                                                    onLogout();
                                                }
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faSignOutAlt} className="fa-sm fa-fw me-2 text-gray-400" />
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
            />
        </>
    );
}

export default Navbar;