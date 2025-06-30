import React from "react";
import {Container, Row, Col, Button, Badge} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faShoppingCart,
  faFileInvoice,
} from "@fortawesome/free-solid-svg-icons";

function PurchaseOrderPageTitle({
  onAddPurchase,
  billCount = 0,
  companyId,
  mode = "orders",
  documentType = "order",
  title = "Purchase Orders",
  subtitle = "Create and manage purchase orders",
}) {
  const isPurchaseMode = mode === "bills" || documentType === "bill";

  const getIcon = () => {
    return isPurchaseMode ? faShoppingCart : faFileInvoice;
  };

  const getTitle = () => {
    if (title !== "Purchase Orders") return title;
    return isPurchaseMode ? "Purchase Bills" : "Purchase Orders";
  };

  const getSubtitle = () => {
    if (subtitle !== "Create and manage purchase orders") return subtitle;
    return isPurchaseMode
      ? "Manage your purchase transactions and supplier bills"
      : "Create and manage purchase orders";
  };

  const getButtonText = () => {
    return isPurchaseMode ? "Add Purchase" : "Add Order";
  };

  const getButtonIcon = () => {
    return isPurchaseMode ? faShoppingCart : faPlus;
  };

  const getCountText = () => {
    if (billCount === 0)
      return isPurchaseMode ? "No bills yet" : "No orders yet";
    if (billCount === 1) return isPurchaseMode ? "1 bill" : "1 order";
    return isPurchaseMode ? `${billCount} bills` : `${billCount} orders`;
  };

  const getBorderColor = () => {
    return isPurchaseMode ? "#f59e0b" : "#8b5cf6";
  };

  const getBackgroundGradient = () => {
    return isPurchaseMode
      ? "linear-gradient(135deg, rgba(245, 158, 11, 0.03) 0%, rgba(217, 119, 6, 0.01) 100%)"
      : "linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, rgba(168, 85, 247, 0.01) 100%)";
  };

  const getIconBackground = () => {
    return isPurchaseMode
      ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
      : "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)";
  };

  const getIconShadow = () => {
    return isPurchaseMode
      ? "0 4px 15px rgba(245, 158, 11, 0.3)"
      : "0 4px 15px rgba(139, 92, 246, 0.3)";
  };

  return (
    <div
      className="border-bottom py-3 mb-3 mx-3"
      style={{
        borderLeft: `4px solid ${getBorderColor()}`,
        background: getBackgroundGradient(),
        borderTopColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: "#e9ecef",
        marginLeft: "1rem",
        marginRight: "1rem",
      }}
    >
      <Container fluid className="px-3">
        <Row className="align-items-center">
          <Col>
            <div className="d-flex align-items-center">
              <div
                className="d-flex align-items-center justify-content-center me-3 text-white"
                style={{
                  width: "55px",
                  height: "55px",
                  background: getIconBackground(),
                  boxShadow: getIconShadow(),
                  borderRadius: "0",
                  flexShrink: 0,
                }}
              >
                <FontAwesomeIcon icon={getIcon()} size="lg" />
              </div>

              <div className="flex-grow-1">
                <h4
                  className="mb-1 fw-bold"
                  style={{color: "#1f2937", fontSize: "1.5rem"}}
                >
                  {getTitle()}
                </h4>
                <small
                  className="d-block mb-2"
                  style={{color: "#6b7280", fontSize: "0.9rem"}}
                >
                  {getSubtitle()}
                </small>

                {billCount !== undefined && (
                  <Badge
                    className="px-2 py-1"
                    style={{
                      background: isPurchaseMode
                        ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                        : "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)",
                      border: "none",
                      color: "white",
                      fontSize: "0.75rem",
                      fontWeight: "500",
                      borderRadius: "0",
                    }}
                  >
                    {getCountText()}
                  </Badge>
                )}
              </div>
            </div>
          </Col>

          <Col xs="auto">
            <Button
              size="sm"
              className="d-flex align-items-center px-3 py-2 fw-semibold"
              onClick={onAddPurchase}
              title={getButtonText()}
              disabled={!companyId}
              style={{
                background: isPurchaseMode
                  ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                  : "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)",
                border: isPurchaseMode
                  ? "1px solid #f59e0b"
                  : "1px solid #8b5cf6",
                color: "white",
                borderRadius: "0",
                fontWeight: "600",
                letterSpacing: "0.5px",
                transition: "all 0.2s ease-in-out",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = isPurchaseMode
                  ? "linear-gradient(135deg, #d97706 0%, #b45309 100%)"
                  : "linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)";
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = isPurchaseMode
                  ? "0 6px 20px rgba(245, 158, 11, 0.4)"
                  : "0 6px 20px rgba(139, 92, 246, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = isPurchaseMode
                  ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                  : "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }}
            >
              <FontAwesomeIcon icon={getButtonIcon()} className="me-2" />
              <span className="d-none d-sm-inline">{getButtonText()}</span>
              <span className="d-sm-none">Add</span>
            </Button>
          </Col>
        </Row>
      </Container>

      <style>{`
        @media (max-width: 767.98px) {
          h4 {
            font-size: 1.2rem !important;
          }
          
          small {
            font-size: 0.8rem !important;
          }
          
          .btn {
            font-size: 0.85rem;
            padding: 0.5rem 1rem !important;
          }

          /* ✅ Reduce margins on mobile */
          .mx-3 {
            margin-left: 0.75rem !important;
            margin-right: 0.75rem !important;
          }
        }

        @media (max-width: 575.98px) {
          h4 {
            font-size: 1.1rem !important;
          }
          
          .d-flex.align-items-center div[style*="width: 55px"] {
            width: 45px !important;
            height: 45px !important;
          }

          /* ✅ Minimal margins on small mobile */
          .mx-3 {
            margin-left: 0.5rem !important;
            margin-right: 0.5rem !important;
          }
        }

        .btn:disabled {
          background: #d1d5db !important;
          border-color: #d1d5db !important;
          color: #6b7280 !important;
          transform: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}

export default PurchaseOrderPageTitle;
