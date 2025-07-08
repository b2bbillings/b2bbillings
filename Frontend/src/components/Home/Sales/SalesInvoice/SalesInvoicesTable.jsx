import React, {useState, useCallback, useMemo, useRef} from "react";
import {Button, Table, Badge, Form} from "react-bootstrap";
import {useNavigate, useLocation} from "react-router-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faChevronUp,
  faChevronDown,
  faFileExcel,
  faPrint,
  faSort,
  faEllipsisV,
  faEye,
  faEdit,
  faTrash,
  faShare,
  faExchangeAlt,
  faFileInvoice,
  faDownload,
  faPlus,
  faCheckCircle,
  faExclamationTriangle,
  faBan,
  faClock,
  faUndo,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import {Menu, MenuItem, MenuButton} from "@szhsin/react-menu";
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/transitions/slide.css";
import SalesInvoice from "../../../PrintComponents/SalesInvoice";
import {useReactToPrint} from "react-to-print";
import salesService from "../../../../services/salesService";

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
  const [deletingTransactions, setDeletingTransactions] = useState(new Set());
  const [convertingTransactions, setConvertingTransactions] = useState(
    new Set()
  );
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [localSortBy, setLocalSortBy] = useState(sortBy);
  const [localSortOrder, setLocalSortOrder] = useState(sortOrder);
  const [localFilterStatus, setLocalFilterStatus] = useState(filterStatus);
  const [printingInvoices, setPrintingInvoices] = useState(new Set());
  const [currentPrintData, setCurrentPrintData] = useState(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const printComponentRef = useRef();

  const handlePrintTransaction = useCallback(
    async (transaction) => {
      const transactionId = transaction._id || transaction.id;

      if (!transactionId) {
        addToast?.("Invalid transaction ID", "error");
        return;
      }

      if (printingInvoices.has(transactionId)) {
        return; // Already printing
      }

      try {
        setPrintingInvoices((prev) => new Set(prev).add(transactionId));
        addToast?.("Preparing invoice for printing...", "info");

        // Get invoice data for printing
        const printResponse = await salesService.getSalesInvoiceForPrint(
          transactionId,
          {
            format: "a4",
            template: "standard",
          }
        );

        if (printResponse.success && printResponse.data) {
          // Set the print data and show preview
          setCurrentPrintData(printResponse.data);
          setShowPrintPreview(true);
          addToast?.("Print preview ready", "success");
        } else {
          throw new Error(
            printResponse.message || "Failed to get invoice data for printing"
          );
        }
      } catch (error) {
        console.error("❌ Error printing invoice:", error);
        addToast?.(`Failed to print invoice: ${error.message}`, "error");
      } finally {
        setPrintingInvoices((prev) => {
          const newSet = new Set(prev);
          newSet.delete(transactionId);
          return newSet;
        });
      }
    },
    [printingInvoices, addToast]
  );

  const handlePrint = useReactToPrint({
    contentRef: printComponentRef, // Changed from 'content' to 'contentRef'
    documentTitle: currentPrintData?.invoice?.invoiceNumber || "Sales Invoice",
    onAfterPrint: () => {
      setShowPrintPreview(false);
      setCurrentPrintData(null);
      addToast?.("Invoice printed successfully!", "success");
    },
    onPrintError: (error) => {
      console.error("Print error:", error);
      addToast?.("Failed to print invoice", "error");
      setShowPrintPreview(false);
      setCurrentPrintData(null);
    },
  });
  // Add bulk print handler (optional)
  const handleBulkPrint = useCallback(
    async (selectedTransactions) => {
      if (!selectedTransactions || selectedTransactions.length === 0) {
        addToast?.("No invoices selected for printing", "warning");
        return;
      }

      if (selectedTransactions.length > 10) {
        addToast?.("Maximum 10 invoices can be printed at once", "warning");
        return;
      }

      try {
        addToast?.("Preparing invoices for bulk printing...", "info");

        const bulkPrintResponse =
          await salesService.getBulkSalesInvoicesForPrint(
            selectedTransactions.map((t) => t._id || t.id),
            {
              format: "a4",
              template: "standard",
            }
          );

        if (bulkPrintResponse.success && bulkPrintResponse.data?.invoices) {
          // For bulk printing, you could open each in a new tab or create a combined view
          bulkPrintResponse.data.invoices.forEach((invoiceData, index) => {
            setTimeout(() => {
              const printWindow = window.open("", "_blank");
              printWindow.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Invoice ${
                    invoiceData.invoice?.invoiceNumber || index + 1
                  }</title>
                  <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                    @media print { body { margin: 0; padding: 10px; } }
                  </style>
                </head>
                <body>
                  <div id="invoice-container"></div>
                  <script>
                    window.onload = function() {
                      window.print();
                      setTimeout(() => window.close(), 1000);
                    }
                  </script>
                </body>
              </html>
            `);
              printWindow.document.close();
            }, index * 500); // Stagger the print jobs
          });

          addToast?.(
            `${selectedTransactions.length} invoices sent to printer`,
            "success"
          );
        } else {
          throw new Error("Failed to prepare invoices for bulk printing");
        }
      } catch (error) {
        console.error("❌ Error bulk printing:", error);
        addToast?.(`Failed to bulk print invoices: ${error.message}`, "error");
      }
    },
    [addToast]
  );
  const isQuotationMode = useMemo(() => {
    return (
      isQuotationsMode || mode === "quotations" || documentType === "quotation"
    );
  }, [isQuotationsMode, mode, documentType]);

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

  const effectiveSearchTerm = searchTerm || localSearchTerm || searchQuery;

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
        <Badge
          bg={variant}
          className="d-flex align-items-center gap-1"
          style={{borderRadius: 0}}
        >
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

  const handleDeleteTransaction = useCallback(
    async (transaction) => {
      const transactionId = transaction.id || transaction._id;

      if (!transactionId) {
        addToast?.("Invalid transaction ID", "error");
        return;
      }

      if (deletingTransactions.has(transactionId)) {
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

  // ✅ NEW: Handle conversion to purchase invoice
  const handleConvertToPurchaseInvoice = useCallback(
    async (transaction) => {
      const transactionId = transaction._id || transaction.id;

      if (!transactionId) {
        addToast?.("Invalid transaction ID", "error");
        return;
      }

      if (convertingTransactions.has(transactionId)) {
        return; // Already converting
      }

      // Check if it's a sales invoice (not quotation)
      if (isQuotationMode) {
        addToast?.(
          "Can only convert sales invoices to purchase invoices",
          "warning"
        );
        return;
      }

      // Check if already converted
      if (transaction.autoGeneratedPurchaseInvoice) {
        addToast?.(
          "This invoice has already been converted to a purchase invoice",
          "info"
        );
        return;
      }

      const statusInfo = getTransactionStatus(transaction);

      // Only allow conversion of completed/paid invoices
      if (!statusInfo.isCompleted && !statusInfo.isPaid) {
        addToast?.("Can only convert completed or paid invoices", "warning");
        return;
      }

      const documentNumber = transaction.invoiceNo || "this invoice";
      const confirmConvert = window.confirm(
        `🔄 Convert Sales Invoice to Purchase Invoice?\n\n` +
          `Invoice: ${documentNumber}\n` +
          `Customer: ${transaction.partyName}\n` +
          `Amount: ₹${formatCurrency(transaction.amount)}\n\n` +
          `This will create a corresponding purchase invoice for bidirectional tracking.\n\n` +
          `Continue with conversion?`
      );

      if (!confirmConvert) return;

      try {
        setConvertingTransactions((prev) => new Set(prev).add(transactionId));
        addToast?.("Converting to purchase invoice...", "info");

        const conversionData = {
          convertedBy: currentUser?.id || currentUser?._id,
          notes: `Converted from sales invoice ${documentNumber}`,
          originalSalesInvoiceId: transactionId,
          targetCompanyId: companyId,
        };

        const result = await salesService.convertSalesInvoiceToPurchaseInvoice(
          transactionId,
          conversionData
        );

        if (result?.success) {
          addToast?.(
            `✅ Successfully converted sales invoice ${documentNumber} to purchase invoice!`,
            "success"
          );

          // Refresh the table data if callback is available
          if (typeof onViewTransaction === "function") {
            // Trigger refresh by calling a refresh callback if available
            setTimeout(() => {
              window.location.reload(); // Fallback refresh
            }, 1000);
          }
        } else {
          throw new Error(result?.message || "Conversion failed");
        }
      } catch (error) {
        console.error("Conversion error:", error);
        addToast?.(
          `❌ Failed to convert to purchase invoice: ${error.message}`,
          "error"
        );
      } finally {
        setConvertingTransactions((prev) => {
          const newSet = new Set(prev);
          newSet.delete(transactionId);
          return newSet;
        });
      }
    },
    [
      convertingTransactions,
      isQuotationMode,
      addToast,
      currentUser,
      companyId,
      getTransactionStatus,
      formatCurrency,
      onViewTransaction,
    ]
  );

  const ActionButton = ({transaction}) => {
    const transactionId = transaction._id || transaction.id;
    const isDeleting = deletingTransactions.has(transactionId);
    const isConverting = convertingTransactions.has(transactionId);
    const isPrinting = printingInvoices.has(transactionId);
    const isCancelled =
      transaction.status === "cancelled" ||
      transaction.status === "deleted" ||
      transaction.status === "void";
    const statusInfo = getTransactionStatus(transaction);

    // Check if this invoice can be converted to purchase invoice
    const canConvertToPurchase =
      !isQuotationMode &&
      !isCancelled &&
      !transaction.autoGeneratedPurchaseInvoice &&
      (statusInfo.isCompleted || statusInfo.isPaid) &&
      !statusInfo.isReturned;

    const handleDelete = useCallback(
      async (e) => {
        if (e && typeof e.preventDefault === "function") {
          e.preventDefault();
        }
        if (e && typeof e.stopPropagation === "function") {
          e.stopPropagation();
        }

        if (isDeleting || isCancelled) {
          return;
        }

        await handleDeleteTransaction(transaction);
      },
      [transaction, isDeleting, isCancelled, handleDeleteTransaction]
    );

    const handleEdit = useCallback(
      (e) => {
        if (e && typeof e.preventDefault === "function") {
          e.preventDefault();
        }
        if (e && typeof e.stopPropagation === "function") {
          e.stopPropagation();
        }

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

    const handleConvertToPurchase = useCallback(
      (e) => {
        // Safe event handling
        if (e && typeof e.preventDefault === "function") {
          e.preventDefault();
        }
        if (e && typeof e.stopPropagation === "function") {
          e.stopPropagation();
        }
        handleConvertToPurchaseInvoice(transaction);
      },
      [transaction, handleConvertToPurchaseInvoice]
    );

    const handlePrint = useCallback(
      (e) => {
        if (e && typeof e.preventDefault === "function") {
          e.preventDefault();
        }
        if (e && typeof e.stopPropagation === "function") {
          e.stopPropagation();
        }
        handlePrintTransaction(transaction);
      },
      [transaction, handlePrintTransaction]
    );

    const handleShare = useCallback(
      (e) => {
        if (e && typeof e.preventDefault === "function") {
          e.preventDefault();
        }
        if (e && typeof e.stopPropagation === "function") {
          e.stopPropagation();
        }
        onShareTransaction?.(transaction);
      },
      [transaction, onShareTransaction]
    );

    const handleDownload = useCallback(
      (e) => {
        if (e && typeof e.preventDefault === "function") {
          e.preventDefault();
        }
        if (e && typeof e.stopPropagation === "function") {
          e.stopPropagation();
        }
        onDownloadTransaction?.(transaction);
      },
      [transaction, onDownloadTransaction]
    );

    const handleViewClick = useCallback(
      (e) => {
        if (e && typeof e.preventDefault === "function") {
          e.preventDefault();
        }
        if (e && typeof e.stopPropagation === "function") {
          e.stopPropagation();
        }
        handleViewTransaction(transaction);
      },
      [transaction, handleViewTransaction]
    );

    const handleConvertToInvoice = useCallback(
      (e) => {
        if (e && typeof e.preventDefault === "function") {
          e.preventDefault();
        }
        if (e && typeof e.stopPropagation === "function") {
          e.stopPropagation();
        }
        handleConvertTransaction(transaction);
      },
      [transaction, handleConvertTransaction]
    );

    return (
      <Menu
        menuButton={
          <MenuButton
            className="action-menu-button"
            disabled={isDeleting || isConverting || isPrinting}
            style={{borderRadius: 0}}
          >
            <FontAwesomeIcon
              icon={isConverting || isPrinting ? faSpinner : faEllipsisV}
              className={isConverting || isPrinting ? "fa-spin" : ""}
            />
          </MenuButton>
        }
        transition
        gap={4}
        direction="left"
        position="auto"
        overflow="auto"
      >
        {/* View Details */}
        <MenuItem onClick={handleViewClick}>
          <FontAwesomeIcon icon={faEye} className="me-2" />
          View Details
        </MenuItem>

        {/* Edit - Only for non-cancelled items */}
        {enableActions && !isCancelled && (
          <MenuItem
            onClick={handleEdit}
            disabled={isDeleting || isConverting || isPrinting}
          >
            <FontAwesomeIcon icon={faEdit} className="me-2" />
            Edit {isQuotationMode ? "Quotation" : "Invoice"}
          </MenuItem>
        )}

        {/* Print - Available for all non-cancelled items */}
        {!isCancelled && (
          <MenuItem
            onClick={handlePrint}
            disabled={isDeleting || isConverting || isPrinting}
          >
            <FontAwesomeIcon
              icon={isPrinting ? faSpinner : faPrint}
              className={`me-2 ${isPrinting ? "fa-spin" : ""}`}
            />
            {isPrinting ? "Preparing..." : "Print"}
          </MenuItem>
        )}

        {/* Share */}
        <MenuItem onClick={handleShare}>
          <FontAwesomeIcon icon={faShare} className="me-2" />
          Share
        </MenuItem>

        {/* Download */}
        <MenuItem onClick={handleDownload}>
          <FontAwesomeIcon icon={faDownload} className="me-2" />
          Download
        </MenuItem>

        {/* Quotation to Invoice Conversion */}
        {statusInfo.canConvert && (
          <MenuItem
            onClick={handleConvertToInvoice}
            disabled={isDeleting || isConverting || isPrinting}
          >
            <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
            Convert to Invoice
          </MenuItem>
        )}

        {/* Sales Invoice to Purchase Invoice Conversion */}
        {canConvertToPurchase && (
          <MenuItem
            onClick={handleConvertToPurchase}
            disabled={isDeleting || isConverting || isPrinting}
            style={{
              color: transaction.autoGeneratedPurchaseInvoice
                ? "#28a745"
                : "#6f42c1",
              fontWeight: transaction.autoGeneratedPurchaseInvoice
                ? "600"
                : "normal",
            }}
          >
            <FontAwesomeIcon
              icon={isConverting ? faSpinner : faExchangeAlt}
              className={`me-2 ${isConverting ? "fa-spin" : ""}`}
            />
            {isConverting
              ? "Converting..."
              : transaction.autoGeneratedPurchaseInvoice
              ? "✅ Converted to Purchase"
              : "🔄 Convert to Purchase Invoice"}
          </MenuItem>
        )}

        {/* Delete - Only for non-cancelled items */}
        {enableActions && !isCancelled && (
          <MenuItem
            onClick={handleDelete}
            className="text-danger"
            disabled={isDeleting || isConverting || isPrinting}
          >
            <FontAwesomeIcon
              icon={isDeleting ? faSpinner : faTrash}
              className={`me-2 ${isDeleting ? "fa-spin" : ""}`}
            />
            {isDeleting
              ? "Deleting..."
              : `Delete ${isQuotationMode ? "Quotation" : "Invoice"}`}
          </MenuItem>
        )}
      </Menu>
    );
  };

  const LoadingComponent = () => (
    <div className="text-center py-5">
      <div className="spinner-border text-purple" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <h5 className="text-muted mt-3">
        Loading {isQuotationMode ? "quotations" : "invoices"}...
      </h5>
      <p className="text-muted small">Please wait while we fetch your data</p>
    </div>
  );

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
        className="btn-purple"
        onClick={handleCreateNew}
        style={{borderRadius: 0}}
      >
        <FontAwesomeIcon icon={faPlus} className="me-2" />
        Create {isQuotationMode ? "Quotation" : "Invoice"}
      </Button>
    </div>
  );

  if (isLoading) {
    return <LoadingComponent />;
  }

  if (!transactions || transactions.length === 0) {
    return <EmptyStateComponent />;
  }

  return (
    <>
      <style>{`
        .purple-table-header {
          background: linear-gradient(
            135deg,
            #646cff 0%,
            #8b5cf6 50%,
            #c084fc 100%
          ) !important;
          color: white !important;
          border: none !important;
        }

        .purple-table-header th {
          background: transparent !important;
          color: white !important;
          border-color: rgba(255, 255, 255, 0.2) !important;
          font-weight: 600 !important;
          padding: 16px 12px !important;
        }

        .text-purple {
          color: #646cff !important;
        }

        .action-menu-button {
          background: transparent;
          border: 1px solid #646cff;
          color: #646cff;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .action-menu-button:hover {
          background: linear-gradient(135deg, #646cff 0%, #8b5cf6 100%);
          color: white;
        }

        .action-menu-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .szh-menu {
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          border-radius: 0;
          background: white;
          z-index: 1000;
        }

        .szh-menu__item {
          padding: 8px 16px;
          font-size: 14px;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .szh-menu__item:hover {
          background: linear-gradient(135deg, #646cff 0%, #8b5cf6 100%);
          color: white;
        }

        .szh-menu__item.text-danger {
          color: #dc2626 !important;
        }

        .szh-menu__item.text-danger:hover {
          background: #fef2f2 !important;
          color: #dc2626 !important;
        }

        .btn-purple {
          background: linear-gradient(135deg, #646cff 0%, #8b5cf6 100%);
          border: none;
          color: white;
          border-radius: 0;
          padding: 8px 16px;
          font-weight: 500;
        }

        .btn-purple:hover {
          background: linear-gradient(135deg, #5752d1 0%, #7c3aed 100%);
          color: white;
        }

        .card {
          border-radius: 0 !important;
          border-top-left-radius: 0 !important;
          border-top-right-radius: 0 !important;
        }

        .table {
          border-radius: 0 !important;
        }

        .table-responsive {
          border-radius: 0 !important;
        }

        /* Conversion menu item styles */
        .szh-menu__item[style*="color: #6f42c1"] {
          color: #6f42c1 !important;
        }

        .szh-menu__item[style*="color: #28a745"] {
          color: #28a745 !important;
        }

        .szh-menu__item[style*="color: #6f42c1"]:hover,
        .szh-menu__item[style*="color: #28a745"]:hover {
          background: rgba(111, 66, 193, 0.1) !important;
          color: #6f42c1 !important;
        }

        /* Print Preview Modal Styles */
        .print-preview-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.8);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .print-preview-content {
          background-color: white;
          border-radius: 8px;
          padding: 20px;
          max-width: 90vw;
          max-height: 90vh;
          overflow: auto;
          position: relative;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .print-preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e5e7eb;
        }

        .print-preview-title {
          margin: 0;
          color: #374151;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .print-preview-actions {
          display: flex;
          gap: 10px;
        }

        .print-preview-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .print-preview-btn.btn-primary {
          background: linear-gradient(135deg, #646cff 0%, #8b5cf6 100%);
          color: white;
        }

        .print-preview-btn.btn-primary:hover {
          background: linear-gradient(135deg, #5752d1 0%, #7c3aed 100%);
        }

        .print-preview-btn.btn-secondary {
          background: #6b7280;
          color: white;
        }

        .print-preview-btn.btn-secondary:hover {
          background: #4b5563;
        }

        .print-preview-btn.btn-danger {
          background: #dc2626;
          color: white;
        }

        .print-preview-btn.btn-danger:hover {
          background: #b91c1c;
        }

        @media print {
          .print-preview-modal {
            position: static;
            background: none;
            padding: 0;
          }

          .print-preview-content {
            max-width: none;
            max-height: none;
            padding: 0;
            box-shadow: none;
            border-radius: 0;
          }

          .print-preview-header {
            display: none;
          }

          .no-print {
            display: none !important;
          }
        }

        @media (max-width: 768px) {
          .table-responsive {
            font-size: 0.875rem;
          }

          .action-menu-button {
            padding: 2px 6px;
            font-size: 11px;
          }

          .purple-table-header th {
            padding: 12px 8px !important;
          }

          .print-preview-content {
            max-width: 95vw;
            max-height: 95vh;
            padding: 15px;
          }

          .print-preview-header {
            flex-direction: column;
            gap: 10px;
            align-items: stretch;
          }

          .print-preview-actions {
            justify-content: space-between;
          }
        }
      `}</style>

      <div className="card shadow-sm border-0" style={{borderRadius: 0}}>
        <div className="table-responsive">
          <Table hover className="mb-0 table-sm">
            <thead className="purple-table-header">
              <tr>
                {enableBulkActions && (
                  <th style={{width: "40px"}}>
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
                    />
                  </th>
                )}
                <th style={{width: "80px"}}>
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
                <th style={{width: "100px"}}>
                  {isQuotationMode ? "Quote No." : "Invoice No."}
                </th>
                <th style={{width: "150px"}}>Customer</th>
                <th style={{width: "80px"}}>Type</th>
                <th style={{width: "100px"}} className="text-end">
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
                <th style={{width: "90px"}} className="text-end">
                  Balance
                </th>
                <th style={{width: "80px"}}>Status</th>
                <th style={{width: "80px"}}>Payment</th>
                {enableActions && (
                  <th style={{width: "70px"}} className="text-center">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
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
                    ${isSelected ? "table-active" : ""} 
                    ${isReturned ? "table-danger" : ""} 
                    ${isCancelled ? "table-secondary" : ""}
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

                    <td className={`small ${isCancelled ? "text-muted" : ""}`}>
                      {formatDate(transaction.date)}
                      {transaction.dueDate && (
                        <div>
                          <small className="text-muted">
                            Due: {formatDate(transaction.dueDate)}
                          </small>
                        </div>
                      )}
                    </td>

                    <td>
                      <strong
                        className={
                          isCancelled
                            ? "text-muted text-decoration-line-through"
                            : "text-purple"
                        }
                      >
                        {transaction.invoiceNo ||
                          transaction.quotationNumber ||
                          "N/A"}
                      </strong>

                      {/* Show conversion status */}
                      {transaction.autoGeneratedPurchaseInvoice &&
                        !isQuotationMode && (
                          <div className="mt-1">
                            <small className="text-success">
                              <FontAwesomeIcon
                                icon={faExchangeAlt}
                                className="me-1"
                              />
                              ↔️ Converted to Purchase
                            </small>
                          </div>
                        )}

                      {isReturned && (
                        <div className="mt-1">
                          <small className="text-danger">
                            <FontAwesomeIcon icon={faUndo} className="me-1" />
                            Returned
                          </small>
                        </div>
                      )}
                      {isCancelled && (
                        <div className="mt-1">
                          <small className="text-muted">
                            <FontAwesomeIcon icon={faTrash} className="me-1" />
                            Cancelled
                          </small>
                        </div>
                      )}
                    </td>

                    <td>
                      <div>
                        <div
                          className={`fw-medium ${
                            isCancelled ? "text-muted" : ""
                          }`}
                          title={transaction.partyName}
                        >
                          {(transaction.partyName || "N/A").substring(0, 20)}
                          {(transaction.partyName || "").length > 20 && "..."}
                        </div>
                        {transaction.partyPhone && (
                          <small className="text-muted">
                            📞 {transaction.partyPhone}
                          </small>
                        )}
                      </div>
                    </td>

                    <td className="text-center">
                      <div className="d-flex flex-column align-items-center">
                        <span className="mb-1" style={{fontSize: "0.8rem"}}>
                          {getTransactionIcon(transaction.transaction)}
                        </span>
                        <Badge
                          bg={
                            isCancelled
                              ? "secondary"
                              : getTransactionVariant(transaction.transaction)
                          }
                          className="small"
                          style={{borderRadius: 0, fontSize: "0.65rem"}}
                        >
                          {transaction.transaction === "gst invoice"
                            ? "GST"
                            : (transaction.transaction || "N/A").substring(
                                0,
                                8
                              )}
                        </Badge>
                      </div>
                    </td>

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
                        className={`d-block ${
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

                    <td>{getStatusBadge(transaction)}</td>

                    <td className="text-center">
                      <Badge
                        bg={
                          isCancelled
                            ? "secondary"
                            : getPaymentTypeVariant(transaction.paymentType)
                        }
                        className="small"
                        style={{borderRadius: 0, fontSize: "0.65rem"}}
                      >
                        {(transaction.paymentType || "N/A").substring(0, 6)}
                      </Badge>
                    </td>

                    {enableActions && (
                      <td
                        className="text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ActionButton transaction={transaction} />
                      </td>
                    )}
                  </tr>
                );
              })}

              {filteredReturnedTransactions.length > 0 && (
                <>
                  <tr className="table-warning">
                    <td
                      colSpan={enableBulkActions ? "10" : "9"}
                      className="py-3 text-center border-0"
                    >
                      <Button
                        variant="outline-warning"
                        size="sm"
                        onClick={() =>
                          setShowReturnedTransactions(!showReturnedTransactions)
                        }
                        style={{borderRadius: 0}}
                      >
                        <FontAwesomeIcon
                          icon={
                            showReturnedTransactions
                              ? faChevronUp
                              : faChevronDown
                          }
                          className="me-2"
                        />
                        Returned/Cancelled{" "}
                        {isQuotationMode ? "Quotations" : "Invoices"}
                        <Badge
                          bg="warning"
                          className="ms-2"
                          style={{borderRadius: 0}}
                        >
                          {filteredReturnedTransactions.length}
                        </Badge>
                      </Button>
                    </td>
                  </tr>

                  {showReturnedTransactions &&
                    filteredReturnedTransactions.map((transaction, index) => {
                      const calculatedAmounts =
                        calculateDisplayAmounts(transaction);
                      const statusInfo = getTransactionStatus(transaction);
                      const transactionType = (
                        transaction.transaction || ""
                      ).toLowerCase();
                      const isReturned =
                        statusInfo.isReturned || transactionType === "return";
                      const isCancelled = statusInfo.isCancelled && !isReturned;
                      const transactionId = transaction._id || transaction.id;

                      return (
                        <tr
                          key={`returned-${transactionId || index}`}
                          className={
                            isReturned ? "table-danger" : "table-secondary"
                          }
                          style={{cursor: "pointer"}}
                          onClick={() => handleViewTransaction(transaction)}
                        >
                          {enableBulkActions && <td></td>}

                          <td className="text-muted small">
                            {formatDate(transaction.date)}
                          </td>

                          <td>
                            <strong className="text-muted text-decoration-line-through">
                              {transaction.invoiceNo ||
                                transaction.quotationNumber ||
                                "N/A"}
                            </strong>
                            <div className="mt-1">
                              <small className="text-danger">
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
                              {(transaction.partyName || "N/A").substring(
                                0,
                                20
                              )}
                              {(transaction.partyName || "").length > 20 &&
                                "..."}
                            </div>
                          </td>

                          <td className="text-center">
                            <Badge
                              bg="secondary"
                              className="small"
                              style={{borderRadius: 0, fontSize: "0.65rem"}}
                            >
                              {(transaction.transaction || "N/A").substring(
                                0,
                                8
                              )}
                            </Badge>
                          </td>

                          <td className="text-end">
                            <strong className="text-muted text-decoration-line-through">
                              {formatCurrency(calculatedAmounts.amount)}
                            </strong>
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
                              className="small"
                              style={{borderRadius: 0, fontSize: "0.65rem"}}
                            >
                              {(transaction.paymentType || "N/A").substring(
                                0,
                                6
                              )}
                            </Badge>
                          </td>

                          {enableActions && (
                            <td
                              className="text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ActionButton transaction={transaction} />
                            </td>
                          )}
                        </tr>
                      );
                    })}
                </>
              )}

              {filteredActiveTransactions.length === 0 &&
                filteredReturnedTransactions.length === 0 && (
                  <tr>
                    <td
                      colSpan={enableBulkActions ? "10" : "9"}
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

      {/* Print Preview Modal */}
      {showPrintPreview && currentPrintData && (
        <div className="print-preview-modal no-print">
          <div className="print-preview-content">
            {/* Modal Header */}
            <div className="print-preview-header no-print">
              <h3 className="print-preview-title">
                📄 Print Preview -{" "}
                {currentPrintData.invoice?.invoiceNumber || "Sales Invoice"}
              </h3>
              <div className="print-preview-actions">
                <button
                  onClick={handlePrint}
                  className="print-preview-btn btn-primary"
                >
                  <FontAwesomeIcon icon={faPrint} className="me-2" />
                  Print
                </button>
                <button
                  onClick={() => {
                    setShowPrintPreview(false);
                    setCurrentPrintData(null);
                  }}
                  className="print-preview-btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Print Component */}
            <div className="print-preview-body">
              <SalesInvoice
                ref={printComponentRef}
                invoiceData={currentPrintData}
                onPrint={handlePrint}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SalesInvoicesTable;
