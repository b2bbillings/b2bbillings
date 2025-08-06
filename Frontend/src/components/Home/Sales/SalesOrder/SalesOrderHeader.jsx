import React from "react";
import {Row, Col, Button, Card} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faFileContract, faPlus} from "@fortawesome/free-solid-svg-icons";

function SalesOrderHeader({
  orderNumber,
  orderDate,
  orderStatus,
  onInputChange,
  isEditing = false,
  mode = "quotations",
  documentType = "quotation",
  onAddQuotation,
  companyId,
  addToast,
}) {
  const isQuotations = mode === "quotations" || documentType === "quotation";

  const getTitle = () => {
    return isQuotations ? "Quotations" : "Sales Orders";
  };

  const getSubtitle = () => {
    return isQuotations
      ? "Create and manage professional quotations for your clients"
      : "Manage your sales orders and track customer purchases";
  };

  const handleAddQuotation = (e) => {
    e.preventDefault();

    if (!companyId) {
      addToast?.(
        "Please select a company first to create a quotation",
        "warning"
      );
      return;
    }

    try {
      if (onAddQuotation && typeof onAddQuotation === "function") {
        onAddQuotation();
      } else {
        addToast?.("Opening quotation form...", "info");
      }
    } catch (error) {
      addToast?.("Failed to open quotation form", "error");
    }
  };

  return (
    <div className="p-3">
      <Card
        className={`border-0 shadow-sm mb-3 ${
          isQuotations ? "quotation-header" : "sales-header"
        }`}
      >
        <Card.Body className="p-4">
          <Row className="align-items-center g-3">
            {/* Left Section - Title and Info */}
            <Col lg={8} md={8}>
              <div className="d-flex align-items-center">
                <div
                  className={`icon-wrapper me-3 ${
                    isQuotations ? "purple-icon" : "blue-icon"
                  }`}
                >
                  <FontAwesomeIcon
                    icon={faFileContract}
                    size="lg"
                    className="text-white"
                  />
                </div>
                <div>
                  <h4 className="mb-2 fw-bold text-dark">{getTitle()}</h4>
                  <p className="text-muted small mb-0">{getSubtitle()}</p>
                </div>
              </div>
            </Col>

            {/* Right Section - Action Button */}
            <Col lg={4} md={4}>
              <div className="d-flex justify-content-end">
                <Button
                  variant={isQuotations ? "purple" : "primary"}
                  size="md"
                  className={`d-flex align-items-center px-4 fw-semibold ${
                    isQuotations ? "custom-purple-btn" : "custom-primary-btn"
                  }`}
                  onClick={handleAddQuotation}
                  disabled={!companyId}
                >
                  <FontAwesomeIcon icon={faPlus} className="me-2" />
                  <span className="d-none d-sm-inline">
                    {isQuotations ? "Create Quotation" : "Create Order"}
                  </span>
                  <span className="d-sm-none">Create</span>
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <style>{`
        /* ✅ FIXED: Consistent border-radius for all elements */
        .quotation-header,
        .sales-header {
          border-radius: 8px !important;
          background: linear-gradient(
            135deg,
            rgba(139, 92, 246, 0.03) 0%,
            rgba(168, 85, 247, 0.01) 100%
          );
          border-left: 4px solid #8b5cf6 !important;
        }

        .sales-header {
          background: linear-gradient(
            135deg,
            rgba(99, 102, 241, 0.03) 0%,
            rgba(139, 92, 246, 0.01) 100%
          );
          border-left: 4px solid #6366f1 !important;
        }

        /* ✅ FIXED: Consistent border-radius for icon wrapper */
        .icon-wrapper {
          width: 55px;
          height: 55px;
          border-radius: 8px !important;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .purple-icon {
          background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
        }

        .blue-icon {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }

        /* ✅ FIXED: Consistent border-radius for buttons */
        .custom-purple-btn,
        .custom-primary-btn {
          border-radius: 8px !important;
          transition: all 0.2s ease-in-out;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .custom-purple-btn {
          background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%) !important;
          border-color: #8b5cf6 !important;
          color: white !important;
        }

        .custom-purple-btn:hover {
          background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%) !important;
          border-color: #7c3aed !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
        }

        .custom-purple-btn:focus {
          box-shadow: 0 0 0 0.25rem rgba(139, 92, 246, 0.25) !important;
        }

        .custom-purple-btn:disabled {
          background: #d1d5db !important;
          border-color: #d1d5db !important;
          color: #6b7280 !important;
          transform: none;
          box-shadow: none;
        }

        .custom-primary-btn {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
          border-color: #6366f1 !important;
        }

        .custom-primary-btn:hover {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%) !important;
          border-color: #4f46e5 !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
        }

        .custom-primary-btn:focus {
          box-shadow: 0 0 0 0.25rem rgba(99, 102, 241, 0.25) !important;
        }

        /* ✅ FIXED: Consistent border-radius for form controls */
        .form-control-custom {
          border: 1px solid #dee2e6;
          border-radius: 8px !important;
          transition: all 0.15s ease-in-out;
        }

        .form-control-custom:hover {
          border-color: #adb5bd;
        }

        .purple-focus:focus {
          border-color: #8b5cf6 !important;
          box-shadow: 0 0 0 0.2rem rgba(139, 92, 246, 0.25) !important;
        }

        .blue-focus:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 0.2rem rgba(99, 102, 241, 0.25) !important;
        }

        /* ✅ Typography improvements */
        h4 {
          font-size: 1.5rem;
          color: #1f2937;
        }

        .text-muted {
          color: #6b7280 !important;
        }

        /* ✅ Responsive design improvements */
        @media (max-width: 991.98px) {
          .icon-wrapper {
            width: 50px;
            height: 50px;
            border-radius: 8px !important;
          }

          h4 {
            font-size: 1.3rem;
          }

          .btn {
            font-size: 0.9rem;
            border-radius: 8px !important;
          }
        }

        @media (max-width: 767.98px) {
          .d-flex.justify-content-end {
            justify-content: center !important;
          }

          .icon-wrapper {
            width: 45px;
            height: 45px;
            border-radius: 8px !important;
          }

          h4 {
            font-size: 1.2rem;
          }

          .card-body {
            padding: 1.5rem !important;
          }

          .btn {
            width: 100%;
            justify-content: center;
            border-radius: 8px !important;
          }
        }

        @media (max-width: 575.98px) {
          .icon-wrapper {
            width: 40px;
            height: 40px;
            border-radius: 8px !important;
          }

          h4 {
            font-size: 1.1rem;
          }

          .small {
            font-size: 0.8rem !important;
          }

          .card-body {
            padding: 1rem !important;
          }

          .btn {
            font-size: 0.85rem;
            padding: 0.5rem 1rem;
            border-radius: 8px !important;
          }
        }

        /* ✅ FIXED: Remove any conflicting border-radius from Bootstrap */
        .card,
        .card-body,
        .btn,
        .form-control,
        .input-group .form-control,
        .input-group-text {
          border-radius: 8px !important;
        }

        /* ✅ FIXED: Ensure consistent border-radius for all states */
        .btn:hover,
        .btn:focus,
        .btn:active,
        .btn:disabled {
          border-radius: 8px !important;
        }

        .form-control:hover,
        .form-control:focus,
        .form-control:active {
          border-radius: 8px !important;
        }

        /* ✅ Production-ready: Remove any conflicting styles */
        * {
          box-sizing: border-box;
        }

        /* ✅ Smooth transitions for better UX */
        .card,
        .btn,
        .icon-wrapper {
          transition: all 0.2s ease-in-out;
        }

        /* ✅ Accessibility improvements */
        .btn:focus-visible {
          outline: 2px solid #8b5cf6;
          outline-offset: 2px;
          border-radius: 8px !important;
        }

        /* ✅ Print styles */
        @media print {
          .card,
          .btn,
          .icon-wrapper {
            border-radius: 8px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default SalesOrderHeader;
