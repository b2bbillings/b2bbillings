import React, { useState, useEffect } from 'react';
import { Dropdown, Image } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser, faCog, faSignOutAlt, faChevronDown, 
  faUserCircle, faBell, faQuestionCircle
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';

const UserDropdown = ({ currentUser, onLogout, addToast }) => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get current user data
    const userData = currentUser || authService.getCurrentUser();
    setUser(userData);
  }, [currentUser]);

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      authService.logout();
      window.location.href = '/login';
    }
  };

  const getUserName = () => {
    return user?.name || user?.username || user?.email || 'User';
  };

  const getUserEmail = () => {
    return user?.email || 'No email';
  };

  const getAvatarUrl = () => {
    if (user?.profileImage || user?.avatar) {
      return user.profileImage || user.avatar;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(getUserName())}&background=0d6efd&color=fff&size=40`;
  };

  const CustomToggle = React.forwardRef(({ children, onClick }, ref) => (
    <div
      ref={ref}
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
      className="d-flex align-items-center cursor-pointer user-dropdown-toggle"
      style={{ cursor: 'pointer' }}
    >
      <Image
        src={getAvatarUrl()}
        alt="Profile"
        roundedCircle
        width={35}
        height={35}
        className="me-2"
      />
      <div className="d-none d-md-block">
        <div className="text-white fw-medium small">{getUserName()}</div>
        <div className="text-white-50 small">{getUserEmail()}</div>
      </div>
      <FontAwesomeIcon 
        icon={faChevronDown} 
        className="text-white-50 ms-2 small" 
      />
    </div>
  ));

  return (
    <>
      <Dropdown align="end">
        <Dropdown.Toggle as={CustomToggle} />
        
        <Dropdown.Menu className="shadow-lg border-0" style={{ minWidth: '250px' }}>
          {/* User Info Header */}
          <div className="dropdown-header bg-light">
            <div className="d-flex align-items-center">
              <Image
                src={getAvatarUrl()}
                alt="Profile"
                roundedCircle
                width={50}
                height={50}
                className="me-3"
              />
              <div>
                <div className="fw-bold">{getUserName()}</div>
                <div className="text-muted small">{getUserEmail()}</div>
                {user?.role && (
                  <span className="badge bg-primary small">{user.role}</span>
                )}
              </div>
            </div>
          </div>
          
          <Dropdown.Divider />
          
          {/* Profile Option */}
          <Dropdown.Item 
            onClick={handleProfileClick}
            className="d-flex align-items-center py-2"
          >
            <FontAwesomeIcon icon={faUser} className="me-3 text-primary" />
            <div>
              <div className="fw-medium">Profile</div>
              <div className="text-muted small">Manage your profile settings</div>
            </div>
          </Dropdown.Item>
          
          {/* Settings Option */}
          <Dropdown.Item 
            href="#settings" 
            className="d-flex align-items-center py-2"
          >
            <FontAwesomeIcon icon={faCog} className="me-3 text-secondary" />
            <div>
              <div className="fw-medium">Settings</div>
              <div className="text-muted small">Application preferences</div>
            </div>
          </Dropdown.Item>
          
          {/* Notifications Option */}
          <Dropdown.Item 
            href="#notifications" 
            className="d-flex align-items-center py-2"
          >
            <FontAwesomeIcon icon={faBell} className="me-3 text-warning" />
            <div>
              <div className="fw-medium">Notifications</div>
              <div className="text-muted small">Manage notifications</div>
            </div>
          </Dropdown.Item>
          
          {/* Help Option */}
          <Dropdown.Item 
            href="#help" 
            className="d-flex align-items-center py-2"
          >
            <FontAwesomeIcon icon={faQuestionCircle} className="me-3 text-info" />
            <div>
              <div className="fw-medium">Help & Support</div>
              <div className="text-muted small">Get help and documentation</div>
            </div>
          </Dropdown.Item>
          
          <Dropdown.Divider />
          
          {/* Logout Option */}
          <Dropdown.Item 
            onClick={handleLogout}
            className="d-flex align-items-center py-2 text-danger"
          >
            <FontAwesomeIcon icon={faSignOutAlt} className="me-3" />
            <div>
              <div className="fw-medium">Sign Out</div>
              <div className="text-muted small">Sign out of your account</div>
            </div>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>



      <style jsx>{`
        .user-dropdown-toggle:hover {
          opacity: 0.8;
        }
        
        .dropdown-item:hover {
          background-color: #f8f9fa;
        }
        
        .dropdown-header {
          padding: 1rem;
          margin-bottom: 0;
        }
        
        .cursor-pointer {
          cursor: pointer;
        }
      `}</style>
    </>
  );
};

export default UserDropdown;