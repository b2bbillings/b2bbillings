import React, {useState, useCallback, useMemo, useEffect} from "react";
import {
  Card,
  Table,
  Form,
  InputGroup,
  Badge,
  Button,
  Dropdown,
  Spinner,
  Alert,
  Row,
  Col,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faFilter,
  faEllipsisV,
  faFileExport,
  faArrowUp,
  faArrowDown,
  faEye,
  faEdit,
  faTrash,
  faRefresh,
  faAdjust,
  faShoppingCart,
  faTag,
  faInfoCircle,
  faCalendarAlt,
  faUser,
  faReceipt,
} from "@fortawesome/free-solid-svg-icons";
import itemService from "../../../services/itemService";

function TransactionHistory({
  selectedItem,
  searchQuery = "",
  onSearchChange,
  companyId,
  addToast,
}) {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "desc",
  });
  const [lastFetchedItemId, setLastFetchedItemId] = useState(null);
  const [transactionSummary, setTransactionSummary] = useState(null);
  const [filterType, setFilterType] = useState("all");

  // Fetch transactions with comprehensive error handling
  const fetchTransactions = useCallback(
    async (itemId, companyId, filters = {}) => {
      if (!itemId || !companyId) {
        setTransactions([]);
        setTransactionSummary(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const params = {
          page: 1,
          limit: 100,
          sortBy: "date",
          sortOrder: "desc",
          type: filterType !== "all" ? filterType : undefined,
          ...filters,
        };

        const response = await itemService.getItemTransactions(
          companyId,
          itemId,
          params
        );

        if (response.success) {
          const transactionData = response.data.transactions || [];
          const summary = response.data.summary || null;

          setTransactions(transactionData);
          setTransactionSummary(summary);
          setLastFetchedItemId(itemId);

          if (transactionData.length === 0 && !error) {
            addToast?.("No transactions found for this item", "info");
          }
        } else {
          throw new Error(response.message || "Failed to fetch transactions");
        }
      } catch (err) {
        setError(err.message || "Failed to fetch transactions");
        setTransactions([]);
        setTransactionSummary(null);
        addToast?.(err.message || "Failed to fetch transactions", "error");
      } finally {
        setIsLoading(false);
      }
    },
    [addToast, filterType]
  );

  // Effect to fetch transactions when selectedItem or filter changes
  useEffect(() => {
    if (selectedItem?.id && companyId) {
      if (lastFetchedItemId !== selectedItem.id || filterType !== "all") {
        fetchTransactions(selectedItem.id, companyId);
      }
    } else {
      setTransactions([]);
      setTransactionSummary(null);
      setLastFetchedItemId(null);
    }
  }, [selectedItem?.id, companyId, fetchTransactions, filterType]);

  // Filter and sort transactions with optimized performance
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions.filter((transaction) => {
      if (!transaction) return false;

      const searchMatch =
        searchQuery === "" ||
        transaction.customerName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        transaction.vendorName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        transaction.invoiceNumber
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        transaction.referenceNumber
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        transaction.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.transactionType
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        transaction.reason?.toLowerCase().includes(searchQuery.toLowerCase());

      return searchMatch;
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === "date" || sortConfig.key === "transactionDate") {
          aVal = new Date(aVal || 0).getTime();
          bVal = new Date(bVal || 0).getTime();
        }

        if (
          sortConfig.key === "quantity" ||
          sortConfig.key === "pricePerUnit" ||
          sortConfig.key === "total" ||
          sortConfig.key === "totalAmount"
        ) {
          aVal = Number(aVal || 0);
          bVal = Number(bVal || 0);
        }

        if (typeof aVal === "string" && typeof bVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [transactions, searchQuery, sortConfig]);

  // Format price with proper currency and locale
  const formatPrice = useCallback((price) => {
    const numPrice = Number(price || 0);
    if (numPrice === 0) return "₹0";
    return `₹${numPrice.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }, []);

  // Get transaction icon with proper styling
  const getTransactionIcon = useCallback((type) => {
    const transactionType = type?.toLowerCase();

    if (
      transactionType === "sale" ||
      transactionType === "sales" ||
      transactionType === "out"
    ) {
      return (
        <FontAwesomeIcon
          icon={faArrowUp}
          className="text-success"
          size="sm"
          title="Sale - Stock Out"
        />
      );
    } else if (
      transactionType === "purchase" ||
      transactionType === "buy" ||
      transactionType === "in"
    ) {
      return (
        <FontAwesomeIcon
          icon={faArrowDown}
          className="text-primary"
          size="sm"
          title="Purchase - Stock In"
        />
      );
    } else if (transactionType === "adjustment") {
      return (
        <FontAwesomeIcon
          icon={faAdjust}
          className="text-warning"
          size="sm"
          title="Stock Adjustment"
        />
      );
    } else {
      return (
        <FontAwesomeIcon
          icon={faInfoCircle}
          className="text-muted"
          size="sm"
          title="Other Transaction"
        />
      );
    }
  }, []);

  // Get status badge with appropriate styling
  const getStatusBadge = useCallback((status) => {
    if (!status) return null;

    const statusLower = status.toLowerCase();
    let variant = "secondary";
    let text = status;

    switch (statusLower) {
      case "paid":
      case "completed":
      case "success":
        variant = "success";
        text = "Completed";
        break;
      case "pending":
        variant = "warning";
        text = "Pending";
        break;
      case "partial":
        variant = "info";
        text = "Partial";
        break;
      case "cancelled":
      case "failed":
        variant = "danger";
        text = "Failed";
        break;
      default:
        variant = "secondary";
        text = status;
    }

    return (
      <Badge
        bg={variant}
        className="fw-normal"
        style={{
          borderRadius: "4px",
          fontSize: "11px",
          padding: "0.25rem 0.5rem",
          textTransform: "capitalize",
        }}
      >
        {text}
      </Badge>
    );
  }, []);

  // Handle sorting with proper state management
  const handleSort = useCallback((key) => {
    setSortConfig((prev) => {
      let direction = "asc";
      if (prev.key === key && prev.direction === "asc") {
        direction = "desc";
      }
      return {key, direction};
    });
  }, []);

  // Refresh transactions with loading state
  const handleRefresh = useCallback(() => {
    if (selectedItem?.id && companyId) {
      setLastFetchedItemId(null);
      fetchTransactions(selectedItem.id, companyId);
    }
  }, [selectedItem?.id, companyId, fetchTransactions]);

  // Filter by transaction type
  const handleFilterChange = useCallback((type) => {
    setFilterType(type);
  }, []);

  // View transaction details
  const handleViewDetails = useCallback(
    (transaction) => {
      const details = [
        `Transaction ID: ${transaction.id}`,
        `Type: ${transaction.type}`,
        `Date: ${new Date(transaction.date).toLocaleString()}`,
        `${
          transaction.customerName
            ? `Customer: ${transaction.customerName}`
            : ""
        }`,
        `${transaction.vendorName ? `Vendor: ${transaction.vendorName}` : ""}`,
        `Quantity: ${transaction.quantity} ${transaction.unit || "PCS"}`,
        `Price: ${formatPrice(transaction.pricePerUnit)}`,
        `Total: ${formatPrice(transaction.totalAmount)}`,
        `Status: ${transaction.status}`,
      ]
        .filter(Boolean)
        .join("\n");

      alert(details);
    },
    [formatPrice]
  );

  const handleEditTransaction = useCallback(
    (transaction) => {
      addToast?.("Edit transaction feature will be available soon", "info");
    },
    [addToast]
  );

  const handleDeleteTransaction = useCallback(
    (transaction) => {
      if (
        window.confirm(
          `Are you sure you want to delete this ${transaction.type} transaction?`
        )
      ) {
        addToast?.("Delete transaction feature will be available soon", "info");
      }
    },
    [addToast]
  );

  // Export transactions to CSV
  const handleExport = useCallback(() => {
    if (filteredAndSortedTransactions.length === 0) {
      addToast?.("No transactions to export", "warning");
      return;
    }

    try {
      const headers = [
        "Date",
        "Type",
        "Invoice/Reference",
        "Customer/Vendor",
        "Quantity",
        "Unit",
        "Price Per Unit",
        "Total Amount",
        "Status",
        "Reason/Notes",
      ];

      const csvContent = [
        headers.join(","),
        ...filteredAndSortedTransactions.map((transaction) =>
          [
            new Date(
              transaction.date || transaction.transactionDate
            ).toLocaleDateString("en-IN"),
            transaction.type || transaction.transactionType || "Unknown",
            transaction.invoiceNumber || transaction.referenceNumber || "-",
            transaction.customerName || transaction.vendorName || "Unknown",
            transaction.quantity || 0,
            transaction.unit || "PCS",
            transaction.pricePerUnit || 0,
            transaction.totalAmount ||
              (transaction.quantity || 0) * (transaction.pricePerUnit || 0),
            transaction.status || "Unknown",
            transaction.reason || transaction.notes || "-",
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedItem?.name || "item"}_transactions_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      addToast?.(
        `${filteredAndSortedTransactions.length} transactions exported successfully`,
        "success"
      );
    } catch (error) {
      addToast?.("Failed to export transactions", "error");
    }
  }, [filteredAndSortedTransactions, selectedItem?.name, addToast]);

  // Custom dropdown toggle component
  const CustomToggle = React.forwardRef(({children, onClick}, ref) => (
    <button
      ref={ref}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
      }}
      className="btn btn-link p-0 border-0 text-muted custom-dropdown-toggle"
      style={{
        borderRadius: "4px",
        opacity: 0.7,
        transition: "all 0.2s ease",
        background: "none",
        fontSize: "14px",
        textDecoration: "none",
      }}
    >
      {children}
    </button>
  ));

  CustomToggle.displayName = "CustomToggle";

  return (
    <>
      <Card className="border-0 shadow-sm h-100 transaction-history-card">
        {/* Header with summary stats */}
        <Card.Header className="bg-white border-bottom py-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5
              className="mb-0 fw-bold"
              style={{color: "#495057", fontSize: "16px"}}
            >
              <FontAwesomeIcon icon={faReceipt} className="me-2" />
              TRANSACTIONS
              {selectedItem && (
                <small className="text-muted ms-2" style={{fontSize: "12px"}}>
                  for {selectedItem.name}
                </small>
              )}
              {isLoading && (
                <Spinner
                  animation="border"
                  size="sm"
                  className="ms-2"
                  style={{width: "1rem", height: "1rem"}}
                />
              )}
            </h5>

            <div className="d-flex align-items-center gap-2">
              {/* Transaction type filter */}
              <Dropdown size="sm">
                <Dropdown.Toggle
                  variant="outline-secondary"
                  style={{borderRadius: "4px", fontSize: "12px"}}
                  disabled={isLoading}
                >
                  <FontAwesomeIcon icon={faFilter} className="me-1" />
                  {filterType === "all"
                    ? "All Types"
                    : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{borderRadius: "4px"}}>
                  <Dropdown.Item onClick={() => handleFilterChange("all")}>
                    All Types
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleFilterChange("purchase")}>
                    <FontAwesomeIcon
                      icon={faShoppingCart}
                      className="me-2 text-primary"
                    />
                    Purchases
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleFilterChange("sale")}>
                    <FontAwesomeIcon
                      icon={faTag}
                      className="me-2 text-success"
                    />
                    Sales
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => handleFilterChange("adjustment")}
                  >
                    <FontAwesomeIcon
                      icon={faAdjust}
                      className="me-2 text-warning"
                    />
                    Adjustments
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              {/* Search */}
              <div className="search-container">
                <InputGroup size="sm" style={{width: "200px"}}>
                  <InputGroup.Text
                    className="bg-light border-end-0"
                    style={{borderRadius: "4px 0 0 4px"}}
                  >
                    <FontAwesomeIcon
                      icon={faSearch}
                      className="text-muted"
                      size="sm"
                    />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="border-start-0 bg-light"
                    style={{borderRadius: "0 4px 4px 0", fontSize: "13px"}}
                    disabled={isLoading}
                  />
                </InputGroup>
              </div>

              {/* Refresh Button */}
              <Button
                size="sm"
                variant="outline-secondary"
                onClick={handleRefresh}
                disabled={isLoading || !selectedItem}
                title="Refresh transactions"
                style={{
                  borderRadius: "4px",
                  fontSize: "12px",
                  padding: "0.375rem 0.75rem",
                }}
              >
                <FontAwesomeIcon
                  icon={faRefresh}
                  className={isLoading ? "fa-spin" : ""}
                  size="sm"
                />
              </Button>

              {/* Export Button */}
              <Button
                size="sm"
                className="fw-semibold text-white border-0"
                onClick={handleExport}
                disabled={
                  isLoading || filteredAndSortedTransactions.length === 0
                }
                style={{
                  background: "#6c757d",
                  borderRadius: "4px",
                  fontSize: "12px",
                  padding: "0.375rem 0.75rem",
                }}
              >
                <FontAwesomeIcon
                  icon={faFileExport}
                  className="me-1"
                  size="sm"
                />
                Export
              </Button>
            </div>
          </div>

          {/* Summary stats */}
          {transactionSummary && (
            <Row className="g-3">
              <Col md={3}>
                <div className="text-center p-2 bg-light rounded">
                  <div className="fw-bold text-primary">
                    {transactionSummary.totalTransactions}
                  </div>
                  <small className="text-muted">Total Transactions</small>
                </div>
              </Col>
              <Col md={3}>
                <div className="text-center p-2 bg-light rounded">
                  <div className="fw-bold text-success">
                    {transactionSummary.purchases || 0}
                  </div>
                  <small className="text-muted">Purchases</small>
                </div>
              </Col>
              <Col md={3}>
                <div className="text-center p-2 bg-light rounded">
                  <div className="fw-bold text-info">
                    {transactionSummary.sales || 0}
                  </div>
                  <small className="text-muted">Sales</small>
                </div>
              </Col>
              <Col md={3}>
                <div className="text-center p-2 bg-light rounded">
                  <div className="fw-bold text-warning">
                    {transactionSummary.adjustments || 0}
                  </div>
                  <small className="text-muted">Adjustments</small>
                </div>
              </Col>
            </Row>
          )}
        </Card.Header>

        {/* Error Alert */}
        {error && (
          <Alert
            variant="danger"
            className="m-3 mb-0"
            style={{borderRadius: "4px"}}
          >
            <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
            {error}
            <Button
              variant="outline-danger"
              size="sm"
              className="ms-2"
              onClick={handleRefresh}
              style={{borderRadius: "4px"}}
            >
              <FontAwesomeIcon icon={faRefresh} className="me-1" />
              Retry
            </Button>
          </Alert>
        )}

        {/* Transaction Table */}
        <Card.Body className="p-0">
          <div className="table-responsive transaction-table-container">
            <Table className="mb-0 transaction-table" hover>
              <thead className="bg-light">
                <tr>
                  <th className="border-0 py-3 ps-4 text-muted small fw-semibold text-uppercase">
                    <div className="d-flex align-items-center gap-2">
                      TYPE
                      <FontAwesomeIcon
                        icon={faFilter}
                        className="text-muted cursor-pointer"
                        onClick={() => handleSort("type")}
                        style={{fontSize: "10px"}}
                      />
                    </div>
                  </th>
                  <th className="border-0 py-3 text-muted small fw-semibold text-uppercase">
                    <div className="d-flex align-items-center gap-2">
                      INVOICE/REF.
                      <FontAwesomeIcon
                        icon={faFilter}
                        className="text-muted cursor-pointer"
                        onClick={() => handleSort("invoiceNumber")}
                        style={{fontSize: "10px"}}
                      />
                    </div>
                  </th>
                  <th className="border-0 py-3 text-muted small fw-semibold text-uppercase">
                    <div className="d-flex align-items-center gap-2">
                      CUSTOMER/VENDOR
                      <FontAwesomeIcon
                        icon={faFilter}
                        className="text-muted cursor-pointer"
                        onClick={() => handleSort("customerName")}
                        style={{fontSize: "10px"}}
                      />
                    </div>
                  </th>
                  <th className="border-0 py-3 text-muted small fw-semibold text-uppercase">
                    <div className="d-flex align-items-center gap-2">
                      DATE
                      <FontAwesomeIcon
                        icon={faFilter}
                        className="text-muted cursor-pointer"
                        onClick={() => handleSort("date")}
                        style={{fontSize: "10px"}}
                      />
                    </div>
                  </th>
                  <th className="border-0 py-3 text-muted small fw-semibold text-uppercase">
                    <div className="d-flex align-items-center gap-2">
                      QUANTITY
                      <FontAwesomeIcon
                        icon={faFilter}
                        className="text-muted cursor-pointer"
                        onClick={() => handleSort("quantity")}
                        style={{fontSize: "10px"}}
                      />
                    </div>
                  </th>
                  <th className="border-0 py-3 text-muted small fw-semibold text-uppercase">
                    <div className="d-flex align-items-center gap-2">
                      PRICE/UNIT
                      <FontAwesomeIcon
                        icon={faFilter}
                        className="text-muted cursor-pointer"
                        onClick={() => handleSort("pricePerUnit")}
                        style={{fontSize: "10px"}}
                      />
                    </div>
                  </th>
                  <th className="border-0 py-3 text-muted small fw-semibold text-uppercase">
                    <div className="d-flex align-items-center gap-2">
                      TOTAL
                      <FontAwesomeIcon
                        icon={faFilter}
                        className="text-muted cursor-pointer"
                        onClick={() => handleSort("totalAmount")}
                        style={{fontSize: "10px"}}
                      />
                    </div>
                  </th>
                  <th className="border-0 py-3 text-muted small fw-semibold text-uppercase">
                    STATUS
                  </th>
                  <th className="border-0 py-3 pe-4"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5">
                      <Spinner animation="border" size="sm" className="mb-2" />
                      <div className="text-muted small">
                        Loading transactions...
                      </div>
                    </td>
                  </tr>
                ) : filteredAndSortedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <div className="d-flex flex-column align-items-center">
                        <div
                          className="mb-2"
                          style={{fontSize: "2rem", opacity: 0.5}}
                        >
                          📊
                        </div>
                        <div
                          className="fw-semibold mb-1"
                          style={{fontSize: "14px"}}
                        >
                          {selectedItem
                            ? error
                              ? "Failed to load transactions"
                              : searchQuery
                              ? "No transactions found matching your search"
                              : filterType !== "all"
                              ? `No ${filterType} transactions found for this item`
                              : "No transactions found for this item"
                            : "Select an item to view transactions"}
                        </div>
                        <small style={{fontSize: "12px", color: "#6c757d"}}>
                          {selectedItem && !searchQuery && !error
                            ? "Transactions will appear here once sales/purchases are made"
                            : ""}
                        </small>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedTransactions.map((transaction, index) => (
                    <tr
                      key={transaction.id || transaction._id || index}
                      className="border-bottom transaction-row"
                    >
                      <td className="py-3 ps-4">
                        <div className="d-flex align-items-center gap-2">
                          <span className="transaction-icon">
                            {getTransactionIcon(
                              transaction.type || transaction.transactionType
                            )}
                          </span>
                          <span
                            className="fw-medium text-dark"
                            style={{fontSize: "13px"}}
                          >
                            {transaction.type ||
                              transaction.transactionType ||
                              "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          className="text-dark"
                          style={{
                            fontSize: "13px",
                            fontFamily: "monospace",
                            background: "#f8f9fa",
                            padding: "2px 6px",
                            borderRadius: "3px",
                          }}
                        >
                          {transaction.invoiceNumber ||
                            transaction.referenceNumber ||
                            "-"}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="d-flex align-items-center gap-1">
                          {transaction.customerName && (
                            <FontAwesomeIcon
                              icon={faUser}
                              className="text-muted me-1"
                              size="sm"
                            />
                          )}
                          <span
                            className="text-dark fw-medium"
                            style={{fontSize: "13px"}}
                          >
                            {transaction.customerName ||
                              transaction.vendorName ||
                              "System"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="d-flex align-items-center gap-1">
                          <FontAwesomeIcon
                            icon={faCalendarAlt}
                            className="text-muted me-1"
                            size="sm"
                          />
                          <span
                            className="text-muted"
                            style={{fontSize: "13px"}}
                          >
                            {new Date(
                              transaction.date || transaction.transactionDate
                            ).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          className={`fw-medium ${
                            transaction.quantity < 0
                              ? "text-danger"
                              : "text-success"
                          }`}
                          style={{fontSize: "13px"}}
                        >
                          {transaction.quantity || 0}{" "}
                          {transaction.unit || "PCS"}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className="text-dark fw-medium"
                          style={{fontSize: "13px"}}
                        >
                          {formatPrice(transaction.pricePerUnit)}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className="text-dark fw-bold"
                          style={{
                            fontSize: "13px",
                            color:
                              (
                                transaction.type || transaction.transactionType
                              )?.toLowerCase() === "sale"
                                ? "#28a745"
                                : (
                                    transaction.type ||
                                    transaction.transactionType
                                  )?.toLowerCase() === "purchase"
                                ? "#007bff"
                                : "#6c757d",
                          }}
                        >
                          {formatPrice(
                            transaction.totalAmount ||
                              (transaction.quantity || 0) *
                                (transaction.pricePerUnit || 0)
                          )}
                        </span>
                      </td>
                      <td className="py-3">
                        {getStatusBadge(transaction.status)}
                      </td>
                      <td className="py-3 pe-4">
                        <Dropdown align="end" drop="down">
                          <Dropdown.Toggle as={CustomToggle}>
                            <FontAwesomeIcon icon={faEllipsisV} />
                          </Dropdown.Toggle>

                          <Dropdown.Menu
                            style={{
                              borderRadius: "4px",
                              border: "1px solid #dee2e6",
                              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                              padding: "0.5rem 0",
                              minWidth: "180px",
                              zIndex: 1050,
                            }}
                          >
                            <Dropdown.Item
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleViewDetails(transaction);
                              }}
                              className="d-flex align-items-center gap-2"
                              style={{fontSize: "13px", padding: "0.5rem 1rem"}}
                            >
                              <FontAwesomeIcon
                                icon={faEye}
                                className="text-primary"
                                style={{width: "14px"}}
                              />
                              View Details
                            </Dropdown.Item>

                            <Dropdown.Item
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleEditTransaction(transaction);
                              }}
                              className="d-flex align-items-center gap-2"
                              style={{fontSize: "13px", padding: "0.5rem 1rem"}}
                            >
                              <FontAwesomeIcon
                                icon={faEdit}
                                className="text-warning"
                                style={{width: "14px"}}
                              />
                              Edit Transaction
                            </Dropdown.Item>

                            <Dropdown.Divider style={{margin: "0.5rem 0"}} />

                            <Dropdown.Item
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteTransaction(transaction);
                              }}
                              className="d-flex align-items-center gap-2 text-danger"
                              style={{fontSize: "13px", padding: "0.5rem 1rem"}}
                            >
                              <FontAwesomeIcon
                                icon={faTrash}
                                style={{width: "14px"}}
                              />
                              Delete
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Production-ready styles */}
      <style>
        {`
          .transaction-history-card {
            background: #ffffff;
            border: 1px solid #e9ecef !important;
            border-radius: 8px !important;
            transition: all 0.3s ease;
          }

          .transaction-history-card:hover {
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
            border-color: #6c757d !important;
          }

          .cursor-pointer {
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .cursor-pointer:hover {
            color: #007bff !important;
            transform: scale(1.1);
          }

          .search-container .input-group-text {
            background-color: #f8f9fa !important;
            border-color: #dee2e6 !important;
          }

          .transaction-table-container {
            max-height: calc(100vh - 400px);
            overflow-y: auto;
          }

          .transaction-table thead th {
            position: sticky;
            top: 0;
            background-color: #f8f9fa !important;
            z-index: 10;
            border-bottom: 2px solid #dee2e6 !important;
          }

          .transaction-row {
            transition: all 0.2s ease;
            border-bottom: 1px solid #f1f3f4 !important;
          }

          .transaction-row:hover {
            background-color: #f8f9fa !important;
            transform: translateX(2px);
          }

          .transaction-row:hover .custom-dropdown-toggle {
            opacity: 1 !important;
          }

          .transaction-icon {
            font-size: 0.9rem;
            min-width: 20px;
          }

          .table td, .table th {
            vertical-align: middle;
            border-color: #e9ecef;
          }

          .btn[style*="background: #6c757d"]:hover {
            background: #5a6268 !important;
            transform: translateY(-1px);
          }

          .form-control:focus {
            border-color: #007bff !important;
            box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25) !important;
            background-color: white !important;
          }

          .custom-dropdown-toggle {
            transition: all 0.2s ease !important;
          }

          .custom-dropdown-toggle:hover {
            opacity: 1 !important;
            transform: scale(1.1);
            color: #007bff !important;
          }

          .dropdown-item {
            transition: all 0.2s ease !important;
          }

          .dropdown-item:hover {
            background: #f8f9fa !important;
            padding-left: 1.25rem !important;
            transform: translateX(4px);
          }

          .dropdown-item.text-danger:hover {
            background: rgba(220, 53, 69, 0.1) !important;
            color: #dc3545 !important;
          }

          .transaction-table-container::-webkit-scrollbar {
            width: 6px;
          }

          .transaction-table-container::-webkit-scrollbar-track {
            background: transparent;
          }

          .transaction-table-container::-webkit-scrollbar-thumb {
            background: #dee2e6;
            border-radius: 3px;
          }

          .transaction-table-container::-webkit-scrollbar-thumb:hover {
            background: #adb5bd;
          }

          .badge {
            font-weight: 500 !important;
          }

          @media (max-width: 768px) {
            .search-container {
              display: none;
            }
            
            .transaction-table-container {
              max-height: 400px;
            }
            
            .table-responsive {
              font-size: 0.875rem;
            }

            .transaction-row:hover {
              transform: none;
            }

            .dropdown-item:hover {
              transform: none;
              padding-left: 1rem !important;
            }
          }

          @media (max-width: 576px) {
            .transaction-table th,
            .transaction-table td {
              padding: 0.5rem 0.25rem;
              font-size: 12px !important;
            }
            
            .transaction-table th:first-child,
            .transaction-table td:first-child {
              padding-left: 0.75rem;
            }
            
            .transaction-table th:last-child,
            .transaction-table td:last-child {
              padding-right: 0.75rem;
            }

            .d-flex.justify-content-between {
              flex-direction: column;
              gap: 1rem;
            }
          }
        `}
      </style>
    </>
  );
}

export default TransactionHistory;
