import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faHome, faUsers, faChartLine } from '@fortawesome/free-solid-svg-icons';
import UserDropdown from '../Common/UserDropdown';
import authService from '../../services/authService';

const MainNavbar = ({ currentUser, currentCompany, addToast, onLogout }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get current user data
    const userData = currentUser || authService.getCurrentUser();
    setUser(userData);
  }, [currentUser]);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      authService.logout();
      window.location.href = '/login';
    }
  };

  return (
    <Navbar bg="primary" variant="dark" expand="lg" className="shadow-sm">
      <Container fluid>
        {/* Brand */}
        <Navbar.Brand href="#" className="fw-bold">
          <FontAwesomeIcon icon={faHome} className="me-2" />
          B2B Billings
        </Navbar.Brand>

        {/* Toggle for mobile */}
        <Navbar.Toggle aria-controls="basic-navbar-nav">
          <FontAwesomeIcon icon={faBars} />
        </Navbar.Toggle>

        <Navbar.Collapse id="basic-navbar-nav">
          {/* Left side navigation */}
          <Nav className="me-auto">
            <Nav.Link href="/dashboard">
              <FontAwesomeIcon icon={faHome} className="me-2" />
              Dashboard
            </Nav.Link>
            <Nav.Link href="/parties">
              <FontAwesomeIcon icon={faUsers} className="me-2" />
              Parties
            </Nav.Link>
            <Nav.Link href="/reports">
              <FontAwesomeIcon icon={faChartLine} className="me-2" />
              Reports
            </Nav.Link>
          </Nav>

          {/* Right side - User dropdown */}
          <Nav className="ms-auto">
            {user && (
              <UserDropdown 
                currentUser={user}
                onLogout={handleLogout}
                addToast={addToast}
              />
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default MainNavbar;