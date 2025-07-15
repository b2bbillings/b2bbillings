import React, {useState} from "react";
import {Table, Button, Badge, Spinner} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faMoneyBillWave,
  faPhone,
  faEye,
  faUser,
  faCheckCircle,
  faExclamationTriangle,
  faClock,
  faFileInvoice,
} from "@fortawesome/free-solid-svg-icons";

// Import PayIn component
import PayIn from "../Party/PayIn";

function ReceivablesTab({
  receivables,
  loading,
  formatCurrency,
  formatDate,
  getPriorityBadge,
  handleReceivePayment,
  handleContact,
  onNavigate,
  companyId,
  currentCompany,
  currentUser,
  addToast, // ✅ Add this prop for success messages
}) {
  // ✅ State for PayIn modal
  const [showPayInModal, setShowPayInModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);

  // ✅ FIXED: Enhanced sorting with proper priority mapping
  const sortedReceivables = receivables.sort((a, b) => {
    const priorityOrder = {
      overdue: 0,
      due_today: 1,
      pending: 2,
      upcoming: 3,
    };

    const aPriority = priorityOrder[a.type] ?? priorityOrder[a.priority] ?? 4;
    const bPriority = priorityOrder[b.type] ?? priorityOrder[b.priority] ?? 4;

    return aPriority - bPriority;
  });

  // ✅ Helper function to get status icon
  const getStatusIcon = (type) => {
    switch (type) {
      case "overdue":
        return faExclamationTriangle;
      case "due_today":
        return faClock;
      case "pending":
        return faFileInvoice;
      default:
        return faFileInvoice;
    }
  };

  // ✅ Helper function to get row class
  const getRowClass = (sale) => {
    if (sale.type === "overdue") return "table-danger";
    if (sale.type === "due_today") return "table-warning";
    return "";
  };

  // ✅ Helper function to format customer information
  const formatCustomerInfo = (sale) => {
    const customer = sale.customer || {};
    const customerName =
      customer.name ||
      sale.customerName ||
      sale.partyName ||
      "Unknown Customer";

    const customerMobile =
      customer.mobile ||
      customer.phone ||
      sale.customerMobile ||
      sale.partyPhone ||
      sale.mobileNumber ||
      "";

    return {name: customerName, mobile: customerMobile};
  };

  // ✅ Helper function to get sale number
  const getSaleNumber = (sale) => {
    return (
      sale.saleNumber ||
      sale.invoiceNumber ||
      sale.orderNumber ||
      sale.number ||
      `INV-${sale._id?.slice(-6) || "XXXXXX"}`
    );
  };

  // ✅ Helper function to get sale date
  const getSaleDate = (sale) => {
    return (
      sale.saleDate ||
      sale.invoiceDate ||
      sale.orderDate ||
      sale.date ||
      sale.createdAt
    );
  };

  // ✅ Helper function to get due date with formatting
  const getDueDate = (sale) => {
    const dueDate =
      sale.payment?.dueDate || sale.dueDate || sale.paymentDueDate;

    if (!dueDate) return "No due date";

    return dueDate;
  };

  // ✅ Helper function to get total amount
  const getTotalAmount = (sale) => {
    return (
      sale.totals?.finalTotal ||
      sale.totalAmount ||
      sale.amount ||
      sale.total ||
      sale.grandTotal ||
      0
    );
  };

  // ✅ Helper function to get pending amount
  const getPendingAmount = (sale) => {
    return (
      sale.payment?.pendingAmount ||
      sale.pendingAmount ||
      sale.balanceAmount ||
      sale.outstandingAmount ||
      getTotalAmount(sale)
    );
  };

  // ✅ ENHANCED: Handle payment from DayBook with complete data
  const handlePaymentFromDayBook = (sale) => {
    const customerInfo = formatCustomerInfo(sale);
    const pendingAmount = getPendingAmount(sale);

    // ✅ Create a comprehensive party object compatible with PayIn component
    const customerParty = {
      _id: sale.customer?._id || sale.customerId || sale.partyId,
      id: sale.customer?.id || sale.customerId || sale.partyId,
      name: customerInfo.name,
      mobile: customerInfo.mobile,
      email: sale.customer?.email || "",
      currentBalance: Math.abs(
        sale.customer?.currentBalance || sale.customer?.balance || pendingAmount
      ),
      balance: Math.abs(
        sale.customer?.currentBalance || sale.customer?.balance || pendingAmount
      ),
      type: "customer",
      ...sale.customer,
    };

    setSelectedCustomer(customerParty);
    setSelectedSale(sale);
    setShowPayInModal(true);
  };

  // ✅ ENHANCED: Handle payment recorded with proper feedback
  const handlePaymentRecorded = (paymentResult) => {
    // Hide the modal
    setShowPayInModal(false);
    setSelectedCustomer(null);
    setSelectedSale(null);

    // ✅ Show success message with DayBook context
    if (addToast) {
      const amount = paymentResult.amount || 0;
      const invoiceNumber = getSaleNumber(selectedSale);
      addToast(
        `✅ DayBook Payment: ₹${amount.toLocaleString()} received for ${invoiceNumber}!`,
        "success"
      );
    }

    // ✅ Refresh DayBook data
    if (typeof window !== "undefined" && window.refreshDayBookData) {
      setTimeout(() => {
        window.refreshDayBookData();
      }, 1000);
    }

    // Call the original handler if provided
    if (handleReceivePayment && selectedSale) {
      try {
        handleReceivePayment(selectedSale);
      } catch (error) {
        // Silent error handling
      }
    }
  };

  // ✅ Close payment modal
  const handleClosePaymentModal = () => {
    setShowPayInModal(false);
    setSelectedCustomer(null);
    setSelectedSale(null);
  };

  return (
    <>
      <div className="table-responsive">
        <Table hover className="transaction-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Invoice/Sale</th>
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
              sortedReceivables.map((sale) => {
                const customerInfo = formatCustomerInfo(sale);
                const saleNumber = getSaleNumber(sale);
                const saleDate = getSaleDate(sale);
                const dueDate = getDueDate(sale);
                const totalAmount = getTotalAmount(sale);
                const pendingAmount = getPendingAmount(sale);

                return (
                  <tr key={sale._id || sale.id} className={getRowClass(sale)}>
                    {/* Status Column */}
                    <td>
                      <div className="d-flex align-items-center">
                        <FontAwesomeIcon
                          icon={getStatusIcon(sale.type)}
                          className={`me-2 ${
                            sale.type === "overdue"
                              ? "text-danger"
                              : sale.type === "due_today"
                              ? "text-warning"
                              : "text-primary"
                          }`}
                        />
                        {getPriorityBadge(
                          sale.type || sale.priority || "pending"
                        )}
                      </div>
                    </td>

                    {/* Invoice/Sale Column */}
                    <td>
                      <div>
                        <strong className="d-block">{saleNumber}</strong>
                        <small className="text-muted">
                          Total: {formatCurrency(totalAmount)}
                        </small>
                        {sale.status && (
                          <div>
                            <small className="text-muted">
                              Status: {sale.status}
                            </small>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Customer Column */}
                    <td>
                      <div>
                        <FontAwesomeIcon
                          icon={faUser}
                          className="me-2 text-success"
                        />
                        <strong className="d-block">{customerInfo.name}</strong>
                        {customerInfo.mobile && (
                          <small className="text-muted d-block">
                            📞 {customerInfo.mobile}
                          </small>
                        )}
                        {sale.customer?.email && (
                          <small className="text-muted d-block">
                            ✉️ {sale.customer.email}
                          </small>
                        )}
                      </div>
                    </td>

                    {/* Date Column */}
                    <td>
                      <div>
                        {formatDate(saleDate)}
                        {sale.createdAt && saleDate !== sale.createdAt && (
                          <div>
                            <small className="text-muted">
                              Created: {formatDate(sale.createdAt)}
                            </small>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Due Date Column */}
                    <td>
                      <span
                        className={
                          sale.type === "overdue"
                            ? "text-danger fw-bold"
                            : sale.type === "due_today"
                            ? "text-warning fw-bold"
                            : ""
                        }
                      >
                        {formatDate(dueDate)}
                      </span>
                      {sale.type === "overdue" && (
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
                      {sale.type === "due_today" && (
                        <div>
                          <small className="text-warning">
                            <FontAwesomeIcon icon={faClock} className="me-1" />
                            Due Today
                          </small>
                        </div>
                      )}
                    </td>

                    {/* Amount Due Column */}
                    <td className="text-end">
                      <strong
                        className={
                          sale.type === "overdue"
                            ? "text-danger"
                            : "text-success"
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
                      {sale.payment?.paidAmount > 0 && (
                        <div>
                          <small className="text-success">
                            Paid: {formatCurrency(sale.payment.paidAmount)}
                          </small>
                        </div>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="text-center">
                      <div className="btn-group-sm d-flex flex-wrap gap-1 justify-content-center">
                        {/* ✅ ENHANCED: Receive Payment Button with DayBook indicator */}
                        <Button
                          variant={
                            sale.type === "overdue" ? "danger" : "success"
                          }
                          size="sm"
                          onClick={() => handlePaymentFromDayBook(sale)}
                          title={`Receive payment of ${formatCurrency(
                            pendingAmount
                          )} via DayBook (auto-selects invoice)`}
                          disabled={pendingAmount <= 0}
                        >
                          <FontAwesomeIcon icon={faMoneyBillWave} />
                          <small className="ms-1">📖</small>
                        </Button>

                        {/* Call Customer Button */}
                        {customerInfo.mobile && (
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() =>
                              handleContact(
                                {
                                  name: customerInfo.name,
                                  mobile: customerInfo.mobile,
                                  ...sale.customer,
                                },
                                "phone"
                              )
                            }
                            title={`Call ${customerInfo.name}`}
                          >
                            <FontAwesomeIcon icon={faPhone} />
                          </Button>
                        )}

                        {/* View Invoice Button */}
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() =>
                            onNavigate?.("saleInvoice", {
                              id: sale._id || sale.id,
                              saleId: sale._id || sale.id,
                            })
                          }
                          title="View Sale Invoice"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </Button>

                        {/* Additional Quick Actions for Overdue */}
                        {sale.type === "overdue" && (
                          <Button
                            variant="outline-warning"
                            size="sm"
                            onClick={() =>
                              handleContact(
                                {
                                  name: customerInfo.name,
                                  mobile: customerInfo.mobile,
                                  ...sale.customer,
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
                      No outstanding receivables found. All invoices are paid!
                    </p>
                    <small className="text-muted mt-2">
                      Great job on collections!
                    </small>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </Table>

        {/* Enhanced Footer Summary */}
        {!loading && sortedReceivables.length > 0 && (
          <div className="mt-3 p-3 bg-light rounded">
            <div className="row text-center">
              <div className="col-md-3">
                <div className="text-muted small">Total Receivables</div>
                <div className="fw-bold text-primary">
                  {sortedReceivables.length}
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-muted small">Total Amount Due</div>
                <div className="fw-bold text-primary">
                  {formatCurrency(
                    sortedReceivables.reduce(
                      (sum, s) => sum + getPendingAmount(s),
                      0
                    )
                  )}
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-muted small">Overdue</div>
                <div className="fw-bold text-danger">
                  {sortedReceivables.filter((s) => s.type === "overdue").length}
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-muted small">Due Today</div>
                <div className="fw-bold text-warning">
                  {
                    sortedReceivables.filter((s) => s.type === "due_today")
                      .length
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ FIXED: PayIn Modal Integration with DayBook context for auto-selection */}
      {showPayInModal && selectedCustomer && selectedSale && (
        <PayIn
          show={showPayInModal}
          onHide={handleClosePaymentModal}
          party={selectedCustomer}
          onPaymentRecorded={handlePaymentRecorded}
          currentCompany={currentCompany}
          companyId={companyId}
          currentUser={currentUser}
          // ✅ CRITICAL: These props enable auto-selection
          initialSale={selectedSale} // Pass the selected sale for auto-selection
          source="daybook" // Indicate this is from DayBook context
        />
      )}
    </>
  );
}

export default ReceivablesTab;
