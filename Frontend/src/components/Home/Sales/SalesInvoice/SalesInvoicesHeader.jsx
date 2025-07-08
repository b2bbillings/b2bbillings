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
} from "@fortawesome/free-solid-svg-icons";
import {useNavigate, useParams} from "react-router-dom";

function SalesInvoicesHeader({
  searchTerm,
  onSearchChange,
  onAddSale,
  onAddPurchase,
  onMoreOptions,
  onSettings,
  pageTitle = "Sales Invoices",
  companyId: propCompanyId,
  currentCompany,
  addToast,
  onNavigate,
}) {
  const navigate = useNavigate();
  const {companyId: urlCompanyId} = useParams();

  const getCompanyId = () => {
    return (
      propCompanyId || urlCompanyId || currentCompany?.id || currentCompany?._id
    );
  };

  const handleAddSale = (e) => {
    e.preventDefault();
    const effectiveCompanyId = getCompanyId();

    if (!effectiveCompanyId) {
      addToast?.(
        "Please select a company first to create a sales invoice",
        "warning"
      );
      return;
    }

    try {
      if (onNavigate && typeof onNavigate === "function") {
        onNavigate("createSalesInvoice");
      } else if (onAddSale && typeof onAddSale === "function") {
        onAddSale();
      } else {
        const targetUrl = `/companies/${effectiveCompanyId}/sales-invoices/add`;
        navigate(targetUrl);
      }
      addToast?.("Opening sales invoice form...", "info");
    } catch (error) {
      addToast?.("Failed to open sales invoice form", "error");
    }
  };

  const handleAddPurchase = (e) => {
    e.preventDefault();
    const effectiveCompanyId = getCompanyId();

    if (!effectiveCompanyId) {
      addToast?.(
        "Please select a company first to create a purchase",
        "warning"
      );
      return;
    }

    try {
      if (onNavigate && typeof onNavigate === "function") {
        onNavigate("createPurchase");
      } else if (onAddPurchase && typeof onAddPurchase === "function") {
        onAddPurchase();
      } else {
        navigate(`/companies/${effectiveCompanyId}/purchases/add`);
      }
      addToast?.("Opening purchase form...", "info");
    } catch (error) {
      addToast?.("Failed to open purchase form", "error");
    }
  };

  const handleMoreOptions = (e) => {
    e.preventDefault();
    if (onMoreOptions && typeof onMoreOptions === "function") {
      onMoreOptions();
    } else {
      addToast?.("More options menu coming soon!", "info");
    }
  };

  const handleSettings = (e) => {
    e.preventDefault();
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
    <div className="p-3">
      <Navbar
        expand="lg"
        className="bg-light border border-2 border-start-0 border-end-0 border-top-0 shadow-sm invoice-navbar"
        style={{borderRadius: 0}}
      >
        <Container fluid>
          <Row className="w-100 align-items-center g-3">
            {/* Search Section */}
            <Col lg={6} md={7}>
              <InputGroup>
                <InputGroup.Text
                  className="bg-white border-end-0 custom-input-text"
                  style={{borderRadius: 0}}
                >
                  <FontAwesomeIcon icon={faSearch} className="text-primary" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search invoices, customers, items..."
                  value={searchTerm || ""}
                  onChange={onSearchChange}
                  className="border-start-0 custom-form-control"
                  style={{borderRadius: 0}}
                />
              </InputGroup>
            </Col>

            {/* Action Buttons Section */}
            <Col lg={6} md={5}>
              <div className="d-flex justify-content-end gap-2 flex-wrap">
                {/* Add Sales Invoice Button */}
                <Button
                  variant="primary"
                  size="sm"
                  className="d-flex align-items-center px-3 fw-semibold custom-primary-btn"
                  onClick={handleAddSale}
                  disabled={!getCompanyId()}
                  style={{borderRadius: 0}}
                >
                  <FontAwesomeIcon icon={faClipboardList} className="me-2" />
                  <span className="d-none d-sm-inline">Add Sale</span>
                  <span className="d-sm-none">Add</span>
                </Button>

                {/* Add Purchase Button */}
                <Button
                  variant="success"
                  size="sm"
                  className="d-flex align-items-center px-3 fw-semibold custom-success-btn"
                  onClick={handleAddPurchase}
                  disabled={!getCompanyId()}
                  style={{borderRadius: 0}}
                >
                  <FontAwesomeIcon icon={faPlus} className="me-2" />
                  <span className="d-none d-sm-inline">Add Purchase</span>
                  <span className="d-sm-none">Purchase</span>
                </Button>

                {/* Settings ButtonGroup */}
                <ButtonGroup size="sm">
                  <Button
                    variant="outline-secondary"
                    onClick={handleMoreOptions}
                    title="More Options"
                    className="d-flex align-items-center justify-content-center custom-outline-primary"
                    style={{minWidth: "38px", borderRadius: 0}}
                  >
                    <FontAwesomeIcon icon={faEllipsisH} />
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={handleSettings}
                    title="Settings"
                    className="d-flex align-items-center justify-content-center custom-outline-primary"
                    style={{minWidth: "38px", borderRadius: 0}}
                  >
                    <FontAwesomeIcon icon={faCog} />
                  </Button>
                </ButtonGroup>
              </div>
            </Col>
          </Row>
        </Container>
      </Navbar>

      <style>{`
        /* Container spacing */
        .p-3 {
          margin: 0.75rem 0;
        }

        /* Navbar theme */
        .invoice-navbar {
          background: linear-gradient(
            135deg,
            rgba(99, 102, 241, 0.03) 0%,
            rgba(139, 92, 246, 0.02) 100%
          ) !important;
          border-color: #6366f1 !important;
          backdrop-filter: blur(10px);
          margin-bottom: 0.5rem;
        }

        /* Form controls */
        .custom-form-control:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 0.2rem rgba(99, 102, 241, 0.25);
        }

        .custom-input-text {
          background: rgba(99, 102, 241, 0.05);
          border-color: rgba(99, 102, 241, 0.15);
        }

        /* Primary button theme */
        .custom-primary-btn {
          background: linear-gradient(
            135deg,
            #6366f1 0%,
            #8b5cf6 100%
          ) !important;
          border-color: #6366f1 !important;
          transition: all 0.15s ease-in-out;
        }

        .custom-primary-btn:hover {
          background: linear-gradient(
            135deg,
            #4f46e5 0%,
            #7c3aed 100%
          ) !important;
          border-color: #4f46e5 !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .custom-primary-btn:focus {
          box-shadow: 0 0 0 0.2rem rgba(99, 102, 241, 0.25) !important;
        }

        /* Success button */
        .custom-success-btn {
          background: linear-gradient(
            135deg,
            #10b981 0%,
            #059669 100%
          ) !important;
          border-color: #10b981 !important;
          transition: all 0.15s ease-in-out;
        }

        .custom-success-btn:hover {
          background: linear-gradient(
            135deg,
            #059669 0%,
            #047857 100%
          ) !important;
          border-color: #059669 !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        /* Outline buttons */
        .custom-outline-primary {
          border-color: #6366f1 !important;
          color: #6366f1 !important;
          transition: all 0.15s ease-in-out;
        }

        .custom-outline-primary:hover {
          background-color: #6366f1 !important;
          border-color: #6366f1 !important;
          color: white !important;
        }

        .custom-outline-primary:focus {
          box-shadow: 0 0 0 0.2rem rgba(99, 102, 241, 0.25) !important;
        }

        @media (max-width: 767.98px) {
          .gap-2 {
            gap: 0.5rem !important;
          }

          .btn-sm {
            font-size: 0.8rem;
            padding: 0.375rem 0.5rem;
          }

          .p-3 {
            margin: 0.5rem 0;
            padding: 0.75rem !important;
          }
        }

        @media (max-width: 575.98px) {
          .d-flex.justify-content-end {
            justify-content: center !important;
          }

          .flex-wrap {
            justify-content: center;
          }

          .p-3 {
            padding: 0.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}

export default SalesInvoicesHeader;
