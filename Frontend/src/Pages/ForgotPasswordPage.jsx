import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faArrowLeft,
  faCheckCircle,
  faExclamationTriangle,
  faSpinner,
  faPhone,
  faKey,
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import authService from "../services/authService";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [resetType, setResetType] = useState("email"); // 'email' or 'phone'
  const [step, setStep] = useState(1); // 1: Enter email/phone, 2: Enter OTP, 3: Enter new password
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [otpFromServer, setOtpFromServer] = useState(""); // For development mode

  const validateInput = () => {
    if (!identifier.trim()) {
      setError("Please enter your " + (resetType === "email" ? "email" : "phone number"));
      return false;
    }

    if (resetType === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier)) {
        setError("Please enter a valid email address");
        return false;
      }
    } else {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(identifier)) {
        setError("Please enter a valid 10-digit phone number starting with 6, 7, 8, or 9");
        return false;
      }
    }

    return true;
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateInput()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const credentials = resetType === "email" 
        ? { email: identifier.trim() }
        : { phone: identifier.trim() };

      const response = await authService.forgotPassword(credentials);
      
      if (response.success) {
        // Store OTP if in development mode
        if (response.otp) {
          setOtpFromServer(response.otp);
        }
        setStep(2);
      } else {
        setError(response.message || "Failed to send OTP. Please try again.");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("An error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");

    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authService.verifyOTP(
        resetType === "email" ? identifier.trim() : null,
        resetType === "phone" ? identifier.trim() : null,
        otp
      );
      
      if (response.success) {
        setResetToken(response.resetToken);
        setStep(3);
      } else {
        setError(response.message || "Invalid OTP. Please try again.");
      }
    } catch (err) {
      console.error("Verify OTP error:", err);
      setError("An error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authService.resetPassword(resetToken, newPassword);
      
      if (response.success) {
        setSuccess(true);
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/");
        }, 3000);
      } else {
        setError(response.message || "Failed to reset password. Please try again.");
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setError("An error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <button style={styles.backButton} onClick={() => navigate("/")}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Login
        </button>

        <div style={styles.header}>
          <h1 style={styles.title}>
            {step === 1 && "Forgot Password?"}
            {step === 2 && "Verify OTP"}
            {step === 3 && "Reset Password"}
          </h1>
          <p style={styles.subtitle}>
            {success
              ? "Password reset successful!"
              : step === 1
              ? "Enter your email or mobile number to receive OTP"
              : step === 2
              ? "Enter the 6-digit OTP sent to your " + resetType
              : "Enter your new password"}
          </p>
        </div>

        {/* Progress Indicator */}
        {!success && (
          <div style={styles.progressContainer}>
            <div style={{...styles.progressStep, ...(step >= 1 ? styles.progressStepActive : {})}}>
              <div style={styles.progressCircle}>1</div>
              <span>Contact</span>
            </div>
            <div style={styles.progressLine}></div>
            <div style={{...styles.progressStep, ...(step >= 2 ? styles.progressStepActive : {})}}>
              <div style={styles.progressCircle}>2</div>
              <span>Verify OTP</span>
            </div>
            <div style={styles.progressLine}></div>
            <div style={{...styles.progressStep, ...(step >= 3 ? styles.progressStepActive : {})}}>
              <div style={styles.progressCircle}>3</div>
              <span>New Password</span>
            </div>
          </div>
        )}

        {!success ? (
          <>
            {error && (
              <div style={styles.errorAlert}>
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <span style={{marginLeft: "8px"}}>{error}</span>
              </div>
            )}

            {/* Development mode OTP display */}
            {otpFromServer && step === 2 && (
              <div style={styles.devOtpAlert}>
                <strong>Development Mode OTP:</strong> {otpFromServer}
              </div>
            )}

            {/* Step 1: Enter Email/Phone */}
            {step === 1 && (
              <>
                {/* Reset Type Toggle */}
                <div style={styles.toggleContainer}>
                  <button
                    type="button"
                    style={{
                      ...styles.toggleBtn,
                      ...(resetType === "email" ? styles.toggleBtnActive : {}),
                    }}
                    onClick={() => {
                      setResetType("email");
                      setIdentifier("");
                      setError("");
                    }}
                  >
                    <FontAwesomeIcon icon={faEnvelope} style={{marginRight: "8px"}} />
                    Email
                  </button>
                  <button
                    type="button"
                    style={{
                      ...styles.toggleBtn,
                      ...(resetType === "phone" ? styles.toggleBtnActive : {}),
                    }}
                    onClick={() => {
                      setResetType("phone");
                      setIdentifier("");
                      setError("");
                    }}
                  >
                    <FontAwesomeIcon icon={faPhone} style={{marginRight: "8px"}} />
                    Mobile Number
                  </button>
                </div>

                <form onSubmit={handleRequestOTP}>
                  <div style={styles.inputGroup}>
                    <FontAwesomeIcon
                      icon={resetType === "email" ? faEnvelope : faPhone}
                      style={styles.inputIcon}
                    />
                    <input
                      type={resetType === "email" ? "email" : "tel"}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={
                        resetType === "email"
                          ? "Enter your email address"
                          : "Enter your mobile number"
                      }
                      style={styles.input}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <button
                    type="submit"
                    style={styles.submitButton}
                    disabled={isSubmitting || !identifier}
                  >
                    {isSubmitting ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} spin style={{marginRight: "8px"}} />
                        Sending OTP...
                      </>
                    ) : (
                      "Send OTP"
                    )}
                  </button>
                </form>
              </>
            )}

            {/* Step 2: Enter OTP */}
            {step === 2 && (
              <form onSubmit={handleVerifyOTP}>
                <div style={styles.inputGroup}>
                  <FontAwesomeIcon icon={faKey} style={styles.inputIcon} />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    style={styles.input}
                    maxLength={6}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <button
                  type="submit"
                  style={styles.submitButton}
                  disabled={isSubmitting || otp.length !== 6}
                >
                  {isSubmitting ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin style={{marginRight: "8px"}} />
                      Verifying...
                    </>
                  ) : (
                    "Verify OTP"
                  )}
                </button>

                <button
                  type="button"
                  style={styles.linkButton}
                  onClick={() => {
                    setStep(1);
                    setOtp("");
                    setError("");
                  }}
                  disabled={isSubmitting}
                >
                  Didn't receive OTP? Try again
                </button>
              </form>
            )}

            {/* Step 3: Enter New Password */}
            {step === 3 && (
              <form onSubmit={handleResetPassword}>
                <div style={styles.inputGroup}>
                  <FontAwesomeIcon icon={faLock} style={styles.inputIcon} />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    style={styles.input}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <FontAwesomeIcon icon={faLock} style={styles.inputIcon} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    style={styles.input}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <button
                  type="submit"
                  style={styles.submitButton}
                  disabled={isSubmitting || !newPassword || !confirmPassword}
                >
                  {isSubmitting ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin style={{marginRight: "8px"}} />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>
            )}
          </>
        ) : (
          <div style={styles.successContainer}>
            <FontAwesomeIcon
              icon={faCheckCircle}
              style={styles.successIcon}
            />
            <h2 style={styles.successTitle}>Password Reset Successful!</h2>
            <p style={styles.successMessage}>
              Your password has been reset successfully. You can now login with your new password.
            </p>
            <p style={styles.redirectMessage}>
              Redirecting to login page in 3 seconds...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  card: {
    background: "white",
    borderRadius: "20px",
    padding: "40px",
    maxWidth: "500px",
    width: "100%",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
  },
  backButton: {
    background: "none",
    border: "none",
    color: "#667eea",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 0",
  },
  header: {
    textAlign: "center",
    marginBottom: "30px",
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "10px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#6b7280",
    lineHeight: "1.5",
  },
  toggleContainer: {
    display: "flex",
    gap: "8px",
    marginBottom: "20px",
    background: "#f3f4f6",
    padding: "4px",
    borderRadius: "10px",
  },
  toggleBtn: {
    flex: 1,
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    background: "transparent",
    color: "#6b7280",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnActive: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
  },
  errorAlert: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#dc2626",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
  },
  inputGroup: {
    position: "relative",
    marginBottom: "20px",
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#9ca3af",
    fontSize: "16px",
  },
  input: {
    width: "100%",
    padding: "12px 12px 12px 45px",
    border: "2px solid #e5e7eb",
    borderRadius: "10px",
    fontSize: "16px",
    transition: "all 0.3s ease",
    background: "#f9fafb",
    boxSizing: "border-box",
  },
  submitButton: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    border: "none",
    borderRadius: "10px",
    color: "white",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "20px",
  },
  linkButton: {
    width: "100%",
    padding: "12px",
    background: "transparent",
    border: "none",
    color: "#667eea",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "10px",
    textDecoration: "underline",
  },
  progressContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    margin: "30px 0",
    padding: "0 20px",
  },
  progressStep: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    color: "#9ca3af",
    fontSize: "12px",
    fontWeight: "600",
  },
  progressStepActive: {
    color: "#667eea",
  },
  progressCircle: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "#e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: "700",
    color: "#9ca3af",
  },
  progressLine: {
    flex: 1,
    height: "2px",
    background: "#e5e7eb",
    margin: "0 10px",
    marginTop: "-20px",
  },
  devOtpAlert: {
    background: "#fef3c7",
    border: "1px solid #fbbf24",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "20px",
    fontSize: "14px",
    color: "#92400e",
    textAlign: "center",
  },
  successContainer: {
    textAlign: "center",
    padding: "20px 0",
  },
  successIcon: {
    fontSize: "64px",
    color: "#10b981",
    marginBottom: "20px",
  },
  successTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "15px",
  },
  successMessage: {
    fontSize: "14px",
    color: "#6b7280",
    lineHeight: "1.6",
    marginBottom: "20px",
  },
  redirectMessage: {
    fontSize: "13px",
    color: "#9ca3af",
    fontStyle: "italic",
  },
};

export default ForgotPasswordPage;
