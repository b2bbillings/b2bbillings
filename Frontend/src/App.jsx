import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import Layout from './Layout/Layout';
import HomePage from './Pages/HomePage';
import AuthPage from './Pages/AuthPage';

// Import services
import companyService from './services/companyService';
import authService from './services/authService';

function App() {
  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Navigation state
  const [currentView, setCurrentView] = useState('dailySummary');

  // Company state
  const [currentCompany, setCurrentCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

  // User state
  const [currentUser, setCurrentUser] = useState(null);

  // Check for existing authentication on app startup
  useEffect(() => {
    checkExistingAuth();
  }, []);

  // Load companies when user logs in
  useEffect(() => {
    if (isLoggedIn && !companies.length) {
      loadCompanies();
    }
  }, [isLoggedIn]);

  // Check if user is already authenticated
  const checkExistingAuth = async () => {
    try {
      // First check if we have basic auth data
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      const savedCompanyId = localStorage.getItem('currentCompanyId');

      if (token && savedUser) {
        console.log('🔐 Found existing auth token, verifying...');

        // Verify token with backend
        const verificationResponse = await authService.verifyToken();

        if (verificationResponse.success) {
          // Parse saved user data
          const userData = JSON.parse(savedUser);
          setCurrentUser(userData);
          setIsLoggedIn(true);

          console.log('✅ Token verified successfully');

          // Load companies after setting logged in state
          await loadCompanies();

          // If there's a saved company ID, try to load that company
          if (savedCompanyId) {
            await loadSavedCompany(savedCompanyId);
          }
        } else {
          console.log('❌ Token verification failed:', verificationResponse.message);
          // Clear invalid auth data
          await authService.logout();
        }
      } else {
        console.log('ℹ️ No existing authentication found');
      }
    } catch (error) {
      console.error('❌ Error checking existing auth:', error);
      // Clear potentially corrupted data
      await authService.logout();
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Load companies from backend
  const loadCompanies = async () => {
    try {
      setIsLoadingCompanies(true);
      console.log('🏢 Loading companies...');

      const response = await companyService.getCompanies();

      if (response.success) {
        const companiesList = response.data.companies || [];
        setCompanies(companiesList);

        console.log('✅ Companies loaded:', companiesList.length);

        // If no current company is selected and we have companies, select the first one
        if (!currentCompany && companiesList.length > 0) {
          const firstCompany = companiesList[0];
          setCurrentCompany(firstCompany);
          localStorage.setItem('currentCompanyId', firstCompany.id || firstCompany._id);
          console.log('🎯 Auto-selected first company:', firstCompany.companyName);
        }
      } else {
        console.warn('⚠️ Failed to load companies:', response.message);
      }
    } catch (error) {
      console.error('❌ Error loading companies:', error);
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  // Load a previously saved company
  const loadSavedCompany = async (companyId) => {
    try {
      console.log('🔍 Loading saved company:', companyId);

      // For now, just find the company in the loaded companies list
      // TODO: Implement getCompanyById when ready
      const company = companies.find(c => (c.id || c._id) === companyId);

      if (company) {
        setCurrentCompany(company);
        console.log('✅ Saved company loaded:', company.companyName);
      } else {
        console.warn('⚠️ Saved company not found in companies list');
        localStorage.removeItem('currentCompanyId');
      }
    } catch (error) {
      console.error('❌ Error loading saved company:', error);
      localStorage.removeItem('currentCompanyId');
    }
  };

  // Handle successful login
  const handleLogin = (userData) => {
    console.log("✅ Login successful in App component:", userData);

    setIsLoggedIn(true);
    setCurrentUser(userData);

    // Save user data to localStorage (token already saved by authService)
    localStorage.setItem('user', JSON.stringify(userData));

    // Load companies after login
    loadCompanies();
  };

  // Handle logout
  const handleLogout = async () => {
    console.log("👋 Logging out...");

    // Call auth service logout
    await authService.logout();

    // Clear all state
    setIsLoggedIn(false);
    setCurrentUser(null);
    setCurrentCompany(null);
    setCompanies([]);
    setCurrentView('dailySummary');

    console.log("✅ Logout completed");
  };

  // Handle navigation changes
  const handleNavigation = (view) => {
    console.log('🧭 App: Navigating to:', view);
    setCurrentView(view);
  };

  // Handle company selection changes
  const handleCompanyChange = (company) => {
    console.log('🏢 App: Company changed to:', company?.companyName || 'None');
    setCurrentCompany(company);

    // Save company selection to localStorage
    if (company?.id || company?._id) {
      localStorage.setItem('currentCompanyId', company.id || company._id);
    } else {
      localStorage.removeItem('currentCompanyId');
    }
  };

  // Handle company creation (when a new company is added)
  const handleCompanyCreated = (newCompany) => {
    console.log('🆕 New company created:', newCompany);

    // Add to companies list
    setCompanies(prev => [...prev, newCompany]);

    // Select the new company
    setCurrentCompany(newCompany);
    localStorage.setItem('currentCompanyId', newCompany.id || newCompany._id);
  };

  // Show loading screen while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="App">
        <div className="d-flex justify-content-center align-items-center min-vh-100">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5 className="text-muted">Checking authentication...</h5>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        {isLoggedIn ? (
          <Layout
            onLogout={handleLogout}
            onNavigate={handleNavigation}
            currentView={currentView}
            currentCompany={currentCompany}
            companies={companies}
            onCompanyChange={handleCompanyChange}
            onCompanyCreated={handleCompanyCreated}
            currentUser={currentUser}
            isLoadingCompanies={isLoadingCompanies}
          >
            <HomePage
              onNavigate={handleNavigation}
              currentView={currentView}
              currentCompany={currentCompany}
              onCompanyChange={handleCompanyChange}
            />
          </Layout>
        ) : (
          <AuthPage onLogin={handleLogin} />
        )}
      </div>
    </Router>
  );
}

export default App;