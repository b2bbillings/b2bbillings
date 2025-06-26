import React, {useState, useCallback, useMemo} from "react";
import {Button, Table, Badge, Dropdown, Form} from "react-bootstrap";
import {useNavigate, useLocation} from "react-router-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faChevronUp,
  faChevronDown,
  faTimes,
  faSearch,
  faFileExcel,
  faPrint,
  faSort,
  faEllipsisV,
  faEye,
  faEdit,
  faTrash,
  faShare,
  faArrowUp,
  faArrowDown,
  faExchangeAlt,
  faFileInvoice,
  faDownload,
  faPlus,
  faCheckCircle,
  faExclamationTriangle,
  faBan,
  faClock,
  faUndo,
  faCopy,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

function SalesInvoicesTable({
  transactions = [],
  onViewTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onPrintTransaction,
  onShareTransaction,
  onConvertTransaction,
  onDownloadTransaction,
  onCreateNew,
  mode = "invoices",
  documentType = "invoice",
  companyId,
  currentUser,
  addToast,
  labels,
  isQuotationsMode,
  isLoading = false,
  searchTerm = "",
  onSearchChange,
  sortBy = "date",
  sortOrder = "desc",
  onSort,
  filterStatus = "all",
  onFilterChange,
  showHeader = true,
  enableActions = true,
  enableBulkActions = false,
  selectedTransactions = [],
  onSelectionChange,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState(searchTerm);
  const [sortField, setSortField] = useState(sortBy);
  const [sortDirection, setSortDirection] = useState(sortOrder);
  const [showReturnedTransactions, setShowReturnedTransactions] =
    useState(false);

  // ✅ FIXED: Add state for deleting transactions
  const [deletingTransactions, setDeletingTransactions] = useState(new Set());

  // Local search and filter state if not provided
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [localSortBy, setLocalSortBy] = useState(sortBy);
  const [localSortOrder, setLocalSortOrder] = useState(sortOrder);
  const [localFilterStatus, setLocalFilterStatus] = useState(filterStatus);

  const isQuotationMode = useMemo(() => {
    return (
      isQuotationsMode || mode === "quotations" || documentType === "quotation"
    );
  }, [isQuotationsMode, mode, documentType]);

  // ✅ FIXED: Update search handling to work with parent component
  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchQuery(value);
      setLocalSearchTerm(value);
      if (onSearchChange) {
        onSearchChange(e);
      }
    },
    [onSearchChange]
  );

  // ✅ FIXED: Update sort handling
  const handleSort = useCallback(
    (field) => {
      let newSortOrder = "asc";
      if (sortField === field || localSortBy === field) {
        newSortOrder =
          sortDirection === "asc" || localSortOrder === "asc" ? "desc" : "asc";
      }

      setSortField(field);
      setSortDirection(newSortOrder);
      setLocalSortBy(field);
      setLocalSortOrder(newSortOrder);

      if (onSort) {
        onSort(field, newSortOrder);
      }
    },
    [sortField, sortDirection, localSortBy, localSortOrder, onSort]
  );

  // Filter and separate returned/cancelled transactions
  const separatedTransactions = useMemo(() => {
    const active = [];
    const returned = [];

    transactions.forEach((transaction) => {
      const status = (transaction.status || "").toLowerCase();
      const transactionType = (transaction.transaction || "").toLowerCase();

      if (
        status === "cancelled" ||
        status === "deleted" ||
        status === "void" ||
        transactionType === "return" ||
        transactionType === "credit note" ||
        transaction.isReturn ||
        transaction.isVoid
      ) {
        returned.push(transaction);
      } else {
        active.push(transaction);
      }
    });

    return {active, returned};
  }, [transactions]);

  // ✅ FIXED: Use effective search term
  const effectiveSearchTerm = searchTerm || localSearchTerm || searchQuery;

  // Filter transactions for search
  const filteredActiveTransactions = separatedTransactions.active.filter(
    (transaction) =>
      transaction.partyName
        ?.toLowerCase()
        .includes(effectiveSearchTerm.toLowerCase()) ||
      transaction.invoiceNo
        ?.toLowerCase()
        .includes(effectiveSearchTerm.toLowerCase()) ||
      transaction.quotationNumber
        ?.toLowerCase()
        .includes(effectiveSearchTerm.toLowerCase()) ||
      transaction.transaction
        ?.toLowerCase()
        .includes(effectiveSearchTerm.toLowerCase()) ||
      transaction.paymentType
        ?.toLowerCase()
        .includes(effectiveSearchTerm.toLowerCase()) ||
      transaction.employeeName
        ?.toLowerCase()
        .includes(effectiveSearchTerm.toLowerCase())
  );

  const filteredReturnedTransactions = separatedTransactions.returned.filter(
    (transaction) =>
      transaction.partyName
        ?.toLowerCase()
        .includes(effectiveSearchTerm.toLowerCase()) ||
      transaction.invoiceNo
        ?.toLowerCase()
        .includes(effectiveSearchTerm.toLowerCase()) ||
      transaction.quotationNumber
        ?.toLowerCase()
        .includes(effectiveSearchTerm.toLowerCase()) ||
      transaction.transaction
        ?.toLowerCase()
        .includes(effectiveSearchTerm.toLowerCase()) ||
      transaction.paymentType
        ?.toLowerCase()
        .includes(effectiveSearchTerm.toLowerCase()) ||
      transaction.employeeName
        ?.toLowerCase()
        .includes(effectiveSearchTerm.toLowerCase())
  );

  const getTransactionStatus = useCallback(
    (transaction) => {
      const status = (transaction.status || "").toLowerCase();
      const quotationStatus = (transaction.quotationStatus || "").toLowerCase();
      const transactionType = (transaction.transaction || "").toLowerCase();
      const balance = parseFloat(transaction.balance || 0);
      const amount = parseFloat(transaction.amount || 0);

      const effectiveStatus = status || quotationStatus || "unknown";

      const isCompleted = effectiveStatus === "completed";
      const isCancelled = ["cancelled", "canceled", "deleted", "void"].includes(
        effectiveStatus
      );
      const isReturned = transactionType === "return" || transaction.isReturn;
      const isDraft = effectiveStatus === "draft";
      const isPending = effectiveStatus === "pending";
      const isApproved = effectiveStatus === "approved";
      const isConverted =
        effectiveStatus === "converted" || transaction.convertedToInvoice;

      const isPaid = balance === 0 && amount > 0;
      const isPartiallyPaid = balance > 0 && balance < amount;

      return {
        status: effectiveStatus,
        isCompleted,
        isCancelled,
        isReturned,
        isDraft,
        isPending,
        isApproved,
        isConverted,
        isPaid,
        isPartiallyPaid,
        canView: true,
        canEdit: !isCancelled && !isConverted && !isReturned,
        canDelete: !isCancelled && !isConverted && !isReturned,
        canPrint: !isCancelled,
        canShare: !isCancelled,
        canDownload: !isCancelled,
        canConvert:
          isQuotationMode &&
          !isCancelled &&
          !isConverted &&
          !isReturned &&
          (isApproved || isCompleted),
        shouldWarnOnDelete: isPaid && isCompleted,
        shouldWarnOnEdit: isPaid && isCompleted,
        deleteWarning: isPaid && isCompleted ? "Fully Paid" : null,
      };
    },
    [isQuotationMode]
  );

  const getStatusBadge = useCallback(
    (transaction) => {
      const statusInfo = getTransactionStatus(transaction);
      const transactionType = (transaction.transaction || "").toLowerCase();
      let variant = "secondary";
      let text = statusInfo.status;
      let icon = null;

      if (statusInfo.isReturned || transactionType === "return") {
        variant = "danger";
        text = "Returned";
        icon = faUndo;
      } else if (statusInfo.isCancelled) {
        variant = "danger";
        text = "Cancelled";
        icon = faBan;
      } else if (statusInfo.isConverted) {
        variant = "info";
        text = "Converted";
        icon = faExchangeAlt;
      } else if (statusInfo.isPaid) {
        variant = "success";
        text = "Paid";
        icon = faCheckCircle;
      } else if (statusInfo.isPartiallyPaid) {
        variant = "warning";
        text = "Partial";
        icon = faExclamationTriangle;
      } else if (statusInfo.isCompleted) {
        variant = "success";
        text = "Completed";
        icon = faCheckCircle;
      } else if (statusInfo.isApproved) {
        variant = "success";
        text = "Approved";
        icon = faCheckCircle;
      } else if (statusInfo.isPending) {
        variant = "warning";
        text = "Pending";
        icon = faClock;
      } else if (statusInfo.isDraft) {
        variant = "secondary";
        text = "Draft";
        icon = faEdit;
      }

      return (
        <Badge bg={variant} className="d-flex align-items-center gap-1">
          {icon && <FontAwesomeIcon icon={icon} size="sm" />}
          <span>{text.charAt(0).toUpperCase() + text.slice(1)}</span>
        </Badge>
      );
    },
    [getTransactionStatus]
  );

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "₹0";
    const numAmount = parseFloat(amount);

    if (numAmount >= 10000000) {
      return `₹${(numAmount / 10000000).toFixed(1)}Cr`;
    } else if (numAmount >= 100000) {
      return `₹${(numAmount / 100000).toFixed(1)}L`;
    } else if (numAmount >= 1000) {
      return `₹${(numAmount / 1000).toFixed(1)}K`;
    }
    return `₹${Math.round(numAmount)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  };

  const getTransactionIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "sale":
        return "💰";
      case "gst invoice":
        return "📋";
      case "purchase":
        return "🛒";
      case "return":
        return "↩️";
      case "payment":
        return "💳";
      case "quotation":
        return "📝";
      default:
        return "📄";
    }
  };

  const getPaymentTypeVariant = (paymentType) => {
    switch (paymentType?.toLowerCase()) {
      case "cash":
        return "success";
      case "credit":
        return "warning";
      case "online":
        return "info";
      case "cheque":
        return "secondary";
      default:
        return "light";
    }
  };

  const getTransactionVariant = (transaction) => {
    switch (transaction?.toLowerCase()) {
      case "sale":
        return "success";
      case "gst invoice":
        return "primary";
      case "purchase":
        return "info";
      case "return":
        return "danger";
      case "payment":
        return "warning";
      case "quotation":
        return "info";
      default:
        return "light";
    }
  };

  const calculateDisplayAmounts = (transaction) => {
    const baseAmount = parseFloat(transaction.amount || 0);
    const cgst = parseFloat(transaction.cgst || 0);
    const sgst = parseFloat(transaction.sgst || 0);
    const totalTax = cgst + sgst;
    const displayBalance = parseFloat(transaction.balance || 0);

    return {
      amount: baseAmount,
      balance: displayBalance,
      cgst: cgst,
      sgst: sgst,
      totalTax: totalTax,
      baseAmount: baseAmount - totalTax,
    };
  };

  const handleViewTransaction = (transaction) => {
    if (onViewTransaction) {
      onViewTransaction(transaction);
    }
  };

  const handleEditTransaction = (transaction) => {
    const statusInfo = getTransactionStatus(transaction);

    if (!statusInfo.canEdit) {
      let reason = "unknown reason";
      if (statusInfo.isCancelled) {
        reason = "cancelled";
      } else if (statusInfo.isConverted) {
        reason = "already converted";
      } else if (statusInfo.isReturned) {
        reason = "returned";
      } else {
        reason = "not editable";
      }

      addToast?.(
        `Cannot edit ${reason} ${isQuotationMode ? "quotation" : "invoice"}`,
        "warning"
      );
      return;
    }

    if (statusInfo.shouldWarnOnEdit) {
      const confirmed = window.confirm(
        `⚠️ WARNING: This ${
          isQuotationMode ? "quotation" : "invoice"
        } is fully paid.\n\n` +
          `Editing it may create accounting discrepancies.\n\n` +
          `Do you want to continue?`
      );
      if (!confirmed) return;
    }

    const transactionId = transaction.id || transaction._id;
    const basePath = isQuotationMode ? "quotations" : "sales";
    const editPath = `/companies/${companyId}/${basePath}/edit/${transactionId}`;

    navigate(editPath, {
      state: {
        transaction,
        editMode: true,
        returnPath: location.pathname,
      },
    });
  };

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
    } else {
      const basePath = isQuotationMode ? "quotations" : "sales";
      const createPath = `/companies/${companyId}/${basePath}/add`;
      navigate(createPath);
    }
  };

  // ✅ FIXED: Updated delete handler with better state management
  const handleDeleteTransaction = useCallback(
    async (transaction) => {
      const transactionId = transaction.id || transaction._id;

      if (!transactionId) {
        addToast?.("Invalid transaction ID", "error");
        return;
      }

      if (deletingTransactions.has(transactionId)) {
        console.warn("⚠️ Delete already in progress for:", transactionId);
        return;
      }

      const documentName = isQuotationMode ? "quotation" : "invoice";
      const documentNumber =
        transaction.invoiceNo ||
        transaction.quotationNumber ||
        "this transaction";
      const statusInfo = getTransactionStatus(transaction);

      if (!statusInfo.canDelete) {
        let reason = "unknown reason";
        if (statusInfo.isCancelled) {
          reason = "it has already been cancelled";
        } else if (statusInfo.isConverted) {
          reason = "it has been converted to an invoice";
        } else if (statusInfo.isReturned) {
          reason = "it has been returned";
        }

        addToast?.(
          `Cannot delete this ${documentName} because ${reason}.`,
          "warning"
        );
        return;
      }

      const confirmDelete = window.confirm(
        `Are you sure you want to delete ${documentName} ${documentNumber}?\n\n` +
          `This action cannot be undone.`
      );

      if (confirmDelete) {
        try {
          setDeletingTransactions((prev) => new Set(prev).add(transactionId));

          if (onDeleteTransaction) {
            addToast?.(`Deleting ${documentName}...`, "info");
            const result = await onDeleteTransaction(transaction);

            if (result && result.success !== false) {
              // Success handled by parent
            } else {
              throw new Error(
                result?.error || result?.message || "Delete operation failed"
              );
            }
          } else {
            addToast?.("Delete functionality not implemented", "warning");
          }
        } catch (error) {
          addToast?.(
            `Failed to delete ${documentName}: ${error.message}`,
            "error"
          );
        } finally {
          setDeletingTransactions((prev) => {
            const newSet = new Set(prev);
            newSet.delete(transactionId);
            return newSet;
          });
        }
      }
    },
    [
      onDeleteTransaction,
      isQuotationMode,
      addToast,
      deletingTransactions,
      getTransactionStatus,
    ]
  );

  const handleConvertTransaction = (transaction) => {
    const statusInfo = getTransactionStatus(transaction);

    if (!statusInfo.canConvert) {
      addToast?.("Cannot convert this quotation.", "warning");
      return;
    }

    const documentNumber = transaction.quotationNumber || transaction.invoiceNo;
    if (window.confirm(`Convert quotation ${documentNumber} to an invoice?`)) {
      if (onConvertTransaction) {
        onConvertTransaction(transaction);
      } else {
        addToast?.("Convert functionality not implemented", "warning");
      }
    }
  };

  // ✅ UPDATED: ActionButton component matching PurchaseOrderTable style
  const ActionButton = ({transaction}) => {
    const transactionId = transaction._id || transaction.id;
    const isDeleting = deletingTransactions.has(transactionId);
    const isCancelled =
      transaction.status === "cancelled" ||
      transaction.status === "deleted" ||
      transaction.status === "void";
    const statusInfo = getTransactionStatus(transaction);

    const handleDelete = useCallback(
      async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isDeleting || isCancelled) {
          console.warn(
            "⚠️ Cannot delete - transaction is cancelled or being deleted"
          );
          return;
        }

        await handleDeleteTransaction(transaction);
      },
      [transaction, isDeleting, isCancelled, handleDeleteTransaction]
    );

    const handleEdit = useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isCancelled) {
          addToast?.(
            `Cannot edit cancelled ${
              isQuotationMode ? "quotation" : "invoice"
            }`,
            "warning"
          );
          return;
        }

        handleEditTransaction(transaction);
      },
      [
        transaction,
        isCancelled,
        handleEditTransaction,
        addToast,
        isQuotationMode,
      ]
    );

    return (
      <Dropdown>
        <Dropdown.Toggle
          variant={isCancelled ? "outline-secondary" : "outline-secondary"}
          size="sm"
          className={`border-0 ${isCancelled ? "opacity-50" : ""}`}
          id={`dropdown-${transactionId}`}
          disabled={isDeleting}
        >
          <FontAwesomeIcon icon={faEllipsisV} />
        </Dropdown.Toggle>

        <Dropdown.Menu align="end">
          <Dropdown.Item onClick={() => handleViewTransaction(transaction)}>
            <FontAwesomeIcon icon={faEye} className="me-2" />
            View Details
          </Dropdown.Item>

          {enableActions && !isCancelled && (
            <>
              <Dropdown.Item onClick={handleEdit} disabled={isDeleting}>
                <FontAwesomeIcon icon={faEdit} className="me-2" />
                Edit {isQuotationMode ? "Quotation" : "Invoice"}
              </Dropdown.Item>

              {/* Convert Button for Quotations */}
              {statusInfo.canConvert && (
                <Dropdown.Item
                  onClick={() => handleConvertTransaction(transaction)}
                  disabled={isDeleting}
                >
                  <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
                  Convert to Invoice
                </Dropdown.Item>
              )}

              <Dropdown.Divider />
            </>
          )}

          <Dropdown.Item onClick={() => onPrintTransaction?.(transaction)}>
            <FontAwesomeIcon icon={faPrint} className="me-2" />
            Print
          </Dropdown.Item>

          <Dropdown.Item onClick={() => onShareTransaction?.(transaction)}>
            <FontAwesomeIcon icon={faShare} className="me-2" />
            Share
          </Dropdown.Item>

          <Dropdown.Item onClick={() => onDownloadTransaction?.(transaction)}>
            <FontAwesomeIcon icon={faDownload} className="me-2" />
            Download
          </Dropdown.Item>

          {enableActions && !isCancelled && (
            <>
              <Dropdown.Divider />
              <Dropdown.Item
                onClick={handleDelete}
                className="text-danger"
                disabled={isDeleting}
              >
                <FontAwesomeIcon
                  icon={isDeleting ? faSpinner : faTrash}
                  className={`me-2 ${isDeleting ? "fa-spin" : ""}`}
                />
                {isDeleting
                  ? "Deleting..."
                  : `Delete ${isQuotationMode ? "Quotation" : "Invoice"}`}
              </Dropdown.Item>
            </>
          )}
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  // ✅ Enhanced loading component
  const LoadingComponent = () => (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <h5 className="text-muted mt-3">
        Loading {isQuotationMode ? "quotations" : "invoices"}...
      </h5>
      <p className="text-muted small">Please wait while we fetch your data</p>
    </div>
  );

  // ✅ Enhanced empty state component
  const EmptyStateComponent = () => (
    <div className="text-center py-5">
      <FontAwesomeIcon
        icon={isQuotationMode ? faFileInvoice : faFileExcel}
        size="4x"
        className="text-muted mb-4"
      />
      <h4 className="text-muted mb-3">
        No {isQuotationMode ? "Quotations" : "Invoices"} Found
      </h4>
      <p className="text-muted mb-4">
        {effectiveSearchTerm
          ? "Try adjusting your search terms"
          : `Create your first ${
              isQuotationMode ? "quotation" : "sales invoice"
            } to get started`}
      </p>
      <Button
        variant={isQuotationMode ? "info" : "primary"}
        onClick={handleCreateNew}
      >
        <FontAwesomeIcon icon={faPlus} className="me-2" />
        Create {isQuotationMode ? "Quotation" : "Invoice"}
      </Button>
    </div>
  );

  // ✅ Main render logic
  if (isLoading) {
    return <LoadingComponent />;
  }

  if (!transactions || transactions.length === 0) {
    return <EmptyStateComponent />;
  }

  return (
    <>
      <div className="sales-invoices-table-wrapper">
        {/* ✅ UPDATED: Add responsive wrapper */}
        <div className="table-responsive-wrapper">
          <Table responsive hover className="mb-0">
            {/* ✅ UPDATED: Purple-themed header matching PurchaseOrderTable */}
            <thead className="table-header-purple">
              <tr>
                {enableBulkActions && (
                  <th width="40">
                    <Form.Check
                      type="checkbox"
                      checked={
                        selectedTransactions.length === transactions.length &&
                        transactions.length > 0
                      }
                      onChange={(e) => {
                        if (onSelectionChange) {
                          onSelectionChange(
                            e.target.checked
                              ? transactions.map((t) => t._id || t.id)
                              : []
                          );
                        }
                      }}
                      className="purple-checkbox"
                    />
                  </th>
                )}
                <th>
                  <div className="d-flex align-items-center">
                    Date
                    <FontAwesomeIcon
                      icon={faSort}
                      className="ms-1 text-white-50"
                      style={{cursor: "pointer"}}
                      onClick={() => handleSort("date")}
                    />
                  </div>
                </th>
                <th>{isQuotationMode ? "Quote No." : "Invoice No."}</th>
                <th>Customer</th>
                <th>Type</th>
                <th className="text-end">
                  <div className="d-flex align-items-center justify-content-end">
                    Amount
                    <FontAwesomeIcon
                      icon={faSort}
                      className="ms-1 text-white-50"
                      style={{cursor: "pointer"}}
                      onClick={() => handleSort("amount")}
                    />
                  </div>
                </th>
                <th className="text-end">Paid</th>
                <th className="text-end">Balance</th>
                <th>Status</th>
                <th>Payment</th>
                {enableActions && <th className="text-center">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {/* Active Transactions */}
              {filteredActiveTransactions.map((transaction, index) => {
                const calculatedAmounts = calculateDisplayAmounts(transaction);
                const statusInfo = getTransactionStatus(transaction);
                const transactionType = (
                  transaction.transaction || ""
                ).toLowerCase();
                const isReturned =
                  statusInfo.isReturned || transactionType === "return";
                const isCancelled = statusInfo.isCancelled && !isReturned;
                const transactionId = transaction._id || transaction.id;
                const isSelected = selectedTransactions.includes(transactionId);

                return (
                  <tr
                    key={transactionId || index}
                    className={`
                      ${isSelected ? "table-active-purple" : ""} 
                      ${isReturned ? "table-danger bg-opacity-10" : ""} 
                      ${isCancelled ? "cancelled-transaction-row" : ""}
                    `}
                    style={{cursor: "pointer"}}
                    onClick={() => handleViewTransaction(transaction)}
                  >
                    {enableBulkActions && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <Form.Check
                          type="checkbox"
                          checked={isSelected}
                          disabled={isCancelled}
                          onChange={(e) => {
                            if (onSelectionChange && !isCancelled) {
                              const newSelection = e.target.checked
                                ? [...selectedTransactions, transactionId]
                                : selectedTransactions.filter(
                                    (id) => id !== transactionId
                                  );
                              onSelectionChange(newSelection);
                            }
                          }}
                        />
                      </td>
                    )}

                    {/* Date Cell */}
                    <td className={isCancelled ? "text-muted" : ""}>
                      <small
                        className={isCancelled ? "text-muted" : "text-muted"}
                      >
                        {formatDate(transaction.date)}
                      </small>
                      {transaction.dueDate && (
                        <div>
                          <small className="text-muted">
                            Due: {formatDate(transaction.dueDate)}
                          </small>
                        </div>
                      )}
                    </td>

                    {/* Invoice/Quote Number Cell */}
                    <td>
                      <strong
                        className={
                          isCancelled
                            ? "text-muted text-decoration-line-through"
                            : isQuotationMode
                            ? "text-info"
                            : "text-primary"
                        }
                      >
                        {transaction.invoiceNo ||
                          transaction.quotationNumber ||
                          "N/A"}
                      </strong>
                      {isReturned && (
                        <div className="mt-1">
                          <small className="text-danger fst-italic fw-medium">
                            <FontAwesomeIcon icon={faUndo} className="me-1" />
                            Returned
                          </small>
                        </div>
                      )}
                      {isCancelled && (
                        <div className="mt-1">
                          <small className="text-muted fst-italic fw-medium">
                            <FontAwesomeIcon icon={faTrash} className="me-1" />
                            Cancelled
                          </small>
                        </div>
                      )}
                    </td>

                    {/* Customer Cell */}
                    <td>
                      <div>
                        <div
                          className={`fw-medium ${
                            isCancelled ? "text-muted" : ""
                          }`}
                          title={transaction.partyName}
                        >
                          {transaction.partyName || "N/A"}
                        </div>
                        {transaction.partyPhone && (
                          <small className="text-muted">
                            📞 {transaction.partyPhone}
                          </small>
                        )}
                      </div>
                    </td>

                    {/* Transaction Type Cell */}
                    <td className="text-center">
                      <div className="d-flex flex-column align-items-center">
                        <span className="mb-1 fs-5">
                          {getTransactionIcon(transaction.transaction)}
                        </span>
                        <Badge
                          bg={
                            isCancelled
                              ? "secondary"
                              : getTransactionVariant(transaction.transaction)
                          }
                          className={`small fw-medium ${
                            isCancelled ? "opacity-50" : ""
                          }`}
                        >
                          {transaction.transaction === "gst invoice"
                            ? "GST"
                            : transaction.transaction || "N/A"}
                        </Badge>
                      </div>
                    </td>

                    {/* Amount Cell */}
                    <td className="text-end">
                      <strong
                        className={
                          isCancelled
                            ? "text-muted text-decoration-line-through"
                            : "text-success"
                        }
                      >
                        {formatCurrency(calculatedAmounts.amount)}
                      </strong>
                      {calculatedAmounts.totalTax > 0 && (
                        <div>
                          <small className="text-muted">
                            +₹{Math.round(calculatedAmounts.totalTax)} tax
                          </small>
                        </div>
                      )}
                    </td>

                    {/* Paid Cell */}
                    <td className="text-end">
                      <div
                        className={`fw-medium small ${
                          isCancelled
                            ? "text-muted text-decoration-line-through"
                            : "text-dark"
                        }`}
                      >
                        {formatCurrency(
                          calculatedAmounts.amount - calculatedAmounts.balance
                        )}
                      </div>
                    </td>

                    {/* Balance Cell */}
                    <td className="text-end">
                      <div
                        className={`fw-bold small ${
                          isCancelled
                            ? "text-muted text-decoration-line-through"
                            : calculatedAmounts.balance > 0
                            ? "text-danger"
                            : calculatedAmounts.balance < 0
                            ? "text-success"
                            : "text-muted"
                        }`}
                      >
                        {formatCurrency(Math.abs(calculatedAmounts.balance))}
                      </div>
                      <small
                        className={`d-block fw-medium ${
                          isCancelled
                            ? "text-muted"
                            : calculatedAmounts.balance > 0
                            ? "text-danger"
                            : calculatedAmounts.balance < 0
                            ? "text-success"
                            : "text-muted"
                        }`}
                      >
                        {calculatedAmounts.balance > 0
                          ? "⚠️ Due"
                          : calculatedAmounts.balance < 0
                          ? "✅ Advance"
                          : "✅ Paid"}
                      </small>
                    </td>

                    {/* Status Cell */}
                    <td>{getStatusBadge(transaction)}</td>

                    {/* Payment Type Cell */}
                    <td className="text-center">
                      <Badge
                        bg={
                          isCancelled
                            ? "secondary"
                            : getPaymentTypeVariant(transaction.paymentType)
                        }
                        className={`small fw-medium ${
                          isCancelled ? "opacity-50" : ""
                        }`}
                      >
                        {transaction.paymentType || "N/A"}
                      </Badge>
                    </td>

                    {/* Actions Cell */}
                    {enableActions && (
                      <td
                        className="text-center dropdown-cell"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ActionButton transaction={transaction} />
                      </td>
                    )}
                  </tr>
                );
              })}

              {/* Returned/Cancelled Transactions Section */}
              {filteredReturnedTransactions.length > 0 && (
                <>
                  <tr className="table-danger bg-opacity-10">
                    <td
                      colSpan={enableBulkActions ? "11" : "10"}
                      className="py-3 text-center border-0"
                    >
                      <Button
                        variant="outline-danger"
                        size="sm"
                        className="rounded-pill border-2 fw-bold"
                        onClick={() =>
                          setShowReturnedTransactions(!showReturnedTransactions)
                        }
                      >
                        <FontAwesomeIcon
                          icon={
                            showReturnedTransactions
                              ? faChevronUp
                              : faChevronDown
                          }
                          className="me-2"
                        />
                        <span className="text-dark">
                          Returned/Cancelled{" "}
                          {isQuotationMode ? "Quotations" : "Invoices"}
                        </span>
                        <Badge bg="danger" className="ms-2">
                          {filteredReturnedTransactions.length}
                        </Badge>
                      </Button>
                    </td>
                  </tr>

                  {showReturnedTransactions && (
                    <>
                      {filteredReturnedTransactions.map(
                        (transaction, index) => {
                          const calculatedAmounts =
                            calculateDisplayAmounts(transaction);
                          const statusInfo = getTransactionStatus(transaction);
                          const transactionType = (
                            transaction.transaction || ""
                          ).toLowerCase();
                          const isReturned =
                            statusInfo.isReturned ||
                            transactionType === "return";
                          const isCancelled =
                            statusInfo.isCancelled && !isReturned;
                          const transactionId =
                            transaction._id || transaction.id;

                          return (
                            <tr
                              key={`returned-${transactionId || index}`}
                              className={`
                                ${
                                  isReturned ? "table-danger bg-opacity-10" : ""
                                } 
                                ${
                                  isCancelled ? "cancelled-transaction-row" : ""
                                }
                              `}
                              style={{cursor: "pointer"}}
                              onClick={() => handleViewTransaction(transaction)}
                            >
                              {/* Same structure as active transactions but with returned styling */}
                              {enableBulkActions && <td></td>}

                              <td className="text-muted">
                                <small className="text-muted">
                                  {formatDate(transaction.date)}
                                </small>
                              </td>

                              <td>
                                <strong className="text-muted text-decoration-line-through">
                                  {transaction.invoiceNo ||
                                    transaction.quotationNumber ||
                                    "N/A"}
                                </strong>
                                <div className="mt-1">
                                  <small className="text-danger fst-italic fw-medium">
                                    <FontAwesomeIcon
                                      icon={isReturned ? faUndo : faTrash}
                                      className="me-1"
                                    />
                                    {isReturned ? "Returned" : "Cancelled"}
                                  </small>
                                </div>
                              </td>

                              <td>
                                <div className="fw-medium text-muted">
                                  {transaction.partyName || "N/A"}
                                </div>
                              </td>

                              <td className="text-center">
                                <Badge
                                  bg="secondary"
                                  className="small fw-medium opacity-50"
                                >
                                  {transaction.transaction || "N/A"}
                                </Badge>
                              </td>

                              <td className="text-end">
                                <strong className="text-muted text-decoration-line-through">
                                  {formatCurrency(calculatedAmounts.amount)}
                                </strong>
                              </td>

                              <td className="text-end">
                                <div className="fw-medium small text-muted text-decoration-line-through">
                                  {formatCurrency(
                                    calculatedAmounts.amount -
                                      calculatedAmounts.balance
                                  )}
                                </div>
                              </td>

                              <td className="text-end">
                                <div className="fw-bold small text-muted text-decoration-line-through">
                                  {formatCurrency(
                                    Math.abs(calculatedAmounts.balance)
                                  )}
                                </div>
                              </td>

                              <td>{getStatusBadge(transaction)}</td>

                              <td className="text-center">
                                <Badge
                                  bg="secondary"
                                  className="small fw-medium opacity-50"
                                >
                                  {transaction.paymentType || "N/A"}
                                </Badge>
                              </td>

                              {enableActions && (
                                <td
                                  className="text-center dropdown-cell"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ActionButton transaction={transaction} />
                                </td>
                              )}
                            </tr>
                          );
                        }
                      )}
                    </>
                  )}
                </>
              )}

              {/* Empty State */}
              {filteredActiveTransactions.length === 0 &&
                filteredReturnedTransactions.length === 0 && (
                  <tr>
                    <td
                      colSpan={enableBulkActions ? "11" : "10"}
                      className="text-center py-5 border-0"
                    >
                      <EmptyStateComponent />
                    </td>
                  </tr>
                )}
            </tbody>
          </Table>
        </div>
      </div>

      <style>
        {`
        .sales-invoices-table-wrapper {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          border: 1px solid #e9ecef;
          position: relative;
          max-width: 100%;
          width: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }

        .sales-invoices-table-wrapper .table-responsive-wrapper {
          overflow-x: auto;
          overflow-y: visible;
          max-width: 100%;
          position: relative;
          scrollbar-width: thin;
          scrollbar-color: rgba(168, 85, 247, 0.3) transparent;
        }

        .sales-invoices-table-wrapper .table-responsive-wrapper::-webkit-scrollbar {
          height: 6px;
        }

        .sales-invoices-table-wrapper .table-responsive-wrapper::-webkit-scrollbar-track {
          background: #f1f3f4;
          border-radius: 3px;
        }

        .sales-invoices-table-wrapper .table-responsive-wrapper::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.3);
          border-radius: 3px;
        }

        .sales-invoices-table-wrapper .table-responsive-wrapper::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.5);
        }

        .sales-invoices-table-wrapper .table-header-purple {
          background: linear-gradient(
            135deg,
            #6f42c1 0%,
            #8b5cf6 50%,
            #a855f7 100%
          );
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .sales-invoices-table-wrapper .table-header-purple th {
          background: transparent !important;
          border-bottom: 2px solid rgba(255, 255, 255, 0.2);
          font-weight: 600;
          padding: 16px 12px;
          font-size: 0.875rem;
          color: #ffffff !important;
          white-space: nowrap;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          position: relative;
          min-width: 120px;
        }

        .sales-invoices-table-wrapper .table-header-purple th::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.1) 0%,
            transparent 50%
          );
          pointer-events: none;
        }

        .sales-invoices-table-wrapper .table-header-purple th:hover {
          background: rgba(255, 255, 255, 0.1) !important;
          transition: all 0.3s ease;
        }

        .purple-checkbox input[type="checkbox"] {
          accent-color: #ffffff;
          transform: scale(1.1);
        }

        .purple-checkbox input[type="checkbox"]:checked {
          background-color: #ffffff;
          border-color: #ffffff;
        }

        .sales-invoices-table-wrapper .table tbody tr.table-active-purple {
          background: linear-gradient(
            90deg,
            rgba(168, 85, 247, 0.1) 0%,
            rgba(139, 92, 246, 0.05) 100%
          );
          border-left: 4px solid #a855f7;
        }

        .sales-invoices-table-wrapper .table tbody tr.cancelled-transaction-row {
          background: linear-gradient(
            90deg,
            rgba(108, 117, 125, 0.1) 0%,
            rgba(173, 181, 189, 0.05) 100%
          );
          border-left: 4px solid #6c757d;
        }

        .sales-invoices-table-wrapper .table {
          margin-bottom: 0;
          font-size: 0.9rem;
          width: 100%;
          table-layout: auto;
          min-width: 1400px;
        }

        .sales-invoices-table-wrapper .table td {
          padding: 16px 12px;
          vertical-align: middle;
          border-bottom: 1px solid #f1f3f4;
          white-space: nowrap;
          min-width: inherit;
        }

        .sales-invoices-table-wrapper .dropdown-cell {
          position: relative;
          z-index: 10;
          overflow: visible;
        }

        .sales-invoices-table-wrapper .table tbody tr:hover {
          background: linear-gradient(
            90deg,
            rgba(168, 85, 247, 0.05) 0%,
            rgba(139, 92, 246, 0.02) 100%
          );
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(168, 85, 247, 0.15);
          transition: all 0.2s ease;
          border-left: 3px solid #a855f7;
        }

        .sales-invoices-table-wrapper .dropdown {
          position: static;
        }

        .sales-invoices-table-wrapper .dropdown-toggle {
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
          color: #6f42c1;
          position: relative;
          z-index: 11;
        }

        .sales-invoices-table-wrapper .dropdown-toggle:focus,
        .sales-invoices-table-wrapper .dropdown-toggle:hover {
          box-shadow: 0 0 0 0.2rem rgba(168, 85, 247, 0.25) !important;
          background-color: rgba(168, 85, 247, 0.1) !important;
          color: #6f42c1 !important;
        }

        .sales-invoices-table-wrapper .dropdown-menu {
          border: none;
          box-shadow: 0 8px 32px rgba(168, 85, 247, 0.3);
          border-radius: 8px;
          margin-top: 4px;
          border-top: 3px solid #a855f7;
          z-index: 9999 !important;
          position: absolute !important;
          will-change: transform;
          min-width: 180px;
          background: white;
          transform: translateZ(0);
        }

        .sales-invoices-table-wrapper .dropdown-menu.show {
          z-index: 9999 !important;
          position: absolute !important;
        }

        .sales-invoices-table-wrapper .badge {
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.4em 0.8em;
        }

        .sales-invoices-table-wrapper .dropdown-item {
          padding: 8px 16px;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .sales-invoices-table-wrapper .dropdown-item:hover {
          background: linear-gradient(
            90deg,
            rgba(168, 85, 247, 0.1) 0%,
            rgba(139, 92, 246, 0.05) 100%
          );
          color: #6f42c1;
          padding-left: 20px;
        }

        .sales-invoices-table-wrapper .dropdown-divider {
          border-color: rgba(168, 85, 247, 0.2);
        }

        .sales-invoices-table-wrapper .text-white-50:hover {
          color: rgba(255, 255, 255, 0.8) !important;
          transform: scale(1.1);
          transition: all 0.2s ease;
        }

        /* Enhanced status badges */
        .sales-invoices-table-wrapper .badge.bg-secondary {
          background: linear-gradient(45deg, #6b7280, #4b5563) !important;
        }

        .sales-invoices-table-wrapper .badge.bg-warning {
          background: linear-gradient(45deg, #f59e0b, #d97706) !important;
        }

        .sales-invoices-table-wrapper .badge.bg-primary {
          background: linear-gradient(45deg, #8b5cf6, #7c3aed) !important;
        }

        .sales-invoices-table-wrapper .badge.bg-info {
          background: linear-gradient(45deg, #06b6d4, #0891b2) !important;
        }

        .sales-invoices-table-wrapper .badge.bg-success {
          background: linear-gradient(45deg, #10b981, #059669) !important;
        }

        .sales-invoices-table-wrapper .badge.bg-danger {
          background: linear-gradient(45deg, #ef4444, #dc2626) !important;
        }

        .sales-invoices-table-wrapper .badge.bg-dark {
          background: linear-gradient(45deg, #374151, #1f2937) !important;
        }

        .sales-invoices-table-wrapper .cancelled-transaction-row {
          opacity: 0.7;
        }

        .sales-invoices-table-wrapper .cancelled-transaction-row:hover {
          opacity: 0.8;
          border-left: 3px solid #6c757d !important;
        }

        @media (max-width: 1400px) {
          .sales-invoices-table-wrapper .table {
            min-width: 1200px;
          }
          
          .sales-invoices-table-wrapper .table th,
          .sales-invoices-table-wrapper .table td {
            padding: 14px 10px;
            font-size: 0.85rem;
          }
        }

        @media (max-width: 1200px) {
          .sales-invoices-table-wrapper .table {
            min-width: 1000px;
          }

          .sales-invoices-table-wrapper .table th,
          .sales-invoices-table-wrapper .table td {
            padding: 12px 8px;
            font-size: 0.85rem;
          }

          .sales-invoices-table-wrapper .dropdown-menu {
            min-width: 160px;
          }
        }

        @media (max-width: 992px) {
          .sales-invoices-table-wrapper .table {
            min-width: 900px;
          }

          .sales-invoices-table-wrapper .table th,
          .sales-invoices-table-wrapper .table td {
            padding: 10px 6px;
            font-size: 0.8rem;
          }
        }

        @media (max-width: 768px) {
          .sales-invoices-table-wrapper {
            font-size: 0.8rem;
            border-radius: 8px;
            margin: 0 -15px;
          }

          .sales-invoices-table-wrapper .table {
            min-width: 800px;
          }

          .sales-invoices-table-wrapper .table th,
          .sales-invoices-table-wrapper .table td {
            padding: 8px 4px;
            font-size: 0.75rem;
          }

          .sales-invoices-table-wrapper .badge {
            font-size: 0.7rem;
            padding: 0.3em 0.6em;
          }

          .sales-invoices-table-wrapper .table-header-purple th {
            padding: 10px 6px;
            font-size: 0.75rem;
          }

          .sales-invoices-table-wrapper .dropdown-menu {
            min-width: 140px;
            font-size: 0.8rem;
          }

          .sales-invoices-table-wrapper .dropdown-item {
            padding: 6px 12px;
            font-size: 0.8rem;
          }
        }

        @media (max-width: 576px) {
          .sales-invoices-table-wrapper {
            border-radius: 0;
            margin: 0 -15px;
          }

          .sales-invoices-table-wrapper .table {
            min-width: 700px;
          }

          .sales-invoices-table-wrapper .table th,
          .sales-invoices-table-wrapper .table td {
            padding: 6px 3px;
            font-size: 0.7rem;
          }
        }

        .sales-invoices-table-wrapper .table tbody tr {
          transition: all 0.2s ease;
        }

        .dropdown-menu {
          z-index: 9999 !important;
        }

        .table-responsive {
          overflow: visible !important;
        }

        .sales-invoices-table-wrapper .dropdown.show .dropdown-menu {
          z-index: 9999 !important;
          position: absolute !important;
          transform: translate3d(0, 0, 0);
        }

        .sales-invoices-table-wrapper * {
          box-sizing: border-box;
        }
        `}
      </style>
    </>
  );
}

export default SalesInvoicesTable;
