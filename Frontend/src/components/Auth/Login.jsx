import {useState, useEffect, useRef, useCallback} from "react";
import {useNavigate, useLocation} from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Login.css";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faLock,
  faSignInAlt,
  faEye,
  faEyeSlash,
  faShieldAlt,
  faExclamationTriangle,
  faSpinner,
  faBuilding,
  faUsers,
  faChartLine,
  faPhone,
} from "@fortawesome/free-solid-svg-icons";
import authService from "../../services/authService";

// ===============================
// 🎯 CONFIGURATION
// ===============================
const LOGIN_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  AUTO_LOGOUT_TIME: 30 * 60 * 1000, // 30 minutes
};

// ===============================
// 🔍 VALIDATION PATTERNS
// ===============================
const VALIDATION_PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\d{10}$/,
  password: /^.{6,}$/,
};

// ===============================
// 🚀 LOGIN COMPONENT
// ===============================
function Login({
  onToggleView,
  bgImage = "https://images.pexels.com/photos/3987020/pexels-photo-3987020.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
  onLoginSuccess,
  redirectPath = "/dashboard",
  maxAttempts = LOGIN_CONFIG.MAX_LOGIN_ATTEMPTS,
}) {
  // ===============================
  // 📝 STATE MANAGEMENT
  // ===============================
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [uiState, setUiState] = useState({
    errors: {},
    isSubmitting: false,
    showPassword: false,
    loginAttempts: 0,
    isLocked: false,
    lockoutTime: null,
    remainingTime: 0,
    isOnline: navigator.onLine,
    loginType: "email", // 'email' or 'phone'
  });

  // ===============================
  // 🔒 SECURITY STATE
  // ===============================
  const [securityState, setSecurityState] = useState({
    deviceFingerprint: null,
    failedAttempts: [],
  });

  // ===============================
  // 📚 REFS & HOOKS
  // ===============================
  const abortControllerRef = useRef(null);
  const intervalRef = useRef(null);
  const emailInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // ===============================
  // 🛣️ REDIRECT PATH HANDLER
  // ===============================
  const getRedirectPath = useCallback(() => {
    return location.state?.from?.pathname || redirectPath;
  }, [location.state, redirectPath]);

  // ===============================
  // ✅ FORM VALIDATION
  // ===============================
  const validateForm = useCallback(() => {
    const newErrors = {};

    // Email or Phone validation based on login type
    if (uiState.loginType === "email") {
      if (!formData.email.trim()) {
        newErrors.email = "Email address is required";
      } else if (!VALIDATION_PATTERNS.email.test(formData.email.trim())) {
        newErrors.email = "Please enter a valid email address";
      } else if (formData.email.length > 254) {
        newErrors.email = "Email address is too long";
      }
    } else {
      // Phone validation
      if (!formData.email.trim()) {
        newErrors.email = "Mobile number is required";
      } else if (!VALIDATION_PATTERNS.phone.test(formData.email.replace(/\D/g, ""))) {
        newErrors.email = "Please enter a valid 10-digit mobile number";
      }
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!VALIDATION_PATTERNS.password.test(formData.password)) {
      newErrors.password = "Password must be at least 6 characters long";
    } else if (formData.password.length > 128) {
      newErrors.password = "Password is too long";
    }

    // Lockout validation
    if (uiState.loginAttempts >= maxAttempts) {
      newErrors.general = `Too many failed attempts. Please try again in ${Math.ceil(
        uiState.remainingTime / 60000
      )} minutes.`;
    }

    return newErrors;
  }, [formData, uiState.loginAttempts, uiState.remainingTime, uiState.loginType, maxAttempts]);

  // ===============================
  // 📝 INPUT CHANGE HANDLER
  // ===============================
  const handleChange = useCallback(
    (e) => {
      const {name, value, type, checked} = e.target;

      // Sanitize input to prevent XSS
      let sanitizedValue = value;
      if (type !== "checkbox") {
        sanitizedValue = value.replace(/[<>]/g, "");
      }

      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : sanitizedValue,
      }));

      // Clear field-specific errors
      if (uiState.errors[name]) {
        setUiState((prev) => ({
          ...prev,
          errors: {
            ...prev.errors,
            [name]: "",
          },
        }));
      }
    },
    [uiState.errors]
  );

  // ===============================
  // 🔍 DEVICE FINGERPRINTING
  // ===============================
  const generateDeviceFingerprint = useCallback(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("Device fingerprint", 2, 2);

    const fingerprint = {
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      userAgent: navigator.userAgent.substring(0, 100),
      canvas: canvas.toDataURL().substring(0, 100),
      timestamp: Date.now(),
    };

    return btoa(JSON.stringify(fingerprint)).substring(0, 64);
  }, []);

  // ===============================
  // 🚀 FORM SUBMISSION HANDLER
  // ===============================
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset errors
    setUiState((prev) => ({...prev, errors: {}}));

    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setUiState((prev) => ({...prev, errors: validationErrors}));
      return;
    }

    // Check if account is locked
    if (uiState.isLocked) {
      setUiState((prev) => ({
        ...prev,
        errors: {
          general: `Account locked. Please try again in ${Math.ceil(
            uiState.remainingTime / 60000
          )} minutes.`,
        },
      }));
      return;
    }

    // Check internet connection
    if (!navigator.onLine) {
      setUiState((prev) => ({
        ...prev,
        errors: {
          general:
            "No internet connection. Please check your network and try again.",
        },
      }));
      return;
    }

    // Start submission
    setUiState((prev) => ({...prev, isSubmitting: true}));
    abortControllerRef.current = new AbortController();

    try {
      const deviceFingerprint = generateDeviceFingerprint();

      // Prepare login data based on login type
      const loginData = {
        password: formData.password,
        deviceFingerprint,
        clientInfo: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          screen: `${screen.width}x${screen.height}`,
          referrer: document.referrer || "direct",
        },
      };

      // Add email or phone based on login type
      if (uiState.loginType === "phone") {
        loginData.phone = formData.email.trim(); // Using email field for phone input
      } else {
        loginData.email = formData.email.trim().toLowerCase();
      }

      // Call authentication service
      const response = await authService.login(loginData, {
        signal: abortControllerRef.current.signal,
        timeout: 30000,
      });

      if (response.success && response.data) {
        // Prepare authentication data
        const authData = {
          token: response.data.token,
          refreshToken: response.data.refreshToken,
          user: response.data.user,
          loginTime: new Date().toISOString(),
          deviceFingerprint,
          expiresAt:
            response.data.expiresAt ||
            new Date(Date.now() + LOGIN_CONFIG.AUTO_LOGOUT_TIME).toISOString(),
        };

        // Always use sessionStorage
        const storage = sessionStorage;
        storage.setItem("authToken", authData.token);
        storage.setItem("refreshToken", authData.refreshToken);
        storage.setItem("userData", JSON.stringify(authData.user));
        storage.setItem(
          "authMeta",
          JSON.stringify({
            loginTime: authData.loginTime,
            deviceFingerprint: authData.deviceFingerprint,
            expiresAt: authData.expiresAt,
          })
        );

        // Clear lockout data
        localStorage.removeItem("loginLockout");

        // Reset states
        setUiState((prev) => ({
          ...prev,
          loginAttempts: 0,
          isLocked: false,
          lockoutTime: null,
        }));

        setSecurityState((prev) => ({
          ...prev,
          deviceFingerprint,
          failedAttempts: [],
        }));

        // Verify storage
        await new Promise((resolve) => setTimeout(resolve, 100));
        const storedToken = storage.getItem("authToken");
        const storedUser = storage.getItem("userData");

        if (!storedToken || !storedUser) {
          throw new Error(
            "Failed to store authentication data. Please try again."
          );
        }

        // Success callback
        if (onLoginSuccess) {
          onLoginSuccess(response.data.user);
        }

        // Navigate to dashboard
        const redirectTo = getRedirectPath();
        navigate(redirectTo, {replace: true});
      } else {
        throw new Error(
          response.message ||
            "Authentication failed. Please check your credentials."
        );
      }
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      // Handle different error types
      let errorMessage = "Login failed. Please try again.";
      if (error.message.includes("credentials")) {
        errorMessage =
          "Invalid email or password. Please check your credentials and try again.";
      } else if (
        error.message.includes("network") ||
        error.message.includes("fetch")
      ) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Request timed out. Please try again.";
      } else if (error.message.includes("rate limit")) {
        errorMessage = "Too many requests. Please wait a moment and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      const newAttempts = uiState.loginAttempts + 1;

      // Track failed attempts
      const failedAttempt = {
        timestamp: new Date().toISOString(),
        email: formData.email,
        error: error.message,
        deviceFingerprint: securityState.deviceFingerprint,
      };

      setSecurityState((prev) => ({
        ...prev,
        failedAttempts: [...prev.failedAttempts.slice(-4), failedAttempt],
      }));

      // Handle account lockout
      if (newAttempts >= maxAttempts) {
        const lockoutTime = Date.now() + LOGIN_CONFIG.LOCKOUT_DURATION;

        setUiState((prev) => ({
          ...prev,
          loginAttempts: newAttempts,
          isLocked: true,
          lockoutTime,
          remainingTime: LOGIN_CONFIG.LOCKOUT_DURATION,
          errors: {
            general: `Too many failed attempts. Account locked for ${
              LOGIN_CONFIG.LOCKOUT_DURATION / 60000
            } minutes.`,
          },
        }));

        localStorage.setItem(
          "loginLockout",
          JSON.stringify({
            email: formData.email,
            lockoutTime,
            attempts: newAttempts,
          })
        );

        startLockoutCountdown(lockoutTime);
      } else {
        setUiState((prev) => ({
          ...prev,
          loginAttempts: newAttempts,
          errors: {
            general: `${errorMessage} (${newAttempts}/${maxAttempts} attempts)`,
          },
        }));
      }
    } finally {
      setUiState((prev) => ({...prev, isSubmitting: false}));
      abortControllerRef.current = null;
    }
  };

  // ===============================
  // ⏰ LOCKOUT COUNTDOWN
  // ===============================
  const startLockoutCountdown = useCallback((lockoutTime) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const remaining = lockoutTime - Date.now();

      if (remaining <= 0) {
        setUiState((prev) => ({
          ...prev,
          isLocked: false,
          lockoutTime: null,
          remainingTime: 0,
          loginAttempts: 0,
          errors: {},
        }));
        localStorage.removeItem("loginLockout");
        clearInterval(intervalRef.current);
      } else {
        setUiState((prev) => ({
          ...prev,
          remainingTime: remaining,
        }));
      }
    }, 1000);
  }, []);

  // ===============================
  // 👁️ PASSWORD VISIBILITY TOGGLE
  // ===============================
  const togglePasswordVisibility = useCallback(() => {
    setUiState((prev) => ({...prev, showPassword: !prev.showPassword}));
  }, []);

  // ===============================
  // 🔄 LOGIN TYPE TOGGLE
  // ===============================
  const toggleLoginType = useCallback(() => {
    setUiState((prev) => ({
      ...prev,
      loginType: prev.loginType === "email" ? "phone" : "email",
      errors: {},
    }));
    setFormData((prev) => ({...prev, email: ""}));
  }, []);

  // ===============================
  // 🔑 FORGOT PASSWORD HANDLER
  // ===============================
  const handleForgotPassword = useCallback(() => {
    // Navigate to forgot password page or show modal
    navigate("/forgot-password");
  }, [navigate]);

  // ===============================
  // 🔄 EFFECT: CHECK EXISTING LOCKOUT
  // ===============================
  useEffect(() => {
    const checkExistingLockout = () => {
      try {
        const lockoutData = localStorage.getItem("loginLockout");
        if (lockoutData) {
          const {lockoutTime, attempts, email} = JSON.parse(lockoutData);
          const remaining = lockoutTime - Date.now();

          if (remaining > 0 && email === formData.email) {
            setUiState((prev) => ({
              ...prev,
              isLocked: true,
              lockoutTime,
              remainingTime: remaining,
              loginAttempts: attempts,
            }));
            startLockoutCountdown(lockoutTime);
          } else {
            localStorage.removeItem("loginLockout");
          }
        }
      } catch (error) {
        localStorage.removeItem("loginLockout");
      }
    };

    checkExistingLockout();
  }, [formData.email, startLockoutCountdown]);

  // ===============================
  // 🌐 EFFECT: ONLINE STATUS
  // ===============================
  useEffect(() => {
    const handleOnline = () =>
      setUiState((prev) => ({...prev, isOnline: true}));
    const handleOffline = () =>
      setUiState((prev) => ({...prev, isOnline: false}));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ===============================
  // 🎯 EFFECT: AUTO FOCUS EMAIL
  // ===============================
  useEffect(() => {
    if (emailInputRef.current && !formData.email) {
      emailInputRef.current.focus();
    }
  }, [formData.email]);

  // ===============================
  // 🧹 EFFECT: CLEANUP
  // ===============================
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // ===============================
  // 🕐 TIME FORMATTING HELPER
  // ===============================
  const formatRemainingTime = useCallback((ms) => {
    const minutes = Math.ceil(ms / 60000);
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }, []);

  // ===============================
  // 🎨 RENDER COMPONENT
  // ===============================
  return (
    <div className="login-container">
      {/* ✨ LEFT SIDE - HERO SECTION */}
      <div
        className="login-image-section"
        style={{backgroundImage: `url("${bgImage}")`}}
      >
        <div className="login-image-content">
          <h2 className="login-image-title">Welcome Back!</h2>
          <p className="login-image-subtitle">
            Continue your business journey with our professional management
            tools
          </p>
          <ul className="login-features">
            <li className="login-feature">
              <div className="login-feature-icon">
                <FontAwesomeIcon icon={faShieldAlt} size="sm" />
              </div>
              Secure data encryption
            </li>
            <li className="login-feature">
              <div className="login-feature-icon">
                <FontAwesomeIcon icon={faChartLine} size="sm" />
              </div>
              Business analytics
            </li>
            <li className="login-feature">
              <div className="login-feature-icon">
                <FontAwesomeIcon icon={faUsers} size="sm" />
              </div>
              Customer support
            </li>
          </ul>
        </div>
      </div>

      {/* ✨ RIGHT SIDE - LOGIN FORM */}
      <div className="login-form-section">
        <div className="login-form-header">
          <h1 className="login-form-title">Sign In</h1>
          <p className="login-form-subtitle">
            Enter your credentials to access your account
          </p>
        </div>

        {/* ✨ ALERTS */}
        {!uiState.isOnline && (
          <div className="alert-modern alert-warning">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            <div>
              <strong>Connection lost!</strong> Please check your internet
              connection.
            </div>
          </div>
        )}

        {uiState.isLocked && (
          <div className="alert-modern alert-danger">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            <div>
              <strong>Account temporarily locked</strong>
              <br />
              Too many failed login attempts. Please try again in{" "}
              {formatRemainingTime(uiState.remainingTime)}.
            </div>
          </div>
        )}

        {uiState.errors.general && !uiState.isLocked && (
          <div className="alert-modern alert-danger">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            <div>{uiState.errors.general}</div>
          </div>
        )}

        {/* ✨ LOGIN TYPE TOGGLE */}
        <div className="login-type-toggle">
          <button
            type="button"
            className={`login-type-btn ${uiState.loginType === "email" ? "active" : ""}`}
            onClick={toggleLoginType}
            disabled={uiState.isSubmitting}
          >
            <FontAwesomeIcon icon={faEnvelope} className="me-2" />
            Email
          </button>
          <button
            type="button"
            className={`login-type-btn ${uiState.loginType === "phone" ? "active" : ""}`}
            onClick={toggleLoginType}
            disabled={uiState.isSubmitting}
          >
            <FontAwesomeIcon icon={faPhone} className="me-2" />
            Mobile Number
          </button>
        </div>

        {/* ✨ LOGIN FORM */}
        <form onSubmit={handleSubmit} noValidate autoComplete="off">
          {/* Email/Phone Input */}
          <div className="modern-input-group">
            <input
              ref={emailInputRef}
              type={uiState.loginType === "email" ? "email" : "tel"}
              className={`modern-input ${uiState.errors.email ? "error" : ""}`}
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={
                uiState.loginType === "email"
                  ? "Enter your email address"
                  : "Enter your mobile number"
              }
              autoComplete="new-email"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              disabled={uiState.isSubmitting || uiState.isLocked}
              required
            />
            <FontAwesomeIcon 
              icon={uiState.loginType === "email" ? faEnvelope : faPhone} 
              className="modern-input-icon" 
            />
            {uiState.errors.email && (
              <div className="error-message">
                <FontAwesomeIcon icon={faExclamationTriangle} size="sm" />
                {uiState.errors.email}
              </div>
            )}
          </div>

          {/* Password Input */}
          <div className="modern-input-group">
            <input
              type={uiState.showPassword ? "text" : "password"}
              className={`modern-input ${
                uiState.errors.password ? "error" : ""
              }`}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              disabled={uiState.isSubmitting || uiState.isLocked}
              required
            />
            <FontAwesomeIcon icon={faLock} className="modern-input-icon" />
            <button
              type="button"
              className="password-toggle"
              onClick={togglePasswordVisibility}
              disabled={uiState.isSubmitting || uiState.isLocked}
              aria-label={
                uiState.showPassword ? "Hide password" : "Show password"
              }
            >
              <FontAwesomeIcon
                icon={uiState.showPassword ? faEyeSlash : faEye}
              />
            </button>
            {uiState.errors.password && (
              <div className="error-message">
                <FontAwesomeIcon icon={faExclamationTriangle} size="sm" />
                {uiState.errors.password}
              </div>
            )}
          </div>

          {/* Forgot Password Link */}
          <div className="forgot-password-container">
            <button
              type="button"
              className="forgot-password-link"
              onClick={handleForgotPassword}
              disabled={uiState.isSubmitting || uiState.isLocked}
            >
              Forgot Password?
            </button>
          </div>

          {/* Failed Attempts Counter */}
          {uiState.loginAttempts > 0 && !uiState.isLocked && (
            <div className="attempts-counter">
              <FontAwesomeIcon icon={faExclamationTriangle} />
              {uiState.loginAttempts}/{maxAttempts} failed attempts
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="login-button"
            disabled={
              uiState.isSubmitting || uiState.isLocked || !uiState.isOnline
            }
          >
            {uiState.isSubmitting ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                Authenticating...
              </>
            ) : uiState.isLocked ? (
              <>
                <FontAwesomeIcon icon={faLock} className="me-2" />
                Account Locked
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSignInAlt} className="me-2" />
                Sign In Securely
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div className="security-notice">
          <FontAwesomeIcon icon={faShieldAlt} className="me-1" />
          Your connection is secured with enterprise-grade encryption
        </div>

        {/* Toggle to SignUp */}
        <div className="text-center">
          <button
            type="button"
            className="toggle-link"
            onClick={onToggleView}
            disabled={uiState.isSubmitting}
          >
            Don't have an account? <strong>Create one now!</strong>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
