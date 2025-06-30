import React from "react";
import {Container, Row, Col, Button, Badge} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faShoppingCart,
  faFileInvoice,
} from "@fortawesome/free-solid-svg-icons";

function PurchaseBillsPageTitle({
  onAddPurchase,
  billCount = 0,
  companyId,
  mode = "bills",
  documentType = "bill",
  title = "Purchase Bills",
  subtitle = "Manage your purchase transactions",
}) {
  // ✅ Removed isPurchaseMode logic - always use purple theme
  const getIcon = () => {
    return faShoppingCart;
  };

  const getTitle = () => {
    return title || "Purchase Bills";
  };

  const getSubtitle = () => {
    return subtitle || "Manage your purchase transactions and supplier bills";
  };

  const getButtonText = () => {
    return "Add Purchase";
  };

  const getButtonIcon = () => {
    return faShoppingCart;
  };

  const getCountText = () => {
    if (billCount === 0) return "No bills yet";
    if (billCount === 1) return "1 bill";
    return `${billCount} bills`;
  };

  const getBorderColor = () => {
    return "#8b5cf6"; // ✅ Always purple
  };

  const getBackgroundGradient = () => {
    return "linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, rgba(168, 85, 247, 0.01) 100%)"; // ✅ Always purple
  };

  const getIconBackground = () => {
    return "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)"; // ✅ Always purple
  };

  const getIconShadow = () => {
    return "0 4px 15px rgba(139, 92, 246, 0.3)"; // ✅ Always purple
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
                      background:
                        "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)", // ✅ Always purple
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
                background: "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)", // ✅ Always purple
                border: "1px solid #8b5cf6", // ✅ Always purple
                color: "white",
                borderRadius: "0",
                fontWeight: "600",
                letterSpacing: "0.5px",
                transition: "all 0.2s ease-in-out",
              }}
              onMouseEnter={(e) => {
                e.target.style.background =
                  "linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)"; // ✅ Always purple hover
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 6px 20px rgba(139, 92, 246, 0.4)"; // ✅ Always purple shadow
              }}
              onMouseLeave={(e) => {
                e.target.style.background =
                  "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)"; // ✅ Always purple
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

export default PurchaseBillsPageTitle;
