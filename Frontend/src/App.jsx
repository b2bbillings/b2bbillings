import React, {useState, useEffect, useCallback, useRef, useMemo} from "react";
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
import AdminDashboard from "./components/Admin/AdminDashboard";
import MainDashboard from "./components/MainDashboard/MainDashboard";
import DailyTaskAssignment from "./components/Home/Staff/DailyTaskAssignment";
import StaffManagement from "./components/Home/StaffManagement";
import NewUserWelcome from "./components/NewUserWelcome";
import {ChatProvider} from "./context/chatContext";
import companyService from "./services/companyService";
import authService from "./services/authService";
import purchaseService from "./services/purchaseService";
import purchaseOrderService from "./services/purchaseOrderService";
import salesService from "./services/salesService";
import saleOrderService from "./services/saleOrderService";
import SalesForm from "./components/Home/Sales/SalesInvoice/SalesForm";
import PurchaseForm from "./components/Home/Purchases/PurchaseForm";
import SalesOrderForm from "./components/Home/Sales/SalesOrder/SalesOrderForm";
import EditSalesInvoice from "./components/Home/Sales/EditSalesInvoice";
import EditPurchaseBill from "./components/Home/Purchases/EditPurchaseBill";
import PurchaseOrderForm from "./components/Home/Purchases/PurchaseOrderForm";

// ✅ FIXED: Welcome Animation Component with proper completion
const WelcomeAnimation = ({onComplete, userFirstName = "User"}) => {
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setAnimationPhase(1), 500);
    const timer2 = setTimeout(() => setAnimationPhase(2), 1500);
    const timer3 = setTimeout(() => setAnimationPhase(3), 2500);

    const completionTimer = setTimeout(() => {
      console.log("✅ Welcome animation completing...");
      setAnimationPhase(4);

      // Small delay to ensure smooth transition
      setTimeout(() => {
        console.log("✅ Welcome animation completed, calling onComplete");
        if (onComplete) {
          onComplete();
        }
      }, 500);
    }, 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(completionTimer);
    };
  }, [onComplete]);

  return (
    <div className="welcome-animation-overlay">
      <div className="welcome-content">
        <div
          className={`logo-animation mb-4 ${
            animationPhase >= 1 ? "animate-in" : ""
          }`}
        >
          <div className="logo-icon">
            <i className="fas fa-store"></i>
          </div>
          <div className="logo-text">Shop Management</div>
        </div>

        <div
          className={`welcome-message ${
            animationPhase >= 2 ? "animate-in" : ""
          }`}
        >
          <h2 className="mb-3">Welcome, {userFirstName}! 👋</h2>
          <p className="mb-4">
            Let's get you started with your business management
          </p>
        </div>

        <div
          className={`loading-animation mb-3 ${
            animationPhase >= 3 ? "animate-in" : ""
          }`}
        >
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
        </div>

        <div
          className={`loading-dots ${animationPhase >= 3 ? "animate-in" : ""}`}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>

        {/* ✅ ADD: Skip button for debugging */}
        {process.env.NODE_ENV === "development" && (
          <button
            className="btn btn-outline-light btn-sm mt-3 skip-button"
            onClick={() => {
              console.log("🔄 Skipping welcome animation");
              if (onComplete) {
                onComplete();
              }
            }}
          >
            Skip Animation
          </button>
        )}
      </div>
    </div>
  );
};

function App() {
  // Core State Management
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ✅ FIXED: Add state to track welcome animation completion
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(false);
  const [welcomeAnimationComplete, setWelcomeAnimationComplete] =
    useState(false);

  // Refs for State Control
  const mountedRef = useRef(true);
  const authCheckRef = useRef(false);
  const companiesLoadedRef = useRef(false);
  const loadingRef = useRef(false);
  const authCheckCompletedRef = useRef(false);

  // Stable Values to Prevent Re-renders
  const stableIsLoggedIn = useMemo(() => isLoggedIn, [isLoggedIn]);
  const stableIsCheckingAuth = useMemo(() => isCheckingAuth, [isCheckingAuth]);
  const stableCompaniesLength = useMemo(
    () => companies.length,
    [companies.length]
  );

  // ✅ ENHANCED ADMIN CHECK FUNCTION - Multiple validation methods
  const isUserAdmin = useCallback(() => {
    if (!currentUser) return false;

    // Primary admin checks
    const roleBasedAdmin =
      currentUser.role === "admin" ||
      currentUser.role === "administrator" ||
      currentUser.userType === "admin";

    const propertyBasedAdmin = currentUser.isAdmin === true;

    // Array-based role checks
    const arrayRoleAdmin =
      Array.isArray(currentUser.roles) && currentUser.roles.includes("admin");

    const arrayPermissionAdmin =
      Array.isArray(currentUser.permissions) &&
      currentUser.permissions.includes("admin");

    // Special admin emails (for development/testing)
    const emailBasedAdmin =
      currentUser.email === "admin@b2bbillings.com" ||
      currentUser.email === "admin@shopmanagement.com" ||
      currentUser.email === "superadmin@b2bbillings.com";

    // Check against auth service
    const authServiceAdmin = authService.isAdmin();

    // Admin level checks (if your system uses levels)
    const levelBasedAdmin =
      currentUser.adminLevel === "super" ||
      currentUser.adminLevel === "admin" ||
      currentUser.accessLevel === "admin";

    // Department-based admin check
    const departmentAdmin =
      currentUser.department === "administration" &&
      currentUser.isManager === true;

    // Combine all checks
    const isAdmin =
      roleBasedAdmin ||
      propertyBasedAdmin ||
      arrayRoleAdmin ||
      arrayPermissionAdmin ||
      emailBasedAdmin ||
      authServiceAdmin ||
      levelBasedAdmin ||
      departmentAdmin;

    // Additional validation: Must have user ID and email
    const hasValidCredentials =
      (currentUser.id || currentUser._id) &&
      currentUser.email &&
      currentUser.email.includes("@");

    // Final result
    const finalAdminStatus = isAdmin && hasValidCredentials;

    // Log for debugging (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log("🔐 Admin Check Debug:", {
        currentUser: currentUser?.email || "no-user",
        roleBasedAdmin,
        propertyBasedAdmin,
        arrayRoleAdmin,
        arrayPermissionAdmin,
        emailBasedAdmin,
        authServiceAdmin,
        levelBasedAdmin,
        departmentAdmin,
        hasValidCredentials,
        finalResult: finalAdminStatus,
      });
    }

    return finalAdminStatus;
  }, [currentUser]);

  // Global helper functions to stop auth loops
  useEffect(() => {
    // Stop auth checks when on auth pages
    window.stopAuthChecks = () => {
      console.log("🛑 Stopping auth checks globally");
      authCheckCompletedRef.current = true;
      setIsCheckingAuth(false);
    };

    // Debug helper
    window.debugAuth = () => ({
      isLoggedIn: stableIsLoggedIn,
      isCheckingAuth: stableIsCheckingAuth,
      currentUser: currentUser?.email || "none",
      token: !!authService.getToken(),
      path: window.location.pathname,
      isAdmin: isUserAdmin(),
    });

    return () => {
      window.stopAuthChecks = null;
      window.debugAuth = null;
    };
  }, [stableIsLoggedIn, stableIsCheckingAuth, currentUser, isUserAdmin]);

  // Load Companies Function
  const loadCompanies = useCallback(async () => {
    if (
      loadingRef.current ||
      companiesLoadedRef.current ||
      !mountedRef.current ||
      !isLoggedIn
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      loadingRef.current = true;
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

      if (!mountedRef.current) return;

      if (response && (response.success === true || response.data)) {
        const companiesList =
          response.data?.companies || response.data || response.companies || [];

        setCompanies(companiesList);
        companiesLoadedRef.current = true;

        // Auto-select company from URL or saved selection
        const savedCompany = localStorage.getItem("currentCompany");
        let companyToSelect = null;

        // Try to find company from URL first
        const currentPath = window.location.pathname;
        const companyIdFromUrl = currentPath.match(
          /\/companies\/([^\/]+)/
        )?.[1];

        if (companyIdFromUrl && companiesList.length > 0) {
          companyToSelect = companiesList.find(
            (c) => (c.id || c._id) === companyIdFromUrl
          );
        }

        // If not found in URL, try saved company
        if (!companyToSelect && savedCompany) {
          try {
            const company = JSON.parse(savedCompany);
            companyToSelect = companiesList.find(
              (c) => (c.id || c._id) === (company.id || company._id)
            );
          } catch (error) {
            localStorage.removeItem("currentCompany");
          }
        }

        // If still not found, select first company
        if (!companyToSelect && companiesList.length > 0) {
          companyToSelect = companiesList[0];
        }

        if (companyToSelect) {
          await setCompanyAsActive(companyToSelect);
        }

        setIsAppInitialized(true);
      } else {
        setCompanies([]);
        companiesLoadedRef.current = true;
        setIsAppInitialized(true);
      }
    } catch (error) {
      if (mountedRef.current) {
        setCompanies([]);
        companiesLoadedRef.current = true;
        setIsAppInitialized(true);
      }
    } finally {
      loadingRef.current = false;
      if (mountedRef.current) {
        setIsLoadingCompanies(false);
      }
    }
  }, [isLoggedIn]);

  // Single Auth Check on Mount - Prevents refreshes
  useEffect(() => {
    mountedRef.current = true;

    if (!authCheckRef.current && !authCheckCompletedRef.current) {
      authCheckRef.current = true;
      checkExistingAuth();
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load companies when authenticated
  useEffect(() => {
    if (
      stableIsLoggedIn &&
      !stableIsCheckingAuth &&
      !companiesLoadedRef.current &&
      authCheckCompletedRef.current
    ) {
      const timer = setTimeout(() => {
        if (mountedRef.current && !loadingRef.current) {
          loadCompanies();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [stableIsLoggedIn, stableIsCheckingAuth, loadCompanies]);

  // Company Selection Restoration
  useEffect(() => {
    if (stableIsLoggedIn && stableCompaniesLength > 0 && !currentCompany) {
      const restoreCompanySelection = () => {
        try {
          // Check URL first
          const currentPath = window.location.pathname;
          const companyIdFromUrl = currentPath.match(
            /\/companies\/([^\/]+)/
          )?.[1];

          if (companyIdFromUrl) {
            const foundCompany = companies.find(
              (c) => (c.id || c._id) === companyIdFromUrl
            );
            if (foundCompany) {
              setCurrentCompany(foundCompany);
              localStorage.setItem(
                "currentCompany",
                JSON.stringify(foundCompany)
              );
              return;
            }
          }

          // Fallback to saved company
          const savedCompany = localStorage.getItem("currentCompany");
          if (savedCompany) {
            const company = JSON.parse(savedCompany);
            const foundCompany = companies.find(
              (c) => (c.id || c._id) === (company.id || company._id)
            );
            if (foundCompany) {
              setCurrentCompany(foundCompany);
            } else {
              localStorage.removeItem("currentCompany");
            }
          }
        } catch (error) {
          localStorage.removeItem("currentCompany");
        }
      };

      restoreCompanySelection();
    }
  }, [stableIsLoggedIn, stableCompaniesLength, currentCompany, companies]);

  // ✅ FIXED: Check first visit function
  const checkFirstVisit = useCallback(() => {
    const hasVisitedBefore = localStorage.getItem("hasVisitedDashboard");
    if (!hasVisitedBefore && !welcomeAnimationComplete) {
      localStorage.setItem("hasVisitedDashboard", "true");
      return true;
    }
    return false;
  }, [welcomeAnimationComplete]);

  // ✅ FIXED: Handle welcome animation completion
  const handleWelcomeAnimationComplete = useCallback(() => {
    console.log("🎉 Welcome animation completed successfully!");
    setWelcomeAnimationComplete(true);
    setShowWelcomeAnimation(false);
  }, []);

  const setCompanyAsActive = useCallback(async (company) => {
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
        gstNumber: company.gstNumber,
      };

      setCurrentCompany(standardizedCompany);
      localStorage.setItem(
        "currentCompany",
        JSON.stringify(standardizedCompany)
      );
    } catch (error) {
      // Silent error handling
    }
  }, []);

  // Authentication Check - Optimized to prevent refreshes
  const checkExistingAuth = async () => {
    try {
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (!token || !savedUser) {
        if (mountedRef.current) {
          setIsCheckingAuth(false);
          setIsAppInitialized(true);
          authCheckCompletedRef.current = true;
        }
        return;
      }

      // Only verify token if we're not on auth pages
      const currentPath = window.location.pathname;
      if (currentPath.includes("/auth") || currentPath.includes("/login")) {
        if (mountedRef.current) {
          setIsCheckingAuth(false);
          setIsAppInitialized(true);
          authCheckCompletedRef.current = true;
        }
        return;
      }

      // Quick validation first - don't call API if data is invalid
      try {
        const userData = JSON.parse(savedUser);
        if (!userData || !userData.email || (!userData.id && !userData._id)) {
          authService.clearAuthData();
          if (mountedRef.current) {
            setIsCheckingAuth(false);
            setIsAppInitialized(true);
            authCheckCompletedRef.current = true;
          }
          return;
        }
      } catch (parseError) {
        authService.clearAuthData();
        if (mountedRef.current) {
          setIsCheckingAuth(false);
          setIsAppInitialized(true);
          authCheckCompletedRef.current = true;
        }
        return;
      }

      const verificationResponse = await authService.verifyToken();

      if (!mountedRef.current) return;

      if (verificationResponse && verificationResponse.success === true) {
        const userData = JSON.parse(savedUser);
        setCurrentUser(userData);
        setIsLoggedIn(true);
      } else {
        await authService.clearAuthData();
        localStorage.removeItem("currentCompany");
        setIsAppInitialized(true);
      }
    } catch (error) {
      if (mountedRef.current) {
        await authService.clearAuthData();
        localStorage.removeItem("currentCompany");
        setIsAppInitialized(true);
      }
    } finally {
      if (mountedRef.current) {
        setIsCheckingAuth(false);
        authCheckCompletedRef.current = true;
      }
    }
  };

  // Authentication Handlers
  const handleLogin = async (userData) => {
    try {
      setIsLoggedIn(true);
      setCurrentUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));

      // Reset companies data for fresh load
      setCompanies([]);
      setCurrentCompany(null);
      setIsLoadingCompanies(false);
      setIsAppInitialized(false);
      companiesLoadedRef.current = false;
      loadingRef.current = false;
      authCheckCompletedRef.current = true;

      // ✅ FIXED: Reset welcome animation state on login
      setWelcomeAnimationComplete(false);
      setShowWelcomeAnimation(false);
    } catch (error) {
      // Silent error handling
    }
  };

  // Ultra Fast Logout - Prevents auth checking screen
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      // Immediate state cleanup
      setIsLoggedIn(false);
      setCurrentUser(null);
      setCurrentCompany(null);
      setCompanies([]);
      setIsLoadingCompanies(false);
      setIsAppInitialized(true);
      setIsCheckingAuth(false);
      companiesLoadedRef.current = false;
      loadingRef.current = false;

      // ✅ FIXED: Reset welcome animation state on logout
      setWelcomeAnimationComplete(false);
      setShowWelcomeAnimation(false);

      // Clear storage immediately
      const keysToRemove = [
        "currentCompany",
        "dashboard-active-view",
        "hasVisitedDashboard",
        "selectedCompanyId",
        "companyId",
      ];

      keysToRemove.forEach((key) => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        } catch (error) {
          // Silent fail
        }
      });

      // Use instant logout - no network calls
      authService.instantLogout();

      // Reset refs to prevent background processes
      authCheckRef.current = false;
      companiesLoadedRef.current = false;
      loadingRef.current = false;
      authCheckCompletedRef.current = false;

      if (window.showToast) {
        window.showToast("Logged out successfully", "success");
      }

      setTimeout(() => {
        setIsLoggingOut(false);
        window.location.href = "/auth";
      }, 100);
    } catch (error) {
      // Ensure cleanup even if error occurs
      authService.clearAuthData();
      setIsLoggedIn(false);
      setCurrentUser(null);
      setCurrentCompany(null);
      setCompanies([]);
      setIsCheckingAuth(false);
      setIsAppInitialized(true);
      setIsLoggingOut(false);
      authCheckCompletedRef.current = false;
      window.location.href = "/auth";
    }
  };

  // Company Management Handlers
  const handleCompanyChange = async (company) => {
    try {
      if (company) {
        await setCompanyAsActive(company);
      } else {
        setCurrentCompany(null);
        localStorage.removeItem("currentCompany");
      }
    } catch (error) {
      // Silent error handling
    }
  };

  const handleCompanyCreated = async (newCompany) => {
    try {
      setCompanies((prev) => [...prev, newCompany]);
      await setCompanyAsActive(newCompany);
      companiesLoadedRef.current = true;
      setIsAppInitialized(true);
    } catch (error) {
      // Silent error handling
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
      // Silent error handling
    }
  };

  // Utility Functions
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

  const handleDashboardNavigation = (page) => {
    const companyId = getCompanyId();
    if (!companyId) {
      showToast("Please select a company first", "warning");
      return;
    }

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

  // Toast Notifications
  const showToast = (message, type = "info") => {
    if (typeof window !== "undefined" && window.bootstrap?.Toast) {
      const toastContainer =
        document.getElementById("toast-container") ||
        document.createElement("div");
      if (!document.getElementById("toast-container")) {
        toastContainer.id = "toast-container";
        toastContainer.className =
          "toast-container position-fixed top-0 end-0 p-3";
        document.body.appendChild(toastContainer);
      }

      const toastElement = document.createElement("div");
      toastElement.className = `toast align-items-center text-white bg-${
        type === "error"
          ? "danger"
          : type === "success"
          ? "success"
          : type === "warning"
          ? "warning"
          : "primary"
      } border-0`;
      toastElement.innerHTML = `
        <div class="d-flex">
          <div class="toast-body">${message}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      `;

      toastContainer.appendChild(toastElement);
      const toast = new window.bootstrap.Toast(toastElement);
      toast.show();

      toastElement.addEventListener("hidden.bs.toast", () => {
        toastElement.remove();
      });
    }
  };

  // Form Save Handlers
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
      return {success: false, error: error.message, message: error.message};
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
      return {success: false, error: error.message, message: error.message};
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

  // Main Dashboard Wrapper
  const MainDashboardWrapper = () => {
    if (isLoggingOut) {
      return (
        <div className="d-flex justify-content-center align-items-center loading-screen">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Logging out...</p>
          </div>
        </div>
      );
    }

    if (stableIsCheckingAuth || !isAppInitialized) {
      return (
        <div className="d-flex justify-content-center align-items-center loading-screen">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Checking authentication...</p>
          </div>
        </div>
      );
    }

    if (!stableIsLoggedIn) {
      return <Navigate to="/auth" replace />;
    }

    if (isLoadingCompanies || !companiesLoadedRef.current) {
      return (
        <div className="d-flex justify-content-center align-items-center loading-screen">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading your companies...</p>
          </div>
        </div>
      );
    }

    // No companies found
    if (stableCompaniesLength === 0) {
      return (
        <NewUserWelcome
          currentUser={currentUser}
          onCreateCompany={handleCompanyCreated}
          showToast={showToast}
          onLogout={handleLogout}
        />
      );
    }

    // ✅ FIXED: First visit welcome animation with proper state management
    const isFirstVisit = checkFirstVisit();
    if (
      isFirstVisit &&
      stableCompaniesLength > 0 &&
      currentCompany &&
      !welcomeAnimationComplete
    ) {
      return (
        <WelcomeAnimation
          onComplete={handleWelcomeAnimationComplete}
          userFirstName={
            currentUser?.name?.split(" ")[0] || currentUser?.firstName || "User"
          }
        />
      );
    }

    // Main dashboard
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

  // Company Route Wrapper
  const CompanyRouteWrapper = ({children}) => {
    const {companyId} = useParams();
    const navigate = useNavigate();

    useEffect(() => {
      if (companyId && companies.length > 0 && !currentCompany) {
        const foundCompany = companies.find(
          (c) => (c.id || c._id) === companyId
        );
        if (foundCompany) {
          setCompanyAsActive(foundCompany);
        } else if (companiesLoadedRef.current) {
          navigate("/dashboard", {replace: true});
        }
      }
    }, [companyId, companies, currentCompany, navigate]);

    if (!isLoggedIn) {
      return <Navigate to="/auth" replace />;
    }

    if (isLoggingOut) {
      return (
        <div className="d-flex justify-content-center align-items-center loading-screen">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Logging out...</p>
          </div>
        </div>
      );
    }

    if (isCheckingAuth || !isAppInitialized) {
      return (
        <div className="d-flex justify-content-center align-items-center loading-screen">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading...</p>
          </div>
        </div>
      );
    }

    if (isLoadingCompanies || !companiesLoadedRef.current) {
      return (
        <div className="d-flex justify-content-center align-items-center loading-screen">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading your companies...</p>
          </div>
        </div>
      );
    }

    if (companies.length === 0) {
      return <Navigate to="/dashboard" replace />;
    }

    if (companyId && !currentCompany) {
      return (
        <div className="d-flex justify-content-center align-items-center loading-screen">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading company information...</p>
          </div>
        </div>
      );
    }

    return children;
  };

  // ✅ ADMIN ROUTE PROTECTION COMPONENT
  const AdminRouteWrapper = ({children}) => {
    // Check if user is logged in
    if (!isLoggedIn) {
      return <Navigate to="/auth" replace />;
    }

    // Check if user has admin privileges
    const userIsAdmin = isUserAdmin();

    if (isLoggingOut) {
      return (
        <div className="d-flex justify-content-center align-items-center loading-screen">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Logging out...</p>
          </div>
        </div>
      );
    }

    if (stableIsCheckingAuth || !isAppInitialized) {
      return (
        <div className="d-flex justify-content-center align-items-center loading-screen">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Verifying admin privileges...</p>
          </div>
        </div>
      );
    }

    // ✅ ADMIN ACCESS DENIED SCREEN
    if (!userIsAdmin) {
      console.warn(
        "🚫 Admin access denied for user:",
        currentUser?.email || "unknown"
      );

      return (
        <div className="d-flex justify-content-center align-items-center access-denied-screen">
          <div className="text-center">
            <div className="mb-4">
              <i className="fas fa-shield-alt text-danger access-denied-icon"></i>
            </div>
            <h2 className="text-danger mb-3">Access Denied</h2>
            <p className="text-muted mb-4">
              Administrator privileges are required to access this area.
            </p>
            <div className="mb-4">
              <p className="small text-muted">
                Current User: {currentUser?.email || "Unknown"}
              </p>
              <p className="small text-muted">
                Role: {currentUser?.role || "User"}
              </p>
            </div>
            <div className="d-flex gap-3 justify-content-center">
              <button
                className="btn btn-primary"
                onClick={() => (window.location.href = "/dashboard")}
              >
                <i className="fas fa-home me-2"></i>
                Go to Dashboard
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={handleLogout}
              >
                <i className="fas fa-sign-out-alt me-2"></i>
                Logout
              </button>
            </div>
            <div className="mt-4">
              <small className="text-muted">
                If you believe this is an error, please contact your system
                administrator.
              </small>
            </div>
          </div>
        </div>
      );
    }

    // ✅ ADMIN ACCESS GRANTED - LOG AND RENDER
    console.log("✅ Admin access granted for user:", currentUser?.email);

    return <div className="admin-app">{children}</div>;
  };

  // Component Wrappers
  const StaffManagementWrapper = () => {
    const {companyId} = useParams();

    return (
      <CompanyRouteWrapper>
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
      </CompanyRouteWrapper>
    );
  };

  const DailyTaskAssignmentWrapper = () => {
    const {companyId} = useParams();

    return (
      <CompanyRouteWrapper>
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
      </CompanyRouteWrapper>
    );
  };

  const CommunityPageWrapper = () => {
    const {companyId} = useParams();

    return (
      <CompanyRouteWrapper>
        <CommunityPage
          currentUser={currentUser}
          currentCompany={currentCompany}
          companyId={companyId}
          addToast={showToast}
          onLogout={handleLogout}
          companies={companies}
          onCompanyChange={handleCompanyChange}
        />
      </CompanyRouteWrapper>
    );
  };

  // ✅ ENHANCED ADMIN DASHBOARD WRAPPER WITH PROPER PROTECTION
  const AdminDashboardWrapper = () => {
    return (
      <AdminRouteWrapper>
        <AdminDashboard
          currentUser={currentUser}
          isOnline={true}
          addToast={showToast}
          onLogout={handleLogout}
          isUserAdmin={isUserAdmin}
        />
      </AdminRouteWrapper>
    );
  };

  const SalesFormWrapper = ({isEdit = false}) => {
    const {companyId} = useParams();

    return (
      <CompanyRouteWrapper>
        <SalesForm
          onSave={isEdit ? handleSalesFormUpdate : handleSalesFormSave}
          onCancel={() =>
            (window.location.href = `/companies/${companyId}/sales`)
          }
          onExit={() =>
            (window.location.href = `/companies/${companyId}/sales`)
          }
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
      </CompanyRouteWrapper>
    );
  };

  const QuotationFormWrapper = ({isEdit = false}) => {
    const {companyId, quotationId} = useParams();
    const navigate = useNavigate();

    return (
      <CompanyRouteWrapper>
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
      </CompanyRouteWrapper>
    );
  };

  const PurchaseFormWrapper = ({isEdit = false}) => {
    const {companyId} = useParams();

    return (
      <CompanyRouteWrapper>
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
      </CompanyRouteWrapper>
    );
  };

  const PurchaseOrderFormWrapper = ({isEdit = false}) => {
    const {companyId, id} = useParams();
    const navigate = useNavigate();

    return (
      <CompanyRouteWrapper>
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
      </CompanyRouteWrapper>
    );
  };

  const EditSalesInvoiceWrapper = ({mode, documentType}) => {
    const {companyId, transactionId} = useParams();

    return (
      <CompanyRouteWrapper>
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
            mode === "quotations"
              ? handleQuotationUpdate
              : handleSalesFormUpdate
          }
          onCancel={() =>
            (window.location.href = `/companies/${companyId}/${
              mode === "quotations" ? "quotations" : "sales"
            }`)
          }
        />
      </CompanyRouteWrapper>
    );
  };

  const SalesOrderFormWrapper = ({isEdit = false}) => {
    const {companyId, id} = useParams();

    return (
      <CompanyRouteWrapper>
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
      </CompanyRouteWrapper>
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

  // Main Loading Screen
  if (isLoggingOut) {
    return (
      <div className="d-flex justify-content-center align-items-center loading-screen">
        <div className="text-center">
          <div className="spinner-border text-success mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Logging out...</p>
        </div>
      </div>
    );
  }

  // Only show checking auth if actually checking AND not completed
  if (
    (stableIsCheckingAuth && !authCheckCompletedRef.current) ||
    !isAppInitialized
  ) {
    return (
      <div className="d-flex justify-content-center align-items-center loading-screen">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Main App Routes
  return (
    <Router future={{v7_startTransition: true, v7_relativeSplatPath: true}}>
      <ChatProvider>
        <div className="App">
          <Routes>
            {/* Single auth route - no conflicts */}
            <Route
              path="/auth"
              element={
                stableIsLoggedIn ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <AuthPage onLogin={handleLogin} />
                )
              }
            />

            {/* Redirect /login to /auth */}
            <Route path="/login" element={<Navigate to="/auth" replace />} />

            {/* Root redirect */}
            <Route
              path="/"
              element={
                stableIsLoggedIn ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />

            {/* ✅ PROTECTED ADMIN ROUTES - Only accessible by administrators */}
            <Route path="/admin/*" element={<AdminDashboardWrapper />} />

            <Route path="/home" element={<MainDashboardWrapper />} />
            <Route path="/dashboard" element={<MainDashboardWrapper />} />
            <Route path="/dashboard/:view" element={<MainDashboardWrapper />} />

            <Route
              path="/companies/:companyId/community"
              element={<CommunityPageWrapper />}
            />

            <Route
              path="/companies/:companyId/staff"
              element={
                <ProtectedRoute>
                  <StaffManagementWrapper />
                </ProtectedRoute>
              }
            />

            <Route
              path="/companies/:companyId/staff/daily-task-assignment"
              element={
                <ProtectedRoute>
                  <DailyTaskAssignmentWrapper />
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

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </ChatProvider>
    </Router>
  );
}

export default App;
