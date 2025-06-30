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

  if (loading) {
    return (
      <Card className="h-100 mb-3" style={{borderRadius: 0}}>
        <Card.Body className="p-3">
          <div className="text-center">
            <div
              className="spinner-border spinner-border-sm text-primary"
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
          className={`py-2 ${
            isQuotationsMode ? "bg-info" : "bg-primary"
          } text-white`}
          style={{borderRadius: 0}}
        >
          <h6 className="mb-0 fw-bold text-center small">
            <FontAwesomeIcon
              icon={isQuotationsMode ? faQuoteRight : faChartLine}
              className="me-2"
            />
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
                      className={`p-1 ${
                        isQuotationsMode ? "bg-info" : "bg-primary"
                      }`}
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: 0,
                      }}
                    >
                      <FontAwesomeIcon
                        icon={isQuotationsMode ? faQuoteRight : faChartLine}
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
                    {labels.receivedLabel}
                  </p>
                  <h6
                    className="fw-bold mb-0 text-success"
                    style={{fontSize: "0.8rem"}}
                  >
                    {formatCurrency(displayData.received)}
                  </h6>
                  <small className="text-muted" style={{fontSize: "0.6rem"}}>
                    {displayData.totalAmount > 0
                      ? (
                          (displayData.received / displayData.totalAmount) *
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
                    {labels.balanceLabel}
                  </p>
                  <h6
                    className="fw-bold mb-0 text-warning"
                    style={{fontSize: "0.8rem"}}
                  >
                    {formatCurrency(displayData.balance)}
                  </h6>
                  <small className="text-muted" style={{fontSize: "0.6rem"}}>
                    {displayData.totalAmount > 0
                      ? (
                          (displayData.balance / displayData.totalAmount) *
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
                    className={`me-2 ${
                      isQuotationsMode ? "text-info" : "text-primary"
                    }`}
                    style={{fontSize: "0.6rem"}}
                  />
                  <span className="text-muted" style={{fontSize: "0.65rem"}}>
                    {labels.todayLabel}
                  </span>
                </div>
                <span
                  className={`fw-bold ${
                    isQuotationsMode ? "text-info" : "text-primary"
                  }`}
                  style={{fontSize: "0.7rem"}}
                >
                  {formatCurrency(displayData.todaysAmount)}
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon
                    icon={isQuotationsMode ? faQuoteRight : faFileInvoice}
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

              {isQuotationsMode && displayData.convertedCount > 0 && (
                <div className="d-flex justify-content-between align-items-center py-1 border-top border-light">
                  <div className="d-flex align-items-center">
                    <FontAwesomeIcon
                      icon={faFileInvoice}
                      className="text-purple me-2"
                      style={{fontSize: "0.6rem"}}
                    />
                    <span className="text-muted" style={{fontSize: "0.65rem"}}>
                      Converted
                    </span>
                  </div>
                  <span
                    className="fw-bold text-purple"
                    style={{fontSize: "0.7rem"}}
                  >
                    {displayData.convertedCount}
                  </span>
                </div>
              )}
            </Card.Body>
          </Card>
        </Card.Body>
      </Card>

      <style jsx>{`
        .text-purple {
          color: #8b5cf6 !important;
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

export default SalesInvoicesSummary;
