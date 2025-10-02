// Example of how to integrate the profile system into your main app

import React, { useState, useEffect } from 'react';
import { Container, Toast, ToastContainer } from 'react-bootstrap';
import MainNavbar from './components/Layout/MainNavbar';
import authService from './services/authService';

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // Load current user and company
    const user = authService.getCurrentUser();
    const company = JSON.parse(localStorage.getItem('currentCompany') || 'null');
    
    setCurrentUser(user);
    setCurrentCompany(company);
  }, []);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    const newToast = {
      id,
      message,
      type,
      show: true
    };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setCurrentCompany(null);
    addToast('Logged out successfully', 'info');
    // Redirect to login
    window.location.href = '/login';
  };

  const getToastVariant = (type) => {
    switch (type) {
      case 'success': return 'success';
      case 'error': return 'danger';
      case 'warning': return 'warning';
      default: return 'primary';
    }
  };

  return (
    <div className="App">
      {/* Navigation with Profile Dropdown */}
      <MainNavbar 
        currentUser={currentUser}
        currentCompany={currentCompany}
        addToast={addToast}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <Container fluid className="mt-4">
        <h1>Welcome to B2B Billings</h1>
        <p>Your profile management system is ready!</p>
        
        {currentUser && (
          <div className="alert alert-info">
            Welcome back, {currentUser.name}! Click on your profile picture in the navbar to manage your profile.
          </div>
        )}
      </Container>

      {/* Toast Notifications */}
      <ToastContainer position="top-end" className="p-3">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            show={toast.show}
            onClose={() => removeToast(toast.id)}
            bg={getToastVariant(toast.type)}
            className="text-white"
          >
            <Toast.Header>
              <strong className="me-auto">
                {toast.type === 'success' ? '✅ Success' : 
                 toast.type === 'error' ? '❌ Error' : 
                 toast.type === 'warning' ? '⚠️ Warning' : 
                 'ℹ️ Info'}
              </strong>
            </Toast.Header>
            <Toast.Body>{toast.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </div>
  );
};

export default App;