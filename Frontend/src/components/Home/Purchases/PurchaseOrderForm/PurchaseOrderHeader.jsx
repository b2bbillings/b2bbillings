import React from "react";
import {
  Navbar,
  Container,
  Row,
  Col,
  InputGroup,
  Form,
  Button,
  ButtonGroup,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faPlus,
  faEllipsisH,
  faCog,
  faClipboardList,
  faFileInvoice,
} from "@fortawesome/free-solid-svg-icons";
import {useNavigate, useParams} from "react-router-dom";

function PurchaseOrderHeader({
  searchTerm,
  onSearchChange,
  onAddPurchaseOrder,
  onAddPurchase,
  onMoreOptions,
  onSettings,
  currentCompany,
  addToast,
  onNavigate, // ✅ Added for navigation support
}) {
  const navigate = useNavigate();
  const {companyId} = useParams();

  // Get effective company ID from URL params or currentCompany prop
  const getCompanyId = () => {
    return companyId || currentCompany?.id || currentCompany?._id;
  };

  // ✅ Enhanced Add Purchase Order handler
  const handleAddPurchaseOrder = (e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log("🔄 Add Purchase Order clicked");

    const effectiveCompanyId = getCompanyId();
    console.log("🏢 Company ID:", effectiveCompanyId);

    if (!effectiveCompanyId) {
      console.warn("⚠️ No company selected for Add Purchase Order");
      addToast?.(
        "Please select a company first to create a purchase order",
        "warning"
      );
      return;
    }

    try {
      // ✅ FIXED: Use onNavigate if available, otherwise direct navigation
      if (onNavigate && typeof onNavigate === "function") {
        console.log("🔄 Using onNavigate for purchase order creation");
        onNavigate("createPurchaseOrder");
      } else if (
        onAddPurchaseOrder &&
        typeof onAddPurchaseOrder === "function"
      ) {
        console.log("🔄 Calling onAddPurchaseOrder callback");
        onAddPurchaseOrder();
      } else {
        // Direct navigation as fallback
        const targetUrl = `/companies/${effectiveCompanyId}/purchase-orders/add`;
        console.log("🔄 Direct navigation to:", targetUrl);
        navigate(targetUrl);
      }

      addToast?.("Opening purchase order form...", "info");
    } catch (error) {
      console.error("❌ Error in handleAddPurchaseOrder:", error);
      addToast?.("Failed to open purchase order form", "error");
    }
  };

  // ✅ Enhanced Add Purchase handler
  const handleAddPurchase = (e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log("🔄 Add Purchase clicked");

    const effectiveCompanyId = getCompanyId();
    console.log("🏢 Company ID:", effectiveCompanyId);

    if (!effectiveCompanyId) {
      console.warn("⚠️ No company selected for Add Purchase");
      addToast?.(
        "Please select a company first to create a purchase bill",
        "warning"
      );
      return;
    }

    try {
      // ✅ FIXED: Use onNavigate if available, otherwise direct navigation
      if (onNavigate && typeof onNavigate === "function") {
        console.log("🔄 Using onNavigate for purchase bill creation");
        onNavigate("createPurchaseBill");
      } else if (onAddPurchase && typeof onAddPurchase === "function") {
        console.log("🔄 Calling onAddPurchase callback");
        onAddPurchase();
      } else {
        // Direct navigation as fallback
        const targetUrl = `/companies/${effectiveCompanyId}/purchases/add`;
        console.log("🔄 Direct navigation to:", targetUrl);
        navigate(targetUrl);
      }

      addToast?.("Opening purchase bill form...", "info");
    } catch (error) {
      console.error("❌ Error in handleAddPurchase:", error);
      addToast?.("Failed to open purchase form", "error");
    }
  };

  // Handle More Options
  const handleMoreOptions = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (onMoreOptions && typeof onMoreOptions === "function") {
      onMoreOptions();
    } else {
      addToast?.("More options menu coming soon!", "info");
    }
  };

  // Handle Settings
  const handleSettings = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (onSettings && typeof onSettings === "function") {
      onSettings();
    } else {
      const effectiveCompanyId = getCompanyId();
      if (effectiveCompanyId) {
        if (onNavigate && typeof onNavigate === "function") {
          onNavigate("settings");
        } else {
          navigate(`/companies/${effectiveCompanyId}/settings`);
        }
      } else {
        addToast?.("Please select a company first", "warning");
      }
    }
  };

  return (
    <>
      <Navbar
        expand="lg"
        className="purchase-order-header-navbar sticky-top bg-light border-bottom shadow-sm"
        style={{
          background:
            "linear-gradient(135deg, rgba(108, 99, 255, 0.02) 0%, rgba(156, 136, 255, 0.02) 100%)",
          backdropFilter: "blur(10px)",
          zIndex: 1020,
        }}
      >
        <Container fluid className="px-3">
          <Row className="w-100 align-items-center g-3">
            {/* Left side - Search */}
            <Col md={6} lg={5}>
              <InputGroup size="sm" className="shadow-sm">
                <InputGroup.Text className="bg-white border-end-0 text-primary">
                  <FontAwesomeIcon icon={faSearch} />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search purchase orders, suppliers, order numbers..."
                  value={searchTerm || ""}
                  onChange={onSearchChange}
                  className="border-start-0 shadow-none"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    color: "#495057",
                  }}
                />
              </InputGroup>
            </Col>

            {/* Right side - Action buttons */}
            <Col md={6} lg={7}>
              <div className="d-flex justify-content-end align-items-center gap-2 flex-wrap">
                {/* Primary Action Buttons */}
                <div className="d-flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="d-flex align-items-center px-3 py-2 fw-semibold"
                    onClick={handleAddPurchaseOrder}
                    disabled={!getCompanyId()}
                    style={{
                      background:
                        "linear-gradient(135deg, #6c63ff 0%, #9c88ff 100%)",
                      border: "none",
                      borderRadius: "0.375rem",
                      boxShadow: "0 2px 8px rgba(108, 99, 255, 0.2)",
                      transition: "all 0.2s ease",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = "translateY(-1px)";
                      e.target.style.boxShadow =
                        "0 4px 15px rgba(108, 99, 255, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow =
                        "0 2px 8px rgba(108, 99, 255, 0.2)";
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faClipboardList}
                      className="me-2"
                      style={{pointerEvents: "none"}}
                    />
                    <span style={{pointerEvents: "none"}}>Add Order</span>
                  </Button>

                  <Button
                    variant="success"
                    size="sm"
                    className="d-flex align-items-center px-3 py-2 fw-semibold"
                    onClick={handleAddPurchase}
                    disabled={!getCompanyId()}
                    style={{
                      background:
                        "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
                      border: "none",
                      borderRadius: "0.375rem",
                      boxShadow: "0 2px 8px rgba(16, 185, 129, 0.2)",
                      transition: "all 0.2s ease",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = "translateY(-1px)";
                      e.target.style.boxShadow =
                        "0 4px 15px rgba(16, 185, 129, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow =
                        "0 2px 8px rgba(16, 185, 129, 0.2)";
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faFileInvoice}
                      className="me-2"
                      style={{pointerEvents: "none"}}
                    />
                    <span style={{pointerEvents: "none"}}>Add Purchase</span>
                  </Button>
                </div>

                {/* Settings ButtonGroup */}
                <ButtonGroup size="sm">
                  <Button
                    variant="outline-secondary"
                    className="d-flex align-items-center justify-content-center"
                    onClick={handleMoreOptions}
                    title="More Options"
                    style={{
                      minWidth: "38px",
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderColor: "rgba(108, 99, 255, 0.2)",
                      color: "#6c63ff",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor =
                        "rgba(108, 99, 255, 0.1)";
                      e.target.style.borderColor = "rgba(108, 99, 255, 0.3)";
                      e.target.style.color = "#5a52d5";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor =
                        "rgba(255, 255, 255, 0.8)";
                      e.target.style.borderColor = "rgba(108, 99, 255, 0.2)";
                      e.target.style.color = "#6c63ff";
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faEllipsisH}
                      style={{pointerEvents: "none"}}
                    />
                  </Button>

                  <Button
                    variant="outline-secondary"
                    className="d-flex align-items-center justify-content-center"
                    onClick={handleSettings}
                    title="Settings"
                    style={{
                      minWidth: "38px",
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderColor: "rgba(108, 99, 255, 0.2)",
                      color: "#6c63ff",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor =
                        "rgba(108, 99, 255, 0.1)";
                      e.target.style.borderColor = "rgba(108, 99, 255, 0.3)";
                      e.target.style.color = "#5a52d5";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor =
                        "rgba(255, 255, 255, 0.8)";
                      e.target.style.borderColor = "rgba(108, 99, 255, 0.2)";
                      e.target.style.color = "#6c63ff";
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faCog}
                      style={{pointerEvents: "none"}}
                    />
                  </Button>
                </ButtonGroup>
              </div>
            </Col>
          </Row>
        </Container>
      </Navbar>

      {/* ✅ MINIMAL: Bootstrap-only responsive styles */}
      <style jsx>{`
        /* Bootstrap Enhancement Styles Only */
        .purchase-order-header-navbar {
          padding: 0.75rem 0;
        }

        .purchase-order-header-navbar .container-fluid {
          max-width: 100%;
        }

        /* Search Input Focus Enhancement */
        .form-control:focus {
          border-color: rgba(108, 99, 255, 0.3) !important;
          box-shadow: 0 0 0 0.2rem rgba(108, 99, 255, 0.1) !important;
        }

        .input-group-text {
          background: linear-gradient(
            135deg,
            rgba(108, 99, 255, 0.05) 0%,
            rgba(156, 136, 255, 0.05) 100%
          ) !important;
          border-color: rgba(108, 99, 255, 0.15) !important;
        }

        /* Button Focus States */
        .btn:focus {
          box-shadow: 0 0 0 0.2rem rgba(108, 99, 255, 0.25) !important;
        }

        .btn-outline-secondary:focus {
          box-shadow: 0 0 0 0.2rem rgba(108, 99, 255, 0.15) !important;
        }

        /* Disable pointer events for child elements */
        .btn * {
          pointer-events: none !important;
        }

        /* Responsive adjustments */
        @media (max-width: 767.98px) {
          .purchase-order-header-navbar .row {
            gap: 1rem !important;
          }

          .d-flex.justify-content-end {
            justify-content: center !important;
          }

          .d-flex.gap-2 .btn {
            flex: 1;
            min-width: 110px;
            max-width: 150px;
          }
        }

        @media (max-width: 575.98px) {
          .purchase-order-header-navbar {
            padding: 0.5rem 0;
          }

          .btn-sm {
            font-size: 0.8rem;
            padding: 0.375rem 0.5rem;
          }

          .btn-sm .me-2 {
            margin-right: 0.25rem !important;
          }
        }

        /* ButtonGroup styling */
        .btn-group .btn:not(:last-child) {
          border-right: 1px solid rgba(108, 99, 255, 0.1) !important;
        }

        /* Ensure proper z-index for dropdown menus */
        .btn-group {
          z-index: 1025;
        }
      `}</style>
    </>
  );
}

export default PurchaseOrderHeader;
