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

  // Restore company selection from localStorage on component mount
  useEffect(() => {
    const restoreCompanySelection = () => {
      try {
        const savedCompany = localStorage.getItem('currentCompany');
        if (savedCompany) {
          const company = JSON.parse(savedCompany);
          console.log('🔄 Restoring company from localStorage:', company.name || company.businessName);
          setCurrentCompany(company);
        }
      } catch (error) {
        console.warn('⚠️ Failed to restore company from localStorage:', error);
        localStorage.removeItem('currentCompany');
      }
    };

    if (isLoggedIn) {
      restoreCompanySelection();
    }
  }, [isLoggedIn]);

  const loadCompanies = async () => {
    try {
      setIsLoadingCompanies(true);
      console.log('🏢 Loading companies...');

      const response = await companyService.getCompanies();
      console.log('🔍 Companies API response:', response);

      // Handle different response formats from backend
      const isSuccess = response?.success === true || response?.status === 'success';
      
      if (isSuccess) {
        // Extract companies array from various possible response structures
        const companiesList = response.data?.companies || response.data || response.companies || [];
        
        setCompanies(companiesList);
        console.log('✅ Companies loaded:', companiesList.length);
        console.log('📋 Companies list:', companiesList.map(c => ({ 
          id: c.id || c._id, 
          name: c.businessName || c.name 
        })));

        // Auto-select company logic
        await handleAutoCompanySelection(companiesList);
        
      } else {
        console.warn('⚠️ Failed to load companies. Response:', response);
        // If no companies exist, show appropriate message
        if (response?.message?.includes('No companies found')) {
          console.log('ℹ️ No companies found - user needs to create one');
        }
      }
    } catch (error) {
      console.error('❌ Error loading companies:', error);
      
      // Handle specific error cases
      if (error.message?.includes('No company selected')) {
        console.log('ℹ️ User needs to create or select a company first');
      }
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const handleAutoCompanySelection = async (companiesList) => {
    try {
      if (!companiesList || companiesList.length === 0) {
        console.log('ℹ️ No companies available for auto-selection');
        return;
      }

      // Check if we already have a current company set
      if (currentCompany) {
        console.log('ℹ️ Company already selected:', currentCompany.name || currentCompany.businessName);
        return;
      }

      // Try to restore from localStorage first
      const savedCompany = localStorage.getItem('currentCompany');
      if (savedCompany) {
        try {
          const company = JSON.parse(savedCompany);
          const companyId = company.id || company._id;
          
          // Verify the saved company still exists in the list
          const foundCompany = companiesList.find(c => (c.id || c._id) === companyId);
          
          if (foundCompany) {
            await setCompanyAsActive(foundCompany);
            console.log('✅ Restored saved company:', foundCompany.businessName || foundCompany.name);
            return;
          } else {
            console.warn('⚠️ Saved company not found in current list, clearing localStorage');
            localStorage.removeItem('currentCompany');
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse saved company, clearing localStorage:', error);
          localStorage.removeItem('currentCompany');
        }
      }

      // No valid saved company, auto-select the first one
      const firstCompany = companiesList[0];
      await setCompanyAsActive(firstCompany);
      console.log('🎯 Auto-selected first company:', firstCompany.businessName || firstCompany.name);
      
    } catch (error) {
      console.error('❌ Error in auto company selection:', error);
    }
  };

  const setCompanyAsActive = async (company) => {
    try {
      if (!company) {
        console.warn('⚠️ No company provided to setCompanyAsActive');
        return;
      }

      // Standardize company object format
      const standardizedCompany = {
        id: company.id || company._id,
        _id: company.id || company._id,
        name: company.businessName || company.name,
        businessName: company.businessName || company.name,
        // Include other important fields
        email: company.email,
        phoneNumber: company.phoneNumber,
        businessType: company.businessType,
        address: company.address,
        city: company.city,
        state: company.state,
        pincode: company.pincode,
        gstNumber: company.gstNumber
      };

      // Set in component state
      setCurrentCompany(standardizedCompany);

      // Save to localStorage for persistence
      localStorage.setItem('currentCompany', JSON.stringify(standardizedCompany));
      
      console.log('✅ Company set as active:', {
        id: standardizedCompany.id,
        name: standardizedCompany.name
      });

    } catch (error) {
      console.error('❌ Error setting company as active:', error);
    }
  };

  const checkExistingAuth = async () => {
    try {
      console.log('🔍 Checking existing authentication...');

      // First check if we have basic auth data
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (!token || !savedUser) {
        console.log('ℹ️ No existing authentication found');
        setIsCheckingAuth(false);
        return;
      }

      console.log('🔐 Found existing auth token, verifying...');

      // Verify token with backend
      const verificationResponse = await authService.verifyToken();

      if (verificationResponse && verificationResponse.success === true) {
        // Parse saved user data
        const userData = JSON.parse(savedUser);
        setCurrentUser(userData);
        setIsLoggedIn(true);

        console.log('✅ Token verified successfully for:', userData.name);

        // Load companies after setting logged in state
        await loadCompanies();
        
      } else if (verificationResponse?.shouldRetry) {
        // Network error - keep user logged in but show warning
        console.log('⚠️ Network error during token verification, keeping user logged in');
        const userData = JSON.parse(savedUser);
        setCurrentUser(userData);
        setIsLoggedIn(true);
        
        // Still try to load companies
        await loadCompanies();
        
      } else {
        console.log('❌ Token verification failed:', verificationResponse?.message || 'Invalid token');
        // Clear invalid auth data
        await authService.clearAuthData();
        // Also clear company data
        localStorage.removeItem('currentCompany');
      }
    } catch (error) {
      console.error('❌ Error checking existing auth:', error);
      // Clear potentially corrupted data
      await authService.clearAuthData();
      localStorage.removeItem('currentCompany');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Handle successful login
  const handleLogin = async (userData) => {
    try {
      console.log("✅ Login successful in App component:", userData);

      setIsLoggedIn(true);
      setCurrentUser(userData);

      // Save user data to localStorage (token already saved by authService)
      localStorage.setItem('user', JSON.stringify(userData));

      console.log("🏢 Loading companies after successful login...");
      
      // Load companies after login
      await loadCompanies();
      
    } catch (error) {
      console.error('❌ Error in handleLogin:', error);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      console.log("👋 Logging out...");

      // Call auth service logout
      await authService.logout();

      // Clear all state
      setIsLoggedIn(false);
      setCurrentUser(null);
      setCurrentCompany(null);
      setCompanies([]);
      setCurrentView('dailySummary');

      // Clear localStorage
      localStorage.removeItem('currentCompany');

      console.log("✅ Logout completed");
    } catch (error) {
      console.error('❌ Error during logout:', error);
    }
  };

  // Handle navigation changes
  const handleNavigation = (view) => {
    console.log('🧭 App: Navigating to:', view);
    setCurrentView(view);
  };

  // Handle company selection changes
  const handleCompanyChange = async (company) => {
    try {
      console.log('🏢 App: Company change request:', company?.businessName || company?.name || 'None');
      
      if (company) {
        await setCompanyAsActive(company);
      } else {
        // Clear company selection
        setCurrentCompany(null);
        localStorage.removeItem('currentCompany');
        console.log('🗑️ Company selection cleared');
      }
    } catch (error) {
      console.error('❌ Error handling company change:', error);
    }
  };

  // Handle company creation (when a new company is added)
  const handleCompanyCreated = async (newCompany) => {
    try {
      console.log('🆕 New company created:', newCompany);

      // Add to companies list
      setCompanies(prev => [...prev, newCompany]);

      // Automatically select the new company
      await setCompanyAsActive(newCompany);
      
      console.log('✅ New company automatically selected');
    } catch (error) {
      console.error('❌ Error handling company creation:', error);
    }
  };

  // Handle company updates
  const handleCompanyUpdated = async (updatedCompany) => {
    try {
      console.log('📝 Company updated:', updatedCompany);

      // Update in companies list
      setCompanies(prev => 
        prev.map(company => 
          (company.id || company._id) === (updatedCompany.id || updatedCompany._id) 
            ? updatedCompany 
            : company
        )
      );

      // If it's the current company, update current company too
      if (currentCompany && (currentCompany.id === updatedCompany.id || currentCompany._id === updatedCompany._id)) {
        await setCompanyAsActive(updatedCompany);
        console.log('✅ Current company updated');
      }
    } catch (error) {
      console.error('❌ Error handling company update:', error);
    }
  };

  // Debug function to check app state
  const debugAppState = () => {
    console.log('🔍 App Debug State:', {
      isLoggedIn,
      currentUser: currentUser ? { 
        id: currentUser.id, 
        name: currentUser.name, 
        email: currentUser.email 
      } : null,
      currentCompany: currentCompany ? {
        id: currentCompany.id,
        name: currentCompany.name
      } : null,
      companiesCount: companies.length,
      currentView,
      localStorage: {
        hasToken: !!localStorage.getItem('token'),
        hasUser: !!localStorage.getItem('user'),
        hasCurrentCompany: !!localStorage.getItem('currentCompany'),
        currentCompanyValue: localStorage.getItem('currentCompany')
      }
    });
  };

  // Expose debug function in development
  if (process.env.NODE_ENV === 'development') {
    window.debugAppState = debugAppState;
  }

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
            <p className="text-muted small">Please wait while we verify your session...</p>
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
            onCompanyUpdated={handleCompanyUpdated}
            currentUser={currentUser}
            isLoadingCompanies={isLoadingCompanies}
          >
            <HomePage
              onNavigate={handleNavigation}
              currentView={currentView}
              currentCompany={currentCompany}
              onCompanyChange={handleCompanyChange}
              companies={companies}
              currentUser={currentUser}
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