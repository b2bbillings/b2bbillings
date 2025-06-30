import React, {useState, useEffect} from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Form,
  InputGroup,
  Table,
  Badge,
  Dropdown,
  Spinner,
  Alert,
  Modal,
  ProgressBar,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faDownload,
  faEye,
  faCalendarAlt,
  faFilter,
  faFileExcel,
  faFilePdf,
  faFileCode,
  faSync,
  faChartBar,
  faChartPie,
  faArrowTrendUp, // ✅ FIXED: Use faArrowTrendUp instead of faTrendingUp
  faArrowTrendDown, // ✅ This one exists
  faEquals,
  faBuilding,
  faUsers,
  faShoppingCart,
  faRupeeSign,
  faBoxOpen,
  faReceipt,
  faWarehouse,
  faClock,
  faArrowUp,
  faArrowDown,
  faEllipsisV,
  faPlay,
  faPause,
  faStop,
} from "@fortawesome/free-solid-svg-icons";

// ✅ FIXED: Removed Area from imports and replaced faTrendingDown with faArrowTrendDown
import {Line, Bar, Doughnut} from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

function ReportsAnalytics({adminData, currentUser, addToast}) {
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState("7days");
  const [reportType, setReportType] = useState("overview");
  const [selectedMetrics, setSelectedMetrics] = useState([
    "revenue",
    "users",
    "orders",
  ]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    loadReportData();
  }, [dateRange, reportType]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadReportData, 30000); // Refresh every 30 seconds
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh]);

  const loadReportData = async () => {
    try {
      setIsLoading(true);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const mockReportData = {
        overview: {
          totalRevenue: 2456789,
          totalUsers: 1247,
          totalCompanies: 89,
          totalOrders: 3456,
          avgOrderValue: 1234,
          conversionRate: 12.5,
          customerRetention: 78.9,
          systemUptime: 99.8,
        },
        trends: {
          revenue: {
            current: 2456789,
            previous: 2234567,
            change: 9.94,
            trend: "up",
          },
          users: {
            current: 1247,
            previous: 1198,
            change: 4.09,
            trend: "up",
          },
          orders: {
            current: 3456,
            previous: 3234,
            change: 6.87,
            trend: "up",
          },
          companies: {
            current: 89,
            previous: 87,
            change: 2.3,
            trend: "up",
          },
        },
        charts: {
          revenueChart: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            datasets: [
              {
                label: "Revenue (₹)",
                data: [180000, 220000, 195000, 245000, 280000, 310000],
                borderColor: "rgb(59, 130, 246)",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                tension: 0.4,
                fill: true,
              },
            ],
          },
          userGrowthChart: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            datasets: [
              {
                label: "New Users",
                data: [45, 67, 52, 78, 89, 94],
                backgroundColor: "rgba(16, 185, 129, 0.8)",
              },
              {
                label: "Active Users",
                data: [123, 145, 167, 189, 201, 218],
                backgroundColor: "rgba(59, 130, 246, 0.8)",
              },
            ],
          },
          companyDistribution: {
            labels: ["Premium", "Basic", "Trial", "Inactive"],
            datasets: [
              {
                data: [35, 28, 15, 11],
                backgroundColor: [
                  "rgba(16, 185, 129, 0.8)",
                  "rgba(59, 130, 246, 0.8)",
                  "rgba(245, 158, 11, 0.8)",
                  "rgba(239, 68, 68, 0.8)",
                ],
              },
            ],
          },
          orderStatusChart: {
            labels: ["Completed", "Pending", "Processing", "Cancelled"],
            datasets: [
              {
                data: [2145, 567, 234, 156],
                backgroundColor: [
                  "rgba(16, 185, 129, 0.8)",
                  "rgba(245, 158, 11, 0.8)",
                  "rgba(59, 130, 246, 0.8)",
                  "rgba(239, 68, 68, 0.8)",
                ],
              },
            ],
          },
        },
        topCompanies: [
          {
            id: 1,
            name: "Tech Solutions Ltd",
            revenue: 450000,
            orders: 234,
            growth: 15.2,
          },
          {
            id: 2,
            name: "Retail Hub Pvt Ltd",
            revenue: 380000,
            orders: 189,
            growth: 12.8,
          },
          {
            id: 3,
            name: "Manufacturing Co",
            revenue: 320000,
            orders: 156,
            growth: 8.5,
          },
          {
            id: 4,
            name: "Digital Services Inc",
            revenue: 290000,
            orders: 134,
            growth: 22.1,
          },
          {
            id: 5,
            name: "Export House Ltd",
            revenue: 275000,
            orders: 123,
            growth: -3.2,
          },
        ],
        recentActivity: [
          {
            id: 1,
            type: "user_registration",
            company: "Tech Solutions Ltd",
            timestamp: new Date(),
            value: "₹12,500",
          },
          {
            id: 2,
            type: "order_completed",
            company: "Retail Hub Pvt Ltd",
            timestamp: new Date(),
            value: "₹8,750",
          },
          {
            id: 3,
            type: "company_upgrade",
            company: "Manufacturing Co",
            timestamp: new Date(),
            value: "Premium Plan",
          },
          {
            id: 4,
            type: "large_order",
            company: "Digital Services Inc",
            timestamp: new Date(),
            value: "₹45,000",
          },
        ],
      };

      setReportData(mockReportData);
    } catch (error) {
      console.error("Error loading report data:", error);
      addToast?.("Failed to load report data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      setIsExporting(true);

      // Simulate export process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // In real implementation, this would generate and download the file
      addToast?.(
        `Report exported successfully as ${format.toUpperCase()}`,
        "success"
      );
      setShowExportModal(false);
    } catch (error) {
      addToast?.("Failed to export report", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const MetricCard = ({
    title,
    value,
    change,
    trend,
    icon,
    color = "primary",
  }) => (
    <Card className="h-100 metric-card">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start">
          <div className="flex-grow-1">
            <div className="d-flex align-items-center mb-2">
              <FontAwesomeIcon
                icon={icon}
                className={`text-${color} me-2`}
                size="lg"
              />
              <h6 className="text-muted mb-0">{title}</h6>
            </div>
            <h3 className={`text-${color} mb-2`}>{value}</h3>
            {change !== undefined && (
              <div
                className={`d-flex align-items-center text-${
                  trend === "up"
                    ? "success"
                    : trend === "down"
                    ? "danger"
                    : "muted"
                }`}
              >
                <FontAwesomeIcon
                  icon={
                    trend === "up"
                      ? faArrowUp
                      : trend === "down"
                      ? faArrowDown
                      : faEquals
                  }
                  className="me-1"
                  size="sm"
                />
                <small className="fw-bold">{Math.abs(change)}%</small>
                <small className="ms-1">vs last period</small>
              </div>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );

  const ActivityBadge = ({type}) => {
    const configs = {
      user_registration: {bg: "success", icon: faUsers, text: "New User"},
      order_completed: {bg: "primary", icon: faShoppingCart, text: "Order"},
      company_upgrade: {bg: "warning", icon: faBuilding, text: "Upgrade"},
      large_order: {bg: "info", icon: faRupeeSign, text: "Large Order"},
    };

    const config = configs[type] || {
      bg: "secondary",
      icon: faClock,
      text: "Activity",
    };

    return (
      <Badge bg={config.bg} className="d-flex align-items-center">
        <FontAwesomeIcon icon={config.icon} className="me-1" size="xs" />
        {config.text}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" size="lg" />
        <h5 className="mt-3 text-muted">Loading analytics data...</h5>
      </div>
    );
  }

  return (
    <div className="reports-analytics">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">Reports & Analytics</h4>
          <p className="text-muted mb-0">
            Comprehensive business insights and analytics
          </p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <Button
            variant={autoRefresh ? "success" : "outline-secondary"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <FontAwesomeIcon
              icon={autoRefresh ? faPause : faPlay}
              className="me-2"
            />
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Button>
          <Button variant="outline-primary" size="sm" onClick={loadReportData}>
            <FontAwesomeIcon icon={faSync} className="me-2" />
            Refresh
          </Button>
          <Button variant="primary" onClick={() => setShowExportModal(true)}>
            <FontAwesomeIcon icon={faDownload} className="me-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="align-items-end">
            <Col lg={3} md={6} className="mb-3">
              <Form.Label>Date Range</Form.Label>
              <Form.Select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last Year</option>
                <option value="custom">Custom Range</option>
              </Form.Select>
            </Col>
            <Col lg={3} md={6} className="mb-3">
              <Form.Label>Report Type</Form.Label>
              <Form.Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="overview">Overview</option>
                <option value="revenue">Revenue Analysis</option>
                <option value="users">User Analytics</option>
                <option value="companies">Company Performance</option>
                <option value="orders">Order Analytics</option>
                <option value="inventory">Inventory Reports</option>
              </Form.Select>
            </Col>
            <Col lg={4} md={6} className="mb-3">
              <Form.Label>Metrics to Display</Form.Label>
              <div className="d-flex gap-2">
                {["revenue", "users", "orders", "companies"].map((metric) => (
                  <Form.Check
                    key={metric}
                    type="checkbox"
                    id={`metric-${metric}`}
                    label={metric.charAt(0).toUpperCase() + metric.slice(1)}
                    checked={selectedMetrics.includes(metric)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMetrics([...selectedMetrics, metric]);
                      } else {
                        setSelectedMetrics(
                          selectedMetrics.filter((m) => m !== metric)
                        );
                      }
                    }}
                  />
                ))}
              </div>
            </Col>
            <Col lg={2} md={6} className="mb-3">
              <div className="text-muted small">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Key Metrics */}
      <Row className="mb-4">
        <Col lg={3} md={6} className="mb-3">
          <MetricCard
            title="Total Revenue"
            value={`₹${(reportData?.overview.totalRevenue / 100000).toFixed(
              1
            )}L`}
            change={reportData?.trends.revenue.change}
            trend={reportData?.trends.revenue.trend}
            icon={faRupeeSign}
            color="success"
          />
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <MetricCard
            title="Total Users"
            value={reportData?.overview.totalUsers.toLocaleString()}
            change={reportData?.trends.users.change}
            trend={reportData?.trends.users.trend}
            icon={faUsers}
            color="primary"
          />
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <MetricCard
            title="Total Orders"
            value={reportData?.overview.totalOrders.toLocaleString()}
            change={reportData?.trends.orders.change}
            trend={reportData?.trends.orders.trend}
            icon={faShoppingCart}
            color="info"
          />
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <MetricCard
            title="Companies"
            value={reportData?.overview.totalCompanies}
            change={reportData?.trends.companies.change}
            trend={reportData?.trends.companies.trend}
            icon={faBuilding}
            color="warning"
          />
        </Col>
      </Row>

      {/* Charts Row */}
      <Row className="mb-4">
        <Col lg={8} className="mb-4">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <FontAwesomeIcon icon={faChartLine} className="me-2" />
                Revenue Trend
              </h5>
              <Badge bg="success">
                ₹{(reportData?.overview.totalRevenue / 100000).toFixed(1)}L
                Total
              </Badge>
            </Card.Header>
            <Card.Body>
              <Line
                data={reportData?.charts.revenueChart}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: "top",
                    },
                    tooltip: {
                      callbacks: {
                        label: function (context) {
                          return `₹${context.parsed.y.toLocaleString()}`;
                        },
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function (value) {
                          return "₹" + value / 1000 + "K";
                        },
                      },
                    },
                  },
                }}
              />
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">
                <FontAwesomeIcon icon={faChartPie} className="me-2" />
                Company Distribution
              </h5>
            </Card.Header>
            <Card.Body>
              <Doughnut
                data={reportData?.charts.companyDistribution}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "bottom",
                    },
                  },
                }}
                height={200}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* User Growth and Order Status */}
      <Row className="mb-4">
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <FontAwesomeIcon icon={faChartBar} className="me-2" />
                User Growth
              </h5>
            </Card.Header>
            <Card.Body>
              <Bar
                data={reportData?.charts.userGrowthChart}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: "top",
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <FontAwesomeIcon icon={faReceipt} className="me-2" />
                Order Status Distribution
              </h5>
            </Card.Header>
            <Card.Body>
              <Doughnut
                data={reportData?.charts.orderStatusChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "bottom",
                    },
                  },
                }}
                height={200}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Top Companies and Recent Activity */}
      <Row>
        <Col lg={7} className="mb-4">
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <FontAwesomeIcon icon={faArrowTrendUp} className="me-2" />
                {/* ✅ FIXED: Use faArrowTrendUp instead of faTrendingUp */}
                Top Performing Companies
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Rank</th>
                    <th>Company</th>
                    <th>Revenue</th>
                    <th>Orders</th>
                    <th>Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData?.topCompanies.map((company, index) => (
                    <tr key={company.id}>
                      <td>
                        <Badge bg={index < 3 ? "warning" : "secondary"}>
                          #{index + 1}
                        </Badge>
                      </td>
                      <td className="fw-bold">{company.name}</td>
                      <td>₹{(company.revenue / 1000).toFixed(0)}K</td>
                      <td>{company.orders}</td>
                      <td>
                        <span
                          className={`text-${
                            company.growth >= 0 ? "success" : "danger"
                          }`}
                        >
                          <FontAwesomeIcon
                            icon={company.growth >= 0 ? faArrowUp : faArrowDown}
                            size="sm"
                            className="me-1"
                          />
                          {Math.abs(company.growth)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={5} className="mb-4">
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <FontAwesomeIcon icon={faClock} className="me-2" />
                Recent Activity
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="activity-feed">
                {reportData?.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="d-flex align-items-start mb-3 pb-3 border-bottom"
                  >
                    <div className="flex-shrink-0 me-3">
                      <ActivityBadge type={activity.type} />
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-bold text-dark">
                        {activity.company}
                      </div>
                      <div className="text-success fw-bold">
                        {activity.value}
                      </div>
                      <small className="text-muted">
                        {activity.timestamp.toLocaleTimeString()}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Export Modal */}
      <Modal
        show={showExportModal}
        onHide={() => setShowExportModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon icon={faDownload} className="me-2" />
            Export Report
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted">
            Choose the export format for your report:
          </p>
          <div className="d-grid gap-2">
            <Button
              variant="outline-success"
              onClick={() => handleExport("excel")}
              disabled={isExporting}
              className="d-flex align-items-center justify-content-center"
            >
              <FontAwesomeIcon icon={faFileExcel} className="me-2" />
              Export as Excel (.xlsx)
            </Button>
            <Button
              variant="outline-danger"
              onClick={() => handleExport("pdf")}
              disabled={isExporting}
              className="d-flex align-items-center justify-content-center"
            >
              <FontAwesomeIcon icon={faFilePdf} className="me-2" />
              Export as PDF
            </Button>
            <Button
              variant="outline-info"
              onClick={() => handleExport("csv")}
              disabled={isExporting}
              className="d-flex align-items-center justify-content-center"
            >
              <FontAwesomeIcon icon={faFileCode} className="me-2" />
              Export as CSV
            </Button>
          </div>
          {isExporting && (
            <div className="mt-3">
              <ProgressBar animated now={100} label="Generating report..." />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExportModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .metric-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          border: none;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
        }

        .metric-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .activity-feed {
          max-height: 300px;
          overflow-y: auto;
        }

        .activity-feed::-webkit-scrollbar {
          width: 4px;
        }

        .activity-feed::-webkit-scrollbar-track {
          background: #f1f1f1;
        }

        .activity-feed::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 2px;
        }

        .table th {
          border-top: none;
          font-weight: 600;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .card {
          border: none;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
        }

        .card-header {
          background-color: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
          border-radius: 12px 12px 0 0 !important;
        }
      `}</style>
    </div>
  );
}

export default ReportsAnalytics;
