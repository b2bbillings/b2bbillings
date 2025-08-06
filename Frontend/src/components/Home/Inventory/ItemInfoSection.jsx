import React from "react";
import {Card, Row, Col, Button, Spinner, Badge} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faExclamationTriangle,
  faCog,
  faBox,
  faWrench,
} from "@fortawesome/free-solid-svg-icons";

function ItemInfoSection({
  selectedItem,
  onEditItem,
  onAdjustStock,
  currentCompany,
  isLoading = false,
}) {
  if (!selectedItem) {
    return (
      <Card
        className="border-0 item-info-card"
        style={{borderRadius: "0", height: "130px"}}
      >
        <Card.Body className="d-flex align-items-center justify-content-center py-2">
          <div className="text-center text-muted">
            {isLoading ? (
              <>
                <Spinner
                  animation="border"
                  size="sm"
                  className="mb-2"
                  style={{color: "#7c3aed"}}
                />
                <div className="fw-semibold" style={{fontSize: "14px"}}>
                  Loading item details...
                </div>
              </>
            ) : (
              <>
                <div
                  className="mb-2"
                  style={{fontSize: "1.5rem", opacity: 0.5}}
                >
                  📦
                </div>
                <div className="fw-semibold mb-1" style={{fontSize: "14px"}}>
                  Select an item to view details
                </div>
                <small style={{fontSize: "12px"}}>
                  Choose an item from the sidebar
                </small>
              </>
            )}
          </div>
        </Card.Body>
      </Card>
    );
  }

  const formatPrice = (price) => {
    if (!price || isNaN(price)) return "₹0";
    return `₹${Number(price).toLocaleString("en-IN")}`;
  };

  // Get current stock - check multiple possible field names with better safety
  const getCurrentStock = () => {
    if (!selectedItem) return 0;

    return (
      Number(selectedItem.currentStock) ||
      Number(selectedItem.openingStock) ||
      Number(selectedItem.stock) ||
      Number(selectedItem.quantity) ||
      Number(selectedItem.openingQuantity) ||
      0
    );
  };

  const getStockWarning = () => {
    if (!selectedItem || selectedItem.type === "service") return false;
    const stock = getCurrentStock();
    const minStock =
      Number(selectedItem.minStockLevel) ||
      Number(selectedItem.minStockToMaintain) ||
      0;
    return stock === 0 || stock <= minStock;
  };

  const currentStock = getCurrentStock();
  const salePrice =
    Number(selectedItem.salePrice) ||
    Number(selectedItem.salePriceWithoutTax) ||
    0;
  const buyPrice =
    Number(selectedItem.buyPrice) ||
    Number(selectedItem.buyPriceWithoutTax) ||
    0;

  // Enhanced stock adjustment handler
  const handleAdjustStock = () => {
    if (!currentCompany?.id) {
      alert("Please select a company first");
      return;
    }

    if (selectedItem.type === "service") {
      alert("Stock adjustment is not applicable for services");
      return;
    }

    // Call the parent's stock adjustment handler
    if (onAdjustStock) {
      onAdjustStock(selectedItem);
    }
  };

  // Enhanced edit handler
  const handleEditItem = () => {
    if (!currentCompany?.id) {
      alert("Please select a company first");
      return;
    }

    // Call the parent's edit handler
    if (onEditItem) {
      onEditItem(selectedItem);
    }
  };

  return (
    <Card
      className="border-0 item-info-card"
      style={{borderRadius: "0", height: "130px"}}
    >
      <Card.Body className="py-3 px-3">
        {/* Compact Header Row */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="d-flex align-items-center flex-grow-1">
            <FontAwesomeIcon
              icon={selectedItem.type === "service" ? faWrench : faBox}
              className="me-2"
              style={{color: "#7c3aed", fontSize: "14px"}}
            />
            <h6
              className="mb-0 fw-bold text-dark me-2"
              style={{fontSize: "15px"}}
            >
              {selectedItem.name}
            </h6>
            {selectedItem.itemCode && (
              <small
                className="text-muted"
                style={{
                  fontSize: "11px",
                  fontFamily: "monospace",
                  background: "#f8f9fa",
                  padding: "1px 4px",
                  borderRadius: "0",
                }}
              >
                #{selectedItem.itemCode}
              </small>
            )}
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* Type and Status Badges */}
            <Badge
              className="fw-semibold"
              style={{
                fontSize: "10px",
                background:
                  selectedItem.type === "product" ? "#7c3aed" : "#059669",
                borderRadius: "0",
              }}
            >
              {selectedItem.type === "product" ? "PRODUCT" : "SERVICE"}
            </Badge>

            {selectedItem.type === "product" && getStockWarning() && (
              <Badge
                bg="warning"
                text="dark"
                className="fw-semibold"
                style={{fontSize: "10px", borderRadius: "0"}}
              >
                <FontAwesomeIcon
                  icon={faExclamationTriangle}
                  className="me-1"
                  size="xs"
                />
                LOW
              </Badge>
            )}

            {/* Action Buttons */}
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleEditItem}
              className="px-2 py-1"
              style={{
                fontSize: "11px",
                borderRadius: "0",
                borderColor: "#7c3aed",
                color: "#7c3aed",
              }}
              disabled={!currentCompany?.id || isLoading}
              title="Edit Item"
            >
              <FontAwesomeIcon icon={faEdit} size="xs" />
            </Button>

            {selectedItem.type === "product" && (
              <Button
                className="px-2 py-1 fw-semibold text-white border-0"
                size="sm"
                onClick={handleAdjustStock}
                style={{
                  fontSize: "11px",
                  background: "#7c3aed",
                  borderRadius: "0",
                }}
                disabled={!currentCompany?.id || isLoading}
                title="Adjust Stock"
              >
                <FontAwesomeIcon icon={faCog} size="xs" className="me-1" />
                ADJUST
              </Button>
            )}
          </div>
        </div>

        {/* Compact Information Grid */}
        <Row className="g-0">
          <Col xs={selectedItem.type === "product" ? 6 : 12}>
            <div className="d-flex align-items-center mb-1">
              <span
                className="text-muted fw-semibold me-2"
                style={{fontSize: "11px", minWidth: "60px"}}
              >
                Sale Price:
              </span>
              <span className="fw-bold text-success" style={{fontSize: "13px"}}>
                {formatPrice(salePrice)}
                <small className="text-muted ms-1" style={{fontSize: "10px"}}>
                  {selectedItem.isSalePriceTaxInclusive ? "(inc)" : "(exc)"}
                </small>
              </span>
            </div>

            {selectedItem.type === "product" && buyPrice > 0 && (
              <div className="d-flex align-items-center mb-1">
                <span
                  className="text-muted fw-semibold me-2"
                  style={{fontSize: "11px", minWidth: "60px"}}
                >
                  Buy Price:
                </span>
                <span className="fw-bold text-info" style={{fontSize: "13px"}}>
                  {formatPrice(buyPrice)}
                  <small className="text-muted ms-1" style={{fontSize: "10px"}}>
                    {selectedItem.isBuyPriceTaxInclusive ? "(inc)" : "(exc)"}
                  </small>
                </span>
              </div>
            )}

            {selectedItem.gstRate && (
              <div className="d-flex align-items-center">
                <span
                  className="text-muted fw-semibold me-2"
                  style={{fontSize: "11px", minWidth: "60px"}}
                >
                  GST Rate:
                </span>
                <span
                  className="fw-bold text-secondary"
                  style={{fontSize: "13px"}}
                >
                  {selectedItem.gstRate}%
                </span>
              </div>
            )}
          </Col>

          {selectedItem.type === "product" && (
            <Col xs={6}>
              <div className="d-flex align-items-center justify-content-end mb-1">
                <span
                  className="text-muted fw-semibold me-2"
                  style={{fontSize: "11px"}}
                >
                  Stock:
                </span>
                <span
                  className={`fw-bold ${
                    getStockWarning() ? "text-danger" : "text-success"
                  }`}
                  style={{fontSize: "13px"}}
                >
                  {currentStock} {selectedItem.unit || "PCS"}
                </span>
              </div>

              <div className="d-flex align-items-center justify-content-end mb-1">
                <span
                  className="text-muted fw-semibold me-2"
                  style={{fontSize: "11px"}}
                >
                  Value:
                </span>
                <span
                  className="fw-bold text-primary"
                  style={{fontSize: "13px"}}
                >
                  {formatPrice(currentStock * buyPrice)}
                </span>
              </div>

              {(selectedItem.minStockLevel > 0 ||
                selectedItem.minStockToMaintain > 0) && (
                <div className="d-flex align-items-center justify-content-end">
                  <span
                    className="text-muted fw-semibold me-2"
                    style={{fontSize: "11px"}}
                  >
                    Min Stock:
                  </span>
                  <span
                    className="fw-bold text-warning"
                    style={{fontSize: "13px"}}
                  >
                    {selectedItem.minStockLevel ||
                      selectedItem.minStockToMaintain}
                  </span>
                </div>
              )}
            </Col>
          )}
        </Row>

        {/* Compact Description */}
        {selectedItem.description && (
          <div className="mt-2 pt-2 border-top">
            <div
              className="text-dark text-truncate"
              style={{fontSize: "12px"}}
              title={selectedItem.description}
            >
              <span
                className="text-muted fw-semibold me-2"
                style={{fontSize: "11px"}}
              >
                Desc:
              </span>
              {selectedItem.description}
            </div>
          </div>
        )}
      </Card.Body>

      {/* Clean Styles */}
      <style>
        {`
                .item-info-card {
                    background: #ffffff;
                    border: 1px solid #dee2e6 !important;
                    transition: all 0.2s ease;
                    border-radius: 0 !important;
                }
                
                .item-info-card:hover {
                    box-shadow: 0 2px 8px rgba(124, 58, 237, 0.1) !important;
                    border-color: #7c3aed !important;
                }
                
                .btn:hover {
                    transform: translateY(-1px);
                    transition: all 0.2s ease;
                }
                
                .btn[style*="background: #7c3aed"]:hover {
                    background: #6d28d9 !important;
                }
                
                .btn[style*="color: #7c3aed"]:hover {
                    background: #7c3aed !important;
                    color: white !important;
                }
                
                .btn:disabled {
                    opacity: 0.5;
                    transform: none !important;
                    cursor: not-allowed;
                }
                
                .badge {
                    border-radius: 0 !important;
                }
                
                .card-body {
                    border-radius: 0 !important;
                }
                
                /* Responsive adjustments */
                @media (max-width: 768px) {
                    .d-flex.justify-content-between {
                        flex-direction: column;
                        align-items: flex-start !important;
                        gap: 0.5rem;
                    }
                    
                    .d-flex.gap-2 {
                        align-self: stretch;
                        justify-content: space-between;
                    }
                }
                
                @media (max-width: 576px) {
                    .item-info-card {
                        height: auto !important;
                        min-height: 130px;
                    }
                    
                    .btn {
                        font-size: 10px !important;
                        padding: 0.25rem 0.5rem !important;
                    }
                    
                    .col-6:last-child {
                        margin-top: 0.5rem;
                    }
                }
                `}
      </style>
    </Card>
  );
}

export default ItemInfoSection;
