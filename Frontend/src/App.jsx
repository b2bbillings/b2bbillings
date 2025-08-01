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

// ✅ Import MainDashboard component - NO LAYOUT
import MainDashboard from "./components/MainDashboard/MainDashboard";

// ✅ Import DailyTaskAssignment component
import DailyTaskAssignment from "./components/Home/Staff/DailyTaskAssignment";

// ✅ Import StaffManagement component
import StaffManagement from "./components/Home/StaffManagement";

// ✅ ADD: Import ChatProvider
import {ChatProvider} from "./context/chatContext";

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

// ✅ First-Time Welcome Animation Component
const WelcomeAnimation = ({onComplete, userFirstName = "User"}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3500); // Show for 3.5 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="welcome-animation-overlay">
      <div className="welcome-content">
        <div className="logo-animation mb-4">
          <div className="logo-icon">
            <i className="fas fa-store"></i>
          </div>
          <div className="logo-text">Shop Management</div>
        </div>

        <div className="welcome-message">
          <h2 className="mb-3">Welcome, {userFirstName}! 👋</h2>
          <p className="mb-4">
            Let's get you started with your business management
          </p>
        </div>

        <div className="loading-animation mb-3">
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
        </div>

        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <style jsx>{`
        .welcome-animation-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.5s ease-out;
        }

        .welcome-content {
          text-align: center;
          color: white;
          animation: slideInUp 0.8s ease-out;
        }

        .logo-animation {
          animation: logoFloat 3s ease-in-out infinite;
        }

        .logo-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          background: rgba(255, 255, 255, 0.2);
          width: 100px;
          height: 100px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 255, 255, 0.3);
          animation: iconPulse 2s ease-in-out infinite;
        }

        .logo-text {
          font-size: 1.5rem;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .welcome-message h2 {
          font-size: 2rem;
          font-weight: 700;
          animation: textGlow 2s ease-in-out infinite;
        }

        .welcome-message p {
          font-size: 1.1rem;
          opacity: 0.9;
          animation: textFade 2s ease-in-out infinite;
        }

        .loading-animation {
          width: 300px;
          margin: 0 auto;
        }

        .loading-bar {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          overflow: hidden;
        }

        .loading-progress {
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.8) 0%,
            rgba(255, 255, 255, 1) 50%,
            rgba(255, 255, 255, 0.8) 100%
          );
          animation: progressSlide 2s ease-in-out infinite;
        }

        .loading-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
        }

        .loading-dots span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.8);
          animation: dotWave 1.4s ease-in-out infinite both;
        }

        .loading-dots span:nth-child(1) {
          animation-delay: -0.32s;
        }
        .loading-dots span:nth-child(2) {
          animation-delay: -0.16s;
        }
        .loading-dots span:nth-child(3) {
          animation-delay: 0s;
        }

        /* Animations */
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes logoFloat {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes iconPulse {
          0%,
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 20px rgba(255, 255, 255, 0);
          }
        }

        @keyframes progressSlide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes textGlow {
          0%,
          100% {
            opacity: 0.9;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes textFade {
          0%,
          100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes dotWave {
          0%,
          80%,
          100% {
            transform: scale(0.8) translateY(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1.2) translateY(-10px);
            opacity: 1;
          }
        }

        /* Responsive design */
        @media (max-width: 576px) {
          .logo-icon {
            width: 80px;
            height: 80px;
            font-size: 3rem;
          }

          .logo-text {
            font-size: 1.2rem;
          }

          .welcome-message h2 {
            font-size: 1.5rem;
          }

          .welcome-message p {
            font-size: 1rem;
          }

          .loading-animation {
            width: 250px;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .logo-animation,
          .logo-icon,
          .loading-progress,
          .loading-dots span,
          .welcome-content {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // ✅ First-time visit animation state
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(false);

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

  // ✅ Check if this is the first visit to dashboard/home
  const checkFirstVisit = () => {
    const hasVisitedBefore = localStorage.getItem("hasVisitedDashboard");
    if (!hasVisitedBefore) {
      localStorage.setItem("hasVisitedDashboard", "true");
      return true;
    }
    return false;
  };

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
      localStorage.removeItem("dashboard-active-view");
      // ✅ Reset first visit flag on logout
      localStorage.removeItem("hasVisitedDashboard");
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

  // ✅ Updated navigation handler for MainDashboard
  const navigateToListView = (section) => {
    const companyId = getCompanyId();
    if (companyId) {
      window.location.href = `/companies/${companyId}/${section}`;
    }
  };

  // ✅ Navigation handler specifically for MainDashboard
  const handleDashboardNavigation = (page) => {
    const companyId = getCompanyId();
    if (!companyId) {
      showToast("Please select a company first", "warning");
      return;
    }

    // Map dashboard actions to proper routes
    const routeMap = {
      dailySummary: `/companies/${companyId}/daybook`,
      transactions: `/companies/${companyId}/transactions`,
      paymentIn: `/companies/${companyId}/daybook`,
      paymentOut: `/companies/${companyId}/daybook`,
      createInvoice: `/companies/${companyId}/sales/add`,
      createPurchaseOrder: `/companies/${companyId}/purchase-orders/add`,
      createQuotation: `/companies/${companyId}/quotations/add`,
      expenses: `/companies/${companyId}/daybook`,
      reports: `/companies/${companyId}/reports`,
      parties: `/companies/${companyId}/parties`,
      allProducts: `/companies/${companyId}/products`,
      inventory: `/companies/${companyId}/inventory`,
      bankAccounts: `/companies/${companyId}/bank-accounts`,
      staff: `/companies/${companyId}/staff`,
      staffList: `/companies/${companyId}/staff`,
      dailyTaskAssignment: `/companies/${companyId}/staff/daily-task-assignment`,
      insights: `/companies/${companyId}/insights`,
      settings: `/companies/${companyId}/settings`,
      community: `/companies/${companyId}/community`,
      createTransaction: `/companies/${companyId}/daybook`,
      createPayment: `/companies/${companyId}/daybook`,
      createExpense: `/companies/${companyId}/daybook`,
    };

    const targetRoute = routeMap[page];
    if (targetRoute) {
      window.location.href = targetRoute;
    } else {
      showToast("Feature coming soon!", "info");
    }
  };

  const showToast = (message, type = "info") => {
    if (type === "error") {
      alert(`Error: ${message}`);
    } else if (type === "warning") {
      alert(`Warning: ${message}`);
    } else if (type === "success") {
      alert(`Success: ${message}`);
    } else {
      alert(`Info: ${message}`);
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

  // ✅ MainDashboard Wrapper Component with Welcome Animation
  const MainDashboardWrapper = () => {
    const [showDashboard, setShowDashboard] = useState(false);

    useEffect(() => {
      // ✅ Check if this is first visit when component mounts
      if (isLoggedIn && currentCompany && !isLoadingCompanies) {
        const isFirstVisit = checkFirstVisit();
        if (isFirstVisit) {
          setShowWelcomeAnimation(true);
        } else {
          setShowDashboard(true);
        }
      }
    }, [isLoggedIn, currentCompany, isLoadingCompanies]);

    if (!isLoggedIn) {
      return <Navigate to="/auth" replace />;
    }

    if (!currentCompany || isLoadingCompanies) {
      return (
        <div
          className="d-flex justify-content-center align-items-center"
          style={{minHeight: "100vh"}}
        >
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading your dashboard...</p>
          </div>
        </div>
      );
    }

    // ✅ Show welcome animation for first-time visitors
    if (showWelcomeAnimation) {
      return (
        <WelcomeAnimation
          onComplete={() => {
            setShowWelcomeAnimation(false);
            setShowDashboard(true);
          }}
          userFirstName={
            currentUser?.name?.split(" ")[0] || currentUser?.firstName || "User"
          }
        />
      );
    }

    // ✅ Show main dashboard
    return (
      <MainDashboard
        currentCompany={currentCompany}
        currentUser={currentUser}
        companies={companies}
        onNavigate={handleDashboardNavigation}
        addToast={showToast}
        isOnline={true}
        onLogout={handleLogout}
        onCompanyChange={handleCompanyChange}
        onCompanyCreated={handleCompanyCreated}
        onCompanyUpdated={handleCompanyUpdated}
        isLoadingCompanies={isLoadingCompanies}
      />
    );
  };

  // ✅ StaffManagement Wrapper Component
  const StaffManagementWrapper = () => {
    const {companyId} = useParams();

    if (!isLoggedIn) {
      return <Navigate to="/auth" replace />;
    }

    if (!currentCompany) {
      return (
        <div
          className="d-flex justify-content-center align-items-center"
          style={{minHeight: "100vh"}}
        >
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading company information...</p>
          </div>
        </div>
      );
    }

    return (
      <StaffManagement
        companyData={currentCompany}
        userData={currentUser}
        addToast={showToast}
        currentCompany={currentCompany}
        currentUser={currentUser}
        companyId={companyId}
        onNavigate={(page) => {
          const routeMap = {
            dashboard: `/companies/${companyId}/dashboard`,
            dailyTaskAssignment: `/companies/${companyId}/staff/daily-task-assignment`,
          };
          const targetRoute = routeMap[page];
          if (targetRoute) {
            window.location.href = targetRoute;
          }
        }}
        isOnline={true}
      />
    );
  };

  // ✅ Daily Task Assignment Wrapper Component
  const DailyTaskAssignmentWrapper = () => {
    const {companyId} = useParams();

    if (!isLoggedIn) {
      return <Navigate to="/auth" replace />;
    }

    if (!currentCompany) {
      return (
        <div
          className="d-flex justify-content-center align-items-center"
          style={{minHeight: "100vh"}}
        >
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading company information...</p>
          </div>
        </div>
      );
    }

    return (
      <DailyTaskAssignment
        companyData={currentCompany}
        userData={currentUser}
        addToast={showToast}
        currentCompany={currentCompany}
        currentUser={currentUser}
        companyId={companyId}
        onNavigate={(page) => {
          const routeMap = {
            staff: `/companies/${companyId}/staff`,
            staffList: `/companies/${companyId}/staff`,
            dashboard: `/companies/${companyId}/dashboard`,
          };
          const targetRoute = routeMap[page];
          if (targetRoute) {
            window.location.href = targetRoute;
          }
        }}
        isOnline={true}
      />
    );
  };

  const CommunityPageWrapper = () => {
    const {companyId} = useParams();

    if (!isLoggedIn) {
      return <Navigate to="/auth" replace />;
    }

    if (!currentCompany) {
      return (
        <div
          className="d-flex justify-content-center align-items-center"
          style={{minHeight: "100vh"}}
        >
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading community...</p>
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
        <div
          className="d-flex justify-content-center align-items-center"
          style={{minHeight: "100vh"}}
        >
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading company information...</p>
          </div>
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
        <div
          className="d-flex justify-content-center align-items-center"
          style={{minHeight: "100vh"}}
        >
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading company information...</p>
          </div>
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
        <div
          className="d-flex justify-content-center align-items-center"
          style={{minHeight: "100vh"}}
        >
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading company information...</p>
          </div>
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
        <div
          className="d-flex justify-content-center align-items-center"
          style={{minHeight: "100vh"}}
        >
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading company information...</p>
          </div>
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
        <div
          className="d-flex justify-content-center align-items-center"
          style={{minHeight: "100vh"}}
        >
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading company information...</p>
          </div>
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
        <div
          className="d-flex justify-content-center align-items-center"
          style={{minHeight: "100vh"}}
        >
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading company information...</p>
          </div>
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

  // ✅ Updated AutoRedirect to go to /dashboard instead of /home
  const AutoRedirect = () => {
    useEffect(() => {
      if (companies.length > 0 && currentCompany) {
        window.location.replace("/dashboard");
      }
    }, [companies, currentCompany]);

    if (companies.length === 0 && !isLoadingCompanies) {
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
      <div
        className="d-flex justify-content-center align-items-center"
        style={{minHeight: "100vh"}}
      >
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Setting up your workspace...</p>
        </div>
      </div>
    );
  };

  if (isCheckingAuth) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{minHeight: "100vh"}}
      >
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      {/* ✅ UPDATED: Wrap entire Router with ChatProvider */}
      <ChatProvider>
        <div className="App">
          <Routes>
            <Route
              path="/auth"
              element={
                isLoggedIn ? (
                  <Navigate to="/dashboard" replace />
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

            {/* ✅ Main Dashboard Routes - Both /home and /dashboard */}
            <Route path="/home" element={<MainDashboardWrapper />} />
            <Route path="/dashboard" element={<MainDashboardWrapper />} />
            <Route path="/dashboard/:view" element={<MainDashboardWrapper />} />

            <Route
              path="/companies/:companyId/community"
              element={<CommunityPageWrapper />}
            />

            {/* ✅ STAFF MANAGEMENT ROUTES - BEFORE THE CATCH-ALL */}
            <Route
              path="/companies/:companyId/staff"
              element={
                <ProtectedRoute>
                  <StaffManagementWrapper />
                </ProtectedRoute>
              }
            />

            {/* ✅ Daily Task Assignment Route */}
            <Route
              path="/companies/:companyId/staff/daily-task-assignment"
              element={
                <ProtectedRoute>
                  <DailyTaskAssignmentWrapper />
                </ProtectedRoute>
              }
            />

            {/* Purchase Routes */}
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

            {/* Purchase Order Routes */}
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

            {/* Sales Routes */}
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

            {/* Quotation Routes */}
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

            {/* Sales Order Routes */}
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

            {/* ✅ CATCH-ALL ROUTE - MUST BE LAST */}
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

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </ChatProvider>
    </Router>
  );
}

export default App;
