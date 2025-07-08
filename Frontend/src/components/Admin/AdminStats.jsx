import React, {useState, useEffect} from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Alert,
  Spinner,
  ProgressBar,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faBuilding,
  faChartLine,
  faDatabase,
  faServer,
  faHdd,
  faMemory,
  faNetworkWired,
  faRefresh,
  faExclamationTriangle,
  faCheckCircle,
  faClockRotateLeft,
  faArrowUp,
  faArrowDown,
} from "@fortawesome/free-solid-svg-icons";

function AdminStats({adminData, onRefresh, addToast}) {
  const [systemStats, setSystemStats] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadSystemStats();
  }, []);

  const loadSystemStats = async () => {
    try {
      // Simulate API call for system statistics
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockStats = {
        system: {
          cpuUsage: 45,
          memoryUsage: 67,
          diskUsage: 32,
          uptime: "15 days, 6 hours",
          load: "1.2",
        },
        database: {
          connections: 15,
          size: "2.5 GB",
          queries: 1245,
          slowQueries: 3,
        },
        network: {
          inbound: "125 MB/s",
          outbound: "89 MB/s",
          latency: "12ms",
        },
        business: {
          dailyActiveUsers: 89,
          newRegistrations: 12,
          totalTransactions: 456,
          revenue: "$12,450",
        },
      };

      setSystemStats(mockStats);
    } catch (error) {
      console.error("Error loading system stats:", error);
      addToast?.("Failed to load system statistics", "error");
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadSystemStats();
      if (onRefresh) {
        await onRefresh();
      }
      addToast?.("Statistics refreshed successfully", "success");
    } catch (error) {
      addToast?.("Failed to refresh statistics", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const StatCard = ({title, value, icon, color, trend, description}) => (
    <Card className="stat-card h-100">
      <Card.Body>
        <div className="d-flex align-items-center">
          <div className={`stat-icon bg-${color}`}>
            <FontAwesomeIcon icon={icon} />
          </div>
          <div className="flex-1 ms-3">
            <h3 className="stat-value mb-1">{value}</h3>
            <p className="stat-title text-muted mb-0">{title}</p>
            {trend && (
              <div
                className={`stat-trend ${
                  trend.direction === "up" ? "text-success" : "text-danger"
                }`}
              >
                <FontAwesomeIcon
                  icon={trend.direction === "up" ? faArrowUp : faArrowDown}
                  className="me-1"
                />
                {trend.value}
              </div>
            )}
            {description && <small className="text-muted">{description}</small>}
          </div>
        </div>
      </Card.Body>
    </Card>
  );

  const SystemCard = ({title, items, icon, color}) => (
    <Card className="system-card h-100">
      <Card.Header className="d-flex align-items-center">
        <div className={`system-icon bg-${color} me-3`}>
          <FontAwesomeIcon icon={icon} />
        </div>
        <h6 className="mb-0">{title}</h6>
      </Card.Header>
      <Card.Body>
        {items.map((item, index) => (
          <div key={index} className="system-item">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="item-label">{item.label}</span>
              <span className="item-value">{item.value}</span>
            </div>
            {item.percentage !== undefined && (
              <ProgressBar
                now={item.percentage}
                variant={
                  item.percentage > 80
                    ? "danger"
                    : item.percentage > 60
                    ? "warning"
                    : "success"
                }
                className="mb-2"
                style={{height: "6px"}}
              />
            )}
          </div>
        ))}
      </Card.Body>
    </Card>
  );

  if (!systemStats) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading system statistics...</p>
      </div>
    );
  }

  return (
    <div className="admin-stats">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">System Overview</h4>
          <p className="text-muted mb-0">
            Real-time system statistics and monitoring
          </p>
        </div>
        <Button
          variant="outline-primary"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <FontAwesomeIcon
            icon={faRefresh}
            className={`me-2 ${isRefreshing ? "fa-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <Row className="mb-4">
        <Col lg={3} md={6} className="mb-3">
          <StatCard
            title="Total Users"
            value={adminData?.totalUsers || 0}
            icon={faUsers}
            color="primary"
            trend={{direction: "up", value: "+12%"}}
            description="Active user accounts"
          />
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <StatCard
            title="Companies"
            value={adminData?.totalCompanies || 0}
            icon={faBuilding}
            color="success"
            trend={{direction: "up", value: "+5%"}}
            description="Registered companies"
          />
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <StatCard
            title="Daily Active"
            value={systemStats.business.dailyActiveUsers}
            icon={faChartLine}
            color="info"
            trend={{direction: "up", value: "+8%"}}
            description="Users today"
          />
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <StatCard
            title="System Health"
            value={adminData?.systemHealth || "Good"}
            icon={faCheckCircle}
            color="success"
            description="Overall system status"
          />
        </Col>
      </Row>

      {/* System Performance */}
      <Row className="mb-4">
        <Col lg={4} className="mb-3">
          <SystemCard
            title="System Performance"
            icon={faServer}
            color="primary"
            items={[
              {
                label: "CPU Usage",
                value: `${systemStats.system.cpuUsage}%`,
                percentage: systemStats.system.cpuUsage,
              },
              {
                label: "Memory Usage",
                value: `${systemStats.system.memoryUsage}%`,
                percentage: systemStats.system.memoryUsage,
              },
              {
                label: "Disk Usage",
                value: `${systemStats.system.diskUsage}%`,
                percentage: systemStats.system.diskUsage,
              },
              {
                label: "System Uptime",
                value: systemStats.system.uptime,
              },
            ]}
          />
        </Col>
        <Col lg={4} className="mb-3">
          <SystemCard
            title="Database Stats"
            icon={faDatabase}
            color="success"
            items={[
              {
                label: "Active Connections",
                value: systemStats.database.connections,
              },
              {
                label: "Database Size",
                value: systemStats.database.size,
              },
              {
                label: "Queries/min",
                value: systemStats.database.queries,
              },
              {
                label: "Slow Queries",
                value: systemStats.database.slowQueries,
              },
            ]}
          />
        </Col>
        <Col lg={4} className="mb-3">
          <SystemCard
            title="Network Activity"
            icon={faNetworkWired}
            color="info"
            items={[
              {
                label: "Inbound Traffic",
                value: systemStats.network.inbound,
              },
              {
                label: "Outbound Traffic",
                value: systemStats.network.outbound,
              },
              {
                label: "Network Latency",
                value: systemStats.network.latency,
              },
              {
                label: "Status",
                value: "Optimal",
              },
            ]}
          />
        </Col>
      </Row>

      {/* Business Metrics */}
      <Row className="mb-4">
        <Col lg={6} className="mb-3">
          <Card>
            <Card.Header>
              <h6 className="mb-0">Business Metrics</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col sm={6}>
                  <div className="metric-item">
                    <h4 className="text-primary">
                      {systemStats.business.newRegistrations}
                    </h4>
                    <p className="text-muted mb-0">New Registrations Today</p>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="metric-item">
                    <h4 className="text-success">
                      {systemStats.business.totalTransactions}
                    </h4>
                    <p className="text-muted mb-0">Total Transactions</p>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6} className="mb-3">
          <Card>
            <Card.Header>
              <h6 className="mb-0">System Alerts</h6>
            </Card.Header>
            <Card.Body>
              <Alert variant="warning" className="mb-2">
                <FontAwesomeIcon
                  icon={faExclamationTriangle}
                  className="me-2"
                />
                High memory usage detected (67%)
              </Alert>
              <Alert variant="info" className="mb-0">
                <FontAwesomeIcon icon={faClockRotateLeft} className="me-2" />
                Scheduled maintenance in 2 days
              </Alert>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Custom Styles */}
      <style>{`
        .stat-card {
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .stat-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.25rem;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #2c3e50;
        }

        .stat-title {
          font-size: 0.9rem;
          font-weight: 500;
        }

        .stat-trend {
          font-size: 0.8rem;
          font-weight: 600;
        }

        .system-card {
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .system-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .system-item {
          padding: 0.5rem 0;
          border-bottom: 1px solid #f8f9fa;
        }

        .system-item:last-child {
          border-bottom: none;
        }

        .item-label {
          font-size: 0.9rem;
          color: #6c757d;
        }

        .item-value {
          font-weight: 600;
          color: #2c3e50;
        }

        .metric-item {
          text-align: center;
          padding: 1rem 0;
        }

        .metric-item h4 {
          margin-bottom: 0.5rem;
        }
      `}</style>
    </div>
  );
}

export default AdminStats;
