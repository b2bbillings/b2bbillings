import React from "react";
import {Container, Row, Col, Button, Badge} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faReceipt,
  faFileContract,
} from "@fortawesome/free-solid-svg-icons";

function SalesInvoicesPageTitle({
  onAddSale,
  invoiceCount = 0,
  companyId,
  mode = "invoices",
  documentType = "invoice",
  title = "Sales Invoices",
  subtitle = "Manage your sales transactions",
}) {
  // Mode detection
  const isQuotationsMode =
    mode === "quotations" || documentType === "quotation";

  const getIcon = () => {
    return isQuotationsMode ? faFileContract : faReceipt;
  };

  const getTitle = () => {
    if (title !== "Sales Invoices") return title;
    return isQuotationsMode ? "Quotations" : "Sales Invoices";
  };

  const getSubtitle = () => {
    if (subtitle !== "Manage your sales transactions") return subtitle;
    return isQuotationsMode
      ? "Create and manage professional quotations for your clients"
      : "Manage your sales transactions";
  };

  const getButtonText = () => {
    return isQuotationsMode ? "Add Quotation" : "Add Sale";
  };

  const getButtonIcon = () => {
    return isQuotationsMode ? faFileContract : faPlus;
  };

  const getCountText = () => {
    if (invoiceCount === 0)
      return isQuotationsMode ? "No quotations yet" : "No invoices yet";
    if (invoiceCount === 1)
      return isQuotationsMode ? "1 quotation" : "1 invoice";
    return isQuotationsMode
      ? `${invoiceCount} quotations`
      : `${invoiceCount} invoices`;
  };

  const getBorderColor = () => {
    return isQuotationsMode ? "#8b5cf6" : "#6366f1";
  };

  const getBackgroundGradient = () => {
    return isQuotationsMode
      ? "linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, rgba(168, 85, 247, 0.01) 100%)"
      : "linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(139, 92, 246, 0.01) 100%)";
  };

  const getIconBackground = () => {
    return isQuotationsMode
      ? "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)"
      : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)";
  };

  const getIconShadow = () => {
    return isQuotationsMode
      ? "0 4px 15px rgba(139, 92, 246, 0.3)"
      : "0 4px 15px rgba(99, 102, 241, 0.3)";
  };

  return (
    <div
      className="border-bottom py-3 mb-3"
      style={{
        borderLeft: `4px solid ${getBorderColor()}`,
        background: getBackgroundGradient(),
        borderTopColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: "#e9ecef",
      }}
    >
      <Container fluid>
        <Row className="align-items-center">
          <Col>
            <div className="d-flex align-items-center">
              {/* Icon */}
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

              {/* Title Content */}
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

                {/* Count Badge */}
                {invoiceCount !== undefined && (
                  <Badge
                    className="px-2 py-1"
                    style={{
                      background: isQuotationsMode
                        ? "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)"
                        : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
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

          {/* Add Button */}
          <Col xs="auto">
            <Button
              size="sm"
              className="d-flex align-items-center px-3 py-2 fw-semibold"
              onClick={onAddSale}
              title={getButtonText()}
              disabled={!companyId}
              style={{
                background: isQuotationsMode
                  ? "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)"
                  : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                border: isQuotationsMode
                  ? "1px solid #8b5cf6"
                  : "1px solid #6366f1",
                color: "white",
                borderRadius: "0",
                fontWeight: "600",
                letterSpacing: "0.5px",
                transition: "all 0.2s ease-in-out",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = isQuotationsMode
                  ? "linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)"
                  : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)";
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = isQuotationsMode
                  ? "0 6px 20px rgba(139, 92, 246, 0.4)"
                  : "0 6px 20px rgba(99, 102, 241, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = isQuotationsMode
                  ? "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)"
                  : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)";
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
                }

                @media (max-width: 575.98px) {
                    h4 {
                        font-size: 1.1rem !important;
                    }
                    
                    .d-flex.align-items-center div[style*="width: 55px"] {
                        width: 45px !important;
                        height: 45px !important;
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

export default SalesInvoicesPageTitle;
