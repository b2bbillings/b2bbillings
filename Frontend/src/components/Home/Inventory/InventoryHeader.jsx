import React from "react";
import {
  Navbar,
  Container,
  Row,
  Col,
  InputGroup,
  Form,
  Button,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faPlus,
  faEllipsisH,
  faCog,
  faUpload,
} from "@fortawesome/free-solid-svg-icons";

function InventoryHeader({
  activeType,
  onTypeChange,
  transactionSearchQuery,
  onTransactionSearchChange,
  onAddSale,
  onAddPurchase,
  onBulkImport,
  onMoreOptions,
  onSettings,
}) {
  return (
    <>
      <Navbar bg="white" className="border-bottom shadow-sm sticky-top">
        <Container fluid className="px-3 px-md-4 py-3">
          <Row className="w-100 align-items-center g-3">
            {/* Left side - Type Toggle */}
            <Col xs={12} md={3} lg={3} xl={2}>
              <div
                className="btn-group w-100"
                role="group"
                style={{borderRadius: "0"}}
              >
                <Button
                  variant={
                    activeType === "products" ? "success" : "outline-success"
                  }
                  size="sm"
                  className="fw-semibold"
                  onClick={() => onTypeChange("products")}
                  style={{
                    borderRadius: "0",
                    fontSize: "13px",
                    padding: "0.5rem 1rem",
                  }}
                >
                  Products
                </Button>
                <Button
                  variant={
                    activeType === "services" ? "warning" : "outline-warning"
                  }
                  size="sm"
                  className="fw-semibold"
                  onClick={() => onTypeChange("services")}
                  style={{
                    borderRadius: "0",
                    fontSize: "13px",
                    padding: "0.5rem 1rem",
                  }}
                >
                  Services
                </Button>
              </div>
            </Col>

            {/* Center - Search */}
            <Col xs={12} md={5} lg={5} xl={6}>
              <InputGroup
                size="sm"
                className="mx-auto"
                style={{maxWidth: "450px"}}
              >
                <InputGroup.Text
                  className="bg-light border-end-0"
                  style={{borderRadius: "0"}}
                >
                  <FontAwesomeIcon
                    icon={faSearch}
                    className="text-muted"
                    size="sm"
                  />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder={`Search ${activeType}, transactions, categories...`}
                  value={transactionSearchQuery}
                  onChange={(e) => onTransactionSearchChange(e.target.value)}
                  className="border-start-0 bg-light text-dark"
                  style={{
                    fontSize: "14px",
                    borderRadius: "0",
                  }}
                />
              </InputGroup>
            </Col>

            {/* Right side - Action buttons */}
            <Col xs={12} md={4} lg={4} xl={4}>
              <div className="d-flex gap-2 justify-content-end justify-content-md-end justify-content-center flex-wrap align-items-center">
                <Button
                  size="sm"
                  className="fw-semibold text-white border-0"
                  onClick={onAddSale}
                  style={{
                    background:
                      "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                    borderRadius: "0",
                    fontSize: "13px",
                    padding: "0.5rem 1rem",
                    minWidth: "100px",
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} className="me-2" size="xs" />
                  Add Sale
                </Button>
                <Button
                  size="sm"
                  className="fw-semibold text-white border-0"
                  onClick={onAddPurchase}
                  style={{
                    background:
                      "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                    borderRadius: "0",
                    fontSize: "13px",
                    padding: "0.5rem 1rem",
                    minWidth: "120px",
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} className="me-2" size="xs" />
                  Add Purchase
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={onBulkImport}
                  title="Bulk Import"
                  style={{
                    borderRadius: "0",
                    padding: "0.5rem 0.75rem",
                    minWidth: "40px",
                  }}
                >
                  <FontAwesomeIcon icon={faUpload} size="sm" />
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={onMoreOptions}
                  title="More Options"
                  style={{
                    borderRadius: "0",
                    padding: "0.5rem 0.75rem",
                    minWidth: "40px",
                  }}
                >
                  <FontAwesomeIcon icon={faEllipsisH} size="sm" />
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={onSettings}
                  title="Settings"
                  style={{
                    borderRadius: "0",
                    padding: "0.5rem 0.75rem",
                    minWidth: "40px",
                  }}
                >
                  <FontAwesomeIcon icon={faCog} size="sm" />
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </Navbar>

      {/* Minimal Custom Styles */}
      <style>
        {`
                /* Remove focus outlines and add consistent focus states */
                .btn:focus,
                .form-control:focus,
                .input-group-text:focus {
                    box-shadow: 0 0 0 0.2rem rgba(124, 58, 237, 0.25) !important;
                    border-color: #7c3aed !important;
                }

                /* Hover effects for gradient buttons */
                .btn[style*="linear-gradient"]:hover {
                    opacity: 0.9;
                    transform: translateY(-1px);
                    transition: all 0.2s ease;
                }

                /* Better responsive spacing */
                @media (max-width: 767px) {
                    .btn-group {
                        margin-bottom: 0.5rem;
                    }
                    
                    .d-flex.gap-2 {
                        gap: 0.5rem !important;
                    }
                    
                    .btn {
                        font-size: 12px !important;
                        padding: 0.4rem 0.8rem !important;
                    }
                    
                    .btn[style*="minWidth"] {
                        min-width: 80px !important;
                    }
                }

                /* Ensure button group stays together */
                .btn-group .btn {
                    border-radius: 0 !important;
                }
                
                .btn-group .btn:first-child {
                    border-top-left-radius: 0 !important;
                    border-bottom-left-radius: 0 !important;
                }
                
                .btn-group .btn:last-child {
                    border-top-right-radius: 0 !important;
                    border-bottom-right-radius: 0 !important;
                }

                /* Search input improvements */
                .form-control::placeholder {
                    color: #6c757d;
                    opacity: 0.8;
                }

                .form-control:focus {
                    background-color: white !important;
                    color: #495057 !important;
                }
                `}
      </style>
    </>
  );
}

export default InventoryHeader;
