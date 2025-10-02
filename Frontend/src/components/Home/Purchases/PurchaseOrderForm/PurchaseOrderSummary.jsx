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
  faClipboardList,
  faRupeeSign,
  faFileInvoice,
  faTruck,
} from "@fortawesome/free-solid-svg-icons";

function PurchaseOrderSummary({
  summary = {},
  orders = [],
  loading = false,
  dateRange = "This Month",
  mode = "orders",
  documentType = "order",
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

  // Calculate summary from real purchase order data
  const calculateSummaryFromOrders = () => {
    if (!orders || orders.length === 0) {
      return {
        totalOrderAmount: 0,
        totalOrders: 0,
        confirmedAmount: 0,
        pendingAmount: 0,
        todaysOrders: 0,
        avgOrderValue: 0,
        growthPercentage: 0,
        confirmedOrders: 0,
        pendingOrders: 0,
        totalSuppliers: 0,
        statusCounts: {
          draft: 0,
          pending: 0,
          confirmed: 0,
          shipped: 0,
          delivered: 0,
          completed: 0,
        },
      };
    }

    let totalAmount = 0;
    let confirmedAmount = 0;
    let pendingAmount = 0;
    let todaysOrders = 0;
    let confirmedCount = 0;
    let pendingCount = 0;
    const suppliers = new Set();

    const statusCounts = {
      draft: 0,
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      completed: 0,
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    orders.forEach((order) => {
      const orderTotal =
        order.finalTotal ||
        order.totalAmount ||
        order.total ||
        order.orderValue ||
        0;
      totalAmount += orderTotal;

      // Add supplier to set
      if (order.supplierId || order.supplierName) {
        suppliers.add(order.supplierId || order.supplierName);
      }

      // Check if order is from today
      const orderDate = new Date(
        order.orderDate || order.date || order.createdAt
      );
      orderDate.setHours(0, 0, 0, 0);
      if (orderDate.getTime() === today.getTime()) {
        todaysOrders += orderTotal;
      }

      const status = order.status?.toLowerCase() || "draft";
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      } else {
        statusCounts.draft++;
      }

      // Calculate confirmed vs pending amounts
      if (["confirmed", "shipped", "delivered", "completed"].includes(status)) {
        confirmedAmount += orderTotal;
        confirmedCount++;
      } else if (["pending", "draft"].includes(status)) {
        pendingAmount += orderTotal;
        pendingCount++;
      }
    });

    const avgOrderValue = orders.length > 0 ? totalAmount / orders.length : 0;

    // Calculate growth percentage (simplified)
    const recentOrders = orders.slice(-5);
    const recentAvg =
      recentOrders.length > 0
        ? recentOrders.reduce(
            (sum, o) => sum + (o.finalTotal || o.totalAmount || o.total || 0),
            0
          ) / recentOrders.length
        : 0;

    const growthPercentage =
      avgOrderValue > 0
        ? ((recentAvg - avgOrderValue) / avgOrderValue) * 100
        : 0;

    return {
      totalOrderAmount: totalAmount,
      totalOrders: orders.length,
      confirmedAmount,
      pendingAmount,
      todaysOrders,
      avgOrderValue,
      growthPercentage: isFinite(growthPercentage) ? growthPercentage : 0,
      confirmedOrders: confirmedCount,
      pendingOrders: pendingCount,
      totalSuppliers: suppliers.size,
      statusCounts,
    };
  };

  const calculatedSummary = calculateSummaryFromOrders();
  const safeSummary = {
    totalOrderAmount:
      parseFloat(
        summary.totalOrderAmount || calculatedSummary.totalOrderAmount
      ) || 0,
    confirmedAmount:
      parseFloat(
        summary.confirmedAmount || calculatedSummary.confirmedAmount
      ) || 0,
    pendingAmount:
      parseFloat(summary.pendingAmount || calculatedSummary.pendingAmount) || 0,
    todaysOrders:
      parseFloat(summary.todaysOrders || calculatedSummary.todaysOrders) || 0,
    totalOrders:
      parseInt(summary.totalOrders || calculatedSummary.totalOrders) || 0,
    avgOrderValue:
      parseFloat(summary.avgOrderValue || calculatedSummary.avgOrderValue) || 0,
    growthPercentage:
      parseFloat(
        summary.growthPercentage || calculatedSummary.growthPercentage
      ) || 0,
    confirmedOrders:
      parseInt(summary.confirmedOrders || calculatedSummary.confirmedOrders) ||
      0,
    pendingOrders:
      parseInt(summary.pendingOrders || calculatedSummary.pendingOrders) || 0,
    totalSuppliers:
      parseInt(summary.totalSuppliers || calculatedSummary.totalSuppliers) || 0,
  };

  const isPurchaseOrders = mode === "orders" || documentType === "order";

  const displayData = {
    totalAmount: safeSummary.totalOrderAmount,
    confirmed: safeSummary.confirmedAmount,
    pending: safeSummary.pendingAmount,
    todaysAmount: safeSummary.todaysOrders,
    totalCount: safeSummary.totalOrders,
    avgValue: safeSummary.avgOrderValue,
    growthPercentage: safeSummary.growthPercentage,
    confirmedCount: safeSummary.confirmedOrders,
    pendingCount: safeSummary.pendingOrders,
  };

  const labels = {
    title: "Orders Overview",
    totalLabel: "Total Orders",
    confirmedLabel: "Confirmed",
    pendingLabel: "Pending",
    todayLabel: "Today",
    countLabel: "Orders",
    avgLabel: "Avg. Order",
    confirmedStatus: "Confirmed",
    pendingStatus: "Pending",
  };

  const isPositiveGrowth = displayData.growthPercentage >= 0;

  if (loading) {
    return (
      <Card className="h-100 mb-3" style={{borderRadius: 0}}>
        <Card.Body className="p-3">
          <div className="text-center">
            <div
              className="spinner-border spinner-border-sm text-purple"
              role="status"
            >
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 mb-0 text-muted small">Loading summary...</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div style={{height: "100%"}} className="mb-3">
      <Card className="h-100 shadow-sm" style={{borderRadius: 0}}>
        <Card.Header
          className="py-2 bg-purple text-white"
          style={{borderRadius: 0}}
        >
          <h6 className="mb-0 fw-bold text-center small">
            <FontAwesomeIcon icon={faClipboardList} className="me-2" />
            {labels.title}
          </h6>
        </Card.Header>

        <Card.Body className="p-2" style={{borderRadius: 0}}>
          {/* Modern horizontal layout for order summary cards */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {/* Total Orders Card */}
            <div 
              style={{
                background: `linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)`,
                borderRadius: '0.75rem',
                padding: '1rem',
                border: `1px solid #e2e8f0`,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                position: 'relative',
                overflow: 'hidden',
                flex: '1 1 calc(33.333% - 0.75rem)',
                minWidth: '200px'
              }}
            >
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  borderRadius: '50%',
                  transform: 'translate(30%, -30%)',
                  opacity: 0.1
                }}
              />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div 
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faChartLine}
                      style={{ color: 'white', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div 
                    style={{
                      background: isPositiveGrowth ? '#10b981' : '#ef4444',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.5rem',
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
                <p style={{ color: '#64748b', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                  {labels.totalLabel}
                </p>
                <h5 style={{ color: '#1e293b', marginBottom: 0, fontWeight: '700', fontSize: '1.1rem' }}>
                  {formatCurrency(displayData.totalAmount)}
                </h5>
              </div>
            </div>

            {/* Confirmed Orders Card */}
            <div 
              style={{
                background: `linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)`,
                borderRadius: '0.75rem',
                padding: '1rem',
                border: `1px solid #10b98125`,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                position: 'relative',
                overflow: 'hidden',
                flex: '1 1 calc(33.333% - 0.75rem)',
                minWidth: '200px'
              }}
            >
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  borderRadius: '50%',
                  transform: 'translate(30%, -30%)',
                  opacity: 0.1
                }}
              />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div 
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faWallet}
                      style={{ color: 'white', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div 
                    style={{
                      background: '#10b981',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.7rem',
                      fontWeight: '600'
                    }}
                  >
                    {labels.confirmedStatus}
                  </div>
                </div>
                <p style={{ color: '#64748b', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                  {labels.confirmedLabel}
                </p>
                <h6 style={{ color: '#10b981', marginBottom: '0.25rem', fontWeight: '700', fontSize: '1rem' }}>
                  {formatCurrency(displayData.confirmed)}
                </h6>
                <small style={{ color: '#64748b', fontSize: '0.7rem' }}>
                  {displayData.totalAmount > 0
                    ? ((displayData.confirmed / displayData.totalAmount) * 100).toFixed(0)
                    : 0}% of total
                </small>
              </div>
            </div>

            {/* Pending Orders Card */}
            <div 
              style={{
                background: `linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)`,
                borderRadius: '0.75rem',
                padding: '1rem',
                border: `1px solid #f59e0b25`,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                position: 'relative',
                overflow: 'hidden',
                flex: '1 1 calc(33.333% - 0.75rem)',
                minWidth: '200px'
              }}
            >
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  borderRadius: '50%',
                  transform: 'translate(30%, -30%)',
                  opacity: 0.1
                }}
              />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div 
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faReceipt}
                      style={{ color: 'white', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div 
                    style={{
                      background: '#f59e0b',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.7rem',
                      fontWeight: '600'
                    }}
                  >
                    {labels.pendingStatus}
                  </div>
                </div>
                <p style={{ color: '#64748b', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                  {labels.pendingLabel}
                </p>
                <h6 style={{ color: '#f59e0b', marginBottom: '0.25rem', fontWeight: '700', fontSize: '1rem' }}>
                  {formatCurrency(displayData.pending)}
                </h6>
                <small style={{ color: '#64748b', fontSize: '0.7rem' }}>
                  {displayData.totalAmount > 0
                    ? ((displayData.pending / displayData.totalAmount) * 100).toFixed(0)
                    : 0}% of total
                </small>
              </div>
            </div>
          </div>

          <Card className="border-0 bg-light" style={{borderRadius: 0}}>
            <Card.Body className="p-2" style={{borderRadius: 0}}>
              <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon
                    icon={faCalendarDay}
                    className="me-2 text-purple"
                    style={{fontSize: "0.6rem"}}
                  />
                  <span className="text-muted" style={{fontSize: "0.65rem"}}>
                    {labels.todayLabel}
                  </span>
                </div>
                <span
                  className="fw-bold text-purple"
                  style={{fontSize: "0.7rem"}}
                >
                  {formatCurrency(displayData.todaysAmount)}
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon
                    icon={faFileInvoice}
                    className="text-secondary me-2"
                    style={{fontSize: "0.6rem"}}
                  />
                  <span className="text-muted" style={{fontSize: "0.65rem"}}>
                    {labels.countLabel}
                  </span>
                </div>
                <span
                  className="fw-bold text-secondary"
                  style={{fontSize: "0.7rem"}}
                >
                  {displayData.totalCount || 0}
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-center py-1">
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon
                    icon={faRupeeSign}
                    className="text-success me-2"
                    style={{fontSize: "0.6rem"}}
                  />
                  <span className="text-muted" style={{fontSize: "0.65rem"}}>
                    {labels.avgLabel}
                  </span>
                </div>
                <span
                  className="fw-bold text-success"
                  style={{fontSize: "0.7rem"}}
                >
                  {formatCurrency(displayData.avgValue)}
                </span>
              </div>

              {safeSummary.totalSuppliers > 0 && (
                <div className="d-flex justify-content-between align-items-center py-1 border-top border-light">
                  <div className="d-flex align-items-center">
                    <FontAwesomeIcon
                      icon={faTruck}
                      className="text-purple me-2"
                      style={{fontSize: "0.6rem"}}
                    />
                    <span className="text-muted" style={{fontSize: "0.65rem"}}>
                      Suppliers
                    </span>
                  </div>
                  <span
                    className="fw-bold text-purple"
                    style={{fontSize: "0.7rem"}}
                  >
                    {safeSummary.totalSuppliers}
                  </span>
                </div>
              )}
            </Card.Body>
          </Card>
        </Card.Body>
      </Card>

      <style>{`
        .bg-purple {
          background-color: #6366f1 !important;
        }

        .text-purple {
          color: #6366f1 !important;
        }

        @media (max-width: 575.98px) {
          .card-body {
            padding: 1rem !important;
          }

          h6 {
            font-size: 0.9rem !important;
          }
        }

        @media (max-width: 991.98px) {
          .card {
            margin-bottom: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default PurchaseOrderSummary;
