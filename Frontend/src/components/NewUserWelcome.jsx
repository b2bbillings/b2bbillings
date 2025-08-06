import React, {useState, useEffect} from "react";
import CreateCompany from "./Company/CreateCompany";

const NewUserWelcome = ({
  currentUser,
  onCreateCompany,
  showToast,
  onLogout,
}) => {
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true); // Start with animation

  // ✅ STABLE ANIMATION: Only animate once on mount
  useEffect(() => {
    // Remove any conflicting animations after component mounts
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 1000); // 1 second for initial animation

    return () => clearTimeout(timer);
  }, []);

  const handleCreateCompany = () => {
    setShowCreateCompanyModal(true);
  };

  // ✅ COMMENTED: Help function - will be enabled later
  // const handleGetHelp = () => {
  //   showToast("Help resources will be available soon!", "info");
  // };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  const handleCompanyCreated = (newCompany) => {
    setShowCreateCompanyModal(false);

    // Call the parent callback
    if (onCreateCompany) {
      onCreateCompany(newCompany);
    }

    // Show success message
    showToast("Company created successfully! Redirecting...", "success");
  };

  const handleModalHide = () => {
    setShowCreateCompanyModal(false);
  };

  const userFirstName =
    currentUser?.name?.split(" ")[0] || currentUser?.firstName || "there";

  return (
    <>
      {/* ✅ SIMPLIFIED: Single CSS animation */}
      <style>{`
        .new-user-welcome {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          flex-direction: column;
          animation: ${isAnimating ? "fadeIn 0.8s ease-out" : "none"};
        }

        .welcome-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transform: ${isAnimating ? "translateY(20px)" : "translateY(0)"};
          opacity: ${isAnimating ? "0" : "1"};
          transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .welcome-icon {
          font-size: 4rem;
          color: #667eea;
          margin-bottom: 2rem;
          animation: ${isAnimating ? "none" : "bounce 2s infinite"};
        }

        .btn-primary-custom {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 12px;
          padding: 1rem 2rem;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .btn-primary-custom:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }

        .btn-secondary-custom {
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 1rem 2rem;
          background: transparent;
          transition: all 0.3s ease;
        }

        .btn-secondary-custom:hover {
          border-color: #667eea;
          color: #667eea;
          background: rgba(102, 126, 234, 0.05);
        }

        .navbar-custom {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
        }

        .logout-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          padding: 0.5rem 1rem;
          color: white;
          transition: all 0.3s ease;
        }

        .logout-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
          color: white;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }
      `}</style>

      <div className="new-user-welcome">
        {/* Navbar */}
        <nav className="navbar-custom py-3">
          <div className="container">
            <div className="d-flex justify-content-between align-items-center w-100">
              {/* Brand */}
              <div className="d-flex align-items-center gap-2 text-white">
                <i
                  className="fas fa-store"
                  style={{fontSize: "1.8rem", color: "#fbbf24"}}
                ></i>
                <span style={{fontSize: "1.5rem", fontWeight: "700"}}>
                  Shop Management
                </span>
              </div>

              {/* User Info & Logout */}
              <div className="d-flex align-items-center gap-3 text-white">
                <div className="user-avatar">
                  {(currentUser?.name?.charAt(0) || "U").toUpperCase()}
                </div>
                <div>Welcome, {userFirstName}!</div>
                <button className="btn logout-btn" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt me-1"></i>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-grow-1 d-flex align-items-center justify-content-center p-4">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-md-8 col-lg-6">
                <div className="welcome-card p-5 text-center">
                  {/* Welcome Icon */}
                  <div className="welcome-icon">
                    <i className="fas fa-building"></i>
                  </div>

                  {/* Welcome Message */}
                  <div className="mb-4">
                    <h2 className="fw-bold text-dark mb-3">
                      Welcome to Shop Management! 🎉
                    </h2>
                    <p className="text-muted lead">
                      Hi {userFirstName}! Let's get you started by setting up
                      your first company.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="d-grid gap-3 mb-4">
                    <button
                      className="btn btn-primary-custom btn-lg"
                      onClick={handleCreateCompany}
                    >
                      <i className="fas fa-plus me-2"></i>
                      Create Your First Company
                    </button>

                    {/* ✅ COMMENTED: Help button - will be enabled later */}
                    {/* 
                    <button
                      className="btn btn-secondary-custom"
                      onClick={handleGetHelp}
                    >
                      <i className="fas fa-question-circle me-2"></i>
                      Need Help Getting Started?
                    </button>
                    */}
                  </div>

                  {/* Info Footer */}
                  <div className="pt-3 border-top">
                    <small className="text-muted d-flex align-items-center justify-content-center gap-2">
                      <i className="fas fa-lightbulb text-warning"></i>
                      You can manage multiple companies from this dashboard once
                      you create your first one.
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Company Modal */}
      {showCreateCompanyModal && (
        <CreateCompany
          show={showCreateCompanyModal}
          onHide={handleModalHide}
          onCompanyCreated={handleCompanyCreated}
          isOnline={true}
          currentUser={currentUser}
        />
      )}
    </>
  );
};

export default NewUserWelcome;
