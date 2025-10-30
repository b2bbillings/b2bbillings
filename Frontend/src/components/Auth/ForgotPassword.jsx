import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faArrowLeft,
  faCheckCircle,
  faExclamationTriangle,
  faSpinner,
  faShieldAlt,
} from "@fortawesome/free-solid-svg-icons";
import authService from "../../services/authService";
import "./ForgotPassword.css";

// ===============================
// 🎯 VALIDATION PATTERNS
// ===============================
const VALIDATION_PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
};

// ===============================
// 🚀 FORGOT PASSWORD COMPONENT
// ===============================
function ForgotPassword({
  onBackToLogin,
  bgImage = "https://images.pexels.com/photos/3987020/pexels-photo-3987020.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
}) {
  // ===============================
  // 📝 STATE MANAGEMENT
  // ===============================
  const [formData, setFormData] = useState({
    email: "",
  });

  const [uiState, setUiState] = useState({
    errors: {},
    isSubmitting: false,
    isSuccess: false,
    isOnline: navigator.onLine,
    countdown: 0,
  });

  // ===============================
  // 📚 REFS & HOOKS
  // ===============================
  const emailInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const navigate = useNavigate();

  // ===============================
  // 📝 INPUT CHANGE HANDLER
  // ===============================
  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;

      // Sanitize input to prevent XSS
      const sanitizedValue = value.replace(/[<>]/g, "");

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

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!VALIDATION_PATTERNS.email.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    return newErrors;
  }, [formData]);

  // ===============================
  // ⏰ COUNTDOWN TIMER
  // ===============================
  const startCountdown = useCallback(() => {
    setUiState((prev) => ({ ...prev, countdown: 60 }));

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      setUiState((prev) => {
        const newCountdown = prev.countdown - 1;
        if (newCountdown <= 0) {
          clearInterval(countdownIntervalRef.current);
          return { ...prev, countdown: 0 };
        }
        return { ...prev, countdown: newCountdown };
      });
    }, 1000);
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

    // Reset errors and success state
    setUiState((prev) => ({ ...prev, errors: {}, isSuccess: false }));

    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setUiState((prev) => ({ ...prev, errors: validationErrors }));
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
    setUiState((prev) => ({ ...prev, isSubmitting: true }));
    abortControllerRef.current = new AbortController();

    try {
      const response = await authService.forgotPassword(
        formData.email.trim().toLowerCase(),
        {
          signal: abortControllerRef.current.signal,
          timeout: 30000,
        }
      );

      if (response.success) {
        setUiState((prev) => ({
          ...prev,
          isSuccess: true,
          isSubmitting: false,
        }));

        // Start countdown
        startCountdown();

        // Auto redirect to login after 60 seconds
        setTimeout(() => {
          if (onBackToLogin) {
            onBackToLogin();
          } else {
            navigate("/login");
          }
        }, 60000);
      } else {
        setUiState((prev) => ({
          ...prev,
          isSubmitting: false,
          errors: {
            general:
              response.message ||
              "Failed to send reset email. Please try again.",
          },
        }));
      }
    } catch (error) {
      console.error("❌ Forgot password error:", error);

      let errorMessage = "An unexpected error occurred. Please try again.";

      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        errorMessage =
          "Request timeout. Please check your connection and try again.";
      } else if (error.response) {
        const status = error.response.status;
        if (status === 404) {
          errorMessage =
            "No account found with this email address. Please check and try again.";
        } else if (status === 429) {
          errorMessage =
            "Too many requests. Please wait a few minutes before trying again.";
        } else if (status >= 500) {
          errorMessage =
            "Server error. Please try again later or contact support.";
        } else {
          errorMessage =
            error.response.data?.message ||
            "Failed to send reset email. Please try again.";
        }
      } else if (error.message === "Network Error") {
        errorMessage =
          "Network error. Please check your internet connection.";
      }

      setUiState((prev) => ({
        ...prev,
        isSubmitting: false,
        errors: { general: errorMessage },
      }));
    }
  };

  // ===============================
  // 🔙 BACK TO LOGIN HANDLER
  // ===============================
  const handleBackToLogin = useCallback(() => {
    if (onBackToLogin) {
      onBackToLogin();
    } else {
      navigate("/login");
    }
  }, [onBackToLogin, navigate]);

  // ===============================
  // 🌐 EFFECT: ONLINE STATUS
  // ===============================
  useEffect(() => {
    const handleOnline = () =>
      setUiState((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () =>
      setUiState((prev) => ({ ...prev, isOnline: false }));

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
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // ===============================
  // 🎨 RENDER COMPONENT
  // ===============================
  return (
    <div className="forgot-password-container">
      {/* ✨ LEFT SIDE - HERO SECTION */}
      <div
        className="forgot-password-image-section"
        style={{ backgroundImage: `url("${bgImage}")` }}
      >
        <div className="forgot-password-image-content">
          <h2 className="forgot-password-image-title">Reset Your Password</h2>
          <p className="forgot-password-image-subtitle">
            Don't worry! We'll send you instructions to reset your password
            securely
          </p>
          <ul className="forgot-password-features">
            <li className="forgot-password-feature">
              <div className="forgot-password-feature-icon">
                <FontAwesomeIcon icon={faShieldAlt} size="sm" />
              </div>
              Secure password reset link
            </li>
            <li className="forgot-password-feature">
              <div className="forgot-password-feature-icon">
                <FontAwesomeIcon icon={faEnvelope} size="sm" />
              </div>
              Email sent instantly
            </li>
            <li className="forgot-password-feature">
              <div className="forgot-password-feature-icon">
                <FontAwesomeIcon icon={faCheckCircle} size="sm" />
              </div>
              Quick and easy process
            </li>
          </ul>
        </div>
      </div>

      {/* ✨ RIGHT SIDE - FORGOT PASSWORD FORM */}
      <div className="forgot-password-form-section">
        {/* Back to Login Button */}
        <button
          type="button"
          className="back-to-login-btn"
          onClick={handleBackToLogin}
          disabled={uiState.isSubmitting}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
          Back to Login
        </button>

        <div className="forgot-password-form-content">
          <div className="forgot-password-form-header">
            <h1 className="forgot-password-form-title">
              {uiState.isSuccess ? "Check Your Email!" : "Forgot Password?"}
            </h1>
            <p className="forgot-password-form-subtitle">
              {uiState.isSuccess
                ? "We've sent password reset instructions to your email"
                : "Enter your email address and we'll send you a link to reset your password"}
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

        {uiState.errors.general && !uiState.isSuccess && (
          <div className="alert-modern alert-danger">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            <div>{uiState.errors.general}</div>
          </div>
        )}

        {uiState.isSuccess && (
          <div className="alert-success success-card">
            <div className="success-icon">
              <FontAwesomeIcon icon={faCheckCircle} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "0.75rem", color: "#166534" }}>
                Email Sent Successfully!
              </h3>
              <p style={{ marginBottom: "0.5rem", fontSize: "1rem", lineHeight: "1.6" }}>
                We've sent password reset instructions to{" "}
                <strong style={{ color: "#059669" }}>{formData.email}</strong>
              </p>
              <p style={{ fontSize: "0.95rem", color: "#047857" }}>
                Please check your inbox and spam folder.
              </p>
              {uiState.countdown > 0 && (
                <div className="countdown-text">
                  <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                  Resend available in {uiState.countdown} seconds...
                </div>
              )}
            </div>
          </div>
        )}

        {/* ✨ FORGOT PASSWORD FORM */}
        {!uiState.isSuccess && (
          <form onSubmit={handleSubmit} noValidate>
            {/* Email Input */}
            <div className="modern-input-group">
              <input
                ref={emailInputRef}
                type="email"
                className={`modern-input ${
                  uiState.errors.email ? "error" : ""
                }`}
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email address"
                autoComplete="email"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                disabled={uiState.isSubmitting}
                required
              />
              <FontAwesomeIcon
                icon={faEnvelope}
                className="modern-input-icon"
              />
              {uiState.errors.email && (
                <div className="error-message">
                  <FontAwesomeIcon icon={faExclamationTriangle} size="sm" />
                  {uiState.errors.email}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="forgot-password-button"
              disabled={uiState.isSubmitting || !uiState.isOnline}
            >
              {uiState.isSubmitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                  Sending Reset Link...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                  Send Reset Link
                </>
              )}
            </button>
          </form>
        )}

        {/* Success Actions */}
        {uiState.isSuccess && (
          <div className="success-actions">
            <button
              type="button"
              className="forgot-password-button"
              onClick={handleBackToLogin}
            >
              <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
              Back to Login
            </button>
            <button
              type="button"
              className="resend-button"
              onClick={() => setUiState((prev) => ({ ...prev, isSuccess: false }))}
              disabled={uiState.countdown > 0}
            >
              <FontAwesomeIcon icon={faEnvelope} className="me-2" />
              Didn't receive email? Send again
            </button>
          </div>
        )}

          {/* Security Notice */}
          <div className="security-notice">
            <FontAwesomeIcon icon={faShieldAlt} className="me-1" />
            Your password reset link will expire in 1 hour for security
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
