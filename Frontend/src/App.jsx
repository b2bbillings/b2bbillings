import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import Layout from './Layout/Layout';
import HomePage from './Pages/HomePage';
import AuthPage from './Pages/AuthPage';

// Import services
import companyService from './services/companyService';
import authService from './services/authService';
import purchaseService from './services/purchaseService';

// Import form components
import SalesForm from './components/Home/Sales/SalesInvoice/SalesForm';
import PurchaseForm from './components/Home/Purchases/PurchaseForm';

function App() {
  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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
          setCurrentCompany(company);
        }
      } catch (error) {
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

      const response = await companyService.getCompanies();
      const isSuccess = response?.success === true || response?.status === 'success';

      if (isSuccess) {
        const companiesList = response.data?.companies || response.data || response.companies || [];
        setCompanies(companiesList);
        await handleAutoCompanySelection(companiesList);
      }
    } catch (error) {
      // Handle error silently or show user-friendly message
      setCompanies([]);
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const handleAutoCompanySelection = async (companiesList) => {
    try {
      if (!companiesList || companiesList.length === 0 || currentCompany) {
        return;
      }

      // Try to restore from localStorage first
      const savedCompany = localStorage.getItem('currentCompany');
      if (savedCompany) {
        try {
          const company = JSON.parse(savedCompany);
          const companyId = company.id || company._id;
          const foundCompany = companiesList.find(c => (c.id || c._id) === companyId);

          if (foundCompany) {
            await setCompanyAsActive(foundCompany);
            return;
          } else {
            localStorage.removeItem('currentCompany');
          }
        } catch (error) {
          localStorage.removeItem('currentCompany');
        }
      }

      // Auto-select the first company
      const firstCompany = companiesList[0];
      await setCompanyAsActive(firstCompany);
    } catch (error) {
      // Handle error silently
    }
  };

  const setCompanyAsActive = async (company) => {
    try {
      if (!company) return;

      // Standardize company object format
      const standardizedCompany = {
        id: company.id || company._id,
        _id: company.id || company._id,
        name: company.businessName || company.name,
        businessName: company.businessName || company.name,
        email: company.email,
        phoneNumber: company.phoneNumber,
        businessType: company.businessType,
        address: company.address,
        city: company.city,
        state: company.state,
        pincode: company.pincode,
        gstNumber: company.gstNumber
      };

      setCurrentCompany(standardizedCompany);
      localStorage.setItem('currentCompany', JSON.stringify(standardizedCompany));
    } catch (error) {
      // Handle error silently
    }
  };

  const checkExistingAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (!token || !savedUser) {
        setIsCheckingAuth(false);
        return;
      }

      const verificationResponse = await authService.verifyToken();

      if (verificationResponse && verificationResponse.success === true) {
        const userData = JSON.parse(savedUser);
        setCurrentUser(userData);
        setIsLoggedIn(true);
        await loadCompanies();
      } else if (verificationResponse?.shouldRetry) {
        const userData = JSON.parse(savedUser);
        setCurrentUser(userData);
        setIsLoggedIn(true);
        await loadCompanies();
      } else {
        await authService.clearAuthData();
        localStorage.removeItem('currentCompany');
      }
    } catch (error) {
      await authService.clearAuthData();
      localStorage.removeItem('currentCompany');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogin = async (userData) => {
    try {
      setIsLoggedIn(true);
      setCurrentUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      await loadCompanies();
    } catch (error) {
      // Handle error appropriately
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setIsLoggedIn(false);
      setCurrentUser(null);
      setCurrentCompany(null);
      setCompanies([]);
      localStorage.removeItem('currentCompany');
    } catch (error) {
      // Handle error appropriately
    }
  };

  const handleCompanyChange = async (company) => {
    try {
      if (company) {
        await setCompanyAsActive(company);
      } else {
        setCurrentCompany(null);
        localStorage.removeItem('currentCompany');
      }
    } catch (error) {
      // Handle error appropriately
    }
  };

  const handleCompanyCreated = async (newCompany) => {
    try {
      setCompanies(prev => [...prev, newCompany]);
      await setCompanyAsActive(newCompany);
    } catch (error) {
      // Handle error appropriately
    }
  };

  const handleCompanyUpdated = async (updatedCompany) => {
    try {
      setCompanies(prev =>
        prev.map(company =>
          (company.id || company._id) === (updatedCompany.id || updatedCompany._id)
            ? updatedCompany
            : company
        )
      );

      if (currentCompany && (currentCompany.id === updatedCompany.id || currentCompany._id === updatedCompany._id)) {
        await setCompanyAsActive(updatedCompany);
      }
    } catch (error) {
      // Handle error appropriately
    }
  };

  const getCompanyId = () => {
    return currentCompany?.id || currentCompany?._id;
  };

  const navigateToListView = (section) => {
    const companyId = getCompanyId();
    if (companyId) {
      window.location.href = `/companies/${companyId}/${section}`;
    }
  };

  // Toast helper function
  const showToast = (message, type) => {
    if (type === 'error') {
      alert(`Error: ${message}`);
    } else if (type === 'success') {
      // Success messages can be handled more elegantly
      // For now, we'll just log them
    }
  };

  // Form handlers
  const handleSalesFormSave = async (saleData) => {
    try {
      // TODO: Integrate with sales service when ready
      // const response = await salesService.createInvoice(saleData);
      alert('Sale saved successfully!');
      navigateToListView('sales');
      return { success: true };
    } catch (error) {
      alert('Error saving sale: ' + error.message);
      return { success: false, error: error.message };
    }
  };

  const handleSalesFormUpdate = async (saleData) => {
    try {
      // TODO: Integrate with sales service when ready
      // const response = await salesService.updateInvoice(id, saleData);
      alert('Sale updated successfully!');
      navigateToListView('sales');
      return { success: true };
    } catch (error) {
      alert('Error updating sale: ' + error.message);
      return { success: false, error: error.message };
    }
  };

  const handlePurchaseFormSave = async (purchaseData) => {
    try {
      const result = await purchaseService.createPurchaseWithTransaction(purchaseData);

      if (result && result.success) {
        alert('Purchase created successfully!');
        navigateToListView('purchase-bills');
        return result;
      } else {
        throw new Error(result?.message || 'Failed to create purchase');
      }
    } catch (error) {
      alert('Error saving purchase: ' + error.message);
      return {
        success: false,
        error: error.message,
        message: error.message
      };
    }
  };

  const handlePurchaseFormUpdate = async (purchaseData) => {
    try {
      const result = await purchaseService.updatePurchase(purchaseData.id, purchaseData);

      if (result && result.success) {
        alert('Purchase updated successfully!');
        navigateToListView('purchase-bills');
        return result;
      } else {
        throw new Error(result?.message || 'Failed to update purchase');
      }
    } catch (error) {
      alert('Error updating purchase: ' + error.message);
      return {
        success: false,
        error: error.message,
        message: error.message
      };
    }
  };

  // Protected Route Component
  const ProtectedRoute = ({ children }) => {
    if (!isLoggedIn) {
      return <Navigate to="/auth" replace />;
    }

    return (
      <Layout
        onLogout={handleLogout}
        currentCompany={currentCompany}
        companies={companies}
        onCompanyChange={handleCompanyChange}
        onCompanyCreated={handleCompanyCreated}
        onCompanyUpdated={handleCompanyUpdated}
        currentUser={currentUser}
        isLoadingCompanies={isLoadingCompanies}
      >
        {children}
      </Layout>
    );
  };

  // Auto-redirect Component
  const AutoRedirect = () => {
    useEffect(() => {
      if (companies.length > 0 && currentCompany) {
        const companyId = currentCompany.id || currentCompany._id;
        window.location.replace(`/companies/${companyId}/dashboard`);
      }
    }, [companies, currentCompany]);

    if (companies.length === 0) {
      return (
        <div className="container mt-5">
          <div className="text-center">
            <h3>Welcome! 🏢</h3>
            <p>Please create your first company to get started.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Setting up your workspace...</p>
        </div>
      </div>
    );
  };

  // Loading screen while checking authentication
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
        <Routes>
          {/* Auth Route */}
          <Route
            path="/auth"
            element={
              isLoggedIn ? <Navigate to="/" replace /> : <AuthPage onLogin={handleLogin} />
            }
          />

          {/* Root Route */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AutoRedirect />
              </ProtectedRoute>
            }
          />

          {/* Company-specific Routes */}
          <Route
            path="/companies/:companyId/*"
            element={
              <ProtectedRoute>
                <Routes>
                  <Route
                    path="*"
                    element={
                      <Routes>
                        {/* Dedicated Form Routes */}
                        <Route
                          path="purchases/add"
                          element={
                            <PurchaseForm
                              onSave={handlePurchaseFormSave}
                              onCancel={() => navigateToListView('purchase-bills')}
                              onExit={() => navigateToListView('purchase-bills')}
                              inventoryItems={[]}
                              categories={[]}
                              bankAccounts={[]}
                              addToast={showToast}
                            />
                          }
                        />

                        <Route
                          path="purchases/:id/edit"
                          element={
                            <PurchaseForm
                              onSave={handlePurchaseFormUpdate}
                              onCancel={() => navigateToListView('purchase-bills')}
                              onExit={() => navigateToListView('purchase-bills')}
                              inventoryItems={[]}
                              categories={[]}
                              bankAccounts={[]}
                              addToast={showToast}
                              isEdit={true}
                            />
                          }
                        />

                        <Route
                          path="sales/add"
                          element={
                            <SalesForm
                              onSave={handleSalesFormSave}
                              onCancel={() => navigateToListView('sales')}
                              currentCompany={currentCompany}
                              isEdit={false}
                            />
                          }
                        />

                        <Route
                          path="sales/:id/edit"
                          element={
                            <SalesForm
                              onSave={handleSalesFormUpdate}
                              onCancel={() => navigateToListView('sales')}
                              currentCompany={currentCompany}
                              isEdit={true}
                            />
                          }
                        />

                        {/* All other routes handled by HomePage */}
                        <Route
                          path="*"
                          element={
                            <HomePage
                              currentCompany={currentCompany}
                              onCompanyChange={handleCompanyChange}
                              companies={companies}
                              currentUser={currentUser}
                            />
                          }
                        />
                      </Routes>
                    }
                  />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* Global Fallback Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;