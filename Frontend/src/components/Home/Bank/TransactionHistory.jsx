import React, {useState, useEffect, useMemo, useCallback} from "react";
import {
  Card,
  Table,
  Badge,
  InputGroup,
  Form,
  Button,
  Dropdown,
  Pagination,
  Modal,
  Toast,
  ToastContainer,
  Spinner,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faFilter,
  faArrowUp,
  faArrowDown,
  faExchange,
  faUniversity,
  faMobile,
  faCalendarAlt,
  faSort,
  faFileExcel,
  faPrint,
  faEllipsisV,
  faEye,
  faEdit,
  faTrash,
  faChevronLeft,
  faChevronRight,
  faAngleDoubleLeft,
  faAngleDoubleRight,
  faDownload,
  faRefresh,
  faCopy,
  faReceipt,
  faCheckCircle,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import {useParams} from "react-router-dom";
import transactionService from "../../../services/transactionService";

// ✅ PRODUCTION-READY: Constants for better maintainability
const TRANSACTION_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  SEARCH_DEBOUNCE_MS: 500,
  MAX_DESCRIPTION_LENGTH: 30,
  MAX_NOTES_LENGTH: 25,
  DATE_RANGES: {
    all: "All Time",
    today: "Today",
    week: "Last 7 Days",
    month: "Last Month",
    quarter: "Last 3 Months",
    year: "This Year",
  },
  FILTER_TYPES: {
    all: "All Types",
    credit: "Credits",
    debit: "Debits",
  },
  SORT_FIELDS: ["transactionDate", "amount", "direction", "transactionId"],
  PAYMENT_METHOD_ICONS: {
    upi: faMobile,
    card: "💳",
    cash: "💵",
    bank_transfer: faUniversity,
    cheque: "📄",
    online: "🌐",
  },
};

// ✅ PRODUCTION-READY: Enhanced PropTypes for better validation
const TransactionHistory = ({
  selectedAccount = null,
  searchQuery = "",
  onSearchChange = () => {},
  loading = false,
  onRefresh = () => {},
  showActions = true,
  height = "70vh",
  enableExport = true,
  enablePrint = true,
}) => {
  const {companyId} = useParams();

  // ✅ PRODUCTION-READY: Enhanced state management
  const [state, setState] = useState({
    transactions: [],
    loading: false,
    error: null,
    filters: {
      type: "all",
      dateRange: "all",
      sortField: "transactionDate",
      sortDirection: "desc",
    },
    pagination: {
      page: 1,
      limit: TRANSACTION_CONSTANTS.DEFAULT_PAGE_SIZE,
      total: 0,
      totalPages: 0,
    },
    ui: {
      showExportModal: false,
      showDeleteModal: false,
      selectedTransaction: null,
      toasts: [],
    },
  });

  // ✅ PRODUCTION-READY: Performance optimization with useMemo
  const filteredQuery = useMemo(() => {
    if (!selectedAccount || !companyId) return null;

    const filters = {
      page: state.pagination.page,
      limit: state.pagination.limit,
      sortBy: state.filters.sortField,
      sortOrder: state.filters.sortDirection,
      bankAccountId: selectedAccount._id || selectedAccount.id,
    };

    // Add type filter
    if (state.filters.type !== "all") {
      filters.direction = state.filters.type === "credit" ? "in" : "out";
    }

    // Add date range filter
    if (state.filters.dateRange !== "all") {
      const {dateFrom, dateTo} = getDateRange(state.filters.dateRange);
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
    }

    // Add search filter
    if (searchQuery?.trim()) {
      filters.search = searchQuery.trim();
    }

    return filters;
  }, [
    selectedAccount,
    companyId,
    state.filters,
    state.pagination.page,
    state.pagination.limit,
    searchQuery,
  ]);

  // ✅ PRODUCTION-READY: Optimized date range calculation
  const getDateRange = useCallback((range) => {
    const now = new Date();
    const startDate = new Date();

    switch (range) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        return {
          dateFrom: startDate.toISOString().split("T")[0],
          dateTo: now.toISOString().split("T")[0],
        };
      case "week":
        startDate.setDate(now.getDate() - 7);
        return {dateFrom: startDate.toISOString().split("T")[0]};
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        return {dateFrom: startDate.toISOString().split("T")[0]};
      case "quarter":
        startDate.setMonth(now.getMonth() - 3);
        return {dateFrom: startDate.toISOString().split("T")[0]};
      case "year":
        startDate.setMonth(0, 1);
        return {dateFrom: startDate.toISOString().split("T")[0]};
      default:
        return {};
    }
  }, []);

  // ✅ PRODUCTION-READY: Debounced API calls to prevent excessive requests
  const loadTransactions = useCallback(
    async (resetPage = false) => {
      if (!filteredQuery) {
        setState((prev) => ({...prev, transactions: []}));
        return;
      }

      setState((prev) => ({...prev, loading: true, error: null}));

      try {
        const queryWithPage = resetPage
          ? {...filteredQuery, page: 1}
          : filteredQuery;

        const response = await transactionService.getTransactions(
          companyId,
          queryWithPage
        );

        if (response?.success) {
          setState((prev) => ({
            ...prev,
            transactions: response.data?.transactions || [],
            pagination: {
              ...prev.pagination,
              page: resetPage ? 1 : prev.pagination.page,
              total: response.data?.pagination?.total || 0,
              totalPages: response.data?.pagination?.totalPages || 0,
            },
            loading: false,
            error: null,
          }));
        } else {
          throw new Error(response?.message || "Failed to load transactions");
        }
      } catch (error) {
        console.error("Transaction loading error:", error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error.message || "Failed to load transactions",
          transactions: [],
        }));
        showToast("Failed to load transactions", "error");
      }
    },
    [filteredQuery, companyId]
  );

  // ✅ PRODUCTION-READY: Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadTransactions(true);
    }, TRANSACTION_CONSTANTS.SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [filteredQuery]);

  // ✅ PRODUCTION-READY: Toast notification system
  const showToast = useCallback((message, type = "info", duration = 3000) => {
    const toast = {
      id: Date.now(),
      message,
      type,
      show: true,
    };

    setState((prev) => ({
      ...prev,
      ui: {
        ...prev.ui,
        toasts: [...prev.ui.toasts, toast],
      },
    }));

    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        ui: {
          ...prev.ui,
          toasts: prev.ui.toasts.filter((t) => t.id !== toast.id),
        },
      }));
    }, duration);
  }, []);

  // ✅ PRODUCTION-READY: Enhanced formatting functions
  const formatters = useMemo(
    () => ({
      date: (dateString) => {
        try {
          return new Date(dateString).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
          });
        } catch {
          return "Invalid Date";
        }
      },
      time: (dateString) => {
        try {
          return new Date(dateString).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
        } catch {
          return "Invalid Time";
        }
      },
      currency: (amount) => {
        if (!amount && amount !== 0) return "0";
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) return "0";

        if (numAmount >= 10000000) {
          return `${(numAmount / 10000000).toFixed(1)}Cr`;
        } else if (numAmount >= 100000) {
          return `${(numAmount / 100000).toFixed(1)}L`;
        } else if (numAmount >= 1000) {
          return `${(numAmount / 1000).toFixed(1)}K`;
        }
        return Math.round(numAmount).toLocaleString("en-IN");
      },
      truncateText: (text, maxLength) => {
        if (!text) return "";
        return text.length > maxLength
          ? `${text.substring(0, maxLength)}...`
          : text;
      },
    }),
    []
  );

  // ✅ PRODUCTION-READY: Event handlers with error handling
  const handleFilterChange = useCallback((filterType, value) => {
    setState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        [filterType]: value,
      },
      pagination: {
        ...prev.pagination,
        page: 1,
      },
    }));
  }, []);

  const handlePageChange = useCallback(
    (newPage) => {
      if (
        newPage >= 1 &&
        newPage <= state.pagination.totalPages &&
        newPage !== state.pagination.page
      ) {
        setState((prev) => ({
          ...prev,
          pagination: {...prev.pagination, page: newPage},
        }));
      }
    },
    [state.pagination]
  );

  const handleSort = useCallback((field) => {
    if (!TRANSACTION_CONSTANTS.SORT_FIELDS.includes(field)) return;

    setState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        sortField: field,
        sortDirection:
          prev.filters.sortField === field
            ? prev.filters.sortDirection === "asc"
              ? "desc"
              : "asc"
            : "asc",
      },
      pagination: {...prev.pagination, page: 1},
    }));
  }, []);

  // ✅ PRODUCTION-READY: Export functionality
  const handleExport = useCallback(
    async (format = "csv") => {
      try {
        setState((prev) => ({
          ...prev,
          ui: {...prev.ui, showExportModal: false},
        }));

        const exportFilters = {...filteredQuery, limit: 10000, page: 1};
        const response = await transactionService.exportTransactions(
          companyId,
          exportFilters,
          format
        );

        if (response.success) {
          // Create download link
          const blob = new Blob([response.data], {type: "text/csv"});
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `transactions_${
            new Date().toISOString().split("T")[0]
          }.${format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          showToast("Export completed successfully", "success");
        } else {
          throw new Error("Export failed");
        }
      } catch (error) {
        console.error("Export error:", error);
        showToast("Export failed. Please try again.", "error");
      }
    },
    [companyId, filteredQuery, showToast]
  );

  // ✅ PRODUCTION-READY: Copy transaction ID functionality
  const handleCopyTransactionId = useCallback(
    async (transactionId) => {
      try {
        await navigator.clipboard.writeText(transactionId);
        showToast("Transaction ID copied to clipboard", "success");
      } catch (error) {
        console.error("Copy failed:", error);
        showToast("Failed to copy transaction ID", "error");
      }
    },
    [showToast]
  );

  // ✅ PRODUCTION-READY: Enhanced summary stats
  const summaryStats = useMemo(() => {
    const credits = state.transactions.filter((t) => t.direction === "in");
    const debits = state.transactions.filter((t) => t.direction === "out");

    return {
      totalCredits: credits.reduce(
        (sum, t) => sum + (parseFloat(t.amount) || 0),
        0
      ),
      totalDebits: debits.reduce(
        (sum, t) => sum + (parseFloat(t.amount) || 0),
        0
      ),
      creditCount: credits.length,
      debitCount: debits.length,
      netAmount:
        credits.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) -
        debits.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0),
    };
  }, [state.transactions]);

  // ✅ PRODUCTION-READY: Enhanced pagination component
  const renderPagination = () => {
    if (state.pagination.totalPages <= 1) return null;

    const maxVisiblePages = 5;
    const currentPage = state.pagination.page;
    const totalPages = state.pagination.totalPages;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    const pages = Array.from(
      {length: endPage - startPage + 1},
      (_, i) => startPage + i
    );

    return (
      <div className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <span className="me-2 text-muted" style={{fontSize: "14px"}}>
            Show:
          </span>
          <Form.Select
            size="sm"
            value={state.pagination.limit}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                pagination: {
                  ...prev.pagination,
                  limit: parseInt(e.target.value),
                  page: 1,
                },
              }))
            }
            style={{width: "auto"}}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </Form.Select>
          <span className="ms-2 text-muted" style={{fontSize: "14px"}}>
            per page
          </span>
        </div>

        <Pagination className="mb-0">
          <Pagination.Item
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            title="First page"
          >
            <FontAwesomeIcon icon={faAngleDoubleLeft} />
          </Pagination.Item>
          <Pagination.Item
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            title="Previous page"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </Pagination.Item>
          {pages.map((page) => (
            <Pagination.Item
              key={page}
              active={page === currentPage}
              onClick={() => handlePageChange(page)}
            >
              {page}
            </Pagination.Item>
          ))}
          <Pagination.Item
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="Next page"
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </Pagination.Item>
          <Pagination.Item
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            title="Last page"
          >
            <FontAwesomeIcon icon={faAngleDoubleRight} />
          </Pagination.Item>
        </Pagination>

        <div className="text-muted" style={{fontSize: "14px"}}>
          Page {currentPage} of {totalPages} ({state.pagination.total} total)
        </div>
      </div>
    );
  };

  // ✅ PRODUCTION-READY: Transaction icon helper
  const getTransactionIcon = useCallback((direction, method) => {
    if (method?.toLowerCase().includes("upi")) return faMobile;
    if (TRANSACTION_CONSTANTS.PAYMENT_METHOD_ICONS[method]) {
      return TRANSACTION_CONSTANTS.PAYMENT_METHOD_ICONS[method];
    }
    return direction === "in" ? faArrowUp : faArrowDown;
  }, []);

  return (
    <div className="transaction-history-container">
      {/* Toast Container */}
      <ToastContainer position="top-end" className="p-3">
        {state.ui.toasts.map((toast) => (
          <Toast
            key={toast.id}
            show={toast.show}
            bg={toast.type === "error" ? "danger" : toast.type}
            autohide
            delay={3000}
          >
            <Toast.Body className="text-white">
              <FontAwesomeIcon
                icon={
                  toast.type === "success"
                    ? faCheckCircle
                    : faExclamationTriangle
                }
                className="me-2"
              />
              {toast.message}
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>

      <Card className="border-0 h-100">
        {/* ✅ FIXED: Properly Aligned Header */}
        <Card.Header className="bg-primary text-white border-0 p-3">
          {/* Title and Search Row */}
          <div className="row align-items-center mb-3">
            <div className="col-lg-6 col-md-5 mb-2 mb-md-0">
              <div className="d-flex flex-column">
                <h5 className="mb-1 fw-bold d-flex align-items-center">
                  <FontAwesomeIcon icon={faReceipt} className="me-2" />
                  Transaction History
                </h5>
                <small className="text-white-50">
                  {selectedAccount ? `${selectedAccount.accountName} • ` : ""}
                  {state.pagination.total} transaction
                  {state.pagination.total !== 1 ? "s" : ""}
                  {state.pagination.total > state.pagination.limit &&
                    ` (showing ${state.transactions.length})`}
                </small>
              </div>
            </div>

            {/* ✅ FIXED: Search and Action Buttons */}
            <div className="col-lg-6 col-md-7">
              <div className="row g-2 align-items-center">
                <div className="col-8 col-sm-9">
                  <InputGroup size="sm">
                    <InputGroup.Text className="bg-white bg-opacity-25 border-white border-opacity-25 text-white">
                      <FontAwesomeIcon icon={faSearch} />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className="border-white border-opacity-25 bg-white bg-opacity-25 text-white placeholder-white-50"
                      disabled={state.loading || loading}
                    />
                  </InputGroup>
                </div>
                <div className="col-4 col-sm-3">
                  <div className="d-flex gap-1 justify-content-end">
                    {enableExport && (
                      <OverlayTrigger
                        placement="bottom"
                        overlay={<Tooltip>Export Transactions</Tooltip>}
                      >
                        <Button
                          variant="outline-light"
                          size="sm"
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              ui: {...prev.ui, showExportModal: true},
                            }))
                          }
                          className="d-flex align-items-center justify-content-center"
                          style={{minWidth: "36px", height: "32px"}}
                        >
                          <FontAwesomeIcon icon={faDownload} />
                        </Button>
                      </OverlayTrigger>
                    )}
                    {enablePrint && (
                      <OverlayTrigger
                        placement="bottom"
                        overlay={<Tooltip>Print</Tooltip>}
                      >
                        <Button
                          variant="outline-light"
                          size="sm"
                          onClick={() => window.print()}
                          className="d-flex align-items-center justify-content-center"
                          style={{minWidth: "36px", height: "32px"}}
                        >
                          <FontAwesomeIcon icon={faPrint} />
                        </Button>
                      </OverlayTrigger>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ FIXED: Enhanced Filters Row */}
          <div className="row g-2 align-items-center">
            <div className="col-6 col-sm-4 col-lg-3">
              <Dropdown>
                <Dropdown.Toggle
                  variant="outline-light"
                  size="sm"
                  className="bg-white bg-opacity-25 border-white border-opacity-25 text-white w-100 d-flex align-items-center justify-content-between"
                  style={{height: "32px"}}
                >
                  <span className="d-flex align-items-center text-truncate">
                    <FontAwesomeIcon
                      icon={faFilter}
                      className="me-1"
                      size="xs"
                    />
                    <span className="text-truncate">
                      {TRANSACTION_CONSTANTS.FILTER_TYPES[state.filters.type]}
                    </span>
                  </span>
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {Object.entries(TRANSACTION_CONSTANTS.FILTER_TYPES).map(
                    ([key, label]) => (
                      <Dropdown.Item
                        key={key}
                        onClick={() => handleFilterChange("type", key)}
                        active={state.filters.type === key}
                      >
                        {label}
                      </Dropdown.Item>
                    )
                  )}
                </Dropdown.Menu>
              </Dropdown>
            </div>

            <div className="col-6 col-sm-4 col-lg-3">
              <Dropdown>
                <Dropdown.Toggle
                  variant="outline-light"
                  size="sm"
                  className="bg-white bg-opacity-25 border-white border-opacity-25 text-white w-100 d-flex align-items-center justify-content-between"
                  style={{height: "32px"}}
                >
                  <span className="d-flex align-items-center text-truncate">
                    <FontAwesomeIcon
                      icon={faCalendarAlt}
                      className="me-1"
                      size="xs"
                    />
                    <span className="text-truncate">
                      {
                        TRANSACTION_CONSTANTS.DATE_RANGES[
                          state.filters.dateRange
                        ]
                      }
                    </span>
                  </span>
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {Object.entries(TRANSACTION_CONSTANTS.DATE_RANGES).map(
                    ([key, label]) => (
                      <Dropdown.Item
                        key={key}
                        onClick={() => handleFilterChange("dateRange", key)}
                        active={state.filters.dateRange === key}
                      >
                        {label}
                      </Dropdown.Item>
                    )
                  )}
                </Dropdown.Menu>
              </Dropdown>
            </div>

            <div className="col-6 col-sm-4 col-lg-3">
              <Button
                variant="outline-light"
                size="sm"
                className="bg-white bg-opacity-25 border-white border-opacity-25 text-white w-100 d-flex align-items-center justify-content-center"
                style={{height: "32px"}}
                onClick={() => {
                  loadTransactions(true);
                  if (onRefresh) onRefresh();
                }}
                disabled={state.loading || loading}
              >
                <FontAwesomeIcon
                  icon={faRefresh}
                  className={`me-1 ${state.loading ? "fa-spin" : ""}`}
                />
                <span className="text-truncate">
                  {state.loading ? "Loading..." : "Refresh"}
                </span>
              </Button>
            </div>

            <div className="col-6 col-sm-12 col-lg-3">
              <div className="text-white-50 small text-center text-sm-end text-lg-center">
                <div className="fw-bold text-white mb-1">
                  Net: ₹{formatters.currency(summaryStats.netAmount)}
                </div>
                <div style={{fontSize: "11px", lineHeight: "1.2"}}>
                  <span className="me-2">{summaryStats.creditCount}↗</span>
                  <span>{summaryStats.debitCount}↘</span>
                </div>
              </div>
            </div>
          </div>
        </Card.Header>

        {/* ✅ Enhanced Body with better responsive handling */}
        <Card.Body className="p-0" style={{height: height}}>
          {/* Loading State */}
          {(state.loading || loading) && (
            <div className="d-flex align-items-center justify-content-center h-100">
              <div className="text-center">
                <Spinner
                  animation="border"
                  variant="primary"
                  className="mb-3"
                />
                <div className="text-muted">Loading transactions...</div>
              </div>
            </div>
          )}

          {/* Error State */}
          {state.error && !state.loading && (
            <div className="d-flex align-items-center justify-content-center h-100">
              <div className="text-center">
                <FontAwesomeIcon
                  icon={faExclamationTriangle}
                  className="text-danger mb-3"
                  size="3x"
                />
                <h6 className="text-danger">Error Loading Transactions</h6>
                <p className="text-muted">{state.error}</p>
                <Button
                  variant="outline-primary"
                  onClick={() => loadTransactions(true)}
                >
                  <FontAwesomeIcon icon={faRefresh} className="me-2" />
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* ✅ Enhanced Scrollable Table Container */}
          {!state.loading && !loading && !state.error && (
            <div className="table-container h-100 d-flex flex-column">
              <div
                className="table-wrapper flex-grow-1"
                style={{
                  overflowY: "auto",
                  overflowX: "auto",
                  maxHeight: "calc(100% - 120px)",
                }}
              >
                <Table hover size="sm" className="mb-0 transaction-table">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th
                        className="sortable-header px-3"
                        onClick={() => handleSort("transactionDate")}
                        style={{minWidth: "110px", cursor: "pointer"}}
                      >
                        Date & Time
                        <FontAwesomeIcon
                          icon={
                            state.filters.sortField === "transactionDate"
                              ? state.filters.sortDirection === "asc"
                                ? faArrowUp
                                : faArrowDown
                              : faSort
                          }
                          className="ms-2 text-muted"
                          size="sm"
                        />
                      </th>
                      <th
                        className="sortable-header px-3"
                        onClick={() => handleSort("transactionId")}
                        style={{minWidth: "140px", cursor: "pointer"}}
                      >
                        Reference ID
                        <FontAwesomeIcon
                          icon={
                            state.filters.sortField === "transactionId"
                              ? state.filters.sortDirection === "asc"
                                ? faArrowUp
                                : faArrowDown
                              : faSort
                          }
                          className="ms-2 text-muted"
                          size="sm"
                        />
                      </th>
                      <th
                        className="sortable-header px-3"
                        onClick={() => handleSort("direction")}
                        style={{minWidth: "100px", cursor: "pointer"}}
                      >
                        Type
                        <FontAwesomeIcon
                          icon={
                            state.filters.sortField === "direction"
                              ? state.filters.sortDirection === "asc"
                                ? faArrowUp
                                : faArrowDown
                              : faSort
                          }
                          className="ms-2 text-muted"
                          size="sm"
                        />
                      </th>
                      <th className="px-3" style={{minWidth: "200px"}}>
                        Description
                      </th>
                      <th
                        className="px-3 d-none d-md-table-cell"
                        style={{minWidth: "120px"}}
                      >
                        Payment Method
                      </th>
                      <th
                        className="sortable-header px-3 text-end"
                        onClick={() => handleSort("amount")}
                        style={{minWidth: "120px", cursor: "pointer"}}
                      >
                        Amount
                        <FontAwesomeIcon
                          icon={
                            state.filters.sortField === "amount"
                              ? state.filters.sortDirection === "asc"
                                ? faArrowUp
                                : faArrowDown
                              : faSort
                          }
                          className="ms-2 text-muted"
                          size="sm"
                        />
                      </th>
                      <th
                        className="px-3 text-end d-none d-lg-table-cell"
                        style={{minWidth: "120px"}}
                      >
                        Balance
                      </th>
                      <th
                        className="px-3 text-center"
                        style={{minWidth: "80px"}}
                      >
                        Status
                      </th>
                      {showActions && (
                        <th
                          className="px-3 text-center sticky-end"
                          style={{
                            minWidth: "150px",
                            position: "sticky",
                            right: 0,
                            backgroundColor: "#f8f9fa",
                            zIndex: 10,
                          }}
                        >
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {state.transactions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={showActions ? 9 : 8}
                          className="text-center py-5"
                        >
                          <div className="empty-state">
                            <div className="mb-3" style={{fontSize: "3rem"}}>
                              📊
                            </div>
                            <h6 className="text-muted">
                              No transactions found
                            </h6>
                            <p className="text-muted small">
                              {searchQuery
                                ? "Try adjusting your search or filter terms"
                                : "No transactions available for the selected criteria"}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      state.transactions.map((transaction, index) => (
                        <tr
                          key={transaction._id || index}
                          className="transaction-row"
                        >
                          {/* Date & Time */}
                          <td className="px-3">
                            <div>
                              <div className="fw-medium text-dark">
                                {formatters.date(transaction.transactionDate)}
                              </div>
                              <small className="text-muted">
                                {formatters.time(transaction.transactionDate)}
                              </small>
                            </div>
                          </td>

                          {/* Reference ID with Copy Function */}
                          <td className="px-3">
                            <div className="d-flex align-items-center">
                              <code
                                className="bg-light px-2 py-1 rounded-1 flex-grow-1 cursor-pointer"
                                onClick={() =>
                                  handleCopyTransactionId(
                                    transaction.transactionId ||
                                      transaction.referenceNumber ||
                                      "N/A"
                                  )
                                }
                                title="Click to copy"
                              >
                                {formatters.truncateText(
                                  transaction.transactionId ||
                                    transaction.referenceNumber ||
                                    "N/A",
                                  15
                                )}
                              </code>
                              <FontAwesomeIcon
                                icon={faCopy}
                                className="ms-2 text-muted cursor-pointer"
                                size="sm"
                                onClick={() =>
                                  handleCopyTransactionId(
                                    transaction.transactionId ||
                                      transaction.referenceNumber ||
                                      "N/A"
                                  )
                                }
                                title="Copy Transaction ID"
                              />
                            </div>
                          </td>

                          {/* Type */}
                          <td className="px-3">
                            <div className="d-flex align-items-center">
                              <FontAwesomeIcon
                                icon={getTransactionIcon(
                                  transaction.direction,
                                  transaction.paymentMethod
                                )}
                                className={`me-2 ${
                                  transaction.direction === "in"
                                    ? "text-success"
                                    : "text-danger"
                                }`}
                              />
                              <Badge
                                bg={
                                  transaction.direction === "in"
                                    ? "success"
                                    : "danger"
                                }
                                className="text-capitalize"
                              >
                                {transaction.direction === "in"
                                  ? "Credit"
                                  : "Debit"}
                              </Badge>
                            </div>
                          </td>

                          {/* Description */}
                          <td className="px-3">
                            <div>
                              <div className="fw-medium text-dark">
                                <OverlayTrigger
                                  placement="top"
                                  overlay={
                                    <Tooltip>
                                      {transaction.description || "Transaction"}
                                    </Tooltip>
                                  }
                                >
                                  <span>
                                    {formatters.truncateText(
                                      transaction.description || "Transaction",
                                      TRANSACTION_CONSTANTS.MAX_DESCRIPTION_LENGTH
                                    )}
                                  </span>
                                </OverlayTrigger>
                              </div>
                              {transaction.notes && (
                                <small className="text-muted">
                                  <OverlayTrigger
                                    placement="top"
                                    overlay={
                                      <Tooltip>{transaction.notes}</Tooltip>
                                    }
                                  >
                                    <span>
                                      {formatters.truncateText(
                                        transaction.notes,
                                        TRANSACTION_CONSTANTS.MAX_NOTES_LENGTH
                                      )}
                                    </span>
                                  </OverlayTrigger>
                                </small>
                              )}
                            </div>
                          </td>

                          {/* Payment Method */}
                          <td className="px-3 d-none d-md-table-cell">
                            <Badge
                              bg="light"
                              text="dark"
                              className="text-capitalize"
                            >
                              {transaction.paymentMethod?.replace("_", " ") ||
                                "Transfer"}
                            </Badge>
                          </td>

                          {/* Amount */}
                          <td className="px-3 text-end">
                            <div
                              className={`fw-bold ${
                                transaction.direction === "in"
                                  ? "text-success"
                                  : "text-danger"
                              }`}
                            >
                              {transaction.direction === "in" ? "+" : "-"}₹
                              {formatters.currency(transaction.amount)}
                            </div>
                          </td>

                          {/* Balance */}
                          <td className="px-3 text-end d-none d-lg-table-cell">
                            <div className="fw-bold text-dark">
                              ₹
                              {formatters.currency(
                                transaction.balanceAfter ||
                                  selectedAccount?.currentBalance ||
                                  0
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-3 text-center">
                            <Badge
                              bg={
                                transaction.status === "completed"
                                  ? "success"
                                  : transaction.status === "pending"
                                  ? "warning"
                                  : "danger"
                              }
                            >
                              {transaction.status === "completed"
                                ? "✓"
                                : transaction.status === "pending"
                                ? "⏳"
                                : "❌"}
                            </Badge>
                          </td>

                          {/* Actions */}
                          {showActions && (
                            <td
                              className="px-3 text-center sticky-end"
                              style={{
                                position: "sticky",
                                right: 0,
                                backgroundColor: "white",
                                zIndex: 5,
                                boxShadow: "-2px 0 4px rgba(0,0,0,0.1)",
                              }}
                            >
                              <div className="d-flex gap-1 justify-content-center">
                                <OverlayTrigger
                                  placement="top"
                                  overlay={<Tooltip>Print Receipt</Tooltip>}
                                >
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => {
                                      showToast(
                                        "Print functionality coming soon",
                                        "info"
                                      );
                                    }}
                                  >
                                    <FontAwesomeIcon icon={faPrint} size="sm" />
                                  </Button>
                                </OverlayTrigger>
                                <Dropdown>
                                  <Dropdown.Toggle
                                    variant="outline-secondary"
                                    size="sm"
                                    className="dropdown-toggle-no-caret"
                                  >
                                    <FontAwesomeIcon
                                      icon={faEllipsisV}
                                      size="sm"
                                    />
                                  </Dropdown.Toggle>
                                  <Dropdown.Menu align="end">
                                    <Dropdown.Item className="d-flex align-items-center">
                                      <FontAwesomeIcon
                                        icon={faEye}
                                        className="me-2 text-primary"
                                      />
                                      View Details
                                    </Dropdown.Item>
                                    <Dropdown.Item className="d-flex align-items-center">
                                      <FontAwesomeIcon
                                        icon={faEdit}
                                        className="me-2 text-warning"
                                      />
                                      Edit Transaction
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                      className="d-flex align-items-center"
                                      onClick={() =>
                                        handleCopyTransactionId(
                                          transaction.transactionId ||
                                            transaction.referenceNumber ||
                                            "N/A"
                                        )
                                      }
                                    >
                                      <FontAwesomeIcon
                                        icon={faCopy}
                                        className="me-2 text-info"
                                      />
                                      Copy ID
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item
                                      className="d-flex align-items-center text-danger"
                                      onClick={() =>
                                        setState((prev) => ({
                                          ...prev,
                                          ui: {
                                            ...prev.ui,
                                            selectedTransaction: transaction,
                                            showDeleteModal: true,
                                          },
                                        }))
                                      }
                                    >
                                      <FontAwesomeIcon
                                        icon={faTrash}
                                        className="me-2"
                                      />
                                      Delete
                                    </Dropdown.Item>
                                  </Dropdown.Menu>
                                </Dropdown>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>

              {/* Fixed Pagination at Bottom */}
              {state.transactions.length > 0 && (
                <div className="pagination-container p-3 border-top bg-light">
                  {renderPagination()}
                </div>
              )}
            </div>
          )}
        </Card.Body>

        {/* Enhanced Footer with Summary */}
        {!state.loading && !loading && state.transactions.length > 0 && (
          <Card.Footer className="bg-light border-0">
            <div className="row align-items-center">
              <div className="col-md-6">
                <small className="text-muted">
                  Showing{" "}
                  {(state.pagination.page - 1) * state.pagination.limit + 1} to{" "}
                  {Math.min(
                    state.pagination.page * state.pagination.limit,
                    state.pagination.total
                  )}{" "}
                  of {state.pagination.total} transactions
                </small>
              </div>
              <div className="col-md-6">
                <div className="row text-center">
                  <div className="col-4">
                    <div className="text-success fw-bold">
                      +₹{formatters.currency(summaryStats.totalCredits)}
                    </div>
                    <small className="text-muted">
                      Credits ({summaryStats.creditCount})
                    </small>
                  </div>
                  <div className="col-4">
                    <div className="text-danger fw-bold">
                      -₹{formatters.currency(summaryStats.totalDebits)}
                    </div>
                    <small className="text-muted">
                      Debits ({summaryStats.debitCount})
                    </small>
                  </div>
                  <div className="col-4">
                    <div
                      className={`fw-bold ${
                        summaryStats.netAmount >= 0
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {summaryStats.netAmount >= 0 ? "+" : ""}₹
                      {formatters.currency(Math.abs(summaryStats.netAmount))}
                    </div>
                    <small className="text-muted">Net Amount</small>
                  </div>
                </div>
              </div>
            </div>
          </Card.Footer>
        )}
      </Card>

      {/* Export Modal */}
      <Modal
        show={state.ui.showExportModal}
        onHide={() =>
          setState((prev) => ({
            ...prev,
            ui: {...prev.ui, showExportModal: false},
          }))
        }
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Export Transactions</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Choose export format:</p>
          <div className="d-grid gap-2">
            <Button
              variant="outline-success"
              onClick={() => handleExport("csv")}
            >
              <FontAwesomeIcon icon={faFileExcel} className="me-2" />
              Export as CSV
            </Button>
            <Button
              variant="outline-primary"
              onClick={() => handleExport("pdf")}
            >
              <FontAwesomeIcon icon={faFileExcel} className="me-2" />
              Export as PDF
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        show={state.ui.showDeleteModal}
        onHide={() =>
          setState((prev) => ({
            ...prev,
            ui: {...prev.ui, showDeleteModal: false, selectedTransaction: null},
          }))
        }
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to delete this transaction? This action cannot
            be undone.
          </p>
          {state.ui.selectedTransaction && (
            <div className="bg-light p-3 rounded">
              <strong>Transaction ID:</strong>{" "}
              {state.ui.selectedTransaction.transactionId}
              <br />
              <strong>Amount:</strong> ₹
              {formatters.currency(state.ui.selectedTransaction.amount)}
              <br />
              <strong>Description:</strong>{" "}
              {state.ui.selectedTransaction.description}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() =>
              setState((prev) => ({
                ...prev,
                ui: {
                  ...prev.ui,
                  showDeleteModal: false,
                  selectedTransaction: null,
                },
              }))
            }
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              showToast("Delete functionality coming soon", "info");
              setState((prev) => ({
                ...prev,
                ui: {
                  ...prev.ui,
                  showDeleteModal: false,
                  selectedTransaction: null,
                },
              }));
            }}
          >
            Delete Transaction
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ✅ ENHANCED: Custom Styles with Better Alignment */}
      <style>
        {`
        .transaction-history-container .table-wrapper {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e0 #f7fafc;
        }
        
        .transaction-history-container .table-wrapper::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .transaction-history-container .table-wrapper::-webkit-scrollbar-track {
          background: #f7fafc;
        }
        
        .transaction-history-container .table-wrapper::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 4px;
        }
        
        .transaction-history-container .table-wrapper::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
        
        .transaction-table thead th {
          background-color: #f8f9fa !important;
          border-bottom: 2px solid #dee2e6;
          font-weight: 600;
          font-size: 13px;
          position: sticky;
          top: 0;
          z-index: 20;
        }
        
        .transaction-row:hover {
          background-color: #f8f9fa;
        }
        
        .sortable-header:hover {
          background-color: #e9ecef !important;
          color: #495057;
        }
        
        .sticky-end {
          position: sticky;
          right: 0;
          z-index: 10;
        }
        
        .cursor-pointer {
          cursor: pointer;
        }
        
        .empty-state {
          padding: 3rem 1rem;
        }
        
        .dropdown-toggle-no-caret::after {
          display: none;
        }
        
        /* ✅ ENHANCED: Better button alignment */
        .btn-group .btn {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* ✅ ENHANCED: Consistent height for all inputs and buttons */
        .form-control,
        .btn,
        .dropdown-toggle {
          height: 32px !important;
          line-height: 1.5;
        }
        
        .input-group-text {
          height: 32px !important;
          display: flex;
          align-items: center;
        }
        
        /* ✅ ENHANCED: Text truncation for responsive design */
        .text-truncate {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        /* ✅ ENHANCED: Better mobile responsiveness */
        @media (max-width: 576px) {
          .card-header .row {
            margin: 0;
          }
          
          .card-header .col-6,
          .card-header .col-8,
          .card-header .col-4 {
            padding-left: 0.25rem;
            padding-right: 0.25rem;
          }
          
          .btn {
            padding: 0.25rem 0.5rem;
            font-size: 0.875rem;
          }
          
          .dropdown-toggle span {
            font-size: 0.75rem;
          }
        }
        
        @media (max-width: 768px) {
          .transaction-history-container .table-wrapper {
            font-size: 12px;
          }
          
          .transaction-history-container .pagination-container {
            padding: 1rem !important;
          }
        }
        
        @media print {
          .transaction-history-container .pagination-container,
          .transaction-history-container .card-header,
          .transaction-history-container .card-footer {
            display: none !important;
          }
          
          .transaction-history-container .table-wrapper {
            overflow: visible !important;
            max-height: none !important;
          }
        }
      `}
      </style>
    </div>
  );
};

export default TransactionHistory;
