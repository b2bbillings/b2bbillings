import React from "react";
import {Row, Col, Form, InputGroup, Card} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faCalendarAlt,
  faFilter,
  faBuilding,
  faTag,
} from "@fortawesome/free-solid-svg-icons";

function PurchaseOrderFilter({
  // ✅ Filter props like SalesInvoicesFilter
  dateRange = "This Month",
  startDate,
  endDate,
  statusFilter = "all",
  supplierFilter = "",
  onDateRangeChange,
  onStartDateChange,
  onEndDateChange,
  onStatusFilterChange,
  onSupplierFilterChange,
  mode = "orders",
  documentType = "order",
}) {
  // ✅ Date range options like SalesInvoicesFilter
  const dateRangeOptions = [
    "Today",
    "Yesterday",
    "This Week",
    "Last Week",
    "This Month",
    "Last Month",
    "This Quarter",
    "Last Quarter",
    "This Year",
    "Last Year",
    "Custom Range",
  ];

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
  };

  const isOrders = mode === "orders" || documentType === "order";
  const theme = "purple"; // Purple theme for purchase orders

  return (
    <Card
      className={`border-0 shadow-sm mb-3 ${theme}-theme`}
      style={{borderRadius: 0}}
    >
      <Card.Header className="bg-light border-0 py-2" style={{borderRadius: 0}}>
        <FontAwesomeIcon icon={faFilter} className={`me-2 text-${theme}`} />
        <span className="fw-semibold">Purchase Order Filters</span>
      </Card.Header>

      <Card.Body className="py-3" style={{borderRadius: 0}}>
        <Row className="g-3">
          {/* ✅ Date Range */}
          <Col md={3}>
            <Form.Label className="small text-muted mb-1">
              Date Range
            </Form.Label>
            <Form.Select
              size="sm"
              value={dateRange || "This Month"}
              onChange={(e) => onDateRangeChange?.(e.target.value)}
              style={{borderRadius: 0}}
            >
              {dateRangeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Form.Select>
          </Col>

          {/* ✅ From Date */}
          <Col md={2}>
            <Form.Label className="small text-muted mb-1">From Date</Form.Label>
            <InputGroup size="sm">
              <InputGroup.Text style={{borderRadius: 0}}>
                <FontAwesomeIcon icon={faCalendarAlt} />
              </InputGroup.Text>
              <Form.Control
                type="date"
                value={formatDate(startDate)}
                onChange={onStartDateChange}
                style={{borderRadius: 0}}
              />
            </InputGroup>
          </Col>

          {/* ✅ To Date */}
          <Col md={2}>
            <Form.Label className="small text-muted mb-1">To Date</Form.Label>
            <InputGroup size="sm">
              <InputGroup.Text style={{borderRadius: 0}}>
                <FontAwesomeIcon icon={faCalendarAlt} />
              </InputGroup.Text>
              <Form.Control
                type="date"
                value={formatDate(endDate)}
                onChange={onEndDateChange}
                style={{borderRadius: 0}}
              />
            </InputGroup>
          </Col>

          {/* ✅ Status Filter */}
          <Col md={2}>
            <Form.Label className="small text-muted mb-1">Status</Form.Label>
            <Form.Select
              size="sm"
              value={statusFilter || "all"}
              onChange={(e) => onStatusFilterChange?.(e.target.value)}
              style={{borderRadius: 0}}
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option>
              <option value="received">Received</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Form.Select>
          </Col>

          {/* ✅ Supplier Filter */}
          <Col md={3}>
            <Form.Label className="small text-muted mb-1">Supplier</Form.Label>
            <InputGroup size="sm">
              <InputGroup.Text style={{borderRadius: 0}}>
                <FontAwesomeIcon icon={faBuilding} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Filter by supplier..."
                value={supplierFilter || ""}
                onChange={(e) => onSupplierFilterChange?.(e.target.value)}
                style={{borderRadius: 0}}
              />
            </InputGroup>
          </Col>
        </Row>
      </Card.Body>

      <style>{`
        .purple-theme {
          border-left: 3px solid #8b5cf6;
          background: rgba(139, 92, 246, 0.02);
        }
        .text-purple {
          color: #8b5cf6;
        }
      `}</style>
    </Card>
  );
}

export default PurchaseOrderFilter;
