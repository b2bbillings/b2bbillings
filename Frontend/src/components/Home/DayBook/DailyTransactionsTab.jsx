import React from "react";
import {Table, Button, Badge, Spinner, Row, Col, Card} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faEye,
  faArrowDown,
  faArrowUp,
  faRupeeSign,
} from "@fortawesome/free-solid-svg-icons";

function DailyTransactionsTab({
  transactions,
  loading,
  formatCurrency,
  formatDate,
  onNavigate,
  date,
}) {
  // ✅ FIXED: Use correct field names based on transactionService data structure
  const cashIn = transactions
    .filter(
      (t) =>
        t.direction === "in" ||
        t.transactionType === "payment_in" ||
        t.type === "payment_in"
    )
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const cashOut = transactions
    .filter(
      (t) =>
        t.direction === "out" ||
        t.transactionType === "payment_out" ||
        t.type === "payment_out"
    )
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const netCashFlow = cashIn - cashOut;

  // ✅ Helper function to get transaction direction/type
  const getTransactionDirection = (transaction) => {
    if (
      transaction.direction === "in" ||
      transaction.transactionType === "payment_in" ||
      transaction.type === "payment_in"
    ) {
      return "in";
    }
    return "out";
  };

  // ✅ Helper function to get party name from various possible fields
  const getPartyName = (transaction) => {
    return (
      transaction.partyName ||
      transaction.partyId?.name ||
      transaction.customer?.name ||
      transaction.supplier?.name ||
      transaction.customerName ||
      transaction.supplierName ||
      "Unknown Party"
    );
  };

  // ✅ Helper function to get transaction date for time display
  const getTransactionDate = (transaction) => {
    return (
      transaction.transactionDate ||
      transaction.paymentDate ||
      transaction.createdAt ||
      new Date()
    );
  };

  // ✅ Helper function to get reference/description
  const getReference = (transaction) => {
    return (
      transaction.referenceNumber ||
      transaction.reference ||
      transaction.invoiceNumber ||
      transaction.purchaseNumber ||
      transaction.description ||
      "N/A"
    );
  };

  return (
    <div>
      {/* Cash Flow Summary */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="summary-card border-success">
            <Card.Body className="text-center">
              <FontAwesomeIcon
                icon={faArrowDown}
                size="2x"
                className="text-success mb-2"
              />
              <h4 className="mb-1 text-success">{formatCurrency(cashIn)}</h4>
              <p className="text-muted mb-0">Money Received</p>
              <small className="text-muted">
                {
                  transactions.filter(
                    (t) => getTransactionDirection(t) === "in"
                  ).length
                }{" "}
                transactions
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="summary-card border-danger">
            <Card.Body className="text-center">
              <FontAwesomeIcon
                icon={faArrowUp}
                size="2x"
                className="text-danger mb-2"
              />
              <h4 className="mb-1 text-danger">{formatCurrency(cashOut)}</h4>
              <p className="text-muted mb-0">Money Paid</p>
              <small className="text-muted">
                {
                  transactions.filter(
                    (t) => getTransactionDirection(t) === "out"
                  ).length
                }{" "}
                transactions
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="summary-card border-primary">
            <Card.Body className="text-center">
              <FontAwesomeIcon
                icon={faRupeeSign}
                size="2x"
                className="text-primary mb-2"
              />
              <h4 className="mb-1 text-primary">
                {formatCurrency(netCashFlow)}
              </h4>
              <p className="text-muted mb-0">Net Cash Flow</p>
              <small className="text-muted">For {formatDate(date)}</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Transactions Table */}
      <div className="table-responsive">
        <Table hover className="transaction-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>Party</th>
              <th>Method</th>
              <th>Reference</th>
              <th className="text-end">Amount</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-4">
                  <Spinner animation="border" size="sm" className="me-2" />
                  Loading transactions...
                </td>
              </tr>
            ) : transactions.length > 0 ? (
              transactions.map((transaction) => {
                const direction = getTransactionDirection(transaction);
                const partyName = getPartyName(transaction);
                const transactionDate = getTransactionDate(transaction);
                const reference = getReference(transaction);

                return (
                  <tr key={transaction._id || transaction.id}>
                    <td>
                      {new Date(transactionDate).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      <Badge
                        bg={direction === "in" ? "success" : "danger"}
                        className="me-1"
                      >
                        {direction === "in" ? "Money In" : "Money Out"}
                      </Badge>
                      {/* ✅ Show transaction type if available */}
                      {transaction.transactionType && (
                        <div>
                          <small className="text-muted">
                            {transaction.transactionType
                              .replace(/_/g, " ")
                              .toUpperCase()}
                          </small>
                        </div>
                      )}
                    </td>
                    <td>
                      <strong>{partyName}</strong>
                      {/* ✅ Show party phone if available */}
                      {(transaction.partyId?.mobile ||
                        transaction.customer?.mobile ||
                        transaction.supplier?.mobile) && (
                        <div>
                          <small className="text-muted">
                            {transaction.partyId?.mobile ||
                              transaction.customer?.mobile ||
                              transaction.supplier?.mobile}
                          </small>
                        </div>
                      )}
                    </td>
                    <td>
                      <Badge bg="secondary">
                        {transaction.paymentMethod || "Cash"}
                      </Badge>
                      {/* ✅ Show bank account if available */}
                      {transaction.bankAccountId?.accountName && (
                        <div>
                          <small className="text-muted">
                            {transaction.bankAccountId.accountName}
                          </small>
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        className="text-truncate"
                        style={{maxWidth: "150px", display: "inline-block"}}
                      >
                        {reference}
                      </span>
                      {/* ✅ Show transaction ID if available */}
                      {transaction.transactionId && (
                        <div>
                          <small className="text-muted">
                            ID: {transaction.transactionId}
                          </small>
                        </div>
                      )}
                    </td>
                    <td className="text-end">
                      <strong
                        className={
                          direction === "in" ? "text-success" : "text-danger"
                        }
                      >
                        {direction === "in" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </strong>
                      {/* ✅ Show status if available */}
                      {transaction.status &&
                        transaction.status !== "completed" && (
                          <div>
                            <Badge
                              bg={
                                transaction.status === "pending"
                                  ? "warning"
                                  : transaction.status === "failed"
                                  ? "danger"
                                  : "secondary"
                              }
                              className="mt-1"
                            >
                              {transaction.status}
                            </Badge>
                          </div>
                        )}
                    </td>
                    <td className="text-center">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() =>
                          onNavigate?.("transactionDetails", {
                            id: transaction._id || transaction.id,
                            type: transaction.transactionType || "transaction",
                          })
                        }
                        title="View Details"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </Button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-4 text-muted">
                  No transactions found for {formatDate(date)}
                  <div className="mt-2">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => onNavigate?.("paymentIn")}
                    >
                      Record Payment
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* ✅ Additional Transaction Insights */}
      {transactions.length > 0 && (
        <Row className="mt-4">
          <Col md={6}>
            <Card className="border-0 bg-light">
              <Card.Body>
                <h6 className="text-muted">Payment Methods Used</h6>
                {/* Group by payment method */}
                {Object.entries(
                  transactions.reduce((acc, t) => {
                    const method = t.paymentMethod || "Cash";
                    if (!acc[method]) acc[method] = {count: 0, amount: 0};
                    acc[method].count++;
                    acc[method].amount += t.amount || 0;
                    return acc;
                  }, {})
                ).map(([method, data]) => (
                  <div
                    key={method}
                    className="d-flex justify-content-between mb-1"
                  >
                    <span>{method}</span>
                    <span>
                      {data.count} • {formatCurrency(data.amount)}
                    </span>
                  </div>
                ))}
              </Card.Body>
            </Card>
          </Col>
          <Col md={6}>
            <Card className="border-0 bg-light">
              <Card.Body>
                <h6 className="text-muted">Transaction Types</h6>
                {/* Group by transaction type */}
                {Object.entries(
                  transactions.reduce((acc, t) => {
                    const type = t.transactionType || "Unknown";
                    if (!acc[type]) acc[type] = {count: 0, amount: 0};
                    acc[type].count++;
                    acc[type].amount += t.amount || 0;
                    return acc;
                  }, {})
                ).map(([type, data]) => (
                  <div
                    key={type}
                    className="d-flex justify-content-between mb-1"
                  >
                    <span>{type.replace(/_/g, " ").toUpperCase()}</span>
                    <span>
                      {data.count} • {formatCurrency(data.amount)}
                    </span>
                  </div>
                ))}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}

export default DailyTransactionsTab;
