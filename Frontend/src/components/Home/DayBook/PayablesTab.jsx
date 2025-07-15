import React, {useState} from "react";
import {Table, Button, Badge, Spinner} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faHandHoldingUsd,
  faPhone,
  faEye,
  faBuilding,
  faCheckCircle,
  faExclamationTriangle,
  faClock,
  faMoneyBillWave,
} from "@fortawesome/free-solid-svg-icons";

// Import PayOut component
import PayOut from "../Party/PayOut";

function PayablesTab({
  payables,
  loading,
  formatCurrency,
  formatDate,
  getPriorityBadge,
  handleMakePayment,
  handleContact,
  onNavigate,
  companyId,
  currentCompany,
  currentUser,
  addToast, // ✅ NEW: Add addToast prop for notifications
}) {
  // ✅ State for PayOut modal
  const [showPayOutModal, setShowPayOutModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  // ✅ Enhanced sorting with proper priority mapping - Added safety check
  const sortedPayables = Array.isArray(payables)
    ? payables.sort((a, b) => {
        const priorityOrder = {
          overdue: 0,
          due_today: 1,
          pending: 2,
          upcoming: 3,
        };

        // Get priority from type or priority field
        const aPriority =
          priorityOrder[a.type] ?? priorityOrder[a.priority] ?? 4;
        const bPriority =
          priorityOrder[b.type] ?? priorityOrder[b.priority] ?? 4;

        return aPriority - bPriority;
      })
    : [];

  // ✅ Helper function to get status icon
  const getStatusIcon = (type) => {
    switch (type) {
      case "overdue":
        return faExclamationTriangle;
      case "due_today":
        return faClock;
      case "pending":
        return faMoneyBillWave;
      default:
        return faMoneyBillWave;
    }
  };

  // ✅ Helper function to get row class
  const getRowClass = (purchase) => {
    if (purchase.type === "overdue") return "table-danger";
    if (purchase.type === "due_today") return "table-warning";
    return "";
  };

  // ✅ Helper function to format supplier information - Enhanced
  const formatSupplierInfo = (purchase) => {
    const supplier = purchase.supplier || {};
    const supplierName =
      supplier.name ||
      purchase.supplierName ||
      purchase.partyName ||
      "Unknown Supplier";

    const supplierMobile =
      supplier.mobile ||
      supplier.phone ||
      purchase.supplierMobile ||
      purchase.partyPhone ||
      purchase.mobileNumber ||
      "";

    const supplierEmail =
      supplier.email || purchase.supplierEmail || purchase.partyEmail || "";

    return {name: supplierName, mobile: supplierMobile, email: supplierEmail};
  };

  // ✅ Helper function to get purchase number
  const getPurchaseNumber = (purchase) => {
    return (
      purchase.purchaseNumber ||
      purchase.billNumber ||
      purchase.invoiceNumber ||
      purchase.number ||
      `PB-${purchase._id?.slice(-6) || "XXXXXX"}`
    );
  };

  // ✅ Helper function to get purchase date
  const getPurchaseDate = (purchase) => {
    return (
      purchase.purchaseDate ||
      purchase.billDate ||
      purchase.invoiceDate ||
      purchase.date ||
      purchase.createdAt
    );
  };

  // ✅ Helper function to get due date with formatting - Enhanced
  const getDueDate = (purchase) => {
    const dueDate =
      purchase.payment?.dueDate ||
      purchase.dueDate ||
      purchase.paymentDueDate ||
      purchase.paymentDate;

    if (!dueDate) return "No due date";

    return dueDate;
  };

  // ✅ Helper function to get total amount
  const getTotalAmount = (purchase) => {
    return (
      purchase.totals?.finalTotal ||
      purchase.totalAmount ||
      purchase.amount ||
      purchase.total ||
      purchase.grandTotal ||
      0
    );
  };

  // ✅ Helper function to get pending amount - Enhanced
  const getPendingAmount = (purchase) => {
    return (
      purchase.payment?.pendingAmount ||
      purchase.pendingAmount ||
      purchase.balanceAmount ||
      purchase.outstandingAmount ||
      purchase.dueAmount ||
      getTotalAmount(purchase) // If no pending amount, assume full amount is pending
    );
  };

  // ✅ ENHANCED: Handle payment from DayBook with better error handling
  const handlePaymentFromDayBook = (purchase) => {
    try {
      const supplierInfo = formatSupplierInfo(purchase);
      const pendingAmount = getPendingAmount(purchase);

      // ✅ Validate data before opening modal
      if (!purchase._id && !purchase.id) {
        addToast?.("Purchase record is missing required ID", "error");
        return;
      }

      if (pendingAmount <= 0) {
        addToast?.("No pending amount to pay for this purchase", "warning");
        return;
      }

      // ✅ Create a comprehensive party object compatible with PayOut component
      const supplierParty = {
        _id: purchase.supplier?._id || purchase.supplierId || purchase.partyId,
        id: purchase.supplier?.id || purchase.supplierId || purchase.partyId,
        name: supplierInfo.name,
        mobile: supplierInfo.mobile,
        email: supplierInfo.email,
        currentBalance: pendingAmount,
        balance: pendingAmount,
        type: "supplier",
        // ✅ Enhanced supplier data
        address: purchase.supplier?.address || "",
        gstNumber: purchase.supplier?.gstNumber || "",
        contactPerson: purchase.supplier?.contactPerson || "",
        ...purchase.supplier,
      };

      // ✅ Enhanced purchase data for context
      const enhancedPurchase = {
        ...purchase,
        // Ensure all required fields are present
        _id: purchase._id || purchase.id,
        id: purchase._id || purchase.id,
        purchaseNumber: getPurchaseNumber(purchase),
        totalAmount: getTotalAmount(purchase),
        pendingAmount: pendingAmount,
        dueAmount: pendingAmount,
        supplierInfo: supplierInfo,
        formattedTotal: formatCurrency(getTotalAmount(purchase)),
        formattedPending: formatCurrency(pendingAmount),
      };

      setSelectedSupplier(supplierParty);
      setSelectedPurchase(enhancedPurchase);
      setShowPayOutModal(true);

      // ✅ Add success feedback
      addToast?.(`Opening payment form for ${supplierInfo.name}`, "info");
    } catch (error) {
      addToast?.("Failed to open payment form. Please try again.", "error");
    }
  };

  // ✅ ENHANCED: Handle payment recorded with better feedback
  const handlePaymentRecorded = async (paymentResult) => {
    try {
      // ✅ Hide the modal
      setShowPayOutModal(false);
      setSelectedSupplier(null);
      setSelectedPurchase(null);

      // ✅ Show success notification
      const amount = paymentResult.amount || paymentResult.data?.amount;
      const partyName = paymentResult.partyName || selectedSupplier?.name;
      const paymentNumber =
        paymentResult.data?.paymentNumber || paymentResult.paymentNumber;

      let successMessage = `✅ Payment made successfully!`;
      if (amount) {
        successMessage += `\n💰 Amount: ${formatCurrency(amount)}`;
      }
      if (partyName) {
        successMessage += `\n🏢 Supplier: ${partyName}`;
      }
      if (paymentNumber) {
        successMessage += `\n📄 Payment #: ${paymentNumber}`;
      }

      // ✅ Add bank transaction info if available
      if (
        paymentResult.bankTransactionCreated &&
        paymentResult.bankTransaction
      ) {
        successMessage += `\n🏦 Bank Transaction: ${paymentResult.bankTransaction.transactionNumber}`;
      }

      addToast?.(successMessage, "success");

      // ✅ Call the original handler if provided
      if (handleMakePayment && selectedPurchase) {
        handleMakePayment(selectedPurchase);
      }

      // ✅ Optional: Trigger data refresh
      if (typeof window !== "undefined" && window.refreshDayBookData) {
        setTimeout(() => {
          window.refreshDayBookData();
        }, 1000);
      }
    } catch (error) {
      addToast?.(
        "Payment recorded but there was an error updating the display",
        "warning"
      );
    }
  };

  // ✅ Enhanced: Close payment modal with cleanup
  const handleClosePaymentModal = () => {
    setShowPayOutModal(false);
    setSelectedSupplier(null);
    setSelectedPurchase(null);
  };

  // ✅ Enhanced contact handler with better validation
  const handleContactAction = (party, method) => {
    try {
      if (method === "phone" && party.mobile) {
        // ✅ Open phone app
        window.open(`tel:${party.mobile}`);
        addToast?.(`Calling ${party.name}...`, "info");
      } else if (method === "email" && party.email) {
        // ✅ Open email app
        window.open(`mailto:${party.email}`);
        addToast?.(`Opening email to ${party.name}...`, "info");
      } else if (method === "reminder") {
        // ✅ Handle payment reminder
        addToast?.(`Payment reminder sent to ${party.name}`, "success");
        // TODO: Implement actual reminder functionality
      } else {
        addToast?.(`Contact method not available for ${party.name}`, "warning");
      }

      // ✅ Call original handler if provided
      if (handleContact) {
        handleContact(party, method);
      }
    } catch (error) {
      addToast?.("Failed to initiate contact", "error");
    }
  };

  // ✅ Enhanced navigation handler
  const handleNavigateToInvoice = (purchase) => {
    try {
      const invoiceId = purchase._id || purchase.id;
      if (!invoiceId) {
        addToast?.("Cannot view invoice - missing invoice ID", "error");
        return;
      }

      if (onNavigate) {
        onNavigate("purchaseInvoice", {
          id: invoiceId,
          purchaseId: invoiceId,
          invoiceNumber: getPurchaseNumber(purchase),
        });
      } else {
        addToast?.("Navigation not available", "warning");
      }
    } catch (error) {
      addToast?.("Failed to open invoice", "error");
    }
  };

  return (
    <>
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
              sortedPayables.map((purchase) => {
                const supplierInfo = formatSupplierInfo(purchase);
                const purchaseNumber = getPurchaseNumber(purchase);
                const purchaseDate = getPurchaseDate(purchase);
                const dueDate = getDueDate(purchase);
                const totalAmount = getTotalAmount(purchase);
                const pendingAmount = getPendingAmount(purchase);

                return (
                  <tr
                    key={purchase._id || purchase.id}
                    className={getRowClass(purchase)}
                  >
                    {/* ✅ Status Column */}
                    <td>
                      <div className="d-flex align-items-center">
                        <FontAwesomeIcon
                          icon={getStatusIcon(purchase.type)}
                          className={`me-2 ${
                            purchase.type === "overdue"
                              ? "text-danger"
                              : purchase.type === "due_today"
                              ? "text-warning"
                              : "text-primary"
                          }`}
                        />
                        {getPriorityBadge(
                          purchase.type || purchase.priority || "pending"
                        )}
                      </div>
                    </td>

                    {/* ✅ Bill/Invoice Column */}
                    <td>
                      <div>
                        <strong className="d-block">{purchaseNumber}</strong>
                        <small className="text-muted">
                          Total: {formatCurrency(totalAmount)}
                        </small>
                        {purchase.status && (
                          <div>
                            <small className="text-muted">
                              Status: {purchase.status}
                            </small>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* ✅ Supplier Column - Enhanced with email support */}
                    <td>
                      <div>
                        <FontAwesomeIcon
                          icon={faBuilding}
                          className="me-2 text-primary"
                        />
                        <strong className="d-block">{supplierInfo.name}</strong>
                        {supplierInfo.mobile && (
                          <small className="text-muted d-block">
                            📞 {supplierInfo.mobile}
                          </small>
                        )}
                        {supplierInfo.email && (
                          <small className="text-muted d-block">
                            ✉️ {supplierInfo.email}
                          </small>
                        )}
                      </div>
                    </td>

                    {/* ✅ Date Column */}
                    <td>
                      <div>
                        {formatDate(purchaseDate)}
                        {purchase.createdAt &&
                          purchaseDate !== purchase.createdAt && (
                            <div>
                              <small className="text-muted">
                                Created: {formatDate(purchase.createdAt)}
                              </small>
                            </div>
                          )}
                      </div>
                    </td>

                    {/* ✅ Due Date Column */}
                    <td>
                      <span
                        className={
                          purchase.type === "overdue"
                            ? "text-danger fw-bold"
                            : purchase.type === "due_today"
                            ? "text-warning fw-bold"
                            : ""
                        }
                      >
                        {formatDate(dueDate)}
                      </span>
                      {purchase.type === "overdue" && (
                        <div>
                          <small className="text-danger">
                            <FontAwesomeIcon
                              icon={faExclamationTriangle}
                              className="me-1"
                            />
                            Overdue
                          </small>
                        </div>
                      )}
                      {purchase.type === "due_today" && (
                        <div>
                          <small className="text-warning">
                            <FontAwesomeIcon icon={faClock} className="me-1" />
                            Due Today
                          </small>
                        </div>
                      )}
                    </td>

                    {/* ✅ Amount Due Column */}
                    <td className="text-end">
                      <strong
                        className={
                          purchase.type === "overdue"
                            ? "text-danger"
                            : "text-primary"
                        }
                      >
                        {formatCurrency(pendingAmount)}
                      </strong>
                      {pendingAmount !== totalAmount && (
                        <div>
                          <small className="text-muted">
                            of {formatCurrency(totalAmount)}
                          </small>
                        </div>
                      )}
                      {purchase.payment?.paidAmount > 0 && (
                        <div>
                          <small className="text-success">
                            Paid: {formatCurrency(purchase.payment.paidAmount)}
                          </small>
                        </div>
                      )}
                    </td>

                    {/* ✅ Actions Column - Enhanced */}
                    <td className="text-center">
                      <div className="btn-group-sm d-flex flex-wrap gap-1 justify-content-center">
                        {/* ✅ ENHANCED: Make Payment Button */}
                        <Button
                          variant={
                            purchase.type === "overdue" ? "danger" : "primary"
                          }
                          size="sm"
                          onClick={() => handlePaymentFromDayBook(purchase)}
                          title={`Make payment of ${formatCurrency(
                            pendingAmount
                          )}`}
                          disabled={pendingAmount <= 0}
                        >
                          <FontAwesomeIcon icon={faHandHoldingUsd} />
                        </Button>

                        {/* ✅ ENHANCED: Call Supplier Button */}
                        {supplierInfo.mobile && (
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() =>
                              handleContactAction(
                                {
                                  name: supplierInfo.name,
                                  mobile: supplierInfo.mobile,
                                  email: supplierInfo.email,
                                  ...purchase.supplier,
                                },
                                "phone"
                              )
                            }
                            title={`Call ${supplierInfo.name}`}
                          >
                            <FontAwesomeIcon icon={faPhone} />
                          </Button>
                        )}

                        {/* ✅ ENHANCED: View Bill Button */}
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => handleNavigateToInvoice(purchase)}
                          title="View Purchase Bill"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </Button>

                        {/* ✅ ENHANCED: Additional Quick Actions for Overdue */}
                        {purchase.type === "overdue" && (
                          <Button
                            variant="outline-warning"
                            size="sm"
                            onClick={() =>
                              handleContactAction(
                                {
                                  name: supplierInfo.name,
                                  mobile: supplierInfo.mobile,
                                  email: supplierInfo.email,
                                  ...purchase.supplier,
                                },
                                "reminder"
                              )
                            }
                            title="Send Payment Reminder"
                          >
                            <FontAwesomeIcon icon={faExclamationTriangle} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-5 text-muted">
                  <div className="d-flex flex-column align-items-center">
                    <FontAwesomeIcon
                      icon={faCheckCircle}
                      size="3x"
                      className="mb-3 text-success"
                    />
                    <h5 className="mb-2">All Clear! 🎉</h5>
                    <p className="mb-0">
                      No outstanding payables found. All bills are paid up!
                    </p>
                    <small className="text-muted mt-2">
                      Your payment management is on track.
                    </small>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </Table>

        {/* ✅ Enhanced Footer Summary with better calculations */}
        {!loading && sortedPayables.length > 0 && (
          <div className="mt-3 p-3 bg-light rounded">
            <div className="row text-center">
              <div className="col-md-3">
                <div className="text-muted small">Total Payables</div>
                <div className="fw-bold text-primary">
                  {sortedPayables.length}
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-muted small">Total Amount Due</div>
                <div className="fw-bold text-primary">
                  {formatCurrency(
                    sortedPayables.reduce(
                      (sum, p) => sum + getPendingAmount(p),
                      0
                    )
                  )}
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-muted small">Overdue</div>
                <div className="fw-bold text-danger">
                  {sortedPayables.filter((p) => p.type === "overdue").length}
                  <small className="d-block">
                    {formatCurrency(
                      sortedPayables
                        .filter((p) => p.type === "overdue")
                        .reduce((sum, p) => sum + getPendingAmount(p), 0)
                    )}
                  </small>
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-muted small">Due Today</div>
                <div className="fw-bold text-warning">
                  {sortedPayables.filter((p) => p.type === "due_today").length}
                  <small className="d-block">
                    {formatCurrency(
                      sortedPayables
                        .filter((p) => p.type === "due_today")
                        .reduce((sum, p) => sum + getPendingAmount(p), 0)
                    )}
                  </small>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ ENHANCED: PayOut Modal Integration with error boundary */}
      {showPayOutModal && selectedSupplier && (
        <PayOut
          show={showPayOutModal}
          onHide={handleClosePaymentModal}
          party={selectedSupplier}
          onPaymentRecorded={handlePaymentRecorded}
          currentCompany={currentCompany}
          companyId={companyId}
          currentUser={currentUser}
          // ✅ Pass additional context for better UX
          initialPurchase={selectedPurchase}
          source="daybook" // ✅ Indicates this came from DayBook
        />
      )}
    </>
  );
}

export default PayablesTab;
