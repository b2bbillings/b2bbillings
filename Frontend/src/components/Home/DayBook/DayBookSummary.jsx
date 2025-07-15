import React, {useState, useEffect} from "react";
import {Card, Row, Col, Spinner, Alert} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faMoneyBillWave,
  faHandHoldingUsd,
  faExclamationTriangle,
  faClock,
  faArrowTrendUp,
  faArrowTrendDown,
  faRefresh,
  faChartLine,
  faUsers,
  faCalendarCheck,
} from "@fortawesome/free-solid-svg-icons";

// ✅ Import the services
import salesService from "../../../services/salesService";
import purchaseService from "../../../services/purchaseService";
import paymentService from "../../../services/paymentService";

function DayBookSummary({
  summaryData,
  formatCurrency,
  companyId,
  currentCompany,
  onDataUpdate,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [enhancedData, setEnhancedData] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // ✅ Load enhanced summary data from services
  const loadEnhancedSummaryData = async () => {
    if (!companyId) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      // ✅ Prepare API calls with method validation
      const apiCalls = [];

      // ✅ 1. Sales receivables data
      if (
        salesService &&
        typeof salesService.getPaymentSummaryWithOverdue === "function"
      ) {
        apiCalls.push(
          salesService
            .getPaymentSummaryWithOverdue(companyId, {
              includeAging: true,
              includeTrends: true,
              includeDetails: true,
              includeOverdue: true,
              includeDueToday: true,
            })
            .catch((error) => ({success: false, error: error.message}))
        );
      } else {
        apiCalls.push(
          Promise.resolve({success: false, error: "Method not available"})
        );
      }

      // ✅ 2. Purchase payables data
      if (
        purchaseService &&
        typeof purchaseService.getPaymentSummaryWithOverdue === "function"
      ) {
        apiCalls.push(
          purchaseService
            .getPaymentSummaryWithOverdue(companyId, {
              includeAging: true,
              includeTrends: true,
              includeDetails: true,
              includeOverdue: true,
              includeDueToday: true,
            })
            .catch((error) => ({success: false, error: error.message}))
        );
      } else {
        apiCalls.push(
          Promise.resolve({success: false, error: "Method not available"})
        );
      }

      // ✅ 3. Sales payment efficiency
      if (
        salesService &&
        typeof salesService.getCollectionEfficiency === "function"
      ) {
        apiCalls.push(
          salesService.getCollectionEfficiency(companyId).catch((error) => ({
            success: false,
            error: error.message,
          }))
        );
      } else {
        apiCalls.push(
          Promise.resolve({success: false, error: "Method not available"})
        );
      }

      // ✅ 4. Purchase payment efficiency
      if (
        purchaseService &&
        typeof purchaseService.getPaymentEfficiency === "function"
      ) {
        apiCalls.push(
          purchaseService.getPaymentEfficiency(companyId).catch((error) => ({
            success: false,
            error: error.message,
          }))
        );
      } else {
        apiCalls.push(
          Promise.resolve({success: false, error: "Method not available"})
        );
      }

      // ✅ Execute all API calls
      const [
        salesSummaryResponse,
        purchaseSummaryResponse,
        salesPaymentResponse,
        purchasePaymentResponse,
      ] = await Promise.allSettled(apiCalls);

      // ✅ Process results with error handling
      const salesSummary =
        salesSummaryResponse.status === "fulfilled" &&
        salesSummaryResponse.value?.success
          ? salesSummaryResponse.value.data
          : {};

      const purchaseSummary =
        purchaseSummaryResponse.status === "fulfilled" &&
        purchaseSummaryResponse.value?.success
          ? purchaseSummaryResponse.value.data
          : {};

      const salesEfficiency =
        salesPaymentResponse.status === "fulfilled" &&
        salesPaymentResponse.value?.success
          ? salesPaymentResponse.value.data
          : {};

      const purchaseEfficiency =
        purchasePaymentResponse.status === "fulfilled" &&
        purchasePaymentResponse.value?.success
          ? purchasePaymentResponse.value.data
          : {};

      // ✅ Calculate enhanced summary metrics
      const enhancedSummary = {
        // ✅ Receivables (Money to receive)
        totalReceivables: parseFloat(
          salesSummary.totalPending ||
            salesSummary.summary?.totalPending ||
            summaryData?.totalReceivables ||
            0
        ),

        overdueReceivables: parseFloat(
          salesSummary.totalOverdue ||
            salesSummary.summary?.overdueAmount ||
            summaryData?.overdueReceivables ||
            0
        ),

        dueTodayReceivables: parseFloat(
          salesSummary.dueTodayAmount ||
            salesSummary.summary?.dueTodayAmount ||
            summaryData?.dueTodayReceivables ||
            0
        ),

        // ✅ Payables (Money to pay)
        totalPayables: parseFloat(
          purchaseSummary.totalPending ||
            purchaseSummary.summary?.totalPending ||
            summaryData?.totalPayables ||
            0
        ),

        overduePayables: parseFloat(
          purchaseSummary.totalOverdue ||
            purchaseSummary.summary?.overdueAmount ||
            summaryData?.overduePayables ||
            0
        ),

        dueTodayPayables: parseFloat(
          purchaseSummary.dueTodayAmount ||
            purchaseSummary.summary?.dueTodayAmount ||
            summaryData?.dueTodayPayables ||
            0
        ),

        // ✅ Counts for insights
        receivablesCount: parseInt(
          salesSummary.totalInvoices ||
            salesSummary.summary?.totalInvoices ||
            summaryData?.receivablesCount ||
            0
        ),

        payablesCount: parseInt(
          purchaseSummary.totalInvoices ||
            purchaseSummary.summary?.totalInvoices ||
            summaryData?.payablesCount ||
            0
        ),

        overdueReceivablesCount: parseInt(
          salesSummary.overdueCount || salesSummary.summary?.overdueCount || 0
        ),

        overduePayablesCount: parseInt(
          purchaseSummary.overdueCount ||
            purchaseSummary.summary?.overdueCount ||
            0
        ),

        dueTodayReceivablesCount: parseInt(
          salesSummary.dueTodayCount || salesSummary.summary?.dueTodayCount || 0
        ),

        dueTodayPayablesCount: parseInt(
          purchaseSummary.dueTodayCount ||
            purchaseSummary.summary?.dueTodayCount ||
            0
        ),

        // ✅ Efficiency metrics
        collectionEfficiency: parseFloat(
          salesEfficiency.collectionRate || salesEfficiency.efficiency || 0
        ),

        paymentEfficiency: parseFloat(
          purchaseEfficiency.paymentRate || purchaseEfficiency.efficiency || 0
        ),

        // ✅ Additional insights
        avgCollectionDays: parseInt(
          salesEfficiency.avgCollectionDays || salesEfficiency.averageDays || 0
        ),

        avgPaymentDays: parseInt(
          purchaseEfficiency.avgPaymentDays ||
            purchaseEfficiency.averageDays ||
            0
        ),

        // ✅ Data status
        lastUpdated: new Date(),
        dataSource: "services",
        hasRealData: true,

        // ✅ API response status
        apiResponses: {
          salesSummary: salesSummaryResponse.status,
          purchaseSummary: purchaseSummaryResponse.status,
          salesEfficiency: salesPaymentResponse.status,
          purchaseEfficiency: purchasePaymentResponse.status,
        },

        // ✅ Error tracking
        apiErrors: {
          salesSummary: salesSummaryResponse.value?.error || null,
          purchaseSummary: purchaseSummaryResponse.value?.error || null,
          salesEfficiency: salesPaymentResponse.value?.error || null,
          purchaseEfficiency: purchasePaymentResponse.value?.error || null,
        },
      };

      // ✅ Calculate net position and totals
      enhancedSummary.netPosition =
        enhancedSummary.totalReceivables - enhancedSummary.totalPayables;
      enhancedSummary.totalOverdue =
        enhancedSummary.overdueReceivables + enhancedSummary.overduePayables;
      enhancedSummary.totalDueToday =
        enhancedSummary.dueTodayReceivables + enhancedSummary.dueTodayPayables;

      setEnhancedData(enhancedSummary);
      setLastRefresh(new Date());

      // ✅ Notify parent component
      if (onDataUpdate && typeof onDataUpdate === "function") {
        onDataUpdate(enhancedSummary);
      }
    } catch (error) {
      setError(`Failed to load summary data: ${error.message}`);

      // ✅ Fallback to provided summaryData
      if (summaryData && Object.keys(summaryData).length > 0) {
        setEnhancedData({
          ...summaryData,
          dataSource: "fallback",
          hasRealData: false,
          lastUpdated: new Date(),
          error: error.message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Load data on component mount and when companyId changes
  useEffect(() => {
    if (companyId) {
      loadEnhancedSummaryData();
    }
  }, [companyId]);

  // ✅ Auto-refresh every 5 minutes
  useEffect(() => {
    if (!companyId) return;

    const refreshInterval = setInterval(() => {
      loadEnhancedSummaryData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(refreshInterval);
  }, [companyId]);

  // ✅ Use enhanced data if available, otherwise fall back to props
  const displayData = enhancedData ||
    summaryData || {
      totalReceivables: 0,
      totalPayables: 0,
      overdueReceivables: 0,
      overduePayables: 0,
      netPosition: 0,
      totalOverdue: 0,
    };

  // ✅ Handle manual refresh
  const handleRefresh = () => {
    loadEnhancedSummaryData();
  };

  // ✅ Helper function to get trend indicator
  const getTrendIndicator = (current, previous) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return {
      isPositive: change >= 0,
      percentage: Math.abs(change).toFixed(1),
      icon: change >= 0 ? faArrowTrendUp : faArrowTrendDown,
      color: change >= 0 ? "text-success" : "text-danger",
    };
  };

  // ✅ Helper function to get priority badge
  const getPriorityBadge = (type, count) => {
    if (count === 0) return null;

    const badges = {
      overdue: {color: "danger", icon: faExclamationTriangle},
      dueToday: {color: "warning", icon: faClock},
      efficiency: {color: "info", icon: faChartLine},
    };

    const badge = badges[type] || badges.efficiency;
    return (
      <small className={`text-${badge.color} ms-2`}>
        <FontAwesomeIcon icon={badge.icon} className="me-1" />
        {count}
      </small>
    );
  };

  return (
    <div className="daybook-summary mb-4">
      {/* ✅ Error Alert */}
      {error && (
        <Alert
          variant="warning"
          className="mb-3"
          dismissible
          onClose={() => setError("")}
        >
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          {error}
        </Alert>
      )}

      {/* ✅ Enhanced Summary Cards */}
      <Row className="g-3">
        {/* ✅ Total Receivables Card */}
        <Col md={3}>
          <Card className="summary-card border-success h-100">
            <Card.Body className="text-center">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <FontAwesomeIcon
                  icon={faMoneyBillWave}
                  size="2x"
                  className="text-success"
                />
                {loading && <Spinner size="sm" animation="border" />}
              </div>

              <h4 className="mb-1 text-success">
                {formatCurrency(displayData.totalReceivables)}
              </h4>

              <p className="text-muted mb-2">Total to Receive</p>

              {/* ✅ Additional Info */}
              <div className="d-flex justify-content-between align-items-center small text-muted">
                <span>
                  <FontAwesomeIcon icon={faUsers} className="me-1" />
                  {displayData.receivablesCount || 0} invoices
                </span>
                {getPriorityBadge(
                  "overdue",
                  displayData.overdueReceivablesCount
                )}
              </div>

              {/* ✅ Overdue Amount */}
              {displayData.overdueReceivables > 0 && (
                <div className="mt-2">
                  <small className="text-danger">
                    <FontAwesomeIcon
                      icon={faExclamationTriangle}
                      className="me-1"
                    />
                    {formatCurrency(displayData.overdueReceivables)} overdue
                  </small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* ✅ Total Payables Card */}
        <Col md={3}>
          <Card className="summary-card border-primary h-100">
            <Card.Body className="text-center">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <FontAwesomeIcon
                  icon={faHandHoldingUsd}
                  size="2x"
                  className="text-primary"
                />
                {loading && <Spinner size="sm" animation="border" />}
              </div>

              <h4 className="mb-1 text-primary">
                {formatCurrency(displayData.totalPayables)}
              </h4>

              <p className="text-muted mb-2">Total to Pay</p>

              {/* ✅ Additional Info */}
              <div className="d-flex justify-content-between align-items-center small text-muted">
                <span>
                  <FontAwesomeIcon icon={faUsers} className="me-1" />
                  {displayData.payablesCount || 0} bills
                </span>
                {getPriorityBadge("overdue", displayData.overduePayablesCount)}
              </div>

              {/* ✅ Overdue Amount */}
              {displayData.overduePayables > 0 && (
                <div className="mt-2">
                  <small className="text-danger">
                    <FontAwesomeIcon
                      icon={faExclamationTriangle}
                      className="me-1"
                    />
                    {formatCurrency(displayData.overduePayables)} overdue
                  </small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* ✅ Total Overdue Card */}
        <Col md={3}>
          <Card className="summary-card border-danger h-100">
            <Card.Body className="text-center">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <FontAwesomeIcon
                  icon={faExclamationTriangle}
                  size="2x"
                  className="text-danger"
                />
                {displayData.totalOverdue > 0 && (
                  <FontAwesomeIcon icon={faClock} className="text-warning" />
                )}
              </div>

              <h4 className="mb-1 text-danger">
                {formatCurrency(displayData.totalOverdue || 0)}
              </h4>

              <p className="text-muted mb-2">Total Overdue</p>

              {/* ✅ Breakdown */}
              <div className="small text-muted">
                {displayData.overdueReceivables > 0 && (
                  <div>
                    <FontAwesomeIcon
                      icon={faMoneyBillWave}
                      className="text-success me-1"
                    />
                    {formatCurrency(displayData.overdueReceivables)} receivable
                  </div>
                )}
                {displayData.overduePayables > 0 && (
                  <div>
                    <FontAwesomeIcon
                      icon={faHandHoldingUsd}
                      className="text-primary me-1"
                    />
                    {formatCurrency(displayData.overduePayables)} payable
                  </div>
                )}
                {displayData.totalOverdue === 0 && (
                  <div className="text-success">
                    <FontAwesomeIcon icon={faArrowTrendUp} className="me-1" />
                    All up to date!
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* ✅ Net Position Card */}
        <Col md={3}>
          <Card className="summary-card border-info h-100">
            <Card.Body className="text-center">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <FontAwesomeIcon
                  icon={
                    displayData.netPosition >= 0
                      ? faArrowTrendUp
                      : faArrowTrendDown
                  }
                  size="2x"
                  className={`${
                    displayData.netPosition >= 0
                      ? "text-success"
                      : "text-danger"
                  }`}
                />
                <button
                  className="btn btn-link btn-sm p-0"
                  onClick={handleRefresh}
                  disabled={loading}
                  title="Refresh data"
                >
                  <FontAwesomeIcon
                    icon={faRefresh}
                    className={loading ? "fa-spin" : ""}
                  />
                </button>
              </div>

              <h4
                className={`mb-1 ${
                  displayData.netPosition >= 0 ? "text-success" : "text-danger"
                }`}
              >
                {formatCurrency(Math.abs(displayData.netPosition))}
              </h4>

              <p className="text-muted mb-2">Net Position</p>

              <small className="text-muted">
                {displayData.netPosition >= 0
                  ? "Net Receivable"
                  : "Net Payable"}
              </small>

              {/* ✅ Efficiency Metrics */}
              {enhancedData && enhancedData.hasRealData && (
                <div className="mt-2 small text-muted">
                  {enhancedData.collectionEfficiency > 0 && (
                    <div>
                      <FontAwesomeIcon icon={faChartLine} className="me-1" />
                      {enhancedData.collectionEfficiency.toFixed(1)}% collection
                      rate
                    </div>
                  )}
                  {enhancedData.avgCollectionDays > 0 && (
                    <div>
                      <FontAwesomeIcon
                        icon={faCalendarCheck}
                        className="me-1"
                      />
                      {enhancedData.avgCollectionDays} days avg collection
                    </div>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ✅ Data Source Indicator */}
      {enhancedData && (
        <Row className="mt-2">
          <Col>
            <div className="text-center small text-muted">
              <FontAwesomeIcon
                icon={
                  enhancedData.hasRealData ? faChartLine : faExclamationTriangle
                }
                className="me-1"
              />
              {enhancedData.hasRealData
                ? `Live data • Last updated: ${lastRefresh.toLocaleTimeString()}`
                : "Using cached data • Click refresh to update"}
              {enhancedData.dataSource && (
                <span className="ms-2 badge bg-secondary">
                  {enhancedData.dataSource}
                </span>
              )}
            </div>
          </Col>
        </Row>
      )}
    </div>
  );
}

export default DayBookSummary;
