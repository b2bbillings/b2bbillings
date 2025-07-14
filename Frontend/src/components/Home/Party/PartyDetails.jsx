import React, {useState, useMemo, useEffect} from "react";
import {Badge, Button, Nav, Modal} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faUserCheck,
  faBuilding,
  faEdit,
  faTrash,
  faTimes,
  faUserCircle,
  faMoneyBillWave,
  faComment,
  faFileAlt,
  faChartLine,
  faHistory,
  faComments,
  faLink,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";

// Import the components
import PartyProfile from "./PartyProfile";
import PartyMessage from "./PartyMessage";
import PartyStatement from "./PartyStatement";
import PartyAnalytics from "./PartyAnalytics";
import PartyPayments from "./PartyPayments";
import PartyTransactions from "./PartyTransactions";

// ✅ NEW: Import chat components and services
import PartyChat from "./PartyChat";
import partyService from "../../../services/partyService";
import paymentService from "../../../services/paymentService";
import "./PartyDetails.css";

function PartyDetails({
  party,
  show,
  onHide,
  onEdit,
  onDelete,
  sales = [],
  purchases = [],
  onAddPayment,
  onEditPayment,
  onDeletePayment,
  currentCompany,
}) {
  const [activeTab, setActiveTab] = useState("analytics");

  // ✅ NEW: State for chat functionality
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatPartyData, setChatPartyData] = useState(null);

  // Add these new states for payment data
  const [actualPayments, setActualPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // Fetch payment data when party or company changes or modal is shown
  useEffect(() => {
    if (party && currentCompany && show) {
      fetchPaymentData();
    }
  }, [party, currentCompany, show]);

  // Clear payment data when modal is hidden
  useEffect(() => {
    if (!show) {
      setActualPayments([]);
      setPaymentError("");
      // ✅ NEW: Clear chat data when modal is hidden
      setChatModalOpen(false);
      setChatPartyData(null);
    }
  }, [show]);

  // ✅ NEW: Chat functionality methods
  const getChatValidation = () => {
    if (!party) return {canChat: false, reason: "No party data"};
    return partyService.validatePartyChatCapability(party);
  };

  const handleOpenChat = async () => {
    if (!party) return;

    try {
      setChatLoading(true);

      // ✅ FIXED: Get fresh party data with chat fields
      const partyResponse = await partyService.getPartyForChat(
        party._id || party.id
      );

      if (!partyResponse.success) {
        throw new Error("Failed to fetch party data for chat");
      }

      const freshPartyData = partyResponse.data;
      const chatValidation =
        partyService.validatePartyChatCapability(freshPartyData);

      if (!chatValidation.canChat) {
        alert(`Cannot start chat: ${chatValidation.reason}`);
        return;
      }

      console.log("🎯 Opening chat from PartyDetails:", {
        partyId: freshPartyData._id,
        partyName: freshPartyData.name,
        canChat: chatValidation.canChat,
        chatCompanyId: chatValidation.chatCompanyId,
        chatCompanyName: chatValidation.chatCompanyName,
      });

      setChatPartyData(freshPartyData);
      setChatModalOpen(true);
    } catch (error) {
      console.error("❌ Error opening chat from PartyDetails:", error);
      alert("Failed to open chat. Please try again.");
    } finally {
      setChatLoading(false);
    }
  };

  const fetchPaymentData = async () => {
    if (!party || !currentCompany) return;

    try {
      setLoadingPayments(true);
      setPaymentError("");

      const partyId = party._id || party.id;
      const companyId = currentCompany._id || currentCompany.id;

      console.log("🔍 PartyDetails: Fetching payment data for:", {
        partyName: party.name,
        partyId,
        companyId,
      });

      // Use the specific party payment history method
      const response = await paymentService.getPartyPaymentHistory(
        companyId,
        partyId,
        {
          limit: 100,
          sortBy: "paymentDate",
          sortOrder: "desc",
        }
      );

      console.log("📥 PartyDetails: Raw payment response:", response);

      if (response && response.success) {
        // Handle the nested response structure: response.data.payments
        let paymentData = [];

        if (response.data && Array.isArray(response.data)) {
          // If response.data is directly an array
          paymentData = response.data;
        } else if (
          response.data &&
          response.data.payments &&
          Array.isArray(response.data.payments)
        ) {
          // If response.data.payments is the array (your current API structure)
          paymentData = response.data.payments;
        } else if (response.payments && Array.isArray(response.payments)) {
          // If response.payments is the array
          paymentData = response.payments;
        }

        console.log(
          "✅ PartyDetails: Payment data extracted:",
          paymentData.length
        );
        console.log("📊 PartyDetails: Payment data sample:", paymentData[0]);

        // Process the payment data to ensure consistent structure
        const processedPayments = paymentData.map((payment) => ({
          ...payment,
          id: payment._id || payment.id,
          type: payment.type || "payment_in",
          amount: parseFloat(payment.amount || 0),
          paymentDate: payment.paymentDate || payment.createdAt,
          paymentMethod: payment.paymentMethod || "cash",
          reference: payment.reference || payment.paymentNumber || "",
          status: payment.status || "completed",
          notes: payment.notes || "",
          partyId: payment.party || payment.partyId,
          displayAmount:
            payment.type === "payment_in"
              ? `+₹${payment.amount}`
              : `-₹${payment.amount}`,
          displayType:
            payment.type === "payment_in" ? "Payment In" : "Payment Out",
          displayDate: new Date(
            payment.paymentDate || payment.createdAt
          ).toLocaleDateString("en-IN"),
        }));

        console.log(
          "🎯 PartyDetails: Processed payments:",
          processedPayments.length
        );
        setActualPayments(processedPayments);

        // Also log the total amounts for verification
        const totalIn = processedPayments
          .filter((p) => p.type === "payment_in")
          .reduce((sum, p) => sum + p.amount, 0);
        const totalOut = processedPayments
          .filter((p) => p.type === "payment_out")
          .reduce((sum, p) => sum + p.amount, 0);

        console.log("💰 Payment Summary:", {
          totalPayments: processedPayments.length,
          totalIn: `₹${totalIn}`,
          totalOut: `₹${totalOut}`,
          netAmount: `₹${totalIn - totalOut}`,
        });
      } else {
        console.log(
          "⚠️ PartyDetails: No payments found or API error:",
          response?.message
        );
        setActualPayments([]);
        if (response?.error) {
          setPaymentError(response.message || "Failed to load payments");
        }
      }
    } catch (error) {
      console.error("❌ PartyDetails: Error fetching payment data:", error);
      setPaymentError("Failed to load payment data: " + error.message);
      setActualPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  // Use useMemo to calculate party data and prevent infinite re-renders
  const {partyTransactions, paymentSummary, allTransactions} = useMemo(() => {
    if (!party) {
      return {
        partyTransactions: [],
        paymentSummary: {
          totalSales: 0,
          totalPurchases: 0,
          totalSalesPaid: 0,
          totalPurchasesPaid: 0,
          salesDue: 0,
          purchasesDue: 0,
          netBalance: 0,
        },
        allTransactions: [],
      };
    }

    // Filter sales and purchases for this party
    const partySales = sales.filter(
      (sale) =>
        sale.customerId === party.id ||
        sale.customer === party.id ||
        sale.customerName === party.name ||
        sale.partyId === party.id ||
        sale.customerId === party._id ||
        sale.customer === party._id
    );

    const partyPurchases = purchases.filter(
      (purchase) =>
        purchase.supplierId === party.id ||
        purchase.supplier === party.id ||
        purchase.supplierName === party.name ||
        purchase.partyId === party.id ||
        purchase.supplierId === party._id ||
        purchase.supplier === party._id
    );

    // Create business transactions with payment info
    const businessTransactions = [
      ...partySales.map((sale) => ({
        id: sale.id || sale._id,
        type: "sale",
        date: sale.invoiceDate || sale.createdAt,
        amount: parseFloat(
          sale.total || sale.finalTotal || sale.totals?.finalTotal || 0
        ),
        reference:
          sale.invoiceNumber ||
          sale.saleNumber ||
          `SALE-${sale.id || sale._id}`,
        payments: sale.paymentHistory || [],
        status: sale.payment?.status || "pending",
        dueDate: sale.payment?.dueDate,
        paidAmount: parseFloat(sale.payment?.paidAmount || 0),
        pendingAmount: parseFloat(sale.payment?.pendingAmount || 0),
      })),
      ...partyPurchases.map((purchase) => ({
        id: purchase.id || purchase._id,
        type: "purchase",
        date: purchase.purchaseDate || purchase.createdAt,
        amount: parseFloat(
          purchase.total ||
            purchase.finalTotal ||
            purchase.totals?.finalTotal ||
            0
        ),
        reference:
          purchase.supplierInvoiceNumber ||
          purchase.invoiceNumber ||
          purchase.purchaseNumber ||
          `PUR-${purchase.id || purchase._id}`,
        payments: purchase.paymentHistory || [],
        status: purchase.payment?.status || "pending",
        dueDate: purchase.payment?.dueDate,
        paidAmount: parseFloat(purchase.payment?.paidAmount || 0),
        pendingAmount: parseFloat(purchase.payment?.pendingAmount || 0),
      })),
    ];

    // Combine all transactions (business + payments)
    const allTransactions = [
      ...businessTransactions.map((transaction) => ({
        ...transaction,
        transactionType: "business",
      })),
      ...actualPayments.map((payment) => ({
        id: payment._id || payment.id,
        type: payment.type === "payment_in" ? "payment_in" : "payment_out",
        transactionType: "payment",
        date: payment.paymentDate || payment.createdAt,
        amount: parseFloat(payment.amount || 0),
        reference:
          payment.paymentNumber ||
          payment.reference ||
          `PAY-${payment._id?.substring(0, 8)}`,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        notes: payment.notes,
        employeeName: payment.employeeName,
        partyName: payment.partyName,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate payment summary including actual payments
    const totalSales = partySales.reduce((sum, sale) => {
      return (
        sum +
        parseFloat(
          sale.total || sale.finalTotal || sale.totals?.finalTotal || 0
        )
      );
    }, 0);

    const totalPurchases = partyPurchases.reduce((sum, purchase) => {
      return (
        sum +
        parseFloat(
          purchase.total ||
            purchase.finalTotal ||
            purchase.totals?.finalTotal ||
            0
        )
      );
    }, 0);

    // Calculate payments from actual payment records
    const totalSalesPaidFromPayments = actualPayments
      .filter((payment) => payment.type === "payment_in")
      .reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);

    const totalPurchasesPaidFromPayments = actualPayments
      .filter((payment) => payment.type === "payment_out")
      .reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);

    // Also calculate from transaction payment history (fallback)
    const totalSalesPaidFromHistory = partySales.reduce((sum, sale) => {
      const paid =
        sale.payments?.reduce((pSum, payment) => {
          return pSum + parseFloat(payment.amount || payment.paidAmount || 0);
        }, 0) || parseFloat(sale.payment?.paidAmount || 0);
      return sum + paid;
    }, 0);

    const totalPurchasesPaidFromHistory = partyPurchases.reduce(
      (sum, purchase) => {
        const paid =
          purchase.payments?.reduce((pSum, payment) => {
            return pSum + parseFloat(payment.amount || payment.paidAmount || 0);
          }, 0) || parseFloat(purchase.payment?.paidAmount || 0);
        return sum + paid;
      },
      0
    );

    // Use the higher value between payment records and transaction history
    const totalSalesPaid = Math.max(
      totalSalesPaidFromPayments,
      totalSalesPaidFromHistory
    );
    const totalPurchasesPaid = Math.max(
      totalPurchasesPaidFromPayments,
      totalPurchasesPaidFromHistory
    );

    const salesDue = Math.max(0, totalSales - totalSalesPaid);
    const purchasesDue = Math.max(0, totalPurchases - totalPurchasesPaid);
    const netBalance = salesDue - purchasesDue;

    return {
      partyTransactions: businessTransactions.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      ),
      paymentSummary: {
        totalSales,
        totalPurchases,
        totalSalesPaid,
        totalPurchasesPaid,
        salesDue,
        purchasesDue,
        netBalance,
      },
      allTransactions,
    };
  }, [party, sales, purchases, actualPayments]);

  // Add refresh function
  const handleRefreshPayments = () => {
    fetchPaymentData();
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getPartyTypeIcon = () => {
    return party?.partyType === "supplier" || party?.partyType === "vendor"
      ? faBuilding
      : faUserCheck;
  };

  const getPartyTypeBadge = () => {
    const type = party?.partyType;
    if (type === "supplier" || type === "vendor") {
      return <Badge bg="info">Supplier</Badge>;
    } else if (type === "customer") {
      return <Badge bg="success">Customer</Badge>;
    } else {
      return <Badge bg="secondary">Party</Badge>;
    }
  };

  const handleEditClick = () => {
    if (onEdit && party) {
      onEdit(party);
    }
  };

  const handleDeleteClick = () => {
    if (!party) return;

    const confirmMessage = `Are you sure you want to delete "${party.name}"? This action cannot be undone.`;
    if (window.confirm(confirmMessage)) {
      if (onDelete) {
        onDelete(party.id || party._id);
      }
    }
  };

  // Handle payment operations and refresh data
  const handleAddPaymentWithRefresh = async (paymentData) => {
    try {
      if (onAddPayment) {
        await onAddPayment(paymentData);
      }
      // Refresh payment data after adding
      setTimeout(() => {
        fetchPaymentData();
      }, 1000);
    } catch (error) {
      console.error("Error adding payment:", error);
    }
  };

  const handleEditPaymentWithRefresh = async (paymentId, paymentData) => {
    try {
      if (onEditPayment) {
        await onEditPayment(paymentId, paymentData);
      }
      // Refresh payment data after editing
      setTimeout(() => {
        fetchPaymentData();
      }, 1000);
    } catch (error) {
      console.error("Error editing payment:", error);
    }
  };

  const handleDeletePaymentWithRefresh = async (paymentId) => {
    try {
      if (onDeletePayment) {
        await onDeletePayment(paymentId);
      }
      // Refresh payment data after deleting
      setTimeout(() => {
        fetchPaymentData();
      }, 1000);
    } catch (error) {
      console.error("Error deleting payment:", error);
    }
  };

  // ✅ NEW: Chat status component for header
  const ChatStatusIndicator = () => {
    const chatValidation = getChatValidation();

    if (!chatValidation.canChat) return null;

    return (
      <Badge bg="success" className="ms-2">
        <FontAwesomeIcon icon={faLink} className="me-1" />
        Chat Available
      </Badge>
    );
  };

  // Don't render anything if no party data or modal is not shown
  if (!party || !show) {
    return null;
  }

  // Common props to pass to child components
  const commonProps = {
    party,
    partyTransactions,
    paymentSummary,
    formatCurrency,
    currentCompany,
  };

  const chatValidation = getChatValidation();

  return (
    <>
      <div
        className={`modal fade ${show ? "show d-block" : ""}`}
        style={{backgroundColor: show ? "rgba(0,0,0,0.5)" : "transparent"}}
      >
        <div className="modal-dialog modal-fullscreen modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header border-0 pb-2">
              <div className="d-flex align-items-center w-100">
                <div className="d-flex align-items-center flex-grow-1">
                  <div className="party-avatar-large me-3">
                    <FontAwesomeIcon
                      icon={
                        party.isRunningCustomer
                          ? faUserCheck
                          : getPartyTypeIcon()
                      }
                      className={
                        party.isRunningCustomer
                          ? "text-warning"
                          : "text-primary"
                      }
                      size="2x"
                    />
                  </div>
                  <div>
                    <h5 className="modal-title mb-1">
                      {party.name}
                      {party.isRunningCustomer && (
                        <Badge bg="warning" className="ms-2 text-dark">
                          <FontAwesomeIcon
                            icon={faUserCheck}
                            className="me-1"
                          />
                          Running Customer
                        </Badge>
                      )}
                      {/* ✅ NEW: Chat status indicator */}
                      <ChatStatusIndicator />
                    </h5>
                    <div className="text-muted">
                      {getPartyTypeBadge()}
                      <small className="ms-2">
                        Added on{" "}
                        {new Date(
                          party.createdAt || Date.now()
                        ).toLocaleDateString("en-IN")}
                      </small>
                      {/* ✅ NEW: Linked company info */}
                      {chatValidation.canChat &&
                        chatValidation.chatCompanyName && (
                          <div className="mt-1">
                            <small className="text-info">
                              <FontAwesomeIcon
                                icon={faBuilding}
                                className="me-1"
                              />
                              Linked to: {chatValidation.chatCompanyName}
                            </small>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  {/* ✅ NEW: Chat button */}
                  <Button
                    variant={
                      chatValidation.canChat ? "success" : "outline-secondary"
                    }
                    size="sm"
                    onClick={handleOpenChat}
                    disabled={!chatValidation.canChat || chatLoading}
                    title={
                      chatValidation.canChat
                        ? `Start chat with ${chatValidation.chatCompanyName}`
                        : chatValidation.reason
                    }
                  >
                    <FontAwesomeIcon
                      icon={
                        chatValidation.canChat
                          ? faComments
                          : faExclamationTriangle
                      }
                      className="me-1"
                    />
                    {chatLoading
                      ? "Loading..."
                      : chatValidation.canChat
                      ? "Chat"
                      : "No Link"}
                  </Button>

                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={handleEditClick}
                    disabled={!party}
                  >
                    <FontAwesomeIcon icon={faEdit} className="me-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={handleDeleteClick}
                    disabled={!party}
                  >
                    <FontAwesomeIcon icon={faTrash} className="me-1" />
                    Delete
                  </Button>
                  <Button
                    variant="link"
                    className="p-1 text-muted"
                    onClick={onHide}
                  >
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                  </Button>
                </div>
              </div>
            </div>

            <div
              className="modal-body p-0"
              style={{height: "80vh", overflowY: "auto"}}
            >
              {/* Navigation Tabs */}
              <div className="border-bottom bg-light">
                <Nav variant="tabs" className="px-4">
                  <Nav.Item>
                    <Nav.Link
                      active={activeTab === "analytics"}
                      onClick={() => setActiveTab("analytics")}
                      className="d-flex align-items-center"
                    >
                      <FontAwesomeIcon icon={faChartLine} className="me-2" />
                      Analytics
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link
                      active={activeTab === "profile"}
                      onClick={() => setActiveTab("profile")}
                      className="d-flex align-items-center"
                    >
                      <FontAwesomeIcon icon={faUserCircle} className="me-2" />
                      Profile
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link
                      active={activeTab === "payments"}
                      onClick={() => setActiveTab("payments")}
                      className="d-flex align-items-center"
                    >
                      <FontAwesomeIcon
                        icon={faMoneyBillWave}
                        className="me-2"
                      />
                      Payments
                      {paymentSummary.salesDue > 0 && (
                        <Badge bg="danger" className="ms-2">
                          ₹{Math.round(paymentSummary.salesDue)}
                        </Badge>
                      )}
                      {actualPayments.length > 0 && (
                        <Badge bg="info" className="ms-2">
                          {actualPayments.length}
                        </Badge>
                      )}
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link
                      active={activeTab === "transactions"}
                      onClick={() => setActiveTab("transactions")}
                      className="d-flex align-items-center"
                    >
                      <FontAwesomeIcon icon={faHistory} className="me-2" />
                      Transactions
                      <Badge bg="secondary" className="ms-2">
                        {partyTransactions.length}
                      </Badge>
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link
                      active={activeTab === "message"}
                      onClick={() => setActiveTab("message")}
                      className="d-flex align-items-center"
                    >
                      <FontAwesomeIcon icon={faComment} className="me-2" />
                      Message
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link
                      active={activeTab === "statement"}
                      onClick={() => setActiveTab("statement")}
                      className="d-flex align-items-center"
                    >
                      <FontAwesomeIcon icon={faFileAlt} className="me-2" />
                      Statement
                    </Nav.Link>
                  </Nav.Item>
                  {/* ✅ NEW: Chat tab (if chat is available) */}
                  {chatValidation.canChat && (
                    <Nav.Item>
                      <Nav.Link
                        active={activeTab === "chat"}
                        onClick={() => setActiveTab("chat")}
                        className="d-flex align-items-center text-success"
                      >
                        <FontAwesomeIcon icon={faComments} className="me-2" />
                        Chat
                        <Badge bg="success" className="ms-2">
                          {chatValidation.chatCompanyName?.substring(0, 10)}...
                        </Badge>
                      </Nav.Link>
                    </Nav.Item>
                  )}
                </Nav>
              </div>

              {/* Tab Content */}
              <div className="tab-content">
                {activeTab === "analytics" && (
                  <div className="p-4">
                    <PartyAnalytics
                      party={party}
                      sales={sales}
                      purchases={purchases}
                      currentCompany={currentCompany}
                      actualPayments={actualPayments}
                      paymentSummary={paymentSummary}
                    />
                  </div>
                )}

                {activeTab === "profile" && <PartyProfile {...commonProps} />}

                {activeTab === "payments" && (
                  <div className="p-4">
                    <PartyPayments
                      party={party}
                      sales={sales}
                      purchases={purchases}
                      onAddPayment={handleAddPaymentWithRefresh}
                      onEditPayment={handleEditPaymentWithRefresh}
                      onDeletePayment={handleDeletePaymentWithRefresh}
                      currentCompany={currentCompany}
                      actualPayments={actualPayments}
                      allTransactions={allTransactions}
                      loading={loadingPayments}
                      onRefreshPayments={handleRefreshPayments}
                    />
                  </div>
                )}

                {activeTab === "transactions" && (
                  <PartyTransactions
                    party={party}
                    partyTransactions={partyTransactions}
                    formatCurrency={formatCurrency}
                    currentCompany={currentCompany}
                    actualPayments={actualPayments}
                    allTransactions={allTransactions}
                  />
                )}

                {activeTab === "message" && <PartyMessage {...commonProps} />}

                {activeTab === "statement" && (
                  <PartyStatement {...commonProps} />
                )}

                {/* ✅ NEW: Chat tab content */}
                {activeTab === "chat" && chatValidation.canChat && (
                  <div className="p-0">
                    <PartyChat
                      party={chatPartyData || party}
                      onClose={() => setActiveTab("analytics")}
                      isEmbedded={true}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ NEW: Separate Chat Modal (for button click) */}
      <Modal
        show={chatModalOpen}
        onHide={() => {
          setChatModalOpen(false);
          setChatPartyData(null);
        }}
        size="lg"
        centered
        className="chat-modal"
      >
        <Modal.Body className="p-0">
          {chatPartyData && (
            <PartyChat
              party={chatPartyData}
              onClose={() => {
                setChatModalOpen(false);
                setChatPartyData(null);
              }}
              isEmbedded={false}
            />
          )}
        </Modal.Body>
      </Modal>

      {/* ✅ NEW: Chat loading overlay */}
      {chatLoading && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 10000,
          }}
        >
          <div className="bg-white p-4 rounded shadow">
            <div className="d-flex align-items-center">
              <div
                className="spinner-border spinner-border-sm me-3"
                role="status"
              >
                <span className="visually-hidden">Loading...</span>
              </div>
              <span>
                Preparing chat with {chatValidation.chatCompanyName}...
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PartyDetails;
