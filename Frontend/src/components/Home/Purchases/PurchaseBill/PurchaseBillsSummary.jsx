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
  faShoppingCart,
  faRupeeSign,
  faFileInvoice,
} from "@fortawesome/free-solid-svg-icons";

function PurchaseBillsSummary({
  summary = {},
  loading = false,
  dateRange = "This Month",
  mode = "bills",
  documentType = "bill",
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
    totalPurchaseAmount: parseFloat(summary.totalPurchaseAmount) || 0,
    paidAmount: parseFloat(summary.paidAmount) || 0,
    payableAmount: parseFloat(summary.payableAmount) || 0,
    todaysPurchases: parseFloat(summary.todaysPurchases) || 0,
    totalBills: parseInt(summary.totalBills) || 0,
    avgPurchaseValue: parseFloat(summary.avgPurchaseValue) || 0,
    growthPercentage: parseFloat(summary.growthPercentage) || 0,
    paidBills: parseInt(summary.paidBills) || 0,
    pendingBills: parseInt(summary.pendingBills) || 0,
    totalSuppliers: parseInt(summary.totalSuppliers) || 0,
  };

  const isPurchaseBills = mode === "bills" || documentType === "bill";

  const displayData = {
    totalAmount: safeSummary.totalPurchaseAmount,
    paid: safeSummary.paidAmount,
    payable: safeSummary.payableAmount,
    todaysAmount: safeSummary.todaysPurchases,
    totalCount: safeSummary.totalBills,
    avgValue: safeSummary.avgPurchaseValue,
    growthPercentage: safeSummary.growthPercentage,
    paidCount: safeSummary.paidBills,
    pendingCount: safeSummary.pendingBills,
  };

  const labels = {
    title: "Purchase Overview",
    totalLabel: "Total Purchases",
    paidLabel: "Paid",
    payableLabel: "Payable",
    todayLabel: "Today",
    countLabel: "Bills",
    avgLabel: "Avg. Purchase",
    paidStatus: "Paid",
    pendingStatus: "Due",
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
            <FontAwesomeIcon icon={faShoppingCart} className="me-2" />
            {labels.title}
          </h6>
        </Card.Header>

        <Card.Body className="p-2" style={{borderRadius: 0}}>
          <Row className="g-1 mb-2">
            <Col xs={12}>
              <Card className="border-0 bg-light" style={{borderRadius: 0}}>
                <Card.Body className="p-2" style={{borderRadius: 0}}>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <div
                      className="p-1 bg-purple"
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: 0,
                      }}
                    >
                      <FontAwesomeIcon
                        icon={faChartLine}
                        className="text-white"
                        style={{fontSize: "0.6rem"}}
                      />
                    </div>
                    <Badge
                      bg={isPositiveGrowth ? "success" : "danger"}
                      className="small"
                      style={{borderRadius: 0}}
                    >
                      <FontAwesomeIcon
                        icon={isPositiveGrowth ? faArrowUp : faArrowDown}
                        className="me-1"
                      />
                      {Math.abs(displayData.growthPercentage).toFixed(0)}%
                    </Badge>
                  </div>
                  <p className="text-muted mb-0" style={{fontSize: "0.65rem"}}>
                    {labels.totalLabel}
                  </p>
                  <h6
                    className="fw-bold mb-0 text-dark"
                    style={{fontSize: "0.8rem"}}
                  >
                    {formatCurrency(displayData.totalAmount)}
                  </h6>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12}>
              <Card className="border-0 bg-light" style={{borderRadius: 0}}>
                <Card.Body className="p-2" style={{borderRadius: 0}}>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <div
                      className="bg-success p-1"
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: 0,
                      }}
                    >
                      <FontAwesomeIcon
                        icon={faWallet}
                        className="text-white"
                        style={{fontSize: "0.6rem"}}
                      />
                    </div>
                    <Badge
                      bg="success"
                      className="small"
                      style={{borderRadius: 0}}
                    >
                      {labels.paidStatus}
                    </Badge>
                  </div>
                  <p className="text-muted mb-0" style={{fontSize: "0.65rem"}}>
                    {labels.paidLabel}
                  </p>
                  <h6
                    className="fw-bold mb-0 text-success"
                    style={{fontSize: "0.8rem"}}
                  >
                    {formatCurrency(displayData.paid)}
                  </h6>
                  <small className="text-muted" style={{fontSize: "0.6rem"}}>
                    {displayData.totalAmount > 0
                      ? (
                          (displayData.paid / displayData.totalAmount) *
                          100
                        ).toFixed(0)
                      : 0}
                    %
                  </small>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12}>
              <Card className="border-0 bg-light" style={{borderRadius: 0}}>
                <Card.Body className="p-2" style={{borderRadius: 0}}>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <div
                      className="bg-warning p-1"
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: 0,
                      }}
                    >
                      <FontAwesomeIcon
                        icon={faReceipt}
                        className="text-white"
                        style={{fontSize: "0.6rem"}}
                      />
                    </div>
                    <Badge
                      bg="warning"
                      className="small"
                      style={{borderRadius: 0}}
                    >
                      {labels.pendingStatus}
                    </Badge>
                  </div>
                  <p className="text-muted mb-0" style={{fontSize: "0.65rem"}}>
                    {labels.payableLabel}
                  </p>
                  <h6
                    className="fw-bold mb-0 text-warning"
                    style={{fontSize: "0.8rem"}}
                  >
                    {formatCurrency(displayData.payable)}
                  </h6>
                  <small className="text-muted" style={{fontSize: "0.6rem"}}>
                    {displayData.totalAmount > 0
                      ? (
                          (displayData.payable / displayData.totalAmount) *
                          100
                        ).toFixed(0)
                      : 0}
                    %
                  </small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

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
                      icon={faShoppingCart}
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

export default PurchaseBillsSummary;
