import React, {useState, useEffect} from "react";
import {
  Modal,
  Form,
  Button,
  Row,
  Col,
  Alert,
  InputGroup,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSave,
  faTimes,
  faPlus,
  faMinus,
} from "@fortawesome/free-solid-svg-icons";

function StockAdjustmentModal({show, onHide, product, onUpdateStock}) {
  const [adjustmentType, setAdjustmentType] = useState("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [newStock, setNewStock] = useState(0);

  const adjustmentReasons = {
    add: [
      "Purchase/Received stock",
      "Stock return from customer",
      "Found additional stock",
      "Supplier adjustment",
      "Other (specify below)",
    ],
    remove: [
      "Sold/Dispatched",
      "Damaged/Expired",
      "Lost/Stolen",
      "Used for demo/sample",
      "Returned to supplier",
      "Other (specify below)",
    ],
    set: [
      "Physical count adjustment",
      "Correction of error",
      "System migration",
      "Audit adjustment",
      "Other (specify below)",
    ],
  };

  useEffect(() => {
    if (product) {
      setNewStock(product.currentStock || 0);
      setQuantity("");
      setReason("");
      setAdjustmentType("add");
    }
  }, [product]);

  useEffect(() => {
    if (product && quantity !== "") {
      const qty = parseFloat(quantity) || 0;
      const currentStock = product.currentStock || 0;

      switch (adjustmentType) {
        case "add":
          setNewStock(currentStock + qty);
          break;
        case "remove":
          setNewStock(Math.max(0, currentStock - qty));
          break;
        case "set":
          setNewStock(qty);
          break;
        default:
          setNewStock(currentStock);
      }
    }
  }, [quantity, adjustmentType, product]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!quantity || parseFloat(quantity) < 0) {
      alert("Please enter a valid quantity");
      return;
    }

    if (!reason) {
      alert("Please select or enter a reason for adjustment");
      return;
    }

    if (
      adjustmentType === "remove" &&
      parseFloat(quantity) > (product.currentStock || 0)
    ) {
      if (!window.confirm("This will result in negative stock. Continue?")) {
        return;
      }
    }

    // Create the adjustment data object with all required fields
    const adjustmentData = {
      adjustmentType: adjustmentType,
      quantity: parseFloat(quantity),
      newStock: newStock,
      reason: reason,
      asOfDate: new Date().toISOString().split("T")[0],
    };

    // Call the parent's update handler with the product ID and adjustment data
    onUpdateStock(product.id || product._id, adjustmentData);
  };

  const handleQuickAdjust = (amount) => {
    setQuantity(Math.abs(amount).toString());
    setAdjustmentType(amount > 0 ? "add" : "remove");
  };

  if (!product) return null;

  return (
    <Modal show={show} onHide={onHide} size="md" centered>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          Adjust Stock - {product.name}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="px-4 pb-4">
        {/* Current Stock Display */}
        <div className="current-stock-display mb-4">
          <div className="text-center">
            <h6 className="text-muted mb-1">Current Stock</h6>
            <h3 className="fw-bold text-primary mb-0">
              {product.currentStock || 0} {product.unit}
            </h3>
            <small className="text-muted">SKU: {product.sku}</small>
          </div>
        </div>

        <Form onSubmit={handleSubmit}>
          {/* Adjustment Type */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Adjustment Type</Form.Label>
            <div className="d-flex gap-2">
              <Form.Check
                type="radio"
                id="add"
                name="adjustmentType"
                value="add"
                checked={adjustmentType === "add"}
                onChange={(e) => setAdjustmentType(e.target.value)}
                label="Add Stock"
                className="flex-fill"
              />
              <Form.Check
                type="radio"
                id="remove"
                name="adjustmentType"
                value="remove"
                checked={adjustmentType === "remove"}
                onChange={(e) => setAdjustmentType(e.target.value)}
                label="Remove Stock"
                className="flex-fill"
              />
              <Form.Check
                type="radio"
                id="set"
                name="adjustmentType"
                value="set"
                checked={adjustmentType === "set"}
                onChange={(e) => setAdjustmentType(e.target.value)}
                label="Set Stock"
                className="flex-fill"
              />
            </div>
          </Form.Group>

          {/* Quick Adjustment Buttons */}
          <div className="mb-3">
            <Form.Label className="fw-semibold">Quick Adjustments</Form.Label>
            <div className="d-flex gap-2 flex-wrap">
              <Button
                variant="outline-success"
                size="sm"
                onClick={() => handleQuickAdjust(1)}
                type="button"
              >
                <FontAwesomeIcon icon={faPlus} className="me-1" />
                +1
              </Button>
              <Button
                variant="outline-success"
                size="sm"
                onClick={() => handleQuickAdjust(5)}
                type="button"
              >
                <FontAwesomeIcon icon={faPlus} className="me-1" />
                +5
              </Button>
              <Button
                variant="outline-success"
                size="sm"
                onClick={() => handleQuickAdjust(10)}
                type="button"
              >
                <FontAwesomeIcon icon={faPlus} className="me-1" />
                +10
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => handleQuickAdjust(-1)}
                type="button"
              >
                <FontAwesomeIcon icon={faMinus} className="me-1" />
                -1
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => handleQuickAdjust(-5)}
                type="button"
              >
                <FontAwesomeIcon icon={faMinus} className="me-1" />
                -5
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => handleQuickAdjust(-10)}
                type="button"
              >
                <FontAwesomeIcon icon={faMinus} className="me-1" />
                -10
              </Button>
            </div>
          </div>

          {/* Quantity Input */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">
              {adjustmentType === "set" ? "New Stock Quantity" : "Quantity"}
              <span className="text-danger">*</span>
            </Form.Label>
            <InputGroup>
              <Form.Control
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={
                  adjustmentType === "set"
                    ? "Enter new stock level"
                    : "Enter quantity"
                }
                className="form-input"
                min="0"
                step="1"
                required
              />
              <InputGroup.Text>{product.unit}</InputGroup.Text>
            </InputGroup>
          </Form.Group>

          {/* Reason */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">
              Reason <span className="text-danger">*</span>
            </Form.Label>
            <Form.Select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="form-input"
              required
            >
              <option value="">Select reason</option>
              {adjustmentReasons[adjustmentType].map((reasonText, index) => (
                <option key={index} value={reasonText}>
                  {reasonText}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          {/* Custom Reason */}
          {reason === "Other (specify below)" && (
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Custom Reason</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter custom reason"
                className="form-input"
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </Form.Group>
          )}

          {/* Stock Change Preview */}
          {quantity && (
            <div className="stock-change-preview">
              <h6 className="fw-semibold mb-2">Preview</h6>
              <Row>
                <Col xs={4}>
                  <div className="text-center">
                    <div className="text-muted small">Current</div>
                    <div className="fw-semibold">
                      {product.currentStock || 0}
                    </div>
                  </div>
                </Col>
                <Col xs={4}>
                  <div className="text-center">
                    <div className="text-muted small">Change</div>
                    <div
                      className={`fw-semibold ${
                        adjustmentType === "add"
                          ? "text-success"
                          : adjustmentType === "remove"
                          ? "text-danger"
                          : "text-info"
                      }`}
                    >
                      {adjustmentType === "add" && "+"}
                      {adjustmentType === "remove" && "-"}
                      {adjustmentType === "set" && "→"}
                      {adjustmentType === "set" ? newStock : quantity}
                    </div>
                  </div>
                </Col>
                <Col xs={4}>
                  <div className="text-center">
                    <div className="text-muted small">New Total</div>
                    <div className="fw-semibold text-primary">{newStock}</div>
                  </div>
                </Col>
              </Row>
            </div>
          )}

          {/* Warning for negative stock */}
          {newStock < 0 && (
            <Alert variant="warning" className="mt-3">
              <small>
                <strong>Warning:</strong> This adjustment will result in
                negative stock.
              </small>
            </Alert>
          )}

          {/* Warning for low stock */}
          {newStock > 0 && newStock <= product.minStockLevel && (
            <Alert variant="info" className="mt-3">
              <small>
                <strong>Note:</strong> Stock will be below minimum level (
                {product.minStockLevel} {product.unit}).
              </small>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="d-flex gap-3 justify-content-end mt-4">
            <Button
              variant="outline-secondary"
              onClick={onHide}
              className="px-4"
              type="button"
            >
              <FontAwesomeIcon icon={faTimes} className="me-2" />
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              className="px-4"
              disabled={!quantity || !reason}
            >
              <FontAwesomeIcon icon={faSave} className="me-2" />
              Update Stock
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default StockAdjustmentModal;
