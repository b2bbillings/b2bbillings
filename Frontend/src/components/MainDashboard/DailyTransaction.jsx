import React, {useState, useEffect} from "react";
import {Card, Row, Col} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faExchangeAlt,
  faDownload,
  faUpload,
  faFileInvoiceDollar,
  faShoppingCart,
  faFileContract,
  faChartBar,
  faCalculator,
  faUsers,
  faBoxes,
  faCreditCard,
  faPlus,
  faEye,
  faFileAlt,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";

// Embedded CSS styles
const styles = `
/* Daily Transactions Styles */
.daily-transactions {
  width: 100%;
  height: fit-content;
}

.daily-section {
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 1.5rem;
  height: fit-content;
  max-height: calc(100vh - 130px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-top: 1rem; /* ✅ Added margin-top to fix spacing */
}

/* Dashboard layout override */
.dashboard-layout .daily-transactions .daily-section {
  margin-top: 0; /* ✅ No margin when in dashboard layout */
}

/* Single view layout */
.single-view .daily-transactions .daily-section {
  margin-top: 1rem; /* ✅ Add margin when in single view */
}

.section-header {
  margin-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.75rem;
  flex-shrink: 0;
}

.section-header h2 {
  color: #1e293b;
  font-size: 1.4rem;
  margin-bottom: 0.25rem;
  font-weight: 600;
}

.section-header p {
  color: #64748b;
  margin: 0;
  font-size: 0.9rem;
}

.quick-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: #f1f5f9;
  border-radius: 6px;
  flex-shrink: 0;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 1rem;
  font-weight: 700;
  color: #2563eb;
  margin-bottom: 0.1rem;
}

.stat-label {
  font-size: 0.7rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  padding-right: 0.5rem;
  align-content: start;
}

.action-card {
  background-color: #f8fafc;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid #e2e8f0;
  position: relative;
  overflow: hidden;
  height: 120px;
}

.action-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  border-color: #2563eb;
  background-color: #ffffff;
}

.action-card:hover .action-icon {
  background-color: #2563eb;
  color: white;
  transform: scale(1.05);
}

.action-card:hover h3 {
  color: #2563eb;
}

.action-icon {
  width: 40px;
  height: 40px;
  background-color: #dbeafe;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  color: #2563eb;
  font-size: 1.1rem;
  transition: all 0.3s ease;
}

.action-card h3 {
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
  color: #1e293b;
  font-weight: 600;
  transition: color 0.3s ease;
  line-height: 1.2;
}

.action-card p {
  font-size: 0.75rem;
  color: #64748b;
  margin: 0;
  line-height: 1.3;
}

.action-card.primary {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  border-color: #2563eb;
}

.action-card.primary .action-icon {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.action-card.primary h3 {
  color: white;
}

.action-card.primary p {
  color: rgba(255, 255, 255, 0.9);
}

.action-card.primary:hover {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
  transform: translateY(-4px);
}

.action-card.success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-color: #10b981;
}

.action-card.success .action-icon {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.action-card.success h3 {
  color: white;
}

.action-card.success p {
  color: rgba(255, 255, 255, 0.9);
}

.action-card.success:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-4px);
}

.action-card.warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border-color: #f59e0b;
}

.action-card.warning .action-icon {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.action-card.warning h3 {
  color: white;
}

.action-card.warning p {
  color: rgba(255, 255, 255, 0.9);
}

.action-card.warning:hover {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  transform: translateY(-4px);
}

.keyboard-shortcut {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  background-color: rgba(0, 0, 0, 0.1);
  color: #64748b;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  font-size: 0.6rem;
  font-weight: 500;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.action-card:hover .keyboard-shortcut {
  opacity: 1;
}

.action-card.primary .keyboard-shortcut,
.action-card.success .keyboard-shortcut,
.action-card.warning .keyboard-shortcut {
  background-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
}

/* Responsive Design */
@media (max-width: 1200px) {
  .actions-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 0.875rem;
  }
}

@media (max-width: 992px) {
  .daily-section {
    max-height: 600px;
    margin-top: 0.5rem; /* ✅ Reduced margin on tablet */
  }
  
  .actions-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.75rem;
  }
  
  .action-card {
    padding: 0.875rem;
    height: 110px;
  }
  
  .action-icon {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }
}

@media (max-width: 768px) {
  .actions-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
  
  .section-header h2 {
    font-size: 1.2rem;
  }
  
  .quick-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .daily-section {
    margin-top: 0.25rem; /* ✅ Minimal margin on mobile */
  }
}

@media (max-width: 576px) {
  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
  
  .action-card {
    padding: 0.75rem 0.5rem;
    height: 95px;
  }
  
  .action-card h3 {
    font-size: 0.8rem;
  }
  
  .action-card p {
    font-size: 0.7rem;
  }
  
  .daily-section {
    padding: 1rem;
  }
}

/* Custom scrollbar for actions grid */
.actions-grid::-webkit-scrollbar {
  width: 4px;
}

.actions-grid::-webkit-scrollbar-track {
  background-color: #f1f1f1;
  border-radius: 10px;
}

.actions-grid::-webkit-scrollbar-thumb {
  background-color: #c1c1c1;
  border-radius: 10px;
}

.actions-grid::-webkit-scrollbar-thumb:hover {
  background-color: #a8a8a8;
}

/* Loading Animation */
.action-card.loading {
  pointer-events: none;
  opacity: 0.7;
}

.action-card.loading .action-icon {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
`;

function DailyTransaction({
  currentUser,
  currentCompany,
  onNavigate,
  addToast,
  isOnline = true,
}) {
  const [loadingAction, setLoadingAction] = useState(null);

  // Inject styles into the document
  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);

    // Cleanup function to remove styles when component unmounts
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Mock stats data - in real app, this would come from your API
  const quickStats = [
    {label: "Today's Sales", value: "₹12,450", color: "#10b981"},
    {label: "Pending", value: "₹8,200", color: "#f59e0b"},
    {label: "Expenses", value: "₹3,800", color: "#ef4444"},
    {label: "Profit", value: "₹8,650", color: "#2563eb"},
  ];

  // ✅ Updated Action cards configuration with better shortcuts
  const actionCards = [
    {
      id: "dailySummary",
      title: "Daily Transactions",
      description: "Record daily financial activities",
      icon: faExchangeAlt,
      variant: "primary",
      shortcut: "Ctrl+D",
    },
    {
      id: "paymentIn",
      title: "Payment In",
      description: "Receive and record payments",
      icon: faDownload,
      variant: "success",
      shortcut: "Ctrl+N", // ✅ Changed from Ctrl+R to Ctrl+N (iN)
    },
    {
      id: "paymentOut",
      title: "Payment Out",
      description: "Make payments to vendors",
      icon: faUpload,
      variant: "warning",
      shortcut: "Ctrl+O", // ✅ Changed from Ctrl+P to Ctrl+O (Out)
    },
    {
      id: "createInvoice",
      title: "Create Invoice",
      description: "Generate customer invoices",
      icon: faFileInvoiceDollar,
      variant: "default",
      shortcut: "Ctrl+I",
    },
    {
      id: "createPurchaseOrder",
      title: "Create Purchase",
      description: "Record purchase orders",
      icon: faShoppingCart,
      variant: "default",
      shortcut: "Ctrl+U",
    },
    {
      id: "createQuotation",
      title: "Quotation",
      description: "Create price quotations",
      icon: faFileContract,
      variant: "default",
      shortcut: "Ctrl+Q",
    },
    {
      id: "reports",
      title: "Reports",
      description: "Generate financial reports",
      icon: faChartBar,
      variant: "default",
      shortcut: "Ctrl+G", // ✅ Moved Reports to Ctrl+R (more logical)
    },
    {
      id: "expenses",
      title: "Expenses",
      description: "Track business expenses",
      icon: faCalculator,
      variant: "default",
      shortcut: "Ctrl+E",
    },
    {
      id: "parties",
      title: "Parties",
      description: "Manage customers & vendors",
      icon: faUsers,
      variant: "default",
      shortcut: "Ctrl+P", // ✅ Changed from Ctrl+M to Ctrl+P (Parties)
    },
    {
      id: "allProducts",
      title: "Products",
      description: "Manage product inventory",
      icon: faBoxes,
      variant: "default",
      shortcut: "Ctrl+T",
    },
    {
      id: "bankAccounts",
      title: "Bank Accounts",
      description: "Manage bank transactions",
      icon: faCreditCard,
      variant: "default",
      shortcut: "Ctrl+B",
    },
    {
      id: "insights",
      title: "Business Insights",
      description: "View analytics & trends",
      icon: faChartLine,
      variant: "default",
      shortcut: "Ctrl+A",
    },
  ];

  const handleActionClick = async (actionId) => {
    if (loadingAction || !isOnline) return;

    setLoadingAction(actionId);

    try {
      // Simulate loading delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (onNavigate) {
        onNavigate(actionId);
      }

      addToast?.(
        `Opening ${actionCards.find((card) => card.id === actionId)?.title}...`,
        "info"
      );
    } catch (error) {
      addToast?.("Failed to open feature", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  // ✅ Updated Keyboard shortcuts with better mapping
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;

      const shortcuts = {
        d: "dailySummary",
        n: "paymentIn", // ✅ Changed from 'r' to 'n' for PaymeNt In
        o: "paymentOut", // ✅ Changed from 'p' to 'o' for Payment Out
        i: "createInvoice",
        u: "createPurchaseOrder",
        q: "createQuotation",
        r: "reports", // ✅ Reports now uses Ctrl+R (more logical)
        e: "expenses",
        p: "parties", // ✅ Changed from 'm' to 'p' for Parties
        t: "allProducts",
        b: "bankAccounts",
        a: "insights",
      };

      const actionId = shortcuts[e.key.toLowerCase()];
      if (actionId) {
        e.preventDefault();
        handleActionClick(actionId);
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, []);

  return (
    <div className="daily-transactions">
      <Card className="daily-section">
        {/* Section Header */}
        <div className="section-header">
          <h2>Daily Transactions</h2>
          <p>Manage your financial operations efficiently</p>
        </div>

        {/* Quick Stats */}
        <div className="quick-stats">
          {quickStats.map((stat, index) => (
            <div key={index} className="stat-item">
              <div className="stat-value" style={{color: stat.color}}>
                {stat.value}
              </div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Actions Grid */}
        <div className="actions-grid">
          {actionCards.map((card) => (
            <div
              key={card.id}
              className={`action-card ${card.variant} ${
                loadingAction === card.id ? "loading" : ""
              }`}
              onClick={() => handleActionClick(card.id)}
              title={`${card.title} - ${card.shortcut}`}
            >
              <div className="keyboard-shortcut">{card.shortcut}</div>
              <div className="action-icon">
                <FontAwesomeIcon icon={card.icon} />
              </div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default DailyTransaction;
