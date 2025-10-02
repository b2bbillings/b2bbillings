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
        /* Modern table styling */
        .modern-table {
          border-radius: 1rem;
          overflow: hidden;
          border: none;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .modern-table-header {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
          color: white !important;
          border: none !important;
          position: relative;
        }

        .modern-table-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.1);
          pointer-events: none;
        }

        .modern-table-header th {
          background: transparent !important;
          color: white !important;
          border: none !important;
          font-weight: 600 !important;
          position: relative;
          z-index: 1;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .modern-header-cell {
          transition: all 0.2s ease;
        }

        .sort-icon {
          opacity: 0.7;
          transition: all 0.2s ease;
        }

        .sort-icon:hover {
          opacity: 1;
          transform: scale(1.1);
          color: #fbbf24 !important;
        }

        /* Modern table body styling */
        .modern-table tbody tr {
          border-bottom: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }

        .modern-table tbody tr:hover {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          transform: scale(1.005);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .modern-table tbody td {
          padding: 1rem 0.75rem;
          vertical-align: middle;
          border: none;
          font-size: 0.875rem;
        }

        /* Modern checkbox styling */
        .modern-checkbox input[type="checkbox"] {
          width: 1.25rem;
          height: 1.25rem;
          accent-color: #6366f1;
          border-radius: 0.375rem;
        }

        .text-purple {
          color: #6366f1 !important;
        }

        /* Modern action button styling */
        .action-menu-button {
          background: transparent;
          border: 2px solid #6366f1;
          color: #6366f1;
          padding: 0.375rem 0.75rem;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 0.5rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .action-menu-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          transition: left 0.3s ease;
          z-index: -1;
        }

        .action-menu-button:hover {
          color: white;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
        }

        .action-menu-button:hover::before {
          left: 0;
        }

        .action-menu-button:active {
          transform: translateY(0);
        }

        .action-menu-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .action-menu-button:disabled:hover {
          color: #6366f1;
          box-shadow: none;
        }

        /* Modern dropdown menu styling */
        .szh-menu {
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border-radius: 0.75rem;
          background: white;
          z-index: 1000;
          overflow: hidden;
          backdrop-filter: blur(10px);
        }

        .szh-menu__item {
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          color: #1e293b;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          font-weight: 500;
        }

        .szh-menu__item:hover {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          transform: translateX(4px);
        }

        .szh-menu__item.text-danger {
          color: #dc2626 !important;
        }

        .szh-menu__item.text-danger:hover {
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%) !important;
          color: #b91c1c !important;
          transform: translateX(4px);
        }

        .szh-menu__item.text-success {
          color: #16a34a !important;
        }

        .szh-menu__item.text-success:hover {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%) !important;
          color: #15803d !important;
          transform: translateX(4px);
        }

        /* Modern button styling */
        .btn-purple {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border: none;
          color: white;
          border-radius: 0.5rem;
          padding: 0.5rem 1rem;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 4px -1px rgba(99, 102, 241, 0.3);
        }

        .btn-purple:hover {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.4);
        }

        .btn-purple:active {
          transform: translateY(0);
        }

        /* Modern badge styling */
        .badge {
          font-weight: 600;
          font-size: 0.75rem;
          padding: 0.375rem 0.75rem;
          border-radius: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .badge.bg-success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
        }

        .badge.bg-warning {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
        }

        .badge.bg-danger {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
        }

        .badge.bg-primary {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
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

      {/* Enhanced styling theme object */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '1rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Decorative background gradient */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '300px',
            height: '200px',
            background: 'linear-gradient(135deg, #6366f115, #8b5cf610)',
            borderRadius: '50%',
            transform: 'translate(50%, -50%)',
            pointerEvents: 'none'
          }}
        />
        
        <div 
          className="table-responsive"
          style={{
            position: 'relative',
            zIndex: 1,
            borderRadius: '1rem'
          }}
        >
          <Table hover className="mb-0 modern-table">
            <thead className="modern-table-header">
              <tr>
                {enableBulkActions && (
                  <th style={{width: "40px", padding: '1rem 0.75rem'}}>
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
                      className="modern-checkbox"
                    />
                  </th>
                )}
                <th style={{width: "80px", padding: '1rem 0.75rem'}}>
                  <div className="d-flex align-items-center modern-header-cell">
                    <span style={{ fontWeight: '600', marginRight: '0.5rem' }}>Date</span>
                    <FontAwesomeIcon
                      icon={faSort}
                      className="sort-icon"
                      style={{cursor: "pointer", transition: 'all 0.2s ease'}}
                      onClick={() => handleSort("date")}
                    />
                  </div>
                </th>
                <th style={{width: "100px", padding: '1rem 0.75rem'}}>
                  <span style={{ fontWeight: '600' }}>
                    {isQuotationMode ? "Quote No." : "Invoice No."}
                  </span>
                </th>
                <th style={{width: "150px", padding: '1rem 0.75rem'}}>
                  <span style={{ fontWeight: '600' }}>Customer</span>
                </th>
                <th style={{width: "80px", padding: '1rem 0.75rem'}}>
                  <span style={{ fontWeight: '600' }}>Type</span>
                </th>
                <th style={{width: "100px", padding: '1rem 0.75rem'}} className="text-end">
                  <div className="d-flex align-items-center justify-content-end modern-header-cell">
                    <span style={{ fontWeight: '600', marginRight: '0.5rem' }}>Amount</span>
                    <FontAwesomeIcon
                      icon={faSort}
                      className="sort-icon"
                      style={{cursor: "pointer", transition: 'all 0.2s ease'}}
                      onClick={() => handleSort("amount")}
                    />
                  </div>
                </th>
                <th style={{width: "90px", padding: '1rem 0.75rem'}} className="text-end">
                  <span style={{ fontWeight: '600' }}>Balance</span>
                </th>
                <th style={{width: "80px", padding: '1rem 0.75rem'}}>
                  <span style={{ fontWeight: '600' }}>Status</span>
                </th>
                <th style={{width: "80px", padding: '1rem 0.75rem'}}>
                  <span style={{ fontWeight: '600' }}>Payment</span>
                </th>
                {enableActions && (
                  <th style={{width: "70px", padding: '1rem 0.75rem'}} className="text-center">
                    <span style={{ fontWeight: '600' }}>Actions</span>
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
