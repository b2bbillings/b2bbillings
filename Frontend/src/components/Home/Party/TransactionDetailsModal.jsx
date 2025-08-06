import React, {useState, useEffect} from "react";
import {
  Modal,
  Row,
  Col,
  Badge,
  Card,
  Button,
  Spinner,
  Alert,
  Table,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faFileInvoice,
  faCalendar,
  faRupeeSign,
  faUser,
  faBuilding,
  faPhone,
  faEnvelope,
  faMapMarkerAlt,
  faReceipt,
  faBank,
  faCreditCard,
  faMoneyBillWave,
  faCheckCircle,
  faClock,
  faTimesCircle,
  faExclamationTriangle,
  faEdit,
  faTrash,
  faCopy,
  faDownload,
  faShare,
  faEye,
  faEyeSlash,
  faArrowUp,
  faArrowDown,
  faInfoCircle,
  faHashtag,
  faStickyNote,
  faHistory,
  faLink,
  faPrint,
  faEnvelope as faEmail,
} from "@fortawesome/free-solid-svg-icons";
// Import WhatsApp icon from brands package
import {faWhatsapp} from "@fortawesome/free-brands-svg-icons";

import paymentService from "../../../services/paymentService";

const TransactionDetailsModal = ({
  show,
  onHide,
  transaction,
  selectedParty,
  formatCurrency,
  onEditTransaction,
  onDeleteTransaction,
  onDuplicateTransaction,
  companyId,
  addToast,
  currentUser,
  onTransactionUpdated,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [allocationDetails, setAllocationDetails] = useState([]);
  const [showAllocations, setShowAllocations] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  // Load detailed transaction information when modal opens
  useEffect(() => {
    if (show && transaction) {
      loadTransactionDetails();
    }
  }, [show, transaction]);

  const loadTransactionDetails = async () => {
    try {
      setLoading(true);
      setError("");

      // Try to get detailed transaction info
      if (transaction._id || transaction.id) {
        try {
          const detailsResponse = await paymentService.getTransactionDetails(
            transaction._id || transaction.id
          );
          if (detailsResponse.success) {
            setTransactionDetails(detailsResponse.data);
          } else {
            setTransactionDetails(transaction);
          }
        } catch (err) {
          setTransactionDetails(transaction);
        }
      } else {
        setTransactionDetails(transaction);
      }

      // Get payment allocations if available
      if (
        transaction.invoiceAllocations &&
        Array.isArray(transaction.invoiceAllocations)
      ) {
        setAllocationDetails(transaction.invoiceAllocations);
        setShowAllocations(true);
      } else if (
        transaction.purchaseInvoiceAllocations &&
        Array.isArray(transaction.purchaseInvoiceAllocations)
      ) {
        setAllocationDetails(transaction.purchaseInvoiceAllocations);
        setShowAllocations(true);
      } else if (transaction.paymentId) {
        try {
          const allocationsResponse =
            await paymentService.getPaymentAllocations(transaction.paymentId);
          if (
            allocationsResponse.success &&
            allocationsResponse.data.allocations
          ) {
            setAllocationDetails(allocationsResponse.data.allocations);
            setShowAllocations(true);
          }
        } catch (err) {
          // Silent fail for allocations
        }
      }
    } catch (err) {
      setError("Failed to load transaction details: " + err.message);
      setTransactionDetails(transaction);
    } finally {
      setLoading(false);
    }
  };

  // Show toast notification
  const showToast = (message, type = "info") => {
    if (addToast) {
      addToast(message, type);
    } else {
      if (type === "error") {
        alert(message);
      }
    }
  };

  // Get status configuration
  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return {color: "success", icon: faCheckCircle, text: "Completed"};
      case "pending":
        return {color: "warning", icon: faClock, text: "Pending"};
      case "failed":
        return {color: "danger", icon: faTimesCircle, text: "Failed"};
      case "cancelled":
        return {color: "secondary", icon: faTimesCircle, text: "Cancelled"};
      default:
        return {
          color: "secondary",
          icon: faExclamationTriangle,
          text: status || "Unknown",
        };
    }
  };

  // Get payment method configuration
  const getPaymentMethodConfig = (method) => {
    switch (method?.toLowerCase()) {
      case "cash":
        return {
          icon: faMoneyBillWave,
          text: "Cash",
          color: "success",
          emoji: "💵",
        };
      case "bank_transfer":
      case "bank transfer":
        return {
          icon: faBank,
          text: "Bank Transfer",
          color: "primary",
          emoji: "🏦",
        };
      case "cheque":
        return {icon: faReceipt, text: "Cheque", color: "info", emoji: "📝"};
      case "card":
        return {
          icon: faCreditCard,
          text: "Card",
          color: "warning",
          emoji: "💳",
        };
      case "upi":
        return {icon: faPhone, text: "UPI", color: "success", emoji: "📱"};
      default:
        return {
          icon: faMoneyBillWave,
          text: method || "Unknown",
          color: "secondary",
          emoji: "🔄",
        };
    }
  };

  // Format date with time
  const formatDateTime = (dateString) => {
    if (!dateString) return {date: "N/A", time: "N/A", full: "N/A"};

    const date = new Date(dateString);
    if (isNaN(date.getTime()))
      return {date: "Invalid", time: "Invalid", full: "Invalid Date"};

    return {
      date: date.toLocaleDateString("en-GB"),
      time: date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      full: date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  // Check action permissions
  const checkActionPermissions = (action) => {
    try {
      // Simple permission check - can be enhanced with actual service
      switch (action) {
        case "edit":
        case "delete":
          return {allowed: true, restrictions: []};
        default:
          return {allowed: true, restrictions: []};
      }
    } catch (error) {
      return {allowed: true, restrictions: []};
    }
  };

  // Handle actions
  const handleAction = async (action) => {
    try {
      setActionLoading(action);

      const permissions = checkActionPermissions(action);
      if (!permissions.allowed) {
        showToast(
          `Cannot ${action} transaction: ${permissions.restrictions.join(
            ", "
          )}`,
          "error"
        );
        return;
      }

      switch (action) {
        case "edit":
          onEditTransaction?.(transactionDetails || transaction);
          onHide();
          break;

        case "delete":
          if (
            window.confirm(
              `Are you sure you want to delete this transaction?\n\nTransaction: ${
                (transactionDetails || transaction).paymentNumber ||
                (transactionDetails || transaction).number
              }\nAmount: ₹${formatCurrency(
                (transactionDetails || transaction).amount
              )}\n\nThis action cannot be undone.`
            )
          ) {
            onDeleteTransaction?.(transactionDetails || transaction);
            onHide();
          }
          break;

        case "duplicate":
          onDuplicateTransaction?.(transactionDetails || transaction);
          showToast("Opening form with duplicate transaction data", "info");
          onHide();
          break;

        case "download":
          await handleDownloadTransaction();
          break;

        case "print":
          handlePrintTransaction();
          break;

        case "whatsapp":
          handleWhatsAppShare();
          break;

        default:
          break;
      }
    } catch (error) {
      showToast(`Failed to ${action} transaction: ${error.message}`, "error");
    } finally {
      setActionLoading("");
    }
  };

  // Download transaction as CSV
  const handleDownloadTransaction = async () => {
    try {
      const transactionData = transactionDetails || transaction;

      const summary = {
        "Transaction Number":
          transactionData.paymentNumber || transactionData.number || "N/A",
        Date: formatDateTime(
          transactionData.paymentDate || transactionData.createdAt
        ).full,
        Type: transactionData.type || "Payment Transaction",
        Amount: `₹${formatCurrency(
          transactionData.amount || transactionData.total
        )}`,
        "Payment Method": transactionData.paymentMethod || "N/A",
        Status: transactionData.status || "N/A",
        "Party Name": selectedParty?.name || transactionData.partyName || "N/A",
        Reference: transactionData.reference || "N/A",
        Notes: transactionData.notes || "N/A",
      };

      const csvContent = [
        "Field,Value",
        ...Object.entries(summary).map(([key, value]) => `"${key}","${value}"`),
      ].join("\n");

      const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Transaction_${
        transactionData.paymentNumber || transactionData.number || "Details"
      }_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast("Transaction details downloaded successfully", "success");
    } catch (error) {
      showToast("Failed to download transaction details", "error");
    }
  };

  // Print transaction
  const handlePrintTransaction = () => {
    try {
      const transactionData = transactionDetails || transaction;
      const printWindow = window.open("", "_blank");

      const printContent = `
                <html>
                <head>
                    <title>Transaction Details - ${
                      transactionData.paymentNumber || transactionData.number
                    }</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                        .row { display: flex; justify-content: space-between; margin: 10px 0; }
                        .label { font-weight: bold; }
                        .amount { font-size: 18px; font-weight: bold; color: ${
                          transactionData.type
                            ?.toLowerCase()
                            .includes("receipt") ||
                          transactionData.displayType === "pay-in"
                            ? "#28a745"
                            : "#dc3545"
                        }; }
                        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        .table th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>Transaction Details</h2>
                        <p>${
                          transactionData.paymentNumber ||
                          transactionData.number
                        }</p>
                    </div>
                    
                    <div class="row">
                        <span class="label">Transaction Type:</span>
                        <span>${
                          transactionData.type || "Payment Transaction"
                        }</span>
                    </div>
                    
                    <div class="row">
                        <span class="label">Amount:</span>
                        <span class="amount">₹${formatCurrency(
                          transactionData.amount || transactionData.total
                        )}</span>
                    </div>
                    
                    <div class="row">
                        <span class="label">Date & Time:</span>
                        <span>${
                          formatDateTime(
                            transactionData.paymentDate ||
                              transactionData.createdAt
                          ).full
                        }</span>
                    </div>
                    
                    <div class="row">
                        <span class="label">Payment Method:</span>
                        <span>${transactionData.paymentMethod || "N/A"}</span>
                    </div>
                    
                    <div class="row">
                        <span class="label">Status:</span>
                        <span>${transactionData.status || "N/A"}</span>
                    </div>
                    
                    <div class="row">
                        <span class="label">Party Name:</span>
                        <span>${
                          selectedParty?.name ||
                          transactionData.partyName ||
                          "N/A"
                        }</span>
                    </div>
                    
                    ${
                      transactionData.reference
                        ? `
                    <div class="row">
                        <span class="label">Reference:</span>
                        <span>${transactionData.reference}</span>
                    </div>
                    `
                        : ""
                    }
                    
                    ${
                      transactionData.notes
                        ? `
                    <div class="row">
                        <span class="label">Notes:</span>
                        <span>${transactionData.notes}</span>
                    </div>
                    `
                        : ""
                    }
                    
                    ${
                      allocationDetails.length > 0
                        ? `
                    <h3>Invoice Allocations</h3>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Invoice</th>
                                <th>Allocated Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allocationDetails
                              .map(
                                (allocation) => `
                                <tr>
                                    <td>${
                                      allocation.invoiceNumber || "N/A"
                                    }</td>
                                    <td>₹${formatCurrency(
                                      allocation.allocatedAmount || 0
                                    )}</td>
                                    <td>${
                                      allocation.paymentStatus || "N/A"
                                    }</td>
                                </tr>
                            `
                              )
                              .join("")}
                        </tbody>
                    </table>
                    `
                        : ""
                    }
                    
                    <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
                        <p>Generated on ${new Date().toLocaleString(
                          "en-IN"
                        )}</p>
                    </div>
                </body>
                </html>
            `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();

      showToast("Transaction details sent to printer", "success");
    } catch (error) {
      showToast("Failed to print transaction details", "error");
    }
  };

  // Share via WhatsApp
  const handleWhatsAppShare = () => {
    try {
      const transactionData = transactionDetails || transaction;
      const message = `*Transaction Details*%0A%0A*Number:* ${
        transactionData.paymentNumber || transactionData.number
      }%0A*Amount:* ₹${formatCurrency(
        transactionData.amount || transactionData.total
      )}%0A*Date:* ${
        formatDateTime(transactionData.paymentDate || transactionData.createdAt)
          .date
      }%0A*Type:* ${transactionData.type}%0A*Party:* ${
        selectedParty?.name || transactionData.partyName || "N/A"
      }%0A*Status:* ${transactionData.status}`;

      const whatsappUrl = `https://wa.me?text=${message}`;
      window.open(whatsappUrl, "_blank");

      showToast("WhatsApp opened with transaction details", "success");
    } catch (error) {
      showToast("Failed to share via WhatsApp", "error");
    }
  };

  if (!transaction) {
    return null;
  }

  const currentTransaction = transactionDetails || transaction;
  const statusConfig = getStatusConfig(currentTransaction.status);
  const methodConfig = getPaymentMethodConfig(currentTransaction.paymentMethod);
  const dateTime = formatDateTime(
    currentTransaction.paymentDate || currentTransaction.createdAt
  );
  const isPayIn =
    currentTransaction.type?.toLowerCase().includes("receipt") ||
    currentTransaction.displayType === "pay-in" ||
    currentTransaction.type === "payment_in";

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      backdrop="static"
      className="transaction-details-modal"
    >
      <Modal.Header className="border-bottom-0 pb-2">
        <div className="d-flex align-items-center w-100">
          <div className="flex-grow-1">
            <Modal.Title className="h5 mb-1 d-flex align-items-center text-dark">
              <Badge
                bg={isPayIn ? "success" : "danger"}
                className="me-2"
                style={{fontSize: "11px"}}
              >
                <FontAwesomeIcon
                  icon={isPayIn ? faArrowDown : faArrowUp}
                  className="me-1"
                />
                {isPayIn ? "PAYMENT IN" : "PAYMENT OUT"}
              </Badge>
              Transaction Details
            </Modal.Title>
            <div className="text-muted" style={{fontSize: "13px"}}>
              <FontAwesomeIcon icon={faHashtag} className="me-1" />
              {currentTransaction.number ||
                currentTransaction.paymentNumber ||
                "N/A"}
            </div>
          </div>
          <Button variant="link" className="p-0 text-muted" onClick={onHide}>
            <FontAwesomeIcon icon={faTimes} />
          </Button>
        </div>
      </Modal.Header>

      <Modal.Body className="p-0">
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" size="sm" className="me-2" />
            <span style={{fontSize: "14px"}}>Loading details...</span>
          </div>
        ) : error ? (
          <Alert variant="danger" className="m-3 mb-0">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            {error}
          </Alert>
        ) : (
          <div className="px-4 pb-4">
            {/* Transaction Overview */}
            <Card className="border-0 bg-light mb-3">
              <Card.Body className="p-3">
                <Row className="align-items-center">
                  <Col>
                    <div className="d-flex align-items-center mb-2">
                      <div
                        className={`rounded-circle bg-${
                          isPayIn ? "success" : "danger"
                        } bg-opacity-10 d-flex align-items-center justify-content-center me-3`}
                        style={{width: "50px", height: "50px"}}
                      >
                        <FontAwesomeIcon
                          icon={isPayIn ? faArrowDown : faArrowUp}
                          className={`text-${isPayIn ? "success" : "danger"}`}
                          size="lg"
                        />
                      </div>
                      <div>
                        <h4
                          className={`mb-1 fw-bold text-${
                            isPayIn ? "success" : "danger"
                          }`}
                        >
                          {isPayIn ? "+" : "-"}₹
                          {formatCurrency(
                            currentTransaction.amount ||
                              currentTransaction.total
                          )}
                        </h4>
                        <div className="text-muted" style={{fontSize: "14px"}}>
                          {currentTransaction.type || "Payment Transaction"}
                        </div>
                      </div>
                    </div>
                  </Col>
                  <Col xs="auto">
                    <Badge
                      bg={statusConfig.color}
                      className="px-3 py-2"
                      style={{fontSize: "12px"}}
                    >
                      <FontAwesomeIcon
                        icon={statusConfig.icon}
                        className="me-1"
                      />
                      {statusConfig.text}
                    </Badge>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Row className="g-3">
              {/* Transaction Details */}
              <Col md={6}>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Header className="bg-primary bg-opacity-10 border-0 py-2">
                    <h6 className="mb-0 text-dark fw-bold">
                      <FontAwesomeIcon
                        icon={faFileInvoice}
                        className="me-2 text-primary"
                      />
                      Transaction Details
                    </h6>
                  </Card.Header>
                  <Card.Body className="p-3">
                    <Table size="sm" className="mb-0">
                      <tbody>
                        <tr>
                          <td
                            className="text-muted border-0 ps-0"
                            style={{fontSize: "13px"}}
                          >
                            <FontAwesomeIcon
                              icon={faHashtag}
                              className="me-2"
                            />
                            Transaction ID
                          </td>
                          <td
                            className="border-0 fw-medium text-dark"
                            style={{fontSize: "13px"}}
                          >
                            {currentTransaction.number ||
                              currentTransaction.paymentNumber ||
                              "N/A"}
                          </td>
                        </tr>
                        <tr>
                          <td
                            className="text-muted border-0 ps-0"
                            style={{fontSize: "13px"}}
                          >
                            <FontAwesomeIcon
                              icon={faCalendar}
                              className="me-2"
                            />
                            Date & Time
                          </td>
                          <td
                            className="border-0 text-dark"
                            style={{fontSize: "13px"}}
                          >
                            <div>{dateTime.full}</div>
                          </td>
                        </tr>
                        <tr>
                          <td
                            className="text-muted border-0 ps-0"
                            style={{fontSize: "13px"}}
                          >
                            <FontAwesomeIcon
                              icon={faRupeeSign}
                              className="me-2"
                            />
                            Amount
                          </td>
                          <td className="border-0" style={{fontSize: "13px"}}>
                            <span
                              className={`fw-bold text-${
                                isPayIn ? "success" : "danger"
                              }`}
                            >
                              ₹
                              {formatCurrency(
                                currentTransaction.amount ||
                                  currentTransaction.total
                              )}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td
                            className="text-muted border-0 ps-0"
                            style={{fontSize: "13px"}}
                          >
                            <FontAwesomeIcon
                              icon={methodConfig.icon}
                              className="me-2"
                            />
                            Payment Method
                          </td>
                          <td className="border-0" style={{fontSize: "13px"}}>
                            <Badge bg={methodConfig.color} className="me-1">
                              {methodConfig.emoji}
                            </Badge>
                            <span className="text-dark">
                              {methodConfig.text}
                            </span>
                          </td>
                        </tr>
                        {currentTransaction.reference && (
                          <tr>
                            <td
                              className="text-muted border-0 ps-0"
                              style={{fontSize: "13px"}}
                            >
                              <FontAwesomeIcon icon={faLink} className="me-2" />
                              Reference
                            </td>
                            <td
                              className="border-0 font-monospace text-dark"
                              style={{fontSize: "13px"}}
                            >
                              {currentTransaction.reference}
                            </td>
                          </tr>
                        )}
                        {(currentTransaction.bankName ||
                          currentTransaction.bankDetails?.bankName) && (
                          <tr>
                            <td
                              className="text-muted border-0 ps-0"
                              style={{fontSize: "13px"}}
                            >
                              <FontAwesomeIcon icon={faBank} className="me-2" />
                              Bank Details
                            </td>
                            <td className="border-0" style={{fontSize: "13px"}}>
                              <div className="text-dark">
                                {currentTransaction.bankName ||
                                  currentTransaction.bankDetails?.bankName}
                              </div>
                              {(currentTransaction.accountNumber ||
                                currentTransaction.bankDetails
                                  ?.accountNumber) && (
                                <small className="text-muted">
                                  A/c: ****
                                  {(
                                    currentTransaction.accountNumber ||
                                    currentTransaction.bankDetails
                                      ?.accountNumber
                                  ).slice(-4)}
                                </small>
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>

              {/* Party Details */}
              <Col md={6}>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Header className="bg-info bg-opacity-10 border-0 py-2">
                    <h6 className="mb-0 text-dark fw-bold">
                      <FontAwesomeIcon
                        icon={faUser}
                        className="me-2 text-info"
                      />
                      Party Details
                    </h6>
                  </Card.Header>
                  <Card.Body className="p-3">
                    <Table size="sm" className="mb-0">
                      <tbody>
                        <tr>
                          <td
                            className="text-muted border-0 ps-0"
                            style={{fontSize: "13px"}}
                          >
                            <FontAwesomeIcon icon={faUser} className="me-2" />
                            Party Name
                          </td>
                          <td
                            className="border-0 fw-medium text-dark"
                            style={{fontSize: "13px"}}
                          >
                            {selectedParty?.name ||
                              currentTransaction.partyName ||
                              "N/A"}
                            {selectedParty?.partyType && (
                              <Badge
                                bg={
                                  selectedParty.partyType === "customer"
                                    ? "success"
                                    : "warning"
                                }
                                className="ms-2"
                                style={{fontSize: "10px"}}
                              >
                                {selectedParty.partyType}
                              </Badge>
                            )}
                          </td>
                        </tr>
                        {selectedParty?.phone && (
                          <tr>
                            <td
                              className="text-muted border-0 ps-0"
                              style={{fontSize: "13px"}}
                            >
                              <FontAwesomeIcon
                                icon={faPhone}
                                className="me-2"
                              />
                              Phone
                            </td>
                            <td
                              className="border-0 text-dark"
                              style={{fontSize: "13px"}}
                            >
                              {selectedParty.phone}
                            </td>
                          </tr>
                        )}
                        {selectedParty?.email && (
                          <tr>
                            <td
                              className="text-muted border-0 ps-0"
                              style={{fontSize: "13px"}}
                            >
                              <FontAwesomeIcon
                                icon={faEnvelope}
                                className="me-2"
                              />
                              Email
                            </td>
                            <td
                              className="border-0 text-dark"
                              style={{fontSize: "13px"}}
                            >
                              {selectedParty.email}
                            </td>
                          </tr>
                        )}
                        {selectedParty?.companyName && (
                          <tr>
                            <td
                              className="text-muted border-0 ps-0"
                              style={{fontSize: "13px"}}
                            >
                              <FontAwesomeIcon
                                icon={faBuilding}
                                className="me-2"
                              />
                              Company
                            </td>
                            <td
                              className="border-0 text-dark"
                              style={{fontSize: "13px"}}
                            >
                              {selectedParty.companyName}
                            </td>
                          </tr>
                        )}
                        {selectedParty?.address && (
                          <tr>
                            <td
                              className="text-muted border-0 ps-0"
                              style={{fontSize: "13px"}}
                            >
                              <FontAwesomeIcon
                                icon={faMapMarkerAlt}
                                className="me-2"
                              />
                              Address
                            </td>
                            <td
                              className="border-0 text-dark"
                              style={{fontSize: "13px"}}
                            >
                              {selectedParty.address}
                            </td>
                          </tr>
                        )}
                        {selectedParty?.currentBalance !== undefined && (
                          <tr>
                            <td
                              className="text-muted border-0 ps-0"
                              style={{fontSize: "13px"}}
                            >
                              <FontAwesomeIcon
                                icon={faRupeeSign}
                                className="me-2"
                              />
                              Current Balance
                            </td>
                            <td className="border-0" style={{fontSize: "13px"}}>
                              <span
                                className={`fw-bold ${
                                  selectedParty.currentBalance >= 0
                                    ? "text-success"
                                    : "text-danger"
                                }`}
                              >
                                ₹
                                {formatCurrency(
                                  Math.abs(selectedParty.currentBalance)
                                )}
                                {selectedParty.currentBalance < 0
                                  ? " (Owe)"
                                  : " (Credit)"}
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Notes Section */}
            {currentTransaction.notes && (
              <Card className="border-0 shadow-sm mt-3">
                <Card.Header className="bg-warning bg-opacity-10 border-0 py-2">
                  <h6 className="mb-0 text-dark fw-bold">
                    <FontAwesomeIcon
                      icon={faStickyNote}
                      className="me-2 text-warning"
                    />
                    Notes
                  </h6>
                </Card.Header>
                <Card.Body className="p-3">
                  <p className="mb-0 text-dark" style={{fontSize: "13px"}}>
                    {currentTransaction.notes}
                  </p>
                </Card.Body>
              </Card>
            )}

            {/* Invoice Allocations */}
            {allocationDetails.length > 0 && (
              <Card className="border-0 shadow-sm mt-3">
                <Card.Header className="bg-success bg-opacity-10 border-0 py-2">
                  <div className="d-flex align-items-center justify-content-between">
                    <h6 className="mb-0 text-dark fw-bold">
                      <FontAwesomeIcon
                        icon={faReceipt}
                        className="me-2 text-success"
                      />
                      Invoice Allocations ({allocationDetails.length})
                    </h6>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 text-success"
                      onClick={() => setShowAllocations(!showAllocations)}
                    >
                      <FontAwesomeIcon
                        icon={showAllocations ? faEyeSlash : faEye}
                      />
                    </Button>
                  </div>
                </Card.Header>
                {showAllocations && (
                  <Card.Body className="p-0">
                    <Table size="sm" className="mb-0">
                      <thead className="bg-light">
                        <tr>
                          <th
                            className="border-0 text-dark fw-bold"
                            style={{fontSize: "12px"}}
                          >
                            Invoice
                          </th>
                          <th
                            className="border-0 text-end text-dark fw-bold"
                            style={{fontSize: "12px"}}
                          >
                            Allocated
                          </th>
                          <th
                            className="border-0 text-end text-dark fw-bold"
                            style={{fontSize: "12px"}}
                          >
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {allocationDetails.map((allocation, index) => (
                          <tr key={index}>
                            <td
                              className="border-0 text-dark"
                              style={{fontSize: "12px"}}
                            >
                              {allocation.invoiceNumber ||
                                allocation.purchaseNumber ||
                                `Invoice ${index + 1}`}
                            </td>
                            <td
                              className="border-0 text-end text-success fw-medium"
                              style={{fontSize: "12px"}}
                            >
                              ₹{formatCurrency(allocation.allocatedAmount || 0)}
                            </td>
                            <td
                              className="border-0 text-end"
                              style={{fontSize: "12px"}}
                            >
                              <Badge
                                bg={
                                  allocation.paymentStatus === "paid"
                                    ? "success"
                                    : "warning"
                                }
                                style={{fontSize: "10px"}}
                              >
                                {allocation.paymentStatus || "Applied"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                )}
              </Card>
            )}

            {/* Transaction Timeline */}
            <Card className="border-0 shadow-sm mt-3">
              <Card.Header className="bg-secondary bg-opacity-10 border-0 py-2">
                <h6 className="mb-0 text-dark fw-bold">
                  <FontAwesomeIcon
                    icon={faHistory}
                    className="me-2 text-secondary"
                  />
                  Transaction Timeline
                </h6>
              </Card.Header>
              <Card.Body className="p-3">
                <div className="timeline">
                  <div className="timeline-item d-flex align-items-center mb-2">
                    <div
                      className="timeline-marker bg-success rounded-circle me-3"
                      style={{width: "8px", height: "8px"}}
                    ></div>
                    <div style={{fontSize: "12px"}}>
                      <div className="fw-medium text-dark">
                        Transaction Created
                      </div>
                      <div className="text-muted">
                        {currentTransaction.createdAt
                          ? formatDateTime(currentTransaction.createdAt).full
                          : "N/A"}
                      </div>
                    </div>
                  </div>
                  {currentTransaction.status === "completed" && (
                    <div className="timeline-item d-flex align-items-center mb-2">
                      <div
                        className="timeline-marker bg-primary rounded-circle me-3"
                        style={{width: "8px", height: "8px"}}
                      ></div>
                      <div style={{fontSize: "12px"}}>
                        <div className="fw-medium text-dark">
                          Payment Processed
                        </div>
                        <div className="text-muted">
                          {currentTransaction.paymentDate
                            ? formatDateTime(currentTransaction.paymentDate)
                                .full
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                  )}
                  {currentTransaction.updatedAt &&
                    currentTransaction.updatedAt !==
                      currentTransaction.createdAt && (
                      <div className="timeline-item d-flex align-items-center">
                        <div
                          className="timeline-marker bg-warning rounded-circle me-3"
                          style={{width: "8px", height: "8px"}}
                        ></div>
                        <div style={{fontSize: "12px"}}>
                          <div className="fw-medium text-dark">
                            Last Updated
                          </div>
                          <div className="text-muted">
                            {formatDateTime(currentTransaction.updatedAt).full}
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </Card.Body>
            </Card>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="border-top-0 pt-0">
        <div className="d-flex justify-content-between w-100">
          <div className="d-flex gap-2 flex-wrap">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => handleAction("download")}
              disabled={actionLoading === "download"}
            >
              {actionLoading === "download" ? (
                <Spinner size="sm" className="me-1" />
              ) : (
                <FontAwesomeIcon icon={faDownload} className="me-1" />
              )}
              Download
            </Button>

            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => handleAction("print")}
              disabled={actionLoading === "print"}
            >
              {actionLoading === "print" ? (
                <Spinner size="sm" className="me-1" />
              ) : (
                <FontAwesomeIcon icon={faPrint} className="me-1" />
              )}
              Print
            </Button>

            <Button
              variant="outline-info"
              size="sm"
              onClick={() => handleAction("duplicate")}
              disabled={actionLoading === "duplicate"}
            >
              {actionLoading === "duplicate" ? (
                <Spinner size="sm" className="me-1" />
              ) : (
                <FontAwesomeIcon icon={faCopy} className="me-1" />
              )}
              Duplicate
            </Button>

            <Button
              variant="outline-success"
              size="sm"
              onClick={() => handleAction("whatsapp")}
              disabled={actionLoading === "whatsapp"}
            >
              {actionLoading === "whatsapp" ? (
                <Spinner size="sm" className="me-1" />
              ) : (
                <FontAwesomeIcon icon={faWhatsapp} className="me-1" />
              )}
              WhatsApp
            </Button>
          </div>

          <div className="d-flex gap-2">
            <Button
              variant="outline-warning"
              size="sm"
              onClick={() => handleAction("edit")}
              disabled={
                actionLoading === "edit" ||
                !checkActionPermissions("edit").allowed
              }
            >
              {actionLoading === "edit" ? (
                <Spinner size="sm" className="me-1" />
              ) : (
                <FontAwesomeIcon icon={faEdit} className="me-1" />
              )}
              Edit
            </Button>

            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => handleAction("delete")}
              disabled={
                actionLoading === "delete" ||
                !checkActionPermissions("delete").allowed
              }
            >
              {actionLoading === "delete" ? (
                <Spinner size="sm" className="me-1" />
              ) : (
                <FontAwesomeIcon icon={faTrash} className="me-1" />
              )}
              Delete
            </Button>

            <Button variant="secondary" size="sm" onClick={onHide}>
              Close
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default TransactionDetailsModal;
