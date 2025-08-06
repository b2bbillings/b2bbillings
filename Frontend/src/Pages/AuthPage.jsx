import {useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faRightToBracket,
  faUserPlus,
  faStore,
  faShield,
  faUsers,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";
import Login from "../components/Auth/Login";
import SignUp from "../components/Auth/SignUp";

const AUTH_IMAGES = {
  signUp:
    "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
  login:
    "https://images.pexels.com/photos/3184164/pexels-photo-3184164.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
};

function AuthPage({onLogin}) {
  const [currentView, setCurrentView] = useState("login");

  const toggleView = () => {
    setCurrentView(currentView === "login" ? "signup" : "login");
  };

  const handleAuthSuccess = (userData) => {
    if (onLogin) {
      onLogin(userData);
    }
  };

  return (
    <>
      {/* ✨ MODERN STYLES */}
      <style>{`
        .auth-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
          position: relative;
          overflow: hidden;
        }

        .auth-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="0.5" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
          opacity: 0.3;
        }

        .auth-hero {
          position: relative;
          z-index: 1;
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding: 2rem 0;
        }

        .auth-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          margin: 0 auto;
          max-width: 1200px;
          position: relative;
        }

        .auth-header {
          text-align: left;
          padding: 2.5rem 3rem 2rem;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
          border-bottom: 1px solid rgba(102, 126, 234, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 2rem;
        }

        .auth-header-left {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .brand-logo {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.8rem;
          font-weight: 800;
          color: #667eea;
          text-decoration: none;
          margin-bottom: 0.5rem;
        }

        .brand-icon {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .auth-subtitle {
          color: #6b7280;
          font-size: 1rem;
          margin: 0;
          font-weight: 500;
          line-height: 1.5;
        }

        .feature-badges {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
          flex-wrap: wrap;
        }

        .feature-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(102, 126, 234, 0.1);
          color: #667eea;
          padding: 0.5rem 1rem;
          border-radius: 50px;
          font-size: 0.85rem;
          font-weight: 600;
          border: 1px solid rgba(102, 126, 234, 0.2);
        }

        .auth-header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1rem;
        }

        .auth-toggle-section {
          text-align: right;
        }

        .auth-toggle-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.75rem;
          margin: 0 0 0.75rem 0;
        }

        .auth-toggle {
          display: inline-flex;
          background: rgba(255, 255, 255, 0.9);
          border: 2px solid rgba(102, 126, 234, 0.2);
          border-radius: 50px;
          padding: 0.25rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
        }

        .toggle-btn {
          padding: 0.875rem 2.25rem;
          border: none;
          border-radius: 50px;
          font-weight: 600;
          font-size: 0.95rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          white-space: nowrap;
          min-width: 140px;
        }

        .toggle-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transition: left 0.5s;
        }

        .toggle-btn:hover::before {
          left: 100%;
        }

        .toggle-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
          transform: translateY(-2px);
        }

        .toggle-btn.inactive {
          background: transparent;
          color: #6b7280;
        }

        .toggle-btn.inactive:hover {
          background: rgba(102, 126, 234, 0.1);
          color: #667eea;
          transform: translateY(-1px);
        }

        .auth-toggle-subtitle {
          color: #9ca3af;
          font-size: 0.875rem;
          margin-top: 0.5rem;
          font-weight: 500;
        }

        .auth-content {
          position: relative;
          min-height: 600px;
        }

        .floating-elements {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .floating-circle {
          position: absolute;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          animation: float 6s ease-in-out infinite;
        }

        .floating-circle:nth-child(1) {
          width: 120px;
          height: 120px;
          top: 10%;
          left: 10%;
          animation-delay: 0s;
        }

        .floating-circle:nth-child(2) {
          width: 80px;
          height: 80px;
          top: 60%;
          right: 15%;
          animation-delay: 2s;
        }

        .floating-circle:nth-child(3) {
          width: 60px;
          height: 60px;
          bottom: 20%;
          left: 20%;
          animation-delay: 4s;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }

        /* Mobile Responsive */
        @media (max-width: 992px) {
          .auth-header {
            flex-direction: column;
            text-align: center;
            gap: 2rem;
            padding: 2rem 2rem 1.5rem;
          }
          
          .auth-header-left,
          .auth-header-right {
            align-items: center;
            text-align: center;
          }
          
          .auth-toggle-section {
            text-align: center;
          }
          
          .feature-badges {
            justify-content: center;
          }
        }

        @media (max-width: 768px) {
          .auth-header {
            padding: 1.5rem 1.5rem 1rem;
          }
          
          .brand-logo {
            font-size: 1.5rem;
          }
          
          .brand-icon {
            width: 40px;
            height: 40px;
          }
          
          .toggle-btn {
            padding: 0.75rem 1.75rem;
            font-size: 0.9rem;
            min-width: 120px;
          }
          
          .auth-toggle-title {
            font-size: 1.125rem;
          }
          
          .feature-badges {
            gap: 0.5rem;
          }
          
          .feature-badge {
            font-size: 0.8rem;
            padding: 0.4rem 0.8rem;
          }
        }

        @media (max-width: 480px) {
          .auth-card {
            margin: 1rem;
            max-width: none;
          }
          
          .auth-header {
            padding: 1.5rem 1rem 1rem;
          }
          
          .toggle-btn {
            padding: 0.6rem 1.25rem;
            font-size: 0.85rem;
            min-width: 100px;
          }
          
          .auth-toggle {
            padding: 0.15rem;
          }
        }
      `}</style>

      <div className="auth-container">
        <div className="auth-hero">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-12">
                <div className="auth-card">
                  {/* ✨ MODERN HEADER */}
                  <div className="auth-header">
                    {/* LEFT SIDE - Brand & Features */}
                    <div className="auth-header-left">
                      <a href="/" className="brand-logo">
                        <div className="brand-icon">
                          <FontAwesomeIcon icon={faStore} />
                        </div>
                        Shop Management
                      </a>

                      <p className="auth-subtitle">
                        {currentView === "login"
                          ? "Welcome back! Sign in to your account to continue managing your business operations."
                          : "Start your journey with our comprehensive business management platform."}
                      </p>

                      <div className="feature-badges">
                        <div className="feature-badge">
                          <FontAwesomeIcon icon={faShield} />
                          Secure & Encrypted
                        </div>
                        <div className="feature-badge">
                          <FontAwesomeIcon icon={faUsers} />
                          User-Friendly
                        </div>
                        <div className="feature-badge">
                          <FontAwesomeIcon icon={faChartLine} />
                          Analytics Dashboard
                        </div>
                      </div>
                    </div>

                    {/* RIGHT SIDE - Toggle & Action */}
                    <div className="auth-header-right">
                      <div className="auth-toggle-section">
                        <h2 className="auth-toggle-title">
                          {currentView === "login"
                            ? "Sign In"
                            : "Create Account"}
                        </h2>

                        <div className="auth-toggle">
                          <button
                            className={`toggle-btn ${
                              currentView === "login" ? "active" : "inactive"
                            }`}
                            onClick={() => setCurrentView("login")}
                            aria-label="Switch to login"
                          >
                            <FontAwesomeIcon
                              icon={faRightToBracket}
                              className="me-2"
                            />
                            Sign In
                          </button>
                          <button
                            className={`toggle-btn ${
                              currentView === "signup" ? "active" : "inactive"
                            }`}
                            onClick={() => setCurrentView("signup")}
                            aria-label="Switch to sign up"
                          >
                            <FontAwesomeIcon
                              icon={faUserPlus}
                              className="me-2"
                            />
                            Create Account
                          </button>
                        </div>

                        <p className="auth-toggle-subtitle">
                          {currentView === "login"
                            ? "Access your dashboard and manage your business"
                            : "Join thousands of businesses managing their operations"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ✨ CONTENT WITH FLOATING ELEMENTS */}
                  <div className="auth-content">
                    <div className="floating-elements">
                      <div className="floating-circle"></div>
                      <div className="floating-circle"></div>
                      <div className="floating-circle"></div>
                    </div>

                    {currentView === "login" ? (
                      <Login
                        onToggleView={toggleView}
                        bgImage={AUTH_IMAGES.login}
                        onLoginSuccess={handleAuthSuccess}
                      />
                    ) : (
                      <SignUp
                        onToggleView={toggleView}
                        bgImage={AUTH_IMAGES.signUp}
                        onSignupSuccess={handleAuthSuccess}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AuthPage;
