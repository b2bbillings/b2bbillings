import React from "react";
import {Card, Row, Col, Badge} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faArrowUp,
  faArrowDown,
  faWallet,
  faReceipt,
  faChartLine,
  faCalendarDay,
  faFileInvoice,
  faRupeeSign,
  faQuoteRight,
} from "@fortawesome/free-solid-svg-icons";

function SalesInvoicesSummary({
  summary = {},
  loading = false,
  dateRange = "This Month",
  mode = "invoices",
  documentType = "invoice",
  isQuotationsMode = false,
}) {
  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || !isFinite(numAmount)) {
      return "₹0";
    }

    const absAmount = Math.abs(numAmount);

    if (absAmount >= 10000000) {
      return `₹${(numAmount / 10000000).toFixed(1)}Cr`;
    } else if (absAmount >= 100000) {
      return `₹${(numAmount / 100000).toFixed(1)}L`;
    } else if (absAmount >= 1000) {
      return `₹${(numAmount / 1000).toFixed(1)}K`;
    }

    return `₹${numAmount.toLocaleString("en-IN")}`;
  };

  const safeSummary = {
    totalAmount: parseFloat(summary.totalAmount) || 0,
    received: parseFloat(summary.received) || 0,
    balance: parseFloat(summary.balance) || 0,
    todaysAmount: parseFloat(summary.todaysAmount) || 0,
    totalDocuments: parseInt(summary.totalDocuments) || 0,
    avgValue: parseFloat(summary.avgValue) || 0,
    growthPercentage: parseFloat(summary.growthPercentage) || 0,
    totalSalesAmount:
      parseFloat(summary.totalSalesAmount) ||
      parseFloat(summary.totalAmount) ||
      0,
    todaysSales:
      parseFloat(summary.todaysSales) || parseFloat(summary.todaysAmount) || 0,
    totalInvoices:
      parseInt(summary.totalInvoices) || parseInt(summary.totalDocuments) || 0,
    avgSaleValue:
      parseFloat(summary.avgSaleValue) || parseFloat(summary.avgValue) || 0,
    paidInvoices: parseInt(summary.paidInvoices) || 0,
    pendingInvoices: parseInt(summary.pendingInvoices) || 0,
    totalQuotations:
      parseInt(summary.totalQuotations) ||
      parseInt(summary.totalDocuments) ||
      0,
    quotationValue:
      parseFloat(summary.quotationValue) ||
      parseFloat(summary.totalAmount) ||
      0,
    approvedDocuments: parseInt(summary.approvedDocuments) || 0,
    pendingDocuments: parseInt(summary.pendingDocuments) || 0,
    convertedQuotations: parseInt(summary.convertedQuotations) || 0,
    conversionRate: parseFloat(summary.conversionRate) || 0,
    approvedValue: parseFloat(summary.approvedValue) || 0,
    pendingValue: parseFloat(summary.pendingValue) || 0,
  };

  const displayData = isQuotationsMode
    ? {
        totalAmount: safeSummary.quotationValue || safeSummary.totalAmount,
        received: safeSummary.approvedValue || safeSummary.received,
        balance: safeSummary.pendingValue || safeSummary.balance,
        todaysAmount: safeSummary.todaysAmount,
        totalCount: safeSummary.totalQuotations,
        avgValue: safeSummary.avgValue,
        growthPercentage: safeSummary.growthPercentage,
        approvedCount: safeSummary.approvedDocuments,
        pendingCount: safeSummary.pendingDocuments,
        convertedCount: safeSummary.convertedQuotations,
        conversionRate: safeSummary.conversionRate,
      }
    : {
        totalAmount: safeSummary.totalSalesAmount,
        received: safeSummary.received,
        balance: safeSummary.balance,
        todaysAmount: safeSummary.todaysSales,
        totalCount: safeSummary.totalInvoices,
        avgValue: safeSummary.avgSaleValue,
        growthPercentage: safeSummary.growthPercentage,
        paidCount: safeSummary.paidInvoices,
        pendingCount: safeSummary.pendingInvoices,
      };

  const labels = isQuotationsMode
    ? {
        title: "Quotations Overview",
        totalLabel: "Total Quotations",
        receivedLabel: "Approved",
        balanceLabel: "Pending",
        todayLabel: "Today",
        countLabel: "Quotations",
        avgLabel: "Avg. Value",
        paidStatus: "Approved",
        pendingStatus: "Draft",
      }
    : {
        title: "Sales Overview",
        totalLabel: "Total Sales",
        receivedLabel: "Received",
        balanceLabel: "Outstanding",
        todayLabel: "Today",
        countLabel: "Invoices",
        avgLabel: "Avg. Sale",
        paidStatus: "Paid",
        pendingStatus: "Due",
      };

  const isPositiveGrowth = displayData.growthPercentage >= 0;

  // Enhanced styling theme object
  const modernTheme = {
    colors: {
      primary: '#6366f1',
      primaryLight: '#8b5cf6',
      primaryDark: '#4f46e5',
      success: '#10b981',
      successLight: '#34d399',
      warning: '#f59e0b',
      warningLight: '#fbbf24',
      background: '#ffffff',
      backgroundLight: '#f8fafc',
      border: '#e2e8f0',
      text: '#1e293b',
      textLight: '#64748b',
      shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      gradient: {
        primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        info: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
      }
    },
    borderRadius: {
      sm: '0.375rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem'
    }
  };

  if (loading) {
    return (
      <div 
        style={{
          background: modernTheme.colors.background,
          borderRadius: modernTheme.borderRadius.xl,
          boxShadow: modernTheme.colors.shadow,
          border: `1px solid ${modernTheme.colors.border}`,
          padding: '2rem',
          textAlign: 'center',
          height: '200px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <div 
          style={{
            width: '40px',
            height: '40px',
            border: `3px solid ${modernTheme.colors.primary}`,
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
        <p style={{ 
          marginTop: '1rem', 
          marginBottom: 0, 
          color: modernTheme.colors.textLight,
          fontSize: '0.875rem'
        }}>
          Loading summary...
        </p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ height: "100%" }}>
      <div 
        style={{
          background: modernTheme.colors.background,
          borderRadius: modernTheme.borderRadius.xl,
          boxShadow: modernTheme.colors.shadowLg,
          border: `1px solid ${modernTheme.colors.border}`,
          overflow: 'hidden',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modern header with gradient */}
        <div 
          style={{
            background: isQuotationsMode ? modernTheme.colors.gradient.info : modernTheme.colors.gradient.primary,
            color: 'white',
            padding: '1rem 1.5rem',
            textAlign: 'center',
            position: 'relative'
          }}
        >
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: `${modernTheme.borderRadius.xl} ${modernTheme.borderRadius.xl} 0 0`
            }}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <FontAwesomeIcon
              icon={isQuotationsMode ? faQuoteRight : faChartLine}
              className="me-2"
              style={{ fontSize: '1.1rem' }}
            />
            <span style={{ fontWeight: '600', fontSize: '1rem' }}>
              {labels.title}
            </span>
          </div>
        </div>

        {/* Modern body */}
        <div 
          style={{
            padding: '1rem',
            background: `linear-gradient(135deg, ${modernTheme.colors.background} 0%, ${modernTheme.colors.backgroundLight} 100%)`,
            flex: 1
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {/* Total Amount Card */}
            <div 
              style={{
                background: `linear-gradient(135deg, ${modernTheme.colors.background} 0%, #f1f5f9 100%)`,
                borderRadius: modernTheme.borderRadius.lg,
                padding: '1rem',
                border: `1px solid ${modernTheme.colors.border}`,
                boxShadow: modernTheme.colors.shadow,
                position: 'relative',
                overflow: 'hidden',
                flex: '1 1 calc(33.333% - 0.75rem)',
                minWidth: '250px'
              }}
            >
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '60px',
                  height: '60px',
                  background: isQuotationsMode ? modernTheme.colors.gradient.info : modernTheme.colors.gradient.primary,
                  borderRadius: '50%',
                  transform: 'translate(30%, -30%)',
                  opacity: 0.1
                }}
              />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div 
                    style={{
                      background: isQuotationsMode ? modernTheme.colors.gradient.info : modernTheme.colors.gradient.primary,
                      width: '32px',
                      height: '32px',
                      borderRadius: modernTheme.borderRadius.md,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: modernTheme.colors.shadow
                    }}
                  >
                    <FontAwesomeIcon
                      icon={isQuotationsMode ? faQuoteRight : faChartLine}
                      style={{ color: 'white', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div 
                    style={{
                      background: isPositiveGrowth ? modernTheme.colors.success : '#ef4444',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: modernTheme.borderRadius.md,
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <FontAwesomeIcon
                      icon={isPositiveGrowth ? faArrowUp : faArrowDown}
                      style={{ marginRight: '0.25rem', fontSize: '0.7rem' }}
                    />
                    {Math.abs(displayData.growthPercentage).toFixed(0)}%
                  </div>
                </div>
                <p style={{ color: modernTheme.colors.textLight, marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                  {labels.totalLabel}
                </p>
                <h5 style={{ color: modernTheme.colors.text, marginBottom: 0, fontWeight: '700', fontSize: '1.1rem' }}>
                  {formatCurrency(displayData.totalAmount)}
                </h5>
              </div>
            </div>

            {/* Received/Approved Card */}
            <div 
              style={{
                background: `linear-gradient(135deg, ${modernTheme.colors.background} 0%, #ecfdf5 100%)`,
                borderRadius: modernTheme.borderRadius.lg,
                padding: '1rem',
                border: `1px solid ${modernTheme.colors.success}25`,
                boxShadow: modernTheme.colors.shadow,
                position: 'relative',
                overflow: 'hidden',
                flex: '1 1 calc(33.333% - 0.75rem)',
                minWidth: '250px'
              }}
            >
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '60px',
                  height: '60px',
                  background: modernTheme.colors.gradient.success,
                  borderRadius: '50%',
                  transform: 'translate(30%, -30%)',
                  opacity: 0.1
                }}
              />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div 
                    style={{
                      background: modernTheme.colors.gradient.success,
                      width: '32px',
                      height: '32px',
                      borderRadius: modernTheme.borderRadius.md,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: modernTheme.colors.shadow
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faWallet}
                      style={{ color: 'white', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div 
                    style={{
                      background: modernTheme.colors.success,
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: modernTheme.borderRadius.md,
                      fontSize: '0.7rem',
                      fontWeight: '600'
                    }}
                  >
                    {labels.paidStatus}
                  </div>
                </div>
                <p style={{ color: modernTheme.colors.textLight, marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                  {labels.receivedLabel}
                </p>
                <h6 style={{ color: modernTheme.colors.success, marginBottom: '0.25rem', fontWeight: '700', fontSize: '1rem' }}>
                  {formatCurrency(displayData.received)}
                </h6>
                <small style={{ color: modernTheme.colors.textLight, fontSize: '0.7rem' }}>
                  {displayData.totalAmount > 0
                    ? ((displayData.received / displayData.totalAmount) * 100).toFixed(0)
                    : 0}% of total
                </small>
              </div>
            </div>

            {/* Balance/Pending Card */}
            <div 
              style={{
                background: `linear-gradient(135deg, ${modernTheme.colors.background} 0%, #fffbeb 100%)`,
                borderRadius: modernTheme.borderRadius.lg,
                padding: '1rem',
                border: `1px solid ${modernTheme.colors.warning}25`,
                boxShadow: modernTheme.colors.shadow,
                position: 'relative',
                overflow: 'hidden',
                flex: '1 1 calc(33.333% - 0.75rem)',
                minWidth: '250px'
              }}
            >
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '60px',
                  height: '60px',
                  background: modernTheme.colors.gradient.warning,
                  borderRadius: '50%',
                  transform: 'translate(30%, -30%)',
                  opacity: 0.1
                }}
              />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div 
                    style={{
                      background: modernTheme.colors.gradient.warning,
                      width: '32px',
                      height: '32px',
                      borderRadius: modernTheme.borderRadius.md,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: modernTheme.colors.shadow
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faReceipt}
                      style={{ color: 'white', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div 
                    style={{
                      background: modernTheme.colors.warning,
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: modernTheme.borderRadius.md,
                      fontSize: '0.7rem',
                      fontWeight: '600'
                    }}
                  >
                    {labels.pendingStatus}
                  </div>
                </div>
                <p style={{ color: modernTheme.colors.textLight, marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                  {labels.balanceLabel}
                </p>
                <h6 style={{ color: modernTheme.colors.warning, marginBottom: '0.25rem', fontWeight: '700', fontSize: '1rem' }}>
                  {formatCurrency(displayData.balance)}
                </h6>
                <small style={{ color: modernTheme.colors.textLight, fontSize: '0.7rem' }}>
                  {displayData.totalAmount > 0
                    ? ((displayData.balance / displayData.totalAmount) * 100).toFixed(0)
                    : 0}% of total
                </small>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div 
            style={{
              background: `linear-gradient(135deg, ${modernTheme.colors.background} 0%, ${modernTheme.colors.backgroundLight} 100%)`,
              borderRadius: modernTheme.borderRadius.lg,
              padding: '1rem',
              border: `1px solid ${modernTheme.colors.border}`,
              boxShadow: modernTheme.colors.shadow
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: `1px solid ${modernTheme.colors.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <FontAwesomeIcon
                  icon={faCalendarDay}
                  style={{ 
                    color: isQuotationsMode ? '#06b6d4' : modernTheme.colors.primary, 
                    marginRight: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                />
                <span style={{ color: modernTheme.colors.textLight, fontSize: '0.8rem' }}>
                  {labels.todayLabel}
                </span>
              </div>
              <span style={{ 
                fontWeight: '700', 
                color: isQuotationsMode ? '#06b6d4' : modernTheme.colors.primary,
                fontSize: '0.85rem'
              }}>
                {formatCurrency(displayData.todaysAmount)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: `1px solid ${modernTheme.colors.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <FontAwesomeIcon
                  icon={isQuotationsMode ? faQuoteRight : faFileInvoice}
                  style={{ color: modernTheme.colors.textLight, marginRight: '0.5rem', fontSize: '0.875rem' }}
                />
                <span style={{ color: modernTheme.colors.textLight, fontSize: '0.8rem' }}>
                  {labels.countLabel}
                </span>
              </div>
              <span style={{ fontWeight: '700', color: modernTheme.colors.text, fontSize: '0.85rem' }}>
                {displayData.totalCount || 0}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <FontAwesomeIcon
                  icon={faRupeeSign}
                  style={{ color: modernTheme.colors.success, marginRight: '0.5rem', fontSize: '0.875rem' }}
                />
                <span style={{ color: modernTheme.colors.textLight, fontSize: '0.8rem' }}>
                  {labels.avgLabel}
                </span>
              </div>
              <span style={{ fontWeight: '700', color: modernTheme.colors.success, fontSize: '0.85rem' }}>
                {formatCurrency(displayData.avgValue)}
              </span>
            </div>

            {isQuotationsMode && displayData.convertedCount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderTop: `1px solid ${modernTheme.colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <FontAwesomeIcon
                    icon={faFileInvoice}
                    style={{ color: modernTheme.colors.primaryLight, marginRight: '0.5rem', fontSize: '0.875rem' }}
                  />
                  <span style={{ color: modernTheme.colors.textLight, fontSize: '0.8rem' }}>
                    Converted
                  </span>
                </div>
                <span style={{ fontWeight: '700', color: modernTheme.colors.primaryLight, fontSize: '0.85rem' }}>
                  {displayData.convertedCount}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        /* Enhanced hover effects for cards */
        .summary-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: ${modernTheme.colors.shadowLg};
        }

        /* Responsive adjustments */
        @media (max-width: 575.98px) {
          .summary-header {
            padding: 0.75rem 1rem !important;
          }

          .summary-body {
            padding: 0.75rem !important;
          }

          .summary-card {
            padding: 0.75rem !important;
          }

          h5, h6 {
            font-size: 0.9rem !important;
          }
        }

        @media (max-width: 767.98px) {
          .summary-cards-container {
            gap: 0.5rem;
          }
        }

        /* Loading animation */
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }

        .shimmer {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200px 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
}

export default SalesInvoicesSummary;
