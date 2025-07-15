import {useState, useEffect} from "react";
import {
  Tab,
  Tabs,
  Card,
  Row,
  Col,
  Form,
  InputGroup,
  Button,
  Table,
  Badge,
  Alert,
  Spinner,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faPlay,
  faCalendarAlt,
  faSearch,
  faFilter,
  faPrint,
  faFileExport,
  faEye,
  faEdit,
  faMoneyBillWave,
  faHandHoldingUsd,
  faExclamationTriangle,
  faCheckCircle,
  faClock,
  faPhone,
  faEnvelope,
  faFileInvoice,
  faBuilding,
  faUser,
  faArrowUp,
  faArrowDown,
  faRupeeSign,
  faChartLine,
  faArrowTrendUp,
  faArrowTrendDown,
} from "@fortawesome/free-solid-svg-icons";
import "./DayBook.css";

// Import services
import salesService from "../../services/salesService";
import purchaseService from "../../services/purchaseService";
import paymentService from "../../services/paymentService";

function DayBook({
  companyId,
  currentCompany,
  currentUser,
  addToast,
  onNavigate,
}) {
  // State management
  const [activeTab, setActiveTab] = useState("receivables");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Financial data states
  const [receivables, setReceivables] = useState([]);
  const [payables, setPayables] = useState([]);
  const [summaryData, setSummaryData] = useState({
    totalReceivables: 0,
    totalPayables: 0,
    overdueReceivables: 0,
    overduePayables: 0,
    dueTodayReceivables: 0,
    dueTodayPayables: 0,
    netPosition: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [bankBalances, setBankBalances] = useState([]);

  // Load data on component mount and date change
  useEffect(() => {
    if (companyId) {
      loadDayBookData();
    }
  }, [companyId, date]);

  // ✅ Enhanced data loading function
  const loadDayBookData = async () => {
    try {
      setLoading(true);
      const today = new Date(date);
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      // Load receivables, payables, and summary data in parallel
      const [receivablesData, payablesData, paymentsData, bankData] =
        await Promise.all([
          loadReceivables(),
          loadPayables(),
          loadDailyTransactions(startOfDay, endOfDay),
          loadBankBalances(),
        ]);

      // Calculate summary
      calculateSummary(receivablesData, payablesData);
    } catch (error) {
      console.error("Error loading day book data:", error);
      addToast?.("Failed to load day book data", "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Load receivables (money to receive from customers)
  const loadReceivables = async () => {
    try {
      const response = await salesService.getOverdueSales(companyId);
      const dueTodayResponse = await salesService.getSalesDueToday(companyId);

      let allReceivables = [];

      // Add overdue sales
      if (response?.success && response.data) {
        allReceivables = [
          ...allReceivables,
          ...response.data.map((sale) => ({
            ...sale,
            type: "overdue",
            priority: "high",
          })),
        ];
      }

      // Add sales due today
      if (dueTodayResponse?.success && dueTodayResponse.data) {
        allReceivables = [
          ...allReceivables,
          ...dueTodayResponse.data.map((sale) => ({
            ...sale,
            type: "due_today",
            priority: "medium",
          })),
        ];
      }

      // Get all pending sales
      const pendingResponse = await salesService.getSales(companyId, {
        paymentStatus: "pending,partial",
        limit: 100,
      });

      if (pendingResponse?.success && pendingResponse.data) {
        const pendingSales = pendingResponse.data
          .filter(
            (sale) =>
              !allReceivables.some((existing) => existing._id === sale._id)
          )
          .map((sale) => ({
            ...sale,
            type: "pending",
            priority: "low",
          }));

        allReceivables = [...allReceivables, ...pendingSales];
      }

      setReceivables(allReceivables);
      return allReceivables;
    } catch (error) {
      console.error("Error loading receivables:", error);
      setReceivables([]);
      return [];
    }
  };

  // ✅ Load payables (money to pay to suppliers)
  const loadPayables = async () => {
    try {
      const response = await purchaseService.getOverduePurchases(companyId);
      const dueTodayResponse = await purchaseService.getPurchasesDueToday(
        companyId
      );

      let allPayables = [];

      // Add overdue purchases
      if (response?.success && response.data) {
        allPayables = [
          ...allPayables,
          ...response.data.map((purchase) => ({
            ...purchase,
            type: "overdue",
            priority: "high",
          })),
        ];
      }

      // Add purchases due today
      if (dueTodayResponse?.success && dueTodayResponse.data) {
        allPayables = [
          ...allPayables,
          ...dueTodayResponse.data.map((purchase) => ({
            ...purchase,
            type: "due_today",
            priority: "medium",
          })),
        ];
      }

      // Get all pending purchases
      const pendingResponse = await purchaseService.getPurchases(companyId, {
        paymentStatus: "pending,partial",
        limit: 100,
      });

      if (pendingResponse?.success && pendingResponse.data) {
        const pendingPurchases = pendingResponse.data
          .filter(
            (purchase) =>
              !allPayables.some((existing) => existing._id === purchase._id)
          )
          .map((purchase) => ({
            ...purchase,
            type: "pending",
            priority: "low",
          }));

        allPayables = [...allPayables, ...pendingPurchases];
      }

      setPayables(allPayables);
      return allPayables;
    } catch (error) {
      console.error("Error loading payables:", error);
      setPayables([]);
      return [];
    }
  };

  // ✅ Load daily transactions
  const loadDailyTransactions = async (startDate, endDate) => {
    try {
      const response = await paymentService.getPayments(companyId, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      if (response?.success && response.data) {
        setTransactions(response.data);
        return response.data;
      }

      setTransactions([]);
      return [];
    } catch (error) {
      console.error("Error loading transactions:", error);
      setTransactions([]);
      return [];
    }
  };

  // ✅ Load bank balances
  const loadBankBalances = async () => {
    try {
      const response = await paymentService.getBankAccounts(companyId);

      if (response?.success && response.data) {
        setBankBalances(response.data);
        return response.data;
      }

      setBankBalances([]);
      return [];
    } catch (error) {
      console.error("Error loading bank balances:", error);
      setBankBalances([]);
      return [];
    }
  };

  // ✅ Calculate summary data
  const calculateSummary = (
    receivablesData = receivables,
    payablesData = payables
  ) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const summary = {
      totalReceivables: 0,
      totalPayables: 0,
      overdueReceivables: 0,
      overduePayables: 0,
      dueTodayReceivables: 0,
      dueTodayPayables: 0,
      netPosition: 0,
    };

    // Calculate receivables
    receivablesData.forEach((sale) => {
      const pendingAmount = sale.payment?.pendingAmount || 0;
      summary.totalReceivables += pendingAmount;

      if (sale.type === "overdue") {
        summary.overdueReceivables += pendingAmount;
      } else if (sale.type === "due_today") {
        summary.dueTodayReceivables += pendingAmount;
      }
    });

    // Calculate payables
    payablesData.forEach((purchase) => {
      const pendingAmount =
        purchase.payment?.pendingAmount || purchase.pendingAmount || 0;
      summary.totalPayables += pendingAmount;

      if (purchase.type === "overdue") {
        summary.overduePayables += pendingAmount;
      } else if (purchase.type === "due_today") {
        summary.dueTodayPayables += pendingAmount;
      }
    });

    // Calculate net position (positive = more to receive, negative = more to pay)
    summary.netPosition = summary.totalReceivables - summary.totalPayables;

    setSummaryData(summary);
  };

  // ✅ Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDayBookData();
    setRefreshing(false);
    addToast?.("Day book data refreshed successfully", "success");
  };

  // ✅ Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // ✅ Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  };

  // ✅ Get priority badge
  const getPriorityBadge = (type) => {
    switch (type) {
      case "overdue":
        return (
          <Badge bg="danger" className="me-2">
            Overdue
          </Badge>
        );
      case "due_today":
        return (
          <Badge bg="warning" className="me-2">
            Due Today
          </Badge>
        );
      case "pending":
        return (
          <Badge bg="secondary" className="me-2">
            Pending
          </Badge>
        );
      default:
        return null;
    }
  };

  // ✅ Handle contact actions
  const handleContact = (party, method) => {
    if (method === "phone" && party.mobile) {
      window.open(`tel:${party.mobile}`);
    } else if (method === "email" && party.email) {
      window.open(`mailto:${party.email}`);
    }
  };

  // ✅ Handle payment actions
  const handleReceivePayment = (sale) => {
    onNavigate?.("paymentIn", {invoiceId: sale._id});
  };

  const handleMakePayment = (purchase) => {
    onNavigate?.("paymentOut", {invoiceId: purchase._id});
  };

  // ✅ Filter data based on search
  const filterData = (data) => {
    if (!searchQuery) return data;

    return data.filter(
      (item) =>
        item.customer?.name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        item.supplier?.name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        item.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.purchaseNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // ✅ Render receivables tab
  const renderReceivables = () => {
    const filteredReceivables = filterData(receivables);
    const sortedReceivables = filteredReceivables.sort((a, b) => {
      // Sort by priority: overdue > due_today > pending
      const priorityOrder = {overdue: 0, due_today: 1, pending: 2};
      return priorityOrder[a.type] - priorityOrder[b.type];
    });

    return (
      <div>
        {/* Receivables Summary Cards */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="summary-card border-success">
              <Card.Body className="text-center">
                <FontAwesomeIcon
                  icon={faMoneyBillWave}
                  size="2x"
                  className="text-success mb-2"
                />
                <h4 className="mb-1 text-success">
                  {formatCurrency(summaryData.totalReceivables)}
                </h4>
                <p className="text-muted mb-0">Total to Receive</p>
                <small className="text-muted">
                  {receivables.length} invoices
                </small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="summary-card border-danger">
              <Card.Body className="text-center">
                <FontAwesomeIcon
                  icon={faExclamationTriangle}
                  size="2x"
                  className="text-danger mb-2"
                />
                <h4 className="mb-1 text-danger">
                  {formatCurrency(summaryData.overdueReceivables)}
                </h4>
                <p className="text-muted mb-0">Overdue Amount</p>
                <small className="text-muted">
                  {receivables.filter((r) => r.type === "overdue").length}{" "}
                  overdue
                </small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="summary-card border-warning">
              <Card.Body className="text-center">
                <FontAwesomeIcon
                  icon={faClock}
                  size="2x"
                  className="text-warning mb-2"
                />
                <h4 className="mb-1 text-warning">
                  {formatCurrency(summaryData.dueTodayReceivables)}
                </h4>
                <p className="text-muted mb-0">Due Today</p>
                <small className="text-muted">
                  {receivables.filter((r) => r.type === "due_today").length} due
                  today
                </small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="summary-card border-primary">
              <Card.Body className="text-center">
                <FontAwesomeIcon
                  icon={
                    summaryData.netPosition >= 0
                      ? faArrowTrendUp
                      : faArrowTrendDown
                  }
                  size="2x"
                  className={`mb-2 ${
                    summaryData.netPosition >= 0
                      ? "text-success"
                      : "text-danger"
                  }`}
                />
                <h4
                  className={`mb-1 ${
                    summaryData.netPosition >= 0
                      ? "text-success"
                      : "text-danger"
                  }`}
                >
                  {formatCurrency(Math.abs(summaryData.netPosition))}
                </h4>
                <p className="text-muted mb-0">Net Position</p>
                <small className="text-muted">
                  {summaryData.netPosition >= 0
                    ? "Net Receivable"
                    : "Net Payable"}
                </small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Receivables Table */}
        <div className="table-responsive">
          <Table hover className="transaction-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Due Date</th>
                <th className="text-end">Amount Due</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    <Spinner animation="border" size="sm" className="me-2" />
                    Loading receivables...
                  </td>
                </tr>
              ) : sortedReceivables.length > 0 ? (
                sortedReceivables.map((sale) => (
                  <tr
                    key={sale._id}
                    className={sale.type === "overdue" ? "table-danger" : ""}
                  >
                    <td>{getPriorityBadge(sale.type)}</td>
                    <td>
                      <div>
                        <strong>{sale.invoiceNumber}</strong>
                        <br />
                        <small className="text-muted">
                          Total: {formatCurrency(sale.totals?.finalTotal || 0)}
                        </small>
                      </div>
                    </td>
                    <td>
                      <div>
                        <FontAwesomeIcon
                          icon={faUser}
                          className="me-2 text-primary"
                        />
                        <strong>{sale.customer?.name || "Unknown"}</strong>
                        {sale.customer?.mobile && (
                          <div>
                            <small className="text-muted">
                              {sale.customer.mobile}
                            </small>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{formatDate(sale.invoiceDate)}</td>
                    <td>
                      <span
                        className={
                          sale.type === "overdue" ? "text-danger fw-bold" : ""
                        }
                      >
                        {formatDate(sale.payment?.dueDate)}
                      </span>
                    </td>
                    <td className="text-end">
                      <strong className="text-success">
                        {formatCurrency(sale.payment?.pendingAmount || 0)}
                      </strong>
                    </td>
                    <td className="text-center">
                      <div className="btn-group-sm">
                        <Button
                          variant="success"
                          size="sm"
                          className="me-1"
                          onClick={() => handleReceivePayment(sale)}
                          title="Receive Payment"
                        >
                          <FontAwesomeIcon icon={faMoneyBillWave} />
                        </Button>
                        {sale.customer?.mobile && (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-1"
                            onClick={() =>
                              handleContact(sale.customer, "phone")
                            }
                            title="Call Customer"
                          >
                            <FontAwesomeIcon icon={faPhone} />
                          </Button>
                        )}
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() =>
                            onNavigate?.("salesInvoice", {id: sale._id})
                          }
                          title="View Invoice"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    <FontAwesomeIcon
                      icon={faCheckCircle}
                      size="2x"
                      className="mb-2 text-success"
                    />
                    <br />
                    No receivables found. All payments are up to date!
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
    );
  };

  // ✅ Render payables tab
  const renderPayables = () => {
    const filteredPayables = filterData(payables);
    const sortedPayables = filteredPayables.sort((a, b) => {
      const priorityOrder = {overdue: 0, due_today: 1, pending: 2};
      return priorityOrder[a.type] - priorityOrder[b.type];
    });

    return (
      <div>
        {/* Payables Summary Cards */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="summary-card border-primary">
              <Card.Body className="text-center">
                <FontAwesomeIcon
                  icon={faHandHoldingUsd}
                  size="2x"
                  className="text-primary mb-2"
                />
                <h4 className="mb-1 text-primary">
                  {formatCurrency(summaryData.totalPayables)}
                </h4>
                <p className="text-muted mb-0">Total to Pay</p>
                <small className="text-muted">{payables.length} bills</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="summary-card border-danger">
              <Card.Body className="text-center">
                <FontAwesomeIcon
                  icon={faExclamationTriangle}
                  size="2x"
                  className="text-danger mb-2"
                />
                <h4 className="mb-1 text-danger">
                  {formatCurrency(summaryData.overduePayables)}
                </h4>
                <p className="text-muted mb-0">Overdue Amount</p>
                <small className="text-muted">
                  {payables.filter((p) => p.type === "overdue").length} overdue
                </small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="summary-card border-warning">
              <Card.Body className="text-center">
                <FontAwesomeIcon
                  icon={faClock}
                  size="2x"
                  className="text-warning mb-2"
                />
                <h4 className="mb-1 text-warning">
                  {formatCurrency(summaryData.dueTodayPayables)}
                </h4>
                <p className="text-muted mb-0">Due Today</p>
                <small className="text-muted">
                  {payables.filter((p) => p.type === "due_today").length} due
                  today
                </small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="summary-card border-info">
              <Card.Body className="text-center">
                <FontAwesomeIcon
                  icon={faChartLine}
                  size="2x"
                  className="text-info mb-2"
                />
                <h4 className="mb-1 text-info">
                  {payables.length > 0
                    ? formatCurrency(
                        summaryData.totalPayables / payables.length
                      )
                    : formatCurrency(0)}
                </h4>
                <p className="text-muted mb-0">Average Bill</p>
                <small className="text-muted">Per invoice</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Payables Table */}
        <div className="table-responsive">
          <Table hover className="transaction-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Bill/Invoice</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Due Date</th>
                <th className="text-end">Amount Due</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    <Spinner animation="border" size="sm" className="me-2" />
                    Loading payables...
                  </td>
                </tr>
              ) : sortedPayables.length > 0 ? (
                sortedPayables.map((purchase) => (
                  <tr
                    key={purchase._id}
                    className={
                      purchase.type === "overdue" ? "table-danger" : ""
                    }
                  >
                    <td>{getPriorityBadge(purchase.type)}</td>
                    <td>
                      <div>
                        <strong>
                          {purchase.purchaseNumber || purchase.invoiceNumber}
                        </strong>
                        <br />
                        <small className="text-muted">
                          Total:{" "}
                          {formatCurrency(
                            purchase.totals?.finalTotal ||
                              purchase.totalAmount ||
                              0
                          )}
                        </small>
                      </div>
                    </td>
                    <td>
                      <div>
                        <FontAwesomeIcon
                          icon={faBuilding}
                          className="me-2 text-primary"
                        />
                        <strong>{purchase.supplier?.name || "Unknown"}</strong>
                        {purchase.supplier?.mobile && (
                          <div>
                            <small className="text-muted">
                              {purchase.supplier.mobile}
                            </small>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {formatDate(
                        purchase.purchaseDate || purchase.invoiceDate
                      )}
                    </td>
                    <td>
                      <span
                        className={
                          purchase.type === "overdue"
                            ? "text-danger fw-bold"
                            : ""
                        }
                      >
                        {formatDate(
                          purchase.payment?.dueDate || purchase.dueDate
                        )}
                      </span>
                    </td>
                    <td className="text-end">
                      <strong className="text-primary">
                        {formatCurrency(
                          purchase.payment?.pendingAmount ||
                            purchase.pendingAmount ||
                            0
                        )}
                      </strong>
                    </td>
                    <td className="text-center">
                      <div className="btn-group-sm">
                        <Button
                          variant="primary"
                          size="sm"
                          className="me-1"
                          onClick={() => handleMakePayment(purchase)}
                          title="Make Payment"
                        >
                          <FontAwesomeIcon icon={faHandHoldingUsd} />
                        </Button>
                        {purchase.supplier?.mobile && (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-1"
                            onClick={() =>
                              handleContact(purchase.supplier, "phone")
                            }
                            title="Call Supplier"
                          >
                            <FontAwesomeIcon icon={faPhone} />
                          </Button>
                        )}
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() =>
                            onNavigate?.("purchaseInvoice", {id: purchase._id})
                          }
                          title="View Bill"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    <FontAwesomeIcon
                      icon={faCheckCircle}
                      size="2x"
                      className="mb-2 text-success"
                    />
                    <br />
                    No payables found. All bills are paid!
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
    );
  };

  // ✅ Render daily transactions tab
  const renderDailyTransactions = () => (
    <div>
      <Row className="mb-4">
        <Col md={4}>
          <Card className="summary-card border-success">
            <Card.Body className="text-center">
              <FontAwesomeIcon
                icon={faArrowDown}
                size="2x"
                className="text-success mb-2"
              />
              <h4 className="mb-1 text-success">
                {formatCurrency(
                  transactions
                    .filter((t) => t.type === "payment_in")
                    .reduce((sum, t) => sum + (t.amount || 0), 0)
                )}
              </h4>
              <p className="text-muted mb-0">Money Received</p>
              <small className="text-muted">
                {transactions.filter((t) => t.type === "payment_in").length}{" "}
                transactions
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="summary-card border-danger">
            <Card.Body className="text-center">
              <FontAwesomeIcon
                icon={faArrowUp}
                size="2x"
                className="text-danger mb-2"
              />
              <h4 className="mb-1 text-danger">
                {formatCurrency(
                  transactions
                    .filter((t) => t.type === "payment_out")
                    .reduce((sum, t) => sum + (t.amount || 0), 0)
                )}
              </h4>
              <p className="text-muted mb-0">Money Paid</p>
              <small className="text-muted">
                {transactions.filter((t) => t.type === "payment_out").length}{" "}
                transactions
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="summary-card border-primary">
            <Card.Body className="text-center">
              <FontAwesomeIcon
                icon={faRupeeSign}
                size="2x"
                className="text-primary mb-2"
              />
              <h4 className="mb-1 text-primary">
                {formatCurrency(
                  transactions
                    .filter((t) => t.type === "payment_in")
                    .reduce((sum, t) => sum + (t.amount || 0), 0) -
                    transactions
                      .filter((t) => t.type === "payment_out")
                      .reduce((sum, t) => sum + (t.amount || 0), 0)
                )}
              </h4>
              <p className="text-muted mb-0">Net Cash Flow</p>
              <small className="text-muted">For {formatDate(date)}</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <div className="table-responsive">
        <Table hover className="transaction-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>Party</th>
              <th>Method</th>
              <th>Reference</th>
              <th className="text-end">Amount</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-4">
                  <Spinner animation="border" size="sm" className="me-2" />
                  Loading transactions...
                </td>
              </tr>
            ) : transactions.length > 0 ? (
              transactions.map((transaction) => (
                <tr key={transaction._id}>
                  <td>
                    {new Date(transaction.paymentDate).toLocaleTimeString(
                      "en-IN",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </td>
                  <td>
                    <Badge
                      bg={
                        transaction.type === "payment_in" ? "success" : "danger"
                      }
                      className="me-1"
                    >
                      {transaction.type === "payment_in"
                        ? "Money In"
                        : "Money Out"}
                    </Badge>
                  </td>
                  <td>
                    <strong>{transaction.partyName}</strong>
                  </td>
                  <td>
                    <Badge variant="secondary">
                      {transaction.paymentMethod || "Cash"}
                    </Badge>
                  </td>
                  <td>{transaction.reference || "N/A"}</td>
                  <td className="text-end">
                    <strong
                      className={
                        transaction.type === "payment_in"
                          ? "text-success"
                          : "text-danger"
                      }
                    >
                      {transaction.type === "payment_in" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </strong>
                  </td>
                  <td className="text-center">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() =>
                        onNavigate?.("paymentDetails", {id: transaction._id})
                      }
                      title="View Details"
                    >
                      <FontAwesomeIcon icon={faEye} />
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-4 text-muted">
                  No transactions found for {formatDate(date)}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );

  // ✅ Render cash & bank tab
  const renderCashBank = () => (
    <div>
      <Row className="mb-4">
        {bankBalances.map((account, index) => (
          <Col md={4} key={account._id || index}>
            <Card className="summary-card border-info">
              <Card.Body>
                <div className="d-flex align-items-center mb-2">
                  <FontAwesomeIcon
                    icon={faBuilding}
                    className="text-info me-2"
                  />
                  <h6 className="mb-0">{account.bankName}</h6>
                </div>
                <h4 className="mb-1 text-info">
                  {formatCurrency(
                    account.currentBalance || account.balance || 0
                  )}
                </h4>
                <p className="text-muted mb-1">{account.accountName}</p>
                <small className="text-muted">
                  A/C:{" "}
                  {account.accountNumber
                    ?.slice(-4)
                    .padStart(account.accountNumber?.length, "*")}
                </small>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {bankBalances.length === 0 && (
        <div className="text-center py-5">
          <FontAwesomeIcon
            icon={faBuilding}
            size="3x"
            className="text-muted mb-3"
          />
          <h5 className="text-muted">No bank accounts found</h5>
          <p className="text-muted">
            Add bank accounts to track your cash flow
          </p>
          <Button
            variant="primary"
            onClick={() => onNavigate?.("bankAccounts")}
          >
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Add Bank Account
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="container-fluid px-4">
      {/* Page Banner */}
      <div className="page-banner mb-4">
        <div className="banner-content">
          <div className="banner-icon">💼</div>
          <h5>Track your daily receivables, payables, and cash flow</h5>
          <button
            className="btn btn-light btn-sm ms-3"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? <Spinner size="sm" className="me-1" /> : "🔄"}
            Refresh
          </button>
        </div>
      </div>

      {/* Page Header */}
      <div className="page-header d-flex align-items-center justify-content-between mb-4">
        <div className="d-flex align-items-center">
          <h1 className="h3 mb-0 text-gray-800 fw-bold">Day Book</h1>
          <span className="video-badge ms-2">
            <FontAwesomeIcon icon={faPlay} className="text-primary" />
          </span>
        </div>

        <div className="d-flex align-items-center">
          {/* Date Picker */}
          <Form.Group className="me-3">
            <InputGroup>
              <Form.Control
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-control-sm"
              />
              <InputGroup.Text>
                <FontAwesomeIcon icon={faCalendarAlt} />
              </InputGroup.Text>
            </InputGroup>
          </Form.Group>

          {/* Search */}
          <InputGroup className="search-bar me-3" style={{width: "250px"}}>
            <Form.Control
              type="text"
              placeholder="Search parties, invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="sm"
            />
            <InputGroup.Text>
              <FontAwesomeIcon icon={faSearch} />
            </InputGroup.Text>
          </InputGroup>

          {/* Action Buttons */}
          <div className="d-flex">
            <Button variant="outline-secondary" size="sm" className="me-2">
              <FontAwesomeIcon icon={faPrint} className="me-2" />
              Print
            </Button>
            <Button variant="outline-secondary" size="sm" className="me-2">
              <FontAwesomeIcon icon={faFileExport} className="me-2" />
              Export
            </Button>
            <Button variant="primary" size="sm">
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              New Transaction
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-4 nav-tabs-custom"
          >
            <Tab
              eventKey="receivables"
              title={
                <span>
                  <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                  Receivables
                  {summaryData.totalReceivables > 0 && (
                    <Badge bg="success" className="ms-2">
                      {receivables.length}
                    </Badge>
                  )}
                </span>
              }
            >
              {renderReceivables()}
            </Tab>
            <Tab
              eventKey="payables"
              title={
                <span>
                  <FontAwesomeIcon icon={faHandHoldingUsd} className="me-2" />
                  Payables
                  {summaryData.totalPayables > 0 && (
                    <Badge bg="primary" className="ms-2">
                      {payables.length}
                    </Badge>
                  )}
                </span>
              }
            >
              {renderPayables()}
            </Tab>
            <Tab
              eventKey="transactions"
              title={
                <span>
                  <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                  Daily Transactions
                  {transactions.length > 0 && (
                    <Badge bg="info" className="ms-2">
                      {transactions.length}
                    </Badge>
                  )}
                </span>
              }
            >
              {renderDailyTransactions()}
            </Tab>
            <Tab
              eventKey="cashbank"
              title={
                <span>
                  <FontAwesomeIcon icon={faBuilding} className="me-2" />
                  Cash & Bank
                  {bankBalances.length > 0 && (
                    <Badge bg="secondary" className="ms-2">
                      {bankBalances.length}
                    </Badge>
                  )}
                </span>
              }
            >
              {renderCashBank()}
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </div>
  );
}

export default DayBook;
