import {useState, useCallback, useRef, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import "./SignUp.css";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faUser,
  faEnvelope,
  faLock,
  faPhone,
  faSignInAlt,
  faEye,
  faEyeSlash,
  faSpinner,
  faShieldAlt,
  faExclamationTriangle,
  faCheck,
  faBuilding,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import authService from "../../services/authService";

// ===============================
// 🎯 VALIDATION PATTERNS
// ===============================
const VALIDATION_PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\d{10,15}$/,
  password: /^(?=.*[a-zA-Z])(?=.*[0-9]).{6,}$/,
  name: /^[a-zA-Z\s]{2,50}$/,
};

// ===============================
// 🚀 SIGNUP COMPONENT
// ===============================
function SignUp({
  onToggleView,
  bgImage = "https://images.pexels.com/photos/3184164/pexels-photo-3184164.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
  onSignupSuccess,
}) {
  // ===============================
  // 📝 STATE MANAGEMENT
  // ===============================
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [uiState, setUiState] = useState({
    errors: {},
    isSubmitting: false,
    showPassword: false,
    showConfirmPassword: false,
    isOnline: navigator.onLine,
  });

  // ===============================
  // 📚 REFS & HOOKS
  // ===============================
  const abortControllerRef = useRef(null);
  const nameInputRef = useRef(null);
  const navigate = useNavigate();

  // ===============================
  // 📝 INPUT CHANGE HANDLER
  // ===============================
  const handleChange = useCallback(
    (e) => {
      const {name, value} = e.target;

      // Sanitize input to prevent XSS
      let sanitizedValue = value.replace(/[<>]/g, "");

      // Additional sanitization for specific fields
      if (name === "phone") {
        sanitizedValue = value.replace(/[^\d+\-\s()]/g, "");
      } else if (name === "name") {
        sanitizedValue = value.replace(/[^a-zA-Z\s]/g, "");
      }

      setFormData((prev) => ({
        ...prev,
        [name]: sanitizedValue,
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
  // ✅ FORM VALIDATION
  // ===============================
  const validateForm = useCallback(() => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (formData.name.trim().length > 50) {
      newErrors.name = "Name must be less than 50 characters";
    } else if (!VALIDATION_PATTERNS.name.test(formData.name.trim())) {
      newErrors.name = "Name can only contain letters and spaces";
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!VALIDATION_PATTERNS.email.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    } else if (formData.email.length > 254) {
      newErrors.email = "Email address is too long";
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (
      !VALIDATION_PATTERNS.phone.test(formData.phone.replace(/\D/g, ""))
    ) {
      newErrors.phone = "Please enter a valid phone number (10-15 digits)";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    } else if (formData.password.length > 128) {
      newErrors.password = "Password is too long";
    } else if (!VALIDATION_PATTERNS.password.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one letter and one number";
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    return newErrors;
  }, [formData]);

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
      // Prepare signup data
      const signupData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.trim(),
        clientInfo: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
        },
      };

      // Call authentication service
      const response = await authService.signup(signupData, {
        signal: abortControllerRef.current.signal,
        timeout: 30000,
      });

      if (response.success && response.data) {
        // Store authentication data in sessionStorage
        sessionStorage.setItem("authToken", response.data.token);
        sessionStorage.setItem("refreshToken", response.data.refreshToken);
        sessionStorage.setItem("userData", JSON.stringify(response.data.user));
        sessionStorage.setItem(
          "authMeta",
          JSON.stringify({
            loginTime: new Date().toISOString(),
            signupTime: new Date().toISOString(),
            expiresAt:
              response.data.expiresAt ||
              new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
          })
        );

        // Verify storage
        await new Promise((resolve) => setTimeout(resolve, 100));
        const storedToken = sessionStorage.getItem("authToken");
        const storedUser = sessionStorage.getItem("userData");

        if (!storedToken || !storedUser) {
          throw new Error(
            "Failed to store authentication data. Please try again."
          );
        }

        // Reset form
        setFormData({
          name: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
        });
        setUiState((prev) => ({
          ...prev,
          showPassword: false,
          showConfirmPassword: false,
        }));

        // Success callback
        if (onSignupSuccess) {
          onSignupSuccess(response.data.user);
        }

        // Navigate to dashboard
        navigate("/dashboard", {replace: true});
      } else {
        throw new Error(
          response.message || "Account creation failed. Please try again."
        );
      }
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      // Handle different error types
      let errorMessage = "Signup failed. Please try again.";
      if (error.message.includes("email")) {
        errorMessage =
          "Email address is already registered. Please use a different email.";
      } else if (
        error.message.includes("network") ||
        error.message.includes("fetch")
      ) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Request timed out. Please try again.";
      } else if (error.message.includes("validation")) {
        errorMessage = "Please check your information and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setUiState((prev) => ({
        ...prev,
        errors: {general: errorMessage},
      }));
    } finally {
      setUiState((prev) => ({...prev, isSubmitting: false}));
      abortControllerRef.current = null;
    }
  };

  // ===============================
  // 👁️ PASSWORD VISIBILITY TOGGLES
  // ===============================
  const togglePasswordVisibility = useCallback(() => {
    setUiState((prev) => ({...prev, showPassword: !prev.showPassword}));
  }, []);

  const toggleConfirmPasswordVisibility = useCallback(() => {
    setUiState((prev) => ({
      ...prev,
      showConfirmPassword: !prev.showConfirmPassword,
    }));
  }, []);

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
  // 🎯 EFFECT: AUTO FOCUS NAME
  // ===============================
  useEffect(() => {
    if (nameInputRef.current && !formData.name) {
      nameInputRef.current.focus();
    }
  }, [formData.name]);

  // ===============================
  // 🧹 EFFECT: CLEANUP
  // ===============================
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ===============================
  // 🎨 RENDER COMPONENT
  // ===============================
  return (
    <div className="signup-container">
      {/* ✨ LEFT SIDE - HERO SECTION */}
      <div
        className="signup-image-section"
        style={{backgroundImage: `url("${bgImage}")`}}
      >
        <div className="signup-image-content">
          <h2 className="signup-image-title">Start Your Business Journey</h2>
          <p className="signup-image-subtitle">
            Join our platform and take control of your business operations with
            professional tools
          </p>
          <ul className="signup-features">
            <li className="signup-feature">
              <div className="signup-feature-icon">
                <FontAwesomeIcon icon={faShieldAlt} size="sm" />
              </div>
              Secure data encryption
            </li>
            <li className="signup-feature">
              <div className="signup-feature-icon">
                <FontAwesomeIcon icon={faBuilding} size="sm" />
              </div>
              Business management tools
            </li>
            <li className="signup-feature">
              <div className="signup-feature-icon">
                <FontAwesomeIcon icon={faUsers} size="sm" />
              </div>
              Customer support
            </li>
          </ul>
        </div>
      </div>

      {/* ✨ RIGHT SIDE - SIGNUP FORM */}
      <div className="signup-form-section">
        <div className="signup-form-header">
          <h1 className="signup-form-title">Create Account</h1>
          <p className="signup-form-subtitle">
            Get started with your business management platform
          </p>
        </div>

        {/* ✨ ALERTS */}
        {!uiState.isOnline && (
          <div className="signup-alert-modern signup-alert-warning">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            <div>
              <strong>Connection lost!</strong> Please check your internet
              connection.
            </div>
          </div>
        )}

        {uiState.errors.general && (
          <div className="signup-alert-modern signup-alert-danger">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            <div>{uiState.errors.general}</div>
          </div>
        )}

        {/* ✨ SIGNUP FORM */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div className="signup-input-group">
            <input
              ref={nameInputRef}
              type="text"
              className={`signup-input ${uiState.errors.name ? "error" : ""}`}
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Full Name"
              autoComplete="name"
              disabled={uiState.isSubmitting}
              required
            />
            <FontAwesomeIcon icon={faUser} className="signup-input-icon" />
            {uiState.errors.name && (
              <div className="signup-error-message">
                <FontAwesomeIcon icon={faExclamationTriangle} size="sm" />
                {uiState.errors.name}
              </div>
            )}
          </div>

          {/* Email & Phone Row */}
          <div className="form-row">
            <div className="signup-input-group">
              <input
                type="email"
                className={`signup-input ${
                  uiState.errors.email ? "error" : ""
                }`}
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email Address"
                autoComplete="email"
                disabled={uiState.isSubmitting}
                required
              />
              <FontAwesomeIcon
                icon={faEnvelope}
                className="signup-input-icon"
              />
              {uiState.errors.email && (
                <div className="signup-error-message">
                  <FontAwesomeIcon icon={faExclamationTriangle} size="sm" />
                  {uiState.errors.email}
                </div>
              )}
            </div>

            <div className="signup-input-group">
              <input
                type="tel"
                className={`signup-input ${
                  uiState.errors.phone ? "error" : ""
                }`}
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone Number"
                autoComplete="tel"
                disabled={uiState.isSubmitting}
                required
              />
              <FontAwesomeIcon icon={faPhone} className="signup-input-icon" />
              {uiState.errors.phone && (
                <div className="signup-error-message">
                  <FontAwesomeIcon icon={faExclamationTriangle} size="sm" />
                  {uiState.errors.phone}
                </div>
              )}
            </div>
          </div>

          {/* Password & Confirm Password Row */}
          <div className="form-row">
            <div className="signup-input-group">
              <input
                type={uiState.showPassword ? "text" : "password"}
                className={`signup-input ${
                  uiState.errors.password ? "error" : ""
                }`}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                autoComplete="new-password"
                disabled={uiState.isSubmitting}
                required
              />
              <FontAwesomeIcon icon={faLock} className="signup-input-icon" />
              <button
                type="button"
                className="signup-password-toggle"
                onClick={togglePasswordVisibility}
                disabled={uiState.isSubmitting}
                aria-label={
                  uiState.showPassword ? "Hide password" : "Show password"
                }
              >
                <FontAwesomeIcon
                  icon={uiState.showPassword ? faEyeSlash : faEye}
                />
              </button>
              {uiState.errors.password && (
                <div className="signup-error-message">
                  <FontAwesomeIcon icon={faExclamationTriangle} size="sm" />
                  {uiState.errors.password}
                </div>
              )}
            </div>

            <div className="signup-input-group">
              <input
                type={uiState.showConfirmPassword ? "text" : "password"}
                className={`signup-input ${
                  uiState.errors.confirmPassword ? "error" : ""
                }`}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm Password"
                autoComplete="new-password"
                disabled={uiState.isSubmitting}
                required
              />
              <FontAwesomeIcon icon={faLock} className="signup-input-icon" />
              <button
                type="button"
                className="signup-password-toggle"
                onClick={toggleConfirmPasswordVisibility}
                disabled={uiState.isSubmitting}
                aria-label={
                  uiState.showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
              >
                <FontAwesomeIcon
                  icon={uiState.showConfirmPassword ? faEyeSlash : faEye}
                />
              </button>
              {uiState.errors.confirmPassword && (
                <div className="signup-error-message">
                  <FontAwesomeIcon icon={faExclamationTriangle} size="sm" />
                  {uiState.errors.confirmPassword}
                </div>
              )}
            </div>
          </div>

          {/* Password Requirements */}
          <div className="password-requirements">
            <FontAwesomeIcon icon={faShieldAlt} className="me-1" />
            <strong>Password Requirements:</strong>
            <ul className="requirement-list">
              <li>At least 6 characters long</li>
              <li>Must contain at least one letter and one number</li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="signup-button"
            disabled={uiState.isSubmitting || !uiState.isOnline}
          >
            {uiState.isSubmitting ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                Creating Account...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faCheck} className="me-2" />
                Create Account
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div className="signup-security-notice">
          <FontAwesomeIcon icon={faShieldAlt} className="me-1" />
          Your data is protected with enterprise-grade security
        </div>

        {/* Toggle to Login */}
        <div className="text-center">
          <button
            type="button"
            className="signup-toggle-link"
            onClick={onToggleView}
            disabled={uiState.isSubmitting}
          >
            Already have an account? <strong>Sign in now!</strong>
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
