import React, {useState, useEffect} from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
} from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import Layout from "./Layout/Layout";
import HomePage from "./Pages/HomePage";
import AuthPage from "./Pages/AuthPage";
import CommunityPage from "./Pages/CommunityPage";

// Import Admin Dashboard
import AdminDashboard from "./components/Admin/AdminDashboard";

// Import services
import companyService from "./services/companyService";
import authService from "./services/authService";
import purchaseService from "./services/purchaseService";
import purchaseOrderService from "./services/purchaseOrderService";
import salesService from "./services/salesService";
import saleOrderService from "./services/saleOrderService";

// Import form components
import SalesForm from "./components/Home/Sales/SalesInvoice/SalesForm";
import PurchaseForm from "./components/Home/Purchases/PurchaseForm";
import SalesOrderForm from "./components/Home/Sales/SalesOrder/SalesOrderForm";
import EditSalesInvoice from "./components/Home/Sales/EditSalesInvoice";
import EditPurchaseBill from "./components/Home/Purchases/EditPurchaseBill";
import PurchaseOrderForm from "./components/Home/Purchases/PurchaseOrderForm";

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
    if (isLoggedIn && companies.length === 0 && !isLoadingCompanies) {
      loadCompanies();
    }
  }, [isLoggedIn, companies.length, isLoadingCompanies]);

  useEffect(() => {
    const restoreCompanySelection = () => {
      try {
        const savedCompany = localStorage.getItem("currentCompany");
        if (savedCompany) {
          const company = JSON.parse(savedCompany);
          setCurrentCompany(company);
        }
      } catch (error) {
        localStorage.removeItem("currentCompany");
      }
    };

    if (isLoggedIn) {
      restoreCompanySelection();
    }
  }, [isLoggedIn]);

  const loadCompanies = async () => {
    if (isLoadingCompanies) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return;
      }

      setIsLoadingCompanies(true);

      const response = await companyService.getCompanies({
        page: 1,
        limit: 50,
        search: "",
        businessType: "",
        businessCategory: "",
        state: "",
        city: "",
        isActive: "true",
      });

      const isSuccess =
        response?.success === true || response?.status === "success";

      if (isSuccess) {
        const companiesList =
          response.data?.companies || response.data || response.companies || [];

        setCompanies(companiesList);

        if (!currentCompany && companiesList.length > 0) {
          await handleAutoCompanySelection(companiesList);
        }
      } else {
        setCompanies([]);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        await authService.clearAuthData();
        setIsLoggedIn(false);
        setCurrentUser(null);
        setCompanies([]);
        setCurrentCompany(null);
      } else if (error.response?.status === 400) {
        const errorMessage =
          error.response.data?.message ||
          error.response.data?.error?.message ||
          "Invalid request parameters";
        showToast(`Failed to load companies: ${errorMessage}`, "error");
      } else {
        const errorMessage = error.message || "Unknown error occurred";
        showToast(`Failed to load companies: ${errorMessage}`, "error");
      }

      setCompanies([]);
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const handleAutoCompanySelection = async (companiesList) => {
    try {
      if (!companiesList || companiesList.length === 0) {
        return;
      }

      if (currentCompany) {
        return;
      }

      const savedCompany = localStorage.getItem("currentCompany");
      if (savedCompany) {
        try {
          const company = JSON.parse(savedCompany);
          const companyId = company.id || company._id;
          const foundCompany = companiesList.find(
            (c) => (c.id || c._id) === companyId
          );

          if (foundCompany) {
            await setCompanyAsActive(foundCompany);
            return;
          } else {
            localStorage.removeItem("currentCompany");
          }
        } catch (error) {
          localStorage.removeItem("currentCompany");
        }
      }

      const firstCompany = companiesList[0];
      if (firstCompany) {
        await setCompanyAsActive(firstCompany);
      }
    } catch (error) {
      // Handle error silently
    }
  };

  const setCompanyAsActive = async (company) => {
    try {
      if (!company) {
        return;
      }

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
        gstNumber: company.gstNumber,
      };

      setCurrentCompany(standardizedCompany);
      localStorage.setItem(
        "currentCompany",
        JSON.stringify(standardizedCompany)
      );
    } catch (error) {
      // Handle error silently
    }
  };

  const checkExistingAuth = async () => {
    try {
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (!token || !savedUser) {
        setIsCheckingAuth(false);
        return;
      }

      const verificationResponse = await authService.verifyToken();

      if (verificationResponse && verificationResponse.success === true) {
        const userData = JSON.parse(savedUser);
        setCurrentUser(userData);
        setIsLoggedIn(true);

        if (companies.length === 0 && !isLoadingCompanies) {
          await loadCompanies();
        }
      } else if (verificationResponse?.shouldRetry) {
        const userData = JSON.parse(savedUser);
        setCurrentUser(userData);
        setIsLoggedIn(true);

        if (companies.length === 0 && !isLoadingCompanies) {
          await loadCompanies();
        }
      } else {
        await authService.clearAuthData();
        localStorage.removeItem("currentCompany");
      }
    } catch (error) {
      await authService.clearAuthData();
      localStorage.removeItem("currentCompany");
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogin = async (userData) => {
    try {
      setIsLoggedIn(true);
      setCurrentUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));

      if (companies.length === 0 && !isLoadingCompanies) {
        await loadCompanies();
      }
    } catch (error) {
      // Handle error silently
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setIsLoggedIn(false);
      setCurrentUser(null);
      setCurrentCompany(null);
      setCompanies([]);
      localStorage.removeItem("currentCompany");
    } catch (error) {
      // Handle error silently
    }
  };

  const handleCompanyChange = async (company) => {
    try {
      if (company) {
        await setCompanyAsActive(company);
      } else {
        setCurrentCompany(null);
        localStorage.removeItem("currentCompany");
      }
    } catch (error) {
      // Handle error silently
    }
  };

  const handleCompanyCreated = async (newCompany) => {
    try {
      setCompanies((prev) => [...prev, newCompany]);
      await setCompanyAsActive(newCompany);
    } catch (error) {
      // Handle error silently
    }
  };

  const handleCompanyUpdated = async (updatedCompany) => {
    try {
      setCompanies((prev) =>
        prev.map((company) =>
          (company.id || company._id) ===
          (updatedCompany.id || updatedCompany._id)
            ? updatedCompany
            : company
        )
      );

      if (
        currentCompany &&
        (currentCompany.id === updatedCompany.id ||
          currentCompany._id === updatedCompany._id)
      ) {
        await setCompanyAsActive(updatedCompany);
      }
    } catch (error) {
      // Handle error silently
    }
  };

  const getCompanyId = () => {
    return (
      currentCompany?.id ||
      currentCompany?._id ||
      (typeof currentCompany === "string" ? currentCompany : null) ||
      localStorage.getItem("selectedCompanyId") ||
      localStorage.getItem("companyId") ||
      sessionStorage.getItem("companyId")
    );
  };

  const navigateToListView = (section) => {
    const companyId = getCompanyId();
    if (companyId) {
      window.location.href = `/companies/${companyId}/${section}`;
    }
  };

  const showToast = (message, type = "info") => {
    if (type === "error") {
      alert(`Error: ${message}`);
    }
  };

  const handleSalesFormSave = async (saleData) => {
    try {
      const effectiveCompanyId =
        saleData.companyId ||
        getCompanyId() ||
        currentCompany?.id ||
        currentCompany?._id;

      if (!effectiveCompanyId) {
        throw new Error("Company ID is required");
      }

      const response = await salesService.createInvoice({
        ...saleData,
        companyId: effectiveCompanyId,
        documentType: "invoice",
        mode: "invoices",
      });

      if (response?.success) {
        showToast("Sales invoice created successfully!", "success");
        navigateToListView("sales");
        return response;
      } else {
        throw new Error(response?.message || "Failed to create sales invoice");
      }
    } catch (error) {
      showToast("Error saving sales invoice: " + error.message, "error");
      return {success: false, error: error.message};
    }
  };

  const handleSalesFormUpdate = async (saleData) => {
    try {
      const effectiveCompanyId =
        saleData.companyId ||
        getCompanyId() ||
        currentCompany?.id ||
        currentCompany?._id;

      if (!effectiveCompanyId) {
        throw new Error("Company ID is required");
      }

      const response = await salesService.updateInvoice(saleData.id, {
        ...saleData,
        companyId: effectiveCompanyId,
        documentType: "invoice",
        mode: "invoices",
      });

      if (response?.success) {
        showToast("Sales invoice updated successfully!", "success");
        navigateToListView("sales");
        return response;
      } else {
        throw new Error(response?.message || "Failed to update sales invoice");
      }
    } catch (error) {
      showToast("Error updating sales invoice: " + error.message, "error");
      return {success: false, error: error.message};
    }
  };

  const handleQuotationSave = async (quotationData) => {
    try {
      const effectiveCompanyId =
        quotationData.companyId ||
        getCompanyId() ||
        currentCompany?.id ||
        currentCompany?._id;

      if (!effectiveCompanyId) {
        throw new Error("Company ID is required");
      }

      const response = await saleOrderService.createSalesOrder({
        ...quotationData,
        companyId: effectiveCompanyId,
        documentType: "quotation",
        orderType: "quotation",
        mode: "quotations",
      });

      if (response?.success) {
        showToast("Quotation created successfully!", "success");
        navigateToListView("quotations");
        return response;
      } else {
        throw new Error(response?.message || "Failed to create quotation");
      }
    } catch (error) {
      showToast("Error saving quotation: " + error.message, "error");
      return {success: false, error: error.message};
    }
  };

  const handleQuotationUpdate = async (quotationData) => {
    try {
      const effectiveCompanyId =
        quotationData.companyId ||
        getCompanyId() ||
        currentCompany?.id ||
        currentCompany?._id;

      if (!effectiveCompanyId) {
        throw new Error("Company ID is required");
      }

      const response = await saleOrderService.updateSalesOrder(
        quotationData.id,
        {
          ...quotationData,
          companyId: effectiveCompanyId,
          documentType: "quotation",
          orderType: "quotation",
          mode: "quotations",
        }
      );

      if (response?.success) {
        showToast("Quotation updated successfully!", "success");
        navigateToListView("quotations");
        return response;
      } else {
        throw new Error(response?.message || "Failed to update quotation");
      }
    } catch (error) {
      showToast("Error updating quotation: " + error.message, "error");
      return {success: false, error: error.message};
    }
  };

  const handlePurchaseFormSave = async (purchaseData) => {
    try {
      const effectiveCompanyId =
        purchaseData.companyId ||
        getCompanyId() ||
        currentCompany?.id ||
        currentCompany?._id;

      if (!effectiveCompanyId) {
        throw new Error("Company ID is required");
      }

      const result = await purchaseService.createPurchaseWithTransaction({
        ...purchaseData,
        companyId: effectiveCompanyId,
        documentType: "purchase_bill",
        mode: "purchases",
      });

      if (result && result.success) {
        showToast("Purchase bill created successfully!", "success");
        navigateToListView("purchases");
        return result;
      } else {
        throw new Error(result?.message || "Failed to create purchase bill");
      }
    } catch (error) {
      showToast("Error saving purchase bill: " + error.message, "error");
      return {
        success: false,
        error: error.message,
        message: error.message,
      };
    }
  };

  const handlePurchaseFormUpdate = async (purchaseData) => {
    try {
      const effectiveCompanyId =
        purchaseData.companyId ||
        getCompanyId() ||
        currentCompany?.id ||
        currentCompany?._id;

      if (!effectiveCompanyId) {
        throw new Error("Company ID is required");
      }

      const result = await purchaseService.updatePurchase(purchaseData.id, {
        ...purchaseData,
        companyId: effectiveCompanyId,
        documentType: "purchase_bill",
        mode: "purchases",
      });

      if (result && result.success) {
        showToast("Purchase bill updated successfully!", "success");
        navigateToListView("purchases");
        return result;
      } else {
        throw new Error(result?.message || "Failed to update purchase bill");
      }
    } catch (error) {
      showToast("Error updating purchase bill: " + error.message, "error");
      return {
        success: false,
        error: error.message,
        message: error.message,
      };
    }
  };

  const handlePurchaseOrderSave = async (purchaseOrderData) => {
    try {
      const isResponseData =
        purchaseOrderData.purchaseOrder ||
        purchaseOrderData.order ||
        purchaseOrderData.response ||
        purchaseOrderData.success === true ||
        (purchaseOrderData._id && purchaseOrderData.orderNumber);

      if (isResponseData) {
        showToast("Purchase order created successfully!", "success");
        navigateToListView("purchase-orders");
        return {
          success: true,
          data: purchaseOrderData,
          message: "Purchase order processed successfully",
        };
      }

      const effectiveCompanyId =
        purchaseOrderData.companyId ||
        getCompanyId() ||
        currentCompany?.id ||
        currentCompany?._id;

      if (!effectiveCompanyId) {
        throw new Error("Company ID is required");
      }

      const response = await purchaseOrderService.createPurchaseOrder({
        ...purchaseOrderData,
        companyId: effectiveCompanyId,
        documentType: "purchase_order",
        orderType: "purchase_order",
        mode: "purchase_orders",
      });

      if (response?.success) {
        showToast("Purchase order created successfully!", "success");
        navigateToListView("purchase-orders");
        return response;
      } else {
        throw new Error(response?.message || "Failed to create purchase order");
      }
    } catch (error) {
      showToast("Error saving purchase order: " + error.message, "error");
      return {success: false, error: error.message};
    }
  };

  const handlePurchaseOrderUpdate = async (purchaseOrderData) => {
    try {
      const isResponseData =
        purchaseOrderData.purchaseOrder ||
        purchaseOrderData.order ||
        purchaseOrderData.response ||
        purchaseOrderData.success === true;

      if (isResponseData) {
        showToast("Purchase order updated successfully!", "success");
        navigateToListView("purchase-orders");
        return {
          success: true,
          data: purchaseOrderData,
          message: "Purchase order updated successfully",
        };
      }

      const effectiveCompanyId =
        purchaseOrderData.companyId ||
        getCompanyId() ||
        currentCompany?.id ||
        currentCompany?._id;

      if (!effectiveCompanyId) {
        throw new Error("Company ID is required");
      }

      const response = await purchaseOrderService.updatePurchaseOrder(
        purchaseOrderData.id,
        {
          ...purchaseOrderData,
          companyId: effectiveCompanyId,
          documentType: "purchase_order",
          orderType: "purchase_order",
          mode: "purchase_orders",
        }
      );

      if (response?.success) {
        showToast("Purchase order updated successfully!", "success");
        navigateToListView("purchase-orders");
        return response;
      } else {
        throw new Error(response?.message || "Failed to update purchase order");
      }
    } catch (error) {
      showToast("Error updating purchase order: " + error.message, "error");
      return {success: false, error: error.message};
    }
  };

  const handleSalesOrderSave = async (orderData) => {
    try {
      const effectiveCompanyId =
        orderData.companyId ||
        getCompanyId() ||
        currentCompany?.id ||
        currentCompany?._id;

      if (!effectiveCompanyId) {
        throw new Error("Company ID is required");
      }

      const response = await saleOrderService.createSalesOrder({
        ...orderData,
        companyId: effectiveCompanyId,
        documentType: "sales_order",
        orderType: "sales_order",
        mode: "sales_orders",
      });

      if (response?.success) {
        showToast("Sales order created successfully!", "success");
        navigateToListView("sales-orders");
        return response;
      } else {
        throw new Error(response?.message || "Failed to create sales order");
      }
    } catch (error) {
      showToast("Error saving sales order: " + error.message, "error");
      return {success: false, error: error.message};
    }
  };

  const CommunityPageWrapper = () => {
    const {companyId} = useParams();

    if (!isLoggedIn) {
      return <Navigate to="/auth" replace />;
    }

    if (!currentCompany) {
      return (
        <div className="d-flex justify-content-center align-items-center min-vh-100">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading company...</span>
            </div>
            <h5 className="text-muted">Loading company information...</h5>
            <p className="text-muted small">Please wait...</p>
          </div>
        </div>
      );
    }

    return (
      <CommunityPage
        currentUser={currentUser}
        currentCompany={currentCompany}
        companyId={companyId}
        addToast={showToast}
        onLogout={handleLogout}
        companies={companies}
        onCompanyChange={handleCompanyChange}
      />
    );
  };

  const AdminDashboardWrapper = () => {
    if (!isLoggedIn) {
      return <Navigate to="/auth" replace />;
    }

    return (
      <div
        className="admin-app"
        style={{
          minHeight: "100vh",
          backgroundColor: "#f8f9fa",
          margin: "0",
          padding: "0",
          position: "fixed",
          top: "0",
          left: "0",
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <AdminDashboard
          currentUser={currentUser}
          isOnline={true}
          addToast={showToast}
          onLogout={handleLogout}
        />
      </div>
    );
  };

  const SalesFormWrapper = ({isEdit = false}) => {
    const {companyId} = useParams();

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
        onCancel={() =>
          (window.location.href = `/companies/${companyId}/sales`)
        }
        onExit={() => (window.location.href = `/companies/${companyId}/sales`)}
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

  const QuotationFormWrapper = ({isEdit = false}) => {
    const {companyId, quotationId} = useParams();
    const navigate = useNavigate();

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
          if (page === "quotations") {
            navigate(`/companies/${companyId}/quotations`);
          }
        }}
        isOnline={true}
      />
    );
  };

  const PurchaseFormWrapper = ({isEdit = false}) => {
    const {companyId} = useParams();

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
        onCancel={() =>
          (window.location.href = `/companies/${companyId}/purchases`)
        }
        onExit={() =>
          (window.location.href = `/companies/${companyId}/purchases`)
        }
        inventoryItems={[]}
        categories={[]}
        bankAccounts={[]}
        addToast={showToast}
        isEdit={isEdit}
        companyId={companyId}
        currentCompany={currentCompany}
        currentUser={currentUser}
        mode="purchases"
        documentType="purchase_bill"
      />
    );
  };

  const PurchaseOrderFormWrapper = ({isEdit = false}) => {
    const {companyId, id} = useParams();
    const navigate = useNavigate();

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
      <PurchaseOrderForm
        onSave={isEdit ? handlePurchaseOrderUpdate : handlePurchaseOrderSave}
        onCancel={() => navigate(`/companies/${companyId}/purchase-orders`)}
        editingOrder={isEdit && id ? {id} : null}
        currentCompany={currentCompany}
        currentUser={currentUser}
        companyId={companyId}
        addToast={showToast}
        onNavigate={(page) => {
          if (page === "purchase-orders") {
            navigate(`/companies/${companyId}/purchase-orders`);
          } else if (page) {
            navigate(`/companies/${companyId}/${page}`);
          }
        }}
      />
    );
  };

  const EditSalesInvoiceWrapper = ({mode, documentType}) => {
    const {companyId, transactionId} = useParams();

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
        onSave={
          mode === "quotations" ? handleQuotationUpdate : handleSalesFormUpdate
        }
        onCancel={() =>
          (window.location.href = `/companies/${companyId}/${
            mode === "quotations" ? "quotations" : "sales"
          }`)
        }
      />
    );
  };

  const SalesOrderFormWrapper = ({isEdit = false}) => {
    const {companyId, id} = useParams();

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
        onHide={() =>
          (window.location.href = `/companies/${companyId}/sales-orders`)
        }
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
        currentUser={currentUser}
      />
    );
  };

  const ProtectedRoute = ({children}) => {
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
            <p className="text-muted small">
              Please wait while we verify your session...
            </p>
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
              isLoggedIn ? (
                <Navigate to="/" replace />
              ) : (
                <AuthPage onLogin={handleLogin} />
              )
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

          <Route path="/admin/*" element={<AdminDashboardWrapper />} />

          <Route
            path="/companies/:companyId/community"
            element={<CommunityPageWrapper />}
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
                <EditPurchaseBill
                  addToast={showToast}
                  currentUser={currentUser}
                  currentCompany={currentCompany}
                  mode="purchases"
                  documentType="purchase_bill"
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/companies/:companyId/purchase-orders/add"
            element={
              <ProtectedRoute>
                <PurchaseOrderFormWrapper isEdit={false} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/companies/:companyId/purchase-orders/:id/edit"
            element={
              <ProtectedRoute>
                <PurchaseOrderFormWrapper isEdit={true} />
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
                <EditSalesInvoiceWrapper
                  mode="invoices"
                  documentType="invoice"
                />
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
                <EditSalesInvoiceWrapper
                  mode="quotations"
                  documentType="quotation"
                />
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
