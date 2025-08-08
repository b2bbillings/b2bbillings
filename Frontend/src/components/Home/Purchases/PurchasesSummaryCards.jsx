import React from "react";
import {Row, Col, Card} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faShoppingBag,
  faMoneyBillWave,
  faCheckCircle,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";

function PurchasesSummaryCards({purchases}) {
  const totalSpent = purchases.reduce(
    (sum, purchase) => sum + (purchase.total || 0),
    0
  );
  const completedPurchases = purchases.filter(
    (purchase) => purchase.status === "received"
  ).length;
  const pendingPurchases = purchases.filter(
    (purchase) => purchase.status === "ordered"
  ).length;

  return (
    <Row className="mb-4">
      <Col md={3}>
        <Card className="summary-card border-left-primary">
          <Card.Body>
            <div className="d-flex align-items-center">
              <div className="me-3">
                <FontAwesomeIcon
                  icon={faShoppingBag}
                  className="text-primary fa-2x"
                />
              </div>
              <div>
                <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                  Total Purchases
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  {purchases.length}
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={3}>
        <Card className="summary-card border-left-success">
          <Card.Body>
            <div className="d-flex align-items-center">
              <div className="me-3">
                <FontAwesomeIcon
                  icon={faMoneyBillWave}
                  className="text-success fa-2x"
                />
              </div>
              <div>
                <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                  Total Spent
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  ₹{totalSpent.toLocaleString()}
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={3}>
        <Card className="summary-card border-left-info">
          <Card.Body>
            <div className="d-flex align-items-center">
              <div className="me-3">
                <FontAwesomeIcon
                  icon={faCheckCircle}
                  className="text-info fa-2x"
                />
              </div>
              <div>
                <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                  Completed Orders
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  {completedPurchases}
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={3}>
        <Card className="summary-card border-left-warning">
          <Card.Body>
            <div className="d-flex align-items-center">
              <div className="me-3">
                <FontAwesomeIcon
                  icon={faClockRotateLeft}
                  className="text-warning fa-2x"
                />
              </div>
              <div>
                <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                  Pending Orders
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  {pendingPurchases}
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

export default PurchasesSummaryCards;
