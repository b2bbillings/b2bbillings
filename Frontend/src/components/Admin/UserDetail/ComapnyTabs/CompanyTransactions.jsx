import React, {useState, useEffect} from "react";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Badge,
  Form,
  InputGroup,
  Dropdown,
  Spinner,
  Tabs,
  Tab,
  Modal,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faExchangeAlt,
  faDownload,
  faSearch,
  faFilter,
  faPlus,
  faEllipsisV,
  faArrowUp,
  faArrowDown,
  faRupeeSign,
  faCalendarAlt,
  faCheckCircle,
  faClock,
  faTimesCircle,
  faSort,
  faEye,
  faEdit,
  faTrash,
  faPrint,
  faFileInvoice,
  faUser,
  faBank,
  faCreditCard,
  faMoneyBillWave,
} from "@fortawesome/free-solid-svg-icons";

// Import transaction service
import transactionService from "../../../../services/transactionService";

function CompanyTransactions({companyId, companyData, userRole, addToast}) {
  // ✅ State management
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("transactionDate");
  const [sortDirection, setSortDirection] = useState("desc");
  const [activeTab, setActiveTab] = useState("all");

  // ✅ Modal states
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // ✅ Stats state
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalInbound: 0,
    totalOutbound: 0,
    netAmount: 0,
    pendingTransactions: 0,
    completedTransactions: 0,
    failedTransactions: 0,
    cashTransactions: 0,
    bankTransactions: 0,
  });

  // ✅ Load data on component mount
  useEffect(() => {
    if (companyId) {
      loadCompanyTransactions();
    }
  }, [companyId]);

  // ✅ Apply filters when data or filters change
  useEffect(() => {
    filterAndSortTransactions();
  }, [
    transactions,
    searchQuery,
    typeFilter,
    statusFilter,
    methodFilter,
    dateFilter,
    sortBy,
    sortDirection,
    activeTab,
  ]);

  // ✅ Load real data from database
  const loadCompanyTransactions = async () => {
    try {
      setIsLoading(true);
      console.log("🔄 Loading company transactions for:", companyId);

      // Fetch transactions from the database
      const response = await transactionService.getTransactions(companyId, {
        limit: 1000,
        sortBy: "transactionDate",
        sortOrder: "desc",
        includeDetails: true,
      });

      if (response.success) {
        const transactionData = response.data.transactions || [];

        // ✅ Process and normalize transaction data
        const processedTransactions = transactionData.map((transaction) => ({
          ...transaction,
          id: transaction._id || transaction.id,
          displayId: transaction._id?.slice(-8) || "N/A",
          type: transaction.direction || transaction.transactionType || "other",
          method: transactionService.normalizePaymentMethodForFrontend(
            transaction.paymentMethod || "cash"
          ),
          amount: parseFloat(transaction.amount) || 0,
          description: transaction.description || "No description",
          status: transaction.status || "completed",
          date: transaction.transactionDate || transaction.createdAt,
          fromTo:
            transaction.partyName ||
            (transaction.direction === "in" ? "Customer" : "Supplier"),
          referenceId:
            transaction.referenceId || transaction.referenceNumber || "",
          notes: transaction.notes || "",
          bankAccount: transaction.bankAccountName || "",
          chequeNumber: transaction.chequeNumber || "",
          upiTransactionId: transaction.upiTransactionId || "",
          icon: getTransactionIcon(
            transaction.direction || transaction.transactionType
          ),
          colorClass: getTransactionColorClass(
            transaction.direction || transaction.transactionType
          ),
        }));

        setTransactions(processedTransactions);
        calculateStats(processedTransactions);

        addToast?.("Company transactions loaded successfully", "success");
      } else {
        console.error("❌ Failed to load transactions:", response.message);
        setTransactions([]);
        addToast?.(response.message || "Failed to load transactions", "error");
      }
    } catch (error) {
      console.error("❌ Error loading company transactions:", error);
      setTransactions([]);
      addToast?.("Error loading company transactions", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Calculate statistics
  const calculateStats = (transactionData) => {
    const totalTransactions = transactionData.length;

    const inboundTransactions = transactionData.filter(
      (t) => t.type === "in" || t.type === "payment_in" || t.type === "sale"
    );
    const outboundTransactions = transactionData.filter(
      (t) =>
        t.type === "out" || t.type === "payment_out" || t.type === "purchase"
    );

    const totalInbound = inboundTransactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );
    const totalOutbound = outboundTransactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );

    const pendingTransactions = transactionData.filter(
      (t) => t.status === "pending" || t.status === "processing"
    ).length;

    const completedTransactions = transactionData.filter(
      (t) => t.status === "completed" || t.status === "success"
    ).length;

    const failedTransactions = transactionData.filter(
      (t) => t.status === "failed" || t.status === "cancelled"
    ).length;

    const cashTransactions = transactionData.filter(
      (t) => t.method === "cash"
    ).length;
    const bankTransactions = transactionData.filter(
      (t) => t.method === "bank" || t.method === "bank_transfer"
    ).length;

    setStats({
      totalTransactions,
      totalInbound,
      totalOutbound,
      netAmount: totalInbound - totalOutbound,
      pendingTransactions,
      completedTransactions,
      failedTransactions,
      cashTransactions,
      bankTransactions,
    });
  };

  // ✅ Get transaction icon based on type
  const getTransactionIcon = (type) => {
    switch (type) {
      case "in":
      case "payment_in":
      case "sale":
        return faArrowDown;
      case "out":
      case "payment_out":
      case "purchase":
        return faArrowUp;
      default:
        return faExchangeAlt;
    }
  };

  // ✅ Get transaction color class based on type
  const getTransactionColorClass = (type) => {
    switch (type) {
      case "in":
      case "payment_in":
      case "sale":
        return "success";
      case "out":
      case "payment_out":
      case "purchase":
        return "danger";
      default:
        return "primary";
    }
  };

  // ✅ Filter and sort transactions
  const filterAndSortTransactions = () => {
    let filtered = [...transactions];

    // ✅ Apply tab filter
    switch (activeTab) {
      case "inbound":
        filtered = filtered.filter(
          (t) => t.type === "in" || t.type === "payment_in" || t.type === "sale"
        );
        break;
      case "outbound":
        filtered = filtered.filter(
          (t) =>
            t.type === "out" ||
            t.type === "payment_out" ||
            t.type === "purchase"
        );
        break;
      case "all":
      default:
        // Show all transactions
        break;
    }

    // ✅ Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (transaction) =>
          transaction.description?.toLowerCase().includes(query) ||
          transaction.referenceId?.toLowerCase().includes(query) ||
          transaction.fromTo?.toLowerCase().includes(query) ||
          transaction.displayId?.toLowerCase().includes(query) ||
          transaction.notes?.toLowerCase().includes(query)
      );
    }

    // ✅ Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((transaction) => {
        switch (typeFilter) {
          case "inbound":
            return (
              transaction.type === "in" ||
              transaction.type === "payment_in" ||
              transaction.type === "sale"
            );
          case "outbound":
            return (
              transaction.type === "out" ||
              transaction.type === "payment_out" ||
              transaction.type === "purchase"
            );
          default:
            return transaction.type === typeFilter;
        }
      });
    }

    // ✅ Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (transaction) => transaction.status === statusFilter
      );
    }

    // ✅ Apply method filter
    if (methodFilter !== "all") {
      filtered = filtered.filter(
        (transaction) => transaction.method === methodFilter
      );
    }

    // ✅ Apply date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      filtered = filtered.filter((transaction) => {
        const transactionDate = new Date(transaction.date);
        if (isNaN(transactionDate.getTime())) return false;

        switch (dateFilter) {
          case "today":
            return transactionDate >= startOfToday;
          case "week":
            const weekAgo = new Date(
              startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000
            );
            return transactionDate >= weekAgo;
          case "month":
            const monthAgo = new Date(
              startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000
            );
            return transactionDate >= monthAgo;
          case "quarter":
            const quarterAgo = new Date(
              startOfToday.getTime() - 90 * 24 * 60 * 60 * 1000
            );
            return transactionDate >= quarterAgo;
          case "year":
            const yearAgo = new Date(
              startOfToday.getTime() - 365 * 24 * 60 * 60 * 1000
            );
            return transactionDate >= yearAgo;
          default:
            return true;
        }
      });
    }

    // ✅ Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === "date" || sortBy === "transactionDate") {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      } else if (sortBy === "amount") {
        aValue = parseFloat(aValue || 0);
        bValue = parseFloat(bValue || 0);
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue?.toLowerCase() || "";
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredTransactions(filtered);
  };

  // ✅ Get status badge
  const getStatusBadge = (status) => {
    const variants = {
      completed: {bg: "success", icon: faCheckCircle, text: "Completed"},
      success: {bg: "success", icon: faCheckCircle, text: "Success"},
      pending: {bg: "warning", icon: faClock, text: "Pending"},
      processing: {bg: "info", icon: faClock, text: "Processing"},
      failed: {bg: "danger", icon: faTimesCircle, text: "Failed"},
      cancelled: {bg: "danger", icon: faTimesCircle, text: "Cancelled"},
    };

    const config = variants[status] || {
      bg: "secondary",
      icon: faClock,
      text: status?.toUpperCase() || "UNKNOWN",
    };

    return (
      <Badge bg={config.bg} className="d-flex align-items-center gap-1">
        <FontAwesomeIcon icon={config.icon} size="xs" />
        {config.text}
      </Badge>
    );
  };

  // ✅ Get method badge
  const getMethodBadge = (method) => {
    const methodConfig = {
      cash: {bg: "success", icon: faMoneyBillWave, text: "Cash"},
      bank: {bg: "primary", icon: faBank, text: "Bank Transfer"},
      bank_transfer: {bg: "primary", icon: faBank, text: "Bank Transfer"},
      upi: {bg: "info", icon: faCreditCard, text: "UPI"},
      card: {bg: "warning", icon: faCreditCard, text: "Card"},
      cheque: {bg: "secondary", icon: faFileInvoice, text: "Cheque"},
    };

    const config = methodConfig[method] || {
      bg: "light",
      icon: faExchangeAlt,
      text: method?.toUpperCase() || "OTHER",
    };

    return (
      <Badge
        bg={config.bg}
        text={config.bg === "light" ? "dark" : "white"}
        className="d-flex align-items-center gap-1"
      >
        <FontAwesomeIcon icon={config.icon} size="xs" />
        {config.text}
      </Badge>
    );
  };

  // ✅ Handle transaction actions
  const handleTransactionAction = (action, transaction) => {
    switch (action) {
      case "view":
        setSelectedTransaction(transaction);
        setShowTransactionModal(true);
        break;
      case "edit":
        addToast?.(
          `Edit functionality for transaction ${transaction.displayId} coming soon`,
          "info"
        );
        break;
      case "delete":
        addToast?.(`Delete functionality coming soon`, "info");
        break;
      case "print":
        addToast?.(`Print transaction ${transaction.displayId}`, "info");
        break;
      default:
        addToast?.("Action not implemented", "info");
    }
  };

  // ✅ Utility functions
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // ✅ Loading state
  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <h5 className="mt-3 text-muted">Loading company transactions...</h5>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div>
      {/* Stats Cards - Clickable */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              activeTab === "all" ? "active-card" : ""
            }`}
            onClick={() => setActiveTab("all")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faExchangeAlt}
                className="stat-icon text-primary mb-2"
              />
              <h4 className="text-dark mb-1">{stats.totalTransactions}</h4>
              <small className="text-muted">Total Transactions</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              activeTab === "inbound" ? "active-card" : ""
            }`}
            onClick={() => setActiveTab("inbound")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faArrowDown}
                className="stat-icon text-success mb-2"
              />
              <h4 className="text-dark mb-1">
                {formatCurrency(stats.totalInbound)}
              </h4>
              <small className="text-muted">Total Inbound</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              activeTab === "outbound" ? "active-card" : ""
            }`}
            onClick={() => setActiveTab("outbound")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faArrowUp}
                className="stat-icon text-danger mb-2"
              />
              <h4 className="text-dark mb-1">
                {formatCurrency(stats.totalOutbound)}
              </h4>
              <small className="text-muted">Total Outbound</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center h-100">
            <Card.Body>
              <FontAwesomeIcon
                icon={faRupeeSign}
                className={`stat-icon mb-2 ${
                  stats.netAmount >= 0 ? "text-success" : "text-danger"
                }`}
              />
              <h4
                className={`mb-1 ${
                  stats.netAmount >= 0 ? "text-success" : "text-danger"
                }`}
              >
                {formatCurrency(Math.abs(stats.netAmount))}
              </h4>
              <small className="text-muted">Net Amount</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Status Stats */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              statusFilter === "completed" ? "active-card" : ""
            }`}
            onClick={() => setStatusFilter("completed")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faCheckCircle}
                className="stat-icon text-success mb-2"
              />
              <h4 className="text-dark mb-1">{stats.completedTransactions}</h4>
              <small className="text-muted">Completed</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              statusFilter === "pending" ? "active-card" : ""
            }`}
            onClick={() => setStatusFilter("pending")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faClock}
                className="stat-icon text-warning mb-2"
              />
              <h4 className="text-dark mb-1">{stats.pendingTransactions}</h4>
              <small className="text-muted">Pending</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              methodFilter === "cash" ? "active-card" : ""
            }`}
            onClick={() => setMethodFilter("cash")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faMoneyBillWave}
                className="stat-icon text-info mb-2"
              />
              <h4 className="text-dark mb-1">{stats.cashTransactions}</h4>
              <small className="text-muted">Cash Transactions</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              methodFilter === "bank" ? "active-card" : ""
            }`}
            onClick={() => setMethodFilter("bank")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faBank}
                className="stat-icon text-primary mb-2"
              />
              <h4 className="text-dark mb-1">{stats.bankTransactions}</h4>
              <small className="text-muted">Bank Transactions</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Transactions Card */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="neutral-header">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0 fw-semibold neutral-text">
              <FontAwesomeIcon
                icon={faExchangeAlt}
                className="me-2 neutral-muted"
              />
              Company Transactions ({filteredTransactions.length})
            </h5>
            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                className="neutral-button"
              >
                <FontAwesomeIcon icon={faDownload} className="me-1" />
                Export
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            activeKey={activeTab}
            onSelect={setActiveTab}
            className="mb-3 neutral-tabs"
          >
            <Tab
              eventKey="all"
              title={
                <span>
                  <FontAwesomeIcon icon={faExchangeAlt} className="me-1" />
                  All ({stats.totalTransactions})
                </span>
              }
            />
            <Tab
              eventKey="inbound"
              title={
                <span>
                  <FontAwesomeIcon icon={faArrowDown} className="me-1" />
                  Inbound (
                  {
                    transactions.filter(
                      (t) =>
                        t.type === "in" ||
                        t.type === "payment_in" ||
                        t.type === "sale"
                    ).length
                  }
                  )
                </span>
              }
            />
            <Tab
              eventKey="outbound"
              title={
                <span>
                  <FontAwesomeIcon icon={faArrowUp} className="me-1" />
                  Outbound (
                  {
                    transactions.filter(
                      (t) =>
                        t.type === "out" ||
                        t.type === "payment_out" ||
                        t.type === "purchase"
                    ).length
                  }
                  )
                </span>
              }
            />
          </Tabs>

          {/* Search and Filters */}
          <Row className="g-3">
            <Col md={2}>
              <InputGroup size="sm">
                <InputGroup.Text className="neutral-input-group-text border-end-0">
                  <FontAwesomeIcon icon={faSearch} />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="neutral-input border-start-0"
                />
              </InputGroup>
            </Col>
            <Col md={2}>
              <Form.Select
                size="sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="neutral-input"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                size="sm"
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="neutral-input"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                size="sm"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="neutral-input"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                size="sm"
                value={`${sortBy}-${sortDirection}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split("-");
                  setSortBy(field);
                  setSortDirection(direction);
                }}
                className="neutral-input"
              >
                <option value="date-desc">Latest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
                <option value="description-asc">Description A-Z</option>
                <option value="description-desc">Description Z-A</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <small className="neutral-muted d-block mt-2">
                {filteredTransactions.length} of {stats.totalTransactions}{" "}
                transactions
              </small>
            </Col>
          </Row>
        </Card.Header>

        <Card.Body className="p-0">
          {filteredTransactions.length > 0 ? (
            <div
              className="table-responsive"
              style={{maxHeight: "600px", overflowY: "auto"}}
            >
              <Table className="mb-0 clean-table">
                <thead className="sticky-top">
                  <tr>
                    <th>
                      Transaction Details
                      <FontAwesomeIcon
                        icon={faSort}
                        className="ms-2 text-muted"
                      />
                    </th>
                    <th>Type</th>
                    <th>
                      Amount
                      <FontAwesomeIcon
                        icon={faSort}
                        className="ms-2 text-muted"
                      />
                    </th>
                    <th>From/To</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="item-row">
                      <td>
                        <div>
                          <div className="fw-semibold text-dark mb-1">
                            <FontAwesomeIcon
                              icon={transaction.icon}
                              className={`me-2 text-${transaction.colorClass}`}
                            />
                            {transaction.description}
                          </div>
                          <small className="text-muted">
                            ID: {transaction.displayId}
                            {transaction.referenceId && (
                              <> • Ref: {transaction.referenceId}</>
                            )}
                          </small>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FontAwesomeIcon
                            icon={transaction.icon}
                            className={`me-2 text-${transaction.colorClass}`}
                          />
                          <span className="text-capitalize">
                            {transaction.type === "in" ||
                            transaction.type === "payment_in" ||
                            transaction.type === "sale"
                              ? "Inbound"
                              : transaction.type === "out" ||
                                transaction.type === "payment_out" ||
                                transaction.type === "purchase"
                              ? "Outbound"
                              : transaction.type}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`fw-bold ${
                            transaction.type === "in" ||
                            transaction.type === "payment_in" ||
                            transaction.type === "sale"
                              ? "text-success"
                              : "text-danger"
                          }`}
                        >
                          {transaction.type === "in" ||
                          transaction.type === "payment_in" ||
                          transaction.type === "sale"
                            ? "+"
                            : "-"}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td>
                        <span className="text-dark">{transaction.fromTo}</span>
                      </td>
                      <td>{getMethodBadge(transaction.method)}</td>
                      <td>{getStatusBadge(transaction.status)}</td>
                      <td>
                        <span className="text-muted small">
                          {formatDate(transaction.date)}
                        </span>
                      </td>
                      <td>
                        <Dropdown>
                          <Dropdown.Toggle
                            variant="link"
                            className="text-muted p-0 border-0 shadow-none"
                          >
                            <FontAwesomeIcon icon={faEllipsisV} />
                          </Dropdown.Toggle>
                          <Dropdown.Menu align="end">
                            <Dropdown.Item
                              onClick={() =>
                                handleTransactionAction("view", transaction)
                              }
                            >
                              <FontAwesomeIcon icon={faEye} className="me-2" />
                              View Details
                            </Dropdown.Item>
                            <Dropdown.Item
                              onClick={() =>
                                handleTransactionAction("print", transaction)
                              }
                            >
                              <FontAwesomeIcon
                                icon={faPrint}
                                className="me-2"
                              />
                              Print Receipt
                            </Dropdown.Item>
                            {(userRole === "owner" || userRole === "admin") && (
                              <>
                                <Dropdown.Divider />
                                <Dropdown.Item
                                  onClick={() =>
                                    handleTransactionAction("edit", transaction)
                                  }
                                >
                                  <FontAwesomeIcon
                                    icon={faEdit}
                                    className="me-2"
                                  />
                                  Edit Transaction
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item
                                  onClick={() =>
                                    handleTransactionAction(
                                      "delete",
                                      transaction
                                    )
                                  }
                                  className="text-danger"
                                >
                                  <FontAwesomeIcon
                                    icon={faTrash}
                                    className="me-2"
                                  />
                                  Delete Transaction
                                </Dropdown.Item>
                              </>
                            )}
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
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
                {searchQuery || statusFilter !== "all" || methodFilter !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "This company hasn't recorded any transactions yet"}
              </p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Transaction Details Modal */}
      <Modal
        show={showTransactionModal}
        onHide={() => setShowTransactionModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon
              icon={selectedTransaction?.icon || faExchangeAlt}
              className="me-2"
            />
            Transaction Details - {selectedTransaction?.displayId}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTransaction && (
            <Row>
              <Col md={6}>
                <Card className="border-0 bg-light h-100">
                  <Card.Header className="bg-primary text-white">
                    <h6 className="mb-0">
                      <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
                      Transaction Information
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <p>
                      <strong>Description:</strong>{" "}
                      {selectedTransaction.description}
                    </p>
                    <p>
                      <strong>Amount:</strong>{" "}
                      {formatCurrency(selectedTransaction.amount)}
                    </p>
                    <p>
                      <strong>Type:</strong> {selectedTransaction.type}
                    </p>
                    <p>
                      <strong>Status:</strong>{" "}
                      {getStatusBadge(selectedTransaction.status)}
                    </p>
                    <p>
                      <strong>Method:</strong>{" "}
                      {getMethodBadge(selectedTransaction.method)}
                    </p>
                    <p>
                      <strong>Date:</strong>{" "}
                      {formatDate(selectedTransaction.date)}
                    </p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="border-0 bg-light h-100">
                  <Card.Header className="bg-info text-white">
                    <h6 className="mb-0">
                      <FontAwesomeIcon icon={faUser} className="me-2" />
                      Additional Details
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <p>
                      <strong>From/To:</strong> {selectedTransaction.fromTo}
                    </p>
                    {selectedTransaction.referenceId && (
                      <p>
                        <strong>Reference ID:</strong>{" "}
                        {selectedTransaction.referenceId}
                      </p>
                    )}
                    {selectedTransaction.bankAccount && (
                      <p>
                        <strong>Bank Account:</strong>{" "}
                        {selectedTransaction.bankAccount}
                      </p>
                    )}
                    {selectedTransaction.chequeNumber && (
                      <p>
                        <strong>Cheque Number:</strong>{" "}
                        {selectedTransaction.chequeNumber}
                      </p>
                    )}
                    {selectedTransaction.upiTransactionId && (
                      <p>
                        <strong>UPI Transaction ID:</strong>{" "}
                        {selectedTransaction.upiTransactionId}
                      </p>
                    )}
                    {selectedTransaction.notes && (
                      <p>
                        <strong>Notes:</strong> {selectedTransaction.notes}
                      </p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowTransactionModal(false)}
          >
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() =>
              handleTransactionAction("print", selectedTransaction)
            }
          >
            <FontAwesomeIcon icon={faPrint} className="me-2" />
            Print Receipt
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Styles */}
      <style>{`
        /* Neutral header styles */
        .neutral-header {
          background: linear-gradient(
            135deg,
            #f8f9fa 0%,
            #f1f3f4 100%
          ) !important;
          border-bottom: 1px solid #e5e7eb !important;
        }

        .neutral-text {
          color: #374151 !important;
        }

        .neutral-muted {
          color: #6b7280 !important;
        }

        .neutral-input {
          border-color: #d1d5db !important;
          color: #374151 !important;
          background-color: white !important;
        }

        .neutral-input:focus {
          border-color: #9ca3af !important;
          box-shadow: 0 0 0 0.2rem rgba(156, 163, 175, 0.25) !important;
        }

        .neutral-input-group-text {
          background-color: #f9fafb !important;
          border-color: #d1d5db !important;
          color: #6b7280 !important;
        }

        .neutral-button {
          border-color: #d1d5db !important;
          color: #6b7280 !important;
          background-color: white !important;
        }

        .neutral-button:hover {
          border-color: #9ca3af !important;
          color: #374151 !important;
          background-color: #f9fafb !important;
        }

        /* Clickable card styles */
        .clickable-card {
          transition: all 0.3s ease;
          border: 2px solid transparent !important;
          cursor: pointer;
        }

        .clickable-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          border-color: #007bff !important;
        }

        .active-card {
          border-color: #007bff !important;
          background: linear-gradient(
            135deg,
            #f8f9ff 0%,
            #e6f3ff 100%
          ) !important;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2) !important;
        }

        .stat-icon {
          font-size: 1.5rem;
          display: block;
          transition: transform 0.2s ease;
        }

        .clickable-card:hover .stat-icon {
          transform: scale(1.1);
        }

        /* Neutral tabs */
        .neutral-tabs .nav-link {
          color: #6b7280 !important;
          border: none !important;
          padding: 0.75rem 1rem !important;
          font-weight: 500 !important;
        }

        .neutral-tabs .nav-link.active {
          color: #374151 !important;
          background: none !important;
          border: none !important;
          border-bottom: 2px solid #374151 !important;
        }

        .neutral-tabs .nav-link:hover {
          color: #374151 !important;
          border-color: transparent !important;
        }

        /* Clean table styles */
        .clean-table {
          border-collapse: separate;
          border-spacing: 0;
        }

        .clean-table thead th {
          background: #f8f9fa;
          border: none;
          border-bottom: 2px solid #dee2e6;
          font-weight: 600;
          font-size: 0.875rem;
          color: #495057;
          padding: 1rem;
          vertical-align: middle;
          white-space: nowrap;
        }

        .clean-table tbody td {
          background: white;
          border: none;
          border-bottom: 1px solid #f1f3f4;
          padding: 1rem;
          vertical-align: middle;
          font-size: 0.875rem;
        }

        .item-row {
          transition: background-color 0.2s ease;
        }

        .item-row:hover {
          background-color: #f8f9fa !important;
        }

        .item-row:hover td {
          background: transparent;
        }

        .badge {
          font-weight: 500;
          font-size: 0.75rem;
          padding: 0.35em 0.65em;
        }

        /* Sticky table header for scrolling */
        .sticky-top {
          position: sticky;
          top: 0;
          z-index: 10;
        }

        /* Hover effects for better UX */
        .clickable-card .card-body {
          transition: all 0.2s ease;
        }

        .clickable-card:hover .card-body {
          color: #007bff !important;
        }

        .clickable-card:hover h4 {
          color: #007bff !important;
        }

        .active-card .card-body {
          color: #0056b3 !important;
        }

        .active-card h4 {
          color: #0056b3 !important;
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .clean-table thead th,
          .clean-table tbody td {
            padding: 0.75rem 0.5rem;
            font-size: 0.8rem;
          }

          .stat-icon {
            font-size: 1.2rem;
          }

          .clickable-card:hover {
            transform: translateY(-1px);
          }

          .active-card {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}

export default CompanyTransactions;
