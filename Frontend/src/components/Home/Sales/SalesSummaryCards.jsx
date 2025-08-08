import React from "react";
import {Row, Col, Card} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faShoppingCart,
  faMoneyBillWave,
  faCreditCard,
  faFileInvoice,
} from "@fortawesome/free-solid-svg-icons";

function SalesSummaryCards({sales}) {
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const paidInvoices = sales.filter(
    (sale) => sale.paymentStatus === "paid"
  ).length;
  const pendingPayments = sales.filter(
    (sale) => sale.paymentStatus === "pending"
  ).length;

  return (
    <Row className="mb-4">
      <Col md={3}>
        <Card className="summary-card border-left-primary">
          <Card.Body>
            <div className="d-flex align-items-center">
              <div className="me-3">
                <FontAwesomeIcon
                  icon={faShoppingCart}
                  className="text-primary fa-2x"
                />
              </div>
              <div>
                <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                  Total Sales
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  {sales.length}
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
                  Total Revenue
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  ₹{totalRevenue.toLocaleString()}
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
                  icon={faCreditCard}
                  className="text-info fa-2x"
                />
              </div>
              <div>
                <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                  Paid Invoices
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  {paidInvoices}
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
                  icon={faFileInvoice}
                  className="text-warning fa-2x"
                />
              </div>
              <div>
                <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                  Pending Payment
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  {pendingPayments}
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

export default SalesSummaryCards;
