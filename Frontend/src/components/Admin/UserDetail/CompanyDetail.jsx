import React, {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Nav,
  Tab,
  Button,
  Badge,
  Alert,
  Spinner,
  Table,
  ProgressBar,
  ListGroup,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faArrowLeft,
  faTachometerAlt,
  faFileInvoice,
  faUsers,
  faExchangeAlt,
  faShoppingCart,
  faChartLine,
  faMapMarkerAlt,
  faPhone,
  faEnvelope,
  faGlobe,
  faCalendarAlt,
  faCheckCircle,
  faExclamationTriangle,
  faTimesCircle,
  faDollarSign,
  faBox,
  faHandshake,
} from "@fortawesome/free-solid-svg-icons";

import companyService from "../../../services/companyService";
import salesService from "../../../services/salesService";
import purchaseService from "../../../services/purchaseService";
import partyService from "../../../services/partyService";

// Sub-components for each tab
const CompanyDashboard = ({companyData, userData, addToast}) => {
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    totalParties: 0,
    totalOrders: 0,
    monthlyGrowth: 0,
    activeStatus: "active",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCompanyStats();
  }, [companyData]);

  const loadCompanyStats = async () => {
    try {
      setIsLoading(true);
      // Mock stats - replace with actual API calls
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setStats({
        totalInvoices: 156,
        totalRevenue: 245800,
        totalParties: 34,
        totalOrders: 89,
        monthlyGrowth: 12.5,
        activeStatus: companyData?.status || "active",
      });
    } catch (error) {
      addToast("Error loading company stats", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: "success",
      inactive: "secondary",
      pending: "warning",
      suspended: "danger",
    };
    return (
      <Badge bg={variants[status] || "secondary"}>
        {status?.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading company dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Company Overview Cards */}
      <Row className="g-4 mb-4">
        <Col lg={3} md={6}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div
                className="rounded-circle bg-primary bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3"
                style={{width: "60px", height: "60px"}}
              >
                <FontAwesomeIcon
                  icon={faFileInvoice}
                  className="fs-4 text-primary"
                />
              </div>
              <h3 className="fw-bold text-primary mb-1">
                {stats.totalInvoices}
              </h3>
              <p className="text-muted mb-0">Total Invoices</p>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div
                className="rounded-circle bg-success bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3"
                style={{width: "60px", height: "60px"}}
              >
                <FontAwesomeIcon
                  icon={faDollarSign}
                  className="fs-4 text-success"
                />
              </div>
              <h3 className="fw-bold text-success mb-1">
                ₹{stats.totalRevenue.toLocaleString()}
              </h3>
              <p className="text-muted mb-0">Total Revenue</p>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div
                className="rounded-circle bg-info bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3"
                style={{width: "60px", height: "60px"}}
              >
                <FontAwesomeIcon
                  icon={faHandshake}
                  className="fs-4 text-info"
                />
              </div>
              <h3 className="fw-bold text-info mb-1">{stats.totalParties}</h3>
              <p className="text-muted mb-0">Total Parties</p>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div
                className="rounded-circle bg-warning bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3"
                style={{width: "60px", height: "60px"}}
              >
                <FontAwesomeIcon
                  icon={faShoppingCart}
                  className="fs-4 text-warning"
                />
              </div>
              <h3 className="fw-bold text-warning mb-1">{stats.totalOrders}</h3>
              <p className="text-muted mb-0">Total Orders</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Company Information */}
      <Row className="g-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-light border-0">
              <h6 className="mb-0 fw-bold">
                <FontAwesomeIcon
                  icon={faBuilding}
                  className="me-2 text-primary"
                />
                Company Information
              </h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <div className="mb-3">
                    <small className="text-muted d-block">Business Name</small>
                    <p className="fw-semibold mb-0">
                      {companyData?.businessName || "N/A"}
                    </p>
                  </div>
                  <div className="mb-3">
                    <small className="text-muted d-block">Business Type</small>
                    <p className="fw-semibold mb-0">
                      {companyData?.businessType || "N/A"}
                    </p>
                  </div>
                  <div className="mb-3">
                    <small className="text-muted d-block">GST Number</small>
                    <p className="fw-semibold mb-0">
                      {companyData?.gstNumber || "Not Provided"}
                    </p>
                  </div>
                  <div className="mb-3">
                    <small className="text-muted d-block">
                      <FontAwesomeIcon icon={faEnvelope} className="me-1" />
                      Email
                    </small>
                    <p className="fw-semibold mb-0">
                      {companyData?.email || "N/A"}
                    </p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-3">
                    <small className="text-muted d-block">
                      <FontAwesomeIcon icon={faPhone} className="me-1" />
                      Phone
                    </small>
                    <p className="fw-semibold mb-0">
                      {companyData?.phoneNumber || "N/A"}
                    </p>
                  </div>
                  <div className="mb-3">
                    <small className="text-muted d-block">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="me-1" />
                      Address
                    </small>
                    <p className="fw-semibold mb-0">
                      {companyData?.address
                        ? `${companyData.address}, ${companyData.city}, ${companyData.state} - ${companyData.pincode}`
                        : "Not Provided"}
                    </p>
                  </div>
                  <div className="mb-3">
                    <small className="text-muted d-block">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                      Created Date
                    </small>
                    <p className="fw-semibold mb-0">
                      {companyData?.createdAt
                        ? new Date(companyData.createdAt).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div className="mb-3">
                    <small className="text-muted d-block">Status</small>
                    <div>{getStatusBadge(stats.activeStatus)}</div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-light border-0">
              <h6 className="mb-0 fw-bold">
                <FontAwesomeIcon
                  icon={faChartLine}
                  className="me-2 text-success"
                />
                Performance
              </h6>
            </Card.Header>
            <Card.Body>
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <small className="text-muted">Monthly Growth</small>
                  <Badge bg="success">+{stats.monthlyGrowth}%</Badge>
                </div>
                <ProgressBar
                  variant="success"
                  now={stats.monthlyGrowth}
                  max={20}
                  style={{height: "8px"}}
                />
              </div>
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <small className="text-muted">Revenue Target</small>
                  <Badge bg="info">78%</Badge>
                </div>
                <ProgressBar variant="info" now={78} style={{height: "8px"}} />
              </div>
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <small className="text-muted">Client Satisfaction</small>
                  <Badge bg="warning">92%</Badge>
                </div>
                <ProgressBar
                  variant="warning"
                  now={92}
                  style={{height: "8px"}}
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

const CompanyInvoices = ({companyId, addToast}) => {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, [companyId]);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      // Mock data - replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockInvoices = [
        {
          id: "INV001",
          customerName: "ABC Corp",
          amount: 15600,
          status: "paid",
          date: "2024-12-20",
          dueDate: "2024-12-30",
        },
        {
          id: "INV002",
          customerName: "XYZ Ltd",
          amount: 8900,
          status: "pending",
          date: "2024-12-18",
          dueDate: "2024-12-28",
        },
        {
          id: "INV003",
          customerName: "PQR Inc",
          amount: 12300,
          status: "overdue",
          date: "2024-12-15",
          dueDate: "2024-12-25",
        },
      ];

      setInvoices(mockInvoices);
    } catch (error) {
      addToast("Error loading invoices", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      paid: "success",
      pending: "warning",
      overdue: "danger",
      draft: "secondary",
    };
    return (
      <Badge bg={variants[status] || "secondary"}>
        {status?.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading invoices...</p>
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-light border-0">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-bold">
            <FontAwesomeIcon
              icon={faFileInvoice}
              className="me-2 text-primary"
            />
            Company Invoices ({invoices.length})
          </h6>
          <Button variant="primary" size="sm">
            <FontAwesomeIcon icon={faFileInvoice} className="me-1" />
            New Invoice
          </Button>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        {invoices.length > 0 ? (
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Invoice ID</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="fw-semibold">{invoice.id}</td>
                    <td>{invoice.customerName}</td>
                    <td className="fw-semibold">
                      ₹{invoice.amount.toLocaleString()}
                    </td>
                    <td>{new Date(invoice.date).toLocaleDateString()}</td>
                    <td>{new Date(invoice.dueDate).toLocaleDateString()}</td>
                    <td>{getStatusBadge(invoice.status)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-5">
            <FontAwesomeIcon
              icon={faFileInvoice}
              className="fs-1 text-muted mb-3"
            />
            <h6 className="text-muted">No invoices found</h6>
            <p className="text-muted">
              This company hasn't created any invoices yet.
            </p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

const CompanyParties = ({companyId, addToast}) => {
  const [parties, setParties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadParties();
  }, [companyId]);

  const loadParties = async () => {
    try {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockParties = [
        {
          id: "P001",
          name: "Supplier ABC",
          type: "supplier",
          phone: "+91 9876543210",
          email: "contact@supplierabc.com",
          balance: 25000,
          lastTransaction: "2024-12-20",
        },
        {
          id: "P002",
          name: "Customer XYZ",
          type: "customer",
          phone: "+91 8765432109",
          email: "xyz@customer.com",
          balance: -15000,
          lastTransaction: "2024-12-18",
        },
      ];

      setParties(mockParties);
    } catch (error) {
      addToast("Error loading parties", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeBadge = (type) => {
    const variants = {
      customer: "primary",
      supplier: "success",
      vendor: "info",
    };
    return (
      <Badge bg={variants[type] || "secondary"}>{type?.toUpperCase()}</Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading parties...</p>
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-light border-0">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-bold">
            <FontAwesomeIcon icon={faHandshake} className="me-2 text-info" />
            Business Parties ({parties.length})
          </h6>
          <Button variant="info" size="sm">
            <FontAwesomeIcon icon={faUsers} className="me-1" />
            Add Party
          </Button>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        {parties.length > 0 ? (
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Party Name</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>Balance</th>
                  <th>Last Transaction</th>
                </tr>
              </thead>
              <tbody>
                {parties.map((party) => (
                  <tr key={party.id}>
                    <td className="fw-semibold">{party.name}</td>
                    <td>{getTypeBadge(party.type)}</td>
                    <td>
                      <div>
                        <div>{party.phone}</div>
                        <small className="text-muted">{party.email}</small>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`fw-semibold ${
                          party.balance >= 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        ₹{Math.abs(party.balance).toLocaleString()}
                        {party.balance < 0 && " (Due)"}
                      </span>
                    </td>
                    <td>
                      {new Date(party.lastTransaction).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-5">
            <FontAwesomeIcon
              icon={faHandshake}
              className="fs-1 text-muted mb-3"
            />
            <h6 className="text-muted">No parties found</h6>
            <p className="text-muted">
              This company hasn't added any business parties yet.
            </p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

const CompanyTransactions = ({companyId, addToast}) => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [companyId]);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockTransactions = [
        {
          id: "TXN001",
          type: "sale",
          description: "Payment received from ABC Corp",
          amount: 15600,
          date: "2024-12-20",
          status: "completed",
        },
        {
          id: "TXN002",
          type: "purchase",
          description: "Payment to Supplier XYZ",
          amount: -8900,
          date: "2024-12-18",
          status: "completed",
        },
        {
          id: "TXN003",
          type: "expense",
          description: "Office rent payment",
          amount: -12000,
          date: "2024-12-15",
          status: "pending",
        },
      ];

      setTransactions(mockTransactions);
    } catch (error) {
      addToast("Error loading transactions", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeBadge = (type) => {
    const variants = {
      sale: "success",
      purchase: "primary",
      expense: "warning",
      income: "info",
    };
    return (
      <Badge bg={variants[type] || "secondary"}>{type?.toUpperCase()}</Badge>
    );
  };

  const getStatusBadge = (status) => {
    const variants = {
      completed: "success",
      pending: "warning",
      failed: "danger",
    };
    return (
      <Badge bg={variants[status] || "secondary"}>
        {status?.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading transactions...</p>
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-light border-0">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-bold">
            <FontAwesomeIcon
              icon={faExchangeAlt}
              className="me-2 text-success"
            />
            Recent Transactions ({transactions.length})
          </h6>
          <Button variant="success" size="sm">
            <FontAwesomeIcon icon={faExchangeAlt} className="me-1" />
            View All
          </Button>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        {transactions.length > 0 ? (
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Transaction ID</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td className="fw-semibold">{txn.id}</td>
                    <td>{getTypeBadge(txn.type)}</td>
                    <td>{txn.description}</td>
                    <td>
                      <span
                        className={`fw-semibold ${
                          txn.amount >= 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        {txn.amount >= 0 ? "+" : ""}₹
                        {Math.abs(txn.amount).toLocaleString()}
                      </span>
                    </td>
                    <td>{new Date(txn.date).toLocaleDateString()}</td>
                    <td>{getStatusBadge(txn.status)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-5">
            <FontAwesomeIcon
              icon={faExchangeAlt}
              className="fs-1 text-muted mb-3"
            />
            <h6 className="text-muted">No transactions found</h6>
            <p className="text-muted">
              This company hasn't made any transactions yet.
            </p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

const CompanyOrders = ({companyId, addToast}) => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [companyId]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockOrders = [
        {
          id: "ORD001",
          type: "sales",
          customerName: "ABC Corp",
          items: 5,
          amount: 25600,
          status: "delivered",
          date: "2024-12-20",
        },
        {
          id: "ORD002",
          type: "purchase",
          supplierName: "XYZ Suppliers",
          items: 12,
          amount: 18900,
          status: "pending",
          date: "2024-12-18",
        },
      ];

      setOrders(mockOrders);
    } catch (error) {
      addToast("Error loading orders", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeBadge = (type) => {
    const variants = {
      sales: "primary",
      purchase: "success",
    };
    return (
      <Badge bg={variants[type] || "secondary"}>{type?.toUpperCase()}</Badge>
    );
  };

  const getStatusBadge = (status) => {
    const variants = {
      delivered: "success",
      pending: "warning",
      cancelled: "danger",
      processing: "info",
    };
    return (
      <Badge bg={variants[status] || "secondary"}>
        {status?.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading orders...</p>
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-light border-0">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-bold">
            <FontAwesomeIcon
              icon={faShoppingCart}
              className="me-2 text-warning"
            />
            Company Orders ({orders.length})
          </h6>
          <Button variant="warning" size="sm">
            <FontAwesomeIcon icon={faShoppingCart} className="me-1" />
            New Order
          </Button>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        {orders.length > 0 ? (
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Order ID</th>
                  <th>Type</th>
                  <th>Party</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="fw-semibold">{order.id}</td>
                    <td>{getTypeBadge(order.type)}</td>
                    <td>{order.customerName || order.supplierName}</td>
                    <td>{order.items} items</td>
                    <td className="fw-semibold">
                      ₹{order.amount.toLocaleString()}
                    </td>
                    <td>{new Date(order.date).toLocaleDateString()}</td>
                    <td>{getStatusBadge(order.status)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-5">
            <FontAwesomeIcon
              icon={faShoppingCart}
              className="fs-1 text-muted mb-3"
            />
            <h6 className="text-muted">No orders found</h6>
            <p className="text-muted">
              This company hasn't created any orders yet.
            </p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

// Main CompanyDetail Component
function CompanyDetail({userId, companyId, section, userData, addToast}) {
  const navigate = useNavigate();
  const [companyData, setCompanyData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCompanyData();
  }, [companyId]);

  const loadCompanyData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Mock company data - replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockCompanyData = {
        id: companyId,
        businessName: "Tech Solutions Pvt Ltd",
        businessType: "Technology",
        email: "contact@techsolutions.com",
        phoneNumber: "+91 9876543210",
        address: "123 Business Park",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        gstNumber: "27ABCDE1234F1Z5",
        status: "active",
        createdAt: "2024-01-15T10:00:00Z",
      };

      setCompanyData(mockCompanyData);
    } catch (error) {
      setError(error.message);
      addToast("Error loading company data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (key) => {
    navigate(`/admin/users/${userId}/companies/${companyId}/${key}`);
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" size="lg" />
        <h5 className="mt-3 text-muted">Loading company details...</h5>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="text-center">
        <FontAwesomeIcon icon={faExclamationTriangle} className="fs-1 mb-3" />
        <Alert.Heading>Error Loading Company Data</Alert.Heading>
        <p>{error}</p>
        <Button variant="danger" onClick={loadCompanyData}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Container fluid>
      {/* Company Header */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-gradient-primary text-white border-0">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <div
                className="rounded-circle bg-white bg-opacity-20 d-inline-flex align-items-center justify-content-center me-3"
                style={{width: "50px", height: "50px"}}
              >
                <FontAwesomeIcon
                  icon={faBuilding}
                  className="fs-4 text-white"
                />
              </div>
              <div>
                <h4 className="mb-1 fw-bold">{companyData?.businessName}</h4>
                <p className="mb-0 opacity-75">
                  <FontAwesomeIcon icon={faUsers} className="me-1" />
                  Owner: {userData?.name} • {companyData?.businessType}
                </p>
              </div>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="light"
                size="sm"
                onClick={() => navigate(`/admin/users/${userId}/companies`)}
              >
                <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
                Back to Companies
              </Button>
            </div>
          </div>
        </Card.Header>
      </Card>

      {/* Tab Navigation */}
      <Tab.Container
        activeKey={section || "dashboard"}
        onSelect={handleTabChange}
      >
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-light border-0">
            <Nav variant="tabs" className="border-0">
              <Nav.Item>
                <Nav.Link eventKey="dashboard" className="fw-semibold">
                  <FontAwesomeIcon icon={faTachometerAlt} className="me-2" />
                  Dashboard
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="invoices" className="fw-semibold">
                  <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                  Invoices
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="parties" className="fw-semibold">
                  <FontAwesomeIcon icon={faHandshake} className="me-2" />
                  Parties
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="transactions" className="fw-semibold">
                  <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
                  Transactions
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="orders" className="fw-semibold">
                  <FontAwesomeIcon icon={faShoppingCart} className="me-2" />
                  Orders
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Card.Header>
          <Card.Body>
            <Tab.Content>
              <Tab.Pane eventKey="dashboard">
                <CompanyDashboard
                  companyData={companyData}
                  userData={userData}
                  addToast={addToast}
                />
              </Tab.Pane>
              <Tab.Pane eventKey="invoices">
                <CompanyInvoices companyId={companyId} addToast={addToast} />
              </Tab.Pane>
              <Tab.Pane eventKey="parties">
                <CompanyParties companyId={companyId} addToast={addToast} />
              </Tab.Pane>
              <Tab.Pane eventKey="transactions">
                <CompanyTransactions
                  companyId={companyId}
                  addToast={addToast}
                />
              </Tab.Pane>
              <Tab.Pane eventKey="orders">
                <CompanyOrders companyId={companyId} addToast={addToast} />
              </Tab.Pane>
            </Tab.Content>
          </Card.Body>
        </Card>
      </Tab.Container>

      <style>{`
        .bg-gradient-primary {
          background: linear-gradient(135deg, #0d6efd 0%, #0056b3 100%);
        }

        .nav-tabs .nav-link {
          border: none;
          border-bottom: 3px solid transparent;
          color: #6c757d;
          font-weight: 500;
        }

        .nav-tabs .nav-link.active {
          background-color: transparent;
          border-bottom-color: #0d6efd;
          color: #0d6efd;
        }

        .nav-tabs .nav-link:hover {
          border-bottom-color: #0d6efd;
          color: #0d6efd;
        }
      `}</style>
    </Container>
  );
}

export default CompanyDetail;
