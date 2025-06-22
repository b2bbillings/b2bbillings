import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import Layout from './Layout/Layout';
import HomePage from './Pages/HomePage';
import AuthPage from './Pages/AuthPage';

// Import services
import companyService from './services/companyService';
import authService from './services/authService';
import purchaseService from './services/purchaseService';
import salesService from './services/salesService';
import saleOrderService from './services/saleOrderService';

// Import form components
import SalesForm from './components/Home/Sales/SalesInvoice/SalesForm';
import PurchaseForm from './components/Home/Purchases/PurchaseForm';
import SalesOrderForm from './components/Home/Sales/SalesOrder/SalesOrderForm';
import EditSalesInvoice from './components/Home/Sales/EditSalesInvoice';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    checkExistingAuth();
  }, []);

  useEffect(() => {
    if (isLoggedIn && !companies.length) {
      loadCompanies();
    }
  }, [isLoggedIn]);

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

      const firstCompany = companiesList[0];
      await setCompanyAsActive(firstCompany);
    } catch (error) {
      // Handle error silently
    }
  };

  const setCompanyAsActive = async (company) => {
    try {
      if (!company) return;

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

  // Helper to get companyId from all possible sources
  const getCompanyId = () => {
    return (
      currentCompany?.id ||
      currentCompany?._id ||
      (typeof currentCompany === 'string' ? currentCompany : null) ||
      localStorage.getItem('selectedCompanyId') ||
      localStorage.getItem('companyId') ||
      sessionStorage.getItem('companyId')
    );
  };

  const navigateToListView = (section) => {
    const companyId = getCompanyId();
    if (companyId) {
      window.location.href = `/companies/${companyId}/${section}`;
    }
  };

  const showToast = (message, type = 'info') => {
    console.log(`Toast [${type}]: ${message}`);
    if (type === 'error') {
      alert(`Error: ${message}`);
    } else if (type === 'success') {
      console.log(`Success: ${message}`);
    }
  };

  // --- FIX: Always include companyId in all save/update handlers ---

  const handleSalesFormSave = async (saleData) => {
    try {
      console.log('🧾 Saving sales invoice:', saleData);

      // FIX: Always include companyId
      const effectiveCompanyId =
        saleData.companyId ||
        getCompanyId() ||
        (currentCompany?.id || currentCompany?._id);

      if (!effectiveCompanyId) {
        throw new Error('Company ID is required');
      }

      const response = await salesService.createInvoice({
        ...saleData,
        companyId: effectiveCompanyId,
        documentType: 'invoice',
        mode: 'invoices'
      });

      if (response?.success) {
        showToast('Sales invoice created successfully!', 'success');
        navigateToListView('sales');
        return response;
      } else {
        throw new Error(response?.message || 'Failed to create sales invoice');
      }
    } catch (error) {
      console.error('❌ Error saving sales invoice:', error);
      showToast('Error saving sales invoice: ' + error.message, 'error');
      return { success: false, error: error.message };
    }
  };

  const handleSalesFormUpdate = async (saleData) => {
    try {
      console.log('🧾 Updating sales invoice:', saleData);

      const effectiveCompanyId =
        saleData.companyId ||
        getCompanyId() ||
        (currentCompany?.id || currentCompany?._id);

      if (!effectiveCompanyId) {
        throw new Error('Company ID is required');
      }

      const response = await salesService.updateInvoice(saleData.id, {
        ...saleData,
        companyId: effectiveCompanyId,
        documentType: 'invoice',
        mode: 'invoices'
      });

      if (response?.success) {
        showToast('Sales invoice updated successfully!', 'success');
        navigateToListView('sales');
        return response;
      } else {
        throw new Error(response?.message || 'Failed to update sales invoice');
      }
    } catch (error) {
      console.error('❌ Error updating sales invoice:', error);
      showToast('Error updating sales invoice: ' + error.message, 'error');
      return { success: false, error: error.message };
    }
  };

  const handleQuotationSave = async (quotationData) => {
    try {
      console.log('📋 Saving quotation:', quotationData);

      const effectiveCompanyId =
        quotationData.companyId ||
        getCompanyId() ||
        (currentCompany?.id || currentCompany?._id);

      if (!effectiveCompanyId) {
        throw new Error('Company ID is required');
      }

      const response = await saleOrderService.createSalesOrder({
        ...quotationData,
        companyId: effectiveCompanyId,
        documentType: 'quotation',
        orderType: 'quotation',
        mode: 'quotations'
      });

      if (response?.success) {
        showToast('Quotation created successfully!', 'success');
        navigateToListView('quotations');
        return response;
      } else {
        throw new Error(response?.message || 'Failed to create quotation');
      }
    } catch (error) {
      console.error('❌ Error saving quotation:', error);
      showToast('Error saving quotation: ' + error.message, 'error');
      return { success: false, error: error.message };
    }
  };

  const handleQuotationUpdate = async (quotationData) => {
    try {
      console.log('📋 Updating quotation:', quotationData);

      const effectiveCompanyId =
        quotationData.companyId ||
        getCompanyId() ||
        (currentCompany?.id || currentCompany?._id);

      if (!effectiveCompanyId) {
        throw new Error('Company ID is required');
      }

      const response = await saleOrderService.updateSalesOrder(quotationData.id, {
        ...quotationData,
        companyId: effectiveCompanyId,
        documentType: 'quotation',
        orderType: 'quotation',
        mode: 'quotations'
      });

      if (response?.success) {
        showToast('Quotation updated successfully!', 'success');
        navigateToListView('quotations');
        return response;
      } else {
        throw new Error(response?.message || 'Failed to update quotation');
      }
    } catch (error) {
      console.error('❌ Error updating quotation:', error);
      showToast('Error updating quotation: ' + error.message, 'error');
      return { success: false, error: error.message };
    }
  };

  const handlePurchaseFormSave = async (purchaseData) => {
    try {
      const effectiveCompanyId =
        purchaseData.companyId ||
        getCompanyId() ||
        (currentCompany?.id || currentCompany?._id);

      if (!effectiveCompanyId) {
        throw new Error('Company ID is required');
      }

      const result = await purchaseService.createPurchaseWithTransaction({
        ...purchaseData,
        companyId: effectiveCompanyId
      });

      if (result && result.success) {
        showToast('Purchase created successfully!', 'success');
        navigateToListView('purchase-bills');
        return result;
      } else {
        throw new Error(result?.message || 'Failed to create purchase');
      }
    } catch (error) {
      showToast('Error saving purchase: ' + error.message, 'error');
      return {
        success: false,
        error: error.message,
        message: error.message
      };
    }
  };

  const handlePurchaseFormUpdate = async (purchaseData) => {
    try {
      const effectiveCompanyId =
        purchaseData.companyId ||
        getCompanyId() ||
        (currentCompany?.id || currentCompany?._id);

      if (!effectiveCompanyId) {
        throw new Error('Company ID is required');
      }

      const result = await purchaseService.updatePurchase(purchaseData.id, {
        ...purchaseData,
        companyId: effectiveCompanyId
      });

      if (result && result.success) {
        showToast('Purchase updated successfully!', 'success');
        navigateToListView('purchase-bills');
        return result;
      } else {
        throw new Error(result?.message || 'Failed to update purchase');
      }
    } catch (error) {
      showToast('Error updating purchase: ' + error.message, 'error');
      return {
        success: false,
        error: error.message,
        message: error.message
      };
    }
  };

  const handleSalesOrderSave = async (orderData) => {
    try {
      console.log('📦 Saving sales order:', orderData);

      const effectiveCompanyId =
        orderData.companyId ||
        getCompanyId() ||
        (currentCompany?.id || currentCompany?._id);

      if (!effectiveCompanyId) {
        throw new Error('Company ID is required');
      }

      const response = await saleOrderService.createSalesOrder({
        ...orderData,
        companyId: effectiveCompanyId,
        documentType: 'sales_order',
        orderType: 'sales_order',
        mode: 'sales_orders'
      });

      if (response?.success) {
        showToast('Sales order created successfully!', 'success');
        navigateToListView('sales-orders');
        return response;
      } else {
        throw new Error(response?.message || 'Failed to create sales order');
      }
    } catch (error) {
      console.error('❌ Error saving sales order:', error);
      showToast('Error saving sales order: ' + error.message, 'error');
      return { success: false, error: error.message };
    }
  };

  // --- Wrappers and Routing remain unchanged except for passing currentUser where needed ---

  const SalesFormWrapper = ({ isEdit = false }) => {
    const { companyId } = useParams();

    React.useEffect(() => {
      console.log('🧾 SalesFormWrapper mounted:', { isEdit, companyId, currentCompany });
    }, [isEdit, companyId]);

    if (!currentCompany) {
      return (
        <div className="container mt-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading company...</span>
          </div>
          <p className="mt-3">Loading company information...</p>
        </div>
      );
    }

    return (
      <SalesForm
        onSave={isEdit ? handleSalesFormUpdate : handleSalesFormSave}
        onCancel={() => window.location.href = `/companies/${companyId}/sales`}
        onExit={() => window.location.href = `/companies/${companyId}/sales`}
        currentCompany={currentCompany}
        currentUser={currentUser}
        companyId={companyId}
        isEdit={isEdit}
        editMode={isEdit}
        mode="invoices"
        documentType="invoice"
        formType="sales"
        pageTitle={isEdit ? "Edit Sales Invoice" : "Create Sales Invoice"}
        addToast={showToast}
      />
    );
  };

  const QuotationFormWrapper = ({ isEdit = false }) => {
    const { companyId, quotationId } = useParams();
    const navigate = useNavigate();

    React.useEffect(() => {
      console.log('📋 QuotationFormWrapper mounted:', {
        isEdit,
        companyId,
        quotationId,
        currentCompany: !!currentCompany
      });
    }, [isEdit, companyId, quotationId]);

    if (!currentCompany) {
      return (
        <div className="container mt-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading company...</span>
          </div>
          <p className="mt-3">Loading company information...</p>
        </div>
      );
    }

    return (
      <SalesOrderForm
        isPageMode={true}
        show={true}
        orderType="quotation"
        editMode={isEdit}
        orderId={quotationId}
        onSaveOrder={isEdit ? handleQuotationUpdate : handleQuotationSave}
        onHide={() => navigate(`/companies/${companyId}/quotations`)}
        onCancel={() => navigate(`/companies/${companyId}/quotations`)}
        companyId={companyId}
        currentCompany={currentCompany}
        currentUser={currentUser}
        addToast={showToast}
        onNavigate={(page) => {
          console.log('📋 SalesOrderForm navigation:', page);
          if (page === 'quotations') {
            navigate(`/companies/${companyId}/quotations`);
          }
        }}
        isOnline={true}
      />
    );
  };

  const PurchaseFormWrapper = ({ isEdit = false }) => {
    const { companyId } = useParams();

    if (!currentCompany) {
      return (
        <div className="container mt-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading company...</span>
          </div>
          <p className="mt-3">Loading company information...</p>
        </div>
      );
    }

    return (
      <PurchaseForm
        onSave={isEdit ? handlePurchaseFormUpdate : handlePurchaseFormSave}
        onCancel={() => window.location.href = `/companies/${companyId}/purchase-bills`}
        onExit={() => window.location.href = `/companies/${companyId}/purchase-bills`}
        inventoryItems={[]}
        categories={[]}
        bankAccounts={[]}
        addToast={showToast}
        isEdit={isEdit}
        companyId={companyId}
        currentCompany={currentCompany}
      />
    );
  };

  const EditSalesInvoiceWrapper = ({ mode, documentType }) => {
    const { companyId, transactionId } = useParams();

    React.useEffect(() => {
      console.log('✏️ EditSalesInvoiceWrapper mounted:', {
        mode,
        documentType,
        companyId,
        transactionId,
        currentCompany
      });
    }, [mode, documentType, companyId, transactionId]);

    if (!currentCompany) {
      return (
        <div className="container mt-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading company...</span>
          </div>
          <p className="mt-3">Loading company information...</p>
        </div>
      );
    }

    return (
      <EditSalesInvoice
        addToast={showToast}
        mode={mode}
        documentType={documentType}
        companyId={companyId}
        transactionId={transactionId}
        currentCompany={currentCompany}
        currentUser={currentUser}
        companies={companies}
        onSave={mode === 'quotations' ? handleQuotationUpdate : handleSalesFormUpdate}
        onCancel={() => window.location.href = `/companies/${companyId}/${mode === 'quotations' ? 'quotations' : 'sales'}`}
      />
    );
  };

  const SalesOrderFormWrapper = ({ isEdit = false }) => {
    const { companyId, id } = useParams();

    if (!currentCompany) {
      return (
        <div className="container mt-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading company...</span>
          </div>
          <p className="mt-3">Loading company information...</p>
        </div>
      );
    }

    return (
      <SalesOrderForm
        show={true}
        onHide={() => window.location.href = `/companies/${companyId}/sales-orders`}
        onSaveOrder={handleSalesOrderSave}
        orderType="sales_order"
        currentCompany={currentCompany}
        companyId={companyId}
        addToast={showToast}
        onNavigate={navigateToListView}
        isEdit={isEdit}
        orderId={id}
        editMode={isEdit}
        isPageMode={true}
      />
    );
  };

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
          <Route
            path="/auth"
            element={
              isLoggedIn ? <Navigate to="/" replace /> : <AuthPage onLogin={handleLogin} />
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AutoRedirect />
              </ProtectedRoute>
            }
          />

          <Route
            path="/companies/:companyId/purchases/add"
            element={
              <ProtectedRoute>
                <PurchaseFormWrapper isEdit={false} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/companies/:companyId/purchases/:id/edit"
            element={
              <ProtectedRoute>
                <PurchaseFormWrapper isEdit={true} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/companies/:companyId/sales/add"
            element={
              <ProtectedRoute>
                <SalesFormWrapper isEdit={false} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/companies/:companyId/sales/edit/:transactionId"
            element={
              <ProtectedRoute>
                <EditSalesInvoiceWrapper mode="invoices" documentType="invoice" />
              </ProtectedRoute>
            }
          />

          <Route
            path="/companies/:companyId/quotations/add"
            element={
              <ProtectedRoute>
                <QuotationFormWrapper isEdit={false} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/companies/:companyId/quotations/edit/:transactionId"
            element={
              <ProtectedRoute>
                <EditSalesInvoiceWrapper mode="quotations" documentType="quotation" />
              </ProtectedRoute>
            }
          />

          <Route
            path="/companies/:companyId/sales-orders/add"
            element={
              <ProtectedRoute>
                <SalesOrderFormWrapper isEdit={false} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/companies/:companyId/sales-orders/:id/edit"
            element={
              <ProtectedRoute>
                <SalesOrderFormWrapper isEdit={true} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/companies/:companyId/*"
            element={
              <ProtectedRoute>
                <HomePage
                  currentCompany={currentCompany}
                  onCompanyChange={handleCompanyChange}
                  companies={companies}
                  currentUser={currentUser}
                />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;